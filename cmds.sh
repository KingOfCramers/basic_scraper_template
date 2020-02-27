#!/bin/bash

echo 'Total number of transcripts'
find /Users/harrisoncramer/Vagrant/devCPU/machine/SASC_Scraper/pdfs -name '*transcript*' | wc -l;

echo 'Number of hearings where China is mentioned';
find /Users/harrisoncramer/Vagrant/devCPU/machine/SASC_Scraper/pdfs -name '*.txt' -exec grep -l 'China' {} \; | grep 'transcript' | wc -l

echo 'The ids of the hearings where China is mentioned'
find /Users/harrisoncramer/Vagrant/devCPU/machine/SASC_Scraper/pdfs -name '*.txt' -exec grep -l 'China' {} \; | grep 'transcript' | awk '{split($0,a, "/"); print a[9]}'

echo 'Writing those hearings to a file'
find /Users/harrisoncramer/Vagrant/devCPU/machine/SASC_Scraper/pdfs -name '*.txt' -exec grep -l 'China' {} \; | grep 'transcript' | awk '{split($0,a, "/"); print a[9]}' > afghanistanhearings.txt

echo 'Total number of times China is mentioned in those hearings';
find /Users/harrisoncramer/Vagrant/devCPU/machine/SASC_Scraper/pdfs -name '*.txt' -exec grep -o 'China' {} \; | wc -l;
