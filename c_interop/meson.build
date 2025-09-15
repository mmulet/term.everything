project('libinterop', 'cpp', version: '1.2', default_options: [
    'cpp_std=c++20', 
    'buildtype=release', 
    'optimization=3', 
    ])


include = include_directories('include')

chafa = dependency('chafa', version: '>=1.8.0')
# chafa_libdir = chafa.get_pkgconfig_variable('libdir')
chafa_libdir = chafa.get_variable(pkgconfig: 'libdir')

libinterop = shared_library('interop', 
    # 'src/listen_to_wayland.cpp',
    # 'src/Send_Message_And_File_Descriptors.cpp',
    #    'src/Listen_for_New_Client.cpp',
    #    'src/Get_Message_and_File_Descriptors.cpp',
    #    'src/NODE_API_MODULE.cpp',
    #    'src/mmap_fd.cpp',
    #    'src/get_fd.cpp',
    #    'src/Client_State.cpp',
    #    'src/SHM_Pool_Memory.cpp',
       'src/TermSize.cpp',
       'src/detect_terminal.cpp',
       'src/ChafaInfo.cpp',
       'src/Draw_State.cpp',
    #    'src/init_draw_state.cpp',
       'src/ansi_escape_codes.cpp',
    #    'src/memcopy_buffer_to_uint8array.cpp',
    #    'src/draw_desktop.cpp',
    #    'src/close_wayland_socket.cpp',
    #    'src/get_socket_path_from_name.cpp',
    #    'src/remove_file_if_it_exists.cpp',
       'src/test_c.cpp',
       'src/init_draw_state_go.cpp',
       'src/draw_desktop_go.cpp',
       # {new_file} replaced with `task make-source`
        include_directories: [include,
        
            # include_directories('../third_party/node-v22.14.0-linux-x64/include/node'),
            # include_directories('../third_party/node-addon-api-8.3.1')
         ],
        install: true,
        # name_suffix: 'node',
        name_prefix: 'lib',
        # Don't complain about undefined linkage that will
        # be supplied by the node(actually bun) runtime
        # https://mesonbuild.com/Builtin-options.html#base-options
        override_options: 'b_lundef=false',
        dependencies: [
            chafa
            ],
        # Ensure the loader can find libchafa at runtime
        # - Use the system libdir reported by pkg-config
        # - Also allow looking relative to the .node location via $ORIGIN
          install_rpath: chafa_libdir + ':$ORIGIN',
          build_rpath: chafa_libdir + ':$ORIGIN',
        # install_rpath: [ chafa_libdir, '$ORIGIN' ],
        # Make it runnable from the build dir too
        # link_args: [
        #     '-Wl,-rpath,' + chafa_libdir,
        #     '-Wl,-rpath,$ORIGIN'
        # ]
            
            
            )

 
 
