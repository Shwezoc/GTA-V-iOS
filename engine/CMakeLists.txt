cmake_minimum_required(VERSION 3.20)

project(ShwezovGTAVPortCore LANGUAGES CXX)

add_library(port_core STATIC
    src/PortCore.cpp
    src/GameLoop.cpp
    src/TouchBridge.cpp
)

target_include_directories(port_core PUBLIC
    include
    ../ios
)

target_compile_features(port_core PUBLIC cxx_std_17)

if(APPLE)
    target_compile_definitions(port_core PUBLIC PORT_PLATFORM_APPLE=1)
endif()
