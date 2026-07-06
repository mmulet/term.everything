.PHONY: all clean build

.DELETE_ON_ERROR:

bin_name :=  dist/$(if $(PLATFORM),$(PLATFORM)/,)$(if $(STATIC_BUILD),static,)/$(ARCH_PREFIX)term.everything❗mmulet.com-dont_forget_to_chmod_+x_this_file

protocols_files := $(shell find ./wayland/generate)

xml_protocols := $(shell find ./wayland/generate -name "*.xml")

generated_protocols := $(patsubst ./wayland/generate/resources/%, ./wayland/protocols/%.go, $(xml_protocols))

generated_helpers := $(patsubst ./wayland/generate/resources/%, ./wayland/%.helper.go, $(xml_protocols))

build: $(generated_protocols) $(generated_helpers) $(bin_name)

# grouped target to generate all protocols and helpers in one go
# the & is what does this
$(generated_protocols) $(generated_helpers)&: $(protocols_files) ./wayland/generate.go
	go generate ./wayland

STATIC_FLAGS := $(if $(STATIC_BUILD),-ldflags '-extldflags "-static"',)

$(bin_name): go.mod main.go $(shell find ./wayland) $(shell find ./termeverything) Makefile $(shell find ./framebuffertoansi) $(shell find ./escapecodes) $(generated_protocols) $(generated_helpers)
	go build $(STATIC_FLAGS) -o $(bin_name) .

clean:
	@echo cleaning
	rm __debug_bin* 2>/dev/null || true
	if [ -z "$$MULTI_PLATFORM" ]; then rm -rf ./dist 2>/dev/null || true; fi
	rm ./wayland/protocols/*.xml.go 2>/dev/null || true
	rm ./wayland/*.helper.go 2>/dev/null || true
