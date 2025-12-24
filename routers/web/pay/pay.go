// Copyright 2025 The Bindersnap Authors. All rights reserved.
// SPDX-License-Identifier: LicenseRef-License

package pay

import (
	"fmt"
	"io"
	"net/http"
	"strconv"

	user_model "code.gitea.io/gitea/models/user"
	"code.gitea.io/gitea/modules/base"
	"code.gitea.io/gitea/modules/json"
	"code.gitea.io/gitea/modules/log"
	"code.gitea.io/gitea/modules/setting"
	"code.gitea.io/gitea/modules/structs"
	"code.gitea.io/gitea/services/context"

	"github.com/stripe/stripe-go/v82"
	stripe_pb_session "github.com/stripe/stripe-go/v82/billingportal/session"
	stripe_ck_session "github.com/stripe/stripe-go/v82/checkout/session"
	"github.com/stripe/stripe-go/v82/webhook"
)

const (
	tplSubscribe base.TplName = "pay/subscribe"
)

// Subscribe renders the subscription page
func Subscribe(ctx *context.Context) {
	ctx.Data["PageIsSales"] = true
	// TODO!: Add a success message if the user just signed up
	ctx.HTML(http.StatusOK, tplSubscribe)
}

func CreateCheckoutSession(ctx *context.Context) {
	checkoutParams := &stripe.CheckoutSessionParams{
		Mode: stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(setting.Stripe.PremiumPriceID),
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL:        stripe.String(setting.AppURL),
		CancelURL:         stripe.String(setting.AppURL + "pay/subscribe"),
		AutomaticTax:      &stripe.CheckoutSessionAutomaticTaxParams{Enabled: stripe.Bool(true)},
		ClientReferenceID: stripe.String(fmt.Sprintf("%d", ctx.Doer.ID)),
	}

	if ctx.Doer.StripeID != nil {
		checkoutParams.Customer = stripe.String(*ctx.Doer.StripeID)
	} else {
		checkoutParams.CustomerEmail = stripe.String(ctx.Doer.Email)
	}

	stripeSession, err := stripe_ck_session.New(checkoutParams)
	if err != nil {
		ctx.Error(http.StatusInternalServerError, err.Error())
		return
	}

	ctx.Redirect(stripeSession.URL, http.StatusSeeOther)
}

func CreatePortalSession(ctx *context.Context) {
	// Authenticate your user.
	params := &stripe.BillingPortalSessionParams{
		ReturnURL: stripe.String(setting.AppURL + "user/settings/account"),
	}

	if ctx.Doer.StripeID != nil {
		params.Customer = stripe.String(*ctx.Doer.StripeID)
	}

	ps, err := stripe_pb_session.New(params)
	if err != nil {
		ctx.Error(http.StatusInternalServerError, err.Error())
		return
	}

	ctx.Redirect(ps.URL, http.StatusSeeOther)
}

func HandleWebhook(ctx *context.Context) {
	const MaxBodyBytes = int64(65536)
	ctx.Req.Body = http.MaxBytesReader(ctx.Resp, ctx.Req.Body, MaxBodyBytes)
	payload, err := io.ReadAll(ctx.Req.Body)
	if err != nil {
		log.Error("Read error: %v", err)
		ctx.Error(http.StatusServiceUnavailable)
		return
	}

	sigHeader := ctx.Req.Header.Get("Stripe-Signature")
	event, err := webhook.ConstructEvent(payload, sigHeader, setting.Stripe.WebhookSecret)
	if err != nil {
		log.Error("Webhook signature verification failed: %v", err)
		ctx.Error(http.StatusBadRequest)
		return
	}

	switch event.Type {
	case stripe.EventTypeCheckoutSessionCompleted:
		checkoutSessionCompleted(ctx, event)

	case stripe.EventTypeCustomerSubscriptionCreated,
		stripe.EventTypeCustomerSubscriptionUpdated,
		stripe.EventTypeCustomerSubscriptionDeleted:
		customerSubscriptionUpdated(ctx, event)

	default:
		unhandledEvent(ctx)
	}
}

func checkoutSessionCompleted(ctx *context.Context, event stripe.Event) {
	var session stripe.CheckoutSession
	err := json.Unmarshal(event.Data.Raw, &session)
	if err != nil {
		ctx.Error(http.StatusBadRequest, "Webhook decode failed")
		return
	}

	if session.Customer == nil {
		ctx.Error(http.StatusBadRequest, "Customer is missing")
		return
	}

	userID, err := strconv.ParseInt(session.ClientReferenceID, 10, 64)
	if err != nil {
		ctx.Error(http.StatusBadRequest, "Invalid client_reference_id")
		return
	}

	user, err := user_model.GetUserByID(ctx, userID)
	if err != nil {
		ctx.Error(http.StatusBadRequest, "User does not exist")
		return
	}

	// Update the user's Stripe ID if it is not already set
	if user.StripeID == nil {
		user.StripeID = &session.Customer.ID
		if err := user_model.UpdateUserCols(ctx, user, "stripe_id"); err != nil {
			if user_model.IsErrUserNotExist(err) {
				ctx.NotFound("UpdateUserCols", err)
			} else {
				ctx.ServerError("UpdateUser", err)
			}
			return
		}
		log.Info("Added stripe ID %s to user %s", user.StripeID, user.Name)
	}

	// Reconcile the subscription
	if session.Subscription != nil {
		unrecSub, err := user_model.GetSubscriptionByStripeID(ctx, session.Subscription.ID)
		if err != nil {
			log.Warn("Failed to reconcile subscription: %v", err)
			ctx.Status(http.StatusOK)
			return
		}

		updateSubscription(ctx, user, unrecSub.Status, unrecSub.ProductID)
		err = unrecSub.Delete(ctx)
		if err != nil {
			log.Error("Did not delete reconciled subscription: %s", err)
		}
	} else {
		log.Error("Checkout session completed without a subscription: %s", session.ID)
		ctx.Error(http.StatusBadRequest, "No subscription found in checkout session")
		return
	}

	ctx.Status(http.StatusOK)
}

