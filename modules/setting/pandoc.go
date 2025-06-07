// Copyright 2025 The Bindersnap Authors. All rights reserved.
// SPDX-License-Identifier: LicenseRef-License

package setting

var Pandoc = struct {
	Path     string
	HomePath string
	Timeout  struct {
		Default int
	} `ini:"pandoc.timeout"`
}{}
