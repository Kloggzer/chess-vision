var cv=i=>{throw TypeError(i)};var Qh=(i,e,t)=>e.has(i)||cv("Cannot "+t);var V=(i,e,t)=>(Qh(i,e,"read from private field"),t?t.call(i):e.get(i)),rt=(i,e,t)=>e.has(i)?cv("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(i):e.set(i,t),Be=(i,e,t,r)=>(Qh(i,e,"write to private field"),r?r.call(i,t):e.set(i,t),t),mt=(i,e,t)=>(Qh(i,e,"access private method"),t);var lu=(i,e,t,r)=>({set _(a){Be(i,e,a,t)},get _(){return V(i,e,r)}});(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))r(a);new MutationObserver(a=>{for(const l of a)if(l.type==="childList")for(const c of l.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&r(c)}).observe(document,{childList:!0,subtree:!0});function t(a){const l={};return a.integrity&&(l.integrity=a.integrity),a.referrerPolicy&&(l.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?l.credentials="include":a.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function r(a){if(a.ep)return;a.ep=!0;const l=t(a);fetch(a.href,l)}})();function cM(i){return i&&i.__esModule&&Object.prototype.hasOwnProperty.call(i,"default")?i.default:i}var Zh={exports:{}},wl={},Jh={exports:{}},St={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var uv;function uM(){if(uv)return St;uv=1;var i=Symbol.for("react.element"),e=Symbol.for("react.portal"),t=Symbol.for("react.fragment"),r=Symbol.for("react.strict_mode"),a=Symbol.for("react.profiler"),l=Symbol.for("react.provider"),c=Symbol.for("react.context"),d=Symbol.for("react.forward_ref"),h=Symbol.for("react.suspense"),f=Symbol.for("react.memo"),m=Symbol.for("react.lazy"),g=Symbol.iterator;function v(k){return k===null||typeof k!="object"?null:(k=g&&k[g]||k["@@iterator"],typeof k=="function"?k:null)}var S={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},E=Object.assign,w={};function x(k,X,Fe){this.props=k,this.context=X,this.refs=w,this.updater=Fe||S}x.prototype.isReactComponent={},x.prototype.setState=function(k,X){if(typeof k!="object"&&typeof k!="function"&&k!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,k,X,"setState")},x.prototype.forceUpdate=function(k){this.updater.enqueueForceUpdate(this,k,"forceUpdate")};function y(){}y.prototype=x.prototype;function N(k,X,Fe){this.props=k,this.context=X,this.refs=w,this.updater=Fe||S}var P=N.prototype=new y;P.constructor=N,E(P,x.prototype),P.isPureReactComponent=!0;var C=Array.isArray,D=Object.prototype.hasOwnProperty,L={current:null},F={key:!0,ref:!0,__self:!0,__source:!0};function T(k,X,Fe){var je,Ge={},de=null,Se=null;if(X!=null)for(je in X.ref!==void 0&&(Se=X.ref),X.key!==void 0&&(de=""+X.key),X)D.call(X,je)&&!F.hasOwnProperty(je)&&(Ge[je]=X[je]);var xe=arguments.length-2;if(xe===1)Ge.children=Fe;else if(1<xe){for(var te=Array(xe),Ue=0;Ue<xe;Ue++)te[Ue]=arguments[Ue+2];Ge.children=te}if(k&&k.defaultProps)for(je in xe=k.defaultProps,xe)Ge[je]===void 0&&(Ge[je]=xe[je]);return{$$typeof:i,type:k,key:de,ref:Se,props:Ge,_owner:L.current}}function I(k,X){return{$$typeof:i,type:k.type,key:X,ref:k.ref,props:k.props,_owner:k._owner}}function G(k){return typeof k=="object"&&k!==null&&k.$$typeof===i}function H(k){var X={"=":"=0",":":"=2"};return"$"+k.replace(/[=:]/g,function(Fe){return X[Fe]})}var K=/\/+/g;function re(k,X){return typeof k=="object"&&k!==null&&k.key!=null?H(""+k.key):X.toString(36)}function fe(k,X,Fe,je,Ge){var de=typeof k;(de==="undefined"||de==="boolean")&&(k=null);var Se=!1;if(k===null)Se=!0;else switch(de){case"string":case"number":Se=!0;break;case"object":switch(k.$$typeof){case i:case e:Se=!0}}if(Se)return Se=k,Ge=Ge(Se),k=je===""?"."+re(Se,0):je,C(Ge)?(Fe="",k!=null&&(Fe=k.replace(K,"$&/")+"/"),fe(Ge,X,Fe,"",function(Ue){return Ue})):Ge!=null&&(G(Ge)&&(Ge=I(Ge,Fe+(!Ge.key||Se&&Se.key===Ge.key?"":(""+Ge.key).replace(K,"$&/")+"/")+k)),X.push(Ge)),1;if(Se=0,je=je===""?".":je+":",C(k))for(var xe=0;xe<k.length;xe++){de=k[xe];var te=je+re(de,xe);Se+=fe(de,X,Fe,te,Ge)}else if(te=v(k),typeof te=="function")for(k=te.call(k),xe=0;!(de=k.next()).done;)de=de.value,te=je+re(de,xe++),Se+=fe(de,X,Fe,te,Ge);else if(de==="object")throw X=String(k),Error("Objects are not valid as a React child (found: "+(X==="[object Object]"?"object with keys {"+Object.keys(k).join(", ")+"}":X)+"). If you meant to render a collection of children, use an array instead.");return Se}function O(k,X,Fe){if(k==null)return k;var je=[],Ge=0;return fe(k,je,"","",function(de){return X.call(Fe,de,Ge++)}),je}function ce(k){if(k._status===-1){var X=k._result;X=X(),X.then(function(Fe){(k._status===0||k._status===-1)&&(k._status=1,k._result=Fe)},function(Fe){(k._status===0||k._status===-1)&&(k._status=2,k._result=Fe)}),k._status===-1&&(k._status=0,k._result=X)}if(k._status===1)return k._result.default;throw k._result}var Z={current:null},q={transition:null},ue={ReactCurrentDispatcher:Z,ReactCurrentBatchConfig:q,ReactCurrentOwner:L};function he(){throw Error("act(...) is not supported in production builds of React.")}return St.Children={map:O,forEach:function(k,X,Fe){O(k,function(){X.apply(this,arguments)},Fe)},count:function(k){var X=0;return O(k,function(){X++}),X},toArray:function(k){return O(k,function(X){return X})||[]},only:function(k){if(!G(k))throw Error("React.Children.only expected to receive a single React element child.");return k}},St.Component=x,St.Fragment=t,St.Profiler=a,St.PureComponent=N,St.StrictMode=r,St.Suspense=h,St.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=ue,St.act=he,St.cloneElement=function(k,X,Fe){if(k==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+k+".");var je=E({},k.props),Ge=k.key,de=k.ref,Se=k._owner;if(X!=null){if(X.ref!==void 0&&(de=X.ref,Se=L.current),X.key!==void 0&&(Ge=""+X.key),k.type&&k.type.defaultProps)var xe=k.type.defaultProps;for(te in X)D.call(X,te)&&!F.hasOwnProperty(te)&&(je[te]=X[te]===void 0&&xe!==void 0?xe[te]:X[te])}var te=arguments.length-2;if(te===1)je.children=Fe;else if(1<te){xe=Array(te);for(var Ue=0;Ue<te;Ue++)xe[Ue]=arguments[Ue+2];je.children=xe}return{$$typeof:i,type:k.type,key:Ge,ref:de,props:je,_owner:Se}},St.createContext=function(k){return k={$$typeof:c,_currentValue:k,_currentValue2:k,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},k.Provider={$$typeof:l,_context:k},k.Consumer=k},St.createElement=T,St.createFactory=function(k){var X=T.bind(null,k);return X.type=k,X},St.createRef=function(){return{current:null}},St.forwardRef=function(k){return{$$typeof:d,render:k}},St.isValidElement=G,St.lazy=function(k){return{$$typeof:m,_payload:{_status:-1,_result:k},_init:ce}},St.memo=function(k,X){return{$$typeof:f,type:k,compare:X===void 0?null:X}},St.startTransition=function(k){var X=q.transition;q.transition={};try{k()}finally{q.transition=X}},St.unstable_act=he,St.useCallback=function(k,X){return Z.current.useCallback(k,X)},St.useContext=function(k){return Z.current.useContext(k)},St.useDebugValue=function(){},St.useDeferredValue=function(k){return Z.current.useDeferredValue(k)},St.useEffect=function(k,X){return Z.current.useEffect(k,X)},St.useId=function(){return Z.current.useId()},St.useImperativeHandle=function(k,X,Fe){return Z.current.useImperativeHandle(k,X,Fe)},St.useInsertionEffect=function(k,X){return Z.current.useInsertionEffect(k,X)},St.useLayoutEffect=function(k,X){return Z.current.useLayoutEffect(k,X)},St.useMemo=function(k,X){return Z.current.useMemo(k,X)},St.useReducer=function(k,X,Fe){return Z.current.useReducer(k,X,Fe)},St.useRef=function(k){return Z.current.useRef(k)},St.useState=function(k){return Z.current.useState(k)},St.useSyncExternalStore=function(k,X,Fe){return Z.current.useSyncExternalStore(k,X,Fe)},St.useTransition=function(){return Z.current.useTransition()},St.version="18.3.1",St}var dv;function sm(){return dv||(dv=1,Jh.exports=uM()),Jh.exports}/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var hv;function dM(){if(hv)return wl;hv=1;var i=sm(),e=Symbol.for("react.element"),t=Symbol.for("react.fragment"),r=Object.prototype.hasOwnProperty,a=i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,l={key:!0,ref:!0,__self:!0,__source:!0};function c(d,h,f){var m,g={},v=null,S=null;f!==void 0&&(v=""+f),h.key!==void 0&&(v=""+h.key),h.ref!==void 0&&(S=h.ref);for(m in h)r.call(h,m)&&!l.hasOwnProperty(m)&&(g[m]=h[m]);if(d&&d.defaultProps)for(m in h=d.defaultProps,h)g[m]===void 0&&(g[m]=h[m]);return{$$typeof:e,type:d,key:v,ref:S,props:g,_owner:a.current}}return wl.Fragment=t,wl.jsx=c,wl.jsxs=c,wl}var fv;function hM(){return fv||(fv=1,Zh.exports=dM()),Zh.exports}var M=hM(),B=sm();const fM=cM(B);var cu={},ef={exports:{}},ai={},tf={exports:{}},nf={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var pv;function pM(){return pv||(pv=1,(function(i){function e(q,ue){var he=q.length;q.push(ue);e:for(;0<he;){var k=he-1>>>1,X=q[k];if(0<a(X,ue))q[k]=ue,q[he]=X,he=k;else break e}}function t(q){return q.length===0?null:q[0]}function r(q){if(q.length===0)return null;var ue=q[0],he=q.pop();if(he!==ue){q[0]=he;e:for(var k=0,X=q.length,Fe=X>>>1;k<Fe;){var je=2*(k+1)-1,Ge=q[je],de=je+1,Se=q[de];if(0>a(Ge,he))de<X&&0>a(Se,Ge)?(q[k]=Se,q[de]=he,k=de):(q[k]=Ge,q[je]=he,k=je);else if(de<X&&0>a(Se,he))q[k]=Se,q[de]=he,k=de;else break e}}return ue}function a(q,ue){var he=q.sortIndex-ue.sortIndex;return he!==0?he:q.id-ue.id}if(typeof performance=="object"&&typeof performance.now=="function"){var l=performance;i.unstable_now=function(){return l.now()}}else{var c=Date,d=c.now();i.unstable_now=function(){return c.now()-d}}var h=[],f=[],m=1,g=null,v=3,S=!1,E=!1,w=!1,x=typeof setTimeout=="function"?setTimeout:null,y=typeof clearTimeout=="function"?clearTimeout:null,N=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function P(q){for(var ue=t(f);ue!==null;){if(ue.callback===null)r(f);else if(ue.startTime<=q)r(f),ue.sortIndex=ue.expirationTime,e(h,ue);else break;ue=t(f)}}function C(q){if(w=!1,P(q),!E)if(t(h)!==null)E=!0,ce(D);else{var ue=t(f);ue!==null&&Z(C,ue.startTime-q)}}function D(q,ue){E=!1,w&&(w=!1,y(T),T=-1),S=!0;var he=v;try{for(P(ue),g=t(h);g!==null&&(!(g.expirationTime>ue)||q&&!H());){var k=g.callback;if(typeof k=="function"){g.callback=null,v=g.priorityLevel;var X=k(g.expirationTime<=ue);ue=i.unstable_now(),typeof X=="function"?g.callback=X:g===t(h)&&r(h),P(ue)}else r(h);g=t(h)}if(g!==null)var Fe=!0;else{var je=t(f);je!==null&&Z(C,je.startTime-ue),Fe=!1}return Fe}finally{g=null,v=he,S=!1}}var L=!1,F=null,T=-1,I=5,G=-1;function H(){return!(i.unstable_now()-G<I)}function K(){if(F!==null){var q=i.unstable_now();G=q;var ue=!0;try{ue=F(!0,q)}finally{ue?re():(L=!1,F=null)}}else L=!1}var re;if(typeof N=="function")re=function(){N(K)};else if(typeof MessageChannel<"u"){var fe=new MessageChannel,O=fe.port2;fe.port1.onmessage=K,re=function(){O.postMessage(null)}}else re=function(){x(K,0)};function ce(q){F=q,L||(L=!0,re())}function Z(q,ue){T=x(function(){q(i.unstable_now())},ue)}i.unstable_IdlePriority=5,i.unstable_ImmediatePriority=1,i.unstable_LowPriority=4,i.unstable_NormalPriority=3,i.unstable_Profiling=null,i.unstable_UserBlockingPriority=2,i.unstable_cancelCallback=function(q){q.callback=null},i.unstable_continueExecution=function(){E||S||(E=!0,ce(D))},i.unstable_forceFrameRate=function(q){0>q||125<q?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):I=0<q?Math.floor(1e3/q):5},i.unstable_getCurrentPriorityLevel=function(){return v},i.unstable_getFirstCallbackNode=function(){return t(h)},i.unstable_next=function(q){switch(v){case 1:case 2:case 3:var ue=3;break;default:ue=v}var he=v;v=ue;try{return q()}finally{v=he}},i.unstable_pauseExecution=function(){},i.unstable_requestPaint=function(){},i.unstable_runWithPriority=function(q,ue){switch(q){case 1:case 2:case 3:case 4:case 5:break;default:q=3}var he=v;v=q;try{return ue()}finally{v=he}},i.unstable_scheduleCallback=function(q,ue,he){var k=i.unstable_now();switch(typeof he=="object"&&he!==null?(he=he.delay,he=typeof he=="number"&&0<he?k+he:k):he=k,q){case 1:var X=-1;break;case 2:X=250;break;case 5:X=1073741823;break;case 4:X=1e4;break;default:X=5e3}return X=he+X,q={id:m++,callback:ue,priorityLevel:q,startTime:he,expirationTime:X,sortIndex:-1},he>k?(q.sortIndex=he,e(f,q),t(h)===null&&q===t(f)&&(w?(y(T),T=-1):w=!0,Z(C,he-k))):(q.sortIndex=X,e(h,q),E||S||(E=!0,ce(D))),q},i.unstable_shouldYield=H,i.unstable_wrapCallback=function(q){var ue=v;return function(){var he=v;v=ue;try{return q.apply(this,arguments)}finally{v=he}}}})(nf)),nf}var mv;function mM(){return mv||(mv=1,tf.exports=pM()),tf.exports}/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var gv;function gM(){if(gv)return ai;gv=1;var i=sm(),e=mM();function t(n){for(var s="https://reactjs.org/docs/error-decoder.html?invariant="+n,o=1;o<arguments.length;o++)s+="&args[]="+encodeURIComponent(arguments[o]);return"Minified React error #"+n+"; visit "+s+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var r=new Set,a={};function l(n,s){c(n,s),c(n+"Capture",s)}function c(n,s){for(a[n]=s,n=0;n<s.length;n++)r.add(s[n])}var d=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),h=Object.prototype.hasOwnProperty,f=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,m={},g={};function v(n){return h.call(g,n)?!0:h.call(m,n)?!1:f.test(n)?g[n]=!0:(m[n]=!0,!1)}function S(n,s,o,u){if(o!==null&&o.type===0)return!1;switch(typeof s){case"function":case"symbol":return!0;case"boolean":return u?!1:o!==null?!o.acceptsBooleans:(n=n.toLowerCase().slice(0,5),n!=="data-"&&n!=="aria-");default:return!1}}function E(n,s,o,u){if(s===null||typeof s>"u"||S(n,s,o,u))return!0;if(u)return!1;if(o!==null)switch(o.type){case 3:return!s;case 4:return s===!1;case 5:return isNaN(s);case 6:return isNaN(s)||1>s}return!1}function w(n,s,o,u,p,_,R){this.acceptsBooleans=s===2||s===3||s===4,this.attributeName=u,this.attributeNamespace=p,this.mustUseProperty=o,this.propertyName=n,this.type=s,this.sanitizeURL=_,this.removeEmptyString=R}var x={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(n){x[n]=new w(n,0,!1,n,null,!1,!1)}),[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(n){var s=n[0];x[s]=new w(s,1,!1,n[1],null,!1,!1)}),["contentEditable","draggable","spellCheck","value"].forEach(function(n){x[n]=new w(n,2,!1,n.toLowerCase(),null,!1,!1)}),["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(n){x[n]=new w(n,2,!1,n,null,!1,!1)}),"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(n){x[n]=new w(n,3,!1,n.toLowerCase(),null,!1,!1)}),["checked","multiple","muted","selected"].forEach(function(n){x[n]=new w(n,3,!0,n,null,!1,!1)}),["capture","download"].forEach(function(n){x[n]=new w(n,4,!1,n,null,!1,!1)}),["cols","rows","size","span"].forEach(function(n){x[n]=new w(n,6,!1,n,null,!1,!1)}),["rowSpan","start"].forEach(function(n){x[n]=new w(n,5,!1,n.toLowerCase(),null,!1,!1)});var y=/[\-:]([a-z])/g;function N(n){return n[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(n){var s=n.replace(y,N);x[s]=new w(s,1,!1,n,null,!1,!1)}),"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(n){var s=n.replace(y,N);x[s]=new w(s,1,!1,n,"http://www.w3.org/1999/xlink",!1,!1)}),["xml:base","xml:lang","xml:space"].forEach(function(n){var s=n.replace(y,N);x[s]=new w(s,1,!1,n,"http://www.w3.org/XML/1998/namespace",!1,!1)}),["tabIndex","crossOrigin"].forEach(function(n){x[n]=new w(n,1,!1,n.toLowerCase(),null,!1,!1)}),x.xlinkHref=new w("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1),["src","href","action","formAction"].forEach(function(n){x[n]=new w(n,1,!1,n.toLowerCase(),null,!0,!0)});function P(n,s,o,u){var p=x.hasOwnProperty(s)?x[s]:null;(p!==null?p.type!==0:u||!(2<s.length)||s[0]!=="o"&&s[0]!=="O"||s[1]!=="n"&&s[1]!=="N")&&(E(s,o,p,u)&&(o=null),u||p===null?v(s)&&(o===null?n.removeAttribute(s):n.setAttribute(s,""+o)):p.mustUseProperty?n[p.propertyName]=o===null?p.type===3?!1:"":o:(s=p.attributeName,u=p.attributeNamespace,o===null?n.removeAttribute(s):(p=p.type,o=p===3||p===4&&o===!0?"":""+o,u?n.setAttributeNS(u,s,o):n.setAttribute(s,o))))}var C=i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,D=Symbol.for("react.element"),L=Symbol.for("react.portal"),F=Symbol.for("react.fragment"),T=Symbol.for("react.strict_mode"),I=Symbol.for("react.profiler"),G=Symbol.for("react.provider"),H=Symbol.for("react.context"),K=Symbol.for("react.forward_ref"),re=Symbol.for("react.suspense"),fe=Symbol.for("react.suspense_list"),O=Symbol.for("react.memo"),ce=Symbol.for("react.lazy"),Z=Symbol.for("react.offscreen"),q=Symbol.iterator;function ue(n){return n===null||typeof n!="object"?null:(n=q&&n[q]||n["@@iterator"],typeof n=="function"?n:null)}var he=Object.assign,k;function X(n){if(k===void 0)try{throw Error()}catch(o){var s=o.stack.trim().match(/\n( *(at )?)/);k=s&&s[1]||""}return`
`+k+n}var Fe=!1;function je(n,s){if(!n||Fe)return"";Fe=!0;var o=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(s)if(s=function(){throw Error()},Object.defineProperty(s.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(s,[])}catch(me){var u=me}Reflect.construct(n,[],s)}else{try{s.call()}catch(me){u=me}n.call(s.prototype)}else{try{throw Error()}catch(me){u=me}n()}}catch(me){if(me&&u&&typeof me.stack=="string"){for(var p=me.stack.split(`
`),_=u.stack.split(`
`),R=p.length-1,z=_.length-1;1<=R&&0<=z&&p[R]!==_[z];)z--;for(;1<=R&&0<=z;R--,z--)if(p[R]!==_[z]){if(R!==1||z!==1)do if(R--,z--,0>z||p[R]!==_[z]){var W=`
`+p[R].replace(" at new "," at ");return n.displayName&&W.includes("<anonymous>")&&(W=W.replace("<anonymous>",n.displayName)),W}while(1<=R&&0<=z);break}}}finally{Fe=!1,Error.prepareStackTrace=o}return(n=n?n.displayName||n.name:"")?X(n):""}function Ge(n){switch(n.tag){case 5:return X(n.type);case 16:return X("Lazy");case 13:return X("Suspense");case 19:return X("SuspenseList");case 0:case 2:case 15:return n=je(n.type,!1),n;case 11:return n=je(n.type.render,!1),n;case 1:return n=je(n.type,!0),n;default:return""}}function de(n){if(n==null)return null;if(typeof n=="function")return n.displayName||n.name||null;if(typeof n=="string")return n;switch(n){case F:return"Fragment";case L:return"Portal";case I:return"Profiler";case T:return"StrictMode";case re:return"Suspense";case fe:return"SuspenseList"}if(typeof n=="object")switch(n.$$typeof){case H:return(n.displayName||"Context")+".Consumer";case G:return(n._context.displayName||"Context")+".Provider";case K:var s=n.render;return n=n.displayName,n||(n=s.displayName||s.name||"",n=n!==""?"ForwardRef("+n+")":"ForwardRef"),n;case O:return s=n.displayName||null,s!==null?s:de(n.type)||"Memo";case ce:s=n._payload,n=n._init;try{return de(n(s))}catch{}}return null}function Se(n){var s=n.type;switch(n.tag){case 24:return"Cache";case 9:return(s.displayName||"Context")+".Consumer";case 10:return(s._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return n=s.render,n=n.displayName||n.name||"",s.displayName||(n!==""?"ForwardRef("+n+")":"ForwardRef");case 7:return"Fragment";case 5:return s;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return de(s);case 8:return s===T?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof s=="function")return s.displayName||s.name||null;if(typeof s=="string")return s}return null}function xe(n){switch(typeof n){case"boolean":case"number":case"string":case"undefined":return n;case"object":return n;default:return""}}function te(n){var s=n.type;return(n=n.nodeName)&&n.toLowerCase()==="input"&&(s==="checkbox"||s==="radio")}function Ue(n){var s=te(n)?"checked":"value",o=Object.getOwnPropertyDescriptor(n.constructor.prototype,s),u=""+n[s];if(!n.hasOwnProperty(s)&&typeof o<"u"&&typeof o.get=="function"&&typeof o.set=="function"){var p=o.get,_=o.set;return Object.defineProperty(n,s,{configurable:!0,get:function(){return p.call(this)},set:function(R){u=""+R,_.call(this,R)}}),Object.defineProperty(n,s,{enumerable:o.enumerable}),{getValue:function(){return u},setValue:function(R){u=""+R},stopTracking:function(){n._valueTracker=null,delete n[s]}}}}function tt(n){n._valueTracker||(n._valueTracker=Ue(n))}function Dt(n){if(!n)return!1;var s=n._valueTracker;if(!s)return!0;var o=s.getValue(),u="";return n&&(u=te(n)?n.checked?"true":"false":n.value),n=u,n!==o?(s.setValue(n),!0):!1}function ct(n){if(n=n||(typeof document<"u"?document:void 0),typeof n>"u")return null;try{return n.activeElement||n.body}catch{return n.body}}function At(n,s){var o=s.checked;return he({},s,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:o??n._wrapperState.initialChecked})}function Et(n,s){var o=s.defaultValue==null?"":s.defaultValue,u=s.checked!=null?s.checked:s.defaultChecked;o=xe(s.value!=null?s.value:o),n._wrapperState={initialChecked:u,initialValue:o,controlled:s.type==="checkbox"||s.type==="radio"?s.checked!=null:s.value!=null}}function _t(n,s){s=s.checked,s!=null&&P(n,"checked",s,!1)}function Wt(n,s){_t(n,s);var o=xe(s.value),u=s.type;if(o!=null)u==="number"?(o===0&&n.value===""||n.value!=o)&&(n.value=""+o):n.value!==""+o&&(n.value=""+o);else if(u==="submit"||u==="reset"){n.removeAttribute("value");return}s.hasOwnProperty("value")?Jt(n,s.type,o):s.hasOwnProperty("defaultValue")&&Jt(n,s.type,xe(s.defaultValue)),s.checked==null&&s.defaultChecked!=null&&(n.defaultChecked=!!s.defaultChecked)}function $t(n,s,o){if(s.hasOwnProperty("value")||s.hasOwnProperty("defaultValue")){var u=s.type;if(!(u!=="submit"&&u!=="reset"||s.value!==void 0&&s.value!==null))return;s=""+n._wrapperState.initialValue,o||s===n.value||(n.value=s),n.defaultValue=s}o=n.name,o!==""&&(n.name=""),n.defaultChecked=!!n._wrapperState.initialChecked,o!==""&&(n.name=o)}function Jt(n,s,o){(s!=="number"||ct(n.ownerDocument)!==n)&&(o==null?n.defaultValue=""+n._wrapperState.initialValue:n.defaultValue!==""+o&&(n.defaultValue=""+o))}var qt=Array.isArray;function wt(n,s,o,u){if(n=n.options,s){s={};for(var p=0;p<o.length;p++)s["$"+o[p]]=!0;for(o=0;o<n.length;o++)p=s.hasOwnProperty("$"+n[o].value),n[o].selected!==p&&(n[o].selected=p),p&&u&&(n[o].defaultSelected=!0)}else{for(o=""+xe(o),s=null,p=0;p<n.length;p++){if(n[p].value===o){n[p].selected=!0,u&&(n[p].defaultSelected=!0);return}s!==null||n[p].disabled||(s=n[p])}s!==null&&(s.selected=!0)}}function Gt(n,s){if(s.dangerouslySetInnerHTML!=null)throw Error(t(91));return he({},s,{value:void 0,defaultValue:void 0,children:""+n._wrapperState.initialValue})}function Y(n,s){var o=s.value;if(o==null){if(o=s.children,s=s.defaultValue,o!=null){if(s!=null)throw Error(t(92));if(qt(o)){if(1<o.length)throw Error(t(93));o=o[0]}s=o}s==null&&(s=""),o=s}n._wrapperState={initialValue:xe(o)}}function xn(n,s){var o=xe(s.value),u=xe(s.defaultValue);o!=null&&(o=""+o,o!==n.value&&(n.value=o),s.defaultValue==null&&n.defaultValue!==o&&(n.defaultValue=o)),u!=null&&(n.defaultValue=""+u)}function Ct(n){var s=n.textContent;s===n._wrapperState.initialValue&&s!==""&&s!==null&&(n.value=s)}function U(n){switch(n){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function b(n,s){return n==null||n==="http://www.w3.org/1999/xhtml"?U(s):n==="http://www.w3.org/2000/svg"&&s==="foreignObject"?"http://www.w3.org/1999/xhtml":n}var J,se=(function(n){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(s,o,u,p){MSApp.execUnsafeLocalFunction(function(){return n(s,o,u,p)})}:n})(function(n,s){if(n.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in n)n.innerHTML=s;else{for(J=J||document.createElement("div"),J.innerHTML="<svg>"+s.valueOf().toString()+"</svg>",s=J.firstChild;n.firstChild;)n.removeChild(n.firstChild);for(;s.firstChild;)n.appendChild(s.firstChild)}});function ge(n,s){if(s){var o=n.firstChild;if(o&&o===n.lastChild&&o.nodeType===3){o.nodeValue=s;return}}n.textContent=s}var Te={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},Ae=["Webkit","ms","Moz","O"];Object.keys(Te).forEach(function(n){Ae.forEach(function(s){s=s+n.charAt(0).toUpperCase()+n.substring(1),Te[s]=Te[n]})});function ve(n,s,o){return s==null||typeof s=="boolean"||s===""?"":o||typeof s!="number"||s===0||Te.hasOwnProperty(n)&&Te[n]?(""+s).trim():s+"px"}function _e(n,s){n=n.style;for(var o in s)if(s.hasOwnProperty(o)){var u=o.indexOf("--")===0,p=ve(o,s[o],u);o==="float"&&(o="cssFloat"),u?n.setProperty(o,p):n[o]=p}}var Ie=he({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function Xe(n,s){if(s){if(Ie[n]&&(s.children!=null||s.dangerouslySetInnerHTML!=null))throw Error(t(137,n));if(s.dangerouslySetInnerHTML!=null){if(s.children!=null)throw Error(t(60));if(typeof s.dangerouslySetInnerHTML!="object"||!("__html"in s.dangerouslySetInnerHTML))throw Error(t(61))}if(s.style!=null&&typeof s.style!="object")throw Error(t(62))}}function ne(n,s){if(n.indexOf("-")===-1)return typeof s.is=="string";switch(n){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Me=null;function ke(n){return n=n.target||n.srcElement||window,n.correspondingUseElement&&(n=n.correspondingUseElement),n.nodeType===3?n.parentNode:n}var nt=null,st=null,j=null;function Ne(n){if(n=cl(n)){if(typeof nt!="function")throw Error(t(280));var s=n.stateNode;s&&(s=Ec(s),nt(n.stateNode,n.type,s))}}function ye(n){st?j?j.push(n):j=[n]:st=n}function De(){if(st){var n=st,s=j;if(j=st=null,Ne(n),s)for(n=0;n<s.length;n++)Ne(s[n])}}function Oe(n,s){return n(s)}function Ee(){}var Ke=!1;function qe(n,s,o){if(Ke)return n(s,o);Ke=!0;try{return Oe(n,s,o)}finally{Ke=!1,(st!==null||j!==null)&&(Ee(),De())}}function Ht(n,s){var o=n.stateNode;if(o===null)return null;var u=Ec(o);if(u===null)return null;o=u[s];e:switch(s){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(u=!u.disabled)||(n=n.type,u=!(n==="button"||n==="input"||n==="select"||n==="textarea")),n=!u;break e;default:n=!1}if(n)return null;if(o&&typeof o!="function")throw Error(t(231,s,typeof o));return o}var It=!1;if(d)try{var Fn={};Object.defineProperty(Fn,"passive",{get:function(){It=!0}}),window.addEventListener("test",Fn,Fn),window.removeEventListener("test",Fn,Fn)}catch{It=!1}function wi(n,s,o,u,p,_,R,z,W){var me=Array.prototype.slice.call(arguments,3);try{s.apply(o,me)}catch(be){this.onError(be)}}var ks=!1,wa=null,zs=!1,Bs=null,yd={onError:function(n){ks=!0,wa=n}};function sc(n,s,o,u,p,_,R,z,W){ks=!1,wa=null,wi.apply(yd,arguments)}function ac(n,s,o,u,p,_,R,z,W){if(sc.apply(this,arguments),ks){if(ks){var me=wa;ks=!1,wa=null}else throw Error(t(198));zs||(zs=!0,Bs=me)}}function Xn(n){var s=n,o=n;if(n.alternate)for(;s.return;)s=s.return;else{n=s;do s=n,(s.flags&4098)!==0&&(o=s.return),n=s.return;while(n)}return s.tag===3?o:null}function Ta(n){if(n.tag===13){var s=n.memoizedState;if(s===null&&(n=n.alternate,n!==null&&(s=n.memoizedState)),s!==null)return s.dehydrated}return null}function Go(n){if(Xn(n)!==n)throw Error(t(188))}function oc(n){var s=n.alternate;if(!s){if(s=Xn(n),s===null)throw Error(t(188));return s!==n?null:n}for(var o=n,u=s;;){var p=o.return;if(p===null)break;var _=p.alternate;if(_===null){if(u=p.return,u!==null){o=u;continue}break}if(p.child===_.child){for(_=p.child;_;){if(_===o)return Go(p),n;if(_===u)return Go(p),s;_=_.sibling}throw Error(t(188))}if(o.return!==u.return)o=p,u=_;else{for(var R=!1,z=p.child;z;){if(z===o){R=!0,o=p,u=_;break}if(z===u){R=!0,u=p,o=_;break}z=z.sibling}if(!R){for(z=_.child;z;){if(z===o){R=!0,o=_,u=p;break}if(z===u){R=!0,u=_,o=p;break}z=z.sibling}if(!R)throw Error(t(189))}}if(o.alternate!==u)throw Error(t(190))}if(o.tag!==3)throw Error(t(188));return o.stateNode.current===o?n:s}function Hs(n){return n=oc(n),n!==null?Wo(n):null}function Wo(n){if(n.tag===5||n.tag===6)return n;for(n=n.child;n!==null;){var s=Wo(n);if(s!==null)return s;n=n.sibling}return null}var Vs=e.unstable_scheduleCallback,jo=e.unstable_cancelCallback,lc=e.unstable_shouldYield,Sd=e.unstable_requestPaint,sn=e.unstable_now,Md=e.unstable_getCurrentPriorityLevel,Xo=e.unstable_ImmediatePriority,A=e.unstable_UserBlockingPriority,Q=e.unstable_NormalPriority,pe=e.unstable_LowPriority,oe=e.unstable_IdlePriority,ae=null,Le=null;function We(n){if(Le&&typeof Le.onCommitFiberRoot=="function")try{Le.onCommitFiberRoot(ae,n,void 0,(n.current.flags&128)===128)}catch{}}var Pe=Math.clz32?Math.clz32:ht,Qe=Math.log,it=Math.LN2;function ht(n){return n>>>=0,n===0?32:31-(Qe(n)/it|0)|0}var ft=64,Je=4194304;function Rt(n){switch(n&-n){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return n&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return n&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return n}}function jt(n,s){var o=n.pendingLanes;if(o===0)return 0;var u=0,p=n.suspendedLanes,_=n.pingedLanes,R=o&268435455;if(R!==0){var z=R&~p;z!==0?u=Rt(z):(_&=R,_!==0&&(u=Rt(_)))}else R=o&~p,R!==0?u=Rt(R):_!==0&&(u=Rt(_));if(u===0)return 0;if(s!==0&&s!==u&&(s&p)===0&&(p=u&-u,_=s&-s,p>=_||p===16&&(_&4194240)!==0))return s;if((u&4)!==0&&(u|=o&16),s=n.entangledLanes,s!==0)for(n=n.entanglements,s&=u;0<s;)o=31-Pe(s),p=1<<o,u|=n[o],s&=~p;return u}function en(n,s){switch(n){case 1:case 2:case 4:return s+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return s+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function kt(n,s){for(var o=n.suspendedLanes,u=n.pingedLanes,p=n.expirationTimes,_=n.pendingLanes;0<_;){var R=31-Pe(_),z=1<<R,W=p[R];W===-1?((z&o)===0||(z&u)!==0)&&(p[R]=en(z,s)):W<=s&&(n.expiredLanes|=z),_&=~z}}function fn(n){return n=n.pendingLanes&-1073741825,n!==0?n:n&1073741824?1073741824:0}function He(){var n=ft;return ft<<=1,(ft&4194240)===0&&(ft=64),n}function Nn(n){for(var s=[],o=0;31>o;o++)s.push(n);return s}function xt(n,s,o){n.pendingLanes|=s,s!==536870912&&(n.suspendedLanes=0,n.pingedLanes=0),n=n.eventTimes,s=31-Pe(s),n[s]=o}function Jn(n,s){var o=n.pendingLanes&~s;n.pendingLanes=s,n.suspendedLanes=0,n.pingedLanes=0,n.expiredLanes&=s,n.mutableReadLanes&=s,n.entangledLanes&=s,s=n.entanglements;var u=n.eventTimes;for(n=n.expirationTimes;0<o;){var p=31-Pe(o),_=1<<p;s[p]=0,u[p]=-1,n[p]=-1,o&=~_}}function ei(n,s){var o=n.entangledLanes|=s;for(n=n.entanglements;o;){var u=31-Pe(o),p=1<<u;p&s|n[u]&s&&(n[u]|=s),o&=~p}}var yt=0;function Sr(n){return n&=-n,1<n?4<n?(n&268435455)!==0?16:536870912:4:1}var Ut,Yt,Fi,zt,Oi,tr=!1,Gs=[],Kr=null,Qr=null,Zr=null,$o=new Map,qo=new Map,Jr=[],Ny="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function Xm(n,s){switch(n){case"focusin":case"focusout":Kr=null;break;case"dragenter":case"dragleave":Qr=null;break;case"mouseover":case"mouseout":Zr=null;break;case"pointerover":case"pointerout":$o.delete(s.pointerId);break;case"gotpointercapture":case"lostpointercapture":qo.delete(s.pointerId)}}function Yo(n,s,o,u,p,_){return n===null||n.nativeEvent!==_?(n={blockedOn:s,domEventName:o,eventSystemFlags:u,nativeEvent:_,targetContainers:[p]},s!==null&&(s=cl(s),s!==null&&Yt(s)),n):(n.eventSystemFlags|=u,s=n.targetContainers,p!==null&&s.indexOf(p)===-1&&s.push(p),n)}function Ly(n,s,o,u,p){switch(s){case"focusin":return Kr=Yo(Kr,n,s,o,u,p),!0;case"dragenter":return Qr=Yo(Qr,n,s,o,u,p),!0;case"mouseover":return Zr=Yo(Zr,n,s,o,u,p),!0;case"pointerover":var _=p.pointerId;return $o.set(_,Yo($o.get(_)||null,n,s,o,u,p)),!0;case"gotpointercapture":return _=p.pointerId,qo.set(_,Yo(qo.get(_)||null,n,s,o,u,p)),!0}return!1}function $m(n){var s=Ws(n.target);if(s!==null){var o=Xn(s);if(o!==null){if(s=o.tag,s===13){if(s=Ta(o),s!==null){n.blockedOn=s,Oi(n.priority,function(){Fi(o)});return}}else if(s===3&&o.stateNode.current.memoizedState.isDehydrated){n.blockedOn=o.tag===3?o.stateNode.containerInfo:null;return}}}n.blockedOn=null}function cc(n){if(n.blockedOn!==null)return!1;for(var s=n.targetContainers;0<s.length;){var o=wd(n.domEventName,n.eventSystemFlags,s[0],n.nativeEvent);if(o===null){o=n.nativeEvent;var u=new o.constructor(o.type,o);Me=u,o.target.dispatchEvent(u),Me=null}else return s=cl(o),s!==null&&Yt(s),n.blockedOn=o,!1;s.shift()}return!0}function qm(n,s,o){cc(n)&&o.delete(s)}function Dy(){tr=!1,Kr!==null&&cc(Kr)&&(Kr=null),Qr!==null&&cc(Qr)&&(Qr=null),Zr!==null&&cc(Zr)&&(Zr=null),$o.forEach(qm),qo.forEach(qm)}function Ko(n,s){n.blockedOn===s&&(n.blockedOn=null,tr||(tr=!0,e.unstable_scheduleCallback(e.unstable_NormalPriority,Dy)))}function Qo(n){function s(p){return Ko(p,n)}if(0<Gs.length){Ko(Gs[0],n);for(var o=1;o<Gs.length;o++){var u=Gs[o];u.blockedOn===n&&(u.blockedOn=null)}}for(Kr!==null&&Ko(Kr,n),Qr!==null&&Ko(Qr,n),Zr!==null&&Ko(Zr,n),$o.forEach(s),qo.forEach(s),o=0;o<Jr.length;o++)u=Jr[o],u.blockedOn===n&&(u.blockedOn=null);for(;0<Jr.length&&(o=Jr[0],o.blockedOn===null);)$m(o),o.blockedOn===null&&Jr.shift()}var ba=C.ReactCurrentBatchConfig,uc=!0;function Iy(n,s,o,u){var p=yt,_=ba.transition;ba.transition=null;try{yt=1,Ed(n,s,o,u)}finally{yt=p,ba.transition=_}}function Uy(n,s,o,u){var p=yt,_=ba.transition;ba.transition=null;try{yt=4,Ed(n,s,o,u)}finally{yt=p,ba.transition=_}}function Ed(n,s,o,u){if(uc){var p=wd(n,s,o,u);if(p===null)Hd(n,s,u,dc,o),Xm(n,u);else if(Ly(p,n,s,o,u))u.stopPropagation();else if(Xm(n,u),s&4&&-1<Ny.indexOf(n)){for(;p!==null;){var _=cl(p);if(_!==null&&Ut(_),_=wd(n,s,o,u),_===null&&Hd(n,s,u,dc,o),_===p)break;p=_}p!==null&&u.stopPropagation()}else Hd(n,s,u,null,o)}}var dc=null;function wd(n,s,o,u){if(dc=null,n=ke(u),n=Ws(n),n!==null)if(s=Xn(n),s===null)n=null;else if(o=s.tag,o===13){if(n=Ta(s),n!==null)return n;n=null}else if(o===3){if(s.stateNode.current.memoizedState.isDehydrated)return s.tag===3?s.stateNode.containerInfo:null;n=null}else s!==n&&(n=null);return dc=n,null}function Ym(n){switch(n){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(Md()){case Xo:return 1;case A:return 4;case Q:case pe:return 16;case oe:return 536870912;default:return 16}default:return 16}}var es=null,Td=null,hc=null;function Km(){if(hc)return hc;var n,s=Td,o=s.length,u,p="value"in es?es.value:es.textContent,_=p.length;for(n=0;n<o&&s[n]===p[n];n++);var R=o-n;for(u=1;u<=R&&s[o-u]===p[_-u];u++);return hc=p.slice(n,1<u?1-u:void 0)}function fc(n){var s=n.keyCode;return"charCode"in n?(n=n.charCode,n===0&&s===13&&(n=13)):n=s,n===10&&(n=13),32<=n||n===13?n:0}function pc(){return!0}function Qm(){return!1}function fi(n){function s(o,u,p,_,R){this._reactName=o,this._targetInst=p,this.type=u,this.nativeEvent=_,this.target=R,this.currentTarget=null;for(var z in n)n.hasOwnProperty(z)&&(o=n[z],this[z]=o?o(_):_[z]);return this.isDefaultPrevented=(_.defaultPrevented!=null?_.defaultPrevented:_.returnValue===!1)?pc:Qm,this.isPropagationStopped=Qm,this}return he(s.prototype,{preventDefault:function(){this.defaultPrevented=!0;var o=this.nativeEvent;o&&(o.preventDefault?o.preventDefault():typeof o.returnValue!="unknown"&&(o.returnValue=!1),this.isDefaultPrevented=pc)},stopPropagation:function(){var o=this.nativeEvent;o&&(o.stopPropagation?o.stopPropagation():typeof o.cancelBubble!="unknown"&&(o.cancelBubble=!0),this.isPropagationStopped=pc)},persist:function(){},isPersistent:pc}),s}var Ca={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(n){return n.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},bd=fi(Ca),Zo=he({},Ca,{view:0,detail:0}),Fy=fi(Zo),Cd,Rd,Jo,mc=he({},Zo,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Pd,button:0,buttons:0,relatedTarget:function(n){return n.relatedTarget===void 0?n.fromElement===n.srcElement?n.toElement:n.fromElement:n.relatedTarget},movementX:function(n){return"movementX"in n?n.movementX:(n!==Jo&&(Jo&&n.type==="mousemove"?(Cd=n.screenX-Jo.screenX,Rd=n.screenY-Jo.screenY):Rd=Cd=0,Jo=n),Cd)},movementY:function(n){return"movementY"in n?n.movementY:Rd}}),Zm=fi(mc),Oy=he({},mc,{dataTransfer:0}),ky=fi(Oy),zy=he({},Zo,{relatedTarget:0}),Ad=fi(zy),By=he({},Ca,{animationName:0,elapsedTime:0,pseudoElement:0}),Hy=fi(By),Vy=he({},Ca,{clipboardData:function(n){return"clipboardData"in n?n.clipboardData:window.clipboardData}}),Gy=fi(Vy),Wy=he({},Ca,{data:0}),Jm=fi(Wy),jy={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},Xy={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},$y={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function qy(n){var s=this.nativeEvent;return s.getModifierState?s.getModifierState(n):(n=$y[n])?!!s[n]:!1}function Pd(){return qy}var Yy=he({},Zo,{key:function(n){if(n.key){var s=jy[n.key]||n.key;if(s!=="Unidentified")return s}return n.type==="keypress"?(n=fc(n),n===13?"Enter":String.fromCharCode(n)):n.type==="keydown"||n.type==="keyup"?Xy[n.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Pd,charCode:function(n){return n.type==="keypress"?fc(n):0},keyCode:function(n){return n.type==="keydown"||n.type==="keyup"?n.keyCode:0},which:function(n){return n.type==="keypress"?fc(n):n.type==="keydown"||n.type==="keyup"?n.keyCode:0}}),Ky=fi(Yy),Qy=he({},mc,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),eg=fi(Qy),Zy=he({},Zo,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Pd}),Jy=fi(Zy),eS=he({},Ca,{propertyName:0,elapsedTime:0,pseudoElement:0}),tS=fi(eS),nS=he({},mc,{deltaX:function(n){return"deltaX"in n?n.deltaX:"wheelDeltaX"in n?-n.wheelDeltaX:0},deltaY:function(n){return"deltaY"in n?n.deltaY:"wheelDeltaY"in n?-n.wheelDeltaY:"wheelDelta"in n?-n.wheelDelta:0},deltaZ:0,deltaMode:0}),iS=fi(nS),rS=[9,13,27,32],Nd=d&&"CompositionEvent"in window,el=null;d&&"documentMode"in document&&(el=document.documentMode);var sS=d&&"TextEvent"in window&&!el,tg=d&&(!Nd||el&&8<el&&11>=el),ng=" ",ig=!1;function rg(n,s){switch(n){case"keyup":return rS.indexOf(s.keyCode)!==-1;case"keydown":return s.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function sg(n){return n=n.detail,typeof n=="object"&&"data"in n?n.data:null}var Ra=!1;function aS(n,s){switch(n){case"compositionend":return sg(s);case"keypress":return s.which!==32?null:(ig=!0,ng);case"textInput":return n=s.data,n===ng&&ig?null:n;default:return null}}function oS(n,s){if(Ra)return n==="compositionend"||!Nd&&rg(n,s)?(n=Km(),hc=Td=es=null,Ra=!1,n):null;switch(n){case"paste":return null;case"keypress":if(!(s.ctrlKey||s.altKey||s.metaKey)||s.ctrlKey&&s.altKey){if(s.char&&1<s.char.length)return s.char;if(s.which)return String.fromCharCode(s.which)}return null;case"compositionend":return tg&&s.locale!=="ko"?null:s.data;default:return null}}var lS={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function ag(n){var s=n&&n.nodeName&&n.nodeName.toLowerCase();return s==="input"?!!lS[n.type]:s==="textarea"}function og(n,s,o,u){ye(u),s=yc(s,"onChange"),0<s.length&&(o=new bd("onChange","change",null,o,u),n.push({event:o,listeners:s}))}var tl=null,nl=null;function cS(n){Tg(n,0)}function gc(n){var s=Da(n);if(Dt(s))return n}function uS(n,s){if(n==="change")return s}var lg=!1;if(d){var Ld;if(d){var Dd="oninput"in document;if(!Dd){var cg=document.createElement("div");cg.setAttribute("oninput","return;"),Dd=typeof cg.oninput=="function"}Ld=Dd}else Ld=!1;lg=Ld&&(!document.documentMode||9<document.documentMode)}function ug(){tl&&(tl.detachEvent("onpropertychange",dg),nl=tl=null)}function dg(n){if(n.propertyName==="value"&&gc(nl)){var s=[];og(s,nl,n,ke(n)),qe(cS,s)}}function dS(n,s,o){n==="focusin"?(ug(),tl=s,nl=o,tl.attachEvent("onpropertychange",dg)):n==="focusout"&&ug()}function hS(n){if(n==="selectionchange"||n==="keyup"||n==="keydown")return gc(nl)}function fS(n,s){if(n==="click")return gc(s)}function pS(n,s){if(n==="input"||n==="change")return gc(s)}function mS(n,s){return n===s&&(n!==0||1/n===1/s)||n!==n&&s!==s}var ki=typeof Object.is=="function"?Object.is:mS;function il(n,s){if(ki(n,s))return!0;if(typeof n!="object"||n===null||typeof s!="object"||s===null)return!1;var o=Object.keys(n),u=Object.keys(s);if(o.length!==u.length)return!1;for(u=0;u<o.length;u++){var p=o[u];if(!h.call(s,p)||!ki(n[p],s[p]))return!1}return!0}function hg(n){for(;n&&n.firstChild;)n=n.firstChild;return n}function fg(n,s){var o=hg(n);n=0;for(var u;o;){if(o.nodeType===3){if(u=n+o.textContent.length,n<=s&&u>=s)return{node:o,offset:s-n};n=u}e:{for(;o;){if(o.nextSibling){o=o.nextSibling;break e}o=o.parentNode}o=void 0}o=hg(o)}}function pg(n,s){return n&&s?n===s?!0:n&&n.nodeType===3?!1:s&&s.nodeType===3?pg(n,s.parentNode):"contains"in n?n.contains(s):n.compareDocumentPosition?!!(n.compareDocumentPosition(s)&16):!1:!1}function mg(){for(var n=window,s=ct();s instanceof n.HTMLIFrameElement;){try{var o=typeof s.contentWindow.location.href=="string"}catch{o=!1}if(o)n=s.contentWindow;else break;s=ct(n.document)}return s}function Id(n){var s=n&&n.nodeName&&n.nodeName.toLowerCase();return s&&(s==="input"&&(n.type==="text"||n.type==="search"||n.type==="tel"||n.type==="url"||n.type==="password")||s==="textarea"||n.contentEditable==="true")}function gS(n){var s=mg(),o=n.focusedElem,u=n.selectionRange;if(s!==o&&o&&o.ownerDocument&&pg(o.ownerDocument.documentElement,o)){if(u!==null&&Id(o)){if(s=u.start,n=u.end,n===void 0&&(n=s),"selectionStart"in o)o.selectionStart=s,o.selectionEnd=Math.min(n,o.value.length);else if(n=(s=o.ownerDocument||document)&&s.defaultView||window,n.getSelection){n=n.getSelection();var p=o.textContent.length,_=Math.min(u.start,p);u=u.end===void 0?_:Math.min(u.end,p),!n.extend&&_>u&&(p=u,u=_,_=p),p=fg(o,_);var R=fg(o,u);p&&R&&(n.rangeCount!==1||n.anchorNode!==p.node||n.anchorOffset!==p.offset||n.focusNode!==R.node||n.focusOffset!==R.offset)&&(s=s.createRange(),s.setStart(p.node,p.offset),n.removeAllRanges(),_>u?(n.addRange(s),n.extend(R.node,R.offset)):(s.setEnd(R.node,R.offset),n.addRange(s)))}}for(s=[],n=o;n=n.parentNode;)n.nodeType===1&&s.push({element:n,left:n.scrollLeft,top:n.scrollTop});for(typeof o.focus=="function"&&o.focus(),o=0;o<s.length;o++)n=s[o],n.element.scrollLeft=n.left,n.element.scrollTop=n.top}}var vS=d&&"documentMode"in document&&11>=document.documentMode,Aa=null,Ud=null,rl=null,Fd=!1;function gg(n,s,o){var u=o.window===o?o.document:o.nodeType===9?o:o.ownerDocument;Fd||Aa==null||Aa!==ct(u)||(u=Aa,"selectionStart"in u&&Id(u)?u={start:u.selectionStart,end:u.selectionEnd}:(u=(u.ownerDocument&&u.ownerDocument.defaultView||window).getSelection(),u={anchorNode:u.anchorNode,anchorOffset:u.anchorOffset,focusNode:u.focusNode,focusOffset:u.focusOffset}),rl&&il(rl,u)||(rl=u,u=yc(Ud,"onSelect"),0<u.length&&(s=new bd("onSelect","select",null,s,o),n.push({event:s,listeners:u}),s.target=Aa)))}function vc(n,s){var o={};return o[n.toLowerCase()]=s.toLowerCase(),o["Webkit"+n]="webkit"+s,o["Moz"+n]="moz"+s,o}var Pa={animationend:vc("Animation","AnimationEnd"),animationiteration:vc("Animation","AnimationIteration"),animationstart:vc("Animation","AnimationStart"),transitionend:vc("Transition","TransitionEnd")},Od={},vg={};d&&(vg=document.createElement("div").style,"AnimationEvent"in window||(delete Pa.animationend.animation,delete Pa.animationiteration.animation,delete Pa.animationstart.animation),"TransitionEvent"in window||delete Pa.transitionend.transition);function xc(n){if(Od[n])return Od[n];if(!Pa[n])return n;var s=Pa[n],o;for(o in s)if(s.hasOwnProperty(o)&&o in vg)return Od[n]=s[o];return n}var xg=xc("animationend"),_g=xc("animationiteration"),yg=xc("animationstart"),Sg=xc("transitionend"),Mg=new Map,Eg="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function ts(n,s){Mg.set(n,s),l(s,[n])}for(var kd=0;kd<Eg.length;kd++){var zd=Eg[kd],xS=zd.toLowerCase(),_S=zd[0].toUpperCase()+zd.slice(1);ts(xS,"on"+_S)}ts(xg,"onAnimationEnd"),ts(_g,"onAnimationIteration"),ts(yg,"onAnimationStart"),ts("dblclick","onDoubleClick"),ts("focusin","onFocus"),ts("focusout","onBlur"),ts(Sg,"onTransitionEnd"),c("onMouseEnter",["mouseout","mouseover"]),c("onMouseLeave",["mouseout","mouseover"]),c("onPointerEnter",["pointerout","pointerover"]),c("onPointerLeave",["pointerout","pointerover"]),l("onChange","change click focusin focusout input keydown keyup selectionchange".split(" ")),l("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),l("onBeforeInput",["compositionend","keypress","textInput","paste"]),l("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" ")),l("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" ")),l("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var sl="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),yS=new Set("cancel close invalid load scroll toggle".split(" ").concat(sl));function wg(n,s,o){var u=n.type||"unknown-event";n.currentTarget=o,ac(u,s,void 0,n),n.currentTarget=null}function Tg(n,s){s=(s&4)!==0;for(var o=0;o<n.length;o++){var u=n[o],p=u.event;u=u.listeners;e:{var _=void 0;if(s)for(var R=u.length-1;0<=R;R--){var z=u[R],W=z.instance,me=z.currentTarget;if(z=z.listener,W!==_&&p.isPropagationStopped())break e;wg(p,z,me),_=W}else for(R=0;R<u.length;R++){if(z=u[R],W=z.instance,me=z.currentTarget,z=z.listener,W!==_&&p.isPropagationStopped())break e;wg(p,z,me),_=W}}}if(zs)throw n=Bs,zs=!1,Bs=null,n}function Kt(n,s){var o=s[$d];o===void 0&&(o=s[$d]=new Set);var u=n+"__bubble";o.has(u)||(bg(s,n,2,!1),o.add(u))}function Bd(n,s,o){var u=0;s&&(u|=4),bg(o,n,u,s)}var _c="_reactListening"+Math.random().toString(36).slice(2);function al(n){if(!n[_c]){n[_c]=!0,r.forEach(function(o){o!=="selectionchange"&&(yS.has(o)||Bd(o,!1,n),Bd(o,!0,n))});var s=n.nodeType===9?n:n.ownerDocument;s===null||s[_c]||(s[_c]=!0,Bd("selectionchange",!1,s))}}function bg(n,s,o,u){switch(Ym(s)){case 1:var p=Iy;break;case 4:p=Uy;break;default:p=Ed}o=p.bind(null,s,o,n),p=void 0,!It||s!=="touchstart"&&s!=="touchmove"&&s!=="wheel"||(p=!0),u?p!==void 0?n.addEventListener(s,o,{capture:!0,passive:p}):n.addEventListener(s,o,!0):p!==void 0?n.addEventListener(s,o,{passive:p}):n.addEventListener(s,o,!1)}function Hd(n,s,o,u,p){var _=u;if((s&1)===0&&(s&2)===0&&u!==null)e:for(;;){if(u===null)return;var R=u.tag;if(R===3||R===4){var z=u.stateNode.containerInfo;if(z===p||z.nodeType===8&&z.parentNode===p)break;if(R===4)for(R=u.return;R!==null;){var W=R.tag;if((W===3||W===4)&&(W=R.stateNode.containerInfo,W===p||W.nodeType===8&&W.parentNode===p))return;R=R.return}for(;z!==null;){if(R=Ws(z),R===null)return;if(W=R.tag,W===5||W===6){u=_=R;continue e}z=z.parentNode}}u=u.return}qe(function(){var me=_,be=ke(o),Ce=[];e:{var we=Mg.get(n);if(we!==void 0){var Ve=bd,Ye=n;switch(n){case"keypress":if(fc(o)===0)break e;case"keydown":case"keyup":Ve=Ky;break;case"focusin":Ye="focus",Ve=Ad;break;case"focusout":Ye="blur",Ve=Ad;break;case"beforeblur":case"afterblur":Ve=Ad;break;case"click":if(o.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":Ve=Zm;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":Ve=ky;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":Ve=Jy;break;case xg:case _g:case yg:Ve=Hy;break;case Sg:Ve=tS;break;case"scroll":Ve=Fy;break;case"wheel":Ve=iS;break;case"copy":case"cut":case"paste":Ve=Gy;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":Ve=eg}var Ze=(s&4)!==0,dn=!Ze&&n==="scroll",ie=Ze?we!==null?we+"Capture":null:we;Ze=[];for(var $=me,le;$!==null;){le=$;var Re=le.stateNode;if(le.tag===5&&Re!==null&&(le=Re,ie!==null&&(Re=Ht($,ie),Re!=null&&Ze.push(ol($,Re,le)))),dn)break;$=$.return}0<Ze.length&&(we=new Ve(we,Ye,null,o,be),Ce.push({event:we,listeners:Ze}))}}if((s&7)===0){e:{if(we=n==="mouseover"||n==="pointerover",Ve=n==="mouseout"||n==="pointerout",we&&o!==Me&&(Ye=o.relatedTarget||o.fromElement)&&(Ws(Ye)||Ye[Mr]))break e;if((Ve||we)&&(we=be.window===be?be:(we=be.ownerDocument)?we.defaultView||we.parentWindow:window,Ve?(Ye=o.relatedTarget||o.toElement,Ve=me,Ye=Ye?Ws(Ye):null,Ye!==null&&(dn=Xn(Ye),Ye!==dn||Ye.tag!==5&&Ye.tag!==6)&&(Ye=null)):(Ve=null,Ye=me),Ve!==Ye)){if(Ze=Zm,Re="onMouseLeave",ie="onMouseEnter",$="mouse",(n==="pointerout"||n==="pointerover")&&(Ze=eg,Re="onPointerLeave",ie="onPointerEnter",$="pointer"),dn=Ve==null?we:Da(Ve),le=Ye==null?we:Da(Ye),we=new Ze(Re,$+"leave",Ve,o,be),we.target=dn,we.relatedTarget=le,Re=null,Ws(be)===me&&(Ze=new Ze(ie,$+"enter",Ye,o,be),Ze.target=le,Ze.relatedTarget=dn,Re=Ze),dn=Re,Ve&&Ye)t:{for(Ze=Ve,ie=Ye,$=0,le=Ze;le;le=Na(le))$++;for(le=0,Re=ie;Re;Re=Na(Re))le++;for(;0<$-le;)Ze=Na(Ze),$--;for(;0<le-$;)ie=Na(ie),le--;for(;$--;){if(Ze===ie||ie!==null&&Ze===ie.alternate)break t;Ze=Na(Ze),ie=Na(ie)}Ze=null}else Ze=null;Ve!==null&&Cg(Ce,we,Ve,Ze,!1),Ye!==null&&dn!==null&&Cg(Ce,dn,Ye,Ze,!0)}}e:{if(we=me?Da(me):window,Ve=we.nodeName&&we.nodeName.toLowerCase(),Ve==="select"||Ve==="input"&&we.type==="file")var et=uS;else if(ag(we))if(lg)et=pS;else{et=hS;var at=dS}else(Ve=we.nodeName)&&Ve.toLowerCase()==="input"&&(we.type==="checkbox"||we.type==="radio")&&(et=fS);if(et&&(et=et(n,me))){og(Ce,et,o,be);break e}at&&at(n,we,me),n==="focusout"&&(at=we._wrapperState)&&at.controlled&&we.type==="number"&&Jt(we,"number",we.value)}switch(at=me?Da(me):window,n){case"focusin":(ag(at)||at.contentEditable==="true")&&(Aa=at,Ud=me,rl=null);break;case"focusout":rl=Ud=Aa=null;break;case"mousedown":Fd=!0;break;case"contextmenu":case"mouseup":case"dragend":Fd=!1,gg(Ce,o,be);break;case"selectionchange":if(vS)break;case"keydown":case"keyup":gg(Ce,o,be)}var ot;if(Nd)e:{switch(n){case"compositionstart":var ut="onCompositionStart";break e;case"compositionend":ut="onCompositionEnd";break e;case"compositionupdate":ut="onCompositionUpdate";break e}ut=void 0}else Ra?rg(n,o)&&(ut="onCompositionEnd"):n==="keydown"&&o.keyCode===229&&(ut="onCompositionStart");ut&&(tg&&o.locale!=="ko"&&(Ra||ut!=="onCompositionStart"?ut==="onCompositionEnd"&&Ra&&(ot=Km()):(es=be,Td="value"in es?es.value:es.textContent,Ra=!0)),at=yc(me,ut),0<at.length&&(ut=new Jm(ut,n,null,o,be),Ce.push({event:ut,listeners:at}),ot?ut.data=ot:(ot=sg(o),ot!==null&&(ut.data=ot)))),(ot=sS?aS(n,o):oS(n,o))&&(me=yc(me,"onBeforeInput"),0<me.length&&(be=new Jm("onBeforeInput","beforeinput",null,o,be),Ce.push({event:be,listeners:me}),be.data=ot))}Tg(Ce,s)})}function ol(n,s,o){return{instance:n,listener:s,currentTarget:o}}function yc(n,s){for(var o=s+"Capture",u=[];n!==null;){var p=n,_=p.stateNode;p.tag===5&&_!==null&&(p=_,_=Ht(n,o),_!=null&&u.unshift(ol(n,_,p)),_=Ht(n,s),_!=null&&u.push(ol(n,_,p))),n=n.return}return u}function Na(n){if(n===null)return null;do n=n.return;while(n&&n.tag!==5);return n||null}function Cg(n,s,o,u,p){for(var _=s._reactName,R=[];o!==null&&o!==u;){var z=o,W=z.alternate,me=z.stateNode;if(W!==null&&W===u)break;z.tag===5&&me!==null&&(z=me,p?(W=Ht(o,_),W!=null&&R.unshift(ol(o,W,z))):p||(W=Ht(o,_),W!=null&&R.push(ol(o,W,z)))),o=o.return}R.length!==0&&n.push({event:s,listeners:R})}var SS=/\r\n?/g,MS=/\u0000|\uFFFD/g;function Rg(n){return(typeof n=="string"?n:""+n).replace(SS,`
`).replace(MS,"")}function Sc(n,s,o){if(s=Rg(s),Rg(n)!==s&&o)throw Error(t(425))}function Mc(){}var Vd=null,Gd=null;function Wd(n,s){return n==="textarea"||n==="noscript"||typeof s.children=="string"||typeof s.children=="number"||typeof s.dangerouslySetInnerHTML=="object"&&s.dangerouslySetInnerHTML!==null&&s.dangerouslySetInnerHTML.__html!=null}var jd=typeof setTimeout=="function"?setTimeout:void 0,ES=typeof clearTimeout=="function"?clearTimeout:void 0,Ag=typeof Promise=="function"?Promise:void 0,wS=typeof queueMicrotask=="function"?queueMicrotask:typeof Ag<"u"?function(n){return Ag.resolve(null).then(n).catch(TS)}:jd;function TS(n){setTimeout(function(){throw n})}function Xd(n,s){var o=s,u=0;do{var p=o.nextSibling;if(n.removeChild(o),p&&p.nodeType===8)if(o=p.data,o==="/$"){if(u===0){n.removeChild(p),Qo(s);return}u--}else o!=="$"&&o!=="$?"&&o!=="$!"||u++;o=p}while(o);Qo(s)}function ns(n){for(;n!=null;n=n.nextSibling){var s=n.nodeType;if(s===1||s===3)break;if(s===8){if(s=n.data,s==="$"||s==="$!"||s==="$?")break;if(s==="/$")return null}}return n}function Pg(n){n=n.previousSibling;for(var s=0;n;){if(n.nodeType===8){var o=n.data;if(o==="$"||o==="$!"||o==="$?"){if(s===0)return n;s--}else o==="/$"&&s++}n=n.previousSibling}return null}var La=Math.random().toString(36).slice(2),nr="__reactFiber$"+La,ll="__reactProps$"+La,Mr="__reactContainer$"+La,$d="__reactEvents$"+La,bS="__reactListeners$"+La,CS="__reactHandles$"+La;function Ws(n){var s=n[nr];if(s)return s;for(var o=n.parentNode;o;){if(s=o[Mr]||o[nr]){if(o=s.alternate,s.child!==null||o!==null&&o.child!==null)for(n=Pg(n);n!==null;){if(o=n[nr])return o;n=Pg(n)}return s}n=o,o=n.parentNode}return null}function cl(n){return n=n[nr]||n[Mr],!n||n.tag!==5&&n.tag!==6&&n.tag!==13&&n.tag!==3?null:n}function Da(n){if(n.tag===5||n.tag===6)return n.stateNode;throw Error(t(33))}function Ec(n){return n[ll]||null}var qd=[],Ia=-1;function is(n){return{current:n}}function Qt(n){0>Ia||(n.current=qd[Ia],qd[Ia]=null,Ia--)}function Xt(n,s){Ia++,qd[Ia]=n.current,n.current=s}var rs={},On=is(rs),ti=is(!1),js=rs;function Ua(n,s){var o=n.type.contextTypes;if(!o)return rs;var u=n.stateNode;if(u&&u.__reactInternalMemoizedUnmaskedChildContext===s)return u.__reactInternalMemoizedMaskedChildContext;var p={},_;for(_ in o)p[_]=s[_];return u&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=s,n.__reactInternalMemoizedMaskedChildContext=p),p}function ni(n){return n=n.childContextTypes,n!=null}function wc(){Qt(ti),Qt(On)}function Ng(n,s,o){if(On.current!==rs)throw Error(t(168));Xt(On,s),Xt(ti,o)}function Lg(n,s,o){var u=n.stateNode;if(s=s.childContextTypes,typeof u.getChildContext!="function")return o;u=u.getChildContext();for(var p in u)if(!(p in s))throw Error(t(108,Se(n)||"Unknown",p));return he({},o,u)}function Tc(n){return n=(n=n.stateNode)&&n.__reactInternalMemoizedMergedChildContext||rs,js=On.current,Xt(On,n),Xt(ti,ti.current),!0}function Dg(n,s,o){var u=n.stateNode;if(!u)throw Error(t(169));o?(n=Lg(n,s,js),u.__reactInternalMemoizedMergedChildContext=n,Qt(ti),Qt(On),Xt(On,n)):Qt(ti),Xt(ti,o)}var Er=null,bc=!1,Yd=!1;function Ig(n){Er===null?Er=[n]:Er.push(n)}function RS(n){bc=!0,Ig(n)}function ss(){if(!Yd&&Er!==null){Yd=!0;var n=0,s=yt;try{var o=Er;for(yt=1;n<o.length;n++){var u=o[n];do u=u(!0);while(u!==null)}Er=null,bc=!1}catch(p){throw Er!==null&&(Er=Er.slice(n+1)),Vs(Xo,ss),p}finally{yt=s,Yd=!1}}return null}var Fa=[],Oa=0,Cc=null,Rc=0,Ti=[],bi=0,Xs=null,wr=1,Tr="";function $s(n,s){Fa[Oa++]=Rc,Fa[Oa++]=Cc,Cc=n,Rc=s}function Ug(n,s,o){Ti[bi++]=wr,Ti[bi++]=Tr,Ti[bi++]=Xs,Xs=n;var u=wr;n=Tr;var p=32-Pe(u)-1;u&=~(1<<p),o+=1;var _=32-Pe(s)+p;if(30<_){var R=p-p%5;_=(u&(1<<R)-1).toString(32),u>>=R,p-=R,wr=1<<32-Pe(s)+p|o<<p|u,Tr=_+n}else wr=1<<_|o<<p|u,Tr=n}function Kd(n){n.return!==null&&($s(n,1),Ug(n,1,0))}function Qd(n){for(;n===Cc;)Cc=Fa[--Oa],Fa[Oa]=null,Rc=Fa[--Oa],Fa[Oa]=null;for(;n===Xs;)Xs=Ti[--bi],Ti[bi]=null,Tr=Ti[--bi],Ti[bi]=null,wr=Ti[--bi],Ti[bi]=null}var pi=null,mi=null,tn=!1,zi=null;function Fg(n,s){var o=Pi(5,null,null,0);o.elementType="DELETED",o.stateNode=s,o.return=n,s=n.deletions,s===null?(n.deletions=[o],n.flags|=16):s.push(o)}function Og(n,s){switch(n.tag){case 5:var o=n.type;return s=s.nodeType!==1||o.toLowerCase()!==s.nodeName.toLowerCase()?null:s,s!==null?(n.stateNode=s,pi=n,mi=ns(s.firstChild),!0):!1;case 6:return s=n.pendingProps===""||s.nodeType!==3?null:s,s!==null?(n.stateNode=s,pi=n,mi=null,!0):!1;case 13:return s=s.nodeType!==8?null:s,s!==null?(o=Xs!==null?{id:wr,overflow:Tr}:null,n.memoizedState={dehydrated:s,treeContext:o,retryLane:1073741824},o=Pi(18,null,null,0),o.stateNode=s,o.return=n,n.child=o,pi=n,mi=null,!0):!1;default:return!1}}function Zd(n){return(n.mode&1)!==0&&(n.flags&128)===0}function Jd(n){if(tn){var s=mi;if(s){var o=s;if(!Og(n,s)){if(Zd(n))throw Error(t(418));s=ns(o.nextSibling);var u=pi;s&&Og(n,s)?Fg(u,o):(n.flags=n.flags&-4097|2,tn=!1,pi=n)}}else{if(Zd(n))throw Error(t(418));n.flags=n.flags&-4097|2,tn=!1,pi=n}}}function kg(n){for(n=n.return;n!==null&&n.tag!==5&&n.tag!==3&&n.tag!==13;)n=n.return;pi=n}function Ac(n){if(n!==pi)return!1;if(!tn)return kg(n),tn=!0,!1;var s;if((s=n.tag!==3)&&!(s=n.tag!==5)&&(s=n.type,s=s!=="head"&&s!=="body"&&!Wd(n.type,n.memoizedProps)),s&&(s=mi)){if(Zd(n))throw zg(),Error(t(418));for(;s;)Fg(n,s),s=ns(s.nextSibling)}if(kg(n),n.tag===13){if(n=n.memoizedState,n=n!==null?n.dehydrated:null,!n)throw Error(t(317));e:{for(n=n.nextSibling,s=0;n;){if(n.nodeType===8){var o=n.data;if(o==="/$"){if(s===0){mi=ns(n.nextSibling);break e}s--}else o!=="$"&&o!=="$!"&&o!=="$?"||s++}n=n.nextSibling}mi=null}}else mi=pi?ns(n.stateNode.nextSibling):null;return!0}function zg(){for(var n=mi;n;)n=ns(n.nextSibling)}function ka(){mi=pi=null,tn=!1}function eh(n){zi===null?zi=[n]:zi.push(n)}var AS=C.ReactCurrentBatchConfig;function ul(n,s,o){if(n=o.ref,n!==null&&typeof n!="function"&&typeof n!="object"){if(o._owner){if(o=o._owner,o){if(o.tag!==1)throw Error(t(309));var u=o.stateNode}if(!u)throw Error(t(147,n));var p=u,_=""+n;return s!==null&&s.ref!==null&&typeof s.ref=="function"&&s.ref._stringRef===_?s.ref:(s=function(R){var z=p.refs;R===null?delete z[_]:z[_]=R},s._stringRef=_,s)}if(typeof n!="string")throw Error(t(284));if(!o._owner)throw Error(t(290,n))}return n}function Pc(n,s){throw n=Object.prototype.toString.call(s),Error(t(31,n==="[object Object]"?"object with keys {"+Object.keys(s).join(", ")+"}":n))}function Bg(n){var s=n._init;return s(n._payload)}function Hg(n){function s(ie,$){if(n){var le=ie.deletions;le===null?(ie.deletions=[$],ie.flags|=16):le.push($)}}function o(ie,$){if(!n)return null;for(;$!==null;)s(ie,$),$=$.sibling;return null}function u(ie,$){for(ie=new Map;$!==null;)$.key!==null?ie.set($.key,$):ie.set($.index,$),$=$.sibling;return ie}function p(ie,$){return ie=fs(ie,$),ie.index=0,ie.sibling=null,ie}function _(ie,$,le){return ie.index=le,n?(le=ie.alternate,le!==null?(le=le.index,le<$?(ie.flags|=2,$):le):(ie.flags|=2,$)):(ie.flags|=1048576,$)}function R(ie){return n&&ie.alternate===null&&(ie.flags|=2),ie}function z(ie,$,le,Re){return $===null||$.tag!==6?($=jh(le,ie.mode,Re),$.return=ie,$):($=p($,le),$.return=ie,$)}function W(ie,$,le,Re){var et=le.type;return et===F?be(ie,$,le.props.children,Re,le.key):$!==null&&($.elementType===et||typeof et=="object"&&et!==null&&et.$$typeof===ce&&Bg(et)===$.type)?(Re=p($,le.props),Re.ref=ul(ie,$,le),Re.return=ie,Re):(Re=eu(le.type,le.key,le.props,null,ie.mode,Re),Re.ref=ul(ie,$,le),Re.return=ie,Re)}function me(ie,$,le,Re){return $===null||$.tag!==4||$.stateNode.containerInfo!==le.containerInfo||$.stateNode.implementation!==le.implementation?($=Xh(le,ie.mode,Re),$.return=ie,$):($=p($,le.children||[]),$.return=ie,$)}function be(ie,$,le,Re,et){return $===null||$.tag!==7?($=ta(le,ie.mode,Re,et),$.return=ie,$):($=p($,le),$.return=ie,$)}function Ce(ie,$,le){if(typeof $=="string"&&$!==""||typeof $=="number")return $=jh(""+$,ie.mode,le),$.return=ie,$;if(typeof $=="object"&&$!==null){switch($.$$typeof){case D:return le=eu($.type,$.key,$.props,null,ie.mode,le),le.ref=ul(ie,null,$),le.return=ie,le;case L:return $=Xh($,ie.mode,le),$.return=ie,$;case ce:var Re=$._init;return Ce(ie,Re($._payload),le)}if(qt($)||ue($))return $=ta($,ie.mode,le,null),$.return=ie,$;Pc(ie,$)}return null}function we(ie,$,le,Re){var et=$!==null?$.key:null;if(typeof le=="string"&&le!==""||typeof le=="number")return et!==null?null:z(ie,$,""+le,Re);if(typeof le=="object"&&le!==null){switch(le.$$typeof){case D:return le.key===et?W(ie,$,le,Re):null;case L:return le.key===et?me(ie,$,le,Re):null;case ce:return et=le._init,we(ie,$,et(le._payload),Re)}if(qt(le)||ue(le))return et!==null?null:be(ie,$,le,Re,null);Pc(ie,le)}return null}function Ve(ie,$,le,Re,et){if(typeof Re=="string"&&Re!==""||typeof Re=="number")return ie=ie.get(le)||null,z($,ie,""+Re,et);if(typeof Re=="object"&&Re!==null){switch(Re.$$typeof){case D:return ie=ie.get(Re.key===null?le:Re.key)||null,W($,ie,Re,et);case L:return ie=ie.get(Re.key===null?le:Re.key)||null,me($,ie,Re,et);case ce:var at=Re._init;return Ve(ie,$,le,at(Re._payload),et)}if(qt(Re)||ue(Re))return ie=ie.get(le)||null,be($,ie,Re,et,null);Pc($,Re)}return null}function Ye(ie,$,le,Re){for(var et=null,at=null,ot=$,ut=$=0,Rn=null;ot!==null&&ut<le.length;ut++){ot.index>ut?(Rn=ot,ot=null):Rn=ot.sibling;var Lt=we(ie,ot,le[ut],Re);if(Lt===null){ot===null&&(ot=Rn);break}n&&ot&&Lt.alternate===null&&s(ie,ot),$=_(Lt,$,ut),at===null?et=Lt:at.sibling=Lt,at=Lt,ot=Rn}if(ut===le.length)return o(ie,ot),tn&&$s(ie,ut),et;if(ot===null){for(;ut<le.length;ut++)ot=Ce(ie,le[ut],Re),ot!==null&&($=_(ot,$,ut),at===null?et=ot:at.sibling=ot,at=ot);return tn&&$s(ie,ut),et}for(ot=u(ie,ot);ut<le.length;ut++)Rn=Ve(ot,ie,ut,le[ut],Re),Rn!==null&&(n&&Rn.alternate!==null&&ot.delete(Rn.key===null?ut:Rn.key),$=_(Rn,$,ut),at===null?et=Rn:at.sibling=Rn,at=Rn);return n&&ot.forEach(function(ps){return s(ie,ps)}),tn&&$s(ie,ut),et}function Ze(ie,$,le,Re){var et=ue(le);if(typeof et!="function")throw Error(t(150));if(le=et.call(le),le==null)throw Error(t(151));for(var at=et=null,ot=$,ut=$=0,Rn=null,Lt=le.next();ot!==null&&!Lt.done;ut++,Lt=le.next()){ot.index>ut?(Rn=ot,ot=null):Rn=ot.sibling;var ps=we(ie,ot,Lt.value,Re);if(ps===null){ot===null&&(ot=Rn);break}n&&ot&&ps.alternate===null&&s(ie,ot),$=_(ps,$,ut),at===null?et=ps:at.sibling=ps,at=ps,ot=Rn}if(Lt.done)return o(ie,ot),tn&&$s(ie,ut),et;if(ot===null){for(;!Lt.done;ut++,Lt=le.next())Lt=Ce(ie,Lt.value,Re),Lt!==null&&($=_(Lt,$,ut),at===null?et=Lt:at.sibling=Lt,at=Lt);return tn&&$s(ie,ut),et}for(ot=u(ie,ot);!Lt.done;ut++,Lt=le.next())Lt=Ve(ot,ie,ut,Lt.value,Re),Lt!==null&&(n&&Lt.alternate!==null&&ot.delete(Lt.key===null?ut:Lt.key),$=_(Lt,$,ut),at===null?et=Lt:at.sibling=Lt,at=Lt);return n&&ot.forEach(function(lM){return s(ie,lM)}),tn&&$s(ie,ut),et}function dn(ie,$,le,Re){if(typeof le=="object"&&le!==null&&le.type===F&&le.key===null&&(le=le.props.children),typeof le=="object"&&le!==null){switch(le.$$typeof){case D:e:{for(var et=le.key,at=$;at!==null;){if(at.key===et){if(et=le.type,et===F){if(at.tag===7){o(ie,at.sibling),$=p(at,le.props.children),$.return=ie,ie=$;break e}}else if(at.elementType===et||typeof et=="object"&&et!==null&&et.$$typeof===ce&&Bg(et)===at.type){o(ie,at.sibling),$=p(at,le.props),$.ref=ul(ie,at,le),$.return=ie,ie=$;break e}o(ie,at);break}else s(ie,at);at=at.sibling}le.type===F?($=ta(le.props.children,ie.mode,Re,le.key),$.return=ie,ie=$):(Re=eu(le.type,le.key,le.props,null,ie.mode,Re),Re.ref=ul(ie,$,le),Re.return=ie,ie=Re)}return R(ie);case L:e:{for(at=le.key;$!==null;){if($.key===at)if($.tag===4&&$.stateNode.containerInfo===le.containerInfo&&$.stateNode.implementation===le.implementation){o(ie,$.sibling),$=p($,le.children||[]),$.return=ie,ie=$;break e}else{o(ie,$);break}else s(ie,$);$=$.sibling}$=Xh(le,ie.mode,Re),$.return=ie,ie=$}return R(ie);case ce:return at=le._init,dn(ie,$,at(le._payload),Re)}if(qt(le))return Ye(ie,$,le,Re);if(ue(le))return Ze(ie,$,le,Re);Pc(ie,le)}return typeof le=="string"&&le!==""||typeof le=="number"?(le=""+le,$!==null&&$.tag===6?(o(ie,$.sibling),$=p($,le),$.return=ie,ie=$):(o(ie,$),$=jh(le,ie.mode,Re),$.return=ie,ie=$),R(ie)):o(ie,$)}return dn}var za=Hg(!0),Vg=Hg(!1),Nc=is(null),Lc=null,Ba=null,th=null;function nh(){th=Ba=Lc=null}function ih(n){var s=Nc.current;Qt(Nc),n._currentValue=s}function rh(n,s,o){for(;n!==null;){var u=n.alternate;if((n.childLanes&s)!==s?(n.childLanes|=s,u!==null&&(u.childLanes|=s)):u!==null&&(u.childLanes&s)!==s&&(u.childLanes|=s),n===o)break;n=n.return}}function Ha(n,s){Lc=n,th=Ba=null,n=n.dependencies,n!==null&&n.firstContext!==null&&((n.lanes&s)!==0&&(ii=!0),n.firstContext=null)}function Ci(n){var s=n._currentValue;if(th!==n)if(n={context:n,memoizedValue:s,next:null},Ba===null){if(Lc===null)throw Error(t(308));Ba=n,Lc.dependencies={lanes:0,firstContext:n}}else Ba=Ba.next=n;return s}var qs=null;function sh(n){qs===null?qs=[n]:qs.push(n)}function Gg(n,s,o,u){var p=s.interleaved;return p===null?(o.next=o,sh(s)):(o.next=p.next,p.next=o),s.interleaved=o,br(n,u)}function br(n,s){n.lanes|=s;var o=n.alternate;for(o!==null&&(o.lanes|=s),o=n,n=n.return;n!==null;)n.childLanes|=s,o=n.alternate,o!==null&&(o.childLanes|=s),o=n,n=n.return;return o.tag===3?o.stateNode:null}var as=!1;function ah(n){n.updateQueue={baseState:n.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function Wg(n,s){n=n.updateQueue,s.updateQueue===n&&(s.updateQueue={baseState:n.baseState,firstBaseUpdate:n.firstBaseUpdate,lastBaseUpdate:n.lastBaseUpdate,shared:n.shared,effects:n.effects})}function Cr(n,s){return{eventTime:n,lane:s,tag:0,payload:null,callback:null,next:null}}function os(n,s,o){var u=n.updateQueue;if(u===null)return null;if(u=u.shared,(Pt&2)!==0){var p=u.pending;return p===null?s.next=s:(s.next=p.next,p.next=s),u.pending=s,br(n,o)}return p=u.interleaved,p===null?(s.next=s,sh(u)):(s.next=p.next,p.next=s),u.interleaved=s,br(n,o)}function Dc(n,s,o){if(s=s.updateQueue,s!==null&&(s=s.shared,(o&4194240)!==0)){var u=s.lanes;u&=n.pendingLanes,o|=u,s.lanes=o,ei(n,o)}}function jg(n,s){var o=n.updateQueue,u=n.alternate;if(u!==null&&(u=u.updateQueue,o===u)){var p=null,_=null;if(o=o.firstBaseUpdate,o!==null){do{var R={eventTime:o.eventTime,lane:o.lane,tag:o.tag,payload:o.payload,callback:o.callback,next:null};_===null?p=_=R:_=_.next=R,o=o.next}while(o!==null);_===null?p=_=s:_=_.next=s}else p=_=s;o={baseState:u.baseState,firstBaseUpdate:p,lastBaseUpdate:_,shared:u.shared,effects:u.effects},n.updateQueue=o;return}n=o.lastBaseUpdate,n===null?o.firstBaseUpdate=s:n.next=s,o.lastBaseUpdate=s}function Ic(n,s,o,u){var p=n.updateQueue;as=!1;var _=p.firstBaseUpdate,R=p.lastBaseUpdate,z=p.shared.pending;if(z!==null){p.shared.pending=null;var W=z,me=W.next;W.next=null,R===null?_=me:R.next=me,R=W;var be=n.alternate;be!==null&&(be=be.updateQueue,z=be.lastBaseUpdate,z!==R&&(z===null?be.firstBaseUpdate=me:z.next=me,be.lastBaseUpdate=W))}if(_!==null){var Ce=p.baseState;R=0,be=me=W=null,z=_;do{var we=z.lane,Ve=z.eventTime;if((u&we)===we){be!==null&&(be=be.next={eventTime:Ve,lane:0,tag:z.tag,payload:z.payload,callback:z.callback,next:null});e:{var Ye=n,Ze=z;switch(we=s,Ve=o,Ze.tag){case 1:if(Ye=Ze.payload,typeof Ye=="function"){Ce=Ye.call(Ve,Ce,we);break e}Ce=Ye;break e;case 3:Ye.flags=Ye.flags&-65537|128;case 0:if(Ye=Ze.payload,we=typeof Ye=="function"?Ye.call(Ve,Ce,we):Ye,we==null)break e;Ce=he({},Ce,we);break e;case 2:as=!0}}z.callback!==null&&z.lane!==0&&(n.flags|=64,we=p.effects,we===null?p.effects=[z]:we.push(z))}else Ve={eventTime:Ve,lane:we,tag:z.tag,payload:z.payload,callback:z.callback,next:null},be===null?(me=be=Ve,W=Ce):be=be.next=Ve,R|=we;if(z=z.next,z===null){if(z=p.shared.pending,z===null)break;we=z,z=we.next,we.next=null,p.lastBaseUpdate=we,p.shared.pending=null}}while(!0);if(be===null&&(W=Ce),p.baseState=W,p.firstBaseUpdate=me,p.lastBaseUpdate=be,s=p.shared.interleaved,s!==null){p=s;do R|=p.lane,p=p.next;while(p!==s)}else _===null&&(p.shared.lanes=0);Qs|=R,n.lanes=R,n.memoizedState=Ce}}function Xg(n,s,o){if(n=s.effects,s.effects=null,n!==null)for(s=0;s<n.length;s++){var u=n[s],p=u.callback;if(p!==null){if(u.callback=null,u=o,typeof p!="function")throw Error(t(191,p));p.call(u)}}}var dl={},ir=is(dl),hl=is(dl),fl=is(dl);function Ys(n){if(n===dl)throw Error(t(174));return n}function oh(n,s){switch(Xt(fl,s),Xt(hl,n),Xt(ir,dl),n=s.nodeType,n){case 9:case 11:s=(s=s.documentElement)?s.namespaceURI:b(null,"");break;default:n=n===8?s.parentNode:s,s=n.namespaceURI||null,n=n.tagName,s=b(s,n)}Qt(ir),Xt(ir,s)}function Va(){Qt(ir),Qt(hl),Qt(fl)}function $g(n){Ys(fl.current);var s=Ys(ir.current),o=b(s,n.type);s!==o&&(Xt(hl,n),Xt(ir,o))}function lh(n){hl.current===n&&(Qt(ir),Qt(hl))}var an=is(0);function Uc(n){for(var s=n;s!==null;){if(s.tag===13){var o=s.memoizedState;if(o!==null&&(o=o.dehydrated,o===null||o.data==="$?"||o.data==="$!"))return s}else if(s.tag===19&&s.memoizedProps.revealOrder!==void 0){if((s.flags&128)!==0)return s}else if(s.child!==null){s.child.return=s,s=s.child;continue}if(s===n)break;for(;s.sibling===null;){if(s.return===null||s.return===n)return null;s=s.return}s.sibling.return=s.return,s=s.sibling}return null}var ch=[];function uh(){for(var n=0;n<ch.length;n++)ch[n]._workInProgressVersionPrimary=null;ch.length=0}var Fc=C.ReactCurrentDispatcher,dh=C.ReactCurrentBatchConfig,Ks=0,on=null,_n=null,bn=null,Oc=!1,pl=!1,ml=0,PS=0;function kn(){throw Error(t(321))}function hh(n,s){if(s===null)return!1;for(var o=0;o<s.length&&o<n.length;o++)if(!ki(n[o],s[o]))return!1;return!0}function fh(n,s,o,u,p,_){if(Ks=_,on=s,s.memoizedState=null,s.updateQueue=null,s.lanes=0,Fc.current=n===null||n.memoizedState===null?IS:US,n=o(u,p),pl){_=0;do{if(pl=!1,ml=0,25<=_)throw Error(t(301));_+=1,bn=_n=null,s.updateQueue=null,Fc.current=FS,n=o(u,p)}while(pl)}if(Fc.current=Bc,s=_n!==null&&_n.next!==null,Ks=0,bn=_n=on=null,Oc=!1,s)throw Error(t(300));return n}function ph(){var n=ml!==0;return ml=0,n}function rr(){var n={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return bn===null?on.memoizedState=bn=n:bn=bn.next=n,bn}function Ri(){if(_n===null){var n=on.alternate;n=n!==null?n.memoizedState:null}else n=_n.next;var s=bn===null?on.memoizedState:bn.next;if(s!==null)bn=s,_n=n;else{if(n===null)throw Error(t(310));_n=n,n={memoizedState:_n.memoizedState,baseState:_n.baseState,baseQueue:_n.baseQueue,queue:_n.queue,next:null},bn===null?on.memoizedState=bn=n:bn=bn.next=n}return bn}function gl(n,s){return typeof s=="function"?s(n):s}function mh(n){var s=Ri(),o=s.queue;if(o===null)throw Error(t(311));o.lastRenderedReducer=n;var u=_n,p=u.baseQueue,_=o.pending;if(_!==null){if(p!==null){var R=p.next;p.next=_.next,_.next=R}u.baseQueue=p=_,o.pending=null}if(p!==null){_=p.next,u=u.baseState;var z=R=null,W=null,me=_;do{var be=me.lane;if((Ks&be)===be)W!==null&&(W=W.next={lane:0,action:me.action,hasEagerState:me.hasEagerState,eagerState:me.eagerState,next:null}),u=me.hasEagerState?me.eagerState:n(u,me.action);else{var Ce={lane:be,action:me.action,hasEagerState:me.hasEagerState,eagerState:me.eagerState,next:null};W===null?(z=W=Ce,R=u):W=W.next=Ce,on.lanes|=be,Qs|=be}me=me.next}while(me!==null&&me!==_);W===null?R=u:W.next=z,ki(u,s.memoizedState)||(ii=!0),s.memoizedState=u,s.baseState=R,s.baseQueue=W,o.lastRenderedState=u}if(n=o.interleaved,n!==null){p=n;do _=p.lane,on.lanes|=_,Qs|=_,p=p.next;while(p!==n)}else p===null&&(o.lanes=0);return[s.memoizedState,o.dispatch]}function gh(n){var s=Ri(),o=s.queue;if(o===null)throw Error(t(311));o.lastRenderedReducer=n;var u=o.dispatch,p=o.pending,_=s.memoizedState;if(p!==null){o.pending=null;var R=p=p.next;do _=n(_,R.action),R=R.next;while(R!==p);ki(_,s.memoizedState)||(ii=!0),s.memoizedState=_,s.baseQueue===null&&(s.baseState=_),o.lastRenderedState=_}return[_,u]}function qg(){}function Yg(n,s){var o=on,u=Ri(),p=s(),_=!ki(u.memoizedState,p);if(_&&(u.memoizedState=p,ii=!0),u=u.queue,vh(Zg.bind(null,o,u,n),[n]),u.getSnapshot!==s||_||bn!==null&&bn.memoizedState.tag&1){if(o.flags|=2048,vl(9,Qg.bind(null,o,u,p,s),void 0,null),Cn===null)throw Error(t(349));(Ks&30)!==0||Kg(o,s,p)}return p}function Kg(n,s,o){n.flags|=16384,n={getSnapshot:s,value:o},s=on.updateQueue,s===null?(s={lastEffect:null,stores:null},on.updateQueue=s,s.stores=[n]):(o=s.stores,o===null?s.stores=[n]:o.push(n))}function Qg(n,s,o,u){s.value=o,s.getSnapshot=u,Jg(s)&&e0(n)}function Zg(n,s,o){return o(function(){Jg(s)&&e0(n)})}function Jg(n){var s=n.getSnapshot;n=n.value;try{var o=s();return!ki(n,o)}catch{return!0}}function e0(n){var s=br(n,1);s!==null&&Gi(s,n,1,-1)}function t0(n){var s=rr();return typeof n=="function"&&(n=n()),s.memoizedState=s.baseState=n,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:gl,lastRenderedState:n},s.queue=n,n=n.dispatch=DS.bind(null,on,n),[s.memoizedState,n]}function vl(n,s,o,u){return n={tag:n,create:s,destroy:o,deps:u,next:null},s=on.updateQueue,s===null?(s={lastEffect:null,stores:null},on.updateQueue=s,s.lastEffect=n.next=n):(o=s.lastEffect,o===null?s.lastEffect=n.next=n:(u=o.next,o.next=n,n.next=u,s.lastEffect=n)),n}function n0(){return Ri().memoizedState}function kc(n,s,o,u){var p=rr();on.flags|=n,p.memoizedState=vl(1|s,o,void 0,u===void 0?null:u)}function zc(n,s,o,u){var p=Ri();u=u===void 0?null:u;var _=void 0;if(_n!==null){var R=_n.memoizedState;if(_=R.destroy,u!==null&&hh(u,R.deps)){p.memoizedState=vl(s,o,_,u);return}}on.flags|=n,p.memoizedState=vl(1|s,o,_,u)}function i0(n,s){return kc(8390656,8,n,s)}function vh(n,s){return zc(2048,8,n,s)}function r0(n,s){return zc(4,2,n,s)}function s0(n,s){return zc(4,4,n,s)}function a0(n,s){if(typeof s=="function")return n=n(),s(n),function(){s(null)};if(s!=null)return n=n(),s.current=n,function(){s.current=null}}function o0(n,s,o){return o=o!=null?o.concat([n]):null,zc(4,4,a0.bind(null,s,n),o)}function xh(){}function l0(n,s){var o=Ri();s=s===void 0?null:s;var u=o.memoizedState;return u!==null&&s!==null&&hh(s,u[1])?u[0]:(o.memoizedState=[n,s],n)}function c0(n,s){var o=Ri();s=s===void 0?null:s;var u=o.memoizedState;return u!==null&&s!==null&&hh(s,u[1])?u[0]:(n=n(),o.memoizedState=[n,s],n)}function u0(n,s,o){return(Ks&21)===0?(n.baseState&&(n.baseState=!1,ii=!0),n.memoizedState=o):(ki(o,s)||(o=He(),on.lanes|=o,Qs|=o,n.baseState=!0),s)}function NS(n,s){var o=yt;yt=o!==0&&4>o?o:4,n(!0);var u=dh.transition;dh.transition={};try{n(!1),s()}finally{yt=o,dh.transition=u}}function d0(){return Ri().memoizedState}function LS(n,s,o){var u=ds(n);if(o={lane:u,action:o,hasEagerState:!1,eagerState:null,next:null},h0(n))f0(s,o);else if(o=Gg(n,s,o,u),o!==null){var p=qn();Gi(o,n,u,p),p0(o,s,u)}}function DS(n,s,o){var u=ds(n),p={lane:u,action:o,hasEagerState:!1,eagerState:null,next:null};if(h0(n))f0(s,p);else{var _=n.alternate;if(n.lanes===0&&(_===null||_.lanes===0)&&(_=s.lastRenderedReducer,_!==null))try{var R=s.lastRenderedState,z=_(R,o);if(p.hasEagerState=!0,p.eagerState=z,ki(z,R)){var W=s.interleaved;W===null?(p.next=p,sh(s)):(p.next=W.next,W.next=p),s.interleaved=p;return}}catch{}finally{}o=Gg(n,s,p,u),o!==null&&(p=qn(),Gi(o,n,u,p),p0(o,s,u))}}function h0(n){var s=n.alternate;return n===on||s!==null&&s===on}function f0(n,s){pl=Oc=!0;var o=n.pending;o===null?s.next=s:(s.next=o.next,o.next=s),n.pending=s}function p0(n,s,o){if((o&4194240)!==0){var u=s.lanes;u&=n.pendingLanes,o|=u,s.lanes=o,ei(n,o)}}var Bc={readContext:Ci,useCallback:kn,useContext:kn,useEffect:kn,useImperativeHandle:kn,useInsertionEffect:kn,useLayoutEffect:kn,useMemo:kn,useReducer:kn,useRef:kn,useState:kn,useDebugValue:kn,useDeferredValue:kn,useTransition:kn,useMutableSource:kn,useSyncExternalStore:kn,useId:kn,unstable_isNewReconciler:!1},IS={readContext:Ci,useCallback:function(n,s){return rr().memoizedState=[n,s===void 0?null:s],n},useContext:Ci,useEffect:i0,useImperativeHandle:function(n,s,o){return o=o!=null?o.concat([n]):null,kc(4194308,4,a0.bind(null,s,n),o)},useLayoutEffect:function(n,s){return kc(4194308,4,n,s)},useInsertionEffect:function(n,s){return kc(4,2,n,s)},useMemo:function(n,s){var o=rr();return s=s===void 0?null:s,n=n(),o.memoizedState=[n,s],n},useReducer:function(n,s,o){var u=rr();return s=o!==void 0?o(s):s,u.memoizedState=u.baseState=s,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:n,lastRenderedState:s},u.queue=n,n=n.dispatch=LS.bind(null,on,n),[u.memoizedState,n]},useRef:function(n){var s=rr();return n={current:n},s.memoizedState=n},useState:t0,useDebugValue:xh,useDeferredValue:function(n){return rr().memoizedState=n},useTransition:function(){var n=t0(!1),s=n[0];return n=NS.bind(null,n[1]),rr().memoizedState=n,[s,n]},useMutableSource:function(){},useSyncExternalStore:function(n,s,o){var u=on,p=rr();if(tn){if(o===void 0)throw Error(t(407));o=o()}else{if(o=s(),Cn===null)throw Error(t(349));(Ks&30)!==0||Kg(u,s,o)}p.memoizedState=o;var _={value:o,getSnapshot:s};return p.queue=_,i0(Zg.bind(null,u,_,n),[n]),u.flags|=2048,vl(9,Qg.bind(null,u,_,o,s),void 0,null),o},useId:function(){var n=rr(),s=Cn.identifierPrefix;if(tn){var o=Tr,u=wr;o=(u&~(1<<32-Pe(u)-1)).toString(32)+o,s=":"+s+"R"+o,o=ml++,0<o&&(s+="H"+o.toString(32)),s+=":"}else o=PS++,s=":"+s+"r"+o.toString(32)+":";return n.memoizedState=s},unstable_isNewReconciler:!1},US={readContext:Ci,useCallback:l0,useContext:Ci,useEffect:vh,useImperativeHandle:o0,useInsertionEffect:r0,useLayoutEffect:s0,useMemo:c0,useReducer:mh,useRef:n0,useState:function(){return mh(gl)},useDebugValue:xh,useDeferredValue:function(n){var s=Ri();return u0(s,_n.memoizedState,n)},useTransition:function(){var n=mh(gl)[0],s=Ri().memoizedState;return[n,s]},useMutableSource:qg,useSyncExternalStore:Yg,useId:d0,unstable_isNewReconciler:!1},FS={readContext:Ci,useCallback:l0,useContext:Ci,useEffect:vh,useImperativeHandle:o0,useInsertionEffect:r0,useLayoutEffect:s0,useMemo:c0,useReducer:gh,useRef:n0,useState:function(){return gh(gl)},useDebugValue:xh,useDeferredValue:function(n){var s=Ri();return _n===null?s.memoizedState=n:u0(s,_n.memoizedState,n)},useTransition:function(){var n=gh(gl)[0],s=Ri().memoizedState;return[n,s]},useMutableSource:qg,useSyncExternalStore:Yg,useId:d0,unstable_isNewReconciler:!1};function Bi(n,s){if(n&&n.defaultProps){s=he({},s),n=n.defaultProps;for(var o in n)s[o]===void 0&&(s[o]=n[o]);return s}return s}function _h(n,s,o,u){s=n.memoizedState,o=o(u,s),o=o==null?s:he({},s,o),n.memoizedState=o,n.lanes===0&&(n.updateQueue.baseState=o)}var Hc={isMounted:function(n){return(n=n._reactInternals)?Xn(n)===n:!1},enqueueSetState:function(n,s,o){n=n._reactInternals;var u=qn(),p=ds(n),_=Cr(u,p);_.payload=s,o!=null&&(_.callback=o),s=os(n,_,p),s!==null&&(Gi(s,n,p,u),Dc(s,n,p))},enqueueReplaceState:function(n,s,o){n=n._reactInternals;var u=qn(),p=ds(n),_=Cr(u,p);_.tag=1,_.payload=s,o!=null&&(_.callback=o),s=os(n,_,p),s!==null&&(Gi(s,n,p,u),Dc(s,n,p))},enqueueForceUpdate:function(n,s){n=n._reactInternals;var o=qn(),u=ds(n),p=Cr(o,u);p.tag=2,s!=null&&(p.callback=s),s=os(n,p,u),s!==null&&(Gi(s,n,u,o),Dc(s,n,u))}};function m0(n,s,o,u,p,_,R){return n=n.stateNode,typeof n.shouldComponentUpdate=="function"?n.shouldComponentUpdate(u,_,R):s.prototype&&s.prototype.isPureReactComponent?!il(o,u)||!il(p,_):!0}function g0(n,s,o){var u=!1,p=rs,_=s.contextType;return typeof _=="object"&&_!==null?_=Ci(_):(p=ni(s)?js:On.current,u=s.contextTypes,_=(u=u!=null)?Ua(n,p):rs),s=new s(o,_),n.memoizedState=s.state!==null&&s.state!==void 0?s.state:null,s.updater=Hc,n.stateNode=s,s._reactInternals=n,u&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=p,n.__reactInternalMemoizedMaskedChildContext=_),s}function v0(n,s,o,u){n=s.state,typeof s.componentWillReceiveProps=="function"&&s.componentWillReceiveProps(o,u),typeof s.UNSAFE_componentWillReceiveProps=="function"&&s.UNSAFE_componentWillReceiveProps(o,u),s.state!==n&&Hc.enqueueReplaceState(s,s.state,null)}function yh(n,s,o,u){var p=n.stateNode;p.props=o,p.state=n.memoizedState,p.refs={},ah(n);var _=s.contextType;typeof _=="object"&&_!==null?p.context=Ci(_):(_=ni(s)?js:On.current,p.context=Ua(n,_)),p.state=n.memoizedState,_=s.getDerivedStateFromProps,typeof _=="function"&&(_h(n,s,_,o),p.state=n.memoizedState),typeof s.getDerivedStateFromProps=="function"||typeof p.getSnapshotBeforeUpdate=="function"||typeof p.UNSAFE_componentWillMount!="function"&&typeof p.componentWillMount!="function"||(s=p.state,typeof p.componentWillMount=="function"&&p.componentWillMount(),typeof p.UNSAFE_componentWillMount=="function"&&p.UNSAFE_componentWillMount(),s!==p.state&&Hc.enqueueReplaceState(p,p.state,null),Ic(n,o,p,u),p.state=n.memoizedState),typeof p.componentDidMount=="function"&&(n.flags|=4194308)}function Ga(n,s){try{var o="",u=s;do o+=Ge(u),u=u.return;while(u);var p=o}catch(_){p=`
Error generating stack: `+_.message+`
`+_.stack}return{value:n,source:s,stack:p,digest:null}}function Sh(n,s,o){return{value:n,source:null,stack:o??null,digest:s??null}}function Mh(n,s){try{console.error(s.value)}catch(o){setTimeout(function(){throw o})}}var OS=typeof WeakMap=="function"?WeakMap:Map;function x0(n,s,o){o=Cr(-1,o),o.tag=3,o.payload={element:null};var u=s.value;return o.callback=function(){qc||(qc=!0,Oh=u),Mh(n,s)},o}function _0(n,s,o){o=Cr(-1,o),o.tag=3;var u=n.type.getDerivedStateFromError;if(typeof u=="function"){var p=s.value;o.payload=function(){return u(p)},o.callback=function(){Mh(n,s)}}var _=n.stateNode;return _!==null&&typeof _.componentDidCatch=="function"&&(o.callback=function(){Mh(n,s),typeof u!="function"&&(cs===null?cs=new Set([this]):cs.add(this));var R=s.stack;this.componentDidCatch(s.value,{componentStack:R!==null?R:""})}),o}function y0(n,s,o){var u=n.pingCache;if(u===null){u=n.pingCache=new OS;var p=new Set;u.set(s,p)}else p=u.get(s),p===void 0&&(p=new Set,u.set(s,p));p.has(o)||(p.add(o),n=QS.bind(null,n,s,o),s.then(n,n))}function S0(n){do{var s;if((s=n.tag===13)&&(s=n.memoizedState,s=s!==null?s.dehydrated!==null:!0),s)return n;n=n.return}while(n!==null);return null}function M0(n,s,o,u,p){return(n.mode&1)===0?(n===s?n.flags|=65536:(n.flags|=128,o.flags|=131072,o.flags&=-52805,o.tag===1&&(o.alternate===null?o.tag=17:(s=Cr(-1,1),s.tag=2,os(o,s,1))),o.lanes|=1),n):(n.flags|=65536,n.lanes=p,n)}var kS=C.ReactCurrentOwner,ii=!1;function $n(n,s,o,u){s.child=n===null?Vg(s,null,o,u):za(s,n.child,o,u)}function E0(n,s,o,u,p){o=o.render;var _=s.ref;return Ha(s,p),u=fh(n,s,o,u,_,p),o=ph(),n!==null&&!ii?(s.updateQueue=n.updateQueue,s.flags&=-2053,n.lanes&=~p,Rr(n,s,p)):(tn&&o&&Kd(s),s.flags|=1,$n(n,s,u,p),s.child)}function w0(n,s,o,u,p){if(n===null){var _=o.type;return typeof _=="function"&&!Wh(_)&&_.defaultProps===void 0&&o.compare===null&&o.defaultProps===void 0?(s.tag=15,s.type=_,T0(n,s,_,u,p)):(n=eu(o.type,null,u,s,s.mode,p),n.ref=s.ref,n.return=s,s.child=n)}if(_=n.child,(n.lanes&p)===0){var R=_.memoizedProps;if(o=o.compare,o=o!==null?o:il,o(R,u)&&n.ref===s.ref)return Rr(n,s,p)}return s.flags|=1,n=fs(_,u),n.ref=s.ref,n.return=s,s.child=n}function T0(n,s,o,u,p){if(n!==null){var _=n.memoizedProps;if(il(_,u)&&n.ref===s.ref)if(ii=!1,s.pendingProps=u=_,(n.lanes&p)!==0)(n.flags&131072)!==0&&(ii=!0);else return s.lanes=n.lanes,Rr(n,s,p)}return Eh(n,s,o,u,p)}function b0(n,s,o){var u=s.pendingProps,p=u.children,_=n!==null?n.memoizedState:null;if(u.mode==="hidden")if((s.mode&1)===0)s.memoizedState={baseLanes:0,cachePool:null,transitions:null},Xt(ja,gi),gi|=o;else{if((o&1073741824)===0)return n=_!==null?_.baseLanes|o:o,s.lanes=s.childLanes=1073741824,s.memoizedState={baseLanes:n,cachePool:null,transitions:null},s.updateQueue=null,Xt(ja,gi),gi|=n,null;s.memoizedState={baseLanes:0,cachePool:null,transitions:null},u=_!==null?_.baseLanes:o,Xt(ja,gi),gi|=u}else _!==null?(u=_.baseLanes|o,s.memoizedState=null):u=o,Xt(ja,gi),gi|=u;return $n(n,s,p,o),s.child}function C0(n,s){var o=s.ref;(n===null&&o!==null||n!==null&&n.ref!==o)&&(s.flags|=512,s.flags|=2097152)}function Eh(n,s,o,u,p){var _=ni(o)?js:On.current;return _=Ua(s,_),Ha(s,p),o=fh(n,s,o,u,_,p),u=ph(),n!==null&&!ii?(s.updateQueue=n.updateQueue,s.flags&=-2053,n.lanes&=~p,Rr(n,s,p)):(tn&&u&&Kd(s),s.flags|=1,$n(n,s,o,p),s.child)}function R0(n,s,o,u,p){if(ni(o)){var _=!0;Tc(s)}else _=!1;if(Ha(s,p),s.stateNode===null)Gc(n,s),g0(s,o,u),yh(s,o,u,p),u=!0;else if(n===null){var R=s.stateNode,z=s.memoizedProps;R.props=z;var W=R.context,me=o.contextType;typeof me=="object"&&me!==null?me=Ci(me):(me=ni(o)?js:On.current,me=Ua(s,me));var be=o.getDerivedStateFromProps,Ce=typeof be=="function"||typeof R.getSnapshotBeforeUpdate=="function";Ce||typeof R.UNSAFE_componentWillReceiveProps!="function"&&typeof R.componentWillReceiveProps!="function"||(z!==u||W!==me)&&v0(s,R,u,me),as=!1;var we=s.memoizedState;R.state=we,Ic(s,u,R,p),W=s.memoizedState,z!==u||we!==W||ti.current||as?(typeof be=="function"&&(_h(s,o,be,u),W=s.memoizedState),(z=as||m0(s,o,z,u,we,W,me))?(Ce||typeof R.UNSAFE_componentWillMount!="function"&&typeof R.componentWillMount!="function"||(typeof R.componentWillMount=="function"&&R.componentWillMount(),typeof R.UNSAFE_componentWillMount=="function"&&R.UNSAFE_componentWillMount()),typeof R.componentDidMount=="function"&&(s.flags|=4194308)):(typeof R.componentDidMount=="function"&&(s.flags|=4194308),s.memoizedProps=u,s.memoizedState=W),R.props=u,R.state=W,R.context=me,u=z):(typeof R.componentDidMount=="function"&&(s.flags|=4194308),u=!1)}else{R=s.stateNode,Wg(n,s),z=s.memoizedProps,me=s.type===s.elementType?z:Bi(s.type,z),R.props=me,Ce=s.pendingProps,we=R.context,W=o.contextType,typeof W=="object"&&W!==null?W=Ci(W):(W=ni(o)?js:On.current,W=Ua(s,W));var Ve=o.getDerivedStateFromProps;(be=typeof Ve=="function"||typeof R.getSnapshotBeforeUpdate=="function")||typeof R.UNSAFE_componentWillReceiveProps!="function"&&typeof R.componentWillReceiveProps!="function"||(z!==Ce||we!==W)&&v0(s,R,u,W),as=!1,we=s.memoizedState,R.state=we,Ic(s,u,R,p);var Ye=s.memoizedState;z!==Ce||we!==Ye||ti.current||as?(typeof Ve=="function"&&(_h(s,o,Ve,u),Ye=s.memoizedState),(me=as||m0(s,o,me,u,we,Ye,W)||!1)?(be||typeof R.UNSAFE_componentWillUpdate!="function"&&typeof R.componentWillUpdate!="function"||(typeof R.componentWillUpdate=="function"&&R.componentWillUpdate(u,Ye,W),typeof R.UNSAFE_componentWillUpdate=="function"&&R.UNSAFE_componentWillUpdate(u,Ye,W)),typeof R.componentDidUpdate=="function"&&(s.flags|=4),typeof R.getSnapshotBeforeUpdate=="function"&&(s.flags|=1024)):(typeof R.componentDidUpdate!="function"||z===n.memoizedProps&&we===n.memoizedState||(s.flags|=4),typeof R.getSnapshotBeforeUpdate!="function"||z===n.memoizedProps&&we===n.memoizedState||(s.flags|=1024),s.memoizedProps=u,s.memoizedState=Ye),R.props=u,R.state=Ye,R.context=W,u=me):(typeof R.componentDidUpdate!="function"||z===n.memoizedProps&&we===n.memoizedState||(s.flags|=4),typeof R.getSnapshotBeforeUpdate!="function"||z===n.memoizedProps&&we===n.memoizedState||(s.flags|=1024),u=!1)}return wh(n,s,o,u,_,p)}function wh(n,s,o,u,p,_){C0(n,s);var R=(s.flags&128)!==0;if(!u&&!R)return p&&Dg(s,o,!1),Rr(n,s,_);u=s.stateNode,kS.current=s;var z=R&&typeof o.getDerivedStateFromError!="function"?null:u.render();return s.flags|=1,n!==null&&R?(s.child=za(s,n.child,null,_),s.child=za(s,null,z,_)):$n(n,s,z,_),s.memoizedState=u.state,p&&Dg(s,o,!0),s.child}function A0(n){var s=n.stateNode;s.pendingContext?Ng(n,s.pendingContext,s.pendingContext!==s.context):s.context&&Ng(n,s.context,!1),oh(n,s.containerInfo)}function P0(n,s,o,u,p){return ka(),eh(p),s.flags|=256,$n(n,s,o,u),s.child}var Th={dehydrated:null,treeContext:null,retryLane:0};function bh(n){return{baseLanes:n,cachePool:null,transitions:null}}function N0(n,s,o){var u=s.pendingProps,p=an.current,_=!1,R=(s.flags&128)!==0,z;if((z=R)||(z=n!==null&&n.memoizedState===null?!1:(p&2)!==0),z?(_=!0,s.flags&=-129):(n===null||n.memoizedState!==null)&&(p|=1),Xt(an,p&1),n===null)return Jd(s),n=s.memoizedState,n!==null&&(n=n.dehydrated,n!==null)?((s.mode&1)===0?s.lanes=1:n.data==="$!"?s.lanes=8:s.lanes=1073741824,null):(R=u.children,n=u.fallback,_?(u=s.mode,_=s.child,R={mode:"hidden",children:R},(u&1)===0&&_!==null?(_.childLanes=0,_.pendingProps=R):_=tu(R,u,0,null),n=ta(n,u,o,null),_.return=s,n.return=s,_.sibling=n,s.child=_,s.child.memoizedState=bh(o),s.memoizedState=Th,n):Ch(s,R));if(p=n.memoizedState,p!==null&&(z=p.dehydrated,z!==null))return zS(n,s,R,u,z,p,o);if(_){_=u.fallback,R=s.mode,p=n.child,z=p.sibling;var W={mode:"hidden",children:u.children};return(R&1)===0&&s.child!==p?(u=s.child,u.childLanes=0,u.pendingProps=W,s.deletions=null):(u=fs(p,W),u.subtreeFlags=p.subtreeFlags&14680064),z!==null?_=fs(z,_):(_=ta(_,R,o,null),_.flags|=2),_.return=s,u.return=s,u.sibling=_,s.child=u,u=_,_=s.child,R=n.child.memoizedState,R=R===null?bh(o):{baseLanes:R.baseLanes|o,cachePool:null,transitions:R.transitions},_.memoizedState=R,_.childLanes=n.childLanes&~o,s.memoizedState=Th,u}return _=n.child,n=_.sibling,u=fs(_,{mode:"visible",children:u.children}),(s.mode&1)===0&&(u.lanes=o),u.return=s,u.sibling=null,n!==null&&(o=s.deletions,o===null?(s.deletions=[n],s.flags|=16):o.push(n)),s.child=u,s.memoizedState=null,u}function Ch(n,s){return s=tu({mode:"visible",children:s},n.mode,0,null),s.return=n,n.child=s}function Vc(n,s,o,u){return u!==null&&eh(u),za(s,n.child,null,o),n=Ch(s,s.pendingProps.children),n.flags|=2,s.memoizedState=null,n}function zS(n,s,o,u,p,_,R){if(o)return s.flags&256?(s.flags&=-257,u=Sh(Error(t(422))),Vc(n,s,R,u)):s.memoizedState!==null?(s.child=n.child,s.flags|=128,null):(_=u.fallback,p=s.mode,u=tu({mode:"visible",children:u.children},p,0,null),_=ta(_,p,R,null),_.flags|=2,u.return=s,_.return=s,u.sibling=_,s.child=u,(s.mode&1)!==0&&za(s,n.child,null,R),s.child.memoizedState=bh(R),s.memoizedState=Th,_);if((s.mode&1)===0)return Vc(n,s,R,null);if(p.data==="$!"){if(u=p.nextSibling&&p.nextSibling.dataset,u)var z=u.dgst;return u=z,_=Error(t(419)),u=Sh(_,u,void 0),Vc(n,s,R,u)}if(z=(R&n.childLanes)!==0,ii||z){if(u=Cn,u!==null){switch(R&-R){case 4:p=2;break;case 16:p=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:p=32;break;case 536870912:p=268435456;break;default:p=0}p=(p&(u.suspendedLanes|R))!==0?0:p,p!==0&&p!==_.retryLane&&(_.retryLane=p,br(n,p),Gi(u,n,p,-1))}return Gh(),u=Sh(Error(t(421))),Vc(n,s,R,u)}return p.data==="$?"?(s.flags|=128,s.child=n.child,s=ZS.bind(null,n),p._reactRetry=s,null):(n=_.treeContext,mi=ns(p.nextSibling),pi=s,tn=!0,zi=null,n!==null&&(Ti[bi++]=wr,Ti[bi++]=Tr,Ti[bi++]=Xs,wr=n.id,Tr=n.overflow,Xs=s),s=Ch(s,u.children),s.flags|=4096,s)}function L0(n,s,o){n.lanes|=s;var u=n.alternate;u!==null&&(u.lanes|=s),rh(n.return,s,o)}function Rh(n,s,o,u,p){var _=n.memoizedState;_===null?n.memoizedState={isBackwards:s,rendering:null,renderingStartTime:0,last:u,tail:o,tailMode:p}:(_.isBackwards=s,_.rendering=null,_.renderingStartTime=0,_.last=u,_.tail=o,_.tailMode=p)}function D0(n,s,o){var u=s.pendingProps,p=u.revealOrder,_=u.tail;if($n(n,s,u.children,o),u=an.current,(u&2)!==0)u=u&1|2,s.flags|=128;else{if(n!==null&&(n.flags&128)!==0)e:for(n=s.child;n!==null;){if(n.tag===13)n.memoizedState!==null&&L0(n,o,s);else if(n.tag===19)L0(n,o,s);else if(n.child!==null){n.child.return=n,n=n.child;continue}if(n===s)break e;for(;n.sibling===null;){if(n.return===null||n.return===s)break e;n=n.return}n.sibling.return=n.return,n=n.sibling}u&=1}if(Xt(an,u),(s.mode&1)===0)s.memoizedState=null;else switch(p){case"forwards":for(o=s.child,p=null;o!==null;)n=o.alternate,n!==null&&Uc(n)===null&&(p=o),o=o.sibling;o=p,o===null?(p=s.child,s.child=null):(p=o.sibling,o.sibling=null),Rh(s,!1,p,o,_);break;case"backwards":for(o=null,p=s.child,s.child=null;p!==null;){if(n=p.alternate,n!==null&&Uc(n)===null){s.child=p;break}n=p.sibling,p.sibling=o,o=p,p=n}Rh(s,!0,o,null,_);break;case"together":Rh(s,!1,null,null,void 0);break;default:s.memoizedState=null}return s.child}function Gc(n,s){(s.mode&1)===0&&n!==null&&(n.alternate=null,s.alternate=null,s.flags|=2)}function Rr(n,s,o){if(n!==null&&(s.dependencies=n.dependencies),Qs|=s.lanes,(o&s.childLanes)===0)return null;if(n!==null&&s.child!==n.child)throw Error(t(153));if(s.child!==null){for(n=s.child,o=fs(n,n.pendingProps),s.child=o,o.return=s;n.sibling!==null;)n=n.sibling,o=o.sibling=fs(n,n.pendingProps),o.return=s;o.sibling=null}return s.child}function BS(n,s,o){switch(s.tag){case 3:A0(s),ka();break;case 5:$g(s);break;case 1:ni(s.type)&&Tc(s);break;case 4:oh(s,s.stateNode.containerInfo);break;case 10:var u=s.type._context,p=s.memoizedProps.value;Xt(Nc,u._currentValue),u._currentValue=p;break;case 13:if(u=s.memoizedState,u!==null)return u.dehydrated!==null?(Xt(an,an.current&1),s.flags|=128,null):(o&s.child.childLanes)!==0?N0(n,s,o):(Xt(an,an.current&1),n=Rr(n,s,o),n!==null?n.sibling:null);Xt(an,an.current&1);break;case 19:if(u=(o&s.childLanes)!==0,(n.flags&128)!==0){if(u)return D0(n,s,o);s.flags|=128}if(p=s.memoizedState,p!==null&&(p.rendering=null,p.tail=null,p.lastEffect=null),Xt(an,an.current),u)break;return null;case 22:case 23:return s.lanes=0,b0(n,s,o)}return Rr(n,s,o)}var I0,Ah,U0,F0;I0=function(n,s){for(var o=s.child;o!==null;){if(o.tag===5||o.tag===6)n.appendChild(o.stateNode);else if(o.tag!==4&&o.child!==null){o.child.return=o,o=o.child;continue}if(o===s)break;for(;o.sibling===null;){if(o.return===null||o.return===s)return;o=o.return}o.sibling.return=o.return,o=o.sibling}},Ah=function(){},U0=function(n,s,o,u){var p=n.memoizedProps;if(p!==u){n=s.stateNode,Ys(ir.current);var _=null;switch(o){case"input":p=At(n,p),u=At(n,u),_=[];break;case"select":p=he({},p,{value:void 0}),u=he({},u,{value:void 0}),_=[];break;case"textarea":p=Gt(n,p),u=Gt(n,u),_=[];break;default:typeof p.onClick!="function"&&typeof u.onClick=="function"&&(n.onclick=Mc)}Xe(o,u);var R;o=null;for(me in p)if(!u.hasOwnProperty(me)&&p.hasOwnProperty(me)&&p[me]!=null)if(me==="style"){var z=p[me];for(R in z)z.hasOwnProperty(R)&&(o||(o={}),o[R]="")}else me!=="dangerouslySetInnerHTML"&&me!=="children"&&me!=="suppressContentEditableWarning"&&me!=="suppressHydrationWarning"&&me!=="autoFocus"&&(a.hasOwnProperty(me)?_||(_=[]):(_=_||[]).push(me,null));for(me in u){var W=u[me];if(z=p!=null?p[me]:void 0,u.hasOwnProperty(me)&&W!==z&&(W!=null||z!=null))if(me==="style")if(z){for(R in z)!z.hasOwnProperty(R)||W&&W.hasOwnProperty(R)||(o||(o={}),o[R]="");for(R in W)W.hasOwnProperty(R)&&z[R]!==W[R]&&(o||(o={}),o[R]=W[R])}else o||(_||(_=[]),_.push(me,o)),o=W;else me==="dangerouslySetInnerHTML"?(W=W?W.__html:void 0,z=z?z.__html:void 0,W!=null&&z!==W&&(_=_||[]).push(me,W)):me==="children"?typeof W!="string"&&typeof W!="number"||(_=_||[]).push(me,""+W):me!=="suppressContentEditableWarning"&&me!=="suppressHydrationWarning"&&(a.hasOwnProperty(me)?(W!=null&&me==="onScroll"&&Kt("scroll",n),_||z===W||(_=[])):(_=_||[]).push(me,W))}o&&(_=_||[]).push("style",o);var me=_;(s.updateQueue=me)&&(s.flags|=4)}},F0=function(n,s,o,u){o!==u&&(s.flags|=4)};function xl(n,s){if(!tn)switch(n.tailMode){case"hidden":s=n.tail;for(var o=null;s!==null;)s.alternate!==null&&(o=s),s=s.sibling;o===null?n.tail=null:o.sibling=null;break;case"collapsed":o=n.tail;for(var u=null;o!==null;)o.alternate!==null&&(u=o),o=o.sibling;u===null?s||n.tail===null?n.tail=null:n.tail.sibling=null:u.sibling=null}}function zn(n){var s=n.alternate!==null&&n.alternate.child===n.child,o=0,u=0;if(s)for(var p=n.child;p!==null;)o|=p.lanes|p.childLanes,u|=p.subtreeFlags&14680064,u|=p.flags&14680064,p.return=n,p=p.sibling;else for(p=n.child;p!==null;)o|=p.lanes|p.childLanes,u|=p.subtreeFlags,u|=p.flags,p.return=n,p=p.sibling;return n.subtreeFlags|=u,n.childLanes=o,s}function HS(n,s,o){var u=s.pendingProps;switch(Qd(s),s.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return zn(s),null;case 1:return ni(s.type)&&wc(),zn(s),null;case 3:return u=s.stateNode,Va(),Qt(ti),Qt(On),uh(),u.pendingContext&&(u.context=u.pendingContext,u.pendingContext=null),(n===null||n.child===null)&&(Ac(s)?s.flags|=4:n===null||n.memoizedState.isDehydrated&&(s.flags&256)===0||(s.flags|=1024,zi!==null&&(Bh(zi),zi=null))),Ah(n,s),zn(s),null;case 5:lh(s);var p=Ys(fl.current);if(o=s.type,n!==null&&s.stateNode!=null)U0(n,s,o,u,p),n.ref!==s.ref&&(s.flags|=512,s.flags|=2097152);else{if(!u){if(s.stateNode===null)throw Error(t(166));return zn(s),null}if(n=Ys(ir.current),Ac(s)){u=s.stateNode,o=s.type;var _=s.memoizedProps;switch(u[nr]=s,u[ll]=_,n=(s.mode&1)!==0,o){case"dialog":Kt("cancel",u),Kt("close",u);break;case"iframe":case"object":case"embed":Kt("load",u);break;case"video":case"audio":for(p=0;p<sl.length;p++)Kt(sl[p],u);break;case"source":Kt("error",u);break;case"img":case"image":case"link":Kt("error",u),Kt("load",u);break;case"details":Kt("toggle",u);break;case"input":Et(u,_),Kt("invalid",u);break;case"select":u._wrapperState={wasMultiple:!!_.multiple},Kt("invalid",u);break;case"textarea":Y(u,_),Kt("invalid",u)}Xe(o,_),p=null;for(var R in _)if(_.hasOwnProperty(R)){var z=_[R];R==="children"?typeof z=="string"?u.textContent!==z&&(_.suppressHydrationWarning!==!0&&Sc(u.textContent,z,n),p=["children",z]):typeof z=="number"&&u.textContent!==""+z&&(_.suppressHydrationWarning!==!0&&Sc(u.textContent,z,n),p=["children",""+z]):a.hasOwnProperty(R)&&z!=null&&R==="onScroll"&&Kt("scroll",u)}switch(o){case"input":tt(u),$t(u,_,!0);break;case"textarea":tt(u),Ct(u);break;case"select":case"option":break;default:typeof _.onClick=="function"&&(u.onclick=Mc)}u=p,s.updateQueue=u,u!==null&&(s.flags|=4)}else{R=p.nodeType===9?p:p.ownerDocument,n==="http://www.w3.org/1999/xhtml"&&(n=U(o)),n==="http://www.w3.org/1999/xhtml"?o==="script"?(n=R.createElement("div"),n.innerHTML="<script><\/script>",n=n.removeChild(n.firstChild)):typeof u.is=="string"?n=R.createElement(o,{is:u.is}):(n=R.createElement(o),o==="select"&&(R=n,u.multiple?R.multiple=!0:u.size&&(R.size=u.size))):n=R.createElementNS(n,o),n[nr]=s,n[ll]=u,I0(n,s,!1,!1),s.stateNode=n;e:{switch(R=ne(o,u),o){case"dialog":Kt("cancel",n),Kt("close",n),p=u;break;case"iframe":case"object":case"embed":Kt("load",n),p=u;break;case"video":case"audio":for(p=0;p<sl.length;p++)Kt(sl[p],n);p=u;break;case"source":Kt("error",n),p=u;break;case"img":case"image":case"link":Kt("error",n),Kt("load",n),p=u;break;case"details":Kt("toggle",n),p=u;break;case"input":Et(n,u),p=At(n,u),Kt("invalid",n);break;case"option":p=u;break;case"select":n._wrapperState={wasMultiple:!!u.multiple},p=he({},u,{value:void 0}),Kt("invalid",n);break;case"textarea":Y(n,u),p=Gt(n,u),Kt("invalid",n);break;default:p=u}Xe(o,p),z=p;for(_ in z)if(z.hasOwnProperty(_)){var W=z[_];_==="style"?_e(n,W):_==="dangerouslySetInnerHTML"?(W=W?W.__html:void 0,W!=null&&se(n,W)):_==="children"?typeof W=="string"?(o!=="textarea"||W!=="")&&ge(n,W):typeof W=="number"&&ge(n,""+W):_!=="suppressContentEditableWarning"&&_!=="suppressHydrationWarning"&&_!=="autoFocus"&&(a.hasOwnProperty(_)?W!=null&&_==="onScroll"&&Kt("scroll",n):W!=null&&P(n,_,W,R))}switch(o){case"input":tt(n),$t(n,u,!1);break;case"textarea":tt(n),Ct(n);break;case"option":u.value!=null&&n.setAttribute("value",""+xe(u.value));break;case"select":n.multiple=!!u.multiple,_=u.value,_!=null?wt(n,!!u.multiple,_,!1):u.defaultValue!=null&&wt(n,!!u.multiple,u.defaultValue,!0);break;default:typeof p.onClick=="function"&&(n.onclick=Mc)}switch(o){case"button":case"input":case"select":case"textarea":u=!!u.autoFocus;break e;case"img":u=!0;break e;default:u=!1}}u&&(s.flags|=4)}s.ref!==null&&(s.flags|=512,s.flags|=2097152)}return zn(s),null;case 6:if(n&&s.stateNode!=null)F0(n,s,n.memoizedProps,u);else{if(typeof u!="string"&&s.stateNode===null)throw Error(t(166));if(o=Ys(fl.current),Ys(ir.current),Ac(s)){if(u=s.stateNode,o=s.memoizedProps,u[nr]=s,(_=u.nodeValue!==o)&&(n=pi,n!==null))switch(n.tag){case 3:Sc(u.nodeValue,o,(n.mode&1)!==0);break;case 5:n.memoizedProps.suppressHydrationWarning!==!0&&Sc(u.nodeValue,o,(n.mode&1)!==0)}_&&(s.flags|=4)}else u=(o.nodeType===9?o:o.ownerDocument).createTextNode(u),u[nr]=s,s.stateNode=u}return zn(s),null;case 13:if(Qt(an),u=s.memoizedState,n===null||n.memoizedState!==null&&n.memoizedState.dehydrated!==null){if(tn&&mi!==null&&(s.mode&1)!==0&&(s.flags&128)===0)zg(),ka(),s.flags|=98560,_=!1;else if(_=Ac(s),u!==null&&u.dehydrated!==null){if(n===null){if(!_)throw Error(t(318));if(_=s.memoizedState,_=_!==null?_.dehydrated:null,!_)throw Error(t(317));_[nr]=s}else ka(),(s.flags&128)===0&&(s.memoizedState=null),s.flags|=4;zn(s),_=!1}else zi!==null&&(Bh(zi),zi=null),_=!0;if(!_)return s.flags&65536?s:null}return(s.flags&128)!==0?(s.lanes=o,s):(u=u!==null,u!==(n!==null&&n.memoizedState!==null)&&u&&(s.child.flags|=8192,(s.mode&1)!==0&&(n===null||(an.current&1)!==0?yn===0&&(yn=3):Gh())),s.updateQueue!==null&&(s.flags|=4),zn(s),null);case 4:return Va(),Ah(n,s),n===null&&al(s.stateNode.containerInfo),zn(s),null;case 10:return ih(s.type._context),zn(s),null;case 17:return ni(s.type)&&wc(),zn(s),null;case 19:if(Qt(an),_=s.memoizedState,_===null)return zn(s),null;if(u=(s.flags&128)!==0,R=_.rendering,R===null)if(u)xl(_,!1);else{if(yn!==0||n!==null&&(n.flags&128)!==0)for(n=s.child;n!==null;){if(R=Uc(n),R!==null){for(s.flags|=128,xl(_,!1),u=R.updateQueue,u!==null&&(s.updateQueue=u,s.flags|=4),s.subtreeFlags=0,u=o,o=s.child;o!==null;)_=o,n=u,_.flags&=14680066,R=_.alternate,R===null?(_.childLanes=0,_.lanes=n,_.child=null,_.subtreeFlags=0,_.memoizedProps=null,_.memoizedState=null,_.updateQueue=null,_.dependencies=null,_.stateNode=null):(_.childLanes=R.childLanes,_.lanes=R.lanes,_.child=R.child,_.subtreeFlags=0,_.deletions=null,_.memoizedProps=R.memoizedProps,_.memoizedState=R.memoizedState,_.updateQueue=R.updateQueue,_.type=R.type,n=R.dependencies,_.dependencies=n===null?null:{lanes:n.lanes,firstContext:n.firstContext}),o=o.sibling;return Xt(an,an.current&1|2),s.child}n=n.sibling}_.tail!==null&&sn()>Xa&&(s.flags|=128,u=!0,xl(_,!1),s.lanes=4194304)}else{if(!u)if(n=Uc(R),n!==null){if(s.flags|=128,u=!0,o=n.updateQueue,o!==null&&(s.updateQueue=o,s.flags|=4),xl(_,!0),_.tail===null&&_.tailMode==="hidden"&&!R.alternate&&!tn)return zn(s),null}else 2*sn()-_.renderingStartTime>Xa&&o!==1073741824&&(s.flags|=128,u=!0,xl(_,!1),s.lanes=4194304);_.isBackwards?(R.sibling=s.child,s.child=R):(o=_.last,o!==null?o.sibling=R:s.child=R,_.last=R)}return _.tail!==null?(s=_.tail,_.rendering=s,_.tail=s.sibling,_.renderingStartTime=sn(),s.sibling=null,o=an.current,Xt(an,u?o&1|2:o&1),s):(zn(s),null);case 22:case 23:return Vh(),u=s.memoizedState!==null,n!==null&&n.memoizedState!==null!==u&&(s.flags|=8192),u&&(s.mode&1)!==0?(gi&1073741824)!==0&&(zn(s),s.subtreeFlags&6&&(s.flags|=8192)):zn(s),null;case 24:return null;case 25:return null}throw Error(t(156,s.tag))}function VS(n,s){switch(Qd(s),s.tag){case 1:return ni(s.type)&&wc(),n=s.flags,n&65536?(s.flags=n&-65537|128,s):null;case 3:return Va(),Qt(ti),Qt(On),uh(),n=s.flags,(n&65536)!==0&&(n&128)===0?(s.flags=n&-65537|128,s):null;case 5:return lh(s),null;case 13:if(Qt(an),n=s.memoizedState,n!==null&&n.dehydrated!==null){if(s.alternate===null)throw Error(t(340));ka()}return n=s.flags,n&65536?(s.flags=n&-65537|128,s):null;case 19:return Qt(an),null;case 4:return Va(),null;case 10:return ih(s.type._context),null;case 22:case 23:return Vh(),null;case 24:return null;default:return null}}var Wc=!1,Bn=!1,GS=typeof WeakSet=="function"?WeakSet:Set,$e=null;function Wa(n,s){var o=n.ref;if(o!==null)if(typeof o=="function")try{o(null)}catch(u){cn(n,s,u)}else o.current=null}function Ph(n,s,o){try{o()}catch(u){cn(n,s,u)}}var O0=!1;function WS(n,s){if(Vd=uc,n=mg(),Id(n)){if("selectionStart"in n)var o={start:n.selectionStart,end:n.selectionEnd};else e:{o=(o=n.ownerDocument)&&o.defaultView||window;var u=o.getSelection&&o.getSelection();if(u&&u.rangeCount!==0){o=u.anchorNode;var p=u.anchorOffset,_=u.focusNode;u=u.focusOffset;try{o.nodeType,_.nodeType}catch{o=null;break e}var R=0,z=-1,W=-1,me=0,be=0,Ce=n,we=null;t:for(;;){for(var Ve;Ce!==o||p!==0&&Ce.nodeType!==3||(z=R+p),Ce!==_||u!==0&&Ce.nodeType!==3||(W=R+u),Ce.nodeType===3&&(R+=Ce.nodeValue.length),(Ve=Ce.firstChild)!==null;)we=Ce,Ce=Ve;for(;;){if(Ce===n)break t;if(we===o&&++me===p&&(z=R),we===_&&++be===u&&(W=R),(Ve=Ce.nextSibling)!==null)break;Ce=we,we=Ce.parentNode}Ce=Ve}o=z===-1||W===-1?null:{start:z,end:W}}else o=null}o=o||{start:0,end:0}}else o=null;for(Gd={focusedElem:n,selectionRange:o},uc=!1,$e=s;$e!==null;)if(s=$e,n=s.child,(s.subtreeFlags&1028)!==0&&n!==null)n.return=s,$e=n;else for(;$e!==null;){s=$e;try{var Ye=s.alternate;if((s.flags&1024)!==0)switch(s.tag){case 0:case 11:case 15:break;case 1:if(Ye!==null){var Ze=Ye.memoizedProps,dn=Ye.memoizedState,ie=s.stateNode,$=ie.getSnapshotBeforeUpdate(s.elementType===s.type?Ze:Bi(s.type,Ze),dn);ie.__reactInternalSnapshotBeforeUpdate=$}break;case 3:var le=s.stateNode.containerInfo;le.nodeType===1?le.textContent="":le.nodeType===9&&le.documentElement&&le.removeChild(le.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(t(163))}}catch(Re){cn(s,s.return,Re)}if(n=s.sibling,n!==null){n.return=s.return,$e=n;break}$e=s.return}return Ye=O0,O0=!1,Ye}function _l(n,s,o){var u=s.updateQueue;if(u=u!==null?u.lastEffect:null,u!==null){var p=u=u.next;do{if((p.tag&n)===n){var _=p.destroy;p.destroy=void 0,_!==void 0&&Ph(s,o,_)}p=p.next}while(p!==u)}}function jc(n,s){if(s=s.updateQueue,s=s!==null?s.lastEffect:null,s!==null){var o=s=s.next;do{if((o.tag&n)===n){var u=o.create;o.destroy=u()}o=o.next}while(o!==s)}}function Nh(n){var s=n.ref;if(s!==null){var o=n.stateNode;switch(n.tag){case 5:n=o;break;default:n=o}typeof s=="function"?s(n):s.current=n}}function k0(n){var s=n.alternate;s!==null&&(n.alternate=null,k0(s)),n.child=null,n.deletions=null,n.sibling=null,n.tag===5&&(s=n.stateNode,s!==null&&(delete s[nr],delete s[ll],delete s[$d],delete s[bS],delete s[CS])),n.stateNode=null,n.return=null,n.dependencies=null,n.memoizedProps=null,n.memoizedState=null,n.pendingProps=null,n.stateNode=null,n.updateQueue=null}function z0(n){return n.tag===5||n.tag===3||n.tag===4}function B0(n){e:for(;;){for(;n.sibling===null;){if(n.return===null||z0(n.return))return null;n=n.return}for(n.sibling.return=n.return,n=n.sibling;n.tag!==5&&n.tag!==6&&n.tag!==18;){if(n.flags&2||n.child===null||n.tag===4)continue e;n.child.return=n,n=n.child}if(!(n.flags&2))return n.stateNode}}function Lh(n,s,o){var u=n.tag;if(u===5||u===6)n=n.stateNode,s?o.nodeType===8?o.parentNode.insertBefore(n,s):o.insertBefore(n,s):(o.nodeType===8?(s=o.parentNode,s.insertBefore(n,o)):(s=o,s.appendChild(n)),o=o._reactRootContainer,o!=null||s.onclick!==null||(s.onclick=Mc));else if(u!==4&&(n=n.child,n!==null))for(Lh(n,s,o),n=n.sibling;n!==null;)Lh(n,s,o),n=n.sibling}function Dh(n,s,o){var u=n.tag;if(u===5||u===6)n=n.stateNode,s?o.insertBefore(n,s):o.appendChild(n);else if(u!==4&&(n=n.child,n!==null))for(Dh(n,s,o),n=n.sibling;n!==null;)Dh(n,s,o),n=n.sibling}var Ln=null,Hi=!1;function ls(n,s,o){for(o=o.child;o!==null;)H0(n,s,o),o=o.sibling}function H0(n,s,o){if(Le&&typeof Le.onCommitFiberUnmount=="function")try{Le.onCommitFiberUnmount(ae,o)}catch{}switch(o.tag){case 5:Bn||Wa(o,s);case 6:var u=Ln,p=Hi;Ln=null,ls(n,s,o),Ln=u,Hi=p,Ln!==null&&(Hi?(n=Ln,o=o.stateNode,n.nodeType===8?n.parentNode.removeChild(o):n.removeChild(o)):Ln.removeChild(o.stateNode));break;case 18:Ln!==null&&(Hi?(n=Ln,o=o.stateNode,n.nodeType===8?Xd(n.parentNode,o):n.nodeType===1&&Xd(n,o),Qo(n)):Xd(Ln,o.stateNode));break;case 4:u=Ln,p=Hi,Ln=o.stateNode.containerInfo,Hi=!0,ls(n,s,o),Ln=u,Hi=p;break;case 0:case 11:case 14:case 15:if(!Bn&&(u=o.updateQueue,u!==null&&(u=u.lastEffect,u!==null))){p=u=u.next;do{var _=p,R=_.destroy;_=_.tag,R!==void 0&&((_&2)!==0||(_&4)!==0)&&Ph(o,s,R),p=p.next}while(p!==u)}ls(n,s,o);break;case 1:if(!Bn&&(Wa(o,s),u=o.stateNode,typeof u.componentWillUnmount=="function"))try{u.props=o.memoizedProps,u.state=o.memoizedState,u.componentWillUnmount()}catch(z){cn(o,s,z)}ls(n,s,o);break;case 21:ls(n,s,o);break;case 22:o.mode&1?(Bn=(u=Bn)||o.memoizedState!==null,ls(n,s,o),Bn=u):ls(n,s,o);break;default:ls(n,s,o)}}function V0(n){var s=n.updateQueue;if(s!==null){n.updateQueue=null;var o=n.stateNode;o===null&&(o=n.stateNode=new GS),s.forEach(function(u){var p=JS.bind(null,n,u);o.has(u)||(o.add(u),u.then(p,p))})}}function Vi(n,s){var o=s.deletions;if(o!==null)for(var u=0;u<o.length;u++){var p=o[u];try{var _=n,R=s,z=R;e:for(;z!==null;){switch(z.tag){case 5:Ln=z.stateNode,Hi=!1;break e;case 3:Ln=z.stateNode.containerInfo,Hi=!0;break e;case 4:Ln=z.stateNode.containerInfo,Hi=!0;break e}z=z.return}if(Ln===null)throw Error(t(160));H0(_,R,p),Ln=null,Hi=!1;var W=p.alternate;W!==null&&(W.return=null),p.return=null}catch(me){cn(p,s,me)}}if(s.subtreeFlags&12854)for(s=s.child;s!==null;)G0(s,n),s=s.sibling}function G0(n,s){var o=n.alternate,u=n.flags;switch(n.tag){case 0:case 11:case 14:case 15:if(Vi(s,n),sr(n),u&4){try{_l(3,n,n.return),jc(3,n)}catch(Ze){cn(n,n.return,Ze)}try{_l(5,n,n.return)}catch(Ze){cn(n,n.return,Ze)}}break;case 1:Vi(s,n),sr(n),u&512&&o!==null&&Wa(o,o.return);break;case 5:if(Vi(s,n),sr(n),u&512&&o!==null&&Wa(o,o.return),n.flags&32){var p=n.stateNode;try{ge(p,"")}catch(Ze){cn(n,n.return,Ze)}}if(u&4&&(p=n.stateNode,p!=null)){var _=n.memoizedProps,R=o!==null?o.memoizedProps:_,z=n.type,W=n.updateQueue;if(n.updateQueue=null,W!==null)try{z==="input"&&_.type==="radio"&&_.name!=null&&_t(p,_),ne(z,R);var me=ne(z,_);for(R=0;R<W.length;R+=2){var be=W[R],Ce=W[R+1];be==="style"?_e(p,Ce):be==="dangerouslySetInnerHTML"?se(p,Ce):be==="children"?ge(p,Ce):P(p,be,Ce,me)}switch(z){case"input":Wt(p,_);break;case"textarea":xn(p,_);break;case"select":var we=p._wrapperState.wasMultiple;p._wrapperState.wasMultiple=!!_.multiple;var Ve=_.value;Ve!=null?wt(p,!!_.multiple,Ve,!1):we!==!!_.multiple&&(_.defaultValue!=null?wt(p,!!_.multiple,_.defaultValue,!0):wt(p,!!_.multiple,_.multiple?[]:"",!1))}p[ll]=_}catch(Ze){cn(n,n.return,Ze)}}break;case 6:if(Vi(s,n),sr(n),u&4){if(n.stateNode===null)throw Error(t(162));p=n.stateNode,_=n.memoizedProps;try{p.nodeValue=_}catch(Ze){cn(n,n.return,Ze)}}break;case 3:if(Vi(s,n),sr(n),u&4&&o!==null&&o.memoizedState.isDehydrated)try{Qo(s.containerInfo)}catch(Ze){cn(n,n.return,Ze)}break;case 4:Vi(s,n),sr(n);break;case 13:Vi(s,n),sr(n),p=n.child,p.flags&8192&&(_=p.memoizedState!==null,p.stateNode.isHidden=_,!_||p.alternate!==null&&p.alternate.memoizedState!==null||(Fh=sn())),u&4&&V0(n);break;case 22:if(be=o!==null&&o.memoizedState!==null,n.mode&1?(Bn=(me=Bn)||be,Vi(s,n),Bn=me):Vi(s,n),sr(n),u&8192){if(me=n.memoizedState!==null,(n.stateNode.isHidden=me)&&!be&&(n.mode&1)!==0)for($e=n,be=n.child;be!==null;){for(Ce=$e=be;$e!==null;){switch(we=$e,Ve=we.child,we.tag){case 0:case 11:case 14:case 15:_l(4,we,we.return);break;case 1:Wa(we,we.return);var Ye=we.stateNode;if(typeof Ye.componentWillUnmount=="function"){u=we,o=we.return;try{s=u,Ye.props=s.memoizedProps,Ye.state=s.memoizedState,Ye.componentWillUnmount()}catch(Ze){cn(u,o,Ze)}}break;case 5:Wa(we,we.return);break;case 22:if(we.memoizedState!==null){X0(Ce);continue}}Ve!==null?(Ve.return=we,$e=Ve):X0(Ce)}be=be.sibling}e:for(be=null,Ce=n;;){if(Ce.tag===5){if(be===null){be=Ce;try{p=Ce.stateNode,me?(_=p.style,typeof _.setProperty=="function"?_.setProperty("display","none","important"):_.display="none"):(z=Ce.stateNode,W=Ce.memoizedProps.style,R=W!=null&&W.hasOwnProperty("display")?W.display:null,z.style.display=ve("display",R))}catch(Ze){cn(n,n.return,Ze)}}}else if(Ce.tag===6){if(be===null)try{Ce.stateNode.nodeValue=me?"":Ce.memoizedProps}catch(Ze){cn(n,n.return,Ze)}}else if((Ce.tag!==22&&Ce.tag!==23||Ce.memoizedState===null||Ce===n)&&Ce.child!==null){Ce.child.return=Ce,Ce=Ce.child;continue}if(Ce===n)break e;for(;Ce.sibling===null;){if(Ce.return===null||Ce.return===n)break e;be===Ce&&(be=null),Ce=Ce.return}be===Ce&&(be=null),Ce.sibling.return=Ce.return,Ce=Ce.sibling}}break;case 19:Vi(s,n),sr(n),u&4&&V0(n);break;case 21:break;default:Vi(s,n),sr(n)}}function sr(n){var s=n.flags;if(s&2){try{e:{for(var o=n.return;o!==null;){if(z0(o)){var u=o;break e}o=o.return}throw Error(t(160))}switch(u.tag){case 5:var p=u.stateNode;u.flags&32&&(ge(p,""),u.flags&=-33);var _=B0(n);Dh(n,_,p);break;case 3:case 4:var R=u.stateNode.containerInfo,z=B0(n);Lh(n,z,R);break;default:throw Error(t(161))}}catch(W){cn(n,n.return,W)}n.flags&=-3}s&4096&&(n.flags&=-4097)}function jS(n,s,o){$e=n,W0(n)}function W0(n,s,o){for(var u=(n.mode&1)!==0;$e!==null;){var p=$e,_=p.child;if(p.tag===22&&u){var R=p.memoizedState!==null||Wc;if(!R){var z=p.alternate,W=z!==null&&z.memoizedState!==null||Bn;z=Wc;var me=Bn;if(Wc=R,(Bn=W)&&!me)for($e=p;$e!==null;)R=$e,W=R.child,R.tag===22&&R.memoizedState!==null?$0(p):W!==null?(W.return=R,$e=W):$0(p);for(;_!==null;)$e=_,W0(_),_=_.sibling;$e=p,Wc=z,Bn=me}j0(n)}else(p.subtreeFlags&8772)!==0&&_!==null?(_.return=p,$e=_):j0(n)}}function j0(n){for(;$e!==null;){var s=$e;if((s.flags&8772)!==0){var o=s.alternate;try{if((s.flags&8772)!==0)switch(s.tag){case 0:case 11:case 15:Bn||jc(5,s);break;case 1:var u=s.stateNode;if(s.flags&4&&!Bn)if(o===null)u.componentDidMount();else{var p=s.elementType===s.type?o.memoizedProps:Bi(s.type,o.memoizedProps);u.componentDidUpdate(p,o.memoizedState,u.__reactInternalSnapshotBeforeUpdate)}var _=s.updateQueue;_!==null&&Xg(s,_,u);break;case 3:var R=s.updateQueue;if(R!==null){if(o=null,s.child!==null)switch(s.child.tag){case 5:o=s.child.stateNode;break;case 1:o=s.child.stateNode}Xg(s,R,o)}break;case 5:var z=s.stateNode;if(o===null&&s.flags&4){o=z;var W=s.memoizedProps;switch(s.type){case"button":case"input":case"select":case"textarea":W.autoFocus&&o.focus();break;case"img":W.src&&(o.src=W.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(s.memoizedState===null){var me=s.alternate;if(me!==null){var be=me.memoizedState;if(be!==null){var Ce=be.dehydrated;Ce!==null&&Qo(Ce)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(t(163))}Bn||s.flags&512&&Nh(s)}catch(we){cn(s,s.return,we)}}if(s===n){$e=null;break}if(o=s.sibling,o!==null){o.return=s.return,$e=o;break}$e=s.return}}function X0(n){for(;$e!==null;){var s=$e;if(s===n){$e=null;break}var o=s.sibling;if(o!==null){o.return=s.return,$e=o;break}$e=s.return}}function $0(n){for(;$e!==null;){var s=$e;try{switch(s.tag){case 0:case 11:case 15:var o=s.return;try{jc(4,s)}catch(W){cn(s,o,W)}break;case 1:var u=s.stateNode;if(typeof u.componentDidMount=="function"){var p=s.return;try{u.componentDidMount()}catch(W){cn(s,p,W)}}var _=s.return;try{Nh(s)}catch(W){cn(s,_,W)}break;case 5:var R=s.return;try{Nh(s)}catch(W){cn(s,R,W)}}}catch(W){cn(s,s.return,W)}if(s===n){$e=null;break}var z=s.sibling;if(z!==null){z.return=s.return,$e=z;break}$e=s.return}}var XS=Math.ceil,Xc=C.ReactCurrentDispatcher,Ih=C.ReactCurrentOwner,Ai=C.ReactCurrentBatchConfig,Pt=0,Cn=null,pn=null,Dn=0,gi=0,ja=is(0),yn=0,yl=null,Qs=0,$c=0,Uh=0,Sl=null,ri=null,Fh=0,Xa=1/0,Ar=null,qc=!1,Oh=null,cs=null,Yc=!1,us=null,Kc=0,Ml=0,kh=null,Qc=-1,Zc=0;function qn(){return(Pt&6)!==0?sn():Qc!==-1?Qc:Qc=sn()}function ds(n){return(n.mode&1)===0?1:(Pt&2)!==0&&Dn!==0?Dn&-Dn:AS.transition!==null?(Zc===0&&(Zc=He()),Zc):(n=yt,n!==0||(n=window.event,n=n===void 0?16:Ym(n.type)),n)}function Gi(n,s,o,u){if(50<Ml)throw Ml=0,kh=null,Error(t(185));xt(n,o,u),((Pt&2)===0||n!==Cn)&&(n===Cn&&((Pt&2)===0&&($c|=o),yn===4&&hs(n,Dn)),si(n,u),o===1&&Pt===0&&(s.mode&1)===0&&(Xa=sn()+500,bc&&ss()))}function si(n,s){var o=n.callbackNode;kt(n,s);var u=jt(n,n===Cn?Dn:0);if(u===0)o!==null&&jo(o),n.callbackNode=null,n.callbackPriority=0;else if(s=u&-u,n.callbackPriority!==s){if(o!=null&&jo(o),s===1)n.tag===0?RS(Y0.bind(null,n)):Ig(Y0.bind(null,n)),wS(function(){(Pt&6)===0&&ss()}),o=null;else{switch(Sr(u)){case 1:o=Xo;break;case 4:o=A;break;case 16:o=Q;break;case 536870912:o=oe;break;default:o=Q}o=iv(o,q0.bind(null,n))}n.callbackPriority=s,n.callbackNode=o}}function q0(n,s){if(Qc=-1,Zc=0,(Pt&6)!==0)throw Error(t(327));var o=n.callbackNode;if($a()&&n.callbackNode!==o)return null;var u=jt(n,n===Cn?Dn:0);if(u===0)return null;if((u&30)!==0||(u&n.expiredLanes)!==0||s)s=Jc(n,u);else{s=u;var p=Pt;Pt|=2;var _=Q0();(Cn!==n||Dn!==s)&&(Ar=null,Xa=sn()+500,Js(n,s));do try{YS();break}catch(z){K0(n,z)}while(!0);nh(),Xc.current=_,Pt=p,pn!==null?s=0:(Cn=null,Dn=0,s=yn)}if(s!==0){if(s===2&&(p=fn(n),p!==0&&(u=p,s=zh(n,p))),s===1)throw o=yl,Js(n,0),hs(n,u),si(n,sn()),o;if(s===6)hs(n,u);else{if(p=n.current.alternate,(u&30)===0&&!$S(p)&&(s=Jc(n,u),s===2&&(_=fn(n),_!==0&&(u=_,s=zh(n,_))),s===1))throw o=yl,Js(n,0),hs(n,u),si(n,sn()),o;switch(n.finishedWork=p,n.finishedLanes=u,s){case 0:case 1:throw Error(t(345));case 2:ea(n,ri,Ar);break;case 3:if(hs(n,u),(u&130023424)===u&&(s=Fh+500-sn(),10<s)){if(jt(n,0)!==0)break;if(p=n.suspendedLanes,(p&u)!==u){qn(),n.pingedLanes|=n.suspendedLanes&p;break}n.timeoutHandle=jd(ea.bind(null,n,ri,Ar),s);break}ea(n,ri,Ar);break;case 4:if(hs(n,u),(u&4194240)===u)break;for(s=n.eventTimes,p=-1;0<u;){var R=31-Pe(u);_=1<<R,R=s[R],R>p&&(p=R),u&=~_}if(u=p,u=sn()-u,u=(120>u?120:480>u?480:1080>u?1080:1920>u?1920:3e3>u?3e3:4320>u?4320:1960*XS(u/1960))-u,10<u){n.timeoutHandle=jd(ea.bind(null,n,ri,Ar),u);break}ea(n,ri,Ar);break;case 5:ea(n,ri,Ar);break;default:throw Error(t(329))}}}return si(n,sn()),n.callbackNode===o?q0.bind(null,n):null}function zh(n,s){var o=Sl;return n.current.memoizedState.isDehydrated&&(Js(n,s).flags|=256),n=Jc(n,s),n!==2&&(s=ri,ri=o,s!==null&&Bh(s)),n}function Bh(n){ri===null?ri=n:ri.push.apply(ri,n)}function $S(n){for(var s=n;;){if(s.flags&16384){var o=s.updateQueue;if(o!==null&&(o=o.stores,o!==null))for(var u=0;u<o.length;u++){var p=o[u],_=p.getSnapshot;p=p.value;try{if(!ki(_(),p))return!1}catch{return!1}}}if(o=s.child,s.subtreeFlags&16384&&o!==null)o.return=s,s=o;else{if(s===n)break;for(;s.sibling===null;){if(s.return===null||s.return===n)return!0;s=s.return}s.sibling.return=s.return,s=s.sibling}}return!0}function hs(n,s){for(s&=~Uh,s&=~$c,n.suspendedLanes|=s,n.pingedLanes&=~s,n=n.expirationTimes;0<s;){var o=31-Pe(s),u=1<<o;n[o]=-1,s&=~u}}function Y0(n){if((Pt&6)!==0)throw Error(t(327));$a();var s=jt(n,0);if((s&1)===0)return si(n,sn()),null;var o=Jc(n,s);if(n.tag!==0&&o===2){var u=fn(n);u!==0&&(s=u,o=zh(n,u))}if(o===1)throw o=yl,Js(n,0),hs(n,s),si(n,sn()),o;if(o===6)throw Error(t(345));return n.finishedWork=n.current.alternate,n.finishedLanes=s,ea(n,ri,Ar),si(n,sn()),null}function Hh(n,s){var o=Pt;Pt|=1;try{return n(s)}finally{Pt=o,Pt===0&&(Xa=sn()+500,bc&&ss())}}function Zs(n){us!==null&&us.tag===0&&(Pt&6)===0&&$a();var s=Pt;Pt|=1;var o=Ai.transition,u=yt;try{if(Ai.transition=null,yt=1,n)return n()}finally{yt=u,Ai.transition=o,Pt=s,(Pt&6)===0&&ss()}}function Vh(){gi=ja.current,Qt(ja)}function Js(n,s){n.finishedWork=null,n.finishedLanes=0;var o=n.timeoutHandle;if(o!==-1&&(n.timeoutHandle=-1,ES(o)),pn!==null)for(o=pn.return;o!==null;){var u=o;switch(Qd(u),u.tag){case 1:u=u.type.childContextTypes,u!=null&&wc();break;case 3:Va(),Qt(ti),Qt(On),uh();break;case 5:lh(u);break;case 4:Va();break;case 13:Qt(an);break;case 19:Qt(an);break;case 10:ih(u.type._context);break;case 22:case 23:Vh()}o=o.return}if(Cn=n,pn=n=fs(n.current,null),Dn=gi=s,yn=0,yl=null,Uh=$c=Qs=0,ri=Sl=null,qs!==null){for(s=0;s<qs.length;s++)if(o=qs[s],u=o.interleaved,u!==null){o.interleaved=null;var p=u.next,_=o.pending;if(_!==null){var R=_.next;_.next=p,u.next=R}o.pending=u}qs=null}return n}function K0(n,s){do{var o=pn;try{if(nh(),Fc.current=Bc,Oc){for(var u=on.memoizedState;u!==null;){var p=u.queue;p!==null&&(p.pending=null),u=u.next}Oc=!1}if(Ks=0,bn=_n=on=null,pl=!1,ml=0,Ih.current=null,o===null||o.return===null){yn=1,yl=s,pn=null;break}e:{var _=n,R=o.return,z=o,W=s;if(s=Dn,z.flags|=32768,W!==null&&typeof W=="object"&&typeof W.then=="function"){var me=W,be=z,Ce=be.tag;if((be.mode&1)===0&&(Ce===0||Ce===11||Ce===15)){var we=be.alternate;we?(be.updateQueue=we.updateQueue,be.memoizedState=we.memoizedState,be.lanes=we.lanes):(be.updateQueue=null,be.memoizedState=null)}var Ve=S0(R);if(Ve!==null){Ve.flags&=-257,M0(Ve,R,z,_,s),Ve.mode&1&&y0(_,me,s),s=Ve,W=me;var Ye=s.updateQueue;if(Ye===null){var Ze=new Set;Ze.add(W),s.updateQueue=Ze}else Ye.add(W);break e}else{if((s&1)===0){y0(_,me,s),Gh();break e}W=Error(t(426))}}else if(tn&&z.mode&1){var dn=S0(R);if(dn!==null){(dn.flags&65536)===0&&(dn.flags|=256),M0(dn,R,z,_,s),eh(Ga(W,z));break e}}_=W=Ga(W,z),yn!==4&&(yn=2),Sl===null?Sl=[_]:Sl.push(_),_=R;do{switch(_.tag){case 3:_.flags|=65536,s&=-s,_.lanes|=s;var ie=x0(_,W,s);jg(_,ie);break e;case 1:z=W;var $=_.type,le=_.stateNode;if((_.flags&128)===0&&(typeof $.getDerivedStateFromError=="function"||le!==null&&typeof le.componentDidCatch=="function"&&(cs===null||!cs.has(le)))){_.flags|=65536,s&=-s,_.lanes|=s;var Re=_0(_,z,s);jg(_,Re);break e}}_=_.return}while(_!==null)}J0(o)}catch(et){s=et,pn===o&&o!==null&&(pn=o=o.return);continue}break}while(!0)}function Q0(){var n=Xc.current;return Xc.current=Bc,n===null?Bc:n}function Gh(){(yn===0||yn===3||yn===2)&&(yn=4),Cn===null||(Qs&268435455)===0&&($c&268435455)===0||hs(Cn,Dn)}function Jc(n,s){var o=Pt;Pt|=2;var u=Q0();(Cn!==n||Dn!==s)&&(Ar=null,Js(n,s));do try{qS();break}catch(p){K0(n,p)}while(!0);if(nh(),Pt=o,Xc.current=u,pn!==null)throw Error(t(261));return Cn=null,Dn=0,yn}function qS(){for(;pn!==null;)Z0(pn)}function YS(){for(;pn!==null&&!lc();)Z0(pn)}function Z0(n){var s=nv(n.alternate,n,gi);n.memoizedProps=n.pendingProps,s===null?J0(n):pn=s,Ih.current=null}function J0(n){var s=n;do{var o=s.alternate;if(n=s.return,(s.flags&32768)===0){if(o=HS(o,s,gi),o!==null){pn=o;return}}else{if(o=VS(o,s),o!==null){o.flags&=32767,pn=o;return}if(n!==null)n.flags|=32768,n.subtreeFlags=0,n.deletions=null;else{yn=6,pn=null;return}}if(s=s.sibling,s!==null){pn=s;return}pn=s=n}while(s!==null);yn===0&&(yn=5)}function ea(n,s,o){var u=yt,p=Ai.transition;try{Ai.transition=null,yt=1,KS(n,s,o,u)}finally{Ai.transition=p,yt=u}return null}function KS(n,s,o,u){do $a();while(us!==null);if((Pt&6)!==0)throw Error(t(327));o=n.finishedWork;var p=n.finishedLanes;if(o===null)return null;if(n.finishedWork=null,n.finishedLanes=0,o===n.current)throw Error(t(177));n.callbackNode=null,n.callbackPriority=0;var _=o.lanes|o.childLanes;if(Jn(n,_),n===Cn&&(pn=Cn=null,Dn=0),(o.subtreeFlags&2064)===0&&(o.flags&2064)===0||Yc||(Yc=!0,iv(Q,function(){return $a(),null})),_=(o.flags&15990)!==0,(o.subtreeFlags&15990)!==0||_){_=Ai.transition,Ai.transition=null;var R=yt;yt=1;var z=Pt;Pt|=4,Ih.current=null,WS(n,o),G0(o,n),gS(Gd),uc=!!Vd,Gd=Vd=null,n.current=o,jS(o),Sd(),Pt=z,yt=R,Ai.transition=_}else n.current=o;if(Yc&&(Yc=!1,us=n,Kc=p),_=n.pendingLanes,_===0&&(cs=null),We(o.stateNode),si(n,sn()),s!==null)for(u=n.onRecoverableError,o=0;o<s.length;o++)p=s[o],u(p.value,{componentStack:p.stack,digest:p.digest});if(qc)throw qc=!1,n=Oh,Oh=null,n;return(Kc&1)!==0&&n.tag!==0&&$a(),_=n.pendingLanes,(_&1)!==0?n===kh?Ml++:(Ml=0,kh=n):Ml=0,ss(),null}function $a(){if(us!==null){var n=Sr(Kc),s=Ai.transition,o=yt;try{if(Ai.transition=null,yt=16>n?16:n,us===null)var u=!1;else{if(n=us,us=null,Kc=0,(Pt&6)!==0)throw Error(t(331));var p=Pt;for(Pt|=4,$e=n.current;$e!==null;){var _=$e,R=_.child;if(($e.flags&16)!==0){var z=_.deletions;if(z!==null){for(var W=0;W<z.length;W++){var me=z[W];for($e=me;$e!==null;){var be=$e;switch(be.tag){case 0:case 11:case 15:_l(8,be,_)}var Ce=be.child;if(Ce!==null)Ce.return=be,$e=Ce;else for(;$e!==null;){be=$e;var we=be.sibling,Ve=be.return;if(k0(be),be===me){$e=null;break}if(we!==null){we.return=Ve,$e=we;break}$e=Ve}}}var Ye=_.alternate;if(Ye!==null){var Ze=Ye.child;if(Ze!==null){Ye.child=null;do{var dn=Ze.sibling;Ze.sibling=null,Ze=dn}while(Ze!==null)}}$e=_}}if((_.subtreeFlags&2064)!==0&&R!==null)R.return=_,$e=R;else e:for(;$e!==null;){if(_=$e,(_.flags&2048)!==0)switch(_.tag){case 0:case 11:case 15:_l(9,_,_.return)}var ie=_.sibling;if(ie!==null){ie.return=_.return,$e=ie;break e}$e=_.return}}var $=n.current;for($e=$;$e!==null;){R=$e;var le=R.child;if((R.subtreeFlags&2064)!==0&&le!==null)le.return=R,$e=le;else e:for(R=$;$e!==null;){if(z=$e,(z.flags&2048)!==0)try{switch(z.tag){case 0:case 11:case 15:jc(9,z)}}catch(et){cn(z,z.return,et)}if(z===R){$e=null;break e}var Re=z.sibling;if(Re!==null){Re.return=z.return,$e=Re;break e}$e=z.return}}if(Pt=p,ss(),Le&&typeof Le.onPostCommitFiberRoot=="function")try{Le.onPostCommitFiberRoot(ae,n)}catch{}u=!0}return u}finally{yt=o,Ai.transition=s}}return!1}function ev(n,s,o){s=Ga(o,s),s=x0(n,s,1),n=os(n,s,1),s=qn(),n!==null&&(xt(n,1,s),si(n,s))}function cn(n,s,o){if(n.tag===3)ev(n,n,o);else for(;s!==null;){if(s.tag===3){ev(s,n,o);break}else if(s.tag===1){var u=s.stateNode;if(typeof s.type.getDerivedStateFromError=="function"||typeof u.componentDidCatch=="function"&&(cs===null||!cs.has(u))){n=Ga(o,n),n=_0(s,n,1),s=os(s,n,1),n=qn(),s!==null&&(xt(s,1,n),si(s,n));break}}s=s.return}}function QS(n,s,o){var u=n.pingCache;u!==null&&u.delete(s),s=qn(),n.pingedLanes|=n.suspendedLanes&o,Cn===n&&(Dn&o)===o&&(yn===4||yn===3&&(Dn&130023424)===Dn&&500>sn()-Fh?Js(n,0):Uh|=o),si(n,s)}function tv(n,s){s===0&&((n.mode&1)===0?s=1:(s=Je,Je<<=1,(Je&130023424)===0&&(Je=4194304)));var o=qn();n=br(n,s),n!==null&&(xt(n,s,o),si(n,o))}function ZS(n){var s=n.memoizedState,o=0;s!==null&&(o=s.retryLane),tv(n,o)}function JS(n,s){var o=0;switch(n.tag){case 13:var u=n.stateNode,p=n.memoizedState;p!==null&&(o=p.retryLane);break;case 19:u=n.stateNode;break;default:throw Error(t(314))}u!==null&&u.delete(s),tv(n,o)}var nv;nv=function(n,s,o){if(n!==null)if(n.memoizedProps!==s.pendingProps||ti.current)ii=!0;else{if((n.lanes&o)===0&&(s.flags&128)===0)return ii=!1,BS(n,s,o);ii=(n.flags&131072)!==0}else ii=!1,tn&&(s.flags&1048576)!==0&&Ug(s,Rc,s.index);switch(s.lanes=0,s.tag){case 2:var u=s.type;Gc(n,s),n=s.pendingProps;var p=Ua(s,On.current);Ha(s,o),p=fh(null,s,u,n,p,o);var _=ph();return s.flags|=1,typeof p=="object"&&p!==null&&typeof p.render=="function"&&p.$$typeof===void 0?(s.tag=1,s.memoizedState=null,s.updateQueue=null,ni(u)?(_=!0,Tc(s)):_=!1,s.memoizedState=p.state!==null&&p.state!==void 0?p.state:null,ah(s),p.updater=Hc,s.stateNode=p,p._reactInternals=s,yh(s,u,n,o),s=wh(null,s,u,!0,_,o)):(s.tag=0,tn&&_&&Kd(s),$n(null,s,p,o),s=s.child),s;case 16:u=s.elementType;e:{switch(Gc(n,s),n=s.pendingProps,p=u._init,u=p(u._payload),s.type=u,p=s.tag=tM(u),n=Bi(u,n),p){case 0:s=Eh(null,s,u,n,o);break e;case 1:s=R0(null,s,u,n,o);break e;case 11:s=E0(null,s,u,n,o);break e;case 14:s=w0(null,s,u,Bi(u.type,n),o);break e}throw Error(t(306,u,""))}return s;case 0:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:Bi(u,p),Eh(n,s,u,p,o);case 1:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:Bi(u,p),R0(n,s,u,p,o);case 3:e:{if(A0(s),n===null)throw Error(t(387));u=s.pendingProps,_=s.memoizedState,p=_.element,Wg(n,s),Ic(s,u,null,o);var R=s.memoizedState;if(u=R.element,_.isDehydrated)if(_={element:u,isDehydrated:!1,cache:R.cache,pendingSuspenseBoundaries:R.pendingSuspenseBoundaries,transitions:R.transitions},s.updateQueue.baseState=_,s.memoizedState=_,s.flags&256){p=Ga(Error(t(423)),s),s=P0(n,s,u,o,p);break e}else if(u!==p){p=Ga(Error(t(424)),s),s=P0(n,s,u,o,p);break e}else for(mi=ns(s.stateNode.containerInfo.firstChild),pi=s,tn=!0,zi=null,o=Vg(s,null,u,o),s.child=o;o;)o.flags=o.flags&-3|4096,o=o.sibling;else{if(ka(),u===p){s=Rr(n,s,o);break e}$n(n,s,u,o)}s=s.child}return s;case 5:return $g(s),n===null&&Jd(s),u=s.type,p=s.pendingProps,_=n!==null?n.memoizedProps:null,R=p.children,Wd(u,p)?R=null:_!==null&&Wd(u,_)&&(s.flags|=32),C0(n,s),$n(n,s,R,o),s.child;case 6:return n===null&&Jd(s),null;case 13:return N0(n,s,o);case 4:return oh(s,s.stateNode.containerInfo),u=s.pendingProps,n===null?s.child=za(s,null,u,o):$n(n,s,u,o),s.child;case 11:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:Bi(u,p),E0(n,s,u,p,o);case 7:return $n(n,s,s.pendingProps,o),s.child;case 8:return $n(n,s,s.pendingProps.children,o),s.child;case 12:return $n(n,s,s.pendingProps.children,o),s.child;case 10:e:{if(u=s.type._context,p=s.pendingProps,_=s.memoizedProps,R=p.value,Xt(Nc,u._currentValue),u._currentValue=R,_!==null)if(ki(_.value,R)){if(_.children===p.children&&!ti.current){s=Rr(n,s,o);break e}}else for(_=s.child,_!==null&&(_.return=s);_!==null;){var z=_.dependencies;if(z!==null){R=_.child;for(var W=z.firstContext;W!==null;){if(W.context===u){if(_.tag===1){W=Cr(-1,o&-o),W.tag=2;var me=_.updateQueue;if(me!==null){me=me.shared;var be=me.pending;be===null?W.next=W:(W.next=be.next,be.next=W),me.pending=W}}_.lanes|=o,W=_.alternate,W!==null&&(W.lanes|=o),rh(_.return,o,s),z.lanes|=o;break}W=W.next}}else if(_.tag===10)R=_.type===s.type?null:_.child;else if(_.tag===18){if(R=_.return,R===null)throw Error(t(341));R.lanes|=o,z=R.alternate,z!==null&&(z.lanes|=o),rh(R,o,s),R=_.sibling}else R=_.child;if(R!==null)R.return=_;else for(R=_;R!==null;){if(R===s){R=null;break}if(_=R.sibling,_!==null){_.return=R.return,R=_;break}R=R.return}_=R}$n(n,s,p.children,o),s=s.child}return s;case 9:return p=s.type,u=s.pendingProps.children,Ha(s,o),p=Ci(p),u=u(p),s.flags|=1,$n(n,s,u,o),s.child;case 14:return u=s.type,p=Bi(u,s.pendingProps),p=Bi(u.type,p),w0(n,s,u,p,o);case 15:return T0(n,s,s.type,s.pendingProps,o);case 17:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:Bi(u,p),Gc(n,s),s.tag=1,ni(u)?(n=!0,Tc(s)):n=!1,Ha(s,o),g0(s,u,p),yh(s,u,p,o),wh(null,s,u,!0,n,o);case 19:return D0(n,s,o);case 22:return b0(n,s,o)}throw Error(t(156,s.tag))};function iv(n,s){return Vs(n,s)}function eM(n,s,o,u){this.tag=n,this.key=o,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=s,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=u,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Pi(n,s,o,u){return new eM(n,s,o,u)}function Wh(n){return n=n.prototype,!(!n||!n.isReactComponent)}function tM(n){if(typeof n=="function")return Wh(n)?1:0;if(n!=null){if(n=n.$$typeof,n===K)return 11;if(n===O)return 14}return 2}function fs(n,s){var o=n.alternate;return o===null?(o=Pi(n.tag,s,n.key,n.mode),o.elementType=n.elementType,o.type=n.type,o.stateNode=n.stateNode,o.alternate=n,n.alternate=o):(o.pendingProps=s,o.type=n.type,o.flags=0,o.subtreeFlags=0,o.deletions=null),o.flags=n.flags&14680064,o.childLanes=n.childLanes,o.lanes=n.lanes,o.child=n.child,o.memoizedProps=n.memoizedProps,o.memoizedState=n.memoizedState,o.updateQueue=n.updateQueue,s=n.dependencies,o.dependencies=s===null?null:{lanes:s.lanes,firstContext:s.firstContext},o.sibling=n.sibling,o.index=n.index,o.ref=n.ref,o}function eu(n,s,o,u,p,_){var R=2;if(u=n,typeof n=="function")Wh(n)&&(R=1);else if(typeof n=="string")R=5;else e:switch(n){case F:return ta(o.children,p,_,s);case T:R=8,p|=8;break;case I:return n=Pi(12,o,s,p|2),n.elementType=I,n.lanes=_,n;case re:return n=Pi(13,o,s,p),n.elementType=re,n.lanes=_,n;case fe:return n=Pi(19,o,s,p),n.elementType=fe,n.lanes=_,n;case Z:return tu(o,p,_,s);default:if(typeof n=="object"&&n!==null)switch(n.$$typeof){case G:R=10;break e;case H:R=9;break e;case K:R=11;break e;case O:R=14;break e;case ce:R=16,u=null;break e}throw Error(t(130,n==null?n:typeof n,""))}return s=Pi(R,o,s,p),s.elementType=n,s.type=u,s.lanes=_,s}function ta(n,s,o,u){return n=Pi(7,n,u,s),n.lanes=o,n}function tu(n,s,o,u){return n=Pi(22,n,u,s),n.elementType=Z,n.lanes=o,n.stateNode={isHidden:!1},n}function jh(n,s,o){return n=Pi(6,n,null,s),n.lanes=o,n}function Xh(n,s,o){return s=Pi(4,n.children!==null?n.children:[],n.key,s),s.lanes=o,s.stateNode={containerInfo:n.containerInfo,pendingChildren:null,implementation:n.implementation},s}function nM(n,s,o,u,p){this.tag=s,this.containerInfo=n,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=Nn(0),this.expirationTimes=Nn(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Nn(0),this.identifierPrefix=u,this.onRecoverableError=p,this.mutableSourceEagerHydrationData=null}function $h(n,s,o,u,p,_,R,z,W){return n=new nM(n,s,o,z,W),s===1?(s=1,_===!0&&(s|=8)):s=0,_=Pi(3,null,null,s),n.current=_,_.stateNode=n,_.memoizedState={element:u,isDehydrated:o,cache:null,transitions:null,pendingSuspenseBoundaries:null},ah(_),n}function iM(n,s,o){var u=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:L,key:u==null?null:""+u,children:n,containerInfo:s,implementation:o}}function rv(n){if(!n)return rs;n=n._reactInternals;e:{if(Xn(n)!==n||n.tag!==1)throw Error(t(170));var s=n;do{switch(s.tag){case 3:s=s.stateNode.context;break e;case 1:if(ni(s.type)){s=s.stateNode.__reactInternalMemoizedMergedChildContext;break e}}s=s.return}while(s!==null);throw Error(t(171))}if(n.tag===1){var o=n.type;if(ni(o))return Lg(n,o,s)}return s}function sv(n,s,o,u,p,_,R,z,W){return n=$h(o,u,!0,n,p,_,R,z,W),n.context=rv(null),o=n.current,u=qn(),p=ds(o),_=Cr(u,p),_.callback=s??null,os(o,_,p),n.current.lanes=p,xt(n,p,u),si(n,u),n}function nu(n,s,o,u){var p=s.current,_=qn(),R=ds(p);return o=rv(o),s.context===null?s.context=o:s.pendingContext=o,s=Cr(_,R),s.payload={element:n},u=u===void 0?null:u,u!==null&&(s.callback=u),n=os(p,s,R),n!==null&&(Gi(n,p,R,_),Dc(n,p,R)),R}function iu(n){if(n=n.current,!n.child)return null;switch(n.child.tag){case 5:return n.child.stateNode;default:return n.child.stateNode}}function av(n,s){if(n=n.memoizedState,n!==null&&n.dehydrated!==null){var o=n.retryLane;n.retryLane=o!==0&&o<s?o:s}}function qh(n,s){av(n,s),(n=n.alternate)&&av(n,s)}function rM(){return null}var ov=typeof reportError=="function"?reportError:function(n){console.error(n)};function Yh(n){this._internalRoot=n}ru.prototype.render=Yh.prototype.render=function(n){var s=this._internalRoot;if(s===null)throw Error(t(409));nu(n,s,null,null)},ru.prototype.unmount=Yh.prototype.unmount=function(){var n=this._internalRoot;if(n!==null){this._internalRoot=null;var s=n.containerInfo;Zs(function(){nu(null,n,null,null)}),s[Mr]=null}};function ru(n){this._internalRoot=n}ru.prototype.unstable_scheduleHydration=function(n){if(n){var s=zt();n={blockedOn:null,target:n,priority:s};for(var o=0;o<Jr.length&&s!==0&&s<Jr[o].priority;o++);Jr.splice(o,0,n),o===0&&$m(n)}};function Kh(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11)}function su(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11&&(n.nodeType!==8||n.nodeValue!==" react-mount-point-unstable "))}function lv(){}function sM(n,s,o,u,p){if(p){if(typeof u=="function"){var _=u;u=function(){var me=iu(R);_.call(me)}}var R=sv(s,u,n,0,null,!1,!1,"",lv);return n._reactRootContainer=R,n[Mr]=R.current,al(n.nodeType===8?n.parentNode:n),Zs(),R}for(;p=n.lastChild;)n.removeChild(p);if(typeof u=="function"){var z=u;u=function(){var me=iu(W);z.call(me)}}var W=$h(n,0,!1,null,null,!1,!1,"",lv);return n._reactRootContainer=W,n[Mr]=W.current,al(n.nodeType===8?n.parentNode:n),Zs(function(){nu(s,W,o,u)}),W}function au(n,s,o,u,p){var _=o._reactRootContainer;if(_){var R=_;if(typeof p=="function"){var z=p;p=function(){var W=iu(R);z.call(W)}}nu(s,R,n,p)}else R=sM(o,s,n,p,u);return iu(R)}Ut=function(n){switch(n.tag){case 3:var s=n.stateNode;if(s.current.memoizedState.isDehydrated){var o=Rt(s.pendingLanes);o!==0&&(ei(s,o|1),si(s,sn()),(Pt&6)===0&&(Xa=sn()+500,ss()))}break;case 13:Zs(function(){var u=br(n,1);if(u!==null){var p=qn();Gi(u,n,1,p)}}),qh(n,1)}},Yt=function(n){if(n.tag===13){var s=br(n,134217728);if(s!==null){var o=qn();Gi(s,n,134217728,o)}qh(n,134217728)}},Fi=function(n){if(n.tag===13){var s=ds(n),o=br(n,s);if(o!==null){var u=qn();Gi(o,n,s,u)}qh(n,s)}},zt=function(){return yt},Oi=function(n,s){var o=yt;try{return yt=n,s()}finally{yt=o}},nt=function(n,s,o){switch(s){case"input":if(Wt(n,o),s=o.name,o.type==="radio"&&s!=null){for(o=n;o.parentNode;)o=o.parentNode;for(o=o.querySelectorAll("input[name="+JSON.stringify(""+s)+'][type="radio"]'),s=0;s<o.length;s++){var u=o[s];if(u!==n&&u.form===n.form){var p=Ec(u);if(!p)throw Error(t(90));Dt(u),Wt(u,p)}}}break;case"textarea":xn(n,o);break;case"select":s=o.value,s!=null&&wt(n,!!o.multiple,s,!1)}},Oe=Hh,Ee=Zs;var aM={usingClientEntryPoint:!1,Events:[cl,Da,Ec,ye,De,Hh]},El={findFiberByHostInstance:Ws,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},oM={bundleType:El.bundleType,version:El.version,rendererPackageName:El.rendererPackageName,rendererConfig:El.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:C.ReactCurrentDispatcher,findHostInstanceByFiber:function(n){return n=Hs(n),n===null?null:n.stateNode},findFiberByHostInstance:El.findFiberByHostInstance||rM,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var ou=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!ou.isDisabled&&ou.supportsFiber)try{ae=ou.inject(oM),Le=ou}catch{}}return ai.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=aM,ai.createPortal=function(n,s){var o=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!Kh(s))throw Error(t(200));return iM(n,s,null,o)},ai.createRoot=function(n,s){if(!Kh(n))throw Error(t(299));var o=!1,u="",p=ov;return s!=null&&(s.unstable_strictMode===!0&&(o=!0),s.identifierPrefix!==void 0&&(u=s.identifierPrefix),s.onRecoverableError!==void 0&&(p=s.onRecoverableError)),s=$h(n,1,!1,null,null,o,!1,u,p),n[Mr]=s.current,al(n.nodeType===8?n.parentNode:n),new Yh(s)},ai.findDOMNode=function(n){if(n==null)return null;if(n.nodeType===1)return n;var s=n._reactInternals;if(s===void 0)throw typeof n.render=="function"?Error(t(188)):(n=Object.keys(n).join(","),Error(t(268,n)));return n=Hs(s),n=n===null?null:n.stateNode,n},ai.flushSync=function(n){return Zs(n)},ai.hydrate=function(n,s,o){if(!su(s))throw Error(t(200));return au(null,n,s,!0,o)},ai.hydrateRoot=function(n,s,o){if(!Kh(n))throw Error(t(405));var u=o!=null&&o.hydratedSources||null,p=!1,_="",R=ov;if(o!=null&&(o.unstable_strictMode===!0&&(p=!0),o.identifierPrefix!==void 0&&(_=o.identifierPrefix),o.onRecoverableError!==void 0&&(R=o.onRecoverableError)),s=sv(s,null,n,1,o??null,p,!1,_,R),n[Mr]=s.current,al(n),u)for(n=0;n<u.length;n++)o=u[n],p=o._getVersion,p=p(o._source),s.mutableSourceEagerHydrationData==null?s.mutableSourceEagerHydrationData=[o,p]:s.mutableSourceEagerHydrationData.push(o,p);return new ru(s)},ai.render=function(n,s,o){if(!su(s))throw Error(t(200));return au(null,n,s,!1,o)},ai.unmountComponentAtNode=function(n){if(!su(n))throw Error(t(40));return n._reactRootContainer?(Zs(function(){au(null,null,n,!1,function(){n._reactRootContainer=null,n[Mr]=null})}),!0):!1},ai.unstable_batchedUpdates=Hh,ai.unstable_renderSubtreeIntoContainer=function(n,s,o,u){if(!su(o))throw Error(t(200));if(n==null||n._reactInternals===void 0)throw Error(t(38));return au(n,s,o,!1,u)},ai.version="18.3.1-next-f1338f8080-20240426",ai}var vv;function vM(){if(vv)return ef.exports;vv=1;function i(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(i)}catch(e){console.error(e)}}return i(),ef.exports=gM(),ef.exports}var xv;function xM(){if(xv)return cu;xv=1;var i=vM();return cu.createRoot=i.createRoot,cu.hydrateRoot=i.hydrateRoot,cu}var _M=xM(),Fo=class{constructor(){this.listeners=new Set,this.subscribe=this.subscribe.bind(this)}subscribe(i){return this.listeners.add(i),this.onSubscribe(),()=>{this.listeners.delete(i),this.onUnsubscribe()}}hasListeners(){return this.listeners.size>0}onSubscribe(){}onUnsubscribe(){}},ha,ws,xo,t_,yM=(t_=class extends Fo{constructor(){super();rt(this,ha);rt(this,ws);rt(this,xo);Be(this,xo,e=>{if(typeof window<"u"&&window.addEventListener){const t=()=>e();return window.addEventListener("visibilitychange",t,!1),()=>{window.removeEventListener("visibilitychange",t)}}})}onSubscribe(){V(this,ws)||this.setEventListener(V(this,xo))}onUnsubscribe(){var e;this.hasListeners()||((e=V(this,ws))==null||e.call(this),Be(this,ws,void 0))}setEventListener(e){var t;Be(this,xo,e),(t=V(this,ws))==null||t.call(this),Be(this,ws,e(r=>{typeof r=="boolean"?this.setFocused(r):this.onFocus()}))}setFocused(e){V(this,ha)!==e&&(Be(this,ha,e),this.onFocus())}onFocus(){const e=this.isFocused();this.listeners.forEach(t=>{t(e)})}isFocused(){var e;return typeof V(this,ha)=="boolean"?V(this,ha):((e=globalThis.document)==null?void 0:e.visibilityState)!=="hidden"}},ha=new WeakMap,ws=new WeakMap,xo=new WeakMap,t_),am=new yM,SM={setTimeout:(i,e)=>setTimeout(i,e),clearTimeout:i=>clearTimeout(i),setInterval:(i,e)=>setInterval(i,e),clearInterval:i=>clearInterval(i)},Ts,rm,n_,MM=(n_=class{constructor(){rt(this,Ts,SM);rt(this,rm,!1)}setTimeoutProvider(i){Be(this,Ts,i)}setTimeout(i,e){return V(this,Ts).setTimeout(i,e)}clearTimeout(i){V(this,Ts).clearTimeout(i)}setInterval(i,e){return V(this,Ts).setInterval(i,e)}clearInterval(i){V(this,Ts).clearInterval(i)}},Ts=new WeakMap,rm=new WeakMap,n_),la=new MM;function EM(i){setTimeout(i,0)}var wM=typeof window>"u"||"Deno"in globalThis;function Qn(){}function TM(i,e){return typeof i=="function"?i(e):i}function Yf(i){return typeof i=="number"&&i>=0&&i!==1/0}function h_(i,e){return Math.max(i+(e||0)-Date.now(),0)}function Is(i,e){return typeof i=="function"?i(e):i}function yi(i,e){return typeof i=="function"?i(e):i}function _v(i,e){const{type:t="all",exact:r,fetchStatus:a,predicate:l,queryKey:c,stale:d}=i;if(c){if(r){if(e.queryHash!==om(c,e.options))return!1}else if(!Bl(e.queryKey,c))return!1}if(t!=="all"){const h=e.isActive();if(t==="active"&&!h||t==="inactive"&&h)return!1}return!(typeof d=="boolean"&&e.isStale()!==d||a&&a!==e.state.fetchStatus||l&&!l(e))}function yv(i,e){const{exact:t,status:r,predicate:a,mutationKey:l}=i;if(l){if(!e.options.mutationKey)return!1;if(t){if(Sa(e.options.mutationKey)!==Sa(l))return!1}else if(!Bl(e.options.mutationKey,l))return!1}return!(r&&e.state.status!==r||a&&!a(e))}function om(i,e){return((e==null?void 0:e.queryKeyHashFn)||Sa)(i)}function Sa(i){return JSON.stringify(i,(e,t)=>Kf(t)?Object.keys(t).sort().reduce((r,a)=>(r[a]=t[a],r),{}):t)}function Bl(i,e){return i===e?!0:typeof i!=typeof e?!1:i&&e&&typeof i=="object"&&typeof e=="object"?Object.keys(e).every(t=>Bl(i[t],e[t])):!1}var bM=Object.prototype.hasOwnProperty;function f_(i,e,t=0){if(i===e)return i;if(t>500)return e;const r=Sv(i)&&Sv(e);if(!r&&!(Kf(i)&&Kf(e)))return e;const l=(r?i:Object.keys(i)).length,c=r?e:Object.keys(e),d=c.length,h=r?new Array(d):{};let f=0;for(let m=0;m<d;m++){const g=r?m:c[m],v=i[g],S=e[g];if(v===S){h[g]=v,(r?m<l:bM.call(i,g))&&f++;continue}if(v===null||S===null||typeof v!="object"||typeof S!="object"){h[g]=S;continue}const E=f_(v,S,t+1);h[g]=E,E===v&&f++}return l===d&&f===l?i:h}function Zu(i,e){if(!e||Object.keys(i).length!==Object.keys(e).length)return!1;for(const t in i)if(i[t]!==e[t])return!1;return!0}function Sv(i){return Array.isArray(i)&&i.length===Object.keys(i).length}function Kf(i){if(!Mv(i))return!1;const e=i.constructor;if(e===void 0)return!0;const t=e.prototype;return!(!Mv(t)||!t.hasOwnProperty("isPrototypeOf")||Object.getPrototypeOf(i)!==Object.prototype)}function Mv(i){return Object.prototype.toString.call(i)==="[object Object]"}function CM(i){return new Promise(e=>{la.setTimeout(e,i)})}function Qf(i,e,t){return typeof t.structuralSharing=="function"?t.structuralSharing(i,e):t.structuralSharing!==!1?f_(i,e):e}function RM(i,e,t=0){const r=[...i,e];return t&&r.length>t?r.slice(1):r}function AM(i,e,t=0){const r=[e,...i];return t&&r.length>t?r.slice(0,-1):r}var lm=Symbol();function p_(i,e){return!i.queryFn&&(e!=null&&e.initialPromise)?()=>e.initialPromise:!i.queryFn||i.queryFn===lm?()=>Promise.reject(new Error(`Missing queryFn: '${i.queryHash}'`)):i.queryFn}function cm(i,e){return typeof i=="function"?i(...e):!!i}function PM(i,e,t){let r=!1,a;return Object.defineProperty(i,"signal",{enumerable:!0,get:()=>(a??(a=e()),r||(r=!0,a.aborted?t():a.addEventListener("abort",t,{once:!0})),a)}),i}var Hl=(()=>{let i=()=>wM;return{isServer(){return i()},setIsServer(e){i=e}}})();function Zf(){let i,e;const t=new Promise((a,l)=>{i=a,e=l});t.status="pending",t.catch(()=>{});function r(a){Object.assign(t,a),delete t.resolve,delete t.reject}return t.resolve=a=>{r({status:"fulfilled",value:a}),i(a)},t.reject=a=>{r({status:"rejected",reason:a}),e(a)},t}var NM=EM;function LM(){let i=[],e=0,t=d=>{d()},r=d=>{d()},a=NM;const l=d=>{e?i.push(d):a(()=>{t(d)})},c=()=>{const d=i;i=[],d.length&&a(()=>{r(()=>{d.forEach(h=>{t(h)})})})};return{batch:d=>{let h;e++;try{h=d()}finally{e--,e||c()}return h},batchCalls:d=>(...h)=>{l(()=>{d(...h)})},schedule:l,setNotifyFunction:d=>{t=d},setBatchNotifyFunction:d=>{r=d},setScheduler:d=>{a=d}}}var Mn=LM(),_o,bs,yo,i_,DM=(i_=class extends Fo{constructor(){super();rt(this,_o,!0);rt(this,bs);rt(this,yo);Be(this,yo,e=>{if(typeof window<"u"&&window.addEventListener){const t=()=>e(!0),r=()=>e(!1);return window.addEventListener("online",t,!1),window.addEventListener("offline",r,!1),()=>{window.removeEventListener("online",t),window.removeEventListener("offline",r)}}})}onSubscribe(){V(this,bs)||this.setEventListener(V(this,yo))}onUnsubscribe(){var e;this.hasListeners()||((e=V(this,bs))==null||e.call(this),Be(this,bs,void 0))}setEventListener(e){var t;Be(this,yo,e),(t=V(this,bs))==null||t.call(this),Be(this,bs,e(this.setOnline.bind(this)))}setOnline(e){V(this,_o)!==e&&(Be(this,_o,e),this.listeners.forEach(r=>{r(e)}))}isOnline(){return V(this,_o)}},_o=new WeakMap,bs=new WeakMap,yo=new WeakMap,i_),Ju=new DM;function IM(i){return Math.min(1e3*2**i,3e4)}function m_(i){return(i??"online")==="online"?Ju.isOnline():!0}var Jf=class extends Error{constructor(i){super("CancelledError"),this.revert=i==null?void 0:i.revert,this.silent=i==null?void 0:i.silent}};function g_(i){let e=!1,t=0,r;const a=Zf(),l=()=>a.status!=="pending",c=w=>{var x;if(!l()){const y=new Jf(w);v(y),(x=i.onCancel)==null||x.call(i,y)}},d=()=>{e=!0},h=()=>{e=!1},f=()=>am.isFocused()&&(i.networkMode==="always"||Ju.isOnline())&&i.canRun(),m=()=>m_(i.networkMode)&&i.canRun(),g=w=>{l()||(r==null||r(),a.resolve(w))},v=w=>{l()||(r==null||r(),a.reject(w))},S=()=>new Promise(w=>{var x;r=y=>{(l()||f())&&w(y)},(x=i.onPause)==null||x.call(i)}).then(()=>{var w;r=void 0,l()||(w=i.onContinue)==null||w.call(i)}),E=()=>{if(l())return;let w;const x=t===0?i.initialPromise:void 0;try{w=x??i.fn()}catch(y){w=Promise.reject(y)}Promise.resolve(w).then(g).catch(y=>{var L;if(l())return;const N=i.retry??(Hl.isServer()?0:3),P=i.retryDelay??IM,C=typeof P=="function"?P(t,y):P,D=N===!0||typeof N=="number"&&t<N||typeof N=="function"&&N(t,y);if(e||!D){v(y);return}t++,(L=i.onFail)==null||L.call(i,t,y),CM(C).then(()=>f()?void 0:S()).then(()=>{e?v(y):E()})})};return{promise:a,status:()=>a.status,cancel:c,continue:()=>(r==null||r(),a),cancelRetry:d,continueRetry:h,canStart:m,start:()=>(m()?E():S().then(E),a)}}var fa,r_,v_=(r_=class{constructor(){rt(this,fa)}destroy(){this.clearGcTimeout()}scheduleGc(){this.clearGcTimeout(),Yf(this.gcTime)&&Be(this,fa,la.setTimeout(()=>{this.optionalRemove()},this.gcTime))}updateGcTime(i){this.gcTime=Math.max(this.gcTime||0,i??(Hl.isServer()?1/0:300*1e3))}clearGcTimeout(){V(this,fa)!==void 0&&(la.clearTimeout(V(this,fa)),Be(this,fa,void 0))}},fa=new WeakMap,r_);function UM(i){return{onFetch:(e,t)=>{var m,g,v,S,E;const r=e.options,a=(v=(g=(m=e.fetchOptions)==null?void 0:m.meta)==null?void 0:g.fetchMore)==null?void 0:v.direction,l=((S=e.state.data)==null?void 0:S.pages)||[],c=((E=e.state.data)==null?void 0:E.pageParams)||[];let d={pages:[],pageParams:[]},h=0;const f=async()=>{let w=!1;const x=P=>{PM(P,()=>e.signal,()=>w=!0)},y=p_(e.options,e.fetchOptions),N=async(P,C,D)=>{if(w)return Promise.reject(e.signal.reason);if(C==null&&P.pages.length)return Promise.resolve(P);const F=(()=>{const H={client:e.client,queryKey:e.queryKey,pageParam:C,direction:D?"backward":"forward",meta:e.options.meta};return x(H),H})(),T=await y(F),{maxPages:I}=e.options,G=D?AM:RM;return{pages:G(P.pages,T,I),pageParams:G(P.pageParams,C,I)}};if(a&&l.length){const P=a==="backward",C=P?FM:Ev,D={pages:l,pageParams:c},L=C(r,D);d=await N(D,L,P)}else{const P=i??l.length;do{const C=h===0?c[0]??r.initialPageParam:Ev(r,d);if(h>0&&C==null)break;d=await N(d,C),h++}while(h<P)}return d};e.options.persister?e.fetchFn=()=>{var w,x;return(x=(w=e.options).persister)==null?void 0:x.call(w,f,{client:e.client,queryKey:e.queryKey,meta:e.options.meta,signal:e.signal},t)}:e.fetchFn=f}}}function Ev(i,{pages:e,pageParams:t}){const r=e.length-1;return e.length>0?i.getNextPageParam(e[r],e,t[r],t):void 0}function FM(i,{pages:e,pageParams:t}){var r;return e.length>0?(r=i.getPreviousPageParam)==null?void 0:r.call(i,e[0],e,t[0],t):void 0}var So,pa,Mo,Di,ma,Pn,ql,ga,_i,x_,Or,s_,OM=(s_=class extends v_{constructor(e){super();rt(this,_i);rt(this,So);rt(this,pa);rt(this,Mo);rt(this,Di);rt(this,ma);rt(this,Pn);rt(this,ql);rt(this,ga);Be(this,ga,!1),Be(this,ql,e.defaultOptions),this.setOptions(e.options),this.observers=[],Be(this,ma,e.client),Be(this,Di,V(this,ma).getQueryCache()),this.queryKey=e.queryKey,this.queryHash=e.queryHash,Be(this,pa,Tv(this.options)),this.state=e.state??V(this,pa),this.scheduleGc()}get meta(){return this.options.meta}get queryType(){return V(this,So)}get promise(){var e;return(e=V(this,Pn))==null?void 0:e.promise}setOptions(e){if(this.options={...V(this,ql),...e},e!=null&&e._type&&Be(this,So,e._type),this.updateGcTime(this.options.gcTime),this.state&&this.state.data===void 0){const t=Tv(this.options);t.data!==void 0&&(this.setState(wv(t.data,t.dataUpdatedAt)),Be(this,pa,t))}}optionalRemove(){!this.observers.length&&this.state.fetchStatus==="idle"&&V(this,Di).remove(this)}setData(e,t){const r=Qf(this.state.data,e,this.options);return mt(this,_i,Or).call(this,{data:r,type:"success",dataUpdatedAt:t==null?void 0:t.updatedAt,manual:t==null?void 0:t.manual}),r}setState(e){mt(this,_i,Or).call(this,{type:"setState",state:e})}cancel(e){var r,a;const t=(r=V(this,Pn))==null?void 0:r.promise;return(a=V(this,Pn))==null||a.cancel(e),t?t.then(Qn).catch(Qn):Promise.resolve()}destroy(){super.destroy(),this.cancel({silent:!0})}get resetState(){return V(this,pa)}reset(){this.destroy(),this.setState(this.resetState)}isActive(){return this.observers.some(e=>yi(e.options.enabled,this)!==!1)}isDisabled(){return this.getObserversCount()>0?!this.isActive():this.options.queryFn===lm||!this.isFetched()}isFetched(){return this.state.dataUpdateCount+this.state.errorUpdateCount>0}isStatic(){return this.getObserversCount()>0?this.observers.some(e=>Is(e.options.staleTime,this)==="static"):!1}isStale(){return this.getObserversCount()>0?this.observers.some(e=>e.getCurrentResult().isStale):this.state.data===void 0||this.state.isInvalidated}isStaleByTime(e=0){return this.state.data===void 0?!0:e==="static"?!1:this.state.isInvalidated?!0:!h_(this.state.dataUpdatedAt,e)}onFocus(){var t;const e=this.observers.find(r=>r.shouldFetchOnWindowFocus());e==null||e.refetch({cancelRefetch:!1}),(t=V(this,Pn))==null||t.continue()}onOnline(){var t;const e=this.observers.find(r=>r.shouldFetchOnReconnect());e==null||e.refetch({cancelRefetch:!1}),(t=V(this,Pn))==null||t.continue()}addObserver(e){this.observers.includes(e)||(this.observers.push(e),this.clearGcTimeout(),V(this,Di).notify({type:"observerAdded",query:this,observer:e}))}removeObserver(e){this.observers.includes(e)&&(this.observers=this.observers.filter(t=>t!==e),this.observers.length||(V(this,Pn)&&(V(this,ga)||mt(this,_i,x_).call(this)?V(this,Pn).cancel({revert:!0}):V(this,Pn).cancelRetry()),this.scheduleGc()),V(this,Di).notify({type:"observerRemoved",query:this,observer:e}))}getObserversCount(){return this.observers.length}invalidate(){this.state.isInvalidated||mt(this,_i,Or).call(this,{type:"invalidate"})}async fetch(e,t){var f,m,g,v,S,E,w,x,y,N,P;if(this.state.fetchStatus!=="idle"&&((f=V(this,Pn))==null?void 0:f.status())!=="rejected"){if(this.state.data!==void 0&&(t!=null&&t.cancelRefetch))this.cancel({silent:!0});else if(V(this,Pn))return V(this,Pn).continueRetry(),V(this,Pn).promise}if(e&&this.setOptions(e),!this.options.queryFn){const C=this.observers.find(D=>D.options.queryFn);C&&this.setOptions(C.options)}const r=new AbortController,a=C=>{Object.defineProperty(C,"signal",{enumerable:!0,get:()=>(Be(this,ga,!0),r.signal)})},l=()=>{const C=p_(this.options,t),L=(()=>{const F={client:V(this,ma),queryKey:this.queryKey,meta:this.meta};return a(F),F})();return Be(this,ga,!1),this.options.persister?this.options.persister(C,L,this):C(L)},d=(()=>{const C={fetchOptions:t,options:this.options,queryKey:this.queryKey,client:V(this,ma),state:this.state,fetchFn:l};return a(C),C})(),h=V(this,So)==="infinite"?UM(this.options.pages):this.options.behavior;h==null||h.onFetch(d,this),Be(this,Mo,this.state),(this.state.fetchStatus==="idle"||this.state.fetchMeta!==((m=d.fetchOptions)==null?void 0:m.meta))&&mt(this,_i,Or).call(this,{type:"fetch",meta:(g=d.fetchOptions)==null?void 0:g.meta}),Be(this,Pn,g_({initialPromise:t==null?void 0:t.initialPromise,fn:d.fetchFn,onCancel:C=>{C instanceof Jf&&C.revert&&this.setState({...V(this,Mo),fetchStatus:"idle"}),r.abort()},onFail:(C,D)=>{mt(this,_i,Or).call(this,{type:"failed",failureCount:C,error:D})},onPause:()=>{mt(this,_i,Or).call(this,{type:"pause"})},onContinue:()=>{mt(this,_i,Or).call(this,{type:"continue"})},retry:d.options.retry,retryDelay:d.options.retryDelay,networkMode:d.options.networkMode,canRun:()=>!0}));try{const C=await V(this,Pn).start();if(C===void 0)throw new Error(`${this.queryHash} data is undefined`);return this.setData(C),(S=(v=V(this,Di).config).onSuccess)==null||S.call(v,C,this),(w=(E=V(this,Di).config).onSettled)==null||w.call(E,C,this.state.error,this),C}catch(C){if(C instanceof Jf){if(C.silent)return V(this,Pn).promise;if(C.revert){if(this.state.data===void 0)throw C;return this.state.data}}throw mt(this,_i,Or).call(this,{type:"error",error:C}),(y=(x=V(this,Di).config).onError)==null||y.call(x,C,this),(P=(N=V(this,Di).config).onSettled)==null||P.call(N,this.state.data,C,this),C}finally{this.scheduleGc()}}},So=new WeakMap,pa=new WeakMap,Mo=new WeakMap,Di=new WeakMap,ma=new WeakMap,Pn=new WeakMap,ql=new WeakMap,ga=new WeakMap,_i=new WeakSet,x_=function(){return this.state.fetchStatus==="paused"&&this.state.status==="pending"},Or=function(e){const t=r=>{switch(e.type){case"failed":return{...r,fetchFailureCount:e.failureCount,fetchFailureReason:e.error};case"pause":return{...r,fetchStatus:"paused"};case"continue":return{...r,fetchStatus:"fetching"};case"fetch":return{...r,...__(r.data,this.options),fetchMeta:e.meta??null};case"success":const a={...r,...wv(e.data,e.dataUpdatedAt),dataUpdateCount:r.dataUpdateCount+1,...!e.manual&&{fetchStatus:"idle",fetchFailureCount:0,fetchFailureReason:null}};return Be(this,Mo,e.manual?a:void 0),a;case"error":const l=e.error;return{...r,error:l,errorUpdateCount:r.errorUpdateCount+1,errorUpdatedAt:Date.now(),fetchFailureCount:r.fetchFailureCount+1,fetchFailureReason:l,fetchStatus:"idle",status:"error",isInvalidated:!0};case"invalidate":return{...r,isInvalidated:!0};case"setState":return{...r,...e.state}}};this.state=t(this.state),Mn.batch(()=>{this.observers.forEach(r=>{r.onQueryUpdate()}),V(this,Di).notify({query:this,type:"updated",action:e})})},s_);function __(i,e){return{fetchFailureCount:0,fetchFailureReason:null,fetchStatus:m_(e.networkMode)?"fetching":"paused",...i===void 0&&{error:null,status:"pending"}}}function wv(i,e){return{data:i,dataUpdatedAt:e??Date.now(),error:null,isInvalidated:!1,status:"success"}}function Tv(i){const e=typeof i.initialData=="function"?i.initialData():i.initialData,t=e!==void 0,r=t?typeof i.initialDataUpdatedAt=="function"?i.initialDataUpdatedAt():i.initialDataUpdatedAt:0;return{data:e,dataUpdateCount:0,dataUpdatedAt:t?r??Date.now():0,error:null,errorUpdateCount:0,errorUpdatedAt:0,fetchFailureCount:0,fetchFailureReason:null,fetchMeta:null,isInvalidated:!1,status:t?"success":"pending",fetchStatus:"idle"}}var ci,Tt,Yl,Kn,va,Eo,kr,Cs,Kl,wo,To,xa,_a,Rs,bo,Ft,Il,ep,tp,np,ip,rp,sp,ap,y_,a_,kM=(a_=class extends Fo{constructor(e,t){super();rt(this,Ft);rt(this,ci);rt(this,Tt);rt(this,Yl);rt(this,Kn);rt(this,va);rt(this,Eo);rt(this,kr);rt(this,Cs);rt(this,Kl);rt(this,wo);rt(this,To);rt(this,xa);rt(this,_a);rt(this,Rs);rt(this,bo,new Set);this.options=t,Be(this,ci,e),Be(this,Cs,null),Be(this,kr,Zf()),this.bindMethods(),this.setOptions(t)}bindMethods(){this.refetch=this.refetch.bind(this)}onSubscribe(){this.listeners.size===1&&(V(this,Tt).addObserver(this),bv(V(this,Tt),this.options)?mt(this,Ft,Il).call(this):this.updateResult(),mt(this,Ft,ip).call(this))}onUnsubscribe(){this.hasListeners()||this.destroy()}shouldFetchOnReconnect(){return op(V(this,Tt),this.options,this.options.refetchOnReconnect)}shouldFetchOnWindowFocus(){return op(V(this,Tt),this.options,this.options.refetchOnWindowFocus)}destroy(){this.listeners=new Set,mt(this,Ft,rp).call(this),mt(this,Ft,sp).call(this),V(this,Tt).removeObserver(this)}setOptions(e){const t=this.options,r=V(this,Tt);if(this.options=V(this,ci).defaultQueryOptions(e),this.options.enabled!==void 0&&typeof this.options.enabled!="boolean"&&typeof this.options.enabled!="function"&&typeof yi(this.options.enabled,V(this,Tt))!="boolean")throw new Error("Expected enabled to be a boolean or a callback that returns a boolean");mt(this,Ft,ap).call(this),V(this,Tt).setOptions(this.options),t._defaulted&&!Zu(this.options,t)&&V(this,ci).getQueryCache().notify({type:"observerOptionsUpdated",query:V(this,Tt),observer:this});const a=this.hasListeners();a&&Cv(V(this,Tt),r,this.options,t)&&mt(this,Ft,Il).call(this),this.updateResult(),a&&(V(this,Tt)!==r||yi(this.options.enabled,V(this,Tt))!==yi(t.enabled,V(this,Tt))||Is(this.options.staleTime,V(this,Tt))!==Is(t.staleTime,V(this,Tt)))&&mt(this,Ft,ep).call(this);const l=mt(this,Ft,tp).call(this);a&&(V(this,Tt)!==r||yi(this.options.enabled,V(this,Tt))!==yi(t.enabled,V(this,Tt))||l!==V(this,Rs))&&mt(this,Ft,np).call(this,l)}getOptimisticResult(e){const t=V(this,ci).getQueryCache().build(V(this,ci),e),r=this.createResult(t,e);return BM(this,r)&&(Be(this,Kn,r),Be(this,Eo,this.options),Be(this,va,V(this,Tt).state)),r}getCurrentResult(){return V(this,Kn)}trackResult(e,t){return new Proxy(e,{get:(r,a)=>(this.trackProp(a),t==null||t(a),a==="promise"&&(this.trackProp("data"),!this.options.experimental_prefetchInRender&&V(this,kr).status==="pending"&&V(this,kr).reject(new Error("experimental_prefetchInRender feature flag is not enabled"))),Reflect.get(r,a))})}trackProp(e){V(this,bo).add(e)}getCurrentQuery(){return V(this,Tt)}refetch({...e}={}){return this.fetch({...e})}fetchOptimistic(e){const t=V(this,ci).defaultQueryOptions(e),r=V(this,ci).getQueryCache().build(V(this,ci),t);return r.fetch().then(()=>this.createResult(r,t))}fetch(e){return mt(this,Ft,Il).call(this,{...e,cancelRefetch:e.cancelRefetch??!0}).then(()=>(this.updateResult(),V(this,Kn)))}createResult(e,t){var I;const r=V(this,Tt),a=this.options,l=V(this,Kn),c=V(this,va),d=V(this,Eo),f=e!==r?e.state:V(this,Yl),{state:m}=e;let g={...m},v=!1,S;if(t._optimisticResults){const G=this.hasListeners(),H=!G&&bv(e,t),K=G&&Cv(e,r,t,a);(H||K)&&(g={...g,...__(m.data,e.options)}),t._optimisticResults==="isRestoring"&&(g.fetchStatus="idle")}let{error:E,errorUpdatedAt:w,status:x}=g;S=g.data;let y=!1;if(t.placeholderData!==void 0&&S===void 0&&x==="pending"){let G;l!=null&&l.isPlaceholderData&&t.placeholderData===(d==null?void 0:d.placeholderData)?(G=l.data,y=!0):G=typeof t.placeholderData=="function"?t.placeholderData((I=V(this,To))==null?void 0:I.state.data,V(this,To)):t.placeholderData,G!==void 0&&(x="success",S=Qf(l==null?void 0:l.data,G,t),v=!0)}if(t.select&&S!==void 0&&!y)if(l&&S===(c==null?void 0:c.data)&&t.select===V(this,Kl))S=V(this,wo);else try{Be(this,Kl,t.select),S=t.select(S),S=Qf(l==null?void 0:l.data,S,t),Be(this,wo,S),Be(this,Cs,null)}catch(G){Be(this,Cs,G)}V(this,Cs)&&(E=V(this,Cs),S=V(this,wo),w=Date.now(),x="error");const N=g.fetchStatus==="fetching",P=x==="pending",C=x==="error",D=P&&N,L=S!==void 0,T={status:x,fetchStatus:g.fetchStatus,isPending:P,isSuccess:x==="success",isError:C,isInitialLoading:D,isLoading:D,data:S,dataUpdatedAt:g.dataUpdatedAt,error:E,errorUpdatedAt:w,failureCount:g.fetchFailureCount,failureReason:g.fetchFailureReason,errorUpdateCount:g.errorUpdateCount,isFetched:e.isFetched(),isFetchedAfterMount:g.dataUpdateCount>f.dataUpdateCount||g.errorUpdateCount>f.errorUpdateCount,isFetching:N,isRefetching:N&&!P,isLoadingError:C&&!L,isPaused:g.fetchStatus==="paused",isPlaceholderData:v,isRefetchError:C&&L,isStale:um(e,t),refetch:this.refetch,promise:V(this,kr),isEnabled:yi(t.enabled,e)!==!1};if(this.options.experimental_prefetchInRender){const G=T.data!==void 0,H=T.status==="error"&&!G,K=O=>{H?O.reject(T.error):G&&O.resolve(T.data)},re=()=>{const O=Be(this,kr,T.promise=Zf());K(O)},fe=V(this,kr);switch(fe.status){case"pending":e.queryHash===r.queryHash&&K(fe);break;case"fulfilled":(H||T.data!==fe.value)&&re();break;case"rejected":(!H||T.error!==fe.reason)&&re();break}}return T}updateResult(){const e=V(this,Kn),t=this.createResult(V(this,Tt),this.options);if(Be(this,va,V(this,Tt).state),Be(this,Eo,this.options),V(this,va).data!==void 0&&Be(this,To,V(this,Tt)),Zu(t,e))return;Be(this,Kn,t);const r=()=>{if(!e)return!0;const{notifyOnChangeProps:a}=this.options,l=typeof a=="function"?a():a;if(l==="all"||!l&&!V(this,bo).size)return!0;const c=new Set(l??V(this,bo));return this.options.throwOnError&&c.add("error"),Object.keys(V(this,Kn)).some(d=>{const h=d;return V(this,Kn)[h]!==e[h]&&c.has(h)})};mt(this,Ft,y_).call(this,{listeners:r()})}onQueryUpdate(){this.updateResult(),this.hasListeners()&&mt(this,Ft,ip).call(this)}},ci=new WeakMap,Tt=new WeakMap,Yl=new WeakMap,Kn=new WeakMap,va=new WeakMap,Eo=new WeakMap,kr=new WeakMap,Cs=new WeakMap,Kl=new WeakMap,wo=new WeakMap,To=new WeakMap,xa=new WeakMap,_a=new WeakMap,Rs=new WeakMap,bo=new WeakMap,Ft=new WeakSet,Il=function(e){mt(this,Ft,ap).call(this);let t=V(this,Tt).fetch(this.options,e);return e!=null&&e.throwOnError||(t=t.catch(Qn)),t},ep=function(){mt(this,Ft,rp).call(this);const e=Is(this.options.staleTime,V(this,Tt));if(Hl.isServer()||V(this,Kn).isStale||!Yf(e))return;const r=h_(V(this,Kn).dataUpdatedAt,e)+1;Be(this,xa,la.setTimeout(()=>{V(this,Kn).isStale||this.updateResult()},r))},tp=function(){return(typeof this.options.refetchInterval=="function"?this.options.refetchInterval(V(this,Tt)):this.options.refetchInterval)??!1},np=function(e){mt(this,Ft,sp).call(this),Be(this,Rs,e),!(Hl.isServer()||yi(this.options.enabled,V(this,Tt))===!1||!Yf(V(this,Rs))||V(this,Rs)===0)&&Be(this,_a,la.setInterval(()=>{(this.options.refetchIntervalInBackground||am.isFocused())&&mt(this,Ft,Il).call(this)},V(this,Rs)))},ip=function(){mt(this,Ft,ep).call(this),mt(this,Ft,np).call(this,mt(this,Ft,tp).call(this))},rp=function(){V(this,xa)!==void 0&&(la.clearTimeout(V(this,xa)),Be(this,xa,void 0))},sp=function(){V(this,_a)!==void 0&&(la.clearInterval(V(this,_a)),Be(this,_a,void 0))},ap=function(){const e=V(this,ci).getQueryCache().build(V(this,ci),this.options);if(e===V(this,Tt))return;const t=V(this,Tt);Be(this,Tt,e),Be(this,Yl,e.state),this.hasListeners()&&(t==null||t.removeObserver(this),e.addObserver(this))},y_=function(e){Mn.batch(()=>{e.listeners&&this.listeners.forEach(t=>{t(V(this,Kn))}),V(this,ci).getQueryCache().notify({query:V(this,Tt),type:"observerResultsUpdated"})})},a_);function zM(i,e){return yi(e.enabled,i)!==!1&&i.state.data===void 0&&!(i.state.status==="error"&&yi(e.retryOnMount,i)===!1)}function bv(i,e){return zM(i,e)||i.state.data!==void 0&&op(i,e,e.refetchOnMount)}function op(i,e,t){if(yi(e.enabled,i)!==!1&&Is(e.staleTime,i)!=="static"){const r=typeof t=="function"?t(i):t;return r==="always"||r!==!1&&um(i,e)}return!1}function Cv(i,e,t,r){return(i!==e||yi(r.enabled,i)===!1)&&(!t.suspense||i.state.status!=="error")&&um(i,t)}function um(i,e){return yi(e.enabled,i)!==!1&&i.isStaleByTime(Is(e.staleTime,i))}function BM(i,e){return!Zu(i.getCurrentResult(),e)}var Ql,lr,Gn,ya,cr,Ss,o_,HM=(o_=class extends v_{constructor(e){super();rt(this,cr);rt(this,Ql);rt(this,lr);rt(this,Gn);rt(this,ya);Be(this,Ql,e.client),this.mutationId=e.mutationId,Be(this,Gn,e.mutationCache),Be(this,lr,[]),this.state=e.state||S_(),this.setOptions(e.options),this.scheduleGc()}setOptions(e){this.options=e,this.updateGcTime(this.options.gcTime)}get meta(){return this.options.meta}addObserver(e){V(this,lr).includes(e)||(V(this,lr).push(e),this.clearGcTimeout(),V(this,Gn).notify({type:"observerAdded",mutation:this,observer:e}))}removeObserver(e){Be(this,lr,V(this,lr).filter(t=>t!==e)),this.scheduleGc(),V(this,Gn).notify({type:"observerRemoved",mutation:this,observer:e})}optionalRemove(){V(this,lr).length||(this.state.status==="pending"?this.scheduleGc():V(this,Gn).remove(this))}continue(){var e;return((e=V(this,ya))==null?void 0:e.continue())??this.execute(this.state.variables)}async execute(e){var c,d,h,f,m,g,v,S,E,w,x,y,N,P,C,D,L,F;const t=()=>{mt(this,cr,Ss).call(this,{type:"continue"})},r={client:V(this,Ql),meta:this.options.meta,mutationKey:this.options.mutationKey};Be(this,ya,g_({fn:()=>this.options.mutationFn?this.options.mutationFn(e,r):Promise.reject(new Error("No mutationFn found")),onFail:(T,I)=>{mt(this,cr,Ss).call(this,{type:"failed",failureCount:T,error:I})},onPause:()=>{mt(this,cr,Ss).call(this,{type:"pause"})},onContinue:t,retry:this.options.retry??0,retryDelay:this.options.retryDelay,networkMode:this.options.networkMode,canRun:()=>V(this,Gn).canRun(this)}));const a=this.state.status==="pending",l=!V(this,ya).canStart();try{if(a)t();else{mt(this,cr,Ss).call(this,{type:"pending",variables:e,isPaused:l}),V(this,Gn).config.onMutate&&await V(this,Gn).config.onMutate(e,this,r);const I=await((d=(c=this.options).onMutate)==null?void 0:d.call(c,e,r));I!==this.state.context&&mt(this,cr,Ss).call(this,{type:"pending",context:I,variables:e,isPaused:l})}const T=await V(this,ya).start();return await((f=(h=V(this,Gn).config).onSuccess)==null?void 0:f.call(h,T,e,this.state.context,this,r)),await((g=(m=this.options).onSuccess)==null?void 0:g.call(m,T,e,this.state.context,r)),await((S=(v=V(this,Gn).config).onSettled)==null?void 0:S.call(v,T,null,this.state.variables,this.state.context,this,r)),await((w=(E=this.options).onSettled)==null?void 0:w.call(E,T,null,e,this.state.context,r)),mt(this,cr,Ss).call(this,{type:"success",data:T}),T}catch(T){try{await((y=(x=V(this,Gn).config).onError)==null?void 0:y.call(x,T,e,this.state.context,this,r))}catch(I){Promise.reject(I)}try{await((P=(N=this.options).onError)==null?void 0:P.call(N,T,e,this.state.context,r))}catch(I){Promise.reject(I)}try{await((D=(C=V(this,Gn).config).onSettled)==null?void 0:D.call(C,void 0,T,this.state.variables,this.state.context,this,r))}catch(I){Promise.reject(I)}try{await((F=(L=this.options).onSettled)==null?void 0:F.call(L,void 0,T,e,this.state.context,r))}catch(I){Promise.reject(I)}throw mt(this,cr,Ss).call(this,{type:"error",error:T}),T}finally{V(this,Gn).runNext(this)}}},Ql=new WeakMap,lr=new WeakMap,Gn=new WeakMap,ya=new WeakMap,cr=new WeakSet,Ss=function(e){const t=r=>{switch(e.type){case"failed":return{...r,failureCount:e.failureCount,failureReason:e.error};case"pause":return{...r,isPaused:!0};case"continue":return{...r,isPaused:!1};case"pending":return{...r,context:e.context,data:void 0,failureCount:0,failureReason:null,error:null,isPaused:e.isPaused,status:"pending",variables:e.variables,submittedAt:Date.now()};case"success":return{...r,data:e.data,failureCount:0,failureReason:null,error:null,status:"success",isPaused:!1};case"error":return{...r,data:void 0,error:e.error,failureCount:r.failureCount+1,failureReason:e.error,isPaused:!1,status:"error"}}};this.state=t(this.state),Mn.batch(()=>{V(this,lr).forEach(r=>{r.onMutationUpdate(e)}),V(this,Gn).notify({mutation:this,type:"updated",action:e})})},o_);function S_(){return{context:void 0,data:void 0,error:null,failureCount:0,failureReason:null,isPaused:!1,status:"idle",variables:void 0,submittedAt:0}}var zr,qi,Zl,l_,VM=(l_=class extends Fo{constructor(e={}){super();rt(this,zr);rt(this,qi);rt(this,Zl);this.config=e,Be(this,zr,new Set),Be(this,qi,new Map),Be(this,Zl,0)}build(e,t,r){const a=new HM({client:e,mutationCache:this,mutationId:++lu(this,Zl)._,options:e.defaultMutationOptions(t),state:r});return this.add(a),a}add(e){V(this,zr).add(e);const t=uu(e);if(typeof t=="string"){const r=V(this,qi).get(t);r?r.push(e):V(this,qi).set(t,[e])}this.notify({type:"added",mutation:e})}remove(e){if(V(this,zr).delete(e)){const t=uu(e);if(typeof t=="string"){const r=V(this,qi).get(t);if(r)if(r.length>1){const a=r.indexOf(e);a!==-1&&r.splice(a,1)}else r[0]===e&&V(this,qi).delete(t)}}this.notify({type:"removed",mutation:e})}canRun(e){const t=uu(e);if(typeof t=="string"){const r=V(this,qi).get(t),a=r==null?void 0:r.find(l=>l.state.status==="pending");return!a||a===e}else return!0}runNext(e){var r;const t=uu(e);if(typeof t=="string"){const a=(r=V(this,qi).get(t))==null?void 0:r.find(l=>l!==e&&l.state.isPaused);return(a==null?void 0:a.continue())??Promise.resolve()}else return Promise.resolve()}clear(){Mn.batch(()=>{V(this,zr).forEach(e=>{this.notify({type:"removed",mutation:e})}),V(this,zr).clear(),V(this,qi).clear()})}getAll(){return Array.from(V(this,zr))}find(e){const t={exact:!0,...e};return this.getAll().find(r=>yv(t,r))}findAll(e={}){return this.getAll().filter(t=>yv(e,t))}notify(e){Mn.batch(()=>{this.listeners.forEach(t=>{t(e)})})}resumePausedMutations(){const e=this.getAll().filter(t=>t.state.isPaused);return Mn.batch(()=>Promise.all(e.map(t=>t.continue().catch(Qn))))}},zr=new WeakMap,qi=new WeakMap,Zl=new WeakMap,l_);function uu(i){var e;return(e=i.options.scope)==null?void 0:e.id}var Br,As,ui,Hr,jr,Hu,lp,c_,GM=(c_=class extends Fo{constructor(t,r){super();rt(this,jr);rt(this,Br);rt(this,As);rt(this,ui);rt(this,Hr);Be(this,Br,t),this.setOptions(r),this.bindMethods(),mt(this,jr,Hu).call(this)}bindMethods(){this.mutate=this.mutate.bind(this),this.reset=this.reset.bind(this)}setOptions(t){var a;const r=this.options;this.options=V(this,Br).defaultMutationOptions(t),Zu(this.options,r)||V(this,Br).getMutationCache().notify({type:"observerOptionsUpdated",mutation:V(this,ui),observer:this}),r!=null&&r.mutationKey&&this.options.mutationKey&&Sa(r.mutationKey)!==Sa(this.options.mutationKey)?this.reset():((a=V(this,ui))==null?void 0:a.state.status)==="pending"&&V(this,ui).setOptions(this.options)}onUnsubscribe(){var t;this.hasListeners()||(t=V(this,ui))==null||t.removeObserver(this)}onMutationUpdate(t){mt(this,jr,Hu).call(this),mt(this,jr,lp).call(this,t)}getCurrentResult(){return V(this,As)}reset(){var t;(t=V(this,ui))==null||t.removeObserver(this),Be(this,ui,void 0),mt(this,jr,Hu).call(this),mt(this,jr,lp).call(this)}mutate(t,r){var a;return Be(this,Hr,r),(a=V(this,ui))==null||a.removeObserver(this),Be(this,ui,V(this,Br).getMutationCache().build(V(this,Br),this.options)),V(this,ui).addObserver(this),V(this,ui).execute(t)}},Br=new WeakMap,As=new WeakMap,ui=new WeakMap,Hr=new WeakMap,jr=new WeakSet,Hu=function(){var r;const t=((r=V(this,ui))==null?void 0:r.state)??S_();Be(this,As,{...t,isPending:t.status==="pending",isSuccess:t.status==="success",isError:t.status==="error",isIdle:t.status==="idle",mutate:this.mutate,reset:this.reset})},lp=function(t){Mn.batch(()=>{var r,a,l,c,d,h,f,m;if(V(this,Hr)&&this.hasListeners()){const g=V(this,As).variables,v=V(this,As).context,S={client:V(this,Br),meta:this.options.meta,mutationKey:this.options.mutationKey};if((t==null?void 0:t.type)==="success"){try{(a=(r=V(this,Hr)).onSuccess)==null||a.call(r,t.data,g,v,S)}catch(E){Promise.reject(E)}try{(c=(l=V(this,Hr)).onSettled)==null||c.call(l,t.data,null,g,v,S)}catch(E){Promise.reject(E)}}else if((t==null?void 0:t.type)==="error"){try{(h=(d=V(this,Hr)).onError)==null||h.call(d,t.error,g,v,S)}catch(E){Promise.reject(E)}try{(m=(f=V(this,Hr)).onSettled)==null||m.call(f,void 0,t.error,g,v,S)}catch(E){Promise.reject(E)}}}this.listeners.forEach(g=>{g(V(this,As))})})},c_),ur,u_,WM=(u_=class extends Fo{constructor(e={}){super();rt(this,ur);this.config=e,Be(this,ur,new Map)}build(e,t,r){const a=t.queryKey,l=t.queryHash??om(a,t);let c=this.get(l);return c||(c=new OM({client:e,queryKey:a,queryHash:l,options:e.defaultQueryOptions(t),state:r,defaultOptions:e.getQueryDefaults(a)}),this.add(c)),c}add(e){V(this,ur).has(e.queryHash)||(V(this,ur).set(e.queryHash,e),this.notify({type:"added",query:e}))}remove(e){const t=V(this,ur).get(e.queryHash);t&&(e.destroy(),t===e&&V(this,ur).delete(e.queryHash),this.notify({type:"removed",query:e}))}clear(){Mn.batch(()=>{this.getAll().forEach(e=>{this.remove(e)})})}get(e){return V(this,ur).get(e)}getAll(){return[...V(this,ur).values()]}find(e){const t={exact:!0,...e};return this.getAll().find(r=>_v(t,r))}findAll(e={}){const t=this.getAll();return Object.keys(e).length>0?t.filter(r=>_v(e,r)):t}notify(e){Mn.batch(()=>{this.listeners.forEach(t=>{t(e)})})}onFocus(){Mn.batch(()=>{this.getAll().forEach(e=>{e.onFocus()})})}onOnline(){Mn.batch(()=>{this.getAll().forEach(e=>{e.onOnline()})})}},ur=new WeakMap,u_),un,Ps,Ns,Co,Ro,Ls,Ao,Po,d_,jM=(d_=class{constructor(i={}){rt(this,un);rt(this,Ps);rt(this,Ns);rt(this,Co);rt(this,Ro);rt(this,Ls);rt(this,Ao);rt(this,Po);Be(this,un,i.queryCache||new WM),Be(this,Ps,i.mutationCache||new VM),Be(this,Ns,i.defaultOptions||{}),Be(this,Co,new Map),Be(this,Ro,new Map),Be(this,Ls,0)}mount(){lu(this,Ls)._++,V(this,Ls)===1&&(Be(this,Ao,am.subscribe(async i=>{i&&(await this.resumePausedMutations(),V(this,un).onFocus())})),Be(this,Po,Ju.subscribe(async i=>{i&&(await this.resumePausedMutations(),V(this,un).onOnline())})))}unmount(){var i,e;lu(this,Ls)._--,V(this,Ls)===0&&((i=V(this,Ao))==null||i.call(this),Be(this,Ao,void 0),(e=V(this,Po))==null||e.call(this),Be(this,Po,void 0))}isFetching(i){return V(this,un).findAll({...i,fetchStatus:"fetching"}).length}isMutating(i){return V(this,Ps).findAll({...i,status:"pending"}).length}getQueryData(i){var t;const e=this.defaultQueryOptions({queryKey:i});return(t=V(this,un).get(e.queryHash))==null?void 0:t.state.data}ensureQueryData(i){const e=this.defaultQueryOptions(i),t=V(this,un).build(this,e),r=t.state.data;return r===void 0?this.fetchQuery(i):(i.revalidateIfStale&&t.isStaleByTime(Is(e.staleTime,t))&&this.prefetchQuery(e),Promise.resolve(r))}getQueriesData(i){return V(this,un).findAll(i).map(({queryKey:e,state:t})=>{const r=t.data;return[e,r]})}setQueryData(i,e,t){const r=this.defaultQueryOptions({queryKey:i}),a=V(this,un).get(r.queryHash),l=a==null?void 0:a.state.data,c=TM(e,l);if(c!==void 0)return V(this,un).build(this,r).setData(c,{...t,manual:!0})}setQueriesData(i,e,t){return Mn.batch(()=>V(this,un).findAll(i).map(({queryKey:r})=>[r,this.setQueryData(r,e,t)]))}getQueryState(i){var t;const e=this.defaultQueryOptions({queryKey:i});return(t=V(this,un).get(e.queryHash))==null?void 0:t.state}removeQueries(i){const e=V(this,un);Mn.batch(()=>{e.findAll(i).forEach(t=>{e.remove(t)})})}resetQueries(i,e){const t=V(this,un);return Mn.batch(()=>(t.findAll(i).forEach(r=>{r.reset()}),this.refetchQueries({type:"active",...i},e)))}cancelQueries(i,e={}){const t={revert:!0,...e},r=Mn.batch(()=>V(this,un).findAll(i).map(a=>a.cancel(t)));return Promise.all(r).then(Qn).catch(Qn)}invalidateQueries(i,e={}){return Mn.batch(()=>(V(this,un).findAll(i).forEach(t=>{t.invalidate()}),(i==null?void 0:i.refetchType)==="none"?Promise.resolve():this.refetchQueries({...i,type:(i==null?void 0:i.refetchType)??(i==null?void 0:i.type)??"active"},e)))}refetchQueries(i,e={}){const t={...e,cancelRefetch:e.cancelRefetch??!0},r=Mn.batch(()=>V(this,un).findAll(i).filter(a=>!a.isDisabled()&&!a.isStatic()).map(a=>{let l=a.fetch(void 0,t);return t.throwOnError||(l=l.catch(Qn)),a.state.fetchStatus==="paused"?Promise.resolve():l}));return Promise.all(r).then(Qn)}fetchQuery(i){const e=this.defaultQueryOptions(i);e.retry===void 0&&(e.retry=!1);const t=V(this,un).build(this,e);return t.isStaleByTime(Is(e.staleTime,t))?t.fetch(e):Promise.resolve(t.state.data)}prefetchQuery(i){return this.fetchQuery(i).then(Qn).catch(Qn)}fetchInfiniteQuery(i){return i._type="infinite",this.fetchQuery(i)}prefetchInfiniteQuery(i){return this.fetchInfiniteQuery(i).then(Qn).catch(Qn)}ensureInfiniteQueryData(i){return i._type="infinite",this.ensureQueryData(i)}resumePausedMutations(){return Ju.isOnline()?V(this,Ps).resumePausedMutations():Promise.resolve()}getQueryCache(){return V(this,un)}getMutationCache(){return V(this,Ps)}getDefaultOptions(){return V(this,Ns)}setDefaultOptions(i){Be(this,Ns,i)}setQueryDefaults(i,e){V(this,Co).set(Sa(i),{queryKey:i,defaultOptions:e})}getQueryDefaults(i){const e=[...V(this,Co).values()],t={};return e.forEach(r=>{Bl(i,r.queryKey)&&Object.assign(t,r.defaultOptions)}),t}setMutationDefaults(i,e){V(this,Ro).set(Sa(i),{mutationKey:i,defaultOptions:e})}getMutationDefaults(i){const e=[...V(this,Ro).values()],t={};return e.forEach(r=>{Bl(i,r.mutationKey)&&Object.assign(t,r.defaultOptions)}),t}defaultQueryOptions(i){if(i._defaulted)return i;const e={...V(this,Ns).queries,...this.getQueryDefaults(i.queryKey),...i,_defaulted:!0};return e.queryHash||(e.queryHash=om(e.queryKey,e)),e.refetchOnReconnect===void 0&&(e.refetchOnReconnect=e.networkMode!=="always"),e.throwOnError===void 0&&(e.throwOnError=!!e.suspense),!e.networkMode&&e.persister&&(e.networkMode="offlineFirst"),e.queryFn===lm&&(e.enabled=!1),e}defaultMutationOptions(i){return i!=null&&i._defaulted?i:{...V(this,Ns).mutations,...(i==null?void 0:i.mutationKey)&&this.getMutationDefaults(i.mutationKey),...i,_defaulted:!0}}clear(){V(this,un).clear(),V(this,Ps).clear()}},un=new WeakMap,Ps=new WeakMap,Ns=new WeakMap,Co=new WeakMap,Ro=new WeakMap,Ls=new WeakMap,Ao=new WeakMap,Po=new WeakMap,d_),M_=B.createContext(void 0),dm=i=>{const e=B.useContext(M_);if(!e)throw new Error("No QueryClient set, use QueryClientProvider to set one");return e},XM=({client:i,children:e})=>(B.useEffect(()=>(i.mount(),()=>{i.unmount()}),[i]),M.jsx(M_.Provider,{value:i,children:e})),E_=B.createContext(!1),$M=()=>B.useContext(E_);E_.Provider;function qM(){let i=!1;return{clearReset:()=>{i=!1},reset:()=>{i=!0},isReset:()=>i}}var YM=B.createContext(qM()),KM=()=>B.useContext(YM),QM=(i,e,t)=>{const r=t!=null&&t.state.error&&typeof i.throwOnError=="function"?cm(i.throwOnError,[t.state.error,t]):i.throwOnError;(i.suspense||i.experimental_prefetchInRender||r)&&(e.isReset()||(i.retryOnMount=!1))},ZM=i=>{B.useEffect(()=>{i.clearReset()},[i])},JM=({result:i,errorResetBoundary:e,throwOnError:t,query:r,suspense:a})=>i.isError&&!e.isReset()&&!i.isFetching&&r&&(a&&i.data===void 0||cm(t,[i.error,r])),eE=i=>{if(i.suspense){const t=a=>a==="static"?a:Math.max(a??1e3,1e3),r=i.staleTime;i.staleTime=typeof r=="function"?(...a)=>t(r(...a)):t(r),typeof i.gcTime=="number"&&(i.gcTime=Math.max(i.gcTime,1e3))}},tE=(i,e)=>i.isLoading&&i.isFetching&&!e,nE=(i,e)=>(i==null?void 0:i.suspense)&&e.isPending,Rv=(i,e,t)=>e.fetchOptimistic(i).catch(()=>{t.clearReset()});function iE(i,e,t){var S,E,w,x;const r=$M(),a=KM(),l=dm(),c=l.defaultQueryOptions(i);(E=(S=l.getDefaultOptions().queries)==null?void 0:S._experimental_beforeQuery)==null||E.call(S,c);const d=l.getQueryCache().get(c.queryHash),h=i.subscribed!==!1;c._optimisticResults=r?"isRestoring":h?"optimistic":void 0,eE(c),QM(c,a,d),ZM(a);const f=!l.getQueryCache().get(c.queryHash),[m]=B.useState(()=>new e(l,c)),g=m.getOptimisticResult(c),v=!r&&h;if(B.useSyncExternalStore(B.useCallback(y=>{const N=v?m.subscribe(Mn.batchCalls(y)):Qn;return m.updateResult(),N},[m,v]),()=>m.getCurrentResult(),()=>m.getCurrentResult()),B.useEffect(()=>{m.setOptions(c)},[c,m]),nE(c,g))throw Rv(c,m,a);if(JM({result:g,errorResetBoundary:a,throwOnError:c.throwOnError,query:d,suspense:c.suspense}))throw g.error;if((x=(w=l.getDefaultOptions().queries)==null?void 0:w._experimental_afterQuery)==null||x.call(w,c,g),c.experimental_prefetchInRender&&!Hl.isServer()&&tE(g,r)){const y=f?Rv(c,m,a):d==null?void 0:d.promise;y==null||y.catch(Qn).finally(()=>{m.updateResult()})}return c.notifyOnChangeProps?g:m.trackResult(g)}function No(i,e){return iE(i,kM)}function ca(i,e){const t=dm(),[r]=B.useState(()=>new GM(t,i));B.useEffect(()=>{r.setOptions(i)},[r,i]);const a=B.useSyncExternalStore(B.useCallback(c=>r.subscribe(Mn.batchCalls(c)),[r]),()=>r.getCurrentResult(),()=>r.getCurrentResult()),l=B.useCallback((c,d)=>{r.mutate(c,d).catch(Qn)},[r]);if(a.error&&cm(r.options.throwOnError,[a.error]))throw a.error;return{...a,mutate:l,mutateAsync:a.mutate}}/**
 * react-router v7.18.0
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */var hm=/^(?:[a-z][a-z0-9+.-]*:|[\\/]{2})/i,w_=/^[\\/]{2}/;function rE(i,e){return e+i.replace(/\\/g,"/")}var Av="popstate";function Pv(i){return typeof i=="object"&&i!=null&&"pathname"in i&&"search"in i&&"hash"in i&&"state"in i&&"key"in i}function sE(i={}){function e(r,a){var f;let l=(f=a.state)==null?void 0:f.masked,{pathname:c,search:d,hash:h}=l||r.location;return cp("",{pathname:c,search:d,hash:h},a.state&&a.state.usr||null,a.state&&a.state.key||"default",l?{pathname:r.location.pathname,search:r.location.search,hash:r.location.hash}:void 0)}function t(r,a){return typeof a=="string"?a:Vl(a)}return oE(e,t,null,i)}function nn(i,e){if(i===!1||i===null||typeof i>"u")throw new Error(e)}function Ui(i,e){if(!i){typeof console<"u"&&console.warn(e);try{throw new Error(e)}catch{}}}function aE(){return Math.random().toString(36).substring(2,10)}function Nv(i,e){return{usr:i.state,key:i.key,idx:e,masked:i.mask?{pathname:i.pathname,search:i.search,hash:i.hash}:void 0}}function cp(i,e,t=null,r,a){return{pathname:typeof i=="string"?i:i.pathname,search:"",hash:"",...typeof e=="string"?Oo(e):e,state:t,key:e&&e.key||r||aE(),mask:a}}function Vl({pathname:i="/",search:e="",hash:t=""}){return e&&e!=="?"&&(i+=e.charAt(0)==="?"?e:"?"+e),t&&t!=="#"&&(i+=t.charAt(0)==="#"?t:"#"+t),i}function Oo(i){let e={};if(i){let t=i.indexOf("#");t>=0&&(e.hash=i.substring(t),i=i.substring(0,t));let r=i.indexOf("?");r>=0&&(e.search=i.substring(r),i=i.substring(0,r)),i&&(e.pathname=i)}return e}function oE(i,e,t,r={}){let{window:a=document.defaultView,v5Compat:l=!1}=r,c=a.history,d="POP",h=null,f=m();f==null&&(f=0,c.replaceState({...c.state,idx:f},""));function m(){return(c.state||{idx:null}).idx}function g(){d="POP";let x=m(),y=x==null?null:x-f;f=x,h&&h({action:d,location:w.location,delta:y})}function v(x,y){d="PUSH";let N=Pv(x)?x:cp(w.location,x,y);f=m()+1;let P=Nv(N,f),C=w.createHref(N.mask||N);try{c.pushState(P,"",C)}catch(D){if(D instanceof DOMException&&D.name==="DataCloneError")throw D;a.location.assign(C)}l&&h&&h({action:d,location:w.location,delta:1})}function S(x,y){d="REPLACE";let N=Pv(x)?x:cp(w.location,x,y);f=m();let P=Nv(N,f),C=w.createHref(N.mask||N);c.replaceState(P,"",C),l&&h&&h({action:d,location:w.location,delta:0})}function E(x){return lE(a,x)}let w={get action(){return d},get location(){return i(a,c)},listen(x){if(h)throw new Error("A history only accepts one active listener");return a.addEventListener(Av,g),h=x,()=>{a.removeEventListener(Av,g),h=null}},createHref(x){return e(a,x)},createURL:E,encodeLocation(x){let y=E(x);return{pathname:y.pathname,search:y.search,hash:y.hash}},push:v,replace:S,go(x){return c.go(x)}};return w}function lE(i,e,t=!1){let r="http://localhost";i&&(r=i.location.origin!=="null"?i.location.origin:i.location.href),nn(r,"No window.location.(origin|href) available to create URL");let a=typeof e=="string"?e:Vl(e);return a=a.replace(/ $/,"%20"),!t&&w_.test(a)&&(a=r+a),new URL(a,r)}function T_(i,e,t="/"){return cE(i,e,t,!1)}function cE(i,e,t,r,a){let l=typeof e=="string"?Oo(e):e,c=Xr(l.pathname||"/",t);if(c==null)return null;let d=uE(i),h=null,f=SE(c);for(let m=0;h==null&&m<d.length;++m)h=yE(d[m],f,r);return h}function uE(i){let e=b_(i);return dE(e),e}function b_(i,e=[],t=[],r="",a=!1){let l=(c,d,h=a,f)=>{let m={relativePath:f===void 0?c.path||"":f,caseSensitive:c.caseSensitive===!0,childrenIndex:d,route:c};if(m.relativePath.startsWith("/")){if(!m.relativePath.startsWith(r)&&h)return;nn(m.relativePath.startsWith(r),`Absolute route path "${m.relativePath}" nested under path "${r}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`),m.relativePath=m.relativePath.slice(r.length)}let g=Qi([r,m.relativePath]),v=t.concat(m);c.children&&c.children.length>0&&(nn(c.index!==!0,`Index routes must not have child routes. Please remove all child routes from route path "${g}".`),b_(c.children,e,v,g,h)),!(c.path==null&&!c.index)&&e.push({path:g,score:xE(g,c.index),routesMeta:v.map((S,E)=>{let[w,x]=A_(S.relativePath,S.caseSensitive,E===v.length-1);return{...S,matcher:w,compiledParams:x}})})};return i.forEach((c,d)=>{var h;if(c.path===""||!((h=c.path)!=null&&h.includes("?")))l(c,d);else for(let f of C_(c.path))l(c,d,!0,f)}),e}function C_(i){let e=i.split("/");if(e.length===0)return[];let[t,...r]=e,a=t.endsWith("?"),l=t.replace(/\?$/,"");if(r.length===0)return a?[l,""]:[l];let c=C_(r.join("/")),d=[];return d.push(...c.map(h=>h===""?l:[l,h].join("/"))),a&&d.push(...c),d.map(h=>i.startsWith("/")&&h===""?"/":h)}function dE(i){i.sort((e,t)=>e.score!==t.score?t.score-e.score:_E(e.routesMeta.map(r=>r.childrenIndex),t.routesMeta.map(r=>r.childrenIndex)))}var hE=/^:[\w-]+$/,fE=3,pE=2,mE=1,gE=10,vE=-2,Lv=i=>i==="*";function xE(i,e){let t=i.split("/"),r=t.length;return t.some(Lv)&&(r+=vE),e&&(r+=pE),t.filter(a=>!Lv(a)).reduce((a,l)=>a+(hE.test(l)?fE:l===""?mE:gE),r)}function _E(i,e){return i.length===e.length&&i.slice(0,-1).every((r,a)=>r===e[a])?i[i.length-1]-e[e.length-1]:0}function yE(i,e,t=!1){let{routesMeta:r}=i,a={},l="/",c=[];for(let d=0;d<r.length;++d){let h=r[d],f=d===r.length-1,m=l==="/"?e:e.slice(l.length)||"/",g={path:h.relativePath,caseSensitive:h.caseSensitive,end:f},v=h.matcher&&h.compiledParams?R_(g,m,h.matcher,h.compiledParams):ed(g,m),S=h.route;if(!v&&f&&t&&!r[r.length-1].route.index&&(v=ed({path:h.relativePath,caseSensitive:h.caseSensitive,end:!1},m)),!v)return null;Object.assign(a,v.params),c.push({params:a,pathname:Qi([l,v.pathname]),pathnameBase:wE(Qi([l,v.pathnameBase])),route:S}),v.pathnameBase!=="/"&&(l=Qi([l,v.pathnameBase]))}return c}function ed(i,e){typeof i=="string"&&(i={path:i,caseSensitive:!1,end:!0});let[t,r]=A_(i.path,i.caseSensitive,i.end);return R_(i,e,t,r)}function R_(i,e,t,r){let a=e.match(t);if(!a)return null;let l=a[0],c=l.replace(/(.)\/+$/,"$1"),d=a.slice(1);return{params:r.reduce((f,{paramName:m,isOptional:g},v)=>{if(m==="*"){let E=d[v]||"";c=l.slice(0,l.length-E.length).replace(/(.)\/+$/,"$1")}const S=d[v];return g&&!S?f[m]=void 0:f[m]=(S||"").replace(/%2F/g,"/"),f},{}),pathname:l,pathnameBase:c,pattern:i}}function A_(i,e=!1,t=!0){Ui(i==="*"||!i.endsWith("*")||i.endsWith("/*"),`Route path "${i}" will be treated as if it were "${i.replace(/\*$/,"/*")}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${i.replace(/\*$/,"/*")}".`);let r=[],a="^"+i.replace(/\/*\*?$/,"").replace(/^\/*/,"/").replace(/[\\.*+^${}|()[\]]/g,"\\$&").replace(/\/:([\w-]+)(\?)?/g,(c,d,h,f,m)=>{if(r.push({paramName:d,isOptional:h!=null}),h){let g=m.charAt(f+c.length);return g&&g!=="/"?"/([^\\/]*)":"(?:/([^\\/]*))?"}return"/([^\\/]+)"}).replace(/\/([\w-]+)\?(\/|$)/g,"(/$1)?$2");return i.endsWith("*")?(r.push({paramName:"*"}),a+=i==="*"||i==="/*"?"(.*)$":"(?:\\/(.+)|\\/*)$"):t?a+="\\/*$":i!==""&&i!=="/"&&(a+="(?:(?=\\/|$))"),[new RegExp(a,e?void 0:"i"),r]}function SE(i){try{return i.split("/").map(e=>decodeURIComponent(e).replace(/\//g,"%2F")).join("/")}catch(e){return Ui(!1,`The URL path "${i}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${e}).`),i}}function Xr(i,e){if(e==="/")return i;if(!i.toLowerCase().startsWith(e.toLowerCase()))return null;let t=e.endsWith("/")?e.length-1:e.length,r=i.charAt(t);return r&&r!=="/"?null:i.slice(t)||"/"}function ME(i,e="/"){let{pathname:t,search:r="",hash:a=""}=typeof i=="string"?Oo(i):i,l;return t?(t=P_(t),t.startsWith("/")?l=Dv(t.substring(1),"/"):l=Dv(t,e)):l=e,{pathname:l,search:TE(r),hash:bE(a)}}function Dv(i,e){let t=td(e).split("/");return i.split("/").forEach(a=>{a===".."?t.length>1&&t.pop():a!=="."&&t.push(a)}),t.length>1?t.join("/"):"/"}function rf(i,e,t,r){return`Cannot include a '${i}' character in a manually specified \`to.${e}\` field [${JSON.stringify(r)}].  Please separate it out to the \`to.${t}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`}function EE(i){return i.filter((e,t)=>t===0||e.route.path&&e.route.path.length>0)}function fm(i){let e=EE(i);return e.map((t,r)=>r===e.length-1?t.pathname:t.pathnameBase)}function dd(i,e,t,r=!1){let a;typeof i=="string"?a=Oo(i):(a={...i},nn(!a.pathname||!a.pathname.includes("?"),rf("?","pathname","search",a)),nn(!a.pathname||!a.pathname.includes("#"),rf("#","pathname","hash",a)),nn(!a.search||!a.search.includes("#"),rf("#","search","hash",a)));let l=i===""||a.pathname==="",c=l?"/":a.pathname,d;if(c==null)d=t;else{let g=e.length-1;if(!r&&c.startsWith("..")){let v=c.split("/");for(;v[0]==="..";)v.shift(),g-=1;a.pathname=v.join("/")}d=g>=0?e[g]:"/"}let h=ME(a,d),f=c&&c!=="/"&&c.endsWith("/"),m=(l||c===".")&&t.endsWith("/");return!h.pathname.endsWith("/")&&(f||m)&&(h.pathname+="/"),h}var P_=i=>i.replace(/[\\/]{2,}/g,"/"),Qi=i=>P_(i.join("/")),td=i=>i.replace(/\/+$/,""),wE=i=>td(i).replace(/^\/*/,"/"),TE=i=>!i||i==="?"?"":i.startsWith("?")?i:"?"+i,bE=i=>!i||i==="#"?"":i.startsWith("#")?i:"#"+i,CE=class{constructor(i,e,t,r=!1){this.status=i,this.statusText=e||"",this.internal=r,t instanceof Error?(this.data=t.toString(),this.error=t):this.data=t}};function RE(i){return i!=null&&typeof i.status=="number"&&typeof i.statusText=="string"&&typeof i.internal=="boolean"&&"data"in i}function AE(i){let e=i.map(t=>t.route.path).filter(Boolean);return Qi(e)||"/"}var N_=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";function L_(i,e){let t=i;if(typeof t!="string"||!hm.test(t))return{absoluteURL:void 0,isExternal:!1,to:t};let r=t,a=!1;if(N_)try{let l=new URL(window.location.href),c=w_.test(t)?new URL(rE(t,l.protocol)):new URL(t),d=Xr(c.pathname,e);c.origin===l.origin&&d!=null?t=d+c.search+c.hash:a=!0}catch{Ui(!1,`<Link to="${t}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`)}return{absoluteURL:r,isExternal:a,to:t}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");var D_=["POST","PUT","PATCH","DELETE"];new Set(D_);var PE=["GET",...D_];new Set(PE);var NE=["about:","blob:","chrome:","chrome-untrusted:","content:","data:","devtools:","file:","filesystem:","javascript:"];function LE(i){try{return NE.includes(new URL(i).protocol)}catch{return!1}}var ko=B.createContext(null);ko.displayName="DataRouter";var hd=B.createContext(null);hd.displayName="DataRouterState";var I_=B.createContext(!1);function DE(){return B.useContext(I_)}var U_=B.createContext({isTransitioning:!1});U_.displayName="ViewTransition";var IE=B.createContext(new Map);IE.displayName="Fetchers";var UE=B.createContext(null);UE.displayName="Await";var Ei=B.createContext(null);Ei.displayName="Navigation";var Jl=B.createContext(null);Jl.displayName="Location";var Ji=B.createContext({outlet:null,matches:[],isDataRoute:!1});Ji.displayName="Route";var pm=B.createContext(null);pm.displayName="RouteError";var F_="REACT_ROUTER_ERROR",FE="REDIRECT",OE="ROUTE_ERROR_RESPONSE";function kE(i){if(i.startsWith(`${F_}:${FE}:{`))try{let e=JSON.parse(i.slice(28));if(typeof e=="object"&&e&&typeof e.status=="number"&&typeof e.statusText=="string"&&typeof e.location=="string"&&typeof e.reloadDocument=="boolean"&&typeof e.replace=="boolean")return e}catch{}}function zE(i){if(i.startsWith(`${F_}:${OE}:{`))try{let e=JSON.parse(i.slice(40));if(typeof e=="object"&&e&&typeof e.status=="number"&&typeof e.statusText=="string")return new CE(e.status,e.statusText,e.data)}catch{}}function BE(i,{relative:e}={}){nn(zo(),"useHref() may be used only in the context of a <Router> component.");let{basename:t,navigator:r}=B.useContext(Ei),{hash:a,pathname:l,search:c}=ec(i,{relative:e}),d=l;return t!=="/"&&(d=l==="/"?t:Qi([t,l])),r.createHref({pathname:d,search:c,hash:a})}function zo(){return B.useContext(Jl)!=null}function er(){return nn(zo(),"useLocation() may be used only in the context of a <Router> component."),B.useContext(Jl).location}var O_="You should call navigate() in a React.useEffect(), not when your component is first rendered.";function k_(i){B.useContext(Ei).static||B.useLayoutEffect(i)}function mm(){let{isDataRoute:i}=B.useContext(Ji);return i?t1():HE()}function HE(){nn(zo(),"useNavigate() may be used only in the context of a <Router> component.");let i=B.useContext(ko),{basename:e,navigator:t}=B.useContext(Ei),{matches:r}=B.useContext(Ji),{pathname:a}=er(),l=JSON.stringify(fm(r)),c=B.useRef(!1);return k_(()=>{c.current=!0}),B.useCallback((h,f={})=>{if(Ui(c.current,O_),!c.current)return;if(typeof h=="number"){t.go(h);return}let m=dd(h,JSON.parse(l),a,f.relative==="path");i==null&&e!=="/"&&(m.pathname=m.pathname==="/"?e:Qi([e,m.pathname])),(f.replace?t.replace:t.push)(m,f.state,f)},[e,t,l,a,i])}var VE=B.createContext(null);function GE(i){let e=B.useContext(Ji).outlet;return B.useMemo(()=>e&&B.createElement(VE.Provider,{value:i},e),[e,i])}function ec(i,{relative:e}={}){let{matches:t}=B.useContext(Ji),{pathname:r}=er(),a=JSON.stringify(fm(t));return B.useMemo(()=>dd(i,JSON.parse(a),r,e==="path"),[i,a,r,e])}function WE(i,e){return z_(i,e)}function z_(i,e,t){var x;nn(zo(),"useRoutes() may be used only in the context of a <Router> component.");let{navigator:r}=B.useContext(Ei),{matches:a}=B.useContext(Ji),l=a[a.length-1],c=l?l.params:{},d=l?l.pathname:"/",h=l?l.pathnameBase:"/",f=l&&l.route;{let y=f&&f.path||"";H_(d,!f||y.endsWith("*")||y.endsWith("*?"),`You rendered descendant <Routes> (or called \`useRoutes()\`) at "${d}" (under <Route path="${y}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${y}"> to <Route path="${y==="/"?"*":`${y}/*`}">.`)}let m=er(),g;if(e){let y=typeof e=="string"?Oo(e):e;nn(h==="/"||((x=y.pathname)==null?void 0:x.startsWith(h)),`When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${h}" but pathname "${y.pathname}" was given in the \`location\` prop.`),g=y}else g=m;let v=g.pathname||"/",S=v;if(h!=="/"){let y=h.replace(/^\//,"").split("/");S="/"+v.replace(/^\//,"").split("/").slice(y.length).join("/")}let E=t&&t.state.matches.length?t.state.matches.map(y=>Object.assign(y,{route:t.manifest[y.route.id]||y.route})):T_(i,{pathname:S});Ui(f||E!=null,`No routes matched location "${g.pathname}${g.search}${g.hash}" `),Ui(E==null||E[E.length-1].route.element!==void 0||E[E.length-1].route.Component!==void 0||E[E.length-1].route.lazy!==void 0,`Matched leaf route at location "${g.pathname}${g.search}${g.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`);let w=YE(E&&E.map(y=>Object.assign({},y,{params:Object.assign({},c,y.params),pathname:Qi([h,r.encodeLocation?r.encodeLocation(y.pathname.replace(/%/g,"%25").replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:y.pathname]),pathnameBase:y.pathnameBase==="/"?h:Qi([h,r.encodeLocation?r.encodeLocation(y.pathnameBase.replace(/%/g,"%25").replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:y.pathnameBase])})),a,t);return e&&w?B.createElement(Jl.Provider,{value:{location:{pathname:"/",search:"",hash:"",state:null,key:"default",mask:void 0,...g},navigationType:"POP"}},w):w}function jE(){let i=e1(),e=RE(i)?`${i.status} ${i.statusText}`:i instanceof Error?i.message:JSON.stringify(i),t=i instanceof Error?i.stack:null,r="rgba(200,200,200, 0.5)",a={padding:"0.5rem",backgroundColor:r},l={padding:"2px 4px",backgroundColor:r},c=null;return console.error("Error handled by React Router default ErrorBoundary:",i),c=B.createElement(B.Fragment,null,B.createElement("p",null,"💿 Hey developer 👋"),B.createElement("p",null,"You can provide a way better UX than this when your app throws errors by providing your own ",B.createElement("code",{style:l},"ErrorBoundary")," or"," ",B.createElement("code",{style:l},"errorElement")," prop on your route.")),B.createElement(B.Fragment,null,B.createElement("h2",null,"Unexpected Application Error!"),B.createElement("h3",{style:{fontStyle:"italic"}},e),t?B.createElement("pre",{style:a},t):null,c)}var XE=B.createElement(jE,null),B_=class extends B.Component{constructor(i){super(i),this.state={location:i.location,revalidation:i.revalidation,error:i.error}}static getDerivedStateFromError(i){return{error:i}}static getDerivedStateFromProps(i,e){return e.location!==i.location||e.revalidation!=="idle"&&i.revalidation==="idle"?{error:i.error,location:i.location,revalidation:i.revalidation}:{error:i.error!==void 0?i.error:e.error,location:e.location,revalidation:i.revalidation||e.revalidation}}componentDidCatch(i,e){this.props.onError?this.props.onError(i,e):console.error("React Router caught the following error during render",i)}render(){let i=this.state.error;if(this.context&&typeof i=="object"&&i&&"digest"in i&&typeof i.digest=="string"){const t=zE(i.digest);t&&(i=t)}let e=i!==void 0?B.createElement(Ji.Provider,{value:this.props.routeContext},B.createElement(pm.Provider,{value:i,children:this.props.component})):this.props.children;return this.context?B.createElement($E,{error:i},e):e}};B_.contextType=I_;var sf=new WeakMap;function $E({children:i,error:e}){let{basename:t}=B.useContext(Ei);if(typeof e=="object"&&e&&"digest"in e&&typeof e.digest=="string"){let r=kE(e.digest);if(r){let a=sf.get(e);if(a)throw a;let l=L_(r.location,t),c=l.absoluteURL||l.to;if(LE(c))throw new Error("Invalid redirect location");if(N_&&!sf.get(e))if(l.isExternal||r.reloadDocument)window.location.href=c;else{const d=Promise.resolve().then(()=>window.__reactRouterDataRouter.navigate(l.to,{replace:r.replace}));throw sf.set(e,d),d}return B.createElement("meta",{httpEquiv:"refresh",content:`0;url=${c}`})}}return i}function qE({routeContext:i,match:e,children:t}){let r=B.useContext(ko);return r&&r.static&&r.staticContext&&(e.route.errorElement||e.route.ErrorBoundary)&&(r.staticContext._deepestRenderedBoundaryId=e.route.id),B.createElement(Ji.Provider,{value:i},t)}function YE(i,e=[],t){let r=t==null?void 0:t.state;if(i==null){if(!r)return null;if(r.errors)i=r.matches;else if(e.length===0&&!r.initialized&&r.matches.length>0)i=r.matches;else return null}let a=i,l=r==null?void 0:r.errors;if(l!=null){let m=a.findIndex(g=>g.route.id&&(l==null?void 0:l[g.route.id])!==void 0);nn(m>=0,`Could not find a matching route for errors on route IDs: ${Object.keys(l).join(",")}`),a=a.slice(0,Math.min(a.length,m+1))}let c=!1,d=-1;if(t&&r){c=r.renderFallback;for(let m=0;m<a.length;m++){let g=a[m];if((g.route.HydrateFallback||g.route.hydrateFallbackElement)&&(d=m),g.route.id){let{loaderData:v,errors:S}=r,E=g.route.loader&&!v.hasOwnProperty(g.route.id)&&(!S||S[g.route.id]===void 0);if(g.route.lazy||E){t.isStatic&&(c=!0),d>=0?a=a.slice(0,d+1):a=[a[0]];break}}}}let h=t==null?void 0:t.onError,f=r&&h?(m,g)=>{var v,S;h(m,{location:r.location,params:((S=(v=r.matches)==null?void 0:v[0])==null?void 0:S.params)??{},pattern:AE(r.matches),errorInfo:g})}:void 0;return a.reduceRight((m,g,v)=>{let S,E=!1,w=null,x=null;r&&(S=l&&g.route.id?l[g.route.id]:void 0,w=g.route.errorElement||XE,c&&(d<0&&v===0?(H_("route-fallback",!1,"No `HydrateFallback` element provided to render during initial hydration"),E=!0,x=null):d===v&&(E=!0,x=g.route.hydrateFallbackElement||null)));let y=e.concat(a.slice(0,v+1)),N=()=>{let P;return S?P=w:E?P=x:g.route.Component?P=B.createElement(g.route.Component,null):g.route.element?P=g.route.element:P=m,B.createElement(qE,{match:g,routeContext:{outlet:m,matches:y,isDataRoute:r!=null},children:P})};return r&&(g.route.ErrorBoundary||g.route.errorElement||v===0)?B.createElement(B_,{location:r.location,revalidation:r.revalidation,component:w,error:S,children:N(),routeContext:{outlet:null,matches:y,isDataRoute:!0},onError:f}):N()},null)}function gm(i){return`${i} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function KE(i){let e=B.useContext(ko);return nn(e,gm(i)),e}function QE(i){let e=B.useContext(hd);return nn(e,gm(i)),e}function ZE(i){let e=B.useContext(Ji);return nn(e,gm(i)),e}function vm(i){let e=ZE(i),t=e.matches[e.matches.length-1];return nn(t.route.id,`${i} can only be used on routes that contain a unique "id"`),t.route.id}function JE(){return vm("useRouteId")}function e1(){var r;let i=B.useContext(pm),e=QE("useRouteError"),t=vm("useRouteError");return i!==void 0?i:(r=e.errors)==null?void 0:r[t]}function t1(){let{router:i}=KE("useNavigate"),e=vm("useNavigate"),t=B.useRef(!1);return k_(()=>{t.current=!0}),B.useCallback(async(a,l={})=>{Ui(t.current,O_),t.current&&(typeof a=="number"?await i.navigate(a):await i.navigate(a,{fromRouteId:e,...l}))},[i,e])}var Iv={};function H_(i,e,t){!e&&!Iv[i]&&(Iv[i]=!0,Ui(!1,t))}B.memo(n1);function n1({routes:i,manifest:e,future:t,state:r,isStatic:a,onError:l}){return z_(i,void 0,{manifest:e,state:r,isStatic:a,onError:l})}function af({to:i,replace:e,state:t,relative:r}){nn(zo(),"<Navigate> may be used only in the context of a <Router> component.");let{static:a}=B.useContext(Ei);Ui(!a,"<Navigate> must not be used on the initial render in a <StaticRouter>. This is a no-op, but you should modify your code so the <Navigate> is only ever rendered in response to some user interaction or state change.");let{matches:l}=B.useContext(Ji),{pathname:c}=er(),d=mm(),h=dd(i,fm(l),c,r==="path"),f=JSON.stringify(h);return B.useEffect(()=>{d(JSON.parse(f),{replace:e,state:t,relative:r})},[d,f,r,e,t]),null}function i1(i){return GE(i.context)}function $i(i){nn(!1,"A <Route> is only ever to be used as the child of <Routes> element, never rendered directly. Please wrap your <Route> in a <Routes>.")}function r1({basename:i="/",children:e=null,location:t,navigationType:r="POP",navigator:a,static:l=!1,useTransitions:c}){nn(!zo(),"You cannot render a <Router> inside another <Router>. You should never have more than one in your app.");let d=i.replace(/^\/*/,"/"),h=B.useMemo(()=>({basename:d,navigator:a,static:l,useTransitions:c,future:{}}),[d,a,l,c]);typeof t=="string"&&(t=Oo(t));let{pathname:f="/",search:m="",hash:g="",state:v=null,key:S="default",mask:E}=t,w=B.useMemo(()=>{let x=Xr(f,d);return x==null?null:{location:{pathname:x,search:m,hash:g,state:v,key:S,mask:E},navigationType:r}},[d,f,m,g,v,S,r,E]);return Ui(w!=null,`<Router basename="${d}"> is not able to match the URL "${f}${m}${g}" because it does not start with the basename, so the <Router> won't render anything.`),w==null?null:B.createElement(Ei.Provider,{value:h},B.createElement(Jl.Provider,{children:e,value:w}))}function s1({children:i,location:e}){return WE(up(i),e)}function up(i,e=[]){let t=[];return B.Children.forEach(i,(r,a)=>{if(!B.isValidElement(r))return;let l=[...e,a];if(r.type===B.Fragment){t.push.apply(t,up(r.props.children,l));return}nn(r.type===$i,`[${typeof r.type=="string"?r.type:r.type.name}] is not a <Route> component. All component children of <Routes> must be a <Route> or <React.Fragment>`),nn(!r.props.index||!r.props.children,"An index route cannot have child routes.");let c={id:r.props.id||l.join("-"),caseSensitive:r.props.caseSensitive,element:r.props.element,Component:r.props.Component,index:r.props.index,path:r.props.path,middleware:r.props.middleware,loader:r.props.loader,action:r.props.action,hydrateFallbackElement:r.props.hydrateFallbackElement,HydrateFallback:r.props.HydrateFallback,errorElement:r.props.errorElement,ErrorBoundary:r.props.ErrorBoundary,hasErrorBoundary:r.props.hasErrorBoundary===!0||r.props.ErrorBoundary!=null||r.props.errorElement!=null,shouldRevalidate:r.props.shouldRevalidate,handle:r.props.handle,lazy:r.props.lazy};r.props.children&&(c.children=up(r.props.children,l)),t.push(c)}),t}var Vu="get",Gu="application/x-www-form-urlencoded";function fd(i){return typeof HTMLElement<"u"&&i instanceof HTMLElement}function a1(i){return fd(i)&&i.tagName.toLowerCase()==="button"}function o1(i){return fd(i)&&i.tagName.toLowerCase()==="form"}function l1(i){return fd(i)&&i.tagName.toLowerCase()==="input"}function c1(i){return!!(i.metaKey||i.altKey||i.ctrlKey||i.shiftKey)}function u1(i,e){return i.button===0&&(!e||e==="_self")&&!c1(i)}function dp(i=""){return new URLSearchParams(typeof i=="string"||Array.isArray(i)||i instanceof URLSearchParams?i:Object.keys(i).reduce((e,t)=>{let r=i[t];return e.concat(Array.isArray(r)?r.map(a=>[t,a]):[[t,r]])},[]))}function d1(i,e){let t=dp(i);return e&&e.forEach((r,a)=>{t.has(a)||e.getAll(a).forEach(l=>{t.append(a,l)})}),t}var du=null;function h1(){if(du===null)try{new FormData(document.createElement("form"),0),du=!1}catch{du=!0}return du}var f1=new Set(["application/x-www-form-urlencoded","multipart/form-data","text/plain"]);function of(i){return i!=null&&!f1.has(i)?(Ui(!1,`"${i}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${Gu}"`),null):i}function p1(i,e){let t,r,a,l,c;if(o1(i)){let d=i.getAttribute("action");r=d?Xr(d,e):null,t=i.getAttribute("method")||Vu,a=of(i.getAttribute("enctype"))||Gu,l=new FormData(i)}else if(a1(i)||l1(i)&&(i.type==="submit"||i.type==="image")){let d=i.form;if(d==null)throw new Error('Cannot submit a <button> or <input type="submit"> without a <form>');let h=i.getAttribute("formaction")||d.getAttribute("action");if(r=h?Xr(h,e):null,t=i.getAttribute("formmethod")||d.getAttribute("method")||Vu,a=of(i.getAttribute("formenctype"))||of(d.getAttribute("enctype"))||Gu,l=new FormData(d,i),!h1()){let{name:f,type:m,value:g}=i;if(m==="image"){let v=f?`${f}.`:"";l.append(`${v}x`,"0"),l.append(`${v}y`,"0")}else f&&l.append(f,g)}}else{if(fd(i))throw new Error('Cannot submit element that is not <form>, <button>, or <input type="submit|image">');t=Vu,r=null,a=Gu,c=i}return l&&a==="text/plain"&&(c=l,l=void 0),{action:r,method:t.toLowerCase(),encType:a,formData:l,body:c}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");function xm(i,e){if(i===!1||i===null||typeof i>"u")throw new Error(e)}function V_(i,e,t,r){let a=typeof i=="string"?new URL(i,typeof window>"u"?"server://singlefetch/":window.location.origin):i;return t?a.pathname.endsWith("/")?a.pathname=`${a.pathname}_.${r}`:a.pathname=`${a.pathname}.${r}`:a.pathname==="/"?a.pathname=`_root.${r}`:e&&Xr(a.pathname,e)==="/"?a.pathname=`${td(e)}/_root.${r}`:a.pathname=`${td(a.pathname)}.${r}`,a}async function m1(i,e){if(i.id in e)return e[i.id];try{let t=await import(i.module);return e[i.id]=t,t}catch(t){return console.error(`Error loading route module \`${i.module}\`, reloading page...`),console.error(t),window.__reactRouterContext&&window.__reactRouterContext.isSpaMode,window.location.reload(),new Promise(()=>{})}}function g1(i){return i==null?!1:i.href==null?i.rel==="preload"&&typeof i.imageSrcSet=="string"&&typeof i.imageSizes=="string":typeof i.rel=="string"&&typeof i.href=="string"}async function v1(i,e,t){let r=await Promise.all(i.map(async a=>{let l=e.routes[a.route.id];if(l){let c=await m1(l,t);return c.links?c.links():[]}return[]}));return S1(r.flat(1).filter(g1).filter(a=>a.rel==="stylesheet"||a.rel==="preload").map(a=>a.rel==="stylesheet"?{...a,rel:"prefetch",as:"style"}:{...a,rel:"prefetch"}))}function Uv(i,e,t,r,a,l){let c=(h,f)=>t[f]?h.route.id!==t[f].route.id:!0,d=(h,f)=>{var m;return t[f].pathname!==h.pathname||((m=t[f].route.path)==null?void 0:m.endsWith("*"))&&t[f].params["*"]!==h.params["*"]};return l==="assets"?e.filter((h,f)=>c(h,f)||d(h,f)):l==="data"?e.filter((h,f)=>{var g;let m=r.routes[h.route.id];if(!m||!m.hasLoader)return!1;if(c(h,f)||d(h,f))return!0;if(h.route.shouldRevalidate){let v=h.route.shouldRevalidate({currentUrl:new URL(a.pathname+a.search+a.hash,window.origin),currentParams:((g=t[0])==null?void 0:g.params)||{},nextUrl:new URL(i,window.origin),nextParams:h.params,defaultShouldRevalidate:!0});if(typeof v=="boolean")return v}return!0}):[]}function x1(i,e,{includeHydrateFallback:t}={}){return _1(i.map(r=>{let a=e.routes[r.route.id];if(!a)return[];let l=[a.module];return a.clientActionModule&&(l=l.concat(a.clientActionModule)),a.clientLoaderModule&&(l=l.concat(a.clientLoaderModule)),t&&a.hydrateFallbackModule&&(l=l.concat(a.hydrateFallbackModule)),a.imports&&(l=l.concat(a.imports)),l}).flat(1))}function _1(i){return[...new Set(i)]}function y1(i){let e={},t=Object.keys(i).sort();for(let r of t)e[r]=i[r];return e}function S1(i,e){let t=new Set;return new Set(e),i.reduce((r,a)=>{let l=JSON.stringify(y1(a));return t.has(l)||(t.add(l),r.push({key:l,link:a})),r},[])}function _m(){let i=B.useContext(ko);return xm(i,"You must render this element inside a <DataRouterContext.Provider> element"),i}function M1(){let i=B.useContext(hd);return xm(i,"You must render this element inside a <DataRouterStateContext.Provider> element"),i}var ym=B.createContext(void 0);ym.displayName="FrameworkContext";function pd(){let i=B.useContext(ym);return xm(i,"You must render this element inside a <HydratedRouter> element"),i}function E1(i,e){let t=B.useContext(ym),[r,a]=B.useState(!1),[l,c]=B.useState(!1),{onFocus:d,onBlur:h,onMouseEnter:f,onMouseLeave:m,onTouchStart:g}=e,v=B.useRef(null);B.useEffect(()=>{if(i==="render"&&c(!0),i==="viewport"){let w=y=>{y.forEach(N=>{c(N.isIntersecting)})},x=new IntersectionObserver(w,{threshold:.5});return v.current&&x.observe(v.current),()=>{x.disconnect()}}},[i]),B.useEffect(()=>{if(r){let w=setTimeout(()=>{c(!0)},100);return()=>{clearTimeout(w)}}},[r]);let S=()=>{a(!0)},E=()=>{a(!1),c(!1)};return t?i!=="intent"?[l,v,{}]:[l,v,{onFocus:Tl(d,S),onBlur:Tl(h,E),onMouseEnter:Tl(f,S),onMouseLeave:Tl(m,E),onTouchStart:Tl(g,S)}]:[!1,v,{}]}function Tl(i,e){return t=>{i&&i(t),t.defaultPrevented||e(t)}}function w1({page:i,...e}){let t=DE(),{nonce:r}=pd(),{router:a}=_m(),l=B.useMemo(()=>T_(a.routes,i,a.basename),[a.routes,i,a.basename]);return l?(e.nonce==null&&r&&(e={...e,nonce:r}),t?B.createElement(b1,{page:i,matches:l,...e}):B.createElement(C1,{page:i,matches:l,...e})):null}function T1(i){let{manifest:e,routeModules:t}=pd(),[r,a]=B.useState([]);return B.useEffect(()=>{let l=!1;return v1(i,e,t).then(c=>{l||a(c)}),()=>{l=!0}},[i,e,t]),r}function b1({page:i,matches:e,...t}){let r=er(),{future:a}=pd(),{basename:l}=_m(),c=B.useMemo(()=>{if(i===r.pathname+r.search+r.hash)return[];let d=V_(i,l,a.v8_trailingSlashAwareDataRequests,"rsc"),h=!1,f=[];for(let m of e)typeof m.route.shouldRevalidate=="function"?h=!0:f.push(m.route.id);return h&&f.length>0&&d.searchParams.set("_routes",f.join(",")),[d.pathname+d.search]},[l,a.v8_trailingSlashAwareDataRequests,i,r,e]);return B.createElement(B.Fragment,null,c.map(d=>B.createElement("link",{key:d,rel:"prefetch",as:"fetch",href:d,...t})))}function C1({page:i,matches:e,...t}){let r=er(),{future:a,manifest:l,routeModules:c}=pd(),{basename:d}=_m(),{loaderData:h,matches:f}=M1(),m=B.useMemo(()=>Uv(i,e,f,l,r,"data"),[i,e,f,l,r]),g=B.useMemo(()=>Uv(i,e,f,l,r,"assets"),[i,e,f,l,r]),v=B.useMemo(()=>{if(i===r.pathname+r.search+r.hash)return[];let w=new Set,x=!1;if(e.forEach(N=>{var C;let P=l.routes[N.route.id];!P||!P.hasLoader||(!m.some(D=>D.route.id===N.route.id)&&N.route.id in h&&((C=c[N.route.id])!=null&&C.shouldRevalidate)||P.hasClientLoader?x=!0:w.add(N.route.id))}),w.size===0)return[];let y=V_(i,d,a.v8_trailingSlashAwareDataRequests,"data");return x&&w.size>0&&y.searchParams.set("_routes",e.filter(N=>w.has(N.route.id)).map(N=>N.route.id).join(",")),[y.pathname+y.search]},[d,a.v8_trailingSlashAwareDataRequests,h,r,l,m,e,i,c]),S=B.useMemo(()=>x1(g,l),[g,l]),E=T1(g);return B.createElement(B.Fragment,null,v.map(w=>B.createElement("link",{key:w,rel:"prefetch",as:"fetch",href:w,...t})),S.map(w=>B.createElement("link",{key:w,rel:"modulepreload",href:w,...t})),E.map(({key:w,link:x})=>B.createElement("link",{key:w,nonce:t.nonce,...x,crossOrigin:x.crossOrigin??t.crossOrigin})))}function R1(...i){return e=>{i.forEach(t=>{typeof t=="function"?t(e):t!=null&&(t.current=e)})}}var A1=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";try{A1&&(window.__reactRouterVersion="7.18.0")}catch{}function P1({basename:i,children:e,useTransitions:t,window:r}){let a=B.useRef();a.current==null&&(a.current=sE({window:r,v5Compat:!0}));let l=a.current,[c,d]=B.useState({action:l.action,location:l.location}),h=B.useCallback(f=>{t===!1?d(f):B.startTransition(()=>d(f))},[t]);return B.useLayoutEffect(()=>l.listen(h),[l,h]),B.createElement(r1,{basename:i,children:e,location:c.location,navigationType:c.action,navigator:l,useTransitions:t})}var G_=B.forwardRef(function({onClick:e,discover:t="render",prefetch:r="none",relative:a,reloadDocument:l,replace:c,mask:d,state:h,target:f,to:m,preventScrollReset:g,viewTransition:v,defaultShouldRevalidate:S,...E},w){let{basename:x,navigator:y,useTransitions:N}=B.useContext(Ei),P=typeof m=="string"&&hm.test(m),C=L_(m,x);m=C.to;let D=BE(m,{relative:a}),L=er(),F=null;if(d){let O=dd(d,[],L.mask?L.mask.pathname:"/",!0);x!=="/"&&(O.pathname=O.pathname==="/"?x:Qi([x,O.pathname])),F=y.createHref(O)}let[T,I,G]=E1(r,E),H=D1(m,{replace:c,mask:d,state:h,target:f,preventScrollReset:g,relative:a,viewTransition:v,defaultShouldRevalidate:S,useTransitions:N});function K(O){e&&e(O),O.defaultPrevented||H(O)}let re=!(C.isExternal||l),fe=B.createElement("a",{...E,...G,href:(re?F:void 0)||C.absoluteURL||D,onClick:re?K:e,ref:R1(w,I),target:f,"data-discover":!P&&t==="render"?"true":void 0});return T&&!P?B.createElement(B.Fragment,null,fe,B.createElement(w1,{page:D})):fe});G_.displayName="Link";var fo=B.forwardRef(function({"aria-current":e="page",caseSensitive:t=!1,className:r="",end:a=!1,style:l,to:c,viewTransition:d,children:h,...f},m){let g=ec(c,{relative:f.relative}),v=er(),S=B.useContext(hd),{navigator:E,basename:w}=B.useContext(Ei),x=S!=null&&z1(g)&&d===!0,y=E.encodeLocation?E.encodeLocation(g).pathname:g.pathname,N=v.pathname,P=S&&S.navigation&&S.navigation.location?S.navigation.location.pathname:null;t||(N=N.toLowerCase(),P=P?P.toLowerCase():null,y=y.toLowerCase()),P&&w&&(P=Xr(P,w)||P);const C=y!=="/"&&y.endsWith("/")?y.length-1:y.length;let D=N===y||!a&&N.startsWith(y)&&N.charAt(C)==="/",L=P!=null&&(P===y||!a&&P.startsWith(y)&&P.charAt(y.length)==="/"),F={isActive:D,isPending:L,isTransitioning:x},T=D?e:void 0,I;typeof r=="function"?I=r(F):I=[r,D?"active":null,L?"pending":null,x?"transitioning":null].filter(Boolean).join(" ");let G=typeof l=="function"?l(F):l;return B.createElement(G_,{...f,"aria-current":T,className:I,ref:m,style:G,to:c,viewTransition:d},typeof h=="function"?h(F):h)});fo.displayName="NavLink";var N1=B.forwardRef(({discover:i="render",fetcherKey:e,navigate:t,reloadDocument:r,replace:a,state:l,method:c=Vu,action:d,onSubmit:h,relative:f,preventScrollReset:m,viewTransition:g,defaultShouldRevalidate:v,...S},E)=>{let{useTransitions:w}=B.useContext(Ei),x=O1(),y=k1(d,{relative:f}),N=c.toLowerCase()==="get"?"get":"post",P=typeof d=="string"&&hm.test(d),C=D=>{if(h&&h(D),D.defaultPrevented)return;D.preventDefault();let L=D.nativeEvent.submitter,F=(L==null?void 0:L.getAttribute("formmethod"))||c,T=()=>x(L||D.currentTarget,{fetcherKey:e,method:F,navigate:t,replace:a,state:l,relative:f,preventScrollReset:m,viewTransition:g,defaultShouldRevalidate:v});w&&t!==!1?B.startTransition(()=>T()):T()};return B.createElement("form",{ref:E,method:N,action:y,onSubmit:r?h:C,...S,"data-discover":!P&&i==="render"?"true":void 0})});N1.displayName="Form";function L1(i){return`${i} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function W_(i){let e=B.useContext(ko);return nn(e,L1(i)),e}function D1(i,{target:e,replace:t,mask:r,state:a,preventScrollReset:l,relative:c,viewTransition:d,defaultShouldRevalidate:h,useTransitions:f}={}){let m=mm(),g=er(),v=ec(i,{relative:c});return B.useCallback(S=>{if(u1(S,e)){S.preventDefault();let E=t!==void 0?t:Vl(g)===Vl(v),w=()=>m(i,{replace:E,mask:r,state:a,preventScrollReset:l,relative:c,viewTransition:d,defaultShouldRevalidate:h});f?B.startTransition(()=>w()):w()}},[g,m,v,t,r,a,e,i,l,c,d,h,f])}function I1(i){Ui(typeof URLSearchParams<"u","You cannot use the `useSearchParams` hook in a browser that does not support the URLSearchParams API. If you need to support Internet Explorer 11, we recommend you load a polyfill such as https://github.com/ungap/url-search-params.");let e=B.useRef(dp(i)),t=B.useRef(!1),r=er(),a=B.useMemo(()=>d1(r.search,t.current?null:e.current),[r.search]),l=mm(),c=B.useCallback((d,h)=>{const f=dp(typeof d=="function"?d(new URLSearchParams(a)):d);t.current=!0,l("?"+f,h)},[l,a]);return[a,c]}var U1=0,F1=()=>`__${String(++U1)}__`;function O1(){let{router:i}=W_("useSubmit"),{basename:e}=B.useContext(Ei),t=JE(),r=i.fetch,a=i.navigate;return B.useCallback(async(l,c={})=>{let{action:d,method:h,encType:f,formData:m,body:g}=p1(l,e);if(c.navigate===!1){let v=c.fetcherKey||F1();await r(v,t,c.action||d,{defaultShouldRevalidate:c.defaultShouldRevalidate,preventScrollReset:c.preventScrollReset,formData:m,body:g,formMethod:c.method||h,formEncType:c.encType||f,flushSync:c.flushSync})}else await a(c.action||d,{defaultShouldRevalidate:c.defaultShouldRevalidate,preventScrollReset:c.preventScrollReset,formData:m,body:g,formMethod:c.method||h,formEncType:c.encType||f,replace:c.replace,state:c.state,fromRouteId:t,flushSync:c.flushSync,viewTransition:c.viewTransition})},[r,a,e,t])}function k1(i,{relative:e}={}){let{basename:t}=B.useContext(Ei),r=B.useContext(Ji);nn(r,"useFormAction must be used inside a RouteContext");let[a]=r.matches.slice(-1),l={...ec(i||".",{relative:e})},c=er();if(i==null){l.search=c.search;let d=new URLSearchParams(l.search),h=d.getAll("index");if(h.some(m=>m==="")){d.delete("index"),h.filter(g=>g).forEach(g=>d.append("index",g));let m=d.toString();l.search=m?`?${m}`:""}}return(!i||i===".")&&a.route.index&&(l.search=l.search?l.search.replace(/^\?/,"?index&"):"?index"),t!=="/"&&(l.pathname=l.pathname==="/"?t:Qi([t,l.pathname])),Vl(l)}function z1(i,{relative:e}={}){let t=B.useContext(U_);nn(t!=null,"`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?");let{basename:r}=W_("useViewTransitionState"),a=ec(i,{relative:e});if(!t.isTransitioning)return!1;let l=Xr(t.currentLocation.pathname,r)||t.currentLocation.pathname,c=Xr(t.nextLocation.pathname,r)||t.nextLocation.pathname;return ed(a.pathname,c)!=null||ed(a.pathname,l)!=null}/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B1=i=>i.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),j_=(...i)=>i.filter((e,t,r)=>!!e&&e.trim()!==""&&r.indexOf(e)===t).join(" ").trim();/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var H1={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V1=B.forwardRef(({color:i="currentColor",size:e=24,strokeWidth:t=2,absoluteStrokeWidth:r,className:a="",children:l,iconNode:c,...d},h)=>B.createElement("svg",{ref:h,...H1,width:e,height:e,stroke:i,strokeWidth:r?Number(t)*24/Number(e):t,className:j_("lucide",a),...d},[...c.map(([f,m])=>B.createElement(f,m)),...Array.isArray(l)?l:[l]]));/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ot=(i,e)=>{const t=B.forwardRef(({className:r,...a},l)=>B.createElement(V1,{ref:l,iconNode:e,className:j_(`lucide-${B1(i)}`,r),...a}));return t.displayName=`${i}`,t};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G1=Ot("ArchiveRestore",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h2",key:"tvwodi"}],["path",{d:"M20 8v11a2 2 0 0 1-2 2h-2",key:"1gkqxj"}],["path",{d:"m9 15 3-3 3 3",key:"1pd0qc"}],["path",{d:"M12 12v9",key:"192myk"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W1=Ot("Archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j1=Ot("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X1=Ot("Box",[["path",{d:"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",key:"hh9hay"}],["path",{d:"m3.3 7 8.7 5 8.7-5",key:"g66t2b"}],["path",{d:"M12 22V12",key:"d0xqtd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $1=Ot("Boxes",[["path",{d:"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",key:"lc1i9w"}],["path",{d:"m7 16.5-4.74-2.85",key:"1o9zyk"}],["path",{d:"m7 16.5 5-3",key:"va8pkn"}],["path",{d:"M7 16.5v5.17",key:"jnp8gn"}],["path",{d:"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",key:"8zsnat"}],["path",{d:"m17 16.5-5-3",key:"8arw3v"}],["path",{d:"m17 16.5 4.74-2.85",key:"8rfmw"}],["path",{d:"M17 16.5v5.17",key:"k6z78m"}],["path",{d:"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",key:"1xygjf"}],["path",{d:"M12 8 7.26 5.15",key:"1vbdud"}],["path",{d:"m12 8 4.74-2.85",key:"3rx089"}],["path",{d:"M12 13.5V8",key:"1io7kd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sm=Ot("Camera",[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",key:"1tc9qg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q1=Ot("ChartLine",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y1=Ot("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X_=Ot("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K1=Ot("Crop",[["path",{d:"M6 2v14a2 2 0 0 0 2 2h14",key:"ron5a4"}],["path",{d:"M18 22V8a2 2 0 0 0-2-2H2",key:"7s9ehn"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q1=Ot("Crown",[["path",{d:"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",key:"1vdc57"}],["path",{d:"M5 21h14",key:"11awu3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z1=Ot("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J1=Ot("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fv=Ot("Hammer",[["path",{d:"m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9",key:"eefl8a"}],["path",{d:"m18 15 4-4",key:"16gjal"}],["path",{d:"m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5",key:"b7pghm"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ew=Ot("Image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tw=Ot("Images",[["path",{d:"M18 22H4a2 2 0 0 1-2-2V6",key:"pblm9e"}],["path",{d:"m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18",key:"nf6bnh"}],["circle",{cx:"12",cy:"8",r:"2",key:"1822b1"}],["rect",{width:"16",height:"16",x:"6",y:"2",rx:"2",key:"12espp"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const di=Ot("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nw=Ot("Maximize2",[["polyline",{points:"15 3 21 3 21 9",key:"mznyad"}],["polyline",{points:"9 21 3 21 3 15",key:"1avn1i"}],["line",{x1:"21",x2:"14",y1:"3",y2:"10",key:"ota7mn"}],["line",{x1:"3",x2:"10",y1:"21",y2:"14",key:"1atl0r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mm=Ot("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ov=Ot("Plug",[["path",{d:"M12 22v-5",key:"1ega77"}],["path",{d:"M9 8V2",key:"14iosj"}],["path",{d:"M15 8V2",key:"18g5xt"}],["path",{d:"M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z",key:"osxo6l"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iw=Ot("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rw=Ot("RotateCw",[["path",{d:"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",key:"1p45f6"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sw=Ot("Scissors",[["circle",{cx:"6",cy:"6",r:"3",key:"1lh9wr"}],["path",{d:"M8.12 8.12 12 12",key:"1alkpv"}],["path",{d:"M20 4 8.12 15.88",key:"xgtan2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["path",{d:"M14.8 14.8 20 20",key:"ptml3r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $_=Ot("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]);/**
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
 */const aw=Ot("Undo2",[["path",{d:"M9 14 4 9l5-5",key:"102s5s"}],["path",{d:"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11",key:"f3b9sd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q_=Ot("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kv=Ot("WandSparkles",[["path",{d:"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72",key:"ul74o6"}],["path",{d:"m14 7 3 3",key:"1r5n42"}],["path",{d:"M5 6v4",key:"ilb8ba"}],["path",{d:"M19 14v4",key:"blhpug"}],["path",{d:"M10 2v2",key:"7u0qdc"}],["path",{d:"M7 8H3",key:"zfb6yr"}],["path",{d:"M21 16h-4",key:"1cnmox"}],["path",{d:"M11 3H9",key:"1obp7u"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ow=Ot("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);async function hn(i,e){var r;const t=await fetch(i,e);if(!t.ok){let a="";try{a=((r=await t.json())==null?void 0:r.detail)??""}catch{}throw new Error(a||`HTTP ${t.status} (${i})`)}return t.json()}const gn=(i,e)=>hn(i,{method:"POST",headers:{"Content-Type":"application/json"},body:e!==void 0?JSON.stringify(e):void 0}),Gl=i=>hn(i,{method:"DELETE"}),lw={K:"♚",Q:"♛",R:"♜",B:"♝",N:"♞",P:"♟"};function zv({label:i,className:e=""}){if(i==="empty")return M.jsx("span",{className:`text-zinc-500 ${e}`,children:"·"});if(i==="occluded")return M.jsx("span",{className:`text-amber-300 ${e}`,children:"▦"});const t=lw[i==null?void 0:i[1]]??i,r=(i==null?void 0:i[0])==="w";return M.jsx("span",{className:e,style:{color:r?"#fafafa":"#0a0a0a",textShadow:r?"0 0 1px #000, 0 1px 2px #000":"0 0 1px #fff, 0 1px 2px #fff"},children:t})}function vn({title:i,right:e,children:t,className:r=""}){return M.jsxs("div",{className:`rounded-xl border border-zinc-800 bg-zinc-900 p-4 ${r}`,children:[(i||e)&&M.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[i&&M.jsx("h2",{className:"text-xs font-medium uppercase tracking-wide text-zinc-400",children:i}),e]}),t]})}function Zt({children:i,variant:e="ghost",className:t="",onClick:r,disabled:a,...l}){const[c,d]=B.useState(!1),h=e==="primary"?"bg-sky-500 text-zinc-950 hover:bg-sky-400 font-medium":"bg-zinc-800 text-zinc-200 hover:bg-zinc-700";async function f(m){if(!r)return;const g=r(m);if(g&&typeof g.then=="function"){d(!0);try{await g}finally{d(!1)}}}return M.jsxs("button",{...l,onClick:f,disabled:a||c,className:`relative inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm transition
        disabled:cursor-not-allowed disabled:opacity-40 ${h} ${t}`,children:[M.jsx("span",{className:`inline-flex items-center gap-2 ${c?"invisible":""}`,children:i}),c&&M.jsx(di,{className:"absolute h-4 w-4 animate-spin"})]})}function uo({label:i,children:e,...t}){return M.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:[i,M.jsx("select",{...t,className:"rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",children:e})]})}const cw={err:"bg-red-950/60 text-red-300",busy:"bg-sky-950/60 text-sky-300 animate-pulse",ok:"bg-emerald-950/60 text-emerald-300"},wm=i=>cw[i]??"text-zinc-500",lf="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";function uw({coverage:i,sweep:e,sets:t,setSets:r,count:a,setCount:l,passes:c,setPasses:d,pieces:h,setPieces:f,together:m,setTogether:g,offset:v,setOffset:S,autoOffset:E,setAutoOffset:w,maxPlies:x,setMaxPlies:y,input:N}){return i?M.jsxs(M.Fragment,{children:[M.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Number of physical piece sets: with 2 sets, queens/kings come twice as fast.",children:["Sets",M.jsx("input",{type:"number",min:1,value:t,onChange:P=>r(+P.target.value),className:`${N} w-16`})]}),M.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Number of dense setups generated against your weakest classes.",children:["Setups",M.jsx("input",{type:"number",min:1,value:a,onChange:P=>l(+P.target.value),className:`${N} w-20`})]})]}):e?M.jsxs(M.Fragment,{children:[M.jsxs("div",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Which pieces walk across the board: special = non-pawns (K,Q,R,B,N), pawn = only pawns, all = everything.",children:["Pieces",M.jsxs(uo,{label:"",value:h,onChange:P=>f(P.target.value),children:[M.jsx("option",{value:"special",children:"special (K,Q,R,B,N)"}),M.jsx("option",{value:"pawn",children:"pawn (only pawns)"}),M.jsx("option",{value:"all",children:"all"})]})]}),M.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Repeats (each pass 8 photos, ranks 1–8) — e.g. with different lighting. No piece rearrangement.",children:["Passes",M.jsx("input",{type:"number",min:1,value:c,onChange:P=>d(+P.target.value),className:`${N} w-16`})]}),M.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Number of physical piece sets: with 2 sets, twice as many pieces per photo possible.",children:["Sets",M.jsx("input",{type:"number",min:1,value:t,onChange:P=>r(+P.target.value),className:`${N} w-16`})]}),M.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Both colors on the board at once (white in front, black 4 ranks offset) → half the photos, every square gets both colors.",children:[M.jsx("input",{type:"checkbox",checked:m,onChange:P=>g(P.target.checked)})," both colors at once"]}),M.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Auto offset: counts previous sweep sessions and picks the next offset → each piece lands on different files across sessions (prevents position overfitting).",children:[M.jsx("input",{type:"checkbox",checked:E,onChange:P=>w(P.target.checked)})," Offset auto"]}),!E&&M.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Shifts the line→piece assignment, fixed for this session. 0: a=King,b=Queen,…  1: a=Queen,b=Rook,…",children:["Offset",M.jsx("input",{type:"number",min:0,max:7,value:v,onChange:P=>S(+P.target.value),className:`${N} w-16`})]})]}):M.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Max plies",M.jsx("input",{type:"number",value:x,onChange:P=>y(+P.target.value),className:`${N} w-20`})]})}function dw(){const[i,e]=B.useState("random"),[t,r]=B.useState(40),[a,l]=B.useState(1),[c,d]=B.useState(20),[h,f]=B.useState(1),[m,g]=B.useState("special"),[v,S]=B.useState(!0),[E,w]=B.useState(0),[x,y]=B.useState(!0),[N,P]=B.useState("default"),[C,D]=B.useState(0),L=i==="coverage",F=i==="sweep",[T,I]=B.useState({active:!1}),[G,H]=B.useState(""),[K,re]=B.useState(""),fe=B.useRef(null);B.useEffect(()=>(hn("/api/collect/state").then(I).catch(()=>{}),()=>clearInterval(fe.current)),[]);const O=()=>hn("/api/collect/state").then(I).catch(()=>{});async function ce(){H(""),re("");try{const X=await gn("/api/collect/start",{strategy:i,max_plies:t,profile:N,camera:C,sets:a,count:c,passes:h,pieces:m,together:v,offset:E,auto_offset:x});I(X),clearInterval(fe.current),fe.current=setInterval(O,1500)}catch(X){H("Error: "+X.message),re("err")}}async function Z(){H("Capturing..."),re("busy");try{I(await gn("/api/collect/shoot")),H("Captured ✓"),re("ok")}catch(X){H("Error: "+X.message),re("err")}}async function q(){H("Skipping..."),re("busy");try{I(await gn("/api/collect/skip")),H(""),re("")}catch(X){H("Error: "+X.message),re("err")}}async function ue(){H("Undoing..."),re("busy");try{I(await gn("/api/collect/undo")),H("Undone ✓"),re("ok")}catch(X){H("Error: "+X.message),re("err")}}async function he(){H("Finishing..."),re("busy");try{const X=await gn("/api/collect/finish");clearInterval(fe.current),I({active:!1}),H(`Session finished: ${X.captures} captures, ${X.sliced??0} crops sliced → Datasets tab.`),re("ok")}catch(X){H("Error: "+X.message),re("err")}}const k=wm(K);return M.jsxs("div",{className:"space-y-4",children:[M.jsxs(vn,{children:[M.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[M.jsxs(uo,{label:"Engine",value:i,onChange:X=>e(X.target.value),children:[M.jsx("option",{value:"random",children:"random (built-in)"}),M.jsx("option",{value:"stockfish",children:"stockfish (auto-detected)"}),M.jsx("option",{value:"coverage",children:"coverage (target rare classes)"}),M.jsx("option",{value:"sweep",children:"sweep (pieces walk the board)"})]}),M.jsx(uw,{coverage:L,sweep:F,input:lf,sets:a,setSets:l,count:c,setCount:d,passes:h,setPasses:f,pieces:m,setPieces:g,together:v,setTogether:S,offset:E,setOffset:w,autoOffset:x,setAutoOffset:y,maxPlies:t,setMaxPlies:r}),M.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Profile",M.jsx("input",{value:N,onChange:X=>P(X.target.value),className:`${lf} w-28`})]}),M.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Camera",M.jsx("input",{type:"number",value:C,onChange:X=>D(+X.target.value),className:`${lf} w-16`})]}),T.active?M.jsxs(Zt,{onClick:he,children:[M.jsx(X_,{className:"h-4 w-4"})," Done"]}):M.jsxs(Zt,{variant:"primary",onClick:ce,children:[M.jsx(Mm,{className:"h-4 w-4"})," Start game"]})]}),G&&M.jsx("div",{className:`mt-2 rounded-lg px-3 py-1.5 text-sm ${k}`,children:G})]}),T.active&&M.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_320px]",children:[M.jsx(vn,{title:"Live camera",children:M.jsx("img",{src:"/api/camera/collect.mjpg",alt:"Live capture",className:"w-full rounded-lg border border-zinc-800"})}),M.jsx(vn,{title:"Capture",children:M.jsxs("div",{className:"space-y-3",children:[T.done?M.jsxs("div",{className:"font-medium text-green-500",children:["✓ All ",T.n_positions," positions captured."]}):M.jsxs(M.Fragment,{children:[M.jsx(hw,{st:T}),M.jsxs("div",{className:"flex flex-wrap gap-2",children:[!T.done&&M.jsxs(Zt,{variant:"primary",onClick:Z,className:"px-5 py-2.5 text-base",children:[M.jsx(Sm,{className:"h-5 w-5"})," Photo"]}),!T.done&&M.jsxs(Zt,{onClick:q,children:[M.jsx(j1,{className:"h-4 w-4"})," Skip"]}),M.jsxs(Zt,{onClick:ue,children:[M.jsx(aw,{className:"h-4 w-4"})," Undo"]})]})]}),M.jsxs("div",{className:"text-sm",children:["Captures: ",M.jsx("b",{className:"text-sky-400",children:T.captures}),M.jsx("span",{className:"ml-1 text-xs text-green-500",children:"· instantly saved ✓"})]}),M.jsxs("p",{className:"text-xs text-zinc-500",children:["Each capture is ",M.jsx("b",{children:"saved instantly"}),' — you can press "Done" (above) any time or just stop; nothing is lost.']})]})})]}),M.jsxs("p",{className:"text-xs text-zinc-500",children:['After "Done" the session is sliced automatically. Curated datasets (dedup, rotation, split) are built in the ',M.jsx("b",{className:"text-zinc-300",children:"Datasets"})," tab."]})]})}function hw({st:i}){const e=Math.min(i.index+1,i.n_positions),t=i.build_target?"Setup":"Position",r=i.build_target&&i.gains?M.jsxs("span",{className:"ml-1 text-xs text-zinc-500",children:["· ",i.gains," target squares"]}):null;let a;i.build_target?a=M.jsxs(M.Fragment,{children:["Position ",M.jsx("b",{children:"set up fresh"})," — ",M.jsx("b",{className:"text-sky-300",children:"piece names"})," are overlaid on the live image (white = light text, black = dark),"]}):i.index===0?a=M.jsxs(M.Fragment,{children:["Set up the ",M.jsx("b",{children:"starting position"}),","]}):a=M.jsxs(M.Fragment,{children:["Play this move: ",M.jsx("b",{className:"text-base text-sky-300",children:i.move_san})," ",M.jsx("span",{className:"text-zinc-400",children:"(red arrow)"}),","]});const l=i.build_target?M.jsx(M.Fragment,{children:"(feel free to take several with varying light)"}):null;return M.jsxs(M.Fragment,{children:[M.jsxs("div",{className:"text-sm text-zinc-400",children:[t," ",M.jsx("b",{className:"text-zinc-100",children:e})," / ",i.n_positions,r]}),M.jsxs("div",{className:"rounded-lg bg-zinc-800 p-3 text-sm",children:[a,M.jsxs("div",{className:"mt-1 text-xs text-zinc-400",children:["…then ",M.jsx("b",{children:"Photo"}),l,"."]})]})]})}const co="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-sky-500",cf=({isActive:i})=>`rounded-lg px-3 py-1.5 text-sm transition ${i?"bg-zinc-800 text-zinc-100":"text-zinc-400 hover:text-zinc-100"}`;function fw(){return M.jsxs("div",{className:"space-y-4",children:[M.jsxs("nav",{className:"flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5",children:[M.jsx(fo,{to:"sessions",className:cf,children:"Sessions"}),M.jsx(fo,{to:"curated",className:cf,children:"Curated datasets"}),M.jsx(fo,{to:"stats",className:cf,children:"Statistics"})]}),M.jsx(i1,{})]})}const Y_=()=>{const i=dm();return(...e)=>e.forEach(t=>i.invalidateQueries({queryKey:[t]}))};function pw(){const i=Y_(),[e,t]=B.useState(""),[r,a]=B.useState(""),c=No({queryKey:["sessions-manage"],queryFn:()=>hn("/api/sessions/manage")}).data??[],d=E=>{t(E),a("ok"),i("sessions-manage","stats","datasets")},h=E=>{t("Error: "+E.message),a("err")},f=E=>{t(E),a("busy")},m=ca({mutationFn:E=>gn(`/api/sessions/${E}/slice`),onMutate:E=>f(`slicing "${E}" ...`),onSuccess:E=>d(`"${E.session}" sliced: ${E.crops} crops.`),onError:h}),g=ca({mutationFn:E=>gn(`/api/sessions/${E}/archive`),onSuccess:()=>d("archived."),onError:h}),v=ca({mutationFn:E=>gn(`/api/sessions/${E}/restore`),onSuccess:()=>d("restored — re-slice."),onError:h}),S=ca({mutationFn:E=>Gl(`/api/sessions/${E}`),onSuccess:()=>d("deleted."),onError:h});return M.jsxs(vn,{title:"Sessions (raw material)",right:M.jsxs("span",{className:"text-xs text-zinc-500",children:[c.length," session(s)"]}),children:[e&&M.jsx("div",{className:`mb-2 rounded-lg px-3 py-1.5 text-sm ${wm(r)}`,children:e}),c.length===0?M.jsx("span",{className:"text-sm text-zinc-500",children:"No sessions yet — capture some in the Collect tab."}):M.jsxs("table",{className:"w-full text-sm",children:[M.jsx("thead",{children:M.jsxs("tr",{className:"text-zinc-500",children:[M.jsx("th",{className:"text-left font-normal",children:"Session"}),M.jsx("th",{className:"text-left font-normal",children:"Mode"}),M.jsx("th",{className:"text-right font-normal",children:"Frames"}),M.jsx("th",{className:"text-right font-normal",children:"Crops"}),M.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),M.jsx("tbody",{children:c.map(E=>M.jsxs("tr",{className:"border-t border-zinc-800",children:[M.jsxs("td",{className:"py-1.5 text-zinc-200",children:[E.session_id,E.archived&&M.jsx("span",{className:"ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300",children:"archived"}),!E.archived&&E.n_crops===0&&M.jsx("span",{className:"ml-2 rounded bg-amber-900/60 px-1.5 py-0.5 text-[10px] text-amber-300",children:"not sliced"})]}),M.jsx("td",{className:"text-zinc-400",children:E.mode??"—"}),M.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:E.n_frames}),M.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:E.archived?"—":E.n_crops}),M.jsx("td",{className:"py-1",children:M.jsxs("div",{className:"flex justify-end gap-1.5",children:[!E.archived&&M.jsxs(Zt,{onClick:()=>m.mutate(E.session_id),disabled:m.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[m.isPending&&m.variables===E.session_id?M.jsx(di,{className:"h-3.5 w-3.5 animate-spin"}):M.jsx(sw,{className:"h-3.5 w-3.5"})," ",E.n_crops?"Re-slice":"Slice"]}),E.archived?M.jsxs(Zt,{onClick:()=>v.mutateAsync(E.session_id),disabled:v.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[v.isPending&&v.variables===E.session_id?M.jsx(di,{className:"h-3.5 w-3.5 animate-spin"}):M.jsx(G1,{className:"h-3.5 w-3.5"})," Restore"]}):M.jsxs(Zt,{onClick:()=>g.mutateAsync(E.session_id),disabled:g.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[g.isPending&&g.variables===E.session_id?M.jsx(di,{className:"h-3.5 w-3.5 animate-spin"}):M.jsx(W1,{className:"h-3.5 w-3.5"})," Archive"]}),M.jsxs(Zt,{onClick:()=>window.confirm(`Delete session "${E.session_id}" permanently?`)&&S.mutateAsync(E.session_id),disabled:S.isPending,className:"px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50",children:[S.isPending&&S.variables===E.session_id?M.jsx(di,{className:"h-3.5 w-3.5 animate-spin"}):M.jsx(Bo,{className:"h-3.5 w-3.5"})," Delete"]})]})})]},E.session_id))})]})]})}function mw(){const i=Y_(),[e,t]=B.useState(""),[r,a]=B.useState(""),[l,c]=B.useState(!1),[d,h]=B.useState(""),[f,m]=B.useState({}),[g,v]=B.useState(4),[S,E]=B.useState(!0),[w,x]=B.useState(6),[y,N]=B.useState(!0),[P,C]=B.useState(.15),[D,L]=B.useState(.15),F=No({queryKey:["sessions-manage"],queryFn:()=>hn("/api/sessions/manage")}),T=No({queryKey:["datasets"],queryFn:()=>hn("/api/datasets")}),I=(F.data??[]).filter(O=>!O.archived),G=T.data??[],H=ca({mutationFn:O=>gn("/api/datasets",O),onSuccess:O=>{t(`"${O.name}" built: raw ${O.counts.raw} → dedup ${O.counts.after_dedup} → final ${O.counts.final}.`),a("ok"),c(!1),h(""),m({}),i("datasets","stats")},onError:O=>{t("Error: "+O.message),a("err")}}),K=ca({mutationFn:O=>Gl(`/api/datasets/${O}`),onSuccess:()=>{t("deleted."),a("ok"),i("datasets")},onError:O=>{t("Error: "+O.message),a("err")}}),re=ca({mutationFn:O=>gn(`/api/datasets/${O}/rebuild`),onSuccess:O=>{var ce;t(`"${O.name}" rebuilt: ${(ce=O.counts)==null?void 0:ce.final} crops.`),a("ok"),i("datasets","stats")},onError:O=>{t("Error: "+O.message),a("err")}});function fe(){const O=I.filter(ce=>f[ce.session_id]).map(ce=>ce.session_id);if(!d.trim()||O.length===0){t("Name and at least one session required.");return}H.mutate({name:d.trim(),session_ids:O,per_cell_cap:g,phash_enabled:S,phash_hamming:w,rotate:y,val_frac:P,test_frac:D})}return M.jsxs(vn,{title:"Curated datasets",right:M.jsxs("div",{className:"flex items-center gap-2",children:[e&&M.jsx("span",{className:`rounded-lg px-2 py-0.5 text-xs ${wm(r)}`,children:e}),M.jsxs(Zt,{onClick:()=>c(O=>!O),className:"px-2 py-1 text-xs",children:[M.jsx($1,{className:"h-3.5 w-3.5"})," New Dataset"]})]}),children:[l&&M.jsxs("div",{className:"mb-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3",children:[M.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[M.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["Name",M.jsx("input",{value:d,onChange:O=>h(O.target.value),className:`${co} w-40`,placeholder:"e.g. set-a"})]}),M.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",title:"max. crops per (session, square, piece)",children:["Cap/cell",M.jsx("input",{type:"number",min:1,value:g,onChange:O=>v(+O.target.value),className:`${co} w-16`})]}),M.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:[M.jsx("input",{type:"checkbox",checked:S,onChange:O=>E(O.target.checked)})," pHash"]}),M.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["Hamming",M.jsx("input",{type:"number",min:0,max:32,value:w,disabled:!S,onChange:O=>x(+O.target.value),className:`${co} w-14`})]}),M.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",title:"90/180/270° → 4× crops. WARNING: violates the fixed-camera assumption — A/B test.",children:[M.jsx("input",{type:"checkbox",checked:y,onChange:O=>N(O.target.checked)})," ",M.jsx(rw,{className:"h-3.5 w-3.5"})," Rotation"]}),M.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["val",M.jsx("input",{type:"number",step:.05,min:0,max:.5,value:P,onChange:O=>C(+O.target.value),className:`${co} w-14`})]}),M.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["test",M.jsx("input",{type:"number",step:.05,min:0,max:.5,value:D,onChange:O=>L(+O.target.value),className:`${co} w-14`})]})]}),M.jsxs("div",{children:[M.jsx("div",{className:"mb-1 text-xs text-zinc-500",children:"Sessions (freely selectable subset — datasets may overlap):"}),M.jsx("div",{className:"flex flex-wrap gap-2",children:I.length===0?M.jsx("span",{className:"text-xs text-zinc-500",children:"no active sessions"}):I.map(O=>M.jsxs("label",{className:"flex items-center gap-1.5 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300",children:[M.jsx("input",{type:"checkbox",checked:!!f[O.session_id],onChange:ce=>m(Z=>({...Z,[O.session_id]:ce.target.checked}))}),O.session_id," ",M.jsxs("span",{className:"text-zinc-500",children:["(",O.n_crops,")"]})]},O.session_id))})]}),M.jsxs(Zt,{variant:"primary",onClick:fe,disabled:H.isPending,children:[H.isPending?M.jsx(di,{className:"h-4 w-4 animate-spin"}):M.jsx(Fv,{className:"h-4 w-4"})," ",H.isPending?"Building…":"Build"]})]}),G.length===0?M.jsx("span",{className:"text-sm text-zinc-500",children:"No dataset built yet."}):M.jsxs("table",{className:"w-full text-sm",children:[M.jsx("thead",{children:M.jsxs("tr",{className:"text-zinc-500",children:[M.jsx("th",{className:"text-left font-normal",children:"Dataset"}),M.jsx("th",{className:"text-right font-normal",children:"Sessions"}),M.jsx("th",{className:"text-right font-normal",children:"raw→dedup→final"}),M.jsx("th",{className:"text-right font-normal",children:"train/val/test"}),M.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),M.jsx("tbody",{children:G.map(O=>{var ce,Z,q,ue,he,k,X;return M.jsxs("tr",{className:"border-t border-zinc-800",children:[M.jsxs("td",{className:"py-1.5 text-zinc-200",children:[O.name,((ce=O.rotations)==null?void 0:ce.some(Fe=>Fe))&&M.jsx("span",{className:"ml-2 text-[10px] text-zinc-500",children:"+rot"})]}),M.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:O.n_sessions}),M.jsxs("td",{className:"text-right tabular-nums text-zinc-400",children:[(Z=O.counts)==null?void 0:Z.raw,"→",(q=O.counts)==null?void 0:q.after_dedup,"→",(ue=O.counts)==null?void 0:ue.final]}),M.jsxs("td",{className:"text-right tabular-nums text-zinc-400",children:[((he=O.split_counts)==null?void 0:he.train)??"?","/",((k=O.split_counts)==null?void 0:k.val)??"?","/",((X=O.split_counts)==null?void 0:X.test)??"?"]}),M.jsx("td",{className:"py-1",children:M.jsxs("div",{className:"flex justify-end gap-1.5",children:[M.jsx(fo,{to:`../stats?ds=${encodeURIComponent(O.name)}`,className:"inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700",children:"Stats"}),M.jsxs(Zt,{onClick:()=>re.mutateAsync(O.name),disabled:re.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[re.isPending&&re.variables===O.name?M.jsx(di,{className:"h-3.5 w-3.5 animate-spin"}):M.jsx(Fv,{className:"h-3.5 w-3.5"})," Rebuild"]}),M.jsxs(Zt,{onClick:()=>{window.confirm(`Delete dataset "${O.name}"?`)&&K.mutateAsync(O.name)},disabled:K.isPending,className:"px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50",children:[K.isPending&&K.variables===O.name?M.jsx(di,{className:"h-3.5 w-3.5 animate-spin"}):M.jsx(Bo,{className:"h-3.5 w-3.5"})," Delete"]})]})})]},O.name)})})]})]})}function gw(){const[i,e]=I1(),t=i.get("ds")??"",[r,a]=B.useState(null),l=No({queryKey:["datasets"],queryFn:()=>hn("/api/datasets")}),c=No({queryKey:["stats",t],queryFn:()=>{const w=t?`?dataset=${encodeURIComponent(t)}`:"";return hn(`/api/stats${w}`)}}),d=l.data??[],h=c.data,[f,m]=B.useState("");if(c.isLoading||!h)return M.jsx(vn,{title:"Stats",children:"Loading…"});const g=t?`Dataset "${t}"`:"global pool",v=Math.max(1,...Object.values(h.counts??{x:1})),S=(w,x)=>w==="empty"||w==="occluded"?"#38bdf8":x<h.min_samples*.5?"#ef4444":x<h.min_samples?"#eab308":"#22c55e",E=w=>{const x=t?`&dataset=${encodeURIComponent(t)}`:"";m(""),hn(`/api/class/${w}?limit=120${x}`).then(y=>a({label:w,crops:y.crops})).catch(y=>m(y.message))};return M.jsxs("div",{className:"space-y-4",children:[M.jsxs("div",{className:"grid gap-4 lg:grid-cols-3",children:[M.jsxs(vn,{title:"Class distribution",className:"lg:col-span-2",right:M.jsxs("select",{value:t,onChange:w=>e(w.target.value?{ds:w.target.value}:{}),className:co,children:[M.jsx("option",{value:"",children:"global pool"}),d.map(w=>M.jsx("option",{value:w.name,children:w.name},w.name))]}),children:[M.jsxs("div",{className:"mb-2 text-xs text-zinc-500",children:[h.total," crops · ",h.num_sessions," sessions",t?` · Dataset "${t}"`:" · raw"]}),M.jsx("div",{className:"space-y-1.5",children:h.classes.map(w=>{const x=h.counts[w]||0;return M.jsxs("button",{onClick:()=>E(w),className:"grid w-full grid-cols-[2rem_1fr_3rem] items-center gap-3 rounded px-1 py-0.5 text-left hover:bg-zinc-800",children:[M.jsxs("span",{className:"text-zinc-300",children:[M.jsx(zv,{label:w}),M.jsx("span",{className:"ml-1 text-xs text-zinc-500",children:w})]}),M.jsx("div",{className:"h-2.5 overflow-hidden rounded-full bg-zinc-800",children:M.jsx("div",{className:"h-full rounded-full",style:{width:`${x/v*100}%`,background:S(w,x)}})}),M.jsx("span",{className:"text-right text-sm tabular-nums text-zinc-400",children:x})]},w)})})]}),M.jsx(vn,{title:"Light / Dark",children:M.jsxs("table",{className:"w-full text-sm",children:[M.jsx("thead",{children:M.jsxs("tr",{className:"text-zinc-500",children:[M.jsx("th",{className:"text-left font-normal",children:"Class"}),M.jsx("th",{children:"light"}),M.jsx("th",{children:"dark"})]})}),M.jsx("tbody",{children:h.classes.map(w=>{const x=y=>y>0?M.jsx(Y1,{className:"mx-auto h-4 w-4 text-green-500"}):M.jsx(ow,{className:"mx-auto h-4 w-4 text-red-500"});return M.jsxs("tr",{className:"border-t border-zinc-800",children:[M.jsxs("td",{className:"py-1 text-zinc-300",children:[M.jsx(zv,{label:w})," ",M.jsx("span",{className:"text-xs text-zinc-500",children:w})]}),M.jsx("td",{children:x(h.light[w]||0)}),M.jsx("td",{children:x(h.dark[w]||0)})]},w)})})]})})]}),M.jsx(vn,{title:"Warnings",children:h.warnings.length?M.jsx("ul",{className:"space-y-1 text-sm",children:h.warnings.map((w,x)=>M.jsxs("li",{className:"flex items-center gap-2 text-amber-400",children:[M.jsx(Em,{className:"h-4 w-4 shrink-0"})," ",w]},x))}):M.jsx("span",{className:"text-sm text-green-500",children:"none"})}),M.jsxs(vn,{title:`Browse crops (${g})`,right:M.jsxs("span",{className:"flex items-center gap-1 text-xs text-zinc-500",children:[M.jsx(tw,{className:"h-3.5 w-3.5"}),r?`${r.label} (${r.crops.length})`:"Click a class"]}),children:[f&&M.jsx("div",{className:"mb-2 rounded-lg bg-red-950/60 px-3 py-1.5 text-sm text-red-300",children:f}),r?M.jsx("div",{className:"grid grid-cols-[repeat(auto-fill,56px)] gap-1.5",children:r.crops.map((w,x)=>M.jsx("img",{src:w.url,title:`${w.session_id} ${w.frame} ${w.square}`,alt:`square ${w.square}`,className:"h-[74px] w-[56px] rounded border border-zinc-800 object-cover"},x))}):M.jsx("span",{className:"text-sm text-zinc-500",children:"Select a class on the left to view crops."})]})]})}function Bv({series:i,yMin:e=0,yMax:t=1}){const c=i.flatMap(g=>g.data.map(v=>v.x)),d=Math.max(1,...c),h=g=>30+540*g/d,f=g=>170-140*(g-e)/Math.max(1e-9,t-e),m=4;return M.jsxs("div",{children:[M.jsxs("svg",{viewBox:"0 0 600 200",className:"w-full",style:{height:200},preserveAspectRatio:"none",children:[Array.from({length:m+1},(g,v)=>{const S=e+(t-e)*v/m;return M.jsxs("g",{children:[M.jsx("line",{x1:30,y1:f(S),x2:570,y2:f(S),stroke:"#27272a",strokeWidth:1}),M.jsx("text",{x:4,y:f(S)+3,fill:"#71717a",fontSize:10,children:S.toFixed(t<=1?2:1)})]},v)}),i.map(g=>g.data.length?M.jsx("polyline",{fill:"none",stroke:g.color,strokeWidth:2,strokeLinejoin:"round",points:g.data.map(v=>`${h(v.x).toFixed(1)},${f(v.y).toFixed(1)}`).join(" ")},g.name):null)]}),M.jsx("div",{className:"mt-1 flex flex-wrap gap-4 text-xs text-zinc-400",children:i.map(g=>M.jsxs("span",{className:"flex items-center gap-1.5",children:[M.jsx("span",{className:"inline-block h-2 w-2 rounded-full",style:{background:g.color}}),g.name]},g.name))})]})}const hu="w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100";function vw(){var de,Se,xe;const[i,e]=B.useState([]),[t,r]=B.useState(""),[a,l]=B.useState(""),[c,d]=B.useState([]),[h,f]=B.useState({}),[m,g]=B.useState({running:!1}),[v,S]=B.useState(""),[E,w]=B.useState("smallcnn"),[x,y]=B.useState("combined"),[N,P]=B.useState(30),[C,D]=B.useState(256),[L,F]=B.useState(3e-4),[T,I]=B.useState(7),[G,H]=B.useState(""),K=B.useRef(null),fe=No({queryKey:["datasets"],queryFn:()=>hn("/api/datasets")}).data??[],O=fe.find(te=>te.name===a);B.useEffect(()=>{fe.length&&!a&&l(fe[0].name)},[fe]);const ce=B.useCallback(async()=>{const te=await hn("/api/runs");e(te),te.length&&!t&&Z(te[0].run)},[t]);B.useEffect(()=>(ce(),()=>clearInterval(K.current)),[ce]);async function Z(te){r(te),S("");try{d((await hn(`/api/runs/${te}/metrics`)).metrics),f((await hn(`/api/runs/${te}/eval`)).evals)}catch(Ue){S(Ue.message)}}async function q(te){if(window.confirm(`Delete model "${te}"? (directory + weights will be removed)`)){try{await Gl(`/api/runs/${te}`)}catch(Ue){S(Ue.message);return}S(""),t===te&&(r(""),d([]),f({})),ce()}}const ue=te=>te==null?"—":(te*100).toFixed(1)+" %";async function he(){if(S(""),!a){S("No dataset — build one in the Datasets tab first.");return}try{await gn("/api/train",{backbone:E,head:x,epochs:N,batch_size:C,lr:L,patience:T,no_amp:!0,dataset:a,resume:G||void 0}),clearInterval(K.current),K.current=setInterval(k,2500),k()}catch(te){S(te.message)}}async function k(){var Ue;const te=await hn("/api/train/status");g(te),(Ue=te.metrics)!=null&&Ue.length&&d(te.metrics),te.running||(clearInterval(K.current),ce())}async function X(){var te;try{await gn("/api/train/stop")}catch{}clearInterval(K.current);try{const Ue=await hn("/api/train/status");g({...Ue,running:!1}),Ue.run&&r(Ue.run),(te=Ue.metrics)!=null&&te.length&&d(Ue.metrics)}catch{g({running:!1,state:"stopped"})}ce()}const Fe=[{name:"train_loss",color:"#ef4444",data:c.map(te=>({x:te.epoch,y:te.train_loss}))},{name:"val_loss",color:"#eab308",data:c.map(te=>({x:te.epoch,y:te.val_loss??0}))}],je=Math.max(.5,...c.map(te=>Math.max(te.train_loss||0,te.val_loss||0))),Ge=[{name:"square_acc",color:"#38bdf8",data:c.map(te=>({x:te.epoch,y:te.val_acc??0}))},{name:"macro_recall",color:"#22c55e",data:c.map(te=>({x:te.epoch,y:te.val_macro_recall??0}))},{name:"board_acc",color:"#e4e4e7",data:c.map(te=>({x:te.epoch,y:te.val_board_acc??0}))}];return M.jsxs("div",{className:"space-y-4",children:[M.jsxs(vn,{children:[M.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[M.jsxs(uo,{label:"Dataset",value:a,onChange:te=>l(te.target.value),children:[fe.length===0&&M.jsx("option",{value:"",children:"— none built —"}),fe.map(te=>{var Ue;return M.jsxs("option",{value:te.name,children:[te.name," (",((Ue=te.counts)==null?void 0:Ue.final)??"?",")"]},te.name)})]}),M.jsxs(uo,{label:"Backbone",value:E,onChange:te=>w(te.target.value),children:[M.jsx("option",{value:"smallcnn",children:"smallcnn"}),M.jsx("option",{value:"mobilenet_v3_small",children:"mobilenet_v3_small"})]}),M.jsxs(uo,{label:"Head",value:x,onChange:te=>y(te.target.value),children:[M.jsx("option",{value:"combined",children:"combined"}),M.jsx("option",{value:"factored",children:"factored"}),M.jsx("option",{value:"twostage",children:"twostage (Occ→Piece)"})]}),M.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",children:["Epochs",M.jsx("input",{type:"number",min:1,value:N,onChange:te=>P(+te.target.value),className:hu})]}),M.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",children:["Batch",M.jsx("input",{type:"number",min:1,value:C,onChange:te=>D(+te.target.value),className:hu})]}),M.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",children:["LR",M.jsx("input",{type:"number",step:1e-4,min:0,value:L,onChange:te=>F(+te.target.value),className:hu})]}),M.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Early stopping: epochs without macro_recall progress before aborting.",children:["Patience",M.jsx("input",{type:"number",min:1,value:T,onChange:te=>I(+te.target.value),className:hu})]}),M.jsxs(uo,{label:"Resume",value:G,onChange:te=>H(te.target.value),children:[M.jsx("option",{value:"",children:"from scratch"}),i.some(te=>String(te.dataset||"").startsWith("pretrain-"))&&M.jsx("optgroup",{label:"Base models (pretrained)",children:i.filter(te=>String(te.dataset||"").startsWith("pretrain-")).map(te=>M.jsxs("option",{value:te.run,children:["🔹 Base · ",te.run]},te.run))}),M.jsx("optgroup",{label:"Own runs",children:i.filter(te=>!String(te.dataset||"").startsWith("pretrain-")).map(te=>M.jsx("option",{value:te.run,children:te.run},te.run))})]}),M.jsxs(Zt,{variant:"primary",onClick:he,disabled:m.running||!a,children:[m.running?M.jsx(di,{className:"h-4 w-4 animate-spin"}):M.jsx(Mm,{className:"h-4 w-4"})," Start training"]}),m.running&&M.jsxs(Zt,{onClick:X,children:[M.jsx($_,{className:"h-4 w-4"})," Cancel"]})]}),O&&M.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:["Split: train ",((de=O.split_counts)==null?void 0:de.train)??"?"," · val ",((Se=O.split_counts)==null?void 0:Se.val)??"?"," · test ",((xe=O.split_counts)==null?void 0:xe.test)??"?"]}),(m.running||c.length>0)&&M.jsxs("div",{className:"mt-3",children:[M.jsxs("div",{className:"mb-1 flex justify-between text-xs text-zinc-400",children:[M.jsxs("span",{children:[m.running?`running… (${m.run})`:m.state==="stopped"||m.state==="crashed"?"aborted":"Progress"," · epoch ",c.length,"/",N]}),M.jsxs("span",{children:["board_acc ",c.length?((c[c.length-1].val_board_acc??0)*100).toFixed(1)+" %":"—"]})]}),M.jsx("div",{className:"h-2 overflow-hidden rounded-full bg-zinc-800",children:M.jsx("div",{className:`h-full rounded-full transition-all ${m.state==="stopped"||m.state==="crashed"?"bg-amber-500":"bg-sky-500"}`,style:{width:`${Math.min(100,c.length/Math.max(1,N)*100)}%`}})})]}),!m.running&&m.state==="done"&&M.jsx("p",{className:"mt-2 text-xs text-green-500",children:"done ✓"}),!m.running&&(m.state==="stopped"||m.state==="crashed")&&M.jsxs("p",{className:"mt-2 text-xs text-amber-400",children:[m.state==="crashed"?"aborted (crash)":"aborted"," at epoch ",c.length,' — partial progress is preserved; "best.pt" saved, "Resume" picks up here.']}),v&&M.jsx("p",{className:"mt-2 text-sm text-amber-400",children:v})]}),M.jsxs(vn,{title:"Models",right:M.jsxs("span",{className:"text-xs text-zinc-500",children:[i.length," Run(s)"]}),children:[i.length===0?M.jsx("span",{className:"text-sm text-zinc-500",children:"No model trained yet."}):M.jsx("div",{className:"overflow-x-auto",children:M.jsxs("table",{className:"w-full text-sm",children:[M.jsx("thead",{children:M.jsxs("tr",{className:"text-zinc-500",children:[M.jsx("th",{className:"text-left font-normal",children:"Run"}),M.jsx("th",{className:"text-left font-normal",children:"Backbone"}),M.jsx("th",{className:"text-left font-normal",children:"Dataset"}),M.jsx("th",{className:"text-right font-normal",children:"Cls"}),M.jsx("th",{className:"text-right font-normal",children:"Ep."}),"                ",M.jsx("th",{className:"text-right font-normal",title:"best val board_acc (all 64 squares correct)",children:"board_acc"}),M.jsx("th",{className:"text-right font-normal",title:"best val square_acc (fraction of correct squares — drives board_acc ≈ square_acc^64)",children:"square_acc"}),M.jsx("th",{className:"text-right font-normal",title:"best val macro_recall",children:"macro_rec"}),M.jsx("th",{className:"text-right font-normal",title:"test-set board_acc (after eval)",children:"test"}),M.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),M.jsx("tbody",{children:i.map(te=>M.jsxs("tr",{className:`border-t border-zinc-800 ${t===te.run?"bg-zinc-800/50":""}`,children:[M.jsxs("td",{className:"py-1.5 text-zinc-200",children:[te.run,te.resumed_from&&M.jsx("span",{className:"ml-1 text-[10px] text-zinc-500",title:`resumed from ${te.resumed_from}`,children:"↻"}),te.has_occluded&&M.jsx("span",{className:"ml-1 rounded bg-zinc-700 px-1 text-[9px] text-amber-300",children:"+occ"})]}),M.jsx("td",{className:"text-zinc-400",children:te.backbone}),M.jsx("td",{className:"text-zinc-400",children:te.dataset??"—"}),M.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:te.n_classes}),M.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:te.epochs_done}),M.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:ue(te.best_board_acc)}),M.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:ue(te.best_square_acc)}),M.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:ue(te.best_macro_recall)}),M.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:ue(te.test_board_acc)}),M.jsx("td",{className:"py-1",children:M.jsxs("div",{className:"flex justify-end gap-1.5",children:[M.jsxs(Zt,{onClick:()=>Z(te.run),className:"px-2 py-1 text-xs",children:[M.jsx(J1,{className:"h-3.5 w-3.5"})," View"]}),M.jsxs(Zt,{onClick:()=>q(te.run),className:"px-2 py-1 text-xs text-red-300 hover:text-red-200",children:[M.jsx(Bo,{className:"h-3.5 w-3.5"})," Delete"]})]})})]},te.run))})]})}),M.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:['"View" loads curves & eval below · "test" appears after ',M.jsx("code",{children:"chesslab eval --run …"}),' · ↻ = continued training · +occ = model knows "occluded" class.']})]}),M.jsxs("div",{className:"grid gap-4 lg:grid-cols-2",children:[M.jsx(vn,{title:"Loss",children:M.jsx(Bv,{series:Fe,yMin:0,yMax:je})}),M.jsx(vn,{title:"Metrics (0-1) — macro_recall is the honest number",children:M.jsx(Bv,{series:Ge,yMin:0,yMax:1})})]}),M.jsx(vn,{title:"Evaluation",children:Object.keys(h).length?M.jsx("div",{className:"space-y-4",children:Object.entries(h).map(([te,Ue])=>{const tt=Object.entries(Ue.recall||{}).sort((Dt,ct)=>Dt[1]-ct[1]).slice(0,3);return M.jsxs("div",{children:[M.jsxs("div",{className:"text-sm",children:[M.jsx("span",{className:"font-medium uppercase text-zinc-400",children:te})," · board_acc ",M.jsxs("b",{children:[(Ue.board_acc*100).toFixed(1),"%"]})," · square_acc ",(Ue.square_acc*100).toFixed(1),"%"]}),M.jsxs("div",{className:"text-xs text-zinc-500",children:["weakest classes: ",tt.map(([Dt,ct])=>`${Dt} ${(ct*100).toFixed(0)}%`).join(", ")]}),Ue.confusion_png&&M.jsx("img",{src:Ue.confusion_png,alt:"Confusion Matrix",className:"mt-2 max-w-md rounded-lg border border-zinc-800"})]},te)})}):M.jsxs("span",{className:"text-sm text-zinc-500",children:["No eval yet — ",M.jsx("code",{children:"chesslab eval --run …"})]})}),m.log_tail&&M.jsx(vn,{title:"Log",children:M.jsx("pre",{className:"max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 text-xs text-zinc-400",children:m.log_tail})})]})}/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Tm="185",po={ROTATE:0,DOLLY:1,PAN:2},ho={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},xw=0,Hv=1,_w=2,Wu=1,yw=2,Ul=3,Us=0,hi=1,hr=2,Gr=0,mo=1,Vv=2,Gv=3,Wv=4,Sw=5,aa=100,Mw=101,Ew=102,ww=103,Tw=104,bw=200,Cw=201,Rw=202,Aw=203,hp=204,fp=205,Pw=206,Nw=207,Lw=208,Dw=209,Iw=210,Uw=211,Fw=212,Ow=213,kw=214,pp=0,mp=1,gp=2,Lo=3,vp=4,xp=5,_p=6,yp=7,bm=0,zw=1,Bw=2,mr=0,K_=1,Q_=2,Z_=3,Cm=4,J_=5,ey=6,ty=7,ny=300,Ma=301,Do=302,uf=303,df=304,md=306,Sp=1e3,Vr=1001,Mp=1002,Un=1003,Hw=1004,fu=1005,Wn=1006,hf=1007,ua=1008,Si=1009,iy=1010,ry=1011,Wl=1012,Rm=1013,xr=1014,fr=1015,$r=1016,Am=1017,Pm=1018,jl=1020,sy=35902,ay=35899,oy=1021,ly=1022,Ki=1023,qr=1026,da=1027,cy=1028,Nm=1029,Ea=1030,Lm=1031,Dm=1033,ju=33776,Xu=33777,$u=33778,qu=33779,Ep=35840,wp=35841,Tp=35842,bp=35843,Cp=36196,Rp=37492,Ap=37496,Pp=37488,Np=37489,nd=37490,Lp=37491,Dp=37808,Ip=37809,Up=37810,Fp=37811,Op=37812,kp=37813,zp=37814,Bp=37815,Hp=37816,Vp=37817,Gp=37818,Wp=37819,jp=37820,Xp=37821,$p=36492,qp=36494,Yp=36495,Kp=36283,Qp=36284,id=36285,Zp=36286,Vw=3200,rd=0,Gw=1,Es="",Zn="srgb",sd="srgb-linear",ad="linear",Bt="srgb",qa=7680,jv=519,Ww=512,jw=513,Xw=514,Im=515,$w=516,qw=517,Um=518,Yw=519,Xv=35044,$v="300 es",pr=2e3,Xl=2001;function Kw(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function $l(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Qw(){const i=$l("canvas");return i.style.display="block",i}const qv={};function Yv(...i){const e="THREE."+i.shift();console.log(e,...i)}function uy(i){const e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function lt(...i){i=uy(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function Nt(...i){i=uy(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function go(...i){const e=i.join(" ");e in qv||(qv[e]=!0,lt(...i))}function Zw(i,e,t){return new Promise(function(r,a){function l(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:a();break;case i.TIMEOUT_EXPIRED:setTimeout(l,t);break;default:r()}}setTimeout(l,t)})}const Jw={[pp]:mp,[gp]:_p,[vp]:yp,[Lo]:xp,[mp]:pp,[_p]:gp,[yp]:vp,[xp]:Lo};class Os{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const r=this._listeners;r[e]===void 0&&(r[e]=[]),r[e].indexOf(t)===-1&&r[e].push(t)}hasEventListener(e,t){const r=this._listeners;return r===void 0?!1:r[e]!==void 0&&r[e].indexOf(t)!==-1}removeEventListener(e,t){const r=this._listeners;if(r===void 0)return;const a=r[e];if(a!==void 0){const l=a.indexOf(t);l!==-1&&a.splice(l,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const r=t[e.type];if(r!==void 0){e.target=this;const a=r.slice(0);for(let l=0,c=a.length;l<c;l++)a[l].call(this,e);e.target=null}}}const Hn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Yu=Math.PI/180,Jp=180/Math.PI;function tc(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(Hn[i&255]+Hn[i>>8&255]+Hn[i>>16&255]+Hn[i>>24&255]+"-"+Hn[e&255]+Hn[e>>8&255]+"-"+Hn[e>>16&15|64]+Hn[e>>24&255]+"-"+Hn[t&63|128]+Hn[t>>8&255]+"-"+Hn[t>>16&255]+Hn[t>>24&255]+Hn[r&255]+Hn[r>>8&255]+Hn[r>>16&255]+Hn[r>>24&255]).toLowerCase()}function Mt(i,e,t){return Math.max(e,Math.min(t,i))}function eT(i,e){return(i%e+e)%e}function ff(i,e,t){return(1-t)*i+t*e}function bl(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function oi(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}const tT={DEG2RAD:Yu},Hm=class Hm{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,r=this.y,a=e.elements;return this.x=a[0]*t+a[3]*r+a[6],this.y=a[1]*t+a[4]*r+a[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Mt(this.x,e.x,t.x),this.y=Mt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Mt(this.x,e,t),this.y=Mt(this.y,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(Mt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const r=this.dot(e)/t;return Math.acos(Mt(r,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,r=this.y-e.y;return t*t+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const r=Math.cos(t),a=Math.sin(t),l=this.x-e.x,c=this.y-e.y;return this.x=l*r-c*a+e.x,this.y=l*a+c*r+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};Hm.prototype.isVector2=!0;let dt=Hm;class Fs{constructor(e=0,t=0,r=0,a=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=r,this._w=a}static slerpFlat(e,t,r,a,l,c,d){let h=r[a+0],f=r[a+1],m=r[a+2],g=r[a+3],v=l[c+0],S=l[c+1],E=l[c+2],w=l[c+3];if(g!==w||h!==v||f!==S||m!==E){let x=h*v+f*S+m*E+g*w;x<0&&(v=-v,S=-S,E=-E,w=-w,x=-x);let y=1-d;if(x<.9995){const N=Math.acos(x),P=Math.sin(N);y=Math.sin(y*N)/P,d=Math.sin(d*N)/P,h=h*y+v*d,f=f*y+S*d,m=m*y+E*d,g=g*y+w*d}else{h=h*y+v*d,f=f*y+S*d,m=m*y+E*d,g=g*y+w*d;const N=1/Math.sqrt(h*h+f*f+m*m+g*g);h*=N,f*=N,m*=N,g*=N}}e[t]=h,e[t+1]=f,e[t+2]=m,e[t+3]=g}static multiplyQuaternionsFlat(e,t,r,a,l,c){const d=r[a],h=r[a+1],f=r[a+2],m=r[a+3],g=l[c],v=l[c+1],S=l[c+2],E=l[c+3];return e[t]=d*E+m*g+h*S-f*v,e[t+1]=h*E+m*v+f*g-d*S,e[t+2]=f*E+m*S+d*v-h*g,e[t+3]=m*E-d*g-h*v-f*S,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,r,a){return this._x=e,this._y=t,this._z=r,this._w=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const r=e._x,a=e._y,l=e._z,c=e._order,d=Math.cos,h=Math.sin,f=d(r/2),m=d(a/2),g=d(l/2),v=h(r/2),S=h(a/2),E=h(l/2);switch(c){case"XYZ":this._x=v*m*g+f*S*E,this._y=f*S*g-v*m*E,this._z=f*m*E+v*S*g,this._w=f*m*g-v*S*E;break;case"YXZ":this._x=v*m*g+f*S*E,this._y=f*S*g-v*m*E,this._z=f*m*E-v*S*g,this._w=f*m*g+v*S*E;break;case"ZXY":this._x=v*m*g-f*S*E,this._y=f*S*g+v*m*E,this._z=f*m*E+v*S*g,this._w=f*m*g-v*S*E;break;case"ZYX":this._x=v*m*g-f*S*E,this._y=f*S*g+v*m*E,this._z=f*m*E-v*S*g,this._w=f*m*g+v*S*E;break;case"YZX":this._x=v*m*g+f*S*E,this._y=f*S*g+v*m*E,this._z=f*m*E-v*S*g,this._w=f*m*g-v*S*E;break;case"XZY":this._x=v*m*g-f*S*E,this._y=f*S*g-v*m*E,this._z=f*m*E+v*S*g,this._w=f*m*g+v*S*E;break;default:lt("Quaternion: .setFromEuler() encountered an unknown order: "+c)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const r=t/2,a=Math.sin(r);return this._x=e.x*a,this._y=e.y*a,this._z=e.z*a,this._w=Math.cos(r),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,r=t[0],a=t[4],l=t[8],c=t[1],d=t[5],h=t[9],f=t[2],m=t[6],g=t[10],v=r+d+g;if(v>0){const S=.5/Math.sqrt(v+1);this._w=.25/S,this._x=(m-h)*S,this._y=(l-f)*S,this._z=(c-a)*S}else if(r>d&&r>g){const S=2*Math.sqrt(1+r-d-g);this._w=(m-h)/S,this._x=.25*S,this._y=(a+c)/S,this._z=(l+f)/S}else if(d>g){const S=2*Math.sqrt(1+d-r-g);this._w=(l-f)/S,this._x=(a+c)/S,this._y=.25*S,this._z=(h+m)/S}else{const S=2*Math.sqrt(1+g-r-d);this._w=(c-a)/S,this._x=(l+f)/S,this._y=(h+m)/S,this._z=.25*S}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let r=e.dot(t)+1;return r<1e-8?(r=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=r):(this._x=0,this._y=-e.z,this._z=e.y,this._w=r)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=r),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Mt(this.dot(e),-1,1)))}rotateTowards(e,t){const r=this.angleTo(e);if(r===0)return this;const a=Math.min(1,t/r);return this.slerp(e,a),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const r=e._x,a=e._y,l=e._z,c=e._w,d=t._x,h=t._y,f=t._z,m=t._w;return this._x=r*m+c*d+a*f-l*h,this._y=a*m+c*h+l*d-r*f,this._z=l*m+c*f+r*h-a*d,this._w=c*m-r*d-a*h-l*f,this._onChangeCallback(),this}slerp(e,t){let r=e._x,a=e._y,l=e._z,c=e._w,d=this.dot(e);d<0&&(r=-r,a=-a,l=-l,c=-c,d=-d);let h=1-t;if(d<.9995){const f=Math.acos(d),m=Math.sin(f);h=Math.sin(h*f)/m,t=Math.sin(t*f)/m,this._x=this._x*h+r*t,this._y=this._y*h+a*t,this._z=this._z*h+l*t,this._w=this._w*h+c*t,this._onChangeCallback()}else this._x=this._x*h+r*t,this._y=this._y*h+a*t,this._z=this._z*h+l*t,this._w=this._w*h+c*t,this.normalize();return this}slerpQuaternions(e,t,r){return this.copy(e).slerp(t,r)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),r=Math.random(),a=Math.sqrt(1-r),l=Math.sqrt(r);return this.set(a*Math.sin(e),a*Math.cos(e),l*Math.sin(t),l*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}const Vm=class Vm{constructor(e=0,t=0,r=0){this.x=e,this.y=t,this.z=r}set(e,t,r){return r===void 0&&(r=this.z),this.x=e,this.y=t,this.z=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Kv.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Kv.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,r=this.y,a=this.z,l=e.elements;return this.x=l[0]*t+l[3]*r+l[6]*a,this.y=l[1]*t+l[4]*r+l[7]*a,this.z=l[2]*t+l[5]*r+l[8]*a,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,r=this.y,a=this.z,l=e.elements,c=1/(l[3]*t+l[7]*r+l[11]*a+l[15]);return this.x=(l[0]*t+l[4]*r+l[8]*a+l[12])*c,this.y=(l[1]*t+l[5]*r+l[9]*a+l[13])*c,this.z=(l[2]*t+l[6]*r+l[10]*a+l[14])*c,this}applyQuaternion(e){const t=this.x,r=this.y,a=this.z,l=e.x,c=e.y,d=e.z,h=e.w,f=2*(c*a-d*r),m=2*(d*t-l*a),g=2*(l*r-c*t);return this.x=t+h*f+c*g-d*m,this.y=r+h*m+d*f-l*g,this.z=a+h*g+l*m-c*f,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,r=this.y,a=this.z,l=e.elements;return this.x=l[0]*t+l[4]*r+l[8]*a,this.y=l[1]*t+l[5]*r+l[9]*a,this.z=l[2]*t+l[6]*r+l[10]*a,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Mt(this.x,e.x,t.x),this.y=Mt(this.y,e.y,t.y),this.z=Mt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Mt(this.x,e,t),this.y=Mt(this.y,e,t),this.z=Mt(this.z,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(Mt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this.z=e.z+(t.z-e.z)*r,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const r=e.x,a=e.y,l=e.z,c=t.x,d=t.y,h=t.z;return this.x=a*h-l*d,this.y=l*c-r*h,this.z=r*d-a*c,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const r=e.dot(this)/t;return this.copy(e).multiplyScalar(r)}projectOnPlane(e){return pf.copy(this).projectOnVector(e),this.sub(pf)}reflect(e){return this.sub(pf.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const r=this.dot(e)/t;return Math.acos(Mt(r,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,r=this.y-e.y,a=this.z-e.z;return t*t+r*r+a*a}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,r){const a=Math.sin(t)*e;return this.x=a*Math.sin(r),this.y=Math.cos(t)*e,this.z=a*Math.cos(r),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,r){return this.x=e*Math.sin(t),this.y=r,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),r=this.setFromMatrixColumn(e,1).length(),a=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=r,this.z=a,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,r=Math.sqrt(1-t*t);return this.x=r*Math.cos(e),this.y=t,this.z=r*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};Vm.prototype.isVector3=!0;let ee=Vm;const pf=new ee,Kv=new Fs,Gm=class Gm{constructor(e,t,r,a,l,c,d,h,f){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,r,a,l,c,d,h,f)}set(e,t,r,a,l,c,d,h,f){const m=this.elements;return m[0]=e,m[1]=a,m[2]=d,m[3]=t,m[4]=l,m[5]=h,m[6]=r,m[7]=c,m[8]=f,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,r=e.elements;return t[0]=r[0],t[1]=r[1],t[2]=r[2],t[3]=r[3],t[4]=r[4],t[5]=r[5],t[6]=r[6],t[7]=r[7],t[8]=r[8],this}extractBasis(e,t,r){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),r.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const r=e.elements,a=t.elements,l=this.elements,c=r[0],d=r[3],h=r[6],f=r[1],m=r[4],g=r[7],v=r[2],S=r[5],E=r[8],w=a[0],x=a[3],y=a[6],N=a[1],P=a[4],C=a[7],D=a[2],L=a[5],F=a[8];return l[0]=c*w+d*N+h*D,l[3]=c*x+d*P+h*L,l[6]=c*y+d*C+h*F,l[1]=f*w+m*N+g*D,l[4]=f*x+m*P+g*L,l[7]=f*y+m*C+g*F,l[2]=v*w+S*N+E*D,l[5]=v*x+S*P+E*L,l[8]=v*y+S*C+E*F,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],m=e[8];return t*c*m-t*d*f-r*l*m+r*d*h+a*l*f-a*c*h}invert(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],m=e[8],g=m*c-d*f,v=d*h-m*l,S=f*l-c*h,E=t*g+r*v+a*S;if(E===0)return this.set(0,0,0,0,0,0,0,0,0);const w=1/E;return e[0]=g*w,e[1]=(a*f-m*r)*w,e[2]=(d*r-a*c)*w,e[3]=v*w,e[4]=(m*t-a*h)*w,e[5]=(a*l-d*t)*w,e[6]=S*w,e[7]=(r*h-f*t)*w,e[8]=(c*t-r*l)*w,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,r,a,l,c,d){const h=Math.cos(l),f=Math.sin(l);return this.set(r*h,r*f,-r*(h*c+f*d)+c+e,-a*f,a*h,-a*(-f*c+h*d)+d+t,0,0,1),this}scale(e,t){return go("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(mf.makeScale(e,t)),this}rotate(e){return go("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(mf.makeRotation(-e)),this}translate(e,t){return go("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(mf.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,-r,0,r,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,r=e.elements;for(let a=0;a<9;a++)if(t[a]!==r[a])return!1;return!0}fromArray(e,t=0){for(let r=0;r<9;r++)this.elements[r]=e[r+t];return this}toArray(e=[],t=0){const r=this.elements;return e[t]=r[0],e[t+1]=r[1],e[t+2]=r[2],e[t+3]=r[3],e[t+4]=r[4],e[t+5]=r[5],e[t+6]=r[6],e[t+7]=r[7],e[t+8]=r[8],e}clone(){return new this.constructor().fromArray(this.elements)}};Gm.prototype.isMatrix3=!0;let pt=Gm;const mf=new pt,Qv=new pt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Zv=new pt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function nT(){const i={enabled:!0,workingColorSpace:sd,spaces:{},convert:function(a,l,c){return this.enabled===!1||l===c||!l||!c||(this.spaces[l].transfer===Bt&&(a.r=Wr(a.r),a.g=Wr(a.g),a.b=Wr(a.b)),this.spaces[l].primaries!==this.spaces[c].primaries&&(a.applyMatrix3(this.spaces[l].toXYZ),a.applyMatrix3(this.spaces[c].fromXYZ)),this.spaces[c].transfer===Bt&&(a.r=vo(a.r),a.g=vo(a.g),a.b=vo(a.b))),a},workingToColorSpace:function(a,l){return this.convert(a,this.workingColorSpace,l)},colorSpaceToWorking:function(a,l){return this.convert(a,l,this.workingColorSpace)},getPrimaries:function(a){return this.spaces[a].primaries},getTransfer:function(a){return a===Es?ad:this.spaces[a].transfer},getToneMappingMode:function(a){return this.spaces[a].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(a,l=this.workingColorSpace){return a.fromArray(this.spaces[l].luminanceCoefficients)},define:function(a){Object.assign(this.spaces,a)},_getMatrix:function(a,l,c){return a.copy(this.spaces[l].toXYZ).multiply(this.spaces[c].fromXYZ)},_getDrawingBufferColorSpace:function(a){return this.spaces[a].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(a=this.workingColorSpace){return this.spaces[a].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(a,l){return go("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(a,l)},toWorkingColorSpace:function(a,l){return go("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(a,l)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],r=[.3127,.329];return i.define({[sd]:{primaries:e,whitePoint:r,transfer:ad,toXYZ:Qv,fromXYZ:Zv,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Zn},outputColorSpaceConfig:{drawingBufferColorSpace:Zn}},[Zn]:{primaries:e,whitePoint:r,transfer:Bt,toXYZ:Qv,fromXYZ:Zv,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Zn}}}),i}const bt=nT();function Wr(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function vo(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Ya;class iT{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let r;if(e instanceof HTMLCanvasElement)r=e;else{Ya===void 0&&(Ya=$l("canvas")),Ya.width=e.width,Ya.height=e.height;const a=Ya.getContext("2d");e instanceof ImageData?a.putImageData(e,0,0):a.drawImage(e,0,0,e.width,e.height),r=Ya}return r.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=$l("canvas");t.width=e.width,t.height=e.height;const r=t.getContext("2d");r.drawImage(e,0,0,e.width,e.height);const a=r.getImageData(0,0,e.width,e.height),l=a.data;for(let c=0;c<l.length;c++)l[c]=Wr(l[c]/255)*255;return r.putImageData(a,0,0),t}else if(e.data){const t=e.data.slice(0);for(let r=0;r<t.length;r++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[r]=Math.floor(Wr(t[r]/255)*255):t[r]=Wr(t[r]);return{data:t,width:e.width,height:e.height}}else return lt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let rT=0;class Fm{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:rT++}),this.uuid=tc(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const r={uuid:this.uuid,url:""},a=this.data;if(a!==null){let l;if(Array.isArray(a)){l=[];for(let c=0,d=a.length;c<d;c++)a[c].isDataTexture?l.push(gf(a[c].image)):l.push(gf(a[c]))}else l=gf(a);r.url=l}return t||(e.images[this.uuid]=r),r}}function gf(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?iT.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(lt("Texture: Unable to serialize Texture."),{})}let sT=0;const vf=new ee;class jn extends Os{constructor(e=jn.DEFAULT_IMAGE,t=jn.DEFAULT_MAPPING,r=Vr,a=Vr,l=Wn,c=ua,d=Ki,h=Si,f=jn.DEFAULT_ANISOTROPY,m=Es){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:sT++}),this.uuid=tc(),this.name="",this.source=new Fm(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=r,this.wrapT=a,this.magFilter=l,this.minFilter=c,this.anisotropy=f,this.format=d,this.internalFormat=null,this.type=h,this.offset=new dt(0,0),this.repeat=new dt(1,1),this.center=new dt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new pt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=m,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(vf).x}get height(){return this.source.getSize(vf).y}get depth(){return this.source.getSize(vf).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const r=e[t];if(r===void 0){lt(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){lt(`Texture.setValues(): property '${t}' does not exist.`);continue}a&&r&&a.isVector2&&r.isVector2||a&&r&&a.isVector3&&r.isVector3||a&&r&&a.isMatrix3&&r.isMatrix3?a.copy(r):this[t]=r}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const r={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(r.userData=this.userData),t||(e.textures[this.uuid]=r),r}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==ny)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Sp:e.x=e.x-Math.floor(e.x);break;case Vr:e.x=e.x<0?0:1;break;case Mp:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Sp:e.y=e.y-Math.floor(e.y);break;case Vr:e.y=e.y<0?0:1;break;case Mp:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}jn.DEFAULT_IMAGE=null;jn.DEFAULT_MAPPING=ny;jn.DEFAULT_ANISOTROPY=1;const Wm=class Wm{constructor(e=0,t=0,r=0,a=1){this.x=e,this.y=t,this.z=r,this.w=a}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,r,a){return this.x=e,this.y=t,this.z=r,this.w=a,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,r=this.y,a=this.z,l=this.w,c=e.elements;return this.x=c[0]*t+c[4]*r+c[8]*a+c[12]*l,this.y=c[1]*t+c[5]*r+c[9]*a+c[13]*l,this.z=c[2]*t+c[6]*r+c[10]*a+c[14]*l,this.w=c[3]*t+c[7]*r+c[11]*a+c[15]*l,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,r,a,l;const h=e.elements,f=h[0],m=h[4],g=h[8],v=h[1],S=h[5],E=h[9],w=h[2],x=h[6],y=h[10];if(Math.abs(m-v)<.01&&Math.abs(g-w)<.01&&Math.abs(E-x)<.01){if(Math.abs(m+v)<.1&&Math.abs(g+w)<.1&&Math.abs(E+x)<.1&&Math.abs(f+S+y-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const P=(f+1)/2,C=(S+1)/2,D=(y+1)/2,L=(m+v)/4,F=(g+w)/4,T=(E+x)/4;return P>C&&P>D?P<.01?(r=0,a=.707106781,l=.707106781):(r=Math.sqrt(P),a=L/r,l=F/r):C>D?C<.01?(r=.707106781,a=0,l=.707106781):(a=Math.sqrt(C),r=L/a,l=T/a):D<.01?(r=.707106781,a=.707106781,l=0):(l=Math.sqrt(D),r=F/l,a=T/l),this.set(r,a,l,t),this}let N=Math.sqrt((x-E)*(x-E)+(g-w)*(g-w)+(v-m)*(v-m));return Math.abs(N)<.001&&(N=1),this.x=(x-E)/N,this.y=(g-w)/N,this.z=(v-m)/N,this.w=Math.acos((f+S+y-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Mt(this.x,e.x,t.x),this.y=Mt(this.y,e.y,t.y),this.z=Mt(this.z,e.z,t.z),this.w=Mt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Mt(this.x,e,t),this.y=Mt(this.y,e,t),this.z=Mt(this.z,e,t),this.w=Mt(this.w,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(Mt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this.z=e.z+(t.z-e.z)*r,this.w=e.w+(t.w-e.w)*r,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};Wm.prototype.isVector4=!0;let ln=Wm;class aT extends Os{constructor(e=1,t=1,r={}){super(),r=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Wn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},r),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=r.depth,this.scissor=new ln(0,0,e,t),this.scissorTest=!1,this.viewport=new ln(0,0,e,t),this.textures=[];const a={width:e,height:t,depth:r.depth},l=new jn(a),c=r.count;for(let d=0;d<c;d++)this.textures[d]=l.clone(),this.textures[d].isRenderTargetTexture=!0,this.textures[d].renderTarget=this;this._setTextureOptions(r),this.depthBuffer=r.depthBuffer,this.stencilBuffer=r.stencilBuffer,this.resolveDepthBuffer=r.resolveDepthBuffer,this.resolveStencilBuffer=r.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=r.depthTexture,this.samples=r.samples,this.multiview=r.multiview,this.useArrayDepthTexture=r.useArrayDepthTexture}_setTextureOptions(e={}){const t={minFilter:Wn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let r=0;r<this.textures.length;r++)this.textures[r].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,r=1){if(this.width!==e||this.height!==t||this.depth!==r){this.width=e,this.height=t,this.depth=r;for(let a=0,l=this.textures.length;a<l;a++)this.textures[a].image.width=e,this.textures[a].image.height=t,this.textures[a].image.depth=r,this.textures[a].isData3DTexture!==!0&&(this.textures[a].isArrayTexture=this.textures[a].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,r=e.textures.length;t<r;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const a=Object.assign({},e.textures[t].image);this.textures[t].source=new Fm(a)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class gr extends aT{constructor(e=1,t=1,r={}){super(e,t,r),this.isWebGLRenderTarget=!0}}class dy extends jn{constructor(e=null,t=1,r=1,a=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:r,depth:a},this.magFilter=Un,this.minFilter=Un,this.wrapR=Vr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class oT extends jn{constructor(e=null,t=1,r=1,a=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:r,depth:a},this.magFilter=Un,this.minFilter=Un,this.wrapR=Vr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const ud=class ud{constructor(e,t,r,a,l,c,d,h,f,m,g,v,S,E,w,x){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,r,a,l,c,d,h,f,m,g,v,S,E,w,x)}set(e,t,r,a,l,c,d,h,f,m,g,v,S,E,w,x){const y=this.elements;return y[0]=e,y[4]=t,y[8]=r,y[12]=a,y[1]=l,y[5]=c,y[9]=d,y[13]=h,y[2]=f,y[6]=m,y[10]=g,y[14]=v,y[3]=S,y[7]=E,y[11]=w,y[15]=x,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ud().fromArray(this.elements)}copy(e){const t=this.elements,r=e.elements;return t[0]=r[0],t[1]=r[1],t[2]=r[2],t[3]=r[3],t[4]=r[4],t[5]=r[5],t[6]=r[6],t[7]=r[7],t[8]=r[8],t[9]=r[9],t[10]=r[10],t[11]=r[11],t[12]=r[12],t[13]=r[13],t[14]=r[14],t[15]=r[15],this}copyPosition(e){const t=this.elements,r=e.elements;return t[12]=r[12],t[13]=r[13],t[14]=r[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,r){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),r.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),r.setFromMatrixColumn(this,2),this)}makeBasis(e,t,r){return this.set(e.x,t.x,r.x,0,e.y,t.y,r.y,0,e.z,t.z,r.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();const t=this.elements,r=e.elements,a=1/Ka.setFromMatrixColumn(e,0).length(),l=1/Ka.setFromMatrixColumn(e,1).length(),c=1/Ka.setFromMatrixColumn(e,2).length();return t[0]=r[0]*a,t[1]=r[1]*a,t[2]=r[2]*a,t[3]=0,t[4]=r[4]*l,t[5]=r[5]*l,t[6]=r[6]*l,t[7]=0,t[8]=r[8]*c,t[9]=r[9]*c,t[10]=r[10]*c,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,r=e.x,a=e.y,l=e.z,c=Math.cos(r),d=Math.sin(r),h=Math.cos(a),f=Math.sin(a),m=Math.cos(l),g=Math.sin(l);if(e.order==="XYZ"){const v=c*m,S=c*g,E=d*m,w=d*g;t[0]=h*m,t[4]=-h*g,t[8]=f,t[1]=S+E*f,t[5]=v-w*f,t[9]=-d*h,t[2]=w-v*f,t[6]=E+S*f,t[10]=c*h}else if(e.order==="YXZ"){const v=h*m,S=h*g,E=f*m,w=f*g;t[0]=v+w*d,t[4]=E*d-S,t[8]=c*f,t[1]=c*g,t[5]=c*m,t[9]=-d,t[2]=S*d-E,t[6]=w+v*d,t[10]=c*h}else if(e.order==="ZXY"){const v=h*m,S=h*g,E=f*m,w=f*g;t[0]=v-w*d,t[4]=-c*g,t[8]=E+S*d,t[1]=S+E*d,t[5]=c*m,t[9]=w-v*d,t[2]=-c*f,t[6]=d,t[10]=c*h}else if(e.order==="ZYX"){const v=c*m,S=c*g,E=d*m,w=d*g;t[0]=h*m,t[4]=E*f-S,t[8]=v*f+w,t[1]=h*g,t[5]=w*f+v,t[9]=S*f-E,t[2]=-f,t[6]=d*h,t[10]=c*h}else if(e.order==="YZX"){const v=c*h,S=c*f,E=d*h,w=d*f;t[0]=h*m,t[4]=w-v*g,t[8]=E*g+S,t[1]=g,t[5]=c*m,t[9]=-d*m,t[2]=-f*m,t[6]=S*g+E,t[10]=v-w*g}else if(e.order==="XZY"){const v=c*h,S=c*f,E=d*h,w=d*f;t[0]=h*m,t[4]=-g,t[8]=f*m,t[1]=v*g+w,t[5]=c*m,t[9]=S*g-E,t[2]=E*g-S,t[6]=d*m,t[10]=w*g+v}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(lT,e,cT)}lookAt(e,t,r){const a=this.elements;return vi.subVectors(e,t),vi.lengthSq()===0&&(vi.z=1),vi.normalize(),ms.crossVectors(r,vi),ms.lengthSq()===0&&(Math.abs(r.z)===1?vi.x+=1e-4:vi.z+=1e-4,vi.normalize(),ms.crossVectors(r,vi)),ms.normalize(),pu.crossVectors(vi,ms),a[0]=ms.x,a[4]=pu.x,a[8]=vi.x,a[1]=ms.y,a[5]=pu.y,a[9]=vi.y,a[2]=ms.z,a[6]=pu.z,a[10]=vi.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const r=e.elements,a=t.elements,l=this.elements,c=r[0],d=r[4],h=r[8],f=r[12],m=r[1],g=r[5],v=r[9],S=r[13],E=r[2],w=r[6],x=r[10],y=r[14],N=r[3],P=r[7],C=r[11],D=r[15],L=a[0],F=a[4],T=a[8],I=a[12],G=a[1],H=a[5],K=a[9],re=a[13],fe=a[2],O=a[6],ce=a[10],Z=a[14],q=a[3],ue=a[7],he=a[11],k=a[15];return l[0]=c*L+d*G+h*fe+f*q,l[4]=c*F+d*H+h*O+f*ue,l[8]=c*T+d*K+h*ce+f*he,l[12]=c*I+d*re+h*Z+f*k,l[1]=m*L+g*G+v*fe+S*q,l[5]=m*F+g*H+v*O+S*ue,l[9]=m*T+g*K+v*ce+S*he,l[13]=m*I+g*re+v*Z+S*k,l[2]=E*L+w*G+x*fe+y*q,l[6]=E*F+w*H+x*O+y*ue,l[10]=E*T+w*K+x*ce+y*he,l[14]=E*I+w*re+x*Z+y*k,l[3]=N*L+P*G+C*fe+D*q,l[7]=N*F+P*H+C*O+D*ue,l[11]=N*T+P*K+C*ce+D*he,l[15]=N*I+P*re+C*Z+D*k,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],r=e[4],a=e[8],l=e[12],c=e[1],d=e[5],h=e[9],f=e[13],m=e[2],g=e[6],v=e[10],S=e[14],E=e[3],w=e[7],x=e[11],y=e[15],N=h*S-f*v,P=d*S-f*g,C=d*v-h*g,D=c*S-f*m,L=c*v-h*m,F=c*g-d*m;return t*(w*N-x*P+y*C)-r*(E*N-x*D+y*L)+a*(E*P-w*D+y*F)-l*(E*C-w*L+x*F)}determinantAffine(){const e=this.elements,t=e[0],r=e[4],a=e[8],l=e[1],c=e[5],d=e[9],h=e[2],f=e[6],m=e[10];return t*(c*m-d*f)-r*(l*m-d*h)+a*(l*f-c*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,r){const a=this.elements;return e.isVector3?(a[12]=e.x,a[13]=e.y,a[14]=e.z):(a[12]=e,a[13]=t,a[14]=r),this}invert(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],m=e[8],g=e[9],v=e[10],S=e[11],E=e[12],w=e[13],x=e[14],y=e[15],N=t*d-r*c,P=t*h-a*c,C=t*f-l*c,D=r*h-a*d,L=r*f-l*d,F=a*f-l*h,T=m*w-g*E,I=m*x-v*E,G=m*y-S*E,H=g*x-v*w,K=g*y-S*w,re=v*y-S*x,fe=N*re-P*K+C*H+D*G-L*I+F*T;if(fe===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const O=1/fe;return e[0]=(d*re-h*K+f*H)*O,e[1]=(a*K-r*re-l*H)*O,e[2]=(w*F-x*L+y*D)*O,e[3]=(v*L-g*F-S*D)*O,e[4]=(h*G-c*re-f*I)*O,e[5]=(t*re-a*G+l*I)*O,e[6]=(x*C-E*F-y*P)*O,e[7]=(m*F-v*C+S*P)*O,e[8]=(c*K-d*G+f*T)*O,e[9]=(r*G-t*K-l*T)*O,e[10]=(E*L-w*C+y*N)*O,e[11]=(g*C-m*L-S*N)*O,e[12]=(d*I-c*H-h*T)*O,e[13]=(t*H-r*I+a*T)*O,e[14]=(w*P-E*D-x*N)*O,e[15]=(m*D-g*P+v*N)*O,this}scale(e){const t=this.elements,r=e.x,a=e.y,l=e.z;return t[0]*=r,t[4]*=a,t[8]*=l,t[1]*=r,t[5]*=a,t[9]*=l,t[2]*=r,t[6]*=a,t[10]*=l,t[3]*=r,t[7]*=a,t[11]*=l,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],r=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],a=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,r,a))}makeTranslation(e,t,r){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,r,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),r=Math.sin(e);return this.set(1,0,0,0,0,t,-r,0,0,r,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,0,r,0,0,1,0,0,-r,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,-r,0,0,r,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const r=Math.cos(t),a=Math.sin(t),l=1-r,c=e.x,d=e.y,h=e.z,f=l*c,m=l*d;return this.set(f*c+r,f*d-a*h,f*h+a*d,0,f*d+a*h,m*d+r,m*h-a*c,0,f*h-a*d,m*h+a*c,l*h*h+r,0,0,0,0,1),this}makeScale(e,t,r){return this.set(e,0,0,0,0,t,0,0,0,0,r,0,0,0,0,1),this}makeShear(e,t,r,a,l,c){return this.set(1,r,l,0,e,1,c,0,t,a,1,0,0,0,0,1),this}compose(e,t,r){const a=this.elements,l=t._x,c=t._y,d=t._z,h=t._w,f=l+l,m=c+c,g=d+d,v=l*f,S=l*m,E=l*g,w=c*m,x=c*g,y=d*g,N=h*f,P=h*m,C=h*g,D=r.x,L=r.y,F=r.z;return a[0]=(1-(w+y))*D,a[1]=(S+C)*D,a[2]=(E-P)*D,a[3]=0,a[4]=(S-C)*L,a[5]=(1-(v+y))*L,a[6]=(x+N)*L,a[7]=0,a[8]=(E+P)*F,a[9]=(x-N)*F,a[10]=(1-(v+w))*F,a[11]=0,a[12]=e.x,a[13]=e.y,a[14]=e.z,a[15]=1,this}decompose(e,t,r){const a=this.elements;e.x=a[12],e.y=a[13],e.z=a[14];const l=this.determinantAffine();if(l===0)return r.set(1,1,1),t.identity(),this;let c=Ka.set(a[0],a[1],a[2]).length();const d=Ka.set(a[4],a[5],a[6]).length(),h=Ka.set(a[8],a[9],a[10]).length();l<0&&(c=-c),Wi.copy(this);const f=1/c,m=1/d,g=1/h;return Wi.elements[0]*=f,Wi.elements[1]*=f,Wi.elements[2]*=f,Wi.elements[4]*=m,Wi.elements[5]*=m,Wi.elements[6]*=m,Wi.elements[8]*=g,Wi.elements[9]*=g,Wi.elements[10]*=g,t.setFromRotationMatrix(Wi),r.x=c,r.y=d,r.z=h,this}makePerspective(e,t,r,a,l,c,d=pr,h=!1){const f=this.elements,m=2*l/(t-e),g=2*l/(r-a),v=(t+e)/(t-e),S=(r+a)/(r-a);let E,w;if(h)E=l/(c-l),w=c*l/(c-l);else if(d===pr)E=-(c+l)/(c-l),w=-2*c*l/(c-l);else if(d===Xl)E=-c/(c-l),w=-c*l/(c-l);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+d);return f[0]=m,f[4]=0,f[8]=v,f[12]=0,f[1]=0,f[5]=g,f[9]=S,f[13]=0,f[2]=0,f[6]=0,f[10]=E,f[14]=w,f[3]=0,f[7]=0,f[11]=-1,f[15]=0,this}makeOrthographic(e,t,r,a,l,c,d=pr,h=!1){const f=this.elements,m=2/(t-e),g=2/(r-a),v=-(t+e)/(t-e),S=-(r+a)/(r-a);let E,w;if(h)E=1/(c-l),w=c/(c-l);else if(d===pr)E=-2/(c-l),w=-(c+l)/(c-l);else if(d===Xl)E=-1/(c-l),w=-l/(c-l);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+d);return f[0]=m,f[4]=0,f[8]=0,f[12]=v,f[1]=0,f[5]=g,f[9]=0,f[13]=S,f[2]=0,f[6]=0,f[10]=E,f[14]=w,f[3]=0,f[7]=0,f[11]=0,f[15]=1,this}equals(e){const t=this.elements,r=e.elements;for(let a=0;a<16;a++)if(t[a]!==r[a])return!1;return!0}fromArray(e,t=0){for(let r=0;r<16;r++)this.elements[r]=e[r+t];return this}toArray(e=[],t=0){const r=this.elements;return e[t]=r[0],e[t+1]=r[1],e[t+2]=r[2],e[t+3]=r[3],e[t+4]=r[4],e[t+5]=r[5],e[t+6]=r[6],e[t+7]=r[7],e[t+8]=r[8],e[t+9]=r[9],e[t+10]=r[10],e[t+11]=r[11],e[t+12]=r[12],e[t+13]=r[13],e[t+14]=r[14],e[t+15]=r[15],e}};ud.prototype.isMatrix4=!0;let rn=ud;const Ka=new ee,Wi=new rn,lT=new ee(0,0,0),cT=new ee(1,1,1),ms=new ee,pu=new ee,vi=new ee,Jv=new rn,ex=new Fs;class Yr{constructor(e=0,t=0,r=0,a=Yr.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=r,this._order=a}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,r,a=this._order){return this._x=e,this._y=t,this._z=r,this._order=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,r=!0){const a=e.elements,l=a[0],c=a[4],d=a[8],h=a[1],f=a[5],m=a[9],g=a[2],v=a[6],S=a[10];switch(t){case"XYZ":this._y=Math.asin(Mt(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(-m,S),this._z=Math.atan2(-c,l)):(this._x=Math.atan2(v,f),this._z=0);break;case"YXZ":this._x=Math.asin(-Mt(m,-1,1)),Math.abs(m)<.9999999?(this._y=Math.atan2(d,S),this._z=Math.atan2(h,f)):(this._y=Math.atan2(-g,l),this._z=0);break;case"ZXY":this._x=Math.asin(Mt(v,-1,1)),Math.abs(v)<.9999999?(this._y=Math.atan2(-g,S),this._z=Math.atan2(-c,f)):(this._y=0,this._z=Math.atan2(h,l));break;case"ZYX":this._y=Math.asin(-Mt(g,-1,1)),Math.abs(g)<.9999999?(this._x=Math.atan2(v,S),this._z=Math.atan2(h,l)):(this._x=0,this._z=Math.atan2(-c,f));break;case"YZX":this._z=Math.asin(Mt(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(-m,f),this._y=Math.atan2(-g,l)):(this._x=0,this._y=Math.atan2(d,S));break;case"XZY":this._z=Math.asin(-Mt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(v,f),this._y=Math.atan2(d,l)):(this._x=Math.atan2(-m,S),this._y=0);break;default:lt("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,r===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,r){return Jv.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Jv,t,r)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return ex.setFromEuler(this),this.setFromQuaternion(ex,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Yr.DEFAULT_ORDER="XYZ";class hy{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let uT=0;const tx=new ee,Qa=new Fs,Pr=new rn,mu=new ee,Cl=new ee,dT=new ee,hT=new Fs,nx=new ee(1,0,0),ix=new ee(0,1,0),rx=new ee(0,0,1),sx={type:"added"},fT={type:"removed"},Za={type:"childadded",child:null},xf={type:"childremoved",child:null};class En extends Os{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:uT++}),this.uuid=tc(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=En.DEFAULT_UP.clone();const e=new ee,t=new Yr,r=new Fs,a=new ee(1,1,1);function l(){r.setFromEuler(t,!1)}function c(){t.setFromQuaternion(r,void 0,!1)}t._onChange(l),r._onChange(c),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:a},modelViewMatrix:{value:new rn},normalMatrix:{value:new pt}}),this.matrix=new rn,this.matrixWorld=new rn,this.matrixAutoUpdate=En.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=En.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new hy,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Qa.setFromAxisAngle(e,t),this.quaternion.multiply(Qa),this}rotateOnWorldAxis(e,t){return Qa.setFromAxisAngle(e,t),this.quaternion.premultiply(Qa),this}rotateX(e){return this.rotateOnAxis(nx,e)}rotateY(e){return this.rotateOnAxis(ix,e)}rotateZ(e){return this.rotateOnAxis(rx,e)}translateOnAxis(e,t){return tx.copy(e).applyQuaternion(this.quaternion),this.position.add(tx.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(nx,e)}translateY(e){return this.translateOnAxis(ix,e)}translateZ(e){return this.translateOnAxis(rx,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Pr.copy(this.matrixWorld).invert())}lookAt(e,t,r){e.isVector3?mu.copy(e):mu.set(e,t,r);const a=this.parent;this.updateWorldMatrix(!0,!1),Cl.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Pr.lookAt(Cl,mu,this.up):Pr.lookAt(mu,Cl,this.up),this.quaternion.setFromRotationMatrix(Pr),a&&(Pr.extractRotation(a.matrixWorld),Qa.setFromRotationMatrix(Pr),this.quaternion.premultiply(Qa.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Nt("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(sx),Za.child=e,this.dispatchEvent(Za),Za.child=null):Nt("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let r=0;r<arguments.length;r++)this.remove(arguments[r]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(fT),xf.child=e,this.dispatchEvent(xf),xf.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Pr.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Pr.multiply(e.parent.matrixWorld)),e.applyMatrix4(Pr),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(sx),Za.child=e,this.dispatchEvent(Za),Za.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let r=0,a=this.children.length;r<a;r++){const c=this.children[r].getObjectByProperty(e,t);if(c!==void 0)return c}}getObjectsByProperty(e,t,r=[]){this[e]===t&&r.push(this);const a=this.children;for(let l=0,c=a.length;l<c;l++)a[l].getObjectsByProperty(e,t,r);return r}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Cl,e,dT),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Cl,hT,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,r=e.y,a=e.z,l=this.matrix.elements;l[12]+=t-l[0]*t-l[4]*r-l[8]*a,l[13]+=r-l[1]*t-l[5]*r-l[9]*a,l[14]+=a-l[2]*t-l[6]*r-l[10]*a}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].updateMatrixWorld(e)}updateWorldMatrix(e,t,r=!1){const a=this.parent;if(e===!0&&a!==null&&a.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||r)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,r=!0),t===!0){const l=this.children;for(let c=0,d=l.length;c<d;c++)l[c].updateWorldMatrix(!1,!0,r)}}toJSON(e){const t=e===void 0||typeof e=="string",r={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},r.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const a={};a.uuid=this.uuid,a.type=this.type,this.name!==""&&(a.name=this.name),this.castShadow===!0&&(a.castShadow=!0),this.receiveShadow===!0&&(a.receiveShadow=!0),this.visible===!1&&(a.visible=!1),this.frustumCulled===!1&&(a.frustumCulled=!1),this.renderOrder!==0&&(a.renderOrder=this.renderOrder),this.static!==!1&&(a.static=this.static),Object.keys(this.userData).length>0&&(a.userData=this.userData),a.layers=this.layers.mask,a.matrix=this.matrix.toArray(),a.up=this.up.toArray(),this.pivot!==null&&(a.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(a.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(a.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(a.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(a.type="InstancedMesh",a.count=this.count,a.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(a.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(a.type="BatchedMesh",a.perObjectFrustumCulled=this.perObjectFrustumCulled,a.sortObjects=this.sortObjects,a.drawRanges=this._drawRanges,a.reservedRanges=this._reservedRanges,a.geometryInfo=this._geometryInfo.map(d=>({...d,boundingBox:d.boundingBox?d.boundingBox.toJSON():void 0,boundingSphere:d.boundingSphere?d.boundingSphere.toJSON():void 0})),a.instanceInfo=this._instanceInfo.map(d=>({...d})),a.availableInstanceIds=this._availableInstanceIds.slice(),a.availableGeometryIds=this._availableGeometryIds.slice(),a.nextIndexStart=this._nextIndexStart,a.nextVertexStart=this._nextVertexStart,a.geometryCount=this._geometryCount,a.maxInstanceCount=this._maxInstanceCount,a.maxVertexCount=this._maxVertexCount,a.maxIndexCount=this._maxIndexCount,a.geometryInitialized=this._geometryInitialized,a.matricesTexture=this._matricesTexture.toJSON(e),a.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(a.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(a.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(a.boundingBox=this.boundingBox.toJSON()));function l(d,h){return d[h.uuid]===void 0&&(d[h.uuid]=h.toJSON(e)),h.uuid}if(this.isScene)this.background&&(this.background.isColor?a.background=this.background.toJSON():this.background.isTexture&&(a.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(a.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){a.geometry=l(e.geometries,this.geometry);const d=this.geometry.parameters;if(d!==void 0&&d.shapes!==void 0){const h=d.shapes;if(Array.isArray(h))for(let f=0,m=h.length;f<m;f++){const g=h[f];l(e.shapes,g)}else l(e.shapes,h)}}if(this.isSkinnedMesh&&(a.bindMode=this.bindMode,a.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(l(e.skeletons,this.skeleton),a.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const d=[];for(let h=0,f=this.material.length;h<f;h++)d.push(l(e.materials,this.material[h]));a.material=d}else a.material=l(e.materials,this.material);if(this.children.length>0){a.children=[];for(let d=0;d<this.children.length;d++)a.children.push(this.children[d].toJSON(e).object)}if(this.animations.length>0){a.animations=[];for(let d=0;d<this.animations.length;d++){const h=this.animations[d];a.animations.push(l(e.animations,h))}}if(t){const d=c(e.geometries),h=c(e.materials),f=c(e.textures),m=c(e.images),g=c(e.shapes),v=c(e.skeletons),S=c(e.animations),E=c(e.nodes);d.length>0&&(r.geometries=d),h.length>0&&(r.materials=h),f.length>0&&(r.textures=f),m.length>0&&(r.images=m),g.length>0&&(r.shapes=g),v.length>0&&(r.skeletons=v),S.length>0&&(r.animations=S),E.length>0&&(r.nodes=E)}return r.object=a,r;function c(d){const h=[];for(const f in d){const m=d[f];delete m.metadata,h.push(m)}return h}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let r=0;r<e.children.length;r++){const a=e.children[r];this.add(a.clone())}return this}}En.DEFAULT_UP=new ee(0,1,0);En.DEFAULT_MATRIX_AUTO_UPDATE=!0;En.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class Fl extends En{constructor(){super(),this.isGroup=!0,this.type="Group"}}const pT={type:"move"};class _f{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Fl,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Fl,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new ee,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new ee),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Fl,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new ee,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new ee,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const r of e.hand.values())this._getHandJoint(t,r)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,r){let a=null,l=null,c=null;const d=this._targetRay,h=this._grip,f=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(f&&e.hand){c=!0;for(const w of e.hand.values()){const x=t.getJointPose(w,r),y=this._getHandJoint(f,w);x!==null&&(y.matrix.fromArray(x.transform.matrix),y.matrix.decompose(y.position,y.rotation,y.scale),y.matrixWorldNeedsUpdate=!0,y.jointRadius=x.radius),y.visible=x!==null}const m=f.joints["index-finger-tip"],g=f.joints["thumb-tip"],v=m.position.distanceTo(g.position),S=.02,E=.005;f.inputState.pinching&&v>S+E?(f.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!f.inputState.pinching&&v<=S-E&&(f.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else h!==null&&e.gripSpace&&(l=t.getPose(e.gripSpace,r),l!==null&&(h.matrix.fromArray(l.transform.matrix),h.matrix.decompose(h.position,h.rotation,h.scale),h.matrixWorldNeedsUpdate=!0,l.linearVelocity?(h.hasLinearVelocity=!0,h.linearVelocity.copy(l.linearVelocity)):h.hasLinearVelocity=!1,l.angularVelocity?(h.hasAngularVelocity=!0,h.angularVelocity.copy(l.angularVelocity)):h.hasAngularVelocity=!1,h.eventsEnabled&&h.dispatchEvent({type:"gripUpdated",data:e,target:this})));d!==null&&(a=t.getPose(e.targetRaySpace,r),a===null&&l!==null&&(a=l),a!==null&&(d.matrix.fromArray(a.transform.matrix),d.matrix.decompose(d.position,d.rotation,d.scale),d.matrixWorldNeedsUpdate=!0,a.linearVelocity?(d.hasLinearVelocity=!0,d.linearVelocity.copy(a.linearVelocity)):d.hasLinearVelocity=!1,a.angularVelocity?(d.hasAngularVelocity=!0,d.angularVelocity.copy(a.angularVelocity)):d.hasAngularVelocity=!1,this.dispatchEvent(pT)))}return d!==null&&(d.visible=a!==null),h!==null&&(h.visible=l!==null),f!==null&&(f.visible=c!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const r=new Fl;r.matrixAutoUpdate=!1,r.visible=!1,e.joints[t.jointName]=r,e.add(r)}return e.joints[t.jointName]}}const fy={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},gs={h:0,s:0,l:0},gu={h:0,s:0,l:0};function yf(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class gt{constructor(e,t,r){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,r)}set(e,t,r){if(t===void 0&&r===void 0){const a=e;a&&a.isColor?this.copy(a):typeof a=="number"?this.setHex(a):typeof a=="string"&&this.setStyle(a)}else this.setRGB(e,t,r);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Zn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,bt.colorSpaceToWorking(this,t),this}setRGB(e,t,r,a=bt.workingColorSpace){return this.r=e,this.g=t,this.b=r,bt.colorSpaceToWorking(this,a),this}setHSL(e,t,r,a=bt.workingColorSpace){if(e=eT(e,1),t=Mt(t,0,1),r=Mt(r,0,1),t===0)this.r=this.g=this.b=r;else{const l=r<=.5?r*(1+t):r+t-r*t,c=2*r-l;this.r=yf(c,l,e+1/3),this.g=yf(c,l,e),this.b=yf(c,l,e-1/3)}return bt.colorSpaceToWorking(this,a),this}setStyle(e,t=Zn){function r(l){l!==void 0&&parseFloat(l)<1&&lt("Color: Alpha component of "+e+" will be ignored.")}let a;if(a=/^(\w+)\(([^\)]*)\)/.exec(e)){let l;const c=a[1],d=a[2];switch(c){case"rgb":case"rgba":if(l=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setRGB(Math.min(255,parseInt(l[1],10))/255,Math.min(255,parseInt(l[2],10))/255,Math.min(255,parseInt(l[3],10))/255,t);if(l=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setRGB(Math.min(100,parseInt(l[1],10))/100,Math.min(100,parseInt(l[2],10))/100,Math.min(100,parseInt(l[3],10))/100,t);break;case"hsl":case"hsla":if(l=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setHSL(parseFloat(l[1])/360,parseFloat(l[2])/100,parseFloat(l[3])/100,t);break;default:lt("Color: Unknown color model "+e)}}else if(a=/^\#([A-Fa-f\d]+)$/.exec(e)){const l=a[1],c=l.length;if(c===3)return this.setRGB(parseInt(l.charAt(0),16)/15,parseInt(l.charAt(1),16)/15,parseInt(l.charAt(2),16)/15,t);if(c===6)return this.setHex(parseInt(l,16),t);lt("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Zn){const r=fy[e.toLowerCase()];return r!==void 0?this.setHex(r,t):lt("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Wr(e.r),this.g=Wr(e.g),this.b=Wr(e.b),this}copyLinearToSRGB(e){return this.r=vo(e.r),this.g=vo(e.g),this.b=vo(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Zn){return bt.workingToColorSpace(Vn.copy(this),e),Math.round(Mt(Vn.r*255,0,255))*65536+Math.round(Mt(Vn.g*255,0,255))*256+Math.round(Mt(Vn.b*255,0,255))}getHexString(e=Zn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=bt.workingColorSpace){bt.workingToColorSpace(Vn.copy(this),t);const r=Vn.r,a=Vn.g,l=Vn.b,c=Math.max(r,a,l),d=Math.min(r,a,l);let h,f;const m=(d+c)/2;if(d===c)h=0,f=0;else{const g=c-d;switch(f=m<=.5?g/(c+d):g/(2-c-d),c){case r:h=(a-l)/g+(a<l?6:0);break;case a:h=(l-r)/g+2;break;case l:h=(r-a)/g+4;break}h/=6}return e.h=h,e.s=f,e.l=m,e}getRGB(e,t=bt.workingColorSpace){return bt.workingToColorSpace(Vn.copy(this),t),e.r=Vn.r,e.g=Vn.g,e.b=Vn.b,e}getStyle(e=Zn){bt.workingToColorSpace(Vn.copy(this),e);const t=Vn.r,r=Vn.g,a=Vn.b;return e!==Zn?`color(${e} ${t.toFixed(3)} ${r.toFixed(3)} ${a.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(r*255)},${Math.round(a*255)})`}offsetHSL(e,t,r){return this.getHSL(gs),this.setHSL(gs.h+e,gs.s+t,gs.l+r)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,r){return this.r=e.r+(t.r-e.r)*r,this.g=e.g+(t.g-e.g)*r,this.b=e.b+(t.b-e.b)*r,this}lerpHSL(e,t){this.getHSL(gs),e.getHSL(gu);const r=ff(gs.h,gu.h,t),a=ff(gs.s,gu.s,t),l=ff(gs.l,gu.l,t);return this.setHSL(r,a,l),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,r=this.g,a=this.b,l=e.elements;return this.r=l[0]*t+l[3]*r+l[6]*a,this.g=l[1]*t+l[4]*r+l[7]*a,this.b=l[2]*t+l[5]*r+l[8]*a,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Vn=new gt;gt.NAMES=fy;class mT extends En{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Yr,this.environmentIntensity=1,this.environmentRotation=new Yr,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const ji=new ee,Nr=new ee,Sf=new ee,Lr=new ee,Ja=new ee,eo=new ee,ax=new ee,Mf=new ee,Ef=new ee,wf=new ee,Tf=new ln,bf=new ln,Cf=new ln;class Yi{constructor(e=new ee,t=new ee,r=new ee){this.a=e,this.b=t,this.c=r}static getNormal(e,t,r,a){a.subVectors(r,t),ji.subVectors(e,t),a.cross(ji);const l=a.lengthSq();return l>0?a.multiplyScalar(1/Math.sqrt(l)):a.set(0,0,0)}static getBarycoord(e,t,r,a,l){ji.subVectors(a,t),Nr.subVectors(r,t),Sf.subVectors(e,t);const c=ji.dot(ji),d=ji.dot(Nr),h=ji.dot(Sf),f=Nr.dot(Nr),m=Nr.dot(Sf),g=c*f-d*d;if(g===0)return l.set(0,0,0),null;const v=1/g,S=(f*h-d*m)*v,E=(c*m-d*h)*v;return l.set(1-S-E,E,S)}static containsPoint(e,t,r,a){return this.getBarycoord(e,t,r,a,Lr)===null?!1:Lr.x>=0&&Lr.y>=0&&Lr.x+Lr.y<=1}static getInterpolation(e,t,r,a,l,c,d,h){return this.getBarycoord(e,t,r,a,Lr)===null?(h.x=0,h.y=0,"z"in h&&(h.z=0),"w"in h&&(h.w=0),null):(h.setScalar(0),h.addScaledVector(l,Lr.x),h.addScaledVector(c,Lr.y),h.addScaledVector(d,Lr.z),h)}static getInterpolatedAttribute(e,t,r,a,l,c){return Tf.setScalar(0),bf.setScalar(0),Cf.setScalar(0),Tf.fromBufferAttribute(e,t),bf.fromBufferAttribute(e,r),Cf.fromBufferAttribute(e,a),c.setScalar(0),c.addScaledVector(Tf,l.x),c.addScaledVector(bf,l.y),c.addScaledVector(Cf,l.z),c}static isFrontFacing(e,t,r,a){return ji.subVectors(r,t),Nr.subVectors(e,t),ji.cross(Nr).dot(a)<0}set(e,t,r){return this.a.copy(e),this.b.copy(t),this.c.copy(r),this}setFromPointsAndIndices(e,t,r,a){return this.a.copy(e[t]),this.b.copy(e[r]),this.c.copy(e[a]),this}setFromAttributeAndIndices(e,t,r,a){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,r),this.c.fromBufferAttribute(e,a),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return ji.subVectors(this.c,this.b),Nr.subVectors(this.a,this.b),ji.cross(Nr).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Yi.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Yi.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,r,a,l){return Yi.getInterpolation(e,this.a,this.b,this.c,t,r,a,l)}containsPoint(e){return Yi.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Yi.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const r=this.a,a=this.b,l=this.c;let c,d;Ja.subVectors(a,r),eo.subVectors(l,r),Mf.subVectors(e,r);const h=Ja.dot(Mf),f=eo.dot(Mf);if(h<=0&&f<=0)return t.copy(r);Ef.subVectors(e,a);const m=Ja.dot(Ef),g=eo.dot(Ef);if(m>=0&&g<=m)return t.copy(a);const v=h*g-m*f;if(v<=0&&h>=0&&m<=0)return c=h/(h-m),t.copy(r).addScaledVector(Ja,c);wf.subVectors(e,l);const S=Ja.dot(wf),E=eo.dot(wf);if(E>=0&&S<=E)return t.copy(l);const w=S*f-h*E;if(w<=0&&f>=0&&E<=0)return d=f/(f-E),t.copy(r).addScaledVector(eo,d);const x=m*E-S*g;if(x<=0&&g-m>=0&&S-E>=0)return ax.subVectors(l,a),d=(g-m)/(g-m+(S-E)),t.copy(a).addScaledVector(ax,d);const y=1/(x+w+v);return c=w*y,d=v*y,t.copy(r).addScaledVector(Ja,c).addScaledVector(eo,d)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class Ho{constructor(e=new ee(1/0,1/0,1/0),t=new ee(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,r=e.length;t<r;t+=3)this.expandByPoint(Xi.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,r=e.count;t<r;t++)this.expandByPoint(Xi.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,r=e.length;t<r;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const r=Xi.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(r),this.max.copy(e).add(r),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const r=e.geometry;if(r!==void 0){const l=r.getAttribute("position");if(t===!0&&l!==void 0&&e.isInstancedMesh!==!0)for(let c=0,d=l.count;c<d;c++)e.isMesh===!0?e.getVertexPosition(c,Xi):Xi.fromBufferAttribute(l,c),Xi.applyMatrix4(e.matrixWorld),this.expandByPoint(Xi);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),vu.copy(e.boundingBox)):(r.boundingBox===null&&r.computeBoundingBox(),vu.copy(r.boundingBox)),vu.applyMatrix4(e.matrixWorld),this.union(vu)}const a=e.children;for(let l=0,c=a.length;l<c;l++)this.expandByObject(a[l],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Xi),Xi.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,r;return e.normal.x>0?(t=e.normal.x*this.min.x,r=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,r=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,r+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,r+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,r+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,r+=e.normal.z*this.min.z),t<=-e.constant&&r>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Rl),xu.subVectors(this.max,Rl),to.subVectors(e.a,Rl),no.subVectors(e.b,Rl),io.subVectors(e.c,Rl),vs.subVectors(no,to),xs.subVectors(io,no),na.subVectors(to,io);let t=[0,-vs.z,vs.y,0,-xs.z,xs.y,0,-na.z,na.y,vs.z,0,-vs.x,xs.z,0,-xs.x,na.z,0,-na.x,-vs.y,vs.x,0,-xs.y,xs.x,0,-na.y,na.x,0];return!Rf(t,to,no,io,xu)||(t=[1,0,0,0,1,0,0,0,1],!Rf(t,to,no,io,xu))?!1:(_u.crossVectors(vs,xs),t=[_u.x,_u.y,_u.z],Rf(t,to,no,io,xu))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Xi).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Xi).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Dr[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Dr[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Dr[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Dr[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Dr[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Dr[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Dr[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Dr[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Dr),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Dr=[new ee,new ee,new ee,new ee,new ee,new ee,new ee,new ee],Xi=new ee,vu=new Ho,to=new ee,no=new ee,io=new ee,vs=new ee,xs=new ee,na=new ee,Rl=new ee,xu=new ee,_u=new ee,ia=new ee;function Rf(i,e,t,r,a){for(let l=0,c=i.length-3;l<=c;l+=3){ia.fromArray(i,l);const d=a.x*Math.abs(ia.x)+a.y*Math.abs(ia.y)+a.z*Math.abs(ia.z),h=e.dot(ia),f=t.dot(ia),m=r.dot(ia);if(Math.max(-Math.max(h,f,m),Math.min(h,f,m))>d)return!1}return!0}const mn=new ee,yu=new dt;let gT=0;class vr extends Os{constructor(e,t,r=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:gT++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=r,this.usage=Xv,this.updateRanges=[],this.gpuType=fr,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,r){e*=this.itemSize,r*=t.itemSize;for(let a=0,l=this.itemSize;a<l;a++)this.array[e+a]=t.array[r+a];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,r=this.count;t<r;t++)yu.fromBufferAttribute(this,t),yu.applyMatrix3(e),this.setXY(t,yu.x,yu.y);else if(this.itemSize===3)for(let t=0,r=this.count;t<r;t++)mn.fromBufferAttribute(this,t),mn.applyMatrix3(e),this.setXYZ(t,mn.x,mn.y,mn.z);return this}applyMatrix4(e){for(let t=0,r=this.count;t<r;t++)mn.fromBufferAttribute(this,t),mn.applyMatrix4(e),this.setXYZ(t,mn.x,mn.y,mn.z);return this}applyNormalMatrix(e){for(let t=0,r=this.count;t<r;t++)mn.fromBufferAttribute(this,t),mn.applyNormalMatrix(e),this.setXYZ(t,mn.x,mn.y,mn.z);return this}transformDirection(e){for(let t=0,r=this.count;t<r;t++)mn.fromBufferAttribute(this,t),mn.transformDirection(e),this.setXYZ(t,mn.x,mn.y,mn.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let r=this.array[e*this.itemSize+t];return this.normalized&&(r=bl(r,this.array)),r}setComponent(e,t,r){return this.normalized&&(r=oi(r,this.array)),this.array[e*this.itemSize+t]=r,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=bl(t,this.array)),t}setX(e,t){return this.normalized&&(t=oi(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=bl(t,this.array)),t}setY(e,t){return this.normalized&&(t=oi(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=bl(t,this.array)),t}setZ(e,t){return this.normalized&&(t=oi(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=bl(t,this.array)),t}setW(e,t){return this.normalized&&(t=oi(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,r){return e*=this.itemSize,this.normalized&&(t=oi(t,this.array),r=oi(r,this.array)),this.array[e+0]=t,this.array[e+1]=r,this}setXYZ(e,t,r,a){return e*=this.itemSize,this.normalized&&(t=oi(t,this.array),r=oi(r,this.array),a=oi(a,this.array)),this.array[e+0]=t,this.array[e+1]=r,this.array[e+2]=a,this}setXYZW(e,t,r,a,l){return e*=this.itemSize,this.normalized&&(t=oi(t,this.array),r=oi(r,this.array),a=oi(a,this.array),l=oi(l,this.array)),this.array[e+0]=t,this.array[e+1]=r,this.array[e+2]=a,this.array[e+3]=l,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Xv&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}}class py extends vr{constructor(e,t,r){super(new Uint16Array(e),t,r)}}class my extends vr{constructor(e,t,r){super(new Uint32Array(e),t,r)}}class In extends vr{constructor(e,t,r){super(new Float32Array(e),t,r)}}const vT=new Ho,Al=new ee,Af=new ee;class nc{constructor(e=new ee,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const r=this.center;t!==void 0?r.copy(t):vT.setFromPoints(e).getCenter(r);let a=0;for(let l=0,c=e.length;l<c;l++)a=Math.max(a,r.distanceToSquared(e[l]));return this.radius=Math.sqrt(a),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const r=this.center.distanceToSquared(e);return t.copy(e),r>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Al.subVectors(e,this.center);const t=Al.lengthSq();if(t>this.radius*this.radius){const r=Math.sqrt(t),a=(r-this.radius)*.5;this.center.addScaledVector(Al,a/r),this.radius+=a}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Af.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Al.copy(e.center).add(Af)),this.expandByPoint(Al.copy(e.center).sub(Af))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let xT=0;const Ni=new rn,Pf=new En,ro=new ee,xi=new Ho,Pl=new Ho,An=new ee;class Mi extends Os{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:xT++}),this.uuid=tc(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Kw(e)?my:py)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,r=0){this.groups.push({start:e,count:t,materialIndex:r})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const r=this.attributes.normal;if(r!==void 0){const l=new pt().getNormalMatrix(e);r.applyNormalMatrix(l),r.needsUpdate=!0}const a=this.attributes.tangent;return a!==void 0&&(a.transformDirection(e),a.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return Ni.makeRotationFromQuaternion(e),this.applyMatrix4(Ni),this}rotateX(e){return Ni.makeRotationX(e),this.applyMatrix4(Ni),this}rotateY(e){return Ni.makeRotationY(e),this.applyMatrix4(Ni),this}rotateZ(e){return Ni.makeRotationZ(e),this.applyMatrix4(Ni),this}translate(e,t,r){return Ni.makeTranslation(e,t,r),this.applyMatrix4(Ni),this}scale(e,t,r){return Ni.makeScale(e,t,r),this.applyMatrix4(Ni),this}lookAt(e){return Pf.lookAt(e),Pf.updateMatrix(),this.applyMatrix4(Pf.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(ro).negate(),this.translate(ro.x,ro.y,ro.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const r=[];for(let a=0,l=e.length;a<l;a++){const c=e[a];r.push(c.x,c.y,c.z||0)}this.setAttribute("position",new In(r,3))}else{const r=Math.min(e.length,t.count);for(let a=0;a<r;a++){const l=e[a];t.setXYZ(a,l.x,l.y,l.z||0)}e.length>t.count&&lt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Ho);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Nt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new ee(-1/0,-1/0,-1/0),new ee(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){const l=t[r];xi.setFromBufferAttribute(l),this.morphTargetsRelative?(An.addVectors(this.boundingBox.min,xi.min),this.boundingBox.expandByPoint(An),An.addVectors(this.boundingBox.max,xi.max),this.boundingBox.expandByPoint(An)):(this.boundingBox.expandByPoint(xi.min),this.boundingBox.expandByPoint(xi.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Nt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new nc);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Nt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new ee,1/0);return}if(e){const r=this.boundingSphere.center;if(xi.setFromBufferAttribute(e),t)for(let l=0,c=t.length;l<c;l++){const d=t[l];Pl.setFromBufferAttribute(d),this.morphTargetsRelative?(An.addVectors(xi.min,Pl.min),xi.expandByPoint(An),An.addVectors(xi.max,Pl.max),xi.expandByPoint(An)):(xi.expandByPoint(Pl.min),xi.expandByPoint(Pl.max))}xi.getCenter(r);let a=0;for(let l=0,c=e.count;l<c;l++)An.fromBufferAttribute(e,l),a=Math.max(a,r.distanceToSquared(An));if(t)for(let l=0,c=t.length;l<c;l++){const d=t[l],h=this.morphTargetsRelative;for(let f=0,m=d.count;f<m;f++)An.fromBufferAttribute(d,f),h&&(ro.fromBufferAttribute(e,f),An.add(ro)),a=Math.max(a,r.distanceToSquared(An))}this.boundingSphere.radius=Math.sqrt(a),isNaN(this.boundingSphere.radius)&&Nt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Nt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const r=t.position,a=t.normal,l=t.uv;let c=this.getAttribute("tangent");(c===void 0||c.count!==r.count)&&(c=new vr(new Float32Array(4*r.count),4),this.setAttribute("tangent",c));const d=[],h=[];for(let T=0;T<r.count;T++)d[T]=new ee,h[T]=new ee;const f=new ee,m=new ee,g=new ee,v=new dt,S=new dt,E=new dt,w=new ee,x=new ee;function y(T,I,G){f.fromBufferAttribute(r,T),m.fromBufferAttribute(r,I),g.fromBufferAttribute(r,G),v.fromBufferAttribute(l,T),S.fromBufferAttribute(l,I),E.fromBufferAttribute(l,G),m.sub(f),g.sub(f),S.sub(v),E.sub(v);const H=1/(S.x*E.y-E.x*S.y);isFinite(H)&&(w.copy(m).multiplyScalar(E.y).addScaledVector(g,-S.y).multiplyScalar(H),x.copy(g).multiplyScalar(S.x).addScaledVector(m,-E.x).multiplyScalar(H),d[T].add(w),d[I].add(w),d[G].add(w),h[T].add(x),h[I].add(x),h[G].add(x))}let N=this.groups;N.length===0&&(N=[{start:0,count:e.count}]);for(let T=0,I=N.length;T<I;++T){const G=N[T],H=G.start,K=G.count;for(let re=H,fe=H+K;re<fe;re+=3)y(e.getX(re+0),e.getX(re+1),e.getX(re+2))}const P=new ee,C=new ee,D=new ee,L=new ee;function F(T){D.fromBufferAttribute(a,T),L.copy(D);const I=d[T];P.copy(I),P.sub(D.multiplyScalar(D.dot(I))).normalize(),C.crossVectors(L,I);const H=C.dot(h[T])<0?-1:1;c.setXYZW(T,P.x,P.y,P.z,H)}for(let T=0,I=N.length;T<I;++T){const G=N[T],H=G.start,K=G.count;for(let re=H,fe=H+K;re<fe;re+=3)F(e.getX(re+0)),F(e.getX(re+1)),F(e.getX(re+2))}this._transformed=!0}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let r=this.getAttribute("normal");if(r===void 0||r.count!==t.count)r=new vr(new Float32Array(t.count*3),3),this.setAttribute("normal",r);else for(let v=0,S=r.count;v<S;v++)r.setXYZ(v,0,0,0);const a=new ee,l=new ee,c=new ee,d=new ee,h=new ee,f=new ee,m=new ee,g=new ee;if(e)for(let v=0,S=e.count;v<S;v+=3){const E=e.getX(v+0),w=e.getX(v+1),x=e.getX(v+2);a.fromBufferAttribute(t,E),l.fromBufferAttribute(t,w),c.fromBufferAttribute(t,x),m.subVectors(c,l),g.subVectors(a,l),m.cross(g),d.fromBufferAttribute(r,E),h.fromBufferAttribute(r,w),f.fromBufferAttribute(r,x),d.add(m),h.add(m),f.add(m),r.setXYZ(E,d.x,d.y,d.z),r.setXYZ(w,h.x,h.y,h.z),r.setXYZ(x,f.x,f.y,f.z)}else for(let v=0,S=t.count;v<S;v+=3)a.fromBufferAttribute(t,v+0),l.fromBufferAttribute(t,v+1),c.fromBufferAttribute(t,v+2),m.subVectors(c,l),g.subVectors(a,l),m.cross(g),r.setXYZ(v+0,m.x,m.y,m.z),r.setXYZ(v+1,m.x,m.y,m.z),r.setXYZ(v+2,m.x,m.y,m.z);this.normalizeNormals(),r.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,r=e.count;t<r;t++)An.fromBufferAttribute(e,t),An.normalize(),e.setXYZ(t,An.x,An.y,An.z)}toNonIndexed(){function e(d,h){const f=d.array,m=d.itemSize,g=d.normalized,v=new f.constructor(h.length*m);let S=0,E=0;for(let w=0,x=h.length;w<x;w++){d.isInterleavedBufferAttribute?S=h[w]*d.data.stride+d.offset:S=h[w]*m;for(let y=0;y<m;y++)v[E++]=f[S++]}return new vr(v,m,g)}if(this.index===null)return lt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Mi,r=this.index.array,a=this.attributes;for(const d in a){const h=a[d],f=e(h,r);t.setAttribute(d,f)}const l=this.morphAttributes;for(const d in l){const h=[],f=l[d];for(let m=0,g=f.length;m<g;m++){const v=f[m],S=e(v,r);h.push(S)}t.morphAttributes[d]=h}t.morphTargetsRelative=this.morphTargetsRelative;const c=this.groups;for(let d=0,h=c.length;d<h;d++){const f=c[d];t.addGroup(f.start,f.count,f.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const h=this.parameters;for(const f in h)h[f]!==void 0&&(e[f]=h[f]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const r=this.attributes;for(const h in r){const f=r[h];e.data.attributes[h]=f.toJSON(e.data)}const a={};let l=!1;for(const h in this.morphAttributes){const f=this.morphAttributes[h],m=[];for(let g=0,v=f.length;g<v;g++){const S=f[g];m.push(S.toJSON(e.data))}m.length>0&&(a[h]=m,l=!0)}l&&(e.data.morphAttributes=a,e.data.morphTargetsRelative=this.morphTargetsRelative);const c=this.groups;c.length>0&&(e.data.groups=JSON.parse(JSON.stringify(c)));const d=this.boundingSphere;return d!==null&&(e.data.boundingSphere=d.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const r=e.index;r!==null&&this.setIndex(r.clone());const a=e.attributes;for(const f in a){const m=a[f];this.setAttribute(f,m.clone(t))}const l=e.morphAttributes;for(const f in l){const m=[],g=l[f];for(let v=0,S=g.length;v<S;v++)m.push(g[v].clone(t));this.morphAttributes[f]=m}this.morphTargetsRelative=e.morphTargetsRelative;const c=e.groups;for(let f=0,m=c.length;f<m;f++){const g=c[f];this.addGroup(g.start,g.count,g.materialIndex)}const d=e.boundingBox;d!==null&&(this.boundingBox=d.clone());const h=e.boundingSphere;return h!==null&&(this.boundingSphere=h.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}let _T=0;class _r extends Os{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:_T++}),this.uuid=tc(),this.name="",this.type="Material",this.blending=mo,this.side=Us,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=hp,this.blendDst=fp,this.blendEquation=aa,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new gt(0,0,0),this.blendAlpha=0,this.depthFunc=Lo,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=jv,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=qa,this.stencilZFail=qa,this.stencilZPass=qa,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const r=e[t];if(r===void 0){lt(`Material: parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){lt(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}a&&a.isColor?a.set(r):a&&a.isVector2&&r&&r.isVector2||a&&a.isEuler&&r&&r.isEuler||a&&a.isVector3&&r&&r.isVector3?a.copy(r):this[t]=r}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const r={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.color&&this.color.isColor&&(r.color=this.color.getHex()),this.roughness!==void 0&&(r.roughness=this.roughness),this.metalness!==void 0&&(r.metalness=this.metalness),this.sheen!==void 0&&(r.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(r.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(r.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(r.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(r.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(r.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(r.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(r.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(r.shininess=this.shininess),this.clearcoat!==void 0&&(r.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(r.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(r.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(r.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(r.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,r.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(r.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(r.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(r.dispersion=this.dispersion),this.iridescence!==void 0&&(r.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(r.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(r.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(r.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(r.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(r.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(r.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(r.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(r.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(r.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(r.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(r.lightMap=this.lightMap.toJSON(e).uuid,r.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(r.aoMap=this.aoMap.toJSON(e).uuid,r.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(r.bumpMap=this.bumpMap.toJSON(e).uuid,r.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(r.normalMap=this.normalMap.toJSON(e).uuid,r.normalMapType=this.normalMapType,r.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(r.displacementMap=this.displacementMap.toJSON(e).uuid,r.displacementScale=this.displacementScale,r.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(r.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(r.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(r.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(r.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(r.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(r.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(r.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(r.combine=this.combine)),this.envMapRotation!==void 0&&(r.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(r.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(r.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(r.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(r.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(r.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(r.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(r.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(r.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(r.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(r.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(r.size=this.size),this.shadowSide!==null&&(r.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(r.sizeAttenuation=this.sizeAttenuation),this.blending!==mo&&(r.blending=this.blending),this.side!==Us&&(r.side=this.side),this.vertexColors===!0&&(r.vertexColors=!0),this.opacity<1&&(r.opacity=this.opacity),this.transparent===!0&&(r.transparent=!0),this.blendSrc!==hp&&(r.blendSrc=this.blendSrc),this.blendDst!==fp&&(r.blendDst=this.blendDst),this.blendEquation!==aa&&(r.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(r.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(r.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(r.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(r.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(r.blendAlpha=this.blendAlpha),this.depthFunc!==Lo&&(r.depthFunc=this.depthFunc),this.depthTest===!1&&(r.depthTest=this.depthTest),this.depthWrite===!1&&(r.depthWrite=this.depthWrite),this.colorWrite===!1&&(r.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(r.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==jv&&(r.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(r.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(r.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==qa&&(r.stencilFail=this.stencilFail),this.stencilZFail!==qa&&(r.stencilZFail=this.stencilZFail),this.stencilZPass!==qa&&(r.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(r.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(r.rotation=this.rotation),this.polygonOffset===!0&&(r.polygonOffset=!0),this.polygonOffsetFactor!==0&&(r.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(r.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(r.linewidth=this.linewidth),this.dashSize!==void 0&&(r.dashSize=this.dashSize),this.gapSize!==void 0&&(r.gapSize=this.gapSize),this.scale!==void 0&&(r.scale=this.scale),this.dithering===!0&&(r.dithering=!0),this.alphaTest>0&&(r.alphaTest=this.alphaTest),this.alphaHash===!0&&(r.alphaHash=!0),this.alphaToCoverage===!0&&(r.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(r.premultipliedAlpha=!0),this.forceSinglePass===!0&&(r.forceSinglePass=!0),this.allowOverride===!1&&(r.allowOverride=!1),this.wireframe===!0&&(r.wireframe=!0),this.wireframeLinewidth>1&&(r.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(r.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(r.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(r.flatShading=!0),this.visible===!1&&(r.visible=!1),this.toneMapped===!1&&(r.toneMapped=!1),this.fog===!1&&(r.fog=!1),Object.keys(this.userData).length>0&&(r.userData=this.userData);function a(l){const c=[];for(const d in l){const h=l[d];delete h.metadata,c.push(h)}return c}if(t){const l=a(e.textures),c=a(e.images);l.length>0&&(r.textures=l),c.length>0&&(r.images=c)}return r}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new gt().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let r=e.normalScale;Array.isArray(r)===!1&&(r=[r,r]),this.normalScale=new dt().fromArray(r)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new dt().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let r=null;if(t!==null){const a=t.length;r=new Array(a);for(let l=0;l!==a;++l)r[l]=t[l].clone()}return this.clippingPlanes=r,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}const Ir=new ee,Nf=new ee,Su=new ee,_s=new ee,Lf=new ee,Mu=new ee,Df=new ee;class gd{constructor(e=new ee,t=new ee(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Ir)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const r=t.dot(this.direction);return r<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,r)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Ir.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Ir.copy(this.origin).addScaledVector(this.direction,t),Ir.distanceToSquared(e))}distanceSqToSegment(e,t,r,a){Nf.copy(e).add(t).multiplyScalar(.5),Su.copy(t).sub(e).normalize(),_s.copy(this.origin).sub(Nf);const l=e.distanceTo(t)*.5,c=-this.direction.dot(Su),d=_s.dot(this.direction),h=-_s.dot(Su),f=_s.lengthSq(),m=Math.abs(1-c*c);let g,v,S,E;if(m>0)if(g=c*h-d,v=c*d-h,E=l*m,g>=0)if(v>=-E)if(v<=E){const w=1/m;g*=w,v*=w,S=g*(g+c*v+2*d)+v*(c*g+v+2*h)+f}else v=l,g=Math.max(0,-(c*v+d)),S=-g*g+v*(v+2*h)+f;else v=-l,g=Math.max(0,-(c*v+d)),S=-g*g+v*(v+2*h)+f;else v<=-E?(g=Math.max(0,-(-c*l+d)),v=g>0?-l:Math.min(Math.max(-l,-h),l),S=-g*g+v*(v+2*h)+f):v<=E?(g=0,v=Math.min(Math.max(-l,-h),l),S=v*(v+2*h)+f):(g=Math.max(0,-(c*l+d)),v=g>0?l:Math.min(Math.max(-l,-h),l),S=-g*g+v*(v+2*h)+f);else v=c>0?-l:l,g=Math.max(0,-(c*v+d)),S=-g*g+v*(v+2*h)+f;return r&&r.copy(this.origin).addScaledVector(this.direction,g),a&&a.copy(Nf).addScaledVector(Su,v),S}intersectSphere(e,t){Ir.subVectors(e.center,this.origin);const r=Ir.dot(this.direction),a=Ir.dot(Ir)-r*r,l=e.radius*e.radius;if(a>l)return null;const c=Math.sqrt(l-a),d=r-c,h=r+c;return h<0?null:d<0?this.at(h,t):this.at(d,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const r=-(this.origin.dot(e.normal)+e.constant)/t;return r>=0?r:null}intersectPlane(e,t){const r=this.distanceToPlane(e);return r===null?null:this.at(r,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let r,a,l,c,d,h;const f=1/this.direction.x,m=1/this.direction.y,g=1/this.direction.z,v=this.origin;return f>=0?(r=(e.min.x-v.x)*f,a=(e.max.x-v.x)*f):(r=(e.max.x-v.x)*f,a=(e.min.x-v.x)*f),m>=0?(l=(e.min.y-v.y)*m,c=(e.max.y-v.y)*m):(l=(e.max.y-v.y)*m,c=(e.min.y-v.y)*m),r>c||l>a||((l>r||isNaN(r))&&(r=l),(c<a||isNaN(a))&&(a=c),g>=0?(d=(e.min.z-v.z)*g,h=(e.max.z-v.z)*g):(d=(e.max.z-v.z)*g,h=(e.min.z-v.z)*g),r>h||d>a)||((d>r||r!==r)&&(r=d),(h<a||a!==a)&&(a=h),a<0)?null:this.at(r>=0?r:a,t)}intersectsBox(e){return this.intersectBox(e,Ir)!==null}intersectTriangle(e,t,r,a,l){Lf.subVectors(t,e),Mu.subVectors(r,e),Df.crossVectors(Lf,Mu);let c=this.direction.dot(Df),d;if(c>0){if(a)return null;d=1}else if(c<0)d=-1,c=-c;else return null;_s.subVectors(this.origin,e);const h=d*this.direction.dot(Mu.crossVectors(_s,Mu));if(h<0)return null;const f=d*this.direction.dot(Lf.cross(_s));if(f<0||h+f>c)return null;const m=-d*_s.dot(Df);return m<0?null:this.at(m/c,l)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class gy extends _r{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new gt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Yr,this.combine=bm,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const ox=new rn,ra=new gd,Eu=new nc,lx=new ee,wu=new ee,Tu=new ee,bu=new ee,If=new ee,Cu=new ee,cx=new ee,Ru=new ee;class Zi extends En{constructor(e=new Mi,t=new gy){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}getVertexPosition(e,t){const r=this.geometry,a=r.attributes.position,l=r.morphAttributes.position,c=r.morphTargetsRelative;t.fromBufferAttribute(a,e);const d=this.morphTargetInfluences;if(l&&d){Cu.set(0,0,0);for(let h=0,f=l.length;h<f;h++){const m=d[h],g=l[h];m!==0&&(If.fromBufferAttribute(g,e),c?Cu.addScaledVector(If,m):Cu.addScaledVector(If.sub(t),m))}t.add(Cu)}return t}raycast(e,t){const r=this.geometry,a=this.material,l=this.matrixWorld;a!==void 0&&(r.boundingSphere===null&&r.computeBoundingSphere(),Eu.copy(r.boundingSphere),Eu.applyMatrix4(l),ra.copy(e.ray).recast(e.near),!(Eu.containsPoint(ra.origin)===!1&&(ra.intersectSphere(Eu,lx)===null||ra.origin.distanceToSquared(lx)>(e.far-e.near)**2))&&(ox.copy(l).invert(),ra.copy(e.ray).applyMatrix4(ox),!(r.boundingBox!==null&&ra.intersectsBox(r.boundingBox)===!1)&&this._computeIntersections(e,t,ra)))}_computeIntersections(e,t,r){let a;const l=this.geometry,c=this.material,d=l.index,h=l.attributes.position,f=l.attributes.uv,m=l.attributes.uv1,g=l.attributes.normal,v=l.groups,S=l.drawRange;if(d!==null)if(Array.isArray(c))for(let E=0,w=v.length;E<w;E++){const x=v[E],y=c[x.materialIndex],N=Math.max(x.start,S.start),P=Math.min(d.count,Math.min(x.start+x.count,S.start+S.count));for(let C=N,D=P;C<D;C+=3){const L=d.getX(C),F=d.getX(C+1),T=d.getX(C+2);a=Au(this,y,e,r,f,m,g,L,F,T),a&&(a.faceIndex=Math.floor(C/3),a.face.materialIndex=x.materialIndex,t.push(a))}}else{const E=Math.max(0,S.start),w=Math.min(d.count,S.start+S.count);for(let x=E,y=w;x<y;x+=3){const N=d.getX(x),P=d.getX(x+1),C=d.getX(x+2);a=Au(this,c,e,r,f,m,g,N,P,C),a&&(a.faceIndex=Math.floor(x/3),t.push(a))}}else if(h!==void 0)if(Array.isArray(c))for(let E=0,w=v.length;E<w;E++){const x=v[E],y=c[x.materialIndex],N=Math.max(x.start,S.start),P=Math.min(h.count,Math.min(x.start+x.count,S.start+S.count));for(let C=N,D=P;C<D;C+=3){const L=C,F=C+1,T=C+2;a=Au(this,y,e,r,f,m,g,L,F,T),a&&(a.faceIndex=Math.floor(C/3),a.face.materialIndex=x.materialIndex,t.push(a))}}else{const E=Math.max(0,S.start),w=Math.min(h.count,S.start+S.count);for(let x=E,y=w;x<y;x+=3){const N=x,P=x+1,C=x+2;a=Au(this,c,e,r,f,m,g,N,P,C),a&&(a.faceIndex=Math.floor(x/3),t.push(a))}}}}function yT(i,e,t,r,a,l,c,d){let h;if(e.side===hi?h=r.intersectTriangle(c,l,a,!0,d):h=r.intersectTriangle(a,l,c,e.side===Us,d),h===null)return null;Ru.copy(d),Ru.applyMatrix4(i.matrixWorld);const f=t.ray.origin.distanceTo(Ru);return f<t.near||f>t.far?null:{distance:f,point:Ru.clone(),object:i}}function Au(i,e,t,r,a,l,c,d,h,f){i.getVertexPosition(d,wu),i.getVertexPosition(h,Tu),i.getVertexPosition(f,bu);const m=yT(i,e,t,r,wu,Tu,bu,cx);if(m){const g=new ee;Yi.getBarycoord(cx,wu,Tu,bu,g),a&&(m.uv=Yi.getInterpolatedAttribute(a,d,h,f,g,new dt)),l&&(m.uv1=Yi.getInterpolatedAttribute(l,d,h,f,g,new dt)),c&&(m.normal=Yi.getInterpolatedAttribute(c,d,h,f,g,new ee),m.normal.dot(r.direction)>0&&m.normal.multiplyScalar(-1));const v={a:d,b:h,c:f,normal:new ee,materialIndex:0};Yi.getNormal(wu,Tu,bu,v.normal),m.face=v,m.barycoord=g}return m}class ST extends jn{constructor(e=null,t=1,r=1,a,l,c,d,h,f=Un,m=Un,g,v){super(null,c,d,h,f,m,a,l,g,v),this.isDataTexture=!0,this.image={data:e,width:t,height:r},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Uf=new ee,MT=new ee,ET=new pt;class Ms{constructor(e=new ee(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,r,a){return this.normal.set(e,t,r),this.constant=a,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,r){const a=Uf.subVectors(r,t).cross(MT.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(a,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,r=!0){const a=e.delta(Uf),l=this.normal.dot(a);if(l===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const c=-(e.start.dot(this.normal)+this.constant)/l;return r===!0&&(c<0||c>1)?null:t.copy(e.start).addScaledVector(a,c)}intersectsLine(e){const t=this.distanceToPoint(e.start),r=this.distanceToPoint(e.end);return t<0&&r>0||r<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const r=t||ET.getNormalMatrix(e),a=this.coplanarPoint(Uf).applyMatrix4(e),l=this.normal.applyMatrix3(r).normalize();return this.constant=-a.dot(l),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const sa=new nc,wT=new dt(.5,.5),Pu=new ee;class Om{constructor(e=new Ms,t=new Ms,r=new Ms,a=new Ms,l=new Ms,c=new Ms){this.planes=[e,t,r,a,l,c]}set(e,t,r,a,l,c){const d=this.planes;return d[0].copy(e),d[1].copy(t),d[2].copy(r),d[3].copy(a),d[4].copy(l),d[5].copy(c),this}copy(e){const t=this.planes;for(let r=0;r<6;r++)t[r].copy(e.planes[r]);return this}setFromProjectionMatrix(e,t=pr,r=!1){const a=this.planes,l=e.elements,c=l[0],d=l[1],h=l[2],f=l[3],m=l[4],g=l[5],v=l[6],S=l[7],E=l[8],w=l[9],x=l[10],y=l[11],N=l[12],P=l[13],C=l[14],D=l[15];if(a[0].setComponents(f-c,S-m,y-E,D-N).normalize(),a[1].setComponents(f+c,S+m,y+E,D+N).normalize(),a[2].setComponents(f+d,S+g,y+w,D+P).normalize(),a[3].setComponents(f-d,S-g,y-w,D-P).normalize(),r)a[4].setComponents(h,v,x,C).normalize(),a[5].setComponents(f-h,S-v,y-x,D-C).normalize();else if(a[4].setComponents(f-h,S-v,y-x,D-C).normalize(),t===pr)a[5].setComponents(f+h,S+v,y+x,D+C).normalize();else if(t===Xl)a[5].setComponents(h,v,x,C).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),sa.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),sa.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(sa)}intersectsSprite(e){sa.center.set(0,0,0);const t=wT.distanceTo(e.center);return sa.radius=.7071067811865476+t,sa.applyMatrix4(e.matrixWorld),this.intersectsSphere(sa)}intersectsSphere(e){const t=this.planes,r=e.center,a=-e.radius;for(let l=0;l<6;l++)if(t[l].distanceToPoint(r)<a)return!1;return!0}intersectsBox(e){const t=this.planes;for(let r=0;r<6;r++){const a=t[r];if(Pu.x=a.normal.x>0?e.max.x:e.min.x,Pu.y=a.normal.y>0?e.max.y:e.min.y,Pu.z=a.normal.z>0?e.max.z:e.min.z,a.distanceToPoint(Pu)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let r=0;r<6;r++)if(t[r].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Ku extends _r{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new gt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const od=new ee,ld=new ee,ux=new rn,Nl=new gd,Nu=new nc,Ff=new ee,dx=new ee;class TT extends En{constructor(e=new Mi,t=new Ku){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,r=[0];for(let a=1,l=t.count;a<l;a++)od.fromBufferAttribute(t,a-1),ld.fromBufferAttribute(t,a),r[a]=r[a-1],r[a]+=od.distanceTo(ld);e.setAttribute("lineDistance",new In(r,1))}else lt("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const r=this.geometry,a=this.matrixWorld,l=e.params.Line.threshold,c=r.drawRange;if(r.boundingSphere===null&&r.computeBoundingSphere(),Nu.copy(r.boundingSphere),Nu.applyMatrix4(a),Nu.radius+=l,e.ray.intersectsSphere(Nu)===!1)return;ux.copy(a).invert(),Nl.copy(e.ray).applyMatrix4(ux);const d=l/((this.scale.x+this.scale.y+this.scale.z)/3),h=d*d,f=this.isLineSegments?2:1,m=r.index,v=r.attributes.position;if(m!==null){const S=Math.max(0,c.start),E=Math.min(m.count,c.start+c.count);for(let w=S,x=E-1;w<x;w+=f){const y=m.getX(w),N=m.getX(w+1),P=Lu(this,e,Nl,h,y,N,w);P&&t.push(P)}if(this.isLineLoop){const w=m.getX(E-1),x=m.getX(S),y=Lu(this,e,Nl,h,w,x,E-1);y&&t.push(y)}}else{const S=Math.max(0,c.start),E=Math.min(v.count,c.start+c.count);for(let w=S,x=E-1;w<x;w+=f){const y=Lu(this,e,Nl,h,w,w+1,w);y&&t.push(y)}if(this.isLineLoop){const w=Lu(this,e,Nl,h,E-1,S,E-1);w&&t.push(w)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}}function Lu(i,e,t,r,a,l,c){const d=i.geometry.attributes.position;if(od.fromBufferAttribute(d,a),ld.fromBufferAttribute(d,l),t.distanceSqToSegment(od,ld,Ff,dx)>r)return;Ff.applyMatrix4(i.matrixWorld);const f=e.ray.origin.distanceTo(Ff);if(!(f<e.near||f>e.far))return{distance:f,point:dx.clone().applyMatrix4(i.matrixWorld),index:c,face:null,faceIndex:null,barycoord:null,object:i}}const hx=new ee,fx=new ee;class px extends TT{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,r=[];for(let a=0,l=t.count;a<l;a+=2)hx.fromBufferAttribute(t,a),fx.fromBufferAttribute(t,a+1),r[a]=a===0?0:r[a-1],r[a+1]=r[a]+hx.distanceTo(fx);e.setAttribute("lineDistance",new In(r,1))}else lt("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class Ol extends _r{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new gt(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const mx=new rn,em=new gd,Du=new nc,Iu=new ee;class Of extends En{constructor(e=new Mi,t=new Ol){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const r=this.geometry,a=this.matrixWorld,l=e.params.Points.threshold,c=r.drawRange;if(r.boundingSphere===null&&r.computeBoundingSphere(),Du.copy(r.boundingSphere),Du.applyMatrix4(a),Du.radius+=l,e.ray.intersectsSphere(Du)===!1)return;mx.copy(a).invert(),em.copy(e.ray).applyMatrix4(mx);const d=l/((this.scale.x+this.scale.y+this.scale.z)/3),h=d*d,f=r.index,g=r.attributes.position;if(f!==null){const v=Math.max(0,c.start),S=Math.min(f.count,c.start+c.count);for(let E=v,w=S;E<w;E++){const x=f.getX(E);Iu.fromBufferAttribute(g,x),gx(Iu,x,h,a,e,t,this)}}else{const v=Math.max(0,c.start),S=Math.min(g.count,c.start+c.count);for(let E=v,w=S;E<w;E++)Iu.fromBufferAttribute(g,E),gx(Iu,E,h,a,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}}function gx(i,e,t,r,a,l,c){const d=em.distanceSqToPoint(i);if(d<t){const h=new ee;em.closestPointToPoint(i,h),h.applyMatrix4(r);const f=a.ray.origin.distanceTo(h);if(f<a.near||f>a.far)return;l.push({distance:f,distanceToRay:Math.sqrt(d),point:h,index:e,face:null,faceIndex:null,barycoord:null,object:c})}}class vy extends jn{constructor(e=[],t=Ma,r,a,l,c,d,h,f,m){super(e,t,r,a,l,c,d,h,f,m),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Io extends jn{constructor(e,t,r=xr,a,l,c,d=Un,h=Un,f,m=qr,g=1){if(m!==qr&&m!==da)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const v={width:e,height:t,depth:g};super(v,a,l,c,d,h,m,r,f),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Fm(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class bT extends Io{constructor(e,t=xr,r=Ma,a,l,c=Un,d=Un,h,f=qr){const m={width:e,height:e,depth:1},g=[m,m,m,m,m,m];super(e,e,t,r,a,l,c,d,h,f),this.image=g,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class xy extends jn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class ic extends Mi{constructor(e=1,t=1,r=1,a=1,l=1,c=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:r,widthSegments:a,heightSegments:l,depthSegments:c};const d=this;a=Math.floor(a),l=Math.floor(l),c=Math.floor(c);const h=[],f=[],m=[],g=[];let v=0,S=0;E("z","y","x",-1,-1,r,t,e,c,l,0),E("z","y","x",1,-1,r,t,-e,c,l,1),E("x","z","y",1,1,e,r,t,a,c,2),E("x","z","y",1,-1,e,r,-t,a,c,3),E("x","y","z",1,-1,e,t,r,a,l,4),E("x","y","z",-1,-1,e,t,-r,a,l,5),this.setIndex(h),this.setAttribute("position",new In(f,3)),this.setAttribute("normal",new In(m,3)),this.setAttribute("uv",new In(g,2));function E(w,x,y,N,P,C,D,L,F,T,I){const G=C/F,H=D/T,K=C/2,re=D/2,fe=L/2,O=F+1,ce=T+1;let Z=0,q=0;const ue=new ee;for(let he=0;he<ce;he++){const k=he*H-re;for(let X=0;X<O;X++){const Fe=X*G-K;ue[w]=Fe*N,ue[x]=k*P,ue[y]=fe,f.push(ue.x,ue.y,ue.z),ue[w]=0,ue[x]=0,ue[y]=L>0?1:-1,m.push(ue.x,ue.y,ue.z),g.push(X/F),g.push(1-he/T),Z+=1}}for(let he=0;he<T;he++)for(let k=0;k<F;k++){const X=v+k+O*he,Fe=v+k+O*(he+1),je=v+(k+1)+O*(he+1),Ge=v+(k+1)+O*he;h.push(X,Fe,Ge),h.push(Fe,je,Ge),q+=6}d.addGroup(S,q,I),S+=q,v+=Z}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ic(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class vd extends Mi{constructor(e=1,t=1,r=1,a=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:r,heightSegments:a};const l=e/2,c=t/2,d=Math.floor(r),h=Math.floor(a),f=d+1,m=h+1,g=e/d,v=t/h,S=[],E=[],w=[],x=[];for(let y=0;y<m;y++){const N=y*v-c;for(let P=0;P<f;P++){const C=P*g-l;E.push(C,-N,0),w.push(0,0,1),x.push(P/d),x.push(1-y/h)}}for(let y=0;y<h;y++)for(let N=0;N<d;N++){const P=N+f*y,C=N+f*(y+1),D=N+1+f*(y+1),L=N+1+f*y;S.push(P,C,L),S.push(C,D,L)}this.setIndex(S),this.setAttribute("position",new In(E,3)),this.setAttribute("normal",new In(w,3)),this.setAttribute("uv",new In(x,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new vd(e.width,e.height,e.widthSegments,e.heightSegments)}}function Uo(i){const e={};for(const t in i){e[t]={};for(const r in i[t]){const a=i[t][r];if(vx(a))a.isRenderTargetTexture?(lt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][r]=null):e[t][r]=a.clone();else if(Array.isArray(a))if(vx(a[0])){const l=[];for(let c=0,d=a.length;c<d;c++)l[c]=a[c].clone();e[t][r]=l}else e[t][r]=a.slice();else e[t][r]=a}}return e}function Yn(i){const e={};for(let t=0;t<i.length;t++){const r=Uo(i[t]);for(const a in r)e[a]=r[a]}return e}function vx(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function CT(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function _y(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:bt.workingColorSpace}const RT={clone:Uo,merge:Yn};var AT=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,PT=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class yr extends _r{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=AT,this.fragmentShader=PT,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Uo(e.uniforms),this.uniformsGroups=CT(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const a in this.uniforms){const c=this.uniforms[a].value;c&&c.isTexture?t.uniforms[a]={type:"t",value:c.toJSON(e).uuid}:c&&c.isColor?t.uniforms[a]={type:"c",value:c.getHex()}:c&&c.isVector2?t.uniforms[a]={type:"v2",value:c.toArray()}:c&&c.isVector3?t.uniforms[a]={type:"v3",value:c.toArray()}:c&&c.isVector4?t.uniforms[a]={type:"v4",value:c.toArray()}:c&&c.isMatrix3?t.uniforms[a]={type:"m3",value:c.toArray()}:c&&c.isMatrix4?t.uniforms[a]={type:"m4",value:c.toArray()}:t.uniforms[a]={value:c}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const r={};for(const a in this.extensions)this.extensions[a]===!0&&(r[a]=!0);return Object.keys(r).length>0&&(t.extensions=r),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(const r in e.uniforms){const a=e.uniforms[r];switch(this.uniforms[r]={},a.type){case"t":this.uniforms[r].value=t[a.value]||null;break;case"c":this.uniforms[r].value=new gt().setHex(a.value);break;case"v2":this.uniforms[r].value=new dt().fromArray(a.value);break;case"v3":this.uniforms[r].value=new ee().fromArray(a.value);break;case"v4":this.uniforms[r].value=new ln().fromArray(a.value);break;case"m3":this.uniforms[r].value=new pt().fromArray(a.value);break;case"m4":this.uniforms[r].value=new rn().fromArray(a.value);break;default:this.uniforms[r].value=a.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(const r in e.extensions)this.extensions[r]=e.extensions[r];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}}class NT extends yr{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class kf extends _r{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new gt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new gt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=rd,this.normalScale=new dt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Yr,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class LT extends _r{constructor(e){super(),this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new gt(16777215),this.specular=new gt(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new gt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=rd,this.normalScale=new dt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Yr,this.combine=bm,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.specular.copy(e.specular),this.shininess=e.shininess,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class DT extends _r{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Vw,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class IT extends _r{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const zl={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(xx(i)||(this.files[i]=e))},get:function(i){if(this.enabled!==!1&&!xx(i))return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};function xx(i){try{const e=i.slice(i.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}class UT{constructor(e,t,r){const a=this;let l=!1,c=0,d=0,h;const f=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=r,this._abortController=null,this.itemStart=function(m){d++,l===!1&&a.onStart!==void 0&&a.onStart(m,c,d),l=!0},this.itemEnd=function(m){c++,a.onProgress!==void 0&&a.onProgress(m,c,d),c===d&&(l=!1,a.onLoad!==void 0&&a.onLoad())},this.itemError=function(m){a.onError!==void 0&&a.onError(m)},this.resolveURL=function(m){return m=m.normalize("NFC"),h?h(m):m},this.setURLModifier=function(m){return h=m,this},this.addHandler=function(m,g){return f.push(m,g),this},this.removeHandler=function(m){const g=f.indexOf(m);return g!==-1&&f.splice(g,2),this},this.getHandler=function(m){for(let g=0,v=f.length;g<v;g+=2){const S=f[g],E=f[g+1];if(S.global&&(S.lastIndex=0),S.test(m))return E}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const FT=new UT;class rc{constructor(e){this.manager=e!==void 0?e:FT,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){const r=this;return new Promise(function(a,l){r.load(e,a,t,l)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}rc.DEFAULT_MATERIAL_NAME="__DEFAULT";const Ur={};class OT extends Error{constructor(e,t){super(e),this.response=t}}class kT extends rc{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,r,a){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const l=zl.get(`file:${e}`);if(l!==void 0){this.manager.itemStart(e),setTimeout(()=>{t&&t(l),this.manager.itemEnd(e)},0);return}if(Ur[e]!==void 0){Ur[e].push({onLoad:t,onProgress:r,onError:a});return}Ur[e]=[],Ur[e].push({onLoad:t,onProgress:r,onError:a});const c=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),d=this.mimeType,h=this.responseType;fetch(c).then(f=>{if(f.status===200||f.status===0){if(f.status===0&&lt("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||f.body===void 0||f.body.getReader===void 0)return f;const m=Ur[e],g=f.body.getReader(),v=f.headers.get("X-File-Size")||f.headers.get("Content-Length"),S=v?parseInt(v):0,E=S!==0;let w=0;const x=new ReadableStream({start(y){N();function N(){g.read().then(({done:P,value:C})=>{if(P)y.close();else{w+=C.byteLength;const D=new ProgressEvent("progress",{lengthComputable:E,loaded:w,total:S});for(let L=0,F=m.length;L<F;L++){const T=m[L];T.onProgress&&T.onProgress(D)}y.enqueue(C),N()}},P=>{y.error(P)})}}});return new Response(x)}else throw new OT(`fetch for "${f.url}" responded with ${f.status}: ${f.statusText}`,f)}).then(f=>{switch(h){case"arraybuffer":return f.arrayBuffer();case"blob":return f.blob();case"document":return f.text().then(m=>new DOMParser().parseFromString(m,d));case"json":return f.json();default:if(d==="")return f.text();{const g=/charset="?([^;"\s]*)"?/i.exec(d),v=g&&g[1]?g[1].toLowerCase():void 0,S=new TextDecoder(v);return f.arrayBuffer().then(E=>S.decode(E))}}}).then(f=>{zl.add(`file:${e}`,f);const m=Ur[e];delete Ur[e];for(let g=0,v=m.length;g<v;g++){const S=m[g];S.onLoad&&S.onLoad(f)}}).catch(f=>{const m=Ur[e];if(m===void 0)throw this.manager.itemError(e),f;delete Ur[e];for(let g=0,v=m.length;g<v;g++){const S=m[g];S.onError&&S.onError(f)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const so=new WeakMap;class zT extends rc{constructor(e){super(e)}load(e,t,r,a){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const l=this,c=zl.get(`image:${e}`);if(c!==void 0){if(c.complete===!0)l.manager.itemStart(e),setTimeout(function(){t&&t(c),l.manager.itemEnd(e)},0);else{let g=so.get(c);g===void 0&&(g=[],so.set(c,g)),g.push({onLoad:t,onError:a})}return c}const d=$l("img");function h(){m(),t&&t(this);const g=so.get(this)||[];for(let v=0;v<g.length;v++){const S=g[v];S.onLoad&&S.onLoad(this)}so.delete(this),l.manager.itemEnd(e)}function f(g){m(),a&&a(g),zl.remove(`image:${e}`);const v=so.get(this)||[];for(let S=0;S<v.length;S++){const E=v[S];E.onError&&E.onError(g)}so.delete(this),l.manager.itemError(e),l.manager.itemEnd(e)}function m(){d.removeEventListener("load",h,!1),d.removeEventListener("error",f,!1)}return d.addEventListener("load",h,!1),d.addEventListener("error",f,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(d.crossOrigin=this.crossOrigin),zl.add(`image:${e}`,d),l.manager.itemStart(e),d.src=e,d}}class BT extends rc{constructor(e){super(e)}load(e,t,r,a){const l=new jn,c=new zT(this.manager);return c.setCrossOrigin(this.crossOrigin),c.setPath(this.path),c.load(e,function(d){l.image=d,l.needsUpdate=!0,t!==void 0&&t(l)},r,a),l}}class km extends En{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new gt(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}class HT extends km{constructor(e,t,r){super(e,r),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(En.DEFAULT_UP),this.updateMatrix(),this.groundColor=new gt(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){const t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}}const zf=new rn,_x=new ee,yx=new ee;class VT{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new dt(512,512),this.mapType=Si,this.map=null,this.mapPass=null,this.matrix=new rn,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Om,this._frameExtents=new dt(1,1),this._viewportCount=1,this._viewports=[new ln(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,r=this.matrix;_x.setFromMatrixPosition(e.matrixWorld),t.position.copy(_x),yx.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(yx),t.updateMatrixWorld(),zf.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(zf,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===Xl||t.reversedDepth?r.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):r.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),r.multiply(zf)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Uu=new ee,Fu=new Fs,ar=new ee;class yy extends En{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new rn,this.projectionMatrix=new rn,this.projectionMatrixInverse=new rn,this.coordinateSystem=pr,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Uu,Fu,ar),ar.x===1&&ar.y===1&&ar.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Uu,Fu,ar.set(1,1,1)).invert()}updateWorldMatrix(e,t,r=!1){super.updateWorldMatrix(e,t,r),this.matrixWorld.decompose(Uu,Fu,ar),ar.x===1&&ar.y===1&&ar.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Uu,Fu,ar.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const ys=new ee,Sx=new dt,Mx=new dt;class Ii extends yy{constructor(e=50,t=1,r=.1,a=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=r,this.far=a,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Jp*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Yu*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Jp*2*Math.atan(Math.tan(Yu*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,r){ys.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(ys.x,ys.y).multiplyScalar(-e/ys.z),ys.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),r.set(ys.x,ys.y).multiplyScalar(-e/ys.z)}getViewSize(e,t){return this.getViewBounds(e,Sx,Mx),t.subVectors(Mx,Sx)}setViewOffset(e,t,r,a,l,c){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=r,this.view.offsetY=a,this.view.width=l,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Yu*.5*this.fov)/this.zoom,r=2*t,a=this.aspect*r,l=-.5*a;const c=this.view;if(this.view!==null&&this.view.enabled){const h=c.fullWidth,f=c.fullHeight;l+=c.offsetX*a/h,t-=c.offsetY*r/f,a*=c.width/h,r*=c.height/f}const d=this.filmOffset;d!==0&&(l+=e*d/this.getFilmWidth()),this.projectionMatrix.makePerspective(l,l+a,t,t-r,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class zm extends yy{constructor(e=-1,t=1,r=1,a=-1,l=.1,c=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=r,this.bottom=a,this.near=l,this.far=c,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,r,a,l,c){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=r,this.view.offsetY=a,this.view.width=l,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),r=(this.right+this.left)/2,a=(this.top+this.bottom)/2;let l=r-e,c=r+e,d=a+t,h=a-t;if(this.view!==null&&this.view.enabled){const f=(this.right-this.left)/this.view.fullWidth/this.zoom,m=(this.top-this.bottom)/this.view.fullHeight/this.zoom;l+=f*this.view.offsetX,c=l+f*this.view.width,d-=m*this.view.offsetY,h=d-m*this.view.height}this.projectionMatrix.makeOrthographic(l,c,d,h,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class GT extends VT{constructor(){super(new zm(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Bf extends km{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(En.DEFAULT_UP),this.updateMatrix(),this.target=new En,this.shadow=new GT}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}class WT extends km{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}const ao=-90,oo=1;class jT extends En{constructor(e,t,r){super(),this.type="CubeCamera",this.renderTarget=r,this.coordinateSystem=null,this.activeMipmapLevel=0;const a=new Ii(ao,oo,e,t);a.layers=this.layers,this.add(a);const l=new Ii(ao,oo,e,t);l.layers=this.layers,this.add(l);const c=new Ii(ao,oo,e,t);c.layers=this.layers,this.add(c);const d=new Ii(ao,oo,e,t);d.layers=this.layers,this.add(d);const h=new Ii(ao,oo,e,t);h.layers=this.layers,this.add(h);const f=new Ii(ao,oo,e,t);f.layers=this.layers,this.add(f)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[r,a,l,c,d,h]=t;for(const f of t)this.remove(f);if(e===pr)r.up.set(0,1,0),r.lookAt(1,0,0),a.up.set(0,1,0),a.lookAt(-1,0,0),l.up.set(0,0,-1),l.lookAt(0,1,0),c.up.set(0,0,1),c.lookAt(0,-1,0),d.up.set(0,1,0),d.lookAt(0,0,1),h.up.set(0,1,0),h.lookAt(0,0,-1);else if(e===Xl)r.up.set(0,-1,0),r.lookAt(-1,0,0),a.up.set(0,-1,0),a.lookAt(1,0,0),l.up.set(0,0,1),l.lookAt(0,1,0),c.up.set(0,0,-1),c.lookAt(0,-1,0),d.up.set(0,-1,0),d.lookAt(0,0,1),h.up.set(0,-1,0),h.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const f of t)this.add(f),f.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:r,activeMipmapLevel:a}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[l,c,d,h,f,m]=this.children,g=e.getRenderTarget(),v=e.getActiveCubeFace(),S=e.getActiveMipmapLevel(),E=e.xr.enabled;e.xr.enabled=!1;const w=r.texture.generateMipmaps;r.texture.generateMipmaps=!1;let x=!1;e.isWebGLRenderer===!0?x=e.state.buffers.depth.getReversed():x=e.reversedDepthBuffer,e.setRenderTarget(r,0,a),x&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(r,1,a),x&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(r,2,a),x&&e.autoClear===!1&&e.clearDepth(),e.render(t,d),e.setRenderTarget(r,3,a),x&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(r,4,a),x&&e.autoClear===!1&&e.clearDepth(),e.render(t,f),r.texture.generateMipmaps=w,e.setRenderTarget(r,5,a),x&&e.autoClear===!1&&e.clearDepth(),e.render(t,m),e.setRenderTarget(g,v,S),e.xr.enabled=E,r.texture.needsPMREMUpdate=!0}}class XT extends Ii{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class Ex{constructor(e=1,t=0,r=0){this.radius=e,this.phi=t,this.theta=r}set(e,t,r){return this.radius=e,this.phi=t,this.theta=r,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Mt(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,r){return this.radius=Math.sqrt(e*e+t*t+r*r),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,r),this.phi=Math.acos(Mt(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}const jm=class jm{constructor(e,t,r,a){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,r,a)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let r=0;r<4;r++)this.elements[r]=e[r+t];return this}set(e,t,r,a){const l=this.elements;return l[0]=e,l[2]=t,l[1]=r,l[3]=a,this}};jm.prototype.isMatrix2=!0;let wx=jm;class $T extends Os{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){if(e===void 0){lt("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}}function Tx(i,e,t,r){const a=qT(r);switch(t){case oy:return i*e;case cy:return i*e/a.components*a.byteLength;case Nm:return i*e/a.components*a.byteLength;case Ea:return i*e*2/a.components*a.byteLength;case Lm:return i*e*2/a.components*a.byteLength;case ly:return i*e*3/a.components*a.byteLength;case Ki:return i*e*4/a.components*a.byteLength;case Dm:return i*e*4/a.components*a.byteLength;case ju:case Xu:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case $u:case qu:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case wp:case bp:return Math.max(i,16)*Math.max(e,8)/4;case Ep:case Tp:return Math.max(i,8)*Math.max(e,8)/2;case Cp:case Rp:case Pp:case Np:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Ap:case nd:case Lp:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Dp:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Ip:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case Up:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case Fp:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case Op:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case kp:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case zp:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case Bp:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case Hp:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case Vp:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case Gp:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Wp:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case jp:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case Xp:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case $p:case qp:case Yp:return Math.ceil(i/4)*Math.ceil(e/4)*16;case Kp:case Qp:return Math.ceil(i/4)*Math.ceil(e/4)*8;case id:case Zp:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function qT(i){switch(i){case Si:case iy:return{byteLength:1,components:1};case Wl:case ry:case $r:return{byteLength:2,components:1};case Am:case Pm:return{byteLength:2,components:4};case xr:case Rm:case fr:return{byteLength:4,components:1};case sy:case ay:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Tm}}));typeof window<"u"&&(window.__THREE__?lt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Tm);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Sy(){let i=null,e=!1,t=null,r=null;function a(l,c){t(l,c),r=i.requestAnimationFrame(a)}return{start:function(){e!==!0&&t!==null&&i!==null&&(r=i.requestAnimationFrame(a),e=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(r),e=!1},setAnimationLoop:function(l){t=l},setContext:function(l){i=l}}}function YT(i){const e=new WeakMap;function t(d,h){const f=d.array,m=d.usage,g=f.byteLength,v=i.createBuffer();i.bindBuffer(h,v),i.bufferData(h,f,m),d.onUploadCallback();let S;if(f instanceof Float32Array)S=i.FLOAT;else if(typeof Float16Array<"u"&&f instanceof Float16Array)S=i.HALF_FLOAT;else if(f instanceof Uint16Array)d.isFloat16BufferAttribute?S=i.HALF_FLOAT:S=i.UNSIGNED_SHORT;else if(f instanceof Int16Array)S=i.SHORT;else if(f instanceof Uint32Array)S=i.UNSIGNED_INT;else if(f instanceof Int32Array)S=i.INT;else if(f instanceof Int8Array)S=i.BYTE;else if(f instanceof Uint8Array)S=i.UNSIGNED_BYTE;else if(f instanceof Uint8ClampedArray)S=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+f);return{buffer:v,type:S,bytesPerElement:f.BYTES_PER_ELEMENT,version:d.version,size:g}}function r(d,h,f){const m=h.array,g=h.updateRanges;if(i.bindBuffer(f,d),g.length===0)i.bufferSubData(f,0,m);else{g.sort((S,E)=>S.start-E.start);let v=0;for(let S=1;S<g.length;S++){const E=g[v],w=g[S];w.start<=E.start+E.count+1?E.count=Math.max(E.count,w.start+w.count-E.start):(++v,g[v]=w)}g.length=v+1;for(let S=0,E=g.length;S<E;S++){const w=g[S];i.bufferSubData(f,w.start*m.BYTES_PER_ELEMENT,m,w.start,w.count)}h.clearUpdateRanges()}h.onUploadCallback()}function a(d){return d.isInterleavedBufferAttribute&&(d=d.data),e.get(d)}function l(d){d.isInterleavedBufferAttribute&&(d=d.data);const h=e.get(d);h&&(i.deleteBuffer(h.buffer),e.delete(d))}function c(d,h){if(d.isInterleavedBufferAttribute&&(d=d.data),d.isGLBufferAttribute){const m=e.get(d);(!m||m.version<d.version)&&e.set(d,{buffer:d.buffer,type:d.type,bytesPerElement:d.elementSize,version:d.version});return}const f=e.get(d);if(f===void 0)e.set(d,t(d,h));else if(f.version<d.version){if(f.size!==d.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");r(f.buffer,d,h),f.version=d.version}}return{get:a,remove:l,update:c}}var KT=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,QT=`#ifdef USE_ALPHAHASH
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
#endif`,ZT=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,JT=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,eb=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,tb=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,nb=`#ifdef USE_AOMAP
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
#endif`,ib=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,rb=`#ifdef USE_BATCHING
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
#endif`,sb=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,ab=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,ob=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,lb=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,cb=`#ifdef USE_IRIDESCENCE
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
#endif`,ub=`#ifdef USE_BUMPMAP
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
#endif`,db=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,hb=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,fb=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,pb=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,mb=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,gb=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,vb=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,xb=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,_b=`#define PI 3.141592653589793
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
} // validated`,yb=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,Sb=`vec3 transformedNormal = objectNormal;
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
#endif`,Mb=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Eb=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,wb=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Tb=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,bb="gl_FragColor = linearToOutputTexel( gl_FragColor );",Cb=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Rb=`#ifdef USE_ENVMAP
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
#endif`,Ab=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Pb=`#ifdef USE_ENVMAP
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
#endif`,Nb=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Lb=`#ifdef USE_ENVMAP
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
#endif`,Db=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Ib=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Ub=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Fb=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Ob=`#ifdef USE_GRADIENTMAP
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
}`,kb=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,zb=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Bb=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Hb=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,Vb=`#ifdef USE_ENVMAP
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
#endif`,Gb=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Wb=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,jb=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Xb=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,$b=`PhysicalMaterial material;
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
#endif`,qb=`uniform sampler2D dfgLUT;
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
}`,Yb=`
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
#endif`,Kb=`#if defined( RE_IndirectDiffuse )
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
#endif`,Qb=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Zb=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,Jb=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,eC=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,tC=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,nC=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,iC=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,rC=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,sC=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,aC=`#if defined( USE_POINTS_UV )
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
#endif`,oC=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,lC=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,cC=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,uC=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,dC=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,hC=`#ifdef USE_MORPHTARGETS
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
#endif`,fC=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,pC=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,mC=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,gC=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,vC=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,xC=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,_C=`#ifdef USE_NORMALMAP
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
#endif`,yC=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,SC=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,MC=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,EC=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,wC=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,TC=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,bC=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,CC=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,RC=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,AC=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,PC=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,NC=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,LC=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,DC=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,IC=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,UC=`float getShadowMask() {
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
}`,FC=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,OC=`#ifdef USE_SKINNING
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
#endif`,kC=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,zC=`#ifdef USE_SKINNING
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
#endif`,BC=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,HC=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,VC=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,GC=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,WC=`#ifdef USE_TRANSMISSION
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
#endif`,jC=`#ifdef USE_TRANSMISSION
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
#endif`,XC=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,$C=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,qC=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,YC=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const KC=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,QC=`uniform sampler2D t2D;
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
}`,ZC=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,JC=`#ifdef ENVMAP_TYPE_CUBE
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
}`,eR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,tR=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,nR=`#include <common>
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
}`,iR=`#if DEPTH_PACKING == 3200
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
}`,rR=`#define DISTANCE
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
}`,sR=`#define DISTANCE
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
}`,aR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,oR=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,lR=`uniform float scale;
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
}`,cR=`uniform vec3 diffuse;
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
}`,uR=`#include <common>
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
}`,dR=`uniform vec3 diffuse;
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
}`,hR=`#define LAMBERT
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
}`,fR=`#define LAMBERT
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
}`,pR=`#define MATCAP
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
}`,mR=`#define MATCAP
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
}`,gR=`#define NORMAL
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
}`,vR=`#define NORMAL
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
}`,xR=`#define PHONG
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
}`,_R=`#define PHONG
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
}`,yR=`#define STANDARD
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
}`,SR=`#define STANDARD
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
}`,MR=`#define TOON
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
}`,ER=`#define TOON
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
}`,wR=`uniform float size;
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
}`,TR=`uniform vec3 diffuse;
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
}`,bR=`#include <common>
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
}`,CR=`uniform vec3 color;
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
}`,RR=`uniform float rotation;
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
}`,AR=`uniform vec3 diffuse;
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
}`,vt={alphahash_fragment:KT,alphahash_pars_fragment:QT,alphamap_fragment:ZT,alphamap_pars_fragment:JT,alphatest_fragment:eb,alphatest_pars_fragment:tb,aomap_fragment:nb,aomap_pars_fragment:ib,batching_pars_vertex:rb,batching_vertex:sb,begin_vertex:ab,beginnormal_vertex:ob,bsdfs:lb,iridescence_fragment:cb,bumpmap_pars_fragment:ub,clipping_planes_fragment:db,clipping_planes_pars_fragment:hb,clipping_planes_pars_vertex:fb,clipping_planes_vertex:pb,color_fragment:mb,color_pars_fragment:gb,color_pars_vertex:vb,color_vertex:xb,common:_b,cube_uv_reflection_fragment:yb,defaultnormal_vertex:Sb,displacementmap_pars_vertex:Mb,displacementmap_vertex:Eb,emissivemap_fragment:wb,emissivemap_pars_fragment:Tb,colorspace_fragment:bb,colorspace_pars_fragment:Cb,envmap_fragment:Rb,envmap_common_pars_fragment:Ab,envmap_pars_fragment:Pb,envmap_pars_vertex:Nb,envmap_physical_pars_fragment:Vb,envmap_vertex:Lb,fog_vertex:Db,fog_pars_vertex:Ib,fog_fragment:Ub,fog_pars_fragment:Fb,gradientmap_pars_fragment:Ob,lightmap_pars_fragment:kb,lights_lambert_fragment:zb,lights_lambert_pars_fragment:Bb,lights_pars_begin:Hb,lights_toon_fragment:Gb,lights_toon_pars_fragment:Wb,lights_phong_fragment:jb,lights_phong_pars_fragment:Xb,lights_physical_fragment:$b,lights_physical_pars_fragment:qb,lights_fragment_begin:Yb,lights_fragment_maps:Kb,lights_fragment_end:Qb,lightprobes_pars_fragment:Zb,logdepthbuf_fragment:Jb,logdepthbuf_pars_fragment:eC,logdepthbuf_pars_vertex:tC,logdepthbuf_vertex:nC,map_fragment:iC,map_pars_fragment:rC,map_particle_fragment:sC,map_particle_pars_fragment:aC,metalnessmap_fragment:oC,metalnessmap_pars_fragment:lC,morphinstance_vertex:cC,morphcolor_vertex:uC,morphnormal_vertex:dC,morphtarget_pars_vertex:hC,morphtarget_vertex:fC,normal_fragment_begin:pC,normal_fragment_maps:mC,normal_pars_fragment:gC,normal_pars_vertex:vC,normal_vertex:xC,normalmap_pars_fragment:_C,clearcoat_normal_fragment_begin:yC,clearcoat_normal_fragment_maps:SC,clearcoat_pars_fragment:MC,iridescence_pars_fragment:EC,opaque_fragment:wC,packing:TC,premultiplied_alpha_fragment:bC,project_vertex:CC,dithering_fragment:RC,dithering_pars_fragment:AC,roughnessmap_fragment:PC,roughnessmap_pars_fragment:NC,shadowmap_pars_fragment:LC,shadowmap_pars_vertex:DC,shadowmap_vertex:IC,shadowmask_pars_fragment:UC,skinbase_vertex:FC,skinning_pars_vertex:OC,skinning_vertex:kC,skinnormal_vertex:zC,specularmap_fragment:BC,specularmap_pars_fragment:HC,tonemapping_fragment:VC,tonemapping_pars_fragment:GC,transmission_fragment:WC,transmission_pars_fragment:jC,uv_pars_fragment:XC,uv_pars_vertex:$C,uv_vertex:qC,worldpos_vertex:YC,background_vert:KC,background_frag:QC,backgroundCube_vert:ZC,backgroundCube_frag:JC,cube_vert:eR,cube_frag:tR,depth_vert:nR,depth_frag:iR,distance_vert:rR,distance_frag:sR,equirect_vert:aR,equirect_frag:oR,linedashed_vert:lR,linedashed_frag:cR,meshbasic_vert:uR,meshbasic_frag:dR,meshlambert_vert:hR,meshlambert_frag:fR,meshmatcap_vert:pR,meshmatcap_frag:mR,meshnormal_vert:gR,meshnormal_frag:vR,meshphong_vert:xR,meshphong_frag:_R,meshphysical_vert:yR,meshphysical_frag:SR,meshtoon_vert:MR,meshtoon_frag:ER,points_vert:wR,points_frag:TR,shadow_vert:bR,shadow_frag:CR,sprite_vert:RR,sprite_frag:AR},ze={common:{diffuse:{value:new gt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new pt},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new pt}},envmap:{envMap:{value:null},envMapRotation:{value:new pt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new pt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new pt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new pt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new pt},normalScale:{value:new dt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new pt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new pt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new pt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new pt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new gt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new ee},probesMax:{value:new ee},probesResolution:{value:new ee}},points:{diffuse:{value:new gt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0},uvTransform:{value:new pt}},sprite:{diffuse:{value:new gt(16777215)},opacity:{value:1},center:{value:new dt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new pt},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0}}},dr={basic:{uniforms:Yn([ze.common,ze.specularmap,ze.envmap,ze.aomap,ze.lightmap,ze.fog]),vertexShader:vt.meshbasic_vert,fragmentShader:vt.meshbasic_frag},lambert:{uniforms:Yn([ze.common,ze.specularmap,ze.envmap,ze.aomap,ze.lightmap,ze.emissivemap,ze.bumpmap,ze.normalmap,ze.displacementmap,ze.fog,ze.lights,{emissive:{value:new gt(0)},envMapIntensity:{value:1}}]),vertexShader:vt.meshlambert_vert,fragmentShader:vt.meshlambert_frag},phong:{uniforms:Yn([ze.common,ze.specularmap,ze.envmap,ze.aomap,ze.lightmap,ze.emissivemap,ze.bumpmap,ze.normalmap,ze.displacementmap,ze.fog,ze.lights,{emissive:{value:new gt(0)},specular:{value:new gt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:vt.meshphong_vert,fragmentShader:vt.meshphong_frag},standard:{uniforms:Yn([ze.common,ze.envmap,ze.aomap,ze.lightmap,ze.emissivemap,ze.bumpmap,ze.normalmap,ze.displacementmap,ze.roughnessmap,ze.metalnessmap,ze.fog,ze.lights,{emissive:{value:new gt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:vt.meshphysical_vert,fragmentShader:vt.meshphysical_frag},toon:{uniforms:Yn([ze.common,ze.aomap,ze.lightmap,ze.emissivemap,ze.bumpmap,ze.normalmap,ze.displacementmap,ze.gradientmap,ze.fog,ze.lights,{emissive:{value:new gt(0)}}]),vertexShader:vt.meshtoon_vert,fragmentShader:vt.meshtoon_frag},matcap:{uniforms:Yn([ze.common,ze.bumpmap,ze.normalmap,ze.displacementmap,ze.fog,{matcap:{value:null}}]),vertexShader:vt.meshmatcap_vert,fragmentShader:vt.meshmatcap_frag},points:{uniforms:Yn([ze.points,ze.fog]),vertexShader:vt.points_vert,fragmentShader:vt.points_frag},dashed:{uniforms:Yn([ze.common,ze.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:vt.linedashed_vert,fragmentShader:vt.linedashed_frag},depth:{uniforms:Yn([ze.common,ze.displacementmap]),vertexShader:vt.depth_vert,fragmentShader:vt.depth_frag},normal:{uniforms:Yn([ze.common,ze.bumpmap,ze.normalmap,ze.displacementmap,{opacity:{value:1}}]),vertexShader:vt.meshnormal_vert,fragmentShader:vt.meshnormal_frag},sprite:{uniforms:Yn([ze.sprite,ze.fog]),vertexShader:vt.sprite_vert,fragmentShader:vt.sprite_frag},background:{uniforms:{uvTransform:{value:new pt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:vt.background_vert,fragmentShader:vt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new pt}},vertexShader:vt.backgroundCube_vert,fragmentShader:vt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:vt.cube_vert,fragmentShader:vt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:vt.equirect_vert,fragmentShader:vt.equirect_frag},distance:{uniforms:Yn([ze.common,ze.displacementmap,{referencePosition:{value:new ee},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:vt.distance_vert,fragmentShader:vt.distance_frag},shadow:{uniforms:Yn([ze.lights,ze.fog,{color:{value:new gt(0)},opacity:{value:1}}]),vertexShader:vt.shadow_vert,fragmentShader:vt.shadow_frag}};dr.physical={uniforms:Yn([dr.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new pt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new pt},clearcoatNormalScale:{value:new dt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new pt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new pt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new pt},sheen:{value:0},sheenColor:{value:new gt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new pt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new pt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new pt},transmissionSamplerSize:{value:new dt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new pt},attenuationDistance:{value:0},attenuationColor:{value:new gt(0)},specularColor:{value:new gt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new pt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new pt},anisotropyVector:{value:new dt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new pt}}]),vertexShader:vt.meshphysical_vert,fragmentShader:vt.meshphysical_frag};const Ou={r:0,b:0,g:0},PR=new rn,My=new pt;My.set(-1,0,0,0,1,0,0,0,1);function NR(i,e,t,r,a,l){const c=new gt(0);let d=a===!0?0:1,h,f,m=null,g=0,v=null;function S(N){let P=N.isScene===!0?N.background:null;if(P&&P.isTexture){const C=N.backgroundBlurriness>0;P=e.get(P,C)}return P}function E(N){let P=!1;const C=S(N);C===null?x(c,d):C&&C.isColor&&(x(C,1),P=!0);const D=i.xr.getEnvironmentBlendMode();D==="additive"?t.buffers.color.setClear(0,0,0,1,l):D==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,l),(i.autoClear||P)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function w(N,P){const C=S(P);C&&(C.isCubeTexture||C.mapping===md)?(f===void 0&&(f=new Zi(new ic(1,1,1),new yr({name:"BackgroundCubeMaterial",uniforms:Uo(dr.backgroundCube.uniforms),vertexShader:dr.backgroundCube.vertexShader,fragmentShader:dr.backgroundCube.fragmentShader,side:hi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),f.geometry.deleteAttribute("normal"),f.geometry.deleteAttribute("uv"),f.onBeforeRender=function(D,L,F){this.matrixWorld.copyPosition(F.matrixWorld)},Object.defineProperty(f.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(f)),f.material.uniforms.envMap.value=C,f.material.uniforms.backgroundBlurriness.value=P.backgroundBlurriness,f.material.uniforms.backgroundIntensity.value=P.backgroundIntensity,f.material.uniforms.backgroundRotation.value.setFromMatrix4(PR.makeRotationFromEuler(P.backgroundRotation)).transpose(),C.isCubeTexture&&C.isRenderTargetTexture===!1&&f.material.uniforms.backgroundRotation.value.premultiply(My),f.material.toneMapped=bt.getTransfer(C.colorSpace)!==Bt,(m!==C||g!==C.version||v!==i.toneMapping)&&(f.material.needsUpdate=!0,m=C,g=C.version,v=i.toneMapping),f.layers.enableAll(),N.unshift(f,f.geometry,f.material,0,0,null)):C&&C.isTexture&&(h===void 0&&(h=new Zi(new vd(2,2),new yr({name:"BackgroundMaterial",uniforms:Uo(dr.background.uniforms),vertexShader:dr.background.vertexShader,fragmentShader:dr.background.fragmentShader,side:Us,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),Object.defineProperty(h.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(h)),h.material.uniforms.t2D.value=C,h.material.uniforms.backgroundIntensity.value=P.backgroundIntensity,h.material.toneMapped=bt.getTransfer(C.colorSpace)!==Bt,C.matrixAutoUpdate===!0&&C.updateMatrix(),h.material.uniforms.uvTransform.value.copy(C.matrix),(m!==C||g!==C.version||v!==i.toneMapping)&&(h.material.needsUpdate=!0,m=C,g=C.version,v=i.toneMapping),h.layers.enableAll(),N.unshift(h,h.geometry,h.material,0,0,null))}function x(N,P){N.getRGB(Ou,_y(i)),t.buffers.color.setClear(Ou.r,Ou.g,Ou.b,P,l)}function y(){f!==void 0&&(f.geometry.dispose(),f.material.dispose(),f=void 0),h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0)}return{getClearColor:function(){return c},setClearColor:function(N,P=1){c.set(N),d=P,x(c,d)},getClearAlpha:function(){return d},setClearAlpha:function(N){d=N,x(c,d)},render:E,addToRenderList:w,dispose:y}}function LR(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),r={},a=v(null);let l=a,c=!1;function d(H,K,re,fe,O){let ce=!1;const Z=g(H,fe,re,K);l!==Z&&(l=Z,f(l.object)),ce=S(H,fe,re,O),ce&&E(H,fe,re,O),O!==null&&e.update(O,i.ELEMENT_ARRAY_BUFFER),(ce||c)&&(c=!1,C(H,K,re,fe),O!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(O).buffer))}function h(){return i.createVertexArray()}function f(H){return i.bindVertexArray(H)}function m(H){return i.deleteVertexArray(H)}function g(H,K,re,fe){const O=fe.wireframe===!0;let ce=r[K.id];ce===void 0&&(ce={},r[K.id]=ce);const Z=H.isInstancedMesh===!0?H.id:0;let q=ce[Z];q===void 0&&(q={},ce[Z]=q);let ue=q[re.id];ue===void 0&&(ue={},q[re.id]=ue);let he=ue[O];return he===void 0&&(he=v(h()),ue[O]=he),he}function v(H){const K=[],re=[],fe=[];for(let O=0;O<t;O++)K[O]=0,re[O]=0,fe[O]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:K,enabledAttributes:re,attributeDivisors:fe,object:H,attributes:{},index:null}}function S(H,K,re,fe){const O=l.attributes,ce=K.attributes;let Z=0;const q=re.getAttributes();for(const ue in q)if(q[ue].location>=0){const k=O[ue];let X=ce[ue];if(X===void 0&&(ue==="instanceMatrix"&&H.instanceMatrix&&(X=H.instanceMatrix),ue==="instanceColor"&&H.instanceColor&&(X=H.instanceColor)),k===void 0||k.attribute!==X||X&&k.data!==X.data)return!0;Z++}return l.attributesNum!==Z||l.index!==fe}function E(H,K,re,fe){const O={},ce=K.attributes;let Z=0;const q=re.getAttributes();for(const ue in q)if(q[ue].location>=0){let k=ce[ue];k===void 0&&(ue==="instanceMatrix"&&H.instanceMatrix&&(k=H.instanceMatrix),ue==="instanceColor"&&H.instanceColor&&(k=H.instanceColor));const X={};X.attribute=k,k&&k.data&&(X.data=k.data),O[ue]=X,Z++}l.attributes=O,l.attributesNum=Z,l.index=fe}function w(){const H=l.newAttributes;for(let K=0,re=H.length;K<re;K++)H[K]=0}function x(H){y(H,0)}function y(H,K){const re=l.newAttributes,fe=l.enabledAttributes,O=l.attributeDivisors;re[H]=1,fe[H]===0&&(i.enableVertexAttribArray(H),fe[H]=1),O[H]!==K&&(i.vertexAttribDivisor(H,K),O[H]=K)}function N(){const H=l.newAttributes,K=l.enabledAttributes;for(let re=0,fe=K.length;re<fe;re++)K[re]!==H[re]&&(i.disableVertexAttribArray(re),K[re]=0)}function P(H,K,re,fe,O,ce,Z){Z===!0?i.vertexAttribIPointer(H,K,re,O,ce):i.vertexAttribPointer(H,K,re,fe,O,ce)}function C(H,K,re,fe){w();const O=fe.attributes,ce=re.getAttributes(),Z=K.defaultAttributeValues;for(const q in ce){const ue=ce[q];if(ue.location>=0){let he=O[q];if(he===void 0&&(q==="instanceMatrix"&&H.instanceMatrix&&(he=H.instanceMatrix),q==="instanceColor"&&H.instanceColor&&(he=H.instanceColor)),he!==void 0){const k=he.normalized,X=he.itemSize,Fe=e.get(he);if(Fe===void 0)continue;const je=Fe.buffer,Ge=Fe.type,de=Fe.bytesPerElement,Se=Ge===i.INT||Ge===i.UNSIGNED_INT||he.gpuType===Rm;if(he.isInterleavedBufferAttribute){const xe=he.data,te=xe.stride,Ue=he.offset;if(xe.isInstancedInterleavedBuffer){for(let tt=0;tt<ue.locationSize;tt++)y(ue.location+tt,xe.meshPerAttribute);H.isInstancedMesh!==!0&&fe._maxInstanceCount===void 0&&(fe._maxInstanceCount=xe.meshPerAttribute*xe.count)}else for(let tt=0;tt<ue.locationSize;tt++)x(ue.location+tt);i.bindBuffer(i.ARRAY_BUFFER,je);for(let tt=0;tt<ue.locationSize;tt++)P(ue.location+tt,X/ue.locationSize,Ge,k,te*de,(Ue+X/ue.locationSize*tt)*de,Se)}else{if(he.isInstancedBufferAttribute){for(let xe=0;xe<ue.locationSize;xe++)y(ue.location+xe,he.meshPerAttribute);H.isInstancedMesh!==!0&&fe._maxInstanceCount===void 0&&(fe._maxInstanceCount=he.meshPerAttribute*he.count)}else for(let xe=0;xe<ue.locationSize;xe++)x(ue.location+xe);i.bindBuffer(i.ARRAY_BUFFER,je);for(let xe=0;xe<ue.locationSize;xe++)P(ue.location+xe,X/ue.locationSize,Ge,k,X*de,X/ue.locationSize*xe*de,Se)}}else if(Z!==void 0){const k=Z[q];if(k!==void 0)switch(k.length){case 2:i.vertexAttrib2fv(ue.location,k);break;case 3:i.vertexAttrib3fv(ue.location,k);break;case 4:i.vertexAttrib4fv(ue.location,k);break;default:i.vertexAttrib1fv(ue.location,k)}}}}N()}function D(){I();for(const H in r){const K=r[H];for(const re in K){const fe=K[re];for(const O in fe){const ce=fe[O];for(const Z in ce)m(ce[Z].object),delete ce[Z];delete fe[O]}}delete r[H]}}function L(H){if(r[H.id]===void 0)return;const K=r[H.id];for(const re in K){const fe=K[re];for(const O in fe){const ce=fe[O];for(const Z in ce)m(ce[Z].object),delete ce[Z];delete fe[O]}}delete r[H.id]}function F(H){for(const K in r){const re=r[K];for(const fe in re){const O=re[fe];if(O[H.id]===void 0)continue;const ce=O[H.id];for(const Z in ce)m(ce[Z].object),delete ce[Z];delete O[H.id]}}}function T(H){for(const K in r){const re=r[K],fe=H.isInstancedMesh===!0?H.id:0,O=re[fe];if(O!==void 0){for(const ce in O){const Z=O[ce];for(const q in Z)m(Z[q].object),delete Z[q];delete O[ce]}delete re[fe],Object.keys(re).length===0&&delete r[K]}}}function I(){G(),c=!0,l!==a&&(l=a,f(l.object))}function G(){a.geometry=null,a.program=null,a.wireframe=!1}return{setup:d,reset:I,resetDefaultState:G,dispose:D,releaseStatesOfGeometry:L,releaseStatesOfObject:T,releaseStatesOfProgram:F,initAttributes:w,enableAttribute:x,disableUnusedAttributes:N}}function DR(i,e,t){let r;function a(h){r=h}function l(h,f){i.drawArrays(r,h,f),t.update(f,r,1)}function c(h,f,m){m!==0&&(i.drawArraysInstanced(r,h,f,m),t.update(f,r,m))}function d(h,f,m){if(m===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(r,h,0,f,0,m);let v=0;for(let S=0;S<m;S++)v+=f[S];t.update(v,r,1)}this.setMode=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=d}function IR(i,e,t,r){let a;function l(){if(a!==void 0)return a;if(e.has("EXT_texture_filter_anisotropic")===!0){const F=e.get("EXT_texture_filter_anisotropic");a=i.getParameter(F.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else a=0;return a}function c(F){return!(F!==Ki&&r.convert(F)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function d(F){const T=F===$r&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(F!==Si&&r.convert(F)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&F!==fr&&!T)}function h(F){if(F==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";F="mediump"}return F==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let f=t.precision!==void 0?t.precision:"highp";const m=h(f);m!==f&&(lt("WebGLRenderer:",f,"not supported, using",m,"instead."),f=m);const g=t.logarithmicDepthBuffer===!0,v=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&v===!1&&lt("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const S=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),E=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),w=i.getParameter(i.MAX_TEXTURE_SIZE),x=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),y=i.getParameter(i.MAX_VERTEX_ATTRIBS),N=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),P=i.getParameter(i.MAX_VARYING_VECTORS),C=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),D=i.getParameter(i.MAX_SAMPLES),L=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:l,getMaxPrecision:h,textureFormatReadable:c,textureTypeReadable:d,precision:f,logarithmicDepthBuffer:g,reversedDepthBuffer:v,maxTextures:S,maxVertexTextures:E,maxTextureSize:w,maxCubemapSize:x,maxAttributes:y,maxVertexUniforms:N,maxVaryings:P,maxFragmentUniforms:C,maxSamples:D,samples:L}}function UR(i){const e=this;let t=null,r=0,a=!1,l=!1;const c=new Ms,d=new pt,h={value:null,needsUpdate:!1};this.uniform=h,this.numPlanes=0,this.numIntersection=0,this.init=function(g,v){const S=g.length!==0||v||r!==0||a;return a=v,r=g.length,S},this.beginShadows=function(){l=!0,m(null)},this.endShadows=function(){l=!1},this.setGlobalState=function(g,v){t=m(g,v,0)},this.setState=function(g,v,S){const E=g.clippingPlanes,w=g.clipIntersection,x=g.clipShadows,y=i.get(g);if(!a||E===null||E.length===0||l&&!x)l?m(null):f();else{const N=l?0:r,P=N*4;let C=y.clippingState||null;h.value=C,C=m(E,v,P,S);for(let D=0;D!==P;++D)C[D]=t[D];y.clippingState=C,this.numIntersection=w?this.numPlanes:0,this.numPlanes+=N}};function f(){h.value!==t&&(h.value=t,h.needsUpdate=r>0),e.numPlanes=r,e.numIntersection=0}function m(g,v,S,E){const w=g!==null?g.length:0;let x=null;if(w!==0){if(x=h.value,E!==!0||x===null){const y=S+w*4,N=v.matrixWorldInverse;d.getNormalMatrix(N),(x===null||x.length<y)&&(x=new Float32Array(y));for(let P=0,C=S;P!==w;++P,C+=4)c.copy(g[P]).applyMatrix4(N,d),c.normal.toArray(x,C),x[C+3]=c.constant}h.value=x,h.needsUpdate=!0}return e.numPlanes=w,e.numIntersection=0,x}}const Ds=4,bx=[.125,.215,.35,.446,.526,.582],oa=20,FR=256,Ll=new zm,Cx=new gt;let Hf=null,Vf=0,Gf=0,Wf=!1;const OR=new ee;class Rx{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,r=.1,a=100,l={}){const{size:c=256,position:d=OR}=l;Hf=this._renderer.getRenderTarget(),Vf=this._renderer.getActiveCubeFace(),Gf=this._renderer.getActiveMipmapLevel(),Wf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(c);const h=this._allocateTargets();return h.depthBuffer=!0,this._sceneToCubeUV(e,r,a,h,d),t>0&&this._blur(h,0,0,t),this._applyPMREM(h),this._cleanup(h),h}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Nx(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Px(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Hf,Vf,Gf),this._renderer.xr.enabled=Wf,e.scissorTest=!1,lo(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Ma||e.mapping===Do?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Hf=this._renderer.getRenderTarget(),Vf=this._renderer.getActiveCubeFace(),Gf=this._renderer.getActiveMipmapLevel(),Wf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const r=t||this._allocateTargets();return this._textureToCubeUV(e,r),this._applyPMREM(r),this._cleanup(r),r}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,r={magFilter:Wn,minFilter:Wn,generateMipmaps:!1,type:$r,format:Ki,colorSpace:sd,depthBuffer:!1},a=Ax(e,t,r);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Ax(e,t,r);const{_lodMax:l}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=kR(l)),this._blurMaterial=BR(l,e,t),this._ggxMaterial=zR(l,e,t)}return a}_compileMaterial(e){const t=new Zi(new Mi,e);this._renderer.compile(t,Ll)}_sceneToCubeUV(e,t,r,a,l){const h=new Ii(90,1,t,r),f=[1,-1,1,1,1,1],m=[1,1,1,-1,-1,-1],g=this._renderer,v=g.autoClear,S=g.toneMapping;g.getClearColor(Cx),g.toneMapping=mr,g.autoClear=!1,g.state.buffers.depth.getReversed()&&(g.setRenderTarget(a),g.clearDepth(),g.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Zi(new ic,new gy({name:"PMREM.Background",side:hi,depthWrite:!1,depthTest:!1})));const w=this._backgroundBox,x=w.material;let y=!1;const N=e.background;N?N.isColor&&(x.color.copy(N),e.background=null,y=!0):(x.color.copy(Cx),y=!0);for(let P=0;P<6;P++){const C=P%3;C===0?(h.up.set(0,f[P],0),h.position.set(l.x,l.y,l.z),h.lookAt(l.x+m[P],l.y,l.z)):C===1?(h.up.set(0,0,f[P]),h.position.set(l.x,l.y,l.z),h.lookAt(l.x,l.y+m[P],l.z)):(h.up.set(0,f[P],0),h.position.set(l.x,l.y,l.z),h.lookAt(l.x,l.y,l.z+m[P]));const D=this._cubeSize;lo(a,C*D,P>2?D:0,D,D),g.setRenderTarget(a),y&&g.render(w,h),g.render(e,h)}g.toneMapping=S,g.autoClear=v,e.background=N}_textureToCubeUV(e,t){const r=this._renderer,a=e.mapping===Ma||e.mapping===Do;a?(this._cubemapMaterial===null&&(this._cubemapMaterial=Nx()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Px());const l=a?this._cubemapMaterial:this._equirectMaterial,c=this._lodMeshes[0];c.material=l;const d=l.uniforms;d.envMap.value=e;const h=this._cubeSize;lo(t,0,0,3*h,2*h),r.setRenderTarget(t),r.render(c,Ll)}_applyPMREM(e){const t=this._renderer,r=t.autoClear;t.autoClear=!1;const a=this._lodMeshes.length;for(let l=1;l<a;l++)this._applyGGXFilter(e,l-1,l);t.autoClear=r}_applyGGXFilter(e,t,r){const a=this._renderer,l=this._pingPongRenderTarget,c=this._ggxMaterial,d=this._lodMeshes[r];d.material=c;const h=c.uniforms,f=r/(this._lodMeshes.length-1),m=t/(this._lodMeshes.length-1),g=Math.sqrt(f*f-m*m),v=0+f*1.25,S=g*v,{_lodMax:E}=this,w=this._sizeLods[r],x=3*w*(r>E-Ds?r-E+Ds:0),y=4*(this._cubeSize-w);h.envMap.value=e.texture,h.roughness.value=S,h.mipInt.value=E-t,lo(l,x,y,3*w,2*w),a.setRenderTarget(l),a.render(d,Ll),h.envMap.value=l.texture,h.roughness.value=0,h.mipInt.value=E-r,lo(e,x,y,3*w,2*w),a.setRenderTarget(e),a.render(d,Ll)}_blur(e,t,r,a,l){const c=this._pingPongRenderTarget;this._halfBlur(e,c,t,r,a,"latitudinal",l),this._halfBlur(c,e,r,r,a,"longitudinal",l)}_halfBlur(e,t,r,a,l,c,d){const h=this._renderer,f=this._blurMaterial;c!=="latitudinal"&&c!=="longitudinal"&&Nt("blur direction must be either latitudinal or longitudinal!");const m=3,g=this._lodMeshes[a];g.material=f;const v=f.uniforms,S=this._sizeLods[r]-1,E=isFinite(l)?Math.PI/(2*S):2*Math.PI/(2*oa-1),w=l/E,x=isFinite(l)?1+Math.floor(m*w):oa;x>oa&&lt(`sigmaRadians, ${l}, is too large and will clip, as it requested ${x} samples when the maximum is set to ${oa}`);const y=[];let N=0;for(let F=0;F<oa;++F){const T=F/w,I=Math.exp(-T*T/2);y.push(I),F===0?N+=I:F<x&&(N+=2*I)}for(let F=0;F<y.length;F++)y[F]=y[F]/N;v.envMap.value=e.texture,v.samples.value=x,v.weights.value=y,v.latitudinal.value=c==="latitudinal",d&&(v.poleAxis.value=d);const{_lodMax:P}=this;v.dTheta.value=E,v.mipInt.value=P-r;const C=this._sizeLods[a],D=3*C*(a>P-Ds?a-P+Ds:0),L=4*(this._cubeSize-C);lo(t,D,L,3*C,2*C),h.setRenderTarget(t),h.render(g,Ll)}}function kR(i){const e=[],t=[],r=[];let a=i;const l=i-Ds+1+bx.length;for(let c=0;c<l;c++){const d=Math.pow(2,a);e.push(d);let h=1/d;c>i-Ds?h=bx[c-i+Ds-1]:c===0&&(h=0),t.push(h);const f=1/(d-2),m=-f,g=1+f,v=[m,m,g,m,g,g,m,m,g,g,m,g],S=6,E=6,w=3,x=2,y=1,N=new Float32Array(w*E*S),P=new Float32Array(x*E*S),C=new Float32Array(y*E*S);for(let L=0;L<S;L++){const F=L%3*2/3-1,T=L>2?0:-1,I=[F,T,0,F+2/3,T,0,F+2/3,T+1,0,F,T,0,F+2/3,T+1,0,F,T+1,0];N.set(I,w*E*L),P.set(v,x*E*L);const G=[L,L,L,L,L,L];C.set(G,y*E*L)}const D=new Mi;D.setAttribute("position",new vr(N,w)),D.setAttribute("uv",new vr(P,x)),D.setAttribute("faceIndex",new vr(C,y)),r.push(new Zi(D,null)),a>Ds&&a--}return{lodMeshes:r,sizeLods:e,sigmas:t}}function Ax(i,e,t){const r=new gr(i,e,t);return r.texture.mapping=md,r.texture.name="PMREM.cubeUv",r.scissorTest=!0,r}function lo(i,e,t,r,a){i.viewport.set(e,t,r,a),i.scissor.set(e,t,r,a)}function zR(i,e,t){return new yr({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:FR,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:xd(),fragmentShader:`

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
		`,blending:Gr,depthTest:!1,depthWrite:!1})}function BR(i,e,t){const r=new Float32Array(oa),a=new ee(0,1,0);return new yr({name:"SphericalGaussianBlur",defines:{n:oa,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:r},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:a}},vertexShader:xd(),fragmentShader:`

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
		`,blending:Gr,depthTest:!1,depthWrite:!1})}function Px(){return new yr({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:xd(),fragmentShader:`

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
		`,blending:Gr,depthTest:!1,depthWrite:!1})}function Nx(){return new yr({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:xd(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Gr,depthTest:!1,depthWrite:!1})}function xd(){return`

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
	`}class Ey extends gr{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const r={width:e,height:e,depth:1},a=[r,r,r,r,r,r];this.texture=new vy(a),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const r={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},a=new ic(5,5,5),l=new yr({name:"CubemapFromEquirect",uniforms:Uo(r.uniforms),vertexShader:r.vertexShader,fragmentShader:r.fragmentShader,side:hi,blending:Gr});l.uniforms.tEquirect.value=t;const c=new Zi(a,l),d=t.minFilter;return t.minFilter===ua&&(t.minFilter=Wn),new jT(1,10,this).update(e,c),t.minFilter=d,c.geometry.dispose(),c.material.dispose(),this}clear(e,t=!0,r=!0,a=!0){const l=e.getRenderTarget();for(let c=0;c<6;c++)e.setRenderTarget(this,c),e.clear(t,r,a);e.setRenderTarget(l)}}function HR(i){let e=new WeakMap,t=new WeakMap,r=null;function a(v,S=!1){return v==null?null:S?c(v):l(v)}function l(v){if(v&&v.isTexture){const S=v.mapping;if(S===uf||S===df)if(e.has(v)){const E=e.get(v).texture;return d(E,v.mapping)}else{const E=v.image;if(E&&E.height>0){const w=new Ey(E.height);return w.fromEquirectangularTexture(i,v),e.set(v,w),v.addEventListener("dispose",f),d(w.texture,v.mapping)}else return null}}return v}function c(v){if(v&&v.isTexture){const S=v.mapping,E=S===uf||S===df,w=S===Ma||S===Do;if(E||w){let x=t.get(v);const y=x!==void 0?x.texture.pmremVersion:0;if(v.isRenderTargetTexture&&v.pmremVersion!==y)return r===null&&(r=new Rx(i)),x=E?r.fromEquirectangular(v,x):r.fromCubemap(v,x),x.texture.pmremVersion=v.pmremVersion,t.set(v,x),x.texture;if(x!==void 0)return x.texture;{const N=v.image;return E&&N&&N.height>0||w&&N&&h(N)?(r===null&&(r=new Rx(i)),x=E?r.fromEquirectangular(v):r.fromCubemap(v),x.texture.pmremVersion=v.pmremVersion,t.set(v,x),v.addEventListener("dispose",m),x.texture):null}}}return v}function d(v,S){return S===uf?v.mapping=Ma:S===df&&(v.mapping=Do),v}function h(v){let S=0;const E=6;for(let w=0;w<E;w++)v[w]!==void 0&&S++;return S===E}function f(v){const S=v.target;S.removeEventListener("dispose",f);const E=e.get(S);E!==void 0&&(e.delete(S),E.dispose())}function m(v){const S=v.target;S.removeEventListener("dispose",m);const E=t.get(S);E!==void 0&&(t.delete(S),E.dispose())}function g(){e=new WeakMap,t=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:a,dispose:g}}function VR(i){const e={};function t(r){if(e[r]!==void 0)return e[r];const a=i.getExtension(r);return e[r]=a,a}return{has:function(r){return t(r)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(r){const a=t(r);return a===null&&go("WebGLRenderer: "+r+" extension not supported."),a}}}function GR(i,e,t,r){const a={},l=new WeakMap;function c(g){const v=g.target;v.index!==null&&e.remove(v.index);for(const E in v.attributes)e.remove(v.attributes[E]);v.removeEventListener("dispose",c),delete a[v.id];const S=l.get(v);S&&(e.remove(S),l.delete(v)),r.releaseStatesOfGeometry(v),v.isInstancedBufferGeometry===!0&&delete v._maxInstanceCount,t.memory.geometries--}function d(g,v){return a[v.id]===!0||(v.addEventListener("dispose",c),a[v.id]=!0,t.memory.geometries++),v}function h(g){const v=g.attributes;for(const S in v)e.update(v[S],i.ARRAY_BUFFER)}function f(g){const v=[],S=g.index,E=g.attributes.position;let w=0;if(E===void 0)return;if(S!==null){const N=S.array;w=S.version;for(let P=0,C=N.length;P<C;P+=3){const D=N[P+0],L=N[P+1],F=N[P+2];v.push(D,L,L,F,F,D)}}else{const N=E.array;w=E.version;for(let P=0,C=N.length/3-1;P<C;P+=3){const D=P+0,L=P+1,F=P+2;v.push(D,L,L,F,F,D)}}const x=new(E.count>=65535?my:py)(v,1);x.version=w;const y=l.get(g);y&&e.remove(y),l.set(g,x)}function m(g){const v=l.get(g);if(v){const S=g.index;S!==null&&v.version<S.version&&f(g)}else f(g);return l.get(g)}return{get:d,update:h,getWireframeAttribute:m}}function WR(i,e,t){let r;function a(g){r=g}let l,c;function d(g){l=g.type,c=g.bytesPerElement}function h(g,v){i.drawElements(r,v,l,g*c),t.update(v,r,1)}function f(g,v,S){S!==0&&(i.drawElementsInstanced(r,v,l,g*c,S),t.update(v,r,S))}function m(g,v,S){if(S===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(r,v,0,l,g,0,S);let w=0;for(let x=0;x<S;x++)w+=v[x];t.update(w,r,1)}this.setMode=a,this.setIndex=d,this.render=h,this.renderInstances=f,this.renderMultiDraw=m}function jR(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function r(l,c,d){switch(t.calls++,c){case i.TRIANGLES:t.triangles+=d*(l/3);break;case i.LINES:t.lines+=d*(l/2);break;case i.LINE_STRIP:t.lines+=d*(l-1);break;case i.LINE_LOOP:t.lines+=d*l;break;case i.POINTS:t.points+=d*l;break;default:Nt("WebGLInfo: Unknown draw mode:",c);break}}function a(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:a,update:r}}function XR(i,e,t){const r=new WeakMap,a=new ln;function l(c,d,h){const f=c.morphTargetInfluences,m=d.morphAttributes.position||d.morphAttributes.normal||d.morphAttributes.color,g=m!==void 0?m.length:0;let v=r.get(d);if(v===void 0||v.count!==g){let G=function(){T.dispose(),r.delete(d),d.removeEventListener("dispose",G)};var S=G;v!==void 0&&v.texture.dispose();const E=d.morphAttributes.position!==void 0,w=d.morphAttributes.normal!==void 0,x=d.morphAttributes.color!==void 0,y=d.morphAttributes.position||[],N=d.morphAttributes.normal||[],P=d.morphAttributes.color||[];let C=0;E===!0&&(C=1),w===!0&&(C=2),x===!0&&(C=3);let D=d.attributes.position.count*C,L=1;D>e.maxTextureSize&&(L=Math.ceil(D/e.maxTextureSize),D=e.maxTextureSize);const F=new Float32Array(D*L*4*g),T=new dy(F,D,L,g);T.type=fr,T.needsUpdate=!0;const I=C*4;for(let H=0;H<g;H++){const K=y[H],re=N[H],fe=P[H],O=D*L*4*H;for(let ce=0;ce<K.count;ce++){const Z=ce*I;E===!0&&(a.fromBufferAttribute(K,ce),F[O+Z+0]=a.x,F[O+Z+1]=a.y,F[O+Z+2]=a.z,F[O+Z+3]=0),w===!0&&(a.fromBufferAttribute(re,ce),F[O+Z+4]=a.x,F[O+Z+5]=a.y,F[O+Z+6]=a.z,F[O+Z+7]=0),x===!0&&(a.fromBufferAttribute(fe,ce),F[O+Z+8]=a.x,F[O+Z+9]=a.y,F[O+Z+10]=a.z,F[O+Z+11]=fe.itemSize===4?a.w:1)}}v={count:g,texture:T,size:new dt(D,L)},r.set(d,v),d.addEventListener("dispose",G)}if(c.isInstancedMesh===!0&&c.morphTexture!==null)h.getUniforms().setValue(i,"morphTexture",c.morphTexture,t);else{let E=0;for(let x=0;x<f.length;x++)E+=f[x];const w=d.morphTargetsRelative?1:1-E;h.getUniforms().setValue(i,"morphTargetBaseInfluence",w),h.getUniforms().setValue(i,"morphTargetInfluences",f)}h.getUniforms().setValue(i,"morphTargetsTexture",v.texture,t),h.getUniforms().setValue(i,"morphTargetsTextureSize",v.size)}return{update:l}}function $R(i,e,t,r,a){let l=new WeakMap;function c(f){const m=a.render.frame,g=f.geometry,v=e.get(f,g);if(l.get(v)!==m&&(e.update(v),l.set(v,m)),f.isInstancedMesh&&(f.hasEventListener("dispose",h)===!1&&f.addEventListener("dispose",h),l.get(f)!==m&&(t.update(f.instanceMatrix,i.ARRAY_BUFFER),f.instanceColor!==null&&t.update(f.instanceColor,i.ARRAY_BUFFER),l.set(f,m))),f.isSkinnedMesh){const S=f.skeleton;l.get(S)!==m&&(S.update(),l.set(S,m))}return v}function d(){l=new WeakMap}function h(f){const m=f.target;m.removeEventListener("dispose",h),r.releaseStatesOfObject(m),t.remove(m.instanceMatrix),m.instanceColor!==null&&t.remove(m.instanceColor)}return{update:c,dispose:d}}const qR={[K_]:"LINEAR_TONE_MAPPING",[Q_]:"REINHARD_TONE_MAPPING",[Z_]:"CINEON_TONE_MAPPING",[Cm]:"ACES_FILMIC_TONE_MAPPING",[ey]:"AGX_TONE_MAPPING",[ty]:"NEUTRAL_TONE_MAPPING",[J_]:"CUSTOM_TONE_MAPPING"};function YR(i,e,t,r,a,l){const c=new gr(e,t,{type:i,depthBuffer:a,stencilBuffer:l,samples:r?4:0,depthTexture:a?new Io(e,t):void 0}),d=new gr(e,t,{type:$r,depthBuffer:!1,stencilBuffer:!1}),h=new Mi;h.setAttribute("position",new In([-1,3,0,-1,-1,0,3,-1,0],3)),h.setAttribute("uv",new In([0,2,0,0,2,0],2));const f=new NT({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),m=new Zi(h,f),g=new zm(-1,1,1,-1,0,1);let v=null,S=null,E=!1,w,x=null,y=[],N=!1;this.setSize=function(P,C){c.setSize(P,C),d.setSize(P,C);for(let D=0;D<y.length;D++){const L=y[D];L.setSize&&L.setSize(P,C)}},this.setEffects=function(P){y=P,N=y.length>0&&y[0].isRenderPass===!0;const C=c.width,D=c.height;for(let L=0;L<y.length;L++){const F=y[L];F.setSize&&F.setSize(C,D)}},this.begin=function(P,C){if(E||P.toneMapping===mr&&y.length===0)return!1;if(x=C,C!==null){const D=C.width,L=C.height;(c.width!==D||c.height!==L)&&this.setSize(D,L)}return N===!1&&P.setRenderTarget(c),w=P.toneMapping,P.toneMapping=mr,!0},this.hasRenderPass=function(){return N},this.end=function(P,C){P.toneMapping=w,E=!0;let D=c,L=d;for(let F=0;F<y.length;F++){const T=y[F];if(T.enabled!==!1&&(T.render(P,L,D,C),T.needsSwap!==!1)){const I=D;D=L,L=I}}if(v!==P.outputColorSpace||S!==P.toneMapping){v=P.outputColorSpace,S=P.toneMapping,f.defines={},bt.getTransfer(v)===Bt&&(f.defines.SRGB_TRANSFER="");const F=qR[S];F&&(f.defines[F]=""),f.needsUpdate=!0}f.uniforms.tDiffuse.value=D.texture,P.setRenderTarget(x),P.render(m,g),x=null,E=!1},this.isCompositing=function(){return E},this.dispose=function(){c.depthTexture&&c.depthTexture.dispose(),c.dispose(),d.dispose(),h.dispose(),f.dispose()}}const wy=new jn,tm=new Io(1,1),Ty=new dy,by=new oT,Cy=new vy,Lx=[],Dx=[],Ix=new Float32Array(16),Ux=new Float32Array(9),Fx=new Float32Array(4);function Vo(i,e,t){const r=i[0];if(r<=0||r>0)return i;const a=e*t;let l=Lx[a];if(l===void 0&&(l=new Float32Array(a),Lx[a]=l),e!==0){r.toArray(l,0);for(let c=1,d=0;c!==e;++c)d+=t,i[c].toArray(l,d)}return l}function wn(i,e){if(i.length!==e.length)return!1;for(let t=0,r=i.length;t<r;t++)if(i[t]!==e[t])return!1;return!0}function Tn(i,e){for(let t=0,r=e.length;t<r;t++)i[t]=e[t]}function _d(i,e){let t=Dx[e];t===void 0&&(t=new Int32Array(e),Dx[e]=t);for(let r=0;r!==e;++r)t[r]=i.allocateTextureUnit();return t}function KR(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function QR(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wn(t,e))return;i.uniform2fv(this.addr,e),Tn(t,e)}}function ZR(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(wn(t,e))return;i.uniform3fv(this.addr,e),Tn(t,e)}}function JR(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wn(t,e))return;i.uniform4fv(this.addr,e),Tn(t,e)}}function eA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(wn(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),Tn(t,e)}else{if(wn(t,r))return;Fx.set(r),i.uniformMatrix2fv(this.addr,!1,Fx),Tn(t,r)}}function tA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(wn(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),Tn(t,e)}else{if(wn(t,r))return;Ux.set(r),i.uniformMatrix3fv(this.addr,!1,Ux),Tn(t,r)}}function nA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(wn(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),Tn(t,e)}else{if(wn(t,r))return;Ix.set(r),i.uniformMatrix4fv(this.addr,!1,Ix),Tn(t,r)}}function iA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function rA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wn(t,e))return;i.uniform2iv(this.addr,e),Tn(t,e)}}function sA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(wn(t,e))return;i.uniform3iv(this.addr,e),Tn(t,e)}}function aA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wn(t,e))return;i.uniform4iv(this.addr,e),Tn(t,e)}}function oA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function lA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wn(t,e))return;i.uniform2uiv(this.addr,e),Tn(t,e)}}function cA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(wn(t,e))return;i.uniform3uiv(this.addr,e),Tn(t,e)}}function uA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wn(t,e))return;i.uniform4uiv(this.addr,e),Tn(t,e)}}function dA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a);let l;this.type===i.SAMPLER_2D_SHADOW?(tm.compareFunction=t.isReversedDepthBuffer()?Um:Im,l=tm):l=wy,t.setTexture2D(e||l,a)}function hA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTexture3D(e||by,a)}function fA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTextureCube(e||Cy,a)}function pA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTexture2DArray(e||Ty,a)}function mA(i){switch(i){case 5126:return KR;case 35664:return QR;case 35665:return ZR;case 35666:return JR;case 35674:return eA;case 35675:return tA;case 35676:return nA;case 5124:case 35670:return iA;case 35667:case 35671:return rA;case 35668:case 35672:return sA;case 35669:case 35673:return aA;case 5125:return oA;case 36294:return lA;case 36295:return cA;case 36296:return uA;case 35678:case 36198:case 36298:case 36306:case 35682:return dA;case 35679:case 36299:case 36307:return hA;case 35680:case 36300:case 36308:case 36293:return fA;case 36289:case 36303:case 36311:case 36292:return pA}}function gA(i,e){i.uniform1fv(this.addr,e)}function vA(i,e){const t=Vo(e,this.size,2);i.uniform2fv(this.addr,t)}function xA(i,e){const t=Vo(e,this.size,3);i.uniform3fv(this.addr,t)}function _A(i,e){const t=Vo(e,this.size,4);i.uniform4fv(this.addr,t)}function yA(i,e){const t=Vo(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function SA(i,e){const t=Vo(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function MA(i,e){const t=Vo(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function EA(i,e){i.uniform1iv(this.addr,e)}function wA(i,e){i.uniform2iv(this.addr,e)}function TA(i,e){i.uniform3iv(this.addr,e)}function bA(i,e){i.uniform4iv(this.addr,e)}function CA(i,e){i.uniform1uiv(this.addr,e)}function RA(i,e){i.uniform2uiv(this.addr,e)}function AA(i,e){i.uniform3uiv(this.addr,e)}function PA(i,e){i.uniform4uiv(this.addr,e)}function NA(i,e,t){const r=this.cache,a=e.length,l=_d(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),Tn(r,l));let c;this.type===i.SAMPLER_2D_SHADOW?c=tm:c=wy;for(let d=0;d!==a;++d)t.setTexture2D(e[d]||c,l[d])}function LA(i,e,t){const r=this.cache,a=e.length,l=_d(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),Tn(r,l));for(let c=0;c!==a;++c)t.setTexture3D(e[c]||by,l[c])}function DA(i,e,t){const r=this.cache,a=e.length,l=_d(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),Tn(r,l));for(let c=0;c!==a;++c)t.setTextureCube(e[c]||Cy,l[c])}function IA(i,e,t){const r=this.cache,a=e.length,l=_d(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),Tn(r,l));for(let c=0;c!==a;++c)t.setTexture2DArray(e[c]||Ty,l[c])}function UA(i){switch(i){case 5126:return gA;case 35664:return vA;case 35665:return xA;case 35666:return _A;case 35674:return yA;case 35675:return SA;case 35676:return MA;case 5124:case 35670:return EA;case 35667:case 35671:return wA;case 35668:case 35672:return TA;case 35669:case 35673:return bA;case 5125:return CA;case 36294:return RA;case 36295:return AA;case 36296:return PA;case 35678:case 36198:case 36298:case 36306:case 35682:return NA;case 35679:case 36299:case 36307:return LA;case 35680:case 36300:case 36308:case 36293:return DA;case 36289:case 36303:case 36311:case 36292:return IA}}class FA{constructor(e,t,r){this.id=e,this.addr=r,this.cache=[],this.type=t.type,this.setValue=mA(t.type)}}class OA{constructor(e,t,r){this.id=e,this.addr=r,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=UA(t.type)}}class kA{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,r){const a=this.seq;for(let l=0,c=a.length;l!==c;++l){const d=a[l];d.setValue(e,t[d.id],r)}}}const jf=/(\w+)(\])?(\[|\.)?/g;function Ox(i,e){i.seq.push(e),i.map[e.id]=e}function zA(i,e,t){const r=i.name,a=r.length;for(jf.lastIndex=0;;){const l=jf.exec(r),c=jf.lastIndex;let d=l[1];const h=l[2]==="]",f=l[3];if(h&&(d=d|0),f===void 0||f==="["&&c+2===a){Ox(t,f===void 0?new FA(d,i,e):new OA(d,i,e));break}else{let g=t.map[d];g===void 0&&(g=new kA(d),Ox(t,g)),t=g}}}class Qu{constructor(e,t){this.seq=[],this.map={};const r=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let c=0;c<r;++c){const d=e.getActiveUniform(t,c),h=e.getUniformLocation(t,d.name);zA(d,h,this)}const a=[],l=[];for(const c of this.seq)c.type===e.SAMPLER_2D_SHADOW||c.type===e.SAMPLER_CUBE_SHADOW||c.type===e.SAMPLER_2D_ARRAY_SHADOW?a.push(c):l.push(c);a.length>0&&(this.seq=a.concat(l))}setValue(e,t,r,a){const l=this.map[t];l!==void 0&&l.setValue(e,r,a)}setOptional(e,t,r){const a=t[r];a!==void 0&&this.setValue(e,r,a)}static upload(e,t,r,a){for(let l=0,c=t.length;l!==c;++l){const d=t[l],h=r[d.id];h.needsUpdate!==!1&&d.setValue(e,h.value,a)}}static seqWithValue(e,t){const r=[];for(let a=0,l=e.length;a!==l;++a){const c=e[a];c.id in t&&r.push(c)}return r}}function kx(i,e,t){const r=i.createShader(e);return i.shaderSource(r,t),i.compileShader(r),r}const BA=37297;let HA=0;function VA(i,e){const t=i.split(`
`),r=[],a=Math.max(e-6,0),l=Math.min(e+6,t.length);for(let c=a;c<l;c++){const d=c+1;r.push(`${d===e?">":" "} ${d}: ${t[c]}`)}return r.join(`
`)}const zx=new pt;function GA(i){bt._getMatrix(zx,bt.workingColorSpace,i);const e=`mat3( ${zx.elements.map(t=>t.toFixed(4))} )`;switch(bt.getTransfer(i)){case ad:return[e,"LinearTransferOETF"];case Bt:return[e,"sRGBTransferOETF"];default:return lt("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function Bx(i,e,t){const r=i.getShaderParameter(e,i.COMPILE_STATUS),l=(i.getShaderInfoLog(e)||"").trim();if(r&&l==="")return"";const c=/ERROR: 0:(\d+)/.exec(l);if(c){const d=parseInt(c[1]);return t.toUpperCase()+`

`+l+`

`+VA(i.getShaderSource(e),d)}else return l}function WA(i,e){const t=GA(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const jA={[K_]:"Linear",[Q_]:"Reinhard",[Z_]:"Cineon",[Cm]:"ACESFilmic",[ey]:"AgX",[ty]:"Neutral",[J_]:"Custom"};function XA(i,e){const t=jA[e];return t===void 0?(lt("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const ku=new ee;function $A(){bt.getLuminanceCoefficients(ku);const i=ku.x.toFixed(4),e=ku.y.toFixed(4),t=ku.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function qA(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(kl).join(`
`)}function YA(i){const e=[];for(const t in i){const r=i[t];r!==!1&&e.push("#define "+t+" "+r)}return e.join(`
`)}function KA(i,e){const t={},r=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let a=0;a<r;a++){const l=i.getActiveAttrib(e,a),c=l.name;let d=1;l.type===i.FLOAT_MAT2&&(d=2),l.type===i.FLOAT_MAT3&&(d=3),l.type===i.FLOAT_MAT4&&(d=4),t[c]={type:l.type,location:i.getAttribLocation(e,c),locationSize:d}}return t}function kl(i){return i!==""}function Hx(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Vx(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const QA=/^[ \t]*#include +<([\w\d./]+)>/gm;function nm(i){return i.replace(QA,JA)}const ZA=new Map;function JA(i,e){let t=vt[e];if(t===void 0){const r=ZA.get(e);if(r!==void 0)t=vt[r],lt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,r);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return nm(t)}const eP=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Gx(i){return i.replace(eP,tP)}function tP(i,e,t,r){let a="";for(let l=parseInt(e);l<parseInt(t);l++)a+=r.replace(/\[\s*i\s*\]/g,"[ "+l+" ]").replace(/UNROLLED_LOOP_INDEX/g,l);return a}function Wx(i){let e=`precision ${i.precision} float;
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
#define LOW_PRECISION`),e}const nP={[Wu]:"SHADOWMAP_TYPE_PCF",[Ul]:"SHADOWMAP_TYPE_VSM"};function iP(i){return nP[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const rP={[Ma]:"ENVMAP_TYPE_CUBE",[Do]:"ENVMAP_TYPE_CUBE",[md]:"ENVMAP_TYPE_CUBE_UV"};function sP(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":rP[i.envMapMode]||"ENVMAP_TYPE_CUBE"}const aP={[Do]:"ENVMAP_MODE_REFRACTION"};function oP(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":aP[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}const lP={[bm]:"ENVMAP_BLENDING_MULTIPLY",[zw]:"ENVMAP_BLENDING_MIX",[Bw]:"ENVMAP_BLENDING_ADD"};function cP(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":lP[i.combine]||"ENVMAP_BLENDING_NONE"}function uP(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,r=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:r,maxMip:t}}function dP(i,e,t,r){const a=i.getContext(),l=t.defines;let c=t.vertexShader,d=t.fragmentShader;const h=iP(t),f=sP(t),m=oP(t),g=cP(t),v=uP(t),S=qA(t),E=YA(l),w=a.createProgram();let x,y,N=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(x=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E].filter(kl).join(`
`),x.length>0&&(x+=`
`),y=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E].filter(kl).join(`
`),y.length>0&&(y+=`
`)):(x=[Wx(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+m:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+h:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(kl).join(`
`),y=[Wx(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+f:"",t.envMap?"#define "+m:"",t.envMap?"#define "+g:"",v?"#define CUBEUV_TEXEL_WIDTH "+v.texelWidth:"",v?"#define CUBEUV_TEXEL_HEIGHT "+v.texelHeight:"",v?"#define CUBEUV_MAX_MIP "+v.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+h:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==mr?"#define TONE_MAPPING":"",t.toneMapping!==mr?vt.tonemapping_pars_fragment:"",t.toneMapping!==mr?XA("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",vt.colorspace_pars_fragment,WA("linearToOutputTexel",t.outputColorSpace),$A(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(kl).join(`
`)),c=nm(c),c=Hx(c,t),c=Vx(c,t),d=nm(d),d=Hx(d,t),d=Vx(d,t),c=Gx(c),d=Gx(d),t.isRawShaderMaterial!==!0&&(N=`#version 300 es
`,x=[S,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+x,y=["#define varying in",t.glslVersion===$v?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===$v?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+y);const P=N+x+c,C=N+y+d,D=kx(a,a.VERTEX_SHADER,P),L=kx(a,a.FRAGMENT_SHADER,C);a.attachShader(w,D),a.attachShader(w,L),t.index0AttributeName!==void 0?a.bindAttribLocation(w,0,t.index0AttributeName):t.hasPositionAttribute===!0&&a.bindAttribLocation(w,0,"position"),a.linkProgram(w);function F(H){if(i.debug.checkShaderErrors){const K=a.getProgramInfoLog(w)||"",re=a.getShaderInfoLog(D)||"",fe=a.getShaderInfoLog(L)||"",O=K.trim(),ce=re.trim(),Z=fe.trim();let q=!0,ue=!0;if(a.getProgramParameter(w,a.LINK_STATUS)===!1)if(q=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(a,w,D,L);else{const he=Bx(a,D,"vertex"),k=Bx(a,L,"fragment");Nt("WebGLProgram: Shader Error "+a.getError()+" - VALIDATE_STATUS "+a.getProgramParameter(w,a.VALIDATE_STATUS)+`

Material Name: `+H.name+`
Material Type: `+H.type+`

Program Info Log: `+O+`
`+he+`
`+k)}else O!==""?lt("WebGLProgram: Program Info Log:",O):(ce===""||Z==="")&&(ue=!1);ue&&(H.diagnostics={runnable:q,programLog:O,vertexShader:{log:ce,prefix:x},fragmentShader:{log:Z,prefix:y}})}a.deleteShader(D),a.deleteShader(L),T=new Qu(a,w),I=KA(a,w)}let T;this.getUniforms=function(){return T===void 0&&F(this),T};let I;this.getAttributes=function(){return I===void 0&&F(this),I};let G=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return G===!1&&(G=a.getProgramParameter(w,BA)),G},this.destroy=function(){r.releaseStatesOfProgram(this),a.deleteProgram(w),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=HA++,this.cacheKey=e,this.usedTimes=1,this.program=w,this.vertexShader=D,this.fragmentShader=L,this}let hP=0;class fP{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,r){const a=this._getShaderCacheForMaterial(e);return a.has(t)===!1&&(a.add(t),t.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const r of t)r.usedTimes--,r.usedTimes===0&&this.shaderCache.delete(r.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let r=t.get(e);return r===void 0&&(r=new Set,t.set(e,r)),r}_getShaderStage(e){const t=this.shaderCache;let r=t.get(e);return r===void 0&&(r=new pP(e),t.set(e,r)),r}}class pP{constructor(e){this.id=hP++,this.code=e,this.usedTimes=0}}function mP(i){return i===Ea||i===nd||i===id}function gP(i,e,t,r,a,l){const c=new hy,d=new fP,h=new Set,f=[],m=new Map,g=r.logarithmicDepthBuffer;let v=r.precision;const S={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function E(T){return h.add(T),T===0?"uv":`uv${T}`}function w(T,I,G,H,K,re){const fe=H.fog,O=K.geometry,ce=T.isMeshStandardMaterial||T.isMeshLambertMaterial||T.isMeshPhongMaterial?H.environment:null,Z=T.isMeshStandardMaterial||T.isMeshLambertMaterial&&!T.envMap||T.isMeshPhongMaterial&&!T.envMap,q=e.get(T.envMap||ce,Z),ue=q&&q.mapping===md?q.image.height:null,he=S[T.type];T.precision!==null&&(v=r.getMaxPrecision(T.precision),v!==T.precision&&lt("WebGLProgram.getParameters:",T.precision,"not supported, using",v,"instead."));const k=O.morphAttributes.position||O.morphAttributes.normal||O.morphAttributes.color,X=k!==void 0?k.length:0;let Fe=0;O.morphAttributes.position!==void 0&&(Fe=1),O.morphAttributes.normal!==void 0&&(Fe=2),O.morphAttributes.color!==void 0&&(Fe=3);let je,Ge,de,Se;if(he){const qe=dr[he];je=qe.vertexShader,Ge=qe.fragmentShader}else{je=T.vertexShader,Ge=T.fragmentShader;const qe=d.getVertexShaderStage(T),Ht=d.getFragmentShaderStage(T);d.update(T,qe,Ht),de=qe.id,Se=Ht.id}const xe=i.getRenderTarget(),te=i.state.buffers.depth.getReversed(),Ue=K.isInstancedMesh===!0,tt=K.isBatchedMesh===!0,Dt=!!T.map,ct=!!T.matcap,At=!!q,Et=!!T.aoMap,_t=!!T.lightMap,Wt=!!T.bumpMap&&T.wireframe===!1,$t=!!T.normalMap,Jt=!!T.displacementMap,qt=!!T.emissiveMap,wt=!!T.metalnessMap,Gt=!!T.roughnessMap,Y=T.anisotropy>0,xn=T.clearcoat>0,Ct=T.dispersion>0,U=T.iridescence>0,b=T.sheen>0,J=T.transmission>0,se=Y&&!!T.anisotropyMap,ge=xn&&!!T.clearcoatMap,Te=xn&&!!T.clearcoatNormalMap,Ae=xn&&!!T.clearcoatRoughnessMap,ve=U&&!!T.iridescenceMap,_e=U&&!!T.iridescenceThicknessMap,Ie=b&&!!T.sheenColorMap,Xe=b&&!!T.sheenRoughnessMap,ne=!!T.specularMap,Me=!!T.specularColorMap,ke=!!T.specularIntensityMap,nt=J&&!!T.transmissionMap,st=J&&!!T.thicknessMap,j=!!T.gradientMap,Ne=!!T.alphaMap,ye=T.alphaTest>0,De=!!T.alphaHash,Oe=!!T.extensions;let Ee=mr;T.toneMapped&&(xe===null||xe.isXRRenderTarget===!0)&&(Ee=i.toneMapping);const Ke={shaderID:he,shaderType:T.type,shaderName:T.name,vertexShader:je,fragmentShader:Ge,defines:T.defines,customVertexShaderID:de,customFragmentShaderID:Se,isRawShaderMaterial:T.isRawShaderMaterial===!0,glslVersion:T.glslVersion,precision:v,batching:tt,batchingColor:tt&&K._colorsTexture!==null,instancing:Ue,instancingColor:Ue&&K.instanceColor!==null,instancingMorph:Ue&&K.morphTexture!==null,outputColorSpace:xe===null?i.outputColorSpace:xe.isXRRenderTarget===!0?xe.texture.colorSpace:bt.workingColorSpace,alphaToCoverage:!!T.alphaToCoverage,map:Dt,matcap:ct,envMap:At,envMapMode:At&&q.mapping,envMapCubeUVHeight:ue,aoMap:Et,lightMap:_t,bumpMap:Wt,normalMap:$t,displacementMap:Jt,emissiveMap:qt,normalMapObjectSpace:$t&&T.normalMapType===Gw,normalMapTangentSpace:$t&&T.normalMapType===rd,packedNormalMap:$t&&T.normalMapType===rd&&mP(T.normalMap.format),metalnessMap:wt,roughnessMap:Gt,anisotropy:Y,anisotropyMap:se,clearcoat:xn,clearcoatMap:ge,clearcoatNormalMap:Te,clearcoatRoughnessMap:Ae,dispersion:Ct,iridescence:U,iridescenceMap:ve,iridescenceThicknessMap:_e,sheen:b,sheenColorMap:Ie,sheenRoughnessMap:Xe,specularMap:ne,specularColorMap:Me,specularIntensityMap:ke,transmission:J,transmissionMap:nt,thicknessMap:st,gradientMap:j,opaque:T.transparent===!1&&T.blending===mo&&T.alphaToCoverage===!1,alphaMap:Ne,alphaTest:ye,alphaHash:De,combine:T.combine,mapUv:Dt&&E(T.map.channel),aoMapUv:Et&&E(T.aoMap.channel),lightMapUv:_t&&E(T.lightMap.channel),bumpMapUv:Wt&&E(T.bumpMap.channel),normalMapUv:$t&&E(T.normalMap.channel),displacementMapUv:Jt&&E(T.displacementMap.channel),emissiveMapUv:qt&&E(T.emissiveMap.channel),metalnessMapUv:wt&&E(T.metalnessMap.channel),roughnessMapUv:Gt&&E(T.roughnessMap.channel),anisotropyMapUv:se&&E(T.anisotropyMap.channel),clearcoatMapUv:ge&&E(T.clearcoatMap.channel),clearcoatNormalMapUv:Te&&E(T.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Ae&&E(T.clearcoatRoughnessMap.channel),iridescenceMapUv:ve&&E(T.iridescenceMap.channel),iridescenceThicknessMapUv:_e&&E(T.iridescenceThicknessMap.channel),sheenColorMapUv:Ie&&E(T.sheenColorMap.channel),sheenRoughnessMapUv:Xe&&E(T.sheenRoughnessMap.channel),specularMapUv:ne&&E(T.specularMap.channel),specularColorMapUv:Me&&E(T.specularColorMap.channel),specularIntensityMapUv:ke&&E(T.specularIntensityMap.channel),transmissionMapUv:nt&&E(T.transmissionMap.channel),thicknessMapUv:st&&E(T.thicknessMap.channel),alphaMapUv:Ne&&E(T.alphaMap.channel),vertexTangents:!!O.attributes.tangent&&($t||Y),vertexNormals:!!O.attributes.normal,vertexColors:T.vertexColors,vertexAlphas:T.vertexColors===!0&&!!O.attributes.color&&O.attributes.color.itemSize===4,pointsUvs:K.isPoints===!0&&!!O.attributes.uv&&(Dt||Ne),fog:!!fe,useFog:T.fog===!0,fogExp2:!!fe&&fe.isFogExp2,flatShading:T.wireframe===!1&&(T.flatShading===!0||O.attributes.normal===void 0&&$t===!1&&(T.isMeshLambertMaterial||T.isMeshPhongMaterial||T.isMeshStandardMaterial||T.isMeshPhysicalMaterial)),sizeAttenuation:T.sizeAttenuation===!0,logarithmicDepthBuffer:g,reversedDepthBuffer:te,skinning:K.isSkinnedMesh===!0,hasPositionAttribute:O.attributes.position!==void 0,morphTargets:O.morphAttributes.position!==void 0,morphNormals:O.morphAttributes.normal!==void 0,morphColors:O.morphAttributes.color!==void 0,morphTargetsCount:X,morphTextureStride:Fe,numDirLights:I.directional.length,numPointLights:I.point.length,numSpotLights:I.spot.length,numSpotLightMaps:I.spotLightMap.length,numRectAreaLights:I.rectArea.length,numHemiLights:I.hemi.length,numDirLightShadows:I.directionalShadowMap.length,numPointLightShadows:I.pointShadowMap.length,numSpotLightShadows:I.spotShadowMap.length,numSpotLightShadowsWithMaps:I.numSpotLightShadowsWithMaps,numLightProbes:I.numLightProbes,numLightProbeGrids:re.length,numClippingPlanes:l.numPlanes,numClipIntersection:l.numIntersection,dithering:T.dithering,shadowMapEnabled:i.shadowMap.enabled&&G.length>0,shadowMapType:i.shadowMap.type,toneMapping:Ee,decodeVideoTexture:Dt&&T.map.isVideoTexture===!0&&bt.getTransfer(T.map.colorSpace)===Bt,decodeVideoTextureEmissive:qt&&T.emissiveMap.isVideoTexture===!0&&bt.getTransfer(T.emissiveMap.colorSpace)===Bt,premultipliedAlpha:T.premultipliedAlpha,doubleSided:T.side===hr,flipSided:T.side===hi,useDepthPacking:T.depthPacking>=0,depthPacking:T.depthPacking||0,index0AttributeName:T.index0AttributeName,extensionClipCullDistance:Oe&&T.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Oe&&T.extensions.multiDraw===!0||tt)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:T.customProgramCacheKey()};return Ke.vertexUv1s=h.has(1),Ke.vertexUv2s=h.has(2),Ke.vertexUv3s=h.has(3),h.clear(),Ke}function x(T){const I=[];if(T.shaderID?I.push(T.shaderID):(I.push(T.customVertexShaderID),I.push(T.customFragmentShaderID)),T.defines!==void 0)for(const G in T.defines)I.push(G),I.push(T.defines[G]);return T.isRawShaderMaterial===!1&&(y(I,T),N(I,T),I.push(i.outputColorSpace)),I.push(T.customProgramCacheKey),I.join()}function y(T,I){T.push(I.precision),T.push(I.outputColorSpace),T.push(I.envMapMode),T.push(I.envMapCubeUVHeight),T.push(I.mapUv),T.push(I.alphaMapUv),T.push(I.lightMapUv),T.push(I.aoMapUv),T.push(I.bumpMapUv),T.push(I.normalMapUv),T.push(I.displacementMapUv),T.push(I.emissiveMapUv),T.push(I.metalnessMapUv),T.push(I.roughnessMapUv),T.push(I.anisotropyMapUv),T.push(I.clearcoatMapUv),T.push(I.clearcoatNormalMapUv),T.push(I.clearcoatRoughnessMapUv),T.push(I.iridescenceMapUv),T.push(I.iridescenceThicknessMapUv),T.push(I.sheenColorMapUv),T.push(I.sheenRoughnessMapUv),T.push(I.specularMapUv),T.push(I.specularColorMapUv),T.push(I.specularIntensityMapUv),T.push(I.transmissionMapUv),T.push(I.thicknessMapUv),T.push(I.combine),T.push(I.fogExp2),T.push(I.sizeAttenuation),T.push(I.morphTargetsCount),T.push(I.morphAttributeCount),T.push(I.numDirLights),T.push(I.numPointLights),T.push(I.numSpotLights),T.push(I.numSpotLightMaps),T.push(I.numHemiLights),T.push(I.numRectAreaLights),T.push(I.numDirLightShadows),T.push(I.numPointLightShadows),T.push(I.numSpotLightShadows),T.push(I.numSpotLightShadowsWithMaps),T.push(I.numLightProbes),T.push(I.shadowMapType),T.push(I.toneMapping),T.push(I.numClippingPlanes),T.push(I.numClipIntersection),T.push(I.depthPacking)}function N(T,I){c.disableAll(),I.instancing&&c.enable(0),I.instancingColor&&c.enable(1),I.instancingMorph&&c.enable(2),I.matcap&&c.enable(3),I.envMap&&c.enable(4),I.normalMapObjectSpace&&c.enable(5),I.normalMapTangentSpace&&c.enable(6),I.clearcoat&&c.enable(7),I.iridescence&&c.enable(8),I.alphaTest&&c.enable(9),I.vertexColors&&c.enable(10),I.vertexAlphas&&c.enable(11),I.vertexUv1s&&c.enable(12),I.vertexUv2s&&c.enable(13),I.vertexUv3s&&c.enable(14),I.vertexTangents&&c.enable(15),I.anisotropy&&c.enable(16),I.alphaHash&&c.enable(17),I.batching&&c.enable(18),I.dispersion&&c.enable(19),I.batchingColor&&c.enable(20),I.gradientMap&&c.enable(21),I.packedNormalMap&&c.enable(22),I.vertexNormals&&c.enable(23),T.push(c.mask),c.disableAll(),I.fog&&c.enable(0),I.useFog&&c.enable(1),I.flatShading&&c.enable(2),I.logarithmicDepthBuffer&&c.enable(3),I.reversedDepthBuffer&&c.enable(4),I.skinning&&c.enable(5),I.morphTargets&&c.enable(6),I.morphNormals&&c.enable(7),I.morphColors&&c.enable(8),I.premultipliedAlpha&&c.enable(9),I.shadowMapEnabled&&c.enable(10),I.doubleSided&&c.enable(11),I.flipSided&&c.enable(12),I.useDepthPacking&&c.enable(13),I.dithering&&c.enable(14),I.transmission&&c.enable(15),I.sheen&&c.enable(16),I.opaque&&c.enable(17),I.pointsUvs&&c.enable(18),I.decodeVideoTexture&&c.enable(19),I.decodeVideoTextureEmissive&&c.enable(20),I.alphaToCoverage&&c.enable(21),I.numLightProbeGrids>0&&c.enable(22),I.hasPositionAttribute&&c.enable(23),T.push(c.mask)}function P(T){const I=S[T.type];let G;if(I){const H=dr[I];G=RT.clone(H.uniforms)}else G=T.uniforms;return G}function C(T,I){let G=m.get(I);return G!==void 0?++G.usedTimes:(G=new dP(i,I,T,a),f.push(G),m.set(I,G)),G}function D(T){if(--T.usedTimes===0){const I=f.indexOf(T);f[I]=f[f.length-1],f.pop(),m.delete(T.cacheKey),T.destroy()}}function L(T){d.remove(T)}function F(){d.dispose()}return{getParameters:w,getProgramCacheKey:x,getUniforms:P,acquireProgram:C,releaseProgram:D,releaseShaderCache:L,programs:f,dispose:F}}function vP(){let i=new WeakMap;function e(c){return i.has(c)}function t(c){let d=i.get(c);return d===void 0&&(d={},i.set(c,d)),d}function r(c){i.delete(c)}function a(c,d,h){i.get(c)[d]=h}function l(){i=new WeakMap}return{has:e,get:t,remove:r,update:a,dispose:l}}function xP(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function jx(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function Xx(){const i=[];let e=0;const t=[],r=[],a=[];function l(){e=0,t.length=0,r.length=0,a.length=0}function c(v){let S=0;return v.isInstancedMesh&&(S+=2),v.isSkinnedMesh&&(S+=1),S}function d(v,S,E,w,x,y){let N=i[e];return N===void 0?(N={id:v.id,object:v,geometry:S,material:E,materialVariant:c(v),groupOrder:w,renderOrder:v.renderOrder,z:x,group:y},i[e]=N):(N.id=v.id,N.object=v,N.geometry=S,N.material=E,N.materialVariant=c(v),N.groupOrder=w,N.renderOrder=v.renderOrder,N.z=x,N.group=y),e++,N}function h(v,S,E,w,x,y){const N=d(v,S,E,w,x,y);E.transmission>0?r.push(N):E.transparent===!0?a.push(N):t.push(N)}function f(v,S,E,w,x,y){const N=d(v,S,E,w,x,y);E.transmission>0?r.unshift(N):E.transparent===!0?a.unshift(N):t.unshift(N)}function m(v,S,E){t.length>1&&t.sort(v||xP),r.length>1&&r.sort(S||jx),a.length>1&&a.sort(S||jx),E&&(t.reverse(),r.reverse(),a.reverse())}function g(){for(let v=e,S=i.length;v<S;v++){const E=i[v];if(E.id===null)break;E.id=null,E.object=null,E.geometry=null,E.material=null,E.group=null}}return{opaque:t,transmissive:r,transparent:a,init:l,push:h,unshift:f,finish:g,sort:m}}function _P(){let i=new WeakMap;function e(r,a){const l=i.get(r);let c;return l===void 0?(c=new Xx,i.set(r,[c])):a>=l.length?(c=new Xx,l.push(c)):c=l[a],c}function t(){i=new WeakMap}return{get:e,dispose:t}}function yP(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new ee,color:new gt};break;case"SpotLight":t={position:new ee,direction:new ee,color:new gt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new ee,color:new gt,distance:0,decay:0};break;case"HemisphereLight":t={direction:new ee,skyColor:new gt,groundColor:new gt};break;case"RectAreaLight":t={color:new gt,position:new ee,halfWidth:new ee,halfHeight:new ee};break}return i[e.id]=t,t}}}function SP(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new dt};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new dt};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new dt,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let MP=0;function EP(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function wP(i){const e=new yP,t=SP(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let f=0;f<9;f++)r.probe.push(new ee);const a=new ee,l=new rn,c=new rn;function d(f){let m=0,g=0,v=0;for(let I=0;I<9;I++)r.probe[I].set(0,0,0);let S=0,E=0,w=0,x=0,y=0,N=0,P=0,C=0,D=0,L=0,F=0;f.sort(EP);for(let I=0,G=f.length;I<G;I++){const H=f[I],K=H.color,re=H.intensity,fe=H.distance;let O=null;if(H.shadow&&H.shadow.map&&(H.shadow.map.texture.format===Ea?O=H.shadow.map.texture:O=H.shadow.map.depthTexture||H.shadow.map.texture),H.isAmbientLight)m+=K.r*re,g+=K.g*re,v+=K.b*re;else if(H.isLightProbe){for(let ce=0;ce<9;ce++)r.probe[ce].addScaledVector(H.sh.coefficients[ce],re);F++}else if(H.isDirectionalLight){const ce=e.get(H);if(ce.color.copy(H.color).multiplyScalar(H.intensity),H.castShadow){const Z=H.shadow,q=t.get(H);q.shadowIntensity=Z.intensity,q.shadowBias=Z.bias,q.shadowNormalBias=Z.normalBias,q.shadowRadius=Z.radius,q.shadowMapSize=Z.mapSize,r.directionalShadow[S]=q,r.directionalShadowMap[S]=O,r.directionalShadowMatrix[S]=H.shadow.matrix,N++}r.directional[S]=ce,S++}else if(H.isSpotLight){const ce=e.get(H);ce.position.setFromMatrixPosition(H.matrixWorld),ce.color.copy(K).multiplyScalar(re),ce.distance=fe,ce.coneCos=Math.cos(H.angle),ce.penumbraCos=Math.cos(H.angle*(1-H.penumbra)),ce.decay=H.decay,r.spot[w]=ce;const Z=H.shadow;if(H.map&&(r.spotLightMap[D]=H.map,D++,Z.updateMatrices(H),H.castShadow&&L++),r.spotLightMatrix[w]=Z.matrix,H.castShadow){const q=t.get(H);q.shadowIntensity=Z.intensity,q.shadowBias=Z.bias,q.shadowNormalBias=Z.normalBias,q.shadowRadius=Z.radius,q.shadowMapSize=Z.mapSize,r.spotShadow[w]=q,r.spotShadowMap[w]=O,C++}w++}else if(H.isRectAreaLight){const ce=e.get(H);ce.color.copy(K).multiplyScalar(re),ce.halfWidth.set(H.width*.5,0,0),ce.halfHeight.set(0,H.height*.5,0),r.rectArea[x]=ce,x++}else if(H.isPointLight){const ce=e.get(H);if(ce.color.copy(H.color).multiplyScalar(H.intensity),ce.distance=H.distance,ce.decay=H.decay,H.castShadow){const Z=H.shadow,q=t.get(H);q.shadowIntensity=Z.intensity,q.shadowBias=Z.bias,q.shadowNormalBias=Z.normalBias,q.shadowRadius=Z.radius,q.shadowMapSize=Z.mapSize,q.shadowCameraNear=Z.camera.near,q.shadowCameraFar=Z.camera.far,r.pointShadow[E]=q,r.pointShadowMap[E]=O,r.pointShadowMatrix[E]=H.shadow.matrix,P++}r.point[E]=ce,E++}else if(H.isHemisphereLight){const ce=e.get(H);ce.skyColor.copy(H.color).multiplyScalar(re),ce.groundColor.copy(H.groundColor).multiplyScalar(re),r.hemi[y]=ce,y++}}x>0&&(i.has("OES_texture_float_linear")===!0?(r.rectAreaLTC1=ze.LTC_FLOAT_1,r.rectAreaLTC2=ze.LTC_FLOAT_2):(r.rectAreaLTC1=ze.LTC_HALF_1,r.rectAreaLTC2=ze.LTC_HALF_2)),r.ambient[0]=m,r.ambient[1]=g,r.ambient[2]=v;const T=r.hash;(T.directionalLength!==S||T.pointLength!==E||T.spotLength!==w||T.rectAreaLength!==x||T.hemiLength!==y||T.numDirectionalShadows!==N||T.numPointShadows!==P||T.numSpotShadows!==C||T.numSpotMaps!==D||T.numLightProbes!==F)&&(r.directional.length=S,r.spot.length=w,r.rectArea.length=x,r.point.length=E,r.hemi.length=y,r.directionalShadow.length=N,r.directionalShadowMap.length=N,r.pointShadow.length=P,r.pointShadowMap.length=P,r.spotShadow.length=C,r.spotShadowMap.length=C,r.directionalShadowMatrix.length=N,r.pointShadowMatrix.length=P,r.spotLightMatrix.length=C+D-L,r.spotLightMap.length=D,r.numSpotLightShadowsWithMaps=L,r.numLightProbes=F,T.directionalLength=S,T.pointLength=E,T.spotLength=w,T.rectAreaLength=x,T.hemiLength=y,T.numDirectionalShadows=N,T.numPointShadows=P,T.numSpotShadows=C,T.numSpotMaps=D,T.numLightProbes=F,r.version=MP++)}function h(f,m){let g=0,v=0,S=0,E=0,w=0;const x=m.matrixWorldInverse;for(let y=0,N=f.length;y<N;y++){const P=f[y];if(P.isDirectionalLight){const C=r.directional[g];C.direction.setFromMatrixPosition(P.matrixWorld),a.setFromMatrixPosition(P.target.matrixWorld),C.direction.sub(a),C.direction.transformDirection(x),g++}else if(P.isSpotLight){const C=r.spot[S];C.position.setFromMatrixPosition(P.matrixWorld),C.position.applyMatrix4(x),C.direction.setFromMatrixPosition(P.matrixWorld),a.setFromMatrixPosition(P.target.matrixWorld),C.direction.sub(a),C.direction.transformDirection(x),S++}else if(P.isRectAreaLight){const C=r.rectArea[E];C.position.setFromMatrixPosition(P.matrixWorld),C.position.applyMatrix4(x),c.identity(),l.copy(P.matrixWorld),l.premultiply(x),c.extractRotation(l),C.halfWidth.set(P.width*.5,0,0),C.halfHeight.set(0,P.height*.5,0),C.halfWidth.applyMatrix4(c),C.halfHeight.applyMatrix4(c),E++}else if(P.isPointLight){const C=r.point[v];C.position.setFromMatrixPosition(P.matrixWorld),C.position.applyMatrix4(x),v++}else if(P.isHemisphereLight){const C=r.hemi[w];C.direction.setFromMatrixPosition(P.matrixWorld),C.direction.transformDirection(x),w++}}}return{setup:d,setupView:h,state:r}}function $x(i){const e=new wP(i),t=[],r=[],a=[];function l(v){g.camera=v,t.length=0,r.length=0,a.length=0}function c(v){t.push(v)}function d(v){r.push(v)}function h(v){a.push(v)}function f(){e.setup(t)}function m(v){e.setupView(t,v)}const g={lightsArray:t,shadowsArray:r,lightProbeGridArray:a,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:l,state:g,setupLights:f,setupLightsView:m,pushLight:c,pushShadow:d,pushLightProbeGrid:h}}function TP(i){let e=new WeakMap;function t(a,l=0){const c=e.get(a);let d;return c===void 0?(d=new $x(i),e.set(a,[d])):l>=c.length?(d=new $x(i),c.push(d)):d=c[l],d}function r(){e=new WeakMap}return{get:t,dispose:r}}const bP=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,CP=`uniform sampler2D shadow_pass;
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
}`,RP=[new ee(1,0,0),new ee(-1,0,0),new ee(0,1,0),new ee(0,-1,0),new ee(0,0,1),new ee(0,0,-1)],AP=[new ee(0,-1,0),new ee(0,-1,0),new ee(0,0,1),new ee(0,0,-1),new ee(0,-1,0),new ee(0,-1,0)],qx=new rn,Dl=new ee,Xf=new ee;function PP(i,e,t){let r=new Om;const a=new dt,l=new dt,c=new ln,d=new DT,h=new IT,f={},m=t.maxTextureSize,g={[Us]:hi,[hi]:Us,[hr]:hr},v=new yr({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new dt},radius:{value:4}},vertexShader:bP,fragmentShader:CP}),S=v.clone();S.defines.HORIZONTAL_PASS=1;const E=new Mi;E.setAttribute("position",new vr(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const w=new Zi(E,v),x=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Wu;let y=this.type;this.render=function(L,F,T){if(x.enabled===!1||x.autoUpdate===!1&&x.needsUpdate===!1||L.length===0)return;this.type===yw&&(lt("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Wu);const I=i.getRenderTarget(),G=i.getActiveCubeFace(),H=i.getActiveMipmapLevel(),K=i.state;K.setBlending(Gr),K.buffers.depth.getReversed()===!0?K.buffers.color.setClear(0,0,0,0):K.buffers.color.setClear(1,1,1,1),K.buffers.depth.setTest(!0),K.setScissorTest(!1);const re=y!==this.type;re&&F.traverse(function(fe){fe.material&&(Array.isArray(fe.material)?fe.material.forEach(O=>O.needsUpdate=!0):fe.material.needsUpdate=!0)});for(let fe=0,O=L.length;fe<O;fe++){const ce=L[fe],Z=ce.shadow;if(Z===void 0){lt("WebGLShadowMap:",ce,"has no shadow.");continue}if(Z.autoUpdate===!1&&Z.needsUpdate===!1)continue;a.copy(Z.mapSize);const q=Z.getFrameExtents();a.multiply(q),l.copy(Z.mapSize),(a.x>m||a.y>m)&&(a.x>m&&(l.x=Math.floor(m/q.x),a.x=l.x*q.x,Z.mapSize.x=l.x),a.y>m&&(l.y=Math.floor(m/q.y),a.y=l.y*q.y,Z.mapSize.y=l.y));const ue=i.state.buffers.depth.getReversed();if(Z.camera._reversedDepth=ue,Z.map===null||re===!0){if(Z.map!==null&&(Z.map.depthTexture!==null&&(Z.map.depthTexture.dispose(),Z.map.depthTexture=null),Z.map.dispose()),this.type===Ul){if(ce.isPointLight){lt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}Z.map=new gr(a.x,a.y,{format:Ea,type:$r,minFilter:Wn,magFilter:Wn,generateMipmaps:!1}),Z.map.texture.name=ce.name+".shadowMap",Z.map.depthTexture=new Io(a.x,a.y,fr),Z.map.depthTexture.name=ce.name+".shadowMapDepth",Z.map.depthTexture.format=qr,Z.map.depthTexture.compareFunction=null,Z.map.depthTexture.minFilter=Un,Z.map.depthTexture.magFilter=Un}else ce.isPointLight?(Z.map=new Ey(a.x),Z.map.depthTexture=new bT(a.x,xr)):(Z.map=new gr(a.x,a.y),Z.map.depthTexture=new Io(a.x,a.y,xr)),Z.map.depthTexture.name=ce.name+".shadowMap",Z.map.depthTexture.format=qr,this.type===Wu?(Z.map.depthTexture.compareFunction=ue?Um:Im,Z.map.depthTexture.minFilter=Wn,Z.map.depthTexture.magFilter=Wn):(Z.map.depthTexture.compareFunction=null,Z.map.depthTexture.minFilter=Un,Z.map.depthTexture.magFilter=Un);Z.camera.updateProjectionMatrix()}const he=Z.map.isWebGLCubeRenderTarget?6:1;for(let k=0;k<he;k++){if(Z.map.isWebGLCubeRenderTarget)i.setRenderTarget(Z.map,k),i.clear();else{k===0&&(i.setRenderTarget(Z.map),i.clear());const X=Z.getViewport(k);c.set(l.x*X.x,l.y*X.y,l.x*X.z,l.y*X.w),K.viewport(c)}if(ce.isPointLight){const X=Z.camera,Fe=Z.matrix,je=ce.distance||X.far;je!==X.far&&(X.far=je,X.updateProjectionMatrix()),Dl.setFromMatrixPosition(ce.matrixWorld),X.position.copy(Dl),Xf.copy(X.position),Xf.add(RP[k]),X.up.copy(AP[k]),X.lookAt(Xf),X.updateMatrixWorld(),Fe.makeTranslation(-Dl.x,-Dl.y,-Dl.z),qx.multiplyMatrices(X.projectionMatrix,X.matrixWorldInverse),Z._frustum.setFromProjectionMatrix(qx,X.coordinateSystem,X.reversedDepth)}else Z.updateMatrices(ce);r=Z.getFrustum(),C(F,T,Z.camera,ce,this.type)}Z.isPointLightShadow!==!0&&this.type===Ul&&N(Z,T),Z.needsUpdate=!1}y=this.type,x.needsUpdate=!1,i.setRenderTarget(I,G,H)};function N(L,F){const T=e.update(w);v.defines.VSM_SAMPLES!==L.blurSamples&&(v.defines.VSM_SAMPLES=L.blurSamples,S.defines.VSM_SAMPLES=L.blurSamples,v.needsUpdate=!0,S.needsUpdate=!0),L.mapPass===null&&(L.mapPass=new gr(a.x,a.y,{format:Ea,type:$r})),v.uniforms.shadow_pass.value=L.map.depthTexture,v.uniforms.resolution.value=L.mapSize,v.uniforms.radius.value=L.radius,i.setRenderTarget(L.mapPass),i.clear(),i.renderBufferDirect(F,null,T,v,w,null),S.uniforms.shadow_pass.value=L.mapPass.texture,S.uniforms.resolution.value=L.mapSize,S.uniforms.radius.value=L.radius,i.setRenderTarget(L.map),i.clear(),i.renderBufferDirect(F,null,T,S,w,null)}function P(L,F,T,I){let G=null;const H=T.isPointLight===!0?L.customDistanceMaterial:L.customDepthMaterial;if(H!==void 0)G=H;else if(G=T.isPointLight===!0?h:d,i.localClippingEnabled&&F.clipShadows===!0&&Array.isArray(F.clippingPlanes)&&F.clippingPlanes.length!==0||F.displacementMap&&F.displacementScale!==0||F.alphaMap&&F.alphaTest>0||F.map&&F.alphaTest>0||F.alphaToCoverage===!0){const K=G.uuid,re=F.uuid;let fe=f[K];fe===void 0&&(fe={},f[K]=fe);let O=fe[re];O===void 0&&(O=G.clone(),fe[re]=O,F.addEventListener("dispose",D)),G=O}if(G.visible=F.visible,G.wireframe=F.wireframe,I===Ul?G.side=F.shadowSide!==null?F.shadowSide:F.side:G.side=F.shadowSide!==null?F.shadowSide:g[F.side],G.alphaMap=F.alphaMap,G.alphaTest=F.alphaToCoverage===!0?.5:F.alphaTest,G.map=F.map,G.clipShadows=F.clipShadows,G.clippingPlanes=F.clippingPlanes,G.clipIntersection=F.clipIntersection,G.displacementMap=F.displacementMap,G.displacementScale=F.displacementScale,G.displacementBias=F.displacementBias,G.wireframeLinewidth=F.wireframeLinewidth,G.linewidth=F.linewidth,T.isPointLight===!0&&G.isMeshDistanceMaterial===!0){const K=i.properties.get(G);K.light=T}return G}function C(L,F,T,I,G){if(L.visible===!1)return;if(L.layers.test(F.layers)&&(L.isMesh||L.isLine||L.isPoints)&&(L.castShadow||L.receiveShadow&&G===Ul)&&(!L.frustumCulled||r.intersectsObject(L))){L.modelViewMatrix.multiplyMatrices(T.matrixWorldInverse,L.matrixWorld);const re=e.update(L),fe=L.material;if(Array.isArray(fe)){const O=re.groups;for(let ce=0,Z=O.length;ce<Z;ce++){const q=O[ce],ue=fe[q.materialIndex];if(ue&&ue.visible){const he=P(L,ue,I,G);L.onBeforeShadow(i,L,F,T,re,he,q),i.renderBufferDirect(T,null,re,he,L,q),L.onAfterShadow(i,L,F,T,re,he,q)}}}else if(fe.visible){const O=P(L,fe,I,G);L.onBeforeShadow(i,L,F,T,re,O,null),i.renderBufferDirect(T,null,re,O,L,null),L.onAfterShadow(i,L,F,T,re,O,null)}}const K=L.children;for(let re=0,fe=K.length;re<fe;re++)C(K[re],F,T,I,G)}function D(L){L.target.removeEventListener("dispose",D);for(const T in f){const I=f[T],G=L.target.uuid;G in I&&(I[G].dispose(),delete I[G])}}}function NP(i,e){function t(){let j=!1;const Ne=new ln;let ye=null;const De=new ln(0,0,0,0);return{setMask:function(Oe){ye!==Oe&&!j&&(i.colorMask(Oe,Oe,Oe,Oe),ye=Oe)},setLocked:function(Oe){j=Oe},setClear:function(Oe,Ee,Ke,qe,Ht){Ht===!0&&(Oe*=qe,Ee*=qe,Ke*=qe),Ne.set(Oe,Ee,Ke,qe),De.equals(Ne)===!1&&(i.clearColor(Oe,Ee,Ke,qe),De.copy(Ne))},reset:function(){j=!1,ye=null,De.set(-1,0,0,0)}}}function r(){let j=!1,Ne=!1,ye=null,De=null,Oe=null;return{setReversed:function(Ee){if(Ne!==Ee){const Ke=e.get("EXT_clip_control");Ee?Ke.clipControlEXT(Ke.LOWER_LEFT_EXT,Ke.ZERO_TO_ONE_EXT):Ke.clipControlEXT(Ke.LOWER_LEFT_EXT,Ke.NEGATIVE_ONE_TO_ONE_EXT),Ne=Ee;const qe=Oe;Oe=null,this.setClear(qe)}},getReversed:function(){return Ne},setTest:function(Ee){Ee?xe(i.DEPTH_TEST):te(i.DEPTH_TEST)},setMask:function(Ee){ye!==Ee&&!j&&(i.depthMask(Ee),ye=Ee)},setFunc:function(Ee){if(Ne&&(Ee=Jw[Ee]),De!==Ee){switch(Ee){case pp:i.depthFunc(i.NEVER);break;case mp:i.depthFunc(i.ALWAYS);break;case gp:i.depthFunc(i.LESS);break;case Lo:i.depthFunc(i.LEQUAL);break;case vp:i.depthFunc(i.EQUAL);break;case xp:i.depthFunc(i.GEQUAL);break;case _p:i.depthFunc(i.GREATER);break;case yp:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}De=Ee}},setLocked:function(Ee){j=Ee},setClear:function(Ee){Oe!==Ee&&(Oe=Ee,Ne&&(Ee=1-Ee),i.clearDepth(Ee))},reset:function(){j=!1,ye=null,De=null,Oe=null,Ne=!1}}}function a(){let j=!1,Ne=null,ye=null,De=null,Oe=null,Ee=null,Ke=null,qe=null,Ht=null;return{setTest:function(It){j||(It?xe(i.STENCIL_TEST):te(i.STENCIL_TEST))},setMask:function(It){Ne!==It&&!j&&(i.stencilMask(It),Ne=It)},setFunc:function(It,Fn,wi){(ye!==It||De!==Fn||Oe!==wi)&&(i.stencilFunc(It,Fn,wi),ye=It,De=Fn,Oe=wi)},setOp:function(It,Fn,wi){(Ee!==It||Ke!==Fn||qe!==wi)&&(i.stencilOp(It,Fn,wi),Ee=It,Ke=Fn,qe=wi)},setLocked:function(It){j=It},setClear:function(It){Ht!==It&&(i.clearStencil(It),Ht=It)},reset:function(){j=!1,Ne=null,ye=null,De=null,Oe=null,Ee=null,Ke=null,qe=null,Ht=null}}}const l=new t,c=new r,d=new a,h=new WeakMap,f=new WeakMap;let m={},g={},v={},S=new WeakMap,E=[],w=null,x=!1,y=null,N=null,P=null,C=null,D=null,L=null,F=null,T=new gt(0,0,0),I=0,G=!1,H=null,K=null,re=null,fe=null,O=null;const ce=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let Z=!1,q=0;const ue=i.getParameter(i.VERSION);ue.indexOf("WebGL")!==-1?(q=parseFloat(/^WebGL (\d)/.exec(ue)[1]),Z=q>=1):ue.indexOf("OpenGL ES")!==-1&&(q=parseFloat(/^OpenGL ES (\d)/.exec(ue)[1]),Z=q>=2);let he=null,k={};const X=i.getParameter(i.SCISSOR_BOX),Fe=i.getParameter(i.VIEWPORT),je=new ln().fromArray(X),Ge=new ln().fromArray(Fe);function de(j,Ne,ye,De){const Oe=new Uint8Array(4),Ee=i.createTexture();i.bindTexture(j,Ee),i.texParameteri(j,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(j,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Ke=0;Ke<ye;Ke++)j===i.TEXTURE_3D||j===i.TEXTURE_2D_ARRAY?i.texImage3D(Ne,0,i.RGBA,1,1,De,0,i.RGBA,i.UNSIGNED_BYTE,Oe):i.texImage2D(Ne+Ke,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Oe);return Ee}const Se={};Se[i.TEXTURE_2D]=de(i.TEXTURE_2D,i.TEXTURE_2D,1),Se[i.TEXTURE_CUBE_MAP]=de(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),Se[i.TEXTURE_2D_ARRAY]=de(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),Se[i.TEXTURE_3D]=de(i.TEXTURE_3D,i.TEXTURE_3D,1,1),l.setClear(0,0,0,1),c.setClear(1),d.setClear(0),xe(i.DEPTH_TEST),c.setFunc(Lo),Wt(!1),$t(Hv),xe(i.CULL_FACE),Et(Gr);function xe(j){m[j]!==!0&&(i.enable(j),m[j]=!0)}function te(j){m[j]!==!1&&(i.disable(j),m[j]=!1)}function Ue(j,Ne){return v[j]!==Ne?(i.bindFramebuffer(j,Ne),v[j]=Ne,j===i.DRAW_FRAMEBUFFER&&(v[i.FRAMEBUFFER]=Ne),j===i.FRAMEBUFFER&&(v[i.DRAW_FRAMEBUFFER]=Ne),!0):!1}function tt(j,Ne){let ye=E,De=!1;if(j){ye=S.get(Ne),ye===void 0&&(ye=[],S.set(Ne,ye));const Oe=j.textures;if(ye.length!==Oe.length||ye[0]!==i.COLOR_ATTACHMENT0){for(let Ee=0,Ke=Oe.length;Ee<Ke;Ee++)ye[Ee]=i.COLOR_ATTACHMENT0+Ee;ye.length=Oe.length,De=!0}}else ye[0]!==i.BACK&&(ye[0]=i.BACK,De=!0);De&&i.drawBuffers(ye)}function Dt(j){return w!==j?(i.useProgram(j),w=j,!0):!1}const ct={[aa]:i.FUNC_ADD,[Mw]:i.FUNC_SUBTRACT,[Ew]:i.FUNC_REVERSE_SUBTRACT};ct[ww]=i.MIN,ct[Tw]=i.MAX;const At={[bw]:i.ZERO,[Cw]:i.ONE,[Rw]:i.SRC_COLOR,[hp]:i.SRC_ALPHA,[Iw]:i.SRC_ALPHA_SATURATE,[Lw]:i.DST_COLOR,[Pw]:i.DST_ALPHA,[Aw]:i.ONE_MINUS_SRC_COLOR,[fp]:i.ONE_MINUS_SRC_ALPHA,[Dw]:i.ONE_MINUS_DST_COLOR,[Nw]:i.ONE_MINUS_DST_ALPHA,[Uw]:i.CONSTANT_COLOR,[Fw]:i.ONE_MINUS_CONSTANT_COLOR,[Ow]:i.CONSTANT_ALPHA,[kw]:i.ONE_MINUS_CONSTANT_ALPHA};function Et(j,Ne,ye,De,Oe,Ee,Ke,qe,Ht,It){if(j===Gr){x===!0&&(te(i.BLEND),x=!1);return}if(x===!1&&(xe(i.BLEND),x=!0),j!==Sw){if(j!==y||It!==G){if((N!==aa||D!==aa)&&(i.blendEquation(i.FUNC_ADD),N=aa,D=aa),It)switch(j){case mo:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Vv:i.blendFunc(i.ONE,i.ONE);break;case Gv:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Wv:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Nt("WebGLState: Invalid blending: ",j);break}else switch(j){case mo:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Vv:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case Gv:Nt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Wv:Nt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Nt("WebGLState: Invalid blending: ",j);break}P=null,C=null,L=null,F=null,T.set(0,0,0),I=0,y=j,G=It}return}Oe=Oe||Ne,Ee=Ee||ye,Ke=Ke||De,(Ne!==N||Oe!==D)&&(i.blendEquationSeparate(ct[Ne],ct[Oe]),N=Ne,D=Oe),(ye!==P||De!==C||Ee!==L||Ke!==F)&&(i.blendFuncSeparate(At[ye],At[De],At[Ee],At[Ke]),P=ye,C=De,L=Ee,F=Ke),(qe.equals(T)===!1||Ht!==I)&&(i.blendColor(qe.r,qe.g,qe.b,Ht),T.copy(qe),I=Ht),y=j,G=!1}function _t(j,Ne){j.side===hr?te(i.CULL_FACE):xe(i.CULL_FACE);let ye=j.side===hi;Ne&&(ye=!ye),Wt(ye),j.blending===mo&&j.transparent===!1?Et(Gr):Et(j.blending,j.blendEquation,j.blendSrc,j.blendDst,j.blendEquationAlpha,j.blendSrcAlpha,j.blendDstAlpha,j.blendColor,j.blendAlpha,j.premultipliedAlpha),c.setFunc(j.depthFunc),c.setTest(j.depthTest),c.setMask(j.depthWrite),l.setMask(j.colorWrite);const De=j.stencilWrite;d.setTest(De),De&&(d.setMask(j.stencilWriteMask),d.setFunc(j.stencilFunc,j.stencilRef,j.stencilFuncMask),d.setOp(j.stencilFail,j.stencilZFail,j.stencilZPass)),qt(j.polygonOffset,j.polygonOffsetFactor,j.polygonOffsetUnits),j.alphaToCoverage===!0?xe(i.SAMPLE_ALPHA_TO_COVERAGE):te(i.SAMPLE_ALPHA_TO_COVERAGE)}function Wt(j){H!==j&&(j?i.frontFace(i.CW):i.frontFace(i.CCW),H=j)}function $t(j){j!==xw?(xe(i.CULL_FACE),j!==K&&(j===Hv?i.cullFace(i.BACK):j===_w?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):te(i.CULL_FACE),K=j}function Jt(j){j!==re&&(Z&&i.lineWidth(j),re=j)}function qt(j,Ne,ye){j?(xe(i.POLYGON_OFFSET_FILL),(fe!==Ne||O!==ye)&&(fe=Ne,O=ye,c.getReversed()&&(Ne=-Ne),i.polygonOffset(Ne,ye))):te(i.POLYGON_OFFSET_FILL)}function wt(j){j?xe(i.SCISSOR_TEST):te(i.SCISSOR_TEST)}function Gt(j){j===void 0&&(j=i.TEXTURE0+ce-1),he!==j&&(i.activeTexture(j),he=j)}function Y(j,Ne,ye){ye===void 0&&(he===null?ye=i.TEXTURE0+ce-1:ye=he);let De=k[ye];De===void 0&&(De={type:void 0,texture:void 0},k[ye]=De),(De.type!==j||De.texture!==Ne)&&(he!==ye&&(i.activeTexture(ye),he=ye),i.bindTexture(j,Ne||Se[j]),De.type=j,De.texture=Ne)}function xn(){const j=k[he];j!==void 0&&j.type!==void 0&&(i.bindTexture(j.type,null),j.type=void 0,j.texture=void 0)}function Ct(){try{i.compressedTexImage2D(...arguments)}catch(j){Nt("WebGLState:",j)}}function U(){try{i.compressedTexImage3D(...arguments)}catch(j){Nt("WebGLState:",j)}}function b(){try{i.texSubImage2D(...arguments)}catch(j){Nt("WebGLState:",j)}}function J(){try{i.texSubImage3D(...arguments)}catch(j){Nt("WebGLState:",j)}}function se(){try{i.compressedTexSubImage2D(...arguments)}catch(j){Nt("WebGLState:",j)}}function ge(){try{i.compressedTexSubImage3D(...arguments)}catch(j){Nt("WebGLState:",j)}}function Te(){try{i.texStorage2D(...arguments)}catch(j){Nt("WebGLState:",j)}}function Ae(){try{i.texStorage3D(...arguments)}catch(j){Nt("WebGLState:",j)}}function ve(){try{i.texImage2D(...arguments)}catch(j){Nt("WebGLState:",j)}}function _e(){try{i.texImage3D(...arguments)}catch(j){Nt("WebGLState:",j)}}function Ie(j){return g[j]!==void 0?g[j]:i.getParameter(j)}function Xe(j,Ne){g[j]!==Ne&&(i.pixelStorei(j,Ne),g[j]=Ne)}function ne(j){je.equals(j)===!1&&(i.scissor(j.x,j.y,j.z,j.w),je.copy(j))}function Me(j){Ge.equals(j)===!1&&(i.viewport(j.x,j.y,j.z,j.w),Ge.copy(j))}function ke(j,Ne){let ye=f.get(Ne);ye===void 0&&(ye=new WeakMap,f.set(Ne,ye));let De=ye.get(j);De===void 0&&(De=i.getUniformBlockIndex(Ne,j.name),ye.set(j,De))}function nt(j,Ne){const De=f.get(Ne).get(j);h.get(Ne)!==De&&(i.uniformBlockBinding(Ne,De,j.__bindingPointIndex),h.set(Ne,De))}function st(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),c.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),m={},g={},he=null,k={},v={},S=new WeakMap,E=[],w=null,x=!1,y=null,N=null,P=null,C=null,D=null,L=null,F=null,T=new gt(0,0,0),I=0,G=!1,H=null,K=null,re=null,fe=null,O=null,je.set(0,0,i.canvas.width,i.canvas.height),Ge.set(0,0,i.canvas.width,i.canvas.height),l.reset(),c.reset(),d.reset()}return{buffers:{color:l,depth:c,stencil:d},enable:xe,disable:te,bindFramebuffer:Ue,drawBuffers:tt,useProgram:Dt,setBlending:Et,setMaterial:_t,setFlipSided:Wt,setCullFace:$t,setLineWidth:Jt,setPolygonOffset:qt,setScissorTest:wt,activeTexture:Gt,bindTexture:Y,unbindTexture:xn,compressedTexImage2D:Ct,compressedTexImage3D:U,texImage2D:ve,texImage3D:_e,pixelStorei:Xe,getParameter:Ie,updateUBOMapping:ke,uniformBlockBinding:nt,texStorage2D:Te,texStorage3D:Ae,texSubImage2D:b,texSubImage3D:J,compressedTexSubImage2D:se,compressedTexSubImage3D:ge,scissor:ne,viewport:Me,reset:st}}function LP(i,e,t,r,a,l,c){const d=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,h=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),f=new dt,m=new WeakMap,g=new Set;let v;const S=new WeakMap;let E=!1;try{E=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function w(U,b){return E?new OffscreenCanvas(U,b):$l("canvas")}function x(U,b,J){let se=1;const ge=Ct(U);if((ge.width>J||ge.height>J)&&(se=J/Math.max(ge.width,ge.height)),se<1)if(typeof HTMLImageElement<"u"&&U instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&U instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&U instanceof ImageBitmap||typeof VideoFrame<"u"&&U instanceof VideoFrame){const Te=Math.floor(se*ge.width),Ae=Math.floor(se*ge.height);v===void 0&&(v=w(Te,Ae));const ve=b?w(Te,Ae):v;return ve.width=Te,ve.height=Ae,ve.getContext("2d").drawImage(U,0,0,Te,Ae),lt("WebGLRenderer: Texture has been resized from ("+ge.width+"x"+ge.height+") to ("+Te+"x"+Ae+")."),ve}else return"data"in U&&lt("WebGLRenderer: Image in DataTexture is too big ("+ge.width+"x"+ge.height+")."),U;return U}function y(U){return U.generateMipmaps}function N(U){i.generateMipmap(U)}function P(U){return U.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:U.isWebGL3DRenderTarget?i.TEXTURE_3D:U.isWebGLArrayRenderTarget||U.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function C(U,b,J,se,ge,Te=!1){if(U!==null){if(i[U]!==void 0)return i[U];lt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+U+"'")}let Ae;se&&(Ae=e.get("EXT_texture_norm16"),Ae||lt("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let ve=b;if(b===i.RED&&(J===i.FLOAT&&(ve=i.R32F),J===i.HALF_FLOAT&&(ve=i.R16F),J===i.UNSIGNED_BYTE&&(ve=i.R8),J===i.UNSIGNED_SHORT&&Ae&&(ve=Ae.R16_EXT),J===i.SHORT&&Ae&&(ve=Ae.R16_SNORM_EXT)),b===i.RED_INTEGER&&(J===i.UNSIGNED_BYTE&&(ve=i.R8UI),J===i.UNSIGNED_SHORT&&(ve=i.R16UI),J===i.UNSIGNED_INT&&(ve=i.R32UI),J===i.BYTE&&(ve=i.R8I),J===i.SHORT&&(ve=i.R16I),J===i.INT&&(ve=i.R32I)),b===i.RG&&(J===i.FLOAT&&(ve=i.RG32F),J===i.HALF_FLOAT&&(ve=i.RG16F),J===i.UNSIGNED_BYTE&&(ve=i.RG8),J===i.UNSIGNED_SHORT&&Ae&&(ve=Ae.RG16_EXT),J===i.SHORT&&Ae&&(ve=Ae.RG16_SNORM_EXT)),b===i.RG_INTEGER&&(J===i.UNSIGNED_BYTE&&(ve=i.RG8UI),J===i.UNSIGNED_SHORT&&(ve=i.RG16UI),J===i.UNSIGNED_INT&&(ve=i.RG32UI),J===i.BYTE&&(ve=i.RG8I),J===i.SHORT&&(ve=i.RG16I),J===i.INT&&(ve=i.RG32I)),b===i.RGB_INTEGER&&(J===i.UNSIGNED_BYTE&&(ve=i.RGB8UI),J===i.UNSIGNED_SHORT&&(ve=i.RGB16UI),J===i.UNSIGNED_INT&&(ve=i.RGB32UI),J===i.BYTE&&(ve=i.RGB8I),J===i.SHORT&&(ve=i.RGB16I),J===i.INT&&(ve=i.RGB32I)),b===i.RGBA_INTEGER&&(J===i.UNSIGNED_BYTE&&(ve=i.RGBA8UI),J===i.UNSIGNED_SHORT&&(ve=i.RGBA16UI),J===i.UNSIGNED_INT&&(ve=i.RGBA32UI),J===i.BYTE&&(ve=i.RGBA8I),J===i.SHORT&&(ve=i.RGBA16I),J===i.INT&&(ve=i.RGBA32I)),b===i.RGB&&(J===i.UNSIGNED_SHORT&&Ae&&(ve=Ae.RGB16_EXT),J===i.SHORT&&Ae&&(ve=Ae.RGB16_SNORM_EXT),J===i.UNSIGNED_INT_5_9_9_9_REV&&(ve=i.RGB9_E5),J===i.UNSIGNED_INT_10F_11F_11F_REV&&(ve=i.R11F_G11F_B10F)),b===i.RGBA){const _e=Te?ad:bt.getTransfer(ge);J===i.FLOAT&&(ve=i.RGBA32F),J===i.HALF_FLOAT&&(ve=i.RGBA16F),J===i.UNSIGNED_BYTE&&(ve=_e===Bt?i.SRGB8_ALPHA8:i.RGBA8),J===i.UNSIGNED_SHORT&&Ae&&(ve=Ae.RGBA16_EXT),J===i.SHORT&&Ae&&(ve=Ae.RGBA16_SNORM_EXT),J===i.UNSIGNED_SHORT_4_4_4_4&&(ve=i.RGBA4),J===i.UNSIGNED_SHORT_5_5_5_1&&(ve=i.RGB5_A1)}return(ve===i.R16F||ve===i.R32F||ve===i.RG16F||ve===i.RG32F||ve===i.RGBA16F||ve===i.RGBA32F)&&e.get("EXT_color_buffer_float"),ve}function D(U,b){let J;return U?b===null||b===xr||b===jl?J=i.DEPTH24_STENCIL8:b===fr?J=i.DEPTH32F_STENCIL8:b===Wl&&(J=i.DEPTH24_STENCIL8,lt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):b===null||b===xr||b===jl?J=i.DEPTH_COMPONENT24:b===fr?J=i.DEPTH_COMPONENT32F:b===Wl&&(J=i.DEPTH_COMPONENT16),J}function L(U,b){return y(U)===!0||U.isFramebufferTexture&&U.minFilter!==Un&&U.minFilter!==Wn?Math.log2(Math.max(b.width,b.height))+1:U.mipmaps!==void 0&&U.mipmaps.length>0?U.mipmaps.length:U.isCompressedTexture&&Array.isArray(U.image)?b.mipmaps.length:1}function F(U){const b=U.target;b.removeEventListener("dispose",F),I(b),b.isVideoTexture&&m.delete(b),b.isHTMLTexture&&g.delete(b)}function T(U){const b=U.target;b.removeEventListener("dispose",T),H(b)}function I(U){const b=r.get(U);if(b.__webglInit===void 0)return;const J=U.source,se=S.get(J);if(se){const ge=se[b.__cacheKey];ge.usedTimes--,ge.usedTimes===0&&G(U),Object.keys(se).length===0&&S.delete(J)}r.remove(U)}function G(U){const b=r.get(U);i.deleteTexture(b.__webglTexture);const J=U.source,se=S.get(J);delete se[b.__cacheKey],c.memory.textures--}function H(U){const b=r.get(U);if(U.depthTexture&&(U.depthTexture.dispose(),r.remove(U.depthTexture)),U.isWebGLCubeRenderTarget)for(let se=0;se<6;se++){if(Array.isArray(b.__webglFramebuffer[se]))for(let ge=0;ge<b.__webglFramebuffer[se].length;ge++)i.deleteFramebuffer(b.__webglFramebuffer[se][ge]);else i.deleteFramebuffer(b.__webglFramebuffer[se]);b.__webglDepthbuffer&&i.deleteRenderbuffer(b.__webglDepthbuffer[se])}else{if(Array.isArray(b.__webglFramebuffer))for(let se=0;se<b.__webglFramebuffer.length;se++)i.deleteFramebuffer(b.__webglFramebuffer[se]);else i.deleteFramebuffer(b.__webglFramebuffer);if(b.__webglDepthbuffer&&i.deleteRenderbuffer(b.__webglDepthbuffer),b.__webglMultisampledFramebuffer&&i.deleteFramebuffer(b.__webglMultisampledFramebuffer),b.__webglColorRenderbuffer)for(let se=0;se<b.__webglColorRenderbuffer.length;se++)b.__webglColorRenderbuffer[se]&&i.deleteRenderbuffer(b.__webglColorRenderbuffer[se]);b.__webglDepthRenderbuffer&&i.deleteRenderbuffer(b.__webglDepthRenderbuffer)}const J=U.textures;for(let se=0,ge=J.length;se<ge;se++){const Te=r.get(J[se]);Te.__webglTexture&&(i.deleteTexture(Te.__webglTexture),c.memory.textures--),r.remove(J[se])}r.remove(U)}let K=0;function re(){K=0}function fe(){return K}function O(U){K=U}function ce(){const U=K;return U>=a.maxTextures&&lt("WebGLTextures: Trying to use "+U+" texture units while this GPU supports only "+a.maxTextures),K+=1,U}function Z(U){const b=[];return b.push(U.wrapS),b.push(U.wrapT),b.push(U.wrapR||0),b.push(U.magFilter),b.push(U.minFilter),b.push(U.anisotropy),b.push(U.internalFormat),b.push(U.format),b.push(U.type),b.push(U.generateMipmaps),b.push(U.premultiplyAlpha),b.push(U.flipY),b.push(U.unpackAlignment),b.push(U.colorSpace),b.join()}function q(U,b){const J=r.get(U);if(U.isVideoTexture&&Y(U),U.isRenderTargetTexture===!1&&U.isExternalTexture!==!0&&U.version>0&&J.__version!==U.version){const se=U.image;if(se===null)lt("WebGLRenderer: Texture marked for update but no image data found.");else if(se.complete===!1)lt("WebGLRenderer: Texture marked for update but image is incomplete");else{te(J,U,b);return}}else U.isExternalTexture&&(J.__webglTexture=U.sourceTexture?U.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,J.__webglTexture,i.TEXTURE0+b)}function ue(U,b){const J=r.get(U);if(U.isRenderTargetTexture===!1&&U.version>0&&J.__version!==U.version){te(J,U,b);return}else U.isExternalTexture&&(J.__webglTexture=U.sourceTexture?U.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,J.__webglTexture,i.TEXTURE0+b)}function he(U,b){const J=r.get(U);if(U.isRenderTargetTexture===!1&&U.version>0&&J.__version!==U.version){te(J,U,b);return}t.bindTexture(i.TEXTURE_3D,J.__webglTexture,i.TEXTURE0+b)}function k(U,b){const J=r.get(U);if(U.isCubeDepthTexture!==!0&&U.version>0&&J.__version!==U.version){Ue(J,U,b);return}t.bindTexture(i.TEXTURE_CUBE_MAP,J.__webglTexture,i.TEXTURE0+b)}const X={[Sp]:i.REPEAT,[Vr]:i.CLAMP_TO_EDGE,[Mp]:i.MIRRORED_REPEAT},Fe={[Un]:i.NEAREST,[Hw]:i.NEAREST_MIPMAP_NEAREST,[fu]:i.NEAREST_MIPMAP_LINEAR,[Wn]:i.LINEAR,[hf]:i.LINEAR_MIPMAP_NEAREST,[ua]:i.LINEAR_MIPMAP_LINEAR},je={[Ww]:i.NEVER,[Yw]:i.ALWAYS,[jw]:i.LESS,[Im]:i.LEQUAL,[Xw]:i.EQUAL,[Um]:i.GEQUAL,[$w]:i.GREATER,[qw]:i.NOTEQUAL};function Ge(U,b){if(b.type===fr&&e.has("OES_texture_float_linear")===!1&&(b.magFilter===Wn||b.magFilter===hf||b.magFilter===fu||b.magFilter===ua||b.minFilter===Wn||b.minFilter===hf||b.minFilter===fu||b.minFilter===ua)&&lt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(U,i.TEXTURE_WRAP_S,X[b.wrapS]),i.texParameteri(U,i.TEXTURE_WRAP_T,X[b.wrapT]),(U===i.TEXTURE_3D||U===i.TEXTURE_2D_ARRAY)&&i.texParameteri(U,i.TEXTURE_WRAP_R,X[b.wrapR]),i.texParameteri(U,i.TEXTURE_MAG_FILTER,Fe[b.magFilter]),i.texParameteri(U,i.TEXTURE_MIN_FILTER,Fe[b.minFilter]),b.compareFunction&&(i.texParameteri(U,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(U,i.TEXTURE_COMPARE_FUNC,je[b.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(b.magFilter===Un||b.minFilter!==fu&&b.minFilter!==ua||b.type===fr&&e.has("OES_texture_float_linear")===!1)return;if(b.anisotropy>1||r.get(b).__currentAnisotropy){const J=e.get("EXT_texture_filter_anisotropic");i.texParameterf(U,J.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(b.anisotropy,a.getMaxAnisotropy())),r.get(b).__currentAnisotropy=b.anisotropy}}}function de(U,b){let J=!1;U.__webglInit===void 0&&(U.__webglInit=!0,b.addEventListener("dispose",F));const se=b.source;let ge=S.get(se);ge===void 0&&(ge={},S.set(se,ge));const Te=Z(b);if(Te!==U.__cacheKey){ge[Te]===void 0&&(ge[Te]={texture:i.createTexture(),usedTimes:0},c.memory.textures++,J=!0),ge[Te].usedTimes++;const Ae=ge[U.__cacheKey];Ae!==void 0&&(ge[U.__cacheKey].usedTimes--,Ae.usedTimes===0&&G(b)),U.__cacheKey=Te,U.__webglTexture=ge[Te].texture}return J}function Se(U,b,J){return Math.floor(Math.floor(U/J)/b)}function xe(U,b,J,se){const Te=U.updateRanges;if(Te.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,b.width,b.height,J,se,b.data);else{Te.sort((Xe,ne)=>Xe.start-ne.start);let Ae=0;for(let Xe=1;Xe<Te.length;Xe++){const ne=Te[Ae],Me=Te[Xe],ke=ne.start+ne.count,nt=Se(Me.start,b.width,4),st=Se(ne.start,b.width,4);Me.start<=ke+1&&nt===st&&Se(Me.start+Me.count-1,b.width,4)===nt?ne.count=Math.max(ne.count,Me.start+Me.count-ne.start):(++Ae,Te[Ae]=Me)}Te.length=Ae+1;const ve=t.getParameter(i.UNPACK_ROW_LENGTH),_e=t.getParameter(i.UNPACK_SKIP_PIXELS),Ie=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,b.width);for(let Xe=0,ne=Te.length;Xe<ne;Xe++){const Me=Te[Xe],ke=Math.floor(Me.start/4),nt=Math.ceil(Me.count/4),st=ke%b.width,j=Math.floor(ke/b.width),Ne=nt,ye=1;t.pixelStorei(i.UNPACK_SKIP_PIXELS,st),t.pixelStorei(i.UNPACK_SKIP_ROWS,j),t.texSubImage2D(i.TEXTURE_2D,0,st,j,Ne,ye,J,se,b.data)}U.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,ve),t.pixelStorei(i.UNPACK_SKIP_PIXELS,_e),t.pixelStorei(i.UNPACK_SKIP_ROWS,Ie)}}function te(U,b,J){let se=i.TEXTURE_2D;(b.isDataArrayTexture||b.isCompressedArrayTexture)&&(se=i.TEXTURE_2D_ARRAY),b.isData3DTexture&&(se=i.TEXTURE_3D);const ge=de(U,b),Te=b.source;t.bindTexture(se,U.__webglTexture,i.TEXTURE0+J);const Ae=r.get(Te);if(Te.version!==Ae.__version||ge===!0){if(t.activeTexture(i.TEXTURE0+J),(typeof ImageBitmap<"u"&&b.image instanceof ImageBitmap)===!1){const ye=bt.getPrimaries(bt.workingColorSpace),De=b.colorSpace===Es?null:bt.getPrimaries(b.colorSpace),Oe=b.colorSpace===Es||ye===De?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,b.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,b.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Oe)}t.pixelStorei(i.UNPACK_ALIGNMENT,b.unpackAlignment);let _e=x(b.image,!1,a.maxTextureSize);_e=xn(b,_e);const Ie=l.convert(b.format,b.colorSpace),Xe=l.convert(b.type);let ne=C(b.internalFormat,Ie,Xe,b.normalized,b.colorSpace,b.isVideoTexture);Ge(se,b);let Me;const ke=b.mipmaps,nt=b.isVideoTexture!==!0,st=Ae.__version===void 0||ge===!0,j=Te.dataReady,Ne=L(b,_e);if(b.isDepthTexture)ne=D(b.format===da,b.type),st&&(nt?t.texStorage2D(i.TEXTURE_2D,1,ne,_e.width,_e.height):t.texImage2D(i.TEXTURE_2D,0,ne,_e.width,_e.height,0,Ie,Xe,null));else if(b.isDataTexture)if(ke.length>0){nt&&st&&t.texStorage2D(i.TEXTURE_2D,Ne,ne,ke[0].width,ke[0].height);for(let ye=0,De=ke.length;ye<De;ye++)Me=ke[ye],nt?j&&t.texSubImage2D(i.TEXTURE_2D,ye,0,0,Me.width,Me.height,Ie,Xe,Me.data):t.texImage2D(i.TEXTURE_2D,ye,ne,Me.width,Me.height,0,Ie,Xe,Me.data);b.generateMipmaps=!1}else nt?(st&&t.texStorage2D(i.TEXTURE_2D,Ne,ne,_e.width,_e.height),j&&xe(b,_e,Ie,Xe)):t.texImage2D(i.TEXTURE_2D,0,ne,_e.width,_e.height,0,Ie,Xe,_e.data);else if(b.isCompressedTexture)if(b.isCompressedArrayTexture){nt&&st&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Ne,ne,ke[0].width,ke[0].height,_e.depth);for(let ye=0,De=ke.length;ye<De;ye++)if(Me=ke[ye],b.format!==Ki)if(Ie!==null)if(nt){if(j)if(b.layerUpdates.size>0){const Oe=Tx(Me.width,Me.height,b.format,b.type);for(const Ee of b.layerUpdates){const Ke=Me.data.subarray(Ee*Oe/Me.data.BYTES_PER_ELEMENT,(Ee+1)*Oe/Me.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ye,0,0,Ee,Me.width,Me.height,1,Ie,Ke)}b.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ye,0,0,0,Me.width,Me.height,_e.depth,Ie,Me.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,ye,ne,Me.width,Me.height,_e.depth,0,Me.data,0,0);else lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else nt?j&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,ye,0,0,0,Me.width,Me.height,_e.depth,Ie,Xe,Me.data):t.texImage3D(i.TEXTURE_2D_ARRAY,ye,ne,Me.width,Me.height,_e.depth,0,Ie,Xe,Me.data)}else{nt&&st&&t.texStorage2D(i.TEXTURE_2D,Ne,ne,ke[0].width,ke[0].height);for(let ye=0,De=ke.length;ye<De;ye++)Me=ke[ye],b.format!==Ki?Ie!==null?nt?j&&t.compressedTexSubImage2D(i.TEXTURE_2D,ye,0,0,Me.width,Me.height,Ie,Me.data):t.compressedTexImage2D(i.TEXTURE_2D,ye,ne,Me.width,Me.height,0,Me.data):lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):nt?j&&t.texSubImage2D(i.TEXTURE_2D,ye,0,0,Me.width,Me.height,Ie,Xe,Me.data):t.texImage2D(i.TEXTURE_2D,ye,ne,Me.width,Me.height,0,Ie,Xe,Me.data)}else if(b.isDataArrayTexture)if(nt){if(st&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Ne,ne,_e.width,_e.height,_e.depth),j)if(b.layerUpdates.size>0){const ye=Tx(_e.width,_e.height,b.format,b.type);for(const De of b.layerUpdates){const Oe=_e.data.subarray(De*ye/_e.data.BYTES_PER_ELEMENT,(De+1)*ye/_e.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,De,_e.width,_e.height,1,Ie,Xe,Oe)}b.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,_e.width,_e.height,_e.depth,Ie,Xe,_e.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,ne,_e.width,_e.height,_e.depth,0,Ie,Xe,_e.data);else if(b.isData3DTexture)nt?(st&&t.texStorage3D(i.TEXTURE_3D,Ne,ne,_e.width,_e.height,_e.depth),j&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,_e.width,_e.height,_e.depth,Ie,Xe,_e.data)):t.texImage3D(i.TEXTURE_3D,0,ne,_e.width,_e.height,_e.depth,0,Ie,Xe,_e.data);else if(b.isFramebufferTexture){if(st)if(nt)t.texStorage2D(i.TEXTURE_2D,Ne,ne,_e.width,_e.height);else{let ye=_e.width,De=_e.height;for(let Oe=0;Oe<Ne;Oe++)t.texImage2D(i.TEXTURE_2D,Oe,ne,ye,De,0,Ie,Xe,null),ye>>=1,De>>=1}}else if(b.isHTMLTexture){if("texElementImage2D"in i){const ye=i.canvas;if(ye.hasAttribute("layoutsubtree")||ye.setAttribute("layoutsubtree","true"),_e.parentNode!==ye){ye.appendChild(_e),g.add(b),ye.onpaint=De=>{const Oe=De.changedElements;for(const Ee of g)Oe.includes(Ee.image)&&(Ee.needsUpdate=!0)},ye.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,_e);else{const Oe=i.RGBA,Ee=i.RGBA,Ke=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,Oe,Ee,Ke,_e)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(ke.length>0){if(nt&&st){const ye=Ct(ke[0]);t.texStorage2D(i.TEXTURE_2D,Ne,ne,ye.width,ye.height)}for(let ye=0,De=ke.length;ye<De;ye++)Me=ke[ye],nt?j&&t.texSubImage2D(i.TEXTURE_2D,ye,0,0,Ie,Xe,Me):t.texImage2D(i.TEXTURE_2D,ye,ne,Ie,Xe,Me);b.generateMipmaps=!1}else if(nt){if(st){const ye=Ct(_e);t.texStorage2D(i.TEXTURE_2D,Ne,ne,ye.width,ye.height)}j&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,Ie,Xe,_e)}else t.texImage2D(i.TEXTURE_2D,0,ne,Ie,Xe,_e);y(b)&&N(se),Ae.__version=Te.version,b.onUpdate&&b.onUpdate(b)}U.__version=b.version}function Ue(U,b,J){if(b.image.length!==6)return;const se=de(U,b),ge=b.source;t.bindTexture(i.TEXTURE_CUBE_MAP,U.__webglTexture,i.TEXTURE0+J);const Te=r.get(ge);if(ge.version!==Te.__version||se===!0){t.activeTexture(i.TEXTURE0+J);const Ae=bt.getPrimaries(bt.workingColorSpace),ve=b.colorSpace===Es?null:bt.getPrimaries(b.colorSpace),_e=b.colorSpace===Es||Ae===ve?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,b.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,b.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,b.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,_e);const Ie=b.isCompressedTexture||b.image[0].isCompressedTexture,Xe=b.image[0]&&b.image[0].isDataTexture,ne=[];for(let Ee=0;Ee<6;Ee++)!Ie&&!Xe?ne[Ee]=x(b.image[Ee],!0,a.maxCubemapSize):ne[Ee]=Xe?b.image[Ee].image:b.image[Ee],ne[Ee]=xn(b,ne[Ee]);const Me=ne[0],ke=l.convert(b.format,b.colorSpace),nt=l.convert(b.type),st=C(b.internalFormat,ke,nt,b.normalized,b.colorSpace),j=b.isVideoTexture!==!0,Ne=Te.__version===void 0||se===!0,ye=ge.dataReady;let De=L(b,Me);Ge(i.TEXTURE_CUBE_MAP,b);let Oe;if(Ie){j&&Ne&&t.texStorage2D(i.TEXTURE_CUBE_MAP,De,st,Me.width,Me.height);for(let Ee=0;Ee<6;Ee++){Oe=ne[Ee].mipmaps;for(let Ke=0;Ke<Oe.length;Ke++){const qe=Oe[Ke];b.format!==Ki?ke!==null?j?ye&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,Ke,0,0,qe.width,qe.height,ke,qe.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,Ke,st,qe.width,qe.height,0,qe.data):lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):j?ye&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,Ke,0,0,qe.width,qe.height,ke,nt,qe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,Ke,st,qe.width,qe.height,0,ke,nt,qe.data)}}}else{if(Oe=b.mipmaps,j&&Ne){Oe.length>0&&De++;const Ee=Ct(ne[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,De,st,Ee.width,Ee.height)}for(let Ee=0;Ee<6;Ee++)if(Xe){j?ye&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,0,0,0,ne[Ee].width,ne[Ee].height,ke,nt,ne[Ee].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,0,st,ne[Ee].width,ne[Ee].height,0,ke,nt,ne[Ee].data);for(let Ke=0;Ke<Oe.length;Ke++){const Ht=Oe[Ke].image[Ee].image;j?ye&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,Ke+1,0,0,Ht.width,Ht.height,ke,nt,Ht.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,Ke+1,st,Ht.width,Ht.height,0,ke,nt,Ht.data)}}else{j?ye&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,0,0,0,ke,nt,ne[Ee]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,0,st,ke,nt,ne[Ee]);for(let Ke=0;Ke<Oe.length;Ke++){const qe=Oe[Ke];j?ye&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,Ke+1,0,0,ke,nt,qe.image[Ee]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,Ke+1,st,ke,nt,qe.image[Ee])}}}y(b)&&N(i.TEXTURE_CUBE_MAP),Te.__version=ge.version,b.onUpdate&&b.onUpdate(b)}U.__version=b.version}function tt(U,b,J,se,ge,Te){const Ae=l.convert(J.format,J.colorSpace),ve=l.convert(J.type),_e=C(J.internalFormat,Ae,ve,J.normalized,J.colorSpace),Ie=r.get(b),Xe=r.get(J);if(Xe.__renderTarget=b,!Ie.__hasExternalTextures){const ne=Math.max(1,b.width>>Te),Me=Math.max(1,b.height>>Te);ge===i.TEXTURE_3D||ge===i.TEXTURE_2D_ARRAY?t.texImage3D(ge,Te,_e,ne,Me,b.depth,0,Ae,ve,null):t.texImage2D(ge,Te,_e,ne,Me,0,Ae,ve,null)}t.bindFramebuffer(i.FRAMEBUFFER,U),Gt(b)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,se,ge,Xe.__webglTexture,0,wt(b)):(ge===i.TEXTURE_2D||ge>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&ge<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,se,ge,Xe.__webglTexture,Te),t.bindFramebuffer(i.FRAMEBUFFER,null)}function Dt(U,b,J){if(i.bindRenderbuffer(i.RENDERBUFFER,U),b.depthBuffer){const se=b.depthTexture,ge=se&&se.isDepthTexture?se.type:null,Te=D(b.stencilBuffer,ge),Ae=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;Gt(b)?d.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,wt(b),Te,b.width,b.height):J?i.renderbufferStorageMultisample(i.RENDERBUFFER,wt(b),Te,b.width,b.height):i.renderbufferStorage(i.RENDERBUFFER,Te,b.width,b.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Ae,i.RENDERBUFFER,U)}else{const se=b.textures;for(let ge=0;ge<se.length;ge++){const Te=se[ge],Ae=l.convert(Te.format,Te.colorSpace),ve=l.convert(Te.type),_e=C(Te.internalFormat,Ae,ve,Te.normalized,Te.colorSpace);Gt(b)?d.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,wt(b),_e,b.width,b.height):J?i.renderbufferStorageMultisample(i.RENDERBUFFER,wt(b),_e,b.width,b.height):i.renderbufferStorage(i.RENDERBUFFER,_e,b.width,b.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function ct(U,b,J){const se=b.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,U),!(b.depthTexture&&b.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const ge=r.get(b.depthTexture);if(ge.__renderTarget=b,(!ge.__webglTexture||b.depthTexture.image.width!==b.width||b.depthTexture.image.height!==b.height)&&(b.depthTexture.image.width=b.width,b.depthTexture.image.height=b.height,b.depthTexture.needsUpdate=!0),se){if(ge.__webglInit===void 0&&(ge.__webglInit=!0,b.depthTexture.addEventListener("dispose",F)),ge.__webglTexture===void 0){ge.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,ge.__webglTexture),Ge(i.TEXTURE_CUBE_MAP,b.depthTexture);const Ie=l.convert(b.depthTexture.format),Xe=l.convert(b.depthTexture.type);let ne;b.depthTexture.format===qr?ne=i.DEPTH_COMPONENT24:b.depthTexture.format===da&&(ne=i.DEPTH24_STENCIL8);for(let Me=0;Me<6;Me++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,ne,b.width,b.height,0,Ie,Xe,null)}}else q(b.depthTexture,0);const Te=ge.__webglTexture,Ae=wt(b),ve=se?i.TEXTURE_CUBE_MAP_POSITIVE_X+J:i.TEXTURE_2D,_e=b.depthTexture.format===da?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(b.depthTexture.format===qr)Gt(b)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,_e,ve,Te,0,Ae):i.framebufferTexture2D(i.FRAMEBUFFER,_e,ve,Te,0);else if(b.depthTexture.format===da)Gt(b)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,_e,ve,Te,0,Ae):i.framebufferTexture2D(i.FRAMEBUFFER,_e,ve,Te,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function At(U){const b=r.get(U),J=U.isWebGLCubeRenderTarget===!0;if(b.__boundDepthTexture!==U.depthTexture){const se=U.depthTexture;if(b.__depthDisposeCallback&&b.__depthDisposeCallback(),se){const ge=()=>{delete b.__boundDepthTexture,delete b.__depthDisposeCallback,se.removeEventListener("dispose",ge)};se.addEventListener("dispose",ge),b.__depthDisposeCallback=ge}b.__boundDepthTexture=se}if(U.depthTexture&&!b.__autoAllocateDepthBuffer)if(J)for(let se=0;se<6;se++)ct(b.__webglFramebuffer[se],U,se);else{const se=U.texture.mipmaps;se&&se.length>0?ct(b.__webglFramebuffer[0],U,0):ct(b.__webglFramebuffer,U,0)}else if(J){b.__webglDepthbuffer=[];for(let se=0;se<6;se++)if(t.bindFramebuffer(i.FRAMEBUFFER,b.__webglFramebuffer[se]),b.__webglDepthbuffer[se]===void 0)b.__webglDepthbuffer[se]=i.createRenderbuffer(),Dt(b.__webglDepthbuffer[se],U,!1);else{const ge=U.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Te=b.__webglDepthbuffer[se];i.bindRenderbuffer(i.RENDERBUFFER,Te),i.framebufferRenderbuffer(i.FRAMEBUFFER,ge,i.RENDERBUFFER,Te)}}else{const se=U.texture.mipmaps;if(se&&se.length>0?t.bindFramebuffer(i.FRAMEBUFFER,b.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,b.__webglFramebuffer),b.__webglDepthbuffer===void 0)b.__webglDepthbuffer=i.createRenderbuffer(),Dt(b.__webglDepthbuffer,U,!1);else{const ge=U.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Te=b.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,Te),i.framebufferRenderbuffer(i.FRAMEBUFFER,ge,i.RENDERBUFFER,Te)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function Et(U,b,J){const se=r.get(U);b!==void 0&&tt(se.__webglFramebuffer,U,U.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),J!==void 0&&At(U)}function _t(U){const b=U.texture,J=r.get(U),se=r.get(b);U.addEventListener("dispose",T);const ge=U.textures,Te=U.isWebGLCubeRenderTarget===!0,Ae=ge.length>1;if(Ae||(se.__webglTexture===void 0&&(se.__webglTexture=i.createTexture()),se.__version=b.version,c.memory.textures++),Te){J.__webglFramebuffer=[];for(let ve=0;ve<6;ve++)if(b.mipmaps&&b.mipmaps.length>0){J.__webglFramebuffer[ve]=[];for(let _e=0;_e<b.mipmaps.length;_e++)J.__webglFramebuffer[ve][_e]=i.createFramebuffer()}else J.__webglFramebuffer[ve]=i.createFramebuffer()}else{if(b.mipmaps&&b.mipmaps.length>0){J.__webglFramebuffer=[];for(let ve=0;ve<b.mipmaps.length;ve++)J.__webglFramebuffer[ve]=i.createFramebuffer()}else J.__webglFramebuffer=i.createFramebuffer();if(Ae)for(let ve=0,_e=ge.length;ve<_e;ve++){const Ie=r.get(ge[ve]);Ie.__webglTexture===void 0&&(Ie.__webglTexture=i.createTexture(),c.memory.textures++)}if(U.samples>0&&Gt(U)===!1){J.__webglMultisampledFramebuffer=i.createFramebuffer(),J.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,J.__webglMultisampledFramebuffer);for(let ve=0;ve<ge.length;ve++){const _e=ge[ve];J.__webglColorRenderbuffer[ve]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,J.__webglColorRenderbuffer[ve]);const Ie=l.convert(_e.format,_e.colorSpace),Xe=l.convert(_e.type),ne=C(_e.internalFormat,Ie,Xe,_e.normalized,_e.colorSpace,U.isXRRenderTarget===!0),Me=wt(U);i.renderbufferStorageMultisample(i.RENDERBUFFER,Me,ne,U.width,U.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ve,i.RENDERBUFFER,J.__webglColorRenderbuffer[ve])}i.bindRenderbuffer(i.RENDERBUFFER,null),U.depthBuffer&&(J.__webglDepthRenderbuffer=i.createRenderbuffer(),Dt(J.__webglDepthRenderbuffer,U,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(Te){t.bindTexture(i.TEXTURE_CUBE_MAP,se.__webglTexture),Ge(i.TEXTURE_CUBE_MAP,b);for(let ve=0;ve<6;ve++)if(b.mipmaps&&b.mipmaps.length>0)for(let _e=0;_e<b.mipmaps.length;_e++)tt(J.__webglFramebuffer[ve][_e],U,b,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ve,_e);else tt(J.__webglFramebuffer[ve],U,b,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ve,0);y(b)&&N(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Ae){for(let ve=0,_e=ge.length;ve<_e;ve++){const Ie=ge[ve],Xe=r.get(Ie);let ne=i.TEXTURE_2D;(U.isWebGL3DRenderTarget||U.isWebGLArrayRenderTarget)&&(ne=U.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ne,Xe.__webglTexture),Ge(ne,Ie),tt(J.__webglFramebuffer,U,Ie,i.COLOR_ATTACHMENT0+ve,ne,0),y(Ie)&&N(ne)}t.unbindTexture()}else{let ve=i.TEXTURE_2D;if((U.isWebGL3DRenderTarget||U.isWebGLArrayRenderTarget)&&(ve=U.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ve,se.__webglTexture),Ge(ve,b),b.mipmaps&&b.mipmaps.length>0)for(let _e=0;_e<b.mipmaps.length;_e++)tt(J.__webglFramebuffer[_e],U,b,i.COLOR_ATTACHMENT0,ve,_e);else tt(J.__webglFramebuffer,U,b,i.COLOR_ATTACHMENT0,ve,0);y(b)&&N(ve),t.unbindTexture()}U.depthBuffer&&At(U)}function Wt(U){const b=U.textures;for(let J=0,se=b.length;J<se;J++){const ge=b[J];if(y(ge)){const Te=P(U),Ae=r.get(ge).__webglTexture;t.bindTexture(Te,Ae),N(Te),t.unbindTexture()}}}const $t=[],Jt=[];function qt(U){if(U.samples>0){if(Gt(U)===!1){const b=U.textures,J=U.width,se=U.height;let ge=i.COLOR_BUFFER_BIT;const Te=U.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Ae=r.get(U),ve=b.length>1;if(ve)for(let Ie=0;Ie<b.length;Ie++)t.bindFramebuffer(i.FRAMEBUFFER,Ae.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ie,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,Ae.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ie,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,Ae.__webglMultisampledFramebuffer);const _e=U.texture.mipmaps;_e&&_e.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ae.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ae.__webglFramebuffer);for(let Ie=0;Ie<b.length;Ie++){if(U.resolveDepthBuffer&&(U.depthBuffer&&(ge|=i.DEPTH_BUFFER_BIT),U.stencilBuffer&&U.resolveStencilBuffer&&(ge|=i.STENCIL_BUFFER_BIT)),ve){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Ae.__webglColorRenderbuffer[Ie]);const Xe=r.get(b[Ie]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Xe,0)}i.blitFramebuffer(0,0,J,se,0,0,J,se,ge,i.NEAREST),h===!0&&($t.length=0,Jt.length=0,$t.push(i.COLOR_ATTACHMENT0+Ie),U.depthBuffer&&U.resolveDepthBuffer===!1&&($t.push(Te),Jt.push(Te),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Jt)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,$t))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),ve)for(let Ie=0;Ie<b.length;Ie++){t.bindFramebuffer(i.FRAMEBUFFER,Ae.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ie,i.RENDERBUFFER,Ae.__webglColorRenderbuffer[Ie]);const Xe=r.get(b[Ie]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,Ae.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ie,i.TEXTURE_2D,Xe,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ae.__webglMultisampledFramebuffer)}else if(U.depthBuffer&&U.resolveDepthBuffer===!1&&h){const b=U.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[b])}}}function wt(U){return Math.min(a.maxSamples,U.samples)}function Gt(U){const b=r.get(U);return U.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&b.__useRenderToTexture!==!1}function Y(U){const b=c.render.frame;m.get(U)!==b&&(m.set(U,b),U.update())}function xn(U,b){const J=U.colorSpace,se=U.format,ge=U.type;return U.isCompressedTexture===!0||U.isVideoTexture===!0||J!==sd&&J!==Es&&(bt.getTransfer(J)===Bt?(se!==Ki||ge!==Si)&&lt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Nt("WebGLTextures: Unsupported texture color space:",J)),b}function Ct(U){return typeof HTMLImageElement<"u"&&U instanceof HTMLImageElement?(f.width=U.naturalWidth||U.width,f.height=U.naturalHeight||U.height):typeof VideoFrame<"u"&&U instanceof VideoFrame?(f.width=U.displayWidth,f.height=U.displayHeight):(f.width=U.width,f.height=U.height),f}this.allocateTextureUnit=ce,this.resetTextureUnits=re,this.getTextureUnits=fe,this.setTextureUnits=O,this.setTexture2D=q,this.setTexture2DArray=ue,this.setTexture3D=he,this.setTextureCube=k,this.rebindTextures=Et,this.setupRenderTarget=_t,this.updateRenderTargetMipmap=Wt,this.updateMultisampleRenderTarget=qt,this.setupDepthRenderbuffer=At,this.setupFrameBufferTexture=tt,this.useMultisampledRTT=Gt,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function DP(i,e){function t(r,a=Es){let l;const c=bt.getTransfer(a);if(r===Si)return i.UNSIGNED_BYTE;if(r===Am)return i.UNSIGNED_SHORT_4_4_4_4;if(r===Pm)return i.UNSIGNED_SHORT_5_5_5_1;if(r===sy)return i.UNSIGNED_INT_5_9_9_9_REV;if(r===ay)return i.UNSIGNED_INT_10F_11F_11F_REV;if(r===iy)return i.BYTE;if(r===ry)return i.SHORT;if(r===Wl)return i.UNSIGNED_SHORT;if(r===Rm)return i.INT;if(r===xr)return i.UNSIGNED_INT;if(r===fr)return i.FLOAT;if(r===$r)return i.HALF_FLOAT;if(r===oy)return i.ALPHA;if(r===ly)return i.RGB;if(r===Ki)return i.RGBA;if(r===qr)return i.DEPTH_COMPONENT;if(r===da)return i.DEPTH_STENCIL;if(r===cy)return i.RED;if(r===Nm)return i.RED_INTEGER;if(r===Ea)return i.RG;if(r===Lm)return i.RG_INTEGER;if(r===Dm)return i.RGBA_INTEGER;if(r===ju||r===Xu||r===$u||r===qu)if(c===Bt)if(l=e.get("WEBGL_compressed_texture_s3tc_srgb"),l!==null){if(r===ju)return l.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(r===Xu)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(r===$u)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(r===qu)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(l=e.get("WEBGL_compressed_texture_s3tc"),l!==null){if(r===ju)return l.COMPRESSED_RGB_S3TC_DXT1_EXT;if(r===Xu)return l.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(r===$u)return l.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(r===qu)return l.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(r===Ep||r===wp||r===Tp||r===bp)if(l=e.get("WEBGL_compressed_texture_pvrtc"),l!==null){if(r===Ep)return l.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(r===wp)return l.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(r===Tp)return l.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(r===bp)return l.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(r===Cp||r===Rp||r===Ap||r===Pp||r===Np||r===nd||r===Lp)if(l=e.get("WEBGL_compressed_texture_etc"),l!==null){if(r===Cp||r===Rp)return c===Bt?l.COMPRESSED_SRGB8_ETC2:l.COMPRESSED_RGB8_ETC2;if(r===Ap)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:l.COMPRESSED_RGBA8_ETC2_EAC;if(r===Pp)return l.COMPRESSED_R11_EAC;if(r===Np)return l.COMPRESSED_SIGNED_R11_EAC;if(r===nd)return l.COMPRESSED_RG11_EAC;if(r===Lp)return l.COMPRESSED_SIGNED_RG11_EAC}else return null;if(r===Dp||r===Ip||r===Up||r===Fp||r===Op||r===kp||r===zp||r===Bp||r===Hp||r===Vp||r===Gp||r===Wp||r===jp||r===Xp)if(l=e.get("WEBGL_compressed_texture_astc"),l!==null){if(r===Dp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:l.COMPRESSED_RGBA_ASTC_4x4_KHR;if(r===Ip)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:l.COMPRESSED_RGBA_ASTC_5x4_KHR;if(r===Up)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:l.COMPRESSED_RGBA_ASTC_5x5_KHR;if(r===Fp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:l.COMPRESSED_RGBA_ASTC_6x5_KHR;if(r===Op)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:l.COMPRESSED_RGBA_ASTC_6x6_KHR;if(r===kp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:l.COMPRESSED_RGBA_ASTC_8x5_KHR;if(r===zp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:l.COMPRESSED_RGBA_ASTC_8x6_KHR;if(r===Bp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:l.COMPRESSED_RGBA_ASTC_8x8_KHR;if(r===Hp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:l.COMPRESSED_RGBA_ASTC_10x5_KHR;if(r===Vp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:l.COMPRESSED_RGBA_ASTC_10x6_KHR;if(r===Gp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:l.COMPRESSED_RGBA_ASTC_10x8_KHR;if(r===Wp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:l.COMPRESSED_RGBA_ASTC_10x10_KHR;if(r===jp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:l.COMPRESSED_RGBA_ASTC_12x10_KHR;if(r===Xp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:l.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(r===$p||r===qp||r===Yp)if(l=e.get("EXT_texture_compression_bptc"),l!==null){if(r===$p)return c===Bt?l.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:l.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(r===qp)return l.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(r===Yp)return l.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(r===Kp||r===Qp||r===id||r===Zp)if(l=e.get("EXT_texture_compression_rgtc"),l!==null){if(r===Kp)return l.COMPRESSED_RED_RGTC1_EXT;if(r===Qp)return l.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(r===id)return l.COMPRESSED_RED_GREEN_RGTC2_EXT;if(r===Zp)return l.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return r===jl?i.UNSIGNED_INT_24_8:i[r]!==void 0?i[r]:null}return{convert:t}}const IP=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,UP=`
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

}`;class FP{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const r=new xy(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=r}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,r=new yr({vertexShader:IP,fragmentShader:UP,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Zi(new vd(20,20),r)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class OP extends Os{constructor(e,t){super();const r=this;let a=null,l=1,c=null,d="local-floor",h=1,f=null,m=null,g=null,v=null,S=null,E=null;const w=typeof XRWebGLBinding<"u",x=new FP,y={},N=t.getContextAttributes();let P=null,C=null;const D=[],L=[],F=new dt;let T=null;const I=new Ii;I.viewport=new ln;const G=new Ii;G.viewport=new ln;const H=[I,G],K=new XT;let re=null,fe=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(de){let Se=D[de];return Se===void 0&&(Se=new _f,D[de]=Se),Se.getTargetRaySpace()},this.getControllerGrip=function(de){let Se=D[de];return Se===void 0&&(Se=new _f,D[de]=Se),Se.getGripSpace()},this.getHand=function(de){let Se=D[de];return Se===void 0&&(Se=new _f,D[de]=Se),Se.getHandSpace()};function O(de){const Se=L.indexOf(de.inputSource);if(Se===-1)return;const xe=D[Se];xe!==void 0&&(xe.update(de.inputSource,de.frame,f||c),xe.dispatchEvent({type:de.type,data:de.inputSource}))}function ce(){a.removeEventListener("select",O),a.removeEventListener("selectstart",O),a.removeEventListener("selectend",O),a.removeEventListener("squeeze",O),a.removeEventListener("squeezestart",O),a.removeEventListener("squeezeend",O),a.removeEventListener("end",ce),a.removeEventListener("inputsourceschange",Z);for(let de=0;de<D.length;de++){const Se=L[de];Se!==null&&(L[de]=null,D[de].disconnect(Se))}re=null,fe=null,x.reset();for(const de in y)delete y[de];e.setRenderTarget(P),S=null,v=null,g=null,a=null,C=null,Ge.stop(),r.isPresenting=!1,e.setPixelRatio(T),e.setSize(F.width,F.height,!1),r.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(de){l=de,r.isPresenting===!0&&lt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(de){d=de,r.isPresenting===!0&&lt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return f||c},this.setReferenceSpace=function(de){f=de},this.getBaseLayer=function(){return v!==null?v:S},this.getBinding=function(){return g===null&&w&&(g=new XRWebGLBinding(a,t)),g},this.getFrame=function(){return E},this.getSession=function(){return a},this.setSession=async function(de){if(a=de,a!==null){if(P=e.getRenderTarget(),a.addEventListener("select",O),a.addEventListener("selectstart",O),a.addEventListener("selectend",O),a.addEventListener("squeeze",O),a.addEventListener("squeezestart",O),a.addEventListener("squeezeend",O),a.addEventListener("end",ce),a.addEventListener("inputsourceschange",Z),N.xrCompatible!==!0&&await t.makeXRCompatible(),T=e.getPixelRatio(),e.getSize(F),w&&"createProjectionLayer"in XRWebGLBinding.prototype){let xe=null,te=null,Ue=null;N.depth&&(Ue=N.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,xe=N.stencil?da:qr,te=N.stencil?jl:xr);const tt={colorFormat:t.RGBA8,depthFormat:Ue,scaleFactor:l};g=this.getBinding(),v=g.createProjectionLayer(tt),a.updateRenderState({layers:[v]}),e.setPixelRatio(1),e.setSize(v.textureWidth,v.textureHeight,!1),C=new gr(v.textureWidth,v.textureHeight,{format:Ki,type:Si,depthTexture:new Io(v.textureWidth,v.textureHeight,te,void 0,void 0,void 0,void 0,void 0,void 0,xe),stencilBuffer:N.stencil,colorSpace:e.outputColorSpace,samples:N.antialias?4:0,resolveDepthBuffer:v.ignoreDepthValues===!1,resolveStencilBuffer:v.ignoreDepthValues===!1})}else{const xe={antialias:N.antialias,alpha:!0,depth:N.depth,stencil:N.stencil,framebufferScaleFactor:l};S=new XRWebGLLayer(a,t,xe),a.updateRenderState({baseLayer:S}),e.setPixelRatio(1),e.setSize(S.framebufferWidth,S.framebufferHeight,!1),C=new gr(S.framebufferWidth,S.framebufferHeight,{format:Ki,type:Si,colorSpace:e.outputColorSpace,stencilBuffer:N.stencil,resolveDepthBuffer:S.ignoreDepthValues===!1,resolveStencilBuffer:S.ignoreDepthValues===!1})}C.isXRRenderTarget=!0,this.setFoveation(h),f=null,c=await a.requestReferenceSpace(d),Ge.setContext(a),Ge.start(),r.isPresenting=!0,r.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(a!==null)return a.environmentBlendMode},this.getDepthTexture=function(){return x.getDepthTexture()};function Z(de){for(let Se=0;Se<de.removed.length;Se++){const xe=de.removed[Se],te=L.indexOf(xe);te>=0&&(L[te]=null,D[te].disconnect(xe))}for(let Se=0;Se<de.added.length;Se++){const xe=de.added[Se];let te=L.indexOf(xe);if(te===-1){for(let tt=0;tt<D.length;tt++)if(tt>=L.length){L.push(xe),te=tt;break}else if(L[tt]===null){L[tt]=xe,te=tt;break}if(te===-1)break}const Ue=D[te];Ue&&Ue.connect(xe)}}const q=new ee,ue=new ee;function he(de,Se,xe){q.setFromMatrixPosition(Se.matrixWorld),ue.setFromMatrixPosition(xe.matrixWorld);const te=q.distanceTo(ue),Ue=Se.projectionMatrix.elements,tt=xe.projectionMatrix.elements,Dt=Ue[14]/(Ue[10]-1),ct=Ue[14]/(Ue[10]+1),At=(Ue[9]+1)/Ue[5],Et=(Ue[9]-1)/Ue[5],_t=(Ue[8]-1)/Ue[0],Wt=(tt[8]+1)/tt[0],$t=Dt*_t,Jt=Dt*Wt,qt=te/(-_t+Wt),wt=qt*-_t;if(Se.matrixWorld.decompose(de.position,de.quaternion,de.scale),de.translateX(wt),de.translateZ(qt),de.matrixWorld.compose(de.position,de.quaternion,de.scale),de.matrixWorldInverse.copy(de.matrixWorld).invert(),Ue[10]===-1)de.projectionMatrix.copy(Se.projectionMatrix),de.projectionMatrixInverse.copy(Se.projectionMatrixInverse);else{const Gt=Dt+qt,Y=ct+qt,xn=$t-wt,Ct=Jt+(te-wt),U=At*ct/Y*Gt,b=Et*ct/Y*Gt;de.projectionMatrix.makePerspective(xn,Ct,U,b,Gt,Y),de.projectionMatrixInverse.copy(de.projectionMatrix).invert()}}function k(de,Se){Se===null?de.matrixWorld.copy(de.matrix):de.matrixWorld.multiplyMatrices(Se.matrixWorld,de.matrix),de.matrixWorldInverse.copy(de.matrixWorld).invert()}this.updateCamera=function(de){if(a===null)return;let Se=de.near,xe=de.far;x.texture!==null&&(x.depthNear>0&&(Se=x.depthNear),x.depthFar>0&&(xe=x.depthFar)),K.near=G.near=I.near=Se,K.far=G.far=I.far=xe,(re!==K.near||fe!==K.far)&&(a.updateRenderState({depthNear:K.near,depthFar:K.far}),re=K.near,fe=K.far),K.layers.mask=de.layers.mask|6,I.layers.mask=K.layers.mask&-5,G.layers.mask=K.layers.mask&-3;const te=de.parent,Ue=K.cameras;k(K,te);for(let tt=0;tt<Ue.length;tt++)k(Ue[tt],te);Ue.length===2?he(K,I,G):K.projectionMatrix.copy(I.projectionMatrix),X(de,K,te)};function X(de,Se,xe){xe===null?de.matrix.copy(Se.matrixWorld):(de.matrix.copy(xe.matrixWorld),de.matrix.invert(),de.matrix.multiply(Se.matrixWorld)),de.matrix.decompose(de.position,de.quaternion,de.scale),de.updateMatrixWorld(!0),de.projectionMatrix.copy(Se.projectionMatrix),de.projectionMatrixInverse.copy(Se.projectionMatrixInverse),de.isPerspectiveCamera&&(de.fov=Jp*2*Math.atan(1/de.projectionMatrix.elements[5]),de.zoom=1)}this.getCamera=function(){return K},this.getFoveation=function(){if(!(v===null&&S===null))return h},this.setFoveation=function(de){h=de,v!==null&&(v.fixedFoveation=de),S!==null&&S.fixedFoveation!==void 0&&(S.fixedFoveation=de)},this.hasDepthSensing=function(){return x.texture!==null},this.getDepthSensingMesh=function(){return x.getMesh(K)},this.getCameraTexture=function(de){return y[de]};let Fe=null;function je(de,Se){if(m=Se.getViewerPose(f||c),E=Se,m!==null){const xe=m.views;S!==null&&(e.setRenderTargetFramebuffer(C,S.framebuffer),e.setRenderTarget(C));let te=!1;xe.length!==K.cameras.length&&(K.cameras.length=0,te=!0);for(let ct=0;ct<xe.length;ct++){const At=xe[ct];let Et=null;if(S!==null)Et=S.getViewport(At);else{const Wt=g.getViewSubImage(v,At);Et=Wt.viewport,ct===0&&(e.setRenderTargetTextures(C,Wt.colorTexture,Wt.depthStencilTexture),e.setRenderTarget(C))}let _t=H[ct];_t===void 0&&(_t=new Ii,_t.layers.enable(ct),_t.viewport=new ln,H[ct]=_t),_t.matrix.fromArray(At.transform.matrix),_t.matrix.decompose(_t.position,_t.quaternion,_t.scale),_t.projectionMatrix.fromArray(At.projectionMatrix),_t.projectionMatrixInverse.copy(_t.projectionMatrix).invert(),_t.viewport.set(Et.x,Et.y,Et.width,Et.height),ct===0&&(K.matrix.copy(_t.matrix),K.matrix.decompose(K.position,K.quaternion,K.scale)),te===!0&&K.cameras.push(_t)}const Ue=a.enabledFeatures;if(Ue&&Ue.includes("depth-sensing")&&a.depthUsage=="gpu-optimized"&&w){g=r.getBinding();const ct=g.getDepthInformation(xe[0]);ct&&ct.isValid&&ct.texture&&x.init(ct,a.renderState)}if(Ue&&Ue.includes("camera-access")&&w){e.state.unbindTexture(),g=r.getBinding();for(let ct=0;ct<xe.length;ct++){const At=xe[ct].camera;if(At){let Et=y[At];Et||(Et=new xy,y[At]=Et);const _t=g.getCameraImage(At);Et.sourceTexture=_t}}}}for(let xe=0;xe<D.length;xe++){const te=L[xe],Ue=D[xe];te!==null&&Ue!==void 0&&Ue.update(te,Se,f||c)}Fe&&Fe(de,Se),Se.detectedPlanes&&r.dispatchEvent({type:"planesdetected",data:Se}),E=null}const Ge=new Sy;Ge.setAnimationLoop(je),this.setAnimationLoop=function(de){Fe=de},this.dispose=function(){}}}const kP=new rn,Ry=new pt;Ry.set(-1,0,0,0,1,0,0,0,1);function zP(i,e){function t(x,y){x.matrixAutoUpdate===!0&&x.updateMatrix(),y.value.copy(x.matrix)}function r(x,y){y.color.getRGB(x.fogColor.value,_y(i)),y.isFog?(x.fogNear.value=y.near,x.fogFar.value=y.far):y.isFogExp2&&(x.fogDensity.value=y.density)}function a(x,y,N,P,C){y.isNodeMaterial?y.uniformsNeedUpdate=!1:y.isMeshBasicMaterial?l(x,y):y.isMeshLambertMaterial?(l(x,y),y.envMap&&(x.envMapIntensity.value=y.envMapIntensity)):y.isMeshToonMaterial?(l(x,y),g(x,y)):y.isMeshPhongMaterial?(l(x,y),m(x,y),y.envMap&&(x.envMapIntensity.value=y.envMapIntensity)):y.isMeshStandardMaterial?(l(x,y),v(x,y),y.isMeshPhysicalMaterial&&S(x,y,C)):y.isMeshMatcapMaterial?(l(x,y),E(x,y)):y.isMeshDepthMaterial?l(x,y):y.isMeshDistanceMaterial?(l(x,y),w(x,y)):y.isMeshNormalMaterial?l(x,y):y.isLineBasicMaterial?(c(x,y),y.isLineDashedMaterial&&d(x,y)):y.isPointsMaterial?h(x,y,N,P):y.isSpriteMaterial?f(x,y):y.isShadowMaterial?(x.color.value.copy(y.color),x.opacity.value=y.opacity):y.isShaderMaterial&&(y.uniformsNeedUpdate=!1)}function l(x,y){x.opacity.value=y.opacity,y.color&&x.diffuse.value.copy(y.color),y.emissive&&x.emissive.value.copy(y.emissive).multiplyScalar(y.emissiveIntensity),y.map&&(x.map.value=y.map,t(y.map,x.mapTransform)),y.alphaMap&&(x.alphaMap.value=y.alphaMap,t(y.alphaMap,x.alphaMapTransform)),y.bumpMap&&(x.bumpMap.value=y.bumpMap,t(y.bumpMap,x.bumpMapTransform),x.bumpScale.value=y.bumpScale,y.side===hi&&(x.bumpScale.value*=-1)),y.normalMap&&(x.normalMap.value=y.normalMap,t(y.normalMap,x.normalMapTransform),x.normalScale.value.copy(y.normalScale),y.side===hi&&x.normalScale.value.negate()),y.displacementMap&&(x.displacementMap.value=y.displacementMap,t(y.displacementMap,x.displacementMapTransform),x.displacementScale.value=y.displacementScale,x.displacementBias.value=y.displacementBias),y.emissiveMap&&(x.emissiveMap.value=y.emissiveMap,t(y.emissiveMap,x.emissiveMapTransform)),y.specularMap&&(x.specularMap.value=y.specularMap,t(y.specularMap,x.specularMapTransform)),y.alphaTest>0&&(x.alphaTest.value=y.alphaTest);const N=e.get(y),P=N.envMap,C=N.envMapRotation;P&&(x.envMap.value=P,x.envMapRotation.value.setFromMatrix4(kP.makeRotationFromEuler(C)).transpose(),P.isCubeTexture&&P.isRenderTargetTexture===!1&&x.envMapRotation.value.premultiply(Ry),x.reflectivity.value=y.reflectivity,x.ior.value=y.ior,x.refractionRatio.value=y.refractionRatio),y.lightMap&&(x.lightMap.value=y.lightMap,x.lightMapIntensity.value=y.lightMapIntensity,t(y.lightMap,x.lightMapTransform)),y.aoMap&&(x.aoMap.value=y.aoMap,x.aoMapIntensity.value=y.aoMapIntensity,t(y.aoMap,x.aoMapTransform))}function c(x,y){x.diffuse.value.copy(y.color),x.opacity.value=y.opacity,y.map&&(x.map.value=y.map,t(y.map,x.mapTransform))}function d(x,y){x.dashSize.value=y.dashSize,x.totalSize.value=y.dashSize+y.gapSize,x.scale.value=y.scale}function h(x,y,N,P){x.diffuse.value.copy(y.color),x.opacity.value=y.opacity,x.size.value=y.size*N,x.scale.value=P*.5,y.map&&(x.map.value=y.map,t(y.map,x.uvTransform)),y.alphaMap&&(x.alphaMap.value=y.alphaMap,t(y.alphaMap,x.alphaMapTransform)),y.alphaTest>0&&(x.alphaTest.value=y.alphaTest)}function f(x,y){x.diffuse.value.copy(y.color),x.opacity.value=y.opacity,x.rotation.value=y.rotation,y.map&&(x.map.value=y.map,t(y.map,x.mapTransform)),y.alphaMap&&(x.alphaMap.value=y.alphaMap,t(y.alphaMap,x.alphaMapTransform)),y.alphaTest>0&&(x.alphaTest.value=y.alphaTest)}function m(x,y){x.specular.value.copy(y.specular),x.shininess.value=Math.max(y.shininess,1e-4)}function g(x,y){y.gradientMap&&(x.gradientMap.value=y.gradientMap)}function v(x,y){x.metalness.value=y.metalness,y.metalnessMap&&(x.metalnessMap.value=y.metalnessMap,t(y.metalnessMap,x.metalnessMapTransform)),x.roughness.value=y.roughness,y.roughnessMap&&(x.roughnessMap.value=y.roughnessMap,t(y.roughnessMap,x.roughnessMapTransform)),y.envMap&&(x.envMapIntensity.value=y.envMapIntensity)}function S(x,y,N){x.ior.value=y.ior,y.sheen>0&&(x.sheenColor.value.copy(y.sheenColor).multiplyScalar(y.sheen),x.sheenRoughness.value=y.sheenRoughness,y.sheenColorMap&&(x.sheenColorMap.value=y.sheenColorMap,t(y.sheenColorMap,x.sheenColorMapTransform)),y.sheenRoughnessMap&&(x.sheenRoughnessMap.value=y.sheenRoughnessMap,t(y.sheenRoughnessMap,x.sheenRoughnessMapTransform))),y.clearcoat>0&&(x.clearcoat.value=y.clearcoat,x.clearcoatRoughness.value=y.clearcoatRoughness,y.clearcoatMap&&(x.clearcoatMap.value=y.clearcoatMap,t(y.clearcoatMap,x.clearcoatMapTransform)),y.clearcoatRoughnessMap&&(x.clearcoatRoughnessMap.value=y.clearcoatRoughnessMap,t(y.clearcoatRoughnessMap,x.clearcoatRoughnessMapTransform)),y.clearcoatNormalMap&&(x.clearcoatNormalMap.value=y.clearcoatNormalMap,t(y.clearcoatNormalMap,x.clearcoatNormalMapTransform),x.clearcoatNormalScale.value.copy(y.clearcoatNormalScale),y.side===hi&&x.clearcoatNormalScale.value.negate())),y.dispersion>0&&(x.dispersion.value=y.dispersion),y.iridescence>0&&(x.iridescence.value=y.iridescence,x.iridescenceIOR.value=y.iridescenceIOR,x.iridescenceThicknessMinimum.value=y.iridescenceThicknessRange[0],x.iridescenceThicknessMaximum.value=y.iridescenceThicknessRange[1],y.iridescenceMap&&(x.iridescenceMap.value=y.iridescenceMap,t(y.iridescenceMap,x.iridescenceMapTransform)),y.iridescenceThicknessMap&&(x.iridescenceThicknessMap.value=y.iridescenceThicknessMap,t(y.iridescenceThicknessMap,x.iridescenceThicknessMapTransform))),y.transmission>0&&(x.transmission.value=y.transmission,x.transmissionSamplerMap.value=N.texture,x.transmissionSamplerSize.value.set(N.width,N.height),y.transmissionMap&&(x.transmissionMap.value=y.transmissionMap,t(y.transmissionMap,x.transmissionMapTransform)),x.thickness.value=y.thickness,y.thicknessMap&&(x.thicknessMap.value=y.thicknessMap,t(y.thicknessMap,x.thicknessMapTransform)),x.attenuationDistance.value=y.attenuationDistance,x.attenuationColor.value.copy(y.attenuationColor)),y.anisotropy>0&&(x.anisotropyVector.value.set(y.anisotropy*Math.cos(y.anisotropyRotation),y.anisotropy*Math.sin(y.anisotropyRotation)),y.anisotropyMap&&(x.anisotropyMap.value=y.anisotropyMap,t(y.anisotropyMap,x.anisotropyMapTransform))),x.specularIntensity.value=y.specularIntensity,x.specularColor.value.copy(y.specularColor),y.specularColorMap&&(x.specularColorMap.value=y.specularColorMap,t(y.specularColorMap,x.specularColorMapTransform)),y.specularIntensityMap&&(x.specularIntensityMap.value=y.specularIntensityMap,t(y.specularIntensityMap,x.specularIntensityMapTransform))}function E(x,y){y.matcap&&(x.matcap.value=y.matcap)}function w(x,y){const N=e.get(y).light;x.referencePosition.value.setFromMatrixPosition(N.matrixWorld),x.nearDistance.value=N.shadow.camera.near,x.farDistance.value=N.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:a}}function BP(i,e,t,r){let a={},l={},c=[];const d=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function h(C,D){const L=D.program;r.uniformBlockBinding(C,L)}function f(C,D){let L=a[C.id];L===void 0&&(x(C),L=m(C),a[C.id]=L,C.addEventListener("dispose",N));const F=D.program;r.updateUBOMapping(C,F);const T=e.render.frame;l[C.id]!==T&&(v(C),l[C.id]=T)}function m(C){const D=g();C.__bindingPointIndex=D;const L=i.createBuffer(),F=C.__size,T=C.usage;return i.bindBuffer(i.UNIFORM_BUFFER,L),i.bufferData(i.UNIFORM_BUFFER,F,T),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,D,L),L}function g(){for(let C=0;C<d;C++)if(c.indexOf(C)===-1)return c.push(C),C;return Nt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function v(C){const D=a[C.id],L=C.uniforms,F=C.__cache;i.bindBuffer(i.UNIFORM_BUFFER,D);for(let T=0,I=L.length;T<I;T++){const G=L[T];if(Array.isArray(G))for(let H=0,K=G.length;H<K;H++)S(G[H],T,H,F);else S(G,T,0,F)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function S(C,D,L,F){if(w(C,D,L,F)===!0){const T=C.__offset,I=C.value;if(Array.isArray(I)){let G=0;for(let H=0;H<I.length;H++){const K=I[H],re=y(K);E(K,C.__data,G),typeof K!="number"&&typeof K!="boolean"&&!K.isMatrix3&&!ArrayBuffer.isView(K)&&(G+=re.storage/Float32Array.BYTES_PER_ELEMENT)}}else E(I,C.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,T,C.__data)}}function E(C,D,L){typeof C=="number"||typeof C=="boolean"?D[0]=C:C.isMatrix3?(D[0]=C.elements[0],D[1]=C.elements[1],D[2]=C.elements[2],D[3]=0,D[4]=C.elements[3],D[5]=C.elements[4],D[6]=C.elements[5],D[7]=0,D[8]=C.elements[6],D[9]=C.elements[7],D[10]=C.elements[8],D[11]=0):ArrayBuffer.isView(C)?D.set(new C.constructor(C.buffer,C.byteOffset,D.length)):C.toArray(D,L)}function w(C,D,L,F){const T=C.value,I=D+"_"+L;if(F[I]===void 0)return typeof T=="number"||typeof T=="boolean"?F[I]=T:ArrayBuffer.isView(T)?F[I]=T.slice():F[I]=T.clone(),!0;{const G=F[I];if(typeof T=="number"||typeof T=="boolean"){if(G!==T)return F[I]=T,!0}else{if(ArrayBuffer.isView(T))return!0;if(G.equals(T)===!1)return G.copy(T),!0}}return!1}function x(C){const D=C.uniforms;let L=0;const F=16;for(let I=0,G=D.length;I<G;I++){const H=Array.isArray(D[I])?D[I]:[D[I]];for(let K=0,re=H.length;K<re;K++){const fe=H[K],O=Array.isArray(fe.value)?fe.value:[fe.value];for(let ce=0,Z=O.length;ce<Z;ce++){const q=O[ce],ue=y(q),he=L%F,k=he%ue.boundary,X=he+k;L+=k,X!==0&&F-X<ue.storage&&(L+=F-X),fe.__data=new Float32Array(ue.storage/Float32Array.BYTES_PER_ELEMENT),fe.__offset=L,L+=ue.storage}}}const T=L%F;return T>0&&(L+=F-T),C.__size=L,C.__cache={},this}function y(C){const D={boundary:0,storage:0};return typeof C=="number"||typeof C=="boolean"?(D.boundary=4,D.storage=4):C.isVector2?(D.boundary=8,D.storage=8):C.isVector3||C.isColor?(D.boundary=16,D.storage=12):C.isVector4?(D.boundary=16,D.storage=16):C.isMatrix3?(D.boundary=48,D.storage=48):C.isMatrix4?(D.boundary=64,D.storage=64):C.isTexture?lt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(C)?(D.boundary=16,D.storage=C.byteLength):lt("WebGLRenderer: Unsupported uniform value type.",C),D}function N(C){const D=C.target;D.removeEventListener("dispose",N);const L=c.indexOf(D.__bindingPointIndex);c.splice(L,1),i.deleteBuffer(a[D.id]),delete a[D.id],delete l[D.id]}function P(){for(const C in a)i.deleteBuffer(a[C]);c=[],a={},l={}}return{bind:h,update:f,dispose:P}}const HP=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let or=null;function VP(){return or===null&&(or=new ST(HP,16,16,Ea,$r),or.name="DFG_LUT",or.minFilter=Wn,or.magFilter=Wn,or.wrapS=Vr,or.wrapT=Vr,or.generateMipmaps=!1,or.needsUpdate=!0),or}class GP{constructor(e={}){const{canvas:t=Qw(),context:r=null,depth:a=!0,stencil:l=!1,alpha:c=!1,antialias:d=!1,premultipliedAlpha:h=!0,preserveDrawingBuffer:f=!1,powerPreference:m="default",failIfMajorPerformanceCaveat:g=!1,reversedDepthBuffer:v=!1,outputBufferType:S=Si}=e;this.isWebGLRenderer=!0;let E;if(r!==null){if(typeof WebGLRenderingContext<"u"&&r instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");E=r.getContextAttributes().alpha}else E=c;const w=S,x=new Set([Dm,Lm,Nm]),y=new Set([Si,xr,Wl,jl,Am,Pm]),N=new Uint32Array(4),P=new Int32Array(4),C=new ee;let D=null,L=null;const F=[],T=[];let I=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=mr,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const G=this;let H=!1,K=null,re=null,fe=null,O=null;this._outputColorSpace=Zn;let ce=0,Z=0,q=null,ue=-1,he=null;const k=new ln,X=new ln;let Fe=null;const je=new gt(0);let Ge=0,de=t.width,Se=t.height,xe=1,te=null,Ue=null;const tt=new ln(0,0,de,Se),Dt=new ln(0,0,de,Se);let ct=!1;const At=new Om;let Et=!1,_t=!1;const Wt=new rn,$t=new ee,Jt=new ln,qt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let wt=!1;function Gt(){return q===null?xe:1}let Y=r;function xn(A,Q){return t.getContext(A,Q)}try{const A={alpha:!0,depth:a,stencil:l,antialias:d,premultipliedAlpha:h,preserveDrawingBuffer:f,powerPreference:m,failIfMajorPerformanceCaveat:g};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Tm}`),t.addEventListener("webglcontextlost",Ht,!1),t.addEventListener("webglcontextrestored",It,!1),t.addEventListener("webglcontextcreationerror",Fn,!1),Y===null){const Q="webgl2";if(Y=xn(Q,A),Y===null)throw xn(Q)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(A){throw Nt("WebGLRenderer: "+A.message),A}let Ct,U,b,J,se,ge,Te,Ae,ve,_e,Ie,Xe,ne,Me,ke,nt,st,j,Ne,ye,De,Oe,Ee;function Ke(){Ct=new VR(Y),Ct.init(),De=new DP(Y,Ct),U=new IR(Y,Ct,e,De),b=new NP(Y,Ct),U.reversedDepthBuffer&&v&&b.buffers.depth.setReversed(!0),re=Y.createFramebuffer(),fe=Y.createFramebuffer(),O=Y.createFramebuffer(),J=new jR(Y),se=new vP,ge=new LP(Y,Ct,b,se,U,De,J),Te=new HR(G),Ae=new YT(Y),Oe=new LR(Y,Ae),ve=new GR(Y,Ae,J,Oe),_e=new $R(Y,ve,Ae,Oe,J),j=new XR(Y,U,ge),ke=new UR(se),Ie=new gP(G,Te,Ct,U,Oe,ke),Xe=new zP(G,se),ne=new _P,Me=new TP(Ct),st=new NR(G,Te,b,_e,E,h),nt=new PP(G,_e,U),Ee=new BP(Y,J,U,b),Ne=new DR(Y,Ct,J),ye=new WR(Y,Ct,J),J.programs=Ie.programs,G.capabilities=U,G.extensions=Ct,G.properties=se,G.renderLists=ne,G.shadowMap=nt,G.state=b,G.info=J}Ke(),w!==Si&&(I=new YR(w,t.width,t.height,d,a,l));const qe=new OP(G,Y);this.xr=qe,this.getContext=function(){return Y},this.getContextAttributes=function(){return Y.getContextAttributes()},this.forceContextLoss=function(){const A=Ct.get("WEBGL_lose_context");A&&A.loseContext()},this.forceContextRestore=function(){const A=Ct.get("WEBGL_lose_context");A&&A.restoreContext()},this.getPixelRatio=function(){return xe},this.setPixelRatio=function(A){A!==void 0&&(xe=A,this.setSize(de,Se,!1))},this.getSize=function(A){return A.set(de,Se)},this.setSize=function(A,Q,pe=!0){if(qe.isPresenting){lt("WebGLRenderer: Can't change size while VR device is presenting.");return}de=A,Se=Q,t.width=Math.floor(A*xe),t.height=Math.floor(Q*xe),pe===!0&&(t.style.width=A+"px",t.style.height=Q+"px"),I!==null&&I.setSize(t.width,t.height),this.setViewport(0,0,A,Q)},this.getDrawingBufferSize=function(A){return A.set(de*xe,Se*xe).floor()},this.setDrawingBufferSize=function(A,Q,pe){de=A,Se=Q,xe=pe,t.width=Math.floor(A*pe),t.height=Math.floor(Q*pe),this.setViewport(0,0,A,Q)},this.setEffects=function(A){if(w===Si){Nt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(A){for(let Q=0;Q<A.length;Q++)if(A[Q].isOutputPass===!0){lt("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}I.setEffects(A||[])},this.getCurrentViewport=function(A){return A.copy(k)},this.getViewport=function(A){return A.copy(tt)},this.setViewport=function(A,Q,pe,oe){A.isVector4?tt.set(A.x,A.y,A.z,A.w):tt.set(A,Q,pe,oe),b.viewport(k.copy(tt).multiplyScalar(xe).round())},this.getScissor=function(A){return A.copy(Dt)},this.setScissor=function(A,Q,pe,oe){A.isVector4?Dt.set(A.x,A.y,A.z,A.w):Dt.set(A,Q,pe,oe),b.scissor(X.copy(Dt).multiplyScalar(xe).round())},this.getScissorTest=function(){return ct},this.setScissorTest=function(A){b.setScissorTest(ct=A)},this.setOpaqueSort=function(A){te=A},this.setTransparentSort=function(A){Ue=A},this.getClearColor=function(A){return A.copy(st.getClearColor())},this.setClearColor=function(){st.setClearColor(...arguments)},this.getClearAlpha=function(){return st.getClearAlpha()},this.setClearAlpha=function(){st.setClearAlpha(...arguments)},this.clear=function(A=!0,Q=!0,pe=!0){let oe=0;if(A){let ae=!1;if(q!==null){const Le=q.texture.format;ae=x.has(Le)}if(ae){const Le=q.texture.type,We=y.has(Le),Pe=st.getClearColor(),Qe=st.getClearAlpha(),it=Pe.r,ht=Pe.g,ft=Pe.b;We?(N[0]=it,N[1]=ht,N[2]=ft,N[3]=Qe,Y.clearBufferuiv(Y.COLOR,0,N)):(P[0]=it,P[1]=ht,P[2]=ft,P[3]=Qe,Y.clearBufferiv(Y.COLOR,0,P))}else oe|=Y.COLOR_BUFFER_BIT}Q&&(oe|=Y.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),pe&&(oe|=Y.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),oe!==0&&Y.clear(oe)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(A){A.setRenderer(this),K=A},this.dispose=function(){t.removeEventListener("webglcontextlost",Ht,!1),t.removeEventListener("webglcontextrestored",It,!1),t.removeEventListener("webglcontextcreationerror",Fn,!1),st.dispose(),ne.dispose(),Me.dispose(),se.dispose(),Te.dispose(),_e.dispose(),Oe.dispose(),Ee.dispose(),Ie.dispose(),qe.dispose(),qe.removeEventListener("sessionstart",sc),qe.removeEventListener("sessionend",ac),Xn.stop()};function Ht(A){A.preventDefault(),Yv("WebGLRenderer: Context Lost."),H=!0}function It(){Yv("WebGLRenderer: Context Restored."),H=!1;const A=J.autoReset,Q=nt.enabled,pe=nt.autoUpdate,oe=nt.needsUpdate,ae=nt.type;Ke(),J.autoReset=A,nt.enabled=Q,nt.autoUpdate=pe,nt.needsUpdate=oe,nt.type=ae}function Fn(A){Nt("WebGLRenderer: A WebGL context could not be created. Reason: ",A.statusMessage)}function wi(A){const Q=A.target;Q.removeEventListener("dispose",wi),ks(Q)}function ks(A){wa(A),se.remove(A)}function wa(A){const Q=se.get(A).programs;Q!==void 0&&(Q.forEach(function(pe){Ie.releaseProgram(pe)}),A.isShaderMaterial&&Ie.releaseShaderCache(A))}this.renderBufferDirect=function(A,Q,pe,oe,ae,Le){Q===null&&(Q=qt);const We=ae.isMesh&&ae.matrixWorld.determinantAffine()<0,Pe=sn(A,Q,pe,oe,ae);b.setMaterial(oe,We);let Qe=pe.index,it=1;if(oe.wireframe===!0){if(Qe=ve.getWireframeAttribute(pe),Qe===void 0)return;it=2}const ht=pe.drawRange,ft=pe.attributes.position;let Je=ht.start*it,Rt=(ht.start+ht.count)*it;Le!==null&&(Je=Math.max(Je,Le.start*it),Rt=Math.min(Rt,(Le.start+Le.count)*it)),Qe!==null?(Je=Math.max(Je,0),Rt=Math.min(Rt,Qe.count)):ft!=null&&(Je=Math.max(Je,0),Rt=Math.min(Rt,ft.count));const jt=Rt-Je;if(jt<0||jt===1/0)return;Oe.setup(ae,oe,Pe,pe,Qe);let en,kt=Ne;if(Qe!==null&&(en=Ae.get(Qe),kt=ye,kt.setIndex(en)),ae.isMesh)oe.wireframe===!0?(b.setLineWidth(oe.wireframeLinewidth*Gt()),kt.setMode(Y.LINES)):kt.setMode(Y.TRIANGLES);else if(ae.isLine){let fn=oe.linewidth;fn===void 0&&(fn=1),b.setLineWidth(fn*Gt()),ae.isLineSegments?kt.setMode(Y.LINES):ae.isLineLoop?kt.setMode(Y.LINE_LOOP):kt.setMode(Y.LINE_STRIP)}else ae.isPoints?kt.setMode(Y.POINTS):ae.isSprite&&kt.setMode(Y.TRIANGLES);if(ae.isBatchedMesh)if(Ct.get("WEBGL_multi_draw"))kt.renderMultiDraw(ae._multiDrawStarts,ae._multiDrawCounts,ae._multiDrawCount);else{const fn=ae._multiDrawStarts,He=ae._multiDrawCounts,Nn=ae._multiDrawCount,xt=Qe?Ae.get(Qe).bytesPerElement:1,Jn=se.get(oe).currentProgram.getUniforms();for(let ei=0;ei<Nn;ei++)Jn.setValue(Y,"_gl_DrawID",ei),kt.render(fn[ei]/xt,He[ei])}else if(ae.isInstancedMesh)kt.renderInstances(Je,jt,ae.count);else if(pe.isInstancedBufferGeometry){const fn=pe._maxInstanceCount!==void 0?pe._maxInstanceCount:1/0,He=Math.min(pe.instanceCount,fn);kt.renderInstances(Je,jt,He)}else kt.render(Je,jt)};function zs(A,Q,pe){A.transparent===!0&&A.side===hr&&A.forceSinglePass===!1?(A.side=hi,A.needsUpdate=!0,Vs(A,Q,pe),A.side=Us,A.needsUpdate=!0,Vs(A,Q,pe),A.side=hr):Vs(A,Q,pe)}this.compile=function(A,Q,pe=null){pe===null&&(pe=A),L=Me.get(pe),L.init(Q),T.push(L),pe.traverseVisible(function(ae){ae.isLight&&ae.layers.test(Q.layers)&&(L.pushLight(ae),ae.castShadow&&L.pushShadow(ae))}),A!==pe&&A.traverseVisible(function(ae){ae.isLight&&ae.layers.test(Q.layers)&&(L.pushLight(ae),ae.castShadow&&L.pushShadow(ae))}),L.setupLights();const oe=new Set;return A.traverse(function(ae){if(!(ae.isMesh||ae.isPoints||ae.isLine||ae.isSprite))return;const Le=ae.material;if(Le)if(Array.isArray(Le))for(let We=0;We<Le.length;We++){const Pe=Le[We];zs(Pe,pe,ae),oe.add(Pe)}else zs(Le,pe,ae),oe.add(Le)}),L=T.pop(),oe},this.compileAsync=function(A,Q,pe=null){const oe=this.compile(A,Q,pe);return new Promise(ae=>{function Le(){if(oe.forEach(function(We){se.get(We).currentProgram.isReady()&&oe.delete(We)}),oe.size===0){ae(A);return}setTimeout(Le,10)}Ct.get("KHR_parallel_shader_compile")!==null?Le():setTimeout(Le,10)})};let Bs=null;function yd(A){Bs&&Bs(A)}function sc(){Xn.stop()}function ac(){Xn.start()}const Xn=new Sy;Xn.setAnimationLoop(yd),typeof self<"u"&&Xn.setContext(self),this.setAnimationLoop=function(A){Bs=A,qe.setAnimationLoop(A),A===null?Xn.stop():Xn.start()},qe.addEventListener("sessionstart",sc),qe.addEventListener("sessionend",ac),this.render=function(A,Q){if(Q!==void 0&&Q.isCamera!==!0){Nt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(H===!0)return;K!==null&&K.renderStart(A,Q);const pe=qe.enabled===!0&&qe.isPresenting===!0,oe=I!==null&&(q===null||pe)&&I.begin(G,q);if(A.matrixWorldAutoUpdate===!0&&A.updateMatrixWorld(),Q.parent===null&&Q.matrixWorldAutoUpdate===!0&&Q.updateMatrixWorld(),qe.enabled===!0&&qe.isPresenting===!0&&(I===null||I.isCompositing()===!1)&&(qe.cameraAutoUpdate===!0&&qe.updateCamera(Q),Q=qe.getCamera()),A.isScene===!0&&A.onBeforeRender(G,A,Q,q),L=Me.get(A,T.length),L.init(Q),L.state.textureUnits=ge.getTextureUnits(),T.push(L),Wt.multiplyMatrices(Q.projectionMatrix,Q.matrixWorldInverse),At.setFromProjectionMatrix(Wt,pr,Q.reversedDepth),_t=this.localClippingEnabled,Et=ke.init(this.clippingPlanes,_t),D=ne.get(A,F.length),D.init(),F.push(D),qe.enabled===!0&&qe.isPresenting===!0){const We=G.xr.getDepthSensingMesh();We!==null&&Ta(We,Q,-1/0,G.sortObjects)}Ta(A,Q,0,G.sortObjects),D.finish(),G.sortObjects===!0&&D.sort(te,Ue,Q.reversedDepth),wt=qe.enabled===!1||qe.isPresenting===!1||qe.hasDepthSensing()===!1,wt&&st.addToRenderList(D,A),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),Et===!0&&ke.beginShadows();const ae=L.state.shadowsArray;if(nt.render(ae,A,Q),Et===!0&&ke.endShadows(),(oe&&I.hasRenderPass())===!1){const We=D.opaque,Pe=D.transmissive;if(L.setupLights(),Q.isArrayCamera){const Qe=Q.cameras;if(Pe.length>0)for(let it=0,ht=Qe.length;it<ht;it++){const ft=Qe[it];oc(We,Pe,A,ft)}wt&&st.render(A);for(let it=0,ht=Qe.length;it<ht;it++){const ft=Qe[it];Go(D,A,ft,ft.viewport)}}else Pe.length>0&&oc(We,Pe,A,Q),wt&&st.render(A),Go(D,A,Q)}q!==null&&Z===0&&(ge.updateMultisampleRenderTarget(q),ge.updateRenderTargetMipmap(q)),oe&&I.end(G),A.isScene===!0&&A.onAfterRender(G,A,Q),Oe.resetDefaultState(),ue=-1,he=null,T.pop(),T.length>0?(L=T[T.length-1],ge.setTextureUnits(L.state.textureUnits),Et===!0&&ke.setGlobalState(G.clippingPlanes,L.state.camera)):L=null,F.pop(),F.length>0?D=F[F.length-1]:D=null,K!==null&&K.renderEnd()};function Ta(A,Q,pe,oe){if(A.visible===!1)return;if(A.layers.test(Q.layers)){if(A.isGroup)pe=A.renderOrder;else if(A.isLOD)A.autoUpdate===!0&&A.update(Q);else if(A.isLightProbeGrid)L.pushLightProbeGrid(A);else if(A.isLight)L.pushLight(A),A.castShadow&&L.pushShadow(A);else if(A.isSprite){if(!A.frustumCulled||At.intersectsSprite(A)){oe&&Jt.setFromMatrixPosition(A.matrixWorld).applyMatrix4(Wt);const We=_e.update(A),Pe=A.material;Pe.visible&&D.push(A,We,Pe,pe,Jt.z,null)}}else if((A.isMesh||A.isLine||A.isPoints)&&(!A.frustumCulled||At.intersectsObject(A))){const We=_e.update(A),Pe=A.material;if(oe&&(A.boundingSphere!==void 0?(A.boundingSphere===null&&A.computeBoundingSphere(),Jt.copy(A.boundingSphere.center)):(We.boundingSphere===null&&We.computeBoundingSphere(),Jt.copy(We.boundingSphere.center)),Jt.applyMatrix4(A.matrixWorld).applyMatrix4(Wt)),Array.isArray(Pe)){const Qe=We.groups;for(let it=0,ht=Qe.length;it<ht;it++){const ft=Qe[it],Je=Pe[ft.materialIndex];Je&&Je.visible&&D.push(A,We,Je,pe,Jt.z,ft)}}else Pe.visible&&D.push(A,We,Pe,pe,Jt.z,null)}}const Le=A.children;for(let We=0,Pe=Le.length;We<Pe;We++)Ta(Le[We],Q,pe,oe)}function Go(A,Q,pe,oe){const{opaque:ae,transmissive:Le,transparent:We}=A;L.setupLightsView(pe),Et===!0&&ke.setGlobalState(G.clippingPlanes,pe),oe&&b.viewport(k.copy(oe)),ae.length>0&&Hs(ae,Q,pe),Le.length>0&&Hs(Le,Q,pe),We.length>0&&Hs(We,Q,pe),b.buffers.depth.setTest(!0),b.buffers.depth.setMask(!0),b.buffers.color.setMask(!0),b.setPolygonOffset(!1)}function oc(A,Q,pe,oe){if((pe.isScene===!0?pe.overrideMaterial:null)!==null)return;if(L.state.transmissionRenderTarget[oe.id]===void 0){const Je=Ct.has("EXT_color_buffer_half_float")||Ct.has("EXT_color_buffer_float");L.state.transmissionRenderTarget[oe.id]=new gr(1,1,{generateMipmaps:!0,type:Je?$r:Si,minFilter:ua,samples:Math.max(4,U.samples),stencilBuffer:l,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:bt.workingColorSpace})}const Le=L.state.transmissionRenderTarget[oe.id],We=oe.viewport||k;Le.setSize(We.z*G.transmissionResolutionScale,We.w*G.transmissionResolutionScale);const Pe=G.getRenderTarget(),Qe=G.getActiveCubeFace(),it=G.getActiveMipmapLevel();G.setRenderTarget(Le),G.getClearColor(je),Ge=G.getClearAlpha(),Ge<1&&G.setClearColor(16777215,.5),G.clear(),wt&&st.render(pe);const ht=G.toneMapping;G.toneMapping=mr;const ft=oe.viewport;if(oe.viewport!==void 0&&(oe.viewport=void 0),L.setupLightsView(oe),Et===!0&&ke.setGlobalState(G.clippingPlanes,oe),Hs(A,pe,oe),ge.updateMultisampleRenderTarget(Le),ge.updateRenderTargetMipmap(Le),Ct.has("WEBGL_multisampled_render_to_texture")===!1){let Je=!1;for(let Rt=0,jt=Q.length;Rt<jt;Rt++){const en=Q[Rt],{object:kt,geometry:fn,material:He,group:Nn}=en;if(He.side===hr&&kt.layers.test(oe.layers)){const xt=He.side;He.side=hi,He.needsUpdate=!0,Wo(kt,pe,oe,fn,He,Nn),He.side=xt,He.needsUpdate=!0,Je=!0}}Je===!0&&(ge.updateMultisampleRenderTarget(Le),ge.updateRenderTargetMipmap(Le))}G.setRenderTarget(Pe,Qe,it),G.setClearColor(je,Ge),ft!==void 0&&(oe.viewport=ft),G.toneMapping=ht}function Hs(A,Q,pe){const oe=Q.isScene===!0?Q.overrideMaterial:null;for(let ae=0,Le=A.length;ae<Le;ae++){const We=A[ae],{object:Pe,geometry:Qe,group:it}=We;let ht=We.material;ht.allowOverride===!0&&oe!==null&&(ht=oe),Pe.layers.test(pe.layers)&&Wo(Pe,Q,pe,Qe,ht,it)}}function Wo(A,Q,pe,oe,ae,Le){A.onBeforeRender(G,Q,pe,oe,ae,Le),A.modelViewMatrix.multiplyMatrices(pe.matrixWorldInverse,A.matrixWorld),A.normalMatrix.getNormalMatrix(A.modelViewMatrix),ae.onBeforeRender(G,Q,pe,oe,A,Le),ae.transparent===!0&&ae.side===hr&&ae.forceSinglePass===!1?(ae.side=hi,ae.needsUpdate=!0,G.renderBufferDirect(pe,Q,oe,ae,A,Le),ae.side=Us,ae.needsUpdate=!0,G.renderBufferDirect(pe,Q,oe,ae,A,Le),ae.side=hr):G.renderBufferDirect(pe,Q,oe,ae,A,Le),A.onAfterRender(G,Q,pe,oe,ae,Le)}function Vs(A,Q,pe){Q.isScene!==!0&&(Q=qt);const oe=se.get(A),ae=L.state.lights,Le=L.state.shadowsArray,We=ae.state.version,Pe=Ie.getParameters(A,ae.state,Le,Q,pe,L.state.lightProbeGridArray),Qe=Ie.getProgramCacheKey(Pe);let it=oe.programs;oe.environment=A.isMeshStandardMaterial||A.isMeshLambertMaterial||A.isMeshPhongMaterial?Q.environment:null,oe.fog=Q.fog;const ht=A.isMeshStandardMaterial||A.isMeshLambertMaterial&&!A.envMap||A.isMeshPhongMaterial&&!A.envMap;oe.envMap=Te.get(A.envMap||oe.environment,ht),oe.envMapRotation=oe.environment!==null&&A.envMap===null?Q.environmentRotation:A.envMapRotation,it===void 0&&(A.addEventListener("dispose",wi),it=new Map,oe.programs=it);let ft=it.get(Qe);if(ft!==void 0){if(oe.currentProgram===ft&&oe.lightsStateVersion===We)return lc(A,Pe),ft}else Pe.uniforms=Ie.getUniforms(A),K!==null&&A.isNodeMaterial&&K.build(A,pe,Pe),A.onBeforeCompile(Pe,G),ft=Ie.acquireProgram(Pe,Qe),it.set(Qe,ft),oe.uniforms=Pe.uniforms;const Je=oe.uniforms;return(!A.isShaderMaterial&&!A.isRawShaderMaterial||A.clipping===!0)&&(Je.clippingPlanes=ke.uniform),lc(A,Pe),oe.needsLights=Xo(A),oe.lightsStateVersion=We,oe.needsLights&&(Je.ambientLightColor.value=ae.state.ambient,Je.lightProbe.value=ae.state.probe,Je.directionalLights.value=ae.state.directional,Je.directionalLightShadows.value=ae.state.directionalShadow,Je.spotLights.value=ae.state.spot,Je.spotLightShadows.value=ae.state.spotShadow,Je.rectAreaLights.value=ae.state.rectArea,Je.ltc_1.value=ae.state.rectAreaLTC1,Je.ltc_2.value=ae.state.rectAreaLTC2,Je.pointLights.value=ae.state.point,Je.pointLightShadows.value=ae.state.pointShadow,Je.hemisphereLights.value=ae.state.hemi,Je.directionalShadowMatrix.value=ae.state.directionalShadowMatrix,Je.spotLightMatrix.value=ae.state.spotLightMatrix,Je.spotLightMap.value=ae.state.spotLightMap,Je.pointShadowMatrix.value=ae.state.pointShadowMatrix),oe.lightProbeGrid=L.state.lightProbeGridArray.length>0,oe.currentProgram=ft,oe.uniformsList=null,ft}function jo(A){if(A.uniformsList===null){const Q=A.currentProgram.getUniforms();A.uniformsList=Qu.seqWithValue(Q.seq,A.uniforms)}return A.uniformsList}function lc(A,Q){const pe=se.get(A);pe.outputColorSpace=Q.outputColorSpace,pe.batching=Q.batching,pe.batchingColor=Q.batchingColor,pe.instancing=Q.instancing,pe.instancingColor=Q.instancingColor,pe.instancingMorph=Q.instancingMorph,pe.skinning=Q.skinning,pe.morphTargets=Q.morphTargets,pe.morphNormals=Q.morphNormals,pe.morphColors=Q.morphColors,pe.morphTargetsCount=Q.morphTargetsCount,pe.numClippingPlanes=Q.numClippingPlanes,pe.numIntersection=Q.numClipIntersection,pe.vertexAlphas=Q.vertexAlphas,pe.vertexTangents=Q.vertexTangents,pe.toneMapping=Q.toneMapping}function Sd(A,Q){if(A.length===0)return null;if(A.length===1)return A[0].texture!==null?A[0]:null;C.setFromMatrixPosition(Q.matrixWorld);for(let pe=0,oe=A.length;pe<oe;pe++){const ae=A[pe];if(ae.texture!==null&&ae.boundingBox.containsPoint(C))return ae}return null}function sn(A,Q,pe,oe,ae){Q.isScene!==!0&&(Q=qt),ge.resetTextureUnits();const Le=Q.fog,We=oe.isMeshStandardMaterial||oe.isMeshLambertMaterial||oe.isMeshPhongMaterial?Q.environment:null,Pe=q===null?G.outputColorSpace:q.isXRRenderTarget===!0?q.texture.colorSpace:bt.workingColorSpace,Qe=oe.isMeshStandardMaterial||oe.isMeshLambertMaterial&&!oe.envMap||oe.isMeshPhongMaterial&&!oe.envMap,it=Te.get(oe.envMap||We,Qe),ht=oe.vertexColors===!0&&!!pe.attributes.color&&pe.attributes.color.itemSize===4,ft=!!pe.attributes.tangent&&(!!oe.normalMap||oe.anisotropy>0),Je=!!pe.morphAttributes.position,Rt=!!pe.morphAttributes.normal,jt=!!pe.morphAttributes.color;let en=mr;oe.toneMapped&&(q===null||q.isXRRenderTarget===!0)&&(en=G.toneMapping);const kt=pe.morphAttributes.position||pe.morphAttributes.normal||pe.morphAttributes.color,fn=kt!==void 0?kt.length:0,He=se.get(oe),Nn=L.state.lights;if(Et===!0&&(_t===!0||A!==he)){const zt=A===he&&oe.id===ue;ke.setState(oe,A,zt)}let xt=!1;oe.version===He.__version?(He.needsLights&&He.lightsStateVersion!==Nn.state.version||He.outputColorSpace!==Pe||ae.isBatchedMesh&&He.batching===!1||!ae.isBatchedMesh&&He.batching===!0||ae.isBatchedMesh&&He.batchingColor===!0&&ae.colorTexture===null||ae.isBatchedMesh&&He.batchingColor===!1&&ae.colorTexture!==null||ae.isInstancedMesh&&He.instancing===!1||!ae.isInstancedMesh&&He.instancing===!0||ae.isSkinnedMesh&&He.skinning===!1||!ae.isSkinnedMesh&&He.skinning===!0||ae.isInstancedMesh&&He.instancingColor===!0&&ae.instanceColor===null||ae.isInstancedMesh&&He.instancingColor===!1&&ae.instanceColor!==null||ae.isInstancedMesh&&He.instancingMorph===!0&&ae.morphTexture===null||ae.isInstancedMesh&&He.instancingMorph===!1&&ae.morphTexture!==null||He.envMap!==it||oe.fog===!0&&He.fog!==Le||He.numClippingPlanes!==void 0&&(He.numClippingPlanes!==ke.numPlanes||He.numIntersection!==ke.numIntersection)||He.vertexAlphas!==ht||He.vertexTangents!==ft||He.morphTargets!==Je||He.morphNormals!==Rt||He.morphColors!==jt||He.toneMapping!==en||He.morphTargetsCount!==fn||!!He.lightProbeGrid!=L.state.lightProbeGridArray.length>0)&&(xt=!0):(xt=!0,He.__version=oe.version);let Jn=He.currentProgram;xt===!0&&(Jn=Vs(oe,Q,ae),K&&oe.isNodeMaterial&&K.onUpdateProgram(oe,Jn,He));let ei=!1,yt=!1,Sr=!1;const Ut=Jn.getUniforms(),Yt=He.uniforms;if(b.useProgram(Jn.program)&&(ei=!0,yt=!0,Sr=!0),oe.id!==ue&&(ue=oe.id,yt=!0),He.needsLights){const zt=Sd(L.state.lightProbeGridArray,ae);He.lightProbeGrid!==zt&&(He.lightProbeGrid=zt,yt=!0)}if(ei||he!==A){b.buffers.depth.getReversed()&&A.reversedDepth!==!0&&(A._reversedDepth=!0,A.updateProjectionMatrix()),Ut.setValue(Y,"projectionMatrix",A.projectionMatrix),Ut.setValue(Y,"viewMatrix",A.matrixWorldInverse);const Oi=Ut.map.cameraPosition;Oi!==void 0&&Oi.setValue(Y,$t.setFromMatrixPosition(A.matrixWorld)),U.logarithmicDepthBuffer&&Ut.setValue(Y,"logDepthBufFC",2/(Math.log(A.far+1)/Math.LN2)),(oe.isMeshPhongMaterial||oe.isMeshToonMaterial||oe.isMeshLambertMaterial||oe.isMeshBasicMaterial||oe.isMeshStandardMaterial||oe.isShaderMaterial)&&Ut.setValue(Y,"isOrthographic",A.isOrthographicCamera===!0),he!==A&&(he=A,yt=!0,Sr=!0)}if(He.needsLights&&(Nn.state.directionalShadowMap.length>0&&Ut.setValue(Y,"directionalShadowMap",Nn.state.directionalShadowMap,ge),Nn.state.spotShadowMap.length>0&&Ut.setValue(Y,"spotShadowMap",Nn.state.spotShadowMap,ge),Nn.state.pointShadowMap.length>0&&Ut.setValue(Y,"pointShadowMap",Nn.state.pointShadowMap,ge)),ae.isSkinnedMesh){Ut.setOptional(Y,ae,"bindMatrix"),Ut.setOptional(Y,ae,"bindMatrixInverse");const zt=ae.skeleton;zt&&(zt.boneTexture===null&&zt.computeBoneTexture(),Ut.setValue(Y,"boneTexture",zt.boneTexture,ge))}ae.isBatchedMesh&&(Ut.setOptional(Y,ae,"batchingTexture"),Ut.setValue(Y,"batchingTexture",ae._matricesTexture,ge),Ut.setOptional(Y,ae,"batchingIdTexture"),Ut.setValue(Y,"batchingIdTexture",ae._indirectTexture,ge),Ut.setOptional(Y,ae,"batchingColorTexture"),ae._colorsTexture!==null&&Ut.setValue(Y,"batchingColorTexture",ae._colorsTexture,ge));const Fi=pe.morphAttributes;if((Fi.position!==void 0||Fi.normal!==void 0||Fi.color!==void 0)&&j.update(ae,pe,Jn),(yt||He.receiveShadow!==ae.receiveShadow)&&(He.receiveShadow=ae.receiveShadow,Ut.setValue(Y,"receiveShadow",ae.receiveShadow)),(oe.isMeshStandardMaterial||oe.isMeshLambertMaterial||oe.isMeshPhongMaterial)&&oe.envMap===null&&Q.environment!==null&&(Yt.envMapIntensity.value=Q.environmentIntensity),Yt.dfgLUT!==void 0&&(Yt.dfgLUT.value=VP()),yt){if(Ut.setValue(Y,"toneMappingExposure",G.toneMappingExposure),He.needsLights&&Md(Yt,Sr),Le&&oe.fog===!0&&Xe.refreshFogUniforms(Yt,Le),Xe.refreshMaterialUniforms(Yt,oe,xe,Se,L.state.transmissionRenderTarget[A.id]),He.needsLights&&He.lightProbeGrid){const zt=He.lightProbeGrid;Yt.probesSH.value=zt.texture,Yt.probesMin.value.copy(zt.boundingBox.min),Yt.probesMax.value.copy(zt.boundingBox.max),Yt.probesResolution.value.copy(zt.resolution)}Qu.upload(Y,jo(He),Yt,ge)}if(oe.isShaderMaterial&&oe.uniformsNeedUpdate===!0&&(Qu.upload(Y,jo(He),Yt,ge),oe.uniformsNeedUpdate=!1),oe.isSpriteMaterial&&Ut.setValue(Y,"center",ae.center),Ut.setValue(Y,"modelViewMatrix",ae.modelViewMatrix),Ut.setValue(Y,"normalMatrix",ae.normalMatrix),Ut.setValue(Y,"modelMatrix",ae.matrixWorld),oe.uniformsGroups!==void 0){const zt=oe.uniformsGroups;for(let Oi=0,tr=zt.length;Oi<tr;Oi++){const Gs=zt[Oi];Ee.update(Gs,Jn),Ee.bind(Gs,Jn)}}return Jn}function Md(A,Q){A.ambientLightColor.needsUpdate=Q,A.lightProbe.needsUpdate=Q,A.directionalLights.needsUpdate=Q,A.directionalLightShadows.needsUpdate=Q,A.pointLights.needsUpdate=Q,A.pointLightShadows.needsUpdate=Q,A.spotLights.needsUpdate=Q,A.spotLightShadows.needsUpdate=Q,A.rectAreaLights.needsUpdate=Q,A.hemisphereLights.needsUpdate=Q}function Xo(A){return A.isMeshLambertMaterial||A.isMeshToonMaterial||A.isMeshPhongMaterial||A.isMeshStandardMaterial||A.isShadowMaterial||A.isShaderMaterial&&A.lights===!0}this.getActiveCubeFace=function(){return ce},this.getActiveMipmapLevel=function(){return Z},this.getRenderTarget=function(){return q},this.setRenderTargetTextures=function(A,Q,pe){const oe=se.get(A);oe.__autoAllocateDepthBuffer=A.resolveDepthBuffer===!1,oe.__autoAllocateDepthBuffer===!1&&(oe.__useRenderToTexture=!1),se.get(A.texture).__webglTexture=Q,se.get(A.depthTexture).__webglTexture=oe.__autoAllocateDepthBuffer?void 0:pe,oe.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(A,Q){const pe=se.get(A);pe.__webglFramebuffer=Q,pe.__useDefaultFramebuffer=Q===void 0},this.setRenderTarget=function(A,Q=0,pe=0){q=A,ce=Q,Z=pe;let oe=null,ae=!1,Le=!1;if(A){const Pe=se.get(A);if(Pe.__useDefaultFramebuffer!==void 0){b.bindFramebuffer(Y.FRAMEBUFFER,Pe.__webglFramebuffer),k.copy(A.viewport),X.copy(A.scissor),Fe=A.scissorTest,b.viewport(k),b.scissor(X),b.setScissorTest(Fe),ue=-1;return}else if(Pe.__webglFramebuffer===void 0)ge.setupRenderTarget(A);else if(Pe.__hasExternalTextures)ge.rebindTextures(A,se.get(A.texture).__webglTexture,se.get(A.depthTexture).__webglTexture);else if(A.depthBuffer){const ht=A.depthTexture;if(Pe.__boundDepthTexture!==ht){if(ht!==null&&se.has(ht)&&(A.width!==ht.image.width||A.height!==ht.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");ge.setupDepthRenderbuffer(A)}}const Qe=A.texture;(Qe.isData3DTexture||Qe.isDataArrayTexture||Qe.isCompressedArrayTexture)&&(Le=!0);const it=se.get(A).__webglFramebuffer;A.isWebGLCubeRenderTarget?(Array.isArray(it[Q])?oe=it[Q][pe]:oe=it[Q],ae=!0):A.samples>0&&ge.useMultisampledRTT(A)===!1?oe=se.get(A).__webglMultisampledFramebuffer:Array.isArray(it)?oe=it[pe]:oe=it,k.copy(A.viewport),X.copy(A.scissor),Fe=A.scissorTest}else k.copy(tt).multiplyScalar(xe).floor(),X.copy(Dt).multiplyScalar(xe).floor(),Fe=ct;if(pe!==0&&(oe=re),b.bindFramebuffer(Y.FRAMEBUFFER,oe)&&b.drawBuffers(A,oe),b.viewport(k),b.scissor(X),b.setScissorTest(Fe),ae){const Pe=se.get(A.texture);Y.framebufferTexture2D(Y.FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Y.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Pe.__webglTexture,pe)}else if(Le){const Pe=Q;for(let Qe=0;Qe<A.textures.length;Qe++){const it=se.get(A.textures[Qe]);Y.framebufferTextureLayer(Y.FRAMEBUFFER,Y.COLOR_ATTACHMENT0+Qe,it.__webglTexture,pe,Pe)}}else if(A!==null&&pe!==0){const Pe=se.get(A.texture);Y.framebufferTexture2D(Y.FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Y.TEXTURE_2D,Pe.__webglTexture,pe)}ue=-1},this.readRenderTargetPixels=function(A,Q,pe,oe,ae,Le,We,Pe=0){if(!(A&&A.isWebGLRenderTarget)){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Qe=se.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&We!==void 0&&(Qe=Qe[We]),Qe){b.bindFramebuffer(Y.FRAMEBUFFER,Qe);try{const it=A.textures[Pe],ht=it.format,ft=it.type;if(A.textures.length>1&&Y.readBuffer(Y.COLOR_ATTACHMENT0+Pe),!U.textureFormatReadable(ht)){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!U.textureTypeReadable(ft)){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}Q>=0&&Q<=A.width-oe&&pe>=0&&pe<=A.height-ae&&Y.readPixels(Q,pe,oe,ae,De.convert(ht),De.convert(ft),Le)}finally{const it=q!==null?se.get(q).__webglFramebuffer:null;b.bindFramebuffer(Y.FRAMEBUFFER,it)}}},this.readRenderTargetPixelsAsync=async function(A,Q,pe,oe,ae,Le,We,Pe=0){if(!(A&&A.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Qe=se.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&We!==void 0&&(Qe=Qe[We]),Qe)if(Q>=0&&Q<=A.width-oe&&pe>=0&&pe<=A.height-ae){b.bindFramebuffer(Y.FRAMEBUFFER,Qe);const it=A.textures[Pe],ht=it.format,ft=it.type;if(A.textures.length>1&&Y.readBuffer(Y.COLOR_ATTACHMENT0+Pe),!U.textureFormatReadable(ht))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!U.textureTypeReadable(ft))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Je=Y.createBuffer();Y.bindBuffer(Y.PIXEL_PACK_BUFFER,Je),Y.bufferData(Y.PIXEL_PACK_BUFFER,Le.byteLength,Y.STREAM_READ),Y.readPixels(Q,pe,oe,ae,De.convert(ht),De.convert(ft),0);const Rt=q!==null?se.get(q).__webglFramebuffer:null;b.bindFramebuffer(Y.FRAMEBUFFER,Rt);const jt=Y.fenceSync(Y.SYNC_GPU_COMMANDS_COMPLETE,0);return Y.flush(),await Zw(Y,jt,4),Y.bindBuffer(Y.PIXEL_PACK_BUFFER,Je),Y.getBufferSubData(Y.PIXEL_PACK_BUFFER,0,Le),Y.deleteBuffer(Je),Y.deleteSync(jt),Le}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(A,Q=null,pe=0){const oe=Math.pow(2,-pe),ae=Math.floor(A.image.width*oe),Le=Math.floor(A.image.height*oe),We=Q!==null?Q.x:0,Pe=Q!==null?Q.y:0;ge.setTexture2D(A,0),Y.copyTexSubImage2D(Y.TEXTURE_2D,pe,0,0,We,Pe,ae,Le),b.unbindTexture()},this.copyTextureToTexture=function(A,Q,pe=null,oe=null,ae=0,Le=0){let We,Pe,Qe,it,ht,ft,Je,Rt,jt;const en=A.isCompressedTexture?A.mipmaps[Le]:A.image;if(pe!==null)We=pe.max.x-pe.min.x,Pe=pe.max.y-pe.min.y,Qe=pe.isBox3?pe.max.z-pe.min.z:1,it=pe.min.x,ht=pe.min.y,ft=pe.isBox3?pe.min.z:0;else{const Yt=Math.pow(2,-ae);We=Math.floor(en.width*Yt),Pe=Math.floor(en.height*Yt),A.isDataArrayTexture?Qe=en.depth:A.isData3DTexture?Qe=Math.floor(en.depth*Yt):Qe=1,it=0,ht=0,ft=0}oe!==null?(Je=oe.x,Rt=oe.y,jt=oe.z):(Je=0,Rt=0,jt=0);const kt=De.convert(Q.format),fn=De.convert(Q.type);let He;Q.isData3DTexture?(ge.setTexture3D(Q,0),He=Y.TEXTURE_3D):Q.isDataArrayTexture||Q.isCompressedArrayTexture?(ge.setTexture2DArray(Q,0),He=Y.TEXTURE_2D_ARRAY):(ge.setTexture2D(Q,0),He=Y.TEXTURE_2D),b.activeTexture(Y.TEXTURE0),b.pixelStorei(Y.UNPACK_FLIP_Y_WEBGL,Q.flipY),b.pixelStorei(Y.UNPACK_PREMULTIPLY_ALPHA_WEBGL,Q.premultiplyAlpha),b.pixelStorei(Y.UNPACK_ALIGNMENT,Q.unpackAlignment);const Nn=b.getParameter(Y.UNPACK_ROW_LENGTH),xt=b.getParameter(Y.UNPACK_IMAGE_HEIGHT),Jn=b.getParameter(Y.UNPACK_SKIP_PIXELS),ei=b.getParameter(Y.UNPACK_SKIP_ROWS),yt=b.getParameter(Y.UNPACK_SKIP_IMAGES);b.pixelStorei(Y.UNPACK_ROW_LENGTH,en.width),b.pixelStorei(Y.UNPACK_IMAGE_HEIGHT,en.height),b.pixelStorei(Y.UNPACK_SKIP_PIXELS,it),b.pixelStorei(Y.UNPACK_SKIP_ROWS,ht),b.pixelStorei(Y.UNPACK_SKIP_IMAGES,ft);const Sr=A.isDataArrayTexture||A.isData3DTexture,Ut=Q.isDataArrayTexture||Q.isData3DTexture;if(A.isDepthTexture){const Yt=se.get(A),Fi=se.get(Q),zt=se.get(Yt.__renderTarget),Oi=se.get(Fi.__renderTarget);b.bindFramebuffer(Y.READ_FRAMEBUFFER,zt.__webglFramebuffer),b.bindFramebuffer(Y.DRAW_FRAMEBUFFER,Oi.__webglFramebuffer);for(let tr=0;tr<Qe;tr++)Sr&&(Y.framebufferTextureLayer(Y.READ_FRAMEBUFFER,Y.COLOR_ATTACHMENT0,se.get(A).__webglTexture,ae,ft+tr),Y.framebufferTextureLayer(Y.DRAW_FRAMEBUFFER,Y.COLOR_ATTACHMENT0,se.get(Q).__webglTexture,Le,jt+tr)),Y.blitFramebuffer(it,ht,We,Pe,Je,Rt,We,Pe,Y.DEPTH_BUFFER_BIT,Y.NEAREST);b.bindFramebuffer(Y.READ_FRAMEBUFFER,null),b.bindFramebuffer(Y.DRAW_FRAMEBUFFER,null)}else if(ae!==0||A.isRenderTargetTexture||se.has(A)){const Yt=se.get(A),Fi=se.get(Q);b.bindFramebuffer(Y.READ_FRAMEBUFFER,fe),b.bindFramebuffer(Y.DRAW_FRAMEBUFFER,O);for(let zt=0;zt<Qe;zt++)Sr?Y.framebufferTextureLayer(Y.READ_FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Yt.__webglTexture,ae,ft+zt):Y.framebufferTexture2D(Y.READ_FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Y.TEXTURE_2D,Yt.__webglTexture,ae),Ut?Y.framebufferTextureLayer(Y.DRAW_FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Fi.__webglTexture,Le,jt+zt):Y.framebufferTexture2D(Y.DRAW_FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Y.TEXTURE_2D,Fi.__webglTexture,Le),ae!==0?Y.blitFramebuffer(it,ht,We,Pe,Je,Rt,We,Pe,Y.COLOR_BUFFER_BIT,Y.NEAREST):Ut?Y.copyTexSubImage3D(He,Le,Je,Rt,jt+zt,it,ht,We,Pe):Y.copyTexSubImage2D(He,Le,Je,Rt,it,ht,We,Pe);b.bindFramebuffer(Y.READ_FRAMEBUFFER,null),b.bindFramebuffer(Y.DRAW_FRAMEBUFFER,null)}else Ut?A.isDataTexture||A.isData3DTexture?Y.texSubImage3D(He,Le,Je,Rt,jt,We,Pe,Qe,kt,fn,en.data):Q.isCompressedArrayTexture?Y.compressedTexSubImage3D(He,Le,Je,Rt,jt,We,Pe,Qe,kt,en.data):Y.texSubImage3D(He,Le,Je,Rt,jt,We,Pe,Qe,kt,fn,en):A.isDataTexture?Y.texSubImage2D(Y.TEXTURE_2D,Le,Je,Rt,We,Pe,kt,fn,en.data):A.isCompressedTexture?Y.compressedTexSubImage2D(Y.TEXTURE_2D,Le,Je,Rt,en.width,en.height,kt,en.data):Y.texSubImage2D(Y.TEXTURE_2D,Le,Je,Rt,We,Pe,kt,fn,en);b.pixelStorei(Y.UNPACK_ROW_LENGTH,Nn),b.pixelStorei(Y.UNPACK_IMAGE_HEIGHT,xt),b.pixelStorei(Y.UNPACK_SKIP_PIXELS,Jn),b.pixelStorei(Y.UNPACK_SKIP_ROWS,ei),b.pixelStorei(Y.UNPACK_SKIP_IMAGES,yt),Le===0&&Q.generateMipmaps&&Y.generateMipmap(He),b.unbindTexture()},this.initRenderTarget=function(A){se.get(A).__webglFramebuffer===void 0&&ge.setupRenderTarget(A)},this.initTexture=function(A){A.isCubeTexture?ge.setTextureCube(A,0):A.isData3DTexture?ge.setTexture3D(A,0):A.isDataArrayTexture||A.isCompressedArrayTexture?ge.setTexture2DArray(A,0):ge.setTexture2D(A,0),b.unbindTexture()},this.resetState=function(){ce=0,Z=0,q=null,b.reset(),Oe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return pr}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=bt._getDrawingBufferColorSpace(e),t.unpackColorSpace=bt._getUnpackColorSpace()}}const WP=/^[og]\s*(.+)?/,jP=/^mtllib /,XP=/^usemtl /,$P=/^usemap /,Yx=/\s+/,Kx=new ee,$f=new ee,Qx=new ee,Zx=new ee,Li=new ee,zu=new gt;function qP(){const i={objects:[],object:{},vertices:[],normals:[],colors:[],uvs:[],materials:{},materialLibraries:[],startObject:function(e,t){if(this.object&&this.object.fromDeclaration===!1){this.object.name=e,this.object.fromDeclaration=t!==!1;return}const r=this.object&&typeof this.object.currentMaterial=="function"?this.object.currentMaterial():void 0;if(this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0),this.object={name:e||"",fromDeclaration:t!==!1,geometry:{vertices:[],normals:[],colors:[],uvs:[],hasUVIndices:!1},materials:[],smooth:!0,startMaterial:function(a,l){const c=this._finalize(!1);c&&(c.inherited||c.groupCount<=0)&&this.materials.splice(c.index,1);const d={index:this.materials.length,name:a||"",mtllib:Array.isArray(l)&&l.length>0?l[l.length-1]:"",smooth:c!==void 0?c.smooth:this.smooth,groupStart:c!==void 0?c.groupEnd:0,groupEnd:-1,groupCount:-1,inherited:!1,clone:function(h){const f={index:typeof h=="number"?h:this.index,name:this.name,mtllib:this.mtllib,smooth:this.smooth,groupStart:0,groupEnd:-1,groupCount:-1,inherited:!1};return f.clone=this.clone.bind(f),f}};return this.materials.push(d),d},currentMaterial:function(){if(this.materials.length>0)return this.materials[this.materials.length-1]},_finalize:function(a){const l=this.currentMaterial();if(l&&l.groupEnd===-1&&(l.groupEnd=this.geometry.vertices.length/3,l.groupCount=l.groupEnd-l.groupStart,l.inherited=!1),a&&this.materials.length>1)for(let c=this.materials.length-1;c>=0;c--)this.materials[c].groupCount<=0&&this.materials.splice(c,1);return a&&this.materials.length===0&&this.materials.push({name:"",smooth:this.smooth}),l}},r&&r.name&&typeof r.clone=="function"){const a=r.clone(0);a.inherited=!0,this.object.materials.push(a)}this.objects.push(this.object)},finalize:function(){this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0)},parseVertexIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/3)*3},parseNormalIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/3)*3},parseUVIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/2)*2},addVertex:function(e,t,r){const a=this.vertices,l=this.object.geometry.vertices;l.push(a[e+0],a[e+1],a[e+2]),l.push(a[t+0],a[t+1],a[t+2]),l.push(a[r+0],a[r+1],a[r+2])},addVertexPoint:function(e){const t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addVertexLine:function(e){const t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addNormal:function(e,t,r){const a=this.normals,l=this.object.geometry.normals;l.push(a[e+0],a[e+1],a[e+2]),l.push(a[t+0],a[t+1],a[t+2]),l.push(a[r+0],a[r+1],a[r+2])},addFaceNormal:function(e,t,r){const a=this.vertices,l=this.object.geometry.normals;Kx.fromArray(a,e),$f.fromArray(a,t),Qx.fromArray(a,r),Li.subVectors(Qx,$f),Zx.subVectors(Kx,$f),Li.cross(Zx),Li.normalize(),l.push(Li.x,Li.y,Li.z),l.push(Li.x,Li.y,Li.z),l.push(Li.x,Li.y,Li.z)},addColor:function(e,t,r){const a=this.colors,l=this.object.geometry.colors;a[e]!==void 0&&l.push(a[e+0],a[e+1],a[e+2]),a[t]!==void 0&&l.push(a[t+0],a[t+1],a[t+2]),a[r]!==void 0&&l.push(a[r+0],a[r+1],a[r+2])},addUV:function(e,t,r){const a=this.uvs,l=this.object.geometry.uvs;l.push(a[e+0],a[e+1]),l.push(a[t+0],a[t+1]),l.push(a[r+0],a[r+1])},addDefaultUV:function(){const e=this.object.geometry.uvs;e.push(0,0),e.push(0,0),e.push(0,0)},addUVLine:function(e){const t=this.uvs;this.object.geometry.uvs.push(t[e+0],t[e+1])},addFace:function(e,t,r,a,l,c,d,h,f){const m=this.vertices.length;let g=this.parseVertexIndex(e,m),v=this.parseVertexIndex(t,m),S=this.parseVertexIndex(r,m);if(this.addVertex(g,v,S),this.addColor(g,v,S),d!==void 0&&d!==""){const E=this.normals.length;g=this.parseNormalIndex(d,E),v=this.parseNormalIndex(h,E),S=this.parseNormalIndex(f,E),this.addNormal(g,v,S)}else this.addFaceNormal(g,v,S);if(a!==void 0&&a!==""){const E=this.uvs.length;g=this.parseUVIndex(a,E),v=this.parseUVIndex(l,E),S=this.parseUVIndex(c,E),this.addUV(g,v,S),this.object.geometry.hasUVIndices=!0}else this.addDefaultUV()},addPointGeometry:function(e){this.object.geometry.type="Points";const t=this.vertices.length;for(let r=0,a=e.length;r<a;r++){const l=this.parseVertexIndex(e[r],t);this.addVertexPoint(l),this.addColor(l)}},addLineGeometry:function(e,t){this.object.geometry.type="Line";const r=this.vertices.length,a=this.uvs.length;for(let l=0,c=e.length;l<c;l++)this.addVertexLine(this.parseVertexIndex(e[l],r));for(let l=0,c=t.length;l<c;l++)this.addUVLine(this.parseUVIndex(t[l],a))}};return i.startObject("",!1),i}class YP extends rc{constructor(e){super(e),this.materials=null}load(e,t,r,a){const l=this,c=new kT(this.manager);c.setPath(this.path),c.setRequestHeader(this.requestHeader),c.setWithCredentials(this.withCredentials),c.load(e,function(d){try{t(l.parse(d))}catch(h){a?a(h):console.error(h),l.manager.itemError(e)}},r,a)}setMaterials(e){return this.materials=e,this}parse(e){const t=new qP;e.indexOf(`\r
`)!==-1&&(e=e.replace(/\r\n/g,`
`)),e.indexOf(`\\
`)!==-1&&(e=e.replace(/\\\n/g,""));const r=e.split(`
`);let a=[];for(let d=0,h=r.length;d<h;d++){const f=r[d].trimStart();if(f.length===0)continue;const m=f.charAt(0);if(m!=="#")if(m==="v"){const g=f.split(Yx);switch(g[0]){case"v":t.vertices.push(parseFloat(g[1]),parseFloat(g[2]),parseFloat(g[3])),g.length>=7?(zu.setRGB(parseFloat(g[4]),parseFloat(g[5]),parseFloat(g[6]),Zn),t.colors.push(zu.r,zu.g,zu.b)):t.colors.push(void 0,void 0,void 0);break;case"vn":t.normals.push(parseFloat(g[1]),parseFloat(g[2]),parseFloat(g[3]));break;case"vt":t.uvs.push(parseFloat(g[1]),parseFloat(g[2]));break}}else if(m==="f"){const v=f.slice(1).trim().split(Yx),S=[];for(let w=0,x=v.length;w<x;w++){const y=v[w];if(y.length>0){const N=y.split("/");S.push(N)}}const E=S[0];for(let w=1,x=S.length-1;w<x;w++){const y=S[w],N=S[w+1];t.addFace(E[0],y[0],N[0],E[1],y[1],N[1],E[2],y[2],N[2])}}else if(m==="l"){const g=f.substring(1).trim().split(" ");let v=[];const S=[];if(f.indexOf("/")===-1)v=g;else for(let E=0,w=g.length;E<w;E++){const x=g[E].split("/");x[0]!==""&&v.push(x[0]),x[1]!==""&&S.push(x[1])}t.addLineGeometry(v,S)}else if(m==="p"){const v=f.slice(1).trim().split(" ");t.addPointGeometry(v)}else if((a=WP.exec(f))!==null){const g=(" "+a[0].slice(1).trim()).slice(1);t.startObject(g)}else if(XP.test(f))t.object.startMaterial(f.substring(7).trim(),t.materialLibraries);else if(jP.test(f))t.materialLibraries.push(f.substring(7).trim());else if($P.test(f))console.warn('THREE.OBJLoader: Rendering identifier "usemap" not supported. Textures must be defined in MTL files.');else if(m==="s"){if(a=f.split(" "),a.length>1){const v=a[1].trim().toLowerCase();t.object.smooth=v!=="0"&&v!=="off"}else t.object.smooth=!0;const g=t.object.currentMaterial();g&&(g.smooth=t.object.smooth)}else{if(f==="\0")continue;console.warn('THREE.OBJLoader: Unexpected line: "'+f+'"')}}t.finalize();const l=new Fl;if(l.materialLibraries=[].concat(t.materialLibraries),!(t.objects.length===1&&t.objects[0].geometry.vertices.length===0)===!0)for(let d=0,h=t.objects.length;d<h;d++){const f=t.objects[d],m=f.geometry,g=f.materials,v=m.type==="Line",S=m.type==="Points";let E=!1;if(m.vertices.length===0)continue;const w=new Mi;w.setAttribute("position",new In(m.vertices,3)),m.normals.length>0&&w.setAttribute("normal",new In(m.normals,3)),m.colors.length>0&&(E=!0,w.setAttribute("color",new In(m.colors,3))),m.hasUVIndices===!0&&w.setAttribute("uv",new In(m.uvs,2));const x=[];for(let N=0,P=g.length;N<P;N++){const C=g[N],D=C.name+"_"+C.smooth+"_"+E;let L=t.materials[D];if(this.materials!==null){if(L=this.materials.create(C.name),v&&L&&!(L instanceof Ku)){const F=new Ku;_r.prototype.copy.call(F,L),F.color.copy(L.color),L=F}else if(S&&L&&!(L instanceof Ol)){const F=new Ol({size:10,sizeAttenuation:!1});_r.prototype.copy.call(F,L),F.color.copy(L.color),F.map=L.map,L=F}}L===void 0&&(v?L=new Ku:S?L=new Ol({size:1,sizeAttenuation:!1}):L=new LT,L.name=C.name,L.flatShading=!C.smooth,L.vertexColors=E,t.materials[D]=L),x.push(L)}let y;if(x.length>1){for(let N=0,P=g.length;N<P;N++){const C=g[N];w.addGroup(C.groupStart,C.groupCount,N)}v?y=new px(w,x):S?y=new Of(w,x):y=new Zi(w,x)}else v?y=new px(w,x[0]):S?y=new Of(w,x[0]):y=new Zi(w,x[0]);y.name=f.name,l.add(y)}else if(t.vertices.length>0){const d=new Ol({size:1,sizeAttenuation:!1}),h=new Mi;h.setAttribute("position",new In(t.vertices,3)),t.colors.length>0&&t.colors[0]!==void 0&&(h.setAttribute("color",new In(t.colors,3)),d.vertexColors=!0);const f=new Of(h,d);l.add(f)}return l}}const Jx={type:"change"},Bm={type:"start"},Ay={type:"end"},Bu=new gd,e_=new Ms,KP=Math.cos(70*tT.DEG2RAD),Sn=new ee,li=2*Math.PI,Vt={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},qf=1e-6;class QP extends $T{constructor(e,t=null){super(e,t),this.state=Vt.NONE,this.target=new ee,this.cursor=new ee,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:po.ROTATE,MIDDLE:po.DOLLY,RIGHT:po.PAN},this.touches={ONE:ho.ROTATE,TWO:ho.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new ee,this._lastQuaternion=new Fs,this._lastTargetPosition=new ee,this._quat=new Fs().setFromUnitVectors(e.up,new ee(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Ex,this._sphericalDelta=new Ex,this._scale=1,this._panOffset=new ee,this._rotateStart=new dt,this._rotateEnd=new dt,this._rotateDelta=new dt,this._panStart=new dt,this._panEnd=new dt,this._panDelta=new dt,this._dollyStart=new dt,this._dollyEnd=new dt,this._dollyDelta=new dt,this._dollyDirection=new ee,this._mouse=new dt,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=JP.bind(this),this._onPointerDown=ZP.bind(this),this._onPointerUp=e2.bind(this),this._onContextMenu=o2.bind(this),this._onMouseWheel=i2.bind(this),this._onKeyDown=r2.bind(this),this._onTouchStart=s2.bind(this),this._onTouchMove=a2.bind(this),this._onMouseDown=t2.bind(this),this._onMouseMove=n2.bind(this),this._interceptControlDown=l2.bind(this),this._interceptControlUp=c2.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction=""}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(Jx),this.update(),this.state=Vt.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){const t=this.object.position;Sn.copy(t).sub(this.target),Sn.applyQuaternion(this._quat),this._spherical.setFromVector3(Sn),this.autoRotate&&this.state===Vt.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let r=this.minAzimuthAngle,a=this.maxAzimuthAngle;isFinite(r)&&isFinite(a)&&(r<-Math.PI?r+=li:r>Math.PI&&(r-=li),a<-Math.PI?a+=li:a>Math.PI&&(a-=li),r<=a?this._spherical.theta=Math.max(r,Math.min(a,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(r+a)/2?Math.max(r,this._spherical.theta):Math.min(a,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let l=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const c=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),l=c!=this._spherical.radius}if(Sn.setFromSpherical(this._spherical),Sn.applyQuaternion(this._quatInverse),t.copy(this.target).add(Sn),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let c=null;if(this.object.isPerspectiveCamera){const d=Sn.length();c=this._clampDistance(d*this._scale);const h=d-c;this.object.position.addScaledVector(this._dollyDirection,h),this.object.updateMatrixWorld(),l=!!h}else if(this.object.isOrthographicCamera){const d=new ee(this._mouse.x,this._mouse.y,0);d.unproject(this.object);const h=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),l=h!==this.object.zoom;const f=new ee(this._mouse.x,this._mouse.y,0);f.unproject(this.object),this.object.position.sub(f).add(d),this.object.updateMatrixWorld(),c=Sn.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;c!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(c).add(this.object.position):(Bu.origin.copy(this.object.position),Bu.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Bu.direction))<KP?this.object.lookAt(this.target):(e_.setFromNormalAndCoplanarPoint(this.object.up,this.target),Bu.intersectPlane(e_,this.target))))}else if(this.object.isOrthographicCamera){const c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),c!==this.object.zoom&&(this.object.updateProjectionMatrix(),l=!0)}return this._scale=1,this._performCursorZoom=!1,l||this._lastPosition.distanceToSquared(this.object.position)>qf||8*(1-this._lastQuaternion.dot(this.object.quaternion))>qf||this._lastTargetPosition.distanceToSquared(this.target)>qf?(this.dispatchEvent(Jx),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?li/60*this.autoRotateSpeed*e:li/60/60*this.autoRotateSpeed}_getZoomScale(e){const t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Sn.setFromMatrixColumn(t,0),Sn.multiplyScalar(-e),this._panOffset.add(Sn)}_panUp(e,t){this.screenSpacePanning===!0?Sn.setFromMatrixColumn(t,1):(Sn.setFromMatrixColumn(t,0),Sn.crossVectors(this.object.up,Sn)),Sn.multiplyScalar(e),this._panOffset.add(Sn)}_pan(e,t){const r=this.domElement;if(this.object.isPerspectiveCamera){const a=this.object.position;Sn.copy(a).sub(this.target);let l=Sn.length();l*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*l/r.clientHeight,this.object.matrix),this._panUp(2*t*l/r.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/r.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/r.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const r=this.domElement.getBoundingClientRect(),a=e-r.left,l=t-r.top,c=r.width,d=r.height;this._mouse.x=a/c*2-1,this._mouse.y=-(l/d)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(li*this._rotateDelta.x/t.clientHeight),this._rotateUp(li*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(li*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-li*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(li*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-li*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._rotateStart.set(r,a)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._panStart.set(r,a)}}_handleTouchStartDolly(e){const t=this._getSecondPointerPosition(e),r=e.pageX-t.x,a=e.pageY-t.y,l=Math.sqrt(r*r+a*a);this._dollyStart.set(0,l)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{const r=this._getSecondPointerPosition(e),a=.5*(e.pageX+r.x),l=.5*(e.pageY+r.y);this._rotateEnd.set(a,l)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(li*this._rotateDelta.x/t.clientHeight),this._rotateUp(li*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._panEnd.set(r,a)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){const t=this._getSecondPointerPosition(e),r=e.pageX-t.x,a=e.pageY-t.y,l=Math.sqrt(r*r+a*a);this._dollyEnd.set(0,l),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const c=(e.pageX+t.x)*.5,d=(e.pageY+t.y)*.5;this._updateZoomParameters(c,d)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new dt,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){const t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){const t=e.deltaMode,r={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:r.deltaY*=16;break;case 2:r.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(r.deltaY*=10),r}}function ZP(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function JP(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function e2(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Ay),this.state=Vt.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:const e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function t2(i){let e;switch(i.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case po.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=Vt.DOLLY;break;case po.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Vt.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Vt.ROTATE}break;case po.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Vt.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Vt.PAN}break;default:this.state=Vt.NONE}this.state!==Vt.NONE&&this.dispatchEvent(Bm)}function n2(i){switch(this.state){case Vt.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case Vt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case Vt.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function i2(i){this.enabled===!1||this.enableZoom===!1||this.state!==Vt.NONE||(i.preventDefault(),this.dispatchEvent(Bm),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(Ay))}function r2(i){this.enabled!==!1&&this._handleKeyDown(i)}function s2(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case ho.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=Vt.TOUCH_ROTATE;break;case ho.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=Vt.TOUCH_PAN;break;default:this.state=Vt.NONE}break;case 2:switch(this.touches.TWO){case ho.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=Vt.TOUCH_DOLLY_PAN;break;case ho.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=Vt.TOUCH_DOLLY_ROTATE;break;default:this.state=Vt.NONE}break;default:this.state=Vt.NONE}this.state!==Vt.NONE&&this.dispatchEvent(Bm)}function a2(i){switch(this._trackPointer(i),this.state){case Vt.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case Vt.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case Vt.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case Vt.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=Vt.NONE}}function o2(i){this.enabled!==!1&&i.preventDefault()}function l2(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function c2(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function u2({piece:i,variant:e,textured:t=!0,size:r=320}){const a=B.useRef(null);return B.useEffect(()=>{const l=a.current;if(!l)return;const c=new mT;c.background=new gt(1315866);const d=new Ii(35,1,.01,5e3),h=new GP({antialias:!0});h.setSize(r,r),h.setPixelRatio(Math.min(2,window.devicePixelRatio)),h.outputColorSpace=Zn,h.toneMapping=Cm,h.toneMappingExposure=1.15,l.appendChild(h.domElement),c.add(new HT(16777215,4210768,1.1)),c.add(new WT(16777215,.35));const f=new Bf(16777215,2.4);f.position.set(3,4,2),c.add(f);const m=new Bf(16777215,1.1);m.position.set(-3,1,-1),c.add(m);const g=new Bf(16777215,.8);g.position.set(0,2,-4),c.add(g);const v=new QP(d,h.domElement);v.enableDamping=!0,v.autoRotate=!0,v.autoRotateSpeed=1.2;let S=0,E=!1;new YP().load(`/api/scan/model/${i}/${e}.obj`,y=>{if(E)return;y.traverse(F=>{const T=F;T.isMesh&&T.geometry.computeVertexNormals()});const N=F=>d2(y,F);t?new BT().load(`/api/scan/model/${i}/${e}.png`,F=>{F.colorSpace=Zn,N(new kf({map:F,roughness:.6}))},void 0,()=>N(new kf({color:11579576,roughness:.6}))):N(new kf({color:12632262,roughness:.65})),y.rotation.x=-Math.PI/2;const P=new Ho().setFromObject(y),C=P.getCenter(new ee),D=P.getSize(new ee);y.position.sub(C),c.add(y);const L=Math.max(D.x,D.y,D.z);d.position.set(L*1.6,L*.6,L*1.6),d.near=L/100,d.far=L*100,d.updateProjectionMatrix(),v.target.set(0,0,0),v.update()});const x=()=>{v.update(),h.render(c,d),S=requestAnimationFrame(x)};return x(),()=>{E=!0,cancelAnimationFrame(S),v.dispose(),h.dispose(),l.removeChild(h.domElement)}},[i,e,t,r]),M.jsx("div",{ref:a,style:{width:r,height:r},className:"rounded-lg border border-zinc-700 bg-zinc-950 [&>canvas]:rounded-lg"})}function d2(i,e){e.side=hr,i.traverse(t=>{t.isMesh&&(t.material=e)})}const Fr="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",h2="https://<PHONE-IP>:4444/video/m.jpeg",f2="https://<PHONE-IP>:4444/video/snapshot",p2={P:"Pawn",N:"Knight",B:"Bishop",R:"Rook",Q:"Queen",K:"King"};function m2(i){const e=i.match(/^([wb]?)([PNBRQK])$/i);if(!e)return null;const t=e[2].toUpperCase();return e[1]?e[1].toLowerCase()+t:t}function cd(i){const e=i.length===2?i[1]:i[0];let t="";return i.length===2&&(t=i[0]==="w"?"white ":"black "),t+(p2[e]??i)}function im(i,e){const t=m2(i.dir),r=e.find(a=>a.source_dir===i.dir)??(t?e.find(a=>a.piece.toLowerCase()===t.toLowerCase()&&!a.source_dir):void 0);return r?{stage:"done",piece:r.piece,variant:r.variant}:i.mesh?{stage:"mesh",piece:t,variant:null}:{stage:"mesh",piece:t,variant:null}}function g2(){const[i,e]=B.useState(h2),[t,r]=B.useState(f2),[a,l]=B.useState(2880),[c,d]=B.useState(2160),[h,f]=B.useState("pawn"),[m,g]=B.useState(.8),[v,S]=B.useState(80),[E,w]=B.useState(92),[x,y]=B.useState(null),[N,P]=B.useState(""),[C,D]=B.useState(null),L=B.useRef(null),F=B.useRef(null),[T,I]=B.useState(null),[G,H]=B.useState(""),[K,re]=B.useState("P"),[fe,O]=B.useState(null),[ce,Z]=B.useState("textured"),[q,ue]=B.useState(null),[he,k]=B.useState(null),[X,Fe]=B.useState(null),[je,Ge]=B.useState(""),[de,Se]=B.useState(!1),xe=B.useRef(null);B.useEffect(()=>(hn("/api/scan/status").then(ne=>{y(ne),ne.default_source&&e(ne.default_source),ne.default_capture&&r(ne.default_capture),ne.out&&f(ne.out)}).catch(()=>{}),()=>clearInterval(F.current)),[]);const te=()=>hn("/api/scan/status").then(y).catch(()=>{});function Ue(){clearInterval(F.current),F.current=setInterval(te,1e3)}async function tt(){P("");try{const ne=await gn("/api/scan/open",{source:i,width:a,height:c,capture:t});y(ne),Ue()}catch(ne){P("Connect failed: "+ne.message)}}async function Dt(){P("");try{const ne=await gn("/api/scan/close");y(ne),clearInterval(F.current)}catch(ne){P("Disconnect failed: "+ne.message)}}function ct(ne){const Me=L.current.getBoundingClientRect();return{x:ne.clientX-Me.left,y:ne.clientY-Me.top,r:Me}}function At(ne){if(!(x!=null&&x.open))return;ne.target.setPointerCapture(ne.pointerId);const{x:Me,y:ke}=ct(ne);D({x0:Me,y0:ke,x1:Me,y1:ke})}function Et(ne){if(!C)return;const{x:Me,y:ke}=ct(ne);D({...C,x1:Me,y1:ke})}async function _t(){if(!C||!x)return D(null);const ne=L.current.getBoundingClientRect(),[Me,ke]=x.frame_size,nt=Me/ne.width,st=ke/ne.height,j=Math.round(Math.min(C.x0,C.x1)*nt),Ne=Math.round(Math.min(C.y0,C.y1)*st),ye=Math.round(Math.max(C.x0,C.x1)*nt),De=Math.round(Math.max(C.y0,C.y1)*st);if(D(null),!(ye-j<10||De-Ne<10))try{y(await gn("/api/scan/config",{crop:[j,Ne,ye,De]}))}catch(Oe){P("Crop failed: "+Oe.message)}}async function Wt(){try{y(await gn("/api/scan/config",{crop:[]}))}catch(ne){P("Crop reset failed: "+ne.message)}}async function $t(){try{y(await gn("/api/scan/config",{interval:m,count:v,quality:E,out:h}))}catch(ne){P("Config failed: "+ne.message)}}async function Jt(){P("");try{await $t();const ne=await gn("/api/scan/start",{out:h});y(ne),Ue()}catch(ne){P("Capture start failed: "+ne.message)}}async function qt(){P("");try{y(await gn("/api/scan/stop"))}catch(ne){P("Capture stop failed: "+ne.message)}}const wt=()=>hn("/api/scan/models").then(ne=>{I(ne),!G&&ne.scans.length&&Gt(ne.scans[0],ne.pieces)}).catch(()=>{});function Gt(ne,Me=(T==null?void 0:T.pieces)??[]){H(ne.dir);const{piece:ke}=im(ne,Me);re(ke??"P")}async function Y(ne){if(confirm(`Delete scan "${ne}" (mesh will be removed)?`)){P("");try{await Gl(`/api/scan/scan/${ne}`),G===ne&&H(""),wt()}catch(Me){P("Delete failed: "+Me.message)}}}async function xn(ne,Me){if(confirm(`Delete prepared piece "${ne}/${Me}"? (Scan folder is kept.)`)){P("");try{await Gl(`/api/scan/piece/${ne}/${Me}`),O(null),wt()}catch(ke){P("Delete failed: "+ke.message)}}}async function Ct(){var ne;if(!(!he||!je)){Se(!0),P("");try{const Me=new FormData;Me.append("name",je),Me.append("mesh",he),X&&Me.append("texture",X);const ke=await fetch("/api/scan/upload",{method:"POST",body:Me});if(!ke.ok)throw new Error(((ne=await ke.json())==null?void 0:ne.detail)||`HTTP ${ke.status}`);await wt(),H(je),Ge(""),k(null),Fe(null)}catch(Me){P("Upload: "+Me.message)}Se(!1)}}const U=()=>hn("/api/scan/prepare/status").then(ne=>{O(ne),ne.state!=="running"&&(clearInterval(xe.current),wt())}).catch(()=>{});B.useEffect(()=>(wt(),hn("/api/scan/prepare/status").then(ne=>{ne.state==="running"&&(O(ne),xe.current=setInterval(U,2e3))}).catch(()=>{}),()=>{clearInterval(xe.current)}),[]);async function b(){P("");try{const ne=await gn("/api/scan/prepare",{dir:G,piece:K});O({state:"running",piece:K,variant:ne==null?void 0:ne.variant}),clearInterval(xe.current),xe.current=setInterval(U,2e3)}catch(ne){P("Prepare failed: "+ne.message)}}const J=x==null?void 0:x.recording,se=C&&{left:Math.min(C.x0,C.x1),top:Math.min(C.y0,C.y1),width:Math.abs(C.x1-C.x0),height:Math.abs(C.y1-C.y0)},ge=(T==null?void 0:T.scans)??[],Te=ge.find(ne=>ne.dir===G),Ae=Te?im(Te,(T==null?void 0:T.pieces)??[]):null,ve=Ae==null?void 0:Ae.stage,_e=(fe==null?void 0:fe.state)==="running",Ie=ve==="done"?2:1;let Xe;return _e?Xe="running…":ve==="done"?Xe="Re-prepare":Xe="Prepare",(Ae==null?void 0:Ae.stage)==="done"?Ae.piece:(fe==null?void 0:fe.state)==="done"&&fe.piece,M.jsxs("div",{className:"space-y-4",children:[M.jsx(vn,{children:M.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[M.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Live preview stream (MJPEG, …/video/m.jpeg) or USB index.",children:["Preview",M.jsx("input",{value:i,onChange:ne=>e(ne.target.value),className:`${Fr} w-96`,placeholder:"Stream URL (…/video/m.jpeg) or USB index (0/1)"})]}),M.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Photo to save per capture (snapshot URL, …/video/snapshot). Empty = use live frame.",children:["Photo",M.jsx("input",{value:t,onChange:ne=>r(ne.target.value),className:`${Fr} w-96`,placeholder:"Snapshot URL (…/video/snapshot), empty = live frame"})]}),M.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"For USB cam only: requested resolution (MJPG).",children:["USB Res",M.jsx("input",{type:"number",value:a,onChange:ne=>l(+ne.target.value),className:`${Fr} w-20`}),"×",M.jsx("input",{type:"number",value:c,onChange:ne=>d(+ne.target.value),className:`${Fr} w-20`})]}),x!=null&&x.open?M.jsxs(Zt,{onClick:Dt,children:[M.jsx(Ov,{className:"h-4 w-4"})," Disconnect"]}):M.jsxs(Zt,{variant:"primary",onClick:tt,children:[M.jsx(Ov,{className:"h-4 w-4"})," Connect"]}),M.jsxs("span",{className:"text-xs text-zinc-500",children:[N,x!=null&&x.error?` · ${x.error}`:""]})]})}),(x==null?void 0:x.open)&&M.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_320px]",children:[M.jsxs(vn,{title:"Live · Drag crop",children:[M.jsxs("div",{className:"relative inline-block select-none leading-none",children:[M.jsx("img",{ref:L,src:"/api/scan/preview.mjpg",alt:"Scan preview",draggable:!1,className:"w-full rounded-lg border border-zinc-800"}),M.jsx("div",{className:"absolute inset-0 cursor-crosshair",onPointerDown:At,onPointerMove:Et,onPointerUp:_t,children:se&&M.jsx("div",{className:"absolute border-2 border-sky-400 bg-sky-400/10",style:{left:se.left,top:se.top,width:se.width,height:se.height}})})]}),M.jsxs("div",{className:"mt-2 flex items-center gap-3 text-xs text-zinc-500",children:[M.jsxs("span",{children:["Source ",x.frame_size[0],"×",x.frame_size[1]]}),M.jsxs("span",{children:["Crop: ",x.crop?x.crop.join(", "):"—"]}),M.jsxs(Zt,{onClick:Wt,className:"px-2 py-1 text-xs",children:[M.jsx(iw,{className:"h-3 w-3"})," Reset crop"]})]})]}),M.jsx(vn,{title:"Capture",children:M.jsxs("div",{className:"space-y-3",children:[M.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",children:["Target folder",M.jsx("input",{value:h,onChange:ne=>f(ne.target.value),className:`${Fr} w-40`})]}),M.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",title:"Seconds between two photos. On phone ~0.8s is the limit (HTTPS fetch).",children:["Interval (s)",M.jsx("input",{type:"number",step:.1,min:0,value:m,onChange:ne=>g(+ne.target.value),className:`${Fr} w-24`})]}),M.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",title:"Photos per capture run. 0 = until stop.",children:["Count (0=∞)",M.jsx("input",{type:"number",min:0,value:v,onChange:ne=>S(+ne.target.value),className:`${Fr} w-24`})]}),M.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",children:["JPEG quality",M.jsx("input",{type:"number",min:50,max:100,value:E,onChange:ne=>w(+ne.target.value),className:`${Fr} w-24`})]}),M.jsxs("div",{className:"flex flex-wrap gap-2 pt-1",children:[J?M.jsxs(Zt,{onClick:qt,children:[M.jsx($_,{className:"h-4 w-4"})," Stop"]}):M.jsxs(Zt,{variant:"primary",onClick:Jt,children:[M.jsx(Mm,{className:"h-4 w-4"})," Start capture"]}),M.jsxs(Zt,{onClick:$t,title:"Apply interval/count/quality without capturing",children:[M.jsx(K1,{className:"h-4 w-4"})," Apply"]})]}),M.jsxs("div",{className:"rounded-lg bg-zinc-800 p-3 text-sm",children:[J?M.jsxs("span",{className:"font-medium text-green-500",children:["● Capture running — ",x.saved_run,x.count?` / ${x.count}`:""," photos"]}):M.jsx("span",{className:"text-zinc-400",children:"Ready"}),M.jsxs("div",{className:"mt-1 text-xs text-zinc-500",children:["In folder ",M.jsx("b",{className:"text-zinc-300",children:x.out||h}),": ",x.total," photos total (next no. ",x.index,")"]})]}),M.jsxs("p",{className:"text-xs text-zinc-500",children:["Motor on, phone/cam ",M.jsx("b",{children:"fixed"}),', hands off. "Start capture" appends to existing photos (for ring 2/3 simply reposition + start again).']})]})})]}),!(x!=null&&x.open)&&M.jsxs("p",{className:"text-xs text-zinc-500",children:["Connect a source (phone IP cam URL or USB index), drag the ",M.jsx("b",{children:"crop"})," around the piece + turntable (static background out), set ",M.jsx("b",{children:"interval"})," and ",M.jsx("b",{children:"count"})," and capture. Photos go to ",M.jsx("b",{children:"scans/<folder>"})," — ready for RealityScan."]}),M.jsxs(vn,{title:"Piece workshop — 3D scan → piece",children:[M.jsx("div",{className:"mb-4 flex items-center gap-1 text-xs",children:[[1,"Upload",q_],[2,"Prepare",kv]].map(([ne,Me,ke],nt)=>M.jsxs("div",{className:"flex items-center gap-1",children:[M.jsxs("div",{className:`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${Ie>=ne?"bg-sky-500/15 text-sky-300":"bg-zinc-800 text-zinc-500"}`,children:[M.jsx(ke,{className:"h-3.5 w-3.5"})," ",M.jsx("span",{children:Me})]}),nt<1&&M.jsx("div",{className:`h-px w-4 ${Ie>ne?"bg-sky-500/40":"bg-zinc-700"}`})]},ne))}),ge.length===0&&M.jsx("p",{className:"text-sm text-zinc-500",children:"No scans yet. Upload a 3D model (.obj/.glb) — it appears here as a card."}),M.jsx(v2,{uploadName:je,setUploadName:Ge,meshFile:he,setMeshFile:k,texFile:X,setTexFile:Fe,uploading:de,doUpload:Ct,input:Fr}),M.jsx(x2,{scans:ge,models:T,dir:G,selectScan:Gt,deleteScan:Y,prep:fe}),Te&&M.jsxs("div",{className:"mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4",children:[M.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[M.jsxs("div",{className:"flex items-center gap-2",children:[M.jsxs("div",{children:[M.jsx("div",{className:"text-sm font-medium text-zinc-100",children:Te.dir}),M.jsxs("div",{className:"text-xs text-zinc-500",children:[Te.mesh?"Mesh present":"no mesh yet",!Te.texture&&Te.mesh?" · ⚠ without texture":""]})]}),M.jsx("button",{onClick:()=>Y(Te.dir),title:"Delete scan",className:"rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400",children:M.jsx(Bo,{className:"h-4 w-4"})})]}),M.jsxs(Zt,{variant:"primary",onClick:b,disabled:_e,children:[_e?M.jsx(di,{className:"h-4 w-4 animate-spin"}):M.jsx(kv,{className:"h-4 w-4"}),Xe]})]}),M.jsx(y2,{cur:Te,busyPrep:_e,prep:fe}),N&&M.jsx("p",{className:"mt-2 text-sm text-red-400",children:N})]}),M.jsx(S2,{pieces:T==null?void 0:T.pieces,setView3d:ue,deletePiece:xn,prep:fe,kind:ce,setKind:Z})]}),q&&M.jsx(_2,{piece:q.piece,variant:q.variant,textured:ce==="textured",onClose:()=>ue(null)})]})}function v2({uploadName:i,setUploadName:e,meshFile:t,setMeshFile:r,texFile:a,setTexFile:l,uploading:c,doUpload:d,input:h}){return M.jsxs("div",{className:"mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3",children:[M.jsx("div",{className:"mb-2 text-xs font-medium text-zinc-400",children:"Upload 3D model (.obj/.glb)"}),M.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[M.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Name",M.jsx("input",{value:i,onChange:f=>e(f.target.value),placeholder:"e.g. wK",className:`${h} w-32`})]}),M.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Mesh (.obj/.glb)",M.jsx("input",{type:"file",accept:".obj,.glb,.gltf",onChange:f=>{var m;return r(((m=f.target.files)==null?void 0:m[0])??null)},className:"text-xs text-zinc-300 file:mr-1 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-0.5 file:text-xs file:text-zinc-200"})]}),M.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Texture (optional)",M.jsx("input",{type:"file",accept:".png,.jpg,.jpeg",onChange:f=>{var m;return l(((m=f.target.files)==null?void 0:m[0])??null)},className:"text-xs text-zinc-300 file:mr-1 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-0.5 file:text-xs file:text-zinc-200"})]}),M.jsxs(Zt,{variant:"primary",onClick:d,disabled:c||!t||!i,children:[c?M.jsx(di,{className:"h-4 w-4 animate-spin"}):M.jsx(q_,{className:"h-4 w-4"}),"Upload"]})]})]})}function x2({scans:i,models:e,dir:t,selectScan:r,deleteScan:a,prep:l}){return M.jsx("div",{className:"grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4",children:i.map(c=>{var S;const d=im(c,(e==null?void 0:e.pieces)??[]),h=c.dir===t,m=(l==null?void 0:l.state)==="running"&&l.dir===c.dir||((S=e==null?void 0:e.jobs)==null?void 0:S.prepare)===c.dir,g=m?["preparing…","bg-sky-500/20 text-sky-300"]:{mesh:["Mesh ready","bg-sky-500/15 text-sky-300"],done:["Ready","bg-green-500/15 text-green-300"]}[d.stage],v=d.piece&&d.stage==="done";return M.jsxs("div",{onClick:()=>r(c),role:"button",tabIndex:0,onKeyDown:E=>{(E.key==="Enter"||E.key===" ")&&(E.preventDefault(),r(c))},className:`group relative flex cursor-pointer flex-col rounded-xl border p-2 text-left transition ${h?"border-sky-500 bg-sky-500/5":"border-zinc-800 hover:border-zinc-600"}`,children:[M.jsxs("div",{className:"relative mb-1.5 aspect-square overflow-hidden rounded-lg bg-zinc-950",children:[v?M.jsx("img",{src:`/api/scan/prepare/preview/${d.piece}/${d.variant}?kind=textured`,alt:`${cd(d.piece)} preview`,className:"h-full w-full object-contain"}):M.jsx("div",{className:"grid h-full place-items-center text-zinc-700",children:M.jsx(Sm,{className:"h-8 w-8"})}),M.jsxs("span",{className:`absolute left-1 top-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${g[1]}`,children:[m&&M.jsx(di,{className:"h-3 w-3 animate-spin"}),g[0]]}),M.jsx("button",{onClick:E=>{E.stopPropagation(),a(c.dir)},title:"Delete scan folder",className:"absolute right-1 top-1 hidden rounded bg-zinc-900/80 p-1 text-zinc-400 hover:text-red-400 group-hover:block",children:M.jsx(Bo,{className:"h-3.5 w-3.5"})})]}),M.jsx("div",{className:"text-sm font-medium text-zinc-200",children:c.dir}),M.jsx("div",{className:"text-[11px] text-zinc-500",children:d.piece?`${cd(d.piece)}`:""})]},c.dir)})})}function _2({piece:i,variant:e,textured:t,onClose:r}){const[a,l]=B.useState(t);return B.useEffect(()=>{const c=d=>d.key==="Escape"&&r();return window.addEventListener("keydown",c),()=>window.removeEventListener("keydown",c)},[r]),M.jsx("div",{onClick:r,role:"button",tabIndex:0,onKeyDown:c=>{(c.key==="Enter"||c.key===" ")&&(c.preventDefault(),r())},className:"fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-6",children:M.jsxs("div",{onClick:c=>c.stopPropagation(),role:"presentation",onKeyDown:c=>c.stopPropagation(),className:"flex flex-col items-center gap-3",children:[M.jsx(u2,{piece:i,variant:e,textured:a,size:Math.min(720,window.innerHeight-160)}),M.jsxs("div",{className:"flex items-center gap-3 text-sm text-zinc-300",children:[M.jsxs("span",{className:"font-medium",children:[i,"/",e]}),M.jsx(Py,{value:a?"textured":"clay",onChange:c=>l(c==="textured")}),M.jsx("span",{className:"text-xs text-zinc-500",children:"drag to rotate · scroll to zoom · Esc to close"})]})]})})}function y2({cur:i,busyPrep:e,prep:t}){return M.jsxs(M.Fragment,{children:[e&&M.jsxs("div",{className:"flex items-center gap-2 rounded-lg bg-sky-500/10 p-3 text-sm text-sky-300",children:[M.jsx(di,{className:"h-4 w-4 animate-spin"})," Piece is being prepared — about 1-3 min…"]}),(t==null?void 0:t.state)==="failed"&&M.jsxs("div",{className:"rounded-lg bg-red-500/10 p-3 text-sm text-red-300",children:[M.jsxs("div",{className:"flex items-center gap-2",children:[M.jsx(Em,{className:"h-4 w-4"})," Preparation failed."]}),t.log_tail&&M.jsx("pre",{className:"mt-1 whitespace-pre-wrap text-xs text-red-400/70",children:t.log_tail})]})]})}function S2({pieces:i,setView3d:e,deletePiece:t,prep:r,kind:a,setKind:l}){return i!=null&&i.length?M.jsxs("div",{className:"mt-4 border-t border-zinc-800 pt-3",children:[M.jsx("div",{className:"mb-2 text-xs font-medium text-zinc-400",children:"Finished pieces (synth_pieces/)"}),M.jsx("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",children:i.map(c=>{var h,f;const d=(r==null?void 0:r.state)==="running"&&r.piece===c.piece&&r.variant===c.variant;return M.jsxs("div",{className:"relative rounded-xl border border-zinc-800 bg-zinc-900/50 p-2",children:[M.jsxs("div",{className:"relative mb-2 aspect-square overflow-hidden rounded-lg bg-zinc-950",children:[c.has_preview?M.jsx("img",{src:`/api/scan/prepare/preview/${c.piece}/${c.variant}?kind=${a}`,alt:`${cd(c.piece)}`,className:"h-full w-full object-contain"}):M.jsx("div",{className:"grid h-full place-items-center text-zinc-700",children:M.jsx(ew,{className:"h-8 w-8"})}),M.jsx("button",{onClick:()=>e({piece:c.piece,variant:c.variant}),title:"Open 3D view",className:"absolute right-1 top-1 rounded bg-zinc-900/80 p-1 text-zinc-400 hover:text-white",children:M.jsx(nw,{className:"h-3.5 w-3.5"})})]}),M.jsxs("div",{className:"flex items-center justify-between",children:[M.jsxs("span",{className:"text-sm font-medium text-zinc-200",children:[cd(c.piece)," · ",c.variant]}),d&&M.jsx(di,{className:"h-3.5 w-3.5 animate-spin text-sky-400"})]}),M.jsx(Py,{value:a,onChange:l,clayDisabled:!c.has_clay}),c.report&&M.jsx(M2,{piece:c.piece,variant:c.variant,report:c.report,level:(h=c.report)==null?void 0:h.level,messages:(f=c.report)==null?void 0:f.messages,onDelete:t})]},c.id)})})]}):null}function M2({piece:i,variant:e,report:t,level:r,messages:a,onDelete:l}){return!t||!t.tris?null:M.jsxs("div",{className:"mt-2 rounded-lg bg-zinc-800 p-2 text-[11px] text-zinc-400",children:[r&&M.jsxs("div",{className:`mb-1 flex items-center gap-1 font-medium ${r==="ok"?"text-green-400":"text-amber-400"}`,children:[r==="ok"?M.jsx(X_,{className:"h-4 w-4"}):M.jsx(Em,{className:"h-4 w-4"}),r==="ok"?"Quality OK":"Please check"]}),(a??[]).map((c,d)=>M.jsxs("div",{className:"text-amber-300/90",children:["• ",c]},d)),M.jsxs("div",{className:"grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pt-1",children:[M.jsx("span",{className:"text-zinc-500",children:"Triangles"}),M.jsx("span",{children:t.tris}),M.jsx("span",{className:"text-zinc-500",children:"open edges"}),M.jsx("span",{children:t.boundary_edges}),M.jsx("span",{className:"text-zinc-500",children:"Height/Base"}),M.jsx("span",{children:t.height_ratio})]}),M.jsxs("div",{className:"pt-1 text-zinc-500",children:["→ synth_pieces/",i,"/",e,".obj"]}),M.jsxs("button",{onClick:()=>l(i,e),className:"mt-1 flex items-center gap-1 text-red-400/80 hover:text-red-400",children:[M.jsx(Bo,{className:"h-3.5 w-3.5"})," Delete piece"]})]})}function Py({value:i,onChange:e,clayDisabled:t}){return M.jsxs("div",{className:"mt-2 flex overflow-hidden rounded-lg border border-zinc-700 text-xs",children:[M.jsx("button",{onClick:()=>e("textured"),className:`px-3 py-1 ${i==="textured"?"bg-sky-600 text-white":"text-zinc-400 hover:bg-zinc-700"}`,children:"Textured"}),M.jsx("button",{onClick:()=>e("clay"),disabled:t,title:t?"no clay image (piece prepared before this update)":"geometry only",className:`px-3 py-1 ${i==="clay"?"bg-sky-600 text-white":"text-zinc-400 hover:bg-zinc-700"} ${t?"cursor-not-allowed opacity-40":""}`,children:"Clay"})]})}const E2=[{to:"/collect",label:"Collect",icon:Sm},{to:"/scan",label:"Scan",icon:X1},{to:"/datasets",label:"Datasets",icon:Z1},{to:"/training",label:"Training",icon:q1}],w2=({isActive:i})=>`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${i?"bg-zinc-800 text-zinc-100":"text-zinc-400 hover:text-zinc-100"}`;function T2(){return M.jsx(P1,{children:M.jsxs("div",{className:"min-h-full",children:[M.jsx("header",{className:"sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur",children:M.jsxs("div",{className:"mx-auto flex max-w-7xl items-center gap-6 px-5 py-3",children:[M.jsxs("div",{className:"flex items-center gap-2 font-semibold tracking-tight",children:[M.jsx(Q1,{className:"h-5 w-5 text-sky-400"})," chesslab"]}),M.jsx("nav",{className:"flex flex-wrap gap-1",children:E2.map(i=>{const e=i.icon;return M.jsxs(fo,{to:i.to,className:w2,children:[M.jsx(e,{className:"h-4 w-4"})," ",i.label]},i.to)})})]})}),M.jsx("main",{className:"mx-auto max-w-7xl px-5 py-6",children:M.jsxs(s1,{children:[M.jsx($i,{path:"/",element:M.jsx(af,{to:"/collect",replace:!0})}),M.jsx($i,{path:"/collect",element:M.jsx(dw,{})}),M.jsx($i,{path:"/scan",element:M.jsx(g2,{})}),M.jsxs($i,{path:"/datasets",element:M.jsx(fw,{}),children:[M.jsx($i,{index:!0,element:M.jsx(af,{to:"sessions",replace:!0})}),M.jsx($i,{path:"sessions",element:M.jsx(pw,{})}),M.jsx($i,{path:"curated",element:M.jsx(mw,{})}),M.jsx($i,{path:"stats",element:M.jsx(gw,{})})]}),M.jsx($i,{path:"/training",element:M.jsx(vw,{})}),M.jsx($i,{path:"*",element:M.jsx(af,{to:"/collect",replace:!0})})]})})]})})}const b2=new jM({defaultOptions:{queries:{staleTime:0,refetchOnWindowFocus:!0,refetchOnMount:"always",retry:1}}});_M.createRoot(document.getElementById("root")).render(M.jsx(fM.StrictMode,{children:M.jsx(XM,{client:b2,children:M.jsx(T2,{})})}));
