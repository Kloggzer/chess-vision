package com.chesslab.tracker.spectate

/**
 * Self-contained HTML page served at `GET /`. Renders the board from FEN using
 * inline SVG (no external assets, no CDN), polls `/api/status` every 1 s, and
 * displays the move list and a status chip. Zero external URLs by design.
 */
internal val SPECTATOR_PAGE: String =
    """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Chesslab Spectator</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#1a1a2e;color:#eee;padding:16px;display:flex;flex-direction:column;align-items:center}
h1{font-size:1.2rem;margin-bottom:12px;color:#e2b714}
#board-wrap{position:relative;width:min(90vw,480px);height:min(90vw,480px);margin-bottom:16px}
#board{width:100%;height:100%}
#status-chip{display:inline-block;padding:4px 12px;border-radius:12px;font-size:.8rem;margin-bottom:12px}
#status-chip.waiting{background:#555;color:#ccc}
#status-chip.tracking{background:#2a6b2a;color:#8f8}
#status-chip.stuck{background:#6b2a2a;color:#f88}
#status-chip.over{background:#6b5a2a;color:#ff8}
#move-list{width:100%;max-width:480px;font-family:"SF Mono","Consolas","Liberation Mono",monospace;font-size:.85rem;line-height:1.5}
#move-list ol{padding-left:24px;list-style-position:outside}
#move-list li{padding:2px 0}
#move-list li:last-child{color:#e2b714}
#fen-display{width:100%;max-width:480px;font-size:.7rem;color:#888;margin-top:8px;word-break:break-all;text-align:center}
#error{color:#f88;display:none;margin-top:8px}
</style>
</head>
<body>
<h1>&#9812; Chesslab Spectator</h1>
<div id="status-chip" class="waiting">waiting</div>
<div id="board-wrap"><svg id="board" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg"></svg></div>
<div id="move-list"><ol id="moves"></ol></div>
<div id="fen-display"></div>
<div id="error"></div>
<script>
// Piece to SVG symbol mapping (inline, no external fonts)
var PIECES = {
    'K':'&#9812;','Q':'&#9813;','R':'&#9814;','B':'&#9815;','N':'&#9816;','P':'&#9817;',
    'k':'&#9818;','q':'&#9819;','r':'&#9820;','b':'&#9821;','n':'&#9822;','p':'&#9823;'
};
function renderBoard(fen){
    var parts=fen.split(' '),rankStr=parts[0],svg=document.getElementById('board');
    var ranks=rankStr.split('/'),html='';
    for(var r=0;r<8;r++){
        var file=0;
        for(var c=0;c<ranks[r].length;c++){
            var ch=ranks[r][c];
            if(ch>='1'&&ch<='9'){var empty=parseInt(ch);file+=empty;continue}
            var light=(r+file)%2===0?'#f0d9b5':'#b58863';
            html+='<rect x="'+file+'" y="'+r+'" width="1" height="1" fill="'+light+'"/>';
            html+='<text x="'+(file+0.5)+'" y="'+(r+0.78)+'" text-anchor="middle" font-size="0.85" style="pointer-events:none">'+PIECES[ch]+'</text>';
            file++;
        }
        for(var f=file;f<8;f++){
            var light=(r+f)%2===0?'#f0d9b5':'#b58863';
            html+='<rect x="'+f+'" y="'+r+'" width="1" height="1" fill="'+light+'"/>';
        }
    }
    svg.innerHTML=html;
}
function updateStatus(status,lastDecision,result){
    var chip=document.getElementById('status-chip');
    chip.className=status;
    chip.textContent=result?result:status;
}
function updateMoves(history){
    var ol=document.getElementById('moves');ol.innerHTML='';
    for(var i=0;i<history.length;i++){
        var li=document.createElement('li');
        li.textContent=history[i];
        ol.appendChild(li);
    }
    if(history.length>0){
        var last=ol.lastElementChild;
        if(last)last.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
}
function updateFenDisplay(fen){
    document.getElementById('fen-display').textContent=fen;
}
function showError(msg){
    var el=document.getElementById('error');
    el.textContent=msg;el.style.display=msg?'block':'none';
}
function poll(){
    fetch('/api/status').then(function(r){
        if(!r.ok)throw new Error('HTTP '+r.status);
        return r.json();
    }).then(function(data){
        renderBoard(data.fen);
        updateStatus(data.status,data.lastDecision,data.result);
        updateMoves(data.sanHistory);
        updateFenDisplay(data.fen);
        showError('');
    }).catch(function(err){
        showError('Connection lost: '+err.message);
    });
}
poll();
setInterval(poll,1000);
</script>
</body>
</html>
    """.trimIndent()
