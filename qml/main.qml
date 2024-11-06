import QtQuick.Controls
import QtWebChannel
import QtWebEngine

import jianwei.com

ApplicationWindow {
    id: app
    height: 1300
    width: 1300
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
        width: parent.width*0.8
        height: parent.height/2
        anchors.top: parent.top
        url: "qrc:/h1.html"
        webChannel: channel
    }

    WebEngineView {
        id: webview2
        width: parent.width*0.8
        height: parent.height/2
        anchors.top: webview1.bottom
        url: "qrc:/heatmap.html"
        webChannel: channel
    }

    Button {
        text: "generateH1"
        anchors.right: parent.right
        anchors.top: parent.top
        anchors.margins: 30
        onClicked: datasource.generateRandomDataH1()
    }
    Button {
        text: "generateH2"
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        anchors.margins: 30
        onClicked: datasource.generateRandomDataH2()
    }
}
