var ux=i=>{throw TypeError(i)};var sf=(i,e,t)=>e.has(i)||ux("Cannot "+t);var G=(i,e,t)=>(sf(i,e,"read from private field"),t?t.call(i):e.get(i)),it=(i,e,t)=>e.has(i)?ux("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(i):e.set(i,t),Ve=(i,e,t,r)=>(sf(i,e,"write to private field"),r?r.call(i,t):e.set(i,t),t),xt=(i,e,t)=>(sf(i,e,"access private method"),t);var hu=(i,e,t,r)=>({set _(a){Ve(i,e,a,t)},get _(){return G(i,e,r)}});(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))r(a);new MutationObserver(a=>{for(const l of a)if(l.type==="childList")for(const c of l.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&r(c)}).observe(document,{childList:!0,subtree:!0});function t(a){const l={};return a.integrity&&(l.integrity=a.integrity),a.referrerPolicy&&(l.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?l.credentials="include":a.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function r(a){if(a.ep)return;a.ep=!0;const l=t(a);fetch(a.href,l)}})();function MM(i){return i&&i.__esModule&&Object.prototype.hasOwnProperty.call(i,"default")?i.default:i}var af={exports:{}},Tl={},of={exports:{}},Mt={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var hx;function EM(){if(hx)return Mt;hx=1;var i=Symbol.for("react.element"),e=Symbol.for("react.portal"),t=Symbol.for("react.fragment"),r=Symbol.for("react.strict_mode"),a=Symbol.for("react.profiler"),l=Symbol.for("react.provider"),c=Symbol.for("react.context"),h=Symbol.for("react.forward_ref"),d=Symbol.for("react.suspense"),f=Symbol.for("react.memo"),v=Symbol.for("react.lazy"),g=Symbol.iterator;function p(O){return O===null||typeof O!="object"?null:(O=g&&O[g]||O["@@iterator"],typeof O=="function"?O:null)}var y={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},E=Object.assign,b={};function M(O,ne,Re){this.props=O,this.context=ne,this.refs=b,this.updater=Re||y}M.prototype.isReactComponent={},M.prototype.setState=function(O,ne){if(typeof O!="object"&&typeof O!="function"&&O!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,O,ne,"setState")},M.prototype.forceUpdate=function(O){this.updater.enqueueForceUpdate(this,O,"forceUpdate")};function S(){}S.prototype=M.prototype;function A(O,ne,Re){this.props=O,this.context=ne,this.refs=b,this.updater=Re||y}var D=A.prototype=new S;D.constructor=A,E(D,M.prototype),D.isPureReactComponent=!0;var C=Array.isArray,I=Object.prototype.hasOwnProperty,L={current:null},U={key:!0,ref:!0,__self:!0,__source:!0};function w(O,ne,Re){var xe,Ne={},B=null,ge=null;if(ne!=null)for(xe in ne.ref!==void 0&&(ge=ne.ref),ne.key!==void 0&&(B=""+ne.key),ne)I.call(ne,xe)&&!U.hasOwnProperty(xe)&&(Ne[xe]=ne[xe]);var fe=arguments.length-2;if(fe===1)Ne.children=Re;else if(1<fe){for(var re=Array(fe),Ie=0;Ie<fe;Ie++)re[Ie]=arguments[Ie+2];Ne.children=re}if(O&&O.defaultProps)for(xe in fe=O.defaultProps,fe)Ne[xe]===void 0&&(Ne[xe]=fe[xe]);return{$$typeof:i,type:O,key:B,ref:ge,props:Ne,_owner:L.current}}function N(O,ne){return{$$typeof:i,type:O.type,key:ne,ref:O.ref,props:O.props,_owner:O._owner}}function H(O){return typeof O=="object"&&O!==null&&O.$$typeof===i}function V(O){var ne={"=":"=0",":":"=2"};return"$"+O.replace(/[=:]/g,function(Re){return ne[Re]})}var X=/\/+/g;function j(O,ne){return typeof O=="object"&&O!==null&&O.key!=null?V(""+O.key):ne.toString(36)}function he(O,ne,Re,xe,Ne){var B=typeof O;(B==="undefined"||B==="boolean")&&(O=null);var ge=!1;if(O===null)ge=!0;else switch(B){case"string":case"number":ge=!0;break;case"object":switch(O.$$typeof){case i:case e:ge=!0}}if(ge)return ge=O,Ne=Ne(ge),O=xe===""?"."+j(ge,0):xe,C(Ne)?(Re="",O!=null&&(Re=O.replace(X,"$&/")+"/"),he(Ne,ne,Re,"",function(Ie){return Ie})):Ne!=null&&(H(Ne)&&(Ne=N(Ne,Re+(!Ne.key||ge&&ge.key===Ne.key?"":(""+Ne.key).replace(X,"$&/")+"/")+O)),ne.push(Ne)),1;if(ge=0,xe=xe===""?".":xe+":",C(O))for(var fe=0;fe<O.length;fe++){B=O[fe];var re=xe+j(B,fe);ge+=he(B,ne,Re,re,Ne)}else if(re=p(O),typeof re=="function")for(O=re.call(O),fe=0;!(B=O.next()).done;)B=B.value,re=xe+j(B,fe++),ge+=he(B,ne,Re,re,Ne);else if(B==="object")throw ne=String(O),Error("Objects are not valid as a React child (found: "+(ne==="[object Object]"?"object with keys {"+Object.keys(O).join(", ")+"}":ne)+"). If you meant to render a collection of children, use an array instead.");return ge}function $(O,ne,Re){if(O==null)return O;var xe=[],Ne=0;return he(O,xe,"","",function(B){return ne.call(Re,B,Ne++)}),xe}function oe(O){if(O._status===-1){var ne=O._result;ne=ne(),ne.then(function(Re){(O._status===0||O._status===-1)&&(O._status=1,O._result=Re)},function(Re){(O._status===0||O._status===-1)&&(O._status=2,O._result=Re)}),O._status===-1&&(O._status=0,O._result=ne)}if(O._status===1)return O._result.default;throw O._result}var Q={current:null},q={transition:null},Y={ReactCurrentDispatcher:Q,ReactCurrentBatchConfig:q,ReactCurrentOwner:L};function Z(){throw Error("act(...) is not supported in production builds of React.")}return Mt.Children={map:$,forEach:function(O,ne,Re){$(O,function(){ne.apply(this,arguments)},Re)},count:function(O){var ne=0;return $(O,function(){ne++}),ne},toArray:function(O){return $(O,function(ne){return ne})||[]},only:function(O){if(!H(O))throw Error("React.Children.only expected to receive a single React element child.");return O}},Mt.Component=M,Mt.Fragment=t,Mt.Profiler=a,Mt.PureComponent=A,Mt.StrictMode=r,Mt.Suspense=d,Mt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Y,Mt.act=Z,Mt.cloneElement=function(O,ne,Re){if(O==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+O+".");var xe=E({},O.props),Ne=O.key,B=O.ref,ge=O._owner;if(ne!=null){if(ne.ref!==void 0&&(B=ne.ref,ge=L.current),ne.key!==void 0&&(Ne=""+ne.key),O.type&&O.type.defaultProps)var fe=O.type.defaultProps;for(re in ne)I.call(ne,re)&&!U.hasOwnProperty(re)&&(xe[re]=ne[re]===void 0&&fe!==void 0?fe[re]:ne[re])}var re=arguments.length-2;if(re===1)xe.children=Re;else if(1<re){fe=Array(re);for(var Ie=0;Ie<re;Ie++)fe[Ie]=arguments[Ie+2];xe.children=fe}return{$$typeof:i,type:O.type,key:Ne,ref:B,props:xe,_owner:ge}},Mt.createContext=function(O){return O={$$typeof:c,_currentValue:O,_currentValue2:O,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},O.Provider={$$typeof:l,_context:O},O.Consumer=O},Mt.createElement=w,Mt.createFactory=function(O){var ne=w.bind(null,O);return ne.type=O,ne},Mt.createRef=function(){return{current:null}},Mt.forwardRef=function(O){return{$$typeof:h,render:O}},Mt.isValidElement=H,Mt.lazy=function(O){return{$$typeof:v,_payload:{_status:-1,_result:O},_init:oe}},Mt.memo=function(O,ne){return{$$typeof:f,type:O,compare:ne===void 0?null:ne}},Mt.startTransition=function(O){var ne=q.transition;q.transition={};try{O()}finally{q.transition=ne}},Mt.unstable_act=Z,Mt.useCallback=function(O,ne){return Q.current.useCallback(O,ne)},Mt.useContext=function(O){return Q.current.useContext(O)},Mt.useDebugValue=function(){},Mt.useDeferredValue=function(O){return Q.current.useDeferredValue(O)},Mt.useEffect=function(O,ne){return Q.current.useEffect(O,ne)},Mt.useId=function(){return Q.current.useId()},Mt.useImperativeHandle=function(O,ne,Re){return Q.current.useImperativeHandle(O,ne,Re)},Mt.useInsertionEffect=function(O,ne){return Q.current.useInsertionEffect(O,ne)},Mt.useLayoutEffect=function(O,ne){return Q.current.useLayoutEffect(O,ne)},Mt.useMemo=function(O,ne){return Q.current.useMemo(O,ne)},Mt.useReducer=function(O,ne,Re){return Q.current.useReducer(O,ne,Re)},Mt.useRef=function(O){return Q.current.useRef(O)},Mt.useState=function(O){return Q.current.useState(O)},Mt.useSyncExternalStore=function(O,ne,Re){return Q.current.useSyncExternalStore(O,ne,Re)},Mt.useTransition=function(){return Q.current.useTransition()},Mt.version="18.3.1",Mt}var dx;function fm(){return dx||(dx=1,of.exports=EM()),of.exports}/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var fx;function wM(){if(fx)return Tl;fx=1;var i=fm(),e=Symbol.for("react.element"),t=Symbol.for("react.fragment"),r=Object.prototype.hasOwnProperty,a=i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,l={key:!0,ref:!0,__self:!0,__source:!0};function c(h,d,f){var v,g={},p=null,y=null;f!==void 0&&(p=""+f),d.key!==void 0&&(p=""+d.key),d.ref!==void 0&&(y=d.ref);for(v in d)r.call(d,v)&&!l.hasOwnProperty(v)&&(g[v]=d[v]);if(h&&h.defaultProps)for(v in d=h.defaultProps,d)g[v]===void 0&&(g[v]=d[v]);return{$$typeof:e,type:h,key:p,ref:y,props:g,_owner:a.current}}return Tl.Fragment=t,Tl.jsx=c,Tl.jsxs=c,Tl}var px;function bM(){return px||(px=1,af.exports=wM()),af.exports}var x=bM(),k=fm();const TM=MM(k);var du={},lf={exports:{}},ai={},cf={exports:{}},uf={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var mx;function CM(){return mx||(mx=1,(function(i){function e(q,Y){var Z=q.length;q.push(Y);e:for(;0<Z;){var O=Z-1>>>1,ne=q[O];if(0<a(ne,Y))q[O]=Y,q[Z]=ne,Z=O;else break e}}function t(q){return q.length===0?null:q[0]}function r(q){if(q.length===0)return null;var Y=q[0],Z=q.pop();if(Z!==Y){q[0]=Z;e:for(var O=0,ne=q.length,Re=ne>>>1;O<Re;){var xe=2*(O+1)-1,Ne=q[xe],B=xe+1,ge=q[B];if(0>a(Ne,Z))B<ne&&0>a(ge,Ne)?(q[O]=ge,q[B]=Z,O=B):(q[O]=Ne,q[xe]=Z,O=xe);else if(B<ne&&0>a(ge,Z))q[O]=ge,q[B]=Z,O=B;else break e}}return Y}function a(q,Y){var Z=q.sortIndex-Y.sortIndex;return Z!==0?Z:q.id-Y.id}if(typeof performance=="object"&&typeof performance.now=="function"){var l=performance;i.unstable_now=function(){return l.now()}}else{var c=Date,h=c.now();i.unstable_now=function(){return c.now()-h}}var d=[],f=[],v=1,g=null,p=3,y=!1,E=!1,b=!1,M=typeof setTimeout=="function"?setTimeout:null,S=typeof clearTimeout=="function"?clearTimeout:null,A=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function D(q){for(var Y=t(f);Y!==null;){if(Y.callback===null)r(f);else if(Y.startTime<=q)r(f),Y.sortIndex=Y.expirationTime,e(d,Y);else break;Y=t(f)}}function C(q){if(b=!1,D(q),!E)if(t(d)!==null)E=!0,oe(I);else{var Y=t(f);Y!==null&&Q(C,Y.startTime-q)}}function I(q,Y){E=!1,b&&(b=!1,S(w),w=-1),y=!0;var Z=p;try{for(D(Y),g=t(d);g!==null&&(!(g.expirationTime>Y)||q&&!V());){var O=g.callback;if(typeof O=="function"){g.callback=null,p=g.priorityLevel;var ne=O(g.expirationTime<=Y);Y=i.unstable_now(),typeof ne=="function"?g.callback=ne:g===t(d)&&r(d),D(Y)}else r(d);g=t(d)}if(g!==null)var Re=!0;else{var xe=t(f);xe!==null&&Q(C,xe.startTime-Y),Re=!1}return Re}finally{g=null,p=Z,y=!1}}var L=!1,U=null,w=-1,N=5,H=-1;function V(){return!(i.unstable_now()-H<N)}function X(){if(U!==null){var q=i.unstable_now();H=q;var Y=!0;try{Y=U(!0,q)}finally{Y?j():(L=!1,U=null)}}else L=!1}var j;if(typeof A=="function")j=function(){A(X)};else if(typeof MessageChannel<"u"){var he=new MessageChannel,$=he.port2;he.port1.onmessage=X,j=function(){$.postMessage(null)}}else j=function(){M(X,0)};function oe(q){U=q,L||(L=!0,j())}function Q(q,Y){w=M(function(){q(i.unstable_now())},Y)}i.unstable_IdlePriority=5,i.unstable_ImmediatePriority=1,i.unstable_LowPriority=4,i.unstable_NormalPriority=3,i.unstable_Profiling=null,i.unstable_UserBlockingPriority=2,i.unstable_cancelCallback=function(q){q.callback=null},i.unstable_continueExecution=function(){E||y||(E=!0,oe(I))},i.unstable_forceFrameRate=function(q){0>q||125<q?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):N=0<q?Math.floor(1e3/q):5},i.unstable_getCurrentPriorityLevel=function(){return p},i.unstable_getFirstCallbackNode=function(){return t(d)},i.unstable_next=function(q){switch(p){case 1:case 2:case 3:var Y=3;break;default:Y=p}var Z=p;p=Y;try{return q()}finally{p=Z}},i.unstable_pauseExecution=function(){},i.unstable_requestPaint=function(){},i.unstable_runWithPriority=function(q,Y){switch(q){case 1:case 2:case 3:case 4:case 5:break;default:q=3}var Z=p;p=q;try{return Y()}finally{p=Z}},i.unstable_scheduleCallback=function(q,Y,Z){var O=i.unstable_now();switch(typeof Z=="object"&&Z!==null?(Z=Z.delay,Z=typeof Z=="number"&&0<Z?O+Z:O):Z=O,q){case 1:var ne=-1;break;case 2:ne=250;break;case 5:ne=1073741823;break;case 4:ne=1e4;break;default:ne=5e3}return ne=Z+ne,q={id:v++,callback:Y,priorityLevel:q,startTime:Z,expirationTime:ne,sortIndex:-1},Z>O?(q.sortIndex=Z,e(f,q),t(d)===null&&q===t(f)&&(b?(S(w),w=-1):b=!0,Q(C,Z-O))):(q.sortIndex=ne,e(d,q),E||y||(E=!0,oe(I))),q},i.unstable_shouldYield=V,i.unstable_wrapCallback=function(q){var Y=p;return function(){var Z=p;p=Y;try{return q.apply(this,arguments)}finally{p=Z}}}})(uf)),uf}var gx;function RM(){return gx||(gx=1,cf.exports=CM()),cf.exports}/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var xx;function AM(){if(xx)return ai;xx=1;var i=fm(),e=RM();function t(n){for(var s="https://reactjs.org/docs/error-decoder.html?invariant="+n,o=1;o<arguments.length;o++)s+="&args[]="+encodeURIComponent(arguments[o]);return"Minified React error #"+n+"; visit "+s+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var r=new Set,a={};function l(n,s){c(n,s),c(n+"Capture",s)}function c(n,s){for(a[n]=s,n=0;n<s.length;n++)r.add(s[n])}var h=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),d=Object.prototype.hasOwnProperty,f=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,v={},g={};function p(n){return d.call(g,n)?!0:d.call(v,n)?!1:f.test(n)?g[n]=!0:(v[n]=!0,!1)}function y(n,s,o,u){if(o!==null&&o.type===0)return!1;switch(typeof s){case"function":case"symbol":return!0;case"boolean":return u?!1:o!==null?!o.acceptsBooleans:(n=n.toLowerCase().slice(0,5),n!=="data-"&&n!=="aria-");default:return!1}}function E(n,s,o,u){if(s===null||typeof s>"u"||y(n,s,o,u))return!0;if(u)return!1;if(o!==null)switch(o.type){case 3:return!s;case 4:return s===!1;case 5:return isNaN(s);case 6:return isNaN(s)||1>s}return!1}function b(n,s,o,u,m,_,R){this.acceptsBooleans=s===2||s===3||s===4,this.attributeName=u,this.attributeNamespace=m,this.mustUseProperty=o,this.propertyName=n,this.type=s,this.sanitizeURL=_,this.removeEmptyString=R}var M={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(n){M[n]=new b(n,0,!1,n,null,!1,!1)}),[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(n){var s=n[0];M[s]=new b(s,1,!1,n[1],null,!1,!1)}),["contentEditable","draggable","spellCheck","value"].forEach(function(n){M[n]=new b(n,2,!1,n.toLowerCase(),null,!1,!1)}),["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(n){M[n]=new b(n,2,!1,n,null,!1,!1)}),"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(n){M[n]=new b(n,3,!1,n.toLowerCase(),null,!1,!1)}),["checked","multiple","muted","selected"].forEach(function(n){M[n]=new b(n,3,!0,n,null,!1,!1)}),["capture","download"].forEach(function(n){M[n]=new b(n,4,!1,n,null,!1,!1)}),["cols","rows","size","span"].forEach(function(n){M[n]=new b(n,6,!1,n,null,!1,!1)}),["rowSpan","start"].forEach(function(n){M[n]=new b(n,5,!1,n.toLowerCase(),null,!1,!1)});var S=/[\-:]([a-z])/g;function A(n){return n[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(n){var s=n.replace(S,A);M[s]=new b(s,1,!1,n,null,!1,!1)}),"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(n){var s=n.replace(S,A);M[s]=new b(s,1,!1,n,"http://www.w3.org/1999/xlink",!1,!1)}),["xml:base","xml:lang","xml:space"].forEach(function(n){var s=n.replace(S,A);M[s]=new b(s,1,!1,n,"http://www.w3.org/XML/1998/namespace",!1,!1)}),["tabIndex","crossOrigin"].forEach(function(n){M[n]=new b(n,1,!1,n.toLowerCase(),null,!1,!1)}),M.xlinkHref=new b("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1),["src","href","action","formAction"].forEach(function(n){M[n]=new b(n,1,!1,n.toLowerCase(),null,!0,!0)});function D(n,s,o,u){var m=M.hasOwnProperty(s)?M[s]:null;(m!==null?m.type!==0:u||!(2<s.length)||s[0]!=="o"&&s[0]!=="O"||s[1]!=="n"&&s[1]!=="N")&&(E(s,o,m,u)&&(o=null),u||m===null?p(s)&&(o===null?n.removeAttribute(s):n.setAttribute(s,""+o)):m.mustUseProperty?n[m.propertyName]=o===null?m.type===3?!1:"":o:(s=m.attributeName,u=m.attributeNamespace,o===null?n.removeAttribute(s):(m=m.type,o=m===3||m===4&&o===!0?"":""+o,u?n.setAttributeNS(u,s,o):n.setAttribute(s,o))))}var C=i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,I=Symbol.for("react.element"),L=Symbol.for("react.portal"),U=Symbol.for("react.fragment"),w=Symbol.for("react.strict_mode"),N=Symbol.for("react.profiler"),H=Symbol.for("react.provider"),V=Symbol.for("react.context"),X=Symbol.for("react.forward_ref"),j=Symbol.for("react.suspense"),he=Symbol.for("react.suspense_list"),$=Symbol.for("react.memo"),oe=Symbol.for("react.lazy"),Q=Symbol.for("react.offscreen"),q=Symbol.iterator;function Y(n){return n===null||typeof n!="object"?null:(n=q&&n[q]||n["@@iterator"],typeof n=="function"?n:null)}var Z=Object.assign,O;function ne(n){if(O===void 0)try{throw Error()}catch(o){var s=o.stack.trim().match(/\n( *(at )?)/);O=s&&s[1]||""}return`
`+O+n}var Re=!1;function xe(n,s){if(!n||Re)return"";Re=!0;var o=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(s)if(s=function(){throw Error()},Object.defineProperty(s.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(s,[])}catch(me){var u=me}Reflect.construct(n,[],s)}else{try{s.call()}catch(me){u=me}n.call(s.prototype)}else{try{throw Error()}catch(me){u=me}n()}}catch(me){if(me&&u&&typeof me.stack=="string"){for(var m=me.stack.split(`
`),_=u.stack.split(`
`),R=m.length-1,z=_.length-1;1<=R&&0<=z&&m[R]!==_[z];)z--;for(;1<=R&&0<=z;R--,z--)if(m[R]!==_[z]){if(R!==1||z!==1)do if(R--,z--,0>z||m[R]!==_[z]){var W=`
`+m[R].replace(" at new "," at ");return n.displayName&&W.includes("<anonymous>")&&(W=W.replace("<anonymous>",n.displayName)),W}while(1<=R&&0<=z);break}}}finally{Re=!1,Error.prepareStackTrace=o}return(n=n?n.displayName||n.name:"")?ne(n):""}function Ne(n){switch(n.tag){case 5:return ne(n.type);case 16:return ne("Lazy");case 13:return ne("Suspense");case 19:return ne("SuspenseList");case 0:case 2:case 15:return n=xe(n.type,!1),n;case 11:return n=xe(n.type.render,!1),n;case 1:return n=xe(n.type,!0),n;default:return""}}function B(n){if(n==null)return null;if(typeof n=="function")return n.displayName||n.name||null;if(typeof n=="string")return n;switch(n){case U:return"Fragment";case L:return"Portal";case N:return"Profiler";case w:return"StrictMode";case j:return"Suspense";case he:return"SuspenseList"}if(typeof n=="object")switch(n.$$typeof){case V:return(n.displayName||"Context")+".Consumer";case H:return(n._context.displayName||"Context")+".Provider";case X:var s=n.render;return n=n.displayName,n||(n=s.displayName||s.name||"",n=n!==""?"ForwardRef("+n+")":"ForwardRef"),n;case $:return s=n.displayName||null,s!==null?s:B(n.type)||"Memo";case oe:s=n._payload,n=n._init;try{return B(n(s))}catch{}}return null}function ge(n){var s=n.type;switch(n.tag){case 24:return"Cache";case 9:return(s.displayName||"Context")+".Consumer";case 10:return(s._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return n=s.render,n=n.displayName||n.name||"",s.displayName||(n!==""?"ForwardRef("+n+")":"ForwardRef");case 7:return"Fragment";case 5:return s;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return B(s);case 8:return s===w?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof s=="function")return s.displayName||s.name||null;if(typeof s=="string")return s}return null}function fe(n){switch(typeof n){case"boolean":case"number":case"string":case"undefined":return n;case"object":return n;default:return""}}function re(n){var s=n.type;return(n=n.nodeName)&&n.toLowerCase()==="input"&&(s==="checkbox"||s==="radio")}function Ie(n){var s=re(n)?"checked":"value",o=Object.getOwnPropertyDescriptor(n.constructor.prototype,s),u=""+n[s];if(!n.hasOwnProperty(s)&&typeof o<"u"&&typeof o.get=="function"&&typeof o.set=="function"){var m=o.get,_=o.set;return Object.defineProperty(n,s,{configurable:!0,get:function(){return m.call(this)},set:function(R){u=""+R,_.call(this,R)}}),Object.defineProperty(n,s,{enumerable:o.enumerable}),{getValue:function(){return u},setValue:function(R){u=""+R},stopTracking:function(){n._valueTracker=null,delete n[s]}}}}function qe(n){n._valueTracker||(n._valueTracker=Ie(n))}function jt(n){if(!n)return!1;var s=n._valueTracker;if(!s)return!0;var o=s.getValue(),u="";return n&&(u=re(n)?n.checked?"true":"false":n.value),n=u,n!==o?(s.setValue(n),!0):!1}function ht(n){if(n=n||(typeof document<"u"?document:void 0),typeof n>"u")return null;try{return n.activeElement||n.body}catch{return n.body}}function Ut(n,s){var o=s.checked;return Z({},s,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:o??n._wrapperState.initialChecked})}function Rt(n,s){var o=s.defaultValue==null?"":s.defaultValue,u=s.checked!=null?s.checked:s.defaultChecked;o=fe(s.value!=null?s.value:o),n._wrapperState={initialChecked:u,initialValue:o,controlled:s.type==="checkbox"||s.type==="radio"?s.checked!=null:s.value!=null}}function wt(n,s){s=s.checked,s!=null&&D(n,"checked",s,!1)}function Zt(n,s){wt(n,s);var o=fe(s.value),u=s.type;if(o!=null)u==="number"?(o===0&&n.value===""||n.value!=o)&&(n.value=""+o):n.value!==""+o&&(n.value=""+o);else if(u==="submit"||u==="reset"){n.removeAttribute("value");return}s.hasOwnProperty("value")?hn(n,s.type,o):s.hasOwnProperty("defaultValue")&&hn(n,s.type,fe(s.defaultValue)),s.checked==null&&s.defaultChecked!=null&&(n.defaultChecked=!!s.defaultChecked)}function un(n,s,o){if(s.hasOwnProperty("value")||s.hasOwnProperty("defaultValue")){var u=s.type;if(!(u!=="submit"&&u!=="reset"||s.value!==void 0&&s.value!==null))return;s=""+n._wrapperState.initialValue,o||s===n.value||(n.value=s),n.defaultValue=s}o=n.name,o!==""&&(n.name=""),n.defaultChecked=!!n._wrapperState.initialChecked,o!==""&&(n.name=o)}function hn(n,s,o){(s!=="number"||ht(n.ownerDocument)!==n)&&(o==null?n.defaultValue=""+n._wrapperState.initialValue:n.defaultValue!==""+o&&(n.defaultValue=""+o))}var sn=Array.isArray;function Bt(n,s,o,u){if(n=n.options,s){s={};for(var m=0;m<o.length;m++)s["$"+o[m]]=!0;for(o=0;o<n.length;o++)m=s.hasOwnProperty("$"+n[o].value),n[o].selected!==m&&(n[o].selected=m),m&&u&&(n[o].defaultSelected=!0)}else{for(o=""+fe(o),s=null,m=0;m<n.length;m++){if(n[m].value===o){n[m].selected=!0,u&&(n[m].defaultSelected=!0);return}s!==null||n[m].disabled||(s=n[m])}s!==null&&(s.selected=!0)}}function Jt(n,s){if(s.dangerouslySetInnerHTML!=null)throw Error(t(91));return Z({},s,{value:void 0,defaultValue:void 0,children:""+n._wrapperState.initialValue})}function ee(n,s){var o=s.value;if(o==null){if(o=s.children,s=s.defaultValue,o!=null){if(s!=null)throw Error(t(92));if(sn(o)){if(1<o.length)throw Error(t(93));o=o[0]}s=o}s==null&&(s=""),o=s}n._wrapperState={initialValue:fe(o)}}function Pn(n,s){var o=fe(s.value),u=fe(s.defaultValue);o!=null&&(o=""+o,o!==n.value&&(n.value=o),s.defaultValue==null&&n.defaultValue!==o&&(n.defaultValue=o)),u!=null&&(n.defaultValue=""+u)}function Lt(n){var s=n.textContent;s===n._wrapperState.initialValue&&s!==""&&s!==null&&(n.value=s)}function F(n){switch(n){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function T(n,s){return n==null||n==="http://www.w3.org/1999/xhtml"?F(s):n==="http://www.w3.org/2000/svg"&&s==="foreignObject"?"http://www.w3.org/1999/xhtml":n}var se,de=(function(n){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(s,o,u,m){MSApp.execUnsafeLocalFunction(function(){return n(s,o,u,m)})}:n})(function(n,s){if(n.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in n)n.innerHTML=s;else{for(se=se||document.createElement("div"),se.innerHTML="<svg>"+s.valueOf().toString()+"</svg>",s=se.firstChild;n.firstChild;)n.removeChild(n.firstChild);for(;s.firstChild;)n.appendChild(s.firstChild)}});function ve(n,s){if(s){var o=n.firstChild;if(o&&o===n.lastChild&&o.nodeType===3){o.nodeValue=s;return}}n.textContent=s}var Te={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},Ue=["Webkit","ms","Moz","O"];Object.keys(Te).forEach(function(n){Ue.forEach(function(s){s=s+n.charAt(0).toUpperCase()+n.substring(1),Te[s]=Te[n]})});function _e(n,s,o){return s==null||typeof s=="boolean"||s===""?"":o||typeof s!="number"||s===0||Te.hasOwnProperty(n)&&Te[n]?(""+s).trim():s+"px"}function Se(n,s){n=n.style;for(var o in s)if(s.hasOwnProperty(o)){var u=o.indexOf("--")===0,m=_e(o,s[o],u);o==="float"&&(o="cssFloat"),u?n.setProperty(o,m):n[o]=m}}var ke=Z({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function Ze(n,s){if(s){if(ke[n]&&(s.children!=null||s.dangerouslySetInnerHTML!=null))throw Error(t(137,n));if(s.dangerouslySetInnerHTML!=null){if(s.children!=null)throw Error(t(60));if(typeof s.dangerouslySetInnerHTML!="object"||!("__html"in s.dangerouslySetInnerHTML))throw Error(t(61))}if(s.style!=null&&typeof s.style!="object")throw Error(t(62))}}function Oe(n,s){if(n.indexOf("-")===-1)return typeof s.is=="string";switch(n){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var De=null;function nt(n){return n=n.target||n.srcElement||window,n.correspondingUseElement&&(n=n.correspondingUseElement),n.nodeType===3?n.parentNode:n}var rt=null,lt=null,K=null;function Le(n){if(n=hl(n)){if(typeof rt!="function")throw Error(t(280));var s=n.stateNode;s&&(s=Tc(s),rt(n.stateNode,n.type,s))}}function ye(n){lt?K?K.push(n):K=[n]:lt=n}function Fe(){if(lt){var n=lt,s=K;if(K=lt=null,Le(n),s)for(n=0;n<s.length;n++)Le(s[n])}}function ze(n,s){return n(s)}function Me(){}var Ke=!1;function Xe(n,s,o){if(Ke)return n(s,o);Ke=!0;try{return ze(n,s,o)}finally{Ke=!1,(lt!==null||K!==null)&&(Me(),Fe())}}function Wt(n,s){var o=n.stateNode;if(o===null)return null;var u=Tc(o);if(u===null)return null;o=u[s];e:switch(s){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(u=!u.disabled)||(n=n.type,u=!(n==="button"||n==="input"||n==="select"||n==="textarea")),n=!u;break e;default:n=!1}if(n)return null;if(o&&typeof o!="function")throw Error(t(231,s,typeof o));return o}var kt=!1;if(h)try{var Fn={};Object.defineProperty(Fn,"passive",{get:function(){kt=!0}}),window.addEventListener("test",Fn,Fn),window.removeEventListener("test",Fn,Fn)}catch{kt=!1}function wi(n,s,o,u,m,_,R,z,W){var me=Array.prototype.slice.call(arguments,3);try{s.apply(o,me)}catch(we){this.onError(we)}}var Gs=!1,Aa=null,js=!1,Ws=null,Ch={onError:function(n){Gs=!0,Aa=n}};function lc(n,s,o,u,m,_,R,z,W){Gs=!1,Aa=null,wi.apply(Ch,arguments)}function cc(n,s,o,u,m,_,R,z,W){if(lc.apply(this,arguments),Gs){if(Gs){var me=Aa;Gs=!1,Aa=null}else throw Error(t(198));js||(js=!0,Ws=me)}}function Xn(n){var s=n,o=n;if(n.alternate)for(;s.return;)s=s.return;else{n=s;do s=n,(s.flags&4098)!==0&&(o=s.return),n=s.return;while(n)}return s.tag===3?o:null}function Pa(n){if(n.tag===13){var s=n.memoizedState;if(s===null&&(n=n.alternate,n!==null&&(s=n.memoizedState)),s!==null)return s.dehydrated}return null}function Wo(n){if(Xn(n)!==n)throw Error(t(188))}function uc(n){var s=n.alternate;if(!s){if(s=Xn(n),s===null)throw Error(t(188));return s!==n?null:n}for(var o=n,u=s;;){var m=o.return;if(m===null)break;var _=m.alternate;if(_===null){if(u=m.return,u!==null){o=u;continue}break}if(m.child===_.child){for(_=m.child;_;){if(_===o)return Wo(m),n;if(_===u)return Wo(m),s;_=_.sibling}throw Error(t(188))}if(o.return!==u.return)o=m,u=_;else{for(var R=!1,z=m.child;z;){if(z===o){R=!0,o=m,u=_;break}if(z===u){R=!0,u=m,o=_;break}z=z.sibling}if(!R){for(z=_.child;z;){if(z===o){R=!0,o=_,u=m;break}if(z===u){R=!0,u=_,o=m;break}z=z.sibling}if(!R)throw Error(t(189))}}if(o.alternate!==u)throw Error(t(190))}if(o.tag!==3)throw Error(t(188));return o.stateNode.current===o?n:s}function Xs(n){return n=uc(n),n!==null?Xo(n):null}function Xo(n){if(n.tag===5||n.tag===6)return n;for(n=n.child;n!==null;){var s=Xo(n);if(s!==null)return s;n=n.sibling}return null}var $s=e.unstable_scheduleCallback,$o=e.unstable_cancelCallback,hc=e.unstable_shouldYield,Rh=e.unstable_requestPaint,an=e.unstable_now,Ah=e.unstable_getCurrentPriorityLevel,qo=e.unstable_ImmediatePriority,P=e.unstable_UserBlockingPriority,te=e.unstable_NormalPriority,pe=e.unstable_LowPriority,ce=e.unstable_IdlePriority,le=null,Pe=null;function je(n){if(Pe&&typeof Pe.onCommitFiberRoot=="function")try{Pe.onCommitFiberRoot(le,n,void 0,(n.current.flags&128)===128)}catch{}}var Ae=Math.clz32?Math.clz32:dt,Ye=Math.log,tt=Math.LN2;function dt(n){return n>>>=0,n===0?32:31-(Ye(n)/tt|0)|0}var ft=64,Je=4194304;function At(n){switch(n&-n){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return n&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return n&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return n}}function $t(n,s){var o=n.pendingLanes;if(o===0)return 0;var u=0,m=n.suspendedLanes,_=n.pingedLanes,R=o&268435455;if(R!==0){var z=R&~m;z!==0?u=At(z):(_&=R,_!==0&&(u=At(_)))}else R=o&~m,R!==0?u=At(R):_!==0&&(u=At(_));if(u===0)return 0;if(s!==0&&s!==u&&(s&m)===0&&(m=u&-u,_=s&-s,m>=_||m===16&&(_&4194240)!==0))return s;if((u&4)!==0&&(u|=o&16),s=n.entangledLanes,s!==0)for(n=n.entanglements,s&=u;0<s;)o=31-Ae(s),m=1<<o,u|=n[o],s&=~m;return u}function en(n,s){switch(n){case 1:case 2:case 4:return s+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return s+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function Vt(n,s){for(var o=n.suspendedLanes,u=n.pingedLanes,m=n.expirationTimes,_=n.pendingLanes;0<_;){var R=31-Ae(_),z=1<<R,W=m[R];W===-1?((z&o)===0||(z&u)!==0)&&(m[R]=en(z,s)):W<=s&&(n.expiredLanes|=z),_&=~z}}function mn(n){return n=n.pendingLanes&-1073741825,n!==0?n:n&1073741824?1073741824:0}function He(){var n=ft;return ft<<=1,(ft&4194240)===0&&(ft=64),n}function Nn(n){for(var s=[],o=0;31>o;o++)s.push(n);return s}function yt(n,s,o){n.pendingLanes|=s,s!==536870912&&(n.suspendedLanes=0,n.pingedLanes=0),n=n.eventTimes,s=31-Ae(s),n[s]=o}function Jn(n,s){var o=n.pendingLanes&~s;n.pendingLanes=s,n.suspendedLanes=0,n.pingedLanes=0,n.expiredLanes&=s,n.mutableReadLanes&=s,n.entangledLanes&=s,s=n.entanglements;var u=n.eventTimes;for(n=n.expirationTimes;0<o;){var m=31-Ae(o),_=1<<m;s[m]=0,u[m]=-1,n[m]=-1,o&=~_}}function ei(n,s){var o=n.entangledLanes|=s;for(n=n.entanglements;o;){var u=31-Ae(o),m=1<<u;m&s|n[u]&s&&(n[u]|=s),o&=~m}}var St=0;function Er(n){return n&=-n,1<n?4<n?(n&268435455)!==0?16:536870912:4:1}var Ot,Kt,Fi,Ht,ki,er=!1,qs=[],Jr=null,es=null,ts=null,Ko=new Map,Yo=new Map,ns=[],jy="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function $m(n,s){switch(n){case"focusin":case"focusout":Jr=null;break;case"dragenter":case"dragleave":es=null;break;case"mouseover":case"mouseout":ts=null;break;case"pointerover":case"pointerout":Ko.delete(s.pointerId);break;case"gotpointercapture":case"lostpointercapture":Yo.delete(s.pointerId)}}function Qo(n,s,o,u,m,_){return n===null||n.nativeEvent!==_?(n={blockedOn:s,domEventName:o,eventSystemFlags:u,nativeEvent:_,targetContainers:[m]},s!==null&&(s=hl(s),s!==null&&Kt(s)),n):(n.eventSystemFlags|=u,s=n.targetContainers,m!==null&&s.indexOf(m)===-1&&s.push(m),n)}function Wy(n,s,o,u,m){switch(s){case"focusin":return Jr=Qo(Jr,n,s,o,u,m),!0;case"dragenter":return es=Qo(es,n,s,o,u,m),!0;case"mouseover":return ts=Qo(ts,n,s,o,u,m),!0;case"pointerover":var _=m.pointerId;return Ko.set(_,Qo(Ko.get(_)||null,n,s,o,u,m)),!0;case"gotpointercapture":return _=m.pointerId,Yo.set(_,Qo(Yo.get(_)||null,n,s,o,u,m)),!0}return!1}function qm(n){var s=Ks(n.target);if(s!==null){var o=Xn(s);if(o!==null){if(s=o.tag,s===13){if(s=Pa(o),s!==null){n.blockedOn=s,ki(n.priority,function(){Fi(o)});return}}else if(s===3&&o.stateNode.current.memoizedState.isDehydrated){n.blockedOn=o.tag===3?o.stateNode.containerInfo:null;return}}}n.blockedOn=null}function dc(n){if(n.blockedOn!==null)return!1;for(var s=n.targetContainers;0<s.length;){var o=Nh(n.domEventName,n.eventSystemFlags,s[0],n.nativeEvent);if(o===null){o=n.nativeEvent;var u=new o.constructor(o.type,o);De=u,o.target.dispatchEvent(u),De=null}else return s=hl(o),s!==null&&Kt(s),n.blockedOn=o,!1;s.shift()}return!0}function Km(n,s,o){dc(n)&&o.delete(s)}function Xy(){er=!1,Jr!==null&&dc(Jr)&&(Jr=null),es!==null&&dc(es)&&(es=null),ts!==null&&dc(ts)&&(ts=null),Ko.forEach(Km),Yo.forEach(Km)}function Zo(n,s){n.blockedOn===s&&(n.blockedOn=null,er||(er=!0,e.unstable_scheduleCallback(e.unstable_NormalPriority,Xy)))}function Jo(n){function s(m){return Zo(m,n)}if(0<qs.length){Zo(qs[0],n);for(var o=1;o<qs.length;o++){var u=qs[o];u.blockedOn===n&&(u.blockedOn=null)}}for(Jr!==null&&Zo(Jr,n),es!==null&&Zo(es,n),ts!==null&&Zo(ts,n),Ko.forEach(s),Yo.forEach(s),o=0;o<ns.length;o++)u=ns[o],u.blockedOn===n&&(u.blockedOn=null);for(;0<ns.length&&(o=ns[0],o.blockedOn===null);)qm(o),o.blockedOn===null&&ns.shift()}var Na=C.ReactCurrentBatchConfig,fc=!0;function $y(n,s,o,u){var m=St,_=Na.transition;Na.transition=null;try{St=1,Ph(n,s,o,u)}finally{St=m,Na.transition=_}}function qy(n,s,o,u){var m=St,_=Na.transition;Na.transition=null;try{St=4,Ph(n,s,o,u)}finally{St=m,Na.transition=_}}function Ph(n,s,o,u){if(fc){var m=Nh(n,s,o,u);if(m===null)qh(n,s,u,pc,o),$m(n,u);else if(Wy(m,n,s,o,u))u.stopPropagation();else if($m(n,u),s&4&&-1<jy.indexOf(n)){for(;m!==null;){var _=hl(m);if(_!==null&&Ot(_),_=Nh(n,s,o,u),_===null&&qh(n,s,u,pc,o),_===m)break;m=_}m!==null&&u.stopPropagation()}else qh(n,s,u,null,o)}}var pc=null;function Nh(n,s,o,u){if(pc=null,n=nt(u),n=Ks(n),n!==null)if(s=Xn(n),s===null)n=null;else if(o=s.tag,o===13){if(n=Pa(s),n!==null)return n;n=null}else if(o===3){if(s.stateNode.current.memoizedState.isDehydrated)return s.tag===3?s.stateNode.containerInfo:null;n=null}else s!==n&&(n=null);return pc=n,null}function Ym(n){switch(n){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(Ah()){case qo:return 1;case P:return 4;case te:case pe:return 16;case ce:return 536870912;default:return 16}default:return 16}}var is=null,Lh=null,mc=null;function Qm(){if(mc)return mc;var n,s=Lh,o=s.length,u,m="value"in is?is.value:is.textContent,_=m.length;for(n=0;n<o&&s[n]===m[n];n++);var R=o-n;for(u=1;u<=R&&s[o-u]===m[_-u];u++);return mc=m.slice(n,1<u?1-u:void 0)}function gc(n){var s=n.keyCode;return"charCode"in n?(n=n.charCode,n===0&&s===13&&(n=13)):n=s,n===10&&(n=13),32<=n||n===13?n:0}function xc(){return!0}function Zm(){return!1}function fi(n){function s(o,u,m,_,R){this._reactName=o,this._targetInst=m,this.type=u,this.nativeEvent=_,this.target=R,this.currentTarget=null;for(var z in n)n.hasOwnProperty(z)&&(o=n[z],this[z]=o?o(_):_[z]);return this.isDefaultPrevented=(_.defaultPrevented!=null?_.defaultPrevented:_.returnValue===!1)?xc:Zm,this.isPropagationStopped=Zm,this}return Z(s.prototype,{preventDefault:function(){this.defaultPrevented=!0;var o=this.nativeEvent;o&&(o.preventDefault?o.preventDefault():typeof o.returnValue!="unknown"&&(o.returnValue=!1),this.isDefaultPrevented=xc)},stopPropagation:function(){var o=this.nativeEvent;o&&(o.stopPropagation?o.stopPropagation():typeof o.cancelBubble!="unknown"&&(o.cancelBubble=!0),this.isPropagationStopped=xc)},persist:function(){},isPersistent:xc}),s}var La={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(n){return n.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Dh=fi(La),el=Z({},La,{view:0,detail:0}),Ky=fi(el),Ih,Uh,tl,vc=Z({},el,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:kh,button:0,buttons:0,relatedTarget:function(n){return n.relatedTarget===void 0?n.fromElement===n.srcElement?n.toElement:n.fromElement:n.relatedTarget},movementX:function(n){return"movementX"in n?n.movementX:(n!==tl&&(tl&&n.type==="mousemove"?(Ih=n.screenX-tl.screenX,Uh=n.screenY-tl.screenY):Uh=Ih=0,tl=n),Ih)},movementY:function(n){return"movementY"in n?n.movementY:Uh}}),Jm=fi(vc),Yy=Z({},vc,{dataTransfer:0}),Qy=fi(Yy),Zy=Z({},el,{relatedTarget:0}),Fh=fi(Zy),Jy=Z({},La,{animationName:0,elapsedTime:0,pseudoElement:0}),eS=fi(Jy),tS=Z({},La,{clipboardData:function(n){return"clipboardData"in n?n.clipboardData:window.clipboardData}}),nS=fi(tS),iS=Z({},La,{data:0}),eg=fi(iS),rS={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},sS={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},aS={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function oS(n){var s=this.nativeEvent;return s.getModifierState?s.getModifierState(n):(n=aS[n])?!!s[n]:!1}function kh(){return oS}var lS=Z({},el,{key:function(n){if(n.key){var s=rS[n.key]||n.key;if(s!=="Unidentified")return s}return n.type==="keypress"?(n=gc(n),n===13?"Enter":String.fromCharCode(n)):n.type==="keydown"||n.type==="keyup"?sS[n.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:kh,charCode:function(n){return n.type==="keypress"?gc(n):0},keyCode:function(n){return n.type==="keydown"||n.type==="keyup"?n.keyCode:0},which:function(n){return n.type==="keypress"?gc(n):n.type==="keydown"||n.type==="keyup"?n.keyCode:0}}),cS=fi(lS),uS=Z({},vc,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),tg=fi(uS),hS=Z({},el,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:kh}),dS=fi(hS),fS=Z({},La,{propertyName:0,elapsedTime:0,pseudoElement:0}),pS=fi(fS),mS=Z({},vc,{deltaX:function(n){return"deltaX"in n?n.deltaX:"wheelDeltaX"in n?-n.wheelDeltaX:0},deltaY:function(n){return"deltaY"in n?n.deltaY:"wheelDeltaY"in n?-n.wheelDeltaY:"wheelDelta"in n?-n.wheelDelta:0},deltaZ:0,deltaMode:0}),gS=fi(mS),xS=[9,13,27,32],Oh=h&&"CompositionEvent"in window,nl=null;h&&"documentMode"in document&&(nl=document.documentMode);var vS=h&&"TextEvent"in window&&!nl,ng=h&&(!Oh||nl&&8<nl&&11>=nl),ig=" ",rg=!1;function sg(n,s){switch(n){case"keyup":return xS.indexOf(s.keyCode)!==-1;case"keydown":return s.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function ag(n){return n=n.detail,typeof n=="object"&&"data"in n?n.data:null}var Da=!1;function _S(n,s){switch(n){case"compositionend":return ag(s);case"keypress":return s.which!==32?null:(rg=!0,ig);case"textInput":return n=s.data,n===ig&&rg?null:n;default:return null}}function yS(n,s){if(Da)return n==="compositionend"||!Oh&&sg(n,s)?(n=Qm(),mc=Lh=is=null,Da=!1,n):null;switch(n){case"paste":return null;case"keypress":if(!(s.ctrlKey||s.altKey||s.metaKey)||s.ctrlKey&&s.altKey){if(s.char&&1<s.char.length)return s.char;if(s.which)return String.fromCharCode(s.which)}return null;case"compositionend":return ng&&s.locale!=="ko"?null:s.data;default:return null}}var SS={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function og(n){var s=n&&n.nodeName&&n.nodeName.toLowerCase();return s==="input"?!!SS[n.type]:s==="textarea"}function lg(n,s,o,u){ye(u),s=Ec(s,"onChange"),0<s.length&&(o=new Dh("onChange","change",null,o,u),n.push({event:o,listeners:s}))}var il=null,rl=null;function MS(n){Tg(n,0)}function _c(n){var s=Oa(n);if(jt(s))return n}function ES(n,s){if(n==="change")return s}var cg=!1;if(h){var zh;if(h){var Bh="oninput"in document;if(!Bh){var ug=document.createElement("div");ug.setAttribute("oninput","return;"),Bh=typeof ug.oninput=="function"}zh=Bh}else zh=!1;cg=zh&&(!document.documentMode||9<document.documentMode)}function hg(){il&&(il.detachEvent("onpropertychange",dg),rl=il=null)}function dg(n){if(n.propertyName==="value"&&_c(rl)){var s=[];lg(s,rl,n,nt(n)),Xe(MS,s)}}function wS(n,s,o){n==="focusin"?(hg(),il=s,rl=o,il.attachEvent("onpropertychange",dg)):n==="focusout"&&hg()}function bS(n){if(n==="selectionchange"||n==="keyup"||n==="keydown")return _c(rl)}function TS(n,s){if(n==="click")return _c(s)}function CS(n,s){if(n==="input"||n==="change")return _c(s)}function RS(n,s){return n===s&&(n!==0||1/n===1/s)||n!==n&&s!==s}var Oi=typeof Object.is=="function"?Object.is:RS;function sl(n,s){if(Oi(n,s))return!0;if(typeof n!="object"||n===null||typeof s!="object"||s===null)return!1;var o=Object.keys(n),u=Object.keys(s);if(o.length!==u.length)return!1;for(u=0;u<o.length;u++){var m=o[u];if(!d.call(s,m)||!Oi(n[m],s[m]))return!1}return!0}function fg(n){for(;n&&n.firstChild;)n=n.firstChild;return n}function pg(n,s){var o=fg(n);n=0;for(var u;o;){if(o.nodeType===3){if(u=n+o.textContent.length,n<=s&&u>=s)return{node:o,offset:s-n};n=u}e:{for(;o;){if(o.nextSibling){o=o.nextSibling;break e}o=o.parentNode}o=void 0}o=fg(o)}}function mg(n,s){return n&&s?n===s?!0:n&&n.nodeType===3?!1:s&&s.nodeType===3?mg(n,s.parentNode):"contains"in n?n.contains(s):n.compareDocumentPosition?!!(n.compareDocumentPosition(s)&16):!1:!1}function gg(){for(var n=window,s=ht();s instanceof n.HTMLIFrameElement;){try{var o=typeof s.contentWindow.location.href=="string"}catch{o=!1}if(o)n=s.contentWindow;else break;s=ht(n.document)}return s}function Vh(n){var s=n&&n.nodeName&&n.nodeName.toLowerCase();return s&&(s==="input"&&(n.type==="text"||n.type==="search"||n.type==="tel"||n.type==="url"||n.type==="password")||s==="textarea"||n.contentEditable==="true")}function AS(n){var s=gg(),o=n.focusedElem,u=n.selectionRange;if(s!==o&&o&&o.ownerDocument&&mg(o.ownerDocument.documentElement,o)){if(u!==null&&Vh(o)){if(s=u.start,n=u.end,n===void 0&&(n=s),"selectionStart"in o)o.selectionStart=s,o.selectionEnd=Math.min(n,o.value.length);else if(n=(s=o.ownerDocument||document)&&s.defaultView||window,n.getSelection){n=n.getSelection();var m=o.textContent.length,_=Math.min(u.start,m);u=u.end===void 0?_:Math.min(u.end,m),!n.extend&&_>u&&(m=u,u=_,_=m),m=pg(o,_);var R=pg(o,u);m&&R&&(n.rangeCount!==1||n.anchorNode!==m.node||n.anchorOffset!==m.offset||n.focusNode!==R.node||n.focusOffset!==R.offset)&&(s=s.createRange(),s.setStart(m.node,m.offset),n.removeAllRanges(),_>u?(n.addRange(s),n.extend(R.node,R.offset)):(s.setEnd(R.node,R.offset),n.addRange(s)))}}for(s=[],n=o;n=n.parentNode;)n.nodeType===1&&s.push({element:n,left:n.scrollLeft,top:n.scrollTop});for(typeof o.focus=="function"&&o.focus(),o=0;o<s.length;o++)n=s[o],n.element.scrollLeft=n.left,n.element.scrollTop=n.top}}var PS=h&&"documentMode"in document&&11>=document.documentMode,Ia=null,Hh=null,al=null,Gh=!1;function xg(n,s,o){var u=o.window===o?o.document:o.nodeType===9?o:o.ownerDocument;Gh||Ia==null||Ia!==ht(u)||(u=Ia,"selectionStart"in u&&Vh(u)?u={start:u.selectionStart,end:u.selectionEnd}:(u=(u.ownerDocument&&u.ownerDocument.defaultView||window).getSelection(),u={anchorNode:u.anchorNode,anchorOffset:u.anchorOffset,focusNode:u.focusNode,focusOffset:u.focusOffset}),al&&sl(al,u)||(al=u,u=Ec(Hh,"onSelect"),0<u.length&&(s=new Dh("onSelect","select",null,s,o),n.push({event:s,listeners:u}),s.target=Ia)))}function yc(n,s){var o={};return o[n.toLowerCase()]=s.toLowerCase(),o["Webkit"+n]="webkit"+s,o["Moz"+n]="moz"+s,o}var Ua={animationend:yc("Animation","AnimationEnd"),animationiteration:yc("Animation","AnimationIteration"),animationstart:yc("Animation","AnimationStart"),transitionend:yc("Transition","TransitionEnd")},jh={},vg={};h&&(vg=document.createElement("div").style,"AnimationEvent"in window||(delete Ua.animationend.animation,delete Ua.animationiteration.animation,delete Ua.animationstart.animation),"TransitionEvent"in window||delete Ua.transitionend.transition);function Sc(n){if(jh[n])return jh[n];if(!Ua[n])return n;var s=Ua[n],o;for(o in s)if(s.hasOwnProperty(o)&&o in vg)return jh[n]=s[o];return n}var _g=Sc("animationend"),yg=Sc("animationiteration"),Sg=Sc("animationstart"),Mg=Sc("transitionend"),Eg=new Map,wg="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function rs(n,s){Eg.set(n,s),l(s,[n])}for(var Wh=0;Wh<wg.length;Wh++){var Xh=wg[Wh],NS=Xh.toLowerCase(),LS=Xh[0].toUpperCase()+Xh.slice(1);rs(NS,"on"+LS)}rs(_g,"onAnimationEnd"),rs(yg,"onAnimationIteration"),rs(Sg,"onAnimationStart"),rs("dblclick","onDoubleClick"),rs("focusin","onFocus"),rs("focusout","onBlur"),rs(Mg,"onTransitionEnd"),c("onMouseEnter",["mouseout","mouseover"]),c("onMouseLeave",["mouseout","mouseover"]),c("onPointerEnter",["pointerout","pointerover"]),c("onPointerLeave",["pointerout","pointerover"]),l("onChange","change click focusin focusout input keydown keyup selectionchange".split(" ")),l("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),l("onBeforeInput",["compositionend","keypress","textInput","paste"]),l("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" ")),l("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" ")),l("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var ol="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),DS=new Set("cancel close invalid load scroll toggle".split(" ").concat(ol));function bg(n,s,o){var u=n.type||"unknown-event";n.currentTarget=o,cc(u,s,void 0,n),n.currentTarget=null}function Tg(n,s){s=(s&4)!==0;for(var o=0;o<n.length;o++){var u=n[o],m=u.event;u=u.listeners;e:{var _=void 0;if(s)for(var R=u.length-1;0<=R;R--){var z=u[R],W=z.instance,me=z.currentTarget;if(z=z.listener,W!==_&&m.isPropagationStopped())break e;bg(m,z,me),_=W}else for(R=0;R<u.length;R++){if(z=u[R],W=z.instance,me=z.currentTarget,z=z.listener,W!==_&&m.isPropagationStopped())break e;bg(m,z,me),_=W}}}if(js)throw n=Ws,js=!1,Ws=null,n}function Yt(n,s){var o=s[ed];o===void 0&&(o=s[ed]=new Set);var u=n+"__bubble";o.has(u)||(Cg(s,n,2,!1),o.add(u))}function $h(n,s,o){var u=0;s&&(u|=4),Cg(o,n,u,s)}var Mc="_reactListening"+Math.random().toString(36).slice(2);function ll(n){if(!n[Mc]){n[Mc]=!0,r.forEach(function(o){o!=="selectionchange"&&(DS.has(o)||$h(o,!1,n),$h(o,!0,n))});var s=n.nodeType===9?n:n.ownerDocument;s===null||s[Mc]||(s[Mc]=!0,$h("selectionchange",!1,s))}}function Cg(n,s,o,u){switch(Ym(s)){case 1:var m=$y;break;case 4:m=qy;break;default:m=Ph}o=m.bind(null,s,o,n),m=void 0,!kt||s!=="touchstart"&&s!=="touchmove"&&s!=="wheel"||(m=!0),u?m!==void 0?n.addEventListener(s,o,{capture:!0,passive:m}):n.addEventListener(s,o,!0):m!==void 0?n.addEventListener(s,o,{passive:m}):n.addEventListener(s,o,!1)}function qh(n,s,o,u,m){var _=u;if((s&1)===0&&(s&2)===0&&u!==null)e:for(;;){if(u===null)return;var R=u.tag;if(R===3||R===4){var z=u.stateNode.containerInfo;if(z===m||z.nodeType===8&&z.parentNode===m)break;if(R===4)for(R=u.return;R!==null;){var W=R.tag;if((W===3||W===4)&&(W=R.stateNode.containerInfo,W===m||W.nodeType===8&&W.parentNode===m))return;R=R.return}for(;z!==null;){if(R=Ks(z),R===null)return;if(W=R.tag,W===5||W===6){u=_=R;continue e}z=z.parentNode}}u=u.return}Xe(function(){var me=_,we=nt(o),be=[];e:{var Ee=Eg.get(n);if(Ee!==void 0){var Ge=Dh,$e=n;switch(n){case"keypress":if(gc(o)===0)break e;case"keydown":case"keyup":Ge=cS;break;case"focusin":$e="focus",Ge=Fh;break;case"focusout":$e="blur",Ge=Fh;break;case"beforeblur":case"afterblur":Ge=Fh;break;case"click":if(o.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":Ge=Jm;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":Ge=Qy;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":Ge=dS;break;case _g:case yg:case Sg:Ge=eS;break;case Mg:Ge=pS;break;case"scroll":Ge=Ky;break;case"wheel":Ge=gS;break;case"copy":case"cut":case"paste":Ge=nS;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":Ge=tg}var Qe=(s&4)!==0,pn=!Qe&&n==="scroll",ae=Qe?Ee!==null?Ee+"Capture":null:Ee;Qe=[];for(var J=me,ue;J!==null;){ue=J;var Ce=ue.stateNode;if(ue.tag===5&&Ce!==null&&(ue=Ce,ae!==null&&(Ce=Wt(J,ae),Ce!=null&&Qe.push(cl(J,Ce,ue)))),pn)break;J=J.return}0<Qe.length&&(Ee=new Ge(Ee,$e,null,o,we),be.push({event:Ee,listeners:Qe}))}}if((s&7)===0){e:{if(Ee=n==="mouseover"||n==="pointerover",Ge=n==="mouseout"||n==="pointerout",Ee&&o!==De&&($e=o.relatedTarget||o.fromElement)&&(Ks($e)||$e[wr]))break e;if((Ge||Ee)&&(Ee=we.window===we?we:(Ee=we.ownerDocument)?Ee.defaultView||Ee.parentWindow:window,Ge?($e=o.relatedTarget||o.toElement,Ge=me,$e=$e?Ks($e):null,$e!==null&&(pn=Xn($e),$e!==pn||$e.tag!==5&&$e.tag!==6)&&($e=null)):(Ge=null,$e=me),Ge!==$e)){if(Qe=Jm,Ce="onMouseLeave",ae="onMouseEnter",J="mouse",(n==="pointerout"||n==="pointerover")&&(Qe=tg,Ce="onPointerLeave",ae="onPointerEnter",J="pointer"),pn=Ge==null?Ee:Oa(Ge),ue=$e==null?Ee:Oa($e),Ee=new Qe(Ce,J+"leave",Ge,o,we),Ee.target=pn,Ee.relatedTarget=ue,Ce=null,Ks(we)===me&&(Qe=new Qe(ae,J+"enter",$e,o,we),Qe.target=ue,Qe.relatedTarget=pn,Ce=Qe),pn=Ce,Ge&&$e)t:{for(Qe=Ge,ae=$e,J=0,ue=Qe;ue;ue=Fa(ue))J++;for(ue=0,Ce=ae;Ce;Ce=Fa(Ce))ue++;for(;0<J-ue;)Qe=Fa(Qe),J--;for(;0<ue-J;)ae=Fa(ae),ue--;for(;J--;){if(Qe===ae||ae!==null&&Qe===ae.alternate)break t;Qe=Fa(Qe),ae=Fa(ae)}Qe=null}else Qe=null;Ge!==null&&Rg(be,Ee,Ge,Qe,!1),$e!==null&&pn!==null&&Rg(be,pn,$e,Qe,!0)}}e:{if(Ee=me?Oa(me):window,Ge=Ee.nodeName&&Ee.nodeName.toLowerCase(),Ge==="select"||Ge==="input"&&Ee.type==="file")var et=ES;else if(og(Ee))if(cg)et=CS;else{et=bS;var st=wS}else(Ge=Ee.nodeName)&&Ge.toLowerCase()==="input"&&(Ee.type==="checkbox"||Ee.type==="radio")&&(et=TS);if(et&&(et=et(n,me))){lg(be,et,o,we);break e}st&&st(n,Ee,me),n==="focusout"&&(st=Ee._wrapperState)&&st.controlled&&Ee.type==="number"&&hn(Ee,"number",Ee.value)}switch(st=me?Oa(me):window,n){case"focusin":(og(st)||st.contentEditable==="true")&&(Ia=st,Hh=me,al=null);break;case"focusout":al=Hh=Ia=null;break;case"mousedown":Gh=!0;break;case"contextmenu":case"mouseup":case"dragend":Gh=!1,xg(be,o,we);break;case"selectionchange":if(PS)break;case"keydown":case"keyup":xg(be,o,we)}var at;if(Oh)e:{switch(n){case"compositionstart":var ct="onCompositionStart";break e;case"compositionend":ct="onCompositionEnd";break e;case"compositionupdate":ct="onCompositionUpdate";break e}ct=void 0}else Da?sg(n,o)&&(ct="onCompositionEnd"):n==="keydown"&&o.keyCode===229&&(ct="onCompositionStart");ct&&(ng&&o.locale!=="ko"&&(Da||ct!=="onCompositionStart"?ct==="onCompositionEnd"&&Da&&(at=Qm()):(is=we,Lh="value"in is?is.value:is.textContent,Da=!0)),st=Ec(me,ct),0<st.length&&(ct=new eg(ct,n,null,o,we),be.push({event:ct,listeners:st}),at?ct.data=at:(at=ag(o),at!==null&&(ct.data=at)))),(at=vS?_S(n,o):yS(n,o))&&(me=Ec(me,"onBeforeInput"),0<me.length&&(we=new eg("onBeforeInput","beforeinput",null,o,we),be.push({event:we,listeners:me}),we.data=at))}Tg(be,s)})}function cl(n,s,o){return{instance:n,listener:s,currentTarget:o}}function Ec(n,s){for(var o=s+"Capture",u=[];n!==null;){var m=n,_=m.stateNode;m.tag===5&&_!==null&&(m=_,_=Wt(n,o),_!=null&&u.unshift(cl(n,_,m)),_=Wt(n,s),_!=null&&u.push(cl(n,_,m))),n=n.return}return u}function Fa(n){if(n===null)return null;do n=n.return;while(n&&n.tag!==5);return n||null}function Rg(n,s,o,u,m){for(var _=s._reactName,R=[];o!==null&&o!==u;){var z=o,W=z.alternate,me=z.stateNode;if(W!==null&&W===u)break;z.tag===5&&me!==null&&(z=me,m?(W=Wt(o,_),W!=null&&R.unshift(cl(o,W,z))):m||(W=Wt(o,_),W!=null&&R.push(cl(o,W,z)))),o=o.return}R.length!==0&&n.push({event:s,listeners:R})}var IS=/\r\n?/g,US=/\u0000|\uFFFD/g;function Ag(n){return(typeof n=="string"?n:""+n).replace(IS,`
`).replace(US,"")}function wc(n,s,o){if(s=Ag(s),Ag(n)!==s&&o)throw Error(t(425))}function bc(){}var Kh=null,Yh=null;function Qh(n,s){return n==="textarea"||n==="noscript"||typeof s.children=="string"||typeof s.children=="number"||typeof s.dangerouslySetInnerHTML=="object"&&s.dangerouslySetInnerHTML!==null&&s.dangerouslySetInnerHTML.__html!=null}var Zh=typeof setTimeout=="function"?setTimeout:void 0,FS=typeof clearTimeout=="function"?clearTimeout:void 0,Pg=typeof Promise=="function"?Promise:void 0,kS=typeof queueMicrotask=="function"?queueMicrotask:typeof Pg<"u"?function(n){return Pg.resolve(null).then(n).catch(OS)}:Zh;function OS(n){setTimeout(function(){throw n})}function Jh(n,s){var o=s,u=0;do{var m=o.nextSibling;if(n.removeChild(o),m&&m.nodeType===8)if(o=m.data,o==="/$"){if(u===0){n.removeChild(m),Jo(s);return}u--}else o!=="$"&&o!=="$?"&&o!=="$!"||u++;o=m}while(o);Jo(s)}function ss(n){for(;n!=null;n=n.nextSibling){var s=n.nodeType;if(s===1||s===3)break;if(s===8){if(s=n.data,s==="$"||s==="$!"||s==="$?")break;if(s==="/$")return null}}return n}function Ng(n){n=n.previousSibling;for(var s=0;n;){if(n.nodeType===8){var o=n.data;if(o==="$"||o==="$!"||o==="$?"){if(s===0)return n;s--}else o==="/$"&&s++}n=n.previousSibling}return null}var ka=Math.random().toString(36).slice(2),tr="__reactFiber$"+ka,ul="__reactProps$"+ka,wr="__reactContainer$"+ka,ed="__reactEvents$"+ka,zS="__reactListeners$"+ka,BS="__reactHandles$"+ka;function Ks(n){var s=n[tr];if(s)return s;for(var o=n.parentNode;o;){if(s=o[wr]||o[tr]){if(o=s.alternate,s.child!==null||o!==null&&o.child!==null)for(n=Ng(n);n!==null;){if(o=n[tr])return o;n=Ng(n)}return s}n=o,o=n.parentNode}return null}function hl(n){return n=n[tr]||n[wr],!n||n.tag!==5&&n.tag!==6&&n.tag!==13&&n.tag!==3?null:n}function Oa(n){if(n.tag===5||n.tag===6)return n.stateNode;throw Error(t(33))}function Tc(n){return n[ul]||null}var td=[],za=-1;function as(n){return{current:n}}function Qt(n){0>za||(n.current=td[za],td[za]=null,za--)}function qt(n,s){za++,td[za]=n.current,n.current=s}var os={},kn=as(os),ti=as(!1),Ys=os;function Ba(n,s){var o=n.type.contextTypes;if(!o)return os;var u=n.stateNode;if(u&&u.__reactInternalMemoizedUnmaskedChildContext===s)return u.__reactInternalMemoizedMaskedChildContext;var m={},_;for(_ in o)m[_]=s[_];return u&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=s,n.__reactInternalMemoizedMaskedChildContext=m),m}function ni(n){return n=n.childContextTypes,n!=null}function Cc(){Qt(ti),Qt(kn)}function Lg(n,s,o){if(kn.current!==os)throw Error(t(168));qt(kn,s),qt(ti,o)}function Dg(n,s,o){var u=n.stateNode;if(s=s.childContextTypes,typeof u.getChildContext!="function")return o;u=u.getChildContext();for(var m in u)if(!(m in s))throw Error(t(108,ge(n)||"Unknown",m));return Z({},o,u)}function Rc(n){return n=(n=n.stateNode)&&n.__reactInternalMemoizedMergedChildContext||os,Ys=kn.current,qt(kn,n),qt(ti,ti.current),!0}function Ig(n,s,o){var u=n.stateNode;if(!u)throw Error(t(169));o?(n=Dg(n,s,Ys),u.__reactInternalMemoizedMergedChildContext=n,Qt(ti),Qt(kn),qt(kn,n)):Qt(ti),qt(ti,o)}var br=null,Ac=!1,nd=!1;function Ug(n){br===null?br=[n]:br.push(n)}function VS(n){Ac=!0,Ug(n)}function ls(){if(!nd&&br!==null){nd=!0;var n=0,s=St;try{var o=br;for(St=1;n<o.length;n++){var u=o[n];do u=u(!0);while(u!==null)}br=null,Ac=!1}catch(m){throw br!==null&&(br=br.slice(n+1)),$s(qo,ls),m}finally{St=s,nd=!1}}return null}var Va=[],Ha=0,Pc=null,Nc=0,bi=[],Ti=0,Qs=null,Tr=1,Cr="";function Zs(n,s){Va[Ha++]=Nc,Va[Ha++]=Pc,Pc=n,Nc=s}function Fg(n,s,o){bi[Ti++]=Tr,bi[Ti++]=Cr,bi[Ti++]=Qs,Qs=n;var u=Tr;n=Cr;var m=32-Ae(u)-1;u&=~(1<<m),o+=1;var _=32-Ae(s)+m;if(30<_){var R=m-m%5;_=(u&(1<<R)-1).toString(32),u>>=R,m-=R,Tr=1<<32-Ae(s)+m|o<<m|u,Cr=_+n}else Tr=1<<_|o<<m|u,Cr=n}function id(n){n.return!==null&&(Zs(n,1),Fg(n,1,0))}function rd(n){for(;n===Pc;)Pc=Va[--Ha],Va[Ha]=null,Nc=Va[--Ha],Va[Ha]=null;for(;n===Qs;)Qs=bi[--Ti],bi[Ti]=null,Cr=bi[--Ti],bi[Ti]=null,Tr=bi[--Ti],bi[Ti]=null}var pi=null,mi=null,tn=!1,zi=null;function kg(n,s){var o=Pi(5,null,null,0);o.elementType="DELETED",o.stateNode=s,o.return=n,s=n.deletions,s===null?(n.deletions=[o],n.flags|=16):s.push(o)}function Og(n,s){switch(n.tag){case 5:var o=n.type;return s=s.nodeType!==1||o.toLowerCase()!==s.nodeName.toLowerCase()?null:s,s!==null?(n.stateNode=s,pi=n,mi=ss(s.firstChild),!0):!1;case 6:return s=n.pendingProps===""||s.nodeType!==3?null:s,s!==null?(n.stateNode=s,pi=n,mi=null,!0):!1;case 13:return s=s.nodeType!==8?null:s,s!==null?(o=Qs!==null?{id:Tr,overflow:Cr}:null,n.memoizedState={dehydrated:s,treeContext:o,retryLane:1073741824},o=Pi(18,null,null,0),o.stateNode=s,o.return=n,n.child=o,pi=n,mi=null,!0):!1;default:return!1}}function sd(n){return(n.mode&1)!==0&&(n.flags&128)===0}function ad(n){if(tn){var s=mi;if(s){var o=s;if(!Og(n,s)){if(sd(n))throw Error(t(418));s=ss(o.nextSibling);var u=pi;s&&Og(n,s)?kg(u,o):(n.flags=n.flags&-4097|2,tn=!1,pi=n)}}else{if(sd(n))throw Error(t(418));n.flags=n.flags&-4097|2,tn=!1,pi=n}}}function zg(n){for(n=n.return;n!==null&&n.tag!==5&&n.tag!==3&&n.tag!==13;)n=n.return;pi=n}function Lc(n){if(n!==pi)return!1;if(!tn)return zg(n),tn=!0,!1;var s;if((s=n.tag!==3)&&!(s=n.tag!==5)&&(s=n.type,s=s!=="head"&&s!=="body"&&!Qh(n.type,n.memoizedProps)),s&&(s=mi)){if(sd(n))throw Bg(),Error(t(418));for(;s;)kg(n,s),s=ss(s.nextSibling)}if(zg(n),n.tag===13){if(n=n.memoizedState,n=n!==null?n.dehydrated:null,!n)throw Error(t(317));e:{for(n=n.nextSibling,s=0;n;){if(n.nodeType===8){var o=n.data;if(o==="/$"){if(s===0){mi=ss(n.nextSibling);break e}s--}else o!=="$"&&o!=="$!"&&o!=="$?"||s++}n=n.nextSibling}mi=null}}else mi=pi?ss(n.stateNode.nextSibling):null;return!0}function Bg(){for(var n=mi;n;)n=ss(n.nextSibling)}function Ga(){mi=pi=null,tn=!1}function od(n){zi===null?zi=[n]:zi.push(n)}var HS=C.ReactCurrentBatchConfig;function dl(n,s,o){if(n=o.ref,n!==null&&typeof n!="function"&&typeof n!="object"){if(o._owner){if(o=o._owner,o){if(o.tag!==1)throw Error(t(309));var u=o.stateNode}if(!u)throw Error(t(147,n));var m=u,_=""+n;return s!==null&&s.ref!==null&&typeof s.ref=="function"&&s.ref._stringRef===_?s.ref:(s=function(R){var z=m.refs;R===null?delete z[_]:z[_]=R},s._stringRef=_,s)}if(typeof n!="string")throw Error(t(284));if(!o._owner)throw Error(t(290,n))}return n}function Dc(n,s){throw n=Object.prototype.toString.call(s),Error(t(31,n==="[object Object]"?"object with keys {"+Object.keys(s).join(", ")+"}":n))}function Vg(n){var s=n._init;return s(n._payload)}function Hg(n){function s(ae,J){if(n){var ue=ae.deletions;ue===null?(ae.deletions=[J],ae.flags|=16):ue.push(J)}}function o(ae,J){if(!n)return null;for(;J!==null;)s(ae,J),J=J.sibling;return null}function u(ae,J){for(ae=new Map;J!==null;)J.key!==null?ae.set(J.key,J):ae.set(J.index,J),J=J.sibling;return ae}function m(ae,J){return ae=gs(ae,J),ae.index=0,ae.sibling=null,ae}function _(ae,J,ue){return ae.index=ue,n?(ue=ae.alternate,ue!==null?(ue=ue.index,ue<J?(ae.flags|=2,J):ue):(ae.flags|=2,J)):(ae.flags|=1048576,J)}function R(ae){return n&&ae.alternate===null&&(ae.flags|=2),ae}function z(ae,J,ue,Ce){return J===null||J.tag!==6?(J=Zd(ue,ae.mode,Ce),J.return=ae,J):(J=m(J,ue),J.return=ae,J)}function W(ae,J,ue,Ce){var et=ue.type;return et===U?we(ae,J,ue.props.children,Ce,ue.key):J!==null&&(J.elementType===et||typeof et=="object"&&et!==null&&et.$$typeof===oe&&Vg(et)===J.type)?(Ce=m(J,ue.props),Ce.ref=dl(ae,J,ue),Ce.return=ae,Ce):(Ce=iu(ue.type,ue.key,ue.props,null,ae.mode,Ce),Ce.ref=dl(ae,J,ue),Ce.return=ae,Ce)}function me(ae,J,ue,Ce){return J===null||J.tag!==4||J.stateNode.containerInfo!==ue.containerInfo||J.stateNode.implementation!==ue.implementation?(J=Jd(ue,ae.mode,Ce),J.return=ae,J):(J=m(J,ue.children||[]),J.return=ae,J)}function we(ae,J,ue,Ce,et){return J===null||J.tag!==7?(J=aa(ue,ae.mode,Ce,et),J.return=ae,J):(J=m(J,ue),J.return=ae,J)}function be(ae,J,ue){if(typeof J=="string"&&J!==""||typeof J=="number")return J=Zd(""+J,ae.mode,ue),J.return=ae,J;if(typeof J=="object"&&J!==null){switch(J.$$typeof){case I:return ue=iu(J.type,J.key,J.props,null,ae.mode,ue),ue.ref=dl(ae,null,J),ue.return=ae,ue;case L:return J=Jd(J,ae.mode,ue),J.return=ae,J;case oe:var Ce=J._init;return be(ae,Ce(J._payload),ue)}if(sn(J)||Y(J))return J=aa(J,ae.mode,ue,null),J.return=ae,J;Dc(ae,J)}return null}function Ee(ae,J,ue,Ce){var et=J!==null?J.key:null;if(typeof ue=="string"&&ue!==""||typeof ue=="number")return et!==null?null:z(ae,J,""+ue,Ce);if(typeof ue=="object"&&ue!==null){switch(ue.$$typeof){case I:return ue.key===et?W(ae,J,ue,Ce):null;case L:return ue.key===et?me(ae,J,ue,Ce):null;case oe:return et=ue._init,Ee(ae,J,et(ue._payload),Ce)}if(sn(ue)||Y(ue))return et!==null?null:we(ae,J,ue,Ce,null);Dc(ae,ue)}return null}function Ge(ae,J,ue,Ce,et){if(typeof Ce=="string"&&Ce!==""||typeof Ce=="number")return ae=ae.get(ue)||null,z(J,ae,""+Ce,et);if(typeof Ce=="object"&&Ce!==null){switch(Ce.$$typeof){case I:return ae=ae.get(Ce.key===null?ue:Ce.key)||null,W(J,ae,Ce,et);case L:return ae=ae.get(Ce.key===null?ue:Ce.key)||null,me(J,ae,Ce,et);case oe:var st=Ce._init;return Ge(ae,J,ue,st(Ce._payload),et)}if(sn(Ce)||Y(Ce))return ae=ae.get(ue)||null,we(J,ae,Ce,et,null);Dc(J,Ce)}return null}function $e(ae,J,ue,Ce){for(var et=null,st=null,at=J,ct=J=0,Tn=null;at!==null&&ct<ue.length;ct++){at.index>ct?(Tn=at,at=null):Tn=at.sibling;var Dt=Ee(ae,at,ue[ct],Ce);if(Dt===null){at===null&&(at=Tn);break}n&&at&&Dt.alternate===null&&s(ae,at),J=_(Dt,J,ct),st===null?et=Dt:st.sibling=Dt,st=Dt,at=Tn}if(ct===ue.length)return o(ae,at),tn&&Zs(ae,ct),et;if(at===null){for(;ct<ue.length;ct++)at=be(ae,ue[ct],Ce),at!==null&&(J=_(at,J,ct),st===null?et=at:st.sibling=at,st=at);return tn&&Zs(ae,ct),et}for(at=u(ae,at);ct<ue.length;ct++)Tn=Ge(at,ae,ct,ue[ct],Ce),Tn!==null&&(n&&Tn.alternate!==null&&at.delete(Tn.key===null?ct:Tn.key),J=_(Tn,J,ct),st===null?et=Tn:st.sibling=Tn,st=Tn);return n&&at.forEach(function(xs){return s(ae,xs)}),tn&&Zs(ae,ct),et}function Qe(ae,J,ue,Ce){var et=Y(ue);if(typeof et!="function")throw Error(t(150));if(ue=et.call(ue),ue==null)throw Error(t(151));for(var st=et=null,at=J,ct=J=0,Tn=null,Dt=ue.next();at!==null&&!Dt.done;ct++,Dt=ue.next()){at.index>ct?(Tn=at,at=null):Tn=at.sibling;var xs=Ee(ae,at,Dt.value,Ce);if(xs===null){at===null&&(at=Tn);break}n&&at&&xs.alternate===null&&s(ae,at),J=_(xs,J,ct),st===null?et=xs:st.sibling=xs,st=xs,at=Tn}if(Dt.done)return o(ae,at),tn&&Zs(ae,ct),et;if(at===null){for(;!Dt.done;ct++,Dt=ue.next())Dt=be(ae,Dt.value,Ce),Dt!==null&&(J=_(Dt,J,ct),st===null?et=Dt:st.sibling=Dt,st=Dt);return tn&&Zs(ae,ct),et}for(at=u(ae,at);!Dt.done;ct++,Dt=ue.next())Dt=Ge(at,ae,ct,Dt.value,Ce),Dt!==null&&(n&&Dt.alternate!==null&&at.delete(Dt.key===null?ct:Dt.key),J=_(Dt,J,ct),st===null?et=Dt:st.sibling=Dt,st=Dt);return n&&at.forEach(function(SM){return s(ae,SM)}),tn&&Zs(ae,ct),et}function pn(ae,J,ue,Ce){if(typeof ue=="object"&&ue!==null&&ue.type===U&&ue.key===null&&(ue=ue.props.children),typeof ue=="object"&&ue!==null){switch(ue.$$typeof){case I:e:{for(var et=ue.key,st=J;st!==null;){if(st.key===et){if(et=ue.type,et===U){if(st.tag===7){o(ae,st.sibling),J=m(st,ue.props.children),J.return=ae,ae=J;break e}}else if(st.elementType===et||typeof et=="object"&&et!==null&&et.$$typeof===oe&&Vg(et)===st.type){o(ae,st.sibling),J=m(st,ue.props),J.ref=dl(ae,st,ue),J.return=ae,ae=J;break e}o(ae,st);break}else s(ae,st);st=st.sibling}ue.type===U?(J=aa(ue.props.children,ae.mode,Ce,ue.key),J.return=ae,ae=J):(Ce=iu(ue.type,ue.key,ue.props,null,ae.mode,Ce),Ce.ref=dl(ae,J,ue),Ce.return=ae,ae=Ce)}return R(ae);case L:e:{for(st=ue.key;J!==null;){if(J.key===st)if(J.tag===4&&J.stateNode.containerInfo===ue.containerInfo&&J.stateNode.implementation===ue.implementation){o(ae,J.sibling),J=m(J,ue.children||[]),J.return=ae,ae=J;break e}else{o(ae,J);break}else s(ae,J);J=J.sibling}J=Jd(ue,ae.mode,Ce),J.return=ae,ae=J}return R(ae);case oe:return st=ue._init,pn(ae,J,st(ue._payload),Ce)}if(sn(ue))return $e(ae,J,ue,Ce);if(Y(ue))return Qe(ae,J,ue,Ce);Dc(ae,ue)}return typeof ue=="string"&&ue!==""||typeof ue=="number"?(ue=""+ue,J!==null&&J.tag===6?(o(ae,J.sibling),J=m(J,ue),J.return=ae,ae=J):(o(ae,J),J=Zd(ue,ae.mode,Ce),J.return=ae,ae=J),R(ae)):o(ae,J)}return pn}var ja=Hg(!0),Gg=Hg(!1),Ic=as(null),Uc=null,Wa=null,ld=null;function cd(){ld=Wa=Uc=null}function ud(n){var s=Ic.current;Qt(Ic),n._currentValue=s}function hd(n,s,o){for(;n!==null;){var u=n.alternate;if((n.childLanes&s)!==s?(n.childLanes|=s,u!==null&&(u.childLanes|=s)):u!==null&&(u.childLanes&s)!==s&&(u.childLanes|=s),n===o)break;n=n.return}}function Xa(n,s){Uc=n,ld=Wa=null,n=n.dependencies,n!==null&&n.firstContext!==null&&((n.lanes&s)!==0&&(ii=!0),n.firstContext=null)}function Ci(n){var s=n._currentValue;if(ld!==n)if(n={context:n,memoizedValue:s,next:null},Wa===null){if(Uc===null)throw Error(t(308));Wa=n,Uc.dependencies={lanes:0,firstContext:n}}else Wa=Wa.next=n;return s}var Js=null;function dd(n){Js===null?Js=[n]:Js.push(n)}function jg(n,s,o,u){var m=s.interleaved;return m===null?(o.next=o,dd(s)):(o.next=m.next,m.next=o),s.interleaved=o,Rr(n,u)}function Rr(n,s){n.lanes|=s;var o=n.alternate;for(o!==null&&(o.lanes|=s),o=n,n=n.return;n!==null;)n.childLanes|=s,o=n.alternate,o!==null&&(o.childLanes|=s),o=n,n=n.return;return o.tag===3?o.stateNode:null}var cs=!1;function fd(n){n.updateQueue={baseState:n.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function Wg(n,s){n=n.updateQueue,s.updateQueue===n&&(s.updateQueue={baseState:n.baseState,firstBaseUpdate:n.firstBaseUpdate,lastBaseUpdate:n.lastBaseUpdate,shared:n.shared,effects:n.effects})}function Ar(n,s){return{eventTime:n,lane:s,tag:0,payload:null,callback:null,next:null}}function us(n,s,o){var u=n.updateQueue;if(u===null)return null;if(u=u.shared,(Pt&2)!==0){var m=u.pending;return m===null?s.next=s:(s.next=m.next,m.next=s),u.pending=s,Rr(n,o)}return m=u.interleaved,m===null?(s.next=s,dd(u)):(s.next=m.next,m.next=s),u.interleaved=s,Rr(n,o)}function Fc(n,s,o){if(s=s.updateQueue,s!==null&&(s=s.shared,(o&4194240)!==0)){var u=s.lanes;u&=n.pendingLanes,o|=u,s.lanes=o,ei(n,o)}}function Xg(n,s){var o=n.updateQueue,u=n.alternate;if(u!==null&&(u=u.updateQueue,o===u)){var m=null,_=null;if(o=o.firstBaseUpdate,o!==null){do{var R={eventTime:o.eventTime,lane:o.lane,tag:o.tag,payload:o.payload,callback:o.callback,next:null};_===null?m=_=R:_=_.next=R,o=o.next}while(o!==null);_===null?m=_=s:_=_.next=s}else m=_=s;o={baseState:u.baseState,firstBaseUpdate:m,lastBaseUpdate:_,shared:u.shared,effects:u.effects},n.updateQueue=o;return}n=o.lastBaseUpdate,n===null?o.firstBaseUpdate=s:n.next=s,o.lastBaseUpdate=s}function kc(n,s,o,u){var m=n.updateQueue;cs=!1;var _=m.firstBaseUpdate,R=m.lastBaseUpdate,z=m.shared.pending;if(z!==null){m.shared.pending=null;var W=z,me=W.next;W.next=null,R===null?_=me:R.next=me,R=W;var we=n.alternate;we!==null&&(we=we.updateQueue,z=we.lastBaseUpdate,z!==R&&(z===null?we.firstBaseUpdate=me:z.next=me,we.lastBaseUpdate=W))}if(_!==null){var be=m.baseState;R=0,we=me=W=null,z=_;do{var Ee=z.lane,Ge=z.eventTime;if((u&Ee)===Ee){we!==null&&(we=we.next={eventTime:Ge,lane:0,tag:z.tag,payload:z.payload,callback:z.callback,next:null});e:{var $e=n,Qe=z;switch(Ee=s,Ge=o,Qe.tag){case 1:if($e=Qe.payload,typeof $e=="function"){be=$e.call(Ge,be,Ee);break e}be=$e;break e;case 3:$e.flags=$e.flags&-65537|128;case 0:if($e=Qe.payload,Ee=typeof $e=="function"?$e.call(Ge,be,Ee):$e,Ee==null)break e;be=Z({},be,Ee);break e;case 2:cs=!0}}z.callback!==null&&z.lane!==0&&(n.flags|=64,Ee=m.effects,Ee===null?m.effects=[z]:Ee.push(z))}else Ge={eventTime:Ge,lane:Ee,tag:z.tag,payload:z.payload,callback:z.callback,next:null},we===null?(me=we=Ge,W=be):we=we.next=Ge,R|=Ee;if(z=z.next,z===null){if(z=m.shared.pending,z===null)break;Ee=z,z=Ee.next,Ee.next=null,m.lastBaseUpdate=Ee,m.shared.pending=null}}while(!0);if(we===null&&(W=be),m.baseState=W,m.firstBaseUpdate=me,m.lastBaseUpdate=we,s=m.shared.interleaved,s!==null){m=s;do R|=m.lane,m=m.next;while(m!==s)}else _===null&&(m.shared.lanes=0);na|=R,n.lanes=R,n.memoizedState=be}}function $g(n,s,o){if(n=s.effects,s.effects=null,n!==null)for(s=0;s<n.length;s++){var u=n[s],m=u.callback;if(m!==null){if(u.callback=null,u=o,typeof m!="function")throw Error(t(191,m));m.call(u)}}}var fl={},nr=as(fl),pl=as(fl),ml=as(fl);function ea(n){if(n===fl)throw Error(t(174));return n}function pd(n,s){switch(qt(ml,s),qt(pl,n),qt(nr,fl),n=s.nodeType,n){case 9:case 11:s=(s=s.documentElement)?s.namespaceURI:T(null,"");break;default:n=n===8?s.parentNode:s,s=n.namespaceURI||null,n=n.tagName,s=T(s,n)}Qt(nr),qt(nr,s)}function $a(){Qt(nr),Qt(pl),Qt(ml)}function qg(n){ea(ml.current);var s=ea(nr.current),o=T(s,n.type);s!==o&&(qt(pl,n),qt(nr,o))}function md(n){pl.current===n&&(Qt(nr),Qt(pl))}var on=as(0);function Oc(n){for(var s=n;s!==null;){if(s.tag===13){var o=s.memoizedState;if(o!==null&&(o=o.dehydrated,o===null||o.data==="$?"||o.data==="$!"))return s}else if(s.tag===19&&s.memoizedProps.revealOrder!==void 0){if((s.flags&128)!==0)return s}else if(s.child!==null){s.child.return=s,s=s.child;continue}if(s===n)break;for(;s.sibling===null;){if(s.return===null||s.return===n)return null;s=s.return}s.sibling.return=s.return,s=s.sibling}return null}var gd=[];function xd(){for(var n=0;n<gd.length;n++)gd[n]._workInProgressVersionPrimary=null;gd.length=0}var zc=C.ReactCurrentDispatcher,vd=C.ReactCurrentBatchConfig,ta=0,ln=null,vn=null,wn=null,Bc=!1,gl=!1,xl=0,GS=0;function On(){throw Error(t(321))}function _d(n,s){if(s===null)return!1;for(var o=0;o<s.length&&o<n.length;o++)if(!Oi(n[o],s[o]))return!1;return!0}function yd(n,s,o,u,m,_){if(ta=_,ln=s,s.memoizedState=null,s.updateQueue=null,s.lanes=0,zc.current=n===null||n.memoizedState===null?$S:qS,n=o(u,m),gl){_=0;do{if(gl=!1,xl=0,25<=_)throw Error(t(301));_+=1,wn=vn=null,s.updateQueue=null,zc.current=KS,n=o(u,m)}while(gl)}if(zc.current=Gc,s=vn!==null&&vn.next!==null,ta=0,wn=vn=ln=null,Bc=!1,s)throw Error(t(300));return n}function Sd(){var n=xl!==0;return xl=0,n}function ir(){var n={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return wn===null?ln.memoizedState=wn=n:wn=wn.next=n,wn}function Ri(){if(vn===null){var n=ln.alternate;n=n!==null?n.memoizedState:null}else n=vn.next;var s=wn===null?ln.memoizedState:wn.next;if(s!==null)wn=s,vn=n;else{if(n===null)throw Error(t(310));vn=n,n={memoizedState:vn.memoizedState,baseState:vn.baseState,baseQueue:vn.baseQueue,queue:vn.queue,next:null},wn===null?ln.memoizedState=wn=n:wn=wn.next=n}return wn}function vl(n,s){return typeof s=="function"?s(n):s}function Md(n){var s=Ri(),o=s.queue;if(o===null)throw Error(t(311));o.lastRenderedReducer=n;var u=vn,m=u.baseQueue,_=o.pending;if(_!==null){if(m!==null){var R=m.next;m.next=_.next,_.next=R}u.baseQueue=m=_,o.pending=null}if(m!==null){_=m.next,u=u.baseState;var z=R=null,W=null,me=_;do{var we=me.lane;if((ta&we)===we)W!==null&&(W=W.next={lane:0,action:me.action,hasEagerState:me.hasEagerState,eagerState:me.eagerState,next:null}),u=me.hasEagerState?me.eagerState:n(u,me.action);else{var be={lane:we,action:me.action,hasEagerState:me.hasEagerState,eagerState:me.eagerState,next:null};W===null?(z=W=be,R=u):W=W.next=be,ln.lanes|=we,na|=we}me=me.next}while(me!==null&&me!==_);W===null?R=u:W.next=z,Oi(u,s.memoizedState)||(ii=!0),s.memoizedState=u,s.baseState=R,s.baseQueue=W,o.lastRenderedState=u}if(n=o.interleaved,n!==null){m=n;do _=m.lane,ln.lanes|=_,na|=_,m=m.next;while(m!==n)}else m===null&&(o.lanes=0);return[s.memoizedState,o.dispatch]}function Ed(n){var s=Ri(),o=s.queue;if(o===null)throw Error(t(311));o.lastRenderedReducer=n;var u=o.dispatch,m=o.pending,_=s.memoizedState;if(m!==null){o.pending=null;var R=m=m.next;do _=n(_,R.action),R=R.next;while(R!==m);Oi(_,s.memoizedState)||(ii=!0),s.memoizedState=_,s.baseQueue===null&&(s.baseState=_),o.lastRenderedState=_}return[_,u]}function Kg(){}function Yg(n,s){var o=ln,u=Ri(),m=s(),_=!Oi(u.memoizedState,m);if(_&&(u.memoizedState=m,ii=!0),u=u.queue,wd(Jg.bind(null,o,u,n),[n]),u.getSnapshot!==s||_||wn!==null&&wn.memoizedState.tag&1){if(o.flags|=2048,_l(9,Zg.bind(null,o,u,m,s),void 0,null),bn===null)throw Error(t(349));(ta&30)!==0||Qg(o,s,m)}return m}function Qg(n,s,o){n.flags|=16384,n={getSnapshot:s,value:o},s=ln.updateQueue,s===null?(s={lastEffect:null,stores:null},ln.updateQueue=s,s.stores=[n]):(o=s.stores,o===null?s.stores=[n]:o.push(n))}function Zg(n,s,o,u){s.value=o,s.getSnapshot=u,e0(s)&&t0(n)}function Jg(n,s,o){return o(function(){e0(s)&&t0(n)})}function e0(n){var s=n.getSnapshot;n=n.value;try{var o=s();return!Oi(n,o)}catch{return!0}}function t0(n){var s=Rr(n,1);s!==null&&Gi(s,n,1,-1)}function n0(n){var s=ir();return typeof n=="function"&&(n=n()),s.memoizedState=s.baseState=n,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:vl,lastRenderedState:n},s.queue=n,n=n.dispatch=XS.bind(null,ln,n),[s.memoizedState,n]}function _l(n,s,o,u){return n={tag:n,create:s,destroy:o,deps:u,next:null},s=ln.updateQueue,s===null?(s={lastEffect:null,stores:null},ln.updateQueue=s,s.lastEffect=n.next=n):(o=s.lastEffect,o===null?s.lastEffect=n.next=n:(u=o.next,o.next=n,n.next=u,s.lastEffect=n)),n}function i0(){return Ri().memoizedState}function Vc(n,s,o,u){var m=ir();ln.flags|=n,m.memoizedState=_l(1|s,o,void 0,u===void 0?null:u)}function Hc(n,s,o,u){var m=Ri();u=u===void 0?null:u;var _=void 0;if(vn!==null){var R=vn.memoizedState;if(_=R.destroy,u!==null&&_d(u,R.deps)){m.memoizedState=_l(s,o,_,u);return}}ln.flags|=n,m.memoizedState=_l(1|s,o,_,u)}function r0(n,s){return Vc(8390656,8,n,s)}function wd(n,s){return Hc(2048,8,n,s)}function s0(n,s){return Hc(4,2,n,s)}function a0(n,s){return Hc(4,4,n,s)}function o0(n,s){if(typeof s=="function")return n=n(),s(n),function(){s(null)};if(s!=null)return n=n(),s.current=n,function(){s.current=null}}function l0(n,s,o){return o=o!=null?o.concat([n]):null,Hc(4,4,o0.bind(null,s,n),o)}function bd(){}function c0(n,s){var o=Ri();s=s===void 0?null:s;var u=o.memoizedState;return u!==null&&s!==null&&_d(s,u[1])?u[0]:(o.memoizedState=[n,s],n)}function u0(n,s){var o=Ri();s=s===void 0?null:s;var u=o.memoizedState;return u!==null&&s!==null&&_d(s,u[1])?u[0]:(n=n(),o.memoizedState=[n,s],n)}function h0(n,s,o){return(ta&21)===0?(n.baseState&&(n.baseState=!1,ii=!0),n.memoizedState=o):(Oi(o,s)||(o=He(),ln.lanes|=o,na|=o,n.baseState=!0),s)}function jS(n,s){var o=St;St=o!==0&&4>o?o:4,n(!0);var u=vd.transition;vd.transition={};try{n(!1),s()}finally{St=o,vd.transition=u}}function d0(){return Ri().memoizedState}function WS(n,s,o){var u=ps(n);if(o={lane:u,action:o,hasEagerState:!1,eagerState:null,next:null},f0(n))p0(s,o);else if(o=jg(n,s,o,u),o!==null){var m=qn();Gi(o,n,u,m),m0(o,s,u)}}function XS(n,s,o){var u=ps(n),m={lane:u,action:o,hasEagerState:!1,eagerState:null,next:null};if(f0(n))p0(s,m);else{var _=n.alternate;if(n.lanes===0&&(_===null||_.lanes===0)&&(_=s.lastRenderedReducer,_!==null))try{var R=s.lastRenderedState,z=_(R,o);if(m.hasEagerState=!0,m.eagerState=z,Oi(z,R)){var W=s.interleaved;W===null?(m.next=m,dd(s)):(m.next=W.next,W.next=m),s.interleaved=m;return}}catch{}finally{}o=jg(n,s,m,u),o!==null&&(m=qn(),Gi(o,n,u,m),m0(o,s,u))}}function f0(n){var s=n.alternate;return n===ln||s!==null&&s===ln}function p0(n,s){gl=Bc=!0;var o=n.pending;o===null?s.next=s:(s.next=o.next,o.next=s),n.pending=s}function m0(n,s,o){if((o&4194240)!==0){var u=s.lanes;u&=n.pendingLanes,o|=u,s.lanes=o,ei(n,o)}}var Gc={readContext:Ci,useCallback:On,useContext:On,useEffect:On,useImperativeHandle:On,useInsertionEffect:On,useLayoutEffect:On,useMemo:On,useReducer:On,useRef:On,useState:On,useDebugValue:On,useDeferredValue:On,useTransition:On,useMutableSource:On,useSyncExternalStore:On,useId:On,unstable_isNewReconciler:!1},$S={readContext:Ci,useCallback:function(n,s){return ir().memoizedState=[n,s===void 0?null:s],n},useContext:Ci,useEffect:r0,useImperativeHandle:function(n,s,o){return o=o!=null?o.concat([n]):null,Vc(4194308,4,o0.bind(null,s,n),o)},useLayoutEffect:function(n,s){return Vc(4194308,4,n,s)},useInsertionEffect:function(n,s){return Vc(4,2,n,s)},useMemo:function(n,s){var o=ir();return s=s===void 0?null:s,n=n(),o.memoizedState=[n,s],n},useReducer:function(n,s,o){var u=ir();return s=o!==void 0?o(s):s,u.memoizedState=u.baseState=s,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:n,lastRenderedState:s},u.queue=n,n=n.dispatch=WS.bind(null,ln,n),[u.memoizedState,n]},useRef:function(n){var s=ir();return n={current:n},s.memoizedState=n},useState:n0,useDebugValue:bd,useDeferredValue:function(n){return ir().memoizedState=n},useTransition:function(){var n=n0(!1),s=n[0];return n=jS.bind(null,n[1]),ir().memoizedState=n,[s,n]},useMutableSource:function(){},useSyncExternalStore:function(n,s,o){var u=ln,m=ir();if(tn){if(o===void 0)throw Error(t(407));o=o()}else{if(o=s(),bn===null)throw Error(t(349));(ta&30)!==0||Qg(u,s,o)}m.memoizedState=o;var _={value:o,getSnapshot:s};return m.queue=_,r0(Jg.bind(null,u,_,n),[n]),u.flags|=2048,_l(9,Zg.bind(null,u,_,o,s),void 0,null),o},useId:function(){var n=ir(),s=bn.identifierPrefix;if(tn){var o=Cr,u=Tr;o=(u&~(1<<32-Ae(u)-1)).toString(32)+o,s=":"+s+"R"+o,o=xl++,0<o&&(s+="H"+o.toString(32)),s+=":"}else o=GS++,s=":"+s+"r"+o.toString(32)+":";return n.memoizedState=s},unstable_isNewReconciler:!1},qS={readContext:Ci,useCallback:c0,useContext:Ci,useEffect:wd,useImperativeHandle:l0,useInsertionEffect:s0,useLayoutEffect:a0,useMemo:u0,useReducer:Md,useRef:i0,useState:function(){return Md(vl)},useDebugValue:bd,useDeferredValue:function(n){var s=Ri();return h0(s,vn.memoizedState,n)},useTransition:function(){var n=Md(vl)[0],s=Ri().memoizedState;return[n,s]},useMutableSource:Kg,useSyncExternalStore:Yg,useId:d0,unstable_isNewReconciler:!1},KS={readContext:Ci,useCallback:c0,useContext:Ci,useEffect:wd,useImperativeHandle:l0,useInsertionEffect:s0,useLayoutEffect:a0,useMemo:u0,useReducer:Ed,useRef:i0,useState:function(){return Ed(vl)},useDebugValue:bd,useDeferredValue:function(n){var s=Ri();return vn===null?s.memoizedState=n:h0(s,vn.memoizedState,n)},useTransition:function(){var n=Ed(vl)[0],s=Ri().memoizedState;return[n,s]},useMutableSource:Kg,useSyncExternalStore:Yg,useId:d0,unstable_isNewReconciler:!1};function Bi(n,s){if(n&&n.defaultProps){s=Z({},s),n=n.defaultProps;for(var o in n)s[o]===void 0&&(s[o]=n[o]);return s}return s}function Td(n,s,o,u){s=n.memoizedState,o=o(u,s),o=o==null?s:Z({},s,o),n.memoizedState=o,n.lanes===0&&(n.updateQueue.baseState=o)}var jc={isMounted:function(n){return(n=n._reactInternals)?Xn(n)===n:!1},enqueueSetState:function(n,s,o){n=n._reactInternals;var u=qn(),m=ps(n),_=Ar(u,m);_.payload=s,o!=null&&(_.callback=o),s=us(n,_,m),s!==null&&(Gi(s,n,m,u),Fc(s,n,m))},enqueueReplaceState:function(n,s,o){n=n._reactInternals;var u=qn(),m=ps(n),_=Ar(u,m);_.tag=1,_.payload=s,o!=null&&(_.callback=o),s=us(n,_,m),s!==null&&(Gi(s,n,m,u),Fc(s,n,m))},enqueueForceUpdate:function(n,s){n=n._reactInternals;var o=qn(),u=ps(n),m=Ar(o,u);m.tag=2,s!=null&&(m.callback=s),s=us(n,m,u),s!==null&&(Gi(s,n,u,o),Fc(s,n,u))}};function g0(n,s,o,u,m,_,R){return n=n.stateNode,typeof n.shouldComponentUpdate=="function"?n.shouldComponentUpdate(u,_,R):s.prototype&&s.prototype.isPureReactComponent?!sl(o,u)||!sl(m,_):!0}function x0(n,s,o){var u=!1,m=os,_=s.contextType;return typeof _=="object"&&_!==null?_=Ci(_):(m=ni(s)?Ys:kn.current,u=s.contextTypes,_=(u=u!=null)?Ba(n,m):os),s=new s(o,_),n.memoizedState=s.state!==null&&s.state!==void 0?s.state:null,s.updater=jc,n.stateNode=s,s._reactInternals=n,u&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=m,n.__reactInternalMemoizedMaskedChildContext=_),s}function v0(n,s,o,u){n=s.state,typeof s.componentWillReceiveProps=="function"&&s.componentWillReceiveProps(o,u),typeof s.UNSAFE_componentWillReceiveProps=="function"&&s.UNSAFE_componentWillReceiveProps(o,u),s.state!==n&&jc.enqueueReplaceState(s,s.state,null)}function Cd(n,s,o,u){var m=n.stateNode;m.props=o,m.state=n.memoizedState,m.refs={},fd(n);var _=s.contextType;typeof _=="object"&&_!==null?m.context=Ci(_):(_=ni(s)?Ys:kn.current,m.context=Ba(n,_)),m.state=n.memoizedState,_=s.getDerivedStateFromProps,typeof _=="function"&&(Td(n,s,_,o),m.state=n.memoizedState),typeof s.getDerivedStateFromProps=="function"||typeof m.getSnapshotBeforeUpdate=="function"||typeof m.UNSAFE_componentWillMount!="function"&&typeof m.componentWillMount!="function"||(s=m.state,typeof m.componentWillMount=="function"&&m.componentWillMount(),typeof m.UNSAFE_componentWillMount=="function"&&m.UNSAFE_componentWillMount(),s!==m.state&&jc.enqueueReplaceState(m,m.state,null),kc(n,o,m,u),m.state=n.memoizedState),typeof m.componentDidMount=="function"&&(n.flags|=4194308)}function qa(n,s){try{var o="",u=s;do o+=Ne(u),u=u.return;while(u);var m=o}catch(_){m=`
Error generating stack: `+_.message+`
`+_.stack}return{value:n,source:s,stack:m,digest:null}}function Rd(n,s,o){return{value:n,source:null,stack:o??null,digest:s??null}}function Ad(n,s){try{console.error(s.value)}catch(o){setTimeout(function(){throw o})}}var YS=typeof WeakMap=="function"?WeakMap:Map;function _0(n,s,o){o=Ar(-1,o),o.tag=3,o.payload={element:null};var u=s.value;return o.callback=function(){Qc||(Qc=!0,jd=u),Ad(n,s)},o}function y0(n,s,o){o=Ar(-1,o),o.tag=3;var u=n.type.getDerivedStateFromError;if(typeof u=="function"){var m=s.value;o.payload=function(){return u(m)},o.callback=function(){Ad(n,s)}}var _=n.stateNode;return _!==null&&typeof _.componentDidCatch=="function"&&(o.callback=function(){Ad(n,s),typeof u!="function"&&(ds===null?ds=new Set([this]):ds.add(this));var R=s.stack;this.componentDidCatch(s.value,{componentStack:R!==null?R:""})}),o}function S0(n,s,o){var u=n.pingCache;if(u===null){u=n.pingCache=new YS;var m=new Set;u.set(s,m)}else m=u.get(s),m===void 0&&(m=new Set,u.set(s,m));m.has(o)||(m.add(o),n=uM.bind(null,n,s,o),s.then(n,n))}function M0(n){do{var s;if((s=n.tag===13)&&(s=n.memoizedState,s=s!==null?s.dehydrated!==null:!0),s)return n;n=n.return}while(n!==null);return null}function E0(n,s,o,u,m){return(n.mode&1)===0?(n===s?n.flags|=65536:(n.flags|=128,o.flags|=131072,o.flags&=-52805,o.tag===1&&(o.alternate===null?o.tag=17:(s=Ar(-1,1),s.tag=2,us(o,s,1))),o.lanes|=1),n):(n.flags|=65536,n.lanes=m,n)}var QS=C.ReactCurrentOwner,ii=!1;function $n(n,s,o,u){s.child=n===null?Gg(s,null,o,u):ja(s,n.child,o,u)}function w0(n,s,o,u,m){o=o.render;var _=s.ref;return Xa(s,m),u=yd(n,s,o,u,_,m),o=Sd(),n!==null&&!ii?(s.updateQueue=n.updateQueue,s.flags&=-2053,n.lanes&=~m,Pr(n,s,m)):(tn&&o&&id(s),s.flags|=1,$n(n,s,u,m),s.child)}function b0(n,s,o,u,m){if(n===null){var _=o.type;return typeof _=="function"&&!Qd(_)&&_.defaultProps===void 0&&o.compare===null&&o.defaultProps===void 0?(s.tag=15,s.type=_,T0(n,s,_,u,m)):(n=iu(o.type,null,u,s,s.mode,m),n.ref=s.ref,n.return=s,s.child=n)}if(_=n.child,(n.lanes&m)===0){var R=_.memoizedProps;if(o=o.compare,o=o!==null?o:sl,o(R,u)&&n.ref===s.ref)return Pr(n,s,m)}return s.flags|=1,n=gs(_,u),n.ref=s.ref,n.return=s,s.child=n}function T0(n,s,o,u,m){if(n!==null){var _=n.memoizedProps;if(sl(_,u)&&n.ref===s.ref)if(ii=!1,s.pendingProps=u=_,(n.lanes&m)!==0)(n.flags&131072)!==0&&(ii=!0);else return s.lanes=n.lanes,Pr(n,s,m)}return Pd(n,s,o,u,m)}function C0(n,s,o){var u=s.pendingProps,m=u.children,_=n!==null?n.memoizedState:null;if(u.mode==="hidden")if((s.mode&1)===0)s.memoizedState={baseLanes:0,cachePool:null,transitions:null},qt(Ya,gi),gi|=o;else{if((o&1073741824)===0)return n=_!==null?_.baseLanes|o:o,s.lanes=s.childLanes=1073741824,s.memoizedState={baseLanes:n,cachePool:null,transitions:null},s.updateQueue=null,qt(Ya,gi),gi|=n,null;s.memoizedState={baseLanes:0,cachePool:null,transitions:null},u=_!==null?_.baseLanes:o,qt(Ya,gi),gi|=u}else _!==null?(u=_.baseLanes|o,s.memoizedState=null):u=o,qt(Ya,gi),gi|=u;return $n(n,s,m,o),s.child}function R0(n,s){var o=s.ref;(n===null&&o!==null||n!==null&&n.ref!==o)&&(s.flags|=512,s.flags|=2097152)}function Pd(n,s,o,u,m){var _=ni(o)?Ys:kn.current;return _=Ba(s,_),Xa(s,m),o=yd(n,s,o,u,_,m),u=Sd(),n!==null&&!ii?(s.updateQueue=n.updateQueue,s.flags&=-2053,n.lanes&=~m,Pr(n,s,m)):(tn&&u&&id(s),s.flags|=1,$n(n,s,o,m),s.child)}function A0(n,s,o,u,m){if(ni(o)){var _=!0;Rc(s)}else _=!1;if(Xa(s,m),s.stateNode===null)Xc(n,s),x0(s,o,u),Cd(s,o,u,m),u=!0;else if(n===null){var R=s.stateNode,z=s.memoizedProps;R.props=z;var W=R.context,me=o.contextType;typeof me=="object"&&me!==null?me=Ci(me):(me=ni(o)?Ys:kn.current,me=Ba(s,me));var we=o.getDerivedStateFromProps,be=typeof we=="function"||typeof R.getSnapshotBeforeUpdate=="function";be||typeof R.UNSAFE_componentWillReceiveProps!="function"&&typeof R.componentWillReceiveProps!="function"||(z!==u||W!==me)&&v0(s,R,u,me),cs=!1;var Ee=s.memoizedState;R.state=Ee,kc(s,u,R,m),W=s.memoizedState,z!==u||Ee!==W||ti.current||cs?(typeof we=="function"&&(Td(s,o,we,u),W=s.memoizedState),(z=cs||g0(s,o,z,u,Ee,W,me))?(be||typeof R.UNSAFE_componentWillMount!="function"&&typeof R.componentWillMount!="function"||(typeof R.componentWillMount=="function"&&R.componentWillMount(),typeof R.UNSAFE_componentWillMount=="function"&&R.UNSAFE_componentWillMount()),typeof R.componentDidMount=="function"&&(s.flags|=4194308)):(typeof R.componentDidMount=="function"&&(s.flags|=4194308),s.memoizedProps=u,s.memoizedState=W),R.props=u,R.state=W,R.context=me,u=z):(typeof R.componentDidMount=="function"&&(s.flags|=4194308),u=!1)}else{R=s.stateNode,Wg(n,s),z=s.memoizedProps,me=s.type===s.elementType?z:Bi(s.type,z),R.props=me,be=s.pendingProps,Ee=R.context,W=o.contextType,typeof W=="object"&&W!==null?W=Ci(W):(W=ni(o)?Ys:kn.current,W=Ba(s,W));var Ge=o.getDerivedStateFromProps;(we=typeof Ge=="function"||typeof R.getSnapshotBeforeUpdate=="function")||typeof R.UNSAFE_componentWillReceiveProps!="function"&&typeof R.componentWillReceiveProps!="function"||(z!==be||Ee!==W)&&v0(s,R,u,W),cs=!1,Ee=s.memoizedState,R.state=Ee,kc(s,u,R,m);var $e=s.memoizedState;z!==be||Ee!==$e||ti.current||cs?(typeof Ge=="function"&&(Td(s,o,Ge,u),$e=s.memoizedState),(me=cs||g0(s,o,me,u,Ee,$e,W)||!1)?(we||typeof R.UNSAFE_componentWillUpdate!="function"&&typeof R.componentWillUpdate!="function"||(typeof R.componentWillUpdate=="function"&&R.componentWillUpdate(u,$e,W),typeof R.UNSAFE_componentWillUpdate=="function"&&R.UNSAFE_componentWillUpdate(u,$e,W)),typeof R.componentDidUpdate=="function"&&(s.flags|=4),typeof R.getSnapshotBeforeUpdate=="function"&&(s.flags|=1024)):(typeof R.componentDidUpdate!="function"||z===n.memoizedProps&&Ee===n.memoizedState||(s.flags|=4),typeof R.getSnapshotBeforeUpdate!="function"||z===n.memoizedProps&&Ee===n.memoizedState||(s.flags|=1024),s.memoizedProps=u,s.memoizedState=$e),R.props=u,R.state=$e,R.context=W,u=me):(typeof R.componentDidUpdate!="function"||z===n.memoizedProps&&Ee===n.memoizedState||(s.flags|=4),typeof R.getSnapshotBeforeUpdate!="function"||z===n.memoizedProps&&Ee===n.memoizedState||(s.flags|=1024),u=!1)}return Nd(n,s,o,u,_,m)}function Nd(n,s,o,u,m,_){R0(n,s);var R=(s.flags&128)!==0;if(!u&&!R)return m&&Ig(s,o,!1),Pr(n,s,_);u=s.stateNode,QS.current=s;var z=R&&typeof o.getDerivedStateFromError!="function"?null:u.render();return s.flags|=1,n!==null&&R?(s.child=ja(s,n.child,null,_),s.child=ja(s,null,z,_)):$n(n,s,z,_),s.memoizedState=u.state,m&&Ig(s,o,!0),s.child}function P0(n){var s=n.stateNode;s.pendingContext?Lg(n,s.pendingContext,s.pendingContext!==s.context):s.context&&Lg(n,s.context,!1),pd(n,s.containerInfo)}function N0(n,s,o,u,m){return Ga(),od(m),s.flags|=256,$n(n,s,o,u),s.child}var Ld={dehydrated:null,treeContext:null,retryLane:0};function Dd(n){return{baseLanes:n,cachePool:null,transitions:null}}function L0(n,s,o){var u=s.pendingProps,m=on.current,_=!1,R=(s.flags&128)!==0,z;if((z=R)||(z=n!==null&&n.memoizedState===null?!1:(m&2)!==0),z?(_=!0,s.flags&=-129):(n===null||n.memoizedState!==null)&&(m|=1),qt(on,m&1),n===null)return ad(s),n=s.memoizedState,n!==null&&(n=n.dehydrated,n!==null)?((s.mode&1)===0?s.lanes=1:n.data==="$!"?s.lanes=8:s.lanes=1073741824,null):(R=u.children,n=u.fallback,_?(u=s.mode,_=s.child,R={mode:"hidden",children:R},(u&1)===0&&_!==null?(_.childLanes=0,_.pendingProps=R):_=ru(R,u,0,null),n=aa(n,u,o,null),_.return=s,n.return=s,_.sibling=n,s.child=_,s.child.memoizedState=Dd(o),s.memoizedState=Ld,n):Id(s,R));if(m=n.memoizedState,m!==null&&(z=m.dehydrated,z!==null))return ZS(n,s,R,u,z,m,o);if(_){_=u.fallback,R=s.mode,m=n.child,z=m.sibling;var W={mode:"hidden",children:u.children};return(R&1)===0&&s.child!==m?(u=s.child,u.childLanes=0,u.pendingProps=W,s.deletions=null):(u=gs(m,W),u.subtreeFlags=m.subtreeFlags&14680064),z!==null?_=gs(z,_):(_=aa(_,R,o,null),_.flags|=2),_.return=s,u.return=s,u.sibling=_,s.child=u,u=_,_=s.child,R=n.child.memoizedState,R=R===null?Dd(o):{baseLanes:R.baseLanes|o,cachePool:null,transitions:R.transitions},_.memoizedState=R,_.childLanes=n.childLanes&~o,s.memoizedState=Ld,u}return _=n.child,n=_.sibling,u=gs(_,{mode:"visible",children:u.children}),(s.mode&1)===0&&(u.lanes=o),u.return=s,u.sibling=null,n!==null&&(o=s.deletions,o===null?(s.deletions=[n],s.flags|=16):o.push(n)),s.child=u,s.memoizedState=null,u}function Id(n,s){return s=ru({mode:"visible",children:s},n.mode,0,null),s.return=n,n.child=s}function Wc(n,s,o,u){return u!==null&&od(u),ja(s,n.child,null,o),n=Id(s,s.pendingProps.children),n.flags|=2,s.memoizedState=null,n}function ZS(n,s,o,u,m,_,R){if(o)return s.flags&256?(s.flags&=-257,u=Rd(Error(t(422))),Wc(n,s,R,u)):s.memoizedState!==null?(s.child=n.child,s.flags|=128,null):(_=u.fallback,m=s.mode,u=ru({mode:"visible",children:u.children},m,0,null),_=aa(_,m,R,null),_.flags|=2,u.return=s,_.return=s,u.sibling=_,s.child=u,(s.mode&1)!==0&&ja(s,n.child,null,R),s.child.memoizedState=Dd(R),s.memoizedState=Ld,_);if((s.mode&1)===0)return Wc(n,s,R,null);if(m.data==="$!"){if(u=m.nextSibling&&m.nextSibling.dataset,u)var z=u.dgst;return u=z,_=Error(t(419)),u=Rd(_,u,void 0),Wc(n,s,R,u)}if(z=(R&n.childLanes)!==0,ii||z){if(u=bn,u!==null){switch(R&-R){case 4:m=2;break;case 16:m=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:m=32;break;case 536870912:m=268435456;break;default:m=0}m=(m&(u.suspendedLanes|R))!==0?0:m,m!==0&&m!==_.retryLane&&(_.retryLane=m,Rr(n,m),Gi(u,n,m,-1))}return Yd(),u=Rd(Error(t(421))),Wc(n,s,R,u)}return m.data==="$?"?(s.flags|=128,s.child=n.child,s=hM.bind(null,n),m._reactRetry=s,null):(n=_.treeContext,mi=ss(m.nextSibling),pi=s,tn=!0,zi=null,n!==null&&(bi[Ti++]=Tr,bi[Ti++]=Cr,bi[Ti++]=Qs,Tr=n.id,Cr=n.overflow,Qs=s),s=Id(s,u.children),s.flags|=4096,s)}function D0(n,s,o){n.lanes|=s;var u=n.alternate;u!==null&&(u.lanes|=s),hd(n.return,s,o)}function Ud(n,s,o,u,m){var _=n.memoizedState;_===null?n.memoizedState={isBackwards:s,rendering:null,renderingStartTime:0,last:u,tail:o,tailMode:m}:(_.isBackwards=s,_.rendering=null,_.renderingStartTime=0,_.last=u,_.tail=o,_.tailMode=m)}function I0(n,s,o){var u=s.pendingProps,m=u.revealOrder,_=u.tail;if($n(n,s,u.children,o),u=on.current,(u&2)!==0)u=u&1|2,s.flags|=128;else{if(n!==null&&(n.flags&128)!==0)e:for(n=s.child;n!==null;){if(n.tag===13)n.memoizedState!==null&&D0(n,o,s);else if(n.tag===19)D0(n,o,s);else if(n.child!==null){n.child.return=n,n=n.child;continue}if(n===s)break e;for(;n.sibling===null;){if(n.return===null||n.return===s)break e;n=n.return}n.sibling.return=n.return,n=n.sibling}u&=1}if(qt(on,u),(s.mode&1)===0)s.memoizedState=null;else switch(m){case"forwards":for(o=s.child,m=null;o!==null;)n=o.alternate,n!==null&&Oc(n)===null&&(m=o),o=o.sibling;o=m,o===null?(m=s.child,s.child=null):(m=o.sibling,o.sibling=null),Ud(s,!1,m,o,_);break;case"backwards":for(o=null,m=s.child,s.child=null;m!==null;){if(n=m.alternate,n!==null&&Oc(n)===null){s.child=m;break}n=m.sibling,m.sibling=o,o=m,m=n}Ud(s,!0,o,null,_);break;case"together":Ud(s,!1,null,null,void 0);break;default:s.memoizedState=null}return s.child}function Xc(n,s){(s.mode&1)===0&&n!==null&&(n.alternate=null,s.alternate=null,s.flags|=2)}function Pr(n,s,o){if(n!==null&&(s.dependencies=n.dependencies),na|=s.lanes,(o&s.childLanes)===0)return null;if(n!==null&&s.child!==n.child)throw Error(t(153));if(s.child!==null){for(n=s.child,o=gs(n,n.pendingProps),s.child=o,o.return=s;n.sibling!==null;)n=n.sibling,o=o.sibling=gs(n,n.pendingProps),o.return=s;o.sibling=null}return s.child}function JS(n,s,o){switch(s.tag){case 3:P0(s),Ga();break;case 5:qg(s);break;case 1:ni(s.type)&&Rc(s);break;case 4:pd(s,s.stateNode.containerInfo);break;case 10:var u=s.type._context,m=s.memoizedProps.value;qt(Ic,u._currentValue),u._currentValue=m;break;case 13:if(u=s.memoizedState,u!==null)return u.dehydrated!==null?(qt(on,on.current&1),s.flags|=128,null):(o&s.child.childLanes)!==0?L0(n,s,o):(qt(on,on.current&1),n=Pr(n,s,o),n!==null?n.sibling:null);qt(on,on.current&1);break;case 19:if(u=(o&s.childLanes)!==0,(n.flags&128)!==0){if(u)return I0(n,s,o);s.flags|=128}if(m=s.memoizedState,m!==null&&(m.rendering=null,m.tail=null,m.lastEffect=null),qt(on,on.current),u)break;return null;case 22:case 23:return s.lanes=0,C0(n,s,o)}return Pr(n,s,o)}var U0,Fd,F0,k0;U0=function(n,s){for(var o=s.child;o!==null;){if(o.tag===5||o.tag===6)n.appendChild(o.stateNode);else if(o.tag!==4&&o.child!==null){o.child.return=o,o=o.child;continue}if(o===s)break;for(;o.sibling===null;){if(o.return===null||o.return===s)return;o=o.return}o.sibling.return=o.return,o=o.sibling}},Fd=function(){},F0=function(n,s,o,u){var m=n.memoizedProps;if(m!==u){n=s.stateNode,ea(nr.current);var _=null;switch(o){case"input":m=Ut(n,m),u=Ut(n,u),_=[];break;case"select":m=Z({},m,{value:void 0}),u=Z({},u,{value:void 0}),_=[];break;case"textarea":m=Jt(n,m),u=Jt(n,u),_=[];break;default:typeof m.onClick!="function"&&typeof u.onClick=="function"&&(n.onclick=bc)}Ze(o,u);var R;o=null;for(me in m)if(!u.hasOwnProperty(me)&&m.hasOwnProperty(me)&&m[me]!=null)if(me==="style"){var z=m[me];for(R in z)z.hasOwnProperty(R)&&(o||(o={}),o[R]="")}else me!=="dangerouslySetInnerHTML"&&me!=="children"&&me!=="suppressContentEditableWarning"&&me!=="suppressHydrationWarning"&&me!=="autoFocus"&&(a.hasOwnProperty(me)?_||(_=[]):(_=_||[]).push(me,null));for(me in u){var W=u[me];if(z=m!=null?m[me]:void 0,u.hasOwnProperty(me)&&W!==z&&(W!=null||z!=null))if(me==="style")if(z){for(R in z)!z.hasOwnProperty(R)||W&&W.hasOwnProperty(R)||(o||(o={}),o[R]="");for(R in W)W.hasOwnProperty(R)&&z[R]!==W[R]&&(o||(o={}),o[R]=W[R])}else o||(_||(_=[]),_.push(me,o)),o=W;else me==="dangerouslySetInnerHTML"?(W=W?W.__html:void 0,z=z?z.__html:void 0,W!=null&&z!==W&&(_=_||[]).push(me,W)):me==="children"?typeof W!="string"&&typeof W!="number"||(_=_||[]).push(me,""+W):me!=="suppressContentEditableWarning"&&me!=="suppressHydrationWarning"&&(a.hasOwnProperty(me)?(W!=null&&me==="onScroll"&&Yt("scroll",n),_||z===W||(_=[])):(_=_||[]).push(me,W))}o&&(_=_||[]).push("style",o);var me=_;(s.updateQueue=me)&&(s.flags|=4)}},k0=function(n,s,o,u){o!==u&&(s.flags|=4)};function yl(n,s){if(!tn)switch(n.tailMode){case"hidden":s=n.tail;for(var o=null;s!==null;)s.alternate!==null&&(o=s),s=s.sibling;o===null?n.tail=null:o.sibling=null;break;case"collapsed":o=n.tail;for(var u=null;o!==null;)o.alternate!==null&&(u=o),o=o.sibling;u===null?s||n.tail===null?n.tail=null:n.tail.sibling=null:u.sibling=null}}function zn(n){var s=n.alternate!==null&&n.alternate.child===n.child,o=0,u=0;if(s)for(var m=n.child;m!==null;)o|=m.lanes|m.childLanes,u|=m.subtreeFlags&14680064,u|=m.flags&14680064,m.return=n,m=m.sibling;else for(m=n.child;m!==null;)o|=m.lanes|m.childLanes,u|=m.subtreeFlags,u|=m.flags,m.return=n,m=m.sibling;return n.subtreeFlags|=u,n.childLanes=o,s}function eM(n,s,o){var u=s.pendingProps;switch(rd(s),s.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return zn(s),null;case 1:return ni(s.type)&&Cc(),zn(s),null;case 3:return u=s.stateNode,$a(),Qt(ti),Qt(kn),xd(),u.pendingContext&&(u.context=u.pendingContext,u.pendingContext=null),(n===null||n.child===null)&&(Lc(s)?s.flags|=4:n===null||n.memoizedState.isDehydrated&&(s.flags&256)===0||(s.flags|=1024,zi!==null&&($d(zi),zi=null))),Fd(n,s),zn(s),null;case 5:md(s);var m=ea(ml.current);if(o=s.type,n!==null&&s.stateNode!=null)F0(n,s,o,u,m),n.ref!==s.ref&&(s.flags|=512,s.flags|=2097152);else{if(!u){if(s.stateNode===null)throw Error(t(166));return zn(s),null}if(n=ea(nr.current),Lc(s)){u=s.stateNode,o=s.type;var _=s.memoizedProps;switch(u[tr]=s,u[ul]=_,n=(s.mode&1)!==0,o){case"dialog":Yt("cancel",u),Yt("close",u);break;case"iframe":case"object":case"embed":Yt("load",u);break;case"video":case"audio":for(m=0;m<ol.length;m++)Yt(ol[m],u);break;case"source":Yt("error",u);break;case"img":case"image":case"link":Yt("error",u),Yt("load",u);break;case"details":Yt("toggle",u);break;case"input":Rt(u,_),Yt("invalid",u);break;case"select":u._wrapperState={wasMultiple:!!_.multiple},Yt("invalid",u);break;case"textarea":ee(u,_),Yt("invalid",u)}Ze(o,_),m=null;for(var R in _)if(_.hasOwnProperty(R)){var z=_[R];R==="children"?typeof z=="string"?u.textContent!==z&&(_.suppressHydrationWarning!==!0&&wc(u.textContent,z,n),m=["children",z]):typeof z=="number"&&u.textContent!==""+z&&(_.suppressHydrationWarning!==!0&&wc(u.textContent,z,n),m=["children",""+z]):a.hasOwnProperty(R)&&z!=null&&R==="onScroll"&&Yt("scroll",u)}switch(o){case"input":qe(u),un(u,_,!0);break;case"textarea":qe(u),Lt(u);break;case"select":case"option":break;default:typeof _.onClick=="function"&&(u.onclick=bc)}u=m,s.updateQueue=u,u!==null&&(s.flags|=4)}else{R=m.nodeType===9?m:m.ownerDocument,n==="http://www.w3.org/1999/xhtml"&&(n=F(o)),n==="http://www.w3.org/1999/xhtml"?o==="script"?(n=R.createElement("div"),n.innerHTML="<script><\/script>",n=n.removeChild(n.firstChild)):typeof u.is=="string"?n=R.createElement(o,{is:u.is}):(n=R.createElement(o),o==="select"&&(R=n,u.multiple?R.multiple=!0:u.size&&(R.size=u.size))):n=R.createElementNS(n,o),n[tr]=s,n[ul]=u,U0(n,s,!1,!1),s.stateNode=n;e:{switch(R=Oe(o,u),o){case"dialog":Yt("cancel",n),Yt("close",n),m=u;break;case"iframe":case"object":case"embed":Yt("load",n),m=u;break;case"video":case"audio":for(m=0;m<ol.length;m++)Yt(ol[m],n);m=u;break;case"source":Yt("error",n),m=u;break;case"img":case"image":case"link":Yt("error",n),Yt("load",n),m=u;break;case"details":Yt("toggle",n),m=u;break;case"input":Rt(n,u),m=Ut(n,u),Yt("invalid",n);break;case"option":m=u;break;case"select":n._wrapperState={wasMultiple:!!u.multiple},m=Z({},u,{value:void 0}),Yt("invalid",n);break;case"textarea":ee(n,u),m=Jt(n,u),Yt("invalid",n);break;default:m=u}Ze(o,m),z=m;for(_ in z)if(z.hasOwnProperty(_)){var W=z[_];_==="style"?Se(n,W):_==="dangerouslySetInnerHTML"?(W=W?W.__html:void 0,W!=null&&de(n,W)):_==="children"?typeof W=="string"?(o!=="textarea"||W!=="")&&ve(n,W):typeof W=="number"&&ve(n,""+W):_!=="suppressContentEditableWarning"&&_!=="suppressHydrationWarning"&&_!=="autoFocus"&&(a.hasOwnProperty(_)?W!=null&&_==="onScroll"&&Yt("scroll",n):W!=null&&D(n,_,W,R))}switch(o){case"input":qe(n),un(n,u,!1);break;case"textarea":qe(n),Lt(n);break;case"option":u.value!=null&&n.setAttribute("value",""+fe(u.value));break;case"select":n.multiple=!!u.multiple,_=u.value,_!=null?Bt(n,!!u.multiple,_,!1):u.defaultValue!=null&&Bt(n,!!u.multiple,u.defaultValue,!0);break;default:typeof m.onClick=="function"&&(n.onclick=bc)}switch(o){case"button":case"input":case"select":case"textarea":u=!!u.autoFocus;break e;case"img":u=!0;break e;default:u=!1}}u&&(s.flags|=4)}s.ref!==null&&(s.flags|=512,s.flags|=2097152)}return zn(s),null;case 6:if(n&&s.stateNode!=null)k0(n,s,n.memoizedProps,u);else{if(typeof u!="string"&&s.stateNode===null)throw Error(t(166));if(o=ea(ml.current),ea(nr.current),Lc(s)){if(u=s.stateNode,o=s.memoizedProps,u[tr]=s,(_=u.nodeValue!==o)&&(n=pi,n!==null))switch(n.tag){case 3:wc(u.nodeValue,o,(n.mode&1)!==0);break;case 5:n.memoizedProps.suppressHydrationWarning!==!0&&wc(u.nodeValue,o,(n.mode&1)!==0)}_&&(s.flags|=4)}else u=(o.nodeType===9?o:o.ownerDocument).createTextNode(u),u[tr]=s,s.stateNode=u}return zn(s),null;case 13:if(Qt(on),u=s.memoizedState,n===null||n.memoizedState!==null&&n.memoizedState.dehydrated!==null){if(tn&&mi!==null&&(s.mode&1)!==0&&(s.flags&128)===0)Bg(),Ga(),s.flags|=98560,_=!1;else if(_=Lc(s),u!==null&&u.dehydrated!==null){if(n===null){if(!_)throw Error(t(318));if(_=s.memoizedState,_=_!==null?_.dehydrated:null,!_)throw Error(t(317));_[tr]=s}else Ga(),(s.flags&128)===0&&(s.memoizedState=null),s.flags|=4;zn(s),_=!1}else zi!==null&&($d(zi),zi=null),_=!0;if(!_)return s.flags&65536?s:null}return(s.flags&128)!==0?(s.lanes=o,s):(u=u!==null,u!==(n!==null&&n.memoizedState!==null)&&u&&(s.child.flags|=8192,(s.mode&1)!==0&&(n===null||(on.current&1)!==0?_n===0&&(_n=3):Yd())),s.updateQueue!==null&&(s.flags|=4),zn(s),null);case 4:return $a(),Fd(n,s),n===null&&ll(s.stateNode.containerInfo),zn(s),null;case 10:return ud(s.type._context),zn(s),null;case 17:return ni(s.type)&&Cc(),zn(s),null;case 19:if(Qt(on),_=s.memoizedState,_===null)return zn(s),null;if(u=(s.flags&128)!==0,R=_.rendering,R===null)if(u)yl(_,!1);else{if(_n!==0||n!==null&&(n.flags&128)!==0)for(n=s.child;n!==null;){if(R=Oc(n),R!==null){for(s.flags|=128,yl(_,!1),u=R.updateQueue,u!==null&&(s.updateQueue=u,s.flags|=4),s.subtreeFlags=0,u=o,o=s.child;o!==null;)_=o,n=u,_.flags&=14680066,R=_.alternate,R===null?(_.childLanes=0,_.lanes=n,_.child=null,_.subtreeFlags=0,_.memoizedProps=null,_.memoizedState=null,_.updateQueue=null,_.dependencies=null,_.stateNode=null):(_.childLanes=R.childLanes,_.lanes=R.lanes,_.child=R.child,_.subtreeFlags=0,_.deletions=null,_.memoizedProps=R.memoizedProps,_.memoizedState=R.memoizedState,_.updateQueue=R.updateQueue,_.type=R.type,n=R.dependencies,_.dependencies=n===null?null:{lanes:n.lanes,firstContext:n.firstContext}),o=o.sibling;return qt(on,on.current&1|2),s.child}n=n.sibling}_.tail!==null&&an()>Qa&&(s.flags|=128,u=!0,yl(_,!1),s.lanes=4194304)}else{if(!u)if(n=Oc(R),n!==null){if(s.flags|=128,u=!0,o=n.updateQueue,o!==null&&(s.updateQueue=o,s.flags|=4),yl(_,!0),_.tail===null&&_.tailMode==="hidden"&&!R.alternate&&!tn)return zn(s),null}else 2*an()-_.renderingStartTime>Qa&&o!==1073741824&&(s.flags|=128,u=!0,yl(_,!1),s.lanes=4194304);_.isBackwards?(R.sibling=s.child,s.child=R):(o=_.last,o!==null?o.sibling=R:s.child=R,_.last=R)}return _.tail!==null?(s=_.tail,_.rendering=s,_.tail=s.sibling,_.renderingStartTime=an(),s.sibling=null,o=on.current,qt(on,u?o&1|2:o&1),s):(zn(s),null);case 22:case 23:return Kd(),u=s.memoizedState!==null,n!==null&&n.memoizedState!==null!==u&&(s.flags|=8192),u&&(s.mode&1)!==0?(gi&1073741824)!==0&&(zn(s),s.subtreeFlags&6&&(s.flags|=8192)):zn(s),null;case 24:return null;case 25:return null}throw Error(t(156,s.tag))}function tM(n,s){switch(rd(s),s.tag){case 1:return ni(s.type)&&Cc(),n=s.flags,n&65536?(s.flags=n&-65537|128,s):null;case 3:return $a(),Qt(ti),Qt(kn),xd(),n=s.flags,(n&65536)!==0&&(n&128)===0?(s.flags=n&-65537|128,s):null;case 5:return md(s),null;case 13:if(Qt(on),n=s.memoizedState,n!==null&&n.dehydrated!==null){if(s.alternate===null)throw Error(t(340));Ga()}return n=s.flags,n&65536?(s.flags=n&-65537|128,s):null;case 19:return Qt(on),null;case 4:return $a(),null;case 10:return ud(s.type._context),null;case 22:case 23:return Kd(),null;case 24:return null;default:return null}}var $c=!1,Bn=!1,nM=typeof WeakSet=="function"?WeakSet:Set,We=null;function Ka(n,s){var o=n.ref;if(o!==null)if(typeof o=="function")try{o(null)}catch(u){dn(n,s,u)}else o.current=null}function kd(n,s,o){try{o()}catch(u){dn(n,s,u)}}var O0=!1;function iM(n,s){if(Kh=fc,n=gg(),Vh(n)){if("selectionStart"in n)var o={start:n.selectionStart,end:n.selectionEnd};else e:{o=(o=n.ownerDocument)&&o.defaultView||window;var u=o.getSelection&&o.getSelection();if(u&&u.rangeCount!==0){o=u.anchorNode;var m=u.anchorOffset,_=u.focusNode;u=u.focusOffset;try{o.nodeType,_.nodeType}catch{o=null;break e}var R=0,z=-1,W=-1,me=0,we=0,be=n,Ee=null;t:for(;;){for(var Ge;be!==o||m!==0&&be.nodeType!==3||(z=R+m),be!==_||u!==0&&be.nodeType!==3||(W=R+u),be.nodeType===3&&(R+=be.nodeValue.length),(Ge=be.firstChild)!==null;)Ee=be,be=Ge;for(;;){if(be===n)break t;if(Ee===o&&++me===m&&(z=R),Ee===_&&++we===u&&(W=R),(Ge=be.nextSibling)!==null)break;be=Ee,Ee=be.parentNode}be=Ge}o=z===-1||W===-1?null:{start:z,end:W}}else o=null}o=o||{start:0,end:0}}else o=null;for(Yh={focusedElem:n,selectionRange:o},fc=!1,We=s;We!==null;)if(s=We,n=s.child,(s.subtreeFlags&1028)!==0&&n!==null)n.return=s,We=n;else for(;We!==null;){s=We;try{var $e=s.alternate;if((s.flags&1024)!==0)switch(s.tag){case 0:case 11:case 15:break;case 1:if($e!==null){var Qe=$e.memoizedProps,pn=$e.memoizedState,ae=s.stateNode,J=ae.getSnapshotBeforeUpdate(s.elementType===s.type?Qe:Bi(s.type,Qe),pn);ae.__reactInternalSnapshotBeforeUpdate=J}break;case 3:var ue=s.stateNode.containerInfo;ue.nodeType===1?ue.textContent="":ue.nodeType===9&&ue.documentElement&&ue.removeChild(ue.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(t(163))}}catch(Ce){dn(s,s.return,Ce)}if(n=s.sibling,n!==null){n.return=s.return,We=n;break}We=s.return}return $e=O0,O0=!1,$e}function Sl(n,s,o){var u=s.updateQueue;if(u=u!==null?u.lastEffect:null,u!==null){var m=u=u.next;do{if((m.tag&n)===n){var _=m.destroy;m.destroy=void 0,_!==void 0&&kd(s,o,_)}m=m.next}while(m!==u)}}function qc(n,s){if(s=s.updateQueue,s=s!==null?s.lastEffect:null,s!==null){var o=s=s.next;do{if((o.tag&n)===n){var u=o.create;o.destroy=u()}o=o.next}while(o!==s)}}function Od(n){var s=n.ref;if(s!==null){var o=n.stateNode;switch(n.tag){case 5:n=o;break;default:n=o}typeof s=="function"?s(n):s.current=n}}function z0(n){var s=n.alternate;s!==null&&(n.alternate=null,z0(s)),n.child=null,n.deletions=null,n.sibling=null,n.tag===5&&(s=n.stateNode,s!==null&&(delete s[tr],delete s[ul],delete s[ed],delete s[zS],delete s[BS])),n.stateNode=null,n.return=null,n.dependencies=null,n.memoizedProps=null,n.memoizedState=null,n.pendingProps=null,n.stateNode=null,n.updateQueue=null}function B0(n){return n.tag===5||n.tag===3||n.tag===4}function V0(n){e:for(;;){for(;n.sibling===null;){if(n.return===null||B0(n.return))return null;n=n.return}for(n.sibling.return=n.return,n=n.sibling;n.tag!==5&&n.tag!==6&&n.tag!==18;){if(n.flags&2||n.child===null||n.tag===4)continue e;n.child.return=n,n=n.child}if(!(n.flags&2))return n.stateNode}}function zd(n,s,o){var u=n.tag;if(u===5||u===6)n=n.stateNode,s?o.nodeType===8?o.parentNode.insertBefore(n,s):o.insertBefore(n,s):(o.nodeType===8?(s=o.parentNode,s.insertBefore(n,o)):(s=o,s.appendChild(n)),o=o._reactRootContainer,o!=null||s.onclick!==null||(s.onclick=bc));else if(u!==4&&(n=n.child,n!==null))for(zd(n,s,o),n=n.sibling;n!==null;)zd(n,s,o),n=n.sibling}function Bd(n,s,o){var u=n.tag;if(u===5||u===6)n=n.stateNode,s?o.insertBefore(n,s):o.appendChild(n);else if(u!==4&&(n=n.child,n!==null))for(Bd(n,s,o),n=n.sibling;n!==null;)Bd(n,s,o),n=n.sibling}var Ln=null,Vi=!1;function hs(n,s,o){for(o=o.child;o!==null;)H0(n,s,o),o=o.sibling}function H0(n,s,o){if(Pe&&typeof Pe.onCommitFiberUnmount=="function")try{Pe.onCommitFiberUnmount(le,o)}catch{}switch(o.tag){case 5:Bn||Ka(o,s);case 6:var u=Ln,m=Vi;Ln=null,hs(n,s,o),Ln=u,Vi=m,Ln!==null&&(Vi?(n=Ln,o=o.stateNode,n.nodeType===8?n.parentNode.removeChild(o):n.removeChild(o)):Ln.removeChild(o.stateNode));break;case 18:Ln!==null&&(Vi?(n=Ln,o=o.stateNode,n.nodeType===8?Jh(n.parentNode,o):n.nodeType===1&&Jh(n,o),Jo(n)):Jh(Ln,o.stateNode));break;case 4:u=Ln,m=Vi,Ln=o.stateNode.containerInfo,Vi=!0,hs(n,s,o),Ln=u,Vi=m;break;case 0:case 11:case 14:case 15:if(!Bn&&(u=o.updateQueue,u!==null&&(u=u.lastEffect,u!==null))){m=u=u.next;do{var _=m,R=_.destroy;_=_.tag,R!==void 0&&((_&2)!==0||(_&4)!==0)&&kd(o,s,R),m=m.next}while(m!==u)}hs(n,s,o);break;case 1:if(!Bn&&(Ka(o,s),u=o.stateNode,typeof u.componentWillUnmount=="function"))try{u.props=o.memoizedProps,u.state=o.memoizedState,u.componentWillUnmount()}catch(z){dn(o,s,z)}hs(n,s,o);break;case 21:hs(n,s,o);break;case 22:o.mode&1?(Bn=(u=Bn)||o.memoizedState!==null,hs(n,s,o),Bn=u):hs(n,s,o);break;default:hs(n,s,o)}}function G0(n){var s=n.updateQueue;if(s!==null){n.updateQueue=null;var o=n.stateNode;o===null&&(o=n.stateNode=new nM),s.forEach(function(u){var m=dM.bind(null,n,u);o.has(u)||(o.add(u),u.then(m,m))})}}function Hi(n,s){var o=s.deletions;if(o!==null)for(var u=0;u<o.length;u++){var m=o[u];try{var _=n,R=s,z=R;e:for(;z!==null;){switch(z.tag){case 5:Ln=z.stateNode,Vi=!1;break e;case 3:Ln=z.stateNode.containerInfo,Vi=!0;break e;case 4:Ln=z.stateNode.containerInfo,Vi=!0;break e}z=z.return}if(Ln===null)throw Error(t(160));H0(_,R,m),Ln=null,Vi=!1;var W=m.alternate;W!==null&&(W.return=null),m.return=null}catch(me){dn(m,s,me)}}if(s.subtreeFlags&12854)for(s=s.child;s!==null;)j0(s,n),s=s.sibling}function j0(n,s){var o=n.alternate,u=n.flags;switch(n.tag){case 0:case 11:case 14:case 15:if(Hi(s,n),rr(n),u&4){try{Sl(3,n,n.return),qc(3,n)}catch(Qe){dn(n,n.return,Qe)}try{Sl(5,n,n.return)}catch(Qe){dn(n,n.return,Qe)}}break;case 1:Hi(s,n),rr(n),u&512&&o!==null&&Ka(o,o.return);break;case 5:if(Hi(s,n),rr(n),u&512&&o!==null&&Ka(o,o.return),n.flags&32){var m=n.stateNode;try{ve(m,"")}catch(Qe){dn(n,n.return,Qe)}}if(u&4&&(m=n.stateNode,m!=null)){var _=n.memoizedProps,R=o!==null?o.memoizedProps:_,z=n.type,W=n.updateQueue;if(n.updateQueue=null,W!==null)try{z==="input"&&_.type==="radio"&&_.name!=null&&wt(m,_),Oe(z,R);var me=Oe(z,_);for(R=0;R<W.length;R+=2){var we=W[R],be=W[R+1];we==="style"?Se(m,be):we==="dangerouslySetInnerHTML"?de(m,be):we==="children"?ve(m,be):D(m,we,be,me)}switch(z){case"input":Zt(m,_);break;case"textarea":Pn(m,_);break;case"select":var Ee=m._wrapperState.wasMultiple;m._wrapperState.wasMultiple=!!_.multiple;var Ge=_.value;Ge!=null?Bt(m,!!_.multiple,Ge,!1):Ee!==!!_.multiple&&(_.defaultValue!=null?Bt(m,!!_.multiple,_.defaultValue,!0):Bt(m,!!_.multiple,_.multiple?[]:"",!1))}m[ul]=_}catch(Qe){dn(n,n.return,Qe)}}break;case 6:if(Hi(s,n),rr(n),u&4){if(n.stateNode===null)throw Error(t(162));m=n.stateNode,_=n.memoizedProps;try{m.nodeValue=_}catch(Qe){dn(n,n.return,Qe)}}break;case 3:if(Hi(s,n),rr(n),u&4&&o!==null&&o.memoizedState.isDehydrated)try{Jo(s.containerInfo)}catch(Qe){dn(n,n.return,Qe)}break;case 4:Hi(s,n),rr(n);break;case 13:Hi(s,n),rr(n),m=n.child,m.flags&8192&&(_=m.memoizedState!==null,m.stateNode.isHidden=_,!_||m.alternate!==null&&m.alternate.memoizedState!==null||(Gd=an())),u&4&&G0(n);break;case 22:if(we=o!==null&&o.memoizedState!==null,n.mode&1?(Bn=(me=Bn)||we,Hi(s,n),Bn=me):Hi(s,n),rr(n),u&8192){if(me=n.memoizedState!==null,(n.stateNode.isHidden=me)&&!we&&(n.mode&1)!==0)for(We=n,we=n.child;we!==null;){for(be=We=we;We!==null;){switch(Ee=We,Ge=Ee.child,Ee.tag){case 0:case 11:case 14:case 15:Sl(4,Ee,Ee.return);break;case 1:Ka(Ee,Ee.return);var $e=Ee.stateNode;if(typeof $e.componentWillUnmount=="function"){u=Ee,o=Ee.return;try{s=u,$e.props=s.memoizedProps,$e.state=s.memoizedState,$e.componentWillUnmount()}catch(Qe){dn(u,o,Qe)}}break;case 5:Ka(Ee,Ee.return);break;case 22:if(Ee.memoizedState!==null){$0(be);continue}}Ge!==null?(Ge.return=Ee,We=Ge):$0(be)}we=we.sibling}e:for(we=null,be=n;;){if(be.tag===5){if(we===null){we=be;try{m=be.stateNode,me?(_=m.style,typeof _.setProperty=="function"?_.setProperty("display","none","important"):_.display="none"):(z=be.stateNode,W=be.memoizedProps.style,R=W!=null&&W.hasOwnProperty("display")?W.display:null,z.style.display=_e("display",R))}catch(Qe){dn(n,n.return,Qe)}}}else if(be.tag===6){if(we===null)try{be.stateNode.nodeValue=me?"":be.memoizedProps}catch(Qe){dn(n,n.return,Qe)}}else if((be.tag!==22&&be.tag!==23||be.memoizedState===null||be===n)&&be.child!==null){be.child.return=be,be=be.child;continue}if(be===n)break e;for(;be.sibling===null;){if(be.return===null||be.return===n)break e;we===be&&(we=null),be=be.return}we===be&&(we=null),be.sibling.return=be.return,be=be.sibling}}break;case 19:Hi(s,n),rr(n),u&4&&G0(n);break;case 21:break;default:Hi(s,n),rr(n)}}function rr(n){var s=n.flags;if(s&2){try{e:{for(var o=n.return;o!==null;){if(B0(o)){var u=o;break e}o=o.return}throw Error(t(160))}switch(u.tag){case 5:var m=u.stateNode;u.flags&32&&(ve(m,""),u.flags&=-33);var _=V0(n);Bd(n,_,m);break;case 3:case 4:var R=u.stateNode.containerInfo,z=V0(n);zd(n,z,R);break;default:throw Error(t(161))}}catch(W){dn(n,n.return,W)}n.flags&=-3}s&4096&&(n.flags&=-4097)}function rM(n,s,o){We=n,W0(n)}function W0(n,s,o){for(var u=(n.mode&1)!==0;We!==null;){var m=We,_=m.child;if(m.tag===22&&u){var R=m.memoizedState!==null||$c;if(!R){var z=m.alternate,W=z!==null&&z.memoizedState!==null||Bn;z=$c;var me=Bn;if($c=R,(Bn=W)&&!me)for(We=m;We!==null;)R=We,W=R.child,R.tag===22&&R.memoizedState!==null?q0(m):W!==null?(W.return=R,We=W):q0(m);for(;_!==null;)We=_,W0(_),_=_.sibling;We=m,$c=z,Bn=me}X0(n)}else(m.subtreeFlags&8772)!==0&&_!==null?(_.return=m,We=_):X0(n)}}function X0(n){for(;We!==null;){var s=We;if((s.flags&8772)!==0){var o=s.alternate;try{if((s.flags&8772)!==0)switch(s.tag){case 0:case 11:case 15:Bn||qc(5,s);break;case 1:var u=s.stateNode;if(s.flags&4&&!Bn)if(o===null)u.componentDidMount();else{var m=s.elementType===s.type?o.memoizedProps:Bi(s.type,o.memoizedProps);u.componentDidUpdate(m,o.memoizedState,u.__reactInternalSnapshotBeforeUpdate)}var _=s.updateQueue;_!==null&&$g(s,_,u);break;case 3:var R=s.updateQueue;if(R!==null){if(o=null,s.child!==null)switch(s.child.tag){case 5:o=s.child.stateNode;break;case 1:o=s.child.stateNode}$g(s,R,o)}break;case 5:var z=s.stateNode;if(o===null&&s.flags&4){o=z;var W=s.memoizedProps;switch(s.type){case"button":case"input":case"select":case"textarea":W.autoFocus&&o.focus();break;case"img":W.src&&(o.src=W.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(s.memoizedState===null){var me=s.alternate;if(me!==null){var we=me.memoizedState;if(we!==null){var be=we.dehydrated;be!==null&&Jo(be)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(t(163))}Bn||s.flags&512&&Od(s)}catch(Ee){dn(s,s.return,Ee)}}if(s===n){We=null;break}if(o=s.sibling,o!==null){o.return=s.return,We=o;break}We=s.return}}function $0(n){for(;We!==null;){var s=We;if(s===n){We=null;break}var o=s.sibling;if(o!==null){o.return=s.return,We=o;break}We=s.return}}function q0(n){for(;We!==null;){var s=We;try{switch(s.tag){case 0:case 11:case 15:var o=s.return;try{qc(4,s)}catch(W){dn(s,o,W)}break;case 1:var u=s.stateNode;if(typeof u.componentDidMount=="function"){var m=s.return;try{u.componentDidMount()}catch(W){dn(s,m,W)}}var _=s.return;try{Od(s)}catch(W){dn(s,_,W)}break;case 5:var R=s.return;try{Od(s)}catch(W){dn(s,R,W)}}}catch(W){dn(s,s.return,W)}if(s===n){We=null;break}var z=s.sibling;if(z!==null){z.return=s.return,We=z;break}We=s.return}}var sM=Math.ceil,Kc=C.ReactCurrentDispatcher,Vd=C.ReactCurrentOwner,Ai=C.ReactCurrentBatchConfig,Pt=0,bn=null,gn=null,Dn=0,gi=0,Ya=as(0),_n=0,Ml=null,na=0,Yc=0,Hd=0,El=null,ri=null,Gd=0,Qa=1/0,Nr=null,Qc=!1,jd=null,ds=null,Zc=!1,fs=null,Jc=0,wl=0,Wd=null,eu=-1,tu=0;function qn(){return(Pt&6)!==0?an():eu!==-1?eu:eu=an()}function ps(n){return(n.mode&1)===0?1:(Pt&2)!==0&&Dn!==0?Dn&-Dn:HS.transition!==null?(tu===0&&(tu=He()),tu):(n=St,n!==0||(n=window.event,n=n===void 0?16:Ym(n.type)),n)}function Gi(n,s,o,u){if(50<wl)throw wl=0,Wd=null,Error(t(185));yt(n,o,u),((Pt&2)===0||n!==bn)&&(n===bn&&((Pt&2)===0&&(Yc|=o),_n===4&&ms(n,Dn)),si(n,u),o===1&&Pt===0&&(s.mode&1)===0&&(Qa=an()+500,Ac&&ls()))}function si(n,s){var o=n.callbackNode;Vt(n,s);var u=$t(n,n===bn?Dn:0);if(u===0)o!==null&&$o(o),n.callbackNode=null,n.callbackPriority=0;else if(s=u&-u,n.callbackPriority!==s){if(o!=null&&$o(o),s===1)n.tag===0?VS(Y0.bind(null,n)):Ug(Y0.bind(null,n)),kS(function(){(Pt&6)===0&&ls()}),o=null;else{switch(Er(u)){case 1:o=qo;break;case 4:o=P;break;case 16:o=te;break;case 536870912:o=ce;break;default:o=te}o=rx(o,K0.bind(null,n))}n.callbackPriority=s,n.callbackNode=o}}function K0(n,s){if(eu=-1,tu=0,(Pt&6)!==0)throw Error(t(327));var o=n.callbackNode;if(Za()&&n.callbackNode!==o)return null;var u=$t(n,n===bn?Dn:0);if(u===0)return null;if((u&30)!==0||(u&n.expiredLanes)!==0||s)s=nu(n,u);else{s=u;var m=Pt;Pt|=2;var _=Z0();(bn!==n||Dn!==s)&&(Nr=null,Qa=an()+500,ra(n,s));do try{lM();break}catch(z){Q0(n,z)}while(!0);cd(),Kc.current=_,Pt=m,gn!==null?s=0:(bn=null,Dn=0,s=_n)}if(s!==0){if(s===2&&(m=mn(n),m!==0&&(u=m,s=Xd(n,m))),s===1)throw o=Ml,ra(n,0),ms(n,u),si(n,an()),o;if(s===6)ms(n,u);else{if(m=n.current.alternate,(u&30)===0&&!aM(m)&&(s=nu(n,u),s===2&&(_=mn(n),_!==0&&(u=_,s=Xd(n,_))),s===1))throw o=Ml,ra(n,0),ms(n,u),si(n,an()),o;switch(n.finishedWork=m,n.finishedLanes=u,s){case 0:case 1:throw Error(t(345));case 2:sa(n,ri,Nr);break;case 3:if(ms(n,u),(u&130023424)===u&&(s=Gd+500-an(),10<s)){if($t(n,0)!==0)break;if(m=n.suspendedLanes,(m&u)!==u){qn(),n.pingedLanes|=n.suspendedLanes&m;break}n.timeoutHandle=Zh(sa.bind(null,n,ri,Nr),s);break}sa(n,ri,Nr);break;case 4:if(ms(n,u),(u&4194240)===u)break;for(s=n.eventTimes,m=-1;0<u;){var R=31-Ae(u);_=1<<R,R=s[R],R>m&&(m=R),u&=~_}if(u=m,u=an()-u,u=(120>u?120:480>u?480:1080>u?1080:1920>u?1920:3e3>u?3e3:4320>u?4320:1960*sM(u/1960))-u,10<u){n.timeoutHandle=Zh(sa.bind(null,n,ri,Nr),u);break}sa(n,ri,Nr);break;case 5:sa(n,ri,Nr);break;default:throw Error(t(329))}}}return si(n,an()),n.callbackNode===o?K0.bind(null,n):null}function Xd(n,s){var o=El;return n.current.memoizedState.isDehydrated&&(ra(n,s).flags|=256),n=nu(n,s),n!==2&&(s=ri,ri=o,s!==null&&$d(s)),n}function $d(n){ri===null?ri=n:ri.push.apply(ri,n)}function aM(n){for(var s=n;;){if(s.flags&16384){var o=s.updateQueue;if(o!==null&&(o=o.stores,o!==null))for(var u=0;u<o.length;u++){var m=o[u],_=m.getSnapshot;m=m.value;try{if(!Oi(_(),m))return!1}catch{return!1}}}if(o=s.child,s.subtreeFlags&16384&&o!==null)o.return=s,s=o;else{if(s===n)break;for(;s.sibling===null;){if(s.return===null||s.return===n)return!0;s=s.return}s.sibling.return=s.return,s=s.sibling}}return!0}function ms(n,s){for(s&=~Hd,s&=~Yc,n.suspendedLanes|=s,n.pingedLanes&=~s,n=n.expirationTimes;0<s;){var o=31-Ae(s),u=1<<o;n[o]=-1,s&=~u}}function Y0(n){if((Pt&6)!==0)throw Error(t(327));Za();var s=$t(n,0);if((s&1)===0)return si(n,an()),null;var o=nu(n,s);if(n.tag!==0&&o===2){var u=mn(n);u!==0&&(s=u,o=Xd(n,u))}if(o===1)throw o=Ml,ra(n,0),ms(n,s),si(n,an()),o;if(o===6)throw Error(t(345));return n.finishedWork=n.current.alternate,n.finishedLanes=s,sa(n,ri,Nr),si(n,an()),null}function qd(n,s){var o=Pt;Pt|=1;try{return n(s)}finally{Pt=o,Pt===0&&(Qa=an()+500,Ac&&ls())}}function ia(n){fs!==null&&fs.tag===0&&(Pt&6)===0&&Za();var s=Pt;Pt|=1;var o=Ai.transition,u=St;try{if(Ai.transition=null,St=1,n)return n()}finally{St=u,Ai.transition=o,Pt=s,(Pt&6)===0&&ls()}}function Kd(){gi=Ya.current,Qt(Ya)}function ra(n,s){n.finishedWork=null,n.finishedLanes=0;var o=n.timeoutHandle;if(o!==-1&&(n.timeoutHandle=-1,FS(o)),gn!==null)for(o=gn.return;o!==null;){var u=o;switch(rd(u),u.tag){case 1:u=u.type.childContextTypes,u!=null&&Cc();break;case 3:$a(),Qt(ti),Qt(kn),xd();break;case 5:md(u);break;case 4:$a();break;case 13:Qt(on);break;case 19:Qt(on);break;case 10:ud(u.type._context);break;case 22:case 23:Kd()}o=o.return}if(bn=n,gn=n=gs(n.current,null),Dn=gi=s,_n=0,Ml=null,Hd=Yc=na=0,ri=El=null,Js!==null){for(s=0;s<Js.length;s++)if(o=Js[s],u=o.interleaved,u!==null){o.interleaved=null;var m=u.next,_=o.pending;if(_!==null){var R=_.next;_.next=m,u.next=R}o.pending=u}Js=null}return n}function Q0(n,s){do{var o=gn;try{if(cd(),zc.current=Gc,Bc){for(var u=ln.memoizedState;u!==null;){var m=u.queue;m!==null&&(m.pending=null),u=u.next}Bc=!1}if(ta=0,wn=vn=ln=null,gl=!1,xl=0,Vd.current=null,o===null||o.return===null){_n=1,Ml=s,gn=null;break}e:{var _=n,R=o.return,z=o,W=s;if(s=Dn,z.flags|=32768,W!==null&&typeof W=="object"&&typeof W.then=="function"){var me=W,we=z,be=we.tag;if((we.mode&1)===0&&(be===0||be===11||be===15)){var Ee=we.alternate;Ee?(we.updateQueue=Ee.updateQueue,we.memoizedState=Ee.memoizedState,we.lanes=Ee.lanes):(we.updateQueue=null,we.memoizedState=null)}var Ge=M0(R);if(Ge!==null){Ge.flags&=-257,E0(Ge,R,z,_,s),Ge.mode&1&&S0(_,me,s),s=Ge,W=me;var $e=s.updateQueue;if($e===null){var Qe=new Set;Qe.add(W),s.updateQueue=Qe}else $e.add(W);break e}else{if((s&1)===0){S0(_,me,s),Yd();break e}W=Error(t(426))}}else if(tn&&z.mode&1){var pn=M0(R);if(pn!==null){(pn.flags&65536)===0&&(pn.flags|=256),E0(pn,R,z,_,s),od(qa(W,z));break e}}_=W=qa(W,z),_n!==4&&(_n=2),El===null?El=[_]:El.push(_),_=R;do{switch(_.tag){case 3:_.flags|=65536,s&=-s,_.lanes|=s;var ae=_0(_,W,s);Xg(_,ae);break e;case 1:z=W;var J=_.type,ue=_.stateNode;if((_.flags&128)===0&&(typeof J.getDerivedStateFromError=="function"||ue!==null&&typeof ue.componentDidCatch=="function"&&(ds===null||!ds.has(ue)))){_.flags|=65536,s&=-s,_.lanes|=s;var Ce=y0(_,z,s);Xg(_,Ce);break e}}_=_.return}while(_!==null)}ex(o)}catch(et){s=et,gn===o&&o!==null&&(gn=o=o.return);continue}break}while(!0)}function Z0(){var n=Kc.current;return Kc.current=Gc,n===null?Gc:n}function Yd(){(_n===0||_n===3||_n===2)&&(_n=4),bn===null||(na&268435455)===0&&(Yc&268435455)===0||ms(bn,Dn)}function nu(n,s){var o=Pt;Pt|=2;var u=Z0();(bn!==n||Dn!==s)&&(Nr=null,ra(n,s));do try{oM();break}catch(m){Q0(n,m)}while(!0);if(cd(),Pt=o,Kc.current=u,gn!==null)throw Error(t(261));return bn=null,Dn=0,_n}function oM(){for(;gn!==null;)J0(gn)}function lM(){for(;gn!==null&&!hc();)J0(gn)}function J0(n){var s=ix(n.alternate,n,gi);n.memoizedProps=n.pendingProps,s===null?ex(n):gn=s,Vd.current=null}function ex(n){var s=n;do{var o=s.alternate;if(n=s.return,(s.flags&32768)===0){if(o=eM(o,s,gi),o!==null){gn=o;return}}else{if(o=tM(o,s),o!==null){o.flags&=32767,gn=o;return}if(n!==null)n.flags|=32768,n.subtreeFlags=0,n.deletions=null;else{_n=6,gn=null;return}}if(s=s.sibling,s!==null){gn=s;return}gn=s=n}while(s!==null);_n===0&&(_n=5)}function sa(n,s,o){var u=St,m=Ai.transition;try{Ai.transition=null,St=1,cM(n,s,o,u)}finally{Ai.transition=m,St=u}return null}function cM(n,s,o,u){do Za();while(fs!==null);if((Pt&6)!==0)throw Error(t(327));o=n.finishedWork;var m=n.finishedLanes;if(o===null)return null;if(n.finishedWork=null,n.finishedLanes=0,o===n.current)throw Error(t(177));n.callbackNode=null,n.callbackPriority=0;var _=o.lanes|o.childLanes;if(Jn(n,_),n===bn&&(gn=bn=null,Dn=0),(o.subtreeFlags&2064)===0&&(o.flags&2064)===0||Zc||(Zc=!0,rx(te,function(){return Za(),null})),_=(o.flags&15990)!==0,(o.subtreeFlags&15990)!==0||_){_=Ai.transition,Ai.transition=null;var R=St;St=1;var z=Pt;Pt|=4,Vd.current=null,iM(n,o),j0(o,n),AS(Yh),fc=!!Kh,Yh=Kh=null,n.current=o,rM(o),Rh(),Pt=z,St=R,Ai.transition=_}else n.current=o;if(Zc&&(Zc=!1,fs=n,Jc=m),_=n.pendingLanes,_===0&&(ds=null),je(o.stateNode),si(n,an()),s!==null)for(u=n.onRecoverableError,o=0;o<s.length;o++)m=s[o],u(m.value,{componentStack:m.stack,digest:m.digest});if(Qc)throw Qc=!1,n=jd,jd=null,n;return(Jc&1)!==0&&n.tag!==0&&Za(),_=n.pendingLanes,(_&1)!==0?n===Wd?wl++:(wl=0,Wd=n):wl=0,ls(),null}function Za(){if(fs!==null){var n=Er(Jc),s=Ai.transition,o=St;try{if(Ai.transition=null,St=16>n?16:n,fs===null)var u=!1;else{if(n=fs,fs=null,Jc=0,(Pt&6)!==0)throw Error(t(331));var m=Pt;for(Pt|=4,We=n.current;We!==null;){var _=We,R=_.child;if((We.flags&16)!==0){var z=_.deletions;if(z!==null){for(var W=0;W<z.length;W++){var me=z[W];for(We=me;We!==null;){var we=We;switch(we.tag){case 0:case 11:case 15:Sl(8,we,_)}var be=we.child;if(be!==null)be.return=we,We=be;else for(;We!==null;){we=We;var Ee=we.sibling,Ge=we.return;if(z0(we),we===me){We=null;break}if(Ee!==null){Ee.return=Ge,We=Ee;break}We=Ge}}}var $e=_.alternate;if($e!==null){var Qe=$e.child;if(Qe!==null){$e.child=null;do{var pn=Qe.sibling;Qe.sibling=null,Qe=pn}while(Qe!==null)}}We=_}}if((_.subtreeFlags&2064)!==0&&R!==null)R.return=_,We=R;else e:for(;We!==null;){if(_=We,(_.flags&2048)!==0)switch(_.tag){case 0:case 11:case 15:Sl(9,_,_.return)}var ae=_.sibling;if(ae!==null){ae.return=_.return,We=ae;break e}We=_.return}}var J=n.current;for(We=J;We!==null;){R=We;var ue=R.child;if((R.subtreeFlags&2064)!==0&&ue!==null)ue.return=R,We=ue;else e:for(R=J;We!==null;){if(z=We,(z.flags&2048)!==0)try{switch(z.tag){case 0:case 11:case 15:qc(9,z)}}catch(et){dn(z,z.return,et)}if(z===R){We=null;break e}var Ce=z.sibling;if(Ce!==null){Ce.return=z.return,We=Ce;break e}We=z.return}}if(Pt=m,ls(),Pe&&typeof Pe.onPostCommitFiberRoot=="function")try{Pe.onPostCommitFiberRoot(le,n)}catch{}u=!0}return u}finally{St=o,Ai.transition=s}}return!1}function tx(n,s,o){s=qa(o,s),s=_0(n,s,1),n=us(n,s,1),s=qn(),n!==null&&(yt(n,1,s),si(n,s))}function dn(n,s,o){if(n.tag===3)tx(n,n,o);else for(;s!==null;){if(s.tag===3){tx(s,n,o);break}else if(s.tag===1){var u=s.stateNode;if(typeof s.type.getDerivedStateFromError=="function"||typeof u.componentDidCatch=="function"&&(ds===null||!ds.has(u))){n=qa(o,n),n=y0(s,n,1),s=us(s,n,1),n=qn(),s!==null&&(yt(s,1,n),si(s,n));break}}s=s.return}}function uM(n,s,o){var u=n.pingCache;u!==null&&u.delete(s),s=qn(),n.pingedLanes|=n.suspendedLanes&o,bn===n&&(Dn&o)===o&&(_n===4||_n===3&&(Dn&130023424)===Dn&&500>an()-Gd?ra(n,0):Hd|=o),si(n,s)}function nx(n,s){s===0&&((n.mode&1)===0?s=1:(s=Je,Je<<=1,(Je&130023424)===0&&(Je=4194304)));var o=qn();n=Rr(n,s),n!==null&&(yt(n,s,o),si(n,o))}function hM(n){var s=n.memoizedState,o=0;s!==null&&(o=s.retryLane),nx(n,o)}function dM(n,s){var o=0;switch(n.tag){case 13:var u=n.stateNode,m=n.memoizedState;m!==null&&(o=m.retryLane);break;case 19:u=n.stateNode;break;default:throw Error(t(314))}u!==null&&u.delete(s),nx(n,o)}var ix;ix=function(n,s,o){if(n!==null)if(n.memoizedProps!==s.pendingProps||ti.current)ii=!0;else{if((n.lanes&o)===0&&(s.flags&128)===0)return ii=!1,JS(n,s,o);ii=(n.flags&131072)!==0}else ii=!1,tn&&(s.flags&1048576)!==0&&Fg(s,Nc,s.index);switch(s.lanes=0,s.tag){case 2:var u=s.type;Xc(n,s),n=s.pendingProps;var m=Ba(s,kn.current);Xa(s,o),m=yd(null,s,u,n,m,o);var _=Sd();return s.flags|=1,typeof m=="object"&&m!==null&&typeof m.render=="function"&&m.$$typeof===void 0?(s.tag=1,s.memoizedState=null,s.updateQueue=null,ni(u)?(_=!0,Rc(s)):_=!1,s.memoizedState=m.state!==null&&m.state!==void 0?m.state:null,fd(s),m.updater=jc,s.stateNode=m,m._reactInternals=s,Cd(s,u,n,o),s=Nd(null,s,u,!0,_,o)):(s.tag=0,tn&&_&&id(s),$n(null,s,m,o),s=s.child),s;case 16:u=s.elementType;e:{switch(Xc(n,s),n=s.pendingProps,m=u._init,u=m(u._payload),s.type=u,m=s.tag=pM(u),n=Bi(u,n),m){case 0:s=Pd(null,s,u,n,o);break e;case 1:s=A0(null,s,u,n,o);break e;case 11:s=w0(null,s,u,n,o);break e;case 14:s=b0(null,s,u,Bi(u.type,n),o);break e}throw Error(t(306,u,""))}return s;case 0:return u=s.type,m=s.pendingProps,m=s.elementType===u?m:Bi(u,m),Pd(n,s,u,m,o);case 1:return u=s.type,m=s.pendingProps,m=s.elementType===u?m:Bi(u,m),A0(n,s,u,m,o);case 3:e:{if(P0(s),n===null)throw Error(t(387));u=s.pendingProps,_=s.memoizedState,m=_.element,Wg(n,s),kc(s,u,null,o);var R=s.memoizedState;if(u=R.element,_.isDehydrated)if(_={element:u,isDehydrated:!1,cache:R.cache,pendingSuspenseBoundaries:R.pendingSuspenseBoundaries,transitions:R.transitions},s.updateQueue.baseState=_,s.memoizedState=_,s.flags&256){m=qa(Error(t(423)),s),s=N0(n,s,u,o,m);break e}else if(u!==m){m=qa(Error(t(424)),s),s=N0(n,s,u,o,m);break e}else for(mi=ss(s.stateNode.containerInfo.firstChild),pi=s,tn=!0,zi=null,o=Gg(s,null,u,o),s.child=o;o;)o.flags=o.flags&-3|4096,o=o.sibling;else{if(Ga(),u===m){s=Pr(n,s,o);break e}$n(n,s,u,o)}s=s.child}return s;case 5:return qg(s),n===null&&ad(s),u=s.type,m=s.pendingProps,_=n!==null?n.memoizedProps:null,R=m.children,Qh(u,m)?R=null:_!==null&&Qh(u,_)&&(s.flags|=32),R0(n,s),$n(n,s,R,o),s.child;case 6:return n===null&&ad(s),null;case 13:return L0(n,s,o);case 4:return pd(s,s.stateNode.containerInfo),u=s.pendingProps,n===null?s.child=ja(s,null,u,o):$n(n,s,u,o),s.child;case 11:return u=s.type,m=s.pendingProps,m=s.elementType===u?m:Bi(u,m),w0(n,s,u,m,o);case 7:return $n(n,s,s.pendingProps,o),s.child;case 8:return $n(n,s,s.pendingProps.children,o),s.child;case 12:return $n(n,s,s.pendingProps.children,o),s.child;case 10:e:{if(u=s.type._context,m=s.pendingProps,_=s.memoizedProps,R=m.value,qt(Ic,u._currentValue),u._currentValue=R,_!==null)if(Oi(_.value,R)){if(_.children===m.children&&!ti.current){s=Pr(n,s,o);break e}}else for(_=s.child,_!==null&&(_.return=s);_!==null;){var z=_.dependencies;if(z!==null){R=_.child;for(var W=z.firstContext;W!==null;){if(W.context===u){if(_.tag===1){W=Ar(-1,o&-o),W.tag=2;var me=_.updateQueue;if(me!==null){me=me.shared;var we=me.pending;we===null?W.next=W:(W.next=we.next,we.next=W),me.pending=W}}_.lanes|=o,W=_.alternate,W!==null&&(W.lanes|=o),hd(_.return,o,s),z.lanes|=o;break}W=W.next}}else if(_.tag===10)R=_.type===s.type?null:_.child;else if(_.tag===18){if(R=_.return,R===null)throw Error(t(341));R.lanes|=o,z=R.alternate,z!==null&&(z.lanes|=o),hd(R,o,s),R=_.sibling}else R=_.child;if(R!==null)R.return=_;else for(R=_;R!==null;){if(R===s){R=null;break}if(_=R.sibling,_!==null){_.return=R.return,R=_;break}R=R.return}_=R}$n(n,s,m.children,o),s=s.child}return s;case 9:return m=s.type,u=s.pendingProps.children,Xa(s,o),m=Ci(m),u=u(m),s.flags|=1,$n(n,s,u,o),s.child;case 14:return u=s.type,m=Bi(u,s.pendingProps),m=Bi(u.type,m),b0(n,s,u,m,o);case 15:return T0(n,s,s.type,s.pendingProps,o);case 17:return u=s.type,m=s.pendingProps,m=s.elementType===u?m:Bi(u,m),Xc(n,s),s.tag=1,ni(u)?(n=!0,Rc(s)):n=!1,Xa(s,o),x0(s,u,m),Cd(s,u,m,o),Nd(null,s,u,!0,n,o);case 19:return I0(n,s,o);case 22:return C0(n,s,o)}throw Error(t(156,s.tag))};function rx(n,s){return $s(n,s)}function fM(n,s,o,u){this.tag=n,this.key=o,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=s,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=u,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Pi(n,s,o,u){return new fM(n,s,o,u)}function Qd(n){return n=n.prototype,!(!n||!n.isReactComponent)}function pM(n){if(typeof n=="function")return Qd(n)?1:0;if(n!=null){if(n=n.$$typeof,n===X)return 11;if(n===$)return 14}return 2}function gs(n,s){var o=n.alternate;return o===null?(o=Pi(n.tag,s,n.key,n.mode),o.elementType=n.elementType,o.type=n.type,o.stateNode=n.stateNode,o.alternate=n,n.alternate=o):(o.pendingProps=s,o.type=n.type,o.flags=0,o.subtreeFlags=0,o.deletions=null),o.flags=n.flags&14680064,o.childLanes=n.childLanes,o.lanes=n.lanes,o.child=n.child,o.memoizedProps=n.memoizedProps,o.memoizedState=n.memoizedState,o.updateQueue=n.updateQueue,s=n.dependencies,o.dependencies=s===null?null:{lanes:s.lanes,firstContext:s.firstContext},o.sibling=n.sibling,o.index=n.index,o.ref=n.ref,o}function iu(n,s,o,u,m,_){var R=2;if(u=n,typeof n=="function")Qd(n)&&(R=1);else if(typeof n=="string")R=5;else e:switch(n){case U:return aa(o.children,m,_,s);case w:R=8,m|=8;break;case N:return n=Pi(12,o,s,m|2),n.elementType=N,n.lanes=_,n;case j:return n=Pi(13,o,s,m),n.elementType=j,n.lanes=_,n;case he:return n=Pi(19,o,s,m),n.elementType=he,n.lanes=_,n;case Q:return ru(o,m,_,s);default:if(typeof n=="object"&&n!==null)switch(n.$$typeof){case H:R=10;break e;case V:R=9;break e;case X:R=11;break e;case $:R=14;break e;case oe:R=16,u=null;break e}throw Error(t(130,n==null?n:typeof n,""))}return s=Pi(R,o,s,m),s.elementType=n,s.type=u,s.lanes=_,s}function aa(n,s,o,u){return n=Pi(7,n,u,s),n.lanes=o,n}function ru(n,s,o,u){return n=Pi(22,n,u,s),n.elementType=Q,n.lanes=o,n.stateNode={isHidden:!1},n}function Zd(n,s,o){return n=Pi(6,n,null,s),n.lanes=o,n}function Jd(n,s,o){return s=Pi(4,n.children!==null?n.children:[],n.key,s),s.lanes=o,s.stateNode={containerInfo:n.containerInfo,pendingChildren:null,implementation:n.implementation},s}function mM(n,s,o,u,m){this.tag=s,this.containerInfo=n,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=Nn(0),this.expirationTimes=Nn(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Nn(0),this.identifierPrefix=u,this.onRecoverableError=m,this.mutableSourceEagerHydrationData=null}function ef(n,s,o,u,m,_,R,z,W){return n=new mM(n,s,o,z,W),s===1?(s=1,_===!0&&(s|=8)):s=0,_=Pi(3,null,null,s),n.current=_,_.stateNode=n,_.memoizedState={element:u,isDehydrated:o,cache:null,transitions:null,pendingSuspenseBoundaries:null},fd(_),n}function gM(n,s,o){var u=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:L,key:u==null?null:""+u,children:n,containerInfo:s,implementation:o}}function sx(n){if(!n)return os;n=n._reactInternals;e:{if(Xn(n)!==n||n.tag!==1)throw Error(t(170));var s=n;do{switch(s.tag){case 3:s=s.stateNode.context;break e;case 1:if(ni(s.type)){s=s.stateNode.__reactInternalMemoizedMergedChildContext;break e}}s=s.return}while(s!==null);throw Error(t(171))}if(n.tag===1){var o=n.type;if(ni(o))return Dg(n,o,s)}return s}function ax(n,s,o,u,m,_,R,z,W){return n=ef(o,u,!0,n,m,_,R,z,W),n.context=sx(null),o=n.current,u=qn(),m=ps(o),_=Ar(u,m),_.callback=s??null,us(o,_,m),n.current.lanes=m,yt(n,m,u),si(n,u),n}function su(n,s,o,u){var m=s.current,_=qn(),R=ps(m);return o=sx(o),s.context===null?s.context=o:s.pendingContext=o,s=Ar(_,R),s.payload={element:n},u=u===void 0?null:u,u!==null&&(s.callback=u),n=us(m,s,R),n!==null&&(Gi(n,m,R,_),Fc(n,m,R)),R}function au(n){if(n=n.current,!n.child)return null;switch(n.child.tag){case 5:return n.child.stateNode;default:return n.child.stateNode}}function ox(n,s){if(n=n.memoizedState,n!==null&&n.dehydrated!==null){var o=n.retryLane;n.retryLane=o!==0&&o<s?o:s}}function tf(n,s){ox(n,s),(n=n.alternate)&&ox(n,s)}function xM(){return null}var lx=typeof reportError=="function"?reportError:function(n){console.error(n)};function nf(n){this._internalRoot=n}ou.prototype.render=nf.prototype.render=function(n){var s=this._internalRoot;if(s===null)throw Error(t(409));su(n,s,null,null)},ou.prototype.unmount=nf.prototype.unmount=function(){var n=this._internalRoot;if(n!==null){this._internalRoot=null;var s=n.containerInfo;ia(function(){su(null,n,null,null)}),s[wr]=null}};function ou(n){this._internalRoot=n}ou.prototype.unstable_scheduleHydration=function(n){if(n){var s=Ht();n={blockedOn:null,target:n,priority:s};for(var o=0;o<ns.length&&s!==0&&s<ns[o].priority;o++);ns.splice(o,0,n),o===0&&qm(n)}};function rf(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11)}function lu(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11&&(n.nodeType!==8||n.nodeValue!==" react-mount-point-unstable "))}function cx(){}function vM(n,s,o,u,m){if(m){if(typeof u=="function"){var _=u;u=function(){var me=au(R);_.call(me)}}var R=ax(s,u,n,0,null,!1,!1,"",cx);return n._reactRootContainer=R,n[wr]=R.current,ll(n.nodeType===8?n.parentNode:n),ia(),R}for(;m=n.lastChild;)n.removeChild(m);if(typeof u=="function"){var z=u;u=function(){var me=au(W);z.call(me)}}var W=ef(n,0,!1,null,null,!1,!1,"",cx);return n._reactRootContainer=W,n[wr]=W.current,ll(n.nodeType===8?n.parentNode:n),ia(function(){su(s,W,o,u)}),W}function cu(n,s,o,u,m){var _=o._reactRootContainer;if(_){var R=_;if(typeof m=="function"){var z=m;m=function(){var W=au(R);z.call(W)}}su(s,R,n,m)}else R=vM(o,s,n,m,u);return au(R)}Ot=function(n){switch(n.tag){case 3:var s=n.stateNode;if(s.current.memoizedState.isDehydrated){var o=At(s.pendingLanes);o!==0&&(ei(s,o|1),si(s,an()),(Pt&6)===0&&(Qa=an()+500,ls()))}break;case 13:ia(function(){var u=Rr(n,1);if(u!==null){var m=qn();Gi(u,n,1,m)}}),tf(n,1)}},Kt=function(n){if(n.tag===13){var s=Rr(n,134217728);if(s!==null){var o=qn();Gi(s,n,134217728,o)}tf(n,134217728)}},Fi=function(n){if(n.tag===13){var s=ps(n),o=Rr(n,s);if(o!==null){var u=qn();Gi(o,n,s,u)}tf(n,s)}},Ht=function(){return St},ki=function(n,s){var o=St;try{return St=n,s()}finally{St=o}},rt=function(n,s,o){switch(s){case"input":if(Zt(n,o),s=o.name,o.type==="radio"&&s!=null){for(o=n;o.parentNode;)o=o.parentNode;for(o=o.querySelectorAll("input[name="+JSON.stringify(""+s)+'][type="radio"]'),s=0;s<o.length;s++){var u=o[s];if(u!==n&&u.form===n.form){var m=Tc(u);if(!m)throw Error(t(90));jt(u),Zt(u,m)}}}break;case"textarea":Pn(n,o);break;case"select":s=o.value,s!=null&&Bt(n,!!o.multiple,s,!1)}},ze=qd,Me=ia;var _M={usingClientEntryPoint:!1,Events:[hl,Oa,Tc,ye,Fe,qd]},bl={findFiberByHostInstance:Ks,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},yM={bundleType:bl.bundleType,version:bl.version,rendererPackageName:bl.rendererPackageName,rendererConfig:bl.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:C.ReactCurrentDispatcher,findHostInstanceByFiber:function(n){return n=Xs(n),n===null?null:n.stateNode},findFiberByHostInstance:bl.findFiberByHostInstance||xM,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var uu=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!uu.isDisabled&&uu.supportsFiber)try{le=uu.inject(yM),Pe=uu}catch{}}return ai.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=_M,ai.createPortal=function(n,s){var o=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!rf(s))throw Error(t(200));return gM(n,s,null,o)},ai.createRoot=function(n,s){if(!rf(n))throw Error(t(299));var o=!1,u="",m=lx;return s!=null&&(s.unstable_strictMode===!0&&(o=!0),s.identifierPrefix!==void 0&&(u=s.identifierPrefix),s.onRecoverableError!==void 0&&(m=s.onRecoverableError)),s=ef(n,1,!1,null,null,o,!1,u,m),n[wr]=s.current,ll(n.nodeType===8?n.parentNode:n),new nf(s)},ai.findDOMNode=function(n){if(n==null)return null;if(n.nodeType===1)return n;var s=n._reactInternals;if(s===void 0)throw typeof n.render=="function"?Error(t(188)):(n=Object.keys(n).join(","),Error(t(268,n)));return n=Xs(s),n=n===null?null:n.stateNode,n},ai.flushSync=function(n){return ia(n)},ai.hydrate=function(n,s,o){if(!lu(s))throw Error(t(200));return cu(null,n,s,!0,o)},ai.hydrateRoot=function(n,s,o){if(!rf(n))throw Error(t(405));var u=o!=null&&o.hydratedSources||null,m=!1,_="",R=lx;if(o!=null&&(o.unstable_strictMode===!0&&(m=!0),o.identifierPrefix!==void 0&&(_=o.identifierPrefix),o.onRecoverableError!==void 0&&(R=o.onRecoverableError)),s=ax(s,null,n,1,o??null,m,!1,_,R),n[wr]=s.current,ll(n),u)for(n=0;n<u.length;n++)o=u[n],m=o._getVersion,m=m(o._source),s.mutableSourceEagerHydrationData==null?s.mutableSourceEagerHydrationData=[o,m]:s.mutableSourceEagerHydrationData.push(o,m);return new ou(s)},ai.render=function(n,s,o){if(!lu(s))throw Error(t(200));return cu(null,n,s,!1,o)},ai.unmountComponentAtNode=function(n){if(!lu(n))throw Error(t(40));return n._reactRootContainer?(ia(function(){cu(null,null,n,!1,function(){n._reactRootContainer=null,n[wr]=null})}),!0):!1},ai.unstable_batchedUpdates=qd,ai.unstable_renderSubtreeIntoContainer=function(n,s,o,u){if(!lu(o))throw Error(t(200));if(n==null||n._reactInternals===void 0)throw Error(t(38));return cu(n,s,o,!1,u)},ai.version="18.3.1-next-f1338f8080-20240426",ai}var vx;function PM(){if(vx)return lf.exports;vx=1;function i(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(i)}catch(e){console.error(e)}}return i(),lf.exports=AM(),lf.exports}var _x;function NM(){if(_x)return du;_x=1;var i=PM();return du.createRoot=i.createRoot,du.hydrateRoot=i.hydrateRoot,du}var LM=NM(),zo=class{constructor(){this.listeners=new Set,this.subscribe=this.subscribe.bind(this)}subscribe(i){return this.listeners.add(i),this.onSubscribe(),()=>{this.listeners.delete(i),this.onUnsubscribe()}}hasListeners(){return this.listeners.size>0}onSubscribe(){}onUnsubscribe(){}},xa,Rs,Mo,s_,DM=(s_=class extends zo{constructor(){super();it(this,xa);it(this,Rs);it(this,Mo);Ve(this,Mo,e=>{if(typeof window<"u"&&window.addEventListener){const t=()=>e();return window.addEventListener("visibilitychange",t,!1),()=>{window.removeEventListener("visibilitychange",t)}}})}onSubscribe(){G(this,Rs)||this.setEventListener(G(this,Mo))}onUnsubscribe(){var e;this.hasListeners()||((e=G(this,Rs))==null||e.call(this),Ve(this,Rs,void 0))}setEventListener(e){var t;Ve(this,Mo,e),(t=G(this,Rs))==null||t.call(this),Ve(this,Rs,e(r=>{typeof r=="boolean"?this.setFocused(r):this.onFocus()}))}setFocused(e){G(this,xa)!==e&&(Ve(this,xa,e),this.onFocus())}onFocus(){const e=this.isFocused();this.listeners.forEach(t=>{t(e)})}isFocused(){var e;return typeof G(this,xa)=="boolean"?G(this,xa):((e=globalThis.document)==null?void 0:e.visibilityState)!=="hidden"}},xa=new WeakMap,Rs=new WeakMap,Mo=new WeakMap,s_),pm=new DM,IM={setTimeout:(i,e)=>setTimeout(i,e),clearTimeout:i=>clearTimeout(i),setInterval:(i,e)=>setInterval(i,e),clearInterval:i=>clearInterval(i)},As,dm,a_,UM=(a_=class{constructor(){it(this,As,IM);it(this,dm,!1)}setTimeoutProvider(i){Ve(this,As,i)}setTimeout(i,e){return G(this,As).setTimeout(i,e)}clearTimeout(i){G(this,As).clearTimeout(i)}setInterval(i,e){return G(this,As).setInterval(i,e)}clearInterval(i){G(this,As).clearInterval(i)}},As=new WeakMap,dm=new WeakMap,a_),pa=new UM;function FM(i){setTimeout(i,0)}var kM=typeof window>"u"||"Deno"in globalThis;function Zn(){}function OM(i,e){return typeof i=="function"?i(e):i}function tp(i){return typeof i=="number"&&i>=0&&i!==1/0}function g_(i,e){return Math.max(i+(e||0)-Date.now(),0)}function Os(i,e){return typeof i=="function"?i(e):i}function yi(i,e){return typeof i=="function"?i(e):i}function yx(i,e){const{type:t="all",exact:r,fetchStatus:a,predicate:l,queryKey:c,stale:h}=i;if(c){if(r){if(e.queryHash!==mm(c,e.options))return!1}else if(!Hl(e.queryKey,c))return!1}if(t!=="all"){const d=e.isActive();if(t==="active"&&!d||t==="inactive"&&d)return!1}return!(typeof h=="boolean"&&e.isStale()!==h||a&&a!==e.state.fetchStatus||l&&!l(e))}function Sx(i,e){const{exact:t,status:r,predicate:a,mutationKey:l}=i;if(l){if(!e.options.mutationKey)return!1;if(t){if(Ta(e.options.mutationKey)!==Ta(l))return!1}else if(!Hl(e.options.mutationKey,l))return!1}return!(r&&e.state.status!==r||a&&!a(e))}function mm(i,e){return((e==null?void 0:e.queryKeyHashFn)||Ta)(i)}function Ta(i){return JSON.stringify(i,(e,t)=>np(t)?Object.keys(t).sort().reduce((r,a)=>(r[a]=t[a],r),{}):t)}function Hl(i,e){return i===e?!0:typeof i!=typeof e?!1:i&&e&&typeof i=="object"&&typeof e=="object"?Object.keys(e).every(t=>Hl(i[t],e[t])):!1}var zM=Object.prototype.hasOwnProperty;function x_(i,e,t=0){if(i===e)return i;if(t>500)return e;const r=Mx(i)&&Mx(e);if(!r&&!(np(i)&&np(e)))return e;const l=(r?i:Object.keys(i)).length,c=r?e:Object.keys(e),h=c.length,d=r?new Array(h):{};let f=0;for(let v=0;v<h;v++){const g=r?v:c[v],p=i[g],y=e[g];if(p===y){d[g]=p,(r?v<l:zM.call(i,g))&&f++;continue}if(p===null||y===null||typeof p!="object"||typeof y!="object"){d[g]=y;continue}const E=x_(p,y,t+1);d[g]=E,E===p&&f++}return l===h&&f===l?i:d}function th(i,e){if(!e||Object.keys(i).length!==Object.keys(e).length)return!1;for(const t in i)if(i[t]!==e[t])return!1;return!0}function Mx(i){return Array.isArray(i)&&i.length===Object.keys(i).length}function np(i){if(!Ex(i))return!1;const e=i.constructor;if(e===void 0)return!0;const t=e.prototype;return!(!Ex(t)||!t.hasOwnProperty("isPrototypeOf")||Object.getPrototypeOf(i)!==Object.prototype)}function Ex(i){return Object.prototype.toString.call(i)==="[object Object]"}function BM(i){return new Promise(e=>{pa.setTimeout(e,i)})}function ip(i,e,t){return typeof t.structuralSharing=="function"?t.structuralSharing(i,e):t.structuralSharing!==!1?x_(i,e):e}function VM(i,e,t=0){const r=[...i,e];return t&&r.length>t?r.slice(1):r}function HM(i,e,t=0){const r=[e,...i];return t&&r.length>t?r.slice(0,-1):r}var gm=Symbol();function v_(i,e){return!i.queryFn&&(e!=null&&e.initialPromise)?()=>e.initialPromise:!i.queryFn||i.queryFn===gm?()=>Promise.reject(new Error(`Missing queryFn: '${i.queryHash}'`)):i.queryFn}function xm(i,e){return typeof i=="function"?i(...e):!!i}function GM(i,e,t){let r=!1,a;return Object.defineProperty(i,"signal",{enumerable:!0,get:()=>(a??(a=e()),r||(r=!0,a.aborted?t():a.addEventListener("abort",t,{once:!0})),a)}),i}var Gl=(()=>{let i=()=>kM;return{isServer(){return i()},setIsServer(e){i=e}}})();function rp(){let i,e;const t=new Promise((a,l)=>{i=a,e=l});t.status="pending",t.catch(()=>{});function r(a){Object.assign(t,a),delete t.resolve,delete t.reject}return t.resolve=a=>{r({status:"fulfilled",value:a}),i(a)},t.reject=a=>{r({status:"rejected",reason:a}),e(a)},t}var jM=FM;function WM(){let i=[],e=0,t=h=>{h()},r=h=>{h()},a=jM;const l=h=>{e?i.push(h):a(()=>{t(h)})},c=()=>{const h=i;i=[],h.length&&a(()=>{r(()=>{h.forEach(d=>{t(d)})})})};return{batch:h=>{let d;e++;try{d=h()}finally{e--,e||c()}return d},batchCalls:h=>(...d)=>{l(()=>{h(...d)})},schedule:l,setNotifyFunction:h=>{t=h},setBatchNotifyFunction:h=>{r=h},setScheduler:h=>{a=h}}}var Sn=WM(),Eo,Ps,wo,o_,XM=(o_=class extends zo{constructor(){super();it(this,Eo,!0);it(this,Ps);it(this,wo);Ve(this,wo,e=>{if(typeof window<"u"&&window.addEventListener){const t=()=>e(!0),r=()=>e(!1);return window.addEventListener("online",t,!1),window.addEventListener("offline",r,!1),()=>{window.removeEventListener("online",t),window.removeEventListener("offline",r)}}})}onSubscribe(){G(this,Ps)||this.setEventListener(G(this,wo))}onUnsubscribe(){var e;this.hasListeners()||((e=G(this,Ps))==null||e.call(this),Ve(this,Ps,void 0))}setEventListener(e){var t;Ve(this,wo,e),(t=G(this,Ps))==null||t.call(this),Ve(this,Ps,e(this.setOnline.bind(this)))}setOnline(e){G(this,Eo)!==e&&(Ve(this,Eo,e),this.listeners.forEach(r=>{r(e)}))}isOnline(){return G(this,Eo)}},Eo=new WeakMap,Ps=new WeakMap,wo=new WeakMap,o_),nh=new XM;function $M(i){return Math.min(1e3*2**i,3e4)}function __(i){return(i??"online")==="online"?nh.isOnline():!0}var sp=class extends Error{constructor(i){super("CancelledError"),this.revert=i==null?void 0:i.revert,this.silent=i==null?void 0:i.silent}};function y_(i){let e=!1,t=0,r;const a=rp(),l=()=>a.status!=="pending",c=b=>{var M;if(!l()){const S=new sp(b);p(S),(M=i.onCancel)==null||M.call(i,S)}},h=()=>{e=!0},d=()=>{e=!1},f=()=>pm.isFocused()&&(i.networkMode==="always"||nh.isOnline())&&i.canRun(),v=()=>__(i.networkMode)&&i.canRun(),g=b=>{l()||(r==null||r(),a.resolve(b))},p=b=>{l()||(r==null||r(),a.reject(b))},y=()=>new Promise(b=>{var M;r=S=>{(l()||f())&&b(S)},(M=i.onPause)==null||M.call(i)}).then(()=>{var b;r=void 0,l()||(b=i.onContinue)==null||b.call(i)}),E=()=>{if(l())return;let b;const M=t===0?i.initialPromise:void 0;try{b=M??i.fn()}catch(S){b=Promise.reject(S)}Promise.resolve(b).then(g).catch(S=>{var L;if(l())return;const A=i.retry??(Gl.isServer()?0:3),D=i.retryDelay??$M,C=typeof D=="function"?D(t,S):D,I=A===!0||typeof A=="number"&&t<A||typeof A=="function"&&A(t,S);if(e||!I){p(S);return}t++,(L=i.onFail)==null||L.call(i,t,S),BM(C).then(()=>f()?void 0:y()).then(()=>{e?p(S):E()})})};return{promise:a,status:()=>a.status,cancel:c,continue:()=>(r==null||r(),a),cancelRetry:h,continueRetry:d,canStart:v,start:()=>(v()?E():y().then(E),a)}}var va,l_,S_=(l_=class{constructor(){it(this,va)}destroy(){this.clearGcTimeout()}scheduleGc(){this.clearGcTimeout(),tp(this.gcTime)&&Ve(this,va,pa.setTimeout(()=>{this.optionalRemove()},this.gcTime))}updateGcTime(i){this.gcTime=Math.max(this.gcTime||0,i??(Gl.isServer()?1/0:300*1e3))}clearGcTimeout(){G(this,va)!==void 0&&(pa.clearTimeout(G(this,va)),Ve(this,va,void 0))}},va=new WeakMap,l_);function qM(i){return{onFetch:(e,t)=>{var v,g,p,y,E;const r=e.options,a=(p=(g=(v=e.fetchOptions)==null?void 0:v.meta)==null?void 0:g.fetchMore)==null?void 0:p.direction,l=((y=e.state.data)==null?void 0:y.pages)||[],c=((E=e.state.data)==null?void 0:E.pageParams)||[];let h={pages:[],pageParams:[]},d=0;const f=async()=>{let b=!1;const M=D=>{GM(D,()=>e.signal,()=>b=!0)},S=v_(e.options,e.fetchOptions),A=async(D,C,I)=>{if(b)return Promise.reject(e.signal.reason);if(C==null&&D.pages.length)return Promise.resolve(D);const U=(()=>{const V={client:e.client,queryKey:e.queryKey,pageParam:C,direction:I?"backward":"forward",meta:e.options.meta};return M(V),V})(),w=await S(U),{maxPages:N}=e.options,H=I?HM:VM;return{pages:H(D.pages,w,N),pageParams:H(D.pageParams,C,N)}};if(a&&l.length){const D=a==="backward",C=D?KM:wx,I={pages:l,pageParams:c},L=C(r,I);h=await A(I,L,D)}else{const D=i??l.length;do{const C=d===0?c[0]??r.initialPageParam:wx(r,h);if(d>0&&C==null)break;h=await A(h,C),d++}while(d<D)}return h};e.options.persister?e.fetchFn=()=>{var b,M;return(M=(b=e.options).persister)==null?void 0:M.call(b,f,{client:e.client,queryKey:e.queryKey,meta:e.options.meta,signal:e.signal},t)}:e.fetchFn=f}}}function wx(i,{pages:e,pageParams:t}){const r=e.length-1;return e.length>0?i.getNextPageParam(e[r],e,t[r],t):void 0}function KM(i,{pages:e,pageParams:t}){var r;return e.length>0?(r=i.getPreviousPageParam)==null?void 0:r.call(i,e[0],e,t[0],t):void 0}var bo,_a,To,Di,ya,Rn,Yl,Sa,_i,M_,Or,c_,YM=(c_=class extends S_{constructor(e){super();it(this,_i);it(this,bo);it(this,_a);it(this,To);it(this,Di);it(this,ya);it(this,Rn);it(this,Yl);it(this,Sa);Ve(this,Sa,!1),Ve(this,Yl,e.defaultOptions),this.setOptions(e.options),this.observers=[],Ve(this,ya,e.client),Ve(this,Di,G(this,ya).getQueryCache()),this.queryKey=e.queryKey,this.queryHash=e.queryHash,Ve(this,_a,Tx(this.options)),this.state=e.state??G(this,_a),this.scheduleGc()}get meta(){return this.options.meta}get queryType(){return G(this,bo)}get promise(){var e;return(e=G(this,Rn))==null?void 0:e.promise}setOptions(e){if(this.options={...G(this,Yl),...e},e!=null&&e._type&&Ve(this,bo,e._type),this.updateGcTime(this.options.gcTime),this.state&&this.state.data===void 0){const t=Tx(this.options);t.data!==void 0&&(this.setState(bx(t.data,t.dataUpdatedAt)),Ve(this,_a,t))}}optionalRemove(){!this.observers.length&&this.state.fetchStatus==="idle"&&G(this,Di).remove(this)}setData(e,t){const r=ip(this.state.data,e,this.options);return xt(this,_i,Or).call(this,{data:r,type:"success",dataUpdatedAt:t==null?void 0:t.updatedAt,manual:t==null?void 0:t.manual}),r}setState(e){xt(this,_i,Or).call(this,{type:"setState",state:e})}cancel(e){var r,a;const t=(r=G(this,Rn))==null?void 0:r.promise;return(a=G(this,Rn))==null||a.cancel(e),t?t.then(Zn).catch(Zn):Promise.resolve()}destroy(){super.destroy(),this.cancel({silent:!0})}get resetState(){return G(this,_a)}reset(){this.destroy(),this.setState(this.resetState)}isActive(){return this.observers.some(e=>yi(e.options.enabled,this)!==!1)}isDisabled(){return this.getObserversCount()>0?!this.isActive():this.options.queryFn===gm||!this.isFetched()}isFetched(){return this.state.dataUpdateCount+this.state.errorUpdateCount>0}isStatic(){return this.getObserversCount()>0?this.observers.some(e=>Os(e.options.staleTime,this)==="static"):!1}isStale(){return this.getObserversCount()>0?this.observers.some(e=>e.getCurrentResult().isStale):this.state.data===void 0||this.state.isInvalidated}isStaleByTime(e=0){return this.state.data===void 0?!0:e==="static"?!1:this.state.isInvalidated?!0:!g_(this.state.dataUpdatedAt,e)}onFocus(){var t;const e=this.observers.find(r=>r.shouldFetchOnWindowFocus());e==null||e.refetch({cancelRefetch:!1}),(t=G(this,Rn))==null||t.continue()}onOnline(){var t;const e=this.observers.find(r=>r.shouldFetchOnReconnect());e==null||e.refetch({cancelRefetch:!1}),(t=G(this,Rn))==null||t.continue()}addObserver(e){this.observers.includes(e)||(this.observers.push(e),this.clearGcTimeout(),G(this,Di).notify({type:"observerAdded",query:this,observer:e}))}removeObserver(e){this.observers.includes(e)&&(this.observers=this.observers.filter(t=>t!==e),this.observers.length||(G(this,Rn)&&(G(this,Sa)||xt(this,_i,M_).call(this)?G(this,Rn).cancel({revert:!0}):G(this,Rn).cancelRetry()),this.scheduleGc()),G(this,Di).notify({type:"observerRemoved",query:this,observer:e}))}getObserversCount(){return this.observers.length}invalidate(){this.state.isInvalidated||xt(this,_i,Or).call(this,{type:"invalidate"})}async fetch(e,t){var f,v,g,p,y,E,b,M,S,A,D;if(this.state.fetchStatus!=="idle"&&((f=G(this,Rn))==null?void 0:f.status())!=="rejected"){if(this.state.data!==void 0&&(t!=null&&t.cancelRefetch))this.cancel({silent:!0});else if(G(this,Rn))return G(this,Rn).continueRetry(),G(this,Rn).promise}if(e&&this.setOptions(e),!this.options.queryFn){const C=this.observers.find(I=>I.options.queryFn);C&&this.setOptions(C.options)}const r=new AbortController,a=C=>{Object.defineProperty(C,"signal",{enumerable:!0,get:()=>(Ve(this,Sa,!0),r.signal)})},l=()=>{const C=v_(this.options,t),L=(()=>{const U={client:G(this,ya),queryKey:this.queryKey,meta:this.meta};return a(U),U})();return Ve(this,Sa,!1),this.options.persister?this.options.persister(C,L,this):C(L)},h=(()=>{const C={fetchOptions:t,options:this.options,queryKey:this.queryKey,client:G(this,ya),state:this.state,fetchFn:l};return a(C),C})(),d=G(this,bo)==="infinite"?qM(this.options.pages):this.options.behavior;d==null||d.onFetch(h,this),Ve(this,To,this.state),(this.state.fetchStatus==="idle"||this.state.fetchMeta!==((v=h.fetchOptions)==null?void 0:v.meta))&&xt(this,_i,Or).call(this,{type:"fetch",meta:(g=h.fetchOptions)==null?void 0:g.meta}),Ve(this,Rn,y_({initialPromise:t==null?void 0:t.initialPromise,fn:h.fetchFn,onCancel:C=>{C instanceof sp&&C.revert&&this.setState({...G(this,To),fetchStatus:"idle"}),r.abort()},onFail:(C,I)=>{xt(this,_i,Or).call(this,{type:"failed",failureCount:C,error:I})},onPause:()=>{xt(this,_i,Or).call(this,{type:"pause"})},onContinue:()=>{xt(this,_i,Or).call(this,{type:"continue"})},retry:h.options.retry,retryDelay:h.options.retryDelay,networkMode:h.options.networkMode,canRun:()=>!0}));try{const C=await G(this,Rn).start();if(C===void 0)throw new Error(`${this.queryHash} data is undefined`);return this.setData(C),(y=(p=G(this,Di).config).onSuccess)==null||y.call(p,C,this),(b=(E=G(this,Di).config).onSettled)==null||b.call(E,C,this.state.error,this),C}catch(C){if(C instanceof sp){if(C.silent)return G(this,Rn).promise;if(C.revert){if(this.state.data===void 0)throw C;return this.state.data}}throw xt(this,_i,Or).call(this,{type:"error",error:C}),(S=(M=G(this,Di).config).onError)==null||S.call(M,C,this),(D=(A=G(this,Di).config).onSettled)==null||D.call(A,this.state.data,C,this),C}finally{this.scheduleGc()}}},bo=new WeakMap,_a=new WeakMap,To=new WeakMap,Di=new WeakMap,ya=new WeakMap,Rn=new WeakMap,Yl=new WeakMap,Sa=new WeakMap,_i=new WeakSet,M_=function(){return this.state.fetchStatus==="paused"&&this.state.status==="pending"},Or=function(e){const t=r=>{switch(e.type){case"failed":return{...r,fetchFailureCount:e.failureCount,fetchFailureReason:e.error};case"pause":return{...r,fetchStatus:"paused"};case"continue":return{...r,fetchStatus:"fetching"};case"fetch":return{...r,...E_(r.data,this.options),fetchMeta:e.meta??null};case"success":const a={...r,...bx(e.data,e.dataUpdatedAt),dataUpdateCount:r.dataUpdateCount+1,...!e.manual&&{fetchStatus:"idle",fetchFailureCount:0,fetchFailureReason:null}};return Ve(this,To,e.manual?a:void 0),a;case"error":const l=e.error;return{...r,error:l,errorUpdateCount:r.errorUpdateCount+1,errorUpdatedAt:Date.now(),fetchFailureCount:r.fetchFailureCount+1,fetchFailureReason:l,fetchStatus:"idle",status:"error",isInvalidated:!0};case"invalidate":return{...r,isInvalidated:!0};case"setState":return{...r,...e.state}}};this.state=t(this.state),Sn.batch(()=>{this.observers.forEach(r=>{r.onQueryUpdate()}),G(this,Di).notify({query:this,type:"updated",action:e})})},c_);function E_(i,e){return{fetchFailureCount:0,fetchFailureReason:null,fetchStatus:__(e.networkMode)?"fetching":"paused",...i===void 0&&{error:null,status:"pending"}}}function bx(i,e){return{data:i,dataUpdatedAt:e??Date.now(),error:null,isInvalidated:!1,status:"success"}}function Tx(i){const e=typeof i.initialData=="function"?i.initialData():i.initialData,t=e!==void 0,r=t?typeof i.initialDataUpdatedAt=="function"?i.initialDataUpdatedAt():i.initialDataUpdatedAt:0;return{data:e,dataUpdateCount:0,dataUpdatedAt:t?r??Date.now():0,error:null,errorUpdateCount:0,errorUpdatedAt:0,fetchFailureCount:0,fetchFailureReason:null,fetchMeta:null,isInvalidated:!1,status:t?"success":"pending",fetchStatus:"idle"}}var ci,bt,Ql,Qn,Ma,Co,zr,Ns,Zl,Ro,Ao,Ea,wa,Ls,Po,zt,Fl,ap,op,lp,cp,up,hp,dp,w_,u_,QM=(u_=class extends zo{constructor(e,t){super();it(this,zt);it(this,ci);it(this,bt);it(this,Ql);it(this,Qn);it(this,Ma);it(this,Co);it(this,zr);it(this,Ns);it(this,Zl);it(this,Ro);it(this,Ao);it(this,Ea);it(this,wa);it(this,Ls);it(this,Po,new Set);this.options=t,Ve(this,ci,e),Ve(this,Ns,null),Ve(this,zr,rp()),this.bindMethods(),this.setOptions(t)}bindMethods(){this.refetch=this.refetch.bind(this)}onSubscribe(){this.listeners.size===1&&(G(this,bt).addObserver(this),Cx(G(this,bt),this.options)?xt(this,zt,Fl).call(this):this.updateResult(),xt(this,zt,cp).call(this))}onUnsubscribe(){this.hasListeners()||this.destroy()}shouldFetchOnReconnect(){return fp(G(this,bt),this.options,this.options.refetchOnReconnect)}shouldFetchOnWindowFocus(){return fp(G(this,bt),this.options,this.options.refetchOnWindowFocus)}destroy(){this.listeners=new Set,xt(this,zt,up).call(this),xt(this,zt,hp).call(this),G(this,bt).removeObserver(this)}setOptions(e){const t=this.options,r=G(this,bt);if(this.options=G(this,ci).defaultQueryOptions(e),this.options.enabled!==void 0&&typeof this.options.enabled!="boolean"&&typeof this.options.enabled!="function"&&typeof yi(this.options.enabled,G(this,bt))!="boolean")throw new Error("Expected enabled to be a boolean or a callback that returns a boolean");xt(this,zt,dp).call(this),G(this,bt).setOptions(this.options),t._defaulted&&!th(this.options,t)&&G(this,ci).getQueryCache().notify({type:"observerOptionsUpdated",query:G(this,bt),observer:this});const a=this.hasListeners();a&&Rx(G(this,bt),r,this.options,t)&&xt(this,zt,Fl).call(this),this.updateResult(),a&&(G(this,bt)!==r||yi(this.options.enabled,G(this,bt))!==yi(t.enabled,G(this,bt))||Os(this.options.staleTime,G(this,bt))!==Os(t.staleTime,G(this,bt)))&&xt(this,zt,ap).call(this);const l=xt(this,zt,op).call(this);a&&(G(this,bt)!==r||yi(this.options.enabled,G(this,bt))!==yi(t.enabled,G(this,bt))||l!==G(this,Ls))&&xt(this,zt,lp).call(this,l)}getOptimisticResult(e){const t=G(this,ci).getQueryCache().build(G(this,ci),e),r=this.createResult(t,e);return JM(this,r)&&(Ve(this,Qn,r),Ve(this,Co,this.options),Ve(this,Ma,G(this,bt).state)),r}getCurrentResult(){return G(this,Qn)}trackResult(e,t){return new Proxy(e,{get:(r,a)=>(this.trackProp(a),t==null||t(a),a==="promise"&&(this.trackProp("data"),!this.options.experimental_prefetchInRender&&G(this,zr).status==="pending"&&G(this,zr).reject(new Error("experimental_prefetchInRender feature flag is not enabled"))),Reflect.get(r,a))})}trackProp(e){G(this,Po).add(e)}getCurrentQuery(){return G(this,bt)}refetch({...e}={}){return this.fetch({...e})}fetchOptimistic(e){const t=G(this,ci).defaultQueryOptions(e),r=G(this,ci).getQueryCache().build(G(this,ci),t);return r.fetch().then(()=>this.createResult(r,t))}fetch(e){return xt(this,zt,Fl).call(this,{...e,cancelRefetch:e.cancelRefetch??!0}).then(()=>(this.updateResult(),G(this,Qn)))}createResult(e,t){var N;const r=G(this,bt),a=this.options,l=G(this,Qn),c=G(this,Ma),h=G(this,Co),f=e!==r?e.state:G(this,Ql),{state:v}=e;let g={...v},p=!1,y;if(t._optimisticResults){const H=this.hasListeners(),V=!H&&Cx(e,t),X=H&&Rx(e,r,t,a);(V||X)&&(g={...g,...E_(v.data,e.options)}),t._optimisticResults==="isRestoring"&&(g.fetchStatus="idle")}let{error:E,errorUpdatedAt:b,status:M}=g;y=g.data;let S=!1;if(t.placeholderData!==void 0&&y===void 0&&M==="pending"){let H;l!=null&&l.isPlaceholderData&&t.placeholderData===(h==null?void 0:h.placeholderData)?(H=l.data,S=!0):H=typeof t.placeholderData=="function"?t.placeholderData((N=G(this,Ao))==null?void 0:N.state.data,G(this,Ao)):t.placeholderData,H!==void 0&&(M="success",y=ip(l==null?void 0:l.data,H,t),p=!0)}if(t.select&&y!==void 0&&!S)if(l&&y===(c==null?void 0:c.data)&&t.select===G(this,Zl))y=G(this,Ro);else try{Ve(this,Zl,t.select),y=t.select(y),y=ip(l==null?void 0:l.data,y,t),Ve(this,Ro,y),Ve(this,Ns,null)}catch(H){Ve(this,Ns,H)}G(this,Ns)&&(E=G(this,Ns),y=G(this,Ro),b=Date.now(),M="error");const A=g.fetchStatus==="fetching",D=M==="pending",C=M==="error",I=D&&A,L=y!==void 0,w={status:M,fetchStatus:g.fetchStatus,isPending:D,isSuccess:M==="success",isError:C,isInitialLoading:I,isLoading:I,data:y,dataUpdatedAt:g.dataUpdatedAt,error:E,errorUpdatedAt:b,failureCount:g.fetchFailureCount,failureReason:g.fetchFailureReason,errorUpdateCount:g.errorUpdateCount,isFetched:e.isFetched(),isFetchedAfterMount:g.dataUpdateCount>f.dataUpdateCount||g.errorUpdateCount>f.errorUpdateCount,isFetching:A,isRefetching:A&&!D,isLoadingError:C&&!L,isPaused:g.fetchStatus==="paused",isPlaceholderData:p,isRefetchError:C&&L,isStale:vm(e,t),refetch:this.refetch,promise:G(this,zr),isEnabled:yi(t.enabled,e)!==!1};if(this.options.experimental_prefetchInRender){const H=w.data!==void 0,V=w.status==="error"&&!H,X=$=>{V?$.reject(w.error):H&&$.resolve(w.data)},j=()=>{const $=Ve(this,zr,w.promise=rp());X($)},he=G(this,zr);switch(he.status){case"pending":e.queryHash===r.queryHash&&X(he);break;case"fulfilled":(V||w.data!==he.value)&&j();break;case"rejected":(!V||w.error!==he.reason)&&j();break}}return w}updateResult(){const e=G(this,Qn),t=this.createResult(G(this,bt),this.options);if(Ve(this,Ma,G(this,bt).state),Ve(this,Co,this.options),G(this,Ma).data!==void 0&&Ve(this,Ao,G(this,bt)),th(t,e))return;Ve(this,Qn,t);const r=()=>{if(!e)return!0;const{notifyOnChangeProps:a}=this.options,l=typeof a=="function"?a():a;if(l==="all"||!l&&!G(this,Po).size)return!0;const c=new Set(l??G(this,Po));return this.options.throwOnError&&c.add("error"),Object.keys(G(this,Qn)).some(h=>{const d=h;return G(this,Qn)[d]!==e[d]&&c.has(d)})};xt(this,zt,w_).call(this,{listeners:r()})}onQueryUpdate(){this.updateResult(),this.hasListeners()&&xt(this,zt,cp).call(this)}},ci=new WeakMap,bt=new WeakMap,Ql=new WeakMap,Qn=new WeakMap,Ma=new WeakMap,Co=new WeakMap,zr=new WeakMap,Ns=new WeakMap,Zl=new WeakMap,Ro=new WeakMap,Ao=new WeakMap,Ea=new WeakMap,wa=new WeakMap,Ls=new WeakMap,Po=new WeakMap,zt=new WeakSet,Fl=function(e){xt(this,zt,dp).call(this);let t=G(this,bt).fetch(this.options,e);return e!=null&&e.throwOnError||(t=t.catch(Zn)),t},ap=function(){xt(this,zt,up).call(this);const e=Os(this.options.staleTime,G(this,bt));if(Gl.isServer()||G(this,Qn).isStale||!tp(e))return;const r=g_(G(this,Qn).dataUpdatedAt,e)+1;Ve(this,Ea,pa.setTimeout(()=>{G(this,Qn).isStale||this.updateResult()},r))},op=function(){return(typeof this.options.refetchInterval=="function"?this.options.refetchInterval(G(this,bt)):this.options.refetchInterval)??!1},lp=function(e){xt(this,zt,hp).call(this),Ve(this,Ls,e),!(Gl.isServer()||yi(this.options.enabled,G(this,bt))===!1||!tp(G(this,Ls))||G(this,Ls)===0)&&Ve(this,wa,pa.setInterval(()=>{(this.options.refetchIntervalInBackground||pm.isFocused())&&xt(this,zt,Fl).call(this)},G(this,Ls)))},cp=function(){xt(this,zt,ap).call(this),xt(this,zt,lp).call(this,xt(this,zt,op).call(this))},up=function(){G(this,Ea)!==void 0&&(pa.clearTimeout(G(this,Ea)),Ve(this,Ea,void 0))},hp=function(){G(this,wa)!==void 0&&(pa.clearInterval(G(this,wa)),Ve(this,wa,void 0))},dp=function(){const e=G(this,ci).getQueryCache().build(G(this,ci),this.options);if(e===G(this,bt))return;const t=G(this,bt);Ve(this,bt,e),Ve(this,Ql,e.state),this.hasListeners()&&(t==null||t.removeObserver(this),e.addObserver(this))},w_=function(e){Sn.batch(()=>{e.listeners&&this.listeners.forEach(t=>{t(G(this,Qn))}),G(this,ci).getQueryCache().notify({query:G(this,bt),type:"observerResultsUpdated"})})},u_);function ZM(i,e){return yi(e.enabled,i)!==!1&&i.state.data===void 0&&!(i.state.status==="error"&&yi(e.retryOnMount,i)===!1)}function Cx(i,e){return ZM(i,e)||i.state.data!==void 0&&fp(i,e,e.refetchOnMount)}function fp(i,e,t){if(yi(e.enabled,i)!==!1&&Os(e.staleTime,i)!=="static"){const r=typeof t=="function"?t(i):t;return r==="always"||r!==!1&&vm(i,e)}return!1}function Rx(i,e,t,r){return(i!==e||yi(r.enabled,i)===!1)&&(!t.suspense||i.state.status!=="error")&&vm(i,t)}function vm(i,e){return yi(e.enabled,i)!==!1&&i.isStaleByTime(Os(e.staleTime,i))}function JM(i,e){return!th(i.getCurrentResult(),e)}var Jl,lr,Gn,ba,cr,bs,h_,eE=(h_=class extends S_{constructor(e){super();it(this,cr);it(this,Jl);it(this,lr);it(this,Gn);it(this,ba);Ve(this,Jl,e.client),this.mutationId=e.mutationId,Ve(this,Gn,e.mutationCache),Ve(this,lr,[]),this.state=e.state||b_(),this.setOptions(e.options),this.scheduleGc()}setOptions(e){this.options=e,this.updateGcTime(this.options.gcTime)}get meta(){return this.options.meta}addObserver(e){G(this,lr).includes(e)||(G(this,lr).push(e),this.clearGcTimeout(),G(this,Gn).notify({type:"observerAdded",mutation:this,observer:e}))}removeObserver(e){Ve(this,lr,G(this,lr).filter(t=>t!==e)),this.scheduleGc(),G(this,Gn).notify({type:"observerRemoved",mutation:this,observer:e})}optionalRemove(){G(this,lr).length||(this.state.status==="pending"?this.scheduleGc():G(this,Gn).remove(this))}continue(){var e;return((e=G(this,ba))==null?void 0:e.continue())??this.execute(this.state.variables)}async execute(e){var c,h,d,f,v,g,p,y,E,b,M,S,A,D,C,I,L,U;const t=()=>{xt(this,cr,bs).call(this,{type:"continue"})},r={client:G(this,Jl),meta:this.options.meta,mutationKey:this.options.mutationKey};Ve(this,ba,y_({fn:()=>this.options.mutationFn?this.options.mutationFn(e,r):Promise.reject(new Error("No mutationFn found")),onFail:(w,N)=>{xt(this,cr,bs).call(this,{type:"failed",failureCount:w,error:N})},onPause:()=>{xt(this,cr,bs).call(this,{type:"pause"})},onContinue:t,retry:this.options.retry??0,retryDelay:this.options.retryDelay,networkMode:this.options.networkMode,canRun:()=>G(this,Gn).canRun(this)}));const a=this.state.status==="pending",l=!G(this,ba).canStart();try{if(a)t();else{xt(this,cr,bs).call(this,{type:"pending",variables:e,isPaused:l}),G(this,Gn).config.onMutate&&await G(this,Gn).config.onMutate(e,this,r);const N=await((h=(c=this.options).onMutate)==null?void 0:h.call(c,e,r));N!==this.state.context&&xt(this,cr,bs).call(this,{type:"pending",context:N,variables:e,isPaused:l})}const w=await G(this,ba).start();return await((f=(d=G(this,Gn).config).onSuccess)==null?void 0:f.call(d,w,e,this.state.context,this,r)),await((g=(v=this.options).onSuccess)==null?void 0:g.call(v,w,e,this.state.context,r)),await((y=(p=G(this,Gn).config).onSettled)==null?void 0:y.call(p,w,null,this.state.variables,this.state.context,this,r)),await((b=(E=this.options).onSettled)==null?void 0:b.call(E,w,null,e,this.state.context,r)),xt(this,cr,bs).call(this,{type:"success",data:w}),w}catch(w){try{await((S=(M=G(this,Gn).config).onError)==null?void 0:S.call(M,w,e,this.state.context,this,r))}catch(N){Promise.reject(N)}try{await((D=(A=this.options).onError)==null?void 0:D.call(A,w,e,this.state.context,r))}catch(N){Promise.reject(N)}try{await((I=(C=G(this,Gn).config).onSettled)==null?void 0:I.call(C,void 0,w,this.state.variables,this.state.context,this,r))}catch(N){Promise.reject(N)}try{await((U=(L=this.options).onSettled)==null?void 0:U.call(L,void 0,w,e,this.state.context,r))}catch(N){Promise.reject(N)}throw xt(this,cr,bs).call(this,{type:"error",error:w}),w}finally{G(this,Gn).runNext(this)}}},Jl=new WeakMap,lr=new WeakMap,Gn=new WeakMap,ba=new WeakMap,cr=new WeakSet,bs=function(e){const t=r=>{switch(e.type){case"failed":return{...r,failureCount:e.failureCount,failureReason:e.error};case"pause":return{...r,isPaused:!0};case"continue":return{...r,isPaused:!1};case"pending":return{...r,context:e.context,data:void 0,failureCount:0,failureReason:null,error:null,isPaused:e.isPaused,status:"pending",variables:e.variables,submittedAt:Date.now()};case"success":return{...r,data:e.data,failureCount:0,failureReason:null,error:null,status:"success",isPaused:!1};case"error":return{...r,data:void 0,error:e.error,failureCount:r.failureCount+1,failureReason:e.error,isPaused:!1,status:"error"}}};this.state=t(this.state),Sn.batch(()=>{G(this,lr).forEach(r=>{r.onMutationUpdate(e)}),G(this,Gn).notify({mutation:this,type:"updated",action:e})})},h_);function b_(){return{context:void 0,data:void 0,error:null,failureCount:0,failureReason:null,isPaused:!1,status:"idle",variables:void 0,submittedAt:0}}var Br,$i,ec,d_,tE=(d_=class extends zo{constructor(e={}){super();it(this,Br);it(this,$i);it(this,ec);this.config=e,Ve(this,Br,new Set),Ve(this,$i,new Map),Ve(this,ec,0)}build(e,t,r){const a=new eE({client:e,mutationCache:this,mutationId:++hu(this,ec)._,options:e.defaultMutationOptions(t),state:r});return this.add(a),a}add(e){G(this,Br).add(e);const t=fu(e);if(typeof t=="string"){const r=G(this,$i).get(t);r?r.push(e):G(this,$i).set(t,[e])}this.notify({type:"added",mutation:e})}remove(e){if(G(this,Br).delete(e)){const t=fu(e);if(typeof t=="string"){const r=G(this,$i).get(t);if(r)if(r.length>1){const a=r.indexOf(e);a!==-1&&r.splice(a,1)}else r[0]===e&&G(this,$i).delete(t)}}this.notify({type:"removed",mutation:e})}canRun(e){const t=fu(e);if(typeof t=="string"){const r=G(this,$i).get(t),a=r==null?void 0:r.find(l=>l.state.status==="pending");return!a||a===e}else return!0}runNext(e){var r;const t=fu(e);if(typeof t=="string"){const a=(r=G(this,$i).get(t))==null?void 0:r.find(l=>l!==e&&l.state.isPaused);return(a==null?void 0:a.continue())??Promise.resolve()}else return Promise.resolve()}clear(){Sn.batch(()=>{G(this,Br).forEach(e=>{this.notify({type:"removed",mutation:e})}),G(this,Br).clear(),G(this,$i).clear()})}getAll(){return Array.from(G(this,Br))}find(e){const t={exact:!0,...e};return this.getAll().find(r=>Sx(t,r))}findAll(e={}){return this.getAll().filter(t=>Sx(e,t))}notify(e){Sn.batch(()=>{this.listeners.forEach(t=>{t(e)})})}resumePausedMutations(){const e=this.getAll().filter(t=>t.state.isPaused);return Sn.batch(()=>Promise.all(e.map(t=>t.continue().catch(Zn))))}},Br=new WeakMap,$i=new WeakMap,ec=new WeakMap,d_);function fu(i){var e;return(e=i.options.scope)==null?void 0:e.id}var Vr,Ds,ui,Hr,qr,ju,pp,f_,nE=(f_=class extends zo{constructor(t,r){super();it(this,qr);it(this,Vr);it(this,Ds);it(this,ui);it(this,Hr);Ve(this,Vr,t),this.setOptions(r),this.bindMethods(),xt(this,qr,ju).call(this)}bindMethods(){this.mutate=this.mutate.bind(this),this.reset=this.reset.bind(this)}setOptions(t){var a;const r=this.options;this.options=G(this,Vr).defaultMutationOptions(t),th(this.options,r)||G(this,Vr).getMutationCache().notify({type:"observerOptionsUpdated",mutation:G(this,ui),observer:this}),r!=null&&r.mutationKey&&this.options.mutationKey&&Ta(r.mutationKey)!==Ta(this.options.mutationKey)?this.reset():((a=G(this,ui))==null?void 0:a.state.status)==="pending"&&G(this,ui).setOptions(this.options)}onUnsubscribe(){var t;this.hasListeners()||(t=G(this,ui))==null||t.removeObserver(this)}onMutationUpdate(t){xt(this,qr,ju).call(this),xt(this,qr,pp).call(this,t)}getCurrentResult(){return G(this,Ds)}reset(){var t;(t=G(this,ui))==null||t.removeObserver(this),Ve(this,ui,void 0),xt(this,qr,ju).call(this),xt(this,qr,pp).call(this)}mutate(t,r){var a;return Ve(this,Hr,r),(a=G(this,ui))==null||a.removeObserver(this),Ve(this,ui,G(this,Vr).getMutationCache().build(G(this,Vr),this.options)),G(this,ui).addObserver(this),G(this,ui).execute(t)}},Vr=new WeakMap,Ds=new WeakMap,ui=new WeakMap,Hr=new WeakMap,qr=new WeakSet,ju=function(){var r;const t=((r=G(this,ui))==null?void 0:r.state)??b_();Ve(this,Ds,{...t,isPending:t.status==="pending",isSuccess:t.status==="success",isError:t.status==="error",isIdle:t.status==="idle",mutate:this.mutate,reset:this.reset})},pp=function(t){Sn.batch(()=>{var r,a,l,c,h,d,f,v;if(G(this,Hr)&&this.hasListeners()){const g=G(this,Ds).variables,p=G(this,Ds).context,y={client:G(this,Vr),meta:this.options.meta,mutationKey:this.options.mutationKey};if((t==null?void 0:t.type)==="success"){try{(a=(r=G(this,Hr)).onSuccess)==null||a.call(r,t.data,g,p,y)}catch(E){Promise.reject(E)}try{(c=(l=G(this,Hr)).onSettled)==null||c.call(l,t.data,null,g,p,y)}catch(E){Promise.reject(E)}}else if((t==null?void 0:t.type)==="error"){try{(d=(h=G(this,Hr)).onError)==null||d.call(h,t.error,g,p,y)}catch(E){Promise.reject(E)}try{(v=(f=G(this,Hr)).onSettled)==null||v.call(f,void 0,t.error,g,p,y)}catch(E){Promise.reject(E)}}}this.listeners.forEach(g=>{g(G(this,Ds))})})},f_),ur,p_,iE=(p_=class extends zo{constructor(e={}){super();it(this,ur);this.config=e,Ve(this,ur,new Map)}build(e,t,r){const a=t.queryKey,l=t.queryHash??mm(a,t);let c=this.get(l);return c||(c=new YM({client:e,queryKey:a,queryHash:l,options:e.defaultQueryOptions(t),state:r,defaultOptions:e.getQueryDefaults(a)}),this.add(c)),c}add(e){G(this,ur).has(e.queryHash)||(G(this,ur).set(e.queryHash,e),this.notify({type:"added",query:e}))}remove(e){const t=G(this,ur).get(e.queryHash);t&&(e.destroy(),t===e&&G(this,ur).delete(e.queryHash),this.notify({type:"removed",query:e}))}clear(){Sn.batch(()=>{this.getAll().forEach(e=>{this.remove(e)})})}get(e){return G(this,ur).get(e)}getAll(){return[...G(this,ur).values()]}find(e){const t={exact:!0,...e};return this.getAll().find(r=>yx(t,r))}findAll(e={}){const t=this.getAll();return Object.keys(e).length>0?t.filter(r=>yx(e,r)):t}notify(e){Sn.batch(()=>{this.listeners.forEach(t=>{t(e)})})}onFocus(){Sn.batch(()=>{this.getAll().forEach(e=>{e.onFocus()})})}onOnline(){Sn.batch(()=>{this.getAll().forEach(e=>{e.onOnline()})})}},ur=new WeakMap,p_),fn,Is,Us,No,Lo,Fs,Do,Io,m_,rE=(m_=class{constructor(i={}){it(this,fn);it(this,Is);it(this,Us);it(this,No);it(this,Lo);it(this,Fs);it(this,Do);it(this,Io);Ve(this,fn,i.queryCache||new iE),Ve(this,Is,i.mutationCache||new tE),Ve(this,Us,i.defaultOptions||{}),Ve(this,No,new Map),Ve(this,Lo,new Map),Ve(this,Fs,0)}mount(){hu(this,Fs)._++,G(this,Fs)===1&&(Ve(this,Do,pm.subscribe(async i=>{i&&(await this.resumePausedMutations(),G(this,fn).onFocus())})),Ve(this,Io,nh.subscribe(async i=>{i&&(await this.resumePausedMutations(),G(this,fn).onOnline())})))}unmount(){var i,e;hu(this,Fs)._--,G(this,Fs)===0&&((i=G(this,Do))==null||i.call(this),Ve(this,Do,void 0),(e=G(this,Io))==null||e.call(this),Ve(this,Io,void 0))}isFetching(i){return G(this,fn).findAll({...i,fetchStatus:"fetching"}).length}isMutating(i){return G(this,Is).findAll({...i,status:"pending"}).length}getQueryData(i){var t;const e=this.defaultQueryOptions({queryKey:i});return(t=G(this,fn).get(e.queryHash))==null?void 0:t.state.data}ensureQueryData(i){const e=this.defaultQueryOptions(i),t=G(this,fn).build(this,e),r=t.state.data;return r===void 0?this.fetchQuery(i):(i.revalidateIfStale&&t.isStaleByTime(Os(e.staleTime,t))&&this.prefetchQuery(e),Promise.resolve(r))}getQueriesData(i){return G(this,fn).findAll(i).map(({queryKey:e,state:t})=>{const r=t.data;return[e,r]})}setQueryData(i,e,t){const r=this.defaultQueryOptions({queryKey:i}),a=G(this,fn).get(r.queryHash),l=a==null?void 0:a.state.data,c=OM(e,l);if(c!==void 0)return G(this,fn).build(this,r).setData(c,{...t,manual:!0})}setQueriesData(i,e,t){return Sn.batch(()=>G(this,fn).findAll(i).map(({queryKey:r})=>[r,this.setQueryData(r,e,t)]))}getQueryState(i){var t;const e=this.defaultQueryOptions({queryKey:i});return(t=G(this,fn).get(e.queryHash))==null?void 0:t.state}removeQueries(i){const e=G(this,fn);Sn.batch(()=>{e.findAll(i).forEach(t=>{e.remove(t)})})}resetQueries(i,e){const t=G(this,fn);return Sn.batch(()=>(t.findAll(i).forEach(r=>{r.reset()}),this.refetchQueries({type:"active",...i},e)))}cancelQueries(i,e={}){const t={revert:!0,...e},r=Sn.batch(()=>G(this,fn).findAll(i).map(a=>a.cancel(t)));return Promise.all(r).then(Zn).catch(Zn)}invalidateQueries(i,e={}){return Sn.batch(()=>(G(this,fn).findAll(i).forEach(t=>{t.invalidate()}),(i==null?void 0:i.refetchType)==="none"?Promise.resolve():this.refetchQueries({...i,type:(i==null?void 0:i.refetchType)??(i==null?void 0:i.type)??"active"},e)))}refetchQueries(i,e={}){const t={...e,cancelRefetch:e.cancelRefetch??!0},r=Sn.batch(()=>G(this,fn).findAll(i).filter(a=>!a.isDisabled()&&!a.isStatic()).map(a=>{let l=a.fetch(void 0,t);return t.throwOnError||(l=l.catch(Zn)),a.state.fetchStatus==="paused"?Promise.resolve():l}));return Promise.all(r).then(Zn)}fetchQuery(i){const e=this.defaultQueryOptions(i);e.retry===void 0&&(e.retry=!1);const t=G(this,fn).build(this,e);return t.isStaleByTime(Os(e.staleTime,t))?t.fetch(e):Promise.resolve(t.state.data)}prefetchQuery(i){return this.fetchQuery(i).then(Zn).catch(Zn)}fetchInfiniteQuery(i){return i._type="infinite",this.fetchQuery(i)}prefetchInfiniteQuery(i){return this.fetchInfiniteQuery(i).then(Zn).catch(Zn)}ensureInfiniteQueryData(i){return i._type="infinite",this.ensureQueryData(i)}resumePausedMutations(){return nh.isOnline()?G(this,Is).resumePausedMutations():Promise.resolve()}getQueryCache(){return G(this,fn)}getMutationCache(){return G(this,Is)}getDefaultOptions(){return G(this,Us)}setDefaultOptions(i){Ve(this,Us,i)}setQueryDefaults(i,e){G(this,No).set(Ta(i),{queryKey:i,defaultOptions:e})}getQueryDefaults(i){const e=[...G(this,No).values()],t={};return e.forEach(r=>{Hl(i,r.queryKey)&&Object.assign(t,r.defaultOptions)}),t}setMutationDefaults(i,e){G(this,Lo).set(Ta(i),{mutationKey:i,defaultOptions:e})}getMutationDefaults(i){const e=[...G(this,Lo).values()],t={};return e.forEach(r=>{Hl(i,r.mutationKey)&&Object.assign(t,r.defaultOptions)}),t}defaultQueryOptions(i){if(i._defaulted)return i;const e={...G(this,Us).queries,...this.getQueryDefaults(i.queryKey),...i,_defaulted:!0};return e.queryHash||(e.queryHash=mm(e.queryKey,e)),e.refetchOnReconnect===void 0&&(e.refetchOnReconnect=e.networkMode!=="always"),e.throwOnError===void 0&&(e.throwOnError=!!e.suspense),!e.networkMode&&e.persister&&(e.networkMode="offlineFirst"),e.queryFn===gm&&(e.enabled=!1),e}defaultMutationOptions(i){return i!=null&&i._defaulted?i:{...G(this,Us).mutations,...(i==null?void 0:i.mutationKey)&&this.getMutationDefaults(i.mutationKey),...i,_defaulted:!0}}clear(){G(this,fn).clear(),G(this,Is).clear()}},fn=new WeakMap,Is=new WeakMap,Us=new WeakMap,No=new WeakMap,Lo=new WeakMap,Fs=new WeakMap,Do=new WeakMap,Io=new WeakMap,m_),T_=k.createContext(void 0),mh=i=>{const e=k.useContext(T_);if(!e)throw new Error("No QueryClient set, use QueryClientProvider to set one");return e},sE=({client:i,children:e})=>(k.useEffect(()=>(i.mount(),()=>{i.unmount()}),[i]),x.jsx(T_.Provider,{value:i,children:e})),C_=k.createContext(!1),aE=()=>k.useContext(C_);C_.Provider;function oE(){let i=!1;return{clearReset:()=>{i=!1},reset:()=>{i=!0},isReset:()=>i}}var lE=k.createContext(oE()),cE=()=>k.useContext(lE),uE=(i,e,t)=>{const r=t!=null&&t.state.error&&typeof i.throwOnError=="function"?xm(i.throwOnError,[t.state.error,t]):i.throwOnError;(i.suspense||i.experimental_prefetchInRender||r)&&(e.isReset()||(i.retryOnMount=!1))},hE=i=>{k.useEffect(()=>{i.clearReset()},[i])},dE=({result:i,errorResetBoundary:e,throwOnError:t,query:r,suspense:a})=>i.isError&&!e.isReset()&&!i.isFetching&&r&&(a&&i.data===void 0||xm(t,[i.error,r])),fE=i=>{if(i.suspense){const t=a=>a==="static"?a:Math.max(a??1e3,1e3),r=i.staleTime;i.staleTime=typeof r=="function"?(...a)=>t(r(...a)):t(r),typeof i.gcTime=="number"&&(i.gcTime=Math.max(i.gcTime,1e3))}},pE=(i,e)=>i.isLoading&&i.isFetching&&!e,mE=(i,e)=>(i==null?void 0:i.suspense)&&e.isPending,Ax=(i,e,t)=>e.fetchOptimistic(i).catch(()=>{t.clearReset()});function gE(i,e,t){var y,E,b,M;const r=aE(),a=cE(),l=mh(),c=l.defaultQueryOptions(i);(E=(y=l.getDefaultOptions().queries)==null?void 0:y._experimental_beforeQuery)==null||E.call(y,c);const h=l.getQueryCache().get(c.queryHash),d=i.subscribed!==!1;c._optimisticResults=r?"isRestoring":d?"optimistic":void 0,fE(c),uE(c,a,h),hE(a);const f=!l.getQueryCache().get(c.queryHash),[v]=k.useState(()=>new e(l,c)),g=v.getOptimisticResult(c),p=!r&&d;if(k.useSyncExternalStore(k.useCallback(S=>{const A=p?v.subscribe(Sn.batchCalls(S)):Zn;return v.updateResult(),A},[v,p]),()=>v.getCurrentResult(),()=>v.getCurrentResult()),k.useEffect(()=>{v.setOptions(c)},[c,v]),mE(c,g))throw Ax(c,v,a);if(dE({result:g,errorResetBoundary:a,throwOnError:c.throwOnError,query:h,suspense:c.suspense}))throw g.error;if((M=(b=l.getDefaultOptions().queries)==null?void 0:b._experimental_afterQuery)==null||M.call(b,c,g),c.experimental_prefetchInRender&&!Gl.isServer()&&pE(g,r)){const S=f?Ax(c,v,a):h==null?void 0:h.promise;S==null||S.catch(Zn).finally(()=>{v.updateResult()})}return c.notifyOnChangeProps?g:v.trackResult(g)}function gr(i,e){return gE(i,QM)}function jr(i,e){const t=mh(),[r]=k.useState(()=>new nE(t,i));k.useEffect(()=>{r.setOptions(i)},[r,i]);const a=k.useSyncExternalStore(k.useCallback(c=>r.subscribe(Sn.batchCalls(c)),[r]),()=>r.getCurrentResult(),()=>r.getCurrentResult()),l=k.useCallback((c,h)=>{r.mutate(c,h).catch(Zn)},[r]);if(a.error&&xm(r.options.throwOnError,[a.error]))throw a.error;return{...a,mutate:l,mutateAsync:a.mutate}}/**
 * react-router v7.18.0
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */var _m=/^(?:[a-z][a-z0-9+.-]*:|[\\/]{2})/i,R_=/^[\\/]{2}/;function xE(i,e){return e+i.replace(/\\/g,"/")}var Px="popstate";function Nx(i){return typeof i=="object"&&i!=null&&"pathname"in i&&"search"in i&&"hash"in i&&"state"in i&&"key"in i}function vE(i={}){function e(r,a){var f;let l=(f=a.state)==null?void 0:f.masked,{pathname:c,search:h,hash:d}=l||r.location;return mp("",{pathname:c,search:h,hash:d},a.state&&a.state.usr||null,a.state&&a.state.key||"default",l?{pathname:r.location.pathname,search:r.location.search,hash:r.location.hash}:void 0)}function t(r,a){return typeof a=="string"?a:jl(a)}return yE(e,t,null,i)}function nn(i,e){if(i===!1||i===null||typeof i>"u")throw new Error(e)}function Ui(i,e){if(!i){typeof console<"u"&&console.warn(e);try{throw new Error(e)}catch{}}}function _E(){return Math.random().toString(36).substring(2,10)}function Lx(i,e){return{usr:i.state,key:i.key,idx:e,masked:i.mask?{pathname:i.pathname,search:i.search,hash:i.hash}:void 0}}function mp(i,e,t=null,r,a){return{pathname:typeof i=="string"?i:i.pathname,search:"",hash:"",...typeof e=="string"?Bo(e):e,state:t,key:e&&e.key||r||_E(),mask:a}}function jl({pathname:i="/",search:e="",hash:t=""}){return e&&e!=="?"&&(i+=e.charAt(0)==="?"?e:"?"+e),t&&t!=="#"&&(i+=t.charAt(0)==="#"?t:"#"+t),i}function Bo(i){let e={};if(i){let t=i.indexOf("#");t>=0&&(e.hash=i.substring(t),i=i.substring(0,t));let r=i.indexOf("?");r>=0&&(e.search=i.substring(r),i=i.substring(0,r)),i&&(e.pathname=i)}return e}function yE(i,e,t,r={}){let{window:a=document.defaultView,v5Compat:l=!1}=r,c=a.history,h="POP",d=null,f=v();f==null&&(f=0,c.replaceState({...c.state,idx:f},""));function v(){return(c.state||{idx:null}).idx}function g(){h="POP";let M=v(),S=M==null?null:M-f;f=M,d&&d({action:h,location:b.location,delta:S})}function p(M,S){h="PUSH";let A=Nx(M)?M:mp(b.location,M,S);f=v()+1;let D=Lx(A,f),C=b.createHref(A.mask||A);try{c.pushState(D,"",C)}catch(I){if(I instanceof DOMException&&I.name==="DataCloneError")throw I;a.location.assign(C)}l&&d&&d({action:h,location:b.location,delta:1})}function y(M,S){h="REPLACE";let A=Nx(M)?M:mp(b.location,M,S);f=v();let D=Lx(A,f),C=b.createHref(A.mask||A);c.replaceState(D,"",C),l&&d&&d({action:h,location:b.location,delta:0})}function E(M){return SE(a,M)}let b={get action(){return h},get location(){return i(a,c)},listen(M){if(d)throw new Error("A history only accepts one active listener");return a.addEventListener(Px,g),d=M,()=>{a.removeEventListener(Px,g),d=null}},createHref(M){return e(a,M)},createURL:E,encodeLocation(M){let S=E(M);return{pathname:S.pathname,search:S.search,hash:S.hash}},push:p,replace:y,go(M){return c.go(M)}};return b}function SE(i,e,t=!1){let r="http://localhost";i&&(r=i.location.origin!=="null"?i.location.origin:i.location.href),nn(r,"No window.location.(origin|href) available to create URL");let a=typeof e=="string"?e:jl(e);return a=a.replace(/ $/,"%20"),!t&&R_.test(a)&&(a=r+a),new URL(a,r)}function A_(i,e,t="/"){return ME(i,e,t,!1)}function ME(i,e,t,r,a){let l=typeof e=="string"?Bo(e):e,c=Kr(l.pathname||"/",t);if(c==null)return null;let h=EE(i),d=null,f=IE(c);for(let v=0;d==null&&v<h.length;++v)d=DE(h[v],f,r);return d}function EE(i){let e=P_(i);return wE(e),e}function P_(i,e=[],t=[],r="",a=!1){let l=(c,h,d=a,f)=>{let v={relativePath:f===void 0?c.path||"":f,caseSensitive:c.caseSensitive===!0,childrenIndex:h,route:c};if(v.relativePath.startsWith("/")){if(!v.relativePath.startsWith(r)&&d)return;nn(v.relativePath.startsWith(r),`Absolute route path "${v.relativePath}" nested under path "${r}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`),v.relativePath=v.relativePath.slice(r.length)}let g=Yi([r,v.relativePath]),p=t.concat(v);c.children&&c.children.length>0&&(nn(c.index!==!0,`Index routes must not have child routes. Please remove all child routes from route path "${g}".`),P_(c.children,e,p,g,d)),!(c.path==null&&!c.index)&&e.push({path:g,score:NE(g,c.index),routesMeta:p.map((y,E)=>{let[b,M]=D_(y.relativePath,y.caseSensitive,E===p.length-1);return{...y,matcher:b,compiledParams:M}})})};return i.forEach((c,h)=>{var d;if(c.path===""||!((d=c.path)!=null&&d.includes("?")))l(c,h);else for(let f of N_(c.path))l(c,h,!0,f)}),e}function N_(i){let e=i.split("/");if(e.length===0)return[];let[t,...r]=e,a=t.endsWith("?"),l=t.replace(/\?$/,"");if(r.length===0)return a?[l,""]:[l];let c=N_(r.join("/")),h=[];return h.push(...c.map(d=>d===""?l:[l,d].join("/"))),a&&h.push(...c),h.map(d=>i.startsWith("/")&&d===""?"/":d)}function wE(i){i.sort((e,t)=>e.score!==t.score?t.score-e.score:LE(e.routesMeta.map(r=>r.childrenIndex),t.routesMeta.map(r=>r.childrenIndex)))}var bE=/^:[\w-]+$/,TE=3,CE=2,RE=1,AE=10,PE=-2,Dx=i=>i==="*";function NE(i,e){let t=i.split("/"),r=t.length;return t.some(Dx)&&(r+=PE),e&&(r+=CE),t.filter(a=>!Dx(a)).reduce((a,l)=>a+(bE.test(l)?TE:l===""?RE:AE),r)}function LE(i,e){return i.length===e.length&&i.slice(0,-1).every((r,a)=>r===e[a])?i[i.length-1]-e[e.length-1]:0}function DE(i,e,t=!1){let{routesMeta:r}=i,a={},l="/",c=[];for(let h=0;h<r.length;++h){let d=r[h],f=h===r.length-1,v=l==="/"?e:e.slice(l.length)||"/",g={path:d.relativePath,caseSensitive:d.caseSensitive,end:f},p=d.matcher&&d.compiledParams?L_(g,v,d.matcher,d.compiledParams):ih(g,v),y=d.route;if(!p&&f&&t&&!r[r.length-1].route.index&&(p=ih({path:d.relativePath,caseSensitive:d.caseSensitive,end:!1},v)),!p)return null;Object.assign(a,p.params),c.push({params:a,pathname:Yi([l,p.pathname]),pathnameBase:kE(Yi([l,p.pathnameBase])),route:y}),p.pathnameBase!=="/"&&(l=Yi([l,p.pathnameBase]))}return c}function ih(i,e){typeof i=="string"&&(i={path:i,caseSensitive:!1,end:!0});let[t,r]=D_(i.path,i.caseSensitive,i.end);return L_(i,e,t,r)}function L_(i,e,t,r){let a=e.match(t);if(!a)return null;let l=a[0],c=l.replace(/(.)\/+$/,"$1"),h=a.slice(1);return{params:r.reduce((f,{paramName:v,isOptional:g},p)=>{if(v==="*"){let E=h[p]||"";c=l.slice(0,l.length-E.length).replace(/(.)\/+$/,"$1")}const y=h[p];return g&&!y?f[v]=void 0:f[v]=(y||"").replace(/%2F/g,"/"),f},{}),pathname:l,pathnameBase:c,pattern:i}}function D_(i,e=!1,t=!0){Ui(i==="*"||!i.endsWith("*")||i.endsWith("/*"),`Route path "${i}" will be treated as if it were "${i.replace(/\*$/,"/*")}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${i.replace(/\*$/,"/*")}".`);let r=[],a="^"+i.replace(/\/*\*?$/,"").replace(/^\/*/,"/").replace(/[\\.*+^${}|()[\]]/g,"\\$&").replace(/\/:([\w-]+)(\?)?/g,(c,h,d,f,v)=>{if(r.push({paramName:h,isOptional:d!=null}),d){let g=v.charAt(f+c.length);return g&&g!=="/"?"/([^\\/]*)":"(?:/([^\\/]*))?"}return"/([^\\/]+)"}).replace(/\/([\w-]+)\?(\/|$)/g,"(/$1)?$2");return i.endsWith("*")?(r.push({paramName:"*"}),a+=i==="*"||i==="/*"?"(.*)$":"(?:\\/(.+)|\\/*)$"):t?a+="\\/*$":i!==""&&i!=="/"&&(a+="(?:(?=\\/|$))"),[new RegExp(a,e?void 0:"i"),r]}function IE(i){try{return i.split("/").map(e=>decodeURIComponent(e).replace(/\//g,"%2F")).join("/")}catch(e){return Ui(!1,`The URL path "${i}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${e}).`),i}}function Kr(i,e){if(e==="/")return i;if(!i.toLowerCase().startsWith(e.toLowerCase()))return null;let t=e.endsWith("/")?e.length-1:e.length,r=i.charAt(t);return r&&r!=="/"?null:i.slice(t)||"/"}function UE(i,e="/"){let{pathname:t,search:r="",hash:a=""}=typeof i=="string"?Bo(i):i,l;return t?(t=I_(t),t.startsWith("/")?l=Ix(t.substring(1),"/"):l=Ix(t,e)):l=e,{pathname:l,search:OE(r),hash:zE(a)}}function Ix(i,e){let t=rh(e).split("/");return i.split("/").forEach(a=>{a===".."?t.length>1&&t.pop():a!=="."&&t.push(a)}),t.length>1?t.join("/"):"/"}function hf(i,e,t,r){return`Cannot include a '${i}' character in a manually specified \`to.${e}\` field [${JSON.stringify(r)}].  Please separate it out to the \`to.${t}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`}function FE(i){return i.filter((e,t)=>t===0||e.route.path&&e.route.path.length>0)}function ym(i){let e=FE(i);return e.map((t,r)=>r===e.length-1?t.pathname:t.pathnameBase)}function gh(i,e,t,r=!1){let a;typeof i=="string"?a=Bo(i):(a={...i},nn(!a.pathname||!a.pathname.includes("?"),hf("?","pathname","search",a)),nn(!a.pathname||!a.pathname.includes("#"),hf("#","pathname","hash",a)),nn(!a.search||!a.search.includes("#"),hf("#","search","hash",a)));let l=i===""||a.pathname==="",c=l?"/":a.pathname,h;if(c==null)h=t;else{let g=e.length-1;if(!r&&c.startsWith("..")){let p=c.split("/");for(;p[0]==="..";)p.shift(),g-=1;a.pathname=p.join("/")}h=g>=0?e[g]:"/"}let d=UE(a,h),f=c&&c!=="/"&&c.endsWith("/"),v=(l||c===".")&&t.endsWith("/");return!d.pathname.endsWith("/")&&(f||v)&&(d.pathname+="/"),d}var I_=i=>i.replace(/[\\/]{2,}/g,"/"),Yi=i=>I_(i.join("/")),rh=i=>i.replace(/\/+$/,""),kE=i=>rh(i).replace(/^\/*/,"/"),OE=i=>!i||i==="?"?"":i.startsWith("?")?i:"?"+i,zE=i=>!i||i==="#"?"":i.startsWith("#")?i:"#"+i,BE=class{constructor(i,e,t,r=!1){this.status=i,this.statusText=e||"",this.internal=r,t instanceof Error?(this.data=t.toString(),this.error=t):this.data=t}};function VE(i){return i!=null&&typeof i.status=="number"&&typeof i.statusText=="string"&&typeof i.internal=="boolean"&&"data"in i}function HE(i){let e=i.map(t=>t.route.path).filter(Boolean);return Yi(e)||"/"}var U_=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";function F_(i,e){let t=i;if(typeof t!="string"||!_m.test(t))return{absoluteURL:void 0,isExternal:!1,to:t};let r=t,a=!1;if(U_)try{let l=new URL(window.location.href),c=R_.test(t)?new URL(xE(t,l.protocol)):new URL(t),h=Kr(c.pathname,e);c.origin===l.origin&&h!=null?t=h+c.search+c.hash:a=!0}catch{Ui(!1,`<Link to="${t}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`)}return{absoluteURL:r,isExternal:a,to:t}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");var k_=["POST","PUT","PATCH","DELETE"];new Set(k_);var GE=["GET",...k_];new Set(GE);var jE=["about:","blob:","chrome:","chrome-untrusted:","content:","data:","devtools:","file:","filesystem:","javascript:"];function WE(i){try{return jE.includes(new URL(i).protocol)}catch{return!1}}var Vo=k.createContext(null);Vo.displayName="DataRouter";var xh=k.createContext(null);xh.displayName="DataRouterState";var O_=k.createContext(!1);function XE(){return k.useContext(O_)}var z_=k.createContext({isTransitioning:!1});z_.displayName="ViewTransition";var $E=k.createContext(new Map);$E.displayName="Fetchers";var qE=k.createContext(null);qE.displayName="Await";var Ei=k.createContext(null);Ei.displayName="Navigation";var tc=k.createContext(null);tc.displayName="Location";var Zi=k.createContext({outlet:null,matches:[],isDataRoute:!1});Zi.displayName="Route";var Sm=k.createContext(null);Sm.displayName="RouteError";var B_="REACT_ROUTER_ERROR",KE="REDIRECT",YE="ROUTE_ERROR_RESPONSE";function QE(i){if(i.startsWith(`${B_}:${KE}:{`))try{let e=JSON.parse(i.slice(28));if(typeof e=="object"&&e&&typeof e.status=="number"&&typeof e.statusText=="string"&&typeof e.location=="string"&&typeof e.reloadDocument=="boolean"&&typeof e.replace=="boolean")return e}catch{}}function ZE(i){if(i.startsWith(`${B_}:${YE}:{`))try{let e=JSON.parse(i.slice(40));if(typeof e=="object"&&e&&typeof e.status=="number"&&typeof e.statusText=="string")return new BE(e.status,e.statusText,e.data)}catch{}}function JE(i,{relative:e}={}){nn(Ho(),"useHref() may be used only in the context of a <Router> component.");let{basename:t,navigator:r}=k.useContext(Ei),{hash:a,pathname:l,search:c}=nc(i,{relative:e}),h=l;return t!=="/"&&(h=l==="/"?t:Yi([t,l])),r.createHref({pathname:h,search:c,hash:a})}function Ho(){return k.useContext(tc)!=null}function Ji(){return nn(Ho(),"useLocation() may be used only in the context of a <Router> component."),k.useContext(tc).location}var V_="You should call navigate() in a React.useEffect(), not when your component is first rendered.";function H_(i){k.useContext(Ei).static||k.useLayoutEffect(i)}function Mm(){let{isDataRoute:i}=k.useContext(Zi);return i?p1():e1()}function e1(){nn(Ho(),"useNavigate() may be used only in the context of a <Router> component.");let i=k.useContext(Vo),{basename:e,navigator:t}=k.useContext(Ei),{matches:r}=k.useContext(Zi),{pathname:a}=Ji(),l=JSON.stringify(ym(r)),c=k.useRef(!1);return H_(()=>{c.current=!0}),k.useCallback((d,f={})=>{if(Ui(c.current,V_),!c.current)return;if(typeof d=="number"){t.go(d);return}let v=gh(d,JSON.parse(l),a,f.relative==="path");i==null&&e!=="/"&&(v.pathname=v.pathname==="/"?e:Yi([e,v.pathname])),(f.replace?t.replace:t.push)(v,f.state,f)},[e,t,l,a,i])}var t1=k.createContext(null);function n1(i){let e=k.useContext(Zi).outlet;return k.useMemo(()=>e&&k.createElement(t1.Provider,{value:i},e),[e,i])}function nc(i,{relative:e}={}){let{matches:t}=k.useContext(Zi),{pathname:r}=Ji(),a=JSON.stringify(ym(t));return k.useMemo(()=>gh(i,JSON.parse(a),r,e==="path"),[i,a,r,e])}function i1(i,e){return G_(i,e)}function G_(i,e,t){var M;nn(Ho(),"useRoutes() may be used only in the context of a <Router> component.");let{navigator:r}=k.useContext(Ei),{matches:a}=k.useContext(Zi),l=a[a.length-1],c=l?l.params:{},h=l?l.pathname:"/",d=l?l.pathnameBase:"/",f=l&&l.route;{let S=f&&f.path||"";W_(h,!f||S.endsWith("*")||S.endsWith("*?"),`You rendered descendant <Routes> (or called \`useRoutes()\`) at "${h}" (under <Route path="${S}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${S}"> to <Route path="${S==="/"?"*":`${S}/*`}">.`)}let v=Ji(),g;if(e){let S=typeof e=="string"?Bo(e):e;nn(d==="/"||((M=S.pathname)==null?void 0:M.startsWith(d)),`When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${d}" but pathname "${S.pathname}" was given in the \`location\` prop.`),g=S}else g=v;let p=g.pathname||"/",y=p;if(d!=="/"){let S=d.replace(/^\//,"").split("/");y="/"+p.replace(/^\//,"").split("/").slice(S.length).join("/")}let E=t&&t.state.matches.length?t.state.matches.map(S=>Object.assign(S,{route:t.manifest[S.route.id]||S.route})):A_(i,{pathname:y});Ui(f||E!=null,`No routes matched location "${g.pathname}${g.search}${g.hash}" `),Ui(E==null||E[E.length-1].route.element!==void 0||E[E.length-1].route.Component!==void 0||E[E.length-1].route.lazy!==void 0,`Matched leaf route at location "${g.pathname}${g.search}${g.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`);let b=l1(E&&E.map(S=>Object.assign({},S,{params:Object.assign({},c,S.params),pathname:Yi([d,r.encodeLocation?r.encodeLocation(S.pathname.replace(/%/g,"%25").replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:S.pathname]),pathnameBase:S.pathnameBase==="/"?d:Yi([d,r.encodeLocation?r.encodeLocation(S.pathnameBase.replace(/%/g,"%25").replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:S.pathnameBase])})),a,t);return e&&b?k.createElement(tc.Provider,{value:{location:{pathname:"/",search:"",hash:"",state:null,key:"default",mask:void 0,...g},navigationType:"POP"}},b):b}function r1(){let i=f1(),e=VE(i)?`${i.status} ${i.statusText}`:i instanceof Error?i.message:JSON.stringify(i),t=i instanceof Error?i.stack:null,r="rgba(200,200,200, 0.5)",a={padding:"0.5rem",backgroundColor:r},l={padding:"2px 4px",backgroundColor:r},c=null;return console.error("Error handled by React Router default ErrorBoundary:",i),c=k.createElement(k.Fragment,null,k.createElement("p",null,"💿 Hey developer 👋"),k.createElement("p",null,"You can provide a way better UX than this when your app throws errors by providing your own ",k.createElement("code",{style:l},"ErrorBoundary")," or"," ",k.createElement("code",{style:l},"errorElement")," prop on your route.")),k.createElement(k.Fragment,null,k.createElement("h2",null,"Unexpected Application Error!"),k.createElement("h3",{style:{fontStyle:"italic"}},e),t?k.createElement("pre",{style:a},t):null,c)}var s1=k.createElement(r1,null),j_=class extends k.Component{constructor(i){super(i),this.state={location:i.location,revalidation:i.revalidation,error:i.error}}static getDerivedStateFromError(i){return{error:i}}static getDerivedStateFromProps(i,e){return e.location!==i.location||e.revalidation!=="idle"&&i.revalidation==="idle"?{error:i.error,location:i.location,revalidation:i.revalidation}:{error:i.error!==void 0?i.error:e.error,location:e.location,revalidation:i.revalidation||e.revalidation}}componentDidCatch(i,e){this.props.onError?this.props.onError(i,e):console.error("React Router caught the following error during render",i)}render(){let i=this.state.error;if(this.context&&typeof i=="object"&&i&&"digest"in i&&typeof i.digest=="string"){const t=ZE(i.digest);t&&(i=t)}let e=i!==void 0?k.createElement(Zi.Provider,{value:this.props.routeContext},k.createElement(Sm.Provider,{value:i,children:this.props.component})):this.props.children;return this.context?k.createElement(a1,{error:i},e):e}};j_.contextType=O_;var df=new WeakMap;function a1({children:i,error:e}){let{basename:t}=k.useContext(Ei);if(typeof e=="object"&&e&&"digest"in e&&typeof e.digest=="string"){let r=QE(e.digest);if(r){let a=df.get(e);if(a)throw a;let l=F_(r.location,t),c=l.absoluteURL||l.to;if(WE(c))throw new Error("Invalid redirect location");if(U_&&!df.get(e))if(l.isExternal||r.reloadDocument)window.location.href=c;else{const h=Promise.resolve().then(()=>window.__reactRouterDataRouter.navigate(l.to,{replace:r.replace}));throw df.set(e,h),h}return k.createElement("meta",{httpEquiv:"refresh",content:`0;url=${c}`})}}return i}function o1({routeContext:i,match:e,children:t}){let r=k.useContext(Vo);return r&&r.static&&r.staticContext&&(e.route.errorElement||e.route.ErrorBoundary)&&(r.staticContext._deepestRenderedBoundaryId=e.route.id),k.createElement(Zi.Provider,{value:i},t)}function l1(i,e=[],t){let r=t==null?void 0:t.state;if(i==null){if(!r)return null;if(r.errors)i=r.matches;else if(e.length===0&&!r.initialized&&r.matches.length>0)i=r.matches;else return null}let a=i,l=r==null?void 0:r.errors;if(l!=null){let v=a.findIndex(g=>g.route.id&&(l==null?void 0:l[g.route.id])!==void 0);nn(v>=0,`Could not find a matching route for errors on route IDs: ${Object.keys(l).join(",")}`),a=a.slice(0,Math.min(a.length,v+1))}let c=!1,h=-1;if(t&&r){c=r.renderFallback;for(let v=0;v<a.length;v++){let g=a[v];if((g.route.HydrateFallback||g.route.hydrateFallbackElement)&&(h=v),g.route.id){let{loaderData:p,errors:y}=r,E=g.route.loader&&!p.hasOwnProperty(g.route.id)&&(!y||y[g.route.id]===void 0);if(g.route.lazy||E){t.isStatic&&(c=!0),h>=0?a=a.slice(0,h+1):a=[a[0]];break}}}}let d=t==null?void 0:t.onError,f=r&&d?(v,g)=>{var p,y;d(v,{location:r.location,params:((y=(p=r.matches)==null?void 0:p[0])==null?void 0:y.params)??{},pattern:HE(r.matches),errorInfo:g})}:void 0;return a.reduceRight((v,g,p)=>{let y,E=!1,b=null,M=null;r&&(y=l&&g.route.id?l[g.route.id]:void 0,b=g.route.errorElement||s1,c&&(h<0&&p===0?(W_("route-fallback",!1,"No `HydrateFallback` element provided to render during initial hydration"),E=!0,M=null):h===p&&(E=!0,M=g.route.hydrateFallbackElement||null)));let S=e.concat(a.slice(0,p+1)),A=()=>{let D;return y?D=b:E?D=M:g.route.Component?D=k.createElement(g.route.Component,null):g.route.element?D=g.route.element:D=v,k.createElement(o1,{match:g,routeContext:{outlet:v,matches:S,isDataRoute:r!=null},children:D})};return r&&(g.route.ErrorBoundary||g.route.errorElement||p===0)?k.createElement(j_,{location:r.location,revalidation:r.revalidation,component:b,error:y,children:A(),routeContext:{outlet:null,matches:S,isDataRoute:!0},onError:f}):A()},null)}function Em(i){return`${i} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function c1(i){let e=k.useContext(Vo);return nn(e,Em(i)),e}function u1(i){let e=k.useContext(xh);return nn(e,Em(i)),e}function h1(i){let e=k.useContext(Zi);return nn(e,Em(i)),e}function wm(i){let e=h1(i),t=e.matches[e.matches.length-1];return nn(t.route.id,`${i} can only be used on routes that contain a unique "id"`),t.route.id}function d1(){return wm("useRouteId")}function f1(){var r;let i=k.useContext(Sm),e=u1("useRouteError"),t=wm("useRouteError");return i!==void 0?i:(r=e.errors)==null?void 0:r[t]}function p1(){let{router:i}=c1("useNavigate"),e=wm("useNavigate"),t=k.useRef(!1);return H_(()=>{t.current=!0}),k.useCallback(async(a,l={})=>{Ui(t.current,V_),t.current&&(typeof a=="number"?await i.navigate(a):await i.navigate(a,{fromRouteId:e,...l}))},[i,e])}var Ux={};function W_(i,e,t){!e&&!Ux[i]&&(Ux[i]=!0,Ui(!1,t))}k.memo(m1);function m1({routes:i,manifest:e,future:t,state:r,isStatic:a,onError:l}){return G_(i,void 0,{manifest:e,state:r,isStatic:a,onError:l})}function ff({to:i,replace:e,state:t,relative:r}){nn(Ho(),"<Navigate> may be used only in the context of a <Router> component.");let{static:a}=k.useContext(Ei);Ui(!a,"<Navigate> must not be used on the initial render in a <StaticRouter>. This is a no-op, but you should modify your code so the <Navigate> is only ever rendered in response to some user interaction or state change.");let{matches:l}=k.useContext(Zi),{pathname:c}=Ji(),h=Mm(),d=gh(i,ym(l),c,r==="path"),f=JSON.stringify(d);return k.useEffect(()=>{h(JSON.parse(f),{replace:e,state:t,relative:r})},[h,f,r,e,t]),null}function g1(i){return n1(i.context)}function Kn(i){nn(!1,"A <Route> is only ever to be used as the child of <Routes> element, never rendered directly. Please wrap your <Route> in a <Routes>.")}function x1({basename:i="/",children:e=null,location:t,navigationType:r="POP",navigator:a,static:l=!1,useTransitions:c}){nn(!Ho(),"You cannot render a <Router> inside another <Router>. You should never have more than one in your app.");let h=i.replace(/^\/*/,"/"),d=k.useMemo(()=>({basename:h,navigator:a,static:l,useTransitions:c,future:{}}),[h,a,l,c]);typeof t=="string"&&(t=Bo(t));let{pathname:f="/",search:v="",hash:g="",state:p=null,key:y="default",mask:E}=t,b=k.useMemo(()=>{let M=Kr(f,h);return M==null?null:{location:{pathname:M,search:v,hash:g,state:p,key:y,mask:E},navigationType:r}},[h,f,v,g,p,y,r,E]);return Ui(b!=null,`<Router basename="${h}"> is not able to match the URL "${f}${v}${g}" because it does not start with the basename, so the <Router> won't render anything.`),b==null?null:k.createElement(Ei.Provider,{value:d},k.createElement(tc.Provider,{children:e,value:b}))}function v1({children:i,location:e}){return i1(gp(i),e)}function gp(i,e=[]){let t=[];return k.Children.forEach(i,(r,a)=>{if(!k.isValidElement(r))return;let l=[...e,a];if(r.type===k.Fragment){t.push.apply(t,gp(r.props.children,l));return}nn(r.type===Kn,`[${typeof r.type=="string"?r.type:r.type.name}] is not a <Route> component. All component children of <Routes> must be a <Route> or <React.Fragment>`),nn(!r.props.index||!r.props.children,"An index route cannot have child routes.");let c={id:r.props.id||l.join("-"),caseSensitive:r.props.caseSensitive,element:r.props.element,Component:r.props.Component,index:r.props.index,path:r.props.path,middleware:r.props.middleware,loader:r.props.loader,action:r.props.action,hydrateFallbackElement:r.props.hydrateFallbackElement,HydrateFallback:r.props.HydrateFallback,errorElement:r.props.errorElement,ErrorBoundary:r.props.ErrorBoundary,hasErrorBoundary:r.props.hasErrorBoundary===!0||r.props.ErrorBoundary!=null||r.props.errorElement!=null,shouldRevalidate:r.props.shouldRevalidate,handle:r.props.handle,lazy:r.props.lazy};r.props.children&&(c.children=gp(r.props.children,l)),t.push(c)}),t}var Wu="get",Xu="application/x-www-form-urlencoded";function vh(i){return typeof HTMLElement<"u"&&i instanceof HTMLElement}function _1(i){return vh(i)&&i.tagName.toLowerCase()==="button"}function y1(i){return vh(i)&&i.tagName.toLowerCase()==="form"}function S1(i){return vh(i)&&i.tagName.toLowerCase()==="input"}function M1(i){return!!(i.metaKey||i.altKey||i.ctrlKey||i.shiftKey)}function E1(i,e){return i.button===0&&(!e||e==="_self")&&!M1(i)}function xp(i=""){return new URLSearchParams(typeof i=="string"||Array.isArray(i)||i instanceof URLSearchParams?i:Object.keys(i).reduce((e,t)=>{let r=i[t];return e.concat(Array.isArray(r)?r.map(a=>[t,a]):[[t,r]])},[]))}function w1(i,e){let t=xp(i);return e&&e.forEach((r,a)=>{t.has(a)||e.getAll(a).forEach(l=>{t.append(a,l)})}),t}var pu=null;function b1(){if(pu===null)try{new FormData(document.createElement("form"),0),pu=!1}catch{pu=!0}return pu}var T1=new Set(["application/x-www-form-urlencoded","multipart/form-data","text/plain"]);function pf(i){return i!=null&&!T1.has(i)?(Ui(!1,`"${i}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${Xu}"`),null):i}function C1(i,e){let t,r,a,l,c;if(y1(i)){let h=i.getAttribute("action");r=h?Kr(h,e):null,t=i.getAttribute("method")||Wu,a=pf(i.getAttribute("enctype"))||Xu,l=new FormData(i)}else if(_1(i)||S1(i)&&(i.type==="submit"||i.type==="image")){let h=i.form;if(h==null)throw new Error('Cannot submit a <button> or <input type="submit"> without a <form>');let d=i.getAttribute("formaction")||h.getAttribute("action");if(r=d?Kr(d,e):null,t=i.getAttribute("formmethod")||h.getAttribute("method")||Wu,a=pf(i.getAttribute("formenctype"))||pf(h.getAttribute("enctype"))||Xu,l=new FormData(h,i),!b1()){let{name:f,type:v,value:g}=i;if(v==="image"){let p=f?`${f}.`:"";l.append(`${p}x`,"0"),l.append(`${p}y`,"0")}else f&&l.append(f,g)}}else{if(vh(i))throw new Error('Cannot submit element that is not <form>, <button>, or <input type="submit|image">');t=Wu,r=null,a=Xu,c=i}return l&&a==="text/plain"&&(c=l,l=void 0),{action:r,method:t.toLowerCase(),encType:a,formData:l,body:c}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");function bm(i,e){if(i===!1||i===null||typeof i>"u")throw new Error(e)}function X_(i,e,t,r){let a=typeof i=="string"?new URL(i,typeof window>"u"?"server://singlefetch/":window.location.origin):i;return t?a.pathname.endsWith("/")?a.pathname=`${a.pathname}_.${r}`:a.pathname=`${a.pathname}.${r}`:a.pathname==="/"?a.pathname=`_root.${r}`:e&&Kr(a.pathname,e)==="/"?a.pathname=`${rh(e)}/_root.${r}`:a.pathname=`${rh(a.pathname)}.${r}`,a}async function R1(i,e){if(i.id in e)return e[i.id];try{let t=await import(i.module);return e[i.id]=t,t}catch(t){return console.error(`Error loading route module \`${i.module}\`, reloading page...`),console.error(t),window.__reactRouterContext&&window.__reactRouterContext.isSpaMode,window.location.reload(),new Promise(()=>{})}}function A1(i){return i==null?!1:i.href==null?i.rel==="preload"&&typeof i.imageSrcSet=="string"&&typeof i.imageSizes=="string":typeof i.rel=="string"&&typeof i.href=="string"}async function P1(i,e,t){let r=await Promise.all(i.map(async a=>{let l=e.routes[a.route.id];if(l){let c=await R1(l,t);return c.links?c.links():[]}return[]}));return I1(r.flat(1).filter(A1).filter(a=>a.rel==="stylesheet"||a.rel==="preload").map(a=>a.rel==="stylesheet"?{...a,rel:"prefetch",as:"style"}:{...a,rel:"prefetch"}))}function Fx(i,e,t,r,a,l){let c=(d,f)=>t[f]?d.route.id!==t[f].route.id:!0,h=(d,f)=>{var v;return t[f].pathname!==d.pathname||((v=t[f].route.path)==null?void 0:v.endsWith("*"))&&t[f].params["*"]!==d.params["*"]};return l==="assets"?e.filter((d,f)=>c(d,f)||h(d,f)):l==="data"?e.filter((d,f)=>{var g;let v=r.routes[d.route.id];if(!v||!v.hasLoader)return!1;if(c(d,f)||h(d,f))return!0;if(d.route.shouldRevalidate){let p=d.route.shouldRevalidate({currentUrl:new URL(a.pathname+a.search+a.hash,window.origin),currentParams:((g=t[0])==null?void 0:g.params)||{},nextUrl:new URL(i,window.origin),nextParams:d.params,defaultShouldRevalidate:!0});if(typeof p=="boolean")return p}return!0}):[]}function N1(i,e,{includeHydrateFallback:t}={}){return L1(i.map(r=>{let a=e.routes[r.route.id];if(!a)return[];let l=[a.module];return a.clientActionModule&&(l=l.concat(a.clientActionModule)),a.clientLoaderModule&&(l=l.concat(a.clientLoaderModule)),t&&a.hydrateFallbackModule&&(l=l.concat(a.hydrateFallbackModule)),a.imports&&(l=l.concat(a.imports)),l}).flat(1))}function L1(i){return[...new Set(i)]}function D1(i){let e={},t=Object.keys(i).sort();for(let r of t)e[r]=i[r];return e}function I1(i,e){let t=new Set;return new Set(e),i.reduce((r,a)=>{let l=JSON.stringify(D1(a));return t.has(l)||(t.add(l),r.push({key:l,link:a})),r},[])}function Tm(){let i=k.useContext(Vo);return bm(i,"You must render this element inside a <DataRouterContext.Provider> element"),i}function U1(){let i=k.useContext(xh);return bm(i,"You must render this element inside a <DataRouterStateContext.Provider> element"),i}var Cm=k.createContext(void 0);Cm.displayName="FrameworkContext";function _h(){let i=k.useContext(Cm);return bm(i,"You must render this element inside a <HydratedRouter> element"),i}function F1(i,e){let t=k.useContext(Cm),[r,a]=k.useState(!1),[l,c]=k.useState(!1),{onFocus:h,onBlur:d,onMouseEnter:f,onMouseLeave:v,onTouchStart:g}=e,p=k.useRef(null);k.useEffect(()=>{if(i==="render"&&c(!0),i==="viewport"){let b=S=>{S.forEach(A=>{c(A.isIntersecting)})},M=new IntersectionObserver(b,{threshold:.5});return p.current&&M.observe(p.current),()=>{M.disconnect()}}},[i]),k.useEffect(()=>{if(r){let b=setTimeout(()=>{c(!0)},100);return()=>{clearTimeout(b)}}},[r]);let y=()=>{a(!0)},E=()=>{a(!1),c(!1)};return t?i!=="intent"?[l,p,{}]:[l,p,{onFocus:Cl(h,y),onBlur:Cl(d,E),onMouseEnter:Cl(f,y),onMouseLeave:Cl(v,E),onTouchStart:Cl(g,y)}]:[!1,p,{}]}function Cl(i,e){return t=>{i&&i(t),t.defaultPrevented||e(t)}}function k1({page:i,...e}){let t=XE(),{nonce:r}=_h(),{router:a}=Tm(),l=k.useMemo(()=>A_(a.routes,i,a.basename),[a.routes,i,a.basename]);return l?(e.nonce==null&&r&&(e={...e,nonce:r}),t?k.createElement(z1,{page:i,matches:l,...e}):k.createElement(B1,{page:i,matches:l,...e})):null}function O1(i){let{manifest:e,routeModules:t}=_h(),[r,a]=k.useState([]);return k.useEffect(()=>{let l=!1;return P1(i,e,t).then(c=>{l||a(c)}),()=>{l=!0}},[i,e,t]),r}function z1({page:i,matches:e,...t}){let r=Ji(),{future:a}=_h(),{basename:l}=Tm(),c=k.useMemo(()=>{if(i===r.pathname+r.search+r.hash)return[];let h=X_(i,l,a.v8_trailingSlashAwareDataRequests,"rsc"),d=!1,f=[];for(let v of e)typeof v.route.shouldRevalidate=="function"?d=!0:f.push(v.route.id);return d&&f.length>0&&h.searchParams.set("_routes",f.join(",")),[h.pathname+h.search]},[l,a.v8_trailingSlashAwareDataRequests,i,r,e]);return k.createElement(k.Fragment,null,c.map(h=>k.createElement("link",{key:h,rel:"prefetch",as:"fetch",href:h,...t})))}function B1({page:i,matches:e,...t}){let r=Ji(),{future:a,manifest:l,routeModules:c}=_h(),{basename:h}=Tm(),{loaderData:d,matches:f}=U1(),v=k.useMemo(()=>Fx(i,e,f,l,r,"data"),[i,e,f,l,r]),g=k.useMemo(()=>Fx(i,e,f,l,r,"assets"),[i,e,f,l,r]),p=k.useMemo(()=>{if(i===r.pathname+r.search+r.hash)return[];let b=new Set,M=!1;if(e.forEach(A=>{var C;let D=l.routes[A.route.id];!D||!D.hasLoader||(!v.some(I=>I.route.id===A.route.id)&&A.route.id in d&&((C=c[A.route.id])!=null&&C.shouldRevalidate)||D.hasClientLoader?M=!0:b.add(A.route.id))}),b.size===0)return[];let S=X_(i,h,a.v8_trailingSlashAwareDataRequests,"data");return M&&b.size>0&&S.searchParams.set("_routes",e.filter(A=>b.has(A.route.id)).map(A=>A.route.id).join(",")),[S.pathname+S.search]},[h,a.v8_trailingSlashAwareDataRequests,d,r,l,v,e,i,c]),y=k.useMemo(()=>N1(g,l),[g,l]),E=O1(g);return k.createElement(k.Fragment,null,p.map(b=>k.createElement("link",{key:b,rel:"prefetch",as:"fetch",href:b,...t})),y.map(b=>k.createElement("link",{key:b,rel:"modulepreload",href:b,...t})),E.map(({key:b,link:M})=>k.createElement("link",{key:b,nonce:t.nonce,...M,crossOrigin:M.crossOrigin??t.crossOrigin})))}function V1(...i){return e=>{i.forEach(t=>{typeof t=="function"?t(e):t!=null&&(t.current=e)})}}var H1=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";try{H1&&(window.__reactRouterVersion="7.18.0")}catch{}function G1({basename:i,children:e,useTransitions:t,window:r}){let a=k.useRef();a.current==null&&(a.current=vE({window:r,v5Compat:!0}));let l=a.current,[c,h]=k.useState({action:l.action,location:l.location}),d=k.useCallback(f=>{t===!1?h(f):k.startTransition(()=>h(f))},[t]);return k.useLayoutEffect(()=>l.listen(d),[l,d]),k.createElement(x1,{basename:i,children:e,location:c.location,navigationType:c.action,navigator:l,useTransitions:t})}var $_=k.forwardRef(function({onClick:e,discover:t="render",prefetch:r="none",relative:a,reloadDocument:l,replace:c,mask:h,state:d,target:f,to:v,preventScrollReset:g,viewTransition:p,defaultShouldRevalidate:y,...E},b){let{basename:M,navigator:S,useTransitions:A}=k.useContext(Ei),D=typeof v=="string"&&_m.test(v),C=F_(v,M);v=C.to;let I=JE(v,{relative:a}),L=Ji(),U=null;if(h){let $=gh(h,[],L.mask?L.mask.pathname:"/",!0);M!=="/"&&($.pathname=$.pathname==="/"?M:Yi([M,$.pathname])),U=S.createHref($)}let[w,N,H]=F1(r,E),V=X1(v,{replace:c,mask:h,state:d,target:f,preventScrollReset:g,relative:a,viewTransition:p,defaultShouldRevalidate:y,useTransitions:A});function X($){e&&e($),$.defaultPrevented||V($)}let j=!(C.isExternal||l),he=k.createElement("a",{...E,...H,href:(j?U:void 0)||C.absoluteURL||I,onClick:j?X:e,ref:V1(b,N),target:f,"data-discover":!D&&t==="render"?"true":void 0});return w&&!D?k.createElement(k.Fragment,null,he,k.createElement(k1,{page:I})):he});$_.displayName="Link";var xo=k.forwardRef(function({"aria-current":e="page",caseSensitive:t=!1,className:r="",end:a=!1,style:l,to:c,viewTransition:h,children:d,...f},v){let g=nc(c,{relative:f.relative}),p=Ji(),y=k.useContext(xh),{navigator:E,basename:b}=k.useContext(Ei),M=y!=null&&Z1(g)&&h===!0,S=E.encodeLocation?E.encodeLocation(g).pathname:g.pathname,A=p.pathname,D=y&&y.navigation&&y.navigation.location?y.navigation.location.pathname:null;t||(A=A.toLowerCase(),D=D?D.toLowerCase():null,S=S.toLowerCase()),D&&b&&(D=Kr(D,b)||D);const C=S!=="/"&&S.endsWith("/")?S.length-1:S.length;let I=A===S||!a&&A.startsWith(S)&&A.charAt(C)==="/",L=D!=null&&(D===S||!a&&D.startsWith(S)&&D.charAt(S.length)==="/"),U={isActive:I,isPending:L,isTransitioning:M},w=I?e:void 0,N;typeof r=="function"?N=r(U):N=[r,I?"active":null,L?"pending":null,M?"transitioning":null].filter(Boolean).join(" ");let H=typeof l=="function"?l(U):l;return k.createElement($_,{...f,"aria-current":w,className:N,ref:v,style:H,to:c,viewTransition:h},typeof d=="function"?d(U):d)});xo.displayName="NavLink";var j1=k.forwardRef(({discover:i="render",fetcherKey:e,navigate:t,reloadDocument:r,replace:a,state:l,method:c=Wu,action:h,onSubmit:d,relative:f,preventScrollReset:v,viewTransition:g,defaultShouldRevalidate:p,...y},E)=>{let{useTransitions:b}=k.useContext(Ei),M=Y1(),S=Q1(h,{relative:f}),A=c.toLowerCase()==="get"?"get":"post",D=typeof h=="string"&&_m.test(h),C=I=>{if(d&&d(I),I.defaultPrevented)return;I.preventDefault();let L=I.nativeEvent.submitter,U=(L==null?void 0:L.getAttribute("formmethod"))||c,w=()=>M(L||I.currentTarget,{fetcherKey:e,method:U,navigate:t,replace:a,state:l,relative:f,preventScrollReset:v,viewTransition:g,defaultShouldRevalidate:p});b&&t!==!1?k.startTransition(()=>w()):w()};return k.createElement("form",{ref:E,method:A,action:S,onSubmit:r?d:C,...y,"data-discover":!D&&i==="render"?"true":void 0})});j1.displayName="Form";function W1(i){return`${i} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function q_(i){let e=k.useContext(Vo);return nn(e,W1(i)),e}function X1(i,{target:e,replace:t,mask:r,state:a,preventScrollReset:l,relative:c,viewTransition:h,defaultShouldRevalidate:d,useTransitions:f}={}){let v=Mm(),g=Ji(),p=nc(i,{relative:c});return k.useCallback(y=>{if(E1(y,e)){y.preventDefault();let E=t!==void 0?t:jl(g)===jl(p),b=()=>v(i,{replace:E,mask:r,state:a,preventScrollReset:l,relative:c,viewTransition:h,defaultShouldRevalidate:d});f?k.startTransition(()=>b()):b()}},[g,v,p,t,r,a,e,i,l,c,h,d,f])}function $1(i){Ui(typeof URLSearchParams<"u","You cannot use the `useSearchParams` hook in a browser that does not support the URLSearchParams API. If you need to support Internet Explorer 11, we recommend you load a polyfill such as https://github.com/ungap/url-search-params.");let e=k.useRef(xp(i)),t=k.useRef(!1),r=Ji(),a=k.useMemo(()=>w1(r.search,t.current?null:e.current),[r.search]),l=Mm(),c=k.useCallback((h,d)=>{const f=xp(typeof h=="function"?h(new URLSearchParams(a)):h);t.current=!0,l("?"+f,d)},[l,a]);return[a,c]}var q1=0,K1=()=>`__${String(++q1)}__`;function Y1(){let{router:i}=q_("useSubmit"),{basename:e}=k.useContext(Ei),t=d1(),r=i.fetch,a=i.navigate;return k.useCallback(async(l,c={})=>{let{action:h,method:d,encType:f,formData:v,body:g}=C1(l,e);if(c.navigate===!1){let p=c.fetcherKey||K1();await r(p,t,c.action||h,{defaultShouldRevalidate:c.defaultShouldRevalidate,preventScrollReset:c.preventScrollReset,formData:v,body:g,formMethod:c.method||d,formEncType:c.encType||f,flushSync:c.flushSync})}else await a(c.action||h,{defaultShouldRevalidate:c.defaultShouldRevalidate,preventScrollReset:c.preventScrollReset,formData:v,body:g,formMethod:c.method||d,formEncType:c.encType||f,replace:c.replace,state:c.state,fromRouteId:t,flushSync:c.flushSync,viewTransition:c.viewTransition})},[r,a,e,t])}function Q1(i,{relative:e}={}){let{basename:t}=k.useContext(Ei),r=k.useContext(Zi);nn(r,"useFormAction must be used inside a RouteContext");let[a]=r.matches.slice(-1),l={...nc(i||".",{relative:e})},c=Ji();if(i==null){l.search=c.search;let h=new URLSearchParams(l.search),d=h.getAll("index");if(d.some(v=>v==="")){h.delete("index"),d.filter(g=>g).forEach(g=>h.append("index",g));let v=h.toString();l.search=v?`?${v}`:""}}return(!i||i===".")&&a.route.index&&(l.search=l.search?l.search.replace(/^\?/,"?index&"):"?index"),t!=="/"&&(l.pathname=l.pathname==="/"?t:Yi([t,l.pathname])),jl(l)}function Z1(i,{relative:e}={}){let t=k.useContext(z_);nn(t!=null,"`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?");let{basename:r}=q_("useViewTransitionState"),a=nc(i,{relative:e});if(!t.isTransitioning)return!1;let l=Kr(t.currentLocation.pathname,r)||t.currentLocation.pathname,c=Kr(t.nextLocation.pathname,r)||t.nextLocation.pathname;return ih(a.pathname,c)!=null||ih(a.pathname,l)!=null}/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J1=i=>i.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),K_=(...i)=>i.filter((e,t,r)=>!!e&&e.trim()!==""&&r.indexOf(e)===t).join(" ").trim();/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var ew={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tw=k.forwardRef(({color:i="currentColor",size:e=24,strokeWidth:t=2,absoluteStrokeWidth:r,className:a="",children:l,iconNode:c,...h},d)=>k.createElement("svg",{ref:d,...ew,width:e,height:e,stroke:i,strokeWidth:r?Number(t)*24/Number(e):t,className:K_("lucide",a),...h},[...c.map(([f,v])=>k.createElement(f,v)),...Array.isArray(l)?l:[l]]));/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gt=(i,e)=>{const t=k.forwardRef(({className:r,...a},l)=>k.createElement(tw,{ref:l,iconNode:e,className:K_(`lucide-${J1(i)}`,r),...a}));return t.displayName=`${i}`,t};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nw=gt("ArchiveRestore",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h2",key:"tvwodi"}],["path",{d:"M20 8v11a2 2 0 0 1-2 2h-2",key:"1gkqxj"}],["path",{d:"m9 15 3-3 3 3",key:"1pd0qc"}],["path",{d:"M12 12v9",key:"192myk"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iw=gt("Archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rw=gt("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y_=gt("Box",[["path",{d:"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",key:"hh9hay"}],["path",{d:"m3.3 7 8.7 5 8.7-5",key:"g66t2b"}],["path",{d:"M12 22V12",key:"d0xqtd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vp=gt("Boxes",[["path",{d:"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",key:"lc1i9w"}],["path",{d:"m7 16.5-4.74-2.85",key:"1o9zyk"}],["path",{d:"m7 16.5 5-3",key:"va8pkn"}],["path",{d:"M7 16.5v5.17",key:"jnp8gn"}],["path",{d:"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",key:"8zsnat"}],["path",{d:"m17 16.5-5-3",key:"8arw3v"}],["path",{d:"m17 16.5 4.74-2.85",key:"8rfmw"}],["path",{d:"M17 16.5v5.17",key:"k6z78m"}],["path",{d:"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",key:"1xygjf"}],["path",{d:"M12 8 7.26 5.15",key:"1vbdud"}],["path",{d:"m12 8 4.74-2.85",key:"3rx089"}],["path",{d:"M12 13.5V8",key:"1io7kd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q_=gt("Brush",[["path",{d:"m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08",key:"1styjt"}],["path",{d:"M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z",key:"z0l1mu"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zs=gt("Camera",[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",key:"1tc9qg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sw=gt("ChartLine",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aw=gt("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ow=gt("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lw=gt("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cw=gt("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yh=gt("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _p=gt("CircleSlash",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"9",x2:"15",y1:"15",y2:"9",key:"1dfufj"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uw=gt("Crop",[["path",{d:"M6 2v14a2 2 0 0 0 2 2h14",key:"ron5a4"}],["path",{d:"M18 22V8a2 2 0 0 0-2-2H2",key:"7s9ehn"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hw=gt("Crosshair",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"22",x2:"18",y1:"12",y2:"12",key:"l9bcsi"}],["line",{x1:"6",x2:"2",y1:"12",y2:"12",key:"13hhkx"}],["line",{x1:"12",x2:"12",y1:"6",y2:"2",key:"10w3f3"}],["line",{x1:"12",x2:"12",y1:"22",y2:"18",key:"15g9kq"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dw=gt("Crown",[["path",{d:"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",key:"1vdc57"}],["path",{d:"M5 21h14",key:"11awu3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fw=gt("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kx=gt("Eraser",[["path",{d:"m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21",key:"182aya"}],["path",{d:"M22 21H7",key:"t4ddhn"}],["path",{d:"m5 11 9 9",key:"1mo9qw"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pw=gt("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ox=gt("Hammer",[["path",{d:"m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9",key:"eefl8a"}],["path",{d:"m18 15 4-4",key:"16gjal"}],["path",{d:"m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5",key:"b7pghm"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mw=gt("Hand",[["path",{d:"M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2",key:"1fvzgz"}],["path",{d:"M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2",key:"1kc0my"}],["path",{d:"M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8",key:"10h0bg"}],["path",{d:"M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",key:"1s1gnw"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gw=gt("Image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xw=gt("Images",[["path",{d:"M18 22H4a2 2 0 0 1-2-2V6",key:"pblm9e"}],["path",{d:"m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18",key:"nf6bnh"}],["circle",{cx:"12",cy:"8",r:"2",key:"1822b1"}],["rect",{width:"16",height:"16",x:"6",y:"2",rx:"2",key:"12espp"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ha=gt("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sh=gt("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zx=gt("Plug",[["path",{d:"M12 22v-5",key:"1ega77"}],["path",{d:"M9 8V2",key:"14iosj"}],["path",{d:"M15 8V2",key:"18g5xt"}],["path",{d:"M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z",key:"osxo6l"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vw=gt("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z_=gt("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _w=gt("RotateCw",[["path",{d:"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",key:"1p45f6"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J_=gt("Save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ey=gt("ScanEye",[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2",key:"aa7l1z"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2",key:"4qcy5o"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2",key:"6vwrx8"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2",key:"ioqczr"}],["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["path",{d:"M18.944 12.33a1 1 0 0 0 0-.66 7.5 7.5 0 0 0-13.888 0 1 1 0 0 0 0 .66 7.5 7.5 0 0 0 13.888 0",key:"11ak4c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ty=gt("Scissors",[["circle",{cx:"6",cy:"6",r:"3",key:"1lh9wr"}],["path",{d:"M8.12 8.12 12 12",key:"1alkpv"}],["path",{d:"M20 4 8.12 15.88",key:"xgtan2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["path",{d:"M14.8 14.8 20 20",key:"ptml3r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ny=gt("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yw=gt("Settings2",[["path",{d:"M20 7h-9",key:"3s1dr2"}],["path",{d:"M14 17H5",key:"gfn3mx"}],["circle",{cx:"17",cy:"17",r:"3",key:"18b49y"}],["circle",{cx:"7",cy:"7",r:"3",key:"dfmy0x"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sw=gt("SquarePen",[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",key:"1m0v6g"}],["path",{d:"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",key:"ohrbg2"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iy=gt("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ic=gt("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sh=gt("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ry=gt("Undo2",[["path",{d:"M9 14 4 9l5-5",key:"102s5s"}],["path",{d:"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11",key:"f3b9sd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yp=gt("WandSparkles",[["path",{d:"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72",key:"ul74o6"}],["path",{d:"m14 7 3 3",key:"1r5n42"}],["path",{d:"M5 6v4",key:"ilb8ba"}],["path",{d:"M19 14v4",key:"blhpug"}],["path",{d:"M10 2v2",key:"7u0qdc"}],["path",{d:"M7 8H3",key:"zfb6yr"}],["path",{d:"M21 16h-4",key:"1cnmox"}],["path",{d:"M11 3H9",key:"1obp7u"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mw=gt("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);async function Ft(i,e){var r;const t=await fetch(i,e);if(!t.ok){let a="";try{a=((r=await t.json())==null?void 0:r.detail)??""}catch{}throw new Error(a||`HTTP ${t.status} (${i})`)}return t.json()}const Ct=(i,e)=>Ft(i,{method:"POST",headers:{"Content-Type":"application/json"},body:e!==void 0?JSON.stringify(e):void 0}),Wl=i=>Ft(i,{method:"DELETE"}),ah=["empty","wP","wN","wB","wR","wQ","wK","bP","bN","bB","bR","bQ","bK","occluded"],Ew={K:"♚",Q:"♛",R:"♜",B:"♝",N:"♞",P:"♟"};function dr({label:i,className:e=""}){if(i==="empty")return x.jsx("span",{className:`text-zinc-500 ${e}`,children:"·"});if(i==="occluded")return x.jsx("span",{className:`text-amber-300 ${e}`,children:"▦"});const t=Ew[i==null?void 0:i[1]]??i,r=(i==null?void 0:i[0])==="w";return x.jsx("span",{className:e,style:{color:r?"#fafafa":"#0a0a0a",textShadow:r?"0 0 1px #000, 0 1px 2px #000":"0 0 1px #fff, 0 1px 2px #fff"},children:t})}function It({title:i,right:e,children:t,className:r=""}){return x.jsxs("div",{className:`rounded-xl border border-zinc-800 bg-zinc-900 p-4 ${r}`,children:[(i||e)&&x.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[i&&x.jsx("h2",{className:"text-xs font-medium uppercase tracking-wide text-zinc-400",children:i}),e]}),t]})}function mt({children:i,variant:e="ghost",className:t="",onClick:r,disabled:a,...l}){const[c,h]=k.useState(!1),d=e==="primary"?"bg-sky-500 text-zinc-950 hover:bg-sky-400 font-medium":"bg-zinc-800 text-zinc-200 hover:bg-zinc-700";async function f(v){if(!r)return;const g=r(v);if(g&&typeof g.then=="function"){h(!0);try{await g}finally{h(!1)}}}return x.jsxs("button",{...l,onClick:f,disabled:a||c,className:`relative inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm transition
        disabled:cursor-not-allowed disabled:opacity-40 ${d} ${t}`,children:[x.jsx("span",{className:`inline-flex items-center gap-2 ${c?"invisible":""}`,children:i}),c&&x.jsx(ha,{className:"absolute h-4 w-4 animate-spin"})]})}function fr({label:i,children:e,...t}){return x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:[i,x.jsx("select",{...t,className:"rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",children:e})]})}function ww(){const[i,e]=k.useState("default"),[t,r]=k.useState(800),[a,l]=k.useState(0),[c,h]=k.useState(.06),[d,f]=k.useState(!1),[v,g]=k.useState({markers_found:!1}),[p,y]=k.useState(""),[E,b]=k.useState(""),M=k.useRef(null);k.useEffect(()=>()=>{A()},[]);function S(){f(!0),clearInterval(M.current),M.current=setInterval(()=>Ft("/api/camera/status").then(g).catch(()=>{}),1e3)}async function A(){f(!1),clearInterval(M.current);try{await Ct("/api/camera/release")}catch{}}function D(U){h(U),Ct("/api/calibrate/margin",{margin:U}).catch(()=>{})}async function C(){try{const U=await Ct("/api/calibrate/save",{profile:i,board_size:t,margin:c,camera:a});b(`Gespeichert: Profil „${U.profile}" (margin ${U.margin.toFixed(3)}) ✓`)}catch(U){b("Fehler: "+U.message)}}async function I(){const U=await Ct("/api/calibrate/markers");y(U.url+"?t="+Date.now())}const L="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";return x.jsxs("div",{className:"space-y-4",children:[x.jsx(It,{children:x.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Profil",x.jsx("input",{value:i,onChange:U=>e(U.target.value),className:`${L} w-28`})]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Kamera",x.jsx("input",{type:"number",value:a,onChange:U=>l(+U.target.value),className:`${L} w-16`})]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Board px",x.jsx("input",{type:"number",value:t,onChange:U=>r(+U.target.value),className:`${L} w-24`})]}),d?x.jsxs(mt,{onClick:A,children:[x.jsx(_p,{className:"h-4 w-4"})," Stop"]}):x.jsxs(mt,{variant:"primary",onClick:S,children:[x.jsx(zs,{className:"h-4 w-4"})," Kamera starten"]}),x.jsxs(mt,{onClick:I,children:[x.jsx(vw,{className:"h-4 w-4"})," Marker erzeugen"]})]})}),x.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_300px]",children:[x.jsx(It,{title:"Live-Kamera",children:d?x.jsx("img",{src:`/api/camera/calibrate.mjpg?camera=${a}&board_size=${t}`,className:"w-full rounded-lg border border-zinc-800"}):x.jsx("div",{className:"flex h-72 items-center justify-center text-zinc-500",children:"Kamera nicht gestartet"})}),x.jsx(It,{title:"Spielfeld-Box justieren",children:x.jsxs("div",{className:"space-y-3",children:[v.markers_found?x.jsxs("span",{className:"flex items-center gap-1.5 text-green-500",children:[x.jsx(yh,{className:"h-4 w-4"})," ",v.markers_count,"/4 Marker erkannt",v.markers_held?` (${v.markers_held} gehalten)`:""]}):x.jsxs("span",{className:"flex items-center gap-1.5 text-amber-400",children:[x.jsx(_p,{className:"h-4 w-4"})," ",v.markers_count||0,"/4 Marker — alle 4 nötig (kurz die Hand wegnehmen)"]}),x.jsx("input",{type:"range",min:0,max:.2,step:.005,value:c,disabled:!d,onChange:U=>D(+U.target.value),className:"w-full accent-sky-500"}),x.jsxs("div",{className:"text-sm text-zinc-400",children:["margin = ",x.jsx("b",{className:"text-zinc-100 tabular-nums",children:c.toFixed(3)})]}),x.jsx("p",{className:"text-xs text-zinc-500",children:"🟧 Marker-Box außen · 🟩 grüne Box = Spielfeld. Schieber so einstellen, dass die grüne Box auf dem echten Karofeld liegt."}),x.jsxs(mt,{variant:"primary",onClick:C,disabled:!d||!v.markers_found,children:[x.jsx(J_,{className:"h-4 w-4"})," Kalibrierung speichern"]}),x.jsx("div",{className:"text-xs text-zinc-500",children:E})]})})]}),p&&x.jsx(It,{title:"Marker-Blatt — drucken, an den Boxen schneiden, an die 4 Außenecken kleben",children:x.jsx("img",{src:p,className:"max-w-md rounded-lg border border-zinc-800 bg-white p-2"})})]})}const vs="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";function bw(){const[i,e]=k.useState("random"),[t,r]=k.useState(40),[a,l]=k.useState(1),[c,h]=k.useState(20),[d,f]=k.useState(1),[v,g]=k.useState("special"),[p,y]=k.useState(!0),[E,b]=k.useState(0),[M,S]=k.useState(!0),[A,D]=k.useState("default"),[C,I]=k.useState(0),L=i==="coverage",U=i==="sweep",[w,N]=k.useState({active:!1}),[H,V]=k.useState(""),X=k.useRef(null);k.useEffect(()=>(Ft("/api/collect/state").then(N).catch(()=>{}),()=>clearInterval(X.current)),[]);const j=()=>Ft("/api/collect/state").then(N).catch(()=>{});async function he(){V("");try{const Y=await Ct("/api/collect/start",{strategy:i,max_plies:t,profile:A,camera:C,sets:a,count:c,passes:d,pieces:v,together:p,offset:E,auto_offset:M});N(Y),clearInterval(X.current),X.current=setInterval(j,1500)}catch(Y){V("Fehler: "+Y.message)}}const $=async()=>N(await Ct("/api/collect/shoot")),oe=async()=>N(await Ct("/api/collect/skip")),Q=async()=>N(await Ct("/api/collect/undo"));async function q(){const Y=await Ct("/api/collect/finish");clearInterval(X.current),N({active:!1}),V(`Session beendet: ${Y.captures} Aufnahmen, ${Y.sliced??0} Crops gesliced → Tab „Datensätze".`)}return x.jsxs("div",{className:"space-y-4",children:[x.jsx(It,{children:x.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[x.jsxs(fr,{label:"Engine",value:i,onChange:Y=>e(Y.target.value),children:[x.jsx("option",{value:"random",children:"random (eingebaut)"}),x.jsx("option",{value:"stockfish",children:"stockfish (automatisch erkannt)"}),x.jsx("option",{value:"coverage",children:"coverage (gegen seltene Klassen)"}),x.jsx("option",{value:"sweep",children:"sweep (Figuren laufen übers Brett)"})]}),L?x.jsxs(x.Fragment,{children:[x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Anzahl physischer Figurensätze: mit 2 Sätzen kommen Damen/Könige doppelt so schnell zusammen.",children:["Sätze",x.jsx("input",{type:"number",min:1,value:a,onChange:Y=>l(+Y.target.value),className:`${vs} w-16`})]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Anzahl dichter Aufbauten, die gegen deine schwächsten Klassen erzeugt werden.",children:["Aufbauten",x.jsx("input",{type:"number",min:1,value:c,onChange:Y=>h(+Y.target.value),className:`${vs} w-20`})]})]}):U?x.jsxs(x.Fragment,{children:[x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Welche Figuren übers Brett wandern: special = Nicht-Bauern (K,Q,R,B,N), pawn = nur Bauern, all = alle.",children:["Figuren",x.jsxs(fr,{label:"",value:v,onChange:Y=>g(Y.target.value),children:[x.jsx("option",{value:"special",children:"special (K,Q,R,B,N)"}),x.jsx("option",{value:"pawn",children:"pawn (Bauern)"}),x.jsx("option",{value:"all",children:"all"})]})]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Wiederholungen (je Pass 8 Fotos, Rang 1–8) — z.B. mit anderem Licht. Keine Figuren-Umstellung.",children:["Pässe",x.jsx("input",{type:"number",min:1,value:d,onChange:Y=>f(+Y.target.value),className:`${vs} w-16`})]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Anzahl physischer Figurensätze: mit 2 Sätzen sind doppelt so viele Figuren je Foto möglich.",children:["Sätze",x.jsx("input",{type:"number",min:1,value:a,onChange:Y=>l(+Y.target.value),className:`${vs} w-16`})]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Weiß und Schwarz gleichzeitig aufs Brett (Weiß vorne, Schwarz 4 Ränge versetzt) → halbe Fotozahl, jedes Feld bekommt beide Farben.",children:[x.jsx("input",{type:"checkbox",checked:p,onChange:Y=>y(Y.target.checked)})," beide Farben gleichzeitig"]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Offset automatisch: zählt bisherige Sweep-Sessions und nimmt den nächsten Offset → jede Figur landet über mehrere Sessions auf verschiedenen Linien (gegen Positions-Overfitting).",children:[x.jsx("input",{type:"checkbox",checked:M,onChange:Y=>S(Y.target.checked)})," Offset auto"]}),!M&&x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Verschiebt die Linien→Figur-Zuordnung, fix für diese Session. 0: a=König,b=Dame,…  1: a=Dame,b=Turm,…",children:["Offset",x.jsx("input",{type:"number",min:0,max:7,value:E,onChange:Y=>b(+Y.target.value),className:`${vs} w-16`})]})]}):x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Halbzüge",x.jsx("input",{type:"number",value:t,onChange:Y=>r(+Y.target.value),className:`${vs} w-20`})]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Profil",x.jsx("input",{value:A,onChange:Y=>D(Y.target.value),className:`${vs} w-28`})]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Kamera",x.jsx("input",{type:"number",value:C,onChange:Y=>I(+Y.target.value),className:`${vs} w-16`})]}),w.active?x.jsxs(mt,{onClick:q,children:[x.jsx(yh,{className:"h-4 w-4"})," Fertig"]}):x.jsxs(mt,{variant:"primary",onClick:he,children:[x.jsx(Sh,{className:"h-4 w-4"})," Partie starten"]}),x.jsx("span",{className:"text-xs text-zinc-500",children:H})]})}),w.active&&x.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_320px]",children:[x.jsx(It,{title:"Live-Kamera",children:x.jsx("img",{src:"/api/camera/collect.mjpg",className:"w-full rounded-lg border border-zinc-800"})}),x.jsx(It,{title:"Aufnahme",children:x.jsxs("div",{className:"space-y-3",children:[w.done?x.jsxs("div",{className:"font-medium text-green-500",children:["✓ Alle ",w.n_positions," Stellungen aufgenommen."]}):x.jsxs(x.Fragment,{children:[x.jsxs("div",{className:"text-sm text-zinc-400",children:[w.build_target?"Aufbau":"Stellung"," ",x.jsx("b",{className:"text-zinc-100",children:Math.min(w.index+1,w.n_positions)})," / ",w.n_positions,w.build_target&&w.gains?x.jsxs("span",{className:"ml-1 text-xs text-zinc-500",children:["· ",w.gains," Ziel-Felder"]}):null]}),x.jsxs("div",{className:"rounded-lg bg-zinc-800 p-3 text-sm",children:[w.build_target?x.jsxs(x.Fragment,{children:["Stellung ",x.jsx("b",{children:"frisch aufbauen"})," — die ",x.jsx("b",{className:"text-sky-300",children:"Figurennamen"})," sind ins Live-Bild eingeblendet (weiß = helle Schrift, schwarz = dunkle),"]}):w.index===0?x.jsxs(x.Fragment,{children:["Brett in die ",x.jsx("b",{children:"Startstellung"})," bringen,"]}):x.jsxs(x.Fragment,{children:["Diesen Zug ziehen: ",x.jsx("b",{className:"text-base text-sky-300",children:w.move_san})," ",x.jsx("span",{className:"text-zinc-400",children:"(roter Pfeil)"}),","]}),x.jsxs("div",{className:"mt-1 text-xs text-zinc-400",children:["…dann ",x.jsx("b",{children:"Foto"}),w.build_target?x.jsx(x.Fragment,{children:" (gern mehrere mit wechselndem Licht)"}):null,"."]})]})]}),x.jsxs("div",{className:"text-sm",children:["Aufnahmen: ",x.jsx("b",{className:"text-sky-400",children:w.captures}),x.jsx("span",{className:"ml-1 text-xs text-green-500",children:"· sofort gespeichert ✓"})]}),x.jsxs("div",{className:"flex flex-wrap gap-2",children:[!w.done&&x.jsxs(mt,{variant:"primary",onClick:$,className:"px-5 py-2.5 text-base",children:[x.jsx(zs,{className:"h-5 w-5"})," Foto"]}),!w.done&&x.jsxs(mt,{onClick:oe,children:[x.jsx(rw,{className:"h-4 w-4"})," Überspringen"]}),x.jsxs(mt,{onClick:Q,children:[x.jsx(ry,{className:"h-4 w-4"})," Undo"]})]}),x.jsxs("p",{className:"text-xs text-zinc-500",children:["Jede Aufnahme ist ",x.jsx("b",{children:"sofort gespeichert"}),' — du kannst jederzeit „Fertig" (oben) drücken oder einfach aufhören; nichts geht verloren.']})]})})]}),x.jsxs("p",{className:"text-xs text-zinc-500",children:['Nach „Fertig" wird die Session automatisch gesliced. Kuratierte Datensätze (Dedup, Rotation, Split) baust du im Tab ',x.jsx("b",{className:"text-zinc-300",children:"Datensätze"}),"."]})]})}const Tw="abcdefgh".split(""),Cw=[8,7,6,5,4,3,2,1],Bx="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",sy={empty:"empty leer frei",occluded:"occluded verdeckt hand objekt verdeckung",wP:"white pawn weiss weißer bauer",wN:"white knight weiss weißer springer pferd",wB:"white bishop weiss weißer läufer",wR:"white rook weiss weißer turm",wQ:"white queen weiss weiße dame",wK:"white king weiss weißer könig",bP:"black pawn schwarz schwarzer bauer",bN:"black knight schwarz schwarzer springer pferd",bB:"black bishop schwarz schwarzer läufer",bR:"black rook schwarz schwarzer turm",bQ:"black queen schwarz schwarze dame",bK:"black king schwarz schwarzer könig"},Rw=(i,e)=>!e||i.toLowerCase().includes(e)||(sy[i]||"").includes(e);function Aw(){const[i,e]=k.useState("default"),[t,r]=k.useState(0),[a,l]=k.useState({active:!1}),[c,h]=k.useState({}),[d,f]=k.useState("wP"),[v,g]=k.useState(null),[p,y]=k.useState(""),[E,b]=k.useState(""),M=k.useRef(null);k.useEffect(()=>{Ft("/api/manual/state").then(l).catch(()=>{})},[]);const S=Object.keys(c).length,A=ah.filter(N=>Rw(N,p.trim().toLowerCase()));function D(N,H){h(V=>{const X={...V};return H==="empty"?delete X[N]:X[N]=H,X}),g(null),y("")}function C(N,H){if(d){D(N,d===c[N]?"empty":d);return}const V=H.currentTarget.getBoundingClientRect();y(""),g({square:N,x:V.left,y:V.bottom+4})}async function I(){b("");try{l(await Ct("/api/manual/start",{profile:i,camera:t}))}catch(N){b("Fehler: "+N.message)}}async function L(){S===0&&!window.confirm("Keine Figur markiert — als komplett leeres Brett aufnehmen?")||l(await Ct("/api/manual/capture",{labels:c}))}const U=async()=>l(await Ct("/api/manual/undo"));async function w(){const N=await Ct("/api/manual/finish");l({active:!1}),h({}),b(`Session beendet: ${N.captures} Aufnahmen, ${N.sliced??0} Crops → Tab „Datensätze" / „Review".`)}return x.jsxs("div",{className:"space-y-4",children:[x.jsxs(It,{children:[x.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Profil",x.jsx("input",{value:i,onChange:N=>e(N.target.value),className:`${Bx} w-28`})]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Kamera",x.jsx("input",{type:"number",value:t,onChange:N=>r(+N.target.value),className:`${Bx} w-16`})]}),a.active?x.jsxs(mt,{onClick:w,children:[x.jsx(yh,{className:"h-4 w-4"})," Fertig"]}):x.jsxs(mt,{variant:"primary",onClick:I,children:[x.jsx(Sh,{className:"h-4 w-4"})," Sitzung starten"]}),x.jsx("span",{className:"text-xs text-zinc-500",children:E})]}),x.jsxs("div",{className:"mt-3 flex flex-wrap items-center gap-1",children:[x.jsxs("span",{className:"mr-1 inline-flex items-center gap-1 text-xs text-zinc-500",children:[x.jsx(Q_,{className:"h-3.5 w-3.5"})," Pinsel:"]}),x.jsx("button",{onClick:()=>f(null),className:`rounded px-2 py-1 text-xs ${d===null?"bg-sky-600 text-white":"bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`,children:"aus (Suchfeld)"}),ah.map(N=>x.jsx("button",{onClick:()=>f(H=>H===N?null:N),title:N,className:`flex h-8 w-8 items-center justify-center rounded text-xl leading-none ${d===N?"bg-sky-600 ring-2 ring-sky-300":"bg-zinc-800 hover:bg-zinc-700"}`,children:N==="empty"?x.jsx(kx,{className:"h-4 w-4 text-zinc-400"}):x.jsx(dr,{label:N})},N))]}),x.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:[a.active?d?`Pinsel „${d}" aktiv — Feld anklicken setzt (nochmal = leeren).`:"Feld anklicken → Suchfeld. ":"Starten, dann Figuren aufs reale Brett stellen und die belegten Felder markieren."," ","Nicht markierte Felder zählen als ",x.jsx("b",{children:"leer"}),'. Labels bleiben nach „Aufnehmen" erhalten → mehrere Frames mit wechselndem Licht.']})]}),a.active&&x.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_300px]",children:[x.jsx(It,{title:"Live-Brett — Felder anklicken zum Labeln",children:x.jsxs("div",{ref:M,className:"relative mx-auto w-full max-w-[680px]",children:[x.jsx("img",{src:"/api/camera/manual.mjpg",className:"block w-full rounded-lg border border-zinc-800"}),x.jsx("div",{className:"absolute inset-0 grid grid-cols-8",children:Cw.map(N=>Tw.map(H=>{const V=H+N,X=c[V];return x.jsxs("button",{onClick:j=>C(V,j),className:`group relative flex items-center justify-center border border-transparent hover:border-sky-400/70 ${(v==null?void 0:v.square)===V?"border-sky-300":""}`,children:[X&&x.jsx("span",{className:"text-2xl drop-shadow-[0_0_2px_rgba(0,0,0,0.9)]",children:x.jsx(dr,{label:X})}),x.jsx("span",{className:"pointer-events-none absolute left-0.5 top-0.5 hidden rounded bg-black/55 px-1 text-[9px] text-zinc-300 group-hover:block",children:V})]},V)}))})]})}),x.jsx(It,{title:"Aufnahme",children:x.jsxs("div",{className:"space-y-3",children:[x.jsxs("div",{className:"text-sm text-zinc-400",children:["Markiert: ",x.jsx("b",{className:"text-sky-400",children:S})," Figur(en)"]}),x.jsxs("div",{className:"text-sm",children:["Aufnahmen: ",x.jsx("b",{className:"text-sky-400",children:a.captures??0}),x.jsx("span",{className:"ml-1 text-xs text-green-500",children:"· sofort gespeichert ✓"})]}),x.jsxs("div",{className:"flex flex-wrap gap-2",children:[x.jsxs(mt,{variant:"primary",onClick:L,className:"px-5 py-2.5 text-base",children:[x.jsx(zs,{className:"h-5 w-5"})," Aufnehmen"]}),x.jsxs(mt,{onClick:()=>h({}),children:[x.jsx(kx,{className:"h-4 w-4"})," Alles leeren"]}),x.jsxs(mt,{onClick:U,children:[x.jsx(ry,{className:"h-4 w-4"})," Undo"]})]}),x.jsxs("p",{className:"text-xs text-zinc-500",children:["Jede Aufnahme ist ",x.jsx("b",{children:"sofort gespeichert"}),' und wird nach „Fertig" automatisch gesliced. Feinkorrektur (z. B. ',x.jsx("b",{children:"occluded"}),") im Tab ",x.jsx("b",{children:"Review"}),"."]})]})})]}),v&&x.jsxs(x.Fragment,{children:[x.jsx("div",{className:"fixed inset-0 z-40",onClick:()=>{g(null),y("")}}),x.jsxs("div",{className:"fixed z-50 w-56 rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-xl",style:{left:Math.min(v.x,window.innerWidth-240),top:Math.min(v.y,window.innerHeight-320)},children:[x.jsxs("div",{className:"mb-1 text-xs text-zinc-400",children:["Feld ",x.jsx("b",{className:"text-zinc-200",children:v.square})]}),x.jsxs("div",{className:"mb-1 flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2",children:[x.jsx(ny,{className:"h-3.5 w-3.5 text-zinc-500"}),x.jsx("input",{autoFocus:!0,value:p,onChange:N=>y(N.target.value),onKeyDown:N=>{N.key==="Enter"&&A[0]&&D(v.square,A[0]),N.key==="Escape"&&(g(null),y(""))},placeholder:"suchen: könig, bN, leer…",className:"w-full bg-transparent py-1.5 text-sm text-zinc-100 outline-none"})]}),x.jsx("div",{className:"max-h-56 overflow-auto",children:A.length===0?x.jsx("div",{className:"px-2 py-1.5 text-xs text-zinc-500",children:"nichts gefunden"}):A.map(N=>x.jsxs("button",{onClick:()=>D(v.square,N),className:`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-800 ${c[v.square]===N||N==="empty"&&!c[v.square]?"bg-zinc-800 text-sky-300":"text-zinc-200"}`,children:[x.jsx("span",{className:"w-5 text-center text-lg",children:N==="empty"?"·":x.jsx(dr,{label:N})}),x.jsx("span",{className:"font-mono text-xs text-zinc-400",children:N}),x.jsx("span",{className:"ml-auto text-[11px] text-zinc-500",children:(sy[N]||"").split(" ").slice(2,4).join(" ")})]},N))})]})]})]})}const mo="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-sky-500",mf=({isActive:i})=>`rounded-lg px-3 py-1.5 text-sm transition ${i?"bg-zinc-800 text-zinc-100":"text-zinc-400 hover:text-zinc-100"}`;function Pw(){return x.jsxs("div",{className:"space-y-4",children:[x.jsxs("nav",{className:"flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5",children:[x.jsx(xo,{to:"sessions",className:mf,children:"Sessions"}),x.jsx(xo,{to:"kuratiert",className:mf,children:"Kuratierte Datensätze"}),x.jsx(xo,{to:"statistik",className:mf,children:"Statistik"})]}),x.jsx(g1,{})]})}const ay=()=>{const i=mh();return(...e)=>e.forEach(t=>i.invalidateQueries({queryKey:[t]}))};function Nw(){const i=ay(),[e,t]=k.useState(""),a=gr({queryKey:["sessions-manage"],queryFn:()=>Ft("/api/sessions/manage")}).data??[],l=g=>{t(g),i("sessions-manage","stats","datasets")},c=g=>t("Fehler: "+g.message),h=jr({mutationFn:g=>Ct(`/api/sessions/${g}/slice`),onSuccess:g=>l(`„${g.session}" gesliced: ${g.crops} Crops.`),onError:c}),d=jr({mutationFn:g=>Ct(`/api/sessions/${g}/archive`),onSuccess:()=>l("archiviert."),onError:c}),f=jr({mutationFn:g=>Ct(`/api/sessions/${g}/restore`),onSuccess:()=>l("wiederhergestellt — neu slicen."),onError:c}),v=jr({mutationFn:g=>Wl(`/api/sessions/${g}`),onSuccess:()=>l("gelöscht."),onError:c});return x.jsx(It,{title:"Sessions (Rohmaterial)",right:x.jsxs("span",{className:"text-xs text-zinc-500",children:[a.length," Session(s) · ",e]}),children:a.length===0?x.jsx("span",{className:"text-sm text-zinc-500",children:'Noch keine Sessions — im Tab „Sammeln" aufnehmen.'}):x.jsxs("table",{className:"w-full text-sm",children:[x.jsx("thead",{children:x.jsxs("tr",{className:"text-zinc-500",children:[x.jsx("th",{className:"text-left font-normal",children:"Session"}),x.jsx("th",{className:"text-left font-normal",children:"Modus"}),x.jsx("th",{className:"text-right font-normal",children:"Frames"}),x.jsx("th",{className:"text-right font-normal",children:"Crops"}),x.jsx("th",{className:"text-right font-normal",children:"Aktion"})]})}),x.jsx("tbody",{children:a.map(g=>x.jsxs("tr",{className:"border-t border-zinc-800",children:[x.jsxs("td",{className:"py-1.5 text-zinc-200",children:[g.session_id,g.archived&&x.jsx("span",{className:"ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300",children:"archiviert"}),!g.archived&&g.n_crops===0&&x.jsx("span",{className:"ml-2 rounded bg-amber-900/60 px-1.5 py-0.5 text-[10px] text-amber-300",children:"nicht gesliced"})]}),x.jsx("td",{className:"text-zinc-400",children:g.mode??"—"}),x.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:g.n_frames}),x.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:g.archived?"—":g.n_crops}),x.jsx("td",{className:"py-1",children:x.jsxs("div",{className:"flex justify-end gap-1.5",children:[!g.archived&&x.jsxs(mt,{onClick:()=>h.mutate(g.session_id),className:"px-2 py-1 text-xs",children:[x.jsx(ty,{className:"h-3.5 w-3.5"})," ",g.n_crops?"Neu slicen":"Slicen"]}),g.archived?x.jsxs(mt,{onClick:()=>f.mutate(g.session_id),className:"px-2 py-1 text-xs",children:[x.jsx(nw,{className:"h-3.5 w-3.5"})," Wiederherstellen"]}):x.jsxs(mt,{onClick:()=>d.mutate(g.session_id),className:"px-2 py-1 text-xs",children:[x.jsx(iw,{className:"h-3.5 w-3.5"})," Archivieren"]}),x.jsxs(mt,{onClick:()=>window.confirm(`Session „${g.session_id}" endgültig löschen?`)&&v.mutate(g.session_id),className:"px-2 py-1 text-xs text-red-300 hover:text-red-200",children:[x.jsx(ic,{className:"h-3.5 w-3.5"})," Löschen"]})]})})]},g.session_id))})]})})}function Lw(){const i=ay(),[e,t]=k.useState(""),[r,a]=k.useState(!1),[l,c]=k.useState(""),[h,d]=k.useState({}),[f,v]=k.useState(4),[g,p]=k.useState(!0),[y,E]=k.useState(6),[b,M]=k.useState(!0),[S,A]=k.useState(.15),[D,C]=k.useState(.15),I=gr({queryKey:["sessions-manage"],queryFn:()=>Ft("/api/sessions/manage")}),L=gr({queryKey:["datasets"],queryFn:()=>Ft("/api/datasets")}),U=(I.data??[]).filter(j=>!j.archived),w=L.data??[],N=jr({mutationFn:j=>Ct("/api/datasets",j),onSuccess:j=>{t(`„${j.name}" gebaut: roh ${j.counts.raw} → dedup ${j.counts.after_dedup} → final ${j.counts.final}.`),a(!1),c(""),d({}),i("datasets","stats")},onError:j=>t("Fehler: "+j.message)}),H=jr({mutationFn:j=>Wl(`/api/datasets/${j}`),onSuccess:()=>{t("gelöscht."),i("datasets")}}),V=jr({mutationFn:j=>Ct(`/api/datasets/${j}/rebuild`),onSuccess:j=>{var he;t(`„${j.name}" neu gebaut: ${(he=j.counts)==null?void 0:he.final} Crops.`),i("datasets","stats")},onError:j=>t("Fehler: "+j.message)});function X(){const j=U.filter(he=>h[he.session_id]).map(he=>he.session_id);if(!l.trim()||j.length===0){t("Name und mind. eine Session wählen.");return}N.mutate({name:l.trim(),session_ids:j,per_cell_cap:f,phash_enabled:g,phash_hamming:y,rotate:b,val_frac:S,test_frac:D})}return x.jsxs(It,{title:"Kuratierte Datensätze",right:x.jsxs("div",{className:"flex items-center gap-2",children:[x.jsx("span",{className:"text-xs text-zinc-500",children:e}),x.jsxs(mt,{onClick:()=>a(j=>!j),className:"px-2 py-1 text-xs",children:[x.jsx(vp,{className:"h-3.5 w-3.5"})," Neuer Datensatz"]})]}),children:[r&&x.jsxs("div",{className:"mb-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3",children:[x.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[x.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["Name",x.jsx("input",{value:l,onChange:j=>c(j.target.value),className:`${mo} w-40`,placeholder:"z.B. set-a"})]}),x.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",title:"max. Crops je (Session, Feld, Figur)",children:["Cap/Feld",x.jsx("input",{type:"number",min:1,value:f,onChange:j=>v(+j.target.value),className:`${mo} w-16`})]}),x.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:[x.jsx("input",{type:"checkbox",checked:g,onChange:j=>p(j.target.checked)})," pHash"]}),x.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["Hamming",x.jsx("input",{type:"number",min:0,max:32,value:y,disabled:!g,onChange:j=>E(+j.target.value),className:`${mo} w-14`})]}),x.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",title:"90/180/270° → 4× Crops. ACHTUNG: widerspricht der Fixkamera-Annahme — A/B testen.",children:[x.jsx("input",{type:"checkbox",checked:b,onChange:j=>M(j.target.checked)})," ",x.jsx(_w,{className:"h-3.5 w-3.5"})," Rotation"]}),x.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["val",x.jsx("input",{type:"number",step:.05,min:0,max:.5,value:S,onChange:j=>A(+j.target.value),className:`${mo} w-14`})]}),x.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["test",x.jsx("input",{type:"number",step:.05,min:0,max:.5,value:D,onChange:j=>C(+j.target.value),className:`${mo} w-14`})]})]}),x.jsxs("div",{children:[x.jsx("div",{className:"mb-1 text-xs text-zinc-500",children:"Sessions (Teilmenge frei wählbar — Datensätze dürfen sich überschneiden):"}),x.jsx("div",{className:"flex flex-wrap gap-2",children:U.length===0?x.jsx("span",{className:"text-xs text-zinc-500",children:"keine aktiven Sessions"}):U.map(j=>x.jsxs("label",{className:"flex items-center gap-1.5 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300",children:[x.jsx("input",{type:"checkbox",checked:!!h[j.session_id],onChange:he=>d($=>({...$,[j.session_id]:he.target.checked}))}),j.session_id," ",x.jsxs("span",{className:"text-zinc-500",children:["(",j.n_crops,")"]})]},j.session_id))})]}),x.jsxs(mt,{variant:"primary",onClick:X,disabled:N.isPending,children:[x.jsx(Ox,{className:"h-4 w-4"})," ",N.isPending?"Baue…":"Bauen"]})]}),w.length===0?x.jsx("span",{className:"text-sm text-zinc-500",children:"Noch kein Datensatz gebaut."}):x.jsxs("table",{className:"w-full text-sm",children:[x.jsx("thead",{children:x.jsxs("tr",{className:"text-zinc-500",children:[x.jsx("th",{className:"text-left font-normal",children:"Datensatz"}),x.jsx("th",{className:"text-right font-normal",children:"Sessions"}),x.jsx("th",{className:"text-right font-normal",children:"roh→dedup→final"}),x.jsx("th",{className:"text-right font-normal",children:"train/val/test"}),x.jsx("th",{className:"text-right font-normal",children:"Aktion"})]})}),x.jsx("tbody",{children:w.map(j=>{var he,$,oe,Q,q,Y,Z;return x.jsxs("tr",{className:"border-t border-zinc-800",children:[x.jsxs("td",{className:"py-1.5 text-zinc-200",children:[j.name,((he=j.rotations)==null?void 0:he.some(O=>O))&&x.jsx("span",{className:"ml-2 text-[10px] text-zinc-500",children:"+rot"})]}),x.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:j.n_sessions}),x.jsxs("td",{className:"text-right tabular-nums text-zinc-400",children:[($=j.counts)==null?void 0:$.raw,"→",(oe=j.counts)==null?void 0:oe.after_dedup,"→",(Q=j.counts)==null?void 0:Q.final]}),x.jsxs("td",{className:"text-right tabular-nums text-zinc-400",children:[((q=j.split_counts)==null?void 0:q.train)??"?","/",((Y=j.split_counts)==null?void 0:Y.val)??"?","/",((Z=j.split_counts)==null?void 0:Z.test)??"?"]}),x.jsx("td",{className:"py-1",children:x.jsxs("div",{className:"flex justify-end gap-1.5",children:[x.jsx(xo,{to:`../statistik?ds=${encodeURIComponent(j.name)}`,className:"inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700",children:"Stats"}),x.jsxs(mt,{onClick:()=>V.mutate(j.name),className:"px-2 py-1 text-xs",children:[x.jsx(Ox,{className:"h-3.5 w-3.5"})," Neu bauen"]}),x.jsxs(mt,{onClick:()=>window.confirm(`Datensatz „${j.name}" löschen?`)&&H.mutate(j.name),className:"px-2 py-1 text-xs text-red-300 hover:text-red-200",children:[x.jsx(ic,{className:"h-3.5 w-3.5"})," Löschen"]})]})})]},j.name)})})]})]})}function Dw(){const[i,e]=$1(),t=i.get("ds")??"",[r,a]=k.useState(null),l=gr({queryKey:["datasets"],queryFn:()=>Ft("/api/datasets")}),c=gr({queryKey:["stats",t],queryFn:()=>Ft(`/api/stats${t?`?dataset=${encodeURIComponent(t)}`:""}`)}),h=l.data??[],d=c.data;if(c.isLoading||!d)return x.jsx(It,{children:"Stats laden…"});const f=Math.max(1,...Object.values(d.counts??{x:1})),v=(p,y)=>p==="empty"||p==="occluded"?"#38bdf8":y<d.min_samples*.5?"#ef4444":y<d.min_samples?"#eab308":"#22c55e",g=p=>Ft(`/api/class/${p}?limit=120${t?`&dataset=${encodeURIComponent(t)}`:""}`).then(y=>a({label:p,crops:y.crops}));return x.jsxs("div",{className:"space-y-4",children:[x.jsxs("div",{className:"grid gap-4 lg:grid-cols-3",children:[x.jsxs(It,{title:"Klassenverteilung",className:"lg:col-span-2",right:x.jsxs("select",{value:t,onChange:p=>e(p.target.value?{ds:p.target.value}:{}),className:mo,children:[x.jsx("option",{value:"",children:"globaler Pool"}),h.map(p=>x.jsx("option",{value:p.name,children:p.name},p.name))]}),children:[x.jsxs("div",{className:"mb-2 text-xs text-zinc-500",children:[d.total," Crops · ",d.num_sessions," Sessions",t?` · Datensatz „${t}"`:" · roh"]}),x.jsx("div",{className:"space-y-1.5",children:d.classes.map(p=>{const y=d.counts[p]||0;return x.jsxs("button",{onClick:()=>g(p),className:"grid w-full grid-cols-[2rem_1fr_3rem] items-center gap-3 rounded px-1 py-0.5 text-left hover:bg-zinc-800",children:[x.jsxs("span",{className:"text-zinc-300",children:[x.jsx(dr,{label:p}),x.jsx("span",{className:"ml-1 text-xs text-zinc-500",children:p})]}),x.jsx("div",{className:"h-2.5 overflow-hidden rounded-full bg-zinc-800",children:x.jsx("div",{className:"h-full rounded-full",style:{width:`${y/f*100}%`,background:v(p,y)}})}),x.jsx("span",{className:"text-right text-sm tabular-nums text-zinc-400",children:y})]},p)})})]}),x.jsx(It,{title:"Hell / Dunkel",children:x.jsxs("table",{className:"w-full text-sm",children:[x.jsx("thead",{children:x.jsxs("tr",{className:"text-zinc-500",children:[x.jsx("th",{className:"text-left font-normal",children:"Klasse"}),x.jsx("th",{children:"hell"}),x.jsx("th",{children:"dunkel"})]})}),x.jsx("tbody",{children:d.classes.map(p=>{const y=E=>E>0?x.jsx(aw,{className:"mx-auto h-4 w-4 text-green-500"}):x.jsx(Mw,{className:"mx-auto h-4 w-4 text-red-500"});return x.jsxs("tr",{className:"border-t border-zinc-800",children:[x.jsxs("td",{className:"py-1 text-zinc-300",children:[x.jsx(dr,{label:p})," ",x.jsx("span",{className:"text-xs text-zinc-500",children:p})]}),x.jsx("td",{children:y(d.light[p]||0)}),x.jsx("td",{children:y(d.dark[p]||0)})]},p)})})]})})]}),x.jsx(It,{title:"Warnungen",children:d.warnings.length?x.jsx("ul",{className:"space-y-1 text-sm",children:d.warnings.map((p,y)=>x.jsxs("li",{className:"flex items-center gap-2 text-amber-400",children:[x.jsx(sh,{className:"h-4 w-4 shrink-0"})," ",p]},y))}):x.jsx("span",{className:"text-sm text-green-500",children:"keine"})}),x.jsx(It,{title:`Crops durchblättern (${t?`Datensatz „${t}"`:"globaler Pool"})`,right:x.jsxs("span",{className:"flex items-center gap-1 text-xs text-zinc-500",children:[x.jsx(xw,{className:"h-3.5 w-3.5"}),r?`${r.label} (${r.crops.length})`:"Klasse anklicken"]}),children:r?x.jsx("div",{className:"grid grid-cols-[repeat(auto-fill,56px)] gap-1.5",children:r.crops.map((p,y)=>x.jsx("img",{src:p.url,title:`${p.session_id} ${p.frame} ${p.square}`,className:"h-[74px] w-[56px] rounded border border-zinc-800 object-cover"},y))}):x.jsx("span",{className:"text-sm text-zinc-500",children:"Wähle links eine Klasse, um die Crops zu sehen."})})]})}const Iw="abcdefgh".split(""),oy={empty:"empty leer frei",occluded:"occluded verdeckt hand objekt verdeckung",wP:"white pawn weiss weißer bauer",wN:"white knight weiss weißer springer pferd",wB:"white bishop weiss weißer läufer",wR:"white rook weiss weißer turm",wQ:"white queen weiss weiße dame",wK:"white king weiss weißer könig",bP:"black pawn schwarz schwarzer bauer",bN:"black knight schwarz schwarzer springer pferd",bB:"black bishop schwarz schwarzer läufer",bR:"black rook schwarz schwarzer turm",bQ:"black queen schwarz schwarze dame",bK:"black king schwarz schwarzer könig"},Uw=(i,e)=>!e||i.toLowerCase().includes(e)||(oy[i]||"").includes(e);function Fw(){var Ne;const i=mh(),[e,t]=k.useState(""),[r,a]=k.useState(""),[l,c]=k.useState(""),[h,d]=k.useState({}),[f,v]=k.useState(null),[g,p]=k.useState(null),[y,E]=k.useState(""),[b,M]=k.useState(""),[S,A]=k.useState(0),[D,C]=k.useState(0),I=gr({queryKey:["sessions"],queryFn:()=>Ft("/api/sessions")}),L=gr({queryKey:["runs"],queryFn:()=>Ft("/api/runs")}),U=I.data??[],w=L.data??[],N=((Ne=U.find(B=>B.session_id===e))==null?void 0:Ne.frames)??[],H=N.indexOf(r);k.useEffect(()=>{U.length&&(!e||!U.some(B=>B.session_id===e))&&(t(U[0].session_id),a(U[0].frames[0]??""))},[U]),k.useEffect(()=>{N.length&&!N.includes(r)&&a(N[0])},[e,N.join(",")]),k.useEffect(()=>{w.length&&!l&&c(w[w.length-1].run)},[w]);const V=gr({queryKey:["review",e,r,l],queryFn:()=>Ft(`/api/review?session=${e}&frame=${r}&run=${l}`),enabled:!!e&&!!r,retry:!1});k.useEffect(()=>{d({}),p(null)},[e,r]);const X=V.data,j={};((X==null?void 0:X.cells)??[]).forEach(B=>j[B.square]=B);const he=Object.keys(h).length,$=B=>h[B.square]??B.label;function oe(B,ge){var re;const fe=(re=j[B])==null?void 0:re.label;d(Ie=>{const qe={...Ie};return ge===fe?delete qe[B]:qe[B]=ge,qe}),p(null),E("")}function Q(B,ge){if(f){oe(B,f);return}const fe=ge.currentTarget.getBoundingClientRect();E(""),p({square:B,x:fe.left,y:fe.bottom+4})}function q(){X!=null&&X.cells&&(d(B=>{const ge={...B};for(const fe of X.cells)fe.pred_label&&fe.pred_label!==fe.label&&(ge[fe.square]=fe.pred_label);return ge}),M("Modell-Vorschläge übernommen — prüfen & speichern."))}function Y(B){N.length&&a(N[Math.min(N.length-1,Math.max(0,(H<0?0:H)+B))])}k.useEffect(()=>{const B=ge=>{ge.target instanceof HTMLInputElement||ge.target instanceof HTMLSelectElement||(ge.key==="ArrowLeft"&&Y(-1),ge.key==="ArrowRight"&&Y(1),ge.key==="Escape"&&v(null))};return window.addEventListener("keydown",B),()=>window.removeEventListener("keydown",B)},[N.join(","),H]);const Z=jr({mutationFn:()=>Ct("/api/corrections",Object.entries(h).map(([B,ge])=>({session_id:e,frame:r,square:B,label:ge}))),onSuccess:B=>{M(`${B.applied} Korrekturen gespeichert. „Slicen" übernimmt sie.`),d({})},onError:B=>M("Fehler: "+B.message)}),O=jr({mutationFn:()=>Ct(`/api/reslice?session=${e}&pad_up=${S}&pad_side=${D}`),onSuccess:B=>{M(`Neu gesliced ✓ (${B.crops??"?"} Crops).`),i.invalidateQueries({queryKey:["review"]}),i.invalidateQueries({queryKey:["sessions"]})},onError:B=>M("Slicing fehlgeschlagen: "+B.message)}),ne="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-sm text-zinc-100",Re=g?j[g.square]:null,xe=ah.filter(B=>Uw(B,y.trim().toLowerCase()));return x.jsxs("div",{className:"space-y-4",children:[x.jsxs(It,{children:[x.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[x.jsx(fr,{label:"Session",value:e,onChange:B=>t(B.target.value),children:U.map(B=>x.jsxs("option",{value:B.session_id,children:[B.session_id," (",B.n_frames,")"]},B.session_id))}),x.jsxs("div",{className:"flex items-center gap-1",children:[x.jsx(mt,{onClick:()=>Y(-1),disabled:H<=0,className:"px-2 py-1.5",children:x.jsx(lw,{className:"h-4 w-4"})}),x.jsx(fr,{label:"Frame",value:r,onChange:B=>a(B.target.value),children:N.map(B=>x.jsx("option",{children:B},B))}),x.jsx(mt,{onClick:()=>Y(1),disabled:H<0||H>=N.length-1,className:"px-2 py-1.5",children:x.jsx(cw,{className:"h-4 w-4"})}),x.jsx("span",{className:"ml-1 text-xs tabular-nums text-zinc-500",children:N.length?`${H+1} / ${N.length}`:"0 / 0"})]}),x.jsxs(fr,{label:"Modell",value:l,onChange:B=>c(B.target.value),children:[x.jsx("option",{value:"",children:"(kein Modell)"}),w.map(B=>x.jsx("option",{value:B.run,children:B.run},B.run))]}),l&&x.jsxs(mt,{onClick:q,children:[x.jsx(yp,{className:"h-4 w-4"})," Vorschläge übernehmen"]}),x.jsxs(mt,{variant:"primary",onClick:()=>Z.mutate(),disabled:he===0||Z.isPending,children:[x.jsx(J_,{className:"h-4 w-4"})," Speichern (",he,")"]}),x.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["pad_up",x.jsx("input",{type:"number",step:.05,min:0,value:S,onChange:B=>A(+B.target.value),className:`${ne} w-16`})]}),x.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["pad_side",x.jsx("input",{type:"number",step:.02,min:0,value:D,onChange:B=>C(+B.target.value),className:`${ne} w-16`})]}),x.jsxs(mt,{onClick:()=>O.mutate(),disabled:!e||O.isPending,children:[x.jsx(ty,{className:"h-4 w-4"})," Slicen"]})]}),x.jsxs("div",{className:"mt-3 flex flex-wrap items-center gap-1",children:[x.jsxs("span",{className:"mr-1 inline-flex items-center gap-1 text-xs text-zinc-500",children:[x.jsx(Q_,{className:"h-3.5 w-3.5"})," Pinsel:"]}),x.jsx("button",{onClick:()=>v(null),className:`rounded px-2 py-1 text-xs ${f===null?"bg-sky-600 text-white":"bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`,children:"aus (Suchfeld)"}),ah.map(B=>x.jsx("button",{onClick:()=>v(ge=>ge===B?null:B),title:B,className:`flex h-8 w-8 items-center justify-center rounded text-xl leading-none ${f===B?"bg-sky-600 ring-2 ring-sky-300":"bg-zinc-800 hover:bg-zinc-700"}`,children:x.jsx(dr,{label:B})},B))]}),x.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:[b||(V.isError?"keine Crops für diese Session/Frame (erst slicen?)":f?`Pinsel „${f}" aktiv — Felder anklicken setzt direkt (Esc = aus).`:"Pinsel wählen zum schnellen Malen, oder Feld anklicken → Suchfeld · ◀▶/Pfeiltasten steppen."),!b&&!V.isError&&x.jsxs(x.Fragment,{children:[" ",x.jsx("span",{className:"text-red-400",children:"Rot"}),"=Modell widerspricht · ",x.jsx("span",{className:"text-amber-400",children:"Gelb"}),"=unsicher · ",x.jsx("span",{className:"text-sky-400",children:"Blau"}),"=geändert."]})]})]}),X&&x.jsxs(It,{title:`Brett — ${e} / ${r}`,children:[x.jsx("div",{className:"grid w-full max-w-[920px] grid-cols-8 gap-1",children:[8,7,6,5,4,3,2,1].map(B=>Iw.map(ge=>{const fe=j[ge+B];if(!fe)return x.jsx("div",{},ge+B);const Ie=fe.square in h?"ring-sky-400":fe.disagree?"ring-red-500":fe.confidence!=null&&fe.confidence<.6?"ring-amber-400":"ring-zinc-700";return x.jsxs("button",{onClick:qe=>Q(fe.square,qe),className:`relative aspect-square overflow-hidden rounded-md bg-black ring-2 ${Ie} ${(g==null?void 0:g.square)===fe.square?"ring-sky-300":""} hover:ring-sky-300`,children:[x.jsx("img",{src:fe.url,className:"h-full w-full object-cover"}),x.jsx("span",{className:"absolute left-0.5 top-0.5 rounded bg-black/55 px-1 text-[9px] text-zinc-400",children:ge+B}),fe.pred_label&&x.jsxs("span",{className:"absolute right-0 top-0 inline-flex items-center gap-0.5 rounded-bl bg-black/60 px-1 text-[10px] text-zinc-300",children:[x.jsx(dr,{label:fe.pred_label})," ",Math.round((fe.confidence||0)*100),"%"]}),x.jsx("span",{className:"absolute inset-x-0 bottom-0 bg-black/65 py-0.5 text-center text-lg font-bold",children:x.jsx(dr,{label:$(fe)})})]},ge+B)}))}),x.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:[he," geändert · Klasse je Feld per Suchfeld setzen."]})]}),g&&Re&&x.jsxs(x.Fragment,{children:[x.jsx("div",{className:"fixed inset-0 z-40",onClick:()=>{p(null),E("")}}),x.jsxs("div",{className:"fixed z-50 w-56 rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-xl",style:{left:Math.min(g.x,window.innerWidth-240),top:Math.min(g.y,window.innerHeight-320)},children:[x.jsxs("div",{className:"mb-1 flex items-center justify-between text-xs text-zinc-400",children:[x.jsxs("span",{children:["Feld ",x.jsx("b",{className:"text-zinc-200",children:g.square})]}),Re.pred_label&&x.jsxs("button",{onClick:()=>oe(g.square,Re.pred_label),className:"inline-flex items-center gap-1 text-sky-400 hover:underline",children:["Vorschlag ",x.jsx(dr,{label:Re.pred_label})," ",Math.round((Re.confidence||0)*100),"%"]})]}),x.jsxs("div",{className:"mb-1 flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2",children:[x.jsx(ny,{className:"h-3.5 w-3.5 text-zinc-500"}),x.jsx("input",{autoFocus:!0,value:y,onChange:B=>E(B.target.value),onKeyDown:B=>{B.key==="Enter"&&xe[0]&&oe(g.square,xe[0]),B.key==="Escape"&&(p(null),E(""))},placeholder:"suchen: könig, bN, leer…",className:"w-full bg-transparent py-1.5 text-sm text-zinc-100 outline-none"})]}),x.jsx("div",{className:"max-h-56 overflow-auto",children:xe.length===0?x.jsx("div",{className:"px-2 py-1.5 text-xs text-zinc-500",children:"nichts gefunden"}):xe.map(B=>x.jsxs("button",{onClick:()=>oe(g.square,B),className:`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-800 ${$(Re)===B?"bg-zinc-800 text-sky-300":"text-zinc-200"}`,children:[x.jsx("span",{className:"w-5 text-center text-lg",children:x.jsx(dr,{label:B})}),x.jsx("span",{className:"font-mono text-xs text-zinc-400",children:B}),x.jsx("span",{className:"ml-auto text-[11px] text-zinc-500",children:(oy[B]||"").split(" ").slice(2,4).join(" ")})]},B))})]})]})]})}function Vx({series:i,yMin:e=0,yMax:t=1}){const c=i.flatMap(g=>g.data.map(p=>p.x)),h=Math.max(1,...c),d=g=>30+540*g/h,f=g=>170-140*(g-e)/Math.max(1e-9,t-e),v=4;return x.jsxs("div",{children:[x.jsxs("svg",{viewBox:"0 0 600 200",className:"w-full",style:{height:200},preserveAspectRatio:"none",children:[Array.from({length:v+1},(g,p)=>{const y=e+(t-e)*p/v;return x.jsxs("g",{children:[x.jsx("line",{x1:30,y1:f(y),x2:570,y2:f(y),stroke:"#27272a",strokeWidth:1}),x.jsx("text",{x:4,y:f(y)+3,fill:"#71717a",fontSize:10,children:y.toFixed(t<=1?2:1)})]},p)}),i.map(g=>g.data.length?x.jsx("polyline",{fill:"none",stroke:g.color,strokeWidth:2,strokeLinejoin:"round",points:g.data.map(p=>`${d(p.x).toFixed(1)},${f(p.y).toFixed(1)}`).join(" ")},g.name):null)]}),x.jsx("div",{className:"mt-1 flex flex-wrap gap-4 text-xs text-zinc-400",children:i.map(g=>x.jsxs("span",{className:"flex items-center gap-1.5",children:[x.jsx("span",{className:"inline-block h-2 w-2 rounded-full",style:{background:g.color}}),g.name]},g.name))})]})}const mu="w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100";function kw(){var B,ge,fe;const[i,e]=k.useState([]),[t,r]=k.useState(""),[a,l]=k.useState(""),[c,h]=k.useState([]),[d,f]=k.useState({}),[v,g]=k.useState({running:!1}),[p,y]=k.useState(""),[E,b]=k.useState("smallcnn"),[M,S]=k.useState("combined"),[A,D]=k.useState(30),[C,I]=k.useState(256),[L,U]=k.useState(3e-4),[w,N]=k.useState(7),[H,V]=k.useState(""),X=k.useRef(null),he=gr({queryKey:["datasets"],queryFn:()=>Ft("/api/datasets")}).data??[],$=he.find(re=>re.name===a);k.useEffect(()=>{he.length&&!a&&l(he[0].name)},[he]),k.useEffect(()=>(oe(),()=>clearInterval(X.current)),[]);async function oe(){const re=await Ft("/api/runs");e(re),re.length&&!t&&Q(re[0].run)}async function Q(re){r(re),h((await Ft(`/api/runs/${re}/metrics`)).metrics),f((await Ft(`/api/runs/${re}/eval`)).evals)}async function q(re){if(window.confirm(`Modell „${re}" löschen? (Verzeichnis + Gewichte werden entfernt)`)){try{await Wl(`/api/runs/${re}`)}catch(Ie){y(Ie.message);return}t===re&&(r(""),h([]),f({})),oe()}}const Y=re=>re==null?"—":(re*100).toFixed(1)+" %";async function Z(){if(y(""),!a){y("Kein Datensatz — erst im Tab Datensätze einen bauen.");return}try{await Ct("/api/train",{backbone:E,head:M,epochs:A,batch_size:C,lr:L,patience:w,no_amp:!0,dataset:a,resume:H||void 0}),clearInterval(X.current),X.current=setInterval(O,2500),O()}catch(re){y(re.message)}}async function O(){var Ie;const re=await Ft("/api/train/status");g(re),(Ie=re.metrics)!=null&&Ie.length&&h(re.metrics),re.running||(clearInterval(X.current),oe())}async function ne(){var re;try{await Ct("/api/train/stop")}catch{}clearInterval(X.current);try{const Ie=await Ft("/api/train/status");g({...Ie,running:!1}),Ie.run&&r(Ie.run),(re=Ie.metrics)!=null&&re.length&&h(Ie.metrics)}catch{g({running:!1,state:"stopped"})}oe()}const Re=[{name:"train_loss",color:"#ef4444",data:c.map(re=>({x:re.epoch,y:re.train_loss}))},{name:"val_loss",color:"#eab308",data:c.map(re=>({x:re.epoch,y:re.val_loss??0}))}],xe=Math.max(.5,...c.map(re=>Math.max(re.train_loss||0,re.val_loss||0))),Ne=[{name:"square_acc",color:"#38bdf8",data:c.map(re=>({x:re.epoch,y:re.val_acc??0}))},{name:"macro_recall",color:"#22c55e",data:c.map(re=>({x:re.epoch,y:re.val_macro_recall??0}))},{name:"board_acc",color:"#e4e4e7",data:c.map(re=>({x:re.epoch,y:re.val_board_acc??0}))}];return x.jsxs("div",{className:"space-y-4",children:[x.jsxs(It,{children:[x.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[x.jsxs(fr,{label:"Datensatz",value:a,onChange:re=>l(re.target.value),children:[he.length===0&&x.jsx("option",{value:"",children:"— keiner gebaut —"}),he.map(re=>{var Ie;return x.jsxs("option",{value:re.name,children:[re.name," (",((Ie=re.counts)==null?void 0:Ie.final)??"?",")"]},re.name)})]}),x.jsxs(fr,{label:"Backbone",value:E,onChange:re=>b(re.target.value),children:[x.jsx("option",{value:"smallcnn",children:"smallcnn"}),x.jsx("option",{value:"mobilenet_v3_small",children:"mobilenet_v3_small"})]}),x.jsxs(fr,{label:"Kopf",value:M,onChange:re=>S(re.target.value),children:[x.jsx("option",{value:"combined",children:"combined"}),x.jsx("option",{value:"factored",children:"factored"}),x.jsx("option",{value:"twostage",children:"twostage (Occ→Piece)"})]}),x.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",children:["Epochs",x.jsx("input",{type:"number",min:1,value:A,onChange:re=>D(+re.target.value),className:mu})]}),x.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",children:["Batch",x.jsx("input",{type:"number",min:1,value:C,onChange:re=>I(+re.target.value),className:mu})]}),x.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",children:["LR",x.jsx("input",{type:"number",step:1e-4,min:0,value:L,onChange:re=>U(+re.target.value),className:mu})]}),x.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Early Stopping: Epochen ohne macro_recall-Fortschritt, bevor abgebrochen wird.",children:["Geduld",x.jsx("input",{type:"number",min:1,value:w,onChange:re=>N(+re.target.value),className:mu})]}),x.jsxs(fr,{label:"Weiter ab",value:H,onChange:re=>V(re.target.value),children:[x.jsx("option",{value:"",children:"von Grund auf"}),i.some(re=>String(re.dataset||"").startsWith("pretrain-"))&&x.jsx("optgroup",{label:"Basis-Modelle (vortrainiert)",children:i.filter(re=>String(re.dataset||"").startsWith("pretrain-")).map(re=>x.jsxs("option",{value:re.run,children:["🔹 Basis · ",re.run]},re.run))}),x.jsx("optgroup",{label:"Eigene Runs",children:i.filter(re=>!String(re.dataset||"").startsWith("pretrain-")).map(re=>x.jsx("option",{value:re.run,children:re.run},re.run))})]}),x.jsxs(mt,{variant:"primary",onClick:Z,disabled:v.running||!a,children:[v.running?x.jsx(ha,{className:"h-4 w-4 animate-spin"}):x.jsx(Sh,{className:"h-4 w-4"})," Training starten"]}),v.running&&x.jsxs(mt,{onClick:ne,children:[x.jsx(iy,{className:"h-4 w-4"})," Abbrechen"]})]}),$&&x.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:["Split: train ",((B=$.split_counts)==null?void 0:B.train)??"?"," · val ",((ge=$.split_counts)==null?void 0:ge.val)??"?"," · test ",((fe=$.split_counts)==null?void 0:fe.test)??"?"]}),(v.running||c.length>0)&&x.jsxs("div",{className:"mt-3",children:[x.jsxs("div",{className:"mb-1 flex justify-between text-xs text-zinc-400",children:[x.jsxs("span",{children:[v.running?`läuft… (${v.run})`:v.state==="stopped"||v.state==="crashed"?"abgebrochen":"Fortschritt"," · Epoche ",c.length,"/",A]}),x.jsxs("span",{children:["board_acc ",c.length?((c[c.length-1].val_board_acc??0)*100).toFixed(1)+" %":"—"]})]}),x.jsx("div",{className:"h-2 overflow-hidden rounded-full bg-zinc-800",children:x.jsx("div",{className:`h-full rounded-full transition-all ${v.state==="stopped"||v.state==="crashed"?"bg-amber-500":"bg-sky-500"}`,style:{width:`${Math.min(100,c.length/Math.max(1,A)*100)}%`}})})]}),!v.running&&v.state==="done"&&x.jsx("p",{className:"mt-2 text-xs text-green-500",children:"fertig ✓"}),!v.running&&(v.state==="stopped"||v.state==="crashed")&&x.jsxs("p",{className:"mt-2 text-xs text-amber-400",children:[v.state==="crashed"?"abgebrochen (Crash)":"abgebrochen"," bei Epoche ",c.length,' — Teil-Fortschritt bleibt erhalten; „best.pt" ist gespeichert, „Weiter ab" setzt hier an.']}),p&&x.jsx("p",{className:"mt-2 text-sm text-amber-400",children:p})]}),x.jsxs(It,{title:"Modelle",right:x.jsxs("span",{className:"text-xs text-zinc-500",children:[i.length," Run(s)"]}),children:[i.length===0?x.jsx("span",{className:"text-sm text-zinc-500",children:"Noch kein Modell trainiert."}):x.jsx("div",{className:"overflow-x-auto",children:x.jsxs("table",{className:"w-full text-sm",children:[x.jsx("thead",{children:x.jsxs("tr",{className:"text-zinc-500",children:[x.jsx("th",{className:"text-left font-normal",children:"Run"}),x.jsx("th",{className:"text-left font-normal",children:"Backbone"}),x.jsx("th",{className:"text-left font-normal",children:"Datensatz"}),x.jsx("th",{className:"text-right font-normal",children:"Kl."}),x.jsx("th",{className:"text-right font-normal",children:"Ep."}),x.jsx("th",{className:"text-right font-normal",title:"bestes val board_acc (alle 64 Felder korrekt)",children:"board_acc"}),x.jsx("th",{className:"text-right font-normal",title:"bestes val square_acc (Anteil korrekter Einzelfelder — treibt board_acc ≈ square_acc^64)",children:"square_acc"}),x.jsx("th",{className:"text-right font-normal",title:"bestes val macro_recall",children:"macro_rec"}),x.jsx("th",{className:"text-right font-normal",title:"Test-Set board_acc (nach eval)",children:"test"}),x.jsx("th",{className:"text-right font-normal",children:"Aktion"})]})}),x.jsx("tbody",{children:i.map(re=>x.jsxs("tr",{className:`border-t border-zinc-800 ${t===re.run?"bg-zinc-800/50":""}`,children:[x.jsxs("td",{className:"py-1.5 text-zinc-200",children:[re.run,re.resumed_from&&x.jsx("span",{className:"ml-1 text-[10px] text-zinc-500",title:`weiter ab ${re.resumed_from}`,children:"↻"}),re.has_occluded&&x.jsx("span",{className:"ml-1 rounded bg-zinc-700 px-1 text-[9px] text-amber-300",children:"+occ"})]}),x.jsx("td",{className:"text-zinc-400",children:re.backbone}),x.jsx("td",{className:"text-zinc-400",children:re.dataset??"—"}),x.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:re.n_classes}),x.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:re.epochs_done}),x.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:Y(re.best_board_acc)}),x.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:Y(re.best_square_acc)}),x.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:Y(re.best_macro_recall)}),x.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:Y(re.test_board_acc)}),x.jsx("td",{className:"py-1",children:x.jsxs("div",{className:"flex justify-end gap-1.5",children:[x.jsxs(mt,{onClick:()=>Q(re.run),className:"px-2 py-1 text-xs",children:[x.jsx(pw,{className:"h-3.5 w-3.5"})," Anzeigen"]}),x.jsxs(mt,{onClick:()=>q(re.run),className:"px-2 py-1 text-xs text-red-300 hover:text-red-200",children:[x.jsx(ic,{className:"h-3.5 w-3.5"})," Löschen"]})]})})]},re.run))})]})}),x.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:['„Anzeigen" lädt Kurven & Eval unten · „test" erscheint nach ',x.jsx("code",{children:"chesslab eval --run …"}),' · ↻ = weiter-trainiert · +occ = Modell kennt die Klasse „verdeckt".']})]}),x.jsxs("div",{className:"grid gap-4 lg:grid-cols-2",children:[x.jsx(It,{title:"Loss",children:x.jsx(Vx,{series:Re,yMin:0,yMax:xe})}),x.jsx(It,{title:"Metriken (0–1) — macro_recall ist die ehrliche Zahl",children:x.jsx(Vx,{series:Ne,yMin:0,yMax:1})})]}),x.jsx(It,{title:"Evaluation",children:Object.keys(d).length?x.jsx("div",{className:"space-y-4",children:Object.entries(d).map(([re,Ie])=>{const qe=Object.entries(Ie.recall||{}).sort((jt,ht)=>jt[1]-ht[1]).slice(0,3);return x.jsxs("div",{children:[x.jsxs("div",{className:"text-sm",children:[x.jsx("span",{className:"font-medium uppercase text-zinc-400",children:re})," · board_acc ",x.jsxs("b",{children:[(Ie.board_acc*100).toFixed(1),"%"]})," · square_acc ",(Ie.square_acc*100).toFixed(1),"%"]}),x.jsxs("div",{className:"text-xs text-zinc-500",children:["schwächste Klassen: ",qe.map(([jt,ht])=>`${jt} ${(ht*100).toFixed(0)}%`).join(", ")]}),Ie.confusion_png&&x.jsx("img",{src:Ie.confusion_png,className:"mt-2 max-w-md rounded-lg border border-zinc-800"})]},re)})}):x.jsxs("span",{className:"text-sm text-zinc-500",children:["Noch keine eval — ",x.jsx("code",{children:"chesslab eval --run …"})]})}),v.log_tail&&x.jsx(It,{title:"Log",children:x.jsx("pre",{className:"max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 text-xs text-zinc-400",children:v.log_tail})})]})}const Hx="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";function Ow(){const e=gr({queryKey:["runs"],queryFn:()=>Ft("/api/runs")}).data??[],[t,r]=k.useState(""),[a,l]=k.useState("default"),[c,h]=k.useState(0),[d,f]=k.useState(!1),[v,g]=k.useState({}),[p,y]=k.useState(""),E=k.useRef(null);k.useEffect(()=>{e.length&&!t&&r(e[e.length-1].run)},[e]),k.useEffect(()=>()=>{clearInterval(E.current),d&&Ct("/api/camera/release").catch(()=>{})},[]);async function b(){y("");try{await Ct("/api/inference/start",{run:t,profile:a,camera:c}),f(!0),clearInterval(E.current),E.current=setInterval(()=>Ft("/api/inference/state").then(g).catch(()=>{}),1e3)}catch(A){y("Fehler: "+A.message)}}async function M(){f(!1),clearInterval(E.current);try{await Ct("/api/camera/release")}catch{}}async function S(){try{const A=await Ct("/api/inference/capture");y(`Snapshot gespeichert: ${A.crops} Crops (Session ${A.session}). ${A.hint}`)}catch(A){y("Fehler: "+A.message)}}return x.jsxs("div",{className:"space-y-4",children:[x.jsxs(It,{children:[x.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[x.jsxs(fr,{label:"Modell",value:t,onChange:A=>r(A.target.value),children:[e.length===0&&x.jsx("option",{value:"",children:"— kein Modell trainiert —"}),e.map(A=>x.jsx("option",{value:A.run,children:A.run},A.run))]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Profil",x.jsx("input",{value:a,onChange:A=>l(A.target.value),className:`${Hx} w-28`})]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Kamera",x.jsx("input",{type:"number",value:c,onChange:A=>h(+A.target.value),className:`${Hx} w-16`})]}),d?x.jsxs(mt,{onClick:M,children:[x.jsx(_p,{className:"h-4 w-4"})," Stop"]}):x.jsxs(mt,{variant:"primary",onClick:b,disabled:!t,children:[x.jsx(ey,{className:"h-4 w-4"})," Auswertung starten"]}),d&&x.jsxs(mt,{variant:"primary",onClick:S,children:[x.jsx(zs,{className:"h-4 w-4"})," Snapshot als Trainingsdaten"]})]}),x.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:["Figuren aufs Brett stellen — das Modell wertet jedes Feld live aus (Glyph + Farbe = Confidence:",x.jsx("span",{className:"text-green-500",children:" grün"})," hoch · ",x.jsx("span",{className:"text-amber-400",children:"gelb"})," mittel ·",x.jsx("span",{className:"text-red-400",children:" rot"}),' niedrig). „Snapshot" speichert die Stellung als neue Session (Active Learning) — danach im ',x.jsx("b",{className:"text-zinc-300",children:"Review"})," Fehler & verdeckte Felder korrigieren, bevor du darauf neu trainierst."]}),p&&x.jsx("p",{className:"mt-1 text-xs text-sky-400",children:p})]}),x.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_280px]",children:[x.jsx(It,{title:"Live-Auswertung",children:d?x.jsx("img",{src:"/api/camera/inference.mjpg",className:"w-full rounded-lg border border-zinc-800"}):x.jsxs("div",{className:"flex h-72 items-center justify-center text-zinc-500",children:[x.jsx(zs,{className:"mr-2 h-5 w-5"})," Auswertung nicht gestartet"]})}),x.jsx(It,{title:"Erkannte Stellung",children:d?x.jsxs("div",{className:"space-y-2 text-sm",children:[x.jsxs("div",{className:"text-zinc-400",children:["Ø Confidence: ",x.jsx("b",{className:"text-zinc-100 tabular-nums",children:v.mean_conf!=null?(v.mean_conf*100).toFixed(0)+" %":"—"})]}),x.jsx("div",{className:"text-zinc-400",children:"FEN (geschätzt):"}),x.jsx("code",{className:"block break-all rounded bg-zinc-950 p-2 text-xs text-zinc-300",children:v.fen??"…"}),x.jsx("p",{className:"text-xs text-zinc-500",children:"verdeckte Felder zählen in der FEN als leer."})]}):x.jsx("span",{className:"text-sm text-zinc-500",children:"Start drücken."})})]})]})}/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Rm="185",vo={ROTATE:0,DOLLY:1,PAN:2},go={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},zw=0,Gx=1,Bw=2,$u=1,Vw=2,kl=3,Bs=0,di=1,Gr=2,Xr=0,_o=1,jx=2,Wx=3,Xx=4,Hw=5,da=100,Gw=101,jw=102,Ww=103,Xw=104,$w=200,qw=201,Kw=202,Yw=203,Sp=204,Mp=205,Qw=206,Zw=207,Jw=208,eb=209,tb=210,nb=211,ib=212,rb=213,sb=214,Ep=0,wp=1,bp=2,Uo=3,Tp=4,Cp=5,Rp=6,Ap=7,Am=0,ab=1,ob=2,xr=0,ly=1,cy=2,uy=3,hy=4,dy=5,fy=6,py=7,my=300,Ca=301,Fo=302,gf=303,xf=304,Mh=306,Pp=1e3,Wr=1001,Np=1002,Un=1003,lb=1004,gu=1005,jn=1006,vf=1007,ma=1008,Si=1009,gy=1010,xy=1011,Xl=1012,Pm=1013,yr=1014,pr=1015,Yr=1016,Nm=1017,Lm=1018,$l=1020,vy=35902,_y=35899,yy=1021,Sy=1022,Ki=1023,Qr=1026,ga=1027,My=1028,Dm=1029,Ra=1030,Im=1031,Um=1033,qu=33776,Ku=33777,Yu=33778,Qu=33779,Lp=35840,Dp=35841,Ip=35842,Up=35843,Fp=36196,kp=37492,Op=37496,zp=37488,Bp=37489,oh=37490,Vp=37491,Hp=37808,Gp=37809,jp=37810,Wp=37811,Xp=37812,$p=37813,qp=37814,Kp=37815,Yp=37816,Qp=37817,Zp=37818,Jp=37819,em=37820,tm=37821,nm=36492,im=36494,rm=36495,sm=36283,am=36284,lh=36285,om=36286,cb=3200,ch=0,ub=1,Cs="",hi="srgb",uh="srgb-linear",hh="linear",Gt="srgb",Ja=7680,$x=519,hb=512,db=513,fb=514,Fm=515,pb=516,mb=517,km=518,gb=519,qx=35044,Kx="300 es",mr=2e3,ql=2001;function xb(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function Kl(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function vb(){const i=Kl("canvas");return i.style.display="block",i}const Yx={};function Qx(...i){const e="THREE."+i.shift();console.log(e,...i)}function Ey(i){const e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function ot(...i){i=Ey(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function Nt(...i){i=Ey(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function yo(...i){const e=i.join(" ");e in Yx||(Yx[e]=!0,ot(...i))}function _b(i,e,t){return new Promise(function(r,a){function l(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:a();break;case i.TIMEOUT_EXPIRED:setTimeout(l,t);break;default:r()}}setTimeout(l,t)})}const yb={[Ep]:wp,[bp]:Rp,[Tp]:Ap,[Uo]:Cp,[wp]:Ep,[Rp]:bp,[Ap]:Tp,[Cp]:Uo};class Hs{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const r=this._listeners;r[e]===void 0&&(r[e]=[]),r[e].indexOf(t)===-1&&r[e].push(t)}hasEventListener(e,t){const r=this._listeners;return r===void 0?!1:r[e]!==void 0&&r[e].indexOf(t)!==-1}removeEventListener(e,t){const r=this._listeners;if(r===void 0)return;const a=r[e];if(a!==void 0){const l=a.indexOf(t);l!==-1&&a.splice(l,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const r=t[e.type];if(r!==void 0){e.target=this;const a=r.slice(0);for(let l=0,c=a.length;l<c;l++)a[l].call(this,e);e.target=null}}}const Vn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Zu=Math.PI/180,lm=180/Math.PI;function rc(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(Vn[i&255]+Vn[i>>8&255]+Vn[i>>16&255]+Vn[i>>24&255]+"-"+Vn[e&255]+Vn[e>>8&255]+"-"+Vn[e>>16&15|64]+Vn[e>>24&255]+"-"+Vn[t&63|128]+Vn[t>>8&255]+"-"+Vn[t>>16&255]+Vn[t>>24&255]+Vn[r&255]+Vn[r>>8&255]+Vn[r>>16&255]+Vn[r>>24&255]).toLowerCase()}function Et(i,e,t){return Math.max(e,Math.min(t,i))}function Sb(i,e){return(i%e+e)%e}function _f(i,e,t){return(1-t)*i+t*e}function Rl(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function oi(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}const Mb={DEG2RAD:Zu},Hm=class Hm{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,r=this.y,a=e.elements;return this.x=a[0]*t+a[3]*r+a[6],this.y=a[1]*t+a[4]*r+a[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Et(this.x,e.x,t.x),this.y=Et(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Et(this.x,e,t),this.y=Et(this.y,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(Et(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const r=this.dot(e)/t;return Math.acos(Et(r,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,r=this.y-e.y;return t*t+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const r=Math.cos(t),a=Math.sin(t),l=this.x-e.x,c=this.y-e.y;return this.x=l*r-c*a+e.x,this.y=l*a+c*r+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};Hm.prototype.isVector2=!0;let ut=Hm;class Vs{constructor(e=0,t=0,r=0,a=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=r,this._w=a}static slerpFlat(e,t,r,a,l,c,h){let d=r[a+0],f=r[a+1],v=r[a+2],g=r[a+3],p=l[c+0],y=l[c+1],E=l[c+2],b=l[c+3];if(g!==b||d!==p||f!==y||v!==E){let M=d*p+f*y+v*E+g*b;M<0&&(p=-p,y=-y,E=-E,b=-b,M=-M);let S=1-h;if(M<.9995){const A=Math.acos(M),D=Math.sin(A);S=Math.sin(S*A)/D,h=Math.sin(h*A)/D,d=d*S+p*h,f=f*S+y*h,v=v*S+E*h,g=g*S+b*h}else{d=d*S+p*h,f=f*S+y*h,v=v*S+E*h,g=g*S+b*h;const A=1/Math.sqrt(d*d+f*f+v*v+g*g);d*=A,f*=A,v*=A,g*=A}}e[t]=d,e[t+1]=f,e[t+2]=v,e[t+3]=g}static multiplyQuaternionsFlat(e,t,r,a,l,c){const h=r[a],d=r[a+1],f=r[a+2],v=r[a+3],g=l[c],p=l[c+1],y=l[c+2],E=l[c+3];return e[t]=h*E+v*g+d*y-f*p,e[t+1]=d*E+v*p+f*g-h*y,e[t+2]=f*E+v*y+h*p-d*g,e[t+3]=v*E-h*g-d*p-f*y,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,r,a){return this._x=e,this._y=t,this._z=r,this._w=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const r=e._x,a=e._y,l=e._z,c=e._order,h=Math.cos,d=Math.sin,f=h(r/2),v=h(a/2),g=h(l/2),p=d(r/2),y=d(a/2),E=d(l/2);switch(c){case"XYZ":this._x=p*v*g+f*y*E,this._y=f*y*g-p*v*E,this._z=f*v*E+p*y*g,this._w=f*v*g-p*y*E;break;case"YXZ":this._x=p*v*g+f*y*E,this._y=f*y*g-p*v*E,this._z=f*v*E-p*y*g,this._w=f*v*g+p*y*E;break;case"ZXY":this._x=p*v*g-f*y*E,this._y=f*y*g+p*v*E,this._z=f*v*E+p*y*g,this._w=f*v*g-p*y*E;break;case"ZYX":this._x=p*v*g-f*y*E,this._y=f*y*g+p*v*E,this._z=f*v*E-p*y*g,this._w=f*v*g+p*y*E;break;case"YZX":this._x=p*v*g+f*y*E,this._y=f*y*g+p*v*E,this._z=f*v*E-p*y*g,this._w=f*v*g-p*y*E;break;case"XZY":this._x=p*v*g-f*y*E,this._y=f*y*g-p*v*E,this._z=f*v*E+p*y*g,this._w=f*v*g+p*y*E;break;default:ot("Quaternion: .setFromEuler() encountered an unknown order: "+c)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const r=t/2,a=Math.sin(r);return this._x=e.x*a,this._y=e.y*a,this._z=e.z*a,this._w=Math.cos(r),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,r=t[0],a=t[4],l=t[8],c=t[1],h=t[5],d=t[9],f=t[2],v=t[6],g=t[10],p=r+h+g;if(p>0){const y=.5/Math.sqrt(p+1);this._w=.25/y,this._x=(v-d)*y,this._y=(l-f)*y,this._z=(c-a)*y}else if(r>h&&r>g){const y=2*Math.sqrt(1+r-h-g);this._w=(v-d)/y,this._x=.25*y,this._y=(a+c)/y,this._z=(l+f)/y}else if(h>g){const y=2*Math.sqrt(1+h-r-g);this._w=(l-f)/y,this._x=(a+c)/y,this._y=.25*y,this._z=(d+v)/y}else{const y=2*Math.sqrt(1+g-r-h);this._w=(c-a)/y,this._x=(l+f)/y,this._y=(d+v)/y,this._z=.25*y}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let r=e.dot(t)+1;return r<1e-8?(r=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=r):(this._x=0,this._y=-e.z,this._z=e.y,this._w=r)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=r),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Et(this.dot(e),-1,1)))}rotateTowards(e,t){const r=this.angleTo(e);if(r===0)return this;const a=Math.min(1,t/r);return this.slerp(e,a),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const r=e._x,a=e._y,l=e._z,c=e._w,h=t._x,d=t._y,f=t._z,v=t._w;return this._x=r*v+c*h+a*f-l*d,this._y=a*v+c*d+l*h-r*f,this._z=l*v+c*f+r*d-a*h,this._w=c*v-r*h-a*d-l*f,this._onChangeCallback(),this}slerp(e,t){let r=e._x,a=e._y,l=e._z,c=e._w,h=this.dot(e);h<0&&(r=-r,a=-a,l=-l,c=-c,h=-h);let d=1-t;if(h<.9995){const f=Math.acos(h),v=Math.sin(f);d=Math.sin(d*f)/v,t=Math.sin(t*f)/v,this._x=this._x*d+r*t,this._y=this._y*d+a*t,this._z=this._z*d+l*t,this._w=this._w*d+c*t,this._onChangeCallback()}else this._x=this._x*d+r*t,this._y=this._y*d+a*t,this._z=this._z*d+l*t,this._w=this._w*d+c*t,this.normalize();return this}slerpQuaternions(e,t,r){return this.copy(e).slerp(t,r)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),r=Math.random(),a=Math.sqrt(1-r),l=Math.sqrt(r);return this.set(a*Math.sin(e),a*Math.cos(e),l*Math.sin(t),l*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}const Gm=class Gm{constructor(e=0,t=0,r=0){this.x=e,this.y=t,this.z=r}set(e,t,r){return r===void 0&&(r=this.z),this.x=e,this.y=t,this.z=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Zx.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Zx.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,r=this.y,a=this.z,l=e.elements;return this.x=l[0]*t+l[3]*r+l[6]*a,this.y=l[1]*t+l[4]*r+l[7]*a,this.z=l[2]*t+l[5]*r+l[8]*a,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,r=this.y,a=this.z,l=e.elements,c=1/(l[3]*t+l[7]*r+l[11]*a+l[15]);return this.x=(l[0]*t+l[4]*r+l[8]*a+l[12])*c,this.y=(l[1]*t+l[5]*r+l[9]*a+l[13])*c,this.z=(l[2]*t+l[6]*r+l[10]*a+l[14])*c,this}applyQuaternion(e){const t=this.x,r=this.y,a=this.z,l=e.x,c=e.y,h=e.z,d=e.w,f=2*(c*a-h*r),v=2*(h*t-l*a),g=2*(l*r-c*t);return this.x=t+d*f+c*g-h*v,this.y=r+d*v+h*f-l*g,this.z=a+d*g+l*v-c*f,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,r=this.y,a=this.z,l=e.elements;return this.x=l[0]*t+l[4]*r+l[8]*a,this.y=l[1]*t+l[5]*r+l[9]*a,this.z=l[2]*t+l[6]*r+l[10]*a,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Et(this.x,e.x,t.x),this.y=Et(this.y,e.y,t.y),this.z=Et(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Et(this.x,e,t),this.y=Et(this.y,e,t),this.z=Et(this.z,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(Et(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this.z=e.z+(t.z-e.z)*r,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const r=e.x,a=e.y,l=e.z,c=t.x,h=t.y,d=t.z;return this.x=a*d-l*h,this.y=l*c-r*d,this.z=r*h-a*c,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const r=e.dot(this)/t;return this.copy(e).multiplyScalar(r)}projectOnPlane(e){return yf.copy(this).projectOnVector(e),this.sub(yf)}reflect(e){return this.sub(yf.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const r=this.dot(e)/t;return Math.acos(Et(r,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,r=this.y-e.y,a=this.z-e.z;return t*t+r*r+a*a}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,r){const a=Math.sin(t)*e;return this.x=a*Math.sin(r),this.y=Math.cos(t)*e,this.z=a*Math.cos(r),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,r){return this.x=e*Math.sin(t),this.y=r,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),r=this.setFromMatrixColumn(e,1).length(),a=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=r,this.z=a,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,r=Math.sqrt(1-t*t);return this.x=r*Math.cos(e),this.y=t,this.z=r*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};Gm.prototype.isVector3=!0;let ie=Gm;const yf=new ie,Zx=new Vs,jm=class jm{constructor(e,t,r,a,l,c,h,d,f){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,r,a,l,c,h,d,f)}set(e,t,r,a,l,c,h,d,f){const v=this.elements;return v[0]=e,v[1]=a,v[2]=h,v[3]=t,v[4]=l,v[5]=d,v[6]=r,v[7]=c,v[8]=f,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,r=e.elements;return t[0]=r[0],t[1]=r[1],t[2]=r[2],t[3]=r[3],t[4]=r[4],t[5]=r[5],t[6]=r[6],t[7]=r[7],t[8]=r[8],this}extractBasis(e,t,r){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),r.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const r=e.elements,a=t.elements,l=this.elements,c=r[0],h=r[3],d=r[6],f=r[1],v=r[4],g=r[7],p=r[2],y=r[5],E=r[8],b=a[0],M=a[3],S=a[6],A=a[1],D=a[4],C=a[7],I=a[2],L=a[5],U=a[8];return l[0]=c*b+h*A+d*I,l[3]=c*M+h*D+d*L,l[6]=c*S+h*C+d*U,l[1]=f*b+v*A+g*I,l[4]=f*M+v*D+g*L,l[7]=f*S+v*C+g*U,l[2]=p*b+y*A+E*I,l[5]=p*M+y*D+E*L,l[8]=p*S+y*C+E*U,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],h=e[5],d=e[6],f=e[7],v=e[8];return t*c*v-t*h*f-r*l*v+r*h*d+a*l*f-a*c*d}invert(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],h=e[5],d=e[6],f=e[7],v=e[8],g=v*c-h*f,p=h*d-v*l,y=f*l-c*d,E=t*g+r*p+a*y;if(E===0)return this.set(0,0,0,0,0,0,0,0,0);const b=1/E;return e[0]=g*b,e[1]=(a*f-v*r)*b,e[2]=(h*r-a*c)*b,e[3]=p*b,e[4]=(v*t-a*d)*b,e[5]=(a*l-h*t)*b,e[6]=y*b,e[7]=(r*d-f*t)*b,e[8]=(c*t-r*l)*b,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,r,a,l,c,h){const d=Math.cos(l),f=Math.sin(l);return this.set(r*d,r*f,-r*(d*c+f*h)+c+e,-a*f,a*d,-a*(-f*c+d*h)+h+t,0,0,1),this}scale(e,t){return yo("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Sf.makeScale(e,t)),this}rotate(e){return yo("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Sf.makeRotation(-e)),this}translate(e,t){return yo("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Sf.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,-r,0,r,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,r=e.elements;for(let a=0;a<9;a++)if(t[a]!==r[a])return!1;return!0}fromArray(e,t=0){for(let r=0;r<9;r++)this.elements[r]=e[r+t];return this}toArray(e=[],t=0){const r=this.elements;return e[t]=r[0],e[t+1]=r[1],e[t+2]=r[2],e[t+3]=r[3],e[t+4]=r[4],e[t+5]=r[5],e[t+6]=r[6],e[t+7]=r[7],e[t+8]=r[8],e}clone(){return new this.constructor().fromArray(this.elements)}};jm.prototype.isMatrix3=!0;let pt=jm;const Sf=new pt,Jx=new pt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),ev=new pt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Eb(){const i={enabled:!0,workingColorSpace:uh,spaces:{},convert:function(a,l,c){return this.enabled===!1||l===c||!l||!c||(this.spaces[l].transfer===Gt&&(a.r=$r(a.r),a.g=$r(a.g),a.b=$r(a.b)),this.spaces[l].primaries!==this.spaces[c].primaries&&(a.applyMatrix3(this.spaces[l].toXYZ),a.applyMatrix3(this.spaces[c].fromXYZ)),this.spaces[c].transfer===Gt&&(a.r=So(a.r),a.g=So(a.g),a.b=So(a.b))),a},workingToColorSpace:function(a,l){return this.convert(a,this.workingColorSpace,l)},colorSpaceToWorking:function(a,l){return this.convert(a,l,this.workingColorSpace)},getPrimaries:function(a){return this.spaces[a].primaries},getTransfer:function(a){return a===Cs?hh:this.spaces[a].transfer},getToneMappingMode:function(a){return this.spaces[a].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(a,l=this.workingColorSpace){return a.fromArray(this.spaces[l].luminanceCoefficients)},define:function(a){Object.assign(this.spaces,a)},_getMatrix:function(a,l,c){return a.copy(this.spaces[l].toXYZ).multiply(this.spaces[c].fromXYZ)},_getDrawingBufferColorSpace:function(a){return this.spaces[a].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(a=this.workingColorSpace){return this.spaces[a].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(a,l){return yo("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(a,l)},toWorkingColorSpace:function(a,l){return yo("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(a,l)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],r=[.3127,.329];return i.define({[uh]:{primaries:e,whitePoint:r,transfer:hh,toXYZ:Jx,fromXYZ:ev,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:hi},outputColorSpaceConfig:{drawingBufferColorSpace:hi}},[hi]:{primaries:e,whitePoint:r,transfer:Gt,toXYZ:Jx,fromXYZ:ev,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:hi}}}),i}const Tt=Eb();function $r(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function So(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let eo;class wb{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let r;if(e instanceof HTMLCanvasElement)r=e;else{eo===void 0&&(eo=Kl("canvas")),eo.width=e.width,eo.height=e.height;const a=eo.getContext("2d");e instanceof ImageData?a.putImageData(e,0,0):a.drawImage(e,0,0,e.width,e.height),r=eo}return r.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Kl("canvas");t.width=e.width,t.height=e.height;const r=t.getContext("2d");r.drawImage(e,0,0,e.width,e.height);const a=r.getImageData(0,0,e.width,e.height),l=a.data;for(let c=0;c<l.length;c++)l[c]=$r(l[c]/255)*255;return r.putImageData(a,0,0),t}else if(e.data){const t=e.data.slice(0);for(let r=0;r<t.length;r++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[r]=Math.floor($r(t[r]/255)*255):t[r]=$r(t[r]);return{data:t,width:e.width,height:e.height}}else return ot("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let bb=0;class Om{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:bb++}),this.uuid=rc(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const r={uuid:this.uuid,url:""},a=this.data;if(a!==null){let l;if(Array.isArray(a)){l=[];for(let c=0,h=a.length;c<h;c++)a[c].isDataTexture?l.push(Mf(a[c].image)):l.push(Mf(a[c]))}else l=Mf(a);r.url=l}return t||(e.images[this.uuid]=r),r}}function Mf(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?wb.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(ot("Texture: Unable to serialize Texture."),{})}let Tb=0;const Ef=new ie;class Wn extends Hs{constructor(e=Wn.DEFAULT_IMAGE,t=Wn.DEFAULT_MAPPING,r=Wr,a=Wr,l=jn,c=ma,h=Ki,d=Si,f=Wn.DEFAULT_ANISOTROPY,v=Cs){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Tb++}),this.uuid=rc(),this.name="",this.source=new Om(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=r,this.wrapT=a,this.magFilter=l,this.minFilter=c,this.anisotropy=f,this.format=h,this.internalFormat=null,this.type=d,this.offset=new ut(0,0),this.repeat=new ut(1,1),this.center=new ut(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new pt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=v,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Ef).x}get height(){return this.source.getSize(Ef).y}get depth(){return this.source.getSize(Ef).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const r=e[t];if(r===void 0){ot(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){ot(`Texture.setValues(): property '${t}' does not exist.`);continue}a&&r&&a.isVector2&&r.isVector2||a&&r&&a.isVector3&&r.isVector3||a&&r&&a.isMatrix3&&r.isMatrix3?a.copy(r):this[t]=r}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const r={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(r.userData=this.userData),t||(e.textures[this.uuid]=r),r}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==my)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Pp:e.x=e.x-Math.floor(e.x);break;case Wr:e.x=e.x<0?0:1;break;case Np:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Pp:e.y=e.y-Math.floor(e.y);break;case Wr:e.y=e.y<0?0:1;break;case Np:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Wn.DEFAULT_IMAGE=null;Wn.DEFAULT_MAPPING=my;Wn.DEFAULT_ANISOTROPY=1;const Wm=class Wm{constructor(e=0,t=0,r=0,a=1){this.x=e,this.y=t,this.z=r,this.w=a}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,r,a){return this.x=e,this.y=t,this.z=r,this.w=a,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,r=this.y,a=this.z,l=this.w,c=e.elements;return this.x=c[0]*t+c[4]*r+c[8]*a+c[12]*l,this.y=c[1]*t+c[5]*r+c[9]*a+c[13]*l,this.z=c[2]*t+c[6]*r+c[10]*a+c[14]*l,this.w=c[3]*t+c[7]*r+c[11]*a+c[15]*l,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,r,a,l;const d=e.elements,f=d[0],v=d[4],g=d[8],p=d[1],y=d[5],E=d[9],b=d[2],M=d[6],S=d[10];if(Math.abs(v-p)<.01&&Math.abs(g-b)<.01&&Math.abs(E-M)<.01){if(Math.abs(v+p)<.1&&Math.abs(g+b)<.1&&Math.abs(E+M)<.1&&Math.abs(f+y+S-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const D=(f+1)/2,C=(y+1)/2,I=(S+1)/2,L=(v+p)/4,U=(g+b)/4,w=(E+M)/4;return D>C&&D>I?D<.01?(r=0,a=.707106781,l=.707106781):(r=Math.sqrt(D),a=L/r,l=U/r):C>I?C<.01?(r=.707106781,a=0,l=.707106781):(a=Math.sqrt(C),r=L/a,l=w/a):I<.01?(r=.707106781,a=.707106781,l=0):(l=Math.sqrt(I),r=U/l,a=w/l),this.set(r,a,l,t),this}let A=Math.sqrt((M-E)*(M-E)+(g-b)*(g-b)+(p-v)*(p-v));return Math.abs(A)<.001&&(A=1),this.x=(M-E)/A,this.y=(g-b)/A,this.z=(p-v)/A,this.w=Math.acos((f+y+S-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Et(this.x,e.x,t.x),this.y=Et(this.y,e.y,t.y),this.z=Et(this.z,e.z,t.z),this.w=Et(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Et(this.x,e,t),this.y=Et(this.y,e,t),this.z=Et(this.z,e,t),this.w=Et(this.w,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(Et(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this.z=e.z+(t.z-e.z)*r,this.w=e.w+(t.w-e.w)*r,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};Wm.prototype.isVector4=!0;let cn=Wm;class Cb extends Hs{constructor(e=1,t=1,r={}){super(),r=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:jn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},r),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=r.depth,this.scissor=new cn(0,0,e,t),this.scissorTest=!1,this.viewport=new cn(0,0,e,t),this.textures=[];const a={width:e,height:t,depth:r.depth},l=new Wn(a),c=r.count;for(let h=0;h<c;h++)this.textures[h]=l.clone(),this.textures[h].isRenderTargetTexture=!0,this.textures[h].renderTarget=this;this._setTextureOptions(r),this.depthBuffer=r.depthBuffer,this.stencilBuffer=r.stencilBuffer,this.resolveDepthBuffer=r.resolveDepthBuffer,this.resolveStencilBuffer=r.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=r.depthTexture,this.samples=r.samples,this.multiview=r.multiview,this.useArrayDepthTexture=r.useArrayDepthTexture}_setTextureOptions(e={}){const t={minFilter:jn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let r=0;r<this.textures.length;r++)this.textures[r].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,r=1){if(this.width!==e||this.height!==t||this.depth!==r){this.width=e,this.height=t,this.depth=r;for(let a=0,l=this.textures.length;a<l;a++)this.textures[a].image.width=e,this.textures[a].image.height=t,this.textures[a].image.depth=r,this.textures[a].isData3DTexture!==!0&&(this.textures[a].isArrayTexture=this.textures[a].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,r=e.textures.length;t<r;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const a=Object.assign({},e.textures[t].image);this.textures[t].source=new Om(a)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class vr extends Cb{constructor(e=1,t=1,r={}){super(e,t,r),this.isWebGLRenderTarget=!0}}class wy extends Wn{constructor(e=null,t=1,r=1,a=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:r,depth:a},this.magFilter=Un,this.minFilter=Un,this.wrapR=Wr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Rb extends Wn{constructor(e=null,t=1,r=1,a=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:r,depth:a},this.magFilter=Un,this.minFilter=Un,this.wrapR=Wr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const ph=class ph{constructor(e,t,r,a,l,c,h,d,f,v,g,p,y,E,b,M){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,r,a,l,c,h,d,f,v,g,p,y,E,b,M)}set(e,t,r,a,l,c,h,d,f,v,g,p,y,E,b,M){const S=this.elements;return S[0]=e,S[4]=t,S[8]=r,S[12]=a,S[1]=l,S[5]=c,S[9]=h,S[13]=d,S[2]=f,S[6]=v,S[10]=g,S[14]=p,S[3]=y,S[7]=E,S[11]=b,S[15]=M,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ph().fromArray(this.elements)}copy(e){const t=this.elements,r=e.elements;return t[0]=r[0],t[1]=r[1],t[2]=r[2],t[3]=r[3],t[4]=r[4],t[5]=r[5],t[6]=r[6],t[7]=r[7],t[8]=r[8],t[9]=r[9],t[10]=r[10],t[11]=r[11],t[12]=r[12],t[13]=r[13],t[14]=r[14],t[15]=r[15],this}copyPosition(e){const t=this.elements,r=e.elements;return t[12]=r[12],t[13]=r[13],t[14]=r[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,r){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),r.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),r.setFromMatrixColumn(this,2),this)}makeBasis(e,t,r){return this.set(e.x,t.x,r.x,0,e.y,t.y,r.y,0,e.z,t.z,r.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();const t=this.elements,r=e.elements,a=1/to.setFromMatrixColumn(e,0).length(),l=1/to.setFromMatrixColumn(e,1).length(),c=1/to.setFromMatrixColumn(e,2).length();return t[0]=r[0]*a,t[1]=r[1]*a,t[2]=r[2]*a,t[3]=0,t[4]=r[4]*l,t[5]=r[5]*l,t[6]=r[6]*l,t[7]=0,t[8]=r[8]*c,t[9]=r[9]*c,t[10]=r[10]*c,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,r=e.x,a=e.y,l=e.z,c=Math.cos(r),h=Math.sin(r),d=Math.cos(a),f=Math.sin(a),v=Math.cos(l),g=Math.sin(l);if(e.order==="XYZ"){const p=c*v,y=c*g,E=h*v,b=h*g;t[0]=d*v,t[4]=-d*g,t[8]=f,t[1]=y+E*f,t[5]=p-b*f,t[9]=-h*d,t[2]=b-p*f,t[6]=E+y*f,t[10]=c*d}else if(e.order==="YXZ"){const p=d*v,y=d*g,E=f*v,b=f*g;t[0]=p+b*h,t[4]=E*h-y,t[8]=c*f,t[1]=c*g,t[5]=c*v,t[9]=-h,t[2]=y*h-E,t[6]=b+p*h,t[10]=c*d}else if(e.order==="ZXY"){const p=d*v,y=d*g,E=f*v,b=f*g;t[0]=p-b*h,t[4]=-c*g,t[8]=E+y*h,t[1]=y+E*h,t[5]=c*v,t[9]=b-p*h,t[2]=-c*f,t[6]=h,t[10]=c*d}else if(e.order==="ZYX"){const p=c*v,y=c*g,E=h*v,b=h*g;t[0]=d*v,t[4]=E*f-y,t[8]=p*f+b,t[1]=d*g,t[5]=b*f+p,t[9]=y*f-E,t[2]=-f,t[6]=h*d,t[10]=c*d}else if(e.order==="YZX"){const p=c*d,y=c*f,E=h*d,b=h*f;t[0]=d*v,t[4]=b-p*g,t[8]=E*g+y,t[1]=g,t[5]=c*v,t[9]=-h*v,t[2]=-f*v,t[6]=y*g+E,t[10]=p-b*g}else if(e.order==="XZY"){const p=c*d,y=c*f,E=h*d,b=h*f;t[0]=d*v,t[4]=-g,t[8]=f*v,t[1]=p*g+b,t[5]=c*v,t[9]=y*g-E,t[2]=E*g-y,t[6]=h*v,t[10]=b*g+p}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Ab,e,Pb)}lookAt(e,t,r){const a=this.elements;return xi.subVectors(e,t),xi.lengthSq()===0&&(xi.z=1),xi.normalize(),_s.crossVectors(r,xi),_s.lengthSq()===0&&(Math.abs(r.z)===1?xi.x+=1e-4:xi.z+=1e-4,xi.normalize(),_s.crossVectors(r,xi)),_s.normalize(),xu.crossVectors(xi,_s),a[0]=_s.x,a[4]=xu.x,a[8]=xi.x,a[1]=_s.y,a[5]=xu.y,a[9]=xi.y,a[2]=_s.z,a[6]=xu.z,a[10]=xi.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const r=e.elements,a=t.elements,l=this.elements,c=r[0],h=r[4],d=r[8],f=r[12],v=r[1],g=r[5],p=r[9],y=r[13],E=r[2],b=r[6],M=r[10],S=r[14],A=r[3],D=r[7],C=r[11],I=r[15],L=a[0],U=a[4],w=a[8],N=a[12],H=a[1],V=a[5],X=a[9],j=a[13],he=a[2],$=a[6],oe=a[10],Q=a[14],q=a[3],Y=a[7],Z=a[11],O=a[15];return l[0]=c*L+h*H+d*he+f*q,l[4]=c*U+h*V+d*$+f*Y,l[8]=c*w+h*X+d*oe+f*Z,l[12]=c*N+h*j+d*Q+f*O,l[1]=v*L+g*H+p*he+y*q,l[5]=v*U+g*V+p*$+y*Y,l[9]=v*w+g*X+p*oe+y*Z,l[13]=v*N+g*j+p*Q+y*O,l[2]=E*L+b*H+M*he+S*q,l[6]=E*U+b*V+M*$+S*Y,l[10]=E*w+b*X+M*oe+S*Z,l[14]=E*N+b*j+M*Q+S*O,l[3]=A*L+D*H+C*he+I*q,l[7]=A*U+D*V+C*$+I*Y,l[11]=A*w+D*X+C*oe+I*Z,l[15]=A*N+D*j+C*Q+I*O,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],r=e[4],a=e[8],l=e[12],c=e[1],h=e[5],d=e[9],f=e[13],v=e[2],g=e[6],p=e[10],y=e[14],E=e[3],b=e[7],M=e[11],S=e[15],A=d*y-f*p,D=h*y-f*g,C=h*p-d*g,I=c*y-f*v,L=c*p-d*v,U=c*g-h*v;return t*(b*A-M*D+S*C)-r*(E*A-M*I+S*L)+a*(E*D-b*I+S*U)-l*(E*C-b*L+M*U)}determinantAffine(){const e=this.elements,t=e[0],r=e[4],a=e[8],l=e[1],c=e[5],h=e[9],d=e[2],f=e[6],v=e[10];return t*(c*v-h*f)-r*(l*v-h*d)+a*(l*f-c*d)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,r){const a=this.elements;return e.isVector3?(a[12]=e.x,a[13]=e.y,a[14]=e.z):(a[12]=e,a[13]=t,a[14]=r),this}invert(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],h=e[5],d=e[6],f=e[7],v=e[8],g=e[9],p=e[10],y=e[11],E=e[12],b=e[13],M=e[14],S=e[15],A=t*h-r*c,D=t*d-a*c,C=t*f-l*c,I=r*d-a*h,L=r*f-l*h,U=a*f-l*d,w=v*b-g*E,N=v*M-p*E,H=v*S-y*E,V=g*M-p*b,X=g*S-y*b,j=p*S-y*M,he=A*j-D*X+C*V+I*H-L*N+U*w;if(he===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const $=1/he;return e[0]=(h*j-d*X+f*V)*$,e[1]=(a*X-r*j-l*V)*$,e[2]=(b*U-M*L+S*I)*$,e[3]=(p*L-g*U-y*I)*$,e[4]=(d*H-c*j-f*N)*$,e[5]=(t*j-a*H+l*N)*$,e[6]=(M*C-E*U-S*D)*$,e[7]=(v*U-p*C+y*D)*$,e[8]=(c*X-h*H+f*w)*$,e[9]=(r*H-t*X-l*w)*$,e[10]=(E*L-b*C+S*A)*$,e[11]=(g*C-v*L-y*A)*$,e[12]=(h*N-c*V-d*w)*$,e[13]=(t*V-r*N+a*w)*$,e[14]=(b*D-E*I-M*A)*$,e[15]=(v*I-g*D+p*A)*$,this}scale(e){const t=this.elements,r=e.x,a=e.y,l=e.z;return t[0]*=r,t[4]*=a,t[8]*=l,t[1]*=r,t[5]*=a,t[9]*=l,t[2]*=r,t[6]*=a,t[10]*=l,t[3]*=r,t[7]*=a,t[11]*=l,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],r=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],a=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,r,a))}makeTranslation(e,t,r){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,r,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),r=Math.sin(e);return this.set(1,0,0,0,0,t,-r,0,0,r,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,0,r,0,0,1,0,0,-r,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,-r,0,0,r,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const r=Math.cos(t),a=Math.sin(t),l=1-r,c=e.x,h=e.y,d=e.z,f=l*c,v=l*h;return this.set(f*c+r,f*h-a*d,f*d+a*h,0,f*h+a*d,v*h+r,v*d-a*c,0,f*d-a*h,v*d+a*c,l*d*d+r,0,0,0,0,1),this}makeScale(e,t,r){return this.set(e,0,0,0,0,t,0,0,0,0,r,0,0,0,0,1),this}makeShear(e,t,r,a,l,c){return this.set(1,r,l,0,e,1,c,0,t,a,1,0,0,0,0,1),this}compose(e,t,r){const a=this.elements,l=t._x,c=t._y,h=t._z,d=t._w,f=l+l,v=c+c,g=h+h,p=l*f,y=l*v,E=l*g,b=c*v,M=c*g,S=h*g,A=d*f,D=d*v,C=d*g,I=r.x,L=r.y,U=r.z;return a[0]=(1-(b+S))*I,a[1]=(y+C)*I,a[2]=(E-D)*I,a[3]=0,a[4]=(y-C)*L,a[5]=(1-(p+S))*L,a[6]=(M+A)*L,a[7]=0,a[8]=(E+D)*U,a[9]=(M-A)*U,a[10]=(1-(p+b))*U,a[11]=0,a[12]=e.x,a[13]=e.y,a[14]=e.z,a[15]=1,this}decompose(e,t,r){const a=this.elements;e.x=a[12],e.y=a[13],e.z=a[14];const l=this.determinantAffine();if(l===0)return r.set(1,1,1),t.identity(),this;let c=to.set(a[0],a[1],a[2]).length();const h=to.set(a[4],a[5],a[6]).length(),d=to.set(a[8],a[9],a[10]).length();l<0&&(c=-c),ji.copy(this);const f=1/c,v=1/h,g=1/d;return ji.elements[0]*=f,ji.elements[1]*=f,ji.elements[2]*=f,ji.elements[4]*=v,ji.elements[5]*=v,ji.elements[6]*=v,ji.elements[8]*=g,ji.elements[9]*=g,ji.elements[10]*=g,t.setFromRotationMatrix(ji),r.x=c,r.y=h,r.z=d,this}makePerspective(e,t,r,a,l,c,h=mr,d=!1){const f=this.elements,v=2*l/(t-e),g=2*l/(r-a),p=(t+e)/(t-e),y=(r+a)/(r-a);let E,b;if(d)E=l/(c-l),b=c*l/(c-l);else if(h===mr)E=-(c+l)/(c-l),b=-2*c*l/(c-l);else if(h===ql)E=-c/(c-l),b=-c*l/(c-l);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+h);return f[0]=v,f[4]=0,f[8]=p,f[12]=0,f[1]=0,f[5]=g,f[9]=y,f[13]=0,f[2]=0,f[6]=0,f[10]=E,f[14]=b,f[3]=0,f[7]=0,f[11]=-1,f[15]=0,this}makeOrthographic(e,t,r,a,l,c,h=mr,d=!1){const f=this.elements,v=2/(t-e),g=2/(r-a),p=-(t+e)/(t-e),y=-(r+a)/(r-a);let E,b;if(d)E=1/(c-l),b=c/(c-l);else if(h===mr)E=-2/(c-l),b=-(c+l)/(c-l);else if(h===ql)E=-1/(c-l),b=-l/(c-l);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+h);return f[0]=v,f[4]=0,f[8]=0,f[12]=p,f[1]=0,f[5]=g,f[9]=0,f[13]=y,f[2]=0,f[6]=0,f[10]=E,f[14]=b,f[3]=0,f[7]=0,f[11]=0,f[15]=1,this}equals(e){const t=this.elements,r=e.elements;for(let a=0;a<16;a++)if(t[a]!==r[a])return!1;return!0}fromArray(e,t=0){for(let r=0;r<16;r++)this.elements[r]=e[r+t];return this}toArray(e=[],t=0){const r=this.elements;return e[t]=r[0],e[t+1]=r[1],e[t+2]=r[2],e[t+3]=r[3],e[t+4]=r[4],e[t+5]=r[5],e[t+6]=r[6],e[t+7]=r[7],e[t+8]=r[8],e[t+9]=r[9],e[t+10]=r[10],e[t+11]=r[11],e[t+12]=r[12],e[t+13]=r[13],e[t+14]=r[14],e[t+15]=r[15],e}};ph.prototype.isMatrix4=!0;let rn=ph;const to=new ie,ji=new rn,Ab=new ie(0,0,0),Pb=new ie(1,1,1),_s=new ie,xu=new ie,xi=new ie,tv=new rn,nv=new Vs;class Zr{constructor(e=0,t=0,r=0,a=Zr.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=r,this._order=a}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,r,a=this._order){return this._x=e,this._y=t,this._z=r,this._order=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,r=!0){const a=e.elements,l=a[0],c=a[4],h=a[8],d=a[1],f=a[5],v=a[9],g=a[2],p=a[6],y=a[10];switch(t){case"XYZ":this._y=Math.asin(Et(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(-v,y),this._z=Math.atan2(-c,l)):(this._x=Math.atan2(p,f),this._z=0);break;case"YXZ":this._x=Math.asin(-Et(v,-1,1)),Math.abs(v)<.9999999?(this._y=Math.atan2(h,y),this._z=Math.atan2(d,f)):(this._y=Math.atan2(-g,l),this._z=0);break;case"ZXY":this._x=Math.asin(Et(p,-1,1)),Math.abs(p)<.9999999?(this._y=Math.atan2(-g,y),this._z=Math.atan2(-c,f)):(this._y=0,this._z=Math.atan2(d,l));break;case"ZYX":this._y=Math.asin(-Et(g,-1,1)),Math.abs(g)<.9999999?(this._x=Math.atan2(p,y),this._z=Math.atan2(d,l)):(this._x=0,this._z=Math.atan2(-c,f));break;case"YZX":this._z=Math.asin(Et(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(-v,f),this._y=Math.atan2(-g,l)):(this._x=0,this._y=Math.atan2(h,y));break;case"XZY":this._z=Math.asin(-Et(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(p,f),this._y=Math.atan2(h,l)):(this._x=Math.atan2(-v,y),this._y=0);break;default:ot("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,r===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,r){return tv.makeRotationFromQuaternion(e),this.setFromRotationMatrix(tv,t,r)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return nv.setFromEuler(this),this.setFromQuaternion(nv,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Zr.DEFAULT_ORDER="XYZ";class by{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Nb=0;const iv=new ie,no=new Vs,Lr=new rn,vu=new ie,Al=new ie,Lb=new ie,Db=new Vs,rv=new ie(1,0,0),sv=new ie(0,1,0),av=new ie(0,0,1),ov={type:"added"},Ib={type:"removed"},io={type:"childadded",child:null},wf={type:"childremoved",child:null};class An extends Hs{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Nb++}),this.uuid=rc(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=An.DEFAULT_UP.clone();const e=new ie,t=new Zr,r=new Vs,a=new ie(1,1,1);function l(){r.setFromEuler(t,!1)}function c(){t.setFromQuaternion(r,void 0,!1)}t._onChange(l),r._onChange(c),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:a},modelViewMatrix:{value:new rn},normalMatrix:{value:new pt}}),this.matrix=new rn,this.matrixWorld=new rn,this.matrixAutoUpdate=An.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=An.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new by,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return no.setFromAxisAngle(e,t),this.quaternion.multiply(no),this}rotateOnWorldAxis(e,t){return no.setFromAxisAngle(e,t),this.quaternion.premultiply(no),this}rotateX(e){return this.rotateOnAxis(rv,e)}rotateY(e){return this.rotateOnAxis(sv,e)}rotateZ(e){return this.rotateOnAxis(av,e)}translateOnAxis(e,t){return iv.copy(e).applyQuaternion(this.quaternion),this.position.add(iv.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(rv,e)}translateY(e){return this.translateOnAxis(sv,e)}translateZ(e){return this.translateOnAxis(av,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Lr.copy(this.matrixWorld).invert())}lookAt(e,t,r){e.isVector3?vu.copy(e):vu.set(e,t,r);const a=this.parent;this.updateWorldMatrix(!0,!1),Al.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Lr.lookAt(Al,vu,this.up):Lr.lookAt(vu,Al,this.up),this.quaternion.setFromRotationMatrix(Lr),a&&(Lr.extractRotation(a.matrixWorld),no.setFromRotationMatrix(Lr),this.quaternion.premultiply(no.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Nt("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(ov),io.child=e,this.dispatchEvent(io),io.child=null):Nt("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let r=0;r<arguments.length;r++)this.remove(arguments[r]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Ib),wf.child=e,this.dispatchEvent(wf),wf.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Lr.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Lr.multiply(e.parent.matrixWorld)),e.applyMatrix4(Lr),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(ov),io.child=e,this.dispatchEvent(io),io.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let r=0,a=this.children.length;r<a;r++){const c=this.children[r].getObjectByProperty(e,t);if(c!==void 0)return c}}getObjectsByProperty(e,t,r=[]){this[e]===t&&r.push(this);const a=this.children;for(let l=0,c=a.length;l<c;l++)a[l].getObjectsByProperty(e,t,r);return r}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Al,e,Lb),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Al,Db,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,r=e.y,a=e.z,l=this.matrix.elements;l[12]+=t-l[0]*t-l[4]*r-l[8]*a,l[13]+=r-l[1]*t-l[5]*r-l[9]*a,l[14]+=a-l[2]*t-l[6]*r-l[10]*a}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].updateMatrixWorld(e)}updateWorldMatrix(e,t,r=!1){const a=this.parent;if(e===!0&&a!==null&&a.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||r)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,r=!0),t===!0){const l=this.children;for(let c=0,h=l.length;c<h;c++)l[c].updateWorldMatrix(!1,!0,r)}}toJSON(e){const t=e===void 0||typeof e=="string",r={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},r.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const a={};a.uuid=this.uuid,a.type=this.type,this.name!==""&&(a.name=this.name),this.castShadow===!0&&(a.castShadow=!0),this.receiveShadow===!0&&(a.receiveShadow=!0),this.visible===!1&&(a.visible=!1),this.frustumCulled===!1&&(a.frustumCulled=!1),this.renderOrder!==0&&(a.renderOrder=this.renderOrder),this.static!==!1&&(a.static=this.static),Object.keys(this.userData).length>0&&(a.userData=this.userData),a.layers=this.layers.mask,a.matrix=this.matrix.toArray(),a.up=this.up.toArray(),this.pivot!==null&&(a.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(a.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(a.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(a.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(a.type="InstancedMesh",a.count=this.count,a.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(a.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(a.type="BatchedMesh",a.perObjectFrustumCulled=this.perObjectFrustumCulled,a.sortObjects=this.sortObjects,a.drawRanges=this._drawRanges,a.reservedRanges=this._reservedRanges,a.geometryInfo=this._geometryInfo.map(h=>({...h,boundingBox:h.boundingBox?h.boundingBox.toJSON():void 0,boundingSphere:h.boundingSphere?h.boundingSphere.toJSON():void 0})),a.instanceInfo=this._instanceInfo.map(h=>({...h})),a.availableInstanceIds=this._availableInstanceIds.slice(),a.availableGeometryIds=this._availableGeometryIds.slice(),a.nextIndexStart=this._nextIndexStart,a.nextVertexStart=this._nextVertexStart,a.geometryCount=this._geometryCount,a.maxInstanceCount=this._maxInstanceCount,a.maxVertexCount=this._maxVertexCount,a.maxIndexCount=this._maxIndexCount,a.geometryInitialized=this._geometryInitialized,a.matricesTexture=this._matricesTexture.toJSON(e),a.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(a.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(a.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(a.boundingBox=this.boundingBox.toJSON()));function l(h,d){return h[d.uuid]===void 0&&(h[d.uuid]=d.toJSON(e)),d.uuid}if(this.isScene)this.background&&(this.background.isColor?a.background=this.background.toJSON():this.background.isTexture&&(a.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(a.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){a.geometry=l(e.geometries,this.geometry);const h=this.geometry.parameters;if(h!==void 0&&h.shapes!==void 0){const d=h.shapes;if(Array.isArray(d))for(let f=0,v=d.length;f<v;f++){const g=d[f];l(e.shapes,g)}else l(e.shapes,d)}}if(this.isSkinnedMesh&&(a.bindMode=this.bindMode,a.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(l(e.skeletons,this.skeleton),a.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const h=[];for(let d=0,f=this.material.length;d<f;d++)h.push(l(e.materials,this.material[d]));a.material=h}else a.material=l(e.materials,this.material);if(this.children.length>0){a.children=[];for(let h=0;h<this.children.length;h++)a.children.push(this.children[h].toJSON(e).object)}if(this.animations.length>0){a.animations=[];for(let h=0;h<this.animations.length;h++){const d=this.animations[h];a.animations.push(l(e.animations,d))}}if(t){const h=c(e.geometries),d=c(e.materials),f=c(e.textures),v=c(e.images),g=c(e.shapes),p=c(e.skeletons),y=c(e.animations),E=c(e.nodes);h.length>0&&(r.geometries=h),d.length>0&&(r.materials=d),f.length>0&&(r.textures=f),v.length>0&&(r.images=v),g.length>0&&(r.shapes=g),p.length>0&&(r.skeletons=p),y.length>0&&(r.animations=y),E.length>0&&(r.nodes=E)}return r.object=a,r;function c(h){const d=[];for(const f in h){const v=h[f];delete v.metadata,d.push(v)}return d}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let r=0;r<e.children.length;r++){const a=e.children[r];this.add(a.clone())}return this}}An.DEFAULT_UP=new ie(0,1,0);An.DEFAULT_MATRIX_AUTO_UPDATE=!0;An.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class Ol extends An{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Ub={type:"move"};class bf{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ol,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ol,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new ie,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new ie),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ol,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new ie,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new ie,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const r of e.hand.values())this._getHandJoint(t,r)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,r){let a=null,l=null,c=null;const h=this._targetRay,d=this._grip,f=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(f&&e.hand){c=!0;for(const b of e.hand.values()){const M=t.getJointPose(b,r),S=this._getHandJoint(f,b);M!==null&&(S.matrix.fromArray(M.transform.matrix),S.matrix.decompose(S.position,S.rotation,S.scale),S.matrixWorldNeedsUpdate=!0,S.jointRadius=M.radius),S.visible=M!==null}const v=f.joints["index-finger-tip"],g=f.joints["thumb-tip"],p=v.position.distanceTo(g.position),y=.02,E=.005;f.inputState.pinching&&p>y+E?(f.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!f.inputState.pinching&&p<=y-E&&(f.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else d!==null&&e.gripSpace&&(l=t.getPose(e.gripSpace,r),l!==null&&(d.matrix.fromArray(l.transform.matrix),d.matrix.decompose(d.position,d.rotation,d.scale),d.matrixWorldNeedsUpdate=!0,l.linearVelocity?(d.hasLinearVelocity=!0,d.linearVelocity.copy(l.linearVelocity)):d.hasLinearVelocity=!1,l.angularVelocity?(d.hasAngularVelocity=!0,d.angularVelocity.copy(l.angularVelocity)):d.hasAngularVelocity=!1,d.eventsEnabled&&d.dispatchEvent({type:"gripUpdated",data:e,target:this})));h!==null&&(a=t.getPose(e.targetRaySpace,r),a===null&&l!==null&&(a=l),a!==null&&(h.matrix.fromArray(a.transform.matrix),h.matrix.decompose(h.position,h.rotation,h.scale),h.matrixWorldNeedsUpdate=!0,a.linearVelocity?(h.hasLinearVelocity=!0,h.linearVelocity.copy(a.linearVelocity)):h.hasLinearVelocity=!1,a.angularVelocity?(h.hasAngularVelocity=!0,h.angularVelocity.copy(a.angularVelocity)):h.hasAngularVelocity=!1,this.dispatchEvent(Ub)))}return h!==null&&(h.visible=a!==null),d!==null&&(d.visible=l!==null),f!==null&&(f.visible=c!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const r=new Ol;r.matrixAutoUpdate=!1,r.visible=!1,e.joints[t.jointName]=r,e.add(r)}return e.joints[t.jointName]}}const Ty={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},ys={h:0,s:0,l:0},_u={h:0,s:0,l:0};function Tf(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class _t{constructor(e,t,r){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,r)}set(e,t,r){if(t===void 0&&r===void 0){const a=e;a&&a.isColor?this.copy(a):typeof a=="number"?this.setHex(a):typeof a=="string"&&this.setStyle(a)}else this.setRGB(e,t,r);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=hi){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Tt.colorSpaceToWorking(this,t),this}setRGB(e,t,r,a=Tt.workingColorSpace){return this.r=e,this.g=t,this.b=r,Tt.colorSpaceToWorking(this,a),this}setHSL(e,t,r,a=Tt.workingColorSpace){if(e=Sb(e,1),t=Et(t,0,1),r=Et(r,0,1),t===0)this.r=this.g=this.b=r;else{const l=r<=.5?r*(1+t):r+t-r*t,c=2*r-l;this.r=Tf(c,l,e+1/3),this.g=Tf(c,l,e),this.b=Tf(c,l,e-1/3)}return Tt.colorSpaceToWorking(this,a),this}setStyle(e,t=hi){function r(l){l!==void 0&&parseFloat(l)<1&&ot("Color: Alpha component of "+e+" will be ignored.")}let a;if(a=/^(\w+)\(([^\)]*)\)/.exec(e)){let l;const c=a[1],h=a[2];switch(c){case"rgb":case"rgba":if(l=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(h))return r(l[4]),this.setRGB(Math.min(255,parseInt(l[1],10))/255,Math.min(255,parseInt(l[2],10))/255,Math.min(255,parseInt(l[3],10))/255,t);if(l=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(h))return r(l[4]),this.setRGB(Math.min(100,parseInt(l[1],10))/100,Math.min(100,parseInt(l[2],10))/100,Math.min(100,parseInt(l[3],10))/100,t);break;case"hsl":case"hsla":if(l=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(h))return r(l[4]),this.setHSL(parseFloat(l[1])/360,parseFloat(l[2])/100,parseFloat(l[3])/100,t);break;default:ot("Color: Unknown color model "+e)}}else if(a=/^\#([A-Fa-f\d]+)$/.exec(e)){const l=a[1],c=l.length;if(c===3)return this.setRGB(parseInt(l.charAt(0),16)/15,parseInt(l.charAt(1),16)/15,parseInt(l.charAt(2),16)/15,t);if(c===6)return this.setHex(parseInt(l,16),t);ot("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=hi){const r=Ty[e.toLowerCase()];return r!==void 0?this.setHex(r,t):ot("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=$r(e.r),this.g=$r(e.g),this.b=$r(e.b),this}copyLinearToSRGB(e){return this.r=So(e.r),this.g=So(e.g),this.b=So(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=hi){return Tt.workingToColorSpace(Hn.copy(this),e),Math.round(Et(Hn.r*255,0,255))*65536+Math.round(Et(Hn.g*255,0,255))*256+Math.round(Et(Hn.b*255,0,255))}getHexString(e=hi){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Tt.workingColorSpace){Tt.workingToColorSpace(Hn.copy(this),t);const r=Hn.r,a=Hn.g,l=Hn.b,c=Math.max(r,a,l),h=Math.min(r,a,l);let d,f;const v=(h+c)/2;if(h===c)d=0,f=0;else{const g=c-h;switch(f=v<=.5?g/(c+h):g/(2-c-h),c){case r:d=(a-l)/g+(a<l?6:0);break;case a:d=(l-r)/g+2;break;case l:d=(r-a)/g+4;break}d/=6}return e.h=d,e.s=f,e.l=v,e}getRGB(e,t=Tt.workingColorSpace){return Tt.workingToColorSpace(Hn.copy(this),t),e.r=Hn.r,e.g=Hn.g,e.b=Hn.b,e}getStyle(e=hi){Tt.workingToColorSpace(Hn.copy(this),e);const t=Hn.r,r=Hn.g,a=Hn.b;return e!==hi?`color(${e} ${t.toFixed(3)} ${r.toFixed(3)} ${a.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(r*255)},${Math.round(a*255)})`}offsetHSL(e,t,r){return this.getHSL(ys),this.setHSL(ys.h+e,ys.s+t,ys.l+r)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,r){return this.r=e.r+(t.r-e.r)*r,this.g=e.g+(t.g-e.g)*r,this.b=e.b+(t.b-e.b)*r,this}lerpHSL(e,t){this.getHSL(ys),e.getHSL(_u);const r=_f(ys.h,_u.h,t),a=_f(ys.s,_u.s,t),l=_f(ys.l,_u.l,t);return this.setHSL(r,a,l),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,r=this.g,a=this.b,l=e.elements;return this.r=l[0]*t+l[3]*r+l[6]*a,this.g=l[1]*t+l[4]*r+l[7]*a,this.b=l[2]*t+l[5]*r+l[8]*a,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Hn=new _t;_t.NAMES=Ty;class Fb extends An{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Zr,this.environmentIntensity=1,this.environmentRotation=new Zr,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const Wi=new ie,Dr=new ie,Cf=new ie,Ir=new ie,ro=new ie,so=new ie,lv=new ie,Rf=new ie,Af=new ie,Pf=new ie,Nf=new cn,Lf=new cn,Df=new cn;class qi{constructor(e=new ie,t=new ie,r=new ie){this.a=e,this.b=t,this.c=r}static getNormal(e,t,r,a){a.subVectors(r,t),Wi.subVectors(e,t),a.cross(Wi);const l=a.lengthSq();return l>0?a.multiplyScalar(1/Math.sqrt(l)):a.set(0,0,0)}static getBarycoord(e,t,r,a,l){Wi.subVectors(a,t),Dr.subVectors(r,t),Cf.subVectors(e,t);const c=Wi.dot(Wi),h=Wi.dot(Dr),d=Wi.dot(Cf),f=Dr.dot(Dr),v=Dr.dot(Cf),g=c*f-h*h;if(g===0)return l.set(0,0,0),null;const p=1/g,y=(f*d-h*v)*p,E=(c*v-h*d)*p;return l.set(1-y-E,E,y)}static containsPoint(e,t,r,a){return this.getBarycoord(e,t,r,a,Ir)===null?!1:Ir.x>=0&&Ir.y>=0&&Ir.x+Ir.y<=1}static getInterpolation(e,t,r,a,l,c,h,d){return this.getBarycoord(e,t,r,a,Ir)===null?(d.x=0,d.y=0,"z"in d&&(d.z=0),"w"in d&&(d.w=0),null):(d.setScalar(0),d.addScaledVector(l,Ir.x),d.addScaledVector(c,Ir.y),d.addScaledVector(h,Ir.z),d)}static getInterpolatedAttribute(e,t,r,a,l,c){return Nf.setScalar(0),Lf.setScalar(0),Df.setScalar(0),Nf.fromBufferAttribute(e,t),Lf.fromBufferAttribute(e,r),Df.fromBufferAttribute(e,a),c.setScalar(0),c.addScaledVector(Nf,l.x),c.addScaledVector(Lf,l.y),c.addScaledVector(Df,l.z),c}static isFrontFacing(e,t,r,a){return Wi.subVectors(r,t),Dr.subVectors(e,t),Wi.cross(Dr).dot(a)<0}set(e,t,r){return this.a.copy(e),this.b.copy(t),this.c.copy(r),this}setFromPointsAndIndices(e,t,r,a){return this.a.copy(e[t]),this.b.copy(e[r]),this.c.copy(e[a]),this}setFromAttributeAndIndices(e,t,r,a){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,r),this.c.fromBufferAttribute(e,a),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Wi.subVectors(this.c,this.b),Dr.subVectors(this.a,this.b),Wi.cross(Dr).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return qi.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return qi.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,r,a,l){return qi.getInterpolation(e,this.a,this.b,this.c,t,r,a,l)}containsPoint(e){return qi.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return qi.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const r=this.a,a=this.b,l=this.c;let c,h;ro.subVectors(a,r),so.subVectors(l,r),Rf.subVectors(e,r);const d=ro.dot(Rf),f=so.dot(Rf);if(d<=0&&f<=0)return t.copy(r);Af.subVectors(e,a);const v=ro.dot(Af),g=so.dot(Af);if(v>=0&&g<=v)return t.copy(a);const p=d*g-v*f;if(p<=0&&d>=0&&v<=0)return c=d/(d-v),t.copy(r).addScaledVector(ro,c);Pf.subVectors(e,l);const y=ro.dot(Pf),E=so.dot(Pf);if(E>=0&&y<=E)return t.copy(l);const b=y*f-d*E;if(b<=0&&f>=0&&E<=0)return h=f/(f-E),t.copy(r).addScaledVector(so,h);const M=v*E-y*g;if(M<=0&&g-v>=0&&y-E>=0)return lv.subVectors(l,a),h=(g-v)/(g-v+(y-E)),t.copy(a).addScaledVector(lv,h);const S=1/(M+b+p);return c=b*S,h=p*S,t.copy(r).addScaledVector(ro,c).addScaledVector(so,h)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class Go{constructor(e=new ie(1/0,1/0,1/0),t=new ie(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,r=e.length;t<r;t+=3)this.expandByPoint(Xi.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,r=e.count;t<r;t++)this.expandByPoint(Xi.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,r=e.length;t<r;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const r=Xi.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(r),this.max.copy(e).add(r),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const r=e.geometry;if(r!==void 0){const l=r.getAttribute("position");if(t===!0&&l!==void 0&&e.isInstancedMesh!==!0)for(let c=0,h=l.count;c<h;c++)e.isMesh===!0?e.getVertexPosition(c,Xi):Xi.fromBufferAttribute(l,c),Xi.applyMatrix4(e.matrixWorld),this.expandByPoint(Xi);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),yu.copy(e.boundingBox)):(r.boundingBox===null&&r.computeBoundingBox(),yu.copy(r.boundingBox)),yu.applyMatrix4(e.matrixWorld),this.union(yu)}const a=e.children;for(let l=0,c=a.length;l<c;l++)this.expandByObject(a[l],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Xi),Xi.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,r;return e.normal.x>0?(t=e.normal.x*this.min.x,r=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,r=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,r+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,r+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,r+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,r+=e.normal.z*this.min.z),t<=-e.constant&&r>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Pl),Su.subVectors(this.max,Pl),ao.subVectors(e.a,Pl),oo.subVectors(e.b,Pl),lo.subVectors(e.c,Pl),Ss.subVectors(oo,ao),Ms.subVectors(lo,oo),oa.subVectors(ao,lo);let t=[0,-Ss.z,Ss.y,0,-Ms.z,Ms.y,0,-oa.z,oa.y,Ss.z,0,-Ss.x,Ms.z,0,-Ms.x,oa.z,0,-oa.x,-Ss.y,Ss.x,0,-Ms.y,Ms.x,0,-oa.y,oa.x,0];return!If(t,ao,oo,lo,Su)||(t=[1,0,0,0,1,0,0,0,1],!If(t,ao,oo,lo,Su))?!1:(Mu.crossVectors(Ss,Ms),t=[Mu.x,Mu.y,Mu.z],If(t,ao,oo,lo,Su))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Xi).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Xi).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Ur[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Ur[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Ur[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Ur[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Ur[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Ur[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Ur[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Ur[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Ur),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Ur=[new ie,new ie,new ie,new ie,new ie,new ie,new ie,new ie],Xi=new ie,yu=new Go,ao=new ie,oo=new ie,lo=new ie,Ss=new ie,Ms=new ie,oa=new ie,Pl=new ie,Su=new ie,Mu=new ie,la=new ie;function If(i,e,t,r,a){for(let l=0,c=i.length-3;l<=c;l+=3){la.fromArray(i,l);const h=a.x*Math.abs(la.x)+a.y*Math.abs(la.y)+a.z*Math.abs(la.z),d=e.dot(la),f=t.dot(la),v=r.dot(la);if(Math.max(-Math.max(d,f,v),Math.min(d,f,v))>h)return!1}return!0}const xn=new ie,Eu=new ut;let kb=0;class _r extends Hs{constructor(e,t,r=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:kb++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=r,this.usage=qx,this.updateRanges=[],this.gpuType=pr,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,r){e*=this.itemSize,r*=t.itemSize;for(let a=0,l=this.itemSize;a<l;a++)this.array[e+a]=t.array[r+a];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,r=this.count;t<r;t++)Eu.fromBufferAttribute(this,t),Eu.applyMatrix3(e),this.setXY(t,Eu.x,Eu.y);else if(this.itemSize===3)for(let t=0,r=this.count;t<r;t++)xn.fromBufferAttribute(this,t),xn.applyMatrix3(e),this.setXYZ(t,xn.x,xn.y,xn.z);return this}applyMatrix4(e){for(let t=0,r=this.count;t<r;t++)xn.fromBufferAttribute(this,t),xn.applyMatrix4(e),this.setXYZ(t,xn.x,xn.y,xn.z);return this}applyNormalMatrix(e){for(let t=0,r=this.count;t<r;t++)xn.fromBufferAttribute(this,t),xn.applyNormalMatrix(e),this.setXYZ(t,xn.x,xn.y,xn.z);return this}transformDirection(e){for(let t=0,r=this.count;t<r;t++)xn.fromBufferAttribute(this,t),xn.transformDirection(e),this.setXYZ(t,xn.x,xn.y,xn.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let r=this.array[e*this.itemSize+t];return this.normalized&&(r=Rl(r,this.array)),r}setComponent(e,t,r){return this.normalized&&(r=oi(r,this.array)),this.array[e*this.itemSize+t]=r,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Rl(t,this.array)),t}setX(e,t){return this.normalized&&(t=oi(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Rl(t,this.array)),t}setY(e,t){return this.normalized&&(t=oi(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Rl(t,this.array)),t}setZ(e,t){return this.normalized&&(t=oi(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Rl(t,this.array)),t}setW(e,t){return this.normalized&&(t=oi(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,r){return e*=this.itemSize,this.normalized&&(t=oi(t,this.array),r=oi(r,this.array)),this.array[e+0]=t,this.array[e+1]=r,this}setXYZ(e,t,r,a){return e*=this.itemSize,this.normalized&&(t=oi(t,this.array),r=oi(r,this.array),a=oi(a,this.array)),this.array[e+0]=t,this.array[e+1]=r,this.array[e+2]=a,this}setXYZW(e,t,r,a,l){return e*=this.itemSize,this.normalized&&(t=oi(t,this.array),r=oi(r,this.array),a=oi(a,this.array),l=oi(l,this.array)),this.array[e+0]=t,this.array[e+1]=r,this.array[e+2]=a,this.array[e+3]=l,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==qx&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}}class Cy extends _r{constructor(e,t,r){super(new Uint16Array(e),t,r)}}class Ry extends _r{constructor(e,t,r){super(new Uint32Array(e),t,r)}}class In extends _r{constructor(e,t,r){super(new Float32Array(e),t,r)}}const Ob=new Go,Nl=new ie,Uf=new ie;class sc{constructor(e=new ie,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const r=this.center;t!==void 0?r.copy(t):Ob.setFromPoints(e).getCenter(r);let a=0;for(let l=0,c=e.length;l<c;l++)a=Math.max(a,r.distanceToSquared(e[l]));return this.radius=Math.sqrt(a),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const r=this.center.distanceToSquared(e);return t.copy(e),r>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Nl.subVectors(e,this.center);const t=Nl.lengthSq();if(t>this.radius*this.radius){const r=Math.sqrt(t),a=(r-this.radius)*.5;this.center.addScaledVector(Nl,a/r),this.radius+=a}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Uf.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Nl.copy(e.center).add(Uf)),this.expandByPoint(Nl.copy(e.center).sub(Uf))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let zb=0;const Ni=new rn,Ff=new An,co=new ie,vi=new Go,Ll=new Go,Cn=new ie;class Mi extends Hs{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:zb++}),this.uuid=rc(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(xb(e)?Ry:Cy)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,r=0){this.groups.push({start:e,count:t,materialIndex:r})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const r=this.attributes.normal;if(r!==void 0){const l=new pt().getNormalMatrix(e);r.applyNormalMatrix(l),r.needsUpdate=!0}const a=this.attributes.tangent;return a!==void 0&&(a.transformDirection(e),a.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return Ni.makeRotationFromQuaternion(e),this.applyMatrix4(Ni),this}rotateX(e){return Ni.makeRotationX(e),this.applyMatrix4(Ni),this}rotateY(e){return Ni.makeRotationY(e),this.applyMatrix4(Ni),this}rotateZ(e){return Ni.makeRotationZ(e),this.applyMatrix4(Ni),this}translate(e,t,r){return Ni.makeTranslation(e,t,r),this.applyMatrix4(Ni),this}scale(e,t,r){return Ni.makeScale(e,t,r),this.applyMatrix4(Ni),this}lookAt(e){return Ff.lookAt(e),Ff.updateMatrix(),this.applyMatrix4(Ff.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(co).negate(),this.translate(co.x,co.y,co.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const r=[];for(let a=0,l=e.length;a<l;a++){const c=e[a];r.push(c.x,c.y,c.z||0)}this.setAttribute("position",new In(r,3))}else{const r=Math.min(e.length,t.count);for(let a=0;a<r;a++){const l=e[a];t.setXYZ(a,l.x,l.y,l.z||0)}e.length>t.count&&ot("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Go);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Nt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new ie(-1/0,-1/0,-1/0),new ie(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){const l=t[r];vi.setFromBufferAttribute(l),this.morphTargetsRelative?(Cn.addVectors(this.boundingBox.min,vi.min),this.boundingBox.expandByPoint(Cn),Cn.addVectors(this.boundingBox.max,vi.max),this.boundingBox.expandByPoint(Cn)):(this.boundingBox.expandByPoint(vi.min),this.boundingBox.expandByPoint(vi.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Nt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new sc);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Nt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new ie,1/0);return}if(e){const r=this.boundingSphere.center;if(vi.setFromBufferAttribute(e),t)for(let l=0,c=t.length;l<c;l++){const h=t[l];Ll.setFromBufferAttribute(h),this.morphTargetsRelative?(Cn.addVectors(vi.min,Ll.min),vi.expandByPoint(Cn),Cn.addVectors(vi.max,Ll.max),vi.expandByPoint(Cn)):(vi.expandByPoint(Ll.min),vi.expandByPoint(Ll.max))}vi.getCenter(r);let a=0;for(let l=0,c=e.count;l<c;l++)Cn.fromBufferAttribute(e,l),a=Math.max(a,r.distanceToSquared(Cn));if(t)for(let l=0,c=t.length;l<c;l++){const h=t[l],d=this.morphTargetsRelative;for(let f=0,v=h.count;f<v;f++)Cn.fromBufferAttribute(h,f),d&&(co.fromBufferAttribute(e,f),Cn.add(co)),a=Math.max(a,r.distanceToSquared(Cn))}this.boundingSphere.radius=Math.sqrt(a),isNaN(this.boundingSphere.radius)&&Nt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Nt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const r=t.position,a=t.normal,l=t.uv;let c=this.getAttribute("tangent");(c===void 0||c.count!==r.count)&&(c=new _r(new Float32Array(4*r.count),4),this.setAttribute("tangent",c));const h=[],d=[];for(let w=0;w<r.count;w++)h[w]=new ie,d[w]=new ie;const f=new ie,v=new ie,g=new ie,p=new ut,y=new ut,E=new ut,b=new ie,M=new ie;function S(w,N,H){f.fromBufferAttribute(r,w),v.fromBufferAttribute(r,N),g.fromBufferAttribute(r,H),p.fromBufferAttribute(l,w),y.fromBufferAttribute(l,N),E.fromBufferAttribute(l,H),v.sub(f),g.sub(f),y.sub(p),E.sub(p);const V=1/(y.x*E.y-E.x*y.y);isFinite(V)&&(b.copy(v).multiplyScalar(E.y).addScaledVector(g,-y.y).multiplyScalar(V),M.copy(g).multiplyScalar(y.x).addScaledVector(v,-E.x).multiplyScalar(V),h[w].add(b),h[N].add(b),h[H].add(b),d[w].add(M),d[N].add(M),d[H].add(M))}let A=this.groups;A.length===0&&(A=[{start:0,count:e.count}]);for(let w=0,N=A.length;w<N;++w){const H=A[w],V=H.start,X=H.count;for(let j=V,he=V+X;j<he;j+=3)S(e.getX(j+0),e.getX(j+1),e.getX(j+2))}const D=new ie,C=new ie,I=new ie,L=new ie;function U(w){I.fromBufferAttribute(a,w),L.copy(I);const N=h[w];D.copy(N),D.sub(I.multiplyScalar(I.dot(N))).normalize(),C.crossVectors(L,N);const V=C.dot(d[w])<0?-1:1;c.setXYZW(w,D.x,D.y,D.z,V)}for(let w=0,N=A.length;w<N;++w){const H=A[w],V=H.start,X=H.count;for(let j=V,he=V+X;j<he;j+=3)U(e.getX(j+0)),U(e.getX(j+1)),U(e.getX(j+2))}this._transformed=!0}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let r=this.getAttribute("normal");if(r===void 0||r.count!==t.count)r=new _r(new Float32Array(t.count*3),3),this.setAttribute("normal",r);else for(let p=0,y=r.count;p<y;p++)r.setXYZ(p,0,0,0);const a=new ie,l=new ie,c=new ie,h=new ie,d=new ie,f=new ie,v=new ie,g=new ie;if(e)for(let p=0,y=e.count;p<y;p+=3){const E=e.getX(p+0),b=e.getX(p+1),M=e.getX(p+2);a.fromBufferAttribute(t,E),l.fromBufferAttribute(t,b),c.fromBufferAttribute(t,M),v.subVectors(c,l),g.subVectors(a,l),v.cross(g),h.fromBufferAttribute(r,E),d.fromBufferAttribute(r,b),f.fromBufferAttribute(r,M),h.add(v),d.add(v),f.add(v),r.setXYZ(E,h.x,h.y,h.z),r.setXYZ(b,d.x,d.y,d.z),r.setXYZ(M,f.x,f.y,f.z)}else for(let p=0,y=t.count;p<y;p+=3)a.fromBufferAttribute(t,p+0),l.fromBufferAttribute(t,p+1),c.fromBufferAttribute(t,p+2),v.subVectors(c,l),g.subVectors(a,l),v.cross(g),r.setXYZ(p+0,v.x,v.y,v.z),r.setXYZ(p+1,v.x,v.y,v.z),r.setXYZ(p+2,v.x,v.y,v.z);this.normalizeNormals(),r.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,r=e.count;t<r;t++)Cn.fromBufferAttribute(e,t),Cn.normalize(),e.setXYZ(t,Cn.x,Cn.y,Cn.z)}toNonIndexed(){function e(h,d){const f=h.array,v=h.itemSize,g=h.normalized,p=new f.constructor(d.length*v);let y=0,E=0;for(let b=0,M=d.length;b<M;b++){h.isInterleavedBufferAttribute?y=d[b]*h.data.stride+h.offset:y=d[b]*v;for(let S=0;S<v;S++)p[E++]=f[y++]}return new _r(p,v,g)}if(this.index===null)return ot("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Mi,r=this.index.array,a=this.attributes;for(const h in a){const d=a[h],f=e(d,r);t.setAttribute(h,f)}const l=this.morphAttributes;for(const h in l){const d=[],f=l[h];for(let v=0,g=f.length;v<g;v++){const p=f[v],y=e(p,r);d.push(y)}t.morphAttributes[h]=d}t.morphTargetsRelative=this.morphTargetsRelative;const c=this.groups;for(let h=0,d=c.length;h<d;h++){const f=c[h];t.addGroup(f.start,f.count,f.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const d=this.parameters;for(const f in d)d[f]!==void 0&&(e[f]=d[f]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const r=this.attributes;for(const d in r){const f=r[d];e.data.attributes[d]=f.toJSON(e.data)}const a={};let l=!1;for(const d in this.morphAttributes){const f=this.morphAttributes[d],v=[];for(let g=0,p=f.length;g<p;g++){const y=f[g];v.push(y.toJSON(e.data))}v.length>0&&(a[d]=v,l=!0)}l&&(e.data.morphAttributes=a,e.data.morphTargetsRelative=this.morphTargetsRelative);const c=this.groups;c.length>0&&(e.data.groups=JSON.parse(JSON.stringify(c)));const h=this.boundingSphere;return h!==null&&(e.data.boundingSphere=h.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const r=e.index;r!==null&&this.setIndex(r.clone());const a=e.attributes;for(const f in a){const v=a[f];this.setAttribute(f,v.clone(t))}const l=e.morphAttributes;for(const f in l){const v=[],g=l[f];for(let p=0,y=g.length;p<y;p++)v.push(g[p].clone(t));this.morphAttributes[f]=v}this.morphTargetsRelative=e.morphTargetsRelative;const c=e.groups;for(let f=0,v=c.length;f<v;f++){const g=c[f];this.addGroup(g.start,g.count,g.materialIndex)}const h=e.boundingBox;h!==null&&(this.boundingBox=h.clone());const d=e.boundingSphere;return d!==null&&(this.boundingSphere=d.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}let Bb=0;class Sr extends Hs{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Bb++}),this.uuid=rc(),this.name="",this.type="Material",this.blending=_o,this.side=Bs,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Sp,this.blendDst=Mp,this.blendEquation=da,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new _t(0,0,0),this.blendAlpha=0,this.depthFunc=Uo,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=$x,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ja,this.stencilZFail=Ja,this.stencilZPass=Ja,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const r=e[t];if(r===void 0){ot(`Material: parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){ot(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}a&&a.isColor?a.set(r):a&&a.isVector2&&r&&r.isVector2||a&&a.isEuler&&r&&r.isEuler||a&&a.isVector3&&r&&r.isVector3?a.copy(r):this[t]=r}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const r={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.color&&this.color.isColor&&(r.color=this.color.getHex()),this.roughness!==void 0&&(r.roughness=this.roughness),this.metalness!==void 0&&(r.metalness=this.metalness),this.sheen!==void 0&&(r.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(r.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(r.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(r.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(r.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(r.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(r.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(r.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(r.shininess=this.shininess),this.clearcoat!==void 0&&(r.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(r.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(r.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(r.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(r.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,r.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(r.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(r.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(r.dispersion=this.dispersion),this.iridescence!==void 0&&(r.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(r.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(r.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(r.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(r.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(r.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(r.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(r.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(r.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(r.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(r.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(r.lightMap=this.lightMap.toJSON(e).uuid,r.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(r.aoMap=this.aoMap.toJSON(e).uuid,r.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(r.bumpMap=this.bumpMap.toJSON(e).uuid,r.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(r.normalMap=this.normalMap.toJSON(e).uuid,r.normalMapType=this.normalMapType,r.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(r.displacementMap=this.displacementMap.toJSON(e).uuid,r.displacementScale=this.displacementScale,r.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(r.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(r.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(r.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(r.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(r.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(r.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(r.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(r.combine=this.combine)),this.envMapRotation!==void 0&&(r.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(r.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(r.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(r.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(r.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(r.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(r.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(r.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(r.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(r.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(r.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(r.size=this.size),this.shadowSide!==null&&(r.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(r.sizeAttenuation=this.sizeAttenuation),this.blending!==_o&&(r.blending=this.blending),this.side!==Bs&&(r.side=this.side),this.vertexColors===!0&&(r.vertexColors=!0),this.opacity<1&&(r.opacity=this.opacity),this.transparent===!0&&(r.transparent=!0),this.blendSrc!==Sp&&(r.blendSrc=this.blendSrc),this.blendDst!==Mp&&(r.blendDst=this.blendDst),this.blendEquation!==da&&(r.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(r.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(r.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(r.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(r.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(r.blendAlpha=this.blendAlpha),this.depthFunc!==Uo&&(r.depthFunc=this.depthFunc),this.depthTest===!1&&(r.depthTest=this.depthTest),this.depthWrite===!1&&(r.depthWrite=this.depthWrite),this.colorWrite===!1&&(r.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(r.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==$x&&(r.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(r.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(r.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Ja&&(r.stencilFail=this.stencilFail),this.stencilZFail!==Ja&&(r.stencilZFail=this.stencilZFail),this.stencilZPass!==Ja&&(r.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(r.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(r.rotation=this.rotation),this.polygonOffset===!0&&(r.polygonOffset=!0),this.polygonOffsetFactor!==0&&(r.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(r.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(r.linewidth=this.linewidth),this.dashSize!==void 0&&(r.dashSize=this.dashSize),this.gapSize!==void 0&&(r.gapSize=this.gapSize),this.scale!==void 0&&(r.scale=this.scale),this.dithering===!0&&(r.dithering=!0),this.alphaTest>0&&(r.alphaTest=this.alphaTest),this.alphaHash===!0&&(r.alphaHash=!0),this.alphaToCoverage===!0&&(r.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(r.premultipliedAlpha=!0),this.forceSinglePass===!0&&(r.forceSinglePass=!0),this.allowOverride===!1&&(r.allowOverride=!1),this.wireframe===!0&&(r.wireframe=!0),this.wireframeLinewidth>1&&(r.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(r.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(r.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(r.flatShading=!0),this.visible===!1&&(r.visible=!1),this.toneMapped===!1&&(r.toneMapped=!1),this.fog===!1&&(r.fog=!1),Object.keys(this.userData).length>0&&(r.userData=this.userData);function a(l){const c=[];for(const h in l){const d=l[h];delete d.metadata,c.push(d)}return c}if(t){const l=a(e.textures),c=a(e.images);l.length>0&&(r.textures=l),c.length>0&&(r.images=c)}return r}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new _t().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let r=e.normalScale;Array.isArray(r)===!1&&(r=[r,r]),this.normalScale=new ut().fromArray(r)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new ut().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let r=null;if(t!==null){const a=t.length;r=new Array(a);for(let l=0;l!==a;++l)r[l]=t[l].clone()}return this.clippingPlanes=r,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}const Fr=new ie,kf=new ie,wu=new ie,Es=new ie,Of=new ie,bu=new ie,zf=new ie;class Eh{constructor(e=new ie,t=new ie(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Fr)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const r=t.dot(this.direction);return r<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,r)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Fr.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Fr.copy(this.origin).addScaledVector(this.direction,t),Fr.distanceToSquared(e))}distanceSqToSegment(e,t,r,a){kf.copy(e).add(t).multiplyScalar(.5),wu.copy(t).sub(e).normalize(),Es.copy(this.origin).sub(kf);const l=e.distanceTo(t)*.5,c=-this.direction.dot(wu),h=Es.dot(this.direction),d=-Es.dot(wu),f=Es.lengthSq(),v=Math.abs(1-c*c);let g,p,y,E;if(v>0)if(g=c*d-h,p=c*h-d,E=l*v,g>=0)if(p>=-E)if(p<=E){const b=1/v;g*=b,p*=b,y=g*(g+c*p+2*h)+p*(c*g+p+2*d)+f}else p=l,g=Math.max(0,-(c*p+h)),y=-g*g+p*(p+2*d)+f;else p=-l,g=Math.max(0,-(c*p+h)),y=-g*g+p*(p+2*d)+f;else p<=-E?(g=Math.max(0,-(-c*l+h)),p=g>0?-l:Math.min(Math.max(-l,-d),l),y=-g*g+p*(p+2*d)+f):p<=E?(g=0,p=Math.min(Math.max(-l,-d),l),y=p*(p+2*d)+f):(g=Math.max(0,-(c*l+h)),p=g>0?l:Math.min(Math.max(-l,-d),l),y=-g*g+p*(p+2*d)+f);else p=c>0?-l:l,g=Math.max(0,-(c*p+h)),y=-g*g+p*(p+2*d)+f;return r&&r.copy(this.origin).addScaledVector(this.direction,g),a&&a.copy(kf).addScaledVector(wu,p),y}intersectSphere(e,t){Fr.subVectors(e.center,this.origin);const r=Fr.dot(this.direction),a=Fr.dot(Fr)-r*r,l=e.radius*e.radius;if(a>l)return null;const c=Math.sqrt(l-a),h=r-c,d=r+c;return d<0?null:h<0?this.at(d,t):this.at(h,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const r=-(this.origin.dot(e.normal)+e.constant)/t;return r>=0?r:null}intersectPlane(e,t){const r=this.distanceToPlane(e);return r===null?null:this.at(r,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let r,a,l,c,h,d;const f=1/this.direction.x,v=1/this.direction.y,g=1/this.direction.z,p=this.origin;return f>=0?(r=(e.min.x-p.x)*f,a=(e.max.x-p.x)*f):(r=(e.max.x-p.x)*f,a=(e.min.x-p.x)*f),v>=0?(l=(e.min.y-p.y)*v,c=(e.max.y-p.y)*v):(l=(e.max.y-p.y)*v,c=(e.min.y-p.y)*v),r>c||l>a||((l>r||isNaN(r))&&(r=l),(c<a||isNaN(a))&&(a=c),g>=0?(h=(e.min.z-p.z)*g,d=(e.max.z-p.z)*g):(h=(e.max.z-p.z)*g,d=(e.min.z-p.z)*g),r>d||h>a)||((h>r||r!==r)&&(r=h),(d<a||a!==a)&&(a=d),a<0)?null:this.at(r>=0?r:a,t)}intersectsBox(e){return this.intersectBox(e,Fr)!==null}intersectTriangle(e,t,r,a,l){Of.subVectors(t,e),bu.subVectors(r,e),zf.crossVectors(Of,bu);let c=this.direction.dot(zf),h;if(c>0){if(a)return null;h=1}else if(c<0)h=-1,c=-c;else return null;Es.subVectors(this.origin,e);const d=h*this.direction.dot(bu.crossVectors(Es,bu));if(d<0)return null;const f=h*this.direction.dot(Of.cross(Es));if(f<0||d+f>c)return null;const v=-h*Es.dot(zf);return v<0?null:this.at(v/c,l)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Ay extends Sr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new _t(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Zr,this.combine=Am,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const cv=new rn,ca=new Eh,Tu=new sc,uv=new ie,Cu=new ie,Ru=new ie,Au=new ie,Bf=new ie,Pu=new ie,hv=new ie,Nu=new ie;class Qi extends An{constructor(e=new Mi,t=new Ay){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const h=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[h]=l}}}}getVertexPosition(e,t){const r=this.geometry,a=r.attributes.position,l=r.morphAttributes.position,c=r.morphTargetsRelative;t.fromBufferAttribute(a,e);const h=this.morphTargetInfluences;if(l&&h){Pu.set(0,0,0);for(let d=0,f=l.length;d<f;d++){const v=h[d],g=l[d];v!==0&&(Bf.fromBufferAttribute(g,e),c?Pu.addScaledVector(Bf,v):Pu.addScaledVector(Bf.sub(t),v))}t.add(Pu)}return t}raycast(e,t){const r=this.geometry,a=this.material,l=this.matrixWorld;a!==void 0&&(r.boundingSphere===null&&r.computeBoundingSphere(),Tu.copy(r.boundingSphere),Tu.applyMatrix4(l),ca.copy(e.ray).recast(e.near),!(Tu.containsPoint(ca.origin)===!1&&(ca.intersectSphere(Tu,uv)===null||ca.origin.distanceToSquared(uv)>(e.far-e.near)**2))&&(cv.copy(l).invert(),ca.copy(e.ray).applyMatrix4(cv),!(r.boundingBox!==null&&ca.intersectsBox(r.boundingBox)===!1)&&this._computeIntersections(e,t,ca)))}_computeIntersections(e,t,r){let a;const l=this.geometry,c=this.material,h=l.index,d=l.attributes.position,f=l.attributes.uv,v=l.attributes.uv1,g=l.attributes.normal,p=l.groups,y=l.drawRange;if(h!==null)if(Array.isArray(c))for(let E=0,b=p.length;E<b;E++){const M=p[E],S=c[M.materialIndex],A=Math.max(M.start,y.start),D=Math.min(h.count,Math.min(M.start+M.count,y.start+y.count));for(let C=A,I=D;C<I;C+=3){const L=h.getX(C),U=h.getX(C+1),w=h.getX(C+2);a=Lu(this,S,e,r,f,v,g,L,U,w),a&&(a.faceIndex=Math.floor(C/3),a.face.materialIndex=M.materialIndex,t.push(a))}}else{const E=Math.max(0,y.start),b=Math.min(h.count,y.start+y.count);for(let M=E,S=b;M<S;M+=3){const A=h.getX(M),D=h.getX(M+1),C=h.getX(M+2);a=Lu(this,c,e,r,f,v,g,A,D,C),a&&(a.faceIndex=Math.floor(M/3),t.push(a))}}else if(d!==void 0)if(Array.isArray(c))for(let E=0,b=p.length;E<b;E++){const M=p[E],S=c[M.materialIndex],A=Math.max(M.start,y.start),D=Math.min(d.count,Math.min(M.start+M.count,y.start+y.count));for(let C=A,I=D;C<I;C+=3){const L=C,U=C+1,w=C+2;a=Lu(this,S,e,r,f,v,g,L,U,w),a&&(a.faceIndex=Math.floor(C/3),a.face.materialIndex=M.materialIndex,t.push(a))}}else{const E=Math.max(0,y.start),b=Math.min(d.count,y.start+y.count);for(let M=E,S=b;M<S;M+=3){const A=M,D=M+1,C=M+2;a=Lu(this,c,e,r,f,v,g,A,D,C),a&&(a.faceIndex=Math.floor(M/3),t.push(a))}}}}function Vb(i,e,t,r,a,l,c,h){let d;if(e.side===di?d=r.intersectTriangle(c,l,a,!0,h):d=r.intersectTriangle(a,l,c,e.side===Bs,h),d===null)return null;Nu.copy(h),Nu.applyMatrix4(i.matrixWorld);const f=t.ray.origin.distanceTo(Nu);return f<t.near||f>t.far?null:{distance:f,point:Nu.clone(),object:i}}function Lu(i,e,t,r,a,l,c,h,d,f){i.getVertexPosition(h,Cu),i.getVertexPosition(d,Ru),i.getVertexPosition(f,Au);const v=Vb(i,e,t,r,Cu,Ru,Au,hv);if(v){const g=new ie;qi.getBarycoord(hv,Cu,Ru,Au,g),a&&(v.uv=qi.getInterpolatedAttribute(a,h,d,f,g,new ut)),l&&(v.uv1=qi.getInterpolatedAttribute(l,h,d,f,g,new ut)),c&&(v.normal=qi.getInterpolatedAttribute(c,h,d,f,g,new ie),v.normal.dot(r.direction)>0&&v.normal.multiplyScalar(-1));const p={a:h,b:d,c:f,normal:new ie,materialIndex:0};qi.getNormal(Cu,Ru,Au,p.normal),v.face=p,v.barycoord=g}return v}class Hb extends Wn{constructor(e=null,t=1,r=1,a,l,c,h,d,f=Un,v=Un,g,p){super(null,c,h,d,f,v,a,l,g,p),this.isDataTexture=!0,this.image={data:e,width:t,height:r},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Vf=new ie,Gb=new ie,jb=new pt;class Ts{constructor(e=new ie(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,r,a){return this.normal.set(e,t,r),this.constant=a,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,r){const a=Vf.subVectors(r,t).cross(Gb.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(a,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,r=!0){const a=e.delta(Vf),l=this.normal.dot(a);if(l===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const c=-(e.start.dot(this.normal)+this.constant)/l;return r===!0&&(c<0||c>1)?null:t.copy(e.start).addScaledVector(a,c)}intersectsLine(e){const t=this.distanceToPoint(e.start),r=this.distanceToPoint(e.end);return t<0&&r>0||r<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const r=t||jb.getNormalMatrix(e),a=this.coplanarPoint(Vf).applyMatrix4(e),l=this.normal.applyMatrix3(r).normalize();return this.constant=-a.dot(l),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const ua=new sc,Wb=new ut(.5,.5),Du=new ie;class zm{constructor(e=new Ts,t=new Ts,r=new Ts,a=new Ts,l=new Ts,c=new Ts){this.planes=[e,t,r,a,l,c]}set(e,t,r,a,l,c){const h=this.planes;return h[0].copy(e),h[1].copy(t),h[2].copy(r),h[3].copy(a),h[4].copy(l),h[5].copy(c),this}copy(e){const t=this.planes;for(let r=0;r<6;r++)t[r].copy(e.planes[r]);return this}setFromProjectionMatrix(e,t=mr,r=!1){const a=this.planes,l=e.elements,c=l[0],h=l[1],d=l[2],f=l[3],v=l[4],g=l[5],p=l[6],y=l[7],E=l[8],b=l[9],M=l[10],S=l[11],A=l[12],D=l[13],C=l[14],I=l[15];if(a[0].setComponents(f-c,y-v,S-E,I-A).normalize(),a[1].setComponents(f+c,y+v,S+E,I+A).normalize(),a[2].setComponents(f+h,y+g,S+b,I+D).normalize(),a[3].setComponents(f-h,y-g,S-b,I-D).normalize(),r)a[4].setComponents(d,p,M,C).normalize(),a[5].setComponents(f-d,y-p,S-M,I-C).normalize();else if(a[4].setComponents(f-d,y-p,S-M,I-C).normalize(),t===mr)a[5].setComponents(f+d,y+p,S+M,I+C).normalize();else if(t===ql)a[5].setComponents(d,p,M,C).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),ua.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),ua.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(ua)}intersectsSprite(e){ua.center.set(0,0,0);const t=Wb.distanceTo(e.center);return ua.radius=.7071067811865476+t,ua.applyMatrix4(e.matrixWorld),this.intersectsSphere(ua)}intersectsSphere(e){const t=this.planes,r=e.center,a=-e.radius;for(let l=0;l<6;l++)if(t[l].distanceToPoint(r)<a)return!1;return!0}intersectsBox(e){const t=this.planes;for(let r=0;r<6;r++){const a=t[r];if(Du.x=a.normal.x>0?e.max.x:e.min.x,Du.y=a.normal.y>0?e.max.y:e.min.y,Du.z=a.normal.z>0?e.max.z:e.min.z,a.distanceToPoint(Du)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let r=0;r<6;r++)if(t[r].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Ju extends Sr{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new _t(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const dh=new ie,fh=new ie,dv=new rn,Dl=new Eh,Iu=new sc,Hf=new ie,fv=new ie;class Xb extends An{constructor(e=new Mi,t=new Ju){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,r=[0];for(let a=1,l=t.count;a<l;a++)dh.fromBufferAttribute(t,a-1),fh.fromBufferAttribute(t,a),r[a]=r[a-1],r[a]+=dh.distanceTo(fh);e.setAttribute("lineDistance",new In(r,1))}else ot("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const r=this.geometry,a=this.matrixWorld,l=e.params.Line.threshold,c=r.drawRange;if(r.boundingSphere===null&&r.computeBoundingSphere(),Iu.copy(r.boundingSphere),Iu.applyMatrix4(a),Iu.radius+=l,e.ray.intersectsSphere(Iu)===!1)return;dv.copy(a).invert(),Dl.copy(e.ray).applyMatrix4(dv);const h=l/((this.scale.x+this.scale.y+this.scale.z)/3),d=h*h,f=this.isLineSegments?2:1,v=r.index,p=r.attributes.position;if(v!==null){const y=Math.max(0,c.start),E=Math.min(v.count,c.start+c.count);for(let b=y,M=E-1;b<M;b+=f){const S=v.getX(b),A=v.getX(b+1),D=Uu(this,e,Dl,d,S,A,b);D&&t.push(D)}if(this.isLineLoop){const b=v.getX(E-1),M=v.getX(y),S=Uu(this,e,Dl,d,b,M,E-1);S&&t.push(S)}}else{const y=Math.max(0,c.start),E=Math.min(p.count,c.start+c.count);for(let b=y,M=E-1;b<M;b+=f){const S=Uu(this,e,Dl,d,b,b+1,b);S&&t.push(S)}if(this.isLineLoop){const b=Uu(this,e,Dl,d,E-1,y,E-1);b&&t.push(b)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const h=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[h]=l}}}}}function Uu(i,e,t,r,a,l,c){const h=i.geometry.attributes.position;if(dh.fromBufferAttribute(h,a),fh.fromBufferAttribute(h,l),t.distanceSqToSegment(dh,fh,Hf,fv)>r)return;Hf.applyMatrix4(i.matrixWorld);const f=e.ray.origin.distanceTo(Hf);if(!(f<e.near||f>e.far))return{distance:f,point:fv.clone().applyMatrix4(i.matrixWorld),index:c,face:null,faceIndex:null,barycoord:null,object:i}}const pv=new ie,mv=new ie;class gv extends Xb{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,r=[];for(let a=0,l=t.count;a<l;a+=2)pv.fromBufferAttribute(t,a),mv.fromBufferAttribute(t,a+1),r[a]=a===0?0:r[a-1],r[a+1]=r[a]+pv.distanceTo(mv);e.setAttribute("lineDistance",new In(r,1))}else ot("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class zl extends Sr{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new _t(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const xv=new rn,cm=new Eh,Fu=new sc,ku=new ie;class Gf extends An{constructor(e=new Mi,t=new zl){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const r=this.geometry,a=this.matrixWorld,l=e.params.Points.threshold,c=r.drawRange;if(r.boundingSphere===null&&r.computeBoundingSphere(),Fu.copy(r.boundingSphere),Fu.applyMatrix4(a),Fu.radius+=l,e.ray.intersectsSphere(Fu)===!1)return;xv.copy(a).invert(),cm.copy(e.ray).applyMatrix4(xv);const h=l/((this.scale.x+this.scale.y+this.scale.z)/3),d=h*h,f=r.index,g=r.attributes.position;if(f!==null){const p=Math.max(0,c.start),y=Math.min(f.count,c.start+c.count);for(let E=p,b=y;E<b;E++){const M=f.getX(E);ku.fromBufferAttribute(g,M),vv(ku,M,d,a,e,t,this)}}else{const p=Math.max(0,c.start),y=Math.min(g.count,c.start+c.count);for(let E=p,b=y;E<b;E++)ku.fromBufferAttribute(g,E),vv(ku,E,d,a,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const h=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[h]=l}}}}}function vv(i,e,t,r,a,l,c){const h=cm.distanceSqToPoint(i);if(h<t){const d=new ie;cm.closestPointToPoint(i,d),d.applyMatrix4(r);const f=a.ray.origin.distanceTo(d);if(f<a.near||f>a.far)return;l.push({distance:f,distanceToRay:Math.sqrt(h),point:d,index:e,face:null,faceIndex:null,barycoord:null,object:c})}}class Py extends Wn{constructor(e=[],t=Ca,r,a,l,c,h,d,f,v){super(e,t,r,a,l,c,h,d,f,v),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class ko extends Wn{constructor(e,t,r=yr,a,l,c,h=Un,d=Un,f,v=Qr,g=1){if(v!==Qr&&v!==ga)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const p={width:e,height:t,depth:g};super(p,a,l,c,h,d,v,r,f),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Om(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class $b extends ko{constructor(e,t=yr,r=Ca,a,l,c=Un,h=Un,d,f=Qr){const v={width:e,height:e,depth:1},g=[v,v,v,v,v,v];super(e,e,t,r,a,l,c,h,d,f),this.image=g,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class Ny extends Wn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class ac extends Mi{constructor(e=1,t=1,r=1,a=1,l=1,c=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:r,widthSegments:a,heightSegments:l,depthSegments:c};const h=this;a=Math.floor(a),l=Math.floor(l),c=Math.floor(c);const d=[],f=[],v=[],g=[];let p=0,y=0;E("z","y","x",-1,-1,r,t,e,c,l,0),E("z","y","x",1,-1,r,t,-e,c,l,1),E("x","z","y",1,1,e,r,t,a,c,2),E("x","z","y",1,-1,e,r,-t,a,c,3),E("x","y","z",1,-1,e,t,r,a,l,4),E("x","y","z",-1,-1,e,t,-r,a,l,5),this.setIndex(d),this.setAttribute("position",new In(f,3)),this.setAttribute("normal",new In(v,3)),this.setAttribute("uv",new In(g,2));function E(b,M,S,A,D,C,I,L,U,w,N){const H=C/U,V=I/w,X=C/2,j=I/2,he=L/2,$=U+1,oe=w+1;let Q=0,q=0;const Y=new ie;for(let Z=0;Z<oe;Z++){const O=Z*V-j;for(let ne=0;ne<$;ne++){const Re=ne*H-X;Y[b]=Re*A,Y[M]=O*D,Y[S]=he,f.push(Y.x,Y.y,Y.z),Y[b]=0,Y[M]=0,Y[S]=L>0?1:-1,v.push(Y.x,Y.y,Y.z),g.push(ne/U),g.push(1-Z/w),Q+=1}}for(let Z=0;Z<w;Z++)for(let O=0;O<U;O++){const ne=p+O+$*Z,Re=p+O+$*(Z+1),xe=p+(O+1)+$*(Z+1),Ne=p+(O+1)+$*Z;d.push(ne,Re,Ne),d.push(Re,xe,Ne),q+=6}h.addGroup(y,q,N),y+=q,p+=Q}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ac(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class wh extends Mi{constructor(e=1,t=1,r=1,a=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:r,heightSegments:a};const l=e/2,c=t/2,h=Math.floor(r),d=Math.floor(a),f=h+1,v=d+1,g=e/h,p=t/d,y=[],E=[],b=[],M=[];for(let S=0;S<v;S++){const A=S*p-c;for(let D=0;D<f;D++){const C=D*g-l;E.push(C,-A,0),b.push(0,0,1),M.push(D/h),M.push(1-S/d)}}for(let S=0;S<d;S++)for(let A=0;A<h;A++){const D=A+f*S,C=A+f*(S+1),I=A+1+f*(S+1),L=A+1+f*S;y.push(D,C,L),y.push(C,I,L)}this.setIndex(y),this.setAttribute("position",new In(E,3)),this.setAttribute("normal",new In(b,3)),this.setAttribute("uv",new In(M,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new wh(e.width,e.height,e.widthSegments,e.heightSegments)}}function Oo(i){const e={};for(const t in i){e[t]={};for(const r in i[t]){const a=i[t][r];if(_v(a))a.isRenderTargetTexture?(ot("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][r]=null):e[t][r]=a.clone();else if(Array.isArray(a))if(_v(a[0])){const l=[];for(let c=0,h=a.length;c<h;c++)l[c]=a[c].clone();e[t][r]=l}else e[t][r]=a.slice();else e[t][r]=a}}return e}function Yn(i){const e={};for(let t=0;t<i.length;t++){const r=Oo(i[t]);for(const a in r)e[a]=r[a]}return e}function _v(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function qb(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function Ly(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:Tt.workingColorSpace}const Kb={clone:Oo,merge:Yn};var Yb=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Qb=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Mr extends Sr{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Yb,this.fragmentShader=Qb,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Oo(e.uniforms),this.uniformsGroups=qb(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const a in this.uniforms){const c=this.uniforms[a].value;c&&c.isTexture?t.uniforms[a]={type:"t",value:c.toJSON(e).uuid}:c&&c.isColor?t.uniforms[a]={type:"c",value:c.getHex()}:c&&c.isVector2?t.uniforms[a]={type:"v2",value:c.toArray()}:c&&c.isVector3?t.uniforms[a]={type:"v3",value:c.toArray()}:c&&c.isVector4?t.uniforms[a]={type:"v4",value:c.toArray()}:c&&c.isMatrix3?t.uniforms[a]={type:"m3",value:c.toArray()}:c&&c.isMatrix4?t.uniforms[a]={type:"m4",value:c.toArray()}:t.uniforms[a]={value:c}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const r={};for(const a in this.extensions)this.extensions[a]===!0&&(r[a]=!0);return Object.keys(r).length>0&&(t.extensions=r),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(const r in e.uniforms){const a=e.uniforms[r];switch(this.uniforms[r]={},a.type){case"t":this.uniforms[r].value=t[a.value]||null;break;case"c":this.uniforms[r].value=new _t().setHex(a.value);break;case"v2":this.uniforms[r].value=new ut().fromArray(a.value);break;case"v3":this.uniforms[r].value=new ie().fromArray(a.value);break;case"v4":this.uniforms[r].value=new cn().fromArray(a.value);break;case"m3":this.uniforms[r].value=new pt().fromArray(a.value);break;case"m4":this.uniforms[r].value=new rn().fromArray(a.value);break;default:this.uniforms[r].value=a.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(const r in e.extensions)this.extensions[r]=e.extensions[r];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}}class Zb extends Mr{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class jf extends Sr{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new _t(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new _t(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ch,this.normalScale=new ut(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Zr,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Jb extends Sr{constructor(e){super(),this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new _t(16777215),this.specular=new _t(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new _t(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ch,this.normalScale=new ut(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Zr,this.combine=Am,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.specular.copy(e.specular),this.shininess=e.shininess,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class eT extends Sr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=cb,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class tT extends Sr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const Vl={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(yv(i)||(this.files[i]=e))},get:function(i){if(this.enabled!==!1&&!yv(i))return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};function yv(i){try{const e=i.slice(i.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}class nT{constructor(e,t,r){const a=this;let l=!1,c=0,h=0,d;const f=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=r,this._abortController=null,this.itemStart=function(v){h++,l===!1&&a.onStart!==void 0&&a.onStart(v,c,h),l=!0},this.itemEnd=function(v){c++,a.onProgress!==void 0&&a.onProgress(v,c,h),c===h&&(l=!1,a.onLoad!==void 0&&a.onLoad())},this.itemError=function(v){a.onError!==void 0&&a.onError(v)},this.resolveURL=function(v){return v=v.normalize("NFC"),d?d(v):v},this.setURLModifier=function(v){return d=v,this},this.addHandler=function(v,g){return f.push(v,g),this},this.removeHandler=function(v){const g=f.indexOf(v);return g!==-1&&f.splice(g,2),this},this.getHandler=function(v){for(let g=0,p=f.length;g<p;g+=2){const y=f[g],E=f[g+1];if(y.global&&(y.lastIndex=0),y.test(v))return E}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const iT=new nT;class oc{constructor(e){this.manager=e!==void 0?e:iT,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){const r=this;return new Promise(function(a,l){r.load(e,a,t,l)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}oc.DEFAULT_MATERIAL_NAME="__DEFAULT";const kr={};class rT extends Error{constructor(e,t){super(e),this.response=t}}class sT extends oc{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,r,a){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const l=Vl.get(`file:${e}`);if(l!==void 0){this.manager.itemStart(e),setTimeout(()=>{t&&t(l),this.manager.itemEnd(e)},0);return}if(kr[e]!==void 0){kr[e].push({onLoad:t,onProgress:r,onError:a});return}kr[e]=[],kr[e].push({onLoad:t,onProgress:r,onError:a});const c=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),h=this.mimeType,d=this.responseType;fetch(c).then(f=>{if(f.status===200||f.status===0){if(f.status===0&&ot("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||f.body===void 0||f.body.getReader===void 0)return f;const v=kr[e],g=f.body.getReader(),p=f.headers.get("X-File-Size")||f.headers.get("Content-Length"),y=p?parseInt(p):0,E=y!==0;let b=0;const M=new ReadableStream({start(S){A();function A(){g.read().then(({done:D,value:C})=>{if(D)S.close();else{b+=C.byteLength;const I=new ProgressEvent("progress",{lengthComputable:E,loaded:b,total:y});for(let L=0,U=v.length;L<U;L++){const w=v[L];w.onProgress&&w.onProgress(I)}S.enqueue(C),A()}},D=>{S.error(D)})}}});return new Response(M)}else throw new rT(`fetch for "${f.url}" responded with ${f.status}: ${f.statusText}`,f)}).then(f=>{switch(d){case"arraybuffer":return f.arrayBuffer();case"blob":return f.blob();case"document":return f.text().then(v=>new DOMParser().parseFromString(v,h));case"json":return f.json();default:if(h==="")return f.text();{const g=/charset="?([^;"\s]*)"?/i.exec(h),p=g&&g[1]?g[1].toLowerCase():void 0,y=new TextDecoder(p);return f.arrayBuffer().then(E=>y.decode(E))}}}).then(f=>{Vl.add(`file:${e}`,f);const v=kr[e];delete kr[e];for(let g=0,p=v.length;g<p;g++){const y=v[g];y.onLoad&&y.onLoad(f)}}).catch(f=>{const v=kr[e];if(v===void 0)throw this.manager.itemError(e),f;delete kr[e];for(let g=0,p=v.length;g<p;g++){const y=v[g];y.onError&&y.onError(f)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const uo=new WeakMap;class aT extends oc{constructor(e){super(e)}load(e,t,r,a){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const l=this,c=Vl.get(`image:${e}`);if(c!==void 0){if(c.complete===!0)l.manager.itemStart(e),setTimeout(function(){t&&t(c),l.manager.itemEnd(e)},0);else{let g=uo.get(c);g===void 0&&(g=[],uo.set(c,g)),g.push({onLoad:t,onError:a})}return c}const h=Kl("img");function d(){v(),t&&t(this);const g=uo.get(this)||[];for(let p=0;p<g.length;p++){const y=g[p];y.onLoad&&y.onLoad(this)}uo.delete(this),l.manager.itemEnd(e)}function f(g){v(),a&&a(g),Vl.remove(`image:${e}`);const p=uo.get(this)||[];for(let y=0;y<p.length;y++){const E=p[y];E.onError&&E.onError(g)}uo.delete(this),l.manager.itemError(e),l.manager.itemEnd(e)}function v(){h.removeEventListener("load",d,!1),h.removeEventListener("error",f,!1)}return h.addEventListener("load",d,!1),h.addEventListener("error",f,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(h.crossOrigin=this.crossOrigin),Vl.add(`image:${e}`,h),l.manager.itemStart(e),h.src=e,h}}class oT extends oc{constructor(e){super(e)}load(e,t,r,a){const l=new Wn,c=new aT(this.manager);return c.setCrossOrigin(this.crossOrigin),c.setPath(this.path),c.load(e,function(h){l.image=h,l.needsUpdate=!0,t!==void 0&&t(l)},r,a),l}}class Dy extends An{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new _t(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}const Wf=new rn,Sv=new ie,Mv=new ie;class lT{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ut(512,512),this.mapType=Si,this.map=null,this.mapPass=null,this.matrix=new rn,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new zm,this._frameExtents=new ut(1,1),this._viewportCount=1,this._viewports=[new cn(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,r=this.matrix;Sv.setFromMatrixPosition(e.matrixWorld),t.position.copy(Sv),Mv.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Mv),t.updateMatrixWorld(),Wf.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Wf,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===ql||t.reversedDepth?r.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):r.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),r.multiply(Wf)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Ou=new ie,zu=new Vs,sr=new ie;class Iy extends An{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new rn,this.projectionMatrix=new rn,this.projectionMatrixInverse=new rn,this.coordinateSystem=mr,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Ou,zu,sr),sr.x===1&&sr.y===1&&sr.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ou,zu,sr.set(1,1,1)).invert()}updateWorldMatrix(e,t,r=!1){super.updateWorldMatrix(e,t,r),this.matrixWorld.decompose(Ou,zu,sr),sr.x===1&&sr.y===1&&sr.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ou,zu,sr.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const ws=new ie,Ev=new ut,wv=new ut;class Ii extends Iy{constructor(e=50,t=1,r=.1,a=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=r,this.far=a,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=lm*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Zu*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return lm*2*Math.atan(Math.tan(Zu*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,r){ws.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(ws.x,ws.y).multiplyScalar(-e/ws.z),ws.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),r.set(ws.x,ws.y).multiplyScalar(-e/ws.z)}getViewSize(e,t){return this.getViewBounds(e,Ev,wv),t.subVectors(wv,Ev)}setViewOffset(e,t,r,a,l,c){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=r,this.view.offsetY=a,this.view.width=l,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Zu*.5*this.fov)/this.zoom,r=2*t,a=this.aspect*r,l=-.5*a;const c=this.view;if(this.view!==null&&this.view.enabled){const d=c.fullWidth,f=c.fullHeight;l+=c.offsetX*a/d,t-=c.offsetY*r/f,a*=c.width/d,r*=c.height/f}const h=this.filmOffset;h!==0&&(l+=e*h/this.getFilmWidth()),this.projectionMatrix.makePerspective(l,l+a,t,t-r,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class Bm extends Iy{constructor(e=-1,t=1,r=1,a=-1,l=.1,c=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=r,this.bottom=a,this.near=l,this.far=c,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,r,a,l,c){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=r,this.view.offsetY=a,this.view.width=l,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),r=(this.right+this.left)/2,a=(this.top+this.bottom)/2;let l=r-e,c=r+e,h=a+t,d=a-t;if(this.view!==null&&this.view.enabled){const f=(this.right-this.left)/this.view.fullWidth/this.zoom,v=(this.top-this.bottom)/this.view.fullHeight/this.zoom;l+=f*this.view.offsetX,c=l+f*this.view.width,h-=v*this.view.offsetY,d=h-v*this.view.height}this.projectionMatrix.makeOrthographic(l,c,h,d,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class cT extends lT{constructor(){super(new Bm(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class bv extends Dy{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(An.DEFAULT_UP),this.updateMatrix(),this.target=new An,this.shadow=new cT}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}class uT extends Dy{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}const ho=-90,fo=1;class hT extends An{constructor(e,t,r){super(),this.type="CubeCamera",this.renderTarget=r,this.coordinateSystem=null,this.activeMipmapLevel=0;const a=new Ii(ho,fo,e,t);a.layers=this.layers,this.add(a);const l=new Ii(ho,fo,e,t);l.layers=this.layers,this.add(l);const c=new Ii(ho,fo,e,t);c.layers=this.layers,this.add(c);const h=new Ii(ho,fo,e,t);h.layers=this.layers,this.add(h);const d=new Ii(ho,fo,e,t);d.layers=this.layers,this.add(d);const f=new Ii(ho,fo,e,t);f.layers=this.layers,this.add(f)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[r,a,l,c,h,d]=t;for(const f of t)this.remove(f);if(e===mr)r.up.set(0,1,0),r.lookAt(1,0,0),a.up.set(0,1,0),a.lookAt(-1,0,0),l.up.set(0,0,-1),l.lookAt(0,1,0),c.up.set(0,0,1),c.lookAt(0,-1,0),h.up.set(0,1,0),h.lookAt(0,0,1),d.up.set(0,1,0),d.lookAt(0,0,-1);else if(e===ql)r.up.set(0,-1,0),r.lookAt(-1,0,0),a.up.set(0,-1,0),a.lookAt(1,0,0),l.up.set(0,0,1),l.lookAt(0,1,0),c.up.set(0,0,-1),c.lookAt(0,-1,0),h.up.set(0,-1,0),h.lookAt(0,0,1),d.up.set(0,-1,0),d.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const f of t)this.add(f),f.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:r,activeMipmapLevel:a}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[l,c,h,d,f,v]=this.children,g=e.getRenderTarget(),p=e.getActiveCubeFace(),y=e.getActiveMipmapLevel(),E=e.xr.enabled;e.xr.enabled=!1;const b=r.texture.generateMipmaps;r.texture.generateMipmaps=!1;let M=!1;e.isWebGLRenderer===!0?M=e.state.buffers.depth.getReversed():M=e.reversedDepthBuffer,e.setRenderTarget(r,0,a),M&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(r,1,a),M&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(r,2,a),M&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(r,3,a),M&&e.autoClear===!1&&e.clearDepth(),e.render(t,d),e.setRenderTarget(r,4,a),M&&e.autoClear===!1&&e.clearDepth(),e.render(t,f),r.texture.generateMipmaps=b,e.setRenderTarget(r,5,a),M&&e.autoClear===!1&&e.clearDepth(),e.render(t,v),e.setRenderTarget(g,p,y),e.xr.enabled=E,r.texture.needsPMREMUpdate=!0}}class dT extends Ii{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class Tv{constructor(e=1,t=0,r=0){this.radius=e,this.phi=t,this.theta=r}set(e,t,r){return this.radius=e,this.phi=t,this.theta=r,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Et(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,r){return this.radius=Math.sqrt(e*e+t*t+r*r),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,r),this.phi=Math.acos(Et(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}const Xm=class Xm{constructor(e,t,r,a){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,r,a)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let r=0;r<4;r++)this.elements[r]=e[r+t];return this}set(e,t,r,a){const l=this.elements;return l[0]=e,l[2]=t,l[1]=r,l[3]=a,this}};Xm.prototype.isMatrix2=!0;let Cv=Xm;class fT extends Hs{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){if(e===void 0){ot("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}}function Rv(i,e,t,r){const a=pT(r);switch(t){case yy:return i*e;case My:return i*e/a.components*a.byteLength;case Dm:return i*e/a.components*a.byteLength;case Ra:return i*e*2/a.components*a.byteLength;case Im:return i*e*2/a.components*a.byteLength;case Sy:return i*e*3/a.components*a.byteLength;case Ki:return i*e*4/a.components*a.byteLength;case Um:return i*e*4/a.components*a.byteLength;case qu:case Ku:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Yu:case Qu:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Dp:case Up:return Math.max(i,16)*Math.max(e,8)/4;case Lp:case Ip:return Math.max(i,8)*Math.max(e,8)/2;case Fp:case kp:case zp:case Bp:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Op:case oh:case Vp:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Hp:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Gp:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case jp:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case Wp:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case Xp:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case $p:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case qp:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case Kp:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case Yp:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case Qp:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case Zp:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Jp:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case em:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case tm:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case nm:case im:case rm:return Math.ceil(i/4)*Math.ceil(e/4)*16;case sm:case am:return Math.ceil(i/4)*Math.ceil(e/4)*8;case lh:case om:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function pT(i){switch(i){case Si:case gy:return{byteLength:1,components:1};case Xl:case xy:case Yr:return{byteLength:2,components:1};case Nm:case Lm:return{byteLength:2,components:4};case yr:case Pm:case pr:return{byteLength:4,components:1};case vy:case _y:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Rm}}));typeof window<"u"&&(window.__THREE__?ot("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Rm);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Uy(){let i=null,e=!1,t=null,r=null;function a(l,c){t(l,c),r=i.requestAnimationFrame(a)}return{start:function(){e!==!0&&t!==null&&i!==null&&(r=i.requestAnimationFrame(a),e=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(r),e=!1},setAnimationLoop:function(l){t=l},setContext:function(l){i=l}}}function mT(i){const e=new WeakMap;function t(h,d){const f=h.array,v=h.usage,g=f.byteLength,p=i.createBuffer();i.bindBuffer(d,p),i.bufferData(d,f,v),h.onUploadCallback();let y;if(f instanceof Float32Array)y=i.FLOAT;else if(typeof Float16Array<"u"&&f instanceof Float16Array)y=i.HALF_FLOAT;else if(f instanceof Uint16Array)h.isFloat16BufferAttribute?y=i.HALF_FLOAT:y=i.UNSIGNED_SHORT;else if(f instanceof Int16Array)y=i.SHORT;else if(f instanceof Uint32Array)y=i.UNSIGNED_INT;else if(f instanceof Int32Array)y=i.INT;else if(f instanceof Int8Array)y=i.BYTE;else if(f instanceof Uint8Array)y=i.UNSIGNED_BYTE;else if(f instanceof Uint8ClampedArray)y=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+f);return{buffer:p,type:y,bytesPerElement:f.BYTES_PER_ELEMENT,version:h.version,size:g}}function r(h,d,f){const v=d.array,g=d.updateRanges;if(i.bindBuffer(f,h),g.length===0)i.bufferSubData(f,0,v);else{g.sort((y,E)=>y.start-E.start);let p=0;for(let y=1;y<g.length;y++){const E=g[p],b=g[y];b.start<=E.start+E.count+1?E.count=Math.max(E.count,b.start+b.count-E.start):(++p,g[p]=b)}g.length=p+1;for(let y=0,E=g.length;y<E;y++){const b=g[y];i.bufferSubData(f,b.start*v.BYTES_PER_ELEMENT,v,b.start,b.count)}d.clearUpdateRanges()}d.onUploadCallback()}function a(h){return h.isInterleavedBufferAttribute&&(h=h.data),e.get(h)}function l(h){h.isInterleavedBufferAttribute&&(h=h.data);const d=e.get(h);d&&(i.deleteBuffer(d.buffer),e.delete(h))}function c(h,d){if(h.isInterleavedBufferAttribute&&(h=h.data),h.isGLBufferAttribute){const v=e.get(h);(!v||v.version<h.version)&&e.set(h,{buffer:h.buffer,type:h.type,bytesPerElement:h.elementSize,version:h.version});return}const f=e.get(h);if(f===void 0)e.set(h,t(h,d));else if(f.version<h.version){if(f.size!==h.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");r(f.buffer,h,d),f.version=h.version}}return{get:a,remove:l,update:c}}var gT=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,xT=`#ifdef USE_ALPHAHASH
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
#endif`,vT=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,_T=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,yT=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,ST=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,MT=`#ifdef USE_AOMAP
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
#endif`,ET=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,wT=`#ifdef USE_BATCHING
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
#endif`,bT=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,TT=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,CT=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,RT=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,AT=`#ifdef USE_IRIDESCENCE
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
#endif`,PT=`#ifdef USE_BUMPMAP
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
#endif`,NT=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,LT=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,DT=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,IT=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,UT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,FT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,kT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,OT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,zT=`#define PI 3.141592653589793
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
} // validated`,BT=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,VT=`vec3 transformedNormal = objectNormal;
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
#endif`,HT=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,GT=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,jT=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,WT=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,XT="gl_FragColor = linearToOutputTexel( gl_FragColor );",$T=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,qT=`#ifdef USE_ENVMAP
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
#endif`,KT=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,YT=`#ifdef USE_ENVMAP
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
#endif`,QT=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,ZT=`#ifdef USE_ENVMAP
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
#endif`,JT=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,eC=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,tC=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,nC=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,iC=`#ifdef USE_GRADIENTMAP
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
}`,rC=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,sC=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,aC=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,oC=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,lC=`#ifdef USE_ENVMAP
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
#endif`,cC=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,uC=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,hC=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,dC=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,fC=`PhysicalMaterial material;
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
#endif`,pC=`uniform sampler2D dfgLUT;
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
}`,mC=`
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
#endif`,gC=`#if defined( RE_IndirectDiffuse )
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
#endif`,xC=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,vC=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,_C=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,yC=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,SC=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,MC=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,EC=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,wC=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,bC=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,TC=`#if defined( USE_POINTS_UV )
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
#endif`,CC=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,RC=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,AC=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,PC=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,NC=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,LC=`#ifdef USE_MORPHTARGETS
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
#endif`,DC=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,IC=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,UC=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,FC=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,kC=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,OC=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,zC=`#ifdef USE_NORMALMAP
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
#endif`,BC=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,VC=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,HC=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,GC=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,jC=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,WC=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,XC=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,$C=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,qC=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,KC=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,YC=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,QC=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,ZC=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,JC=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,eR=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,tR=`float getShadowMask() {
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
}`,nR=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,iR=`#ifdef USE_SKINNING
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
#endif`,rR=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,sR=`#ifdef USE_SKINNING
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
#endif`,aR=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,oR=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,lR=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,cR=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,uR=`#ifdef USE_TRANSMISSION
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
#endif`,hR=`#ifdef USE_TRANSMISSION
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
#endif`,dR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,fR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,pR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,mR=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const gR=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,xR=`uniform sampler2D t2D;
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
}`,vR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,_R=`#ifdef ENVMAP_TYPE_CUBE
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
}`,yR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,SR=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,MR=`#include <common>
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
}`,ER=`#if DEPTH_PACKING == 3200
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
}`,wR=`#define DISTANCE
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
}`,bR=`#define DISTANCE
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
}`,TR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,CR=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,RR=`uniform float scale;
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
}`,AR=`uniform vec3 diffuse;
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
}`,PR=`#include <common>
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
}`,NR=`uniform vec3 diffuse;
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
}`,LR=`#define LAMBERT
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
}`,DR=`#define LAMBERT
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
}`,IR=`#define MATCAP
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
}`,UR=`#define MATCAP
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
}`,FR=`#define NORMAL
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
}`,kR=`#define NORMAL
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
}`,OR=`#define PHONG
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
}`,zR=`#define PHONG
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
}`,BR=`#define STANDARD
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
}`,VR=`#define STANDARD
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
}`,HR=`#define TOON
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
}`,GR=`#define TOON
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
}`,jR=`uniform float size;
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
}`,WR=`uniform vec3 diffuse;
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
}`,XR=`#include <common>
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
}`,$R=`uniform vec3 color;
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
}`,qR=`uniform float rotation;
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
}`,KR=`uniform vec3 diffuse;
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
}`,vt={alphahash_fragment:gT,alphahash_pars_fragment:xT,alphamap_fragment:vT,alphamap_pars_fragment:_T,alphatest_fragment:yT,alphatest_pars_fragment:ST,aomap_fragment:MT,aomap_pars_fragment:ET,batching_pars_vertex:wT,batching_vertex:bT,begin_vertex:TT,beginnormal_vertex:CT,bsdfs:RT,iridescence_fragment:AT,bumpmap_pars_fragment:PT,clipping_planes_fragment:NT,clipping_planes_pars_fragment:LT,clipping_planes_pars_vertex:DT,clipping_planes_vertex:IT,color_fragment:UT,color_pars_fragment:FT,color_pars_vertex:kT,color_vertex:OT,common:zT,cube_uv_reflection_fragment:BT,defaultnormal_vertex:VT,displacementmap_pars_vertex:HT,displacementmap_vertex:GT,emissivemap_fragment:jT,emissivemap_pars_fragment:WT,colorspace_fragment:XT,colorspace_pars_fragment:$T,envmap_fragment:qT,envmap_common_pars_fragment:KT,envmap_pars_fragment:YT,envmap_pars_vertex:QT,envmap_physical_pars_fragment:lC,envmap_vertex:ZT,fog_vertex:JT,fog_pars_vertex:eC,fog_fragment:tC,fog_pars_fragment:nC,gradientmap_pars_fragment:iC,lightmap_pars_fragment:rC,lights_lambert_fragment:sC,lights_lambert_pars_fragment:aC,lights_pars_begin:oC,lights_toon_fragment:cC,lights_toon_pars_fragment:uC,lights_phong_fragment:hC,lights_phong_pars_fragment:dC,lights_physical_fragment:fC,lights_physical_pars_fragment:pC,lights_fragment_begin:mC,lights_fragment_maps:gC,lights_fragment_end:xC,lightprobes_pars_fragment:vC,logdepthbuf_fragment:_C,logdepthbuf_pars_fragment:yC,logdepthbuf_pars_vertex:SC,logdepthbuf_vertex:MC,map_fragment:EC,map_pars_fragment:wC,map_particle_fragment:bC,map_particle_pars_fragment:TC,metalnessmap_fragment:CC,metalnessmap_pars_fragment:RC,morphinstance_vertex:AC,morphcolor_vertex:PC,morphnormal_vertex:NC,morphtarget_pars_vertex:LC,morphtarget_vertex:DC,normal_fragment_begin:IC,normal_fragment_maps:UC,normal_pars_fragment:FC,normal_pars_vertex:kC,normal_vertex:OC,normalmap_pars_fragment:zC,clearcoat_normal_fragment_begin:BC,clearcoat_normal_fragment_maps:VC,clearcoat_pars_fragment:HC,iridescence_pars_fragment:GC,opaque_fragment:jC,packing:WC,premultiplied_alpha_fragment:XC,project_vertex:$C,dithering_fragment:qC,dithering_pars_fragment:KC,roughnessmap_fragment:YC,roughnessmap_pars_fragment:QC,shadowmap_pars_fragment:ZC,shadowmap_pars_vertex:JC,shadowmap_vertex:eR,shadowmask_pars_fragment:tR,skinbase_vertex:nR,skinning_pars_vertex:iR,skinning_vertex:rR,skinnormal_vertex:sR,specularmap_fragment:aR,specularmap_pars_fragment:oR,tonemapping_fragment:lR,tonemapping_pars_fragment:cR,transmission_fragment:uR,transmission_pars_fragment:hR,uv_pars_fragment:dR,uv_pars_vertex:fR,uv_vertex:pR,worldpos_vertex:mR,background_vert:gR,background_frag:xR,backgroundCube_vert:vR,backgroundCube_frag:_R,cube_vert:yR,cube_frag:SR,depth_vert:MR,depth_frag:ER,distance_vert:wR,distance_frag:bR,equirect_vert:TR,equirect_frag:CR,linedashed_vert:RR,linedashed_frag:AR,meshbasic_vert:PR,meshbasic_frag:NR,meshlambert_vert:LR,meshlambert_frag:DR,meshmatcap_vert:IR,meshmatcap_frag:UR,meshnormal_vert:FR,meshnormal_frag:kR,meshphong_vert:OR,meshphong_frag:zR,meshphysical_vert:BR,meshphysical_frag:VR,meshtoon_vert:HR,meshtoon_frag:GR,points_vert:jR,points_frag:WR,shadow_vert:XR,shadow_frag:$R,sprite_vert:qR,sprite_frag:KR},Be={common:{diffuse:{value:new _t(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new pt},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new pt}},envmap:{envMap:{value:null},envMapRotation:{value:new pt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new pt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new pt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new pt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new pt},normalScale:{value:new ut(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new pt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new pt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new pt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new pt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new _t(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new ie},probesMax:{value:new ie},probesResolution:{value:new ie}},points:{diffuse:{value:new _t(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0},uvTransform:{value:new pt}},sprite:{diffuse:{value:new _t(16777215)},opacity:{value:1},center:{value:new ut(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new pt},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0}}},hr={basic:{uniforms:Yn([Be.common,Be.specularmap,Be.envmap,Be.aomap,Be.lightmap,Be.fog]),vertexShader:vt.meshbasic_vert,fragmentShader:vt.meshbasic_frag},lambert:{uniforms:Yn([Be.common,Be.specularmap,Be.envmap,Be.aomap,Be.lightmap,Be.emissivemap,Be.bumpmap,Be.normalmap,Be.displacementmap,Be.fog,Be.lights,{emissive:{value:new _t(0)},envMapIntensity:{value:1}}]),vertexShader:vt.meshlambert_vert,fragmentShader:vt.meshlambert_frag},phong:{uniforms:Yn([Be.common,Be.specularmap,Be.envmap,Be.aomap,Be.lightmap,Be.emissivemap,Be.bumpmap,Be.normalmap,Be.displacementmap,Be.fog,Be.lights,{emissive:{value:new _t(0)},specular:{value:new _t(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:vt.meshphong_vert,fragmentShader:vt.meshphong_frag},standard:{uniforms:Yn([Be.common,Be.envmap,Be.aomap,Be.lightmap,Be.emissivemap,Be.bumpmap,Be.normalmap,Be.displacementmap,Be.roughnessmap,Be.metalnessmap,Be.fog,Be.lights,{emissive:{value:new _t(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:vt.meshphysical_vert,fragmentShader:vt.meshphysical_frag},toon:{uniforms:Yn([Be.common,Be.aomap,Be.lightmap,Be.emissivemap,Be.bumpmap,Be.normalmap,Be.displacementmap,Be.gradientmap,Be.fog,Be.lights,{emissive:{value:new _t(0)}}]),vertexShader:vt.meshtoon_vert,fragmentShader:vt.meshtoon_frag},matcap:{uniforms:Yn([Be.common,Be.bumpmap,Be.normalmap,Be.displacementmap,Be.fog,{matcap:{value:null}}]),vertexShader:vt.meshmatcap_vert,fragmentShader:vt.meshmatcap_frag},points:{uniforms:Yn([Be.points,Be.fog]),vertexShader:vt.points_vert,fragmentShader:vt.points_frag},dashed:{uniforms:Yn([Be.common,Be.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:vt.linedashed_vert,fragmentShader:vt.linedashed_frag},depth:{uniforms:Yn([Be.common,Be.displacementmap]),vertexShader:vt.depth_vert,fragmentShader:vt.depth_frag},normal:{uniforms:Yn([Be.common,Be.bumpmap,Be.normalmap,Be.displacementmap,{opacity:{value:1}}]),vertexShader:vt.meshnormal_vert,fragmentShader:vt.meshnormal_frag},sprite:{uniforms:Yn([Be.sprite,Be.fog]),vertexShader:vt.sprite_vert,fragmentShader:vt.sprite_frag},background:{uniforms:{uvTransform:{value:new pt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:vt.background_vert,fragmentShader:vt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new pt}},vertexShader:vt.backgroundCube_vert,fragmentShader:vt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:vt.cube_vert,fragmentShader:vt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:vt.equirect_vert,fragmentShader:vt.equirect_frag},distance:{uniforms:Yn([Be.common,Be.displacementmap,{referencePosition:{value:new ie},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:vt.distance_vert,fragmentShader:vt.distance_frag},shadow:{uniforms:Yn([Be.lights,Be.fog,{color:{value:new _t(0)},opacity:{value:1}}]),vertexShader:vt.shadow_vert,fragmentShader:vt.shadow_frag}};hr.physical={uniforms:Yn([hr.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new pt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new pt},clearcoatNormalScale:{value:new ut(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new pt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new pt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new pt},sheen:{value:0},sheenColor:{value:new _t(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new pt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new pt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new pt},transmissionSamplerSize:{value:new ut},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new pt},attenuationDistance:{value:0},attenuationColor:{value:new _t(0)},specularColor:{value:new _t(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new pt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new pt},anisotropyVector:{value:new ut},anisotropyMap:{value:null},anisotropyMapTransform:{value:new pt}}]),vertexShader:vt.meshphysical_vert,fragmentShader:vt.meshphysical_frag};const Bu={r:0,b:0,g:0},YR=new rn,Fy=new pt;Fy.set(-1,0,0,0,1,0,0,0,1);function QR(i,e,t,r,a,l){const c=new _t(0);let h=a===!0?0:1,d,f,v=null,g=0,p=null;function y(A){let D=A.isScene===!0?A.background:null;if(D&&D.isTexture){const C=A.backgroundBlurriness>0;D=e.get(D,C)}return D}function E(A){let D=!1;const C=y(A);C===null?M(c,h):C&&C.isColor&&(M(C,1),D=!0);const I=i.xr.getEnvironmentBlendMode();I==="additive"?t.buffers.color.setClear(0,0,0,1,l):I==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,l),(i.autoClear||D)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function b(A,D){const C=y(D);C&&(C.isCubeTexture||C.mapping===Mh)?(f===void 0&&(f=new Qi(new ac(1,1,1),new Mr({name:"BackgroundCubeMaterial",uniforms:Oo(hr.backgroundCube.uniforms),vertexShader:hr.backgroundCube.vertexShader,fragmentShader:hr.backgroundCube.fragmentShader,side:di,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),f.geometry.deleteAttribute("normal"),f.geometry.deleteAttribute("uv"),f.onBeforeRender=function(I,L,U){this.matrixWorld.copyPosition(U.matrixWorld)},Object.defineProperty(f.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(f)),f.material.uniforms.envMap.value=C,f.material.uniforms.backgroundBlurriness.value=D.backgroundBlurriness,f.material.uniforms.backgroundIntensity.value=D.backgroundIntensity,f.material.uniforms.backgroundRotation.value.setFromMatrix4(YR.makeRotationFromEuler(D.backgroundRotation)).transpose(),C.isCubeTexture&&C.isRenderTargetTexture===!1&&f.material.uniforms.backgroundRotation.value.premultiply(Fy),f.material.toneMapped=Tt.getTransfer(C.colorSpace)!==Gt,(v!==C||g!==C.version||p!==i.toneMapping)&&(f.material.needsUpdate=!0,v=C,g=C.version,p=i.toneMapping),f.layers.enableAll(),A.unshift(f,f.geometry,f.material,0,0,null)):C&&C.isTexture&&(d===void 0&&(d=new Qi(new wh(2,2),new Mr({name:"BackgroundMaterial",uniforms:Oo(hr.background.uniforms),vertexShader:hr.background.vertexShader,fragmentShader:hr.background.fragmentShader,side:Bs,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),d.geometry.deleteAttribute("normal"),Object.defineProperty(d.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(d)),d.material.uniforms.t2D.value=C,d.material.uniforms.backgroundIntensity.value=D.backgroundIntensity,d.material.toneMapped=Tt.getTransfer(C.colorSpace)!==Gt,C.matrixAutoUpdate===!0&&C.updateMatrix(),d.material.uniforms.uvTransform.value.copy(C.matrix),(v!==C||g!==C.version||p!==i.toneMapping)&&(d.material.needsUpdate=!0,v=C,g=C.version,p=i.toneMapping),d.layers.enableAll(),A.unshift(d,d.geometry,d.material,0,0,null))}function M(A,D){A.getRGB(Bu,Ly(i)),t.buffers.color.setClear(Bu.r,Bu.g,Bu.b,D,l)}function S(){f!==void 0&&(f.geometry.dispose(),f.material.dispose(),f=void 0),d!==void 0&&(d.geometry.dispose(),d.material.dispose(),d=void 0)}return{getClearColor:function(){return c},setClearColor:function(A,D=1){c.set(A),h=D,M(c,h)},getClearAlpha:function(){return h},setClearAlpha:function(A){h=A,M(c,h)},render:E,addToRenderList:b,dispose:S}}function ZR(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),r={},a=p(null);let l=a,c=!1;function h(V,X,j,he,$){let oe=!1;const Q=g(V,he,j,X);l!==Q&&(l=Q,f(l.object)),oe=y(V,he,j,$),oe&&E(V,he,j,$),$!==null&&e.update($,i.ELEMENT_ARRAY_BUFFER),(oe||c)&&(c=!1,C(V,X,j,he),$!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get($).buffer))}function d(){return i.createVertexArray()}function f(V){return i.bindVertexArray(V)}function v(V){return i.deleteVertexArray(V)}function g(V,X,j,he){const $=he.wireframe===!0;let oe=r[X.id];oe===void 0&&(oe={},r[X.id]=oe);const Q=V.isInstancedMesh===!0?V.id:0;let q=oe[Q];q===void 0&&(q={},oe[Q]=q);let Y=q[j.id];Y===void 0&&(Y={},q[j.id]=Y);let Z=Y[$];return Z===void 0&&(Z=p(d()),Y[$]=Z),Z}function p(V){const X=[],j=[],he=[];for(let $=0;$<t;$++)X[$]=0,j[$]=0,he[$]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:X,enabledAttributes:j,attributeDivisors:he,object:V,attributes:{},index:null}}function y(V,X,j,he){const $=l.attributes,oe=X.attributes;let Q=0;const q=j.getAttributes();for(const Y in q)if(q[Y].location>=0){const O=$[Y];let ne=oe[Y];if(ne===void 0&&(Y==="instanceMatrix"&&V.instanceMatrix&&(ne=V.instanceMatrix),Y==="instanceColor"&&V.instanceColor&&(ne=V.instanceColor)),O===void 0||O.attribute!==ne||ne&&O.data!==ne.data)return!0;Q++}return l.attributesNum!==Q||l.index!==he}function E(V,X,j,he){const $={},oe=X.attributes;let Q=0;const q=j.getAttributes();for(const Y in q)if(q[Y].location>=0){let O=oe[Y];O===void 0&&(Y==="instanceMatrix"&&V.instanceMatrix&&(O=V.instanceMatrix),Y==="instanceColor"&&V.instanceColor&&(O=V.instanceColor));const ne={};ne.attribute=O,O&&O.data&&(ne.data=O.data),$[Y]=ne,Q++}l.attributes=$,l.attributesNum=Q,l.index=he}function b(){const V=l.newAttributes;for(let X=0,j=V.length;X<j;X++)V[X]=0}function M(V){S(V,0)}function S(V,X){const j=l.newAttributes,he=l.enabledAttributes,$=l.attributeDivisors;j[V]=1,he[V]===0&&(i.enableVertexAttribArray(V),he[V]=1),$[V]!==X&&(i.vertexAttribDivisor(V,X),$[V]=X)}function A(){const V=l.newAttributes,X=l.enabledAttributes;for(let j=0,he=X.length;j<he;j++)X[j]!==V[j]&&(i.disableVertexAttribArray(j),X[j]=0)}function D(V,X,j,he,$,oe,Q){Q===!0?i.vertexAttribIPointer(V,X,j,$,oe):i.vertexAttribPointer(V,X,j,he,$,oe)}function C(V,X,j,he){b();const $=he.attributes,oe=j.getAttributes(),Q=X.defaultAttributeValues;for(const q in oe){const Y=oe[q];if(Y.location>=0){let Z=$[q];if(Z===void 0&&(q==="instanceMatrix"&&V.instanceMatrix&&(Z=V.instanceMatrix),q==="instanceColor"&&V.instanceColor&&(Z=V.instanceColor)),Z!==void 0){const O=Z.normalized,ne=Z.itemSize,Re=e.get(Z);if(Re===void 0)continue;const xe=Re.buffer,Ne=Re.type,B=Re.bytesPerElement,ge=Ne===i.INT||Ne===i.UNSIGNED_INT||Z.gpuType===Pm;if(Z.isInterleavedBufferAttribute){const fe=Z.data,re=fe.stride,Ie=Z.offset;if(fe.isInstancedInterleavedBuffer){for(let qe=0;qe<Y.locationSize;qe++)S(Y.location+qe,fe.meshPerAttribute);V.isInstancedMesh!==!0&&he._maxInstanceCount===void 0&&(he._maxInstanceCount=fe.meshPerAttribute*fe.count)}else for(let qe=0;qe<Y.locationSize;qe++)M(Y.location+qe);i.bindBuffer(i.ARRAY_BUFFER,xe);for(let qe=0;qe<Y.locationSize;qe++)D(Y.location+qe,ne/Y.locationSize,Ne,O,re*B,(Ie+ne/Y.locationSize*qe)*B,ge)}else{if(Z.isInstancedBufferAttribute){for(let fe=0;fe<Y.locationSize;fe++)S(Y.location+fe,Z.meshPerAttribute);V.isInstancedMesh!==!0&&he._maxInstanceCount===void 0&&(he._maxInstanceCount=Z.meshPerAttribute*Z.count)}else for(let fe=0;fe<Y.locationSize;fe++)M(Y.location+fe);i.bindBuffer(i.ARRAY_BUFFER,xe);for(let fe=0;fe<Y.locationSize;fe++)D(Y.location+fe,ne/Y.locationSize,Ne,O,ne*B,ne/Y.locationSize*fe*B,ge)}}else if(Q!==void 0){const O=Q[q];if(O!==void 0)switch(O.length){case 2:i.vertexAttrib2fv(Y.location,O);break;case 3:i.vertexAttrib3fv(Y.location,O);break;case 4:i.vertexAttrib4fv(Y.location,O);break;default:i.vertexAttrib1fv(Y.location,O)}}}}A()}function I(){N();for(const V in r){const X=r[V];for(const j in X){const he=X[j];for(const $ in he){const oe=he[$];for(const Q in oe)v(oe[Q].object),delete oe[Q];delete he[$]}}delete r[V]}}function L(V){if(r[V.id]===void 0)return;const X=r[V.id];for(const j in X){const he=X[j];for(const $ in he){const oe=he[$];for(const Q in oe)v(oe[Q].object),delete oe[Q];delete he[$]}}delete r[V.id]}function U(V){for(const X in r){const j=r[X];for(const he in j){const $=j[he];if($[V.id]===void 0)continue;const oe=$[V.id];for(const Q in oe)v(oe[Q].object),delete oe[Q];delete $[V.id]}}}function w(V){for(const X in r){const j=r[X],he=V.isInstancedMesh===!0?V.id:0,$=j[he];if($!==void 0){for(const oe in $){const Q=$[oe];for(const q in Q)v(Q[q].object),delete Q[q];delete $[oe]}delete j[he],Object.keys(j).length===0&&delete r[X]}}}function N(){H(),c=!0,l!==a&&(l=a,f(l.object))}function H(){a.geometry=null,a.program=null,a.wireframe=!1}return{setup:h,reset:N,resetDefaultState:H,dispose:I,releaseStatesOfGeometry:L,releaseStatesOfObject:w,releaseStatesOfProgram:U,initAttributes:b,enableAttribute:M,disableUnusedAttributes:A}}function JR(i,e,t){let r;function a(d){r=d}function l(d,f){i.drawArrays(r,d,f),t.update(f,r,1)}function c(d,f,v){v!==0&&(i.drawArraysInstanced(r,d,f,v),t.update(f,r,v))}function h(d,f,v){if(v===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(r,d,0,f,0,v);let p=0;for(let y=0;y<v;y++)p+=f[y];t.update(p,r,1)}this.setMode=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function eA(i,e,t,r){let a;function l(){if(a!==void 0)return a;if(e.has("EXT_texture_filter_anisotropic")===!0){const U=e.get("EXT_texture_filter_anisotropic");a=i.getParameter(U.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else a=0;return a}function c(U){return!(U!==Ki&&r.convert(U)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function h(U){const w=U===Yr&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(U!==Si&&r.convert(U)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&U!==pr&&!w)}function d(U){if(U==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";U="mediump"}return U==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let f=t.precision!==void 0?t.precision:"highp";const v=d(f);v!==f&&(ot("WebGLRenderer:",f,"not supported, using",v,"instead."),f=v);const g=t.logarithmicDepthBuffer===!0,p=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&p===!1&&ot("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const y=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),E=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),b=i.getParameter(i.MAX_TEXTURE_SIZE),M=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),S=i.getParameter(i.MAX_VERTEX_ATTRIBS),A=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),D=i.getParameter(i.MAX_VARYING_VECTORS),C=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),I=i.getParameter(i.MAX_SAMPLES),L=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:l,getMaxPrecision:d,textureFormatReadable:c,textureTypeReadable:h,precision:f,logarithmicDepthBuffer:g,reversedDepthBuffer:p,maxTextures:y,maxVertexTextures:E,maxTextureSize:b,maxCubemapSize:M,maxAttributes:S,maxVertexUniforms:A,maxVaryings:D,maxFragmentUniforms:C,maxSamples:I,samples:L}}function tA(i){const e=this;let t=null,r=0,a=!1,l=!1;const c=new Ts,h=new pt,d={value:null,needsUpdate:!1};this.uniform=d,this.numPlanes=0,this.numIntersection=0,this.init=function(g,p){const y=g.length!==0||p||r!==0||a;return a=p,r=g.length,y},this.beginShadows=function(){l=!0,v(null)},this.endShadows=function(){l=!1},this.setGlobalState=function(g,p){t=v(g,p,0)},this.setState=function(g,p,y){const E=g.clippingPlanes,b=g.clipIntersection,M=g.clipShadows,S=i.get(g);if(!a||E===null||E.length===0||l&&!M)l?v(null):f();else{const A=l?0:r,D=A*4;let C=S.clippingState||null;d.value=C,C=v(E,p,D,y);for(let I=0;I!==D;++I)C[I]=t[I];S.clippingState=C,this.numIntersection=b?this.numPlanes:0,this.numPlanes+=A}};function f(){d.value!==t&&(d.value=t,d.needsUpdate=r>0),e.numPlanes=r,e.numIntersection=0}function v(g,p,y,E){const b=g!==null?g.length:0;let M=null;if(b!==0){if(M=d.value,E!==!0||M===null){const S=y+b*4,A=p.matrixWorldInverse;h.getNormalMatrix(A),(M===null||M.length<S)&&(M=new Float32Array(S));for(let D=0,C=y;D!==b;++D,C+=4)c.copy(g[D]).applyMatrix4(A,h),c.normal.toArray(M,C),M[C+3]=c.constant}d.value=M,d.needsUpdate=!0}return e.numPlanes=b,e.numIntersection=0,M}}const ks=4,Av=[.125,.215,.35,.446,.526,.582],fa=20,nA=256,Il=new Bm,Pv=new _t;let Xf=null,$f=0,qf=0,Kf=!1;const iA=new ie;class Nv{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,r=.1,a=100,l={}){const{size:c=256,position:h=iA}=l;Xf=this._renderer.getRenderTarget(),$f=this._renderer.getActiveCubeFace(),qf=this._renderer.getActiveMipmapLevel(),Kf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(c);const d=this._allocateTargets();return d.depthBuffer=!0,this._sceneToCubeUV(e,r,a,d,h),t>0&&this._blur(d,0,0,t),this._applyPMREM(d),this._cleanup(d),d}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Iv(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Dv(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Xf,$f,qf),this._renderer.xr.enabled=Kf,e.scissorTest=!1,po(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Ca||e.mapping===Fo?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Xf=this._renderer.getRenderTarget(),$f=this._renderer.getActiveCubeFace(),qf=this._renderer.getActiveMipmapLevel(),Kf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const r=t||this._allocateTargets();return this._textureToCubeUV(e,r),this._applyPMREM(r),this._cleanup(r),r}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,r={magFilter:jn,minFilter:jn,generateMipmaps:!1,type:Yr,format:Ki,colorSpace:uh,depthBuffer:!1},a=Lv(e,t,r);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Lv(e,t,r);const{_lodMax:l}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=rA(l)),this._blurMaterial=aA(l,e,t),this._ggxMaterial=sA(l,e,t)}return a}_compileMaterial(e){const t=new Qi(new Mi,e);this._renderer.compile(t,Il)}_sceneToCubeUV(e,t,r,a,l){const d=new Ii(90,1,t,r),f=[1,-1,1,1,1,1],v=[1,1,1,-1,-1,-1],g=this._renderer,p=g.autoClear,y=g.toneMapping;g.getClearColor(Pv),g.toneMapping=xr,g.autoClear=!1,g.state.buffers.depth.getReversed()&&(g.setRenderTarget(a),g.clearDepth(),g.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Qi(new ac,new Ay({name:"PMREM.Background",side:di,depthWrite:!1,depthTest:!1})));const b=this._backgroundBox,M=b.material;let S=!1;const A=e.background;A?A.isColor&&(M.color.copy(A),e.background=null,S=!0):(M.color.copy(Pv),S=!0);for(let D=0;D<6;D++){const C=D%3;C===0?(d.up.set(0,f[D],0),d.position.set(l.x,l.y,l.z),d.lookAt(l.x+v[D],l.y,l.z)):C===1?(d.up.set(0,0,f[D]),d.position.set(l.x,l.y,l.z),d.lookAt(l.x,l.y+v[D],l.z)):(d.up.set(0,f[D],0),d.position.set(l.x,l.y,l.z),d.lookAt(l.x,l.y,l.z+v[D]));const I=this._cubeSize;po(a,C*I,D>2?I:0,I,I),g.setRenderTarget(a),S&&g.render(b,d),g.render(e,d)}g.toneMapping=y,g.autoClear=p,e.background=A}_textureToCubeUV(e,t){const r=this._renderer,a=e.mapping===Ca||e.mapping===Fo;a?(this._cubemapMaterial===null&&(this._cubemapMaterial=Iv()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Dv());const l=a?this._cubemapMaterial:this._equirectMaterial,c=this._lodMeshes[0];c.material=l;const h=l.uniforms;h.envMap.value=e;const d=this._cubeSize;po(t,0,0,3*d,2*d),r.setRenderTarget(t),r.render(c,Il)}_applyPMREM(e){const t=this._renderer,r=t.autoClear;t.autoClear=!1;const a=this._lodMeshes.length;for(let l=1;l<a;l++)this._applyGGXFilter(e,l-1,l);t.autoClear=r}_applyGGXFilter(e,t,r){const a=this._renderer,l=this._pingPongRenderTarget,c=this._ggxMaterial,h=this._lodMeshes[r];h.material=c;const d=c.uniforms,f=r/(this._lodMeshes.length-1),v=t/(this._lodMeshes.length-1),g=Math.sqrt(f*f-v*v),p=0+f*1.25,y=g*p,{_lodMax:E}=this,b=this._sizeLods[r],M=3*b*(r>E-ks?r-E+ks:0),S=4*(this._cubeSize-b);d.envMap.value=e.texture,d.roughness.value=y,d.mipInt.value=E-t,po(l,M,S,3*b,2*b),a.setRenderTarget(l),a.render(h,Il),d.envMap.value=l.texture,d.roughness.value=0,d.mipInt.value=E-r,po(e,M,S,3*b,2*b),a.setRenderTarget(e),a.render(h,Il)}_blur(e,t,r,a,l){const c=this._pingPongRenderTarget;this._halfBlur(e,c,t,r,a,"latitudinal",l),this._halfBlur(c,e,r,r,a,"longitudinal",l)}_halfBlur(e,t,r,a,l,c,h){const d=this._renderer,f=this._blurMaterial;c!=="latitudinal"&&c!=="longitudinal"&&Nt("blur direction must be either latitudinal or longitudinal!");const v=3,g=this._lodMeshes[a];g.material=f;const p=f.uniforms,y=this._sizeLods[r]-1,E=isFinite(l)?Math.PI/(2*y):2*Math.PI/(2*fa-1),b=l/E,M=isFinite(l)?1+Math.floor(v*b):fa;M>fa&&ot(`sigmaRadians, ${l}, is too large and will clip, as it requested ${M} samples when the maximum is set to ${fa}`);const S=[];let A=0;for(let U=0;U<fa;++U){const w=U/b,N=Math.exp(-w*w/2);S.push(N),U===0?A+=N:U<M&&(A+=2*N)}for(let U=0;U<S.length;U++)S[U]=S[U]/A;p.envMap.value=e.texture,p.samples.value=M,p.weights.value=S,p.latitudinal.value=c==="latitudinal",h&&(p.poleAxis.value=h);const{_lodMax:D}=this;p.dTheta.value=E,p.mipInt.value=D-r;const C=this._sizeLods[a],I=3*C*(a>D-ks?a-D+ks:0),L=4*(this._cubeSize-C);po(t,I,L,3*C,2*C),d.setRenderTarget(t),d.render(g,Il)}}function rA(i){const e=[],t=[],r=[];let a=i;const l=i-ks+1+Av.length;for(let c=0;c<l;c++){const h=Math.pow(2,a);e.push(h);let d=1/h;c>i-ks?d=Av[c-i+ks-1]:c===0&&(d=0),t.push(d);const f=1/(h-2),v=-f,g=1+f,p=[v,v,g,v,g,g,v,v,g,g,v,g],y=6,E=6,b=3,M=2,S=1,A=new Float32Array(b*E*y),D=new Float32Array(M*E*y),C=new Float32Array(S*E*y);for(let L=0;L<y;L++){const U=L%3*2/3-1,w=L>2?0:-1,N=[U,w,0,U+2/3,w,0,U+2/3,w+1,0,U,w,0,U+2/3,w+1,0,U,w+1,0];A.set(N,b*E*L),D.set(p,M*E*L);const H=[L,L,L,L,L,L];C.set(H,S*E*L)}const I=new Mi;I.setAttribute("position",new _r(A,b)),I.setAttribute("uv",new _r(D,M)),I.setAttribute("faceIndex",new _r(C,S)),r.push(new Qi(I,null)),a>ks&&a--}return{lodMeshes:r,sizeLods:e,sigmas:t}}function Lv(i,e,t){const r=new vr(i,e,t);return r.texture.mapping=Mh,r.texture.name="PMREM.cubeUv",r.scissorTest=!0,r}function po(i,e,t,r,a){i.viewport.set(e,t,r,a),i.scissor.set(e,t,r,a)}function sA(i,e,t){return new Mr({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:nA,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:bh(),fragmentShader:`

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
		`,blending:Xr,depthTest:!1,depthWrite:!1})}function aA(i,e,t){const r=new Float32Array(fa),a=new ie(0,1,0);return new Mr({name:"SphericalGaussianBlur",defines:{n:fa,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:r},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:a}},vertexShader:bh(),fragmentShader:`

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
		`,blending:Xr,depthTest:!1,depthWrite:!1})}function Dv(){return new Mr({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:bh(),fragmentShader:`

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
		`,blending:Xr,depthTest:!1,depthWrite:!1})}function Iv(){return new Mr({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:bh(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Xr,depthTest:!1,depthWrite:!1})}function bh(){return`

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
	`}class ky extends vr{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const r={width:e,height:e,depth:1},a=[r,r,r,r,r,r];this.texture=new Py(a),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const r={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},a=new ac(5,5,5),l=new Mr({name:"CubemapFromEquirect",uniforms:Oo(r.uniforms),vertexShader:r.vertexShader,fragmentShader:r.fragmentShader,side:di,blending:Xr});l.uniforms.tEquirect.value=t;const c=new Qi(a,l),h=t.minFilter;return t.minFilter===ma&&(t.minFilter=jn),new hT(1,10,this).update(e,c),t.minFilter=h,c.geometry.dispose(),c.material.dispose(),this}clear(e,t=!0,r=!0,a=!0){const l=e.getRenderTarget();for(let c=0;c<6;c++)e.setRenderTarget(this,c),e.clear(t,r,a);e.setRenderTarget(l)}}function oA(i){let e=new WeakMap,t=new WeakMap,r=null;function a(p,y=!1){return p==null?null:y?c(p):l(p)}function l(p){if(p&&p.isTexture){const y=p.mapping;if(y===gf||y===xf)if(e.has(p)){const E=e.get(p).texture;return h(E,p.mapping)}else{const E=p.image;if(E&&E.height>0){const b=new ky(E.height);return b.fromEquirectangularTexture(i,p),e.set(p,b),p.addEventListener("dispose",f),h(b.texture,p.mapping)}else return null}}return p}function c(p){if(p&&p.isTexture){const y=p.mapping,E=y===gf||y===xf,b=y===Ca||y===Fo;if(E||b){let M=t.get(p);const S=M!==void 0?M.texture.pmremVersion:0;if(p.isRenderTargetTexture&&p.pmremVersion!==S)return r===null&&(r=new Nv(i)),M=E?r.fromEquirectangular(p,M):r.fromCubemap(p,M),M.texture.pmremVersion=p.pmremVersion,t.set(p,M),M.texture;if(M!==void 0)return M.texture;{const A=p.image;return E&&A&&A.height>0||b&&A&&d(A)?(r===null&&(r=new Nv(i)),M=E?r.fromEquirectangular(p):r.fromCubemap(p),M.texture.pmremVersion=p.pmremVersion,t.set(p,M),p.addEventListener("dispose",v),M.texture):null}}}return p}function h(p,y){return y===gf?p.mapping=Ca:y===xf&&(p.mapping=Fo),p}function d(p){let y=0;const E=6;for(let b=0;b<E;b++)p[b]!==void 0&&y++;return y===E}function f(p){const y=p.target;y.removeEventListener("dispose",f);const E=e.get(y);E!==void 0&&(e.delete(y),E.dispose())}function v(p){const y=p.target;y.removeEventListener("dispose",v);const E=t.get(y);E!==void 0&&(t.delete(y),E.dispose())}function g(){e=new WeakMap,t=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:a,dispose:g}}function lA(i){const e={};function t(r){if(e[r]!==void 0)return e[r];const a=i.getExtension(r);return e[r]=a,a}return{has:function(r){return t(r)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(r){const a=t(r);return a===null&&yo("WebGLRenderer: "+r+" extension not supported."),a}}}function cA(i,e,t,r){const a={},l=new WeakMap;function c(g){const p=g.target;p.index!==null&&e.remove(p.index);for(const E in p.attributes)e.remove(p.attributes[E]);p.removeEventListener("dispose",c),delete a[p.id];const y=l.get(p);y&&(e.remove(y),l.delete(p)),r.releaseStatesOfGeometry(p),p.isInstancedBufferGeometry===!0&&delete p._maxInstanceCount,t.memory.geometries--}function h(g,p){return a[p.id]===!0||(p.addEventListener("dispose",c),a[p.id]=!0,t.memory.geometries++),p}function d(g){const p=g.attributes;for(const y in p)e.update(p[y],i.ARRAY_BUFFER)}function f(g){const p=[],y=g.index,E=g.attributes.position;let b=0;if(E===void 0)return;if(y!==null){const A=y.array;b=y.version;for(let D=0,C=A.length;D<C;D+=3){const I=A[D+0],L=A[D+1],U=A[D+2];p.push(I,L,L,U,U,I)}}else{const A=E.array;b=E.version;for(let D=0,C=A.length/3-1;D<C;D+=3){const I=D+0,L=D+1,U=D+2;p.push(I,L,L,U,U,I)}}const M=new(E.count>=65535?Ry:Cy)(p,1);M.version=b;const S=l.get(g);S&&e.remove(S),l.set(g,M)}function v(g){const p=l.get(g);if(p){const y=g.index;y!==null&&p.version<y.version&&f(g)}else f(g);return l.get(g)}return{get:h,update:d,getWireframeAttribute:v}}function uA(i,e,t){let r;function a(g){r=g}let l,c;function h(g){l=g.type,c=g.bytesPerElement}function d(g,p){i.drawElements(r,p,l,g*c),t.update(p,r,1)}function f(g,p,y){y!==0&&(i.drawElementsInstanced(r,p,l,g*c,y),t.update(p,r,y))}function v(g,p,y){if(y===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(r,p,0,l,g,0,y);let b=0;for(let M=0;M<y;M++)b+=p[M];t.update(b,r,1)}this.setMode=a,this.setIndex=h,this.render=d,this.renderInstances=f,this.renderMultiDraw=v}function hA(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function r(l,c,h){switch(t.calls++,c){case i.TRIANGLES:t.triangles+=h*(l/3);break;case i.LINES:t.lines+=h*(l/2);break;case i.LINE_STRIP:t.lines+=h*(l-1);break;case i.LINE_LOOP:t.lines+=h*l;break;case i.POINTS:t.points+=h*l;break;default:Nt("WebGLInfo: Unknown draw mode:",c);break}}function a(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:a,update:r}}function dA(i,e,t){const r=new WeakMap,a=new cn;function l(c,h,d){const f=c.morphTargetInfluences,v=h.morphAttributes.position||h.morphAttributes.normal||h.morphAttributes.color,g=v!==void 0?v.length:0;let p=r.get(h);if(p===void 0||p.count!==g){let H=function(){w.dispose(),r.delete(h),h.removeEventListener("dispose",H)};var y=H;p!==void 0&&p.texture.dispose();const E=h.morphAttributes.position!==void 0,b=h.morphAttributes.normal!==void 0,M=h.morphAttributes.color!==void 0,S=h.morphAttributes.position||[],A=h.morphAttributes.normal||[],D=h.morphAttributes.color||[];let C=0;E===!0&&(C=1),b===!0&&(C=2),M===!0&&(C=3);let I=h.attributes.position.count*C,L=1;I>e.maxTextureSize&&(L=Math.ceil(I/e.maxTextureSize),I=e.maxTextureSize);const U=new Float32Array(I*L*4*g),w=new wy(U,I,L,g);w.type=pr,w.needsUpdate=!0;const N=C*4;for(let V=0;V<g;V++){const X=S[V],j=A[V],he=D[V],$=I*L*4*V;for(let oe=0;oe<X.count;oe++){const Q=oe*N;E===!0&&(a.fromBufferAttribute(X,oe),U[$+Q+0]=a.x,U[$+Q+1]=a.y,U[$+Q+2]=a.z,U[$+Q+3]=0),b===!0&&(a.fromBufferAttribute(j,oe),U[$+Q+4]=a.x,U[$+Q+5]=a.y,U[$+Q+6]=a.z,U[$+Q+7]=0),M===!0&&(a.fromBufferAttribute(he,oe),U[$+Q+8]=a.x,U[$+Q+9]=a.y,U[$+Q+10]=a.z,U[$+Q+11]=he.itemSize===4?a.w:1)}}p={count:g,texture:w,size:new ut(I,L)},r.set(h,p),h.addEventListener("dispose",H)}if(c.isInstancedMesh===!0&&c.morphTexture!==null)d.getUniforms().setValue(i,"morphTexture",c.morphTexture,t);else{let E=0;for(let M=0;M<f.length;M++)E+=f[M];const b=h.morphTargetsRelative?1:1-E;d.getUniforms().setValue(i,"morphTargetBaseInfluence",b),d.getUniforms().setValue(i,"morphTargetInfluences",f)}d.getUniforms().setValue(i,"morphTargetsTexture",p.texture,t),d.getUniforms().setValue(i,"morphTargetsTextureSize",p.size)}return{update:l}}function fA(i,e,t,r,a){let l=new WeakMap;function c(f){const v=a.render.frame,g=f.geometry,p=e.get(f,g);if(l.get(p)!==v&&(e.update(p),l.set(p,v)),f.isInstancedMesh&&(f.hasEventListener("dispose",d)===!1&&f.addEventListener("dispose",d),l.get(f)!==v&&(t.update(f.instanceMatrix,i.ARRAY_BUFFER),f.instanceColor!==null&&t.update(f.instanceColor,i.ARRAY_BUFFER),l.set(f,v))),f.isSkinnedMesh){const y=f.skeleton;l.get(y)!==v&&(y.update(),l.set(y,v))}return p}function h(){l=new WeakMap}function d(f){const v=f.target;v.removeEventListener("dispose",d),r.releaseStatesOfObject(v),t.remove(v.instanceMatrix),v.instanceColor!==null&&t.remove(v.instanceColor)}return{update:c,dispose:h}}const pA={[ly]:"LINEAR_TONE_MAPPING",[cy]:"REINHARD_TONE_MAPPING",[uy]:"CINEON_TONE_MAPPING",[hy]:"ACES_FILMIC_TONE_MAPPING",[fy]:"AGX_TONE_MAPPING",[py]:"NEUTRAL_TONE_MAPPING",[dy]:"CUSTOM_TONE_MAPPING"};function mA(i,e,t,r,a,l){const c=new vr(e,t,{type:i,depthBuffer:a,stencilBuffer:l,samples:r?4:0,depthTexture:a?new ko(e,t):void 0}),h=new vr(e,t,{type:Yr,depthBuffer:!1,stencilBuffer:!1}),d=new Mi;d.setAttribute("position",new In([-1,3,0,-1,-1,0,3,-1,0],3)),d.setAttribute("uv",new In([0,2,0,0,2,0],2));const f=new Zb({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),v=new Qi(d,f),g=new Bm(-1,1,1,-1,0,1);let p=null,y=null,E=!1,b,M=null,S=[],A=!1;this.setSize=function(D,C){c.setSize(D,C),h.setSize(D,C);for(let I=0;I<S.length;I++){const L=S[I];L.setSize&&L.setSize(D,C)}},this.setEffects=function(D){S=D,A=S.length>0&&S[0].isRenderPass===!0;const C=c.width,I=c.height;for(let L=0;L<S.length;L++){const U=S[L];U.setSize&&U.setSize(C,I)}},this.begin=function(D,C){if(E||D.toneMapping===xr&&S.length===0)return!1;if(M=C,C!==null){const I=C.width,L=C.height;(c.width!==I||c.height!==L)&&this.setSize(I,L)}return A===!1&&D.setRenderTarget(c),b=D.toneMapping,D.toneMapping=xr,!0},this.hasRenderPass=function(){return A},this.end=function(D,C){D.toneMapping=b,E=!0;let I=c,L=h;for(let U=0;U<S.length;U++){const w=S[U];if(w.enabled!==!1&&(w.render(D,L,I,C),w.needsSwap!==!1)){const N=I;I=L,L=N}}if(p!==D.outputColorSpace||y!==D.toneMapping){p=D.outputColorSpace,y=D.toneMapping,f.defines={},Tt.getTransfer(p)===Gt&&(f.defines.SRGB_TRANSFER="");const U=pA[y];U&&(f.defines[U]=""),f.needsUpdate=!0}f.uniforms.tDiffuse.value=I.texture,D.setRenderTarget(M),D.render(v,g),M=null,E=!1},this.isCompositing=function(){return E},this.dispose=function(){c.depthTexture&&c.depthTexture.dispose(),c.dispose(),h.dispose(),d.dispose(),f.dispose()}}const Oy=new Wn,um=new ko(1,1),zy=new wy,By=new Rb,Vy=new Py,Uv=[],Fv=[],kv=new Float32Array(16),Ov=new Float32Array(9),zv=new Float32Array(4);function jo(i,e,t){const r=i[0];if(r<=0||r>0)return i;const a=e*t;let l=Uv[a];if(l===void 0&&(l=new Float32Array(a),Uv[a]=l),e!==0){r.toArray(l,0);for(let c=1,h=0;c!==e;++c)h+=t,i[c].toArray(l,h)}return l}function Mn(i,e){if(i.length!==e.length)return!1;for(let t=0,r=i.length;t<r;t++)if(i[t]!==e[t])return!1;return!0}function En(i,e){for(let t=0,r=e.length;t<r;t++)i[t]=e[t]}function Th(i,e){let t=Fv[e];t===void 0&&(t=new Int32Array(e),Fv[e]=t);for(let r=0;r!==e;++r)t[r]=i.allocateTextureUnit();return t}function gA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function xA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Mn(t,e))return;i.uniform2fv(this.addr,e),En(t,e)}}function vA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Mn(t,e))return;i.uniform3fv(this.addr,e),En(t,e)}}function _A(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Mn(t,e))return;i.uniform4fv(this.addr,e),En(t,e)}}function yA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(Mn(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),En(t,e)}else{if(Mn(t,r))return;zv.set(r),i.uniformMatrix2fv(this.addr,!1,zv),En(t,r)}}function SA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(Mn(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),En(t,e)}else{if(Mn(t,r))return;Ov.set(r),i.uniformMatrix3fv(this.addr,!1,Ov),En(t,r)}}function MA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(Mn(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),En(t,e)}else{if(Mn(t,r))return;kv.set(r),i.uniformMatrix4fv(this.addr,!1,kv),En(t,r)}}function EA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function wA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Mn(t,e))return;i.uniform2iv(this.addr,e),En(t,e)}}function bA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Mn(t,e))return;i.uniform3iv(this.addr,e),En(t,e)}}function TA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Mn(t,e))return;i.uniform4iv(this.addr,e),En(t,e)}}function CA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function RA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Mn(t,e))return;i.uniform2uiv(this.addr,e),En(t,e)}}function AA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Mn(t,e))return;i.uniform3uiv(this.addr,e),En(t,e)}}function PA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Mn(t,e))return;i.uniform4uiv(this.addr,e),En(t,e)}}function NA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a);let l;this.type===i.SAMPLER_2D_SHADOW?(um.compareFunction=t.isReversedDepthBuffer()?km:Fm,l=um):l=Oy,t.setTexture2D(e||l,a)}function LA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTexture3D(e||By,a)}function DA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTextureCube(e||Vy,a)}function IA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTexture2DArray(e||zy,a)}function UA(i){switch(i){case 5126:return gA;case 35664:return xA;case 35665:return vA;case 35666:return _A;case 35674:return yA;case 35675:return SA;case 35676:return MA;case 5124:case 35670:return EA;case 35667:case 35671:return wA;case 35668:case 35672:return bA;case 35669:case 35673:return TA;case 5125:return CA;case 36294:return RA;case 36295:return AA;case 36296:return PA;case 35678:case 36198:case 36298:case 36306:case 35682:return NA;case 35679:case 36299:case 36307:return LA;case 35680:case 36300:case 36308:case 36293:return DA;case 36289:case 36303:case 36311:case 36292:return IA}}function FA(i,e){i.uniform1fv(this.addr,e)}function kA(i,e){const t=jo(e,this.size,2);i.uniform2fv(this.addr,t)}function OA(i,e){const t=jo(e,this.size,3);i.uniform3fv(this.addr,t)}function zA(i,e){const t=jo(e,this.size,4);i.uniform4fv(this.addr,t)}function BA(i,e){const t=jo(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function VA(i,e){const t=jo(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function HA(i,e){const t=jo(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function GA(i,e){i.uniform1iv(this.addr,e)}function jA(i,e){i.uniform2iv(this.addr,e)}function WA(i,e){i.uniform3iv(this.addr,e)}function XA(i,e){i.uniform4iv(this.addr,e)}function $A(i,e){i.uniform1uiv(this.addr,e)}function qA(i,e){i.uniform2uiv(this.addr,e)}function KA(i,e){i.uniform3uiv(this.addr,e)}function YA(i,e){i.uniform4uiv(this.addr,e)}function QA(i,e,t){const r=this.cache,a=e.length,l=Th(t,a);Mn(r,l)||(i.uniform1iv(this.addr,l),En(r,l));let c;this.type===i.SAMPLER_2D_SHADOW?c=um:c=Oy;for(let h=0;h!==a;++h)t.setTexture2D(e[h]||c,l[h])}function ZA(i,e,t){const r=this.cache,a=e.length,l=Th(t,a);Mn(r,l)||(i.uniform1iv(this.addr,l),En(r,l));for(let c=0;c!==a;++c)t.setTexture3D(e[c]||By,l[c])}function JA(i,e,t){const r=this.cache,a=e.length,l=Th(t,a);Mn(r,l)||(i.uniform1iv(this.addr,l),En(r,l));for(let c=0;c!==a;++c)t.setTextureCube(e[c]||Vy,l[c])}function e2(i,e,t){const r=this.cache,a=e.length,l=Th(t,a);Mn(r,l)||(i.uniform1iv(this.addr,l),En(r,l));for(let c=0;c!==a;++c)t.setTexture2DArray(e[c]||zy,l[c])}function t2(i){switch(i){case 5126:return FA;case 35664:return kA;case 35665:return OA;case 35666:return zA;case 35674:return BA;case 35675:return VA;case 35676:return HA;case 5124:case 35670:return GA;case 35667:case 35671:return jA;case 35668:case 35672:return WA;case 35669:case 35673:return XA;case 5125:return $A;case 36294:return qA;case 36295:return KA;case 36296:return YA;case 35678:case 36198:case 36298:case 36306:case 35682:return QA;case 35679:case 36299:case 36307:return ZA;case 35680:case 36300:case 36308:case 36293:return JA;case 36289:case 36303:case 36311:case 36292:return e2}}class n2{constructor(e,t,r){this.id=e,this.addr=r,this.cache=[],this.type=t.type,this.setValue=UA(t.type)}}class i2{constructor(e,t,r){this.id=e,this.addr=r,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=t2(t.type)}}class r2{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,r){const a=this.seq;for(let l=0,c=a.length;l!==c;++l){const h=a[l];h.setValue(e,t[h.id],r)}}}const Yf=/(\w+)(\])?(\[|\.)?/g;function Bv(i,e){i.seq.push(e),i.map[e.id]=e}function s2(i,e,t){const r=i.name,a=r.length;for(Yf.lastIndex=0;;){const l=Yf.exec(r),c=Yf.lastIndex;let h=l[1];const d=l[2]==="]",f=l[3];if(d&&(h=h|0),f===void 0||f==="["&&c+2===a){Bv(t,f===void 0?new n2(h,i,e):new i2(h,i,e));break}else{let g=t.map[h];g===void 0&&(g=new r2(h),Bv(t,g)),t=g}}}class eh{constructor(e,t){this.seq=[],this.map={};const r=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let c=0;c<r;++c){const h=e.getActiveUniform(t,c),d=e.getUniformLocation(t,h.name);s2(h,d,this)}const a=[],l=[];for(const c of this.seq)c.type===e.SAMPLER_2D_SHADOW||c.type===e.SAMPLER_CUBE_SHADOW||c.type===e.SAMPLER_2D_ARRAY_SHADOW?a.push(c):l.push(c);a.length>0&&(this.seq=a.concat(l))}setValue(e,t,r,a){const l=this.map[t];l!==void 0&&l.setValue(e,r,a)}setOptional(e,t,r){const a=t[r];a!==void 0&&this.setValue(e,r,a)}static upload(e,t,r,a){for(let l=0,c=t.length;l!==c;++l){const h=t[l],d=r[h.id];d.needsUpdate!==!1&&h.setValue(e,d.value,a)}}static seqWithValue(e,t){const r=[];for(let a=0,l=e.length;a!==l;++a){const c=e[a];c.id in t&&r.push(c)}return r}}function Vv(i,e,t){const r=i.createShader(e);return i.shaderSource(r,t),i.compileShader(r),r}const a2=37297;let o2=0;function l2(i,e){const t=i.split(`
`),r=[],a=Math.max(e-6,0),l=Math.min(e+6,t.length);for(let c=a;c<l;c++){const h=c+1;r.push(`${h===e?">":" "} ${h}: ${t[c]}`)}return r.join(`
`)}const Hv=new pt;function c2(i){Tt._getMatrix(Hv,Tt.workingColorSpace,i);const e=`mat3( ${Hv.elements.map(t=>t.toFixed(4))} )`;switch(Tt.getTransfer(i)){case hh:return[e,"LinearTransferOETF"];case Gt:return[e,"sRGBTransferOETF"];default:return ot("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function Gv(i,e,t){const r=i.getShaderParameter(e,i.COMPILE_STATUS),l=(i.getShaderInfoLog(e)||"").trim();if(r&&l==="")return"";const c=/ERROR: 0:(\d+)/.exec(l);if(c){const h=parseInt(c[1]);return t.toUpperCase()+`

`+l+`

`+l2(i.getShaderSource(e),h)}else return l}function u2(i,e){const t=c2(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const h2={[ly]:"Linear",[cy]:"Reinhard",[uy]:"Cineon",[hy]:"ACESFilmic",[fy]:"AgX",[py]:"Neutral",[dy]:"Custom"};function d2(i,e){const t=h2[e];return t===void 0?(ot("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Vu=new ie;function f2(){Tt.getLuminanceCoefficients(Vu);const i=Vu.x.toFixed(4),e=Vu.y.toFixed(4),t=Vu.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function p2(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Bl).join(`
`)}function m2(i){const e=[];for(const t in i){const r=i[t];r!==!1&&e.push("#define "+t+" "+r)}return e.join(`
`)}function g2(i,e){const t={},r=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let a=0;a<r;a++){const l=i.getActiveAttrib(e,a),c=l.name;let h=1;l.type===i.FLOAT_MAT2&&(h=2),l.type===i.FLOAT_MAT3&&(h=3),l.type===i.FLOAT_MAT4&&(h=4),t[c]={type:l.type,location:i.getAttribLocation(e,c),locationSize:h}}return t}function Bl(i){return i!==""}function jv(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Wv(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const x2=/^[ \t]*#include +<([\w\d./]+)>/gm;function hm(i){return i.replace(x2,_2)}const v2=new Map;function _2(i,e){let t=vt[e];if(t===void 0){const r=v2.get(e);if(r!==void 0)t=vt[r],ot('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,r);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return hm(t)}const y2=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Xv(i){return i.replace(y2,S2)}function S2(i,e,t,r){let a="";for(let l=parseInt(e);l<parseInt(t);l++)a+=r.replace(/\[\s*i\s*\]/g,"[ "+l+" ]").replace(/UNROLLED_LOOP_INDEX/g,l);return a}function $v(i){let e=`precision ${i.precision} float;
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
#define LOW_PRECISION`),e}const M2={[$u]:"SHADOWMAP_TYPE_PCF",[kl]:"SHADOWMAP_TYPE_VSM"};function E2(i){return M2[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const w2={[Ca]:"ENVMAP_TYPE_CUBE",[Fo]:"ENVMAP_TYPE_CUBE",[Mh]:"ENVMAP_TYPE_CUBE_UV"};function b2(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":w2[i.envMapMode]||"ENVMAP_TYPE_CUBE"}const T2={[Fo]:"ENVMAP_MODE_REFRACTION"};function C2(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":T2[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}const R2={[Am]:"ENVMAP_BLENDING_MULTIPLY",[ab]:"ENVMAP_BLENDING_MIX",[ob]:"ENVMAP_BLENDING_ADD"};function A2(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":R2[i.combine]||"ENVMAP_BLENDING_NONE"}function P2(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,r=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:r,maxMip:t}}function N2(i,e,t,r){const a=i.getContext(),l=t.defines;let c=t.vertexShader,h=t.fragmentShader;const d=E2(t),f=b2(t),v=C2(t),g=A2(t),p=P2(t),y=p2(t),E=m2(l),b=a.createProgram();let M,S,A=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(M=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E].filter(Bl).join(`
`),M.length>0&&(M+=`
`),S=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E].filter(Bl).join(`
`),S.length>0&&(S+=`
`)):(M=[$v(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+v:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+d:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Bl).join(`
`),S=[$v(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+f:"",t.envMap?"#define "+v:"",t.envMap?"#define "+g:"",p?"#define CUBEUV_TEXEL_WIDTH "+p.texelWidth:"",p?"#define CUBEUV_TEXEL_HEIGHT "+p.texelHeight:"",p?"#define CUBEUV_MAX_MIP "+p.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+d:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==xr?"#define TONE_MAPPING":"",t.toneMapping!==xr?vt.tonemapping_pars_fragment:"",t.toneMapping!==xr?d2("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",vt.colorspace_pars_fragment,u2("linearToOutputTexel",t.outputColorSpace),f2(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Bl).join(`
`)),c=hm(c),c=jv(c,t),c=Wv(c,t),h=hm(h),h=jv(h,t),h=Wv(h,t),c=Xv(c),h=Xv(h),t.isRawShaderMaterial!==!0&&(A=`#version 300 es
`,M=[y,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+M,S=["#define varying in",t.glslVersion===Kx?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Kx?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+S);const D=A+M+c,C=A+S+h,I=Vv(a,a.VERTEX_SHADER,D),L=Vv(a,a.FRAGMENT_SHADER,C);a.attachShader(b,I),a.attachShader(b,L),t.index0AttributeName!==void 0?a.bindAttribLocation(b,0,t.index0AttributeName):t.hasPositionAttribute===!0&&a.bindAttribLocation(b,0,"position"),a.linkProgram(b);function U(V){if(i.debug.checkShaderErrors){const X=a.getProgramInfoLog(b)||"",j=a.getShaderInfoLog(I)||"",he=a.getShaderInfoLog(L)||"",$=X.trim(),oe=j.trim(),Q=he.trim();let q=!0,Y=!0;if(a.getProgramParameter(b,a.LINK_STATUS)===!1)if(q=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(a,b,I,L);else{const Z=Gv(a,I,"vertex"),O=Gv(a,L,"fragment");Nt("WebGLProgram: Shader Error "+a.getError()+" - VALIDATE_STATUS "+a.getProgramParameter(b,a.VALIDATE_STATUS)+`

Material Name: `+V.name+`
Material Type: `+V.type+`

Program Info Log: `+$+`
`+Z+`
`+O)}else $!==""?ot("WebGLProgram: Program Info Log:",$):(oe===""||Q==="")&&(Y=!1);Y&&(V.diagnostics={runnable:q,programLog:$,vertexShader:{log:oe,prefix:M},fragmentShader:{log:Q,prefix:S}})}a.deleteShader(I),a.deleteShader(L),w=new eh(a,b),N=g2(a,b)}let w;this.getUniforms=function(){return w===void 0&&U(this),w};let N;this.getAttributes=function(){return N===void 0&&U(this),N};let H=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return H===!1&&(H=a.getProgramParameter(b,a2)),H},this.destroy=function(){r.releaseStatesOfProgram(this),a.deleteProgram(b),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=o2++,this.cacheKey=e,this.usedTimes=1,this.program=b,this.vertexShader=I,this.fragmentShader=L,this}let L2=0;class D2{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,r){const a=this._getShaderCacheForMaterial(e);return a.has(t)===!1&&(a.add(t),t.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const r of t)r.usedTimes--,r.usedTimes===0&&this.shaderCache.delete(r.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let r=t.get(e);return r===void 0&&(r=new Set,t.set(e,r)),r}_getShaderStage(e){const t=this.shaderCache;let r=t.get(e);return r===void 0&&(r=new I2(e),t.set(e,r)),r}}class I2{constructor(e){this.id=L2++,this.code=e,this.usedTimes=0}}function U2(i){return i===Ra||i===oh||i===lh}function F2(i,e,t,r,a,l){const c=new by,h=new D2,d=new Set,f=[],v=new Map,g=r.logarithmicDepthBuffer;let p=r.precision;const y={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function E(w){return d.add(w),w===0?"uv":`uv${w}`}function b(w,N,H,V,X,j){const he=V.fog,$=X.geometry,oe=w.isMeshStandardMaterial||w.isMeshLambertMaterial||w.isMeshPhongMaterial?V.environment:null,Q=w.isMeshStandardMaterial||w.isMeshLambertMaterial&&!w.envMap||w.isMeshPhongMaterial&&!w.envMap,q=e.get(w.envMap||oe,Q),Y=q&&q.mapping===Mh?q.image.height:null,Z=y[w.type];w.precision!==null&&(p=r.getMaxPrecision(w.precision),p!==w.precision&&ot("WebGLProgram.getParameters:",w.precision,"not supported, using",p,"instead."));const O=$.morphAttributes.position||$.morphAttributes.normal||$.morphAttributes.color,ne=O!==void 0?O.length:0;let Re=0;$.morphAttributes.position!==void 0&&(Re=1),$.morphAttributes.normal!==void 0&&(Re=2),$.morphAttributes.color!==void 0&&(Re=3);let xe,Ne,B,ge;if(Z){const Xe=hr[Z];xe=Xe.vertexShader,Ne=Xe.fragmentShader}else{xe=w.vertexShader,Ne=w.fragmentShader;const Xe=h.getVertexShaderStage(w),Wt=h.getFragmentShaderStage(w);h.update(w,Xe,Wt),B=Xe.id,ge=Wt.id}const fe=i.getRenderTarget(),re=i.state.buffers.depth.getReversed(),Ie=X.isInstancedMesh===!0,qe=X.isBatchedMesh===!0,jt=!!w.map,ht=!!w.matcap,Ut=!!q,Rt=!!w.aoMap,wt=!!w.lightMap,Zt=!!w.bumpMap&&w.wireframe===!1,un=!!w.normalMap,hn=!!w.displacementMap,sn=!!w.emissiveMap,Bt=!!w.metalnessMap,Jt=!!w.roughnessMap,ee=w.anisotropy>0,Pn=w.clearcoat>0,Lt=w.dispersion>0,F=w.iridescence>0,T=w.sheen>0,se=w.transmission>0,de=ee&&!!w.anisotropyMap,ve=Pn&&!!w.clearcoatMap,Te=Pn&&!!w.clearcoatNormalMap,Ue=Pn&&!!w.clearcoatRoughnessMap,_e=F&&!!w.iridescenceMap,Se=F&&!!w.iridescenceThicknessMap,ke=T&&!!w.sheenColorMap,Ze=T&&!!w.sheenRoughnessMap,Oe=!!w.specularMap,De=!!w.specularColorMap,nt=!!w.specularIntensityMap,rt=se&&!!w.transmissionMap,lt=se&&!!w.thicknessMap,K=!!w.gradientMap,Le=!!w.alphaMap,ye=w.alphaTest>0,Fe=!!w.alphaHash,ze=!!w.extensions;let Me=xr;w.toneMapped&&(fe===null||fe.isXRRenderTarget===!0)&&(Me=i.toneMapping);const Ke={shaderID:Z,shaderType:w.type,shaderName:w.name,vertexShader:xe,fragmentShader:Ne,defines:w.defines,customVertexShaderID:B,customFragmentShaderID:ge,isRawShaderMaterial:w.isRawShaderMaterial===!0,glslVersion:w.glslVersion,precision:p,batching:qe,batchingColor:qe&&X._colorsTexture!==null,instancing:Ie,instancingColor:Ie&&X.instanceColor!==null,instancingMorph:Ie&&X.morphTexture!==null,outputColorSpace:fe===null?i.outputColorSpace:fe.isXRRenderTarget===!0?fe.texture.colorSpace:Tt.workingColorSpace,alphaToCoverage:!!w.alphaToCoverage,map:jt,matcap:ht,envMap:Ut,envMapMode:Ut&&q.mapping,envMapCubeUVHeight:Y,aoMap:Rt,lightMap:wt,bumpMap:Zt,normalMap:un,displacementMap:hn,emissiveMap:sn,normalMapObjectSpace:un&&w.normalMapType===ub,normalMapTangentSpace:un&&w.normalMapType===ch,packedNormalMap:un&&w.normalMapType===ch&&U2(w.normalMap.format),metalnessMap:Bt,roughnessMap:Jt,anisotropy:ee,anisotropyMap:de,clearcoat:Pn,clearcoatMap:ve,clearcoatNormalMap:Te,clearcoatRoughnessMap:Ue,dispersion:Lt,iridescence:F,iridescenceMap:_e,iridescenceThicknessMap:Se,sheen:T,sheenColorMap:ke,sheenRoughnessMap:Ze,specularMap:Oe,specularColorMap:De,specularIntensityMap:nt,transmission:se,transmissionMap:rt,thicknessMap:lt,gradientMap:K,opaque:w.transparent===!1&&w.blending===_o&&w.alphaToCoverage===!1,alphaMap:Le,alphaTest:ye,alphaHash:Fe,combine:w.combine,mapUv:jt&&E(w.map.channel),aoMapUv:Rt&&E(w.aoMap.channel),lightMapUv:wt&&E(w.lightMap.channel),bumpMapUv:Zt&&E(w.bumpMap.channel),normalMapUv:un&&E(w.normalMap.channel),displacementMapUv:hn&&E(w.displacementMap.channel),emissiveMapUv:sn&&E(w.emissiveMap.channel),metalnessMapUv:Bt&&E(w.metalnessMap.channel),roughnessMapUv:Jt&&E(w.roughnessMap.channel),anisotropyMapUv:de&&E(w.anisotropyMap.channel),clearcoatMapUv:ve&&E(w.clearcoatMap.channel),clearcoatNormalMapUv:Te&&E(w.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Ue&&E(w.clearcoatRoughnessMap.channel),iridescenceMapUv:_e&&E(w.iridescenceMap.channel),iridescenceThicknessMapUv:Se&&E(w.iridescenceThicknessMap.channel),sheenColorMapUv:ke&&E(w.sheenColorMap.channel),sheenRoughnessMapUv:Ze&&E(w.sheenRoughnessMap.channel),specularMapUv:Oe&&E(w.specularMap.channel),specularColorMapUv:De&&E(w.specularColorMap.channel),specularIntensityMapUv:nt&&E(w.specularIntensityMap.channel),transmissionMapUv:rt&&E(w.transmissionMap.channel),thicknessMapUv:lt&&E(w.thicknessMap.channel),alphaMapUv:Le&&E(w.alphaMap.channel),vertexTangents:!!$.attributes.tangent&&(un||ee),vertexNormals:!!$.attributes.normal,vertexColors:w.vertexColors,vertexAlphas:w.vertexColors===!0&&!!$.attributes.color&&$.attributes.color.itemSize===4,pointsUvs:X.isPoints===!0&&!!$.attributes.uv&&(jt||Le),fog:!!he,useFog:w.fog===!0,fogExp2:!!he&&he.isFogExp2,flatShading:w.wireframe===!1&&(w.flatShading===!0||$.attributes.normal===void 0&&un===!1&&(w.isMeshLambertMaterial||w.isMeshPhongMaterial||w.isMeshStandardMaterial||w.isMeshPhysicalMaterial)),sizeAttenuation:w.sizeAttenuation===!0,logarithmicDepthBuffer:g,reversedDepthBuffer:re,skinning:X.isSkinnedMesh===!0,hasPositionAttribute:$.attributes.position!==void 0,morphTargets:$.morphAttributes.position!==void 0,morphNormals:$.morphAttributes.normal!==void 0,morphColors:$.morphAttributes.color!==void 0,morphTargetsCount:ne,morphTextureStride:Re,numDirLights:N.directional.length,numPointLights:N.point.length,numSpotLights:N.spot.length,numSpotLightMaps:N.spotLightMap.length,numRectAreaLights:N.rectArea.length,numHemiLights:N.hemi.length,numDirLightShadows:N.directionalShadowMap.length,numPointLightShadows:N.pointShadowMap.length,numSpotLightShadows:N.spotShadowMap.length,numSpotLightShadowsWithMaps:N.numSpotLightShadowsWithMaps,numLightProbes:N.numLightProbes,numLightProbeGrids:j.length,numClippingPlanes:l.numPlanes,numClipIntersection:l.numIntersection,dithering:w.dithering,shadowMapEnabled:i.shadowMap.enabled&&H.length>0,shadowMapType:i.shadowMap.type,toneMapping:Me,decodeVideoTexture:jt&&w.map.isVideoTexture===!0&&Tt.getTransfer(w.map.colorSpace)===Gt,decodeVideoTextureEmissive:sn&&w.emissiveMap.isVideoTexture===!0&&Tt.getTransfer(w.emissiveMap.colorSpace)===Gt,premultipliedAlpha:w.premultipliedAlpha,doubleSided:w.side===Gr,flipSided:w.side===di,useDepthPacking:w.depthPacking>=0,depthPacking:w.depthPacking||0,index0AttributeName:w.index0AttributeName,extensionClipCullDistance:ze&&w.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ze&&w.extensions.multiDraw===!0||qe)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:w.customProgramCacheKey()};return Ke.vertexUv1s=d.has(1),Ke.vertexUv2s=d.has(2),Ke.vertexUv3s=d.has(3),d.clear(),Ke}function M(w){const N=[];if(w.shaderID?N.push(w.shaderID):(N.push(w.customVertexShaderID),N.push(w.customFragmentShaderID)),w.defines!==void 0)for(const H in w.defines)N.push(H),N.push(w.defines[H]);return w.isRawShaderMaterial===!1&&(S(N,w),A(N,w),N.push(i.outputColorSpace)),N.push(w.customProgramCacheKey),N.join()}function S(w,N){w.push(N.precision),w.push(N.outputColorSpace),w.push(N.envMapMode),w.push(N.envMapCubeUVHeight),w.push(N.mapUv),w.push(N.alphaMapUv),w.push(N.lightMapUv),w.push(N.aoMapUv),w.push(N.bumpMapUv),w.push(N.normalMapUv),w.push(N.displacementMapUv),w.push(N.emissiveMapUv),w.push(N.metalnessMapUv),w.push(N.roughnessMapUv),w.push(N.anisotropyMapUv),w.push(N.clearcoatMapUv),w.push(N.clearcoatNormalMapUv),w.push(N.clearcoatRoughnessMapUv),w.push(N.iridescenceMapUv),w.push(N.iridescenceThicknessMapUv),w.push(N.sheenColorMapUv),w.push(N.sheenRoughnessMapUv),w.push(N.specularMapUv),w.push(N.specularColorMapUv),w.push(N.specularIntensityMapUv),w.push(N.transmissionMapUv),w.push(N.thicknessMapUv),w.push(N.combine),w.push(N.fogExp2),w.push(N.sizeAttenuation),w.push(N.morphTargetsCount),w.push(N.morphAttributeCount),w.push(N.numDirLights),w.push(N.numPointLights),w.push(N.numSpotLights),w.push(N.numSpotLightMaps),w.push(N.numHemiLights),w.push(N.numRectAreaLights),w.push(N.numDirLightShadows),w.push(N.numPointLightShadows),w.push(N.numSpotLightShadows),w.push(N.numSpotLightShadowsWithMaps),w.push(N.numLightProbes),w.push(N.shadowMapType),w.push(N.toneMapping),w.push(N.numClippingPlanes),w.push(N.numClipIntersection),w.push(N.depthPacking)}function A(w,N){c.disableAll(),N.instancing&&c.enable(0),N.instancingColor&&c.enable(1),N.instancingMorph&&c.enable(2),N.matcap&&c.enable(3),N.envMap&&c.enable(4),N.normalMapObjectSpace&&c.enable(5),N.normalMapTangentSpace&&c.enable(6),N.clearcoat&&c.enable(7),N.iridescence&&c.enable(8),N.alphaTest&&c.enable(9),N.vertexColors&&c.enable(10),N.vertexAlphas&&c.enable(11),N.vertexUv1s&&c.enable(12),N.vertexUv2s&&c.enable(13),N.vertexUv3s&&c.enable(14),N.vertexTangents&&c.enable(15),N.anisotropy&&c.enable(16),N.alphaHash&&c.enable(17),N.batching&&c.enable(18),N.dispersion&&c.enable(19),N.batchingColor&&c.enable(20),N.gradientMap&&c.enable(21),N.packedNormalMap&&c.enable(22),N.vertexNormals&&c.enable(23),w.push(c.mask),c.disableAll(),N.fog&&c.enable(0),N.useFog&&c.enable(1),N.flatShading&&c.enable(2),N.logarithmicDepthBuffer&&c.enable(3),N.reversedDepthBuffer&&c.enable(4),N.skinning&&c.enable(5),N.morphTargets&&c.enable(6),N.morphNormals&&c.enable(7),N.morphColors&&c.enable(8),N.premultipliedAlpha&&c.enable(9),N.shadowMapEnabled&&c.enable(10),N.doubleSided&&c.enable(11),N.flipSided&&c.enable(12),N.useDepthPacking&&c.enable(13),N.dithering&&c.enable(14),N.transmission&&c.enable(15),N.sheen&&c.enable(16),N.opaque&&c.enable(17),N.pointsUvs&&c.enable(18),N.decodeVideoTexture&&c.enable(19),N.decodeVideoTextureEmissive&&c.enable(20),N.alphaToCoverage&&c.enable(21),N.numLightProbeGrids>0&&c.enable(22),N.hasPositionAttribute&&c.enable(23),w.push(c.mask)}function D(w){const N=y[w.type];let H;if(N){const V=hr[N];H=Kb.clone(V.uniforms)}else H=w.uniforms;return H}function C(w,N){let H=v.get(N);return H!==void 0?++H.usedTimes:(H=new N2(i,N,w,a),f.push(H),v.set(N,H)),H}function I(w){if(--w.usedTimes===0){const N=f.indexOf(w);f[N]=f[f.length-1],f.pop(),v.delete(w.cacheKey),w.destroy()}}function L(w){h.remove(w)}function U(){h.dispose()}return{getParameters:b,getProgramCacheKey:M,getUniforms:D,acquireProgram:C,releaseProgram:I,releaseShaderCache:L,programs:f,dispose:U}}function k2(){let i=new WeakMap;function e(c){return i.has(c)}function t(c){let h=i.get(c);return h===void 0&&(h={},i.set(c,h)),h}function r(c){i.delete(c)}function a(c,h,d){i.get(c)[h]=d}function l(){i=new WeakMap}return{has:e,get:t,remove:r,update:a,dispose:l}}function O2(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function qv(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function Kv(){const i=[];let e=0;const t=[],r=[],a=[];function l(){e=0,t.length=0,r.length=0,a.length=0}function c(p){let y=0;return p.isInstancedMesh&&(y+=2),p.isSkinnedMesh&&(y+=1),y}function h(p,y,E,b,M,S){let A=i[e];return A===void 0?(A={id:p.id,object:p,geometry:y,material:E,materialVariant:c(p),groupOrder:b,renderOrder:p.renderOrder,z:M,group:S},i[e]=A):(A.id=p.id,A.object=p,A.geometry=y,A.material=E,A.materialVariant=c(p),A.groupOrder=b,A.renderOrder=p.renderOrder,A.z=M,A.group=S),e++,A}function d(p,y,E,b,M,S){const A=h(p,y,E,b,M,S);E.transmission>0?r.push(A):E.transparent===!0?a.push(A):t.push(A)}function f(p,y,E,b,M,S){const A=h(p,y,E,b,M,S);E.transmission>0?r.unshift(A):E.transparent===!0?a.unshift(A):t.unshift(A)}function v(p,y,E){t.length>1&&t.sort(p||O2),r.length>1&&r.sort(y||qv),a.length>1&&a.sort(y||qv),E&&(t.reverse(),r.reverse(),a.reverse())}function g(){for(let p=e,y=i.length;p<y;p++){const E=i[p];if(E.id===null)break;E.id=null,E.object=null,E.geometry=null,E.material=null,E.group=null}}return{opaque:t,transmissive:r,transparent:a,init:l,push:d,unshift:f,finish:g,sort:v}}function z2(){let i=new WeakMap;function e(r,a){const l=i.get(r);let c;return l===void 0?(c=new Kv,i.set(r,[c])):a>=l.length?(c=new Kv,l.push(c)):c=l[a],c}function t(){i=new WeakMap}return{get:e,dispose:t}}function B2(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new ie,color:new _t};break;case"SpotLight":t={position:new ie,direction:new ie,color:new _t,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new ie,color:new _t,distance:0,decay:0};break;case"HemisphereLight":t={direction:new ie,skyColor:new _t,groundColor:new _t};break;case"RectAreaLight":t={color:new _t,position:new ie,halfWidth:new ie,halfHeight:new ie};break}return i[e.id]=t,t}}}function V2(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ut};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ut};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ut,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let H2=0;function G2(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function j2(i){const e=new B2,t=V2(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let f=0;f<9;f++)r.probe.push(new ie);const a=new ie,l=new rn,c=new rn;function h(f){let v=0,g=0,p=0;for(let N=0;N<9;N++)r.probe[N].set(0,0,0);let y=0,E=0,b=0,M=0,S=0,A=0,D=0,C=0,I=0,L=0,U=0;f.sort(G2);for(let N=0,H=f.length;N<H;N++){const V=f[N],X=V.color,j=V.intensity,he=V.distance;let $=null;if(V.shadow&&V.shadow.map&&(V.shadow.map.texture.format===Ra?$=V.shadow.map.texture:$=V.shadow.map.depthTexture||V.shadow.map.texture),V.isAmbientLight)v+=X.r*j,g+=X.g*j,p+=X.b*j;else if(V.isLightProbe){for(let oe=0;oe<9;oe++)r.probe[oe].addScaledVector(V.sh.coefficients[oe],j);U++}else if(V.isDirectionalLight){const oe=e.get(V);if(oe.color.copy(V.color).multiplyScalar(V.intensity),V.castShadow){const Q=V.shadow,q=t.get(V);q.shadowIntensity=Q.intensity,q.shadowBias=Q.bias,q.shadowNormalBias=Q.normalBias,q.shadowRadius=Q.radius,q.shadowMapSize=Q.mapSize,r.directionalShadow[y]=q,r.directionalShadowMap[y]=$,r.directionalShadowMatrix[y]=V.shadow.matrix,A++}r.directional[y]=oe,y++}else if(V.isSpotLight){const oe=e.get(V);oe.position.setFromMatrixPosition(V.matrixWorld),oe.color.copy(X).multiplyScalar(j),oe.distance=he,oe.coneCos=Math.cos(V.angle),oe.penumbraCos=Math.cos(V.angle*(1-V.penumbra)),oe.decay=V.decay,r.spot[b]=oe;const Q=V.shadow;if(V.map&&(r.spotLightMap[I]=V.map,I++,Q.updateMatrices(V),V.castShadow&&L++),r.spotLightMatrix[b]=Q.matrix,V.castShadow){const q=t.get(V);q.shadowIntensity=Q.intensity,q.shadowBias=Q.bias,q.shadowNormalBias=Q.normalBias,q.shadowRadius=Q.radius,q.shadowMapSize=Q.mapSize,r.spotShadow[b]=q,r.spotShadowMap[b]=$,C++}b++}else if(V.isRectAreaLight){const oe=e.get(V);oe.color.copy(X).multiplyScalar(j),oe.halfWidth.set(V.width*.5,0,0),oe.halfHeight.set(0,V.height*.5,0),r.rectArea[M]=oe,M++}else if(V.isPointLight){const oe=e.get(V);if(oe.color.copy(V.color).multiplyScalar(V.intensity),oe.distance=V.distance,oe.decay=V.decay,V.castShadow){const Q=V.shadow,q=t.get(V);q.shadowIntensity=Q.intensity,q.shadowBias=Q.bias,q.shadowNormalBias=Q.normalBias,q.shadowRadius=Q.radius,q.shadowMapSize=Q.mapSize,q.shadowCameraNear=Q.camera.near,q.shadowCameraFar=Q.camera.far,r.pointShadow[E]=q,r.pointShadowMap[E]=$,r.pointShadowMatrix[E]=V.shadow.matrix,D++}r.point[E]=oe,E++}else if(V.isHemisphereLight){const oe=e.get(V);oe.skyColor.copy(V.color).multiplyScalar(j),oe.groundColor.copy(V.groundColor).multiplyScalar(j),r.hemi[S]=oe,S++}}M>0&&(i.has("OES_texture_float_linear")===!0?(r.rectAreaLTC1=Be.LTC_FLOAT_1,r.rectAreaLTC2=Be.LTC_FLOAT_2):(r.rectAreaLTC1=Be.LTC_HALF_1,r.rectAreaLTC2=Be.LTC_HALF_2)),r.ambient[0]=v,r.ambient[1]=g,r.ambient[2]=p;const w=r.hash;(w.directionalLength!==y||w.pointLength!==E||w.spotLength!==b||w.rectAreaLength!==M||w.hemiLength!==S||w.numDirectionalShadows!==A||w.numPointShadows!==D||w.numSpotShadows!==C||w.numSpotMaps!==I||w.numLightProbes!==U)&&(r.directional.length=y,r.spot.length=b,r.rectArea.length=M,r.point.length=E,r.hemi.length=S,r.directionalShadow.length=A,r.directionalShadowMap.length=A,r.pointShadow.length=D,r.pointShadowMap.length=D,r.spotShadow.length=C,r.spotShadowMap.length=C,r.directionalShadowMatrix.length=A,r.pointShadowMatrix.length=D,r.spotLightMatrix.length=C+I-L,r.spotLightMap.length=I,r.numSpotLightShadowsWithMaps=L,r.numLightProbes=U,w.directionalLength=y,w.pointLength=E,w.spotLength=b,w.rectAreaLength=M,w.hemiLength=S,w.numDirectionalShadows=A,w.numPointShadows=D,w.numSpotShadows=C,w.numSpotMaps=I,w.numLightProbes=U,r.version=H2++)}function d(f,v){let g=0,p=0,y=0,E=0,b=0;const M=v.matrixWorldInverse;for(let S=0,A=f.length;S<A;S++){const D=f[S];if(D.isDirectionalLight){const C=r.directional[g];C.direction.setFromMatrixPosition(D.matrixWorld),a.setFromMatrixPosition(D.target.matrixWorld),C.direction.sub(a),C.direction.transformDirection(M),g++}else if(D.isSpotLight){const C=r.spot[y];C.position.setFromMatrixPosition(D.matrixWorld),C.position.applyMatrix4(M),C.direction.setFromMatrixPosition(D.matrixWorld),a.setFromMatrixPosition(D.target.matrixWorld),C.direction.sub(a),C.direction.transformDirection(M),y++}else if(D.isRectAreaLight){const C=r.rectArea[E];C.position.setFromMatrixPosition(D.matrixWorld),C.position.applyMatrix4(M),c.identity(),l.copy(D.matrixWorld),l.premultiply(M),c.extractRotation(l),C.halfWidth.set(D.width*.5,0,0),C.halfHeight.set(0,D.height*.5,0),C.halfWidth.applyMatrix4(c),C.halfHeight.applyMatrix4(c),E++}else if(D.isPointLight){const C=r.point[p];C.position.setFromMatrixPosition(D.matrixWorld),C.position.applyMatrix4(M),p++}else if(D.isHemisphereLight){const C=r.hemi[b];C.direction.setFromMatrixPosition(D.matrixWorld),C.direction.transformDirection(M),b++}}}return{setup:h,setupView:d,state:r}}function Yv(i){const e=new j2(i),t=[],r=[],a=[];function l(p){g.camera=p,t.length=0,r.length=0,a.length=0}function c(p){t.push(p)}function h(p){r.push(p)}function d(p){a.push(p)}function f(){e.setup(t)}function v(p){e.setupView(t,p)}const g={lightsArray:t,shadowsArray:r,lightProbeGridArray:a,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:l,state:g,setupLights:f,setupLightsView:v,pushLight:c,pushShadow:h,pushLightProbeGrid:d}}function W2(i){let e=new WeakMap;function t(a,l=0){const c=e.get(a);let h;return c===void 0?(h=new Yv(i),e.set(a,[h])):l>=c.length?(h=new Yv(i),c.push(h)):h=c[l],h}function r(){e=new WeakMap}return{get:t,dispose:r}}const X2=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,$2=`uniform sampler2D shadow_pass;
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
}`,q2=[new ie(1,0,0),new ie(-1,0,0),new ie(0,1,0),new ie(0,-1,0),new ie(0,0,1),new ie(0,0,-1)],K2=[new ie(0,-1,0),new ie(0,-1,0),new ie(0,0,1),new ie(0,0,-1),new ie(0,-1,0),new ie(0,-1,0)],Qv=new rn,Ul=new ie,Qf=new ie;function Y2(i,e,t){let r=new zm;const a=new ut,l=new ut,c=new cn,h=new eT,d=new tT,f={},v=t.maxTextureSize,g={[Bs]:di,[di]:Bs,[Gr]:Gr},p=new Mr({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ut},radius:{value:4}},vertexShader:X2,fragmentShader:$2}),y=p.clone();y.defines.HORIZONTAL_PASS=1;const E=new Mi;E.setAttribute("position",new _r(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const b=new Qi(E,p),M=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=$u;let S=this.type;this.render=function(L,U,w){if(M.enabled===!1||M.autoUpdate===!1&&M.needsUpdate===!1||L.length===0)return;this.type===Vw&&(ot("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=$u);const N=i.getRenderTarget(),H=i.getActiveCubeFace(),V=i.getActiveMipmapLevel(),X=i.state;X.setBlending(Xr),X.buffers.depth.getReversed()===!0?X.buffers.color.setClear(0,0,0,0):X.buffers.color.setClear(1,1,1,1),X.buffers.depth.setTest(!0),X.setScissorTest(!1);const j=S!==this.type;j&&U.traverse(function(he){he.material&&(Array.isArray(he.material)?he.material.forEach($=>$.needsUpdate=!0):he.material.needsUpdate=!0)});for(let he=0,$=L.length;he<$;he++){const oe=L[he],Q=oe.shadow;if(Q===void 0){ot("WebGLShadowMap:",oe,"has no shadow.");continue}if(Q.autoUpdate===!1&&Q.needsUpdate===!1)continue;a.copy(Q.mapSize);const q=Q.getFrameExtents();a.multiply(q),l.copy(Q.mapSize),(a.x>v||a.y>v)&&(a.x>v&&(l.x=Math.floor(v/q.x),a.x=l.x*q.x,Q.mapSize.x=l.x),a.y>v&&(l.y=Math.floor(v/q.y),a.y=l.y*q.y,Q.mapSize.y=l.y));const Y=i.state.buffers.depth.getReversed();if(Q.camera._reversedDepth=Y,Q.map===null||j===!0){if(Q.map!==null&&(Q.map.depthTexture!==null&&(Q.map.depthTexture.dispose(),Q.map.depthTexture=null),Q.map.dispose()),this.type===kl){if(oe.isPointLight){ot("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}Q.map=new vr(a.x,a.y,{format:Ra,type:Yr,minFilter:jn,magFilter:jn,generateMipmaps:!1}),Q.map.texture.name=oe.name+".shadowMap",Q.map.depthTexture=new ko(a.x,a.y,pr),Q.map.depthTexture.name=oe.name+".shadowMapDepth",Q.map.depthTexture.format=Qr,Q.map.depthTexture.compareFunction=null,Q.map.depthTexture.minFilter=Un,Q.map.depthTexture.magFilter=Un}else oe.isPointLight?(Q.map=new ky(a.x),Q.map.depthTexture=new $b(a.x,yr)):(Q.map=new vr(a.x,a.y),Q.map.depthTexture=new ko(a.x,a.y,yr)),Q.map.depthTexture.name=oe.name+".shadowMap",Q.map.depthTexture.format=Qr,this.type===$u?(Q.map.depthTexture.compareFunction=Y?km:Fm,Q.map.depthTexture.minFilter=jn,Q.map.depthTexture.magFilter=jn):(Q.map.depthTexture.compareFunction=null,Q.map.depthTexture.minFilter=Un,Q.map.depthTexture.magFilter=Un);Q.camera.updateProjectionMatrix()}const Z=Q.map.isWebGLCubeRenderTarget?6:1;for(let O=0;O<Z;O++){if(Q.map.isWebGLCubeRenderTarget)i.setRenderTarget(Q.map,O),i.clear();else{O===0&&(i.setRenderTarget(Q.map),i.clear());const ne=Q.getViewport(O);c.set(l.x*ne.x,l.y*ne.y,l.x*ne.z,l.y*ne.w),X.viewport(c)}if(oe.isPointLight){const ne=Q.camera,Re=Q.matrix,xe=oe.distance||ne.far;xe!==ne.far&&(ne.far=xe,ne.updateProjectionMatrix()),Ul.setFromMatrixPosition(oe.matrixWorld),ne.position.copy(Ul),Qf.copy(ne.position),Qf.add(q2[O]),ne.up.copy(K2[O]),ne.lookAt(Qf),ne.updateMatrixWorld(),Re.makeTranslation(-Ul.x,-Ul.y,-Ul.z),Qv.multiplyMatrices(ne.projectionMatrix,ne.matrixWorldInverse),Q._frustum.setFromProjectionMatrix(Qv,ne.coordinateSystem,ne.reversedDepth)}else Q.updateMatrices(oe);r=Q.getFrustum(),C(U,w,Q.camera,oe,this.type)}Q.isPointLightShadow!==!0&&this.type===kl&&A(Q,w),Q.needsUpdate=!1}S=this.type,M.needsUpdate=!1,i.setRenderTarget(N,H,V)};function A(L,U){const w=e.update(b);p.defines.VSM_SAMPLES!==L.blurSamples&&(p.defines.VSM_SAMPLES=L.blurSamples,y.defines.VSM_SAMPLES=L.blurSamples,p.needsUpdate=!0,y.needsUpdate=!0),L.mapPass===null&&(L.mapPass=new vr(a.x,a.y,{format:Ra,type:Yr})),p.uniforms.shadow_pass.value=L.map.depthTexture,p.uniforms.resolution.value=L.mapSize,p.uniforms.radius.value=L.radius,i.setRenderTarget(L.mapPass),i.clear(),i.renderBufferDirect(U,null,w,p,b,null),y.uniforms.shadow_pass.value=L.mapPass.texture,y.uniforms.resolution.value=L.mapSize,y.uniforms.radius.value=L.radius,i.setRenderTarget(L.map),i.clear(),i.renderBufferDirect(U,null,w,y,b,null)}function D(L,U,w,N){let H=null;const V=w.isPointLight===!0?L.customDistanceMaterial:L.customDepthMaterial;if(V!==void 0)H=V;else if(H=w.isPointLight===!0?d:h,i.localClippingEnabled&&U.clipShadows===!0&&Array.isArray(U.clippingPlanes)&&U.clippingPlanes.length!==0||U.displacementMap&&U.displacementScale!==0||U.alphaMap&&U.alphaTest>0||U.map&&U.alphaTest>0||U.alphaToCoverage===!0){const X=H.uuid,j=U.uuid;let he=f[X];he===void 0&&(he={},f[X]=he);let $=he[j];$===void 0&&($=H.clone(),he[j]=$,U.addEventListener("dispose",I)),H=$}if(H.visible=U.visible,H.wireframe=U.wireframe,N===kl?H.side=U.shadowSide!==null?U.shadowSide:U.side:H.side=U.shadowSide!==null?U.shadowSide:g[U.side],H.alphaMap=U.alphaMap,H.alphaTest=U.alphaToCoverage===!0?.5:U.alphaTest,H.map=U.map,H.clipShadows=U.clipShadows,H.clippingPlanes=U.clippingPlanes,H.clipIntersection=U.clipIntersection,H.displacementMap=U.displacementMap,H.displacementScale=U.displacementScale,H.displacementBias=U.displacementBias,H.wireframeLinewidth=U.wireframeLinewidth,H.linewidth=U.linewidth,w.isPointLight===!0&&H.isMeshDistanceMaterial===!0){const X=i.properties.get(H);X.light=w}return H}function C(L,U,w,N,H){if(L.visible===!1)return;if(L.layers.test(U.layers)&&(L.isMesh||L.isLine||L.isPoints)&&(L.castShadow||L.receiveShadow&&H===kl)&&(!L.frustumCulled||r.intersectsObject(L))){L.modelViewMatrix.multiplyMatrices(w.matrixWorldInverse,L.matrixWorld);const j=e.update(L),he=L.material;if(Array.isArray(he)){const $=j.groups;for(let oe=0,Q=$.length;oe<Q;oe++){const q=$[oe],Y=he[q.materialIndex];if(Y&&Y.visible){const Z=D(L,Y,N,H);L.onBeforeShadow(i,L,U,w,j,Z,q),i.renderBufferDirect(w,null,j,Z,L,q),L.onAfterShadow(i,L,U,w,j,Z,q)}}}else if(he.visible){const $=D(L,he,N,H);L.onBeforeShadow(i,L,U,w,j,$,null),i.renderBufferDirect(w,null,j,$,L,null),L.onAfterShadow(i,L,U,w,j,$,null)}}const X=L.children;for(let j=0,he=X.length;j<he;j++)C(X[j],U,w,N,H)}function I(L){L.target.removeEventListener("dispose",I);for(const w in f){const N=f[w],H=L.target.uuid;H in N&&(N[H].dispose(),delete N[H])}}}function Q2(i,e){function t(){let K=!1;const Le=new cn;let ye=null;const Fe=new cn(0,0,0,0);return{setMask:function(ze){ye!==ze&&!K&&(i.colorMask(ze,ze,ze,ze),ye=ze)},setLocked:function(ze){K=ze},setClear:function(ze,Me,Ke,Xe,Wt){Wt===!0&&(ze*=Xe,Me*=Xe,Ke*=Xe),Le.set(ze,Me,Ke,Xe),Fe.equals(Le)===!1&&(i.clearColor(ze,Me,Ke,Xe),Fe.copy(Le))},reset:function(){K=!1,ye=null,Fe.set(-1,0,0,0)}}}function r(){let K=!1,Le=!1,ye=null,Fe=null,ze=null;return{setReversed:function(Me){if(Le!==Me){const Ke=e.get("EXT_clip_control");Me?Ke.clipControlEXT(Ke.LOWER_LEFT_EXT,Ke.ZERO_TO_ONE_EXT):Ke.clipControlEXT(Ke.LOWER_LEFT_EXT,Ke.NEGATIVE_ONE_TO_ONE_EXT),Le=Me;const Xe=ze;ze=null,this.setClear(Xe)}},getReversed:function(){return Le},setTest:function(Me){Me?fe(i.DEPTH_TEST):re(i.DEPTH_TEST)},setMask:function(Me){ye!==Me&&!K&&(i.depthMask(Me),ye=Me)},setFunc:function(Me){if(Le&&(Me=yb[Me]),Fe!==Me){switch(Me){case Ep:i.depthFunc(i.NEVER);break;case wp:i.depthFunc(i.ALWAYS);break;case bp:i.depthFunc(i.LESS);break;case Uo:i.depthFunc(i.LEQUAL);break;case Tp:i.depthFunc(i.EQUAL);break;case Cp:i.depthFunc(i.GEQUAL);break;case Rp:i.depthFunc(i.GREATER);break;case Ap:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}Fe=Me}},setLocked:function(Me){K=Me},setClear:function(Me){ze!==Me&&(ze=Me,Le&&(Me=1-Me),i.clearDepth(Me))},reset:function(){K=!1,ye=null,Fe=null,ze=null,Le=!1}}}function a(){let K=!1,Le=null,ye=null,Fe=null,ze=null,Me=null,Ke=null,Xe=null,Wt=null;return{setTest:function(kt){K||(kt?fe(i.STENCIL_TEST):re(i.STENCIL_TEST))},setMask:function(kt){Le!==kt&&!K&&(i.stencilMask(kt),Le=kt)},setFunc:function(kt,Fn,wi){(ye!==kt||Fe!==Fn||ze!==wi)&&(i.stencilFunc(kt,Fn,wi),ye=kt,Fe=Fn,ze=wi)},setOp:function(kt,Fn,wi){(Me!==kt||Ke!==Fn||Xe!==wi)&&(i.stencilOp(kt,Fn,wi),Me=kt,Ke=Fn,Xe=wi)},setLocked:function(kt){K=kt},setClear:function(kt){Wt!==kt&&(i.clearStencil(kt),Wt=kt)},reset:function(){K=!1,Le=null,ye=null,Fe=null,ze=null,Me=null,Ke=null,Xe=null,Wt=null}}}const l=new t,c=new r,h=new a,d=new WeakMap,f=new WeakMap;let v={},g={},p={},y=new WeakMap,E=[],b=null,M=!1,S=null,A=null,D=null,C=null,I=null,L=null,U=null,w=new _t(0,0,0),N=0,H=!1,V=null,X=null,j=null,he=null,$=null;const oe=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let Q=!1,q=0;const Y=i.getParameter(i.VERSION);Y.indexOf("WebGL")!==-1?(q=parseFloat(/^WebGL (\d)/.exec(Y)[1]),Q=q>=1):Y.indexOf("OpenGL ES")!==-1&&(q=parseFloat(/^OpenGL ES (\d)/.exec(Y)[1]),Q=q>=2);let Z=null,O={};const ne=i.getParameter(i.SCISSOR_BOX),Re=i.getParameter(i.VIEWPORT),xe=new cn().fromArray(ne),Ne=new cn().fromArray(Re);function B(K,Le,ye,Fe){const ze=new Uint8Array(4),Me=i.createTexture();i.bindTexture(K,Me),i.texParameteri(K,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(K,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Ke=0;Ke<ye;Ke++)K===i.TEXTURE_3D||K===i.TEXTURE_2D_ARRAY?i.texImage3D(Le,0,i.RGBA,1,1,Fe,0,i.RGBA,i.UNSIGNED_BYTE,ze):i.texImage2D(Le+Ke,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,ze);return Me}const ge={};ge[i.TEXTURE_2D]=B(i.TEXTURE_2D,i.TEXTURE_2D,1),ge[i.TEXTURE_CUBE_MAP]=B(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),ge[i.TEXTURE_2D_ARRAY]=B(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),ge[i.TEXTURE_3D]=B(i.TEXTURE_3D,i.TEXTURE_3D,1,1),l.setClear(0,0,0,1),c.setClear(1),h.setClear(0),fe(i.DEPTH_TEST),c.setFunc(Uo),Zt(!1),un(Gx),fe(i.CULL_FACE),Rt(Xr);function fe(K){v[K]!==!0&&(i.enable(K),v[K]=!0)}function re(K){v[K]!==!1&&(i.disable(K),v[K]=!1)}function Ie(K,Le){return p[K]!==Le?(i.bindFramebuffer(K,Le),p[K]=Le,K===i.DRAW_FRAMEBUFFER&&(p[i.FRAMEBUFFER]=Le),K===i.FRAMEBUFFER&&(p[i.DRAW_FRAMEBUFFER]=Le),!0):!1}function qe(K,Le){let ye=E,Fe=!1;if(K){ye=y.get(Le),ye===void 0&&(ye=[],y.set(Le,ye));const ze=K.textures;if(ye.length!==ze.length||ye[0]!==i.COLOR_ATTACHMENT0){for(let Me=0,Ke=ze.length;Me<Ke;Me++)ye[Me]=i.COLOR_ATTACHMENT0+Me;ye.length=ze.length,Fe=!0}}else ye[0]!==i.BACK&&(ye[0]=i.BACK,Fe=!0);Fe&&i.drawBuffers(ye)}function jt(K){return b!==K?(i.useProgram(K),b=K,!0):!1}const ht={[da]:i.FUNC_ADD,[Gw]:i.FUNC_SUBTRACT,[jw]:i.FUNC_REVERSE_SUBTRACT};ht[Ww]=i.MIN,ht[Xw]=i.MAX;const Ut={[$w]:i.ZERO,[qw]:i.ONE,[Kw]:i.SRC_COLOR,[Sp]:i.SRC_ALPHA,[tb]:i.SRC_ALPHA_SATURATE,[Jw]:i.DST_COLOR,[Qw]:i.DST_ALPHA,[Yw]:i.ONE_MINUS_SRC_COLOR,[Mp]:i.ONE_MINUS_SRC_ALPHA,[eb]:i.ONE_MINUS_DST_COLOR,[Zw]:i.ONE_MINUS_DST_ALPHA,[nb]:i.CONSTANT_COLOR,[ib]:i.ONE_MINUS_CONSTANT_COLOR,[rb]:i.CONSTANT_ALPHA,[sb]:i.ONE_MINUS_CONSTANT_ALPHA};function Rt(K,Le,ye,Fe,ze,Me,Ke,Xe,Wt,kt){if(K===Xr){M===!0&&(re(i.BLEND),M=!1);return}if(M===!1&&(fe(i.BLEND),M=!0),K!==Hw){if(K!==S||kt!==H){if((A!==da||I!==da)&&(i.blendEquation(i.FUNC_ADD),A=da,I=da),kt)switch(K){case _o:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case jx:i.blendFunc(i.ONE,i.ONE);break;case Wx:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Xx:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Nt("WebGLState: Invalid blending: ",K);break}else switch(K){case _o:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case jx:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case Wx:Nt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Xx:Nt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Nt("WebGLState: Invalid blending: ",K);break}D=null,C=null,L=null,U=null,w.set(0,0,0),N=0,S=K,H=kt}return}ze=ze||Le,Me=Me||ye,Ke=Ke||Fe,(Le!==A||ze!==I)&&(i.blendEquationSeparate(ht[Le],ht[ze]),A=Le,I=ze),(ye!==D||Fe!==C||Me!==L||Ke!==U)&&(i.blendFuncSeparate(Ut[ye],Ut[Fe],Ut[Me],Ut[Ke]),D=ye,C=Fe,L=Me,U=Ke),(Xe.equals(w)===!1||Wt!==N)&&(i.blendColor(Xe.r,Xe.g,Xe.b,Wt),w.copy(Xe),N=Wt),S=K,H=!1}function wt(K,Le){K.side===Gr?re(i.CULL_FACE):fe(i.CULL_FACE);let ye=K.side===di;Le&&(ye=!ye),Zt(ye),K.blending===_o&&K.transparent===!1?Rt(Xr):Rt(K.blending,K.blendEquation,K.blendSrc,K.blendDst,K.blendEquationAlpha,K.blendSrcAlpha,K.blendDstAlpha,K.blendColor,K.blendAlpha,K.premultipliedAlpha),c.setFunc(K.depthFunc),c.setTest(K.depthTest),c.setMask(K.depthWrite),l.setMask(K.colorWrite);const Fe=K.stencilWrite;h.setTest(Fe),Fe&&(h.setMask(K.stencilWriteMask),h.setFunc(K.stencilFunc,K.stencilRef,K.stencilFuncMask),h.setOp(K.stencilFail,K.stencilZFail,K.stencilZPass)),sn(K.polygonOffset,K.polygonOffsetFactor,K.polygonOffsetUnits),K.alphaToCoverage===!0?fe(i.SAMPLE_ALPHA_TO_COVERAGE):re(i.SAMPLE_ALPHA_TO_COVERAGE)}function Zt(K){V!==K&&(K?i.frontFace(i.CW):i.frontFace(i.CCW),V=K)}function un(K){K!==zw?(fe(i.CULL_FACE),K!==X&&(K===Gx?i.cullFace(i.BACK):K===Bw?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):re(i.CULL_FACE),X=K}function hn(K){K!==j&&(Q&&i.lineWidth(K),j=K)}function sn(K,Le,ye){K?(fe(i.POLYGON_OFFSET_FILL),(he!==Le||$!==ye)&&(he=Le,$=ye,c.getReversed()&&(Le=-Le),i.polygonOffset(Le,ye))):re(i.POLYGON_OFFSET_FILL)}function Bt(K){K?fe(i.SCISSOR_TEST):re(i.SCISSOR_TEST)}function Jt(K){K===void 0&&(K=i.TEXTURE0+oe-1),Z!==K&&(i.activeTexture(K),Z=K)}function ee(K,Le,ye){ye===void 0&&(Z===null?ye=i.TEXTURE0+oe-1:ye=Z);let Fe=O[ye];Fe===void 0&&(Fe={type:void 0,texture:void 0},O[ye]=Fe),(Fe.type!==K||Fe.texture!==Le)&&(Z!==ye&&(i.activeTexture(ye),Z=ye),i.bindTexture(K,Le||ge[K]),Fe.type=K,Fe.texture=Le)}function Pn(){const K=O[Z];K!==void 0&&K.type!==void 0&&(i.bindTexture(K.type,null),K.type=void 0,K.texture=void 0)}function Lt(){try{i.compressedTexImage2D(...arguments)}catch(K){Nt("WebGLState:",K)}}function F(){try{i.compressedTexImage3D(...arguments)}catch(K){Nt("WebGLState:",K)}}function T(){try{i.texSubImage2D(...arguments)}catch(K){Nt("WebGLState:",K)}}function se(){try{i.texSubImage3D(...arguments)}catch(K){Nt("WebGLState:",K)}}function de(){try{i.compressedTexSubImage2D(...arguments)}catch(K){Nt("WebGLState:",K)}}function ve(){try{i.compressedTexSubImage3D(...arguments)}catch(K){Nt("WebGLState:",K)}}function Te(){try{i.texStorage2D(...arguments)}catch(K){Nt("WebGLState:",K)}}function Ue(){try{i.texStorage3D(...arguments)}catch(K){Nt("WebGLState:",K)}}function _e(){try{i.texImage2D(...arguments)}catch(K){Nt("WebGLState:",K)}}function Se(){try{i.texImage3D(...arguments)}catch(K){Nt("WebGLState:",K)}}function ke(K){return g[K]!==void 0?g[K]:i.getParameter(K)}function Ze(K,Le){g[K]!==Le&&(i.pixelStorei(K,Le),g[K]=Le)}function Oe(K){xe.equals(K)===!1&&(i.scissor(K.x,K.y,K.z,K.w),xe.copy(K))}function De(K){Ne.equals(K)===!1&&(i.viewport(K.x,K.y,K.z,K.w),Ne.copy(K))}function nt(K,Le){let ye=f.get(Le);ye===void 0&&(ye=new WeakMap,f.set(Le,ye));let Fe=ye.get(K);Fe===void 0&&(Fe=i.getUniformBlockIndex(Le,K.name),ye.set(K,Fe))}function rt(K,Le){const Fe=f.get(Le).get(K);d.get(Le)!==Fe&&(i.uniformBlockBinding(Le,Fe,K.__bindingPointIndex),d.set(Le,Fe))}function lt(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),c.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),v={},g={},Z=null,O={},p={},y=new WeakMap,E=[],b=null,M=!1,S=null,A=null,D=null,C=null,I=null,L=null,U=null,w=new _t(0,0,0),N=0,H=!1,V=null,X=null,j=null,he=null,$=null,xe.set(0,0,i.canvas.width,i.canvas.height),Ne.set(0,0,i.canvas.width,i.canvas.height),l.reset(),c.reset(),h.reset()}return{buffers:{color:l,depth:c,stencil:h},enable:fe,disable:re,bindFramebuffer:Ie,drawBuffers:qe,useProgram:jt,setBlending:Rt,setMaterial:wt,setFlipSided:Zt,setCullFace:un,setLineWidth:hn,setPolygonOffset:sn,setScissorTest:Bt,activeTexture:Jt,bindTexture:ee,unbindTexture:Pn,compressedTexImage2D:Lt,compressedTexImage3D:F,texImage2D:_e,texImage3D:Se,pixelStorei:Ze,getParameter:ke,updateUBOMapping:nt,uniformBlockBinding:rt,texStorage2D:Te,texStorage3D:Ue,texSubImage2D:T,texSubImage3D:se,compressedTexSubImage2D:de,compressedTexSubImage3D:ve,scissor:Oe,viewport:De,reset:lt}}function Z2(i,e,t,r,a,l,c){const h=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,d=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),f=new ut,v=new WeakMap,g=new Set;let p;const y=new WeakMap;let E=!1;try{E=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function b(F,T){return E?new OffscreenCanvas(F,T):Kl("canvas")}function M(F,T,se){let de=1;const ve=Lt(F);if((ve.width>se||ve.height>se)&&(de=se/Math.max(ve.width,ve.height)),de<1)if(typeof HTMLImageElement<"u"&&F instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&F instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&F instanceof ImageBitmap||typeof VideoFrame<"u"&&F instanceof VideoFrame){const Te=Math.floor(de*ve.width),Ue=Math.floor(de*ve.height);p===void 0&&(p=b(Te,Ue));const _e=T?b(Te,Ue):p;return _e.width=Te,_e.height=Ue,_e.getContext("2d").drawImage(F,0,0,Te,Ue),ot("WebGLRenderer: Texture has been resized from ("+ve.width+"x"+ve.height+") to ("+Te+"x"+Ue+")."),_e}else return"data"in F&&ot("WebGLRenderer: Image in DataTexture is too big ("+ve.width+"x"+ve.height+")."),F;return F}function S(F){return F.generateMipmaps}function A(F){i.generateMipmap(F)}function D(F){return F.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:F.isWebGL3DRenderTarget?i.TEXTURE_3D:F.isWebGLArrayRenderTarget||F.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function C(F,T,se,de,ve,Te=!1){if(F!==null){if(i[F]!==void 0)return i[F];ot("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+F+"'")}let Ue;de&&(Ue=e.get("EXT_texture_norm16"),Ue||ot("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let _e=T;if(T===i.RED&&(se===i.FLOAT&&(_e=i.R32F),se===i.HALF_FLOAT&&(_e=i.R16F),se===i.UNSIGNED_BYTE&&(_e=i.R8),se===i.UNSIGNED_SHORT&&Ue&&(_e=Ue.R16_EXT),se===i.SHORT&&Ue&&(_e=Ue.R16_SNORM_EXT)),T===i.RED_INTEGER&&(se===i.UNSIGNED_BYTE&&(_e=i.R8UI),se===i.UNSIGNED_SHORT&&(_e=i.R16UI),se===i.UNSIGNED_INT&&(_e=i.R32UI),se===i.BYTE&&(_e=i.R8I),se===i.SHORT&&(_e=i.R16I),se===i.INT&&(_e=i.R32I)),T===i.RG&&(se===i.FLOAT&&(_e=i.RG32F),se===i.HALF_FLOAT&&(_e=i.RG16F),se===i.UNSIGNED_BYTE&&(_e=i.RG8),se===i.UNSIGNED_SHORT&&Ue&&(_e=Ue.RG16_EXT),se===i.SHORT&&Ue&&(_e=Ue.RG16_SNORM_EXT)),T===i.RG_INTEGER&&(se===i.UNSIGNED_BYTE&&(_e=i.RG8UI),se===i.UNSIGNED_SHORT&&(_e=i.RG16UI),se===i.UNSIGNED_INT&&(_e=i.RG32UI),se===i.BYTE&&(_e=i.RG8I),se===i.SHORT&&(_e=i.RG16I),se===i.INT&&(_e=i.RG32I)),T===i.RGB_INTEGER&&(se===i.UNSIGNED_BYTE&&(_e=i.RGB8UI),se===i.UNSIGNED_SHORT&&(_e=i.RGB16UI),se===i.UNSIGNED_INT&&(_e=i.RGB32UI),se===i.BYTE&&(_e=i.RGB8I),se===i.SHORT&&(_e=i.RGB16I),se===i.INT&&(_e=i.RGB32I)),T===i.RGBA_INTEGER&&(se===i.UNSIGNED_BYTE&&(_e=i.RGBA8UI),se===i.UNSIGNED_SHORT&&(_e=i.RGBA16UI),se===i.UNSIGNED_INT&&(_e=i.RGBA32UI),se===i.BYTE&&(_e=i.RGBA8I),se===i.SHORT&&(_e=i.RGBA16I),se===i.INT&&(_e=i.RGBA32I)),T===i.RGB&&(se===i.UNSIGNED_SHORT&&Ue&&(_e=Ue.RGB16_EXT),se===i.SHORT&&Ue&&(_e=Ue.RGB16_SNORM_EXT),se===i.UNSIGNED_INT_5_9_9_9_REV&&(_e=i.RGB9_E5),se===i.UNSIGNED_INT_10F_11F_11F_REV&&(_e=i.R11F_G11F_B10F)),T===i.RGBA){const Se=Te?hh:Tt.getTransfer(ve);se===i.FLOAT&&(_e=i.RGBA32F),se===i.HALF_FLOAT&&(_e=i.RGBA16F),se===i.UNSIGNED_BYTE&&(_e=Se===Gt?i.SRGB8_ALPHA8:i.RGBA8),se===i.UNSIGNED_SHORT&&Ue&&(_e=Ue.RGBA16_EXT),se===i.SHORT&&Ue&&(_e=Ue.RGBA16_SNORM_EXT),se===i.UNSIGNED_SHORT_4_4_4_4&&(_e=i.RGBA4),se===i.UNSIGNED_SHORT_5_5_5_1&&(_e=i.RGB5_A1)}return(_e===i.R16F||_e===i.R32F||_e===i.RG16F||_e===i.RG32F||_e===i.RGBA16F||_e===i.RGBA32F)&&e.get("EXT_color_buffer_float"),_e}function I(F,T){let se;return F?T===null||T===yr||T===$l?se=i.DEPTH24_STENCIL8:T===pr?se=i.DEPTH32F_STENCIL8:T===Xl&&(se=i.DEPTH24_STENCIL8,ot("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):T===null||T===yr||T===$l?se=i.DEPTH_COMPONENT24:T===pr?se=i.DEPTH_COMPONENT32F:T===Xl&&(se=i.DEPTH_COMPONENT16),se}function L(F,T){return S(F)===!0||F.isFramebufferTexture&&F.minFilter!==Un&&F.minFilter!==jn?Math.log2(Math.max(T.width,T.height))+1:F.mipmaps!==void 0&&F.mipmaps.length>0?F.mipmaps.length:F.isCompressedTexture&&Array.isArray(F.image)?T.mipmaps.length:1}function U(F){const T=F.target;T.removeEventListener("dispose",U),N(T),T.isVideoTexture&&v.delete(T),T.isHTMLTexture&&g.delete(T)}function w(F){const T=F.target;T.removeEventListener("dispose",w),V(T)}function N(F){const T=r.get(F);if(T.__webglInit===void 0)return;const se=F.source,de=y.get(se);if(de){const ve=de[T.__cacheKey];ve.usedTimes--,ve.usedTimes===0&&H(F),Object.keys(de).length===0&&y.delete(se)}r.remove(F)}function H(F){const T=r.get(F);i.deleteTexture(T.__webglTexture);const se=F.source,de=y.get(se);delete de[T.__cacheKey],c.memory.textures--}function V(F){const T=r.get(F);if(F.depthTexture&&(F.depthTexture.dispose(),r.remove(F.depthTexture)),F.isWebGLCubeRenderTarget)for(let de=0;de<6;de++){if(Array.isArray(T.__webglFramebuffer[de]))for(let ve=0;ve<T.__webglFramebuffer[de].length;ve++)i.deleteFramebuffer(T.__webglFramebuffer[de][ve]);else i.deleteFramebuffer(T.__webglFramebuffer[de]);T.__webglDepthbuffer&&i.deleteRenderbuffer(T.__webglDepthbuffer[de])}else{if(Array.isArray(T.__webglFramebuffer))for(let de=0;de<T.__webglFramebuffer.length;de++)i.deleteFramebuffer(T.__webglFramebuffer[de]);else i.deleteFramebuffer(T.__webglFramebuffer);if(T.__webglDepthbuffer&&i.deleteRenderbuffer(T.__webglDepthbuffer),T.__webglMultisampledFramebuffer&&i.deleteFramebuffer(T.__webglMultisampledFramebuffer),T.__webglColorRenderbuffer)for(let de=0;de<T.__webglColorRenderbuffer.length;de++)T.__webglColorRenderbuffer[de]&&i.deleteRenderbuffer(T.__webglColorRenderbuffer[de]);T.__webglDepthRenderbuffer&&i.deleteRenderbuffer(T.__webglDepthRenderbuffer)}const se=F.textures;for(let de=0,ve=se.length;de<ve;de++){const Te=r.get(se[de]);Te.__webglTexture&&(i.deleteTexture(Te.__webglTexture),c.memory.textures--),r.remove(se[de])}r.remove(F)}let X=0;function j(){X=0}function he(){return X}function $(F){X=F}function oe(){const F=X;return F>=a.maxTextures&&ot("WebGLTextures: Trying to use "+F+" texture units while this GPU supports only "+a.maxTextures),X+=1,F}function Q(F){const T=[];return T.push(F.wrapS),T.push(F.wrapT),T.push(F.wrapR||0),T.push(F.magFilter),T.push(F.minFilter),T.push(F.anisotropy),T.push(F.internalFormat),T.push(F.format),T.push(F.type),T.push(F.generateMipmaps),T.push(F.premultiplyAlpha),T.push(F.flipY),T.push(F.unpackAlignment),T.push(F.colorSpace),T.join()}function q(F,T){const se=r.get(F);if(F.isVideoTexture&&ee(F),F.isRenderTargetTexture===!1&&F.isExternalTexture!==!0&&F.version>0&&se.__version!==F.version){const de=F.image;if(de===null)ot("WebGLRenderer: Texture marked for update but no image data found.");else if(de.complete===!1)ot("WebGLRenderer: Texture marked for update but image is incomplete");else{re(se,F,T);return}}else F.isExternalTexture&&(se.__webglTexture=F.sourceTexture?F.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,se.__webglTexture,i.TEXTURE0+T)}function Y(F,T){const se=r.get(F);if(F.isRenderTargetTexture===!1&&F.version>0&&se.__version!==F.version){re(se,F,T);return}else F.isExternalTexture&&(se.__webglTexture=F.sourceTexture?F.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,se.__webglTexture,i.TEXTURE0+T)}function Z(F,T){const se=r.get(F);if(F.isRenderTargetTexture===!1&&F.version>0&&se.__version!==F.version){re(se,F,T);return}t.bindTexture(i.TEXTURE_3D,se.__webglTexture,i.TEXTURE0+T)}function O(F,T){const se=r.get(F);if(F.isCubeDepthTexture!==!0&&F.version>0&&se.__version!==F.version){Ie(se,F,T);return}t.bindTexture(i.TEXTURE_CUBE_MAP,se.__webglTexture,i.TEXTURE0+T)}const ne={[Pp]:i.REPEAT,[Wr]:i.CLAMP_TO_EDGE,[Np]:i.MIRRORED_REPEAT},Re={[Un]:i.NEAREST,[lb]:i.NEAREST_MIPMAP_NEAREST,[gu]:i.NEAREST_MIPMAP_LINEAR,[jn]:i.LINEAR,[vf]:i.LINEAR_MIPMAP_NEAREST,[ma]:i.LINEAR_MIPMAP_LINEAR},xe={[hb]:i.NEVER,[gb]:i.ALWAYS,[db]:i.LESS,[Fm]:i.LEQUAL,[fb]:i.EQUAL,[km]:i.GEQUAL,[pb]:i.GREATER,[mb]:i.NOTEQUAL};function Ne(F,T){if(T.type===pr&&e.has("OES_texture_float_linear")===!1&&(T.magFilter===jn||T.magFilter===vf||T.magFilter===gu||T.magFilter===ma||T.minFilter===jn||T.minFilter===vf||T.minFilter===gu||T.minFilter===ma)&&ot("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(F,i.TEXTURE_WRAP_S,ne[T.wrapS]),i.texParameteri(F,i.TEXTURE_WRAP_T,ne[T.wrapT]),(F===i.TEXTURE_3D||F===i.TEXTURE_2D_ARRAY)&&i.texParameteri(F,i.TEXTURE_WRAP_R,ne[T.wrapR]),i.texParameteri(F,i.TEXTURE_MAG_FILTER,Re[T.magFilter]),i.texParameteri(F,i.TEXTURE_MIN_FILTER,Re[T.minFilter]),T.compareFunction&&(i.texParameteri(F,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(F,i.TEXTURE_COMPARE_FUNC,xe[T.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(T.magFilter===Un||T.minFilter!==gu&&T.minFilter!==ma||T.type===pr&&e.has("OES_texture_float_linear")===!1)return;if(T.anisotropy>1||r.get(T).__currentAnisotropy){const se=e.get("EXT_texture_filter_anisotropic");i.texParameterf(F,se.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(T.anisotropy,a.getMaxAnisotropy())),r.get(T).__currentAnisotropy=T.anisotropy}}}function B(F,T){let se=!1;F.__webglInit===void 0&&(F.__webglInit=!0,T.addEventListener("dispose",U));const de=T.source;let ve=y.get(de);ve===void 0&&(ve={},y.set(de,ve));const Te=Q(T);if(Te!==F.__cacheKey){ve[Te]===void 0&&(ve[Te]={texture:i.createTexture(),usedTimes:0},c.memory.textures++,se=!0),ve[Te].usedTimes++;const Ue=ve[F.__cacheKey];Ue!==void 0&&(ve[F.__cacheKey].usedTimes--,Ue.usedTimes===0&&H(T)),F.__cacheKey=Te,F.__webglTexture=ve[Te].texture}return se}function ge(F,T,se){return Math.floor(Math.floor(F/se)/T)}function fe(F,T,se,de){const Te=F.updateRanges;if(Te.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,T.width,T.height,se,de,T.data);else{Te.sort((Ze,Oe)=>Ze.start-Oe.start);let Ue=0;for(let Ze=1;Ze<Te.length;Ze++){const Oe=Te[Ue],De=Te[Ze],nt=Oe.start+Oe.count,rt=ge(De.start,T.width,4),lt=ge(Oe.start,T.width,4);De.start<=nt+1&&rt===lt&&ge(De.start+De.count-1,T.width,4)===rt?Oe.count=Math.max(Oe.count,De.start+De.count-Oe.start):(++Ue,Te[Ue]=De)}Te.length=Ue+1;const _e=t.getParameter(i.UNPACK_ROW_LENGTH),Se=t.getParameter(i.UNPACK_SKIP_PIXELS),ke=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,T.width);for(let Ze=0,Oe=Te.length;Ze<Oe;Ze++){const De=Te[Ze],nt=Math.floor(De.start/4),rt=Math.ceil(De.count/4),lt=nt%T.width,K=Math.floor(nt/T.width),Le=rt,ye=1;t.pixelStorei(i.UNPACK_SKIP_PIXELS,lt),t.pixelStorei(i.UNPACK_SKIP_ROWS,K),t.texSubImage2D(i.TEXTURE_2D,0,lt,K,Le,ye,se,de,T.data)}F.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,_e),t.pixelStorei(i.UNPACK_SKIP_PIXELS,Se),t.pixelStorei(i.UNPACK_SKIP_ROWS,ke)}}function re(F,T,se){let de=i.TEXTURE_2D;(T.isDataArrayTexture||T.isCompressedArrayTexture)&&(de=i.TEXTURE_2D_ARRAY),T.isData3DTexture&&(de=i.TEXTURE_3D);const ve=B(F,T),Te=T.source;t.bindTexture(de,F.__webglTexture,i.TEXTURE0+se);const Ue=r.get(Te);if(Te.version!==Ue.__version||ve===!0){if(t.activeTexture(i.TEXTURE0+se),(typeof ImageBitmap<"u"&&T.image instanceof ImageBitmap)===!1){const ye=Tt.getPrimaries(Tt.workingColorSpace),Fe=T.colorSpace===Cs?null:Tt.getPrimaries(T.colorSpace),ze=T.colorSpace===Cs||ye===Fe?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ze)}t.pixelStorei(i.UNPACK_ALIGNMENT,T.unpackAlignment);let Se=M(T.image,!1,a.maxTextureSize);Se=Pn(T,Se);const ke=l.convert(T.format,T.colorSpace),Ze=l.convert(T.type);let Oe=C(T.internalFormat,ke,Ze,T.normalized,T.colorSpace,T.isVideoTexture);Ne(de,T);let De;const nt=T.mipmaps,rt=T.isVideoTexture!==!0,lt=Ue.__version===void 0||ve===!0,K=Te.dataReady,Le=L(T,Se);if(T.isDepthTexture)Oe=I(T.format===ga,T.type),lt&&(rt?t.texStorage2D(i.TEXTURE_2D,1,Oe,Se.width,Se.height):t.texImage2D(i.TEXTURE_2D,0,Oe,Se.width,Se.height,0,ke,Ze,null));else if(T.isDataTexture)if(nt.length>0){rt&&lt&&t.texStorage2D(i.TEXTURE_2D,Le,Oe,nt[0].width,nt[0].height);for(let ye=0,Fe=nt.length;ye<Fe;ye++)De=nt[ye],rt?K&&t.texSubImage2D(i.TEXTURE_2D,ye,0,0,De.width,De.height,ke,Ze,De.data):t.texImage2D(i.TEXTURE_2D,ye,Oe,De.width,De.height,0,ke,Ze,De.data);T.generateMipmaps=!1}else rt?(lt&&t.texStorage2D(i.TEXTURE_2D,Le,Oe,Se.width,Se.height),K&&fe(T,Se,ke,Ze)):t.texImage2D(i.TEXTURE_2D,0,Oe,Se.width,Se.height,0,ke,Ze,Se.data);else if(T.isCompressedTexture)if(T.isCompressedArrayTexture){rt&&lt&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Le,Oe,nt[0].width,nt[0].height,Se.depth);for(let ye=0,Fe=nt.length;ye<Fe;ye++)if(De=nt[ye],T.format!==Ki)if(ke!==null)if(rt){if(K)if(T.layerUpdates.size>0){const ze=Rv(De.width,De.height,T.format,T.type);for(const Me of T.layerUpdates){const Ke=De.data.subarray(Me*ze/De.data.BYTES_PER_ELEMENT,(Me+1)*ze/De.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ye,0,0,Me,De.width,De.height,1,ke,Ke)}T.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ye,0,0,0,De.width,De.height,Se.depth,ke,De.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,ye,Oe,De.width,De.height,Se.depth,0,De.data,0,0);else ot("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else rt?K&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,ye,0,0,0,De.width,De.height,Se.depth,ke,Ze,De.data):t.texImage3D(i.TEXTURE_2D_ARRAY,ye,Oe,De.width,De.height,Se.depth,0,ke,Ze,De.data)}else{rt&&lt&&t.texStorage2D(i.TEXTURE_2D,Le,Oe,nt[0].width,nt[0].height);for(let ye=0,Fe=nt.length;ye<Fe;ye++)De=nt[ye],T.format!==Ki?ke!==null?rt?K&&t.compressedTexSubImage2D(i.TEXTURE_2D,ye,0,0,De.width,De.height,ke,De.data):t.compressedTexImage2D(i.TEXTURE_2D,ye,Oe,De.width,De.height,0,De.data):ot("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):rt?K&&t.texSubImage2D(i.TEXTURE_2D,ye,0,0,De.width,De.height,ke,Ze,De.data):t.texImage2D(i.TEXTURE_2D,ye,Oe,De.width,De.height,0,ke,Ze,De.data)}else if(T.isDataArrayTexture)if(rt){if(lt&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Le,Oe,Se.width,Se.height,Se.depth),K)if(T.layerUpdates.size>0){const ye=Rv(Se.width,Se.height,T.format,T.type);for(const Fe of T.layerUpdates){const ze=Se.data.subarray(Fe*ye/Se.data.BYTES_PER_ELEMENT,(Fe+1)*ye/Se.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,Fe,Se.width,Se.height,1,ke,Ze,ze)}T.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,Se.width,Se.height,Se.depth,ke,Ze,Se.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,Oe,Se.width,Se.height,Se.depth,0,ke,Ze,Se.data);else if(T.isData3DTexture)rt?(lt&&t.texStorage3D(i.TEXTURE_3D,Le,Oe,Se.width,Se.height,Se.depth),K&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,Se.width,Se.height,Se.depth,ke,Ze,Se.data)):t.texImage3D(i.TEXTURE_3D,0,Oe,Se.width,Se.height,Se.depth,0,ke,Ze,Se.data);else if(T.isFramebufferTexture){if(lt)if(rt)t.texStorage2D(i.TEXTURE_2D,Le,Oe,Se.width,Se.height);else{let ye=Se.width,Fe=Se.height;for(let ze=0;ze<Le;ze++)t.texImage2D(i.TEXTURE_2D,ze,Oe,ye,Fe,0,ke,Ze,null),ye>>=1,Fe>>=1}}else if(T.isHTMLTexture){if("texElementImage2D"in i){const ye=i.canvas;if(ye.hasAttribute("layoutsubtree")||ye.setAttribute("layoutsubtree","true"),Se.parentNode!==ye){ye.appendChild(Se),g.add(T),ye.onpaint=Fe=>{const ze=Fe.changedElements;for(const Me of g)ze.includes(Me.image)&&(Me.needsUpdate=!0)},ye.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,Se);else{const ze=i.RGBA,Me=i.RGBA,Ke=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,ze,Me,Ke,Se)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(nt.length>0){if(rt&&lt){const ye=Lt(nt[0]);t.texStorage2D(i.TEXTURE_2D,Le,Oe,ye.width,ye.height)}for(let ye=0,Fe=nt.length;ye<Fe;ye++)De=nt[ye],rt?K&&t.texSubImage2D(i.TEXTURE_2D,ye,0,0,ke,Ze,De):t.texImage2D(i.TEXTURE_2D,ye,Oe,ke,Ze,De);T.generateMipmaps=!1}else if(rt){if(lt){const ye=Lt(Se);t.texStorage2D(i.TEXTURE_2D,Le,Oe,ye.width,ye.height)}K&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,ke,Ze,Se)}else t.texImage2D(i.TEXTURE_2D,0,Oe,ke,Ze,Se);S(T)&&A(de),Ue.__version=Te.version,T.onUpdate&&T.onUpdate(T)}F.__version=T.version}function Ie(F,T,se){if(T.image.length!==6)return;const de=B(F,T),ve=T.source;t.bindTexture(i.TEXTURE_CUBE_MAP,F.__webglTexture,i.TEXTURE0+se);const Te=r.get(ve);if(ve.version!==Te.__version||de===!0){t.activeTexture(i.TEXTURE0+se);const Ue=Tt.getPrimaries(Tt.workingColorSpace),_e=T.colorSpace===Cs?null:Tt.getPrimaries(T.colorSpace),Se=T.colorSpace===Cs||Ue===_e?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,T.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Se);const ke=T.isCompressedTexture||T.image[0].isCompressedTexture,Ze=T.image[0]&&T.image[0].isDataTexture,Oe=[];for(let Me=0;Me<6;Me++)!ke&&!Ze?Oe[Me]=M(T.image[Me],!0,a.maxCubemapSize):Oe[Me]=Ze?T.image[Me].image:T.image[Me],Oe[Me]=Pn(T,Oe[Me]);const De=Oe[0],nt=l.convert(T.format,T.colorSpace),rt=l.convert(T.type),lt=C(T.internalFormat,nt,rt,T.normalized,T.colorSpace),K=T.isVideoTexture!==!0,Le=Te.__version===void 0||de===!0,ye=ve.dataReady;let Fe=L(T,De);Ne(i.TEXTURE_CUBE_MAP,T);let ze;if(ke){K&&Le&&t.texStorage2D(i.TEXTURE_CUBE_MAP,Fe,lt,De.width,De.height);for(let Me=0;Me<6;Me++){ze=Oe[Me].mipmaps;for(let Ke=0;Ke<ze.length;Ke++){const Xe=ze[Ke];T.format!==Ki?nt!==null?K?ye&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ke,0,0,Xe.width,Xe.height,nt,Xe.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ke,lt,Xe.width,Xe.height,0,Xe.data):ot("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):K?ye&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ke,0,0,Xe.width,Xe.height,nt,rt,Xe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ke,lt,Xe.width,Xe.height,0,nt,rt,Xe.data)}}}else{if(ze=T.mipmaps,K&&Le){ze.length>0&&Fe++;const Me=Lt(Oe[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,Fe,lt,Me.width,Me.height)}for(let Me=0;Me<6;Me++)if(Ze){K?ye&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,0,0,Oe[Me].width,Oe[Me].height,nt,rt,Oe[Me].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,lt,Oe[Me].width,Oe[Me].height,0,nt,rt,Oe[Me].data);for(let Ke=0;Ke<ze.length;Ke++){const Wt=ze[Ke].image[Me].image;K?ye&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ke+1,0,0,Wt.width,Wt.height,nt,rt,Wt.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ke+1,lt,Wt.width,Wt.height,0,nt,rt,Wt.data)}}else{K?ye&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,0,0,nt,rt,Oe[Me]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,lt,nt,rt,Oe[Me]);for(let Ke=0;Ke<ze.length;Ke++){const Xe=ze[Ke];K?ye&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ke+1,0,0,nt,rt,Xe.image[Me]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ke+1,lt,nt,rt,Xe.image[Me])}}}S(T)&&A(i.TEXTURE_CUBE_MAP),Te.__version=ve.version,T.onUpdate&&T.onUpdate(T)}F.__version=T.version}function qe(F,T,se,de,ve,Te){const Ue=l.convert(se.format,se.colorSpace),_e=l.convert(se.type),Se=C(se.internalFormat,Ue,_e,se.normalized,se.colorSpace),ke=r.get(T),Ze=r.get(se);if(Ze.__renderTarget=T,!ke.__hasExternalTextures){const Oe=Math.max(1,T.width>>Te),De=Math.max(1,T.height>>Te);ve===i.TEXTURE_3D||ve===i.TEXTURE_2D_ARRAY?t.texImage3D(ve,Te,Se,Oe,De,T.depth,0,Ue,_e,null):t.texImage2D(ve,Te,Se,Oe,De,0,Ue,_e,null)}t.bindFramebuffer(i.FRAMEBUFFER,F),Jt(T)?h.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,de,ve,Ze.__webglTexture,0,Bt(T)):(ve===i.TEXTURE_2D||ve>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&ve<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,de,ve,Ze.__webglTexture,Te),t.bindFramebuffer(i.FRAMEBUFFER,null)}function jt(F,T,se){if(i.bindRenderbuffer(i.RENDERBUFFER,F),T.depthBuffer){const de=T.depthTexture,ve=de&&de.isDepthTexture?de.type:null,Te=I(T.stencilBuffer,ve),Ue=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;Jt(T)?h.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Bt(T),Te,T.width,T.height):se?i.renderbufferStorageMultisample(i.RENDERBUFFER,Bt(T),Te,T.width,T.height):i.renderbufferStorage(i.RENDERBUFFER,Te,T.width,T.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Ue,i.RENDERBUFFER,F)}else{const de=T.textures;for(let ve=0;ve<de.length;ve++){const Te=de[ve],Ue=l.convert(Te.format,Te.colorSpace),_e=l.convert(Te.type),Se=C(Te.internalFormat,Ue,_e,Te.normalized,Te.colorSpace);Jt(T)?h.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Bt(T),Se,T.width,T.height):se?i.renderbufferStorageMultisample(i.RENDERBUFFER,Bt(T),Se,T.width,T.height):i.renderbufferStorage(i.RENDERBUFFER,Se,T.width,T.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function ht(F,T,se){const de=T.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,F),!(T.depthTexture&&T.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const ve=r.get(T.depthTexture);if(ve.__renderTarget=T,(!ve.__webglTexture||T.depthTexture.image.width!==T.width||T.depthTexture.image.height!==T.height)&&(T.depthTexture.image.width=T.width,T.depthTexture.image.height=T.height,T.depthTexture.needsUpdate=!0),de){if(ve.__webglInit===void 0&&(ve.__webglInit=!0,T.depthTexture.addEventListener("dispose",U)),ve.__webglTexture===void 0){ve.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,ve.__webglTexture),Ne(i.TEXTURE_CUBE_MAP,T.depthTexture);const ke=l.convert(T.depthTexture.format),Ze=l.convert(T.depthTexture.type);let Oe;T.depthTexture.format===Qr?Oe=i.DEPTH_COMPONENT24:T.depthTexture.format===ga&&(Oe=i.DEPTH24_STENCIL8);for(let De=0;De<6;De++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+De,0,Oe,T.width,T.height,0,ke,Ze,null)}}else q(T.depthTexture,0);const Te=ve.__webglTexture,Ue=Bt(T),_e=de?i.TEXTURE_CUBE_MAP_POSITIVE_X+se:i.TEXTURE_2D,Se=T.depthTexture.format===ga?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(T.depthTexture.format===Qr)Jt(T)?h.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Se,_e,Te,0,Ue):i.framebufferTexture2D(i.FRAMEBUFFER,Se,_e,Te,0);else if(T.depthTexture.format===ga)Jt(T)?h.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Se,_e,Te,0,Ue):i.framebufferTexture2D(i.FRAMEBUFFER,Se,_e,Te,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function Ut(F){const T=r.get(F),se=F.isWebGLCubeRenderTarget===!0;if(T.__boundDepthTexture!==F.depthTexture){const de=F.depthTexture;if(T.__depthDisposeCallback&&T.__depthDisposeCallback(),de){const ve=()=>{delete T.__boundDepthTexture,delete T.__depthDisposeCallback,de.removeEventListener("dispose",ve)};de.addEventListener("dispose",ve),T.__depthDisposeCallback=ve}T.__boundDepthTexture=de}if(F.depthTexture&&!T.__autoAllocateDepthBuffer)if(se)for(let de=0;de<6;de++)ht(T.__webglFramebuffer[de],F,de);else{const de=F.texture.mipmaps;de&&de.length>0?ht(T.__webglFramebuffer[0],F,0):ht(T.__webglFramebuffer,F,0)}else if(se){T.__webglDepthbuffer=[];for(let de=0;de<6;de++)if(t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer[de]),T.__webglDepthbuffer[de]===void 0)T.__webglDepthbuffer[de]=i.createRenderbuffer(),jt(T.__webglDepthbuffer[de],F,!1);else{const ve=F.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Te=T.__webglDepthbuffer[de];i.bindRenderbuffer(i.RENDERBUFFER,Te),i.framebufferRenderbuffer(i.FRAMEBUFFER,ve,i.RENDERBUFFER,Te)}}else{const de=F.texture.mipmaps;if(de&&de.length>0?t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer),T.__webglDepthbuffer===void 0)T.__webglDepthbuffer=i.createRenderbuffer(),jt(T.__webglDepthbuffer,F,!1);else{const ve=F.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Te=T.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,Te),i.framebufferRenderbuffer(i.FRAMEBUFFER,ve,i.RENDERBUFFER,Te)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function Rt(F,T,se){const de=r.get(F);T!==void 0&&qe(de.__webglFramebuffer,F,F.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),se!==void 0&&Ut(F)}function wt(F){const T=F.texture,se=r.get(F),de=r.get(T);F.addEventListener("dispose",w);const ve=F.textures,Te=F.isWebGLCubeRenderTarget===!0,Ue=ve.length>1;if(Ue||(de.__webglTexture===void 0&&(de.__webglTexture=i.createTexture()),de.__version=T.version,c.memory.textures++),Te){se.__webglFramebuffer=[];for(let _e=0;_e<6;_e++)if(T.mipmaps&&T.mipmaps.length>0){se.__webglFramebuffer[_e]=[];for(let Se=0;Se<T.mipmaps.length;Se++)se.__webglFramebuffer[_e][Se]=i.createFramebuffer()}else se.__webglFramebuffer[_e]=i.createFramebuffer()}else{if(T.mipmaps&&T.mipmaps.length>0){se.__webglFramebuffer=[];for(let _e=0;_e<T.mipmaps.length;_e++)se.__webglFramebuffer[_e]=i.createFramebuffer()}else se.__webglFramebuffer=i.createFramebuffer();if(Ue)for(let _e=0,Se=ve.length;_e<Se;_e++){const ke=r.get(ve[_e]);ke.__webglTexture===void 0&&(ke.__webglTexture=i.createTexture(),c.memory.textures++)}if(F.samples>0&&Jt(F)===!1){se.__webglMultisampledFramebuffer=i.createFramebuffer(),se.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,se.__webglMultisampledFramebuffer);for(let _e=0;_e<ve.length;_e++){const Se=ve[_e];se.__webglColorRenderbuffer[_e]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,se.__webglColorRenderbuffer[_e]);const ke=l.convert(Se.format,Se.colorSpace),Ze=l.convert(Se.type),Oe=C(Se.internalFormat,ke,Ze,Se.normalized,Se.colorSpace,F.isXRRenderTarget===!0),De=Bt(F);i.renderbufferStorageMultisample(i.RENDERBUFFER,De,Oe,F.width,F.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+_e,i.RENDERBUFFER,se.__webglColorRenderbuffer[_e])}i.bindRenderbuffer(i.RENDERBUFFER,null),F.depthBuffer&&(se.__webglDepthRenderbuffer=i.createRenderbuffer(),jt(se.__webglDepthRenderbuffer,F,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(Te){t.bindTexture(i.TEXTURE_CUBE_MAP,de.__webglTexture),Ne(i.TEXTURE_CUBE_MAP,T);for(let _e=0;_e<6;_e++)if(T.mipmaps&&T.mipmaps.length>0)for(let Se=0;Se<T.mipmaps.length;Se++)qe(se.__webglFramebuffer[_e][Se],F,T,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+_e,Se);else qe(se.__webglFramebuffer[_e],F,T,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+_e,0);S(T)&&A(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Ue){for(let _e=0,Se=ve.length;_e<Se;_e++){const ke=ve[_e],Ze=r.get(ke);let Oe=i.TEXTURE_2D;(F.isWebGL3DRenderTarget||F.isWebGLArrayRenderTarget)&&(Oe=F.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(Oe,Ze.__webglTexture),Ne(Oe,ke),qe(se.__webglFramebuffer,F,ke,i.COLOR_ATTACHMENT0+_e,Oe,0),S(ke)&&A(Oe)}t.unbindTexture()}else{let _e=i.TEXTURE_2D;if((F.isWebGL3DRenderTarget||F.isWebGLArrayRenderTarget)&&(_e=F.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(_e,de.__webglTexture),Ne(_e,T),T.mipmaps&&T.mipmaps.length>0)for(let Se=0;Se<T.mipmaps.length;Se++)qe(se.__webglFramebuffer[Se],F,T,i.COLOR_ATTACHMENT0,_e,Se);else qe(se.__webglFramebuffer,F,T,i.COLOR_ATTACHMENT0,_e,0);S(T)&&A(_e),t.unbindTexture()}F.depthBuffer&&Ut(F)}function Zt(F){const T=F.textures;for(let se=0,de=T.length;se<de;se++){const ve=T[se];if(S(ve)){const Te=D(F),Ue=r.get(ve).__webglTexture;t.bindTexture(Te,Ue),A(Te),t.unbindTexture()}}}const un=[],hn=[];function sn(F){if(F.samples>0){if(Jt(F)===!1){const T=F.textures,se=F.width,de=F.height;let ve=i.COLOR_BUFFER_BIT;const Te=F.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Ue=r.get(F),_e=T.length>1;if(_e)for(let ke=0;ke<T.length;ke++)t.bindFramebuffer(i.FRAMEBUFFER,Ue.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ke,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,Ue.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ke,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,Ue.__webglMultisampledFramebuffer);const Se=F.texture.mipmaps;Se&&Se.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ue.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ue.__webglFramebuffer);for(let ke=0;ke<T.length;ke++){if(F.resolveDepthBuffer&&(F.depthBuffer&&(ve|=i.DEPTH_BUFFER_BIT),F.stencilBuffer&&F.resolveStencilBuffer&&(ve|=i.STENCIL_BUFFER_BIT)),_e){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Ue.__webglColorRenderbuffer[ke]);const Ze=r.get(T[ke]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Ze,0)}i.blitFramebuffer(0,0,se,de,0,0,se,de,ve,i.NEAREST),d===!0&&(un.length=0,hn.length=0,un.push(i.COLOR_ATTACHMENT0+ke),F.depthBuffer&&F.resolveDepthBuffer===!1&&(un.push(Te),hn.push(Te),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,hn)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,un))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),_e)for(let ke=0;ke<T.length;ke++){t.bindFramebuffer(i.FRAMEBUFFER,Ue.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ke,i.RENDERBUFFER,Ue.__webglColorRenderbuffer[ke]);const Ze=r.get(T[ke]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,Ue.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ke,i.TEXTURE_2D,Ze,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ue.__webglMultisampledFramebuffer)}else if(F.depthBuffer&&F.resolveDepthBuffer===!1&&d){const T=F.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[T])}}}function Bt(F){return Math.min(a.maxSamples,F.samples)}function Jt(F){const T=r.get(F);return F.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&T.__useRenderToTexture!==!1}function ee(F){const T=c.render.frame;v.get(F)!==T&&(v.set(F,T),F.update())}function Pn(F,T){const se=F.colorSpace,de=F.format,ve=F.type;return F.isCompressedTexture===!0||F.isVideoTexture===!0||se!==uh&&se!==Cs&&(Tt.getTransfer(se)===Gt?(de!==Ki||ve!==Si)&&ot("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Nt("WebGLTextures: Unsupported texture color space:",se)),T}function Lt(F){return typeof HTMLImageElement<"u"&&F instanceof HTMLImageElement?(f.width=F.naturalWidth||F.width,f.height=F.naturalHeight||F.height):typeof VideoFrame<"u"&&F instanceof VideoFrame?(f.width=F.displayWidth,f.height=F.displayHeight):(f.width=F.width,f.height=F.height),f}this.allocateTextureUnit=oe,this.resetTextureUnits=j,this.getTextureUnits=he,this.setTextureUnits=$,this.setTexture2D=q,this.setTexture2DArray=Y,this.setTexture3D=Z,this.setTextureCube=O,this.rebindTextures=Rt,this.setupRenderTarget=wt,this.updateRenderTargetMipmap=Zt,this.updateMultisampleRenderTarget=sn,this.setupDepthRenderbuffer=Ut,this.setupFrameBufferTexture=qe,this.useMultisampledRTT=Jt,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function J2(i,e){function t(r,a=Cs){let l;const c=Tt.getTransfer(a);if(r===Si)return i.UNSIGNED_BYTE;if(r===Nm)return i.UNSIGNED_SHORT_4_4_4_4;if(r===Lm)return i.UNSIGNED_SHORT_5_5_5_1;if(r===vy)return i.UNSIGNED_INT_5_9_9_9_REV;if(r===_y)return i.UNSIGNED_INT_10F_11F_11F_REV;if(r===gy)return i.BYTE;if(r===xy)return i.SHORT;if(r===Xl)return i.UNSIGNED_SHORT;if(r===Pm)return i.INT;if(r===yr)return i.UNSIGNED_INT;if(r===pr)return i.FLOAT;if(r===Yr)return i.HALF_FLOAT;if(r===yy)return i.ALPHA;if(r===Sy)return i.RGB;if(r===Ki)return i.RGBA;if(r===Qr)return i.DEPTH_COMPONENT;if(r===ga)return i.DEPTH_STENCIL;if(r===My)return i.RED;if(r===Dm)return i.RED_INTEGER;if(r===Ra)return i.RG;if(r===Im)return i.RG_INTEGER;if(r===Um)return i.RGBA_INTEGER;if(r===qu||r===Ku||r===Yu||r===Qu)if(c===Gt)if(l=e.get("WEBGL_compressed_texture_s3tc_srgb"),l!==null){if(r===qu)return l.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(r===Ku)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(r===Yu)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(r===Qu)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(l=e.get("WEBGL_compressed_texture_s3tc"),l!==null){if(r===qu)return l.COMPRESSED_RGB_S3TC_DXT1_EXT;if(r===Ku)return l.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(r===Yu)return l.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(r===Qu)return l.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(r===Lp||r===Dp||r===Ip||r===Up)if(l=e.get("WEBGL_compressed_texture_pvrtc"),l!==null){if(r===Lp)return l.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(r===Dp)return l.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(r===Ip)return l.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(r===Up)return l.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(r===Fp||r===kp||r===Op||r===zp||r===Bp||r===oh||r===Vp)if(l=e.get("WEBGL_compressed_texture_etc"),l!==null){if(r===Fp||r===kp)return c===Gt?l.COMPRESSED_SRGB8_ETC2:l.COMPRESSED_RGB8_ETC2;if(r===Op)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:l.COMPRESSED_RGBA8_ETC2_EAC;if(r===zp)return l.COMPRESSED_R11_EAC;if(r===Bp)return l.COMPRESSED_SIGNED_R11_EAC;if(r===oh)return l.COMPRESSED_RG11_EAC;if(r===Vp)return l.COMPRESSED_SIGNED_RG11_EAC}else return null;if(r===Hp||r===Gp||r===jp||r===Wp||r===Xp||r===$p||r===qp||r===Kp||r===Yp||r===Qp||r===Zp||r===Jp||r===em||r===tm)if(l=e.get("WEBGL_compressed_texture_astc"),l!==null){if(r===Hp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:l.COMPRESSED_RGBA_ASTC_4x4_KHR;if(r===Gp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:l.COMPRESSED_RGBA_ASTC_5x4_KHR;if(r===jp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:l.COMPRESSED_RGBA_ASTC_5x5_KHR;if(r===Wp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:l.COMPRESSED_RGBA_ASTC_6x5_KHR;if(r===Xp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:l.COMPRESSED_RGBA_ASTC_6x6_KHR;if(r===$p)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:l.COMPRESSED_RGBA_ASTC_8x5_KHR;if(r===qp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:l.COMPRESSED_RGBA_ASTC_8x6_KHR;if(r===Kp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:l.COMPRESSED_RGBA_ASTC_8x8_KHR;if(r===Yp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:l.COMPRESSED_RGBA_ASTC_10x5_KHR;if(r===Qp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:l.COMPRESSED_RGBA_ASTC_10x6_KHR;if(r===Zp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:l.COMPRESSED_RGBA_ASTC_10x8_KHR;if(r===Jp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:l.COMPRESSED_RGBA_ASTC_10x10_KHR;if(r===em)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:l.COMPRESSED_RGBA_ASTC_12x10_KHR;if(r===tm)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:l.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(r===nm||r===im||r===rm)if(l=e.get("EXT_texture_compression_bptc"),l!==null){if(r===nm)return c===Gt?l.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:l.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(r===im)return l.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(r===rm)return l.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(r===sm||r===am||r===lh||r===om)if(l=e.get("EXT_texture_compression_rgtc"),l!==null){if(r===sm)return l.COMPRESSED_RED_RGTC1_EXT;if(r===am)return l.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(r===lh)return l.COMPRESSED_RED_GREEN_RGTC2_EXT;if(r===om)return l.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return r===$l?i.UNSIGNED_INT_24_8:i[r]!==void 0?i[r]:null}return{convert:t}}const eP=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,tP=`
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

}`;class nP{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const r=new Ny(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=r}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,r=new Mr({vertexShader:eP,fragmentShader:tP,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Qi(new wh(20,20),r)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class iP extends Hs{constructor(e,t){super();const r=this;let a=null,l=1,c=null,h="local-floor",d=1,f=null,v=null,g=null,p=null,y=null,E=null;const b=typeof XRWebGLBinding<"u",M=new nP,S={},A=t.getContextAttributes();let D=null,C=null;const I=[],L=[],U=new ut;let w=null;const N=new Ii;N.viewport=new cn;const H=new Ii;H.viewport=new cn;const V=[N,H],X=new dT;let j=null,he=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(B){let ge=I[B];return ge===void 0&&(ge=new bf,I[B]=ge),ge.getTargetRaySpace()},this.getControllerGrip=function(B){let ge=I[B];return ge===void 0&&(ge=new bf,I[B]=ge),ge.getGripSpace()},this.getHand=function(B){let ge=I[B];return ge===void 0&&(ge=new bf,I[B]=ge),ge.getHandSpace()};function $(B){const ge=L.indexOf(B.inputSource);if(ge===-1)return;const fe=I[ge];fe!==void 0&&(fe.update(B.inputSource,B.frame,f||c),fe.dispatchEvent({type:B.type,data:B.inputSource}))}function oe(){a.removeEventListener("select",$),a.removeEventListener("selectstart",$),a.removeEventListener("selectend",$),a.removeEventListener("squeeze",$),a.removeEventListener("squeezestart",$),a.removeEventListener("squeezeend",$),a.removeEventListener("end",oe),a.removeEventListener("inputsourceschange",Q);for(let B=0;B<I.length;B++){const ge=L[B];ge!==null&&(L[B]=null,I[B].disconnect(ge))}j=null,he=null,M.reset();for(const B in S)delete S[B];e.setRenderTarget(D),y=null,p=null,g=null,a=null,C=null,Ne.stop(),r.isPresenting=!1,e.setPixelRatio(w),e.setSize(U.width,U.height,!1),r.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(B){l=B,r.isPresenting===!0&&ot("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(B){h=B,r.isPresenting===!0&&ot("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return f||c},this.setReferenceSpace=function(B){f=B},this.getBaseLayer=function(){return p!==null?p:y},this.getBinding=function(){return g===null&&b&&(g=new XRWebGLBinding(a,t)),g},this.getFrame=function(){return E},this.getSession=function(){return a},this.setSession=async function(B){if(a=B,a!==null){if(D=e.getRenderTarget(),a.addEventListener("select",$),a.addEventListener("selectstart",$),a.addEventListener("selectend",$),a.addEventListener("squeeze",$),a.addEventListener("squeezestart",$),a.addEventListener("squeezeend",$),a.addEventListener("end",oe),a.addEventListener("inputsourceschange",Q),A.xrCompatible!==!0&&await t.makeXRCompatible(),w=e.getPixelRatio(),e.getSize(U),b&&"createProjectionLayer"in XRWebGLBinding.prototype){let fe=null,re=null,Ie=null;A.depth&&(Ie=A.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,fe=A.stencil?ga:Qr,re=A.stencil?$l:yr);const qe={colorFormat:t.RGBA8,depthFormat:Ie,scaleFactor:l};g=this.getBinding(),p=g.createProjectionLayer(qe),a.updateRenderState({layers:[p]}),e.setPixelRatio(1),e.setSize(p.textureWidth,p.textureHeight,!1),C=new vr(p.textureWidth,p.textureHeight,{format:Ki,type:Si,depthTexture:new ko(p.textureWidth,p.textureHeight,re,void 0,void 0,void 0,void 0,void 0,void 0,fe),stencilBuffer:A.stencil,colorSpace:e.outputColorSpace,samples:A.antialias?4:0,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1})}else{const fe={antialias:A.antialias,alpha:!0,depth:A.depth,stencil:A.stencil,framebufferScaleFactor:l};y=new XRWebGLLayer(a,t,fe),a.updateRenderState({baseLayer:y}),e.setPixelRatio(1),e.setSize(y.framebufferWidth,y.framebufferHeight,!1),C=new vr(y.framebufferWidth,y.framebufferHeight,{format:Ki,type:Si,colorSpace:e.outputColorSpace,stencilBuffer:A.stencil,resolveDepthBuffer:y.ignoreDepthValues===!1,resolveStencilBuffer:y.ignoreDepthValues===!1})}C.isXRRenderTarget=!0,this.setFoveation(d),f=null,c=await a.requestReferenceSpace(h),Ne.setContext(a),Ne.start(),r.isPresenting=!0,r.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(a!==null)return a.environmentBlendMode},this.getDepthTexture=function(){return M.getDepthTexture()};function Q(B){for(let ge=0;ge<B.removed.length;ge++){const fe=B.removed[ge],re=L.indexOf(fe);re>=0&&(L[re]=null,I[re].disconnect(fe))}for(let ge=0;ge<B.added.length;ge++){const fe=B.added[ge];let re=L.indexOf(fe);if(re===-1){for(let qe=0;qe<I.length;qe++)if(qe>=L.length){L.push(fe),re=qe;break}else if(L[qe]===null){L[qe]=fe,re=qe;break}if(re===-1)break}const Ie=I[re];Ie&&Ie.connect(fe)}}const q=new ie,Y=new ie;function Z(B,ge,fe){q.setFromMatrixPosition(ge.matrixWorld),Y.setFromMatrixPosition(fe.matrixWorld);const re=q.distanceTo(Y),Ie=ge.projectionMatrix.elements,qe=fe.projectionMatrix.elements,jt=Ie[14]/(Ie[10]-1),ht=Ie[14]/(Ie[10]+1),Ut=(Ie[9]+1)/Ie[5],Rt=(Ie[9]-1)/Ie[5],wt=(Ie[8]-1)/Ie[0],Zt=(qe[8]+1)/qe[0],un=jt*wt,hn=jt*Zt,sn=re/(-wt+Zt),Bt=sn*-wt;if(ge.matrixWorld.decompose(B.position,B.quaternion,B.scale),B.translateX(Bt),B.translateZ(sn),B.matrixWorld.compose(B.position,B.quaternion,B.scale),B.matrixWorldInverse.copy(B.matrixWorld).invert(),Ie[10]===-1)B.projectionMatrix.copy(ge.projectionMatrix),B.projectionMatrixInverse.copy(ge.projectionMatrixInverse);else{const Jt=jt+sn,ee=ht+sn,Pn=un-Bt,Lt=hn+(re-Bt),F=Ut*ht/ee*Jt,T=Rt*ht/ee*Jt;B.projectionMatrix.makePerspective(Pn,Lt,F,T,Jt,ee),B.projectionMatrixInverse.copy(B.projectionMatrix).invert()}}function O(B,ge){ge===null?B.matrixWorld.copy(B.matrix):B.matrixWorld.multiplyMatrices(ge.matrixWorld,B.matrix),B.matrixWorldInverse.copy(B.matrixWorld).invert()}this.updateCamera=function(B){if(a===null)return;let ge=B.near,fe=B.far;M.texture!==null&&(M.depthNear>0&&(ge=M.depthNear),M.depthFar>0&&(fe=M.depthFar)),X.near=H.near=N.near=ge,X.far=H.far=N.far=fe,(j!==X.near||he!==X.far)&&(a.updateRenderState({depthNear:X.near,depthFar:X.far}),j=X.near,he=X.far),X.layers.mask=B.layers.mask|6,N.layers.mask=X.layers.mask&-5,H.layers.mask=X.layers.mask&-3;const re=B.parent,Ie=X.cameras;O(X,re);for(let qe=0;qe<Ie.length;qe++)O(Ie[qe],re);Ie.length===2?Z(X,N,H):X.projectionMatrix.copy(N.projectionMatrix),ne(B,X,re)};function ne(B,ge,fe){fe===null?B.matrix.copy(ge.matrixWorld):(B.matrix.copy(fe.matrixWorld),B.matrix.invert(),B.matrix.multiply(ge.matrixWorld)),B.matrix.decompose(B.position,B.quaternion,B.scale),B.updateMatrixWorld(!0),B.projectionMatrix.copy(ge.projectionMatrix),B.projectionMatrixInverse.copy(ge.projectionMatrixInverse),B.isPerspectiveCamera&&(B.fov=lm*2*Math.atan(1/B.projectionMatrix.elements[5]),B.zoom=1)}this.getCamera=function(){return X},this.getFoveation=function(){if(!(p===null&&y===null))return d},this.setFoveation=function(B){d=B,p!==null&&(p.fixedFoveation=B),y!==null&&y.fixedFoveation!==void 0&&(y.fixedFoveation=B)},this.hasDepthSensing=function(){return M.texture!==null},this.getDepthSensingMesh=function(){return M.getMesh(X)},this.getCameraTexture=function(B){return S[B]};let Re=null;function xe(B,ge){if(v=ge.getViewerPose(f||c),E=ge,v!==null){const fe=v.views;y!==null&&(e.setRenderTargetFramebuffer(C,y.framebuffer),e.setRenderTarget(C));let re=!1;fe.length!==X.cameras.length&&(X.cameras.length=0,re=!0);for(let ht=0;ht<fe.length;ht++){const Ut=fe[ht];let Rt=null;if(y!==null)Rt=y.getViewport(Ut);else{const Zt=g.getViewSubImage(p,Ut);Rt=Zt.viewport,ht===0&&(e.setRenderTargetTextures(C,Zt.colorTexture,Zt.depthStencilTexture),e.setRenderTarget(C))}let wt=V[ht];wt===void 0&&(wt=new Ii,wt.layers.enable(ht),wt.viewport=new cn,V[ht]=wt),wt.matrix.fromArray(Ut.transform.matrix),wt.matrix.decompose(wt.position,wt.quaternion,wt.scale),wt.projectionMatrix.fromArray(Ut.projectionMatrix),wt.projectionMatrixInverse.copy(wt.projectionMatrix).invert(),wt.viewport.set(Rt.x,Rt.y,Rt.width,Rt.height),ht===0&&(X.matrix.copy(wt.matrix),X.matrix.decompose(X.position,X.quaternion,X.scale)),re===!0&&X.cameras.push(wt)}const Ie=a.enabledFeatures;if(Ie&&Ie.includes("depth-sensing")&&a.depthUsage=="gpu-optimized"&&b){g=r.getBinding();const ht=g.getDepthInformation(fe[0]);ht&&ht.isValid&&ht.texture&&M.init(ht,a.renderState)}if(Ie&&Ie.includes("camera-access")&&b){e.state.unbindTexture(),g=r.getBinding();for(let ht=0;ht<fe.length;ht++){const Ut=fe[ht].camera;if(Ut){let Rt=S[Ut];Rt||(Rt=new Ny,S[Ut]=Rt);const wt=g.getCameraImage(Ut);Rt.sourceTexture=wt}}}}for(let fe=0;fe<I.length;fe++){const re=L[fe],Ie=I[fe];re!==null&&Ie!==void 0&&Ie.update(re,ge,f||c)}Re&&Re(B,ge),ge.detectedPlanes&&r.dispatchEvent({type:"planesdetected",data:ge}),E=null}const Ne=new Uy;Ne.setAnimationLoop(xe),this.setAnimationLoop=function(B){Re=B},this.dispose=function(){}}}const rP=new rn,Hy=new pt;Hy.set(-1,0,0,0,1,0,0,0,1);function sP(i,e){function t(M,S){M.matrixAutoUpdate===!0&&M.updateMatrix(),S.value.copy(M.matrix)}function r(M,S){S.color.getRGB(M.fogColor.value,Ly(i)),S.isFog?(M.fogNear.value=S.near,M.fogFar.value=S.far):S.isFogExp2&&(M.fogDensity.value=S.density)}function a(M,S,A,D,C){S.isNodeMaterial?S.uniformsNeedUpdate=!1:S.isMeshBasicMaterial?l(M,S):S.isMeshLambertMaterial?(l(M,S),S.envMap&&(M.envMapIntensity.value=S.envMapIntensity)):S.isMeshToonMaterial?(l(M,S),g(M,S)):S.isMeshPhongMaterial?(l(M,S),v(M,S),S.envMap&&(M.envMapIntensity.value=S.envMapIntensity)):S.isMeshStandardMaterial?(l(M,S),p(M,S),S.isMeshPhysicalMaterial&&y(M,S,C)):S.isMeshMatcapMaterial?(l(M,S),E(M,S)):S.isMeshDepthMaterial?l(M,S):S.isMeshDistanceMaterial?(l(M,S),b(M,S)):S.isMeshNormalMaterial?l(M,S):S.isLineBasicMaterial?(c(M,S),S.isLineDashedMaterial&&h(M,S)):S.isPointsMaterial?d(M,S,A,D):S.isSpriteMaterial?f(M,S):S.isShadowMaterial?(M.color.value.copy(S.color),M.opacity.value=S.opacity):S.isShaderMaterial&&(S.uniformsNeedUpdate=!1)}function l(M,S){M.opacity.value=S.opacity,S.color&&M.diffuse.value.copy(S.color),S.emissive&&M.emissive.value.copy(S.emissive).multiplyScalar(S.emissiveIntensity),S.map&&(M.map.value=S.map,t(S.map,M.mapTransform)),S.alphaMap&&(M.alphaMap.value=S.alphaMap,t(S.alphaMap,M.alphaMapTransform)),S.bumpMap&&(M.bumpMap.value=S.bumpMap,t(S.bumpMap,M.bumpMapTransform),M.bumpScale.value=S.bumpScale,S.side===di&&(M.bumpScale.value*=-1)),S.normalMap&&(M.normalMap.value=S.normalMap,t(S.normalMap,M.normalMapTransform),M.normalScale.value.copy(S.normalScale),S.side===di&&M.normalScale.value.negate()),S.displacementMap&&(M.displacementMap.value=S.displacementMap,t(S.displacementMap,M.displacementMapTransform),M.displacementScale.value=S.displacementScale,M.displacementBias.value=S.displacementBias),S.emissiveMap&&(M.emissiveMap.value=S.emissiveMap,t(S.emissiveMap,M.emissiveMapTransform)),S.specularMap&&(M.specularMap.value=S.specularMap,t(S.specularMap,M.specularMapTransform)),S.alphaTest>0&&(M.alphaTest.value=S.alphaTest);const A=e.get(S),D=A.envMap,C=A.envMapRotation;D&&(M.envMap.value=D,M.envMapRotation.value.setFromMatrix4(rP.makeRotationFromEuler(C)).transpose(),D.isCubeTexture&&D.isRenderTargetTexture===!1&&M.envMapRotation.value.premultiply(Hy),M.reflectivity.value=S.reflectivity,M.ior.value=S.ior,M.refractionRatio.value=S.refractionRatio),S.lightMap&&(M.lightMap.value=S.lightMap,M.lightMapIntensity.value=S.lightMapIntensity,t(S.lightMap,M.lightMapTransform)),S.aoMap&&(M.aoMap.value=S.aoMap,M.aoMapIntensity.value=S.aoMapIntensity,t(S.aoMap,M.aoMapTransform))}function c(M,S){M.diffuse.value.copy(S.color),M.opacity.value=S.opacity,S.map&&(M.map.value=S.map,t(S.map,M.mapTransform))}function h(M,S){M.dashSize.value=S.dashSize,M.totalSize.value=S.dashSize+S.gapSize,M.scale.value=S.scale}function d(M,S,A,D){M.diffuse.value.copy(S.color),M.opacity.value=S.opacity,M.size.value=S.size*A,M.scale.value=D*.5,S.map&&(M.map.value=S.map,t(S.map,M.uvTransform)),S.alphaMap&&(M.alphaMap.value=S.alphaMap,t(S.alphaMap,M.alphaMapTransform)),S.alphaTest>0&&(M.alphaTest.value=S.alphaTest)}function f(M,S){M.diffuse.value.copy(S.color),M.opacity.value=S.opacity,M.rotation.value=S.rotation,S.map&&(M.map.value=S.map,t(S.map,M.mapTransform)),S.alphaMap&&(M.alphaMap.value=S.alphaMap,t(S.alphaMap,M.alphaMapTransform)),S.alphaTest>0&&(M.alphaTest.value=S.alphaTest)}function v(M,S){M.specular.value.copy(S.specular),M.shininess.value=Math.max(S.shininess,1e-4)}function g(M,S){S.gradientMap&&(M.gradientMap.value=S.gradientMap)}function p(M,S){M.metalness.value=S.metalness,S.metalnessMap&&(M.metalnessMap.value=S.metalnessMap,t(S.metalnessMap,M.metalnessMapTransform)),M.roughness.value=S.roughness,S.roughnessMap&&(M.roughnessMap.value=S.roughnessMap,t(S.roughnessMap,M.roughnessMapTransform)),S.envMap&&(M.envMapIntensity.value=S.envMapIntensity)}function y(M,S,A){M.ior.value=S.ior,S.sheen>0&&(M.sheenColor.value.copy(S.sheenColor).multiplyScalar(S.sheen),M.sheenRoughness.value=S.sheenRoughness,S.sheenColorMap&&(M.sheenColorMap.value=S.sheenColorMap,t(S.sheenColorMap,M.sheenColorMapTransform)),S.sheenRoughnessMap&&(M.sheenRoughnessMap.value=S.sheenRoughnessMap,t(S.sheenRoughnessMap,M.sheenRoughnessMapTransform))),S.clearcoat>0&&(M.clearcoat.value=S.clearcoat,M.clearcoatRoughness.value=S.clearcoatRoughness,S.clearcoatMap&&(M.clearcoatMap.value=S.clearcoatMap,t(S.clearcoatMap,M.clearcoatMapTransform)),S.clearcoatRoughnessMap&&(M.clearcoatRoughnessMap.value=S.clearcoatRoughnessMap,t(S.clearcoatRoughnessMap,M.clearcoatRoughnessMapTransform)),S.clearcoatNormalMap&&(M.clearcoatNormalMap.value=S.clearcoatNormalMap,t(S.clearcoatNormalMap,M.clearcoatNormalMapTransform),M.clearcoatNormalScale.value.copy(S.clearcoatNormalScale),S.side===di&&M.clearcoatNormalScale.value.negate())),S.dispersion>0&&(M.dispersion.value=S.dispersion),S.iridescence>0&&(M.iridescence.value=S.iridescence,M.iridescenceIOR.value=S.iridescenceIOR,M.iridescenceThicknessMinimum.value=S.iridescenceThicknessRange[0],M.iridescenceThicknessMaximum.value=S.iridescenceThicknessRange[1],S.iridescenceMap&&(M.iridescenceMap.value=S.iridescenceMap,t(S.iridescenceMap,M.iridescenceMapTransform)),S.iridescenceThicknessMap&&(M.iridescenceThicknessMap.value=S.iridescenceThicknessMap,t(S.iridescenceThicknessMap,M.iridescenceThicknessMapTransform))),S.transmission>0&&(M.transmission.value=S.transmission,M.transmissionSamplerMap.value=A.texture,M.transmissionSamplerSize.value.set(A.width,A.height),S.transmissionMap&&(M.transmissionMap.value=S.transmissionMap,t(S.transmissionMap,M.transmissionMapTransform)),M.thickness.value=S.thickness,S.thicknessMap&&(M.thicknessMap.value=S.thicknessMap,t(S.thicknessMap,M.thicknessMapTransform)),M.attenuationDistance.value=S.attenuationDistance,M.attenuationColor.value.copy(S.attenuationColor)),S.anisotropy>0&&(M.anisotropyVector.value.set(S.anisotropy*Math.cos(S.anisotropyRotation),S.anisotropy*Math.sin(S.anisotropyRotation)),S.anisotropyMap&&(M.anisotropyMap.value=S.anisotropyMap,t(S.anisotropyMap,M.anisotropyMapTransform))),M.specularIntensity.value=S.specularIntensity,M.specularColor.value.copy(S.specularColor),S.specularColorMap&&(M.specularColorMap.value=S.specularColorMap,t(S.specularColorMap,M.specularColorMapTransform)),S.specularIntensityMap&&(M.specularIntensityMap.value=S.specularIntensityMap,t(S.specularIntensityMap,M.specularIntensityMapTransform))}function E(M,S){S.matcap&&(M.matcap.value=S.matcap)}function b(M,S){const A=e.get(S).light;M.referencePosition.value.setFromMatrixPosition(A.matrixWorld),M.nearDistance.value=A.shadow.camera.near,M.farDistance.value=A.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:a}}function aP(i,e,t,r){let a={},l={},c=[];const h=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function d(C,I){const L=I.program;r.uniformBlockBinding(C,L)}function f(C,I){let L=a[C.id];L===void 0&&(M(C),L=v(C),a[C.id]=L,C.addEventListener("dispose",A));const U=I.program;r.updateUBOMapping(C,U);const w=e.render.frame;l[C.id]!==w&&(p(C),l[C.id]=w)}function v(C){const I=g();C.__bindingPointIndex=I;const L=i.createBuffer(),U=C.__size,w=C.usage;return i.bindBuffer(i.UNIFORM_BUFFER,L),i.bufferData(i.UNIFORM_BUFFER,U,w),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,I,L),L}function g(){for(let C=0;C<h;C++)if(c.indexOf(C)===-1)return c.push(C),C;return Nt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function p(C){const I=a[C.id],L=C.uniforms,U=C.__cache;i.bindBuffer(i.UNIFORM_BUFFER,I);for(let w=0,N=L.length;w<N;w++){const H=L[w];if(Array.isArray(H))for(let V=0,X=H.length;V<X;V++)y(H[V],w,V,U);else y(H,w,0,U)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function y(C,I,L,U){if(b(C,I,L,U)===!0){const w=C.__offset,N=C.value;if(Array.isArray(N)){let H=0;for(let V=0;V<N.length;V++){const X=N[V],j=S(X);E(X,C.__data,H),typeof X!="number"&&typeof X!="boolean"&&!X.isMatrix3&&!ArrayBuffer.isView(X)&&(H+=j.storage/Float32Array.BYTES_PER_ELEMENT)}}else E(N,C.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,w,C.__data)}}function E(C,I,L){typeof C=="number"||typeof C=="boolean"?I[0]=C:C.isMatrix3?(I[0]=C.elements[0],I[1]=C.elements[1],I[2]=C.elements[2],I[3]=0,I[4]=C.elements[3],I[5]=C.elements[4],I[6]=C.elements[5],I[7]=0,I[8]=C.elements[6],I[9]=C.elements[7],I[10]=C.elements[8],I[11]=0):ArrayBuffer.isView(C)?I.set(new C.constructor(C.buffer,C.byteOffset,I.length)):C.toArray(I,L)}function b(C,I,L,U){const w=C.value,N=I+"_"+L;if(U[N]===void 0)return typeof w=="number"||typeof w=="boolean"?U[N]=w:ArrayBuffer.isView(w)?U[N]=w.slice():U[N]=w.clone(),!0;{const H=U[N];if(typeof w=="number"||typeof w=="boolean"){if(H!==w)return U[N]=w,!0}else{if(ArrayBuffer.isView(w))return!0;if(H.equals(w)===!1)return H.copy(w),!0}}return!1}function M(C){const I=C.uniforms;let L=0;const U=16;for(let N=0,H=I.length;N<H;N++){const V=Array.isArray(I[N])?I[N]:[I[N]];for(let X=0,j=V.length;X<j;X++){const he=V[X],$=Array.isArray(he.value)?he.value:[he.value];for(let oe=0,Q=$.length;oe<Q;oe++){const q=$[oe],Y=S(q),Z=L%U,O=Z%Y.boundary,ne=Z+O;L+=O,ne!==0&&U-ne<Y.storage&&(L+=U-ne),he.__data=new Float32Array(Y.storage/Float32Array.BYTES_PER_ELEMENT),he.__offset=L,L+=Y.storage}}}const w=L%U;return w>0&&(L+=U-w),C.__size=L,C.__cache={},this}function S(C){const I={boundary:0,storage:0};return typeof C=="number"||typeof C=="boolean"?(I.boundary=4,I.storage=4):C.isVector2?(I.boundary=8,I.storage=8):C.isVector3||C.isColor?(I.boundary=16,I.storage=12):C.isVector4?(I.boundary=16,I.storage=16):C.isMatrix3?(I.boundary=48,I.storage=48):C.isMatrix4?(I.boundary=64,I.storage=64):C.isTexture?ot("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(C)?(I.boundary=16,I.storage=C.byteLength):ot("WebGLRenderer: Unsupported uniform value type.",C),I}function A(C){const I=C.target;I.removeEventListener("dispose",A);const L=c.indexOf(I.__bindingPointIndex);c.splice(L,1),i.deleteBuffer(a[I.id]),delete a[I.id],delete l[I.id]}function D(){for(const C in a)i.deleteBuffer(a[C]);c=[],a={},l={}}return{bind:d,update:f,dispose:D}}const oP=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let ar=null;function lP(){return ar===null&&(ar=new Hb(oP,16,16,Ra,Yr),ar.name="DFG_LUT",ar.minFilter=jn,ar.magFilter=jn,ar.wrapS=Wr,ar.wrapT=Wr,ar.generateMipmaps=!1,ar.needsUpdate=!0),ar}class cP{constructor(e={}){const{canvas:t=vb(),context:r=null,depth:a=!0,stencil:l=!1,alpha:c=!1,antialias:h=!1,premultipliedAlpha:d=!0,preserveDrawingBuffer:f=!1,powerPreference:v="default",failIfMajorPerformanceCaveat:g=!1,reversedDepthBuffer:p=!1,outputBufferType:y=Si}=e;this.isWebGLRenderer=!0;let E;if(r!==null){if(typeof WebGLRenderingContext<"u"&&r instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");E=r.getContextAttributes().alpha}else E=c;const b=y,M=new Set([Um,Im,Dm]),S=new Set([Si,yr,Xl,$l,Nm,Lm]),A=new Uint32Array(4),D=new Int32Array(4),C=new ie;let I=null,L=null;const U=[],w=[];let N=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=xr,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const H=this;let V=!1,X=null,j=null,he=null,$=null;this._outputColorSpace=hi;let oe=0,Q=0,q=null,Y=-1,Z=null;const O=new cn,ne=new cn;let Re=null;const xe=new _t(0);let Ne=0,B=t.width,ge=t.height,fe=1,re=null,Ie=null;const qe=new cn(0,0,B,ge),jt=new cn(0,0,B,ge);let ht=!1;const Ut=new zm;let Rt=!1,wt=!1;const Zt=new rn,un=new ie,hn=new cn,sn={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Bt=!1;function Jt(){return q===null?fe:1}let ee=r;function Pn(P,te){return t.getContext(P,te)}try{const P={alpha:!0,depth:a,stencil:l,antialias:h,premultipliedAlpha:d,preserveDrawingBuffer:f,powerPreference:v,failIfMajorPerformanceCaveat:g};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Rm}`),t.addEventListener("webglcontextlost",Wt,!1),t.addEventListener("webglcontextrestored",kt,!1),t.addEventListener("webglcontextcreationerror",Fn,!1),ee===null){const te="webgl2";if(ee=Pn(te,P),ee===null)throw Pn(te)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(P){throw Nt("WebGLRenderer: "+P.message),P}let Lt,F,T,se,de,ve,Te,Ue,_e,Se,ke,Ze,Oe,De,nt,rt,lt,K,Le,ye,Fe,ze,Me;function Ke(){Lt=new lA(ee),Lt.init(),Fe=new J2(ee,Lt),F=new eA(ee,Lt,e,Fe),T=new Q2(ee,Lt),F.reversedDepthBuffer&&p&&T.buffers.depth.setReversed(!0),j=ee.createFramebuffer(),he=ee.createFramebuffer(),$=ee.createFramebuffer(),se=new hA(ee),de=new k2,ve=new Z2(ee,Lt,T,de,F,Fe,se),Te=new oA(H),Ue=new mT(ee),ze=new ZR(ee,Ue),_e=new cA(ee,Ue,se,ze),Se=new fA(ee,_e,Ue,ze,se),K=new dA(ee,F,ve),nt=new tA(de),ke=new F2(H,Te,Lt,F,ze,nt),Ze=new sP(H,de),Oe=new z2,De=new W2(Lt),lt=new QR(H,Te,T,Se,E,d),rt=new Y2(H,Se,F),Me=new aP(ee,se,F,T),Le=new JR(ee,Lt,se),ye=new uA(ee,Lt,se),se.programs=ke.programs,H.capabilities=F,H.extensions=Lt,H.properties=de,H.renderLists=Oe,H.shadowMap=rt,H.state=T,H.info=se}Ke(),b!==Si&&(N=new mA(b,t.width,t.height,h,a,l));const Xe=new iP(H,ee);this.xr=Xe,this.getContext=function(){return ee},this.getContextAttributes=function(){return ee.getContextAttributes()},this.forceContextLoss=function(){const P=Lt.get("WEBGL_lose_context");P&&P.loseContext()},this.forceContextRestore=function(){const P=Lt.get("WEBGL_lose_context");P&&P.restoreContext()},this.getPixelRatio=function(){return fe},this.setPixelRatio=function(P){P!==void 0&&(fe=P,this.setSize(B,ge,!1))},this.getSize=function(P){return P.set(B,ge)},this.setSize=function(P,te,pe=!0){if(Xe.isPresenting){ot("WebGLRenderer: Can't change size while VR device is presenting.");return}B=P,ge=te,t.width=Math.floor(P*fe),t.height=Math.floor(te*fe),pe===!0&&(t.style.width=P+"px",t.style.height=te+"px"),N!==null&&N.setSize(t.width,t.height),this.setViewport(0,0,P,te)},this.getDrawingBufferSize=function(P){return P.set(B*fe,ge*fe).floor()},this.setDrawingBufferSize=function(P,te,pe){B=P,ge=te,fe=pe,t.width=Math.floor(P*pe),t.height=Math.floor(te*pe),this.setViewport(0,0,P,te)},this.setEffects=function(P){if(b===Si){Nt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(P){for(let te=0;te<P.length;te++)if(P[te].isOutputPass===!0){ot("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}N.setEffects(P||[])},this.getCurrentViewport=function(P){return P.copy(O)},this.getViewport=function(P){return P.copy(qe)},this.setViewport=function(P,te,pe,ce){P.isVector4?qe.set(P.x,P.y,P.z,P.w):qe.set(P,te,pe,ce),T.viewport(O.copy(qe).multiplyScalar(fe).round())},this.getScissor=function(P){return P.copy(jt)},this.setScissor=function(P,te,pe,ce){P.isVector4?jt.set(P.x,P.y,P.z,P.w):jt.set(P,te,pe,ce),T.scissor(ne.copy(jt).multiplyScalar(fe).round())},this.getScissorTest=function(){return ht},this.setScissorTest=function(P){T.setScissorTest(ht=P)},this.setOpaqueSort=function(P){re=P},this.setTransparentSort=function(P){Ie=P},this.getClearColor=function(P){return P.copy(lt.getClearColor())},this.setClearColor=function(){lt.setClearColor(...arguments)},this.getClearAlpha=function(){return lt.getClearAlpha()},this.setClearAlpha=function(){lt.setClearAlpha(...arguments)},this.clear=function(P=!0,te=!0,pe=!0){let ce=0;if(P){let le=!1;if(q!==null){const Pe=q.texture.format;le=M.has(Pe)}if(le){const Pe=q.texture.type,je=S.has(Pe),Ae=lt.getClearColor(),Ye=lt.getClearAlpha(),tt=Ae.r,dt=Ae.g,ft=Ae.b;je?(A[0]=tt,A[1]=dt,A[2]=ft,A[3]=Ye,ee.clearBufferuiv(ee.COLOR,0,A)):(D[0]=tt,D[1]=dt,D[2]=ft,D[3]=Ye,ee.clearBufferiv(ee.COLOR,0,D))}else ce|=ee.COLOR_BUFFER_BIT}te&&(ce|=ee.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),pe&&(ce|=ee.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),ce!==0&&ee.clear(ce)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(P){P.setRenderer(this),X=P},this.dispose=function(){t.removeEventListener("webglcontextlost",Wt,!1),t.removeEventListener("webglcontextrestored",kt,!1),t.removeEventListener("webglcontextcreationerror",Fn,!1),lt.dispose(),Oe.dispose(),De.dispose(),de.dispose(),Te.dispose(),Se.dispose(),ze.dispose(),Me.dispose(),ke.dispose(),Xe.dispose(),Xe.removeEventListener("sessionstart",lc),Xe.removeEventListener("sessionend",cc),Xn.stop()};function Wt(P){P.preventDefault(),Qx("WebGLRenderer: Context Lost."),V=!0}function kt(){Qx("WebGLRenderer: Context Restored."),V=!1;const P=se.autoReset,te=rt.enabled,pe=rt.autoUpdate,ce=rt.needsUpdate,le=rt.type;Ke(),se.autoReset=P,rt.enabled=te,rt.autoUpdate=pe,rt.needsUpdate=ce,rt.type=le}function Fn(P){Nt("WebGLRenderer: A WebGL context could not be created. Reason: ",P.statusMessage)}function wi(P){const te=P.target;te.removeEventListener("dispose",wi),Gs(te)}function Gs(P){Aa(P),de.remove(P)}function Aa(P){const te=de.get(P).programs;te!==void 0&&(te.forEach(function(pe){ke.releaseProgram(pe)}),P.isShaderMaterial&&ke.releaseShaderCache(P))}this.renderBufferDirect=function(P,te,pe,ce,le,Pe){te===null&&(te=sn);const je=le.isMesh&&le.matrixWorld.determinantAffine()<0,Ae=an(P,te,pe,ce,le);T.setMaterial(ce,je);let Ye=pe.index,tt=1;if(ce.wireframe===!0){if(Ye=_e.getWireframeAttribute(pe),Ye===void 0)return;tt=2}const dt=pe.drawRange,ft=pe.attributes.position;let Je=dt.start*tt,At=(dt.start+dt.count)*tt;Pe!==null&&(Je=Math.max(Je,Pe.start*tt),At=Math.min(At,(Pe.start+Pe.count)*tt)),Ye!==null?(Je=Math.max(Je,0),At=Math.min(At,Ye.count)):ft!=null&&(Je=Math.max(Je,0),At=Math.min(At,ft.count));const $t=At-Je;if($t<0||$t===1/0)return;ze.setup(le,ce,Ae,pe,Ye);let en,Vt=Le;if(Ye!==null&&(en=Ue.get(Ye),Vt=ye,Vt.setIndex(en)),le.isMesh)ce.wireframe===!0?(T.setLineWidth(ce.wireframeLinewidth*Jt()),Vt.setMode(ee.LINES)):Vt.setMode(ee.TRIANGLES);else if(le.isLine){let mn=ce.linewidth;mn===void 0&&(mn=1),T.setLineWidth(mn*Jt()),le.isLineSegments?Vt.setMode(ee.LINES):le.isLineLoop?Vt.setMode(ee.LINE_LOOP):Vt.setMode(ee.LINE_STRIP)}else le.isPoints?Vt.setMode(ee.POINTS):le.isSprite&&Vt.setMode(ee.TRIANGLES);if(le.isBatchedMesh)if(Lt.get("WEBGL_multi_draw"))Vt.renderMultiDraw(le._multiDrawStarts,le._multiDrawCounts,le._multiDrawCount);else{const mn=le._multiDrawStarts,He=le._multiDrawCounts,Nn=le._multiDrawCount,yt=Ye?Ue.get(Ye).bytesPerElement:1,Jn=de.get(ce).currentProgram.getUniforms();for(let ei=0;ei<Nn;ei++)Jn.setValue(ee,"_gl_DrawID",ei),Vt.render(mn[ei]/yt,He[ei])}else if(le.isInstancedMesh)Vt.renderInstances(Je,$t,le.count);else if(pe.isInstancedBufferGeometry){const mn=pe._maxInstanceCount!==void 0?pe._maxInstanceCount:1/0,He=Math.min(pe.instanceCount,mn);Vt.renderInstances(Je,$t,He)}else Vt.render(Je,$t)};function js(P,te,pe){P.transparent===!0&&P.side===Gr&&P.forceSinglePass===!1?(P.side=di,P.needsUpdate=!0,$s(P,te,pe),P.side=Bs,P.needsUpdate=!0,$s(P,te,pe),P.side=Gr):$s(P,te,pe)}this.compile=function(P,te,pe=null){pe===null&&(pe=P),L=De.get(pe),L.init(te),w.push(L),pe.traverseVisible(function(le){le.isLight&&le.layers.test(te.layers)&&(L.pushLight(le),le.castShadow&&L.pushShadow(le))}),P!==pe&&P.traverseVisible(function(le){le.isLight&&le.layers.test(te.layers)&&(L.pushLight(le),le.castShadow&&L.pushShadow(le))}),L.setupLights();const ce=new Set;return P.traverse(function(le){if(!(le.isMesh||le.isPoints||le.isLine||le.isSprite))return;const Pe=le.material;if(Pe)if(Array.isArray(Pe))for(let je=0;je<Pe.length;je++){const Ae=Pe[je];js(Ae,pe,le),ce.add(Ae)}else js(Pe,pe,le),ce.add(Pe)}),L=w.pop(),ce},this.compileAsync=function(P,te,pe=null){const ce=this.compile(P,te,pe);return new Promise(le=>{function Pe(){if(ce.forEach(function(je){de.get(je).currentProgram.isReady()&&ce.delete(je)}),ce.size===0){le(P);return}setTimeout(Pe,10)}Lt.get("KHR_parallel_shader_compile")!==null?Pe():setTimeout(Pe,10)})};let Ws=null;function Ch(P){Ws&&Ws(P)}function lc(){Xn.stop()}function cc(){Xn.start()}const Xn=new Uy;Xn.setAnimationLoop(Ch),typeof self<"u"&&Xn.setContext(self),this.setAnimationLoop=function(P){Ws=P,Xe.setAnimationLoop(P),P===null?Xn.stop():Xn.start()},Xe.addEventListener("sessionstart",lc),Xe.addEventListener("sessionend",cc),this.render=function(P,te){if(te!==void 0&&te.isCamera!==!0){Nt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(V===!0)return;X!==null&&X.renderStart(P,te);const pe=Xe.enabled===!0&&Xe.isPresenting===!0,ce=N!==null&&(q===null||pe)&&N.begin(H,q);if(P.matrixWorldAutoUpdate===!0&&P.updateMatrixWorld(),te.parent===null&&te.matrixWorldAutoUpdate===!0&&te.updateMatrixWorld(),Xe.enabled===!0&&Xe.isPresenting===!0&&(N===null||N.isCompositing()===!1)&&(Xe.cameraAutoUpdate===!0&&Xe.updateCamera(te),te=Xe.getCamera()),P.isScene===!0&&P.onBeforeRender(H,P,te,q),L=De.get(P,w.length),L.init(te),L.state.textureUnits=ve.getTextureUnits(),w.push(L),Zt.multiplyMatrices(te.projectionMatrix,te.matrixWorldInverse),Ut.setFromProjectionMatrix(Zt,mr,te.reversedDepth),wt=this.localClippingEnabled,Rt=nt.init(this.clippingPlanes,wt),I=Oe.get(P,U.length),I.init(),U.push(I),Xe.enabled===!0&&Xe.isPresenting===!0){const je=H.xr.getDepthSensingMesh();je!==null&&Pa(je,te,-1/0,H.sortObjects)}Pa(P,te,0,H.sortObjects),I.finish(),H.sortObjects===!0&&I.sort(re,Ie,te.reversedDepth),Bt=Xe.enabled===!1||Xe.isPresenting===!1||Xe.hasDepthSensing()===!1,Bt&&lt.addToRenderList(I,P),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),Rt===!0&&nt.beginShadows();const le=L.state.shadowsArray;if(rt.render(le,P,te),Rt===!0&&nt.endShadows(),(ce&&N.hasRenderPass())===!1){const je=I.opaque,Ae=I.transmissive;if(L.setupLights(),te.isArrayCamera){const Ye=te.cameras;if(Ae.length>0)for(let tt=0,dt=Ye.length;tt<dt;tt++){const ft=Ye[tt];uc(je,Ae,P,ft)}Bt&&lt.render(P);for(let tt=0,dt=Ye.length;tt<dt;tt++){const ft=Ye[tt];Wo(I,P,ft,ft.viewport)}}else Ae.length>0&&uc(je,Ae,P,te),Bt&&lt.render(P),Wo(I,P,te)}q!==null&&Q===0&&(ve.updateMultisampleRenderTarget(q),ve.updateRenderTargetMipmap(q)),ce&&N.end(H),P.isScene===!0&&P.onAfterRender(H,P,te),ze.resetDefaultState(),Y=-1,Z=null,w.pop(),w.length>0?(L=w[w.length-1],ve.setTextureUnits(L.state.textureUnits),Rt===!0&&nt.setGlobalState(H.clippingPlanes,L.state.camera)):L=null,U.pop(),U.length>0?I=U[U.length-1]:I=null,X!==null&&X.renderEnd()};function Pa(P,te,pe,ce){if(P.visible===!1)return;if(P.layers.test(te.layers)){if(P.isGroup)pe=P.renderOrder;else if(P.isLOD)P.autoUpdate===!0&&P.update(te);else if(P.isLightProbeGrid)L.pushLightProbeGrid(P);else if(P.isLight)L.pushLight(P),P.castShadow&&L.pushShadow(P);else if(P.isSprite){if(!P.frustumCulled||Ut.intersectsSprite(P)){ce&&hn.setFromMatrixPosition(P.matrixWorld).applyMatrix4(Zt);const je=Se.update(P),Ae=P.material;Ae.visible&&I.push(P,je,Ae,pe,hn.z,null)}}else if((P.isMesh||P.isLine||P.isPoints)&&(!P.frustumCulled||Ut.intersectsObject(P))){const je=Se.update(P),Ae=P.material;if(ce&&(P.boundingSphere!==void 0?(P.boundingSphere===null&&P.computeBoundingSphere(),hn.copy(P.boundingSphere.center)):(je.boundingSphere===null&&je.computeBoundingSphere(),hn.copy(je.boundingSphere.center)),hn.applyMatrix4(P.matrixWorld).applyMatrix4(Zt)),Array.isArray(Ae)){const Ye=je.groups;for(let tt=0,dt=Ye.length;tt<dt;tt++){const ft=Ye[tt],Je=Ae[ft.materialIndex];Je&&Je.visible&&I.push(P,je,Je,pe,hn.z,ft)}}else Ae.visible&&I.push(P,je,Ae,pe,hn.z,null)}}const Pe=P.children;for(let je=0,Ae=Pe.length;je<Ae;je++)Pa(Pe[je],te,pe,ce)}function Wo(P,te,pe,ce){const{opaque:le,transmissive:Pe,transparent:je}=P;L.setupLightsView(pe),Rt===!0&&nt.setGlobalState(H.clippingPlanes,pe),ce&&T.viewport(O.copy(ce)),le.length>0&&Xs(le,te,pe),Pe.length>0&&Xs(Pe,te,pe),je.length>0&&Xs(je,te,pe),T.buffers.depth.setTest(!0),T.buffers.depth.setMask(!0),T.buffers.color.setMask(!0),T.setPolygonOffset(!1)}function uc(P,te,pe,ce){if((pe.isScene===!0?pe.overrideMaterial:null)!==null)return;if(L.state.transmissionRenderTarget[ce.id]===void 0){const Je=Lt.has("EXT_color_buffer_half_float")||Lt.has("EXT_color_buffer_float");L.state.transmissionRenderTarget[ce.id]=new vr(1,1,{generateMipmaps:!0,type:Je?Yr:Si,minFilter:ma,samples:Math.max(4,F.samples),stencilBuffer:l,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Tt.workingColorSpace})}const Pe=L.state.transmissionRenderTarget[ce.id],je=ce.viewport||O;Pe.setSize(je.z*H.transmissionResolutionScale,je.w*H.transmissionResolutionScale);const Ae=H.getRenderTarget(),Ye=H.getActiveCubeFace(),tt=H.getActiveMipmapLevel();H.setRenderTarget(Pe),H.getClearColor(xe),Ne=H.getClearAlpha(),Ne<1&&H.setClearColor(16777215,.5),H.clear(),Bt&&lt.render(pe);const dt=H.toneMapping;H.toneMapping=xr;const ft=ce.viewport;if(ce.viewport!==void 0&&(ce.viewport=void 0),L.setupLightsView(ce),Rt===!0&&nt.setGlobalState(H.clippingPlanes,ce),Xs(P,pe,ce),ve.updateMultisampleRenderTarget(Pe),ve.updateRenderTargetMipmap(Pe),Lt.has("WEBGL_multisampled_render_to_texture")===!1){let Je=!1;for(let At=0,$t=te.length;At<$t;At++){const en=te[At],{object:Vt,geometry:mn,material:He,group:Nn}=en;if(He.side===Gr&&Vt.layers.test(ce.layers)){const yt=He.side;He.side=di,He.needsUpdate=!0,Xo(Vt,pe,ce,mn,He,Nn),He.side=yt,He.needsUpdate=!0,Je=!0}}Je===!0&&(ve.updateMultisampleRenderTarget(Pe),ve.updateRenderTargetMipmap(Pe))}H.setRenderTarget(Ae,Ye,tt),H.setClearColor(xe,Ne),ft!==void 0&&(ce.viewport=ft),H.toneMapping=dt}function Xs(P,te,pe){const ce=te.isScene===!0?te.overrideMaterial:null;for(let le=0,Pe=P.length;le<Pe;le++){const je=P[le],{object:Ae,geometry:Ye,group:tt}=je;let dt=je.material;dt.allowOverride===!0&&ce!==null&&(dt=ce),Ae.layers.test(pe.layers)&&Xo(Ae,te,pe,Ye,dt,tt)}}function Xo(P,te,pe,ce,le,Pe){P.onBeforeRender(H,te,pe,ce,le,Pe),P.modelViewMatrix.multiplyMatrices(pe.matrixWorldInverse,P.matrixWorld),P.normalMatrix.getNormalMatrix(P.modelViewMatrix),le.onBeforeRender(H,te,pe,ce,P,Pe),le.transparent===!0&&le.side===Gr&&le.forceSinglePass===!1?(le.side=di,le.needsUpdate=!0,H.renderBufferDirect(pe,te,ce,le,P,Pe),le.side=Bs,le.needsUpdate=!0,H.renderBufferDirect(pe,te,ce,le,P,Pe),le.side=Gr):H.renderBufferDirect(pe,te,ce,le,P,Pe),P.onAfterRender(H,te,pe,ce,le,Pe)}function $s(P,te,pe){te.isScene!==!0&&(te=sn);const ce=de.get(P),le=L.state.lights,Pe=L.state.shadowsArray,je=le.state.version,Ae=ke.getParameters(P,le.state,Pe,te,pe,L.state.lightProbeGridArray),Ye=ke.getProgramCacheKey(Ae);let tt=ce.programs;ce.environment=P.isMeshStandardMaterial||P.isMeshLambertMaterial||P.isMeshPhongMaterial?te.environment:null,ce.fog=te.fog;const dt=P.isMeshStandardMaterial||P.isMeshLambertMaterial&&!P.envMap||P.isMeshPhongMaterial&&!P.envMap;ce.envMap=Te.get(P.envMap||ce.environment,dt),ce.envMapRotation=ce.environment!==null&&P.envMap===null?te.environmentRotation:P.envMapRotation,tt===void 0&&(P.addEventListener("dispose",wi),tt=new Map,ce.programs=tt);let ft=tt.get(Ye);if(ft!==void 0){if(ce.currentProgram===ft&&ce.lightsStateVersion===je)return hc(P,Ae),ft}else Ae.uniforms=ke.getUniforms(P),X!==null&&P.isNodeMaterial&&X.build(P,pe,Ae),P.onBeforeCompile(Ae,H),ft=ke.acquireProgram(Ae,Ye),tt.set(Ye,ft),ce.uniforms=Ae.uniforms;const Je=ce.uniforms;return(!P.isShaderMaterial&&!P.isRawShaderMaterial||P.clipping===!0)&&(Je.clippingPlanes=nt.uniform),hc(P,Ae),ce.needsLights=qo(P),ce.lightsStateVersion=je,ce.needsLights&&(Je.ambientLightColor.value=le.state.ambient,Je.lightProbe.value=le.state.probe,Je.directionalLights.value=le.state.directional,Je.directionalLightShadows.value=le.state.directionalShadow,Je.spotLights.value=le.state.spot,Je.spotLightShadows.value=le.state.spotShadow,Je.rectAreaLights.value=le.state.rectArea,Je.ltc_1.value=le.state.rectAreaLTC1,Je.ltc_2.value=le.state.rectAreaLTC2,Je.pointLights.value=le.state.point,Je.pointLightShadows.value=le.state.pointShadow,Je.hemisphereLights.value=le.state.hemi,Je.directionalShadowMatrix.value=le.state.directionalShadowMatrix,Je.spotLightMatrix.value=le.state.spotLightMatrix,Je.spotLightMap.value=le.state.spotLightMap,Je.pointShadowMatrix.value=le.state.pointShadowMatrix),ce.lightProbeGrid=L.state.lightProbeGridArray.length>0,ce.currentProgram=ft,ce.uniformsList=null,ft}function $o(P){if(P.uniformsList===null){const te=P.currentProgram.getUniforms();P.uniformsList=eh.seqWithValue(te.seq,P.uniforms)}return P.uniformsList}function hc(P,te){const pe=de.get(P);pe.outputColorSpace=te.outputColorSpace,pe.batching=te.batching,pe.batchingColor=te.batchingColor,pe.instancing=te.instancing,pe.instancingColor=te.instancingColor,pe.instancingMorph=te.instancingMorph,pe.skinning=te.skinning,pe.morphTargets=te.morphTargets,pe.morphNormals=te.morphNormals,pe.morphColors=te.morphColors,pe.morphTargetsCount=te.morphTargetsCount,pe.numClippingPlanes=te.numClippingPlanes,pe.numIntersection=te.numClipIntersection,pe.vertexAlphas=te.vertexAlphas,pe.vertexTangents=te.vertexTangents,pe.toneMapping=te.toneMapping}function Rh(P,te){if(P.length===0)return null;if(P.length===1)return P[0].texture!==null?P[0]:null;C.setFromMatrixPosition(te.matrixWorld);for(let pe=0,ce=P.length;pe<ce;pe++){const le=P[pe];if(le.texture!==null&&le.boundingBox.containsPoint(C))return le}return null}function an(P,te,pe,ce,le){te.isScene!==!0&&(te=sn),ve.resetTextureUnits();const Pe=te.fog,je=ce.isMeshStandardMaterial||ce.isMeshLambertMaterial||ce.isMeshPhongMaterial?te.environment:null,Ae=q===null?H.outputColorSpace:q.isXRRenderTarget===!0?q.texture.colorSpace:Tt.workingColorSpace,Ye=ce.isMeshStandardMaterial||ce.isMeshLambertMaterial&&!ce.envMap||ce.isMeshPhongMaterial&&!ce.envMap,tt=Te.get(ce.envMap||je,Ye),dt=ce.vertexColors===!0&&!!pe.attributes.color&&pe.attributes.color.itemSize===4,ft=!!pe.attributes.tangent&&(!!ce.normalMap||ce.anisotropy>0),Je=!!pe.morphAttributes.position,At=!!pe.morphAttributes.normal,$t=!!pe.morphAttributes.color;let en=xr;ce.toneMapped&&(q===null||q.isXRRenderTarget===!0)&&(en=H.toneMapping);const Vt=pe.morphAttributes.position||pe.morphAttributes.normal||pe.morphAttributes.color,mn=Vt!==void 0?Vt.length:0,He=de.get(ce),Nn=L.state.lights;if(Rt===!0&&(wt===!0||P!==Z)){const Ht=P===Z&&ce.id===Y;nt.setState(ce,P,Ht)}let yt=!1;ce.version===He.__version?(He.needsLights&&He.lightsStateVersion!==Nn.state.version||He.outputColorSpace!==Ae||le.isBatchedMesh&&He.batching===!1||!le.isBatchedMesh&&He.batching===!0||le.isBatchedMesh&&He.batchingColor===!0&&le.colorTexture===null||le.isBatchedMesh&&He.batchingColor===!1&&le.colorTexture!==null||le.isInstancedMesh&&He.instancing===!1||!le.isInstancedMesh&&He.instancing===!0||le.isSkinnedMesh&&He.skinning===!1||!le.isSkinnedMesh&&He.skinning===!0||le.isInstancedMesh&&He.instancingColor===!0&&le.instanceColor===null||le.isInstancedMesh&&He.instancingColor===!1&&le.instanceColor!==null||le.isInstancedMesh&&He.instancingMorph===!0&&le.morphTexture===null||le.isInstancedMesh&&He.instancingMorph===!1&&le.morphTexture!==null||He.envMap!==tt||ce.fog===!0&&He.fog!==Pe||He.numClippingPlanes!==void 0&&(He.numClippingPlanes!==nt.numPlanes||He.numIntersection!==nt.numIntersection)||He.vertexAlphas!==dt||He.vertexTangents!==ft||He.morphTargets!==Je||He.morphNormals!==At||He.morphColors!==$t||He.toneMapping!==en||He.morphTargetsCount!==mn||!!He.lightProbeGrid!=L.state.lightProbeGridArray.length>0)&&(yt=!0):(yt=!0,He.__version=ce.version);let Jn=He.currentProgram;yt===!0&&(Jn=$s(ce,te,le),X&&ce.isNodeMaterial&&X.onUpdateProgram(ce,Jn,He));let ei=!1,St=!1,Er=!1;const Ot=Jn.getUniforms(),Kt=He.uniforms;if(T.useProgram(Jn.program)&&(ei=!0,St=!0,Er=!0),ce.id!==Y&&(Y=ce.id,St=!0),He.needsLights){const Ht=Rh(L.state.lightProbeGridArray,le);He.lightProbeGrid!==Ht&&(He.lightProbeGrid=Ht,St=!0)}if(ei||Z!==P){T.buffers.depth.getReversed()&&P.reversedDepth!==!0&&(P._reversedDepth=!0,P.updateProjectionMatrix()),Ot.setValue(ee,"projectionMatrix",P.projectionMatrix),Ot.setValue(ee,"viewMatrix",P.matrixWorldInverse);const ki=Ot.map.cameraPosition;ki!==void 0&&ki.setValue(ee,un.setFromMatrixPosition(P.matrixWorld)),F.logarithmicDepthBuffer&&Ot.setValue(ee,"logDepthBufFC",2/(Math.log(P.far+1)/Math.LN2)),(ce.isMeshPhongMaterial||ce.isMeshToonMaterial||ce.isMeshLambertMaterial||ce.isMeshBasicMaterial||ce.isMeshStandardMaterial||ce.isShaderMaterial)&&Ot.setValue(ee,"isOrthographic",P.isOrthographicCamera===!0),Z!==P&&(Z=P,St=!0,Er=!0)}if(He.needsLights&&(Nn.state.directionalShadowMap.length>0&&Ot.setValue(ee,"directionalShadowMap",Nn.state.directionalShadowMap,ve),Nn.state.spotShadowMap.length>0&&Ot.setValue(ee,"spotShadowMap",Nn.state.spotShadowMap,ve),Nn.state.pointShadowMap.length>0&&Ot.setValue(ee,"pointShadowMap",Nn.state.pointShadowMap,ve)),le.isSkinnedMesh){Ot.setOptional(ee,le,"bindMatrix"),Ot.setOptional(ee,le,"bindMatrixInverse");const Ht=le.skeleton;Ht&&(Ht.boneTexture===null&&Ht.computeBoneTexture(),Ot.setValue(ee,"boneTexture",Ht.boneTexture,ve))}le.isBatchedMesh&&(Ot.setOptional(ee,le,"batchingTexture"),Ot.setValue(ee,"batchingTexture",le._matricesTexture,ve),Ot.setOptional(ee,le,"batchingIdTexture"),Ot.setValue(ee,"batchingIdTexture",le._indirectTexture,ve),Ot.setOptional(ee,le,"batchingColorTexture"),le._colorsTexture!==null&&Ot.setValue(ee,"batchingColorTexture",le._colorsTexture,ve));const Fi=pe.morphAttributes;if((Fi.position!==void 0||Fi.normal!==void 0||Fi.color!==void 0)&&K.update(le,pe,Jn),(St||He.receiveShadow!==le.receiveShadow)&&(He.receiveShadow=le.receiveShadow,Ot.setValue(ee,"receiveShadow",le.receiveShadow)),(ce.isMeshStandardMaterial||ce.isMeshLambertMaterial||ce.isMeshPhongMaterial)&&ce.envMap===null&&te.environment!==null&&(Kt.envMapIntensity.value=te.environmentIntensity),Kt.dfgLUT!==void 0&&(Kt.dfgLUT.value=lP()),St){if(Ot.setValue(ee,"toneMappingExposure",H.toneMappingExposure),He.needsLights&&Ah(Kt,Er),Pe&&ce.fog===!0&&Ze.refreshFogUniforms(Kt,Pe),Ze.refreshMaterialUniforms(Kt,ce,fe,ge,L.state.transmissionRenderTarget[P.id]),He.needsLights&&He.lightProbeGrid){const Ht=He.lightProbeGrid;Kt.probesSH.value=Ht.texture,Kt.probesMin.value.copy(Ht.boundingBox.min),Kt.probesMax.value.copy(Ht.boundingBox.max),Kt.probesResolution.value.copy(Ht.resolution)}eh.upload(ee,$o(He),Kt,ve)}if(ce.isShaderMaterial&&ce.uniformsNeedUpdate===!0&&(eh.upload(ee,$o(He),Kt,ve),ce.uniformsNeedUpdate=!1),ce.isSpriteMaterial&&Ot.setValue(ee,"center",le.center),Ot.setValue(ee,"modelViewMatrix",le.modelViewMatrix),Ot.setValue(ee,"normalMatrix",le.normalMatrix),Ot.setValue(ee,"modelMatrix",le.matrixWorld),ce.uniformsGroups!==void 0){const Ht=ce.uniformsGroups;for(let ki=0,er=Ht.length;ki<er;ki++){const qs=Ht[ki];Me.update(qs,Jn),Me.bind(qs,Jn)}}return Jn}function Ah(P,te){P.ambientLightColor.needsUpdate=te,P.lightProbe.needsUpdate=te,P.directionalLights.needsUpdate=te,P.directionalLightShadows.needsUpdate=te,P.pointLights.needsUpdate=te,P.pointLightShadows.needsUpdate=te,P.spotLights.needsUpdate=te,P.spotLightShadows.needsUpdate=te,P.rectAreaLights.needsUpdate=te,P.hemisphereLights.needsUpdate=te}function qo(P){return P.isMeshLambertMaterial||P.isMeshToonMaterial||P.isMeshPhongMaterial||P.isMeshStandardMaterial||P.isShadowMaterial||P.isShaderMaterial&&P.lights===!0}this.getActiveCubeFace=function(){return oe},this.getActiveMipmapLevel=function(){return Q},this.getRenderTarget=function(){return q},this.setRenderTargetTextures=function(P,te,pe){const ce=de.get(P);ce.__autoAllocateDepthBuffer=P.resolveDepthBuffer===!1,ce.__autoAllocateDepthBuffer===!1&&(ce.__useRenderToTexture=!1),de.get(P.texture).__webglTexture=te,de.get(P.depthTexture).__webglTexture=ce.__autoAllocateDepthBuffer?void 0:pe,ce.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(P,te){const pe=de.get(P);pe.__webglFramebuffer=te,pe.__useDefaultFramebuffer=te===void 0},this.setRenderTarget=function(P,te=0,pe=0){q=P,oe=te,Q=pe;let ce=null,le=!1,Pe=!1;if(P){const Ae=de.get(P);if(Ae.__useDefaultFramebuffer!==void 0){T.bindFramebuffer(ee.FRAMEBUFFER,Ae.__webglFramebuffer),O.copy(P.viewport),ne.copy(P.scissor),Re=P.scissorTest,T.viewport(O),T.scissor(ne),T.setScissorTest(Re),Y=-1;return}else if(Ae.__webglFramebuffer===void 0)ve.setupRenderTarget(P);else if(Ae.__hasExternalTextures)ve.rebindTextures(P,de.get(P.texture).__webglTexture,de.get(P.depthTexture).__webglTexture);else if(P.depthBuffer){const dt=P.depthTexture;if(Ae.__boundDepthTexture!==dt){if(dt!==null&&de.has(dt)&&(P.width!==dt.image.width||P.height!==dt.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");ve.setupDepthRenderbuffer(P)}}const Ye=P.texture;(Ye.isData3DTexture||Ye.isDataArrayTexture||Ye.isCompressedArrayTexture)&&(Pe=!0);const tt=de.get(P).__webglFramebuffer;P.isWebGLCubeRenderTarget?(Array.isArray(tt[te])?ce=tt[te][pe]:ce=tt[te],le=!0):P.samples>0&&ve.useMultisampledRTT(P)===!1?ce=de.get(P).__webglMultisampledFramebuffer:Array.isArray(tt)?ce=tt[pe]:ce=tt,O.copy(P.viewport),ne.copy(P.scissor),Re=P.scissorTest}else O.copy(qe).multiplyScalar(fe).floor(),ne.copy(jt).multiplyScalar(fe).floor(),Re=ht;if(pe!==0&&(ce=j),T.bindFramebuffer(ee.FRAMEBUFFER,ce)&&T.drawBuffers(P,ce),T.viewport(O),T.scissor(ne),T.setScissorTest(Re),le){const Ae=de.get(P.texture);ee.framebufferTexture2D(ee.FRAMEBUFFER,ee.COLOR_ATTACHMENT0,ee.TEXTURE_CUBE_MAP_POSITIVE_X+te,Ae.__webglTexture,pe)}else if(Pe){const Ae=te;for(let Ye=0;Ye<P.textures.length;Ye++){const tt=de.get(P.textures[Ye]);ee.framebufferTextureLayer(ee.FRAMEBUFFER,ee.COLOR_ATTACHMENT0+Ye,tt.__webglTexture,pe,Ae)}}else if(P!==null&&pe!==0){const Ae=de.get(P.texture);ee.framebufferTexture2D(ee.FRAMEBUFFER,ee.COLOR_ATTACHMENT0,ee.TEXTURE_2D,Ae.__webglTexture,pe)}Y=-1},this.readRenderTargetPixels=function(P,te,pe,ce,le,Pe,je,Ae=0){if(!(P&&P.isWebGLRenderTarget)){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ye=de.get(P).__webglFramebuffer;if(P.isWebGLCubeRenderTarget&&je!==void 0&&(Ye=Ye[je]),Ye){T.bindFramebuffer(ee.FRAMEBUFFER,Ye);try{const tt=P.textures[Ae],dt=tt.format,ft=tt.type;if(P.textures.length>1&&ee.readBuffer(ee.COLOR_ATTACHMENT0+Ae),!F.textureFormatReadable(dt)){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!F.textureTypeReadable(ft)){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}te>=0&&te<=P.width-ce&&pe>=0&&pe<=P.height-le&&ee.readPixels(te,pe,ce,le,Fe.convert(dt),Fe.convert(ft),Pe)}finally{const tt=q!==null?de.get(q).__webglFramebuffer:null;T.bindFramebuffer(ee.FRAMEBUFFER,tt)}}},this.readRenderTargetPixelsAsync=async function(P,te,pe,ce,le,Pe,je,Ae=0){if(!(P&&P.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ye=de.get(P).__webglFramebuffer;if(P.isWebGLCubeRenderTarget&&je!==void 0&&(Ye=Ye[je]),Ye)if(te>=0&&te<=P.width-ce&&pe>=0&&pe<=P.height-le){T.bindFramebuffer(ee.FRAMEBUFFER,Ye);const tt=P.textures[Ae],dt=tt.format,ft=tt.type;if(P.textures.length>1&&ee.readBuffer(ee.COLOR_ATTACHMENT0+Ae),!F.textureFormatReadable(dt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!F.textureTypeReadable(ft))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Je=ee.createBuffer();ee.bindBuffer(ee.PIXEL_PACK_BUFFER,Je),ee.bufferData(ee.PIXEL_PACK_BUFFER,Pe.byteLength,ee.STREAM_READ),ee.readPixels(te,pe,ce,le,Fe.convert(dt),Fe.convert(ft),0);const At=q!==null?de.get(q).__webglFramebuffer:null;T.bindFramebuffer(ee.FRAMEBUFFER,At);const $t=ee.fenceSync(ee.SYNC_GPU_COMMANDS_COMPLETE,0);return ee.flush(),await _b(ee,$t,4),ee.bindBuffer(ee.PIXEL_PACK_BUFFER,Je),ee.getBufferSubData(ee.PIXEL_PACK_BUFFER,0,Pe),ee.deleteBuffer(Je),ee.deleteSync($t),Pe}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(P,te=null,pe=0){const ce=Math.pow(2,-pe),le=Math.floor(P.image.width*ce),Pe=Math.floor(P.image.height*ce),je=te!==null?te.x:0,Ae=te!==null?te.y:0;ve.setTexture2D(P,0),ee.copyTexSubImage2D(ee.TEXTURE_2D,pe,0,0,je,Ae,le,Pe),T.unbindTexture()},this.copyTextureToTexture=function(P,te,pe=null,ce=null,le=0,Pe=0){let je,Ae,Ye,tt,dt,ft,Je,At,$t;const en=P.isCompressedTexture?P.mipmaps[Pe]:P.image;if(pe!==null)je=pe.max.x-pe.min.x,Ae=pe.max.y-pe.min.y,Ye=pe.isBox3?pe.max.z-pe.min.z:1,tt=pe.min.x,dt=pe.min.y,ft=pe.isBox3?pe.min.z:0;else{const Kt=Math.pow(2,-le);je=Math.floor(en.width*Kt),Ae=Math.floor(en.height*Kt),P.isDataArrayTexture?Ye=en.depth:P.isData3DTexture?Ye=Math.floor(en.depth*Kt):Ye=1,tt=0,dt=0,ft=0}ce!==null?(Je=ce.x,At=ce.y,$t=ce.z):(Je=0,At=0,$t=0);const Vt=Fe.convert(te.format),mn=Fe.convert(te.type);let He;te.isData3DTexture?(ve.setTexture3D(te,0),He=ee.TEXTURE_3D):te.isDataArrayTexture||te.isCompressedArrayTexture?(ve.setTexture2DArray(te,0),He=ee.TEXTURE_2D_ARRAY):(ve.setTexture2D(te,0),He=ee.TEXTURE_2D),T.activeTexture(ee.TEXTURE0),T.pixelStorei(ee.UNPACK_FLIP_Y_WEBGL,te.flipY),T.pixelStorei(ee.UNPACK_PREMULTIPLY_ALPHA_WEBGL,te.premultiplyAlpha),T.pixelStorei(ee.UNPACK_ALIGNMENT,te.unpackAlignment);const Nn=T.getParameter(ee.UNPACK_ROW_LENGTH),yt=T.getParameter(ee.UNPACK_IMAGE_HEIGHT),Jn=T.getParameter(ee.UNPACK_SKIP_PIXELS),ei=T.getParameter(ee.UNPACK_SKIP_ROWS),St=T.getParameter(ee.UNPACK_SKIP_IMAGES);T.pixelStorei(ee.UNPACK_ROW_LENGTH,en.width),T.pixelStorei(ee.UNPACK_IMAGE_HEIGHT,en.height),T.pixelStorei(ee.UNPACK_SKIP_PIXELS,tt),T.pixelStorei(ee.UNPACK_SKIP_ROWS,dt),T.pixelStorei(ee.UNPACK_SKIP_IMAGES,ft);const Er=P.isDataArrayTexture||P.isData3DTexture,Ot=te.isDataArrayTexture||te.isData3DTexture;if(P.isDepthTexture){const Kt=de.get(P),Fi=de.get(te),Ht=de.get(Kt.__renderTarget),ki=de.get(Fi.__renderTarget);T.bindFramebuffer(ee.READ_FRAMEBUFFER,Ht.__webglFramebuffer),T.bindFramebuffer(ee.DRAW_FRAMEBUFFER,ki.__webglFramebuffer);for(let er=0;er<Ye;er++)Er&&(ee.framebufferTextureLayer(ee.READ_FRAMEBUFFER,ee.COLOR_ATTACHMENT0,de.get(P).__webglTexture,le,ft+er),ee.framebufferTextureLayer(ee.DRAW_FRAMEBUFFER,ee.COLOR_ATTACHMENT0,de.get(te).__webglTexture,Pe,$t+er)),ee.blitFramebuffer(tt,dt,je,Ae,Je,At,je,Ae,ee.DEPTH_BUFFER_BIT,ee.NEAREST);T.bindFramebuffer(ee.READ_FRAMEBUFFER,null),T.bindFramebuffer(ee.DRAW_FRAMEBUFFER,null)}else if(le!==0||P.isRenderTargetTexture||de.has(P)){const Kt=de.get(P),Fi=de.get(te);T.bindFramebuffer(ee.READ_FRAMEBUFFER,he),T.bindFramebuffer(ee.DRAW_FRAMEBUFFER,$);for(let Ht=0;Ht<Ye;Ht++)Er?ee.framebufferTextureLayer(ee.READ_FRAMEBUFFER,ee.COLOR_ATTACHMENT0,Kt.__webglTexture,le,ft+Ht):ee.framebufferTexture2D(ee.READ_FRAMEBUFFER,ee.COLOR_ATTACHMENT0,ee.TEXTURE_2D,Kt.__webglTexture,le),Ot?ee.framebufferTextureLayer(ee.DRAW_FRAMEBUFFER,ee.COLOR_ATTACHMENT0,Fi.__webglTexture,Pe,$t+Ht):ee.framebufferTexture2D(ee.DRAW_FRAMEBUFFER,ee.COLOR_ATTACHMENT0,ee.TEXTURE_2D,Fi.__webglTexture,Pe),le!==0?ee.blitFramebuffer(tt,dt,je,Ae,Je,At,je,Ae,ee.COLOR_BUFFER_BIT,ee.NEAREST):Ot?ee.copyTexSubImage3D(He,Pe,Je,At,$t+Ht,tt,dt,je,Ae):ee.copyTexSubImage2D(He,Pe,Je,At,tt,dt,je,Ae);T.bindFramebuffer(ee.READ_FRAMEBUFFER,null),T.bindFramebuffer(ee.DRAW_FRAMEBUFFER,null)}else Ot?P.isDataTexture||P.isData3DTexture?ee.texSubImage3D(He,Pe,Je,At,$t,je,Ae,Ye,Vt,mn,en.data):te.isCompressedArrayTexture?ee.compressedTexSubImage3D(He,Pe,Je,At,$t,je,Ae,Ye,Vt,en.data):ee.texSubImage3D(He,Pe,Je,At,$t,je,Ae,Ye,Vt,mn,en):P.isDataTexture?ee.texSubImage2D(ee.TEXTURE_2D,Pe,Je,At,je,Ae,Vt,mn,en.data):P.isCompressedTexture?ee.compressedTexSubImage2D(ee.TEXTURE_2D,Pe,Je,At,en.width,en.height,Vt,en.data):ee.texSubImage2D(ee.TEXTURE_2D,Pe,Je,At,je,Ae,Vt,mn,en);T.pixelStorei(ee.UNPACK_ROW_LENGTH,Nn),T.pixelStorei(ee.UNPACK_IMAGE_HEIGHT,yt),T.pixelStorei(ee.UNPACK_SKIP_PIXELS,Jn),T.pixelStorei(ee.UNPACK_SKIP_ROWS,ei),T.pixelStorei(ee.UNPACK_SKIP_IMAGES,St),Pe===0&&te.generateMipmaps&&ee.generateMipmap(He),T.unbindTexture()},this.initRenderTarget=function(P){de.get(P).__webglFramebuffer===void 0&&ve.setupRenderTarget(P)},this.initTexture=function(P){P.isCubeTexture?ve.setTextureCube(P,0):P.isData3DTexture?ve.setTexture3D(P,0):P.isDataArrayTexture||P.isCompressedArrayTexture?ve.setTexture2DArray(P,0):ve.setTexture2D(P,0),T.unbindTexture()},this.resetState=function(){oe=0,Q=0,q=null,T.reset(),ze.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return mr}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=Tt._getDrawingBufferColorSpace(e),t.unpackColorSpace=Tt._getUnpackColorSpace()}}const uP=/^[og]\s*(.+)?/,hP=/^mtllib /,dP=/^usemtl /,fP=/^usemap /,Zv=/\s+/,Jv=new ie,Zf=new ie,e_=new ie,t_=new ie,Li=new ie,Hu=new _t;function pP(){const i={objects:[],object:{},vertices:[],normals:[],colors:[],uvs:[],materials:{},materialLibraries:[],startObject:function(e,t){if(this.object&&this.object.fromDeclaration===!1){this.object.name=e,this.object.fromDeclaration=t!==!1;return}const r=this.object&&typeof this.object.currentMaterial=="function"?this.object.currentMaterial():void 0;if(this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0),this.object={name:e||"",fromDeclaration:t!==!1,geometry:{vertices:[],normals:[],colors:[],uvs:[],hasUVIndices:!1},materials:[],smooth:!0,startMaterial:function(a,l){const c=this._finalize(!1);c&&(c.inherited||c.groupCount<=0)&&this.materials.splice(c.index,1);const h={index:this.materials.length,name:a||"",mtllib:Array.isArray(l)&&l.length>0?l[l.length-1]:"",smooth:c!==void 0?c.smooth:this.smooth,groupStart:c!==void 0?c.groupEnd:0,groupEnd:-1,groupCount:-1,inherited:!1,clone:function(d){const f={index:typeof d=="number"?d:this.index,name:this.name,mtllib:this.mtllib,smooth:this.smooth,groupStart:0,groupEnd:-1,groupCount:-1,inherited:!1};return f.clone=this.clone.bind(f),f}};return this.materials.push(h),h},currentMaterial:function(){if(this.materials.length>0)return this.materials[this.materials.length-1]},_finalize:function(a){const l=this.currentMaterial();if(l&&l.groupEnd===-1&&(l.groupEnd=this.geometry.vertices.length/3,l.groupCount=l.groupEnd-l.groupStart,l.inherited=!1),a&&this.materials.length>1)for(let c=this.materials.length-1;c>=0;c--)this.materials[c].groupCount<=0&&this.materials.splice(c,1);return a&&this.materials.length===0&&this.materials.push({name:"",smooth:this.smooth}),l}},r&&r.name&&typeof r.clone=="function"){const a=r.clone(0);a.inherited=!0,this.object.materials.push(a)}this.objects.push(this.object)},finalize:function(){this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0)},parseVertexIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/3)*3},parseNormalIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/3)*3},parseUVIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/2)*2},addVertex:function(e,t,r){const a=this.vertices,l=this.object.geometry.vertices;l.push(a[e+0],a[e+1],a[e+2]),l.push(a[t+0],a[t+1],a[t+2]),l.push(a[r+0],a[r+1],a[r+2])},addVertexPoint:function(e){const t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addVertexLine:function(e){const t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addNormal:function(e,t,r){const a=this.normals,l=this.object.geometry.normals;l.push(a[e+0],a[e+1],a[e+2]),l.push(a[t+0],a[t+1],a[t+2]),l.push(a[r+0],a[r+1],a[r+2])},addFaceNormal:function(e,t,r){const a=this.vertices,l=this.object.geometry.normals;Jv.fromArray(a,e),Zf.fromArray(a,t),e_.fromArray(a,r),Li.subVectors(e_,Zf),t_.subVectors(Jv,Zf),Li.cross(t_),Li.normalize(),l.push(Li.x,Li.y,Li.z),l.push(Li.x,Li.y,Li.z),l.push(Li.x,Li.y,Li.z)},addColor:function(e,t,r){const a=this.colors,l=this.object.geometry.colors;a[e]!==void 0&&l.push(a[e+0],a[e+1],a[e+2]),a[t]!==void 0&&l.push(a[t+0],a[t+1],a[t+2]),a[r]!==void 0&&l.push(a[r+0],a[r+1],a[r+2])},addUV:function(e,t,r){const a=this.uvs,l=this.object.geometry.uvs;l.push(a[e+0],a[e+1]),l.push(a[t+0],a[t+1]),l.push(a[r+0],a[r+1])},addDefaultUV:function(){const e=this.object.geometry.uvs;e.push(0,0),e.push(0,0),e.push(0,0)},addUVLine:function(e){const t=this.uvs;this.object.geometry.uvs.push(t[e+0],t[e+1])},addFace:function(e,t,r,a,l,c,h,d,f){const v=this.vertices.length;let g=this.parseVertexIndex(e,v),p=this.parseVertexIndex(t,v),y=this.parseVertexIndex(r,v);if(this.addVertex(g,p,y),this.addColor(g,p,y),h!==void 0&&h!==""){const E=this.normals.length;g=this.parseNormalIndex(h,E),p=this.parseNormalIndex(d,E),y=this.parseNormalIndex(f,E),this.addNormal(g,p,y)}else this.addFaceNormal(g,p,y);if(a!==void 0&&a!==""){const E=this.uvs.length;g=this.parseUVIndex(a,E),p=this.parseUVIndex(l,E),y=this.parseUVIndex(c,E),this.addUV(g,p,y),this.object.geometry.hasUVIndices=!0}else this.addDefaultUV()},addPointGeometry:function(e){this.object.geometry.type="Points";const t=this.vertices.length;for(let r=0,a=e.length;r<a;r++){const l=this.parseVertexIndex(e[r],t);this.addVertexPoint(l),this.addColor(l)}},addLineGeometry:function(e,t){this.object.geometry.type="Line";const r=this.vertices.length,a=this.uvs.length;for(let l=0,c=e.length;l<c;l++)this.addVertexLine(this.parseVertexIndex(e[l],r));for(let l=0,c=t.length;l<c;l++)this.addUVLine(this.parseUVIndex(t[l],a))}};return i.startObject("",!1),i}class mP extends oc{constructor(e){super(e),this.materials=null}load(e,t,r,a){const l=this,c=new sT(this.manager);c.setPath(this.path),c.setRequestHeader(this.requestHeader),c.setWithCredentials(this.withCredentials),c.load(e,function(h){try{t(l.parse(h))}catch(d){a?a(d):console.error(d),l.manager.itemError(e)}},r,a)}setMaterials(e){return this.materials=e,this}parse(e){const t=new pP;e.indexOf(`\r
`)!==-1&&(e=e.replace(/\r\n/g,`
`)),e.indexOf(`\\
`)!==-1&&(e=e.replace(/\\\n/g,""));const r=e.split(`
`);let a=[];for(let h=0,d=r.length;h<d;h++){const f=r[h].trimStart();if(f.length===0)continue;const v=f.charAt(0);if(v!=="#")if(v==="v"){const g=f.split(Zv);switch(g[0]){case"v":t.vertices.push(parseFloat(g[1]),parseFloat(g[2]),parseFloat(g[3])),g.length>=7?(Hu.setRGB(parseFloat(g[4]),parseFloat(g[5]),parseFloat(g[6]),hi),t.colors.push(Hu.r,Hu.g,Hu.b)):t.colors.push(void 0,void 0,void 0);break;case"vn":t.normals.push(parseFloat(g[1]),parseFloat(g[2]),parseFloat(g[3]));break;case"vt":t.uvs.push(parseFloat(g[1]),parseFloat(g[2]));break}}else if(v==="f"){const p=f.slice(1).trim().split(Zv),y=[];for(let b=0,M=p.length;b<M;b++){const S=p[b];if(S.length>0){const A=S.split("/");y.push(A)}}const E=y[0];for(let b=1,M=y.length-1;b<M;b++){const S=y[b],A=y[b+1];t.addFace(E[0],S[0],A[0],E[1],S[1],A[1],E[2],S[2],A[2])}}else if(v==="l"){const g=f.substring(1).trim().split(" ");let p=[];const y=[];if(f.indexOf("/")===-1)p=g;else for(let E=0,b=g.length;E<b;E++){const M=g[E].split("/");M[0]!==""&&p.push(M[0]),M[1]!==""&&y.push(M[1])}t.addLineGeometry(p,y)}else if(v==="p"){const p=f.slice(1).trim().split(" ");t.addPointGeometry(p)}else if((a=uP.exec(f))!==null){const g=(" "+a[0].slice(1).trim()).slice(1);t.startObject(g)}else if(dP.test(f))t.object.startMaterial(f.substring(7).trim(),t.materialLibraries);else if(hP.test(f))t.materialLibraries.push(f.substring(7).trim());else if(fP.test(f))console.warn('THREE.OBJLoader: Rendering identifier "usemap" not supported. Textures must be defined in MTL files.');else if(v==="s"){if(a=f.split(" "),a.length>1){const p=a[1].trim().toLowerCase();t.object.smooth=p!=="0"&&p!=="off"}else t.object.smooth=!0;const g=t.object.currentMaterial();g&&(g.smooth=t.object.smooth)}else{if(f==="\0")continue;console.warn('THREE.OBJLoader: Unexpected line: "'+f+'"')}}t.finalize();const l=new Ol;if(l.materialLibraries=[].concat(t.materialLibraries),!(t.objects.length===1&&t.objects[0].geometry.vertices.length===0)===!0)for(let h=0,d=t.objects.length;h<d;h++){const f=t.objects[h],v=f.geometry,g=f.materials,p=v.type==="Line",y=v.type==="Points";let E=!1;if(v.vertices.length===0)continue;const b=new Mi;b.setAttribute("position",new In(v.vertices,3)),v.normals.length>0&&b.setAttribute("normal",new In(v.normals,3)),v.colors.length>0&&(E=!0,b.setAttribute("color",new In(v.colors,3))),v.hasUVIndices===!0&&b.setAttribute("uv",new In(v.uvs,2));const M=[];for(let A=0,D=g.length;A<D;A++){const C=g[A],I=C.name+"_"+C.smooth+"_"+E;let L=t.materials[I];if(this.materials!==null){if(L=this.materials.create(C.name),p&&L&&!(L instanceof Ju)){const U=new Ju;Sr.prototype.copy.call(U,L),U.color.copy(L.color),L=U}else if(y&&L&&!(L instanceof zl)){const U=new zl({size:10,sizeAttenuation:!1});Sr.prototype.copy.call(U,L),U.color.copy(L.color),U.map=L.map,L=U}}L===void 0&&(p?L=new Ju:y?L=new zl({size:1,sizeAttenuation:!1}):L=new Jb,L.name=C.name,L.flatShading=!C.smooth,L.vertexColors=E,t.materials[I]=L),M.push(L)}let S;if(M.length>1){for(let A=0,D=g.length;A<D;A++){const C=g[A];b.addGroup(C.groupStart,C.groupCount,A)}p?S=new gv(b,M):y?S=new Gf(b,M):S=new Qi(b,M)}else p?S=new gv(b,M[0]):y?S=new Gf(b,M[0]):S=new Qi(b,M[0]);S.name=f.name,l.add(S)}else if(t.vertices.length>0){const h=new zl({size:1,sizeAttenuation:!1}),d=new Mi;d.setAttribute("position",new In(t.vertices,3)),t.colors.length>0&&t.colors[0]!==void 0&&(d.setAttribute("color",new In(t.colors,3)),h.vertexColors=!0);const f=new Gf(d,h);l.add(f)}return l}}const n_={type:"change"},Vm={type:"start"},Gy={type:"end"},Gu=new Eh,i_=new Ts,gP=Math.cos(70*Mb.DEG2RAD),yn=new ie,li=2*Math.PI,Xt={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Jf=1e-6;class xP extends fT{constructor(e,t=null){super(e,t),this.state=Xt.NONE,this.target=new ie,this.cursor=new ie,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:vo.ROTATE,MIDDLE:vo.DOLLY,RIGHT:vo.PAN},this.touches={ONE:go.ROTATE,TWO:go.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new ie,this._lastQuaternion=new Vs,this._lastTargetPosition=new ie,this._quat=new Vs().setFromUnitVectors(e.up,new ie(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Tv,this._sphericalDelta=new Tv,this._scale=1,this._panOffset=new ie,this._rotateStart=new ut,this._rotateEnd=new ut,this._rotateDelta=new ut,this._panStart=new ut,this._panEnd=new ut,this._panDelta=new ut,this._dollyStart=new ut,this._dollyEnd=new ut,this._dollyDelta=new ut,this._dollyDirection=new ie,this._mouse=new ut,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=_P.bind(this),this._onPointerDown=vP.bind(this),this._onPointerUp=yP.bind(this),this._onContextMenu=CP.bind(this),this._onMouseWheel=EP.bind(this),this._onKeyDown=wP.bind(this),this._onTouchStart=bP.bind(this),this._onTouchMove=TP.bind(this),this._onMouseDown=SP.bind(this),this._onMouseMove=MP.bind(this),this._interceptControlDown=RP.bind(this),this._interceptControlUp=AP.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction=""}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(n_),this.update(),this.state=Xt.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){const t=this.object.position;yn.copy(t).sub(this.target),yn.applyQuaternion(this._quat),this._spherical.setFromVector3(yn),this.autoRotate&&this.state===Xt.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let r=this.minAzimuthAngle,a=this.maxAzimuthAngle;isFinite(r)&&isFinite(a)&&(r<-Math.PI?r+=li:r>Math.PI&&(r-=li),a<-Math.PI?a+=li:a>Math.PI&&(a-=li),r<=a?this._spherical.theta=Math.max(r,Math.min(a,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(r+a)/2?Math.max(r,this._spherical.theta):Math.min(a,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let l=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const c=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),l=c!=this._spherical.radius}if(yn.setFromSpherical(this._spherical),yn.applyQuaternion(this._quatInverse),t.copy(this.target).add(yn),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let c=null;if(this.object.isPerspectiveCamera){const h=yn.length();c=this._clampDistance(h*this._scale);const d=h-c;this.object.position.addScaledVector(this._dollyDirection,d),this.object.updateMatrixWorld(),l=!!d}else if(this.object.isOrthographicCamera){const h=new ie(this._mouse.x,this._mouse.y,0);h.unproject(this.object);const d=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),l=d!==this.object.zoom;const f=new ie(this._mouse.x,this._mouse.y,0);f.unproject(this.object),this.object.position.sub(f).add(h),this.object.updateMatrixWorld(),c=yn.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;c!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(c).add(this.object.position):(Gu.origin.copy(this.object.position),Gu.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Gu.direction))<gP?this.object.lookAt(this.target):(i_.setFromNormalAndCoplanarPoint(this.object.up,this.target),Gu.intersectPlane(i_,this.target))))}else if(this.object.isOrthographicCamera){const c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),c!==this.object.zoom&&(this.object.updateProjectionMatrix(),l=!0)}return this._scale=1,this._performCursorZoom=!1,l||this._lastPosition.distanceToSquared(this.object.position)>Jf||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Jf||this._lastTargetPosition.distanceToSquared(this.target)>Jf?(this.dispatchEvent(n_),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?li/60*this.autoRotateSpeed*e:li/60/60*this.autoRotateSpeed}_getZoomScale(e){const t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){yn.setFromMatrixColumn(t,0),yn.multiplyScalar(-e),this._panOffset.add(yn)}_panUp(e,t){this.screenSpacePanning===!0?yn.setFromMatrixColumn(t,1):(yn.setFromMatrixColumn(t,0),yn.crossVectors(this.object.up,yn)),yn.multiplyScalar(e),this._panOffset.add(yn)}_pan(e,t){const r=this.domElement;if(this.object.isPerspectiveCamera){const a=this.object.position;yn.copy(a).sub(this.target);let l=yn.length();l*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*l/r.clientHeight,this.object.matrix),this._panUp(2*t*l/r.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/r.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/r.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const r=this.domElement.getBoundingClientRect(),a=e-r.left,l=t-r.top,c=r.width,h=r.height;this._mouse.x=a/c*2-1,this._mouse.y=-(l/h)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(li*this._rotateDelta.x/t.clientHeight),this._rotateUp(li*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(li*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-li*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(li*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-li*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._rotateStart.set(r,a)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._panStart.set(r,a)}}_handleTouchStartDolly(e){const t=this._getSecondPointerPosition(e),r=e.pageX-t.x,a=e.pageY-t.y,l=Math.sqrt(r*r+a*a);this._dollyStart.set(0,l)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{const r=this._getSecondPointerPosition(e),a=.5*(e.pageX+r.x),l=.5*(e.pageY+r.y);this._rotateEnd.set(a,l)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(li*this._rotateDelta.x/t.clientHeight),this._rotateUp(li*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._panEnd.set(r,a)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){const t=this._getSecondPointerPosition(e),r=e.pageX-t.x,a=e.pageY-t.y,l=Math.sqrt(r*r+a*a);this._dollyEnd.set(0,l),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const c=(e.pageX+t.x)*.5,h=(e.pageY+t.y)*.5;this._updateZoomParameters(c,h)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new ut,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){const t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){const t=e.deltaMode,r={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:r.deltaY*=16;break;case 2:r.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(r.deltaY*=10),r}}function vP(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function _P(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function yP(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Gy),this.state=Xt.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:const e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function SP(i){let e;switch(i.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case vo.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=Xt.DOLLY;break;case vo.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Xt.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Xt.ROTATE}break;case vo.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Xt.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Xt.PAN}break;default:this.state=Xt.NONE}this.state!==Xt.NONE&&this.dispatchEvent(Vm)}function MP(i){switch(this.state){case Xt.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case Xt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case Xt.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function EP(i){this.enabled===!1||this.enableZoom===!1||this.state!==Xt.NONE||(i.preventDefault(),this.dispatchEvent(Vm),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(Gy))}function wP(i){this.enabled!==!1&&this._handleKeyDown(i)}function bP(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case go.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=Xt.TOUCH_ROTATE;break;case go.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=Xt.TOUCH_PAN;break;default:this.state=Xt.NONE}break;case 2:switch(this.touches.TWO){case go.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=Xt.TOUCH_DOLLY_PAN;break;case go.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=Xt.TOUCH_DOLLY_ROTATE;break;default:this.state=Xt.NONE}break;default:this.state=Xt.NONE}this.state!==Xt.NONE&&this.dispatchEvent(Vm)}function TP(i){switch(this._trackPointer(i),this.state){case Xt.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case Xt.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case Xt.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case Xt.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=Xt.NONE}}function CP(i){this.enabled!==!1&&i.preventDefault()}function RP(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function AP(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function PP({piece:i,textured:e=!0,size:t=320}){const r=k.useRef(null);return k.useEffect(()=>{const a=r.current;if(!a)return;const l=new Fb;l.background=new _t(657931);const c=new Ii(35,1,.01,5e3),h=new cP({antialias:!0});h.setSize(t,t),h.setPixelRatio(Math.min(2,window.devicePixelRatio)),a.appendChild(h.domElement),l.add(new uT(16777215,.5));const d=new bv(16777215,2.2);d.position.set(2,3,2),l.add(d);const f=new bv(16777215,.8);f.position.set(-2,1,-1.5),l.add(f);const v=new xP(c,h.domElement);v.enableDamping=!0,v.autoRotate=!0,v.autoRotateSpeed=1.2;let g=0,p=!1;new mP().load(`/api/scan/model/${i}.obj`,b=>{if(p)return;const M=I=>b.traverse(L=>{L.isMesh&&(L.material=I)});e?new oT().load(`/api/scan/model/${i}.png`,I=>{I.colorSpace=hi,M(new jf({map:I,roughness:.6}))},void 0,()=>M(new jf({color:11579576,roughness:.6}))):M(new jf({color:12632262,roughness:.65})),b.rotation.x=-Math.PI/2;const S=new Go().setFromObject(b),A=S.getCenter(new ie),D=S.getSize(new ie);b.position.sub(A),l.add(b);const C=Math.max(D.x,D.y,D.z);c.position.set(C*1.6,C*.6,C*1.6),c.near=C/100,c.far=C*100,c.updateProjectionMatrix(),v.target.set(0,0,0),v.update()});const E=()=>{v.update(),h.render(l,c),g=requestAnimationFrame(E)};return E(),()=>{p=!0,cancelAnimationFrame(g),v.dispose(),h.dispose(),a.removeChild(h.domElement)}},[i,e,t]),x.jsx("div",{ref:r,style:{width:t,height:t},className:"rounded-lg border border-zinc-700 bg-zinc-950 [&>canvas]:rounded-lg"})}const or="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",NP="https://192.168.178.23:4444/video/snapshot",LP=["P","N","B","R","Q","K","wP","wN","wB","wR","wQ","wK","bP","bN","bB","bR","bQ","bK"],DP={P:"Bauer",N:"Springer",B:"Läufer",R:"Turm",Q:"Dame",K:"König"};function IP(i){const e=i.match(/^([wb]?)([PNBRQK])$/i);if(!e)return null;const t=e[2].toUpperCase();return e[1]?e[1].toLowerCase()+t:t}function r_(i){const e=i.length===2?i[1]:i[0];return(i.length===2?i[0]==="w"?"weiß ":"schwarz ":"")+(DP[e]??i)}function ep(i,e){const t=IP(i.dir),r=t&&e.find(a=>a.piece.toLowerCase()===t.toLowerCase());return r?{stage:"done",piece:r.piece}:i.mesh?{stage:"mesh",piece:t}:{stage:"photos",piece:t}}function UP(){var ne,Re;const[i,e]=k.useState(null),[t,r]=k.useState(""),[a,l]=k.useState("P"),[c,h]=k.useState(2e4),[d,f]=k.useState(10),[v,g]=k.useState(!1),[p,y]=k.useState(null),[E,b]=k.useState(null),[M,S]=k.useState(""),[A,D]=k.useState("textured"),C=k.useRef(null),I=k.useRef(null),L=()=>Ft("/api/scan/models").then(xe=>{e(xe),!t&&xe.scans.length&&U(xe.scans[0],xe.pieces)}).catch(()=>{});function U(xe,Ne=(i==null?void 0:i.pieces)??[]){r(xe.dir);const{piece:B}=ep(xe,Ne);l(B??"P")}async function w(xe){confirm(`Scan „${xe}" mit allen Fotos und Mesh wirklich löschen?`)&&(await Wl(`/api/scan/scan/${xe}`).catch(()=>{}),t===xe&&r(""),L())}async function N(xe){confirm(`Vorbereitete Figur „${xe}" löschen? (Der Scan bleibt erhalten.)`)&&(await Wl(`/api/scan/piece/${xe}`).catch(()=>{}),y(null),L())}const H=()=>Ft("/api/scan/reconstruct/status").then(xe=>{b(xe),xe.state!=="running"&&(clearInterval(I.current),L())}).catch(()=>{}),V=()=>Ft("/api/scan/prepare/status").then(xe=>{y(xe),xe.state!=="running"&&(clearInterval(C.current),L())}).catch(()=>{});k.useEffect(()=>(L(),Ft("/api/scan/reconstruct/status").then(xe=>{xe.state==="running"?(b(xe),xe.dir&&r(xe.dir),I.current=setInterval(H,3e3)):xe.state!=="idle"&&b(xe)}).catch(()=>{}),Ft("/api/scan/prepare/status").then(xe=>{xe.state==="running"&&(y(xe),C.current=setInterval(V,2e3))}).catch(()=>{}),()=>{clearInterval(C.current),clearInterval(I.current)}),[]);async function X(){S("");try{await Ct("/api/scan/reconstruct",{dir:t}),b({state:"running",dir:t}),clearInterval(I.current),I.current=setInterval(H,3e3)}catch(xe){S("Fehler: "+xe.message)}}const j=()=>Ft("/api/scan/prepare/status").then(xe=>{y(xe),xe.state!=="running"&&(clearInterval(C.current),L())}).catch(()=>{});async function he(){S("");try{await Ct("/api/scan/prepare",{dir:t,piece:a,target_tris:c,smooth_iters:d}),y({state:"running",piece:a}),clearInterval(C.current),C.current=setInterval(j,2e3)}catch(xe){S("Fehler: "+xe.message)}}const $=(i==null?void 0:i.scans)??[],oe=$.find(xe=>xe.dir===t),Q=oe?ep(oe,(i==null?void 0:i.pieces)??[]):null,q=Q==null?void 0:Q.stage,Y=(E==null?void 0:E.state)==="running"&&E.dir===t,Z=(p==null?void 0:p.state)==="running",O=q==="done"?3:q==="mesh"?2:1;return x.jsxs(It,{title:"Figuren-Werkstatt — Fotos → 3D-Figur",children:[x.jsx("div",{className:"mb-4 flex items-center gap-1 text-xs",children:[[1,"Fotografieren",zs],[2,"Rekonstruieren",vp],[3,"Vorbereiten",yp]].map(([xe,Ne,B],ge)=>x.jsxs("div",{className:"flex items-center gap-1",children:[x.jsxs("div",{className:`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${O>=xe?"bg-sky-500/15 text-sky-300":"bg-zinc-800 text-zinc-500"}`,children:[x.jsx(B,{className:"h-3.5 w-3.5"})," ",x.jsx("span",{children:Ne})]}),ge<2&&x.jsx("div",{className:`h-px w-4 ${O>xe?"bg-sky-500/40":"bg-zinc-700"}`})]},xe))}),$.length===0&&x.jsx("p",{className:"text-sm text-zinc-500",children:"Noch keine Scans. Nimm oben Fotos einer Figur auf — sie erscheinen dann hier als Karte."}),x.jsx("div",{className:"grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4",children:$.map(xe=>{const Ne=ep(xe,(i==null?void 0:i.pieces)??[]),B=xe.dir===t,ge={photos:["Nur Fotos","bg-amber-500/15 text-amber-300"],mesh:["Mesh bereit","bg-sky-500/15 text-sky-300"],done:["Fertig","bg-green-500/15 text-green-300"]}[Ne.stage],fe=Ne.piece&&Ne.stage==="done";return x.jsxs("button",{onClick:()=>U(xe),className:`flex flex-col rounded-xl border p-2 text-left transition ${B?"border-sky-500 bg-sky-500/5":"border-zinc-800 hover:border-zinc-600"}`,children:[x.jsxs("div",{className:"relative mb-1.5 aspect-square overflow-hidden rounded-lg bg-zinc-950",children:[fe?x.jsx("img",{src:`/api/scan/prepare/preview/${Ne.piece}`,className:"h-full w-full object-contain"}):x.jsx("div",{className:"grid h-full place-items-center text-zinc-700",children:x.jsx(zs,{className:"h-8 w-8"})}),x.jsx("span",{className:`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${ge[1]}`,children:ge[0]})]}),x.jsx("div",{className:"text-sm font-medium text-zinc-200",children:xe.dir}),x.jsxs("div",{className:"text-[11px] text-zinc-500",children:[xe.photos," Fotos",Ne.piece?` · ${r_(Ne.piece)}`:""]})]},xe.dir)})}),oe&&x.jsxs("div",{className:"mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4",children:[x.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[x.jsxs("div",{className:"flex items-center gap-2",children:[x.jsxs("div",{children:[x.jsx("div",{className:"text-sm font-medium text-zinc-100",children:oe.dir}),x.jsxs("div",{className:"text-xs text-zinc-500",children:[oe.photos," Fotos",oe.mesh?" · Mesh vorhanden":" · noch kein Mesh",!oe.texture&&oe.mesh?" · ⚠ ohne Textur":""]})]}),x.jsx("button",{onClick:()=>w(oe.dir),title:"Scan löschen (Fotos + Mesh)",className:"rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400",children:x.jsx(ic,{className:"h-4 w-4"})})]}),q==="photos"&&x.jsxs(mt,{variant:"primary",onClick:X,disabled:Y,children:[Y?x.jsx(ha,{className:"h-4 w-4 animate-spin"}):x.jsx(vp,{className:"h-4 w-4"}),Y?"RealityScan läuft…":"Rekonstruieren"]}),q!=="photos"&&x.jsxs("div",{className:"flex items-center gap-2",children:[x.jsxs(mt,{onClick:X,disabled:Y,title:"Mesh neu aus den Fotos berechnen",children:[Y?x.jsx(ha,{className:"h-4 w-4 animate-spin"}):x.jsx(Z_,{className:"h-4 w-4"}),"Neu rekonstruieren"]}),x.jsxs(mt,{variant:"primary",onClick:he,disabled:Z,children:[Z?x.jsx(ha,{className:"h-4 w-4 animate-spin"}):x.jsx(yp,{className:"h-4 w-4"}),Z?"läuft…":q==="done"?"Neu vorbereiten":"Vorbereiten"]})]})]}),q!=="photos"&&x.jsxs("div",{className:"mb-3 flex flex-wrap items-center gap-3",children:[x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Figur",x.jsx("select",{value:a,onChange:xe=>l(xe.target.value),className:or,children:LP.map(xe=>x.jsxs("option",{value:xe,children:[xe," — ",r_(xe)]},xe))})]}),x.jsxs("button",{onClick:()=>g(!v),className:"flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300",children:[x.jsx(yw,{className:"h-3.5 w-3.5"})," Einstellungen",x.jsx(ow,{className:`h-3 w-3 transition ${v?"rotate-180":""}`})]}),v&&x.jsxs("div",{className:"flex items-center gap-3 text-xs text-zinc-400",children:[x.jsxs("label",{className:"flex items-center gap-1",title:"Dreiecks-Ziel (Decimate). 0 = aus.",children:["Ziel-△ ",x.jsx("input",{type:"number",value:c,onChange:xe=>h(+xe.target.value),className:`${or} w-24`})]}),x.jsxs("label",{className:"flex items-center gap-1",title:"Laplacian-Glättung gegen Bumps. 10 mild, 25–40 stark.",children:["Glättung ",x.jsx("input",{type:"number",value:d,onChange:xe=>f(+xe.target.value),className:`${or} w-16`})]})]}),M&&x.jsx("span",{className:"text-xs text-red-400",children:M})]}),Y&&x.jsxs("div",{className:"flex items-center gap-2 rounded-lg bg-sky-500/10 p-3 text-sm text-sky-300",children:[x.jsx(ha,{className:"h-4 w-4 animate-spin"})," RealityScan rekonstruiert aus ",oe.photos," Fotos — das dauert einige Minuten…"]}),(E==null?void 0:E.state)==="failed"&&E.dir===t&&x.jsxs("div",{className:"rounded-lg bg-red-500/10 p-3 text-sm text-red-300",children:[x.jsxs("div",{className:"flex items-center gap-2",children:[x.jsx(sh,{className:"h-4 w-4"})," Rekonstruktion fehlgeschlagen."]}),E.log_tail&&x.jsx("pre",{className:"mt-1 whitespace-pre-wrap text-xs text-red-400/70",children:E.log_tail})]}),Z&&x.jsxs("div",{className:"flex items-center gap-2 rounded-lg bg-sky-500/10 p-3 text-sm text-sky-300",children:[x.jsx(ha,{className:"h-4 w-4 animate-spin"})," Blender isoliert & bereinigt die Figur — ca. 1–3 min…"]}),(p==null?void 0:p.state)==="failed"&&x.jsxs("div",{className:"rounded-lg bg-red-500/10 p-3 text-sm text-red-300",children:[x.jsxs("div",{className:"flex items-center gap-2",children:[x.jsx(sh,{className:"h-4 w-4"})," Vorbereitung fehlgeschlagen."]}),p.log_tail&&x.jsx("pre",{className:"mt-1 whitespace-pre-wrap text-xs text-red-400/70",children:p.log_tail})]}),x.jsx(FP,{piece:(Q==null?void 0:Q.stage)==="done"?Q.piece:(p==null?void 0:p.state)==="done"?p.piece:null,report:(p==null?void 0:p.state)==="done"?p.report:(ne=i==null?void 0:i.pieces.find(xe=>xe.piece===(Q==null?void 0:Q.piece)))==null?void 0:ne.report,level:(p==null?void 0:p.state)==="done"?p.level:void 0,messages:(p==null?void 0:p.state)==="done"?p.messages:void 0,hasClay:!!((Re=i==null?void 0:i.pieces.find(xe=>xe.piece===((p==null?void 0:p.piece)??(Q==null?void 0:Q.piece))))!=null&&Re.has_clay),variant:A,setVariant:D,onDelete:N})]})]})}function FP({piece:i,report:e,level:t,messages:r,hasClay:a,variant:l,setVariant:c,onDelete:h}){const[d,f]=k.useState("image");return i?x.jsxs("div",{className:"mt-3 flex flex-wrap items-start gap-4 rounded-lg bg-zinc-800/60 p-3",children:[x.jsxs("div",{children:[d==="3d"?x.jsx(PP,{piece:i,textured:l==="textured",size:224}):x.jsx("img",{src:`/api/scan/prepare/preview/${i}?variant=${l}&t=${(e==null?void 0:e.tris_after)??""}`,className:"h-56 w-56 rounded-lg border border-zinc-700 bg-zinc-950 object-contain"}),x.jsxs("div",{className:"mt-2 flex items-center gap-2",children:[x.jsx(kP,{value:l,onChange:c,clayDisabled:!a&&d==="image"}),x.jsxs("div",{className:"flex overflow-hidden rounded-lg border border-zinc-700 text-xs",children:[x.jsx("button",{onClick:()=>f("image"),title:"Standbild",className:`px-2.5 py-1 ${d==="image"?"bg-sky-600 text-white":"text-zinc-400 hover:bg-zinc-700"}`,children:x.jsx(gw,{className:"h-3.5 w-3.5"})}),x.jsx("button",{onClick:()=>f("3d"),title:"Interaktiv drehen (3D)",className:`px-2.5 py-1 ${d==="3d"?"bg-sky-600 text-white":"text-zinc-400 hover:bg-zinc-700"}`,children:x.jsx(Y_,{className:"h-3.5 w-3.5"})})]})]}),d==="3d"&&x.jsx("div",{className:"mt-1 text-[11px] text-zinc-500",children:"ziehen = drehen · Rad = zoomen"})]}),e&&x.jsxs("div",{className:"space-y-1.5 text-xs text-zinc-400",children:[t&&x.jsxs("div",{className:`flex items-center gap-1.5 text-sm ${t==="ok"?"text-green-400":"text-amber-400"}`,children:[t==="ok"?x.jsx(yh,{className:"h-4 w-4"}):x.jsx(sh,{className:"h-4 w-4"}),t==="ok"?"Qualität OK":"Bitte prüfen"]}),(r??[]).map((v,g)=>x.jsxs("div",{className:"text-amber-300/90",children:["• ",v]},g)),x.jsxs("div",{className:"grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pt-1",children:[x.jsx("span",{className:"text-zinc-500",children:"Dreiecke"}),x.jsx("span",{children:e.tris_after}),x.jsx("span",{className:"text-zinc-500",children:"offene Kanten"}),x.jsx("span",{children:e.boundary_edges}),x.jsx("span",{className:"text-zinc-500",children:"Höhe/Basis"}),x.jsx("span",{children:e.height_ratio}),x.jsx("span",{className:"text-zinc-500",children:"Muster-Rand"}),x.jsx("span",{children:e.pattern_margin})]}),x.jsxs("div",{className:"pt-1 text-zinc-500",children:["→ synth_pieces/",i,".obj"]}),x.jsxs("button",{onClick:()=>h(i),className:"mt-1 flex items-center gap-1 text-red-400/80 hover:text-red-400",children:[x.jsx(ic,{className:"h-3.5 w-3.5"})," Figur löschen"]})]})]}):null}function kP({value:i,onChange:e,clayDisabled:t}){return x.jsxs("div",{className:"mt-2 flex overflow-hidden rounded-lg border border-zinc-700 text-xs",children:[x.jsx("button",{onClick:()=>e("textured"),className:`px-3 py-1 ${i==="textured"?"bg-sky-600 text-white":"text-zinc-400 hover:bg-zinc-700"}`,children:"Textur"}),x.jsx("button",{onClick:()=>e("clay"),disabled:t,title:t?"kein Clay-Bild (Figur vor diesem Update vorbereitet)":"reine Geometrie",className:`px-3 py-1 ${i==="clay"?"bg-sky-600 text-white":"text-zinc-400 hover:bg-zinc-700"} ${t?"cursor-not-allowed opacity-40":""}`,children:"Clay"})]})}function OP(){const[i,e]=k.useState(NP),[t,r]=k.useState(3840),[a,l]=k.useState(2160),[c,h]=k.useState("pawn"),[d,f]=k.useState(.8),[v,g]=k.useState(80),[p,y]=k.useState(92),[E,b]=k.useState(null),[M,S]=k.useState(""),[A,D]=k.useState(null),C=k.useRef(null),I=k.useRef(null);k.useEffect(()=>(Ft("/api/scan/status").then(Z=>{b(Z),Z.default_source&&e(Z.default_source),Z.out&&h(Z.out)}).catch(()=>{}),()=>clearInterval(I.current)),[]);const L=()=>Ft("/api/scan/status").then(b).catch(()=>{});function U(){clearInterval(I.current),I.current=setInterval(L,1e3)}async function w(){S("");try{const Z=await Ct("/api/scan/open",{source:i,width:t,height:a});b(Z),U()}catch(Z){S("Fehler: "+Z.message)}}async function N(){const Z=await Ct("/api/scan/close");b(Z),clearInterval(I.current)}function H(Z){const O=C.current.getBoundingClientRect();return{x:Z.clientX-O.left,y:Z.clientY-O.top,r:O}}function V(Z){if(!(E!=null&&E.open))return;Z.target.setPointerCapture(Z.pointerId);const{x:O,y:ne}=H(Z);D({x0:O,y0:ne,x1:O,y1:ne})}function X(Z){if(!A)return;const{x:O,y:ne}=H(Z);D({...A,x1:O,y1:ne})}async function j(){if(!A||!E)return D(null);const Z=C.current.getBoundingClientRect(),[O,ne]=E.frame_size,Re=O/Z.width,xe=ne/Z.height,Ne=Math.round(Math.min(A.x0,A.x1)*Re),B=Math.round(Math.min(A.y0,A.y1)*xe),ge=Math.round(Math.max(A.x0,A.x1)*Re),fe=Math.round(Math.max(A.y0,A.y1)*xe);D(null),!(ge-Ne<10||fe-B<10)&&b(await Ct("/api/scan/config",{crop:[Ne,B,ge,fe]}))}async function he(){b(await Ct("/api/scan/config",{crop:[]}))}async function $(){b(await Ct("/api/scan/config",{interval:d,count:v,quality:p,out:c}))}async function oe(){S("");try{await $();const Z=await Ct("/api/scan/start",{out:c});b(Z),U()}catch(Z){S("Fehler: "+Z.message)}}const Q=async()=>b(await Ct("/api/scan/stop")),q=E==null?void 0:E.recording,Y=A&&{left:Math.min(A.x0,A.x1),top:Math.min(A.y0,A.y1),width:Math.abs(A.x1-A.x0),height:Math.abs(A.y1-A.y0)};return x.jsxs("div",{className:"space-y-4",children:[x.jsx(It,{children:x.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Quelle",x.jsx("input",{value:i,onChange:Z=>e(Z.target.value),className:`${or} w-96`,placeholder:"IP-Cam-URL oder USB-Index (0/1)"})]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Nur für USB-Cam: angeforderte Auflösung (MJPG).",children:["USB-Res",x.jsx("input",{type:"number",value:t,onChange:Z=>r(+Z.target.value),className:`${or} w-20`}),"×",x.jsx("input",{type:"number",value:a,onChange:Z=>l(+Z.target.value),className:`${or} w-20`})]}),E!=null&&E.open?x.jsxs(mt,{onClick:N,children:[x.jsx(zx,{className:"h-4 w-4"})," Trennen"]}):x.jsxs(mt,{variant:"primary",onClick:w,children:[x.jsx(zx,{className:"h-4 w-4"})," Verbinden"]}),x.jsxs("span",{className:"text-xs text-zinc-500",children:[M,E!=null&&E.error?` · ${E.error}`:""]})]})}),(E==null?void 0:E.open)&&x.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_320px]",children:[x.jsxs(It,{title:"Live · Crop mit der Maus aufziehen",children:[x.jsxs("div",{className:"relative inline-block select-none leading-none",children:[x.jsx("img",{ref:C,src:"/api/scan/preview.mjpg",draggable:!1,className:"w-full rounded-lg border border-zinc-800"}),x.jsx("div",{className:"absolute inset-0 cursor-crosshair",onPointerDown:V,onPointerMove:X,onPointerUp:j,children:Y&&x.jsx("div",{className:"absolute border-2 border-sky-400 bg-sky-400/10",style:{left:Y.left,top:Y.top,width:Y.width,height:Y.height}})})]}),x.jsxs("div",{className:"mt-2 flex items-center gap-3 text-xs text-zinc-500",children:[x.jsxs("span",{children:["Quelle ",E.frame_size[0],"×",E.frame_size[1]]}),x.jsxs("span",{children:["Crop: ",E.crop?E.crop.join(", "):"—"]}),x.jsxs(mt,{onClick:he,className:"px-2 py-1 text-xs",children:[x.jsx(Z_,{className:"h-3 w-3"})," Crop zurücksetzen"]})]})]}),x.jsx(It,{title:"Aufnahme",children:x.jsxs("div",{className:"space-y-3",children:[x.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",children:["Ziel-Ordner",x.jsx("input",{value:c,onChange:Z=>h(Z.target.value),className:`${or} w-40`})]}),x.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",title:"Sekunden zwischen zwei Fotos. Beim Handy ist ~0.8s das Limit (HTTPS-Fetch).",children:["Intervall (s)",x.jsx("input",{type:"number",step:.1,min:0,value:d,onChange:Z=>f(+Z.target.value),className:`${or} w-24`})]}),x.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",title:"Fotos pro Aufnahme-Lauf. 0 = bis Stop.",children:["Anzahl (0=∞)",x.jsx("input",{type:"number",min:0,value:v,onChange:Z=>g(+Z.target.value),className:`${or} w-24`})]}),x.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",children:["JPEG-Qualität",x.jsx("input",{type:"number",min:50,max:100,value:p,onChange:Z=>y(+Z.target.value),className:`${or} w-24`})]}),x.jsxs("div",{className:"flex flex-wrap gap-2 pt-1",children:[q?x.jsxs(mt,{onClick:Q,children:[x.jsx(iy,{className:"h-4 w-4"})," Stop"]}):x.jsxs(mt,{variant:"primary",onClick:oe,children:[x.jsx(Sh,{className:"h-4 w-4"})," Aufnahme starten"]}),x.jsxs(mt,{onClick:$,title:"Intervall/Anzahl/Qualität übernehmen ohne Aufnahme",children:[x.jsx(uw,{className:"h-4 w-4"})," Übernehmen"]})]}),x.jsxs("div",{className:"rounded-lg bg-zinc-800 p-3 text-sm",children:[q?x.jsxs("span",{className:"font-medium text-green-500",children:["● Aufnahme läuft — ",E.saved_run,E.count?` / ${E.count}`:""," Fotos"]}):x.jsx("span",{className:"text-zinc-400",children:"bereit"}),x.jsxs("div",{className:"mt-1 text-xs text-zinc-500",children:["Im Ordner ",x.jsx("b",{className:"text-zinc-300",children:E.out||c}),": ",E.total," Fotos gesamt (nächste Nr. ",E.index,")"]})]}),x.jsxs("p",{className:"text-xs text-zinc-500",children:["Motor an, Handy/Cam ",x.jsx("b",{children:"fest"}),', Hände weg. „Aufnahme starten" hängt an bestehende Fotos an (Ring 2/3 einfach neu positionieren + wieder starten).']})]})})]}),!(E!=null&&E.open)&&x.jsxs("p",{className:"text-xs text-zinc-500",children:["Verbinde eine Quelle (Handy-IP-Cam-URL oder USB-Index), zieh im Live-Bild den ",x.jsx("b",{children:"Crop"})," um Figur + Drehteller (statischer Hintergrund raus), stell ",x.jsx("b",{children:"Intervall"})," und ",x.jsx("b",{children:"Anzahl"})," ein und nimm auf. Die Fotos landen in ",x.jsx("b",{children:"scans/<Ordner>"})," — bereit für RealityScan."]}),x.jsx(UP,{})]})}const zP=[{to:"/kalibrieren",label:"Kalibrieren",icon:hw},{to:"/sammeln",label:"Sammeln",icon:zs},{to:"/scan",label:"Scan",icon:Y_},{to:"/manuell",label:"Manuell labeln",icon:mw},{to:"/datensaetze",label:"Datensätze",icon:fw},{to:"/inference",label:"Inference",icon:ey},{to:"/review",label:"Review / Relabel",icon:Sw},{to:"/training",label:"Training",icon:sw}],BP=({isActive:i})=>`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${i?"bg-zinc-800 text-zinc-100":"text-zinc-400 hover:text-zinc-100"}`;function VP(){return x.jsx(G1,{children:x.jsxs("div",{className:"min-h-full",children:[x.jsx("header",{className:"sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur",children:x.jsxs("div",{className:"mx-auto flex max-w-7xl items-center gap-6 px-5 py-3",children:[x.jsxs("div",{className:"flex items-center gap-2 font-semibold tracking-tight",children:[x.jsx(dw,{className:"h-5 w-5 text-sky-400"})," chesslab"]}),x.jsx("nav",{className:"flex flex-wrap gap-1",children:zP.map(i=>{const e=i.icon;return x.jsxs(xo,{to:i.to,className:BP,children:[x.jsx(e,{className:"h-4 w-4"})," ",i.label]},i.to)})})]})}),x.jsx("main",{className:"mx-auto max-w-7xl px-5 py-6",children:x.jsxs(v1,{children:[x.jsx(Kn,{path:"/",element:x.jsx(ff,{to:"/kalibrieren",replace:!0})}),x.jsx(Kn,{path:"/kalibrieren",element:x.jsx(ww,{})}),x.jsx(Kn,{path:"/sammeln",element:x.jsx(bw,{})}),x.jsx(Kn,{path:"/scan",element:x.jsx(OP,{})}),x.jsx(Kn,{path:"/manuell",element:x.jsx(Aw,{})}),x.jsxs(Kn,{path:"/datensaetze",element:x.jsx(Pw,{}),children:[x.jsx(Kn,{index:!0,element:x.jsx(ff,{to:"sessions",replace:!0})}),x.jsx(Kn,{path:"sessions",element:x.jsx(Nw,{})}),x.jsx(Kn,{path:"kuratiert",element:x.jsx(Lw,{})}),x.jsx(Kn,{path:"statistik",element:x.jsx(Dw,{})})]}),x.jsx(Kn,{path:"/inference",element:x.jsx(Ow,{})}),x.jsx(Kn,{path:"/review",element:x.jsx(Fw,{})}),x.jsx(Kn,{path:"/training",element:x.jsx(kw,{})}),x.jsx(Kn,{path:"*",element:x.jsx(ff,{to:"/kalibrieren",replace:!0})})]})})]})})}const HP=new rE({defaultOptions:{queries:{staleTime:0,refetchOnWindowFocus:!0,refetchOnMount:"always",retry:1}}});LM.createRoot(document.getElementById("root")).render(x.jsx(TM.StrictMode,{children:x.jsx(sE,{client:HP,children:x.jsx(VP,{})})}));
