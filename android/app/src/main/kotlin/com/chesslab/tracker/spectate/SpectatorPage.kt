package com.chesslab.tracker.spectate

import kotlinx.serialization.json.Json

private val pageJson = Json { encodeDefaults = true }

/**
 * The whole spectator client, as one document.
 *
 * Self-contained is a functional requirement, not a preference: the club LAN may have no route to
 * the internet at all, so a CDN script tag or a webfont would render a blank board rather than
 * degrade. Everything — layout, glyphs, the poll loop — is inline, and the first paint comes from
 * the snapshot embedded below so the page is correct before its first request.
 */
fun spectatorPageHtml(snapshot: GameSnapshot): String {
    // `</` inside a script block would close it early; the JSON is data, never markup.
    val initial = pageJson.encodeToString(GameSnapshot.serializer(), snapshot).replace("</", "<\\/")
    return PAGE.replace(INITIAL_TOKEN, initial)
}

private const val INITIAL_TOKEN = "__SNAPSHOT__"

private val PAGE =
    """
    <!doctype html>
    <html lang="en"><head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>chesslab &mdash; spectator</title>
    <style>
    :root{color-scheme:light dark}
    body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#f4f4f5;color:#18181b}
    main{width:min(96vw,880px);margin:0 auto;padding:16px;display:flex;flex-wrap:wrap;gap:20px}
    #board{width:min(92vw,560px);aspect-ratio:1;display:grid;grid-template-columns:repeat(8,1fr);border-radius:10px;overflow:hidden}
    .sq{display:flex;align-items:center;justify-content:center;font-size:min(9vw,50px);line-height:1}
    .l{background:#e9ecf1}.d{background:#8ba0b6}
    .hl{box-shadow:inset 0 0 0 4px #eab308}
    .w{color:#fff;text-shadow:0 0 3px #000}.b{color:#101014}
    aside{flex:1;min-width:180px}
    #status{font-weight:600;letter-spacing:.08em;text-transform:uppercase;font-size:13px;opacity:.75}
    #moves{margin-top:10px;font-variant-numeric:tabular-nums;line-height:1.7}
    .n{opacity:.5}
    @media (prefers-color-scheme:dark){
    body{background:#0b0b0d;color:#e4e4e7}
    .l{background:#6a7280}.d{background:#3d444e}
    }
    </style></head><body>
    <main><div id="board"></div><aside><div id="status"></div><div id="moves"></div></aside></main>
    <script>
    var INITIAL=__SNAPSHOT__;
    var G={p:'♟',n:'♞',b:'♝',r:'♜',q:'♛',k:'♚'};
    var FILES='abcdefgh';
    function build(fen){
      var rows=(fen||'').split(' ')[0].split('/');var out=[];
      for(var r=0;r<8;r++){var row=rows[r]||'8';var f=0;
        for(var i=0;i<row.length;i++){var c=row[i];
          if(c>='1'&&c<='9'){var n=parseInt(c,10);
            for(var k=0;k<n&&f<8;k++){out.push({sq:FILES[f]+(8-r),g:'',w:false});f++;}
          }else if(f<8){out.push({sq:FILES[f]+(8-r),g:G[c.toLowerCase()]||'',w:c===c.toUpperCase()});f++;}
        }
        while(f<8){out.push({sq:FILES[f]+(8-r),g:'',w:false});f++;}
      }
      return out;
    }
    function draw(s){
      var u=s.lastMoveUci||'';var last=u.length>=4?[u.slice(0,2),u.slice(2,4)]:[];
      var b=document.getElementById('board');b.innerHTML='';
      build(s.fen).forEach(function(c,i){
        var d=document.createElement('div');
        d.className='sq '+(((i%8+Math.floor(i/8))%2===0)?'l':'d')+(last.indexOf(c.sq)>=0?' hl':'');
        if(c.g){var p=document.createElement('span');p.className=c.w?'w':'b';p.textContent=c.g;d.appendChild(p);}
        b.appendChild(d);
      });
      document.getElementById('status').textContent=s.result?(s.status+' · '+s.result):s.status;
      var t='';
      for(var i=0;i<s.sanHistory.length;i+=2){
        t+='<span class="n">'+(i/2+1)+'.</span> '+s.sanHistory[i]+' '+(s.sanHistory[i+1]||'')+'<br>';
      }
      document.getElementById('moves').innerHTML=t||'<span class="n">No moves yet</span>';
    }
    draw(INITIAL);
    setInterval(function(){
      fetch('/api/status').then(function(r){return r.json();}).then(draw).catch(function(){});
    },1000);
    </script></body></html>
    """.trimIndent()
