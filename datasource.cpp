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

#include "datasource.h"
#include <random>
#include <tuple>

DataSource::DataSource(QObject *parent)
    : QObject(parent)
{
}

QVariantList DataSource::dataH1() const {return valueListH1;}

QVariantList DataSource::dataH2X() const { return valueListH2X; }
QVariantList DataSource::dataH2Y() const { return valueListH2Y; }

void DataSource::generateRandomDataH1()
{
    valueListH1.clear();
    std::random_device rd{};
    std::mt19937 gen{rd()};

    // values near the mean are the most likely
    // standard deviation affects the dispersion of generated values from the
    // mean
    std::normal_distribution d{0.0, 2.0};

    // draw a sample from the normal distribution and round it to an integer
    for (int i = 0; i < 1000; i++) {
      valueListH1.append(d(gen));
    }
    emit dataH1Changed(valueListH1);
}

void DataSource::generateRandomDataH2()
{
    valueListH2X.clear();
    valueListH2Y.clear();
    std::random_device rd{};
    std::mt19937 gen{rd()};

    // values near the mean are the most likely
    // standard deviation affects the dispersion of generated values from the
    // mean
    std::normal_distribution dx{0.0, 2.0};
    std::normal_distribution dy{0.0, 1.0};

    // draw a sample from the normal distribution and round it to an integer
    for (int i = 0; i < 2000; i++) {
      valueListH2X.append(dx(gen));
      valueListH2Y.append(dy(gen));
    }
    emit dataH2XChanged(valueListH2X, valueListH2Y);
}
