// Copyright 2025 The Bindersnap Authors. All rights reserved.
// SPDX-License-Identifier: LicenseRef-License

package org

import (
	"net/http"

	"code.gitea.io/gitea/modules/base"
	"code.gitea.io/gitea/services/context"
)

const (
	tplOrgViewHome base.TplName = "org/view/home"
)

// View render repository view page
func View(ctx *context.Context) {
	ctx.HTML(http.StatusOK, tplOrgViewHome)
}
