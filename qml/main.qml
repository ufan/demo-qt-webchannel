import QtQuick.Controls
import QtWebChannel
import QtWebEngine

import jianwei.com

ApplicationWindow {
    id: app
    height: 1100
    width: 700
    visible: true

    DataSource {
        id: datasource
        WebChannel.id: "dataSource"
    }

    WebChannel {
        id: channel
        registeredObjects: [datasource]
    }

    WebEngineView {
        id: webview1
        width: parent.width-100
        height: parent.height/2
        anchors.top: parent.top
        url: "qrc:/h1.html"
        webChannel: channel
    }

    WebEngineView {
        id: webview2
        width: parent.width-100
        height: parent.height/2
        anchors.top: webview1.bottom
        url: "qrc:/heatmap.html"
        webChannel: channel
    }

    Button {
        text: "generateH1"
        anchors.left: webview1.right
        anchors.right: parent.right
        anchors.bottom: webview1.bottom
        onClicked: datasource.generateRandomDataH1()
    }
    Button {
        text: "generateH2"
        anchors.left: webview2.right
        anchors.right: parent.right
        anchors.bottom: webview2.bottom
        onClicked: datasource.generateRandomDataH2()
    }
}
