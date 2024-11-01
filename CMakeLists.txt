cmake_minimum_required(VERSION 3.5)

project(demo-qt-webchannel LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTORCC ON)

find_package(Qt6 COMPONENTS Core WebEngineWidgets WebChannel REQUIRED)
qt_standard_project_setup()

qt_add_executable(demo-qt-webchannel
        chartdatasource.cpp
        chartview.cpp
        precompiled.h
        main.cpp
        mainwindow.cpp
        demo-qt-webchannel.qrc
)

target_link_libraries(demo-qt-webchannel
    PRIVATE
        Qt6::WebEngineWidgets
        Qt6::WebChannel
)
