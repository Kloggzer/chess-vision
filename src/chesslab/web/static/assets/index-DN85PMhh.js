var fx=i=>{throw TypeError(i)};var ef=(i,e,t)=>e.has(i)||fx("Cannot "+t);var j=(i,e,t)=>(ef(i,e,"read from private field"),t?t.call(i):e.get(i)),rt=(i,e,t)=>e.has(i)?fx("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(i):e.set(i,t),ze=(i,e,t,r)=>(ef(i,e,"write to private field"),r?r.call(i,t):e.set(i,t),t),gt=(i,e,t)=>(ef(i,e,"access private method"),t);var uu=(i,e,t,r)=>({set _(a){ze(i,e,a,t)},get _(){return j(i,e,r)}});(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))r(a);new MutationObserver(a=>{for(const l of a)if(l.type==="childList")for(const c of l.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&r(c)}).observe(document,{childList:!0,subtree:!0});function t(a){const l={};return a.integrity&&(l.integrity=a.integrity),a.referrerPolicy&&(l.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?l.credentials="include":a.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function r(a){if(a.ep)return;a.ep=!0;const l=t(a);fetch(a.href,l)}})();function mM(i){return i&&i.__esModule&&Object.prototype.hasOwnProperty.call(i,"default")?i.default:i}var tf={exports:{}},wl={},nf={exports:{}},Mt={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var px;function gM(){if(px)return Mt;px=1;var i=Symbol.for("react.element"),e=Symbol.for("react.portal"),t=Symbol.for("react.fragment"),r=Symbol.for("react.strict_mode"),a=Symbol.for("react.profiler"),l=Symbol.for("react.provider"),c=Symbol.for("react.context"),d=Symbol.for("react.forward_ref"),h=Symbol.for("react.suspense"),f=Symbol.for("react.memo"),m=Symbol.for("react.lazy"),g=Symbol.iterator;function x(P){return P===null||typeof P!="object"?null:(P=g&&P[g]||P["@@iterator"],typeof P=="function"?P:null)}var M={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},E=Object.assign,w={};function _(P,X,Le){this.props=P,this.context=X,this.refs=w,this.updater=Le||M}_.prototype.isReactComponent={},_.prototype.setState=function(P,X){if(typeof P!="object"&&typeof P!="function"&&P!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,P,X,"setState")},_.prototype.forceUpdate=function(P){this.updater.enqueueForceUpdate(this,P,"forceUpdate")};function S(){}S.prototype=_.prototype;function L(P,X,Le){this.props=P,this.context=X,this.refs=w,this.updater=Le||M}var N=L.prototype=new S;N.constructor=L,E(N,_.prototype),N.isPureReactComponent=!0;var C=Array.isArray,U=Object.prototype.hasOwnProperty,D={current:null},k={key:!0,ref:!0,__self:!0,__source:!0};function b(P,X,Le){var Be,Ge={},le=null,ye=null;if(X!=null)for(Be in X.ref!==void 0&&(ye=X.ref),X.key!==void 0&&(le=""+X.key),X)U.call(X,Be)&&!k.hasOwnProperty(Be)&&(Ge[Be]=X[Be]);var ge=arguments.length-2;if(ge===1)Ge.children=Le;else if(1<ge){for(var Ue=Array(ge),Ze=0;Ze<ge;Ze++)Ue[Ze]=arguments[Ze+2];Ge.children=Ue}if(P&&P.defaultProps)for(Be in ge=P.defaultProps,ge)Ge[Be]===void 0&&(Ge[Be]=ge[Be]);return{$$typeof:i,type:P,key:le,ref:ye,props:Ge,_owner:D.current}}function F(P,X){return{$$typeof:i,type:P.type,key:X,ref:P.ref,props:P.props,_owner:P._owner}}function B(P){return typeof P=="object"&&P!==null&&P.$$typeof===i}function G(P){var X={"=":"=0",":":"=2"};return"$"+P.replace(/[=:]/g,function(Le){return X[Le]})}var Z=/\/+/g;function re(P,X){return typeof P=="object"&&P!==null&&P.key!=null?G(""+P.key):X.toString(36)}function he(P,X,Le,Be,Ge){var le=typeof P;(le==="undefined"||le==="boolean")&&(P=null);var ye=!1;if(P===null)ye=!0;else switch(le){case"string":case"number":ye=!0;break;case"object":switch(P.$$typeof){case i:case e:ye=!0}}if(ye)return ye=P,Ge=Ge(ye),P=Be===""?"."+re(ye,0):Be,C(Ge)?(Le="",P!=null&&(Le=P.replace(Z,"$&/")+"/"),he(Ge,X,Le,"",function(Ze){return Ze})):Ge!=null&&(B(Ge)&&(Ge=F(Ge,Le+(!Ge.key||ye&&ye.key===Ge.key?"":(""+Ge.key).replace(Z,"$&/")+"/")+P)),X.push(Ge)),1;if(ye=0,Be=Be===""?".":Be+":",C(P))for(var ge=0;ge<P.length;ge++){le=P[ge];var Ue=Be+re(le,ge);ye+=he(le,X,Le,Ue,Ge)}else if(Ue=x(P),typeof Ue=="function")for(P=Ue.call(P),ge=0;!(le=P.next()).done;)le=le.value,Ue=Be+re(le,ge++),ye+=he(le,X,Le,Ue,Ge);else if(le==="object")throw X=String(P),Error("Objects are not valid as a React child (found: "+(X==="[object Object]"?"object with keys {"+Object.keys(P).join(", ")+"}":X)+"). If you meant to render a collection of children, use an array instead.");return ye}function z(P,X,Le){if(P==null)return P;var Be=[],Ge=0;return he(P,Be,"","",function(le){return X.call(Le,le,Ge++)}),Be}function ae(P){if(P._status===-1){var X=P._result;X=X(),X.then(function(Le){(P._status===0||P._status===-1)&&(P._status=1,P._result=Le)},function(Le){(P._status===0||P._status===-1)&&(P._status=2,P._result=Le)}),P._status===-1&&(P._status=0,P._result=X)}if(P._status===1)return P._result.default;throw P._result}var ee={current:null},q={transition:null},de={ReactCurrentDispatcher:ee,ReactCurrentBatchConfig:q,ReactCurrentOwner:D};function ce(){throw Error("act(...) is not supported in production builds of React.")}return Mt.Children={map:z,forEach:function(P,X,Le){z(P,function(){X.apply(this,arguments)},Le)},count:function(P){var X=0;return z(P,function(){X++}),X},toArray:function(P){return z(P,function(X){return X})||[]},only:function(P){if(!B(P))throw Error("React.Children.only expected to receive a single React element child.");return P}},Mt.Component=_,Mt.Fragment=t,Mt.Profiler=a,Mt.PureComponent=L,Mt.StrictMode=r,Mt.Suspense=h,Mt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=de,Mt.act=ce,Mt.cloneElement=function(P,X,Le){if(P==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+P+".");var Be=E({},P.props),Ge=P.key,le=P.ref,ye=P._owner;if(X!=null){if(X.ref!==void 0&&(le=X.ref,ye=D.current),X.key!==void 0&&(Ge=""+X.key),P.type&&P.type.defaultProps)var ge=P.type.defaultProps;for(Ue in X)U.call(X,Ue)&&!k.hasOwnProperty(Ue)&&(Be[Ue]=X[Ue]===void 0&&ge!==void 0?ge[Ue]:X[Ue])}var Ue=arguments.length-2;if(Ue===1)Be.children=Le;else if(1<Ue){ge=Array(Ue);for(var Ze=0;Ze<Ue;Ze++)ge[Ze]=arguments[Ze+2];Be.children=ge}return{$$typeof:i,type:P.type,key:Ge,ref:le,props:Be,_owner:ye}},Mt.createContext=function(P){return P={$$typeof:c,_currentValue:P,_currentValue2:P,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},P.Provider={$$typeof:l,_context:P},P.Consumer=P},Mt.createElement=b,Mt.createFactory=function(P){var X=b.bind(null,P);return X.type=P,X},Mt.createRef=function(){return{current:null}},Mt.forwardRef=function(P){return{$$typeof:d,render:P}},Mt.isValidElement=B,Mt.lazy=function(P){return{$$typeof:m,_payload:{_status:-1,_result:P},_init:ae}},Mt.memo=function(P,X){return{$$typeof:f,type:P,compare:X===void 0?null:X}},Mt.startTransition=function(P){var X=q.transition;q.transition={};try{P()}finally{q.transition=X}},Mt.unstable_act=ce,Mt.useCallback=function(P,X){return ee.current.useCallback(P,X)},Mt.useContext=function(P){return ee.current.useContext(P)},Mt.useDebugValue=function(){},Mt.useDeferredValue=function(P){return ee.current.useDeferredValue(P)},Mt.useEffect=function(P,X){return ee.current.useEffect(P,X)},Mt.useId=function(){return ee.current.useId()},Mt.useImperativeHandle=function(P,X,Le){return ee.current.useImperativeHandle(P,X,Le)},Mt.useInsertionEffect=function(P,X){return ee.current.useInsertionEffect(P,X)},Mt.useLayoutEffect=function(P,X){return ee.current.useLayoutEffect(P,X)},Mt.useMemo=function(P,X){return ee.current.useMemo(P,X)},Mt.useReducer=function(P,X,Le){return ee.current.useReducer(P,X,Le)},Mt.useRef=function(P){return ee.current.useRef(P)},Mt.useState=function(P){return ee.current.useState(P)},Mt.useSyncExternalStore=function(P,X,Le){return ee.current.useSyncExternalStore(P,X,Le)},Mt.useTransition=function(){return ee.current.useTransition()},Mt.version="18.3.1",Mt}var mx;function lm(){return mx||(mx=1,nf.exports=gM()),nf.exports}/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var gx;function xM(){if(gx)return wl;gx=1;var i=lm(),e=Symbol.for("react.element"),t=Symbol.for("react.fragment"),r=Object.prototype.hasOwnProperty,a=i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,l={key:!0,ref:!0,__self:!0,__source:!0};function c(d,h,f){var m,g={},x=null,M=null;f!==void 0&&(x=""+f),h.key!==void 0&&(x=""+h.key),h.ref!==void 0&&(M=h.ref);for(m in h)r.call(h,m)&&!l.hasOwnProperty(m)&&(g[m]=h[m]);if(d&&d.defaultProps)for(m in h=d.defaultProps,h)g[m]===void 0&&(g[m]=h[m]);return{$$typeof:e,type:d,key:x,ref:M,props:g,_owner:a.current}}return wl.Fragment=t,wl.jsx=c,wl.jsxs=c,wl}var xx;function vM(){return xx||(xx=1,tf.exports=xM()),tf.exports}var v=vM(),V=lm();const _M=mM(V);var du={},rf={exports:{}},oi={},sf={exports:{}},af={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var vx;function yM(){return vx||(vx=1,(function(i){function e(q,de){var ce=q.length;q.push(de);e:for(;0<ce;){var P=ce-1>>>1,X=q[P];if(0<a(X,de))q[P]=de,q[ce]=X,ce=P;else break e}}function t(q){return q.length===0?null:q[0]}function r(q){if(q.length===0)return null;var de=q[0],ce=q.pop();if(ce!==de){q[0]=ce;e:for(var P=0,X=q.length,Le=X>>>1;P<Le;){var Be=2*(P+1)-1,Ge=q[Be],le=Be+1,ye=q[le];if(0>a(Ge,ce))le<X&&0>a(ye,Ge)?(q[P]=ye,q[le]=ce,P=le):(q[P]=Ge,q[Be]=ce,P=Be);else if(le<X&&0>a(ye,ce))q[P]=ye,q[le]=ce,P=le;else break e}}return de}function a(q,de){var ce=q.sortIndex-de.sortIndex;return ce!==0?ce:q.id-de.id}if(typeof performance=="object"&&typeof performance.now=="function"){var l=performance;i.unstable_now=function(){return l.now()}}else{var c=Date,d=c.now();i.unstable_now=function(){return c.now()-d}}var h=[],f=[],m=1,g=null,x=3,M=!1,E=!1,w=!1,_=typeof setTimeout=="function"?setTimeout:null,S=typeof clearTimeout=="function"?clearTimeout:null,L=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function N(q){for(var de=t(f);de!==null;){if(de.callback===null)r(f);else if(de.startTime<=q)r(f),de.sortIndex=de.expirationTime,e(h,de);else break;de=t(f)}}function C(q){if(w=!1,N(q),!E)if(t(h)!==null)E=!0,ae(U);else{var de=t(f);de!==null&&ee(C,de.startTime-q)}}function U(q,de){E=!1,w&&(w=!1,S(b),b=-1),M=!0;var ce=x;try{for(N(de),g=t(h);g!==null&&(!(g.expirationTime>de)||q&&!G());){var P=g.callback;if(typeof P=="function"){g.callback=null,x=g.priorityLevel;var X=P(g.expirationTime<=de);de=i.unstable_now(),typeof X=="function"?g.callback=X:g===t(h)&&r(h),N(de)}else r(h);g=t(h)}if(g!==null)var Le=!0;else{var Be=t(f);Be!==null&&ee(C,Be.startTime-de),Le=!1}return Le}finally{g=null,x=ce,M=!1}}var D=!1,k=null,b=-1,F=5,B=-1;function G(){return!(i.unstable_now()-B<F)}function Z(){if(k!==null){var q=i.unstable_now();B=q;var de=!0;try{de=k(!0,q)}finally{de?re():(D=!1,k=null)}}else D=!1}var re;if(typeof L=="function")re=function(){L(Z)};else if(typeof MessageChannel<"u"){var he=new MessageChannel,z=he.port2;he.port1.onmessage=Z,re=function(){z.postMessage(null)}}else re=function(){_(Z,0)};function ae(q){k=q,D||(D=!0,re())}function ee(q,de){b=_(function(){q(i.unstable_now())},de)}i.unstable_IdlePriority=5,i.unstable_ImmediatePriority=1,i.unstable_LowPriority=4,i.unstable_NormalPriority=3,i.unstable_Profiling=null,i.unstable_UserBlockingPriority=2,i.unstable_cancelCallback=function(q){q.callback=null},i.unstable_continueExecution=function(){E||M||(E=!0,ae(U))},i.unstable_forceFrameRate=function(q){0>q||125<q?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):F=0<q?Math.floor(1e3/q):5},i.unstable_getCurrentPriorityLevel=function(){return x},i.unstable_getFirstCallbackNode=function(){return t(h)},i.unstable_next=function(q){switch(x){case 1:case 2:case 3:var de=3;break;default:de=x}var ce=x;x=de;try{return q()}finally{x=ce}},i.unstable_pauseExecution=function(){},i.unstable_requestPaint=function(){},i.unstable_runWithPriority=function(q,de){switch(q){case 1:case 2:case 3:case 4:case 5:break;default:q=3}var ce=x;x=q;try{return de()}finally{x=ce}},i.unstable_scheduleCallback=function(q,de,ce){var P=i.unstable_now();switch(typeof ce=="object"&&ce!==null?(ce=ce.delay,ce=typeof ce=="number"&&0<ce?P+ce:P):ce=P,q){case 1:var X=-1;break;case 2:X=250;break;case 5:X=1073741823;break;case 4:X=1e4;break;default:X=5e3}return X=ce+X,q={id:m++,callback:de,priorityLevel:q,startTime:ce,expirationTime:X,sortIndex:-1},ce>P?(q.sortIndex=ce,e(f,q),t(h)===null&&q===t(f)&&(w?(S(b),b=-1):w=!0,ee(C,ce-P))):(q.sortIndex=X,e(h,q),E||M||(E=!0,ae(U))),q},i.unstable_shouldYield=G,i.unstable_wrapCallback=function(q){var de=x;return function(){var ce=x;x=de;try{return q.apply(this,arguments)}finally{x=ce}}}})(af)),af}var _x;function SM(){return _x||(_x=1,sf.exports=yM()),sf.exports}/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var yx;function MM(){if(yx)return oi;yx=1;var i=lm(),e=SM();function t(n){for(var s="https://reactjs.org/docs/error-decoder.html?invariant="+n,o=1;o<arguments.length;o++)s+="&args[]="+encodeURIComponent(arguments[o]);return"Minified React error #"+n+"; visit "+s+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var r=new Set,a={};function l(n,s){c(n,s),c(n+"Capture",s)}function c(n,s){for(a[n]=s,n=0;n<s.length;n++)r.add(s[n])}var d=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),h=Object.prototype.hasOwnProperty,f=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,m={},g={};function x(n){return h.call(g,n)?!0:h.call(m,n)?!1:f.test(n)?g[n]=!0:(m[n]=!0,!1)}function M(n,s,o,u){if(o!==null&&o.type===0)return!1;switch(typeof s){case"function":case"symbol":return!0;case"boolean":return u?!1:o!==null?!o.acceptsBooleans:(n=n.toLowerCase().slice(0,5),n!=="data-"&&n!=="aria-");default:return!1}}function E(n,s,o,u){if(s===null||typeof s>"u"||M(n,s,o,u))return!0;if(u)return!1;if(o!==null)switch(o.type){case 3:return!s;case 4:return s===!1;case 5:return isNaN(s);case 6:return isNaN(s)||1>s}return!1}function w(n,s,o,u,p,y,R){this.acceptsBooleans=s===2||s===3||s===4,this.attributeName=u,this.attributeNamespace=p,this.mustUseProperty=o,this.propertyName=n,this.type=s,this.sanitizeURL=y,this.removeEmptyString=R}var _={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(n){_[n]=new w(n,0,!1,n,null,!1,!1)}),[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(n){var s=n[0];_[s]=new w(s,1,!1,n[1],null,!1,!1)}),["contentEditable","draggable","spellCheck","value"].forEach(function(n){_[n]=new w(n,2,!1,n.toLowerCase(),null,!1,!1)}),["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(n){_[n]=new w(n,2,!1,n,null,!1,!1)}),"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(n){_[n]=new w(n,3,!1,n.toLowerCase(),null,!1,!1)}),["checked","multiple","muted","selected"].forEach(function(n){_[n]=new w(n,3,!0,n,null,!1,!1)}),["capture","download"].forEach(function(n){_[n]=new w(n,4,!1,n,null,!1,!1)}),["cols","rows","size","span"].forEach(function(n){_[n]=new w(n,6,!1,n,null,!1,!1)}),["rowSpan","start"].forEach(function(n){_[n]=new w(n,5,!1,n.toLowerCase(),null,!1,!1)});var S=/[\-:]([a-z])/g;function L(n){return n[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(n){var s=n.replace(S,L);_[s]=new w(s,1,!1,n,null,!1,!1)}),"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(n){var s=n.replace(S,L);_[s]=new w(s,1,!1,n,"http://www.w3.org/1999/xlink",!1,!1)}),["xml:base","xml:lang","xml:space"].forEach(function(n){var s=n.replace(S,L);_[s]=new w(s,1,!1,n,"http://www.w3.org/XML/1998/namespace",!1,!1)}),["tabIndex","crossOrigin"].forEach(function(n){_[n]=new w(n,1,!1,n.toLowerCase(),null,!1,!1)}),_.xlinkHref=new w("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1),["src","href","action","formAction"].forEach(function(n){_[n]=new w(n,1,!1,n.toLowerCase(),null,!0,!0)});function N(n,s,o,u){var p=_.hasOwnProperty(s)?_[s]:null;(p!==null?p.type!==0:u||!(2<s.length)||s[0]!=="o"&&s[0]!=="O"||s[1]!=="n"&&s[1]!=="N")&&(E(s,o,p,u)&&(o=null),u||p===null?x(s)&&(o===null?n.removeAttribute(s):n.setAttribute(s,""+o)):p.mustUseProperty?n[p.propertyName]=o===null?p.type===3?!1:"":o:(s=p.attributeName,u=p.attributeNamespace,o===null?n.removeAttribute(s):(p=p.type,o=p===3||p===4&&o===!0?"":""+o,u?n.setAttributeNS(u,s,o):n.setAttribute(s,o))))}var C=i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,U=Symbol.for("react.element"),D=Symbol.for("react.portal"),k=Symbol.for("react.fragment"),b=Symbol.for("react.strict_mode"),F=Symbol.for("react.profiler"),B=Symbol.for("react.provider"),G=Symbol.for("react.context"),Z=Symbol.for("react.forward_ref"),re=Symbol.for("react.suspense"),he=Symbol.for("react.suspense_list"),z=Symbol.for("react.memo"),ae=Symbol.for("react.lazy"),ee=Symbol.for("react.offscreen"),q=Symbol.iterator;function de(n){return n===null||typeof n!="object"?null:(n=q&&n[q]||n["@@iterator"],typeof n=="function"?n:null)}var ce=Object.assign,P;function X(n){if(P===void 0)try{throw Error()}catch(o){var s=o.stack.trim().match(/\n( *(at )?)/);P=s&&s[1]||""}return`
`+P+n}var Le=!1;function Be(n,s){if(!n||Le)return"";Le=!0;var o=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(s)if(s=function(){throw Error()},Object.defineProperty(s.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(s,[])}catch(pe){var u=pe}Reflect.construct(n,[],s)}else{try{s.call()}catch(pe){u=pe}n.call(s.prototype)}else{try{throw Error()}catch(pe){u=pe}n()}}catch(pe){if(pe&&u&&typeof pe.stack=="string"){for(var p=pe.stack.split(`
`),y=u.stack.split(`
`),R=p.length-1,H=y.length-1;1<=R&&0<=H&&p[R]!==y[H];)H--;for(;1<=R&&0<=H;R--,H--)if(p[R]!==y[H]){if(R!==1||H!==1)do if(R--,H--,0>H||p[R]!==y[H]){var W=`
`+p[R].replace(" at new "," at ");return n.displayName&&W.includes("<anonymous>")&&(W=W.replace("<anonymous>",n.displayName)),W}while(1<=R&&0<=H);break}}}finally{Le=!1,Error.prepareStackTrace=o}return(n=n?n.displayName||n.name:"")?X(n):""}function Ge(n){switch(n.tag){case 5:return X(n.type);case 16:return X("Lazy");case 13:return X("Suspense");case 19:return X("SuspenseList");case 0:case 2:case 15:return n=Be(n.type,!1),n;case 11:return n=Be(n.type.render,!1),n;case 1:return n=Be(n.type,!0),n;default:return""}}function le(n){if(n==null)return null;if(typeof n=="function")return n.displayName||n.name||null;if(typeof n=="string")return n;switch(n){case k:return"Fragment";case D:return"Portal";case F:return"Profiler";case b:return"StrictMode";case re:return"Suspense";case he:return"SuspenseList"}if(typeof n=="object")switch(n.$$typeof){case G:return(n.displayName||"Context")+".Consumer";case B:return(n._context.displayName||"Context")+".Provider";case Z:var s=n.render;return n=n.displayName,n||(n=s.displayName||s.name||"",n=n!==""?"ForwardRef("+n+")":"ForwardRef"),n;case z:return s=n.displayName||null,s!==null?s:le(n.type)||"Memo";case ae:s=n._payload,n=n._init;try{return le(n(s))}catch{}}return null}function ye(n){var s=n.type;switch(n.tag){case 24:return"Cache";case 9:return(s.displayName||"Context")+".Consumer";case 10:return(s._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return n=s.render,n=n.displayName||n.name||"",s.displayName||(n!==""?"ForwardRef("+n+")":"ForwardRef");case 7:return"Fragment";case 5:return s;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return le(s);case 8:return s===b?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof s=="function")return s.displayName||s.name||null;if(typeof s=="string")return s}return null}function ge(n){switch(typeof n){case"boolean":case"number":case"string":case"undefined":return n;case"object":return n;default:return""}}function Ue(n){var s=n.type;return(n=n.nodeName)&&n.toLowerCase()==="input"&&(s==="checkbox"||s==="radio")}function Ze(n){var s=Ue(n)?"checked":"value",o=Object.getOwnPropertyDescriptor(n.constructor.prototype,s),u=""+n[s];if(!n.hasOwnProperty(s)&&typeof o<"u"&&typeof o.get=="function"&&typeof o.set=="function"){var p=o.get,y=o.set;return Object.defineProperty(n,s,{configurable:!0,get:function(){return p.call(this)},set:function(R){u=""+R,y.call(this,R)}}),Object.defineProperty(n,s,{enumerable:o.enumerable}),{getValue:function(){return u},setValue:function(R){u=""+R},stopTracking:function(){n._valueTracker=null,delete n[s]}}}}function tt(n){n._valueTracker||(n._valueTracker=Ze(n))}function Gt(n){if(!n)return!1;var s=n._valueTracker;if(!s)return!0;var o=s.getValue(),u="";return n&&(u=Ue(n)?n.checked?"true":"false":n.value),n=u,n!==o?(s.setValue(n),!0):!1}function ut(n){if(n=n||(typeof document<"u"?document:void 0),typeof n>"u")return null;try{return n.activeElement||n.body}catch{return n.body}}function Rt(n,s){var o=s.checked;return ce({},s,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:o??n._wrapperState.initialChecked})}function mt(n,s){var o=s.defaultValue==null?"":s.defaultValue,u=s.checked!=null?s.checked:s.defaultChecked;o=ge(s.value!=null?s.value:o),n._wrapperState={initialChecked:u,initialValue:o,controlled:s.type==="checkbox"||s.type==="radio"?s.checked!=null:s.value!=null}}function vt(n,s){s=s.checked,s!=null&&N(n,"checked",s,!1)}function kt(n,s){vt(n,s);var o=ge(s.value),u=s.type;if(o!=null)u==="number"?(o===0&&n.value===""||n.value!=o)&&(n.value=""+o):n.value!==""+o&&(n.value=""+o);else if(u==="submit"||u==="reset"){n.removeAttribute("value");return}s.hasOwnProperty("value")?qt(n,s.type,o):s.hasOwnProperty("defaultValue")&&qt(n,s.type,ge(s.defaultValue)),s.checked==null&&s.defaultChecked!=null&&(n.defaultChecked=!!s.defaultChecked)}function Xt(n,s,o){if(s.hasOwnProperty("value")||s.hasOwnProperty("defaultValue")){var u=s.type;if(!(u!=="submit"&&u!=="reset"||s.value!==void 0&&s.value!==null))return;s=""+n._wrapperState.initialValue,o||s===n.value||(n.value=s),n.defaultValue=s}o=n.name,o!==""&&(n.name=""),n.defaultChecked=!!n._wrapperState.initialChecked,o!==""&&(n.name=o)}function qt(n,s,o){(s!=="number"||ut(n.ownerDocument)!==n)&&(o==null?n.defaultValue=""+n._wrapperState.initialValue:n.defaultValue!==""+o&&(n.defaultValue=""+o))}var $t=Array.isArray;function Et(n,s,o,u){if(n=n.options,s){s={};for(var p=0;p<o.length;p++)s["$"+o[p]]=!0;for(o=0;o<n.length;o++)p=s.hasOwnProperty("$"+n[o].value),n[o].selected!==p&&(n[o].selected=p),p&&u&&(n[o].defaultSelected=!0)}else{for(o=""+ge(o),s=null,p=0;p<n.length;p++){if(n[p].value===o){n[p].selected=!0,u&&(n[p].defaultSelected=!0);return}s!==null||n[p].disabled||(s=n[p])}s!==null&&(s.selected=!0)}}function zt(n,s){if(s.dangerouslySetInnerHTML!=null)throw Error(t(91));return ce({},s,{value:void 0,defaultValue:void 0,children:""+n._wrapperState.initialValue})}function Y(n,s){var o=s.value;if(o==null){if(o=s.children,s=s.defaultValue,o!=null){if(s!=null)throw Error(t(92));if($t(o)){if(1<o.length)throw Error(t(93));o=o[0]}s=o}s==null&&(s=""),o=s}n._wrapperState={initialValue:ge(o)}}function pn(n,s){var o=ge(s.value),u=ge(s.defaultValue);o!=null&&(o=""+o,o!==n.value&&(n.value=o),s.defaultValue==null&&n.defaultValue!==o&&(n.defaultValue=o)),u!=null&&(n.defaultValue=""+u)}function wt(n){var s=n.textContent;s===n._wrapperState.initialValue&&s!==""&&s!==null&&(n.value=s)}function O(n){switch(n){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function T(n,s){return n==null||n==="http://www.w3.org/1999/xhtml"?O(s):n==="http://www.w3.org/2000/svg"&&s==="foreignObject"?"http://www.w3.org/1999/xhtml":n}var I,Q=(function(n){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(s,o,u,p){MSApp.execUnsafeLocalFunction(function(){return n(s,o,u,p)})}:n})(function(n,s){if(n.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in n)n.innerHTML=s;else{for(I=I||document.createElement("div"),I.innerHTML="<svg>"+s.valueOf().toString()+"</svg>",s=I.firstChild;n.firstChild;)n.removeChild(n.firstChild);for(;s.firstChild;)n.appendChild(s.firstChild)}});function me(n,s){if(s){var o=n.firstChild;if(o&&o===n.lastChild&&o.nodeType===3){o.nodeValue=s;return}}n.textContent=s}var Ee={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},Re=["Webkit","ms","Moz","O"];Object.keys(Ee).forEach(function(n){Re.forEach(function(s){s=s+n.charAt(0).toUpperCase()+n.substring(1),Ee[s]=Ee[n]})});function xe(n,s,o){return s==null||typeof s=="boolean"||s===""?"":o||typeof s!="number"||s===0||Ee.hasOwnProperty(n)&&Ee[n]?(""+s).trim():s+"px"}function ve(n,s){n=n.style;for(var o in s)if(s.hasOwnProperty(o)){var u=o.indexOf("--")===0,p=xe(o,s[o],u);o==="float"&&(o="cssFloat"),u?n.setProperty(o,p):n[o]=p}}var Ie=ce({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function We(n,s){if(s){if(Ie[n]&&(s.children!=null||s.dangerouslySetInnerHTML!=null))throw Error(t(137,n));if(s.dangerouslySetInnerHTML!=null){if(s.children!=null)throw Error(t(60));if(typeof s.dangerouslySetInnerHTML!="object"||!("__html"in s.dangerouslySetInnerHTML))throw Error(t(61))}if(s.style!=null&&typeof s.style!="object")throw Error(t(62))}}function ne(n,s){if(n.indexOf("-")===-1)return typeof s.is=="string";switch(n){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Se=null;function Oe(n){return n=n.target||n.srcElement||window,n.correspondingUseElement&&(n=n.correspondingUseElement),n.nodeType===3?n.parentNode:n}var nt=null,st=null,$=null;function Pe(n){if(n=cl(n)){if(typeof nt!="function")throw Error(t(280));var s=n.stateNode;s&&(s=bc(s),nt(n.stateNode,n.type,s))}}function _e(n){st?$?$.push(n):$=[n]:st=n}function De(){if(st){var n=st,s=$;if($=st=null,Pe(n),s)for(n=0;n<s.length;n++)Pe(s[n])}}function Fe(n,s){return n(s)}function Me(){}var Ye=!1;function $e(n,s,o){if(Ye)return n(s,o);Ye=!0;try{return Fe(n,s,o)}finally{Ye=!1,(st!==null||$!==null)&&(Me(),De())}}function jt(n,s){var o=n.stateNode;if(o===null)return null;var u=bc(o);if(u===null)return null;o=u[s];e:switch(s){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(u=!u.disabled)||(n=n.type,u=!(n==="button"||n==="input"||n==="select"||n==="textarea")),n=!u;break e;default:n=!1}if(n)return null;if(o&&typeof o!="function")throw Error(t(231,s,typeof o));return o}var Ut=!1;if(d)try{var On={};Object.defineProperty(On,"passive",{get:function(){Ut=!0}}),window.addEventListener("test",On,On),window.removeEventListener("test",On,On)}catch{Ut=!1}function wi(n,s,o,u,p,y,R,H,W){var pe=Array.prototype.slice.call(arguments,3);try{s.apply(o,pe)}catch(be){this.onError(be)}}var zs=!1,Ca=null,Bs=!1,Hs=null,Ed={onError:function(n){zs=!0,Ca=n}};function oc(n,s,o,u,p,y,R,H,W){zs=!1,Ca=null,wi.apply(Ed,arguments)}function lc(n,s,o,u,p,y,R,H,W){if(oc.apply(this,arguments),zs){if(zs){var pe=Ca;zs=!1,Ca=null}else throw Error(t(198));Bs||(Bs=!0,Hs=pe)}}function $n(n){var s=n,o=n;if(n.alternate)for(;s.return;)s=s.return;else{n=s;do s=n,(s.flags&4098)!==0&&(o=s.return),n=s.return;while(n)}return s.tag===3?o:null}function Ra(n){if(n.tag===13){var s=n.memoizedState;if(s===null&&(n=n.alternate,n!==null&&(s=n.memoizedState)),s!==null)return s.dehydrated}return null}function Go(n){if($n(n)!==n)throw Error(t(188))}function cc(n){var s=n.alternate;if(!s){if(s=$n(n),s===null)throw Error(t(188));return s!==n?null:n}for(var o=n,u=s;;){var p=o.return;if(p===null)break;var y=p.alternate;if(y===null){if(u=p.return,u!==null){o=u;continue}break}if(p.child===y.child){for(y=p.child;y;){if(y===o)return Go(p),n;if(y===u)return Go(p),s;y=y.sibling}throw Error(t(188))}if(o.return!==u.return)o=p,u=y;else{for(var R=!1,H=p.child;H;){if(H===o){R=!0,o=p,u=y;break}if(H===u){R=!0,u=p,o=y;break}H=H.sibling}if(!R){for(H=y.child;H;){if(H===o){R=!0,o=y,u=p;break}if(H===u){R=!0,u=y,o=p;break}H=H.sibling}if(!R)throw Error(t(189))}}if(o.alternate!==u)throw Error(t(190))}if(o.tag!==3)throw Error(t(188));return o.stateNode.current===o?n:s}function Vs(n){return n=cc(n),n!==null?jo(n):null}function jo(n){if(n.tag===5||n.tag===6)return n;for(n=n.child;n!==null;){var s=jo(n);if(s!==null)return s;n=n.sibling}return null}var Gs=e.unstable_scheduleCallback,Wo=e.unstable_cancelCallback,uc=e.unstable_shouldYield,wd=e.unstable_requestPaint,on=e.unstable_now,bd=e.unstable_getCurrentPriorityLevel,Xo=e.unstable_ImmediatePriority,A=e.unstable_UserBlockingPriority,J=e.unstable_NormalPriority,fe=e.unstable_LowPriority,oe=e.unstable_IdlePriority,se=null,Ne=null;function je(n){if(Ne&&typeof Ne.onCommitFiberRoot=="function")try{Ne.onCommitFiberRoot(se,n,void 0,(n.current.flags&128)===128)}catch{}}var Ae=Math.clz32?Math.clz32:ht,Ke=Math.log,it=Math.LN2;function ht(n){return n>>>=0,n===0?32:31-(Ke(n)/it|0)|0}var ft=64,Je=4194304;function Nt(n){switch(n&-n){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return n&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return n&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return n}}function Yt(n,s){var o=n.pendingLanes;if(o===0)return 0;var u=0,p=n.suspendedLanes,y=n.pingedLanes,R=o&268435455;if(R!==0){var H=R&~p;H!==0?u=Nt(H):(y&=R,y!==0&&(u=Nt(y)))}else R=o&~p,R!==0?u=Nt(R):y!==0&&(u=Nt(y));if(u===0)return 0;if(s!==0&&s!==u&&(s&p)===0&&(p=u&-u,y=s&-s,p>=y||p===16&&(y&4194240)!==0))return s;if((u&4)!==0&&(u|=o&16),s=n.entangledLanes,s!==0)for(n=n.entanglements,s&=u;0<s;)o=31-Ae(s),p=1<<o,u|=n[o],s&=~p;return u}function tn(n,s){switch(n){case 1:case 2:case 4:return s+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return s+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function Bt(n,s){for(var o=n.suspendedLanes,u=n.pingedLanes,p=n.expirationTimes,y=n.pendingLanes;0<y;){var R=31-Ae(y),H=1<<R,W=p[R];W===-1?((H&o)===0||(H&u)!==0)&&(p[R]=tn(H,s)):W<=s&&(n.expiredLanes|=H),y&=~H}}function gn(n){return n=n.pendingLanes&-1073741825,n!==0?n:n&1073741824?1073741824:0}function He(){var n=ft;return ft<<=1,(ft&4194240)===0&&(ft=64),n}function Nn(n){for(var s=[],o=0;31>o;o++)s.push(n);return s}function yt(n,s,o){n.pendingLanes|=s,s!==536870912&&(n.suspendedLanes=0,n.pingedLanes=0),n=n.eventTimes,s=31-Ae(s),n[s]=o}function ei(n,s){var o=n.pendingLanes&~s;n.pendingLanes=s,n.suspendedLanes=0,n.pingedLanes=0,n.expiredLanes&=s,n.mutableReadLanes&=s,n.entangledLanes&=s,s=n.entanglements;var u=n.eventTimes;for(n=n.expirationTimes;0<o;){var p=31-Ae(o),y=1<<p;s[p]=0,u[p]=-1,n[p]=-1,o&=~y}}function ti(n,s){var o=n.entangledLanes|=s;for(n=n.entanglements;o;){var u=31-Ae(o),p=1<<u;p&s|n[u]&s&&(n[u]|=s),o&=~p}}var St=0;function Mr(n){return n&=-n,1<n?4<n?(n&268435455)!==0?16:536870912:4:1}var Ft,Qt,Fi,Ht,Oi,tr=!1,js=[],Qr=null,Zr=null,Jr=null,$o=new Map,qo=new Map,es=[],Oy="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function Km(n,s){switch(n){case"focusin":case"focusout":Qr=null;break;case"dragenter":case"dragleave":Zr=null;break;case"mouseover":case"mouseout":Jr=null;break;case"pointerover":case"pointerout":$o.delete(s.pointerId);break;case"gotpointercapture":case"lostpointercapture":qo.delete(s.pointerId)}}function Yo(n,s,o,u,p,y){return n===null||n.nativeEvent!==y?(n={blockedOn:s,domEventName:o,eventSystemFlags:u,nativeEvent:y,targetContainers:[p]},s!==null&&(s=cl(s),s!==null&&Qt(s)),n):(n.eventSystemFlags|=u,s=n.targetContainers,p!==null&&s.indexOf(p)===-1&&s.push(p),n)}function ky(n,s,o,u,p){switch(s){case"focusin":return Qr=Yo(Qr,n,s,o,u,p),!0;case"dragenter":return Zr=Yo(Zr,n,s,o,u,p),!0;case"mouseover":return Jr=Yo(Jr,n,s,o,u,p),!0;case"pointerover":var y=p.pointerId;return $o.set(y,Yo($o.get(y)||null,n,s,o,u,p)),!0;case"gotpointercapture":return y=p.pointerId,qo.set(y,Yo(qo.get(y)||null,n,s,o,u,p)),!0}return!1}function Qm(n){var s=Ws(n.target);if(s!==null){var o=$n(s);if(o!==null){if(s=o.tag,s===13){if(s=Ra(o),s!==null){n.blockedOn=s,Oi(n.priority,function(){Fi(o)});return}}else if(s===3&&o.stateNode.current.memoizedState.isDehydrated){n.blockedOn=o.tag===3?o.stateNode.containerInfo:null;return}}}n.blockedOn=null}function dc(n){if(n.blockedOn!==null)return!1;for(var s=n.targetContainers;0<s.length;){var o=Cd(n.domEventName,n.eventSystemFlags,s[0],n.nativeEvent);if(o===null){o=n.nativeEvent;var u=new o.constructor(o.type,o);Se=u,o.target.dispatchEvent(u),Se=null}else return s=cl(o),s!==null&&Qt(s),n.blockedOn=o,!1;s.shift()}return!0}function Zm(n,s,o){dc(n)&&o.delete(s)}function zy(){tr=!1,Qr!==null&&dc(Qr)&&(Qr=null),Zr!==null&&dc(Zr)&&(Zr=null),Jr!==null&&dc(Jr)&&(Jr=null),$o.forEach(Zm),qo.forEach(Zm)}function Ko(n,s){n.blockedOn===s&&(n.blockedOn=null,tr||(tr=!0,e.unstable_scheduleCallback(e.unstable_NormalPriority,zy)))}function Qo(n){function s(p){return Ko(p,n)}if(0<js.length){Ko(js[0],n);for(var o=1;o<js.length;o++){var u=js[o];u.blockedOn===n&&(u.blockedOn=null)}}for(Qr!==null&&Ko(Qr,n),Zr!==null&&Ko(Zr,n),Jr!==null&&Ko(Jr,n),$o.forEach(s),qo.forEach(s),o=0;o<es.length;o++)u=es[o],u.blockedOn===n&&(u.blockedOn=null);for(;0<es.length&&(o=es[0],o.blockedOn===null);)Qm(o),o.blockedOn===null&&es.shift()}var Aa=C.ReactCurrentBatchConfig,hc=!0;function By(n,s,o,u){var p=St,y=Aa.transition;Aa.transition=null;try{St=1,Td(n,s,o,u)}finally{St=p,Aa.transition=y}}function Hy(n,s,o,u){var p=St,y=Aa.transition;Aa.transition=null;try{St=4,Td(n,s,o,u)}finally{St=p,Aa.transition=y}}function Td(n,s,o,u){if(hc){var p=Cd(n,s,o,u);if(p===null)jd(n,s,u,fc,o),Km(n,u);else if(ky(p,n,s,o,u))u.stopPropagation();else if(Km(n,u),s&4&&-1<Oy.indexOf(n)){for(;p!==null;){var y=cl(p);if(y!==null&&Ft(y),y=Cd(n,s,o,u),y===null&&jd(n,s,u,fc,o),y===p)break;p=y}p!==null&&u.stopPropagation()}else jd(n,s,u,null,o)}}var fc=null;function Cd(n,s,o,u){if(fc=null,n=Oe(u),n=Ws(n),n!==null)if(s=$n(n),s===null)n=null;else if(o=s.tag,o===13){if(n=Ra(s),n!==null)return n;n=null}else if(o===3){if(s.stateNode.current.memoizedState.isDehydrated)return s.tag===3?s.stateNode.containerInfo:null;n=null}else s!==n&&(n=null);return fc=n,null}function Jm(n){switch(n){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(bd()){case Xo:return 1;case A:return 4;case J:case fe:return 16;case oe:return 536870912;default:return 16}default:return 16}}var ts=null,Rd=null,pc=null;function eg(){if(pc)return pc;var n,s=Rd,o=s.length,u,p="value"in ts?ts.value:ts.textContent,y=p.length;for(n=0;n<o&&s[n]===p[n];n++);var R=o-n;for(u=1;u<=R&&s[o-u]===p[y-u];u++);return pc=p.slice(n,1<u?1-u:void 0)}function mc(n){var s=n.keyCode;return"charCode"in n?(n=n.charCode,n===0&&s===13&&(n=13)):n=s,n===10&&(n=13),32<=n||n===13?n:0}function gc(){return!0}function tg(){return!1}function fi(n){function s(o,u,p,y,R){this._reactName=o,this._targetInst=p,this.type=u,this.nativeEvent=y,this.target=R,this.currentTarget=null;for(var H in n)n.hasOwnProperty(H)&&(o=n[H],this[H]=o?o(y):y[H]);return this.isDefaultPrevented=(y.defaultPrevented!=null?y.defaultPrevented:y.returnValue===!1)?gc:tg,this.isPropagationStopped=tg,this}return ce(s.prototype,{preventDefault:function(){this.defaultPrevented=!0;var o=this.nativeEvent;o&&(o.preventDefault?o.preventDefault():typeof o.returnValue!="unknown"&&(o.returnValue=!1),this.isDefaultPrevented=gc)},stopPropagation:function(){var o=this.nativeEvent;o&&(o.stopPropagation?o.stopPropagation():typeof o.cancelBubble!="unknown"&&(o.cancelBubble=!0),this.isPropagationStopped=gc)},persist:function(){},isPersistent:gc}),s}var Pa={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(n){return n.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Ad=fi(Pa),Zo=ce({},Pa,{view:0,detail:0}),Vy=fi(Zo),Pd,Nd,Jo,xc=ce({},Zo,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Dd,button:0,buttons:0,relatedTarget:function(n){return n.relatedTarget===void 0?n.fromElement===n.srcElement?n.toElement:n.fromElement:n.relatedTarget},movementX:function(n){return"movementX"in n?n.movementX:(n!==Jo&&(Jo&&n.type==="mousemove"?(Pd=n.screenX-Jo.screenX,Nd=n.screenY-Jo.screenY):Nd=Pd=0,Jo=n),Pd)},movementY:function(n){return"movementY"in n?n.movementY:Nd}}),ng=fi(xc),Gy=ce({},xc,{dataTransfer:0}),jy=fi(Gy),Wy=ce({},Zo,{relatedTarget:0}),Ld=fi(Wy),Xy=ce({},Pa,{animationName:0,elapsedTime:0,pseudoElement:0}),$y=fi(Xy),qy=ce({},Pa,{clipboardData:function(n){return"clipboardData"in n?n.clipboardData:window.clipboardData}}),Yy=fi(qy),Ky=ce({},Pa,{data:0}),ig=fi(Ky),Qy={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},Zy={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},Jy={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function eS(n){var s=this.nativeEvent;return s.getModifierState?s.getModifierState(n):(n=Jy[n])?!!s[n]:!1}function Dd(){return eS}var tS=ce({},Zo,{key:function(n){if(n.key){var s=Qy[n.key]||n.key;if(s!=="Unidentified")return s}return n.type==="keypress"?(n=mc(n),n===13?"Enter":String.fromCharCode(n)):n.type==="keydown"||n.type==="keyup"?Zy[n.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Dd,charCode:function(n){return n.type==="keypress"?mc(n):0},keyCode:function(n){return n.type==="keydown"||n.type==="keyup"?n.keyCode:0},which:function(n){return n.type==="keypress"?mc(n):n.type==="keydown"||n.type==="keyup"?n.keyCode:0}}),nS=fi(tS),iS=ce({},xc,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),rg=fi(iS),rS=ce({},Zo,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Dd}),sS=fi(rS),aS=ce({},Pa,{propertyName:0,elapsedTime:0,pseudoElement:0}),oS=fi(aS),lS=ce({},xc,{deltaX:function(n){return"deltaX"in n?n.deltaX:"wheelDeltaX"in n?-n.wheelDeltaX:0},deltaY:function(n){return"deltaY"in n?n.deltaY:"wheelDeltaY"in n?-n.wheelDeltaY:"wheelDelta"in n?-n.wheelDelta:0},deltaZ:0,deltaMode:0}),cS=fi(lS),uS=[9,13,27,32],Id=d&&"CompositionEvent"in window,el=null;d&&"documentMode"in document&&(el=document.documentMode);var dS=d&&"TextEvent"in window&&!el,sg=d&&(!Id||el&&8<el&&11>=el),ag=" ",og=!1;function lg(n,s){switch(n){case"keyup":return uS.indexOf(s.keyCode)!==-1;case"keydown":return s.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function cg(n){return n=n.detail,typeof n=="object"&&"data"in n?n.data:null}var Na=!1;function hS(n,s){switch(n){case"compositionend":return cg(s);case"keypress":return s.which!==32?null:(og=!0,ag);case"textInput":return n=s.data,n===ag&&og?null:n;default:return null}}function fS(n,s){if(Na)return n==="compositionend"||!Id&&lg(n,s)?(n=eg(),pc=Rd=ts=null,Na=!1,n):null;switch(n){case"paste":return null;case"keypress":if(!(s.ctrlKey||s.altKey||s.metaKey)||s.ctrlKey&&s.altKey){if(s.char&&1<s.char.length)return s.char;if(s.which)return String.fromCharCode(s.which)}return null;case"compositionend":return sg&&s.locale!=="ko"?null:s.data;default:return null}}var pS={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function ug(n){var s=n&&n.nodeName&&n.nodeName.toLowerCase();return s==="input"?!!pS[n.type]:s==="textarea"}function dg(n,s,o,u){_e(u),s=Mc(s,"onChange"),0<s.length&&(o=new Ad("onChange","change",null,o,u),n.push({event:o,listeners:s}))}var tl=null,nl=null;function mS(n){Ag(n,0)}function vc(n){var s=Fa(n);if(Gt(s))return n}function gS(n,s){if(n==="change")return s}var hg=!1;if(d){var Ud;if(d){var Fd="oninput"in document;if(!Fd){var fg=document.createElement("div");fg.setAttribute("oninput","return;"),Fd=typeof fg.oninput=="function"}Ud=Fd}else Ud=!1;hg=Ud&&(!document.documentMode||9<document.documentMode)}function pg(){tl&&(tl.detachEvent("onpropertychange",mg),nl=tl=null)}function mg(n){if(n.propertyName==="value"&&vc(nl)){var s=[];dg(s,nl,n,Oe(n)),$e(mS,s)}}function xS(n,s,o){n==="focusin"?(pg(),tl=s,nl=o,tl.attachEvent("onpropertychange",mg)):n==="focusout"&&pg()}function vS(n){if(n==="selectionchange"||n==="keyup"||n==="keydown")return vc(nl)}function _S(n,s){if(n==="click")return vc(s)}function yS(n,s){if(n==="input"||n==="change")return vc(s)}function SS(n,s){return n===s&&(n!==0||1/n===1/s)||n!==n&&s!==s}var ki=typeof Object.is=="function"?Object.is:SS;function il(n,s){if(ki(n,s))return!0;if(typeof n!="object"||n===null||typeof s!="object"||s===null)return!1;var o=Object.keys(n),u=Object.keys(s);if(o.length!==u.length)return!1;for(u=0;u<o.length;u++){var p=o[u];if(!h.call(s,p)||!ki(n[p],s[p]))return!1}return!0}function gg(n){for(;n&&n.firstChild;)n=n.firstChild;return n}function xg(n,s){var o=gg(n);n=0;for(var u;o;){if(o.nodeType===3){if(u=n+o.textContent.length,n<=s&&u>=s)return{node:o,offset:s-n};n=u}e:{for(;o;){if(o.nextSibling){o=o.nextSibling;break e}o=o.parentNode}o=void 0}o=gg(o)}}function vg(n,s){return n&&s?n===s?!0:n&&n.nodeType===3?!1:s&&s.nodeType===3?vg(n,s.parentNode):"contains"in n?n.contains(s):n.compareDocumentPosition?!!(n.compareDocumentPosition(s)&16):!1:!1}function _g(){for(var n=window,s=ut();s instanceof n.HTMLIFrameElement;){try{var o=typeof s.contentWindow.location.href=="string"}catch{o=!1}if(o)n=s.contentWindow;else break;s=ut(n.document)}return s}function Od(n){var s=n&&n.nodeName&&n.nodeName.toLowerCase();return s&&(s==="input"&&(n.type==="text"||n.type==="search"||n.type==="tel"||n.type==="url"||n.type==="password")||s==="textarea"||n.contentEditable==="true")}function MS(n){var s=_g(),o=n.focusedElem,u=n.selectionRange;if(s!==o&&o&&o.ownerDocument&&vg(o.ownerDocument.documentElement,o)){if(u!==null&&Od(o)){if(s=u.start,n=u.end,n===void 0&&(n=s),"selectionStart"in o)o.selectionStart=s,o.selectionEnd=Math.min(n,o.value.length);else if(n=(s=o.ownerDocument||document)&&s.defaultView||window,n.getSelection){n=n.getSelection();var p=o.textContent.length,y=Math.min(u.start,p);u=u.end===void 0?y:Math.min(u.end,p),!n.extend&&y>u&&(p=u,u=y,y=p),p=xg(o,y);var R=xg(o,u);p&&R&&(n.rangeCount!==1||n.anchorNode!==p.node||n.anchorOffset!==p.offset||n.focusNode!==R.node||n.focusOffset!==R.offset)&&(s=s.createRange(),s.setStart(p.node,p.offset),n.removeAllRanges(),y>u?(n.addRange(s),n.extend(R.node,R.offset)):(s.setEnd(R.node,R.offset),n.addRange(s)))}}for(s=[],n=o;n=n.parentNode;)n.nodeType===1&&s.push({element:n,left:n.scrollLeft,top:n.scrollTop});for(typeof o.focus=="function"&&o.focus(),o=0;o<s.length;o++)n=s[o],n.element.scrollLeft=n.left,n.element.scrollTop=n.top}}var ES=d&&"documentMode"in document&&11>=document.documentMode,La=null,kd=null,rl=null,zd=!1;function yg(n,s,o){var u=o.window===o?o.document:o.nodeType===9?o:o.ownerDocument;zd||La==null||La!==ut(u)||(u=La,"selectionStart"in u&&Od(u)?u={start:u.selectionStart,end:u.selectionEnd}:(u=(u.ownerDocument&&u.ownerDocument.defaultView||window).getSelection(),u={anchorNode:u.anchorNode,anchorOffset:u.anchorOffset,focusNode:u.focusNode,focusOffset:u.focusOffset}),rl&&il(rl,u)||(rl=u,u=Mc(kd,"onSelect"),0<u.length&&(s=new Ad("onSelect","select",null,s,o),n.push({event:s,listeners:u}),s.target=La)))}function _c(n,s){var o={};return o[n.toLowerCase()]=s.toLowerCase(),o["Webkit"+n]="webkit"+s,o["Moz"+n]="moz"+s,o}var Da={animationend:_c("Animation","AnimationEnd"),animationiteration:_c("Animation","AnimationIteration"),animationstart:_c("Animation","AnimationStart"),transitionend:_c("Transition","TransitionEnd")},Bd={},Sg={};d&&(Sg=document.createElement("div").style,"AnimationEvent"in window||(delete Da.animationend.animation,delete Da.animationiteration.animation,delete Da.animationstart.animation),"TransitionEvent"in window||delete Da.transitionend.transition);function yc(n){if(Bd[n])return Bd[n];if(!Da[n])return n;var s=Da[n],o;for(o in s)if(s.hasOwnProperty(o)&&o in Sg)return Bd[n]=s[o];return n}var Mg=yc("animationend"),Eg=yc("animationiteration"),wg=yc("animationstart"),bg=yc("transitionend"),Tg=new Map,Cg="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function ns(n,s){Tg.set(n,s),l(s,[n])}for(var Hd=0;Hd<Cg.length;Hd++){var Vd=Cg[Hd],wS=Vd.toLowerCase(),bS=Vd[0].toUpperCase()+Vd.slice(1);ns(wS,"on"+bS)}ns(Mg,"onAnimationEnd"),ns(Eg,"onAnimationIteration"),ns(wg,"onAnimationStart"),ns("dblclick","onDoubleClick"),ns("focusin","onFocus"),ns("focusout","onBlur"),ns(bg,"onTransitionEnd"),c("onMouseEnter",["mouseout","mouseover"]),c("onMouseLeave",["mouseout","mouseover"]),c("onPointerEnter",["pointerout","pointerover"]),c("onPointerLeave",["pointerout","pointerover"]),l("onChange","change click focusin focusout input keydown keyup selectionchange".split(" ")),l("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),l("onBeforeInput",["compositionend","keypress","textInput","paste"]),l("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" ")),l("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" ")),l("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var sl="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),TS=new Set("cancel close invalid load scroll toggle".split(" ").concat(sl));function Rg(n,s,o){var u=n.type||"unknown-event";n.currentTarget=o,lc(u,s,void 0,n),n.currentTarget=null}function Ag(n,s){s=(s&4)!==0;for(var o=0;o<n.length;o++){var u=n[o],p=u.event;u=u.listeners;e:{var y=void 0;if(s)for(var R=u.length-1;0<=R;R--){var H=u[R],W=H.instance,pe=H.currentTarget;if(H=H.listener,W!==y&&p.isPropagationStopped())break e;Rg(p,H,pe),y=W}else for(R=0;R<u.length;R++){if(H=u[R],W=H.instance,pe=H.currentTarget,H=H.listener,W!==y&&p.isPropagationStopped())break e;Rg(p,H,pe),y=W}}}if(Bs)throw n=Hs,Bs=!1,Hs=null,n}function Zt(n,s){var o=s[Kd];o===void 0&&(o=s[Kd]=new Set);var u=n+"__bubble";o.has(u)||(Pg(s,n,2,!1),o.add(u))}function Gd(n,s,o){var u=0;s&&(u|=4),Pg(o,n,u,s)}var Sc="_reactListening"+Math.random().toString(36).slice(2);function al(n){if(!n[Sc]){n[Sc]=!0,r.forEach(function(o){o!=="selectionchange"&&(TS.has(o)||Gd(o,!1,n),Gd(o,!0,n))});var s=n.nodeType===9?n:n.ownerDocument;s===null||s[Sc]||(s[Sc]=!0,Gd("selectionchange",!1,s))}}function Pg(n,s,o,u){switch(Jm(s)){case 1:var p=By;break;case 4:p=Hy;break;default:p=Td}o=p.bind(null,s,o,n),p=void 0,!Ut||s!=="touchstart"&&s!=="touchmove"&&s!=="wheel"||(p=!0),u?p!==void 0?n.addEventListener(s,o,{capture:!0,passive:p}):n.addEventListener(s,o,!0):p!==void 0?n.addEventListener(s,o,{passive:p}):n.addEventListener(s,o,!1)}function jd(n,s,o,u,p){var y=u;if((s&1)===0&&(s&2)===0&&u!==null)e:for(;;){if(u===null)return;var R=u.tag;if(R===3||R===4){var H=u.stateNode.containerInfo;if(H===p||H.nodeType===8&&H.parentNode===p)break;if(R===4)for(R=u.return;R!==null;){var W=R.tag;if((W===3||W===4)&&(W=R.stateNode.containerInfo,W===p||W.nodeType===8&&W.parentNode===p))return;R=R.return}for(;H!==null;){if(R=Ws(H),R===null)return;if(W=R.tag,W===5||W===6){u=y=R;continue e}H=H.parentNode}}u=u.return}$e(function(){var pe=y,be=Oe(o),Te=[];e:{var we=Tg.get(n);if(we!==void 0){var Ve=Ad,qe=n;switch(n){case"keypress":if(mc(o)===0)break e;case"keydown":case"keyup":Ve=nS;break;case"focusin":qe="focus",Ve=Ld;break;case"focusout":qe="blur",Ve=Ld;break;case"beforeblur":case"afterblur":Ve=Ld;break;case"click":if(o.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":Ve=ng;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":Ve=jy;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":Ve=sS;break;case Mg:case Eg:case wg:Ve=$y;break;case bg:Ve=oS;break;case"scroll":Ve=Vy;break;case"wheel":Ve=cS;break;case"copy":case"cut":case"paste":Ve=Yy;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":Ve=rg}var Qe=(s&4)!==0,mn=!Qe&&n==="scroll",ie=Qe?we!==null?we+"Capture":null:we;Qe=[];for(var K=pe,ue;K!==null;){ue=K;var Ce=ue.stateNode;if(ue.tag===5&&Ce!==null&&(ue=Ce,ie!==null&&(Ce=jt(K,ie),Ce!=null&&Qe.push(ol(K,Ce,ue)))),mn)break;K=K.return}0<Qe.length&&(we=new Ve(we,qe,null,o,be),Te.push({event:we,listeners:Qe}))}}if((s&7)===0){e:{if(we=n==="mouseover"||n==="pointerover",Ve=n==="mouseout"||n==="pointerout",we&&o!==Se&&(qe=o.relatedTarget||o.fromElement)&&(Ws(qe)||qe[Er]))break e;if((Ve||we)&&(we=be.window===be?be:(we=be.ownerDocument)?we.defaultView||we.parentWindow:window,Ve?(qe=o.relatedTarget||o.toElement,Ve=pe,qe=qe?Ws(qe):null,qe!==null&&(mn=$n(qe),qe!==mn||qe.tag!==5&&qe.tag!==6)&&(qe=null)):(Ve=null,qe=pe),Ve!==qe)){if(Qe=ng,Ce="onMouseLeave",ie="onMouseEnter",K="mouse",(n==="pointerout"||n==="pointerover")&&(Qe=rg,Ce="onPointerLeave",ie="onPointerEnter",K="pointer"),mn=Ve==null?we:Fa(Ve),ue=qe==null?we:Fa(qe),we=new Qe(Ce,K+"leave",Ve,o,be),we.target=mn,we.relatedTarget=ue,Ce=null,Ws(be)===pe&&(Qe=new Qe(ie,K+"enter",qe,o,be),Qe.target=ue,Qe.relatedTarget=mn,Ce=Qe),mn=Ce,Ve&&qe)t:{for(Qe=Ve,ie=qe,K=0,ue=Qe;ue;ue=Ia(ue))K++;for(ue=0,Ce=ie;Ce;Ce=Ia(Ce))ue++;for(;0<K-ue;)Qe=Ia(Qe),K--;for(;0<ue-K;)ie=Ia(ie),ue--;for(;K--;){if(Qe===ie||ie!==null&&Qe===ie.alternate)break t;Qe=Ia(Qe),ie=Ia(ie)}Qe=null}else Qe=null;Ve!==null&&Ng(Te,we,Ve,Qe,!1),qe!==null&&mn!==null&&Ng(Te,mn,qe,Qe,!0)}}e:{if(we=pe?Fa(pe):window,Ve=we.nodeName&&we.nodeName.toLowerCase(),Ve==="select"||Ve==="input"&&we.type==="file")var et=gS;else if(ug(we))if(hg)et=yS;else{et=vS;var at=xS}else(Ve=we.nodeName)&&Ve.toLowerCase()==="input"&&(we.type==="checkbox"||we.type==="radio")&&(et=_S);if(et&&(et=et(n,pe))){dg(Te,et,o,be);break e}at&&at(n,we,pe),n==="focusout"&&(at=we._wrapperState)&&at.controlled&&we.type==="number"&&qt(we,"number",we.value)}switch(at=pe?Fa(pe):window,n){case"focusin":(ug(at)||at.contentEditable==="true")&&(La=at,kd=pe,rl=null);break;case"focusout":rl=kd=La=null;break;case"mousedown":zd=!0;break;case"contextmenu":case"mouseup":case"dragend":zd=!1,yg(Te,o,be);break;case"selectionchange":if(ES)break;case"keydown":case"keyup":yg(Te,o,be)}var ot;if(Id)e:{switch(n){case"compositionstart":var ct="onCompositionStart";break e;case"compositionend":ct="onCompositionEnd";break e;case"compositionupdate":ct="onCompositionUpdate";break e}ct=void 0}else Na?lg(n,o)&&(ct="onCompositionEnd"):n==="keydown"&&o.keyCode===229&&(ct="onCompositionStart");ct&&(sg&&o.locale!=="ko"&&(Na||ct!=="onCompositionStart"?ct==="onCompositionEnd"&&Na&&(ot=eg()):(ts=be,Rd="value"in ts?ts.value:ts.textContent,Na=!0)),at=Mc(pe,ct),0<at.length&&(ct=new ig(ct,n,null,o,be),Te.push({event:ct,listeners:at}),ot?ct.data=ot:(ot=cg(o),ot!==null&&(ct.data=ot)))),(ot=dS?hS(n,o):fS(n,o))&&(pe=Mc(pe,"onBeforeInput"),0<pe.length&&(be=new ig("onBeforeInput","beforeinput",null,o,be),Te.push({event:be,listeners:pe}),be.data=ot))}Ag(Te,s)})}function ol(n,s,o){return{instance:n,listener:s,currentTarget:o}}function Mc(n,s){for(var o=s+"Capture",u=[];n!==null;){var p=n,y=p.stateNode;p.tag===5&&y!==null&&(p=y,y=jt(n,o),y!=null&&u.unshift(ol(n,y,p)),y=jt(n,s),y!=null&&u.push(ol(n,y,p))),n=n.return}return u}function Ia(n){if(n===null)return null;do n=n.return;while(n&&n.tag!==5);return n||null}function Ng(n,s,o,u,p){for(var y=s._reactName,R=[];o!==null&&o!==u;){var H=o,W=H.alternate,pe=H.stateNode;if(W!==null&&W===u)break;H.tag===5&&pe!==null&&(H=pe,p?(W=jt(o,y),W!=null&&R.unshift(ol(o,W,H))):p||(W=jt(o,y),W!=null&&R.push(ol(o,W,H)))),o=o.return}R.length!==0&&n.push({event:s,listeners:R})}var CS=/\r\n?/g,RS=/\u0000|\uFFFD/g;function Lg(n){return(typeof n=="string"?n:""+n).replace(CS,`
`).replace(RS,"")}function Ec(n,s,o){if(s=Lg(s),Lg(n)!==s&&o)throw Error(t(425))}function wc(){}var Wd=null,Xd=null;function $d(n,s){return n==="textarea"||n==="noscript"||typeof s.children=="string"||typeof s.children=="number"||typeof s.dangerouslySetInnerHTML=="object"&&s.dangerouslySetInnerHTML!==null&&s.dangerouslySetInnerHTML.__html!=null}var qd=typeof setTimeout=="function"?setTimeout:void 0,AS=typeof clearTimeout=="function"?clearTimeout:void 0,Dg=typeof Promise=="function"?Promise:void 0,PS=typeof queueMicrotask=="function"?queueMicrotask:typeof Dg<"u"?function(n){return Dg.resolve(null).then(n).catch(NS)}:qd;function NS(n){setTimeout(function(){throw n})}function Yd(n,s){var o=s,u=0;do{var p=o.nextSibling;if(n.removeChild(o),p&&p.nodeType===8)if(o=p.data,o==="/$"){if(u===0){n.removeChild(p),Qo(s);return}u--}else o!=="$"&&o!=="$?"&&o!=="$!"||u++;o=p}while(o);Qo(s)}function is(n){for(;n!=null;n=n.nextSibling){var s=n.nodeType;if(s===1||s===3)break;if(s===8){if(s=n.data,s==="$"||s==="$!"||s==="$?")break;if(s==="/$")return null}}return n}function Ig(n){n=n.previousSibling;for(var s=0;n;){if(n.nodeType===8){var o=n.data;if(o==="$"||o==="$!"||o==="$?"){if(s===0)return n;s--}else o==="/$"&&s++}n=n.previousSibling}return null}var Ua=Math.random().toString(36).slice(2),nr="__reactFiber$"+Ua,ll="__reactProps$"+Ua,Er="__reactContainer$"+Ua,Kd="__reactEvents$"+Ua,LS="__reactListeners$"+Ua,DS="__reactHandles$"+Ua;function Ws(n){var s=n[nr];if(s)return s;for(var o=n.parentNode;o;){if(s=o[Er]||o[nr]){if(o=s.alternate,s.child!==null||o!==null&&o.child!==null)for(n=Ig(n);n!==null;){if(o=n[nr])return o;n=Ig(n)}return s}n=o,o=n.parentNode}return null}function cl(n){return n=n[nr]||n[Er],!n||n.tag!==5&&n.tag!==6&&n.tag!==13&&n.tag!==3?null:n}function Fa(n){if(n.tag===5||n.tag===6)return n.stateNode;throw Error(t(33))}function bc(n){return n[ll]||null}var Qd=[],Oa=-1;function rs(n){return{current:n}}function Jt(n){0>Oa||(n.current=Qd[Oa],Qd[Oa]=null,Oa--)}function Kt(n,s){Oa++,Qd[Oa]=n.current,n.current=s}var ss={},kn=rs(ss),ni=rs(!1),Xs=ss;function ka(n,s){var o=n.type.contextTypes;if(!o)return ss;var u=n.stateNode;if(u&&u.__reactInternalMemoizedUnmaskedChildContext===s)return u.__reactInternalMemoizedMaskedChildContext;var p={},y;for(y in o)p[y]=s[y];return u&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=s,n.__reactInternalMemoizedMaskedChildContext=p),p}function ii(n){return n=n.childContextTypes,n!=null}function Tc(){Jt(ni),Jt(kn)}function Ug(n,s,o){if(kn.current!==ss)throw Error(t(168));Kt(kn,s),Kt(ni,o)}function Fg(n,s,o){var u=n.stateNode;if(s=s.childContextTypes,typeof u.getChildContext!="function")return o;u=u.getChildContext();for(var p in u)if(!(p in s))throw Error(t(108,ye(n)||"Unknown",p));return ce({},o,u)}function Cc(n){return n=(n=n.stateNode)&&n.__reactInternalMemoizedMergedChildContext||ss,Xs=kn.current,Kt(kn,n),Kt(ni,ni.current),!0}function Og(n,s,o){var u=n.stateNode;if(!u)throw Error(t(169));o?(n=Fg(n,s,Xs),u.__reactInternalMemoizedMergedChildContext=n,Jt(ni),Jt(kn),Kt(kn,n)):Jt(ni),Kt(ni,o)}var wr=null,Rc=!1,Zd=!1;function kg(n){wr===null?wr=[n]:wr.push(n)}function IS(n){Rc=!0,kg(n)}function as(){if(!Zd&&wr!==null){Zd=!0;var n=0,s=St;try{var o=wr;for(St=1;n<o.length;n++){var u=o[n];do u=u(!0);while(u!==null)}wr=null,Rc=!1}catch(p){throw wr!==null&&(wr=wr.slice(n+1)),Gs(Xo,as),p}finally{St=s,Zd=!1}}return null}var za=[],Ba=0,Ac=null,Pc=0,bi=[],Ti=0,$s=null,br=1,Tr="";function qs(n,s){za[Ba++]=Pc,za[Ba++]=Ac,Ac=n,Pc=s}function zg(n,s,o){bi[Ti++]=br,bi[Ti++]=Tr,bi[Ti++]=$s,$s=n;var u=br;n=Tr;var p=32-Ae(u)-1;u&=~(1<<p),o+=1;var y=32-Ae(s)+p;if(30<y){var R=p-p%5;y=(u&(1<<R)-1).toString(32),u>>=R,p-=R,br=1<<32-Ae(s)+p|o<<p|u,Tr=y+n}else br=1<<y|o<<p|u,Tr=n}function Jd(n){n.return!==null&&(qs(n,1),zg(n,1,0))}function eh(n){for(;n===Ac;)Ac=za[--Ba],za[Ba]=null,Pc=za[--Ba],za[Ba]=null;for(;n===$s;)$s=bi[--Ti],bi[Ti]=null,Tr=bi[--Ti],bi[Ti]=null,br=bi[--Ti],bi[Ti]=null}var pi=null,mi=null,nn=!1,zi=null;function Bg(n,s){var o=Pi(5,null,null,0);o.elementType="DELETED",o.stateNode=s,o.return=n,s=n.deletions,s===null?(n.deletions=[o],n.flags|=16):s.push(o)}function Hg(n,s){switch(n.tag){case 5:var o=n.type;return s=s.nodeType!==1||o.toLowerCase()!==s.nodeName.toLowerCase()?null:s,s!==null?(n.stateNode=s,pi=n,mi=is(s.firstChild),!0):!1;case 6:return s=n.pendingProps===""||s.nodeType!==3?null:s,s!==null?(n.stateNode=s,pi=n,mi=null,!0):!1;case 13:return s=s.nodeType!==8?null:s,s!==null?(o=$s!==null?{id:br,overflow:Tr}:null,n.memoizedState={dehydrated:s,treeContext:o,retryLane:1073741824},o=Pi(18,null,null,0),o.stateNode=s,o.return=n,n.child=o,pi=n,mi=null,!0):!1;default:return!1}}function th(n){return(n.mode&1)!==0&&(n.flags&128)===0}function nh(n){if(nn){var s=mi;if(s){var o=s;if(!Hg(n,s)){if(th(n))throw Error(t(418));s=is(o.nextSibling);var u=pi;s&&Hg(n,s)?Bg(u,o):(n.flags=n.flags&-4097|2,nn=!1,pi=n)}}else{if(th(n))throw Error(t(418));n.flags=n.flags&-4097|2,nn=!1,pi=n}}}function Vg(n){for(n=n.return;n!==null&&n.tag!==5&&n.tag!==3&&n.tag!==13;)n=n.return;pi=n}function Nc(n){if(n!==pi)return!1;if(!nn)return Vg(n),nn=!0,!1;var s;if((s=n.tag!==3)&&!(s=n.tag!==5)&&(s=n.type,s=s!=="head"&&s!=="body"&&!$d(n.type,n.memoizedProps)),s&&(s=mi)){if(th(n))throw Gg(),Error(t(418));for(;s;)Bg(n,s),s=is(s.nextSibling)}if(Vg(n),n.tag===13){if(n=n.memoizedState,n=n!==null?n.dehydrated:null,!n)throw Error(t(317));e:{for(n=n.nextSibling,s=0;n;){if(n.nodeType===8){var o=n.data;if(o==="/$"){if(s===0){mi=is(n.nextSibling);break e}s--}else o!=="$"&&o!=="$!"&&o!=="$?"||s++}n=n.nextSibling}mi=null}}else mi=pi?is(n.stateNode.nextSibling):null;return!0}function Gg(){for(var n=mi;n;)n=is(n.nextSibling)}function Ha(){mi=pi=null,nn=!1}function ih(n){zi===null?zi=[n]:zi.push(n)}var US=C.ReactCurrentBatchConfig;function ul(n,s,o){if(n=o.ref,n!==null&&typeof n!="function"&&typeof n!="object"){if(o._owner){if(o=o._owner,o){if(o.tag!==1)throw Error(t(309));var u=o.stateNode}if(!u)throw Error(t(147,n));var p=u,y=""+n;return s!==null&&s.ref!==null&&typeof s.ref=="function"&&s.ref._stringRef===y?s.ref:(s=function(R){var H=p.refs;R===null?delete H[y]:H[y]=R},s._stringRef=y,s)}if(typeof n!="string")throw Error(t(284));if(!o._owner)throw Error(t(290,n))}return n}function Lc(n,s){throw n=Object.prototype.toString.call(s),Error(t(31,n==="[object Object]"?"object with keys {"+Object.keys(s).join(", ")+"}":n))}function jg(n){var s=n._init;return s(n._payload)}function Wg(n){function s(ie,K){if(n){var ue=ie.deletions;ue===null?(ie.deletions=[K],ie.flags|=16):ue.push(K)}}function o(ie,K){if(!n)return null;for(;K!==null;)s(ie,K),K=K.sibling;return null}function u(ie,K){for(ie=new Map;K!==null;)K.key!==null?ie.set(K.key,K):ie.set(K.index,K),K=K.sibling;return ie}function p(ie,K){return ie=ps(ie,K),ie.index=0,ie.sibling=null,ie}function y(ie,K,ue){return ie.index=ue,n?(ue=ie.alternate,ue!==null?(ue=ue.index,ue<K?(ie.flags|=2,K):ue):(ie.flags|=2,K)):(ie.flags|=1048576,K)}function R(ie){return n&&ie.alternate===null&&(ie.flags|=2),ie}function H(ie,K,ue,Ce){return K===null||K.tag!==6?(K=qh(ue,ie.mode,Ce),K.return=ie,K):(K=p(K,ue),K.return=ie,K)}function W(ie,K,ue,Ce){var et=ue.type;return et===k?be(ie,K,ue.props.children,Ce,ue.key):K!==null&&(K.elementType===et||typeof et=="object"&&et!==null&&et.$$typeof===ae&&jg(et)===K.type)?(Ce=p(K,ue.props),Ce.ref=ul(ie,K,ue),Ce.return=ie,Ce):(Ce=nu(ue.type,ue.key,ue.props,null,ie.mode,Ce),Ce.ref=ul(ie,K,ue),Ce.return=ie,Ce)}function pe(ie,K,ue,Ce){return K===null||K.tag!==4||K.stateNode.containerInfo!==ue.containerInfo||K.stateNode.implementation!==ue.implementation?(K=Yh(ue,ie.mode,Ce),K.return=ie,K):(K=p(K,ue.children||[]),K.return=ie,K)}function be(ie,K,ue,Ce,et){return K===null||K.tag!==7?(K=na(ue,ie.mode,Ce,et),K.return=ie,K):(K=p(K,ue),K.return=ie,K)}function Te(ie,K,ue){if(typeof K=="string"&&K!==""||typeof K=="number")return K=qh(""+K,ie.mode,ue),K.return=ie,K;if(typeof K=="object"&&K!==null){switch(K.$$typeof){case U:return ue=nu(K.type,K.key,K.props,null,ie.mode,ue),ue.ref=ul(ie,null,K),ue.return=ie,ue;case D:return K=Yh(K,ie.mode,ue),K.return=ie,K;case ae:var Ce=K._init;return Te(ie,Ce(K._payload),ue)}if($t(K)||de(K))return K=na(K,ie.mode,ue,null),K.return=ie,K;Lc(ie,K)}return null}function we(ie,K,ue,Ce){var et=K!==null?K.key:null;if(typeof ue=="string"&&ue!==""||typeof ue=="number")return et!==null?null:H(ie,K,""+ue,Ce);if(typeof ue=="object"&&ue!==null){switch(ue.$$typeof){case U:return ue.key===et?W(ie,K,ue,Ce):null;case D:return ue.key===et?pe(ie,K,ue,Ce):null;case ae:return et=ue._init,we(ie,K,et(ue._payload),Ce)}if($t(ue)||de(ue))return et!==null?null:be(ie,K,ue,Ce,null);Lc(ie,ue)}return null}function Ve(ie,K,ue,Ce,et){if(typeof Ce=="string"&&Ce!==""||typeof Ce=="number")return ie=ie.get(ue)||null,H(K,ie,""+Ce,et);if(typeof Ce=="object"&&Ce!==null){switch(Ce.$$typeof){case U:return ie=ie.get(Ce.key===null?ue:Ce.key)||null,W(K,ie,Ce,et);case D:return ie=ie.get(Ce.key===null?ue:Ce.key)||null,pe(K,ie,Ce,et);case ae:var at=Ce._init;return Ve(ie,K,ue,at(Ce._payload),et)}if($t(Ce)||de(Ce))return ie=ie.get(ue)||null,be(K,ie,Ce,et,null);Lc(K,Ce)}return null}function qe(ie,K,ue,Ce){for(var et=null,at=null,ot=K,ct=K=0,Rn=null;ot!==null&&ct<ue.length;ct++){ot.index>ct?(Rn=ot,ot=null):Rn=ot.sibling;var It=we(ie,ot,ue[ct],Ce);if(It===null){ot===null&&(ot=Rn);break}n&&ot&&It.alternate===null&&s(ie,ot),K=y(It,K,ct),at===null?et=It:at.sibling=It,at=It,ot=Rn}if(ct===ue.length)return o(ie,ot),nn&&qs(ie,ct),et;if(ot===null){for(;ct<ue.length;ct++)ot=Te(ie,ue[ct],Ce),ot!==null&&(K=y(ot,K,ct),at===null?et=ot:at.sibling=ot,at=ot);return nn&&qs(ie,ct),et}for(ot=u(ie,ot);ct<ue.length;ct++)Rn=Ve(ot,ie,ct,ue[ct],Ce),Rn!==null&&(n&&Rn.alternate!==null&&ot.delete(Rn.key===null?ct:Rn.key),K=y(Rn,K,ct),at===null?et=Rn:at.sibling=Rn,at=Rn);return n&&ot.forEach(function(ms){return s(ie,ms)}),nn&&qs(ie,ct),et}function Qe(ie,K,ue,Ce){var et=de(ue);if(typeof et!="function")throw Error(t(150));if(ue=et.call(ue),ue==null)throw Error(t(151));for(var at=et=null,ot=K,ct=K=0,Rn=null,It=ue.next();ot!==null&&!It.done;ct++,It=ue.next()){ot.index>ct?(Rn=ot,ot=null):Rn=ot.sibling;var ms=we(ie,ot,It.value,Ce);if(ms===null){ot===null&&(ot=Rn);break}n&&ot&&ms.alternate===null&&s(ie,ot),K=y(ms,K,ct),at===null?et=ms:at.sibling=ms,at=ms,ot=Rn}if(It.done)return o(ie,ot),nn&&qs(ie,ct),et;if(ot===null){for(;!It.done;ct++,It=ue.next())It=Te(ie,It.value,Ce),It!==null&&(K=y(It,K,ct),at===null?et=It:at.sibling=It,at=It);return nn&&qs(ie,ct),et}for(ot=u(ie,ot);!It.done;ct++,It=ue.next())It=Ve(ot,ie,ct,It.value,Ce),It!==null&&(n&&It.alternate!==null&&ot.delete(It.key===null?ct:It.key),K=y(It,K,ct),at===null?et=It:at.sibling=It,at=It);return n&&ot.forEach(function(pM){return s(ie,pM)}),nn&&qs(ie,ct),et}function mn(ie,K,ue,Ce){if(typeof ue=="object"&&ue!==null&&ue.type===k&&ue.key===null&&(ue=ue.props.children),typeof ue=="object"&&ue!==null){switch(ue.$$typeof){case U:e:{for(var et=ue.key,at=K;at!==null;){if(at.key===et){if(et=ue.type,et===k){if(at.tag===7){o(ie,at.sibling),K=p(at,ue.props.children),K.return=ie,ie=K;break e}}else if(at.elementType===et||typeof et=="object"&&et!==null&&et.$$typeof===ae&&jg(et)===at.type){o(ie,at.sibling),K=p(at,ue.props),K.ref=ul(ie,at,ue),K.return=ie,ie=K;break e}o(ie,at);break}else s(ie,at);at=at.sibling}ue.type===k?(K=na(ue.props.children,ie.mode,Ce,ue.key),K.return=ie,ie=K):(Ce=nu(ue.type,ue.key,ue.props,null,ie.mode,Ce),Ce.ref=ul(ie,K,ue),Ce.return=ie,ie=Ce)}return R(ie);case D:e:{for(at=ue.key;K!==null;){if(K.key===at)if(K.tag===4&&K.stateNode.containerInfo===ue.containerInfo&&K.stateNode.implementation===ue.implementation){o(ie,K.sibling),K=p(K,ue.children||[]),K.return=ie,ie=K;break e}else{o(ie,K);break}else s(ie,K);K=K.sibling}K=Yh(ue,ie.mode,Ce),K.return=ie,ie=K}return R(ie);case ae:return at=ue._init,mn(ie,K,at(ue._payload),Ce)}if($t(ue))return qe(ie,K,ue,Ce);if(de(ue))return Qe(ie,K,ue,Ce);Lc(ie,ue)}return typeof ue=="string"&&ue!==""||typeof ue=="number"?(ue=""+ue,K!==null&&K.tag===6?(o(ie,K.sibling),K=p(K,ue),K.return=ie,ie=K):(o(ie,K),K=qh(ue,ie.mode,Ce),K.return=ie,ie=K),R(ie)):o(ie,K)}return mn}var Va=Wg(!0),Xg=Wg(!1),Dc=rs(null),Ic=null,Ga=null,rh=null;function sh(){rh=Ga=Ic=null}function ah(n){var s=Dc.current;Jt(Dc),n._currentValue=s}function oh(n,s,o){for(;n!==null;){var u=n.alternate;if((n.childLanes&s)!==s?(n.childLanes|=s,u!==null&&(u.childLanes|=s)):u!==null&&(u.childLanes&s)!==s&&(u.childLanes|=s),n===o)break;n=n.return}}function ja(n,s){Ic=n,rh=Ga=null,n=n.dependencies,n!==null&&n.firstContext!==null&&((n.lanes&s)!==0&&(ri=!0),n.firstContext=null)}function Ci(n){var s=n._currentValue;if(rh!==n)if(n={context:n,memoizedValue:s,next:null},Ga===null){if(Ic===null)throw Error(t(308));Ga=n,Ic.dependencies={lanes:0,firstContext:n}}else Ga=Ga.next=n;return s}var Ys=null;function lh(n){Ys===null?Ys=[n]:Ys.push(n)}function $g(n,s,o,u){var p=s.interleaved;return p===null?(o.next=o,lh(s)):(o.next=p.next,p.next=o),s.interleaved=o,Cr(n,u)}function Cr(n,s){n.lanes|=s;var o=n.alternate;for(o!==null&&(o.lanes|=s),o=n,n=n.return;n!==null;)n.childLanes|=s,o=n.alternate,o!==null&&(o.childLanes|=s),o=n,n=n.return;return o.tag===3?o.stateNode:null}var os=!1;function ch(n){n.updateQueue={baseState:n.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function qg(n,s){n=n.updateQueue,s.updateQueue===n&&(s.updateQueue={baseState:n.baseState,firstBaseUpdate:n.firstBaseUpdate,lastBaseUpdate:n.lastBaseUpdate,shared:n.shared,effects:n.effects})}function Rr(n,s){return{eventTime:n,lane:s,tag:0,payload:null,callback:null,next:null}}function ls(n,s,o){var u=n.updateQueue;if(u===null)return null;if(u=u.shared,(Lt&2)!==0){var p=u.pending;return p===null?s.next=s:(s.next=p.next,p.next=s),u.pending=s,Cr(n,o)}return p=u.interleaved,p===null?(s.next=s,lh(u)):(s.next=p.next,p.next=s),u.interleaved=s,Cr(n,o)}function Uc(n,s,o){if(s=s.updateQueue,s!==null&&(s=s.shared,(o&4194240)!==0)){var u=s.lanes;u&=n.pendingLanes,o|=u,s.lanes=o,ti(n,o)}}function Yg(n,s){var o=n.updateQueue,u=n.alternate;if(u!==null&&(u=u.updateQueue,o===u)){var p=null,y=null;if(o=o.firstBaseUpdate,o!==null){do{var R={eventTime:o.eventTime,lane:o.lane,tag:o.tag,payload:o.payload,callback:o.callback,next:null};y===null?p=y=R:y=y.next=R,o=o.next}while(o!==null);y===null?p=y=s:y=y.next=s}else p=y=s;o={baseState:u.baseState,firstBaseUpdate:p,lastBaseUpdate:y,shared:u.shared,effects:u.effects},n.updateQueue=o;return}n=o.lastBaseUpdate,n===null?o.firstBaseUpdate=s:n.next=s,o.lastBaseUpdate=s}function Fc(n,s,o,u){var p=n.updateQueue;os=!1;var y=p.firstBaseUpdate,R=p.lastBaseUpdate,H=p.shared.pending;if(H!==null){p.shared.pending=null;var W=H,pe=W.next;W.next=null,R===null?y=pe:R.next=pe,R=W;var be=n.alternate;be!==null&&(be=be.updateQueue,H=be.lastBaseUpdate,H!==R&&(H===null?be.firstBaseUpdate=pe:H.next=pe,be.lastBaseUpdate=W))}if(y!==null){var Te=p.baseState;R=0,be=pe=W=null,H=y;do{var we=H.lane,Ve=H.eventTime;if((u&we)===we){be!==null&&(be=be.next={eventTime:Ve,lane:0,tag:H.tag,payload:H.payload,callback:H.callback,next:null});e:{var qe=n,Qe=H;switch(we=s,Ve=o,Qe.tag){case 1:if(qe=Qe.payload,typeof qe=="function"){Te=qe.call(Ve,Te,we);break e}Te=qe;break e;case 3:qe.flags=qe.flags&-65537|128;case 0:if(qe=Qe.payload,we=typeof qe=="function"?qe.call(Ve,Te,we):qe,we==null)break e;Te=ce({},Te,we);break e;case 2:os=!0}}H.callback!==null&&H.lane!==0&&(n.flags|=64,we=p.effects,we===null?p.effects=[H]:we.push(H))}else Ve={eventTime:Ve,lane:we,tag:H.tag,payload:H.payload,callback:H.callback,next:null},be===null?(pe=be=Ve,W=Te):be=be.next=Ve,R|=we;if(H=H.next,H===null){if(H=p.shared.pending,H===null)break;we=H,H=we.next,we.next=null,p.lastBaseUpdate=we,p.shared.pending=null}}while(!0);if(be===null&&(W=Te),p.baseState=W,p.firstBaseUpdate=pe,p.lastBaseUpdate=be,s=p.shared.interleaved,s!==null){p=s;do R|=p.lane,p=p.next;while(p!==s)}else y===null&&(p.shared.lanes=0);Zs|=R,n.lanes=R,n.memoizedState=Te}}function Kg(n,s,o){if(n=s.effects,s.effects=null,n!==null)for(s=0;s<n.length;s++){var u=n[s],p=u.callback;if(p!==null){if(u.callback=null,u=o,typeof p!="function")throw Error(t(191,p));p.call(u)}}}var dl={},ir=rs(dl),hl=rs(dl),fl=rs(dl);function Ks(n){if(n===dl)throw Error(t(174));return n}function uh(n,s){switch(Kt(fl,s),Kt(hl,n),Kt(ir,dl),n=s.nodeType,n){case 9:case 11:s=(s=s.documentElement)?s.namespaceURI:T(null,"");break;default:n=n===8?s.parentNode:s,s=n.namespaceURI||null,n=n.tagName,s=T(s,n)}Jt(ir),Kt(ir,s)}function Wa(){Jt(ir),Jt(hl),Jt(fl)}function Qg(n){Ks(fl.current);var s=Ks(ir.current),o=T(s,n.type);s!==o&&(Kt(hl,n),Kt(ir,o))}function dh(n){hl.current===n&&(Jt(ir),Jt(hl))}var ln=rs(0);function Oc(n){for(var s=n;s!==null;){if(s.tag===13){var o=s.memoizedState;if(o!==null&&(o=o.dehydrated,o===null||o.data==="$?"||o.data==="$!"))return s}else if(s.tag===19&&s.memoizedProps.revealOrder!==void 0){if((s.flags&128)!==0)return s}else if(s.child!==null){s.child.return=s,s=s.child;continue}if(s===n)break;for(;s.sibling===null;){if(s.return===null||s.return===n)return null;s=s.return}s.sibling.return=s.return,s=s.sibling}return null}var hh=[];function fh(){for(var n=0;n<hh.length;n++)hh[n]._workInProgressVersionPrimary=null;hh.length=0}var kc=C.ReactCurrentDispatcher,ph=C.ReactCurrentBatchConfig,Qs=0,cn=null,_n=null,Tn=null,zc=!1,pl=!1,ml=0,FS=0;function zn(){throw Error(t(321))}function mh(n,s){if(s===null)return!1;for(var o=0;o<s.length&&o<n.length;o++)if(!ki(n[o],s[o]))return!1;return!0}function gh(n,s,o,u,p,y){if(Qs=y,cn=s,s.memoizedState=null,s.updateQueue=null,s.lanes=0,kc.current=n===null||n.memoizedState===null?BS:HS,n=o(u,p),pl){y=0;do{if(pl=!1,ml=0,25<=y)throw Error(t(301));y+=1,Tn=_n=null,s.updateQueue=null,kc.current=VS,n=o(u,p)}while(pl)}if(kc.current=Vc,s=_n!==null&&_n.next!==null,Qs=0,Tn=_n=cn=null,zc=!1,s)throw Error(t(300));return n}function xh(){var n=ml!==0;return ml=0,n}function rr(){var n={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Tn===null?cn.memoizedState=Tn=n:Tn=Tn.next=n,Tn}function Ri(){if(_n===null){var n=cn.alternate;n=n!==null?n.memoizedState:null}else n=_n.next;var s=Tn===null?cn.memoizedState:Tn.next;if(s!==null)Tn=s,_n=n;else{if(n===null)throw Error(t(310));_n=n,n={memoizedState:_n.memoizedState,baseState:_n.baseState,baseQueue:_n.baseQueue,queue:_n.queue,next:null},Tn===null?cn.memoizedState=Tn=n:Tn=Tn.next=n}return Tn}function gl(n,s){return typeof s=="function"?s(n):s}function vh(n){var s=Ri(),o=s.queue;if(o===null)throw Error(t(311));o.lastRenderedReducer=n;var u=_n,p=u.baseQueue,y=o.pending;if(y!==null){if(p!==null){var R=p.next;p.next=y.next,y.next=R}u.baseQueue=p=y,o.pending=null}if(p!==null){y=p.next,u=u.baseState;var H=R=null,W=null,pe=y;do{var be=pe.lane;if((Qs&be)===be)W!==null&&(W=W.next={lane:0,action:pe.action,hasEagerState:pe.hasEagerState,eagerState:pe.eagerState,next:null}),u=pe.hasEagerState?pe.eagerState:n(u,pe.action);else{var Te={lane:be,action:pe.action,hasEagerState:pe.hasEagerState,eagerState:pe.eagerState,next:null};W===null?(H=W=Te,R=u):W=W.next=Te,cn.lanes|=be,Zs|=be}pe=pe.next}while(pe!==null&&pe!==y);W===null?R=u:W.next=H,ki(u,s.memoizedState)||(ri=!0),s.memoizedState=u,s.baseState=R,s.baseQueue=W,o.lastRenderedState=u}if(n=o.interleaved,n!==null){p=n;do y=p.lane,cn.lanes|=y,Zs|=y,p=p.next;while(p!==n)}else p===null&&(o.lanes=0);return[s.memoizedState,o.dispatch]}function _h(n){var s=Ri(),o=s.queue;if(o===null)throw Error(t(311));o.lastRenderedReducer=n;var u=o.dispatch,p=o.pending,y=s.memoizedState;if(p!==null){o.pending=null;var R=p=p.next;do y=n(y,R.action),R=R.next;while(R!==p);ki(y,s.memoizedState)||(ri=!0),s.memoizedState=y,s.baseQueue===null&&(s.baseState=y),o.lastRenderedState=y}return[y,u]}function Zg(){}function Jg(n,s){var o=cn,u=Ri(),p=s(),y=!ki(u.memoizedState,p);if(y&&(u.memoizedState=p,ri=!0),u=u.queue,yh(n0.bind(null,o,u,n),[n]),u.getSnapshot!==s||y||Tn!==null&&Tn.memoizedState.tag&1){if(o.flags|=2048,xl(9,t0.bind(null,o,u,p,s),void 0,null),Cn===null)throw Error(t(349));(Qs&30)!==0||e0(o,s,p)}return p}function e0(n,s,o){n.flags|=16384,n={getSnapshot:s,value:o},s=cn.updateQueue,s===null?(s={lastEffect:null,stores:null},cn.updateQueue=s,s.stores=[n]):(o=s.stores,o===null?s.stores=[n]:o.push(n))}function t0(n,s,o,u){s.value=o,s.getSnapshot=u,i0(s)&&r0(n)}function n0(n,s,o){return o(function(){i0(s)&&r0(n)})}function i0(n){var s=n.getSnapshot;n=n.value;try{var o=s();return!ki(n,o)}catch{return!0}}function r0(n){var s=Cr(n,1);s!==null&&Gi(s,n,1,-1)}function s0(n){var s=rr();return typeof n=="function"&&(n=n()),s.memoizedState=s.baseState=n,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:gl,lastRenderedState:n},s.queue=n,n=n.dispatch=zS.bind(null,cn,n),[s.memoizedState,n]}function xl(n,s,o,u){return n={tag:n,create:s,destroy:o,deps:u,next:null},s=cn.updateQueue,s===null?(s={lastEffect:null,stores:null},cn.updateQueue=s,s.lastEffect=n.next=n):(o=s.lastEffect,o===null?s.lastEffect=n.next=n:(u=o.next,o.next=n,n.next=u,s.lastEffect=n)),n}function a0(){return Ri().memoizedState}function Bc(n,s,o,u){var p=rr();cn.flags|=n,p.memoizedState=xl(1|s,o,void 0,u===void 0?null:u)}function Hc(n,s,o,u){var p=Ri();u=u===void 0?null:u;var y=void 0;if(_n!==null){var R=_n.memoizedState;if(y=R.destroy,u!==null&&mh(u,R.deps)){p.memoizedState=xl(s,o,y,u);return}}cn.flags|=n,p.memoizedState=xl(1|s,o,y,u)}function o0(n,s){return Bc(8390656,8,n,s)}function yh(n,s){return Hc(2048,8,n,s)}function l0(n,s){return Hc(4,2,n,s)}function c0(n,s){return Hc(4,4,n,s)}function u0(n,s){if(typeof s=="function")return n=n(),s(n),function(){s(null)};if(s!=null)return n=n(),s.current=n,function(){s.current=null}}function d0(n,s,o){return o=o!=null?o.concat([n]):null,Hc(4,4,u0.bind(null,s,n),o)}function Sh(){}function h0(n,s){var o=Ri();s=s===void 0?null:s;var u=o.memoizedState;return u!==null&&s!==null&&mh(s,u[1])?u[0]:(o.memoizedState=[n,s],n)}function f0(n,s){var o=Ri();s=s===void 0?null:s;var u=o.memoizedState;return u!==null&&s!==null&&mh(s,u[1])?u[0]:(n=n(),o.memoizedState=[n,s],n)}function p0(n,s,o){return(Qs&21)===0?(n.baseState&&(n.baseState=!1,ri=!0),n.memoizedState=o):(ki(o,s)||(o=He(),cn.lanes|=o,Zs|=o,n.baseState=!0),s)}function OS(n,s){var o=St;St=o!==0&&4>o?o:4,n(!0);var u=ph.transition;ph.transition={};try{n(!1),s()}finally{St=o,ph.transition=u}}function m0(){return Ri().memoizedState}function kS(n,s,o){var u=hs(n);if(o={lane:u,action:o,hasEagerState:!1,eagerState:null,next:null},g0(n))x0(s,o);else if(o=$g(n,s,o,u),o!==null){var p=Yn();Gi(o,n,u,p),v0(o,s,u)}}function zS(n,s,o){var u=hs(n),p={lane:u,action:o,hasEagerState:!1,eagerState:null,next:null};if(g0(n))x0(s,p);else{var y=n.alternate;if(n.lanes===0&&(y===null||y.lanes===0)&&(y=s.lastRenderedReducer,y!==null))try{var R=s.lastRenderedState,H=y(R,o);if(p.hasEagerState=!0,p.eagerState=H,ki(H,R)){var W=s.interleaved;W===null?(p.next=p,lh(s)):(p.next=W.next,W.next=p),s.interleaved=p;return}}catch{}finally{}o=$g(n,s,p,u),o!==null&&(p=Yn(),Gi(o,n,u,p),v0(o,s,u))}}function g0(n){var s=n.alternate;return n===cn||s!==null&&s===cn}function x0(n,s){pl=zc=!0;var o=n.pending;o===null?s.next=s:(s.next=o.next,o.next=s),n.pending=s}function v0(n,s,o){if((o&4194240)!==0){var u=s.lanes;u&=n.pendingLanes,o|=u,s.lanes=o,ti(n,o)}}var Vc={readContext:Ci,useCallback:zn,useContext:zn,useEffect:zn,useImperativeHandle:zn,useInsertionEffect:zn,useLayoutEffect:zn,useMemo:zn,useReducer:zn,useRef:zn,useState:zn,useDebugValue:zn,useDeferredValue:zn,useTransition:zn,useMutableSource:zn,useSyncExternalStore:zn,useId:zn,unstable_isNewReconciler:!1},BS={readContext:Ci,useCallback:function(n,s){return rr().memoizedState=[n,s===void 0?null:s],n},useContext:Ci,useEffect:o0,useImperativeHandle:function(n,s,o){return o=o!=null?o.concat([n]):null,Bc(4194308,4,u0.bind(null,s,n),o)},useLayoutEffect:function(n,s){return Bc(4194308,4,n,s)},useInsertionEffect:function(n,s){return Bc(4,2,n,s)},useMemo:function(n,s){var o=rr();return s=s===void 0?null:s,n=n(),o.memoizedState=[n,s],n},useReducer:function(n,s,o){var u=rr();return s=o!==void 0?o(s):s,u.memoizedState=u.baseState=s,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:n,lastRenderedState:s},u.queue=n,n=n.dispatch=kS.bind(null,cn,n),[u.memoizedState,n]},useRef:function(n){var s=rr();return n={current:n},s.memoizedState=n},useState:s0,useDebugValue:Sh,useDeferredValue:function(n){return rr().memoizedState=n},useTransition:function(){var n=s0(!1),s=n[0];return n=OS.bind(null,n[1]),rr().memoizedState=n,[s,n]},useMutableSource:function(){},useSyncExternalStore:function(n,s,o){var u=cn,p=rr();if(nn){if(o===void 0)throw Error(t(407));o=o()}else{if(o=s(),Cn===null)throw Error(t(349));(Qs&30)!==0||e0(u,s,o)}p.memoizedState=o;var y={value:o,getSnapshot:s};return p.queue=y,o0(n0.bind(null,u,y,n),[n]),u.flags|=2048,xl(9,t0.bind(null,u,y,o,s),void 0,null),o},useId:function(){var n=rr(),s=Cn.identifierPrefix;if(nn){var o=Tr,u=br;o=(u&~(1<<32-Ae(u)-1)).toString(32)+o,s=":"+s+"R"+o,o=ml++,0<o&&(s+="H"+o.toString(32)),s+=":"}else o=FS++,s=":"+s+"r"+o.toString(32)+":";return n.memoizedState=s},unstable_isNewReconciler:!1},HS={readContext:Ci,useCallback:h0,useContext:Ci,useEffect:yh,useImperativeHandle:d0,useInsertionEffect:l0,useLayoutEffect:c0,useMemo:f0,useReducer:vh,useRef:a0,useState:function(){return vh(gl)},useDebugValue:Sh,useDeferredValue:function(n){var s=Ri();return p0(s,_n.memoizedState,n)},useTransition:function(){var n=vh(gl)[0],s=Ri().memoizedState;return[n,s]},useMutableSource:Zg,useSyncExternalStore:Jg,useId:m0,unstable_isNewReconciler:!1},VS={readContext:Ci,useCallback:h0,useContext:Ci,useEffect:yh,useImperativeHandle:d0,useInsertionEffect:l0,useLayoutEffect:c0,useMemo:f0,useReducer:_h,useRef:a0,useState:function(){return _h(gl)},useDebugValue:Sh,useDeferredValue:function(n){var s=Ri();return _n===null?s.memoizedState=n:p0(s,_n.memoizedState,n)},useTransition:function(){var n=_h(gl)[0],s=Ri().memoizedState;return[n,s]},useMutableSource:Zg,useSyncExternalStore:Jg,useId:m0,unstable_isNewReconciler:!1};function Bi(n,s){if(n&&n.defaultProps){s=ce({},s),n=n.defaultProps;for(var o in n)s[o]===void 0&&(s[o]=n[o]);return s}return s}function Mh(n,s,o,u){s=n.memoizedState,o=o(u,s),o=o==null?s:ce({},s,o),n.memoizedState=o,n.lanes===0&&(n.updateQueue.baseState=o)}var Gc={isMounted:function(n){return(n=n._reactInternals)?$n(n)===n:!1},enqueueSetState:function(n,s,o){n=n._reactInternals;var u=Yn(),p=hs(n),y=Rr(u,p);y.payload=s,o!=null&&(y.callback=o),s=ls(n,y,p),s!==null&&(Gi(s,n,p,u),Uc(s,n,p))},enqueueReplaceState:function(n,s,o){n=n._reactInternals;var u=Yn(),p=hs(n),y=Rr(u,p);y.tag=1,y.payload=s,o!=null&&(y.callback=o),s=ls(n,y,p),s!==null&&(Gi(s,n,p,u),Uc(s,n,p))},enqueueForceUpdate:function(n,s){n=n._reactInternals;var o=Yn(),u=hs(n),p=Rr(o,u);p.tag=2,s!=null&&(p.callback=s),s=ls(n,p,u),s!==null&&(Gi(s,n,u,o),Uc(s,n,u))}};function _0(n,s,o,u,p,y,R){return n=n.stateNode,typeof n.shouldComponentUpdate=="function"?n.shouldComponentUpdate(u,y,R):s.prototype&&s.prototype.isPureReactComponent?!il(o,u)||!il(p,y):!0}function y0(n,s,o){var u=!1,p=ss,y=s.contextType;return typeof y=="object"&&y!==null?y=Ci(y):(p=ii(s)?Xs:kn.current,u=s.contextTypes,y=(u=u!=null)?ka(n,p):ss),s=new s(o,y),n.memoizedState=s.state!==null&&s.state!==void 0?s.state:null,s.updater=Gc,n.stateNode=s,s._reactInternals=n,u&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=p,n.__reactInternalMemoizedMaskedChildContext=y),s}function S0(n,s,o,u){n=s.state,typeof s.componentWillReceiveProps=="function"&&s.componentWillReceiveProps(o,u),typeof s.UNSAFE_componentWillReceiveProps=="function"&&s.UNSAFE_componentWillReceiveProps(o,u),s.state!==n&&Gc.enqueueReplaceState(s,s.state,null)}function Eh(n,s,o,u){var p=n.stateNode;p.props=o,p.state=n.memoizedState,p.refs={},ch(n);var y=s.contextType;typeof y=="object"&&y!==null?p.context=Ci(y):(y=ii(s)?Xs:kn.current,p.context=ka(n,y)),p.state=n.memoizedState,y=s.getDerivedStateFromProps,typeof y=="function"&&(Mh(n,s,y,o),p.state=n.memoizedState),typeof s.getDerivedStateFromProps=="function"||typeof p.getSnapshotBeforeUpdate=="function"||typeof p.UNSAFE_componentWillMount!="function"&&typeof p.componentWillMount!="function"||(s=p.state,typeof p.componentWillMount=="function"&&p.componentWillMount(),typeof p.UNSAFE_componentWillMount=="function"&&p.UNSAFE_componentWillMount(),s!==p.state&&Gc.enqueueReplaceState(p,p.state,null),Fc(n,o,p,u),p.state=n.memoizedState),typeof p.componentDidMount=="function"&&(n.flags|=4194308)}function Xa(n,s){try{var o="",u=s;do o+=Ge(u),u=u.return;while(u);var p=o}catch(y){p=`
Error generating stack: `+y.message+`
`+y.stack}return{value:n,source:s,stack:p,digest:null}}function wh(n,s,o){return{value:n,source:null,stack:o??null,digest:s??null}}function bh(n,s){try{console.error(s.value)}catch(o){setTimeout(function(){throw o})}}var GS=typeof WeakMap=="function"?WeakMap:Map;function M0(n,s,o){o=Rr(-1,o),o.tag=3,o.payload={element:null};var u=s.value;return o.callback=function(){Kc||(Kc=!0,Bh=u),bh(n,s)},o}function E0(n,s,o){o=Rr(-1,o),o.tag=3;var u=n.type.getDerivedStateFromError;if(typeof u=="function"){var p=s.value;o.payload=function(){return u(p)},o.callback=function(){bh(n,s)}}var y=n.stateNode;return y!==null&&typeof y.componentDidCatch=="function"&&(o.callback=function(){bh(n,s),typeof u!="function"&&(us===null?us=new Set([this]):us.add(this));var R=s.stack;this.componentDidCatch(s.value,{componentStack:R!==null?R:""})}),o}function w0(n,s,o){var u=n.pingCache;if(u===null){u=n.pingCache=new GS;var p=new Set;u.set(s,p)}else p=u.get(s),p===void 0&&(p=new Set,u.set(s,p));p.has(o)||(p.add(o),n=iM.bind(null,n,s,o),s.then(n,n))}function b0(n){do{var s;if((s=n.tag===13)&&(s=n.memoizedState,s=s!==null?s.dehydrated!==null:!0),s)return n;n=n.return}while(n!==null);return null}function T0(n,s,o,u,p){return(n.mode&1)===0?(n===s?n.flags|=65536:(n.flags|=128,o.flags|=131072,o.flags&=-52805,o.tag===1&&(o.alternate===null?o.tag=17:(s=Rr(-1,1),s.tag=2,ls(o,s,1))),o.lanes|=1),n):(n.flags|=65536,n.lanes=p,n)}var jS=C.ReactCurrentOwner,ri=!1;function qn(n,s,o,u){s.child=n===null?Xg(s,null,o,u):Va(s,n.child,o,u)}function C0(n,s,o,u,p){o=o.render;var y=s.ref;return ja(s,p),u=gh(n,s,o,u,y,p),o=xh(),n!==null&&!ri?(s.updateQueue=n.updateQueue,s.flags&=-2053,n.lanes&=~p,Ar(n,s,p)):(nn&&o&&Jd(s),s.flags|=1,qn(n,s,u,p),s.child)}function R0(n,s,o,u,p){if(n===null){var y=o.type;return typeof y=="function"&&!$h(y)&&y.defaultProps===void 0&&o.compare===null&&o.defaultProps===void 0?(s.tag=15,s.type=y,A0(n,s,y,u,p)):(n=nu(o.type,null,u,s,s.mode,p),n.ref=s.ref,n.return=s,s.child=n)}if(y=n.child,(n.lanes&p)===0){var R=y.memoizedProps;if(o=o.compare,o=o!==null?o:il,o(R,u)&&n.ref===s.ref)return Ar(n,s,p)}return s.flags|=1,n=ps(y,u),n.ref=s.ref,n.return=s,s.child=n}function A0(n,s,o,u,p){if(n!==null){var y=n.memoizedProps;if(il(y,u)&&n.ref===s.ref)if(ri=!1,s.pendingProps=u=y,(n.lanes&p)!==0)(n.flags&131072)!==0&&(ri=!0);else return s.lanes=n.lanes,Ar(n,s,p)}return Th(n,s,o,u,p)}function P0(n,s,o){var u=s.pendingProps,p=u.children,y=n!==null?n.memoizedState:null;if(u.mode==="hidden")if((s.mode&1)===0)s.memoizedState={baseLanes:0,cachePool:null,transitions:null},Kt(qa,gi),gi|=o;else{if((o&1073741824)===0)return n=y!==null?y.baseLanes|o:o,s.lanes=s.childLanes=1073741824,s.memoizedState={baseLanes:n,cachePool:null,transitions:null},s.updateQueue=null,Kt(qa,gi),gi|=n,null;s.memoizedState={baseLanes:0,cachePool:null,transitions:null},u=y!==null?y.baseLanes:o,Kt(qa,gi),gi|=u}else y!==null?(u=y.baseLanes|o,s.memoizedState=null):u=o,Kt(qa,gi),gi|=u;return qn(n,s,p,o),s.child}function N0(n,s){var o=s.ref;(n===null&&o!==null||n!==null&&n.ref!==o)&&(s.flags|=512,s.flags|=2097152)}function Th(n,s,o,u,p){var y=ii(o)?Xs:kn.current;return y=ka(s,y),ja(s,p),o=gh(n,s,o,u,y,p),u=xh(),n!==null&&!ri?(s.updateQueue=n.updateQueue,s.flags&=-2053,n.lanes&=~p,Ar(n,s,p)):(nn&&u&&Jd(s),s.flags|=1,qn(n,s,o,p),s.child)}function L0(n,s,o,u,p){if(ii(o)){var y=!0;Cc(s)}else y=!1;if(ja(s,p),s.stateNode===null)Wc(n,s),y0(s,o,u),Eh(s,o,u,p),u=!0;else if(n===null){var R=s.stateNode,H=s.memoizedProps;R.props=H;var W=R.context,pe=o.contextType;typeof pe=="object"&&pe!==null?pe=Ci(pe):(pe=ii(o)?Xs:kn.current,pe=ka(s,pe));var be=o.getDerivedStateFromProps,Te=typeof be=="function"||typeof R.getSnapshotBeforeUpdate=="function";Te||typeof R.UNSAFE_componentWillReceiveProps!="function"&&typeof R.componentWillReceiveProps!="function"||(H!==u||W!==pe)&&S0(s,R,u,pe),os=!1;var we=s.memoizedState;R.state=we,Fc(s,u,R,p),W=s.memoizedState,H!==u||we!==W||ni.current||os?(typeof be=="function"&&(Mh(s,o,be,u),W=s.memoizedState),(H=os||_0(s,o,H,u,we,W,pe))?(Te||typeof R.UNSAFE_componentWillMount!="function"&&typeof R.componentWillMount!="function"||(typeof R.componentWillMount=="function"&&R.componentWillMount(),typeof R.UNSAFE_componentWillMount=="function"&&R.UNSAFE_componentWillMount()),typeof R.componentDidMount=="function"&&(s.flags|=4194308)):(typeof R.componentDidMount=="function"&&(s.flags|=4194308),s.memoizedProps=u,s.memoizedState=W),R.props=u,R.state=W,R.context=pe,u=H):(typeof R.componentDidMount=="function"&&(s.flags|=4194308),u=!1)}else{R=s.stateNode,qg(n,s),H=s.memoizedProps,pe=s.type===s.elementType?H:Bi(s.type,H),R.props=pe,Te=s.pendingProps,we=R.context,W=o.contextType,typeof W=="object"&&W!==null?W=Ci(W):(W=ii(o)?Xs:kn.current,W=ka(s,W));var Ve=o.getDerivedStateFromProps;(be=typeof Ve=="function"||typeof R.getSnapshotBeforeUpdate=="function")||typeof R.UNSAFE_componentWillReceiveProps!="function"&&typeof R.componentWillReceiveProps!="function"||(H!==Te||we!==W)&&S0(s,R,u,W),os=!1,we=s.memoizedState,R.state=we,Fc(s,u,R,p);var qe=s.memoizedState;H!==Te||we!==qe||ni.current||os?(typeof Ve=="function"&&(Mh(s,o,Ve,u),qe=s.memoizedState),(pe=os||_0(s,o,pe,u,we,qe,W)||!1)?(be||typeof R.UNSAFE_componentWillUpdate!="function"&&typeof R.componentWillUpdate!="function"||(typeof R.componentWillUpdate=="function"&&R.componentWillUpdate(u,qe,W),typeof R.UNSAFE_componentWillUpdate=="function"&&R.UNSAFE_componentWillUpdate(u,qe,W)),typeof R.componentDidUpdate=="function"&&(s.flags|=4),typeof R.getSnapshotBeforeUpdate=="function"&&(s.flags|=1024)):(typeof R.componentDidUpdate!="function"||H===n.memoizedProps&&we===n.memoizedState||(s.flags|=4),typeof R.getSnapshotBeforeUpdate!="function"||H===n.memoizedProps&&we===n.memoizedState||(s.flags|=1024),s.memoizedProps=u,s.memoizedState=qe),R.props=u,R.state=qe,R.context=W,u=pe):(typeof R.componentDidUpdate!="function"||H===n.memoizedProps&&we===n.memoizedState||(s.flags|=4),typeof R.getSnapshotBeforeUpdate!="function"||H===n.memoizedProps&&we===n.memoizedState||(s.flags|=1024),u=!1)}return Ch(n,s,o,u,y,p)}function Ch(n,s,o,u,p,y){N0(n,s);var R=(s.flags&128)!==0;if(!u&&!R)return p&&Og(s,o,!1),Ar(n,s,y);u=s.stateNode,jS.current=s;var H=R&&typeof o.getDerivedStateFromError!="function"?null:u.render();return s.flags|=1,n!==null&&R?(s.child=Va(s,n.child,null,y),s.child=Va(s,null,H,y)):qn(n,s,H,y),s.memoizedState=u.state,p&&Og(s,o,!0),s.child}function D0(n){var s=n.stateNode;s.pendingContext?Ug(n,s.pendingContext,s.pendingContext!==s.context):s.context&&Ug(n,s.context,!1),uh(n,s.containerInfo)}function I0(n,s,o,u,p){return Ha(),ih(p),s.flags|=256,qn(n,s,o,u),s.child}var Rh={dehydrated:null,treeContext:null,retryLane:0};function Ah(n){return{baseLanes:n,cachePool:null,transitions:null}}function U0(n,s,o){var u=s.pendingProps,p=ln.current,y=!1,R=(s.flags&128)!==0,H;if((H=R)||(H=n!==null&&n.memoizedState===null?!1:(p&2)!==0),H?(y=!0,s.flags&=-129):(n===null||n.memoizedState!==null)&&(p|=1),Kt(ln,p&1),n===null)return nh(s),n=s.memoizedState,n!==null&&(n=n.dehydrated,n!==null)?((s.mode&1)===0?s.lanes=1:n.data==="$!"?s.lanes=8:s.lanes=1073741824,null):(R=u.children,n=u.fallback,y?(u=s.mode,y=s.child,R={mode:"hidden",children:R},(u&1)===0&&y!==null?(y.childLanes=0,y.pendingProps=R):y=iu(R,u,0,null),n=na(n,u,o,null),y.return=s,n.return=s,y.sibling=n,s.child=y,s.child.memoizedState=Ah(o),s.memoizedState=Rh,n):Ph(s,R));if(p=n.memoizedState,p!==null&&(H=p.dehydrated,H!==null))return WS(n,s,R,u,H,p,o);if(y){y=u.fallback,R=s.mode,p=n.child,H=p.sibling;var W={mode:"hidden",children:u.children};return(R&1)===0&&s.child!==p?(u=s.child,u.childLanes=0,u.pendingProps=W,s.deletions=null):(u=ps(p,W),u.subtreeFlags=p.subtreeFlags&14680064),H!==null?y=ps(H,y):(y=na(y,R,o,null),y.flags|=2),y.return=s,u.return=s,u.sibling=y,s.child=u,u=y,y=s.child,R=n.child.memoizedState,R=R===null?Ah(o):{baseLanes:R.baseLanes|o,cachePool:null,transitions:R.transitions},y.memoizedState=R,y.childLanes=n.childLanes&~o,s.memoizedState=Rh,u}return y=n.child,n=y.sibling,u=ps(y,{mode:"visible",children:u.children}),(s.mode&1)===0&&(u.lanes=o),u.return=s,u.sibling=null,n!==null&&(o=s.deletions,o===null?(s.deletions=[n],s.flags|=16):o.push(n)),s.child=u,s.memoizedState=null,u}function Ph(n,s){return s=iu({mode:"visible",children:s},n.mode,0,null),s.return=n,n.child=s}function jc(n,s,o,u){return u!==null&&ih(u),Va(s,n.child,null,o),n=Ph(s,s.pendingProps.children),n.flags|=2,s.memoizedState=null,n}function WS(n,s,o,u,p,y,R){if(o)return s.flags&256?(s.flags&=-257,u=wh(Error(t(422))),jc(n,s,R,u)):s.memoizedState!==null?(s.child=n.child,s.flags|=128,null):(y=u.fallback,p=s.mode,u=iu({mode:"visible",children:u.children},p,0,null),y=na(y,p,R,null),y.flags|=2,u.return=s,y.return=s,u.sibling=y,s.child=u,(s.mode&1)!==0&&Va(s,n.child,null,R),s.child.memoizedState=Ah(R),s.memoizedState=Rh,y);if((s.mode&1)===0)return jc(n,s,R,null);if(p.data==="$!"){if(u=p.nextSibling&&p.nextSibling.dataset,u)var H=u.dgst;return u=H,y=Error(t(419)),u=wh(y,u,void 0),jc(n,s,R,u)}if(H=(R&n.childLanes)!==0,ri||H){if(u=Cn,u!==null){switch(R&-R){case 4:p=2;break;case 16:p=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:p=32;break;case 536870912:p=268435456;break;default:p=0}p=(p&(u.suspendedLanes|R))!==0?0:p,p!==0&&p!==y.retryLane&&(y.retryLane=p,Cr(n,p),Gi(u,n,p,-1))}return Xh(),u=wh(Error(t(421))),jc(n,s,R,u)}return p.data==="$?"?(s.flags|=128,s.child=n.child,s=rM.bind(null,n),p._reactRetry=s,null):(n=y.treeContext,mi=is(p.nextSibling),pi=s,nn=!0,zi=null,n!==null&&(bi[Ti++]=br,bi[Ti++]=Tr,bi[Ti++]=$s,br=n.id,Tr=n.overflow,$s=s),s=Ph(s,u.children),s.flags|=4096,s)}function F0(n,s,o){n.lanes|=s;var u=n.alternate;u!==null&&(u.lanes|=s),oh(n.return,s,o)}function Nh(n,s,o,u,p){var y=n.memoizedState;y===null?n.memoizedState={isBackwards:s,rendering:null,renderingStartTime:0,last:u,tail:o,tailMode:p}:(y.isBackwards=s,y.rendering=null,y.renderingStartTime=0,y.last=u,y.tail=o,y.tailMode=p)}function O0(n,s,o){var u=s.pendingProps,p=u.revealOrder,y=u.tail;if(qn(n,s,u.children,o),u=ln.current,(u&2)!==0)u=u&1|2,s.flags|=128;else{if(n!==null&&(n.flags&128)!==0)e:for(n=s.child;n!==null;){if(n.tag===13)n.memoizedState!==null&&F0(n,o,s);else if(n.tag===19)F0(n,o,s);else if(n.child!==null){n.child.return=n,n=n.child;continue}if(n===s)break e;for(;n.sibling===null;){if(n.return===null||n.return===s)break e;n=n.return}n.sibling.return=n.return,n=n.sibling}u&=1}if(Kt(ln,u),(s.mode&1)===0)s.memoizedState=null;else switch(p){case"forwards":for(o=s.child,p=null;o!==null;)n=o.alternate,n!==null&&Oc(n)===null&&(p=o),o=o.sibling;o=p,o===null?(p=s.child,s.child=null):(p=o.sibling,o.sibling=null),Nh(s,!1,p,o,y);break;case"backwards":for(o=null,p=s.child,s.child=null;p!==null;){if(n=p.alternate,n!==null&&Oc(n)===null){s.child=p;break}n=p.sibling,p.sibling=o,o=p,p=n}Nh(s,!0,o,null,y);break;case"together":Nh(s,!1,null,null,void 0);break;default:s.memoizedState=null}return s.child}function Wc(n,s){(s.mode&1)===0&&n!==null&&(n.alternate=null,s.alternate=null,s.flags|=2)}function Ar(n,s,o){if(n!==null&&(s.dependencies=n.dependencies),Zs|=s.lanes,(o&s.childLanes)===0)return null;if(n!==null&&s.child!==n.child)throw Error(t(153));if(s.child!==null){for(n=s.child,o=ps(n,n.pendingProps),s.child=o,o.return=s;n.sibling!==null;)n=n.sibling,o=o.sibling=ps(n,n.pendingProps),o.return=s;o.sibling=null}return s.child}function XS(n,s,o){switch(s.tag){case 3:D0(s),Ha();break;case 5:Qg(s);break;case 1:ii(s.type)&&Cc(s);break;case 4:uh(s,s.stateNode.containerInfo);break;case 10:var u=s.type._context,p=s.memoizedProps.value;Kt(Dc,u._currentValue),u._currentValue=p;break;case 13:if(u=s.memoizedState,u!==null)return u.dehydrated!==null?(Kt(ln,ln.current&1),s.flags|=128,null):(o&s.child.childLanes)!==0?U0(n,s,o):(Kt(ln,ln.current&1),n=Ar(n,s,o),n!==null?n.sibling:null);Kt(ln,ln.current&1);break;case 19:if(u=(o&s.childLanes)!==0,(n.flags&128)!==0){if(u)return O0(n,s,o);s.flags|=128}if(p=s.memoizedState,p!==null&&(p.rendering=null,p.tail=null,p.lastEffect=null),Kt(ln,ln.current),u)break;return null;case 22:case 23:return s.lanes=0,P0(n,s,o)}return Ar(n,s,o)}var k0,Lh,z0,B0;k0=function(n,s){for(var o=s.child;o!==null;){if(o.tag===5||o.tag===6)n.appendChild(o.stateNode);else if(o.tag!==4&&o.child!==null){o.child.return=o,o=o.child;continue}if(o===s)break;for(;o.sibling===null;){if(o.return===null||o.return===s)return;o=o.return}o.sibling.return=o.return,o=o.sibling}},Lh=function(){},z0=function(n,s,o,u){var p=n.memoizedProps;if(p!==u){n=s.stateNode,Ks(ir.current);var y=null;switch(o){case"input":p=Rt(n,p),u=Rt(n,u),y=[];break;case"select":p=ce({},p,{value:void 0}),u=ce({},u,{value:void 0}),y=[];break;case"textarea":p=zt(n,p),u=zt(n,u),y=[];break;default:typeof p.onClick!="function"&&typeof u.onClick=="function"&&(n.onclick=wc)}We(o,u);var R;o=null;for(pe in p)if(!u.hasOwnProperty(pe)&&p.hasOwnProperty(pe)&&p[pe]!=null)if(pe==="style"){var H=p[pe];for(R in H)H.hasOwnProperty(R)&&(o||(o={}),o[R]="")}else pe!=="dangerouslySetInnerHTML"&&pe!=="children"&&pe!=="suppressContentEditableWarning"&&pe!=="suppressHydrationWarning"&&pe!=="autoFocus"&&(a.hasOwnProperty(pe)?y||(y=[]):(y=y||[]).push(pe,null));for(pe in u){var W=u[pe];if(H=p!=null?p[pe]:void 0,u.hasOwnProperty(pe)&&W!==H&&(W!=null||H!=null))if(pe==="style")if(H){for(R in H)!H.hasOwnProperty(R)||W&&W.hasOwnProperty(R)||(o||(o={}),o[R]="");for(R in W)W.hasOwnProperty(R)&&H[R]!==W[R]&&(o||(o={}),o[R]=W[R])}else o||(y||(y=[]),y.push(pe,o)),o=W;else pe==="dangerouslySetInnerHTML"?(W=W?W.__html:void 0,H=H?H.__html:void 0,W!=null&&H!==W&&(y=y||[]).push(pe,W)):pe==="children"?typeof W!="string"&&typeof W!="number"||(y=y||[]).push(pe,""+W):pe!=="suppressContentEditableWarning"&&pe!=="suppressHydrationWarning"&&(a.hasOwnProperty(pe)?(W!=null&&pe==="onScroll"&&Zt("scroll",n),y||H===W||(y=[])):(y=y||[]).push(pe,W))}o&&(y=y||[]).push("style",o);var pe=y;(s.updateQueue=pe)&&(s.flags|=4)}},B0=function(n,s,o,u){o!==u&&(s.flags|=4)};function vl(n,s){if(!nn)switch(n.tailMode){case"hidden":s=n.tail;for(var o=null;s!==null;)s.alternate!==null&&(o=s),s=s.sibling;o===null?n.tail=null:o.sibling=null;break;case"collapsed":o=n.tail;for(var u=null;o!==null;)o.alternate!==null&&(u=o),o=o.sibling;u===null?s||n.tail===null?n.tail=null:n.tail.sibling=null:u.sibling=null}}function Bn(n){var s=n.alternate!==null&&n.alternate.child===n.child,o=0,u=0;if(s)for(var p=n.child;p!==null;)o|=p.lanes|p.childLanes,u|=p.subtreeFlags&14680064,u|=p.flags&14680064,p.return=n,p=p.sibling;else for(p=n.child;p!==null;)o|=p.lanes|p.childLanes,u|=p.subtreeFlags,u|=p.flags,p.return=n,p=p.sibling;return n.subtreeFlags|=u,n.childLanes=o,s}function $S(n,s,o){var u=s.pendingProps;switch(eh(s),s.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return Bn(s),null;case 1:return ii(s.type)&&Tc(),Bn(s),null;case 3:return u=s.stateNode,Wa(),Jt(ni),Jt(kn),fh(),u.pendingContext&&(u.context=u.pendingContext,u.pendingContext=null),(n===null||n.child===null)&&(Nc(s)?s.flags|=4:n===null||n.memoizedState.isDehydrated&&(s.flags&256)===0||(s.flags|=1024,zi!==null&&(Gh(zi),zi=null))),Lh(n,s),Bn(s),null;case 5:dh(s);var p=Ks(fl.current);if(o=s.type,n!==null&&s.stateNode!=null)z0(n,s,o,u,p),n.ref!==s.ref&&(s.flags|=512,s.flags|=2097152);else{if(!u){if(s.stateNode===null)throw Error(t(166));return Bn(s),null}if(n=Ks(ir.current),Nc(s)){u=s.stateNode,o=s.type;var y=s.memoizedProps;switch(u[nr]=s,u[ll]=y,n=(s.mode&1)!==0,o){case"dialog":Zt("cancel",u),Zt("close",u);break;case"iframe":case"object":case"embed":Zt("load",u);break;case"video":case"audio":for(p=0;p<sl.length;p++)Zt(sl[p],u);break;case"source":Zt("error",u);break;case"img":case"image":case"link":Zt("error",u),Zt("load",u);break;case"details":Zt("toggle",u);break;case"input":mt(u,y),Zt("invalid",u);break;case"select":u._wrapperState={wasMultiple:!!y.multiple},Zt("invalid",u);break;case"textarea":Y(u,y),Zt("invalid",u)}We(o,y),p=null;for(var R in y)if(y.hasOwnProperty(R)){var H=y[R];R==="children"?typeof H=="string"?u.textContent!==H&&(y.suppressHydrationWarning!==!0&&Ec(u.textContent,H,n),p=["children",H]):typeof H=="number"&&u.textContent!==""+H&&(y.suppressHydrationWarning!==!0&&Ec(u.textContent,H,n),p=["children",""+H]):a.hasOwnProperty(R)&&H!=null&&R==="onScroll"&&Zt("scroll",u)}switch(o){case"input":tt(u),Xt(u,y,!0);break;case"textarea":tt(u),wt(u);break;case"select":case"option":break;default:typeof y.onClick=="function"&&(u.onclick=wc)}u=p,s.updateQueue=u,u!==null&&(s.flags|=4)}else{R=p.nodeType===9?p:p.ownerDocument,n==="http://www.w3.org/1999/xhtml"&&(n=O(o)),n==="http://www.w3.org/1999/xhtml"?o==="script"?(n=R.createElement("div"),n.innerHTML="<script><\/script>",n=n.removeChild(n.firstChild)):typeof u.is=="string"?n=R.createElement(o,{is:u.is}):(n=R.createElement(o),o==="select"&&(R=n,u.multiple?R.multiple=!0:u.size&&(R.size=u.size))):n=R.createElementNS(n,o),n[nr]=s,n[ll]=u,k0(n,s,!1,!1),s.stateNode=n;e:{switch(R=ne(o,u),o){case"dialog":Zt("cancel",n),Zt("close",n),p=u;break;case"iframe":case"object":case"embed":Zt("load",n),p=u;break;case"video":case"audio":for(p=0;p<sl.length;p++)Zt(sl[p],n);p=u;break;case"source":Zt("error",n),p=u;break;case"img":case"image":case"link":Zt("error",n),Zt("load",n),p=u;break;case"details":Zt("toggle",n),p=u;break;case"input":mt(n,u),p=Rt(n,u),Zt("invalid",n);break;case"option":p=u;break;case"select":n._wrapperState={wasMultiple:!!u.multiple},p=ce({},u,{value:void 0}),Zt("invalid",n);break;case"textarea":Y(n,u),p=zt(n,u),Zt("invalid",n);break;default:p=u}We(o,p),H=p;for(y in H)if(H.hasOwnProperty(y)){var W=H[y];y==="style"?ve(n,W):y==="dangerouslySetInnerHTML"?(W=W?W.__html:void 0,W!=null&&Q(n,W)):y==="children"?typeof W=="string"?(o!=="textarea"||W!=="")&&me(n,W):typeof W=="number"&&me(n,""+W):y!=="suppressContentEditableWarning"&&y!=="suppressHydrationWarning"&&y!=="autoFocus"&&(a.hasOwnProperty(y)?W!=null&&y==="onScroll"&&Zt("scroll",n):W!=null&&N(n,y,W,R))}switch(o){case"input":tt(n),Xt(n,u,!1);break;case"textarea":tt(n),wt(n);break;case"option":u.value!=null&&n.setAttribute("value",""+ge(u.value));break;case"select":n.multiple=!!u.multiple,y=u.value,y!=null?Et(n,!!u.multiple,y,!1):u.defaultValue!=null&&Et(n,!!u.multiple,u.defaultValue,!0);break;default:typeof p.onClick=="function"&&(n.onclick=wc)}switch(o){case"button":case"input":case"select":case"textarea":u=!!u.autoFocus;break e;case"img":u=!0;break e;default:u=!1}}u&&(s.flags|=4)}s.ref!==null&&(s.flags|=512,s.flags|=2097152)}return Bn(s),null;case 6:if(n&&s.stateNode!=null)B0(n,s,n.memoizedProps,u);else{if(typeof u!="string"&&s.stateNode===null)throw Error(t(166));if(o=Ks(fl.current),Ks(ir.current),Nc(s)){if(u=s.stateNode,o=s.memoizedProps,u[nr]=s,(y=u.nodeValue!==o)&&(n=pi,n!==null))switch(n.tag){case 3:Ec(u.nodeValue,o,(n.mode&1)!==0);break;case 5:n.memoizedProps.suppressHydrationWarning!==!0&&Ec(u.nodeValue,o,(n.mode&1)!==0)}y&&(s.flags|=4)}else u=(o.nodeType===9?o:o.ownerDocument).createTextNode(u),u[nr]=s,s.stateNode=u}return Bn(s),null;case 13:if(Jt(ln),u=s.memoizedState,n===null||n.memoizedState!==null&&n.memoizedState.dehydrated!==null){if(nn&&mi!==null&&(s.mode&1)!==0&&(s.flags&128)===0)Gg(),Ha(),s.flags|=98560,y=!1;else if(y=Nc(s),u!==null&&u.dehydrated!==null){if(n===null){if(!y)throw Error(t(318));if(y=s.memoizedState,y=y!==null?y.dehydrated:null,!y)throw Error(t(317));y[nr]=s}else Ha(),(s.flags&128)===0&&(s.memoizedState=null),s.flags|=4;Bn(s),y=!1}else zi!==null&&(Gh(zi),zi=null),y=!0;if(!y)return s.flags&65536?s:null}return(s.flags&128)!==0?(s.lanes=o,s):(u=u!==null,u!==(n!==null&&n.memoizedState!==null)&&u&&(s.child.flags|=8192,(s.mode&1)!==0&&(n===null||(ln.current&1)!==0?yn===0&&(yn=3):Xh())),s.updateQueue!==null&&(s.flags|=4),Bn(s),null);case 4:return Wa(),Lh(n,s),n===null&&al(s.stateNode.containerInfo),Bn(s),null;case 10:return ah(s.type._context),Bn(s),null;case 17:return ii(s.type)&&Tc(),Bn(s),null;case 19:if(Jt(ln),y=s.memoizedState,y===null)return Bn(s),null;if(u=(s.flags&128)!==0,R=y.rendering,R===null)if(u)vl(y,!1);else{if(yn!==0||n!==null&&(n.flags&128)!==0)for(n=s.child;n!==null;){if(R=Oc(n),R!==null){for(s.flags|=128,vl(y,!1),u=R.updateQueue,u!==null&&(s.updateQueue=u,s.flags|=4),s.subtreeFlags=0,u=o,o=s.child;o!==null;)y=o,n=u,y.flags&=14680066,R=y.alternate,R===null?(y.childLanes=0,y.lanes=n,y.child=null,y.subtreeFlags=0,y.memoizedProps=null,y.memoizedState=null,y.updateQueue=null,y.dependencies=null,y.stateNode=null):(y.childLanes=R.childLanes,y.lanes=R.lanes,y.child=R.child,y.subtreeFlags=0,y.deletions=null,y.memoizedProps=R.memoizedProps,y.memoizedState=R.memoizedState,y.updateQueue=R.updateQueue,y.type=R.type,n=R.dependencies,y.dependencies=n===null?null:{lanes:n.lanes,firstContext:n.firstContext}),o=o.sibling;return Kt(ln,ln.current&1|2),s.child}n=n.sibling}y.tail!==null&&on()>Ya&&(s.flags|=128,u=!0,vl(y,!1),s.lanes=4194304)}else{if(!u)if(n=Oc(R),n!==null){if(s.flags|=128,u=!0,o=n.updateQueue,o!==null&&(s.updateQueue=o,s.flags|=4),vl(y,!0),y.tail===null&&y.tailMode==="hidden"&&!R.alternate&&!nn)return Bn(s),null}else 2*on()-y.renderingStartTime>Ya&&o!==1073741824&&(s.flags|=128,u=!0,vl(y,!1),s.lanes=4194304);y.isBackwards?(R.sibling=s.child,s.child=R):(o=y.last,o!==null?o.sibling=R:s.child=R,y.last=R)}return y.tail!==null?(s=y.tail,y.rendering=s,y.tail=s.sibling,y.renderingStartTime=on(),s.sibling=null,o=ln.current,Kt(ln,u?o&1|2:o&1),s):(Bn(s),null);case 22:case 23:return Wh(),u=s.memoizedState!==null,n!==null&&n.memoizedState!==null!==u&&(s.flags|=8192),u&&(s.mode&1)!==0?(gi&1073741824)!==0&&(Bn(s),s.subtreeFlags&6&&(s.flags|=8192)):Bn(s),null;case 24:return null;case 25:return null}throw Error(t(156,s.tag))}function qS(n,s){switch(eh(s),s.tag){case 1:return ii(s.type)&&Tc(),n=s.flags,n&65536?(s.flags=n&-65537|128,s):null;case 3:return Wa(),Jt(ni),Jt(kn),fh(),n=s.flags,(n&65536)!==0&&(n&128)===0?(s.flags=n&-65537|128,s):null;case 5:return dh(s),null;case 13:if(Jt(ln),n=s.memoizedState,n!==null&&n.dehydrated!==null){if(s.alternate===null)throw Error(t(340));Ha()}return n=s.flags,n&65536?(s.flags=n&-65537|128,s):null;case 19:return Jt(ln),null;case 4:return Wa(),null;case 10:return ah(s.type._context),null;case 22:case 23:return Wh(),null;case 24:return null;default:return null}}var Xc=!1,Hn=!1,YS=typeof WeakSet=="function"?WeakSet:Set,Xe=null;function $a(n,s){var o=n.ref;if(o!==null)if(typeof o=="function")try{o(null)}catch(u){dn(n,s,u)}else o.current=null}function Dh(n,s,o){try{o()}catch(u){dn(n,s,u)}}var H0=!1;function KS(n,s){if(Wd=hc,n=_g(),Od(n)){if("selectionStart"in n)var o={start:n.selectionStart,end:n.selectionEnd};else e:{o=(o=n.ownerDocument)&&o.defaultView||window;var u=o.getSelection&&o.getSelection();if(u&&u.rangeCount!==0){o=u.anchorNode;var p=u.anchorOffset,y=u.focusNode;u=u.focusOffset;try{o.nodeType,y.nodeType}catch{o=null;break e}var R=0,H=-1,W=-1,pe=0,be=0,Te=n,we=null;t:for(;;){for(var Ve;Te!==o||p!==0&&Te.nodeType!==3||(H=R+p),Te!==y||u!==0&&Te.nodeType!==3||(W=R+u),Te.nodeType===3&&(R+=Te.nodeValue.length),(Ve=Te.firstChild)!==null;)we=Te,Te=Ve;for(;;){if(Te===n)break t;if(we===o&&++pe===p&&(H=R),we===y&&++be===u&&(W=R),(Ve=Te.nextSibling)!==null)break;Te=we,we=Te.parentNode}Te=Ve}o=H===-1||W===-1?null:{start:H,end:W}}else o=null}o=o||{start:0,end:0}}else o=null;for(Xd={focusedElem:n,selectionRange:o},hc=!1,Xe=s;Xe!==null;)if(s=Xe,n=s.child,(s.subtreeFlags&1028)!==0&&n!==null)n.return=s,Xe=n;else for(;Xe!==null;){s=Xe;try{var qe=s.alternate;if((s.flags&1024)!==0)switch(s.tag){case 0:case 11:case 15:break;case 1:if(qe!==null){var Qe=qe.memoizedProps,mn=qe.memoizedState,ie=s.stateNode,K=ie.getSnapshotBeforeUpdate(s.elementType===s.type?Qe:Bi(s.type,Qe),mn);ie.__reactInternalSnapshotBeforeUpdate=K}break;case 3:var ue=s.stateNode.containerInfo;ue.nodeType===1?ue.textContent="":ue.nodeType===9&&ue.documentElement&&ue.removeChild(ue.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(t(163))}}catch(Ce){dn(s,s.return,Ce)}if(n=s.sibling,n!==null){n.return=s.return,Xe=n;break}Xe=s.return}return qe=H0,H0=!1,qe}function _l(n,s,o){var u=s.updateQueue;if(u=u!==null?u.lastEffect:null,u!==null){var p=u=u.next;do{if((p.tag&n)===n){var y=p.destroy;p.destroy=void 0,y!==void 0&&Dh(s,o,y)}p=p.next}while(p!==u)}}function $c(n,s){if(s=s.updateQueue,s=s!==null?s.lastEffect:null,s!==null){var o=s=s.next;do{if((o.tag&n)===n){var u=o.create;o.destroy=u()}o=o.next}while(o!==s)}}function Ih(n){var s=n.ref;if(s!==null){var o=n.stateNode;switch(n.tag){case 5:n=o;break;default:n=o}typeof s=="function"?s(n):s.current=n}}function V0(n){var s=n.alternate;s!==null&&(n.alternate=null,V0(s)),n.child=null,n.deletions=null,n.sibling=null,n.tag===5&&(s=n.stateNode,s!==null&&(delete s[nr],delete s[ll],delete s[Kd],delete s[LS],delete s[DS])),n.stateNode=null,n.return=null,n.dependencies=null,n.memoizedProps=null,n.memoizedState=null,n.pendingProps=null,n.stateNode=null,n.updateQueue=null}function G0(n){return n.tag===5||n.tag===3||n.tag===4}function j0(n){e:for(;;){for(;n.sibling===null;){if(n.return===null||G0(n.return))return null;n=n.return}for(n.sibling.return=n.return,n=n.sibling;n.tag!==5&&n.tag!==6&&n.tag!==18;){if(n.flags&2||n.child===null||n.tag===4)continue e;n.child.return=n,n=n.child}if(!(n.flags&2))return n.stateNode}}function Uh(n,s,o){var u=n.tag;if(u===5||u===6)n=n.stateNode,s?o.nodeType===8?o.parentNode.insertBefore(n,s):o.insertBefore(n,s):(o.nodeType===8?(s=o.parentNode,s.insertBefore(n,o)):(s=o,s.appendChild(n)),o=o._reactRootContainer,o!=null||s.onclick!==null||(s.onclick=wc));else if(u!==4&&(n=n.child,n!==null))for(Uh(n,s,o),n=n.sibling;n!==null;)Uh(n,s,o),n=n.sibling}function Fh(n,s,o){var u=n.tag;if(u===5||u===6)n=n.stateNode,s?o.insertBefore(n,s):o.appendChild(n);else if(u!==4&&(n=n.child,n!==null))for(Fh(n,s,o),n=n.sibling;n!==null;)Fh(n,s,o),n=n.sibling}var Ln=null,Hi=!1;function cs(n,s,o){for(o=o.child;o!==null;)W0(n,s,o),o=o.sibling}function W0(n,s,o){if(Ne&&typeof Ne.onCommitFiberUnmount=="function")try{Ne.onCommitFiberUnmount(se,o)}catch{}switch(o.tag){case 5:Hn||$a(o,s);case 6:var u=Ln,p=Hi;Ln=null,cs(n,s,o),Ln=u,Hi=p,Ln!==null&&(Hi?(n=Ln,o=o.stateNode,n.nodeType===8?n.parentNode.removeChild(o):n.removeChild(o)):Ln.removeChild(o.stateNode));break;case 18:Ln!==null&&(Hi?(n=Ln,o=o.stateNode,n.nodeType===8?Yd(n.parentNode,o):n.nodeType===1&&Yd(n,o),Qo(n)):Yd(Ln,o.stateNode));break;case 4:u=Ln,p=Hi,Ln=o.stateNode.containerInfo,Hi=!0,cs(n,s,o),Ln=u,Hi=p;break;case 0:case 11:case 14:case 15:if(!Hn&&(u=o.updateQueue,u!==null&&(u=u.lastEffect,u!==null))){p=u=u.next;do{var y=p,R=y.destroy;y=y.tag,R!==void 0&&((y&2)!==0||(y&4)!==0)&&Dh(o,s,R),p=p.next}while(p!==u)}cs(n,s,o);break;case 1:if(!Hn&&($a(o,s),u=o.stateNode,typeof u.componentWillUnmount=="function"))try{u.props=o.memoizedProps,u.state=o.memoizedState,u.componentWillUnmount()}catch(H){dn(o,s,H)}cs(n,s,o);break;case 21:cs(n,s,o);break;case 22:o.mode&1?(Hn=(u=Hn)||o.memoizedState!==null,cs(n,s,o),Hn=u):cs(n,s,o);break;default:cs(n,s,o)}}function X0(n){var s=n.updateQueue;if(s!==null){n.updateQueue=null;var o=n.stateNode;o===null&&(o=n.stateNode=new YS),s.forEach(function(u){var p=sM.bind(null,n,u);o.has(u)||(o.add(u),u.then(p,p))})}}function Vi(n,s){var o=s.deletions;if(o!==null)for(var u=0;u<o.length;u++){var p=o[u];try{var y=n,R=s,H=R;e:for(;H!==null;){switch(H.tag){case 5:Ln=H.stateNode,Hi=!1;break e;case 3:Ln=H.stateNode.containerInfo,Hi=!0;break e;case 4:Ln=H.stateNode.containerInfo,Hi=!0;break e}H=H.return}if(Ln===null)throw Error(t(160));W0(y,R,p),Ln=null,Hi=!1;var W=p.alternate;W!==null&&(W.return=null),p.return=null}catch(pe){dn(p,s,pe)}}if(s.subtreeFlags&12854)for(s=s.child;s!==null;)$0(s,n),s=s.sibling}function $0(n,s){var o=n.alternate,u=n.flags;switch(n.tag){case 0:case 11:case 14:case 15:if(Vi(s,n),sr(n),u&4){try{_l(3,n,n.return),$c(3,n)}catch(Qe){dn(n,n.return,Qe)}try{_l(5,n,n.return)}catch(Qe){dn(n,n.return,Qe)}}break;case 1:Vi(s,n),sr(n),u&512&&o!==null&&$a(o,o.return);break;case 5:if(Vi(s,n),sr(n),u&512&&o!==null&&$a(o,o.return),n.flags&32){var p=n.stateNode;try{me(p,"")}catch(Qe){dn(n,n.return,Qe)}}if(u&4&&(p=n.stateNode,p!=null)){var y=n.memoizedProps,R=o!==null?o.memoizedProps:y,H=n.type,W=n.updateQueue;if(n.updateQueue=null,W!==null)try{H==="input"&&y.type==="radio"&&y.name!=null&&vt(p,y),ne(H,R);var pe=ne(H,y);for(R=0;R<W.length;R+=2){var be=W[R],Te=W[R+1];be==="style"?ve(p,Te):be==="dangerouslySetInnerHTML"?Q(p,Te):be==="children"?me(p,Te):N(p,be,Te,pe)}switch(H){case"input":kt(p,y);break;case"textarea":pn(p,y);break;case"select":var we=p._wrapperState.wasMultiple;p._wrapperState.wasMultiple=!!y.multiple;var Ve=y.value;Ve!=null?Et(p,!!y.multiple,Ve,!1):we!==!!y.multiple&&(y.defaultValue!=null?Et(p,!!y.multiple,y.defaultValue,!0):Et(p,!!y.multiple,y.multiple?[]:"",!1))}p[ll]=y}catch(Qe){dn(n,n.return,Qe)}}break;case 6:if(Vi(s,n),sr(n),u&4){if(n.stateNode===null)throw Error(t(162));p=n.stateNode,y=n.memoizedProps;try{p.nodeValue=y}catch(Qe){dn(n,n.return,Qe)}}break;case 3:if(Vi(s,n),sr(n),u&4&&o!==null&&o.memoizedState.isDehydrated)try{Qo(s.containerInfo)}catch(Qe){dn(n,n.return,Qe)}break;case 4:Vi(s,n),sr(n);break;case 13:Vi(s,n),sr(n),p=n.child,p.flags&8192&&(y=p.memoizedState!==null,p.stateNode.isHidden=y,!y||p.alternate!==null&&p.alternate.memoizedState!==null||(zh=on())),u&4&&X0(n);break;case 22:if(be=o!==null&&o.memoizedState!==null,n.mode&1?(Hn=(pe=Hn)||be,Vi(s,n),Hn=pe):Vi(s,n),sr(n),u&8192){if(pe=n.memoizedState!==null,(n.stateNode.isHidden=pe)&&!be&&(n.mode&1)!==0)for(Xe=n,be=n.child;be!==null;){for(Te=Xe=be;Xe!==null;){switch(we=Xe,Ve=we.child,we.tag){case 0:case 11:case 14:case 15:_l(4,we,we.return);break;case 1:$a(we,we.return);var qe=we.stateNode;if(typeof qe.componentWillUnmount=="function"){u=we,o=we.return;try{s=u,qe.props=s.memoizedProps,qe.state=s.memoizedState,qe.componentWillUnmount()}catch(Qe){dn(u,o,Qe)}}break;case 5:$a(we,we.return);break;case 22:if(we.memoizedState!==null){K0(Te);continue}}Ve!==null?(Ve.return=we,Xe=Ve):K0(Te)}be=be.sibling}e:for(be=null,Te=n;;){if(Te.tag===5){if(be===null){be=Te;try{p=Te.stateNode,pe?(y=p.style,typeof y.setProperty=="function"?y.setProperty("display","none","important"):y.display="none"):(H=Te.stateNode,W=Te.memoizedProps.style,R=W!=null&&W.hasOwnProperty("display")?W.display:null,H.style.display=xe("display",R))}catch(Qe){dn(n,n.return,Qe)}}}else if(Te.tag===6){if(be===null)try{Te.stateNode.nodeValue=pe?"":Te.memoizedProps}catch(Qe){dn(n,n.return,Qe)}}else if((Te.tag!==22&&Te.tag!==23||Te.memoizedState===null||Te===n)&&Te.child!==null){Te.child.return=Te,Te=Te.child;continue}if(Te===n)break e;for(;Te.sibling===null;){if(Te.return===null||Te.return===n)break e;be===Te&&(be=null),Te=Te.return}be===Te&&(be=null),Te.sibling.return=Te.return,Te=Te.sibling}}break;case 19:Vi(s,n),sr(n),u&4&&X0(n);break;case 21:break;default:Vi(s,n),sr(n)}}function sr(n){var s=n.flags;if(s&2){try{e:{for(var o=n.return;o!==null;){if(G0(o)){var u=o;break e}o=o.return}throw Error(t(160))}switch(u.tag){case 5:var p=u.stateNode;u.flags&32&&(me(p,""),u.flags&=-33);var y=j0(n);Fh(n,y,p);break;case 3:case 4:var R=u.stateNode.containerInfo,H=j0(n);Uh(n,H,R);break;default:throw Error(t(161))}}catch(W){dn(n,n.return,W)}n.flags&=-3}s&4096&&(n.flags&=-4097)}function QS(n,s,o){Xe=n,q0(n)}function q0(n,s,o){for(var u=(n.mode&1)!==0;Xe!==null;){var p=Xe,y=p.child;if(p.tag===22&&u){var R=p.memoizedState!==null||Xc;if(!R){var H=p.alternate,W=H!==null&&H.memoizedState!==null||Hn;H=Xc;var pe=Hn;if(Xc=R,(Hn=W)&&!pe)for(Xe=p;Xe!==null;)R=Xe,W=R.child,R.tag===22&&R.memoizedState!==null?Q0(p):W!==null?(W.return=R,Xe=W):Q0(p);for(;y!==null;)Xe=y,q0(y),y=y.sibling;Xe=p,Xc=H,Hn=pe}Y0(n)}else(p.subtreeFlags&8772)!==0&&y!==null?(y.return=p,Xe=y):Y0(n)}}function Y0(n){for(;Xe!==null;){var s=Xe;if((s.flags&8772)!==0){var o=s.alternate;try{if((s.flags&8772)!==0)switch(s.tag){case 0:case 11:case 15:Hn||$c(5,s);break;case 1:var u=s.stateNode;if(s.flags&4&&!Hn)if(o===null)u.componentDidMount();else{var p=s.elementType===s.type?o.memoizedProps:Bi(s.type,o.memoizedProps);u.componentDidUpdate(p,o.memoizedState,u.__reactInternalSnapshotBeforeUpdate)}var y=s.updateQueue;y!==null&&Kg(s,y,u);break;case 3:var R=s.updateQueue;if(R!==null){if(o=null,s.child!==null)switch(s.child.tag){case 5:o=s.child.stateNode;break;case 1:o=s.child.stateNode}Kg(s,R,o)}break;case 5:var H=s.stateNode;if(o===null&&s.flags&4){o=H;var W=s.memoizedProps;switch(s.type){case"button":case"input":case"select":case"textarea":W.autoFocus&&o.focus();break;case"img":W.src&&(o.src=W.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(s.memoizedState===null){var pe=s.alternate;if(pe!==null){var be=pe.memoizedState;if(be!==null){var Te=be.dehydrated;Te!==null&&Qo(Te)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(t(163))}Hn||s.flags&512&&Ih(s)}catch(we){dn(s,s.return,we)}}if(s===n){Xe=null;break}if(o=s.sibling,o!==null){o.return=s.return,Xe=o;break}Xe=s.return}}function K0(n){for(;Xe!==null;){var s=Xe;if(s===n){Xe=null;break}var o=s.sibling;if(o!==null){o.return=s.return,Xe=o;break}Xe=s.return}}function Q0(n){for(;Xe!==null;){var s=Xe;try{switch(s.tag){case 0:case 11:case 15:var o=s.return;try{$c(4,s)}catch(W){dn(s,o,W)}break;case 1:var u=s.stateNode;if(typeof u.componentDidMount=="function"){var p=s.return;try{u.componentDidMount()}catch(W){dn(s,p,W)}}var y=s.return;try{Ih(s)}catch(W){dn(s,y,W)}break;case 5:var R=s.return;try{Ih(s)}catch(W){dn(s,R,W)}}}catch(W){dn(s,s.return,W)}if(s===n){Xe=null;break}var H=s.sibling;if(H!==null){H.return=s.return,Xe=H;break}Xe=s.return}}var ZS=Math.ceil,qc=C.ReactCurrentDispatcher,Oh=C.ReactCurrentOwner,Ai=C.ReactCurrentBatchConfig,Lt=0,Cn=null,xn=null,Dn=0,gi=0,qa=rs(0),yn=0,yl=null,Zs=0,Yc=0,kh=0,Sl=null,si=null,zh=0,Ya=1/0,Pr=null,Kc=!1,Bh=null,us=null,Qc=!1,ds=null,Zc=0,Ml=0,Hh=null,Jc=-1,eu=0;function Yn(){return(Lt&6)!==0?on():Jc!==-1?Jc:Jc=on()}function hs(n){return(n.mode&1)===0?1:(Lt&2)!==0&&Dn!==0?Dn&-Dn:US.transition!==null?(eu===0&&(eu=He()),eu):(n=St,n!==0||(n=window.event,n=n===void 0?16:Jm(n.type)),n)}function Gi(n,s,o,u){if(50<Ml)throw Ml=0,Hh=null,Error(t(185));yt(n,o,u),((Lt&2)===0||n!==Cn)&&(n===Cn&&((Lt&2)===0&&(Yc|=o),yn===4&&fs(n,Dn)),ai(n,u),o===1&&Lt===0&&(s.mode&1)===0&&(Ya=on()+500,Rc&&as()))}function ai(n,s){var o=n.callbackNode;Bt(n,s);var u=Yt(n,n===Cn?Dn:0);if(u===0)o!==null&&Wo(o),n.callbackNode=null,n.callbackPriority=0;else if(s=u&-u,n.callbackPriority!==s){if(o!=null&&Wo(o),s===1)n.tag===0?IS(J0.bind(null,n)):kg(J0.bind(null,n)),PS(function(){(Lt&6)===0&&as()}),o=null;else{switch(Mr(u)){case 1:o=Xo;break;case 4:o=A;break;case 16:o=J;break;case 536870912:o=oe;break;default:o=J}o=ox(o,Z0.bind(null,n))}n.callbackPriority=s,n.callbackNode=o}}function Z0(n,s){if(Jc=-1,eu=0,(Lt&6)!==0)throw Error(t(327));var o=n.callbackNode;if(Ka()&&n.callbackNode!==o)return null;var u=Yt(n,n===Cn?Dn:0);if(u===0)return null;if((u&30)!==0||(u&n.expiredLanes)!==0||s)s=tu(n,u);else{s=u;var p=Lt;Lt|=2;var y=tx();(Cn!==n||Dn!==s)&&(Pr=null,Ya=on()+500,ea(n,s));do try{tM();break}catch(H){ex(n,H)}while(!0);sh(),qc.current=y,Lt=p,xn!==null?s=0:(Cn=null,Dn=0,s=yn)}if(s!==0){if(s===2&&(p=gn(n),p!==0&&(u=p,s=Vh(n,p))),s===1)throw o=yl,ea(n,0),fs(n,u),ai(n,on()),o;if(s===6)fs(n,u);else{if(p=n.current.alternate,(u&30)===0&&!JS(p)&&(s=tu(n,u),s===2&&(y=gn(n),y!==0&&(u=y,s=Vh(n,y))),s===1))throw o=yl,ea(n,0),fs(n,u),ai(n,on()),o;switch(n.finishedWork=p,n.finishedLanes=u,s){case 0:case 1:throw Error(t(345));case 2:ta(n,si,Pr);break;case 3:if(fs(n,u),(u&130023424)===u&&(s=zh+500-on(),10<s)){if(Yt(n,0)!==0)break;if(p=n.suspendedLanes,(p&u)!==u){Yn(),n.pingedLanes|=n.suspendedLanes&p;break}n.timeoutHandle=qd(ta.bind(null,n,si,Pr),s);break}ta(n,si,Pr);break;case 4:if(fs(n,u),(u&4194240)===u)break;for(s=n.eventTimes,p=-1;0<u;){var R=31-Ae(u);y=1<<R,R=s[R],R>p&&(p=R),u&=~y}if(u=p,u=on()-u,u=(120>u?120:480>u?480:1080>u?1080:1920>u?1920:3e3>u?3e3:4320>u?4320:1960*ZS(u/1960))-u,10<u){n.timeoutHandle=qd(ta.bind(null,n,si,Pr),u);break}ta(n,si,Pr);break;case 5:ta(n,si,Pr);break;default:throw Error(t(329))}}}return ai(n,on()),n.callbackNode===o?Z0.bind(null,n):null}function Vh(n,s){var o=Sl;return n.current.memoizedState.isDehydrated&&(ea(n,s).flags|=256),n=tu(n,s),n!==2&&(s=si,si=o,s!==null&&Gh(s)),n}function Gh(n){si===null?si=n:si.push.apply(si,n)}function JS(n){for(var s=n;;){if(s.flags&16384){var o=s.updateQueue;if(o!==null&&(o=o.stores,o!==null))for(var u=0;u<o.length;u++){var p=o[u],y=p.getSnapshot;p=p.value;try{if(!ki(y(),p))return!1}catch{return!1}}}if(o=s.child,s.subtreeFlags&16384&&o!==null)o.return=s,s=o;else{if(s===n)break;for(;s.sibling===null;){if(s.return===null||s.return===n)return!0;s=s.return}s.sibling.return=s.return,s=s.sibling}}return!0}function fs(n,s){for(s&=~kh,s&=~Yc,n.suspendedLanes|=s,n.pingedLanes&=~s,n=n.expirationTimes;0<s;){var o=31-Ae(s),u=1<<o;n[o]=-1,s&=~u}}function J0(n){if((Lt&6)!==0)throw Error(t(327));Ka();var s=Yt(n,0);if((s&1)===0)return ai(n,on()),null;var o=tu(n,s);if(n.tag!==0&&o===2){var u=gn(n);u!==0&&(s=u,o=Vh(n,u))}if(o===1)throw o=yl,ea(n,0),fs(n,s),ai(n,on()),o;if(o===6)throw Error(t(345));return n.finishedWork=n.current.alternate,n.finishedLanes=s,ta(n,si,Pr),ai(n,on()),null}function jh(n,s){var o=Lt;Lt|=1;try{return n(s)}finally{Lt=o,Lt===0&&(Ya=on()+500,Rc&&as())}}function Js(n){ds!==null&&ds.tag===0&&(Lt&6)===0&&Ka();var s=Lt;Lt|=1;var o=Ai.transition,u=St;try{if(Ai.transition=null,St=1,n)return n()}finally{St=u,Ai.transition=o,Lt=s,(Lt&6)===0&&as()}}function Wh(){gi=qa.current,Jt(qa)}function ea(n,s){n.finishedWork=null,n.finishedLanes=0;var o=n.timeoutHandle;if(o!==-1&&(n.timeoutHandle=-1,AS(o)),xn!==null)for(o=xn.return;o!==null;){var u=o;switch(eh(u),u.tag){case 1:u=u.type.childContextTypes,u!=null&&Tc();break;case 3:Wa(),Jt(ni),Jt(kn),fh();break;case 5:dh(u);break;case 4:Wa();break;case 13:Jt(ln);break;case 19:Jt(ln);break;case 10:ah(u.type._context);break;case 22:case 23:Wh()}o=o.return}if(Cn=n,xn=n=ps(n.current,null),Dn=gi=s,yn=0,yl=null,kh=Yc=Zs=0,si=Sl=null,Ys!==null){for(s=0;s<Ys.length;s++)if(o=Ys[s],u=o.interleaved,u!==null){o.interleaved=null;var p=u.next,y=o.pending;if(y!==null){var R=y.next;y.next=p,u.next=R}o.pending=u}Ys=null}return n}function ex(n,s){do{var o=xn;try{if(sh(),kc.current=Vc,zc){for(var u=cn.memoizedState;u!==null;){var p=u.queue;p!==null&&(p.pending=null),u=u.next}zc=!1}if(Qs=0,Tn=_n=cn=null,pl=!1,ml=0,Oh.current=null,o===null||o.return===null){yn=1,yl=s,xn=null;break}e:{var y=n,R=o.return,H=o,W=s;if(s=Dn,H.flags|=32768,W!==null&&typeof W=="object"&&typeof W.then=="function"){var pe=W,be=H,Te=be.tag;if((be.mode&1)===0&&(Te===0||Te===11||Te===15)){var we=be.alternate;we?(be.updateQueue=we.updateQueue,be.memoizedState=we.memoizedState,be.lanes=we.lanes):(be.updateQueue=null,be.memoizedState=null)}var Ve=b0(R);if(Ve!==null){Ve.flags&=-257,T0(Ve,R,H,y,s),Ve.mode&1&&w0(y,pe,s),s=Ve,W=pe;var qe=s.updateQueue;if(qe===null){var Qe=new Set;Qe.add(W),s.updateQueue=Qe}else qe.add(W);break e}else{if((s&1)===0){w0(y,pe,s),Xh();break e}W=Error(t(426))}}else if(nn&&H.mode&1){var mn=b0(R);if(mn!==null){(mn.flags&65536)===0&&(mn.flags|=256),T0(mn,R,H,y,s),ih(Xa(W,H));break e}}y=W=Xa(W,H),yn!==4&&(yn=2),Sl===null?Sl=[y]:Sl.push(y),y=R;do{switch(y.tag){case 3:y.flags|=65536,s&=-s,y.lanes|=s;var ie=M0(y,W,s);Yg(y,ie);break e;case 1:H=W;var K=y.type,ue=y.stateNode;if((y.flags&128)===0&&(typeof K.getDerivedStateFromError=="function"||ue!==null&&typeof ue.componentDidCatch=="function"&&(us===null||!us.has(ue)))){y.flags|=65536,s&=-s,y.lanes|=s;var Ce=E0(y,H,s);Yg(y,Ce);break e}}y=y.return}while(y!==null)}ix(o)}catch(et){s=et,xn===o&&o!==null&&(xn=o=o.return);continue}break}while(!0)}function tx(){var n=qc.current;return qc.current=Vc,n===null?Vc:n}function Xh(){(yn===0||yn===3||yn===2)&&(yn=4),Cn===null||(Zs&268435455)===0&&(Yc&268435455)===0||fs(Cn,Dn)}function tu(n,s){var o=Lt;Lt|=2;var u=tx();(Cn!==n||Dn!==s)&&(Pr=null,ea(n,s));do try{eM();break}catch(p){ex(n,p)}while(!0);if(sh(),Lt=o,qc.current=u,xn!==null)throw Error(t(261));return Cn=null,Dn=0,yn}function eM(){for(;xn!==null;)nx(xn)}function tM(){for(;xn!==null&&!uc();)nx(xn)}function nx(n){var s=ax(n.alternate,n,gi);n.memoizedProps=n.pendingProps,s===null?ix(n):xn=s,Oh.current=null}function ix(n){var s=n;do{var o=s.alternate;if(n=s.return,(s.flags&32768)===0){if(o=$S(o,s,gi),o!==null){xn=o;return}}else{if(o=qS(o,s),o!==null){o.flags&=32767,xn=o;return}if(n!==null)n.flags|=32768,n.subtreeFlags=0,n.deletions=null;else{yn=6,xn=null;return}}if(s=s.sibling,s!==null){xn=s;return}xn=s=n}while(s!==null);yn===0&&(yn=5)}function ta(n,s,o){var u=St,p=Ai.transition;try{Ai.transition=null,St=1,nM(n,s,o,u)}finally{Ai.transition=p,St=u}return null}function nM(n,s,o,u){do Ka();while(ds!==null);if((Lt&6)!==0)throw Error(t(327));o=n.finishedWork;var p=n.finishedLanes;if(o===null)return null;if(n.finishedWork=null,n.finishedLanes=0,o===n.current)throw Error(t(177));n.callbackNode=null,n.callbackPriority=0;var y=o.lanes|o.childLanes;if(ei(n,y),n===Cn&&(xn=Cn=null,Dn=0),(o.subtreeFlags&2064)===0&&(o.flags&2064)===0||Qc||(Qc=!0,ox(J,function(){return Ka(),null})),y=(o.flags&15990)!==0,(o.subtreeFlags&15990)!==0||y){y=Ai.transition,Ai.transition=null;var R=St;St=1;var H=Lt;Lt|=4,Oh.current=null,KS(n,o),$0(o,n),MS(Xd),hc=!!Wd,Xd=Wd=null,n.current=o,QS(o),wd(),Lt=H,St=R,Ai.transition=y}else n.current=o;if(Qc&&(Qc=!1,ds=n,Zc=p),y=n.pendingLanes,y===0&&(us=null),je(o.stateNode),ai(n,on()),s!==null)for(u=n.onRecoverableError,o=0;o<s.length;o++)p=s[o],u(p.value,{componentStack:p.stack,digest:p.digest});if(Kc)throw Kc=!1,n=Bh,Bh=null,n;return(Zc&1)!==0&&n.tag!==0&&Ka(),y=n.pendingLanes,(y&1)!==0?n===Hh?Ml++:(Ml=0,Hh=n):Ml=0,as(),null}function Ka(){if(ds!==null){var n=Mr(Zc),s=Ai.transition,o=St;try{if(Ai.transition=null,St=16>n?16:n,ds===null)var u=!1;else{if(n=ds,ds=null,Zc=0,(Lt&6)!==0)throw Error(t(331));var p=Lt;for(Lt|=4,Xe=n.current;Xe!==null;){var y=Xe,R=y.child;if((Xe.flags&16)!==0){var H=y.deletions;if(H!==null){for(var W=0;W<H.length;W++){var pe=H[W];for(Xe=pe;Xe!==null;){var be=Xe;switch(be.tag){case 0:case 11:case 15:_l(8,be,y)}var Te=be.child;if(Te!==null)Te.return=be,Xe=Te;else for(;Xe!==null;){be=Xe;var we=be.sibling,Ve=be.return;if(V0(be),be===pe){Xe=null;break}if(we!==null){we.return=Ve,Xe=we;break}Xe=Ve}}}var qe=y.alternate;if(qe!==null){var Qe=qe.child;if(Qe!==null){qe.child=null;do{var mn=Qe.sibling;Qe.sibling=null,Qe=mn}while(Qe!==null)}}Xe=y}}if((y.subtreeFlags&2064)!==0&&R!==null)R.return=y,Xe=R;else e:for(;Xe!==null;){if(y=Xe,(y.flags&2048)!==0)switch(y.tag){case 0:case 11:case 15:_l(9,y,y.return)}var ie=y.sibling;if(ie!==null){ie.return=y.return,Xe=ie;break e}Xe=y.return}}var K=n.current;for(Xe=K;Xe!==null;){R=Xe;var ue=R.child;if((R.subtreeFlags&2064)!==0&&ue!==null)ue.return=R,Xe=ue;else e:for(R=K;Xe!==null;){if(H=Xe,(H.flags&2048)!==0)try{switch(H.tag){case 0:case 11:case 15:$c(9,H)}}catch(et){dn(H,H.return,et)}if(H===R){Xe=null;break e}var Ce=H.sibling;if(Ce!==null){Ce.return=H.return,Xe=Ce;break e}Xe=H.return}}if(Lt=p,as(),Ne&&typeof Ne.onPostCommitFiberRoot=="function")try{Ne.onPostCommitFiberRoot(se,n)}catch{}u=!0}return u}finally{St=o,Ai.transition=s}}return!1}function rx(n,s,o){s=Xa(o,s),s=M0(n,s,1),n=ls(n,s,1),s=Yn(),n!==null&&(yt(n,1,s),ai(n,s))}function dn(n,s,o){if(n.tag===3)rx(n,n,o);else for(;s!==null;){if(s.tag===3){rx(s,n,o);break}else if(s.tag===1){var u=s.stateNode;if(typeof s.type.getDerivedStateFromError=="function"||typeof u.componentDidCatch=="function"&&(us===null||!us.has(u))){n=Xa(o,n),n=E0(s,n,1),s=ls(s,n,1),n=Yn(),s!==null&&(yt(s,1,n),ai(s,n));break}}s=s.return}}function iM(n,s,o){var u=n.pingCache;u!==null&&u.delete(s),s=Yn(),n.pingedLanes|=n.suspendedLanes&o,Cn===n&&(Dn&o)===o&&(yn===4||yn===3&&(Dn&130023424)===Dn&&500>on()-zh?ea(n,0):kh|=o),ai(n,s)}function sx(n,s){s===0&&((n.mode&1)===0?s=1:(s=Je,Je<<=1,(Je&130023424)===0&&(Je=4194304)));var o=Yn();n=Cr(n,s),n!==null&&(yt(n,s,o),ai(n,o))}function rM(n){var s=n.memoizedState,o=0;s!==null&&(o=s.retryLane),sx(n,o)}function sM(n,s){var o=0;switch(n.tag){case 13:var u=n.stateNode,p=n.memoizedState;p!==null&&(o=p.retryLane);break;case 19:u=n.stateNode;break;default:throw Error(t(314))}u!==null&&u.delete(s),sx(n,o)}var ax;ax=function(n,s,o){if(n!==null)if(n.memoizedProps!==s.pendingProps||ni.current)ri=!0;else{if((n.lanes&o)===0&&(s.flags&128)===0)return ri=!1,XS(n,s,o);ri=(n.flags&131072)!==0}else ri=!1,nn&&(s.flags&1048576)!==0&&zg(s,Pc,s.index);switch(s.lanes=0,s.tag){case 2:var u=s.type;Wc(n,s),n=s.pendingProps;var p=ka(s,kn.current);ja(s,o),p=gh(null,s,u,n,p,o);var y=xh();return s.flags|=1,typeof p=="object"&&p!==null&&typeof p.render=="function"&&p.$$typeof===void 0?(s.tag=1,s.memoizedState=null,s.updateQueue=null,ii(u)?(y=!0,Cc(s)):y=!1,s.memoizedState=p.state!==null&&p.state!==void 0?p.state:null,ch(s),p.updater=Gc,s.stateNode=p,p._reactInternals=s,Eh(s,u,n,o),s=Ch(null,s,u,!0,y,o)):(s.tag=0,nn&&y&&Jd(s),qn(null,s,p,o),s=s.child),s;case 16:u=s.elementType;e:{switch(Wc(n,s),n=s.pendingProps,p=u._init,u=p(u._payload),s.type=u,p=s.tag=oM(u),n=Bi(u,n),p){case 0:s=Th(null,s,u,n,o);break e;case 1:s=L0(null,s,u,n,o);break e;case 11:s=C0(null,s,u,n,o);break e;case 14:s=R0(null,s,u,Bi(u.type,n),o);break e}throw Error(t(306,u,""))}return s;case 0:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:Bi(u,p),Th(n,s,u,p,o);case 1:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:Bi(u,p),L0(n,s,u,p,o);case 3:e:{if(D0(s),n===null)throw Error(t(387));u=s.pendingProps,y=s.memoizedState,p=y.element,qg(n,s),Fc(s,u,null,o);var R=s.memoizedState;if(u=R.element,y.isDehydrated)if(y={element:u,isDehydrated:!1,cache:R.cache,pendingSuspenseBoundaries:R.pendingSuspenseBoundaries,transitions:R.transitions},s.updateQueue.baseState=y,s.memoizedState=y,s.flags&256){p=Xa(Error(t(423)),s),s=I0(n,s,u,o,p);break e}else if(u!==p){p=Xa(Error(t(424)),s),s=I0(n,s,u,o,p);break e}else for(mi=is(s.stateNode.containerInfo.firstChild),pi=s,nn=!0,zi=null,o=Xg(s,null,u,o),s.child=o;o;)o.flags=o.flags&-3|4096,o=o.sibling;else{if(Ha(),u===p){s=Ar(n,s,o);break e}qn(n,s,u,o)}s=s.child}return s;case 5:return Qg(s),n===null&&nh(s),u=s.type,p=s.pendingProps,y=n!==null?n.memoizedProps:null,R=p.children,$d(u,p)?R=null:y!==null&&$d(u,y)&&(s.flags|=32),N0(n,s),qn(n,s,R,o),s.child;case 6:return n===null&&nh(s),null;case 13:return U0(n,s,o);case 4:return uh(s,s.stateNode.containerInfo),u=s.pendingProps,n===null?s.child=Va(s,null,u,o):qn(n,s,u,o),s.child;case 11:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:Bi(u,p),C0(n,s,u,p,o);case 7:return qn(n,s,s.pendingProps,o),s.child;case 8:return qn(n,s,s.pendingProps.children,o),s.child;case 12:return qn(n,s,s.pendingProps.children,o),s.child;case 10:e:{if(u=s.type._context,p=s.pendingProps,y=s.memoizedProps,R=p.value,Kt(Dc,u._currentValue),u._currentValue=R,y!==null)if(ki(y.value,R)){if(y.children===p.children&&!ni.current){s=Ar(n,s,o);break e}}else for(y=s.child,y!==null&&(y.return=s);y!==null;){var H=y.dependencies;if(H!==null){R=y.child;for(var W=H.firstContext;W!==null;){if(W.context===u){if(y.tag===1){W=Rr(-1,o&-o),W.tag=2;var pe=y.updateQueue;if(pe!==null){pe=pe.shared;var be=pe.pending;be===null?W.next=W:(W.next=be.next,be.next=W),pe.pending=W}}y.lanes|=o,W=y.alternate,W!==null&&(W.lanes|=o),oh(y.return,o,s),H.lanes|=o;break}W=W.next}}else if(y.tag===10)R=y.type===s.type?null:y.child;else if(y.tag===18){if(R=y.return,R===null)throw Error(t(341));R.lanes|=o,H=R.alternate,H!==null&&(H.lanes|=o),oh(R,o,s),R=y.sibling}else R=y.child;if(R!==null)R.return=y;else for(R=y;R!==null;){if(R===s){R=null;break}if(y=R.sibling,y!==null){y.return=R.return,R=y;break}R=R.return}y=R}qn(n,s,p.children,o),s=s.child}return s;case 9:return p=s.type,u=s.pendingProps.children,ja(s,o),p=Ci(p),u=u(p),s.flags|=1,qn(n,s,u,o),s.child;case 14:return u=s.type,p=Bi(u,s.pendingProps),p=Bi(u.type,p),R0(n,s,u,p,o);case 15:return A0(n,s,s.type,s.pendingProps,o);case 17:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:Bi(u,p),Wc(n,s),s.tag=1,ii(u)?(n=!0,Cc(s)):n=!1,ja(s,o),y0(s,u,p),Eh(s,u,p,o),Ch(null,s,u,!0,n,o);case 19:return O0(n,s,o);case 22:return P0(n,s,o)}throw Error(t(156,s.tag))};function ox(n,s){return Gs(n,s)}function aM(n,s,o,u){this.tag=n,this.key=o,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=s,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=u,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Pi(n,s,o,u){return new aM(n,s,o,u)}function $h(n){return n=n.prototype,!(!n||!n.isReactComponent)}function oM(n){if(typeof n=="function")return $h(n)?1:0;if(n!=null){if(n=n.$$typeof,n===Z)return 11;if(n===z)return 14}return 2}function ps(n,s){var o=n.alternate;return o===null?(o=Pi(n.tag,s,n.key,n.mode),o.elementType=n.elementType,o.type=n.type,o.stateNode=n.stateNode,o.alternate=n,n.alternate=o):(o.pendingProps=s,o.type=n.type,o.flags=0,o.subtreeFlags=0,o.deletions=null),o.flags=n.flags&14680064,o.childLanes=n.childLanes,o.lanes=n.lanes,o.child=n.child,o.memoizedProps=n.memoizedProps,o.memoizedState=n.memoizedState,o.updateQueue=n.updateQueue,s=n.dependencies,o.dependencies=s===null?null:{lanes:s.lanes,firstContext:s.firstContext},o.sibling=n.sibling,o.index=n.index,o.ref=n.ref,o}function nu(n,s,o,u,p,y){var R=2;if(u=n,typeof n=="function")$h(n)&&(R=1);else if(typeof n=="string")R=5;else e:switch(n){case k:return na(o.children,p,y,s);case b:R=8,p|=8;break;case F:return n=Pi(12,o,s,p|2),n.elementType=F,n.lanes=y,n;case re:return n=Pi(13,o,s,p),n.elementType=re,n.lanes=y,n;case he:return n=Pi(19,o,s,p),n.elementType=he,n.lanes=y,n;case ee:return iu(o,p,y,s);default:if(typeof n=="object"&&n!==null)switch(n.$$typeof){case B:R=10;break e;case G:R=9;break e;case Z:R=11;break e;case z:R=14;break e;case ae:R=16,u=null;break e}throw Error(t(130,n==null?n:typeof n,""))}return s=Pi(R,o,s,p),s.elementType=n,s.type=u,s.lanes=y,s}function na(n,s,o,u){return n=Pi(7,n,u,s),n.lanes=o,n}function iu(n,s,o,u){return n=Pi(22,n,u,s),n.elementType=ee,n.lanes=o,n.stateNode={isHidden:!1},n}function qh(n,s,o){return n=Pi(6,n,null,s),n.lanes=o,n}function Yh(n,s,o){return s=Pi(4,n.children!==null?n.children:[],n.key,s),s.lanes=o,s.stateNode={containerInfo:n.containerInfo,pendingChildren:null,implementation:n.implementation},s}function lM(n,s,o,u,p){this.tag=s,this.containerInfo=n,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=Nn(0),this.expirationTimes=Nn(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Nn(0),this.identifierPrefix=u,this.onRecoverableError=p,this.mutableSourceEagerHydrationData=null}function Kh(n,s,o,u,p,y,R,H,W){return n=new lM(n,s,o,H,W),s===1?(s=1,y===!0&&(s|=8)):s=0,y=Pi(3,null,null,s),n.current=y,y.stateNode=n,y.memoizedState={element:u,isDehydrated:o,cache:null,transitions:null,pendingSuspenseBoundaries:null},ch(y),n}function cM(n,s,o){var u=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:D,key:u==null?null:""+u,children:n,containerInfo:s,implementation:o}}function lx(n){if(!n)return ss;n=n._reactInternals;e:{if($n(n)!==n||n.tag!==1)throw Error(t(170));var s=n;do{switch(s.tag){case 3:s=s.stateNode.context;break e;case 1:if(ii(s.type)){s=s.stateNode.__reactInternalMemoizedMergedChildContext;break e}}s=s.return}while(s!==null);throw Error(t(171))}if(n.tag===1){var o=n.type;if(ii(o))return Fg(n,o,s)}return s}function cx(n,s,o,u,p,y,R,H,W){return n=Kh(o,u,!0,n,p,y,R,H,W),n.context=lx(null),o=n.current,u=Yn(),p=hs(o),y=Rr(u,p),y.callback=s??null,ls(o,y,p),n.current.lanes=p,yt(n,p,u),ai(n,u),n}function ru(n,s,o,u){var p=s.current,y=Yn(),R=hs(p);return o=lx(o),s.context===null?s.context=o:s.pendingContext=o,s=Rr(y,R),s.payload={element:n},u=u===void 0?null:u,u!==null&&(s.callback=u),n=ls(p,s,R),n!==null&&(Gi(n,p,R,y),Uc(n,p,R)),R}function su(n){if(n=n.current,!n.child)return null;switch(n.child.tag){case 5:return n.child.stateNode;default:return n.child.stateNode}}function ux(n,s){if(n=n.memoizedState,n!==null&&n.dehydrated!==null){var o=n.retryLane;n.retryLane=o!==0&&o<s?o:s}}function Qh(n,s){ux(n,s),(n=n.alternate)&&ux(n,s)}function uM(){return null}var dx=typeof reportError=="function"?reportError:function(n){console.error(n)};function Zh(n){this._internalRoot=n}au.prototype.render=Zh.prototype.render=function(n){var s=this._internalRoot;if(s===null)throw Error(t(409));ru(n,s,null,null)},au.prototype.unmount=Zh.prototype.unmount=function(){var n=this._internalRoot;if(n!==null){this._internalRoot=null;var s=n.containerInfo;Js(function(){ru(null,n,null,null)}),s[Er]=null}};function au(n){this._internalRoot=n}au.prototype.unstable_scheduleHydration=function(n){if(n){var s=Ht();n={blockedOn:null,target:n,priority:s};for(var o=0;o<es.length&&s!==0&&s<es[o].priority;o++);es.splice(o,0,n),o===0&&Qm(n)}};function Jh(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11)}function ou(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11&&(n.nodeType!==8||n.nodeValue!==" react-mount-point-unstable "))}function hx(){}function dM(n,s,o,u,p){if(p){if(typeof u=="function"){var y=u;u=function(){var pe=su(R);y.call(pe)}}var R=cx(s,u,n,0,null,!1,!1,"",hx);return n._reactRootContainer=R,n[Er]=R.current,al(n.nodeType===8?n.parentNode:n),Js(),R}for(;p=n.lastChild;)n.removeChild(p);if(typeof u=="function"){var H=u;u=function(){var pe=su(W);H.call(pe)}}var W=Kh(n,0,!1,null,null,!1,!1,"",hx);return n._reactRootContainer=W,n[Er]=W.current,al(n.nodeType===8?n.parentNode:n),Js(function(){ru(s,W,o,u)}),W}function lu(n,s,o,u,p){var y=o._reactRootContainer;if(y){var R=y;if(typeof p=="function"){var H=p;p=function(){var W=su(R);H.call(W)}}ru(s,R,n,p)}else R=dM(o,s,n,p,u);return su(R)}Ft=function(n){switch(n.tag){case 3:var s=n.stateNode;if(s.current.memoizedState.isDehydrated){var o=Nt(s.pendingLanes);o!==0&&(ti(s,o|1),ai(s,on()),(Lt&6)===0&&(Ya=on()+500,as()))}break;case 13:Js(function(){var u=Cr(n,1);if(u!==null){var p=Yn();Gi(u,n,1,p)}}),Qh(n,1)}},Qt=function(n){if(n.tag===13){var s=Cr(n,134217728);if(s!==null){var o=Yn();Gi(s,n,134217728,o)}Qh(n,134217728)}},Fi=function(n){if(n.tag===13){var s=hs(n),o=Cr(n,s);if(o!==null){var u=Yn();Gi(o,n,s,u)}Qh(n,s)}},Ht=function(){return St},Oi=function(n,s){var o=St;try{return St=n,s()}finally{St=o}},nt=function(n,s,o){switch(s){case"input":if(kt(n,o),s=o.name,o.type==="radio"&&s!=null){for(o=n;o.parentNode;)o=o.parentNode;for(o=o.querySelectorAll("input[name="+JSON.stringify(""+s)+'][type="radio"]'),s=0;s<o.length;s++){var u=o[s];if(u!==n&&u.form===n.form){var p=bc(u);if(!p)throw Error(t(90));Gt(u),kt(u,p)}}}break;case"textarea":pn(n,o);break;case"select":s=o.value,s!=null&&Et(n,!!o.multiple,s,!1)}},Fe=jh,Me=Js;var hM={usingClientEntryPoint:!1,Events:[cl,Fa,bc,_e,De,jh]},El={findFiberByHostInstance:Ws,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},fM={bundleType:El.bundleType,version:El.version,rendererPackageName:El.rendererPackageName,rendererConfig:El.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:C.ReactCurrentDispatcher,findHostInstanceByFiber:function(n){return n=Vs(n),n===null?null:n.stateNode},findFiberByHostInstance:El.findFiberByHostInstance||uM,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var cu=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!cu.isDisabled&&cu.supportsFiber)try{se=cu.inject(fM),Ne=cu}catch{}}return oi.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=hM,oi.createPortal=function(n,s){var o=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!Jh(s))throw Error(t(200));return cM(n,s,null,o)},oi.createRoot=function(n,s){if(!Jh(n))throw Error(t(299));var o=!1,u="",p=dx;return s!=null&&(s.unstable_strictMode===!0&&(o=!0),s.identifierPrefix!==void 0&&(u=s.identifierPrefix),s.onRecoverableError!==void 0&&(p=s.onRecoverableError)),s=Kh(n,1,!1,null,null,o,!1,u,p),n[Er]=s.current,al(n.nodeType===8?n.parentNode:n),new Zh(s)},oi.findDOMNode=function(n){if(n==null)return null;if(n.nodeType===1)return n;var s=n._reactInternals;if(s===void 0)throw typeof n.render=="function"?Error(t(188)):(n=Object.keys(n).join(","),Error(t(268,n)));return n=Vs(s),n=n===null?null:n.stateNode,n},oi.flushSync=function(n){return Js(n)},oi.hydrate=function(n,s,o){if(!ou(s))throw Error(t(200));return lu(null,n,s,!0,o)},oi.hydrateRoot=function(n,s,o){if(!Jh(n))throw Error(t(405));var u=o!=null&&o.hydratedSources||null,p=!1,y="",R=dx;if(o!=null&&(o.unstable_strictMode===!0&&(p=!0),o.identifierPrefix!==void 0&&(y=o.identifierPrefix),o.onRecoverableError!==void 0&&(R=o.onRecoverableError)),s=cx(s,null,n,1,o??null,p,!1,y,R),n[Er]=s.current,al(n),u)for(n=0;n<u.length;n++)o=u[n],p=o._getVersion,p=p(o._source),s.mutableSourceEagerHydrationData==null?s.mutableSourceEagerHydrationData=[o,p]:s.mutableSourceEagerHydrationData.push(o,p);return new au(s)},oi.render=function(n,s,o){if(!ou(s))throw Error(t(200));return lu(null,n,s,!1,o)},oi.unmountComponentAtNode=function(n){if(!ou(n))throw Error(t(40));return n._reactRootContainer?(Js(function(){lu(null,null,n,!1,function(){n._reactRootContainer=null,n[Er]=null})}),!0):!1},oi.unstable_batchedUpdates=jh,oi.unstable_renderSubtreeIntoContainer=function(n,s,o,u){if(!ou(o))throw Error(t(200));if(n==null||n._reactInternals===void 0)throw Error(t(38));return lu(n,s,o,!1,u)},oi.version="18.3.1-next-f1338f8080-20240426",oi}var Sx;function EM(){if(Sx)return rf.exports;Sx=1;function i(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(i)}catch(e){console.error(e)}}return i(),rf.exports=MM(),rf.exports}var Mx;function wM(){if(Mx)return du;Mx=1;var i=EM();return du.createRoot=i.createRoot,du.hydrateRoot=i.hydrateRoot,du}var bM=wM(),Oo=class{constructor(){this.listeners=new Set,this.subscribe=this.subscribe.bind(this)}subscribe(i){return this.listeners.add(i),this.onSubscribe(),()=>{this.listeners.delete(i),this.onUnsubscribe()}}hasListeners(){return this.listeners.size>0}onSubscribe(){}onUnsubscribe(){}},fa,bs,yo,s_,TM=(s_=class extends Oo{constructor(){super();rt(this,fa);rt(this,bs);rt(this,yo);ze(this,yo,e=>{if(typeof window<"u"&&window.addEventListener){const t=()=>e();return window.addEventListener("visibilitychange",t,!1),()=>{window.removeEventListener("visibilitychange",t)}}})}onSubscribe(){j(this,bs)||this.setEventListener(j(this,yo))}onUnsubscribe(){var e;this.hasListeners()||((e=j(this,bs))==null||e.call(this),ze(this,bs,void 0))}setEventListener(e){var t;ze(this,yo,e),(t=j(this,bs))==null||t.call(this),ze(this,bs,e(r=>{typeof r=="boolean"?this.setFocused(r):this.onFocus()}))}setFocused(e){j(this,fa)!==e&&(ze(this,fa,e),this.onFocus())}onFocus(){const e=this.isFocused();this.listeners.forEach(t=>{t(e)})}isFocused(){var e;return typeof j(this,fa)=="boolean"?j(this,fa):((e=globalThis.document)==null?void 0:e.visibilityState)!=="hidden"}},fa=new WeakMap,bs=new WeakMap,yo=new WeakMap,s_),cm=new TM,CM={setTimeout:(i,e)=>setTimeout(i,e),clearTimeout:i=>clearTimeout(i),setInterval:(i,e)=>setInterval(i,e),clearInterval:i=>clearInterval(i)},Ts,om,a_,RM=(a_=class{constructor(){rt(this,Ts,CM);rt(this,om,!1)}setTimeoutProvider(i){ze(this,Ts,i)}setTimeout(i,e){return j(this,Ts).setTimeout(i,e)}clearTimeout(i){j(this,Ts).clearTimeout(i)}setInterval(i,e){return j(this,Ts).setInterval(i,e)}clearInterval(i){j(this,Ts).clearInterval(i)}},Ts=new WeakMap,om=new WeakMap,a_),ua=new RM;function AM(i){setTimeout(i,0)}var PM=typeof window>"u"||"Deno"in globalThis;function Zn(){}function NM(i,e){return typeof i=="function"?i(e):i}function Zf(i){return typeof i=="number"&&i>=0&&i!==1/0}function g_(i,e){return Math.max(i+(e||0)-Date.now(),0)}function Us(i,e){return typeof i=="function"?i(e):i}function yi(i,e){return typeof i=="function"?i(e):i}function Ex(i,e){const{type:t="all",exact:r,fetchStatus:a,predicate:l,queryKey:c,stale:d}=i;if(c){if(r){if(e.queryHash!==um(c,e.options))return!1}else if(!Vl(e.queryKey,c))return!1}if(t!=="all"){const h=e.isActive();if(t==="active"&&!h||t==="inactive"&&h)return!1}return!(typeof d=="boolean"&&e.isStale()!==d||a&&a!==e.state.fetchStatus||l&&!l(e))}function wx(i,e){const{exact:t,status:r,predicate:a,mutationKey:l}=i;if(l){if(!e.options.mutationKey)return!1;if(t){if(Ma(e.options.mutationKey)!==Ma(l))return!1}else if(!Vl(e.options.mutationKey,l))return!1}return!(r&&e.state.status!==r||a&&!a(e))}function um(i,e){return((e==null?void 0:e.queryKeyHashFn)||Ma)(i)}function Ma(i){return JSON.stringify(i,(e,t)=>Jf(t)?Object.keys(t).sort().reduce((r,a)=>(r[a]=t[a],r),{}):t)}function Vl(i,e){return i===e?!0:typeof i!=typeof e?!1:i&&e&&typeof i=="object"&&typeof e=="object"?Object.keys(e).every(t=>Vl(i[t],e[t])):!1}var LM=Object.prototype.hasOwnProperty;function x_(i,e,t=0){if(i===e)return i;if(t>500)return e;const r=bx(i)&&bx(e);if(!r&&!(Jf(i)&&Jf(e)))return e;const l=(r?i:Object.keys(i)).length,c=r?e:Object.keys(e),d=c.length,h=r?new Array(d):{};let f=0;for(let m=0;m<d;m++){const g=r?m:c[m],x=i[g],M=e[g];if(x===M){h[g]=x,(r?m<l:LM.call(i,g))&&f++;continue}if(x===null||M===null||typeof x!="object"||typeof M!="object"){h[g]=M;continue}const E=x_(x,M,t+1);h[g]=E,E===x&&f++}return l===d&&f===l?i:h}function td(i,e){if(!e||Object.keys(i).length!==Object.keys(e).length)return!1;for(const t in i)if(i[t]!==e[t])return!1;return!0}function bx(i){return Array.isArray(i)&&i.length===Object.keys(i).length}function Jf(i){if(!Tx(i))return!1;const e=i.constructor;if(e===void 0)return!0;const t=e.prototype;return!(!Tx(t)||!t.hasOwnProperty("isPrototypeOf")||Object.getPrototypeOf(i)!==Object.prototype)}function Tx(i){return Object.prototype.toString.call(i)==="[object Object]"}function DM(i){return new Promise(e=>{ua.setTimeout(e,i)})}function ep(i,e,t){return typeof t.structuralSharing=="function"?t.structuralSharing(i,e):t.structuralSharing!==!1?x_(i,e):e}function IM(i,e,t=0){const r=[...i,e];return t&&r.length>t?r.slice(1):r}function UM(i,e,t=0){const r=[e,...i];return t&&r.length>t?r.slice(0,-1):r}var dm=Symbol();function v_(i,e){return!i.queryFn&&(e!=null&&e.initialPromise)?()=>e.initialPromise:!i.queryFn||i.queryFn===dm?()=>Promise.reject(new Error(`Missing queryFn: '${i.queryHash}'`)):i.queryFn}function hm(i,e){return typeof i=="function"?i(...e):!!i}function FM(i,e,t){let r=!1,a;return Object.defineProperty(i,"signal",{enumerable:!0,get:()=>(a??(a=e()),r||(r=!0,a.aborted?t():a.addEventListener("abort",t,{once:!0})),a)}),i}var Gl=(()=>{let i=()=>PM;return{isServer(){return i()},setIsServer(e){i=e}}})();function tp(){let i,e;const t=new Promise((a,l)=>{i=a,e=l});t.status="pending",t.catch(()=>{});function r(a){Object.assign(t,a),delete t.resolve,delete t.reject}return t.resolve=a=>{r({status:"fulfilled",value:a}),i(a)},t.reject=a=>{r({status:"rejected",reason:a}),e(a)},t}var OM=AM;function kM(){let i=[],e=0,t=d=>{d()},r=d=>{d()},a=OM;const l=d=>{e?i.push(d):a(()=>{t(d)})},c=()=>{const d=i;i=[],d.length&&a(()=>{r(()=>{d.forEach(h=>{t(h)})})})};return{batch:d=>{let h;e++;try{h=d()}finally{e--,e||c()}return h},batchCalls:d=>(...h)=>{l(()=>{d(...h)})},schedule:l,setNotifyFunction:d=>{t=d},setBatchNotifyFunction:d=>{r=d},setScheduler:d=>{a=d}}}var Mn=kM(),So,Cs,Mo,o_,zM=(o_=class extends Oo{constructor(){super();rt(this,So,!0);rt(this,Cs);rt(this,Mo);ze(this,Mo,e=>{if(typeof window<"u"&&window.addEventListener){const t=()=>e(!0),r=()=>e(!1);return window.addEventListener("online",t,!1),window.addEventListener("offline",r,!1),()=>{window.removeEventListener("online",t),window.removeEventListener("offline",r)}}})}onSubscribe(){j(this,Cs)||this.setEventListener(j(this,Mo))}onUnsubscribe(){var e;this.hasListeners()||((e=j(this,Cs))==null||e.call(this),ze(this,Cs,void 0))}setEventListener(e){var t;ze(this,Mo,e),(t=j(this,Cs))==null||t.call(this),ze(this,Cs,e(this.setOnline.bind(this)))}setOnline(e){j(this,So)!==e&&(ze(this,So,e),this.listeners.forEach(r=>{r(e)}))}isOnline(){return j(this,So)}},So=new WeakMap,Cs=new WeakMap,Mo=new WeakMap,o_),nd=new zM;function BM(i){return Math.min(1e3*2**i,3e4)}function __(i){return(i??"online")==="online"?nd.isOnline():!0}var np=class extends Error{constructor(i){super("CancelledError"),this.revert=i==null?void 0:i.revert,this.silent=i==null?void 0:i.silent}};function y_(i){let e=!1,t=0,r;const a=tp(),l=()=>a.status!=="pending",c=w=>{var _;if(!l()){const S=new np(w);x(S),(_=i.onCancel)==null||_.call(i,S)}},d=()=>{e=!0},h=()=>{e=!1},f=()=>cm.isFocused()&&(i.networkMode==="always"||nd.isOnline())&&i.canRun(),m=()=>__(i.networkMode)&&i.canRun(),g=w=>{l()||(r==null||r(),a.resolve(w))},x=w=>{l()||(r==null||r(),a.reject(w))},M=()=>new Promise(w=>{var _;r=S=>{(l()||f())&&w(S)},(_=i.onPause)==null||_.call(i)}).then(()=>{var w;r=void 0,l()||(w=i.onContinue)==null||w.call(i)}),E=()=>{if(l())return;let w;const _=t===0?i.initialPromise:void 0;try{w=_??i.fn()}catch(S){w=Promise.reject(S)}Promise.resolve(w).then(g).catch(S=>{var D;if(l())return;const L=i.retry??(Gl.isServer()?0:3),N=i.retryDelay??BM,C=typeof N=="function"?N(t,S):N,U=L===!0||typeof L=="number"&&t<L||typeof L=="function"&&L(t,S);if(e||!U){x(S);return}t++,(D=i.onFail)==null||D.call(i,t,S),DM(C).then(()=>f()?void 0:M()).then(()=>{e?x(S):E()})})};return{promise:a,status:()=>a.status,cancel:c,continue:()=>(r==null||r(),a),cancelRetry:d,continueRetry:h,canStart:m,start:()=>(m()?E():M().then(E),a)}}var pa,l_,S_=(l_=class{constructor(){rt(this,pa)}destroy(){this.clearGcTimeout()}scheduleGc(){this.clearGcTimeout(),Zf(this.gcTime)&&ze(this,pa,ua.setTimeout(()=>{this.optionalRemove()},this.gcTime))}updateGcTime(i){this.gcTime=Math.max(this.gcTime||0,i??(Gl.isServer()?1/0:300*1e3))}clearGcTimeout(){j(this,pa)!==void 0&&(ua.clearTimeout(j(this,pa)),ze(this,pa,void 0))}},pa=new WeakMap,l_);function HM(i){return{onFetch:(e,t)=>{var m,g,x,M,E;const r=e.options,a=(x=(g=(m=e.fetchOptions)==null?void 0:m.meta)==null?void 0:g.fetchMore)==null?void 0:x.direction,l=((M=e.state.data)==null?void 0:M.pages)||[],c=((E=e.state.data)==null?void 0:E.pageParams)||[];let d={pages:[],pageParams:[]},h=0;const f=async()=>{let w=!1;const _=N=>{FM(N,()=>e.signal,()=>w=!0)},S=v_(e.options,e.fetchOptions),L=async(N,C,U)=>{if(w)return Promise.reject(e.signal.reason);if(C==null&&N.pages.length)return Promise.resolve(N);const k=(()=>{const G={client:e.client,queryKey:e.queryKey,pageParam:C,direction:U?"backward":"forward",meta:e.options.meta};return _(G),G})(),b=await S(k),{maxPages:F}=e.options,B=U?UM:IM;return{pages:B(N.pages,b,F),pageParams:B(N.pageParams,C,F)}};if(a&&l.length){const N=a==="backward",C=N?VM:Cx,U={pages:l,pageParams:c},D=C(r,U);d=await L(U,D,N)}else{const N=i??l.length;do{const C=h===0?c[0]??r.initialPageParam:Cx(r,d);if(h>0&&C==null)break;d=await L(d,C),h++}while(h<N)}return d};e.options.persister?e.fetchFn=()=>{var w,_;return(_=(w=e.options).persister)==null?void 0:_.call(w,f,{client:e.client,queryKey:e.queryKey,meta:e.options.meta,signal:e.signal},t)}:e.fetchFn=f}}}function Cx(i,{pages:e,pageParams:t}){const r=e.length-1;return e.length>0?i.getNextPageParam(e[r],e,t[r],t):void 0}function VM(i,{pages:e,pageParams:t}){var r;return e.length>0?(r=i.getPreviousPageParam)==null?void 0:r.call(i,e[0],e,t[0],t):void 0}var Eo,ma,wo,Di,ga,Pn,Kl,xa,_i,M_,kr,c_,GM=(c_=class extends S_{constructor(e){super();rt(this,_i);rt(this,Eo);rt(this,ma);rt(this,wo);rt(this,Di);rt(this,ga);rt(this,Pn);rt(this,Kl);rt(this,xa);ze(this,xa,!1),ze(this,Kl,e.defaultOptions),this.setOptions(e.options),this.observers=[],ze(this,ga,e.client),ze(this,Di,j(this,ga).getQueryCache()),this.queryKey=e.queryKey,this.queryHash=e.queryHash,ze(this,ma,Ax(this.options)),this.state=e.state??j(this,ma),this.scheduleGc()}get meta(){return this.options.meta}get queryType(){return j(this,Eo)}get promise(){var e;return(e=j(this,Pn))==null?void 0:e.promise}setOptions(e){if(this.options={...j(this,Kl),...e},e!=null&&e._type&&ze(this,Eo,e._type),this.updateGcTime(this.options.gcTime),this.state&&this.state.data===void 0){const t=Ax(this.options);t.data!==void 0&&(this.setState(Rx(t.data,t.dataUpdatedAt)),ze(this,ma,t))}}optionalRemove(){!this.observers.length&&this.state.fetchStatus==="idle"&&j(this,Di).remove(this)}setData(e,t){const r=ep(this.state.data,e,this.options);return gt(this,_i,kr).call(this,{data:r,type:"success",dataUpdatedAt:t==null?void 0:t.updatedAt,manual:t==null?void 0:t.manual}),r}setState(e){gt(this,_i,kr).call(this,{type:"setState",state:e})}cancel(e){var r,a;const t=(r=j(this,Pn))==null?void 0:r.promise;return(a=j(this,Pn))==null||a.cancel(e),t?t.then(Zn).catch(Zn):Promise.resolve()}destroy(){super.destroy(),this.cancel({silent:!0})}get resetState(){return j(this,ma)}reset(){this.destroy(),this.setState(this.resetState)}isActive(){return this.observers.some(e=>yi(e.options.enabled,this)!==!1)}isDisabled(){return this.getObserversCount()>0?!this.isActive():this.options.queryFn===dm||!this.isFetched()}isFetched(){return this.state.dataUpdateCount+this.state.errorUpdateCount>0}isStatic(){return this.getObserversCount()>0?this.observers.some(e=>Us(e.options.staleTime,this)==="static"):!1}isStale(){return this.getObserversCount()>0?this.observers.some(e=>e.getCurrentResult().isStale):this.state.data===void 0||this.state.isInvalidated}isStaleByTime(e=0){return this.state.data===void 0?!0:e==="static"?!1:this.state.isInvalidated?!0:!g_(this.state.dataUpdatedAt,e)}onFocus(){var t;const e=this.observers.find(r=>r.shouldFetchOnWindowFocus());e==null||e.refetch({cancelRefetch:!1}),(t=j(this,Pn))==null||t.continue()}onOnline(){var t;const e=this.observers.find(r=>r.shouldFetchOnReconnect());e==null||e.refetch({cancelRefetch:!1}),(t=j(this,Pn))==null||t.continue()}addObserver(e){this.observers.includes(e)||(this.observers.push(e),this.clearGcTimeout(),j(this,Di).notify({type:"observerAdded",query:this,observer:e}))}removeObserver(e){this.observers.includes(e)&&(this.observers=this.observers.filter(t=>t!==e),this.observers.length||(j(this,Pn)&&(j(this,xa)||gt(this,_i,M_).call(this)?j(this,Pn).cancel({revert:!0}):j(this,Pn).cancelRetry()),this.scheduleGc()),j(this,Di).notify({type:"observerRemoved",query:this,observer:e}))}getObserversCount(){return this.observers.length}invalidate(){this.state.isInvalidated||gt(this,_i,kr).call(this,{type:"invalidate"})}async fetch(e,t){var f,m,g,x,M,E,w,_,S,L,N;if(this.state.fetchStatus!=="idle"&&((f=j(this,Pn))==null?void 0:f.status())!=="rejected"){if(this.state.data!==void 0&&(t!=null&&t.cancelRefetch))this.cancel({silent:!0});else if(j(this,Pn))return j(this,Pn).continueRetry(),j(this,Pn).promise}if(e&&this.setOptions(e),!this.options.queryFn){const C=this.observers.find(U=>U.options.queryFn);C&&this.setOptions(C.options)}const r=new AbortController,a=C=>{Object.defineProperty(C,"signal",{enumerable:!0,get:()=>(ze(this,xa,!0),r.signal)})},l=()=>{const C=v_(this.options,t),D=(()=>{const k={client:j(this,ga),queryKey:this.queryKey,meta:this.meta};return a(k),k})();return ze(this,xa,!1),this.options.persister?this.options.persister(C,D,this):C(D)},d=(()=>{const C={fetchOptions:t,options:this.options,queryKey:this.queryKey,client:j(this,ga),state:this.state,fetchFn:l};return a(C),C})(),h=j(this,Eo)==="infinite"?HM(this.options.pages):this.options.behavior;h==null||h.onFetch(d,this),ze(this,wo,this.state),(this.state.fetchStatus==="idle"||this.state.fetchMeta!==((m=d.fetchOptions)==null?void 0:m.meta))&&gt(this,_i,kr).call(this,{type:"fetch",meta:(g=d.fetchOptions)==null?void 0:g.meta}),ze(this,Pn,y_({initialPromise:t==null?void 0:t.initialPromise,fn:d.fetchFn,onCancel:C=>{C instanceof np&&C.revert&&this.setState({...j(this,wo),fetchStatus:"idle"}),r.abort()},onFail:(C,U)=>{gt(this,_i,kr).call(this,{type:"failed",failureCount:C,error:U})},onPause:()=>{gt(this,_i,kr).call(this,{type:"pause"})},onContinue:()=>{gt(this,_i,kr).call(this,{type:"continue"})},retry:d.options.retry,retryDelay:d.options.retryDelay,networkMode:d.options.networkMode,canRun:()=>!0}));try{const C=await j(this,Pn).start();if(C===void 0)throw new Error(`${this.queryHash} data is undefined`);return this.setData(C),(M=(x=j(this,Di).config).onSuccess)==null||M.call(x,C,this),(w=(E=j(this,Di).config).onSettled)==null||w.call(E,C,this.state.error,this),C}catch(C){if(C instanceof np){if(C.silent)return j(this,Pn).promise;if(C.revert){if(this.state.data===void 0)throw C;return this.state.data}}throw gt(this,_i,kr).call(this,{type:"error",error:C}),(S=(_=j(this,Di).config).onError)==null||S.call(_,C,this),(N=(L=j(this,Di).config).onSettled)==null||N.call(L,this.state.data,C,this),C}finally{this.scheduleGc()}}},Eo=new WeakMap,ma=new WeakMap,wo=new WeakMap,Di=new WeakMap,ga=new WeakMap,Pn=new WeakMap,Kl=new WeakMap,xa=new WeakMap,_i=new WeakSet,M_=function(){return this.state.fetchStatus==="paused"&&this.state.status==="pending"},kr=function(e){const t=r=>{switch(e.type){case"failed":return{...r,fetchFailureCount:e.failureCount,fetchFailureReason:e.error};case"pause":return{...r,fetchStatus:"paused"};case"continue":return{...r,fetchStatus:"fetching"};case"fetch":return{...r,...E_(r.data,this.options),fetchMeta:e.meta??null};case"success":const a={...r,...Rx(e.data,e.dataUpdatedAt),dataUpdateCount:r.dataUpdateCount+1,...!e.manual&&{fetchStatus:"idle",fetchFailureCount:0,fetchFailureReason:null}};return ze(this,wo,e.manual?a:void 0),a;case"error":const l=e.error;return{...r,error:l,errorUpdateCount:r.errorUpdateCount+1,errorUpdatedAt:Date.now(),fetchFailureCount:r.fetchFailureCount+1,fetchFailureReason:l,fetchStatus:"idle",status:"error",isInvalidated:!0};case"invalidate":return{...r,isInvalidated:!0};case"setState":return{...r,...e.state}}};this.state=t(this.state),Mn.batch(()=>{this.observers.forEach(r=>{r.onQueryUpdate()}),j(this,Di).notify({query:this,type:"updated",action:e})})},c_);function E_(i,e){return{fetchFailureCount:0,fetchFailureReason:null,fetchStatus:__(e.networkMode)?"fetching":"paused",...i===void 0&&{error:null,status:"pending"}}}function Rx(i,e){return{data:i,dataUpdatedAt:e??Date.now(),error:null,isInvalidated:!1,status:"success"}}function Ax(i){const e=typeof i.initialData=="function"?i.initialData():i.initialData,t=e!==void 0,r=t?typeof i.initialDataUpdatedAt=="function"?i.initialDataUpdatedAt():i.initialDataUpdatedAt:0;return{data:e,dataUpdateCount:0,dataUpdatedAt:t?r??Date.now():0,error:null,errorUpdateCount:0,errorUpdatedAt:0,fetchFailureCount:0,fetchFailureReason:null,fetchMeta:null,isInvalidated:!1,status:t?"success":"pending",fetchStatus:"idle"}}var ui,At,Ql,Qn,va,bo,zr,Rs,Zl,To,Co,_a,ya,As,Ro,Ot,Ul,ip,rp,sp,ap,op,lp,cp,w_,u_,jM=(u_=class extends Oo{constructor(e,t){super();rt(this,Ot);rt(this,ui);rt(this,At);rt(this,Ql);rt(this,Qn);rt(this,va);rt(this,bo);rt(this,zr);rt(this,Rs);rt(this,Zl);rt(this,To);rt(this,Co);rt(this,_a);rt(this,ya);rt(this,As);rt(this,Ro,new Set);this.options=t,ze(this,ui,e),ze(this,Rs,null),ze(this,zr,tp()),this.bindMethods(),this.setOptions(t)}bindMethods(){this.refetch=this.refetch.bind(this)}onSubscribe(){this.listeners.size===1&&(j(this,At).addObserver(this),Px(j(this,At),this.options)?gt(this,Ot,Ul).call(this):this.updateResult(),gt(this,Ot,ap).call(this))}onUnsubscribe(){this.hasListeners()||this.destroy()}shouldFetchOnReconnect(){return up(j(this,At),this.options,this.options.refetchOnReconnect)}shouldFetchOnWindowFocus(){return up(j(this,At),this.options,this.options.refetchOnWindowFocus)}destroy(){this.listeners=new Set,gt(this,Ot,op).call(this),gt(this,Ot,lp).call(this),j(this,At).removeObserver(this)}setOptions(e){const t=this.options,r=j(this,At);if(this.options=j(this,ui).defaultQueryOptions(e),this.options.enabled!==void 0&&typeof this.options.enabled!="boolean"&&typeof this.options.enabled!="function"&&typeof yi(this.options.enabled,j(this,At))!="boolean")throw new Error("Expected enabled to be a boolean or a callback that returns a boolean");gt(this,Ot,cp).call(this),j(this,At).setOptions(this.options),t._defaulted&&!td(this.options,t)&&j(this,ui).getQueryCache().notify({type:"observerOptionsUpdated",query:j(this,At),observer:this});const a=this.hasListeners();a&&Nx(j(this,At),r,this.options,t)&&gt(this,Ot,Ul).call(this),this.updateResult(),a&&(j(this,At)!==r||yi(this.options.enabled,j(this,At))!==yi(t.enabled,j(this,At))||Us(this.options.staleTime,j(this,At))!==Us(t.staleTime,j(this,At)))&&gt(this,Ot,ip).call(this);const l=gt(this,Ot,rp).call(this);a&&(j(this,At)!==r||yi(this.options.enabled,j(this,At))!==yi(t.enabled,j(this,At))||l!==j(this,As))&&gt(this,Ot,sp).call(this,l)}getOptimisticResult(e){const t=j(this,ui).getQueryCache().build(j(this,ui),e),r=this.createResult(t,e);return XM(this,r)&&(ze(this,Qn,r),ze(this,bo,this.options),ze(this,va,j(this,At).state)),r}getCurrentResult(){return j(this,Qn)}trackResult(e,t){return new Proxy(e,{get:(r,a)=>(this.trackProp(a),t==null||t(a),a==="promise"&&(this.trackProp("data"),!this.options.experimental_prefetchInRender&&j(this,zr).status==="pending"&&j(this,zr).reject(new Error("experimental_prefetchInRender feature flag is not enabled"))),Reflect.get(r,a))})}trackProp(e){j(this,Ro).add(e)}getCurrentQuery(){return j(this,At)}refetch({...e}={}){return this.fetch({...e})}fetchOptimistic(e){const t=j(this,ui).defaultQueryOptions(e),r=j(this,ui).getQueryCache().build(j(this,ui),t);return r.fetch().then(()=>this.createResult(r,t))}fetch(e){return gt(this,Ot,Ul).call(this,{...e,cancelRefetch:e.cancelRefetch??!0}).then(()=>(this.updateResult(),j(this,Qn)))}createResult(e,t){var F;const r=j(this,At),a=this.options,l=j(this,Qn),c=j(this,va),d=j(this,bo),f=e!==r?e.state:j(this,Ql),{state:m}=e;let g={...m},x=!1,M;if(t._optimisticResults){const B=this.hasListeners(),G=!B&&Px(e,t),Z=B&&Nx(e,r,t,a);(G||Z)&&(g={...g,...E_(m.data,e.options)}),t._optimisticResults==="isRestoring"&&(g.fetchStatus="idle")}let{error:E,errorUpdatedAt:w,status:_}=g;M=g.data;let S=!1;if(t.placeholderData!==void 0&&M===void 0&&_==="pending"){let B;l!=null&&l.isPlaceholderData&&t.placeholderData===(d==null?void 0:d.placeholderData)?(B=l.data,S=!0):B=typeof t.placeholderData=="function"?t.placeholderData((F=j(this,Co))==null?void 0:F.state.data,j(this,Co)):t.placeholderData,B!==void 0&&(_="success",M=ep(l==null?void 0:l.data,B,t),x=!0)}if(t.select&&M!==void 0&&!S)if(l&&M===(c==null?void 0:c.data)&&t.select===j(this,Zl))M=j(this,To);else try{ze(this,Zl,t.select),M=t.select(M),M=ep(l==null?void 0:l.data,M,t),ze(this,To,M),ze(this,Rs,null)}catch(B){ze(this,Rs,B)}j(this,Rs)&&(E=j(this,Rs),M=j(this,To),w=Date.now(),_="error");const L=g.fetchStatus==="fetching",N=_==="pending",C=_==="error",U=N&&L,D=M!==void 0,b={status:_,fetchStatus:g.fetchStatus,isPending:N,isSuccess:_==="success",isError:C,isInitialLoading:U,isLoading:U,data:M,dataUpdatedAt:g.dataUpdatedAt,error:E,errorUpdatedAt:w,failureCount:g.fetchFailureCount,failureReason:g.fetchFailureReason,errorUpdateCount:g.errorUpdateCount,isFetched:e.isFetched(),isFetchedAfterMount:g.dataUpdateCount>f.dataUpdateCount||g.errorUpdateCount>f.errorUpdateCount,isFetching:L,isRefetching:L&&!N,isLoadingError:C&&!D,isPaused:g.fetchStatus==="paused",isPlaceholderData:x,isRefetchError:C&&D,isStale:fm(e,t),refetch:this.refetch,promise:j(this,zr),isEnabled:yi(t.enabled,e)!==!1};if(this.options.experimental_prefetchInRender){const B=b.data!==void 0,G=b.status==="error"&&!B,Z=z=>{G?z.reject(b.error):B&&z.resolve(b.data)},re=()=>{const z=ze(this,zr,b.promise=tp());Z(z)},he=j(this,zr);switch(he.status){case"pending":e.queryHash===r.queryHash&&Z(he);break;case"fulfilled":(G||b.data!==he.value)&&re();break;case"rejected":(!G||b.error!==he.reason)&&re();break}}return b}updateResult(){const e=j(this,Qn),t=this.createResult(j(this,At),this.options);if(ze(this,va,j(this,At).state),ze(this,bo,this.options),j(this,va).data!==void 0&&ze(this,Co,j(this,At)),td(t,e))return;ze(this,Qn,t);const r=()=>{if(!e)return!0;const{notifyOnChangeProps:a}=this.options,l=typeof a=="function"?a():a;if(l==="all"||!l&&!j(this,Ro).size)return!0;const c=new Set(l??j(this,Ro));return this.options.throwOnError&&c.add("error"),Object.keys(j(this,Qn)).some(d=>{const h=d;return j(this,Qn)[h]!==e[h]&&c.has(h)})};gt(this,Ot,w_).call(this,{listeners:r()})}onQueryUpdate(){this.updateResult(),this.hasListeners()&&gt(this,Ot,ap).call(this)}},ui=new WeakMap,At=new WeakMap,Ql=new WeakMap,Qn=new WeakMap,va=new WeakMap,bo=new WeakMap,zr=new WeakMap,Rs=new WeakMap,Zl=new WeakMap,To=new WeakMap,Co=new WeakMap,_a=new WeakMap,ya=new WeakMap,As=new WeakMap,Ro=new WeakMap,Ot=new WeakSet,Ul=function(e){gt(this,Ot,cp).call(this);let t=j(this,At).fetch(this.options,e);return e!=null&&e.throwOnError||(t=t.catch(Zn)),t},ip=function(){gt(this,Ot,op).call(this);const e=Us(this.options.staleTime,j(this,At));if(Gl.isServer()||j(this,Qn).isStale||!Zf(e))return;const r=g_(j(this,Qn).dataUpdatedAt,e)+1;ze(this,_a,ua.setTimeout(()=>{j(this,Qn).isStale||this.updateResult()},r))},rp=function(){return(typeof this.options.refetchInterval=="function"?this.options.refetchInterval(j(this,At)):this.options.refetchInterval)??!1},sp=function(e){gt(this,Ot,lp).call(this),ze(this,As,e),!(Gl.isServer()||yi(this.options.enabled,j(this,At))===!1||!Zf(j(this,As))||j(this,As)===0)&&ze(this,ya,ua.setInterval(()=>{(this.options.refetchIntervalInBackground||cm.isFocused())&&gt(this,Ot,Ul).call(this)},j(this,As)))},ap=function(){gt(this,Ot,ip).call(this),gt(this,Ot,sp).call(this,gt(this,Ot,rp).call(this))},op=function(){j(this,_a)!==void 0&&(ua.clearTimeout(j(this,_a)),ze(this,_a,void 0))},lp=function(){j(this,ya)!==void 0&&(ua.clearInterval(j(this,ya)),ze(this,ya,void 0))},cp=function(){const e=j(this,ui).getQueryCache().build(j(this,ui),this.options);if(e===j(this,At))return;const t=j(this,At);ze(this,At,e),ze(this,Ql,e.state),this.hasListeners()&&(t==null||t.removeObserver(this),e.addObserver(this))},w_=function(e){Mn.batch(()=>{e.listeners&&this.listeners.forEach(t=>{t(j(this,Qn))}),j(this,ui).getQueryCache().notify({query:j(this,At),type:"observerResultsUpdated"})})},u_);function WM(i,e){return yi(e.enabled,i)!==!1&&i.state.data===void 0&&!(i.state.status==="error"&&yi(e.retryOnMount,i)===!1)}function Px(i,e){return WM(i,e)||i.state.data!==void 0&&up(i,e,e.refetchOnMount)}function up(i,e,t){if(yi(e.enabled,i)!==!1&&Us(e.staleTime,i)!=="static"){const r=typeof t=="function"?t(i):t;return r==="always"||r!==!1&&fm(i,e)}return!1}function Nx(i,e,t,r){return(i!==e||yi(r.enabled,i)===!1)&&(!t.suspense||i.state.status!=="error")&&fm(i,t)}function fm(i,e){return yi(e.enabled,i)!==!1&&i.isStaleByTime(Us(e.staleTime,i))}function XM(i,e){return!td(i.getCurrentResult(),e)}var Jl,cr,jn,Sa,ur,Ms,d_,$M=(d_=class extends S_{constructor(e){super();rt(this,ur);rt(this,Jl);rt(this,cr);rt(this,jn);rt(this,Sa);ze(this,Jl,e.client),this.mutationId=e.mutationId,ze(this,jn,e.mutationCache),ze(this,cr,[]),this.state=e.state||b_(),this.setOptions(e.options),this.scheduleGc()}setOptions(e){this.options=e,this.updateGcTime(this.options.gcTime)}get meta(){return this.options.meta}addObserver(e){j(this,cr).includes(e)||(j(this,cr).push(e),this.clearGcTimeout(),j(this,jn).notify({type:"observerAdded",mutation:this,observer:e}))}removeObserver(e){ze(this,cr,j(this,cr).filter(t=>t!==e)),this.scheduleGc(),j(this,jn).notify({type:"observerRemoved",mutation:this,observer:e})}optionalRemove(){j(this,cr).length||(this.state.status==="pending"?this.scheduleGc():j(this,jn).remove(this))}continue(){var e;return((e=j(this,Sa))==null?void 0:e.continue())??this.execute(this.state.variables)}async execute(e){var c,d,h,f,m,g,x,M,E,w,_,S,L,N,C,U,D,k;const t=()=>{gt(this,ur,Ms).call(this,{type:"continue"})},r={client:j(this,Jl),meta:this.options.meta,mutationKey:this.options.mutationKey};ze(this,Sa,y_({fn:()=>this.options.mutationFn?this.options.mutationFn(e,r):Promise.reject(new Error("No mutationFn found")),onFail:(b,F)=>{gt(this,ur,Ms).call(this,{type:"failed",failureCount:b,error:F})},onPause:()=>{gt(this,ur,Ms).call(this,{type:"pause"})},onContinue:t,retry:this.options.retry??0,retryDelay:this.options.retryDelay,networkMode:this.options.networkMode,canRun:()=>j(this,jn).canRun(this)}));const a=this.state.status==="pending",l=!j(this,Sa).canStart();try{if(a)t();else{gt(this,ur,Ms).call(this,{type:"pending",variables:e,isPaused:l}),j(this,jn).config.onMutate&&await j(this,jn).config.onMutate(e,this,r);const F=await((d=(c=this.options).onMutate)==null?void 0:d.call(c,e,r));F!==this.state.context&&gt(this,ur,Ms).call(this,{type:"pending",context:F,variables:e,isPaused:l})}const b=await j(this,Sa).start();return await((f=(h=j(this,jn).config).onSuccess)==null?void 0:f.call(h,b,e,this.state.context,this,r)),await((g=(m=this.options).onSuccess)==null?void 0:g.call(m,b,e,this.state.context,r)),await((M=(x=j(this,jn).config).onSettled)==null?void 0:M.call(x,b,null,this.state.variables,this.state.context,this,r)),await((w=(E=this.options).onSettled)==null?void 0:w.call(E,b,null,e,this.state.context,r)),gt(this,ur,Ms).call(this,{type:"success",data:b}),b}catch(b){try{await((S=(_=j(this,jn).config).onError)==null?void 0:S.call(_,b,e,this.state.context,this,r))}catch(F){Promise.reject(F)}try{await((N=(L=this.options).onError)==null?void 0:N.call(L,b,e,this.state.context,r))}catch(F){Promise.reject(F)}try{await((U=(C=j(this,jn).config).onSettled)==null?void 0:U.call(C,void 0,b,this.state.variables,this.state.context,this,r))}catch(F){Promise.reject(F)}try{await((k=(D=this.options).onSettled)==null?void 0:k.call(D,void 0,b,e,this.state.context,r))}catch(F){Promise.reject(F)}throw gt(this,ur,Ms).call(this,{type:"error",error:b}),b}finally{j(this,jn).runNext(this)}}},Jl=new WeakMap,cr=new WeakMap,jn=new WeakMap,Sa=new WeakMap,ur=new WeakSet,Ms=function(e){const t=r=>{switch(e.type){case"failed":return{...r,failureCount:e.failureCount,failureReason:e.error};case"pause":return{...r,isPaused:!0};case"continue":return{...r,isPaused:!1};case"pending":return{...r,context:e.context,data:void 0,failureCount:0,failureReason:null,error:null,isPaused:e.isPaused,status:"pending",variables:e.variables,submittedAt:Date.now()};case"success":return{...r,data:e.data,failureCount:0,failureReason:null,error:null,status:"success",isPaused:!1};case"error":return{...r,data:void 0,error:e.error,failureCount:r.failureCount+1,failureReason:e.error,isPaused:!1,status:"error"}}};this.state=t(this.state),Mn.batch(()=>{j(this,cr).forEach(r=>{r.onMutationUpdate(e)}),j(this,jn).notify({mutation:this,type:"updated",action:e})})},d_);function b_(){return{context:void 0,data:void 0,error:null,failureCount:0,failureReason:null,isPaused:!1,status:"idle",variables:void 0,submittedAt:0}}var Br,qi,ec,h_,qM=(h_=class extends Oo{constructor(e={}){super();rt(this,Br);rt(this,qi);rt(this,ec);this.config=e,ze(this,Br,new Set),ze(this,qi,new Map),ze(this,ec,0)}build(e,t,r){const a=new $M({client:e,mutationCache:this,mutationId:++uu(this,ec)._,options:e.defaultMutationOptions(t),state:r});return this.add(a),a}add(e){j(this,Br).add(e);const t=hu(e);if(typeof t=="string"){const r=j(this,qi).get(t);r?r.push(e):j(this,qi).set(t,[e])}this.notify({type:"added",mutation:e})}remove(e){if(j(this,Br).delete(e)){const t=hu(e);if(typeof t=="string"){const r=j(this,qi).get(t);if(r)if(r.length>1){const a=r.indexOf(e);a!==-1&&r.splice(a,1)}else r[0]===e&&j(this,qi).delete(t)}}this.notify({type:"removed",mutation:e})}canRun(e){const t=hu(e);if(typeof t=="string"){const r=j(this,qi).get(t),a=r==null?void 0:r.find(l=>l.state.status==="pending");return!a||a===e}else return!0}runNext(e){var r;const t=hu(e);if(typeof t=="string"){const a=(r=j(this,qi).get(t))==null?void 0:r.find(l=>l!==e&&l.state.isPaused);return(a==null?void 0:a.continue())??Promise.resolve()}else return Promise.resolve()}clear(){Mn.batch(()=>{j(this,Br).forEach(e=>{this.notify({type:"removed",mutation:e})}),j(this,Br).clear(),j(this,qi).clear()})}getAll(){return Array.from(j(this,Br))}find(e){const t={exact:!0,...e};return this.getAll().find(r=>wx(t,r))}findAll(e={}){return this.getAll().filter(t=>wx(e,t))}notify(e){Mn.batch(()=>{this.listeners.forEach(t=>{t(e)})})}resumePausedMutations(){const e=this.getAll().filter(t=>t.state.isPaused);return Mn.batch(()=>Promise.all(e.map(t=>t.continue().catch(Zn))))}},Br=new WeakMap,qi=new WeakMap,ec=new WeakMap,h_);function hu(i){var e;return(e=i.options.scope)==null?void 0:e.id}var Hr,Ps,di,Vr,Xr,Gu,dp,f_,YM=(f_=class extends Oo{constructor(t,r){super();rt(this,Xr);rt(this,Hr);rt(this,Ps);rt(this,di);rt(this,Vr);ze(this,Hr,t),this.setOptions(r),this.bindMethods(),gt(this,Xr,Gu).call(this)}bindMethods(){this.mutate=this.mutate.bind(this),this.reset=this.reset.bind(this)}setOptions(t){var a;const r=this.options;this.options=j(this,Hr).defaultMutationOptions(t),td(this.options,r)||j(this,Hr).getMutationCache().notify({type:"observerOptionsUpdated",mutation:j(this,di),observer:this}),r!=null&&r.mutationKey&&this.options.mutationKey&&Ma(r.mutationKey)!==Ma(this.options.mutationKey)?this.reset():((a=j(this,di))==null?void 0:a.state.status)==="pending"&&j(this,di).setOptions(this.options)}onUnsubscribe(){var t;this.hasListeners()||(t=j(this,di))==null||t.removeObserver(this)}onMutationUpdate(t){gt(this,Xr,Gu).call(this),gt(this,Xr,dp).call(this,t)}getCurrentResult(){return j(this,Ps)}reset(){var t;(t=j(this,di))==null||t.removeObserver(this),ze(this,di,void 0),gt(this,Xr,Gu).call(this),gt(this,Xr,dp).call(this)}mutate(t,r){var a;return ze(this,Vr,r),(a=j(this,di))==null||a.removeObserver(this),ze(this,di,j(this,Hr).getMutationCache().build(j(this,Hr),this.options)),j(this,di).addObserver(this),j(this,di).execute(t)}},Hr=new WeakMap,Ps=new WeakMap,di=new WeakMap,Vr=new WeakMap,Xr=new WeakSet,Gu=function(){var r;const t=((r=j(this,di))==null?void 0:r.state)??b_();ze(this,Ps,{...t,isPending:t.status==="pending",isSuccess:t.status==="success",isError:t.status==="error",isIdle:t.status==="idle",mutate:this.mutate,reset:this.reset})},dp=function(t){Mn.batch(()=>{var r,a,l,c,d,h,f,m;if(j(this,Vr)&&this.hasListeners()){const g=j(this,Ps).variables,x=j(this,Ps).context,M={client:j(this,Hr),meta:this.options.meta,mutationKey:this.options.mutationKey};if((t==null?void 0:t.type)==="success"){try{(a=(r=j(this,Vr)).onSuccess)==null||a.call(r,t.data,g,x,M)}catch(E){Promise.reject(E)}try{(c=(l=j(this,Vr)).onSettled)==null||c.call(l,t.data,null,g,x,M)}catch(E){Promise.reject(E)}}else if((t==null?void 0:t.type)==="error"){try{(h=(d=j(this,Vr)).onError)==null||h.call(d,t.error,g,x,M)}catch(E){Promise.reject(E)}try{(m=(f=j(this,Vr)).onSettled)==null||m.call(f,void 0,t.error,g,x,M)}catch(E){Promise.reject(E)}}}this.listeners.forEach(g=>{g(j(this,Ps))})})},f_),dr,p_,KM=(p_=class extends Oo{constructor(e={}){super();rt(this,dr);this.config=e,ze(this,dr,new Map)}build(e,t,r){const a=t.queryKey,l=t.queryHash??um(a,t);let c=this.get(l);return c||(c=new GM({client:e,queryKey:a,queryHash:l,options:e.defaultQueryOptions(t),state:r,defaultOptions:e.getQueryDefaults(a)}),this.add(c)),c}add(e){j(this,dr).has(e.queryHash)||(j(this,dr).set(e.queryHash,e),this.notify({type:"added",query:e}))}remove(e){const t=j(this,dr).get(e.queryHash);t&&(e.destroy(),t===e&&j(this,dr).delete(e.queryHash),this.notify({type:"removed",query:e}))}clear(){Mn.batch(()=>{this.getAll().forEach(e=>{this.remove(e)})})}get(e){return j(this,dr).get(e)}getAll(){return[...j(this,dr).values()]}find(e){const t={exact:!0,...e};return this.getAll().find(r=>Ex(t,r))}findAll(e={}){const t=this.getAll();return Object.keys(e).length>0?t.filter(r=>Ex(e,r)):t}notify(e){Mn.batch(()=>{this.listeners.forEach(t=>{t(e)})})}onFocus(){Mn.batch(()=>{this.getAll().forEach(e=>{e.onFocus()})})}onOnline(){Mn.batch(()=>{this.getAll().forEach(e=>{e.onOnline()})})}},dr=new WeakMap,p_),hn,Ns,Ls,Ao,Po,Ds,No,Lo,m_,QM=(m_=class{constructor(i={}){rt(this,hn);rt(this,Ns);rt(this,Ls);rt(this,Ao);rt(this,Po);rt(this,Ds);rt(this,No);rt(this,Lo);ze(this,hn,i.queryCache||new KM),ze(this,Ns,i.mutationCache||new qM),ze(this,Ls,i.defaultOptions||{}),ze(this,Ao,new Map),ze(this,Po,new Map),ze(this,Ds,0)}mount(){uu(this,Ds)._++,j(this,Ds)===1&&(ze(this,No,cm.subscribe(async i=>{i&&(await this.resumePausedMutations(),j(this,hn).onFocus())})),ze(this,Lo,nd.subscribe(async i=>{i&&(await this.resumePausedMutations(),j(this,hn).onOnline())})))}unmount(){var i,e;uu(this,Ds)._--,j(this,Ds)===0&&((i=j(this,No))==null||i.call(this),ze(this,No,void 0),(e=j(this,Lo))==null||e.call(this),ze(this,Lo,void 0))}isFetching(i){return j(this,hn).findAll({...i,fetchStatus:"fetching"}).length}isMutating(i){return j(this,Ns).findAll({...i,status:"pending"}).length}getQueryData(i){var t;const e=this.defaultQueryOptions({queryKey:i});return(t=j(this,hn).get(e.queryHash))==null?void 0:t.state.data}ensureQueryData(i){const e=this.defaultQueryOptions(i),t=j(this,hn).build(this,e),r=t.state.data;return r===void 0?this.fetchQuery(i):(i.revalidateIfStale&&t.isStaleByTime(Us(e.staleTime,t))&&this.prefetchQuery(e),Promise.resolve(r))}getQueriesData(i){return j(this,hn).findAll(i).map(({queryKey:e,state:t})=>{const r=t.data;return[e,r]})}setQueryData(i,e,t){const r=this.defaultQueryOptions({queryKey:i}),a=j(this,hn).get(r.queryHash),l=a==null?void 0:a.state.data,c=NM(e,l);if(c!==void 0)return j(this,hn).build(this,r).setData(c,{...t,manual:!0})}setQueriesData(i,e,t){return Mn.batch(()=>j(this,hn).findAll(i).map(({queryKey:r})=>[r,this.setQueryData(r,e,t)]))}getQueryState(i){var t;const e=this.defaultQueryOptions({queryKey:i});return(t=j(this,hn).get(e.queryHash))==null?void 0:t.state}removeQueries(i){const e=j(this,hn);Mn.batch(()=>{e.findAll(i).forEach(t=>{e.remove(t)})})}resetQueries(i,e){const t=j(this,hn);return Mn.batch(()=>(t.findAll(i).forEach(r=>{r.reset()}),this.refetchQueries({type:"active",...i},e)))}cancelQueries(i,e={}){const t={revert:!0,...e},r=Mn.batch(()=>j(this,hn).findAll(i).map(a=>a.cancel(t)));return Promise.all(r).then(Zn).catch(Zn)}invalidateQueries(i,e={}){return Mn.batch(()=>(j(this,hn).findAll(i).forEach(t=>{t.invalidate()}),(i==null?void 0:i.refetchType)==="none"?Promise.resolve():this.refetchQueries({...i,type:(i==null?void 0:i.refetchType)??(i==null?void 0:i.type)??"active"},e)))}refetchQueries(i,e={}){const t={...e,cancelRefetch:e.cancelRefetch??!0},r=Mn.batch(()=>j(this,hn).findAll(i).filter(a=>!a.isDisabled()&&!a.isStatic()).map(a=>{let l=a.fetch(void 0,t);return t.throwOnError||(l=l.catch(Zn)),a.state.fetchStatus==="paused"?Promise.resolve():l}));return Promise.all(r).then(Zn)}fetchQuery(i){const e=this.defaultQueryOptions(i);e.retry===void 0&&(e.retry=!1);const t=j(this,hn).build(this,e);return t.isStaleByTime(Us(e.staleTime,t))?t.fetch(e):Promise.resolve(t.state.data)}prefetchQuery(i){return this.fetchQuery(i).then(Zn).catch(Zn)}fetchInfiniteQuery(i){return i._type="infinite",this.fetchQuery(i)}prefetchInfiniteQuery(i){return this.fetchInfiniteQuery(i).then(Zn).catch(Zn)}ensureInfiniteQueryData(i){return i._type="infinite",this.ensureQueryData(i)}resumePausedMutations(){return nd.isOnline()?j(this,Ns).resumePausedMutations():Promise.resolve()}getQueryCache(){return j(this,hn)}getMutationCache(){return j(this,Ns)}getDefaultOptions(){return j(this,Ls)}setDefaultOptions(i){ze(this,Ls,i)}setQueryDefaults(i,e){j(this,Ao).set(Ma(i),{queryKey:i,defaultOptions:e})}getQueryDefaults(i){const e=[...j(this,Ao).values()],t={};return e.forEach(r=>{Vl(i,r.queryKey)&&Object.assign(t,r.defaultOptions)}),t}setMutationDefaults(i,e){j(this,Po).set(Ma(i),{mutationKey:i,defaultOptions:e})}getMutationDefaults(i){const e=[...j(this,Po).values()],t={};return e.forEach(r=>{Vl(i,r.mutationKey)&&Object.assign(t,r.defaultOptions)}),t}defaultQueryOptions(i){if(i._defaulted)return i;const e={...j(this,Ls).queries,...this.getQueryDefaults(i.queryKey),...i,_defaulted:!0};return e.queryHash||(e.queryHash=um(e.queryKey,e)),e.refetchOnReconnect===void 0&&(e.refetchOnReconnect=e.networkMode!=="always"),e.throwOnError===void 0&&(e.throwOnError=!!e.suspense),!e.networkMode&&e.persister&&(e.networkMode="offlineFirst"),e.queryFn===dm&&(e.enabled=!1),e}defaultMutationOptions(i){return i!=null&&i._defaulted?i:{...j(this,Ls).mutations,...(i==null?void 0:i.mutationKey)&&this.getMutationDefaults(i.mutationKey),...i,_defaulted:!0}}clear(){j(this,hn).clear(),j(this,Ns).clear()}},hn=new WeakMap,Ns=new WeakMap,Ls=new WeakMap,Ao=new WeakMap,Po=new WeakMap,Ds=new WeakMap,No=new WeakMap,Lo=new WeakMap,m_),T_=V.createContext(void 0),pm=i=>{const e=V.useContext(T_);if(!e)throw new Error("No QueryClient set, use QueryClientProvider to set one");return e},ZM=({client:i,children:e})=>(V.useEffect(()=>(i.mount(),()=>{i.unmount()}),[i]),v.jsx(T_.Provider,{value:i,children:e})),C_=V.createContext(!1),JM=()=>V.useContext(C_);C_.Provider;function eE(){let i=!1;return{clearReset:()=>{i=!1},reset:()=>{i=!0},isReset:()=>i}}var tE=V.createContext(eE()),nE=()=>V.useContext(tE),iE=(i,e,t)=>{const r=t!=null&&t.state.error&&typeof i.throwOnError=="function"?hm(i.throwOnError,[t.state.error,t]):i.throwOnError;(i.suspense||i.experimental_prefetchInRender||r)&&(e.isReset()||(i.retryOnMount=!1))},rE=i=>{V.useEffect(()=>{i.clearReset()},[i])},sE=({result:i,errorResetBoundary:e,throwOnError:t,query:r,suspense:a})=>i.isError&&!e.isReset()&&!i.isFetching&&r&&(a&&i.data===void 0||hm(t,[i.error,r])),aE=i=>{if(i.suspense){const t=a=>a==="static"?a:Math.max(a??1e3,1e3),r=i.staleTime;i.staleTime=typeof r=="function"?(...a)=>t(r(...a)):t(r),typeof i.gcTime=="number"&&(i.gcTime=Math.max(i.gcTime,1e3))}},oE=(i,e)=>i.isLoading&&i.isFetching&&!e,lE=(i,e)=>(i==null?void 0:i.suspense)&&e.isPending,Lx=(i,e,t)=>e.fetchOptimistic(i).catch(()=>{t.clearReset()});function cE(i,e,t){var M,E,w,_;const r=JM(),a=nE(),l=pm(),c=l.defaultQueryOptions(i);(E=(M=l.getDefaultOptions().queries)==null?void 0:M._experimental_beforeQuery)==null||E.call(M,c);const d=l.getQueryCache().get(c.queryHash),h=i.subscribed!==!1;c._optimisticResults=r?"isRestoring":h?"optimistic":void 0,aE(c),iE(c,a,d),rE(a);const f=!l.getQueryCache().get(c.queryHash),[m]=V.useState(()=>new e(l,c)),g=m.getOptimisticResult(c),x=!r&&h;if(V.useSyncExternalStore(V.useCallback(S=>{const L=x?m.subscribe(Mn.batchCalls(S)):Zn;return m.updateResult(),L},[m,x]),()=>m.getCurrentResult(),()=>m.getCurrentResult()),V.useEffect(()=>{m.setOptions(c)},[c,m]),lE(c,g))throw Lx(c,m,a);if(sE({result:g,errorResetBoundary:a,throwOnError:c.throwOnError,query:d,suspense:c.suspense}))throw g.error;if((_=(w=l.getDefaultOptions().queries)==null?void 0:w._experimental_afterQuery)==null||_.call(w,c,g),c.experimental_prefetchInRender&&!Gl.isServer()&&oE(g,r)){const S=f?Lx(c,m,a):d==null?void 0:d.promise;S==null||S.catch(Zn).finally(()=>{m.updateResult()})}return c.notifyOnChangeProps?g:m.trackResult(g)}function Ea(i,e){return cE(i,jM)}function lr(i,e){const t=pm(),[r]=V.useState(()=>new YM(t,i));V.useEffect(()=>{r.setOptions(i)},[r,i]);const a=V.useSyncExternalStore(V.useCallback(c=>r.subscribe(Mn.batchCalls(c)),[r]),()=>r.getCurrentResult(),()=>r.getCurrentResult()),l=V.useCallback((c,d)=>{r.mutate(c,d).catch(Zn)},[r]);if(a.error&&hm(r.options.throwOnError,[a.error]))throw a.error;return{...a,mutate:l,mutateAsync:a.mutate}}/**
 * react-router v7.18.0
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */var mm=/^(?:[a-z][a-z0-9+.-]*:|[\\/]{2})/i,R_=/^[\\/]{2}/;function uE(i,e){return e+i.replace(/\\/g,"/")}var Dx="popstate";function Ix(i){return typeof i=="object"&&i!=null&&"pathname"in i&&"search"in i&&"hash"in i&&"state"in i&&"key"in i}function dE(i={}){function e(r,a){var f;let l=(f=a.state)==null?void 0:f.masked,{pathname:c,search:d,hash:h}=l||r.location;return hp("",{pathname:c,search:d,hash:h},a.state&&a.state.usr||null,a.state&&a.state.key||"default",l?{pathname:r.location.pathname,search:r.location.search,hash:r.location.hash}:void 0)}function t(r,a){return typeof a=="string"?a:jl(a)}return fE(e,t,null,i)}function sn(i,e){if(i===!1||i===null||typeof i>"u")throw new Error(e)}function Ui(i,e){if(!i){typeof console<"u"&&console.warn(e);try{throw new Error(e)}catch{}}}function hE(){return Math.random().toString(36).substring(2,10)}function Ux(i,e){return{usr:i.state,key:i.key,idx:e,masked:i.mask?{pathname:i.pathname,search:i.search,hash:i.hash}:void 0}}function hp(i,e,t=null,r,a){return{pathname:typeof i=="string"?i:i.pathname,search:"",hash:"",...typeof e=="string"?ko(e):e,state:t,key:e&&e.key||r||hE(),mask:a}}function jl({pathname:i="/",search:e="",hash:t=""}){return e&&e!=="?"&&(i+=e.charAt(0)==="?"?e:"?"+e),t&&t!=="#"&&(i+=t.charAt(0)==="#"?t:"#"+t),i}function ko(i){let e={};if(i){let t=i.indexOf("#");t>=0&&(e.hash=i.substring(t),i=i.substring(0,t));let r=i.indexOf("?");r>=0&&(e.search=i.substring(r),i=i.substring(0,r)),i&&(e.pathname=i)}return e}function fE(i,e,t,r={}){let{window:a=document.defaultView,v5Compat:l=!1}=r,c=a.history,d="POP",h=null,f=m();f==null&&(f=0,c.replaceState({...c.state,idx:f},""));function m(){return(c.state||{idx:null}).idx}function g(){d="POP";let _=m(),S=_==null?null:_-f;f=_,h&&h({action:d,location:w.location,delta:S})}function x(_,S){d="PUSH";let L=Ix(_)?_:hp(w.location,_,S);f=m()+1;let N=Ux(L,f),C=w.createHref(L.mask||L);try{c.pushState(N,"",C)}catch(U){if(U instanceof DOMException&&U.name==="DataCloneError")throw U;a.location.assign(C)}l&&h&&h({action:d,location:w.location,delta:1})}function M(_,S){d="REPLACE";let L=Ix(_)?_:hp(w.location,_,S);f=m();let N=Ux(L,f),C=w.createHref(L.mask||L);c.replaceState(N,"",C),l&&h&&h({action:d,location:w.location,delta:0})}function E(_){return pE(a,_)}let w={get action(){return d},get location(){return i(a,c)},listen(_){if(h)throw new Error("A history only accepts one active listener");return a.addEventListener(Dx,g),h=_,()=>{a.removeEventListener(Dx,g),h=null}},createHref(_){return e(a,_)},createURL:E,encodeLocation(_){let S=E(_);return{pathname:S.pathname,search:S.search,hash:S.hash}},push:x,replace:M,go(_){return c.go(_)}};return w}function pE(i,e,t=!1){let r="http://localhost";i&&(r=i.location.origin!=="null"?i.location.origin:i.location.href),sn(r,"No window.location.(origin|href) available to create URL");let a=typeof e=="string"?e:jl(e);return a=a.replace(/ $/,"%20"),!t&&R_.test(a)&&(a=r+a),new URL(a,r)}function A_(i,e,t="/"){return mE(i,e,t,!1)}function mE(i,e,t,r,a){let l=typeof e=="string"?ko(e):e,c=$r(l.pathname||"/",t);if(c==null)return null;let d=gE(i),h=null,f=CE(c);for(let m=0;h==null&&m<d.length;++m)h=TE(d[m],f,r);return h}function gE(i){let e=P_(i);return xE(e),e}function P_(i,e=[],t=[],r="",a=!1){let l=(c,d,h=a,f)=>{let m={relativePath:f===void 0?c.path||"":f,caseSensitive:c.caseSensitive===!0,childrenIndex:d,route:c};if(m.relativePath.startsWith("/")){if(!m.relativePath.startsWith(r)&&h)return;sn(m.relativePath.startsWith(r),`Absolute route path "${m.relativePath}" nested under path "${r}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`),m.relativePath=m.relativePath.slice(r.length)}let g=Qi([r,m.relativePath]),x=t.concat(m);c.children&&c.children.length>0&&(sn(c.index!==!0,`Index routes must not have child routes. Please remove all child routes from route path "${g}".`),P_(c.children,e,x,g,h)),!(c.path==null&&!c.index)&&e.push({path:g,score:wE(g,c.index),routesMeta:x.map((M,E)=>{let[w,_]=D_(M.relativePath,M.caseSensitive,E===x.length-1);return{...M,matcher:w,compiledParams:_}})})};return i.forEach((c,d)=>{var h;if(c.path===""||!((h=c.path)!=null&&h.includes("?")))l(c,d);else for(let f of N_(c.path))l(c,d,!0,f)}),e}function N_(i){let e=i.split("/");if(e.length===0)return[];let[t,...r]=e,a=t.endsWith("?"),l=t.replace(/\?$/,"");if(r.length===0)return a?[l,""]:[l];let c=N_(r.join("/")),d=[];return d.push(...c.map(h=>h===""?l:[l,h].join("/"))),a&&d.push(...c),d.map(h=>i.startsWith("/")&&h===""?"/":h)}function xE(i){i.sort((e,t)=>e.score!==t.score?t.score-e.score:bE(e.routesMeta.map(r=>r.childrenIndex),t.routesMeta.map(r=>r.childrenIndex)))}var vE=/^:[\w-]+$/,_E=3,yE=2,SE=1,ME=10,EE=-2,Fx=i=>i==="*";function wE(i,e){let t=i.split("/"),r=t.length;return t.some(Fx)&&(r+=EE),e&&(r+=yE),t.filter(a=>!Fx(a)).reduce((a,l)=>a+(vE.test(l)?_E:l===""?SE:ME),r)}function bE(i,e){return i.length===e.length&&i.slice(0,-1).every((r,a)=>r===e[a])?i[i.length-1]-e[e.length-1]:0}function TE(i,e,t=!1){let{routesMeta:r}=i,a={},l="/",c=[];for(let d=0;d<r.length;++d){let h=r[d],f=d===r.length-1,m=l==="/"?e:e.slice(l.length)||"/",g={path:h.relativePath,caseSensitive:h.caseSensitive,end:f},x=h.matcher&&h.compiledParams?L_(g,m,h.matcher,h.compiledParams):id(g,m),M=h.route;if(!x&&f&&t&&!r[r.length-1].route.index&&(x=id({path:h.relativePath,caseSensitive:h.caseSensitive,end:!1},m)),!x)return null;Object.assign(a,x.params),c.push({params:a,pathname:Qi([l,x.pathname]),pathnameBase:PE(Qi([l,x.pathnameBase])),route:M}),x.pathnameBase!=="/"&&(l=Qi([l,x.pathnameBase]))}return c}function id(i,e){typeof i=="string"&&(i={path:i,caseSensitive:!1,end:!0});let[t,r]=D_(i.path,i.caseSensitive,i.end);return L_(i,e,t,r)}function L_(i,e,t,r){let a=e.match(t);if(!a)return null;let l=a[0],c=l.replace(/(.)\/+$/,"$1"),d=a.slice(1);return{params:r.reduce((f,{paramName:m,isOptional:g},x)=>{if(m==="*"){let E=d[x]||"";c=l.slice(0,l.length-E.length).replace(/(.)\/+$/,"$1")}const M=d[x];return g&&!M?f[m]=void 0:f[m]=(M||"").replace(/%2F/g,"/"),f},{}),pathname:l,pathnameBase:c,pattern:i}}function D_(i,e=!1,t=!0){Ui(i==="*"||!i.endsWith("*")||i.endsWith("/*"),`Route path "${i}" will be treated as if it were "${i.replace(/\*$/,"/*")}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${i.replace(/\*$/,"/*")}".`);let r=[],a="^"+i.replace(/\/*\*?$/,"").replace(/^\/*/,"/").replace(/[\\.*+^${}|()[\]]/g,"\\$&").replace(/\/:([\w-]+)(\?)?/g,(c,d,h,f,m)=>{if(r.push({paramName:d,isOptional:h!=null}),h){let g=m.charAt(f+c.length);return g&&g!=="/"?"/([^\\/]*)":"(?:/([^\\/]*))?"}return"/([^\\/]+)"}).replace(/\/([\w-]+)\?(\/|$)/g,"(/$1)?$2");return i.endsWith("*")?(r.push({paramName:"*"}),a+=i==="*"||i==="/*"?"(.*)$":"(?:\\/(.+)|\\/*)$"):t?a+="\\/*$":i!==""&&i!=="/"&&(a+="(?:(?=\\/|$))"),[new RegExp(a,e?void 0:"i"),r]}function CE(i){try{return i.split("/").map(e=>decodeURIComponent(e).replace(/\//g,"%2F")).join("/")}catch(e){return Ui(!1,`The URL path "${i}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${e}).`),i}}function $r(i,e){if(e==="/")return i;if(!i.toLowerCase().startsWith(e.toLowerCase()))return null;let t=e.endsWith("/")?e.length-1:e.length,r=i.charAt(t);return r&&r!=="/"?null:i.slice(t)||"/"}function RE(i,e="/"){let{pathname:t,search:r="",hash:a=""}=typeof i=="string"?ko(i):i,l;return t?(t=I_(t),t.startsWith("/")?l=Ox(t.substring(1),"/"):l=Ox(t,e)):l=e,{pathname:l,search:NE(r),hash:LE(a)}}function Ox(i,e){let t=rd(e).split("/");return i.split("/").forEach(a=>{a===".."?t.length>1&&t.pop():a!=="."&&t.push(a)}),t.length>1?t.join("/"):"/"}function of(i,e,t,r){return`Cannot include a '${i}' character in a manually specified \`to.${e}\` field [${JSON.stringify(r)}].  Please separate it out to the \`to.${t}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`}function AE(i){return i.filter((e,t)=>t===0||e.route.path&&e.route.path.length>0)}function gm(i){let e=AE(i);return e.map((t,r)=>r===e.length-1?t.pathname:t.pathnameBase)}function pd(i,e,t,r=!1){let a;typeof i=="string"?a=ko(i):(a={...i},sn(!a.pathname||!a.pathname.includes("?"),of("?","pathname","search",a)),sn(!a.pathname||!a.pathname.includes("#"),of("#","pathname","hash",a)),sn(!a.search||!a.search.includes("#"),of("#","search","hash",a)));let l=i===""||a.pathname==="",c=l?"/":a.pathname,d;if(c==null)d=t;else{let g=e.length-1;if(!r&&c.startsWith("..")){let x=c.split("/");for(;x[0]==="..";)x.shift(),g-=1;a.pathname=x.join("/")}d=g>=0?e[g]:"/"}let h=RE(a,d),f=c&&c!=="/"&&c.endsWith("/"),m=(l||c===".")&&t.endsWith("/");return!h.pathname.endsWith("/")&&(f||m)&&(h.pathname+="/"),h}var I_=i=>i.replace(/[\\/]{2,}/g,"/"),Qi=i=>I_(i.join("/")),rd=i=>i.replace(/\/+$/,""),PE=i=>rd(i).replace(/^\/*/,"/"),NE=i=>!i||i==="?"?"":i.startsWith("?")?i:"?"+i,LE=i=>!i||i==="#"?"":i.startsWith("#")?i:"#"+i,DE=class{constructor(i,e,t,r=!1){this.status=i,this.statusText=e||"",this.internal=r,t instanceof Error?(this.data=t.toString(),this.error=t):this.data=t}};function IE(i){return i!=null&&typeof i.status=="number"&&typeof i.statusText=="string"&&typeof i.internal=="boolean"&&"data"in i}function UE(i){let e=i.map(t=>t.route.path).filter(Boolean);return Qi(e)||"/"}var U_=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";function F_(i,e){let t=i;if(typeof t!="string"||!mm.test(t))return{absoluteURL:void 0,isExternal:!1,to:t};let r=t,a=!1;if(U_)try{let l=new URL(window.location.href),c=R_.test(t)?new URL(uE(t,l.protocol)):new URL(t),d=$r(c.pathname,e);c.origin===l.origin&&d!=null?t=d+c.search+c.hash:a=!0}catch{Ui(!1,`<Link to="${t}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`)}return{absoluteURL:r,isExternal:a,to:t}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");var O_=["POST","PUT","PATCH","DELETE"];new Set(O_);var FE=["GET",...O_];new Set(FE);var OE=["about:","blob:","chrome:","chrome-untrusted:","content:","data:","devtools:","file:","filesystem:","javascript:"];function kE(i){try{return OE.includes(new URL(i).protocol)}catch{return!1}}var zo=V.createContext(null);zo.displayName="DataRouter";var md=V.createContext(null);md.displayName="DataRouterState";var k_=V.createContext(!1);function zE(){return V.useContext(k_)}var z_=V.createContext({isTransitioning:!1});z_.displayName="ViewTransition";var BE=V.createContext(new Map);BE.displayName="Fetchers";var HE=V.createContext(null);HE.displayName="Await";var Ei=V.createContext(null);Ei.displayName="Navigation";var tc=V.createContext(null);tc.displayName="Location";var Ji=V.createContext({outlet:null,matches:[],isDataRoute:!1});Ji.displayName="Route";var xm=V.createContext(null);xm.displayName="RouteError";var B_="REACT_ROUTER_ERROR",VE="REDIRECT",GE="ROUTE_ERROR_RESPONSE";function jE(i){if(i.startsWith(`${B_}:${VE}:{`))try{let e=JSON.parse(i.slice(28));if(typeof e=="object"&&e&&typeof e.status=="number"&&typeof e.statusText=="string"&&typeof e.location=="string"&&typeof e.reloadDocument=="boolean"&&typeof e.replace=="boolean")return e}catch{}}function WE(i){if(i.startsWith(`${B_}:${GE}:{`))try{let e=JSON.parse(i.slice(40));if(typeof e=="object"&&e&&typeof e.status=="number"&&typeof e.statusText=="string")return new DE(e.status,e.statusText,e.data)}catch{}}function XE(i,{relative:e}={}){sn(Bo(),"useHref() may be used only in the context of a <Router> component.");let{basename:t,navigator:r}=V.useContext(Ei),{hash:a,pathname:l,search:c}=nc(i,{relative:e}),d=l;return t!=="/"&&(d=l==="/"?t:Qi([t,l])),r.createHref({pathname:d,search:c,hash:a})}function Bo(){return V.useContext(tc)!=null}function er(){return sn(Bo(),"useLocation() may be used only in the context of a <Router> component."),V.useContext(tc).location}var H_="You should call navigate() in a React.useEffect(), not when your component is first rendered.";function V_(i){V.useContext(Ei).static||V.useLayoutEffect(i)}function vm(){let{isDataRoute:i}=V.useContext(Ji);return i?o1():$E()}function $E(){sn(Bo(),"useNavigate() may be used only in the context of a <Router> component.");let i=V.useContext(zo),{basename:e,navigator:t}=V.useContext(Ei),{matches:r}=V.useContext(Ji),{pathname:a}=er(),l=JSON.stringify(gm(r)),c=V.useRef(!1);return V_(()=>{c.current=!0}),V.useCallback((h,f={})=>{if(Ui(c.current,H_),!c.current)return;if(typeof h=="number"){t.go(h);return}let m=pd(h,JSON.parse(l),a,f.relative==="path");i==null&&e!=="/"&&(m.pathname=m.pathname==="/"?e:Qi([e,m.pathname])),(f.replace?t.replace:t.push)(m,f.state,f)},[e,t,l,a,i])}var qE=V.createContext(null);function YE(i){let e=V.useContext(Ji).outlet;return V.useMemo(()=>e&&V.createElement(qE.Provider,{value:i},e),[e,i])}function nc(i,{relative:e}={}){let{matches:t}=V.useContext(Ji),{pathname:r}=er(),a=JSON.stringify(gm(t));return V.useMemo(()=>pd(i,JSON.parse(a),r,e==="path"),[i,a,r,e])}function KE(i,e){return G_(i,e)}function G_(i,e,t){var _;sn(Bo(),"useRoutes() may be used only in the context of a <Router> component.");let{navigator:r}=V.useContext(Ei),{matches:a}=V.useContext(Ji),l=a[a.length-1],c=l?l.params:{},d=l?l.pathname:"/",h=l?l.pathnameBase:"/",f=l&&l.route;{let S=f&&f.path||"";W_(d,!f||S.endsWith("*")||S.endsWith("*?"),`You rendered descendant <Routes> (or called \`useRoutes()\`) at "${d}" (under <Route path="${S}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${S}"> to <Route path="${S==="/"?"*":`${S}/*`}">.`)}let m=er(),g;if(e){let S=typeof e=="string"?ko(e):e;sn(h==="/"||((_=S.pathname)==null?void 0:_.startsWith(h)),`When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${h}" but pathname "${S.pathname}" was given in the \`location\` prop.`),g=S}else g=m;let x=g.pathname||"/",M=x;if(h!=="/"){let S=h.replace(/^\//,"").split("/");M="/"+x.replace(/^\//,"").split("/").slice(S.length).join("/")}let E=t&&t.state.matches.length?t.state.matches.map(S=>Object.assign(S,{route:t.manifest[S.route.id]||S.route})):A_(i,{pathname:M});Ui(f||E!=null,`No routes matched location "${g.pathname}${g.search}${g.hash}" `),Ui(E==null||E[E.length-1].route.element!==void 0||E[E.length-1].route.Component!==void 0||E[E.length-1].route.lazy!==void 0,`Matched leaf route at location "${g.pathname}${g.search}${g.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`);let w=t1(E&&E.map(S=>Object.assign({},S,{params:Object.assign({},c,S.params),pathname:Qi([h,r.encodeLocation?r.encodeLocation(S.pathname.replace(/%/g,"%25").replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:S.pathname]),pathnameBase:S.pathnameBase==="/"?h:Qi([h,r.encodeLocation?r.encodeLocation(S.pathnameBase.replace(/%/g,"%25").replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:S.pathnameBase])})),a,t);return e&&w?V.createElement(tc.Provider,{value:{location:{pathname:"/",search:"",hash:"",state:null,key:"default",mask:void 0,...g},navigationType:"POP"}},w):w}function QE(){let i=a1(),e=IE(i)?`${i.status} ${i.statusText}`:i instanceof Error?i.message:JSON.stringify(i),t=i instanceof Error?i.stack:null,r="rgba(200,200,200, 0.5)",a={padding:"0.5rem",backgroundColor:r},l={padding:"2px 4px",backgroundColor:r},c=null;return console.error("Error handled by React Router default ErrorBoundary:",i),c=V.createElement(V.Fragment,null,V.createElement("p",null,"💿 Hey developer 👋"),V.createElement("p",null,"You can provide a way better UX than this when your app throws errors by providing your own ",V.createElement("code",{style:l},"ErrorBoundary")," or"," ",V.createElement("code",{style:l},"errorElement")," prop on your route.")),V.createElement(V.Fragment,null,V.createElement("h2",null,"Unexpected Application Error!"),V.createElement("h3",{style:{fontStyle:"italic"}},e),t?V.createElement("pre",{style:a},t):null,c)}var ZE=V.createElement(QE,null),j_=class extends V.Component{constructor(i){super(i),this.state={location:i.location,revalidation:i.revalidation,error:i.error}}static getDerivedStateFromError(i){return{error:i}}static getDerivedStateFromProps(i,e){return e.location!==i.location||e.revalidation!=="idle"&&i.revalidation==="idle"?{error:i.error,location:i.location,revalidation:i.revalidation}:{error:i.error!==void 0?i.error:e.error,location:e.location,revalidation:i.revalidation||e.revalidation}}componentDidCatch(i,e){this.props.onError?this.props.onError(i,e):console.error("React Router caught the following error during render",i)}render(){let i=this.state.error;if(this.context&&typeof i=="object"&&i&&"digest"in i&&typeof i.digest=="string"){const t=WE(i.digest);t&&(i=t)}let e=i!==void 0?V.createElement(Ji.Provider,{value:this.props.routeContext},V.createElement(xm.Provider,{value:i,children:this.props.component})):this.props.children;return this.context?V.createElement(JE,{error:i},e):e}};j_.contextType=k_;var lf=new WeakMap;function JE({children:i,error:e}){let{basename:t}=V.useContext(Ei);if(typeof e=="object"&&e&&"digest"in e&&typeof e.digest=="string"){let r=jE(e.digest);if(r){let a=lf.get(e);if(a)throw a;let l=F_(r.location,t),c=l.absoluteURL||l.to;if(kE(c))throw new Error("Invalid redirect location");if(U_&&!lf.get(e))if(l.isExternal||r.reloadDocument)window.location.href=c;else{const d=Promise.resolve().then(()=>window.__reactRouterDataRouter.navigate(l.to,{replace:r.replace}));throw lf.set(e,d),d}return V.createElement("meta",{httpEquiv:"refresh",content:`0;url=${c}`})}}return i}function e1({routeContext:i,match:e,children:t}){let r=V.useContext(zo);return r&&r.static&&r.staticContext&&(e.route.errorElement||e.route.ErrorBoundary)&&(r.staticContext._deepestRenderedBoundaryId=e.route.id),V.createElement(Ji.Provider,{value:i},t)}function t1(i,e=[],t){let r=t==null?void 0:t.state;if(i==null){if(!r)return null;if(r.errors)i=r.matches;else if(e.length===0&&!r.initialized&&r.matches.length>0)i=r.matches;else return null}let a=i,l=r==null?void 0:r.errors;if(l!=null){let m=a.findIndex(g=>g.route.id&&(l==null?void 0:l[g.route.id])!==void 0);sn(m>=0,`Could not find a matching route for errors on route IDs: ${Object.keys(l).join(",")}`),a=a.slice(0,Math.min(a.length,m+1))}let c=!1,d=-1;if(t&&r){c=r.renderFallback;for(let m=0;m<a.length;m++){let g=a[m];if((g.route.HydrateFallback||g.route.hydrateFallbackElement)&&(d=m),g.route.id){let{loaderData:x,errors:M}=r,E=g.route.loader&&!x.hasOwnProperty(g.route.id)&&(!M||M[g.route.id]===void 0);if(g.route.lazy||E){t.isStatic&&(c=!0),d>=0?a=a.slice(0,d+1):a=[a[0]];break}}}}let h=t==null?void 0:t.onError,f=r&&h?(m,g)=>{var x,M;h(m,{location:r.location,params:((M=(x=r.matches)==null?void 0:x[0])==null?void 0:M.params)??{},pattern:UE(r.matches),errorInfo:g})}:void 0;return a.reduceRight((m,g,x)=>{let M,E=!1,w=null,_=null;r&&(M=l&&g.route.id?l[g.route.id]:void 0,w=g.route.errorElement||ZE,c&&(d<0&&x===0?(W_("route-fallback",!1,"No `HydrateFallback` element provided to render during initial hydration"),E=!0,_=null):d===x&&(E=!0,_=g.route.hydrateFallbackElement||null)));let S=e.concat(a.slice(0,x+1)),L=()=>{let N;return M?N=w:E?N=_:g.route.Component?N=V.createElement(g.route.Component,null):g.route.element?N=g.route.element:N=m,V.createElement(e1,{match:g,routeContext:{outlet:m,matches:S,isDataRoute:r!=null},children:N})};return r&&(g.route.ErrorBoundary||g.route.errorElement||x===0)?V.createElement(j_,{location:r.location,revalidation:r.revalidation,component:w,error:M,children:L(),routeContext:{outlet:null,matches:S,isDataRoute:!0},onError:f}):L()},null)}function _m(i){return`${i} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function n1(i){let e=V.useContext(zo);return sn(e,_m(i)),e}function i1(i){let e=V.useContext(md);return sn(e,_m(i)),e}function r1(i){let e=V.useContext(Ji);return sn(e,_m(i)),e}function ym(i){let e=r1(i),t=e.matches[e.matches.length-1];return sn(t.route.id,`${i} can only be used on routes that contain a unique "id"`),t.route.id}function s1(){return ym("useRouteId")}function a1(){var r;let i=V.useContext(xm),e=i1("useRouteError"),t=ym("useRouteError");return i!==void 0?i:(r=e.errors)==null?void 0:r[t]}function o1(){let{router:i}=n1("useNavigate"),e=ym("useNavigate"),t=V.useRef(!1);return V_(()=>{t.current=!0}),V.useCallback(async(a,l={})=>{Ui(t.current,H_),t.current&&(typeof a=="number"?await i.navigate(a):await i.navigate(a,{fromRouteId:e,...l}))},[i,e])}var kx={};function W_(i,e,t){!e&&!kx[i]&&(kx[i]=!0,Ui(!1,t))}V.memo(l1);function l1({routes:i,manifest:e,future:t,state:r,isStatic:a,onError:l}){return G_(i,void 0,{manifest:e,state:r,isStatic:a,onError:l})}function cf({to:i,replace:e,state:t,relative:r}){sn(Bo(),"<Navigate> may be used only in the context of a <Router> component.");let{static:a}=V.useContext(Ei);Ui(!a,"<Navigate> must not be used on the initial render in a <StaticRouter>. This is a no-op, but you should modify your code so the <Navigate> is only ever rendered in response to some user interaction or state change.");let{matches:l}=V.useContext(Ji),{pathname:c}=er(),d=vm(),h=pd(i,gm(l),c,r==="path"),f=JSON.stringify(h);return V.useEffect(()=>{d(JSON.parse(f),{replace:e,state:t,relative:r})},[d,f,r,e,t]),null}function c1(i){return YE(i.context)}function $i(i){sn(!1,"A <Route> is only ever to be used as the child of <Routes> element, never rendered directly. Please wrap your <Route> in a <Routes>.")}function u1({basename:i="/",children:e=null,location:t,navigationType:r="POP",navigator:a,static:l=!1,useTransitions:c}){sn(!Bo(),"You cannot render a <Router> inside another <Router>. You should never have more than one in your app.");let d=i.replace(/^\/*/,"/"),h=V.useMemo(()=>({basename:d,navigator:a,static:l,useTransitions:c,future:{}}),[d,a,l,c]);typeof t=="string"&&(t=ko(t));let{pathname:f="/",search:m="",hash:g="",state:x=null,key:M="default",mask:E}=t,w=V.useMemo(()=>{let _=$r(f,d);return _==null?null:{location:{pathname:_,search:m,hash:g,state:x,key:M,mask:E},navigationType:r}},[d,f,m,g,x,M,r,E]);return Ui(w!=null,`<Router basename="${d}"> is not able to match the URL "${f}${m}${g}" because it does not start with the basename, so the <Router> won't render anything.`),w==null?null:V.createElement(Ei.Provider,{value:h},V.createElement(tc.Provider,{children:e,value:w}))}function d1({children:i,location:e}){return KE(fp(i),e)}function fp(i,e=[]){let t=[];return V.Children.forEach(i,(r,a)=>{if(!V.isValidElement(r))return;let l=[...e,a];if(r.type===V.Fragment){t.push.apply(t,fp(r.props.children,l));return}sn(r.type===$i,`[${typeof r.type=="string"?r.type:r.type.name}] is not a <Route> component. All component children of <Routes> must be a <Route> or <React.Fragment>`),sn(!r.props.index||!r.props.children,"An index route cannot have child routes.");let c={id:r.props.id||l.join("-"),caseSensitive:r.props.caseSensitive,element:r.props.element,Component:r.props.Component,index:r.props.index,path:r.props.path,middleware:r.props.middleware,loader:r.props.loader,action:r.props.action,hydrateFallbackElement:r.props.hydrateFallbackElement,HydrateFallback:r.props.HydrateFallback,errorElement:r.props.errorElement,ErrorBoundary:r.props.ErrorBoundary,hasErrorBoundary:r.props.hasErrorBoundary===!0||r.props.ErrorBoundary!=null||r.props.errorElement!=null,shouldRevalidate:r.props.shouldRevalidate,handle:r.props.handle,lazy:r.props.lazy};r.props.children&&(c.children=fp(r.props.children,l)),t.push(c)}),t}var ju="get",Wu="application/x-www-form-urlencoded";function gd(i){return typeof HTMLElement<"u"&&i instanceof HTMLElement}function h1(i){return gd(i)&&i.tagName.toLowerCase()==="button"}function f1(i){return gd(i)&&i.tagName.toLowerCase()==="form"}function p1(i){return gd(i)&&i.tagName.toLowerCase()==="input"}function m1(i){return!!(i.metaKey||i.altKey||i.ctrlKey||i.shiftKey)}function g1(i,e){return i.button===0&&(!e||e==="_self")&&!m1(i)}function pp(i=""){return new URLSearchParams(typeof i=="string"||Array.isArray(i)||i instanceof URLSearchParams?i:Object.keys(i).reduce((e,t)=>{let r=i[t];return e.concat(Array.isArray(r)?r.map(a=>[t,a]):[[t,r]])},[]))}function x1(i,e){let t=pp(i);return e&&e.forEach((r,a)=>{t.has(a)||e.getAll(a).forEach(l=>{t.append(a,l)})}),t}var fu=null;function v1(){if(fu===null)try{new FormData(document.createElement("form"),0),fu=!1}catch{fu=!0}return fu}var _1=new Set(["application/x-www-form-urlencoded","multipart/form-data","text/plain"]);function uf(i){return i!=null&&!_1.has(i)?(Ui(!1,`"${i}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${Wu}"`),null):i}function y1(i,e){let t,r,a,l,c;if(f1(i)){let d=i.getAttribute("action");r=d?$r(d,e):null,t=i.getAttribute("method")||ju,a=uf(i.getAttribute("enctype"))||Wu,l=new FormData(i)}else if(h1(i)||p1(i)&&(i.type==="submit"||i.type==="image")){let d=i.form;if(d==null)throw new Error('Cannot submit a <button> or <input type="submit"> without a <form>');let h=i.getAttribute("formaction")||d.getAttribute("action");if(r=h?$r(h,e):null,t=i.getAttribute("formmethod")||d.getAttribute("method")||ju,a=uf(i.getAttribute("formenctype"))||uf(d.getAttribute("enctype"))||Wu,l=new FormData(d,i),!v1()){let{name:f,type:m,value:g}=i;if(m==="image"){let x=f?`${f}.`:"";l.append(`${x}x`,"0"),l.append(`${x}y`,"0")}else f&&l.append(f,g)}}else{if(gd(i))throw new Error('Cannot submit element that is not <form>, <button>, or <input type="submit|image">');t=ju,r=null,a=Wu,c=i}return l&&a==="text/plain"&&(c=l,l=void 0),{action:r,method:t.toLowerCase(),encType:a,formData:l,body:c}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");function Sm(i,e){if(i===!1||i===null||typeof i>"u")throw new Error(e)}function X_(i,e,t,r){let a=typeof i=="string"?new URL(i,typeof window>"u"?"server://singlefetch/":window.location.origin):i;return t?a.pathname.endsWith("/")?a.pathname=`${a.pathname}_.${r}`:a.pathname=`${a.pathname}.${r}`:a.pathname==="/"?a.pathname=`_root.${r}`:e&&$r(a.pathname,e)==="/"?a.pathname=`${rd(e)}/_root.${r}`:a.pathname=`${rd(a.pathname)}.${r}`,a}async function S1(i,e){if(i.id in e)return e[i.id];try{let t=await import(i.module);return e[i.id]=t,t}catch(t){return console.error(`Error loading route module \`${i.module}\`, reloading page...`),console.error(t),window.__reactRouterContext&&window.__reactRouterContext.isSpaMode,window.location.reload(),new Promise(()=>{})}}function M1(i){return i==null?!1:i.href==null?i.rel==="preload"&&typeof i.imageSrcSet=="string"&&typeof i.imageSizes=="string":typeof i.rel=="string"&&typeof i.href=="string"}async function E1(i,e,t){let r=await Promise.all(i.map(async a=>{let l=e.routes[a.route.id];if(l){let c=await S1(l,t);return c.links?c.links():[]}return[]}));return C1(r.flat(1).filter(M1).filter(a=>a.rel==="stylesheet"||a.rel==="preload").map(a=>a.rel==="stylesheet"?{...a,rel:"prefetch",as:"style"}:{...a,rel:"prefetch"}))}function zx(i,e,t,r,a,l){let c=(h,f)=>t[f]?h.route.id!==t[f].route.id:!0,d=(h,f)=>{var m;return t[f].pathname!==h.pathname||((m=t[f].route.path)==null?void 0:m.endsWith("*"))&&t[f].params["*"]!==h.params["*"]};return l==="assets"?e.filter((h,f)=>c(h,f)||d(h,f)):l==="data"?e.filter((h,f)=>{var g;let m=r.routes[h.route.id];if(!m||!m.hasLoader)return!1;if(c(h,f)||d(h,f))return!0;if(h.route.shouldRevalidate){let x=h.route.shouldRevalidate({currentUrl:new URL(a.pathname+a.search+a.hash,window.origin),currentParams:((g=t[0])==null?void 0:g.params)||{},nextUrl:new URL(i,window.origin),nextParams:h.params,defaultShouldRevalidate:!0});if(typeof x=="boolean")return x}return!0}):[]}function w1(i,e,{includeHydrateFallback:t}={}){return b1(i.map(r=>{let a=e.routes[r.route.id];if(!a)return[];let l=[a.module];return a.clientActionModule&&(l=l.concat(a.clientActionModule)),a.clientLoaderModule&&(l=l.concat(a.clientLoaderModule)),t&&a.hydrateFallbackModule&&(l=l.concat(a.hydrateFallbackModule)),a.imports&&(l=l.concat(a.imports)),l}).flat(1))}function b1(i){return[...new Set(i)]}function T1(i){let e={},t=Object.keys(i).sort();for(let r of t)e[r]=i[r];return e}function C1(i,e){let t=new Set;return new Set(e),i.reduce((r,a)=>{let l=JSON.stringify(T1(a));return t.has(l)||(t.add(l),r.push({key:l,link:a})),r},[])}function Mm(){let i=V.useContext(zo);return Sm(i,"You must render this element inside a <DataRouterContext.Provider> element"),i}function R1(){let i=V.useContext(md);return Sm(i,"You must render this element inside a <DataRouterStateContext.Provider> element"),i}var Em=V.createContext(void 0);Em.displayName="FrameworkContext";function xd(){let i=V.useContext(Em);return Sm(i,"You must render this element inside a <HydratedRouter> element"),i}function A1(i,e){let t=V.useContext(Em),[r,a]=V.useState(!1),[l,c]=V.useState(!1),{onFocus:d,onBlur:h,onMouseEnter:f,onMouseLeave:m,onTouchStart:g}=e,x=V.useRef(null);V.useEffect(()=>{if(i==="render"&&c(!0),i==="viewport"){let w=S=>{S.forEach(L=>{c(L.isIntersecting)})},_=new IntersectionObserver(w,{threshold:.5});return x.current&&_.observe(x.current),()=>{_.disconnect()}}},[i]),V.useEffect(()=>{if(r){let w=setTimeout(()=>{c(!0)},100);return()=>{clearTimeout(w)}}},[r]);let M=()=>{a(!0)},E=()=>{a(!1),c(!1)};return t?i!=="intent"?[l,x,{}]:[l,x,{onFocus:bl(d,M),onBlur:bl(h,E),onMouseEnter:bl(f,M),onMouseLeave:bl(m,E),onTouchStart:bl(g,M)}]:[!1,x,{}]}function bl(i,e){return t=>{i&&i(t),t.defaultPrevented||e(t)}}function P1({page:i,...e}){let t=zE(),{nonce:r}=xd(),{router:a}=Mm(),l=V.useMemo(()=>A_(a.routes,i,a.basename),[a.routes,i,a.basename]);return l?(e.nonce==null&&r&&(e={...e,nonce:r}),t?V.createElement(L1,{page:i,matches:l,...e}):V.createElement(D1,{page:i,matches:l,...e})):null}function N1(i){let{manifest:e,routeModules:t}=xd(),[r,a]=V.useState([]);return V.useEffect(()=>{let l=!1;return E1(i,e,t).then(c=>{l||a(c)}),()=>{l=!0}},[i,e,t]),r}function L1({page:i,matches:e,...t}){let r=er(),{future:a}=xd(),{basename:l}=Mm(),c=V.useMemo(()=>{if(i===r.pathname+r.search+r.hash)return[];let d=X_(i,l,a.v8_trailingSlashAwareDataRequests,"rsc"),h=!1,f=[];for(let m of e)typeof m.route.shouldRevalidate=="function"?h=!0:f.push(m.route.id);return h&&f.length>0&&d.searchParams.set("_routes",f.join(",")),[d.pathname+d.search]},[l,a.v8_trailingSlashAwareDataRequests,i,r,e]);return V.createElement(V.Fragment,null,c.map(d=>V.createElement("link",{key:d,rel:"prefetch",as:"fetch",href:d,...t})))}function D1({page:i,matches:e,...t}){let r=er(),{future:a,manifest:l,routeModules:c}=xd(),{basename:d}=Mm(),{loaderData:h,matches:f}=R1(),m=V.useMemo(()=>zx(i,e,f,l,r,"data"),[i,e,f,l,r]),g=V.useMemo(()=>zx(i,e,f,l,r,"assets"),[i,e,f,l,r]),x=V.useMemo(()=>{if(i===r.pathname+r.search+r.hash)return[];let w=new Set,_=!1;if(e.forEach(L=>{var C;let N=l.routes[L.route.id];!N||!N.hasLoader||(!m.some(U=>U.route.id===L.route.id)&&L.route.id in h&&((C=c[L.route.id])!=null&&C.shouldRevalidate)||N.hasClientLoader?_=!0:w.add(L.route.id))}),w.size===0)return[];let S=X_(i,d,a.v8_trailingSlashAwareDataRequests,"data");return _&&w.size>0&&S.searchParams.set("_routes",e.filter(L=>w.has(L.route.id)).map(L=>L.route.id).join(",")),[S.pathname+S.search]},[d,a.v8_trailingSlashAwareDataRequests,h,r,l,m,e,i,c]),M=V.useMemo(()=>w1(g,l),[g,l]),E=N1(g);return V.createElement(V.Fragment,null,x.map(w=>V.createElement("link",{key:w,rel:"prefetch",as:"fetch",href:w,...t})),M.map(w=>V.createElement("link",{key:w,rel:"modulepreload",href:w,...t})),E.map(({key:w,link:_})=>V.createElement("link",{key:w,nonce:t.nonce,..._,crossOrigin:_.crossOrigin??t.crossOrigin})))}function I1(...i){return e=>{i.forEach(t=>{typeof t=="function"?t(e):t!=null&&(t.current=e)})}}var U1=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";try{U1&&(window.__reactRouterVersion="7.18.0")}catch{}function F1({basename:i,children:e,useTransitions:t,window:r}){let a=V.useRef();a.current==null&&(a.current=dE({window:r,v5Compat:!0}));let l=a.current,[c,d]=V.useState({action:l.action,location:l.location}),h=V.useCallback(f=>{t===!1?d(f):V.startTransition(()=>d(f))},[t]);return V.useLayoutEffect(()=>l.listen(h),[l,h]),V.createElement(u1,{basename:i,children:e,location:c.location,navigationType:c.action,navigator:l,useTransitions:t})}var $_=V.forwardRef(function({onClick:e,discover:t="render",prefetch:r="none",relative:a,reloadDocument:l,replace:c,mask:d,state:h,target:f,to:m,preventScrollReset:g,viewTransition:x,defaultShouldRevalidate:M,...E},w){let{basename:_,navigator:S,useTransitions:L}=V.useContext(Ei),N=typeof m=="string"&&mm.test(m),C=F_(m,_);m=C.to;let U=XE(m,{relative:a}),D=er(),k=null;if(d){let z=pd(d,[],D.mask?D.mask.pathname:"/",!0);_!=="/"&&(z.pathname=z.pathname==="/"?_:Qi([_,z.pathname])),k=S.createHref(z)}let[b,F,B]=A1(r,E),G=z1(m,{replace:c,mask:d,state:h,target:f,preventScrollReset:g,relative:a,viewTransition:x,defaultShouldRevalidate:M,useTransitions:L});function Z(z){e&&e(z),z.defaultPrevented||G(z)}let re=!(C.isExternal||l),he=V.createElement("a",{...E,...B,href:(re?k:void 0)||C.absoluteURL||U,onClick:re?Z:e,ref:I1(w,F),target:f,"data-discover":!N&&t==="render"?"true":void 0});return b&&!N?V.createElement(V.Fragment,null,he,V.createElement(P1,{page:U})):he});$_.displayName="Link";var mo=V.forwardRef(function({"aria-current":e="page",caseSensitive:t=!1,className:r="",end:a=!1,style:l,to:c,viewTransition:d,children:h,...f},m){let g=nc(c,{relative:f.relative}),x=er(),M=V.useContext(md),{navigator:E,basename:w}=V.useContext(Ei),_=M!=null&&W1(g)&&d===!0,S=E.encodeLocation?E.encodeLocation(g).pathname:g.pathname,L=x.pathname,N=M&&M.navigation&&M.navigation.location?M.navigation.location.pathname:null;t||(L=L.toLowerCase(),N=N?N.toLowerCase():null,S=S.toLowerCase()),N&&w&&(N=$r(N,w)||N);const C=S!=="/"&&S.endsWith("/")?S.length-1:S.length;let U=L===S||!a&&L.startsWith(S)&&L.charAt(C)==="/",D=N!=null&&(N===S||!a&&N.startsWith(S)&&N.charAt(S.length)==="/"),k={isActive:U,isPending:D,isTransitioning:_},b=U?e:void 0,F;typeof r=="function"?F=r(k):F=[r,U?"active":null,D?"pending":null,_?"transitioning":null].filter(Boolean).join(" ");let B=typeof l=="function"?l(k):l;return V.createElement($_,{...f,"aria-current":b,className:F,ref:m,style:B,to:c,viewTransition:d},typeof h=="function"?h(k):h)});mo.displayName="NavLink";var O1=V.forwardRef(({discover:i="render",fetcherKey:e,navigate:t,reloadDocument:r,replace:a,state:l,method:c=ju,action:d,onSubmit:h,relative:f,preventScrollReset:m,viewTransition:g,defaultShouldRevalidate:x,...M},E)=>{let{useTransitions:w}=V.useContext(Ei),_=G1(),S=j1(d,{relative:f}),L=c.toLowerCase()==="get"?"get":"post",N=typeof d=="string"&&mm.test(d),C=U=>{if(h&&h(U),U.defaultPrevented)return;U.preventDefault();let D=U.nativeEvent.submitter,k=(D==null?void 0:D.getAttribute("formmethod"))||c,b=()=>_(D||U.currentTarget,{fetcherKey:e,method:k,navigate:t,replace:a,state:l,relative:f,preventScrollReset:m,viewTransition:g,defaultShouldRevalidate:x});w&&t!==!1?V.startTransition(()=>b()):b()};return V.createElement("form",{ref:E,method:L,action:S,onSubmit:r?h:C,...M,"data-discover":!N&&i==="render"?"true":void 0})});O1.displayName="Form";function k1(i){return`${i} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function q_(i){let e=V.useContext(zo);return sn(e,k1(i)),e}function z1(i,{target:e,replace:t,mask:r,state:a,preventScrollReset:l,relative:c,viewTransition:d,defaultShouldRevalidate:h,useTransitions:f}={}){let m=vm(),g=er(),x=nc(i,{relative:c});return V.useCallback(M=>{if(g1(M,e)){M.preventDefault();let E=t!==void 0?t:jl(g)===jl(x),w=()=>m(i,{replace:E,mask:r,state:a,preventScrollReset:l,relative:c,viewTransition:d,defaultShouldRevalidate:h});f?V.startTransition(()=>w()):w()}},[g,m,x,t,r,a,e,i,l,c,d,h,f])}function B1(i){Ui(typeof URLSearchParams<"u","You cannot use the `useSearchParams` hook in a browser that does not support the URLSearchParams API. If you need to support Internet Explorer 11, we recommend you load a polyfill such as https://github.com/ungap/url-search-params.");let e=V.useRef(pp(i)),t=V.useRef(!1),r=er(),a=V.useMemo(()=>x1(r.search,t.current?null:e.current),[r.search]),l=vm(),c=V.useCallback((d,h)=>{const f=pp(typeof d=="function"?d(new URLSearchParams(a)):d);t.current=!0,l("?"+f,h)},[l,a]);return[a,c]}var H1=0,V1=()=>`__${String(++H1)}__`;function G1(){let{router:i}=q_("useSubmit"),{basename:e}=V.useContext(Ei),t=s1(),r=i.fetch,a=i.navigate;return V.useCallback(async(l,c={})=>{let{action:d,method:h,encType:f,formData:m,body:g}=y1(l,e);if(c.navigate===!1){let x=c.fetcherKey||V1();await r(x,t,c.action||d,{defaultShouldRevalidate:c.defaultShouldRevalidate,preventScrollReset:c.preventScrollReset,formData:m,body:g,formMethod:c.method||h,formEncType:c.encType||f,flushSync:c.flushSync})}else await a(c.action||d,{defaultShouldRevalidate:c.defaultShouldRevalidate,preventScrollReset:c.preventScrollReset,formData:m,body:g,formMethod:c.method||h,formEncType:c.encType||f,replace:c.replace,state:c.state,fromRouteId:t,flushSync:c.flushSync,viewTransition:c.viewTransition})},[r,a,e,t])}function j1(i,{relative:e}={}){let{basename:t}=V.useContext(Ei),r=V.useContext(Ji);sn(r,"useFormAction must be used inside a RouteContext");let[a]=r.matches.slice(-1),l={...nc(i||".",{relative:e})},c=er();if(i==null){l.search=c.search;let d=new URLSearchParams(l.search),h=d.getAll("index");if(h.some(m=>m==="")){d.delete("index"),h.filter(g=>g).forEach(g=>d.append("index",g));let m=d.toString();l.search=m?`?${m}`:""}}return(!i||i===".")&&a.route.index&&(l.search=l.search?l.search.replace(/^\?/,"?index&"):"?index"),t!=="/"&&(l.pathname=l.pathname==="/"?t:Qi([t,l.pathname])),jl(l)}function W1(i,{relative:e}={}){let t=V.useContext(z_);sn(t!=null,"`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?");let{basename:r}=q_("useViewTransitionState"),a=nc(i,{relative:e});if(!t.isTransitioning)return!1;let l=$r(t.currentLocation.pathname,r)||t.currentLocation.pathname,c=$r(t.nextLocation.pathname,r)||t.nextLocation.pathname;return id(a.pathname,c)!=null||id(a.pathname,l)!=null}/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X1=i=>i.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),Y_=(...i)=>i.filter((e,t,r)=>!!e&&e.trim()!==""&&r.indexOf(e)===t).join(" ").trim();/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var $1={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q1=V.forwardRef(({color:i="currentColor",size:e=24,strokeWidth:t=2,absoluteStrokeWidth:r,className:a="",children:l,iconNode:c,...d},h)=>V.createElement("svg",{ref:h,...$1,width:e,height:e,stroke:i,strokeWidth:r?Number(t)*24/Number(e):t,className:Y_("lucide",a),...d},[...c.map(([f,m])=>V.createElement(f,m)),...Array.isArray(l)?l:[l]]));/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ct=(i,e)=>{const t=V.forwardRef(({className:r,...a},l)=>V.createElement(q1,{ref:l,iconNode:e,className:Y_(`lucide-${X1(i)}`,r),...a}));return t.displayName=`${i}`,t};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y1=Ct("ArchiveRestore",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h2",key:"tvwodi"}],["path",{d:"M20 8v11a2 2 0 0 1-2 2h-2",key:"1gkqxj"}],["path",{d:"m9 15 3-3 3 3",key:"1pd0qc"}],["path",{d:"M12 12v9",key:"192myk"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K1=Ct("Archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q1=Ct("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z1=Ct("Box",[["path",{d:"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",key:"hh9hay"}],["path",{d:"m3.3 7 8.7 5 8.7-5",key:"g66t2b"}],["path",{d:"M12 22V12",key:"d0xqtd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J1=Ct("Boxes",[["path",{d:"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",key:"lc1i9w"}],["path",{d:"m7 16.5-4.74-2.85",key:"1o9zyk"}],["path",{d:"m7 16.5 5-3",key:"va8pkn"}],["path",{d:"M7 16.5v5.17",key:"jnp8gn"}],["path",{d:"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",key:"8zsnat"}],["path",{d:"m17 16.5-5-3",key:"8arw3v"}],["path",{d:"m17 16.5 4.74-2.85",key:"8rfmw"}],["path",{d:"M17 16.5v5.17",key:"k6z78m"}],["path",{d:"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",key:"1xygjf"}],["path",{d:"M12 8 7.26 5.15",key:"1vbdud"}],["path",{d:"m12 8 4.74-2.85",key:"3rx089"}],["path",{d:"M12 13.5V8",key:"1io7kd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wm=Ct("Camera",[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",key:"1tc9qg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ew=Ct("ChartLine",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K_=Ct("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tw=Ct("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nw=Ct("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bm=Ct("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iw=Ct("Circle",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rw=Ct("Crop",[["path",{d:"M6 2v14a2 2 0 0 0 2 2h14",key:"ron5a4"}],["path",{d:"M18 22V8a2 2 0 0 0-2-2H2",key:"7s9ehn"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sw=Ct("Crown",[["path",{d:"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",key:"1vdc57"}],["path",{d:"M5 21h14",key:"11awu3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aw=Ct("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ow=Ct("EyeOff",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xu=Ct("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lw=Ct("FlaskConical",[["path",{d:"M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2",key:"18mbvz"}],["path",{d:"M6.453 15h11.094",key:"3shlmq"}],["path",{d:"M8.5 2h7",key:"csnxdl"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bx=Ct("Hammer",[["path",{d:"m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9",key:"eefl8a"}],["path",{d:"m18 15 4-4",key:"16gjal"}],["path",{d:"m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5",key:"b7pghm"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cw=Ct("Image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uw=Ct("Images",[["path",{d:"M18 22H4a2 2 0 0 1-2-2V6",key:"pblm9e"}],["path",{d:"m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18",key:"nf6bnh"}],["circle",{cx:"12",cy:"8",r:"2",key:"1822b1"}],["rect",{width:"16",height:"16",x:"6",y:"2",rx:"2",key:"12espp"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Un=Ct("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dw=Ct("Maximize2",[["polyline",{points:"15 3 21 3 21 9",key:"mznyad"}],["polyline",{points:"9 21 3 21 3 15",key:"1avn1i"}],["line",{x1:"21",x2:"14",y1:"3",y2:"10",key:"ota7mn"}],["line",{x1:"3",x2:"10",y1:"21",y2:"14",key:"1atl0r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hw=Ct("Package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["path",{d:"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7",key:"yx3hmr"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tm=Ct("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hx=Ct("Plug",[["path",{d:"M12 22v-5",key:"1ega77"}],["path",{d:"M9 8V2",key:"14iosj"}],["path",{d:"M15 8V2",key:"18g5xt"}],["path",{d:"M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z",key:"osxo6l"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fw=Ct("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pw=Ct("RotateCw",[["path",{d:"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",key:"1p45f6"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q_=Ct("Scissors",[["circle",{cx:"6",cy:"6",r:"3",key:"1lh9wr"}],["path",{d:"M8.12 8.12 12 12",key:"1alkpv"}],["path",{d:"M20 4 8.12 15.88",key:"xgtan2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["path",{d:"M14.8 14.8 20 20",key:"ptml3r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z_=Ct("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ta=Ct("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cm=Ct("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mw=Ct("Undo2",[["path",{d:"M9 14 4 9l5-5",key:"102s5s"}],["path",{d:"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11",key:"f3b9sd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J_=Ct("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vx=Ct("WandSparkles",[["path",{d:"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72",key:"ul74o6"}],["path",{d:"m14 7 3 3",key:"1r5n42"}],["path",{d:"M5 6v4",key:"ilb8ba"}],["path",{d:"M19 14v4",key:"blhpug"}],["path",{d:"M10 2v2",key:"7u0qdc"}],["path",{d:"M7 8H3",key:"zfb6yr"}],["path",{d:"M21 16h-4",key:"1cnmox"}],["path",{d:"M11 3H9",key:"1obp7u"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ey=Ct("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);async function rn(i,e){var r;const t=await fetch(i,e);if(!t.ok){let a="";try{a=((r=await t.json())==null?void 0:r.detail)??""}catch{}throw new Error(a||`HTTP ${t.status} (${i})`)}return t.json()}const en=(i,e)=>rn(i,{method:"POST",headers:{"Content-Type":"application/json"},body:e!==void 0?JSON.stringify(e):void 0}),Wl=i=>rn(i,{method:"DELETE"}),gw={K:"♚",Q:"♛",R:"♜",B:"♝",N:"♞",P:"♟"};function Gx({label:i,className:e=""}){if(i==="empty")return v.jsx("span",{className:`text-zinc-500 ${e}`,children:"·"});if(i==="occluded")return v.jsx("span",{className:`text-amber-300 ${e}`,children:"▦"});const t=gw[i==null?void 0:i[1]]??i,r=(i==null?void 0:i[0])==="w";return v.jsx("span",{className:e,style:{color:r?"#fafafa":"#0a0a0a",textShadow:r?"0 0 1px #000, 0 1px 2px #000":"0 0 1px #fff, 0 1px 2px #fff"},children:t})}function fn({title:i,right:e,children:t,className:r=""}){return v.jsxs("div",{className:`rounded-xl border border-zinc-800 bg-zinc-900 p-4 ${r}`,children:[(i||e)&&v.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[i&&v.jsx("h2",{className:"text-xs font-medium uppercase tracking-wide text-zinc-400",children:i}),e]}),t]})}function Tt({children:i,variant:e="ghost",className:t="",onClick:r,disabled:a,...l}){const[c,d]=V.useState(!1),h=e==="primary"?"bg-sky-500 text-zinc-950 hover:bg-sky-400 font-medium":"bg-zinc-800 text-zinc-200 hover:bg-zinc-700";async function f(m){if(!r)return;const g=r(m);if(g&&typeof g.then=="function"){d(!0);try{await g}finally{d(!1)}}}return v.jsxs("button",{...l,onClick:f,disabled:a||c,className:`relative inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm transition
        disabled:cursor-not-allowed disabled:opacity-40 ${h} ${t}`,children:[v.jsx("span",{className:`inline-flex items-center gap-2 ${c?"invisible":""}`,children:i}),c&&v.jsx(Un,{className:"absolute h-4 w-4 animate-spin"})]})}function oa({label:i,children:e,...t}){return v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:[i,v.jsx("select",{...t,className:"rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",children:e})]})}const xw={err:"bg-red-950/60 text-red-300",busy:"bg-sky-950/60 text-sky-300 animate-pulse",ok:"bg-emerald-950/60 text-emerald-300"},Rm=i=>xw[i]??"text-zinc-500",df="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";function vw({coverage:i,sweep:e,sets:t,setSets:r,count:a,setCount:l,passes:c,setPasses:d,pieces:h,setPieces:f,together:m,setTogether:g,offset:x,setOffset:M,autoOffset:E,setAutoOffset:w,maxPlies:_,setMaxPlies:S,input:L}){return i?v.jsxs(v.Fragment,{children:[v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Number of physical piece sets: with 2 sets, queens/kings come twice as fast.",children:["Sets",v.jsx("input",{type:"number",min:1,value:t,onChange:N=>r(+N.target.value),className:`${L} w-16`})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Number of dense setups generated against your weakest classes.",children:["Setups",v.jsx("input",{type:"number",min:1,value:a,onChange:N=>l(+N.target.value),className:`${L} w-20`})]})]}):e?v.jsxs(v.Fragment,{children:[v.jsxs("div",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Which pieces walk across the board: special = non-pawns (K,Q,R,B,N), pawn = only pawns, all = everything.",children:["Pieces",v.jsxs(oa,{label:"",value:h,onChange:N=>f(N.target.value),children:[v.jsx("option",{value:"special",children:"special (K,Q,R,B,N)"}),v.jsx("option",{value:"pawn",children:"pawn (only pawns)"}),v.jsx("option",{value:"all",children:"all"})]})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Repeats (each pass 8 photos, ranks 1–8) — e.g. with different lighting. No piece rearrangement.",children:["Passes",v.jsx("input",{type:"number",min:1,value:c,onChange:N=>d(+N.target.value),className:`${L} w-16`})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Number of physical piece sets: with 2 sets, twice as many pieces per photo possible.",children:["Sets",v.jsx("input",{type:"number",min:1,value:t,onChange:N=>r(+N.target.value),className:`${L} w-16`})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Both colors on the board at once (white in front, black 4 ranks offset) → half the photos, every square gets both colors.",children:[v.jsx("input",{type:"checkbox",checked:m,onChange:N=>g(N.target.checked)})," both colors at once"]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Auto offset: counts previous sweep sessions and picks the next offset → each piece lands on different files across sessions (prevents position overfitting).",children:[v.jsx("input",{type:"checkbox",checked:E,onChange:N=>w(N.target.checked)})," Offset auto"]}),!E&&v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Shifts the line→piece assignment, fixed for this session. 0: a=King,b=Queen,…  1: a=Queen,b=Rook,…",children:["Offset",v.jsx("input",{type:"number",min:0,max:7,value:x,onChange:N=>M(+N.target.value),className:`${L} w-16`})]})]}):v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Max plies",v.jsx("input",{type:"number",value:_,onChange:N=>S(+N.target.value),className:`${L} w-20`})]})}function _w(){const[i,e]=V.useState("random"),[t,r]=V.useState(40),[a,l]=V.useState(1),[c,d]=V.useState(20),[h,f]=V.useState(1),[m,g]=V.useState("special"),[x,M]=V.useState(!0),[E,w]=V.useState(0),[_,S]=V.useState(!0),[L,N]=V.useState("default"),[C,U]=V.useState(0),D=i==="coverage",k=i==="sweep",[b,F]=V.useState({active:!1}),[B,G]=V.useState(""),[Z,re]=V.useState(""),he=V.useRef(null);V.useEffect(()=>(rn("/api/collect/state").then(F).catch(()=>{}),()=>clearInterval(he.current)),[]);const z=()=>rn("/api/collect/state").then(F).catch(()=>{});async function ae(){G(""),re("");try{const X=await en("/api/collect/start",{strategy:i,max_plies:t,profile:L,camera:C,sets:a,count:c,passes:h,pieces:m,together:x,offset:E,auto_offset:_});F(X),clearInterval(he.current),he.current=setInterval(z,1500)}catch(X){G("Error: "+X.message),re("err")}}async function ee(){G("Capturing..."),re("busy");try{F(await en("/api/collect/shoot")),G("Captured ✓"),re("ok")}catch(X){G("Error: "+X.message),re("err")}}async function q(){G("Skipping..."),re("busy");try{F(await en("/api/collect/skip")),G(""),re("")}catch(X){G("Error: "+X.message),re("err")}}async function de(){G("Undoing..."),re("busy");try{F(await en("/api/collect/undo")),G("Undone ✓"),re("ok")}catch(X){G("Error: "+X.message),re("err")}}async function ce(){G("Finishing..."),re("busy");try{const X=await en("/api/collect/finish");clearInterval(he.current),F({active:!1}),G(`Session finished: ${X.captures} captures, ${X.sliced??0} crops sliced → Datasets tab.`),re("ok")}catch(X){G("Error: "+X.message),re("err")}}const P=Rm(Z);return v.jsxs("div",{className:"space-y-4",children:[v.jsxs(fn,{children:[v.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[v.jsxs(oa,{label:"Engine",value:i,onChange:X=>e(X.target.value),children:[v.jsx("option",{value:"random",children:"random (built-in)"}),v.jsx("option",{value:"stockfish",children:"stockfish (auto-detected)"}),v.jsx("option",{value:"coverage",children:"coverage (target rare classes)"}),v.jsx("option",{value:"sweep",children:"sweep (pieces walk the board)"})]}),v.jsx(vw,{coverage:D,sweep:k,input:df,sets:a,setSets:l,count:c,setCount:d,passes:h,setPasses:f,pieces:m,setPieces:g,together:x,setTogether:M,offset:E,setOffset:w,autoOffset:_,setAutoOffset:S,maxPlies:t,setMaxPlies:r}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Profile",v.jsx("input",{value:L,onChange:X=>N(X.target.value),className:`${df} w-28`})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Camera",v.jsx("input",{type:"number",value:C,onChange:X=>U(+X.target.value),className:`${df} w-16`})]}),b.active?v.jsxs(Tt,{onClick:ce,children:[v.jsx(bm,{className:"h-4 w-4"})," Done"]}):v.jsxs(Tt,{variant:"primary",onClick:ae,children:[v.jsx(Tm,{className:"h-4 w-4"})," Start game"]})]}),B&&v.jsx("div",{className:`mt-2 rounded-lg px-3 py-1.5 text-sm ${P}`,children:B})]}),b.active&&v.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_320px]",children:[v.jsx(fn,{title:"Live camera",children:v.jsx("img",{src:"/api/camera/collect.mjpg",alt:"Live capture",className:"w-full rounded-lg border border-zinc-800"})}),v.jsx(fn,{title:"Capture",children:v.jsxs("div",{className:"space-y-3",children:[b.done?v.jsxs("div",{className:"font-medium text-green-500",children:["✓ All ",b.n_positions," positions captured."]}):v.jsxs(v.Fragment,{children:[v.jsx(yw,{st:b}),v.jsxs("div",{className:"flex flex-wrap gap-2",children:[!b.done&&v.jsxs(Tt,{variant:"primary",onClick:ee,className:"px-5 py-2.5 text-base",children:[v.jsx(wm,{className:"h-5 w-5"})," Photo"]}),!b.done&&v.jsxs(Tt,{onClick:q,children:[v.jsx(Q1,{className:"h-4 w-4"})," Skip"]}),v.jsxs(Tt,{onClick:de,children:[v.jsx(mw,{className:"h-4 w-4"})," Undo"]})]})]}),v.jsxs("div",{className:"text-sm",children:["Captures: ",v.jsx("b",{className:"text-sky-400",children:b.captures}),v.jsx("span",{className:"ml-1 text-xs text-green-500",children:"· instantly saved ✓"})]}),v.jsxs("p",{className:"text-xs text-zinc-500",children:["Each capture is ",v.jsx("b",{children:"saved instantly"}),' — you can press "Done" (above) any time or just stop; nothing is lost.']})]})})]}),v.jsxs("p",{className:"text-xs text-zinc-500",children:['After "Done" the session is sliced automatically. Curated datasets (dedup, rotation, split) are built in the ',v.jsx("b",{className:"text-zinc-300",children:"Datasets"})," tab."]})]})}function yw({st:i}){const e=Math.min(i.index+1,i.n_positions),t=i.build_target?"Setup":"Position",r=i.build_target&&i.gains?v.jsxs("span",{className:"ml-1 text-xs text-zinc-500",children:["· ",i.gains," target squares"]}):null;let a;i.build_target?a=v.jsxs(v.Fragment,{children:["Position ",v.jsx("b",{children:"set up fresh"})," — ",v.jsx("b",{className:"text-sky-300",children:"piece names"})," are overlaid on the live image (white = light text, black = dark),"]}):i.index===0?a=v.jsxs(v.Fragment,{children:["Set up the ",v.jsx("b",{children:"starting position"}),","]}):a=v.jsxs(v.Fragment,{children:["Play this move: ",v.jsx("b",{className:"text-base text-sky-300",children:i.move_san})," ",v.jsx("span",{className:"text-zinc-400",children:"(red arrow)"}),","]});const l=i.build_target?v.jsx(v.Fragment,{children:"(feel free to take several with varying light)"}):null;return v.jsxs(v.Fragment,{children:[v.jsxs("div",{className:"text-sm text-zinc-400",children:[t," ",v.jsx("b",{className:"text-zinc-100",children:e})," / ",i.n_positions,r]}),v.jsxs("div",{className:"rounded-lg bg-zinc-800 p-3 text-sm",children:[a,v.jsxs("div",{className:"mt-1 text-xs text-zinc-400",children:["…then ",v.jsx("b",{children:"Photo"}),l,"."]})]})]})}const fo="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-sky-500",hf=({isActive:i})=>`rounded-lg px-3 py-1.5 text-sm transition ${i?"bg-zinc-800 text-zinc-100":"text-zinc-400 hover:text-zinc-100"}`;function Sw(){return v.jsxs("div",{className:"space-y-4",children:[v.jsxs("nav",{className:"flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5",children:[v.jsx(mo,{to:"sessions",className:hf,children:"Sessions"}),v.jsx(mo,{to:"curated",className:hf,children:"Curated datasets"}),v.jsx(mo,{to:"stats",className:hf,children:"Statistics"})]}),v.jsx(c1,{})]})}const ty=()=>{const i=pm();return(...e)=>e.forEach(t=>i.invalidateQueries({queryKey:[t]}))},Fl=v.jsx(Un,{className:"h-3.5 w-3.5 animate-spin"}),Tl=(i,e)=>{var t;return i.isPending&&(i.variables===e||((t=i.variables)==null?void 0:t.sid)===e)},Mw=(i,e)=>i?Fl:e?v.jsx(iw,{className:"h-3.5 w-3.5"}):v.jsx(bm,{className:"h-3.5 w-3.5"});function Ew({m:i,openReview:e,reviewedM:t,sliceM:r,archiveM:a,restoreM:l,deleteM:c}){return v.jsxs("div",{className:"flex justify-end gap-1.5",children:[v.jsxs(Tt,{onClick:()=>e(i.session_id),disabled:!i.n_frames,className:"px-2 py-1 text-xs disabled:opacity-50",children:[v.jsx(Xu,{className:"h-3.5 w-3.5"})," Review"]}),v.jsxs(Tt,{onClick:()=>t.mutate({sid:i.session_id,reviewed:!i.reviewed}),disabled:t.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[Mw(Tl(t,i.session_id),i.reviewed)," ",i.reviewed?"Mark new":"Mark reviewed"]}),!i.archived&&v.jsxs(Tt,{onClick:()=>r.mutate(i.session_id),disabled:r.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[Tl(r,i.session_id)?Fl:v.jsx(Q_,{className:"h-3.5 w-3.5"})," ",i.n_crops?"Re-slice":"Slice"]}),i.archived?v.jsxs(Tt,{onClick:()=>l.mutateAsync(i.session_id),disabled:l.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[Tl(l,i.session_id)?Fl:v.jsx(Y1,{className:"h-3.5 w-3.5"})," Restore"]}):v.jsxs(Tt,{onClick:()=>a.mutateAsync(i.session_id),disabled:a.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[Tl(a,i.session_id)?Fl:v.jsx(K1,{className:"h-3.5 w-3.5"})," Archive"]}),v.jsxs(Tt,{onClick:()=>window.confirm(`Delete session "${i.session_id}" permanently?`)&&c.mutateAsync(i.session_id),disabled:c.isPending,className:"px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50",children:[Tl(c,i.session_id)?Fl:v.jsx(Ta,{className:"h-3.5 w-3.5"})," Delete"]})]})}function ww(){var q,de,ce;const i=ty(),[e,t]=V.useState(""),[r,a]=V.useState(""),[l,c]=V.useState(""),[d,h]=V.useState(0),[f,m]=V.useState(!1),g=Ea({queryKey:["sessions-manage"],queryFn:()=>rn("/api/sessions/manage")}),x=Ea({queryKey:["session-review",l,d],queryFn:()=>rn(`/api/sessions/${encodeURIComponent(l)}/review?idx=${d}`),enabled:!!l}),M=g.data??[],E=M.filter(P=>!P.variant),w=E.filter(P=>f||!P.reviewed),_=E.filter(P=>!P.reviewed).length,S=E.length-_,L=M.filter(P=>P.variant),N=E.length===0?"No sessions yet — capture some in the Collect tab.":"No new sessions — all reviewed. Tick “Show reviewed” to see them.",C=P=>{t(P),a("ok"),i("sessions-manage","stats","datasets")},U=P=>{t("Error: "+P.message),a("err")},D=P=>{t(P),a("busy")},k=lr({mutationFn:P=>en(`/api/sessions/${P}/slice`),onMutate:P=>D(`slicing "${P}" ...`),onSuccess:P=>C(`"${P.session}" sliced: ${P.crops} crops.`),onError:U}),b=P=>{c(P),h(0)},F=()=>{c(""),h(0)},B=x.data,G=(()=>{var P,X;if(B){const Le=(P=B.entry)!=null&&P.move_san?` | ${B.entry.move_san}`:"",Be=((X=B.entry)==null?void 0:X.ply)!==void 0?` | ply ${B.entry.ply}`:"";return`Frame ${B.index+1} / ${B.count}${Le}${Be}`}return x.isError?"Could not load session details.":"Loading session details..."})(),Z=lr({mutationFn:P=>en(`/api/sessions/${P}/archive`),onSuccess:()=>C("archived."),onError:U}),re=lr({mutationFn:P=>en(`/api/sessions/${P}/restore`),onSuccess:()=>C("restored — re-slice."),onError:U}),he=lr({mutationFn:P=>Wl(`/api/sessions/${P}`),onSuccess:()=>C("deleted."),onError:U}),z=lr({mutationFn:({sid:P,keep_frames:X})=>en(`/api/sessions/${P}/trim`,{keep_frames:X}),onSuccess:P=>{C(`trimmed "${P.session_id}": kept ${P.kept_frames}, moved ${P.removed_frames} to rejects.`),h(X=>Math.min(X,Math.max(0,P.kept_frames-1))),i("session-review")},onError:U}),ae=lr({mutationFn:({sid:P,idx:X,unusable:Le})=>en(`/api/sessions/${P}/flag/${X}`,{unusable:Le}),onSuccess:()=>{i("session-review","sessions-manage")},onError:U}),ee=lr({mutationFn:({sid:P,reviewed:X})=>en(`/api/sessions/${P}/reviewed`,{reviewed:X}),onSuccess:P=>C(P.reviewed?"marked reviewed.":"marked new."),onError:U});return v.jsxs(fn,{title:"Sessions (raw material)",right:v.jsxs("div",{className:"flex items-center gap-3 text-xs text-zinc-500",children:[v.jsxs("label",{className:"flex cursor-pointer items-center gap-1.5 text-zinc-400",children:[v.jsx("input",{type:"checkbox",checked:f,onChange:P=>m(P.target.checked),className:"accent-sky-500"}),"Show reviewed (",S,")"]}),v.jsxs("span",{children:[_," new / ",L.length," ingested"]})]}),children:[e&&v.jsx("div",{className:`mb-2 rounded-lg px-3 py-1.5 text-sm ${Rm(r)}`,children:e}),w.length===0?v.jsx("span",{className:"text-sm text-zinc-500",children:N}):v.jsxs("table",{className:"w-full text-sm",children:[v.jsx("thead",{children:v.jsxs("tr",{className:"text-zinc-500",children:[v.jsx("th",{className:"text-left font-normal",children:"Session"}),v.jsx("th",{className:"text-left font-normal",children:"Mode"}),v.jsx("th",{className:"text-right font-normal",children:"Frames"}),v.jsx("th",{className:"text-right font-normal",children:"Crops"}),v.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),v.jsx("tbody",{children:w.map(P=>v.jsxs("tr",{className:"border-t border-zinc-800",children:[v.jsxs("td",{className:"py-1.5 text-zinc-200",children:[P.session_id,P.reviewed&&v.jsx("span",{className:"ml-2 rounded bg-emerald-900/60 px-1.5 py-0.5 text-[10px] text-emerald-300",children:"reviewed"}),!P.reviewed&&v.jsx("span",{className:"ml-2 rounded bg-sky-900/60 px-1.5 py-0.5 text-[10px] text-sky-300",children:"new"}),P.archived&&v.jsx("span",{className:"ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300",children:"archived"}),!P.archived&&P.n_crops===0&&v.jsx("span",{className:"ml-2 rounded bg-amber-900/60 px-1.5 py-0.5 text-[10px] text-amber-300",children:"not sliced"})]}),v.jsx("td",{className:"text-zinc-400",children:P.mode??"—"}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:P.n_frames}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:P.archived?"—":P.n_crops}),v.jsx("td",{className:"py-1",children:v.jsx(Ew,{m:P,openReview:b,reviewedM:ee,sliceM:k,archiveM:Z,restoreM:re,deleteM:he})})]},P.session_id))})]}),l&&v.jsxs("div",{className:"mt-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3",children:[v.jsxs("div",{className:"mb-3 flex flex-wrap items-center justify-between gap-2",children:[v.jsxs("div",{children:[v.jsx("div",{className:"text-sm font-medium text-zinc-200",children:l}),v.jsx("div",{className:"text-xs text-zinc-500",children:G}),B&&v.jsxs("div",{className:"text-[11px] text-zinc-600",children:["Trim keeps this frame included; only frames after it move to the reject bucket and leave training data.",B.index>=B.count-1?" This is already the last frame.":""]})]}),v.jsxs("div",{className:"flex items-center gap-1.5",children:[v.jsxs(Tt,{onClick:()=>h(P=>Math.max(0,P-1)),disabled:!B||B.index<=0,className:"px-2 py-1 text-xs disabled:opacity-50",title:"Previous frame",children:[v.jsx(tw,{className:"h-3.5 w-3.5"})," Prev"]}),v.jsxs(Tt,{onClick:()=>h(P=>Math.min(((B==null?void 0:B.count)??1)-1,P+1)),disabled:!B||B.index>=B.count-1,className:"px-2 py-1 text-xs disabled:opacity-50",title:"Next frame",children:["Next ",v.jsx(nw,{className:"h-3.5 w-3.5"})]}),v.jsxs(Tt,{onClick:F,className:"px-2 py-1 text-xs",children:[v.jsx(ey,{className:"h-3.5 w-3.5"})," Close"]}),v.jsxs(Tt,{onClick:()=>{var P;return ae.mutate({sid:l,idx:B.index,unusable:!((P=B==null?void 0:B.entry)!=null&&P.unusable)})},disabled:!B||ae.isPending,className:`px-2 py-1 text-xs disabled:opacity-50 ${(q=B==null?void 0:B.entry)!=null&&q.unusable?"bg-red-900/60 text-red-300 hover:text-red-200":""}`,title:"Mark this frame as unsuitable for training (hand visible, extra piece, etc.). Excluded from slice/dataset build.",children:[ae.isPending?v.jsx(Un,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(ow,{className:"h-3.5 w-3.5"}),(de=B==null?void 0:B.entry)!=null&&de.unusable?"Unusable (flagged)":"Unusable?"]}),v.jsxs(Tt,{onClick:()=>{const P=((B==null?void 0:B.index)??0)+1;window.confirm(`Keep frames 1-${P}, including the current frame. Move all later frames to the reject bucket and remove them from training data?`)&&z.mutate({sid:l,keep_frames:P})},disabled:!B||B.index>=B.count-1||z.isPending,className:"px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50",title:"Keeps the current frame; moves only later frames to the reject bucket and removes their crops from training data",children:[z.isPending?v.jsx(Un,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(Q_,{className:"h-3.5 w-3.5"}),"Keep through this frame"]})]})]}),x.isError&&v.jsx("div",{className:"rounded-lg bg-red-950/60 px-3 py-1.5 text-sm text-red-300",children:x.error.message}),B&&v.jsxs("div",{className:"grid gap-3 lg:grid-cols-2",children:[v.jsxs("div",{children:[v.jsxs("div",{className:"mb-1 text-xs font-medium text-zinc-500",children:["ArUco-aligned frame",B.overlay_available?"":" (raw fallback)"]}),v.jsx("img",{src:B.overlay_url,alt:`${l} overlay ${B.index+1}`,className:"max-h-[70vh] w-full rounded border border-zinc-800 object-contain"})]}),v.jsxs("div",{children:[v.jsx("div",{className:"mb-1 text-xs font-medium text-zinc-500",children:"Logged board"}),v.jsx("img",{src:B.board_url,alt:`${l} board ${B.index+1}`,className:"max-h-[70vh] w-full rounded border border-zinc-800 bg-zinc-100 object-contain"}),v.jsx("div",{className:"mt-2 break-all rounded bg-zinc-900 px-2 py-1 text-[11px] text-zinc-500",children:(ce=B.entry)==null?void 0:ce.fen})]})]})]}),L.length>0&&v.jsxs(v.Fragment,{children:[v.jsx("div",{className:"mt-5 mb-1 text-sm font-medium text-zinc-300",children:"Ingested datasets (pretrain variants)"}),v.jsxs("p",{className:"mb-2 text-xs text-zinc-500",children:["Imported via ",v.jsx("code",{children:"chesslab ingest"}),". Their crops live in a separate variant manifest (",v.jsx("code",{children:"squares__<tag>.jsonl"}),") and never mix with your camera dataset — train on them with ",v.jsx("code",{children:"train --dataset <tag>"}),". No slicing here."]}),v.jsxs("table",{className:"w-full text-sm",children:[v.jsx("thead",{children:v.jsxs("tr",{className:"text-zinc-500",children:[v.jsx("th",{className:"text-left font-normal",children:"Session"}),v.jsx("th",{className:"text-left font-normal",children:"Variant"}),v.jsx("th",{className:"text-right font-normal",children:"Frames"}),v.jsx("th",{className:"text-right font-normal",children:"Variant crops"}),v.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),v.jsx("tbody",{children:L.map(P=>v.jsxs("tr",{className:"border-t border-zinc-800",children:[v.jsxs("td",{className:"py-1.5 text-zinc-200",children:[P.session_id,P.archived&&v.jsx("span",{className:"ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300",children:"archived"})]}),v.jsx("td",{children:v.jsx("span",{className:"rounded bg-indigo-950/60 px-1.5 py-0.5 text-[10px] text-indigo-300",children:P.variant})}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:P.n_frames}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:P.n_crops}),v.jsx("td",{className:"py-1",children:v.jsx("div",{className:"flex justify-end gap-1.5",children:v.jsxs(Tt,{onClick:()=>{window.confirm(`Delete ingested session "${P.session_id}"? (variant crops stay; re-ingest to recreate)`)&&he.mutateAsync(P.session_id)},disabled:he.isPending,className:"px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50",children:[he.isPending&&he.variables===P.session_id?v.jsx(Un,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(Ta,{className:"h-3.5 w-3.5"})," Delete"]})})})]},P.session_id))})]})]})]})}function bw(){const i=ty(),[e,t]=V.useState(""),[r,a]=V.useState(""),[l,c]=V.useState(!1),[d,h]=V.useState(""),[f,m]=V.useState({}),[g,x]=V.useState(4),[M,E]=V.useState(!0),[w,_]=V.useState(6),[S,L]=V.useState(!0),[N,C]=V.useState(.15),[U,D]=V.useState(.15),k=Ea({queryKey:["sessions-manage"],queryFn:()=>rn("/api/sessions/manage")}),b=Ea({queryKey:["datasets"],queryFn:()=>rn("/api/datasets")}),F=(k.data??[]).filter(z=>!z.archived&&!z.variant),B=b.data??[],G=lr({mutationFn:z=>en("/api/datasets",z),onSuccess:z=>{t(`"${z.name}" built: raw ${z.counts.raw} → dedup ${z.counts.after_dedup} → final ${z.counts.final}.`),a("ok"),c(!1),h(""),m({}),i("datasets","stats")},onError:z=>{t("Error: "+z.message),a("err")}}),Z=lr({mutationFn:z=>Wl(`/api/datasets/${z}`),onSuccess:()=>{t("deleted."),a("ok"),i("datasets")},onError:z=>{t("Error: "+z.message),a("err")}}),re=lr({mutationFn:z=>en(`/api/datasets/${z}/rebuild`),onSuccess:z=>{var ae;t(`"${z.name}" rebuilt: ${(ae=z.counts)==null?void 0:ae.final} crops.`),a("ok"),i("datasets","stats")},onError:z=>{t("Error: "+z.message),a("err")}});function he(){const z=F.filter(ae=>f[ae.session_id]).map(ae=>ae.session_id);if(!d.trim()||z.length===0){t("Name and at least one session required.");return}G.mutate({name:d.trim(),session_ids:z,per_cell_cap:g,phash_enabled:M,phash_hamming:w,rotate:S,val_frac:N,test_frac:U})}return v.jsxs(fn,{title:"Curated datasets",right:v.jsxs("div",{className:"flex items-center gap-2",children:[e&&v.jsx("span",{className:`rounded-lg px-2 py-0.5 text-xs ${Rm(r)}`,children:e}),v.jsxs(Tt,{onClick:()=>c(z=>!z),className:"px-2 py-1 text-xs",children:[v.jsx(J1,{className:"h-3.5 w-3.5"})," New Dataset"]})]}),children:[l&&v.jsxs("div",{className:"mb-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3",children:[v.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["Name",v.jsx("input",{value:d,onChange:z=>h(z.target.value),className:`${fo} w-40`,placeholder:"e.g. set-a"})]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",title:"max. crops per (session, square, piece)",children:["Cap/cell",v.jsx("input",{type:"number",min:1,value:g,onChange:z=>x(+z.target.value),className:`${fo} w-16`})]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:[v.jsx("input",{type:"checkbox",checked:M,onChange:z=>E(z.target.checked)})," pHash"]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["Hamming",v.jsx("input",{type:"number",min:0,max:32,value:w,disabled:!M,onChange:z=>_(+z.target.value),className:`${fo} w-14`})]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",title:"90/180/270° → 4× crops. WARNING: violates the fixed-camera assumption — A/B test.",children:[v.jsx("input",{type:"checkbox",checked:S,onChange:z=>L(z.target.checked)})," ",v.jsx(pw,{className:"h-3.5 w-3.5"})," Rotation"]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["val",v.jsx("input",{type:"number",step:.05,min:0,max:.5,value:N,onChange:z=>C(+z.target.value),className:`${fo} w-14`})]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["test",v.jsx("input",{type:"number",step:.05,min:0,max:.5,value:U,onChange:z=>D(+z.target.value),className:`${fo} w-14`})]})]}),v.jsxs("div",{children:[v.jsxs("div",{className:"mb-1 text-xs text-zinc-500",children:["Sessions (collected only — datasets may overlap):",v.jsx("button",{className:"ml-2 text-[10px] text-zinc-400 underline",onClick:()=>{const z={};F.forEach(ae=>z[ae.session_id]=!0),m(z)},children:"Select all"}),v.jsx("button",{className:"ml-2 text-[10px] text-zinc-400 underline",onClick:()=>m({}),children:"Clear"})]}),v.jsx("div",{className:"flex flex-wrap gap-2",children:F.length===0?v.jsx("span",{className:"text-xs text-zinc-500",children:"no active sessions"}):F.map(z=>v.jsxs("label",{className:"flex items-center gap-1.5 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300",children:[v.jsx("input",{type:"checkbox",checked:!!f[z.session_id],onChange:ae=>m(ee=>({...ee,[z.session_id]:ae.target.checked}))}),z.session_id," ",v.jsxs("span",{className:"text-zinc-500",children:["(",z.n_crops,")"]})]},z.session_id))})]}),v.jsxs(Tt,{variant:"primary",onClick:he,disabled:G.isPending,children:[G.isPending?v.jsx(Un,{className:"h-4 w-4 animate-spin"}):v.jsx(Bx,{className:"h-4 w-4"})," ",G.isPending?"Building…":"Build"]})]}),B.length===0?v.jsx("span",{className:"text-sm text-zinc-500",children:"No dataset built yet."}):v.jsxs("table",{className:"w-full text-sm",children:[v.jsx("thead",{children:v.jsxs("tr",{className:"text-zinc-500",children:[v.jsx("th",{className:"text-left font-normal",children:"Dataset"}),v.jsx("th",{className:"text-right font-normal",children:"Sessions"}),v.jsx("th",{className:"text-right font-normal",children:"raw→dedup→final"}),v.jsx("th",{className:"text-right font-normal",children:"train/val/test"}),v.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),v.jsx("tbody",{children:B.map(z=>{var ae,ee,q,de,ce,P,X;return v.jsxs("tr",{className:"border-t border-zinc-800",children:[v.jsxs("td",{className:"py-1.5 text-zinc-200",children:[z.name,((ae=z.rotations)==null?void 0:ae.some(Le=>Le))&&v.jsx("span",{className:"ml-2 text-[10px] text-zinc-500",children:"+rot"})]}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:z.n_sessions}),v.jsxs("td",{className:"text-right tabular-nums text-zinc-400",children:[(ee=z.counts)==null?void 0:ee.raw,"→",(q=z.counts)==null?void 0:q.after_dedup,"→",(de=z.counts)==null?void 0:de.final]}),v.jsxs("td",{className:"text-right tabular-nums text-zinc-400",children:[((ce=z.split_counts)==null?void 0:ce.train)??"?","/",((P=z.split_counts)==null?void 0:P.val)??"?","/",((X=z.split_counts)==null?void 0:X.test)??"?"]}),v.jsx("td",{className:"py-1",children:v.jsxs("div",{className:"flex justify-end gap-1.5",children:[v.jsx(mo,{to:`../stats?ds=${encodeURIComponent(z.name)}`,className:"inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700",children:"Stats"}),v.jsxs(Tt,{onClick:()=>re.mutateAsync(z.name),disabled:re.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[re.isPending&&re.variables===z.name?v.jsx(Un,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(Bx,{className:"h-3.5 w-3.5"})," Rebuild"]}),v.jsxs(Tt,{onClick:()=>{window.confirm(`Delete dataset "${z.name}"?`)&&Z.mutateAsync(z.name)},disabled:Z.isPending,className:"px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50",children:[Z.isPending&&Z.variables===z.name?v.jsx(Un,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(Ta,{className:"h-3.5 w-3.5"})," Delete"]})]})})]},z.name)})})]})]})}function Tw(){const[i,e]=B1(),t=i.get("ds")??"",[r,a]=V.useState(null),l=Ea({queryKey:["datasets"],queryFn:()=>rn("/api/datasets")}),c=Ea({queryKey:["stats",t],queryFn:()=>{const w=t?`?dataset=${encodeURIComponent(t)}`:"";return rn(`/api/stats${w}`)}}),d=l.data??[],h=c.data,[f,m]=V.useState("");if(c.isLoading||!h)return v.jsx(fn,{title:"Stats",children:"Loading…"});const g=t?`Dataset "${t}"`:"global pool",x=Math.max(1,...Object.values(h.counts??{x:1})),M=(w,_)=>w==="empty"||w==="occluded"?"#38bdf8":_<h.min_samples*.5?"#ef4444":_<h.min_samples?"#eab308":"#22c55e",E=w=>{const _=t?`&dataset=${encodeURIComponent(t)}`:"";m(""),rn(`/api/class/${w}?limit=120${_}`).then(S=>a({label:w,crops:S.crops})).catch(S=>m(S.message))};return v.jsxs("div",{className:"space-y-4",children:[v.jsxs("div",{className:"grid gap-4 lg:grid-cols-3",children:[v.jsxs(fn,{title:"Class distribution",className:"lg:col-span-2",right:v.jsxs("select",{value:t,onChange:w=>e(w.target.value?{ds:w.target.value}:{}),className:fo,children:[v.jsx("option",{value:"",children:"global pool"}),d.map(w=>v.jsx("option",{value:w.name,children:w.name},w.name))]}),children:[v.jsxs("div",{className:"mb-2 text-xs text-zinc-500",children:[h.total," crops · ",h.num_sessions," sessions",t?` · Dataset "${t}"`:" · raw"]}),v.jsx("div",{className:"space-y-1.5",children:h.classes.map(w=>{const _=h.counts[w]||0;return v.jsxs("button",{onClick:()=>E(w),className:"grid w-full grid-cols-[2rem_1fr_3rem] items-center gap-3 rounded px-1 py-0.5 text-left hover:bg-zinc-800",children:[v.jsxs("span",{className:"text-zinc-300",children:[v.jsx(Gx,{label:w}),v.jsx("span",{className:"ml-1 text-xs text-zinc-500",children:w})]}),v.jsx("div",{className:"h-2.5 overflow-hidden rounded-full bg-zinc-800",children:v.jsx("div",{className:"h-full rounded-full",style:{width:`${_/x*100}%`,background:M(w,_)}})}),v.jsx("span",{className:"text-right text-sm tabular-nums text-zinc-400",children:_})]},w)})})]}),v.jsx(fn,{title:"Light / Dark",children:v.jsxs("table",{className:"w-full text-sm",children:[v.jsx("thead",{children:v.jsxs("tr",{className:"text-zinc-500",children:[v.jsx("th",{className:"text-left font-normal",children:"Class"}),v.jsx("th",{children:"light"}),v.jsx("th",{children:"dark"})]})}),v.jsx("tbody",{children:h.classes.map(w=>{const _=S=>S>0?v.jsx(K_,{className:"mx-auto h-4 w-4 text-green-500"}):v.jsx(ey,{className:"mx-auto h-4 w-4 text-red-500"});return v.jsxs("tr",{className:"border-t border-zinc-800",children:[v.jsxs("td",{className:"py-1 text-zinc-300",children:[v.jsx(Gx,{label:w})," ",v.jsx("span",{className:"text-xs text-zinc-500",children:w})]}),v.jsx("td",{children:_(h.light[w]||0)}),v.jsx("td",{children:_(h.dark[w]||0)})]},w)})})]})})]}),v.jsx(fn,{title:"Warnings",children:h.warnings.length?v.jsx("ul",{className:"space-y-1 text-sm",children:h.warnings.map((w,_)=>v.jsxs("li",{className:"flex items-center gap-2 text-amber-400",children:[v.jsx(Cm,{className:"h-4 w-4 shrink-0"})," ",w]},_))}):v.jsx("span",{className:"text-sm text-green-500",children:"none"})}),v.jsxs(fn,{title:`Browse crops (${g})`,right:v.jsxs("span",{className:"flex items-center gap-1 text-xs text-zinc-500",children:[v.jsx(uw,{className:"h-3.5 w-3.5"}),r?`${r.label} (${r.crops.length})`:"Click a class"]}),children:[f&&v.jsx("div",{className:"mb-2 rounded-lg bg-red-950/60 px-3 py-1.5 text-sm text-red-300",children:f}),r?v.jsx("div",{className:"grid grid-cols-[repeat(auto-fill,56px)] gap-1.5",children:r.crops.map((w,_)=>v.jsx("img",{src:w.url,title:`${w.session_id} ${w.frame} ${w.square}`,alt:`square ${w.square}`,className:"h-[74px] w-[56px] rounded border border-zinc-800 object-cover"},_))}):v.jsx("span",{className:"text-sm text-zinc-500",children:"Select a class on the left to view crops."})]})]})}function jx({series:i,yMin:e=0,yMax:t=1}){const c=i.flatMap(g=>g.data.map(x=>x.x)),d=Math.max(1,...c),h=g=>30+540*g/d,f=g=>170-140*(g-e)/Math.max(1e-9,t-e),m=4;return v.jsxs("div",{children:[v.jsxs("svg",{viewBox:"0 0 600 200",className:"w-full",style:{height:200},preserveAspectRatio:"none",children:[Array.from({length:m+1},(g,x)=>{const M=e+(t-e)*x/m;return v.jsxs("g",{children:[v.jsx("line",{x1:30,y1:f(M),x2:570,y2:f(M),stroke:"#27272a",strokeWidth:1}),v.jsx("text",{x:4,y:f(M)+3,fill:"#71717a",fontSize:10,children:M.toFixed(t<=1?2:1)})]},x)}),i.map(g=>g.data.length?v.jsx("polyline",{fill:"none",stroke:g.color,strokeWidth:2,strokeLinejoin:"round",points:g.data.map(x=>`${h(x.x).toFixed(1)},${f(x.y).toFixed(1)}`).join(" ")},g.name):null)]}),v.jsx("div",{className:"mt-1 flex flex-wrap gap-4 text-xs text-zinc-400",children:i.map(g=>v.jsxs("span",{className:"flex items-center gap-1.5",children:[v.jsx("span",{className:"inline-block h-2 w-2 rounded-full",style:{background:g.color}}),g.name]},g.name))})]})}const pu="w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100";function Cw(i){const e={};for(const t of i)e[t.true]||(e[t.true]=[]),e[t.true].push(t);return Object.values(e)}function Rw({groups:i}){return v.jsx("div",{className:"mt-3 space-y-3",children:i.map(e=>v.jsxs("div",{className:"flex items-start gap-3",children:[v.jsx("div",{className:"w-10 shrink-0 pt-6 text-right text-sm font-medium text-zinc-400",children:e[0].true}),v.jsx("div",{className:"flex flex-wrap gap-3",children:e.map((t,r)=>v.jsxs("div",{className:"text-center",children:[v.jsxs("div",{className:"grid grid-cols-2 gap-0.5",children:[v.jsx("img",{src:t.orig,alt:t.true,className:"w-12 rounded border border-zinc-800"}),v.jsx("img",{src:t.overlay,alt:"Grad-CAM",className:"w-12 rounded border border-zinc-800"})]}),v.jsxs("div",{className:"mt-1 text-xs",children:[t.pred!==t.true?v.jsxs("span",{className:"text-amber-500",children:["→",t.pred]}):v.jsx("span",{className:"text-zinc-600",children:"✓"}),v.jsxs("span",{className:"text-zinc-600",children:[" ",(t.prob*100).toFixed(0),"%"]})]})]},r))})]},e[0].true))})}function Aw({items:i}){return v.jsx("div",{className:"mt-3 space-y-1",children:i.map(e=>{const t=Math.round(e.piece_frac*100),r=e.cls!=="empty"&&t<45;return v.jsxs("div",{className:"flex items-center gap-2 text-xs",children:[v.jsx("div",{className:`w-10 shrink-0 text-right font-medium ${r?"text-rose-400":"text-zinc-400"}`,children:e.cls}),v.jsxs("div",{className:"flex h-4 flex-1 overflow-hidden rounded bg-zinc-800",children:[v.jsx("div",{className:"h-full bg-emerald-600",style:{width:`${t}%`}}),v.jsx("div",{className:"h-full bg-rose-700",style:{width:`${100-t}%`}})]}),v.jsxs("div",{className:"w-28 shrink-0 text-zinc-500",children:[t,"% piece · conf ",(e.base_prob*100).toFixed(0),"%"]})]},e.cls)})})}function Pw(){var wt,O,T;const[i,e]=V.useState([]),[t,r]=V.useState(""),[a,l]=V.useState(""),[c,d]=V.useState([]),[h,f]=V.useState({}),[m,g]=V.useState({running:!1}),[x,M]=V.useState(""),[E,w]=V.useState(null),[_,S]=V.useState("smallcnn"),[L,N]=V.useState("combined"),[C,U]=V.useState(30),[D,k]=V.useState(256),[b,F]=V.useState(3e-4),[B,G]=V.useState(7),[Z,re]=V.useState(""),[he,z]=V.useState([]),[ae,ee]=V.useState(!1),[q,de]=V.useState(3),[ce,P]=V.useState([]),[X,Le]=V.useState(!1),Be=V.useRef(null),le=Ea({queryKey:["datasets"],queryFn:()=>rn("/api/datasets")}).data??[],ye=le.find(I=>I.name===a);V.useEffect(()=>{if(!le.length||a)return;const I=window.setTimeout(()=>l(le[0].name),0);return()=>window.clearTimeout(I)},[le,a]);const ge=V.useCallback(async()=>{const I=await rn("/api/runs");e(I),I.length&&!t&&Ue(I[0].run)},[t]);V.useEffect(()=>{const I=window.setTimeout(()=>{ge()},0);return()=>{window.clearTimeout(I),clearInterval(Be.current)}},[ge]);async function Ue(I){r(I),M(""),z([]),P([]);try{d((await rn(`/api/runs/${I}/metrics`)).metrics),f((await rn(`/api/runs/${I}/eval`)).evals)}catch(Q){M(Q.message)}}async function Ze(){if(t){ee(!0),M("");try{z((await rn(`/api/runs/${t}/gradcam?per_class=${q}`)).items)}catch(I){M(I.message)}finally{ee(!1)}}}async function tt(){if(t){Le(!0),M("");try{P((await rn(`/api/runs/${t}/reliance`)).items)}catch(I){M(I.message)}finally{Le(!1)}}}async function Gt(I){M("");try{const Q=await en(`/api/runs/${I}/eval`,{});if(!Q.ok){M(Q.output||"eval failed");return}t===I&&Ue(I),ge()}catch(Q){M(Q.message)}}async function ut(I){if(window.confirm(`Delete model "${I}"? (directory + weights will be removed)`)){try{await Wl(`/api/runs/${I}`)}catch(Q){M(Q.message);return}M(""),t===I&&(r(""),d([]),f({}),z([]),P([])),ge()}}async function Rt(I){w(I);try{const Q=await en(`/api/runs/${I}/export`,{});Q.ok?M(`${I}: ONNX exported ✓ — restart tracker to use`):M(Q.output||"export failed"),ge()}catch(Q){M(Q.message)}finally{w(null)}}const mt=I=>I==null?"—":(I*100).toFixed(1)+" %";async function vt(){if(M(""),!a){M("No dataset — build one in the Datasets tab first.");return}try{await en("/api/train",{backbone:_,head:L,epochs:C,batch_size:D,lr:b,patience:B,no_amp:!0,dataset:a,resume:Z||void 0}),clearInterval(Be.current),Be.current=setInterval(kt,2500),kt()}catch(I){M(I.message)}}async function kt(){var Q;const I=await rn("/api/train/status");g(I),(Q=I.metrics)!=null&&Q.length&&d(I.metrics),I.running||(clearInterval(Be.current),ge())}async function Xt(){var I;try{await en("/api/train/stop")}catch{}clearInterval(Be.current);try{const Q=await rn("/api/train/status");g({...Q,running:!1}),Q.run&&r(Q.run),(I=Q.metrics)!=null&&I.length&&d(Q.metrics)}catch{g({running:!1,state:"stopped"})}ge()}const qt=[{name:"train_loss",color:"#ef4444",data:c.map(I=>({x:I.epoch,y:I.train_loss}))},{name:"val_loss",color:"#eab308",data:c.map(I=>({x:I.epoch,y:I.val_loss??0}))}],$t=Math.max(.5,...c.map(I=>Math.max(I.train_loss||0,I.val_loss||0))),Et=[{name:"square_acc",color:"#38bdf8",data:c.map(I=>({x:I.epoch,y:I.val_acc??0}))},{name:"macro_recall",color:"#22c55e",data:c.map(I=>({x:I.epoch,y:I.val_macro_recall??0}))},{name:"board_acc",color:"#e4e4e7",data:c.map(I=>({x:I.epoch,y:I.val_board_acc??0}))}],zt=he.length?"Recompute":"Show heatmaps",Y=Cw(he),pn=ce.length?"Recompute":"Run test";return v.jsxs("div",{className:"space-y-4",children:[v.jsxs(fn,{children:[v.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[v.jsxs(oa,{label:"Dataset",value:a,onChange:I=>l(I.target.value),children:[le.length===0&&v.jsx("option",{value:"",children:"— none built —"}),le.map(I=>{var Q;return v.jsxs("option",{value:I.name,children:[I.name," (",((Q=I.counts)==null?void 0:Q.final)??"?",")"]},I.name)})]}),v.jsxs(oa,{label:"Backbone",value:_,onChange:I=>S(I.target.value),title:"CNN architecture: smallcnn (lightweight custom), mobilenet_v3/v4 (fast mobile), efficientnet/resnet (timm — heavier, more accurate)",children:[v.jsx("option",{value:"smallcnn",children:"smallcnn"}),v.jsx("option",{value:"mobilenet_v3_small",children:"mobilenet_v3_small"}),v.jsx("option",{value:"mobilenetv4_conv_small",children:"mobilenetv4_conv_small (timm)"}),v.jsx("option",{value:"mobilenetv4_conv_medium",children:"mobilenetv4_conv_medium (timm)"}),v.jsx("option",{value:"efficientnet_b0",children:"efficientnet_b0 (timm)"}),v.jsx("option",{value:"resnet18",children:"resnet18 (timm)"})]}),v.jsxs(oa,{label:"Head",value:L,onChange:I=>N(I.target.value),title:"Classification head: combined (single fc), factored (type+color), twostage (occupancy then piece identity)",children:[v.jsx("option",{value:"combined",children:"combined"}),v.jsx("option",{value:"factored",children:"factored"}),v.jsx("option",{value:"twostage",children:"twostage (Occ→Piece)"})]}),v.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Number of full passes over the training data. More epochs = more learning, but risk of overfitting.",children:["Epochs",v.jsx("input",{type:"number",min:1,value:C,onChange:I=>U(+I.target.value),className:pu})]}),v.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Samples processed at once. Larger batch = faster training, more GPU memory. Small batches (32-64) generalize better.",children:["Batch",v.jsx("input",{type:"number",min:1,value:D,onChange:I=>k(+I.target.value),className:pu})]}),v.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Learning rate: step size for gradient descent. Higher = faster learning but may overshoot; 0.0003 is a safe default for AdamW.",children:["LR",v.jsx("input",{type:"number",step:1e-4,min:0,value:b,onChange:I=>F(+I.target.value),className:pu})]}),v.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Early stopping: epochs without macro_recall progress before aborting.",children:["Patience",v.jsx("input",{type:"number",min:1,value:B,onChange:I=>G(+I.target.value),className:pu})]}),v.jsxs(oa,{label:"Resume",value:Z,onChange:I=>re(I.target.value),children:[v.jsx("option",{value:"",children:"from scratch"}),i.some(I=>String(I.dataset||"").startsWith("pretrain-"))&&v.jsx("optgroup",{label:"Base models (pretrained)",children:i.filter(I=>String(I.dataset||"").startsWith("pretrain-")).map(I=>v.jsxs("option",{value:I.run,children:["🔹 Base · ",I.run]},I.run))}),v.jsx("optgroup",{label:"Own runs",children:i.filter(I=>!String(I.dataset||"").startsWith("pretrain-")).map(I=>v.jsx("option",{value:I.run,children:I.run},I.run))})]}),v.jsxs(Tt,{variant:"primary",onClick:vt,disabled:m.running||!a,children:[m.running?v.jsx(Un,{className:"h-4 w-4 animate-spin"}):v.jsx(Tm,{className:"h-4 w-4"})," Start training"]}),m.running&&v.jsxs(Tt,{onClick:Xt,children:[v.jsx(Z_,{className:"h-4 w-4"})," Cancel"]})]}),ye&&v.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:["Split: train ",((wt=ye.split_counts)==null?void 0:wt.train)??"?"," · val ",((O=ye.split_counts)==null?void 0:O.val)??"?"," · test ",((T=ye.split_counts)==null?void 0:T.test)??"?"]}),(m.running||c.length>0)&&v.jsxs("div",{className:"mt-3",children:[v.jsxs("div",{className:"mb-1 flex justify-between text-xs text-zinc-400",children:[v.jsxs("span",{children:[m.running?`running… (${m.run})`:m.state==="stopped"||m.state==="crashed"?"aborted":"Progress"," · epoch ",c.length,"/",C]}),v.jsxs("span",{children:["board_acc ",c.length?((c[c.length-1].val_board_acc??0)*100).toFixed(1)+" %":"—"]})]}),v.jsx("div",{className:"h-2 overflow-hidden rounded-full bg-zinc-800",children:v.jsx("div",{className:`h-full rounded-full transition-all ${m.state==="stopped"||m.state==="crashed"?"bg-amber-500":"bg-sky-500"}`,style:{width:`${Math.min(100,c.length/Math.max(1,C)*100)}%`}})})]}),!m.running&&m.state==="done"&&v.jsx("p",{className:"mt-2 text-xs text-green-500",children:"done ✓"}),!m.running&&(m.state==="stopped"||m.state==="crashed")&&v.jsxs("p",{className:"mt-2 text-xs text-amber-400",children:[m.state==="crashed"?"aborted (crash)":"aborted"," at epoch ",c.length,' — partial progress is preserved; "best.pt" saved, "Resume" picks up here.']}),x&&v.jsx("p",{className:"mt-2 text-sm text-amber-400",children:x})]}),v.jsxs(fn,{title:"Models",right:v.jsxs("span",{className:"text-xs text-zinc-500",children:[i.length," Run(s)"]}),children:[i.length===0?v.jsx("span",{className:"text-sm text-zinc-500",children:"No model trained yet."}):v.jsx("div",{className:"overflow-x-auto",children:v.jsxs("table",{className:"w-full text-sm",children:[v.jsx("thead",{children:v.jsxs("tr",{className:"text-zinc-500",children:[v.jsx("th",{className:"text-left font-normal",children:"Run"}),v.jsx("th",{className:"text-left font-normal",children:"Backbone"}),v.jsx("th",{className:"text-left font-normal",children:"Dataset"}),v.jsx("th",{className:"text-right font-normal",children:"Cls"}),v.jsx("th",{className:"text-right font-normal",children:"Ep."}),"                ",v.jsx("th",{className:"text-right font-normal",title:"best val board_acc (all 64 squares correct)",children:"board_acc"}),v.jsx("th",{className:"text-right font-normal",title:"best val square_acc (fraction of correct squares — drives board_acc ≈ square_acc^64)",children:"square_acc"}),v.jsx("th",{className:"text-right font-normal",title:"best val macro_recall",children:"macro_rec"}),v.jsx("th",{className:"text-right font-normal",title:"test-set board_acc (after eval)",children:"test"}),v.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),v.jsx("tbody",{children:i.map(I=>v.jsxs("tr",{className:`border-t border-zinc-800 ${t===I.run?"bg-zinc-800/50":""}`,children:[v.jsxs("td",{className:"py-1.5 text-zinc-200",children:[I.run,I.resumed_from&&v.jsx("span",{className:"ml-1 text-[10px] text-zinc-500",title:`resumed from ${I.resumed_from}`,children:"↻"}),I.has_occluded&&v.jsx("span",{className:"ml-1 rounded bg-zinc-700 px-1 text-[9px] text-amber-300",children:"+occ"})]}),v.jsx("td",{className:"text-zinc-400",children:I.backbone}),v.jsx("td",{className:"text-zinc-400",children:I.dataset??"—"}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:I.n_classes}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:I.epochs_done}),v.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:mt(I.best_board_acc)}),v.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:mt(I.best_square_acc)}),v.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:mt(I.best_macro_recall)}),v.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:mt(I.test_board_acc)}),v.jsx("td",{className:"py-1",children:v.jsxs("div",{className:"flex justify-end gap-1.5",children:[v.jsxs(Tt,{onClick:()=>Ue(I.run),className:"px-2 py-1 text-xs",children:[v.jsx(Xu,{className:"h-3.5 w-3.5"})," View"]}),v.jsxs(Tt,{onClick:()=>Gt(I.run),className:"px-2 py-1 text-xs",title:"Run eval (test split) — generates metrics + confusion matrix",children:[v.jsx(lw,{className:"h-3.5 w-3.5"})," Eval"]}),v.jsxs(Tt,{onClick:()=>Rt(I.run),disabled:E===I.run,className:"px-2 py-1 text-xs",title:I.has_onnx?"model.onnx exists":"Export to ONNX for faster inference",children:[E===I.run?v.jsx(Un,{className:"h-3.5 w-3.5 animate-spin"}):I.has_onnx?v.jsx(K_,{className:"h-3.5 w-3.5 text-green-400"}):v.jsx(hw,{className:"h-3.5 w-3.5"})," Export"]}),v.jsxs(Tt,{onClick:()=>ut(I.run),className:"px-2 py-1 text-xs text-red-300 hover:text-red-200",children:[v.jsx(Ta,{className:"h-3.5 w-3.5"})," Delete"]})]})})]},I.run))})]})}),v.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:['"View" loads curves & eval below · "test" appears after ',v.jsx("code",{children:"chesslab eval --run …"}),' · ↻ = continued training · +occ = model knows "occluded" class.']})]}),v.jsxs("div",{className:"grid gap-4 lg:grid-cols-2",children:[v.jsx(fn,{title:"Loss",children:v.jsx(jx,{series:qt,yMin:0,yMax:$t})}),v.jsx(fn,{title:"Metrics (0-1) — macro_recall is the honest number",children:v.jsx(jx,{series:Et,yMin:0,yMax:1})})]}),v.jsx(fn,{title:"Evaluation",children:Object.keys(h).length?v.jsx("div",{className:"space-y-4",children:Object.entries(h).map(([I,Q])=>{const me=Object.entries(Q.recall||{}).sort((Ee,Re)=>Ee[1]-Re[1]).slice(0,3);return v.jsxs("div",{children:[v.jsxs("div",{className:"text-sm",children:[v.jsx("span",{className:"font-medium uppercase text-zinc-400",children:I})," · board_acc ",v.jsxs("b",{children:[(Q.board_acc*100).toFixed(1),"%"]})," · square_acc ",(Q.square_acc*100).toFixed(1),"%"]}),v.jsxs("div",{className:"text-xs text-zinc-500",children:["weakest classes: ",me.map(([Ee,Re])=>`${Ee} ${(Re*100).toFixed(0)}%`).join(", ")]}),Q.confusion_png&&v.jsx("img",{src:Q.confusion_png,alt:"Confusion Matrix",className:"mt-2 max-w-md rounded-lg border border-zinc-800"})]},I)})}):v.jsxs("span",{className:"text-sm text-zinc-500",children:["No eval yet — ",v.jsx("code",{children:"chesslab eval --run …"})]})}),v.jsxs(fn,{title:"Grad-CAM — which pixels drove the decision",children:[v.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[v.jsx(oa,{label:"Samples / class",value:String(q),onChange:I=>de(+I.target.value),children:[1,2,3,5,8].map(I=>v.jsx("option",{value:I,children:I},I))}),v.jsxs(Tt,{onClick:Ze,disabled:!t||ae,children:[ae?v.jsx(Un,{className:"h-4 w-4 animate-spin"}):v.jsx(Xu,{className:"h-4 w-4"}),ae?"Computing…":zt]}),v.jsx("span",{className:"text-xs text-zinc-500",children:"Test crops per class · each pair = original + heatmap; red = pixels most relevant to the predicted class."})]}),Y.length>0&&v.jsx(Rw,{groups:Y})]}),v.jsxs(fn,{title:"Background reliance — does it read the piece or the board?",children:[v.jsxs("div",{className:"flex items-center gap-3",children:[v.jsxs(Tt,{onClick:tt,disabled:!t||X,children:[X?v.jsx(Un,{className:"h-4 w-4 animate-spin"}):v.jsx(Xu,{className:"h-4 w-4"}),X?"Testing…":pn]}),v.jsxs("span",{className:"text-xs text-zinc-500",children:["Occludes piece (center) vs. board (border ring) and measures the confidence drop. ",v.jsx("span",{className:"text-emerald-500",children:"green = piece"})," / ",v.jsx("span",{className:"text-rose-500",children:"red = background"}),". Low green on a piece class = shortcut learning. (",v.jsx("code",{children:"empty"})," is expected to be red.)"]})]}),ce.length>0&&v.jsx(Aw,{items:ce})]}),m.log_tail&&v.jsx(fn,{title:"Log",children:v.jsx("pre",{className:"max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 text-xs text-zinc-400",children:m.log_tail})})]})}/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Am="185",go={ROTATE:0,DOLLY:1,PAN:2},po={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Nw=0,Wx=1,Lw=2,$u=1,Dw=2,Ol=3,Fs=0,hi=1,fr=2,jr=0,xo=1,Xx=2,$x=3,qx=4,Iw=5,la=100,Uw=101,Fw=102,Ow=103,kw=104,zw=200,Bw=201,Hw=202,Vw=203,mp=204,gp=205,Gw=206,jw=207,Ww=208,Xw=209,$w=210,qw=211,Yw=212,Kw=213,Qw=214,xp=0,vp=1,_p=2,Do=3,yp=4,Sp=5,Mp=6,Ep=7,Pm=0,Zw=1,Jw=2,gr=0,ny=1,iy=2,ry=3,Nm=4,sy=5,ay=6,oy=7,ly=300,wa=301,Io=302,ff=303,pf=304,vd=306,wp=1e3,Gr=1001,bp=1002,Fn=1003,eb=1004,mu=1005,Wn=1006,mf=1007,da=1008,Si=1009,cy=1010,uy=1011,Xl=1012,Lm=1013,_r=1014,pr=1015,qr=1016,Dm=1017,Im=1018,$l=1020,dy=35902,hy=35899,fy=1021,py=1022,Ki=1023,Yr=1026,ha=1027,my=1028,Um=1029,ba=1030,Fm=1031,Om=1033,qu=33776,Yu=33777,Ku=33778,Qu=33779,Tp=35840,Cp=35841,Rp=35842,Ap=35843,Pp=36196,Np=37492,Lp=37496,Dp=37488,Ip=37489,sd=37490,Up=37491,Fp=37808,Op=37809,kp=37810,zp=37811,Bp=37812,Hp=37813,Vp=37814,Gp=37815,jp=37816,Wp=37817,Xp=37818,$p=37819,qp=37820,Yp=37821,Kp=36492,Qp=36494,Zp=36495,Jp=36283,em=36284,ad=36285,tm=36286,tb=3200,od=0,nb=1,ws="",Jn="srgb",ld="srgb-linear",cd="linear",Vt="srgb",Qa=7680,Yx=519,ib=512,rb=513,sb=514,km=515,ab=516,ob=517,zm=518,lb=519,Kx=35044,Qx="300 es",mr=2e3,ql=2001;function cb(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function Yl(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function ub(){const i=Yl("canvas");return i.style.display="block",i}const Zx={};function Jx(...i){const e="THREE."+i.shift();console.log(e,...i)}function gy(i){const e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function lt(...i){i=gy(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function Dt(...i){i=gy(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function vo(...i){const e=i.join(" ");e in Zx||(Zx[e]=!0,lt(...i))}function db(i,e,t){return new Promise(function(r,a){function l(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:a();break;case i.TIMEOUT_EXPIRED:setTimeout(l,t);break;default:r()}}setTimeout(l,t)})}const hb={[xp]:vp,[_p]:Mp,[yp]:Ep,[Do]:Sp,[vp]:xp,[Mp]:_p,[Ep]:yp,[Sp]:Do};class ks{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const r=this._listeners;r[e]===void 0&&(r[e]=[]),r[e].indexOf(t)===-1&&r[e].push(t)}hasEventListener(e,t){const r=this._listeners;return r===void 0?!1:r[e]!==void 0&&r[e].indexOf(t)!==-1}removeEventListener(e,t){const r=this._listeners;if(r===void 0)return;const a=r[e];if(a!==void 0){const l=a.indexOf(t);l!==-1&&a.splice(l,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const r=t[e.type];if(r!==void 0){e.target=this;const a=r.slice(0);for(let l=0,c=a.length;l<c;l++)a[l].call(this,e);e.target=null}}}const Vn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Zu=Math.PI/180,nm=180/Math.PI;function ic(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(Vn[i&255]+Vn[i>>8&255]+Vn[i>>16&255]+Vn[i>>24&255]+"-"+Vn[e&255]+Vn[e>>8&255]+"-"+Vn[e>>16&15|64]+Vn[e>>24&255]+"-"+Vn[t&63|128]+Vn[t>>8&255]+"-"+Vn[t>>16&255]+Vn[t>>24&255]+Vn[r&255]+Vn[r>>8&255]+Vn[r>>16&255]+Vn[r>>24&255]).toLowerCase()}function bt(i,e,t){return Math.max(e,Math.min(t,i))}function fb(i,e){return(i%e+e)%e}function gf(i,e,t){return(1-t)*i+t*e}function Cl(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function li(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}const pb={DEG2RAD:Zu},Wm=class Wm{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,r=this.y,a=e.elements;return this.x=a[0]*t+a[3]*r+a[6],this.y=a[1]*t+a[4]*r+a[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=bt(this.x,e.x,t.x),this.y=bt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=bt(this.x,e,t),this.y=bt(this.y,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(bt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const r=this.dot(e)/t;return Math.acos(bt(r,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,r=this.y-e.y;return t*t+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const r=Math.cos(t),a=Math.sin(t),l=this.x-e.x,c=this.y-e.y;return this.x=l*r-c*a+e.x,this.y=l*a+c*r+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};Wm.prototype.isVector2=!0;let dt=Wm;class Os{constructor(e=0,t=0,r=0,a=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=r,this._w=a}static slerpFlat(e,t,r,a,l,c,d){let h=r[a+0],f=r[a+1],m=r[a+2],g=r[a+3],x=l[c+0],M=l[c+1],E=l[c+2],w=l[c+3];if(g!==w||h!==x||f!==M||m!==E){let _=h*x+f*M+m*E+g*w;_<0&&(x=-x,M=-M,E=-E,w=-w,_=-_);let S=1-d;if(_<.9995){const L=Math.acos(_),N=Math.sin(L);S=Math.sin(S*L)/N,d=Math.sin(d*L)/N,h=h*S+x*d,f=f*S+M*d,m=m*S+E*d,g=g*S+w*d}else{h=h*S+x*d,f=f*S+M*d,m=m*S+E*d,g=g*S+w*d;const L=1/Math.sqrt(h*h+f*f+m*m+g*g);h*=L,f*=L,m*=L,g*=L}}e[t]=h,e[t+1]=f,e[t+2]=m,e[t+3]=g}static multiplyQuaternionsFlat(e,t,r,a,l,c){const d=r[a],h=r[a+1],f=r[a+2],m=r[a+3],g=l[c],x=l[c+1],M=l[c+2],E=l[c+3];return e[t]=d*E+m*g+h*M-f*x,e[t+1]=h*E+m*x+f*g-d*M,e[t+2]=f*E+m*M+d*x-h*g,e[t+3]=m*E-d*g-h*x-f*M,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,r,a){return this._x=e,this._y=t,this._z=r,this._w=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const r=e._x,a=e._y,l=e._z,c=e._order,d=Math.cos,h=Math.sin,f=d(r/2),m=d(a/2),g=d(l/2),x=h(r/2),M=h(a/2),E=h(l/2);switch(c){case"XYZ":this._x=x*m*g+f*M*E,this._y=f*M*g-x*m*E,this._z=f*m*E+x*M*g,this._w=f*m*g-x*M*E;break;case"YXZ":this._x=x*m*g+f*M*E,this._y=f*M*g-x*m*E,this._z=f*m*E-x*M*g,this._w=f*m*g+x*M*E;break;case"ZXY":this._x=x*m*g-f*M*E,this._y=f*M*g+x*m*E,this._z=f*m*E+x*M*g,this._w=f*m*g-x*M*E;break;case"ZYX":this._x=x*m*g-f*M*E,this._y=f*M*g+x*m*E,this._z=f*m*E-x*M*g,this._w=f*m*g+x*M*E;break;case"YZX":this._x=x*m*g+f*M*E,this._y=f*M*g+x*m*E,this._z=f*m*E-x*M*g,this._w=f*m*g-x*M*E;break;case"XZY":this._x=x*m*g-f*M*E,this._y=f*M*g-x*m*E,this._z=f*m*E+x*M*g,this._w=f*m*g+x*M*E;break;default:lt("Quaternion: .setFromEuler() encountered an unknown order: "+c)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const r=t/2,a=Math.sin(r);return this._x=e.x*a,this._y=e.y*a,this._z=e.z*a,this._w=Math.cos(r),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,r=t[0],a=t[4],l=t[8],c=t[1],d=t[5],h=t[9],f=t[2],m=t[6],g=t[10],x=r+d+g;if(x>0){const M=.5/Math.sqrt(x+1);this._w=.25/M,this._x=(m-h)*M,this._y=(l-f)*M,this._z=(c-a)*M}else if(r>d&&r>g){const M=2*Math.sqrt(1+r-d-g);this._w=(m-h)/M,this._x=.25*M,this._y=(a+c)/M,this._z=(l+f)/M}else if(d>g){const M=2*Math.sqrt(1+d-r-g);this._w=(l-f)/M,this._x=(a+c)/M,this._y=.25*M,this._z=(h+m)/M}else{const M=2*Math.sqrt(1+g-r-d);this._w=(c-a)/M,this._x=(l+f)/M,this._y=(h+m)/M,this._z=.25*M}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let r=e.dot(t)+1;return r<1e-8?(r=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=r):(this._x=0,this._y=-e.z,this._z=e.y,this._w=r)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=r),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(bt(this.dot(e),-1,1)))}rotateTowards(e,t){const r=this.angleTo(e);if(r===0)return this;const a=Math.min(1,t/r);return this.slerp(e,a),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const r=e._x,a=e._y,l=e._z,c=e._w,d=t._x,h=t._y,f=t._z,m=t._w;return this._x=r*m+c*d+a*f-l*h,this._y=a*m+c*h+l*d-r*f,this._z=l*m+c*f+r*h-a*d,this._w=c*m-r*d-a*h-l*f,this._onChangeCallback(),this}slerp(e,t){let r=e._x,a=e._y,l=e._z,c=e._w,d=this.dot(e);d<0&&(r=-r,a=-a,l=-l,c=-c,d=-d);let h=1-t;if(d<.9995){const f=Math.acos(d),m=Math.sin(f);h=Math.sin(h*f)/m,t=Math.sin(t*f)/m,this._x=this._x*h+r*t,this._y=this._y*h+a*t,this._z=this._z*h+l*t,this._w=this._w*h+c*t,this._onChangeCallback()}else this._x=this._x*h+r*t,this._y=this._y*h+a*t,this._z=this._z*h+l*t,this._w=this._w*h+c*t,this.normalize();return this}slerpQuaternions(e,t,r){return this.copy(e).slerp(t,r)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),r=Math.random(),a=Math.sqrt(1-r),l=Math.sqrt(r);return this.set(a*Math.sin(e),a*Math.cos(e),l*Math.sin(t),l*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}const Xm=class Xm{constructor(e=0,t=0,r=0){this.x=e,this.y=t,this.z=r}set(e,t,r){return r===void 0&&(r=this.z),this.x=e,this.y=t,this.z=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(ev.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(ev.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,r=this.y,a=this.z,l=e.elements;return this.x=l[0]*t+l[3]*r+l[6]*a,this.y=l[1]*t+l[4]*r+l[7]*a,this.z=l[2]*t+l[5]*r+l[8]*a,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,r=this.y,a=this.z,l=e.elements,c=1/(l[3]*t+l[7]*r+l[11]*a+l[15]);return this.x=(l[0]*t+l[4]*r+l[8]*a+l[12])*c,this.y=(l[1]*t+l[5]*r+l[9]*a+l[13])*c,this.z=(l[2]*t+l[6]*r+l[10]*a+l[14])*c,this}applyQuaternion(e){const t=this.x,r=this.y,a=this.z,l=e.x,c=e.y,d=e.z,h=e.w,f=2*(c*a-d*r),m=2*(d*t-l*a),g=2*(l*r-c*t);return this.x=t+h*f+c*g-d*m,this.y=r+h*m+d*f-l*g,this.z=a+h*g+l*m-c*f,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,r=this.y,a=this.z,l=e.elements;return this.x=l[0]*t+l[4]*r+l[8]*a,this.y=l[1]*t+l[5]*r+l[9]*a,this.z=l[2]*t+l[6]*r+l[10]*a,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=bt(this.x,e.x,t.x),this.y=bt(this.y,e.y,t.y),this.z=bt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=bt(this.x,e,t),this.y=bt(this.y,e,t),this.z=bt(this.z,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(bt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this.z=e.z+(t.z-e.z)*r,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const r=e.x,a=e.y,l=e.z,c=t.x,d=t.y,h=t.z;return this.x=a*h-l*d,this.y=l*c-r*h,this.z=r*d-a*c,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const r=e.dot(this)/t;return this.copy(e).multiplyScalar(r)}projectOnPlane(e){return xf.copy(this).projectOnVector(e),this.sub(xf)}reflect(e){return this.sub(xf.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const r=this.dot(e)/t;return Math.acos(bt(r,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,r=this.y-e.y,a=this.z-e.z;return t*t+r*r+a*a}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,r){const a=Math.sin(t)*e;return this.x=a*Math.sin(r),this.y=Math.cos(t)*e,this.z=a*Math.cos(r),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,r){return this.x=e*Math.sin(t),this.y=r,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),r=this.setFromMatrixColumn(e,1).length(),a=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=r,this.z=a,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,r=Math.sqrt(1-t*t);return this.x=r*Math.cos(e),this.y=t,this.z=r*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};Xm.prototype.isVector3=!0;let te=Xm;const xf=new te,ev=new Os,$m=class $m{constructor(e,t,r,a,l,c,d,h,f){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,r,a,l,c,d,h,f)}set(e,t,r,a,l,c,d,h,f){const m=this.elements;return m[0]=e,m[1]=a,m[2]=d,m[3]=t,m[4]=l,m[5]=h,m[6]=r,m[7]=c,m[8]=f,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,r=e.elements;return t[0]=r[0],t[1]=r[1],t[2]=r[2],t[3]=r[3],t[4]=r[4],t[5]=r[5],t[6]=r[6],t[7]=r[7],t[8]=r[8],this}extractBasis(e,t,r){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),r.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const r=e.elements,a=t.elements,l=this.elements,c=r[0],d=r[3],h=r[6],f=r[1],m=r[4],g=r[7],x=r[2],M=r[5],E=r[8],w=a[0],_=a[3],S=a[6],L=a[1],N=a[4],C=a[7],U=a[2],D=a[5],k=a[8];return l[0]=c*w+d*L+h*U,l[3]=c*_+d*N+h*D,l[6]=c*S+d*C+h*k,l[1]=f*w+m*L+g*U,l[4]=f*_+m*N+g*D,l[7]=f*S+m*C+g*k,l[2]=x*w+M*L+E*U,l[5]=x*_+M*N+E*D,l[8]=x*S+M*C+E*k,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],m=e[8];return t*c*m-t*d*f-r*l*m+r*d*h+a*l*f-a*c*h}invert(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],m=e[8],g=m*c-d*f,x=d*h-m*l,M=f*l-c*h,E=t*g+r*x+a*M;if(E===0)return this.set(0,0,0,0,0,0,0,0,0);const w=1/E;return e[0]=g*w,e[1]=(a*f-m*r)*w,e[2]=(d*r-a*c)*w,e[3]=x*w,e[4]=(m*t-a*h)*w,e[5]=(a*l-d*t)*w,e[6]=M*w,e[7]=(r*h-f*t)*w,e[8]=(c*t-r*l)*w,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,r,a,l,c,d){const h=Math.cos(l),f=Math.sin(l);return this.set(r*h,r*f,-r*(h*c+f*d)+c+e,-a*f,a*h,-a*(-f*c+h*d)+d+t,0,0,1),this}scale(e,t){return vo("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(vf.makeScale(e,t)),this}rotate(e){return vo("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(vf.makeRotation(-e)),this}translate(e,t){return vo("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(vf.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,-r,0,r,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,r=e.elements;for(let a=0;a<9;a++)if(t[a]!==r[a])return!1;return!0}fromArray(e,t=0){for(let r=0;r<9;r++)this.elements[r]=e[r+t];return this}toArray(e=[],t=0){const r=this.elements;return e[t]=r[0],e[t+1]=r[1],e[t+2]=r[2],e[t+3]=r[3],e[t+4]=r[4],e[t+5]=r[5],e[t+6]=r[6],e[t+7]=r[7],e[t+8]=r[8],e}clone(){return new this.constructor().fromArray(this.elements)}};$m.prototype.isMatrix3=!0;let pt=$m;const vf=new pt,tv=new pt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),nv=new pt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function mb(){const i={enabled:!0,workingColorSpace:ld,spaces:{},convert:function(a,l,c){return this.enabled===!1||l===c||!l||!c||(this.spaces[l].transfer===Vt&&(a.r=Wr(a.r),a.g=Wr(a.g),a.b=Wr(a.b)),this.spaces[l].primaries!==this.spaces[c].primaries&&(a.applyMatrix3(this.spaces[l].toXYZ),a.applyMatrix3(this.spaces[c].fromXYZ)),this.spaces[c].transfer===Vt&&(a.r=_o(a.r),a.g=_o(a.g),a.b=_o(a.b))),a},workingToColorSpace:function(a,l){return this.convert(a,this.workingColorSpace,l)},colorSpaceToWorking:function(a,l){return this.convert(a,l,this.workingColorSpace)},getPrimaries:function(a){return this.spaces[a].primaries},getTransfer:function(a){return a===ws?cd:this.spaces[a].transfer},getToneMappingMode:function(a){return this.spaces[a].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(a,l=this.workingColorSpace){return a.fromArray(this.spaces[l].luminanceCoefficients)},define:function(a){Object.assign(this.spaces,a)},_getMatrix:function(a,l,c){return a.copy(this.spaces[l].toXYZ).multiply(this.spaces[c].fromXYZ)},_getDrawingBufferColorSpace:function(a){return this.spaces[a].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(a=this.workingColorSpace){return this.spaces[a].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(a,l){return vo("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(a,l)},toWorkingColorSpace:function(a,l){return vo("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(a,l)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],r=[.3127,.329];return i.define({[ld]:{primaries:e,whitePoint:r,transfer:cd,toXYZ:tv,fromXYZ:nv,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Jn},outputColorSpaceConfig:{drawingBufferColorSpace:Jn}},[Jn]:{primaries:e,whitePoint:r,transfer:Vt,toXYZ:tv,fromXYZ:nv,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Jn}}}),i}const Pt=mb();function Wr(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function _o(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Za;class gb{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let r;if(e instanceof HTMLCanvasElement)r=e;else{Za===void 0&&(Za=Yl("canvas")),Za.width=e.width,Za.height=e.height;const a=Za.getContext("2d");e instanceof ImageData?a.putImageData(e,0,0):a.drawImage(e,0,0,e.width,e.height),r=Za}return r.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Yl("canvas");t.width=e.width,t.height=e.height;const r=t.getContext("2d");r.drawImage(e,0,0,e.width,e.height);const a=r.getImageData(0,0,e.width,e.height),l=a.data;for(let c=0;c<l.length;c++)l[c]=Wr(l[c]/255)*255;return r.putImageData(a,0,0),t}else if(e.data){const t=e.data.slice(0);for(let r=0;r<t.length;r++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[r]=Math.floor(Wr(t[r]/255)*255):t[r]=Wr(t[r]);return{data:t,width:e.width,height:e.height}}else return lt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let xb=0;class Bm{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:xb++}),this.uuid=ic(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const r={uuid:this.uuid,url:""},a=this.data;if(a!==null){let l;if(Array.isArray(a)){l=[];for(let c=0,d=a.length;c<d;c++)a[c].isDataTexture?l.push(_f(a[c].image)):l.push(_f(a[c]))}else l=_f(a);r.url=l}return t||(e.images[this.uuid]=r),r}}function _f(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?gb.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(lt("Texture: Unable to serialize Texture."),{})}let vb=0;const yf=new te;class Xn extends ks{constructor(e=Xn.DEFAULT_IMAGE,t=Xn.DEFAULT_MAPPING,r=Gr,a=Gr,l=Wn,c=da,d=Ki,h=Si,f=Xn.DEFAULT_ANISOTROPY,m=ws){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:vb++}),this.uuid=ic(),this.name="",this.source=new Bm(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=r,this.wrapT=a,this.magFilter=l,this.minFilter=c,this.anisotropy=f,this.format=d,this.internalFormat=null,this.type=h,this.offset=new dt(0,0),this.repeat=new dt(1,1),this.center=new dt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new pt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=m,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(yf).x}get height(){return this.source.getSize(yf).y}get depth(){return this.source.getSize(yf).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const r=e[t];if(r===void 0){lt(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){lt(`Texture.setValues(): property '${t}' does not exist.`);continue}a&&r&&a.isVector2&&r.isVector2||a&&r&&a.isVector3&&r.isVector3||a&&r&&a.isMatrix3&&r.isMatrix3?a.copy(r):this[t]=r}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const r={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(r.userData=this.userData),t||(e.textures[this.uuid]=r),r}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==ly)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case wp:e.x=e.x-Math.floor(e.x);break;case Gr:e.x=e.x<0?0:1;break;case bp:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case wp:e.y=e.y-Math.floor(e.y);break;case Gr:e.y=e.y<0?0:1;break;case bp:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Xn.DEFAULT_IMAGE=null;Xn.DEFAULT_MAPPING=ly;Xn.DEFAULT_ANISOTROPY=1;const qm=class qm{constructor(e=0,t=0,r=0,a=1){this.x=e,this.y=t,this.z=r,this.w=a}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,r,a){return this.x=e,this.y=t,this.z=r,this.w=a,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,r=this.y,a=this.z,l=this.w,c=e.elements;return this.x=c[0]*t+c[4]*r+c[8]*a+c[12]*l,this.y=c[1]*t+c[5]*r+c[9]*a+c[13]*l,this.z=c[2]*t+c[6]*r+c[10]*a+c[14]*l,this.w=c[3]*t+c[7]*r+c[11]*a+c[15]*l,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,r,a,l;const h=e.elements,f=h[0],m=h[4],g=h[8],x=h[1],M=h[5],E=h[9],w=h[2],_=h[6],S=h[10];if(Math.abs(m-x)<.01&&Math.abs(g-w)<.01&&Math.abs(E-_)<.01){if(Math.abs(m+x)<.1&&Math.abs(g+w)<.1&&Math.abs(E+_)<.1&&Math.abs(f+M+S-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const N=(f+1)/2,C=(M+1)/2,U=(S+1)/2,D=(m+x)/4,k=(g+w)/4,b=(E+_)/4;return N>C&&N>U?N<.01?(r=0,a=.707106781,l=.707106781):(r=Math.sqrt(N),a=D/r,l=k/r):C>U?C<.01?(r=.707106781,a=0,l=.707106781):(a=Math.sqrt(C),r=D/a,l=b/a):U<.01?(r=.707106781,a=.707106781,l=0):(l=Math.sqrt(U),r=k/l,a=b/l),this.set(r,a,l,t),this}let L=Math.sqrt((_-E)*(_-E)+(g-w)*(g-w)+(x-m)*(x-m));return Math.abs(L)<.001&&(L=1),this.x=(_-E)/L,this.y=(g-w)/L,this.z=(x-m)/L,this.w=Math.acos((f+M+S-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=bt(this.x,e.x,t.x),this.y=bt(this.y,e.y,t.y),this.z=bt(this.z,e.z,t.z),this.w=bt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=bt(this.x,e,t),this.y=bt(this.y,e,t),this.z=bt(this.z,e,t),this.w=bt(this.w,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(bt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this.z=e.z+(t.z-e.z)*r,this.w=e.w+(t.w-e.w)*r,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};qm.prototype.isVector4=!0;let un=qm;class _b extends ks{constructor(e=1,t=1,r={}){super(),r=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Wn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},r),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=r.depth,this.scissor=new un(0,0,e,t),this.scissorTest=!1,this.viewport=new un(0,0,e,t),this.textures=[];const a={width:e,height:t,depth:r.depth},l=new Xn(a),c=r.count;for(let d=0;d<c;d++)this.textures[d]=l.clone(),this.textures[d].isRenderTargetTexture=!0,this.textures[d].renderTarget=this;this._setTextureOptions(r),this.depthBuffer=r.depthBuffer,this.stencilBuffer=r.stencilBuffer,this.resolveDepthBuffer=r.resolveDepthBuffer,this.resolveStencilBuffer=r.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=r.depthTexture,this.samples=r.samples,this.multiview=r.multiview,this.useArrayDepthTexture=r.useArrayDepthTexture}_setTextureOptions(e={}){const t={minFilter:Wn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let r=0;r<this.textures.length;r++)this.textures[r].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,r=1){if(this.width!==e||this.height!==t||this.depth!==r){this.width=e,this.height=t,this.depth=r;for(let a=0,l=this.textures.length;a<l;a++)this.textures[a].image.width=e,this.textures[a].image.height=t,this.textures[a].image.depth=r,this.textures[a].isData3DTexture!==!0&&(this.textures[a].isArrayTexture=this.textures[a].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,r=e.textures.length;t<r;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const a=Object.assign({},e.textures[t].image);this.textures[t].source=new Bm(a)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class xr extends _b{constructor(e=1,t=1,r={}){super(e,t,r),this.isWebGLRenderTarget=!0}}class xy extends Xn{constructor(e=null,t=1,r=1,a=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:r,depth:a},this.magFilter=Fn,this.minFilter=Fn,this.wrapR=Gr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class yb extends Xn{constructor(e=null,t=1,r=1,a=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:r,depth:a},this.magFilter=Fn,this.minFilter=Fn,this.wrapR=Gr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const fd=class fd{constructor(e,t,r,a,l,c,d,h,f,m,g,x,M,E,w,_){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,r,a,l,c,d,h,f,m,g,x,M,E,w,_)}set(e,t,r,a,l,c,d,h,f,m,g,x,M,E,w,_){const S=this.elements;return S[0]=e,S[4]=t,S[8]=r,S[12]=a,S[1]=l,S[5]=c,S[9]=d,S[13]=h,S[2]=f,S[6]=m,S[10]=g,S[14]=x,S[3]=M,S[7]=E,S[11]=w,S[15]=_,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new fd().fromArray(this.elements)}copy(e){const t=this.elements,r=e.elements;return t[0]=r[0],t[1]=r[1],t[2]=r[2],t[3]=r[3],t[4]=r[4],t[5]=r[5],t[6]=r[6],t[7]=r[7],t[8]=r[8],t[9]=r[9],t[10]=r[10],t[11]=r[11],t[12]=r[12],t[13]=r[13],t[14]=r[14],t[15]=r[15],this}copyPosition(e){const t=this.elements,r=e.elements;return t[12]=r[12],t[13]=r[13],t[14]=r[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,r){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),r.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),r.setFromMatrixColumn(this,2),this)}makeBasis(e,t,r){return this.set(e.x,t.x,r.x,0,e.y,t.y,r.y,0,e.z,t.z,r.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();const t=this.elements,r=e.elements,a=1/Ja.setFromMatrixColumn(e,0).length(),l=1/Ja.setFromMatrixColumn(e,1).length(),c=1/Ja.setFromMatrixColumn(e,2).length();return t[0]=r[0]*a,t[1]=r[1]*a,t[2]=r[2]*a,t[3]=0,t[4]=r[4]*l,t[5]=r[5]*l,t[6]=r[6]*l,t[7]=0,t[8]=r[8]*c,t[9]=r[9]*c,t[10]=r[10]*c,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,r=e.x,a=e.y,l=e.z,c=Math.cos(r),d=Math.sin(r),h=Math.cos(a),f=Math.sin(a),m=Math.cos(l),g=Math.sin(l);if(e.order==="XYZ"){const x=c*m,M=c*g,E=d*m,w=d*g;t[0]=h*m,t[4]=-h*g,t[8]=f,t[1]=M+E*f,t[5]=x-w*f,t[9]=-d*h,t[2]=w-x*f,t[6]=E+M*f,t[10]=c*h}else if(e.order==="YXZ"){const x=h*m,M=h*g,E=f*m,w=f*g;t[0]=x+w*d,t[4]=E*d-M,t[8]=c*f,t[1]=c*g,t[5]=c*m,t[9]=-d,t[2]=M*d-E,t[6]=w+x*d,t[10]=c*h}else if(e.order==="ZXY"){const x=h*m,M=h*g,E=f*m,w=f*g;t[0]=x-w*d,t[4]=-c*g,t[8]=E+M*d,t[1]=M+E*d,t[5]=c*m,t[9]=w-x*d,t[2]=-c*f,t[6]=d,t[10]=c*h}else if(e.order==="ZYX"){const x=c*m,M=c*g,E=d*m,w=d*g;t[0]=h*m,t[4]=E*f-M,t[8]=x*f+w,t[1]=h*g,t[5]=w*f+x,t[9]=M*f-E,t[2]=-f,t[6]=d*h,t[10]=c*h}else if(e.order==="YZX"){const x=c*h,M=c*f,E=d*h,w=d*f;t[0]=h*m,t[4]=w-x*g,t[8]=E*g+M,t[1]=g,t[5]=c*m,t[9]=-d*m,t[2]=-f*m,t[6]=M*g+E,t[10]=x-w*g}else if(e.order==="XZY"){const x=c*h,M=c*f,E=d*h,w=d*f;t[0]=h*m,t[4]=-g,t[8]=f*m,t[1]=x*g+w,t[5]=c*m,t[9]=M*g-E,t[2]=E*g-M,t[6]=d*m,t[10]=w*g+x}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Sb,e,Mb)}lookAt(e,t,r){const a=this.elements;return xi.subVectors(e,t),xi.lengthSq()===0&&(xi.z=1),xi.normalize(),gs.crossVectors(r,xi),gs.lengthSq()===0&&(Math.abs(r.z)===1?xi.x+=1e-4:xi.z+=1e-4,xi.normalize(),gs.crossVectors(r,xi)),gs.normalize(),gu.crossVectors(xi,gs),a[0]=gs.x,a[4]=gu.x,a[8]=xi.x,a[1]=gs.y,a[5]=gu.y,a[9]=xi.y,a[2]=gs.z,a[6]=gu.z,a[10]=xi.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const r=e.elements,a=t.elements,l=this.elements,c=r[0],d=r[4],h=r[8],f=r[12],m=r[1],g=r[5],x=r[9],M=r[13],E=r[2],w=r[6],_=r[10],S=r[14],L=r[3],N=r[7],C=r[11],U=r[15],D=a[0],k=a[4],b=a[8],F=a[12],B=a[1],G=a[5],Z=a[9],re=a[13],he=a[2],z=a[6],ae=a[10],ee=a[14],q=a[3],de=a[7],ce=a[11],P=a[15];return l[0]=c*D+d*B+h*he+f*q,l[4]=c*k+d*G+h*z+f*de,l[8]=c*b+d*Z+h*ae+f*ce,l[12]=c*F+d*re+h*ee+f*P,l[1]=m*D+g*B+x*he+M*q,l[5]=m*k+g*G+x*z+M*de,l[9]=m*b+g*Z+x*ae+M*ce,l[13]=m*F+g*re+x*ee+M*P,l[2]=E*D+w*B+_*he+S*q,l[6]=E*k+w*G+_*z+S*de,l[10]=E*b+w*Z+_*ae+S*ce,l[14]=E*F+w*re+_*ee+S*P,l[3]=L*D+N*B+C*he+U*q,l[7]=L*k+N*G+C*z+U*de,l[11]=L*b+N*Z+C*ae+U*ce,l[15]=L*F+N*re+C*ee+U*P,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],r=e[4],a=e[8],l=e[12],c=e[1],d=e[5],h=e[9],f=e[13],m=e[2],g=e[6],x=e[10],M=e[14],E=e[3],w=e[7],_=e[11],S=e[15],L=h*M-f*x,N=d*M-f*g,C=d*x-h*g,U=c*M-f*m,D=c*x-h*m,k=c*g-d*m;return t*(w*L-_*N+S*C)-r*(E*L-_*U+S*D)+a*(E*N-w*U+S*k)-l*(E*C-w*D+_*k)}determinantAffine(){const e=this.elements,t=e[0],r=e[4],a=e[8],l=e[1],c=e[5],d=e[9],h=e[2],f=e[6],m=e[10];return t*(c*m-d*f)-r*(l*m-d*h)+a*(l*f-c*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,r){const a=this.elements;return e.isVector3?(a[12]=e.x,a[13]=e.y,a[14]=e.z):(a[12]=e,a[13]=t,a[14]=r),this}invert(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],m=e[8],g=e[9],x=e[10],M=e[11],E=e[12],w=e[13],_=e[14],S=e[15],L=t*d-r*c,N=t*h-a*c,C=t*f-l*c,U=r*h-a*d,D=r*f-l*d,k=a*f-l*h,b=m*w-g*E,F=m*_-x*E,B=m*S-M*E,G=g*_-x*w,Z=g*S-M*w,re=x*S-M*_,he=L*re-N*Z+C*G+U*B-D*F+k*b;if(he===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const z=1/he;return e[0]=(d*re-h*Z+f*G)*z,e[1]=(a*Z-r*re-l*G)*z,e[2]=(w*k-_*D+S*U)*z,e[3]=(x*D-g*k-M*U)*z,e[4]=(h*B-c*re-f*F)*z,e[5]=(t*re-a*B+l*F)*z,e[6]=(_*C-E*k-S*N)*z,e[7]=(m*k-x*C+M*N)*z,e[8]=(c*Z-d*B+f*b)*z,e[9]=(r*B-t*Z-l*b)*z,e[10]=(E*D-w*C+S*L)*z,e[11]=(g*C-m*D-M*L)*z,e[12]=(d*F-c*G-h*b)*z,e[13]=(t*G-r*F+a*b)*z,e[14]=(w*N-E*U-_*L)*z,e[15]=(m*U-g*N+x*L)*z,this}scale(e){const t=this.elements,r=e.x,a=e.y,l=e.z;return t[0]*=r,t[4]*=a,t[8]*=l,t[1]*=r,t[5]*=a,t[9]*=l,t[2]*=r,t[6]*=a,t[10]*=l,t[3]*=r,t[7]*=a,t[11]*=l,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],r=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],a=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,r,a))}makeTranslation(e,t,r){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,r,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),r=Math.sin(e);return this.set(1,0,0,0,0,t,-r,0,0,r,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,0,r,0,0,1,0,0,-r,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,-r,0,0,r,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const r=Math.cos(t),a=Math.sin(t),l=1-r,c=e.x,d=e.y,h=e.z,f=l*c,m=l*d;return this.set(f*c+r,f*d-a*h,f*h+a*d,0,f*d+a*h,m*d+r,m*h-a*c,0,f*h-a*d,m*h+a*c,l*h*h+r,0,0,0,0,1),this}makeScale(e,t,r){return this.set(e,0,0,0,0,t,0,0,0,0,r,0,0,0,0,1),this}makeShear(e,t,r,a,l,c){return this.set(1,r,l,0,e,1,c,0,t,a,1,0,0,0,0,1),this}compose(e,t,r){const a=this.elements,l=t._x,c=t._y,d=t._z,h=t._w,f=l+l,m=c+c,g=d+d,x=l*f,M=l*m,E=l*g,w=c*m,_=c*g,S=d*g,L=h*f,N=h*m,C=h*g,U=r.x,D=r.y,k=r.z;return a[0]=(1-(w+S))*U,a[1]=(M+C)*U,a[2]=(E-N)*U,a[3]=0,a[4]=(M-C)*D,a[5]=(1-(x+S))*D,a[6]=(_+L)*D,a[7]=0,a[8]=(E+N)*k,a[9]=(_-L)*k,a[10]=(1-(x+w))*k,a[11]=0,a[12]=e.x,a[13]=e.y,a[14]=e.z,a[15]=1,this}decompose(e,t,r){const a=this.elements;e.x=a[12],e.y=a[13],e.z=a[14];const l=this.determinantAffine();if(l===0)return r.set(1,1,1),t.identity(),this;let c=Ja.set(a[0],a[1],a[2]).length();const d=Ja.set(a[4],a[5],a[6]).length(),h=Ja.set(a[8],a[9],a[10]).length();l<0&&(c=-c),ji.copy(this);const f=1/c,m=1/d,g=1/h;return ji.elements[0]*=f,ji.elements[1]*=f,ji.elements[2]*=f,ji.elements[4]*=m,ji.elements[5]*=m,ji.elements[6]*=m,ji.elements[8]*=g,ji.elements[9]*=g,ji.elements[10]*=g,t.setFromRotationMatrix(ji),r.x=c,r.y=d,r.z=h,this}makePerspective(e,t,r,a,l,c,d=mr,h=!1){const f=this.elements,m=2*l/(t-e),g=2*l/(r-a),x=(t+e)/(t-e),M=(r+a)/(r-a);let E,w;if(h)E=l/(c-l),w=c*l/(c-l);else if(d===mr)E=-(c+l)/(c-l),w=-2*c*l/(c-l);else if(d===ql)E=-c/(c-l),w=-c*l/(c-l);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+d);return f[0]=m,f[4]=0,f[8]=x,f[12]=0,f[1]=0,f[5]=g,f[9]=M,f[13]=0,f[2]=0,f[6]=0,f[10]=E,f[14]=w,f[3]=0,f[7]=0,f[11]=-1,f[15]=0,this}makeOrthographic(e,t,r,a,l,c,d=mr,h=!1){const f=this.elements,m=2/(t-e),g=2/(r-a),x=-(t+e)/(t-e),M=-(r+a)/(r-a);let E,w;if(h)E=1/(c-l),w=c/(c-l);else if(d===mr)E=-2/(c-l),w=-(c+l)/(c-l);else if(d===ql)E=-1/(c-l),w=-l/(c-l);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+d);return f[0]=m,f[4]=0,f[8]=0,f[12]=x,f[1]=0,f[5]=g,f[9]=0,f[13]=M,f[2]=0,f[6]=0,f[10]=E,f[14]=w,f[3]=0,f[7]=0,f[11]=0,f[15]=1,this}equals(e){const t=this.elements,r=e.elements;for(let a=0;a<16;a++)if(t[a]!==r[a])return!1;return!0}fromArray(e,t=0){for(let r=0;r<16;r++)this.elements[r]=e[r+t];return this}toArray(e=[],t=0){const r=this.elements;return e[t]=r[0],e[t+1]=r[1],e[t+2]=r[2],e[t+3]=r[3],e[t+4]=r[4],e[t+5]=r[5],e[t+6]=r[6],e[t+7]=r[7],e[t+8]=r[8],e[t+9]=r[9],e[t+10]=r[10],e[t+11]=r[11],e[t+12]=r[12],e[t+13]=r[13],e[t+14]=r[14],e[t+15]=r[15],e}};fd.prototype.isMatrix4=!0;let an=fd;const Ja=new te,ji=new an,Sb=new te(0,0,0),Mb=new te(1,1,1),gs=new te,gu=new te,xi=new te,iv=new an,rv=new Os;class Kr{constructor(e=0,t=0,r=0,a=Kr.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=r,this._order=a}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,r,a=this._order){return this._x=e,this._y=t,this._z=r,this._order=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,r=!0){const a=e.elements,l=a[0],c=a[4],d=a[8],h=a[1],f=a[5],m=a[9],g=a[2],x=a[6],M=a[10];switch(t){case"XYZ":this._y=Math.asin(bt(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(-m,M),this._z=Math.atan2(-c,l)):(this._x=Math.atan2(x,f),this._z=0);break;case"YXZ":this._x=Math.asin(-bt(m,-1,1)),Math.abs(m)<.9999999?(this._y=Math.atan2(d,M),this._z=Math.atan2(h,f)):(this._y=Math.atan2(-g,l),this._z=0);break;case"ZXY":this._x=Math.asin(bt(x,-1,1)),Math.abs(x)<.9999999?(this._y=Math.atan2(-g,M),this._z=Math.atan2(-c,f)):(this._y=0,this._z=Math.atan2(h,l));break;case"ZYX":this._y=Math.asin(-bt(g,-1,1)),Math.abs(g)<.9999999?(this._x=Math.atan2(x,M),this._z=Math.atan2(h,l)):(this._x=0,this._z=Math.atan2(-c,f));break;case"YZX":this._z=Math.asin(bt(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(-m,f),this._y=Math.atan2(-g,l)):(this._x=0,this._y=Math.atan2(d,M));break;case"XZY":this._z=Math.asin(-bt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(x,f),this._y=Math.atan2(d,l)):(this._x=Math.atan2(-m,M),this._y=0);break;default:lt("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,r===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,r){return iv.makeRotationFromQuaternion(e),this.setFromRotationMatrix(iv,t,r)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return rv.setFromEuler(this),this.setFromQuaternion(rv,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Kr.DEFAULT_ORDER="XYZ";class vy{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Eb=0;const sv=new te,eo=new Os,Nr=new an,xu=new te,Rl=new te,wb=new te,bb=new Os,av=new te(1,0,0),ov=new te(0,1,0),lv=new te(0,0,1),cv={type:"added"},Tb={type:"removed"},to={type:"childadded",child:null},Sf={type:"childremoved",child:null};class En extends ks{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Eb++}),this.uuid=ic(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=En.DEFAULT_UP.clone();const e=new te,t=new Kr,r=new Os,a=new te(1,1,1);function l(){r.setFromEuler(t,!1)}function c(){t.setFromQuaternion(r,void 0,!1)}t._onChange(l),r._onChange(c),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:a},modelViewMatrix:{value:new an},normalMatrix:{value:new pt}}),this.matrix=new an,this.matrixWorld=new an,this.matrixAutoUpdate=En.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=En.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new vy,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return eo.setFromAxisAngle(e,t),this.quaternion.multiply(eo),this}rotateOnWorldAxis(e,t){return eo.setFromAxisAngle(e,t),this.quaternion.premultiply(eo),this}rotateX(e){return this.rotateOnAxis(av,e)}rotateY(e){return this.rotateOnAxis(ov,e)}rotateZ(e){return this.rotateOnAxis(lv,e)}translateOnAxis(e,t){return sv.copy(e).applyQuaternion(this.quaternion),this.position.add(sv.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(av,e)}translateY(e){return this.translateOnAxis(ov,e)}translateZ(e){return this.translateOnAxis(lv,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Nr.copy(this.matrixWorld).invert())}lookAt(e,t,r){e.isVector3?xu.copy(e):xu.set(e,t,r);const a=this.parent;this.updateWorldMatrix(!0,!1),Rl.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Nr.lookAt(Rl,xu,this.up):Nr.lookAt(xu,Rl,this.up),this.quaternion.setFromRotationMatrix(Nr),a&&(Nr.extractRotation(a.matrixWorld),eo.setFromRotationMatrix(Nr),this.quaternion.premultiply(eo.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Dt("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(cv),to.child=e,this.dispatchEvent(to),to.child=null):Dt("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let r=0;r<arguments.length;r++)this.remove(arguments[r]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Tb),Sf.child=e,this.dispatchEvent(Sf),Sf.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Nr.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Nr.multiply(e.parent.matrixWorld)),e.applyMatrix4(Nr),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(cv),to.child=e,this.dispatchEvent(to),to.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let r=0,a=this.children.length;r<a;r++){const c=this.children[r].getObjectByProperty(e,t);if(c!==void 0)return c}}getObjectsByProperty(e,t,r=[]){this[e]===t&&r.push(this);const a=this.children;for(let l=0,c=a.length;l<c;l++)a[l].getObjectsByProperty(e,t,r);return r}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Rl,e,wb),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Rl,bb,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,r=e.y,a=e.z,l=this.matrix.elements;l[12]+=t-l[0]*t-l[4]*r-l[8]*a,l[13]+=r-l[1]*t-l[5]*r-l[9]*a,l[14]+=a-l[2]*t-l[6]*r-l[10]*a}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].updateMatrixWorld(e)}updateWorldMatrix(e,t,r=!1){const a=this.parent;if(e===!0&&a!==null&&a.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||r)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,r=!0),t===!0){const l=this.children;for(let c=0,d=l.length;c<d;c++)l[c].updateWorldMatrix(!1,!0,r)}}toJSON(e){const t=e===void 0||typeof e=="string",r={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},r.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const a={};a.uuid=this.uuid,a.type=this.type,this.name!==""&&(a.name=this.name),this.castShadow===!0&&(a.castShadow=!0),this.receiveShadow===!0&&(a.receiveShadow=!0),this.visible===!1&&(a.visible=!1),this.frustumCulled===!1&&(a.frustumCulled=!1),this.renderOrder!==0&&(a.renderOrder=this.renderOrder),this.static!==!1&&(a.static=this.static),Object.keys(this.userData).length>0&&(a.userData=this.userData),a.layers=this.layers.mask,a.matrix=this.matrix.toArray(),a.up=this.up.toArray(),this.pivot!==null&&(a.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(a.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(a.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(a.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(a.type="InstancedMesh",a.count=this.count,a.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(a.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(a.type="BatchedMesh",a.perObjectFrustumCulled=this.perObjectFrustumCulled,a.sortObjects=this.sortObjects,a.drawRanges=this._drawRanges,a.reservedRanges=this._reservedRanges,a.geometryInfo=this._geometryInfo.map(d=>({...d,boundingBox:d.boundingBox?d.boundingBox.toJSON():void 0,boundingSphere:d.boundingSphere?d.boundingSphere.toJSON():void 0})),a.instanceInfo=this._instanceInfo.map(d=>({...d})),a.availableInstanceIds=this._availableInstanceIds.slice(),a.availableGeometryIds=this._availableGeometryIds.slice(),a.nextIndexStart=this._nextIndexStart,a.nextVertexStart=this._nextVertexStart,a.geometryCount=this._geometryCount,a.maxInstanceCount=this._maxInstanceCount,a.maxVertexCount=this._maxVertexCount,a.maxIndexCount=this._maxIndexCount,a.geometryInitialized=this._geometryInitialized,a.matricesTexture=this._matricesTexture.toJSON(e),a.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(a.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(a.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(a.boundingBox=this.boundingBox.toJSON()));function l(d,h){return d[h.uuid]===void 0&&(d[h.uuid]=h.toJSON(e)),h.uuid}if(this.isScene)this.background&&(this.background.isColor?a.background=this.background.toJSON():this.background.isTexture&&(a.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(a.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){a.geometry=l(e.geometries,this.geometry);const d=this.geometry.parameters;if(d!==void 0&&d.shapes!==void 0){const h=d.shapes;if(Array.isArray(h))for(let f=0,m=h.length;f<m;f++){const g=h[f];l(e.shapes,g)}else l(e.shapes,h)}}if(this.isSkinnedMesh&&(a.bindMode=this.bindMode,a.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(l(e.skeletons,this.skeleton),a.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const d=[];for(let h=0,f=this.material.length;h<f;h++)d.push(l(e.materials,this.material[h]));a.material=d}else a.material=l(e.materials,this.material);if(this.children.length>0){a.children=[];for(let d=0;d<this.children.length;d++)a.children.push(this.children[d].toJSON(e).object)}if(this.animations.length>0){a.animations=[];for(let d=0;d<this.animations.length;d++){const h=this.animations[d];a.animations.push(l(e.animations,h))}}if(t){const d=c(e.geometries),h=c(e.materials),f=c(e.textures),m=c(e.images),g=c(e.shapes),x=c(e.skeletons),M=c(e.animations),E=c(e.nodes);d.length>0&&(r.geometries=d),h.length>0&&(r.materials=h),f.length>0&&(r.textures=f),m.length>0&&(r.images=m),g.length>0&&(r.shapes=g),x.length>0&&(r.skeletons=x),M.length>0&&(r.animations=M),E.length>0&&(r.nodes=E)}return r.object=a,r;function c(d){const h=[];for(const f in d){const m=d[f];delete m.metadata,h.push(m)}return h}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let r=0;r<e.children.length;r++){const a=e.children[r];this.add(a.clone())}return this}}En.DEFAULT_UP=new te(0,1,0);En.DEFAULT_MATRIX_AUTO_UPDATE=!0;En.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class kl extends En{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Cb={type:"move"};class Mf{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new kl,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new kl,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new te,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new te),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new kl,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new te,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new te,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const r of e.hand.values())this._getHandJoint(t,r)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,r){let a=null,l=null,c=null;const d=this._targetRay,h=this._grip,f=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(f&&e.hand){c=!0;for(const w of e.hand.values()){const _=t.getJointPose(w,r),S=this._getHandJoint(f,w);_!==null&&(S.matrix.fromArray(_.transform.matrix),S.matrix.decompose(S.position,S.rotation,S.scale),S.matrixWorldNeedsUpdate=!0,S.jointRadius=_.radius),S.visible=_!==null}const m=f.joints["index-finger-tip"],g=f.joints["thumb-tip"],x=m.position.distanceTo(g.position),M=.02,E=.005;f.inputState.pinching&&x>M+E?(f.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!f.inputState.pinching&&x<=M-E&&(f.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else h!==null&&e.gripSpace&&(l=t.getPose(e.gripSpace,r),l!==null&&(h.matrix.fromArray(l.transform.matrix),h.matrix.decompose(h.position,h.rotation,h.scale),h.matrixWorldNeedsUpdate=!0,l.linearVelocity?(h.hasLinearVelocity=!0,h.linearVelocity.copy(l.linearVelocity)):h.hasLinearVelocity=!1,l.angularVelocity?(h.hasAngularVelocity=!0,h.angularVelocity.copy(l.angularVelocity)):h.hasAngularVelocity=!1,h.eventsEnabled&&h.dispatchEvent({type:"gripUpdated",data:e,target:this})));d!==null&&(a=t.getPose(e.targetRaySpace,r),a===null&&l!==null&&(a=l),a!==null&&(d.matrix.fromArray(a.transform.matrix),d.matrix.decompose(d.position,d.rotation,d.scale),d.matrixWorldNeedsUpdate=!0,a.linearVelocity?(d.hasLinearVelocity=!0,d.linearVelocity.copy(a.linearVelocity)):d.hasLinearVelocity=!1,a.angularVelocity?(d.hasAngularVelocity=!0,d.angularVelocity.copy(a.angularVelocity)):d.hasAngularVelocity=!1,this.dispatchEvent(Cb)))}return d!==null&&(d.visible=a!==null),h!==null&&(h.visible=l!==null),f!==null&&(f.visible=c!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const r=new kl;r.matrixAutoUpdate=!1,r.visible=!1,e.joints[t.jointName]=r,e.add(r)}return e.joints[t.jointName]}}const _y={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},xs={h:0,s:0,l:0},vu={h:0,s:0,l:0};function Ef(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class xt{constructor(e,t,r){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,r)}set(e,t,r){if(t===void 0&&r===void 0){const a=e;a&&a.isColor?this.copy(a):typeof a=="number"?this.setHex(a):typeof a=="string"&&this.setStyle(a)}else this.setRGB(e,t,r);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Jn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Pt.colorSpaceToWorking(this,t),this}setRGB(e,t,r,a=Pt.workingColorSpace){return this.r=e,this.g=t,this.b=r,Pt.colorSpaceToWorking(this,a),this}setHSL(e,t,r,a=Pt.workingColorSpace){if(e=fb(e,1),t=bt(t,0,1),r=bt(r,0,1),t===0)this.r=this.g=this.b=r;else{const l=r<=.5?r*(1+t):r+t-r*t,c=2*r-l;this.r=Ef(c,l,e+1/3),this.g=Ef(c,l,e),this.b=Ef(c,l,e-1/3)}return Pt.colorSpaceToWorking(this,a),this}setStyle(e,t=Jn){function r(l){l!==void 0&&parseFloat(l)<1&&lt("Color: Alpha component of "+e+" will be ignored.")}let a;if(a=/^(\w+)\(([^\)]*)\)/.exec(e)){let l;const c=a[1],d=a[2];switch(c){case"rgb":case"rgba":if(l=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setRGB(Math.min(255,parseInt(l[1],10))/255,Math.min(255,parseInt(l[2],10))/255,Math.min(255,parseInt(l[3],10))/255,t);if(l=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setRGB(Math.min(100,parseInt(l[1],10))/100,Math.min(100,parseInt(l[2],10))/100,Math.min(100,parseInt(l[3],10))/100,t);break;case"hsl":case"hsla":if(l=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setHSL(parseFloat(l[1])/360,parseFloat(l[2])/100,parseFloat(l[3])/100,t);break;default:lt("Color: Unknown color model "+e)}}else if(a=/^\#([A-Fa-f\d]+)$/.exec(e)){const l=a[1],c=l.length;if(c===3)return this.setRGB(parseInt(l.charAt(0),16)/15,parseInt(l.charAt(1),16)/15,parseInt(l.charAt(2),16)/15,t);if(c===6)return this.setHex(parseInt(l,16),t);lt("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Jn){const r=_y[e.toLowerCase()];return r!==void 0?this.setHex(r,t):lt("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Wr(e.r),this.g=Wr(e.g),this.b=Wr(e.b),this}copyLinearToSRGB(e){return this.r=_o(e.r),this.g=_o(e.g),this.b=_o(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Jn){return Pt.workingToColorSpace(Gn.copy(this),e),Math.round(bt(Gn.r*255,0,255))*65536+Math.round(bt(Gn.g*255,0,255))*256+Math.round(bt(Gn.b*255,0,255))}getHexString(e=Jn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Pt.workingColorSpace){Pt.workingToColorSpace(Gn.copy(this),t);const r=Gn.r,a=Gn.g,l=Gn.b,c=Math.max(r,a,l),d=Math.min(r,a,l);let h,f;const m=(d+c)/2;if(d===c)h=0,f=0;else{const g=c-d;switch(f=m<=.5?g/(c+d):g/(2-c-d),c){case r:h=(a-l)/g+(a<l?6:0);break;case a:h=(l-r)/g+2;break;case l:h=(r-a)/g+4;break}h/=6}return e.h=h,e.s=f,e.l=m,e}getRGB(e,t=Pt.workingColorSpace){return Pt.workingToColorSpace(Gn.copy(this),t),e.r=Gn.r,e.g=Gn.g,e.b=Gn.b,e}getStyle(e=Jn){Pt.workingToColorSpace(Gn.copy(this),e);const t=Gn.r,r=Gn.g,a=Gn.b;return e!==Jn?`color(${e} ${t.toFixed(3)} ${r.toFixed(3)} ${a.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(r*255)},${Math.round(a*255)})`}offsetHSL(e,t,r){return this.getHSL(xs),this.setHSL(xs.h+e,xs.s+t,xs.l+r)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,r){return this.r=e.r+(t.r-e.r)*r,this.g=e.g+(t.g-e.g)*r,this.b=e.b+(t.b-e.b)*r,this}lerpHSL(e,t){this.getHSL(xs),e.getHSL(vu);const r=gf(xs.h,vu.h,t),a=gf(xs.s,vu.s,t),l=gf(xs.l,vu.l,t);return this.setHSL(r,a,l),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,r=this.g,a=this.b,l=e.elements;return this.r=l[0]*t+l[3]*r+l[6]*a,this.g=l[1]*t+l[4]*r+l[7]*a,this.b=l[2]*t+l[5]*r+l[8]*a,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Gn=new xt;xt.NAMES=_y;class Rb extends En{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Kr,this.environmentIntensity=1,this.environmentRotation=new Kr,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const Wi=new te,Lr=new te,wf=new te,Dr=new te,no=new te,io=new te,uv=new te,bf=new te,Tf=new te,Cf=new te,Rf=new un,Af=new un,Pf=new un;class Yi{constructor(e=new te,t=new te,r=new te){this.a=e,this.b=t,this.c=r}static getNormal(e,t,r,a){a.subVectors(r,t),Wi.subVectors(e,t),a.cross(Wi);const l=a.lengthSq();return l>0?a.multiplyScalar(1/Math.sqrt(l)):a.set(0,0,0)}static getBarycoord(e,t,r,a,l){Wi.subVectors(a,t),Lr.subVectors(r,t),wf.subVectors(e,t);const c=Wi.dot(Wi),d=Wi.dot(Lr),h=Wi.dot(wf),f=Lr.dot(Lr),m=Lr.dot(wf),g=c*f-d*d;if(g===0)return l.set(0,0,0),null;const x=1/g,M=(f*h-d*m)*x,E=(c*m-d*h)*x;return l.set(1-M-E,E,M)}static containsPoint(e,t,r,a){return this.getBarycoord(e,t,r,a,Dr)===null?!1:Dr.x>=0&&Dr.y>=0&&Dr.x+Dr.y<=1}static getInterpolation(e,t,r,a,l,c,d,h){return this.getBarycoord(e,t,r,a,Dr)===null?(h.x=0,h.y=0,"z"in h&&(h.z=0),"w"in h&&(h.w=0),null):(h.setScalar(0),h.addScaledVector(l,Dr.x),h.addScaledVector(c,Dr.y),h.addScaledVector(d,Dr.z),h)}static getInterpolatedAttribute(e,t,r,a,l,c){return Rf.setScalar(0),Af.setScalar(0),Pf.setScalar(0),Rf.fromBufferAttribute(e,t),Af.fromBufferAttribute(e,r),Pf.fromBufferAttribute(e,a),c.setScalar(0),c.addScaledVector(Rf,l.x),c.addScaledVector(Af,l.y),c.addScaledVector(Pf,l.z),c}static isFrontFacing(e,t,r,a){return Wi.subVectors(r,t),Lr.subVectors(e,t),Wi.cross(Lr).dot(a)<0}set(e,t,r){return this.a.copy(e),this.b.copy(t),this.c.copy(r),this}setFromPointsAndIndices(e,t,r,a){return this.a.copy(e[t]),this.b.copy(e[r]),this.c.copy(e[a]),this}setFromAttributeAndIndices(e,t,r,a){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,r),this.c.fromBufferAttribute(e,a),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Wi.subVectors(this.c,this.b),Lr.subVectors(this.a,this.b),Wi.cross(Lr).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Yi.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Yi.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,r,a,l){return Yi.getInterpolation(e,this.a,this.b,this.c,t,r,a,l)}containsPoint(e){return Yi.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Yi.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const r=this.a,a=this.b,l=this.c;let c,d;no.subVectors(a,r),io.subVectors(l,r),bf.subVectors(e,r);const h=no.dot(bf),f=io.dot(bf);if(h<=0&&f<=0)return t.copy(r);Tf.subVectors(e,a);const m=no.dot(Tf),g=io.dot(Tf);if(m>=0&&g<=m)return t.copy(a);const x=h*g-m*f;if(x<=0&&h>=0&&m<=0)return c=h/(h-m),t.copy(r).addScaledVector(no,c);Cf.subVectors(e,l);const M=no.dot(Cf),E=io.dot(Cf);if(E>=0&&M<=E)return t.copy(l);const w=M*f-h*E;if(w<=0&&f>=0&&E<=0)return d=f/(f-E),t.copy(r).addScaledVector(io,d);const _=m*E-M*g;if(_<=0&&g-m>=0&&M-E>=0)return uv.subVectors(l,a),d=(g-m)/(g-m+(M-E)),t.copy(a).addScaledVector(uv,d);const S=1/(_+w+x);return c=w*S,d=x*S,t.copy(r).addScaledVector(no,c).addScaledVector(io,d)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class Ho{constructor(e=new te(1/0,1/0,1/0),t=new te(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,r=e.length;t<r;t+=3)this.expandByPoint(Xi.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,r=e.count;t<r;t++)this.expandByPoint(Xi.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,r=e.length;t<r;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const r=Xi.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(r),this.max.copy(e).add(r),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const r=e.geometry;if(r!==void 0){const l=r.getAttribute("position");if(t===!0&&l!==void 0&&e.isInstancedMesh!==!0)for(let c=0,d=l.count;c<d;c++)e.isMesh===!0?e.getVertexPosition(c,Xi):Xi.fromBufferAttribute(l,c),Xi.applyMatrix4(e.matrixWorld),this.expandByPoint(Xi);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),_u.copy(e.boundingBox)):(r.boundingBox===null&&r.computeBoundingBox(),_u.copy(r.boundingBox)),_u.applyMatrix4(e.matrixWorld),this.union(_u)}const a=e.children;for(let l=0,c=a.length;l<c;l++)this.expandByObject(a[l],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Xi),Xi.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,r;return e.normal.x>0?(t=e.normal.x*this.min.x,r=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,r=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,r+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,r+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,r+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,r+=e.normal.z*this.min.z),t<=-e.constant&&r>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Al),yu.subVectors(this.max,Al),ro.subVectors(e.a,Al),so.subVectors(e.b,Al),ao.subVectors(e.c,Al),vs.subVectors(so,ro),_s.subVectors(ao,so),ia.subVectors(ro,ao);let t=[0,-vs.z,vs.y,0,-_s.z,_s.y,0,-ia.z,ia.y,vs.z,0,-vs.x,_s.z,0,-_s.x,ia.z,0,-ia.x,-vs.y,vs.x,0,-_s.y,_s.x,0,-ia.y,ia.x,0];return!Nf(t,ro,so,ao,yu)||(t=[1,0,0,0,1,0,0,0,1],!Nf(t,ro,so,ao,yu))?!1:(Su.crossVectors(vs,_s),t=[Su.x,Su.y,Su.z],Nf(t,ro,so,ao,yu))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Xi).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Xi).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Ir[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Ir[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Ir[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Ir[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Ir[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Ir[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Ir[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Ir[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Ir),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Ir=[new te,new te,new te,new te,new te,new te,new te,new te],Xi=new te,_u=new Ho,ro=new te,so=new te,ao=new te,vs=new te,_s=new te,ia=new te,Al=new te,yu=new te,Su=new te,ra=new te;function Nf(i,e,t,r,a){for(let l=0,c=i.length-3;l<=c;l+=3){ra.fromArray(i,l);const d=a.x*Math.abs(ra.x)+a.y*Math.abs(ra.y)+a.z*Math.abs(ra.z),h=e.dot(ra),f=t.dot(ra),m=r.dot(ra);if(Math.max(-Math.max(h,f,m),Math.min(h,f,m))>d)return!1}return!0}const vn=new te,Mu=new dt;let Ab=0;class vr extends ks{constructor(e,t,r=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Ab++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=r,this.usage=Kx,this.updateRanges=[],this.gpuType=pr,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,r){e*=this.itemSize,r*=t.itemSize;for(let a=0,l=this.itemSize;a<l;a++)this.array[e+a]=t.array[r+a];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,r=this.count;t<r;t++)Mu.fromBufferAttribute(this,t),Mu.applyMatrix3(e),this.setXY(t,Mu.x,Mu.y);else if(this.itemSize===3)for(let t=0,r=this.count;t<r;t++)vn.fromBufferAttribute(this,t),vn.applyMatrix3(e),this.setXYZ(t,vn.x,vn.y,vn.z);return this}applyMatrix4(e){for(let t=0,r=this.count;t<r;t++)vn.fromBufferAttribute(this,t),vn.applyMatrix4(e),this.setXYZ(t,vn.x,vn.y,vn.z);return this}applyNormalMatrix(e){for(let t=0,r=this.count;t<r;t++)vn.fromBufferAttribute(this,t),vn.applyNormalMatrix(e),this.setXYZ(t,vn.x,vn.y,vn.z);return this}transformDirection(e){for(let t=0,r=this.count;t<r;t++)vn.fromBufferAttribute(this,t),vn.transformDirection(e),this.setXYZ(t,vn.x,vn.y,vn.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let r=this.array[e*this.itemSize+t];return this.normalized&&(r=Cl(r,this.array)),r}setComponent(e,t,r){return this.normalized&&(r=li(r,this.array)),this.array[e*this.itemSize+t]=r,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Cl(t,this.array)),t}setX(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Cl(t,this.array)),t}setY(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Cl(t,this.array)),t}setZ(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Cl(t,this.array)),t}setW(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,r){return e*=this.itemSize,this.normalized&&(t=li(t,this.array),r=li(r,this.array)),this.array[e+0]=t,this.array[e+1]=r,this}setXYZ(e,t,r,a){return e*=this.itemSize,this.normalized&&(t=li(t,this.array),r=li(r,this.array),a=li(a,this.array)),this.array[e+0]=t,this.array[e+1]=r,this.array[e+2]=a,this}setXYZW(e,t,r,a,l){return e*=this.itemSize,this.normalized&&(t=li(t,this.array),r=li(r,this.array),a=li(a,this.array),l=li(l,this.array)),this.array[e+0]=t,this.array[e+1]=r,this.array[e+2]=a,this.array[e+3]=l,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Kx&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}}class yy extends vr{constructor(e,t,r){super(new Uint16Array(e),t,r)}}class Sy extends vr{constructor(e,t,r){super(new Uint32Array(e),t,r)}}class In extends vr{constructor(e,t,r){super(new Float32Array(e),t,r)}}const Pb=new Ho,Pl=new te,Lf=new te;class rc{constructor(e=new te,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const r=this.center;t!==void 0?r.copy(t):Pb.setFromPoints(e).getCenter(r);let a=0;for(let l=0,c=e.length;l<c;l++)a=Math.max(a,r.distanceToSquared(e[l]));return this.radius=Math.sqrt(a),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const r=this.center.distanceToSquared(e);return t.copy(e),r>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Pl.subVectors(e,this.center);const t=Pl.lengthSq();if(t>this.radius*this.radius){const r=Math.sqrt(t),a=(r-this.radius)*.5;this.center.addScaledVector(Pl,a/r),this.radius+=a}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Lf.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Pl.copy(e.center).add(Lf)),this.expandByPoint(Pl.copy(e.center).sub(Lf))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let Nb=0;const Ni=new an,Df=new En,oo=new te,vi=new Ho,Nl=new Ho,An=new te;class Mi extends ks{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Nb++}),this.uuid=ic(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(cb(e)?Sy:yy)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,r=0){this.groups.push({start:e,count:t,materialIndex:r})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const r=this.attributes.normal;if(r!==void 0){const l=new pt().getNormalMatrix(e);r.applyNormalMatrix(l),r.needsUpdate=!0}const a=this.attributes.tangent;return a!==void 0&&(a.transformDirection(e),a.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return Ni.makeRotationFromQuaternion(e),this.applyMatrix4(Ni),this}rotateX(e){return Ni.makeRotationX(e),this.applyMatrix4(Ni),this}rotateY(e){return Ni.makeRotationY(e),this.applyMatrix4(Ni),this}rotateZ(e){return Ni.makeRotationZ(e),this.applyMatrix4(Ni),this}translate(e,t,r){return Ni.makeTranslation(e,t,r),this.applyMatrix4(Ni),this}scale(e,t,r){return Ni.makeScale(e,t,r),this.applyMatrix4(Ni),this}lookAt(e){return Df.lookAt(e),Df.updateMatrix(),this.applyMatrix4(Df.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(oo).negate(),this.translate(oo.x,oo.y,oo.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const r=[];for(let a=0,l=e.length;a<l;a++){const c=e[a];r.push(c.x,c.y,c.z||0)}this.setAttribute("position",new In(r,3))}else{const r=Math.min(e.length,t.count);for(let a=0;a<r;a++){const l=e[a];t.setXYZ(a,l.x,l.y,l.z||0)}e.length>t.count&&lt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Ho);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Dt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new te(-1/0,-1/0,-1/0),new te(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){const l=t[r];vi.setFromBufferAttribute(l),this.morphTargetsRelative?(An.addVectors(this.boundingBox.min,vi.min),this.boundingBox.expandByPoint(An),An.addVectors(this.boundingBox.max,vi.max),this.boundingBox.expandByPoint(An)):(this.boundingBox.expandByPoint(vi.min),this.boundingBox.expandByPoint(vi.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Dt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new rc);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Dt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new te,1/0);return}if(e){const r=this.boundingSphere.center;if(vi.setFromBufferAttribute(e),t)for(let l=0,c=t.length;l<c;l++){const d=t[l];Nl.setFromBufferAttribute(d),this.morphTargetsRelative?(An.addVectors(vi.min,Nl.min),vi.expandByPoint(An),An.addVectors(vi.max,Nl.max),vi.expandByPoint(An)):(vi.expandByPoint(Nl.min),vi.expandByPoint(Nl.max))}vi.getCenter(r);let a=0;for(let l=0,c=e.count;l<c;l++)An.fromBufferAttribute(e,l),a=Math.max(a,r.distanceToSquared(An));if(t)for(let l=0,c=t.length;l<c;l++){const d=t[l],h=this.morphTargetsRelative;for(let f=0,m=d.count;f<m;f++)An.fromBufferAttribute(d,f),h&&(oo.fromBufferAttribute(e,f),An.add(oo)),a=Math.max(a,r.distanceToSquared(An))}this.boundingSphere.radius=Math.sqrt(a),isNaN(this.boundingSphere.radius)&&Dt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Dt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const r=t.position,a=t.normal,l=t.uv;let c=this.getAttribute("tangent");(c===void 0||c.count!==r.count)&&(c=new vr(new Float32Array(4*r.count),4),this.setAttribute("tangent",c));const d=[],h=[];for(let b=0;b<r.count;b++)d[b]=new te,h[b]=new te;const f=new te,m=new te,g=new te,x=new dt,M=new dt,E=new dt,w=new te,_=new te;function S(b,F,B){f.fromBufferAttribute(r,b),m.fromBufferAttribute(r,F),g.fromBufferAttribute(r,B),x.fromBufferAttribute(l,b),M.fromBufferAttribute(l,F),E.fromBufferAttribute(l,B),m.sub(f),g.sub(f),M.sub(x),E.sub(x);const G=1/(M.x*E.y-E.x*M.y);isFinite(G)&&(w.copy(m).multiplyScalar(E.y).addScaledVector(g,-M.y).multiplyScalar(G),_.copy(g).multiplyScalar(M.x).addScaledVector(m,-E.x).multiplyScalar(G),d[b].add(w),d[F].add(w),d[B].add(w),h[b].add(_),h[F].add(_),h[B].add(_))}let L=this.groups;L.length===0&&(L=[{start:0,count:e.count}]);for(let b=0,F=L.length;b<F;++b){const B=L[b],G=B.start,Z=B.count;for(let re=G,he=G+Z;re<he;re+=3)S(e.getX(re+0),e.getX(re+1),e.getX(re+2))}const N=new te,C=new te,U=new te,D=new te;function k(b){U.fromBufferAttribute(a,b),D.copy(U);const F=d[b];N.copy(F),N.sub(U.multiplyScalar(U.dot(F))).normalize(),C.crossVectors(D,F);const G=C.dot(h[b])<0?-1:1;c.setXYZW(b,N.x,N.y,N.z,G)}for(let b=0,F=L.length;b<F;++b){const B=L[b],G=B.start,Z=B.count;for(let re=G,he=G+Z;re<he;re+=3)k(e.getX(re+0)),k(e.getX(re+1)),k(e.getX(re+2))}this._transformed=!0}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let r=this.getAttribute("normal");if(r===void 0||r.count!==t.count)r=new vr(new Float32Array(t.count*3),3),this.setAttribute("normal",r);else for(let x=0,M=r.count;x<M;x++)r.setXYZ(x,0,0,0);const a=new te,l=new te,c=new te,d=new te,h=new te,f=new te,m=new te,g=new te;if(e)for(let x=0,M=e.count;x<M;x+=3){const E=e.getX(x+0),w=e.getX(x+1),_=e.getX(x+2);a.fromBufferAttribute(t,E),l.fromBufferAttribute(t,w),c.fromBufferAttribute(t,_),m.subVectors(c,l),g.subVectors(a,l),m.cross(g),d.fromBufferAttribute(r,E),h.fromBufferAttribute(r,w),f.fromBufferAttribute(r,_),d.add(m),h.add(m),f.add(m),r.setXYZ(E,d.x,d.y,d.z),r.setXYZ(w,h.x,h.y,h.z),r.setXYZ(_,f.x,f.y,f.z)}else for(let x=0,M=t.count;x<M;x+=3)a.fromBufferAttribute(t,x+0),l.fromBufferAttribute(t,x+1),c.fromBufferAttribute(t,x+2),m.subVectors(c,l),g.subVectors(a,l),m.cross(g),r.setXYZ(x+0,m.x,m.y,m.z),r.setXYZ(x+1,m.x,m.y,m.z),r.setXYZ(x+2,m.x,m.y,m.z);this.normalizeNormals(),r.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,r=e.count;t<r;t++)An.fromBufferAttribute(e,t),An.normalize(),e.setXYZ(t,An.x,An.y,An.z)}toNonIndexed(){function e(d,h){const f=d.array,m=d.itemSize,g=d.normalized,x=new f.constructor(h.length*m);let M=0,E=0;for(let w=0,_=h.length;w<_;w++){d.isInterleavedBufferAttribute?M=h[w]*d.data.stride+d.offset:M=h[w]*m;for(let S=0;S<m;S++)x[E++]=f[M++]}return new vr(x,m,g)}if(this.index===null)return lt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Mi,r=this.index.array,a=this.attributes;for(const d in a){const h=a[d],f=e(h,r);t.setAttribute(d,f)}const l=this.morphAttributes;for(const d in l){const h=[],f=l[d];for(let m=0,g=f.length;m<g;m++){const x=f[m],M=e(x,r);h.push(M)}t.morphAttributes[d]=h}t.morphTargetsRelative=this.morphTargetsRelative;const c=this.groups;for(let d=0,h=c.length;d<h;d++){const f=c[d];t.addGroup(f.start,f.count,f.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const h=this.parameters;for(const f in h)h[f]!==void 0&&(e[f]=h[f]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const r=this.attributes;for(const h in r){const f=r[h];e.data.attributes[h]=f.toJSON(e.data)}const a={};let l=!1;for(const h in this.morphAttributes){const f=this.morphAttributes[h],m=[];for(let g=0,x=f.length;g<x;g++){const M=f[g];m.push(M.toJSON(e.data))}m.length>0&&(a[h]=m,l=!0)}l&&(e.data.morphAttributes=a,e.data.morphTargetsRelative=this.morphTargetsRelative);const c=this.groups;c.length>0&&(e.data.groups=JSON.parse(JSON.stringify(c)));const d=this.boundingSphere;return d!==null&&(e.data.boundingSphere=d.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const r=e.index;r!==null&&this.setIndex(r.clone());const a=e.attributes;for(const f in a){const m=a[f];this.setAttribute(f,m.clone(t))}const l=e.morphAttributes;for(const f in l){const m=[],g=l[f];for(let x=0,M=g.length;x<M;x++)m.push(g[x].clone(t));this.morphAttributes[f]=m}this.morphTargetsRelative=e.morphTargetsRelative;const c=e.groups;for(let f=0,m=c.length;f<m;f++){const g=c[f];this.addGroup(g.start,g.count,g.materialIndex)}const d=e.boundingBox;d!==null&&(this.boundingBox=d.clone());const h=e.boundingSphere;return h!==null&&(this.boundingSphere=h.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}let Lb=0;class yr extends ks{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Lb++}),this.uuid=ic(),this.name="",this.type="Material",this.blending=xo,this.side=Fs,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=mp,this.blendDst=gp,this.blendEquation=la,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new xt(0,0,0),this.blendAlpha=0,this.depthFunc=Do,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Yx,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Qa,this.stencilZFail=Qa,this.stencilZPass=Qa,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const r=e[t];if(r===void 0){lt(`Material: parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){lt(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}a&&a.isColor?a.set(r):a&&a.isVector2&&r&&r.isVector2||a&&a.isEuler&&r&&r.isEuler||a&&a.isVector3&&r&&r.isVector3?a.copy(r):this[t]=r}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const r={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.color&&this.color.isColor&&(r.color=this.color.getHex()),this.roughness!==void 0&&(r.roughness=this.roughness),this.metalness!==void 0&&(r.metalness=this.metalness),this.sheen!==void 0&&(r.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(r.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(r.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(r.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(r.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(r.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(r.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(r.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(r.shininess=this.shininess),this.clearcoat!==void 0&&(r.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(r.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(r.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(r.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(r.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,r.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(r.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(r.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(r.dispersion=this.dispersion),this.iridescence!==void 0&&(r.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(r.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(r.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(r.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(r.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(r.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(r.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(r.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(r.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(r.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(r.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(r.lightMap=this.lightMap.toJSON(e).uuid,r.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(r.aoMap=this.aoMap.toJSON(e).uuid,r.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(r.bumpMap=this.bumpMap.toJSON(e).uuid,r.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(r.normalMap=this.normalMap.toJSON(e).uuid,r.normalMapType=this.normalMapType,r.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(r.displacementMap=this.displacementMap.toJSON(e).uuid,r.displacementScale=this.displacementScale,r.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(r.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(r.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(r.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(r.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(r.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(r.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(r.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(r.combine=this.combine)),this.envMapRotation!==void 0&&(r.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(r.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(r.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(r.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(r.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(r.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(r.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(r.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(r.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(r.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(r.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(r.size=this.size),this.shadowSide!==null&&(r.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(r.sizeAttenuation=this.sizeAttenuation),this.blending!==xo&&(r.blending=this.blending),this.side!==Fs&&(r.side=this.side),this.vertexColors===!0&&(r.vertexColors=!0),this.opacity<1&&(r.opacity=this.opacity),this.transparent===!0&&(r.transparent=!0),this.blendSrc!==mp&&(r.blendSrc=this.blendSrc),this.blendDst!==gp&&(r.blendDst=this.blendDst),this.blendEquation!==la&&(r.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(r.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(r.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(r.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(r.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(r.blendAlpha=this.blendAlpha),this.depthFunc!==Do&&(r.depthFunc=this.depthFunc),this.depthTest===!1&&(r.depthTest=this.depthTest),this.depthWrite===!1&&(r.depthWrite=this.depthWrite),this.colorWrite===!1&&(r.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(r.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Yx&&(r.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(r.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(r.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Qa&&(r.stencilFail=this.stencilFail),this.stencilZFail!==Qa&&(r.stencilZFail=this.stencilZFail),this.stencilZPass!==Qa&&(r.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(r.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(r.rotation=this.rotation),this.polygonOffset===!0&&(r.polygonOffset=!0),this.polygonOffsetFactor!==0&&(r.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(r.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(r.linewidth=this.linewidth),this.dashSize!==void 0&&(r.dashSize=this.dashSize),this.gapSize!==void 0&&(r.gapSize=this.gapSize),this.scale!==void 0&&(r.scale=this.scale),this.dithering===!0&&(r.dithering=!0),this.alphaTest>0&&(r.alphaTest=this.alphaTest),this.alphaHash===!0&&(r.alphaHash=!0),this.alphaToCoverage===!0&&(r.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(r.premultipliedAlpha=!0),this.forceSinglePass===!0&&(r.forceSinglePass=!0),this.allowOverride===!1&&(r.allowOverride=!1),this.wireframe===!0&&(r.wireframe=!0),this.wireframeLinewidth>1&&(r.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(r.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(r.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(r.flatShading=!0),this.visible===!1&&(r.visible=!1),this.toneMapped===!1&&(r.toneMapped=!1),this.fog===!1&&(r.fog=!1),Object.keys(this.userData).length>0&&(r.userData=this.userData);function a(l){const c=[];for(const d in l){const h=l[d];delete h.metadata,c.push(h)}return c}if(t){const l=a(e.textures),c=a(e.images);l.length>0&&(r.textures=l),c.length>0&&(r.images=c)}return r}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new xt().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let r=e.normalScale;Array.isArray(r)===!1&&(r=[r,r]),this.normalScale=new dt().fromArray(r)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new dt().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let r=null;if(t!==null){const a=t.length;r=new Array(a);for(let l=0;l!==a;++l)r[l]=t[l].clone()}return this.clippingPlanes=r,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}const Ur=new te,If=new te,Eu=new te,ys=new te,Uf=new te,wu=new te,Ff=new te;class _d{constructor(e=new te,t=new te(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Ur)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const r=t.dot(this.direction);return r<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,r)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Ur.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Ur.copy(this.origin).addScaledVector(this.direction,t),Ur.distanceToSquared(e))}distanceSqToSegment(e,t,r,a){If.copy(e).add(t).multiplyScalar(.5),Eu.copy(t).sub(e).normalize(),ys.copy(this.origin).sub(If);const l=e.distanceTo(t)*.5,c=-this.direction.dot(Eu),d=ys.dot(this.direction),h=-ys.dot(Eu),f=ys.lengthSq(),m=Math.abs(1-c*c);let g,x,M,E;if(m>0)if(g=c*h-d,x=c*d-h,E=l*m,g>=0)if(x>=-E)if(x<=E){const w=1/m;g*=w,x*=w,M=g*(g+c*x+2*d)+x*(c*g+x+2*h)+f}else x=l,g=Math.max(0,-(c*x+d)),M=-g*g+x*(x+2*h)+f;else x=-l,g=Math.max(0,-(c*x+d)),M=-g*g+x*(x+2*h)+f;else x<=-E?(g=Math.max(0,-(-c*l+d)),x=g>0?-l:Math.min(Math.max(-l,-h),l),M=-g*g+x*(x+2*h)+f):x<=E?(g=0,x=Math.min(Math.max(-l,-h),l),M=x*(x+2*h)+f):(g=Math.max(0,-(c*l+d)),x=g>0?l:Math.min(Math.max(-l,-h),l),M=-g*g+x*(x+2*h)+f);else x=c>0?-l:l,g=Math.max(0,-(c*x+d)),M=-g*g+x*(x+2*h)+f;return r&&r.copy(this.origin).addScaledVector(this.direction,g),a&&a.copy(If).addScaledVector(Eu,x),M}intersectSphere(e,t){Ur.subVectors(e.center,this.origin);const r=Ur.dot(this.direction),a=Ur.dot(Ur)-r*r,l=e.radius*e.radius;if(a>l)return null;const c=Math.sqrt(l-a),d=r-c,h=r+c;return h<0?null:d<0?this.at(h,t):this.at(d,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const r=-(this.origin.dot(e.normal)+e.constant)/t;return r>=0?r:null}intersectPlane(e,t){const r=this.distanceToPlane(e);return r===null?null:this.at(r,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let r,a,l,c,d,h;const f=1/this.direction.x,m=1/this.direction.y,g=1/this.direction.z,x=this.origin;return f>=0?(r=(e.min.x-x.x)*f,a=(e.max.x-x.x)*f):(r=(e.max.x-x.x)*f,a=(e.min.x-x.x)*f),m>=0?(l=(e.min.y-x.y)*m,c=(e.max.y-x.y)*m):(l=(e.max.y-x.y)*m,c=(e.min.y-x.y)*m),r>c||l>a||((l>r||isNaN(r))&&(r=l),(c<a||isNaN(a))&&(a=c),g>=0?(d=(e.min.z-x.z)*g,h=(e.max.z-x.z)*g):(d=(e.max.z-x.z)*g,h=(e.min.z-x.z)*g),r>h||d>a)||((d>r||r!==r)&&(r=d),(h<a||a!==a)&&(a=h),a<0)?null:this.at(r>=0?r:a,t)}intersectsBox(e){return this.intersectBox(e,Ur)!==null}intersectTriangle(e,t,r,a,l){Uf.subVectors(t,e),wu.subVectors(r,e),Ff.crossVectors(Uf,wu);let c=this.direction.dot(Ff),d;if(c>0){if(a)return null;d=1}else if(c<0)d=-1,c=-c;else return null;ys.subVectors(this.origin,e);const h=d*this.direction.dot(wu.crossVectors(ys,wu));if(h<0)return null;const f=d*this.direction.dot(Uf.cross(ys));if(f<0||h+f>c)return null;const m=-d*ys.dot(Ff);return m<0?null:this.at(m/c,l)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class My extends yr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new xt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Kr,this.combine=Pm,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const dv=new an,sa=new _d,bu=new rc,hv=new te,Tu=new te,Cu=new te,Ru=new te,Of=new te,Au=new te,fv=new te,Pu=new te;class Zi extends En{constructor(e=new Mi,t=new My){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}getVertexPosition(e,t){const r=this.geometry,a=r.attributes.position,l=r.morphAttributes.position,c=r.morphTargetsRelative;t.fromBufferAttribute(a,e);const d=this.morphTargetInfluences;if(l&&d){Au.set(0,0,0);for(let h=0,f=l.length;h<f;h++){const m=d[h],g=l[h];m!==0&&(Of.fromBufferAttribute(g,e),c?Au.addScaledVector(Of,m):Au.addScaledVector(Of.sub(t),m))}t.add(Au)}return t}raycast(e,t){const r=this.geometry,a=this.material,l=this.matrixWorld;a!==void 0&&(r.boundingSphere===null&&r.computeBoundingSphere(),bu.copy(r.boundingSphere),bu.applyMatrix4(l),sa.copy(e.ray).recast(e.near),!(bu.containsPoint(sa.origin)===!1&&(sa.intersectSphere(bu,hv)===null||sa.origin.distanceToSquared(hv)>(e.far-e.near)**2))&&(dv.copy(l).invert(),sa.copy(e.ray).applyMatrix4(dv),!(r.boundingBox!==null&&sa.intersectsBox(r.boundingBox)===!1)&&this._computeIntersections(e,t,sa)))}_computeIntersections(e,t,r){let a;const l=this.geometry,c=this.material,d=l.index,h=l.attributes.position,f=l.attributes.uv,m=l.attributes.uv1,g=l.attributes.normal,x=l.groups,M=l.drawRange;if(d!==null)if(Array.isArray(c))for(let E=0,w=x.length;E<w;E++){const _=x[E],S=c[_.materialIndex],L=Math.max(_.start,M.start),N=Math.min(d.count,Math.min(_.start+_.count,M.start+M.count));for(let C=L,U=N;C<U;C+=3){const D=d.getX(C),k=d.getX(C+1),b=d.getX(C+2);a=Nu(this,S,e,r,f,m,g,D,k,b),a&&(a.faceIndex=Math.floor(C/3),a.face.materialIndex=_.materialIndex,t.push(a))}}else{const E=Math.max(0,M.start),w=Math.min(d.count,M.start+M.count);for(let _=E,S=w;_<S;_+=3){const L=d.getX(_),N=d.getX(_+1),C=d.getX(_+2);a=Nu(this,c,e,r,f,m,g,L,N,C),a&&(a.faceIndex=Math.floor(_/3),t.push(a))}}else if(h!==void 0)if(Array.isArray(c))for(let E=0,w=x.length;E<w;E++){const _=x[E],S=c[_.materialIndex],L=Math.max(_.start,M.start),N=Math.min(h.count,Math.min(_.start+_.count,M.start+M.count));for(let C=L,U=N;C<U;C+=3){const D=C,k=C+1,b=C+2;a=Nu(this,S,e,r,f,m,g,D,k,b),a&&(a.faceIndex=Math.floor(C/3),a.face.materialIndex=_.materialIndex,t.push(a))}}else{const E=Math.max(0,M.start),w=Math.min(h.count,M.start+M.count);for(let _=E,S=w;_<S;_+=3){const L=_,N=_+1,C=_+2;a=Nu(this,c,e,r,f,m,g,L,N,C),a&&(a.faceIndex=Math.floor(_/3),t.push(a))}}}}function Db(i,e,t,r,a,l,c,d){let h;if(e.side===hi?h=r.intersectTriangle(c,l,a,!0,d):h=r.intersectTriangle(a,l,c,e.side===Fs,d),h===null)return null;Pu.copy(d),Pu.applyMatrix4(i.matrixWorld);const f=t.ray.origin.distanceTo(Pu);return f<t.near||f>t.far?null:{distance:f,point:Pu.clone(),object:i}}function Nu(i,e,t,r,a,l,c,d,h,f){i.getVertexPosition(d,Tu),i.getVertexPosition(h,Cu),i.getVertexPosition(f,Ru);const m=Db(i,e,t,r,Tu,Cu,Ru,fv);if(m){const g=new te;Yi.getBarycoord(fv,Tu,Cu,Ru,g),a&&(m.uv=Yi.getInterpolatedAttribute(a,d,h,f,g,new dt)),l&&(m.uv1=Yi.getInterpolatedAttribute(l,d,h,f,g,new dt)),c&&(m.normal=Yi.getInterpolatedAttribute(c,d,h,f,g,new te),m.normal.dot(r.direction)>0&&m.normal.multiplyScalar(-1));const x={a:d,b:h,c:f,normal:new te,materialIndex:0};Yi.getNormal(Tu,Cu,Ru,x.normal),m.face=x,m.barycoord=g}return m}class Ib extends Xn{constructor(e=null,t=1,r=1,a,l,c,d,h,f=Fn,m=Fn,g,x){super(null,c,d,h,f,m,a,l,g,x),this.isDataTexture=!0,this.image={data:e,width:t,height:r},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const kf=new te,Ub=new te,Fb=new pt;class Es{constructor(e=new te(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,r,a){return this.normal.set(e,t,r),this.constant=a,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,r){const a=kf.subVectors(r,t).cross(Ub.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(a,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,r=!0){const a=e.delta(kf),l=this.normal.dot(a);if(l===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const c=-(e.start.dot(this.normal)+this.constant)/l;return r===!0&&(c<0||c>1)?null:t.copy(e.start).addScaledVector(a,c)}intersectsLine(e){const t=this.distanceToPoint(e.start),r=this.distanceToPoint(e.end);return t<0&&r>0||r<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const r=t||Fb.getNormalMatrix(e),a=this.coplanarPoint(kf).applyMatrix4(e),l=this.normal.applyMatrix3(r).normalize();return this.constant=-a.dot(l),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const aa=new rc,Ob=new dt(.5,.5),Lu=new te;class Hm{constructor(e=new Es,t=new Es,r=new Es,a=new Es,l=new Es,c=new Es){this.planes=[e,t,r,a,l,c]}set(e,t,r,a,l,c){const d=this.planes;return d[0].copy(e),d[1].copy(t),d[2].copy(r),d[3].copy(a),d[4].copy(l),d[5].copy(c),this}copy(e){const t=this.planes;for(let r=0;r<6;r++)t[r].copy(e.planes[r]);return this}setFromProjectionMatrix(e,t=mr,r=!1){const a=this.planes,l=e.elements,c=l[0],d=l[1],h=l[2],f=l[3],m=l[4],g=l[5],x=l[6],M=l[7],E=l[8],w=l[9],_=l[10],S=l[11],L=l[12],N=l[13],C=l[14],U=l[15];if(a[0].setComponents(f-c,M-m,S-E,U-L).normalize(),a[1].setComponents(f+c,M+m,S+E,U+L).normalize(),a[2].setComponents(f+d,M+g,S+w,U+N).normalize(),a[3].setComponents(f-d,M-g,S-w,U-N).normalize(),r)a[4].setComponents(h,x,_,C).normalize(),a[5].setComponents(f-h,M-x,S-_,U-C).normalize();else if(a[4].setComponents(f-h,M-x,S-_,U-C).normalize(),t===mr)a[5].setComponents(f+h,M+x,S+_,U+C).normalize();else if(t===ql)a[5].setComponents(h,x,_,C).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),aa.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),aa.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(aa)}intersectsSprite(e){aa.center.set(0,0,0);const t=Ob.distanceTo(e.center);return aa.radius=.7071067811865476+t,aa.applyMatrix4(e.matrixWorld),this.intersectsSphere(aa)}intersectsSphere(e){const t=this.planes,r=e.center,a=-e.radius;for(let l=0;l<6;l++)if(t[l].distanceToPoint(r)<a)return!1;return!0}intersectsBox(e){const t=this.planes;for(let r=0;r<6;r++){const a=t[r];if(Lu.x=a.normal.x>0?e.max.x:e.min.x,Lu.y=a.normal.y>0?e.max.y:e.min.y,Lu.z=a.normal.z>0?e.max.z:e.min.z,a.distanceToPoint(Lu)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let r=0;r<6;r++)if(t[r].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Ju extends yr{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new xt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const ud=new te,dd=new te,pv=new an,Ll=new _d,Du=new rc,zf=new te,mv=new te;class kb extends En{constructor(e=new Mi,t=new Ju){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,r=[0];for(let a=1,l=t.count;a<l;a++)ud.fromBufferAttribute(t,a-1),dd.fromBufferAttribute(t,a),r[a]=r[a-1],r[a]+=ud.distanceTo(dd);e.setAttribute("lineDistance",new In(r,1))}else lt("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const r=this.geometry,a=this.matrixWorld,l=e.params.Line.threshold,c=r.drawRange;if(r.boundingSphere===null&&r.computeBoundingSphere(),Du.copy(r.boundingSphere),Du.applyMatrix4(a),Du.radius+=l,e.ray.intersectsSphere(Du)===!1)return;pv.copy(a).invert(),Ll.copy(e.ray).applyMatrix4(pv);const d=l/((this.scale.x+this.scale.y+this.scale.z)/3),h=d*d,f=this.isLineSegments?2:1,m=r.index,x=r.attributes.position;if(m!==null){const M=Math.max(0,c.start),E=Math.min(m.count,c.start+c.count);for(let w=M,_=E-1;w<_;w+=f){const S=m.getX(w),L=m.getX(w+1),N=Iu(this,e,Ll,h,S,L,w);N&&t.push(N)}if(this.isLineLoop){const w=m.getX(E-1),_=m.getX(M),S=Iu(this,e,Ll,h,w,_,E-1);S&&t.push(S)}}else{const M=Math.max(0,c.start),E=Math.min(x.count,c.start+c.count);for(let w=M,_=E-1;w<_;w+=f){const S=Iu(this,e,Ll,h,w,w+1,w);S&&t.push(S)}if(this.isLineLoop){const w=Iu(this,e,Ll,h,E-1,M,E-1);w&&t.push(w)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}}function Iu(i,e,t,r,a,l,c){const d=i.geometry.attributes.position;if(ud.fromBufferAttribute(d,a),dd.fromBufferAttribute(d,l),t.distanceSqToSegment(ud,dd,zf,mv)>r)return;zf.applyMatrix4(i.matrixWorld);const f=e.ray.origin.distanceTo(zf);if(!(f<e.near||f>e.far))return{distance:f,point:mv.clone().applyMatrix4(i.matrixWorld),index:c,face:null,faceIndex:null,barycoord:null,object:i}}const gv=new te,xv=new te;class vv extends kb{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,r=[];for(let a=0,l=t.count;a<l;a+=2)gv.fromBufferAttribute(t,a),xv.fromBufferAttribute(t,a+1),r[a]=a===0?0:r[a-1],r[a+1]=r[a]+gv.distanceTo(xv);e.setAttribute("lineDistance",new In(r,1))}else lt("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class zl extends yr{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new xt(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const _v=new an,im=new _d,Uu=new rc,Fu=new te;class Bf extends En{constructor(e=new Mi,t=new zl){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const r=this.geometry,a=this.matrixWorld,l=e.params.Points.threshold,c=r.drawRange;if(r.boundingSphere===null&&r.computeBoundingSphere(),Uu.copy(r.boundingSphere),Uu.applyMatrix4(a),Uu.radius+=l,e.ray.intersectsSphere(Uu)===!1)return;_v.copy(a).invert(),im.copy(e.ray).applyMatrix4(_v);const d=l/((this.scale.x+this.scale.y+this.scale.z)/3),h=d*d,f=r.index,g=r.attributes.position;if(f!==null){const x=Math.max(0,c.start),M=Math.min(f.count,c.start+c.count);for(let E=x,w=M;E<w;E++){const _=f.getX(E);Fu.fromBufferAttribute(g,_),yv(Fu,_,h,a,e,t,this)}}else{const x=Math.max(0,c.start),M=Math.min(g.count,c.start+c.count);for(let E=x,w=M;E<w;E++)Fu.fromBufferAttribute(g,E),yv(Fu,E,h,a,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}}function yv(i,e,t,r,a,l,c){const d=im.distanceSqToPoint(i);if(d<t){const h=new te;im.closestPointToPoint(i,h),h.applyMatrix4(r);const f=a.ray.origin.distanceTo(h);if(f<a.near||f>a.far)return;l.push({distance:f,distanceToRay:Math.sqrt(d),point:h,index:e,face:null,faceIndex:null,barycoord:null,object:c})}}class Ey extends Xn{constructor(e=[],t=wa,r,a,l,c,d,h,f,m){super(e,t,r,a,l,c,d,h,f,m),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Uo extends Xn{constructor(e,t,r=_r,a,l,c,d=Fn,h=Fn,f,m=Yr,g=1){if(m!==Yr&&m!==ha)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const x={width:e,height:t,depth:g};super(x,a,l,c,d,h,m,r,f),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Bm(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class zb extends Uo{constructor(e,t=_r,r=wa,a,l,c=Fn,d=Fn,h,f=Yr){const m={width:e,height:e,depth:1},g=[m,m,m,m,m,m];super(e,e,t,r,a,l,c,d,h,f),this.image=g,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class wy extends Xn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class sc extends Mi{constructor(e=1,t=1,r=1,a=1,l=1,c=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:r,widthSegments:a,heightSegments:l,depthSegments:c};const d=this;a=Math.floor(a),l=Math.floor(l),c=Math.floor(c);const h=[],f=[],m=[],g=[];let x=0,M=0;E("z","y","x",-1,-1,r,t,e,c,l,0),E("z","y","x",1,-1,r,t,-e,c,l,1),E("x","z","y",1,1,e,r,t,a,c,2),E("x","z","y",1,-1,e,r,-t,a,c,3),E("x","y","z",1,-1,e,t,r,a,l,4),E("x","y","z",-1,-1,e,t,-r,a,l,5),this.setIndex(h),this.setAttribute("position",new In(f,3)),this.setAttribute("normal",new In(m,3)),this.setAttribute("uv",new In(g,2));function E(w,_,S,L,N,C,U,D,k,b,F){const B=C/k,G=U/b,Z=C/2,re=U/2,he=D/2,z=k+1,ae=b+1;let ee=0,q=0;const de=new te;for(let ce=0;ce<ae;ce++){const P=ce*G-re;for(let X=0;X<z;X++){const Le=X*B-Z;de[w]=Le*L,de[_]=P*N,de[S]=he,f.push(de.x,de.y,de.z),de[w]=0,de[_]=0,de[S]=D>0?1:-1,m.push(de.x,de.y,de.z),g.push(X/k),g.push(1-ce/b),ee+=1}}for(let ce=0;ce<b;ce++)for(let P=0;P<k;P++){const X=x+P+z*ce,Le=x+P+z*(ce+1),Be=x+(P+1)+z*(ce+1),Ge=x+(P+1)+z*ce;h.push(X,Le,Ge),h.push(Le,Be,Ge),q+=6}d.addGroup(M,q,F),M+=q,x+=ee}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new sc(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class yd extends Mi{constructor(e=1,t=1,r=1,a=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:r,heightSegments:a};const l=e/2,c=t/2,d=Math.floor(r),h=Math.floor(a),f=d+1,m=h+1,g=e/d,x=t/h,M=[],E=[],w=[],_=[];for(let S=0;S<m;S++){const L=S*x-c;for(let N=0;N<f;N++){const C=N*g-l;E.push(C,-L,0),w.push(0,0,1),_.push(N/d),_.push(1-S/h)}}for(let S=0;S<h;S++)for(let L=0;L<d;L++){const N=L+f*S,C=L+f*(S+1),U=L+1+f*(S+1),D=L+1+f*S;M.push(N,C,D),M.push(C,U,D)}this.setIndex(M),this.setAttribute("position",new In(E,3)),this.setAttribute("normal",new In(w,3)),this.setAttribute("uv",new In(_,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new yd(e.width,e.height,e.widthSegments,e.heightSegments)}}function Fo(i){const e={};for(const t in i){e[t]={};for(const r in i[t]){const a=i[t][r];if(Sv(a))a.isRenderTargetTexture?(lt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][r]=null):e[t][r]=a.clone();else if(Array.isArray(a))if(Sv(a[0])){const l=[];for(let c=0,d=a.length;c<d;c++)l[c]=a[c].clone();e[t][r]=l}else e[t][r]=a.slice();else e[t][r]=a}}return e}function Kn(i){const e={};for(let t=0;t<i.length;t++){const r=Fo(i[t]);for(const a in r)e[a]=r[a]}return e}function Sv(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function Bb(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function by(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:Pt.workingColorSpace}const Hb={clone:Fo,merge:Kn};var Vb=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Gb=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Sr extends yr{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Vb,this.fragmentShader=Gb,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Fo(e.uniforms),this.uniformsGroups=Bb(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const a in this.uniforms){const c=this.uniforms[a].value;c&&c.isTexture?t.uniforms[a]={type:"t",value:c.toJSON(e).uuid}:c&&c.isColor?t.uniforms[a]={type:"c",value:c.getHex()}:c&&c.isVector2?t.uniforms[a]={type:"v2",value:c.toArray()}:c&&c.isVector3?t.uniforms[a]={type:"v3",value:c.toArray()}:c&&c.isVector4?t.uniforms[a]={type:"v4",value:c.toArray()}:c&&c.isMatrix3?t.uniforms[a]={type:"m3",value:c.toArray()}:c&&c.isMatrix4?t.uniforms[a]={type:"m4",value:c.toArray()}:t.uniforms[a]={value:c}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const r={};for(const a in this.extensions)this.extensions[a]===!0&&(r[a]=!0);return Object.keys(r).length>0&&(t.extensions=r),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(const r in e.uniforms){const a=e.uniforms[r];switch(this.uniforms[r]={},a.type){case"t":this.uniforms[r].value=t[a.value]||null;break;case"c":this.uniforms[r].value=new xt().setHex(a.value);break;case"v2":this.uniforms[r].value=new dt().fromArray(a.value);break;case"v3":this.uniforms[r].value=new te().fromArray(a.value);break;case"v4":this.uniforms[r].value=new un().fromArray(a.value);break;case"m3":this.uniforms[r].value=new pt().fromArray(a.value);break;case"m4":this.uniforms[r].value=new an().fromArray(a.value);break;default:this.uniforms[r].value=a.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(const r in e.extensions)this.extensions[r]=e.extensions[r];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}}class jb extends Sr{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class Hf extends yr{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new xt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new xt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=od,this.normalScale=new dt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Kr,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Wb extends yr{constructor(e){super(),this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new xt(16777215),this.specular=new xt(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new xt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=od,this.normalScale=new dt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Kr,this.combine=Pm,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.specular.copy(e.specular),this.shininess=e.shininess,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Xb extends yr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=tb,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class $b extends yr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const Hl={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(Mv(i)||(this.files[i]=e))},get:function(i){if(this.enabled!==!1&&!Mv(i))return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};function Mv(i){try{const e=i.slice(i.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}class qb{constructor(e,t,r){const a=this;let l=!1,c=0,d=0,h;const f=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=r,this._abortController=null,this.itemStart=function(m){d++,l===!1&&a.onStart!==void 0&&a.onStart(m,c,d),l=!0},this.itemEnd=function(m){c++,a.onProgress!==void 0&&a.onProgress(m,c,d),c===d&&(l=!1,a.onLoad!==void 0&&a.onLoad())},this.itemError=function(m){a.onError!==void 0&&a.onError(m)},this.resolveURL=function(m){return m=m.normalize("NFC"),h?h(m):m},this.setURLModifier=function(m){return h=m,this},this.addHandler=function(m,g){return f.push(m,g),this},this.removeHandler=function(m){const g=f.indexOf(m);return g!==-1&&f.splice(g,2),this},this.getHandler=function(m){for(let g=0,x=f.length;g<x;g+=2){const M=f[g],E=f[g+1];if(M.global&&(M.lastIndex=0),M.test(m))return E}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const Yb=new qb;class ac{constructor(e){this.manager=e!==void 0?e:Yb,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){const r=this;return new Promise(function(a,l){r.load(e,a,t,l)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}ac.DEFAULT_MATERIAL_NAME="__DEFAULT";const Fr={};class Kb extends Error{constructor(e,t){super(e),this.response=t}}class Qb extends ac{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,r,a){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const l=Hl.get(`file:${e}`);if(l!==void 0){this.manager.itemStart(e),setTimeout(()=>{t&&t(l),this.manager.itemEnd(e)},0);return}if(Fr[e]!==void 0){Fr[e].push({onLoad:t,onProgress:r,onError:a});return}Fr[e]=[],Fr[e].push({onLoad:t,onProgress:r,onError:a});const c=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),d=this.mimeType,h=this.responseType;fetch(c).then(f=>{if(f.status===200||f.status===0){if(f.status===0&&lt("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||f.body===void 0||f.body.getReader===void 0)return f;const m=Fr[e],g=f.body.getReader(),x=f.headers.get("X-File-Size")||f.headers.get("Content-Length"),M=x?parseInt(x):0,E=M!==0;let w=0;const _=new ReadableStream({start(S){L();function L(){g.read().then(({done:N,value:C})=>{if(N)S.close();else{w+=C.byteLength;const U=new ProgressEvent("progress",{lengthComputable:E,loaded:w,total:M});for(let D=0,k=m.length;D<k;D++){const b=m[D];b.onProgress&&b.onProgress(U)}S.enqueue(C),L()}},N=>{S.error(N)})}}});return new Response(_)}else throw new Kb(`fetch for "${f.url}" responded with ${f.status}: ${f.statusText}`,f)}).then(f=>{switch(h){case"arraybuffer":return f.arrayBuffer();case"blob":return f.blob();case"document":return f.text().then(m=>new DOMParser().parseFromString(m,d));case"json":return f.json();default:if(d==="")return f.text();{const g=/charset="?([^;"\s]*)"?/i.exec(d),x=g&&g[1]?g[1].toLowerCase():void 0,M=new TextDecoder(x);return f.arrayBuffer().then(E=>M.decode(E))}}}).then(f=>{Hl.add(`file:${e}`,f);const m=Fr[e];delete Fr[e];for(let g=0,x=m.length;g<x;g++){const M=m[g];M.onLoad&&M.onLoad(f)}}).catch(f=>{const m=Fr[e];if(m===void 0)throw this.manager.itemError(e),f;delete Fr[e];for(let g=0,x=m.length;g<x;g++){const M=m[g];M.onError&&M.onError(f)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const lo=new WeakMap;class Zb extends ac{constructor(e){super(e)}load(e,t,r,a){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const l=this,c=Hl.get(`image:${e}`);if(c!==void 0){if(c.complete===!0)l.manager.itemStart(e),setTimeout(function(){t&&t(c),l.manager.itemEnd(e)},0);else{let g=lo.get(c);g===void 0&&(g=[],lo.set(c,g)),g.push({onLoad:t,onError:a})}return c}const d=Yl("img");function h(){m(),t&&t(this);const g=lo.get(this)||[];for(let x=0;x<g.length;x++){const M=g[x];M.onLoad&&M.onLoad(this)}lo.delete(this),l.manager.itemEnd(e)}function f(g){m(),a&&a(g),Hl.remove(`image:${e}`);const x=lo.get(this)||[];for(let M=0;M<x.length;M++){const E=x[M];E.onError&&E.onError(g)}lo.delete(this),l.manager.itemError(e),l.manager.itemEnd(e)}function m(){d.removeEventListener("load",h,!1),d.removeEventListener("error",f,!1)}return d.addEventListener("load",h,!1),d.addEventListener("error",f,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(d.crossOrigin=this.crossOrigin),Hl.add(`image:${e}`,d),l.manager.itemStart(e),d.src=e,d}}class Jb extends ac{constructor(e){super(e)}load(e,t,r,a){const l=new Xn,c=new Zb(this.manager);return c.setCrossOrigin(this.crossOrigin),c.setPath(this.path),c.load(e,function(d){l.image=d,l.needsUpdate=!0,t!==void 0&&t(l)},r,a),l}}class Vm extends En{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new xt(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}class eT extends Vm{constructor(e,t,r){super(e,r),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(En.DEFAULT_UP),this.updateMatrix(),this.groundColor=new xt(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){const t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}}const Vf=new an,Ev=new te,wv=new te;class tT{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new dt(512,512),this.mapType=Si,this.map=null,this.mapPass=null,this.matrix=new an,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Hm,this._frameExtents=new dt(1,1),this._viewportCount=1,this._viewports=[new un(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,r=this.matrix;Ev.setFromMatrixPosition(e.matrixWorld),t.position.copy(Ev),wv.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(wv),t.updateMatrixWorld(),Vf.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Vf,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===ql||t.reversedDepth?r.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):r.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),r.multiply(Vf)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Ou=new te,ku=new Os,ar=new te;class Ty extends En{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new an,this.projectionMatrix=new an,this.projectionMatrixInverse=new an,this.coordinateSystem=mr,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Ou,ku,ar),ar.x===1&&ar.y===1&&ar.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ou,ku,ar.set(1,1,1)).invert()}updateWorldMatrix(e,t,r=!1){super.updateWorldMatrix(e,t,r),this.matrixWorld.decompose(Ou,ku,ar),ar.x===1&&ar.y===1&&ar.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ou,ku,ar.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const Ss=new te,bv=new dt,Tv=new dt;class Ii extends Ty{constructor(e=50,t=1,r=.1,a=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=r,this.far=a,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=nm*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Zu*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return nm*2*Math.atan(Math.tan(Zu*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,r){Ss.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Ss.x,Ss.y).multiplyScalar(-e/Ss.z),Ss.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),r.set(Ss.x,Ss.y).multiplyScalar(-e/Ss.z)}getViewSize(e,t){return this.getViewBounds(e,bv,Tv),t.subVectors(Tv,bv)}setViewOffset(e,t,r,a,l,c){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=r,this.view.offsetY=a,this.view.width=l,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Zu*.5*this.fov)/this.zoom,r=2*t,a=this.aspect*r,l=-.5*a;const c=this.view;if(this.view!==null&&this.view.enabled){const h=c.fullWidth,f=c.fullHeight;l+=c.offsetX*a/h,t-=c.offsetY*r/f,a*=c.width/h,r*=c.height/f}const d=this.filmOffset;d!==0&&(l+=e*d/this.getFilmWidth()),this.projectionMatrix.makePerspective(l,l+a,t,t-r,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class Gm extends Ty{constructor(e=-1,t=1,r=1,a=-1,l=.1,c=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=r,this.bottom=a,this.near=l,this.far=c,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,r,a,l,c){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=r,this.view.offsetY=a,this.view.width=l,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),r=(this.right+this.left)/2,a=(this.top+this.bottom)/2;let l=r-e,c=r+e,d=a+t,h=a-t;if(this.view!==null&&this.view.enabled){const f=(this.right-this.left)/this.view.fullWidth/this.zoom,m=(this.top-this.bottom)/this.view.fullHeight/this.zoom;l+=f*this.view.offsetX,c=l+f*this.view.width,d-=m*this.view.offsetY,h=d-m*this.view.height}this.projectionMatrix.makeOrthographic(l,c,d,h,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class nT extends tT{constructor(){super(new Gm(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Gf extends Vm{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(En.DEFAULT_UP),this.updateMatrix(),this.target=new En,this.shadow=new nT}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}class iT extends Vm{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}const co=-90,uo=1;class rT extends En{constructor(e,t,r){super(),this.type="CubeCamera",this.renderTarget=r,this.coordinateSystem=null,this.activeMipmapLevel=0;const a=new Ii(co,uo,e,t);a.layers=this.layers,this.add(a);const l=new Ii(co,uo,e,t);l.layers=this.layers,this.add(l);const c=new Ii(co,uo,e,t);c.layers=this.layers,this.add(c);const d=new Ii(co,uo,e,t);d.layers=this.layers,this.add(d);const h=new Ii(co,uo,e,t);h.layers=this.layers,this.add(h);const f=new Ii(co,uo,e,t);f.layers=this.layers,this.add(f)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[r,a,l,c,d,h]=t;for(const f of t)this.remove(f);if(e===mr)r.up.set(0,1,0),r.lookAt(1,0,0),a.up.set(0,1,0),a.lookAt(-1,0,0),l.up.set(0,0,-1),l.lookAt(0,1,0),c.up.set(0,0,1),c.lookAt(0,-1,0),d.up.set(0,1,0),d.lookAt(0,0,1),h.up.set(0,1,0),h.lookAt(0,0,-1);else if(e===ql)r.up.set(0,-1,0),r.lookAt(-1,0,0),a.up.set(0,-1,0),a.lookAt(1,0,0),l.up.set(0,0,1),l.lookAt(0,1,0),c.up.set(0,0,-1),c.lookAt(0,-1,0),d.up.set(0,-1,0),d.lookAt(0,0,1),h.up.set(0,-1,0),h.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const f of t)this.add(f),f.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:r,activeMipmapLevel:a}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[l,c,d,h,f,m]=this.children,g=e.getRenderTarget(),x=e.getActiveCubeFace(),M=e.getActiveMipmapLevel(),E=e.xr.enabled;e.xr.enabled=!1;const w=r.texture.generateMipmaps;r.texture.generateMipmaps=!1;let _=!1;e.isWebGLRenderer===!0?_=e.state.buffers.depth.getReversed():_=e.reversedDepthBuffer,e.setRenderTarget(r,0,a),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(r,1,a),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(r,2,a),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,d),e.setRenderTarget(r,3,a),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(r,4,a),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,f),r.texture.generateMipmaps=w,e.setRenderTarget(r,5,a),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,m),e.setRenderTarget(g,x,M),e.xr.enabled=E,r.texture.needsPMREMUpdate=!0}}class sT extends Ii{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class Cv{constructor(e=1,t=0,r=0){this.radius=e,this.phi=t,this.theta=r}set(e,t,r){return this.radius=e,this.phi=t,this.theta=r,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=bt(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,r){return this.radius=Math.sqrt(e*e+t*t+r*r),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,r),this.phi=Math.acos(bt(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}const Ym=class Ym{constructor(e,t,r,a){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,r,a)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let r=0;r<4;r++)this.elements[r]=e[r+t];return this}set(e,t,r,a){const l=this.elements;return l[0]=e,l[2]=t,l[1]=r,l[3]=a,this}};Ym.prototype.isMatrix2=!0;let Rv=Ym;class aT extends ks{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){if(e===void 0){lt("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}}function Av(i,e,t,r){const a=oT(r);switch(t){case fy:return i*e;case my:return i*e/a.components*a.byteLength;case Um:return i*e/a.components*a.byteLength;case ba:return i*e*2/a.components*a.byteLength;case Fm:return i*e*2/a.components*a.byteLength;case py:return i*e*3/a.components*a.byteLength;case Ki:return i*e*4/a.components*a.byteLength;case Om:return i*e*4/a.components*a.byteLength;case qu:case Yu:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Ku:case Qu:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Cp:case Ap:return Math.max(i,16)*Math.max(e,8)/4;case Tp:case Rp:return Math.max(i,8)*Math.max(e,8)/2;case Pp:case Np:case Dp:case Ip:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Lp:case sd:case Up:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Fp:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Op:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case kp:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case zp:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case Bp:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case Hp:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case Vp:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case Gp:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case jp:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case Wp:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case Xp:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case $p:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case qp:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case Yp:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case Kp:case Qp:case Zp:return Math.ceil(i/4)*Math.ceil(e/4)*16;case Jp:case em:return Math.ceil(i/4)*Math.ceil(e/4)*8;case ad:case tm:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function oT(i){switch(i){case Si:case cy:return{byteLength:1,components:1};case Xl:case uy:case qr:return{byteLength:2,components:1};case Dm:case Im:return{byteLength:2,components:4};case _r:case Lm:case pr:return{byteLength:4,components:1};case dy:case hy:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Am}}));typeof window<"u"&&(window.__THREE__?lt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Am);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Cy(){let i=null,e=!1,t=null,r=null;function a(l,c){t(l,c),r=i.requestAnimationFrame(a)}return{start:function(){e!==!0&&t!==null&&i!==null&&(r=i.requestAnimationFrame(a),e=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(r),e=!1},setAnimationLoop:function(l){t=l},setContext:function(l){i=l}}}function lT(i){const e=new WeakMap;function t(d,h){const f=d.array,m=d.usage,g=f.byteLength,x=i.createBuffer();i.bindBuffer(h,x),i.bufferData(h,f,m),d.onUploadCallback();let M;if(f instanceof Float32Array)M=i.FLOAT;else if(typeof Float16Array<"u"&&f instanceof Float16Array)M=i.HALF_FLOAT;else if(f instanceof Uint16Array)d.isFloat16BufferAttribute?M=i.HALF_FLOAT:M=i.UNSIGNED_SHORT;else if(f instanceof Int16Array)M=i.SHORT;else if(f instanceof Uint32Array)M=i.UNSIGNED_INT;else if(f instanceof Int32Array)M=i.INT;else if(f instanceof Int8Array)M=i.BYTE;else if(f instanceof Uint8Array)M=i.UNSIGNED_BYTE;else if(f instanceof Uint8ClampedArray)M=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+f);return{buffer:x,type:M,bytesPerElement:f.BYTES_PER_ELEMENT,version:d.version,size:g}}function r(d,h,f){const m=h.array,g=h.updateRanges;if(i.bindBuffer(f,d),g.length===0)i.bufferSubData(f,0,m);else{g.sort((M,E)=>M.start-E.start);let x=0;for(let M=1;M<g.length;M++){const E=g[x],w=g[M];w.start<=E.start+E.count+1?E.count=Math.max(E.count,w.start+w.count-E.start):(++x,g[x]=w)}g.length=x+1;for(let M=0,E=g.length;M<E;M++){const w=g[M];i.bufferSubData(f,w.start*m.BYTES_PER_ELEMENT,m,w.start,w.count)}h.clearUpdateRanges()}h.onUploadCallback()}function a(d){return d.isInterleavedBufferAttribute&&(d=d.data),e.get(d)}function l(d){d.isInterleavedBufferAttribute&&(d=d.data);const h=e.get(d);h&&(i.deleteBuffer(h.buffer),e.delete(d))}function c(d,h){if(d.isInterleavedBufferAttribute&&(d=d.data),d.isGLBufferAttribute){const m=e.get(d);(!m||m.version<d.version)&&e.set(d,{buffer:d.buffer,type:d.type,bytesPerElement:d.elementSize,version:d.version});return}const f=e.get(d);if(f===void 0)e.set(d,t(d,h));else if(f.version<d.version){if(f.size!==d.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");r(f.buffer,d,h),f.version=d.version}}return{get:a,remove:l,update:c}}var cT=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,uT=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,dT=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,hT=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,fT=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,pT=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,mT=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,gT=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,xT=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,vT=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,_T=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,yT=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,ST=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,MT=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,ET=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,wT=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,bT=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,TT=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,CT=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,RT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,AT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,PT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,NT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,LT=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,DT=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,IT=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,UT=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,FT=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,OT=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,kT=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,zT="gl_FragColor = linearToOutputTexel( gl_FragColor );",BT=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,HT=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,VT=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,GT=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,jT=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,WT=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,XT=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,$T=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,qT=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,YT=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,KT=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,QT=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,ZT=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,JT=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,eC=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,tC=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,nC=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,iC=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,rC=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,sC=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,aC=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,oC=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lC=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,cC=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,uC=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,dC=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,hC=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,fC=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,pC=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,mC=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,gC=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,xC=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,vC=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,_C=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,yC=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,SC=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,MC=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,EC=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,wC=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,bC=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,TC=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,CC=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,RC=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,AC=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,PC=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,NC=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,LC=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,DC=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,IC=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,UC=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,FC=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,OC=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,kC=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,zC=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,BC=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,HC=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,VC=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,GC=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,jC=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,WC=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,XC=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,$C=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,qC=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,YC=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,KC=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,QC=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,ZC=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,JC=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,eR=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tR=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,nR=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,iR=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,rR=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,sR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,aR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,oR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,lR=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const cR=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,uR=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,dR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,hR=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,fR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,pR=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,mR=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,gR=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,xR=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,vR=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,_R=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,yR=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,SR=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,MR=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,ER=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,wR=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,bR=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,TR=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,CR=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,RR=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,AR=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,PR=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,NR=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,LR=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,DR=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,IR=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,UR=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,FR=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,OR=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,kR=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,zR=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,BR=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,HR=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,VR=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,_t={alphahash_fragment:cT,alphahash_pars_fragment:uT,alphamap_fragment:dT,alphamap_pars_fragment:hT,alphatest_fragment:fT,alphatest_pars_fragment:pT,aomap_fragment:mT,aomap_pars_fragment:gT,batching_pars_vertex:xT,batching_vertex:vT,begin_vertex:_T,beginnormal_vertex:yT,bsdfs:ST,iridescence_fragment:MT,bumpmap_pars_fragment:ET,clipping_planes_fragment:wT,clipping_planes_pars_fragment:bT,clipping_planes_pars_vertex:TT,clipping_planes_vertex:CT,color_fragment:RT,color_pars_fragment:AT,color_pars_vertex:PT,color_vertex:NT,common:LT,cube_uv_reflection_fragment:DT,defaultnormal_vertex:IT,displacementmap_pars_vertex:UT,displacementmap_vertex:FT,emissivemap_fragment:OT,emissivemap_pars_fragment:kT,colorspace_fragment:zT,colorspace_pars_fragment:BT,envmap_fragment:HT,envmap_common_pars_fragment:VT,envmap_pars_fragment:GT,envmap_pars_vertex:jT,envmap_physical_pars_fragment:tC,envmap_vertex:WT,fog_vertex:XT,fog_pars_vertex:$T,fog_fragment:qT,fog_pars_fragment:YT,gradientmap_pars_fragment:KT,lightmap_pars_fragment:QT,lights_lambert_fragment:ZT,lights_lambert_pars_fragment:JT,lights_pars_begin:eC,lights_toon_fragment:nC,lights_toon_pars_fragment:iC,lights_phong_fragment:rC,lights_phong_pars_fragment:sC,lights_physical_fragment:aC,lights_physical_pars_fragment:oC,lights_fragment_begin:lC,lights_fragment_maps:cC,lights_fragment_end:uC,lightprobes_pars_fragment:dC,logdepthbuf_fragment:hC,logdepthbuf_pars_fragment:fC,logdepthbuf_pars_vertex:pC,logdepthbuf_vertex:mC,map_fragment:gC,map_pars_fragment:xC,map_particle_fragment:vC,map_particle_pars_fragment:_C,metalnessmap_fragment:yC,metalnessmap_pars_fragment:SC,morphinstance_vertex:MC,morphcolor_vertex:EC,morphnormal_vertex:wC,morphtarget_pars_vertex:bC,morphtarget_vertex:TC,normal_fragment_begin:CC,normal_fragment_maps:RC,normal_pars_fragment:AC,normal_pars_vertex:PC,normal_vertex:NC,normalmap_pars_fragment:LC,clearcoat_normal_fragment_begin:DC,clearcoat_normal_fragment_maps:IC,clearcoat_pars_fragment:UC,iridescence_pars_fragment:FC,opaque_fragment:OC,packing:kC,premultiplied_alpha_fragment:zC,project_vertex:BC,dithering_fragment:HC,dithering_pars_fragment:VC,roughnessmap_fragment:GC,roughnessmap_pars_fragment:jC,shadowmap_pars_fragment:WC,shadowmap_pars_vertex:XC,shadowmap_vertex:$C,shadowmask_pars_fragment:qC,skinbase_vertex:YC,skinning_pars_vertex:KC,skinning_vertex:QC,skinnormal_vertex:ZC,specularmap_fragment:JC,specularmap_pars_fragment:eR,tonemapping_fragment:tR,tonemapping_pars_fragment:nR,transmission_fragment:iR,transmission_pars_fragment:rR,uv_pars_fragment:sR,uv_pars_vertex:aR,uv_vertex:oR,worldpos_vertex:lR,background_vert:cR,background_frag:uR,backgroundCube_vert:dR,backgroundCube_frag:hR,cube_vert:fR,cube_frag:pR,depth_vert:mR,depth_frag:gR,distance_vert:xR,distance_frag:vR,equirect_vert:_R,equirect_frag:yR,linedashed_vert:SR,linedashed_frag:MR,meshbasic_vert:ER,meshbasic_frag:wR,meshlambert_vert:bR,meshlambert_frag:TR,meshmatcap_vert:CR,meshmatcap_frag:RR,meshnormal_vert:AR,meshnormal_frag:PR,meshphong_vert:NR,meshphong_frag:LR,meshphysical_vert:DR,meshphysical_frag:IR,meshtoon_vert:UR,meshtoon_frag:FR,points_vert:OR,points_frag:kR,shadow_vert:zR,shadow_frag:BR,sprite_vert:HR,sprite_frag:VR},ke={common:{diffuse:{value:new xt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new pt},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new pt}},envmap:{envMap:{value:null},envMapRotation:{value:new pt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new pt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new pt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new pt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new pt},normalScale:{value:new dt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new pt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new pt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new pt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new pt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new xt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new te},probesMax:{value:new te},probesResolution:{value:new te}},points:{diffuse:{value:new xt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0},uvTransform:{value:new pt}},sprite:{diffuse:{value:new xt(16777215)},opacity:{value:1},center:{value:new dt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new pt},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0}}},hr={basic:{uniforms:Kn([ke.common,ke.specularmap,ke.envmap,ke.aomap,ke.lightmap,ke.fog]),vertexShader:_t.meshbasic_vert,fragmentShader:_t.meshbasic_frag},lambert:{uniforms:Kn([ke.common,ke.specularmap,ke.envmap,ke.aomap,ke.lightmap,ke.emissivemap,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.fog,ke.lights,{emissive:{value:new xt(0)},envMapIntensity:{value:1}}]),vertexShader:_t.meshlambert_vert,fragmentShader:_t.meshlambert_frag},phong:{uniforms:Kn([ke.common,ke.specularmap,ke.envmap,ke.aomap,ke.lightmap,ke.emissivemap,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.fog,ke.lights,{emissive:{value:new xt(0)},specular:{value:new xt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:_t.meshphong_vert,fragmentShader:_t.meshphong_frag},standard:{uniforms:Kn([ke.common,ke.envmap,ke.aomap,ke.lightmap,ke.emissivemap,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.roughnessmap,ke.metalnessmap,ke.fog,ke.lights,{emissive:{value:new xt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:_t.meshphysical_vert,fragmentShader:_t.meshphysical_frag},toon:{uniforms:Kn([ke.common,ke.aomap,ke.lightmap,ke.emissivemap,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.gradientmap,ke.fog,ke.lights,{emissive:{value:new xt(0)}}]),vertexShader:_t.meshtoon_vert,fragmentShader:_t.meshtoon_frag},matcap:{uniforms:Kn([ke.common,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.fog,{matcap:{value:null}}]),vertexShader:_t.meshmatcap_vert,fragmentShader:_t.meshmatcap_frag},points:{uniforms:Kn([ke.points,ke.fog]),vertexShader:_t.points_vert,fragmentShader:_t.points_frag},dashed:{uniforms:Kn([ke.common,ke.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:_t.linedashed_vert,fragmentShader:_t.linedashed_frag},depth:{uniforms:Kn([ke.common,ke.displacementmap]),vertexShader:_t.depth_vert,fragmentShader:_t.depth_frag},normal:{uniforms:Kn([ke.common,ke.bumpmap,ke.normalmap,ke.displacementmap,{opacity:{value:1}}]),vertexShader:_t.meshnormal_vert,fragmentShader:_t.meshnormal_frag},sprite:{uniforms:Kn([ke.sprite,ke.fog]),vertexShader:_t.sprite_vert,fragmentShader:_t.sprite_frag},background:{uniforms:{uvTransform:{value:new pt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:_t.background_vert,fragmentShader:_t.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new pt}},vertexShader:_t.backgroundCube_vert,fragmentShader:_t.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:_t.cube_vert,fragmentShader:_t.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:_t.equirect_vert,fragmentShader:_t.equirect_frag},distance:{uniforms:Kn([ke.common,ke.displacementmap,{referencePosition:{value:new te},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:_t.distance_vert,fragmentShader:_t.distance_frag},shadow:{uniforms:Kn([ke.lights,ke.fog,{color:{value:new xt(0)},opacity:{value:1}}]),vertexShader:_t.shadow_vert,fragmentShader:_t.shadow_frag}};hr.physical={uniforms:Kn([hr.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new pt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new pt},clearcoatNormalScale:{value:new dt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new pt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new pt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new pt},sheen:{value:0},sheenColor:{value:new xt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new pt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new pt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new pt},transmissionSamplerSize:{value:new dt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new pt},attenuationDistance:{value:0},attenuationColor:{value:new xt(0)},specularColor:{value:new xt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new pt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new pt},anisotropyVector:{value:new dt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new pt}}]),vertexShader:_t.meshphysical_vert,fragmentShader:_t.meshphysical_frag};const zu={r:0,b:0,g:0},GR=new an,Ry=new pt;Ry.set(-1,0,0,0,1,0,0,0,1);function jR(i,e,t,r,a,l){const c=new xt(0);let d=a===!0?0:1,h,f,m=null,g=0,x=null;function M(L){let N=L.isScene===!0?L.background:null;if(N&&N.isTexture){const C=L.backgroundBlurriness>0;N=e.get(N,C)}return N}function E(L){let N=!1;const C=M(L);C===null?_(c,d):C&&C.isColor&&(_(C,1),N=!0);const U=i.xr.getEnvironmentBlendMode();U==="additive"?t.buffers.color.setClear(0,0,0,1,l):U==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,l),(i.autoClear||N)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function w(L,N){const C=M(N);C&&(C.isCubeTexture||C.mapping===vd)?(f===void 0&&(f=new Zi(new sc(1,1,1),new Sr({name:"BackgroundCubeMaterial",uniforms:Fo(hr.backgroundCube.uniforms),vertexShader:hr.backgroundCube.vertexShader,fragmentShader:hr.backgroundCube.fragmentShader,side:hi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),f.geometry.deleteAttribute("normal"),f.geometry.deleteAttribute("uv"),f.onBeforeRender=function(U,D,k){this.matrixWorld.copyPosition(k.matrixWorld)},Object.defineProperty(f.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(f)),f.material.uniforms.envMap.value=C,f.material.uniforms.backgroundBlurriness.value=N.backgroundBlurriness,f.material.uniforms.backgroundIntensity.value=N.backgroundIntensity,f.material.uniforms.backgroundRotation.value.setFromMatrix4(GR.makeRotationFromEuler(N.backgroundRotation)).transpose(),C.isCubeTexture&&C.isRenderTargetTexture===!1&&f.material.uniforms.backgroundRotation.value.premultiply(Ry),f.material.toneMapped=Pt.getTransfer(C.colorSpace)!==Vt,(m!==C||g!==C.version||x!==i.toneMapping)&&(f.material.needsUpdate=!0,m=C,g=C.version,x=i.toneMapping),f.layers.enableAll(),L.unshift(f,f.geometry,f.material,0,0,null)):C&&C.isTexture&&(h===void 0&&(h=new Zi(new yd(2,2),new Sr({name:"BackgroundMaterial",uniforms:Fo(hr.background.uniforms),vertexShader:hr.background.vertexShader,fragmentShader:hr.background.fragmentShader,side:Fs,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),Object.defineProperty(h.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(h)),h.material.uniforms.t2D.value=C,h.material.uniforms.backgroundIntensity.value=N.backgroundIntensity,h.material.toneMapped=Pt.getTransfer(C.colorSpace)!==Vt,C.matrixAutoUpdate===!0&&C.updateMatrix(),h.material.uniforms.uvTransform.value.copy(C.matrix),(m!==C||g!==C.version||x!==i.toneMapping)&&(h.material.needsUpdate=!0,m=C,g=C.version,x=i.toneMapping),h.layers.enableAll(),L.unshift(h,h.geometry,h.material,0,0,null))}function _(L,N){L.getRGB(zu,by(i)),t.buffers.color.setClear(zu.r,zu.g,zu.b,N,l)}function S(){f!==void 0&&(f.geometry.dispose(),f.material.dispose(),f=void 0),h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0)}return{getClearColor:function(){return c},setClearColor:function(L,N=1){c.set(L),d=N,_(c,d)},getClearAlpha:function(){return d},setClearAlpha:function(L){d=L,_(c,d)},render:E,addToRenderList:w,dispose:S}}function WR(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),r={},a=x(null);let l=a,c=!1;function d(G,Z,re,he,z){let ae=!1;const ee=g(G,he,re,Z);l!==ee&&(l=ee,f(l.object)),ae=M(G,he,re,z),ae&&E(G,he,re,z),z!==null&&e.update(z,i.ELEMENT_ARRAY_BUFFER),(ae||c)&&(c=!1,C(G,Z,re,he),z!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(z).buffer))}function h(){return i.createVertexArray()}function f(G){return i.bindVertexArray(G)}function m(G){return i.deleteVertexArray(G)}function g(G,Z,re,he){const z=he.wireframe===!0;let ae=r[Z.id];ae===void 0&&(ae={},r[Z.id]=ae);const ee=G.isInstancedMesh===!0?G.id:0;let q=ae[ee];q===void 0&&(q={},ae[ee]=q);let de=q[re.id];de===void 0&&(de={},q[re.id]=de);let ce=de[z];return ce===void 0&&(ce=x(h()),de[z]=ce),ce}function x(G){const Z=[],re=[],he=[];for(let z=0;z<t;z++)Z[z]=0,re[z]=0,he[z]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:Z,enabledAttributes:re,attributeDivisors:he,object:G,attributes:{},index:null}}function M(G,Z,re,he){const z=l.attributes,ae=Z.attributes;let ee=0;const q=re.getAttributes();for(const de in q)if(q[de].location>=0){const P=z[de];let X=ae[de];if(X===void 0&&(de==="instanceMatrix"&&G.instanceMatrix&&(X=G.instanceMatrix),de==="instanceColor"&&G.instanceColor&&(X=G.instanceColor)),P===void 0||P.attribute!==X||X&&P.data!==X.data)return!0;ee++}return l.attributesNum!==ee||l.index!==he}function E(G,Z,re,he){const z={},ae=Z.attributes;let ee=0;const q=re.getAttributes();for(const de in q)if(q[de].location>=0){let P=ae[de];P===void 0&&(de==="instanceMatrix"&&G.instanceMatrix&&(P=G.instanceMatrix),de==="instanceColor"&&G.instanceColor&&(P=G.instanceColor));const X={};X.attribute=P,P&&P.data&&(X.data=P.data),z[de]=X,ee++}l.attributes=z,l.attributesNum=ee,l.index=he}function w(){const G=l.newAttributes;for(let Z=0,re=G.length;Z<re;Z++)G[Z]=0}function _(G){S(G,0)}function S(G,Z){const re=l.newAttributes,he=l.enabledAttributes,z=l.attributeDivisors;re[G]=1,he[G]===0&&(i.enableVertexAttribArray(G),he[G]=1),z[G]!==Z&&(i.vertexAttribDivisor(G,Z),z[G]=Z)}function L(){const G=l.newAttributes,Z=l.enabledAttributes;for(let re=0,he=Z.length;re<he;re++)Z[re]!==G[re]&&(i.disableVertexAttribArray(re),Z[re]=0)}function N(G,Z,re,he,z,ae,ee){ee===!0?i.vertexAttribIPointer(G,Z,re,z,ae):i.vertexAttribPointer(G,Z,re,he,z,ae)}function C(G,Z,re,he){w();const z=he.attributes,ae=re.getAttributes(),ee=Z.defaultAttributeValues;for(const q in ae){const de=ae[q];if(de.location>=0){let ce=z[q];if(ce===void 0&&(q==="instanceMatrix"&&G.instanceMatrix&&(ce=G.instanceMatrix),q==="instanceColor"&&G.instanceColor&&(ce=G.instanceColor)),ce!==void 0){const P=ce.normalized,X=ce.itemSize,Le=e.get(ce);if(Le===void 0)continue;const Be=Le.buffer,Ge=Le.type,le=Le.bytesPerElement,ye=Ge===i.INT||Ge===i.UNSIGNED_INT||ce.gpuType===Lm;if(ce.isInterleavedBufferAttribute){const ge=ce.data,Ue=ge.stride,Ze=ce.offset;if(ge.isInstancedInterleavedBuffer){for(let tt=0;tt<de.locationSize;tt++)S(de.location+tt,ge.meshPerAttribute);G.isInstancedMesh!==!0&&he._maxInstanceCount===void 0&&(he._maxInstanceCount=ge.meshPerAttribute*ge.count)}else for(let tt=0;tt<de.locationSize;tt++)_(de.location+tt);i.bindBuffer(i.ARRAY_BUFFER,Be);for(let tt=0;tt<de.locationSize;tt++)N(de.location+tt,X/de.locationSize,Ge,P,Ue*le,(Ze+X/de.locationSize*tt)*le,ye)}else{if(ce.isInstancedBufferAttribute){for(let ge=0;ge<de.locationSize;ge++)S(de.location+ge,ce.meshPerAttribute);G.isInstancedMesh!==!0&&he._maxInstanceCount===void 0&&(he._maxInstanceCount=ce.meshPerAttribute*ce.count)}else for(let ge=0;ge<de.locationSize;ge++)_(de.location+ge);i.bindBuffer(i.ARRAY_BUFFER,Be);for(let ge=0;ge<de.locationSize;ge++)N(de.location+ge,X/de.locationSize,Ge,P,X*le,X/de.locationSize*ge*le,ye)}}else if(ee!==void 0){const P=ee[q];if(P!==void 0)switch(P.length){case 2:i.vertexAttrib2fv(de.location,P);break;case 3:i.vertexAttrib3fv(de.location,P);break;case 4:i.vertexAttrib4fv(de.location,P);break;default:i.vertexAttrib1fv(de.location,P)}}}}L()}function U(){F();for(const G in r){const Z=r[G];for(const re in Z){const he=Z[re];for(const z in he){const ae=he[z];for(const ee in ae)m(ae[ee].object),delete ae[ee];delete he[z]}}delete r[G]}}function D(G){if(r[G.id]===void 0)return;const Z=r[G.id];for(const re in Z){const he=Z[re];for(const z in he){const ae=he[z];for(const ee in ae)m(ae[ee].object),delete ae[ee];delete he[z]}}delete r[G.id]}function k(G){for(const Z in r){const re=r[Z];for(const he in re){const z=re[he];if(z[G.id]===void 0)continue;const ae=z[G.id];for(const ee in ae)m(ae[ee].object),delete ae[ee];delete z[G.id]}}}function b(G){for(const Z in r){const re=r[Z],he=G.isInstancedMesh===!0?G.id:0,z=re[he];if(z!==void 0){for(const ae in z){const ee=z[ae];for(const q in ee)m(ee[q].object),delete ee[q];delete z[ae]}delete re[he],Object.keys(re).length===0&&delete r[Z]}}}function F(){B(),c=!0,l!==a&&(l=a,f(l.object))}function B(){a.geometry=null,a.program=null,a.wireframe=!1}return{setup:d,reset:F,resetDefaultState:B,dispose:U,releaseStatesOfGeometry:D,releaseStatesOfObject:b,releaseStatesOfProgram:k,initAttributes:w,enableAttribute:_,disableUnusedAttributes:L}}function XR(i,e,t){let r;function a(h){r=h}function l(h,f){i.drawArrays(r,h,f),t.update(f,r,1)}function c(h,f,m){m!==0&&(i.drawArraysInstanced(r,h,f,m),t.update(f,r,m))}function d(h,f,m){if(m===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(r,h,0,f,0,m);let x=0;for(let M=0;M<m;M++)x+=f[M];t.update(x,r,1)}this.setMode=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=d}function $R(i,e,t,r){let a;function l(){if(a!==void 0)return a;if(e.has("EXT_texture_filter_anisotropic")===!0){const k=e.get("EXT_texture_filter_anisotropic");a=i.getParameter(k.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else a=0;return a}function c(k){return!(k!==Ki&&r.convert(k)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function d(k){const b=k===qr&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(k!==Si&&r.convert(k)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&k!==pr&&!b)}function h(k){if(k==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";k="mediump"}return k==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let f=t.precision!==void 0?t.precision:"highp";const m=h(f);m!==f&&(lt("WebGLRenderer:",f,"not supported, using",m,"instead."),f=m);const g=t.logarithmicDepthBuffer===!0,x=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&x===!1&&lt("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const M=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),E=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),w=i.getParameter(i.MAX_TEXTURE_SIZE),_=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),S=i.getParameter(i.MAX_VERTEX_ATTRIBS),L=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),N=i.getParameter(i.MAX_VARYING_VECTORS),C=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),U=i.getParameter(i.MAX_SAMPLES),D=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:l,getMaxPrecision:h,textureFormatReadable:c,textureTypeReadable:d,precision:f,logarithmicDepthBuffer:g,reversedDepthBuffer:x,maxTextures:M,maxVertexTextures:E,maxTextureSize:w,maxCubemapSize:_,maxAttributes:S,maxVertexUniforms:L,maxVaryings:N,maxFragmentUniforms:C,maxSamples:U,samples:D}}function qR(i){const e=this;let t=null,r=0,a=!1,l=!1;const c=new Es,d=new pt,h={value:null,needsUpdate:!1};this.uniform=h,this.numPlanes=0,this.numIntersection=0,this.init=function(g,x){const M=g.length!==0||x||r!==0||a;return a=x,r=g.length,M},this.beginShadows=function(){l=!0,m(null)},this.endShadows=function(){l=!1},this.setGlobalState=function(g,x){t=m(g,x,0)},this.setState=function(g,x,M){const E=g.clippingPlanes,w=g.clipIntersection,_=g.clipShadows,S=i.get(g);if(!a||E===null||E.length===0||l&&!_)l?m(null):f();else{const L=l?0:r,N=L*4;let C=S.clippingState||null;h.value=C,C=m(E,x,N,M);for(let U=0;U!==N;++U)C[U]=t[U];S.clippingState=C,this.numIntersection=w?this.numPlanes:0,this.numPlanes+=L}};function f(){h.value!==t&&(h.value=t,h.needsUpdate=r>0),e.numPlanes=r,e.numIntersection=0}function m(g,x,M,E){const w=g!==null?g.length:0;let _=null;if(w!==0){if(_=h.value,E!==!0||_===null){const S=M+w*4,L=x.matrixWorldInverse;d.getNormalMatrix(L),(_===null||_.length<S)&&(_=new Float32Array(S));for(let N=0,C=M;N!==w;++N,C+=4)c.copy(g[N]).applyMatrix4(L,d),c.normal.toArray(_,C),_[C+3]=c.constant}h.value=_,h.needsUpdate=!0}return e.numPlanes=w,e.numIntersection=0,_}}const Is=4,Pv=[.125,.215,.35,.446,.526,.582],ca=20,YR=256,Dl=new Gm,Nv=new xt;let jf=null,Wf=0,Xf=0,$f=!1;const KR=new te;class Lv{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,r=.1,a=100,l={}){const{size:c=256,position:d=KR}=l;jf=this._renderer.getRenderTarget(),Wf=this._renderer.getActiveCubeFace(),Xf=this._renderer.getActiveMipmapLevel(),$f=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(c);const h=this._allocateTargets();return h.depthBuffer=!0,this._sceneToCubeUV(e,r,a,h,d),t>0&&this._blur(h,0,0,t),this._applyPMREM(h),this._cleanup(h),h}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Uv(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Iv(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(jf,Wf,Xf),this._renderer.xr.enabled=$f,e.scissorTest=!1,ho(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===wa||e.mapping===Io?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),jf=this._renderer.getRenderTarget(),Wf=this._renderer.getActiveCubeFace(),Xf=this._renderer.getActiveMipmapLevel(),$f=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const r=t||this._allocateTargets();return this._textureToCubeUV(e,r),this._applyPMREM(r),this._cleanup(r),r}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,r={magFilter:Wn,minFilter:Wn,generateMipmaps:!1,type:qr,format:Ki,colorSpace:ld,depthBuffer:!1},a=Dv(e,t,r);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Dv(e,t,r);const{_lodMax:l}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=QR(l)),this._blurMaterial=JR(l,e,t),this._ggxMaterial=ZR(l,e,t)}return a}_compileMaterial(e){const t=new Zi(new Mi,e);this._renderer.compile(t,Dl)}_sceneToCubeUV(e,t,r,a,l){const h=new Ii(90,1,t,r),f=[1,-1,1,1,1,1],m=[1,1,1,-1,-1,-1],g=this._renderer,x=g.autoClear,M=g.toneMapping;g.getClearColor(Nv),g.toneMapping=gr,g.autoClear=!1,g.state.buffers.depth.getReversed()&&(g.setRenderTarget(a),g.clearDepth(),g.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Zi(new sc,new My({name:"PMREM.Background",side:hi,depthWrite:!1,depthTest:!1})));const w=this._backgroundBox,_=w.material;let S=!1;const L=e.background;L?L.isColor&&(_.color.copy(L),e.background=null,S=!0):(_.color.copy(Nv),S=!0);for(let N=0;N<6;N++){const C=N%3;C===0?(h.up.set(0,f[N],0),h.position.set(l.x,l.y,l.z),h.lookAt(l.x+m[N],l.y,l.z)):C===1?(h.up.set(0,0,f[N]),h.position.set(l.x,l.y,l.z),h.lookAt(l.x,l.y+m[N],l.z)):(h.up.set(0,f[N],0),h.position.set(l.x,l.y,l.z),h.lookAt(l.x,l.y,l.z+m[N]));const U=this._cubeSize;ho(a,C*U,N>2?U:0,U,U),g.setRenderTarget(a),S&&g.render(w,h),g.render(e,h)}g.toneMapping=M,g.autoClear=x,e.background=L}_textureToCubeUV(e,t){const r=this._renderer,a=e.mapping===wa||e.mapping===Io;a?(this._cubemapMaterial===null&&(this._cubemapMaterial=Uv()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Iv());const l=a?this._cubemapMaterial:this._equirectMaterial,c=this._lodMeshes[0];c.material=l;const d=l.uniforms;d.envMap.value=e;const h=this._cubeSize;ho(t,0,0,3*h,2*h),r.setRenderTarget(t),r.render(c,Dl)}_applyPMREM(e){const t=this._renderer,r=t.autoClear;t.autoClear=!1;const a=this._lodMeshes.length;for(let l=1;l<a;l++)this._applyGGXFilter(e,l-1,l);t.autoClear=r}_applyGGXFilter(e,t,r){const a=this._renderer,l=this._pingPongRenderTarget,c=this._ggxMaterial,d=this._lodMeshes[r];d.material=c;const h=c.uniforms,f=r/(this._lodMeshes.length-1),m=t/(this._lodMeshes.length-1),g=Math.sqrt(f*f-m*m),x=0+f*1.25,M=g*x,{_lodMax:E}=this,w=this._sizeLods[r],_=3*w*(r>E-Is?r-E+Is:0),S=4*(this._cubeSize-w);h.envMap.value=e.texture,h.roughness.value=M,h.mipInt.value=E-t,ho(l,_,S,3*w,2*w),a.setRenderTarget(l),a.render(d,Dl),h.envMap.value=l.texture,h.roughness.value=0,h.mipInt.value=E-r,ho(e,_,S,3*w,2*w),a.setRenderTarget(e),a.render(d,Dl)}_blur(e,t,r,a,l){const c=this._pingPongRenderTarget;this._halfBlur(e,c,t,r,a,"latitudinal",l),this._halfBlur(c,e,r,r,a,"longitudinal",l)}_halfBlur(e,t,r,a,l,c,d){const h=this._renderer,f=this._blurMaterial;c!=="latitudinal"&&c!=="longitudinal"&&Dt("blur direction must be either latitudinal or longitudinal!");const m=3,g=this._lodMeshes[a];g.material=f;const x=f.uniforms,M=this._sizeLods[r]-1,E=isFinite(l)?Math.PI/(2*M):2*Math.PI/(2*ca-1),w=l/E,_=isFinite(l)?1+Math.floor(m*w):ca;_>ca&&lt(`sigmaRadians, ${l}, is too large and will clip, as it requested ${_} samples when the maximum is set to ${ca}`);const S=[];let L=0;for(let k=0;k<ca;++k){const b=k/w,F=Math.exp(-b*b/2);S.push(F),k===0?L+=F:k<_&&(L+=2*F)}for(let k=0;k<S.length;k++)S[k]=S[k]/L;x.envMap.value=e.texture,x.samples.value=_,x.weights.value=S,x.latitudinal.value=c==="latitudinal",d&&(x.poleAxis.value=d);const{_lodMax:N}=this;x.dTheta.value=E,x.mipInt.value=N-r;const C=this._sizeLods[a],U=3*C*(a>N-Is?a-N+Is:0),D=4*(this._cubeSize-C);ho(t,U,D,3*C,2*C),h.setRenderTarget(t),h.render(g,Dl)}}function QR(i){const e=[],t=[],r=[];let a=i;const l=i-Is+1+Pv.length;for(let c=0;c<l;c++){const d=Math.pow(2,a);e.push(d);let h=1/d;c>i-Is?h=Pv[c-i+Is-1]:c===0&&(h=0),t.push(h);const f=1/(d-2),m=-f,g=1+f,x=[m,m,g,m,g,g,m,m,g,g,m,g],M=6,E=6,w=3,_=2,S=1,L=new Float32Array(w*E*M),N=new Float32Array(_*E*M),C=new Float32Array(S*E*M);for(let D=0;D<M;D++){const k=D%3*2/3-1,b=D>2?0:-1,F=[k,b,0,k+2/3,b,0,k+2/3,b+1,0,k,b,0,k+2/3,b+1,0,k,b+1,0];L.set(F,w*E*D),N.set(x,_*E*D);const B=[D,D,D,D,D,D];C.set(B,S*E*D)}const U=new Mi;U.setAttribute("position",new vr(L,w)),U.setAttribute("uv",new vr(N,_)),U.setAttribute("faceIndex",new vr(C,S)),r.push(new Zi(U,null)),a>Is&&a--}return{lodMeshes:r,sizeLods:e,sigmas:t}}function Dv(i,e,t){const r=new xr(i,e,t);return r.texture.mapping=vd,r.texture.name="PMREM.cubeUv",r.scissorTest=!0,r}function ho(i,e,t,r,a){i.viewport.set(e,t,r,a),i.scissor.set(e,t,r,a)}function ZR(i,e,t){return new Sr({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:YR,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Sd(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:jr,depthTest:!1,depthWrite:!1})}function JR(i,e,t){const r=new Float32Array(ca),a=new te(0,1,0);return new Sr({name:"SphericalGaussianBlur",defines:{n:ca,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:r},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:a}},vertexShader:Sd(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:jr,depthTest:!1,depthWrite:!1})}function Iv(){return new Sr({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Sd(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:jr,depthTest:!1,depthWrite:!1})}function Uv(){return new Sr({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Sd(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:jr,depthTest:!1,depthWrite:!1})}function Sd(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}class Ay extends xr{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const r={width:e,height:e,depth:1},a=[r,r,r,r,r,r];this.texture=new Ey(a),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const r={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},a=new sc(5,5,5),l=new Sr({name:"CubemapFromEquirect",uniforms:Fo(r.uniforms),vertexShader:r.vertexShader,fragmentShader:r.fragmentShader,side:hi,blending:jr});l.uniforms.tEquirect.value=t;const c=new Zi(a,l),d=t.minFilter;return t.minFilter===da&&(t.minFilter=Wn),new rT(1,10,this).update(e,c),t.minFilter=d,c.geometry.dispose(),c.material.dispose(),this}clear(e,t=!0,r=!0,a=!0){const l=e.getRenderTarget();for(let c=0;c<6;c++)e.setRenderTarget(this,c),e.clear(t,r,a);e.setRenderTarget(l)}}function eA(i){let e=new WeakMap,t=new WeakMap,r=null;function a(x,M=!1){return x==null?null:M?c(x):l(x)}function l(x){if(x&&x.isTexture){const M=x.mapping;if(M===ff||M===pf)if(e.has(x)){const E=e.get(x).texture;return d(E,x.mapping)}else{const E=x.image;if(E&&E.height>0){const w=new Ay(E.height);return w.fromEquirectangularTexture(i,x),e.set(x,w),x.addEventListener("dispose",f),d(w.texture,x.mapping)}else return null}}return x}function c(x){if(x&&x.isTexture){const M=x.mapping,E=M===ff||M===pf,w=M===wa||M===Io;if(E||w){let _=t.get(x);const S=_!==void 0?_.texture.pmremVersion:0;if(x.isRenderTargetTexture&&x.pmremVersion!==S)return r===null&&(r=new Lv(i)),_=E?r.fromEquirectangular(x,_):r.fromCubemap(x,_),_.texture.pmremVersion=x.pmremVersion,t.set(x,_),_.texture;if(_!==void 0)return _.texture;{const L=x.image;return E&&L&&L.height>0||w&&L&&h(L)?(r===null&&(r=new Lv(i)),_=E?r.fromEquirectangular(x):r.fromCubemap(x),_.texture.pmremVersion=x.pmremVersion,t.set(x,_),x.addEventListener("dispose",m),_.texture):null}}}return x}function d(x,M){return M===ff?x.mapping=wa:M===pf&&(x.mapping=Io),x}function h(x){let M=0;const E=6;for(let w=0;w<E;w++)x[w]!==void 0&&M++;return M===E}function f(x){const M=x.target;M.removeEventListener("dispose",f);const E=e.get(M);E!==void 0&&(e.delete(M),E.dispose())}function m(x){const M=x.target;M.removeEventListener("dispose",m);const E=t.get(M);E!==void 0&&(t.delete(M),E.dispose())}function g(){e=new WeakMap,t=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:a,dispose:g}}function tA(i){const e={};function t(r){if(e[r]!==void 0)return e[r];const a=i.getExtension(r);return e[r]=a,a}return{has:function(r){return t(r)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(r){const a=t(r);return a===null&&vo("WebGLRenderer: "+r+" extension not supported."),a}}}function nA(i,e,t,r){const a={},l=new WeakMap;function c(g){const x=g.target;x.index!==null&&e.remove(x.index);for(const E in x.attributes)e.remove(x.attributes[E]);x.removeEventListener("dispose",c),delete a[x.id];const M=l.get(x);M&&(e.remove(M),l.delete(x)),r.releaseStatesOfGeometry(x),x.isInstancedBufferGeometry===!0&&delete x._maxInstanceCount,t.memory.geometries--}function d(g,x){return a[x.id]===!0||(x.addEventListener("dispose",c),a[x.id]=!0,t.memory.geometries++),x}function h(g){const x=g.attributes;for(const M in x)e.update(x[M],i.ARRAY_BUFFER)}function f(g){const x=[],M=g.index,E=g.attributes.position;let w=0;if(E===void 0)return;if(M!==null){const L=M.array;w=M.version;for(let N=0,C=L.length;N<C;N+=3){const U=L[N+0],D=L[N+1],k=L[N+2];x.push(U,D,D,k,k,U)}}else{const L=E.array;w=E.version;for(let N=0,C=L.length/3-1;N<C;N+=3){const U=N+0,D=N+1,k=N+2;x.push(U,D,D,k,k,U)}}const _=new(E.count>=65535?Sy:yy)(x,1);_.version=w;const S=l.get(g);S&&e.remove(S),l.set(g,_)}function m(g){const x=l.get(g);if(x){const M=g.index;M!==null&&x.version<M.version&&f(g)}else f(g);return l.get(g)}return{get:d,update:h,getWireframeAttribute:m}}function iA(i,e,t){let r;function a(g){r=g}let l,c;function d(g){l=g.type,c=g.bytesPerElement}function h(g,x){i.drawElements(r,x,l,g*c),t.update(x,r,1)}function f(g,x,M){M!==0&&(i.drawElementsInstanced(r,x,l,g*c,M),t.update(x,r,M))}function m(g,x,M){if(M===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(r,x,0,l,g,0,M);let w=0;for(let _=0;_<M;_++)w+=x[_];t.update(w,r,1)}this.setMode=a,this.setIndex=d,this.render=h,this.renderInstances=f,this.renderMultiDraw=m}function rA(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function r(l,c,d){switch(t.calls++,c){case i.TRIANGLES:t.triangles+=d*(l/3);break;case i.LINES:t.lines+=d*(l/2);break;case i.LINE_STRIP:t.lines+=d*(l-1);break;case i.LINE_LOOP:t.lines+=d*l;break;case i.POINTS:t.points+=d*l;break;default:Dt("WebGLInfo: Unknown draw mode:",c);break}}function a(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:a,update:r}}function sA(i,e,t){const r=new WeakMap,a=new un;function l(c,d,h){const f=c.morphTargetInfluences,m=d.morphAttributes.position||d.morphAttributes.normal||d.morphAttributes.color,g=m!==void 0?m.length:0;let x=r.get(d);if(x===void 0||x.count!==g){let B=function(){b.dispose(),r.delete(d),d.removeEventListener("dispose",B)};var M=B;x!==void 0&&x.texture.dispose();const E=d.morphAttributes.position!==void 0,w=d.morphAttributes.normal!==void 0,_=d.morphAttributes.color!==void 0,S=d.morphAttributes.position||[],L=d.morphAttributes.normal||[],N=d.morphAttributes.color||[];let C=0;E===!0&&(C=1),w===!0&&(C=2),_===!0&&(C=3);let U=d.attributes.position.count*C,D=1;U>e.maxTextureSize&&(D=Math.ceil(U/e.maxTextureSize),U=e.maxTextureSize);const k=new Float32Array(U*D*4*g),b=new xy(k,U,D,g);b.type=pr,b.needsUpdate=!0;const F=C*4;for(let G=0;G<g;G++){const Z=S[G],re=L[G],he=N[G],z=U*D*4*G;for(let ae=0;ae<Z.count;ae++){const ee=ae*F;E===!0&&(a.fromBufferAttribute(Z,ae),k[z+ee+0]=a.x,k[z+ee+1]=a.y,k[z+ee+2]=a.z,k[z+ee+3]=0),w===!0&&(a.fromBufferAttribute(re,ae),k[z+ee+4]=a.x,k[z+ee+5]=a.y,k[z+ee+6]=a.z,k[z+ee+7]=0),_===!0&&(a.fromBufferAttribute(he,ae),k[z+ee+8]=a.x,k[z+ee+9]=a.y,k[z+ee+10]=a.z,k[z+ee+11]=he.itemSize===4?a.w:1)}}x={count:g,texture:b,size:new dt(U,D)},r.set(d,x),d.addEventListener("dispose",B)}if(c.isInstancedMesh===!0&&c.morphTexture!==null)h.getUniforms().setValue(i,"morphTexture",c.morphTexture,t);else{let E=0;for(let _=0;_<f.length;_++)E+=f[_];const w=d.morphTargetsRelative?1:1-E;h.getUniforms().setValue(i,"morphTargetBaseInfluence",w),h.getUniforms().setValue(i,"morphTargetInfluences",f)}h.getUniforms().setValue(i,"morphTargetsTexture",x.texture,t),h.getUniforms().setValue(i,"morphTargetsTextureSize",x.size)}return{update:l}}function aA(i,e,t,r,a){let l=new WeakMap;function c(f){const m=a.render.frame,g=f.geometry,x=e.get(f,g);if(l.get(x)!==m&&(e.update(x),l.set(x,m)),f.isInstancedMesh&&(f.hasEventListener("dispose",h)===!1&&f.addEventListener("dispose",h),l.get(f)!==m&&(t.update(f.instanceMatrix,i.ARRAY_BUFFER),f.instanceColor!==null&&t.update(f.instanceColor,i.ARRAY_BUFFER),l.set(f,m))),f.isSkinnedMesh){const M=f.skeleton;l.get(M)!==m&&(M.update(),l.set(M,m))}return x}function d(){l=new WeakMap}function h(f){const m=f.target;m.removeEventListener("dispose",h),r.releaseStatesOfObject(m),t.remove(m.instanceMatrix),m.instanceColor!==null&&t.remove(m.instanceColor)}return{update:c,dispose:d}}const oA={[ny]:"LINEAR_TONE_MAPPING",[iy]:"REINHARD_TONE_MAPPING",[ry]:"CINEON_TONE_MAPPING",[Nm]:"ACES_FILMIC_TONE_MAPPING",[ay]:"AGX_TONE_MAPPING",[oy]:"NEUTRAL_TONE_MAPPING",[sy]:"CUSTOM_TONE_MAPPING"};function lA(i,e,t,r,a,l){const c=new xr(e,t,{type:i,depthBuffer:a,stencilBuffer:l,samples:r?4:0,depthTexture:a?new Uo(e,t):void 0}),d=new xr(e,t,{type:qr,depthBuffer:!1,stencilBuffer:!1}),h=new Mi;h.setAttribute("position",new In([-1,3,0,-1,-1,0,3,-1,0],3)),h.setAttribute("uv",new In([0,2,0,0,2,0],2));const f=new jb({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),m=new Zi(h,f),g=new Gm(-1,1,1,-1,0,1);let x=null,M=null,E=!1,w,_=null,S=[],L=!1;this.setSize=function(N,C){c.setSize(N,C),d.setSize(N,C);for(let U=0;U<S.length;U++){const D=S[U];D.setSize&&D.setSize(N,C)}},this.setEffects=function(N){S=N,L=S.length>0&&S[0].isRenderPass===!0;const C=c.width,U=c.height;for(let D=0;D<S.length;D++){const k=S[D];k.setSize&&k.setSize(C,U)}},this.begin=function(N,C){if(E||N.toneMapping===gr&&S.length===0)return!1;if(_=C,C!==null){const U=C.width,D=C.height;(c.width!==U||c.height!==D)&&this.setSize(U,D)}return L===!1&&N.setRenderTarget(c),w=N.toneMapping,N.toneMapping=gr,!0},this.hasRenderPass=function(){return L},this.end=function(N,C){N.toneMapping=w,E=!0;let U=c,D=d;for(let k=0;k<S.length;k++){const b=S[k];if(b.enabled!==!1&&(b.render(N,D,U,C),b.needsSwap!==!1)){const F=U;U=D,D=F}}if(x!==N.outputColorSpace||M!==N.toneMapping){x=N.outputColorSpace,M=N.toneMapping,f.defines={},Pt.getTransfer(x)===Vt&&(f.defines.SRGB_TRANSFER="");const k=oA[M];k&&(f.defines[k]=""),f.needsUpdate=!0}f.uniforms.tDiffuse.value=U.texture,N.setRenderTarget(_),N.render(m,g),_=null,E=!1},this.isCompositing=function(){return E},this.dispose=function(){c.depthTexture&&c.depthTexture.dispose(),c.dispose(),d.dispose(),h.dispose(),f.dispose()}}const Py=new Xn,rm=new Uo(1,1),Ny=new xy,Ly=new yb,Dy=new Ey,Fv=[],Ov=[],kv=new Float32Array(16),zv=new Float32Array(9),Bv=new Float32Array(4);function Vo(i,e,t){const r=i[0];if(r<=0||r>0)return i;const a=e*t;let l=Fv[a];if(l===void 0&&(l=new Float32Array(a),Fv[a]=l),e!==0){r.toArray(l,0);for(let c=1,d=0;c!==e;++c)d+=t,i[c].toArray(l,d)}return l}function wn(i,e){if(i.length!==e.length)return!1;for(let t=0,r=i.length;t<r;t++)if(i[t]!==e[t])return!1;return!0}function bn(i,e){for(let t=0,r=e.length;t<r;t++)i[t]=e[t]}function Md(i,e){let t=Ov[e];t===void 0&&(t=new Int32Array(e),Ov[e]=t);for(let r=0;r!==e;++r)t[r]=i.allocateTextureUnit();return t}function cA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function uA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wn(t,e))return;i.uniform2fv(this.addr,e),bn(t,e)}}function dA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(wn(t,e))return;i.uniform3fv(this.addr,e),bn(t,e)}}function hA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wn(t,e))return;i.uniform4fv(this.addr,e),bn(t,e)}}function fA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(wn(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),bn(t,e)}else{if(wn(t,r))return;Bv.set(r),i.uniformMatrix2fv(this.addr,!1,Bv),bn(t,r)}}function pA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(wn(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),bn(t,e)}else{if(wn(t,r))return;zv.set(r),i.uniformMatrix3fv(this.addr,!1,zv),bn(t,r)}}function mA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(wn(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),bn(t,e)}else{if(wn(t,r))return;kv.set(r),i.uniformMatrix4fv(this.addr,!1,kv),bn(t,r)}}function gA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function xA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wn(t,e))return;i.uniform2iv(this.addr,e),bn(t,e)}}function vA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(wn(t,e))return;i.uniform3iv(this.addr,e),bn(t,e)}}function _A(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wn(t,e))return;i.uniform4iv(this.addr,e),bn(t,e)}}function yA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function SA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wn(t,e))return;i.uniform2uiv(this.addr,e),bn(t,e)}}function MA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(wn(t,e))return;i.uniform3uiv(this.addr,e),bn(t,e)}}function EA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wn(t,e))return;i.uniform4uiv(this.addr,e),bn(t,e)}}function wA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a);let l;this.type===i.SAMPLER_2D_SHADOW?(rm.compareFunction=t.isReversedDepthBuffer()?zm:km,l=rm):l=Py,t.setTexture2D(e||l,a)}function bA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTexture3D(e||Ly,a)}function TA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTextureCube(e||Dy,a)}function CA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTexture2DArray(e||Ny,a)}function RA(i){switch(i){case 5126:return cA;case 35664:return uA;case 35665:return dA;case 35666:return hA;case 35674:return fA;case 35675:return pA;case 35676:return mA;case 5124:case 35670:return gA;case 35667:case 35671:return xA;case 35668:case 35672:return vA;case 35669:case 35673:return _A;case 5125:return yA;case 36294:return SA;case 36295:return MA;case 36296:return EA;case 35678:case 36198:case 36298:case 36306:case 35682:return wA;case 35679:case 36299:case 36307:return bA;case 35680:case 36300:case 36308:case 36293:return TA;case 36289:case 36303:case 36311:case 36292:return CA}}function AA(i,e){i.uniform1fv(this.addr,e)}function PA(i,e){const t=Vo(e,this.size,2);i.uniform2fv(this.addr,t)}function NA(i,e){const t=Vo(e,this.size,3);i.uniform3fv(this.addr,t)}function LA(i,e){const t=Vo(e,this.size,4);i.uniform4fv(this.addr,t)}function DA(i,e){const t=Vo(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function IA(i,e){const t=Vo(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function UA(i,e){const t=Vo(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function FA(i,e){i.uniform1iv(this.addr,e)}function OA(i,e){i.uniform2iv(this.addr,e)}function kA(i,e){i.uniform3iv(this.addr,e)}function zA(i,e){i.uniform4iv(this.addr,e)}function BA(i,e){i.uniform1uiv(this.addr,e)}function HA(i,e){i.uniform2uiv(this.addr,e)}function VA(i,e){i.uniform3uiv(this.addr,e)}function GA(i,e){i.uniform4uiv(this.addr,e)}function jA(i,e,t){const r=this.cache,a=e.length,l=Md(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),bn(r,l));let c;this.type===i.SAMPLER_2D_SHADOW?c=rm:c=Py;for(let d=0;d!==a;++d)t.setTexture2D(e[d]||c,l[d])}function WA(i,e,t){const r=this.cache,a=e.length,l=Md(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),bn(r,l));for(let c=0;c!==a;++c)t.setTexture3D(e[c]||Ly,l[c])}function XA(i,e,t){const r=this.cache,a=e.length,l=Md(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),bn(r,l));for(let c=0;c!==a;++c)t.setTextureCube(e[c]||Dy,l[c])}function $A(i,e,t){const r=this.cache,a=e.length,l=Md(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),bn(r,l));for(let c=0;c!==a;++c)t.setTexture2DArray(e[c]||Ny,l[c])}function qA(i){switch(i){case 5126:return AA;case 35664:return PA;case 35665:return NA;case 35666:return LA;case 35674:return DA;case 35675:return IA;case 35676:return UA;case 5124:case 35670:return FA;case 35667:case 35671:return OA;case 35668:case 35672:return kA;case 35669:case 35673:return zA;case 5125:return BA;case 36294:return HA;case 36295:return VA;case 36296:return GA;case 35678:case 36198:case 36298:case 36306:case 35682:return jA;case 35679:case 36299:case 36307:return WA;case 35680:case 36300:case 36308:case 36293:return XA;case 36289:case 36303:case 36311:case 36292:return $A}}class YA{constructor(e,t,r){this.id=e,this.addr=r,this.cache=[],this.type=t.type,this.setValue=RA(t.type)}}class KA{constructor(e,t,r){this.id=e,this.addr=r,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=qA(t.type)}}class QA{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,r){const a=this.seq;for(let l=0,c=a.length;l!==c;++l){const d=a[l];d.setValue(e,t[d.id],r)}}}const qf=/(\w+)(\])?(\[|\.)?/g;function Hv(i,e){i.seq.push(e),i.map[e.id]=e}function ZA(i,e,t){const r=i.name,a=r.length;for(qf.lastIndex=0;;){const l=qf.exec(r),c=qf.lastIndex;let d=l[1];const h=l[2]==="]",f=l[3];if(h&&(d=d|0),f===void 0||f==="["&&c+2===a){Hv(t,f===void 0?new YA(d,i,e):new KA(d,i,e));break}else{let g=t.map[d];g===void 0&&(g=new QA(d),Hv(t,g)),t=g}}}class ed{constructor(e,t){this.seq=[],this.map={};const r=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let c=0;c<r;++c){const d=e.getActiveUniform(t,c),h=e.getUniformLocation(t,d.name);ZA(d,h,this)}const a=[],l=[];for(const c of this.seq)c.type===e.SAMPLER_2D_SHADOW||c.type===e.SAMPLER_CUBE_SHADOW||c.type===e.SAMPLER_2D_ARRAY_SHADOW?a.push(c):l.push(c);a.length>0&&(this.seq=a.concat(l))}setValue(e,t,r,a){const l=this.map[t];l!==void 0&&l.setValue(e,r,a)}setOptional(e,t,r){const a=t[r];a!==void 0&&this.setValue(e,r,a)}static upload(e,t,r,a){for(let l=0,c=t.length;l!==c;++l){const d=t[l],h=r[d.id];h.needsUpdate!==!1&&d.setValue(e,h.value,a)}}static seqWithValue(e,t){const r=[];for(let a=0,l=e.length;a!==l;++a){const c=e[a];c.id in t&&r.push(c)}return r}}function Vv(i,e,t){const r=i.createShader(e);return i.shaderSource(r,t),i.compileShader(r),r}const JA=37297;let eP=0;function tP(i,e){const t=i.split(`
`),r=[],a=Math.max(e-6,0),l=Math.min(e+6,t.length);for(let c=a;c<l;c++){const d=c+1;r.push(`${d===e?">":" "} ${d}: ${t[c]}`)}return r.join(`
`)}const Gv=new pt;function nP(i){Pt._getMatrix(Gv,Pt.workingColorSpace,i);const e=`mat3( ${Gv.elements.map(t=>t.toFixed(4))} )`;switch(Pt.getTransfer(i)){case cd:return[e,"LinearTransferOETF"];case Vt:return[e,"sRGBTransferOETF"];default:return lt("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function jv(i,e,t){const r=i.getShaderParameter(e,i.COMPILE_STATUS),l=(i.getShaderInfoLog(e)||"").trim();if(r&&l==="")return"";const c=/ERROR: 0:(\d+)/.exec(l);if(c){const d=parseInt(c[1]);return t.toUpperCase()+`

`+l+`

`+tP(i.getShaderSource(e),d)}else return l}function iP(i,e){const t=nP(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const rP={[ny]:"Linear",[iy]:"Reinhard",[ry]:"Cineon",[Nm]:"ACESFilmic",[ay]:"AgX",[oy]:"Neutral",[sy]:"Custom"};function sP(i,e){const t=rP[e];return t===void 0?(lt("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Bu=new te;function aP(){Pt.getLuminanceCoefficients(Bu);const i=Bu.x.toFixed(4),e=Bu.y.toFixed(4),t=Bu.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function oP(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Bl).join(`
`)}function lP(i){const e=[];for(const t in i){const r=i[t];r!==!1&&e.push("#define "+t+" "+r)}return e.join(`
`)}function cP(i,e){const t={},r=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let a=0;a<r;a++){const l=i.getActiveAttrib(e,a),c=l.name;let d=1;l.type===i.FLOAT_MAT2&&(d=2),l.type===i.FLOAT_MAT3&&(d=3),l.type===i.FLOAT_MAT4&&(d=4),t[c]={type:l.type,location:i.getAttribLocation(e,c),locationSize:d}}return t}function Bl(i){return i!==""}function Wv(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Xv(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const uP=/^[ \t]*#include +<([\w\d./]+)>/gm;function sm(i){return i.replace(uP,hP)}const dP=new Map;function hP(i,e){let t=_t[e];if(t===void 0){const r=dP.get(e);if(r!==void 0)t=_t[r],lt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,r);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return sm(t)}const fP=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function $v(i){return i.replace(fP,pP)}function pP(i,e,t,r){let a="";for(let l=parseInt(e);l<parseInt(t);l++)a+=r.replace(/\[\s*i\s*\]/g,"[ "+l+" ]").replace(/UNROLLED_LOOP_INDEX/g,l);return a}function qv(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}const mP={[$u]:"SHADOWMAP_TYPE_PCF",[Ol]:"SHADOWMAP_TYPE_VSM"};function gP(i){return mP[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const xP={[wa]:"ENVMAP_TYPE_CUBE",[Io]:"ENVMAP_TYPE_CUBE",[vd]:"ENVMAP_TYPE_CUBE_UV"};function vP(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":xP[i.envMapMode]||"ENVMAP_TYPE_CUBE"}const _P={[Io]:"ENVMAP_MODE_REFRACTION"};function yP(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":_P[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}const SP={[Pm]:"ENVMAP_BLENDING_MULTIPLY",[Zw]:"ENVMAP_BLENDING_MIX",[Jw]:"ENVMAP_BLENDING_ADD"};function MP(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":SP[i.combine]||"ENVMAP_BLENDING_NONE"}function EP(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,r=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:r,maxMip:t}}function wP(i,e,t,r){const a=i.getContext(),l=t.defines;let c=t.vertexShader,d=t.fragmentShader;const h=gP(t),f=vP(t),m=yP(t),g=MP(t),x=EP(t),M=oP(t),E=lP(l),w=a.createProgram();let _,S,L=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(_=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E].filter(Bl).join(`
`),_.length>0&&(_+=`
`),S=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E].filter(Bl).join(`
`),S.length>0&&(S+=`
`)):(_=[qv(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+m:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+h:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Bl).join(`
`),S=[qv(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+f:"",t.envMap?"#define "+m:"",t.envMap?"#define "+g:"",x?"#define CUBEUV_TEXEL_WIDTH "+x.texelWidth:"",x?"#define CUBEUV_TEXEL_HEIGHT "+x.texelHeight:"",x?"#define CUBEUV_MAX_MIP "+x.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+h:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==gr?"#define TONE_MAPPING":"",t.toneMapping!==gr?_t.tonemapping_pars_fragment:"",t.toneMapping!==gr?sP("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",_t.colorspace_pars_fragment,iP("linearToOutputTexel",t.outputColorSpace),aP(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Bl).join(`
`)),c=sm(c),c=Wv(c,t),c=Xv(c,t),d=sm(d),d=Wv(d,t),d=Xv(d,t),c=$v(c),d=$v(d),t.isRawShaderMaterial!==!0&&(L=`#version 300 es
`,_=[M,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+_,S=["#define varying in",t.glslVersion===Qx?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Qx?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+S);const N=L+_+c,C=L+S+d,U=Vv(a,a.VERTEX_SHADER,N),D=Vv(a,a.FRAGMENT_SHADER,C);a.attachShader(w,U),a.attachShader(w,D),t.index0AttributeName!==void 0?a.bindAttribLocation(w,0,t.index0AttributeName):t.hasPositionAttribute===!0&&a.bindAttribLocation(w,0,"position"),a.linkProgram(w);function k(G){if(i.debug.checkShaderErrors){const Z=a.getProgramInfoLog(w)||"",re=a.getShaderInfoLog(U)||"",he=a.getShaderInfoLog(D)||"",z=Z.trim(),ae=re.trim(),ee=he.trim();let q=!0,de=!0;if(a.getProgramParameter(w,a.LINK_STATUS)===!1)if(q=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(a,w,U,D);else{const ce=jv(a,U,"vertex"),P=jv(a,D,"fragment");Dt("WebGLProgram: Shader Error "+a.getError()+" - VALIDATE_STATUS "+a.getProgramParameter(w,a.VALIDATE_STATUS)+`

Material Name: `+G.name+`
Material Type: `+G.type+`

Program Info Log: `+z+`
`+ce+`
`+P)}else z!==""?lt("WebGLProgram: Program Info Log:",z):(ae===""||ee==="")&&(de=!1);de&&(G.diagnostics={runnable:q,programLog:z,vertexShader:{log:ae,prefix:_},fragmentShader:{log:ee,prefix:S}})}a.deleteShader(U),a.deleteShader(D),b=new ed(a,w),F=cP(a,w)}let b;this.getUniforms=function(){return b===void 0&&k(this),b};let F;this.getAttributes=function(){return F===void 0&&k(this),F};let B=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return B===!1&&(B=a.getProgramParameter(w,JA)),B},this.destroy=function(){r.releaseStatesOfProgram(this),a.deleteProgram(w),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=eP++,this.cacheKey=e,this.usedTimes=1,this.program=w,this.vertexShader=U,this.fragmentShader=D,this}let bP=0;class TP{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,r){const a=this._getShaderCacheForMaterial(e);return a.has(t)===!1&&(a.add(t),t.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const r of t)r.usedTimes--,r.usedTimes===0&&this.shaderCache.delete(r.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let r=t.get(e);return r===void 0&&(r=new Set,t.set(e,r)),r}_getShaderStage(e){const t=this.shaderCache;let r=t.get(e);return r===void 0&&(r=new CP(e),t.set(e,r)),r}}class CP{constructor(e){this.id=bP++,this.code=e,this.usedTimes=0}}function RP(i){return i===ba||i===sd||i===ad}function AP(i,e,t,r,a,l){const c=new vy,d=new TP,h=new Set,f=[],m=new Map,g=r.logarithmicDepthBuffer;let x=r.precision;const M={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function E(b){return h.add(b),b===0?"uv":`uv${b}`}function w(b,F,B,G,Z,re){const he=G.fog,z=Z.geometry,ae=b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial?G.environment:null,ee=b.isMeshStandardMaterial||b.isMeshLambertMaterial&&!b.envMap||b.isMeshPhongMaterial&&!b.envMap,q=e.get(b.envMap||ae,ee),de=q&&q.mapping===vd?q.image.height:null,ce=M[b.type];b.precision!==null&&(x=r.getMaxPrecision(b.precision),x!==b.precision&&lt("WebGLProgram.getParameters:",b.precision,"not supported, using",x,"instead."));const P=z.morphAttributes.position||z.morphAttributes.normal||z.morphAttributes.color,X=P!==void 0?P.length:0;let Le=0;z.morphAttributes.position!==void 0&&(Le=1),z.morphAttributes.normal!==void 0&&(Le=2),z.morphAttributes.color!==void 0&&(Le=3);let Be,Ge,le,ye;if(ce){const $e=hr[ce];Be=$e.vertexShader,Ge=$e.fragmentShader}else{Be=b.vertexShader,Ge=b.fragmentShader;const $e=d.getVertexShaderStage(b),jt=d.getFragmentShaderStage(b);d.update(b,$e,jt),le=$e.id,ye=jt.id}const ge=i.getRenderTarget(),Ue=i.state.buffers.depth.getReversed(),Ze=Z.isInstancedMesh===!0,tt=Z.isBatchedMesh===!0,Gt=!!b.map,ut=!!b.matcap,Rt=!!q,mt=!!b.aoMap,vt=!!b.lightMap,kt=!!b.bumpMap&&b.wireframe===!1,Xt=!!b.normalMap,qt=!!b.displacementMap,$t=!!b.emissiveMap,Et=!!b.metalnessMap,zt=!!b.roughnessMap,Y=b.anisotropy>0,pn=b.clearcoat>0,wt=b.dispersion>0,O=b.iridescence>0,T=b.sheen>0,I=b.transmission>0,Q=Y&&!!b.anisotropyMap,me=pn&&!!b.clearcoatMap,Ee=pn&&!!b.clearcoatNormalMap,Re=pn&&!!b.clearcoatRoughnessMap,xe=O&&!!b.iridescenceMap,ve=O&&!!b.iridescenceThicknessMap,Ie=T&&!!b.sheenColorMap,We=T&&!!b.sheenRoughnessMap,ne=!!b.specularMap,Se=!!b.specularColorMap,Oe=!!b.specularIntensityMap,nt=I&&!!b.transmissionMap,st=I&&!!b.thicknessMap,$=!!b.gradientMap,Pe=!!b.alphaMap,_e=b.alphaTest>0,De=!!b.alphaHash,Fe=!!b.extensions;let Me=gr;b.toneMapped&&(ge===null||ge.isXRRenderTarget===!0)&&(Me=i.toneMapping);const Ye={shaderID:ce,shaderType:b.type,shaderName:b.name,vertexShader:Be,fragmentShader:Ge,defines:b.defines,customVertexShaderID:le,customFragmentShaderID:ye,isRawShaderMaterial:b.isRawShaderMaterial===!0,glslVersion:b.glslVersion,precision:x,batching:tt,batchingColor:tt&&Z._colorsTexture!==null,instancing:Ze,instancingColor:Ze&&Z.instanceColor!==null,instancingMorph:Ze&&Z.morphTexture!==null,outputColorSpace:ge===null?i.outputColorSpace:ge.isXRRenderTarget===!0?ge.texture.colorSpace:Pt.workingColorSpace,alphaToCoverage:!!b.alphaToCoverage,map:Gt,matcap:ut,envMap:Rt,envMapMode:Rt&&q.mapping,envMapCubeUVHeight:de,aoMap:mt,lightMap:vt,bumpMap:kt,normalMap:Xt,displacementMap:qt,emissiveMap:$t,normalMapObjectSpace:Xt&&b.normalMapType===nb,normalMapTangentSpace:Xt&&b.normalMapType===od,packedNormalMap:Xt&&b.normalMapType===od&&RP(b.normalMap.format),metalnessMap:Et,roughnessMap:zt,anisotropy:Y,anisotropyMap:Q,clearcoat:pn,clearcoatMap:me,clearcoatNormalMap:Ee,clearcoatRoughnessMap:Re,dispersion:wt,iridescence:O,iridescenceMap:xe,iridescenceThicknessMap:ve,sheen:T,sheenColorMap:Ie,sheenRoughnessMap:We,specularMap:ne,specularColorMap:Se,specularIntensityMap:Oe,transmission:I,transmissionMap:nt,thicknessMap:st,gradientMap:$,opaque:b.transparent===!1&&b.blending===xo&&b.alphaToCoverage===!1,alphaMap:Pe,alphaTest:_e,alphaHash:De,combine:b.combine,mapUv:Gt&&E(b.map.channel),aoMapUv:mt&&E(b.aoMap.channel),lightMapUv:vt&&E(b.lightMap.channel),bumpMapUv:kt&&E(b.bumpMap.channel),normalMapUv:Xt&&E(b.normalMap.channel),displacementMapUv:qt&&E(b.displacementMap.channel),emissiveMapUv:$t&&E(b.emissiveMap.channel),metalnessMapUv:Et&&E(b.metalnessMap.channel),roughnessMapUv:zt&&E(b.roughnessMap.channel),anisotropyMapUv:Q&&E(b.anisotropyMap.channel),clearcoatMapUv:me&&E(b.clearcoatMap.channel),clearcoatNormalMapUv:Ee&&E(b.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Re&&E(b.clearcoatRoughnessMap.channel),iridescenceMapUv:xe&&E(b.iridescenceMap.channel),iridescenceThicknessMapUv:ve&&E(b.iridescenceThicknessMap.channel),sheenColorMapUv:Ie&&E(b.sheenColorMap.channel),sheenRoughnessMapUv:We&&E(b.sheenRoughnessMap.channel),specularMapUv:ne&&E(b.specularMap.channel),specularColorMapUv:Se&&E(b.specularColorMap.channel),specularIntensityMapUv:Oe&&E(b.specularIntensityMap.channel),transmissionMapUv:nt&&E(b.transmissionMap.channel),thicknessMapUv:st&&E(b.thicknessMap.channel),alphaMapUv:Pe&&E(b.alphaMap.channel),vertexTangents:!!z.attributes.tangent&&(Xt||Y),vertexNormals:!!z.attributes.normal,vertexColors:b.vertexColors,vertexAlphas:b.vertexColors===!0&&!!z.attributes.color&&z.attributes.color.itemSize===4,pointsUvs:Z.isPoints===!0&&!!z.attributes.uv&&(Gt||Pe),fog:!!he,useFog:b.fog===!0,fogExp2:!!he&&he.isFogExp2,flatShading:b.wireframe===!1&&(b.flatShading===!0||z.attributes.normal===void 0&&Xt===!1&&(b.isMeshLambertMaterial||b.isMeshPhongMaterial||b.isMeshStandardMaterial||b.isMeshPhysicalMaterial)),sizeAttenuation:b.sizeAttenuation===!0,logarithmicDepthBuffer:g,reversedDepthBuffer:Ue,skinning:Z.isSkinnedMesh===!0,hasPositionAttribute:z.attributes.position!==void 0,morphTargets:z.morphAttributes.position!==void 0,morphNormals:z.morphAttributes.normal!==void 0,morphColors:z.morphAttributes.color!==void 0,morphTargetsCount:X,morphTextureStride:Le,numDirLights:F.directional.length,numPointLights:F.point.length,numSpotLights:F.spot.length,numSpotLightMaps:F.spotLightMap.length,numRectAreaLights:F.rectArea.length,numHemiLights:F.hemi.length,numDirLightShadows:F.directionalShadowMap.length,numPointLightShadows:F.pointShadowMap.length,numSpotLightShadows:F.spotShadowMap.length,numSpotLightShadowsWithMaps:F.numSpotLightShadowsWithMaps,numLightProbes:F.numLightProbes,numLightProbeGrids:re.length,numClippingPlanes:l.numPlanes,numClipIntersection:l.numIntersection,dithering:b.dithering,shadowMapEnabled:i.shadowMap.enabled&&B.length>0,shadowMapType:i.shadowMap.type,toneMapping:Me,decodeVideoTexture:Gt&&b.map.isVideoTexture===!0&&Pt.getTransfer(b.map.colorSpace)===Vt,decodeVideoTextureEmissive:$t&&b.emissiveMap.isVideoTexture===!0&&Pt.getTransfer(b.emissiveMap.colorSpace)===Vt,premultipliedAlpha:b.premultipliedAlpha,doubleSided:b.side===fr,flipSided:b.side===hi,useDepthPacking:b.depthPacking>=0,depthPacking:b.depthPacking||0,index0AttributeName:b.index0AttributeName,extensionClipCullDistance:Fe&&b.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Fe&&b.extensions.multiDraw===!0||tt)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:b.customProgramCacheKey()};return Ye.vertexUv1s=h.has(1),Ye.vertexUv2s=h.has(2),Ye.vertexUv3s=h.has(3),h.clear(),Ye}function _(b){const F=[];if(b.shaderID?F.push(b.shaderID):(F.push(b.customVertexShaderID),F.push(b.customFragmentShaderID)),b.defines!==void 0)for(const B in b.defines)F.push(B),F.push(b.defines[B]);return b.isRawShaderMaterial===!1&&(S(F,b),L(F,b),F.push(i.outputColorSpace)),F.push(b.customProgramCacheKey),F.join()}function S(b,F){b.push(F.precision),b.push(F.outputColorSpace),b.push(F.envMapMode),b.push(F.envMapCubeUVHeight),b.push(F.mapUv),b.push(F.alphaMapUv),b.push(F.lightMapUv),b.push(F.aoMapUv),b.push(F.bumpMapUv),b.push(F.normalMapUv),b.push(F.displacementMapUv),b.push(F.emissiveMapUv),b.push(F.metalnessMapUv),b.push(F.roughnessMapUv),b.push(F.anisotropyMapUv),b.push(F.clearcoatMapUv),b.push(F.clearcoatNormalMapUv),b.push(F.clearcoatRoughnessMapUv),b.push(F.iridescenceMapUv),b.push(F.iridescenceThicknessMapUv),b.push(F.sheenColorMapUv),b.push(F.sheenRoughnessMapUv),b.push(F.specularMapUv),b.push(F.specularColorMapUv),b.push(F.specularIntensityMapUv),b.push(F.transmissionMapUv),b.push(F.thicknessMapUv),b.push(F.combine),b.push(F.fogExp2),b.push(F.sizeAttenuation),b.push(F.morphTargetsCount),b.push(F.morphAttributeCount),b.push(F.numDirLights),b.push(F.numPointLights),b.push(F.numSpotLights),b.push(F.numSpotLightMaps),b.push(F.numHemiLights),b.push(F.numRectAreaLights),b.push(F.numDirLightShadows),b.push(F.numPointLightShadows),b.push(F.numSpotLightShadows),b.push(F.numSpotLightShadowsWithMaps),b.push(F.numLightProbes),b.push(F.shadowMapType),b.push(F.toneMapping),b.push(F.numClippingPlanes),b.push(F.numClipIntersection),b.push(F.depthPacking)}function L(b,F){c.disableAll(),F.instancing&&c.enable(0),F.instancingColor&&c.enable(1),F.instancingMorph&&c.enable(2),F.matcap&&c.enable(3),F.envMap&&c.enable(4),F.normalMapObjectSpace&&c.enable(5),F.normalMapTangentSpace&&c.enable(6),F.clearcoat&&c.enable(7),F.iridescence&&c.enable(8),F.alphaTest&&c.enable(9),F.vertexColors&&c.enable(10),F.vertexAlphas&&c.enable(11),F.vertexUv1s&&c.enable(12),F.vertexUv2s&&c.enable(13),F.vertexUv3s&&c.enable(14),F.vertexTangents&&c.enable(15),F.anisotropy&&c.enable(16),F.alphaHash&&c.enable(17),F.batching&&c.enable(18),F.dispersion&&c.enable(19),F.batchingColor&&c.enable(20),F.gradientMap&&c.enable(21),F.packedNormalMap&&c.enable(22),F.vertexNormals&&c.enable(23),b.push(c.mask),c.disableAll(),F.fog&&c.enable(0),F.useFog&&c.enable(1),F.flatShading&&c.enable(2),F.logarithmicDepthBuffer&&c.enable(3),F.reversedDepthBuffer&&c.enable(4),F.skinning&&c.enable(5),F.morphTargets&&c.enable(6),F.morphNormals&&c.enable(7),F.morphColors&&c.enable(8),F.premultipliedAlpha&&c.enable(9),F.shadowMapEnabled&&c.enable(10),F.doubleSided&&c.enable(11),F.flipSided&&c.enable(12),F.useDepthPacking&&c.enable(13),F.dithering&&c.enable(14),F.transmission&&c.enable(15),F.sheen&&c.enable(16),F.opaque&&c.enable(17),F.pointsUvs&&c.enable(18),F.decodeVideoTexture&&c.enable(19),F.decodeVideoTextureEmissive&&c.enable(20),F.alphaToCoverage&&c.enable(21),F.numLightProbeGrids>0&&c.enable(22),F.hasPositionAttribute&&c.enable(23),b.push(c.mask)}function N(b){const F=M[b.type];let B;if(F){const G=hr[F];B=Hb.clone(G.uniforms)}else B=b.uniforms;return B}function C(b,F){let B=m.get(F);return B!==void 0?++B.usedTimes:(B=new wP(i,F,b,a),f.push(B),m.set(F,B)),B}function U(b){if(--b.usedTimes===0){const F=f.indexOf(b);f[F]=f[f.length-1],f.pop(),m.delete(b.cacheKey),b.destroy()}}function D(b){d.remove(b)}function k(){d.dispose()}return{getParameters:w,getProgramCacheKey:_,getUniforms:N,acquireProgram:C,releaseProgram:U,releaseShaderCache:D,programs:f,dispose:k}}function PP(){let i=new WeakMap;function e(c){return i.has(c)}function t(c){let d=i.get(c);return d===void 0&&(d={},i.set(c,d)),d}function r(c){i.delete(c)}function a(c,d,h){i.get(c)[d]=h}function l(){i=new WeakMap}return{has:e,get:t,remove:r,update:a,dispose:l}}function NP(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function Yv(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function Kv(){const i=[];let e=0;const t=[],r=[],a=[];function l(){e=0,t.length=0,r.length=0,a.length=0}function c(x){let M=0;return x.isInstancedMesh&&(M+=2),x.isSkinnedMesh&&(M+=1),M}function d(x,M,E,w,_,S){let L=i[e];return L===void 0?(L={id:x.id,object:x,geometry:M,material:E,materialVariant:c(x),groupOrder:w,renderOrder:x.renderOrder,z:_,group:S},i[e]=L):(L.id=x.id,L.object=x,L.geometry=M,L.material=E,L.materialVariant=c(x),L.groupOrder=w,L.renderOrder=x.renderOrder,L.z=_,L.group=S),e++,L}function h(x,M,E,w,_,S){const L=d(x,M,E,w,_,S);E.transmission>0?r.push(L):E.transparent===!0?a.push(L):t.push(L)}function f(x,M,E,w,_,S){const L=d(x,M,E,w,_,S);E.transmission>0?r.unshift(L):E.transparent===!0?a.unshift(L):t.unshift(L)}function m(x,M,E){t.length>1&&t.sort(x||NP),r.length>1&&r.sort(M||Yv),a.length>1&&a.sort(M||Yv),E&&(t.reverse(),r.reverse(),a.reverse())}function g(){for(let x=e,M=i.length;x<M;x++){const E=i[x];if(E.id===null)break;E.id=null,E.object=null,E.geometry=null,E.material=null,E.group=null}}return{opaque:t,transmissive:r,transparent:a,init:l,push:h,unshift:f,finish:g,sort:m}}function LP(){let i=new WeakMap;function e(r,a){const l=i.get(r);let c;return l===void 0?(c=new Kv,i.set(r,[c])):a>=l.length?(c=new Kv,l.push(c)):c=l[a],c}function t(){i=new WeakMap}return{get:e,dispose:t}}function DP(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new te,color:new xt};break;case"SpotLight":t={position:new te,direction:new te,color:new xt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new te,color:new xt,distance:0,decay:0};break;case"HemisphereLight":t={direction:new te,skyColor:new xt,groundColor:new xt};break;case"RectAreaLight":t={color:new xt,position:new te,halfWidth:new te,halfHeight:new te};break}return i[e.id]=t,t}}}function IP(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new dt};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new dt};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new dt,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let UP=0;function FP(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function OP(i){const e=new DP,t=IP(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let f=0;f<9;f++)r.probe.push(new te);const a=new te,l=new an,c=new an;function d(f){let m=0,g=0,x=0;for(let F=0;F<9;F++)r.probe[F].set(0,0,0);let M=0,E=0,w=0,_=0,S=0,L=0,N=0,C=0,U=0,D=0,k=0;f.sort(FP);for(let F=0,B=f.length;F<B;F++){const G=f[F],Z=G.color,re=G.intensity,he=G.distance;let z=null;if(G.shadow&&G.shadow.map&&(G.shadow.map.texture.format===ba?z=G.shadow.map.texture:z=G.shadow.map.depthTexture||G.shadow.map.texture),G.isAmbientLight)m+=Z.r*re,g+=Z.g*re,x+=Z.b*re;else if(G.isLightProbe){for(let ae=0;ae<9;ae++)r.probe[ae].addScaledVector(G.sh.coefficients[ae],re);k++}else if(G.isDirectionalLight){const ae=e.get(G);if(ae.color.copy(G.color).multiplyScalar(G.intensity),G.castShadow){const ee=G.shadow,q=t.get(G);q.shadowIntensity=ee.intensity,q.shadowBias=ee.bias,q.shadowNormalBias=ee.normalBias,q.shadowRadius=ee.radius,q.shadowMapSize=ee.mapSize,r.directionalShadow[M]=q,r.directionalShadowMap[M]=z,r.directionalShadowMatrix[M]=G.shadow.matrix,L++}r.directional[M]=ae,M++}else if(G.isSpotLight){const ae=e.get(G);ae.position.setFromMatrixPosition(G.matrixWorld),ae.color.copy(Z).multiplyScalar(re),ae.distance=he,ae.coneCos=Math.cos(G.angle),ae.penumbraCos=Math.cos(G.angle*(1-G.penumbra)),ae.decay=G.decay,r.spot[w]=ae;const ee=G.shadow;if(G.map&&(r.spotLightMap[U]=G.map,U++,ee.updateMatrices(G),G.castShadow&&D++),r.spotLightMatrix[w]=ee.matrix,G.castShadow){const q=t.get(G);q.shadowIntensity=ee.intensity,q.shadowBias=ee.bias,q.shadowNormalBias=ee.normalBias,q.shadowRadius=ee.radius,q.shadowMapSize=ee.mapSize,r.spotShadow[w]=q,r.spotShadowMap[w]=z,C++}w++}else if(G.isRectAreaLight){const ae=e.get(G);ae.color.copy(Z).multiplyScalar(re),ae.halfWidth.set(G.width*.5,0,0),ae.halfHeight.set(0,G.height*.5,0),r.rectArea[_]=ae,_++}else if(G.isPointLight){const ae=e.get(G);if(ae.color.copy(G.color).multiplyScalar(G.intensity),ae.distance=G.distance,ae.decay=G.decay,G.castShadow){const ee=G.shadow,q=t.get(G);q.shadowIntensity=ee.intensity,q.shadowBias=ee.bias,q.shadowNormalBias=ee.normalBias,q.shadowRadius=ee.radius,q.shadowMapSize=ee.mapSize,q.shadowCameraNear=ee.camera.near,q.shadowCameraFar=ee.camera.far,r.pointShadow[E]=q,r.pointShadowMap[E]=z,r.pointShadowMatrix[E]=G.shadow.matrix,N++}r.point[E]=ae,E++}else if(G.isHemisphereLight){const ae=e.get(G);ae.skyColor.copy(G.color).multiplyScalar(re),ae.groundColor.copy(G.groundColor).multiplyScalar(re),r.hemi[S]=ae,S++}}_>0&&(i.has("OES_texture_float_linear")===!0?(r.rectAreaLTC1=ke.LTC_FLOAT_1,r.rectAreaLTC2=ke.LTC_FLOAT_2):(r.rectAreaLTC1=ke.LTC_HALF_1,r.rectAreaLTC2=ke.LTC_HALF_2)),r.ambient[0]=m,r.ambient[1]=g,r.ambient[2]=x;const b=r.hash;(b.directionalLength!==M||b.pointLength!==E||b.spotLength!==w||b.rectAreaLength!==_||b.hemiLength!==S||b.numDirectionalShadows!==L||b.numPointShadows!==N||b.numSpotShadows!==C||b.numSpotMaps!==U||b.numLightProbes!==k)&&(r.directional.length=M,r.spot.length=w,r.rectArea.length=_,r.point.length=E,r.hemi.length=S,r.directionalShadow.length=L,r.directionalShadowMap.length=L,r.pointShadow.length=N,r.pointShadowMap.length=N,r.spotShadow.length=C,r.spotShadowMap.length=C,r.directionalShadowMatrix.length=L,r.pointShadowMatrix.length=N,r.spotLightMatrix.length=C+U-D,r.spotLightMap.length=U,r.numSpotLightShadowsWithMaps=D,r.numLightProbes=k,b.directionalLength=M,b.pointLength=E,b.spotLength=w,b.rectAreaLength=_,b.hemiLength=S,b.numDirectionalShadows=L,b.numPointShadows=N,b.numSpotShadows=C,b.numSpotMaps=U,b.numLightProbes=k,r.version=UP++)}function h(f,m){let g=0,x=0,M=0,E=0,w=0;const _=m.matrixWorldInverse;for(let S=0,L=f.length;S<L;S++){const N=f[S];if(N.isDirectionalLight){const C=r.directional[g];C.direction.setFromMatrixPosition(N.matrixWorld),a.setFromMatrixPosition(N.target.matrixWorld),C.direction.sub(a),C.direction.transformDirection(_),g++}else if(N.isSpotLight){const C=r.spot[M];C.position.setFromMatrixPosition(N.matrixWorld),C.position.applyMatrix4(_),C.direction.setFromMatrixPosition(N.matrixWorld),a.setFromMatrixPosition(N.target.matrixWorld),C.direction.sub(a),C.direction.transformDirection(_),M++}else if(N.isRectAreaLight){const C=r.rectArea[E];C.position.setFromMatrixPosition(N.matrixWorld),C.position.applyMatrix4(_),c.identity(),l.copy(N.matrixWorld),l.premultiply(_),c.extractRotation(l),C.halfWidth.set(N.width*.5,0,0),C.halfHeight.set(0,N.height*.5,0),C.halfWidth.applyMatrix4(c),C.halfHeight.applyMatrix4(c),E++}else if(N.isPointLight){const C=r.point[x];C.position.setFromMatrixPosition(N.matrixWorld),C.position.applyMatrix4(_),x++}else if(N.isHemisphereLight){const C=r.hemi[w];C.direction.setFromMatrixPosition(N.matrixWorld),C.direction.transformDirection(_),w++}}}return{setup:d,setupView:h,state:r}}function Qv(i){const e=new OP(i),t=[],r=[],a=[];function l(x){g.camera=x,t.length=0,r.length=0,a.length=0}function c(x){t.push(x)}function d(x){r.push(x)}function h(x){a.push(x)}function f(){e.setup(t)}function m(x){e.setupView(t,x)}const g={lightsArray:t,shadowsArray:r,lightProbeGridArray:a,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:l,state:g,setupLights:f,setupLightsView:m,pushLight:c,pushShadow:d,pushLightProbeGrid:h}}function kP(i){let e=new WeakMap;function t(a,l=0){const c=e.get(a);let d;return c===void 0?(d=new Qv(i),e.set(a,[d])):l>=c.length?(d=new Qv(i),c.push(d)):d=c[l],d}function r(){e=new WeakMap}return{get:t,dispose:r}}const zP=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,BP=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,HP=[new te(1,0,0),new te(-1,0,0),new te(0,1,0),new te(0,-1,0),new te(0,0,1),new te(0,0,-1)],VP=[new te(0,-1,0),new te(0,-1,0),new te(0,0,1),new te(0,0,-1),new te(0,-1,0),new te(0,-1,0)],Zv=new an,Il=new te,Yf=new te;function GP(i,e,t){let r=new Hm;const a=new dt,l=new dt,c=new un,d=new Xb,h=new $b,f={},m=t.maxTextureSize,g={[Fs]:hi,[hi]:Fs,[fr]:fr},x=new Sr({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new dt},radius:{value:4}},vertexShader:zP,fragmentShader:BP}),M=x.clone();M.defines.HORIZONTAL_PASS=1;const E=new Mi;E.setAttribute("position",new vr(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const w=new Zi(E,x),_=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=$u;let S=this.type;this.render=function(D,k,b){if(_.enabled===!1||_.autoUpdate===!1&&_.needsUpdate===!1||D.length===0)return;this.type===Dw&&(lt("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=$u);const F=i.getRenderTarget(),B=i.getActiveCubeFace(),G=i.getActiveMipmapLevel(),Z=i.state;Z.setBlending(jr),Z.buffers.depth.getReversed()===!0?Z.buffers.color.setClear(0,0,0,0):Z.buffers.color.setClear(1,1,1,1),Z.buffers.depth.setTest(!0),Z.setScissorTest(!1);const re=S!==this.type;re&&k.traverse(function(he){he.material&&(Array.isArray(he.material)?he.material.forEach(z=>z.needsUpdate=!0):he.material.needsUpdate=!0)});for(let he=0,z=D.length;he<z;he++){const ae=D[he],ee=ae.shadow;if(ee===void 0){lt("WebGLShadowMap:",ae,"has no shadow.");continue}if(ee.autoUpdate===!1&&ee.needsUpdate===!1)continue;a.copy(ee.mapSize);const q=ee.getFrameExtents();a.multiply(q),l.copy(ee.mapSize),(a.x>m||a.y>m)&&(a.x>m&&(l.x=Math.floor(m/q.x),a.x=l.x*q.x,ee.mapSize.x=l.x),a.y>m&&(l.y=Math.floor(m/q.y),a.y=l.y*q.y,ee.mapSize.y=l.y));const de=i.state.buffers.depth.getReversed();if(ee.camera._reversedDepth=de,ee.map===null||re===!0){if(ee.map!==null&&(ee.map.depthTexture!==null&&(ee.map.depthTexture.dispose(),ee.map.depthTexture=null),ee.map.dispose()),this.type===Ol){if(ae.isPointLight){lt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}ee.map=new xr(a.x,a.y,{format:ba,type:qr,minFilter:Wn,magFilter:Wn,generateMipmaps:!1}),ee.map.texture.name=ae.name+".shadowMap",ee.map.depthTexture=new Uo(a.x,a.y,pr),ee.map.depthTexture.name=ae.name+".shadowMapDepth",ee.map.depthTexture.format=Yr,ee.map.depthTexture.compareFunction=null,ee.map.depthTexture.minFilter=Fn,ee.map.depthTexture.magFilter=Fn}else ae.isPointLight?(ee.map=new Ay(a.x),ee.map.depthTexture=new zb(a.x,_r)):(ee.map=new xr(a.x,a.y),ee.map.depthTexture=new Uo(a.x,a.y,_r)),ee.map.depthTexture.name=ae.name+".shadowMap",ee.map.depthTexture.format=Yr,this.type===$u?(ee.map.depthTexture.compareFunction=de?zm:km,ee.map.depthTexture.minFilter=Wn,ee.map.depthTexture.magFilter=Wn):(ee.map.depthTexture.compareFunction=null,ee.map.depthTexture.minFilter=Fn,ee.map.depthTexture.magFilter=Fn);ee.camera.updateProjectionMatrix()}const ce=ee.map.isWebGLCubeRenderTarget?6:1;for(let P=0;P<ce;P++){if(ee.map.isWebGLCubeRenderTarget)i.setRenderTarget(ee.map,P),i.clear();else{P===0&&(i.setRenderTarget(ee.map),i.clear());const X=ee.getViewport(P);c.set(l.x*X.x,l.y*X.y,l.x*X.z,l.y*X.w),Z.viewport(c)}if(ae.isPointLight){const X=ee.camera,Le=ee.matrix,Be=ae.distance||X.far;Be!==X.far&&(X.far=Be,X.updateProjectionMatrix()),Il.setFromMatrixPosition(ae.matrixWorld),X.position.copy(Il),Yf.copy(X.position),Yf.add(HP[P]),X.up.copy(VP[P]),X.lookAt(Yf),X.updateMatrixWorld(),Le.makeTranslation(-Il.x,-Il.y,-Il.z),Zv.multiplyMatrices(X.projectionMatrix,X.matrixWorldInverse),ee._frustum.setFromProjectionMatrix(Zv,X.coordinateSystem,X.reversedDepth)}else ee.updateMatrices(ae);r=ee.getFrustum(),C(k,b,ee.camera,ae,this.type)}ee.isPointLightShadow!==!0&&this.type===Ol&&L(ee,b),ee.needsUpdate=!1}S=this.type,_.needsUpdate=!1,i.setRenderTarget(F,B,G)};function L(D,k){const b=e.update(w);x.defines.VSM_SAMPLES!==D.blurSamples&&(x.defines.VSM_SAMPLES=D.blurSamples,M.defines.VSM_SAMPLES=D.blurSamples,x.needsUpdate=!0,M.needsUpdate=!0),D.mapPass===null&&(D.mapPass=new xr(a.x,a.y,{format:ba,type:qr})),x.uniforms.shadow_pass.value=D.map.depthTexture,x.uniforms.resolution.value=D.mapSize,x.uniforms.radius.value=D.radius,i.setRenderTarget(D.mapPass),i.clear(),i.renderBufferDirect(k,null,b,x,w,null),M.uniforms.shadow_pass.value=D.mapPass.texture,M.uniforms.resolution.value=D.mapSize,M.uniforms.radius.value=D.radius,i.setRenderTarget(D.map),i.clear(),i.renderBufferDirect(k,null,b,M,w,null)}function N(D,k,b,F){let B=null;const G=b.isPointLight===!0?D.customDistanceMaterial:D.customDepthMaterial;if(G!==void 0)B=G;else if(B=b.isPointLight===!0?h:d,i.localClippingEnabled&&k.clipShadows===!0&&Array.isArray(k.clippingPlanes)&&k.clippingPlanes.length!==0||k.displacementMap&&k.displacementScale!==0||k.alphaMap&&k.alphaTest>0||k.map&&k.alphaTest>0||k.alphaToCoverage===!0){const Z=B.uuid,re=k.uuid;let he=f[Z];he===void 0&&(he={},f[Z]=he);let z=he[re];z===void 0&&(z=B.clone(),he[re]=z,k.addEventListener("dispose",U)),B=z}if(B.visible=k.visible,B.wireframe=k.wireframe,F===Ol?B.side=k.shadowSide!==null?k.shadowSide:k.side:B.side=k.shadowSide!==null?k.shadowSide:g[k.side],B.alphaMap=k.alphaMap,B.alphaTest=k.alphaToCoverage===!0?.5:k.alphaTest,B.map=k.map,B.clipShadows=k.clipShadows,B.clippingPlanes=k.clippingPlanes,B.clipIntersection=k.clipIntersection,B.displacementMap=k.displacementMap,B.displacementScale=k.displacementScale,B.displacementBias=k.displacementBias,B.wireframeLinewidth=k.wireframeLinewidth,B.linewidth=k.linewidth,b.isPointLight===!0&&B.isMeshDistanceMaterial===!0){const Z=i.properties.get(B);Z.light=b}return B}function C(D,k,b,F,B){if(D.visible===!1)return;if(D.layers.test(k.layers)&&(D.isMesh||D.isLine||D.isPoints)&&(D.castShadow||D.receiveShadow&&B===Ol)&&(!D.frustumCulled||r.intersectsObject(D))){D.modelViewMatrix.multiplyMatrices(b.matrixWorldInverse,D.matrixWorld);const re=e.update(D),he=D.material;if(Array.isArray(he)){const z=re.groups;for(let ae=0,ee=z.length;ae<ee;ae++){const q=z[ae],de=he[q.materialIndex];if(de&&de.visible){const ce=N(D,de,F,B);D.onBeforeShadow(i,D,k,b,re,ce,q),i.renderBufferDirect(b,null,re,ce,D,q),D.onAfterShadow(i,D,k,b,re,ce,q)}}}else if(he.visible){const z=N(D,he,F,B);D.onBeforeShadow(i,D,k,b,re,z,null),i.renderBufferDirect(b,null,re,z,D,null),D.onAfterShadow(i,D,k,b,re,z,null)}}const Z=D.children;for(let re=0,he=Z.length;re<he;re++)C(Z[re],k,b,F,B)}function U(D){D.target.removeEventListener("dispose",U);for(const b in f){const F=f[b],B=D.target.uuid;B in F&&(F[B].dispose(),delete F[B])}}}function jP(i,e){function t(){let $=!1;const Pe=new un;let _e=null;const De=new un(0,0,0,0);return{setMask:function(Fe){_e!==Fe&&!$&&(i.colorMask(Fe,Fe,Fe,Fe),_e=Fe)},setLocked:function(Fe){$=Fe},setClear:function(Fe,Me,Ye,$e,jt){jt===!0&&(Fe*=$e,Me*=$e,Ye*=$e),Pe.set(Fe,Me,Ye,$e),De.equals(Pe)===!1&&(i.clearColor(Fe,Me,Ye,$e),De.copy(Pe))},reset:function(){$=!1,_e=null,De.set(-1,0,0,0)}}}function r(){let $=!1,Pe=!1,_e=null,De=null,Fe=null;return{setReversed:function(Me){if(Pe!==Me){const Ye=e.get("EXT_clip_control");Me?Ye.clipControlEXT(Ye.LOWER_LEFT_EXT,Ye.ZERO_TO_ONE_EXT):Ye.clipControlEXT(Ye.LOWER_LEFT_EXT,Ye.NEGATIVE_ONE_TO_ONE_EXT),Pe=Me;const $e=Fe;Fe=null,this.setClear($e)}},getReversed:function(){return Pe},setTest:function(Me){Me?ge(i.DEPTH_TEST):Ue(i.DEPTH_TEST)},setMask:function(Me){_e!==Me&&!$&&(i.depthMask(Me),_e=Me)},setFunc:function(Me){if(Pe&&(Me=hb[Me]),De!==Me){switch(Me){case xp:i.depthFunc(i.NEVER);break;case vp:i.depthFunc(i.ALWAYS);break;case _p:i.depthFunc(i.LESS);break;case Do:i.depthFunc(i.LEQUAL);break;case yp:i.depthFunc(i.EQUAL);break;case Sp:i.depthFunc(i.GEQUAL);break;case Mp:i.depthFunc(i.GREATER);break;case Ep:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}De=Me}},setLocked:function(Me){$=Me},setClear:function(Me){Fe!==Me&&(Fe=Me,Pe&&(Me=1-Me),i.clearDepth(Me))},reset:function(){$=!1,_e=null,De=null,Fe=null,Pe=!1}}}function a(){let $=!1,Pe=null,_e=null,De=null,Fe=null,Me=null,Ye=null,$e=null,jt=null;return{setTest:function(Ut){$||(Ut?ge(i.STENCIL_TEST):Ue(i.STENCIL_TEST))},setMask:function(Ut){Pe!==Ut&&!$&&(i.stencilMask(Ut),Pe=Ut)},setFunc:function(Ut,On,wi){(_e!==Ut||De!==On||Fe!==wi)&&(i.stencilFunc(Ut,On,wi),_e=Ut,De=On,Fe=wi)},setOp:function(Ut,On,wi){(Me!==Ut||Ye!==On||$e!==wi)&&(i.stencilOp(Ut,On,wi),Me=Ut,Ye=On,$e=wi)},setLocked:function(Ut){$=Ut},setClear:function(Ut){jt!==Ut&&(i.clearStencil(Ut),jt=Ut)},reset:function(){$=!1,Pe=null,_e=null,De=null,Fe=null,Me=null,Ye=null,$e=null,jt=null}}}const l=new t,c=new r,d=new a,h=new WeakMap,f=new WeakMap;let m={},g={},x={},M=new WeakMap,E=[],w=null,_=!1,S=null,L=null,N=null,C=null,U=null,D=null,k=null,b=new xt(0,0,0),F=0,B=!1,G=null,Z=null,re=null,he=null,z=null;const ae=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let ee=!1,q=0;const de=i.getParameter(i.VERSION);de.indexOf("WebGL")!==-1?(q=parseFloat(/^WebGL (\d)/.exec(de)[1]),ee=q>=1):de.indexOf("OpenGL ES")!==-1&&(q=parseFloat(/^OpenGL ES (\d)/.exec(de)[1]),ee=q>=2);let ce=null,P={};const X=i.getParameter(i.SCISSOR_BOX),Le=i.getParameter(i.VIEWPORT),Be=new un().fromArray(X),Ge=new un().fromArray(Le);function le($,Pe,_e,De){const Fe=new Uint8Array(4),Me=i.createTexture();i.bindTexture($,Me),i.texParameteri($,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri($,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Ye=0;Ye<_e;Ye++)$===i.TEXTURE_3D||$===i.TEXTURE_2D_ARRAY?i.texImage3D(Pe,0,i.RGBA,1,1,De,0,i.RGBA,i.UNSIGNED_BYTE,Fe):i.texImage2D(Pe+Ye,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Fe);return Me}const ye={};ye[i.TEXTURE_2D]=le(i.TEXTURE_2D,i.TEXTURE_2D,1),ye[i.TEXTURE_CUBE_MAP]=le(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),ye[i.TEXTURE_2D_ARRAY]=le(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),ye[i.TEXTURE_3D]=le(i.TEXTURE_3D,i.TEXTURE_3D,1,1),l.setClear(0,0,0,1),c.setClear(1),d.setClear(0),ge(i.DEPTH_TEST),c.setFunc(Do),kt(!1),Xt(Wx),ge(i.CULL_FACE),mt(jr);function ge($){m[$]!==!0&&(i.enable($),m[$]=!0)}function Ue($){m[$]!==!1&&(i.disable($),m[$]=!1)}function Ze($,Pe){return x[$]!==Pe?(i.bindFramebuffer($,Pe),x[$]=Pe,$===i.DRAW_FRAMEBUFFER&&(x[i.FRAMEBUFFER]=Pe),$===i.FRAMEBUFFER&&(x[i.DRAW_FRAMEBUFFER]=Pe),!0):!1}function tt($,Pe){let _e=E,De=!1;if($){_e=M.get(Pe),_e===void 0&&(_e=[],M.set(Pe,_e));const Fe=$.textures;if(_e.length!==Fe.length||_e[0]!==i.COLOR_ATTACHMENT0){for(let Me=0,Ye=Fe.length;Me<Ye;Me++)_e[Me]=i.COLOR_ATTACHMENT0+Me;_e.length=Fe.length,De=!0}}else _e[0]!==i.BACK&&(_e[0]=i.BACK,De=!0);De&&i.drawBuffers(_e)}function Gt($){return w!==$?(i.useProgram($),w=$,!0):!1}const ut={[la]:i.FUNC_ADD,[Uw]:i.FUNC_SUBTRACT,[Fw]:i.FUNC_REVERSE_SUBTRACT};ut[Ow]=i.MIN,ut[kw]=i.MAX;const Rt={[zw]:i.ZERO,[Bw]:i.ONE,[Hw]:i.SRC_COLOR,[mp]:i.SRC_ALPHA,[$w]:i.SRC_ALPHA_SATURATE,[Ww]:i.DST_COLOR,[Gw]:i.DST_ALPHA,[Vw]:i.ONE_MINUS_SRC_COLOR,[gp]:i.ONE_MINUS_SRC_ALPHA,[Xw]:i.ONE_MINUS_DST_COLOR,[jw]:i.ONE_MINUS_DST_ALPHA,[qw]:i.CONSTANT_COLOR,[Yw]:i.ONE_MINUS_CONSTANT_COLOR,[Kw]:i.CONSTANT_ALPHA,[Qw]:i.ONE_MINUS_CONSTANT_ALPHA};function mt($,Pe,_e,De,Fe,Me,Ye,$e,jt,Ut){if($===jr){_===!0&&(Ue(i.BLEND),_=!1);return}if(_===!1&&(ge(i.BLEND),_=!0),$!==Iw){if($!==S||Ut!==B){if((L!==la||U!==la)&&(i.blendEquation(i.FUNC_ADD),L=la,U=la),Ut)switch($){case xo:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Xx:i.blendFunc(i.ONE,i.ONE);break;case $x:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case qx:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Dt("WebGLState: Invalid blending: ",$);break}else switch($){case xo:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Xx:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case $x:Dt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case qx:Dt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Dt("WebGLState: Invalid blending: ",$);break}N=null,C=null,D=null,k=null,b.set(0,0,0),F=0,S=$,B=Ut}return}Fe=Fe||Pe,Me=Me||_e,Ye=Ye||De,(Pe!==L||Fe!==U)&&(i.blendEquationSeparate(ut[Pe],ut[Fe]),L=Pe,U=Fe),(_e!==N||De!==C||Me!==D||Ye!==k)&&(i.blendFuncSeparate(Rt[_e],Rt[De],Rt[Me],Rt[Ye]),N=_e,C=De,D=Me,k=Ye),($e.equals(b)===!1||jt!==F)&&(i.blendColor($e.r,$e.g,$e.b,jt),b.copy($e),F=jt),S=$,B=!1}function vt($,Pe){$.side===fr?Ue(i.CULL_FACE):ge(i.CULL_FACE);let _e=$.side===hi;Pe&&(_e=!_e),kt(_e),$.blending===xo&&$.transparent===!1?mt(jr):mt($.blending,$.blendEquation,$.blendSrc,$.blendDst,$.blendEquationAlpha,$.blendSrcAlpha,$.blendDstAlpha,$.blendColor,$.blendAlpha,$.premultipliedAlpha),c.setFunc($.depthFunc),c.setTest($.depthTest),c.setMask($.depthWrite),l.setMask($.colorWrite);const De=$.stencilWrite;d.setTest(De),De&&(d.setMask($.stencilWriteMask),d.setFunc($.stencilFunc,$.stencilRef,$.stencilFuncMask),d.setOp($.stencilFail,$.stencilZFail,$.stencilZPass)),$t($.polygonOffset,$.polygonOffsetFactor,$.polygonOffsetUnits),$.alphaToCoverage===!0?ge(i.SAMPLE_ALPHA_TO_COVERAGE):Ue(i.SAMPLE_ALPHA_TO_COVERAGE)}function kt($){G!==$&&($?i.frontFace(i.CW):i.frontFace(i.CCW),G=$)}function Xt($){$!==Nw?(ge(i.CULL_FACE),$!==Z&&($===Wx?i.cullFace(i.BACK):$===Lw?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):Ue(i.CULL_FACE),Z=$}function qt($){$!==re&&(ee&&i.lineWidth($),re=$)}function $t($,Pe,_e){$?(ge(i.POLYGON_OFFSET_FILL),(he!==Pe||z!==_e)&&(he=Pe,z=_e,c.getReversed()&&(Pe=-Pe),i.polygonOffset(Pe,_e))):Ue(i.POLYGON_OFFSET_FILL)}function Et($){$?ge(i.SCISSOR_TEST):Ue(i.SCISSOR_TEST)}function zt($){$===void 0&&($=i.TEXTURE0+ae-1),ce!==$&&(i.activeTexture($),ce=$)}function Y($,Pe,_e){_e===void 0&&(ce===null?_e=i.TEXTURE0+ae-1:_e=ce);let De=P[_e];De===void 0&&(De={type:void 0,texture:void 0},P[_e]=De),(De.type!==$||De.texture!==Pe)&&(ce!==_e&&(i.activeTexture(_e),ce=_e),i.bindTexture($,Pe||ye[$]),De.type=$,De.texture=Pe)}function pn(){const $=P[ce];$!==void 0&&$.type!==void 0&&(i.bindTexture($.type,null),$.type=void 0,$.texture=void 0)}function wt(){try{i.compressedTexImage2D(...arguments)}catch($){Dt("WebGLState:",$)}}function O(){try{i.compressedTexImage3D(...arguments)}catch($){Dt("WebGLState:",$)}}function T(){try{i.texSubImage2D(...arguments)}catch($){Dt("WebGLState:",$)}}function I(){try{i.texSubImage3D(...arguments)}catch($){Dt("WebGLState:",$)}}function Q(){try{i.compressedTexSubImage2D(...arguments)}catch($){Dt("WebGLState:",$)}}function me(){try{i.compressedTexSubImage3D(...arguments)}catch($){Dt("WebGLState:",$)}}function Ee(){try{i.texStorage2D(...arguments)}catch($){Dt("WebGLState:",$)}}function Re(){try{i.texStorage3D(...arguments)}catch($){Dt("WebGLState:",$)}}function xe(){try{i.texImage2D(...arguments)}catch($){Dt("WebGLState:",$)}}function ve(){try{i.texImage3D(...arguments)}catch($){Dt("WebGLState:",$)}}function Ie($){return g[$]!==void 0?g[$]:i.getParameter($)}function We($,Pe){g[$]!==Pe&&(i.pixelStorei($,Pe),g[$]=Pe)}function ne($){Be.equals($)===!1&&(i.scissor($.x,$.y,$.z,$.w),Be.copy($))}function Se($){Ge.equals($)===!1&&(i.viewport($.x,$.y,$.z,$.w),Ge.copy($))}function Oe($,Pe){let _e=f.get(Pe);_e===void 0&&(_e=new WeakMap,f.set(Pe,_e));let De=_e.get($);De===void 0&&(De=i.getUniformBlockIndex(Pe,$.name),_e.set($,De))}function nt($,Pe){const De=f.get(Pe).get($);h.get(Pe)!==De&&(i.uniformBlockBinding(Pe,De,$.__bindingPointIndex),h.set(Pe,De))}function st(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),c.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),m={},g={},ce=null,P={},x={},M=new WeakMap,E=[],w=null,_=!1,S=null,L=null,N=null,C=null,U=null,D=null,k=null,b=new xt(0,0,0),F=0,B=!1,G=null,Z=null,re=null,he=null,z=null,Be.set(0,0,i.canvas.width,i.canvas.height),Ge.set(0,0,i.canvas.width,i.canvas.height),l.reset(),c.reset(),d.reset()}return{buffers:{color:l,depth:c,stencil:d},enable:ge,disable:Ue,bindFramebuffer:Ze,drawBuffers:tt,useProgram:Gt,setBlending:mt,setMaterial:vt,setFlipSided:kt,setCullFace:Xt,setLineWidth:qt,setPolygonOffset:$t,setScissorTest:Et,activeTexture:zt,bindTexture:Y,unbindTexture:pn,compressedTexImage2D:wt,compressedTexImage3D:O,texImage2D:xe,texImage3D:ve,pixelStorei:We,getParameter:Ie,updateUBOMapping:Oe,uniformBlockBinding:nt,texStorage2D:Ee,texStorage3D:Re,texSubImage2D:T,texSubImage3D:I,compressedTexSubImage2D:Q,compressedTexSubImage3D:me,scissor:ne,viewport:Se,reset:st}}function WP(i,e,t,r,a,l,c){const d=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,h=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),f=new dt,m=new WeakMap,g=new Set;let x;const M=new WeakMap;let E=!1;try{E=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function w(O,T){return E?new OffscreenCanvas(O,T):Yl("canvas")}function _(O,T,I){let Q=1;const me=wt(O);if((me.width>I||me.height>I)&&(Q=I/Math.max(me.width,me.height)),Q<1)if(typeof HTMLImageElement<"u"&&O instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&O instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&O instanceof ImageBitmap||typeof VideoFrame<"u"&&O instanceof VideoFrame){const Ee=Math.floor(Q*me.width),Re=Math.floor(Q*me.height);x===void 0&&(x=w(Ee,Re));const xe=T?w(Ee,Re):x;return xe.width=Ee,xe.height=Re,xe.getContext("2d").drawImage(O,0,0,Ee,Re),lt("WebGLRenderer: Texture has been resized from ("+me.width+"x"+me.height+") to ("+Ee+"x"+Re+")."),xe}else return"data"in O&&lt("WebGLRenderer: Image in DataTexture is too big ("+me.width+"x"+me.height+")."),O;return O}function S(O){return O.generateMipmaps}function L(O){i.generateMipmap(O)}function N(O){return O.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:O.isWebGL3DRenderTarget?i.TEXTURE_3D:O.isWebGLArrayRenderTarget||O.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function C(O,T,I,Q,me,Ee=!1){if(O!==null){if(i[O]!==void 0)return i[O];lt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+O+"'")}let Re;Q&&(Re=e.get("EXT_texture_norm16"),Re||lt("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let xe=T;if(T===i.RED&&(I===i.FLOAT&&(xe=i.R32F),I===i.HALF_FLOAT&&(xe=i.R16F),I===i.UNSIGNED_BYTE&&(xe=i.R8),I===i.UNSIGNED_SHORT&&Re&&(xe=Re.R16_EXT),I===i.SHORT&&Re&&(xe=Re.R16_SNORM_EXT)),T===i.RED_INTEGER&&(I===i.UNSIGNED_BYTE&&(xe=i.R8UI),I===i.UNSIGNED_SHORT&&(xe=i.R16UI),I===i.UNSIGNED_INT&&(xe=i.R32UI),I===i.BYTE&&(xe=i.R8I),I===i.SHORT&&(xe=i.R16I),I===i.INT&&(xe=i.R32I)),T===i.RG&&(I===i.FLOAT&&(xe=i.RG32F),I===i.HALF_FLOAT&&(xe=i.RG16F),I===i.UNSIGNED_BYTE&&(xe=i.RG8),I===i.UNSIGNED_SHORT&&Re&&(xe=Re.RG16_EXT),I===i.SHORT&&Re&&(xe=Re.RG16_SNORM_EXT)),T===i.RG_INTEGER&&(I===i.UNSIGNED_BYTE&&(xe=i.RG8UI),I===i.UNSIGNED_SHORT&&(xe=i.RG16UI),I===i.UNSIGNED_INT&&(xe=i.RG32UI),I===i.BYTE&&(xe=i.RG8I),I===i.SHORT&&(xe=i.RG16I),I===i.INT&&(xe=i.RG32I)),T===i.RGB_INTEGER&&(I===i.UNSIGNED_BYTE&&(xe=i.RGB8UI),I===i.UNSIGNED_SHORT&&(xe=i.RGB16UI),I===i.UNSIGNED_INT&&(xe=i.RGB32UI),I===i.BYTE&&(xe=i.RGB8I),I===i.SHORT&&(xe=i.RGB16I),I===i.INT&&(xe=i.RGB32I)),T===i.RGBA_INTEGER&&(I===i.UNSIGNED_BYTE&&(xe=i.RGBA8UI),I===i.UNSIGNED_SHORT&&(xe=i.RGBA16UI),I===i.UNSIGNED_INT&&(xe=i.RGBA32UI),I===i.BYTE&&(xe=i.RGBA8I),I===i.SHORT&&(xe=i.RGBA16I),I===i.INT&&(xe=i.RGBA32I)),T===i.RGB&&(I===i.UNSIGNED_SHORT&&Re&&(xe=Re.RGB16_EXT),I===i.SHORT&&Re&&(xe=Re.RGB16_SNORM_EXT),I===i.UNSIGNED_INT_5_9_9_9_REV&&(xe=i.RGB9_E5),I===i.UNSIGNED_INT_10F_11F_11F_REV&&(xe=i.R11F_G11F_B10F)),T===i.RGBA){const ve=Ee?cd:Pt.getTransfer(me);I===i.FLOAT&&(xe=i.RGBA32F),I===i.HALF_FLOAT&&(xe=i.RGBA16F),I===i.UNSIGNED_BYTE&&(xe=ve===Vt?i.SRGB8_ALPHA8:i.RGBA8),I===i.UNSIGNED_SHORT&&Re&&(xe=Re.RGBA16_EXT),I===i.SHORT&&Re&&(xe=Re.RGBA16_SNORM_EXT),I===i.UNSIGNED_SHORT_4_4_4_4&&(xe=i.RGBA4),I===i.UNSIGNED_SHORT_5_5_5_1&&(xe=i.RGB5_A1)}return(xe===i.R16F||xe===i.R32F||xe===i.RG16F||xe===i.RG32F||xe===i.RGBA16F||xe===i.RGBA32F)&&e.get("EXT_color_buffer_float"),xe}function U(O,T){let I;return O?T===null||T===_r||T===$l?I=i.DEPTH24_STENCIL8:T===pr?I=i.DEPTH32F_STENCIL8:T===Xl&&(I=i.DEPTH24_STENCIL8,lt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):T===null||T===_r||T===$l?I=i.DEPTH_COMPONENT24:T===pr?I=i.DEPTH_COMPONENT32F:T===Xl&&(I=i.DEPTH_COMPONENT16),I}function D(O,T){return S(O)===!0||O.isFramebufferTexture&&O.minFilter!==Fn&&O.minFilter!==Wn?Math.log2(Math.max(T.width,T.height))+1:O.mipmaps!==void 0&&O.mipmaps.length>0?O.mipmaps.length:O.isCompressedTexture&&Array.isArray(O.image)?T.mipmaps.length:1}function k(O){const T=O.target;T.removeEventListener("dispose",k),F(T),T.isVideoTexture&&m.delete(T),T.isHTMLTexture&&g.delete(T)}function b(O){const T=O.target;T.removeEventListener("dispose",b),G(T)}function F(O){const T=r.get(O);if(T.__webglInit===void 0)return;const I=O.source,Q=M.get(I);if(Q){const me=Q[T.__cacheKey];me.usedTimes--,me.usedTimes===0&&B(O),Object.keys(Q).length===0&&M.delete(I)}r.remove(O)}function B(O){const T=r.get(O);i.deleteTexture(T.__webglTexture);const I=O.source,Q=M.get(I);delete Q[T.__cacheKey],c.memory.textures--}function G(O){const T=r.get(O);if(O.depthTexture&&(O.depthTexture.dispose(),r.remove(O.depthTexture)),O.isWebGLCubeRenderTarget)for(let Q=0;Q<6;Q++){if(Array.isArray(T.__webglFramebuffer[Q]))for(let me=0;me<T.__webglFramebuffer[Q].length;me++)i.deleteFramebuffer(T.__webglFramebuffer[Q][me]);else i.deleteFramebuffer(T.__webglFramebuffer[Q]);T.__webglDepthbuffer&&i.deleteRenderbuffer(T.__webglDepthbuffer[Q])}else{if(Array.isArray(T.__webglFramebuffer))for(let Q=0;Q<T.__webglFramebuffer.length;Q++)i.deleteFramebuffer(T.__webglFramebuffer[Q]);else i.deleteFramebuffer(T.__webglFramebuffer);if(T.__webglDepthbuffer&&i.deleteRenderbuffer(T.__webglDepthbuffer),T.__webglMultisampledFramebuffer&&i.deleteFramebuffer(T.__webglMultisampledFramebuffer),T.__webglColorRenderbuffer)for(let Q=0;Q<T.__webglColorRenderbuffer.length;Q++)T.__webglColorRenderbuffer[Q]&&i.deleteRenderbuffer(T.__webglColorRenderbuffer[Q]);T.__webglDepthRenderbuffer&&i.deleteRenderbuffer(T.__webglDepthRenderbuffer)}const I=O.textures;for(let Q=0,me=I.length;Q<me;Q++){const Ee=r.get(I[Q]);Ee.__webglTexture&&(i.deleteTexture(Ee.__webglTexture),c.memory.textures--),r.remove(I[Q])}r.remove(O)}let Z=0;function re(){Z=0}function he(){return Z}function z(O){Z=O}function ae(){const O=Z;return O>=a.maxTextures&&lt("WebGLTextures: Trying to use "+O+" texture units while this GPU supports only "+a.maxTextures),Z+=1,O}function ee(O){const T=[];return T.push(O.wrapS),T.push(O.wrapT),T.push(O.wrapR||0),T.push(O.magFilter),T.push(O.minFilter),T.push(O.anisotropy),T.push(O.internalFormat),T.push(O.format),T.push(O.type),T.push(O.generateMipmaps),T.push(O.premultiplyAlpha),T.push(O.flipY),T.push(O.unpackAlignment),T.push(O.colorSpace),T.join()}function q(O,T){const I=r.get(O);if(O.isVideoTexture&&Y(O),O.isRenderTargetTexture===!1&&O.isExternalTexture!==!0&&O.version>0&&I.__version!==O.version){const Q=O.image;if(Q===null)lt("WebGLRenderer: Texture marked for update but no image data found.");else if(Q.complete===!1)lt("WebGLRenderer: Texture marked for update but image is incomplete");else{Ue(I,O,T);return}}else O.isExternalTexture&&(I.__webglTexture=O.sourceTexture?O.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,I.__webglTexture,i.TEXTURE0+T)}function de(O,T){const I=r.get(O);if(O.isRenderTargetTexture===!1&&O.version>0&&I.__version!==O.version){Ue(I,O,T);return}else O.isExternalTexture&&(I.__webglTexture=O.sourceTexture?O.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,I.__webglTexture,i.TEXTURE0+T)}function ce(O,T){const I=r.get(O);if(O.isRenderTargetTexture===!1&&O.version>0&&I.__version!==O.version){Ue(I,O,T);return}t.bindTexture(i.TEXTURE_3D,I.__webglTexture,i.TEXTURE0+T)}function P(O,T){const I=r.get(O);if(O.isCubeDepthTexture!==!0&&O.version>0&&I.__version!==O.version){Ze(I,O,T);return}t.bindTexture(i.TEXTURE_CUBE_MAP,I.__webglTexture,i.TEXTURE0+T)}const X={[wp]:i.REPEAT,[Gr]:i.CLAMP_TO_EDGE,[bp]:i.MIRRORED_REPEAT},Le={[Fn]:i.NEAREST,[eb]:i.NEAREST_MIPMAP_NEAREST,[mu]:i.NEAREST_MIPMAP_LINEAR,[Wn]:i.LINEAR,[mf]:i.LINEAR_MIPMAP_NEAREST,[da]:i.LINEAR_MIPMAP_LINEAR},Be={[ib]:i.NEVER,[lb]:i.ALWAYS,[rb]:i.LESS,[km]:i.LEQUAL,[sb]:i.EQUAL,[zm]:i.GEQUAL,[ab]:i.GREATER,[ob]:i.NOTEQUAL};function Ge(O,T){if(T.type===pr&&e.has("OES_texture_float_linear")===!1&&(T.magFilter===Wn||T.magFilter===mf||T.magFilter===mu||T.magFilter===da||T.minFilter===Wn||T.minFilter===mf||T.minFilter===mu||T.minFilter===da)&&lt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(O,i.TEXTURE_WRAP_S,X[T.wrapS]),i.texParameteri(O,i.TEXTURE_WRAP_T,X[T.wrapT]),(O===i.TEXTURE_3D||O===i.TEXTURE_2D_ARRAY)&&i.texParameteri(O,i.TEXTURE_WRAP_R,X[T.wrapR]),i.texParameteri(O,i.TEXTURE_MAG_FILTER,Le[T.magFilter]),i.texParameteri(O,i.TEXTURE_MIN_FILTER,Le[T.minFilter]),T.compareFunction&&(i.texParameteri(O,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(O,i.TEXTURE_COMPARE_FUNC,Be[T.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(T.magFilter===Fn||T.minFilter!==mu&&T.minFilter!==da||T.type===pr&&e.has("OES_texture_float_linear")===!1)return;if(T.anisotropy>1||r.get(T).__currentAnisotropy){const I=e.get("EXT_texture_filter_anisotropic");i.texParameterf(O,I.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(T.anisotropy,a.getMaxAnisotropy())),r.get(T).__currentAnisotropy=T.anisotropy}}}function le(O,T){let I=!1;O.__webglInit===void 0&&(O.__webglInit=!0,T.addEventListener("dispose",k));const Q=T.source;let me=M.get(Q);me===void 0&&(me={},M.set(Q,me));const Ee=ee(T);if(Ee!==O.__cacheKey){me[Ee]===void 0&&(me[Ee]={texture:i.createTexture(),usedTimes:0},c.memory.textures++,I=!0),me[Ee].usedTimes++;const Re=me[O.__cacheKey];Re!==void 0&&(me[O.__cacheKey].usedTimes--,Re.usedTimes===0&&B(T)),O.__cacheKey=Ee,O.__webglTexture=me[Ee].texture}return I}function ye(O,T,I){return Math.floor(Math.floor(O/I)/T)}function ge(O,T,I,Q){const Ee=O.updateRanges;if(Ee.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,T.width,T.height,I,Q,T.data);else{Ee.sort((We,ne)=>We.start-ne.start);let Re=0;for(let We=1;We<Ee.length;We++){const ne=Ee[Re],Se=Ee[We],Oe=ne.start+ne.count,nt=ye(Se.start,T.width,4),st=ye(ne.start,T.width,4);Se.start<=Oe+1&&nt===st&&ye(Se.start+Se.count-1,T.width,4)===nt?ne.count=Math.max(ne.count,Se.start+Se.count-ne.start):(++Re,Ee[Re]=Se)}Ee.length=Re+1;const xe=t.getParameter(i.UNPACK_ROW_LENGTH),ve=t.getParameter(i.UNPACK_SKIP_PIXELS),Ie=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,T.width);for(let We=0,ne=Ee.length;We<ne;We++){const Se=Ee[We],Oe=Math.floor(Se.start/4),nt=Math.ceil(Se.count/4),st=Oe%T.width,$=Math.floor(Oe/T.width),Pe=nt,_e=1;t.pixelStorei(i.UNPACK_SKIP_PIXELS,st),t.pixelStorei(i.UNPACK_SKIP_ROWS,$),t.texSubImage2D(i.TEXTURE_2D,0,st,$,Pe,_e,I,Q,T.data)}O.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,xe),t.pixelStorei(i.UNPACK_SKIP_PIXELS,ve),t.pixelStorei(i.UNPACK_SKIP_ROWS,Ie)}}function Ue(O,T,I){let Q=i.TEXTURE_2D;(T.isDataArrayTexture||T.isCompressedArrayTexture)&&(Q=i.TEXTURE_2D_ARRAY),T.isData3DTexture&&(Q=i.TEXTURE_3D);const me=le(O,T),Ee=T.source;t.bindTexture(Q,O.__webglTexture,i.TEXTURE0+I);const Re=r.get(Ee);if(Ee.version!==Re.__version||me===!0){if(t.activeTexture(i.TEXTURE0+I),(typeof ImageBitmap<"u"&&T.image instanceof ImageBitmap)===!1){const _e=Pt.getPrimaries(Pt.workingColorSpace),De=T.colorSpace===ws?null:Pt.getPrimaries(T.colorSpace),Fe=T.colorSpace===ws||_e===De?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Fe)}t.pixelStorei(i.UNPACK_ALIGNMENT,T.unpackAlignment);let ve=_(T.image,!1,a.maxTextureSize);ve=pn(T,ve);const Ie=l.convert(T.format,T.colorSpace),We=l.convert(T.type);let ne=C(T.internalFormat,Ie,We,T.normalized,T.colorSpace,T.isVideoTexture);Ge(Q,T);let Se;const Oe=T.mipmaps,nt=T.isVideoTexture!==!0,st=Re.__version===void 0||me===!0,$=Ee.dataReady,Pe=D(T,ve);if(T.isDepthTexture)ne=U(T.format===ha,T.type),st&&(nt?t.texStorage2D(i.TEXTURE_2D,1,ne,ve.width,ve.height):t.texImage2D(i.TEXTURE_2D,0,ne,ve.width,ve.height,0,Ie,We,null));else if(T.isDataTexture)if(Oe.length>0){nt&&st&&t.texStorage2D(i.TEXTURE_2D,Pe,ne,Oe[0].width,Oe[0].height);for(let _e=0,De=Oe.length;_e<De;_e++)Se=Oe[_e],nt?$&&t.texSubImage2D(i.TEXTURE_2D,_e,0,0,Se.width,Se.height,Ie,We,Se.data):t.texImage2D(i.TEXTURE_2D,_e,ne,Se.width,Se.height,0,Ie,We,Se.data);T.generateMipmaps=!1}else nt?(st&&t.texStorage2D(i.TEXTURE_2D,Pe,ne,ve.width,ve.height),$&&ge(T,ve,Ie,We)):t.texImage2D(i.TEXTURE_2D,0,ne,ve.width,ve.height,0,Ie,We,ve.data);else if(T.isCompressedTexture)if(T.isCompressedArrayTexture){nt&&st&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Pe,ne,Oe[0].width,Oe[0].height,ve.depth);for(let _e=0,De=Oe.length;_e<De;_e++)if(Se=Oe[_e],T.format!==Ki)if(Ie!==null)if(nt){if($)if(T.layerUpdates.size>0){const Fe=Av(Se.width,Se.height,T.format,T.type);for(const Me of T.layerUpdates){const Ye=Se.data.subarray(Me*Fe/Se.data.BYTES_PER_ELEMENT,(Me+1)*Fe/Se.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,_e,0,0,Me,Se.width,Se.height,1,Ie,Ye)}T.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,_e,0,0,0,Se.width,Se.height,ve.depth,Ie,Se.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,_e,ne,Se.width,Se.height,ve.depth,0,Se.data,0,0);else lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else nt?$&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,_e,0,0,0,Se.width,Se.height,ve.depth,Ie,We,Se.data):t.texImage3D(i.TEXTURE_2D_ARRAY,_e,ne,Se.width,Se.height,ve.depth,0,Ie,We,Se.data)}else{nt&&st&&t.texStorage2D(i.TEXTURE_2D,Pe,ne,Oe[0].width,Oe[0].height);for(let _e=0,De=Oe.length;_e<De;_e++)Se=Oe[_e],T.format!==Ki?Ie!==null?nt?$&&t.compressedTexSubImage2D(i.TEXTURE_2D,_e,0,0,Se.width,Se.height,Ie,Se.data):t.compressedTexImage2D(i.TEXTURE_2D,_e,ne,Se.width,Se.height,0,Se.data):lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):nt?$&&t.texSubImage2D(i.TEXTURE_2D,_e,0,0,Se.width,Se.height,Ie,We,Se.data):t.texImage2D(i.TEXTURE_2D,_e,ne,Se.width,Se.height,0,Ie,We,Se.data)}else if(T.isDataArrayTexture)if(nt){if(st&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Pe,ne,ve.width,ve.height,ve.depth),$)if(T.layerUpdates.size>0){const _e=Av(ve.width,ve.height,T.format,T.type);for(const De of T.layerUpdates){const Fe=ve.data.subarray(De*_e/ve.data.BYTES_PER_ELEMENT,(De+1)*_e/ve.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,De,ve.width,ve.height,1,Ie,We,Fe)}T.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ve.width,ve.height,ve.depth,Ie,We,ve.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,ne,ve.width,ve.height,ve.depth,0,Ie,We,ve.data);else if(T.isData3DTexture)nt?(st&&t.texStorage3D(i.TEXTURE_3D,Pe,ne,ve.width,ve.height,ve.depth),$&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ve.width,ve.height,ve.depth,Ie,We,ve.data)):t.texImage3D(i.TEXTURE_3D,0,ne,ve.width,ve.height,ve.depth,0,Ie,We,ve.data);else if(T.isFramebufferTexture){if(st)if(nt)t.texStorage2D(i.TEXTURE_2D,Pe,ne,ve.width,ve.height);else{let _e=ve.width,De=ve.height;for(let Fe=0;Fe<Pe;Fe++)t.texImage2D(i.TEXTURE_2D,Fe,ne,_e,De,0,Ie,We,null),_e>>=1,De>>=1}}else if(T.isHTMLTexture){if("texElementImage2D"in i){const _e=i.canvas;if(_e.hasAttribute("layoutsubtree")||_e.setAttribute("layoutsubtree","true"),ve.parentNode!==_e){_e.appendChild(ve),g.add(T),_e.onpaint=De=>{const Fe=De.changedElements;for(const Me of g)Fe.includes(Me.image)&&(Me.needsUpdate=!0)},_e.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,ve);else{const Fe=i.RGBA,Me=i.RGBA,Ye=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,Fe,Me,Ye,ve)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Oe.length>0){if(nt&&st){const _e=wt(Oe[0]);t.texStorage2D(i.TEXTURE_2D,Pe,ne,_e.width,_e.height)}for(let _e=0,De=Oe.length;_e<De;_e++)Se=Oe[_e],nt?$&&t.texSubImage2D(i.TEXTURE_2D,_e,0,0,Ie,We,Se):t.texImage2D(i.TEXTURE_2D,_e,ne,Ie,We,Se);T.generateMipmaps=!1}else if(nt){if(st){const _e=wt(ve);t.texStorage2D(i.TEXTURE_2D,Pe,ne,_e.width,_e.height)}$&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,Ie,We,ve)}else t.texImage2D(i.TEXTURE_2D,0,ne,Ie,We,ve);S(T)&&L(Q),Re.__version=Ee.version,T.onUpdate&&T.onUpdate(T)}O.__version=T.version}function Ze(O,T,I){if(T.image.length!==6)return;const Q=le(O,T),me=T.source;t.bindTexture(i.TEXTURE_CUBE_MAP,O.__webglTexture,i.TEXTURE0+I);const Ee=r.get(me);if(me.version!==Ee.__version||Q===!0){t.activeTexture(i.TEXTURE0+I);const Re=Pt.getPrimaries(Pt.workingColorSpace),xe=T.colorSpace===ws?null:Pt.getPrimaries(T.colorSpace),ve=T.colorSpace===ws||Re===xe?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,T.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ve);const Ie=T.isCompressedTexture||T.image[0].isCompressedTexture,We=T.image[0]&&T.image[0].isDataTexture,ne=[];for(let Me=0;Me<6;Me++)!Ie&&!We?ne[Me]=_(T.image[Me],!0,a.maxCubemapSize):ne[Me]=We?T.image[Me].image:T.image[Me],ne[Me]=pn(T,ne[Me]);const Se=ne[0],Oe=l.convert(T.format,T.colorSpace),nt=l.convert(T.type),st=C(T.internalFormat,Oe,nt,T.normalized,T.colorSpace),$=T.isVideoTexture!==!0,Pe=Ee.__version===void 0||Q===!0,_e=me.dataReady;let De=D(T,Se);Ge(i.TEXTURE_CUBE_MAP,T);let Fe;if(Ie){$&&Pe&&t.texStorage2D(i.TEXTURE_CUBE_MAP,De,st,Se.width,Se.height);for(let Me=0;Me<6;Me++){Fe=ne[Me].mipmaps;for(let Ye=0;Ye<Fe.length;Ye++){const $e=Fe[Ye];T.format!==Ki?Oe!==null?$?_e&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye,0,0,$e.width,$e.height,Oe,$e.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye,st,$e.width,$e.height,0,$e.data):lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):$?_e&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye,0,0,$e.width,$e.height,Oe,nt,$e.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye,st,$e.width,$e.height,0,Oe,nt,$e.data)}}}else{if(Fe=T.mipmaps,$&&Pe){Fe.length>0&&De++;const Me=wt(ne[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,De,st,Me.width,Me.height)}for(let Me=0;Me<6;Me++)if(We){$?_e&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,0,0,ne[Me].width,ne[Me].height,Oe,nt,ne[Me].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,st,ne[Me].width,ne[Me].height,0,Oe,nt,ne[Me].data);for(let Ye=0;Ye<Fe.length;Ye++){const jt=Fe[Ye].image[Me].image;$?_e&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye+1,0,0,jt.width,jt.height,Oe,nt,jt.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye+1,st,jt.width,jt.height,0,Oe,nt,jt.data)}}else{$?_e&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,0,0,Oe,nt,ne[Me]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,st,Oe,nt,ne[Me]);for(let Ye=0;Ye<Fe.length;Ye++){const $e=Fe[Ye];$?_e&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye+1,0,0,Oe,nt,$e.image[Me]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye+1,st,Oe,nt,$e.image[Me])}}}S(T)&&L(i.TEXTURE_CUBE_MAP),Ee.__version=me.version,T.onUpdate&&T.onUpdate(T)}O.__version=T.version}function tt(O,T,I,Q,me,Ee){const Re=l.convert(I.format,I.colorSpace),xe=l.convert(I.type),ve=C(I.internalFormat,Re,xe,I.normalized,I.colorSpace),Ie=r.get(T),We=r.get(I);if(We.__renderTarget=T,!Ie.__hasExternalTextures){const ne=Math.max(1,T.width>>Ee),Se=Math.max(1,T.height>>Ee);me===i.TEXTURE_3D||me===i.TEXTURE_2D_ARRAY?t.texImage3D(me,Ee,ve,ne,Se,T.depth,0,Re,xe,null):t.texImage2D(me,Ee,ve,ne,Se,0,Re,xe,null)}t.bindFramebuffer(i.FRAMEBUFFER,O),zt(T)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Q,me,We.__webglTexture,0,Et(T)):(me===i.TEXTURE_2D||me>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&me<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,Q,me,We.__webglTexture,Ee),t.bindFramebuffer(i.FRAMEBUFFER,null)}function Gt(O,T,I){if(i.bindRenderbuffer(i.RENDERBUFFER,O),T.depthBuffer){const Q=T.depthTexture,me=Q&&Q.isDepthTexture?Q.type:null,Ee=U(T.stencilBuffer,me),Re=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;zt(T)?d.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Et(T),Ee,T.width,T.height):I?i.renderbufferStorageMultisample(i.RENDERBUFFER,Et(T),Ee,T.width,T.height):i.renderbufferStorage(i.RENDERBUFFER,Ee,T.width,T.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Re,i.RENDERBUFFER,O)}else{const Q=T.textures;for(let me=0;me<Q.length;me++){const Ee=Q[me],Re=l.convert(Ee.format,Ee.colorSpace),xe=l.convert(Ee.type),ve=C(Ee.internalFormat,Re,xe,Ee.normalized,Ee.colorSpace);zt(T)?d.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Et(T),ve,T.width,T.height):I?i.renderbufferStorageMultisample(i.RENDERBUFFER,Et(T),ve,T.width,T.height):i.renderbufferStorage(i.RENDERBUFFER,ve,T.width,T.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function ut(O,T,I){const Q=T.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,O),!(T.depthTexture&&T.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const me=r.get(T.depthTexture);if(me.__renderTarget=T,(!me.__webglTexture||T.depthTexture.image.width!==T.width||T.depthTexture.image.height!==T.height)&&(T.depthTexture.image.width=T.width,T.depthTexture.image.height=T.height,T.depthTexture.needsUpdate=!0),Q){if(me.__webglInit===void 0&&(me.__webglInit=!0,T.depthTexture.addEventListener("dispose",k)),me.__webglTexture===void 0){me.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,me.__webglTexture),Ge(i.TEXTURE_CUBE_MAP,T.depthTexture);const Ie=l.convert(T.depthTexture.format),We=l.convert(T.depthTexture.type);let ne;T.depthTexture.format===Yr?ne=i.DEPTH_COMPONENT24:T.depthTexture.format===ha&&(ne=i.DEPTH24_STENCIL8);for(let Se=0;Se<6;Se++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,0,ne,T.width,T.height,0,Ie,We,null)}}else q(T.depthTexture,0);const Ee=me.__webglTexture,Re=Et(T),xe=Q?i.TEXTURE_CUBE_MAP_POSITIVE_X+I:i.TEXTURE_2D,ve=T.depthTexture.format===ha?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(T.depthTexture.format===Yr)zt(T)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ve,xe,Ee,0,Re):i.framebufferTexture2D(i.FRAMEBUFFER,ve,xe,Ee,0);else if(T.depthTexture.format===ha)zt(T)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ve,xe,Ee,0,Re):i.framebufferTexture2D(i.FRAMEBUFFER,ve,xe,Ee,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function Rt(O){const T=r.get(O),I=O.isWebGLCubeRenderTarget===!0;if(T.__boundDepthTexture!==O.depthTexture){const Q=O.depthTexture;if(T.__depthDisposeCallback&&T.__depthDisposeCallback(),Q){const me=()=>{delete T.__boundDepthTexture,delete T.__depthDisposeCallback,Q.removeEventListener("dispose",me)};Q.addEventListener("dispose",me),T.__depthDisposeCallback=me}T.__boundDepthTexture=Q}if(O.depthTexture&&!T.__autoAllocateDepthBuffer)if(I)for(let Q=0;Q<6;Q++)ut(T.__webglFramebuffer[Q],O,Q);else{const Q=O.texture.mipmaps;Q&&Q.length>0?ut(T.__webglFramebuffer[0],O,0):ut(T.__webglFramebuffer,O,0)}else if(I){T.__webglDepthbuffer=[];for(let Q=0;Q<6;Q++)if(t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer[Q]),T.__webglDepthbuffer[Q]===void 0)T.__webglDepthbuffer[Q]=i.createRenderbuffer(),Gt(T.__webglDepthbuffer[Q],O,!1);else{const me=O.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Ee=T.__webglDepthbuffer[Q];i.bindRenderbuffer(i.RENDERBUFFER,Ee),i.framebufferRenderbuffer(i.FRAMEBUFFER,me,i.RENDERBUFFER,Ee)}}else{const Q=O.texture.mipmaps;if(Q&&Q.length>0?t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer),T.__webglDepthbuffer===void 0)T.__webglDepthbuffer=i.createRenderbuffer(),Gt(T.__webglDepthbuffer,O,!1);else{const me=O.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Ee=T.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,Ee),i.framebufferRenderbuffer(i.FRAMEBUFFER,me,i.RENDERBUFFER,Ee)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function mt(O,T,I){const Q=r.get(O);T!==void 0&&tt(Q.__webglFramebuffer,O,O.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),I!==void 0&&Rt(O)}function vt(O){const T=O.texture,I=r.get(O),Q=r.get(T);O.addEventListener("dispose",b);const me=O.textures,Ee=O.isWebGLCubeRenderTarget===!0,Re=me.length>1;if(Re||(Q.__webglTexture===void 0&&(Q.__webglTexture=i.createTexture()),Q.__version=T.version,c.memory.textures++),Ee){I.__webglFramebuffer=[];for(let xe=0;xe<6;xe++)if(T.mipmaps&&T.mipmaps.length>0){I.__webglFramebuffer[xe]=[];for(let ve=0;ve<T.mipmaps.length;ve++)I.__webglFramebuffer[xe][ve]=i.createFramebuffer()}else I.__webglFramebuffer[xe]=i.createFramebuffer()}else{if(T.mipmaps&&T.mipmaps.length>0){I.__webglFramebuffer=[];for(let xe=0;xe<T.mipmaps.length;xe++)I.__webglFramebuffer[xe]=i.createFramebuffer()}else I.__webglFramebuffer=i.createFramebuffer();if(Re)for(let xe=0,ve=me.length;xe<ve;xe++){const Ie=r.get(me[xe]);Ie.__webglTexture===void 0&&(Ie.__webglTexture=i.createTexture(),c.memory.textures++)}if(O.samples>0&&zt(O)===!1){I.__webglMultisampledFramebuffer=i.createFramebuffer(),I.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,I.__webglMultisampledFramebuffer);for(let xe=0;xe<me.length;xe++){const ve=me[xe];I.__webglColorRenderbuffer[xe]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,I.__webglColorRenderbuffer[xe]);const Ie=l.convert(ve.format,ve.colorSpace),We=l.convert(ve.type),ne=C(ve.internalFormat,Ie,We,ve.normalized,ve.colorSpace,O.isXRRenderTarget===!0),Se=Et(O);i.renderbufferStorageMultisample(i.RENDERBUFFER,Se,ne,O.width,O.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+xe,i.RENDERBUFFER,I.__webglColorRenderbuffer[xe])}i.bindRenderbuffer(i.RENDERBUFFER,null),O.depthBuffer&&(I.__webglDepthRenderbuffer=i.createRenderbuffer(),Gt(I.__webglDepthRenderbuffer,O,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(Ee){t.bindTexture(i.TEXTURE_CUBE_MAP,Q.__webglTexture),Ge(i.TEXTURE_CUBE_MAP,T);for(let xe=0;xe<6;xe++)if(T.mipmaps&&T.mipmaps.length>0)for(let ve=0;ve<T.mipmaps.length;ve++)tt(I.__webglFramebuffer[xe][ve],O,T,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+xe,ve);else tt(I.__webglFramebuffer[xe],O,T,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+xe,0);S(T)&&L(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Re){for(let xe=0,ve=me.length;xe<ve;xe++){const Ie=me[xe],We=r.get(Ie);let ne=i.TEXTURE_2D;(O.isWebGL3DRenderTarget||O.isWebGLArrayRenderTarget)&&(ne=O.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ne,We.__webglTexture),Ge(ne,Ie),tt(I.__webglFramebuffer,O,Ie,i.COLOR_ATTACHMENT0+xe,ne,0),S(Ie)&&L(ne)}t.unbindTexture()}else{let xe=i.TEXTURE_2D;if((O.isWebGL3DRenderTarget||O.isWebGLArrayRenderTarget)&&(xe=O.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(xe,Q.__webglTexture),Ge(xe,T),T.mipmaps&&T.mipmaps.length>0)for(let ve=0;ve<T.mipmaps.length;ve++)tt(I.__webglFramebuffer[ve],O,T,i.COLOR_ATTACHMENT0,xe,ve);else tt(I.__webglFramebuffer,O,T,i.COLOR_ATTACHMENT0,xe,0);S(T)&&L(xe),t.unbindTexture()}O.depthBuffer&&Rt(O)}function kt(O){const T=O.textures;for(let I=0,Q=T.length;I<Q;I++){const me=T[I];if(S(me)){const Ee=N(O),Re=r.get(me).__webglTexture;t.bindTexture(Ee,Re),L(Ee),t.unbindTexture()}}}const Xt=[],qt=[];function $t(O){if(O.samples>0){if(zt(O)===!1){const T=O.textures,I=O.width,Q=O.height;let me=i.COLOR_BUFFER_BIT;const Ee=O.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Re=r.get(O),xe=T.length>1;if(xe)for(let Ie=0;Ie<T.length;Ie++)t.bindFramebuffer(i.FRAMEBUFFER,Re.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ie,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,Re.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ie,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,Re.__webglMultisampledFramebuffer);const ve=O.texture.mipmaps;ve&&ve.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Re.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Re.__webglFramebuffer);for(let Ie=0;Ie<T.length;Ie++){if(O.resolveDepthBuffer&&(O.depthBuffer&&(me|=i.DEPTH_BUFFER_BIT),O.stencilBuffer&&O.resolveStencilBuffer&&(me|=i.STENCIL_BUFFER_BIT)),xe){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Re.__webglColorRenderbuffer[Ie]);const We=r.get(T[Ie]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,We,0)}i.blitFramebuffer(0,0,I,Q,0,0,I,Q,me,i.NEAREST),h===!0&&(Xt.length=0,qt.length=0,Xt.push(i.COLOR_ATTACHMENT0+Ie),O.depthBuffer&&O.resolveDepthBuffer===!1&&(Xt.push(Ee),qt.push(Ee),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,qt)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Xt))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),xe)for(let Ie=0;Ie<T.length;Ie++){t.bindFramebuffer(i.FRAMEBUFFER,Re.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ie,i.RENDERBUFFER,Re.__webglColorRenderbuffer[Ie]);const We=r.get(T[Ie]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,Re.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ie,i.TEXTURE_2D,We,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Re.__webglMultisampledFramebuffer)}else if(O.depthBuffer&&O.resolveDepthBuffer===!1&&h){const T=O.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[T])}}}function Et(O){return Math.min(a.maxSamples,O.samples)}function zt(O){const T=r.get(O);return O.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&T.__useRenderToTexture!==!1}function Y(O){const T=c.render.frame;m.get(O)!==T&&(m.set(O,T),O.update())}function pn(O,T){const I=O.colorSpace,Q=O.format,me=O.type;return O.isCompressedTexture===!0||O.isVideoTexture===!0||I!==ld&&I!==ws&&(Pt.getTransfer(I)===Vt?(Q!==Ki||me!==Si)&&lt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Dt("WebGLTextures: Unsupported texture color space:",I)),T}function wt(O){return typeof HTMLImageElement<"u"&&O instanceof HTMLImageElement?(f.width=O.naturalWidth||O.width,f.height=O.naturalHeight||O.height):typeof VideoFrame<"u"&&O instanceof VideoFrame?(f.width=O.displayWidth,f.height=O.displayHeight):(f.width=O.width,f.height=O.height),f}this.allocateTextureUnit=ae,this.resetTextureUnits=re,this.getTextureUnits=he,this.setTextureUnits=z,this.setTexture2D=q,this.setTexture2DArray=de,this.setTexture3D=ce,this.setTextureCube=P,this.rebindTextures=mt,this.setupRenderTarget=vt,this.updateRenderTargetMipmap=kt,this.updateMultisampleRenderTarget=$t,this.setupDepthRenderbuffer=Rt,this.setupFrameBufferTexture=tt,this.useMultisampledRTT=zt,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function XP(i,e){function t(r,a=ws){let l;const c=Pt.getTransfer(a);if(r===Si)return i.UNSIGNED_BYTE;if(r===Dm)return i.UNSIGNED_SHORT_4_4_4_4;if(r===Im)return i.UNSIGNED_SHORT_5_5_5_1;if(r===dy)return i.UNSIGNED_INT_5_9_9_9_REV;if(r===hy)return i.UNSIGNED_INT_10F_11F_11F_REV;if(r===cy)return i.BYTE;if(r===uy)return i.SHORT;if(r===Xl)return i.UNSIGNED_SHORT;if(r===Lm)return i.INT;if(r===_r)return i.UNSIGNED_INT;if(r===pr)return i.FLOAT;if(r===qr)return i.HALF_FLOAT;if(r===fy)return i.ALPHA;if(r===py)return i.RGB;if(r===Ki)return i.RGBA;if(r===Yr)return i.DEPTH_COMPONENT;if(r===ha)return i.DEPTH_STENCIL;if(r===my)return i.RED;if(r===Um)return i.RED_INTEGER;if(r===ba)return i.RG;if(r===Fm)return i.RG_INTEGER;if(r===Om)return i.RGBA_INTEGER;if(r===qu||r===Yu||r===Ku||r===Qu)if(c===Vt)if(l=e.get("WEBGL_compressed_texture_s3tc_srgb"),l!==null){if(r===qu)return l.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(r===Yu)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(r===Ku)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(r===Qu)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(l=e.get("WEBGL_compressed_texture_s3tc"),l!==null){if(r===qu)return l.COMPRESSED_RGB_S3TC_DXT1_EXT;if(r===Yu)return l.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(r===Ku)return l.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(r===Qu)return l.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(r===Tp||r===Cp||r===Rp||r===Ap)if(l=e.get("WEBGL_compressed_texture_pvrtc"),l!==null){if(r===Tp)return l.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(r===Cp)return l.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(r===Rp)return l.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(r===Ap)return l.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(r===Pp||r===Np||r===Lp||r===Dp||r===Ip||r===sd||r===Up)if(l=e.get("WEBGL_compressed_texture_etc"),l!==null){if(r===Pp||r===Np)return c===Vt?l.COMPRESSED_SRGB8_ETC2:l.COMPRESSED_RGB8_ETC2;if(r===Lp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:l.COMPRESSED_RGBA8_ETC2_EAC;if(r===Dp)return l.COMPRESSED_R11_EAC;if(r===Ip)return l.COMPRESSED_SIGNED_R11_EAC;if(r===sd)return l.COMPRESSED_RG11_EAC;if(r===Up)return l.COMPRESSED_SIGNED_RG11_EAC}else return null;if(r===Fp||r===Op||r===kp||r===zp||r===Bp||r===Hp||r===Vp||r===Gp||r===jp||r===Wp||r===Xp||r===$p||r===qp||r===Yp)if(l=e.get("WEBGL_compressed_texture_astc"),l!==null){if(r===Fp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:l.COMPRESSED_RGBA_ASTC_4x4_KHR;if(r===Op)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:l.COMPRESSED_RGBA_ASTC_5x4_KHR;if(r===kp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:l.COMPRESSED_RGBA_ASTC_5x5_KHR;if(r===zp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:l.COMPRESSED_RGBA_ASTC_6x5_KHR;if(r===Bp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:l.COMPRESSED_RGBA_ASTC_6x6_KHR;if(r===Hp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:l.COMPRESSED_RGBA_ASTC_8x5_KHR;if(r===Vp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:l.COMPRESSED_RGBA_ASTC_8x6_KHR;if(r===Gp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:l.COMPRESSED_RGBA_ASTC_8x8_KHR;if(r===jp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:l.COMPRESSED_RGBA_ASTC_10x5_KHR;if(r===Wp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:l.COMPRESSED_RGBA_ASTC_10x6_KHR;if(r===Xp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:l.COMPRESSED_RGBA_ASTC_10x8_KHR;if(r===$p)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:l.COMPRESSED_RGBA_ASTC_10x10_KHR;if(r===qp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:l.COMPRESSED_RGBA_ASTC_12x10_KHR;if(r===Yp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:l.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(r===Kp||r===Qp||r===Zp)if(l=e.get("EXT_texture_compression_bptc"),l!==null){if(r===Kp)return c===Vt?l.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:l.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(r===Qp)return l.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(r===Zp)return l.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(r===Jp||r===em||r===ad||r===tm)if(l=e.get("EXT_texture_compression_rgtc"),l!==null){if(r===Jp)return l.COMPRESSED_RED_RGTC1_EXT;if(r===em)return l.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(r===ad)return l.COMPRESSED_RED_GREEN_RGTC2_EXT;if(r===tm)return l.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return r===$l?i.UNSIGNED_INT_24_8:i[r]!==void 0?i[r]:null}return{convert:t}}const $P=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,qP=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class YP{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const r=new wy(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=r}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,r=new Sr({vertexShader:$P,fragmentShader:qP,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Zi(new yd(20,20),r)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class KP extends ks{constructor(e,t){super();const r=this;let a=null,l=1,c=null,d="local-floor",h=1,f=null,m=null,g=null,x=null,M=null,E=null;const w=typeof XRWebGLBinding<"u",_=new YP,S={},L=t.getContextAttributes();let N=null,C=null;const U=[],D=[],k=new dt;let b=null;const F=new Ii;F.viewport=new un;const B=new Ii;B.viewport=new un;const G=[F,B],Z=new sT;let re=null,he=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(le){let ye=U[le];return ye===void 0&&(ye=new Mf,U[le]=ye),ye.getTargetRaySpace()},this.getControllerGrip=function(le){let ye=U[le];return ye===void 0&&(ye=new Mf,U[le]=ye),ye.getGripSpace()},this.getHand=function(le){let ye=U[le];return ye===void 0&&(ye=new Mf,U[le]=ye),ye.getHandSpace()};function z(le){const ye=D.indexOf(le.inputSource);if(ye===-1)return;const ge=U[ye];ge!==void 0&&(ge.update(le.inputSource,le.frame,f||c),ge.dispatchEvent({type:le.type,data:le.inputSource}))}function ae(){a.removeEventListener("select",z),a.removeEventListener("selectstart",z),a.removeEventListener("selectend",z),a.removeEventListener("squeeze",z),a.removeEventListener("squeezestart",z),a.removeEventListener("squeezeend",z),a.removeEventListener("end",ae),a.removeEventListener("inputsourceschange",ee);for(let le=0;le<U.length;le++){const ye=D[le];ye!==null&&(D[le]=null,U[le].disconnect(ye))}re=null,he=null,_.reset();for(const le in S)delete S[le];e.setRenderTarget(N),M=null,x=null,g=null,a=null,C=null,Ge.stop(),r.isPresenting=!1,e.setPixelRatio(b),e.setSize(k.width,k.height,!1),r.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(le){l=le,r.isPresenting===!0&&lt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(le){d=le,r.isPresenting===!0&&lt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return f||c},this.setReferenceSpace=function(le){f=le},this.getBaseLayer=function(){return x!==null?x:M},this.getBinding=function(){return g===null&&w&&(g=new XRWebGLBinding(a,t)),g},this.getFrame=function(){return E},this.getSession=function(){return a},this.setSession=async function(le){if(a=le,a!==null){if(N=e.getRenderTarget(),a.addEventListener("select",z),a.addEventListener("selectstart",z),a.addEventListener("selectend",z),a.addEventListener("squeeze",z),a.addEventListener("squeezestart",z),a.addEventListener("squeezeend",z),a.addEventListener("end",ae),a.addEventListener("inputsourceschange",ee),L.xrCompatible!==!0&&await t.makeXRCompatible(),b=e.getPixelRatio(),e.getSize(k),w&&"createProjectionLayer"in XRWebGLBinding.prototype){let ge=null,Ue=null,Ze=null;L.depth&&(Ze=L.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ge=L.stencil?ha:Yr,Ue=L.stencil?$l:_r);const tt={colorFormat:t.RGBA8,depthFormat:Ze,scaleFactor:l};g=this.getBinding(),x=g.createProjectionLayer(tt),a.updateRenderState({layers:[x]}),e.setPixelRatio(1),e.setSize(x.textureWidth,x.textureHeight,!1),C=new xr(x.textureWidth,x.textureHeight,{format:Ki,type:Si,depthTexture:new Uo(x.textureWidth,x.textureHeight,Ue,void 0,void 0,void 0,void 0,void 0,void 0,ge),stencilBuffer:L.stencil,colorSpace:e.outputColorSpace,samples:L.antialias?4:0,resolveDepthBuffer:x.ignoreDepthValues===!1,resolveStencilBuffer:x.ignoreDepthValues===!1})}else{const ge={antialias:L.antialias,alpha:!0,depth:L.depth,stencil:L.stencil,framebufferScaleFactor:l};M=new XRWebGLLayer(a,t,ge),a.updateRenderState({baseLayer:M}),e.setPixelRatio(1),e.setSize(M.framebufferWidth,M.framebufferHeight,!1),C=new xr(M.framebufferWidth,M.framebufferHeight,{format:Ki,type:Si,colorSpace:e.outputColorSpace,stencilBuffer:L.stencil,resolveDepthBuffer:M.ignoreDepthValues===!1,resolveStencilBuffer:M.ignoreDepthValues===!1})}C.isXRRenderTarget=!0,this.setFoveation(h),f=null,c=await a.requestReferenceSpace(d),Ge.setContext(a),Ge.start(),r.isPresenting=!0,r.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(a!==null)return a.environmentBlendMode},this.getDepthTexture=function(){return _.getDepthTexture()};function ee(le){for(let ye=0;ye<le.removed.length;ye++){const ge=le.removed[ye],Ue=D.indexOf(ge);Ue>=0&&(D[Ue]=null,U[Ue].disconnect(ge))}for(let ye=0;ye<le.added.length;ye++){const ge=le.added[ye];let Ue=D.indexOf(ge);if(Ue===-1){for(let tt=0;tt<U.length;tt++)if(tt>=D.length){D.push(ge),Ue=tt;break}else if(D[tt]===null){D[tt]=ge,Ue=tt;break}if(Ue===-1)break}const Ze=U[Ue];Ze&&Ze.connect(ge)}}const q=new te,de=new te;function ce(le,ye,ge){q.setFromMatrixPosition(ye.matrixWorld),de.setFromMatrixPosition(ge.matrixWorld);const Ue=q.distanceTo(de),Ze=ye.projectionMatrix.elements,tt=ge.projectionMatrix.elements,Gt=Ze[14]/(Ze[10]-1),ut=Ze[14]/(Ze[10]+1),Rt=(Ze[9]+1)/Ze[5],mt=(Ze[9]-1)/Ze[5],vt=(Ze[8]-1)/Ze[0],kt=(tt[8]+1)/tt[0],Xt=Gt*vt,qt=Gt*kt,$t=Ue/(-vt+kt),Et=$t*-vt;if(ye.matrixWorld.decompose(le.position,le.quaternion,le.scale),le.translateX(Et),le.translateZ($t),le.matrixWorld.compose(le.position,le.quaternion,le.scale),le.matrixWorldInverse.copy(le.matrixWorld).invert(),Ze[10]===-1)le.projectionMatrix.copy(ye.projectionMatrix),le.projectionMatrixInverse.copy(ye.projectionMatrixInverse);else{const zt=Gt+$t,Y=ut+$t,pn=Xt-Et,wt=qt+(Ue-Et),O=Rt*ut/Y*zt,T=mt*ut/Y*zt;le.projectionMatrix.makePerspective(pn,wt,O,T,zt,Y),le.projectionMatrixInverse.copy(le.projectionMatrix).invert()}}function P(le,ye){ye===null?le.matrixWorld.copy(le.matrix):le.matrixWorld.multiplyMatrices(ye.matrixWorld,le.matrix),le.matrixWorldInverse.copy(le.matrixWorld).invert()}this.updateCamera=function(le){if(a===null)return;let ye=le.near,ge=le.far;_.texture!==null&&(_.depthNear>0&&(ye=_.depthNear),_.depthFar>0&&(ge=_.depthFar)),Z.near=B.near=F.near=ye,Z.far=B.far=F.far=ge,(re!==Z.near||he!==Z.far)&&(a.updateRenderState({depthNear:Z.near,depthFar:Z.far}),re=Z.near,he=Z.far),Z.layers.mask=le.layers.mask|6,F.layers.mask=Z.layers.mask&-5,B.layers.mask=Z.layers.mask&-3;const Ue=le.parent,Ze=Z.cameras;P(Z,Ue);for(let tt=0;tt<Ze.length;tt++)P(Ze[tt],Ue);Ze.length===2?ce(Z,F,B):Z.projectionMatrix.copy(F.projectionMatrix),X(le,Z,Ue)};function X(le,ye,ge){ge===null?le.matrix.copy(ye.matrixWorld):(le.matrix.copy(ge.matrixWorld),le.matrix.invert(),le.matrix.multiply(ye.matrixWorld)),le.matrix.decompose(le.position,le.quaternion,le.scale),le.updateMatrixWorld(!0),le.projectionMatrix.copy(ye.projectionMatrix),le.projectionMatrixInverse.copy(ye.projectionMatrixInverse),le.isPerspectiveCamera&&(le.fov=nm*2*Math.atan(1/le.projectionMatrix.elements[5]),le.zoom=1)}this.getCamera=function(){return Z},this.getFoveation=function(){if(!(x===null&&M===null))return h},this.setFoveation=function(le){h=le,x!==null&&(x.fixedFoveation=le),M!==null&&M.fixedFoveation!==void 0&&(M.fixedFoveation=le)},this.hasDepthSensing=function(){return _.texture!==null},this.getDepthSensingMesh=function(){return _.getMesh(Z)},this.getCameraTexture=function(le){return S[le]};let Le=null;function Be(le,ye){if(m=ye.getViewerPose(f||c),E=ye,m!==null){const ge=m.views;M!==null&&(e.setRenderTargetFramebuffer(C,M.framebuffer),e.setRenderTarget(C));let Ue=!1;ge.length!==Z.cameras.length&&(Z.cameras.length=0,Ue=!0);for(let ut=0;ut<ge.length;ut++){const Rt=ge[ut];let mt=null;if(M!==null)mt=M.getViewport(Rt);else{const kt=g.getViewSubImage(x,Rt);mt=kt.viewport,ut===0&&(e.setRenderTargetTextures(C,kt.colorTexture,kt.depthStencilTexture),e.setRenderTarget(C))}let vt=G[ut];vt===void 0&&(vt=new Ii,vt.layers.enable(ut),vt.viewport=new un,G[ut]=vt),vt.matrix.fromArray(Rt.transform.matrix),vt.matrix.decompose(vt.position,vt.quaternion,vt.scale),vt.projectionMatrix.fromArray(Rt.projectionMatrix),vt.projectionMatrixInverse.copy(vt.projectionMatrix).invert(),vt.viewport.set(mt.x,mt.y,mt.width,mt.height),ut===0&&(Z.matrix.copy(vt.matrix),Z.matrix.decompose(Z.position,Z.quaternion,Z.scale)),Ue===!0&&Z.cameras.push(vt)}const Ze=a.enabledFeatures;if(Ze&&Ze.includes("depth-sensing")&&a.depthUsage=="gpu-optimized"&&w){g=r.getBinding();const ut=g.getDepthInformation(ge[0]);ut&&ut.isValid&&ut.texture&&_.init(ut,a.renderState)}if(Ze&&Ze.includes("camera-access")&&w){e.state.unbindTexture(),g=r.getBinding();for(let ut=0;ut<ge.length;ut++){const Rt=ge[ut].camera;if(Rt){let mt=S[Rt];mt||(mt=new wy,S[Rt]=mt);const vt=g.getCameraImage(Rt);mt.sourceTexture=vt}}}}for(let ge=0;ge<U.length;ge++){const Ue=D[ge],Ze=U[ge];Ue!==null&&Ze!==void 0&&Ze.update(Ue,ye,f||c)}Le&&Le(le,ye),ye.detectedPlanes&&r.dispatchEvent({type:"planesdetected",data:ye}),E=null}const Ge=new Cy;Ge.setAnimationLoop(Be),this.setAnimationLoop=function(le){Le=le},this.dispose=function(){}}}const QP=new an,Iy=new pt;Iy.set(-1,0,0,0,1,0,0,0,1);function ZP(i,e){function t(_,S){_.matrixAutoUpdate===!0&&_.updateMatrix(),S.value.copy(_.matrix)}function r(_,S){S.color.getRGB(_.fogColor.value,by(i)),S.isFog?(_.fogNear.value=S.near,_.fogFar.value=S.far):S.isFogExp2&&(_.fogDensity.value=S.density)}function a(_,S,L,N,C){S.isNodeMaterial?S.uniformsNeedUpdate=!1:S.isMeshBasicMaterial?l(_,S):S.isMeshLambertMaterial?(l(_,S),S.envMap&&(_.envMapIntensity.value=S.envMapIntensity)):S.isMeshToonMaterial?(l(_,S),g(_,S)):S.isMeshPhongMaterial?(l(_,S),m(_,S),S.envMap&&(_.envMapIntensity.value=S.envMapIntensity)):S.isMeshStandardMaterial?(l(_,S),x(_,S),S.isMeshPhysicalMaterial&&M(_,S,C)):S.isMeshMatcapMaterial?(l(_,S),E(_,S)):S.isMeshDepthMaterial?l(_,S):S.isMeshDistanceMaterial?(l(_,S),w(_,S)):S.isMeshNormalMaterial?l(_,S):S.isLineBasicMaterial?(c(_,S),S.isLineDashedMaterial&&d(_,S)):S.isPointsMaterial?h(_,S,L,N):S.isSpriteMaterial?f(_,S):S.isShadowMaterial?(_.color.value.copy(S.color),_.opacity.value=S.opacity):S.isShaderMaterial&&(S.uniformsNeedUpdate=!1)}function l(_,S){_.opacity.value=S.opacity,S.color&&_.diffuse.value.copy(S.color),S.emissive&&_.emissive.value.copy(S.emissive).multiplyScalar(S.emissiveIntensity),S.map&&(_.map.value=S.map,t(S.map,_.mapTransform)),S.alphaMap&&(_.alphaMap.value=S.alphaMap,t(S.alphaMap,_.alphaMapTransform)),S.bumpMap&&(_.bumpMap.value=S.bumpMap,t(S.bumpMap,_.bumpMapTransform),_.bumpScale.value=S.bumpScale,S.side===hi&&(_.bumpScale.value*=-1)),S.normalMap&&(_.normalMap.value=S.normalMap,t(S.normalMap,_.normalMapTransform),_.normalScale.value.copy(S.normalScale),S.side===hi&&_.normalScale.value.negate()),S.displacementMap&&(_.displacementMap.value=S.displacementMap,t(S.displacementMap,_.displacementMapTransform),_.displacementScale.value=S.displacementScale,_.displacementBias.value=S.displacementBias),S.emissiveMap&&(_.emissiveMap.value=S.emissiveMap,t(S.emissiveMap,_.emissiveMapTransform)),S.specularMap&&(_.specularMap.value=S.specularMap,t(S.specularMap,_.specularMapTransform)),S.alphaTest>0&&(_.alphaTest.value=S.alphaTest);const L=e.get(S),N=L.envMap,C=L.envMapRotation;N&&(_.envMap.value=N,_.envMapRotation.value.setFromMatrix4(QP.makeRotationFromEuler(C)).transpose(),N.isCubeTexture&&N.isRenderTargetTexture===!1&&_.envMapRotation.value.premultiply(Iy),_.reflectivity.value=S.reflectivity,_.ior.value=S.ior,_.refractionRatio.value=S.refractionRatio),S.lightMap&&(_.lightMap.value=S.lightMap,_.lightMapIntensity.value=S.lightMapIntensity,t(S.lightMap,_.lightMapTransform)),S.aoMap&&(_.aoMap.value=S.aoMap,_.aoMapIntensity.value=S.aoMapIntensity,t(S.aoMap,_.aoMapTransform))}function c(_,S){_.diffuse.value.copy(S.color),_.opacity.value=S.opacity,S.map&&(_.map.value=S.map,t(S.map,_.mapTransform))}function d(_,S){_.dashSize.value=S.dashSize,_.totalSize.value=S.dashSize+S.gapSize,_.scale.value=S.scale}function h(_,S,L,N){_.diffuse.value.copy(S.color),_.opacity.value=S.opacity,_.size.value=S.size*L,_.scale.value=N*.5,S.map&&(_.map.value=S.map,t(S.map,_.uvTransform)),S.alphaMap&&(_.alphaMap.value=S.alphaMap,t(S.alphaMap,_.alphaMapTransform)),S.alphaTest>0&&(_.alphaTest.value=S.alphaTest)}function f(_,S){_.diffuse.value.copy(S.color),_.opacity.value=S.opacity,_.rotation.value=S.rotation,S.map&&(_.map.value=S.map,t(S.map,_.mapTransform)),S.alphaMap&&(_.alphaMap.value=S.alphaMap,t(S.alphaMap,_.alphaMapTransform)),S.alphaTest>0&&(_.alphaTest.value=S.alphaTest)}function m(_,S){_.specular.value.copy(S.specular),_.shininess.value=Math.max(S.shininess,1e-4)}function g(_,S){S.gradientMap&&(_.gradientMap.value=S.gradientMap)}function x(_,S){_.metalness.value=S.metalness,S.metalnessMap&&(_.metalnessMap.value=S.metalnessMap,t(S.metalnessMap,_.metalnessMapTransform)),_.roughness.value=S.roughness,S.roughnessMap&&(_.roughnessMap.value=S.roughnessMap,t(S.roughnessMap,_.roughnessMapTransform)),S.envMap&&(_.envMapIntensity.value=S.envMapIntensity)}function M(_,S,L){_.ior.value=S.ior,S.sheen>0&&(_.sheenColor.value.copy(S.sheenColor).multiplyScalar(S.sheen),_.sheenRoughness.value=S.sheenRoughness,S.sheenColorMap&&(_.sheenColorMap.value=S.sheenColorMap,t(S.sheenColorMap,_.sheenColorMapTransform)),S.sheenRoughnessMap&&(_.sheenRoughnessMap.value=S.sheenRoughnessMap,t(S.sheenRoughnessMap,_.sheenRoughnessMapTransform))),S.clearcoat>0&&(_.clearcoat.value=S.clearcoat,_.clearcoatRoughness.value=S.clearcoatRoughness,S.clearcoatMap&&(_.clearcoatMap.value=S.clearcoatMap,t(S.clearcoatMap,_.clearcoatMapTransform)),S.clearcoatRoughnessMap&&(_.clearcoatRoughnessMap.value=S.clearcoatRoughnessMap,t(S.clearcoatRoughnessMap,_.clearcoatRoughnessMapTransform)),S.clearcoatNormalMap&&(_.clearcoatNormalMap.value=S.clearcoatNormalMap,t(S.clearcoatNormalMap,_.clearcoatNormalMapTransform),_.clearcoatNormalScale.value.copy(S.clearcoatNormalScale),S.side===hi&&_.clearcoatNormalScale.value.negate())),S.dispersion>0&&(_.dispersion.value=S.dispersion),S.iridescence>0&&(_.iridescence.value=S.iridescence,_.iridescenceIOR.value=S.iridescenceIOR,_.iridescenceThicknessMinimum.value=S.iridescenceThicknessRange[0],_.iridescenceThicknessMaximum.value=S.iridescenceThicknessRange[1],S.iridescenceMap&&(_.iridescenceMap.value=S.iridescenceMap,t(S.iridescenceMap,_.iridescenceMapTransform)),S.iridescenceThicknessMap&&(_.iridescenceThicknessMap.value=S.iridescenceThicknessMap,t(S.iridescenceThicknessMap,_.iridescenceThicknessMapTransform))),S.transmission>0&&(_.transmission.value=S.transmission,_.transmissionSamplerMap.value=L.texture,_.transmissionSamplerSize.value.set(L.width,L.height),S.transmissionMap&&(_.transmissionMap.value=S.transmissionMap,t(S.transmissionMap,_.transmissionMapTransform)),_.thickness.value=S.thickness,S.thicknessMap&&(_.thicknessMap.value=S.thicknessMap,t(S.thicknessMap,_.thicknessMapTransform)),_.attenuationDistance.value=S.attenuationDistance,_.attenuationColor.value.copy(S.attenuationColor)),S.anisotropy>0&&(_.anisotropyVector.value.set(S.anisotropy*Math.cos(S.anisotropyRotation),S.anisotropy*Math.sin(S.anisotropyRotation)),S.anisotropyMap&&(_.anisotropyMap.value=S.anisotropyMap,t(S.anisotropyMap,_.anisotropyMapTransform))),_.specularIntensity.value=S.specularIntensity,_.specularColor.value.copy(S.specularColor),S.specularColorMap&&(_.specularColorMap.value=S.specularColorMap,t(S.specularColorMap,_.specularColorMapTransform)),S.specularIntensityMap&&(_.specularIntensityMap.value=S.specularIntensityMap,t(S.specularIntensityMap,_.specularIntensityMapTransform))}function E(_,S){S.matcap&&(_.matcap.value=S.matcap)}function w(_,S){const L=e.get(S).light;_.referencePosition.value.setFromMatrixPosition(L.matrixWorld),_.nearDistance.value=L.shadow.camera.near,_.farDistance.value=L.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:a}}function JP(i,e,t,r){let a={},l={},c=[];const d=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function h(C,U){const D=U.program;r.uniformBlockBinding(C,D)}function f(C,U){let D=a[C.id];D===void 0&&(_(C),D=m(C),a[C.id]=D,C.addEventListener("dispose",L));const k=U.program;r.updateUBOMapping(C,k);const b=e.render.frame;l[C.id]!==b&&(x(C),l[C.id]=b)}function m(C){const U=g();C.__bindingPointIndex=U;const D=i.createBuffer(),k=C.__size,b=C.usage;return i.bindBuffer(i.UNIFORM_BUFFER,D),i.bufferData(i.UNIFORM_BUFFER,k,b),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,U,D),D}function g(){for(let C=0;C<d;C++)if(c.indexOf(C)===-1)return c.push(C),C;return Dt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function x(C){const U=a[C.id],D=C.uniforms,k=C.__cache;i.bindBuffer(i.UNIFORM_BUFFER,U);for(let b=0,F=D.length;b<F;b++){const B=D[b];if(Array.isArray(B))for(let G=0,Z=B.length;G<Z;G++)M(B[G],b,G,k);else M(B,b,0,k)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function M(C,U,D,k){if(w(C,U,D,k)===!0){const b=C.__offset,F=C.value;if(Array.isArray(F)){let B=0;for(let G=0;G<F.length;G++){const Z=F[G],re=S(Z);E(Z,C.__data,B),typeof Z!="number"&&typeof Z!="boolean"&&!Z.isMatrix3&&!ArrayBuffer.isView(Z)&&(B+=re.storage/Float32Array.BYTES_PER_ELEMENT)}}else E(F,C.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,b,C.__data)}}function E(C,U,D){typeof C=="number"||typeof C=="boolean"?U[0]=C:C.isMatrix3?(U[0]=C.elements[0],U[1]=C.elements[1],U[2]=C.elements[2],U[3]=0,U[4]=C.elements[3],U[5]=C.elements[4],U[6]=C.elements[5],U[7]=0,U[8]=C.elements[6],U[9]=C.elements[7],U[10]=C.elements[8],U[11]=0):ArrayBuffer.isView(C)?U.set(new C.constructor(C.buffer,C.byteOffset,U.length)):C.toArray(U,D)}function w(C,U,D,k){const b=C.value,F=U+"_"+D;if(k[F]===void 0)return typeof b=="number"||typeof b=="boolean"?k[F]=b:ArrayBuffer.isView(b)?k[F]=b.slice():k[F]=b.clone(),!0;{const B=k[F];if(typeof b=="number"||typeof b=="boolean"){if(B!==b)return k[F]=b,!0}else{if(ArrayBuffer.isView(b))return!0;if(B.equals(b)===!1)return B.copy(b),!0}}return!1}function _(C){const U=C.uniforms;let D=0;const k=16;for(let F=0,B=U.length;F<B;F++){const G=Array.isArray(U[F])?U[F]:[U[F]];for(let Z=0,re=G.length;Z<re;Z++){const he=G[Z],z=Array.isArray(he.value)?he.value:[he.value];for(let ae=0,ee=z.length;ae<ee;ae++){const q=z[ae],de=S(q),ce=D%k,P=ce%de.boundary,X=ce+P;D+=P,X!==0&&k-X<de.storage&&(D+=k-X),he.__data=new Float32Array(de.storage/Float32Array.BYTES_PER_ELEMENT),he.__offset=D,D+=de.storage}}}const b=D%k;return b>0&&(D+=k-b),C.__size=D,C.__cache={},this}function S(C){const U={boundary:0,storage:0};return typeof C=="number"||typeof C=="boolean"?(U.boundary=4,U.storage=4):C.isVector2?(U.boundary=8,U.storage=8):C.isVector3||C.isColor?(U.boundary=16,U.storage=12):C.isVector4?(U.boundary=16,U.storage=16):C.isMatrix3?(U.boundary=48,U.storage=48):C.isMatrix4?(U.boundary=64,U.storage=64):C.isTexture?lt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(C)?(U.boundary=16,U.storage=C.byteLength):lt("WebGLRenderer: Unsupported uniform value type.",C),U}function L(C){const U=C.target;U.removeEventListener("dispose",L);const D=c.indexOf(U.__bindingPointIndex);c.splice(D,1),i.deleteBuffer(a[U.id]),delete a[U.id],delete l[U.id]}function N(){for(const C in a)i.deleteBuffer(a[C]);c=[],a={},l={}}return{bind:h,update:f,dispose:N}}const e2=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let or=null;function t2(){return or===null&&(or=new Ib(e2,16,16,ba,qr),or.name="DFG_LUT",or.minFilter=Wn,or.magFilter=Wn,or.wrapS=Gr,or.wrapT=Gr,or.generateMipmaps=!1,or.needsUpdate=!0),or}class n2{constructor(e={}){const{canvas:t=ub(),context:r=null,depth:a=!0,stencil:l=!1,alpha:c=!1,antialias:d=!1,premultipliedAlpha:h=!0,preserveDrawingBuffer:f=!1,powerPreference:m="default",failIfMajorPerformanceCaveat:g=!1,reversedDepthBuffer:x=!1,outputBufferType:M=Si}=e;this.isWebGLRenderer=!0;let E;if(r!==null){if(typeof WebGLRenderingContext<"u"&&r instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");E=r.getContextAttributes().alpha}else E=c;const w=M,_=new Set([Om,Fm,Um]),S=new Set([Si,_r,Xl,$l,Dm,Im]),L=new Uint32Array(4),N=new Int32Array(4),C=new te;let U=null,D=null;const k=[],b=[];let F=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=gr,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const B=this;let G=!1,Z=null,re=null,he=null,z=null;this._outputColorSpace=Jn;let ae=0,ee=0,q=null,de=-1,ce=null;const P=new un,X=new un;let Le=null;const Be=new xt(0);let Ge=0,le=t.width,ye=t.height,ge=1,Ue=null,Ze=null;const tt=new un(0,0,le,ye),Gt=new un(0,0,le,ye);let ut=!1;const Rt=new Hm;let mt=!1,vt=!1;const kt=new an,Xt=new te,qt=new un,$t={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Et=!1;function zt(){return q===null?ge:1}let Y=r;function pn(A,J){return t.getContext(A,J)}try{const A={alpha:!0,depth:a,stencil:l,antialias:d,premultipliedAlpha:h,preserveDrawingBuffer:f,powerPreference:m,failIfMajorPerformanceCaveat:g};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Am}`),t.addEventListener("webglcontextlost",jt,!1),t.addEventListener("webglcontextrestored",Ut,!1),t.addEventListener("webglcontextcreationerror",On,!1),Y===null){const J="webgl2";if(Y=pn(J,A),Y===null)throw pn(J)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(A){throw Dt("WebGLRenderer: "+A.message),A}let wt,O,T,I,Q,me,Ee,Re,xe,ve,Ie,We,ne,Se,Oe,nt,st,$,Pe,_e,De,Fe,Me;function Ye(){wt=new tA(Y),wt.init(),De=new XP(Y,wt),O=new $R(Y,wt,e,De),T=new jP(Y,wt),O.reversedDepthBuffer&&x&&T.buffers.depth.setReversed(!0),re=Y.createFramebuffer(),he=Y.createFramebuffer(),z=Y.createFramebuffer(),I=new rA(Y),Q=new PP,me=new WP(Y,wt,T,Q,O,De,I),Ee=new eA(B),Re=new lT(Y),Fe=new WR(Y,Re),xe=new nA(Y,Re,I,Fe),ve=new aA(Y,xe,Re,Fe,I),$=new sA(Y,O,me),Oe=new qR(Q),Ie=new AP(B,Ee,wt,O,Fe,Oe),We=new ZP(B,Q),ne=new LP,Se=new kP(wt),st=new jR(B,Ee,T,ve,E,h),nt=new GP(B,ve,O),Me=new JP(Y,I,O,T),Pe=new XR(Y,wt,I),_e=new iA(Y,wt,I),I.programs=Ie.programs,B.capabilities=O,B.extensions=wt,B.properties=Q,B.renderLists=ne,B.shadowMap=nt,B.state=T,B.info=I}Ye(),w!==Si&&(F=new lA(w,t.width,t.height,d,a,l));const $e=new KP(B,Y);this.xr=$e,this.getContext=function(){return Y},this.getContextAttributes=function(){return Y.getContextAttributes()},this.forceContextLoss=function(){const A=wt.get("WEBGL_lose_context");A&&A.loseContext()},this.forceContextRestore=function(){const A=wt.get("WEBGL_lose_context");A&&A.restoreContext()},this.getPixelRatio=function(){return ge},this.setPixelRatio=function(A){A!==void 0&&(ge=A,this.setSize(le,ye,!1))},this.getSize=function(A){return A.set(le,ye)},this.setSize=function(A,J,fe=!0){if($e.isPresenting){lt("WebGLRenderer: Can't change size while VR device is presenting.");return}le=A,ye=J,t.width=Math.floor(A*ge),t.height=Math.floor(J*ge),fe===!0&&(t.style.width=A+"px",t.style.height=J+"px"),F!==null&&F.setSize(t.width,t.height),this.setViewport(0,0,A,J)},this.getDrawingBufferSize=function(A){return A.set(le*ge,ye*ge).floor()},this.setDrawingBufferSize=function(A,J,fe){le=A,ye=J,ge=fe,t.width=Math.floor(A*fe),t.height=Math.floor(J*fe),this.setViewport(0,0,A,J)},this.setEffects=function(A){if(w===Si){Dt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(A){for(let J=0;J<A.length;J++)if(A[J].isOutputPass===!0){lt("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}F.setEffects(A||[])},this.getCurrentViewport=function(A){return A.copy(P)},this.getViewport=function(A){return A.copy(tt)},this.setViewport=function(A,J,fe,oe){A.isVector4?tt.set(A.x,A.y,A.z,A.w):tt.set(A,J,fe,oe),T.viewport(P.copy(tt).multiplyScalar(ge).round())},this.getScissor=function(A){return A.copy(Gt)},this.setScissor=function(A,J,fe,oe){A.isVector4?Gt.set(A.x,A.y,A.z,A.w):Gt.set(A,J,fe,oe),T.scissor(X.copy(Gt).multiplyScalar(ge).round())},this.getScissorTest=function(){return ut},this.setScissorTest=function(A){T.setScissorTest(ut=A)},this.setOpaqueSort=function(A){Ue=A},this.setTransparentSort=function(A){Ze=A},this.getClearColor=function(A){return A.copy(st.getClearColor())},this.setClearColor=function(){st.setClearColor(...arguments)},this.getClearAlpha=function(){return st.getClearAlpha()},this.setClearAlpha=function(){st.setClearAlpha(...arguments)},this.clear=function(A=!0,J=!0,fe=!0){let oe=0;if(A){let se=!1;if(q!==null){const Ne=q.texture.format;se=_.has(Ne)}if(se){const Ne=q.texture.type,je=S.has(Ne),Ae=st.getClearColor(),Ke=st.getClearAlpha(),it=Ae.r,ht=Ae.g,ft=Ae.b;je?(L[0]=it,L[1]=ht,L[2]=ft,L[3]=Ke,Y.clearBufferuiv(Y.COLOR,0,L)):(N[0]=it,N[1]=ht,N[2]=ft,N[3]=Ke,Y.clearBufferiv(Y.COLOR,0,N))}else oe|=Y.COLOR_BUFFER_BIT}J&&(oe|=Y.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),fe&&(oe|=Y.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),oe!==0&&Y.clear(oe)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(A){A.setRenderer(this),Z=A},this.dispose=function(){t.removeEventListener("webglcontextlost",jt,!1),t.removeEventListener("webglcontextrestored",Ut,!1),t.removeEventListener("webglcontextcreationerror",On,!1),st.dispose(),ne.dispose(),Se.dispose(),Q.dispose(),Ee.dispose(),ve.dispose(),Fe.dispose(),Me.dispose(),Ie.dispose(),$e.dispose(),$e.removeEventListener("sessionstart",oc),$e.removeEventListener("sessionend",lc),$n.stop()};function jt(A){A.preventDefault(),Jx("WebGLRenderer: Context Lost."),G=!0}function Ut(){Jx("WebGLRenderer: Context Restored."),G=!1;const A=I.autoReset,J=nt.enabled,fe=nt.autoUpdate,oe=nt.needsUpdate,se=nt.type;Ye(),I.autoReset=A,nt.enabled=J,nt.autoUpdate=fe,nt.needsUpdate=oe,nt.type=se}function On(A){Dt("WebGLRenderer: A WebGL context could not be created. Reason: ",A.statusMessage)}function wi(A){const J=A.target;J.removeEventListener("dispose",wi),zs(J)}function zs(A){Ca(A),Q.remove(A)}function Ca(A){const J=Q.get(A).programs;J!==void 0&&(J.forEach(function(fe){Ie.releaseProgram(fe)}),A.isShaderMaterial&&Ie.releaseShaderCache(A))}this.renderBufferDirect=function(A,J,fe,oe,se,Ne){J===null&&(J=$t);const je=se.isMesh&&se.matrixWorld.determinantAffine()<0,Ae=on(A,J,fe,oe,se);T.setMaterial(oe,je);let Ke=fe.index,it=1;if(oe.wireframe===!0){if(Ke=xe.getWireframeAttribute(fe),Ke===void 0)return;it=2}const ht=fe.drawRange,ft=fe.attributes.position;let Je=ht.start*it,Nt=(ht.start+ht.count)*it;Ne!==null&&(Je=Math.max(Je,Ne.start*it),Nt=Math.min(Nt,(Ne.start+Ne.count)*it)),Ke!==null?(Je=Math.max(Je,0),Nt=Math.min(Nt,Ke.count)):ft!=null&&(Je=Math.max(Je,0),Nt=Math.min(Nt,ft.count));const Yt=Nt-Je;if(Yt<0||Yt===1/0)return;Fe.setup(se,oe,Ae,fe,Ke);let tn,Bt=Pe;if(Ke!==null&&(tn=Re.get(Ke),Bt=_e,Bt.setIndex(tn)),se.isMesh)oe.wireframe===!0?(T.setLineWidth(oe.wireframeLinewidth*zt()),Bt.setMode(Y.LINES)):Bt.setMode(Y.TRIANGLES);else if(se.isLine){let gn=oe.linewidth;gn===void 0&&(gn=1),T.setLineWidth(gn*zt()),se.isLineSegments?Bt.setMode(Y.LINES):se.isLineLoop?Bt.setMode(Y.LINE_LOOP):Bt.setMode(Y.LINE_STRIP)}else se.isPoints?Bt.setMode(Y.POINTS):se.isSprite&&Bt.setMode(Y.TRIANGLES);if(se.isBatchedMesh)if(wt.get("WEBGL_multi_draw"))Bt.renderMultiDraw(se._multiDrawStarts,se._multiDrawCounts,se._multiDrawCount);else{const gn=se._multiDrawStarts,He=se._multiDrawCounts,Nn=se._multiDrawCount,yt=Ke?Re.get(Ke).bytesPerElement:1,ei=Q.get(oe).currentProgram.getUniforms();for(let ti=0;ti<Nn;ti++)ei.setValue(Y,"_gl_DrawID",ti),Bt.render(gn[ti]/yt,He[ti])}else if(se.isInstancedMesh)Bt.renderInstances(Je,Yt,se.count);else if(fe.isInstancedBufferGeometry){const gn=fe._maxInstanceCount!==void 0?fe._maxInstanceCount:1/0,He=Math.min(fe.instanceCount,gn);Bt.renderInstances(Je,Yt,He)}else Bt.render(Je,Yt)};function Bs(A,J,fe){A.transparent===!0&&A.side===fr&&A.forceSinglePass===!1?(A.side=hi,A.needsUpdate=!0,Gs(A,J,fe),A.side=Fs,A.needsUpdate=!0,Gs(A,J,fe),A.side=fr):Gs(A,J,fe)}this.compile=function(A,J,fe=null){fe===null&&(fe=A),D=Se.get(fe),D.init(J),b.push(D),fe.traverseVisible(function(se){se.isLight&&se.layers.test(J.layers)&&(D.pushLight(se),se.castShadow&&D.pushShadow(se))}),A!==fe&&A.traverseVisible(function(se){se.isLight&&se.layers.test(J.layers)&&(D.pushLight(se),se.castShadow&&D.pushShadow(se))}),D.setupLights();const oe=new Set;return A.traverse(function(se){if(!(se.isMesh||se.isPoints||se.isLine||se.isSprite))return;const Ne=se.material;if(Ne)if(Array.isArray(Ne))for(let je=0;je<Ne.length;je++){const Ae=Ne[je];Bs(Ae,fe,se),oe.add(Ae)}else Bs(Ne,fe,se),oe.add(Ne)}),D=b.pop(),oe},this.compileAsync=function(A,J,fe=null){const oe=this.compile(A,J,fe);return new Promise(se=>{function Ne(){if(oe.forEach(function(je){Q.get(je).currentProgram.isReady()&&oe.delete(je)}),oe.size===0){se(A);return}setTimeout(Ne,10)}wt.get("KHR_parallel_shader_compile")!==null?Ne():setTimeout(Ne,10)})};let Hs=null;function Ed(A){Hs&&Hs(A)}function oc(){$n.stop()}function lc(){$n.start()}const $n=new Cy;$n.setAnimationLoop(Ed),typeof self<"u"&&$n.setContext(self),this.setAnimationLoop=function(A){Hs=A,$e.setAnimationLoop(A),A===null?$n.stop():$n.start()},$e.addEventListener("sessionstart",oc),$e.addEventListener("sessionend",lc),this.render=function(A,J){if(J!==void 0&&J.isCamera!==!0){Dt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(G===!0)return;Z!==null&&Z.renderStart(A,J);const fe=$e.enabled===!0&&$e.isPresenting===!0,oe=F!==null&&(q===null||fe)&&F.begin(B,q);if(A.matrixWorldAutoUpdate===!0&&A.updateMatrixWorld(),J.parent===null&&J.matrixWorldAutoUpdate===!0&&J.updateMatrixWorld(),$e.enabled===!0&&$e.isPresenting===!0&&(F===null||F.isCompositing()===!1)&&($e.cameraAutoUpdate===!0&&$e.updateCamera(J),J=$e.getCamera()),A.isScene===!0&&A.onBeforeRender(B,A,J,q),D=Se.get(A,b.length),D.init(J),D.state.textureUnits=me.getTextureUnits(),b.push(D),kt.multiplyMatrices(J.projectionMatrix,J.matrixWorldInverse),Rt.setFromProjectionMatrix(kt,mr,J.reversedDepth),vt=this.localClippingEnabled,mt=Oe.init(this.clippingPlanes,vt),U=ne.get(A,k.length),U.init(),k.push(U),$e.enabled===!0&&$e.isPresenting===!0){const je=B.xr.getDepthSensingMesh();je!==null&&Ra(je,J,-1/0,B.sortObjects)}Ra(A,J,0,B.sortObjects),U.finish(),B.sortObjects===!0&&U.sort(Ue,Ze,J.reversedDepth),Et=$e.enabled===!1||$e.isPresenting===!1||$e.hasDepthSensing()===!1,Et&&st.addToRenderList(U,A),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),mt===!0&&Oe.beginShadows();const se=D.state.shadowsArray;if(nt.render(se,A,J),mt===!0&&Oe.endShadows(),(oe&&F.hasRenderPass())===!1){const je=U.opaque,Ae=U.transmissive;if(D.setupLights(),J.isArrayCamera){const Ke=J.cameras;if(Ae.length>0)for(let it=0,ht=Ke.length;it<ht;it++){const ft=Ke[it];cc(je,Ae,A,ft)}Et&&st.render(A);for(let it=0,ht=Ke.length;it<ht;it++){const ft=Ke[it];Go(U,A,ft,ft.viewport)}}else Ae.length>0&&cc(je,Ae,A,J),Et&&st.render(A),Go(U,A,J)}q!==null&&ee===0&&(me.updateMultisampleRenderTarget(q),me.updateRenderTargetMipmap(q)),oe&&F.end(B),A.isScene===!0&&A.onAfterRender(B,A,J),Fe.resetDefaultState(),de=-1,ce=null,b.pop(),b.length>0?(D=b[b.length-1],me.setTextureUnits(D.state.textureUnits),mt===!0&&Oe.setGlobalState(B.clippingPlanes,D.state.camera)):D=null,k.pop(),k.length>0?U=k[k.length-1]:U=null,Z!==null&&Z.renderEnd()};function Ra(A,J,fe,oe){if(A.visible===!1)return;if(A.layers.test(J.layers)){if(A.isGroup)fe=A.renderOrder;else if(A.isLOD)A.autoUpdate===!0&&A.update(J);else if(A.isLightProbeGrid)D.pushLightProbeGrid(A);else if(A.isLight)D.pushLight(A),A.castShadow&&D.pushShadow(A);else if(A.isSprite){if(!A.frustumCulled||Rt.intersectsSprite(A)){oe&&qt.setFromMatrixPosition(A.matrixWorld).applyMatrix4(kt);const je=ve.update(A),Ae=A.material;Ae.visible&&U.push(A,je,Ae,fe,qt.z,null)}}else if((A.isMesh||A.isLine||A.isPoints)&&(!A.frustumCulled||Rt.intersectsObject(A))){const je=ve.update(A),Ae=A.material;if(oe&&(A.boundingSphere!==void 0?(A.boundingSphere===null&&A.computeBoundingSphere(),qt.copy(A.boundingSphere.center)):(je.boundingSphere===null&&je.computeBoundingSphere(),qt.copy(je.boundingSphere.center)),qt.applyMatrix4(A.matrixWorld).applyMatrix4(kt)),Array.isArray(Ae)){const Ke=je.groups;for(let it=0,ht=Ke.length;it<ht;it++){const ft=Ke[it],Je=Ae[ft.materialIndex];Je&&Je.visible&&U.push(A,je,Je,fe,qt.z,ft)}}else Ae.visible&&U.push(A,je,Ae,fe,qt.z,null)}}const Ne=A.children;for(let je=0,Ae=Ne.length;je<Ae;je++)Ra(Ne[je],J,fe,oe)}function Go(A,J,fe,oe){const{opaque:se,transmissive:Ne,transparent:je}=A;D.setupLightsView(fe),mt===!0&&Oe.setGlobalState(B.clippingPlanes,fe),oe&&T.viewport(P.copy(oe)),se.length>0&&Vs(se,J,fe),Ne.length>0&&Vs(Ne,J,fe),je.length>0&&Vs(je,J,fe),T.buffers.depth.setTest(!0),T.buffers.depth.setMask(!0),T.buffers.color.setMask(!0),T.setPolygonOffset(!1)}function cc(A,J,fe,oe){if((fe.isScene===!0?fe.overrideMaterial:null)!==null)return;if(D.state.transmissionRenderTarget[oe.id]===void 0){const Je=wt.has("EXT_color_buffer_half_float")||wt.has("EXT_color_buffer_float");D.state.transmissionRenderTarget[oe.id]=new xr(1,1,{generateMipmaps:!0,type:Je?qr:Si,minFilter:da,samples:Math.max(4,O.samples),stencilBuffer:l,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Pt.workingColorSpace})}const Ne=D.state.transmissionRenderTarget[oe.id],je=oe.viewport||P;Ne.setSize(je.z*B.transmissionResolutionScale,je.w*B.transmissionResolutionScale);const Ae=B.getRenderTarget(),Ke=B.getActiveCubeFace(),it=B.getActiveMipmapLevel();B.setRenderTarget(Ne),B.getClearColor(Be),Ge=B.getClearAlpha(),Ge<1&&B.setClearColor(16777215,.5),B.clear(),Et&&st.render(fe);const ht=B.toneMapping;B.toneMapping=gr;const ft=oe.viewport;if(oe.viewport!==void 0&&(oe.viewport=void 0),D.setupLightsView(oe),mt===!0&&Oe.setGlobalState(B.clippingPlanes,oe),Vs(A,fe,oe),me.updateMultisampleRenderTarget(Ne),me.updateRenderTargetMipmap(Ne),wt.has("WEBGL_multisampled_render_to_texture")===!1){let Je=!1;for(let Nt=0,Yt=J.length;Nt<Yt;Nt++){const tn=J[Nt],{object:Bt,geometry:gn,material:He,group:Nn}=tn;if(He.side===fr&&Bt.layers.test(oe.layers)){const yt=He.side;He.side=hi,He.needsUpdate=!0,jo(Bt,fe,oe,gn,He,Nn),He.side=yt,He.needsUpdate=!0,Je=!0}}Je===!0&&(me.updateMultisampleRenderTarget(Ne),me.updateRenderTargetMipmap(Ne))}B.setRenderTarget(Ae,Ke,it),B.setClearColor(Be,Ge),ft!==void 0&&(oe.viewport=ft),B.toneMapping=ht}function Vs(A,J,fe){const oe=J.isScene===!0?J.overrideMaterial:null;for(let se=0,Ne=A.length;se<Ne;se++){const je=A[se],{object:Ae,geometry:Ke,group:it}=je;let ht=je.material;ht.allowOverride===!0&&oe!==null&&(ht=oe),Ae.layers.test(fe.layers)&&jo(Ae,J,fe,Ke,ht,it)}}function jo(A,J,fe,oe,se,Ne){A.onBeforeRender(B,J,fe,oe,se,Ne),A.modelViewMatrix.multiplyMatrices(fe.matrixWorldInverse,A.matrixWorld),A.normalMatrix.getNormalMatrix(A.modelViewMatrix),se.onBeforeRender(B,J,fe,oe,A,Ne),se.transparent===!0&&se.side===fr&&se.forceSinglePass===!1?(se.side=hi,se.needsUpdate=!0,B.renderBufferDirect(fe,J,oe,se,A,Ne),se.side=Fs,se.needsUpdate=!0,B.renderBufferDirect(fe,J,oe,se,A,Ne),se.side=fr):B.renderBufferDirect(fe,J,oe,se,A,Ne),A.onAfterRender(B,J,fe,oe,se,Ne)}function Gs(A,J,fe){J.isScene!==!0&&(J=$t);const oe=Q.get(A),se=D.state.lights,Ne=D.state.shadowsArray,je=se.state.version,Ae=Ie.getParameters(A,se.state,Ne,J,fe,D.state.lightProbeGridArray),Ke=Ie.getProgramCacheKey(Ae);let it=oe.programs;oe.environment=A.isMeshStandardMaterial||A.isMeshLambertMaterial||A.isMeshPhongMaterial?J.environment:null,oe.fog=J.fog;const ht=A.isMeshStandardMaterial||A.isMeshLambertMaterial&&!A.envMap||A.isMeshPhongMaterial&&!A.envMap;oe.envMap=Ee.get(A.envMap||oe.environment,ht),oe.envMapRotation=oe.environment!==null&&A.envMap===null?J.environmentRotation:A.envMapRotation,it===void 0&&(A.addEventListener("dispose",wi),it=new Map,oe.programs=it);let ft=it.get(Ke);if(ft!==void 0){if(oe.currentProgram===ft&&oe.lightsStateVersion===je)return uc(A,Ae),ft}else Ae.uniforms=Ie.getUniforms(A),Z!==null&&A.isNodeMaterial&&Z.build(A,fe,Ae),A.onBeforeCompile(Ae,B),ft=Ie.acquireProgram(Ae,Ke),it.set(Ke,ft),oe.uniforms=Ae.uniforms;const Je=oe.uniforms;return(!A.isShaderMaterial&&!A.isRawShaderMaterial||A.clipping===!0)&&(Je.clippingPlanes=Oe.uniform),uc(A,Ae),oe.needsLights=Xo(A),oe.lightsStateVersion=je,oe.needsLights&&(Je.ambientLightColor.value=se.state.ambient,Je.lightProbe.value=se.state.probe,Je.directionalLights.value=se.state.directional,Je.directionalLightShadows.value=se.state.directionalShadow,Je.spotLights.value=se.state.spot,Je.spotLightShadows.value=se.state.spotShadow,Je.rectAreaLights.value=se.state.rectArea,Je.ltc_1.value=se.state.rectAreaLTC1,Je.ltc_2.value=se.state.rectAreaLTC2,Je.pointLights.value=se.state.point,Je.pointLightShadows.value=se.state.pointShadow,Je.hemisphereLights.value=se.state.hemi,Je.directionalShadowMatrix.value=se.state.directionalShadowMatrix,Je.spotLightMatrix.value=se.state.spotLightMatrix,Je.spotLightMap.value=se.state.spotLightMap,Je.pointShadowMatrix.value=se.state.pointShadowMatrix),oe.lightProbeGrid=D.state.lightProbeGridArray.length>0,oe.currentProgram=ft,oe.uniformsList=null,ft}function Wo(A){if(A.uniformsList===null){const J=A.currentProgram.getUniforms();A.uniformsList=ed.seqWithValue(J.seq,A.uniforms)}return A.uniformsList}function uc(A,J){const fe=Q.get(A);fe.outputColorSpace=J.outputColorSpace,fe.batching=J.batching,fe.batchingColor=J.batchingColor,fe.instancing=J.instancing,fe.instancingColor=J.instancingColor,fe.instancingMorph=J.instancingMorph,fe.skinning=J.skinning,fe.morphTargets=J.morphTargets,fe.morphNormals=J.morphNormals,fe.morphColors=J.morphColors,fe.morphTargetsCount=J.morphTargetsCount,fe.numClippingPlanes=J.numClippingPlanes,fe.numIntersection=J.numClipIntersection,fe.vertexAlphas=J.vertexAlphas,fe.vertexTangents=J.vertexTangents,fe.toneMapping=J.toneMapping}function wd(A,J){if(A.length===0)return null;if(A.length===1)return A[0].texture!==null?A[0]:null;C.setFromMatrixPosition(J.matrixWorld);for(let fe=0,oe=A.length;fe<oe;fe++){const se=A[fe];if(se.texture!==null&&se.boundingBox.containsPoint(C))return se}return null}function on(A,J,fe,oe,se){J.isScene!==!0&&(J=$t),me.resetTextureUnits();const Ne=J.fog,je=oe.isMeshStandardMaterial||oe.isMeshLambertMaterial||oe.isMeshPhongMaterial?J.environment:null,Ae=q===null?B.outputColorSpace:q.isXRRenderTarget===!0?q.texture.colorSpace:Pt.workingColorSpace,Ke=oe.isMeshStandardMaterial||oe.isMeshLambertMaterial&&!oe.envMap||oe.isMeshPhongMaterial&&!oe.envMap,it=Ee.get(oe.envMap||je,Ke),ht=oe.vertexColors===!0&&!!fe.attributes.color&&fe.attributes.color.itemSize===4,ft=!!fe.attributes.tangent&&(!!oe.normalMap||oe.anisotropy>0),Je=!!fe.morphAttributes.position,Nt=!!fe.morphAttributes.normal,Yt=!!fe.morphAttributes.color;let tn=gr;oe.toneMapped&&(q===null||q.isXRRenderTarget===!0)&&(tn=B.toneMapping);const Bt=fe.morphAttributes.position||fe.morphAttributes.normal||fe.morphAttributes.color,gn=Bt!==void 0?Bt.length:0,He=Q.get(oe),Nn=D.state.lights;if(mt===!0&&(vt===!0||A!==ce)){const Ht=A===ce&&oe.id===de;Oe.setState(oe,A,Ht)}let yt=!1;oe.version===He.__version?(He.needsLights&&He.lightsStateVersion!==Nn.state.version||He.outputColorSpace!==Ae||se.isBatchedMesh&&He.batching===!1||!se.isBatchedMesh&&He.batching===!0||se.isBatchedMesh&&He.batchingColor===!0&&se.colorTexture===null||se.isBatchedMesh&&He.batchingColor===!1&&se.colorTexture!==null||se.isInstancedMesh&&He.instancing===!1||!se.isInstancedMesh&&He.instancing===!0||se.isSkinnedMesh&&He.skinning===!1||!se.isSkinnedMesh&&He.skinning===!0||se.isInstancedMesh&&He.instancingColor===!0&&se.instanceColor===null||se.isInstancedMesh&&He.instancingColor===!1&&se.instanceColor!==null||se.isInstancedMesh&&He.instancingMorph===!0&&se.morphTexture===null||se.isInstancedMesh&&He.instancingMorph===!1&&se.morphTexture!==null||He.envMap!==it||oe.fog===!0&&He.fog!==Ne||He.numClippingPlanes!==void 0&&(He.numClippingPlanes!==Oe.numPlanes||He.numIntersection!==Oe.numIntersection)||He.vertexAlphas!==ht||He.vertexTangents!==ft||He.morphTargets!==Je||He.morphNormals!==Nt||He.morphColors!==Yt||He.toneMapping!==tn||He.morphTargetsCount!==gn||!!He.lightProbeGrid!=D.state.lightProbeGridArray.length>0)&&(yt=!0):(yt=!0,He.__version=oe.version);let ei=He.currentProgram;yt===!0&&(ei=Gs(oe,J,se),Z&&oe.isNodeMaterial&&Z.onUpdateProgram(oe,ei,He));let ti=!1,St=!1,Mr=!1;const Ft=ei.getUniforms(),Qt=He.uniforms;if(T.useProgram(ei.program)&&(ti=!0,St=!0,Mr=!0),oe.id!==de&&(de=oe.id,St=!0),He.needsLights){const Ht=wd(D.state.lightProbeGridArray,se);He.lightProbeGrid!==Ht&&(He.lightProbeGrid=Ht,St=!0)}if(ti||ce!==A){T.buffers.depth.getReversed()&&A.reversedDepth!==!0&&(A._reversedDepth=!0,A.updateProjectionMatrix()),Ft.setValue(Y,"projectionMatrix",A.projectionMatrix),Ft.setValue(Y,"viewMatrix",A.matrixWorldInverse);const Oi=Ft.map.cameraPosition;Oi!==void 0&&Oi.setValue(Y,Xt.setFromMatrixPosition(A.matrixWorld)),O.logarithmicDepthBuffer&&Ft.setValue(Y,"logDepthBufFC",2/(Math.log(A.far+1)/Math.LN2)),(oe.isMeshPhongMaterial||oe.isMeshToonMaterial||oe.isMeshLambertMaterial||oe.isMeshBasicMaterial||oe.isMeshStandardMaterial||oe.isShaderMaterial)&&Ft.setValue(Y,"isOrthographic",A.isOrthographicCamera===!0),ce!==A&&(ce=A,St=!0,Mr=!0)}if(He.needsLights&&(Nn.state.directionalShadowMap.length>0&&Ft.setValue(Y,"directionalShadowMap",Nn.state.directionalShadowMap,me),Nn.state.spotShadowMap.length>0&&Ft.setValue(Y,"spotShadowMap",Nn.state.spotShadowMap,me),Nn.state.pointShadowMap.length>0&&Ft.setValue(Y,"pointShadowMap",Nn.state.pointShadowMap,me)),se.isSkinnedMesh){Ft.setOptional(Y,se,"bindMatrix"),Ft.setOptional(Y,se,"bindMatrixInverse");const Ht=se.skeleton;Ht&&(Ht.boneTexture===null&&Ht.computeBoneTexture(),Ft.setValue(Y,"boneTexture",Ht.boneTexture,me))}se.isBatchedMesh&&(Ft.setOptional(Y,se,"batchingTexture"),Ft.setValue(Y,"batchingTexture",se._matricesTexture,me),Ft.setOptional(Y,se,"batchingIdTexture"),Ft.setValue(Y,"batchingIdTexture",se._indirectTexture,me),Ft.setOptional(Y,se,"batchingColorTexture"),se._colorsTexture!==null&&Ft.setValue(Y,"batchingColorTexture",se._colorsTexture,me));const Fi=fe.morphAttributes;if((Fi.position!==void 0||Fi.normal!==void 0||Fi.color!==void 0)&&$.update(se,fe,ei),(St||He.receiveShadow!==se.receiveShadow)&&(He.receiveShadow=se.receiveShadow,Ft.setValue(Y,"receiveShadow",se.receiveShadow)),(oe.isMeshStandardMaterial||oe.isMeshLambertMaterial||oe.isMeshPhongMaterial)&&oe.envMap===null&&J.environment!==null&&(Qt.envMapIntensity.value=J.environmentIntensity),Qt.dfgLUT!==void 0&&(Qt.dfgLUT.value=t2()),St){if(Ft.setValue(Y,"toneMappingExposure",B.toneMappingExposure),He.needsLights&&bd(Qt,Mr),Ne&&oe.fog===!0&&We.refreshFogUniforms(Qt,Ne),We.refreshMaterialUniforms(Qt,oe,ge,ye,D.state.transmissionRenderTarget[A.id]),He.needsLights&&He.lightProbeGrid){const Ht=He.lightProbeGrid;Qt.probesSH.value=Ht.texture,Qt.probesMin.value.copy(Ht.boundingBox.min),Qt.probesMax.value.copy(Ht.boundingBox.max),Qt.probesResolution.value.copy(Ht.resolution)}ed.upload(Y,Wo(He),Qt,me)}if(oe.isShaderMaterial&&oe.uniformsNeedUpdate===!0&&(ed.upload(Y,Wo(He),Qt,me),oe.uniformsNeedUpdate=!1),oe.isSpriteMaterial&&Ft.setValue(Y,"center",se.center),Ft.setValue(Y,"modelViewMatrix",se.modelViewMatrix),Ft.setValue(Y,"normalMatrix",se.normalMatrix),Ft.setValue(Y,"modelMatrix",se.matrixWorld),oe.uniformsGroups!==void 0){const Ht=oe.uniformsGroups;for(let Oi=0,tr=Ht.length;Oi<tr;Oi++){const js=Ht[Oi];Me.update(js,ei),Me.bind(js,ei)}}return ei}function bd(A,J){A.ambientLightColor.needsUpdate=J,A.lightProbe.needsUpdate=J,A.directionalLights.needsUpdate=J,A.directionalLightShadows.needsUpdate=J,A.pointLights.needsUpdate=J,A.pointLightShadows.needsUpdate=J,A.spotLights.needsUpdate=J,A.spotLightShadows.needsUpdate=J,A.rectAreaLights.needsUpdate=J,A.hemisphereLights.needsUpdate=J}function Xo(A){return A.isMeshLambertMaterial||A.isMeshToonMaterial||A.isMeshPhongMaterial||A.isMeshStandardMaterial||A.isShadowMaterial||A.isShaderMaterial&&A.lights===!0}this.getActiveCubeFace=function(){return ae},this.getActiveMipmapLevel=function(){return ee},this.getRenderTarget=function(){return q},this.setRenderTargetTextures=function(A,J,fe){const oe=Q.get(A);oe.__autoAllocateDepthBuffer=A.resolveDepthBuffer===!1,oe.__autoAllocateDepthBuffer===!1&&(oe.__useRenderToTexture=!1),Q.get(A.texture).__webglTexture=J,Q.get(A.depthTexture).__webglTexture=oe.__autoAllocateDepthBuffer?void 0:fe,oe.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(A,J){const fe=Q.get(A);fe.__webglFramebuffer=J,fe.__useDefaultFramebuffer=J===void 0},this.setRenderTarget=function(A,J=0,fe=0){q=A,ae=J,ee=fe;let oe=null,se=!1,Ne=!1;if(A){const Ae=Q.get(A);if(Ae.__useDefaultFramebuffer!==void 0){T.bindFramebuffer(Y.FRAMEBUFFER,Ae.__webglFramebuffer),P.copy(A.viewport),X.copy(A.scissor),Le=A.scissorTest,T.viewport(P),T.scissor(X),T.setScissorTest(Le),de=-1;return}else if(Ae.__webglFramebuffer===void 0)me.setupRenderTarget(A);else if(Ae.__hasExternalTextures)me.rebindTextures(A,Q.get(A.texture).__webglTexture,Q.get(A.depthTexture).__webglTexture);else if(A.depthBuffer){const ht=A.depthTexture;if(Ae.__boundDepthTexture!==ht){if(ht!==null&&Q.has(ht)&&(A.width!==ht.image.width||A.height!==ht.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");me.setupDepthRenderbuffer(A)}}const Ke=A.texture;(Ke.isData3DTexture||Ke.isDataArrayTexture||Ke.isCompressedArrayTexture)&&(Ne=!0);const it=Q.get(A).__webglFramebuffer;A.isWebGLCubeRenderTarget?(Array.isArray(it[J])?oe=it[J][fe]:oe=it[J],se=!0):A.samples>0&&me.useMultisampledRTT(A)===!1?oe=Q.get(A).__webglMultisampledFramebuffer:Array.isArray(it)?oe=it[fe]:oe=it,P.copy(A.viewport),X.copy(A.scissor),Le=A.scissorTest}else P.copy(tt).multiplyScalar(ge).floor(),X.copy(Gt).multiplyScalar(ge).floor(),Le=ut;if(fe!==0&&(oe=re),T.bindFramebuffer(Y.FRAMEBUFFER,oe)&&T.drawBuffers(A,oe),T.viewport(P),T.scissor(X),T.setScissorTest(Le),se){const Ae=Q.get(A.texture);Y.framebufferTexture2D(Y.FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Y.TEXTURE_CUBE_MAP_POSITIVE_X+J,Ae.__webglTexture,fe)}else if(Ne){const Ae=J;for(let Ke=0;Ke<A.textures.length;Ke++){const it=Q.get(A.textures[Ke]);Y.framebufferTextureLayer(Y.FRAMEBUFFER,Y.COLOR_ATTACHMENT0+Ke,it.__webglTexture,fe,Ae)}}else if(A!==null&&fe!==0){const Ae=Q.get(A.texture);Y.framebufferTexture2D(Y.FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Y.TEXTURE_2D,Ae.__webglTexture,fe)}de=-1},this.readRenderTargetPixels=function(A,J,fe,oe,se,Ne,je,Ae=0){if(!(A&&A.isWebGLRenderTarget)){Dt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ke=Q.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&je!==void 0&&(Ke=Ke[je]),Ke){T.bindFramebuffer(Y.FRAMEBUFFER,Ke);try{const it=A.textures[Ae],ht=it.format,ft=it.type;if(A.textures.length>1&&Y.readBuffer(Y.COLOR_ATTACHMENT0+Ae),!O.textureFormatReadable(ht)){Dt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!O.textureTypeReadable(ft)){Dt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}J>=0&&J<=A.width-oe&&fe>=0&&fe<=A.height-se&&Y.readPixels(J,fe,oe,se,De.convert(ht),De.convert(ft),Ne)}finally{const it=q!==null?Q.get(q).__webglFramebuffer:null;T.bindFramebuffer(Y.FRAMEBUFFER,it)}}},this.readRenderTargetPixelsAsync=async function(A,J,fe,oe,se,Ne,je,Ae=0){if(!(A&&A.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ke=Q.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&je!==void 0&&(Ke=Ke[je]),Ke)if(J>=0&&J<=A.width-oe&&fe>=0&&fe<=A.height-se){T.bindFramebuffer(Y.FRAMEBUFFER,Ke);const it=A.textures[Ae],ht=it.format,ft=it.type;if(A.textures.length>1&&Y.readBuffer(Y.COLOR_ATTACHMENT0+Ae),!O.textureFormatReadable(ht))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!O.textureTypeReadable(ft))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Je=Y.createBuffer();Y.bindBuffer(Y.PIXEL_PACK_BUFFER,Je),Y.bufferData(Y.PIXEL_PACK_BUFFER,Ne.byteLength,Y.STREAM_READ),Y.readPixels(J,fe,oe,se,De.convert(ht),De.convert(ft),0);const Nt=q!==null?Q.get(q).__webglFramebuffer:null;T.bindFramebuffer(Y.FRAMEBUFFER,Nt);const Yt=Y.fenceSync(Y.SYNC_GPU_COMMANDS_COMPLETE,0);return Y.flush(),await db(Y,Yt,4),Y.bindBuffer(Y.PIXEL_PACK_BUFFER,Je),Y.getBufferSubData(Y.PIXEL_PACK_BUFFER,0,Ne),Y.deleteBuffer(Je),Y.deleteSync(Yt),Ne}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(A,J=null,fe=0){const oe=Math.pow(2,-fe),se=Math.floor(A.image.width*oe),Ne=Math.floor(A.image.height*oe),je=J!==null?J.x:0,Ae=J!==null?J.y:0;me.setTexture2D(A,0),Y.copyTexSubImage2D(Y.TEXTURE_2D,fe,0,0,je,Ae,se,Ne),T.unbindTexture()},this.copyTextureToTexture=function(A,J,fe=null,oe=null,se=0,Ne=0){let je,Ae,Ke,it,ht,ft,Je,Nt,Yt;const tn=A.isCompressedTexture?A.mipmaps[Ne]:A.image;if(fe!==null)je=fe.max.x-fe.min.x,Ae=fe.max.y-fe.min.y,Ke=fe.isBox3?fe.max.z-fe.min.z:1,it=fe.min.x,ht=fe.min.y,ft=fe.isBox3?fe.min.z:0;else{const Qt=Math.pow(2,-se);je=Math.floor(tn.width*Qt),Ae=Math.floor(tn.height*Qt),A.isDataArrayTexture?Ke=tn.depth:A.isData3DTexture?Ke=Math.floor(tn.depth*Qt):Ke=1,it=0,ht=0,ft=0}oe!==null?(Je=oe.x,Nt=oe.y,Yt=oe.z):(Je=0,Nt=0,Yt=0);const Bt=De.convert(J.format),gn=De.convert(J.type);let He;J.isData3DTexture?(me.setTexture3D(J,0),He=Y.TEXTURE_3D):J.isDataArrayTexture||J.isCompressedArrayTexture?(me.setTexture2DArray(J,0),He=Y.TEXTURE_2D_ARRAY):(me.setTexture2D(J,0),He=Y.TEXTURE_2D),T.activeTexture(Y.TEXTURE0),T.pixelStorei(Y.UNPACK_FLIP_Y_WEBGL,J.flipY),T.pixelStorei(Y.UNPACK_PREMULTIPLY_ALPHA_WEBGL,J.premultiplyAlpha),T.pixelStorei(Y.UNPACK_ALIGNMENT,J.unpackAlignment);const Nn=T.getParameter(Y.UNPACK_ROW_LENGTH),yt=T.getParameter(Y.UNPACK_IMAGE_HEIGHT),ei=T.getParameter(Y.UNPACK_SKIP_PIXELS),ti=T.getParameter(Y.UNPACK_SKIP_ROWS),St=T.getParameter(Y.UNPACK_SKIP_IMAGES);T.pixelStorei(Y.UNPACK_ROW_LENGTH,tn.width),T.pixelStorei(Y.UNPACK_IMAGE_HEIGHT,tn.height),T.pixelStorei(Y.UNPACK_SKIP_PIXELS,it),T.pixelStorei(Y.UNPACK_SKIP_ROWS,ht),T.pixelStorei(Y.UNPACK_SKIP_IMAGES,ft);const Mr=A.isDataArrayTexture||A.isData3DTexture,Ft=J.isDataArrayTexture||J.isData3DTexture;if(A.isDepthTexture){const Qt=Q.get(A),Fi=Q.get(J),Ht=Q.get(Qt.__renderTarget),Oi=Q.get(Fi.__renderTarget);T.bindFramebuffer(Y.READ_FRAMEBUFFER,Ht.__webglFramebuffer),T.bindFramebuffer(Y.DRAW_FRAMEBUFFER,Oi.__webglFramebuffer);for(let tr=0;tr<Ke;tr++)Mr&&(Y.framebufferTextureLayer(Y.READ_FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Q.get(A).__webglTexture,se,ft+tr),Y.framebufferTextureLayer(Y.DRAW_FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Q.get(J).__webglTexture,Ne,Yt+tr)),Y.blitFramebuffer(it,ht,je,Ae,Je,Nt,je,Ae,Y.DEPTH_BUFFER_BIT,Y.NEAREST);T.bindFramebuffer(Y.READ_FRAMEBUFFER,null),T.bindFramebuffer(Y.DRAW_FRAMEBUFFER,null)}else if(se!==0||A.isRenderTargetTexture||Q.has(A)){const Qt=Q.get(A),Fi=Q.get(J);T.bindFramebuffer(Y.READ_FRAMEBUFFER,he),T.bindFramebuffer(Y.DRAW_FRAMEBUFFER,z);for(let Ht=0;Ht<Ke;Ht++)Mr?Y.framebufferTextureLayer(Y.READ_FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Qt.__webglTexture,se,ft+Ht):Y.framebufferTexture2D(Y.READ_FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Y.TEXTURE_2D,Qt.__webglTexture,se),Ft?Y.framebufferTextureLayer(Y.DRAW_FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Fi.__webglTexture,Ne,Yt+Ht):Y.framebufferTexture2D(Y.DRAW_FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Y.TEXTURE_2D,Fi.__webglTexture,Ne),se!==0?Y.blitFramebuffer(it,ht,je,Ae,Je,Nt,je,Ae,Y.COLOR_BUFFER_BIT,Y.NEAREST):Ft?Y.copyTexSubImage3D(He,Ne,Je,Nt,Yt+Ht,it,ht,je,Ae):Y.copyTexSubImage2D(He,Ne,Je,Nt,it,ht,je,Ae);T.bindFramebuffer(Y.READ_FRAMEBUFFER,null),T.bindFramebuffer(Y.DRAW_FRAMEBUFFER,null)}else Ft?A.isDataTexture||A.isData3DTexture?Y.texSubImage3D(He,Ne,Je,Nt,Yt,je,Ae,Ke,Bt,gn,tn.data):J.isCompressedArrayTexture?Y.compressedTexSubImage3D(He,Ne,Je,Nt,Yt,je,Ae,Ke,Bt,tn.data):Y.texSubImage3D(He,Ne,Je,Nt,Yt,je,Ae,Ke,Bt,gn,tn):A.isDataTexture?Y.texSubImage2D(Y.TEXTURE_2D,Ne,Je,Nt,je,Ae,Bt,gn,tn.data):A.isCompressedTexture?Y.compressedTexSubImage2D(Y.TEXTURE_2D,Ne,Je,Nt,tn.width,tn.height,Bt,tn.data):Y.texSubImage2D(Y.TEXTURE_2D,Ne,Je,Nt,je,Ae,Bt,gn,tn);T.pixelStorei(Y.UNPACK_ROW_LENGTH,Nn),T.pixelStorei(Y.UNPACK_IMAGE_HEIGHT,yt),T.pixelStorei(Y.UNPACK_SKIP_PIXELS,ei),T.pixelStorei(Y.UNPACK_SKIP_ROWS,ti),T.pixelStorei(Y.UNPACK_SKIP_IMAGES,St),Ne===0&&J.generateMipmaps&&Y.generateMipmap(He),T.unbindTexture()},this.initRenderTarget=function(A){Q.get(A).__webglFramebuffer===void 0&&me.setupRenderTarget(A)},this.initTexture=function(A){A.isCubeTexture?me.setTextureCube(A,0):A.isData3DTexture?me.setTexture3D(A,0):A.isDataArrayTexture||A.isCompressedArrayTexture?me.setTexture2DArray(A,0):me.setTexture2D(A,0),T.unbindTexture()},this.resetState=function(){ae=0,ee=0,q=null,T.reset(),Fe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return mr}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=Pt._getDrawingBufferColorSpace(e),t.unpackColorSpace=Pt._getUnpackColorSpace()}}const i2=/^[og]\s*(.+)?/,r2=/^mtllib /,s2=/^usemtl /,a2=/^usemap /,Jv=/\s+/,e_=new te,Kf=new te,t_=new te,n_=new te,Li=new te,Hu=new xt;function o2(){const i={objects:[],object:{},vertices:[],normals:[],colors:[],uvs:[],materials:{},materialLibraries:[],startObject:function(e,t){if(this.object&&this.object.fromDeclaration===!1){this.object.name=e,this.object.fromDeclaration=t!==!1;return}const r=this.object&&typeof this.object.currentMaterial=="function"?this.object.currentMaterial():void 0;if(this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0),this.object={name:e||"",fromDeclaration:t!==!1,geometry:{vertices:[],normals:[],colors:[],uvs:[],hasUVIndices:!1},materials:[],smooth:!0,startMaterial:function(a,l){const c=this._finalize(!1);c&&(c.inherited||c.groupCount<=0)&&this.materials.splice(c.index,1);const d={index:this.materials.length,name:a||"",mtllib:Array.isArray(l)&&l.length>0?l[l.length-1]:"",smooth:c!==void 0?c.smooth:this.smooth,groupStart:c!==void 0?c.groupEnd:0,groupEnd:-1,groupCount:-1,inherited:!1,clone:function(h){const f={index:typeof h=="number"?h:this.index,name:this.name,mtllib:this.mtllib,smooth:this.smooth,groupStart:0,groupEnd:-1,groupCount:-1,inherited:!1};return f.clone=this.clone.bind(f),f}};return this.materials.push(d),d},currentMaterial:function(){if(this.materials.length>0)return this.materials[this.materials.length-1]},_finalize:function(a){const l=this.currentMaterial();if(l&&l.groupEnd===-1&&(l.groupEnd=this.geometry.vertices.length/3,l.groupCount=l.groupEnd-l.groupStart,l.inherited=!1),a&&this.materials.length>1)for(let c=this.materials.length-1;c>=0;c--)this.materials[c].groupCount<=0&&this.materials.splice(c,1);return a&&this.materials.length===0&&this.materials.push({name:"",smooth:this.smooth}),l}},r&&r.name&&typeof r.clone=="function"){const a=r.clone(0);a.inherited=!0,this.object.materials.push(a)}this.objects.push(this.object)},finalize:function(){this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0)},parseVertexIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/3)*3},parseNormalIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/3)*3},parseUVIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/2)*2},addVertex:function(e,t,r){const a=this.vertices,l=this.object.geometry.vertices;l.push(a[e+0],a[e+1],a[e+2]),l.push(a[t+0],a[t+1],a[t+2]),l.push(a[r+0],a[r+1],a[r+2])},addVertexPoint:function(e){const t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addVertexLine:function(e){const t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addNormal:function(e,t,r){const a=this.normals,l=this.object.geometry.normals;l.push(a[e+0],a[e+1],a[e+2]),l.push(a[t+0],a[t+1],a[t+2]),l.push(a[r+0],a[r+1],a[r+2])},addFaceNormal:function(e,t,r){const a=this.vertices,l=this.object.geometry.normals;e_.fromArray(a,e),Kf.fromArray(a,t),t_.fromArray(a,r),Li.subVectors(t_,Kf),n_.subVectors(e_,Kf),Li.cross(n_),Li.normalize(),l.push(Li.x,Li.y,Li.z),l.push(Li.x,Li.y,Li.z),l.push(Li.x,Li.y,Li.z)},addColor:function(e,t,r){const a=this.colors,l=this.object.geometry.colors;a[e]!==void 0&&l.push(a[e+0],a[e+1],a[e+2]),a[t]!==void 0&&l.push(a[t+0],a[t+1],a[t+2]),a[r]!==void 0&&l.push(a[r+0],a[r+1],a[r+2])},addUV:function(e,t,r){const a=this.uvs,l=this.object.geometry.uvs;l.push(a[e+0],a[e+1]),l.push(a[t+0],a[t+1]),l.push(a[r+0],a[r+1])},addDefaultUV:function(){const e=this.object.geometry.uvs;e.push(0,0),e.push(0,0),e.push(0,0)},addUVLine:function(e){const t=this.uvs;this.object.geometry.uvs.push(t[e+0],t[e+1])},addFace:function(e,t,r,a,l,c,d,h,f){const m=this.vertices.length;let g=this.parseVertexIndex(e,m),x=this.parseVertexIndex(t,m),M=this.parseVertexIndex(r,m);if(this.addVertex(g,x,M),this.addColor(g,x,M),d!==void 0&&d!==""){const E=this.normals.length;g=this.parseNormalIndex(d,E),x=this.parseNormalIndex(h,E),M=this.parseNormalIndex(f,E),this.addNormal(g,x,M)}else this.addFaceNormal(g,x,M);if(a!==void 0&&a!==""){const E=this.uvs.length;g=this.parseUVIndex(a,E),x=this.parseUVIndex(l,E),M=this.parseUVIndex(c,E),this.addUV(g,x,M),this.object.geometry.hasUVIndices=!0}else this.addDefaultUV()},addPointGeometry:function(e){this.object.geometry.type="Points";const t=this.vertices.length;for(let r=0,a=e.length;r<a;r++){const l=this.parseVertexIndex(e[r],t);this.addVertexPoint(l),this.addColor(l)}},addLineGeometry:function(e,t){this.object.geometry.type="Line";const r=this.vertices.length,a=this.uvs.length;for(let l=0,c=e.length;l<c;l++)this.addVertexLine(this.parseVertexIndex(e[l],r));for(let l=0,c=t.length;l<c;l++)this.addUVLine(this.parseUVIndex(t[l],a))}};return i.startObject("",!1),i}class l2 extends ac{constructor(e){super(e),this.materials=null}load(e,t,r,a){const l=this,c=new Qb(this.manager);c.setPath(this.path),c.setRequestHeader(this.requestHeader),c.setWithCredentials(this.withCredentials),c.load(e,function(d){try{t(l.parse(d))}catch(h){a?a(h):console.error(h),l.manager.itemError(e)}},r,a)}setMaterials(e){return this.materials=e,this}parse(e){const t=new o2;e.indexOf(`\r
`)!==-1&&(e=e.replace(/\r\n/g,`
`)),e.indexOf(`\\
`)!==-1&&(e=e.replace(/\\\n/g,""));const r=e.split(`
`);let a=[];for(let d=0,h=r.length;d<h;d++){const f=r[d].trimStart();if(f.length===0)continue;const m=f.charAt(0);if(m!=="#")if(m==="v"){const g=f.split(Jv);switch(g[0]){case"v":t.vertices.push(parseFloat(g[1]),parseFloat(g[2]),parseFloat(g[3])),g.length>=7?(Hu.setRGB(parseFloat(g[4]),parseFloat(g[5]),parseFloat(g[6]),Jn),t.colors.push(Hu.r,Hu.g,Hu.b)):t.colors.push(void 0,void 0,void 0);break;case"vn":t.normals.push(parseFloat(g[1]),parseFloat(g[2]),parseFloat(g[3]));break;case"vt":t.uvs.push(parseFloat(g[1]),parseFloat(g[2]));break}}else if(m==="f"){const x=f.slice(1).trim().split(Jv),M=[];for(let w=0,_=x.length;w<_;w++){const S=x[w];if(S.length>0){const L=S.split("/");M.push(L)}}const E=M[0];for(let w=1,_=M.length-1;w<_;w++){const S=M[w],L=M[w+1];t.addFace(E[0],S[0],L[0],E[1],S[1],L[1],E[2],S[2],L[2])}}else if(m==="l"){const g=f.substring(1).trim().split(" ");let x=[];const M=[];if(f.indexOf("/")===-1)x=g;else for(let E=0,w=g.length;E<w;E++){const _=g[E].split("/");_[0]!==""&&x.push(_[0]),_[1]!==""&&M.push(_[1])}t.addLineGeometry(x,M)}else if(m==="p"){const x=f.slice(1).trim().split(" ");t.addPointGeometry(x)}else if((a=i2.exec(f))!==null){const g=(" "+a[0].slice(1).trim()).slice(1);t.startObject(g)}else if(s2.test(f))t.object.startMaterial(f.substring(7).trim(),t.materialLibraries);else if(r2.test(f))t.materialLibraries.push(f.substring(7).trim());else if(a2.test(f))console.warn('THREE.OBJLoader: Rendering identifier "usemap" not supported. Textures must be defined in MTL files.');else if(m==="s"){if(a=f.split(" "),a.length>1){const x=a[1].trim().toLowerCase();t.object.smooth=x!=="0"&&x!=="off"}else t.object.smooth=!0;const g=t.object.currentMaterial();g&&(g.smooth=t.object.smooth)}else{if(f==="\0")continue;console.warn('THREE.OBJLoader: Unexpected line: "'+f+'"')}}t.finalize();const l=new kl;if(l.materialLibraries=[].concat(t.materialLibraries),!(t.objects.length===1&&t.objects[0].geometry.vertices.length===0)===!0)for(let d=0,h=t.objects.length;d<h;d++){const f=t.objects[d],m=f.geometry,g=f.materials,x=m.type==="Line",M=m.type==="Points";let E=!1;if(m.vertices.length===0)continue;const w=new Mi;w.setAttribute("position",new In(m.vertices,3)),m.normals.length>0&&w.setAttribute("normal",new In(m.normals,3)),m.colors.length>0&&(E=!0,w.setAttribute("color",new In(m.colors,3))),m.hasUVIndices===!0&&w.setAttribute("uv",new In(m.uvs,2));const _=[];for(let L=0,N=g.length;L<N;L++){const C=g[L],U=C.name+"_"+C.smooth+"_"+E;let D=t.materials[U];if(this.materials!==null){if(D=this.materials.create(C.name),x&&D&&!(D instanceof Ju)){const k=new Ju;yr.prototype.copy.call(k,D),k.color.copy(D.color),D=k}else if(M&&D&&!(D instanceof zl)){const k=new zl({size:10,sizeAttenuation:!1});yr.prototype.copy.call(k,D),k.color.copy(D.color),k.map=D.map,D=k}}D===void 0&&(x?D=new Ju:M?D=new zl({size:1,sizeAttenuation:!1}):D=new Wb,D.name=C.name,D.flatShading=!C.smooth,D.vertexColors=E,t.materials[U]=D),_.push(D)}let S;if(_.length>1){for(let L=0,N=g.length;L<N;L++){const C=g[L];w.addGroup(C.groupStart,C.groupCount,L)}x?S=new vv(w,_):M?S=new Bf(w,_):S=new Zi(w,_)}else x?S=new vv(w,_[0]):M?S=new Bf(w,_[0]):S=new Zi(w,_[0]);S.name=f.name,l.add(S)}else if(t.vertices.length>0){const d=new zl({size:1,sizeAttenuation:!1}),h=new Mi;h.setAttribute("position",new In(t.vertices,3)),t.colors.length>0&&t.colors[0]!==void 0&&(h.setAttribute("color",new In(t.colors,3)),d.vertexColors=!0);const f=new Bf(h,d);l.add(f)}return l}}const i_={type:"change"},jm={type:"start"},Uy={type:"end"},Vu=new _d,r_=new Es,c2=Math.cos(70*pb.DEG2RAD),Sn=new te,ci=2*Math.PI,Wt={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Qf=1e-6;class u2 extends aT{constructor(e,t=null){super(e,t),this.state=Wt.NONE,this.target=new te,this.cursor=new te,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:go.ROTATE,MIDDLE:go.DOLLY,RIGHT:go.PAN},this.touches={ONE:po.ROTATE,TWO:po.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new te,this._lastQuaternion=new Os,this._lastTargetPosition=new te,this._quat=new Os().setFromUnitVectors(e.up,new te(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Cv,this._sphericalDelta=new Cv,this._scale=1,this._panOffset=new te,this._rotateStart=new dt,this._rotateEnd=new dt,this._rotateDelta=new dt,this._panStart=new dt,this._panEnd=new dt,this._panDelta=new dt,this._dollyStart=new dt,this._dollyEnd=new dt,this._dollyDelta=new dt,this._dollyDirection=new te,this._mouse=new dt,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=h2.bind(this),this._onPointerDown=d2.bind(this),this._onPointerUp=f2.bind(this),this._onContextMenu=y2.bind(this),this._onMouseWheel=g2.bind(this),this._onKeyDown=x2.bind(this),this._onTouchStart=v2.bind(this),this._onTouchMove=_2.bind(this),this._onMouseDown=p2.bind(this),this._onMouseMove=m2.bind(this),this._interceptControlDown=S2.bind(this),this._interceptControlUp=M2.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction=""}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(i_),this.update(),this.state=Wt.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){const t=this.object.position;Sn.copy(t).sub(this.target),Sn.applyQuaternion(this._quat),this._spherical.setFromVector3(Sn),this.autoRotate&&this.state===Wt.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let r=this.minAzimuthAngle,a=this.maxAzimuthAngle;isFinite(r)&&isFinite(a)&&(r<-Math.PI?r+=ci:r>Math.PI&&(r-=ci),a<-Math.PI?a+=ci:a>Math.PI&&(a-=ci),r<=a?this._spherical.theta=Math.max(r,Math.min(a,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(r+a)/2?Math.max(r,this._spherical.theta):Math.min(a,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let l=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const c=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),l=c!=this._spherical.radius}if(Sn.setFromSpherical(this._spherical),Sn.applyQuaternion(this._quatInverse),t.copy(this.target).add(Sn),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let c=null;if(this.object.isPerspectiveCamera){const d=Sn.length();c=this._clampDistance(d*this._scale);const h=d-c;this.object.position.addScaledVector(this._dollyDirection,h),this.object.updateMatrixWorld(),l=!!h}else if(this.object.isOrthographicCamera){const d=new te(this._mouse.x,this._mouse.y,0);d.unproject(this.object);const h=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),l=h!==this.object.zoom;const f=new te(this._mouse.x,this._mouse.y,0);f.unproject(this.object),this.object.position.sub(f).add(d),this.object.updateMatrixWorld(),c=Sn.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;c!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(c).add(this.object.position):(Vu.origin.copy(this.object.position),Vu.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Vu.direction))<c2?this.object.lookAt(this.target):(r_.setFromNormalAndCoplanarPoint(this.object.up,this.target),Vu.intersectPlane(r_,this.target))))}else if(this.object.isOrthographicCamera){const c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),c!==this.object.zoom&&(this.object.updateProjectionMatrix(),l=!0)}return this._scale=1,this._performCursorZoom=!1,l||this._lastPosition.distanceToSquared(this.object.position)>Qf||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Qf||this._lastTargetPosition.distanceToSquared(this.target)>Qf?(this.dispatchEvent(i_),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?ci/60*this.autoRotateSpeed*e:ci/60/60*this.autoRotateSpeed}_getZoomScale(e){const t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Sn.setFromMatrixColumn(t,0),Sn.multiplyScalar(-e),this._panOffset.add(Sn)}_panUp(e,t){this.screenSpacePanning===!0?Sn.setFromMatrixColumn(t,1):(Sn.setFromMatrixColumn(t,0),Sn.crossVectors(this.object.up,Sn)),Sn.multiplyScalar(e),this._panOffset.add(Sn)}_pan(e,t){const r=this.domElement;if(this.object.isPerspectiveCamera){const a=this.object.position;Sn.copy(a).sub(this.target);let l=Sn.length();l*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*l/r.clientHeight,this.object.matrix),this._panUp(2*t*l/r.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/r.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/r.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const r=this.domElement.getBoundingClientRect(),a=e-r.left,l=t-r.top,c=r.width,d=r.height;this._mouse.x=a/c*2-1,this._mouse.y=-(l/d)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(ci*this._rotateDelta.x/t.clientHeight),this._rotateUp(ci*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._rotateStart.set(r,a)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._panStart.set(r,a)}}_handleTouchStartDolly(e){const t=this._getSecondPointerPosition(e),r=e.pageX-t.x,a=e.pageY-t.y,l=Math.sqrt(r*r+a*a);this._dollyStart.set(0,l)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{const r=this._getSecondPointerPosition(e),a=.5*(e.pageX+r.x),l=.5*(e.pageY+r.y);this._rotateEnd.set(a,l)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(ci*this._rotateDelta.x/t.clientHeight),this._rotateUp(ci*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._panEnd.set(r,a)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){const t=this._getSecondPointerPosition(e),r=e.pageX-t.x,a=e.pageY-t.y,l=Math.sqrt(r*r+a*a);this._dollyEnd.set(0,l),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const c=(e.pageX+t.x)*.5,d=(e.pageY+t.y)*.5;this._updateZoomParameters(c,d)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new dt,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){const t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){const t=e.deltaMode,r={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:r.deltaY*=16;break;case 2:r.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(r.deltaY*=10),r}}function d2(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function h2(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function f2(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Uy),this.state=Wt.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:const e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function p2(i){let e;switch(i.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case go.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=Wt.DOLLY;break;case go.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Wt.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Wt.ROTATE}break;case go.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Wt.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Wt.PAN}break;default:this.state=Wt.NONE}this.state!==Wt.NONE&&this.dispatchEvent(jm)}function m2(i){switch(this.state){case Wt.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case Wt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case Wt.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function g2(i){this.enabled===!1||this.enableZoom===!1||this.state!==Wt.NONE||(i.preventDefault(),this.dispatchEvent(jm),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(Uy))}function x2(i){this.enabled!==!1&&this._handleKeyDown(i)}function v2(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case po.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=Wt.TOUCH_ROTATE;break;case po.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=Wt.TOUCH_PAN;break;default:this.state=Wt.NONE}break;case 2:switch(this.touches.TWO){case po.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=Wt.TOUCH_DOLLY_PAN;break;case po.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=Wt.TOUCH_DOLLY_ROTATE;break;default:this.state=Wt.NONE}break;default:this.state=Wt.NONE}this.state!==Wt.NONE&&this.dispatchEvent(jm)}function _2(i){switch(this._trackPointer(i),this.state){case Wt.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case Wt.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case Wt.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case Wt.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=Wt.NONE}}function y2(i){this.enabled!==!1&&i.preventDefault()}function S2(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function M2(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function E2({piece:i,variant:e,textured:t=!0,size:r=320}){const a=V.useRef(null);return V.useEffect(()=>{const l=a.current;if(!l)return;const c=new Rb;c.background=new xt(1315866);const d=new Ii(35,1,.01,5e3),h=new n2({antialias:!0});h.setSize(r,r),h.setPixelRatio(Math.min(2,window.devicePixelRatio)),h.outputColorSpace=Jn,h.toneMapping=Nm,h.toneMappingExposure=1.15,l.appendChild(h.domElement),c.add(new eT(16777215,4210768,1.1)),c.add(new iT(16777215,.35));const f=new Gf(16777215,2.4);f.position.set(3,4,2),c.add(f);const m=new Gf(16777215,1.1);m.position.set(-3,1,-1),c.add(m);const g=new Gf(16777215,.8);g.position.set(0,2,-4),c.add(g);const x=new u2(d,h.domElement);x.enableDamping=!0,x.autoRotate=!0,x.autoRotateSpeed=1.2;let M=0,E=!1;new l2().load(`/api/scan/model/${i}/${e}.obj`,S=>{if(E)return;S.traverse(k=>{const b=k;b.isMesh&&b.geometry.computeVertexNormals()});const L=k=>w2(S,k);t?new Jb().load(`/api/scan/model/${i}/${e}.png`,k=>{k.colorSpace=Jn,L(new Hf({map:k,roughness:.6}))},void 0,()=>L(new Hf({color:11579576,roughness:.6}))):L(new Hf({color:12632262,roughness:.65})),S.rotation.x=-Math.PI/2;const N=new Ho().setFromObject(S),C=N.getCenter(new te),U=N.getSize(new te);S.position.sub(C),c.add(S);const D=Math.max(U.x,U.y,U.z);d.position.set(D*1.6,D*.6,D*1.6),d.near=D/100,d.far=D*100,d.updateProjectionMatrix(),x.target.set(0,0,0),x.update()});const _=()=>{x.update(),h.render(c,d),M=requestAnimationFrame(_)};return _(),()=>{E=!0,cancelAnimationFrame(M),x.dispose(),h.dispose(),l.removeChild(h.domElement)}},[i,e,t,r]),v.jsx("div",{ref:a,style:{width:r,height:r},className:"rounded-lg border border-zinc-700 bg-zinc-950 [&>canvas]:rounded-lg"})}function w2(i,e){e.side=fr,i.traverse(t=>{t.isMesh&&(t.material=e)})}const Or="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",b2="https://<PHONE-IP>:4444/video/m.jpeg",T2="https://<PHONE-IP>:4444/video/snapshot",C2={P:"Pawn",N:"Knight",B:"Bishop",R:"Rook",Q:"Queen",K:"King"};function R2(i){const e=i.match(/^([wb]?)([PNBRQK])$/i);if(!e)return null;const t=e[2].toUpperCase();return e[1]?e[1].toLowerCase()+t:t}function hd(i){const e=i.length===2?i[1]:i[0];let t="";return i.length===2&&(t=i[0]==="w"?"white ":"black "),t+(C2[e]??i)}function am(i,e){const t=R2(i.dir),r=e.find(a=>a.source_dir===i.dir)??(t?e.find(a=>a.piece.toLowerCase()===t.toLowerCase()&&!a.source_dir):void 0);return r?{stage:"done",piece:r.piece,variant:r.variant}:i.mesh?{stage:"mesh",piece:t,variant:null}:{stage:"mesh",piece:t,variant:null}}function A2(){const[i,e]=V.useState(b2),[t,r]=V.useState(T2),[a,l]=V.useState(2880),[c,d]=V.useState(2160),[h,f]=V.useState("pawn"),[m,g]=V.useState(.8),[x,M]=V.useState(80),[E,w]=V.useState(92),[_,S]=V.useState(null),[L,N]=V.useState(""),[C,U]=V.useState(null),D=V.useRef(null),k=V.useRef(null),[b,F]=V.useState(null),[B,G]=V.useState(""),[Z,re]=V.useState("P"),[he,z]=V.useState(null),[ae,ee]=V.useState("textured"),[q,de]=V.useState(null),[ce,P]=V.useState(null),[X,Le]=V.useState(null),[Be,Ge]=V.useState(""),[le,ye]=V.useState(!1),ge=V.useRef(null);V.useEffect(()=>(rn("/api/scan/status").then(ne=>{S(ne),ne.default_source&&e(ne.default_source),ne.default_capture&&r(ne.default_capture),ne.out&&f(ne.out)}).catch(()=>{}),()=>clearInterval(k.current)),[]);const Ue=()=>rn("/api/scan/status").then(S).catch(()=>{});function Ze(){clearInterval(k.current),k.current=setInterval(Ue,1e3)}async function tt(){N("");try{const ne=await en("/api/scan/open",{source:i,width:a,height:c,capture:t});S(ne),Ze()}catch(ne){N("Connect failed: "+ne.message)}}async function Gt(){N("");try{const ne=await en("/api/scan/close");S(ne),clearInterval(k.current)}catch(ne){N("Disconnect failed: "+ne.message)}}function ut(ne){const Se=D.current.getBoundingClientRect();return{x:ne.clientX-Se.left,y:ne.clientY-Se.top,r:Se}}function Rt(ne){if(!(_!=null&&_.open))return;ne.target.setPointerCapture(ne.pointerId);const{x:Se,y:Oe}=ut(ne);U({x0:Se,y0:Oe,x1:Se,y1:Oe})}function mt(ne){if(!C)return;const{x:Se,y:Oe}=ut(ne);U({...C,x1:Se,y1:Oe})}async function vt(){if(!C||!_)return U(null);const ne=D.current.getBoundingClientRect(),[Se,Oe]=_.frame_size,nt=Se/ne.width,st=Oe/ne.height,$=Math.round(Math.min(C.x0,C.x1)*nt),Pe=Math.round(Math.min(C.y0,C.y1)*st),_e=Math.round(Math.max(C.x0,C.x1)*nt),De=Math.round(Math.max(C.y0,C.y1)*st);if(U(null),!(_e-$<10||De-Pe<10))try{S(await en("/api/scan/config",{crop:[$,Pe,_e,De]}))}catch(Fe){N("Crop failed: "+Fe.message)}}async function kt(){try{S(await en("/api/scan/config",{crop:[]}))}catch(ne){N("Crop reset failed: "+ne.message)}}async function Xt(){try{S(await en("/api/scan/config",{interval:m,count:x,quality:E,out:h}))}catch(ne){N("Config failed: "+ne.message)}}async function qt(){N("");try{await Xt();const ne=await en("/api/scan/start",{out:h});S(ne),Ze()}catch(ne){N("Capture start failed: "+ne.message)}}async function $t(){N("");try{S(await en("/api/scan/stop"))}catch(ne){N("Capture stop failed: "+ne.message)}}const Et=()=>rn("/api/scan/models").then(ne=>{F(ne),!B&&ne.scans.length&&zt(ne.scans[0],ne.pieces)}).catch(()=>{});function zt(ne,Se=(b==null?void 0:b.pieces)??[]){G(ne.dir);const{piece:Oe}=am(ne,Se);re(Oe??"P")}async function Y(ne){if(confirm(`Delete scan "${ne}" (mesh will be removed)?`)){N("");try{await Wl(`/api/scan/scan/${ne}`),B===ne&&G(""),Et()}catch(Se){N("Delete failed: "+Se.message)}}}async function pn(ne,Se){if(confirm(`Delete prepared piece "${ne}/${Se}"? (Scan folder is kept.)`)){N("");try{await Wl(`/api/scan/piece/${ne}/${Se}`),z(null),Et()}catch(Oe){N("Delete failed: "+Oe.message)}}}async function wt(){var ne;if(!(!ce||!Be)){ye(!0),N("");try{const Se=new FormData;Se.append("name",Be),Se.append("mesh",ce),X&&Se.append("texture",X);const Oe=await fetch("/api/scan/upload",{method:"POST",body:Se});if(!Oe.ok)throw new Error(((ne=await Oe.json())==null?void 0:ne.detail)||`HTTP ${Oe.status}`);await Et(),G(Be),Ge(""),P(null),Le(null)}catch(Se){N("Upload: "+Se.message)}ye(!1)}}const O=()=>rn("/api/scan/prepare/status").then(ne=>{z(ne),ne.state!=="running"&&(clearInterval(ge.current),Et())}).catch(()=>{});V.useEffect(()=>(Et(),rn("/api/scan/prepare/status").then(ne=>{ne.state==="running"&&(z(ne),ge.current=setInterval(O,2e3))}).catch(()=>{}),()=>{clearInterval(ge.current)}),[]);async function T(){N("");try{const ne=await en("/api/scan/prepare",{dir:B,piece:Z});z({state:"running",piece:Z,variant:ne==null?void 0:ne.variant}),clearInterval(ge.current),ge.current=setInterval(O,2e3)}catch(ne){N("Prepare failed: "+ne.message)}}const I=_==null?void 0:_.recording,Q=C&&{left:Math.min(C.x0,C.x1),top:Math.min(C.y0,C.y1),width:Math.abs(C.x1-C.x0),height:Math.abs(C.y1-C.y0)},me=(b==null?void 0:b.scans)??[],Ee=me.find(ne=>ne.dir===B),Re=Ee?am(Ee,(b==null?void 0:b.pieces)??[]):null,xe=Re==null?void 0:Re.stage,ve=(he==null?void 0:he.state)==="running",Ie=xe==="done"?2:1;let We;return ve?We="running…":xe==="done"?We="Re-prepare":We="Prepare",v.jsxs("div",{className:"space-y-4",children:[v.jsx(fn,{children:v.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Live preview stream (MJPEG, …/video/m.jpeg) or USB index.",children:["Preview",v.jsx("input",{value:i,onChange:ne=>e(ne.target.value),className:`${Or} w-96`,placeholder:"Stream URL (…/video/m.jpeg) or USB index (0/1)"})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Photo to save per capture (snapshot URL, …/video/snapshot). Empty = use live frame.",children:["Photo",v.jsx("input",{value:t,onChange:ne=>r(ne.target.value),className:`${Or} w-96`,placeholder:"Snapshot URL (…/video/snapshot), empty = live frame"})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"For USB cam only: requested resolution (MJPG).",children:["USB Res",v.jsx("input",{type:"number",value:a,onChange:ne=>l(+ne.target.value),className:`${Or} w-20`}),"×",v.jsx("input",{type:"number",value:c,onChange:ne=>d(+ne.target.value),className:`${Or} w-20`})]}),_!=null&&_.open?v.jsxs(Tt,{onClick:Gt,children:[v.jsx(Hx,{className:"h-4 w-4"})," Disconnect"]}):v.jsxs(Tt,{variant:"primary",onClick:tt,children:[v.jsx(Hx,{className:"h-4 w-4"})," Connect"]}),v.jsxs("span",{className:"text-xs text-zinc-500",children:[L,_!=null&&_.error?` · ${_.error}`:""]})]})}),(_==null?void 0:_.open)&&v.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_320px]",children:[v.jsxs(fn,{title:"Live · Drag crop",children:[v.jsxs("div",{className:"relative inline-block select-none leading-none",children:[v.jsx("img",{ref:D,src:"/api/scan/preview.mjpg",alt:"Scan preview",draggable:!1,className:"w-full rounded-lg border border-zinc-800"}),v.jsx("div",{className:"absolute inset-0 cursor-crosshair",onPointerDown:Rt,onPointerMove:mt,onPointerUp:vt,children:Q&&v.jsx("div",{className:"absolute border-2 border-sky-400 bg-sky-400/10",style:{left:Q.left,top:Q.top,width:Q.width,height:Q.height}})})]}),v.jsxs("div",{className:"mt-2 flex items-center gap-3 text-xs text-zinc-500",children:[v.jsxs("span",{children:["Source ",_.frame_size[0],"×",_.frame_size[1]]}),v.jsxs("span",{children:["Crop: ",_.crop?_.crop.join(", "):"—"]}),v.jsxs(Tt,{onClick:kt,className:"px-2 py-1 text-xs",children:[v.jsx(fw,{className:"h-3 w-3"})," Reset crop"]})]})]}),v.jsx(fn,{title:"Capture",children:v.jsxs("div",{className:"space-y-3",children:[v.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",children:["Target folder",v.jsx("input",{value:h,onChange:ne=>f(ne.target.value),className:`${Or} w-40`})]}),v.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",title:"Seconds between two photos. On phone ~0.8s is the limit (HTTPS fetch).",children:["Interval (s)",v.jsx("input",{type:"number",step:.1,min:0,value:m,onChange:ne=>g(+ne.target.value),className:`${Or} w-24`})]}),v.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",title:"Photos per capture run. 0 = until stop.",children:["Count (0=∞)",v.jsx("input",{type:"number",min:0,value:x,onChange:ne=>M(+ne.target.value),className:`${Or} w-24`})]}),v.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",children:["JPEG quality",v.jsx("input",{type:"number",min:50,max:100,value:E,onChange:ne=>w(+ne.target.value),className:`${Or} w-24`})]}),v.jsxs("div",{className:"flex flex-wrap gap-2 pt-1",children:[I?v.jsxs(Tt,{onClick:$t,children:[v.jsx(Z_,{className:"h-4 w-4"})," Stop"]}):v.jsxs(Tt,{variant:"primary",onClick:qt,children:[v.jsx(Tm,{className:"h-4 w-4"})," Start capture"]}),v.jsxs(Tt,{onClick:Xt,title:"Apply interval/count/quality without capturing",children:[v.jsx(rw,{className:"h-4 w-4"})," Apply"]})]}),v.jsxs("div",{className:"rounded-lg bg-zinc-800 p-3 text-sm",children:[I?v.jsxs("span",{className:"font-medium text-green-500",children:["● Capture running — ",_.saved_run,_.count?` / ${_.count}`:""," photos"]}):v.jsx("span",{className:"text-zinc-400",children:"Ready"}),v.jsxs("div",{className:"mt-1 text-xs text-zinc-500",children:["In folder ",v.jsx("b",{className:"text-zinc-300",children:_.out||h}),": ",_.total," photos total (next no. ",_.index,")"]})]}),v.jsxs("p",{className:"text-xs text-zinc-500",children:["Motor on, phone/cam ",v.jsx("b",{children:"fixed"}),', hands off. "Start capture" appends to existing photos (for ring 2/3 simply reposition + start again).']})]})})]}),!(_!=null&&_.open)&&v.jsxs("p",{className:"text-xs text-zinc-500",children:["Connect a source (phone IP cam URL or USB index), drag the ",v.jsx("b",{children:"crop"})," around the piece + turntable (static background out), set ",v.jsx("b",{children:"interval"})," and ",v.jsx("b",{children:"count"})," and capture. Photos go to ",v.jsx("b",{children:"scans/<folder>"})," — ready for RealityScan."]}),v.jsxs(fn,{title:"Piece workshop — 3D scan → piece",children:[v.jsx("div",{className:"mb-4 flex items-center gap-1 text-xs",children:[[1,"Upload",J_],[2,"Prepare",Vx]].map(([ne,Se,Oe],nt)=>v.jsxs("div",{className:"flex items-center gap-1",children:[v.jsxs("div",{className:`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${Ie>=ne?"bg-sky-500/15 text-sky-300":"bg-zinc-800 text-zinc-500"}`,children:[v.jsx(Oe,{className:"h-3.5 w-3.5"})," ",v.jsx("span",{children:Se})]}),nt<1&&v.jsx("div",{className:`h-px w-4 ${Ie>ne?"bg-sky-500/40":"bg-zinc-700"}`})]},ne))}),me.length===0&&v.jsx("p",{className:"text-sm text-zinc-500",children:"No scans yet. Upload a 3D model (.obj/.glb) — it appears here as a card."}),v.jsx(P2,{uploadName:Be,setUploadName:Ge,meshFile:ce,setMeshFile:P,texFile:X,setTexFile:Le,uploading:le,doUpload:wt,input:Or}),v.jsx(N2,{scans:me,models:b,dir:B,selectScan:zt,deleteScan:Y,prep:he}),Ee&&v.jsxs("div",{className:"mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4",children:[v.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[v.jsxs("div",{className:"flex items-center gap-2",children:[v.jsxs("div",{children:[v.jsx("div",{className:"text-sm font-medium text-zinc-100",children:Ee.dir}),v.jsxs("div",{className:"text-xs text-zinc-500",children:[Ee.mesh?"Mesh present":"no mesh yet",!Ee.texture&&Ee.mesh?" · ⚠ without texture":""]})]}),v.jsx("button",{onClick:()=>Y(Ee.dir),title:"Delete scan",className:"rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400",children:v.jsx(Ta,{className:"h-4 w-4"})})]}),v.jsxs(Tt,{variant:"primary",onClick:T,disabled:ve,children:[ve?v.jsx(Un,{className:"h-4 w-4 animate-spin"}):v.jsx(Vx,{className:"h-4 w-4"}),We]})]}),v.jsx(D2,{cur:Ee,busyPrep:ve,prep:he}),L&&v.jsx("p",{className:"mt-2 text-sm text-red-400",children:L})]}),v.jsx(I2,{pieces:b==null?void 0:b.pieces,setView3d:de,deletePiece:pn,prep:he,kind:ae,setKind:ee})]}),q&&v.jsx(L2,{piece:q.piece,variant:q.variant,textured:ae==="textured",onClose:()=>de(null)})]})}function P2({uploadName:i,setUploadName:e,meshFile:t,setMeshFile:r,texFile:a,setTexFile:l,uploading:c,doUpload:d,input:h}){return v.jsxs("div",{className:"mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3",children:[v.jsx("div",{className:"mb-2 text-xs font-medium text-zinc-400",children:"Upload 3D model (.obj/.glb)"}),v.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[v.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Name",v.jsx("input",{value:i,onChange:f=>e(f.target.value),placeholder:"e.g. wK",className:`${h} w-32`})]}),v.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Mesh (.obj/.glb)",v.jsx("input",{type:"file",accept:".obj,.glb,.gltf",onChange:f=>{var m;return r(((m=f.target.files)==null?void 0:m[0])??null)},className:"text-xs text-zinc-300 file:mr-1 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-0.5 file:text-xs file:text-zinc-200"})]}),v.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Texture (optional)",v.jsx("input",{type:"file",accept:".png,.jpg,.jpeg",onChange:f=>{var m;return l(((m=f.target.files)==null?void 0:m[0])??null)},className:"text-xs text-zinc-300 file:mr-1 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-0.5 file:text-xs file:text-zinc-200"})]}),v.jsxs(Tt,{variant:"primary",onClick:d,disabled:c||!t||!i,children:[c?v.jsx(Un,{className:"h-4 w-4 animate-spin"}):v.jsx(J_,{className:"h-4 w-4"}),"Upload"]})]})]})}function N2({scans:i,models:e,dir:t,selectScan:r,deleteScan:a,prep:l}){return v.jsx("div",{className:"grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4",children:i.map(c=>{var M;const d=am(c,(e==null?void 0:e.pieces)??[]),h=c.dir===t,m=(l==null?void 0:l.state)==="running"&&l.dir===c.dir||((M=e==null?void 0:e.jobs)==null?void 0:M.prepare)===c.dir,g=m?["preparing…","bg-sky-500/20 text-sky-300"]:{mesh:["Mesh ready","bg-sky-500/15 text-sky-300"],done:["Ready","bg-green-500/15 text-green-300"]}[d.stage],x=d.piece&&d.stage==="done";return v.jsxs("div",{onClick:()=>r(c),role:"button",tabIndex:0,onKeyDown:E=>{(E.key==="Enter"||E.key===" ")&&(E.preventDefault(),r(c))},className:`group relative flex cursor-pointer flex-col rounded-xl border p-2 text-left transition ${h?"border-sky-500 bg-sky-500/5":"border-zinc-800 hover:border-zinc-600"}`,children:[v.jsxs("div",{className:"relative mb-1.5 aspect-square overflow-hidden rounded-lg bg-zinc-950",children:[x?v.jsx("img",{src:`/api/scan/prepare/preview/${d.piece}/${d.variant}?kind=textured`,alt:`${hd(d.piece)} preview`,className:"h-full w-full object-contain"}):v.jsx("div",{className:"grid h-full place-items-center text-zinc-700",children:v.jsx(wm,{className:"h-8 w-8"})}),v.jsxs("span",{className:`absolute left-1 top-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${g[1]}`,children:[m&&v.jsx(Un,{className:"h-3 w-3 animate-spin"}),g[0]]}),v.jsx("button",{onClick:E=>{E.stopPropagation(),a(c.dir)},title:"Delete scan folder",className:"absolute right-1 top-1 hidden rounded bg-zinc-900/80 p-1 text-zinc-400 hover:text-red-400 group-hover:block",children:v.jsx(Ta,{className:"h-3.5 w-3.5"})})]}),v.jsx("div",{className:"text-sm font-medium text-zinc-200",children:c.dir}),v.jsx("div",{className:"text-[11px] text-zinc-500",children:d.piece?`${hd(d.piece)}`:""})]},c.dir)})})}function L2({piece:i,variant:e,textured:t,onClose:r}){const[a,l]=V.useState(t);return V.useEffect(()=>{const c=d=>d.key==="Escape"&&r();return window.addEventListener("keydown",c),()=>window.removeEventListener("keydown",c)},[r]),v.jsx("div",{onClick:r,role:"button",tabIndex:0,onKeyDown:c=>{(c.key==="Enter"||c.key===" ")&&(c.preventDefault(),r())},className:"fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-6",children:v.jsxs("div",{onClick:c=>c.stopPropagation(),role:"presentation",onKeyDown:c=>c.stopPropagation(),className:"flex flex-col items-center gap-3",children:[v.jsx(E2,{piece:i,variant:e,textured:a,size:Math.min(720,window.innerHeight-160)}),v.jsxs("div",{className:"flex items-center gap-3 text-sm text-zinc-300",children:[v.jsxs("span",{className:"font-medium",children:[i,"/",e]}),v.jsx(Fy,{value:a?"textured":"clay",onChange:c=>l(c==="textured")}),v.jsx("span",{className:"text-xs text-zinc-500",children:"drag to rotate · scroll to zoom · Esc to close"})]})]})})}function D2({cur:i,busyPrep:e,prep:t}){return v.jsxs(v.Fragment,{children:[e&&v.jsxs("div",{className:"flex items-center gap-2 rounded-lg bg-sky-500/10 p-3 text-sm text-sky-300",children:[v.jsx(Un,{className:"h-4 w-4 animate-spin"})," Piece is being prepared — about 1-3 min…"]}),(t==null?void 0:t.state)==="failed"&&v.jsxs("div",{className:"rounded-lg bg-red-500/10 p-3 text-sm text-red-300",children:[v.jsxs("div",{className:"flex items-center gap-2",children:[v.jsx(Cm,{className:"h-4 w-4"})," Preparation failed."]}),t.log_tail&&v.jsx("pre",{className:"mt-1 whitespace-pre-wrap text-xs text-red-400/70",children:t.log_tail})]})]})}function I2({pieces:i,setView3d:e,deletePiece:t,prep:r,kind:a,setKind:l}){return i!=null&&i.length?v.jsxs("div",{className:"mt-4 border-t border-zinc-800 pt-3",children:[v.jsx("div",{className:"mb-2 text-xs font-medium text-zinc-400",children:"Finished pieces (synth_pieces/)"}),v.jsx("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",children:i.map(c=>{var h,f;const d=(r==null?void 0:r.state)==="running"&&r.piece===c.piece&&r.variant===c.variant;return v.jsxs("div",{className:"relative rounded-xl border border-zinc-800 bg-zinc-900/50 p-2",children:[v.jsxs("div",{className:"relative mb-2 aspect-square overflow-hidden rounded-lg bg-zinc-950",children:[c.has_preview?v.jsx("img",{src:`/api/scan/prepare/preview/${c.piece}/${c.variant}?kind=${a}`,alt:`${hd(c.piece)}`,className:"h-full w-full object-contain"}):v.jsx("div",{className:"grid h-full place-items-center text-zinc-700",children:v.jsx(cw,{className:"h-8 w-8"})}),v.jsx("button",{onClick:()=>e({piece:c.piece,variant:c.variant}),title:"Open 3D view",className:"absolute right-1 top-1 rounded bg-zinc-900/80 p-1 text-zinc-400 hover:text-white",children:v.jsx(dw,{className:"h-3.5 w-3.5"})})]}),v.jsxs("div",{className:"flex items-center justify-between",children:[v.jsxs("span",{className:"text-sm font-medium text-zinc-200",children:[hd(c.piece)," · ",c.variant]}),d&&v.jsx(Un,{className:"h-3.5 w-3.5 animate-spin text-sky-400"})]}),v.jsx(Fy,{value:a,onChange:l,clayDisabled:!c.has_clay}),c.report&&v.jsx(U2,{piece:c.piece,variant:c.variant,report:c.report,level:(h=c.report)==null?void 0:h.level,messages:(f=c.report)==null?void 0:f.messages,onDelete:t})]},c.id)})})]}):null}function U2({piece:i,variant:e,report:t,level:r,messages:a,onDelete:l}){return!t||!t.tris?null:v.jsxs("div",{className:"mt-2 rounded-lg bg-zinc-800 p-2 text-[11px] text-zinc-400",children:[r&&v.jsxs("div",{className:`mb-1 flex items-center gap-1 font-medium ${r==="ok"?"text-green-400":"text-amber-400"}`,children:[r==="ok"?v.jsx(bm,{className:"h-4 w-4"}):v.jsx(Cm,{className:"h-4 w-4"}),r==="ok"?"Quality OK":"Please check"]}),(a??[]).map((c,d)=>v.jsxs("div",{className:"text-amber-300/90",children:["• ",c]},d)),v.jsxs("div",{className:"grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pt-1",children:[v.jsx("span",{className:"text-zinc-500",children:"Triangles"}),v.jsx("span",{children:t.tris}),v.jsx("span",{className:"text-zinc-500",children:"open edges"}),v.jsx("span",{children:t.boundary_edges}),v.jsx("span",{className:"text-zinc-500",children:"Height/Base"}),v.jsx("span",{children:t.height_ratio})]}),v.jsxs("div",{className:"pt-1 text-zinc-500",children:["→ synth_pieces/",i,"/",e,".obj"]}),v.jsxs("button",{onClick:()=>l(i,e),className:"mt-1 flex items-center gap-1 text-red-400/80 hover:text-red-400",children:[v.jsx(Ta,{className:"h-3.5 w-3.5"})," Delete piece"]})]})}function Fy({value:i,onChange:e,clayDisabled:t}){return v.jsxs("div",{className:"mt-2 flex overflow-hidden rounded-lg border border-zinc-700 text-xs",children:[v.jsx("button",{onClick:()=>e("textured"),className:`px-3 py-1 ${i==="textured"?"bg-sky-600 text-white":"text-zinc-400 hover:bg-zinc-700"}`,children:"Textured"}),v.jsx("button",{onClick:()=>e("clay"),disabled:t,title:t?"no clay image (piece prepared before this update)":"geometry only",className:`px-3 py-1 ${i==="clay"?"bg-sky-600 text-white":"text-zinc-400 hover:bg-zinc-700"} ${t?"cursor-not-allowed opacity-40":""}`,children:"Clay"})]})}const F2=[{to:"/collect",label:"Collect",icon:wm},{to:"/scan",label:"Scan",icon:Z1},{to:"/datasets",label:"Datasets",icon:aw},{to:"/training",label:"Training",icon:ew}],O2=({isActive:i})=>`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${i?"bg-zinc-800 text-zinc-100":"text-zinc-400 hover:text-zinc-100"}`;function k2(){return v.jsx(F1,{children:v.jsxs("div",{className:"min-h-full",children:[v.jsx("header",{className:"sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur",children:v.jsxs("div",{className:"mx-auto flex max-w-7xl items-center gap-6 px-5 py-3",children:[v.jsxs("div",{className:"flex items-center gap-2 font-semibold tracking-tight",children:[v.jsx(sw,{className:"h-5 w-5 text-sky-400"})," chesslab"]}),v.jsx("nav",{className:"flex flex-wrap gap-1",children:F2.map(i=>{const e=i.icon;return v.jsxs(mo,{to:i.to,className:O2,children:[v.jsx(e,{className:"h-4 w-4"})," ",i.label]},i.to)})})]})}),v.jsx("main",{className:"mx-auto max-w-7xl px-5 py-6",children:v.jsxs(d1,{children:[v.jsx($i,{path:"/",element:v.jsx(cf,{to:"/collect",replace:!0})}),v.jsx($i,{path:"/collect",element:v.jsx(_w,{})}),v.jsx($i,{path:"/scan",element:v.jsx(A2,{})}),v.jsxs($i,{path:"/datasets",element:v.jsx(Sw,{}),children:[v.jsx($i,{index:!0,element:v.jsx(cf,{to:"sessions",replace:!0})}),v.jsx($i,{path:"sessions",element:v.jsx(ww,{})}),v.jsx($i,{path:"curated",element:v.jsx(bw,{})}),v.jsx($i,{path:"stats",element:v.jsx(Tw,{})})]}),v.jsx($i,{path:"/training",element:v.jsx(Pw,{})}),v.jsx($i,{path:"*",element:v.jsx(cf,{to:"/collect",replace:!0})})]})})]})})}const z2=new QM({defaultOptions:{queries:{staleTime:0,refetchOnWindowFocus:!0,refetchOnMount:"always",retry:1}}});bM.createRoot(document.getElementById("root")).render(v.jsx(_M.StrictMode,{children:v.jsx(ZM,{client:z2,children:v.jsx(k2,{})})}));
