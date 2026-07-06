// // error logging
package termeverything

import (
	"fmt"
	"os"
)

const DEFAULT_DEBUG_FILE string = "debug.log"

type Logger struct {
	useDebugFile bool
	debugFile    *os.File
	verbose      bool
}

func newLogger(useDebugFile bool, debugFile *string, verbose bool) Logger {
	if useDebugFile {
		if debugFile == nil || *debugFile == "" {
			var t = DEFAULT_DEBUG_FILE // disgusting
			debugFile = &t
		}
		var file, err = os.Create(*debugFile)
		if err != nil {
			fmt.Print(formatError("failed to open debug file: %v", err))
			os.Exit(1)
		}
		return Logger{useDebugFile, file, verbose}
	} else {
		return Logger{useDebugFile, nil, verbose}
	}
}

// check used for functions that return complete errors
func (l Logger) checkErr(err error) {
	if err != nil {
		l.log("%v", err.Error())
	}
}

func (l Logger) checkFatalErr(err error) {
	if err != nil {
		l.logFatal("%v", err.Error())
	}
}

// log used for errors which need to be formatted
func (l Logger) logFatal(msg string, a ...any) {
	l.log(msg, a...)
	l.close()
	os.Exit(1)
}
func (l Logger) logVerbose(msg string, a ...any) {
	if l.verbose {
		l._log(fmt.Sprintf("Verbose: %v\n", fmt.Sprintf(msg, a...)))
	}
}

// log error on stderr or DEBUG_FILE if useDebugFile automatically prepends Error: and appends \n
// unsure if to hard crash on error logging failures, or if stderr is even accessible in term.everything?
func (l Logger) log(msg string, a ...any) {
	l._log(formatError(msg, a...))
}

func (l Logger) close() {
	if l.debugFile != nil {
		l.debugFile.Close()
	}
}

func (l Logger) _log(s string) {
	if l.useDebugFile {
		if l.debugFile == nil {
			// fmt.Println(formatError(""))
			printFormatError("debug file is \"nil\", this should be impossible") // should be unreachable but who knows!
			os.Exit(1)
		} else {
			var _, err = l.debugFile.WriteString(s)
			if err != nil {
				printFormatError("failed to write to debug file %v", err)
				// os.Exit(1)
			}
		}
	} else {
		printStderr("%v", s)
	}
}
func formatError(msg string, a ...any) string {
	return "Error: " + fmt.Sprintf(msg, a...) + "\n"
}
func printStderr(msg string, a ...any) {
	fmt.Fprintf(os.Stderr, msg, a...)
}
func printFormatError(msg string, a ...any) {
	printStderr("%v", formatError(msg, a...))
}
