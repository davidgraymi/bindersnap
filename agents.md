# Guidelines for Backend Development

## Backend Technology Stack

Bindersnap uses Golang as the backend programming language. It uses many third-party packages and also write some itself. For example, Bindersnap uses Chi as basic web framework. Xorm is an ORM framework that is used to interact with the database. So it's very important to manage these packages. Please take the below guidelines before you start to write backend code.

## Package Design Guideline

### Packages List

To maintain understandable code and avoid circular dependencies it is important to have a good code structure. The Bindersnap backend is divided into the following parts:

- `build`: Scripts to help build Bindersnap.
- `cmd`: All Bindersnap actual sub commands includes `web`, `doctor`, `serv`, `hooks`, `admin` and etc. `web` will start the web service. `serv` and `hooks` will be invoked by Git or OpenSSH. Other sub commands could help to maintain Bindersnap.
- `tests`: Common test utility functions
- `tests/integration`: Integration tests, to test back-end regressions
- `tests/e2e`: E2e tests, to test front-end and back-end compatibility and visual regressions.
- `models`: Contains the data structures used by xorm to construct database tables. It also contains functions to query and update the database. Dependencies to other Bindersnap code should be avoided. You can make exceptions in cases such as logging.
- `models/db`: Basic database operations. All other `models/xxx` packages should depend on this package. The `GetEngine` function should only be invoked from `models/`.
- `models/fixtures`: Sample data used in unit tests and integration tests. One yml file means one table which will be loaded into database when beginning the tests.
- `models/migrations`: Stores database migrations between versions. PRs that change a database structure MUST also have a migration step.
- `modules`: Different modules to handle specific functionality in Bindersnap. Work in Progress: Some of them should be moved to `services`, in particular those that depend on `models` because they rely on the database.
- `modules/setting`: Store all system configurations read from ini files and has been referenced by everywhere. But they should be used as function parameters when possible.
- `modules/git`: Package to interactive with Git command line or Gogit package.
- `public`: Compiled frontend files (javascript, images, css, etc.)
- `routers`: Handling of server requests. As it uses other Bindersnap packages to serve the request, other packages (`models`, `modules` or `services`) must not depend on `routers`.
- `routers/api`: Contains routers for `/api/v1` aims to handle RESTful API requests.
- `routers/install`: Could only respond when system is in `INSTALL` mode (`INSTALL_LOCK=false`).
- `routers/private`: will only be invoked by internal sub commands, especially `serv` and `hooks`.
- `routers/web`: will handle HTTP requests from web browsers or Git SMART HTTP protocols.
- `services`: Support functions for common routing operations or command executions. Uses `models` and `modules` to handle the requests.
- `templates`: Golang templates for generating the html output.

### Package Dependencies

Since Golang doesn't support import cycles, we have to decide the package dependencies carefully. There are some levels between those packages. Below is the ideal package dependencies direction.

`cmd` -> `routers` -> `services` -> `models` -> `modules`

From left to right, left packages could depend on right packages, but right packages MUST not depend on left packages. The sub packages on the same level could depend on according this level's rules.

**WARNING**
Why do we need database transactions outside of models? And how? Some actions should allow for rollback when database record insertion/update/deletion failed. So `services` must be allowed to create a database transaction. Here is some example,

```go
// services/repository/repository.go
func CreateXXXX() error {
    return db.WithTx(func(ctx context.Context) error {
        // do something, if err is returned, it will rollback automatically
        if err := issues.UpdateIssue(ctx, repoID); err != nil {
            // ...
            return err
        }
        // ...
        return nil
    })
}
```

You should not use `db.GetEngine(ctx)` in `services` directly, but just write a function under `models/`. If the function will be used in the transaction, just let `context.Context` as the function's first parameter.

```go
// models/issues/issue.go
func UpdateIssue(ctx context.Context, repoID int64) error {
    e := db.GetEngine(ctx)

    // ...
}
```

### Package Name

For the top level package, use a plural as package name, i.e. `services`, `models`, for sub packages, use singular, i.e. `services/user`, `models/repository`.

### Import Alias

