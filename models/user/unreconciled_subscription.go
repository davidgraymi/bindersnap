// Copyright 2025 The Bindersnap Authors. All rights reserved.
// SPDX-License-Identifier: LicenseRef-License

package user

import (
	"context"
	"time"

	"code.gitea.io/gitea/models/db"
)

// UnreconciledSubscription is the list of all subscriptions that have been received from Stripe
// but have not yet been reconciled with the user table.
type UnreconciledSubscription struct {
	ID         int64     `xorm:"pk autoincr"`
	StripeID   string    `xorm:"varchar(255) UNIQUE NOT NULL"`
	CustomerID string    `xorm:"varchar(255) INDEX NOT NULL"`
	PriceID    string    `xorm:"varchar(255) NOT NULL"`
	ProductID  string    `xorm:"varchar(255)"`
	Status     string    `xorm:"varchar(50) NOT NULL"`
	CreatedAt  time.Time `xorm:"created"`
}

func (*UnreconciledSubscription) TableName() string {
	return "unreconciled_subscription"
}

func init() {
	db.RegisterModel(new(UnreconciledSubscription))
}

func InsertUnreconciledSubscription(ctx context.Context, sub *UnreconciledSubscription) (*UnreconciledSubscription, error) {
	if err := db.Insert(ctx, sub); err != nil {
		return nil, err
	}
	return sub, nil
}

func (s *UnreconciledSubscription) Delete(ctx context.Context) error {
	_, err := db.DeleteByID[UnreconciledSubscription](ctx, s.ID)
	return err
}

func GetSubscriptionByStripeID(ctx context.Context, stripeID string) (*UnreconciledSubscription, error) {
	sub := &UnreconciledSubscription{StripeID: stripeID}
	has, err := db.GetEngine(ctx).Get(sub)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, nil // Not found
	}
	return sub, nil
}
