// Copyright 2022 The Gitea Authors. All rights reserved.
// SPDX-License-Identifier: MIT

package repository

import (
	"context"
	"testing"

	"code.gitea.io/gitea/models/db"
	repo_model "code.gitea.io/gitea/models/repo"
	"code.gitea.io/gitea/models/unit"
	"code.gitea.io/gitea/models/unittest"
	user_model "code.gitea.io/gitea/models/user"

	"github.com/stretchr/testify/assert"
)

func TestCreateRepository_Whitespace(t *testing.T) {
	assert.NoError(t, unittest.PrepareTestDatabase())
	doer := unittest.AssertExistsAndLoadBean(t, &user_model.User{ID: 2})
	repo, err := CreateRepository(context.Background(), doer, doer, CreateRepoOptions{
		Name: "test repo",
	})
	assert.NoError(t, err)
	assert.Equal(t, "test_repo", repo.Name)
}

func TestChangeRepositoryName_Whitespace(t *testing.T) {
	assert.NoError(t, unittest.PrepareTestDatabase())
	repo := unittest.AssertExistsAndLoadBean(t, &repo_model.Repository{ID: 1})
	doer := unittest.AssertExistsAndLoadBean(t, &user_model.User{ID: repo.OwnerID})
	err := ChangeRepositoryName(context.Background(), doer, repo, "new repo name")
	assert.NoError(t, err)
	assert.Equal(t, "new_repo_name", repo.Name)
	unittest.AssertExistsAndLoadBean(t, &repo_model.Repository{Name: "new_repo_name"})
}

func TestLinkedRepository(t *testing.T) {
	assert.NoError(t, unittest.PrepareTestDatabase())
	testCases := []struct {
		name             string
		attachID         int64
		expectedRepo     *repo_model.Repository
		expectedUnitType unit.Type
	}{
		{"LinkedIssue", 1, &repo_model.Repository{ID: 1}, unit.TypeIssues},
		{"LinkedComment", 3, &repo_model.Repository{ID: 1}, unit.TypePullRequests},
		{"LinkedRelease", 9, &repo_model.Repository{ID: 1}, unit.TypeReleases},
		{"Notlinked", 10, nil, -1},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			attach, err := repo_model.GetAttachmentByID(db.DefaultContext, tc.attachID)
			assert.NoError(t, err)
			repo, unitType, err := LinkedRepository(db.DefaultContext, attach)
			assert.NoError(t, err)
			if tc.expectedRepo != nil {
				assert.Equal(t, tc.expectedRepo.ID, repo.ID)
			}
			assert.Equal(t, tc.expectedUnitType, unitType)
		})
	}
}
