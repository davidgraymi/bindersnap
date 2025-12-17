// Copyright 2025 The Bindersnap Authors. All rights reserved.
// SPDX-License-Identifier: LicenseRef-License

package v1_23 //nolint

import (
	"xorm.io/xorm"
)

func AddStripeIDToUser(x *xorm.Engine) error {
	type User struct {
		StripeID *string `xorm:"VARCHAR(255) UNIQUE NULL"`
	}

	return x.Sync(new(User))
}