Since there are some packages which use the same package name, it is possible that you find packages like `modules/user`, `models/user`, and `services/user`. When these packages are imported in one Go file, it's difficult to know which package we are using and if it's a variable name or an import name. So, we always recommend to use import aliases. To differ from package variables which are commonly in `camelCase`, just use `snake_case` for import aliases. i.e. `import user_service "code.bindersnap.io/bindersnap/services/user"`

### Implementing io.Closer

If a type implements `io.Closer`, calling `Close` multiple times must not fail or panic but return an error or `nil`.

### Important Gotchas

- Never write `x.Update(exemplar)` without an explicit `WHERE` clause:
  - This will cause all rows in the table to be updated with the non-zero values of the exemplar - including IDs.
  - You should usually write `x.ID(id).Update(exemplar)`.
- If during a migration you are inserting into a table using `x.Insert(exemplar)` where the ID is preset:
  - You will need to `SET IDENTITY_INSERT \`table\` ON` for the MSSQL variant (the migration will fail otherwise)
  - However, you will also need to update the id sequence for postgres - the migration will silently pass here but later insertions will fail: `SELECT setval('table_name_id_seq', COALESCE((SELECT MAX(id)+1 FROM \`table_name\`), 1), false)`

### Future Tasks

Currently, we are creating some refactors to do the following things:

- Correct that codes which doesn't follow the rules.
- There are too many files in `models`, so we are moving some of them into a sub package `models/xxx`.
- Some `modules` sub packages should be moved to `services` because they depend on `models`.

# Guidelines for Frontend Development

## Frontend Background

Bindersnap uses Fomantic-UI (based on jQuery) and Vue3 for its frontend.

The HTML pages are rendered by Go HTML Template.

The source files can be found in the following directories:

- CSS styles: `web_src/css/`
- JavaScript files: `web_src/js/`
- Vue components: `web_src/js/components/`
- Go HTML templates: `templates/`

## General Guidelines

We recommend Google HTML/CSS Style Guide and Google JavaScript Style Guide

### Bindersnap specific guidelines

- Every feature (Fomantic-UI/jQuery module) should be put in separate files/directories.
- HTML ids and classes should use `kebab-case`, it's preferred to contain 2-3 feature related keywords.
- HTML ids and classes used in JavaScript should be unique for the whole project, and should contain 2-3 feature related keywords. We recommend to use the `js-` prefix for classes that are only used in JavaScript.
- CSS styling for classes provided by frameworks should not be overwritten. Always use new class names with 2-3 feature related keywords to overwrite framework styles. Bindersnap's helper CSS classes in `helpers.less` could be helpful.
- The backend can pass complex data to the frontend by using `ctx.PageData["myModuleData"] = map[]{}`, but do not expose whole models to the frontend to avoid leaking sensitive data.
- Simple pages and SEO-related pages use Go HTML Template render to generate static Fomantic-UI HTML output. Complex pages can use Vue3.
- Clarify variable types, prefer `elem.disabled = true` instead of `elem.setAttribute('disabled', 'anything')`, prefer `$el.prop('checked', var === 'yes')` instead of `$el.prop('checked', var)`.
- Use semantic elements, prefer `<button class="ui button">` instead of `<div class="ui button">`.
- Avoid unnecessary `!important` in CSS, add comments to explain why it's necessary if it can't be avoided.
- Avoid mixing different events in one event listener, prefer to use individual event listeners for every event.
- Custom event names are recommended to use `ce-` prefix.
- Prefer using Tailwind CSS which is available via `tw-` prefix, e.g. `tw-relative`. Bindersnap's helper CSS classes use `gt-` prefix (`gt-ellipsis`), while Bindersnap's own private framework-level CSS classes use `g-` prefix (`g-modal-confirm`).
- Avoid inline scripts & styles as much as possible, it's recommended to put JS code into JS files and use CSS classes. If inline scripts & styles are unavoidable, explain the reason why it can't be avoided.

### Accessibility / ARIA

In history, Bindersnap heavily uses Fomantic UI which is not an accessibility-friendly framework. Bindersnap uses some patches to make Fomantic UI more accessible (see `aria.md` and related JS files), but there are still many problems which need a lot of work and time to fix.

### Framework Usage

Mixing different frameworks together is discouraged, it makes the code difficult to be maintained. A JavaScript module should follow one major framework and follow the framework's best practice.

