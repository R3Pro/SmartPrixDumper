const puppeteer = require("puppeteer");
const fs = require('fs')
const sqlite3 = require('sqlite3').verbose();
const request = require('request');

const endpoint = "https://www.smartprix.com/mobiles/?uq=1&sort=rel&asc=0&page="
var download = function(uri, filename, callback){
    request.head(uri, function(err, res, body){
      //console.log('content-type:', res.headers['content-type']);
      //console.log('content-length:', res.headers['content-length']);
      request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
  };
  
async function GetPageCount(iPage) {
    const eval = await iPage.evaluate(() => {
        var desc = document.getElementsByClassName("description")[0];
        let count = desc.innerHTML.match(/of (.*?) M/i)[1];
        count = Math.round(count/20);
        return count;
    });
    return eval+2;
}


function CreateDataBase($db){
    $db.serialize(function() {
        $db.run(`CREATE TABLE IF NOT EXISTS "Phone" (
          "id"	INTEGER,
          "company"	TEXT,
          "model"	TEXT,
          "Android"	TEXT,
          "CPU"	TEXT,
          "CPUModel"	TEXT,
          "Display"	TEXT,
          "image"	TEXT
          );`);
        })
}


(async ()=>{
    
    let dir = "./image/"
    if (!fs.existsSync(dir)){ fs.mkdirSync(dir); }
    var db = new sqlite3.Database('database.db');
    CreateDataBase(db);
    const browser = await puppeteer.launch({
        headless : true  // Hide Broswer
    });  
    const page = await browser.newPage(); // create new page in browser


    await page.goto(endpoint); // goto the link

    let countx = await GetPageCount(page); // get page count

    console.log("Count : " + countx);
    for(var i = 1 ;i < countx ;i++)
    {   
        //process.stdout.write("\n Page : "+ i + " > ");
        console.log("Page : " + i)


        try {
            await page.goto(endpoint+i);
        } catch (error) {
            console.log("Error : " + error);
        }
        
                const newPage = await page.evaluate(() => {
                
                document.getElementsByClassName("content-section green white-bg related related-products")[0].remove();
                var PageArray = [];
                var items = document.getElementsByClassName("f-mobiles");
            
            for (c = 1; c < items.length; c++) {
                var InfoArray = {};
                var insd = items[c].getElementsByClassName("info")
            
                var PhoneName = insd[0].getElementsByTagName("a")[0]
                var PhoneIMG = (items[c].getElementsByTagName("img")[0].src).replace("w103-h125", "w240-h290")
                var iTickCheck = items[c].getElementsByClassName("i-tick-check")
                InfoArray.Phone = PhoneName.innerHTML
                InfoArray.IMG = PhoneIMG
                for(x = 0;x < iTickCheck.length;x++){
                    let Text = (iTickCheck[x].parentNode).getElementsByTagName("span")[0].innerHTML
                    if (Text.indexOf("Processor") != -1){
                        InfoArray.CPU = Text
                    }else if(Text.indexOf("RAM") != -1){
                        InfoArray.RAM = Text
                    }else if(Text.indexOf("Battery") != -1){
                        InfoArray.BAT = Text
                    }else if(Text.indexOf("Display") != -1){
                        InfoArray.LCD = Text
                    }else if(Text.indexOf("Android") != -1){
                        InfoArray.Android = Text
                    }
                }
                PageArray.push(InfoArray)
            }
                return PageArray;
            });
        
            var stmt = db.prepare("INSERT INTO Phone VALUES (?,?,?,?,?,?,?,?)");
            newPage.forEach(element => {
                //let filename = element.IMG.substring(element.IMG.lastIndexOf('/')+1); 
                //download(element.IMG, dir+filename, function(){console.log('done')});
                stmt.run(null,element.Phone,element.Phone,element.Android,element.CPU,"",element.LCD,element.IMG);   
            });
            stmt.finalize();  
    }
    console.log("Done , All Data is Dumped")
    db.close();

    process.exit(0)
})();
