// Copyright 2023 The Gitea Authors. All rights reserved.
// SPDX-License-Identifier: MIT

package pull

import (
	repo_model "code.gitea.io/gitea/models/repo"
	"code.gitea.io/gitea/modules/git"
	"code.gitea.io/gitea/modules/log"
)

// doMergeStyleMerge merges the tracking branch into the current HEAD - which is assumed to be the staging branch (equal to the pr.BaseBranch)
func doMergeStyleMerge(ctx *mergeContext, message string, strategy repo_model.MergeStrategy, option repo_model.MergeStrategyOption) error {
	cmd := git.NewCommand("merge", "--no-ff", "--no-commit")
	if strategy != repo_model.MergeStrategyDefault {
		cmd = cmd.AddArguments("-s").AddDynamicArguments(string(strategy))
		if option != repo_model.MergeStrategyOptionNone {
			cmd = cmd.AddArguments("-X").AddDynamicArguments(string(option))
		}
	}
	cmd = cmd.AddDynamicArguments(trackingBranch)
	if err := runMergeCommand(ctx, repo_model.MergeStyleMerge, cmd); err != nil {
		log.Error("%-v Unable to merge tracking into base: %v", ctx.pr, err)
		return err
	}

	if err := commitAndSignNoAuthor(ctx, message); err != nil {
		log.Error("%-v Unable to make final commit: %v", ctx.pr, err)
		return err
	}
	return nil
}