Recommended implementations:

- Vue + Vanilla JS
- Fomantic-UI (jQuery)
- htmx (partial page reloads for otherwise static components)
- Vanilla JS

Discouraged implementations:

- Vue + Fomantic-UI (jQuery)
- jQuery + Vanilla JS
- htmx + any other framework which requires heavy JS code, or unnecessary features like htmx scripting (`hx-on`)

To make UI consistent, Vue components can use Fomantic-UI CSS classes. We use htmx for simple interactions. You can see an example for simple interactions where htmx should be used in this PR. Do not use htmx if you require more advanced reactivity, use another framework (Vue/Vanilla JS). Although mixing different frameworks is discouraged, it should also work if the mixing is necessary and the code is well-designed and maintainable.

### Typescript

Bindersnap is in the process of migrating to type-safe Typescript. Here are some specific guidelines regarding Typescript in the codebase:

- **Use type aliases instead of interfaces**

  Prefer to use type aliases because they can represent any type and are generally more flexible to use than interfaces.

- **Use separate type imports**

  We use `verbatimModuleSyntax` so type and non-type imports from the same file must be split into two `import type` statements. This enables the typescript compiler to completely eliminate the type import statements during compilation.

- **Use `@ts-expect-error` instead of `@ts-ignore`**

  Both annotations should be avoided, but if you have to use them, use `@ts-expect-error` because it will not leave ineffective statements after the issue is fixed.

- **`async` Functions**

  - Only mark a function as `async` if and only if there are `await` calls or `Promise` returns inside the function.

  - It's not recommended to use `async` event listeners, which may lead to problems. The reason is that the code after `await` is executed outside the event dispatch. Reference: https://github.com/github/eslint-plugin-github/blob/main/docs/rules/async-preventdefault.md

  - If an event listener must be `async`, the `e.preventDefault()` should be before any `await`, it's recommended to put it at the beginning of the function.

  - If we want to call an `async` function in a non-`async` context, it's recommended to use `const _promise = asyncFoo()` to tell readers that this is done by purpose, we want to call the async function and ignore the `Promise`. Some lint rules and IDEs also have warnings if the returned `Promise` is not handled.

- **Fetching data**

  To fetch data, use the wrapper functions `GET`, `POST` etc. from `modules/fetch.js`. They accept a `data` option for the content, will automatically set CSRF token and return a `Promise` for a `Response`.

- **HTML Attributes and `dataset`**

  The usage of `dataset` is forbidden, its camel-casing behaviour makes it hard to grep for attributes. However, there are still some special cases, so the current guideline is:

  - For legacy code:
    - `$.data()` should be refactored to `$.attr()`.
    - `$.data()` can be used to bind some non-string data to elements in rare cases, but it is highly discouraged.
  - For new code:
    - `node.dataset` should not be used, use `node.getAttribute` instead.
    - never bind any user data to a DOM node, use a suitable design pattern to describe the relation between node and data.

- **Show/Hide Elements**

  - Vue components are recommended to use `v-if` and `v-show` to show/hide elements.
  - Go template code should use `.tw-hidden` and `showElem()`/`hideElem()`/`toggleElem()`, see more details in `.tw-hidden`'s comment.

- **Styles and Attributes in Go HTML Template**

  It's recommended to use:

  ```html
  <div class="gt-name1 gt-name2 {{if .IsFoo}}gt-foo{{end}}" {{if .IsFoo}}data-foo{{end}}></div>
  ```

  instead of:

  ```html
  <div class="gt-name1 gt-name2{{if .IsFoo}} gt-foo{{end}}"{{if .IsFoo}} data-foo{{end}}></div>
  ```

  to make the code more readable.

- **Legacy Code**

  A lot of legacy code already existed before this document's written. It's recommended to refactor legacy code to follow the guidelines.

### Vue3 and JSX

Bindersnap is using Vue3 now. We decided not to introduce JSX to keep the HTML and the JavaScript code separated.

### UI Examples

Bindersnap uses some self-made UI elements and customizes others to integrate them better into the general UI approach. When running Bindersnap in development mode (RUN_MODE=dev), a page with some standardized UI examples is available under `http(s)://your-bindersnap-url:port/devtest`.
