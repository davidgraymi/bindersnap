// Copyright 2023 The Gitea Authors. All rights reserved.
// SPDX-License-Identifier: MIT

package cmd

import (
	"fmt"
	"strings"
	"testing"

	auth_model "code.gitea.io/gitea/models/auth"
	"code.gitea.io/gitea/models/db"
	"code.gitea.io/gitea/models/unittest"
	user_model "code.gitea.io/gitea/models/user"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAdminUserCreate(t *testing.T) {
	app := NewMainApp(AppVersion{})

	reset := func() {
		require.NoError(t, db.TruncateBeans(db.DefaultContext, &user_model.User{}))
		require.NoError(t, db.TruncateBeans(db.DefaultContext, &user_model.EmailAddress{}))
		require.NoError(t, db.TruncateBeans(db.DefaultContext, &auth_model.AccessToken{}))
	}
	t.Run("MustChangePassword", func(t *testing.T) {
		type check struct{ IsAdmin, MustChangePassword bool }
		createCheck := func(name, args string) check {
			assert.NoError(t, app.Run(strings.Fields(fmt.Sprintf("./gitea admin user create --username %s --email %s@gitea.local %s --password foobar", name, name, args))))
			u := unittest.AssertExistsAndLoadBean(t, &user_model.User{LowerName: name})
			return check{u.IsAdmin, u.MustChangePassword}
		}
		reset()
		assert.Equal(t, check{IsAdmin: false, MustChangePassword: false}, createCheck("u", ""), "first non-admin user doesn't need to change password")

		reset()
		assert.Equal(t, check{IsAdmin: true, MustChangePassword: false}, createCheck("u", "--admin"), "first admin user doesn't need to change password")

		reset()
		assert.Equal(t, check{IsAdmin: true, MustChangePassword: true}, createCheck("u", "--admin --must-change-password"))
		assert.Equal(t, check{IsAdmin: true, MustChangePassword: true}, createCheck("u2", "--admin"))
		assert.Equal(t, check{IsAdmin: true, MustChangePassword: false}, createCheck("u3", "--admin --must-change-password=false"))
		assert.Equal(t, check{IsAdmin: false, MustChangePassword: true}, createCheck("u4", ""))
		assert.Equal(t, check{IsAdmin: false, MustChangePassword: false}, createCheck("u5", "--must-change-password=false"))
	})

	createUser := func(name, args string) error {
		return app.Run(strings.Fields(fmt.Sprintf("./gitea admin user create --username %s --email %s@gitea.local %s", name, name, args)))
	}

	t.Run("AccessToken", func(t *testing.T) {
		// no generated access token
		reset()
		assert.NoError(t, createUser("u", "--random-password"))
		assert.Equal(t, 1, unittest.GetCount(t, &user_model.User{}))
		assert.Equal(t, 0, unittest.GetCount(t, &auth_model.AccessToken{}))

		// using "--access-token" only means "all" access
		reset()
		assert.NoError(t, createUser("u", "--random-password --access-token"))
		assert.Equal(t, 1, unittest.GetCount(t, &user_model.User{}))
		assert.Equal(t, 1, unittest.GetCount(t, &auth_model.AccessToken{}))
		accessToken := unittest.AssertExistsAndLoadBean(t, &auth_model.AccessToken{Name: "gitea-admin"})
		hasScopes, err := accessToken.Scope.HasScope(auth_model.AccessTokenScopeWriteAdmin, auth_model.AccessTokenScopeWriteRepository)
		assert.NoError(t, err)
		assert.True(t, hasScopes)

		// using "--access-token" with name & scopes
		reset()
		assert.NoError(t, createUser("u", "--random-password --access-token --access-token-name new-token-name --access-token-scopes read:issue,read:user"))
		assert.Equal(t, 1, unittest.GetCount(t, &user_model.User{}))
		assert.Equal(t, 1, unittest.GetCount(t, &auth_model.AccessToken{}))
		accessToken = unittest.AssertExistsAndLoadBean(t, &auth_model.AccessToken{Name: "new-token-name"})
		hasScopes, err = accessToken.Scope.HasScope(auth_model.AccessTokenScopeReadIssue, auth_model.AccessTokenScopeReadUser)
		assert.NoError(t, err)
		assert.True(t, hasScopes)
		hasScopes, err = accessToken.Scope.HasScope(auth_model.AccessTokenScopeWriteAdmin, auth_model.AccessTokenScopeWriteRepository)
		assert.NoError(t, err)
		assert.False(t, hasScopes)

		// using "--access-token-name" without "--access-token"
		reset()
		err = createUser("u", "--random-password --access-token-name new-token-name")
		assert.Equal(t, 0, unittest.GetCount(t, &user_model.User{}))
		assert.Equal(t, 0, unittest.GetCount(t, &auth_model.AccessToken{}))
		assert.ErrorContains(t, err, "access-token-name and access-token-scopes flags are only valid when access-token flag is set")

		// using "--access-token-scopes" without "--access-token"
		reset()
		err = createUser("u", "--random-password --access-token-scopes read:issue")
		assert.Equal(t, 0, unittest.GetCount(t, &user_model.User{}))
		assert.Equal(t, 0, unittest.GetCount(t, &auth_model.AccessToken{}))
		assert.ErrorContains(t, err, "access-token-name and access-token-scopes flags are only valid when access-token flag is set")

		// empty permission
		reset()
		err = createUser("u", "--random-password --access-token --access-token-scopes public-only")
		assert.Equal(t, 0, unittest.GetCount(t, &user_model.User{}))
		assert.Equal(t, 0, unittest.GetCount(t, &auth_model.AccessToken{}))
		assert.ErrorContains(t, err, "access token does not have any permission")
	})
}
