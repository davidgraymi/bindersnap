// Copyright 2025 The Bindersnap Authors. All rights reserved.
// SPDX-License-Identifier: LicenseRef-License

package pandoc

import (
	"bytes"
	"context"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestConvertBsDocToDocx(t *testing.T) {
	bsdocContent := "<html><body><h1>Hello</h1><p>This is a test.</p></body></html>"
	in := strings.NewReader(bsdocContent)
	out := new(bytes.Buffer)

	err := ConvertBsDocToDocx(context.Background(), in, out)
	assert.NoError(t, err)
	assert.NotEmpty(t, out.Bytes())
}
