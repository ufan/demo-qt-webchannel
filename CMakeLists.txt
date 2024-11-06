cmake_minimum_required(VERSION 3.5)

project(demo-qt-webchannel LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)

find_package(Qt6 REQUIRED COMPONENTS Core Gui Qml Quick QuickControls2 WebChannel WebEngineQuick)
qt_standard_project_setup()

qt_add_executable(demo-qt-webchannel
  main.cpp
  datasource.cpp
  demo-qt-webchannel.qrc
)

target_link_libraries(demo-qt-webchannel
  PRIVATE
    Qt::Core
    Qt::Gui
    Qt::Qml
    Qt::Quick
    Qt::QuickControls2
    Qt::WebChannel
    Qt::WebEngineQuick
)