// customerSubscriptionUpdated handles "customer.subscription.*" the updating of a customer subscription
func customerSubscriptionUpdated(ctx *context.Context, event stripe.Event) {
	var sub stripe.Subscription
	err := json.Unmarshal(event.Data.Raw, &sub)
	if err != nil {
		ctx.Error(http.StatusBadRequest, "Webhook decode failed")
		return
	}

	if sub.Customer == nil {
		b, _ := json.MarshalIndent(sub, "", "  ")
		log.Error("Invalid subscription customer: %s", string(b))
		ctx.Error(http.StatusBadRequest, "Customer is missing")
		return
	}

	if sub.Items == nil {
		b, _ := json.MarshalIndent(sub, "", "  ")
		log.Error("Invalid subscription.items data: %s", string(b))
		ctx.Error(http.StatusBadRequest, "Subscription items do not exist")
		return
	}

	if len(sub.Items.Data) == 0 {
		b, _ := json.MarshalIndent(sub.Items, "", "  ")
		log.Error("No subscription.items: %s", string(b))
		ctx.Error(http.StatusBadRequest, "Subscription items do not exist")
		return
	}

	if sub.Items.Data[0].Price == nil {
		b, _ := json.MarshalIndent(sub.Items.Data[0], "", "  ")
		log.Error("Invalid subscription item price: %s", string(b))
		ctx.Error(http.StatusBadRequest, "Subscription price does not exist")
		return
	}

	if sub.Items.Data[0].Price.Product == nil {
		b, _ := json.MarshalIndent(sub.Items.Data[0].Price, "", "  ")
		log.Error("Invalid subscription item price product: %s", string(b))
		ctx.Error(http.StatusBadRequest, "Subscription product does not exist")
		return
	}

	// Fetch the user by Stripe ID
	user, err := user_model.GetUserByStripeID(ctx, sub.Customer.ID)
	if err != nil {
		// If the user does not exist, we need to insert an unreconciled subscription
		unrecSub := &user_model.UnreconciledSubscription{
			StripeID:   sub.ID,
			CustomerID: sub.Customer.ID,
			PriceID:    sub.Items.Data[0].Price.ID,
			ProductID:  sub.Items.Data[0].Price.Product.ID,
			Status:     string(sub.Status),
		}

		_, err = user_model.InsertUnreconciledSubscription(ctx, unrecSub)
		if err != nil {
			log.Error("Failed to insert unreconciled subscription: %v", err)
			ctx.Error(http.StatusInternalServerError, "Failed to record subscription")
			return
		}
		log.Info("Inserted unreconciled subscription for customer %s with Stripe ID %s",
			sub.Customer.ID, sub.ID)
	} else {
		updateSubscription(ctx, user, string(sub.Status), sub.Items.Data[0].Price.Product.ID)
	}

	ctx.Status(http.StatusOK)
}

// unhandledEvent handles any Stripe event type that is not explicitly handled
func unhandledEvent(ctx *context.Context) {
	log.Trace("Unhandled event type: %s", ctx.Req.Method)
	ctx.Status(http.StatusOK)
}

func updateSubscription(ctx *context.Context, user *user_model.User, status, productID string) {
	if status != string(stripe.SubscriptionStatusActive) {
		if err := user.SetUserSubscription(ctx, structs.SubscriptionTypeFree); err != nil {
			if user_model.IsErrUserNotExist(err) {
				ctx.NotFound("UpdateUserCols", err)
				return
			}
			ctx.ServerError("UpdateUser", err)
			return
		}
		log.Info("User %d - %s subscription set to free due to %s status", user.ID, user.Name, status)
	} else {
		switch productID {
		case setting.Stripe.PremiumProductID:
			if err := user.SetUserSubscription(ctx, structs.SubscriptionTypePremium); err != nil {
				if user_model.IsErrUserNotExist(err) {
					ctx.NotFound("UpdateUserCols", err)
					return
				}
				ctx.ServerError("UpdateUser", err)
				return
			}
			log.Info("User %d - %s subscription set to %s", user.ID, user.Name, structs.SubscriptionTypePremium)
		// TODO!: handle ultimate tier
		// case setting.Stripe.UltimateProductID:
		// 	if err := user.SetUserSubscription(ctx, structs.SubscriptionTypeUltimate); err != nil {
		// 		if user_model.IsErrUserNotExist(err) {
		// 			ctx.NotFound("UpdateUserCols", err)
		// 			return
		// 		}
		// 		ctx.ServerError("UpdateUser", err)
		// 		return
		// 	}
		// 	log.Info("User %d - %s subscription set to %s", user.ID, user.Name, structs.SubscriptionTypeUltimate)
		default:
			log.Error("Unknown product: %s", productID)
			return
		}
	}
}
