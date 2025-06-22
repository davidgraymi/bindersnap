package structs

// TODO:
// Limit Free users to:
// 	1. 5 repos
// 	2. issues and milestones
//  3. 50MB of storage per repo
//
// Limit Premium users to:
// 	1. unlimited repositories
// 	2. project management
// 	3. multiple reviewers
// 	4. required reviewers
// 	5. draft change requests
// 	6. protected branches
// 	7. wikis
// 	8. 5GiB of storage per repo
//
// Limit Ultimate users to:
// 	1. data residence
// 	2. enterprise managed users
// 	3. user provisioning through SCIM
// 	4. SAML single sign-on
// 	5. white glove onboarding

// SubscriptionType defines the subscription type the user has
type SubscriptionType int

const (
	// SubscriptionTypeFree defines a free subscription
	SubscriptionTypeFree SubscriptionType = iota

	// SubscriptionTypePremium defines a premium subscription
	SubscriptionTypePremium // 1

	// SubscriptionTypeUltimate defines an ultimate subscription
	SubscriptionTypeUltimate // 2
)

// SubscriptionModes is a map of Subscription types
var SubscriptionModes = map[string]SubscriptionType{
	"Free":     SubscriptionTypeFree,
	"Premium":  SubscriptionTypePremium,
	"Ultimate": SubscriptionTypeUltimate,
}

// IsFree returns true if SubscriptionType is public
func (st SubscriptionType) IsFree() bool {
	return st == SubscriptionTypeFree
}

// IsPremium returns true if SubscriptionType is limited
func (st SubscriptionType) IsPremium() bool {
	return st == SubscriptionTypePremium
}

// IsUltimate returns true if SubscriptionType is private
func (st SubscriptionType) IsUltimate() bool {
	return st == SubscriptionTypeUltimate
}

// SubscriptionString provides the mode string of the subscription type (Free, Premium, Ultimate)
func (st SubscriptionType) String() string {
	for k, v := range SubscriptionModes {
		if st == v {
			return k
		}
	}
	return ""
}
