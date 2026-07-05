var lv=i=>{throw TypeError(i)};var Qd=(i,e,t)=>e.has(i)||lv("Cannot "+t);var H=(i,e,t)=>(Qd(i,e,"read from private field"),t?t.call(i):e.get(i)),rt=(i,e,t)=>e.has(i)?lv("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(i):e.set(i,t),ze=(i,e,t,r)=>(Qd(i,e,"write to private field"),r?r.call(i,t):e.set(i,t),t),mt=(i,e,t)=>(Qd(i,e,"access private method"),t);var lu=(i,e,t,r)=>({set _(a){ze(i,e,a,t)},get _(){return H(i,e,r)}});(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))r(a);new MutationObserver(a=>{for(const l of a)if(l.type==="childList")for(const c of l.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&r(c)}).observe(document,{childList:!0,subtree:!0});function t(a){const l={};return a.integrity&&(l.integrity=a.integrity),a.referrerPolicy&&(l.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?l.credentials="include":a.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function r(a){if(a.ep)return;a.ep=!0;const l=t(a);fetch(a.href,l)}})();function lM(i){return i&&i.__esModule&&Object.prototype.hasOwnProperty.call(i,"default")?i.default:i}var Zd={exports:{}},wl={},Jd={exports:{}},St={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var cv;function cM(){if(cv)return St;cv=1;var i=Symbol.for("react.element"),e=Symbol.for("react.portal"),t=Symbol.for("react.fragment"),r=Symbol.for("react.strict_mode"),a=Symbol.for("react.profiler"),l=Symbol.for("react.provider"),c=Symbol.for("react.context"),h=Symbol.for("react.forward_ref"),d=Symbol.for("react.suspense"),f=Symbol.for("react.memo"),m=Symbol.for("react.lazy"),g=Symbol.iterator;function v(k){return k===null||typeof k!="object"?null:(k=g&&k[g]||k["@@iterator"],typeof k=="function"?k:null)}var x={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},M=Object.assign,b={};function y(k,ee,Fe){this.props=k,this.context=ee,this.refs=b,this.updater=Fe||x}y.prototype.isReactComponent={},y.prototype.setState=function(k,ee){if(typeof k!="object"&&typeof k!="function"&&k!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,k,ee,"setState")},y.prototype.forceUpdate=function(k){this.updater.enqueueForceUpdate(this,k,"forceUpdate")};function S(){}S.prototype=y.prototype;function P(k,ee,Fe){this.props=k,this.context=ee,this.refs=b,this.updater=Fe||x}var L=P.prototype=new S;L.constructor=P,M(L,y.prototype),L.isPureReactComponent=!0;var R=Array.isArray,D=Object.prototype.hasOwnProperty,N={current:null},F={key:!0,ref:!0,__self:!0,__source:!0};function w(k,ee,Fe){var je,Ge={},ue=null,Se=null;if(ee!=null)for(je in ee.ref!==void 0&&(Se=ee.ref),ee.key!==void 0&&(ue=""+ee.key),ee)D.call(ee,je)&&!F.hasOwnProperty(je)&&(Ge[je]=ee[je]);var xe=arguments.length-2;if(xe===1)Ge.children=Fe;else if(1<xe){for(var te=Array(xe),Ue=0;Ue<xe;Ue++)te[Ue]=arguments[Ue+2];Ge.children=te}if(k&&k.defaultProps)for(je in xe=k.defaultProps,xe)Ge[je]===void 0&&(Ge[je]=xe[je]);return{$$typeof:i,type:k,key:ue,ref:Se,props:Ge,_owner:N.current}}function I(k,ee){return{$$typeof:i,type:k.type,key:ee,ref:k.ref,props:k.props,_owner:k._owner}}function G(k){return typeof k=="object"&&k!==null&&k.$$typeof===i}function V(k){var ee={"=":"=0",":":"=2"};return"$"+k.replace(/[=:]/g,function(Fe){return ee[Fe]})}var Y=/\/+/g;function me(k,ee){return typeof k=="object"&&k!==null&&k.key!=null?V(""+k.key):ee.toString(36)}function de(k,ee,Fe,je,Ge){var ue=typeof k;(ue==="undefined"||ue==="boolean")&&(k=null);var Se=!1;if(k===null)Se=!0;else switch(ue){case"string":case"number":Se=!0;break;case"object":switch(k.$$typeof){case i:case e:Se=!0}}if(Se)return Se=k,Ge=Ge(Se),k=je===""?"."+me(Se,0):je,R(Ge)?(Fe="",k!=null&&(Fe=k.replace(Y,"$&/")+"/"),de(Ge,ee,Fe,"",function(Ue){return Ue})):Ge!=null&&(G(Ge)&&(Ge=I(Ge,Fe+(!Ge.key||Se&&Se.key===Ge.key?"":(""+Ge.key).replace(Y,"$&/")+"/")+k)),ee.push(Ge)),1;if(Se=0,je=je===""?".":je+":",R(k))for(var xe=0;xe<k.length;xe++){ue=k[xe];var te=je+me(ue,xe);Se+=de(ue,ee,Fe,te,Ge)}else if(te=v(k),typeof te=="function")for(k=te.call(k),xe=0;!(ue=k.next()).done;)ue=ue.value,te=je+me(ue,xe++),Se+=de(ue,ee,Fe,te,Ge);else if(ue==="object")throw ee=String(k),Error("Objects are not valid as a React child (found: "+(ee==="[object Object]"?"object with keys {"+Object.keys(k).join(", ")+"}":ee)+"). If you meant to render a collection of children, use an array instead.");return Se}function O(k,ee,Fe){if(k==null)return k;var je=[],Ge=0;return de(k,je,"","",function(ue){return ee.call(Fe,ue,Ge++)}),je}function ce(k){if(k._status===-1){var ee=k._result;ee=ee(),ee.then(function(Fe){(k._status===0||k._status===-1)&&(k._status=1,k._result=Fe)},function(Fe){(k._status===0||k._status===-1)&&(k._status=2,k._result=Fe)}),k._status===-1&&(k._status=0,k._result=ee)}if(k._status===1)return k._result.default;throw k._result}var Q={current:null},$={transition:null},ne={ReactCurrentDispatcher:Q,ReactCurrentBatchConfig:$,ReactCurrentOwner:N};function he(){throw Error("act(...) is not supported in production builds of React.")}return St.Children={map:O,forEach:function(k,ee,Fe){O(k,function(){ee.apply(this,arguments)},Fe)},count:function(k){var ee=0;return O(k,function(){ee++}),ee},toArray:function(k){return O(k,function(ee){return ee})||[]},only:function(k){if(!G(k))throw Error("React.Children.only expected to receive a single React element child.");return k}},St.Component=y,St.Fragment=t,St.Profiler=a,St.PureComponent=P,St.StrictMode=r,St.Suspense=d,St.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=ne,St.act=he,St.cloneElement=function(k,ee,Fe){if(k==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+k+".");var je=M({},k.props),Ge=k.key,ue=k.ref,Se=k._owner;if(ee!=null){if(ee.ref!==void 0&&(ue=ee.ref,Se=N.current),ee.key!==void 0&&(Ge=""+ee.key),k.type&&k.type.defaultProps)var xe=k.type.defaultProps;for(te in ee)D.call(ee,te)&&!F.hasOwnProperty(te)&&(je[te]=ee[te]===void 0&&xe!==void 0?xe[te]:ee[te])}var te=arguments.length-2;if(te===1)je.children=Fe;else if(1<te){xe=Array(te);for(var Ue=0;Ue<te;Ue++)xe[Ue]=arguments[Ue+2];je.children=xe}return{$$typeof:i,type:k.type,key:Ge,ref:ue,props:je,_owner:Se}},St.createContext=function(k){return k={$$typeof:c,_currentValue:k,_currentValue2:k,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},k.Provider={$$typeof:l,_context:k},k.Consumer=k},St.createElement=w,St.createFactory=function(k){var ee=w.bind(null,k);return ee.type=k,ee},St.createRef=function(){return{current:null}},St.forwardRef=function(k){return{$$typeof:h,render:k}},St.isValidElement=G,St.lazy=function(k){return{$$typeof:m,_payload:{_status:-1,_result:k},_init:ce}},St.memo=function(k,ee){return{$$typeof:f,type:k,compare:ee===void 0?null:ee}},St.startTransition=function(k){var ee=$.transition;$.transition={};try{k()}finally{$.transition=ee}},St.unstable_act=he,St.useCallback=function(k,ee){return Q.current.useCallback(k,ee)},St.useContext=function(k){return Q.current.useContext(k)},St.useDebugValue=function(){},St.useDeferredValue=function(k){return Q.current.useDeferredValue(k)},St.useEffect=function(k,ee){return Q.current.useEffect(k,ee)},St.useId=function(){return Q.current.useId()},St.useImperativeHandle=function(k,ee,Fe){return Q.current.useImperativeHandle(k,ee,Fe)},St.useInsertionEffect=function(k,ee){return Q.current.useInsertionEffect(k,ee)},St.useLayoutEffect=function(k,ee){return Q.current.useLayoutEffect(k,ee)},St.useMemo=function(k,ee){return Q.current.useMemo(k,ee)},St.useReducer=function(k,ee,Fe){return Q.current.useReducer(k,ee,Fe)},St.useRef=function(k){return Q.current.useRef(k)},St.useState=function(k){return Q.current.useState(k)},St.useSyncExternalStore=function(k,ee,Fe){return Q.current.useSyncExternalStore(k,ee,Fe)},St.useTransition=function(){return Q.current.useTransition()},St.version="18.3.1",St}var uv;function sm(){return uv||(uv=1,Jd.exports=cM()),Jd.exports}/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var hv;function uM(){if(hv)return wl;hv=1;var i=sm(),e=Symbol.for("react.element"),t=Symbol.for("react.fragment"),r=Object.prototype.hasOwnProperty,a=i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,l={key:!0,ref:!0,__self:!0,__source:!0};function c(h,d,f){var m,g={},v=null,x=null;f!==void 0&&(v=""+f),d.key!==void 0&&(v=""+d.key),d.ref!==void 0&&(x=d.ref);for(m in d)r.call(d,m)&&!l.hasOwnProperty(m)&&(g[m]=d[m]);if(h&&h.defaultProps)for(m in d=h.defaultProps,d)g[m]===void 0&&(g[m]=d[m]);return{$$typeof:e,type:h,key:v,ref:x,props:g,_owner:a.current}}return wl.Fragment=t,wl.jsx=c,wl.jsxs=c,wl}var dv;function hM(){return dv||(dv=1,Zd.exports=uM()),Zd.exports}var E=hM(),B=sm();const dM=lM(B);var cu={},ef={exports:{}},ai={},tf={exports:{}},nf={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var fv;function fM(){return fv||(fv=1,(function(i){function e($,ne){var he=$.length;$.push(ne);e:for(;0<he;){var k=he-1>>>1,ee=$[k];if(0<a(ee,ne))$[k]=ne,$[he]=ee,he=k;else break e}}function t($){return $.length===0?null:$[0]}function r($){if($.length===0)return null;var ne=$[0],he=$.pop();if(he!==ne){$[0]=he;e:for(var k=0,ee=$.length,Fe=ee>>>1;k<Fe;){var je=2*(k+1)-1,Ge=$[je],ue=je+1,Se=$[ue];if(0>a(Ge,he))ue<ee&&0>a(Se,Ge)?($[k]=Se,$[ue]=he,k=ue):($[k]=Ge,$[je]=he,k=je);else if(ue<ee&&0>a(Se,he))$[k]=Se,$[ue]=he,k=ue;else break e}}return ne}function a($,ne){var he=$.sortIndex-ne.sortIndex;return he!==0?he:$.id-ne.id}if(typeof performance=="object"&&typeof performance.now=="function"){var l=performance;i.unstable_now=function(){return l.now()}}else{var c=Date,h=c.now();i.unstable_now=function(){return c.now()-h}}var d=[],f=[],m=1,g=null,v=3,x=!1,M=!1,b=!1,y=typeof setTimeout=="function"?setTimeout:null,S=typeof clearTimeout=="function"?clearTimeout:null,P=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function L($){for(var ne=t(f);ne!==null;){if(ne.callback===null)r(f);else if(ne.startTime<=$)r(f),ne.sortIndex=ne.expirationTime,e(d,ne);else break;ne=t(f)}}function R($){if(b=!1,L($),!M)if(t(d)!==null)M=!0,ce(D);else{var ne=t(f);ne!==null&&Q(R,ne.startTime-$)}}function D($,ne){M=!1,b&&(b=!1,S(w),w=-1),x=!0;var he=v;try{for(L(ne),g=t(d);g!==null&&(!(g.expirationTime>ne)||$&&!V());){var k=g.callback;if(typeof k=="function"){g.callback=null,v=g.priorityLevel;var ee=k(g.expirationTime<=ne);ne=i.unstable_now(),typeof ee=="function"?g.callback=ee:g===t(d)&&r(d),L(ne)}else r(d);g=t(d)}if(g!==null)var Fe=!0;else{var je=t(f);je!==null&&Q(R,je.startTime-ne),Fe=!1}return Fe}finally{g=null,v=he,x=!1}}var N=!1,F=null,w=-1,I=5,G=-1;function V(){return!(i.unstable_now()-G<I)}function Y(){if(F!==null){var $=i.unstable_now();G=$;var ne=!0;try{ne=F(!0,$)}finally{ne?me():(N=!1,F=null)}}else N=!1}var me;if(typeof P=="function")me=function(){P(Y)};else if(typeof MessageChannel<"u"){var de=new MessageChannel,O=de.port2;de.port1.onmessage=Y,me=function(){O.postMessage(null)}}else me=function(){y(Y,0)};function ce($){F=$,N||(N=!0,me())}function Q($,ne){w=y(function(){$(i.unstable_now())},ne)}i.unstable_IdlePriority=5,i.unstable_ImmediatePriority=1,i.unstable_LowPriority=4,i.unstable_NormalPriority=3,i.unstable_Profiling=null,i.unstable_UserBlockingPriority=2,i.unstable_cancelCallback=function($){$.callback=null},i.unstable_continueExecution=function(){M||x||(M=!0,ce(D))},i.unstable_forceFrameRate=function($){0>$||125<$?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):I=0<$?Math.floor(1e3/$):5},i.unstable_getCurrentPriorityLevel=function(){return v},i.unstable_getFirstCallbackNode=function(){return t(d)},i.unstable_next=function($){switch(v){case 1:case 2:case 3:var ne=3;break;default:ne=v}var he=v;v=ne;try{return $()}finally{v=he}},i.unstable_pauseExecution=function(){},i.unstable_requestPaint=function(){},i.unstable_runWithPriority=function($,ne){switch($){case 1:case 2:case 3:case 4:case 5:break;default:$=3}var he=v;v=$;try{return ne()}finally{v=he}},i.unstable_scheduleCallback=function($,ne,he){var k=i.unstable_now();switch(typeof he=="object"&&he!==null?(he=he.delay,he=typeof he=="number"&&0<he?k+he:k):he=k,$){case 1:var ee=-1;break;case 2:ee=250;break;case 5:ee=1073741823;break;case 4:ee=1e4;break;default:ee=5e3}return ee=he+ee,$={id:m++,callback:ne,priorityLevel:$,startTime:he,expirationTime:ee,sortIndex:-1},he>k?($.sortIndex=he,e(f,$),t(d)===null&&$===t(f)&&(b?(S(w),w=-1):b=!0,Q(R,he-k))):($.sortIndex=ee,e(d,$),M||x||(M=!0,ce(D))),$},i.unstable_shouldYield=V,i.unstable_wrapCallback=function($){var ne=v;return function(){var he=v;v=ne;try{return $.apply(this,arguments)}finally{v=he}}}})(nf)),nf}var pv;function pM(){return pv||(pv=1,tf.exports=fM()),tf.exports}/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var mv;function mM(){if(mv)return ai;mv=1;var i=sm(),e=pM();function t(n){for(var s="https://reactjs.org/docs/error-decoder.html?invariant="+n,o=1;o<arguments.length;o++)s+="&args[]="+encodeURIComponent(arguments[o]);return"Minified React error #"+n+"; visit "+s+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var r=new Set,a={};function l(n,s){c(n,s),c(n+"Capture",s)}function c(n,s){for(a[n]=s,n=0;n<s.length;n++)r.add(s[n])}var h=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),d=Object.prototype.hasOwnProperty,f=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,m={},g={};function v(n){return d.call(g,n)?!0:d.call(m,n)?!1:f.test(n)?g[n]=!0:(m[n]=!0,!1)}function x(n,s,o,u){if(o!==null&&o.type===0)return!1;switch(typeof s){case"function":case"symbol":return!0;case"boolean":return u?!1:o!==null?!o.acceptsBooleans:(n=n.toLowerCase().slice(0,5),n!=="data-"&&n!=="aria-");default:return!1}}function M(n,s,o,u){if(s===null||typeof s>"u"||x(n,s,o,u))return!0;if(u)return!1;if(o!==null)switch(o.type){case 3:return!s;case 4:return s===!1;case 5:return isNaN(s);case 6:return isNaN(s)||1>s}return!1}function b(n,s,o,u,p,_,C){this.acceptsBooleans=s===2||s===3||s===4,this.attributeName=u,this.attributeNamespace=p,this.mustUseProperty=o,this.propertyName=n,this.type=s,this.sanitizeURL=_,this.removeEmptyString=C}var y={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(n){y[n]=new b(n,0,!1,n,null,!1,!1)}),[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(n){var s=n[0];y[s]=new b(s,1,!1,n[1],null,!1,!1)}),["contentEditable","draggable","spellCheck","value"].forEach(function(n){y[n]=new b(n,2,!1,n.toLowerCase(),null,!1,!1)}),["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(n){y[n]=new b(n,2,!1,n,null,!1,!1)}),"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(n){y[n]=new b(n,3,!1,n.toLowerCase(),null,!1,!1)}),["checked","multiple","muted","selected"].forEach(function(n){y[n]=new b(n,3,!0,n,null,!1,!1)}),["capture","download"].forEach(function(n){y[n]=new b(n,4,!1,n,null,!1,!1)}),["cols","rows","size","span"].forEach(function(n){y[n]=new b(n,6,!1,n,null,!1,!1)}),["rowSpan","start"].forEach(function(n){y[n]=new b(n,5,!1,n.toLowerCase(),null,!1,!1)});var S=/[\-:]([a-z])/g;function P(n){return n[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(n){var s=n.replace(S,P);y[s]=new b(s,1,!1,n,null,!1,!1)}),"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(n){var s=n.replace(S,P);y[s]=new b(s,1,!1,n,"http://www.w3.org/1999/xlink",!1,!1)}),["xml:base","xml:lang","xml:space"].forEach(function(n){var s=n.replace(S,P);y[s]=new b(s,1,!1,n,"http://www.w3.org/XML/1998/namespace",!1,!1)}),["tabIndex","crossOrigin"].forEach(function(n){y[n]=new b(n,1,!1,n.toLowerCase(),null,!1,!1)}),y.xlinkHref=new b("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1),["src","href","action","formAction"].forEach(function(n){y[n]=new b(n,1,!1,n.toLowerCase(),null,!0,!0)});function L(n,s,o,u){var p=y.hasOwnProperty(s)?y[s]:null;(p!==null?p.type!==0:u||!(2<s.length)||s[0]!=="o"&&s[0]!=="O"||s[1]!=="n"&&s[1]!=="N")&&(M(s,o,p,u)&&(o=null),u||p===null?v(s)&&(o===null?n.removeAttribute(s):n.setAttribute(s,""+o)):p.mustUseProperty?n[p.propertyName]=o===null?p.type===3?!1:"":o:(s=p.attributeName,u=p.attributeNamespace,o===null?n.removeAttribute(s):(p=p.type,o=p===3||p===4&&o===!0?"":""+o,u?n.setAttributeNS(u,s,o):n.setAttribute(s,o))))}var R=i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,D=Symbol.for("react.element"),N=Symbol.for("react.portal"),F=Symbol.for("react.fragment"),w=Symbol.for("react.strict_mode"),I=Symbol.for("react.profiler"),G=Symbol.for("react.provider"),V=Symbol.for("react.context"),Y=Symbol.for("react.forward_ref"),me=Symbol.for("react.suspense"),de=Symbol.for("react.suspense_list"),O=Symbol.for("react.memo"),ce=Symbol.for("react.lazy"),Q=Symbol.for("react.offscreen"),$=Symbol.iterator;function ne(n){return n===null||typeof n!="object"?null:(n=$&&n[$]||n["@@iterator"],typeof n=="function"?n:null)}var he=Object.assign,k;function ee(n){if(k===void 0)try{throw Error()}catch(o){var s=o.stack.trim().match(/\n( *(at )?)/);k=s&&s[1]||""}return`
`+k+n}var Fe=!1;function je(n,s){if(!n||Fe)return"";Fe=!0;var o=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(s)if(s=function(){throw Error()},Object.defineProperty(s.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(s,[])}catch(pe){var u=pe}Reflect.construct(n,[],s)}else{try{s.call()}catch(pe){u=pe}n.call(s.prototype)}else{try{throw Error()}catch(pe){u=pe}n()}}catch(pe){if(pe&&u&&typeof pe.stack=="string"){for(var p=pe.stack.split(`
`),_=u.stack.split(`
`),C=p.length-1,z=_.length-1;1<=C&&0<=z&&p[C]!==_[z];)z--;for(;1<=C&&0<=z;C--,z--)if(p[C]!==_[z]){if(C!==1||z!==1)do if(C--,z--,0>z||p[C]!==_[z]){var W=`
`+p[C].replace(" at new "," at ");return n.displayName&&W.includes("<anonymous>")&&(W=W.replace("<anonymous>",n.displayName)),W}while(1<=C&&0<=z);break}}}finally{Fe=!1,Error.prepareStackTrace=o}return(n=n?n.displayName||n.name:"")?ee(n):""}function Ge(n){switch(n.tag){case 5:return ee(n.type);case 16:return ee("Lazy");case 13:return ee("Suspense");case 19:return ee("SuspenseList");case 0:case 2:case 15:return n=je(n.type,!1),n;case 11:return n=je(n.type.render,!1),n;case 1:return n=je(n.type,!0),n;default:return""}}function ue(n){if(n==null)return null;if(typeof n=="function")return n.displayName||n.name||null;if(typeof n=="string")return n;switch(n){case F:return"Fragment";case N:return"Portal";case I:return"Profiler";case w:return"StrictMode";case me:return"Suspense";case de:return"SuspenseList"}if(typeof n=="object")switch(n.$$typeof){case V:return(n.displayName||"Context")+".Consumer";case G:return(n._context.displayName||"Context")+".Provider";case Y:var s=n.render;return n=n.displayName,n||(n=s.displayName||s.name||"",n=n!==""?"ForwardRef("+n+")":"ForwardRef"),n;case O:return s=n.displayName||null,s!==null?s:ue(n.type)||"Memo";case ce:s=n._payload,n=n._init;try{return ue(n(s))}catch{}}return null}function Se(n){var s=n.type;switch(n.tag){case 24:return"Cache";case 9:return(s.displayName||"Context")+".Consumer";case 10:return(s._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return n=s.render,n=n.displayName||n.name||"",s.displayName||(n!==""?"ForwardRef("+n+")":"ForwardRef");case 7:return"Fragment";case 5:return s;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return ue(s);case 8:return s===w?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof s=="function")return s.displayName||s.name||null;if(typeof s=="string")return s}return null}function xe(n){switch(typeof n){case"boolean":case"number":case"string":case"undefined":return n;case"object":return n;default:return""}}function te(n){var s=n.type;return(n=n.nodeName)&&n.toLowerCase()==="input"&&(s==="checkbox"||s==="radio")}function Ue(n){var s=te(n)?"checked":"value",o=Object.getOwnPropertyDescriptor(n.constructor.prototype,s),u=""+n[s];if(!n.hasOwnProperty(s)&&typeof o<"u"&&typeof o.get=="function"&&typeof o.set=="function"){var p=o.get,_=o.set;return Object.defineProperty(n,s,{configurable:!0,get:function(){return p.call(this)},set:function(C){u=""+C,_.call(this,C)}}),Object.defineProperty(n,s,{enumerable:o.enumerable}),{getValue:function(){return u},setValue:function(C){u=""+C},stopTracking:function(){n._valueTracker=null,delete n[s]}}}}function tt(n){n._valueTracker||(n._valueTracker=Ue(n))}function Dt(n){if(!n)return!1;var s=n._valueTracker;if(!s)return!0;var o=s.getValue(),u="";return n&&(u=te(n)?n.checked?"true":"false":n.value),n=u,n!==o?(s.setValue(n),!0):!1}function ct(n){if(n=n||(typeof document<"u"?document:void 0),typeof n>"u")return null;try{return n.activeElement||n.body}catch{return n.body}}function At(n,s){var o=s.checked;return he({},s,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:o??n._wrapperState.initialChecked})}function Et(n,s){var o=s.defaultValue==null?"":s.defaultValue,u=s.checked!=null?s.checked:s.defaultChecked;o=xe(s.value!=null?s.value:o),n._wrapperState={initialChecked:u,initialValue:o,controlled:s.type==="checkbox"||s.type==="radio"?s.checked!=null:s.value!=null}}function _t(n,s){s=s.checked,s!=null&&L(n,"checked",s,!1)}function Wt(n,s){_t(n,s);var o=xe(s.value),u=s.type;if(o!=null)u==="number"?(o===0&&n.value===""||n.value!=o)&&(n.value=""+o):n.value!==""+o&&(n.value=""+o);else if(u==="submit"||u==="reset"){n.removeAttribute("value");return}s.hasOwnProperty("value")?Jt(n,s.type,o):s.hasOwnProperty("defaultValue")&&Jt(n,s.type,xe(s.defaultValue)),s.checked==null&&s.defaultChecked!=null&&(n.defaultChecked=!!s.defaultChecked)}function $t(n,s,o){if(s.hasOwnProperty("value")||s.hasOwnProperty("defaultValue")){var u=s.type;if(!(u!=="submit"&&u!=="reset"||s.value!==void 0&&s.value!==null))return;s=""+n._wrapperState.initialValue,o||s===n.value||(n.value=s),n.defaultValue=s}o=n.name,o!==""&&(n.name=""),n.defaultChecked=!!n._wrapperState.initialChecked,o!==""&&(n.name=o)}function Jt(n,s,o){(s!=="number"||ct(n.ownerDocument)!==n)&&(o==null?n.defaultValue=""+n._wrapperState.initialValue:n.defaultValue!==""+o&&(n.defaultValue=""+o))}var qt=Array.isArray;function wt(n,s,o,u){if(n=n.options,s){s={};for(var p=0;p<o.length;p++)s["$"+o[p]]=!0;for(o=0;o<n.length;o++)p=s.hasOwnProperty("$"+n[o].value),n[o].selected!==p&&(n[o].selected=p),p&&u&&(n[o].defaultSelected=!0)}else{for(o=""+xe(o),s=null,p=0;p<n.length;p++){if(n[p].value===o){n[p].selected=!0,u&&(n[p].defaultSelected=!0);return}s!==null||n[p].disabled||(s=n[p])}s!==null&&(s.selected=!0)}}function Gt(n,s){if(s.dangerouslySetInnerHTML!=null)throw Error(t(91));return he({},s,{value:void 0,defaultValue:void 0,children:""+n._wrapperState.initialValue})}function q(n,s){var o=s.value;if(o==null){if(o=s.children,s=s.defaultValue,o!=null){if(s!=null)throw Error(t(92));if(qt(o)){if(1<o.length)throw Error(t(93));o=o[0]}s=o}s==null&&(s=""),o=s}n._wrapperState={initialValue:xe(o)}}function xn(n,s){var o=xe(s.value),u=xe(s.defaultValue);o!=null&&(o=""+o,o!==n.value&&(n.value=o),s.defaultValue==null&&n.defaultValue!==o&&(n.defaultValue=o)),u!=null&&(n.defaultValue=""+u)}function Rt(n){var s=n.textContent;s===n._wrapperState.initialValue&&s!==""&&s!==null&&(n.value=s)}function U(n){switch(n){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function T(n,s){return n==null||n==="http://www.w3.org/1999/xhtml"?U(s):n==="http://www.w3.org/2000/svg"&&s==="foreignObject"?"http://www.w3.org/1999/xhtml":n}var Z,se=(function(n){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(s,o,u,p){MSApp.execUnsafeLocalFunction(function(){return n(s,o,u,p)})}:n})(function(n,s){if(n.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in n)n.innerHTML=s;else{for(Z=Z||document.createElement("div"),Z.innerHTML="<svg>"+s.valueOf().toString()+"</svg>",s=Z.firstChild;n.firstChild;)n.removeChild(n.firstChild);for(;s.firstChild;)n.appendChild(s.firstChild)}});function ge(n,s){if(s){var o=n.firstChild;if(o&&o===n.lastChild&&o.nodeType===3){o.nodeValue=s;return}}n.textContent=s}var Te={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},Ae=["Webkit","ms","Moz","O"];Object.keys(Te).forEach(function(n){Ae.forEach(function(s){s=s+n.charAt(0).toUpperCase()+n.substring(1),Te[s]=Te[n]})});function ve(n,s,o){return s==null||typeof s=="boolean"||s===""?"":o||typeof s!="number"||s===0||Te.hasOwnProperty(n)&&Te[n]?(""+s).trim():s+"px"}function _e(n,s){n=n.style;for(var o in s)if(s.hasOwnProperty(o)){var u=o.indexOf("--")===0,p=ve(o,s[o],u);o==="float"&&(o="cssFloat"),u?n.setProperty(o,p):n[o]=p}}var Ie=he({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function Xe(n,s){if(s){if(Ie[n]&&(s.children!=null||s.dangerouslySetInnerHTML!=null))throw Error(t(137,n));if(s.dangerouslySetInnerHTML!=null){if(s.children!=null)throw Error(t(60));if(typeof s.dangerouslySetInnerHTML!="object"||!("__html"in s.dangerouslySetInnerHTML))throw Error(t(61))}if(s.style!=null&&typeof s.style!="object")throw Error(t(62))}}function re(n,s){if(n.indexOf("-")===-1)return typeof s.is=="string";switch(n){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Ee=null;function Be(n){return n=n.target||n.srcElement||window,n.correspondingUseElement&&(n=n.correspondingUseElement),n.nodeType===3?n.parentNode:n}var nt=null,st=null,j=null;function Ne(n){if(n=cl(n)){if(typeof nt!="function")throw Error(t(280));var s=n.stateNode;s&&(s=Ec(s),nt(n.stateNode,n.type,s))}}function ye(n){st?j?j.push(n):j=[n]:st=n}function De(){if(st){var n=st,s=j;if(j=st=null,Ne(n),s)for(n=0;n<s.length;n++)Ne(s[n])}}function Oe(n,s){return n(s)}function Me(){}var Ke=!1;function qe(n,s,o){if(Ke)return n(s,o);Ke=!0;try{return Oe(n,s,o)}finally{Ke=!1,(st!==null||j!==null)&&(Me(),De())}}function Ht(n,s){var o=n.stateNode;if(o===null)return null;var u=Ec(o);if(u===null)return null;o=u[s];e:switch(s){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(u=!u.disabled)||(n=n.type,u=!(n==="button"||n==="input"||n==="select"||n==="textarea")),n=!u;break e;default:n=!1}if(n)return null;if(o&&typeof o!="function")throw Error(t(231,s,typeof o));return o}var It=!1;if(h)try{var Fn={};Object.defineProperty(Fn,"passive",{get:function(){It=!0}}),window.addEventListener("test",Fn,Fn),window.removeEventListener("test",Fn,Fn)}catch{It=!1}function Ei(n,s,o,u,p,_,C,z,W){var pe=Array.prototype.slice.call(arguments,3);try{s.apply(o,pe)}catch(be){this.onError(be)}}var ks=!1,wa=null,zs=!1,Bs=null,yh={onError:function(n){ks=!0,wa=n}};function sc(n,s,o,u,p,_,C,z,W){ks=!1,wa=null,Ei.apply(yh,arguments)}function ac(n,s,o,u,p,_,C,z,W){if(sc.apply(this,arguments),ks){if(ks){var pe=wa;ks=!1,wa=null}else throw Error(t(198));zs||(zs=!0,Bs=pe)}}function Xn(n){var s=n,o=n;if(n.alternate)for(;s.return;)s=s.return;else{n=s;do s=n,(s.flags&4098)!==0&&(o=s.return),n=s.return;while(n)}return s.tag===3?o:null}function Ta(n){if(n.tag===13){var s=n.memoizedState;if(s===null&&(n=n.alternate,n!==null&&(s=n.memoizedState)),s!==null)return s.dehydrated}return null}function Go(n){if(Xn(n)!==n)throw Error(t(188))}function oc(n){var s=n.alternate;if(!s){if(s=Xn(n),s===null)throw Error(t(188));return s!==n?null:n}for(var o=n,u=s;;){var p=o.return;if(p===null)break;var _=p.alternate;if(_===null){if(u=p.return,u!==null){o=u;continue}break}if(p.child===_.child){for(_=p.child;_;){if(_===o)return Go(p),n;if(_===u)return Go(p),s;_=_.sibling}throw Error(t(188))}if(o.return!==u.return)o=p,u=_;else{for(var C=!1,z=p.child;z;){if(z===o){C=!0,o=p,u=_;break}if(z===u){C=!0,u=p,o=_;break}z=z.sibling}if(!C){for(z=_.child;z;){if(z===o){C=!0,o=_,u=p;break}if(z===u){C=!0,u=_,o=p;break}z=z.sibling}if(!C)throw Error(t(189))}}if(o.alternate!==u)throw Error(t(190))}if(o.tag!==3)throw Error(t(188));return o.stateNode.current===o?n:s}function Hs(n){return n=oc(n),n!==null?Wo(n):null}function Wo(n){if(n.tag===5||n.tag===6)return n;for(n=n.child;n!==null;){var s=Wo(n);if(s!==null)return s;n=n.sibling}return null}var Vs=e.unstable_scheduleCallback,jo=e.unstable_cancelCallback,lc=e.unstable_shouldYield,Sh=e.unstable_requestPaint,sn=e.unstable_now,Mh=e.unstable_getCurrentPriorityLevel,Xo=e.unstable_ImmediatePriority,A=e.unstable_UserBlockingPriority,K=e.unstable_NormalPriority,fe=e.unstable_LowPriority,oe=e.unstable_IdlePriority,ae=null,Le=null;function We(n){if(Le&&typeof Le.onCommitFiberRoot=="function")try{Le.onCommitFiberRoot(ae,n,void 0,(n.current.flags&128)===128)}catch{}}var Pe=Math.clz32?Math.clz32:dt,Qe=Math.log,it=Math.LN2;function dt(n){return n>>>=0,n===0?32:31-(Qe(n)/it|0)|0}var ft=64,Je=4194304;function Ct(n){switch(n&-n){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return n&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return n&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return n}}function jt(n,s){var o=n.pendingLanes;if(o===0)return 0;var u=0,p=n.suspendedLanes,_=n.pingedLanes,C=o&268435455;if(C!==0){var z=C&~p;z!==0?u=Ct(z):(_&=C,_!==0&&(u=Ct(_)))}else C=o&~p,C!==0?u=Ct(C):_!==0&&(u=Ct(_));if(u===0)return 0;if(s!==0&&s!==u&&(s&p)===0&&(p=u&-u,_=s&-s,p>=_||p===16&&(_&4194240)!==0))return s;if((u&4)!==0&&(u|=o&16),s=n.entangledLanes,s!==0)for(n=n.entanglements,s&=u;0<s;)o=31-Pe(s),p=1<<o,u|=n[o],s&=~p;return u}function en(n,s){switch(n){case 1:case 2:case 4:return s+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return s+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function kt(n,s){for(var o=n.suspendedLanes,u=n.pingedLanes,p=n.expirationTimes,_=n.pendingLanes;0<_;){var C=31-Pe(_),z=1<<C,W=p[C];W===-1?((z&o)===0||(z&u)!==0)&&(p[C]=en(z,s)):W<=s&&(n.expiredLanes|=z),_&=~z}}function fn(n){return n=n.pendingLanes&-1073741825,n!==0?n:n&1073741824?1073741824:0}function He(){var n=ft;return ft<<=1,(ft&4194240)===0&&(ft=64),n}function Nn(n){for(var s=[],o=0;31>o;o++)s.push(n);return s}function xt(n,s,o){n.pendingLanes|=s,s!==536870912&&(n.suspendedLanes=0,n.pingedLanes=0),n=n.eventTimes,s=31-Pe(s),n[s]=o}function Jn(n,s){var o=n.pendingLanes&~s;n.pendingLanes=s,n.suspendedLanes=0,n.pingedLanes=0,n.expiredLanes&=s,n.mutableReadLanes&=s,n.entangledLanes&=s,s=n.entanglements;var u=n.eventTimes;for(n=n.expirationTimes;0<o;){var p=31-Pe(o),_=1<<p;s[p]=0,u[p]=-1,n[p]=-1,o&=~_}}function ei(n,s){var o=n.entangledLanes|=s;for(n=n.entanglements;o;){var u=31-Pe(o),p=1<<u;p&s|n[u]&s&&(n[u]|=s),o&=~p}}var yt=0;function yr(n){return n&=-n,1<n?4<n?(n&268435455)!==0?16:536870912:4:1}var Ut,Yt,Ui,zt,Fi,er=!1,Gs=[],Yr=null,Kr=null,Qr=null,$o=new Map,qo=new Map,Zr=[],Py="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function jm(n,s){switch(n){case"focusin":case"focusout":Yr=null;break;case"dragenter":case"dragleave":Kr=null;break;case"mouseover":case"mouseout":Qr=null;break;case"pointerover":case"pointerout":$o.delete(s.pointerId);break;case"gotpointercapture":case"lostpointercapture":qo.delete(s.pointerId)}}function Yo(n,s,o,u,p,_){return n===null||n.nativeEvent!==_?(n={blockedOn:s,domEventName:o,eventSystemFlags:u,nativeEvent:_,targetContainers:[p]},s!==null&&(s=cl(s),s!==null&&Yt(s)),n):(n.eventSystemFlags|=u,s=n.targetContainers,p!==null&&s.indexOf(p)===-1&&s.push(p),n)}function Ny(n,s,o,u,p){switch(s){case"focusin":return Yr=Yo(Yr,n,s,o,u,p),!0;case"dragenter":return Kr=Yo(Kr,n,s,o,u,p),!0;case"mouseover":return Qr=Yo(Qr,n,s,o,u,p),!0;case"pointerover":var _=p.pointerId;return $o.set(_,Yo($o.get(_)||null,n,s,o,u,p)),!0;case"gotpointercapture":return _=p.pointerId,qo.set(_,Yo(qo.get(_)||null,n,s,o,u,p)),!0}return!1}function Xm(n){var s=Ws(n.target);if(s!==null){var o=Xn(s);if(o!==null){if(s=o.tag,s===13){if(s=Ta(o),s!==null){n.blockedOn=s,Fi(n.priority,function(){Ui(o)});return}}else if(s===3&&o.stateNode.current.memoizedState.isDehydrated){n.blockedOn=o.tag===3?o.stateNode.containerInfo:null;return}}}n.blockedOn=null}function cc(n){if(n.blockedOn!==null)return!1;for(var s=n.targetContainers;0<s.length;){var o=wh(n.domEventName,n.eventSystemFlags,s[0],n.nativeEvent);if(o===null){o=n.nativeEvent;var u=new o.constructor(o.type,o);Ee=u,o.target.dispatchEvent(u),Ee=null}else return s=cl(o),s!==null&&Yt(s),n.blockedOn=o,!1;s.shift()}return!0}function $m(n,s,o){cc(n)&&o.delete(s)}function Ly(){er=!1,Yr!==null&&cc(Yr)&&(Yr=null),Kr!==null&&cc(Kr)&&(Kr=null),Qr!==null&&cc(Qr)&&(Qr=null),$o.forEach($m),qo.forEach($m)}function Ko(n,s){n.blockedOn===s&&(n.blockedOn=null,er||(er=!0,e.unstable_scheduleCallback(e.unstable_NormalPriority,Ly)))}function Qo(n){function s(p){return Ko(p,n)}if(0<Gs.length){Ko(Gs[0],n);for(var o=1;o<Gs.length;o++){var u=Gs[o];u.blockedOn===n&&(u.blockedOn=null)}}for(Yr!==null&&Ko(Yr,n),Kr!==null&&Ko(Kr,n),Qr!==null&&Ko(Qr,n),$o.forEach(s),qo.forEach(s),o=0;o<Zr.length;o++)u=Zr[o],u.blockedOn===n&&(u.blockedOn=null);for(;0<Zr.length&&(o=Zr[0],o.blockedOn===null);)Xm(o),o.blockedOn===null&&Zr.shift()}var ba=R.ReactCurrentBatchConfig,uc=!0;function Dy(n,s,o,u){var p=yt,_=ba.transition;ba.transition=null;try{yt=1,Eh(n,s,o,u)}finally{yt=p,ba.transition=_}}function Iy(n,s,o,u){var p=yt,_=ba.transition;ba.transition=null;try{yt=4,Eh(n,s,o,u)}finally{yt=p,ba.transition=_}}function Eh(n,s,o,u){if(uc){var p=wh(n,s,o,u);if(p===null)Hh(n,s,u,hc,o),jm(n,u);else if(Ny(p,n,s,o,u))u.stopPropagation();else if(jm(n,u),s&4&&-1<Py.indexOf(n)){for(;p!==null;){var _=cl(p);if(_!==null&&Ut(_),_=wh(n,s,o,u),_===null&&Hh(n,s,u,hc,o),_===p)break;p=_}p!==null&&u.stopPropagation()}else Hh(n,s,u,null,o)}}var hc=null;function wh(n,s,o,u){if(hc=null,n=Be(u),n=Ws(n),n!==null)if(s=Xn(n),s===null)n=null;else if(o=s.tag,o===13){if(n=Ta(s),n!==null)return n;n=null}else if(o===3){if(s.stateNode.current.memoizedState.isDehydrated)return s.tag===3?s.stateNode.containerInfo:null;n=null}else s!==n&&(n=null);return hc=n,null}function qm(n){switch(n){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(Mh()){case Xo:return 1;case A:return 4;case K:case fe:return 16;case oe:return 536870912;default:return 16}default:return 16}}var Jr=null,Th=null,dc=null;function Ym(){if(dc)return dc;var n,s=Th,o=s.length,u,p="value"in Jr?Jr.value:Jr.textContent,_=p.length;for(n=0;n<o&&s[n]===p[n];n++);var C=o-n;for(u=1;u<=C&&s[o-u]===p[_-u];u++);return dc=p.slice(n,1<u?1-u:void 0)}function fc(n){var s=n.keyCode;return"charCode"in n?(n=n.charCode,n===0&&s===13&&(n=13)):n=s,n===10&&(n=13),32<=n||n===13?n:0}function pc(){return!0}function Km(){return!1}function di(n){function s(o,u,p,_,C){this._reactName=o,this._targetInst=p,this.type=u,this.nativeEvent=_,this.target=C,this.currentTarget=null;for(var z in n)n.hasOwnProperty(z)&&(o=n[z],this[z]=o?o(_):_[z]);return this.isDefaultPrevented=(_.defaultPrevented!=null?_.defaultPrevented:_.returnValue===!1)?pc:Km,this.isPropagationStopped=Km,this}return he(s.prototype,{preventDefault:function(){this.defaultPrevented=!0;var o=this.nativeEvent;o&&(o.preventDefault?o.preventDefault():typeof o.returnValue!="unknown"&&(o.returnValue=!1),this.isDefaultPrevented=pc)},stopPropagation:function(){var o=this.nativeEvent;o&&(o.stopPropagation?o.stopPropagation():typeof o.cancelBubble!="unknown"&&(o.cancelBubble=!0),this.isPropagationStopped=pc)},persist:function(){},isPersistent:pc}),s}var Ra={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(n){return n.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},bh=di(Ra),Zo=he({},Ra,{view:0,detail:0}),Uy=di(Zo),Rh,Ch,Jo,mc=he({},Zo,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Ph,button:0,buttons:0,relatedTarget:function(n){return n.relatedTarget===void 0?n.fromElement===n.srcElement?n.toElement:n.fromElement:n.relatedTarget},movementX:function(n){return"movementX"in n?n.movementX:(n!==Jo&&(Jo&&n.type==="mousemove"?(Rh=n.screenX-Jo.screenX,Ch=n.screenY-Jo.screenY):Ch=Rh=0,Jo=n),Rh)},movementY:function(n){return"movementY"in n?n.movementY:Ch}}),Qm=di(mc),Fy=he({},mc,{dataTransfer:0}),Oy=di(Fy),ky=he({},Zo,{relatedTarget:0}),Ah=di(ky),zy=he({},Ra,{animationName:0,elapsedTime:0,pseudoElement:0}),By=di(zy),Hy=he({},Ra,{clipboardData:function(n){return"clipboardData"in n?n.clipboardData:window.clipboardData}}),Vy=di(Hy),Gy=he({},Ra,{data:0}),Zm=di(Gy),Wy={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},jy={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},Xy={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function $y(n){var s=this.nativeEvent;return s.getModifierState?s.getModifierState(n):(n=Xy[n])?!!s[n]:!1}function Ph(){return $y}var qy=he({},Zo,{key:function(n){if(n.key){var s=Wy[n.key]||n.key;if(s!=="Unidentified")return s}return n.type==="keypress"?(n=fc(n),n===13?"Enter":String.fromCharCode(n)):n.type==="keydown"||n.type==="keyup"?jy[n.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Ph,charCode:function(n){return n.type==="keypress"?fc(n):0},keyCode:function(n){return n.type==="keydown"||n.type==="keyup"?n.keyCode:0},which:function(n){return n.type==="keypress"?fc(n):n.type==="keydown"||n.type==="keyup"?n.keyCode:0}}),Yy=di(qy),Ky=he({},mc,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),Jm=di(Ky),Qy=he({},Zo,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Ph}),Zy=di(Qy),Jy=he({},Ra,{propertyName:0,elapsedTime:0,pseudoElement:0}),eS=di(Jy),tS=he({},mc,{deltaX:function(n){return"deltaX"in n?n.deltaX:"wheelDeltaX"in n?-n.wheelDeltaX:0},deltaY:function(n){return"deltaY"in n?n.deltaY:"wheelDeltaY"in n?-n.wheelDeltaY:"wheelDelta"in n?-n.wheelDelta:0},deltaZ:0,deltaMode:0}),nS=di(tS),iS=[9,13,27,32],Nh=h&&"CompositionEvent"in window,el=null;h&&"documentMode"in document&&(el=document.documentMode);var rS=h&&"TextEvent"in window&&!el,eg=h&&(!Nh||el&&8<el&&11>=el),tg=" ",ng=!1;function ig(n,s){switch(n){case"keyup":return iS.indexOf(s.keyCode)!==-1;case"keydown":return s.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function rg(n){return n=n.detail,typeof n=="object"&&"data"in n?n.data:null}var Ca=!1;function sS(n,s){switch(n){case"compositionend":return rg(s);case"keypress":return s.which!==32?null:(ng=!0,tg);case"textInput":return n=s.data,n===tg&&ng?null:n;default:return null}}function aS(n,s){if(Ca)return n==="compositionend"||!Nh&&ig(n,s)?(n=Ym(),dc=Th=Jr=null,Ca=!1,n):null;switch(n){case"paste":return null;case"keypress":if(!(s.ctrlKey||s.altKey||s.metaKey)||s.ctrlKey&&s.altKey){if(s.char&&1<s.char.length)return s.char;if(s.which)return String.fromCharCode(s.which)}return null;case"compositionend":return eg&&s.locale!=="ko"?null:s.data;default:return null}}var oS={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function sg(n){var s=n&&n.nodeName&&n.nodeName.toLowerCase();return s==="input"?!!oS[n.type]:s==="textarea"}function ag(n,s,o,u){ye(u),s=yc(s,"onChange"),0<s.length&&(o=new bh("onChange","change",null,o,u),n.push({event:o,listeners:s}))}var tl=null,nl=null;function lS(n){wg(n,0)}function gc(n){var s=Da(n);if(Dt(s))return n}function cS(n,s){if(n==="change")return s}var og=!1;if(h){var Lh;if(h){var Dh="oninput"in document;if(!Dh){var lg=document.createElement("div");lg.setAttribute("oninput","return;"),Dh=typeof lg.oninput=="function"}Lh=Dh}else Lh=!1;og=Lh&&(!document.documentMode||9<document.documentMode)}function cg(){tl&&(tl.detachEvent("onpropertychange",ug),nl=tl=null)}function ug(n){if(n.propertyName==="value"&&gc(nl)){var s=[];ag(s,nl,n,Be(n)),qe(lS,s)}}function uS(n,s,o){n==="focusin"?(cg(),tl=s,nl=o,tl.attachEvent("onpropertychange",ug)):n==="focusout"&&cg()}function hS(n){if(n==="selectionchange"||n==="keyup"||n==="keydown")return gc(nl)}function dS(n,s){if(n==="click")return gc(s)}function fS(n,s){if(n==="input"||n==="change")return gc(s)}function pS(n,s){return n===s&&(n!==0||1/n===1/s)||n!==n&&s!==s}var Oi=typeof Object.is=="function"?Object.is:pS;function il(n,s){if(Oi(n,s))return!0;if(typeof n!="object"||n===null||typeof s!="object"||s===null)return!1;var o=Object.keys(n),u=Object.keys(s);if(o.length!==u.length)return!1;for(u=0;u<o.length;u++){var p=o[u];if(!d.call(s,p)||!Oi(n[p],s[p]))return!1}return!0}function hg(n){for(;n&&n.firstChild;)n=n.firstChild;return n}function dg(n,s){var o=hg(n);n=0;for(var u;o;){if(o.nodeType===3){if(u=n+o.textContent.length,n<=s&&u>=s)return{node:o,offset:s-n};n=u}e:{for(;o;){if(o.nextSibling){o=o.nextSibling;break e}o=o.parentNode}o=void 0}o=hg(o)}}function fg(n,s){return n&&s?n===s?!0:n&&n.nodeType===3?!1:s&&s.nodeType===3?fg(n,s.parentNode):"contains"in n?n.contains(s):n.compareDocumentPosition?!!(n.compareDocumentPosition(s)&16):!1:!1}function pg(){for(var n=window,s=ct();s instanceof n.HTMLIFrameElement;){try{var o=typeof s.contentWindow.location.href=="string"}catch{o=!1}if(o)n=s.contentWindow;else break;s=ct(n.document)}return s}function Ih(n){var s=n&&n.nodeName&&n.nodeName.toLowerCase();return s&&(s==="input"&&(n.type==="text"||n.type==="search"||n.type==="tel"||n.type==="url"||n.type==="password")||s==="textarea"||n.contentEditable==="true")}function mS(n){var s=pg(),o=n.focusedElem,u=n.selectionRange;if(s!==o&&o&&o.ownerDocument&&fg(o.ownerDocument.documentElement,o)){if(u!==null&&Ih(o)){if(s=u.start,n=u.end,n===void 0&&(n=s),"selectionStart"in o)o.selectionStart=s,o.selectionEnd=Math.min(n,o.value.length);else if(n=(s=o.ownerDocument||document)&&s.defaultView||window,n.getSelection){n=n.getSelection();var p=o.textContent.length,_=Math.min(u.start,p);u=u.end===void 0?_:Math.min(u.end,p),!n.extend&&_>u&&(p=u,u=_,_=p),p=dg(o,_);var C=dg(o,u);p&&C&&(n.rangeCount!==1||n.anchorNode!==p.node||n.anchorOffset!==p.offset||n.focusNode!==C.node||n.focusOffset!==C.offset)&&(s=s.createRange(),s.setStart(p.node,p.offset),n.removeAllRanges(),_>u?(n.addRange(s),n.extend(C.node,C.offset)):(s.setEnd(C.node,C.offset),n.addRange(s)))}}for(s=[],n=o;n=n.parentNode;)n.nodeType===1&&s.push({element:n,left:n.scrollLeft,top:n.scrollTop});for(typeof o.focus=="function"&&o.focus(),o=0;o<s.length;o++)n=s[o],n.element.scrollLeft=n.left,n.element.scrollTop=n.top}}var gS=h&&"documentMode"in document&&11>=document.documentMode,Aa=null,Uh=null,rl=null,Fh=!1;function mg(n,s,o){var u=o.window===o?o.document:o.nodeType===9?o:o.ownerDocument;Fh||Aa==null||Aa!==ct(u)||(u=Aa,"selectionStart"in u&&Ih(u)?u={start:u.selectionStart,end:u.selectionEnd}:(u=(u.ownerDocument&&u.ownerDocument.defaultView||window).getSelection(),u={anchorNode:u.anchorNode,anchorOffset:u.anchorOffset,focusNode:u.focusNode,focusOffset:u.focusOffset}),rl&&il(rl,u)||(rl=u,u=yc(Uh,"onSelect"),0<u.length&&(s=new bh("onSelect","select",null,s,o),n.push({event:s,listeners:u}),s.target=Aa)))}function vc(n,s){var o={};return o[n.toLowerCase()]=s.toLowerCase(),o["Webkit"+n]="webkit"+s,o["Moz"+n]="moz"+s,o}var Pa={animationend:vc("Animation","AnimationEnd"),animationiteration:vc("Animation","AnimationIteration"),animationstart:vc("Animation","AnimationStart"),transitionend:vc("Transition","TransitionEnd")},Oh={},gg={};h&&(gg=document.createElement("div").style,"AnimationEvent"in window||(delete Pa.animationend.animation,delete Pa.animationiteration.animation,delete Pa.animationstart.animation),"TransitionEvent"in window||delete Pa.transitionend.transition);function xc(n){if(Oh[n])return Oh[n];if(!Pa[n])return n;var s=Pa[n],o;for(o in s)if(s.hasOwnProperty(o)&&o in gg)return Oh[n]=s[o];return n}var vg=xc("animationend"),xg=xc("animationiteration"),_g=xc("animationstart"),yg=xc("transitionend"),Sg=new Map,Mg="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function es(n,s){Sg.set(n,s),l(s,[n])}for(var kh=0;kh<Mg.length;kh++){var zh=Mg[kh],vS=zh.toLowerCase(),xS=zh[0].toUpperCase()+zh.slice(1);es(vS,"on"+xS)}es(vg,"onAnimationEnd"),es(xg,"onAnimationIteration"),es(_g,"onAnimationStart"),es("dblclick","onDoubleClick"),es("focusin","onFocus"),es("focusout","onBlur"),es(yg,"onTransitionEnd"),c("onMouseEnter",["mouseout","mouseover"]),c("onMouseLeave",["mouseout","mouseover"]),c("onPointerEnter",["pointerout","pointerover"]),c("onPointerLeave",["pointerout","pointerover"]),l("onChange","change click focusin focusout input keydown keyup selectionchange".split(" ")),l("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),l("onBeforeInput",["compositionend","keypress","textInput","paste"]),l("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" ")),l("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" ")),l("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var sl="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),_S=new Set("cancel close invalid load scroll toggle".split(" ").concat(sl));function Eg(n,s,o){var u=n.type||"unknown-event";n.currentTarget=o,ac(u,s,void 0,n),n.currentTarget=null}function wg(n,s){s=(s&4)!==0;for(var o=0;o<n.length;o++){var u=n[o],p=u.event;u=u.listeners;e:{var _=void 0;if(s)for(var C=u.length-1;0<=C;C--){var z=u[C],W=z.instance,pe=z.currentTarget;if(z=z.listener,W!==_&&p.isPropagationStopped())break e;Eg(p,z,pe),_=W}else for(C=0;C<u.length;C++){if(z=u[C],W=z.instance,pe=z.currentTarget,z=z.listener,W!==_&&p.isPropagationStopped())break e;Eg(p,z,pe),_=W}}}if(zs)throw n=Bs,zs=!1,Bs=null,n}function Kt(n,s){var o=s[$h];o===void 0&&(o=s[$h]=new Set);var u=n+"__bubble";o.has(u)||(Tg(s,n,2,!1),o.add(u))}function Bh(n,s,o){var u=0;s&&(u|=4),Tg(o,n,u,s)}var _c="_reactListening"+Math.random().toString(36).slice(2);function al(n){if(!n[_c]){n[_c]=!0,r.forEach(function(o){o!=="selectionchange"&&(_S.has(o)||Bh(o,!1,n),Bh(o,!0,n))});var s=n.nodeType===9?n:n.ownerDocument;s===null||s[_c]||(s[_c]=!0,Bh("selectionchange",!1,s))}}function Tg(n,s,o,u){switch(qm(s)){case 1:var p=Dy;break;case 4:p=Iy;break;default:p=Eh}o=p.bind(null,s,o,n),p=void 0,!It||s!=="touchstart"&&s!=="touchmove"&&s!=="wheel"||(p=!0),u?p!==void 0?n.addEventListener(s,o,{capture:!0,passive:p}):n.addEventListener(s,o,!0):p!==void 0?n.addEventListener(s,o,{passive:p}):n.addEventListener(s,o,!1)}function Hh(n,s,o,u,p){var _=u;if((s&1)===0&&(s&2)===0&&u!==null)e:for(;;){if(u===null)return;var C=u.tag;if(C===3||C===4){var z=u.stateNode.containerInfo;if(z===p||z.nodeType===8&&z.parentNode===p)break;if(C===4)for(C=u.return;C!==null;){var W=C.tag;if((W===3||W===4)&&(W=C.stateNode.containerInfo,W===p||W.nodeType===8&&W.parentNode===p))return;C=C.return}for(;z!==null;){if(C=Ws(z),C===null)return;if(W=C.tag,W===5||W===6){u=_=C;continue e}z=z.parentNode}}u=u.return}qe(function(){var pe=_,be=Be(o),Re=[];e:{var we=Sg.get(n);if(we!==void 0){var Ve=bh,Ye=n;switch(n){case"keypress":if(fc(o)===0)break e;case"keydown":case"keyup":Ve=Yy;break;case"focusin":Ye="focus",Ve=Ah;break;case"focusout":Ye="blur",Ve=Ah;break;case"beforeblur":case"afterblur":Ve=Ah;break;case"click":if(o.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":Ve=Qm;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":Ve=Oy;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":Ve=Zy;break;case vg:case xg:case _g:Ve=By;break;case yg:Ve=eS;break;case"scroll":Ve=Uy;break;case"wheel":Ve=nS;break;case"copy":case"cut":case"paste":Ve=Vy;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":Ve=Jm}var Ze=(s&4)!==0,hn=!Ze&&n==="scroll",ie=Ze?we!==null?we+"Capture":null:we;Ze=[];for(var X=pe,le;X!==null;){le=X;var Ce=le.stateNode;if(le.tag===5&&Ce!==null&&(le=Ce,ie!==null&&(Ce=Ht(X,ie),Ce!=null&&Ze.push(ol(X,Ce,le)))),hn)break;X=X.return}0<Ze.length&&(we=new Ve(we,Ye,null,o,be),Re.push({event:we,listeners:Ze}))}}if((s&7)===0){e:{if(we=n==="mouseover"||n==="pointerover",Ve=n==="mouseout"||n==="pointerout",we&&o!==Ee&&(Ye=o.relatedTarget||o.fromElement)&&(Ws(Ye)||Ye[Sr]))break e;if((Ve||we)&&(we=be.window===be?be:(we=be.ownerDocument)?we.defaultView||we.parentWindow:window,Ve?(Ye=o.relatedTarget||o.toElement,Ve=pe,Ye=Ye?Ws(Ye):null,Ye!==null&&(hn=Xn(Ye),Ye!==hn||Ye.tag!==5&&Ye.tag!==6)&&(Ye=null)):(Ve=null,Ye=pe),Ve!==Ye)){if(Ze=Qm,Ce="onMouseLeave",ie="onMouseEnter",X="mouse",(n==="pointerout"||n==="pointerover")&&(Ze=Jm,Ce="onPointerLeave",ie="onPointerEnter",X="pointer"),hn=Ve==null?we:Da(Ve),le=Ye==null?we:Da(Ye),we=new Ze(Ce,X+"leave",Ve,o,be),we.target=hn,we.relatedTarget=le,Ce=null,Ws(be)===pe&&(Ze=new Ze(ie,X+"enter",Ye,o,be),Ze.target=le,Ze.relatedTarget=hn,Ce=Ze),hn=Ce,Ve&&Ye)t:{for(Ze=Ve,ie=Ye,X=0,le=Ze;le;le=Na(le))X++;for(le=0,Ce=ie;Ce;Ce=Na(Ce))le++;for(;0<X-le;)Ze=Na(Ze),X--;for(;0<le-X;)ie=Na(ie),le--;for(;X--;){if(Ze===ie||ie!==null&&Ze===ie.alternate)break t;Ze=Na(Ze),ie=Na(ie)}Ze=null}else Ze=null;Ve!==null&&bg(Re,we,Ve,Ze,!1),Ye!==null&&hn!==null&&bg(Re,hn,Ye,Ze,!0)}}e:{if(we=pe?Da(pe):window,Ve=we.nodeName&&we.nodeName.toLowerCase(),Ve==="select"||Ve==="input"&&we.type==="file")var et=cS;else if(sg(we))if(og)et=fS;else{et=hS;var at=uS}else(Ve=we.nodeName)&&Ve.toLowerCase()==="input"&&(we.type==="checkbox"||we.type==="radio")&&(et=dS);if(et&&(et=et(n,pe))){ag(Re,et,o,be);break e}at&&at(n,we,pe),n==="focusout"&&(at=we._wrapperState)&&at.controlled&&we.type==="number"&&Jt(we,"number",we.value)}switch(at=pe?Da(pe):window,n){case"focusin":(sg(at)||at.contentEditable==="true")&&(Aa=at,Uh=pe,rl=null);break;case"focusout":rl=Uh=Aa=null;break;case"mousedown":Fh=!0;break;case"contextmenu":case"mouseup":case"dragend":Fh=!1,mg(Re,o,be);break;case"selectionchange":if(gS)break;case"keydown":case"keyup":mg(Re,o,be)}var ot;if(Nh)e:{switch(n){case"compositionstart":var ut="onCompositionStart";break e;case"compositionend":ut="onCompositionEnd";break e;case"compositionupdate":ut="onCompositionUpdate";break e}ut=void 0}else Ca?ig(n,o)&&(ut="onCompositionEnd"):n==="keydown"&&o.keyCode===229&&(ut="onCompositionStart");ut&&(eg&&o.locale!=="ko"&&(Ca||ut!=="onCompositionStart"?ut==="onCompositionEnd"&&Ca&&(ot=Ym()):(Jr=be,Th="value"in Jr?Jr.value:Jr.textContent,Ca=!0)),at=yc(pe,ut),0<at.length&&(ut=new Zm(ut,n,null,o,be),Re.push({event:ut,listeners:at}),ot?ut.data=ot:(ot=rg(o),ot!==null&&(ut.data=ot)))),(ot=rS?sS(n,o):aS(n,o))&&(pe=yc(pe,"onBeforeInput"),0<pe.length&&(be=new Zm("onBeforeInput","beforeinput",null,o,be),Re.push({event:be,listeners:pe}),be.data=ot))}wg(Re,s)})}function ol(n,s,o){return{instance:n,listener:s,currentTarget:o}}function yc(n,s){for(var o=s+"Capture",u=[];n!==null;){var p=n,_=p.stateNode;p.tag===5&&_!==null&&(p=_,_=Ht(n,o),_!=null&&u.unshift(ol(n,_,p)),_=Ht(n,s),_!=null&&u.push(ol(n,_,p))),n=n.return}return u}function Na(n){if(n===null)return null;do n=n.return;while(n&&n.tag!==5);return n||null}function bg(n,s,o,u,p){for(var _=s._reactName,C=[];o!==null&&o!==u;){var z=o,W=z.alternate,pe=z.stateNode;if(W!==null&&W===u)break;z.tag===5&&pe!==null&&(z=pe,p?(W=Ht(o,_),W!=null&&C.unshift(ol(o,W,z))):p||(W=Ht(o,_),W!=null&&C.push(ol(o,W,z)))),o=o.return}C.length!==0&&n.push({event:s,listeners:C})}var yS=/\r\n?/g,SS=/\u0000|\uFFFD/g;function Rg(n){return(typeof n=="string"?n:""+n).replace(yS,`
`).replace(SS,"")}function Sc(n,s,o){if(s=Rg(s),Rg(n)!==s&&o)throw Error(t(425))}function Mc(){}var Vh=null,Gh=null;function Wh(n,s){return n==="textarea"||n==="noscript"||typeof s.children=="string"||typeof s.children=="number"||typeof s.dangerouslySetInnerHTML=="object"&&s.dangerouslySetInnerHTML!==null&&s.dangerouslySetInnerHTML.__html!=null}var jh=typeof setTimeout=="function"?setTimeout:void 0,MS=typeof clearTimeout=="function"?clearTimeout:void 0,Cg=typeof Promise=="function"?Promise:void 0,ES=typeof queueMicrotask=="function"?queueMicrotask:typeof Cg<"u"?function(n){return Cg.resolve(null).then(n).catch(wS)}:jh;function wS(n){setTimeout(function(){throw n})}function Xh(n,s){var o=s,u=0;do{var p=o.nextSibling;if(n.removeChild(o),p&&p.nodeType===8)if(o=p.data,o==="/$"){if(u===0){n.removeChild(p),Qo(s);return}u--}else o!=="$"&&o!=="$?"&&o!=="$!"||u++;o=p}while(o);Qo(s)}function ts(n){for(;n!=null;n=n.nextSibling){var s=n.nodeType;if(s===1||s===3)break;if(s===8){if(s=n.data,s==="$"||s==="$!"||s==="$?")break;if(s==="/$")return null}}return n}function Ag(n){n=n.previousSibling;for(var s=0;n;){if(n.nodeType===8){var o=n.data;if(o==="$"||o==="$!"||o==="$?"){if(s===0)return n;s--}else o==="/$"&&s++}n=n.previousSibling}return null}var La=Math.random().toString(36).slice(2),tr="__reactFiber$"+La,ll="__reactProps$"+La,Sr="__reactContainer$"+La,$h="__reactEvents$"+La,TS="__reactListeners$"+La,bS="__reactHandles$"+La;function Ws(n){var s=n[tr];if(s)return s;for(var o=n.parentNode;o;){if(s=o[Sr]||o[tr]){if(o=s.alternate,s.child!==null||o!==null&&o.child!==null)for(n=Ag(n);n!==null;){if(o=n[tr])return o;n=Ag(n)}return s}n=o,o=n.parentNode}return null}function cl(n){return n=n[tr]||n[Sr],!n||n.tag!==5&&n.tag!==6&&n.tag!==13&&n.tag!==3?null:n}function Da(n){if(n.tag===5||n.tag===6)return n.stateNode;throw Error(t(33))}function Ec(n){return n[ll]||null}var qh=[],Ia=-1;function ns(n){return{current:n}}function Qt(n){0>Ia||(n.current=qh[Ia],qh[Ia]=null,Ia--)}function Xt(n,s){Ia++,qh[Ia]=n.current,n.current=s}var is={},On=ns(is),ti=ns(!1),js=is;function Ua(n,s){var o=n.type.contextTypes;if(!o)return is;var u=n.stateNode;if(u&&u.__reactInternalMemoizedUnmaskedChildContext===s)return u.__reactInternalMemoizedMaskedChildContext;var p={},_;for(_ in o)p[_]=s[_];return u&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=s,n.__reactInternalMemoizedMaskedChildContext=p),p}function ni(n){return n=n.childContextTypes,n!=null}function wc(){Qt(ti),Qt(On)}function Pg(n,s,o){if(On.current!==is)throw Error(t(168));Xt(On,s),Xt(ti,o)}function Ng(n,s,o){var u=n.stateNode;if(s=s.childContextTypes,typeof u.getChildContext!="function")return o;u=u.getChildContext();for(var p in u)if(!(p in s))throw Error(t(108,Se(n)||"Unknown",p));return he({},o,u)}function Tc(n){return n=(n=n.stateNode)&&n.__reactInternalMemoizedMergedChildContext||is,js=On.current,Xt(On,n),Xt(ti,ti.current),!0}function Lg(n,s,o){var u=n.stateNode;if(!u)throw Error(t(169));o?(n=Ng(n,s,js),u.__reactInternalMemoizedMergedChildContext=n,Qt(ti),Qt(On),Xt(On,n)):Qt(ti),Xt(ti,o)}var Mr=null,bc=!1,Yh=!1;function Dg(n){Mr===null?Mr=[n]:Mr.push(n)}function RS(n){bc=!0,Dg(n)}function rs(){if(!Yh&&Mr!==null){Yh=!0;var n=0,s=yt;try{var o=Mr;for(yt=1;n<o.length;n++){var u=o[n];do u=u(!0);while(u!==null)}Mr=null,bc=!1}catch(p){throw Mr!==null&&(Mr=Mr.slice(n+1)),Vs(Xo,rs),p}finally{yt=s,Yh=!1}}return null}var Fa=[],Oa=0,Rc=null,Cc=0,wi=[],Ti=0,Xs=null,Er=1,wr="";function $s(n,s){Fa[Oa++]=Cc,Fa[Oa++]=Rc,Rc=n,Cc=s}function Ig(n,s,o){wi[Ti++]=Er,wi[Ti++]=wr,wi[Ti++]=Xs,Xs=n;var u=Er;n=wr;var p=32-Pe(u)-1;u&=~(1<<p),o+=1;var _=32-Pe(s)+p;if(30<_){var C=p-p%5;_=(u&(1<<C)-1).toString(32),u>>=C,p-=C,Er=1<<32-Pe(s)+p|o<<p|u,wr=_+n}else Er=1<<_|o<<p|u,wr=n}function Kh(n){n.return!==null&&($s(n,1),Ig(n,1,0))}function Qh(n){for(;n===Rc;)Rc=Fa[--Oa],Fa[Oa]=null,Cc=Fa[--Oa],Fa[Oa]=null;for(;n===Xs;)Xs=wi[--Ti],wi[Ti]=null,wr=wi[--Ti],wi[Ti]=null,Er=wi[--Ti],wi[Ti]=null}var fi=null,pi=null,tn=!1,ki=null;function Ug(n,s){var o=Ai(5,null,null,0);o.elementType="DELETED",o.stateNode=s,o.return=n,s=n.deletions,s===null?(n.deletions=[o],n.flags|=16):s.push(o)}function Fg(n,s){switch(n.tag){case 5:var o=n.type;return s=s.nodeType!==1||o.toLowerCase()!==s.nodeName.toLowerCase()?null:s,s!==null?(n.stateNode=s,fi=n,pi=ts(s.firstChild),!0):!1;case 6:return s=n.pendingProps===""||s.nodeType!==3?null:s,s!==null?(n.stateNode=s,fi=n,pi=null,!0):!1;case 13:return s=s.nodeType!==8?null:s,s!==null?(o=Xs!==null?{id:Er,overflow:wr}:null,n.memoizedState={dehydrated:s,treeContext:o,retryLane:1073741824},o=Ai(18,null,null,0),o.stateNode=s,o.return=n,n.child=o,fi=n,pi=null,!0):!1;default:return!1}}function Zh(n){return(n.mode&1)!==0&&(n.flags&128)===0}function Jh(n){if(tn){var s=pi;if(s){var o=s;if(!Fg(n,s)){if(Zh(n))throw Error(t(418));s=ts(o.nextSibling);var u=fi;s&&Fg(n,s)?Ug(u,o):(n.flags=n.flags&-4097|2,tn=!1,fi=n)}}else{if(Zh(n))throw Error(t(418));n.flags=n.flags&-4097|2,tn=!1,fi=n}}}function Og(n){for(n=n.return;n!==null&&n.tag!==5&&n.tag!==3&&n.tag!==13;)n=n.return;fi=n}function Ac(n){if(n!==fi)return!1;if(!tn)return Og(n),tn=!0,!1;var s;if((s=n.tag!==3)&&!(s=n.tag!==5)&&(s=n.type,s=s!=="head"&&s!=="body"&&!Wh(n.type,n.memoizedProps)),s&&(s=pi)){if(Zh(n))throw kg(),Error(t(418));for(;s;)Ug(n,s),s=ts(s.nextSibling)}if(Og(n),n.tag===13){if(n=n.memoizedState,n=n!==null?n.dehydrated:null,!n)throw Error(t(317));e:{for(n=n.nextSibling,s=0;n;){if(n.nodeType===8){var o=n.data;if(o==="/$"){if(s===0){pi=ts(n.nextSibling);break e}s--}else o!=="$"&&o!=="$!"&&o!=="$?"||s++}n=n.nextSibling}pi=null}}else pi=fi?ts(n.stateNode.nextSibling):null;return!0}function kg(){for(var n=pi;n;)n=ts(n.nextSibling)}function ka(){pi=fi=null,tn=!1}function ed(n){ki===null?ki=[n]:ki.push(n)}var CS=R.ReactCurrentBatchConfig;function ul(n,s,o){if(n=o.ref,n!==null&&typeof n!="function"&&typeof n!="object"){if(o._owner){if(o=o._owner,o){if(o.tag!==1)throw Error(t(309));var u=o.stateNode}if(!u)throw Error(t(147,n));var p=u,_=""+n;return s!==null&&s.ref!==null&&typeof s.ref=="function"&&s.ref._stringRef===_?s.ref:(s=function(C){var z=p.refs;C===null?delete z[_]:z[_]=C},s._stringRef=_,s)}if(typeof n!="string")throw Error(t(284));if(!o._owner)throw Error(t(290,n))}return n}function Pc(n,s){throw n=Object.prototype.toString.call(s),Error(t(31,n==="[object Object]"?"object with keys {"+Object.keys(s).join(", ")+"}":n))}function zg(n){var s=n._init;return s(n._payload)}function Bg(n){function s(ie,X){if(n){var le=ie.deletions;le===null?(ie.deletions=[X],ie.flags|=16):le.push(X)}}function o(ie,X){if(!n)return null;for(;X!==null;)s(ie,X),X=X.sibling;return null}function u(ie,X){for(ie=new Map;X!==null;)X.key!==null?ie.set(X.key,X):ie.set(X.index,X),X=X.sibling;return ie}function p(ie,X){return ie=ds(ie,X),ie.index=0,ie.sibling=null,ie}function _(ie,X,le){return ie.index=le,n?(le=ie.alternate,le!==null?(le=le.index,le<X?(ie.flags|=2,X):le):(ie.flags|=2,X)):(ie.flags|=1048576,X)}function C(ie){return n&&ie.alternate===null&&(ie.flags|=2),ie}function z(ie,X,le,Ce){return X===null||X.tag!==6?(X=jd(le,ie.mode,Ce),X.return=ie,X):(X=p(X,le),X.return=ie,X)}function W(ie,X,le,Ce){var et=le.type;return et===F?be(ie,X,le.props.children,Ce,le.key):X!==null&&(X.elementType===et||typeof et=="object"&&et!==null&&et.$$typeof===ce&&zg(et)===X.type)?(Ce=p(X,le.props),Ce.ref=ul(ie,X,le),Ce.return=ie,Ce):(Ce=eu(le.type,le.key,le.props,null,ie.mode,Ce),Ce.ref=ul(ie,X,le),Ce.return=ie,Ce)}function pe(ie,X,le,Ce){return X===null||X.tag!==4||X.stateNode.containerInfo!==le.containerInfo||X.stateNode.implementation!==le.implementation?(X=Xd(le,ie.mode,Ce),X.return=ie,X):(X=p(X,le.children||[]),X.return=ie,X)}function be(ie,X,le,Ce,et){return X===null||X.tag!==7?(X=ta(le,ie.mode,Ce,et),X.return=ie,X):(X=p(X,le),X.return=ie,X)}function Re(ie,X,le){if(typeof X=="string"&&X!==""||typeof X=="number")return X=jd(""+X,ie.mode,le),X.return=ie,X;if(typeof X=="object"&&X!==null){switch(X.$$typeof){case D:return le=eu(X.type,X.key,X.props,null,ie.mode,le),le.ref=ul(ie,null,X),le.return=ie,le;case N:return X=Xd(X,ie.mode,le),X.return=ie,X;case ce:var Ce=X._init;return Re(ie,Ce(X._payload),le)}if(qt(X)||ne(X))return X=ta(X,ie.mode,le,null),X.return=ie,X;Pc(ie,X)}return null}function we(ie,X,le,Ce){var et=X!==null?X.key:null;if(typeof le=="string"&&le!==""||typeof le=="number")return et!==null?null:z(ie,X,""+le,Ce);if(typeof le=="object"&&le!==null){switch(le.$$typeof){case D:return le.key===et?W(ie,X,le,Ce):null;case N:return le.key===et?pe(ie,X,le,Ce):null;case ce:return et=le._init,we(ie,X,et(le._payload),Ce)}if(qt(le)||ne(le))return et!==null?null:be(ie,X,le,Ce,null);Pc(ie,le)}return null}function Ve(ie,X,le,Ce,et){if(typeof Ce=="string"&&Ce!==""||typeof Ce=="number")return ie=ie.get(le)||null,z(X,ie,""+Ce,et);if(typeof Ce=="object"&&Ce!==null){switch(Ce.$$typeof){case D:return ie=ie.get(Ce.key===null?le:Ce.key)||null,W(X,ie,Ce,et);case N:return ie=ie.get(Ce.key===null?le:Ce.key)||null,pe(X,ie,Ce,et);case ce:var at=Ce._init;return Ve(ie,X,le,at(Ce._payload),et)}if(qt(Ce)||ne(Ce))return ie=ie.get(le)||null,be(X,ie,Ce,et,null);Pc(X,Ce)}return null}function Ye(ie,X,le,Ce){for(var et=null,at=null,ot=X,ut=X=0,Cn=null;ot!==null&&ut<le.length;ut++){ot.index>ut?(Cn=ot,ot=null):Cn=ot.sibling;var Lt=we(ie,ot,le[ut],Ce);if(Lt===null){ot===null&&(ot=Cn);break}n&&ot&&Lt.alternate===null&&s(ie,ot),X=_(Lt,X,ut),at===null?et=Lt:at.sibling=Lt,at=Lt,ot=Cn}if(ut===le.length)return o(ie,ot),tn&&$s(ie,ut),et;if(ot===null){for(;ut<le.length;ut++)ot=Re(ie,le[ut],Ce),ot!==null&&(X=_(ot,X,ut),at===null?et=ot:at.sibling=ot,at=ot);return tn&&$s(ie,ut),et}for(ot=u(ie,ot);ut<le.length;ut++)Cn=Ve(ot,ie,ut,le[ut],Ce),Cn!==null&&(n&&Cn.alternate!==null&&ot.delete(Cn.key===null?ut:Cn.key),X=_(Cn,X,ut),at===null?et=Cn:at.sibling=Cn,at=Cn);return n&&ot.forEach(function(fs){return s(ie,fs)}),tn&&$s(ie,ut),et}function Ze(ie,X,le,Ce){var et=ne(le);if(typeof et!="function")throw Error(t(150));if(le=et.call(le),le==null)throw Error(t(151));for(var at=et=null,ot=X,ut=X=0,Cn=null,Lt=le.next();ot!==null&&!Lt.done;ut++,Lt=le.next()){ot.index>ut?(Cn=ot,ot=null):Cn=ot.sibling;var fs=we(ie,ot,Lt.value,Ce);if(fs===null){ot===null&&(ot=Cn);break}n&&ot&&fs.alternate===null&&s(ie,ot),X=_(fs,X,ut),at===null?et=fs:at.sibling=fs,at=fs,ot=Cn}if(Lt.done)return o(ie,ot),tn&&$s(ie,ut),et;if(ot===null){for(;!Lt.done;ut++,Lt=le.next())Lt=Re(ie,Lt.value,Ce),Lt!==null&&(X=_(Lt,X,ut),at===null?et=Lt:at.sibling=Lt,at=Lt);return tn&&$s(ie,ut),et}for(ot=u(ie,ot);!Lt.done;ut++,Lt=le.next())Lt=Ve(ot,ie,ut,Lt.value,Ce),Lt!==null&&(n&&Lt.alternate!==null&&ot.delete(Lt.key===null?ut:Lt.key),X=_(Lt,X,ut),at===null?et=Lt:at.sibling=Lt,at=Lt);return n&&ot.forEach(function(oM){return s(ie,oM)}),tn&&$s(ie,ut),et}function hn(ie,X,le,Ce){if(typeof le=="object"&&le!==null&&le.type===F&&le.key===null&&(le=le.props.children),typeof le=="object"&&le!==null){switch(le.$$typeof){case D:e:{for(var et=le.key,at=X;at!==null;){if(at.key===et){if(et=le.type,et===F){if(at.tag===7){o(ie,at.sibling),X=p(at,le.props.children),X.return=ie,ie=X;break e}}else if(at.elementType===et||typeof et=="object"&&et!==null&&et.$$typeof===ce&&zg(et)===at.type){o(ie,at.sibling),X=p(at,le.props),X.ref=ul(ie,at,le),X.return=ie,ie=X;break e}o(ie,at);break}else s(ie,at);at=at.sibling}le.type===F?(X=ta(le.props.children,ie.mode,Ce,le.key),X.return=ie,ie=X):(Ce=eu(le.type,le.key,le.props,null,ie.mode,Ce),Ce.ref=ul(ie,X,le),Ce.return=ie,ie=Ce)}return C(ie);case N:e:{for(at=le.key;X!==null;){if(X.key===at)if(X.tag===4&&X.stateNode.containerInfo===le.containerInfo&&X.stateNode.implementation===le.implementation){o(ie,X.sibling),X=p(X,le.children||[]),X.return=ie,ie=X;break e}else{o(ie,X);break}else s(ie,X);X=X.sibling}X=Xd(le,ie.mode,Ce),X.return=ie,ie=X}return C(ie);case ce:return at=le._init,hn(ie,X,at(le._payload),Ce)}if(qt(le))return Ye(ie,X,le,Ce);if(ne(le))return Ze(ie,X,le,Ce);Pc(ie,le)}return typeof le=="string"&&le!==""||typeof le=="number"?(le=""+le,X!==null&&X.tag===6?(o(ie,X.sibling),X=p(X,le),X.return=ie,ie=X):(o(ie,X),X=jd(le,ie.mode,Ce),X.return=ie,ie=X),C(ie)):o(ie,X)}return hn}var za=Bg(!0),Hg=Bg(!1),Nc=ns(null),Lc=null,Ba=null,td=null;function nd(){td=Ba=Lc=null}function id(n){var s=Nc.current;Qt(Nc),n._currentValue=s}function rd(n,s,o){for(;n!==null;){var u=n.alternate;if((n.childLanes&s)!==s?(n.childLanes|=s,u!==null&&(u.childLanes|=s)):u!==null&&(u.childLanes&s)!==s&&(u.childLanes|=s),n===o)break;n=n.return}}function Ha(n,s){Lc=n,td=Ba=null,n=n.dependencies,n!==null&&n.firstContext!==null&&((n.lanes&s)!==0&&(ii=!0),n.firstContext=null)}function bi(n){var s=n._currentValue;if(td!==n)if(n={context:n,memoizedValue:s,next:null},Ba===null){if(Lc===null)throw Error(t(308));Ba=n,Lc.dependencies={lanes:0,firstContext:n}}else Ba=Ba.next=n;return s}var qs=null;function sd(n){qs===null?qs=[n]:qs.push(n)}function Vg(n,s,o,u){var p=s.interleaved;return p===null?(o.next=o,sd(s)):(o.next=p.next,p.next=o),s.interleaved=o,Tr(n,u)}function Tr(n,s){n.lanes|=s;var o=n.alternate;for(o!==null&&(o.lanes|=s),o=n,n=n.return;n!==null;)n.childLanes|=s,o=n.alternate,o!==null&&(o.childLanes|=s),o=n,n=n.return;return o.tag===3?o.stateNode:null}var ss=!1;function ad(n){n.updateQueue={baseState:n.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function Gg(n,s){n=n.updateQueue,s.updateQueue===n&&(s.updateQueue={baseState:n.baseState,firstBaseUpdate:n.firstBaseUpdate,lastBaseUpdate:n.lastBaseUpdate,shared:n.shared,effects:n.effects})}function br(n,s){return{eventTime:n,lane:s,tag:0,payload:null,callback:null,next:null}}function as(n,s,o){var u=n.updateQueue;if(u===null)return null;if(u=u.shared,(Pt&2)!==0){var p=u.pending;return p===null?s.next=s:(s.next=p.next,p.next=s),u.pending=s,Tr(n,o)}return p=u.interleaved,p===null?(s.next=s,sd(u)):(s.next=p.next,p.next=s),u.interleaved=s,Tr(n,o)}function Dc(n,s,o){if(s=s.updateQueue,s!==null&&(s=s.shared,(o&4194240)!==0)){var u=s.lanes;u&=n.pendingLanes,o|=u,s.lanes=o,ei(n,o)}}function Wg(n,s){var o=n.updateQueue,u=n.alternate;if(u!==null&&(u=u.updateQueue,o===u)){var p=null,_=null;if(o=o.firstBaseUpdate,o!==null){do{var C={eventTime:o.eventTime,lane:o.lane,tag:o.tag,payload:o.payload,callback:o.callback,next:null};_===null?p=_=C:_=_.next=C,o=o.next}while(o!==null);_===null?p=_=s:_=_.next=s}else p=_=s;o={baseState:u.baseState,firstBaseUpdate:p,lastBaseUpdate:_,shared:u.shared,effects:u.effects},n.updateQueue=o;return}n=o.lastBaseUpdate,n===null?o.firstBaseUpdate=s:n.next=s,o.lastBaseUpdate=s}function Ic(n,s,o,u){var p=n.updateQueue;ss=!1;var _=p.firstBaseUpdate,C=p.lastBaseUpdate,z=p.shared.pending;if(z!==null){p.shared.pending=null;var W=z,pe=W.next;W.next=null,C===null?_=pe:C.next=pe,C=W;var be=n.alternate;be!==null&&(be=be.updateQueue,z=be.lastBaseUpdate,z!==C&&(z===null?be.firstBaseUpdate=pe:z.next=pe,be.lastBaseUpdate=W))}if(_!==null){var Re=p.baseState;C=0,be=pe=W=null,z=_;do{var we=z.lane,Ve=z.eventTime;if((u&we)===we){be!==null&&(be=be.next={eventTime:Ve,lane:0,tag:z.tag,payload:z.payload,callback:z.callback,next:null});e:{var Ye=n,Ze=z;switch(we=s,Ve=o,Ze.tag){case 1:if(Ye=Ze.payload,typeof Ye=="function"){Re=Ye.call(Ve,Re,we);break e}Re=Ye;break e;case 3:Ye.flags=Ye.flags&-65537|128;case 0:if(Ye=Ze.payload,we=typeof Ye=="function"?Ye.call(Ve,Re,we):Ye,we==null)break e;Re=he({},Re,we);break e;case 2:ss=!0}}z.callback!==null&&z.lane!==0&&(n.flags|=64,we=p.effects,we===null?p.effects=[z]:we.push(z))}else Ve={eventTime:Ve,lane:we,tag:z.tag,payload:z.payload,callback:z.callback,next:null},be===null?(pe=be=Ve,W=Re):be=be.next=Ve,C|=we;if(z=z.next,z===null){if(z=p.shared.pending,z===null)break;we=z,z=we.next,we.next=null,p.lastBaseUpdate=we,p.shared.pending=null}}while(!0);if(be===null&&(W=Re),p.baseState=W,p.firstBaseUpdate=pe,p.lastBaseUpdate=be,s=p.shared.interleaved,s!==null){p=s;do C|=p.lane,p=p.next;while(p!==s)}else _===null&&(p.shared.lanes=0);Qs|=C,n.lanes=C,n.memoizedState=Re}}function jg(n,s,o){if(n=s.effects,s.effects=null,n!==null)for(s=0;s<n.length;s++){var u=n[s],p=u.callback;if(p!==null){if(u.callback=null,u=o,typeof p!="function")throw Error(t(191,p));p.call(u)}}}var hl={},nr=ns(hl),dl=ns(hl),fl=ns(hl);function Ys(n){if(n===hl)throw Error(t(174));return n}function od(n,s){switch(Xt(fl,s),Xt(dl,n),Xt(nr,hl),n=s.nodeType,n){case 9:case 11:s=(s=s.documentElement)?s.namespaceURI:T(null,"");break;default:n=n===8?s.parentNode:s,s=n.namespaceURI||null,n=n.tagName,s=T(s,n)}Qt(nr),Xt(nr,s)}function Va(){Qt(nr),Qt(dl),Qt(fl)}function Xg(n){Ys(fl.current);var s=Ys(nr.current),o=T(s,n.type);s!==o&&(Xt(dl,n),Xt(nr,o))}function ld(n){dl.current===n&&(Qt(nr),Qt(dl))}var an=ns(0);function Uc(n){for(var s=n;s!==null;){if(s.tag===13){var o=s.memoizedState;if(o!==null&&(o=o.dehydrated,o===null||o.data==="$?"||o.data==="$!"))return s}else if(s.tag===19&&s.memoizedProps.revealOrder!==void 0){if((s.flags&128)!==0)return s}else if(s.child!==null){s.child.return=s,s=s.child;continue}if(s===n)break;for(;s.sibling===null;){if(s.return===null||s.return===n)return null;s=s.return}s.sibling.return=s.return,s=s.sibling}return null}var cd=[];function ud(){for(var n=0;n<cd.length;n++)cd[n]._workInProgressVersionPrimary=null;cd.length=0}var Fc=R.ReactCurrentDispatcher,hd=R.ReactCurrentBatchConfig,Ks=0,on=null,_n=null,bn=null,Oc=!1,pl=!1,ml=0,AS=0;function kn(){throw Error(t(321))}function dd(n,s){if(s===null)return!1;for(var o=0;o<s.length&&o<n.length;o++)if(!Oi(n[o],s[o]))return!1;return!0}function fd(n,s,o,u,p,_){if(Ks=_,on=s,s.memoizedState=null,s.updateQueue=null,s.lanes=0,Fc.current=n===null||n.memoizedState===null?DS:IS,n=o(u,p),pl){_=0;do{if(pl=!1,ml=0,25<=_)throw Error(t(301));_+=1,bn=_n=null,s.updateQueue=null,Fc.current=US,n=o(u,p)}while(pl)}if(Fc.current=Bc,s=_n!==null&&_n.next!==null,Ks=0,bn=_n=on=null,Oc=!1,s)throw Error(t(300));return n}function pd(){var n=ml!==0;return ml=0,n}function ir(){var n={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return bn===null?on.memoizedState=bn=n:bn=bn.next=n,bn}function Ri(){if(_n===null){var n=on.alternate;n=n!==null?n.memoizedState:null}else n=_n.next;var s=bn===null?on.memoizedState:bn.next;if(s!==null)bn=s,_n=n;else{if(n===null)throw Error(t(310));_n=n,n={memoizedState:_n.memoizedState,baseState:_n.baseState,baseQueue:_n.baseQueue,queue:_n.queue,next:null},bn===null?on.memoizedState=bn=n:bn=bn.next=n}return bn}function gl(n,s){return typeof s=="function"?s(n):s}function md(n){var s=Ri(),o=s.queue;if(o===null)throw Error(t(311));o.lastRenderedReducer=n;var u=_n,p=u.baseQueue,_=o.pending;if(_!==null){if(p!==null){var C=p.next;p.next=_.next,_.next=C}u.baseQueue=p=_,o.pending=null}if(p!==null){_=p.next,u=u.baseState;var z=C=null,W=null,pe=_;do{var be=pe.lane;if((Ks&be)===be)W!==null&&(W=W.next={lane:0,action:pe.action,hasEagerState:pe.hasEagerState,eagerState:pe.eagerState,next:null}),u=pe.hasEagerState?pe.eagerState:n(u,pe.action);else{var Re={lane:be,action:pe.action,hasEagerState:pe.hasEagerState,eagerState:pe.eagerState,next:null};W===null?(z=W=Re,C=u):W=W.next=Re,on.lanes|=be,Qs|=be}pe=pe.next}while(pe!==null&&pe!==_);W===null?C=u:W.next=z,Oi(u,s.memoizedState)||(ii=!0),s.memoizedState=u,s.baseState=C,s.baseQueue=W,o.lastRenderedState=u}if(n=o.interleaved,n!==null){p=n;do _=p.lane,on.lanes|=_,Qs|=_,p=p.next;while(p!==n)}else p===null&&(o.lanes=0);return[s.memoizedState,o.dispatch]}function gd(n){var s=Ri(),o=s.queue;if(o===null)throw Error(t(311));o.lastRenderedReducer=n;var u=o.dispatch,p=o.pending,_=s.memoizedState;if(p!==null){o.pending=null;var C=p=p.next;do _=n(_,C.action),C=C.next;while(C!==p);Oi(_,s.memoizedState)||(ii=!0),s.memoizedState=_,s.baseQueue===null&&(s.baseState=_),o.lastRenderedState=_}return[_,u]}function $g(){}function qg(n,s){var o=on,u=Ri(),p=s(),_=!Oi(u.memoizedState,p);if(_&&(u.memoizedState=p,ii=!0),u=u.queue,vd(Qg.bind(null,o,u,n),[n]),u.getSnapshot!==s||_||bn!==null&&bn.memoizedState.tag&1){if(o.flags|=2048,vl(9,Kg.bind(null,o,u,p,s),void 0,null),Rn===null)throw Error(t(349));(Ks&30)!==0||Yg(o,s,p)}return p}function Yg(n,s,o){n.flags|=16384,n={getSnapshot:s,value:o},s=on.updateQueue,s===null?(s={lastEffect:null,stores:null},on.updateQueue=s,s.stores=[n]):(o=s.stores,o===null?s.stores=[n]:o.push(n))}function Kg(n,s,o,u){s.value=o,s.getSnapshot=u,Zg(s)&&Jg(n)}function Qg(n,s,o){return o(function(){Zg(s)&&Jg(n)})}function Zg(n){var s=n.getSnapshot;n=n.value;try{var o=s();return!Oi(n,o)}catch{return!0}}function Jg(n){var s=Tr(n,1);s!==null&&Vi(s,n,1,-1)}function e0(n){var s=ir();return typeof n=="function"&&(n=n()),s.memoizedState=s.baseState=n,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:gl,lastRenderedState:n},s.queue=n,n=n.dispatch=LS.bind(null,on,n),[s.memoizedState,n]}function vl(n,s,o,u){return n={tag:n,create:s,destroy:o,deps:u,next:null},s=on.updateQueue,s===null?(s={lastEffect:null,stores:null},on.updateQueue=s,s.lastEffect=n.next=n):(o=s.lastEffect,o===null?s.lastEffect=n.next=n:(u=o.next,o.next=n,n.next=u,s.lastEffect=n)),n}function t0(){return Ri().memoizedState}function kc(n,s,o,u){var p=ir();on.flags|=n,p.memoizedState=vl(1|s,o,void 0,u===void 0?null:u)}function zc(n,s,o,u){var p=Ri();u=u===void 0?null:u;var _=void 0;if(_n!==null){var C=_n.memoizedState;if(_=C.destroy,u!==null&&dd(u,C.deps)){p.memoizedState=vl(s,o,_,u);return}}on.flags|=n,p.memoizedState=vl(1|s,o,_,u)}function n0(n,s){return kc(8390656,8,n,s)}function vd(n,s){return zc(2048,8,n,s)}function i0(n,s){return zc(4,2,n,s)}function r0(n,s){return zc(4,4,n,s)}function s0(n,s){if(typeof s=="function")return n=n(),s(n),function(){s(null)};if(s!=null)return n=n(),s.current=n,function(){s.current=null}}function a0(n,s,o){return o=o!=null?o.concat([n]):null,zc(4,4,s0.bind(null,s,n),o)}function xd(){}function o0(n,s){var o=Ri();s=s===void 0?null:s;var u=o.memoizedState;return u!==null&&s!==null&&dd(s,u[1])?u[0]:(o.memoizedState=[n,s],n)}function l0(n,s){var o=Ri();s=s===void 0?null:s;var u=o.memoizedState;return u!==null&&s!==null&&dd(s,u[1])?u[0]:(n=n(),o.memoizedState=[n,s],n)}function c0(n,s,o){return(Ks&21)===0?(n.baseState&&(n.baseState=!1,ii=!0),n.memoizedState=o):(Oi(o,s)||(o=He(),on.lanes|=o,Qs|=o,n.baseState=!0),s)}function PS(n,s){var o=yt;yt=o!==0&&4>o?o:4,n(!0);var u=hd.transition;hd.transition={};try{n(!1),s()}finally{yt=o,hd.transition=u}}function u0(){return Ri().memoizedState}function NS(n,s,o){var u=us(n);if(o={lane:u,action:o,hasEagerState:!1,eagerState:null,next:null},h0(n))d0(s,o);else if(o=Vg(n,s,o,u),o!==null){var p=qn();Vi(o,n,u,p),f0(o,s,u)}}function LS(n,s,o){var u=us(n),p={lane:u,action:o,hasEagerState:!1,eagerState:null,next:null};if(h0(n))d0(s,p);else{var _=n.alternate;if(n.lanes===0&&(_===null||_.lanes===0)&&(_=s.lastRenderedReducer,_!==null))try{var C=s.lastRenderedState,z=_(C,o);if(p.hasEagerState=!0,p.eagerState=z,Oi(z,C)){var W=s.interleaved;W===null?(p.next=p,sd(s)):(p.next=W.next,W.next=p),s.interleaved=p;return}}catch{}finally{}o=Vg(n,s,p,u),o!==null&&(p=qn(),Vi(o,n,u,p),f0(o,s,u))}}function h0(n){var s=n.alternate;return n===on||s!==null&&s===on}function d0(n,s){pl=Oc=!0;var o=n.pending;o===null?s.next=s:(s.next=o.next,o.next=s),n.pending=s}function f0(n,s,o){if((o&4194240)!==0){var u=s.lanes;u&=n.pendingLanes,o|=u,s.lanes=o,ei(n,o)}}var Bc={readContext:bi,useCallback:kn,useContext:kn,useEffect:kn,useImperativeHandle:kn,useInsertionEffect:kn,useLayoutEffect:kn,useMemo:kn,useReducer:kn,useRef:kn,useState:kn,useDebugValue:kn,useDeferredValue:kn,useTransition:kn,useMutableSource:kn,useSyncExternalStore:kn,useId:kn,unstable_isNewReconciler:!1},DS={readContext:bi,useCallback:function(n,s){return ir().memoizedState=[n,s===void 0?null:s],n},useContext:bi,useEffect:n0,useImperativeHandle:function(n,s,o){return o=o!=null?o.concat([n]):null,kc(4194308,4,s0.bind(null,s,n),o)},useLayoutEffect:function(n,s){return kc(4194308,4,n,s)},useInsertionEffect:function(n,s){return kc(4,2,n,s)},useMemo:function(n,s){var o=ir();return s=s===void 0?null:s,n=n(),o.memoizedState=[n,s],n},useReducer:function(n,s,o){var u=ir();return s=o!==void 0?o(s):s,u.memoizedState=u.baseState=s,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:n,lastRenderedState:s},u.queue=n,n=n.dispatch=NS.bind(null,on,n),[u.memoizedState,n]},useRef:function(n){var s=ir();return n={current:n},s.memoizedState=n},useState:e0,useDebugValue:xd,useDeferredValue:function(n){return ir().memoizedState=n},useTransition:function(){var n=e0(!1),s=n[0];return n=PS.bind(null,n[1]),ir().memoizedState=n,[s,n]},useMutableSource:function(){},useSyncExternalStore:function(n,s,o){var u=on,p=ir();if(tn){if(o===void 0)throw Error(t(407));o=o()}else{if(o=s(),Rn===null)throw Error(t(349));(Ks&30)!==0||Yg(u,s,o)}p.memoizedState=o;var _={value:o,getSnapshot:s};return p.queue=_,n0(Qg.bind(null,u,_,n),[n]),u.flags|=2048,vl(9,Kg.bind(null,u,_,o,s),void 0,null),o},useId:function(){var n=ir(),s=Rn.identifierPrefix;if(tn){var o=wr,u=Er;o=(u&~(1<<32-Pe(u)-1)).toString(32)+o,s=":"+s+"R"+o,o=ml++,0<o&&(s+="H"+o.toString(32)),s+=":"}else o=AS++,s=":"+s+"r"+o.toString(32)+":";return n.memoizedState=s},unstable_isNewReconciler:!1},IS={readContext:bi,useCallback:o0,useContext:bi,useEffect:vd,useImperativeHandle:a0,useInsertionEffect:i0,useLayoutEffect:r0,useMemo:l0,useReducer:md,useRef:t0,useState:function(){return md(gl)},useDebugValue:xd,useDeferredValue:function(n){var s=Ri();return c0(s,_n.memoizedState,n)},useTransition:function(){var n=md(gl)[0],s=Ri().memoizedState;return[n,s]},useMutableSource:$g,useSyncExternalStore:qg,useId:u0,unstable_isNewReconciler:!1},US={readContext:bi,useCallback:o0,useContext:bi,useEffect:vd,useImperativeHandle:a0,useInsertionEffect:i0,useLayoutEffect:r0,useMemo:l0,useReducer:gd,useRef:t0,useState:function(){return gd(gl)},useDebugValue:xd,useDeferredValue:function(n){var s=Ri();return _n===null?s.memoizedState=n:c0(s,_n.memoizedState,n)},useTransition:function(){var n=gd(gl)[0],s=Ri().memoizedState;return[n,s]},useMutableSource:$g,useSyncExternalStore:qg,useId:u0,unstable_isNewReconciler:!1};function zi(n,s){if(n&&n.defaultProps){s=he({},s),n=n.defaultProps;for(var o in n)s[o]===void 0&&(s[o]=n[o]);return s}return s}function _d(n,s,o,u){s=n.memoizedState,o=o(u,s),o=o==null?s:he({},s,o),n.memoizedState=o,n.lanes===0&&(n.updateQueue.baseState=o)}var Hc={isMounted:function(n){return(n=n._reactInternals)?Xn(n)===n:!1},enqueueSetState:function(n,s,o){n=n._reactInternals;var u=qn(),p=us(n),_=br(u,p);_.payload=s,o!=null&&(_.callback=o),s=as(n,_,p),s!==null&&(Vi(s,n,p,u),Dc(s,n,p))},enqueueReplaceState:function(n,s,o){n=n._reactInternals;var u=qn(),p=us(n),_=br(u,p);_.tag=1,_.payload=s,o!=null&&(_.callback=o),s=as(n,_,p),s!==null&&(Vi(s,n,p,u),Dc(s,n,p))},enqueueForceUpdate:function(n,s){n=n._reactInternals;var o=qn(),u=us(n),p=br(o,u);p.tag=2,s!=null&&(p.callback=s),s=as(n,p,u),s!==null&&(Vi(s,n,u,o),Dc(s,n,u))}};function p0(n,s,o,u,p,_,C){return n=n.stateNode,typeof n.shouldComponentUpdate=="function"?n.shouldComponentUpdate(u,_,C):s.prototype&&s.prototype.isPureReactComponent?!il(o,u)||!il(p,_):!0}function m0(n,s,o){var u=!1,p=is,_=s.contextType;return typeof _=="object"&&_!==null?_=bi(_):(p=ni(s)?js:On.current,u=s.contextTypes,_=(u=u!=null)?Ua(n,p):is),s=new s(o,_),n.memoizedState=s.state!==null&&s.state!==void 0?s.state:null,s.updater=Hc,n.stateNode=s,s._reactInternals=n,u&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=p,n.__reactInternalMemoizedMaskedChildContext=_),s}function g0(n,s,o,u){n=s.state,typeof s.componentWillReceiveProps=="function"&&s.componentWillReceiveProps(o,u),typeof s.UNSAFE_componentWillReceiveProps=="function"&&s.UNSAFE_componentWillReceiveProps(o,u),s.state!==n&&Hc.enqueueReplaceState(s,s.state,null)}function yd(n,s,o,u){var p=n.stateNode;p.props=o,p.state=n.memoizedState,p.refs={},ad(n);var _=s.contextType;typeof _=="object"&&_!==null?p.context=bi(_):(_=ni(s)?js:On.current,p.context=Ua(n,_)),p.state=n.memoizedState,_=s.getDerivedStateFromProps,typeof _=="function"&&(_d(n,s,_,o),p.state=n.memoizedState),typeof s.getDerivedStateFromProps=="function"||typeof p.getSnapshotBeforeUpdate=="function"||typeof p.UNSAFE_componentWillMount!="function"&&typeof p.componentWillMount!="function"||(s=p.state,typeof p.componentWillMount=="function"&&p.componentWillMount(),typeof p.UNSAFE_componentWillMount=="function"&&p.UNSAFE_componentWillMount(),s!==p.state&&Hc.enqueueReplaceState(p,p.state,null),Ic(n,o,p,u),p.state=n.memoizedState),typeof p.componentDidMount=="function"&&(n.flags|=4194308)}function Ga(n,s){try{var o="",u=s;do o+=Ge(u),u=u.return;while(u);var p=o}catch(_){p=`
Error generating stack: `+_.message+`
`+_.stack}return{value:n,source:s,stack:p,digest:null}}function Sd(n,s,o){return{value:n,source:null,stack:o??null,digest:s??null}}function Md(n,s){try{console.error(s.value)}catch(o){setTimeout(function(){throw o})}}var FS=typeof WeakMap=="function"?WeakMap:Map;function v0(n,s,o){o=br(-1,o),o.tag=3,o.payload={element:null};var u=s.value;return o.callback=function(){qc||(qc=!0,Od=u),Md(n,s)},o}function x0(n,s,o){o=br(-1,o),o.tag=3;var u=n.type.getDerivedStateFromError;if(typeof u=="function"){var p=s.value;o.payload=function(){return u(p)},o.callback=function(){Md(n,s)}}var _=n.stateNode;return _!==null&&typeof _.componentDidCatch=="function"&&(o.callback=function(){Md(n,s),typeof u!="function"&&(ls===null?ls=new Set([this]):ls.add(this));var C=s.stack;this.componentDidCatch(s.value,{componentStack:C!==null?C:""})}),o}function _0(n,s,o){var u=n.pingCache;if(u===null){u=n.pingCache=new FS;var p=new Set;u.set(s,p)}else p=u.get(s),p===void 0&&(p=new Set,u.set(s,p));p.has(o)||(p.add(o),n=KS.bind(null,n,s,o),s.then(n,n))}function y0(n){do{var s;if((s=n.tag===13)&&(s=n.memoizedState,s=s!==null?s.dehydrated!==null:!0),s)return n;n=n.return}while(n!==null);return null}function S0(n,s,o,u,p){return(n.mode&1)===0?(n===s?n.flags|=65536:(n.flags|=128,o.flags|=131072,o.flags&=-52805,o.tag===1&&(o.alternate===null?o.tag=17:(s=br(-1,1),s.tag=2,as(o,s,1))),o.lanes|=1),n):(n.flags|=65536,n.lanes=p,n)}var OS=R.ReactCurrentOwner,ii=!1;function $n(n,s,o,u){s.child=n===null?Hg(s,null,o,u):za(s,n.child,o,u)}function M0(n,s,o,u,p){o=o.render;var _=s.ref;return Ha(s,p),u=fd(n,s,o,u,_,p),o=pd(),n!==null&&!ii?(s.updateQueue=n.updateQueue,s.flags&=-2053,n.lanes&=~p,Rr(n,s,p)):(tn&&o&&Kh(s),s.flags|=1,$n(n,s,u,p),s.child)}function E0(n,s,o,u,p){if(n===null){var _=o.type;return typeof _=="function"&&!Wd(_)&&_.defaultProps===void 0&&o.compare===null&&o.defaultProps===void 0?(s.tag=15,s.type=_,w0(n,s,_,u,p)):(n=eu(o.type,null,u,s,s.mode,p),n.ref=s.ref,n.return=s,s.child=n)}if(_=n.child,(n.lanes&p)===0){var C=_.memoizedProps;if(o=o.compare,o=o!==null?o:il,o(C,u)&&n.ref===s.ref)return Rr(n,s,p)}return s.flags|=1,n=ds(_,u),n.ref=s.ref,n.return=s,s.child=n}function w0(n,s,o,u,p){if(n!==null){var _=n.memoizedProps;if(il(_,u)&&n.ref===s.ref)if(ii=!1,s.pendingProps=u=_,(n.lanes&p)!==0)(n.flags&131072)!==0&&(ii=!0);else return s.lanes=n.lanes,Rr(n,s,p)}return Ed(n,s,o,u,p)}function T0(n,s,o){var u=s.pendingProps,p=u.children,_=n!==null?n.memoizedState:null;if(u.mode==="hidden")if((s.mode&1)===0)s.memoizedState={baseLanes:0,cachePool:null,transitions:null},Xt(ja,mi),mi|=o;else{if((o&1073741824)===0)return n=_!==null?_.baseLanes|o:o,s.lanes=s.childLanes=1073741824,s.memoizedState={baseLanes:n,cachePool:null,transitions:null},s.updateQueue=null,Xt(ja,mi),mi|=n,null;s.memoizedState={baseLanes:0,cachePool:null,transitions:null},u=_!==null?_.baseLanes:o,Xt(ja,mi),mi|=u}else _!==null?(u=_.baseLanes|o,s.memoizedState=null):u=o,Xt(ja,mi),mi|=u;return $n(n,s,p,o),s.child}function b0(n,s){var o=s.ref;(n===null&&o!==null||n!==null&&n.ref!==o)&&(s.flags|=512,s.flags|=2097152)}function Ed(n,s,o,u,p){var _=ni(o)?js:On.current;return _=Ua(s,_),Ha(s,p),o=fd(n,s,o,u,_,p),u=pd(),n!==null&&!ii?(s.updateQueue=n.updateQueue,s.flags&=-2053,n.lanes&=~p,Rr(n,s,p)):(tn&&u&&Kh(s),s.flags|=1,$n(n,s,o,p),s.child)}function R0(n,s,o,u,p){if(ni(o)){var _=!0;Tc(s)}else _=!1;if(Ha(s,p),s.stateNode===null)Gc(n,s),m0(s,o,u),yd(s,o,u,p),u=!0;else if(n===null){var C=s.stateNode,z=s.memoizedProps;C.props=z;var W=C.context,pe=o.contextType;typeof pe=="object"&&pe!==null?pe=bi(pe):(pe=ni(o)?js:On.current,pe=Ua(s,pe));var be=o.getDerivedStateFromProps,Re=typeof be=="function"||typeof C.getSnapshotBeforeUpdate=="function";Re||typeof C.UNSAFE_componentWillReceiveProps!="function"&&typeof C.componentWillReceiveProps!="function"||(z!==u||W!==pe)&&g0(s,C,u,pe),ss=!1;var we=s.memoizedState;C.state=we,Ic(s,u,C,p),W=s.memoizedState,z!==u||we!==W||ti.current||ss?(typeof be=="function"&&(_d(s,o,be,u),W=s.memoizedState),(z=ss||p0(s,o,z,u,we,W,pe))?(Re||typeof C.UNSAFE_componentWillMount!="function"&&typeof C.componentWillMount!="function"||(typeof C.componentWillMount=="function"&&C.componentWillMount(),typeof C.UNSAFE_componentWillMount=="function"&&C.UNSAFE_componentWillMount()),typeof C.componentDidMount=="function"&&(s.flags|=4194308)):(typeof C.componentDidMount=="function"&&(s.flags|=4194308),s.memoizedProps=u,s.memoizedState=W),C.props=u,C.state=W,C.context=pe,u=z):(typeof C.componentDidMount=="function"&&(s.flags|=4194308),u=!1)}else{C=s.stateNode,Gg(n,s),z=s.memoizedProps,pe=s.type===s.elementType?z:zi(s.type,z),C.props=pe,Re=s.pendingProps,we=C.context,W=o.contextType,typeof W=="object"&&W!==null?W=bi(W):(W=ni(o)?js:On.current,W=Ua(s,W));var Ve=o.getDerivedStateFromProps;(be=typeof Ve=="function"||typeof C.getSnapshotBeforeUpdate=="function")||typeof C.UNSAFE_componentWillReceiveProps!="function"&&typeof C.componentWillReceiveProps!="function"||(z!==Re||we!==W)&&g0(s,C,u,W),ss=!1,we=s.memoizedState,C.state=we,Ic(s,u,C,p);var Ye=s.memoizedState;z!==Re||we!==Ye||ti.current||ss?(typeof Ve=="function"&&(_d(s,o,Ve,u),Ye=s.memoizedState),(pe=ss||p0(s,o,pe,u,we,Ye,W)||!1)?(be||typeof C.UNSAFE_componentWillUpdate!="function"&&typeof C.componentWillUpdate!="function"||(typeof C.componentWillUpdate=="function"&&C.componentWillUpdate(u,Ye,W),typeof C.UNSAFE_componentWillUpdate=="function"&&C.UNSAFE_componentWillUpdate(u,Ye,W)),typeof C.componentDidUpdate=="function"&&(s.flags|=4),typeof C.getSnapshotBeforeUpdate=="function"&&(s.flags|=1024)):(typeof C.componentDidUpdate!="function"||z===n.memoizedProps&&we===n.memoizedState||(s.flags|=4),typeof C.getSnapshotBeforeUpdate!="function"||z===n.memoizedProps&&we===n.memoizedState||(s.flags|=1024),s.memoizedProps=u,s.memoizedState=Ye),C.props=u,C.state=Ye,C.context=W,u=pe):(typeof C.componentDidUpdate!="function"||z===n.memoizedProps&&we===n.memoizedState||(s.flags|=4),typeof C.getSnapshotBeforeUpdate!="function"||z===n.memoizedProps&&we===n.memoizedState||(s.flags|=1024),u=!1)}return wd(n,s,o,u,_,p)}function wd(n,s,o,u,p,_){b0(n,s);var C=(s.flags&128)!==0;if(!u&&!C)return p&&Lg(s,o,!1),Rr(n,s,_);u=s.stateNode,OS.current=s;var z=C&&typeof o.getDerivedStateFromError!="function"?null:u.render();return s.flags|=1,n!==null&&C?(s.child=za(s,n.child,null,_),s.child=za(s,null,z,_)):$n(n,s,z,_),s.memoizedState=u.state,p&&Lg(s,o,!0),s.child}function C0(n){var s=n.stateNode;s.pendingContext?Pg(n,s.pendingContext,s.pendingContext!==s.context):s.context&&Pg(n,s.context,!1),od(n,s.containerInfo)}function A0(n,s,o,u,p){return ka(),ed(p),s.flags|=256,$n(n,s,o,u),s.child}var Td={dehydrated:null,treeContext:null,retryLane:0};function bd(n){return{baseLanes:n,cachePool:null,transitions:null}}function P0(n,s,o){var u=s.pendingProps,p=an.current,_=!1,C=(s.flags&128)!==0,z;if((z=C)||(z=n!==null&&n.memoizedState===null?!1:(p&2)!==0),z?(_=!0,s.flags&=-129):(n===null||n.memoizedState!==null)&&(p|=1),Xt(an,p&1),n===null)return Jh(s),n=s.memoizedState,n!==null&&(n=n.dehydrated,n!==null)?((s.mode&1)===0?s.lanes=1:n.data==="$!"?s.lanes=8:s.lanes=1073741824,null):(C=u.children,n=u.fallback,_?(u=s.mode,_=s.child,C={mode:"hidden",children:C},(u&1)===0&&_!==null?(_.childLanes=0,_.pendingProps=C):_=tu(C,u,0,null),n=ta(n,u,o,null),_.return=s,n.return=s,_.sibling=n,s.child=_,s.child.memoizedState=bd(o),s.memoizedState=Td,n):Rd(s,C));if(p=n.memoizedState,p!==null&&(z=p.dehydrated,z!==null))return kS(n,s,C,u,z,p,o);if(_){_=u.fallback,C=s.mode,p=n.child,z=p.sibling;var W={mode:"hidden",children:u.children};return(C&1)===0&&s.child!==p?(u=s.child,u.childLanes=0,u.pendingProps=W,s.deletions=null):(u=ds(p,W),u.subtreeFlags=p.subtreeFlags&14680064),z!==null?_=ds(z,_):(_=ta(_,C,o,null),_.flags|=2),_.return=s,u.return=s,u.sibling=_,s.child=u,u=_,_=s.child,C=n.child.memoizedState,C=C===null?bd(o):{baseLanes:C.baseLanes|o,cachePool:null,transitions:C.transitions},_.memoizedState=C,_.childLanes=n.childLanes&~o,s.memoizedState=Td,u}return _=n.child,n=_.sibling,u=ds(_,{mode:"visible",children:u.children}),(s.mode&1)===0&&(u.lanes=o),u.return=s,u.sibling=null,n!==null&&(o=s.deletions,o===null?(s.deletions=[n],s.flags|=16):o.push(n)),s.child=u,s.memoizedState=null,u}function Rd(n,s){return s=tu({mode:"visible",children:s},n.mode,0,null),s.return=n,n.child=s}function Vc(n,s,o,u){return u!==null&&ed(u),za(s,n.child,null,o),n=Rd(s,s.pendingProps.children),n.flags|=2,s.memoizedState=null,n}function kS(n,s,o,u,p,_,C){if(o)return s.flags&256?(s.flags&=-257,u=Sd(Error(t(422))),Vc(n,s,C,u)):s.memoizedState!==null?(s.child=n.child,s.flags|=128,null):(_=u.fallback,p=s.mode,u=tu({mode:"visible",children:u.children},p,0,null),_=ta(_,p,C,null),_.flags|=2,u.return=s,_.return=s,u.sibling=_,s.child=u,(s.mode&1)!==0&&za(s,n.child,null,C),s.child.memoizedState=bd(C),s.memoizedState=Td,_);if((s.mode&1)===0)return Vc(n,s,C,null);if(p.data==="$!"){if(u=p.nextSibling&&p.nextSibling.dataset,u)var z=u.dgst;return u=z,_=Error(t(419)),u=Sd(_,u,void 0),Vc(n,s,C,u)}if(z=(C&n.childLanes)!==0,ii||z){if(u=Rn,u!==null){switch(C&-C){case 4:p=2;break;case 16:p=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:p=32;break;case 536870912:p=268435456;break;default:p=0}p=(p&(u.suspendedLanes|C))!==0?0:p,p!==0&&p!==_.retryLane&&(_.retryLane=p,Tr(n,p),Vi(u,n,p,-1))}return Gd(),u=Sd(Error(t(421))),Vc(n,s,C,u)}return p.data==="$?"?(s.flags|=128,s.child=n.child,s=QS.bind(null,n),p._reactRetry=s,null):(n=_.treeContext,pi=ts(p.nextSibling),fi=s,tn=!0,ki=null,n!==null&&(wi[Ti++]=Er,wi[Ti++]=wr,wi[Ti++]=Xs,Er=n.id,wr=n.overflow,Xs=s),s=Rd(s,u.children),s.flags|=4096,s)}function N0(n,s,o){n.lanes|=s;var u=n.alternate;u!==null&&(u.lanes|=s),rd(n.return,s,o)}function Cd(n,s,o,u,p){var _=n.memoizedState;_===null?n.memoizedState={isBackwards:s,rendering:null,renderingStartTime:0,last:u,tail:o,tailMode:p}:(_.isBackwards=s,_.rendering=null,_.renderingStartTime=0,_.last=u,_.tail=o,_.tailMode=p)}function L0(n,s,o){var u=s.pendingProps,p=u.revealOrder,_=u.tail;if($n(n,s,u.children,o),u=an.current,(u&2)!==0)u=u&1|2,s.flags|=128;else{if(n!==null&&(n.flags&128)!==0)e:for(n=s.child;n!==null;){if(n.tag===13)n.memoizedState!==null&&N0(n,o,s);else if(n.tag===19)N0(n,o,s);else if(n.child!==null){n.child.return=n,n=n.child;continue}if(n===s)break e;for(;n.sibling===null;){if(n.return===null||n.return===s)break e;n=n.return}n.sibling.return=n.return,n=n.sibling}u&=1}if(Xt(an,u),(s.mode&1)===0)s.memoizedState=null;else switch(p){case"forwards":for(o=s.child,p=null;o!==null;)n=o.alternate,n!==null&&Uc(n)===null&&(p=o),o=o.sibling;o=p,o===null?(p=s.child,s.child=null):(p=o.sibling,o.sibling=null),Cd(s,!1,p,o,_);break;case"backwards":for(o=null,p=s.child,s.child=null;p!==null;){if(n=p.alternate,n!==null&&Uc(n)===null){s.child=p;break}n=p.sibling,p.sibling=o,o=p,p=n}Cd(s,!0,o,null,_);break;case"together":Cd(s,!1,null,null,void 0);break;default:s.memoizedState=null}return s.child}function Gc(n,s){(s.mode&1)===0&&n!==null&&(n.alternate=null,s.alternate=null,s.flags|=2)}function Rr(n,s,o){if(n!==null&&(s.dependencies=n.dependencies),Qs|=s.lanes,(o&s.childLanes)===0)return null;if(n!==null&&s.child!==n.child)throw Error(t(153));if(s.child!==null){for(n=s.child,o=ds(n,n.pendingProps),s.child=o,o.return=s;n.sibling!==null;)n=n.sibling,o=o.sibling=ds(n,n.pendingProps),o.return=s;o.sibling=null}return s.child}function zS(n,s,o){switch(s.tag){case 3:C0(s),ka();break;case 5:Xg(s);break;case 1:ni(s.type)&&Tc(s);break;case 4:od(s,s.stateNode.containerInfo);break;case 10:var u=s.type._context,p=s.memoizedProps.value;Xt(Nc,u._currentValue),u._currentValue=p;break;case 13:if(u=s.memoizedState,u!==null)return u.dehydrated!==null?(Xt(an,an.current&1),s.flags|=128,null):(o&s.child.childLanes)!==0?P0(n,s,o):(Xt(an,an.current&1),n=Rr(n,s,o),n!==null?n.sibling:null);Xt(an,an.current&1);break;case 19:if(u=(o&s.childLanes)!==0,(n.flags&128)!==0){if(u)return L0(n,s,o);s.flags|=128}if(p=s.memoizedState,p!==null&&(p.rendering=null,p.tail=null,p.lastEffect=null),Xt(an,an.current),u)break;return null;case 22:case 23:return s.lanes=0,T0(n,s,o)}return Rr(n,s,o)}var D0,Ad,I0,U0;D0=function(n,s){for(var o=s.child;o!==null;){if(o.tag===5||o.tag===6)n.appendChild(o.stateNode);else if(o.tag!==4&&o.child!==null){o.child.return=o,o=o.child;continue}if(o===s)break;for(;o.sibling===null;){if(o.return===null||o.return===s)return;o=o.return}o.sibling.return=o.return,o=o.sibling}},Ad=function(){},I0=function(n,s,o,u){var p=n.memoizedProps;if(p!==u){n=s.stateNode,Ys(nr.current);var _=null;switch(o){case"input":p=At(n,p),u=At(n,u),_=[];break;case"select":p=he({},p,{value:void 0}),u=he({},u,{value:void 0}),_=[];break;case"textarea":p=Gt(n,p),u=Gt(n,u),_=[];break;default:typeof p.onClick!="function"&&typeof u.onClick=="function"&&(n.onclick=Mc)}Xe(o,u);var C;o=null;for(pe in p)if(!u.hasOwnProperty(pe)&&p.hasOwnProperty(pe)&&p[pe]!=null)if(pe==="style"){var z=p[pe];for(C in z)z.hasOwnProperty(C)&&(o||(o={}),o[C]="")}else pe!=="dangerouslySetInnerHTML"&&pe!=="children"&&pe!=="suppressContentEditableWarning"&&pe!=="suppressHydrationWarning"&&pe!=="autoFocus"&&(a.hasOwnProperty(pe)?_||(_=[]):(_=_||[]).push(pe,null));for(pe in u){var W=u[pe];if(z=p!=null?p[pe]:void 0,u.hasOwnProperty(pe)&&W!==z&&(W!=null||z!=null))if(pe==="style")if(z){for(C in z)!z.hasOwnProperty(C)||W&&W.hasOwnProperty(C)||(o||(o={}),o[C]="");for(C in W)W.hasOwnProperty(C)&&z[C]!==W[C]&&(o||(o={}),o[C]=W[C])}else o||(_||(_=[]),_.push(pe,o)),o=W;else pe==="dangerouslySetInnerHTML"?(W=W?W.__html:void 0,z=z?z.__html:void 0,W!=null&&z!==W&&(_=_||[]).push(pe,W)):pe==="children"?typeof W!="string"&&typeof W!="number"||(_=_||[]).push(pe,""+W):pe!=="suppressContentEditableWarning"&&pe!=="suppressHydrationWarning"&&(a.hasOwnProperty(pe)?(W!=null&&pe==="onScroll"&&Kt("scroll",n),_||z===W||(_=[])):(_=_||[]).push(pe,W))}o&&(_=_||[]).push("style",o);var pe=_;(s.updateQueue=pe)&&(s.flags|=4)}},U0=function(n,s,o,u){o!==u&&(s.flags|=4)};function xl(n,s){if(!tn)switch(n.tailMode){case"hidden":s=n.tail;for(var o=null;s!==null;)s.alternate!==null&&(o=s),s=s.sibling;o===null?n.tail=null:o.sibling=null;break;case"collapsed":o=n.tail;for(var u=null;o!==null;)o.alternate!==null&&(u=o),o=o.sibling;u===null?s||n.tail===null?n.tail=null:n.tail.sibling=null:u.sibling=null}}function zn(n){var s=n.alternate!==null&&n.alternate.child===n.child,o=0,u=0;if(s)for(var p=n.child;p!==null;)o|=p.lanes|p.childLanes,u|=p.subtreeFlags&14680064,u|=p.flags&14680064,p.return=n,p=p.sibling;else for(p=n.child;p!==null;)o|=p.lanes|p.childLanes,u|=p.subtreeFlags,u|=p.flags,p.return=n,p=p.sibling;return n.subtreeFlags|=u,n.childLanes=o,s}function BS(n,s,o){var u=s.pendingProps;switch(Qh(s),s.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return zn(s),null;case 1:return ni(s.type)&&wc(),zn(s),null;case 3:return u=s.stateNode,Va(),Qt(ti),Qt(On),ud(),u.pendingContext&&(u.context=u.pendingContext,u.pendingContext=null),(n===null||n.child===null)&&(Ac(s)?s.flags|=4:n===null||n.memoizedState.isDehydrated&&(s.flags&256)===0||(s.flags|=1024,ki!==null&&(Bd(ki),ki=null))),Ad(n,s),zn(s),null;case 5:ld(s);var p=Ys(fl.current);if(o=s.type,n!==null&&s.stateNode!=null)I0(n,s,o,u,p),n.ref!==s.ref&&(s.flags|=512,s.flags|=2097152);else{if(!u){if(s.stateNode===null)throw Error(t(166));return zn(s),null}if(n=Ys(nr.current),Ac(s)){u=s.stateNode,o=s.type;var _=s.memoizedProps;switch(u[tr]=s,u[ll]=_,n=(s.mode&1)!==0,o){case"dialog":Kt("cancel",u),Kt("close",u);break;case"iframe":case"object":case"embed":Kt("load",u);break;case"video":case"audio":for(p=0;p<sl.length;p++)Kt(sl[p],u);break;case"source":Kt("error",u);break;case"img":case"image":case"link":Kt("error",u),Kt("load",u);break;case"details":Kt("toggle",u);break;case"input":Et(u,_),Kt("invalid",u);break;case"select":u._wrapperState={wasMultiple:!!_.multiple},Kt("invalid",u);break;case"textarea":q(u,_),Kt("invalid",u)}Xe(o,_),p=null;for(var C in _)if(_.hasOwnProperty(C)){var z=_[C];C==="children"?typeof z=="string"?u.textContent!==z&&(_.suppressHydrationWarning!==!0&&Sc(u.textContent,z,n),p=["children",z]):typeof z=="number"&&u.textContent!==""+z&&(_.suppressHydrationWarning!==!0&&Sc(u.textContent,z,n),p=["children",""+z]):a.hasOwnProperty(C)&&z!=null&&C==="onScroll"&&Kt("scroll",u)}switch(o){case"input":tt(u),$t(u,_,!0);break;case"textarea":tt(u),Rt(u);break;case"select":case"option":break;default:typeof _.onClick=="function"&&(u.onclick=Mc)}u=p,s.updateQueue=u,u!==null&&(s.flags|=4)}else{C=p.nodeType===9?p:p.ownerDocument,n==="http://www.w3.org/1999/xhtml"&&(n=U(o)),n==="http://www.w3.org/1999/xhtml"?o==="script"?(n=C.createElement("div"),n.innerHTML="<script><\/script>",n=n.removeChild(n.firstChild)):typeof u.is=="string"?n=C.createElement(o,{is:u.is}):(n=C.createElement(o),o==="select"&&(C=n,u.multiple?C.multiple=!0:u.size&&(C.size=u.size))):n=C.createElementNS(n,o),n[tr]=s,n[ll]=u,D0(n,s,!1,!1),s.stateNode=n;e:{switch(C=re(o,u),o){case"dialog":Kt("cancel",n),Kt("close",n),p=u;break;case"iframe":case"object":case"embed":Kt("load",n),p=u;break;case"video":case"audio":for(p=0;p<sl.length;p++)Kt(sl[p],n);p=u;break;case"source":Kt("error",n),p=u;break;case"img":case"image":case"link":Kt("error",n),Kt("load",n),p=u;break;case"details":Kt("toggle",n),p=u;break;case"input":Et(n,u),p=At(n,u),Kt("invalid",n);break;case"option":p=u;break;case"select":n._wrapperState={wasMultiple:!!u.multiple},p=he({},u,{value:void 0}),Kt("invalid",n);break;case"textarea":q(n,u),p=Gt(n,u),Kt("invalid",n);break;default:p=u}Xe(o,p),z=p;for(_ in z)if(z.hasOwnProperty(_)){var W=z[_];_==="style"?_e(n,W):_==="dangerouslySetInnerHTML"?(W=W?W.__html:void 0,W!=null&&se(n,W)):_==="children"?typeof W=="string"?(o!=="textarea"||W!=="")&&ge(n,W):typeof W=="number"&&ge(n,""+W):_!=="suppressContentEditableWarning"&&_!=="suppressHydrationWarning"&&_!=="autoFocus"&&(a.hasOwnProperty(_)?W!=null&&_==="onScroll"&&Kt("scroll",n):W!=null&&L(n,_,W,C))}switch(o){case"input":tt(n),$t(n,u,!1);break;case"textarea":tt(n),Rt(n);break;case"option":u.value!=null&&n.setAttribute("value",""+xe(u.value));break;case"select":n.multiple=!!u.multiple,_=u.value,_!=null?wt(n,!!u.multiple,_,!1):u.defaultValue!=null&&wt(n,!!u.multiple,u.defaultValue,!0);break;default:typeof p.onClick=="function"&&(n.onclick=Mc)}switch(o){case"button":case"input":case"select":case"textarea":u=!!u.autoFocus;break e;case"img":u=!0;break e;default:u=!1}}u&&(s.flags|=4)}s.ref!==null&&(s.flags|=512,s.flags|=2097152)}return zn(s),null;case 6:if(n&&s.stateNode!=null)U0(n,s,n.memoizedProps,u);else{if(typeof u!="string"&&s.stateNode===null)throw Error(t(166));if(o=Ys(fl.current),Ys(nr.current),Ac(s)){if(u=s.stateNode,o=s.memoizedProps,u[tr]=s,(_=u.nodeValue!==o)&&(n=fi,n!==null))switch(n.tag){case 3:Sc(u.nodeValue,o,(n.mode&1)!==0);break;case 5:n.memoizedProps.suppressHydrationWarning!==!0&&Sc(u.nodeValue,o,(n.mode&1)!==0)}_&&(s.flags|=4)}else u=(o.nodeType===9?o:o.ownerDocument).createTextNode(u),u[tr]=s,s.stateNode=u}return zn(s),null;case 13:if(Qt(an),u=s.memoizedState,n===null||n.memoizedState!==null&&n.memoizedState.dehydrated!==null){if(tn&&pi!==null&&(s.mode&1)!==0&&(s.flags&128)===0)kg(),ka(),s.flags|=98560,_=!1;else if(_=Ac(s),u!==null&&u.dehydrated!==null){if(n===null){if(!_)throw Error(t(318));if(_=s.memoizedState,_=_!==null?_.dehydrated:null,!_)throw Error(t(317));_[tr]=s}else ka(),(s.flags&128)===0&&(s.memoizedState=null),s.flags|=4;zn(s),_=!1}else ki!==null&&(Bd(ki),ki=null),_=!0;if(!_)return s.flags&65536?s:null}return(s.flags&128)!==0?(s.lanes=o,s):(u=u!==null,u!==(n!==null&&n.memoizedState!==null)&&u&&(s.child.flags|=8192,(s.mode&1)!==0&&(n===null||(an.current&1)!==0?yn===0&&(yn=3):Gd())),s.updateQueue!==null&&(s.flags|=4),zn(s),null);case 4:return Va(),Ad(n,s),n===null&&al(s.stateNode.containerInfo),zn(s),null;case 10:return id(s.type._context),zn(s),null;case 17:return ni(s.type)&&wc(),zn(s),null;case 19:if(Qt(an),_=s.memoizedState,_===null)return zn(s),null;if(u=(s.flags&128)!==0,C=_.rendering,C===null)if(u)xl(_,!1);else{if(yn!==0||n!==null&&(n.flags&128)!==0)for(n=s.child;n!==null;){if(C=Uc(n),C!==null){for(s.flags|=128,xl(_,!1),u=C.updateQueue,u!==null&&(s.updateQueue=u,s.flags|=4),s.subtreeFlags=0,u=o,o=s.child;o!==null;)_=o,n=u,_.flags&=14680066,C=_.alternate,C===null?(_.childLanes=0,_.lanes=n,_.child=null,_.subtreeFlags=0,_.memoizedProps=null,_.memoizedState=null,_.updateQueue=null,_.dependencies=null,_.stateNode=null):(_.childLanes=C.childLanes,_.lanes=C.lanes,_.child=C.child,_.subtreeFlags=0,_.deletions=null,_.memoizedProps=C.memoizedProps,_.memoizedState=C.memoizedState,_.updateQueue=C.updateQueue,_.type=C.type,n=C.dependencies,_.dependencies=n===null?null:{lanes:n.lanes,firstContext:n.firstContext}),o=o.sibling;return Xt(an,an.current&1|2),s.child}n=n.sibling}_.tail!==null&&sn()>Xa&&(s.flags|=128,u=!0,xl(_,!1),s.lanes=4194304)}else{if(!u)if(n=Uc(C),n!==null){if(s.flags|=128,u=!0,o=n.updateQueue,o!==null&&(s.updateQueue=o,s.flags|=4),xl(_,!0),_.tail===null&&_.tailMode==="hidden"&&!C.alternate&&!tn)return zn(s),null}else 2*sn()-_.renderingStartTime>Xa&&o!==1073741824&&(s.flags|=128,u=!0,xl(_,!1),s.lanes=4194304);_.isBackwards?(C.sibling=s.child,s.child=C):(o=_.last,o!==null?o.sibling=C:s.child=C,_.last=C)}return _.tail!==null?(s=_.tail,_.rendering=s,_.tail=s.sibling,_.renderingStartTime=sn(),s.sibling=null,o=an.current,Xt(an,u?o&1|2:o&1),s):(zn(s),null);case 22:case 23:return Vd(),u=s.memoizedState!==null,n!==null&&n.memoizedState!==null!==u&&(s.flags|=8192),u&&(s.mode&1)!==0?(mi&1073741824)!==0&&(zn(s),s.subtreeFlags&6&&(s.flags|=8192)):zn(s),null;case 24:return null;case 25:return null}throw Error(t(156,s.tag))}function HS(n,s){switch(Qh(s),s.tag){case 1:return ni(s.type)&&wc(),n=s.flags,n&65536?(s.flags=n&-65537|128,s):null;case 3:return Va(),Qt(ti),Qt(On),ud(),n=s.flags,(n&65536)!==0&&(n&128)===0?(s.flags=n&-65537|128,s):null;case 5:return ld(s),null;case 13:if(Qt(an),n=s.memoizedState,n!==null&&n.dehydrated!==null){if(s.alternate===null)throw Error(t(340));ka()}return n=s.flags,n&65536?(s.flags=n&-65537|128,s):null;case 19:return Qt(an),null;case 4:return Va(),null;case 10:return id(s.type._context),null;case 22:case 23:return Vd(),null;case 24:return null;default:return null}}var Wc=!1,Bn=!1,VS=typeof WeakSet=="function"?WeakSet:Set,$e=null;function Wa(n,s){var o=n.ref;if(o!==null)if(typeof o=="function")try{o(null)}catch(u){cn(n,s,u)}else o.current=null}function Pd(n,s,o){try{o()}catch(u){cn(n,s,u)}}var F0=!1;function GS(n,s){if(Vh=uc,n=pg(),Ih(n)){if("selectionStart"in n)var o={start:n.selectionStart,end:n.selectionEnd};else e:{o=(o=n.ownerDocument)&&o.defaultView||window;var u=o.getSelection&&o.getSelection();if(u&&u.rangeCount!==0){o=u.anchorNode;var p=u.anchorOffset,_=u.focusNode;u=u.focusOffset;try{o.nodeType,_.nodeType}catch{o=null;break e}var C=0,z=-1,W=-1,pe=0,be=0,Re=n,we=null;t:for(;;){for(var Ve;Re!==o||p!==0&&Re.nodeType!==3||(z=C+p),Re!==_||u!==0&&Re.nodeType!==3||(W=C+u),Re.nodeType===3&&(C+=Re.nodeValue.length),(Ve=Re.firstChild)!==null;)we=Re,Re=Ve;for(;;){if(Re===n)break t;if(we===o&&++pe===p&&(z=C),we===_&&++be===u&&(W=C),(Ve=Re.nextSibling)!==null)break;Re=we,we=Re.parentNode}Re=Ve}o=z===-1||W===-1?null:{start:z,end:W}}else o=null}o=o||{start:0,end:0}}else o=null;for(Gh={focusedElem:n,selectionRange:o},uc=!1,$e=s;$e!==null;)if(s=$e,n=s.child,(s.subtreeFlags&1028)!==0&&n!==null)n.return=s,$e=n;else for(;$e!==null;){s=$e;try{var Ye=s.alternate;if((s.flags&1024)!==0)switch(s.tag){case 0:case 11:case 15:break;case 1:if(Ye!==null){var Ze=Ye.memoizedProps,hn=Ye.memoizedState,ie=s.stateNode,X=ie.getSnapshotBeforeUpdate(s.elementType===s.type?Ze:zi(s.type,Ze),hn);ie.__reactInternalSnapshotBeforeUpdate=X}break;case 3:var le=s.stateNode.containerInfo;le.nodeType===1?le.textContent="":le.nodeType===9&&le.documentElement&&le.removeChild(le.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(t(163))}}catch(Ce){cn(s,s.return,Ce)}if(n=s.sibling,n!==null){n.return=s.return,$e=n;break}$e=s.return}return Ye=F0,F0=!1,Ye}function _l(n,s,o){var u=s.updateQueue;if(u=u!==null?u.lastEffect:null,u!==null){var p=u=u.next;do{if((p.tag&n)===n){var _=p.destroy;p.destroy=void 0,_!==void 0&&Pd(s,o,_)}p=p.next}while(p!==u)}}function jc(n,s){if(s=s.updateQueue,s=s!==null?s.lastEffect:null,s!==null){var o=s=s.next;do{if((o.tag&n)===n){var u=o.create;o.destroy=u()}o=o.next}while(o!==s)}}function Nd(n){var s=n.ref;if(s!==null){var o=n.stateNode;switch(n.tag){case 5:n=o;break;default:n=o}typeof s=="function"?s(n):s.current=n}}function O0(n){var s=n.alternate;s!==null&&(n.alternate=null,O0(s)),n.child=null,n.deletions=null,n.sibling=null,n.tag===5&&(s=n.stateNode,s!==null&&(delete s[tr],delete s[ll],delete s[$h],delete s[TS],delete s[bS])),n.stateNode=null,n.return=null,n.dependencies=null,n.memoizedProps=null,n.memoizedState=null,n.pendingProps=null,n.stateNode=null,n.updateQueue=null}function k0(n){return n.tag===5||n.tag===3||n.tag===4}function z0(n){e:for(;;){for(;n.sibling===null;){if(n.return===null||k0(n.return))return null;n=n.return}for(n.sibling.return=n.return,n=n.sibling;n.tag!==5&&n.tag!==6&&n.tag!==18;){if(n.flags&2||n.child===null||n.tag===4)continue e;n.child.return=n,n=n.child}if(!(n.flags&2))return n.stateNode}}function Ld(n,s,o){var u=n.tag;if(u===5||u===6)n=n.stateNode,s?o.nodeType===8?o.parentNode.insertBefore(n,s):o.insertBefore(n,s):(o.nodeType===8?(s=o.parentNode,s.insertBefore(n,o)):(s=o,s.appendChild(n)),o=o._reactRootContainer,o!=null||s.onclick!==null||(s.onclick=Mc));else if(u!==4&&(n=n.child,n!==null))for(Ld(n,s,o),n=n.sibling;n!==null;)Ld(n,s,o),n=n.sibling}function Dd(n,s,o){var u=n.tag;if(u===5||u===6)n=n.stateNode,s?o.insertBefore(n,s):o.appendChild(n);else if(u!==4&&(n=n.child,n!==null))for(Dd(n,s,o),n=n.sibling;n!==null;)Dd(n,s,o),n=n.sibling}var Ln=null,Bi=!1;function os(n,s,o){for(o=o.child;o!==null;)B0(n,s,o),o=o.sibling}function B0(n,s,o){if(Le&&typeof Le.onCommitFiberUnmount=="function")try{Le.onCommitFiberUnmount(ae,o)}catch{}switch(o.tag){case 5:Bn||Wa(o,s);case 6:var u=Ln,p=Bi;Ln=null,os(n,s,o),Ln=u,Bi=p,Ln!==null&&(Bi?(n=Ln,o=o.stateNode,n.nodeType===8?n.parentNode.removeChild(o):n.removeChild(o)):Ln.removeChild(o.stateNode));break;case 18:Ln!==null&&(Bi?(n=Ln,o=o.stateNode,n.nodeType===8?Xh(n.parentNode,o):n.nodeType===1&&Xh(n,o),Qo(n)):Xh(Ln,o.stateNode));break;case 4:u=Ln,p=Bi,Ln=o.stateNode.containerInfo,Bi=!0,os(n,s,o),Ln=u,Bi=p;break;case 0:case 11:case 14:case 15:if(!Bn&&(u=o.updateQueue,u!==null&&(u=u.lastEffect,u!==null))){p=u=u.next;do{var _=p,C=_.destroy;_=_.tag,C!==void 0&&((_&2)!==0||(_&4)!==0)&&Pd(o,s,C),p=p.next}while(p!==u)}os(n,s,o);break;case 1:if(!Bn&&(Wa(o,s),u=o.stateNode,typeof u.componentWillUnmount=="function"))try{u.props=o.memoizedProps,u.state=o.memoizedState,u.componentWillUnmount()}catch(z){cn(o,s,z)}os(n,s,o);break;case 21:os(n,s,o);break;case 22:o.mode&1?(Bn=(u=Bn)||o.memoizedState!==null,os(n,s,o),Bn=u):os(n,s,o);break;default:os(n,s,o)}}function H0(n){var s=n.updateQueue;if(s!==null){n.updateQueue=null;var o=n.stateNode;o===null&&(o=n.stateNode=new VS),s.forEach(function(u){var p=ZS.bind(null,n,u);o.has(u)||(o.add(u),u.then(p,p))})}}function Hi(n,s){var o=s.deletions;if(o!==null)for(var u=0;u<o.length;u++){var p=o[u];try{var _=n,C=s,z=C;e:for(;z!==null;){switch(z.tag){case 5:Ln=z.stateNode,Bi=!1;break e;case 3:Ln=z.stateNode.containerInfo,Bi=!0;break e;case 4:Ln=z.stateNode.containerInfo,Bi=!0;break e}z=z.return}if(Ln===null)throw Error(t(160));B0(_,C,p),Ln=null,Bi=!1;var W=p.alternate;W!==null&&(W.return=null),p.return=null}catch(pe){cn(p,s,pe)}}if(s.subtreeFlags&12854)for(s=s.child;s!==null;)V0(s,n),s=s.sibling}function V0(n,s){var o=n.alternate,u=n.flags;switch(n.tag){case 0:case 11:case 14:case 15:if(Hi(s,n),rr(n),u&4){try{_l(3,n,n.return),jc(3,n)}catch(Ze){cn(n,n.return,Ze)}try{_l(5,n,n.return)}catch(Ze){cn(n,n.return,Ze)}}break;case 1:Hi(s,n),rr(n),u&512&&o!==null&&Wa(o,o.return);break;case 5:if(Hi(s,n),rr(n),u&512&&o!==null&&Wa(o,o.return),n.flags&32){var p=n.stateNode;try{ge(p,"")}catch(Ze){cn(n,n.return,Ze)}}if(u&4&&(p=n.stateNode,p!=null)){var _=n.memoizedProps,C=o!==null?o.memoizedProps:_,z=n.type,W=n.updateQueue;if(n.updateQueue=null,W!==null)try{z==="input"&&_.type==="radio"&&_.name!=null&&_t(p,_),re(z,C);var pe=re(z,_);for(C=0;C<W.length;C+=2){var be=W[C],Re=W[C+1];be==="style"?_e(p,Re):be==="dangerouslySetInnerHTML"?se(p,Re):be==="children"?ge(p,Re):L(p,be,Re,pe)}switch(z){case"input":Wt(p,_);break;case"textarea":xn(p,_);break;case"select":var we=p._wrapperState.wasMultiple;p._wrapperState.wasMultiple=!!_.multiple;var Ve=_.value;Ve!=null?wt(p,!!_.multiple,Ve,!1):we!==!!_.multiple&&(_.defaultValue!=null?wt(p,!!_.multiple,_.defaultValue,!0):wt(p,!!_.multiple,_.multiple?[]:"",!1))}p[ll]=_}catch(Ze){cn(n,n.return,Ze)}}break;case 6:if(Hi(s,n),rr(n),u&4){if(n.stateNode===null)throw Error(t(162));p=n.stateNode,_=n.memoizedProps;try{p.nodeValue=_}catch(Ze){cn(n,n.return,Ze)}}break;case 3:if(Hi(s,n),rr(n),u&4&&o!==null&&o.memoizedState.isDehydrated)try{Qo(s.containerInfo)}catch(Ze){cn(n,n.return,Ze)}break;case 4:Hi(s,n),rr(n);break;case 13:Hi(s,n),rr(n),p=n.child,p.flags&8192&&(_=p.memoizedState!==null,p.stateNode.isHidden=_,!_||p.alternate!==null&&p.alternate.memoizedState!==null||(Fd=sn())),u&4&&H0(n);break;case 22:if(be=o!==null&&o.memoizedState!==null,n.mode&1?(Bn=(pe=Bn)||be,Hi(s,n),Bn=pe):Hi(s,n),rr(n),u&8192){if(pe=n.memoizedState!==null,(n.stateNode.isHidden=pe)&&!be&&(n.mode&1)!==0)for($e=n,be=n.child;be!==null;){for(Re=$e=be;$e!==null;){switch(we=$e,Ve=we.child,we.tag){case 0:case 11:case 14:case 15:_l(4,we,we.return);break;case 1:Wa(we,we.return);var Ye=we.stateNode;if(typeof Ye.componentWillUnmount=="function"){u=we,o=we.return;try{s=u,Ye.props=s.memoizedProps,Ye.state=s.memoizedState,Ye.componentWillUnmount()}catch(Ze){cn(u,o,Ze)}}break;case 5:Wa(we,we.return);break;case 22:if(we.memoizedState!==null){j0(Re);continue}}Ve!==null?(Ve.return=we,$e=Ve):j0(Re)}be=be.sibling}e:for(be=null,Re=n;;){if(Re.tag===5){if(be===null){be=Re;try{p=Re.stateNode,pe?(_=p.style,typeof _.setProperty=="function"?_.setProperty("display","none","important"):_.display="none"):(z=Re.stateNode,W=Re.memoizedProps.style,C=W!=null&&W.hasOwnProperty("display")?W.display:null,z.style.display=ve("display",C))}catch(Ze){cn(n,n.return,Ze)}}}else if(Re.tag===6){if(be===null)try{Re.stateNode.nodeValue=pe?"":Re.memoizedProps}catch(Ze){cn(n,n.return,Ze)}}else if((Re.tag!==22&&Re.tag!==23||Re.memoizedState===null||Re===n)&&Re.child!==null){Re.child.return=Re,Re=Re.child;continue}if(Re===n)break e;for(;Re.sibling===null;){if(Re.return===null||Re.return===n)break e;be===Re&&(be=null),Re=Re.return}be===Re&&(be=null),Re.sibling.return=Re.return,Re=Re.sibling}}break;case 19:Hi(s,n),rr(n),u&4&&H0(n);break;case 21:break;default:Hi(s,n),rr(n)}}function rr(n){var s=n.flags;if(s&2){try{e:{for(var o=n.return;o!==null;){if(k0(o)){var u=o;break e}o=o.return}throw Error(t(160))}switch(u.tag){case 5:var p=u.stateNode;u.flags&32&&(ge(p,""),u.flags&=-33);var _=z0(n);Dd(n,_,p);break;case 3:case 4:var C=u.stateNode.containerInfo,z=z0(n);Ld(n,z,C);break;default:throw Error(t(161))}}catch(W){cn(n,n.return,W)}n.flags&=-3}s&4096&&(n.flags&=-4097)}function WS(n,s,o){$e=n,G0(n)}function G0(n,s,o){for(var u=(n.mode&1)!==0;$e!==null;){var p=$e,_=p.child;if(p.tag===22&&u){var C=p.memoizedState!==null||Wc;if(!C){var z=p.alternate,W=z!==null&&z.memoizedState!==null||Bn;z=Wc;var pe=Bn;if(Wc=C,(Bn=W)&&!pe)for($e=p;$e!==null;)C=$e,W=C.child,C.tag===22&&C.memoizedState!==null?X0(p):W!==null?(W.return=C,$e=W):X0(p);for(;_!==null;)$e=_,G0(_),_=_.sibling;$e=p,Wc=z,Bn=pe}W0(n)}else(p.subtreeFlags&8772)!==0&&_!==null?(_.return=p,$e=_):W0(n)}}function W0(n){for(;$e!==null;){var s=$e;if((s.flags&8772)!==0){var o=s.alternate;try{if((s.flags&8772)!==0)switch(s.tag){case 0:case 11:case 15:Bn||jc(5,s);break;case 1:var u=s.stateNode;if(s.flags&4&&!Bn)if(o===null)u.componentDidMount();else{var p=s.elementType===s.type?o.memoizedProps:zi(s.type,o.memoizedProps);u.componentDidUpdate(p,o.memoizedState,u.__reactInternalSnapshotBeforeUpdate)}var _=s.updateQueue;_!==null&&jg(s,_,u);break;case 3:var C=s.updateQueue;if(C!==null){if(o=null,s.child!==null)switch(s.child.tag){case 5:o=s.child.stateNode;break;case 1:o=s.child.stateNode}jg(s,C,o)}break;case 5:var z=s.stateNode;if(o===null&&s.flags&4){o=z;var W=s.memoizedProps;switch(s.type){case"button":case"input":case"select":case"textarea":W.autoFocus&&o.focus();break;case"img":W.src&&(o.src=W.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(s.memoizedState===null){var pe=s.alternate;if(pe!==null){var be=pe.memoizedState;if(be!==null){var Re=be.dehydrated;Re!==null&&Qo(Re)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(t(163))}Bn||s.flags&512&&Nd(s)}catch(we){cn(s,s.return,we)}}if(s===n){$e=null;break}if(o=s.sibling,o!==null){o.return=s.return,$e=o;break}$e=s.return}}function j0(n){for(;$e!==null;){var s=$e;if(s===n){$e=null;break}var o=s.sibling;if(o!==null){o.return=s.return,$e=o;break}$e=s.return}}function X0(n){for(;$e!==null;){var s=$e;try{switch(s.tag){case 0:case 11:case 15:var o=s.return;try{jc(4,s)}catch(W){cn(s,o,W)}break;case 1:var u=s.stateNode;if(typeof u.componentDidMount=="function"){var p=s.return;try{u.componentDidMount()}catch(W){cn(s,p,W)}}var _=s.return;try{Nd(s)}catch(W){cn(s,_,W)}break;case 5:var C=s.return;try{Nd(s)}catch(W){cn(s,C,W)}}}catch(W){cn(s,s.return,W)}if(s===n){$e=null;break}var z=s.sibling;if(z!==null){z.return=s.return,$e=z;break}$e=s.return}}var jS=Math.ceil,Xc=R.ReactCurrentDispatcher,Id=R.ReactCurrentOwner,Ci=R.ReactCurrentBatchConfig,Pt=0,Rn=null,pn=null,Dn=0,mi=0,ja=ns(0),yn=0,yl=null,Qs=0,$c=0,Ud=0,Sl=null,ri=null,Fd=0,Xa=1/0,Cr=null,qc=!1,Od=null,ls=null,Yc=!1,cs=null,Kc=0,Ml=0,kd=null,Qc=-1,Zc=0;function qn(){return(Pt&6)!==0?sn():Qc!==-1?Qc:Qc=sn()}function us(n){return(n.mode&1)===0?1:(Pt&2)!==0&&Dn!==0?Dn&-Dn:CS.transition!==null?(Zc===0&&(Zc=He()),Zc):(n=yt,n!==0||(n=window.event,n=n===void 0?16:qm(n.type)),n)}function Vi(n,s,o,u){if(50<Ml)throw Ml=0,kd=null,Error(t(185));xt(n,o,u),((Pt&2)===0||n!==Rn)&&(n===Rn&&((Pt&2)===0&&($c|=o),yn===4&&hs(n,Dn)),si(n,u),o===1&&Pt===0&&(s.mode&1)===0&&(Xa=sn()+500,bc&&rs()))}function si(n,s){var o=n.callbackNode;kt(n,s);var u=jt(n,n===Rn?Dn:0);if(u===0)o!==null&&jo(o),n.callbackNode=null,n.callbackPriority=0;else if(s=u&-u,n.callbackPriority!==s){if(o!=null&&jo(o),s===1)n.tag===0?RS(q0.bind(null,n)):Dg(q0.bind(null,n)),ES(function(){(Pt&6)===0&&rs()}),o=null;else{switch(yr(u)){case 1:o=Xo;break;case 4:o=A;break;case 16:o=K;break;case 536870912:o=oe;break;default:o=K}o=nv(o,$0.bind(null,n))}n.callbackPriority=s,n.callbackNode=o}}function $0(n,s){if(Qc=-1,Zc=0,(Pt&6)!==0)throw Error(t(327));var o=n.callbackNode;if($a()&&n.callbackNode!==o)return null;var u=jt(n,n===Rn?Dn:0);if(u===0)return null;if((u&30)!==0||(u&n.expiredLanes)!==0||s)s=Jc(n,u);else{s=u;var p=Pt;Pt|=2;var _=K0();(Rn!==n||Dn!==s)&&(Cr=null,Xa=sn()+500,Js(n,s));do try{qS();break}catch(z){Y0(n,z)}while(!0);nd(),Xc.current=_,Pt=p,pn!==null?s=0:(Rn=null,Dn=0,s=yn)}if(s!==0){if(s===2&&(p=fn(n),p!==0&&(u=p,s=zd(n,p))),s===1)throw o=yl,Js(n,0),hs(n,u),si(n,sn()),o;if(s===6)hs(n,u);else{if(p=n.current.alternate,(u&30)===0&&!XS(p)&&(s=Jc(n,u),s===2&&(_=fn(n),_!==0&&(u=_,s=zd(n,_))),s===1))throw o=yl,Js(n,0),hs(n,u),si(n,sn()),o;switch(n.finishedWork=p,n.finishedLanes=u,s){case 0:case 1:throw Error(t(345));case 2:ea(n,ri,Cr);break;case 3:if(hs(n,u),(u&130023424)===u&&(s=Fd+500-sn(),10<s)){if(jt(n,0)!==0)break;if(p=n.suspendedLanes,(p&u)!==u){qn(),n.pingedLanes|=n.suspendedLanes&p;break}n.timeoutHandle=jh(ea.bind(null,n,ri,Cr),s);break}ea(n,ri,Cr);break;case 4:if(hs(n,u),(u&4194240)===u)break;for(s=n.eventTimes,p=-1;0<u;){var C=31-Pe(u);_=1<<C,C=s[C],C>p&&(p=C),u&=~_}if(u=p,u=sn()-u,u=(120>u?120:480>u?480:1080>u?1080:1920>u?1920:3e3>u?3e3:4320>u?4320:1960*jS(u/1960))-u,10<u){n.timeoutHandle=jh(ea.bind(null,n,ri,Cr),u);break}ea(n,ri,Cr);break;case 5:ea(n,ri,Cr);break;default:throw Error(t(329))}}}return si(n,sn()),n.callbackNode===o?$0.bind(null,n):null}function zd(n,s){var o=Sl;return n.current.memoizedState.isDehydrated&&(Js(n,s).flags|=256),n=Jc(n,s),n!==2&&(s=ri,ri=o,s!==null&&Bd(s)),n}function Bd(n){ri===null?ri=n:ri.push.apply(ri,n)}function XS(n){for(var s=n;;){if(s.flags&16384){var o=s.updateQueue;if(o!==null&&(o=o.stores,o!==null))for(var u=0;u<o.length;u++){var p=o[u],_=p.getSnapshot;p=p.value;try{if(!Oi(_(),p))return!1}catch{return!1}}}if(o=s.child,s.subtreeFlags&16384&&o!==null)o.return=s,s=o;else{if(s===n)break;for(;s.sibling===null;){if(s.return===null||s.return===n)return!0;s=s.return}s.sibling.return=s.return,s=s.sibling}}return!0}function hs(n,s){for(s&=~Ud,s&=~$c,n.suspendedLanes|=s,n.pingedLanes&=~s,n=n.expirationTimes;0<s;){var o=31-Pe(s),u=1<<o;n[o]=-1,s&=~u}}function q0(n){if((Pt&6)!==0)throw Error(t(327));$a();var s=jt(n,0);if((s&1)===0)return si(n,sn()),null;var o=Jc(n,s);if(n.tag!==0&&o===2){var u=fn(n);u!==0&&(s=u,o=zd(n,u))}if(o===1)throw o=yl,Js(n,0),hs(n,s),si(n,sn()),o;if(o===6)throw Error(t(345));return n.finishedWork=n.current.alternate,n.finishedLanes=s,ea(n,ri,Cr),si(n,sn()),null}function Hd(n,s){var o=Pt;Pt|=1;try{return n(s)}finally{Pt=o,Pt===0&&(Xa=sn()+500,bc&&rs())}}function Zs(n){cs!==null&&cs.tag===0&&(Pt&6)===0&&$a();var s=Pt;Pt|=1;var o=Ci.transition,u=yt;try{if(Ci.transition=null,yt=1,n)return n()}finally{yt=u,Ci.transition=o,Pt=s,(Pt&6)===0&&rs()}}function Vd(){mi=ja.current,Qt(ja)}function Js(n,s){n.finishedWork=null,n.finishedLanes=0;var o=n.timeoutHandle;if(o!==-1&&(n.timeoutHandle=-1,MS(o)),pn!==null)for(o=pn.return;o!==null;){var u=o;switch(Qh(u),u.tag){case 1:u=u.type.childContextTypes,u!=null&&wc();break;case 3:Va(),Qt(ti),Qt(On),ud();break;case 5:ld(u);break;case 4:Va();break;case 13:Qt(an);break;case 19:Qt(an);break;case 10:id(u.type._context);break;case 22:case 23:Vd()}o=o.return}if(Rn=n,pn=n=ds(n.current,null),Dn=mi=s,yn=0,yl=null,Ud=$c=Qs=0,ri=Sl=null,qs!==null){for(s=0;s<qs.length;s++)if(o=qs[s],u=o.interleaved,u!==null){o.interleaved=null;var p=u.next,_=o.pending;if(_!==null){var C=_.next;_.next=p,u.next=C}o.pending=u}qs=null}return n}function Y0(n,s){do{var o=pn;try{if(nd(),Fc.current=Bc,Oc){for(var u=on.memoizedState;u!==null;){var p=u.queue;p!==null&&(p.pending=null),u=u.next}Oc=!1}if(Ks=0,bn=_n=on=null,pl=!1,ml=0,Id.current=null,o===null||o.return===null){yn=1,yl=s,pn=null;break}e:{var _=n,C=o.return,z=o,W=s;if(s=Dn,z.flags|=32768,W!==null&&typeof W=="object"&&typeof W.then=="function"){var pe=W,be=z,Re=be.tag;if((be.mode&1)===0&&(Re===0||Re===11||Re===15)){var we=be.alternate;we?(be.updateQueue=we.updateQueue,be.memoizedState=we.memoizedState,be.lanes=we.lanes):(be.updateQueue=null,be.memoizedState=null)}var Ve=y0(C);if(Ve!==null){Ve.flags&=-257,S0(Ve,C,z,_,s),Ve.mode&1&&_0(_,pe,s),s=Ve,W=pe;var Ye=s.updateQueue;if(Ye===null){var Ze=new Set;Ze.add(W),s.updateQueue=Ze}else Ye.add(W);break e}else{if((s&1)===0){_0(_,pe,s),Gd();break e}W=Error(t(426))}}else if(tn&&z.mode&1){var hn=y0(C);if(hn!==null){(hn.flags&65536)===0&&(hn.flags|=256),S0(hn,C,z,_,s),ed(Ga(W,z));break e}}_=W=Ga(W,z),yn!==4&&(yn=2),Sl===null?Sl=[_]:Sl.push(_),_=C;do{switch(_.tag){case 3:_.flags|=65536,s&=-s,_.lanes|=s;var ie=v0(_,W,s);Wg(_,ie);break e;case 1:z=W;var X=_.type,le=_.stateNode;if((_.flags&128)===0&&(typeof X.getDerivedStateFromError=="function"||le!==null&&typeof le.componentDidCatch=="function"&&(ls===null||!ls.has(le)))){_.flags|=65536,s&=-s,_.lanes|=s;var Ce=x0(_,z,s);Wg(_,Ce);break e}}_=_.return}while(_!==null)}Z0(o)}catch(et){s=et,pn===o&&o!==null&&(pn=o=o.return);continue}break}while(!0)}function K0(){var n=Xc.current;return Xc.current=Bc,n===null?Bc:n}function Gd(){(yn===0||yn===3||yn===2)&&(yn=4),Rn===null||(Qs&268435455)===0&&($c&268435455)===0||hs(Rn,Dn)}function Jc(n,s){var o=Pt;Pt|=2;var u=K0();(Rn!==n||Dn!==s)&&(Cr=null,Js(n,s));do try{$S();break}catch(p){Y0(n,p)}while(!0);if(nd(),Pt=o,Xc.current=u,pn!==null)throw Error(t(261));return Rn=null,Dn=0,yn}function $S(){for(;pn!==null;)Q0(pn)}function qS(){for(;pn!==null&&!lc();)Q0(pn)}function Q0(n){var s=tv(n.alternate,n,mi);n.memoizedProps=n.pendingProps,s===null?Z0(n):pn=s,Id.current=null}function Z0(n){var s=n;do{var o=s.alternate;if(n=s.return,(s.flags&32768)===0){if(o=BS(o,s,mi),o!==null){pn=o;return}}else{if(o=HS(o,s),o!==null){o.flags&=32767,pn=o;return}if(n!==null)n.flags|=32768,n.subtreeFlags=0,n.deletions=null;else{yn=6,pn=null;return}}if(s=s.sibling,s!==null){pn=s;return}pn=s=n}while(s!==null);yn===0&&(yn=5)}function ea(n,s,o){var u=yt,p=Ci.transition;try{Ci.transition=null,yt=1,YS(n,s,o,u)}finally{Ci.transition=p,yt=u}return null}function YS(n,s,o,u){do $a();while(cs!==null);if((Pt&6)!==0)throw Error(t(327));o=n.finishedWork;var p=n.finishedLanes;if(o===null)return null;if(n.finishedWork=null,n.finishedLanes=0,o===n.current)throw Error(t(177));n.callbackNode=null,n.callbackPriority=0;var _=o.lanes|o.childLanes;if(Jn(n,_),n===Rn&&(pn=Rn=null,Dn=0),(o.subtreeFlags&2064)===0&&(o.flags&2064)===0||Yc||(Yc=!0,nv(K,function(){return $a(),null})),_=(o.flags&15990)!==0,(o.subtreeFlags&15990)!==0||_){_=Ci.transition,Ci.transition=null;var C=yt;yt=1;var z=Pt;Pt|=4,Id.current=null,GS(n,o),V0(o,n),mS(Gh),uc=!!Vh,Gh=Vh=null,n.current=o,WS(o),Sh(),Pt=z,yt=C,Ci.transition=_}else n.current=o;if(Yc&&(Yc=!1,cs=n,Kc=p),_=n.pendingLanes,_===0&&(ls=null),We(o.stateNode),si(n,sn()),s!==null)for(u=n.onRecoverableError,o=0;o<s.length;o++)p=s[o],u(p.value,{componentStack:p.stack,digest:p.digest});if(qc)throw qc=!1,n=Od,Od=null,n;return(Kc&1)!==0&&n.tag!==0&&$a(),_=n.pendingLanes,(_&1)!==0?n===kd?Ml++:(Ml=0,kd=n):Ml=0,rs(),null}function $a(){if(cs!==null){var n=yr(Kc),s=Ci.transition,o=yt;try{if(Ci.transition=null,yt=16>n?16:n,cs===null)var u=!1;else{if(n=cs,cs=null,Kc=0,(Pt&6)!==0)throw Error(t(331));var p=Pt;for(Pt|=4,$e=n.current;$e!==null;){var _=$e,C=_.child;if(($e.flags&16)!==0){var z=_.deletions;if(z!==null){for(var W=0;W<z.length;W++){var pe=z[W];for($e=pe;$e!==null;){var be=$e;switch(be.tag){case 0:case 11:case 15:_l(8,be,_)}var Re=be.child;if(Re!==null)Re.return=be,$e=Re;else for(;$e!==null;){be=$e;var we=be.sibling,Ve=be.return;if(O0(be),be===pe){$e=null;break}if(we!==null){we.return=Ve,$e=we;break}$e=Ve}}}var Ye=_.alternate;if(Ye!==null){var Ze=Ye.child;if(Ze!==null){Ye.child=null;do{var hn=Ze.sibling;Ze.sibling=null,Ze=hn}while(Ze!==null)}}$e=_}}if((_.subtreeFlags&2064)!==0&&C!==null)C.return=_,$e=C;else e:for(;$e!==null;){if(_=$e,(_.flags&2048)!==0)switch(_.tag){case 0:case 11:case 15:_l(9,_,_.return)}var ie=_.sibling;if(ie!==null){ie.return=_.return,$e=ie;break e}$e=_.return}}var X=n.current;for($e=X;$e!==null;){C=$e;var le=C.child;if((C.subtreeFlags&2064)!==0&&le!==null)le.return=C,$e=le;else e:for(C=X;$e!==null;){if(z=$e,(z.flags&2048)!==0)try{switch(z.tag){case 0:case 11:case 15:jc(9,z)}}catch(et){cn(z,z.return,et)}if(z===C){$e=null;break e}var Ce=z.sibling;if(Ce!==null){Ce.return=z.return,$e=Ce;break e}$e=z.return}}if(Pt=p,rs(),Le&&typeof Le.onPostCommitFiberRoot=="function")try{Le.onPostCommitFiberRoot(ae,n)}catch{}u=!0}return u}finally{yt=o,Ci.transition=s}}return!1}function J0(n,s,o){s=Ga(o,s),s=v0(n,s,1),n=as(n,s,1),s=qn(),n!==null&&(xt(n,1,s),si(n,s))}function cn(n,s,o){if(n.tag===3)J0(n,n,o);else for(;s!==null;){if(s.tag===3){J0(s,n,o);break}else if(s.tag===1){var u=s.stateNode;if(typeof s.type.getDerivedStateFromError=="function"||typeof u.componentDidCatch=="function"&&(ls===null||!ls.has(u))){n=Ga(o,n),n=x0(s,n,1),s=as(s,n,1),n=qn(),s!==null&&(xt(s,1,n),si(s,n));break}}s=s.return}}function KS(n,s,o){var u=n.pingCache;u!==null&&u.delete(s),s=qn(),n.pingedLanes|=n.suspendedLanes&o,Rn===n&&(Dn&o)===o&&(yn===4||yn===3&&(Dn&130023424)===Dn&&500>sn()-Fd?Js(n,0):Ud|=o),si(n,s)}function ev(n,s){s===0&&((n.mode&1)===0?s=1:(s=Je,Je<<=1,(Je&130023424)===0&&(Je=4194304)));var o=qn();n=Tr(n,s),n!==null&&(xt(n,s,o),si(n,o))}function QS(n){var s=n.memoizedState,o=0;s!==null&&(o=s.retryLane),ev(n,o)}function ZS(n,s){var o=0;switch(n.tag){case 13:var u=n.stateNode,p=n.memoizedState;p!==null&&(o=p.retryLane);break;case 19:u=n.stateNode;break;default:throw Error(t(314))}u!==null&&u.delete(s),ev(n,o)}var tv;tv=function(n,s,o){if(n!==null)if(n.memoizedProps!==s.pendingProps||ti.current)ii=!0;else{if((n.lanes&o)===0&&(s.flags&128)===0)return ii=!1,zS(n,s,o);ii=(n.flags&131072)!==0}else ii=!1,tn&&(s.flags&1048576)!==0&&Ig(s,Cc,s.index);switch(s.lanes=0,s.tag){case 2:var u=s.type;Gc(n,s),n=s.pendingProps;var p=Ua(s,On.current);Ha(s,o),p=fd(null,s,u,n,p,o);var _=pd();return s.flags|=1,typeof p=="object"&&p!==null&&typeof p.render=="function"&&p.$$typeof===void 0?(s.tag=1,s.memoizedState=null,s.updateQueue=null,ni(u)?(_=!0,Tc(s)):_=!1,s.memoizedState=p.state!==null&&p.state!==void 0?p.state:null,ad(s),p.updater=Hc,s.stateNode=p,p._reactInternals=s,yd(s,u,n,o),s=wd(null,s,u,!0,_,o)):(s.tag=0,tn&&_&&Kh(s),$n(null,s,p,o),s=s.child),s;case 16:u=s.elementType;e:{switch(Gc(n,s),n=s.pendingProps,p=u._init,u=p(u._payload),s.type=u,p=s.tag=eM(u),n=zi(u,n),p){case 0:s=Ed(null,s,u,n,o);break e;case 1:s=R0(null,s,u,n,o);break e;case 11:s=M0(null,s,u,n,o);break e;case 14:s=E0(null,s,u,zi(u.type,n),o);break e}throw Error(t(306,u,""))}return s;case 0:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:zi(u,p),Ed(n,s,u,p,o);case 1:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:zi(u,p),R0(n,s,u,p,o);case 3:e:{if(C0(s),n===null)throw Error(t(387));u=s.pendingProps,_=s.memoizedState,p=_.element,Gg(n,s),Ic(s,u,null,o);var C=s.memoizedState;if(u=C.element,_.isDehydrated)if(_={element:u,isDehydrated:!1,cache:C.cache,pendingSuspenseBoundaries:C.pendingSuspenseBoundaries,transitions:C.transitions},s.updateQueue.baseState=_,s.memoizedState=_,s.flags&256){p=Ga(Error(t(423)),s),s=A0(n,s,u,o,p);break e}else if(u!==p){p=Ga(Error(t(424)),s),s=A0(n,s,u,o,p);break e}else for(pi=ts(s.stateNode.containerInfo.firstChild),fi=s,tn=!0,ki=null,o=Hg(s,null,u,o),s.child=o;o;)o.flags=o.flags&-3|4096,o=o.sibling;else{if(ka(),u===p){s=Rr(n,s,o);break e}$n(n,s,u,o)}s=s.child}return s;case 5:return Xg(s),n===null&&Jh(s),u=s.type,p=s.pendingProps,_=n!==null?n.memoizedProps:null,C=p.children,Wh(u,p)?C=null:_!==null&&Wh(u,_)&&(s.flags|=32),b0(n,s),$n(n,s,C,o),s.child;case 6:return n===null&&Jh(s),null;case 13:return P0(n,s,o);case 4:return od(s,s.stateNode.containerInfo),u=s.pendingProps,n===null?s.child=za(s,null,u,o):$n(n,s,u,o),s.child;case 11:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:zi(u,p),M0(n,s,u,p,o);case 7:return $n(n,s,s.pendingProps,o),s.child;case 8:return $n(n,s,s.pendingProps.children,o),s.child;case 12:return $n(n,s,s.pendingProps.children,o),s.child;case 10:e:{if(u=s.type._context,p=s.pendingProps,_=s.memoizedProps,C=p.value,Xt(Nc,u._currentValue),u._currentValue=C,_!==null)if(Oi(_.value,C)){if(_.children===p.children&&!ti.current){s=Rr(n,s,o);break e}}else for(_=s.child,_!==null&&(_.return=s);_!==null;){var z=_.dependencies;if(z!==null){C=_.child;for(var W=z.firstContext;W!==null;){if(W.context===u){if(_.tag===1){W=br(-1,o&-o),W.tag=2;var pe=_.updateQueue;if(pe!==null){pe=pe.shared;var be=pe.pending;be===null?W.next=W:(W.next=be.next,be.next=W),pe.pending=W}}_.lanes|=o,W=_.alternate,W!==null&&(W.lanes|=o),rd(_.return,o,s),z.lanes|=o;break}W=W.next}}else if(_.tag===10)C=_.type===s.type?null:_.child;else if(_.tag===18){if(C=_.return,C===null)throw Error(t(341));C.lanes|=o,z=C.alternate,z!==null&&(z.lanes|=o),rd(C,o,s),C=_.sibling}else C=_.child;if(C!==null)C.return=_;else for(C=_;C!==null;){if(C===s){C=null;break}if(_=C.sibling,_!==null){_.return=C.return,C=_;break}C=C.return}_=C}$n(n,s,p.children,o),s=s.child}return s;case 9:return p=s.type,u=s.pendingProps.children,Ha(s,o),p=bi(p),u=u(p),s.flags|=1,$n(n,s,u,o),s.child;case 14:return u=s.type,p=zi(u,s.pendingProps),p=zi(u.type,p),E0(n,s,u,p,o);case 15:return w0(n,s,s.type,s.pendingProps,o);case 17:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:zi(u,p),Gc(n,s),s.tag=1,ni(u)?(n=!0,Tc(s)):n=!1,Ha(s,o),m0(s,u,p),yd(s,u,p,o),wd(null,s,u,!0,n,o);case 19:return L0(n,s,o);case 22:return T0(n,s,o)}throw Error(t(156,s.tag))};function nv(n,s){return Vs(n,s)}function JS(n,s,o,u){this.tag=n,this.key=o,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=s,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=u,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Ai(n,s,o,u){return new JS(n,s,o,u)}function Wd(n){return n=n.prototype,!(!n||!n.isReactComponent)}function eM(n){if(typeof n=="function")return Wd(n)?1:0;if(n!=null){if(n=n.$$typeof,n===Y)return 11;if(n===O)return 14}return 2}function ds(n,s){var o=n.alternate;return o===null?(o=Ai(n.tag,s,n.key,n.mode),o.elementType=n.elementType,o.type=n.type,o.stateNode=n.stateNode,o.alternate=n,n.alternate=o):(o.pendingProps=s,o.type=n.type,o.flags=0,o.subtreeFlags=0,o.deletions=null),o.flags=n.flags&14680064,o.childLanes=n.childLanes,o.lanes=n.lanes,o.child=n.child,o.memoizedProps=n.memoizedProps,o.memoizedState=n.memoizedState,o.updateQueue=n.updateQueue,s=n.dependencies,o.dependencies=s===null?null:{lanes:s.lanes,firstContext:s.firstContext},o.sibling=n.sibling,o.index=n.index,o.ref=n.ref,o}function eu(n,s,o,u,p,_){var C=2;if(u=n,typeof n=="function")Wd(n)&&(C=1);else if(typeof n=="string")C=5;else e:switch(n){case F:return ta(o.children,p,_,s);case w:C=8,p|=8;break;case I:return n=Ai(12,o,s,p|2),n.elementType=I,n.lanes=_,n;case me:return n=Ai(13,o,s,p),n.elementType=me,n.lanes=_,n;case de:return n=Ai(19,o,s,p),n.elementType=de,n.lanes=_,n;case Q:return tu(o,p,_,s);default:if(typeof n=="object"&&n!==null)switch(n.$$typeof){case G:C=10;break e;case V:C=9;break e;case Y:C=11;break e;case O:C=14;break e;case ce:C=16,u=null;break e}throw Error(t(130,n==null?n:typeof n,""))}return s=Ai(C,o,s,p),s.elementType=n,s.type=u,s.lanes=_,s}function ta(n,s,o,u){return n=Ai(7,n,u,s),n.lanes=o,n}function tu(n,s,o,u){return n=Ai(22,n,u,s),n.elementType=Q,n.lanes=o,n.stateNode={isHidden:!1},n}function jd(n,s,o){return n=Ai(6,n,null,s),n.lanes=o,n}function Xd(n,s,o){return s=Ai(4,n.children!==null?n.children:[],n.key,s),s.lanes=o,s.stateNode={containerInfo:n.containerInfo,pendingChildren:null,implementation:n.implementation},s}function tM(n,s,o,u,p){this.tag=s,this.containerInfo=n,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=Nn(0),this.expirationTimes=Nn(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Nn(0),this.identifierPrefix=u,this.onRecoverableError=p,this.mutableSourceEagerHydrationData=null}function $d(n,s,o,u,p,_,C,z,W){return n=new tM(n,s,o,z,W),s===1?(s=1,_===!0&&(s|=8)):s=0,_=Ai(3,null,null,s),n.current=_,_.stateNode=n,_.memoizedState={element:u,isDehydrated:o,cache:null,transitions:null,pendingSuspenseBoundaries:null},ad(_),n}function nM(n,s,o){var u=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:N,key:u==null?null:""+u,children:n,containerInfo:s,implementation:o}}function iv(n){if(!n)return is;n=n._reactInternals;e:{if(Xn(n)!==n||n.tag!==1)throw Error(t(170));var s=n;do{switch(s.tag){case 3:s=s.stateNode.context;break e;case 1:if(ni(s.type)){s=s.stateNode.__reactInternalMemoizedMergedChildContext;break e}}s=s.return}while(s!==null);throw Error(t(171))}if(n.tag===1){var o=n.type;if(ni(o))return Ng(n,o,s)}return s}function rv(n,s,o,u,p,_,C,z,W){return n=$d(o,u,!0,n,p,_,C,z,W),n.context=iv(null),o=n.current,u=qn(),p=us(o),_=br(u,p),_.callback=s??null,as(o,_,p),n.current.lanes=p,xt(n,p,u),si(n,u),n}function nu(n,s,o,u){var p=s.current,_=qn(),C=us(p);return o=iv(o),s.context===null?s.context=o:s.pendingContext=o,s=br(_,C),s.payload={element:n},u=u===void 0?null:u,u!==null&&(s.callback=u),n=as(p,s,C),n!==null&&(Vi(n,p,C,_),Dc(n,p,C)),C}function iu(n){if(n=n.current,!n.child)return null;switch(n.child.tag){case 5:return n.child.stateNode;default:return n.child.stateNode}}function sv(n,s){if(n=n.memoizedState,n!==null&&n.dehydrated!==null){var o=n.retryLane;n.retryLane=o!==0&&o<s?o:s}}function qd(n,s){sv(n,s),(n=n.alternate)&&sv(n,s)}function iM(){return null}var av=typeof reportError=="function"?reportError:function(n){console.error(n)};function Yd(n){this._internalRoot=n}ru.prototype.render=Yd.prototype.render=function(n){var s=this._internalRoot;if(s===null)throw Error(t(409));nu(n,s,null,null)},ru.prototype.unmount=Yd.prototype.unmount=function(){var n=this._internalRoot;if(n!==null){this._internalRoot=null;var s=n.containerInfo;Zs(function(){nu(null,n,null,null)}),s[Sr]=null}};function ru(n){this._internalRoot=n}ru.prototype.unstable_scheduleHydration=function(n){if(n){var s=zt();n={blockedOn:null,target:n,priority:s};for(var o=0;o<Zr.length&&s!==0&&s<Zr[o].priority;o++);Zr.splice(o,0,n),o===0&&Xm(n)}};function Kd(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11)}function su(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11&&(n.nodeType!==8||n.nodeValue!==" react-mount-point-unstable "))}function ov(){}function rM(n,s,o,u,p){if(p){if(typeof u=="function"){var _=u;u=function(){var pe=iu(C);_.call(pe)}}var C=rv(s,u,n,0,null,!1,!1,"",ov);return n._reactRootContainer=C,n[Sr]=C.current,al(n.nodeType===8?n.parentNode:n),Zs(),C}for(;p=n.lastChild;)n.removeChild(p);if(typeof u=="function"){var z=u;u=function(){var pe=iu(W);z.call(pe)}}var W=$d(n,0,!1,null,null,!1,!1,"",ov);return n._reactRootContainer=W,n[Sr]=W.current,al(n.nodeType===8?n.parentNode:n),Zs(function(){nu(s,W,o,u)}),W}function au(n,s,o,u,p){var _=o._reactRootContainer;if(_){var C=_;if(typeof p=="function"){var z=p;p=function(){var W=iu(C);z.call(W)}}nu(s,C,n,p)}else C=rM(o,s,n,p,u);return iu(C)}Ut=function(n){switch(n.tag){case 3:var s=n.stateNode;if(s.current.memoizedState.isDehydrated){var o=Ct(s.pendingLanes);o!==0&&(ei(s,o|1),si(s,sn()),(Pt&6)===0&&(Xa=sn()+500,rs()))}break;case 13:Zs(function(){var u=Tr(n,1);if(u!==null){var p=qn();Vi(u,n,1,p)}}),qd(n,1)}},Yt=function(n){if(n.tag===13){var s=Tr(n,134217728);if(s!==null){var o=qn();Vi(s,n,134217728,o)}qd(n,134217728)}},Ui=function(n){if(n.tag===13){var s=us(n),o=Tr(n,s);if(o!==null){var u=qn();Vi(o,n,s,u)}qd(n,s)}},zt=function(){return yt},Fi=function(n,s){var o=yt;try{return yt=n,s()}finally{yt=o}},nt=function(n,s,o){switch(s){case"input":if(Wt(n,o),s=o.name,o.type==="radio"&&s!=null){for(o=n;o.parentNode;)o=o.parentNode;for(o=o.querySelectorAll("input[name="+JSON.stringify(""+s)+'][type="radio"]'),s=0;s<o.length;s++){var u=o[s];if(u!==n&&u.form===n.form){var p=Ec(u);if(!p)throw Error(t(90));Dt(u),Wt(u,p)}}}break;case"textarea":xn(n,o);break;case"select":s=o.value,s!=null&&wt(n,!!o.multiple,s,!1)}},Oe=Hd,Me=Zs;var sM={usingClientEntryPoint:!1,Events:[cl,Da,Ec,ye,De,Hd]},El={findFiberByHostInstance:Ws,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},aM={bundleType:El.bundleType,version:El.version,rendererPackageName:El.rendererPackageName,rendererConfig:El.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:R.ReactCurrentDispatcher,findHostInstanceByFiber:function(n){return n=Hs(n),n===null?null:n.stateNode},findFiberByHostInstance:El.findFiberByHostInstance||iM,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var ou=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!ou.isDisabled&&ou.supportsFiber)try{ae=ou.inject(aM),Le=ou}catch{}}return ai.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=sM,ai.createPortal=function(n,s){var o=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!Kd(s))throw Error(t(200));return nM(n,s,null,o)},ai.createRoot=function(n,s){if(!Kd(n))throw Error(t(299));var o=!1,u="",p=av;return s!=null&&(s.unstable_strictMode===!0&&(o=!0),s.identifierPrefix!==void 0&&(u=s.identifierPrefix),s.onRecoverableError!==void 0&&(p=s.onRecoverableError)),s=$d(n,1,!1,null,null,o,!1,u,p),n[Sr]=s.current,al(n.nodeType===8?n.parentNode:n),new Yd(s)},ai.findDOMNode=function(n){if(n==null)return null;if(n.nodeType===1)return n;var s=n._reactInternals;if(s===void 0)throw typeof n.render=="function"?Error(t(188)):(n=Object.keys(n).join(","),Error(t(268,n)));return n=Hs(s),n=n===null?null:n.stateNode,n},ai.flushSync=function(n){return Zs(n)},ai.hydrate=function(n,s,o){if(!su(s))throw Error(t(200));return au(null,n,s,!0,o)},ai.hydrateRoot=function(n,s,o){if(!Kd(n))throw Error(t(405));var u=o!=null&&o.hydratedSources||null,p=!1,_="",C=av;if(o!=null&&(o.unstable_strictMode===!0&&(p=!0),o.identifierPrefix!==void 0&&(_=o.identifierPrefix),o.onRecoverableError!==void 0&&(C=o.onRecoverableError)),s=rv(s,null,n,1,o??null,p,!1,_,C),n[Sr]=s.current,al(n),u)for(n=0;n<u.length;n++)o=u[n],p=o._getVersion,p=p(o._source),s.mutableSourceEagerHydrationData==null?s.mutableSourceEagerHydrationData=[o,p]:s.mutableSourceEagerHydrationData.push(o,p);return new ru(s)},ai.render=function(n,s,o){if(!su(s))throw Error(t(200));return au(null,n,s,!1,o)},ai.unmountComponentAtNode=function(n){if(!su(n))throw Error(t(40));return n._reactRootContainer?(Zs(function(){au(null,null,n,!1,function(){n._reactRootContainer=null,n[Sr]=null})}),!0):!1},ai.unstable_batchedUpdates=Hd,ai.unstable_renderSubtreeIntoContainer=function(n,s,o,u){if(!su(o))throw Error(t(200));if(n==null||n._reactInternals===void 0)throw Error(t(38));return au(n,s,o,!1,u)},ai.version="18.3.1-next-f1338f8080-20240426",ai}var gv;function gM(){if(gv)return ef.exports;gv=1;function i(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(i)}catch(e){console.error(e)}}return i(),ef.exports=mM(),ef.exports}var vv;function vM(){if(vv)return cu;vv=1;var i=gM();return cu.createRoot=i.createRoot,cu.hydrateRoot=i.hydrateRoot,cu}var xM=vM(),Fo=class{constructor(){this.listeners=new Set,this.subscribe=this.subscribe.bind(this)}subscribe(i){return this.listeners.add(i),this.onSubscribe(),()=>{this.listeners.delete(i),this.onUnsubscribe()}}hasListeners(){return this.listeners.size>0}onSubscribe(){}onUnsubscribe(){}},da,Es,xo,e_,_M=(e_=class extends Fo{constructor(){super();rt(this,da);rt(this,Es);rt(this,xo);ze(this,xo,e=>{if(typeof window<"u"&&window.addEventListener){const t=()=>e();return window.addEventListener("visibilitychange",t,!1),()=>{window.removeEventListener("visibilitychange",t)}}})}onSubscribe(){H(this,Es)||this.setEventListener(H(this,xo))}onUnsubscribe(){var e;this.hasListeners()||((e=H(this,Es))==null||e.call(this),ze(this,Es,void 0))}setEventListener(e){var t;ze(this,xo,e),(t=H(this,Es))==null||t.call(this),ze(this,Es,e(r=>{typeof r=="boolean"?this.setFocused(r):this.onFocus()}))}setFocused(e){H(this,da)!==e&&(ze(this,da,e),this.onFocus())}onFocus(){const e=this.isFocused();this.listeners.forEach(t=>{t(e)})}isFocused(){var e;return typeof H(this,da)=="boolean"?H(this,da):((e=globalThis.document)==null?void 0:e.visibilityState)!=="hidden"}},da=new WeakMap,Es=new WeakMap,xo=new WeakMap,e_),am=new _M,yM={setTimeout:(i,e)=>setTimeout(i,e),clearTimeout:i=>clearTimeout(i),setInterval:(i,e)=>setInterval(i,e),clearInterval:i=>clearInterval(i)},ws,rm,t_,SM=(t_=class{constructor(){rt(this,ws,yM);rt(this,rm,!1)}setTimeoutProvider(i){ze(this,ws,i)}setTimeout(i,e){return H(this,ws).setTimeout(i,e)}clearTimeout(i){H(this,ws).clearTimeout(i)}setInterval(i,e){return H(this,ws).setInterval(i,e)}clearInterval(i){H(this,ws).clearInterval(i)}},ws=new WeakMap,rm=new WeakMap,t_),la=new SM;function MM(i){setTimeout(i,0)}var EM=typeof window>"u"||"Deno"in globalThis;function Qn(){}function wM(i,e){return typeof i=="function"?i(e):i}function Yf(i){return typeof i=="number"&&i>=0&&i!==1/0}function h_(i,e){return Math.max(i+(e||0)-Date.now(),0)}function Ds(i,e){return typeof i=="function"?i(e):i}function _i(i,e){return typeof i=="function"?i(e):i}function xv(i,e){const{type:t="all",exact:r,fetchStatus:a,predicate:l,queryKey:c,stale:h}=i;if(c){if(r){if(e.queryHash!==om(c,e.options))return!1}else if(!Bl(e.queryKey,c))return!1}if(t!=="all"){const d=e.isActive();if(t==="active"&&!d||t==="inactive"&&d)return!1}return!(typeof h=="boolean"&&e.isStale()!==h||a&&a!==e.state.fetchStatus||l&&!l(e))}function _v(i,e){const{exact:t,status:r,predicate:a,mutationKey:l}=i;if(l){if(!e.options.mutationKey)return!1;if(t){if(Sa(e.options.mutationKey)!==Sa(l))return!1}else if(!Bl(e.options.mutationKey,l))return!1}return!(r&&e.state.status!==r||a&&!a(e))}function om(i,e){return((e==null?void 0:e.queryKeyHashFn)||Sa)(i)}function Sa(i){return JSON.stringify(i,(e,t)=>Kf(t)?Object.keys(t).sort().reduce((r,a)=>(r[a]=t[a],r),{}):t)}function Bl(i,e){return i===e?!0:typeof i!=typeof e?!1:i&&e&&typeof i=="object"&&typeof e=="object"?Object.keys(e).every(t=>Bl(i[t],e[t])):!1}var TM=Object.prototype.hasOwnProperty;function d_(i,e,t=0){if(i===e)return i;if(t>500)return e;const r=yv(i)&&yv(e);if(!r&&!(Kf(i)&&Kf(e)))return e;const l=(r?i:Object.keys(i)).length,c=r?e:Object.keys(e),h=c.length,d=r?new Array(h):{};let f=0;for(let m=0;m<h;m++){const g=r?m:c[m],v=i[g],x=e[g];if(v===x){d[g]=v,(r?m<l:TM.call(i,g))&&f++;continue}if(v===null||x===null||typeof v!="object"||typeof x!="object"){d[g]=x;continue}const M=d_(v,x,t+1);d[g]=M,M===v&&f++}return l===h&&f===l?i:d}function Zu(i,e){if(!e||Object.keys(i).length!==Object.keys(e).length)return!1;for(const t in i)if(i[t]!==e[t])return!1;return!0}function yv(i){return Array.isArray(i)&&i.length===Object.keys(i).length}function Kf(i){if(!Sv(i))return!1;const e=i.constructor;if(e===void 0)return!0;const t=e.prototype;return!(!Sv(t)||!t.hasOwnProperty("isPrototypeOf")||Object.getPrototypeOf(i)!==Object.prototype)}function Sv(i){return Object.prototype.toString.call(i)==="[object Object]"}function bM(i){return new Promise(e=>{la.setTimeout(e,i)})}function Qf(i,e,t){return typeof t.structuralSharing=="function"?t.structuralSharing(i,e):t.structuralSharing!==!1?d_(i,e):e}function RM(i,e,t=0){const r=[...i,e];return t&&r.length>t?r.slice(1):r}function CM(i,e,t=0){const r=[e,...i];return t&&r.length>t?r.slice(0,-1):r}var lm=Symbol();function f_(i,e){return!i.queryFn&&(e!=null&&e.initialPromise)?()=>e.initialPromise:!i.queryFn||i.queryFn===lm?()=>Promise.reject(new Error(`Missing queryFn: '${i.queryHash}'`)):i.queryFn}function cm(i,e){return typeof i=="function"?i(...e):!!i}function AM(i,e,t){let r=!1,a;return Object.defineProperty(i,"signal",{enumerable:!0,get:()=>(a??(a=e()),r||(r=!0,a.aborted?t():a.addEventListener("abort",t,{once:!0})),a)}),i}var Hl=(()=>{let i=()=>EM;return{isServer(){return i()},setIsServer(e){i=e}}})();function Zf(){let i,e;const t=new Promise((a,l)=>{i=a,e=l});t.status="pending",t.catch(()=>{});function r(a){Object.assign(t,a),delete t.resolve,delete t.reject}return t.resolve=a=>{r({status:"fulfilled",value:a}),i(a)},t.reject=a=>{r({status:"rejected",reason:a}),e(a)},t}var PM=MM;function NM(){let i=[],e=0,t=h=>{h()},r=h=>{h()},a=PM;const l=h=>{e?i.push(h):a(()=>{t(h)})},c=()=>{const h=i;i=[],h.length&&a(()=>{r(()=>{h.forEach(d=>{t(d)})})})};return{batch:h=>{let d;e++;try{d=h()}finally{e--,e||c()}return d},batchCalls:h=>(...d)=>{l(()=>{h(...d)})},schedule:l,setNotifyFunction:h=>{t=h},setBatchNotifyFunction:h=>{r=h},setScheduler:h=>{a=h}}}var Mn=NM(),_o,Ts,yo,n_,LM=(n_=class extends Fo{constructor(){super();rt(this,_o,!0);rt(this,Ts);rt(this,yo);ze(this,yo,e=>{if(typeof window<"u"&&window.addEventListener){const t=()=>e(!0),r=()=>e(!1);return window.addEventListener("online",t,!1),window.addEventListener("offline",r,!1),()=>{window.removeEventListener("online",t),window.removeEventListener("offline",r)}}})}onSubscribe(){H(this,Ts)||this.setEventListener(H(this,yo))}onUnsubscribe(){var e;this.hasListeners()||((e=H(this,Ts))==null||e.call(this),ze(this,Ts,void 0))}setEventListener(e){var t;ze(this,yo,e),(t=H(this,Ts))==null||t.call(this),ze(this,Ts,e(this.setOnline.bind(this)))}setOnline(e){H(this,_o)!==e&&(ze(this,_o,e),this.listeners.forEach(r=>{r(e)}))}isOnline(){return H(this,_o)}},_o=new WeakMap,Ts=new WeakMap,yo=new WeakMap,n_),Ju=new LM;function DM(i){return Math.min(1e3*2**i,3e4)}function p_(i){return(i??"online")==="online"?Ju.isOnline():!0}var Jf=class extends Error{constructor(i){super("CancelledError"),this.revert=i==null?void 0:i.revert,this.silent=i==null?void 0:i.silent}};function m_(i){let e=!1,t=0,r;const a=Zf(),l=()=>a.status!=="pending",c=b=>{var y;if(!l()){const S=new Jf(b);v(S),(y=i.onCancel)==null||y.call(i,S)}},h=()=>{e=!0},d=()=>{e=!1},f=()=>am.isFocused()&&(i.networkMode==="always"||Ju.isOnline())&&i.canRun(),m=()=>p_(i.networkMode)&&i.canRun(),g=b=>{l()||(r==null||r(),a.resolve(b))},v=b=>{l()||(r==null||r(),a.reject(b))},x=()=>new Promise(b=>{var y;r=S=>{(l()||f())&&b(S)},(y=i.onPause)==null||y.call(i)}).then(()=>{var b;r=void 0,l()||(b=i.onContinue)==null||b.call(i)}),M=()=>{if(l())return;let b;const y=t===0?i.initialPromise:void 0;try{b=y??i.fn()}catch(S){b=Promise.reject(S)}Promise.resolve(b).then(g).catch(S=>{var N;if(l())return;const P=i.retry??(Hl.isServer()?0:3),L=i.retryDelay??DM,R=typeof L=="function"?L(t,S):L,D=P===!0||typeof P=="number"&&t<P||typeof P=="function"&&P(t,S);if(e||!D){v(S);return}t++,(N=i.onFail)==null||N.call(i,t,S),bM(R).then(()=>f()?void 0:x()).then(()=>{e?v(S):M()})})};return{promise:a,status:()=>a.status,cancel:c,continue:()=>(r==null||r(),a),cancelRetry:h,continueRetry:d,canStart:m,start:()=>(m()?M():x().then(M),a)}}var fa,i_,g_=(i_=class{constructor(){rt(this,fa)}destroy(){this.clearGcTimeout()}scheduleGc(){this.clearGcTimeout(),Yf(this.gcTime)&&ze(this,fa,la.setTimeout(()=>{this.optionalRemove()},this.gcTime))}updateGcTime(i){this.gcTime=Math.max(this.gcTime||0,i??(Hl.isServer()?1/0:300*1e3))}clearGcTimeout(){H(this,fa)!==void 0&&(la.clearTimeout(H(this,fa)),ze(this,fa,void 0))}},fa=new WeakMap,i_);function IM(i){return{onFetch:(e,t)=>{var m,g,v,x,M;const r=e.options,a=(v=(g=(m=e.fetchOptions)==null?void 0:m.meta)==null?void 0:g.fetchMore)==null?void 0:v.direction,l=((x=e.state.data)==null?void 0:x.pages)||[],c=((M=e.state.data)==null?void 0:M.pageParams)||[];let h={pages:[],pageParams:[]},d=0;const f=async()=>{let b=!1;const y=L=>{AM(L,()=>e.signal,()=>b=!0)},S=f_(e.options,e.fetchOptions),P=async(L,R,D)=>{if(b)return Promise.reject(e.signal.reason);if(R==null&&L.pages.length)return Promise.resolve(L);const F=(()=>{const V={client:e.client,queryKey:e.queryKey,pageParam:R,direction:D?"backward":"forward",meta:e.options.meta};return y(V),V})(),w=await S(F),{maxPages:I}=e.options,G=D?CM:RM;return{pages:G(L.pages,w,I),pageParams:G(L.pageParams,R,I)}};if(a&&l.length){const L=a==="backward",R=L?UM:Mv,D={pages:l,pageParams:c},N=R(r,D);h=await P(D,N,L)}else{const L=i??l.length;do{const R=d===0?c[0]??r.initialPageParam:Mv(r,h);if(d>0&&R==null)break;h=await P(h,R),d++}while(d<L)}return h};e.options.persister?e.fetchFn=()=>{var b,y;return(y=(b=e.options).persister)==null?void 0:y.call(b,f,{client:e.client,queryKey:e.queryKey,meta:e.options.meta,signal:e.signal},t)}:e.fetchFn=f}}}function Mv(i,{pages:e,pageParams:t}){const r=e.length-1;return e.length>0?i.getNextPageParam(e[r],e,t[r],t):void 0}function UM(i,{pages:e,pageParams:t}){var r;return e.length>0?(r=i.getPreviousPageParam)==null?void 0:r.call(i,e[0],e,t[0],t):void 0}var So,pa,Mo,Li,ma,Pn,ql,ga,xi,v_,Fr,r_,FM=(r_=class extends g_{constructor(e){super();rt(this,xi);rt(this,So);rt(this,pa);rt(this,Mo);rt(this,Li);rt(this,ma);rt(this,Pn);rt(this,ql);rt(this,ga);ze(this,ga,!1),ze(this,ql,e.defaultOptions),this.setOptions(e.options),this.observers=[],ze(this,ma,e.client),ze(this,Li,H(this,ma).getQueryCache()),this.queryKey=e.queryKey,this.queryHash=e.queryHash,ze(this,pa,wv(this.options)),this.state=e.state??H(this,pa),this.scheduleGc()}get meta(){return this.options.meta}get queryType(){return H(this,So)}get promise(){var e;return(e=H(this,Pn))==null?void 0:e.promise}setOptions(e){if(this.options={...H(this,ql),...e},e!=null&&e._type&&ze(this,So,e._type),this.updateGcTime(this.options.gcTime),this.state&&this.state.data===void 0){const t=wv(this.options);t.data!==void 0&&(this.setState(Ev(t.data,t.dataUpdatedAt)),ze(this,pa,t))}}optionalRemove(){!this.observers.length&&this.state.fetchStatus==="idle"&&H(this,Li).remove(this)}setData(e,t){const r=Qf(this.state.data,e,this.options);return mt(this,xi,Fr).call(this,{data:r,type:"success",dataUpdatedAt:t==null?void 0:t.updatedAt,manual:t==null?void 0:t.manual}),r}setState(e){mt(this,xi,Fr).call(this,{type:"setState",state:e})}cancel(e){var r,a;const t=(r=H(this,Pn))==null?void 0:r.promise;return(a=H(this,Pn))==null||a.cancel(e),t?t.then(Qn).catch(Qn):Promise.resolve()}destroy(){super.destroy(),this.cancel({silent:!0})}get resetState(){return H(this,pa)}reset(){this.destroy(),this.setState(this.resetState)}isActive(){return this.observers.some(e=>_i(e.options.enabled,this)!==!1)}isDisabled(){return this.getObserversCount()>0?!this.isActive():this.options.queryFn===lm||!this.isFetched()}isFetched(){return this.state.dataUpdateCount+this.state.errorUpdateCount>0}isStatic(){return this.getObserversCount()>0?this.observers.some(e=>Ds(e.options.staleTime,this)==="static"):!1}isStale(){return this.getObserversCount()>0?this.observers.some(e=>e.getCurrentResult().isStale):this.state.data===void 0||this.state.isInvalidated}isStaleByTime(e=0){return this.state.data===void 0?!0:e==="static"?!1:this.state.isInvalidated?!0:!h_(this.state.dataUpdatedAt,e)}onFocus(){var t;const e=this.observers.find(r=>r.shouldFetchOnWindowFocus());e==null||e.refetch({cancelRefetch:!1}),(t=H(this,Pn))==null||t.continue()}onOnline(){var t;const e=this.observers.find(r=>r.shouldFetchOnReconnect());e==null||e.refetch({cancelRefetch:!1}),(t=H(this,Pn))==null||t.continue()}addObserver(e){this.observers.includes(e)||(this.observers.push(e),this.clearGcTimeout(),H(this,Li).notify({type:"observerAdded",query:this,observer:e}))}removeObserver(e){this.observers.includes(e)&&(this.observers=this.observers.filter(t=>t!==e),this.observers.length||(H(this,Pn)&&(H(this,ga)||mt(this,xi,v_).call(this)?H(this,Pn).cancel({revert:!0}):H(this,Pn).cancelRetry()),this.scheduleGc()),H(this,Li).notify({type:"observerRemoved",query:this,observer:e}))}getObserversCount(){return this.observers.length}invalidate(){this.state.isInvalidated||mt(this,xi,Fr).call(this,{type:"invalidate"})}async fetch(e,t){var f,m,g,v,x,M,b,y,S,P,L;if(this.state.fetchStatus!=="idle"&&((f=H(this,Pn))==null?void 0:f.status())!=="rejected"){if(this.state.data!==void 0&&(t!=null&&t.cancelRefetch))this.cancel({silent:!0});else if(H(this,Pn))return H(this,Pn).continueRetry(),H(this,Pn).promise}if(e&&this.setOptions(e),!this.options.queryFn){const R=this.observers.find(D=>D.options.queryFn);R&&this.setOptions(R.options)}const r=new AbortController,a=R=>{Object.defineProperty(R,"signal",{enumerable:!0,get:()=>(ze(this,ga,!0),r.signal)})},l=()=>{const R=f_(this.options,t),N=(()=>{const F={client:H(this,ma),queryKey:this.queryKey,meta:this.meta};return a(F),F})();return ze(this,ga,!1),this.options.persister?this.options.persister(R,N,this):R(N)},h=(()=>{const R={fetchOptions:t,options:this.options,queryKey:this.queryKey,client:H(this,ma),state:this.state,fetchFn:l};return a(R),R})(),d=H(this,So)==="infinite"?IM(this.options.pages):this.options.behavior;d==null||d.onFetch(h,this),ze(this,Mo,this.state),(this.state.fetchStatus==="idle"||this.state.fetchMeta!==((m=h.fetchOptions)==null?void 0:m.meta))&&mt(this,xi,Fr).call(this,{type:"fetch",meta:(g=h.fetchOptions)==null?void 0:g.meta}),ze(this,Pn,m_({initialPromise:t==null?void 0:t.initialPromise,fn:h.fetchFn,onCancel:R=>{R instanceof Jf&&R.revert&&this.setState({...H(this,Mo),fetchStatus:"idle"}),r.abort()},onFail:(R,D)=>{mt(this,xi,Fr).call(this,{type:"failed",failureCount:R,error:D})},onPause:()=>{mt(this,xi,Fr).call(this,{type:"pause"})},onContinue:()=>{mt(this,xi,Fr).call(this,{type:"continue"})},retry:h.options.retry,retryDelay:h.options.retryDelay,networkMode:h.options.networkMode,canRun:()=>!0}));try{const R=await H(this,Pn).start();if(R===void 0)throw new Error(`${this.queryHash} data is undefined`);return this.setData(R),(x=(v=H(this,Li).config).onSuccess)==null||x.call(v,R,this),(b=(M=H(this,Li).config).onSettled)==null||b.call(M,R,this.state.error,this),R}catch(R){if(R instanceof Jf){if(R.silent)return H(this,Pn).promise;if(R.revert){if(this.state.data===void 0)throw R;return this.state.data}}throw mt(this,xi,Fr).call(this,{type:"error",error:R}),(S=(y=H(this,Li).config).onError)==null||S.call(y,R,this),(L=(P=H(this,Li).config).onSettled)==null||L.call(P,this.state.data,R,this),R}finally{this.scheduleGc()}}},So=new WeakMap,pa=new WeakMap,Mo=new WeakMap,Li=new WeakMap,ma=new WeakMap,Pn=new WeakMap,ql=new WeakMap,ga=new WeakMap,xi=new WeakSet,v_=function(){return this.state.fetchStatus==="paused"&&this.state.status==="pending"},Fr=function(e){const t=r=>{switch(e.type){case"failed":return{...r,fetchFailureCount:e.failureCount,fetchFailureReason:e.error};case"pause":return{...r,fetchStatus:"paused"};case"continue":return{...r,fetchStatus:"fetching"};case"fetch":return{...r,...x_(r.data,this.options),fetchMeta:e.meta??null};case"success":const a={...r,...Ev(e.data,e.dataUpdatedAt),dataUpdateCount:r.dataUpdateCount+1,...!e.manual&&{fetchStatus:"idle",fetchFailureCount:0,fetchFailureReason:null}};return ze(this,Mo,e.manual?a:void 0),a;case"error":const l=e.error;return{...r,error:l,errorUpdateCount:r.errorUpdateCount+1,errorUpdatedAt:Date.now(),fetchFailureCount:r.fetchFailureCount+1,fetchFailureReason:l,fetchStatus:"idle",status:"error",isInvalidated:!0};case"invalidate":return{...r,isInvalidated:!0};case"setState":return{...r,...e.state}}};this.state=t(this.state),Mn.batch(()=>{this.observers.forEach(r=>{r.onQueryUpdate()}),H(this,Li).notify({query:this,type:"updated",action:e})})},r_);function x_(i,e){return{fetchFailureCount:0,fetchFailureReason:null,fetchStatus:p_(e.networkMode)?"fetching":"paused",...i===void 0&&{error:null,status:"pending"}}}function Ev(i,e){return{data:i,dataUpdatedAt:e??Date.now(),error:null,isInvalidated:!1,status:"success"}}function wv(i){const e=typeof i.initialData=="function"?i.initialData():i.initialData,t=e!==void 0,r=t?typeof i.initialDataUpdatedAt=="function"?i.initialDataUpdatedAt():i.initialDataUpdatedAt:0;return{data:e,dataUpdateCount:0,dataUpdatedAt:t?r??Date.now():0,error:null,errorUpdateCount:0,errorUpdatedAt:0,fetchFailureCount:0,fetchFailureReason:null,fetchMeta:null,isInvalidated:!1,status:t?"success":"pending",fetchStatus:"idle"}}var ci,Tt,Yl,Kn,va,Eo,Or,bs,Kl,wo,To,xa,_a,Rs,bo,Ft,Il,ep,tp,np,ip,rp,sp,ap,__,s_,OM=(s_=class extends Fo{constructor(e,t){super();rt(this,Ft);rt(this,ci);rt(this,Tt);rt(this,Yl);rt(this,Kn);rt(this,va);rt(this,Eo);rt(this,Or);rt(this,bs);rt(this,Kl);rt(this,wo);rt(this,To);rt(this,xa);rt(this,_a);rt(this,Rs);rt(this,bo,new Set);this.options=t,ze(this,ci,e),ze(this,bs,null),ze(this,Or,Zf()),this.bindMethods(),this.setOptions(t)}bindMethods(){this.refetch=this.refetch.bind(this)}onSubscribe(){this.listeners.size===1&&(H(this,Tt).addObserver(this),Tv(H(this,Tt),this.options)?mt(this,Ft,Il).call(this):this.updateResult(),mt(this,Ft,ip).call(this))}onUnsubscribe(){this.hasListeners()||this.destroy()}shouldFetchOnReconnect(){return op(H(this,Tt),this.options,this.options.refetchOnReconnect)}shouldFetchOnWindowFocus(){return op(H(this,Tt),this.options,this.options.refetchOnWindowFocus)}destroy(){this.listeners=new Set,mt(this,Ft,rp).call(this),mt(this,Ft,sp).call(this),H(this,Tt).removeObserver(this)}setOptions(e){const t=this.options,r=H(this,Tt);if(this.options=H(this,ci).defaultQueryOptions(e),this.options.enabled!==void 0&&typeof this.options.enabled!="boolean"&&typeof this.options.enabled!="function"&&typeof _i(this.options.enabled,H(this,Tt))!="boolean")throw new Error("Expected enabled to be a boolean or a callback that returns a boolean");mt(this,Ft,ap).call(this),H(this,Tt).setOptions(this.options),t._defaulted&&!Zu(this.options,t)&&H(this,ci).getQueryCache().notify({type:"observerOptionsUpdated",query:H(this,Tt),observer:this});const a=this.hasListeners();a&&bv(H(this,Tt),r,this.options,t)&&mt(this,Ft,Il).call(this),this.updateResult(),a&&(H(this,Tt)!==r||_i(this.options.enabled,H(this,Tt))!==_i(t.enabled,H(this,Tt))||Ds(this.options.staleTime,H(this,Tt))!==Ds(t.staleTime,H(this,Tt)))&&mt(this,Ft,ep).call(this);const l=mt(this,Ft,tp).call(this);a&&(H(this,Tt)!==r||_i(this.options.enabled,H(this,Tt))!==_i(t.enabled,H(this,Tt))||l!==H(this,Rs))&&mt(this,Ft,np).call(this,l)}getOptimisticResult(e){const t=H(this,ci).getQueryCache().build(H(this,ci),e),r=this.createResult(t,e);return zM(this,r)&&(ze(this,Kn,r),ze(this,Eo,this.options),ze(this,va,H(this,Tt).state)),r}getCurrentResult(){return H(this,Kn)}trackResult(e,t){return new Proxy(e,{get:(r,a)=>(this.trackProp(a),t==null||t(a),a==="promise"&&(this.trackProp("data"),!this.options.experimental_prefetchInRender&&H(this,Or).status==="pending"&&H(this,Or).reject(new Error("experimental_prefetchInRender feature flag is not enabled"))),Reflect.get(r,a))})}trackProp(e){H(this,bo).add(e)}getCurrentQuery(){return H(this,Tt)}refetch({...e}={}){return this.fetch({...e})}fetchOptimistic(e){const t=H(this,ci).defaultQueryOptions(e),r=H(this,ci).getQueryCache().build(H(this,ci),t);return r.fetch().then(()=>this.createResult(r,t))}fetch(e){return mt(this,Ft,Il).call(this,{...e,cancelRefetch:e.cancelRefetch??!0}).then(()=>(this.updateResult(),H(this,Kn)))}createResult(e,t){var I;const r=H(this,Tt),a=this.options,l=H(this,Kn),c=H(this,va),h=H(this,Eo),f=e!==r?e.state:H(this,Yl),{state:m}=e;let g={...m},v=!1,x;if(t._optimisticResults){const G=this.hasListeners(),V=!G&&Tv(e,t),Y=G&&bv(e,r,t,a);(V||Y)&&(g={...g,...x_(m.data,e.options)}),t._optimisticResults==="isRestoring"&&(g.fetchStatus="idle")}let{error:M,errorUpdatedAt:b,status:y}=g;x=g.data;let S=!1;if(t.placeholderData!==void 0&&x===void 0&&y==="pending"){let G;l!=null&&l.isPlaceholderData&&t.placeholderData===(h==null?void 0:h.placeholderData)?(G=l.data,S=!0):G=typeof t.placeholderData=="function"?t.placeholderData((I=H(this,To))==null?void 0:I.state.data,H(this,To)):t.placeholderData,G!==void 0&&(y="success",x=Qf(l==null?void 0:l.data,G,t),v=!0)}if(t.select&&x!==void 0&&!S)if(l&&x===(c==null?void 0:c.data)&&t.select===H(this,Kl))x=H(this,wo);else try{ze(this,Kl,t.select),x=t.select(x),x=Qf(l==null?void 0:l.data,x,t),ze(this,wo,x),ze(this,bs,null)}catch(G){ze(this,bs,G)}H(this,bs)&&(M=H(this,bs),x=H(this,wo),b=Date.now(),y="error");const P=g.fetchStatus==="fetching",L=y==="pending",R=y==="error",D=L&&P,N=x!==void 0,w={status:y,fetchStatus:g.fetchStatus,isPending:L,isSuccess:y==="success",isError:R,isInitialLoading:D,isLoading:D,data:x,dataUpdatedAt:g.dataUpdatedAt,error:M,errorUpdatedAt:b,failureCount:g.fetchFailureCount,failureReason:g.fetchFailureReason,errorUpdateCount:g.errorUpdateCount,isFetched:e.isFetched(),isFetchedAfterMount:g.dataUpdateCount>f.dataUpdateCount||g.errorUpdateCount>f.errorUpdateCount,isFetching:P,isRefetching:P&&!L,isLoadingError:R&&!N,isPaused:g.fetchStatus==="paused",isPlaceholderData:v,isRefetchError:R&&N,isStale:um(e,t),refetch:this.refetch,promise:H(this,Or),isEnabled:_i(t.enabled,e)!==!1};if(this.options.experimental_prefetchInRender){const G=w.data!==void 0,V=w.status==="error"&&!G,Y=O=>{V?O.reject(w.error):G&&O.resolve(w.data)},me=()=>{const O=ze(this,Or,w.promise=Zf());Y(O)},de=H(this,Or);switch(de.status){case"pending":e.queryHash===r.queryHash&&Y(de);break;case"fulfilled":(V||w.data!==de.value)&&me();break;case"rejected":(!V||w.error!==de.reason)&&me();break}}return w}updateResult(){const e=H(this,Kn),t=this.createResult(H(this,Tt),this.options);if(ze(this,va,H(this,Tt).state),ze(this,Eo,this.options),H(this,va).data!==void 0&&ze(this,To,H(this,Tt)),Zu(t,e))return;ze(this,Kn,t);const r=()=>{if(!e)return!0;const{notifyOnChangeProps:a}=this.options,l=typeof a=="function"?a():a;if(l==="all"||!l&&!H(this,bo).size)return!0;const c=new Set(l??H(this,bo));return this.options.throwOnError&&c.add("error"),Object.keys(H(this,Kn)).some(h=>{const d=h;return H(this,Kn)[d]!==e[d]&&c.has(d)})};mt(this,Ft,__).call(this,{listeners:r()})}onQueryUpdate(){this.updateResult(),this.hasListeners()&&mt(this,Ft,ip).call(this)}},ci=new WeakMap,Tt=new WeakMap,Yl=new WeakMap,Kn=new WeakMap,va=new WeakMap,Eo=new WeakMap,Or=new WeakMap,bs=new WeakMap,Kl=new WeakMap,wo=new WeakMap,To=new WeakMap,xa=new WeakMap,_a=new WeakMap,Rs=new WeakMap,bo=new WeakMap,Ft=new WeakSet,Il=function(e){mt(this,Ft,ap).call(this);let t=H(this,Tt).fetch(this.options,e);return e!=null&&e.throwOnError||(t=t.catch(Qn)),t},ep=function(){mt(this,Ft,rp).call(this);const e=Ds(this.options.staleTime,H(this,Tt));if(Hl.isServer()||H(this,Kn).isStale||!Yf(e))return;const r=h_(H(this,Kn).dataUpdatedAt,e)+1;ze(this,xa,la.setTimeout(()=>{H(this,Kn).isStale||this.updateResult()},r))},tp=function(){return(typeof this.options.refetchInterval=="function"?this.options.refetchInterval(H(this,Tt)):this.options.refetchInterval)??!1},np=function(e){mt(this,Ft,sp).call(this),ze(this,Rs,e),!(Hl.isServer()||_i(this.options.enabled,H(this,Tt))===!1||!Yf(H(this,Rs))||H(this,Rs)===0)&&ze(this,_a,la.setInterval(()=>{(this.options.refetchIntervalInBackground||am.isFocused())&&mt(this,Ft,Il).call(this)},H(this,Rs)))},ip=function(){mt(this,Ft,ep).call(this),mt(this,Ft,np).call(this,mt(this,Ft,tp).call(this))},rp=function(){H(this,xa)!==void 0&&(la.clearTimeout(H(this,xa)),ze(this,xa,void 0))},sp=function(){H(this,_a)!==void 0&&(la.clearInterval(H(this,_a)),ze(this,_a,void 0))},ap=function(){const e=H(this,ci).getQueryCache().build(H(this,ci),this.options);if(e===H(this,Tt))return;const t=H(this,Tt);ze(this,Tt,e),ze(this,Yl,e.state),this.hasListeners()&&(t==null||t.removeObserver(this),e.addObserver(this))},__=function(e){Mn.batch(()=>{e.listeners&&this.listeners.forEach(t=>{t(H(this,Kn))}),H(this,ci).getQueryCache().notify({query:H(this,Tt),type:"observerResultsUpdated"})})},s_);function kM(i,e){return _i(e.enabled,i)!==!1&&i.state.data===void 0&&!(i.state.status==="error"&&_i(e.retryOnMount,i)===!1)}function Tv(i,e){return kM(i,e)||i.state.data!==void 0&&op(i,e,e.refetchOnMount)}function op(i,e,t){if(_i(e.enabled,i)!==!1&&Ds(e.staleTime,i)!=="static"){const r=typeof t=="function"?t(i):t;return r==="always"||r!==!1&&um(i,e)}return!1}function bv(i,e,t,r){return(i!==e||_i(r.enabled,i)===!1)&&(!t.suspense||i.state.status!=="error")&&um(i,t)}function um(i,e){return _i(e.enabled,i)!==!1&&i.isStaleByTime(Ds(e.staleTime,i))}function zM(i,e){return!Zu(i.getCurrentResult(),e)}var Ql,or,Gn,ya,lr,ys,a_,BM=(a_=class extends g_{constructor(e){super();rt(this,lr);rt(this,Ql);rt(this,or);rt(this,Gn);rt(this,ya);ze(this,Ql,e.client),this.mutationId=e.mutationId,ze(this,Gn,e.mutationCache),ze(this,or,[]),this.state=e.state||y_(),this.setOptions(e.options),this.scheduleGc()}setOptions(e){this.options=e,this.updateGcTime(this.options.gcTime)}get meta(){return this.options.meta}addObserver(e){H(this,or).includes(e)||(H(this,or).push(e),this.clearGcTimeout(),H(this,Gn).notify({type:"observerAdded",mutation:this,observer:e}))}removeObserver(e){ze(this,or,H(this,or).filter(t=>t!==e)),this.scheduleGc(),H(this,Gn).notify({type:"observerRemoved",mutation:this,observer:e})}optionalRemove(){H(this,or).length||(this.state.status==="pending"?this.scheduleGc():H(this,Gn).remove(this))}continue(){var e;return((e=H(this,ya))==null?void 0:e.continue())??this.execute(this.state.variables)}async execute(e){var c,h,d,f,m,g,v,x,M,b,y,S,P,L,R,D,N,F;const t=()=>{mt(this,lr,ys).call(this,{type:"continue"})},r={client:H(this,Ql),meta:this.options.meta,mutationKey:this.options.mutationKey};ze(this,ya,m_({fn:()=>this.options.mutationFn?this.options.mutationFn(e,r):Promise.reject(new Error("No mutationFn found")),onFail:(w,I)=>{mt(this,lr,ys).call(this,{type:"failed",failureCount:w,error:I})},onPause:()=>{mt(this,lr,ys).call(this,{type:"pause"})},onContinue:t,retry:this.options.retry??0,retryDelay:this.options.retryDelay,networkMode:this.options.networkMode,canRun:()=>H(this,Gn).canRun(this)}));const a=this.state.status==="pending",l=!H(this,ya).canStart();try{if(a)t();else{mt(this,lr,ys).call(this,{type:"pending",variables:e,isPaused:l}),H(this,Gn).config.onMutate&&await H(this,Gn).config.onMutate(e,this,r);const I=await((h=(c=this.options).onMutate)==null?void 0:h.call(c,e,r));I!==this.state.context&&mt(this,lr,ys).call(this,{type:"pending",context:I,variables:e,isPaused:l})}const w=await H(this,ya).start();return await((f=(d=H(this,Gn).config).onSuccess)==null?void 0:f.call(d,w,e,this.state.context,this,r)),await((g=(m=this.options).onSuccess)==null?void 0:g.call(m,w,e,this.state.context,r)),await((x=(v=H(this,Gn).config).onSettled)==null?void 0:x.call(v,w,null,this.state.variables,this.state.context,this,r)),await((b=(M=this.options).onSettled)==null?void 0:b.call(M,w,null,e,this.state.context,r)),mt(this,lr,ys).call(this,{type:"success",data:w}),w}catch(w){try{await((S=(y=H(this,Gn).config).onError)==null?void 0:S.call(y,w,e,this.state.context,this,r))}catch(I){Promise.reject(I)}try{await((L=(P=this.options).onError)==null?void 0:L.call(P,w,e,this.state.context,r))}catch(I){Promise.reject(I)}try{await((D=(R=H(this,Gn).config).onSettled)==null?void 0:D.call(R,void 0,w,this.state.variables,this.state.context,this,r))}catch(I){Promise.reject(I)}try{await((F=(N=this.options).onSettled)==null?void 0:F.call(N,void 0,w,e,this.state.context,r))}catch(I){Promise.reject(I)}throw mt(this,lr,ys).call(this,{type:"error",error:w}),w}finally{H(this,Gn).runNext(this)}}},Ql=new WeakMap,or=new WeakMap,Gn=new WeakMap,ya=new WeakMap,lr=new WeakSet,ys=function(e){const t=r=>{switch(e.type){case"failed":return{...r,failureCount:e.failureCount,failureReason:e.error};case"pause":return{...r,isPaused:!0};case"continue":return{...r,isPaused:!1};case"pending":return{...r,context:e.context,data:void 0,failureCount:0,failureReason:null,error:null,isPaused:e.isPaused,status:"pending",variables:e.variables,submittedAt:Date.now()};case"success":return{...r,data:e.data,failureCount:0,failureReason:null,error:null,status:"success",isPaused:!1};case"error":return{...r,data:void 0,error:e.error,failureCount:r.failureCount+1,failureReason:e.error,isPaused:!1,status:"error"}}};this.state=t(this.state),Mn.batch(()=>{H(this,or).forEach(r=>{r.onMutationUpdate(e)}),H(this,Gn).notify({mutation:this,type:"updated",action:e})})},a_);function y_(){return{context:void 0,data:void 0,error:null,failureCount:0,failureReason:null,isPaused:!1,status:"idle",variables:void 0,submittedAt:0}}var kr,$i,Zl,o_,HM=(o_=class extends Fo{constructor(e={}){super();rt(this,kr);rt(this,$i);rt(this,Zl);this.config=e,ze(this,kr,new Set),ze(this,$i,new Map),ze(this,Zl,0)}build(e,t,r){const a=new BM({client:e,mutationCache:this,mutationId:++lu(this,Zl)._,options:e.defaultMutationOptions(t),state:r});return this.add(a),a}add(e){H(this,kr).add(e);const t=uu(e);if(typeof t=="string"){const r=H(this,$i).get(t);r?r.push(e):H(this,$i).set(t,[e])}this.notify({type:"added",mutation:e})}remove(e){if(H(this,kr).delete(e)){const t=uu(e);if(typeof t=="string"){const r=H(this,$i).get(t);if(r)if(r.length>1){const a=r.indexOf(e);a!==-1&&r.splice(a,1)}else r[0]===e&&H(this,$i).delete(t)}}this.notify({type:"removed",mutation:e})}canRun(e){const t=uu(e);if(typeof t=="string"){const r=H(this,$i).get(t),a=r==null?void 0:r.find(l=>l.state.status==="pending");return!a||a===e}else return!0}runNext(e){var r;const t=uu(e);if(typeof t=="string"){const a=(r=H(this,$i).get(t))==null?void 0:r.find(l=>l!==e&&l.state.isPaused);return(a==null?void 0:a.continue())??Promise.resolve()}else return Promise.resolve()}clear(){Mn.batch(()=>{H(this,kr).forEach(e=>{this.notify({type:"removed",mutation:e})}),H(this,kr).clear(),H(this,$i).clear()})}getAll(){return Array.from(H(this,kr))}find(e){const t={exact:!0,...e};return this.getAll().find(r=>_v(t,r))}findAll(e={}){return this.getAll().filter(t=>_v(e,t))}notify(e){Mn.batch(()=>{this.listeners.forEach(t=>{t(e)})})}resumePausedMutations(){const e=this.getAll().filter(t=>t.state.isPaused);return Mn.batch(()=>Promise.all(e.map(t=>t.continue().catch(Qn))))}},kr=new WeakMap,$i=new WeakMap,Zl=new WeakMap,o_);function uu(i){var e;return(e=i.options.scope)==null?void 0:e.id}var zr,Cs,ui,Br,Wr,Hu,lp,l_,VM=(l_=class extends Fo{constructor(t,r){super();rt(this,Wr);rt(this,zr);rt(this,Cs);rt(this,ui);rt(this,Br);ze(this,zr,t),this.setOptions(r),this.bindMethods(),mt(this,Wr,Hu).call(this)}bindMethods(){this.mutate=this.mutate.bind(this),this.reset=this.reset.bind(this)}setOptions(t){var a;const r=this.options;this.options=H(this,zr).defaultMutationOptions(t),Zu(this.options,r)||H(this,zr).getMutationCache().notify({type:"observerOptionsUpdated",mutation:H(this,ui),observer:this}),r!=null&&r.mutationKey&&this.options.mutationKey&&Sa(r.mutationKey)!==Sa(this.options.mutationKey)?this.reset():((a=H(this,ui))==null?void 0:a.state.status)==="pending"&&H(this,ui).setOptions(this.options)}onUnsubscribe(){var t;this.hasListeners()||(t=H(this,ui))==null||t.removeObserver(this)}onMutationUpdate(t){mt(this,Wr,Hu).call(this),mt(this,Wr,lp).call(this,t)}getCurrentResult(){return H(this,Cs)}reset(){var t;(t=H(this,ui))==null||t.removeObserver(this),ze(this,ui,void 0),mt(this,Wr,Hu).call(this),mt(this,Wr,lp).call(this)}mutate(t,r){var a;return ze(this,Br,r),(a=H(this,ui))==null||a.removeObserver(this),ze(this,ui,H(this,zr).getMutationCache().build(H(this,zr),this.options)),H(this,ui).addObserver(this),H(this,ui).execute(t)}},zr=new WeakMap,Cs=new WeakMap,ui=new WeakMap,Br=new WeakMap,Wr=new WeakSet,Hu=function(){var r;const t=((r=H(this,ui))==null?void 0:r.state)??y_();ze(this,Cs,{...t,isPending:t.status==="pending",isSuccess:t.status==="success",isError:t.status==="error",isIdle:t.status==="idle",mutate:this.mutate,reset:this.reset})},lp=function(t){Mn.batch(()=>{var r,a,l,c,h,d,f,m;if(H(this,Br)&&this.hasListeners()){const g=H(this,Cs).variables,v=H(this,Cs).context,x={client:H(this,zr),meta:this.options.meta,mutationKey:this.options.mutationKey};if((t==null?void 0:t.type)==="success"){try{(a=(r=H(this,Br)).onSuccess)==null||a.call(r,t.data,g,v,x)}catch(M){Promise.reject(M)}try{(c=(l=H(this,Br)).onSettled)==null||c.call(l,t.data,null,g,v,x)}catch(M){Promise.reject(M)}}else if((t==null?void 0:t.type)==="error"){try{(d=(h=H(this,Br)).onError)==null||d.call(h,t.error,g,v,x)}catch(M){Promise.reject(M)}try{(m=(f=H(this,Br)).onSettled)==null||m.call(f,void 0,t.error,g,v,x)}catch(M){Promise.reject(M)}}}this.listeners.forEach(g=>{g(H(this,Cs))})})},l_),cr,c_,GM=(c_=class extends Fo{constructor(e={}){super();rt(this,cr);this.config=e,ze(this,cr,new Map)}build(e,t,r){const a=t.queryKey,l=t.queryHash??om(a,t);let c=this.get(l);return c||(c=new FM({client:e,queryKey:a,queryHash:l,options:e.defaultQueryOptions(t),state:r,defaultOptions:e.getQueryDefaults(a)}),this.add(c)),c}add(e){H(this,cr).has(e.queryHash)||(H(this,cr).set(e.queryHash,e),this.notify({type:"added",query:e}))}remove(e){const t=H(this,cr).get(e.queryHash);t&&(e.destroy(),t===e&&H(this,cr).delete(e.queryHash),this.notify({type:"removed",query:e}))}clear(){Mn.batch(()=>{this.getAll().forEach(e=>{this.remove(e)})})}get(e){return H(this,cr).get(e)}getAll(){return[...H(this,cr).values()]}find(e){const t={exact:!0,...e};return this.getAll().find(r=>xv(t,r))}findAll(e={}){const t=this.getAll();return Object.keys(e).length>0?t.filter(r=>xv(e,r)):t}notify(e){Mn.batch(()=>{this.listeners.forEach(t=>{t(e)})})}onFocus(){Mn.batch(()=>{this.getAll().forEach(e=>{e.onFocus()})})}onOnline(){Mn.batch(()=>{this.getAll().forEach(e=>{e.onOnline()})})}},cr=new WeakMap,c_),un,As,Ps,Ro,Co,Ns,Ao,Po,u_,WM=(u_=class{constructor(i={}){rt(this,un);rt(this,As);rt(this,Ps);rt(this,Ro);rt(this,Co);rt(this,Ns);rt(this,Ao);rt(this,Po);ze(this,un,i.queryCache||new GM),ze(this,As,i.mutationCache||new HM),ze(this,Ps,i.defaultOptions||{}),ze(this,Ro,new Map),ze(this,Co,new Map),ze(this,Ns,0)}mount(){lu(this,Ns)._++,H(this,Ns)===1&&(ze(this,Ao,am.subscribe(async i=>{i&&(await this.resumePausedMutations(),H(this,un).onFocus())})),ze(this,Po,Ju.subscribe(async i=>{i&&(await this.resumePausedMutations(),H(this,un).onOnline())})))}unmount(){var i,e;lu(this,Ns)._--,H(this,Ns)===0&&((i=H(this,Ao))==null||i.call(this),ze(this,Ao,void 0),(e=H(this,Po))==null||e.call(this),ze(this,Po,void 0))}isFetching(i){return H(this,un).findAll({...i,fetchStatus:"fetching"}).length}isMutating(i){return H(this,As).findAll({...i,status:"pending"}).length}getQueryData(i){var t;const e=this.defaultQueryOptions({queryKey:i});return(t=H(this,un).get(e.queryHash))==null?void 0:t.state.data}ensureQueryData(i){const e=this.defaultQueryOptions(i),t=H(this,un).build(this,e),r=t.state.data;return r===void 0?this.fetchQuery(i):(i.revalidateIfStale&&t.isStaleByTime(Ds(e.staleTime,t))&&this.prefetchQuery(e),Promise.resolve(r))}getQueriesData(i){return H(this,un).findAll(i).map(({queryKey:e,state:t})=>{const r=t.data;return[e,r]})}setQueryData(i,e,t){const r=this.defaultQueryOptions({queryKey:i}),a=H(this,un).get(r.queryHash),l=a==null?void 0:a.state.data,c=wM(e,l);if(c!==void 0)return H(this,un).build(this,r).setData(c,{...t,manual:!0})}setQueriesData(i,e,t){return Mn.batch(()=>H(this,un).findAll(i).map(({queryKey:r})=>[r,this.setQueryData(r,e,t)]))}getQueryState(i){var t;const e=this.defaultQueryOptions({queryKey:i});return(t=H(this,un).get(e.queryHash))==null?void 0:t.state}removeQueries(i){const e=H(this,un);Mn.batch(()=>{e.findAll(i).forEach(t=>{e.remove(t)})})}resetQueries(i,e){const t=H(this,un);return Mn.batch(()=>(t.findAll(i).forEach(r=>{r.reset()}),this.refetchQueries({type:"active",...i},e)))}cancelQueries(i,e={}){const t={revert:!0,...e},r=Mn.batch(()=>H(this,un).findAll(i).map(a=>a.cancel(t)));return Promise.all(r).then(Qn).catch(Qn)}invalidateQueries(i,e={}){return Mn.batch(()=>(H(this,un).findAll(i).forEach(t=>{t.invalidate()}),(i==null?void 0:i.refetchType)==="none"?Promise.resolve():this.refetchQueries({...i,type:(i==null?void 0:i.refetchType)??(i==null?void 0:i.type)??"active"},e)))}refetchQueries(i,e={}){const t={...e,cancelRefetch:e.cancelRefetch??!0},r=Mn.batch(()=>H(this,un).findAll(i).filter(a=>!a.isDisabled()&&!a.isStatic()).map(a=>{let l=a.fetch(void 0,t);return t.throwOnError||(l=l.catch(Qn)),a.state.fetchStatus==="paused"?Promise.resolve():l}));return Promise.all(r).then(Qn)}fetchQuery(i){const e=this.defaultQueryOptions(i);e.retry===void 0&&(e.retry=!1);const t=H(this,un).build(this,e);return t.isStaleByTime(Ds(e.staleTime,t))?t.fetch(e):Promise.resolve(t.state.data)}prefetchQuery(i){return this.fetchQuery(i).then(Qn).catch(Qn)}fetchInfiniteQuery(i){return i._type="infinite",this.fetchQuery(i)}prefetchInfiniteQuery(i){return this.fetchInfiniteQuery(i).then(Qn).catch(Qn)}ensureInfiniteQueryData(i){return i._type="infinite",this.ensureQueryData(i)}resumePausedMutations(){return Ju.isOnline()?H(this,As).resumePausedMutations():Promise.resolve()}getQueryCache(){return H(this,un)}getMutationCache(){return H(this,As)}getDefaultOptions(){return H(this,Ps)}setDefaultOptions(i){ze(this,Ps,i)}setQueryDefaults(i,e){H(this,Ro).set(Sa(i),{queryKey:i,defaultOptions:e})}getQueryDefaults(i){const e=[...H(this,Ro).values()],t={};return e.forEach(r=>{Bl(i,r.queryKey)&&Object.assign(t,r.defaultOptions)}),t}setMutationDefaults(i,e){H(this,Co).set(Sa(i),{mutationKey:i,defaultOptions:e})}getMutationDefaults(i){const e=[...H(this,Co).values()],t={};return e.forEach(r=>{Bl(i,r.mutationKey)&&Object.assign(t,r.defaultOptions)}),t}defaultQueryOptions(i){if(i._defaulted)return i;const e={...H(this,Ps).queries,...this.getQueryDefaults(i.queryKey),...i,_defaulted:!0};return e.queryHash||(e.queryHash=om(e.queryKey,e)),e.refetchOnReconnect===void 0&&(e.refetchOnReconnect=e.networkMode!=="always"),e.throwOnError===void 0&&(e.throwOnError=!!e.suspense),!e.networkMode&&e.persister&&(e.networkMode="offlineFirst"),e.queryFn===lm&&(e.enabled=!1),e}defaultMutationOptions(i){return i!=null&&i._defaulted?i:{...H(this,Ps).mutations,...(i==null?void 0:i.mutationKey)&&this.getMutationDefaults(i.mutationKey),...i,_defaulted:!0}}clear(){H(this,un).clear(),H(this,As).clear()}},un=new WeakMap,As=new WeakMap,Ps=new WeakMap,Ro=new WeakMap,Co=new WeakMap,Ns=new WeakMap,Ao=new WeakMap,Po=new WeakMap,u_),S_=B.createContext(void 0),hm=i=>{const e=B.useContext(S_);if(!e)throw new Error("No QueryClient set, use QueryClientProvider to set one");return e},jM=({client:i,children:e})=>(B.useEffect(()=>(i.mount(),()=>{i.unmount()}),[i]),E.jsx(S_.Provider,{value:i,children:e})),M_=B.createContext(!1),XM=()=>B.useContext(M_);M_.Provider;function $M(){let i=!1;return{clearReset:()=>{i=!1},reset:()=>{i=!0},isReset:()=>i}}var qM=B.createContext($M()),YM=()=>B.useContext(qM),KM=(i,e,t)=>{const r=t!=null&&t.state.error&&typeof i.throwOnError=="function"?cm(i.throwOnError,[t.state.error,t]):i.throwOnError;(i.suspense||i.experimental_prefetchInRender||r)&&(e.isReset()||(i.retryOnMount=!1))},QM=i=>{B.useEffect(()=>{i.clearReset()},[i])},ZM=({result:i,errorResetBoundary:e,throwOnError:t,query:r,suspense:a})=>i.isError&&!e.isReset()&&!i.isFetching&&r&&(a&&i.data===void 0||cm(t,[i.error,r])),JM=i=>{if(i.suspense){const t=a=>a==="static"?a:Math.max(a??1e3,1e3),r=i.staleTime;i.staleTime=typeof r=="function"?(...a)=>t(r(...a)):t(r),typeof i.gcTime=="number"&&(i.gcTime=Math.max(i.gcTime,1e3))}},eE=(i,e)=>i.isLoading&&i.isFetching&&!e,tE=(i,e)=>(i==null?void 0:i.suspense)&&e.isPending,Rv=(i,e,t)=>e.fetchOptimistic(i).catch(()=>{t.clearReset()});function nE(i,e,t){var x,M,b,y;const r=XM(),a=YM(),l=hm(),c=l.defaultQueryOptions(i);(M=(x=l.getDefaultOptions().queries)==null?void 0:x._experimental_beforeQuery)==null||M.call(x,c);const h=l.getQueryCache().get(c.queryHash),d=i.subscribed!==!1;c._optimisticResults=r?"isRestoring":d?"optimistic":void 0,JM(c),KM(c,a,h),QM(a);const f=!l.getQueryCache().get(c.queryHash),[m]=B.useState(()=>new e(l,c)),g=m.getOptimisticResult(c),v=!r&&d;if(B.useSyncExternalStore(B.useCallback(S=>{const P=v?m.subscribe(Mn.batchCalls(S)):Qn;return m.updateResult(),P},[m,v]),()=>m.getCurrentResult(),()=>m.getCurrentResult()),B.useEffect(()=>{m.setOptions(c)},[c,m]),tE(c,g))throw Rv(c,m,a);if(ZM({result:g,errorResetBoundary:a,throwOnError:c.throwOnError,query:h,suspense:c.suspense}))throw g.error;if((y=(b=l.getDefaultOptions().queries)==null?void 0:b._experimental_afterQuery)==null||y.call(b,c,g),c.experimental_prefetchInRender&&!Hl.isServer()&&eE(g,r)){const S=f?Rv(c,m,a):h==null?void 0:h.promise;S==null||S.catch(Qn).finally(()=>{m.updateResult()})}return c.notifyOnChangeProps?g:m.trackResult(g)}function No(i,e){return nE(i,OM)}function ca(i,e){const t=hm(),[r]=B.useState(()=>new VM(t,i));B.useEffect(()=>{r.setOptions(i)},[r,i]);const a=B.useSyncExternalStore(B.useCallback(c=>r.subscribe(Mn.batchCalls(c)),[r]),()=>r.getCurrentResult(),()=>r.getCurrentResult()),l=B.useCallback((c,h)=>{r.mutate(c,h).catch(Qn)},[r]);if(a.error&&cm(r.options.throwOnError,[a.error]))throw a.error;return{...a,mutate:l,mutateAsync:a.mutate}}/**
 * react-router v7.18.0
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */var dm=/^(?:[a-z][a-z0-9+.-]*:|[\\/]{2})/i,E_=/^[\\/]{2}/;function iE(i,e){return e+i.replace(/\\/g,"/")}var Cv="popstate";function Av(i){return typeof i=="object"&&i!=null&&"pathname"in i&&"search"in i&&"hash"in i&&"state"in i&&"key"in i}function rE(i={}){function e(r,a){var f;let l=(f=a.state)==null?void 0:f.masked,{pathname:c,search:h,hash:d}=l||r.location;return cp("",{pathname:c,search:h,hash:d},a.state&&a.state.usr||null,a.state&&a.state.key||"default",l?{pathname:r.location.pathname,search:r.location.search,hash:r.location.hash}:void 0)}function t(r,a){return typeof a=="string"?a:Vl(a)}return aE(e,t,null,i)}function nn(i,e){if(i===!1||i===null||typeof i>"u")throw new Error(e)}function Ii(i,e){if(!i){typeof console<"u"&&console.warn(e);try{throw new Error(e)}catch{}}}function sE(){return Math.random().toString(36).substring(2,10)}function Pv(i,e){return{usr:i.state,key:i.key,idx:e,masked:i.mask?{pathname:i.pathname,search:i.search,hash:i.hash}:void 0}}function cp(i,e,t=null,r,a){return{pathname:typeof i=="string"?i:i.pathname,search:"",hash:"",...typeof e=="string"?Oo(e):e,state:t,key:e&&e.key||r||sE(),mask:a}}function Vl({pathname:i="/",search:e="",hash:t=""}){return e&&e!=="?"&&(i+=e.charAt(0)==="?"?e:"?"+e),t&&t!=="#"&&(i+=t.charAt(0)==="#"?t:"#"+t),i}function Oo(i){let e={};if(i){let t=i.indexOf("#");t>=0&&(e.hash=i.substring(t),i=i.substring(0,t));let r=i.indexOf("?");r>=0&&(e.search=i.substring(r),i=i.substring(0,r)),i&&(e.pathname=i)}return e}function aE(i,e,t,r={}){let{window:a=document.defaultView,v5Compat:l=!1}=r,c=a.history,h="POP",d=null,f=m();f==null&&(f=0,c.replaceState({...c.state,idx:f},""));function m(){return(c.state||{idx:null}).idx}function g(){h="POP";let y=m(),S=y==null?null:y-f;f=y,d&&d({action:h,location:b.location,delta:S})}function v(y,S){h="PUSH";let P=Av(y)?y:cp(b.location,y,S);f=m()+1;let L=Pv(P,f),R=b.createHref(P.mask||P);try{c.pushState(L,"",R)}catch(D){if(D instanceof DOMException&&D.name==="DataCloneError")throw D;a.location.assign(R)}l&&d&&d({action:h,location:b.location,delta:1})}function x(y,S){h="REPLACE";let P=Av(y)?y:cp(b.location,y,S);f=m();let L=Pv(P,f),R=b.createHref(P.mask||P);c.replaceState(L,"",R),l&&d&&d({action:h,location:b.location,delta:0})}function M(y){return oE(a,y)}let b={get action(){return h},get location(){return i(a,c)},listen(y){if(d)throw new Error("A history only accepts one active listener");return a.addEventListener(Cv,g),d=y,()=>{a.removeEventListener(Cv,g),d=null}},createHref(y){return e(a,y)},createURL:M,encodeLocation(y){let S=M(y);return{pathname:S.pathname,search:S.search,hash:S.hash}},push:v,replace:x,go(y){return c.go(y)}};return b}function oE(i,e,t=!1){let r="http://localhost";i&&(r=i.location.origin!=="null"?i.location.origin:i.location.href),nn(r,"No window.location.(origin|href) available to create URL");let a=typeof e=="string"?e:Vl(e);return a=a.replace(/ $/,"%20"),!t&&E_.test(a)&&(a=r+a),new URL(a,r)}function w_(i,e,t="/"){return lE(i,e,t,!1)}function lE(i,e,t,r,a){let l=typeof e=="string"?Oo(e):e,c=jr(l.pathname||"/",t);if(c==null)return null;let h=cE(i),d=null,f=yE(c);for(let m=0;d==null&&m<h.length;++m)d=_E(h[m],f,r);return d}function cE(i){let e=T_(i);return uE(e),e}function T_(i,e=[],t=[],r="",a=!1){let l=(c,h,d=a,f)=>{let m={relativePath:f===void 0?c.path||"":f,caseSensitive:c.caseSensitive===!0,childrenIndex:h,route:c};if(m.relativePath.startsWith("/")){if(!m.relativePath.startsWith(r)&&d)return;nn(m.relativePath.startsWith(r),`Absolute route path "${m.relativePath}" nested under path "${r}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`),m.relativePath=m.relativePath.slice(r.length)}let g=Ki([r,m.relativePath]),v=t.concat(m);c.children&&c.children.length>0&&(nn(c.index!==!0,`Index routes must not have child routes. Please remove all child routes from route path "${g}".`),T_(c.children,e,v,g,d)),!(c.path==null&&!c.index)&&e.push({path:g,score:vE(g,c.index),routesMeta:v.map((x,M)=>{let[b,y]=C_(x.relativePath,x.caseSensitive,M===v.length-1);return{...x,matcher:b,compiledParams:y}})})};return i.forEach((c,h)=>{var d;if(c.path===""||!((d=c.path)!=null&&d.includes("?")))l(c,h);else for(let f of b_(c.path))l(c,h,!0,f)}),e}function b_(i){let e=i.split("/");if(e.length===0)return[];let[t,...r]=e,a=t.endsWith("?"),l=t.replace(/\?$/,"");if(r.length===0)return a?[l,""]:[l];let c=b_(r.join("/")),h=[];return h.push(...c.map(d=>d===""?l:[l,d].join("/"))),a&&h.push(...c),h.map(d=>i.startsWith("/")&&d===""?"/":d)}function uE(i){i.sort((e,t)=>e.score!==t.score?t.score-e.score:xE(e.routesMeta.map(r=>r.childrenIndex),t.routesMeta.map(r=>r.childrenIndex)))}var hE=/^:[\w-]+$/,dE=3,fE=2,pE=1,mE=10,gE=-2,Nv=i=>i==="*";function vE(i,e){let t=i.split("/"),r=t.length;return t.some(Nv)&&(r+=gE),e&&(r+=fE),t.filter(a=>!Nv(a)).reduce((a,l)=>a+(hE.test(l)?dE:l===""?pE:mE),r)}function xE(i,e){return i.length===e.length&&i.slice(0,-1).every((r,a)=>r===e[a])?i[i.length-1]-e[e.length-1]:0}function _E(i,e,t=!1){let{routesMeta:r}=i,a={},l="/",c=[];for(let h=0;h<r.length;++h){let d=r[h],f=h===r.length-1,m=l==="/"?e:e.slice(l.length)||"/",g={path:d.relativePath,caseSensitive:d.caseSensitive,end:f},v=d.matcher&&d.compiledParams?R_(g,m,d.matcher,d.compiledParams):eh(g,m),x=d.route;if(!v&&f&&t&&!r[r.length-1].route.index&&(v=eh({path:d.relativePath,caseSensitive:d.caseSensitive,end:!1},m)),!v)return null;Object.assign(a,v.params),c.push({params:a,pathname:Ki([l,v.pathname]),pathnameBase:EE(Ki([l,v.pathnameBase])),route:x}),v.pathnameBase!=="/"&&(l=Ki([l,v.pathnameBase]))}return c}function eh(i,e){typeof i=="string"&&(i={path:i,caseSensitive:!1,end:!0});let[t,r]=C_(i.path,i.caseSensitive,i.end);return R_(i,e,t,r)}function R_(i,e,t,r){let a=e.match(t);if(!a)return null;let l=a[0],c=l.replace(/(.)\/+$/,"$1"),h=a.slice(1);return{params:r.reduce((f,{paramName:m,isOptional:g},v)=>{if(m==="*"){let M=h[v]||"";c=l.slice(0,l.length-M.length).replace(/(.)\/+$/,"$1")}const x=h[v];return g&&!x?f[m]=void 0:f[m]=(x||"").replace(/%2F/g,"/"),f},{}),pathname:l,pathnameBase:c,pattern:i}}function C_(i,e=!1,t=!0){Ii(i==="*"||!i.endsWith("*")||i.endsWith("/*"),`Route path "${i}" will be treated as if it were "${i.replace(/\*$/,"/*")}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${i.replace(/\*$/,"/*")}".`);let r=[],a="^"+i.replace(/\/*\*?$/,"").replace(/^\/*/,"/").replace(/[\\.*+^${}|()[\]]/g,"\\$&").replace(/\/:([\w-]+)(\?)?/g,(c,h,d,f,m)=>{if(r.push({paramName:h,isOptional:d!=null}),d){let g=m.charAt(f+c.length);return g&&g!=="/"?"/([^\\/]*)":"(?:/([^\\/]*))?"}return"/([^\\/]+)"}).replace(/\/([\w-]+)\?(\/|$)/g,"(/$1)?$2");return i.endsWith("*")?(r.push({paramName:"*"}),a+=i==="*"||i==="/*"?"(.*)$":"(?:\\/(.+)|\\/*)$"):t?a+="\\/*$":i!==""&&i!=="/"&&(a+="(?:(?=\\/|$))"),[new RegExp(a,e?void 0:"i"),r]}function yE(i){try{return i.split("/").map(e=>decodeURIComponent(e).replace(/\//g,"%2F")).join("/")}catch(e){return Ii(!1,`The URL path "${i}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${e}).`),i}}function jr(i,e){if(e==="/")return i;if(!i.toLowerCase().startsWith(e.toLowerCase()))return null;let t=e.endsWith("/")?e.length-1:e.length,r=i.charAt(t);return r&&r!=="/"?null:i.slice(t)||"/"}function SE(i,e="/"){let{pathname:t,search:r="",hash:a=""}=typeof i=="string"?Oo(i):i,l;return t?(t=A_(t),t.startsWith("/")?l=Lv(t.substring(1),"/"):l=Lv(t,e)):l=e,{pathname:l,search:wE(r),hash:TE(a)}}function Lv(i,e){let t=th(e).split("/");return i.split("/").forEach(a=>{a===".."?t.length>1&&t.pop():a!=="."&&t.push(a)}),t.length>1?t.join("/"):"/"}function rf(i,e,t,r){return`Cannot include a '${i}' character in a manually specified \`to.${e}\` field [${JSON.stringify(r)}].  Please separate it out to the \`to.${t}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`}function ME(i){return i.filter((e,t)=>t===0||e.route.path&&e.route.path.length>0)}function fm(i){let e=ME(i);return e.map((t,r)=>r===e.length-1?t.pathname:t.pathnameBase)}function hh(i,e,t,r=!1){let a;typeof i=="string"?a=Oo(i):(a={...i},nn(!a.pathname||!a.pathname.includes("?"),rf("?","pathname","search",a)),nn(!a.pathname||!a.pathname.includes("#"),rf("#","pathname","hash",a)),nn(!a.search||!a.search.includes("#"),rf("#","search","hash",a)));let l=i===""||a.pathname==="",c=l?"/":a.pathname,h;if(c==null)h=t;else{let g=e.length-1;if(!r&&c.startsWith("..")){let v=c.split("/");for(;v[0]==="..";)v.shift(),g-=1;a.pathname=v.join("/")}h=g>=0?e[g]:"/"}let d=SE(a,h),f=c&&c!=="/"&&c.endsWith("/"),m=(l||c===".")&&t.endsWith("/");return!d.pathname.endsWith("/")&&(f||m)&&(d.pathname+="/"),d}var A_=i=>i.replace(/[\\/]{2,}/g,"/"),Ki=i=>A_(i.join("/")),th=i=>i.replace(/\/+$/,""),EE=i=>th(i).replace(/^\/*/,"/"),wE=i=>!i||i==="?"?"":i.startsWith("?")?i:"?"+i,TE=i=>!i||i==="#"?"":i.startsWith("#")?i:"#"+i,bE=class{constructor(i,e,t,r=!1){this.status=i,this.statusText=e||"",this.internal=r,t instanceof Error?(this.data=t.toString(),this.error=t):this.data=t}};function RE(i){return i!=null&&typeof i.status=="number"&&typeof i.statusText=="string"&&typeof i.internal=="boolean"&&"data"in i}function CE(i){let e=i.map(t=>t.route.path).filter(Boolean);return Ki(e)||"/"}var P_=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";function N_(i,e){let t=i;if(typeof t!="string"||!dm.test(t))return{absoluteURL:void 0,isExternal:!1,to:t};let r=t,a=!1;if(P_)try{let l=new URL(window.location.href),c=E_.test(t)?new URL(iE(t,l.protocol)):new URL(t),h=jr(c.pathname,e);c.origin===l.origin&&h!=null?t=h+c.search+c.hash:a=!0}catch{Ii(!1,`<Link to="${t}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`)}return{absoluteURL:r,isExternal:a,to:t}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");var L_=["POST","PUT","PATCH","DELETE"];new Set(L_);var AE=["GET",...L_];new Set(AE);var PE=["about:","blob:","chrome:","chrome-untrusted:","content:","data:","devtools:","file:","filesystem:","javascript:"];function NE(i){try{return PE.includes(new URL(i).protocol)}catch{return!1}}var ko=B.createContext(null);ko.displayName="DataRouter";var dh=B.createContext(null);dh.displayName="DataRouterState";var D_=B.createContext(!1);function LE(){return B.useContext(D_)}var I_=B.createContext({isTransitioning:!1});I_.displayName="ViewTransition";var DE=B.createContext(new Map);DE.displayName="Fetchers";var IE=B.createContext(null);IE.displayName="Await";var Mi=B.createContext(null);Mi.displayName="Navigation";var Jl=B.createContext(null);Jl.displayName="Location";var Zi=B.createContext({outlet:null,matches:[],isDataRoute:!1});Zi.displayName="Route";var pm=B.createContext(null);pm.displayName="RouteError";var U_="REACT_ROUTER_ERROR",UE="REDIRECT",FE="ROUTE_ERROR_RESPONSE";function OE(i){if(i.startsWith(`${U_}:${UE}:{`))try{let e=JSON.parse(i.slice(28));if(typeof e=="object"&&e&&typeof e.status=="number"&&typeof e.statusText=="string"&&typeof e.location=="string"&&typeof e.reloadDocument=="boolean"&&typeof e.replace=="boolean")return e}catch{}}function kE(i){if(i.startsWith(`${U_}:${FE}:{`))try{let e=JSON.parse(i.slice(40));if(typeof e=="object"&&e&&typeof e.status=="number"&&typeof e.statusText=="string")return new bE(e.status,e.statusText,e.data)}catch{}}function zE(i,{relative:e}={}){nn(zo(),"useHref() may be used only in the context of a <Router> component.");let{basename:t,navigator:r}=B.useContext(Mi),{hash:a,pathname:l,search:c}=ec(i,{relative:e}),h=l;return t!=="/"&&(h=l==="/"?t:Ki([t,l])),r.createHref({pathname:h,search:c,hash:a})}function zo(){return B.useContext(Jl)!=null}function Ji(){return nn(zo(),"useLocation() may be used only in the context of a <Router> component."),B.useContext(Jl).location}var F_="You should call navigate() in a React.useEffect(), not when your component is first rendered.";function O_(i){B.useContext(Mi).static||B.useLayoutEffect(i)}function mm(){let{isDataRoute:i}=B.useContext(Zi);return i?e1():BE()}function BE(){nn(zo(),"useNavigate() may be used only in the context of a <Router> component.");let i=B.useContext(ko),{basename:e,navigator:t}=B.useContext(Mi),{matches:r}=B.useContext(Zi),{pathname:a}=Ji(),l=JSON.stringify(fm(r)),c=B.useRef(!1);return O_(()=>{c.current=!0}),B.useCallback((d,f={})=>{if(Ii(c.current,F_),!c.current)return;if(typeof d=="number"){t.go(d);return}let m=hh(d,JSON.parse(l),a,f.relative==="path");i==null&&e!=="/"&&(m.pathname=m.pathname==="/"?e:Ki([e,m.pathname])),(f.replace?t.replace:t.push)(m,f.state,f)},[e,t,l,a,i])}var HE=B.createContext(null);function VE(i){let e=B.useContext(Zi).outlet;return B.useMemo(()=>e&&B.createElement(HE.Provider,{value:i},e),[e,i])}function ec(i,{relative:e}={}){let{matches:t}=B.useContext(Zi),{pathname:r}=Ji(),a=JSON.stringify(fm(t));return B.useMemo(()=>hh(i,JSON.parse(a),r,e==="path"),[i,a,r,e])}function GE(i,e){return k_(i,e)}function k_(i,e,t){var y;nn(zo(),"useRoutes() may be used only in the context of a <Router> component.");let{navigator:r}=B.useContext(Mi),{matches:a}=B.useContext(Zi),l=a[a.length-1],c=l?l.params:{},h=l?l.pathname:"/",d=l?l.pathnameBase:"/",f=l&&l.route;{let S=f&&f.path||"";B_(h,!f||S.endsWith("*")||S.endsWith("*?"),`You rendered descendant <Routes> (or called \`useRoutes()\`) at "${h}" (under <Route path="${S}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${S}"> to <Route path="${S==="/"?"*":`${S}/*`}">.`)}let m=Ji(),g;if(e){let S=typeof e=="string"?Oo(e):e;nn(d==="/"||((y=S.pathname)==null?void 0:y.startsWith(d)),`When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${d}" but pathname "${S.pathname}" was given in the \`location\` prop.`),g=S}else g=m;let v=g.pathname||"/",x=v;if(d!=="/"){let S=d.replace(/^\//,"").split("/");x="/"+v.replace(/^\//,"").split("/").slice(S.length).join("/")}let M=t&&t.state.matches.length?t.state.matches.map(S=>Object.assign(S,{route:t.manifest[S.route.id]||S.route})):w_(i,{pathname:x});Ii(f||M!=null,`No routes matched location "${g.pathname}${g.search}${g.hash}" `),Ii(M==null||M[M.length-1].route.element!==void 0||M[M.length-1].route.Component!==void 0||M[M.length-1].route.lazy!==void 0,`Matched leaf route at location "${g.pathname}${g.search}${g.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`);let b=qE(M&&M.map(S=>Object.assign({},S,{params:Object.assign({},c,S.params),pathname:Ki([d,r.encodeLocation?r.encodeLocation(S.pathname.replace(/%/g,"%25").replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:S.pathname]),pathnameBase:S.pathnameBase==="/"?d:Ki([d,r.encodeLocation?r.encodeLocation(S.pathnameBase.replace(/%/g,"%25").replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:S.pathnameBase])})),a,t);return e&&b?B.createElement(Jl.Provider,{value:{location:{pathname:"/",search:"",hash:"",state:null,key:"default",mask:void 0,...g},navigationType:"POP"}},b):b}function WE(){let i=JE(),e=RE(i)?`${i.status} ${i.statusText}`:i instanceof Error?i.message:JSON.stringify(i),t=i instanceof Error?i.stack:null,r="rgba(200,200,200, 0.5)",a={padding:"0.5rem",backgroundColor:r},l={padding:"2px 4px",backgroundColor:r},c=null;return console.error("Error handled by React Router default ErrorBoundary:",i),c=B.createElement(B.Fragment,null,B.createElement("p",null,"💿 Hey developer 👋"),B.createElement("p",null,"You can provide a way better UX than this when your app throws errors by providing your own ",B.createElement("code",{style:l},"ErrorBoundary")," or"," ",B.createElement("code",{style:l},"errorElement")," prop on your route.")),B.createElement(B.Fragment,null,B.createElement("h2",null,"Unexpected Application Error!"),B.createElement("h3",{style:{fontStyle:"italic"}},e),t?B.createElement("pre",{style:a},t):null,c)}var jE=B.createElement(WE,null),z_=class extends B.Component{constructor(i){super(i),this.state={location:i.location,revalidation:i.revalidation,error:i.error}}static getDerivedStateFromError(i){return{error:i}}static getDerivedStateFromProps(i,e){return e.location!==i.location||e.revalidation!=="idle"&&i.revalidation==="idle"?{error:i.error,location:i.location,revalidation:i.revalidation}:{error:i.error!==void 0?i.error:e.error,location:e.location,revalidation:i.revalidation||e.revalidation}}componentDidCatch(i,e){this.props.onError?this.props.onError(i,e):console.error("React Router caught the following error during render",i)}render(){let i=this.state.error;if(this.context&&typeof i=="object"&&i&&"digest"in i&&typeof i.digest=="string"){const t=kE(i.digest);t&&(i=t)}let e=i!==void 0?B.createElement(Zi.Provider,{value:this.props.routeContext},B.createElement(pm.Provider,{value:i,children:this.props.component})):this.props.children;return this.context?B.createElement(XE,{error:i},e):e}};z_.contextType=D_;var sf=new WeakMap;function XE({children:i,error:e}){let{basename:t}=B.useContext(Mi);if(typeof e=="object"&&e&&"digest"in e&&typeof e.digest=="string"){let r=OE(e.digest);if(r){let a=sf.get(e);if(a)throw a;let l=N_(r.location,t),c=l.absoluteURL||l.to;if(NE(c))throw new Error("Invalid redirect location");if(P_&&!sf.get(e))if(l.isExternal||r.reloadDocument)window.location.href=c;else{const h=Promise.resolve().then(()=>window.__reactRouterDataRouter.navigate(l.to,{replace:r.replace}));throw sf.set(e,h),h}return B.createElement("meta",{httpEquiv:"refresh",content:`0;url=${c}`})}}return i}function $E({routeContext:i,match:e,children:t}){let r=B.useContext(ko);return r&&r.static&&r.staticContext&&(e.route.errorElement||e.route.ErrorBoundary)&&(r.staticContext._deepestRenderedBoundaryId=e.route.id),B.createElement(Zi.Provider,{value:i},t)}function qE(i,e=[],t){let r=t==null?void 0:t.state;if(i==null){if(!r)return null;if(r.errors)i=r.matches;else if(e.length===0&&!r.initialized&&r.matches.length>0)i=r.matches;else return null}let a=i,l=r==null?void 0:r.errors;if(l!=null){let m=a.findIndex(g=>g.route.id&&(l==null?void 0:l[g.route.id])!==void 0);nn(m>=0,`Could not find a matching route for errors on route IDs: ${Object.keys(l).join(",")}`),a=a.slice(0,Math.min(a.length,m+1))}let c=!1,h=-1;if(t&&r){c=r.renderFallback;for(let m=0;m<a.length;m++){let g=a[m];if((g.route.HydrateFallback||g.route.hydrateFallbackElement)&&(h=m),g.route.id){let{loaderData:v,errors:x}=r,M=g.route.loader&&!v.hasOwnProperty(g.route.id)&&(!x||x[g.route.id]===void 0);if(g.route.lazy||M){t.isStatic&&(c=!0),h>=0?a=a.slice(0,h+1):a=[a[0]];break}}}}let d=t==null?void 0:t.onError,f=r&&d?(m,g)=>{var v,x;d(m,{location:r.location,params:((x=(v=r.matches)==null?void 0:v[0])==null?void 0:x.params)??{},pattern:CE(r.matches),errorInfo:g})}:void 0;return a.reduceRight((m,g,v)=>{let x,M=!1,b=null,y=null;r&&(x=l&&g.route.id?l[g.route.id]:void 0,b=g.route.errorElement||jE,c&&(h<0&&v===0?(B_("route-fallback",!1,"No `HydrateFallback` element provided to render during initial hydration"),M=!0,y=null):h===v&&(M=!0,y=g.route.hydrateFallbackElement||null)));let S=e.concat(a.slice(0,v+1)),P=()=>{let L;return x?L=b:M?L=y:g.route.Component?L=B.createElement(g.route.Component,null):g.route.element?L=g.route.element:L=m,B.createElement($E,{match:g,routeContext:{outlet:m,matches:S,isDataRoute:r!=null},children:L})};return r&&(g.route.ErrorBoundary||g.route.errorElement||v===0)?B.createElement(z_,{location:r.location,revalidation:r.revalidation,component:b,error:x,children:P(),routeContext:{outlet:null,matches:S,isDataRoute:!0},onError:f}):P()},null)}function gm(i){return`${i} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function YE(i){let e=B.useContext(ko);return nn(e,gm(i)),e}function KE(i){let e=B.useContext(dh);return nn(e,gm(i)),e}function QE(i){let e=B.useContext(Zi);return nn(e,gm(i)),e}function vm(i){let e=QE(i),t=e.matches[e.matches.length-1];return nn(t.route.id,`${i} can only be used on routes that contain a unique "id"`),t.route.id}function ZE(){return vm("useRouteId")}function JE(){var r;let i=B.useContext(pm),e=KE("useRouteError"),t=vm("useRouteError");return i!==void 0?i:(r=e.errors)==null?void 0:r[t]}function e1(){let{router:i}=YE("useNavigate"),e=vm("useNavigate"),t=B.useRef(!1);return O_(()=>{t.current=!0}),B.useCallback(async(a,l={})=>{Ii(t.current,F_),t.current&&(typeof a=="number"?await i.navigate(a):await i.navigate(a,{fromRouteId:e,...l}))},[i,e])}var Dv={};function B_(i,e,t){!e&&!Dv[i]&&(Dv[i]=!0,Ii(!1,t))}B.memo(t1);function t1({routes:i,manifest:e,future:t,state:r,isStatic:a,onError:l}){return k_(i,void 0,{manifest:e,state:r,isStatic:a,onError:l})}function af({to:i,replace:e,state:t,relative:r}){nn(zo(),"<Navigate> may be used only in the context of a <Router> component.");let{static:a}=B.useContext(Mi);Ii(!a,"<Navigate> must not be used on the initial render in a <StaticRouter>. This is a no-op, but you should modify your code so the <Navigate> is only ever rendered in response to some user interaction or state change.");let{matches:l}=B.useContext(Zi),{pathname:c}=Ji(),h=mm(),d=hh(i,fm(l),c,r==="path"),f=JSON.stringify(d);return B.useEffect(()=>{h(JSON.parse(f),{replace:e,state:t,relative:r})},[h,f,r,e,t]),null}function n1(i){return VE(i.context)}function Xi(i){nn(!1,"A <Route> is only ever to be used as the child of <Routes> element, never rendered directly. Please wrap your <Route> in a <Routes>.")}function i1({basename:i="/",children:e=null,location:t,navigationType:r="POP",navigator:a,static:l=!1,useTransitions:c}){nn(!zo(),"You cannot render a <Router> inside another <Router>. You should never have more than one in your app.");let h=i.replace(/^\/*/,"/"),d=B.useMemo(()=>({basename:h,navigator:a,static:l,useTransitions:c,future:{}}),[h,a,l,c]);typeof t=="string"&&(t=Oo(t));let{pathname:f="/",search:m="",hash:g="",state:v=null,key:x="default",mask:M}=t,b=B.useMemo(()=>{let y=jr(f,h);return y==null?null:{location:{pathname:y,search:m,hash:g,state:v,key:x,mask:M},navigationType:r}},[h,f,m,g,v,x,r,M]);return Ii(b!=null,`<Router basename="${h}"> is not able to match the URL "${f}${m}${g}" because it does not start with the basename, so the <Router> won't render anything.`),b==null?null:B.createElement(Mi.Provider,{value:d},B.createElement(Jl.Provider,{children:e,value:b}))}function r1({children:i,location:e}){return GE(up(i),e)}function up(i,e=[]){let t=[];return B.Children.forEach(i,(r,a)=>{if(!B.isValidElement(r))return;let l=[...e,a];if(r.type===B.Fragment){t.push.apply(t,up(r.props.children,l));return}nn(r.type===Xi,`[${typeof r.type=="string"?r.type:r.type.name}] is not a <Route> component. All component children of <Routes> must be a <Route> or <React.Fragment>`),nn(!r.props.index||!r.props.children,"An index route cannot have child routes.");let c={id:r.props.id||l.join("-"),caseSensitive:r.props.caseSensitive,element:r.props.element,Component:r.props.Component,index:r.props.index,path:r.props.path,middleware:r.props.middleware,loader:r.props.loader,action:r.props.action,hydrateFallbackElement:r.props.hydrateFallbackElement,HydrateFallback:r.props.HydrateFallback,errorElement:r.props.errorElement,ErrorBoundary:r.props.ErrorBoundary,hasErrorBoundary:r.props.hasErrorBoundary===!0||r.props.ErrorBoundary!=null||r.props.errorElement!=null,shouldRevalidate:r.props.shouldRevalidate,handle:r.props.handle,lazy:r.props.lazy};r.props.children&&(c.children=up(r.props.children,l)),t.push(c)}),t}var Vu="get",Gu="application/x-www-form-urlencoded";function fh(i){return typeof HTMLElement<"u"&&i instanceof HTMLElement}function s1(i){return fh(i)&&i.tagName.toLowerCase()==="button"}function a1(i){return fh(i)&&i.tagName.toLowerCase()==="form"}function o1(i){return fh(i)&&i.tagName.toLowerCase()==="input"}function l1(i){return!!(i.metaKey||i.altKey||i.ctrlKey||i.shiftKey)}function c1(i,e){return i.button===0&&(!e||e==="_self")&&!l1(i)}function hp(i=""){return new URLSearchParams(typeof i=="string"||Array.isArray(i)||i instanceof URLSearchParams?i:Object.keys(i).reduce((e,t)=>{let r=i[t];return e.concat(Array.isArray(r)?r.map(a=>[t,a]):[[t,r]])},[]))}function u1(i,e){let t=hp(i);return e&&e.forEach((r,a)=>{t.has(a)||e.getAll(a).forEach(l=>{t.append(a,l)})}),t}var hu=null;function h1(){if(hu===null)try{new FormData(document.createElement("form"),0),hu=!1}catch{hu=!0}return hu}var d1=new Set(["application/x-www-form-urlencoded","multipart/form-data","text/plain"]);function of(i){return i!=null&&!d1.has(i)?(Ii(!1,`"${i}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${Gu}"`),null):i}function f1(i,e){let t,r,a,l,c;if(a1(i)){let h=i.getAttribute("action");r=h?jr(h,e):null,t=i.getAttribute("method")||Vu,a=of(i.getAttribute("enctype"))||Gu,l=new FormData(i)}else if(s1(i)||o1(i)&&(i.type==="submit"||i.type==="image")){let h=i.form;if(h==null)throw new Error('Cannot submit a <button> or <input type="submit"> without a <form>');let d=i.getAttribute("formaction")||h.getAttribute("action");if(r=d?jr(d,e):null,t=i.getAttribute("formmethod")||h.getAttribute("method")||Vu,a=of(i.getAttribute("formenctype"))||of(h.getAttribute("enctype"))||Gu,l=new FormData(h,i),!h1()){let{name:f,type:m,value:g}=i;if(m==="image"){let v=f?`${f}.`:"";l.append(`${v}x`,"0"),l.append(`${v}y`,"0")}else f&&l.append(f,g)}}else{if(fh(i))throw new Error('Cannot submit element that is not <form>, <button>, or <input type="submit|image">');t=Vu,r=null,a=Gu,c=i}return l&&a==="text/plain"&&(c=l,l=void 0),{action:r,method:t.toLowerCase(),encType:a,formData:l,body:c}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");function xm(i,e){if(i===!1||i===null||typeof i>"u")throw new Error(e)}function H_(i,e,t,r){let a=typeof i=="string"?new URL(i,typeof window>"u"?"server://singlefetch/":window.location.origin):i;return t?a.pathname.endsWith("/")?a.pathname=`${a.pathname}_.${r}`:a.pathname=`${a.pathname}.${r}`:a.pathname==="/"?a.pathname=`_root.${r}`:e&&jr(a.pathname,e)==="/"?a.pathname=`${th(e)}/_root.${r}`:a.pathname=`${th(a.pathname)}.${r}`,a}async function p1(i,e){if(i.id in e)return e[i.id];try{let t=await import(i.module);return e[i.id]=t,t}catch(t){return console.error(`Error loading route module \`${i.module}\`, reloading page...`),console.error(t),window.__reactRouterContext&&window.__reactRouterContext.isSpaMode,window.location.reload(),new Promise(()=>{})}}function m1(i){return i==null?!1:i.href==null?i.rel==="preload"&&typeof i.imageSrcSet=="string"&&typeof i.imageSizes=="string":typeof i.rel=="string"&&typeof i.href=="string"}async function g1(i,e,t){let r=await Promise.all(i.map(async a=>{let l=e.routes[a.route.id];if(l){let c=await p1(l,t);return c.links?c.links():[]}return[]}));return y1(r.flat(1).filter(m1).filter(a=>a.rel==="stylesheet"||a.rel==="preload").map(a=>a.rel==="stylesheet"?{...a,rel:"prefetch",as:"style"}:{...a,rel:"prefetch"}))}function Iv(i,e,t,r,a,l){let c=(d,f)=>t[f]?d.route.id!==t[f].route.id:!0,h=(d,f)=>{var m;return t[f].pathname!==d.pathname||((m=t[f].route.path)==null?void 0:m.endsWith("*"))&&t[f].params["*"]!==d.params["*"]};return l==="assets"?e.filter((d,f)=>c(d,f)||h(d,f)):l==="data"?e.filter((d,f)=>{var g;let m=r.routes[d.route.id];if(!m||!m.hasLoader)return!1;if(c(d,f)||h(d,f))return!0;if(d.route.shouldRevalidate){let v=d.route.shouldRevalidate({currentUrl:new URL(a.pathname+a.search+a.hash,window.origin),currentParams:((g=t[0])==null?void 0:g.params)||{},nextUrl:new URL(i,window.origin),nextParams:d.params,defaultShouldRevalidate:!0});if(typeof v=="boolean")return v}return!0}):[]}function v1(i,e,{includeHydrateFallback:t}={}){return x1(i.map(r=>{let a=e.routes[r.route.id];if(!a)return[];let l=[a.module];return a.clientActionModule&&(l=l.concat(a.clientActionModule)),a.clientLoaderModule&&(l=l.concat(a.clientLoaderModule)),t&&a.hydrateFallbackModule&&(l=l.concat(a.hydrateFallbackModule)),a.imports&&(l=l.concat(a.imports)),l}).flat(1))}function x1(i){return[...new Set(i)]}function _1(i){let e={},t=Object.keys(i).sort();for(let r of t)e[r]=i[r];return e}function y1(i,e){let t=new Set;return new Set(e),i.reduce((r,a)=>{let l=JSON.stringify(_1(a));return t.has(l)||(t.add(l),r.push({key:l,link:a})),r},[])}function _m(){let i=B.useContext(ko);return xm(i,"You must render this element inside a <DataRouterContext.Provider> element"),i}function S1(){let i=B.useContext(dh);return xm(i,"You must render this element inside a <DataRouterStateContext.Provider> element"),i}var ym=B.createContext(void 0);ym.displayName="FrameworkContext";function ph(){let i=B.useContext(ym);return xm(i,"You must render this element inside a <HydratedRouter> element"),i}function M1(i,e){let t=B.useContext(ym),[r,a]=B.useState(!1),[l,c]=B.useState(!1),{onFocus:h,onBlur:d,onMouseEnter:f,onMouseLeave:m,onTouchStart:g}=e,v=B.useRef(null);B.useEffect(()=>{if(i==="render"&&c(!0),i==="viewport"){let b=S=>{S.forEach(P=>{c(P.isIntersecting)})},y=new IntersectionObserver(b,{threshold:.5});return v.current&&y.observe(v.current),()=>{y.disconnect()}}},[i]),B.useEffect(()=>{if(r){let b=setTimeout(()=>{c(!0)},100);return()=>{clearTimeout(b)}}},[r]);let x=()=>{a(!0)},M=()=>{a(!1),c(!1)};return t?i!=="intent"?[l,v,{}]:[l,v,{onFocus:Tl(h,x),onBlur:Tl(d,M),onMouseEnter:Tl(f,x),onMouseLeave:Tl(m,M),onTouchStart:Tl(g,x)}]:[!1,v,{}]}function Tl(i,e){return t=>{i&&i(t),t.defaultPrevented||e(t)}}function E1({page:i,...e}){let t=LE(),{nonce:r}=ph(),{router:a}=_m(),l=B.useMemo(()=>w_(a.routes,i,a.basename),[a.routes,i,a.basename]);return l?(e.nonce==null&&r&&(e={...e,nonce:r}),t?B.createElement(T1,{page:i,matches:l,...e}):B.createElement(b1,{page:i,matches:l,...e})):null}function w1(i){let{manifest:e,routeModules:t}=ph(),[r,a]=B.useState([]);return B.useEffect(()=>{let l=!1;return g1(i,e,t).then(c=>{l||a(c)}),()=>{l=!0}},[i,e,t]),r}function T1({page:i,matches:e,...t}){let r=Ji(),{future:a}=ph(),{basename:l}=_m(),c=B.useMemo(()=>{if(i===r.pathname+r.search+r.hash)return[];let h=H_(i,l,a.v8_trailingSlashAwareDataRequests,"rsc"),d=!1,f=[];for(let m of e)typeof m.route.shouldRevalidate=="function"?d=!0:f.push(m.route.id);return d&&f.length>0&&h.searchParams.set("_routes",f.join(",")),[h.pathname+h.search]},[l,a.v8_trailingSlashAwareDataRequests,i,r,e]);return B.createElement(B.Fragment,null,c.map(h=>B.createElement("link",{key:h,rel:"prefetch",as:"fetch",href:h,...t})))}function b1({page:i,matches:e,...t}){let r=Ji(),{future:a,manifest:l,routeModules:c}=ph(),{basename:h}=_m(),{loaderData:d,matches:f}=S1(),m=B.useMemo(()=>Iv(i,e,f,l,r,"data"),[i,e,f,l,r]),g=B.useMemo(()=>Iv(i,e,f,l,r,"assets"),[i,e,f,l,r]),v=B.useMemo(()=>{if(i===r.pathname+r.search+r.hash)return[];let b=new Set,y=!1;if(e.forEach(P=>{var R;let L=l.routes[P.route.id];!L||!L.hasLoader||(!m.some(D=>D.route.id===P.route.id)&&P.route.id in d&&((R=c[P.route.id])!=null&&R.shouldRevalidate)||L.hasClientLoader?y=!0:b.add(P.route.id))}),b.size===0)return[];let S=H_(i,h,a.v8_trailingSlashAwareDataRequests,"data");return y&&b.size>0&&S.searchParams.set("_routes",e.filter(P=>b.has(P.route.id)).map(P=>P.route.id).join(",")),[S.pathname+S.search]},[h,a.v8_trailingSlashAwareDataRequests,d,r,l,m,e,i,c]),x=B.useMemo(()=>v1(g,l),[g,l]),M=w1(g);return B.createElement(B.Fragment,null,v.map(b=>B.createElement("link",{key:b,rel:"prefetch",as:"fetch",href:b,...t})),x.map(b=>B.createElement("link",{key:b,rel:"modulepreload",href:b,...t})),M.map(({key:b,link:y})=>B.createElement("link",{key:b,nonce:t.nonce,...y,crossOrigin:y.crossOrigin??t.crossOrigin})))}function R1(...i){return e=>{i.forEach(t=>{typeof t=="function"?t(e):t!=null&&(t.current=e)})}}var C1=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";try{C1&&(window.__reactRouterVersion="7.18.0")}catch{}function A1({basename:i,children:e,useTransitions:t,window:r}){let a=B.useRef();a.current==null&&(a.current=rE({window:r,v5Compat:!0}));let l=a.current,[c,h]=B.useState({action:l.action,location:l.location}),d=B.useCallback(f=>{t===!1?h(f):B.startTransition(()=>h(f))},[t]);return B.useLayoutEffect(()=>l.listen(d),[l,d]),B.createElement(i1,{basename:i,children:e,location:c.location,navigationType:c.action,navigator:l,useTransitions:t})}var V_=B.forwardRef(function({onClick:e,discover:t="render",prefetch:r="none",relative:a,reloadDocument:l,replace:c,mask:h,state:d,target:f,to:m,preventScrollReset:g,viewTransition:v,defaultShouldRevalidate:x,...M},b){let{basename:y,navigator:S,useTransitions:P}=B.useContext(Mi),L=typeof m=="string"&&dm.test(m),R=N_(m,y);m=R.to;let D=zE(m,{relative:a}),N=Ji(),F=null;if(h){let O=hh(h,[],N.mask?N.mask.pathname:"/",!0);y!=="/"&&(O.pathname=O.pathname==="/"?y:Ki([y,O.pathname])),F=S.createHref(O)}let[w,I,G]=M1(r,M),V=L1(m,{replace:c,mask:h,state:d,target:f,preventScrollReset:g,relative:a,viewTransition:v,defaultShouldRevalidate:x,useTransitions:P});function Y(O){e&&e(O),O.defaultPrevented||V(O)}let me=!(R.isExternal||l),de=B.createElement("a",{...M,...G,href:(me?F:void 0)||R.absoluteURL||D,onClick:me?Y:e,ref:R1(b,I),target:f,"data-discover":!L&&t==="render"?"true":void 0});return w&&!L?B.createElement(B.Fragment,null,de,B.createElement(E1,{page:D})):de});V_.displayName="Link";var fo=B.forwardRef(function({"aria-current":e="page",caseSensitive:t=!1,className:r="",end:a=!1,style:l,to:c,viewTransition:h,children:d,...f},m){let g=ec(c,{relative:f.relative}),v=Ji(),x=B.useContext(dh),{navigator:M,basename:b}=B.useContext(Mi),y=x!=null&&k1(g)&&h===!0,S=M.encodeLocation?M.encodeLocation(g).pathname:g.pathname,P=v.pathname,L=x&&x.navigation&&x.navigation.location?x.navigation.location.pathname:null;t||(P=P.toLowerCase(),L=L?L.toLowerCase():null,S=S.toLowerCase()),L&&b&&(L=jr(L,b)||L);const R=S!=="/"&&S.endsWith("/")?S.length-1:S.length;let D=P===S||!a&&P.startsWith(S)&&P.charAt(R)==="/",N=L!=null&&(L===S||!a&&L.startsWith(S)&&L.charAt(S.length)==="/"),F={isActive:D,isPending:N,isTransitioning:y},w=D?e:void 0,I;typeof r=="function"?I=r(F):I=[r,D?"active":null,N?"pending":null,y?"transitioning":null].filter(Boolean).join(" ");let G=typeof l=="function"?l(F):l;return B.createElement(V_,{...f,"aria-current":w,className:I,ref:m,style:G,to:c,viewTransition:h},typeof d=="function"?d(F):d)});fo.displayName="NavLink";var P1=B.forwardRef(({discover:i="render",fetcherKey:e,navigate:t,reloadDocument:r,replace:a,state:l,method:c=Vu,action:h,onSubmit:d,relative:f,preventScrollReset:m,viewTransition:g,defaultShouldRevalidate:v,...x},M)=>{let{useTransitions:b}=B.useContext(Mi),y=F1(),S=O1(h,{relative:f}),P=c.toLowerCase()==="get"?"get":"post",L=typeof h=="string"&&dm.test(h),R=D=>{if(d&&d(D),D.defaultPrevented)return;D.preventDefault();let N=D.nativeEvent.submitter,F=(N==null?void 0:N.getAttribute("formmethod"))||c,w=()=>y(N||D.currentTarget,{fetcherKey:e,method:F,navigate:t,replace:a,state:l,relative:f,preventScrollReset:m,viewTransition:g,defaultShouldRevalidate:v});b&&t!==!1?B.startTransition(()=>w()):w()};return B.createElement("form",{ref:M,method:P,action:S,onSubmit:r?d:R,...x,"data-discover":!L&&i==="render"?"true":void 0})});P1.displayName="Form";function N1(i){return`${i} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function G_(i){let e=B.useContext(ko);return nn(e,N1(i)),e}function L1(i,{target:e,replace:t,mask:r,state:a,preventScrollReset:l,relative:c,viewTransition:h,defaultShouldRevalidate:d,useTransitions:f}={}){let m=mm(),g=Ji(),v=ec(i,{relative:c});return B.useCallback(x=>{if(c1(x,e)){x.preventDefault();let M=t!==void 0?t:Vl(g)===Vl(v),b=()=>m(i,{replace:M,mask:r,state:a,preventScrollReset:l,relative:c,viewTransition:h,defaultShouldRevalidate:d});f?B.startTransition(()=>b()):b()}},[g,m,v,t,r,a,e,i,l,c,h,d,f])}function D1(i){Ii(typeof URLSearchParams<"u","You cannot use the `useSearchParams` hook in a browser that does not support the URLSearchParams API. If you need to support Internet Explorer 11, we recommend you load a polyfill such as https://github.com/ungap/url-search-params.");let e=B.useRef(hp(i)),t=B.useRef(!1),r=Ji(),a=B.useMemo(()=>u1(r.search,t.current?null:e.current),[r.search]),l=mm(),c=B.useCallback((h,d)=>{const f=hp(typeof h=="function"?h(new URLSearchParams(a)):h);t.current=!0,l("?"+f,d)},[l,a]);return[a,c]}var I1=0,U1=()=>`__${String(++I1)}__`;function F1(){let{router:i}=G_("useSubmit"),{basename:e}=B.useContext(Mi),t=ZE(),r=i.fetch,a=i.navigate;return B.useCallback(async(l,c={})=>{let{action:h,method:d,encType:f,formData:m,body:g}=f1(l,e);if(c.navigate===!1){let v=c.fetcherKey||U1();await r(v,t,c.action||h,{defaultShouldRevalidate:c.defaultShouldRevalidate,preventScrollReset:c.preventScrollReset,formData:m,body:g,formMethod:c.method||d,formEncType:c.encType||f,flushSync:c.flushSync})}else await a(c.action||h,{defaultShouldRevalidate:c.defaultShouldRevalidate,preventScrollReset:c.preventScrollReset,formData:m,body:g,formMethod:c.method||d,formEncType:c.encType||f,replace:c.replace,state:c.state,fromRouteId:t,flushSync:c.flushSync,viewTransition:c.viewTransition})},[r,a,e,t])}function O1(i,{relative:e}={}){let{basename:t}=B.useContext(Mi),r=B.useContext(Zi);nn(r,"useFormAction must be used inside a RouteContext");let[a]=r.matches.slice(-1),l={...ec(i||".",{relative:e})},c=Ji();if(i==null){l.search=c.search;let h=new URLSearchParams(l.search),d=h.getAll("index");if(d.some(m=>m==="")){h.delete("index"),d.filter(g=>g).forEach(g=>h.append("index",g));let m=h.toString();l.search=m?`?${m}`:""}}return(!i||i===".")&&a.route.index&&(l.search=l.search?l.search.replace(/^\?/,"?index&"):"?index"),t!=="/"&&(l.pathname=l.pathname==="/"?t:Ki([t,l.pathname])),Vl(l)}function k1(i,{relative:e}={}){let t=B.useContext(I_);nn(t!=null,"`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?");let{basename:r}=G_("useViewTransitionState"),a=ec(i,{relative:e});if(!t.isTransitioning)return!1;let l=jr(t.currentLocation.pathname,r)||t.currentLocation.pathname,c=jr(t.nextLocation.pathname,r)||t.nextLocation.pathname;return eh(a.pathname,c)!=null||eh(a.pathname,l)!=null}/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z1=i=>i.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),W_=(...i)=>i.filter((e,t,r)=>!!e&&e.trim()!==""&&r.indexOf(e)===t).join(" ").trim();/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var B1={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H1=B.forwardRef(({color:i="currentColor",size:e=24,strokeWidth:t=2,absoluteStrokeWidth:r,className:a="",children:l,iconNode:c,...h},d)=>B.createElement("svg",{ref:d,...B1,width:e,height:e,stroke:i,strokeWidth:r?Number(t)*24/Number(e):t,className:W_("lucide",a),...h},[...c.map(([f,m])=>B.createElement(f,m)),...Array.isArray(l)?l:[l]]));/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ot=(i,e)=>{const t=B.forwardRef(({className:r,...a},l)=>B.createElement(H1,{ref:l,iconNode:e,className:W_(`lucide-${z1(i)}`,r),...a}));return t.displayName=`${i}`,t};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V1=Ot("ArchiveRestore",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h2",key:"tvwodi"}],["path",{d:"M20 8v11a2 2 0 0 1-2 2h-2",key:"1gkqxj"}],["path",{d:"m9 15 3-3 3 3",key:"1pd0qc"}],["path",{d:"M12 12v9",key:"192myk"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G1=Ot("Archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W1=Ot("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j1=Ot("Box",[["path",{d:"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",key:"hh9hay"}],["path",{d:"m3.3 7 8.7 5 8.7-5",key:"g66t2b"}],["path",{d:"M12 22V12",key:"d0xqtd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X1=Ot("Boxes",[["path",{d:"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",key:"lc1i9w"}],["path",{d:"m7 16.5-4.74-2.85",key:"1o9zyk"}],["path",{d:"m7 16.5 5-3",key:"va8pkn"}],["path",{d:"M7 16.5v5.17",key:"jnp8gn"}],["path",{d:"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",key:"8zsnat"}],["path",{d:"m17 16.5-5-3",key:"8arw3v"}],["path",{d:"m17 16.5 4.74-2.85",key:"8rfmw"}],["path",{d:"M17 16.5v5.17",key:"k6z78m"}],["path",{d:"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",key:"1xygjf"}],["path",{d:"M12 8 7.26 5.15",key:"1vbdud"}],["path",{d:"m12 8 4.74-2.85",key:"3rx089"}],["path",{d:"M12 13.5V8",key:"1io7kd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sm=Ot("Camera",[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",key:"1tc9qg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $1=Ot("ChartLine",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q1=Ot("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j_=Ot("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y1=Ot("Crop",[["path",{d:"M6 2v14a2 2 0 0 0 2 2h14",key:"ron5a4"}],["path",{d:"M18 22V8a2 2 0 0 0-2-2H2",key:"7s9ehn"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K1=Ot("Crown",[["path",{d:"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",key:"1vdc57"}],["path",{d:"M5 21h14",key:"11awu3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q1=Ot("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z1=Ot("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uv=Ot("Hammer",[["path",{d:"m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9",key:"eefl8a"}],["path",{d:"m18 15 4-4",key:"16gjal"}],["path",{d:"m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5",key:"b7pghm"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J1=Ot("Image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ew=Ot("Images",[["path",{d:"M18 22H4a2 2 0 0 1-2-2V6",key:"pblm9e"}],["path",{d:"m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18",key:"nf6bnh"}],["circle",{cx:"12",cy:"8",r:"2",key:"1822b1"}],["rect",{width:"16",height:"16",x:"6",y:"2",rx:"2",key:"12espp"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fs=Ot("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tw=Ot("Maximize2",[["polyline",{points:"15 3 21 3 21 9",key:"mznyad"}],["polyline",{points:"9 21 3 21 3 15",key:"1avn1i"}],["line",{x1:"21",x2:"14",y1:"3",y2:"10",key:"ota7mn"}],["line",{x1:"3",x2:"10",y1:"21",y2:"14",key:"1atl0r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mm=Ot("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fv=Ot("Plug",[["path",{d:"M12 22v-5",key:"1ega77"}],["path",{d:"M9 8V2",key:"14iosj"}],["path",{d:"M15 8V2",key:"18g5xt"}],["path",{d:"M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z",key:"osxo6l"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nw=Ot("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iw=Ot("RotateCw",[["path",{d:"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",key:"1p45f6"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rw=Ot("Scissors",[["circle",{cx:"6",cy:"6",r:"3",key:"1lh9wr"}],["path",{d:"M8.12 8.12 12 12",key:"1alkpv"}],["path",{d:"M20 4 8.12 15.88",key:"xgtan2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["path",{d:"M14.8 14.8 20 20",key:"ptml3r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X_=Ot("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bo=Ot("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Em=Ot("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sw=Ot("Undo2",[["path",{d:"M9 14 4 9l5-5",key:"102s5s"}],["path",{d:"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11",key:"f3b9sd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $_=Ot("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ov=Ot("WandSparkles",[["path",{d:"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72",key:"ul74o6"}],["path",{d:"m14 7 3 3",key:"1r5n42"}],["path",{d:"M5 6v4",key:"ilb8ba"}],["path",{d:"M19 14v4",key:"blhpug"}],["path",{d:"M10 2v2",key:"7u0qdc"}],["path",{d:"M7 8H3",key:"zfb6yr"}],["path",{d:"M21 16h-4",key:"1cnmox"}],["path",{d:"M11 3H9",key:"1obp7u"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aw=Ot("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);async function dn(i,e){var r;const t=await fetch(i,e);if(!t.ok){let a="";try{a=((r=await t.json())==null?void 0:r.detail)??""}catch{}throw new Error(a||`HTTP ${t.status} (${i})`)}return t.json()}const gn=(i,e)=>dn(i,{method:"POST",headers:{"Content-Type":"application/json"},body:e!==void 0?JSON.stringify(e):void 0}),Gl=i=>dn(i,{method:"DELETE"}),ow={K:"♚",Q:"♛",R:"♜",B:"♝",N:"♞",P:"♟"};function kv({label:i,className:e=""}){if(i==="empty")return E.jsx("span",{className:`text-zinc-500 ${e}`,children:"·"});if(i==="occluded")return E.jsx("span",{className:`text-amber-300 ${e}`,children:"▦"});const t=ow[i==null?void 0:i[1]]??i,r=(i==null?void 0:i[0])==="w";return E.jsx("span",{className:e,style:{color:r?"#fafafa":"#0a0a0a",textShadow:r?"0 0 1px #000, 0 1px 2px #000":"0 0 1px #fff, 0 1px 2px #fff"},children:t})}function vn({title:i,right:e,children:t,className:r=""}){return E.jsxs("div",{className:`rounded-xl border border-zinc-800 bg-zinc-900 p-4 ${r}`,children:[(i||e)&&E.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[i&&E.jsx("h2",{className:"text-xs font-medium uppercase tracking-wide text-zinc-400",children:i}),e]}),t]})}function Zt({children:i,variant:e="ghost",className:t="",onClick:r,disabled:a,...l}){const[c,h]=B.useState(!1),d=e==="primary"?"bg-sky-500 text-zinc-950 hover:bg-sky-400 font-medium":"bg-zinc-800 text-zinc-200 hover:bg-zinc-700";async function f(m){if(!r)return;const g=r(m);if(g&&typeof g.then=="function"){h(!0);try{await g}finally{h(!1)}}}return E.jsxs("button",{...l,onClick:f,disabled:a||c,className:`relative inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm transition
        disabled:cursor-not-allowed disabled:opacity-40 ${d} ${t}`,children:[E.jsx("span",{className:`inline-flex items-center gap-2 ${c?"invisible":""}`,children:i}),c&&E.jsx(Fs,{className:"absolute h-4 w-4 animate-spin"})]})}function uo({label:i,children:e,...t}){return E.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:[i,E.jsx("select",{...t,className:"rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",children:e})]})}const lf="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";function lw({coverage:i,sweep:e,sets:t,setSets:r,count:a,setCount:l,passes:c,setPasses:h,pieces:d,setPieces:f,together:m,setTogether:g,offset:v,setOffset:x,autoOffset:M,setAutoOffset:b,maxPlies:y,setMaxPlies:S,input:P}){return i?E.jsxs(E.Fragment,{children:[E.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Anzahl physischer Figurensätze: mit 2 Sätzen kommen Damen/Könige doppelt so schnell zusammen.",children:["Sätze",E.jsx("input",{type:"number",min:1,value:t,onChange:L=>r(+L.target.value),className:`${P} w-16`})]}),E.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Anzahl dichter Setupten, die gegen deine schwächsten Klassen erzeugt werden.",children:["Setupten",E.jsx("input",{type:"number",min:1,value:a,onChange:L=>l(+L.target.value),className:`${P} w-20`})]})]}):e?E.jsxs(E.Fragment,{children:[E.jsxs("div",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Welche Figuren übers Brett wandern: special = Nicht-Bauern (K,Q,R,B,N), pawn = nur Bauern, all = alle.",children:["Figuren",E.jsxs(uo,{label:"",value:d,onChange:L=>f(L.target.value),children:[E.jsx("option",{value:"special",children:"special (K,Q,R,B,N)"}),E.jsx("option",{value:"pawn",children:"pawn (Bauern)"}),E.jsx("option",{value:"all",children:"all"})]})]}),E.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Wiederholungen (je Pass 8 Fotos, Rang 1–8) — z.B. mit anderem Licht. Keine Figuren-Umstellung.",children:["Pässe",E.jsx("input",{type:"number",min:1,value:c,onChange:L=>h(+L.target.value),className:`${P} w-16`})]}),E.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Anzahl physischer Figurensätze: mit 2 Sätzen sind doppelt so viele Figuren je Foto möglich.",children:["Sätze",E.jsx("input",{type:"number",min:1,value:t,onChange:L=>r(+L.target.value),className:`${P} w-16`})]}),E.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Weiß und Schwarz gleichzeitig aufs Brett (Weiß vorne, Schwarz 4 Ränge versetzt) → halbe Fotozahl, jedes Feld bekommt beide Farben.",children:[E.jsx("input",{type:"checkbox",checked:m,onChange:L=>g(L.target.checked)})," beide Farben gleichzeitig"]}),E.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Offset automatisch: zählt bisherige Sweep-Sessions und nimmt den nächsten Offset → jede Figur landet über mehrere Sessions auf verschiedenen Linien (gegen Positions-Overfitting).",children:[E.jsx("input",{type:"checkbox",checked:M,onChange:L=>b(L.target.checked)})," Offset auto"]}),!M&&E.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Verschiebt die Linien→Figur-Zuordnung, fix für diese Session. 0: a=König,b=Dame,…  1: a=Dame,b=Turm,…",children:["Offset",E.jsx("input",{type:"number",min:0,max:7,value:v,onChange:L=>x(+L.target.value),className:`${P} w-16`})]})]}):E.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Halbzüge",E.jsx("input",{type:"number",value:y,onChange:L=>S(+L.target.value),className:`${P} w-20`})]})}function cw(){const[i,e]=B.useState("random"),[t,r]=B.useState(40),[a,l]=B.useState(1),[c,h]=B.useState(20),[d,f]=B.useState(1),[m,g]=B.useState("special"),[v,x]=B.useState(!0),[M,b]=B.useState(0),[y,S]=B.useState(!0),[P,L]=B.useState("default"),[R,D]=B.useState(0),N=i==="coverage",F=i==="sweep",[w,I]=B.useState({active:!1}),[G,V]=B.useState(""),Y=B.useRef(null);B.useEffect(()=>(dn("/api/collect/state").then(I).catch(()=>{}),()=>clearInterval(Y.current)),[]);const me=()=>dn("/api/collect/state").then(I).catch(()=>{});async function de(){V("");try{const ne=await gn("/api/collect/start",{strategy:i,max_plies:t,profile:P,camera:R,sets:a,count:c,passes:d,pieces:m,together:v,offset:M,auto_offset:y});I(ne),clearInterval(Y.current),Y.current=setInterval(me,1500)}catch(ne){V("Fehler: "+ne.message)}}const O=async()=>I(await gn("/api/collect/shoot")),ce=async()=>I(await gn("/api/collect/skip")),Q=async()=>I(await gn("/api/collect/undo"));async function $(){const ne=await gn("/api/collect/finish");clearInterval(Y.current),I({active:!1}),V(`Session beendet: ${ne.captures} Captures, ${ne.sliced??0} Crops gesliced → Tab „Datensätze".`)}return E.jsxs("div",{className:"space-y-4",children:[E.jsx(vn,{children:E.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[E.jsxs(uo,{label:"Engine",value:i,onChange:ne=>e(ne.target.value),children:[E.jsx("option",{value:"random",children:"random (eingebaut)"}),E.jsx("option",{value:"stockfish",children:"stockfish (automatisch erkannt)"}),E.jsx("option",{value:"coverage",children:"coverage (gegen seltene Klassen)"}),E.jsx("option",{value:"sweep",children:"sweep (Figuren laufen übers Brett)"})]}),E.jsx(lw,{coverage:N,sweep:F,input:lf,sets:a,setSets:l,count:c,setCount:h,passes:d,setPasses:f,pieces:m,setPieces:g,together:v,setTogether:x,offset:M,setOffset:b,autoOffset:y,setAutoOffset:S,maxPlies:t,setMaxPlies:r}),E.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Profil",E.jsx("input",{value:P,onChange:ne=>L(ne.target.value),className:`${lf} w-28`})]}),E.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Kamera",E.jsx("input",{type:"number",value:R,onChange:ne=>D(+ne.target.value),className:`${lf} w-16`})]}),w.active?E.jsxs(Zt,{onClick:$,children:[E.jsx(j_,{className:"h-4 w-4"})," Done"]}):E.jsxs(Zt,{variant:"primary",onClick:de,children:[E.jsx(Mm,{className:"h-4 w-4"})," Start game"]}),E.jsx("span",{className:"text-xs text-zinc-500",children:G})]})}),w.active&&E.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_320px]",children:[E.jsx(vn,{title:"Live-Kamera",children:E.jsx("img",{src:"/api/camera/collect.mjpg",alt:"Live capture",className:"w-full rounded-lg border border-zinc-800"})}),E.jsx(vn,{title:"Capture",children:E.jsxs("div",{className:"space-y-3",children:[w.done?E.jsxs("div",{className:"font-medium text-green-500",children:["✓ Alle ",w.n_positions," Positionen aufgenommen."]}):E.jsxs(E.Fragment,{children:[E.jsx(uw,{st:w}),E.jsxs("div",{className:"flex flex-wrap gap-2",children:[!w.done&&E.jsxs(Zt,{variant:"primary",onClick:O,className:"px-5 py-2.5 text-base",children:[E.jsx(Sm,{className:"h-5 w-5"})," Foto"]}),!w.done&&E.jsxs(Zt,{onClick:ce,children:[E.jsx(W1,{className:"h-4 w-4"})," Überspringen"]}),E.jsxs(Zt,{onClick:Q,children:[E.jsx(sw,{className:"h-4 w-4"})," Undo"]})]})]}),E.jsxs("div",{className:"text-sm",children:["Captures: ",E.jsx("b",{className:"text-sky-400",children:w.captures}),E.jsx("span",{className:"ml-1 text-xs text-green-500",children:"· sofort gespeichert ✓"})]}),E.jsxs("p",{className:"text-xs text-zinc-500",children:["Jede Capture ist ",E.jsx("b",{children:"sofort gespeichert"}),' — du kannst jederzeit „Done" (oben) drücken oder einfach aufhören; nichts geht verloren.']})]})})]}),E.jsxs("p",{className:"text-xs text-zinc-500",children:['Nach „Done" wird die Session automatisch gesliced. Kuratierte Datensätze (Dedup, Rotation, Split) baust du im Tab ',E.jsx("b",{className:"text-zinc-300",children:"Datensätze"}),"."]})]})}function uw({st:i}){const e=Math.min(i.index+1,i.n_positions),t=i.build_target?"Setup":"Position",r=i.build_target&&i.gains?E.jsxs("span",{className:"ml-1 text-xs text-zinc-500",children:["· ",i.gains," target squares"]}):null;let a;i.build_target?a=E.jsxs(E.Fragment,{children:["Position ",E.jsx("b",{children:"set up fresh"})," — die ",E.jsx("b",{className:"text-sky-300",children:"Figurennamen"})," sind ins Live-Bild eingeblendet (weiß = helle Schrift, schwarz = dunkle),"]}):i.index===0?a=E.jsxs(E.Fragment,{children:["Brett in die ",E.jsx("b",{children:"Startstellung"})," bringen,"]}):a=E.jsxs(E.Fragment,{children:["Diesen Zug ziehen: ",E.jsx("b",{className:"text-base text-sky-300",children:i.move_san})," ",E.jsx("span",{className:"text-zinc-400",children:"(red arrow)"}),","]});const l=i.build_target?E.jsx(E.Fragment,{children:"(gern mehrere mit wechselndem Licht)"}):null;return E.jsxs(E.Fragment,{children:[E.jsxs("div",{className:"text-sm text-zinc-400",children:[t," ",E.jsx("b",{className:"text-zinc-100",children:e})," / ",i.n_positions,r]}),E.jsxs("div",{className:"rounded-lg bg-zinc-800 p-3 text-sm",children:[a,E.jsxs("div",{className:"mt-1 text-xs text-zinc-400",children:["…dann ",E.jsx("b",{children:"Foto"}),l,"."]})]})]})}const co="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-sky-500",cf=({isActive:i})=>`rounded-lg px-3 py-1.5 text-sm transition ${i?"bg-zinc-800 text-zinc-100":"text-zinc-400 hover:text-zinc-100"}`;function hw(){return E.jsxs("div",{className:"space-y-4",children:[E.jsxs("nav",{className:"flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5",children:[E.jsx(fo,{to:"sessions",className:cf,children:"Sessions"}),E.jsx(fo,{to:"curated",className:cf,children:"Curated datasets"}),E.jsx(fo,{to:"stats",className:cf,children:"Statistics"})]}),E.jsx(n1,{})]})}const q_=()=>{const i=hm();return(...e)=>e.forEach(t=>i.invalidateQueries({queryKey:[t]}))};function dw(){const i=q_(),[e,t]=B.useState(""),[r,a]=B.useState(""),c=No({queryKey:["sessions-manage"],queryFn:()=>dn("/api/sessions/manage")}).data??[],h=M=>{t(M),a("ok"),i("sessions-manage","stats","datasets")},d=M=>{t("Error: "+M.message),a("err")},f=M=>{t(M),a("busy")},m=ca({mutationFn:M=>gn(`/api/sessions/${M}/slice`),onMutate:M=>f(`slicing "${M}" ...`),onSuccess:M=>h(`"${M.session}" sliced: ${M.crops} crops.`),onError:d}),g=ca({mutationFn:M=>gn(`/api/sessions/${M}/archive`),onSuccess:()=>h("archived."),onError:d}),v=ca({mutationFn:M=>gn(`/api/sessions/${M}/restore`),onSuccess:()=>h("restored — re-slice."),onError:d}),x=ca({mutationFn:M=>Gl(`/api/sessions/${M}`),onSuccess:()=>h("deleted."),onError:d});return E.jsxs(vn,{title:"Sessions (raw material)",right:E.jsxs("span",{className:"text-xs text-zinc-500",children:[c.length," session(s)"]}),children:[e&&E.jsx("div",{className:`mb-2 rounded-lg px-3 py-1.5 text-sm ${r==="err"?"bg-red-950/60 text-red-300":r==="busy"?"bg-sky-950/60 text-sky-300 animate-pulse":"bg-emerald-950/60 text-emerald-300"}`,children:e}),c.length===0?E.jsx("span",{className:"text-sm text-zinc-500",children:"No sessions yet — capture some in the Collect tab."}):E.jsxs("table",{className:"w-full text-sm",children:[E.jsx("thead",{children:E.jsxs("tr",{className:"text-zinc-500",children:[E.jsx("th",{className:"text-left font-normal",children:"Session"}),E.jsx("th",{className:"text-left font-normal",children:"Mode"}),E.jsx("th",{className:"text-right font-normal",children:"Frames"}),E.jsx("th",{className:"text-right font-normal",children:"Crops"}),E.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),E.jsx("tbody",{children:c.map(M=>E.jsxs("tr",{className:"border-t border-zinc-800",children:[E.jsxs("td",{className:"py-1.5 text-zinc-200",children:[M.session_id,M.archived&&E.jsx("span",{className:"ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300",children:"archived"}),!M.archived&&M.n_crops===0&&E.jsx("span",{className:"ml-2 rounded bg-amber-900/60 px-1.5 py-0.5 text-[10px] text-amber-300",children:"not sliced"})]}),E.jsx("td",{className:"text-zinc-400",children:M.mode??"—"}),E.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:M.n_frames}),E.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:M.archived?"—":M.n_crops}),E.jsx("td",{className:"py-1",children:E.jsxs("div",{className:"flex justify-end gap-1.5",children:[!M.archived&&E.jsxs(Zt,{onClick:()=>m.mutate(M.session_id),disabled:m.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[m.isPending&&m.variables===M.session_id?E.jsx(Fs,{className:"h-3.5 w-3.5 animate-spin"}):E.jsx(rw,{className:"h-3.5 w-3.5"})," ",M.n_crops?"Re-slice":"Slice"]}),M.archived?E.jsxs(Zt,{onClick:()=>v.mutate(M.session_id),className:"px-2 py-1 text-xs",children:[E.jsx(V1,{className:"h-3.5 w-3.5"})," Restore"]}):E.jsxs(Zt,{onClick:()=>g.mutate(M.session_id),className:"px-2 py-1 text-xs",children:[E.jsx(G1,{className:"h-3.5 w-3.5"})," Archive"]}),E.jsxs(Zt,{onClick:()=>window.confirm(`Delete session "${M.session_id}" permanently?`)&&x.mutate(M.session_id),className:"px-2 py-1 text-xs text-red-300 hover:text-red-200",children:[E.jsx(Bo,{className:"h-3.5 w-3.5"})," Delete"]})]})})]},M.session_id))})]})]})}function fw(){const i=q_(),[e,t]=B.useState(""),[r,a]=B.useState(""),[l,c]=B.useState(!1),[h,d]=B.useState(""),[f,m]=B.useState({}),[g,v]=B.useState(4),[x,M]=B.useState(!0),[b,y]=B.useState(6),[S,P]=B.useState(!0),[L,R]=B.useState(.15),[D,N]=B.useState(.15),F=No({queryKey:["sessions-manage"],queryFn:()=>dn("/api/sessions/manage")}),w=No({queryKey:["datasets"],queryFn:()=>dn("/api/datasets")}),I=(F.data??[]).filter(O=>!O.archived),G=w.data??[],V=ca({mutationFn:O=>gn("/api/datasets",O),onSuccess:O=>{t(`„${O.name}" gebaut: roh ${O.counts.raw} → dedup ${O.counts.after_dedup} → final ${O.counts.final}.`),c(!1),d(""),m({}),i("datasets","stats")},onError:O=>t("Error: "+O.message)}),Y=ca({mutationFn:O=>Gl(`/api/datasets/${O}`),onSuccess:()=>{t("deleted."),i("datasets")}}),me=ca({mutationFn:O=>gn(`/api/datasets/${O}/rebuild`),onSuccess:O=>{var ce;t(`„${O.name}" neu gebaut: ${(ce=O.counts)==null?void 0:ce.final} Crops.`),i("datasets","stats")},onError:O=>t("Error: "+O.message)});function de(){const O=I.filter(ce=>f[ce.session_id]).map(ce=>ce.session_id);if(!h.trim()||O.length===0){t("Name and at least one session required.");return}V.mutate({name:h.trim(),session_ids:O,per_cell_cap:g,phash_enabled:x,phash_hamming:b,rotate:S,val_frac:L,test_frac:D})}return E.jsxs(vn,{title:"Curated datasets",right:E.jsxs("div",{className:"flex items-center gap-2",children:[E.jsx("span",{className:"text-xs text-zinc-500",children:e}),E.jsxs(Zt,{onClick:()=>c(O=>!O),className:"px-2 py-1 text-xs",children:[E.jsx(X1,{className:"h-3.5 w-3.5"})," Neuer Dataset"]})]}),children:[l&&E.jsxs("div",{className:"mb-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3",children:[E.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[E.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["Name",E.jsx("input",{value:h,onChange:O=>d(O.target.value),className:`${co} w-40`,placeholder:"z.B. set-a"})]}),E.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",title:"max. Crops je (Session, Feld, Figur)",children:["Cap/Feld",E.jsx("input",{type:"number",min:1,value:g,onChange:O=>v(+O.target.value),className:`${co} w-16`})]}),E.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:[E.jsx("input",{type:"checkbox",checked:x,onChange:O=>M(O.target.checked)})," pHash"]}),E.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["Hamming",E.jsx("input",{type:"number",min:0,max:32,value:b,disabled:!x,onChange:O=>y(+O.target.value),className:`${co} w-14`})]}),E.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",title:"90/180/270° → 4× Crops. ACHTUNG: widerspricht der Fixkamera-Annahme — A/B testen.",children:[E.jsx("input",{type:"checkbox",checked:S,onChange:O=>P(O.target.checked)})," ",E.jsx(iw,{className:"h-3.5 w-3.5"})," Rotation"]}),E.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["val",E.jsx("input",{type:"number",step:.05,min:0,max:.5,value:L,onChange:O=>R(+O.target.value),className:`${co} w-14`})]}),E.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["test",E.jsx("input",{type:"number",step:.05,min:0,max:.5,value:D,onChange:O=>N(+O.target.value),className:`${co} w-14`})]})]}),E.jsxs("div",{children:[E.jsx("div",{className:"mb-1 text-xs text-zinc-500",children:"Sessions (freely selectable subset — datasets may overlap):"}),E.jsx("div",{className:"flex flex-wrap gap-2",children:I.length===0?E.jsx("span",{className:"text-xs text-zinc-500",children:"none aktiven Sessions"}):I.map(O=>E.jsxs("label",{className:"flex items-center gap-1.5 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300",children:[E.jsx("input",{type:"checkbox",checked:!!f[O.session_id],onChange:ce=>m(Q=>({...Q,[O.session_id]:ce.target.checked}))}),O.session_id," ",E.jsxs("span",{className:"text-zinc-500",children:["(",O.n_crops,")"]})]},O.session_id))})]}),E.jsxs(Zt,{variant:"primary",onClick:de,disabled:V.isPending,children:[E.jsx(Uv,{className:"h-4 w-4"})," ",V.isPending?"Baue…":"Build"]})]}),G.length===0?E.jsx("span",{className:"text-sm text-zinc-500",children:"Noch kein Dataset gebaut."}):E.jsxs("table",{className:"w-full text-sm",children:[E.jsx("thead",{children:E.jsxs("tr",{className:"text-zinc-500",children:[E.jsx("th",{className:"text-left font-normal",children:"Dataset"}),E.jsx("th",{className:"text-right font-normal",children:"Sessions"}),E.jsx("th",{className:"text-right font-normal",children:"roh→dedup→final"}),E.jsx("th",{className:"text-right font-normal",children:"train/val/test"}),E.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),E.jsx("tbody",{children:G.map(O=>{var ce,Q,$,ne,he,k,ee;return E.jsxs("tr",{className:"border-t border-zinc-800",children:[E.jsxs("td",{className:"py-1.5 text-zinc-200",children:[O.name,((ce=O.rotations)==null?void 0:ce.some(Fe=>Fe))&&E.jsx("span",{className:"ml-2 text-[10px] text-zinc-500",children:"+rot"})]}),E.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:O.n_sessions}),E.jsxs("td",{className:"text-right tabular-nums text-zinc-400",children:[(Q=O.counts)==null?void 0:Q.raw,"→",($=O.counts)==null?void 0:$.after_dedup,"→",(ne=O.counts)==null?void 0:ne.final]}),E.jsxs("td",{className:"text-right tabular-nums text-zinc-400",children:[((he=O.split_counts)==null?void 0:he.train)??"?","/",((k=O.split_counts)==null?void 0:k.val)??"?","/",((ee=O.split_counts)==null?void 0:ee.test)??"?"]}),E.jsx("td",{className:"py-1",children:E.jsxs("div",{className:"flex justify-end gap-1.5",children:[E.jsx(fo,{to:`../stats?ds=${encodeURIComponent(O.name)}`,className:"inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700",children:"Stats"}),E.jsxs(Zt,{onClick:()=>me.mutate(O.name),className:"px-2 py-1 text-xs",children:[E.jsx(Uv,{className:"h-3.5 w-3.5"})," Rebuild"]}),E.jsxs(Zt,{onClick:()=>window.confirm(`Dataset „${O.name}" löschen?`)&&Y.mutate(O.name),className:"px-2 py-1 text-xs text-red-300 hover:text-red-200",children:[E.jsx(Bo,{className:"h-3.5 w-3.5"})," Delete"]})]})})]},O.name)})})]})]})}function pw(){const[i,e]=D1(),t=i.get("ds")??"",[r,a]=B.useState(null),l=No({queryKey:["datasets"],queryFn:()=>dn("/api/datasets")}),c=No({queryKey:["stats",t],queryFn:()=>{const x=t?`?dataset=${encodeURIComponent(t)}`:"";return dn(`/api/stats${x}`)}}),h=l.data??[],d=c.data;if(c.isLoading||!d)return E.jsx(vn,{children:"Stats laden…"});const f=t?`Dataset „${t}"`:"global pool",m=Math.max(1,...Object.values(d.counts??{x:1})),g=(x,M)=>x==="empty"||x==="occluded"?"#38bdf8":M<d.min_samples*.5?"#ef4444":M<d.min_samples?"#eab308":"#22c55e",v=x=>{const M=t?`&dataset=${encodeURIComponent(t)}`:"";return dn(`/api/class/${x}?limit=120${M}`).then(b=>a({label:x,crops:b.crops}))};return E.jsxs("div",{className:"space-y-4",children:[E.jsxs("div",{className:"grid gap-4 lg:grid-cols-3",children:[E.jsxs(vn,{title:"Class distribution",className:"lg:col-span-2",right:E.jsxs("select",{value:t,onChange:x=>e(x.target.value?{ds:x.target.value}:{}),className:co,children:[E.jsx("option",{value:"",children:"global pool"}),h.map(x=>E.jsx("option",{value:x.name,children:x.name},x.name))]}),children:[E.jsxs("div",{className:"mb-2 text-xs text-zinc-500",children:[d.total," Crops · ",d.num_sessions," Sessions",t?` · Dataset „${t}"`:" · roh"]}),E.jsx("div",{className:"space-y-1.5",children:d.classes.map(x=>{const M=d.counts[x]||0;return E.jsxs("button",{onClick:()=>v(x),className:"grid w-full grid-cols-[2rem_1fr_3rem] items-center gap-3 rounded px-1 py-0.5 text-left hover:bg-zinc-800",children:[E.jsxs("span",{className:"text-zinc-300",children:[E.jsx(kv,{label:x}),E.jsx("span",{className:"ml-1 text-xs text-zinc-500",children:x})]}),E.jsx("div",{className:"h-2.5 overflow-hidden rounded-full bg-zinc-800",children:E.jsx("div",{className:"h-full rounded-full",style:{width:`${M/m*100}%`,background:g(x,M)}})}),E.jsx("span",{className:"text-right text-sm tabular-nums text-zinc-400",children:M})]},x)})})]}),E.jsx(vn,{title:"Light / Dark",children:E.jsxs("table",{className:"w-full text-sm",children:[E.jsx("thead",{children:E.jsxs("tr",{className:"text-zinc-500",children:[E.jsx("th",{className:"text-left font-normal",children:"Klasse"}),E.jsx("th",{children:"hell"}),E.jsx("th",{children:"dunkel"})]})}),E.jsx("tbody",{children:d.classes.map(x=>{const M=b=>b>0?E.jsx(q1,{className:"mx-auto h-4 w-4 text-green-500"}):E.jsx(aw,{className:"mx-auto h-4 w-4 text-red-500"});return E.jsxs("tr",{className:"border-t border-zinc-800",children:[E.jsxs("td",{className:"py-1 text-zinc-300",children:[E.jsx(kv,{label:x})," ",E.jsx("span",{className:"text-xs text-zinc-500",children:x})]}),E.jsx("td",{children:M(d.light[x]||0)}),E.jsx("td",{children:M(d.dark[x]||0)})]},x)})})]})})]}),E.jsx(vn,{title:"Warnings",children:d.warnings.length?E.jsx("ul",{className:"space-y-1 text-sm",children:d.warnings.map((x,M)=>E.jsxs("li",{className:"flex items-center gap-2 text-amber-400",children:[E.jsx(Em,{className:"h-4 w-4 shrink-0"})," ",x]},M))}):E.jsx("span",{className:"text-sm text-green-500",children:"none"})}),E.jsx(vn,{title:`Browse crops (${f})`,right:E.jsxs("span",{className:"flex items-center gap-1 text-xs text-zinc-500",children:[E.jsx(ew,{className:"h-3.5 w-3.5"}),r?`${r.label} (${r.crops.length})`:"Click a class"]}),children:r?E.jsx("div",{className:"grid grid-cols-[repeat(auto-fill,56px)] gap-1.5",children:r.crops.map((x,M)=>E.jsx("img",{src:x.url,title:`${x.session_id} ${x.frame} ${x.square}`,alt:`Feld ${x.square}`,className:"h-[74px] w-[56px] rounded border border-zinc-800 object-cover"},M))}):E.jsx("span",{className:"text-sm text-zinc-500",children:"Select a class on the left to view crops."})})]})}function zv({series:i,yMin:e=0,yMax:t=1}){const c=i.flatMap(g=>g.data.map(v=>v.x)),h=Math.max(1,...c),d=g=>30+540*g/h,f=g=>170-140*(g-e)/Math.max(1e-9,t-e),m=4;return E.jsxs("div",{children:[E.jsxs("svg",{viewBox:"0 0 600 200",className:"w-full",style:{height:200},preserveAspectRatio:"none",children:[Array.from({length:m+1},(g,v)=>{const x=e+(t-e)*v/m;return E.jsxs("g",{children:[E.jsx("line",{x1:30,y1:f(x),x2:570,y2:f(x),stroke:"#27272a",strokeWidth:1}),E.jsx("text",{x:4,y:f(x)+3,fill:"#71717a",fontSize:10,children:x.toFixed(t<=1?2:1)})]},v)}),i.map(g=>g.data.length?E.jsx("polyline",{fill:"none",stroke:g.color,strokeWidth:2,strokeLinejoin:"round",points:g.data.map(v=>`${d(v.x).toFixed(1)},${f(v.y).toFixed(1)}`).join(" ")},g.name):null)]}),E.jsx("div",{className:"mt-1 flex flex-wrap gap-4 text-xs text-zinc-400",children:i.map(g=>E.jsxs("span",{className:"flex items-center gap-1.5",children:[E.jsx("span",{className:"inline-block h-2 w-2 rounded-full",style:{background:g.color}}),g.name]},g.name))})]})}const du="w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100";function mw(){var ue,Se,xe;const[i,e]=B.useState([]),[t,r]=B.useState(""),[a,l]=B.useState(""),[c,h]=B.useState([]),[d,f]=B.useState({}),[m,g]=B.useState({running:!1}),[v,x]=B.useState(""),[M,b]=B.useState("smallcnn"),[y,S]=B.useState("combined"),[P,L]=B.useState(30),[R,D]=B.useState(256),[N,F]=B.useState(3e-4),[w,I]=B.useState(7),[G,V]=B.useState(""),Y=B.useRef(null),de=No({queryKey:["datasets"],queryFn:()=>dn("/api/datasets")}).data??[],O=de.find(te=>te.name===a);B.useEffect(()=>{de.length&&!a&&l(de[0].name)},[de]);const ce=B.useCallback(async()=>{const te=await dn("/api/runs");e(te),te.length&&!t&&Q(te[0].run)},[t]);B.useEffect(()=>(ce(),()=>clearInterval(Y.current)),[ce]);async function Q(te){r(te),h((await dn(`/api/runs/${te}/metrics`)).metrics),f((await dn(`/api/runs/${te}/eval`)).evals)}async function $(te){if(window.confirm(`Modell „${te}" löschen? (Verzeichnis + Gewichte werden entfernt)`)){try{await Gl(`/api/runs/${te}`)}catch(Ue){x(Ue.message);return}t===te&&(r(""),h([]),f({})),ce()}}const ne=te=>te==null?"—":(te*100).toFixed(1)+" %";async function he(){if(x(""),!a){x("No dataset — build one in the Datasets tab first.");return}try{await gn("/api/train",{backbone:M,head:y,epochs:P,batch_size:R,lr:N,patience:w,no_amp:!0,dataset:a,resume:G||void 0}),clearInterval(Y.current),Y.current=setInterval(k,2500),k()}catch(te){x(te.message)}}async function k(){var Ue;const te=await dn("/api/train/status");g(te),(Ue=te.metrics)!=null&&Ue.length&&h(te.metrics),te.running||(clearInterval(Y.current),ce())}async function ee(){var te;try{await gn("/api/train/stop")}catch{}clearInterval(Y.current);try{const Ue=await dn("/api/train/status");g({...Ue,running:!1}),Ue.run&&r(Ue.run),(te=Ue.metrics)!=null&&te.length&&h(Ue.metrics)}catch{g({running:!1,state:"stopped"})}ce()}const Fe=[{name:"train_loss",color:"#ef4444",data:c.map(te=>({x:te.epoch,y:te.train_loss}))},{name:"val_loss",color:"#eab308",data:c.map(te=>({x:te.epoch,y:te.val_loss??0}))}],je=Math.max(.5,...c.map(te=>Math.max(te.train_loss||0,te.val_loss||0))),Ge=[{name:"square_acc",color:"#38bdf8",data:c.map(te=>({x:te.epoch,y:te.val_acc??0}))},{name:"macro_recall",color:"#22c55e",data:c.map(te=>({x:te.epoch,y:te.val_macro_recall??0}))},{name:"board_acc",color:"#e4e4e7",data:c.map(te=>({x:te.epoch,y:te.val_board_acc??0}))}];return E.jsxs("div",{className:"space-y-4",children:[E.jsxs(vn,{children:[E.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[E.jsxs(uo,{label:"Datensatz",value:a,onChange:te=>l(te.target.value),children:[de.length===0&&E.jsx("option",{value:"",children:"— keiner gebaut —"}),de.map(te=>{var Ue;return E.jsxs("option",{value:te.name,children:[te.name," (",((Ue=te.counts)==null?void 0:Ue.final)??"?",")"]},te.name)})]}),E.jsxs(uo,{label:"Backbone",value:M,onChange:te=>b(te.target.value),children:[E.jsx("option",{value:"smallcnn",children:"smallcnn"}),E.jsx("option",{value:"mobilenet_v3_small",children:"mobilenet_v3_small"})]}),E.jsxs(uo,{label:"Kopf",value:y,onChange:te=>S(te.target.value),children:[E.jsx("option",{value:"combined",children:"combined"}),E.jsx("option",{value:"factored",children:"factored"}),E.jsx("option",{value:"twostage",children:"twostage (Occ→Piece)"})]}),E.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",children:["Epochs",E.jsx("input",{type:"number",min:1,value:P,onChange:te=>L(+te.target.value),className:du})]}),E.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",children:["Batch",E.jsx("input",{type:"number",min:1,value:R,onChange:te=>D(+te.target.value),className:du})]}),E.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",children:["LR",E.jsx("input",{type:"number",step:1e-4,min:0,value:N,onChange:te=>F(+te.target.value),className:du})]}),E.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Early Stopping: Epochen ohne macro_recall-Fortschritt, bevor abgebrochen wird.",children:["Geduld",E.jsx("input",{type:"number",min:1,value:w,onChange:te=>I(+te.target.value),className:du})]}),E.jsxs(uo,{label:"Weiter ab",value:G,onChange:te=>V(te.target.value),children:[E.jsx("option",{value:"",children:"von Grund auf"}),i.some(te=>String(te.dataset||"").startsWith("pretrain-"))&&E.jsx("optgroup",{label:"Basis-Modelle (vortrainiert)",children:i.filter(te=>String(te.dataset||"").startsWith("pretrain-")).map(te=>E.jsxs("option",{value:te.run,children:["🔹 Basis · ",te.run]},te.run))}),E.jsx("optgroup",{label:"Eigene Runs",children:i.filter(te=>!String(te.dataset||"").startsWith("pretrain-")).map(te=>E.jsx("option",{value:te.run,children:te.run},te.run))})]}),E.jsxs(Zt,{variant:"primary",onClick:he,disabled:m.running||!a,children:[m.running?E.jsx(Fs,{className:"h-4 w-4 animate-spin"}):E.jsx(Mm,{className:"h-4 w-4"})," Training starten"]}),m.running&&E.jsxs(Zt,{onClick:ee,children:[E.jsx(X_,{className:"h-4 w-4"})," Abbrechen"]})]}),O&&E.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:["Split: train ",((ue=O.split_counts)==null?void 0:ue.train)??"?"," · val ",((Se=O.split_counts)==null?void 0:Se.val)??"?"," · test ",((xe=O.split_counts)==null?void 0:xe.test)??"?"]}),(m.running||c.length>0)&&E.jsxs("div",{className:"mt-3",children:[E.jsxs("div",{className:"mb-1 flex justify-between text-xs text-zinc-400",children:[E.jsxs("span",{children:[m.running?`running… (${m.run})`:m.state==="stopped"||m.state==="crashed"?"abgebrochen":"Fortschritt"," · Epoche ",c.length,"/",P]}),E.jsxs("span",{children:["board_acc ",c.length?((c[c.length-1].val_board_acc??0)*100).toFixed(1)+" %":"—"]})]}),E.jsx("div",{className:"h-2 overflow-hidden rounded-full bg-zinc-800",children:E.jsx("div",{className:`h-full rounded-full transition-all ${m.state==="stopped"||m.state==="crashed"?"bg-amber-500":"bg-sky-500"}`,style:{width:`${Math.min(100,c.length/Math.max(1,P)*100)}%`}})})]}),!m.running&&m.state==="done"&&E.jsx("p",{className:"mt-2 text-xs text-green-500",children:"fertig ✓"}),!m.running&&(m.state==="stopped"||m.state==="crashed")&&E.jsxs("p",{className:"mt-2 text-xs text-amber-400",children:[m.state==="crashed"?"abgebrochen (Crash)":"abgebrochen"," bei Epoche ",c.length,' — Teil-Fortschritt bleibt erhalten; „best.pt" ist gespeichert, „Weiter ab" setzt hier an.']}),v&&E.jsx("p",{className:"mt-2 text-sm text-amber-400",children:v})]}),E.jsxs(vn,{title:"Modelle",right:E.jsxs("span",{className:"text-xs text-zinc-500",children:[i.length," Run(s)"]}),children:[i.length===0?E.jsx("span",{className:"text-sm text-zinc-500",children:"Noch kein Modell trainiert."}):E.jsx("div",{className:"overflow-x-auto",children:E.jsxs("table",{className:"w-full text-sm",children:[E.jsx("thead",{children:E.jsxs("tr",{className:"text-zinc-500",children:[E.jsx("th",{className:"text-left font-normal",children:"Run"}),E.jsx("th",{className:"text-left font-normal",children:"Backbone"}),E.jsx("th",{className:"text-left font-normal",children:"Datensatz"}),E.jsx("th",{className:"text-right font-normal",children:"Kl."}),E.jsx("th",{className:"text-right font-normal",children:"Ep."}),E.jsx("th",{className:"text-right font-normal",title:"bestes val board_acc (alle 64 Felder korrekt)",children:"board_acc"}),E.jsx("th",{className:"text-right font-normal",title:"bestes val square_acc (Anteil korrekter Einzelfelder — treibt board_acc ≈ square_acc^64)",children:"square_acc"}),E.jsx("th",{className:"text-right font-normal",title:"bestes val macro_recall",children:"macro_rec"}),E.jsx("th",{className:"text-right font-normal",title:"Test-Set board_acc (nach eval)",children:"test"}),E.jsx("th",{className:"text-right font-normal",children:"Aktion"})]})}),E.jsx("tbody",{children:i.map(te=>E.jsxs("tr",{className:`border-t border-zinc-800 ${t===te.run?"bg-zinc-800/50":""}`,children:[E.jsxs("td",{className:"py-1.5 text-zinc-200",children:[te.run,te.resumed_from&&E.jsx("span",{className:"ml-1 text-[10px] text-zinc-500",title:`resumed from ${te.resumed_from}`,children:"↻"}),te.has_occluded&&E.jsx("span",{className:"ml-1 rounded bg-zinc-700 px-1 text-[9px] text-amber-300",children:"+occ"})]}),E.jsx("td",{className:"text-zinc-400",children:te.backbone}),E.jsx("td",{className:"text-zinc-400",children:te.dataset??"—"}),E.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:te.n_classes}),E.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:te.epochs_done}),E.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:ne(te.best_board_acc)}),E.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:ne(te.best_square_acc)}),E.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:ne(te.best_macro_recall)}),E.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:ne(te.test_board_acc)}),E.jsx("td",{className:"py-1",children:E.jsxs("div",{className:"flex justify-end gap-1.5",children:[E.jsxs(Zt,{onClick:()=>Q(te.run),className:"px-2 py-1 text-xs",children:[E.jsx(Z1,{className:"h-3.5 w-3.5"})," View"]}),E.jsxs(Zt,{onClick:()=>$(te.run),className:"px-2 py-1 text-xs text-red-300 hover:text-red-200",children:[E.jsx(Bo,{className:"h-3.5 w-3.5"})," Delete"]})]})})]},te.run))})]})}),E.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:['"View" loads curves & eval below · "test" appears after ',E.jsx("code",{children:"chesslab eval --run …"}),' · ↻ = continued training · +occ = model knows "occluded" class.']})]}),E.jsxs("div",{className:"grid gap-4 lg:grid-cols-2",children:[E.jsx(vn,{title:"Loss",children:E.jsx(zv,{series:Fe,yMin:0,yMax:je})}),E.jsx(vn,{title:"Metrics (0-1) — macro_recall is the honest number",children:E.jsx(zv,{series:Ge,yMin:0,yMax:1})})]}),E.jsx(vn,{title:"Evaluation",children:Object.keys(d).length?E.jsx("div",{className:"space-y-4",children:Object.entries(d).map(([te,Ue])=>{const tt=Object.entries(Ue.recall||{}).sort((Dt,ct)=>Dt[1]-ct[1]).slice(0,3);return E.jsxs("div",{children:[E.jsxs("div",{className:"text-sm",children:[E.jsx("span",{className:"font-medium uppercase text-zinc-400",children:te})," · board_acc ",E.jsxs("b",{children:[(Ue.board_acc*100).toFixed(1),"%"]})," · square_acc ",(Ue.square_acc*100).toFixed(1),"%"]}),E.jsxs("div",{className:"text-xs text-zinc-500",children:["weakest classes: ",tt.map(([Dt,ct])=>`${Dt} ${(ct*100).toFixed(0)}%`).join(", ")]}),Ue.confusion_png&&E.jsx("img",{src:Ue.confusion_png,alt:"Confusion Matrix",className:"mt-2 max-w-md rounded-lg border border-zinc-800"})]},te)})}):E.jsxs("span",{className:"text-sm text-zinc-500",children:["No eval yet — ",E.jsx("code",{children:"chesslab eval --run …"})]})}),m.log_tail&&E.jsx(vn,{title:"Log",children:E.jsx("pre",{className:"max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 text-xs text-zinc-400",children:m.log_tail})})]})}/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const wm="185",po={ROTATE:0,DOLLY:1,PAN:2},ho={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},gw=0,Bv=1,vw=2,Wu=1,xw=2,Ul=3,Is=0,hi=1,hr=2,Vr=0,mo=1,Hv=2,Vv=3,Gv=4,_w=5,aa=100,yw=101,Sw=102,Mw=103,Ew=104,ww=200,Tw=201,bw=202,Rw=203,dp=204,fp=205,Cw=206,Aw=207,Pw=208,Nw=209,Lw=210,Dw=211,Iw=212,Uw=213,Fw=214,pp=0,mp=1,gp=2,Lo=3,vp=4,xp=5,_p=6,yp=7,Tm=0,Ow=1,kw=2,pr=0,Y_=1,K_=2,Q_=3,bm=4,Z_=5,J_=6,ey=7,ty=300,Ma=301,Do=302,uf=303,hf=304,mh=306,Sp=1e3,Hr=1001,Mp=1002,Un=1003,zw=1004,fu=1005,Wn=1006,df=1007,ua=1008,yi=1009,ny=1010,iy=1011,Wl=1012,Rm=1013,vr=1014,dr=1015,Xr=1016,Cm=1017,Am=1018,jl=1020,ry=35902,sy=35899,ay=1021,oy=1022,Yi=1023,$r=1026,ha=1027,ly=1028,Pm=1029,Ea=1030,Nm=1031,Lm=1033,ju=33776,Xu=33777,$u=33778,qu=33779,Ep=35840,wp=35841,Tp=35842,bp=35843,Rp=36196,Cp=37492,Ap=37496,Pp=37488,Np=37489,nh=37490,Lp=37491,Dp=37808,Ip=37809,Up=37810,Fp=37811,Op=37812,kp=37813,zp=37814,Bp=37815,Hp=37816,Vp=37817,Gp=37818,Wp=37819,jp=37820,Xp=37821,$p=36492,qp=36494,Yp=36495,Kp=36283,Qp=36284,ih=36285,Zp=36286,Bw=3200,rh=0,Hw=1,Ms="",Zn="srgb",sh="srgb-linear",ah="linear",Bt="srgb",qa=7680,Wv=519,Vw=512,Gw=513,Ww=514,Dm=515,jw=516,Xw=517,Im=518,$w=519,jv=35044,Xv="300 es",fr=2e3,Xl=2001;function qw(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function $l(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Yw(){const i=$l("canvas");return i.style.display="block",i}const $v={};function qv(...i){const e="THREE."+i.shift();console.log(e,...i)}function cy(i){const e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function lt(...i){i=cy(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function Nt(...i){i=cy(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function go(...i){const e=i.join(" ");e in $v||($v[e]=!0,lt(...i))}function Kw(i,e,t){return new Promise(function(r,a){function l(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:a();break;case i.TIMEOUT_EXPIRED:setTimeout(l,t);break;default:r()}}setTimeout(l,t)})}const Qw={[pp]:mp,[gp]:_p,[vp]:yp,[Lo]:xp,[mp]:pp,[_p]:gp,[yp]:vp,[xp]:Lo};class Os{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const r=this._listeners;r[e]===void 0&&(r[e]=[]),r[e].indexOf(t)===-1&&r[e].push(t)}hasEventListener(e,t){const r=this._listeners;return r===void 0?!1:r[e]!==void 0&&r[e].indexOf(t)!==-1}removeEventListener(e,t){const r=this._listeners;if(r===void 0)return;const a=r[e];if(a!==void 0){const l=a.indexOf(t);l!==-1&&a.splice(l,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const r=t[e.type];if(r!==void 0){e.target=this;const a=r.slice(0);for(let l=0,c=a.length;l<c;l++)a[l].call(this,e);e.target=null}}}const Hn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Yu=Math.PI/180,Jp=180/Math.PI;function tc(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(Hn[i&255]+Hn[i>>8&255]+Hn[i>>16&255]+Hn[i>>24&255]+"-"+Hn[e&255]+Hn[e>>8&255]+"-"+Hn[e>>16&15|64]+Hn[e>>24&255]+"-"+Hn[t&63|128]+Hn[t>>8&255]+"-"+Hn[t>>16&255]+Hn[t>>24&255]+Hn[r&255]+Hn[r>>8&255]+Hn[r>>16&255]+Hn[r>>24&255]).toLowerCase()}function Mt(i,e,t){return Math.max(e,Math.min(t,i))}function Zw(i,e){return(i%e+e)%e}function ff(i,e,t){return(1-t)*i+t*e}function bl(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function oi(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}const Jw={DEG2RAD:Yu},Bm=class Bm{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,r=this.y,a=e.elements;return this.x=a[0]*t+a[3]*r+a[6],this.y=a[1]*t+a[4]*r+a[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Mt(this.x,e.x,t.x),this.y=Mt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Mt(this.x,e,t),this.y=Mt(this.y,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(Mt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const r=this.dot(e)/t;return Math.acos(Mt(r,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,r=this.y-e.y;return t*t+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const r=Math.cos(t),a=Math.sin(t),l=this.x-e.x,c=this.y-e.y;return this.x=l*r-c*a+e.x,this.y=l*a+c*r+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};Bm.prototype.isVector2=!0;let ht=Bm;class Us{constructor(e=0,t=0,r=0,a=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=r,this._w=a}static slerpFlat(e,t,r,a,l,c,h){let d=r[a+0],f=r[a+1],m=r[a+2],g=r[a+3],v=l[c+0],x=l[c+1],M=l[c+2],b=l[c+3];if(g!==b||d!==v||f!==x||m!==M){let y=d*v+f*x+m*M+g*b;y<0&&(v=-v,x=-x,M=-M,b=-b,y=-y);let S=1-h;if(y<.9995){const P=Math.acos(y),L=Math.sin(P);S=Math.sin(S*P)/L,h=Math.sin(h*P)/L,d=d*S+v*h,f=f*S+x*h,m=m*S+M*h,g=g*S+b*h}else{d=d*S+v*h,f=f*S+x*h,m=m*S+M*h,g=g*S+b*h;const P=1/Math.sqrt(d*d+f*f+m*m+g*g);d*=P,f*=P,m*=P,g*=P}}e[t]=d,e[t+1]=f,e[t+2]=m,e[t+3]=g}static multiplyQuaternionsFlat(e,t,r,a,l,c){const h=r[a],d=r[a+1],f=r[a+2],m=r[a+3],g=l[c],v=l[c+1],x=l[c+2],M=l[c+3];return e[t]=h*M+m*g+d*x-f*v,e[t+1]=d*M+m*v+f*g-h*x,e[t+2]=f*M+m*x+h*v-d*g,e[t+3]=m*M-h*g-d*v-f*x,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,r,a){return this._x=e,this._y=t,this._z=r,this._w=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const r=e._x,a=e._y,l=e._z,c=e._order,h=Math.cos,d=Math.sin,f=h(r/2),m=h(a/2),g=h(l/2),v=d(r/2),x=d(a/2),M=d(l/2);switch(c){case"XYZ":this._x=v*m*g+f*x*M,this._y=f*x*g-v*m*M,this._z=f*m*M+v*x*g,this._w=f*m*g-v*x*M;break;case"YXZ":this._x=v*m*g+f*x*M,this._y=f*x*g-v*m*M,this._z=f*m*M-v*x*g,this._w=f*m*g+v*x*M;break;case"ZXY":this._x=v*m*g-f*x*M,this._y=f*x*g+v*m*M,this._z=f*m*M+v*x*g,this._w=f*m*g-v*x*M;break;case"ZYX":this._x=v*m*g-f*x*M,this._y=f*x*g+v*m*M,this._z=f*m*M-v*x*g,this._w=f*m*g+v*x*M;break;case"YZX":this._x=v*m*g+f*x*M,this._y=f*x*g+v*m*M,this._z=f*m*M-v*x*g,this._w=f*m*g-v*x*M;break;case"XZY":this._x=v*m*g-f*x*M,this._y=f*x*g-v*m*M,this._z=f*m*M+v*x*g,this._w=f*m*g+v*x*M;break;default:lt("Quaternion: .setFromEuler() encountered an unknown order: "+c)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const r=t/2,a=Math.sin(r);return this._x=e.x*a,this._y=e.y*a,this._z=e.z*a,this._w=Math.cos(r),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,r=t[0],a=t[4],l=t[8],c=t[1],h=t[5],d=t[9],f=t[2],m=t[6],g=t[10],v=r+h+g;if(v>0){const x=.5/Math.sqrt(v+1);this._w=.25/x,this._x=(m-d)*x,this._y=(l-f)*x,this._z=(c-a)*x}else if(r>h&&r>g){const x=2*Math.sqrt(1+r-h-g);this._w=(m-d)/x,this._x=.25*x,this._y=(a+c)/x,this._z=(l+f)/x}else if(h>g){const x=2*Math.sqrt(1+h-r-g);this._w=(l-f)/x,this._x=(a+c)/x,this._y=.25*x,this._z=(d+m)/x}else{const x=2*Math.sqrt(1+g-r-h);this._w=(c-a)/x,this._x=(l+f)/x,this._y=(d+m)/x,this._z=.25*x}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let r=e.dot(t)+1;return r<1e-8?(r=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=r):(this._x=0,this._y=-e.z,this._z=e.y,this._w=r)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=r),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Mt(this.dot(e),-1,1)))}rotateTowards(e,t){const r=this.angleTo(e);if(r===0)return this;const a=Math.min(1,t/r);return this.slerp(e,a),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const r=e._x,a=e._y,l=e._z,c=e._w,h=t._x,d=t._y,f=t._z,m=t._w;return this._x=r*m+c*h+a*f-l*d,this._y=a*m+c*d+l*h-r*f,this._z=l*m+c*f+r*d-a*h,this._w=c*m-r*h-a*d-l*f,this._onChangeCallback(),this}slerp(e,t){let r=e._x,a=e._y,l=e._z,c=e._w,h=this.dot(e);h<0&&(r=-r,a=-a,l=-l,c=-c,h=-h);let d=1-t;if(h<.9995){const f=Math.acos(h),m=Math.sin(f);d=Math.sin(d*f)/m,t=Math.sin(t*f)/m,this._x=this._x*d+r*t,this._y=this._y*d+a*t,this._z=this._z*d+l*t,this._w=this._w*d+c*t,this._onChangeCallback()}else this._x=this._x*d+r*t,this._y=this._y*d+a*t,this._z=this._z*d+l*t,this._w=this._w*d+c*t,this.normalize();return this}slerpQuaternions(e,t,r){return this.copy(e).slerp(t,r)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),r=Math.random(),a=Math.sqrt(1-r),l=Math.sqrt(r);return this.set(a*Math.sin(e),a*Math.cos(e),l*Math.sin(t),l*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}const Hm=class Hm{constructor(e=0,t=0,r=0){this.x=e,this.y=t,this.z=r}set(e,t,r){return r===void 0&&(r=this.z),this.x=e,this.y=t,this.z=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Yv.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Yv.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,r=this.y,a=this.z,l=e.elements;return this.x=l[0]*t+l[3]*r+l[6]*a,this.y=l[1]*t+l[4]*r+l[7]*a,this.z=l[2]*t+l[5]*r+l[8]*a,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,r=this.y,a=this.z,l=e.elements,c=1/(l[3]*t+l[7]*r+l[11]*a+l[15]);return this.x=(l[0]*t+l[4]*r+l[8]*a+l[12])*c,this.y=(l[1]*t+l[5]*r+l[9]*a+l[13])*c,this.z=(l[2]*t+l[6]*r+l[10]*a+l[14])*c,this}applyQuaternion(e){const t=this.x,r=this.y,a=this.z,l=e.x,c=e.y,h=e.z,d=e.w,f=2*(c*a-h*r),m=2*(h*t-l*a),g=2*(l*r-c*t);return this.x=t+d*f+c*g-h*m,this.y=r+d*m+h*f-l*g,this.z=a+d*g+l*m-c*f,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,r=this.y,a=this.z,l=e.elements;return this.x=l[0]*t+l[4]*r+l[8]*a,this.y=l[1]*t+l[5]*r+l[9]*a,this.z=l[2]*t+l[6]*r+l[10]*a,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Mt(this.x,e.x,t.x),this.y=Mt(this.y,e.y,t.y),this.z=Mt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Mt(this.x,e,t),this.y=Mt(this.y,e,t),this.z=Mt(this.z,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(Mt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this.z=e.z+(t.z-e.z)*r,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const r=e.x,a=e.y,l=e.z,c=t.x,h=t.y,d=t.z;return this.x=a*d-l*h,this.y=l*c-r*d,this.z=r*h-a*c,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const r=e.dot(this)/t;return this.copy(e).multiplyScalar(r)}projectOnPlane(e){return pf.copy(this).projectOnVector(e),this.sub(pf)}reflect(e){return this.sub(pf.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const r=this.dot(e)/t;return Math.acos(Mt(r,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,r=this.y-e.y,a=this.z-e.z;return t*t+r*r+a*a}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,r){const a=Math.sin(t)*e;return this.x=a*Math.sin(r),this.y=Math.cos(t)*e,this.z=a*Math.cos(r),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,r){return this.x=e*Math.sin(t),this.y=r,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),r=this.setFromMatrixColumn(e,1).length(),a=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=r,this.z=a,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,r=Math.sqrt(1-t*t);return this.x=r*Math.cos(e),this.y=t,this.z=r*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};Hm.prototype.isVector3=!0;let J=Hm;const pf=new J,Yv=new Us,Vm=class Vm{constructor(e,t,r,a,l,c,h,d,f){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,r,a,l,c,h,d,f)}set(e,t,r,a,l,c,h,d,f){const m=this.elements;return m[0]=e,m[1]=a,m[2]=h,m[3]=t,m[4]=l,m[5]=d,m[6]=r,m[7]=c,m[8]=f,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,r=e.elements;return t[0]=r[0],t[1]=r[1],t[2]=r[2],t[3]=r[3],t[4]=r[4],t[5]=r[5],t[6]=r[6],t[7]=r[7],t[8]=r[8],this}extractBasis(e,t,r){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),r.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const r=e.elements,a=t.elements,l=this.elements,c=r[0],h=r[3],d=r[6],f=r[1],m=r[4],g=r[7],v=r[2],x=r[5],M=r[8],b=a[0],y=a[3],S=a[6],P=a[1],L=a[4],R=a[7],D=a[2],N=a[5],F=a[8];return l[0]=c*b+h*P+d*D,l[3]=c*y+h*L+d*N,l[6]=c*S+h*R+d*F,l[1]=f*b+m*P+g*D,l[4]=f*y+m*L+g*N,l[7]=f*S+m*R+g*F,l[2]=v*b+x*P+M*D,l[5]=v*y+x*L+M*N,l[8]=v*S+x*R+M*F,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],h=e[5],d=e[6],f=e[7],m=e[8];return t*c*m-t*h*f-r*l*m+r*h*d+a*l*f-a*c*d}invert(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],h=e[5],d=e[6],f=e[7],m=e[8],g=m*c-h*f,v=h*d-m*l,x=f*l-c*d,M=t*g+r*v+a*x;if(M===0)return this.set(0,0,0,0,0,0,0,0,0);const b=1/M;return e[0]=g*b,e[1]=(a*f-m*r)*b,e[2]=(h*r-a*c)*b,e[3]=v*b,e[4]=(m*t-a*d)*b,e[5]=(a*l-h*t)*b,e[6]=x*b,e[7]=(r*d-f*t)*b,e[8]=(c*t-r*l)*b,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,r,a,l,c,h){const d=Math.cos(l),f=Math.sin(l);return this.set(r*d,r*f,-r*(d*c+f*h)+c+e,-a*f,a*d,-a*(-f*c+d*h)+h+t,0,0,1),this}scale(e,t){return go("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(mf.makeScale(e,t)),this}rotate(e){return go("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(mf.makeRotation(-e)),this}translate(e,t){return go("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(mf.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,-r,0,r,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,r=e.elements;for(let a=0;a<9;a++)if(t[a]!==r[a])return!1;return!0}fromArray(e,t=0){for(let r=0;r<9;r++)this.elements[r]=e[r+t];return this}toArray(e=[],t=0){const r=this.elements;return e[t]=r[0],e[t+1]=r[1],e[t+2]=r[2],e[t+3]=r[3],e[t+4]=r[4],e[t+5]=r[5],e[t+6]=r[6],e[t+7]=r[7],e[t+8]=r[8],e}clone(){return new this.constructor().fromArray(this.elements)}};Vm.prototype.isMatrix3=!0;let pt=Vm;const mf=new pt,Kv=new pt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Qv=new pt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function eT(){const i={enabled:!0,workingColorSpace:sh,spaces:{},convert:function(a,l,c){return this.enabled===!1||l===c||!l||!c||(this.spaces[l].transfer===Bt&&(a.r=Gr(a.r),a.g=Gr(a.g),a.b=Gr(a.b)),this.spaces[l].primaries!==this.spaces[c].primaries&&(a.applyMatrix3(this.spaces[l].toXYZ),a.applyMatrix3(this.spaces[c].fromXYZ)),this.spaces[c].transfer===Bt&&(a.r=vo(a.r),a.g=vo(a.g),a.b=vo(a.b))),a},workingToColorSpace:function(a,l){return this.convert(a,this.workingColorSpace,l)},colorSpaceToWorking:function(a,l){return this.convert(a,l,this.workingColorSpace)},getPrimaries:function(a){return this.spaces[a].primaries},getTransfer:function(a){return a===Ms?ah:this.spaces[a].transfer},getToneMappingMode:function(a){return this.spaces[a].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(a,l=this.workingColorSpace){return a.fromArray(this.spaces[l].luminanceCoefficients)},define:function(a){Object.assign(this.spaces,a)},_getMatrix:function(a,l,c){return a.copy(this.spaces[l].toXYZ).multiply(this.spaces[c].fromXYZ)},_getDrawingBufferColorSpace:function(a){return this.spaces[a].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(a=this.workingColorSpace){return this.spaces[a].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(a,l){return go("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(a,l)},toWorkingColorSpace:function(a,l){return go("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(a,l)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],r=[.3127,.329];return i.define({[sh]:{primaries:e,whitePoint:r,transfer:ah,toXYZ:Kv,fromXYZ:Qv,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Zn},outputColorSpaceConfig:{drawingBufferColorSpace:Zn}},[Zn]:{primaries:e,whitePoint:r,transfer:Bt,toXYZ:Kv,fromXYZ:Qv,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Zn}}}),i}const bt=eT();function Gr(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function vo(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Ya;class tT{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let r;if(e instanceof HTMLCanvasElement)r=e;else{Ya===void 0&&(Ya=$l("canvas")),Ya.width=e.width,Ya.height=e.height;const a=Ya.getContext("2d");e instanceof ImageData?a.putImageData(e,0,0):a.drawImage(e,0,0,e.width,e.height),r=Ya}return r.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=$l("canvas");t.width=e.width,t.height=e.height;const r=t.getContext("2d");r.drawImage(e,0,0,e.width,e.height);const a=r.getImageData(0,0,e.width,e.height),l=a.data;for(let c=0;c<l.length;c++)l[c]=Gr(l[c]/255)*255;return r.putImageData(a,0,0),t}else if(e.data){const t=e.data.slice(0);for(let r=0;r<t.length;r++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[r]=Math.floor(Gr(t[r]/255)*255):t[r]=Gr(t[r]);return{data:t,width:e.width,height:e.height}}else return lt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let nT=0;class Um{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:nT++}),this.uuid=tc(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const r={uuid:this.uuid,url:""},a=this.data;if(a!==null){let l;if(Array.isArray(a)){l=[];for(let c=0,h=a.length;c<h;c++)a[c].isDataTexture?l.push(gf(a[c].image)):l.push(gf(a[c]))}else l=gf(a);r.url=l}return t||(e.images[this.uuid]=r),r}}function gf(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?tT.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(lt("Texture: Unable to serialize Texture."),{})}let iT=0;const vf=new J;class jn extends Os{constructor(e=jn.DEFAULT_IMAGE,t=jn.DEFAULT_MAPPING,r=Hr,a=Hr,l=Wn,c=ua,h=Yi,d=yi,f=jn.DEFAULT_ANISOTROPY,m=Ms){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:iT++}),this.uuid=tc(),this.name="",this.source=new Um(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=r,this.wrapT=a,this.magFilter=l,this.minFilter=c,this.anisotropy=f,this.format=h,this.internalFormat=null,this.type=d,this.offset=new ht(0,0),this.repeat=new ht(1,1),this.center=new ht(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new pt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=m,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(vf).x}get height(){return this.source.getSize(vf).y}get depth(){return this.source.getSize(vf).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const r=e[t];if(r===void 0){lt(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){lt(`Texture.setValues(): property '${t}' does not exist.`);continue}a&&r&&a.isVector2&&r.isVector2||a&&r&&a.isVector3&&r.isVector3||a&&r&&a.isMatrix3&&r.isMatrix3?a.copy(r):this[t]=r}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const r={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(r.userData=this.userData),t||(e.textures[this.uuid]=r),r}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==ty)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Sp:e.x=e.x-Math.floor(e.x);break;case Hr:e.x=e.x<0?0:1;break;case Mp:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Sp:e.y=e.y-Math.floor(e.y);break;case Hr:e.y=e.y<0?0:1;break;case Mp:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}jn.DEFAULT_IMAGE=null;jn.DEFAULT_MAPPING=ty;jn.DEFAULT_ANISOTROPY=1;const Gm=class Gm{constructor(e=0,t=0,r=0,a=1){this.x=e,this.y=t,this.z=r,this.w=a}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,r,a){return this.x=e,this.y=t,this.z=r,this.w=a,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,r=this.y,a=this.z,l=this.w,c=e.elements;return this.x=c[0]*t+c[4]*r+c[8]*a+c[12]*l,this.y=c[1]*t+c[5]*r+c[9]*a+c[13]*l,this.z=c[2]*t+c[6]*r+c[10]*a+c[14]*l,this.w=c[3]*t+c[7]*r+c[11]*a+c[15]*l,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,r,a,l;const d=e.elements,f=d[0],m=d[4],g=d[8],v=d[1],x=d[5],M=d[9],b=d[2],y=d[6],S=d[10];if(Math.abs(m-v)<.01&&Math.abs(g-b)<.01&&Math.abs(M-y)<.01){if(Math.abs(m+v)<.1&&Math.abs(g+b)<.1&&Math.abs(M+y)<.1&&Math.abs(f+x+S-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const L=(f+1)/2,R=(x+1)/2,D=(S+1)/2,N=(m+v)/4,F=(g+b)/4,w=(M+y)/4;return L>R&&L>D?L<.01?(r=0,a=.707106781,l=.707106781):(r=Math.sqrt(L),a=N/r,l=F/r):R>D?R<.01?(r=.707106781,a=0,l=.707106781):(a=Math.sqrt(R),r=N/a,l=w/a):D<.01?(r=.707106781,a=.707106781,l=0):(l=Math.sqrt(D),r=F/l,a=w/l),this.set(r,a,l,t),this}let P=Math.sqrt((y-M)*(y-M)+(g-b)*(g-b)+(v-m)*(v-m));return Math.abs(P)<.001&&(P=1),this.x=(y-M)/P,this.y=(g-b)/P,this.z=(v-m)/P,this.w=Math.acos((f+x+S-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Mt(this.x,e.x,t.x),this.y=Mt(this.y,e.y,t.y),this.z=Mt(this.z,e.z,t.z),this.w=Mt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Mt(this.x,e,t),this.y=Mt(this.y,e,t),this.z=Mt(this.z,e,t),this.w=Mt(this.w,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(Mt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this.z=e.z+(t.z-e.z)*r,this.w=e.w+(t.w-e.w)*r,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};Gm.prototype.isVector4=!0;let ln=Gm;class rT extends Os{constructor(e=1,t=1,r={}){super(),r=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Wn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},r),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=r.depth,this.scissor=new ln(0,0,e,t),this.scissorTest=!1,this.viewport=new ln(0,0,e,t),this.textures=[];const a={width:e,height:t,depth:r.depth},l=new jn(a),c=r.count;for(let h=0;h<c;h++)this.textures[h]=l.clone(),this.textures[h].isRenderTargetTexture=!0,this.textures[h].renderTarget=this;this._setTextureOptions(r),this.depthBuffer=r.depthBuffer,this.stencilBuffer=r.stencilBuffer,this.resolveDepthBuffer=r.resolveDepthBuffer,this.resolveStencilBuffer=r.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=r.depthTexture,this.samples=r.samples,this.multiview=r.multiview,this.useArrayDepthTexture=r.useArrayDepthTexture}_setTextureOptions(e={}){const t={minFilter:Wn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let r=0;r<this.textures.length;r++)this.textures[r].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,r=1){if(this.width!==e||this.height!==t||this.depth!==r){this.width=e,this.height=t,this.depth=r;for(let a=0,l=this.textures.length;a<l;a++)this.textures[a].image.width=e,this.textures[a].image.height=t,this.textures[a].image.depth=r,this.textures[a].isData3DTexture!==!0&&(this.textures[a].isArrayTexture=this.textures[a].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,r=e.textures.length;t<r;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const a=Object.assign({},e.textures[t].image);this.textures[t].source=new Um(a)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class mr extends rT{constructor(e=1,t=1,r={}){super(e,t,r),this.isWebGLRenderTarget=!0}}class uy extends jn{constructor(e=null,t=1,r=1,a=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:r,depth:a},this.magFilter=Un,this.minFilter=Un,this.wrapR=Hr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class sT extends jn{constructor(e=null,t=1,r=1,a=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:r,depth:a},this.magFilter=Un,this.minFilter=Un,this.wrapR=Hr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const uh=class uh{constructor(e,t,r,a,l,c,h,d,f,m,g,v,x,M,b,y){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,r,a,l,c,h,d,f,m,g,v,x,M,b,y)}set(e,t,r,a,l,c,h,d,f,m,g,v,x,M,b,y){const S=this.elements;return S[0]=e,S[4]=t,S[8]=r,S[12]=a,S[1]=l,S[5]=c,S[9]=h,S[13]=d,S[2]=f,S[6]=m,S[10]=g,S[14]=v,S[3]=x,S[7]=M,S[11]=b,S[15]=y,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new uh().fromArray(this.elements)}copy(e){const t=this.elements,r=e.elements;return t[0]=r[0],t[1]=r[1],t[2]=r[2],t[3]=r[3],t[4]=r[4],t[5]=r[5],t[6]=r[6],t[7]=r[7],t[8]=r[8],t[9]=r[9],t[10]=r[10],t[11]=r[11],t[12]=r[12],t[13]=r[13],t[14]=r[14],t[15]=r[15],this}copyPosition(e){const t=this.elements,r=e.elements;return t[12]=r[12],t[13]=r[13],t[14]=r[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,r){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),r.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),r.setFromMatrixColumn(this,2),this)}makeBasis(e,t,r){return this.set(e.x,t.x,r.x,0,e.y,t.y,r.y,0,e.z,t.z,r.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();const t=this.elements,r=e.elements,a=1/Ka.setFromMatrixColumn(e,0).length(),l=1/Ka.setFromMatrixColumn(e,1).length(),c=1/Ka.setFromMatrixColumn(e,2).length();return t[0]=r[0]*a,t[1]=r[1]*a,t[2]=r[2]*a,t[3]=0,t[4]=r[4]*l,t[5]=r[5]*l,t[6]=r[6]*l,t[7]=0,t[8]=r[8]*c,t[9]=r[9]*c,t[10]=r[10]*c,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,r=e.x,a=e.y,l=e.z,c=Math.cos(r),h=Math.sin(r),d=Math.cos(a),f=Math.sin(a),m=Math.cos(l),g=Math.sin(l);if(e.order==="XYZ"){const v=c*m,x=c*g,M=h*m,b=h*g;t[0]=d*m,t[4]=-d*g,t[8]=f,t[1]=x+M*f,t[5]=v-b*f,t[9]=-h*d,t[2]=b-v*f,t[6]=M+x*f,t[10]=c*d}else if(e.order==="YXZ"){const v=d*m,x=d*g,M=f*m,b=f*g;t[0]=v+b*h,t[4]=M*h-x,t[8]=c*f,t[1]=c*g,t[5]=c*m,t[9]=-h,t[2]=x*h-M,t[6]=b+v*h,t[10]=c*d}else if(e.order==="ZXY"){const v=d*m,x=d*g,M=f*m,b=f*g;t[0]=v-b*h,t[4]=-c*g,t[8]=M+x*h,t[1]=x+M*h,t[5]=c*m,t[9]=b-v*h,t[2]=-c*f,t[6]=h,t[10]=c*d}else if(e.order==="ZYX"){const v=c*m,x=c*g,M=h*m,b=h*g;t[0]=d*m,t[4]=M*f-x,t[8]=v*f+b,t[1]=d*g,t[5]=b*f+v,t[9]=x*f-M,t[2]=-f,t[6]=h*d,t[10]=c*d}else if(e.order==="YZX"){const v=c*d,x=c*f,M=h*d,b=h*f;t[0]=d*m,t[4]=b-v*g,t[8]=M*g+x,t[1]=g,t[5]=c*m,t[9]=-h*m,t[2]=-f*m,t[6]=x*g+M,t[10]=v-b*g}else if(e.order==="XZY"){const v=c*d,x=c*f,M=h*d,b=h*f;t[0]=d*m,t[4]=-g,t[8]=f*m,t[1]=v*g+b,t[5]=c*m,t[9]=x*g-M,t[2]=M*g-x,t[6]=h*m,t[10]=b*g+v}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(aT,e,oT)}lookAt(e,t,r){const a=this.elements;return gi.subVectors(e,t),gi.lengthSq()===0&&(gi.z=1),gi.normalize(),ps.crossVectors(r,gi),ps.lengthSq()===0&&(Math.abs(r.z)===1?gi.x+=1e-4:gi.z+=1e-4,gi.normalize(),ps.crossVectors(r,gi)),ps.normalize(),pu.crossVectors(gi,ps),a[0]=ps.x,a[4]=pu.x,a[8]=gi.x,a[1]=ps.y,a[5]=pu.y,a[9]=gi.y,a[2]=ps.z,a[6]=pu.z,a[10]=gi.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const r=e.elements,a=t.elements,l=this.elements,c=r[0],h=r[4],d=r[8],f=r[12],m=r[1],g=r[5],v=r[9],x=r[13],M=r[2],b=r[6],y=r[10],S=r[14],P=r[3],L=r[7],R=r[11],D=r[15],N=a[0],F=a[4],w=a[8],I=a[12],G=a[1],V=a[5],Y=a[9],me=a[13],de=a[2],O=a[6],ce=a[10],Q=a[14],$=a[3],ne=a[7],he=a[11],k=a[15];return l[0]=c*N+h*G+d*de+f*$,l[4]=c*F+h*V+d*O+f*ne,l[8]=c*w+h*Y+d*ce+f*he,l[12]=c*I+h*me+d*Q+f*k,l[1]=m*N+g*G+v*de+x*$,l[5]=m*F+g*V+v*O+x*ne,l[9]=m*w+g*Y+v*ce+x*he,l[13]=m*I+g*me+v*Q+x*k,l[2]=M*N+b*G+y*de+S*$,l[6]=M*F+b*V+y*O+S*ne,l[10]=M*w+b*Y+y*ce+S*he,l[14]=M*I+b*me+y*Q+S*k,l[3]=P*N+L*G+R*de+D*$,l[7]=P*F+L*V+R*O+D*ne,l[11]=P*w+L*Y+R*ce+D*he,l[15]=P*I+L*me+R*Q+D*k,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],r=e[4],a=e[8],l=e[12],c=e[1],h=e[5],d=e[9],f=e[13],m=e[2],g=e[6],v=e[10],x=e[14],M=e[3],b=e[7],y=e[11],S=e[15],P=d*x-f*v,L=h*x-f*g,R=h*v-d*g,D=c*x-f*m,N=c*v-d*m,F=c*g-h*m;return t*(b*P-y*L+S*R)-r*(M*P-y*D+S*N)+a*(M*L-b*D+S*F)-l*(M*R-b*N+y*F)}determinantAffine(){const e=this.elements,t=e[0],r=e[4],a=e[8],l=e[1],c=e[5],h=e[9],d=e[2],f=e[6],m=e[10];return t*(c*m-h*f)-r*(l*m-h*d)+a*(l*f-c*d)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,r){const a=this.elements;return e.isVector3?(a[12]=e.x,a[13]=e.y,a[14]=e.z):(a[12]=e,a[13]=t,a[14]=r),this}invert(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],h=e[5],d=e[6],f=e[7],m=e[8],g=e[9],v=e[10],x=e[11],M=e[12],b=e[13],y=e[14],S=e[15],P=t*h-r*c,L=t*d-a*c,R=t*f-l*c,D=r*d-a*h,N=r*f-l*h,F=a*f-l*d,w=m*b-g*M,I=m*y-v*M,G=m*S-x*M,V=g*y-v*b,Y=g*S-x*b,me=v*S-x*y,de=P*me-L*Y+R*V+D*G-N*I+F*w;if(de===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const O=1/de;return e[0]=(h*me-d*Y+f*V)*O,e[1]=(a*Y-r*me-l*V)*O,e[2]=(b*F-y*N+S*D)*O,e[3]=(v*N-g*F-x*D)*O,e[4]=(d*G-c*me-f*I)*O,e[5]=(t*me-a*G+l*I)*O,e[6]=(y*R-M*F-S*L)*O,e[7]=(m*F-v*R+x*L)*O,e[8]=(c*Y-h*G+f*w)*O,e[9]=(r*G-t*Y-l*w)*O,e[10]=(M*N-b*R+S*P)*O,e[11]=(g*R-m*N-x*P)*O,e[12]=(h*I-c*V-d*w)*O,e[13]=(t*V-r*I+a*w)*O,e[14]=(b*L-M*D-y*P)*O,e[15]=(m*D-g*L+v*P)*O,this}scale(e){const t=this.elements,r=e.x,a=e.y,l=e.z;return t[0]*=r,t[4]*=a,t[8]*=l,t[1]*=r,t[5]*=a,t[9]*=l,t[2]*=r,t[6]*=a,t[10]*=l,t[3]*=r,t[7]*=a,t[11]*=l,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],r=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],a=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,r,a))}makeTranslation(e,t,r){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,r,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),r=Math.sin(e);return this.set(1,0,0,0,0,t,-r,0,0,r,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,0,r,0,0,1,0,0,-r,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,-r,0,0,r,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const r=Math.cos(t),a=Math.sin(t),l=1-r,c=e.x,h=e.y,d=e.z,f=l*c,m=l*h;return this.set(f*c+r,f*h-a*d,f*d+a*h,0,f*h+a*d,m*h+r,m*d-a*c,0,f*d-a*h,m*d+a*c,l*d*d+r,0,0,0,0,1),this}makeScale(e,t,r){return this.set(e,0,0,0,0,t,0,0,0,0,r,0,0,0,0,1),this}makeShear(e,t,r,a,l,c){return this.set(1,r,l,0,e,1,c,0,t,a,1,0,0,0,0,1),this}compose(e,t,r){const a=this.elements,l=t._x,c=t._y,h=t._z,d=t._w,f=l+l,m=c+c,g=h+h,v=l*f,x=l*m,M=l*g,b=c*m,y=c*g,S=h*g,P=d*f,L=d*m,R=d*g,D=r.x,N=r.y,F=r.z;return a[0]=(1-(b+S))*D,a[1]=(x+R)*D,a[2]=(M-L)*D,a[3]=0,a[4]=(x-R)*N,a[5]=(1-(v+S))*N,a[6]=(y+P)*N,a[7]=0,a[8]=(M+L)*F,a[9]=(y-P)*F,a[10]=(1-(v+b))*F,a[11]=0,a[12]=e.x,a[13]=e.y,a[14]=e.z,a[15]=1,this}decompose(e,t,r){const a=this.elements;e.x=a[12],e.y=a[13],e.z=a[14];const l=this.determinantAffine();if(l===0)return r.set(1,1,1),t.identity(),this;let c=Ka.set(a[0],a[1],a[2]).length();const h=Ka.set(a[4],a[5],a[6]).length(),d=Ka.set(a[8],a[9],a[10]).length();l<0&&(c=-c),Gi.copy(this);const f=1/c,m=1/h,g=1/d;return Gi.elements[0]*=f,Gi.elements[1]*=f,Gi.elements[2]*=f,Gi.elements[4]*=m,Gi.elements[5]*=m,Gi.elements[6]*=m,Gi.elements[8]*=g,Gi.elements[9]*=g,Gi.elements[10]*=g,t.setFromRotationMatrix(Gi),r.x=c,r.y=h,r.z=d,this}makePerspective(e,t,r,a,l,c,h=fr,d=!1){const f=this.elements,m=2*l/(t-e),g=2*l/(r-a),v=(t+e)/(t-e),x=(r+a)/(r-a);let M,b;if(d)M=l/(c-l),b=c*l/(c-l);else if(h===fr)M=-(c+l)/(c-l),b=-2*c*l/(c-l);else if(h===Xl)M=-c/(c-l),b=-c*l/(c-l);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+h);return f[0]=m,f[4]=0,f[8]=v,f[12]=0,f[1]=0,f[5]=g,f[9]=x,f[13]=0,f[2]=0,f[6]=0,f[10]=M,f[14]=b,f[3]=0,f[7]=0,f[11]=-1,f[15]=0,this}makeOrthographic(e,t,r,a,l,c,h=fr,d=!1){const f=this.elements,m=2/(t-e),g=2/(r-a),v=-(t+e)/(t-e),x=-(r+a)/(r-a);let M,b;if(d)M=1/(c-l),b=c/(c-l);else if(h===fr)M=-2/(c-l),b=-(c+l)/(c-l);else if(h===Xl)M=-1/(c-l),b=-l/(c-l);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+h);return f[0]=m,f[4]=0,f[8]=0,f[12]=v,f[1]=0,f[5]=g,f[9]=0,f[13]=x,f[2]=0,f[6]=0,f[10]=M,f[14]=b,f[3]=0,f[7]=0,f[11]=0,f[15]=1,this}equals(e){const t=this.elements,r=e.elements;for(let a=0;a<16;a++)if(t[a]!==r[a])return!1;return!0}fromArray(e,t=0){for(let r=0;r<16;r++)this.elements[r]=e[r+t];return this}toArray(e=[],t=0){const r=this.elements;return e[t]=r[0],e[t+1]=r[1],e[t+2]=r[2],e[t+3]=r[3],e[t+4]=r[4],e[t+5]=r[5],e[t+6]=r[6],e[t+7]=r[7],e[t+8]=r[8],e[t+9]=r[9],e[t+10]=r[10],e[t+11]=r[11],e[t+12]=r[12],e[t+13]=r[13],e[t+14]=r[14],e[t+15]=r[15],e}};uh.prototype.isMatrix4=!0;let rn=uh;const Ka=new J,Gi=new rn,aT=new J(0,0,0),oT=new J(1,1,1),ps=new J,pu=new J,gi=new J,Zv=new rn,Jv=new Us;class qr{constructor(e=0,t=0,r=0,a=qr.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=r,this._order=a}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,r,a=this._order){return this._x=e,this._y=t,this._z=r,this._order=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,r=!0){const a=e.elements,l=a[0],c=a[4],h=a[8],d=a[1],f=a[5],m=a[9],g=a[2],v=a[6],x=a[10];switch(t){case"XYZ":this._y=Math.asin(Mt(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(-m,x),this._z=Math.atan2(-c,l)):(this._x=Math.atan2(v,f),this._z=0);break;case"YXZ":this._x=Math.asin(-Mt(m,-1,1)),Math.abs(m)<.9999999?(this._y=Math.atan2(h,x),this._z=Math.atan2(d,f)):(this._y=Math.atan2(-g,l),this._z=0);break;case"ZXY":this._x=Math.asin(Mt(v,-1,1)),Math.abs(v)<.9999999?(this._y=Math.atan2(-g,x),this._z=Math.atan2(-c,f)):(this._y=0,this._z=Math.atan2(d,l));break;case"ZYX":this._y=Math.asin(-Mt(g,-1,1)),Math.abs(g)<.9999999?(this._x=Math.atan2(v,x),this._z=Math.atan2(d,l)):(this._x=0,this._z=Math.atan2(-c,f));break;case"YZX":this._z=Math.asin(Mt(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(-m,f),this._y=Math.atan2(-g,l)):(this._x=0,this._y=Math.atan2(h,x));break;case"XZY":this._z=Math.asin(-Mt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(v,f),this._y=Math.atan2(h,l)):(this._x=Math.atan2(-m,x),this._y=0);break;default:lt("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,r===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,r){return Zv.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Zv,t,r)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Jv.setFromEuler(this),this.setFromQuaternion(Jv,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}qr.DEFAULT_ORDER="XYZ";class hy{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let lT=0;const ex=new J,Qa=new Us,Ar=new rn,mu=new J,Rl=new J,cT=new J,uT=new Us,tx=new J(1,0,0),nx=new J(0,1,0),ix=new J(0,0,1),rx={type:"added"},hT={type:"removed"},Za={type:"childadded",child:null},xf={type:"childremoved",child:null};class En extends Os{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:lT++}),this.uuid=tc(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=En.DEFAULT_UP.clone();const e=new J,t=new qr,r=new Us,a=new J(1,1,1);function l(){r.setFromEuler(t,!1)}function c(){t.setFromQuaternion(r,void 0,!1)}t._onChange(l),r._onChange(c),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:a},modelViewMatrix:{value:new rn},normalMatrix:{value:new pt}}),this.matrix=new rn,this.matrixWorld=new rn,this.matrixAutoUpdate=En.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=En.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new hy,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Qa.setFromAxisAngle(e,t),this.quaternion.multiply(Qa),this}rotateOnWorldAxis(e,t){return Qa.setFromAxisAngle(e,t),this.quaternion.premultiply(Qa),this}rotateX(e){return this.rotateOnAxis(tx,e)}rotateY(e){return this.rotateOnAxis(nx,e)}rotateZ(e){return this.rotateOnAxis(ix,e)}translateOnAxis(e,t){return ex.copy(e).applyQuaternion(this.quaternion),this.position.add(ex.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(tx,e)}translateY(e){return this.translateOnAxis(nx,e)}translateZ(e){return this.translateOnAxis(ix,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Ar.copy(this.matrixWorld).invert())}lookAt(e,t,r){e.isVector3?mu.copy(e):mu.set(e,t,r);const a=this.parent;this.updateWorldMatrix(!0,!1),Rl.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Ar.lookAt(Rl,mu,this.up):Ar.lookAt(mu,Rl,this.up),this.quaternion.setFromRotationMatrix(Ar),a&&(Ar.extractRotation(a.matrixWorld),Qa.setFromRotationMatrix(Ar),this.quaternion.premultiply(Qa.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Nt("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(rx),Za.child=e,this.dispatchEvent(Za),Za.child=null):Nt("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let r=0;r<arguments.length;r++)this.remove(arguments[r]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(hT),xf.child=e,this.dispatchEvent(xf),xf.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Ar.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Ar.multiply(e.parent.matrixWorld)),e.applyMatrix4(Ar),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(rx),Za.child=e,this.dispatchEvent(Za),Za.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let r=0,a=this.children.length;r<a;r++){const c=this.children[r].getObjectByProperty(e,t);if(c!==void 0)return c}}getObjectsByProperty(e,t,r=[]){this[e]===t&&r.push(this);const a=this.children;for(let l=0,c=a.length;l<c;l++)a[l].getObjectsByProperty(e,t,r);return r}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Rl,e,cT),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Rl,uT,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,r=e.y,a=e.z,l=this.matrix.elements;l[12]+=t-l[0]*t-l[4]*r-l[8]*a,l[13]+=r-l[1]*t-l[5]*r-l[9]*a,l[14]+=a-l[2]*t-l[6]*r-l[10]*a}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].updateMatrixWorld(e)}updateWorldMatrix(e,t,r=!1){const a=this.parent;if(e===!0&&a!==null&&a.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||r)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,r=!0),t===!0){const l=this.children;for(let c=0,h=l.length;c<h;c++)l[c].updateWorldMatrix(!1,!0,r)}}toJSON(e){const t=e===void 0||typeof e=="string",r={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},r.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const a={};a.uuid=this.uuid,a.type=this.type,this.name!==""&&(a.name=this.name),this.castShadow===!0&&(a.castShadow=!0),this.receiveShadow===!0&&(a.receiveShadow=!0),this.visible===!1&&(a.visible=!1),this.frustumCulled===!1&&(a.frustumCulled=!1),this.renderOrder!==0&&(a.renderOrder=this.renderOrder),this.static!==!1&&(a.static=this.static),Object.keys(this.userData).length>0&&(a.userData=this.userData),a.layers=this.layers.mask,a.matrix=this.matrix.toArray(),a.up=this.up.toArray(),this.pivot!==null&&(a.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(a.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(a.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(a.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(a.type="InstancedMesh",a.count=this.count,a.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(a.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(a.type="BatchedMesh",a.perObjectFrustumCulled=this.perObjectFrustumCulled,a.sortObjects=this.sortObjects,a.drawRanges=this._drawRanges,a.reservedRanges=this._reservedRanges,a.geometryInfo=this._geometryInfo.map(h=>({...h,boundingBox:h.boundingBox?h.boundingBox.toJSON():void 0,boundingSphere:h.boundingSphere?h.boundingSphere.toJSON():void 0})),a.instanceInfo=this._instanceInfo.map(h=>({...h})),a.availableInstanceIds=this._availableInstanceIds.slice(),a.availableGeometryIds=this._availableGeometryIds.slice(),a.nextIndexStart=this._nextIndexStart,a.nextVertexStart=this._nextVertexStart,a.geometryCount=this._geometryCount,a.maxInstanceCount=this._maxInstanceCount,a.maxVertexCount=this._maxVertexCount,a.maxIndexCount=this._maxIndexCount,a.geometryInitialized=this._geometryInitialized,a.matricesTexture=this._matricesTexture.toJSON(e),a.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(a.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(a.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(a.boundingBox=this.boundingBox.toJSON()));function l(h,d){return h[d.uuid]===void 0&&(h[d.uuid]=d.toJSON(e)),d.uuid}if(this.isScene)this.background&&(this.background.isColor?a.background=this.background.toJSON():this.background.isTexture&&(a.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(a.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){a.geometry=l(e.geometries,this.geometry);const h=this.geometry.parameters;if(h!==void 0&&h.shapes!==void 0){const d=h.shapes;if(Array.isArray(d))for(let f=0,m=d.length;f<m;f++){const g=d[f];l(e.shapes,g)}else l(e.shapes,d)}}if(this.isSkinnedMesh&&(a.bindMode=this.bindMode,a.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(l(e.skeletons,this.skeleton),a.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const h=[];for(let d=0,f=this.material.length;d<f;d++)h.push(l(e.materials,this.material[d]));a.material=h}else a.material=l(e.materials,this.material);if(this.children.length>0){a.children=[];for(let h=0;h<this.children.length;h++)a.children.push(this.children[h].toJSON(e).object)}if(this.animations.length>0){a.animations=[];for(let h=0;h<this.animations.length;h++){const d=this.animations[h];a.animations.push(l(e.animations,d))}}if(t){const h=c(e.geometries),d=c(e.materials),f=c(e.textures),m=c(e.images),g=c(e.shapes),v=c(e.skeletons),x=c(e.animations),M=c(e.nodes);h.length>0&&(r.geometries=h),d.length>0&&(r.materials=d),f.length>0&&(r.textures=f),m.length>0&&(r.images=m),g.length>0&&(r.shapes=g),v.length>0&&(r.skeletons=v),x.length>0&&(r.animations=x),M.length>0&&(r.nodes=M)}return r.object=a,r;function c(h){const d=[];for(const f in h){const m=h[f];delete m.metadata,d.push(m)}return d}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let r=0;r<e.children.length;r++){const a=e.children[r];this.add(a.clone())}return this}}En.DEFAULT_UP=new J(0,1,0);En.DEFAULT_MATRIX_AUTO_UPDATE=!0;En.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class Fl extends En{constructor(){super(),this.isGroup=!0,this.type="Group"}}const dT={type:"move"};class _f{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Fl,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Fl,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new J,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new J),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Fl,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new J,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new J,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const r of e.hand.values())this._getHandJoint(t,r)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,r){let a=null,l=null,c=null;const h=this._targetRay,d=this._grip,f=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(f&&e.hand){c=!0;for(const b of e.hand.values()){const y=t.getJointPose(b,r),S=this._getHandJoint(f,b);y!==null&&(S.matrix.fromArray(y.transform.matrix),S.matrix.decompose(S.position,S.rotation,S.scale),S.matrixWorldNeedsUpdate=!0,S.jointRadius=y.radius),S.visible=y!==null}const m=f.joints["index-finger-tip"],g=f.joints["thumb-tip"],v=m.position.distanceTo(g.position),x=.02,M=.005;f.inputState.pinching&&v>x+M?(f.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!f.inputState.pinching&&v<=x-M&&(f.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else d!==null&&e.gripSpace&&(l=t.getPose(e.gripSpace,r),l!==null&&(d.matrix.fromArray(l.transform.matrix),d.matrix.decompose(d.position,d.rotation,d.scale),d.matrixWorldNeedsUpdate=!0,l.linearVelocity?(d.hasLinearVelocity=!0,d.linearVelocity.copy(l.linearVelocity)):d.hasLinearVelocity=!1,l.angularVelocity?(d.hasAngularVelocity=!0,d.angularVelocity.copy(l.angularVelocity)):d.hasAngularVelocity=!1,d.eventsEnabled&&d.dispatchEvent({type:"gripUpdated",data:e,target:this})));h!==null&&(a=t.getPose(e.targetRaySpace,r),a===null&&l!==null&&(a=l),a!==null&&(h.matrix.fromArray(a.transform.matrix),h.matrix.decompose(h.position,h.rotation,h.scale),h.matrixWorldNeedsUpdate=!0,a.linearVelocity?(h.hasLinearVelocity=!0,h.linearVelocity.copy(a.linearVelocity)):h.hasLinearVelocity=!1,a.angularVelocity?(h.hasAngularVelocity=!0,h.angularVelocity.copy(a.angularVelocity)):h.hasAngularVelocity=!1,this.dispatchEvent(dT)))}return h!==null&&(h.visible=a!==null),d!==null&&(d.visible=l!==null),f!==null&&(f.visible=c!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const r=new Fl;r.matrixAutoUpdate=!1,r.visible=!1,e.joints[t.jointName]=r,e.add(r)}return e.joints[t.jointName]}}const dy={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},ms={h:0,s:0,l:0},gu={h:0,s:0,l:0};function yf(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class gt{constructor(e,t,r){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,r)}set(e,t,r){if(t===void 0&&r===void 0){const a=e;a&&a.isColor?this.copy(a):typeof a=="number"?this.setHex(a):typeof a=="string"&&this.setStyle(a)}else this.setRGB(e,t,r);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Zn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,bt.colorSpaceToWorking(this,t),this}setRGB(e,t,r,a=bt.workingColorSpace){return this.r=e,this.g=t,this.b=r,bt.colorSpaceToWorking(this,a),this}setHSL(e,t,r,a=bt.workingColorSpace){if(e=Zw(e,1),t=Mt(t,0,1),r=Mt(r,0,1),t===0)this.r=this.g=this.b=r;else{const l=r<=.5?r*(1+t):r+t-r*t,c=2*r-l;this.r=yf(c,l,e+1/3),this.g=yf(c,l,e),this.b=yf(c,l,e-1/3)}return bt.colorSpaceToWorking(this,a),this}setStyle(e,t=Zn){function r(l){l!==void 0&&parseFloat(l)<1&&lt("Color: Alpha component of "+e+" will be ignored.")}let a;if(a=/^(\w+)\(([^\)]*)\)/.exec(e)){let l;const c=a[1],h=a[2];switch(c){case"rgb":case"rgba":if(l=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(h))return r(l[4]),this.setRGB(Math.min(255,parseInt(l[1],10))/255,Math.min(255,parseInt(l[2],10))/255,Math.min(255,parseInt(l[3],10))/255,t);if(l=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(h))return r(l[4]),this.setRGB(Math.min(100,parseInt(l[1],10))/100,Math.min(100,parseInt(l[2],10))/100,Math.min(100,parseInt(l[3],10))/100,t);break;case"hsl":case"hsla":if(l=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(h))return r(l[4]),this.setHSL(parseFloat(l[1])/360,parseFloat(l[2])/100,parseFloat(l[3])/100,t);break;default:lt("Color: Unknown color model "+e)}}else if(a=/^\#([A-Fa-f\d]+)$/.exec(e)){const l=a[1],c=l.length;if(c===3)return this.setRGB(parseInt(l.charAt(0),16)/15,parseInt(l.charAt(1),16)/15,parseInt(l.charAt(2),16)/15,t);if(c===6)return this.setHex(parseInt(l,16),t);lt("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Zn){const r=dy[e.toLowerCase()];return r!==void 0?this.setHex(r,t):lt("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Gr(e.r),this.g=Gr(e.g),this.b=Gr(e.b),this}copyLinearToSRGB(e){return this.r=vo(e.r),this.g=vo(e.g),this.b=vo(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Zn){return bt.workingToColorSpace(Vn.copy(this),e),Math.round(Mt(Vn.r*255,0,255))*65536+Math.round(Mt(Vn.g*255,0,255))*256+Math.round(Mt(Vn.b*255,0,255))}getHexString(e=Zn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=bt.workingColorSpace){bt.workingToColorSpace(Vn.copy(this),t);const r=Vn.r,a=Vn.g,l=Vn.b,c=Math.max(r,a,l),h=Math.min(r,a,l);let d,f;const m=(h+c)/2;if(h===c)d=0,f=0;else{const g=c-h;switch(f=m<=.5?g/(c+h):g/(2-c-h),c){case r:d=(a-l)/g+(a<l?6:0);break;case a:d=(l-r)/g+2;break;case l:d=(r-a)/g+4;break}d/=6}return e.h=d,e.s=f,e.l=m,e}getRGB(e,t=bt.workingColorSpace){return bt.workingToColorSpace(Vn.copy(this),t),e.r=Vn.r,e.g=Vn.g,e.b=Vn.b,e}getStyle(e=Zn){bt.workingToColorSpace(Vn.copy(this),e);const t=Vn.r,r=Vn.g,a=Vn.b;return e!==Zn?`color(${e} ${t.toFixed(3)} ${r.toFixed(3)} ${a.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(r*255)},${Math.round(a*255)})`}offsetHSL(e,t,r){return this.getHSL(ms),this.setHSL(ms.h+e,ms.s+t,ms.l+r)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,r){return this.r=e.r+(t.r-e.r)*r,this.g=e.g+(t.g-e.g)*r,this.b=e.b+(t.b-e.b)*r,this}lerpHSL(e,t){this.getHSL(ms),e.getHSL(gu);const r=ff(ms.h,gu.h,t),a=ff(ms.s,gu.s,t),l=ff(ms.l,gu.l,t);return this.setHSL(r,a,l),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,r=this.g,a=this.b,l=e.elements;return this.r=l[0]*t+l[3]*r+l[6]*a,this.g=l[1]*t+l[4]*r+l[7]*a,this.b=l[2]*t+l[5]*r+l[8]*a,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Vn=new gt;gt.NAMES=dy;class fT extends En{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new qr,this.environmentIntensity=1,this.environmentRotation=new qr,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const Wi=new J,Pr=new J,Sf=new J,Nr=new J,Ja=new J,eo=new J,sx=new J,Mf=new J,Ef=new J,wf=new J,Tf=new ln,bf=new ln,Rf=new ln;class qi{constructor(e=new J,t=new J,r=new J){this.a=e,this.b=t,this.c=r}static getNormal(e,t,r,a){a.subVectors(r,t),Wi.subVectors(e,t),a.cross(Wi);const l=a.lengthSq();return l>0?a.multiplyScalar(1/Math.sqrt(l)):a.set(0,0,0)}static getBarycoord(e,t,r,a,l){Wi.subVectors(a,t),Pr.subVectors(r,t),Sf.subVectors(e,t);const c=Wi.dot(Wi),h=Wi.dot(Pr),d=Wi.dot(Sf),f=Pr.dot(Pr),m=Pr.dot(Sf),g=c*f-h*h;if(g===0)return l.set(0,0,0),null;const v=1/g,x=(f*d-h*m)*v,M=(c*m-h*d)*v;return l.set(1-x-M,M,x)}static containsPoint(e,t,r,a){return this.getBarycoord(e,t,r,a,Nr)===null?!1:Nr.x>=0&&Nr.y>=0&&Nr.x+Nr.y<=1}static getInterpolation(e,t,r,a,l,c,h,d){return this.getBarycoord(e,t,r,a,Nr)===null?(d.x=0,d.y=0,"z"in d&&(d.z=0),"w"in d&&(d.w=0),null):(d.setScalar(0),d.addScaledVector(l,Nr.x),d.addScaledVector(c,Nr.y),d.addScaledVector(h,Nr.z),d)}static getInterpolatedAttribute(e,t,r,a,l,c){return Tf.setScalar(0),bf.setScalar(0),Rf.setScalar(0),Tf.fromBufferAttribute(e,t),bf.fromBufferAttribute(e,r),Rf.fromBufferAttribute(e,a),c.setScalar(0),c.addScaledVector(Tf,l.x),c.addScaledVector(bf,l.y),c.addScaledVector(Rf,l.z),c}static isFrontFacing(e,t,r,a){return Wi.subVectors(r,t),Pr.subVectors(e,t),Wi.cross(Pr).dot(a)<0}set(e,t,r){return this.a.copy(e),this.b.copy(t),this.c.copy(r),this}setFromPointsAndIndices(e,t,r,a){return this.a.copy(e[t]),this.b.copy(e[r]),this.c.copy(e[a]),this}setFromAttributeAndIndices(e,t,r,a){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,r),this.c.fromBufferAttribute(e,a),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Wi.subVectors(this.c,this.b),Pr.subVectors(this.a,this.b),Wi.cross(Pr).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return qi.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return qi.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,r,a,l){return qi.getInterpolation(e,this.a,this.b,this.c,t,r,a,l)}containsPoint(e){return qi.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return qi.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const r=this.a,a=this.b,l=this.c;let c,h;Ja.subVectors(a,r),eo.subVectors(l,r),Mf.subVectors(e,r);const d=Ja.dot(Mf),f=eo.dot(Mf);if(d<=0&&f<=0)return t.copy(r);Ef.subVectors(e,a);const m=Ja.dot(Ef),g=eo.dot(Ef);if(m>=0&&g<=m)return t.copy(a);const v=d*g-m*f;if(v<=0&&d>=0&&m<=0)return c=d/(d-m),t.copy(r).addScaledVector(Ja,c);wf.subVectors(e,l);const x=Ja.dot(wf),M=eo.dot(wf);if(M>=0&&x<=M)return t.copy(l);const b=x*f-d*M;if(b<=0&&f>=0&&M<=0)return h=f/(f-M),t.copy(r).addScaledVector(eo,h);const y=m*M-x*g;if(y<=0&&g-m>=0&&x-M>=0)return sx.subVectors(l,a),h=(g-m)/(g-m+(x-M)),t.copy(a).addScaledVector(sx,h);const S=1/(y+b+v);return c=b*S,h=v*S,t.copy(r).addScaledVector(Ja,c).addScaledVector(eo,h)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class Ho{constructor(e=new J(1/0,1/0,1/0),t=new J(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,r=e.length;t<r;t+=3)this.expandByPoint(ji.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,r=e.count;t<r;t++)this.expandByPoint(ji.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,r=e.length;t<r;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const r=ji.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(r),this.max.copy(e).add(r),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const r=e.geometry;if(r!==void 0){const l=r.getAttribute("position");if(t===!0&&l!==void 0&&e.isInstancedMesh!==!0)for(let c=0,h=l.count;c<h;c++)e.isMesh===!0?e.getVertexPosition(c,ji):ji.fromBufferAttribute(l,c),ji.applyMatrix4(e.matrixWorld),this.expandByPoint(ji);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),vu.copy(e.boundingBox)):(r.boundingBox===null&&r.computeBoundingBox(),vu.copy(r.boundingBox)),vu.applyMatrix4(e.matrixWorld),this.union(vu)}const a=e.children;for(let l=0,c=a.length;l<c;l++)this.expandByObject(a[l],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,ji),ji.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,r;return e.normal.x>0?(t=e.normal.x*this.min.x,r=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,r=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,r+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,r+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,r+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,r+=e.normal.z*this.min.z),t<=-e.constant&&r>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Cl),xu.subVectors(this.max,Cl),to.subVectors(e.a,Cl),no.subVectors(e.b,Cl),io.subVectors(e.c,Cl),gs.subVectors(no,to),vs.subVectors(io,no),na.subVectors(to,io);let t=[0,-gs.z,gs.y,0,-vs.z,vs.y,0,-na.z,na.y,gs.z,0,-gs.x,vs.z,0,-vs.x,na.z,0,-na.x,-gs.y,gs.x,0,-vs.y,vs.x,0,-na.y,na.x,0];return!Cf(t,to,no,io,xu)||(t=[1,0,0,0,1,0,0,0,1],!Cf(t,to,no,io,xu))?!1:(_u.crossVectors(gs,vs),t=[_u.x,_u.y,_u.z],Cf(t,to,no,io,xu))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,ji).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(ji).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Lr[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Lr[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Lr[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Lr[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Lr[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Lr[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Lr[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Lr[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Lr),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Lr=[new J,new J,new J,new J,new J,new J,new J,new J],ji=new J,vu=new Ho,to=new J,no=new J,io=new J,gs=new J,vs=new J,na=new J,Cl=new J,xu=new J,_u=new J,ia=new J;function Cf(i,e,t,r,a){for(let l=0,c=i.length-3;l<=c;l+=3){ia.fromArray(i,l);const h=a.x*Math.abs(ia.x)+a.y*Math.abs(ia.y)+a.z*Math.abs(ia.z),d=e.dot(ia),f=t.dot(ia),m=r.dot(ia);if(Math.max(-Math.max(d,f,m),Math.min(d,f,m))>h)return!1}return!0}const mn=new J,yu=new ht;let pT=0;class gr extends Os{constructor(e,t,r=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:pT++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=r,this.usage=jv,this.updateRanges=[],this.gpuType=dr,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,r){e*=this.itemSize,r*=t.itemSize;for(let a=0,l=this.itemSize;a<l;a++)this.array[e+a]=t.array[r+a];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,r=this.count;t<r;t++)yu.fromBufferAttribute(this,t),yu.applyMatrix3(e),this.setXY(t,yu.x,yu.y);else if(this.itemSize===3)for(let t=0,r=this.count;t<r;t++)mn.fromBufferAttribute(this,t),mn.applyMatrix3(e),this.setXYZ(t,mn.x,mn.y,mn.z);return this}applyMatrix4(e){for(let t=0,r=this.count;t<r;t++)mn.fromBufferAttribute(this,t),mn.applyMatrix4(e),this.setXYZ(t,mn.x,mn.y,mn.z);return this}applyNormalMatrix(e){for(let t=0,r=this.count;t<r;t++)mn.fromBufferAttribute(this,t),mn.applyNormalMatrix(e),this.setXYZ(t,mn.x,mn.y,mn.z);return this}transformDirection(e){for(let t=0,r=this.count;t<r;t++)mn.fromBufferAttribute(this,t),mn.transformDirection(e),this.setXYZ(t,mn.x,mn.y,mn.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let r=this.array[e*this.itemSize+t];return this.normalized&&(r=bl(r,this.array)),r}setComponent(e,t,r){return this.normalized&&(r=oi(r,this.array)),this.array[e*this.itemSize+t]=r,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=bl(t,this.array)),t}setX(e,t){return this.normalized&&(t=oi(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=bl(t,this.array)),t}setY(e,t){return this.normalized&&(t=oi(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=bl(t,this.array)),t}setZ(e,t){return this.normalized&&(t=oi(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=bl(t,this.array)),t}setW(e,t){return this.normalized&&(t=oi(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,r){return e*=this.itemSize,this.normalized&&(t=oi(t,this.array),r=oi(r,this.array)),this.array[e+0]=t,this.array[e+1]=r,this}setXYZ(e,t,r,a){return e*=this.itemSize,this.normalized&&(t=oi(t,this.array),r=oi(r,this.array),a=oi(a,this.array)),this.array[e+0]=t,this.array[e+1]=r,this.array[e+2]=a,this}setXYZW(e,t,r,a,l){return e*=this.itemSize,this.normalized&&(t=oi(t,this.array),r=oi(r,this.array),a=oi(a,this.array),l=oi(l,this.array)),this.array[e+0]=t,this.array[e+1]=r,this.array[e+2]=a,this.array[e+3]=l,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==jv&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}}class fy extends gr{constructor(e,t,r){super(new Uint16Array(e),t,r)}}class py extends gr{constructor(e,t,r){super(new Uint32Array(e),t,r)}}class In extends gr{constructor(e,t,r){super(new Float32Array(e),t,r)}}const mT=new Ho,Al=new J,Af=new J;class nc{constructor(e=new J,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const r=this.center;t!==void 0?r.copy(t):mT.setFromPoints(e).getCenter(r);let a=0;for(let l=0,c=e.length;l<c;l++)a=Math.max(a,r.distanceToSquared(e[l]));return this.radius=Math.sqrt(a),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const r=this.center.distanceToSquared(e);return t.copy(e),r>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Al.subVectors(e,this.center);const t=Al.lengthSq();if(t>this.radius*this.radius){const r=Math.sqrt(t),a=(r-this.radius)*.5;this.center.addScaledVector(Al,a/r),this.radius+=a}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Af.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Al.copy(e.center).add(Af)),this.expandByPoint(Al.copy(e.center).sub(Af))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let gT=0;const Pi=new rn,Pf=new En,ro=new J,vi=new Ho,Pl=new Ho,An=new J;class Si extends Os{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:gT++}),this.uuid=tc(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(qw(e)?py:fy)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,r=0){this.groups.push({start:e,count:t,materialIndex:r})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const r=this.attributes.normal;if(r!==void 0){const l=new pt().getNormalMatrix(e);r.applyNormalMatrix(l),r.needsUpdate=!0}const a=this.attributes.tangent;return a!==void 0&&(a.transformDirection(e),a.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return Pi.makeRotationFromQuaternion(e),this.applyMatrix4(Pi),this}rotateX(e){return Pi.makeRotationX(e),this.applyMatrix4(Pi),this}rotateY(e){return Pi.makeRotationY(e),this.applyMatrix4(Pi),this}rotateZ(e){return Pi.makeRotationZ(e),this.applyMatrix4(Pi),this}translate(e,t,r){return Pi.makeTranslation(e,t,r),this.applyMatrix4(Pi),this}scale(e,t,r){return Pi.makeScale(e,t,r),this.applyMatrix4(Pi),this}lookAt(e){return Pf.lookAt(e),Pf.updateMatrix(),this.applyMatrix4(Pf.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(ro).negate(),this.translate(ro.x,ro.y,ro.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const r=[];for(let a=0,l=e.length;a<l;a++){const c=e[a];r.push(c.x,c.y,c.z||0)}this.setAttribute("position",new In(r,3))}else{const r=Math.min(e.length,t.count);for(let a=0;a<r;a++){const l=e[a];t.setXYZ(a,l.x,l.y,l.z||0)}e.length>t.count&&lt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Ho);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Nt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new J(-1/0,-1/0,-1/0),new J(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){const l=t[r];vi.setFromBufferAttribute(l),this.morphTargetsRelative?(An.addVectors(this.boundingBox.min,vi.min),this.boundingBox.expandByPoint(An),An.addVectors(this.boundingBox.max,vi.max),this.boundingBox.expandByPoint(An)):(this.boundingBox.expandByPoint(vi.min),this.boundingBox.expandByPoint(vi.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Nt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new nc);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Nt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new J,1/0);return}if(e){const r=this.boundingSphere.center;if(vi.setFromBufferAttribute(e),t)for(let l=0,c=t.length;l<c;l++){const h=t[l];Pl.setFromBufferAttribute(h),this.morphTargetsRelative?(An.addVectors(vi.min,Pl.min),vi.expandByPoint(An),An.addVectors(vi.max,Pl.max),vi.expandByPoint(An)):(vi.expandByPoint(Pl.min),vi.expandByPoint(Pl.max))}vi.getCenter(r);let a=0;for(let l=0,c=e.count;l<c;l++)An.fromBufferAttribute(e,l),a=Math.max(a,r.distanceToSquared(An));if(t)for(let l=0,c=t.length;l<c;l++){const h=t[l],d=this.morphTargetsRelative;for(let f=0,m=h.count;f<m;f++)An.fromBufferAttribute(h,f),d&&(ro.fromBufferAttribute(e,f),An.add(ro)),a=Math.max(a,r.distanceToSquared(An))}this.boundingSphere.radius=Math.sqrt(a),isNaN(this.boundingSphere.radius)&&Nt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Nt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const r=t.position,a=t.normal,l=t.uv;let c=this.getAttribute("tangent");(c===void 0||c.count!==r.count)&&(c=new gr(new Float32Array(4*r.count),4),this.setAttribute("tangent",c));const h=[],d=[];for(let w=0;w<r.count;w++)h[w]=new J,d[w]=new J;const f=new J,m=new J,g=new J,v=new ht,x=new ht,M=new ht,b=new J,y=new J;function S(w,I,G){f.fromBufferAttribute(r,w),m.fromBufferAttribute(r,I),g.fromBufferAttribute(r,G),v.fromBufferAttribute(l,w),x.fromBufferAttribute(l,I),M.fromBufferAttribute(l,G),m.sub(f),g.sub(f),x.sub(v),M.sub(v);const V=1/(x.x*M.y-M.x*x.y);isFinite(V)&&(b.copy(m).multiplyScalar(M.y).addScaledVector(g,-x.y).multiplyScalar(V),y.copy(g).multiplyScalar(x.x).addScaledVector(m,-M.x).multiplyScalar(V),h[w].add(b),h[I].add(b),h[G].add(b),d[w].add(y),d[I].add(y),d[G].add(y))}let P=this.groups;P.length===0&&(P=[{start:0,count:e.count}]);for(let w=0,I=P.length;w<I;++w){const G=P[w],V=G.start,Y=G.count;for(let me=V,de=V+Y;me<de;me+=3)S(e.getX(me+0),e.getX(me+1),e.getX(me+2))}const L=new J,R=new J,D=new J,N=new J;function F(w){D.fromBufferAttribute(a,w),N.copy(D);const I=h[w];L.copy(I),L.sub(D.multiplyScalar(D.dot(I))).normalize(),R.crossVectors(N,I);const V=R.dot(d[w])<0?-1:1;c.setXYZW(w,L.x,L.y,L.z,V)}for(let w=0,I=P.length;w<I;++w){const G=P[w],V=G.start,Y=G.count;for(let me=V,de=V+Y;me<de;me+=3)F(e.getX(me+0)),F(e.getX(me+1)),F(e.getX(me+2))}this._transformed=!0}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let r=this.getAttribute("normal");if(r===void 0||r.count!==t.count)r=new gr(new Float32Array(t.count*3),3),this.setAttribute("normal",r);else for(let v=0,x=r.count;v<x;v++)r.setXYZ(v,0,0,0);const a=new J,l=new J,c=new J,h=new J,d=new J,f=new J,m=new J,g=new J;if(e)for(let v=0,x=e.count;v<x;v+=3){const M=e.getX(v+0),b=e.getX(v+1),y=e.getX(v+2);a.fromBufferAttribute(t,M),l.fromBufferAttribute(t,b),c.fromBufferAttribute(t,y),m.subVectors(c,l),g.subVectors(a,l),m.cross(g),h.fromBufferAttribute(r,M),d.fromBufferAttribute(r,b),f.fromBufferAttribute(r,y),h.add(m),d.add(m),f.add(m),r.setXYZ(M,h.x,h.y,h.z),r.setXYZ(b,d.x,d.y,d.z),r.setXYZ(y,f.x,f.y,f.z)}else for(let v=0,x=t.count;v<x;v+=3)a.fromBufferAttribute(t,v+0),l.fromBufferAttribute(t,v+1),c.fromBufferAttribute(t,v+2),m.subVectors(c,l),g.subVectors(a,l),m.cross(g),r.setXYZ(v+0,m.x,m.y,m.z),r.setXYZ(v+1,m.x,m.y,m.z),r.setXYZ(v+2,m.x,m.y,m.z);this.normalizeNormals(),r.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,r=e.count;t<r;t++)An.fromBufferAttribute(e,t),An.normalize(),e.setXYZ(t,An.x,An.y,An.z)}toNonIndexed(){function e(h,d){const f=h.array,m=h.itemSize,g=h.normalized,v=new f.constructor(d.length*m);let x=0,M=0;for(let b=0,y=d.length;b<y;b++){h.isInterleavedBufferAttribute?x=d[b]*h.data.stride+h.offset:x=d[b]*m;for(let S=0;S<m;S++)v[M++]=f[x++]}return new gr(v,m,g)}if(this.index===null)return lt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Si,r=this.index.array,a=this.attributes;for(const h in a){const d=a[h],f=e(d,r);t.setAttribute(h,f)}const l=this.morphAttributes;for(const h in l){const d=[],f=l[h];for(let m=0,g=f.length;m<g;m++){const v=f[m],x=e(v,r);d.push(x)}t.morphAttributes[h]=d}t.morphTargetsRelative=this.morphTargetsRelative;const c=this.groups;for(let h=0,d=c.length;h<d;h++){const f=c[h];t.addGroup(f.start,f.count,f.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const d=this.parameters;for(const f in d)d[f]!==void 0&&(e[f]=d[f]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const r=this.attributes;for(const d in r){const f=r[d];e.data.attributes[d]=f.toJSON(e.data)}const a={};let l=!1;for(const d in this.morphAttributes){const f=this.morphAttributes[d],m=[];for(let g=0,v=f.length;g<v;g++){const x=f[g];m.push(x.toJSON(e.data))}m.length>0&&(a[d]=m,l=!0)}l&&(e.data.morphAttributes=a,e.data.morphTargetsRelative=this.morphTargetsRelative);const c=this.groups;c.length>0&&(e.data.groups=JSON.parse(JSON.stringify(c)));const h=this.boundingSphere;return h!==null&&(e.data.boundingSphere=h.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const r=e.index;r!==null&&this.setIndex(r.clone());const a=e.attributes;for(const f in a){const m=a[f];this.setAttribute(f,m.clone(t))}const l=e.morphAttributes;for(const f in l){const m=[],g=l[f];for(let v=0,x=g.length;v<x;v++)m.push(g[v].clone(t));this.morphAttributes[f]=m}this.morphTargetsRelative=e.morphTargetsRelative;const c=e.groups;for(let f=0,m=c.length;f<m;f++){const g=c[f];this.addGroup(g.start,g.count,g.materialIndex)}const h=e.boundingBox;h!==null&&(this.boundingBox=h.clone());const d=e.boundingSphere;return d!==null&&(this.boundingSphere=d.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}let vT=0;class xr extends Os{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:vT++}),this.uuid=tc(),this.name="",this.type="Material",this.blending=mo,this.side=Is,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=dp,this.blendDst=fp,this.blendEquation=aa,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new gt(0,0,0),this.blendAlpha=0,this.depthFunc=Lo,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Wv,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=qa,this.stencilZFail=qa,this.stencilZPass=qa,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const r=e[t];if(r===void 0){lt(`Material: parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){lt(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}a&&a.isColor?a.set(r):a&&a.isVector2&&r&&r.isVector2||a&&a.isEuler&&r&&r.isEuler||a&&a.isVector3&&r&&r.isVector3?a.copy(r):this[t]=r}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const r={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.color&&this.color.isColor&&(r.color=this.color.getHex()),this.roughness!==void 0&&(r.roughness=this.roughness),this.metalness!==void 0&&(r.metalness=this.metalness),this.sheen!==void 0&&(r.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(r.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(r.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(r.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(r.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(r.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(r.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(r.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(r.shininess=this.shininess),this.clearcoat!==void 0&&(r.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(r.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(r.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(r.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(r.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,r.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(r.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(r.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(r.dispersion=this.dispersion),this.iridescence!==void 0&&(r.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(r.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(r.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(r.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(r.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(r.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(r.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(r.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(r.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(r.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(r.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(r.lightMap=this.lightMap.toJSON(e).uuid,r.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(r.aoMap=this.aoMap.toJSON(e).uuid,r.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(r.bumpMap=this.bumpMap.toJSON(e).uuid,r.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(r.normalMap=this.normalMap.toJSON(e).uuid,r.normalMapType=this.normalMapType,r.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(r.displacementMap=this.displacementMap.toJSON(e).uuid,r.displacementScale=this.displacementScale,r.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(r.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(r.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(r.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(r.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(r.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(r.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(r.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(r.combine=this.combine)),this.envMapRotation!==void 0&&(r.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(r.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(r.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(r.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(r.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(r.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(r.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(r.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(r.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(r.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(r.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(r.size=this.size),this.shadowSide!==null&&(r.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(r.sizeAttenuation=this.sizeAttenuation),this.blending!==mo&&(r.blending=this.blending),this.side!==Is&&(r.side=this.side),this.vertexColors===!0&&(r.vertexColors=!0),this.opacity<1&&(r.opacity=this.opacity),this.transparent===!0&&(r.transparent=!0),this.blendSrc!==dp&&(r.blendSrc=this.blendSrc),this.blendDst!==fp&&(r.blendDst=this.blendDst),this.blendEquation!==aa&&(r.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(r.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(r.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(r.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(r.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(r.blendAlpha=this.blendAlpha),this.depthFunc!==Lo&&(r.depthFunc=this.depthFunc),this.depthTest===!1&&(r.depthTest=this.depthTest),this.depthWrite===!1&&(r.depthWrite=this.depthWrite),this.colorWrite===!1&&(r.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(r.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Wv&&(r.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(r.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(r.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==qa&&(r.stencilFail=this.stencilFail),this.stencilZFail!==qa&&(r.stencilZFail=this.stencilZFail),this.stencilZPass!==qa&&(r.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(r.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(r.rotation=this.rotation),this.polygonOffset===!0&&(r.polygonOffset=!0),this.polygonOffsetFactor!==0&&(r.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(r.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(r.linewidth=this.linewidth),this.dashSize!==void 0&&(r.dashSize=this.dashSize),this.gapSize!==void 0&&(r.gapSize=this.gapSize),this.scale!==void 0&&(r.scale=this.scale),this.dithering===!0&&(r.dithering=!0),this.alphaTest>0&&(r.alphaTest=this.alphaTest),this.alphaHash===!0&&(r.alphaHash=!0),this.alphaToCoverage===!0&&(r.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(r.premultipliedAlpha=!0),this.forceSinglePass===!0&&(r.forceSinglePass=!0),this.allowOverride===!1&&(r.allowOverride=!1),this.wireframe===!0&&(r.wireframe=!0),this.wireframeLinewidth>1&&(r.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(r.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(r.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(r.flatShading=!0),this.visible===!1&&(r.visible=!1),this.toneMapped===!1&&(r.toneMapped=!1),this.fog===!1&&(r.fog=!1),Object.keys(this.userData).length>0&&(r.userData=this.userData);function a(l){const c=[];for(const h in l){const d=l[h];delete d.metadata,c.push(d)}return c}if(t){const l=a(e.textures),c=a(e.images);l.length>0&&(r.textures=l),c.length>0&&(r.images=c)}return r}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new gt().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let r=e.normalScale;Array.isArray(r)===!1&&(r=[r,r]),this.normalScale=new ht().fromArray(r)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new ht().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let r=null;if(t!==null){const a=t.length;r=new Array(a);for(let l=0;l!==a;++l)r[l]=t[l].clone()}return this.clippingPlanes=r,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}const Dr=new J,Nf=new J,Su=new J,xs=new J,Lf=new J,Mu=new J,Df=new J;class gh{constructor(e=new J,t=new J(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Dr)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const r=t.dot(this.direction);return r<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,r)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Dr.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Dr.copy(this.origin).addScaledVector(this.direction,t),Dr.distanceToSquared(e))}distanceSqToSegment(e,t,r,a){Nf.copy(e).add(t).multiplyScalar(.5),Su.copy(t).sub(e).normalize(),xs.copy(this.origin).sub(Nf);const l=e.distanceTo(t)*.5,c=-this.direction.dot(Su),h=xs.dot(this.direction),d=-xs.dot(Su),f=xs.lengthSq(),m=Math.abs(1-c*c);let g,v,x,M;if(m>0)if(g=c*d-h,v=c*h-d,M=l*m,g>=0)if(v>=-M)if(v<=M){const b=1/m;g*=b,v*=b,x=g*(g+c*v+2*h)+v*(c*g+v+2*d)+f}else v=l,g=Math.max(0,-(c*v+h)),x=-g*g+v*(v+2*d)+f;else v=-l,g=Math.max(0,-(c*v+h)),x=-g*g+v*(v+2*d)+f;else v<=-M?(g=Math.max(0,-(-c*l+h)),v=g>0?-l:Math.min(Math.max(-l,-d),l),x=-g*g+v*(v+2*d)+f):v<=M?(g=0,v=Math.min(Math.max(-l,-d),l),x=v*(v+2*d)+f):(g=Math.max(0,-(c*l+h)),v=g>0?l:Math.min(Math.max(-l,-d),l),x=-g*g+v*(v+2*d)+f);else v=c>0?-l:l,g=Math.max(0,-(c*v+h)),x=-g*g+v*(v+2*d)+f;return r&&r.copy(this.origin).addScaledVector(this.direction,g),a&&a.copy(Nf).addScaledVector(Su,v),x}intersectSphere(e,t){Dr.subVectors(e.center,this.origin);const r=Dr.dot(this.direction),a=Dr.dot(Dr)-r*r,l=e.radius*e.radius;if(a>l)return null;const c=Math.sqrt(l-a),h=r-c,d=r+c;return d<0?null:h<0?this.at(d,t):this.at(h,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const r=-(this.origin.dot(e.normal)+e.constant)/t;return r>=0?r:null}intersectPlane(e,t){const r=this.distanceToPlane(e);return r===null?null:this.at(r,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let r,a,l,c,h,d;const f=1/this.direction.x,m=1/this.direction.y,g=1/this.direction.z,v=this.origin;return f>=0?(r=(e.min.x-v.x)*f,a=(e.max.x-v.x)*f):(r=(e.max.x-v.x)*f,a=(e.min.x-v.x)*f),m>=0?(l=(e.min.y-v.y)*m,c=(e.max.y-v.y)*m):(l=(e.max.y-v.y)*m,c=(e.min.y-v.y)*m),r>c||l>a||((l>r||isNaN(r))&&(r=l),(c<a||isNaN(a))&&(a=c),g>=0?(h=(e.min.z-v.z)*g,d=(e.max.z-v.z)*g):(h=(e.max.z-v.z)*g,d=(e.min.z-v.z)*g),r>d||h>a)||((h>r||r!==r)&&(r=h),(d<a||a!==a)&&(a=d),a<0)?null:this.at(r>=0?r:a,t)}intersectsBox(e){return this.intersectBox(e,Dr)!==null}intersectTriangle(e,t,r,a,l){Lf.subVectors(t,e),Mu.subVectors(r,e),Df.crossVectors(Lf,Mu);let c=this.direction.dot(Df),h;if(c>0){if(a)return null;h=1}else if(c<0)h=-1,c=-c;else return null;xs.subVectors(this.origin,e);const d=h*this.direction.dot(Mu.crossVectors(xs,Mu));if(d<0)return null;const f=h*this.direction.dot(Lf.cross(xs));if(f<0||d+f>c)return null;const m=-h*xs.dot(Df);return m<0?null:this.at(m/c,l)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class my extends xr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new gt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new qr,this.combine=Tm,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const ax=new rn,ra=new gh,Eu=new nc,ox=new J,wu=new J,Tu=new J,bu=new J,If=new J,Ru=new J,lx=new J,Cu=new J;class Qi extends En{constructor(e=new Si,t=new my){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const h=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[h]=l}}}}getVertexPosition(e,t){const r=this.geometry,a=r.attributes.position,l=r.morphAttributes.position,c=r.morphTargetsRelative;t.fromBufferAttribute(a,e);const h=this.morphTargetInfluences;if(l&&h){Ru.set(0,0,0);for(let d=0,f=l.length;d<f;d++){const m=h[d],g=l[d];m!==0&&(If.fromBufferAttribute(g,e),c?Ru.addScaledVector(If,m):Ru.addScaledVector(If.sub(t),m))}t.add(Ru)}return t}raycast(e,t){const r=this.geometry,a=this.material,l=this.matrixWorld;a!==void 0&&(r.boundingSphere===null&&r.computeBoundingSphere(),Eu.copy(r.boundingSphere),Eu.applyMatrix4(l),ra.copy(e.ray).recast(e.near),!(Eu.containsPoint(ra.origin)===!1&&(ra.intersectSphere(Eu,ox)===null||ra.origin.distanceToSquared(ox)>(e.far-e.near)**2))&&(ax.copy(l).invert(),ra.copy(e.ray).applyMatrix4(ax),!(r.boundingBox!==null&&ra.intersectsBox(r.boundingBox)===!1)&&this._computeIntersections(e,t,ra)))}_computeIntersections(e,t,r){let a;const l=this.geometry,c=this.material,h=l.index,d=l.attributes.position,f=l.attributes.uv,m=l.attributes.uv1,g=l.attributes.normal,v=l.groups,x=l.drawRange;if(h!==null)if(Array.isArray(c))for(let M=0,b=v.length;M<b;M++){const y=v[M],S=c[y.materialIndex],P=Math.max(y.start,x.start),L=Math.min(h.count,Math.min(y.start+y.count,x.start+x.count));for(let R=P,D=L;R<D;R+=3){const N=h.getX(R),F=h.getX(R+1),w=h.getX(R+2);a=Au(this,S,e,r,f,m,g,N,F,w),a&&(a.faceIndex=Math.floor(R/3),a.face.materialIndex=y.materialIndex,t.push(a))}}else{const M=Math.max(0,x.start),b=Math.min(h.count,x.start+x.count);for(let y=M,S=b;y<S;y+=3){const P=h.getX(y),L=h.getX(y+1),R=h.getX(y+2);a=Au(this,c,e,r,f,m,g,P,L,R),a&&(a.faceIndex=Math.floor(y/3),t.push(a))}}else if(d!==void 0)if(Array.isArray(c))for(let M=0,b=v.length;M<b;M++){const y=v[M],S=c[y.materialIndex],P=Math.max(y.start,x.start),L=Math.min(d.count,Math.min(y.start+y.count,x.start+x.count));for(let R=P,D=L;R<D;R+=3){const N=R,F=R+1,w=R+2;a=Au(this,S,e,r,f,m,g,N,F,w),a&&(a.faceIndex=Math.floor(R/3),a.face.materialIndex=y.materialIndex,t.push(a))}}else{const M=Math.max(0,x.start),b=Math.min(d.count,x.start+x.count);for(let y=M,S=b;y<S;y+=3){const P=y,L=y+1,R=y+2;a=Au(this,c,e,r,f,m,g,P,L,R),a&&(a.faceIndex=Math.floor(y/3),t.push(a))}}}}function xT(i,e,t,r,a,l,c,h){let d;if(e.side===hi?d=r.intersectTriangle(c,l,a,!0,h):d=r.intersectTriangle(a,l,c,e.side===Is,h),d===null)return null;Cu.copy(h),Cu.applyMatrix4(i.matrixWorld);const f=t.ray.origin.distanceTo(Cu);return f<t.near||f>t.far?null:{distance:f,point:Cu.clone(),object:i}}function Au(i,e,t,r,a,l,c,h,d,f){i.getVertexPosition(h,wu),i.getVertexPosition(d,Tu),i.getVertexPosition(f,bu);const m=xT(i,e,t,r,wu,Tu,bu,lx);if(m){const g=new J;qi.getBarycoord(lx,wu,Tu,bu,g),a&&(m.uv=qi.getInterpolatedAttribute(a,h,d,f,g,new ht)),l&&(m.uv1=qi.getInterpolatedAttribute(l,h,d,f,g,new ht)),c&&(m.normal=qi.getInterpolatedAttribute(c,h,d,f,g,new J),m.normal.dot(r.direction)>0&&m.normal.multiplyScalar(-1));const v={a:h,b:d,c:f,normal:new J,materialIndex:0};qi.getNormal(wu,Tu,bu,v.normal),m.face=v,m.barycoord=g}return m}class _T extends jn{constructor(e=null,t=1,r=1,a,l,c,h,d,f=Un,m=Un,g,v){super(null,c,h,d,f,m,a,l,g,v),this.isDataTexture=!0,this.image={data:e,width:t,height:r},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Uf=new J,yT=new J,ST=new pt;class Ss{constructor(e=new J(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,r,a){return this.normal.set(e,t,r),this.constant=a,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,r){const a=Uf.subVectors(r,t).cross(yT.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(a,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,r=!0){const a=e.delta(Uf),l=this.normal.dot(a);if(l===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const c=-(e.start.dot(this.normal)+this.constant)/l;return r===!0&&(c<0||c>1)?null:t.copy(e.start).addScaledVector(a,c)}intersectsLine(e){const t=this.distanceToPoint(e.start),r=this.distanceToPoint(e.end);return t<0&&r>0||r<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const r=t||ST.getNormalMatrix(e),a=this.coplanarPoint(Uf).applyMatrix4(e),l=this.normal.applyMatrix3(r).normalize();return this.constant=-a.dot(l),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const sa=new nc,MT=new ht(.5,.5),Pu=new J;class Fm{constructor(e=new Ss,t=new Ss,r=new Ss,a=new Ss,l=new Ss,c=new Ss){this.planes=[e,t,r,a,l,c]}set(e,t,r,a,l,c){const h=this.planes;return h[0].copy(e),h[1].copy(t),h[2].copy(r),h[3].copy(a),h[4].copy(l),h[5].copy(c),this}copy(e){const t=this.planes;for(let r=0;r<6;r++)t[r].copy(e.planes[r]);return this}setFromProjectionMatrix(e,t=fr,r=!1){const a=this.planes,l=e.elements,c=l[0],h=l[1],d=l[2],f=l[3],m=l[4],g=l[5],v=l[6],x=l[7],M=l[8],b=l[9],y=l[10],S=l[11],P=l[12],L=l[13],R=l[14],D=l[15];if(a[0].setComponents(f-c,x-m,S-M,D-P).normalize(),a[1].setComponents(f+c,x+m,S+M,D+P).normalize(),a[2].setComponents(f+h,x+g,S+b,D+L).normalize(),a[3].setComponents(f-h,x-g,S-b,D-L).normalize(),r)a[4].setComponents(d,v,y,R).normalize(),a[5].setComponents(f-d,x-v,S-y,D-R).normalize();else if(a[4].setComponents(f-d,x-v,S-y,D-R).normalize(),t===fr)a[5].setComponents(f+d,x+v,S+y,D+R).normalize();else if(t===Xl)a[5].setComponents(d,v,y,R).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),sa.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),sa.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(sa)}intersectsSprite(e){sa.center.set(0,0,0);const t=MT.distanceTo(e.center);return sa.radius=.7071067811865476+t,sa.applyMatrix4(e.matrixWorld),this.intersectsSphere(sa)}intersectsSphere(e){const t=this.planes,r=e.center,a=-e.radius;for(let l=0;l<6;l++)if(t[l].distanceToPoint(r)<a)return!1;return!0}intersectsBox(e){const t=this.planes;for(let r=0;r<6;r++){const a=t[r];if(Pu.x=a.normal.x>0?e.max.x:e.min.x,Pu.y=a.normal.y>0?e.max.y:e.min.y,Pu.z=a.normal.z>0?e.max.z:e.min.z,a.distanceToPoint(Pu)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let r=0;r<6;r++)if(t[r].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Ku extends xr{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new gt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const oh=new J,lh=new J,cx=new rn,Nl=new gh,Nu=new nc,Ff=new J,ux=new J;class ET extends En{constructor(e=new Si,t=new Ku){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,r=[0];for(let a=1,l=t.count;a<l;a++)oh.fromBufferAttribute(t,a-1),lh.fromBufferAttribute(t,a),r[a]=r[a-1],r[a]+=oh.distanceTo(lh);e.setAttribute("lineDistance",new In(r,1))}else lt("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const r=this.geometry,a=this.matrixWorld,l=e.params.Line.threshold,c=r.drawRange;if(r.boundingSphere===null&&r.computeBoundingSphere(),Nu.copy(r.boundingSphere),Nu.applyMatrix4(a),Nu.radius+=l,e.ray.intersectsSphere(Nu)===!1)return;cx.copy(a).invert(),Nl.copy(e.ray).applyMatrix4(cx);const h=l/((this.scale.x+this.scale.y+this.scale.z)/3),d=h*h,f=this.isLineSegments?2:1,m=r.index,v=r.attributes.position;if(m!==null){const x=Math.max(0,c.start),M=Math.min(m.count,c.start+c.count);for(let b=x,y=M-1;b<y;b+=f){const S=m.getX(b),P=m.getX(b+1),L=Lu(this,e,Nl,d,S,P,b);L&&t.push(L)}if(this.isLineLoop){const b=m.getX(M-1),y=m.getX(x),S=Lu(this,e,Nl,d,b,y,M-1);S&&t.push(S)}}else{const x=Math.max(0,c.start),M=Math.min(v.count,c.start+c.count);for(let b=x,y=M-1;b<y;b+=f){const S=Lu(this,e,Nl,d,b,b+1,b);S&&t.push(S)}if(this.isLineLoop){const b=Lu(this,e,Nl,d,M-1,x,M-1);b&&t.push(b)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const h=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[h]=l}}}}}function Lu(i,e,t,r,a,l,c){const h=i.geometry.attributes.position;if(oh.fromBufferAttribute(h,a),lh.fromBufferAttribute(h,l),t.distanceSqToSegment(oh,lh,Ff,ux)>r)return;Ff.applyMatrix4(i.matrixWorld);const f=e.ray.origin.distanceTo(Ff);if(!(f<e.near||f>e.far))return{distance:f,point:ux.clone().applyMatrix4(i.matrixWorld),index:c,face:null,faceIndex:null,barycoord:null,object:i}}const hx=new J,dx=new J;class fx extends ET{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,r=[];for(let a=0,l=t.count;a<l;a+=2)hx.fromBufferAttribute(t,a),dx.fromBufferAttribute(t,a+1),r[a]=a===0?0:r[a-1],r[a+1]=r[a]+hx.distanceTo(dx);e.setAttribute("lineDistance",new In(r,1))}else lt("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class Ol extends xr{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new gt(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const px=new rn,em=new gh,Du=new nc,Iu=new J;class Of extends En{constructor(e=new Si,t=new Ol){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const r=this.geometry,a=this.matrixWorld,l=e.params.Points.threshold,c=r.drawRange;if(r.boundingSphere===null&&r.computeBoundingSphere(),Du.copy(r.boundingSphere),Du.applyMatrix4(a),Du.radius+=l,e.ray.intersectsSphere(Du)===!1)return;px.copy(a).invert(),em.copy(e.ray).applyMatrix4(px);const h=l/((this.scale.x+this.scale.y+this.scale.z)/3),d=h*h,f=r.index,g=r.attributes.position;if(f!==null){const v=Math.max(0,c.start),x=Math.min(f.count,c.start+c.count);for(let M=v,b=x;M<b;M++){const y=f.getX(M);Iu.fromBufferAttribute(g,y),mx(Iu,y,d,a,e,t,this)}}else{const v=Math.max(0,c.start),x=Math.min(g.count,c.start+c.count);for(let M=v,b=x;M<b;M++)Iu.fromBufferAttribute(g,M),mx(Iu,M,d,a,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const h=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[h]=l}}}}}function mx(i,e,t,r,a,l,c){const h=em.distanceSqToPoint(i);if(h<t){const d=new J;em.closestPointToPoint(i,d),d.applyMatrix4(r);const f=a.ray.origin.distanceTo(d);if(f<a.near||f>a.far)return;l.push({distance:f,distanceToRay:Math.sqrt(h),point:d,index:e,face:null,faceIndex:null,barycoord:null,object:c})}}class gy extends jn{constructor(e=[],t=Ma,r,a,l,c,h,d,f,m){super(e,t,r,a,l,c,h,d,f,m),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Io extends jn{constructor(e,t,r=vr,a,l,c,h=Un,d=Un,f,m=$r,g=1){if(m!==$r&&m!==ha)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const v={width:e,height:t,depth:g};super(v,a,l,c,h,d,m,r,f),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Um(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class wT extends Io{constructor(e,t=vr,r=Ma,a,l,c=Un,h=Un,d,f=$r){const m={width:e,height:e,depth:1},g=[m,m,m,m,m,m];super(e,e,t,r,a,l,c,h,d,f),this.image=g,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class vy extends jn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class ic extends Si{constructor(e=1,t=1,r=1,a=1,l=1,c=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:r,widthSegments:a,heightSegments:l,depthSegments:c};const h=this;a=Math.floor(a),l=Math.floor(l),c=Math.floor(c);const d=[],f=[],m=[],g=[];let v=0,x=0;M("z","y","x",-1,-1,r,t,e,c,l,0),M("z","y","x",1,-1,r,t,-e,c,l,1),M("x","z","y",1,1,e,r,t,a,c,2),M("x","z","y",1,-1,e,r,-t,a,c,3),M("x","y","z",1,-1,e,t,r,a,l,4),M("x","y","z",-1,-1,e,t,-r,a,l,5),this.setIndex(d),this.setAttribute("position",new In(f,3)),this.setAttribute("normal",new In(m,3)),this.setAttribute("uv",new In(g,2));function M(b,y,S,P,L,R,D,N,F,w,I){const G=R/F,V=D/w,Y=R/2,me=D/2,de=N/2,O=F+1,ce=w+1;let Q=0,$=0;const ne=new J;for(let he=0;he<ce;he++){const k=he*V-me;for(let ee=0;ee<O;ee++){const Fe=ee*G-Y;ne[b]=Fe*P,ne[y]=k*L,ne[S]=de,f.push(ne.x,ne.y,ne.z),ne[b]=0,ne[y]=0,ne[S]=N>0?1:-1,m.push(ne.x,ne.y,ne.z),g.push(ee/F),g.push(1-he/w),Q+=1}}for(let he=0;he<w;he++)for(let k=0;k<F;k++){const ee=v+k+O*he,Fe=v+k+O*(he+1),je=v+(k+1)+O*(he+1),Ge=v+(k+1)+O*he;d.push(ee,Fe,Ge),d.push(Fe,je,Ge),$+=6}h.addGroup(x,$,I),x+=$,v+=Q}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ic(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class vh extends Si{constructor(e=1,t=1,r=1,a=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:r,heightSegments:a};const l=e/2,c=t/2,h=Math.floor(r),d=Math.floor(a),f=h+1,m=d+1,g=e/h,v=t/d,x=[],M=[],b=[],y=[];for(let S=0;S<m;S++){const P=S*v-c;for(let L=0;L<f;L++){const R=L*g-l;M.push(R,-P,0),b.push(0,0,1),y.push(L/h),y.push(1-S/d)}}for(let S=0;S<d;S++)for(let P=0;P<h;P++){const L=P+f*S,R=P+f*(S+1),D=P+1+f*(S+1),N=P+1+f*S;x.push(L,R,N),x.push(R,D,N)}this.setIndex(x),this.setAttribute("position",new In(M,3)),this.setAttribute("normal",new In(b,3)),this.setAttribute("uv",new In(y,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new vh(e.width,e.height,e.widthSegments,e.heightSegments)}}function Uo(i){const e={};for(const t in i){e[t]={};for(const r in i[t]){const a=i[t][r];if(gx(a))a.isRenderTargetTexture?(lt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][r]=null):e[t][r]=a.clone();else if(Array.isArray(a))if(gx(a[0])){const l=[];for(let c=0,h=a.length;c<h;c++)l[c]=a[c].clone();e[t][r]=l}else e[t][r]=a.slice();else e[t][r]=a}}return e}function Yn(i){const e={};for(let t=0;t<i.length;t++){const r=Uo(i[t]);for(const a in r)e[a]=r[a]}return e}function gx(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function TT(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function xy(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:bt.workingColorSpace}const bT={clone:Uo,merge:Yn};var RT=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,CT=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class _r extends xr{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=RT,this.fragmentShader=CT,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Uo(e.uniforms),this.uniformsGroups=TT(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const a in this.uniforms){const c=this.uniforms[a].value;c&&c.isTexture?t.uniforms[a]={type:"t",value:c.toJSON(e).uuid}:c&&c.isColor?t.uniforms[a]={type:"c",value:c.getHex()}:c&&c.isVector2?t.uniforms[a]={type:"v2",value:c.toArray()}:c&&c.isVector3?t.uniforms[a]={type:"v3",value:c.toArray()}:c&&c.isVector4?t.uniforms[a]={type:"v4",value:c.toArray()}:c&&c.isMatrix3?t.uniforms[a]={type:"m3",value:c.toArray()}:c&&c.isMatrix4?t.uniforms[a]={type:"m4",value:c.toArray()}:t.uniforms[a]={value:c}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const r={};for(const a in this.extensions)this.extensions[a]===!0&&(r[a]=!0);return Object.keys(r).length>0&&(t.extensions=r),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(const r in e.uniforms){const a=e.uniforms[r];switch(this.uniforms[r]={},a.type){case"t":this.uniforms[r].value=t[a.value]||null;break;case"c":this.uniforms[r].value=new gt().setHex(a.value);break;case"v2":this.uniforms[r].value=new ht().fromArray(a.value);break;case"v3":this.uniforms[r].value=new J().fromArray(a.value);break;case"v4":this.uniforms[r].value=new ln().fromArray(a.value);break;case"m3":this.uniforms[r].value=new pt().fromArray(a.value);break;case"m4":this.uniforms[r].value=new rn().fromArray(a.value);break;default:this.uniforms[r].value=a.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(const r in e.extensions)this.extensions[r]=e.extensions[r];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}}class AT extends _r{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class kf extends xr{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new gt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new gt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=rh,this.normalScale=new ht(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new qr,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class PT extends xr{constructor(e){super(),this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new gt(16777215),this.specular=new gt(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new gt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=rh,this.normalScale=new ht(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new qr,this.combine=Tm,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.specular.copy(e.specular),this.shininess=e.shininess,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class NT extends xr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Bw,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class LT extends xr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const zl={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(vx(i)||(this.files[i]=e))},get:function(i){if(this.enabled!==!1&&!vx(i))return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};function vx(i){try{const e=i.slice(i.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}class DT{constructor(e,t,r){const a=this;let l=!1,c=0,h=0,d;const f=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=r,this._abortController=null,this.itemStart=function(m){h++,l===!1&&a.onStart!==void 0&&a.onStart(m,c,h),l=!0},this.itemEnd=function(m){c++,a.onProgress!==void 0&&a.onProgress(m,c,h),c===h&&(l=!1,a.onLoad!==void 0&&a.onLoad())},this.itemError=function(m){a.onError!==void 0&&a.onError(m)},this.resolveURL=function(m){return m=m.normalize("NFC"),d?d(m):m},this.setURLModifier=function(m){return d=m,this},this.addHandler=function(m,g){return f.push(m,g),this},this.removeHandler=function(m){const g=f.indexOf(m);return g!==-1&&f.splice(g,2),this},this.getHandler=function(m){for(let g=0,v=f.length;g<v;g+=2){const x=f[g],M=f[g+1];if(x.global&&(x.lastIndex=0),x.test(m))return M}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const IT=new DT;class rc{constructor(e){this.manager=e!==void 0?e:IT,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){const r=this;return new Promise(function(a,l){r.load(e,a,t,l)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}rc.DEFAULT_MATERIAL_NAME="__DEFAULT";const Ir={};class UT extends Error{constructor(e,t){super(e),this.response=t}}class FT extends rc{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,r,a){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const l=zl.get(`file:${e}`);if(l!==void 0){this.manager.itemStart(e),setTimeout(()=>{t&&t(l),this.manager.itemEnd(e)},0);return}if(Ir[e]!==void 0){Ir[e].push({onLoad:t,onProgress:r,onError:a});return}Ir[e]=[],Ir[e].push({onLoad:t,onProgress:r,onError:a});const c=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),h=this.mimeType,d=this.responseType;fetch(c).then(f=>{if(f.status===200||f.status===0){if(f.status===0&&lt("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||f.body===void 0||f.body.getReader===void 0)return f;const m=Ir[e],g=f.body.getReader(),v=f.headers.get("X-File-Size")||f.headers.get("Content-Length"),x=v?parseInt(v):0,M=x!==0;let b=0;const y=new ReadableStream({start(S){P();function P(){g.read().then(({done:L,value:R})=>{if(L)S.close();else{b+=R.byteLength;const D=new ProgressEvent("progress",{lengthComputable:M,loaded:b,total:x});for(let N=0,F=m.length;N<F;N++){const w=m[N];w.onProgress&&w.onProgress(D)}S.enqueue(R),P()}},L=>{S.error(L)})}}});return new Response(y)}else throw new UT(`fetch for "${f.url}" responded with ${f.status}: ${f.statusText}`,f)}).then(f=>{switch(d){case"arraybuffer":return f.arrayBuffer();case"blob":return f.blob();case"document":return f.text().then(m=>new DOMParser().parseFromString(m,h));case"json":return f.json();default:if(h==="")return f.text();{const g=/charset="?([^;"\s]*)"?/i.exec(h),v=g&&g[1]?g[1].toLowerCase():void 0,x=new TextDecoder(v);return f.arrayBuffer().then(M=>x.decode(M))}}}).then(f=>{zl.add(`file:${e}`,f);const m=Ir[e];delete Ir[e];for(let g=0,v=m.length;g<v;g++){const x=m[g];x.onLoad&&x.onLoad(f)}}).catch(f=>{const m=Ir[e];if(m===void 0)throw this.manager.itemError(e),f;delete Ir[e];for(let g=0,v=m.length;g<v;g++){const x=m[g];x.onError&&x.onError(f)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const so=new WeakMap;class OT extends rc{constructor(e){super(e)}load(e,t,r,a){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const l=this,c=zl.get(`image:${e}`);if(c!==void 0){if(c.complete===!0)l.manager.itemStart(e),setTimeout(function(){t&&t(c),l.manager.itemEnd(e)},0);else{let g=so.get(c);g===void 0&&(g=[],so.set(c,g)),g.push({onLoad:t,onError:a})}return c}const h=$l("img");function d(){m(),t&&t(this);const g=so.get(this)||[];for(let v=0;v<g.length;v++){const x=g[v];x.onLoad&&x.onLoad(this)}so.delete(this),l.manager.itemEnd(e)}function f(g){m(),a&&a(g),zl.remove(`image:${e}`);const v=so.get(this)||[];for(let x=0;x<v.length;x++){const M=v[x];M.onError&&M.onError(g)}so.delete(this),l.manager.itemError(e),l.manager.itemEnd(e)}function m(){h.removeEventListener("load",d,!1),h.removeEventListener("error",f,!1)}return h.addEventListener("load",d,!1),h.addEventListener("error",f,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(h.crossOrigin=this.crossOrigin),zl.add(`image:${e}`,h),l.manager.itemStart(e),h.src=e,h}}class kT extends rc{constructor(e){super(e)}load(e,t,r,a){const l=new jn,c=new OT(this.manager);return c.setCrossOrigin(this.crossOrigin),c.setPath(this.path),c.load(e,function(h){l.image=h,l.needsUpdate=!0,t!==void 0&&t(l)},r,a),l}}class Om extends En{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new gt(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}class zT extends Om{constructor(e,t,r){super(e,r),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(En.DEFAULT_UP),this.updateMatrix(),this.groundColor=new gt(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){const t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}}const zf=new rn,xx=new J,_x=new J;class BT{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ht(512,512),this.mapType=yi,this.map=null,this.mapPass=null,this.matrix=new rn,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Fm,this._frameExtents=new ht(1,1),this._viewportCount=1,this._viewports=[new ln(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,r=this.matrix;xx.setFromMatrixPosition(e.matrixWorld),t.position.copy(xx),_x.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(_x),t.updateMatrixWorld(),zf.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(zf,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===Xl||t.reversedDepth?r.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):r.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),r.multiply(zf)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Uu=new J,Fu=new Us,sr=new J;class _y extends En{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new rn,this.projectionMatrix=new rn,this.projectionMatrixInverse=new rn,this.coordinateSystem=fr,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Uu,Fu,sr),sr.x===1&&sr.y===1&&sr.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Uu,Fu,sr.set(1,1,1)).invert()}updateWorldMatrix(e,t,r=!1){super.updateWorldMatrix(e,t,r),this.matrixWorld.decompose(Uu,Fu,sr),sr.x===1&&sr.y===1&&sr.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Uu,Fu,sr.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const _s=new J,yx=new ht,Sx=new ht;class Di extends _y{constructor(e=50,t=1,r=.1,a=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=r,this.far=a,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Jp*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Yu*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Jp*2*Math.atan(Math.tan(Yu*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,r){_s.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(_s.x,_s.y).multiplyScalar(-e/_s.z),_s.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),r.set(_s.x,_s.y).multiplyScalar(-e/_s.z)}getViewSize(e,t){return this.getViewBounds(e,yx,Sx),t.subVectors(Sx,yx)}setViewOffset(e,t,r,a,l,c){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=r,this.view.offsetY=a,this.view.width=l,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Yu*.5*this.fov)/this.zoom,r=2*t,a=this.aspect*r,l=-.5*a;const c=this.view;if(this.view!==null&&this.view.enabled){const d=c.fullWidth,f=c.fullHeight;l+=c.offsetX*a/d,t-=c.offsetY*r/f,a*=c.width/d,r*=c.height/f}const h=this.filmOffset;h!==0&&(l+=e*h/this.getFilmWidth()),this.projectionMatrix.makePerspective(l,l+a,t,t-r,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class km extends _y{constructor(e=-1,t=1,r=1,a=-1,l=.1,c=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=r,this.bottom=a,this.near=l,this.far=c,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,r,a,l,c){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=r,this.view.offsetY=a,this.view.width=l,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),r=(this.right+this.left)/2,a=(this.top+this.bottom)/2;let l=r-e,c=r+e,h=a+t,d=a-t;if(this.view!==null&&this.view.enabled){const f=(this.right-this.left)/this.view.fullWidth/this.zoom,m=(this.top-this.bottom)/this.view.fullHeight/this.zoom;l+=f*this.view.offsetX,c=l+f*this.view.width,h-=m*this.view.offsetY,d=h-m*this.view.height}this.projectionMatrix.makeOrthographic(l,c,h,d,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class HT extends BT{constructor(){super(new km(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Bf extends Om{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(En.DEFAULT_UP),this.updateMatrix(),this.target=new En,this.shadow=new HT}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}class VT extends Om{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}const ao=-90,oo=1;class GT extends En{constructor(e,t,r){super(),this.type="CubeCamera",this.renderTarget=r,this.coordinateSystem=null,this.activeMipmapLevel=0;const a=new Di(ao,oo,e,t);a.layers=this.layers,this.add(a);const l=new Di(ao,oo,e,t);l.layers=this.layers,this.add(l);const c=new Di(ao,oo,e,t);c.layers=this.layers,this.add(c);const h=new Di(ao,oo,e,t);h.layers=this.layers,this.add(h);const d=new Di(ao,oo,e,t);d.layers=this.layers,this.add(d);const f=new Di(ao,oo,e,t);f.layers=this.layers,this.add(f)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[r,a,l,c,h,d]=t;for(const f of t)this.remove(f);if(e===fr)r.up.set(0,1,0),r.lookAt(1,0,0),a.up.set(0,1,0),a.lookAt(-1,0,0),l.up.set(0,0,-1),l.lookAt(0,1,0),c.up.set(0,0,1),c.lookAt(0,-1,0),h.up.set(0,1,0),h.lookAt(0,0,1),d.up.set(0,1,0),d.lookAt(0,0,-1);else if(e===Xl)r.up.set(0,-1,0),r.lookAt(-1,0,0),a.up.set(0,-1,0),a.lookAt(1,0,0),l.up.set(0,0,1),l.lookAt(0,1,0),c.up.set(0,0,-1),c.lookAt(0,-1,0),h.up.set(0,-1,0),h.lookAt(0,0,1),d.up.set(0,-1,0),d.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const f of t)this.add(f),f.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:r,activeMipmapLevel:a}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[l,c,h,d,f,m]=this.children,g=e.getRenderTarget(),v=e.getActiveCubeFace(),x=e.getActiveMipmapLevel(),M=e.xr.enabled;e.xr.enabled=!1;const b=r.texture.generateMipmaps;r.texture.generateMipmaps=!1;let y=!1;e.isWebGLRenderer===!0?y=e.state.buffers.depth.getReversed():y=e.reversedDepthBuffer,e.setRenderTarget(r,0,a),y&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(r,1,a),y&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(r,2,a),y&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(r,3,a),y&&e.autoClear===!1&&e.clearDepth(),e.render(t,d),e.setRenderTarget(r,4,a),y&&e.autoClear===!1&&e.clearDepth(),e.render(t,f),r.texture.generateMipmaps=b,e.setRenderTarget(r,5,a),y&&e.autoClear===!1&&e.clearDepth(),e.render(t,m),e.setRenderTarget(g,v,x),e.xr.enabled=M,r.texture.needsPMREMUpdate=!0}}class WT extends Di{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class Mx{constructor(e=1,t=0,r=0){this.radius=e,this.phi=t,this.theta=r}set(e,t,r){return this.radius=e,this.phi=t,this.theta=r,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Mt(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,r){return this.radius=Math.sqrt(e*e+t*t+r*r),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,r),this.phi=Math.acos(Mt(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}const Wm=class Wm{constructor(e,t,r,a){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,r,a)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let r=0;r<4;r++)this.elements[r]=e[r+t];return this}set(e,t,r,a){const l=this.elements;return l[0]=e,l[2]=t,l[1]=r,l[3]=a,this}};Wm.prototype.isMatrix2=!0;let Ex=Wm;class jT extends Os{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){if(e===void 0){lt("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}}function wx(i,e,t,r){const a=XT(r);switch(t){case ay:return i*e;case ly:return i*e/a.components*a.byteLength;case Pm:return i*e/a.components*a.byteLength;case Ea:return i*e*2/a.components*a.byteLength;case Nm:return i*e*2/a.components*a.byteLength;case oy:return i*e*3/a.components*a.byteLength;case Yi:return i*e*4/a.components*a.byteLength;case Lm:return i*e*4/a.components*a.byteLength;case ju:case Xu:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case $u:case qu:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case wp:case bp:return Math.max(i,16)*Math.max(e,8)/4;case Ep:case Tp:return Math.max(i,8)*Math.max(e,8)/2;case Rp:case Cp:case Pp:case Np:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Ap:case nh:case Lp:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Dp:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Ip:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case Up:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case Fp:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case Op:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case kp:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case zp:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case Bp:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case Hp:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case Vp:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case Gp:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Wp:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case jp:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case Xp:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case $p:case qp:case Yp:return Math.ceil(i/4)*Math.ceil(e/4)*16;case Kp:case Qp:return Math.ceil(i/4)*Math.ceil(e/4)*8;case ih:case Zp:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function XT(i){switch(i){case yi:case ny:return{byteLength:1,components:1};case Wl:case iy:case Xr:return{byteLength:2,components:1};case Cm:case Am:return{byteLength:2,components:4};case vr:case Rm:case dr:return{byteLength:4,components:1};case ry:case sy:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:wm}}));typeof window<"u"&&(window.__THREE__?lt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=wm);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function yy(){let i=null,e=!1,t=null,r=null;function a(l,c){t(l,c),r=i.requestAnimationFrame(a)}return{start:function(){e!==!0&&t!==null&&i!==null&&(r=i.requestAnimationFrame(a),e=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(r),e=!1},setAnimationLoop:function(l){t=l},setContext:function(l){i=l}}}function $T(i){const e=new WeakMap;function t(h,d){const f=h.array,m=h.usage,g=f.byteLength,v=i.createBuffer();i.bindBuffer(d,v),i.bufferData(d,f,m),h.onUploadCallback();let x;if(f instanceof Float32Array)x=i.FLOAT;else if(typeof Float16Array<"u"&&f instanceof Float16Array)x=i.HALF_FLOAT;else if(f instanceof Uint16Array)h.isFloat16BufferAttribute?x=i.HALF_FLOAT:x=i.UNSIGNED_SHORT;else if(f instanceof Int16Array)x=i.SHORT;else if(f instanceof Uint32Array)x=i.UNSIGNED_INT;else if(f instanceof Int32Array)x=i.INT;else if(f instanceof Int8Array)x=i.BYTE;else if(f instanceof Uint8Array)x=i.UNSIGNED_BYTE;else if(f instanceof Uint8ClampedArray)x=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+f);return{buffer:v,type:x,bytesPerElement:f.BYTES_PER_ELEMENT,version:h.version,size:g}}function r(h,d,f){const m=d.array,g=d.updateRanges;if(i.bindBuffer(f,h),g.length===0)i.bufferSubData(f,0,m);else{g.sort((x,M)=>x.start-M.start);let v=0;for(let x=1;x<g.length;x++){const M=g[v],b=g[x];b.start<=M.start+M.count+1?M.count=Math.max(M.count,b.start+b.count-M.start):(++v,g[v]=b)}g.length=v+1;for(let x=0,M=g.length;x<M;x++){const b=g[x];i.bufferSubData(f,b.start*m.BYTES_PER_ELEMENT,m,b.start,b.count)}d.clearUpdateRanges()}d.onUploadCallback()}function a(h){return h.isInterleavedBufferAttribute&&(h=h.data),e.get(h)}function l(h){h.isInterleavedBufferAttribute&&(h=h.data);const d=e.get(h);d&&(i.deleteBuffer(d.buffer),e.delete(h))}function c(h,d){if(h.isInterleavedBufferAttribute&&(h=h.data),h.isGLBufferAttribute){const m=e.get(h);(!m||m.version<h.version)&&e.set(h,{buffer:h.buffer,type:h.type,bytesPerElement:h.elementSize,version:h.version});return}const f=e.get(h);if(f===void 0)e.set(h,t(h,d));else if(f.version<h.version){if(f.size!==h.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");r(f.buffer,h,d),f.version=h.version}}return{get:a,remove:l,update:c}}var qT=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,YT=`#ifdef USE_ALPHAHASH
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
#endif`,KT=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,QT=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,ZT=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,JT=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,eb=`#ifdef USE_AOMAP
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
#endif`,tb=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,nb=`#ifdef USE_BATCHING
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
#endif`,ib=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,rb=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,sb=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,ab=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,ob=`#ifdef USE_IRIDESCENCE
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
#endif`,lb=`#ifdef USE_BUMPMAP
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
#endif`,cb=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,ub=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,hb=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,db=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,fb=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,pb=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,mb=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,gb=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,vb=`#define PI 3.141592653589793
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
} // validated`,xb=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,_b=`vec3 transformedNormal = objectNormal;
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
#endif`,yb=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Sb=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Mb=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Eb=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,wb="gl_FragColor = linearToOutputTexel( gl_FragColor );",Tb=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,bb=`#ifdef USE_ENVMAP
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
#endif`,Rb=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Cb=`#ifdef USE_ENVMAP
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
#endif`,Ab=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Pb=`#ifdef USE_ENVMAP
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
#endif`,Nb=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Lb=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Db=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Ib=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Ub=`#ifdef USE_GRADIENTMAP
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
}`,Fb=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Ob=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,kb=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,zb=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,Bb=`#ifdef USE_ENVMAP
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
#endif`,Hb=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Vb=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Gb=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Wb=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,jb=`PhysicalMaterial material;
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
#endif`,Xb=`uniform sampler2D dfgLUT;
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
}`,$b=`
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
#endif`,qb=`#if defined( RE_IndirectDiffuse )
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
#endif`,Yb=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Kb=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,Qb=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Zb=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Jb=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,eR=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,tR=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,nR=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,iR=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,rR=`#if defined( USE_POINTS_UV )
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
#endif`,sR=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,aR=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,oR=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,lR=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,cR=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,uR=`#ifdef USE_MORPHTARGETS
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
#endif`,hR=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,dR=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,fR=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,pR=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,mR=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,gR=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,vR=`#ifdef USE_NORMALMAP
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
#endif`,xR=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,_R=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,yR=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,SR=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,MR=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,ER=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,wR=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,TR=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,bR=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,RR=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,CR=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,AR=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,PR=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,NR=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,LR=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,DR=`float getShadowMask() {
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
}`,IR=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,UR=`#ifdef USE_SKINNING
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
#endif`,FR=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,OR=`#ifdef USE_SKINNING
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
#endif`,kR=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,zR=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,BR=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,HR=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,VR=`#ifdef USE_TRANSMISSION
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
#endif`,GR=`#ifdef USE_TRANSMISSION
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
#endif`,WR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,jR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,XR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,$R=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const qR=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,YR=`uniform sampler2D t2D;
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
}`,KR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,QR=`#ifdef ENVMAP_TYPE_CUBE
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
}`,ZR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,JR=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,eC=`#include <common>
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
}`,tC=`#if DEPTH_PACKING == 3200
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
}`,nC=`#define DISTANCE
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
}`,iC=`#define DISTANCE
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
}`,rC=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,sC=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,aC=`uniform float scale;
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
}`,oC=`uniform vec3 diffuse;
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
}`,lC=`#include <common>
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
}`,cC=`uniform vec3 diffuse;
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
}`,uC=`#define LAMBERT
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
}`,hC=`#define LAMBERT
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
}`,dC=`#define MATCAP
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
}`,fC=`#define MATCAP
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
}`,pC=`#define NORMAL
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
}`,mC=`#define NORMAL
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
}`,gC=`#define PHONG
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
}`,vC=`#define PHONG
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
}`,xC=`#define STANDARD
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
}`,_C=`#define STANDARD
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
}`,yC=`#define TOON
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
}`,SC=`#define TOON
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
}`,MC=`uniform float size;
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
}`,EC=`uniform vec3 diffuse;
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
}`,wC=`#include <common>
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
}`,TC=`uniform vec3 color;
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
}`,bC=`uniform float rotation;
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
}`,RC=`uniform vec3 diffuse;
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
}`,vt={alphahash_fragment:qT,alphahash_pars_fragment:YT,alphamap_fragment:KT,alphamap_pars_fragment:QT,alphatest_fragment:ZT,alphatest_pars_fragment:JT,aomap_fragment:eb,aomap_pars_fragment:tb,batching_pars_vertex:nb,batching_vertex:ib,begin_vertex:rb,beginnormal_vertex:sb,bsdfs:ab,iridescence_fragment:ob,bumpmap_pars_fragment:lb,clipping_planes_fragment:cb,clipping_planes_pars_fragment:ub,clipping_planes_pars_vertex:hb,clipping_planes_vertex:db,color_fragment:fb,color_pars_fragment:pb,color_pars_vertex:mb,color_vertex:gb,common:vb,cube_uv_reflection_fragment:xb,defaultnormal_vertex:_b,displacementmap_pars_vertex:yb,displacementmap_vertex:Sb,emissivemap_fragment:Mb,emissivemap_pars_fragment:Eb,colorspace_fragment:wb,colorspace_pars_fragment:Tb,envmap_fragment:bb,envmap_common_pars_fragment:Rb,envmap_pars_fragment:Cb,envmap_pars_vertex:Ab,envmap_physical_pars_fragment:Bb,envmap_vertex:Pb,fog_vertex:Nb,fog_pars_vertex:Lb,fog_fragment:Db,fog_pars_fragment:Ib,gradientmap_pars_fragment:Ub,lightmap_pars_fragment:Fb,lights_lambert_fragment:Ob,lights_lambert_pars_fragment:kb,lights_pars_begin:zb,lights_toon_fragment:Hb,lights_toon_pars_fragment:Vb,lights_phong_fragment:Gb,lights_phong_pars_fragment:Wb,lights_physical_fragment:jb,lights_physical_pars_fragment:Xb,lights_fragment_begin:$b,lights_fragment_maps:qb,lights_fragment_end:Yb,lightprobes_pars_fragment:Kb,logdepthbuf_fragment:Qb,logdepthbuf_pars_fragment:Zb,logdepthbuf_pars_vertex:Jb,logdepthbuf_vertex:eR,map_fragment:tR,map_pars_fragment:nR,map_particle_fragment:iR,map_particle_pars_fragment:rR,metalnessmap_fragment:sR,metalnessmap_pars_fragment:aR,morphinstance_vertex:oR,morphcolor_vertex:lR,morphnormal_vertex:cR,morphtarget_pars_vertex:uR,morphtarget_vertex:hR,normal_fragment_begin:dR,normal_fragment_maps:fR,normal_pars_fragment:pR,normal_pars_vertex:mR,normal_vertex:gR,normalmap_pars_fragment:vR,clearcoat_normal_fragment_begin:xR,clearcoat_normal_fragment_maps:_R,clearcoat_pars_fragment:yR,iridescence_pars_fragment:SR,opaque_fragment:MR,packing:ER,premultiplied_alpha_fragment:wR,project_vertex:TR,dithering_fragment:bR,dithering_pars_fragment:RR,roughnessmap_fragment:CR,roughnessmap_pars_fragment:AR,shadowmap_pars_fragment:PR,shadowmap_pars_vertex:NR,shadowmap_vertex:LR,shadowmask_pars_fragment:DR,skinbase_vertex:IR,skinning_pars_vertex:UR,skinning_vertex:FR,skinnormal_vertex:OR,specularmap_fragment:kR,specularmap_pars_fragment:zR,tonemapping_fragment:BR,tonemapping_pars_fragment:HR,transmission_fragment:VR,transmission_pars_fragment:GR,uv_pars_fragment:WR,uv_pars_vertex:jR,uv_vertex:XR,worldpos_vertex:$R,background_vert:qR,background_frag:YR,backgroundCube_vert:KR,backgroundCube_frag:QR,cube_vert:ZR,cube_frag:JR,depth_vert:eC,depth_frag:tC,distance_vert:nC,distance_frag:iC,equirect_vert:rC,equirect_frag:sC,linedashed_vert:aC,linedashed_frag:oC,meshbasic_vert:lC,meshbasic_frag:cC,meshlambert_vert:uC,meshlambert_frag:hC,meshmatcap_vert:dC,meshmatcap_frag:fC,meshnormal_vert:pC,meshnormal_frag:mC,meshphong_vert:gC,meshphong_frag:vC,meshphysical_vert:xC,meshphysical_frag:_C,meshtoon_vert:yC,meshtoon_frag:SC,points_vert:MC,points_frag:EC,shadow_vert:wC,shadow_frag:TC,sprite_vert:bC,sprite_frag:RC},ke={common:{diffuse:{value:new gt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new pt},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new pt}},envmap:{envMap:{value:null},envMapRotation:{value:new pt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new pt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new pt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new pt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new pt},normalScale:{value:new ht(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new pt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new pt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new pt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new pt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new gt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new J},probesMax:{value:new J},probesResolution:{value:new J}},points:{diffuse:{value:new gt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0},uvTransform:{value:new pt}},sprite:{diffuse:{value:new gt(16777215)},opacity:{value:1},center:{value:new ht(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new pt},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0}}},ur={basic:{uniforms:Yn([ke.common,ke.specularmap,ke.envmap,ke.aomap,ke.lightmap,ke.fog]),vertexShader:vt.meshbasic_vert,fragmentShader:vt.meshbasic_frag},lambert:{uniforms:Yn([ke.common,ke.specularmap,ke.envmap,ke.aomap,ke.lightmap,ke.emissivemap,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.fog,ke.lights,{emissive:{value:new gt(0)},envMapIntensity:{value:1}}]),vertexShader:vt.meshlambert_vert,fragmentShader:vt.meshlambert_frag},phong:{uniforms:Yn([ke.common,ke.specularmap,ke.envmap,ke.aomap,ke.lightmap,ke.emissivemap,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.fog,ke.lights,{emissive:{value:new gt(0)},specular:{value:new gt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:vt.meshphong_vert,fragmentShader:vt.meshphong_frag},standard:{uniforms:Yn([ke.common,ke.envmap,ke.aomap,ke.lightmap,ke.emissivemap,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.roughnessmap,ke.metalnessmap,ke.fog,ke.lights,{emissive:{value:new gt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:vt.meshphysical_vert,fragmentShader:vt.meshphysical_frag},toon:{uniforms:Yn([ke.common,ke.aomap,ke.lightmap,ke.emissivemap,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.gradientmap,ke.fog,ke.lights,{emissive:{value:new gt(0)}}]),vertexShader:vt.meshtoon_vert,fragmentShader:vt.meshtoon_frag},matcap:{uniforms:Yn([ke.common,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.fog,{matcap:{value:null}}]),vertexShader:vt.meshmatcap_vert,fragmentShader:vt.meshmatcap_frag},points:{uniforms:Yn([ke.points,ke.fog]),vertexShader:vt.points_vert,fragmentShader:vt.points_frag},dashed:{uniforms:Yn([ke.common,ke.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:vt.linedashed_vert,fragmentShader:vt.linedashed_frag},depth:{uniforms:Yn([ke.common,ke.displacementmap]),vertexShader:vt.depth_vert,fragmentShader:vt.depth_frag},normal:{uniforms:Yn([ke.common,ke.bumpmap,ke.normalmap,ke.displacementmap,{opacity:{value:1}}]),vertexShader:vt.meshnormal_vert,fragmentShader:vt.meshnormal_frag},sprite:{uniforms:Yn([ke.sprite,ke.fog]),vertexShader:vt.sprite_vert,fragmentShader:vt.sprite_frag},background:{uniforms:{uvTransform:{value:new pt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:vt.background_vert,fragmentShader:vt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new pt}},vertexShader:vt.backgroundCube_vert,fragmentShader:vt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:vt.cube_vert,fragmentShader:vt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:vt.equirect_vert,fragmentShader:vt.equirect_frag},distance:{uniforms:Yn([ke.common,ke.displacementmap,{referencePosition:{value:new J},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:vt.distance_vert,fragmentShader:vt.distance_frag},shadow:{uniforms:Yn([ke.lights,ke.fog,{color:{value:new gt(0)},opacity:{value:1}}]),vertexShader:vt.shadow_vert,fragmentShader:vt.shadow_frag}};ur.physical={uniforms:Yn([ur.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new pt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new pt},clearcoatNormalScale:{value:new ht(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new pt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new pt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new pt},sheen:{value:0},sheenColor:{value:new gt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new pt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new pt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new pt},transmissionSamplerSize:{value:new ht},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new pt},attenuationDistance:{value:0},attenuationColor:{value:new gt(0)},specularColor:{value:new gt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new pt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new pt},anisotropyVector:{value:new ht},anisotropyMap:{value:null},anisotropyMapTransform:{value:new pt}}]),vertexShader:vt.meshphysical_vert,fragmentShader:vt.meshphysical_frag};const Ou={r:0,b:0,g:0},CC=new rn,Sy=new pt;Sy.set(-1,0,0,0,1,0,0,0,1);function AC(i,e,t,r,a,l){const c=new gt(0);let h=a===!0?0:1,d,f,m=null,g=0,v=null;function x(P){let L=P.isScene===!0?P.background:null;if(L&&L.isTexture){const R=P.backgroundBlurriness>0;L=e.get(L,R)}return L}function M(P){let L=!1;const R=x(P);R===null?y(c,h):R&&R.isColor&&(y(R,1),L=!0);const D=i.xr.getEnvironmentBlendMode();D==="additive"?t.buffers.color.setClear(0,0,0,1,l):D==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,l),(i.autoClear||L)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function b(P,L){const R=x(L);R&&(R.isCubeTexture||R.mapping===mh)?(f===void 0&&(f=new Qi(new ic(1,1,1),new _r({name:"BackgroundCubeMaterial",uniforms:Uo(ur.backgroundCube.uniforms),vertexShader:ur.backgroundCube.vertexShader,fragmentShader:ur.backgroundCube.fragmentShader,side:hi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),f.geometry.deleteAttribute("normal"),f.geometry.deleteAttribute("uv"),f.onBeforeRender=function(D,N,F){this.matrixWorld.copyPosition(F.matrixWorld)},Object.defineProperty(f.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(f)),f.material.uniforms.envMap.value=R,f.material.uniforms.backgroundBlurriness.value=L.backgroundBlurriness,f.material.uniforms.backgroundIntensity.value=L.backgroundIntensity,f.material.uniforms.backgroundRotation.value.setFromMatrix4(CC.makeRotationFromEuler(L.backgroundRotation)).transpose(),R.isCubeTexture&&R.isRenderTargetTexture===!1&&f.material.uniforms.backgroundRotation.value.premultiply(Sy),f.material.toneMapped=bt.getTransfer(R.colorSpace)!==Bt,(m!==R||g!==R.version||v!==i.toneMapping)&&(f.material.needsUpdate=!0,m=R,g=R.version,v=i.toneMapping),f.layers.enableAll(),P.unshift(f,f.geometry,f.material,0,0,null)):R&&R.isTexture&&(d===void 0&&(d=new Qi(new vh(2,2),new _r({name:"BackgroundMaterial",uniforms:Uo(ur.background.uniforms),vertexShader:ur.background.vertexShader,fragmentShader:ur.background.fragmentShader,side:Is,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),d.geometry.deleteAttribute("normal"),Object.defineProperty(d.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(d)),d.material.uniforms.t2D.value=R,d.material.uniforms.backgroundIntensity.value=L.backgroundIntensity,d.material.toneMapped=bt.getTransfer(R.colorSpace)!==Bt,R.matrixAutoUpdate===!0&&R.updateMatrix(),d.material.uniforms.uvTransform.value.copy(R.matrix),(m!==R||g!==R.version||v!==i.toneMapping)&&(d.material.needsUpdate=!0,m=R,g=R.version,v=i.toneMapping),d.layers.enableAll(),P.unshift(d,d.geometry,d.material,0,0,null))}function y(P,L){P.getRGB(Ou,xy(i)),t.buffers.color.setClear(Ou.r,Ou.g,Ou.b,L,l)}function S(){f!==void 0&&(f.geometry.dispose(),f.material.dispose(),f=void 0),d!==void 0&&(d.geometry.dispose(),d.material.dispose(),d=void 0)}return{getClearColor:function(){return c},setClearColor:function(P,L=1){c.set(P),h=L,y(c,h)},getClearAlpha:function(){return h},setClearAlpha:function(P){h=P,y(c,h)},render:M,addToRenderList:b,dispose:S}}function PC(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),r={},a=v(null);let l=a,c=!1;function h(V,Y,me,de,O){let ce=!1;const Q=g(V,de,me,Y);l!==Q&&(l=Q,f(l.object)),ce=x(V,de,me,O),ce&&M(V,de,me,O),O!==null&&e.update(O,i.ELEMENT_ARRAY_BUFFER),(ce||c)&&(c=!1,R(V,Y,me,de),O!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(O).buffer))}function d(){return i.createVertexArray()}function f(V){return i.bindVertexArray(V)}function m(V){return i.deleteVertexArray(V)}function g(V,Y,me,de){const O=de.wireframe===!0;let ce=r[Y.id];ce===void 0&&(ce={},r[Y.id]=ce);const Q=V.isInstancedMesh===!0?V.id:0;let $=ce[Q];$===void 0&&($={},ce[Q]=$);let ne=$[me.id];ne===void 0&&(ne={},$[me.id]=ne);let he=ne[O];return he===void 0&&(he=v(d()),ne[O]=he),he}function v(V){const Y=[],me=[],de=[];for(let O=0;O<t;O++)Y[O]=0,me[O]=0,de[O]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:Y,enabledAttributes:me,attributeDivisors:de,object:V,attributes:{},index:null}}function x(V,Y,me,de){const O=l.attributes,ce=Y.attributes;let Q=0;const $=me.getAttributes();for(const ne in $)if($[ne].location>=0){const k=O[ne];let ee=ce[ne];if(ee===void 0&&(ne==="instanceMatrix"&&V.instanceMatrix&&(ee=V.instanceMatrix),ne==="instanceColor"&&V.instanceColor&&(ee=V.instanceColor)),k===void 0||k.attribute!==ee||ee&&k.data!==ee.data)return!0;Q++}return l.attributesNum!==Q||l.index!==de}function M(V,Y,me,de){const O={},ce=Y.attributes;let Q=0;const $=me.getAttributes();for(const ne in $)if($[ne].location>=0){let k=ce[ne];k===void 0&&(ne==="instanceMatrix"&&V.instanceMatrix&&(k=V.instanceMatrix),ne==="instanceColor"&&V.instanceColor&&(k=V.instanceColor));const ee={};ee.attribute=k,k&&k.data&&(ee.data=k.data),O[ne]=ee,Q++}l.attributes=O,l.attributesNum=Q,l.index=de}function b(){const V=l.newAttributes;for(let Y=0,me=V.length;Y<me;Y++)V[Y]=0}function y(V){S(V,0)}function S(V,Y){const me=l.newAttributes,de=l.enabledAttributes,O=l.attributeDivisors;me[V]=1,de[V]===0&&(i.enableVertexAttribArray(V),de[V]=1),O[V]!==Y&&(i.vertexAttribDivisor(V,Y),O[V]=Y)}function P(){const V=l.newAttributes,Y=l.enabledAttributes;for(let me=0,de=Y.length;me<de;me++)Y[me]!==V[me]&&(i.disableVertexAttribArray(me),Y[me]=0)}function L(V,Y,me,de,O,ce,Q){Q===!0?i.vertexAttribIPointer(V,Y,me,O,ce):i.vertexAttribPointer(V,Y,me,de,O,ce)}function R(V,Y,me,de){b();const O=de.attributes,ce=me.getAttributes(),Q=Y.defaultAttributeValues;for(const $ in ce){const ne=ce[$];if(ne.location>=0){let he=O[$];if(he===void 0&&($==="instanceMatrix"&&V.instanceMatrix&&(he=V.instanceMatrix),$==="instanceColor"&&V.instanceColor&&(he=V.instanceColor)),he!==void 0){const k=he.normalized,ee=he.itemSize,Fe=e.get(he);if(Fe===void 0)continue;const je=Fe.buffer,Ge=Fe.type,ue=Fe.bytesPerElement,Se=Ge===i.INT||Ge===i.UNSIGNED_INT||he.gpuType===Rm;if(he.isInterleavedBufferAttribute){const xe=he.data,te=xe.stride,Ue=he.offset;if(xe.isInstancedInterleavedBuffer){for(let tt=0;tt<ne.locationSize;tt++)S(ne.location+tt,xe.meshPerAttribute);V.isInstancedMesh!==!0&&de._maxInstanceCount===void 0&&(de._maxInstanceCount=xe.meshPerAttribute*xe.count)}else for(let tt=0;tt<ne.locationSize;tt++)y(ne.location+tt);i.bindBuffer(i.ARRAY_BUFFER,je);for(let tt=0;tt<ne.locationSize;tt++)L(ne.location+tt,ee/ne.locationSize,Ge,k,te*ue,(Ue+ee/ne.locationSize*tt)*ue,Se)}else{if(he.isInstancedBufferAttribute){for(let xe=0;xe<ne.locationSize;xe++)S(ne.location+xe,he.meshPerAttribute);V.isInstancedMesh!==!0&&de._maxInstanceCount===void 0&&(de._maxInstanceCount=he.meshPerAttribute*he.count)}else for(let xe=0;xe<ne.locationSize;xe++)y(ne.location+xe);i.bindBuffer(i.ARRAY_BUFFER,je);for(let xe=0;xe<ne.locationSize;xe++)L(ne.location+xe,ee/ne.locationSize,Ge,k,ee*ue,ee/ne.locationSize*xe*ue,Se)}}else if(Q!==void 0){const k=Q[$];if(k!==void 0)switch(k.length){case 2:i.vertexAttrib2fv(ne.location,k);break;case 3:i.vertexAttrib3fv(ne.location,k);break;case 4:i.vertexAttrib4fv(ne.location,k);break;default:i.vertexAttrib1fv(ne.location,k)}}}}P()}function D(){I();for(const V in r){const Y=r[V];for(const me in Y){const de=Y[me];for(const O in de){const ce=de[O];for(const Q in ce)m(ce[Q].object),delete ce[Q];delete de[O]}}delete r[V]}}function N(V){if(r[V.id]===void 0)return;const Y=r[V.id];for(const me in Y){const de=Y[me];for(const O in de){const ce=de[O];for(const Q in ce)m(ce[Q].object),delete ce[Q];delete de[O]}}delete r[V.id]}function F(V){for(const Y in r){const me=r[Y];for(const de in me){const O=me[de];if(O[V.id]===void 0)continue;const ce=O[V.id];for(const Q in ce)m(ce[Q].object),delete ce[Q];delete O[V.id]}}}function w(V){for(const Y in r){const me=r[Y],de=V.isInstancedMesh===!0?V.id:0,O=me[de];if(O!==void 0){for(const ce in O){const Q=O[ce];for(const $ in Q)m(Q[$].object),delete Q[$];delete O[ce]}delete me[de],Object.keys(me).length===0&&delete r[Y]}}}function I(){G(),c=!0,l!==a&&(l=a,f(l.object))}function G(){a.geometry=null,a.program=null,a.wireframe=!1}return{setup:h,reset:I,resetDefaultState:G,dispose:D,releaseStatesOfGeometry:N,releaseStatesOfObject:w,releaseStatesOfProgram:F,initAttributes:b,enableAttribute:y,disableUnusedAttributes:P}}function NC(i,e,t){let r;function a(d){r=d}function l(d,f){i.drawArrays(r,d,f),t.update(f,r,1)}function c(d,f,m){m!==0&&(i.drawArraysInstanced(r,d,f,m),t.update(f,r,m))}function h(d,f,m){if(m===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(r,d,0,f,0,m);let v=0;for(let x=0;x<m;x++)v+=f[x];t.update(v,r,1)}this.setMode=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function LC(i,e,t,r){let a;function l(){if(a!==void 0)return a;if(e.has("EXT_texture_filter_anisotropic")===!0){const F=e.get("EXT_texture_filter_anisotropic");a=i.getParameter(F.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else a=0;return a}function c(F){return!(F!==Yi&&r.convert(F)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function h(F){const w=F===Xr&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(F!==yi&&r.convert(F)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&F!==dr&&!w)}function d(F){if(F==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";F="mediump"}return F==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let f=t.precision!==void 0?t.precision:"highp";const m=d(f);m!==f&&(lt("WebGLRenderer:",f,"not supported, using",m,"instead."),f=m);const g=t.logarithmicDepthBuffer===!0,v=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&v===!1&&lt("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const x=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),M=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),b=i.getParameter(i.MAX_TEXTURE_SIZE),y=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),S=i.getParameter(i.MAX_VERTEX_ATTRIBS),P=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),L=i.getParameter(i.MAX_VARYING_VECTORS),R=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),D=i.getParameter(i.MAX_SAMPLES),N=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:l,getMaxPrecision:d,textureFormatReadable:c,textureTypeReadable:h,precision:f,logarithmicDepthBuffer:g,reversedDepthBuffer:v,maxTextures:x,maxVertexTextures:M,maxTextureSize:b,maxCubemapSize:y,maxAttributes:S,maxVertexUniforms:P,maxVaryings:L,maxFragmentUniforms:R,maxSamples:D,samples:N}}function DC(i){const e=this;let t=null,r=0,a=!1,l=!1;const c=new Ss,h=new pt,d={value:null,needsUpdate:!1};this.uniform=d,this.numPlanes=0,this.numIntersection=0,this.init=function(g,v){const x=g.length!==0||v||r!==0||a;return a=v,r=g.length,x},this.beginShadows=function(){l=!0,m(null)},this.endShadows=function(){l=!1},this.setGlobalState=function(g,v){t=m(g,v,0)},this.setState=function(g,v,x){const M=g.clippingPlanes,b=g.clipIntersection,y=g.clipShadows,S=i.get(g);if(!a||M===null||M.length===0||l&&!y)l?m(null):f();else{const P=l?0:r,L=P*4;let R=S.clippingState||null;d.value=R,R=m(M,v,L,x);for(let D=0;D!==L;++D)R[D]=t[D];S.clippingState=R,this.numIntersection=b?this.numPlanes:0,this.numPlanes+=P}};function f(){d.value!==t&&(d.value=t,d.needsUpdate=r>0),e.numPlanes=r,e.numIntersection=0}function m(g,v,x,M){const b=g!==null?g.length:0;let y=null;if(b!==0){if(y=d.value,M!==!0||y===null){const S=x+b*4,P=v.matrixWorldInverse;h.getNormalMatrix(P),(y===null||y.length<S)&&(y=new Float32Array(S));for(let L=0,R=x;L!==b;++L,R+=4)c.copy(g[L]).applyMatrix4(P,h),c.normal.toArray(y,R),y[R+3]=c.constant}d.value=y,d.needsUpdate=!0}return e.numPlanes=b,e.numIntersection=0,y}}const Ls=4,Tx=[.125,.215,.35,.446,.526,.582],oa=20,IC=256,Ll=new km,bx=new gt;let Hf=null,Vf=0,Gf=0,Wf=!1;const UC=new J;class Rx{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,r=.1,a=100,l={}){const{size:c=256,position:h=UC}=l;Hf=this._renderer.getRenderTarget(),Vf=this._renderer.getActiveCubeFace(),Gf=this._renderer.getActiveMipmapLevel(),Wf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(c);const d=this._allocateTargets();return d.depthBuffer=!0,this._sceneToCubeUV(e,r,a,d,h),t>0&&this._blur(d,0,0,t),this._applyPMREM(d),this._cleanup(d),d}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Px(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Ax(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Hf,Vf,Gf),this._renderer.xr.enabled=Wf,e.scissorTest=!1,lo(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Ma||e.mapping===Do?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Hf=this._renderer.getRenderTarget(),Vf=this._renderer.getActiveCubeFace(),Gf=this._renderer.getActiveMipmapLevel(),Wf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const r=t||this._allocateTargets();return this._textureToCubeUV(e,r),this._applyPMREM(r),this._cleanup(r),r}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,r={magFilter:Wn,minFilter:Wn,generateMipmaps:!1,type:Xr,format:Yi,colorSpace:sh,depthBuffer:!1},a=Cx(e,t,r);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Cx(e,t,r);const{_lodMax:l}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=FC(l)),this._blurMaterial=kC(l,e,t),this._ggxMaterial=OC(l,e,t)}return a}_compileMaterial(e){const t=new Qi(new Si,e);this._renderer.compile(t,Ll)}_sceneToCubeUV(e,t,r,a,l){const d=new Di(90,1,t,r),f=[1,-1,1,1,1,1],m=[1,1,1,-1,-1,-1],g=this._renderer,v=g.autoClear,x=g.toneMapping;g.getClearColor(bx),g.toneMapping=pr,g.autoClear=!1,g.state.buffers.depth.getReversed()&&(g.setRenderTarget(a),g.clearDepth(),g.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Qi(new ic,new my({name:"PMREM.Background",side:hi,depthWrite:!1,depthTest:!1})));const b=this._backgroundBox,y=b.material;let S=!1;const P=e.background;P?P.isColor&&(y.color.copy(P),e.background=null,S=!0):(y.color.copy(bx),S=!0);for(let L=0;L<6;L++){const R=L%3;R===0?(d.up.set(0,f[L],0),d.position.set(l.x,l.y,l.z),d.lookAt(l.x+m[L],l.y,l.z)):R===1?(d.up.set(0,0,f[L]),d.position.set(l.x,l.y,l.z),d.lookAt(l.x,l.y+m[L],l.z)):(d.up.set(0,f[L],0),d.position.set(l.x,l.y,l.z),d.lookAt(l.x,l.y,l.z+m[L]));const D=this._cubeSize;lo(a,R*D,L>2?D:0,D,D),g.setRenderTarget(a),S&&g.render(b,d),g.render(e,d)}g.toneMapping=x,g.autoClear=v,e.background=P}_textureToCubeUV(e,t){const r=this._renderer,a=e.mapping===Ma||e.mapping===Do;a?(this._cubemapMaterial===null&&(this._cubemapMaterial=Px()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Ax());const l=a?this._cubemapMaterial:this._equirectMaterial,c=this._lodMeshes[0];c.material=l;const h=l.uniforms;h.envMap.value=e;const d=this._cubeSize;lo(t,0,0,3*d,2*d),r.setRenderTarget(t),r.render(c,Ll)}_applyPMREM(e){const t=this._renderer,r=t.autoClear;t.autoClear=!1;const a=this._lodMeshes.length;for(let l=1;l<a;l++)this._applyGGXFilter(e,l-1,l);t.autoClear=r}_applyGGXFilter(e,t,r){const a=this._renderer,l=this._pingPongRenderTarget,c=this._ggxMaterial,h=this._lodMeshes[r];h.material=c;const d=c.uniforms,f=r/(this._lodMeshes.length-1),m=t/(this._lodMeshes.length-1),g=Math.sqrt(f*f-m*m),v=0+f*1.25,x=g*v,{_lodMax:M}=this,b=this._sizeLods[r],y=3*b*(r>M-Ls?r-M+Ls:0),S=4*(this._cubeSize-b);d.envMap.value=e.texture,d.roughness.value=x,d.mipInt.value=M-t,lo(l,y,S,3*b,2*b),a.setRenderTarget(l),a.render(h,Ll),d.envMap.value=l.texture,d.roughness.value=0,d.mipInt.value=M-r,lo(e,y,S,3*b,2*b),a.setRenderTarget(e),a.render(h,Ll)}_blur(e,t,r,a,l){const c=this._pingPongRenderTarget;this._halfBlur(e,c,t,r,a,"latitudinal",l),this._halfBlur(c,e,r,r,a,"longitudinal",l)}_halfBlur(e,t,r,a,l,c,h){const d=this._renderer,f=this._blurMaterial;c!=="latitudinal"&&c!=="longitudinal"&&Nt("blur direction must be either latitudinal or longitudinal!");const m=3,g=this._lodMeshes[a];g.material=f;const v=f.uniforms,x=this._sizeLods[r]-1,M=isFinite(l)?Math.PI/(2*x):2*Math.PI/(2*oa-1),b=l/M,y=isFinite(l)?1+Math.floor(m*b):oa;y>oa&&lt(`sigmaRadians, ${l}, is too large and will clip, as it requested ${y} samples when the maximum is set to ${oa}`);const S=[];let P=0;for(let F=0;F<oa;++F){const w=F/b,I=Math.exp(-w*w/2);S.push(I),F===0?P+=I:F<y&&(P+=2*I)}for(let F=0;F<S.length;F++)S[F]=S[F]/P;v.envMap.value=e.texture,v.samples.value=y,v.weights.value=S,v.latitudinal.value=c==="latitudinal",h&&(v.poleAxis.value=h);const{_lodMax:L}=this;v.dTheta.value=M,v.mipInt.value=L-r;const R=this._sizeLods[a],D=3*R*(a>L-Ls?a-L+Ls:0),N=4*(this._cubeSize-R);lo(t,D,N,3*R,2*R),d.setRenderTarget(t),d.render(g,Ll)}}function FC(i){const e=[],t=[],r=[];let a=i;const l=i-Ls+1+Tx.length;for(let c=0;c<l;c++){const h=Math.pow(2,a);e.push(h);let d=1/h;c>i-Ls?d=Tx[c-i+Ls-1]:c===0&&(d=0),t.push(d);const f=1/(h-2),m=-f,g=1+f,v=[m,m,g,m,g,g,m,m,g,g,m,g],x=6,M=6,b=3,y=2,S=1,P=new Float32Array(b*M*x),L=new Float32Array(y*M*x),R=new Float32Array(S*M*x);for(let N=0;N<x;N++){const F=N%3*2/3-1,w=N>2?0:-1,I=[F,w,0,F+2/3,w,0,F+2/3,w+1,0,F,w,0,F+2/3,w+1,0,F,w+1,0];P.set(I,b*M*N),L.set(v,y*M*N);const G=[N,N,N,N,N,N];R.set(G,S*M*N)}const D=new Si;D.setAttribute("position",new gr(P,b)),D.setAttribute("uv",new gr(L,y)),D.setAttribute("faceIndex",new gr(R,S)),r.push(new Qi(D,null)),a>Ls&&a--}return{lodMeshes:r,sizeLods:e,sigmas:t}}function Cx(i,e,t){const r=new mr(i,e,t);return r.texture.mapping=mh,r.texture.name="PMREM.cubeUv",r.scissorTest=!0,r}function lo(i,e,t,r,a){i.viewport.set(e,t,r,a),i.scissor.set(e,t,r,a)}function OC(i,e,t){return new _r({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:IC,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:xh(),fragmentShader:`

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
		`,blending:Vr,depthTest:!1,depthWrite:!1})}function kC(i,e,t){const r=new Float32Array(oa),a=new J(0,1,0);return new _r({name:"SphericalGaussianBlur",defines:{n:oa,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:r},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:a}},vertexShader:xh(),fragmentShader:`

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
		`,blending:Vr,depthTest:!1,depthWrite:!1})}function Ax(){return new _r({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:xh(),fragmentShader:`

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
		`,blending:Vr,depthTest:!1,depthWrite:!1})}function Px(){return new _r({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:xh(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Vr,depthTest:!1,depthWrite:!1})}function xh(){return`

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
	`}class My extends mr{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const r={width:e,height:e,depth:1},a=[r,r,r,r,r,r];this.texture=new gy(a),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const r={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},a=new ic(5,5,5),l=new _r({name:"CubemapFromEquirect",uniforms:Uo(r.uniforms),vertexShader:r.vertexShader,fragmentShader:r.fragmentShader,side:hi,blending:Vr});l.uniforms.tEquirect.value=t;const c=new Qi(a,l),h=t.minFilter;return t.minFilter===ua&&(t.minFilter=Wn),new GT(1,10,this).update(e,c),t.minFilter=h,c.geometry.dispose(),c.material.dispose(),this}clear(e,t=!0,r=!0,a=!0){const l=e.getRenderTarget();for(let c=0;c<6;c++)e.setRenderTarget(this,c),e.clear(t,r,a);e.setRenderTarget(l)}}function zC(i){let e=new WeakMap,t=new WeakMap,r=null;function a(v,x=!1){return v==null?null:x?c(v):l(v)}function l(v){if(v&&v.isTexture){const x=v.mapping;if(x===uf||x===hf)if(e.has(v)){const M=e.get(v).texture;return h(M,v.mapping)}else{const M=v.image;if(M&&M.height>0){const b=new My(M.height);return b.fromEquirectangularTexture(i,v),e.set(v,b),v.addEventListener("dispose",f),h(b.texture,v.mapping)}else return null}}return v}function c(v){if(v&&v.isTexture){const x=v.mapping,M=x===uf||x===hf,b=x===Ma||x===Do;if(M||b){let y=t.get(v);const S=y!==void 0?y.texture.pmremVersion:0;if(v.isRenderTargetTexture&&v.pmremVersion!==S)return r===null&&(r=new Rx(i)),y=M?r.fromEquirectangular(v,y):r.fromCubemap(v,y),y.texture.pmremVersion=v.pmremVersion,t.set(v,y),y.texture;if(y!==void 0)return y.texture;{const P=v.image;return M&&P&&P.height>0||b&&P&&d(P)?(r===null&&(r=new Rx(i)),y=M?r.fromEquirectangular(v):r.fromCubemap(v),y.texture.pmremVersion=v.pmremVersion,t.set(v,y),v.addEventListener("dispose",m),y.texture):null}}}return v}function h(v,x){return x===uf?v.mapping=Ma:x===hf&&(v.mapping=Do),v}function d(v){let x=0;const M=6;for(let b=0;b<M;b++)v[b]!==void 0&&x++;return x===M}function f(v){const x=v.target;x.removeEventListener("dispose",f);const M=e.get(x);M!==void 0&&(e.delete(x),M.dispose())}function m(v){const x=v.target;x.removeEventListener("dispose",m);const M=t.get(x);M!==void 0&&(t.delete(x),M.dispose())}function g(){e=new WeakMap,t=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:a,dispose:g}}function BC(i){const e={};function t(r){if(e[r]!==void 0)return e[r];const a=i.getExtension(r);return e[r]=a,a}return{has:function(r){return t(r)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(r){const a=t(r);return a===null&&go("WebGLRenderer: "+r+" extension not supported."),a}}}function HC(i,e,t,r){const a={},l=new WeakMap;function c(g){const v=g.target;v.index!==null&&e.remove(v.index);for(const M in v.attributes)e.remove(v.attributes[M]);v.removeEventListener("dispose",c),delete a[v.id];const x=l.get(v);x&&(e.remove(x),l.delete(v)),r.releaseStatesOfGeometry(v),v.isInstancedBufferGeometry===!0&&delete v._maxInstanceCount,t.memory.geometries--}function h(g,v){return a[v.id]===!0||(v.addEventListener("dispose",c),a[v.id]=!0,t.memory.geometries++),v}function d(g){const v=g.attributes;for(const x in v)e.update(v[x],i.ARRAY_BUFFER)}function f(g){const v=[],x=g.index,M=g.attributes.position;let b=0;if(M===void 0)return;if(x!==null){const P=x.array;b=x.version;for(let L=0,R=P.length;L<R;L+=3){const D=P[L+0],N=P[L+1],F=P[L+2];v.push(D,N,N,F,F,D)}}else{const P=M.array;b=M.version;for(let L=0,R=P.length/3-1;L<R;L+=3){const D=L+0,N=L+1,F=L+2;v.push(D,N,N,F,F,D)}}const y=new(M.count>=65535?py:fy)(v,1);y.version=b;const S=l.get(g);S&&e.remove(S),l.set(g,y)}function m(g){const v=l.get(g);if(v){const x=g.index;x!==null&&v.version<x.version&&f(g)}else f(g);return l.get(g)}return{get:h,update:d,getWireframeAttribute:m}}function VC(i,e,t){let r;function a(g){r=g}let l,c;function h(g){l=g.type,c=g.bytesPerElement}function d(g,v){i.drawElements(r,v,l,g*c),t.update(v,r,1)}function f(g,v,x){x!==0&&(i.drawElementsInstanced(r,v,l,g*c,x),t.update(v,r,x))}function m(g,v,x){if(x===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(r,v,0,l,g,0,x);let b=0;for(let y=0;y<x;y++)b+=v[y];t.update(b,r,1)}this.setMode=a,this.setIndex=h,this.render=d,this.renderInstances=f,this.renderMultiDraw=m}function GC(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function r(l,c,h){switch(t.calls++,c){case i.TRIANGLES:t.triangles+=h*(l/3);break;case i.LINES:t.lines+=h*(l/2);break;case i.LINE_STRIP:t.lines+=h*(l-1);break;case i.LINE_LOOP:t.lines+=h*l;break;case i.POINTS:t.points+=h*l;break;default:Nt("WebGLInfo: Unknown draw mode:",c);break}}function a(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:a,update:r}}function WC(i,e,t){const r=new WeakMap,a=new ln;function l(c,h,d){const f=c.morphTargetInfluences,m=h.morphAttributes.position||h.morphAttributes.normal||h.morphAttributes.color,g=m!==void 0?m.length:0;let v=r.get(h);if(v===void 0||v.count!==g){let G=function(){w.dispose(),r.delete(h),h.removeEventListener("dispose",G)};var x=G;v!==void 0&&v.texture.dispose();const M=h.morphAttributes.position!==void 0,b=h.morphAttributes.normal!==void 0,y=h.morphAttributes.color!==void 0,S=h.morphAttributes.position||[],P=h.morphAttributes.normal||[],L=h.morphAttributes.color||[];let R=0;M===!0&&(R=1),b===!0&&(R=2),y===!0&&(R=3);let D=h.attributes.position.count*R,N=1;D>e.maxTextureSize&&(N=Math.ceil(D/e.maxTextureSize),D=e.maxTextureSize);const F=new Float32Array(D*N*4*g),w=new uy(F,D,N,g);w.type=dr,w.needsUpdate=!0;const I=R*4;for(let V=0;V<g;V++){const Y=S[V],me=P[V],de=L[V],O=D*N*4*V;for(let ce=0;ce<Y.count;ce++){const Q=ce*I;M===!0&&(a.fromBufferAttribute(Y,ce),F[O+Q+0]=a.x,F[O+Q+1]=a.y,F[O+Q+2]=a.z,F[O+Q+3]=0),b===!0&&(a.fromBufferAttribute(me,ce),F[O+Q+4]=a.x,F[O+Q+5]=a.y,F[O+Q+6]=a.z,F[O+Q+7]=0),y===!0&&(a.fromBufferAttribute(de,ce),F[O+Q+8]=a.x,F[O+Q+9]=a.y,F[O+Q+10]=a.z,F[O+Q+11]=de.itemSize===4?a.w:1)}}v={count:g,texture:w,size:new ht(D,N)},r.set(h,v),h.addEventListener("dispose",G)}if(c.isInstancedMesh===!0&&c.morphTexture!==null)d.getUniforms().setValue(i,"morphTexture",c.morphTexture,t);else{let M=0;for(let y=0;y<f.length;y++)M+=f[y];const b=h.morphTargetsRelative?1:1-M;d.getUniforms().setValue(i,"morphTargetBaseInfluence",b),d.getUniforms().setValue(i,"morphTargetInfluences",f)}d.getUniforms().setValue(i,"morphTargetsTexture",v.texture,t),d.getUniforms().setValue(i,"morphTargetsTextureSize",v.size)}return{update:l}}function jC(i,e,t,r,a){let l=new WeakMap;function c(f){const m=a.render.frame,g=f.geometry,v=e.get(f,g);if(l.get(v)!==m&&(e.update(v),l.set(v,m)),f.isInstancedMesh&&(f.hasEventListener("dispose",d)===!1&&f.addEventListener("dispose",d),l.get(f)!==m&&(t.update(f.instanceMatrix,i.ARRAY_BUFFER),f.instanceColor!==null&&t.update(f.instanceColor,i.ARRAY_BUFFER),l.set(f,m))),f.isSkinnedMesh){const x=f.skeleton;l.get(x)!==m&&(x.update(),l.set(x,m))}return v}function h(){l=new WeakMap}function d(f){const m=f.target;m.removeEventListener("dispose",d),r.releaseStatesOfObject(m),t.remove(m.instanceMatrix),m.instanceColor!==null&&t.remove(m.instanceColor)}return{update:c,dispose:h}}const XC={[Y_]:"LINEAR_TONE_MAPPING",[K_]:"REINHARD_TONE_MAPPING",[Q_]:"CINEON_TONE_MAPPING",[bm]:"ACES_FILMIC_TONE_MAPPING",[J_]:"AGX_TONE_MAPPING",[ey]:"NEUTRAL_TONE_MAPPING",[Z_]:"CUSTOM_TONE_MAPPING"};function $C(i,e,t,r,a,l){const c=new mr(e,t,{type:i,depthBuffer:a,stencilBuffer:l,samples:r?4:0,depthTexture:a?new Io(e,t):void 0}),h=new mr(e,t,{type:Xr,depthBuffer:!1,stencilBuffer:!1}),d=new Si;d.setAttribute("position",new In([-1,3,0,-1,-1,0,3,-1,0],3)),d.setAttribute("uv",new In([0,2,0,0,2,0],2));const f=new AT({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),m=new Qi(d,f),g=new km(-1,1,1,-1,0,1);let v=null,x=null,M=!1,b,y=null,S=[],P=!1;this.setSize=function(L,R){c.setSize(L,R),h.setSize(L,R);for(let D=0;D<S.length;D++){const N=S[D];N.setSize&&N.setSize(L,R)}},this.setEffects=function(L){S=L,P=S.length>0&&S[0].isRenderPass===!0;const R=c.width,D=c.height;for(let N=0;N<S.length;N++){const F=S[N];F.setSize&&F.setSize(R,D)}},this.begin=function(L,R){if(M||L.toneMapping===pr&&S.length===0)return!1;if(y=R,R!==null){const D=R.width,N=R.height;(c.width!==D||c.height!==N)&&this.setSize(D,N)}return P===!1&&L.setRenderTarget(c),b=L.toneMapping,L.toneMapping=pr,!0},this.hasRenderPass=function(){return P},this.end=function(L,R){L.toneMapping=b,M=!0;let D=c,N=h;for(let F=0;F<S.length;F++){const w=S[F];if(w.enabled!==!1&&(w.render(L,N,D,R),w.needsSwap!==!1)){const I=D;D=N,N=I}}if(v!==L.outputColorSpace||x!==L.toneMapping){v=L.outputColorSpace,x=L.toneMapping,f.defines={},bt.getTransfer(v)===Bt&&(f.defines.SRGB_TRANSFER="");const F=XC[x];F&&(f.defines[F]=""),f.needsUpdate=!0}f.uniforms.tDiffuse.value=D.texture,L.setRenderTarget(y),L.render(m,g),y=null,M=!1},this.isCompositing=function(){return M},this.dispose=function(){c.depthTexture&&c.depthTexture.dispose(),c.dispose(),h.dispose(),d.dispose(),f.dispose()}}const Ey=new jn,tm=new Io(1,1),wy=new uy,Ty=new sT,by=new gy,Nx=[],Lx=[],Dx=new Float32Array(16),Ix=new Float32Array(9),Ux=new Float32Array(4);function Vo(i,e,t){const r=i[0];if(r<=0||r>0)return i;const a=e*t;let l=Nx[a];if(l===void 0&&(l=new Float32Array(a),Nx[a]=l),e!==0){r.toArray(l,0);for(let c=1,h=0;c!==e;++c)h+=t,i[c].toArray(l,h)}return l}function wn(i,e){if(i.length!==e.length)return!1;for(let t=0,r=i.length;t<r;t++)if(i[t]!==e[t])return!1;return!0}function Tn(i,e){for(let t=0,r=e.length;t<r;t++)i[t]=e[t]}function _h(i,e){let t=Lx[e];t===void 0&&(t=new Int32Array(e),Lx[e]=t);for(let r=0;r!==e;++r)t[r]=i.allocateTextureUnit();return t}function qC(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function YC(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wn(t,e))return;i.uniform2fv(this.addr,e),Tn(t,e)}}function KC(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(wn(t,e))return;i.uniform3fv(this.addr,e),Tn(t,e)}}function QC(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wn(t,e))return;i.uniform4fv(this.addr,e),Tn(t,e)}}function ZC(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(wn(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),Tn(t,e)}else{if(wn(t,r))return;Ux.set(r),i.uniformMatrix2fv(this.addr,!1,Ux),Tn(t,r)}}function JC(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(wn(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),Tn(t,e)}else{if(wn(t,r))return;Ix.set(r),i.uniformMatrix3fv(this.addr,!1,Ix),Tn(t,r)}}function eA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(wn(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),Tn(t,e)}else{if(wn(t,r))return;Dx.set(r),i.uniformMatrix4fv(this.addr,!1,Dx),Tn(t,r)}}function tA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function nA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wn(t,e))return;i.uniform2iv(this.addr,e),Tn(t,e)}}function iA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(wn(t,e))return;i.uniform3iv(this.addr,e),Tn(t,e)}}function rA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wn(t,e))return;i.uniform4iv(this.addr,e),Tn(t,e)}}function sA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function aA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wn(t,e))return;i.uniform2uiv(this.addr,e),Tn(t,e)}}function oA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(wn(t,e))return;i.uniform3uiv(this.addr,e),Tn(t,e)}}function lA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wn(t,e))return;i.uniform4uiv(this.addr,e),Tn(t,e)}}function cA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a);let l;this.type===i.SAMPLER_2D_SHADOW?(tm.compareFunction=t.isReversedDepthBuffer()?Im:Dm,l=tm):l=Ey,t.setTexture2D(e||l,a)}function uA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTexture3D(e||Ty,a)}function hA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTextureCube(e||by,a)}function dA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTexture2DArray(e||wy,a)}function fA(i){switch(i){case 5126:return qC;case 35664:return YC;case 35665:return KC;case 35666:return QC;case 35674:return ZC;case 35675:return JC;case 35676:return eA;case 5124:case 35670:return tA;case 35667:case 35671:return nA;case 35668:case 35672:return iA;case 35669:case 35673:return rA;case 5125:return sA;case 36294:return aA;case 36295:return oA;case 36296:return lA;case 35678:case 36198:case 36298:case 36306:case 35682:return cA;case 35679:case 36299:case 36307:return uA;case 35680:case 36300:case 36308:case 36293:return hA;case 36289:case 36303:case 36311:case 36292:return dA}}function pA(i,e){i.uniform1fv(this.addr,e)}function mA(i,e){const t=Vo(e,this.size,2);i.uniform2fv(this.addr,t)}function gA(i,e){const t=Vo(e,this.size,3);i.uniform3fv(this.addr,t)}function vA(i,e){const t=Vo(e,this.size,4);i.uniform4fv(this.addr,t)}function xA(i,e){const t=Vo(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function _A(i,e){const t=Vo(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function yA(i,e){const t=Vo(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function SA(i,e){i.uniform1iv(this.addr,e)}function MA(i,e){i.uniform2iv(this.addr,e)}function EA(i,e){i.uniform3iv(this.addr,e)}function wA(i,e){i.uniform4iv(this.addr,e)}function TA(i,e){i.uniform1uiv(this.addr,e)}function bA(i,e){i.uniform2uiv(this.addr,e)}function RA(i,e){i.uniform3uiv(this.addr,e)}function CA(i,e){i.uniform4uiv(this.addr,e)}function AA(i,e,t){const r=this.cache,a=e.length,l=_h(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),Tn(r,l));let c;this.type===i.SAMPLER_2D_SHADOW?c=tm:c=Ey;for(let h=0;h!==a;++h)t.setTexture2D(e[h]||c,l[h])}function PA(i,e,t){const r=this.cache,a=e.length,l=_h(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),Tn(r,l));for(let c=0;c!==a;++c)t.setTexture3D(e[c]||Ty,l[c])}function NA(i,e,t){const r=this.cache,a=e.length,l=_h(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),Tn(r,l));for(let c=0;c!==a;++c)t.setTextureCube(e[c]||by,l[c])}function LA(i,e,t){const r=this.cache,a=e.length,l=_h(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),Tn(r,l));for(let c=0;c!==a;++c)t.setTexture2DArray(e[c]||wy,l[c])}function DA(i){switch(i){case 5126:return pA;case 35664:return mA;case 35665:return gA;case 35666:return vA;case 35674:return xA;case 35675:return _A;case 35676:return yA;case 5124:case 35670:return SA;case 35667:case 35671:return MA;case 35668:case 35672:return EA;case 35669:case 35673:return wA;case 5125:return TA;case 36294:return bA;case 36295:return RA;case 36296:return CA;case 35678:case 36198:case 36298:case 36306:case 35682:return AA;case 35679:case 36299:case 36307:return PA;case 35680:case 36300:case 36308:case 36293:return NA;case 36289:case 36303:case 36311:case 36292:return LA}}class IA{constructor(e,t,r){this.id=e,this.addr=r,this.cache=[],this.type=t.type,this.setValue=fA(t.type)}}class UA{constructor(e,t,r){this.id=e,this.addr=r,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=DA(t.type)}}class FA{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,r){const a=this.seq;for(let l=0,c=a.length;l!==c;++l){const h=a[l];h.setValue(e,t[h.id],r)}}}const jf=/(\w+)(\])?(\[|\.)?/g;function Fx(i,e){i.seq.push(e),i.map[e.id]=e}function OA(i,e,t){const r=i.name,a=r.length;for(jf.lastIndex=0;;){const l=jf.exec(r),c=jf.lastIndex;let h=l[1];const d=l[2]==="]",f=l[3];if(d&&(h=h|0),f===void 0||f==="["&&c+2===a){Fx(t,f===void 0?new IA(h,i,e):new UA(h,i,e));break}else{let g=t.map[h];g===void 0&&(g=new FA(h),Fx(t,g)),t=g}}}class Qu{constructor(e,t){this.seq=[],this.map={};const r=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let c=0;c<r;++c){const h=e.getActiveUniform(t,c),d=e.getUniformLocation(t,h.name);OA(h,d,this)}const a=[],l=[];for(const c of this.seq)c.type===e.SAMPLER_2D_SHADOW||c.type===e.SAMPLER_CUBE_SHADOW||c.type===e.SAMPLER_2D_ARRAY_SHADOW?a.push(c):l.push(c);a.length>0&&(this.seq=a.concat(l))}setValue(e,t,r,a){const l=this.map[t];l!==void 0&&l.setValue(e,r,a)}setOptional(e,t,r){const a=t[r];a!==void 0&&this.setValue(e,r,a)}static upload(e,t,r,a){for(let l=0,c=t.length;l!==c;++l){const h=t[l],d=r[h.id];d.needsUpdate!==!1&&h.setValue(e,d.value,a)}}static seqWithValue(e,t){const r=[];for(let a=0,l=e.length;a!==l;++a){const c=e[a];c.id in t&&r.push(c)}return r}}function Ox(i,e,t){const r=i.createShader(e);return i.shaderSource(r,t),i.compileShader(r),r}const kA=37297;let zA=0;function BA(i,e){const t=i.split(`
`),r=[],a=Math.max(e-6,0),l=Math.min(e+6,t.length);for(let c=a;c<l;c++){const h=c+1;r.push(`${h===e?">":" "} ${h}: ${t[c]}`)}return r.join(`
`)}const kx=new pt;function HA(i){bt._getMatrix(kx,bt.workingColorSpace,i);const e=`mat3( ${kx.elements.map(t=>t.toFixed(4))} )`;switch(bt.getTransfer(i)){case ah:return[e,"LinearTransferOETF"];case Bt:return[e,"sRGBTransferOETF"];default:return lt("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function zx(i,e,t){const r=i.getShaderParameter(e,i.COMPILE_STATUS),l=(i.getShaderInfoLog(e)||"").trim();if(r&&l==="")return"";const c=/ERROR: 0:(\d+)/.exec(l);if(c){const h=parseInt(c[1]);return t.toUpperCase()+`

`+l+`

`+BA(i.getShaderSource(e),h)}else return l}function VA(i,e){const t=HA(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const GA={[Y_]:"Linear",[K_]:"Reinhard",[Q_]:"Cineon",[bm]:"ACESFilmic",[J_]:"AgX",[ey]:"Neutral",[Z_]:"Custom"};function WA(i,e){const t=GA[e];return t===void 0?(lt("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const ku=new J;function jA(){bt.getLuminanceCoefficients(ku);const i=ku.x.toFixed(4),e=ku.y.toFixed(4),t=ku.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function XA(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(kl).join(`
`)}function $A(i){const e=[];for(const t in i){const r=i[t];r!==!1&&e.push("#define "+t+" "+r)}return e.join(`
`)}function qA(i,e){const t={},r=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let a=0;a<r;a++){const l=i.getActiveAttrib(e,a),c=l.name;let h=1;l.type===i.FLOAT_MAT2&&(h=2),l.type===i.FLOAT_MAT3&&(h=3),l.type===i.FLOAT_MAT4&&(h=4),t[c]={type:l.type,location:i.getAttribLocation(e,c),locationSize:h}}return t}function kl(i){return i!==""}function Bx(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Hx(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const YA=/^[ \t]*#include +<([\w\d./]+)>/gm;function nm(i){return i.replace(YA,QA)}const KA=new Map;function QA(i,e){let t=vt[e];if(t===void 0){const r=KA.get(e);if(r!==void 0)t=vt[r],lt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,r);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return nm(t)}const ZA=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Vx(i){return i.replace(ZA,JA)}function JA(i,e,t,r){let a="";for(let l=parseInt(e);l<parseInt(t);l++)a+=r.replace(/\[\s*i\s*\]/g,"[ "+l+" ]").replace(/UNROLLED_LOOP_INDEX/g,l);return a}function Gx(i){let e=`precision ${i.precision} float;
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
#define LOW_PRECISION`),e}const eP={[Wu]:"SHADOWMAP_TYPE_PCF",[Ul]:"SHADOWMAP_TYPE_VSM"};function tP(i){return eP[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const nP={[Ma]:"ENVMAP_TYPE_CUBE",[Do]:"ENVMAP_TYPE_CUBE",[mh]:"ENVMAP_TYPE_CUBE_UV"};function iP(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":nP[i.envMapMode]||"ENVMAP_TYPE_CUBE"}const rP={[Do]:"ENVMAP_MODE_REFRACTION"};function sP(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":rP[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}const aP={[Tm]:"ENVMAP_BLENDING_MULTIPLY",[Ow]:"ENVMAP_BLENDING_MIX",[kw]:"ENVMAP_BLENDING_ADD"};function oP(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":aP[i.combine]||"ENVMAP_BLENDING_NONE"}function lP(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,r=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:r,maxMip:t}}function cP(i,e,t,r){const a=i.getContext(),l=t.defines;let c=t.vertexShader,h=t.fragmentShader;const d=tP(t),f=iP(t),m=sP(t),g=oP(t),v=lP(t),x=XA(t),M=$A(l),b=a.createProgram();let y,S,P=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(y=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,M].filter(kl).join(`
`),y.length>0&&(y+=`
`),S=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,M].filter(kl).join(`
`),S.length>0&&(S+=`
`)):(y=[Gx(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,M,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+m:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+d:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(kl).join(`
`),S=[Gx(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,M,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+f:"",t.envMap?"#define "+m:"",t.envMap?"#define "+g:"",v?"#define CUBEUV_TEXEL_WIDTH "+v.texelWidth:"",v?"#define CUBEUV_TEXEL_HEIGHT "+v.texelHeight:"",v?"#define CUBEUV_MAX_MIP "+v.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+d:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==pr?"#define TONE_MAPPING":"",t.toneMapping!==pr?vt.tonemapping_pars_fragment:"",t.toneMapping!==pr?WA("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",vt.colorspace_pars_fragment,VA("linearToOutputTexel",t.outputColorSpace),jA(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(kl).join(`
`)),c=nm(c),c=Bx(c,t),c=Hx(c,t),h=nm(h),h=Bx(h,t),h=Hx(h,t),c=Vx(c),h=Vx(h),t.isRawShaderMaterial!==!0&&(P=`#version 300 es
`,y=[x,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+y,S=["#define varying in",t.glslVersion===Xv?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Xv?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+S);const L=P+y+c,R=P+S+h,D=Ox(a,a.VERTEX_SHADER,L),N=Ox(a,a.FRAGMENT_SHADER,R);a.attachShader(b,D),a.attachShader(b,N),t.index0AttributeName!==void 0?a.bindAttribLocation(b,0,t.index0AttributeName):t.hasPositionAttribute===!0&&a.bindAttribLocation(b,0,"position"),a.linkProgram(b);function F(V){if(i.debug.checkShaderErrors){const Y=a.getProgramInfoLog(b)||"",me=a.getShaderInfoLog(D)||"",de=a.getShaderInfoLog(N)||"",O=Y.trim(),ce=me.trim(),Q=de.trim();let $=!0,ne=!0;if(a.getProgramParameter(b,a.LINK_STATUS)===!1)if($=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(a,b,D,N);else{const he=zx(a,D,"vertex"),k=zx(a,N,"fragment");Nt("WebGLProgram: Shader Error "+a.getError()+" - VALIDATE_STATUS "+a.getProgramParameter(b,a.VALIDATE_STATUS)+`

Material Name: `+V.name+`
Material Type: `+V.type+`

Program Info Log: `+O+`
`+he+`
`+k)}else O!==""?lt("WebGLProgram: Program Info Log:",O):(ce===""||Q==="")&&(ne=!1);ne&&(V.diagnostics={runnable:$,programLog:O,vertexShader:{log:ce,prefix:y},fragmentShader:{log:Q,prefix:S}})}a.deleteShader(D),a.deleteShader(N),w=new Qu(a,b),I=qA(a,b)}let w;this.getUniforms=function(){return w===void 0&&F(this),w};let I;this.getAttributes=function(){return I===void 0&&F(this),I};let G=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return G===!1&&(G=a.getProgramParameter(b,kA)),G},this.destroy=function(){r.releaseStatesOfProgram(this),a.deleteProgram(b),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=zA++,this.cacheKey=e,this.usedTimes=1,this.program=b,this.vertexShader=D,this.fragmentShader=N,this}let uP=0;class hP{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,r){const a=this._getShaderCacheForMaterial(e);return a.has(t)===!1&&(a.add(t),t.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const r of t)r.usedTimes--,r.usedTimes===0&&this.shaderCache.delete(r.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let r=t.get(e);return r===void 0&&(r=new Set,t.set(e,r)),r}_getShaderStage(e){const t=this.shaderCache;let r=t.get(e);return r===void 0&&(r=new dP(e),t.set(e,r)),r}}class dP{constructor(e){this.id=uP++,this.code=e,this.usedTimes=0}}function fP(i){return i===Ea||i===nh||i===ih}function pP(i,e,t,r,a,l){const c=new hy,h=new hP,d=new Set,f=[],m=new Map,g=r.logarithmicDepthBuffer;let v=r.precision;const x={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function M(w){return d.add(w),w===0?"uv":`uv${w}`}function b(w,I,G,V,Y,me){const de=V.fog,O=Y.geometry,ce=w.isMeshStandardMaterial||w.isMeshLambertMaterial||w.isMeshPhongMaterial?V.environment:null,Q=w.isMeshStandardMaterial||w.isMeshLambertMaterial&&!w.envMap||w.isMeshPhongMaterial&&!w.envMap,$=e.get(w.envMap||ce,Q),ne=$&&$.mapping===mh?$.image.height:null,he=x[w.type];w.precision!==null&&(v=r.getMaxPrecision(w.precision),v!==w.precision&&lt("WebGLProgram.getParameters:",w.precision,"not supported, using",v,"instead."));const k=O.morphAttributes.position||O.morphAttributes.normal||O.morphAttributes.color,ee=k!==void 0?k.length:0;let Fe=0;O.morphAttributes.position!==void 0&&(Fe=1),O.morphAttributes.normal!==void 0&&(Fe=2),O.morphAttributes.color!==void 0&&(Fe=3);let je,Ge,ue,Se;if(he){const qe=ur[he];je=qe.vertexShader,Ge=qe.fragmentShader}else{je=w.vertexShader,Ge=w.fragmentShader;const qe=h.getVertexShaderStage(w),Ht=h.getFragmentShaderStage(w);h.update(w,qe,Ht),ue=qe.id,Se=Ht.id}const xe=i.getRenderTarget(),te=i.state.buffers.depth.getReversed(),Ue=Y.isInstancedMesh===!0,tt=Y.isBatchedMesh===!0,Dt=!!w.map,ct=!!w.matcap,At=!!$,Et=!!w.aoMap,_t=!!w.lightMap,Wt=!!w.bumpMap&&w.wireframe===!1,$t=!!w.normalMap,Jt=!!w.displacementMap,qt=!!w.emissiveMap,wt=!!w.metalnessMap,Gt=!!w.roughnessMap,q=w.anisotropy>0,xn=w.clearcoat>0,Rt=w.dispersion>0,U=w.iridescence>0,T=w.sheen>0,Z=w.transmission>0,se=q&&!!w.anisotropyMap,ge=xn&&!!w.clearcoatMap,Te=xn&&!!w.clearcoatNormalMap,Ae=xn&&!!w.clearcoatRoughnessMap,ve=U&&!!w.iridescenceMap,_e=U&&!!w.iridescenceThicknessMap,Ie=T&&!!w.sheenColorMap,Xe=T&&!!w.sheenRoughnessMap,re=!!w.specularMap,Ee=!!w.specularColorMap,Be=!!w.specularIntensityMap,nt=Z&&!!w.transmissionMap,st=Z&&!!w.thicknessMap,j=!!w.gradientMap,Ne=!!w.alphaMap,ye=w.alphaTest>0,De=!!w.alphaHash,Oe=!!w.extensions;let Me=pr;w.toneMapped&&(xe===null||xe.isXRRenderTarget===!0)&&(Me=i.toneMapping);const Ke={shaderID:he,shaderType:w.type,shaderName:w.name,vertexShader:je,fragmentShader:Ge,defines:w.defines,customVertexShaderID:ue,customFragmentShaderID:Se,isRawShaderMaterial:w.isRawShaderMaterial===!0,glslVersion:w.glslVersion,precision:v,batching:tt,batchingColor:tt&&Y._colorsTexture!==null,instancing:Ue,instancingColor:Ue&&Y.instanceColor!==null,instancingMorph:Ue&&Y.morphTexture!==null,outputColorSpace:xe===null?i.outputColorSpace:xe.isXRRenderTarget===!0?xe.texture.colorSpace:bt.workingColorSpace,alphaToCoverage:!!w.alphaToCoverage,map:Dt,matcap:ct,envMap:At,envMapMode:At&&$.mapping,envMapCubeUVHeight:ne,aoMap:Et,lightMap:_t,bumpMap:Wt,normalMap:$t,displacementMap:Jt,emissiveMap:qt,normalMapObjectSpace:$t&&w.normalMapType===Hw,normalMapTangentSpace:$t&&w.normalMapType===rh,packedNormalMap:$t&&w.normalMapType===rh&&fP(w.normalMap.format),metalnessMap:wt,roughnessMap:Gt,anisotropy:q,anisotropyMap:se,clearcoat:xn,clearcoatMap:ge,clearcoatNormalMap:Te,clearcoatRoughnessMap:Ae,dispersion:Rt,iridescence:U,iridescenceMap:ve,iridescenceThicknessMap:_e,sheen:T,sheenColorMap:Ie,sheenRoughnessMap:Xe,specularMap:re,specularColorMap:Ee,specularIntensityMap:Be,transmission:Z,transmissionMap:nt,thicknessMap:st,gradientMap:j,opaque:w.transparent===!1&&w.blending===mo&&w.alphaToCoverage===!1,alphaMap:Ne,alphaTest:ye,alphaHash:De,combine:w.combine,mapUv:Dt&&M(w.map.channel),aoMapUv:Et&&M(w.aoMap.channel),lightMapUv:_t&&M(w.lightMap.channel),bumpMapUv:Wt&&M(w.bumpMap.channel),normalMapUv:$t&&M(w.normalMap.channel),displacementMapUv:Jt&&M(w.displacementMap.channel),emissiveMapUv:qt&&M(w.emissiveMap.channel),metalnessMapUv:wt&&M(w.metalnessMap.channel),roughnessMapUv:Gt&&M(w.roughnessMap.channel),anisotropyMapUv:se&&M(w.anisotropyMap.channel),clearcoatMapUv:ge&&M(w.clearcoatMap.channel),clearcoatNormalMapUv:Te&&M(w.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Ae&&M(w.clearcoatRoughnessMap.channel),iridescenceMapUv:ve&&M(w.iridescenceMap.channel),iridescenceThicknessMapUv:_e&&M(w.iridescenceThicknessMap.channel),sheenColorMapUv:Ie&&M(w.sheenColorMap.channel),sheenRoughnessMapUv:Xe&&M(w.sheenRoughnessMap.channel),specularMapUv:re&&M(w.specularMap.channel),specularColorMapUv:Ee&&M(w.specularColorMap.channel),specularIntensityMapUv:Be&&M(w.specularIntensityMap.channel),transmissionMapUv:nt&&M(w.transmissionMap.channel),thicknessMapUv:st&&M(w.thicknessMap.channel),alphaMapUv:Ne&&M(w.alphaMap.channel),vertexTangents:!!O.attributes.tangent&&($t||q),vertexNormals:!!O.attributes.normal,vertexColors:w.vertexColors,vertexAlphas:w.vertexColors===!0&&!!O.attributes.color&&O.attributes.color.itemSize===4,pointsUvs:Y.isPoints===!0&&!!O.attributes.uv&&(Dt||Ne),fog:!!de,useFog:w.fog===!0,fogExp2:!!de&&de.isFogExp2,flatShading:w.wireframe===!1&&(w.flatShading===!0||O.attributes.normal===void 0&&$t===!1&&(w.isMeshLambertMaterial||w.isMeshPhongMaterial||w.isMeshStandardMaterial||w.isMeshPhysicalMaterial)),sizeAttenuation:w.sizeAttenuation===!0,logarithmicDepthBuffer:g,reversedDepthBuffer:te,skinning:Y.isSkinnedMesh===!0,hasPositionAttribute:O.attributes.position!==void 0,morphTargets:O.morphAttributes.position!==void 0,morphNormals:O.morphAttributes.normal!==void 0,morphColors:O.morphAttributes.color!==void 0,morphTargetsCount:ee,morphTextureStride:Fe,numDirLights:I.directional.length,numPointLights:I.point.length,numSpotLights:I.spot.length,numSpotLightMaps:I.spotLightMap.length,numRectAreaLights:I.rectArea.length,numHemiLights:I.hemi.length,numDirLightShadows:I.directionalShadowMap.length,numPointLightShadows:I.pointShadowMap.length,numSpotLightShadows:I.spotShadowMap.length,numSpotLightShadowsWithMaps:I.numSpotLightShadowsWithMaps,numLightProbes:I.numLightProbes,numLightProbeGrids:me.length,numClippingPlanes:l.numPlanes,numClipIntersection:l.numIntersection,dithering:w.dithering,shadowMapEnabled:i.shadowMap.enabled&&G.length>0,shadowMapType:i.shadowMap.type,toneMapping:Me,decodeVideoTexture:Dt&&w.map.isVideoTexture===!0&&bt.getTransfer(w.map.colorSpace)===Bt,decodeVideoTextureEmissive:qt&&w.emissiveMap.isVideoTexture===!0&&bt.getTransfer(w.emissiveMap.colorSpace)===Bt,premultipliedAlpha:w.premultipliedAlpha,doubleSided:w.side===hr,flipSided:w.side===hi,useDepthPacking:w.depthPacking>=0,depthPacking:w.depthPacking||0,index0AttributeName:w.index0AttributeName,extensionClipCullDistance:Oe&&w.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Oe&&w.extensions.multiDraw===!0||tt)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:w.customProgramCacheKey()};return Ke.vertexUv1s=d.has(1),Ke.vertexUv2s=d.has(2),Ke.vertexUv3s=d.has(3),d.clear(),Ke}function y(w){const I=[];if(w.shaderID?I.push(w.shaderID):(I.push(w.customVertexShaderID),I.push(w.customFragmentShaderID)),w.defines!==void 0)for(const G in w.defines)I.push(G),I.push(w.defines[G]);return w.isRawShaderMaterial===!1&&(S(I,w),P(I,w),I.push(i.outputColorSpace)),I.push(w.customProgramCacheKey),I.join()}function S(w,I){w.push(I.precision),w.push(I.outputColorSpace),w.push(I.envMapMode),w.push(I.envMapCubeUVHeight),w.push(I.mapUv),w.push(I.alphaMapUv),w.push(I.lightMapUv),w.push(I.aoMapUv),w.push(I.bumpMapUv),w.push(I.normalMapUv),w.push(I.displacementMapUv),w.push(I.emissiveMapUv),w.push(I.metalnessMapUv),w.push(I.roughnessMapUv),w.push(I.anisotropyMapUv),w.push(I.clearcoatMapUv),w.push(I.clearcoatNormalMapUv),w.push(I.clearcoatRoughnessMapUv),w.push(I.iridescenceMapUv),w.push(I.iridescenceThicknessMapUv),w.push(I.sheenColorMapUv),w.push(I.sheenRoughnessMapUv),w.push(I.specularMapUv),w.push(I.specularColorMapUv),w.push(I.specularIntensityMapUv),w.push(I.transmissionMapUv),w.push(I.thicknessMapUv),w.push(I.combine),w.push(I.fogExp2),w.push(I.sizeAttenuation),w.push(I.morphTargetsCount),w.push(I.morphAttributeCount),w.push(I.numDirLights),w.push(I.numPointLights),w.push(I.numSpotLights),w.push(I.numSpotLightMaps),w.push(I.numHemiLights),w.push(I.numRectAreaLights),w.push(I.numDirLightShadows),w.push(I.numPointLightShadows),w.push(I.numSpotLightShadows),w.push(I.numSpotLightShadowsWithMaps),w.push(I.numLightProbes),w.push(I.shadowMapType),w.push(I.toneMapping),w.push(I.numClippingPlanes),w.push(I.numClipIntersection),w.push(I.depthPacking)}function P(w,I){c.disableAll(),I.instancing&&c.enable(0),I.instancingColor&&c.enable(1),I.instancingMorph&&c.enable(2),I.matcap&&c.enable(3),I.envMap&&c.enable(4),I.normalMapObjectSpace&&c.enable(5),I.normalMapTangentSpace&&c.enable(6),I.clearcoat&&c.enable(7),I.iridescence&&c.enable(8),I.alphaTest&&c.enable(9),I.vertexColors&&c.enable(10),I.vertexAlphas&&c.enable(11),I.vertexUv1s&&c.enable(12),I.vertexUv2s&&c.enable(13),I.vertexUv3s&&c.enable(14),I.vertexTangents&&c.enable(15),I.anisotropy&&c.enable(16),I.alphaHash&&c.enable(17),I.batching&&c.enable(18),I.dispersion&&c.enable(19),I.batchingColor&&c.enable(20),I.gradientMap&&c.enable(21),I.packedNormalMap&&c.enable(22),I.vertexNormals&&c.enable(23),w.push(c.mask),c.disableAll(),I.fog&&c.enable(0),I.useFog&&c.enable(1),I.flatShading&&c.enable(2),I.logarithmicDepthBuffer&&c.enable(3),I.reversedDepthBuffer&&c.enable(4),I.skinning&&c.enable(5),I.morphTargets&&c.enable(6),I.morphNormals&&c.enable(7),I.morphColors&&c.enable(8),I.premultipliedAlpha&&c.enable(9),I.shadowMapEnabled&&c.enable(10),I.doubleSided&&c.enable(11),I.flipSided&&c.enable(12),I.useDepthPacking&&c.enable(13),I.dithering&&c.enable(14),I.transmission&&c.enable(15),I.sheen&&c.enable(16),I.opaque&&c.enable(17),I.pointsUvs&&c.enable(18),I.decodeVideoTexture&&c.enable(19),I.decodeVideoTextureEmissive&&c.enable(20),I.alphaToCoverage&&c.enable(21),I.numLightProbeGrids>0&&c.enable(22),I.hasPositionAttribute&&c.enable(23),w.push(c.mask)}function L(w){const I=x[w.type];let G;if(I){const V=ur[I];G=bT.clone(V.uniforms)}else G=w.uniforms;return G}function R(w,I){let G=m.get(I);return G!==void 0?++G.usedTimes:(G=new cP(i,I,w,a),f.push(G),m.set(I,G)),G}function D(w){if(--w.usedTimes===0){const I=f.indexOf(w);f[I]=f[f.length-1],f.pop(),m.delete(w.cacheKey),w.destroy()}}function N(w){h.remove(w)}function F(){h.dispose()}return{getParameters:b,getProgramCacheKey:y,getUniforms:L,acquireProgram:R,releaseProgram:D,releaseShaderCache:N,programs:f,dispose:F}}function mP(){let i=new WeakMap;function e(c){return i.has(c)}function t(c){let h=i.get(c);return h===void 0&&(h={},i.set(c,h)),h}function r(c){i.delete(c)}function a(c,h,d){i.get(c)[h]=d}function l(){i=new WeakMap}return{has:e,get:t,remove:r,update:a,dispose:l}}function gP(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function Wx(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function jx(){const i=[];let e=0;const t=[],r=[],a=[];function l(){e=0,t.length=0,r.length=0,a.length=0}function c(v){let x=0;return v.isInstancedMesh&&(x+=2),v.isSkinnedMesh&&(x+=1),x}function h(v,x,M,b,y,S){let P=i[e];return P===void 0?(P={id:v.id,object:v,geometry:x,material:M,materialVariant:c(v),groupOrder:b,renderOrder:v.renderOrder,z:y,group:S},i[e]=P):(P.id=v.id,P.object=v,P.geometry=x,P.material=M,P.materialVariant=c(v),P.groupOrder=b,P.renderOrder=v.renderOrder,P.z=y,P.group=S),e++,P}function d(v,x,M,b,y,S){const P=h(v,x,M,b,y,S);M.transmission>0?r.push(P):M.transparent===!0?a.push(P):t.push(P)}function f(v,x,M,b,y,S){const P=h(v,x,M,b,y,S);M.transmission>0?r.unshift(P):M.transparent===!0?a.unshift(P):t.unshift(P)}function m(v,x,M){t.length>1&&t.sort(v||gP),r.length>1&&r.sort(x||Wx),a.length>1&&a.sort(x||Wx),M&&(t.reverse(),r.reverse(),a.reverse())}function g(){for(let v=e,x=i.length;v<x;v++){const M=i[v];if(M.id===null)break;M.id=null,M.object=null,M.geometry=null,M.material=null,M.group=null}}return{opaque:t,transmissive:r,transparent:a,init:l,push:d,unshift:f,finish:g,sort:m}}function vP(){let i=new WeakMap;function e(r,a){const l=i.get(r);let c;return l===void 0?(c=new jx,i.set(r,[c])):a>=l.length?(c=new jx,l.push(c)):c=l[a],c}function t(){i=new WeakMap}return{get:e,dispose:t}}function xP(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new J,color:new gt};break;case"SpotLight":t={position:new J,direction:new J,color:new gt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new J,color:new gt,distance:0,decay:0};break;case"HemisphereLight":t={direction:new J,skyColor:new gt,groundColor:new gt};break;case"RectAreaLight":t={color:new gt,position:new J,halfWidth:new J,halfHeight:new J};break}return i[e.id]=t,t}}}function _P(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ht};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ht};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ht,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let yP=0;function SP(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function MP(i){const e=new xP,t=_P(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let f=0;f<9;f++)r.probe.push(new J);const a=new J,l=new rn,c=new rn;function h(f){let m=0,g=0,v=0;for(let I=0;I<9;I++)r.probe[I].set(0,0,0);let x=0,M=0,b=0,y=0,S=0,P=0,L=0,R=0,D=0,N=0,F=0;f.sort(SP);for(let I=0,G=f.length;I<G;I++){const V=f[I],Y=V.color,me=V.intensity,de=V.distance;let O=null;if(V.shadow&&V.shadow.map&&(V.shadow.map.texture.format===Ea?O=V.shadow.map.texture:O=V.shadow.map.depthTexture||V.shadow.map.texture),V.isAmbientLight)m+=Y.r*me,g+=Y.g*me,v+=Y.b*me;else if(V.isLightProbe){for(let ce=0;ce<9;ce++)r.probe[ce].addScaledVector(V.sh.coefficients[ce],me);F++}else if(V.isDirectionalLight){const ce=e.get(V);if(ce.color.copy(V.color).multiplyScalar(V.intensity),V.castShadow){const Q=V.shadow,$=t.get(V);$.shadowIntensity=Q.intensity,$.shadowBias=Q.bias,$.shadowNormalBias=Q.normalBias,$.shadowRadius=Q.radius,$.shadowMapSize=Q.mapSize,r.directionalShadow[x]=$,r.directionalShadowMap[x]=O,r.directionalShadowMatrix[x]=V.shadow.matrix,P++}r.directional[x]=ce,x++}else if(V.isSpotLight){const ce=e.get(V);ce.position.setFromMatrixPosition(V.matrixWorld),ce.color.copy(Y).multiplyScalar(me),ce.distance=de,ce.coneCos=Math.cos(V.angle),ce.penumbraCos=Math.cos(V.angle*(1-V.penumbra)),ce.decay=V.decay,r.spot[b]=ce;const Q=V.shadow;if(V.map&&(r.spotLightMap[D]=V.map,D++,Q.updateMatrices(V),V.castShadow&&N++),r.spotLightMatrix[b]=Q.matrix,V.castShadow){const $=t.get(V);$.shadowIntensity=Q.intensity,$.shadowBias=Q.bias,$.shadowNormalBias=Q.normalBias,$.shadowRadius=Q.radius,$.shadowMapSize=Q.mapSize,r.spotShadow[b]=$,r.spotShadowMap[b]=O,R++}b++}else if(V.isRectAreaLight){const ce=e.get(V);ce.color.copy(Y).multiplyScalar(me),ce.halfWidth.set(V.width*.5,0,0),ce.halfHeight.set(0,V.height*.5,0),r.rectArea[y]=ce,y++}else if(V.isPointLight){const ce=e.get(V);if(ce.color.copy(V.color).multiplyScalar(V.intensity),ce.distance=V.distance,ce.decay=V.decay,V.castShadow){const Q=V.shadow,$=t.get(V);$.shadowIntensity=Q.intensity,$.shadowBias=Q.bias,$.shadowNormalBias=Q.normalBias,$.shadowRadius=Q.radius,$.shadowMapSize=Q.mapSize,$.shadowCameraNear=Q.camera.near,$.shadowCameraFar=Q.camera.far,r.pointShadow[M]=$,r.pointShadowMap[M]=O,r.pointShadowMatrix[M]=V.shadow.matrix,L++}r.point[M]=ce,M++}else if(V.isHemisphereLight){const ce=e.get(V);ce.skyColor.copy(V.color).multiplyScalar(me),ce.groundColor.copy(V.groundColor).multiplyScalar(me),r.hemi[S]=ce,S++}}y>0&&(i.has("OES_texture_float_linear")===!0?(r.rectAreaLTC1=ke.LTC_FLOAT_1,r.rectAreaLTC2=ke.LTC_FLOAT_2):(r.rectAreaLTC1=ke.LTC_HALF_1,r.rectAreaLTC2=ke.LTC_HALF_2)),r.ambient[0]=m,r.ambient[1]=g,r.ambient[2]=v;const w=r.hash;(w.directionalLength!==x||w.pointLength!==M||w.spotLength!==b||w.rectAreaLength!==y||w.hemiLength!==S||w.numDirectionalShadows!==P||w.numPointShadows!==L||w.numSpotShadows!==R||w.numSpotMaps!==D||w.numLightProbes!==F)&&(r.directional.length=x,r.spot.length=b,r.rectArea.length=y,r.point.length=M,r.hemi.length=S,r.directionalShadow.length=P,r.directionalShadowMap.length=P,r.pointShadow.length=L,r.pointShadowMap.length=L,r.spotShadow.length=R,r.spotShadowMap.length=R,r.directionalShadowMatrix.length=P,r.pointShadowMatrix.length=L,r.spotLightMatrix.length=R+D-N,r.spotLightMap.length=D,r.numSpotLightShadowsWithMaps=N,r.numLightProbes=F,w.directionalLength=x,w.pointLength=M,w.spotLength=b,w.rectAreaLength=y,w.hemiLength=S,w.numDirectionalShadows=P,w.numPointShadows=L,w.numSpotShadows=R,w.numSpotMaps=D,w.numLightProbes=F,r.version=yP++)}function d(f,m){let g=0,v=0,x=0,M=0,b=0;const y=m.matrixWorldInverse;for(let S=0,P=f.length;S<P;S++){const L=f[S];if(L.isDirectionalLight){const R=r.directional[g];R.direction.setFromMatrixPosition(L.matrixWorld),a.setFromMatrixPosition(L.target.matrixWorld),R.direction.sub(a),R.direction.transformDirection(y),g++}else if(L.isSpotLight){const R=r.spot[x];R.position.setFromMatrixPosition(L.matrixWorld),R.position.applyMatrix4(y),R.direction.setFromMatrixPosition(L.matrixWorld),a.setFromMatrixPosition(L.target.matrixWorld),R.direction.sub(a),R.direction.transformDirection(y),x++}else if(L.isRectAreaLight){const R=r.rectArea[M];R.position.setFromMatrixPosition(L.matrixWorld),R.position.applyMatrix4(y),c.identity(),l.copy(L.matrixWorld),l.premultiply(y),c.extractRotation(l),R.halfWidth.set(L.width*.5,0,0),R.halfHeight.set(0,L.height*.5,0),R.halfWidth.applyMatrix4(c),R.halfHeight.applyMatrix4(c),M++}else if(L.isPointLight){const R=r.point[v];R.position.setFromMatrixPosition(L.matrixWorld),R.position.applyMatrix4(y),v++}else if(L.isHemisphereLight){const R=r.hemi[b];R.direction.setFromMatrixPosition(L.matrixWorld),R.direction.transformDirection(y),b++}}}return{setup:h,setupView:d,state:r}}function Xx(i){const e=new MP(i),t=[],r=[],a=[];function l(v){g.camera=v,t.length=0,r.length=0,a.length=0}function c(v){t.push(v)}function h(v){r.push(v)}function d(v){a.push(v)}function f(){e.setup(t)}function m(v){e.setupView(t,v)}const g={lightsArray:t,shadowsArray:r,lightProbeGridArray:a,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:l,state:g,setupLights:f,setupLightsView:m,pushLight:c,pushShadow:h,pushLightProbeGrid:d}}function EP(i){let e=new WeakMap;function t(a,l=0){const c=e.get(a);let h;return c===void 0?(h=new Xx(i),e.set(a,[h])):l>=c.length?(h=new Xx(i),c.push(h)):h=c[l],h}function r(){e=new WeakMap}return{get:t,dispose:r}}const wP=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,TP=`uniform sampler2D shadow_pass;
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
}`,bP=[new J(1,0,0),new J(-1,0,0),new J(0,1,0),new J(0,-1,0),new J(0,0,1),new J(0,0,-1)],RP=[new J(0,-1,0),new J(0,-1,0),new J(0,0,1),new J(0,0,-1),new J(0,-1,0),new J(0,-1,0)],$x=new rn,Dl=new J,Xf=new J;function CP(i,e,t){let r=new Fm;const a=new ht,l=new ht,c=new ln,h=new NT,d=new LT,f={},m=t.maxTextureSize,g={[Is]:hi,[hi]:Is,[hr]:hr},v=new _r({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ht},radius:{value:4}},vertexShader:wP,fragmentShader:TP}),x=v.clone();x.defines.HORIZONTAL_PASS=1;const M=new Si;M.setAttribute("position",new gr(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const b=new Qi(M,v),y=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Wu;let S=this.type;this.render=function(N,F,w){if(y.enabled===!1||y.autoUpdate===!1&&y.needsUpdate===!1||N.length===0)return;this.type===xw&&(lt("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Wu);const I=i.getRenderTarget(),G=i.getActiveCubeFace(),V=i.getActiveMipmapLevel(),Y=i.state;Y.setBlending(Vr),Y.buffers.depth.getReversed()===!0?Y.buffers.color.setClear(0,0,0,0):Y.buffers.color.setClear(1,1,1,1),Y.buffers.depth.setTest(!0),Y.setScissorTest(!1);const me=S!==this.type;me&&F.traverse(function(de){de.material&&(Array.isArray(de.material)?de.material.forEach(O=>O.needsUpdate=!0):de.material.needsUpdate=!0)});for(let de=0,O=N.length;de<O;de++){const ce=N[de],Q=ce.shadow;if(Q===void 0){lt("WebGLShadowMap:",ce,"has no shadow.");continue}if(Q.autoUpdate===!1&&Q.needsUpdate===!1)continue;a.copy(Q.mapSize);const $=Q.getFrameExtents();a.multiply($),l.copy(Q.mapSize),(a.x>m||a.y>m)&&(a.x>m&&(l.x=Math.floor(m/$.x),a.x=l.x*$.x,Q.mapSize.x=l.x),a.y>m&&(l.y=Math.floor(m/$.y),a.y=l.y*$.y,Q.mapSize.y=l.y));const ne=i.state.buffers.depth.getReversed();if(Q.camera._reversedDepth=ne,Q.map===null||me===!0){if(Q.map!==null&&(Q.map.depthTexture!==null&&(Q.map.depthTexture.dispose(),Q.map.depthTexture=null),Q.map.dispose()),this.type===Ul){if(ce.isPointLight){lt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}Q.map=new mr(a.x,a.y,{format:Ea,type:Xr,minFilter:Wn,magFilter:Wn,generateMipmaps:!1}),Q.map.texture.name=ce.name+".shadowMap",Q.map.depthTexture=new Io(a.x,a.y,dr),Q.map.depthTexture.name=ce.name+".shadowMapDepth",Q.map.depthTexture.format=$r,Q.map.depthTexture.compareFunction=null,Q.map.depthTexture.minFilter=Un,Q.map.depthTexture.magFilter=Un}else ce.isPointLight?(Q.map=new My(a.x),Q.map.depthTexture=new wT(a.x,vr)):(Q.map=new mr(a.x,a.y),Q.map.depthTexture=new Io(a.x,a.y,vr)),Q.map.depthTexture.name=ce.name+".shadowMap",Q.map.depthTexture.format=$r,this.type===Wu?(Q.map.depthTexture.compareFunction=ne?Im:Dm,Q.map.depthTexture.minFilter=Wn,Q.map.depthTexture.magFilter=Wn):(Q.map.depthTexture.compareFunction=null,Q.map.depthTexture.minFilter=Un,Q.map.depthTexture.magFilter=Un);Q.camera.updateProjectionMatrix()}const he=Q.map.isWebGLCubeRenderTarget?6:1;for(let k=0;k<he;k++){if(Q.map.isWebGLCubeRenderTarget)i.setRenderTarget(Q.map,k),i.clear();else{k===0&&(i.setRenderTarget(Q.map),i.clear());const ee=Q.getViewport(k);c.set(l.x*ee.x,l.y*ee.y,l.x*ee.z,l.y*ee.w),Y.viewport(c)}if(ce.isPointLight){const ee=Q.camera,Fe=Q.matrix,je=ce.distance||ee.far;je!==ee.far&&(ee.far=je,ee.updateProjectionMatrix()),Dl.setFromMatrixPosition(ce.matrixWorld),ee.position.copy(Dl),Xf.copy(ee.position),Xf.add(bP[k]),ee.up.copy(RP[k]),ee.lookAt(Xf),ee.updateMatrixWorld(),Fe.makeTranslation(-Dl.x,-Dl.y,-Dl.z),$x.multiplyMatrices(ee.projectionMatrix,ee.matrixWorldInverse),Q._frustum.setFromProjectionMatrix($x,ee.coordinateSystem,ee.reversedDepth)}else Q.updateMatrices(ce);r=Q.getFrustum(),R(F,w,Q.camera,ce,this.type)}Q.isPointLightShadow!==!0&&this.type===Ul&&P(Q,w),Q.needsUpdate=!1}S=this.type,y.needsUpdate=!1,i.setRenderTarget(I,G,V)};function P(N,F){const w=e.update(b);v.defines.VSM_SAMPLES!==N.blurSamples&&(v.defines.VSM_SAMPLES=N.blurSamples,x.defines.VSM_SAMPLES=N.blurSamples,v.needsUpdate=!0,x.needsUpdate=!0),N.mapPass===null&&(N.mapPass=new mr(a.x,a.y,{format:Ea,type:Xr})),v.uniforms.shadow_pass.value=N.map.depthTexture,v.uniforms.resolution.value=N.mapSize,v.uniforms.radius.value=N.radius,i.setRenderTarget(N.mapPass),i.clear(),i.renderBufferDirect(F,null,w,v,b,null),x.uniforms.shadow_pass.value=N.mapPass.texture,x.uniforms.resolution.value=N.mapSize,x.uniforms.radius.value=N.radius,i.setRenderTarget(N.map),i.clear(),i.renderBufferDirect(F,null,w,x,b,null)}function L(N,F,w,I){let G=null;const V=w.isPointLight===!0?N.customDistanceMaterial:N.customDepthMaterial;if(V!==void 0)G=V;else if(G=w.isPointLight===!0?d:h,i.localClippingEnabled&&F.clipShadows===!0&&Array.isArray(F.clippingPlanes)&&F.clippingPlanes.length!==0||F.displacementMap&&F.displacementScale!==0||F.alphaMap&&F.alphaTest>0||F.map&&F.alphaTest>0||F.alphaToCoverage===!0){const Y=G.uuid,me=F.uuid;let de=f[Y];de===void 0&&(de={},f[Y]=de);let O=de[me];O===void 0&&(O=G.clone(),de[me]=O,F.addEventListener("dispose",D)),G=O}if(G.visible=F.visible,G.wireframe=F.wireframe,I===Ul?G.side=F.shadowSide!==null?F.shadowSide:F.side:G.side=F.shadowSide!==null?F.shadowSide:g[F.side],G.alphaMap=F.alphaMap,G.alphaTest=F.alphaToCoverage===!0?.5:F.alphaTest,G.map=F.map,G.clipShadows=F.clipShadows,G.clippingPlanes=F.clippingPlanes,G.clipIntersection=F.clipIntersection,G.displacementMap=F.displacementMap,G.displacementScale=F.displacementScale,G.displacementBias=F.displacementBias,G.wireframeLinewidth=F.wireframeLinewidth,G.linewidth=F.linewidth,w.isPointLight===!0&&G.isMeshDistanceMaterial===!0){const Y=i.properties.get(G);Y.light=w}return G}function R(N,F,w,I,G){if(N.visible===!1)return;if(N.layers.test(F.layers)&&(N.isMesh||N.isLine||N.isPoints)&&(N.castShadow||N.receiveShadow&&G===Ul)&&(!N.frustumCulled||r.intersectsObject(N))){N.modelViewMatrix.multiplyMatrices(w.matrixWorldInverse,N.matrixWorld);const me=e.update(N),de=N.material;if(Array.isArray(de)){const O=me.groups;for(let ce=0,Q=O.length;ce<Q;ce++){const $=O[ce],ne=de[$.materialIndex];if(ne&&ne.visible){const he=L(N,ne,I,G);N.onBeforeShadow(i,N,F,w,me,he,$),i.renderBufferDirect(w,null,me,he,N,$),N.onAfterShadow(i,N,F,w,me,he,$)}}}else if(de.visible){const O=L(N,de,I,G);N.onBeforeShadow(i,N,F,w,me,O,null),i.renderBufferDirect(w,null,me,O,N,null),N.onAfterShadow(i,N,F,w,me,O,null)}}const Y=N.children;for(let me=0,de=Y.length;me<de;me++)R(Y[me],F,w,I,G)}function D(N){N.target.removeEventListener("dispose",D);for(const w in f){const I=f[w],G=N.target.uuid;G in I&&(I[G].dispose(),delete I[G])}}}function AP(i,e){function t(){let j=!1;const Ne=new ln;let ye=null;const De=new ln(0,0,0,0);return{setMask:function(Oe){ye!==Oe&&!j&&(i.colorMask(Oe,Oe,Oe,Oe),ye=Oe)},setLocked:function(Oe){j=Oe},setClear:function(Oe,Me,Ke,qe,Ht){Ht===!0&&(Oe*=qe,Me*=qe,Ke*=qe),Ne.set(Oe,Me,Ke,qe),De.equals(Ne)===!1&&(i.clearColor(Oe,Me,Ke,qe),De.copy(Ne))},reset:function(){j=!1,ye=null,De.set(-1,0,0,0)}}}function r(){let j=!1,Ne=!1,ye=null,De=null,Oe=null;return{setReversed:function(Me){if(Ne!==Me){const Ke=e.get("EXT_clip_control");Me?Ke.clipControlEXT(Ke.LOWER_LEFT_EXT,Ke.ZERO_TO_ONE_EXT):Ke.clipControlEXT(Ke.LOWER_LEFT_EXT,Ke.NEGATIVE_ONE_TO_ONE_EXT),Ne=Me;const qe=Oe;Oe=null,this.setClear(qe)}},getReversed:function(){return Ne},setTest:function(Me){Me?xe(i.DEPTH_TEST):te(i.DEPTH_TEST)},setMask:function(Me){ye!==Me&&!j&&(i.depthMask(Me),ye=Me)},setFunc:function(Me){if(Ne&&(Me=Qw[Me]),De!==Me){switch(Me){case pp:i.depthFunc(i.NEVER);break;case mp:i.depthFunc(i.ALWAYS);break;case gp:i.depthFunc(i.LESS);break;case Lo:i.depthFunc(i.LEQUAL);break;case vp:i.depthFunc(i.EQUAL);break;case xp:i.depthFunc(i.GEQUAL);break;case _p:i.depthFunc(i.GREATER);break;case yp:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}De=Me}},setLocked:function(Me){j=Me},setClear:function(Me){Oe!==Me&&(Oe=Me,Ne&&(Me=1-Me),i.clearDepth(Me))},reset:function(){j=!1,ye=null,De=null,Oe=null,Ne=!1}}}function a(){let j=!1,Ne=null,ye=null,De=null,Oe=null,Me=null,Ke=null,qe=null,Ht=null;return{setTest:function(It){j||(It?xe(i.STENCIL_TEST):te(i.STENCIL_TEST))},setMask:function(It){Ne!==It&&!j&&(i.stencilMask(It),Ne=It)},setFunc:function(It,Fn,Ei){(ye!==It||De!==Fn||Oe!==Ei)&&(i.stencilFunc(It,Fn,Ei),ye=It,De=Fn,Oe=Ei)},setOp:function(It,Fn,Ei){(Me!==It||Ke!==Fn||qe!==Ei)&&(i.stencilOp(It,Fn,Ei),Me=It,Ke=Fn,qe=Ei)},setLocked:function(It){j=It},setClear:function(It){Ht!==It&&(i.clearStencil(It),Ht=It)},reset:function(){j=!1,Ne=null,ye=null,De=null,Oe=null,Me=null,Ke=null,qe=null,Ht=null}}}const l=new t,c=new r,h=new a,d=new WeakMap,f=new WeakMap;let m={},g={},v={},x=new WeakMap,M=[],b=null,y=!1,S=null,P=null,L=null,R=null,D=null,N=null,F=null,w=new gt(0,0,0),I=0,G=!1,V=null,Y=null,me=null,de=null,O=null;const ce=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let Q=!1,$=0;const ne=i.getParameter(i.VERSION);ne.indexOf("WebGL")!==-1?($=parseFloat(/^WebGL (\d)/.exec(ne)[1]),Q=$>=1):ne.indexOf("OpenGL ES")!==-1&&($=parseFloat(/^OpenGL ES (\d)/.exec(ne)[1]),Q=$>=2);let he=null,k={};const ee=i.getParameter(i.SCISSOR_BOX),Fe=i.getParameter(i.VIEWPORT),je=new ln().fromArray(ee),Ge=new ln().fromArray(Fe);function ue(j,Ne,ye,De){const Oe=new Uint8Array(4),Me=i.createTexture();i.bindTexture(j,Me),i.texParameteri(j,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(j,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Ke=0;Ke<ye;Ke++)j===i.TEXTURE_3D||j===i.TEXTURE_2D_ARRAY?i.texImage3D(Ne,0,i.RGBA,1,1,De,0,i.RGBA,i.UNSIGNED_BYTE,Oe):i.texImage2D(Ne+Ke,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Oe);return Me}const Se={};Se[i.TEXTURE_2D]=ue(i.TEXTURE_2D,i.TEXTURE_2D,1),Se[i.TEXTURE_CUBE_MAP]=ue(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),Se[i.TEXTURE_2D_ARRAY]=ue(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),Se[i.TEXTURE_3D]=ue(i.TEXTURE_3D,i.TEXTURE_3D,1,1),l.setClear(0,0,0,1),c.setClear(1),h.setClear(0),xe(i.DEPTH_TEST),c.setFunc(Lo),Wt(!1),$t(Bv),xe(i.CULL_FACE),Et(Vr);function xe(j){m[j]!==!0&&(i.enable(j),m[j]=!0)}function te(j){m[j]!==!1&&(i.disable(j),m[j]=!1)}function Ue(j,Ne){return v[j]!==Ne?(i.bindFramebuffer(j,Ne),v[j]=Ne,j===i.DRAW_FRAMEBUFFER&&(v[i.FRAMEBUFFER]=Ne),j===i.FRAMEBUFFER&&(v[i.DRAW_FRAMEBUFFER]=Ne),!0):!1}function tt(j,Ne){let ye=M,De=!1;if(j){ye=x.get(Ne),ye===void 0&&(ye=[],x.set(Ne,ye));const Oe=j.textures;if(ye.length!==Oe.length||ye[0]!==i.COLOR_ATTACHMENT0){for(let Me=0,Ke=Oe.length;Me<Ke;Me++)ye[Me]=i.COLOR_ATTACHMENT0+Me;ye.length=Oe.length,De=!0}}else ye[0]!==i.BACK&&(ye[0]=i.BACK,De=!0);De&&i.drawBuffers(ye)}function Dt(j){return b!==j?(i.useProgram(j),b=j,!0):!1}const ct={[aa]:i.FUNC_ADD,[yw]:i.FUNC_SUBTRACT,[Sw]:i.FUNC_REVERSE_SUBTRACT};ct[Mw]=i.MIN,ct[Ew]=i.MAX;const At={[ww]:i.ZERO,[Tw]:i.ONE,[bw]:i.SRC_COLOR,[dp]:i.SRC_ALPHA,[Lw]:i.SRC_ALPHA_SATURATE,[Pw]:i.DST_COLOR,[Cw]:i.DST_ALPHA,[Rw]:i.ONE_MINUS_SRC_COLOR,[fp]:i.ONE_MINUS_SRC_ALPHA,[Nw]:i.ONE_MINUS_DST_COLOR,[Aw]:i.ONE_MINUS_DST_ALPHA,[Dw]:i.CONSTANT_COLOR,[Iw]:i.ONE_MINUS_CONSTANT_COLOR,[Uw]:i.CONSTANT_ALPHA,[Fw]:i.ONE_MINUS_CONSTANT_ALPHA};function Et(j,Ne,ye,De,Oe,Me,Ke,qe,Ht,It){if(j===Vr){y===!0&&(te(i.BLEND),y=!1);return}if(y===!1&&(xe(i.BLEND),y=!0),j!==_w){if(j!==S||It!==G){if((P!==aa||D!==aa)&&(i.blendEquation(i.FUNC_ADD),P=aa,D=aa),It)switch(j){case mo:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Hv:i.blendFunc(i.ONE,i.ONE);break;case Vv:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Gv:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Nt("WebGLState: Invalid blending: ",j);break}else switch(j){case mo:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Hv:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case Vv:Nt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Gv:Nt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Nt("WebGLState: Invalid blending: ",j);break}L=null,R=null,N=null,F=null,w.set(0,0,0),I=0,S=j,G=It}return}Oe=Oe||Ne,Me=Me||ye,Ke=Ke||De,(Ne!==P||Oe!==D)&&(i.blendEquationSeparate(ct[Ne],ct[Oe]),P=Ne,D=Oe),(ye!==L||De!==R||Me!==N||Ke!==F)&&(i.blendFuncSeparate(At[ye],At[De],At[Me],At[Ke]),L=ye,R=De,N=Me,F=Ke),(qe.equals(w)===!1||Ht!==I)&&(i.blendColor(qe.r,qe.g,qe.b,Ht),w.copy(qe),I=Ht),S=j,G=!1}function _t(j,Ne){j.side===hr?te(i.CULL_FACE):xe(i.CULL_FACE);let ye=j.side===hi;Ne&&(ye=!ye),Wt(ye),j.blending===mo&&j.transparent===!1?Et(Vr):Et(j.blending,j.blendEquation,j.blendSrc,j.blendDst,j.blendEquationAlpha,j.blendSrcAlpha,j.blendDstAlpha,j.blendColor,j.blendAlpha,j.premultipliedAlpha),c.setFunc(j.depthFunc),c.setTest(j.depthTest),c.setMask(j.depthWrite),l.setMask(j.colorWrite);const De=j.stencilWrite;h.setTest(De),De&&(h.setMask(j.stencilWriteMask),h.setFunc(j.stencilFunc,j.stencilRef,j.stencilFuncMask),h.setOp(j.stencilFail,j.stencilZFail,j.stencilZPass)),qt(j.polygonOffset,j.polygonOffsetFactor,j.polygonOffsetUnits),j.alphaToCoverage===!0?xe(i.SAMPLE_ALPHA_TO_COVERAGE):te(i.SAMPLE_ALPHA_TO_COVERAGE)}function Wt(j){V!==j&&(j?i.frontFace(i.CW):i.frontFace(i.CCW),V=j)}function $t(j){j!==gw?(xe(i.CULL_FACE),j!==Y&&(j===Bv?i.cullFace(i.BACK):j===vw?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):te(i.CULL_FACE),Y=j}function Jt(j){j!==me&&(Q&&i.lineWidth(j),me=j)}function qt(j,Ne,ye){j?(xe(i.POLYGON_OFFSET_FILL),(de!==Ne||O!==ye)&&(de=Ne,O=ye,c.getReversed()&&(Ne=-Ne),i.polygonOffset(Ne,ye))):te(i.POLYGON_OFFSET_FILL)}function wt(j){j?xe(i.SCISSOR_TEST):te(i.SCISSOR_TEST)}function Gt(j){j===void 0&&(j=i.TEXTURE0+ce-1),he!==j&&(i.activeTexture(j),he=j)}function q(j,Ne,ye){ye===void 0&&(he===null?ye=i.TEXTURE0+ce-1:ye=he);let De=k[ye];De===void 0&&(De={type:void 0,texture:void 0},k[ye]=De),(De.type!==j||De.texture!==Ne)&&(he!==ye&&(i.activeTexture(ye),he=ye),i.bindTexture(j,Ne||Se[j]),De.type=j,De.texture=Ne)}function xn(){const j=k[he];j!==void 0&&j.type!==void 0&&(i.bindTexture(j.type,null),j.type=void 0,j.texture=void 0)}function Rt(){try{i.compressedTexImage2D(...arguments)}catch(j){Nt("WebGLState:",j)}}function U(){try{i.compressedTexImage3D(...arguments)}catch(j){Nt("WebGLState:",j)}}function T(){try{i.texSubImage2D(...arguments)}catch(j){Nt("WebGLState:",j)}}function Z(){try{i.texSubImage3D(...arguments)}catch(j){Nt("WebGLState:",j)}}function se(){try{i.compressedTexSubImage2D(...arguments)}catch(j){Nt("WebGLState:",j)}}function ge(){try{i.compressedTexSubImage3D(...arguments)}catch(j){Nt("WebGLState:",j)}}function Te(){try{i.texStorage2D(...arguments)}catch(j){Nt("WebGLState:",j)}}function Ae(){try{i.texStorage3D(...arguments)}catch(j){Nt("WebGLState:",j)}}function ve(){try{i.texImage2D(...arguments)}catch(j){Nt("WebGLState:",j)}}function _e(){try{i.texImage3D(...arguments)}catch(j){Nt("WebGLState:",j)}}function Ie(j){return g[j]!==void 0?g[j]:i.getParameter(j)}function Xe(j,Ne){g[j]!==Ne&&(i.pixelStorei(j,Ne),g[j]=Ne)}function re(j){je.equals(j)===!1&&(i.scissor(j.x,j.y,j.z,j.w),je.copy(j))}function Ee(j){Ge.equals(j)===!1&&(i.viewport(j.x,j.y,j.z,j.w),Ge.copy(j))}function Be(j,Ne){let ye=f.get(Ne);ye===void 0&&(ye=new WeakMap,f.set(Ne,ye));let De=ye.get(j);De===void 0&&(De=i.getUniformBlockIndex(Ne,j.name),ye.set(j,De))}function nt(j,Ne){const De=f.get(Ne).get(j);d.get(Ne)!==De&&(i.uniformBlockBinding(Ne,De,j.__bindingPointIndex),d.set(Ne,De))}function st(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),c.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),m={},g={},he=null,k={},v={},x=new WeakMap,M=[],b=null,y=!1,S=null,P=null,L=null,R=null,D=null,N=null,F=null,w=new gt(0,0,0),I=0,G=!1,V=null,Y=null,me=null,de=null,O=null,je.set(0,0,i.canvas.width,i.canvas.height),Ge.set(0,0,i.canvas.width,i.canvas.height),l.reset(),c.reset(),h.reset()}return{buffers:{color:l,depth:c,stencil:h},enable:xe,disable:te,bindFramebuffer:Ue,drawBuffers:tt,useProgram:Dt,setBlending:Et,setMaterial:_t,setFlipSided:Wt,setCullFace:$t,setLineWidth:Jt,setPolygonOffset:qt,setScissorTest:wt,activeTexture:Gt,bindTexture:q,unbindTexture:xn,compressedTexImage2D:Rt,compressedTexImage3D:U,texImage2D:ve,texImage3D:_e,pixelStorei:Xe,getParameter:Ie,updateUBOMapping:Be,uniformBlockBinding:nt,texStorage2D:Te,texStorage3D:Ae,texSubImage2D:T,texSubImage3D:Z,compressedTexSubImage2D:se,compressedTexSubImage3D:ge,scissor:re,viewport:Ee,reset:st}}function PP(i,e,t,r,a,l,c){const h=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,d=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),f=new ht,m=new WeakMap,g=new Set;let v;const x=new WeakMap;let M=!1;try{M=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function b(U,T){return M?new OffscreenCanvas(U,T):$l("canvas")}function y(U,T,Z){let se=1;const ge=Rt(U);if((ge.width>Z||ge.height>Z)&&(se=Z/Math.max(ge.width,ge.height)),se<1)if(typeof HTMLImageElement<"u"&&U instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&U instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&U instanceof ImageBitmap||typeof VideoFrame<"u"&&U instanceof VideoFrame){const Te=Math.floor(se*ge.width),Ae=Math.floor(se*ge.height);v===void 0&&(v=b(Te,Ae));const ve=T?b(Te,Ae):v;return ve.width=Te,ve.height=Ae,ve.getContext("2d").drawImage(U,0,0,Te,Ae),lt("WebGLRenderer: Texture has been resized from ("+ge.width+"x"+ge.height+") to ("+Te+"x"+Ae+")."),ve}else return"data"in U&&lt("WebGLRenderer: Image in DataTexture is too big ("+ge.width+"x"+ge.height+")."),U;return U}function S(U){return U.generateMipmaps}function P(U){i.generateMipmap(U)}function L(U){return U.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:U.isWebGL3DRenderTarget?i.TEXTURE_3D:U.isWebGLArrayRenderTarget||U.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function R(U,T,Z,se,ge,Te=!1){if(U!==null){if(i[U]!==void 0)return i[U];lt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+U+"'")}let Ae;se&&(Ae=e.get("EXT_texture_norm16"),Ae||lt("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let ve=T;if(T===i.RED&&(Z===i.FLOAT&&(ve=i.R32F),Z===i.HALF_FLOAT&&(ve=i.R16F),Z===i.UNSIGNED_BYTE&&(ve=i.R8),Z===i.UNSIGNED_SHORT&&Ae&&(ve=Ae.R16_EXT),Z===i.SHORT&&Ae&&(ve=Ae.R16_SNORM_EXT)),T===i.RED_INTEGER&&(Z===i.UNSIGNED_BYTE&&(ve=i.R8UI),Z===i.UNSIGNED_SHORT&&(ve=i.R16UI),Z===i.UNSIGNED_INT&&(ve=i.R32UI),Z===i.BYTE&&(ve=i.R8I),Z===i.SHORT&&(ve=i.R16I),Z===i.INT&&(ve=i.R32I)),T===i.RG&&(Z===i.FLOAT&&(ve=i.RG32F),Z===i.HALF_FLOAT&&(ve=i.RG16F),Z===i.UNSIGNED_BYTE&&(ve=i.RG8),Z===i.UNSIGNED_SHORT&&Ae&&(ve=Ae.RG16_EXT),Z===i.SHORT&&Ae&&(ve=Ae.RG16_SNORM_EXT)),T===i.RG_INTEGER&&(Z===i.UNSIGNED_BYTE&&(ve=i.RG8UI),Z===i.UNSIGNED_SHORT&&(ve=i.RG16UI),Z===i.UNSIGNED_INT&&(ve=i.RG32UI),Z===i.BYTE&&(ve=i.RG8I),Z===i.SHORT&&(ve=i.RG16I),Z===i.INT&&(ve=i.RG32I)),T===i.RGB_INTEGER&&(Z===i.UNSIGNED_BYTE&&(ve=i.RGB8UI),Z===i.UNSIGNED_SHORT&&(ve=i.RGB16UI),Z===i.UNSIGNED_INT&&(ve=i.RGB32UI),Z===i.BYTE&&(ve=i.RGB8I),Z===i.SHORT&&(ve=i.RGB16I),Z===i.INT&&(ve=i.RGB32I)),T===i.RGBA_INTEGER&&(Z===i.UNSIGNED_BYTE&&(ve=i.RGBA8UI),Z===i.UNSIGNED_SHORT&&(ve=i.RGBA16UI),Z===i.UNSIGNED_INT&&(ve=i.RGBA32UI),Z===i.BYTE&&(ve=i.RGBA8I),Z===i.SHORT&&(ve=i.RGBA16I),Z===i.INT&&(ve=i.RGBA32I)),T===i.RGB&&(Z===i.UNSIGNED_SHORT&&Ae&&(ve=Ae.RGB16_EXT),Z===i.SHORT&&Ae&&(ve=Ae.RGB16_SNORM_EXT),Z===i.UNSIGNED_INT_5_9_9_9_REV&&(ve=i.RGB9_E5),Z===i.UNSIGNED_INT_10F_11F_11F_REV&&(ve=i.R11F_G11F_B10F)),T===i.RGBA){const _e=Te?ah:bt.getTransfer(ge);Z===i.FLOAT&&(ve=i.RGBA32F),Z===i.HALF_FLOAT&&(ve=i.RGBA16F),Z===i.UNSIGNED_BYTE&&(ve=_e===Bt?i.SRGB8_ALPHA8:i.RGBA8),Z===i.UNSIGNED_SHORT&&Ae&&(ve=Ae.RGBA16_EXT),Z===i.SHORT&&Ae&&(ve=Ae.RGBA16_SNORM_EXT),Z===i.UNSIGNED_SHORT_4_4_4_4&&(ve=i.RGBA4),Z===i.UNSIGNED_SHORT_5_5_5_1&&(ve=i.RGB5_A1)}return(ve===i.R16F||ve===i.R32F||ve===i.RG16F||ve===i.RG32F||ve===i.RGBA16F||ve===i.RGBA32F)&&e.get("EXT_color_buffer_float"),ve}function D(U,T){let Z;return U?T===null||T===vr||T===jl?Z=i.DEPTH24_STENCIL8:T===dr?Z=i.DEPTH32F_STENCIL8:T===Wl&&(Z=i.DEPTH24_STENCIL8,lt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):T===null||T===vr||T===jl?Z=i.DEPTH_COMPONENT24:T===dr?Z=i.DEPTH_COMPONENT32F:T===Wl&&(Z=i.DEPTH_COMPONENT16),Z}function N(U,T){return S(U)===!0||U.isFramebufferTexture&&U.minFilter!==Un&&U.minFilter!==Wn?Math.log2(Math.max(T.width,T.height))+1:U.mipmaps!==void 0&&U.mipmaps.length>0?U.mipmaps.length:U.isCompressedTexture&&Array.isArray(U.image)?T.mipmaps.length:1}function F(U){const T=U.target;T.removeEventListener("dispose",F),I(T),T.isVideoTexture&&m.delete(T),T.isHTMLTexture&&g.delete(T)}function w(U){const T=U.target;T.removeEventListener("dispose",w),V(T)}function I(U){const T=r.get(U);if(T.__webglInit===void 0)return;const Z=U.source,se=x.get(Z);if(se){const ge=se[T.__cacheKey];ge.usedTimes--,ge.usedTimes===0&&G(U),Object.keys(se).length===0&&x.delete(Z)}r.remove(U)}function G(U){const T=r.get(U);i.deleteTexture(T.__webglTexture);const Z=U.source,se=x.get(Z);delete se[T.__cacheKey],c.memory.textures--}function V(U){const T=r.get(U);if(U.depthTexture&&(U.depthTexture.dispose(),r.remove(U.depthTexture)),U.isWebGLCubeRenderTarget)for(let se=0;se<6;se++){if(Array.isArray(T.__webglFramebuffer[se]))for(let ge=0;ge<T.__webglFramebuffer[se].length;ge++)i.deleteFramebuffer(T.__webglFramebuffer[se][ge]);else i.deleteFramebuffer(T.__webglFramebuffer[se]);T.__webglDepthbuffer&&i.deleteRenderbuffer(T.__webglDepthbuffer[se])}else{if(Array.isArray(T.__webglFramebuffer))for(let se=0;se<T.__webglFramebuffer.length;se++)i.deleteFramebuffer(T.__webglFramebuffer[se]);else i.deleteFramebuffer(T.__webglFramebuffer);if(T.__webglDepthbuffer&&i.deleteRenderbuffer(T.__webglDepthbuffer),T.__webglMultisampledFramebuffer&&i.deleteFramebuffer(T.__webglMultisampledFramebuffer),T.__webglColorRenderbuffer)for(let se=0;se<T.__webglColorRenderbuffer.length;se++)T.__webglColorRenderbuffer[se]&&i.deleteRenderbuffer(T.__webglColorRenderbuffer[se]);T.__webglDepthRenderbuffer&&i.deleteRenderbuffer(T.__webglDepthRenderbuffer)}const Z=U.textures;for(let se=0,ge=Z.length;se<ge;se++){const Te=r.get(Z[se]);Te.__webglTexture&&(i.deleteTexture(Te.__webglTexture),c.memory.textures--),r.remove(Z[se])}r.remove(U)}let Y=0;function me(){Y=0}function de(){return Y}function O(U){Y=U}function ce(){const U=Y;return U>=a.maxTextures&&lt("WebGLTextures: Trying to use "+U+" texture units while this GPU supports only "+a.maxTextures),Y+=1,U}function Q(U){const T=[];return T.push(U.wrapS),T.push(U.wrapT),T.push(U.wrapR||0),T.push(U.magFilter),T.push(U.minFilter),T.push(U.anisotropy),T.push(U.internalFormat),T.push(U.format),T.push(U.type),T.push(U.generateMipmaps),T.push(U.premultiplyAlpha),T.push(U.flipY),T.push(U.unpackAlignment),T.push(U.colorSpace),T.join()}function $(U,T){const Z=r.get(U);if(U.isVideoTexture&&q(U),U.isRenderTargetTexture===!1&&U.isExternalTexture!==!0&&U.version>0&&Z.__version!==U.version){const se=U.image;if(se===null)lt("WebGLRenderer: Texture marked for update but no image data found.");else if(se.complete===!1)lt("WebGLRenderer: Texture marked for update but image is incomplete");else{te(Z,U,T);return}}else U.isExternalTexture&&(Z.__webglTexture=U.sourceTexture?U.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,Z.__webglTexture,i.TEXTURE0+T)}function ne(U,T){const Z=r.get(U);if(U.isRenderTargetTexture===!1&&U.version>0&&Z.__version!==U.version){te(Z,U,T);return}else U.isExternalTexture&&(Z.__webglTexture=U.sourceTexture?U.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,Z.__webglTexture,i.TEXTURE0+T)}function he(U,T){const Z=r.get(U);if(U.isRenderTargetTexture===!1&&U.version>0&&Z.__version!==U.version){te(Z,U,T);return}t.bindTexture(i.TEXTURE_3D,Z.__webglTexture,i.TEXTURE0+T)}function k(U,T){const Z=r.get(U);if(U.isCubeDepthTexture!==!0&&U.version>0&&Z.__version!==U.version){Ue(Z,U,T);return}t.bindTexture(i.TEXTURE_CUBE_MAP,Z.__webglTexture,i.TEXTURE0+T)}const ee={[Sp]:i.REPEAT,[Hr]:i.CLAMP_TO_EDGE,[Mp]:i.MIRRORED_REPEAT},Fe={[Un]:i.NEAREST,[zw]:i.NEAREST_MIPMAP_NEAREST,[fu]:i.NEAREST_MIPMAP_LINEAR,[Wn]:i.LINEAR,[df]:i.LINEAR_MIPMAP_NEAREST,[ua]:i.LINEAR_MIPMAP_LINEAR},je={[Vw]:i.NEVER,[$w]:i.ALWAYS,[Gw]:i.LESS,[Dm]:i.LEQUAL,[Ww]:i.EQUAL,[Im]:i.GEQUAL,[jw]:i.GREATER,[Xw]:i.NOTEQUAL};function Ge(U,T){if(T.type===dr&&e.has("OES_texture_float_linear")===!1&&(T.magFilter===Wn||T.magFilter===df||T.magFilter===fu||T.magFilter===ua||T.minFilter===Wn||T.minFilter===df||T.minFilter===fu||T.minFilter===ua)&&lt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(U,i.TEXTURE_WRAP_S,ee[T.wrapS]),i.texParameteri(U,i.TEXTURE_WRAP_T,ee[T.wrapT]),(U===i.TEXTURE_3D||U===i.TEXTURE_2D_ARRAY)&&i.texParameteri(U,i.TEXTURE_WRAP_R,ee[T.wrapR]),i.texParameteri(U,i.TEXTURE_MAG_FILTER,Fe[T.magFilter]),i.texParameteri(U,i.TEXTURE_MIN_FILTER,Fe[T.minFilter]),T.compareFunction&&(i.texParameteri(U,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(U,i.TEXTURE_COMPARE_FUNC,je[T.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(T.magFilter===Un||T.minFilter!==fu&&T.minFilter!==ua||T.type===dr&&e.has("OES_texture_float_linear")===!1)return;if(T.anisotropy>1||r.get(T).__currentAnisotropy){const Z=e.get("EXT_texture_filter_anisotropic");i.texParameterf(U,Z.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(T.anisotropy,a.getMaxAnisotropy())),r.get(T).__currentAnisotropy=T.anisotropy}}}function ue(U,T){let Z=!1;U.__webglInit===void 0&&(U.__webglInit=!0,T.addEventListener("dispose",F));const se=T.source;let ge=x.get(se);ge===void 0&&(ge={},x.set(se,ge));const Te=Q(T);if(Te!==U.__cacheKey){ge[Te]===void 0&&(ge[Te]={texture:i.createTexture(),usedTimes:0},c.memory.textures++,Z=!0),ge[Te].usedTimes++;const Ae=ge[U.__cacheKey];Ae!==void 0&&(ge[U.__cacheKey].usedTimes--,Ae.usedTimes===0&&G(T)),U.__cacheKey=Te,U.__webglTexture=ge[Te].texture}return Z}function Se(U,T,Z){return Math.floor(Math.floor(U/Z)/T)}function xe(U,T,Z,se){const Te=U.updateRanges;if(Te.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,T.width,T.height,Z,se,T.data);else{Te.sort((Xe,re)=>Xe.start-re.start);let Ae=0;for(let Xe=1;Xe<Te.length;Xe++){const re=Te[Ae],Ee=Te[Xe],Be=re.start+re.count,nt=Se(Ee.start,T.width,4),st=Se(re.start,T.width,4);Ee.start<=Be+1&&nt===st&&Se(Ee.start+Ee.count-1,T.width,4)===nt?re.count=Math.max(re.count,Ee.start+Ee.count-re.start):(++Ae,Te[Ae]=Ee)}Te.length=Ae+1;const ve=t.getParameter(i.UNPACK_ROW_LENGTH),_e=t.getParameter(i.UNPACK_SKIP_PIXELS),Ie=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,T.width);for(let Xe=0,re=Te.length;Xe<re;Xe++){const Ee=Te[Xe],Be=Math.floor(Ee.start/4),nt=Math.ceil(Ee.count/4),st=Be%T.width,j=Math.floor(Be/T.width),Ne=nt,ye=1;t.pixelStorei(i.UNPACK_SKIP_PIXELS,st),t.pixelStorei(i.UNPACK_SKIP_ROWS,j),t.texSubImage2D(i.TEXTURE_2D,0,st,j,Ne,ye,Z,se,T.data)}U.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,ve),t.pixelStorei(i.UNPACK_SKIP_PIXELS,_e),t.pixelStorei(i.UNPACK_SKIP_ROWS,Ie)}}function te(U,T,Z){let se=i.TEXTURE_2D;(T.isDataArrayTexture||T.isCompressedArrayTexture)&&(se=i.TEXTURE_2D_ARRAY),T.isData3DTexture&&(se=i.TEXTURE_3D);const ge=ue(U,T),Te=T.source;t.bindTexture(se,U.__webglTexture,i.TEXTURE0+Z);const Ae=r.get(Te);if(Te.version!==Ae.__version||ge===!0){if(t.activeTexture(i.TEXTURE0+Z),(typeof ImageBitmap<"u"&&T.image instanceof ImageBitmap)===!1){const ye=bt.getPrimaries(bt.workingColorSpace),De=T.colorSpace===Ms?null:bt.getPrimaries(T.colorSpace),Oe=T.colorSpace===Ms||ye===De?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Oe)}t.pixelStorei(i.UNPACK_ALIGNMENT,T.unpackAlignment);let _e=y(T.image,!1,a.maxTextureSize);_e=xn(T,_e);const Ie=l.convert(T.format,T.colorSpace),Xe=l.convert(T.type);let re=R(T.internalFormat,Ie,Xe,T.normalized,T.colorSpace,T.isVideoTexture);Ge(se,T);let Ee;const Be=T.mipmaps,nt=T.isVideoTexture!==!0,st=Ae.__version===void 0||ge===!0,j=Te.dataReady,Ne=N(T,_e);if(T.isDepthTexture)re=D(T.format===ha,T.type),st&&(nt?t.texStorage2D(i.TEXTURE_2D,1,re,_e.width,_e.height):t.texImage2D(i.TEXTURE_2D,0,re,_e.width,_e.height,0,Ie,Xe,null));else if(T.isDataTexture)if(Be.length>0){nt&&st&&t.texStorage2D(i.TEXTURE_2D,Ne,re,Be[0].width,Be[0].height);for(let ye=0,De=Be.length;ye<De;ye++)Ee=Be[ye],nt?j&&t.texSubImage2D(i.TEXTURE_2D,ye,0,0,Ee.width,Ee.height,Ie,Xe,Ee.data):t.texImage2D(i.TEXTURE_2D,ye,re,Ee.width,Ee.height,0,Ie,Xe,Ee.data);T.generateMipmaps=!1}else nt?(st&&t.texStorage2D(i.TEXTURE_2D,Ne,re,_e.width,_e.height),j&&xe(T,_e,Ie,Xe)):t.texImage2D(i.TEXTURE_2D,0,re,_e.width,_e.height,0,Ie,Xe,_e.data);else if(T.isCompressedTexture)if(T.isCompressedArrayTexture){nt&&st&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Ne,re,Be[0].width,Be[0].height,_e.depth);for(let ye=0,De=Be.length;ye<De;ye++)if(Ee=Be[ye],T.format!==Yi)if(Ie!==null)if(nt){if(j)if(T.layerUpdates.size>0){const Oe=wx(Ee.width,Ee.height,T.format,T.type);for(const Me of T.layerUpdates){const Ke=Ee.data.subarray(Me*Oe/Ee.data.BYTES_PER_ELEMENT,(Me+1)*Oe/Ee.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ye,0,0,Me,Ee.width,Ee.height,1,Ie,Ke)}T.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ye,0,0,0,Ee.width,Ee.height,_e.depth,Ie,Ee.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,ye,re,Ee.width,Ee.height,_e.depth,0,Ee.data,0,0);else lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else nt?j&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,ye,0,0,0,Ee.width,Ee.height,_e.depth,Ie,Xe,Ee.data):t.texImage3D(i.TEXTURE_2D_ARRAY,ye,re,Ee.width,Ee.height,_e.depth,0,Ie,Xe,Ee.data)}else{nt&&st&&t.texStorage2D(i.TEXTURE_2D,Ne,re,Be[0].width,Be[0].height);for(let ye=0,De=Be.length;ye<De;ye++)Ee=Be[ye],T.format!==Yi?Ie!==null?nt?j&&t.compressedTexSubImage2D(i.TEXTURE_2D,ye,0,0,Ee.width,Ee.height,Ie,Ee.data):t.compressedTexImage2D(i.TEXTURE_2D,ye,re,Ee.width,Ee.height,0,Ee.data):lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):nt?j&&t.texSubImage2D(i.TEXTURE_2D,ye,0,0,Ee.width,Ee.height,Ie,Xe,Ee.data):t.texImage2D(i.TEXTURE_2D,ye,re,Ee.width,Ee.height,0,Ie,Xe,Ee.data)}else if(T.isDataArrayTexture)if(nt){if(st&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Ne,re,_e.width,_e.height,_e.depth),j)if(T.layerUpdates.size>0){const ye=wx(_e.width,_e.height,T.format,T.type);for(const De of T.layerUpdates){const Oe=_e.data.subarray(De*ye/_e.data.BYTES_PER_ELEMENT,(De+1)*ye/_e.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,De,_e.width,_e.height,1,Ie,Xe,Oe)}T.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,_e.width,_e.height,_e.depth,Ie,Xe,_e.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,re,_e.width,_e.height,_e.depth,0,Ie,Xe,_e.data);else if(T.isData3DTexture)nt?(st&&t.texStorage3D(i.TEXTURE_3D,Ne,re,_e.width,_e.height,_e.depth),j&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,_e.width,_e.height,_e.depth,Ie,Xe,_e.data)):t.texImage3D(i.TEXTURE_3D,0,re,_e.width,_e.height,_e.depth,0,Ie,Xe,_e.data);else if(T.isFramebufferTexture){if(st)if(nt)t.texStorage2D(i.TEXTURE_2D,Ne,re,_e.width,_e.height);else{let ye=_e.width,De=_e.height;for(let Oe=0;Oe<Ne;Oe++)t.texImage2D(i.TEXTURE_2D,Oe,re,ye,De,0,Ie,Xe,null),ye>>=1,De>>=1}}else if(T.isHTMLTexture){if("texElementImage2D"in i){const ye=i.canvas;if(ye.hasAttribute("layoutsubtree")||ye.setAttribute("layoutsubtree","true"),_e.parentNode!==ye){ye.appendChild(_e),g.add(T),ye.onpaint=De=>{const Oe=De.changedElements;for(const Me of g)Oe.includes(Me.image)&&(Me.needsUpdate=!0)},ye.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,_e);else{const Oe=i.RGBA,Me=i.RGBA,Ke=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,Oe,Me,Ke,_e)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Be.length>0){if(nt&&st){const ye=Rt(Be[0]);t.texStorage2D(i.TEXTURE_2D,Ne,re,ye.width,ye.height)}for(let ye=0,De=Be.length;ye<De;ye++)Ee=Be[ye],nt?j&&t.texSubImage2D(i.TEXTURE_2D,ye,0,0,Ie,Xe,Ee):t.texImage2D(i.TEXTURE_2D,ye,re,Ie,Xe,Ee);T.generateMipmaps=!1}else if(nt){if(st){const ye=Rt(_e);t.texStorage2D(i.TEXTURE_2D,Ne,re,ye.width,ye.height)}j&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,Ie,Xe,_e)}else t.texImage2D(i.TEXTURE_2D,0,re,Ie,Xe,_e);S(T)&&P(se),Ae.__version=Te.version,T.onUpdate&&T.onUpdate(T)}U.__version=T.version}function Ue(U,T,Z){if(T.image.length!==6)return;const se=ue(U,T),ge=T.source;t.bindTexture(i.TEXTURE_CUBE_MAP,U.__webglTexture,i.TEXTURE0+Z);const Te=r.get(ge);if(ge.version!==Te.__version||se===!0){t.activeTexture(i.TEXTURE0+Z);const Ae=bt.getPrimaries(bt.workingColorSpace),ve=T.colorSpace===Ms?null:bt.getPrimaries(T.colorSpace),_e=T.colorSpace===Ms||Ae===ve?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,T.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,_e);const Ie=T.isCompressedTexture||T.image[0].isCompressedTexture,Xe=T.image[0]&&T.image[0].isDataTexture,re=[];for(let Me=0;Me<6;Me++)!Ie&&!Xe?re[Me]=y(T.image[Me],!0,a.maxCubemapSize):re[Me]=Xe?T.image[Me].image:T.image[Me],re[Me]=xn(T,re[Me]);const Ee=re[0],Be=l.convert(T.format,T.colorSpace),nt=l.convert(T.type),st=R(T.internalFormat,Be,nt,T.normalized,T.colorSpace),j=T.isVideoTexture!==!0,Ne=Te.__version===void 0||se===!0,ye=ge.dataReady;let De=N(T,Ee);Ge(i.TEXTURE_CUBE_MAP,T);let Oe;if(Ie){j&&Ne&&t.texStorage2D(i.TEXTURE_CUBE_MAP,De,st,Ee.width,Ee.height);for(let Me=0;Me<6;Me++){Oe=re[Me].mipmaps;for(let Ke=0;Ke<Oe.length;Ke++){const qe=Oe[Ke];T.format!==Yi?Be!==null?j?ye&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ke,0,0,qe.width,qe.height,Be,qe.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ke,st,qe.width,qe.height,0,qe.data):lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):j?ye&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ke,0,0,qe.width,qe.height,Be,nt,qe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ke,st,qe.width,qe.height,0,Be,nt,qe.data)}}}else{if(Oe=T.mipmaps,j&&Ne){Oe.length>0&&De++;const Me=Rt(re[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,De,st,Me.width,Me.height)}for(let Me=0;Me<6;Me++)if(Xe){j?ye&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,0,0,re[Me].width,re[Me].height,Be,nt,re[Me].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,st,re[Me].width,re[Me].height,0,Be,nt,re[Me].data);for(let Ke=0;Ke<Oe.length;Ke++){const Ht=Oe[Ke].image[Me].image;j?ye&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ke+1,0,0,Ht.width,Ht.height,Be,nt,Ht.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ke+1,st,Ht.width,Ht.height,0,Be,nt,Ht.data)}}else{j?ye&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,0,0,Be,nt,re[Me]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,st,Be,nt,re[Me]);for(let Ke=0;Ke<Oe.length;Ke++){const qe=Oe[Ke];j?ye&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ke+1,0,0,Be,nt,qe.image[Me]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ke+1,st,Be,nt,qe.image[Me])}}}S(T)&&P(i.TEXTURE_CUBE_MAP),Te.__version=ge.version,T.onUpdate&&T.onUpdate(T)}U.__version=T.version}function tt(U,T,Z,se,ge,Te){const Ae=l.convert(Z.format,Z.colorSpace),ve=l.convert(Z.type),_e=R(Z.internalFormat,Ae,ve,Z.normalized,Z.colorSpace),Ie=r.get(T),Xe=r.get(Z);if(Xe.__renderTarget=T,!Ie.__hasExternalTextures){const re=Math.max(1,T.width>>Te),Ee=Math.max(1,T.height>>Te);ge===i.TEXTURE_3D||ge===i.TEXTURE_2D_ARRAY?t.texImage3D(ge,Te,_e,re,Ee,T.depth,0,Ae,ve,null):t.texImage2D(ge,Te,_e,re,Ee,0,Ae,ve,null)}t.bindFramebuffer(i.FRAMEBUFFER,U),Gt(T)?h.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,se,ge,Xe.__webglTexture,0,wt(T)):(ge===i.TEXTURE_2D||ge>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&ge<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,se,ge,Xe.__webglTexture,Te),t.bindFramebuffer(i.FRAMEBUFFER,null)}function Dt(U,T,Z){if(i.bindRenderbuffer(i.RENDERBUFFER,U),T.depthBuffer){const se=T.depthTexture,ge=se&&se.isDepthTexture?se.type:null,Te=D(T.stencilBuffer,ge),Ae=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;Gt(T)?h.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,wt(T),Te,T.width,T.height):Z?i.renderbufferStorageMultisample(i.RENDERBUFFER,wt(T),Te,T.width,T.height):i.renderbufferStorage(i.RENDERBUFFER,Te,T.width,T.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Ae,i.RENDERBUFFER,U)}else{const se=T.textures;for(let ge=0;ge<se.length;ge++){const Te=se[ge],Ae=l.convert(Te.format,Te.colorSpace),ve=l.convert(Te.type),_e=R(Te.internalFormat,Ae,ve,Te.normalized,Te.colorSpace);Gt(T)?h.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,wt(T),_e,T.width,T.height):Z?i.renderbufferStorageMultisample(i.RENDERBUFFER,wt(T),_e,T.width,T.height):i.renderbufferStorage(i.RENDERBUFFER,_e,T.width,T.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function ct(U,T,Z){const se=T.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,U),!(T.depthTexture&&T.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const ge=r.get(T.depthTexture);if(ge.__renderTarget=T,(!ge.__webglTexture||T.depthTexture.image.width!==T.width||T.depthTexture.image.height!==T.height)&&(T.depthTexture.image.width=T.width,T.depthTexture.image.height=T.height,T.depthTexture.needsUpdate=!0),se){if(ge.__webglInit===void 0&&(ge.__webglInit=!0,T.depthTexture.addEventListener("dispose",F)),ge.__webglTexture===void 0){ge.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,ge.__webglTexture),Ge(i.TEXTURE_CUBE_MAP,T.depthTexture);const Ie=l.convert(T.depthTexture.format),Xe=l.convert(T.depthTexture.type);let re;T.depthTexture.format===$r?re=i.DEPTH_COMPONENT24:T.depthTexture.format===ha&&(re=i.DEPTH24_STENCIL8);for(let Ee=0;Ee<6;Ee++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,0,re,T.width,T.height,0,Ie,Xe,null)}}else $(T.depthTexture,0);const Te=ge.__webglTexture,Ae=wt(T),ve=se?i.TEXTURE_CUBE_MAP_POSITIVE_X+Z:i.TEXTURE_2D,_e=T.depthTexture.format===ha?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(T.depthTexture.format===$r)Gt(T)?h.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,_e,ve,Te,0,Ae):i.framebufferTexture2D(i.FRAMEBUFFER,_e,ve,Te,0);else if(T.depthTexture.format===ha)Gt(T)?h.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,_e,ve,Te,0,Ae):i.framebufferTexture2D(i.FRAMEBUFFER,_e,ve,Te,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function At(U){const T=r.get(U),Z=U.isWebGLCubeRenderTarget===!0;if(T.__boundDepthTexture!==U.depthTexture){const se=U.depthTexture;if(T.__depthDisposeCallback&&T.__depthDisposeCallback(),se){const ge=()=>{delete T.__boundDepthTexture,delete T.__depthDisposeCallback,se.removeEventListener("dispose",ge)};se.addEventListener("dispose",ge),T.__depthDisposeCallback=ge}T.__boundDepthTexture=se}if(U.depthTexture&&!T.__autoAllocateDepthBuffer)if(Z)for(let se=0;se<6;se++)ct(T.__webglFramebuffer[se],U,se);else{const se=U.texture.mipmaps;se&&se.length>0?ct(T.__webglFramebuffer[0],U,0):ct(T.__webglFramebuffer,U,0)}else if(Z){T.__webglDepthbuffer=[];for(let se=0;se<6;se++)if(t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer[se]),T.__webglDepthbuffer[se]===void 0)T.__webglDepthbuffer[se]=i.createRenderbuffer(),Dt(T.__webglDepthbuffer[se],U,!1);else{const ge=U.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Te=T.__webglDepthbuffer[se];i.bindRenderbuffer(i.RENDERBUFFER,Te),i.framebufferRenderbuffer(i.FRAMEBUFFER,ge,i.RENDERBUFFER,Te)}}else{const se=U.texture.mipmaps;if(se&&se.length>0?t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer),T.__webglDepthbuffer===void 0)T.__webglDepthbuffer=i.createRenderbuffer(),Dt(T.__webglDepthbuffer,U,!1);else{const ge=U.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Te=T.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,Te),i.framebufferRenderbuffer(i.FRAMEBUFFER,ge,i.RENDERBUFFER,Te)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function Et(U,T,Z){const se=r.get(U);T!==void 0&&tt(se.__webglFramebuffer,U,U.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),Z!==void 0&&At(U)}function _t(U){const T=U.texture,Z=r.get(U),se=r.get(T);U.addEventListener("dispose",w);const ge=U.textures,Te=U.isWebGLCubeRenderTarget===!0,Ae=ge.length>1;if(Ae||(se.__webglTexture===void 0&&(se.__webglTexture=i.createTexture()),se.__version=T.version,c.memory.textures++),Te){Z.__webglFramebuffer=[];for(let ve=0;ve<6;ve++)if(T.mipmaps&&T.mipmaps.length>0){Z.__webglFramebuffer[ve]=[];for(let _e=0;_e<T.mipmaps.length;_e++)Z.__webglFramebuffer[ve][_e]=i.createFramebuffer()}else Z.__webglFramebuffer[ve]=i.createFramebuffer()}else{if(T.mipmaps&&T.mipmaps.length>0){Z.__webglFramebuffer=[];for(let ve=0;ve<T.mipmaps.length;ve++)Z.__webglFramebuffer[ve]=i.createFramebuffer()}else Z.__webglFramebuffer=i.createFramebuffer();if(Ae)for(let ve=0,_e=ge.length;ve<_e;ve++){const Ie=r.get(ge[ve]);Ie.__webglTexture===void 0&&(Ie.__webglTexture=i.createTexture(),c.memory.textures++)}if(U.samples>0&&Gt(U)===!1){Z.__webglMultisampledFramebuffer=i.createFramebuffer(),Z.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,Z.__webglMultisampledFramebuffer);for(let ve=0;ve<ge.length;ve++){const _e=ge[ve];Z.__webglColorRenderbuffer[ve]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,Z.__webglColorRenderbuffer[ve]);const Ie=l.convert(_e.format,_e.colorSpace),Xe=l.convert(_e.type),re=R(_e.internalFormat,Ie,Xe,_e.normalized,_e.colorSpace,U.isXRRenderTarget===!0),Ee=wt(U);i.renderbufferStorageMultisample(i.RENDERBUFFER,Ee,re,U.width,U.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ve,i.RENDERBUFFER,Z.__webglColorRenderbuffer[ve])}i.bindRenderbuffer(i.RENDERBUFFER,null),U.depthBuffer&&(Z.__webglDepthRenderbuffer=i.createRenderbuffer(),Dt(Z.__webglDepthRenderbuffer,U,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(Te){t.bindTexture(i.TEXTURE_CUBE_MAP,se.__webglTexture),Ge(i.TEXTURE_CUBE_MAP,T);for(let ve=0;ve<6;ve++)if(T.mipmaps&&T.mipmaps.length>0)for(let _e=0;_e<T.mipmaps.length;_e++)tt(Z.__webglFramebuffer[ve][_e],U,T,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ve,_e);else tt(Z.__webglFramebuffer[ve],U,T,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ve,0);S(T)&&P(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Ae){for(let ve=0,_e=ge.length;ve<_e;ve++){const Ie=ge[ve],Xe=r.get(Ie);let re=i.TEXTURE_2D;(U.isWebGL3DRenderTarget||U.isWebGLArrayRenderTarget)&&(re=U.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(re,Xe.__webglTexture),Ge(re,Ie),tt(Z.__webglFramebuffer,U,Ie,i.COLOR_ATTACHMENT0+ve,re,0),S(Ie)&&P(re)}t.unbindTexture()}else{let ve=i.TEXTURE_2D;if((U.isWebGL3DRenderTarget||U.isWebGLArrayRenderTarget)&&(ve=U.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ve,se.__webglTexture),Ge(ve,T),T.mipmaps&&T.mipmaps.length>0)for(let _e=0;_e<T.mipmaps.length;_e++)tt(Z.__webglFramebuffer[_e],U,T,i.COLOR_ATTACHMENT0,ve,_e);else tt(Z.__webglFramebuffer,U,T,i.COLOR_ATTACHMENT0,ve,0);S(T)&&P(ve),t.unbindTexture()}U.depthBuffer&&At(U)}function Wt(U){const T=U.textures;for(let Z=0,se=T.length;Z<se;Z++){const ge=T[Z];if(S(ge)){const Te=L(U),Ae=r.get(ge).__webglTexture;t.bindTexture(Te,Ae),P(Te),t.unbindTexture()}}}const $t=[],Jt=[];function qt(U){if(U.samples>0){if(Gt(U)===!1){const T=U.textures,Z=U.width,se=U.height;let ge=i.COLOR_BUFFER_BIT;const Te=U.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Ae=r.get(U),ve=T.length>1;if(ve)for(let Ie=0;Ie<T.length;Ie++)t.bindFramebuffer(i.FRAMEBUFFER,Ae.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ie,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,Ae.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ie,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,Ae.__webglMultisampledFramebuffer);const _e=U.texture.mipmaps;_e&&_e.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ae.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ae.__webglFramebuffer);for(let Ie=0;Ie<T.length;Ie++){if(U.resolveDepthBuffer&&(U.depthBuffer&&(ge|=i.DEPTH_BUFFER_BIT),U.stencilBuffer&&U.resolveStencilBuffer&&(ge|=i.STENCIL_BUFFER_BIT)),ve){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Ae.__webglColorRenderbuffer[Ie]);const Xe=r.get(T[Ie]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Xe,0)}i.blitFramebuffer(0,0,Z,se,0,0,Z,se,ge,i.NEAREST),d===!0&&($t.length=0,Jt.length=0,$t.push(i.COLOR_ATTACHMENT0+Ie),U.depthBuffer&&U.resolveDepthBuffer===!1&&($t.push(Te),Jt.push(Te),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Jt)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,$t))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),ve)for(let Ie=0;Ie<T.length;Ie++){t.bindFramebuffer(i.FRAMEBUFFER,Ae.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ie,i.RENDERBUFFER,Ae.__webglColorRenderbuffer[Ie]);const Xe=r.get(T[Ie]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,Ae.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ie,i.TEXTURE_2D,Xe,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ae.__webglMultisampledFramebuffer)}else if(U.depthBuffer&&U.resolveDepthBuffer===!1&&d){const T=U.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[T])}}}function wt(U){return Math.min(a.maxSamples,U.samples)}function Gt(U){const T=r.get(U);return U.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&T.__useRenderToTexture!==!1}function q(U){const T=c.render.frame;m.get(U)!==T&&(m.set(U,T),U.update())}function xn(U,T){const Z=U.colorSpace,se=U.format,ge=U.type;return U.isCompressedTexture===!0||U.isVideoTexture===!0||Z!==sh&&Z!==Ms&&(bt.getTransfer(Z)===Bt?(se!==Yi||ge!==yi)&&lt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Nt("WebGLTextures: Unsupported texture color space:",Z)),T}function Rt(U){return typeof HTMLImageElement<"u"&&U instanceof HTMLImageElement?(f.width=U.naturalWidth||U.width,f.height=U.naturalHeight||U.height):typeof VideoFrame<"u"&&U instanceof VideoFrame?(f.width=U.displayWidth,f.height=U.displayHeight):(f.width=U.width,f.height=U.height),f}this.allocateTextureUnit=ce,this.resetTextureUnits=me,this.getTextureUnits=de,this.setTextureUnits=O,this.setTexture2D=$,this.setTexture2DArray=ne,this.setTexture3D=he,this.setTextureCube=k,this.rebindTextures=Et,this.setupRenderTarget=_t,this.updateRenderTargetMipmap=Wt,this.updateMultisampleRenderTarget=qt,this.setupDepthRenderbuffer=At,this.setupFrameBufferTexture=tt,this.useMultisampledRTT=Gt,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function NP(i,e){function t(r,a=Ms){let l;const c=bt.getTransfer(a);if(r===yi)return i.UNSIGNED_BYTE;if(r===Cm)return i.UNSIGNED_SHORT_4_4_4_4;if(r===Am)return i.UNSIGNED_SHORT_5_5_5_1;if(r===ry)return i.UNSIGNED_INT_5_9_9_9_REV;if(r===sy)return i.UNSIGNED_INT_10F_11F_11F_REV;if(r===ny)return i.BYTE;if(r===iy)return i.SHORT;if(r===Wl)return i.UNSIGNED_SHORT;if(r===Rm)return i.INT;if(r===vr)return i.UNSIGNED_INT;if(r===dr)return i.FLOAT;if(r===Xr)return i.HALF_FLOAT;if(r===ay)return i.ALPHA;if(r===oy)return i.RGB;if(r===Yi)return i.RGBA;if(r===$r)return i.DEPTH_COMPONENT;if(r===ha)return i.DEPTH_STENCIL;if(r===ly)return i.RED;if(r===Pm)return i.RED_INTEGER;if(r===Ea)return i.RG;if(r===Nm)return i.RG_INTEGER;if(r===Lm)return i.RGBA_INTEGER;if(r===ju||r===Xu||r===$u||r===qu)if(c===Bt)if(l=e.get("WEBGL_compressed_texture_s3tc_srgb"),l!==null){if(r===ju)return l.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(r===Xu)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(r===$u)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(r===qu)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(l=e.get("WEBGL_compressed_texture_s3tc"),l!==null){if(r===ju)return l.COMPRESSED_RGB_S3TC_DXT1_EXT;if(r===Xu)return l.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(r===$u)return l.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(r===qu)return l.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(r===Ep||r===wp||r===Tp||r===bp)if(l=e.get("WEBGL_compressed_texture_pvrtc"),l!==null){if(r===Ep)return l.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(r===wp)return l.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(r===Tp)return l.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(r===bp)return l.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(r===Rp||r===Cp||r===Ap||r===Pp||r===Np||r===nh||r===Lp)if(l=e.get("WEBGL_compressed_texture_etc"),l!==null){if(r===Rp||r===Cp)return c===Bt?l.COMPRESSED_SRGB8_ETC2:l.COMPRESSED_RGB8_ETC2;if(r===Ap)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:l.COMPRESSED_RGBA8_ETC2_EAC;if(r===Pp)return l.COMPRESSED_R11_EAC;if(r===Np)return l.COMPRESSED_SIGNED_R11_EAC;if(r===nh)return l.COMPRESSED_RG11_EAC;if(r===Lp)return l.COMPRESSED_SIGNED_RG11_EAC}else return null;if(r===Dp||r===Ip||r===Up||r===Fp||r===Op||r===kp||r===zp||r===Bp||r===Hp||r===Vp||r===Gp||r===Wp||r===jp||r===Xp)if(l=e.get("WEBGL_compressed_texture_astc"),l!==null){if(r===Dp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:l.COMPRESSED_RGBA_ASTC_4x4_KHR;if(r===Ip)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:l.COMPRESSED_RGBA_ASTC_5x4_KHR;if(r===Up)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:l.COMPRESSED_RGBA_ASTC_5x5_KHR;if(r===Fp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:l.COMPRESSED_RGBA_ASTC_6x5_KHR;if(r===Op)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:l.COMPRESSED_RGBA_ASTC_6x6_KHR;if(r===kp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:l.COMPRESSED_RGBA_ASTC_8x5_KHR;if(r===zp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:l.COMPRESSED_RGBA_ASTC_8x6_KHR;if(r===Bp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:l.COMPRESSED_RGBA_ASTC_8x8_KHR;if(r===Hp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:l.COMPRESSED_RGBA_ASTC_10x5_KHR;if(r===Vp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:l.COMPRESSED_RGBA_ASTC_10x6_KHR;if(r===Gp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:l.COMPRESSED_RGBA_ASTC_10x8_KHR;if(r===Wp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:l.COMPRESSED_RGBA_ASTC_10x10_KHR;if(r===jp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:l.COMPRESSED_RGBA_ASTC_12x10_KHR;if(r===Xp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:l.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(r===$p||r===qp||r===Yp)if(l=e.get("EXT_texture_compression_bptc"),l!==null){if(r===$p)return c===Bt?l.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:l.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(r===qp)return l.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(r===Yp)return l.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(r===Kp||r===Qp||r===ih||r===Zp)if(l=e.get("EXT_texture_compression_rgtc"),l!==null){if(r===Kp)return l.COMPRESSED_RED_RGTC1_EXT;if(r===Qp)return l.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(r===ih)return l.COMPRESSED_RED_GREEN_RGTC2_EXT;if(r===Zp)return l.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return r===jl?i.UNSIGNED_INT_24_8:i[r]!==void 0?i[r]:null}return{convert:t}}const LP=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,DP=`
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

}`;class IP{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const r=new vy(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=r}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,r=new _r({vertexShader:LP,fragmentShader:DP,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Qi(new vh(20,20),r)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class UP extends Os{constructor(e,t){super();const r=this;let a=null,l=1,c=null,h="local-floor",d=1,f=null,m=null,g=null,v=null,x=null,M=null;const b=typeof XRWebGLBinding<"u",y=new IP,S={},P=t.getContextAttributes();let L=null,R=null;const D=[],N=[],F=new ht;let w=null;const I=new Di;I.viewport=new ln;const G=new Di;G.viewport=new ln;const V=[I,G],Y=new WT;let me=null,de=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(ue){let Se=D[ue];return Se===void 0&&(Se=new _f,D[ue]=Se),Se.getTargetRaySpace()},this.getControllerGrip=function(ue){let Se=D[ue];return Se===void 0&&(Se=new _f,D[ue]=Se),Se.getGripSpace()},this.getHand=function(ue){let Se=D[ue];return Se===void 0&&(Se=new _f,D[ue]=Se),Se.getHandSpace()};function O(ue){const Se=N.indexOf(ue.inputSource);if(Se===-1)return;const xe=D[Se];xe!==void 0&&(xe.update(ue.inputSource,ue.frame,f||c),xe.dispatchEvent({type:ue.type,data:ue.inputSource}))}function ce(){a.removeEventListener("select",O),a.removeEventListener("selectstart",O),a.removeEventListener("selectend",O),a.removeEventListener("squeeze",O),a.removeEventListener("squeezestart",O),a.removeEventListener("squeezeend",O),a.removeEventListener("end",ce),a.removeEventListener("inputsourceschange",Q);for(let ue=0;ue<D.length;ue++){const Se=N[ue];Se!==null&&(N[ue]=null,D[ue].disconnect(Se))}me=null,de=null,y.reset();for(const ue in S)delete S[ue];e.setRenderTarget(L),x=null,v=null,g=null,a=null,R=null,Ge.stop(),r.isPresenting=!1,e.setPixelRatio(w),e.setSize(F.width,F.height,!1),r.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(ue){l=ue,r.isPresenting===!0&&lt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(ue){h=ue,r.isPresenting===!0&&lt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return f||c},this.setReferenceSpace=function(ue){f=ue},this.getBaseLayer=function(){return v!==null?v:x},this.getBinding=function(){return g===null&&b&&(g=new XRWebGLBinding(a,t)),g},this.getFrame=function(){return M},this.getSession=function(){return a},this.setSession=async function(ue){if(a=ue,a!==null){if(L=e.getRenderTarget(),a.addEventListener("select",O),a.addEventListener("selectstart",O),a.addEventListener("selectend",O),a.addEventListener("squeeze",O),a.addEventListener("squeezestart",O),a.addEventListener("squeezeend",O),a.addEventListener("end",ce),a.addEventListener("inputsourceschange",Q),P.xrCompatible!==!0&&await t.makeXRCompatible(),w=e.getPixelRatio(),e.getSize(F),b&&"createProjectionLayer"in XRWebGLBinding.prototype){let xe=null,te=null,Ue=null;P.depth&&(Ue=P.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,xe=P.stencil?ha:$r,te=P.stencil?jl:vr);const tt={colorFormat:t.RGBA8,depthFormat:Ue,scaleFactor:l};g=this.getBinding(),v=g.createProjectionLayer(tt),a.updateRenderState({layers:[v]}),e.setPixelRatio(1),e.setSize(v.textureWidth,v.textureHeight,!1),R=new mr(v.textureWidth,v.textureHeight,{format:Yi,type:yi,depthTexture:new Io(v.textureWidth,v.textureHeight,te,void 0,void 0,void 0,void 0,void 0,void 0,xe),stencilBuffer:P.stencil,colorSpace:e.outputColorSpace,samples:P.antialias?4:0,resolveDepthBuffer:v.ignoreDepthValues===!1,resolveStencilBuffer:v.ignoreDepthValues===!1})}else{const xe={antialias:P.antialias,alpha:!0,depth:P.depth,stencil:P.stencil,framebufferScaleFactor:l};x=new XRWebGLLayer(a,t,xe),a.updateRenderState({baseLayer:x}),e.setPixelRatio(1),e.setSize(x.framebufferWidth,x.framebufferHeight,!1),R=new mr(x.framebufferWidth,x.framebufferHeight,{format:Yi,type:yi,colorSpace:e.outputColorSpace,stencilBuffer:P.stencil,resolveDepthBuffer:x.ignoreDepthValues===!1,resolveStencilBuffer:x.ignoreDepthValues===!1})}R.isXRRenderTarget=!0,this.setFoveation(d),f=null,c=await a.requestReferenceSpace(h),Ge.setContext(a),Ge.start(),r.isPresenting=!0,r.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(a!==null)return a.environmentBlendMode},this.getDepthTexture=function(){return y.getDepthTexture()};function Q(ue){for(let Se=0;Se<ue.removed.length;Se++){const xe=ue.removed[Se],te=N.indexOf(xe);te>=0&&(N[te]=null,D[te].disconnect(xe))}for(let Se=0;Se<ue.added.length;Se++){const xe=ue.added[Se];let te=N.indexOf(xe);if(te===-1){for(let tt=0;tt<D.length;tt++)if(tt>=N.length){N.push(xe),te=tt;break}else if(N[tt]===null){N[tt]=xe,te=tt;break}if(te===-1)break}const Ue=D[te];Ue&&Ue.connect(xe)}}const $=new J,ne=new J;function he(ue,Se,xe){$.setFromMatrixPosition(Se.matrixWorld),ne.setFromMatrixPosition(xe.matrixWorld);const te=$.distanceTo(ne),Ue=Se.projectionMatrix.elements,tt=xe.projectionMatrix.elements,Dt=Ue[14]/(Ue[10]-1),ct=Ue[14]/(Ue[10]+1),At=(Ue[9]+1)/Ue[5],Et=(Ue[9]-1)/Ue[5],_t=(Ue[8]-1)/Ue[0],Wt=(tt[8]+1)/tt[0],$t=Dt*_t,Jt=Dt*Wt,qt=te/(-_t+Wt),wt=qt*-_t;if(Se.matrixWorld.decompose(ue.position,ue.quaternion,ue.scale),ue.translateX(wt),ue.translateZ(qt),ue.matrixWorld.compose(ue.position,ue.quaternion,ue.scale),ue.matrixWorldInverse.copy(ue.matrixWorld).invert(),Ue[10]===-1)ue.projectionMatrix.copy(Se.projectionMatrix),ue.projectionMatrixInverse.copy(Se.projectionMatrixInverse);else{const Gt=Dt+qt,q=ct+qt,xn=$t-wt,Rt=Jt+(te-wt),U=At*ct/q*Gt,T=Et*ct/q*Gt;ue.projectionMatrix.makePerspective(xn,Rt,U,T,Gt,q),ue.projectionMatrixInverse.copy(ue.projectionMatrix).invert()}}function k(ue,Se){Se===null?ue.matrixWorld.copy(ue.matrix):ue.matrixWorld.multiplyMatrices(Se.matrixWorld,ue.matrix),ue.matrixWorldInverse.copy(ue.matrixWorld).invert()}this.updateCamera=function(ue){if(a===null)return;let Se=ue.near,xe=ue.far;y.texture!==null&&(y.depthNear>0&&(Se=y.depthNear),y.depthFar>0&&(xe=y.depthFar)),Y.near=G.near=I.near=Se,Y.far=G.far=I.far=xe,(me!==Y.near||de!==Y.far)&&(a.updateRenderState({depthNear:Y.near,depthFar:Y.far}),me=Y.near,de=Y.far),Y.layers.mask=ue.layers.mask|6,I.layers.mask=Y.layers.mask&-5,G.layers.mask=Y.layers.mask&-3;const te=ue.parent,Ue=Y.cameras;k(Y,te);for(let tt=0;tt<Ue.length;tt++)k(Ue[tt],te);Ue.length===2?he(Y,I,G):Y.projectionMatrix.copy(I.projectionMatrix),ee(ue,Y,te)};function ee(ue,Se,xe){xe===null?ue.matrix.copy(Se.matrixWorld):(ue.matrix.copy(xe.matrixWorld),ue.matrix.invert(),ue.matrix.multiply(Se.matrixWorld)),ue.matrix.decompose(ue.position,ue.quaternion,ue.scale),ue.updateMatrixWorld(!0),ue.projectionMatrix.copy(Se.projectionMatrix),ue.projectionMatrixInverse.copy(Se.projectionMatrixInverse),ue.isPerspectiveCamera&&(ue.fov=Jp*2*Math.atan(1/ue.projectionMatrix.elements[5]),ue.zoom=1)}this.getCamera=function(){return Y},this.getFoveation=function(){if(!(v===null&&x===null))return d},this.setFoveation=function(ue){d=ue,v!==null&&(v.fixedFoveation=ue),x!==null&&x.fixedFoveation!==void 0&&(x.fixedFoveation=ue)},this.hasDepthSensing=function(){return y.texture!==null},this.getDepthSensingMesh=function(){return y.getMesh(Y)},this.getCameraTexture=function(ue){return S[ue]};let Fe=null;function je(ue,Se){if(m=Se.getViewerPose(f||c),M=Se,m!==null){const xe=m.views;x!==null&&(e.setRenderTargetFramebuffer(R,x.framebuffer),e.setRenderTarget(R));let te=!1;xe.length!==Y.cameras.length&&(Y.cameras.length=0,te=!0);for(let ct=0;ct<xe.length;ct++){const At=xe[ct];let Et=null;if(x!==null)Et=x.getViewport(At);else{const Wt=g.getViewSubImage(v,At);Et=Wt.viewport,ct===0&&(e.setRenderTargetTextures(R,Wt.colorTexture,Wt.depthStencilTexture),e.setRenderTarget(R))}let _t=V[ct];_t===void 0&&(_t=new Di,_t.layers.enable(ct),_t.viewport=new ln,V[ct]=_t),_t.matrix.fromArray(At.transform.matrix),_t.matrix.decompose(_t.position,_t.quaternion,_t.scale),_t.projectionMatrix.fromArray(At.projectionMatrix),_t.projectionMatrixInverse.copy(_t.projectionMatrix).invert(),_t.viewport.set(Et.x,Et.y,Et.width,Et.height),ct===0&&(Y.matrix.copy(_t.matrix),Y.matrix.decompose(Y.position,Y.quaternion,Y.scale)),te===!0&&Y.cameras.push(_t)}const Ue=a.enabledFeatures;if(Ue&&Ue.includes("depth-sensing")&&a.depthUsage=="gpu-optimized"&&b){g=r.getBinding();const ct=g.getDepthInformation(xe[0]);ct&&ct.isValid&&ct.texture&&y.init(ct,a.renderState)}if(Ue&&Ue.includes("camera-access")&&b){e.state.unbindTexture(),g=r.getBinding();for(let ct=0;ct<xe.length;ct++){const At=xe[ct].camera;if(At){let Et=S[At];Et||(Et=new vy,S[At]=Et);const _t=g.getCameraImage(At);Et.sourceTexture=_t}}}}for(let xe=0;xe<D.length;xe++){const te=N[xe],Ue=D[xe];te!==null&&Ue!==void 0&&Ue.update(te,Se,f||c)}Fe&&Fe(ue,Se),Se.detectedPlanes&&r.dispatchEvent({type:"planesdetected",data:Se}),M=null}const Ge=new yy;Ge.setAnimationLoop(je),this.setAnimationLoop=function(ue){Fe=ue},this.dispose=function(){}}}const FP=new rn,Ry=new pt;Ry.set(-1,0,0,0,1,0,0,0,1);function OP(i,e){function t(y,S){y.matrixAutoUpdate===!0&&y.updateMatrix(),S.value.copy(y.matrix)}function r(y,S){S.color.getRGB(y.fogColor.value,xy(i)),S.isFog?(y.fogNear.value=S.near,y.fogFar.value=S.far):S.isFogExp2&&(y.fogDensity.value=S.density)}function a(y,S,P,L,R){S.isNodeMaterial?S.uniformsNeedUpdate=!1:S.isMeshBasicMaterial?l(y,S):S.isMeshLambertMaterial?(l(y,S),S.envMap&&(y.envMapIntensity.value=S.envMapIntensity)):S.isMeshToonMaterial?(l(y,S),g(y,S)):S.isMeshPhongMaterial?(l(y,S),m(y,S),S.envMap&&(y.envMapIntensity.value=S.envMapIntensity)):S.isMeshStandardMaterial?(l(y,S),v(y,S),S.isMeshPhysicalMaterial&&x(y,S,R)):S.isMeshMatcapMaterial?(l(y,S),M(y,S)):S.isMeshDepthMaterial?l(y,S):S.isMeshDistanceMaterial?(l(y,S),b(y,S)):S.isMeshNormalMaterial?l(y,S):S.isLineBasicMaterial?(c(y,S),S.isLineDashedMaterial&&h(y,S)):S.isPointsMaterial?d(y,S,P,L):S.isSpriteMaterial?f(y,S):S.isShadowMaterial?(y.color.value.copy(S.color),y.opacity.value=S.opacity):S.isShaderMaterial&&(S.uniformsNeedUpdate=!1)}function l(y,S){y.opacity.value=S.opacity,S.color&&y.diffuse.value.copy(S.color),S.emissive&&y.emissive.value.copy(S.emissive).multiplyScalar(S.emissiveIntensity),S.map&&(y.map.value=S.map,t(S.map,y.mapTransform)),S.alphaMap&&(y.alphaMap.value=S.alphaMap,t(S.alphaMap,y.alphaMapTransform)),S.bumpMap&&(y.bumpMap.value=S.bumpMap,t(S.bumpMap,y.bumpMapTransform),y.bumpScale.value=S.bumpScale,S.side===hi&&(y.bumpScale.value*=-1)),S.normalMap&&(y.normalMap.value=S.normalMap,t(S.normalMap,y.normalMapTransform),y.normalScale.value.copy(S.normalScale),S.side===hi&&y.normalScale.value.negate()),S.displacementMap&&(y.displacementMap.value=S.displacementMap,t(S.displacementMap,y.displacementMapTransform),y.displacementScale.value=S.displacementScale,y.displacementBias.value=S.displacementBias),S.emissiveMap&&(y.emissiveMap.value=S.emissiveMap,t(S.emissiveMap,y.emissiveMapTransform)),S.specularMap&&(y.specularMap.value=S.specularMap,t(S.specularMap,y.specularMapTransform)),S.alphaTest>0&&(y.alphaTest.value=S.alphaTest);const P=e.get(S),L=P.envMap,R=P.envMapRotation;L&&(y.envMap.value=L,y.envMapRotation.value.setFromMatrix4(FP.makeRotationFromEuler(R)).transpose(),L.isCubeTexture&&L.isRenderTargetTexture===!1&&y.envMapRotation.value.premultiply(Ry),y.reflectivity.value=S.reflectivity,y.ior.value=S.ior,y.refractionRatio.value=S.refractionRatio),S.lightMap&&(y.lightMap.value=S.lightMap,y.lightMapIntensity.value=S.lightMapIntensity,t(S.lightMap,y.lightMapTransform)),S.aoMap&&(y.aoMap.value=S.aoMap,y.aoMapIntensity.value=S.aoMapIntensity,t(S.aoMap,y.aoMapTransform))}function c(y,S){y.diffuse.value.copy(S.color),y.opacity.value=S.opacity,S.map&&(y.map.value=S.map,t(S.map,y.mapTransform))}function h(y,S){y.dashSize.value=S.dashSize,y.totalSize.value=S.dashSize+S.gapSize,y.scale.value=S.scale}function d(y,S,P,L){y.diffuse.value.copy(S.color),y.opacity.value=S.opacity,y.size.value=S.size*P,y.scale.value=L*.5,S.map&&(y.map.value=S.map,t(S.map,y.uvTransform)),S.alphaMap&&(y.alphaMap.value=S.alphaMap,t(S.alphaMap,y.alphaMapTransform)),S.alphaTest>0&&(y.alphaTest.value=S.alphaTest)}function f(y,S){y.diffuse.value.copy(S.color),y.opacity.value=S.opacity,y.rotation.value=S.rotation,S.map&&(y.map.value=S.map,t(S.map,y.mapTransform)),S.alphaMap&&(y.alphaMap.value=S.alphaMap,t(S.alphaMap,y.alphaMapTransform)),S.alphaTest>0&&(y.alphaTest.value=S.alphaTest)}function m(y,S){y.specular.value.copy(S.specular),y.shininess.value=Math.max(S.shininess,1e-4)}function g(y,S){S.gradientMap&&(y.gradientMap.value=S.gradientMap)}function v(y,S){y.metalness.value=S.metalness,S.metalnessMap&&(y.metalnessMap.value=S.metalnessMap,t(S.metalnessMap,y.metalnessMapTransform)),y.roughness.value=S.roughness,S.roughnessMap&&(y.roughnessMap.value=S.roughnessMap,t(S.roughnessMap,y.roughnessMapTransform)),S.envMap&&(y.envMapIntensity.value=S.envMapIntensity)}function x(y,S,P){y.ior.value=S.ior,S.sheen>0&&(y.sheenColor.value.copy(S.sheenColor).multiplyScalar(S.sheen),y.sheenRoughness.value=S.sheenRoughness,S.sheenColorMap&&(y.sheenColorMap.value=S.sheenColorMap,t(S.sheenColorMap,y.sheenColorMapTransform)),S.sheenRoughnessMap&&(y.sheenRoughnessMap.value=S.sheenRoughnessMap,t(S.sheenRoughnessMap,y.sheenRoughnessMapTransform))),S.clearcoat>0&&(y.clearcoat.value=S.clearcoat,y.clearcoatRoughness.value=S.clearcoatRoughness,S.clearcoatMap&&(y.clearcoatMap.value=S.clearcoatMap,t(S.clearcoatMap,y.clearcoatMapTransform)),S.clearcoatRoughnessMap&&(y.clearcoatRoughnessMap.value=S.clearcoatRoughnessMap,t(S.clearcoatRoughnessMap,y.clearcoatRoughnessMapTransform)),S.clearcoatNormalMap&&(y.clearcoatNormalMap.value=S.clearcoatNormalMap,t(S.clearcoatNormalMap,y.clearcoatNormalMapTransform),y.clearcoatNormalScale.value.copy(S.clearcoatNormalScale),S.side===hi&&y.clearcoatNormalScale.value.negate())),S.dispersion>0&&(y.dispersion.value=S.dispersion),S.iridescence>0&&(y.iridescence.value=S.iridescence,y.iridescenceIOR.value=S.iridescenceIOR,y.iridescenceThicknessMinimum.value=S.iridescenceThicknessRange[0],y.iridescenceThicknessMaximum.value=S.iridescenceThicknessRange[1],S.iridescenceMap&&(y.iridescenceMap.value=S.iridescenceMap,t(S.iridescenceMap,y.iridescenceMapTransform)),S.iridescenceThicknessMap&&(y.iridescenceThicknessMap.value=S.iridescenceThicknessMap,t(S.iridescenceThicknessMap,y.iridescenceThicknessMapTransform))),S.transmission>0&&(y.transmission.value=S.transmission,y.transmissionSamplerMap.value=P.texture,y.transmissionSamplerSize.value.set(P.width,P.height),S.transmissionMap&&(y.transmissionMap.value=S.transmissionMap,t(S.transmissionMap,y.transmissionMapTransform)),y.thickness.value=S.thickness,S.thicknessMap&&(y.thicknessMap.value=S.thicknessMap,t(S.thicknessMap,y.thicknessMapTransform)),y.attenuationDistance.value=S.attenuationDistance,y.attenuationColor.value.copy(S.attenuationColor)),S.anisotropy>0&&(y.anisotropyVector.value.set(S.anisotropy*Math.cos(S.anisotropyRotation),S.anisotropy*Math.sin(S.anisotropyRotation)),S.anisotropyMap&&(y.anisotropyMap.value=S.anisotropyMap,t(S.anisotropyMap,y.anisotropyMapTransform))),y.specularIntensity.value=S.specularIntensity,y.specularColor.value.copy(S.specularColor),S.specularColorMap&&(y.specularColorMap.value=S.specularColorMap,t(S.specularColorMap,y.specularColorMapTransform)),S.specularIntensityMap&&(y.specularIntensityMap.value=S.specularIntensityMap,t(S.specularIntensityMap,y.specularIntensityMapTransform))}function M(y,S){S.matcap&&(y.matcap.value=S.matcap)}function b(y,S){const P=e.get(S).light;y.referencePosition.value.setFromMatrixPosition(P.matrixWorld),y.nearDistance.value=P.shadow.camera.near,y.farDistance.value=P.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:a}}function kP(i,e,t,r){let a={},l={},c=[];const h=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function d(R,D){const N=D.program;r.uniformBlockBinding(R,N)}function f(R,D){let N=a[R.id];N===void 0&&(y(R),N=m(R),a[R.id]=N,R.addEventListener("dispose",P));const F=D.program;r.updateUBOMapping(R,F);const w=e.render.frame;l[R.id]!==w&&(v(R),l[R.id]=w)}function m(R){const D=g();R.__bindingPointIndex=D;const N=i.createBuffer(),F=R.__size,w=R.usage;return i.bindBuffer(i.UNIFORM_BUFFER,N),i.bufferData(i.UNIFORM_BUFFER,F,w),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,D,N),N}function g(){for(let R=0;R<h;R++)if(c.indexOf(R)===-1)return c.push(R),R;return Nt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function v(R){const D=a[R.id],N=R.uniforms,F=R.__cache;i.bindBuffer(i.UNIFORM_BUFFER,D);for(let w=0,I=N.length;w<I;w++){const G=N[w];if(Array.isArray(G))for(let V=0,Y=G.length;V<Y;V++)x(G[V],w,V,F);else x(G,w,0,F)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function x(R,D,N,F){if(b(R,D,N,F)===!0){const w=R.__offset,I=R.value;if(Array.isArray(I)){let G=0;for(let V=0;V<I.length;V++){const Y=I[V],me=S(Y);M(Y,R.__data,G),typeof Y!="number"&&typeof Y!="boolean"&&!Y.isMatrix3&&!ArrayBuffer.isView(Y)&&(G+=me.storage/Float32Array.BYTES_PER_ELEMENT)}}else M(I,R.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,w,R.__data)}}function M(R,D,N){typeof R=="number"||typeof R=="boolean"?D[0]=R:R.isMatrix3?(D[0]=R.elements[0],D[1]=R.elements[1],D[2]=R.elements[2],D[3]=0,D[4]=R.elements[3],D[5]=R.elements[4],D[6]=R.elements[5],D[7]=0,D[8]=R.elements[6],D[9]=R.elements[7],D[10]=R.elements[8],D[11]=0):ArrayBuffer.isView(R)?D.set(new R.constructor(R.buffer,R.byteOffset,D.length)):R.toArray(D,N)}function b(R,D,N,F){const w=R.value,I=D+"_"+N;if(F[I]===void 0)return typeof w=="number"||typeof w=="boolean"?F[I]=w:ArrayBuffer.isView(w)?F[I]=w.slice():F[I]=w.clone(),!0;{const G=F[I];if(typeof w=="number"||typeof w=="boolean"){if(G!==w)return F[I]=w,!0}else{if(ArrayBuffer.isView(w))return!0;if(G.equals(w)===!1)return G.copy(w),!0}}return!1}function y(R){const D=R.uniforms;let N=0;const F=16;for(let I=0,G=D.length;I<G;I++){const V=Array.isArray(D[I])?D[I]:[D[I]];for(let Y=0,me=V.length;Y<me;Y++){const de=V[Y],O=Array.isArray(de.value)?de.value:[de.value];for(let ce=0,Q=O.length;ce<Q;ce++){const $=O[ce],ne=S($),he=N%F,k=he%ne.boundary,ee=he+k;N+=k,ee!==0&&F-ee<ne.storage&&(N+=F-ee),de.__data=new Float32Array(ne.storage/Float32Array.BYTES_PER_ELEMENT),de.__offset=N,N+=ne.storage}}}const w=N%F;return w>0&&(N+=F-w),R.__size=N,R.__cache={},this}function S(R){const D={boundary:0,storage:0};return typeof R=="number"||typeof R=="boolean"?(D.boundary=4,D.storage=4):R.isVector2?(D.boundary=8,D.storage=8):R.isVector3||R.isColor?(D.boundary=16,D.storage=12):R.isVector4?(D.boundary=16,D.storage=16):R.isMatrix3?(D.boundary=48,D.storage=48):R.isMatrix4?(D.boundary=64,D.storage=64):R.isTexture?lt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(R)?(D.boundary=16,D.storage=R.byteLength):lt("WebGLRenderer: Unsupported uniform value type.",R),D}function P(R){const D=R.target;D.removeEventListener("dispose",P);const N=c.indexOf(D.__bindingPointIndex);c.splice(N,1),i.deleteBuffer(a[D.id]),delete a[D.id],delete l[D.id]}function L(){for(const R in a)i.deleteBuffer(a[R]);c=[],a={},l={}}return{bind:d,update:f,dispose:L}}const zP=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let ar=null;function BP(){return ar===null&&(ar=new _T(zP,16,16,Ea,Xr),ar.name="DFG_LUT",ar.minFilter=Wn,ar.magFilter=Wn,ar.wrapS=Hr,ar.wrapT=Hr,ar.generateMipmaps=!1,ar.needsUpdate=!0),ar}class HP{constructor(e={}){const{canvas:t=Yw(),context:r=null,depth:a=!0,stencil:l=!1,alpha:c=!1,antialias:h=!1,premultipliedAlpha:d=!0,preserveDrawingBuffer:f=!1,powerPreference:m="default",failIfMajorPerformanceCaveat:g=!1,reversedDepthBuffer:v=!1,outputBufferType:x=yi}=e;this.isWebGLRenderer=!0;let M;if(r!==null){if(typeof WebGLRenderingContext<"u"&&r instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");M=r.getContextAttributes().alpha}else M=c;const b=x,y=new Set([Lm,Nm,Pm]),S=new Set([yi,vr,Wl,jl,Cm,Am]),P=new Uint32Array(4),L=new Int32Array(4),R=new J;let D=null,N=null;const F=[],w=[];let I=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=pr,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const G=this;let V=!1,Y=null,me=null,de=null,O=null;this._outputColorSpace=Zn;let ce=0,Q=0,$=null,ne=-1,he=null;const k=new ln,ee=new ln;let Fe=null;const je=new gt(0);let Ge=0,ue=t.width,Se=t.height,xe=1,te=null,Ue=null;const tt=new ln(0,0,ue,Se),Dt=new ln(0,0,ue,Se);let ct=!1;const At=new Fm;let Et=!1,_t=!1;const Wt=new rn,$t=new J,Jt=new ln,qt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let wt=!1;function Gt(){return $===null?xe:1}let q=r;function xn(A,K){return t.getContext(A,K)}try{const A={alpha:!0,depth:a,stencil:l,antialias:h,premultipliedAlpha:d,preserveDrawingBuffer:f,powerPreference:m,failIfMajorPerformanceCaveat:g};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${wm}`),t.addEventListener("webglcontextlost",Ht,!1),t.addEventListener("webglcontextrestored",It,!1),t.addEventListener("webglcontextcreationerror",Fn,!1),q===null){const K="webgl2";if(q=xn(K,A),q===null)throw xn(K)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(A){throw Nt("WebGLRenderer: "+A.message),A}let Rt,U,T,Z,se,ge,Te,Ae,ve,_e,Ie,Xe,re,Ee,Be,nt,st,j,Ne,ye,De,Oe,Me;function Ke(){Rt=new BC(q),Rt.init(),De=new NP(q,Rt),U=new LC(q,Rt,e,De),T=new AP(q,Rt),U.reversedDepthBuffer&&v&&T.buffers.depth.setReversed(!0),me=q.createFramebuffer(),de=q.createFramebuffer(),O=q.createFramebuffer(),Z=new GC(q),se=new mP,ge=new PP(q,Rt,T,se,U,De,Z),Te=new zC(G),Ae=new $T(q),Oe=new PC(q,Ae),ve=new HC(q,Ae,Z,Oe),_e=new jC(q,ve,Ae,Oe,Z),j=new WC(q,U,ge),Be=new DC(se),Ie=new pP(G,Te,Rt,U,Oe,Be),Xe=new OP(G,se),re=new vP,Ee=new EP(Rt),st=new AC(G,Te,T,_e,M,d),nt=new CP(G,_e,U),Me=new kP(q,Z,U,T),Ne=new NC(q,Rt,Z),ye=new VC(q,Rt,Z),Z.programs=Ie.programs,G.capabilities=U,G.extensions=Rt,G.properties=se,G.renderLists=re,G.shadowMap=nt,G.state=T,G.info=Z}Ke(),b!==yi&&(I=new $C(b,t.width,t.height,h,a,l));const qe=new UP(G,q);this.xr=qe,this.getContext=function(){return q},this.getContextAttributes=function(){return q.getContextAttributes()},this.forceContextLoss=function(){const A=Rt.get("WEBGL_lose_context");A&&A.loseContext()},this.forceContextRestore=function(){const A=Rt.get("WEBGL_lose_context");A&&A.restoreContext()},this.getPixelRatio=function(){return xe},this.setPixelRatio=function(A){A!==void 0&&(xe=A,this.setSize(ue,Se,!1))},this.getSize=function(A){return A.set(ue,Se)},this.setSize=function(A,K,fe=!0){if(qe.isPresenting){lt("WebGLRenderer: Can't change size while VR device is presenting.");return}ue=A,Se=K,t.width=Math.floor(A*xe),t.height=Math.floor(K*xe),fe===!0&&(t.style.width=A+"px",t.style.height=K+"px"),I!==null&&I.setSize(t.width,t.height),this.setViewport(0,0,A,K)},this.getDrawingBufferSize=function(A){return A.set(ue*xe,Se*xe).floor()},this.setDrawingBufferSize=function(A,K,fe){ue=A,Se=K,xe=fe,t.width=Math.floor(A*fe),t.height=Math.floor(K*fe),this.setViewport(0,0,A,K)},this.setEffects=function(A){if(b===yi){Nt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(A){for(let K=0;K<A.length;K++)if(A[K].isOutputPass===!0){lt("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}I.setEffects(A||[])},this.getCurrentViewport=function(A){return A.copy(k)},this.getViewport=function(A){return A.copy(tt)},this.setViewport=function(A,K,fe,oe){A.isVector4?tt.set(A.x,A.y,A.z,A.w):tt.set(A,K,fe,oe),T.viewport(k.copy(tt).multiplyScalar(xe).round())},this.getScissor=function(A){return A.copy(Dt)},this.setScissor=function(A,K,fe,oe){A.isVector4?Dt.set(A.x,A.y,A.z,A.w):Dt.set(A,K,fe,oe),T.scissor(ee.copy(Dt).multiplyScalar(xe).round())},this.getScissorTest=function(){return ct},this.setScissorTest=function(A){T.setScissorTest(ct=A)},this.setOpaqueSort=function(A){te=A},this.setTransparentSort=function(A){Ue=A},this.getClearColor=function(A){return A.copy(st.getClearColor())},this.setClearColor=function(){st.setClearColor(...arguments)},this.getClearAlpha=function(){return st.getClearAlpha()},this.setClearAlpha=function(){st.setClearAlpha(...arguments)},this.clear=function(A=!0,K=!0,fe=!0){let oe=0;if(A){let ae=!1;if($!==null){const Le=$.texture.format;ae=y.has(Le)}if(ae){const Le=$.texture.type,We=S.has(Le),Pe=st.getClearColor(),Qe=st.getClearAlpha(),it=Pe.r,dt=Pe.g,ft=Pe.b;We?(P[0]=it,P[1]=dt,P[2]=ft,P[3]=Qe,q.clearBufferuiv(q.COLOR,0,P)):(L[0]=it,L[1]=dt,L[2]=ft,L[3]=Qe,q.clearBufferiv(q.COLOR,0,L))}else oe|=q.COLOR_BUFFER_BIT}K&&(oe|=q.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),fe&&(oe|=q.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),oe!==0&&q.clear(oe)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(A){A.setRenderer(this),Y=A},this.dispose=function(){t.removeEventListener("webglcontextlost",Ht,!1),t.removeEventListener("webglcontextrestored",It,!1),t.removeEventListener("webglcontextcreationerror",Fn,!1),st.dispose(),re.dispose(),Ee.dispose(),se.dispose(),Te.dispose(),_e.dispose(),Oe.dispose(),Me.dispose(),Ie.dispose(),qe.dispose(),qe.removeEventListener("sessionstart",sc),qe.removeEventListener("sessionend",ac),Xn.stop()};function Ht(A){A.preventDefault(),qv("WebGLRenderer: Context Lost."),V=!0}function It(){qv("WebGLRenderer: Context Restored."),V=!1;const A=Z.autoReset,K=nt.enabled,fe=nt.autoUpdate,oe=nt.needsUpdate,ae=nt.type;Ke(),Z.autoReset=A,nt.enabled=K,nt.autoUpdate=fe,nt.needsUpdate=oe,nt.type=ae}function Fn(A){Nt("WebGLRenderer: A WebGL context could not be created. Reason: ",A.statusMessage)}function Ei(A){const K=A.target;K.removeEventListener("dispose",Ei),ks(K)}function ks(A){wa(A),se.remove(A)}function wa(A){const K=se.get(A).programs;K!==void 0&&(K.forEach(function(fe){Ie.releaseProgram(fe)}),A.isShaderMaterial&&Ie.releaseShaderCache(A))}this.renderBufferDirect=function(A,K,fe,oe,ae,Le){K===null&&(K=qt);const We=ae.isMesh&&ae.matrixWorld.determinantAffine()<0,Pe=sn(A,K,fe,oe,ae);T.setMaterial(oe,We);let Qe=fe.index,it=1;if(oe.wireframe===!0){if(Qe=ve.getWireframeAttribute(fe),Qe===void 0)return;it=2}const dt=fe.drawRange,ft=fe.attributes.position;let Je=dt.start*it,Ct=(dt.start+dt.count)*it;Le!==null&&(Je=Math.max(Je,Le.start*it),Ct=Math.min(Ct,(Le.start+Le.count)*it)),Qe!==null?(Je=Math.max(Je,0),Ct=Math.min(Ct,Qe.count)):ft!=null&&(Je=Math.max(Je,0),Ct=Math.min(Ct,ft.count));const jt=Ct-Je;if(jt<0||jt===1/0)return;Oe.setup(ae,oe,Pe,fe,Qe);let en,kt=Ne;if(Qe!==null&&(en=Ae.get(Qe),kt=ye,kt.setIndex(en)),ae.isMesh)oe.wireframe===!0?(T.setLineWidth(oe.wireframeLinewidth*Gt()),kt.setMode(q.LINES)):kt.setMode(q.TRIANGLES);else if(ae.isLine){let fn=oe.linewidth;fn===void 0&&(fn=1),T.setLineWidth(fn*Gt()),ae.isLineSegments?kt.setMode(q.LINES):ae.isLineLoop?kt.setMode(q.LINE_LOOP):kt.setMode(q.LINE_STRIP)}else ae.isPoints?kt.setMode(q.POINTS):ae.isSprite&&kt.setMode(q.TRIANGLES);if(ae.isBatchedMesh)if(Rt.get("WEBGL_multi_draw"))kt.renderMultiDraw(ae._multiDrawStarts,ae._multiDrawCounts,ae._multiDrawCount);else{const fn=ae._multiDrawStarts,He=ae._multiDrawCounts,Nn=ae._multiDrawCount,xt=Qe?Ae.get(Qe).bytesPerElement:1,Jn=se.get(oe).currentProgram.getUniforms();for(let ei=0;ei<Nn;ei++)Jn.setValue(q,"_gl_DrawID",ei),kt.render(fn[ei]/xt,He[ei])}else if(ae.isInstancedMesh)kt.renderInstances(Je,jt,ae.count);else if(fe.isInstancedBufferGeometry){const fn=fe._maxInstanceCount!==void 0?fe._maxInstanceCount:1/0,He=Math.min(fe.instanceCount,fn);kt.renderInstances(Je,jt,He)}else kt.render(Je,jt)};function zs(A,K,fe){A.transparent===!0&&A.side===hr&&A.forceSinglePass===!1?(A.side=hi,A.needsUpdate=!0,Vs(A,K,fe),A.side=Is,A.needsUpdate=!0,Vs(A,K,fe),A.side=hr):Vs(A,K,fe)}this.compile=function(A,K,fe=null){fe===null&&(fe=A),N=Ee.get(fe),N.init(K),w.push(N),fe.traverseVisible(function(ae){ae.isLight&&ae.layers.test(K.layers)&&(N.pushLight(ae),ae.castShadow&&N.pushShadow(ae))}),A!==fe&&A.traverseVisible(function(ae){ae.isLight&&ae.layers.test(K.layers)&&(N.pushLight(ae),ae.castShadow&&N.pushShadow(ae))}),N.setupLights();const oe=new Set;return A.traverse(function(ae){if(!(ae.isMesh||ae.isPoints||ae.isLine||ae.isSprite))return;const Le=ae.material;if(Le)if(Array.isArray(Le))for(let We=0;We<Le.length;We++){const Pe=Le[We];zs(Pe,fe,ae),oe.add(Pe)}else zs(Le,fe,ae),oe.add(Le)}),N=w.pop(),oe},this.compileAsync=function(A,K,fe=null){const oe=this.compile(A,K,fe);return new Promise(ae=>{function Le(){if(oe.forEach(function(We){se.get(We).currentProgram.isReady()&&oe.delete(We)}),oe.size===0){ae(A);return}setTimeout(Le,10)}Rt.get("KHR_parallel_shader_compile")!==null?Le():setTimeout(Le,10)})};let Bs=null;function yh(A){Bs&&Bs(A)}function sc(){Xn.stop()}function ac(){Xn.start()}const Xn=new yy;Xn.setAnimationLoop(yh),typeof self<"u"&&Xn.setContext(self),this.setAnimationLoop=function(A){Bs=A,qe.setAnimationLoop(A),A===null?Xn.stop():Xn.start()},qe.addEventListener("sessionstart",sc),qe.addEventListener("sessionend",ac),this.render=function(A,K){if(K!==void 0&&K.isCamera!==!0){Nt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(V===!0)return;Y!==null&&Y.renderStart(A,K);const fe=qe.enabled===!0&&qe.isPresenting===!0,oe=I!==null&&($===null||fe)&&I.begin(G,$);if(A.matrixWorldAutoUpdate===!0&&A.updateMatrixWorld(),K.parent===null&&K.matrixWorldAutoUpdate===!0&&K.updateMatrixWorld(),qe.enabled===!0&&qe.isPresenting===!0&&(I===null||I.isCompositing()===!1)&&(qe.cameraAutoUpdate===!0&&qe.updateCamera(K),K=qe.getCamera()),A.isScene===!0&&A.onBeforeRender(G,A,K,$),N=Ee.get(A,w.length),N.init(K),N.state.textureUnits=ge.getTextureUnits(),w.push(N),Wt.multiplyMatrices(K.projectionMatrix,K.matrixWorldInverse),At.setFromProjectionMatrix(Wt,fr,K.reversedDepth),_t=this.localClippingEnabled,Et=Be.init(this.clippingPlanes,_t),D=re.get(A,F.length),D.init(),F.push(D),qe.enabled===!0&&qe.isPresenting===!0){const We=G.xr.getDepthSensingMesh();We!==null&&Ta(We,K,-1/0,G.sortObjects)}Ta(A,K,0,G.sortObjects),D.finish(),G.sortObjects===!0&&D.sort(te,Ue,K.reversedDepth),wt=qe.enabled===!1||qe.isPresenting===!1||qe.hasDepthSensing()===!1,wt&&st.addToRenderList(D,A),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),Et===!0&&Be.beginShadows();const ae=N.state.shadowsArray;if(nt.render(ae,A,K),Et===!0&&Be.endShadows(),(oe&&I.hasRenderPass())===!1){const We=D.opaque,Pe=D.transmissive;if(N.setupLights(),K.isArrayCamera){const Qe=K.cameras;if(Pe.length>0)for(let it=0,dt=Qe.length;it<dt;it++){const ft=Qe[it];oc(We,Pe,A,ft)}wt&&st.render(A);for(let it=0,dt=Qe.length;it<dt;it++){const ft=Qe[it];Go(D,A,ft,ft.viewport)}}else Pe.length>0&&oc(We,Pe,A,K),wt&&st.render(A),Go(D,A,K)}$!==null&&Q===0&&(ge.updateMultisampleRenderTarget($),ge.updateRenderTargetMipmap($)),oe&&I.end(G),A.isScene===!0&&A.onAfterRender(G,A,K),Oe.resetDefaultState(),ne=-1,he=null,w.pop(),w.length>0?(N=w[w.length-1],ge.setTextureUnits(N.state.textureUnits),Et===!0&&Be.setGlobalState(G.clippingPlanes,N.state.camera)):N=null,F.pop(),F.length>0?D=F[F.length-1]:D=null,Y!==null&&Y.renderEnd()};function Ta(A,K,fe,oe){if(A.visible===!1)return;if(A.layers.test(K.layers)){if(A.isGroup)fe=A.renderOrder;else if(A.isLOD)A.autoUpdate===!0&&A.update(K);else if(A.isLightProbeGrid)N.pushLightProbeGrid(A);else if(A.isLight)N.pushLight(A),A.castShadow&&N.pushShadow(A);else if(A.isSprite){if(!A.frustumCulled||At.intersectsSprite(A)){oe&&Jt.setFromMatrixPosition(A.matrixWorld).applyMatrix4(Wt);const We=_e.update(A),Pe=A.material;Pe.visible&&D.push(A,We,Pe,fe,Jt.z,null)}}else if((A.isMesh||A.isLine||A.isPoints)&&(!A.frustumCulled||At.intersectsObject(A))){const We=_e.update(A),Pe=A.material;if(oe&&(A.boundingSphere!==void 0?(A.boundingSphere===null&&A.computeBoundingSphere(),Jt.copy(A.boundingSphere.center)):(We.boundingSphere===null&&We.computeBoundingSphere(),Jt.copy(We.boundingSphere.center)),Jt.applyMatrix4(A.matrixWorld).applyMatrix4(Wt)),Array.isArray(Pe)){const Qe=We.groups;for(let it=0,dt=Qe.length;it<dt;it++){const ft=Qe[it],Je=Pe[ft.materialIndex];Je&&Je.visible&&D.push(A,We,Je,fe,Jt.z,ft)}}else Pe.visible&&D.push(A,We,Pe,fe,Jt.z,null)}}const Le=A.children;for(let We=0,Pe=Le.length;We<Pe;We++)Ta(Le[We],K,fe,oe)}function Go(A,K,fe,oe){const{opaque:ae,transmissive:Le,transparent:We}=A;N.setupLightsView(fe),Et===!0&&Be.setGlobalState(G.clippingPlanes,fe),oe&&T.viewport(k.copy(oe)),ae.length>0&&Hs(ae,K,fe),Le.length>0&&Hs(Le,K,fe),We.length>0&&Hs(We,K,fe),T.buffers.depth.setTest(!0),T.buffers.depth.setMask(!0),T.buffers.color.setMask(!0),T.setPolygonOffset(!1)}function oc(A,K,fe,oe){if((fe.isScene===!0?fe.overrideMaterial:null)!==null)return;if(N.state.transmissionRenderTarget[oe.id]===void 0){const Je=Rt.has("EXT_color_buffer_half_float")||Rt.has("EXT_color_buffer_float");N.state.transmissionRenderTarget[oe.id]=new mr(1,1,{generateMipmaps:!0,type:Je?Xr:yi,minFilter:ua,samples:Math.max(4,U.samples),stencilBuffer:l,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:bt.workingColorSpace})}const Le=N.state.transmissionRenderTarget[oe.id],We=oe.viewport||k;Le.setSize(We.z*G.transmissionResolutionScale,We.w*G.transmissionResolutionScale);const Pe=G.getRenderTarget(),Qe=G.getActiveCubeFace(),it=G.getActiveMipmapLevel();G.setRenderTarget(Le),G.getClearColor(je),Ge=G.getClearAlpha(),Ge<1&&G.setClearColor(16777215,.5),G.clear(),wt&&st.render(fe);const dt=G.toneMapping;G.toneMapping=pr;const ft=oe.viewport;if(oe.viewport!==void 0&&(oe.viewport=void 0),N.setupLightsView(oe),Et===!0&&Be.setGlobalState(G.clippingPlanes,oe),Hs(A,fe,oe),ge.updateMultisampleRenderTarget(Le),ge.updateRenderTargetMipmap(Le),Rt.has("WEBGL_multisampled_render_to_texture")===!1){let Je=!1;for(let Ct=0,jt=K.length;Ct<jt;Ct++){const en=K[Ct],{object:kt,geometry:fn,material:He,group:Nn}=en;if(He.side===hr&&kt.layers.test(oe.layers)){const xt=He.side;He.side=hi,He.needsUpdate=!0,Wo(kt,fe,oe,fn,He,Nn),He.side=xt,He.needsUpdate=!0,Je=!0}}Je===!0&&(ge.updateMultisampleRenderTarget(Le),ge.updateRenderTargetMipmap(Le))}G.setRenderTarget(Pe,Qe,it),G.setClearColor(je,Ge),ft!==void 0&&(oe.viewport=ft),G.toneMapping=dt}function Hs(A,K,fe){const oe=K.isScene===!0?K.overrideMaterial:null;for(let ae=0,Le=A.length;ae<Le;ae++){const We=A[ae],{object:Pe,geometry:Qe,group:it}=We;let dt=We.material;dt.allowOverride===!0&&oe!==null&&(dt=oe),Pe.layers.test(fe.layers)&&Wo(Pe,K,fe,Qe,dt,it)}}function Wo(A,K,fe,oe,ae,Le){A.onBeforeRender(G,K,fe,oe,ae,Le),A.modelViewMatrix.multiplyMatrices(fe.matrixWorldInverse,A.matrixWorld),A.normalMatrix.getNormalMatrix(A.modelViewMatrix),ae.onBeforeRender(G,K,fe,oe,A,Le),ae.transparent===!0&&ae.side===hr&&ae.forceSinglePass===!1?(ae.side=hi,ae.needsUpdate=!0,G.renderBufferDirect(fe,K,oe,ae,A,Le),ae.side=Is,ae.needsUpdate=!0,G.renderBufferDirect(fe,K,oe,ae,A,Le),ae.side=hr):G.renderBufferDirect(fe,K,oe,ae,A,Le),A.onAfterRender(G,K,fe,oe,ae,Le)}function Vs(A,K,fe){K.isScene!==!0&&(K=qt);const oe=se.get(A),ae=N.state.lights,Le=N.state.shadowsArray,We=ae.state.version,Pe=Ie.getParameters(A,ae.state,Le,K,fe,N.state.lightProbeGridArray),Qe=Ie.getProgramCacheKey(Pe);let it=oe.programs;oe.environment=A.isMeshStandardMaterial||A.isMeshLambertMaterial||A.isMeshPhongMaterial?K.environment:null,oe.fog=K.fog;const dt=A.isMeshStandardMaterial||A.isMeshLambertMaterial&&!A.envMap||A.isMeshPhongMaterial&&!A.envMap;oe.envMap=Te.get(A.envMap||oe.environment,dt),oe.envMapRotation=oe.environment!==null&&A.envMap===null?K.environmentRotation:A.envMapRotation,it===void 0&&(A.addEventListener("dispose",Ei),it=new Map,oe.programs=it);let ft=it.get(Qe);if(ft!==void 0){if(oe.currentProgram===ft&&oe.lightsStateVersion===We)return lc(A,Pe),ft}else Pe.uniforms=Ie.getUniforms(A),Y!==null&&A.isNodeMaterial&&Y.build(A,fe,Pe),A.onBeforeCompile(Pe,G),ft=Ie.acquireProgram(Pe,Qe),it.set(Qe,ft),oe.uniforms=Pe.uniforms;const Je=oe.uniforms;return(!A.isShaderMaterial&&!A.isRawShaderMaterial||A.clipping===!0)&&(Je.clippingPlanes=Be.uniform),lc(A,Pe),oe.needsLights=Xo(A),oe.lightsStateVersion=We,oe.needsLights&&(Je.ambientLightColor.value=ae.state.ambient,Je.lightProbe.value=ae.state.probe,Je.directionalLights.value=ae.state.directional,Je.directionalLightShadows.value=ae.state.directionalShadow,Je.spotLights.value=ae.state.spot,Je.spotLightShadows.value=ae.state.spotShadow,Je.rectAreaLights.value=ae.state.rectArea,Je.ltc_1.value=ae.state.rectAreaLTC1,Je.ltc_2.value=ae.state.rectAreaLTC2,Je.pointLights.value=ae.state.point,Je.pointLightShadows.value=ae.state.pointShadow,Je.hemisphereLights.value=ae.state.hemi,Je.directionalShadowMatrix.value=ae.state.directionalShadowMatrix,Je.spotLightMatrix.value=ae.state.spotLightMatrix,Je.spotLightMap.value=ae.state.spotLightMap,Je.pointShadowMatrix.value=ae.state.pointShadowMatrix),oe.lightProbeGrid=N.state.lightProbeGridArray.length>0,oe.currentProgram=ft,oe.uniformsList=null,ft}function jo(A){if(A.uniformsList===null){const K=A.currentProgram.getUniforms();A.uniformsList=Qu.seqWithValue(K.seq,A.uniforms)}return A.uniformsList}function lc(A,K){const fe=se.get(A);fe.outputColorSpace=K.outputColorSpace,fe.batching=K.batching,fe.batchingColor=K.batchingColor,fe.instancing=K.instancing,fe.instancingColor=K.instancingColor,fe.instancingMorph=K.instancingMorph,fe.skinning=K.skinning,fe.morphTargets=K.morphTargets,fe.morphNormals=K.morphNormals,fe.morphColors=K.morphColors,fe.morphTargetsCount=K.morphTargetsCount,fe.numClippingPlanes=K.numClippingPlanes,fe.numIntersection=K.numClipIntersection,fe.vertexAlphas=K.vertexAlphas,fe.vertexTangents=K.vertexTangents,fe.toneMapping=K.toneMapping}function Sh(A,K){if(A.length===0)return null;if(A.length===1)return A[0].texture!==null?A[0]:null;R.setFromMatrixPosition(K.matrixWorld);for(let fe=0,oe=A.length;fe<oe;fe++){const ae=A[fe];if(ae.texture!==null&&ae.boundingBox.containsPoint(R))return ae}return null}function sn(A,K,fe,oe,ae){K.isScene!==!0&&(K=qt),ge.resetTextureUnits();const Le=K.fog,We=oe.isMeshStandardMaterial||oe.isMeshLambertMaterial||oe.isMeshPhongMaterial?K.environment:null,Pe=$===null?G.outputColorSpace:$.isXRRenderTarget===!0?$.texture.colorSpace:bt.workingColorSpace,Qe=oe.isMeshStandardMaterial||oe.isMeshLambertMaterial&&!oe.envMap||oe.isMeshPhongMaterial&&!oe.envMap,it=Te.get(oe.envMap||We,Qe),dt=oe.vertexColors===!0&&!!fe.attributes.color&&fe.attributes.color.itemSize===4,ft=!!fe.attributes.tangent&&(!!oe.normalMap||oe.anisotropy>0),Je=!!fe.morphAttributes.position,Ct=!!fe.morphAttributes.normal,jt=!!fe.morphAttributes.color;let en=pr;oe.toneMapped&&($===null||$.isXRRenderTarget===!0)&&(en=G.toneMapping);const kt=fe.morphAttributes.position||fe.morphAttributes.normal||fe.morphAttributes.color,fn=kt!==void 0?kt.length:0,He=se.get(oe),Nn=N.state.lights;if(Et===!0&&(_t===!0||A!==he)){const zt=A===he&&oe.id===ne;Be.setState(oe,A,zt)}let xt=!1;oe.version===He.__version?(He.needsLights&&He.lightsStateVersion!==Nn.state.version||He.outputColorSpace!==Pe||ae.isBatchedMesh&&He.batching===!1||!ae.isBatchedMesh&&He.batching===!0||ae.isBatchedMesh&&He.batchingColor===!0&&ae.colorTexture===null||ae.isBatchedMesh&&He.batchingColor===!1&&ae.colorTexture!==null||ae.isInstancedMesh&&He.instancing===!1||!ae.isInstancedMesh&&He.instancing===!0||ae.isSkinnedMesh&&He.skinning===!1||!ae.isSkinnedMesh&&He.skinning===!0||ae.isInstancedMesh&&He.instancingColor===!0&&ae.instanceColor===null||ae.isInstancedMesh&&He.instancingColor===!1&&ae.instanceColor!==null||ae.isInstancedMesh&&He.instancingMorph===!0&&ae.morphTexture===null||ae.isInstancedMesh&&He.instancingMorph===!1&&ae.morphTexture!==null||He.envMap!==it||oe.fog===!0&&He.fog!==Le||He.numClippingPlanes!==void 0&&(He.numClippingPlanes!==Be.numPlanes||He.numIntersection!==Be.numIntersection)||He.vertexAlphas!==dt||He.vertexTangents!==ft||He.morphTargets!==Je||He.morphNormals!==Ct||He.morphColors!==jt||He.toneMapping!==en||He.morphTargetsCount!==fn||!!He.lightProbeGrid!=N.state.lightProbeGridArray.length>0)&&(xt=!0):(xt=!0,He.__version=oe.version);let Jn=He.currentProgram;xt===!0&&(Jn=Vs(oe,K,ae),Y&&oe.isNodeMaterial&&Y.onUpdateProgram(oe,Jn,He));let ei=!1,yt=!1,yr=!1;const Ut=Jn.getUniforms(),Yt=He.uniforms;if(T.useProgram(Jn.program)&&(ei=!0,yt=!0,yr=!0),oe.id!==ne&&(ne=oe.id,yt=!0),He.needsLights){const zt=Sh(N.state.lightProbeGridArray,ae);He.lightProbeGrid!==zt&&(He.lightProbeGrid=zt,yt=!0)}if(ei||he!==A){T.buffers.depth.getReversed()&&A.reversedDepth!==!0&&(A._reversedDepth=!0,A.updateProjectionMatrix()),Ut.setValue(q,"projectionMatrix",A.projectionMatrix),Ut.setValue(q,"viewMatrix",A.matrixWorldInverse);const Fi=Ut.map.cameraPosition;Fi!==void 0&&Fi.setValue(q,$t.setFromMatrixPosition(A.matrixWorld)),U.logarithmicDepthBuffer&&Ut.setValue(q,"logDepthBufFC",2/(Math.log(A.far+1)/Math.LN2)),(oe.isMeshPhongMaterial||oe.isMeshToonMaterial||oe.isMeshLambertMaterial||oe.isMeshBasicMaterial||oe.isMeshStandardMaterial||oe.isShaderMaterial)&&Ut.setValue(q,"isOrthographic",A.isOrthographicCamera===!0),he!==A&&(he=A,yt=!0,yr=!0)}if(He.needsLights&&(Nn.state.directionalShadowMap.length>0&&Ut.setValue(q,"directionalShadowMap",Nn.state.directionalShadowMap,ge),Nn.state.spotShadowMap.length>0&&Ut.setValue(q,"spotShadowMap",Nn.state.spotShadowMap,ge),Nn.state.pointShadowMap.length>0&&Ut.setValue(q,"pointShadowMap",Nn.state.pointShadowMap,ge)),ae.isSkinnedMesh){Ut.setOptional(q,ae,"bindMatrix"),Ut.setOptional(q,ae,"bindMatrixInverse");const zt=ae.skeleton;zt&&(zt.boneTexture===null&&zt.computeBoneTexture(),Ut.setValue(q,"boneTexture",zt.boneTexture,ge))}ae.isBatchedMesh&&(Ut.setOptional(q,ae,"batchingTexture"),Ut.setValue(q,"batchingTexture",ae._matricesTexture,ge),Ut.setOptional(q,ae,"batchingIdTexture"),Ut.setValue(q,"batchingIdTexture",ae._indirectTexture,ge),Ut.setOptional(q,ae,"batchingColorTexture"),ae._colorsTexture!==null&&Ut.setValue(q,"batchingColorTexture",ae._colorsTexture,ge));const Ui=fe.morphAttributes;if((Ui.position!==void 0||Ui.normal!==void 0||Ui.color!==void 0)&&j.update(ae,fe,Jn),(yt||He.receiveShadow!==ae.receiveShadow)&&(He.receiveShadow=ae.receiveShadow,Ut.setValue(q,"receiveShadow",ae.receiveShadow)),(oe.isMeshStandardMaterial||oe.isMeshLambertMaterial||oe.isMeshPhongMaterial)&&oe.envMap===null&&K.environment!==null&&(Yt.envMapIntensity.value=K.environmentIntensity),Yt.dfgLUT!==void 0&&(Yt.dfgLUT.value=BP()),yt){if(Ut.setValue(q,"toneMappingExposure",G.toneMappingExposure),He.needsLights&&Mh(Yt,yr),Le&&oe.fog===!0&&Xe.refreshFogUniforms(Yt,Le),Xe.refreshMaterialUniforms(Yt,oe,xe,Se,N.state.transmissionRenderTarget[A.id]),He.needsLights&&He.lightProbeGrid){const zt=He.lightProbeGrid;Yt.probesSH.value=zt.texture,Yt.probesMin.value.copy(zt.boundingBox.min),Yt.probesMax.value.copy(zt.boundingBox.max),Yt.probesResolution.value.copy(zt.resolution)}Qu.upload(q,jo(He),Yt,ge)}if(oe.isShaderMaterial&&oe.uniformsNeedUpdate===!0&&(Qu.upload(q,jo(He),Yt,ge),oe.uniformsNeedUpdate=!1),oe.isSpriteMaterial&&Ut.setValue(q,"center",ae.center),Ut.setValue(q,"modelViewMatrix",ae.modelViewMatrix),Ut.setValue(q,"normalMatrix",ae.normalMatrix),Ut.setValue(q,"modelMatrix",ae.matrixWorld),oe.uniformsGroups!==void 0){const zt=oe.uniformsGroups;for(let Fi=0,er=zt.length;Fi<er;Fi++){const Gs=zt[Fi];Me.update(Gs,Jn),Me.bind(Gs,Jn)}}return Jn}function Mh(A,K){A.ambientLightColor.needsUpdate=K,A.lightProbe.needsUpdate=K,A.directionalLights.needsUpdate=K,A.directionalLightShadows.needsUpdate=K,A.pointLights.needsUpdate=K,A.pointLightShadows.needsUpdate=K,A.spotLights.needsUpdate=K,A.spotLightShadows.needsUpdate=K,A.rectAreaLights.needsUpdate=K,A.hemisphereLights.needsUpdate=K}function Xo(A){return A.isMeshLambertMaterial||A.isMeshToonMaterial||A.isMeshPhongMaterial||A.isMeshStandardMaterial||A.isShadowMaterial||A.isShaderMaterial&&A.lights===!0}this.getActiveCubeFace=function(){return ce},this.getActiveMipmapLevel=function(){return Q},this.getRenderTarget=function(){return $},this.setRenderTargetTextures=function(A,K,fe){const oe=se.get(A);oe.__autoAllocateDepthBuffer=A.resolveDepthBuffer===!1,oe.__autoAllocateDepthBuffer===!1&&(oe.__useRenderToTexture=!1),se.get(A.texture).__webglTexture=K,se.get(A.depthTexture).__webglTexture=oe.__autoAllocateDepthBuffer?void 0:fe,oe.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(A,K){const fe=se.get(A);fe.__webglFramebuffer=K,fe.__useDefaultFramebuffer=K===void 0},this.setRenderTarget=function(A,K=0,fe=0){$=A,ce=K,Q=fe;let oe=null,ae=!1,Le=!1;if(A){const Pe=se.get(A);if(Pe.__useDefaultFramebuffer!==void 0){T.bindFramebuffer(q.FRAMEBUFFER,Pe.__webglFramebuffer),k.copy(A.viewport),ee.copy(A.scissor),Fe=A.scissorTest,T.viewport(k),T.scissor(ee),T.setScissorTest(Fe),ne=-1;return}else if(Pe.__webglFramebuffer===void 0)ge.setupRenderTarget(A);else if(Pe.__hasExternalTextures)ge.rebindTextures(A,se.get(A.texture).__webglTexture,se.get(A.depthTexture).__webglTexture);else if(A.depthBuffer){const dt=A.depthTexture;if(Pe.__boundDepthTexture!==dt){if(dt!==null&&se.has(dt)&&(A.width!==dt.image.width||A.height!==dt.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");ge.setupDepthRenderbuffer(A)}}const Qe=A.texture;(Qe.isData3DTexture||Qe.isDataArrayTexture||Qe.isCompressedArrayTexture)&&(Le=!0);const it=se.get(A).__webglFramebuffer;A.isWebGLCubeRenderTarget?(Array.isArray(it[K])?oe=it[K][fe]:oe=it[K],ae=!0):A.samples>0&&ge.useMultisampledRTT(A)===!1?oe=se.get(A).__webglMultisampledFramebuffer:Array.isArray(it)?oe=it[fe]:oe=it,k.copy(A.viewport),ee.copy(A.scissor),Fe=A.scissorTest}else k.copy(tt).multiplyScalar(xe).floor(),ee.copy(Dt).multiplyScalar(xe).floor(),Fe=ct;if(fe!==0&&(oe=me),T.bindFramebuffer(q.FRAMEBUFFER,oe)&&T.drawBuffers(A,oe),T.viewport(k),T.scissor(ee),T.setScissorTest(Fe),ae){const Pe=se.get(A.texture);q.framebufferTexture2D(q.FRAMEBUFFER,q.COLOR_ATTACHMENT0,q.TEXTURE_CUBE_MAP_POSITIVE_X+K,Pe.__webglTexture,fe)}else if(Le){const Pe=K;for(let Qe=0;Qe<A.textures.length;Qe++){const it=se.get(A.textures[Qe]);q.framebufferTextureLayer(q.FRAMEBUFFER,q.COLOR_ATTACHMENT0+Qe,it.__webglTexture,fe,Pe)}}else if(A!==null&&fe!==0){const Pe=se.get(A.texture);q.framebufferTexture2D(q.FRAMEBUFFER,q.COLOR_ATTACHMENT0,q.TEXTURE_2D,Pe.__webglTexture,fe)}ne=-1},this.readRenderTargetPixels=function(A,K,fe,oe,ae,Le,We,Pe=0){if(!(A&&A.isWebGLRenderTarget)){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Qe=se.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&We!==void 0&&(Qe=Qe[We]),Qe){T.bindFramebuffer(q.FRAMEBUFFER,Qe);try{const it=A.textures[Pe],dt=it.format,ft=it.type;if(A.textures.length>1&&q.readBuffer(q.COLOR_ATTACHMENT0+Pe),!U.textureFormatReadable(dt)){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!U.textureTypeReadable(ft)){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}K>=0&&K<=A.width-oe&&fe>=0&&fe<=A.height-ae&&q.readPixels(K,fe,oe,ae,De.convert(dt),De.convert(ft),Le)}finally{const it=$!==null?se.get($).__webglFramebuffer:null;T.bindFramebuffer(q.FRAMEBUFFER,it)}}},this.readRenderTargetPixelsAsync=async function(A,K,fe,oe,ae,Le,We,Pe=0){if(!(A&&A.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Qe=se.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&We!==void 0&&(Qe=Qe[We]),Qe)if(K>=0&&K<=A.width-oe&&fe>=0&&fe<=A.height-ae){T.bindFramebuffer(q.FRAMEBUFFER,Qe);const it=A.textures[Pe],dt=it.format,ft=it.type;if(A.textures.length>1&&q.readBuffer(q.COLOR_ATTACHMENT0+Pe),!U.textureFormatReadable(dt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!U.textureTypeReadable(ft))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Je=q.createBuffer();q.bindBuffer(q.PIXEL_PACK_BUFFER,Je),q.bufferData(q.PIXEL_PACK_BUFFER,Le.byteLength,q.STREAM_READ),q.readPixels(K,fe,oe,ae,De.convert(dt),De.convert(ft),0);const Ct=$!==null?se.get($).__webglFramebuffer:null;T.bindFramebuffer(q.FRAMEBUFFER,Ct);const jt=q.fenceSync(q.SYNC_GPU_COMMANDS_COMPLETE,0);return q.flush(),await Kw(q,jt,4),q.bindBuffer(q.PIXEL_PACK_BUFFER,Je),q.getBufferSubData(q.PIXEL_PACK_BUFFER,0,Le),q.deleteBuffer(Je),q.deleteSync(jt),Le}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(A,K=null,fe=0){const oe=Math.pow(2,-fe),ae=Math.floor(A.image.width*oe),Le=Math.floor(A.image.height*oe),We=K!==null?K.x:0,Pe=K!==null?K.y:0;ge.setTexture2D(A,0),q.copyTexSubImage2D(q.TEXTURE_2D,fe,0,0,We,Pe,ae,Le),T.unbindTexture()},this.copyTextureToTexture=function(A,K,fe=null,oe=null,ae=0,Le=0){let We,Pe,Qe,it,dt,ft,Je,Ct,jt;const en=A.isCompressedTexture?A.mipmaps[Le]:A.image;if(fe!==null)We=fe.max.x-fe.min.x,Pe=fe.max.y-fe.min.y,Qe=fe.isBox3?fe.max.z-fe.min.z:1,it=fe.min.x,dt=fe.min.y,ft=fe.isBox3?fe.min.z:0;else{const Yt=Math.pow(2,-ae);We=Math.floor(en.width*Yt),Pe=Math.floor(en.height*Yt),A.isDataArrayTexture?Qe=en.depth:A.isData3DTexture?Qe=Math.floor(en.depth*Yt):Qe=1,it=0,dt=0,ft=0}oe!==null?(Je=oe.x,Ct=oe.y,jt=oe.z):(Je=0,Ct=0,jt=0);const kt=De.convert(K.format),fn=De.convert(K.type);let He;K.isData3DTexture?(ge.setTexture3D(K,0),He=q.TEXTURE_3D):K.isDataArrayTexture||K.isCompressedArrayTexture?(ge.setTexture2DArray(K,0),He=q.TEXTURE_2D_ARRAY):(ge.setTexture2D(K,0),He=q.TEXTURE_2D),T.activeTexture(q.TEXTURE0),T.pixelStorei(q.UNPACK_FLIP_Y_WEBGL,K.flipY),T.pixelStorei(q.UNPACK_PREMULTIPLY_ALPHA_WEBGL,K.premultiplyAlpha),T.pixelStorei(q.UNPACK_ALIGNMENT,K.unpackAlignment);const Nn=T.getParameter(q.UNPACK_ROW_LENGTH),xt=T.getParameter(q.UNPACK_IMAGE_HEIGHT),Jn=T.getParameter(q.UNPACK_SKIP_PIXELS),ei=T.getParameter(q.UNPACK_SKIP_ROWS),yt=T.getParameter(q.UNPACK_SKIP_IMAGES);T.pixelStorei(q.UNPACK_ROW_LENGTH,en.width),T.pixelStorei(q.UNPACK_IMAGE_HEIGHT,en.height),T.pixelStorei(q.UNPACK_SKIP_PIXELS,it),T.pixelStorei(q.UNPACK_SKIP_ROWS,dt),T.pixelStorei(q.UNPACK_SKIP_IMAGES,ft);const yr=A.isDataArrayTexture||A.isData3DTexture,Ut=K.isDataArrayTexture||K.isData3DTexture;if(A.isDepthTexture){const Yt=se.get(A),Ui=se.get(K),zt=se.get(Yt.__renderTarget),Fi=se.get(Ui.__renderTarget);T.bindFramebuffer(q.READ_FRAMEBUFFER,zt.__webglFramebuffer),T.bindFramebuffer(q.DRAW_FRAMEBUFFER,Fi.__webglFramebuffer);for(let er=0;er<Qe;er++)yr&&(q.framebufferTextureLayer(q.READ_FRAMEBUFFER,q.COLOR_ATTACHMENT0,se.get(A).__webglTexture,ae,ft+er),q.framebufferTextureLayer(q.DRAW_FRAMEBUFFER,q.COLOR_ATTACHMENT0,se.get(K).__webglTexture,Le,jt+er)),q.blitFramebuffer(it,dt,We,Pe,Je,Ct,We,Pe,q.DEPTH_BUFFER_BIT,q.NEAREST);T.bindFramebuffer(q.READ_FRAMEBUFFER,null),T.bindFramebuffer(q.DRAW_FRAMEBUFFER,null)}else if(ae!==0||A.isRenderTargetTexture||se.has(A)){const Yt=se.get(A),Ui=se.get(K);T.bindFramebuffer(q.READ_FRAMEBUFFER,de),T.bindFramebuffer(q.DRAW_FRAMEBUFFER,O);for(let zt=0;zt<Qe;zt++)yr?q.framebufferTextureLayer(q.READ_FRAMEBUFFER,q.COLOR_ATTACHMENT0,Yt.__webglTexture,ae,ft+zt):q.framebufferTexture2D(q.READ_FRAMEBUFFER,q.COLOR_ATTACHMENT0,q.TEXTURE_2D,Yt.__webglTexture,ae),Ut?q.framebufferTextureLayer(q.DRAW_FRAMEBUFFER,q.COLOR_ATTACHMENT0,Ui.__webglTexture,Le,jt+zt):q.framebufferTexture2D(q.DRAW_FRAMEBUFFER,q.COLOR_ATTACHMENT0,q.TEXTURE_2D,Ui.__webglTexture,Le),ae!==0?q.blitFramebuffer(it,dt,We,Pe,Je,Ct,We,Pe,q.COLOR_BUFFER_BIT,q.NEAREST):Ut?q.copyTexSubImage3D(He,Le,Je,Ct,jt+zt,it,dt,We,Pe):q.copyTexSubImage2D(He,Le,Je,Ct,it,dt,We,Pe);T.bindFramebuffer(q.READ_FRAMEBUFFER,null),T.bindFramebuffer(q.DRAW_FRAMEBUFFER,null)}else Ut?A.isDataTexture||A.isData3DTexture?q.texSubImage3D(He,Le,Je,Ct,jt,We,Pe,Qe,kt,fn,en.data):K.isCompressedArrayTexture?q.compressedTexSubImage3D(He,Le,Je,Ct,jt,We,Pe,Qe,kt,en.data):q.texSubImage3D(He,Le,Je,Ct,jt,We,Pe,Qe,kt,fn,en):A.isDataTexture?q.texSubImage2D(q.TEXTURE_2D,Le,Je,Ct,We,Pe,kt,fn,en.data):A.isCompressedTexture?q.compressedTexSubImage2D(q.TEXTURE_2D,Le,Je,Ct,en.width,en.height,kt,en.data):q.texSubImage2D(q.TEXTURE_2D,Le,Je,Ct,We,Pe,kt,fn,en);T.pixelStorei(q.UNPACK_ROW_LENGTH,Nn),T.pixelStorei(q.UNPACK_IMAGE_HEIGHT,xt),T.pixelStorei(q.UNPACK_SKIP_PIXELS,Jn),T.pixelStorei(q.UNPACK_SKIP_ROWS,ei),T.pixelStorei(q.UNPACK_SKIP_IMAGES,yt),Le===0&&K.generateMipmaps&&q.generateMipmap(He),T.unbindTexture()},this.initRenderTarget=function(A){se.get(A).__webglFramebuffer===void 0&&ge.setupRenderTarget(A)},this.initTexture=function(A){A.isCubeTexture?ge.setTextureCube(A,0):A.isData3DTexture?ge.setTexture3D(A,0):A.isDataArrayTexture||A.isCompressedArrayTexture?ge.setTexture2DArray(A,0):ge.setTexture2D(A,0),T.unbindTexture()},this.resetState=function(){ce=0,Q=0,$=null,T.reset(),Oe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return fr}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=bt._getDrawingBufferColorSpace(e),t.unpackColorSpace=bt._getUnpackColorSpace()}}const VP=/^[og]\s*(.+)?/,GP=/^mtllib /,WP=/^usemtl /,jP=/^usemap /,qx=/\s+/,Yx=new J,$f=new J,Kx=new J,Qx=new J,Ni=new J,zu=new gt;function XP(){const i={objects:[],object:{},vertices:[],normals:[],colors:[],uvs:[],materials:{},materialLibraries:[],startObject:function(e,t){if(this.object&&this.object.fromDeclaration===!1){this.object.name=e,this.object.fromDeclaration=t!==!1;return}const r=this.object&&typeof this.object.currentMaterial=="function"?this.object.currentMaterial():void 0;if(this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0),this.object={name:e||"",fromDeclaration:t!==!1,geometry:{vertices:[],normals:[],colors:[],uvs:[],hasUVIndices:!1},materials:[],smooth:!0,startMaterial:function(a,l){const c=this._finalize(!1);c&&(c.inherited||c.groupCount<=0)&&this.materials.splice(c.index,1);const h={index:this.materials.length,name:a||"",mtllib:Array.isArray(l)&&l.length>0?l[l.length-1]:"",smooth:c!==void 0?c.smooth:this.smooth,groupStart:c!==void 0?c.groupEnd:0,groupEnd:-1,groupCount:-1,inherited:!1,clone:function(d){const f={index:typeof d=="number"?d:this.index,name:this.name,mtllib:this.mtllib,smooth:this.smooth,groupStart:0,groupEnd:-1,groupCount:-1,inherited:!1};return f.clone=this.clone.bind(f),f}};return this.materials.push(h),h},currentMaterial:function(){if(this.materials.length>0)return this.materials[this.materials.length-1]},_finalize:function(a){const l=this.currentMaterial();if(l&&l.groupEnd===-1&&(l.groupEnd=this.geometry.vertices.length/3,l.groupCount=l.groupEnd-l.groupStart,l.inherited=!1),a&&this.materials.length>1)for(let c=this.materials.length-1;c>=0;c--)this.materials[c].groupCount<=0&&this.materials.splice(c,1);return a&&this.materials.length===0&&this.materials.push({name:"",smooth:this.smooth}),l}},r&&r.name&&typeof r.clone=="function"){const a=r.clone(0);a.inherited=!0,this.object.materials.push(a)}this.objects.push(this.object)},finalize:function(){this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0)},parseVertexIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/3)*3},parseNormalIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/3)*3},parseUVIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/2)*2},addVertex:function(e,t,r){const a=this.vertices,l=this.object.geometry.vertices;l.push(a[e+0],a[e+1],a[e+2]),l.push(a[t+0],a[t+1],a[t+2]),l.push(a[r+0],a[r+1],a[r+2])},addVertexPoint:function(e){const t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addVertexLine:function(e){const t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addNormal:function(e,t,r){const a=this.normals,l=this.object.geometry.normals;l.push(a[e+0],a[e+1],a[e+2]),l.push(a[t+0],a[t+1],a[t+2]),l.push(a[r+0],a[r+1],a[r+2])},addFaceNormal:function(e,t,r){const a=this.vertices,l=this.object.geometry.normals;Yx.fromArray(a,e),$f.fromArray(a,t),Kx.fromArray(a,r),Ni.subVectors(Kx,$f),Qx.subVectors(Yx,$f),Ni.cross(Qx),Ni.normalize(),l.push(Ni.x,Ni.y,Ni.z),l.push(Ni.x,Ni.y,Ni.z),l.push(Ni.x,Ni.y,Ni.z)},addColor:function(e,t,r){const a=this.colors,l=this.object.geometry.colors;a[e]!==void 0&&l.push(a[e+0],a[e+1],a[e+2]),a[t]!==void 0&&l.push(a[t+0],a[t+1],a[t+2]),a[r]!==void 0&&l.push(a[r+0],a[r+1],a[r+2])},addUV:function(e,t,r){const a=this.uvs,l=this.object.geometry.uvs;l.push(a[e+0],a[e+1]),l.push(a[t+0],a[t+1]),l.push(a[r+0],a[r+1])},addDefaultUV:function(){const e=this.object.geometry.uvs;e.push(0,0),e.push(0,0),e.push(0,0)},addUVLine:function(e){const t=this.uvs;this.object.geometry.uvs.push(t[e+0],t[e+1])},addFace:function(e,t,r,a,l,c,h,d,f){const m=this.vertices.length;let g=this.parseVertexIndex(e,m),v=this.parseVertexIndex(t,m),x=this.parseVertexIndex(r,m);if(this.addVertex(g,v,x),this.addColor(g,v,x),h!==void 0&&h!==""){const M=this.normals.length;g=this.parseNormalIndex(h,M),v=this.parseNormalIndex(d,M),x=this.parseNormalIndex(f,M),this.addNormal(g,v,x)}else this.addFaceNormal(g,v,x);if(a!==void 0&&a!==""){const M=this.uvs.length;g=this.parseUVIndex(a,M),v=this.parseUVIndex(l,M),x=this.parseUVIndex(c,M),this.addUV(g,v,x),this.object.geometry.hasUVIndices=!0}else this.addDefaultUV()},addPointGeometry:function(e){this.object.geometry.type="Points";const t=this.vertices.length;for(let r=0,a=e.length;r<a;r++){const l=this.parseVertexIndex(e[r],t);this.addVertexPoint(l),this.addColor(l)}},addLineGeometry:function(e,t){this.object.geometry.type="Line";const r=this.vertices.length,a=this.uvs.length;for(let l=0,c=e.length;l<c;l++)this.addVertexLine(this.parseVertexIndex(e[l],r));for(let l=0,c=t.length;l<c;l++)this.addUVLine(this.parseUVIndex(t[l],a))}};return i.startObject("",!1),i}class $P extends rc{constructor(e){super(e),this.materials=null}load(e,t,r,a){const l=this,c=new FT(this.manager);c.setPath(this.path),c.setRequestHeader(this.requestHeader),c.setWithCredentials(this.withCredentials),c.load(e,function(h){try{t(l.parse(h))}catch(d){a?a(d):console.error(d),l.manager.itemError(e)}},r,a)}setMaterials(e){return this.materials=e,this}parse(e){const t=new XP;e.indexOf(`\r
`)!==-1&&(e=e.replace(/\r\n/g,`
`)),e.indexOf(`\\
`)!==-1&&(e=e.replace(/\\\n/g,""));const r=e.split(`
`);let a=[];for(let h=0,d=r.length;h<d;h++){const f=r[h].trimStart();if(f.length===0)continue;const m=f.charAt(0);if(m!=="#")if(m==="v"){const g=f.split(qx);switch(g[0]){case"v":t.vertices.push(parseFloat(g[1]),parseFloat(g[2]),parseFloat(g[3])),g.length>=7?(zu.setRGB(parseFloat(g[4]),parseFloat(g[5]),parseFloat(g[6]),Zn),t.colors.push(zu.r,zu.g,zu.b)):t.colors.push(void 0,void 0,void 0);break;case"vn":t.normals.push(parseFloat(g[1]),parseFloat(g[2]),parseFloat(g[3]));break;case"vt":t.uvs.push(parseFloat(g[1]),parseFloat(g[2]));break}}else if(m==="f"){const v=f.slice(1).trim().split(qx),x=[];for(let b=0,y=v.length;b<y;b++){const S=v[b];if(S.length>0){const P=S.split("/");x.push(P)}}const M=x[0];for(let b=1,y=x.length-1;b<y;b++){const S=x[b],P=x[b+1];t.addFace(M[0],S[0],P[0],M[1],S[1],P[1],M[2],S[2],P[2])}}else if(m==="l"){const g=f.substring(1).trim().split(" ");let v=[];const x=[];if(f.indexOf("/")===-1)v=g;else for(let M=0,b=g.length;M<b;M++){const y=g[M].split("/");y[0]!==""&&v.push(y[0]),y[1]!==""&&x.push(y[1])}t.addLineGeometry(v,x)}else if(m==="p"){const v=f.slice(1).trim().split(" ");t.addPointGeometry(v)}else if((a=VP.exec(f))!==null){const g=(" "+a[0].slice(1).trim()).slice(1);t.startObject(g)}else if(WP.test(f))t.object.startMaterial(f.substring(7).trim(),t.materialLibraries);else if(GP.test(f))t.materialLibraries.push(f.substring(7).trim());else if(jP.test(f))console.warn('THREE.OBJLoader: Rendering identifier "usemap" not supported. Textures must be defined in MTL files.');else if(m==="s"){if(a=f.split(" "),a.length>1){const v=a[1].trim().toLowerCase();t.object.smooth=v!=="0"&&v!=="off"}else t.object.smooth=!0;const g=t.object.currentMaterial();g&&(g.smooth=t.object.smooth)}else{if(f==="\0")continue;console.warn('THREE.OBJLoader: Unexpected line: "'+f+'"')}}t.finalize();const l=new Fl;if(l.materialLibraries=[].concat(t.materialLibraries),!(t.objects.length===1&&t.objects[0].geometry.vertices.length===0)===!0)for(let h=0,d=t.objects.length;h<d;h++){const f=t.objects[h],m=f.geometry,g=f.materials,v=m.type==="Line",x=m.type==="Points";let M=!1;if(m.vertices.length===0)continue;const b=new Si;b.setAttribute("position",new In(m.vertices,3)),m.normals.length>0&&b.setAttribute("normal",new In(m.normals,3)),m.colors.length>0&&(M=!0,b.setAttribute("color",new In(m.colors,3))),m.hasUVIndices===!0&&b.setAttribute("uv",new In(m.uvs,2));const y=[];for(let P=0,L=g.length;P<L;P++){const R=g[P],D=R.name+"_"+R.smooth+"_"+M;let N=t.materials[D];if(this.materials!==null){if(N=this.materials.create(R.name),v&&N&&!(N instanceof Ku)){const F=new Ku;xr.prototype.copy.call(F,N),F.color.copy(N.color),N=F}else if(x&&N&&!(N instanceof Ol)){const F=new Ol({size:10,sizeAttenuation:!1});xr.prototype.copy.call(F,N),F.color.copy(N.color),F.map=N.map,N=F}}N===void 0&&(v?N=new Ku:x?N=new Ol({size:1,sizeAttenuation:!1}):N=new PT,N.name=R.name,N.flatShading=!R.smooth,N.vertexColors=M,t.materials[D]=N),y.push(N)}let S;if(y.length>1){for(let P=0,L=g.length;P<L;P++){const R=g[P];b.addGroup(R.groupStart,R.groupCount,P)}v?S=new fx(b,y):x?S=new Of(b,y):S=new Qi(b,y)}else v?S=new fx(b,y[0]):x?S=new Of(b,y[0]):S=new Qi(b,y[0]);S.name=f.name,l.add(S)}else if(t.vertices.length>0){const h=new Ol({size:1,sizeAttenuation:!1}),d=new Si;d.setAttribute("position",new In(t.vertices,3)),t.colors.length>0&&t.colors[0]!==void 0&&(d.setAttribute("color",new In(t.colors,3)),h.vertexColors=!0);const f=new Of(d,h);l.add(f)}return l}}const Zx={type:"change"},zm={type:"start"},Cy={type:"end"},Bu=new gh,Jx=new Ss,qP=Math.cos(70*Jw.DEG2RAD),Sn=new J,li=2*Math.PI,Vt={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},qf=1e-6;class YP extends jT{constructor(e,t=null){super(e,t),this.state=Vt.NONE,this.target=new J,this.cursor=new J,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:po.ROTATE,MIDDLE:po.DOLLY,RIGHT:po.PAN},this.touches={ONE:ho.ROTATE,TWO:ho.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new J,this._lastQuaternion=new Us,this._lastTargetPosition=new J,this._quat=new Us().setFromUnitVectors(e.up,new J(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Mx,this._sphericalDelta=new Mx,this._scale=1,this._panOffset=new J,this._rotateStart=new ht,this._rotateEnd=new ht,this._rotateDelta=new ht,this._panStart=new ht,this._panEnd=new ht,this._panDelta=new ht,this._dollyStart=new ht,this._dollyEnd=new ht,this._dollyDelta=new ht,this._dollyDirection=new J,this._mouse=new ht,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=QP.bind(this),this._onPointerDown=KP.bind(this),this._onPointerUp=ZP.bind(this),this._onContextMenu=s2.bind(this),this._onMouseWheel=t2.bind(this),this._onKeyDown=n2.bind(this),this._onTouchStart=i2.bind(this),this._onTouchMove=r2.bind(this),this._onMouseDown=JP.bind(this),this._onMouseMove=e2.bind(this),this._interceptControlDown=a2.bind(this),this._interceptControlUp=o2.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction=""}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(Zx),this.update(),this.state=Vt.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){const t=this.object.position;Sn.copy(t).sub(this.target),Sn.applyQuaternion(this._quat),this._spherical.setFromVector3(Sn),this.autoRotate&&this.state===Vt.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let r=this.minAzimuthAngle,a=this.maxAzimuthAngle;isFinite(r)&&isFinite(a)&&(r<-Math.PI?r+=li:r>Math.PI&&(r-=li),a<-Math.PI?a+=li:a>Math.PI&&(a-=li),r<=a?this._spherical.theta=Math.max(r,Math.min(a,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(r+a)/2?Math.max(r,this._spherical.theta):Math.min(a,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let l=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const c=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),l=c!=this._spherical.radius}if(Sn.setFromSpherical(this._spherical),Sn.applyQuaternion(this._quatInverse),t.copy(this.target).add(Sn),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let c=null;if(this.object.isPerspectiveCamera){const h=Sn.length();c=this._clampDistance(h*this._scale);const d=h-c;this.object.position.addScaledVector(this._dollyDirection,d),this.object.updateMatrixWorld(),l=!!d}else if(this.object.isOrthographicCamera){const h=new J(this._mouse.x,this._mouse.y,0);h.unproject(this.object);const d=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),l=d!==this.object.zoom;const f=new J(this._mouse.x,this._mouse.y,0);f.unproject(this.object),this.object.position.sub(f).add(h),this.object.updateMatrixWorld(),c=Sn.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;c!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(c).add(this.object.position):(Bu.origin.copy(this.object.position),Bu.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Bu.direction))<qP?this.object.lookAt(this.target):(Jx.setFromNormalAndCoplanarPoint(this.object.up,this.target),Bu.intersectPlane(Jx,this.target))))}else if(this.object.isOrthographicCamera){const c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),c!==this.object.zoom&&(this.object.updateProjectionMatrix(),l=!0)}return this._scale=1,this._performCursorZoom=!1,l||this._lastPosition.distanceToSquared(this.object.position)>qf||8*(1-this._lastQuaternion.dot(this.object.quaternion))>qf||this._lastTargetPosition.distanceToSquared(this.target)>qf?(this.dispatchEvent(Zx),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?li/60*this.autoRotateSpeed*e:li/60/60*this.autoRotateSpeed}_getZoomScale(e){const t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Sn.setFromMatrixColumn(t,0),Sn.multiplyScalar(-e),this._panOffset.add(Sn)}_panUp(e,t){this.screenSpacePanning===!0?Sn.setFromMatrixColumn(t,1):(Sn.setFromMatrixColumn(t,0),Sn.crossVectors(this.object.up,Sn)),Sn.multiplyScalar(e),this._panOffset.add(Sn)}_pan(e,t){const r=this.domElement;if(this.object.isPerspectiveCamera){const a=this.object.position;Sn.copy(a).sub(this.target);let l=Sn.length();l*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*l/r.clientHeight,this.object.matrix),this._panUp(2*t*l/r.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/r.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/r.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const r=this.domElement.getBoundingClientRect(),a=e-r.left,l=t-r.top,c=r.width,h=r.height;this._mouse.x=a/c*2-1,this._mouse.y=-(l/h)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(li*this._rotateDelta.x/t.clientHeight),this._rotateUp(li*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(li*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-li*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(li*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-li*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._rotateStart.set(r,a)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._panStart.set(r,a)}}_handleTouchStartDolly(e){const t=this._getSecondPointerPosition(e),r=e.pageX-t.x,a=e.pageY-t.y,l=Math.sqrt(r*r+a*a);this._dollyStart.set(0,l)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{const r=this._getSecondPointerPosition(e),a=.5*(e.pageX+r.x),l=.5*(e.pageY+r.y);this._rotateEnd.set(a,l)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(li*this._rotateDelta.x/t.clientHeight),this._rotateUp(li*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._panEnd.set(r,a)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){const t=this._getSecondPointerPosition(e),r=e.pageX-t.x,a=e.pageY-t.y,l=Math.sqrt(r*r+a*a);this._dollyEnd.set(0,l),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const c=(e.pageX+t.x)*.5,h=(e.pageY+t.y)*.5;this._updateZoomParameters(c,h)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new ht,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){const t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){const t=e.deltaMode,r={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:r.deltaY*=16;break;case 2:r.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(r.deltaY*=10),r}}function KP(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function QP(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function ZP(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Cy),this.state=Vt.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:const e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function JP(i){let e;switch(i.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case po.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=Vt.DOLLY;break;case po.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Vt.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Vt.ROTATE}break;case po.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Vt.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Vt.PAN}break;default:this.state=Vt.NONE}this.state!==Vt.NONE&&this.dispatchEvent(zm)}function e2(i){switch(this.state){case Vt.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case Vt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case Vt.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function t2(i){this.enabled===!1||this.enableZoom===!1||this.state!==Vt.NONE||(i.preventDefault(),this.dispatchEvent(zm),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(Cy))}function n2(i){this.enabled!==!1&&this._handleKeyDown(i)}function i2(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case ho.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=Vt.TOUCH_ROTATE;break;case ho.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=Vt.TOUCH_PAN;break;default:this.state=Vt.NONE}break;case 2:switch(this.touches.TWO){case ho.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=Vt.TOUCH_DOLLY_PAN;break;case ho.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=Vt.TOUCH_DOLLY_ROTATE;break;default:this.state=Vt.NONE}break;default:this.state=Vt.NONE}this.state!==Vt.NONE&&this.dispatchEvent(zm)}function r2(i){switch(this._trackPointer(i),this.state){case Vt.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case Vt.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case Vt.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case Vt.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=Vt.NONE}}function s2(i){this.enabled!==!1&&i.preventDefault()}function a2(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function o2(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function l2({piece:i,variant:e,textured:t=!0,size:r=320}){const a=B.useRef(null);return B.useEffect(()=>{const l=a.current;if(!l)return;const c=new fT;c.background=new gt(1315866);const h=new Di(35,1,.01,5e3),d=new HP({antialias:!0});d.setSize(r,r),d.setPixelRatio(Math.min(2,window.devicePixelRatio)),d.outputColorSpace=Zn,d.toneMapping=bm,d.toneMappingExposure=1.15,l.appendChild(d.domElement),c.add(new zT(16777215,4210768,1.1)),c.add(new VT(16777215,.35));const f=new Bf(16777215,2.4);f.position.set(3,4,2),c.add(f);const m=new Bf(16777215,1.1);m.position.set(-3,1,-1),c.add(m);const g=new Bf(16777215,.8);g.position.set(0,2,-4),c.add(g);const v=new YP(h,d.domElement);v.enableDamping=!0,v.autoRotate=!0,v.autoRotateSpeed=1.2;let x=0,M=!1;new $P().load(`/api/scan/model/${i}/${e}.obj`,S=>{if(M)return;S.traverse(F=>{const w=F;w.isMesh&&w.geometry.computeVertexNormals()});const P=F=>c2(S,F);t?new kT().load(`/api/scan/model/${i}/${e}.png`,F=>{F.colorSpace=Zn,P(new kf({map:F,roughness:.6}))},void 0,()=>P(new kf({color:11579576,roughness:.6}))):P(new kf({color:12632262,roughness:.65})),S.rotation.x=-Math.PI/2;const L=new Ho().setFromObject(S),R=L.getCenter(new J),D=L.getSize(new J);S.position.sub(R),c.add(S);const N=Math.max(D.x,D.y,D.z);h.position.set(N*1.6,N*.6,N*1.6),h.near=N/100,h.far=N*100,h.updateProjectionMatrix(),v.target.set(0,0,0),v.update()});const y=()=>{v.update(),d.render(c,h),x=requestAnimationFrame(y)};return y(),()=>{M=!0,cancelAnimationFrame(x),v.dispose(),d.dispose(),l.removeChild(d.domElement)}},[i,e,t,r]),E.jsx("div",{ref:a,style:{width:r,height:r},className:"rounded-lg border border-zinc-700 bg-zinc-950 [&>canvas]:rounded-lg"})}function c2(i,e){e.side=hr,i.traverse(t=>{t.isMesh&&(t.material=e)})}const Ur="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",u2="https://<PHONE-IP>:4444/video/m.jpeg",h2="https://<PHONE-IP>:4444/video/snapshot",d2={P:"Pawn",N:"Knight",B:"Bishop",R:"Rook",Q:"Queen",K:"King"};function f2(i){const e=i.match(/^([wb]?)([PNBRQK])$/i);if(!e)return null;const t=e[2].toUpperCase();return e[1]?e[1].toLowerCase()+t:t}function ch(i){const e=i.length===2?i[1]:i[0];let t="";return i.length===2&&(t=i[0]==="w"?"white ":"black "),t+(d2[e]??i)}function im(i,e){const t=f2(i.dir),r=e.find(a=>a.source_dir===i.dir)??(t?e.find(a=>a.piece.toLowerCase()===t.toLowerCase()&&!a.source_dir):void 0);return r?{stage:"done",piece:r.piece,variant:r.variant}:i.mesh?{stage:"mesh",piece:t,variant:null}:{stage:"mesh",piece:t,variant:null}}function p2(){const[i,e]=B.useState(u2),[t,r]=B.useState(h2),[a,l]=B.useState(2880),[c,h]=B.useState(2160),[d,f]=B.useState("pawn"),[m,g]=B.useState(.8),[v,x]=B.useState(80),[M,b]=B.useState(92),[y,S]=B.useState(null),[P,L]=B.useState(""),[R,D]=B.useState(null),N=B.useRef(null),F=B.useRef(null),[w,I]=B.useState(null),[G,V]=B.useState(""),[Y,me]=B.useState("P"),[de,O]=B.useState(null),[ce,Q]=B.useState("textured"),[$,ne]=B.useState(null),[he,k]=B.useState(null),[ee,Fe]=B.useState(null),[je,Ge]=B.useState(""),[ue,Se]=B.useState(!1),xe=B.useRef(null);B.useEffect(()=>(dn("/api/scan/status").then(re=>{S(re),re.default_source&&e(re.default_source),re.default_capture&&r(re.default_capture),re.out&&f(re.out)}).catch(()=>{}),()=>clearInterval(F.current)),[]);const te=()=>dn("/api/scan/status").then(S).catch(()=>{});function Ue(){clearInterval(F.current),F.current=setInterval(te,1e3)}async function tt(){L("");try{const re=await gn("/api/scan/open",{source:i,width:a,height:c,capture:t});S(re),Ue()}catch(re){L("Fehler: "+re.message)}}async function Dt(){const re=await gn("/api/scan/close");S(re),clearInterval(F.current)}function ct(re){const Ee=N.current.getBoundingClientRect();return{x:re.clientX-Ee.left,y:re.clientY-Ee.top,r:Ee}}function At(re){if(!(y!=null&&y.open))return;re.target.setPointerCapture(re.pointerId);const{x:Ee,y:Be}=ct(re);D({x0:Ee,y0:Be,x1:Ee,y1:Be})}function Et(re){if(!R)return;const{x:Ee,y:Be}=ct(re);D({...R,x1:Ee,y1:Be})}async function _t(){if(!R||!y)return D(null);const re=N.current.getBoundingClientRect(),[Ee,Be]=y.frame_size,nt=Ee/re.width,st=Be/re.height,j=Math.round(Math.min(R.x0,R.x1)*nt),Ne=Math.round(Math.min(R.y0,R.y1)*st),ye=Math.round(Math.max(R.x0,R.x1)*nt),De=Math.round(Math.max(R.y0,R.y1)*st);D(null),!(ye-j<10||De-Ne<10)&&S(await gn("/api/scan/config",{crop:[j,Ne,ye,De]}))}async function Wt(){S(await gn("/api/scan/config",{crop:[]}))}async function $t(){S(await gn("/api/scan/config",{interval:m,count:v,quality:M,out:d}))}async function Jt(){L("");try{await $t();const re=await gn("/api/scan/start",{out:d});S(re),Ue()}catch(re){L("Fehler: "+re.message)}}const qt=async()=>S(await gn("/api/scan/stop")),wt=()=>dn("/api/scan/models").then(re=>{I(re),!G&&re.scans.length&&Gt(re.scans[0],re.pieces)}).catch(()=>{});function Gt(re,Ee=(w==null?void 0:w.pieces)??[]){V(re.dir);const{piece:Be}=im(re,Ee);me(Be??"P")}async function q(re){confirm(`Scan „${re}" mit Mesh wirklich löschen?`)&&(await Gl(`/api/scan/scan/${re}`).catch(()=>{}),G===re&&V(""),wt())}async function xn(re,Ee){confirm(`Vorbereitete Figur „${re}/${Ee}" löschen? (Der Scan bleibt erhalten.)`)&&(await Gl(`/api/scan/piece/${re}/${Ee}`).catch(()=>{}),O(null),wt())}async function Rt(){var re;if(!(!he||!je)){Se(!0),L("");try{const Ee=new FormData;Ee.append("name",je),Ee.append("mesh",he),ee&&Ee.append("texture",ee);const Be=await fetch("/api/scan/upload",{method:"POST",body:Ee});if(!Be.ok)throw new Error(((re=await Be.json())==null?void 0:re.detail)||`HTTP ${Be.status}`);await wt(),V(je),Ge(""),k(null),Fe(null)}catch(Ee){L("Upload: "+Ee.message)}Se(!1)}}const U=()=>dn("/api/scan/prepare/status").then(re=>{O(re),re.state!=="running"&&(clearInterval(xe.current),wt())}).catch(()=>{});B.useEffect(()=>(wt(),dn("/api/scan/prepare/status").then(re=>{re.state==="running"&&(O(re),xe.current=setInterval(U,2e3))}).catch(()=>{}),()=>{clearInterval(xe.current)}),[]);async function T(){L("");try{const re=await gn("/api/scan/prepare",{dir:G,piece:Y});O({state:"running",piece:Y,variant:re==null?void 0:re.variant}),clearInterval(xe.current),xe.current=setInterval(U,2e3)}catch(re){L("Fehler: "+re.message)}}const Z=y==null?void 0:y.recording,se=R&&{left:Math.min(R.x0,R.x1),top:Math.min(R.y0,R.y1),width:Math.abs(R.x1-R.x0),height:Math.abs(R.y1-R.y0)},ge=(w==null?void 0:w.scans)??[],Te=ge.find(re=>re.dir===G),Ae=Te?im(Te,(w==null?void 0:w.pieces)??[]):null,ve=Ae==null?void 0:Ae.stage,_e=(de==null?void 0:de.state)==="running",Ie=ve==="done"?2:1;let Xe;return _e?Xe="running…":ve==="done"?Xe="Re-prepare":Xe="Prepare",(Ae==null?void 0:Ae.stage)==="done"?Ae.piece:(de==null?void 0:de.state)==="done"&&de.piece,E.jsxs("div",{className:"space-y-4",children:[E.jsx(vn,{children:E.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[E.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Live preview stream (MJPEG, …/video/m.jpeg) or USB index.",children:["Preview",E.jsx("input",{value:i,onChange:re=>e(re.target.value),className:`${Ur} w-96`,placeholder:"Stream-URL (…/video/m.jpeg) oder USB-Index (0/1)"})]}),E.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Photo to save per capture (snapshot URL, …/video/snapshot). Empty = use live frame.",children:["Photo",E.jsx("input",{value:t,onChange:re=>r(re.target.value),className:`${Ur} w-96`,placeholder:"Snapshot-URL (…/video/snapshot), leer = Live-Frame"})]}),E.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"For USB cam only: requested resolution (MJPG).",children:["USB Res",E.jsx("input",{type:"number",value:a,onChange:re=>l(+re.target.value),className:`${Ur} w-20`}),"×",E.jsx("input",{type:"number",value:c,onChange:re=>h(+re.target.value),className:`${Ur} w-20`})]}),y!=null&&y.open?E.jsxs(Zt,{onClick:Dt,children:[E.jsx(Fv,{className:"h-4 w-4"})," Disconnect"]}):E.jsxs(Zt,{variant:"primary",onClick:tt,children:[E.jsx(Fv,{className:"h-4 w-4"})," Connect"]}),E.jsxs("span",{className:"text-xs text-zinc-500",children:[P,y!=null&&y.error?` · ${y.error}`:""]})]})}),(y==null?void 0:y.open)&&E.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_320px]",children:[E.jsxs(vn,{title:"Live · Crop mit der Maus aufziehen",children:[E.jsxs("div",{className:"relative inline-block select-none leading-none",children:[E.jsx("img",{ref:N,src:"/api/scan/preview.mjpg",alt:"Scan Vorschau",draggable:!1,className:"w-full rounded-lg border border-zinc-800"}),E.jsx("div",{className:"absolute inset-0 cursor-crosshair",onPointerDown:At,onPointerMove:Et,onPointerUp:_t,children:se&&E.jsx("div",{className:"absolute border-2 border-sky-400 bg-sky-400/10",style:{left:se.left,top:se.top,width:se.width,height:se.height}})})]}),E.jsxs("div",{className:"mt-2 flex items-center gap-3 text-xs text-zinc-500",children:[E.jsxs("span",{children:["Quelle ",y.frame_size[0],"×",y.frame_size[1]]}),E.jsxs("span",{children:["Crop: ",y.crop?y.crop.join(", "):"—"]}),E.jsxs(Zt,{onClick:Wt,className:"px-2 py-1 text-xs",children:[E.jsx(nw,{className:"h-3 w-3"})," Reset crop"]})]})]}),E.jsx(vn,{title:"Aufnahme",children:E.jsxs("div",{className:"space-y-3",children:[E.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",children:["Target folder",E.jsx("input",{value:d,onChange:re=>f(re.target.value),className:`${Ur} w-40`})]}),E.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",title:"Sekunden zwischen zwei Fotos. Beim Handy ist ~0.8s das Limit (HTTPS-Fetch).",children:["Intervall (s)",E.jsx("input",{type:"number",step:.1,min:0,value:m,onChange:re=>g(+re.target.value),className:`${Ur} w-24`})]}),E.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",title:"Fotos pro Aufnahme-Lauf. 0 = bis Stop.",children:["Anzahl (0=∞)",E.jsx("input",{type:"number",min:0,value:v,onChange:re=>x(+re.target.value),className:`${Ur} w-24`})]}),E.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",children:["JPEG quality",E.jsx("input",{type:"number",min:50,max:100,value:M,onChange:re=>b(+re.target.value),className:`${Ur} w-24`})]}),E.jsxs("div",{className:"flex flex-wrap gap-2 pt-1",children:[Z?E.jsxs(Zt,{onClick:qt,children:[E.jsx(X_,{className:"h-4 w-4"})," Stop"]}):E.jsxs(Zt,{variant:"primary",onClick:Jt,children:[E.jsx(Mm,{className:"h-4 w-4"})," Aufnahme starten"]}),E.jsxs(Zt,{onClick:$t,title:"Apply interval/count/quality without capturing",children:[E.jsx(Y1,{className:"h-4 w-4"})," Apply"]})]}),E.jsxs("div",{className:"rounded-lg bg-zinc-800 p-3 text-sm",children:[Z?E.jsxs("span",{className:"font-medium text-green-500",children:["● Capture running — ",y.saved_run,y.count?` / ${y.count}`:""," Fotos"]}):E.jsx("span",{className:"text-zinc-400",children:"bereit"}),E.jsxs("div",{className:"mt-1 text-xs text-zinc-500",children:["Im Ordner ",E.jsx("b",{className:"text-zinc-300",children:y.out||d}),": ",y.total," photos total (next no. ",y.index,")"]})]}),E.jsxs("p",{className:"text-xs text-zinc-500",children:["Motor on, phone/cam ",E.jsx("b",{children:"fixed"}),', hands off. "Start capture" appends to existing photos (Ring 2/3 einfach neu positionieren + wieder starten).']})]})})]}),!(y!=null&&y.open)&&E.jsxs("p",{className:"text-xs text-zinc-500",children:["Verbinde eine Quelle (Handy-IP-Cam-URL oder USB-Index), zieh im Live-Bild den ",E.jsx("b",{children:"Crop"})," um Figur + Drehteller (statischer Hintergrund raus), stell ",E.jsx("b",{children:"Intervall"})," und ",E.jsx("b",{children:"Anzahl"})," ein und nimm auf. Photos go to ",E.jsx("b",{children:"scans/<folder>"})," — ready for RealityScan."]}),E.jsxs(vn,{title:"Figuren-Werkstatt — 3D-Scan → Figur",children:[E.jsx("div",{className:"mb-4 flex items-center gap-1 text-xs",children:[[1,"Upload",$_],[2,"Prepare",Ov]].map(([re,Ee,Be],nt)=>E.jsxs("div",{className:"flex items-center gap-1",children:[E.jsxs("div",{className:`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${Ie>=re?"bg-sky-500/15 text-sky-300":"bg-zinc-800 text-zinc-500"}`,children:[E.jsx(Be,{className:"h-3.5 w-3.5"})," ",E.jsx("span",{children:Ee})]}),nt<1&&E.jsx("div",{className:`h-px w-4 ${Ie>re?"bg-sky-500/40":"bg-zinc-700"}`})]},re))}),ge.length===0&&E.jsx("p",{className:"text-sm text-zinc-500",children:"Noch keine Scans. Lade ein 3D-Modell (.obj/.glb) hoch — es erscheint dann hier als Karte."}),E.jsx(m2,{uploadName:je,setUploadName:Ge,meshFile:he,setMeshFile:k,texFile:ee,setTexFile:Fe,uploading:ue,doUpload:Rt,input:Ur}),E.jsx(g2,{scans:ge,models:w,dir:G,selectScan:Gt,deleteScan:q,prep:de}),Te&&E.jsxs("div",{className:"mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4",children:[E.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[E.jsxs("div",{className:"flex items-center gap-2",children:[E.jsxs("div",{children:[E.jsx("div",{className:"text-sm font-medium text-zinc-100",children:Te.dir}),E.jsxs("div",{className:"text-xs text-zinc-500",children:[Te.mesh?"Mesh vorhanden":"noch kein Mesh",!Te.texture&&Te.mesh?" · ⚠ ohne Textured":""]})]}),E.jsx("button",{onClick:()=>q(Te.dir),title:"Delete scan",className:"rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400",children:E.jsx(Bo,{className:"h-4 w-4"})})]}),E.jsxs(Zt,{variant:"primary",onClick:T,disabled:_e,children:[_e?E.jsx(Fs,{className:"h-4 w-4 animate-spin"}):E.jsx(Ov,{className:"h-4 w-4"}),Xe]})]}),E.jsx(x2,{cur:Te,busyPrep:_e,prep:de}),P&&E.jsx("p",{className:"mt-2 text-sm text-red-400",children:P})]}),E.jsx(_2,{pieces:w==null?void 0:w.pieces,setView3d:ne,deletePiece:xn,prep:de,kind:ce,setKind:Q})]}),$&&E.jsx(v2,{piece:$.piece,variant:$.variant,textured:ce==="textured",onClose:()=>ne(null)})]})}function m2({uploadName:i,setUploadName:e,meshFile:t,setMeshFile:r,texFile:a,setTexFile:l,uploading:c,doUpload:h,input:d}){return E.jsxs("div",{className:"mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3",children:[E.jsx("div",{className:"mb-2 text-xs font-medium text-zinc-400",children:"3D-Modell hochladen (.obj/.glb)"}),E.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[E.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Name",E.jsx("input",{value:i,onChange:f=>e(f.target.value),placeholder:"z.B. wK",className:`${d} w-32`})]}),E.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Mesh (.obj/.glb)",E.jsx("input",{type:"file",accept:".obj,.glb,.gltf",onChange:f=>{var m;return r(((m=f.target.files)==null?void 0:m[0])??null)},className:"text-xs text-zinc-300 file:mr-1 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-0.5 file:text-xs file:text-zinc-200"})]}),E.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Textured (optional)",E.jsx("input",{type:"file",accept:".png,.jpg,.jpeg",onChange:f=>{var m;return l(((m=f.target.files)==null?void 0:m[0])??null)},className:"text-xs text-zinc-300 file:mr-1 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-0.5 file:text-xs file:text-zinc-200"})]}),E.jsxs(Zt,{variant:"primary",onClick:h,disabled:c||!t||!i,children:[c?E.jsx(Fs,{className:"h-4 w-4 animate-spin"}):E.jsx($_,{className:"h-4 w-4"}),"Hochladen"]})]})]})}function g2({scans:i,models:e,dir:t,selectScan:r,deleteScan:a,prep:l}){return E.jsx("div",{className:"grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4",children:i.map(c=>{var x;const h=im(c,(e==null?void 0:e.pieces)??[]),d=c.dir===t,m=(l==null?void 0:l.state)==="running"&&l.dir===c.dir||((x=e==null?void 0:e.jobs)==null?void 0:x.prepare)===c.dir,g=m?["wird vorbereitet…","bg-sky-500/20 text-sky-300"]:{mesh:["Mesh bereit","bg-sky-500/15 text-sky-300"],done:["Fertig","bg-green-500/15 text-green-300"]}[h.stage],v=h.piece&&h.stage==="done";return E.jsxs("div",{onClick:()=>r(c),role:"button",tabIndex:0,onKeyDown:M=>{(M.key==="Enter"||M.key===" ")&&(M.preventDefault(),r(c))},className:`group relative flex cursor-pointer flex-col rounded-xl border p-2 text-left transition ${d?"border-sky-500 bg-sky-500/5":"border-zinc-800 hover:border-zinc-600"}`,children:[E.jsxs("div",{className:"relative mb-1.5 aspect-square overflow-hidden rounded-lg bg-zinc-950",children:[v?E.jsx("img",{src:`/api/scan/prepare/preview/${h.piece}/${h.variant}?kind=textured`,alt:`${ch(h.piece)} Vorschau`,className:"h-full w-full object-contain"}):E.jsx("div",{className:"grid h-full place-items-center text-zinc-700",children:E.jsx(Sm,{className:"h-8 w-8"})}),E.jsxs("span",{className:`absolute left-1 top-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${g[1]}`,children:[m&&E.jsx(Fs,{className:"h-3 w-3 animate-spin"}),g[0]]}),E.jsx("button",{onClick:M=>{M.stopPropagation(),a(c.dir)},title:"Delete scan folder",className:"absolute right-1 top-1 hidden rounded bg-zinc-900/80 p-1 text-zinc-400 hover:text-red-400 group-hover:block",children:E.jsx(Bo,{className:"h-3.5 w-3.5"})})]}),E.jsx("div",{className:"text-sm font-medium text-zinc-200",children:c.dir}),E.jsx("div",{className:"text-[11px] text-zinc-500",children:h.piece?`${ch(h.piece)}`:""})]},c.dir)})})}function v2({piece:i,variant:e,textured:t,onClose:r}){const[a,l]=B.useState(t);return B.useEffect(()=>{const c=h=>h.key==="Escape"&&r();return window.addEventListener("keydown",c),()=>window.removeEventListener("keydown",c)},[r]),E.jsx("div",{onClick:r,role:"button",tabIndex:0,onKeyDown:c=>{(c.key==="Enter"||c.key===" ")&&(c.preventDefault(),r())},className:"fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-6",children:E.jsxs("div",{onClick:c=>c.stopPropagation(),role:"presentation",onKeyDown:c=>c.stopPropagation(),className:"flex flex-col items-center gap-3",children:[E.jsx(l2,{piece:i,variant:e,textured:a,size:Math.min(720,window.innerHeight-160)}),E.jsxs("div",{className:"flex items-center gap-3 text-sm text-zinc-300",children:[E.jsxs("span",{className:"font-medium",children:[i,"/",e]}),E.jsx(Ay,{value:a?"textured":"clay",onChange:c=>l(c==="textured")}),E.jsx("span",{className:"text-xs text-zinc-500",children:"drag to rotate · scroll to zoom · Esc to close"})]})]})})}function x2({cur:i,busyPrep:e,prep:t}){return E.jsxs(E.Fragment,{children:[e&&E.jsxs("div",{className:"flex items-center gap-2 rounded-lg bg-sky-500/10 p-3 text-sm text-sky-300",children:[E.jsx(Fs,{className:"h-4 w-4 animate-spin"})," Piece is being prepared — about 1-3 min…"]}),(t==null?void 0:t.state)==="failed"&&E.jsxs("div",{className:"rounded-lg bg-red-500/10 p-3 text-sm text-red-300",children:[E.jsxs("div",{className:"flex items-center gap-2",children:[E.jsx(Em,{className:"h-4 w-4"})," Preparation failed."]}),t.log_tail&&E.jsx("pre",{className:"mt-1 whitespace-pre-wrap text-xs text-red-400/70",children:t.log_tail})]})]})}function _2({pieces:i,setView3d:e,deletePiece:t,prep:r,kind:a,setKind:l}){return i!=null&&i.length?E.jsxs("div",{className:"mt-4 border-t border-zinc-800 pt-3",children:[E.jsx("div",{className:"mb-2 text-xs font-medium text-zinc-400",children:"Finished pieces (synth_pieces/)"}),E.jsx("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",children:i.map(c=>{var d,f;const h=(r==null?void 0:r.state)==="running"&&r.piece===c.piece&&r.variant===c.variant;return E.jsxs("div",{className:"relative rounded-xl border border-zinc-800 bg-zinc-900/50 p-2",children:[E.jsxs("div",{className:"relative mb-2 aspect-square overflow-hidden rounded-lg bg-zinc-950",children:[c.has_preview?E.jsx("img",{src:`/api/scan/prepare/preview/${c.piece}/${c.variant}?kind=${a}`,alt:`${ch(c.piece)}`,className:"h-full w-full object-contain"}):E.jsx("div",{className:"grid h-full place-items-center text-zinc-700",children:E.jsx(J1,{className:"h-8 w-8"})}),E.jsx("button",{onClick:()=>e({piece:c.piece,variant:c.variant}),title:"Open 3D view",className:"absolute right-1 top-1 rounded bg-zinc-900/80 p-1 text-zinc-400 hover:text-white",children:E.jsx(tw,{className:"h-3.5 w-3.5"})})]}),E.jsxs("div",{className:"flex items-center justify-between",children:[E.jsxs("span",{className:"text-sm font-medium text-zinc-200",children:[ch(c.piece)," · ",c.variant]}),h&&E.jsx(Fs,{className:"h-3.5 w-3.5 animate-spin text-sky-400"})]}),E.jsx(Ay,{value:a,onChange:l,clayDisabled:!c.has_clay}),c.report&&E.jsx(y2,{piece:c.piece,variant:c.variant,report:c.report,level:(d=c.report)==null?void 0:d.level,messages:(f=c.report)==null?void 0:f.messages,onDelete:t})]},c.id)})})]}):null}function y2({piece:i,variant:e,report:t,level:r,messages:a,onDelete:l}){return!t||!t.tris?null:E.jsxs("div",{className:"mt-2 rounded-lg bg-zinc-800 p-2 text-[11px] text-zinc-400",children:[r&&E.jsxs("div",{className:`mb-1 flex items-center gap-1 font-medium ${r==="ok"?"text-green-400":"text-amber-400"}`,children:[r==="ok"?E.jsx(j_,{className:"h-4 w-4"}):E.jsx(Em,{className:"h-4 w-4"}),r==="ok"?"Quality OK":"Please check"]}),(a??[]).map((c,h)=>E.jsxs("div",{className:"text-amber-300/90",children:["• ",c]},h)),E.jsxs("div",{className:"grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pt-1",children:[E.jsx("span",{className:"text-zinc-500",children:"Triangles"}),E.jsx("span",{children:t.tris}),E.jsx("span",{className:"text-zinc-500",children:"open edges"}),E.jsx("span",{children:t.boundary_edges}),E.jsx("span",{className:"text-zinc-500",children:"Height/Base"}),E.jsx("span",{children:t.height_ratio})]}),E.jsxs("div",{className:"pt-1 text-zinc-500",children:["→ synth_pieces/",i,"/",e,".obj"]}),E.jsxs("button",{onClick:()=>l(i,e),className:"mt-1 flex items-center gap-1 text-red-400/80 hover:text-red-400",children:[E.jsx(Bo,{className:"h-3.5 w-3.5"})," Delete piece"]})]})}function Ay({value:i,onChange:e,clayDisabled:t}){return E.jsxs("div",{className:"mt-2 flex overflow-hidden rounded-lg border border-zinc-700 text-xs",children:[E.jsx("button",{onClick:()=>e("textured"),className:`px-3 py-1 ${i==="textured"?"bg-sky-600 text-white":"text-zinc-400 hover:bg-zinc-700"}`,children:"Textured"}),E.jsx("button",{onClick:()=>e("clay"),disabled:t,title:t?"no clay image (piece prepared before this update)":"geometry only",className:`px-3 py-1 ${i==="clay"?"bg-sky-600 text-white":"text-zinc-400 hover:bg-zinc-700"} ${t?"cursor-not-allowed opacity-40":""}`,children:"Clay"})]})}const S2=[{to:"/collect",label:"Collect",icon:Sm},{to:"/scan",label:"Scan",icon:j1},{to:"/datasets",label:"Datasets",icon:Q1},{to:"/training",label:"Training",icon:$1}],M2=({isActive:i})=>`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${i?"bg-zinc-800 text-zinc-100":"text-zinc-400 hover:text-zinc-100"}`;function E2(){return E.jsx(A1,{children:E.jsxs("div",{className:"min-h-full",children:[E.jsx("header",{className:"sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur",children:E.jsxs("div",{className:"mx-auto flex max-w-7xl items-center gap-6 px-5 py-3",children:[E.jsxs("div",{className:"flex items-center gap-2 font-semibold tracking-tight",children:[E.jsx(K1,{className:"h-5 w-5 text-sky-400"})," chesslab"]}),E.jsx("nav",{className:"flex flex-wrap gap-1",children:S2.map(i=>{const e=i.icon;return E.jsxs(fo,{to:i.to,className:M2,children:[E.jsx(e,{className:"h-4 w-4"})," ",i.label]},i.to)})})]})}),E.jsx("main",{className:"mx-auto max-w-7xl px-5 py-6",children:E.jsxs(r1,{children:[E.jsx(Xi,{path:"/",element:E.jsx(af,{to:"/collect",replace:!0})}),E.jsx(Xi,{path:"/collect",element:E.jsx(cw,{})}),E.jsx(Xi,{path:"/scan",element:E.jsx(p2,{})}),E.jsxs(Xi,{path:"/datasets",element:E.jsx(hw,{}),children:[E.jsx(Xi,{index:!0,element:E.jsx(af,{to:"sessions",replace:!0})}),E.jsx(Xi,{path:"sessions",element:E.jsx(dw,{})}),E.jsx(Xi,{path:"curated",element:E.jsx(fw,{})}),E.jsx(Xi,{path:"stats",element:E.jsx(pw,{})})]}),E.jsx(Xi,{path:"/training",element:E.jsx(mw,{})}),E.jsx(Xi,{path:"*",element:E.jsx(af,{to:"/collect",replace:!0})})]})})]})})}const w2=new WM({defaultOptions:{queries:{staleTime:0,refetchOnWindowFocus:!0,refetchOnMount:"always",retry:1}}});xM.createRoot(document.getElementById("root")).render(E.jsx(dM.StrictMode,{children:E.jsx(jM,{client:w2,children:E.jsx(E2,{})})}));
