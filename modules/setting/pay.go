// Copyright 2025 The Bindersnap Authors. All rights reserved.
// SPDX-License-Identifier: LicenseRef-License

package setting

import (
	"code.gitea.io/gitea/modules/log"
	"github.com/stripe/stripe-go/v82"
)

var Stripe = struct {
	Enabled           bool
	PremiumPriceID    string
	PremiumProductID  string
	SecretKey         string
	UltimatePriceID   string
	UltimateProductID string
	WebhookSecret     string
}{
	Enabled:       false,
	WebhookSecret: "",
}

func loadPayFrom(rootCfg ConfigProvider) {
	sec := rootCfg.Section("stripe")
	Stripe.Enabled = sec.Key("ENABLED").MustBool(false)
	Stripe.PremiumPriceID = sec.Key("PREMIUM_PRICE_ID").String()
	Stripe.PremiumProductID = sec.Key("PREMIUM_PRODUCT_ID").String()
	Stripe.SecretKey = sec.Key("SECRET_KEY").String()
	Stripe.UltimatePriceID = sec.Key("ULTIMATE_PRICE_ID").String()
	Stripe.UltimateProductID = sec.Key("ULTIMATE_PRODUCT_ID").String()
	Stripe.WebhookSecret = sec.Key("WEBHOOK_SECRET").String()

	if Stripe.Enabled {
		log.Debug("Stripe enabled")
		stripe.Key = Stripe.SecretKey
	}
}
