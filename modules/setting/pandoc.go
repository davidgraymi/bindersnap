package setting

var Pandoc = struct {
	Path     string
	HomePath string
	Timeout  struct {
		Default int
	} `ini:"pandoc.timeout"`
}{}
