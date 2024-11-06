/*
 * Copyright (c) 2016 Vincent Lee. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *  1. Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *  2. Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 */

#pragma once

#include <QObject>
#include <QVariantList>

class DataSource : public QObject {
    Q_OBJECT

    Q_PROPERTY(QVariantList dataH1 READ dataH1 NOTIFY dataH1Changed)
    Q_PROPERTY(QVariantList dataH2X READ dataH2X NOTIFY dataH2XChanged)
    Q_PROPERTY(QVariantList dataH2Y READ dataH2Y NOTIFY dataH2YChanged)

  public:
    DataSource(QObject *parent = nullptr);

    QVariantList dataH1() const;
    QVariantList dataH2X() const;
    QVariantList dataH2Y() const;

    Q_INVOKABLE void generateRandomDataH1();
    Q_INVOKABLE void generateRandomDataH2();

signals:
  void dataH1Changed(const QVariantList &data);
  void dataH2XChanged(const QVariantList &dataX, const QVariantList &dataY);
  void dataH2YChanged(const QVariantList &data);

private:
  QVariantList valueListH1;
  QVariantList valueListH2X;
  QVariantList valueListH2Y;
};
