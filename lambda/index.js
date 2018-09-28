'use strict';
const fs = require('fs');
const XLSX = require('xlsx');
const axios = require('axios');
const download = require('download');
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const s3 = new AWS.S3();
const cloudfront = new AWS.CloudFront();
const crypto = require('crypto');

const storageType = process.env.STORAGE || "s3"
const distributionId = process.env.DISTRIBUTION

function calculateChecksum(str, algorithm, encoding) {
    return crypto
    .createHash(algorithm || 'md5')
    .update(str, 'utf8')
    .digest(encoding || 'hex')
}

const bucket = "visa.poigraem.ru";

function saveFile(key, data, isPublic) {

    switch (storageType) {
        case "fs":
            return Promise.resolve( fs.writeFileSync(key, data) ).catch(e=>null)
        case "s3":
            return s3.putObject({
                Bucket: bucket,
                Key: key,
                Body: data,
                ACL: (  isPublic ? "public-read" : "private")
            }).promise()

    }


}

function readFileImpl(key) {
    switch (storageType) {
        case "fs":
            try{
                return Promise.resolve( fs.readFileSync(key))
            }
            catch (e){
                return Promise.reject(e)
            }
        case "s3":
            return s3.getObject({Bucket: bucket, Key: key}).promise().then(res=>res.Body)

    }
}
function readFile(key) {
    return readFileImpl( key )
    .then((res => {
        return JSON.parse(res.toString())
    }))
    .catch((e) => {
        return {}
    })
}

function getCheckSum() {
    return readFileImpl( "data/checksum" )
    .then((res => {
        return res.toString();
    }))
    .catch(() => null)
}

function getExcel(){
    if (  storageType == "fs" ){
        return readFileImpl("data/prehled.xls")
    }
    else{
        var url = "http://www.mvcr.cz/clanek/informace-o-stavu-rizeni.aspx"

        return axios.get(url)
        .then((res) => {
            var match = (/(soubor\/prehled.*?aspx)/g).exec(res.data)
            if (match) {
                var docUrl = `http://www.mvcr.cz/${match[1]}`;
                return download(docUrl)
            }})

    }
}

exports.handler = () => {
    let date = new Date();
    return Promise.all([getExcel(), getCheckSum(), readFile("data/plain.json")])
    .then(([data, existingChecksum, plainData]) => {
        var checksum = calculateChecksum(data);
        if (existingChecksum != null && checksum == existingChecksum) {
            console.log("File Not updated");
            //return;
        }

        var workbook = XLSX.read(data, {type: 'buffer'});
        var treeResult = {}
        var plainResult = {}
        var cities = {}

        workbook.SheetNames.forEach(s => {
            var sheet = workbook.Sheets[s];
            var js = XLSX.utils.sheet_to_json(sheet, {header: ["rowNum", "application"]});
            var currentCity = "";
            var type = js[0].rowNum.trim();
            for (var i = 4; i < js.length; i++) {
                var row = js[i];

                if (!row.application) {
                    currentCity = row.rowNum.trim();
                    cities[currentCity] = 1;
                }
                else {
                    var application = row.application.trim();
                    var record = {
                        application: application,
                        city: currentCity,
                        type: s,
                        typeFull: type,
                        rowNum: row.rowNum.trim()
                    }

                    record.firstAppears =( plainData.applications && plainData.applications[application]
                        && plainData.applications[application].firstAppears ) ||date

                    if (!treeResult[s])
                        treeResult[s] = {}
                    if (!treeResult[s][currentCity])
                        treeResult[s][currentCity] = {}
                    treeResult[s][currentCity][application] = record;

                    if (plainResult[row.application])
                        console.log("DUPLICATE FOUND!")
                    plainResult[application] = record
                }
            }
        })

        let updatesHistory = plainData.updatesHistory || []
        updatesHistory.push(date)
        while (updatesHistory.length>10)
            updatesHistory.shift()

        let plain = {__version: 2, lastUpdated: date, updatesHistory, applications: plainResult}

        return Promise.all([saveFile("data/checksum", checksum)
            , saveFile("data/plain.json", JSON.stringify(plain, null, 2), true)
            , saveFile("data/tree.json", JSON.stringify(treeResult, null, 2), true)
            , saveFile("data/cities.json", JSON.stringify(Object.keys(cities), null, 2), true)
        ])

    })
    .then(() => {
        if (distributionId) {
            var params = {
                DistributionId: distributionId, /* required */
                InvalidationBatch: {
                    /* required */
                    CallerReference: new Date().getTime().toString(),
                    Paths: {
                        /* required */
                        Quantity: 1, /* required */
                        Items: [
                            '/data/*',
                            /* more items */
                        ]
                    }
                }
            };
            return cloudfront.createInvalidation(params).promise()
        }
    })
    .then(() => {
        console.log("done")
    })
    .catch(e => {
        console.error(e)
    })
}


