// Copyright 2025 The Bindersnap Authors. All rights reserved.
// SPDX-License-Identifier: LicenseRef-License

package v1_23 //nolint

import (
	"code.gitea.io/gitea/modules/structs"

	"xorm.io/xorm"
)

func AddSubscriptionToUser(x *xorm.Engine) error {
	type User struct {
		Subscription structs.SubscriptionType `xorm:"NOT NULL DEFAULT 0"`
	}

	_, err := x.SyncWithOptions(xorm.SyncOptions{
		IgnoreConstrains: true,
		IgnoreIndices:    true,
	}, new(User))
	return err
}
