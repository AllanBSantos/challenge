const _ = require('lodash')
const fs = require('fs')
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

    // system flow
    let csvText      =  getCSVText()
    let allLinesCSV  = separateLines(csvText)
    let headerTable  = allLinesCSV[0].split(",")
    let bodyTable    =  splitBodyTable( _.tail(allLinesCSV))
    let listObjects = makeObjects( headerTable, bodyTable )
    let listObjectsValidated =  validateObjects(listObjects)
    let listObjectsMerged =   mergeRepeatedObjects(listObjectsValidated)
    writeOutputFile(listObjectsMerged)
  
//main functions
 function getCSVText(){
    return fs.readFileSync('input.csv','utf8')
}

 function separateLines(csvText){
    return  csvText.split("\r\n")
}

 function splitBodyTable(arr){
    let splittedBody = []
    arr.map((item)=>{
        splittedBody.push( item.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/))
    })
    return splittedBody
}


function makeObjects( headerTable, bodyTable){
   let listObjects =[]
   headerTable = separateGroups(headerTable)
   bodyTable.map((body)=>{
    let obj = _.zipObject(headerTable, body)
    listObjects.push(obj)
   })
   return listObjects
}

function separateGroups(headerTable){
    let numberGroups = 0
    headerTable.map((column,index)=>{
        if(column ==="group"){
        headerTable[index] = "group"+numberGroups
        numberGroups++
        }
    })
    return headerTable
}

 function validateObjects(listObjects){
    let finalList = []
   listObjects.map((object)=>{
    let groups = []
    let addresses = []
    let finalObject = {}
        for (let [key, value] of Object.entries(object)) {
           if(key.includes('email') || key.includes('phone') || key.includes('group') ){
               if(key.includes('group')){
                   let listGroups = value.split("/")
                   listGroups.map((item)=>{
                       item = item.replace(/"/g,"").split(",")
                       if(item.length > 1){
                           item.map((subItem)=>{
                            subItem = subItem.replace(/"/g,"")
                            groups.push(_.trim(subItem))
                           })
                       }else{
                        groups.push(_.trim(item))
                       }
                    })
               }else {
                let tags = key.split(" ")
                let type = tags[0].replace('\"', "")
                tags =  _.tail(tags)
                tags.map((tag,index)=>{
                    tags[index] = tag.replace('\"', "")
                })

                let valid = false
                if(key.includes('email')){
                    let emails = value.split("/")
                    if(emails.length > 1){
                        emails.map((email)=>{
                            email = cleanEmail(email)
                            valid = validateEmail(email)
                            email = email.split(" ")[0]
                            if(valid) addresses.push({ type, tags, address: email})
                        })
                    }else{
                        value = cleanEmail(value)
                        valid = validateEmail(value)
                        value = value.split(" ")[0]
                        if(valid) addresses.push({ type, tags, address: value})
                    }
                  
                }else{
                    valid =  validatePhone(value)
                    if(valid){
                        value = "55"+value.replace(/\D+/g, "")
                        addresses.push({ type, tags, address: value})
                    }
                }
               }
            }else{
                if(key.includes('invisible') || key.includes('see_all') ){
                        if(value === "yes" || value == 1 || value === "y"){
                            finalObject[key] = true
                        }else{
                            finalObject[key] = false
                        }
                }else{
                    finalObject[key] = value
                }
            }
        }
        finalObject.addresses = addresses
        finalObject.groups = _.compact(groups)
        finalList.push(finalObject)
        
    })
    return finalList
}
var cleanedList = []
function mergeRepeatedObjects(listObjects){
    let duplicates = findDuplicateObjects(listObjects)
   
    let merged = {}
     if(duplicates.length > 0){
         let allGroups = duplicates[0].groups.concat(duplicates[1].groups)
         allGroups = _.uniq(allGroups)
 
        let AllAddresses =  duplicates[0].addresses.concat(duplicates[1].addresses)
        AllAddresses = _.uniq(AllAddresses)
        merged =  Object.assign(duplicates[0], duplicates[1])
        merged.groups = allGroups
        merged.addresses = AllAddresses
        cleanedList = cleanList(listObjects, duplicates)
        cleanedList.unshift(merged)
        mergeRepeatedObjects(cleanedList)
     }else{
         cleanedList = listObjects
     }
     return cleanedList
  }

  function writeOutputFile(obj){
    var json = JSON.stringify(obj)
     var fs = require('fs')
     fs.writeFile('output.json', json, 'utf8', 
     (error)=>{
         if(error){
             console.log(error)
         }
     }
     ) 
 } 
 // auxiliary functions
 function cleanEmail(email){
    return email.replace(/[^a-z0-9@._-]/gi,'')
 }
function validateEmail(email){
    const regularExpression = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return regularExpression.test(String(email).toLowerCase())
}

function validatePhone(phone){
    phone = phone.replace(/[^0-9]/g, '')
    if(phone){
        let number = phoneUtil.parseAndKeepRawInput(phone, 'BR');
        return phoneUtil.isValidNumber(number)
    }else{
        return false
    }
}

 function findDuplicateObjects(list){
    let ocorrencias = list.reduce((accum, element) => {
        accum[element.eid] = ++accum[element.eid] || 0
      return accum
    }, {})
   return  list.filter(element => ocorrencias[element.eid])
 }

 function cleanList(list, duplicates){
    let filtered = list.filter((item)=>{
        return item.eid !== duplicates[0].eid
    })
    return filtered
 }