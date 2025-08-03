// Copyright 2025 The Bindersnap Authors. All rights reserved.
// SPDX-License-Identifier: LicenseRef-License

package v1_23 //nolint

import (
	"time"

	"xorm.io/xorm"
)

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

func AddUserUnreconciledSubscriptionTable(x *xorm.Engine) error {
	return x.Sync(&UnreconciledSubscription{})
}
