# Project: libinterop (shared library)
# Toolchain: g++
# Dependency: chafa (built locally)

PROJECT       := libinterop
SONAME        := libinterop.so
STATICNAME    := libinterop.a

ROOT_DIR      := $(abspath ..)
SRC_DIR       := src
INC_DIR       := include
BUILD_DIR     := build

# Local chafa locations
CHAFAROOT     := $(ROOT_DIR)/deps/chafa
CHAFAPKGPATH  := $(CHAFAROOT)/pkgconfig
CHAFASOURCE   := $(ROOT_DIR)/third_party/chafa_source

CXX           ?= g++
CXXFLAGS      ?= -std=c++20 -O3 -DNDEBUG -fPIC
LDFLAGS       ?= -shared
# RPATH to local chafa and $ORIGIN
LDFLAGS       += -Wl,-rpath,$(CHAFAROOT)/lib -Wl,-rpath,'$$ORIGIN'

# Install location similar to previous prefix usage
PREFIX        ?= $(ROOT_DIR)/deps/libinterop
LIBDIR        ?= $(PREFIX)/lib/x86_64-linux-gnu

# Honor local pkg-config path for chafa
export PKG_CONFIG_PATH := $(CHAFAPKGPATH)

# chafa via pkg-config (resolved with PKG_CONFIG_PATH above)
CHAFACFLAGS   = $(shell PKG_CONFIG_PATH=$(CHAFAPKGPATH) pkg-config --cflags chafa)
CHAFALIBS     = $(shell PKG_CONFIG_PATH=$(CHAFAPKGPATH) pkg-config --libs --static chafa)


CXXFLAGS	 += $(CHAFACFLAGS)
LDFLAGS      += $(CHAFALIBS)


SOURCES := \
  $(SRC_DIR)/TermSize.cpp \
  $(SRC_DIR)/detect_terminal.cpp \
  $(SRC_DIR)/ChafaInfo.cpp \
  $(SRC_DIR)/Draw_State.cpp \
  $(SRC_DIR)/ansi_escape_codes.cpp \
  $(SRC_DIR)/test_c.cpp \
  $(SRC_DIR)/init_draw_state_go.cpp \
  $(SRC_DIR)/draw_desktop_go.cpp

OBJECTS := $(patsubst $(SRC_DIR)/%.cpp,$(BUILD_DIR)/%.o,$(SOURCES))

TARGET_SO := $(BUILD_DIR)/$(SONAME)
TARGET_A  := $(BUILD_DIR)/$(STATICNAME)

.PHONY: all clean clean-chafa install uninstall chafa check-deps

all: chafa $(TARGET_SO) $(TARGET_A)

shared: chafa $(TARGET_SO)
static: $(TARGET_A)

# Build chafa locally if its pkg-config file is missing
$(CHAFAPKGPATH)/chafa.pc:
	@echo "Building chafa into $(CHAFAROOT)"
	@mkdir -p "$(CHAFAROOT)" "$(CHAFAPKGPATH)"
	cd "$(CHAFASOURCE)" && \
    mkdir -p build && cd build && \
        ../autogen.sh --prefix="$(CHAFAROOT)" && \
        make -j$$(nproc) && make install
    # If chafa.pc was installed under lib/pkgconfig, mirror it into $(CHAFAPKGPATH)
	@if [ -f "$(CHAFAROOT)/lib/pkgconfig/chafa.pc" ]; then \
        cp "$(CHAFAROOT)/lib/pkgconfig/chafa.pc" "$(CHAFAPKGPATH)/"; \
	fi

chafa: $(CHAFAPKGPATH)/chafa.pc

check-deps: chafa
	@pkg-config --exists 'chafa >= 1.8.0' || { \
      echo "Error: chafa >= 1.8.0 not found in PKG_CONFIG_PATH=$(PKG_CONFIG_PATH)"; exit 1; }

$(BUILD_DIR)/$(SONAME): $(OBJECTS) | $(BUILD_DIR) check-deps
	$(CXX) -o $@ $(OBJECTS) $(LDFLAGS)

$(TARGET_A): $(OBJECTS) | $(BUILD_DIR)
	ar rcs $@ $(OBJECTS)
	ranlib $@ || true

$(BUILD_DIR)/%.o: $(SRC_DIR)/%.cpp | $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) -I$(INC_DIR) -c $< -o $@

$(BUILD_DIR):
	mkdir -p $@

clean:
	rm -rf $(BUILD_DIR)

clean-chafa:
	-cd "$(CHAFASOURCE)/build" && make distclean || true
	rm -rf $(CHAFAROOT)
	rm -rf $(CHAFASOURCE)/build

install:  $(TARGET_SO) $(TARGET_A)
	install -d "$(LIBDIR)"
	install -m 755 "$(TARGET_SO)" "$(LIBDIR)/$(SONAME)"
	install -m 755 "$(TARGET_A)" "$(LIBDIR)/$(STATICNAME)"

uninstall:
	rm -f "$(LIBDIR)/$(SONAME)"
	rm -f "$(LIBDIR)/$(STATICNAME)"