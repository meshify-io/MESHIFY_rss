const AWS = require("aws-sdk");
const FEEDPARSER = require("feedparser");
const REQUEST = require('request');

exports.handler = (event, context,callback) => {
  // console.log("event");
  // console.log(event);
  // console.log("context");
  // console.log(context);

  var feedparser = new FEEDPARSER();

  const options = {
    url: event.url,
    headers: {
      'User-Agent': 'curl/7.64.1'
    },
    gzip: true
  };
  var req = REQUEST(options);

  var result = [];

  req.on('error', function (error) {
    // handle any request errors

    console.log("an error happened");
    console.log(`while requesting ${event.url}`);
    console.log(error);
  });

  req.on('response', function (res) {
    var stream = this; // `this` is `req`, which is a stream

    if (res.statusCode !== 200) {
      this.emit('error', new Error(`Bad status code: ${res.statusCode}`));
    }
    else {
      stream.pipe(feedparser);
    }
  });

  feedparser.on('error', function (error) {
    // always handle errors
    console.log("an error happened");
    console.log(error);
  });

  feedparser.on('readable', function () {
    // This is where the action is!
    var stream = this; // `this` is `feedparser`, which is a stream
    var meta = this.meta; // **NOTE** the "meta" is always available in the context of the feedparser instance
    var item;
    let title = meta.title;
    let description = meta.description;
    let date = meta.date;
    let link = meta.link;

    let feed = {
      title: title,
      description: description,
      date: date,
      link: link
    };

    while (item = stream.read()) {
      //console.log(item);
      let title =  item.title;
      let description = item.description;
      let summary = item.summary;
      let date = item.date;
      let dateObj=new Date(date)
      let link = item.link;
      let guid = item.guid;

      let entry ={
        title: title,
        description: description,
        summary: summary,
        date: date,
        link: link,
        guid: guid,
        feed: feed,
        dedupid: feed.link+item.link
      };
      let lastWeek = new Date(new Date().getTime()-7*86000000)
      if(dateObj > lastWeek){
        result.push(entry);
        // console.log(JSON.stringify(entry,null,2));
      }else{
        //avoid log
        //console.log("entry too old");
        //console.log(JSON.stringify(entry,null,2));
      }
    }
  });
  feedparser.on('end', function(){
    // console.log(JSON.stringify(result,null,2));
    //sort result by date desc
    result = result.sort(function(a,b){
      return new Date(b.date) - new Date(a.date);
    });
    //look for lastvalue entry
    let lastvalue = context.clientContext.custom.lastvalue;
    let finalresult = [];
    for(let idx=0;idx<result.length;idx++){
      if(result[idx].dedupid == lastvalue){
        break;
      }else{
        finalresult.push(result[idx]);
      }
    }
    //return result by date ascending
    callback(null,finalresult.reverse());
  });
}
