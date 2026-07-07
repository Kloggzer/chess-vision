var ux=i=>{throw TypeError(i)};var Zh=(i,e,t)=>e.has(i)||ux("Cannot "+t);var G=(i,e,t)=>(Zh(i,e,"read from private field"),t?t.call(i):e.get(i)),rt=(i,e,t)=>e.has(i)?ux("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(i):e.set(i,t),ze=(i,e,t,r)=>(Zh(i,e,"write to private field"),r?r.call(i,t):e.set(i,t),t),gt=(i,e,t)=>(Zh(i,e,"access private method"),t);var lu=(i,e,t,r)=>({set _(a){ze(i,e,a,t)},get _(){return G(i,e,r)}});(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))r(a);new MutationObserver(a=>{for(const l of a)if(l.type==="childList")for(const c of l.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&r(c)}).observe(document,{childList:!0,subtree:!0});function t(a){const l={};return a.integrity&&(l.integrity=a.integrity),a.referrerPolicy&&(l.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?l.credentials="include":a.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function r(a){if(a.ep)return;a.ep=!0;const l=t(a);fetch(a.href,l)}})();function fM(i){return i&&i.__esModule&&Object.prototype.hasOwnProperty.call(i,"default")?i.default:i}var Jh={exports:{}},wl={},ef={exports:{}},Mt={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var dx;function pM(){if(dx)return Mt;dx=1;var i=Symbol.for("react.element"),e=Symbol.for("react.portal"),t=Symbol.for("react.fragment"),r=Symbol.for("react.strict_mode"),a=Symbol.for("react.profiler"),l=Symbol.for("react.provider"),c=Symbol.for("react.context"),d=Symbol.for("react.forward_ref"),h=Symbol.for("react.suspense"),f=Symbol.for("react.memo"),m=Symbol.for("react.lazy"),g=Symbol.iterator;function x(z){return z===null||typeof z!="object"?null:(z=g&&z[g]||z["@@iterator"],typeof z=="function"?z:null)}var M={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},E=Object.assign,w={};function _(z,q,Ie){this.props=z,this.context=q,this.refs=w,this.updater=Ie||M}_.prototype.isReactComponent={},_.prototype.setState=function(z,q){if(typeof z!="object"&&typeof z!="function"&&z!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,z,q,"setState")},_.prototype.forceUpdate=function(z){this.updater.enqueueForceUpdate(this,z,"forceUpdate")};function y(){}y.prototype=_.prototype;function L(z,q,Ie){this.props=z,this.context=q,this.refs=w,this.updater=Ie||M}var P=L.prototype=new y;P.constructor=L,E(P,_.prototype),P.isPureReactComponent=!0;var T=Array.isArray,U=Object.prototype.hasOwnProperty,N={current:null},O={key:!0,ref:!0,__self:!0,__source:!0};function b(z,q,Ie){var Be,Ge={},ce=null,ye=null;if(q!=null)for(Be in q.ref!==void 0&&(ye=q.ref),q.key!==void 0&&(ce=""+q.key),q)U.call(q,Be)&&!O.hasOwnProperty(Be)&&(Ge[Be]=q[Be]);var ge=arguments.length-2;if(ge===1)Ge.children=Ie;else if(1<ge){for(var Ue=Array(ge),Ze=0;Ze<ge;Ze++)Ue[Ze]=arguments[Ze+2];Ge.children=Ue}if(z&&z.defaultProps)for(Be in ge=z.defaultProps,ge)Ge[Be]===void 0&&(Ge[Be]=ge[Be]);return{$$typeof:i,type:z,key:ce,ref:ye,props:Ge,_owner:N.current}}function I(z,q){return{$$typeof:i,type:z.type,key:q,ref:z.ref,props:z.props,_owner:z._owner}}function W(z){return typeof z=="object"&&z!==null&&z.$$typeof===i}function V(z){var q={"=":"=0",":":"=2"};return"$"+z.replace(/[=:]/g,function(Ie){return q[Ie]})}var J=/\/+/g;function se(z,q){return typeof z=="object"&&z!==null&&z.key!=null?V(""+z.key):q.toString(36)}function j(z,q,Ie,Be,Ge){var ce=typeof z;(ce==="undefined"||ce==="boolean")&&(z=null);var ye=!1;if(z===null)ye=!0;else switch(ce){case"string":case"number":ye=!0;break;case"object":switch(z.$$typeof){case i:case e:ye=!0}}if(ye)return ye=z,Ge=Ge(ye),z=Be===""?"."+se(ye,0):Be,T(Ge)?(Ie="",z!=null&&(Ie=z.replace(J,"$&/")+"/"),j(Ge,q,Ie,"",function(Ze){return Ze})):Ge!=null&&(W(Ge)&&(Ge=I(Ge,Ie+(!Ge.key||ye&&ye.key===Ge.key?"":(""+Ge.key).replace(J,"$&/")+"/")+z)),q.push(Ge)),1;if(ye=0,Be=Be===""?".":Be+":",T(z))for(var ge=0;ge<z.length;ge++){ce=z[ge];var Ue=Be+se(ce,ge);ye+=j(ce,q,Ie,Ue,Ge)}else if(Ue=x(z),typeof Ue=="function")for(z=Ue.call(z),ge=0;!(ce=z.next()).done;)ce=ce.value,Ue=Be+se(ce,ge++),ye+=j(ce,q,Ie,Ue,Ge);else if(ce==="object")throw q=String(z),Error("Objects are not valid as a React child (found: "+(q==="[object Object]"?"object with keys {"+Object.keys(z).join(", ")+"}":q)+"). If you meant to render a collection of children, use an array instead.");return ye}function k(z,q,Ie){if(z==null)return z;var Be=[],Ge=0;return j(z,Be,"","",function(ce){return q.call(Ie,ce,Ge++)}),Be}function oe(z){if(z._status===-1){var q=z._result;q=q(),q.then(function(Ie){(z._status===0||z._status===-1)&&(z._status=1,z._result=Ie)},function(Ie){(z._status===0||z._status===-1)&&(z._status=2,z._result=Ie)}),z._status===-1&&(z._status=0,z._result=q)}if(z._status===1)return z._result.default;throw z._result}var te={current:null},K={transition:null},he={ReactCurrentDispatcher:te,ReactCurrentBatchConfig:K,ReactCurrentOwner:N};function de(){throw Error("act(...) is not supported in production builds of React.")}return Mt.Children={map:k,forEach:function(z,q,Ie){k(z,function(){q.apply(this,arguments)},Ie)},count:function(z){var q=0;return k(z,function(){q++}),q},toArray:function(z){return k(z,function(q){return q})||[]},only:function(z){if(!W(z))throw Error("React.Children.only expected to receive a single React element child.");return z}},Mt.Component=_,Mt.Fragment=t,Mt.Profiler=a,Mt.PureComponent=L,Mt.StrictMode=r,Mt.Suspense=h,Mt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=he,Mt.act=de,Mt.cloneElement=function(z,q,Ie){if(z==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+z+".");var Be=E({},z.props),Ge=z.key,ce=z.ref,ye=z._owner;if(q!=null){if(q.ref!==void 0&&(ce=q.ref,ye=N.current),q.key!==void 0&&(Ge=""+q.key),z.type&&z.type.defaultProps)var ge=z.type.defaultProps;for(Ue in q)U.call(q,Ue)&&!O.hasOwnProperty(Ue)&&(Be[Ue]=q[Ue]===void 0&&ge!==void 0?ge[Ue]:q[Ue])}var Ue=arguments.length-2;if(Ue===1)Be.children=Ie;else if(1<Ue){ge=Array(Ue);for(var Ze=0;Ze<Ue;Ze++)ge[Ze]=arguments[Ze+2];Be.children=ge}return{$$typeof:i,type:z.type,key:Ge,ref:ce,props:Be,_owner:ye}},Mt.createContext=function(z){return z={$$typeof:c,_currentValue:z,_currentValue2:z,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},z.Provider={$$typeof:l,_context:z},z.Consumer=z},Mt.createElement=b,Mt.createFactory=function(z){var q=b.bind(null,z);return q.type=z,q},Mt.createRef=function(){return{current:null}},Mt.forwardRef=function(z){return{$$typeof:d,render:z}},Mt.isValidElement=W,Mt.lazy=function(z){return{$$typeof:m,_payload:{_status:-1,_result:z},_init:oe}},Mt.memo=function(z,q){return{$$typeof:f,type:z,compare:q===void 0?null:q}},Mt.startTransition=function(z){var q=K.transition;K.transition={};try{z()}finally{K.transition=q}},Mt.unstable_act=de,Mt.useCallback=function(z,q){return te.current.useCallback(z,q)},Mt.useContext=function(z){return te.current.useContext(z)},Mt.useDebugValue=function(){},Mt.useDeferredValue=function(z){return te.current.useDeferredValue(z)},Mt.useEffect=function(z,q){return te.current.useEffect(z,q)},Mt.useId=function(){return te.current.useId()},Mt.useImperativeHandle=function(z,q,Ie){return te.current.useImperativeHandle(z,q,Ie)},Mt.useInsertionEffect=function(z,q){return te.current.useInsertionEffect(z,q)},Mt.useLayoutEffect=function(z,q){return te.current.useLayoutEffect(z,q)},Mt.useMemo=function(z,q){return te.current.useMemo(z,q)},Mt.useReducer=function(z,q,Ie){return te.current.useReducer(z,q,Ie)},Mt.useRef=function(z){return te.current.useRef(z)},Mt.useState=function(z){return te.current.useState(z)},Mt.useSyncExternalStore=function(z,q,Ie){return te.current.useSyncExternalStore(z,q,Ie)},Mt.useTransition=function(){return te.current.useTransition()},Mt.version="18.3.1",Mt}var hx;function am(){return hx||(hx=1,ef.exports=pM()),ef.exports}/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var fx;function mM(){if(fx)return wl;fx=1;var i=am(),e=Symbol.for("react.element"),t=Symbol.for("react.fragment"),r=Object.prototype.hasOwnProperty,a=i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,l={key:!0,ref:!0,__self:!0,__source:!0};function c(d,h,f){var m,g={},x=null,M=null;f!==void 0&&(x=""+f),h.key!==void 0&&(x=""+h.key),h.ref!==void 0&&(M=h.ref);for(m in h)r.call(h,m)&&!l.hasOwnProperty(m)&&(g[m]=h[m]);if(d&&d.defaultProps)for(m in h=d.defaultProps,h)g[m]===void 0&&(g[m]=h[m]);return{$$typeof:e,type:d,key:x,ref:M,props:g,_owner:a.current}}return wl.Fragment=t,wl.jsx=c,wl.jsxs=c,wl}var px;function gM(){return px||(px=1,Jh.exports=mM()),Jh.exports}var v=gM(),H=am();const xM=fM(H);var cu={},tf={exports:{}},oi={},nf={exports:{}},rf={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var mx;function vM(){return mx||(mx=1,(function(i){function e(K,he){var de=K.length;K.push(he);e:for(;0<de;){var z=de-1>>>1,q=K[z];if(0<a(q,he))K[z]=he,K[de]=q,de=z;else break e}}function t(K){return K.length===0?null:K[0]}function r(K){if(K.length===0)return null;var he=K[0],de=K.pop();if(de!==he){K[0]=de;e:for(var z=0,q=K.length,Ie=q>>>1;z<Ie;){var Be=2*(z+1)-1,Ge=K[Be],ce=Be+1,ye=K[ce];if(0>a(Ge,de))ce<q&&0>a(ye,Ge)?(K[z]=ye,K[ce]=de,z=ce):(K[z]=Ge,K[Be]=de,z=Be);else if(ce<q&&0>a(ye,de))K[z]=ye,K[ce]=de,z=ce;else break e}}return he}function a(K,he){var de=K.sortIndex-he.sortIndex;return de!==0?de:K.id-he.id}if(typeof performance=="object"&&typeof performance.now=="function"){var l=performance;i.unstable_now=function(){return l.now()}}else{var c=Date,d=c.now();i.unstable_now=function(){return c.now()-d}}var h=[],f=[],m=1,g=null,x=3,M=!1,E=!1,w=!1,_=typeof setTimeout=="function"?setTimeout:null,y=typeof clearTimeout=="function"?clearTimeout:null,L=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function P(K){for(var he=t(f);he!==null;){if(he.callback===null)r(f);else if(he.startTime<=K)r(f),he.sortIndex=he.expirationTime,e(h,he);else break;he=t(f)}}function T(K){if(w=!1,P(K),!E)if(t(h)!==null)E=!0,oe(U);else{var he=t(f);he!==null&&te(T,he.startTime-K)}}function U(K,he){E=!1,w&&(w=!1,y(b),b=-1),M=!0;var de=x;try{for(P(he),g=t(h);g!==null&&(!(g.expirationTime>he)||K&&!V());){var z=g.callback;if(typeof z=="function"){g.callback=null,x=g.priorityLevel;var q=z(g.expirationTime<=he);he=i.unstable_now(),typeof q=="function"?g.callback=q:g===t(h)&&r(h),P(he)}else r(h);g=t(h)}if(g!==null)var Ie=!0;else{var Be=t(f);Be!==null&&te(T,Be.startTime-he),Ie=!1}return Ie}finally{g=null,x=de,M=!1}}var N=!1,O=null,b=-1,I=5,W=-1;function V(){return!(i.unstable_now()-W<I)}function J(){if(O!==null){var K=i.unstable_now();W=K;var he=!0;try{he=O(!0,K)}finally{he?se():(N=!1,O=null)}}else N=!1}var se;if(typeof L=="function")se=function(){L(J)};else if(typeof MessageChannel<"u"){var j=new MessageChannel,k=j.port2;j.port1.onmessage=J,se=function(){k.postMessage(null)}}else se=function(){_(J,0)};function oe(K){O=K,N||(N=!0,se())}function te(K,he){b=_(function(){K(i.unstable_now())},he)}i.unstable_IdlePriority=5,i.unstable_ImmediatePriority=1,i.unstable_LowPriority=4,i.unstable_NormalPriority=3,i.unstable_Profiling=null,i.unstable_UserBlockingPriority=2,i.unstable_cancelCallback=function(K){K.callback=null},i.unstable_continueExecution=function(){E||M||(E=!0,oe(U))},i.unstable_forceFrameRate=function(K){0>K||125<K?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):I=0<K?Math.floor(1e3/K):5},i.unstable_getCurrentPriorityLevel=function(){return x},i.unstable_getFirstCallbackNode=function(){return t(h)},i.unstable_next=function(K){switch(x){case 1:case 2:case 3:var he=3;break;default:he=x}var de=x;x=he;try{return K()}finally{x=de}},i.unstable_pauseExecution=function(){},i.unstable_requestPaint=function(){},i.unstable_runWithPriority=function(K,he){switch(K){case 1:case 2:case 3:case 4:case 5:break;default:K=3}var de=x;x=K;try{return he()}finally{x=de}},i.unstable_scheduleCallback=function(K,he,de){var z=i.unstable_now();switch(typeof de=="object"&&de!==null?(de=de.delay,de=typeof de=="number"&&0<de?z+de:z):de=z,K){case 1:var q=-1;break;case 2:q=250;break;case 5:q=1073741823;break;case 4:q=1e4;break;default:q=5e3}return q=de+q,K={id:m++,callback:he,priorityLevel:K,startTime:de,expirationTime:q,sortIndex:-1},de>z?(K.sortIndex=de,e(f,K),t(h)===null&&K===t(f)&&(w?(y(b),b=-1):w=!0,te(T,de-z))):(K.sortIndex=q,e(h,K),E||M||(E=!0,oe(U))),K},i.unstable_shouldYield=V,i.unstable_wrapCallback=function(K){var he=x;return function(){var de=x;x=he;try{return K.apply(this,arguments)}finally{x=de}}}})(rf)),rf}var gx;function _M(){return gx||(gx=1,nf.exports=vM()),nf.exports}/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var xx;function yM(){if(xx)return oi;xx=1;var i=am(),e=_M();function t(n){for(var s="https://reactjs.org/docs/error-decoder.html?invariant="+n,o=1;o<arguments.length;o++)s+="&args[]="+encodeURIComponent(arguments[o]);return"Minified React error #"+n+"; visit "+s+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var r=new Set,a={};function l(n,s){c(n,s),c(n+"Capture",s)}function c(n,s){for(a[n]=s,n=0;n<s.length;n++)r.add(s[n])}var d=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),h=Object.prototype.hasOwnProperty,f=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,m={},g={};function x(n){return h.call(g,n)?!0:h.call(m,n)?!1:f.test(n)?g[n]=!0:(m[n]=!0,!1)}function M(n,s,o,u){if(o!==null&&o.type===0)return!1;switch(typeof s){case"function":case"symbol":return!0;case"boolean":return u?!1:o!==null?!o.acceptsBooleans:(n=n.toLowerCase().slice(0,5),n!=="data-"&&n!=="aria-");default:return!1}}function E(n,s,o,u){if(s===null||typeof s>"u"||M(n,s,o,u))return!0;if(u)return!1;if(o!==null)switch(o.type){case 3:return!s;case 4:return s===!1;case 5:return isNaN(s);case 6:return isNaN(s)||1>s}return!1}function w(n,s,o,u,p,S,R){this.acceptsBooleans=s===2||s===3||s===4,this.attributeName=u,this.attributeNamespace=p,this.mustUseProperty=o,this.propertyName=n,this.type=s,this.sanitizeURL=S,this.removeEmptyString=R}var _={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(n){_[n]=new w(n,0,!1,n,null,!1,!1)}),[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(n){var s=n[0];_[s]=new w(s,1,!1,n[1],null,!1,!1)}),["contentEditable","draggable","spellCheck","value"].forEach(function(n){_[n]=new w(n,2,!1,n.toLowerCase(),null,!1,!1)}),["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(n){_[n]=new w(n,2,!1,n,null,!1,!1)}),"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(n){_[n]=new w(n,3,!1,n.toLowerCase(),null,!1,!1)}),["checked","multiple","muted","selected"].forEach(function(n){_[n]=new w(n,3,!0,n,null,!1,!1)}),["capture","download"].forEach(function(n){_[n]=new w(n,4,!1,n,null,!1,!1)}),["cols","rows","size","span"].forEach(function(n){_[n]=new w(n,6,!1,n,null,!1,!1)}),["rowSpan","start"].forEach(function(n){_[n]=new w(n,5,!1,n.toLowerCase(),null,!1,!1)});var y=/[\-:]([a-z])/g;function L(n){return n[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(n){var s=n.replace(y,L);_[s]=new w(s,1,!1,n,null,!1,!1)}),"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(n){var s=n.replace(y,L);_[s]=new w(s,1,!1,n,"http://www.w3.org/1999/xlink",!1,!1)}),["xml:base","xml:lang","xml:space"].forEach(function(n){var s=n.replace(y,L);_[s]=new w(s,1,!1,n,"http://www.w3.org/XML/1998/namespace",!1,!1)}),["tabIndex","crossOrigin"].forEach(function(n){_[n]=new w(n,1,!1,n.toLowerCase(),null,!1,!1)}),_.xlinkHref=new w("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1),["src","href","action","formAction"].forEach(function(n){_[n]=new w(n,1,!1,n.toLowerCase(),null,!0,!0)});function P(n,s,o,u){var p=_.hasOwnProperty(s)?_[s]:null;(p!==null?p.type!==0:u||!(2<s.length)||s[0]!=="o"&&s[0]!=="O"||s[1]!=="n"&&s[1]!=="N")&&(E(s,o,p,u)&&(o=null),u||p===null?x(s)&&(o===null?n.removeAttribute(s):n.setAttribute(s,""+o)):p.mustUseProperty?n[p.propertyName]=o===null?p.type===3?!1:"":o:(s=p.attributeName,u=p.attributeNamespace,o===null?n.removeAttribute(s):(p=p.type,o=p===3||p===4&&o===!0?"":""+o,u?n.setAttributeNS(u,s,o):n.setAttribute(s,o))))}var T=i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,U=Symbol.for("react.element"),N=Symbol.for("react.portal"),O=Symbol.for("react.fragment"),b=Symbol.for("react.strict_mode"),I=Symbol.for("react.profiler"),W=Symbol.for("react.provider"),V=Symbol.for("react.context"),J=Symbol.for("react.forward_ref"),se=Symbol.for("react.suspense"),j=Symbol.for("react.suspense_list"),k=Symbol.for("react.memo"),oe=Symbol.for("react.lazy"),te=Symbol.for("react.offscreen"),K=Symbol.iterator;function he(n){return n===null||typeof n!="object"?null:(n=K&&n[K]||n["@@iterator"],typeof n=="function"?n:null)}var de=Object.assign,z;function q(n){if(z===void 0)try{throw Error()}catch(o){var s=o.stack.trim().match(/\n( *(at )?)/);z=s&&s[1]||""}return`
`+z+n}var Ie=!1;function Be(n,s){if(!n||Ie)return"";Ie=!0;var o=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(s)if(s=function(){throw Error()},Object.defineProperty(s.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(s,[])}catch(pe){var u=pe}Reflect.construct(n,[],s)}else{try{s.call()}catch(pe){u=pe}n.call(s.prototype)}else{try{throw Error()}catch(pe){u=pe}n()}}catch(pe){if(pe&&u&&typeof pe.stack=="string"){for(var p=pe.stack.split(`
`),S=u.stack.split(`
`),R=p.length-1,B=S.length-1;1<=R&&0<=B&&p[R]!==S[B];)B--;for(;1<=R&&0<=B;R--,B--)if(p[R]!==S[B]){if(R!==1||B!==1)do if(R--,B--,0>B||p[R]!==S[B]){var X=`
`+p[R].replace(" at new "," at ");return n.displayName&&X.includes("<anonymous>")&&(X=X.replace("<anonymous>",n.displayName)),X}while(1<=R&&0<=B);break}}}finally{Ie=!1,Error.prepareStackTrace=o}return(n=n?n.displayName||n.name:"")?q(n):""}function Ge(n){switch(n.tag){case 5:return q(n.type);case 16:return q("Lazy");case 13:return q("Suspense");case 19:return q("SuspenseList");case 0:case 2:case 15:return n=Be(n.type,!1),n;case 11:return n=Be(n.type.render,!1),n;case 1:return n=Be(n.type,!0),n;default:return""}}function ce(n){if(n==null)return null;if(typeof n=="function")return n.displayName||n.name||null;if(typeof n=="string")return n;switch(n){case O:return"Fragment";case N:return"Portal";case I:return"Profiler";case b:return"StrictMode";case se:return"Suspense";case j:return"SuspenseList"}if(typeof n=="object")switch(n.$$typeof){case V:return(n.displayName||"Context")+".Consumer";case W:return(n._context.displayName||"Context")+".Provider";case J:var s=n.render;return n=n.displayName,n||(n=s.displayName||s.name||"",n=n!==""?"ForwardRef("+n+")":"ForwardRef"),n;case k:return s=n.displayName||null,s!==null?s:ce(n.type)||"Memo";case oe:s=n._payload,n=n._init;try{return ce(n(s))}catch{}}return null}function ye(n){var s=n.type;switch(n.tag){case 24:return"Cache";case 9:return(s.displayName||"Context")+".Consumer";case 10:return(s._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return n=s.render,n=n.displayName||n.name||"",s.displayName||(n!==""?"ForwardRef("+n+")":"ForwardRef");case 7:return"Fragment";case 5:return s;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return ce(s);case 8:return s===b?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof s=="function")return s.displayName||s.name||null;if(typeof s=="string")return s}return null}function ge(n){switch(typeof n){case"boolean":case"number":case"string":case"undefined":return n;case"object":return n;default:return""}}function Ue(n){var s=n.type;return(n=n.nodeName)&&n.toLowerCase()==="input"&&(s==="checkbox"||s==="radio")}function Ze(n){var s=Ue(n)?"checked":"value",o=Object.getOwnPropertyDescriptor(n.constructor.prototype,s),u=""+n[s];if(!n.hasOwnProperty(s)&&typeof o<"u"&&typeof o.get=="function"&&typeof o.set=="function"){var p=o.get,S=o.set;return Object.defineProperty(n,s,{configurable:!0,get:function(){return p.call(this)},set:function(R){u=""+R,S.call(this,R)}}),Object.defineProperty(n,s,{enumerable:o.enumerable}),{getValue:function(){return u},setValue:function(R){u=""+R},stopTracking:function(){n._valueTracker=null,delete n[s]}}}}function tt(n){n._valueTracker||(n._valueTracker=Ze(n))}function Gt(n){if(!n)return!1;var s=n._valueTracker;if(!s)return!0;var o=s.getValue(),u="";return n&&(u=Ue(n)?n.checked?"true":"false":n.value),n=u,n!==o?(s.setValue(n),!0):!1}function ut(n){if(n=n||(typeof document<"u"?document:void 0),typeof n>"u")return null;try{return n.activeElement||n.body}catch{return n.body}}function Ct(n,s){var o=s.checked;return de({},s,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:o??n._wrapperState.initialChecked})}function mt(n,s){var o=s.defaultValue==null?"":s.defaultValue,u=s.checked!=null?s.checked:s.defaultChecked;o=ge(s.value!=null?s.value:o),n._wrapperState={initialChecked:u,initialValue:o,controlled:s.type==="checkbox"||s.type==="radio"?s.checked!=null:s.value!=null}}function vt(n,s){s=s.checked,s!=null&&P(n,"checked",s,!1)}function kt(n,s){vt(n,s);var o=ge(s.value),u=s.type;if(o!=null)u==="number"?(o===0&&n.value===""||n.value!=o)&&(n.value=""+o):n.value!==""+o&&(n.value=""+o);else if(u==="submit"||u==="reset"){n.removeAttribute("value");return}s.hasOwnProperty("value")?qt(n,s.type,o):s.hasOwnProperty("defaultValue")&&qt(n,s.type,ge(s.defaultValue)),s.checked==null&&s.defaultChecked!=null&&(n.defaultChecked=!!s.defaultChecked)}function Xt(n,s,o){if(s.hasOwnProperty("value")||s.hasOwnProperty("defaultValue")){var u=s.type;if(!(u!=="submit"&&u!=="reset"||s.value!==void 0&&s.value!==null))return;s=""+n._wrapperState.initialValue,o||s===n.value||(n.value=s),n.defaultValue=s}o=n.name,o!==""&&(n.name=""),n.defaultChecked=!!n._wrapperState.initialChecked,o!==""&&(n.name=o)}function qt(n,s,o){(s!=="number"||ut(n.ownerDocument)!==n)&&(o==null?n.defaultValue=""+n._wrapperState.initialValue:n.defaultValue!==""+o&&(n.defaultValue=""+o))}var $t=Array.isArray;function Et(n,s,o,u){if(n=n.options,s){s={};for(var p=0;p<o.length;p++)s["$"+o[p]]=!0;for(o=0;o<n.length;o++)p=s.hasOwnProperty("$"+n[o].value),n[o].selected!==p&&(n[o].selected=p),p&&u&&(n[o].defaultSelected=!0)}else{for(o=""+ge(o),s=null,p=0;p<n.length;p++){if(n[p].value===o){n[p].selected=!0,u&&(n[p].defaultSelected=!0);return}s!==null||n[p].disabled||(s=n[p])}s!==null&&(s.selected=!0)}}function zt(n,s){if(s.dangerouslySetInnerHTML!=null)throw Error(t(91));return de({},s,{value:void 0,defaultValue:void 0,children:""+n._wrapperState.initialValue})}function Y(n,s){var o=s.value;if(o==null){if(o=s.children,s=s.defaultValue,o!=null){if(s!=null)throw Error(t(92));if($t(o)){if(1<o.length)throw Error(t(93));o=o[0]}s=o}s==null&&(s=""),o=s}n._wrapperState={initialValue:ge(o)}}function pn(n,s){var o=ge(s.value),u=ge(s.defaultValue);o!=null&&(o=""+o,o!==n.value&&(n.value=o),s.defaultValue==null&&n.defaultValue!==o&&(n.defaultValue=o)),u!=null&&(n.defaultValue=""+u)}function wt(n){var s=n.textContent;s===n._wrapperState.initialValue&&s!==""&&s!==null&&(n.value=s)}function F(n){switch(n){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function C(n,s){return n==null||n==="http://www.w3.org/1999/xhtml"?F(s):n==="http://www.w3.org/2000/svg"&&s==="foreignObject"?"http://www.w3.org/1999/xhtml":n}var D,Z=(function(n){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(s,o,u,p){MSApp.execUnsafeLocalFunction(function(){return n(s,o,u,p)})}:n})(function(n,s){if(n.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in n)n.innerHTML=s;else{for(D=D||document.createElement("div"),D.innerHTML="<svg>"+s.valueOf().toString()+"</svg>",s=D.firstChild;n.firstChild;)n.removeChild(n.firstChild);for(;s.firstChild;)n.appendChild(s.firstChild)}});function me(n,s){if(s){var o=n.firstChild;if(o&&o===n.lastChild&&o.nodeType===3){o.nodeValue=s;return}}n.textContent=s}var Ee={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},Re=["Webkit","ms","Moz","O"];Object.keys(Ee).forEach(function(n){Re.forEach(function(s){s=s+n.charAt(0).toUpperCase()+n.substring(1),Ee[s]=Ee[n]})});function xe(n,s,o){return s==null||typeof s=="boolean"||s===""?"":o||typeof s!="number"||s===0||Ee.hasOwnProperty(n)&&Ee[n]?(""+s).trim():s+"px"}function ve(n,s){n=n.style;for(var o in s)if(s.hasOwnProperty(o)){var u=o.indexOf("--")===0,p=xe(o,s[o],u);o==="float"&&(o="cssFloat"),u?n.setProperty(o,p):n[o]=p}}var De=de({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function We(n,s){if(s){if(De[n]&&(s.children!=null||s.dangerouslySetInnerHTML!=null))throw Error(t(137,n));if(s.dangerouslySetInnerHTML!=null){if(s.children!=null)throw Error(t(60));if(typeof s.dangerouslySetInnerHTML!="object"||!("__html"in s.dangerouslySetInnerHTML))throw Error(t(61))}if(s.style!=null&&typeof s.style!="object")throw Error(t(62))}}function ie(n,s){if(n.indexOf("-")===-1)return typeof s.is=="string";switch(n){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Se=null;function Oe(n){return n=n.target||n.srcElement||window,n.correspondingUseElement&&(n=n.correspondingUseElement),n.nodeType===3?n.parentNode:n}var nt=null,st=null,$=null;function Pe(n){if(n=cl(n)){if(typeof nt!="function")throw Error(t(280));var s=n.stateNode;s&&(s=Ec(s),nt(n.stateNode,n.type,s))}}function _e(n){st?$?$.push(n):$=[n]:st=n}function Le(){if(st){var n=st,s=$;if($=st=null,Pe(n),s)for(n=0;n<s.length;n++)Pe(s[n])}}function Fe(n,s){return n(s)}function Me(){}var Ye=!1;function $e(n,s,o){if(Ye)return n(s,o);Ye=!0;try{return Fe(n,s,o)}finally{Ye=!1,(st!==null||$!==null)&&(Me(),Le())}}function jt(n,s){var o=n.stateNode;if(o===null)return null;var u=Ec(o);if(u===null)return null;o=u[s];e:switch(s){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(u=!u.disabled)||(n=n.type,u=!(n==="button"||n==="input"||n==="select"||n==="textarea")),n=!u;break e;default:n=!1}if(n)return null;if(o&&typeof o!="function")throw Error(t(231,s,typeof o));return o}var Ut=!1;if(d)try{var On={};Object.defineProperty(On,"passive",{get:function(){Ut=!0}}),window.addEventListener("test",On,On),window.removeEventListener("test",On,On)}catch{Ut=!1}function wi(n,s,o,u,p,S,R,B,X){var pe=Array.prototype.slice.call(arguments,3);try{s.apply(o,pe)}catch(be){this.onError(be)}}var zs=!1,Ca=null,Bs=!1,Hs=null,Sd={onError:function(n){zs=!0,Ca=n}};function sc(n,s,o,u,p,S,R,B,X){zs=!1,Ca=null,wi.apply(Sd,arguments)}function ac(n,s,o,u,p,S,R,B,X){if(sc.apply(this,arguments),zs){if(zs){var pe=Ca;zs=!1,Ca=null}else throw Error(t(198));Bs||(Bs=!0,Hs=pe)}}function $n(n){var s=n,o=n;if(n.alternate)for(;s.return;)s=s.return;else{n=s;do s=n,(s.flags&4098)!==0&&(o=s.return),n=s.return;while(n)}return s.tag===3?o:null}function Ra(n){if(n.tag===13){var s=n.memoizedState;if(s===null&&(n=n.alternate,n!==null&&(s=n.memoizedState)),s!==null)return s.dehydrated}return null}function Go(n){if($n(n)!==n)throw Error(t(188))}function oc(n){var s=n.alternate;if(!s){if(s=$n(n),s===null)throw Error(t(188));return s!==n?null:n}for(var o=n,u=s;;){var p=o.return;if(p===null)break;var S=p.alternate;if(S===null){if(u=p.return,u!==null){o=u;continue}break}if(p.child===S.child){for(S=p.child;S;){if(S===o)return Go(p),n;if(S===u)return Go(p),s;S=S.sibling}throw Error(t(188))}if(o.return!==u.return)o=p,u=S;else{for(var R=!1,B=p.child;B;){if(B===o){R=!0,o=p,u=S;break}if(B===u){R=!0,u=p,o=S;break}B=B.sibling}if(!R){for(B=S.child;B;){if(B===o){R=!0,o=S,u=p;break}if(B===u){R=!0,u=S,o=p;break}B=B.sibling}if(!R)throw Error(t(189))}}if(o.alternate!==u)throw Error(t(190))}if(o.tag!==3)throw Error(t(188));return o.stateNode.current===o?n:s}function Vs(n){return n=oc(n),n!==null?jo(n):null}function jo(n){if(n.tag===5||n.tag===6)return n;for(n=n.child;n!==null;){var s=jo(n);if(s!==null)return s;n=n.sibling}return null}var Gs=e.unstable_scheduleCallback,Wo=e.unstable_cancelCallback,lc=e.unstable_shouldYield,Md=e.unstable_requestPaint,on=e.unstable_now,Ed=e.unstable_getCurrentPriorityLevel,Xo=e.unstable_ImmediatePriority,A=e.unstable_UserBlockingPriority,ee=e.unstable_NormalPriority,fe=e.unstable_LowPriority,le=e.unstable_IdlePriority,ae=null,Ne=null;function je(n){if(Ne&&typeof Ne.onCommitFiberRoot=="function")try{Ne.onCommitFiberRoot(ae,n,void 0,(n.current.flags&128)===128)}catch{}}var Ae=Math.clz32?Math.clz32:ht,Ke=Math.log,it=Math.LN2;function ht(n){return n>>>=0,n===0?32:31-(Ke(n)/it|0)|0}var ft=64,Je=4194304;function Nt(n){switch(n&-n){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return n&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return n&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return n}}function Yt(n,s){var o=n.pendingLanes;if(o===0)return 0;var u=0,p=n.suspendedLanes,S=n.pingedLanes,R=o&268435455;if(R!==0){var B=R&~p;B!==0?u=Nt(B):(S&=R,S!==0&&(u=Nt(S)))}else R=o&~p,R!==0?u=Nt(R):S!==0&&(u=Nt(S));if(u===0)return 0;if(s!==0&&s!==u&&(s&p)===0&&(p=u&-u,S=s&-s,p>=S||p===16&&(S&4194240)!==0))return s;if((u&4)!==0&&(u|=o&16),s=n.entangledLanes,s!==0)for(n=n.entanglements,s&=u;0<s;)o=31-Ae(s),p=1<<o,u|=n[o],s&=~p;return u}function en(n,s){switch(n){case 1:case 2:case 4:return s+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return s+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function Bt(n,s){for(var o=n.suspendedLanes,u=n.pingedLanes,p=n.expirationTimes,S=n.pendingLanes;0<S;){var R=31-Ae(S),B=1<<R,X=p[R];X===-1?((B&o)===0||(B&u)!==0)&&(p[R]=en(B,s)):X<=s&&(n.expiredLanes|=B),S&=~B}}function gn(n){return n=n.pendingLanes&-1073741825,n!==0?n:n&1073741824?1073741824:0}function He(){var n=ft;return ft<<=1,(ft&4194240)===0&&(ft=64),n}function Ln(n){for(var s=[],o=0;31>o;o++)s.push(n);return s}function yt(n,s,o){n.pendingLanes|=s,s!==536870912&&(n.suspendedLanes=0,n.pingedLanes=0),n=n.eventTimes,s=31-Ae(s),n[s]=o}function ei(n,s){var o=n.pendingLanes&~s;n.pendingLanes=s,n.suspendedLanes=0,n.pingedLanes=0,n.expiredLanes&=s,n.mutableReadLanes&=s,n.entangledLanes&=s,s=n.entanglements;var u=n.eventTimes;for(n=n.expirationTimes;0<o;){var p=31-Ae(o),S=1<<p;s[p]=0,u[p]=-1,n[p]=-1,o&=~S}}function ti(n,s){var o=n.entangledLanes|=s;for(n=n.entanglements;o;){var u=31-Ae(o),p=1<<u;p&s|n[u]&s&&(n[u]|=s),o&=~p}}var St=0;function Sr(n){return n&=-n,1<n?4<n?(n&268435455)!==0?16:536870912:4:1}var Ft,Qt,Fi,Ht,Oi,tr=!1,js=[],Qr=null,Zr=null,Jr=null,$o=new Map,qo=new Map,es=[],Uy="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function $m(n,s){switch(n){case"focusin":case"focusout":Qr=null;break;case"dragenter":case"dragleave":Zr=null;break;case"mouseover":case"mouseout":Jr=null;break;case"pointerover":case"pointerout":$o.delete(s.pointerId);break;case"gotpointercapture":case"lostpointercapture":qo.delete(s.pointerId)}}function Yo(n,s,o,u,p,S){return n===null||n.nativeEvent!==S?(n={blockedOn:s,domEventName:o,eventSystemFlags:u,nativeEvent:S,targetContainers:[p]},s!==null&&(s=cl(s),s!==null&&Qt(s)),n):(n.eventSystemFlags|=u,s=n.targetContainers,p!==null&&s.indexOf(p)===-1&&s.push(p),n)}function Fy(n,s,o,u,p){switch(s){case"focusin":return Qr=Yo(Qr,n,s,o,u,p),!0;case"dragenter":return Zr=Yo(Zr,n,s,o,u,p),!0;case"mouseover":return Jr=Yo(Jr,n,s,o,u,p),!0;case"pointerover":var S=p.pointerId;return $o.set(S,Yo($o.get(S)||null,n,s,o,u,p)),!0;case"gotpointercapture":return S=p.pointerId,qo.set(S,Yo(qo.get(S)||null,n,s,o,u,p)),!0}return!1}function qm(n){var s=Ws(n.target);if(s!==null){var o=$n(s);if(o!==null){if(s=o.tag,s===13){if(s=Ra(o),s!==null){n.blockedOn=s,Oi(n.priority,function(){Fi(o)});return}}else if(s===3&&o.stateNode.current.memoizedState.isDehydrated){n.blockedOn=o.tag===3?o.stateNode.containerInfo:null;return}}}n.blockedOn=null}function cc(n){if(n.blockedOn!==null)return!1;for(var s=n.targetContainers;0<s.length;){var o=bd(n.domEventName,n.eventSystemFlags,s[0],n.nativeEvent);if(o===null){o=n.nativeEvent;var u=new o.constructor(o.type,o);Se=u,o.target.dispatchEvent(u),Se=null}else return s=cl(o),s!==null&&Qt(s),n.blockedOn=o,!1;s.shift()}return!0}function Ym(n,s,o){cc(n)&&o.delete(s)}function Oy(){tr=!1,Qr!==null&&cc(Qr)&&(Qr=null),Zr!==null&&cc(Zr)&&(Zr=null),Jr!==null&&cc(Jr)&&(Jr=null),$o.forEach(Ym),qo.forEach(Ym)}function Ko(n,s){n.blockedOn===s&&(n.blockedOn=null,tr||(tr=!0,e.unstable_scheduleCallback(e.unstable_NormalPriority,Oy)))}function Qo(n){function s(p){return Ko(p,n)}if(0<js.length){Ko(js[0],n);for(var o=1;o<js.length;o++){var u=js[o];u.blockedOn===n&&(u.blockedOn=null)}}for(Qr!==null&&Ko(Qr,n),Zr!==null&&Ko(Zr,n),Jr!==null&&Ko(Jr,n),$o.forEach(s),qo.forEach(s),o=0;o<es.length;o++)u=es[o],u.blockedOn===n&&(u.blockedOn=null);for(;0<es.length&&(o=es[0],o.blockedOn===null);)qm(o),o.blockedOn===null&&es.shift()}var Aa=T.ReactCurrentBatchConfig,uc=!0;function ky(n,s,o,u){var p=St,S=Aa.transition;Aa.transition=null;try{St=1,wd(n,s,o,u)}finally{St=p,Aa.transition=S}}function zy(n,s,o,u){var p=St,S=Aa.transition;Aa.transition=null;try{St=4,wd(n,s,o,u)}finally{St=p,Aa.transition=S}}function wd(n,s,o,u){if(uc){var p=bd(n,s,o,u);if(p===null)Vd(n,s,u,dc,o),$m(n,u);else if(Fy(p,n,s,o,u))u.stopPropagation();else if($m(n,u),s&4&&-1<Uy.indexOf(n)){for(;p!==null;){var S=cl(p);if(S!==null&&Ft(S),S=bd(n,s,o,u),S===null&&Vd(n,s,u,dc,o),S===p)break;p=S}p!==null&&u.stopPropagation()}else Vd(n,s,u,null,o)}}var dc=null;function bd(n,s,o,u){if(dc=null,n=Oe(u),n=Ws(n),n!==null)if(s=$n(n),s===null)n=null;else if(o=s.tag,o===13){if(n=Ra(s),n!==null)return n;n=null}else if(o===3){if(s.stateNode.current.memoizedState.isDehydrated)return s.tag===3?s.stateNode.containerInfo:null;n=null}else s!==n&&(n=null);return dc=n,null}function Km(n){switch(n){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(Ed()){case Xo:return 1;case A:return 4;case ee:case fe:return 16;case le:return 536870912;default:return 16}default:return 16}}var ts=null,Td=null,hc=null;function Qm(){if(hc)return hc;var n,s=Td,o=s.length,u,p="value"in ts?ts.value:ts.textContent,S=p.length;for(n=0;n<o&&s[n]===p[n];n++);var R=o-n;for(u=1;u<=R&&s[o-u]===p[S-u];u++);return hc=p.slice(n,1<u?1-u:void 0)}function fc(n){var s=n.keyCode;return"charCode"in n?(n=n.charCode,n===0&&s===13&&(n=13)):n=s,n===10&&(n=13),32<=n||n===13?n:0}function pc(){return!0}function Zm(){return!1}function fi(n){function s(o,u,p,S,R){this._reactName=o,this._targetInst=p,this.type=u,this.nativeEvent=S,this.target=R,this.currentTarget=null;for(var B in n)n.hasOwnProperty(B)&&(o=n[B],this[B]=o?o(S):S[B]);return this.isDefaultPrevented=(S.defaultPrevented!=null?S.defaultPrevented:S.returnValue===!1)?pc:Zm,this.isPropagationStopped=Zm,this}return de(s.prototype,{preventDefault:function(){this.defaultPrevented=!0;var o=this.nativeEvent;o&&(o.preventDefault?o.preventDefault():typeof o.returnValue!="unknown"&&(o.returnValue=!1),this.isDefaultPrevented=pc)},stopPropagation:function(){var o=this.nativeEvent;o&&(o.stopPropagation?o.stopPropagation():typeof o.cancelBubble!="unknown"&&(o.cancelBubble=!0),this.isPropagationStopped=pc)},persist:function(){},isPersistent:pc}),s}var Pa={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(n){return n.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Cd=fi(Pa),Zo=de({},Pa,{view:0,detail:0}),By=fi(Zo),Rd,Ad,Jo,mc=de({},Zo,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Nd,button:0,buttons:0,relatedTarget:function(n){return n.relatedTarget===void 0?n.fromElement===n.srcElement?n.toElement:n.fromElement:n.relatedTarget},movementX:function(n){return"movementX"in n?n.movementX:(n!==Jo&&(Jo&&n.type==="mousemove"?(Rd=n.screenX-Jo.screenX,Ad=n.screenY-Jo.screenY):Ad=Rd=0,Jo=n),Rd)},movementY:function(n){return"movementY"in n?n.movementY:Ad}}),Jm=fi(mc),Hy=de({},mc,{dataTransfer:0}),Vy=fi(Hy),Gy=de({},Zo,{relatedTarget:0}),Pd=fi(Gy),jy=de({},Pa,{animationName:0,elapsedTime:0,pseudoElement:0}),Wy=fi(jy),Xy=de({},Pa,{clipboardData:function(n){return"clipboardData"in n?n.clipboardData:window.clipboardData}}),$y=fi(Xy),qy=de({},Pa,{data:0}),eg=fi(qy),Yy={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},Ky={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},Qy={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function Zy(n){var s=this.nativeEvent;return s.getModifierState?s.getModifierState(n):(n=Qy[n])?!!s[n]:!1}function Nd(){return Zy}var Jy=de({},Zo,{key:function(n){if(n.key){var s=Yy[n.key]||n.key;if(s!=="Unidentified")return s}return n.type==="keypress"?(n=fc(n),n===13?"Enter":String.fromCharCode(n)):n.type==="keydown"||n.type==="keyup"?Ky[n.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Nd,charCode:function(n){return n.type==="keypress"?fc(n):0},keyCode:function(n){return n.type==="keydown"||n.type==="keyup"?n.keyCode:0},which:function(n){return n.type==="keypress"?fc(n):n.type==="keydown"||n.type==="keyup"?n.keyCode:0}}),eS=fi(Jy),tS=de({},mc,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),tg=fi(tS),nS=de({},Zo,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Nd}),iS=fi(nS),rS=de({},Pa,{propertyName:0,elapsedTime:0,pseudoElement:0}),sS=fi(rS),aS=de({},mc,{deltaX:function(n){return"deltaX"in n?n.deltaX:"wheelDeltaX"in n?-n.wheelDeltaX:0},deltaY:function(n){return"deltaY"in n?n.deltaY:"wheelDeltaY"in n?-n.wheelDeltaY:"wheelDelta"in n?-n.wheelDelta:0},deltaZ:0,deltaMode:0}),oS=fi(aS),lS=[9,13,27,32],Ld=d&&"CompositionEvent"in window,el=null;d&&"documentMode"in document&&(el=document.documentMode);var cS=d&&"TextEvent"in window&&!el,ng=d&&(!Ld||el&&8<el&&11>=el),ig=" ",rg=!1;function sg(n,s){switch(n){case"keyup":return lS.indexOf(s.keyCode)!==-1;case"keydown":return s.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function ag(n){return n=n.detail,typeof n=="object"&&"data"in n?n.data:null}var Na=!1;function uS(n,s){switch(n){case"compositionend":return ag(s);case"keypress":return s.which!==32?null:(rg=!0,ig);case"textInput":return n=s.data,n===ig&&rg?null:n;default:return null}}function dS(n,s){if(Na)return n==="compositionend"||!Ld&&sg(n,s)?(n=Qm(),hc=Td=ts=null,Na=!1,n):null;switch(n){case"paste":return null;case"keypress":if(!(s.ctrlKey||s.altKey||s.metaKey)||s.ctrlKey&&s.altKey){if(s.char&&1<s.char.length)return s.char;if(s.which)return String.fromCharCode(s.which)}return null;case"compositionend":return ng&&s.locale!=="ko"?null:s.data;default:return null}}var hS={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function og(n){var s=n&&n.nodeName&&n.nodeName.toLowerCase();return s==="input"?!!hS[n.type]:s==="textarea"}function lg(n,s,o,u){_e(u),s=yc(s,"onChange"),0<s.length&&(o=new Cd("onChange","change",null,o,u),n.push({event:o,listeners:s}))}var tl=null,nl=null;function fS(n){Tg(n,0)}function gc(n){var s=Fa(n);if(Gt(s))return n}function pS(n,s){if(n==="change")return s}var cg=!1;if(d){var Dd;if(d){var Id="oninput"in document;if(!Id){var ug=document.createElement("div");ug.setAttribute("oninput","return;"),Id=typeof ug.oninput=="function"}Dd=Id}else Dd=!1;cg=Dd&&(!document.documentMode||9<document.documentMode)}function dg(){tl&&(tl.detachEvent("onpropertychange",hg),nl=tl=null)}function hg(n){if(n.propertyName==="value"&&gc(nl)){var s=[];lg(s,nl,n,Oe(n)),$e(fS,s)}}function mS(n,s,o){n==="focusin"?(dg(),tl=s,nl=o,tl.attachEvent("onpropertychange",hg)):n==="focusout"&&dg()}function gS(n){if(n==="selectionchange"||n==="keyup"||n==="keydown")return gc(nl)}function xS(n,s){if(n==="click")return gc(s)}function vS(n,s){if(n==="input"||n==="change")return gc(s)}function _S(n,s){return n===s&&(n!==0||1/n===1/s)||n!==n&&s!==s}var ki=typeof Object.is=="function"?Object.is:_S;function il(n,s){if(ki(n,s))return!0;if(typeof n!="object"||n===null||typeof s!="object"||s===null)return!1;var o=Object.keys(n),u=Object.keys(s);if(o.length!==u.length)return!1;for(u=0;u<o.length;u++){var p=o[u];if(!h.call(s,p)||!ki(n[p],s[p]))return!1}return!0}function fg(n){for(;n&&n.firstChild;)n=n.firstChild;return n}function pg(n,s){var o=fg(n);n=0;for(var u;o;){if(o.nodeType===3){if(u=n+o.textContent.length,n<=s&&u>=s)return{node:o,offset:s-n};n=u}e:{for(;o;){if(o.nextSibling){o=o.nextSibling;break e}o=o.parentNode}o=void 0}o=fg(o)}}function mg(n,s){return n&&s?n===s?!0:n&&n.nodeType===3?!1:s&&s.nodeType===3?mg(n,s.parentNode):"contains"in n?n.contains(s):n.compareDocumentPosition?!!(n.compareDocumentPosition(s)&16):!1:!1}function gg(){for(var n=window,s=ut();s instanceof n.HTMLIFrameElement;){try{var o=typeof s.contentWindow.location.href=="string"}catch{o=!1}if(o)n=s.contentWindow;else break;s=ut(n.document)}return s}function Ud(n){var s=n&&n.nodeName&&n.nodeName.toLowerCase();return s&&(s==="input"&&(n.type==="text"||n.type==="search"||n.type==="tel"||n.type==="url"||n.type==="password")||s==="textarea"||n.contentEditable==="true")}function yS(n){var s=gg(),o=n.focusedElem,u=n.selectionRange;if(s!==o&&o&&o.ownerDocument&&mg(o.ownerDocument.documentElement,o)){if(u!==null&&Ud(o)){if(s=u.start,n=u.end,n===void 0&&(n=s),"selectionStart"in o)o.selectionStart=s,o.selectionEnd=Math.min(n,o.value.length);else if(n=(s=o.ownerDocument||document)&&s.defaultView||window,n.getSelection){n=n.getSelection();var p=o.textContent.length,S=Math.min(u.start,p);u=u.end===void 0?S:Math.min(u.end,p),!n.extend&&S>u&&(p=u,u=S,S=p),p=pg(o,S);var R=pg(o,u);p&&R&&(n.rangeCount!==1||n.anchorNode!==p.node||n.anchorOffset!==p.offset||n.focusNode!==R.node||n.focusOffset!==R.offset)&&(s=s.createRange(),s.setStart(p.node,p.offset),n.removeAllRanges(),S>u?(n.addRange(s),n.extend(R.node,R.offset)):(s.setEnd(R.node,R.offset),n.addRange(s)))}}for(s=[],n=o;n=n.parentNode;)n.nodeType===1&&s.push({element:n,left:n.scrollLeft,top:n.scrollTop});for(typeof o.focus=="function"&&o.focus(),o=0;o<s.length;o++)n=s[o],n.element.scrollLeft=n.left,n.element.scrollTop=n.top}}var SS=d&&"documentMode"in document&&11>=document.documentMode,La=null,Fd=null,rl=null,Od=!1;function xg(n,s,o){var u=o.window===o?o.document:o.nodeType===9?o:o.ownerDocument;Od||La==null||La!==ut(u)||(u=La,"selectionStart"in u&&Ud(u)?u={start:u.selectionStart,end:u.selectionEnd}:(u=(u.ownerDocument&&u.ownerDocument.defaultView||window).getSelection(),u={anchorNode:u.anchorNode,anchorOffset:u.anchorOffset,focusNode:u.focusNode,focusOffset:u.focusOffset}),rl&&il(rl,u)||(rl=u,u=yc(Fd,"onSelect"),0<u.length&&(s=new Cd("onSelect","select",null,s,o),n.push({event:s,listeners:u}),s.target=La)))}function xc(n,s){var o={};return o[n.toLowerCase()]=s.toLowerCase(),o["Webkit"+n]="webkit"+s,o["Moz"+n]="moz"+s,o}var Da={animationend:xc("Animation","AnimationEnd"),animationiteration:xc("Animation","AnimationIteration"),animationstart:xc("Animation","AnimationStart"),transitionend:xc("Transition","TransitionEnd")},kd={},vg={};d&&(vg=document.createElement("div").style,"AnimationEvent"in window||(delete Da.animationend.animation,delete Da.animationiteration.animation,delete Da.animationstart.animation),"TransitionEvent"in window||delete Da.transitionend.transition);function vc(n){if(kd[n])return kd[n];if(!Da[n])return n;var s=Da[n],o;for(o in s)if(s.hasOwnProperty(o)&&o in vg)return kd[n]=s[o];return n}var _g=vc("animationend"),yg=vc("animationiteration"),Sg=vc("animationstart"),Mg=vc("transitionend"),Eg=new Map,wg="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function ns(n,s){Eg.set(n,s),l(s,[n])}for(var zd=0;zd<wg.length;zd++){var Bd=wg[zd],MS=Bd.toLowerCase(),ES=Bd[0].toUpperCase()+Bd.slice(1);ns(MS,"on"+ES)}ns(_g,"onAnimationEnd"),ns(yg,"onAnimationIteration"),ns(Sg,"onAnimationStart"),ns("dblclick","onDoubleClick"),ns("focusin","onFocus"),ns("focusout","onBlur"),ns(Mg,"onTransitionEnd"),c("onMouseEnter",["mouseout","mouseover"]),c("onMouseLeave",["mouseout","mouseover"]),c("onPointerEnter",["pointerout","pointerover"]),c("onPointerLeave",["pointerout","pointerover"]),l("onChange","change click focusin focusout input keydown keyup selectionchange".split(" ")),l("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),l("onBeforeInput",["compositionend","keypress","textInput","paste"]),l("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" ")),l("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" ")),l("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var sl="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),wS=new Set("cancel close invalid load scroll toggle".split(" ").concat(sl));function bg(n,s,o){var u=n.type||"unknown-event";n.currentTarget=o,ac(u,s,void 0,n),n.currentTarget=null}function Tg(n,s){s=(s&4)!==0;for(var o=0;o<n.length;o++){var u=n[o],p=u.event;u=u.listeners;e:{var S=void 0;if(s)for(var R=u.length-1;0<=R;R--){var B=u[R],X=B.instance,pe=B.currentTarget;if(B=B.listener,X!==S&&p.isPropagationStopped())break e;bg(p,B,pe),S=X}else for(R=0;R<u.length;R++){if(B=u[R],X=B.instance,pe=B.currentTarget,B=B.listener,X!==S&&p.isPropagationStopped())break e;bg(p,B,pe),S=X}}}if(Bs)throw n=Hs,Bs=!1,Hs=null,n}function Zt(n,s){var o=s[qd];o===void 0&&(o=s[qd]=new Set);var u=n+"__bubble";o.has(u)||(Cg(s,n,2,!1),o.add(u))}function Hd(n,s,o){var u=0;s&&(u|=4),Cg(o,n,u,s)}var _c="_reactListening"+Math.random().toString(36).slice(2);function al(n){if(!n[_c]){n[_c]=!0,r.forEach(function(o){o!=="selectionchange"&&(wS.has(o)||Hd(o,!1,n),Hd(o,!0,n))});var s=n.nodeType===9?n:n.ownerDocument;s===null||s[_c]||(s[_c]=!0,Hd("selectionchange",!1,s))}}function Cg(n,s,o,u){switch(Km(s)){case 1:var p=ky;break;case 4:p=zy;break;default:p=wd}o=p.bind(null,s,o,n),p=void 0,!Ut||s!=="touchstart"&&s!=="touchmove"&&s!=="wheel"||(p=!0),u?p!==void 0?n.addEventListener(s,o,{capture:!0,passive:p}):n.addEventListener(s,o,!0):p!==void 0?n.addEventListener(s,o,{passive:p}):n.addEventListener(s,o,!1)}function Vd(n,s,o,u,p){var S=u;if((s&1)===0&&(s&2)===0&&u!==null)e:for(;;){if(u===null)return;var R=u.tag;if(R===3||R===4){var B=u.stateNode.containerInfo;if(B===p||B.nodeType===8&&B.parentNode===p)break;if(R===4)for(R=u.return;R!==null;){var X=R.tag;if((X===3||X===4)&&(X=R.stateNode.containerInfo,X===p||X.nodeType===8&&X.parentNode===p))return;R=R.return}for(;B!==null;){if(R=Ws(B),R===null)return;if(X=R.tag,X===5||X===6){u=S=R;continue e}B=B.parentNode}}u=u.return}$e(function(){var pe=S,be=Oe(o),Te=[];e:{var we=Eg.get(n);if(we!==void 0){var Ve=Cd,qe=n;switch(n){case"keypress":if(fc(o)===0)break e;case"keydown":case"keyup":Ve=eS;break;case"focusin":qe="focus",Ve=Pd;break;case"focusout":qe="blur",Ve=Pd;break;case"beforeblur":case"afterblur":Ve=Pd;break;case"click":if(o.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":Ve=Jm;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":Ve=Vy;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":Ve=iS;break;case _g:case yg:case Sg:Ve=Wy;break;case Mg:Ve=sS;break;case"scroll":Ve=By;break;case"wheel":Ve=oS;break;case"copy":case"cut":case"paste":Ve=$y;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":Ve=tg}var Qe=(s&4)!==0,mn=!Qe&&n==="scroll",re=Qe?we!==null?we+"Capture":null:we;Qe=[];for(var Q=pe,ue;Q!==null;){ue=Q;var Ce=ue.stateNode;if(ue.tag===5&&Ce!==null&&(ue=Ce,re!==null&&(Ce=jt(Q,re),Ce!=null&&Qe.push(ol(Q,Ce,ue)))),mn)break;Q=Q.return}0<Qe.length&&(we=new Ve(we,qe,null,o,be),Te.push({event:we,listeners:Qe}))}}if((s&7)===0){e:{if(we=n==="mouseover"||n==="pointerover",Ve=n==="mouseout"||n==="pointerout",we&&o!==Se&&(qe=o.relatedTarget||o.fromElement)&&(Ws(qe)||qe[Mr]))break e;if((Ve||we)&&(we=be.window===be?be:(we=be.ownerDocument)?we.defaultView||we.parentWindow:window,Ve?(qe=o.relatedTarget||o.toElement,Ve=pe,qe=qe?Ws(qe):null,qe!==null&&(mn=$n(qe),qe!==mn||qe.tag!==5&&qe.tag!==6)&&(qe=null)):(Ve=null,qe=pe),Ve!==qe)){if(Qe=Jm,Ce="onMouseLeave",re="onMouseEnter",Q="mouse",(n==="pointerout"||n==="pointerover")&&(Qe=tg,Ce="onPointerLeave",re="onPointerEnter",Q="pointer"),mn=Ve==null?we:Fa(Ve),ue=qe==null?we:Fa(qe),we=new Qe(Ce,Q+"leave",Ve,o,be),we.target=mn,we.relatedTarget=ue,Ce=null,Ws(be)===pe&&(Qe=new Qe(re,Q+"enter",qe,o,be),Qe.target=ue,Qe.relatedTarget=mn,Ce=Qe),mn=Ce,Ve&&qe)t:{for(Qe=Ve,re=qe,Q=0,ue=Qe;ue;ue=Ia(ue))Q++;for(ue=0,Ce=re;Ce;Ce=Ia(Ce))ue++;for(;0<Q-ue;)Qe=Ia(Qe),Q--;for(;0<ue-Q;)re=Ia(re),ue--;for(;Q--;){if(Qe===re||re!==null&&Qe===re.alternate)break t;Qe=Ia(Qe),re=Ia(re)}Qe=null}else Qe=null;Ve!==null&&Rg(Te,we,Ve,Qe,!1),qe!==null&&mn!==null&&Rg(Te,mn,qe,Qe,!0)}}e:{if(we=pe?Fa(pe):window,Ve=we.nodeName&&we.nodeName.toLowerCase(),Ve==="select"||Ve==="input"&&we.type==="file")var et=pS;else if(og(we))if(cg)et=vS;else{et=gS;var at=mS}else(Ve=we.nodeName)&&Ve.toLowerCase()==="input"&&(we.type==="checkbox"||we.type==="radio")&&(et=xS);if(et&&(et=et(n,pe))){lg(Te,et,o,be);break e}at&&at(n,we,pe),n==="focusout"&&(at=we._wrapperState)&&at.controlled&&we.type==="number"&&qt(we,"number",we.value)}switch(at=pe?Fa(pe):window,n){case"focusin":(og(at)||at.contentEditable==="true")&&(La=at,Fd=pe,rl=null);break;case"focusout":rl=Fd=La=null;break;case"mousedown":Od=!0;break;case"contextmenu":case"mouseup":case"dragend":Od=!1,xg(Te,o,be);break;case"selectionchange":if(SS)break;case"keydown":case"keyup":xg(Te,o,be)}var ot;if(Ld)e:{switch(n){case"compositionstart":var ct="onCompositionStart";break e;case"compositionend":ct="onCompositionEnd";break e;case"compositionupdate":ct="onCompositionUpdate";break e}ct=void 0}else Na?sg(n,o)&&(ct="onCompositionEnd"):n==="keydown"&&o.keyCode===229&&(ct="onCompositionStart");ct&&(ng&&o.locale!=="ko"&&(Na||ct!=="onCompositionStart"?ct==="onCompositionEnd"&&Na&&(ot=Qm()):(ts=be,Td="value"in ts?ts.value:ts.textContent,Na=!0)),at=yc(pe,ct),0<at.length&&(ct=new eg(ct,n,null,o,be),Te.push({event:ct,listeners:at}),ot?ct.data=ot:(ot=ag(o),ot!==null&&(ct.data=ot)))),(ot=cS?uS(n,o):dS(n,o))&&(pe=yc(pe,"onBeforeInput"),0<pe.length&&(be=new eg("onBeforeInput","beforeinput",null,o,be),Te.push({event:be,listeners:pe}),be.data=ot))}Tg(Te,s)})}function ol(n,s,o){return{instance:n,listener:s,currentTarget:o}}function yc(n,s){for(var o=s+"Capture",u=[];n!==null;){var p=n,S=p.stateNode;p.tag===5&&S!==null&&(p=S,S=jt(n,o),S!=null&&u.unshift(ol(n,S,p)),S=jt(n,s),S!=null&&u.push(ol(n,S,p))),n=n.return}return u}function Ia(n){if(n===null)return null;do n=n.return;while(n&&n.tag!==5);return n||null}function Rg(n,s,o,u,p){for(var S=s._reactName,R=[];o!==null&&o!==u;){var B=o,X=B.alternate,pe=B.stateNode;if(X!==null&&X===u)break;B.tag===5&&pe!==null&&(B=pe,p?(X=jt(o,S),X!=null&&R.unshift(ol(o,X,B))):p||(X=jt(o,S),X!=null&&R.push(ol(o,X,B)))),o=o.return}R.length!==0&&n.push({event:s,listeners:R})}var bS=/\r\n?/g,TS=/\u0000|\uFFFD/g;function Ag(n){return(typeof n=="string"?n:""+n).replace(bS,`
`).replace(TS,"")}function Sc(n,s,o){if(s=Ag(s),Ag(n)!==s&&o)throw Error(t(425))}function Mc(){}var Gd=null,jd=null;function Wd(n,s){return n==="textarea"||n==="noscript"||typeof s.children=="string"||typeof s.children=="number"||typeof s.dangerouslySetInnerHTML=="object"&&s.dangerouslySetInnerHTML!==null&&s.dangerouslySetInnerHTML.__html!=null}var Xd=typeof setTimeout=="function"?setTimeout:void 0,CS=typeof clearTimeout=="function"?clearTimeout:void 0,Pg=typeof Promise=="function"?Promise:void 0,RS=typeof queueMicrotask=="function"?queueMicrotask:typeof Pg<"u"?function(n){return Pg.resolve(null).then(n).catch(AS)}:Xd;function AS(n){setTimeout(function(){throw n})}function $d(n,s){var o=s,u=0;do{var p=o.nextSibling;if(n.removeChild(o),p&&p.nodeType===8)if(o=p.data,o==="/$"){if(u===0){n.removeChild(p),Qo(s);return}u--}else o!=="$"&&o!=="$?"&&o!=="$!"||u++;o=p}while(o);Qo(s)}function is(n){for(;n!=null;n=n.nextSibling){var s=n.nodeType;if(s===1||s===3)break;if(s===8){if(s=n.data,s==="$"||s==="$!"||s==="$?")break;if(s==="/$")return null}}return n}function Ng(n){n=n.previousSibling;for(var s=0;n;){if(n.nodeType===8){var o=n.data;if(o==="$"||o==="$!"||o==="$?"){if(s===0)return n;s--}else o==="/$"&&s++}n=n.previousSibling}return null}var Ua=Math.random().toString(36).slice(2),nr="__reactFiber$"+Ua,ll="__reactProps$"+Ua,Mr="__reactContainer$"+Ua,qd="__reactEvents$"+Ua,PS="__reactListeners$"+Ua,NS="__reactHandles$"+Ua;function Ws(n){var s=n[nr];if(s)return s;for(var o=n.parentNode;o;){if(s=o[Mr]||o[nr]){if(o=s.alternate,s.child!==null||o!==null&&o.child!==null)for(n=Ng(n);n!==null;){if(o=n[nr])return o;n=Ng(n)}return s}n=o,o=n.parentNode}return null}function cl(n){return n=n[nr]||n[Mr],!n||n.tag!==5&&n.tag!==6&&n.tag!==13&&n.tag!==3?null:n}function Fa(n){if(n.tag===5||n.tag===6)return n.stateNode;throw Error(t(33))}function Ec(n){return n[ll]||null}var Yd=[],Oa=-1;function rs(n){return{current:n}}function Jt(n){0>Oa||(n.current=Yd[Oa],Yd[Oa]=null,Oa--)}function Kt(n,s){Oa++,Yd[Oa]=n.current,n.current=s}var ss={},kn=rs(ss),ni=rs(!1),Xs=ss;function ka(n,s){var o=n.type.contextTypes;if(!o)return ss;var u=n.stateNode;if(u&&u.__reactInternalMemoizedUnmaskedChildContext===s)return u.__reactInternalMemoizedMaskedChildContext;var p={},S;for(S in o)p[S]=s[S];return u&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=s,n.__reactInternalMemoizedMaskedChildContext=p),p}function ii(n){return n=n.childContextTypes,n!=null}function wc(){Jt(ni),Jt(kn)}function Lg(n,s,o){if(kn.current!==ss)throw Error(t(168));Kt(kn,s),Kt(ni,o)}function Dg(n,s,o){var u=n.stateNode;if(s=s.childContextTypes,typeof u.getChildContext!="function")return o;u=u.getChildContext();for(var p in u)if(!(p in s))throw Error(t(108,ye(n)||"Unknown",p));return de({},o,u)}function bc(n){return n=(n=n.stateNode)&&n.__reactInternalMemoizedMergedChildContext||ss,Xs=kn.current,Kt(kn,n),Kt(ni,ni.current),!0}function Ig(n,s,o){var u=n.stateNode;if(!u)throw Error(t(169));o?(n=Dg(n,s,Xs),u.__reactInternalMemoizedMergedChildContext=n,Jt(ni),Jt(kn),Kt(kn,n)):Jt(ni),Kt(ni,o)}var Er=null,Tc=!1,Kd=!1;function Ug(n){Er===null?Er=[n]:Er.push(n)}function LS(n){Tc=!0,Ug(n)}function as(){if(!Kd&&Er!==null){Kd=!0;var n=0,s=St;try{var o=Er;for(St=1;n<o.length;n++){var u=o[n];do u=u(!0);while(u!==null)}Er=null,Tc=!1}catch(p){throw Er!==null&&(Er=Er.slice(n+1)),Gs(Xo,as),p}finally{St=s,Kd=!1}}return null}var za=[],Ba=0,Cc=null,Rc=0,bi=[],Ti=0,$s=null,wr=1,br="";function qs(n,s){za[Ba++]=Rc,za[Ba++]=Cc,Cc=n,Rc=s}function Fg(n,s,o){bi[Ti++]=wr,bi[Ti++]=br,bi[Ti++]=$s,$s=n;var u=wr;n=br;var p=32-Ae(u)-1;u&=~(1<<p),o+=1;var S=32-Ae(s)+p;if(30<S){var R=p-p%5;S=(u&(1<<R)-1).toString(32),u>>=R,p-=R,wr=1<<32-Ae(s)+p|o<<p|u,br=S+n}else wr=1<<S|o<<p|u,br=n}function Qd(n){n.return!==null&&(qs(n,1),Fg(n,1,0))}function Zd(n){for(;n===Cc;)Cc=za[--Ba],za[Ba]=null,Rc=za[--Ba],za[Ba]=null;for(;n===$s;)$s=bi[--Ti],bi[Ti]=null,br=bi[--Ti],bi[Ti]=null,wr=bi[--Ti],bi[Ti]=null}var pi=null,mi=null,tn=!1,zi=null;function Og(n,s){var o=Pi(5,null,null,0);o.elementType="DELETED",o.stateNode=s,o.return=n,s=n.deletions,s===null?(n.deletions=[o],n.flags|=16):s.push(o)}function kg(n,s){switch(n.tag){case 5:var o=n.type;return s=s.nodeType!==1||o.toLowerCase()!==s.nodeName.toLowerCase()?null:s,s!==null?(n.stateNode=s,pi=n,mi=is(s.firstChild),!0):!1;case 6:return s=n.pendingProps===""||s.nodeType!==3?null:s,s!==null?(n.stateNode=s,pi=n,mi=null,!0):!1;case 13:return s=s.nodeType!==8?null:s,s!==null?(o=$s!==null?{id:wr,overflow:br}:null,n.memoizedState={dehydrated:s,treeContext:o,retryLane:1073741824},o=Pi(18,null,null,0),o.stateNode=s,o.return=n,n.child=o,pi=n,mi=null,!0):!1;default:return!1}}function Jd(n){return(n.mode&1)!==0&&(n.flags&128)===0}function eh(n){if(tn){var s=mi;if(s){var o=s;if(!kg(n,s)){if(Jd(n))throw Error(t(418));s=is(o.nextSibling);var u=pi;s&&kg(n,s)?Og(u,o):(n.flags=n.flags&-4097|2,tn=!1,pi=n)}}else{if(Jd(n))throw Error(t(418));n.flags=n.flags&-4097|2,tn=!1,pi=n}}}function zg(n){for(n=n.return;n!==null&&n.tag!==5&&n.tag!==3&&n.tag!==13;)n=n.return;pi=n}function Ac(n){if(n!==pi)return!1;if(!tn)return zg(n),tn=!0,!1;var s;if((s=n.tag!==3)&&!(s=n.tag!==5)&&(s=n.type,s=s!=="head"&&s!=="body"&&!Wd(n.type,n.memoizedProps)),s&&(s=mi)){if(Jd(n))throw Bg(),Error(t(418));for(;s;)Og(n,s),s=is(s.nextSibling)}if(zg(n),n.tag===13){if(n=n.memoizedState,n=n!==null?n.dehydrated:null,!n)throw Error(t(317));e:{for(n=n.nextSibling,s=0;n;){if(n.nodeType===8){var o=n.data;if(o==="/$"){if(s===0){mi=is(n.nextSibling);break e}s--}else o!=="$"&&o!=="$!"&&o!=="$?"||s++}n=n.nextSibling}mi=null}}else mi=pi?is(n.stateNode.nextSibling):null;return!0}function Bg(){for(var n=mi;n;)n=is(n.nextSibling)}function Ha(){mi=pi=null,tn=!1}function th(n){zi===null?zi=[n]:zi.push(n)}var DS=T.ReactCurrentBatchConfig;function ul(n,s,o){if(n=o.ref,n!==null&&typeof n!="function"&&typeof n!="object"){if(o._owner){if(o=o._owner,o){if(o.tag!==1)throw Error(t(309));var u=o.stateNode}if(!u)throw Error(t(147,n));var p=u,S=""+n;return s!==null&&s.ref!==null&&typeof s.ref=="function"&&s.ref._stringRef===S?s.ref:(s=function(R){var B=p.refs;R===null?delete B[S]:B[S]=R},s._stringRef=S,s)}if(typeof n!="string")throw Error(t(284));if(!o._owner)throw Error(t(290,n))}return n}function Pc(n,s){throw n=Object.prototype.toString.call(s),Error(t(31,n==="[object Object]"?"object with keys {"+Object.keys(s).join(", ")+"}":n))}function Hg(n){var s=n._init;return s(n._payload)}function Vg(n){function s(re,Q){if(n){var ue=re.deletions;ue===null?(re.deletions=[Q],re.flags|=16):ue.push(Q)}}function o(re,Q){if(!n)return null;for(;Q!==null;)s(re,Q),Q=Q.sibling;return null}function u(re,Q){for(re=new Map;Q!==null;)Q.key!==null?re.set(Q.key,Q):re.set(Q.index,Q),Q=Q.sibling;return re}function p(re,Q){return re=ps(re,Q),re.index=0,re.sibling=null,re}function S(re,Q,ue){return re.index=ue,n?(ue=re.alternate,ue!==null?(ue=ue.index,ue<Q?(re.flags|=2,Q):ue):(re.flags|=2,Q)):(re.flags|=1048576,Q)}function R(re){return n&&re.alternate===null&&(re.flags|=2),re}function B(re,Q,ue,Ce){return Q===null||Q.tag!==6?(Q=Xh(ue,re.mode,Ce),Q.return=re,Q):(Q=p(Q,ue),Q.return=re,Q)}function X(re,Q,ue,Ce){var et=ue.type;return et===O?be(re,Q,ue.props.children,Ce,ue.key):Q!==null&&(Q.elementType===et||typeof et=="object"&&et!==null&&et.$$typeof===oe&&Hg(et)===Q.type)?(Ce=p(Q,ue.props),Ce.ref=ul(re,Q,ue),Ce.return=re,Ce):(Ce=eu(ue.type,ue.key,ue.props,null,re.mode,Ce),Ce.ref=ul(re,Q,ue),Ce.return=re,Ce)}function pe(re,Q,ue,Ce){return Q===null||Q.tag!==4||Q.stateNode.containerInfo!==ue.containerInfo||Q.stateNode.implementation!==ue.implementation?(Q=$h(ue,re.mode,Ce),Q.return=re,Q):(Q=p(Q,ue.children||[]),Q.return=re,Q)}function be(re,Q,ue,Ce,et){return Q===null||Q.tag!==7?(Q=na(ue,re.mode,Ce,et),Q.return=re,Q):(Q=p(Q,ue),Q.return=re,Q)}function Te(re,Q,ue){if(typeof Q=="string"&&Q!==""||typeof Q=="number")return Q=Xh(""+Q,re.mode,ue),Q.return=re,Q;if(typeof Q=="object"&&Q!==null){switch(Q.$$typeof){case U:return ue=eu(Q.type,Q.key,Q.props,null,re.mode,ue),ue.ref=ul(re,null,Q),ue.return=re,ue;case N:return Q=$h(Q,re.mode,ue),Q.return=re,Q;case oe:var Ce=Q._init;return Te(re,Ce(Q._payload),ue)}if($t(Q)||he(Q))return Q=na(Q,re.mode,ue,null),Q.return=re,Q;Pc(re,Q)}return null}function we(re,Q,ue,Ce){var et=Q!==null?Q.key:null;if(typeof ue=="string"&&ue!==""||typeof ue=="number")return et!==null?null:B(re,Q,""+ue,Ce);if(typeof ue=="object"&&ue!==null){switch(ue.$$typeof){case U:return ue.key===et?X(re,Q,ue,Ce):null;case N:return ue.key===et?pe(re,Q,ue,Ce):null;case oe:return et=ue._init,we(re,Q,et(ue._payload),Ce)}if($t(ue)||he(ue))return et!==null?null:be(re,Q,ue,Ce,null);Pc(re,ue)}return null}function Ve(re,Q,ue,Ce,et){if(typeof Ce=="string"&&Ce!==""||typeof Ce=="number")return re=re.get(ue)||null,B(Q,re,""+Ce,et);if(typeof Ce=="object"&&Ce!==null){switch(Ce.$$typeof){case U:return re=re.get(Ce.key===null?ue:Ce.key)||null,X(Q,re,Ce,et);case N:return re=re.get(Ce.key===null?ue:Ce.key)||null,pe(Q,re,Ce,et);case oe:var at=Ce._init;return Ve(re,Q,ue,at(Ce._payload),et)}if($t(Ce)||he(Ce))return re=re.get(ue)||null,be(Q,re,Ce,et,null);Pc(Q,Ce)}return null}function qe(re,Q,ue,Ce){for(var et=null,at=null,ot=Q,ct=Q=0,An=null;ot!==null&&ct<ue.length;ct++){ot.index>ct?(An=ot,ot=null):An=ot.sibling;var It=we(re,ot,ue[ct],Ce);if(It===null){ot===null&&(ot=An);break}n&&ot&&It.alternate===null&&s(re,ot),Q=S(It,Q,ct),at===null?et=It:at.sibling=It,at=It,ot=An}if(ct===ue.length)return o(re,ot),tn&&qs(re,ct),et;if(ot===null){for(;ct<ue.length;ct++)ot=Te(re,ue[ct],Ce),ot!==null&&(Q=S(ot,Q,ct),at===null?et=ot:at.sibling=ot,at=ot);return tn&&qs(re,ct),et}for(ot=u(re,ot);ct<ue.length;ct++)An=Ve(ot,re,ct,ue[ct],Ce),An!==null&&(n&&An.alternate!==null&&ot.delete(An.key===null?ct:An.key),Q=S(An,Q,ct),at===null?et=An:at.sibling=An,at=An);return n&&ot.forEach(function(ms){return s(re,ms)}),tn&&qs(re,ct),et}function Qe(re,Q,ue,Ce){var et=he(ue);if(typeof et!="function")throw Error(t(150));if(ue=et.call(ue),ue==null)throw Error(t(151));for(var at=et=null,ot=Q,ct=Q=0,An=null,It=ue.next();ot!==null&&!It.done;ct++,It=ue.next()){ot.index>ct?(An=ot,ot=null):An=ot.sibling;var ms=we(re,ot,It.value,Ce);if(ms===null){ot===null&&(ot=An);break}n&&ot&&ms.alternate===null&&s(re,ot),Q=S(ms,Q,ct),at===null?et=ms:at.sibling=ms,at=ms,ot=An}if(It.done)return o(re,ot),tn&&qs(re,ct),et;if(ot===null){for(;!It.done;ct++,It=ue.next())It=Te(re,It.value,Ce),It!==null&&(Q=S(It,Q,ct),at===null?et=It:at.sibling=It,at=It);return tn&&qs(re,ct),et}for(ot=u(re,ot);!It.done;ct++,It=ue.next())It=Ve(ot,re,ct,It.value,Ce),It!==null&&(n&&It.alternate!==null&&ot.delete(It.key===null?ct:It.key),Q=S(It,Q,ct),at===null?et=It:at.sibling=It,at=It);return n&&ot.forEach(function(hM){return s(re,hM)}),tn&&qs(re,ct),et}function mn(re,Q,ue,Ce){if(typeof ue=="object"&&ue!==null&&ue.type===O&&ue.key===null&&(ue=ue.props.children),typeof ue=="object"&&ue!==null){switch(ue.$$typeof){case U:e:{for(var et=ue.key,at=Q;at!==null;){if(at.key===et){if(et=ue.type,et===O){if(at.tag===7){o(re,at.sibling),Q=p(at,ue.props.children),Q.return=re,re=Q;break e}}else if(at.elementType===et||typeof et=="object"&&et!==null&&et.$$typeof===oe&&Hg(et)===at.type){o(re,at.sibling),Q=p(at,ue.props),Q.ref=ul(re,at,ue),Q.return=re,re=Q;break e}o(re,at);break}else s(re,at);at=at.sibling}ue.type===O?(Q=na(ue.props.children,re.mode,Ce,ue.key),Q.return=re,re=Q):(Ce=eu(ue.type,ue.key,ue.props,null,re.mode,Ce),Ce.ref=ul(re,Q,ue),Ce.return=re,re=Ce)}return R(re);case N:e:{for(at=ue.key;Q!==null;){if(Q.key===at)if(Q.tag===4&&Q.stateNode.containerInfo===ue.containerInfo&&Q.stateNode.implementation===ue.implementation){o(re,Q.sibling),Q=p(Q,ue.children||[]),Q.return=re,re=Q;break e}else{o(re,Q);break}else s(re,Q);Q=Q.sibling}Q=$h(ue,re.mode,Ce),Q.return=re,re=Q}return R(re);case oe:return at=ue._init,mn(re,Q,at(ue._payload),Ce)}if($t(ue))return qe(re,Q,ue,Ce);if(he(ue))return Qe(re,Q,ue,Ce);Pc(re,ue)}return typeof ue=="string"&&ue!==""||typeof ue=="number"?(ue=""+ue,Q!==null&&Q.tag===6?(o(re,Q.sibling),Q=p(Q,ue),Q.return=re,re=Q):(o(re,Q),Q=Xh(ue,re.mode,Ce),Q.return=re,re=Q),R(re)):o(re,Q)}return mn}var Va=Vg(!0),Gg=Vg(!1),Nc=rs(null),Lc=null,Ga=null,nh=null;function ih(){nh=Ga=Lc=null}function rh(n){var s=Nc.current;Jt(Nc),n._currentValue=s}function sh(n,s,o){for(;n!==null;){var u=n.alternate;if((n.childLanes&s)!==s?(n.childLanes|=s,u!==null&&(u.childLanes|=s)):u!==null&&(u.childLanes&s)!==s&&(u.childLanes|=s),n===o)break;n=n.return}}function ja(n,s){Lc=n,nh=Ga=null,n=n.dependencies,n!==null&&n.firstContext!==null&&((n.lanes&s)!==0&&(ri=!0),n.firstContext=null)}function Ci(n){var s=n._currentValue;if(nh!==n)if(n={context:n,memoizedValue:s,next:null},Ga===null){if(Lc===null)throw Error(t(308));Ga=n,Lc.dependencies={lanes:0,firstContext:n}}else Ga=Ga.next=n;return s}var Ys=null;function ah(n){Ys===null?Ys=[n]:Ys.push(n)}function jg(n,s,o,u){var p=s.interleaved;return p===null?(o.next=o,ah(s)):(o.next=p.next,p.next=o),s.interleaved=o,Tr(n,u)}function Tr(n,s){n.lanes|=s;var o=n.alternate;for(o!==null&&(o.lanes|=s),o=n,n=n.return;n!==null;)n.childLanes|=s,o=n.alternate,o!==null&&(o.childLanes|=s),o=n,n=n.return;return o.tag===3?o.stateNode:null}var os=!1;function oh(n){n.updateQueue={baseState:n.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function Wg(n,s){n=n.updateQueue,s.updateQueue===n&&(s.updateQueue={baseState:n.baseState,firstBaseUpdate:n.firstBaseUpdate,lastBaseUpdate:n.lastBaseUpdate,shared:n.shared,effects:n.effects})}function Cr(n,s){return{eventTime:n,lane:s,tag:0,payload:null,callback:null,next:null}}function ls(n,s,o){var u=n.updateQueue;if(u===null)return null;if(u=u.shared,(Lt&2)!==0){var p=u.pending;return p===null?s.next=s:(s.next=p.next,p.next=s),u.pending=s,Tr(n,o)}return p=u.interleaved,p===null?(s.next=s,ah(u)):(s.next=p.next,p.next=s),u.interleaved=s,Tr(n,o)}function Dc(n,s,o){if(s=s.updateQueue,s!==null&&(s=s.shared,(o&4194240)!==0)){var u=s.lanes;u&=n.pendingLanes,o|=u,s.lanes=o,ti(n,o)}}function Xg(n,s){var o=n.updateQueue,u=n.alternate;if(u!==null&&(u=u.updateQueue,o===u)){var p=null,S=null;if(o=o.firstBaseUpdate,o!==null){do{var R={eventTime:o.eventTime,lane:o.lane,tag:o.tag,payload:o.payload,callback:o.callback,next:null};S===null?p=S=R:S=S.next=R,o=o.next}while(o!==null);S===null?p=S=s:S=S.next=s}else p=S=s;o={baseState:u.baseState,firstBaseUpdate:p,lastBaseUpdate:S,shared:u.shared,effects:u.effects},n.updateQueue=o;return}n=o.lastBaseUpdate,n===null?o.firstBaseUpdate=s:n.next=s,o.lastBaseUpdate=s}function Ic(n,s,o,u){var p=n.updateQueue;os=!1;var S=p.firstBaseUpdate,R=p.lastBaseUpdate,B=p.shared.pending;if(B!==null){p.shared.pending=null;var X=B,pe=X.next;X.next=null,R===null?S=pe:R.next=pe,R=X;var be=n.alternate;be!==null&&(be=be.updateQueue,B=be.lastBaseUpdate,B!==R&&(B===null?be.firstBaseUpdate=pe:B.next=pe,be.lastBaseUpdate=X))}if(S!==null){var Te=p.baseState;R=0,be=pe=X=null,B=S;do{var we=B.lane,Ve=B.eventTime;if((u&we)===we){be!==null&&(be=be.next={eventTime:Ve,lane:0,tag:B.tag,payload:B.payload,callback:B.callback,next:null});e:{var qe=n,Qe=B;switch(we=s,Ve=o,Qe.tag){case 1:if(qe=Qe.payload,typeof qe=="function"){Te=qe.call(Ve,Te,we);break e}Te=qe;break e;case 3:qe.flags=qe.flags&-65537|128;case 0:if(qe=Qe.payload,we=typeof qe=="function"?qe.call(Ve,Te,we):qe,we==null)break e;Te=de({},Te,we);break e;case 2:os=!0}}B.callback!==null&&B.lane!==0&&(n.flags|=64,we=p.effects,we===null?p.effects=[B]:we.push(B))}else Ve={eventTime:Ve,lane:we,tag:B.tag,payload:B.payload,callback:B.callback,next:null},be===null?(pe=be=Ve,X=Te):be=be.next=Ve,R|=we;if(B=B.next,B===null){if(B=p.shared.pending,B===null)break;we=B,B=we.next,we.next=null,p.lastBaseUpdate=we,p.shared.pending=null}}while(!0);if(be===null&&(X=Te),p.baseState=X,p.firstBaseUpdate=pe,p.lastBaseUpdate=be,s=p.shared.interleaved,s!==null){p=s;do R|=p.lane,p=p.next;while(p!==s)}else S===null&&(p.shared.lanes=0);Zs|=R,n.lanes=R,n.memoizedState=Te}}function $g(n,s,o){if(n=s.effects,s.effects=null,n!==null)for(s=0;s<n.length;s++){var u=n[s],p=u.callback;if(p!==null){if(u.callback=null,u=o,typeof p!="function")throw Error(t(191,p));p.call(u)}}}var dl={},ir=rs(dl),hl=rs(dl),fl=rs(dl);function Ks(n){if(n===dl)throw Error(t(174));return n}function lh(n,s){switch(Kt(fl,s),Kt(hl,n),Kt(ir,dl),n=s.nodeType,n){case 9:case 11:s=(s=s.documentElement)?s.namespaceURI:C(null,"");break;default:n=n===8?s.parentNode:s,s=n.namespaceURI||null,n=n.tagName,s=C(s,n)}Jt(ir),Kt(ir,s)}function Wa(){Jt(ir),Jt(hl),Jt(fl)}function qg(n){Ks(fl.current);var s=Ks(ir.current),o=C(s,n.type);s!==o&&(Kt(hl,n),Kt(ir,o))}function ch(n){hl.current===n&&(Jt(ir),Jt(hl))}var ln=rs(0);function Uc(n){for(var s=n;s!==null;){if(s.tag===13){var o=s.memoizedState;if(o!==null&&(o=o.dehydrated,o===null||o.data==="$?"||o.data==="$!"))return s}else if(s.tag===19&&s.memoizedProps.revealOrder!==void 0){if((s.flags&128)!==0)return s}else if(s.child!==null){s.child.return=s,s=s.child;continue}if(s===n)break;for(;s.sibling===null;){if(s.return===null||s.return===n)return null;s=s.return}s.sibling.return=s.return,s=s.sibling}return null}var uh=[];function dh(){for(var n=0;n<uh.length;n++)uh[n]._workInProgressVersionPrimary=null;uh.length=0}var Fc=T.ReactCurrentDispatcher,hh=T.ReactCurrentBatchConfig,Qs=0,cn=null,yn=null,Cn=null,Oc=!1,pl=!1,ml=0,IS=0;function zn(){throw Error(t(321))}function fh(n,s){if(s===null)return!1;for(var o=0;o<s.length&&o<n.length;o++)if(!ki(n[o],s[o]))return!1;return!0}function ph(n,s,o,u,p,S){if(Qs=S,cn=s,s.memoizedState=null,s.updateQueue=null,s.lanes=0,Fc.current=n===null||n.memoizedState===null?kS:zS,n=o(u,p),pl){S=0;do{if(pl=!1,ml=0,25<=S)throw Error(t(301));S+=1,Cn=yn=null,s.updateQueue=null,Fc.current=BS,n=o(u,p)}while(pl)}if(Fc.current=Bc,s=yn!==null&&yn.next!==null,Qs=0,Cn=yn=cn=null,Oc=!1,s)throw Error(t(300));return n}function mh(){var n=ml!==0;return ml=0,n}function rr(){var n={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Cn===null?cn.memoizedState=Cn=n:Cn=Cn.next=n,Cn}function Ri(){if(yn===null){var n=cn.alternate;n=n!==null?n.memoizedState:null}else n=yn.next;var s=Cn===null?cn.memoizedState:Cn.next;if(s!==null)Cn=s,yn=n;else{if(n===null)throw Error(t(310));yn=n,n={memoizedState:yn.memoizedState,baseState:yn.baseState,baseQueue:yn.baseQueue,queue:yn.queue,next:null},Cn===null?cn.memoizedState=Cn=n:Cn=Cn.next=n}return Cn}function gl(n,s){return typeof s=="function"?s(n):s}function gh(n){var s=Ri(),o=s.queue;if(o===null)throw Error(t(311));o.lastRenderedReducer=n;var u=yn,p=u.baseQueue,S=o.pending;if(S!==null){if(p!==null){var R=p.next;p.next=S.next,S.next=R}u.baseQueue=p=S,o.pending=null}if(p!==null){S=p.next,u=u.baseState;var B=R=null,X=null,pe=S;do{var be=pe.lane;if((Qs&be)===be)X!==null&&(X=X.next={lane:0,action:pe.action,hasEagerState:pe.hasEagerState,eagerState:pe.eagerState,next:null}),u=pe.hasEagerState?pe.eagerState:n(u,pe.action);else{var Te={lane:be,action:pe.action,hasEagerState:pe.hasEagerState,eagerState:pe.eagerState,next:null};X===null?(B=X=Te,R=u):X=X.next=Te,cn.lanes|=be,Zs|=be}pe=pe.next}while(pe!==null&&pe!==S);X===null?R=u:X.next=B,ki(u,s.memoizedState)||(ri=!0),s.memoizedState=u,s.baseState=R,s.baseQueue=X,o.lastRenderedState=u}if(n=o.interleaved,n!==null){p=n;do S=p.lane,cn.lanes|=S,Zs|=S,p=p.next;while(p!==n)}else p===null&&(o.lanes=0);return[s.memoizedState,o.dispatch]}function xh(n){var s=Ri(),o=s.queue;if(o===null)throw Error(t(311));o.lastRenderedReducer=n;var u=o.dispatch,p=o.pending,S=s.memoizedState;if(p!==null){o.pending=null;var R=p=p.next;do S=n(S,R.action),R=R.next;while(R!==p);ki(S,s.memoizedState)||(ri=!0),s.memoizedState=S,s.baseQueue===null&&(s.baseState=S),o.lastRenderedState=S}return[S,u]}function Yg(){}function Kg(n,s){var o=cn,u=Ri(),p=s(),S=!ki(u.memoizedState,p);if(S&&(u.memoizedState=p,ri=!0),u=u.queue,vh(Jg.bind(null,o,u,n),[n]),u.getSnapshot!==s||S||Cn!==null&&Cn.memoizedState.tag&1){if(o.flags|=2048,xl(9,Zg.bind(null,o,u,p,s),void 0,null),Rn===null)throw Error(t(349));(Qs&30)!==0||Qg(o,s,p)}return p}function Qg(n,s,o){n.flags|=16384,n={getSnapshot:s,value:o},s=cn.updateQueue,s===null?(s={lastEffect:null,stores:null},cn.updateQueue=s,s.stores=[n]):(o=s.stores,o===null?s.stores=[n]:o.push(n))}function Zg(n,s,o,u){s.value=o,s.getSnapshot=u,e0(s)&&t0(n)}function Jg(n,s,o){return o(function(){e0(s)&&t0(n)})}function e0(n){var s=n.getSnapshot;n=n.value;try{var o=s();return!ki(n,o)}catch{return!0}}function t0(n){var s=Tr(n,1);s!==null&&Gi(s,n,1,-1)}function n0(n){var s=rr();return typeof n=="function"&&(n=n()),s.memoizedState=s.baseState=n,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:gl,lastRenderedState:n},s.queue=n,n=n.dispatch=OS.bind(null,cn,n),[s.memoizedState,n]}function xl(n,s,o,u){return n={tag:n,create:s,destroy:o,deps:u,next:null},s=cn.updateQueue,s===null?(s={lastEffect:null,stores:null},cn.updateQueue=s,s.lastEffect=n.next=n):(o=s.lastEffect,o===null?s.lastEffect=n.next=n:(u=o.next,o.next=n,n.next=u,s.lastEffect=n)),n}function i0(){return Ri().memoizedState}function kc(n,s,o,u){var p=rr();cn.flags|=n,p.memoizedState=xl(1|s,o,void 0,u===void 0?null:u)}function zc(n,s,o,u){var p=Ri();u=u===void 0?null:u;var S=void 0;if(yn!==null){var R=yn.memoizedState;if(S=R.destroy,u!==null&&fh(u,R.deps)){p.memoizedState=xl(s,o,S,u);return}}cn.flags|=n,p.memoizedState=xl(1|s,o,S,u)}function r0(n,s){return kc(8390656,8,n,s)}function vh(n,s){return zc(2048,8,n,s)}function s0(n,s){return zc(4,2,n,s)}function a0(n,s){return zc(4,4,n,s)}function o0(n,s){if(typeof s=="function")return n=n(),s(n),function(){s(null)};if(s!=null)return n=n(),s.current=n,function(){s.current=null}}function l0(n,s,o){return o=o!=null?o.concat([n]):null,zc(4,4,o0.bind(null,s,n),o)}function _h(){}function c0(n,s){var o=Ri();s=s===void 0?null:s;var u=o.memoizedState;return u!==null&&s!==null&&fh(s,u[1])?u[0]:(o.memoizedState=[n,s],n)}function u0(n,s){var o=Ri();s=s===void 0?null:s;var u=o.memoizedState;return u!==null&&s!==null&&fh(s,u[1])?u[0]:(n=n(),o.memoizedState=[n,s],n)}function d0(n,s,o){return(Qs&21)===0?(n.baseState&&(n.baseState=!1,ri=!0),n.memoizedState=o):(ki(o,s)||(o=He(),cn.lanes|=o,Zs|=o,n.baseState=!0),s)}function US(n,s){var o=St;St=o!==0&&4>o?o:4,n(!0);var u=hh.transition;hh.transition={};try{n(!1),s()}finally{St=o,hh.transition=u}}function h0(){return Ri().memoizedState}function FS(n,s,o){var u=hs(n);if(o={lane:u,action:o,hasEagerState:!1,eagerState:null,next:null},f0(n))p0(s,o);else if(o=jg(n,s,o,u),o!==null){var p=Yn();Gi(o,n,u,p),m0(o,s,u)}}function OS(n,s,o){var u=hs(n),p={lane:u,action:o,hasEagerState:!1,eagerState:null,next:null};if(f0(n))p0(s,p);else{var S=n.alternate;if(n.lanes===0&&(S===null||S.lanes===0)&&(S=s.lastRenderedReducer,S!==null))try{var R=s.lastRenderedState,B=S(R,o);if(p.hasEagerState=!0,p.eagerState=B,ki(B,R)){var X=s.interleaved;X===null?(p.next=p,ah(s)):(p.next=X.next,X.next=p),s.interleaved=p;return}}catch{}finally{}o=jg(n,s,p,u),o!==null&&(p=Yn(),Gi(o,n,u,p),m0(o,s,u))}}function f0(n){var s=n.alternate;return n===cn||s!==null&&s===cn}function p0(n,s){pl=Oc=!0;var o=n.pending;o===null?s.next=s:(s.next=o.next,o.next=s),n.pending=s}function m0(n,s,o){if((o&4194240)!==0){var u=s.lanes;u&=n.pendingLanes,o|=u,s.lanes=o,ti(n,o)}}var Bc={readContext:Ci,useCallback:zn,useContext:zn,useEffect:zn,useImperativeHandle:zn,useInsertionEffect:zn,useLayoutEffect:zn,useMemo:zn,useReducer:zn,useRef:zn,useState:zn,useDebugValue:zn,useDeferredValue:zn,useTransition:zn,useMutableSource:zn,useSyncExternalStore:zn,useId:zn,unstable_isNewReconciler:!1},kS={readContext:Ci,useCallback:function(n,s){return rr().memoizedState=[n,s===void 0?null:s],n},useContext:Ci,useEffect:r0,useImperativeHandle:function(n,s,o){return o=o!=null?o.concat([n]):null,kc(4194308,4,o0.bind(null,s,n),o)},useLayoutEffect:function(n,s){return kc(4194308,4,n,s)},useInsertionEffect:function(n,s){return kc(4,2,n,s)},useMemo:function(n,s){var o=rr();return s=s===void 0?null:s,n=n(),o.memoizedState=[n,s],n},useReducer:function(n,s,o){var u=rr();return s=o!==void 0?o(s):s,u.memoizedState=u.baseState=s,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:n,lastRenderedState:s},u.queue=n,n=n.dispatch=FS.bind(null,cn,n),[u.memoizedState,n]},useRef:function(n){var s=rr();return n={current:n},s.memoizedState=n},useState:n0,useDebugValue:_h,useDeferredValue:function(n){return rr().memoizedState=n},useTransition:function(){var n=n0(!1),s=n[0];return n=US.bind(null,n[1]),rr().memoizedState=n,[s,n]},useMutableSource:function(){},useSyncExternalStore:function(n,s,o){var u=cn,p=rr();if(tn){if(o===void 0)throw Error(t(407));o=o()}else{if(o=s(),Rn===null)throw Error(t(349));(Qs&30)!==0||Qg(u,s,o)}p.memoizedState=o;var S={value:o,getSnapshot:s};return p.queue=S,r0(Jg.bind(null,u,S,n),[n]),u.flags|=2048,xl(9,Zg.bind(null,u,S,o,s),void 0,null),o},useId:function(){var n=rr(),s=Rn.identifierPrefix;if(tn){var o=br,u=wr;o=(u&~(1<<32-Ae(u)-1)).toString(32)+o,s=":"+s+"R"+o,o=ml++,0<o&&(s+="H"+o.toString(32)),s+=":"}else o=IS++,s=":"+s+"r"+o.toString(32)+":";return n.memoizedState=s},unstable_isNewReconciler:!1},zS={readContext:Ci,useCallback:c0,useContext:Ci,useEffect:vh,useImperativeHandle:l0,useInsertionEffect:s0,useLayoutEffect:a0,useMemo:u0,useReducer:gh,useRef:i0,useState:function(){return gh(gl)},useDebugValue:_h,useDeferredValue:function(n){var s=Ri();return d0(s,yn.memoizedState,n)},useTransition:function(){var n=gh(gl)[0],s=Ri().memoizedState;return[n,s]},useMutableSource:Yg,useSyncExternalStore:Kg,useId:h0,unstable_isNewReconciler:!1},BS={readContext:Ci,useCallback:c0,useContext:Ci,useEffect:vh,useImperativeHandle:l0,useInsertionEffect:s0,useLayoutEffect:a0,useMemo:u0,useReducer:xh,useRef:i0,useState:function(){return xh(gl)},useDebugValue:_h,useDeferredValue:function(n){var s=Ri();return yn===null?s.memoizedState=n:d0(s,yn.memoizedState,n)},useTransition:function(){var n=xh(gl)[0],s=Ri().memoizedState;return[n,s]},useMutableSource:Yg,useSyncExternalStore:Kg,useId:h0,unstable_isNewReconciler:!1};function Bi(n,s){if(n&&n.defaultProps){s=de({},s),n=n.defaultProps;for(var o in n)s[o]===void 0&&(s[o]=n[o]);return s}return s}function yh(n,s,o,u){s=n.memoizedState,o=o(u,s),o=o==null?s:de({},s,o),n.memoizedState=o,n.lanes===0&&(n.updateQueue.baseState=o)}var Hc={isMounted:function(n){return(n=n._reactInternals)?$n(n)===n:!1},enqueueSetState:function(n,s,o){n=n._reactInternals;var u=Yn(),p=hs(n),S=Cr(u,p);S.payload=s,o!=null&&(S.callback=o),s=ls(n,S,p),s!==null&&(Gi(s,n,p,u),Dc(s,n,p))},enqueueReplaceState:function(n,s,o){n=n._reactInternals;var u=Yn(),p=hs(n),S=Cr(u,p);S.tag=1,S.payload=s,o!=null&&(S.callback=o),s=ls(n,S,p),s!==null&&(Gi(s,n,p,u),Dc(s,n,p))},enqueueForceUpdate:function(n,s){n=n._reactInternals;var o=Yn(),u=hs(n),p=Cr(o,u);p.tag=2,s!=null&&(p.callback=s),s=ls(n,p,u),s!==null&&(Gi(s,n,u,o),Dc(s,n,u))}};function g0(n,s,o,u,p,S,R){return n=n.stateNode,typeof n.shouldComponentUpdate=="function"?n.shouldComponentUpdate(u,S,R):s.prototype&&s.prototype.isPureReactComponent?!il(o,u)||!il(p,S):!0}function x0(n,s,o){var u=!1,p=ss,S=s.contextType;return typeof S=="object"&&S!==null?S=Ci(S):(p=ii(s)?Xs:kn.current,u=s.contextTypes,S=(u=u!=null)?ka(n,p):ss),s=new s(o,S),n.memoizedState=s.state!==null&&s.state!==void 0?s.state:null,s.updater=Hc,n.stateNode=s,s._reactInternals=n,u&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=p,n.__reactInternalMemoizedMaskedChildContext=S),s}function v0(n,s,o,u){n=s.state,typeof s.componentWillReceiveProps=="function"&&s.componentWillReceiveProps(o,u),typeof s.UNSAFE_componentWillReceiveProps=="function"&&s.UNSAFE_componentWillReceiveProps(o,u),s.state!==n&&Hc.enqueueReplaceState(s,s.state,null)}function Sh(n,s,o,u){var p=n.stateNode;p.props=o,p.state=n.memoizedState,p.refs={},oh(n);var S=s.contextType;typeof S=="object"&&S!==null?p.context=Ci(S):(S=ii(s)?Xs:kn.current,p.context=ka(n,S)),p.state=n.memoizedState,S=s.getDerivedStateFromProps,typeof S=="function"&&(yh(n,s,S,o),p.state=n.memoizedState),typeof s.getDerivedStateFromProps=="function"||typeof p.getSnapshotBeforeUpdate=="function"||typeof p.UNSAFE_componentWillMount!="function"&&typeof p.componentWillMount!="function"||(s=p.state,typeof p.componentWillMount=="function"&&p.componentWillMount(),typeof p.UNSAFE_componentWillMount=="function"&&p.UNSAFE_componentWillMount(),s!==p.state&&Hc.enqueueReplaceState(p,p.state,null),Ic(n,o,p,u),p.state=n.memoizedState),typeof p.componentDidMount=="function"&&(n.flags|=4194308)}function Xa(n,s){try{var o="",u=s;do o+=Ge(u),u=u.return;while(u);var p=o}catch(S){p=`
Error generating stack: `+S.message+`
`+S.stack}return{value:n,source:s,stack:p,digest:null}}function Mh(n,s,o){return{value:n,source:null,stack:o??null,digest:s??null}}function Eh(n,s){try{console.error(s.value)}catch(o){setTimeout(function(){throw o})}}var HS=typeof WeakMap=="function"?WeakMap:Map;function _0(n,s,o){o=Cr(-1,o),o.tag=3,o.payload={element:null};var u=s.value;return o.callback=function(){qc||(qc=!0,kh=u),Eh(n,s)},o}function y0(n,s,o){o=Cr(-1,o),o.tag=3;var u=n.type.getDerivedStateFromError;if(typeof u=="function"){var p=s.value;o.payload=function(){return u(p)},o.callback=function(){Eh(n,s)}}var S=n.stateNode;return S!==null&&typeof S.componentDidCatch=="function"&&(o.callback=function(){Eh(n,s),typeof u!="function"&&(us===null?us=new Set([this]):us.add(this));var R=s.stack;this.componentDidCatch(s.value,{componentStack:R!==null?R:""})}),o}function S0(n,s,o){var u=n.pingCache;if(u===null){u=n.pingCache=new HS;var p=new Set;u.set(s,p)}else p=u.get(s),p===void 0&&(p=new Set,u.set(s,p));p.has(o)||(p.add(o),n=tM.bind(null,n,s,o),s.then(n,n))}function M0(n){do{var s;if((s=n.tag===13)&&(s=n.memoizedState,s=s!==null?s.dehydrated!==null:!0),s)return n;n=n.return}while(n!==null);return null}function E0(n,s,o,u,p){return(n.mode&1)===0?(n===s?n.flags|=65536:(n.flags|=128,o.flags|=131072,o.flags&=-52805,o.tag===1&&(o.alternate===null?o.tag=17:(s=Cr(-1,1),s.tag=2,ls(o,s,1))),o.lanes|=1),n):(n.flags|=65536,n.lanes=p,n)}var VS=T.ReactCurrentOwner,ri=!1;function qn(n,s,o,u){s.child=n===null?Gg(s,null,o,u):Va(s,n.child,o,u)}function w0(n,s,o,u,p){o=o.render;var S=s.ref;return ja(s,p),u=ph(n,s,o,u,S,p),o=mh(),n!==null&&!ri?(s.updateQueue=n.updateQueue,s.flags&=-2053,n.lanes&=~p,Rr(n,s,p)):(tn&&o&&Qd(s),s.flags|=1,qn(n,s,u,p),s.child)}function b0(n,s,o,u,p){if(n===null){var S=o.type;return typeof S=="function"&&!Wh(S)&&S.defaultProps===void 0&&o.compare===null&&o.defaultProps===void 0?(s.tag=15,s.type=S,T0(n,s,S,u,p)):(n=eu(o.type,null,u,s,s.mode,p),n.ref=s.ref,n.return=s,s.child=n)}if(S=n.child,(n.lanes&p)===0){var R=S.memoizedProps;if(o=o.compare,o=o!==null?o:il,o(R,u)&&n.ref===s.ref)return Rr(n,s,p)}return s.flags|=1,n=ps(S,u),n.ref=s.ref,n.return=s,s.child=n}function T0(n,s,o,u,p){if(n!==null){var S=n.memoizedProps;if(il(S,u)&&n.ref===s.ref)if(ri=!1,s.pendingProps=u=S,(n.lanes&p)!==0)(n.flags&131072)!==0&&(ri=!0);else return s.lanes=n.lanes,Rr(n,s,p)}return wh(n,s,o,u,p)}function C0(n,s,o){var u=s.pendingProps,p=u.children,S=n!==null?n.memoizedState:null;if(u.mode==="hidden")if((s.mode&1)===0)s.memoizedState={baseLanes:0,cachePool:null,transitions:null},Kt(qa,gi),gi|=o;else{if((o&1073741824)===0)return n=S!==null?S.baseLanes|o:o,s.lanes=s.childLanes=1073741824,s.memoizedState={baseLanes:n,cachePool:null,transitions:null},s.updateQueue=null,Kt(qa,gi),gi|=n,null;s.memoizedState={baseLanes:0,cachePool:null,transitions:null},u=S!==null?S.baseLanes:o,Kt(qa,gi),gi|=u}else S!==null?(u=S.baseLanes|o,s.memoizedState=null):u=o,Kt(qa,gi),gi|=u;return qn(n,s,p,o),s.child}function R0(n,s){var o=s.ref;(n===null&&o!==null||n!==null&&n.ref!==o)&&(s.flags|=512,s.flags|=2097152)}function wh(n,s,o,u,p){var S=ii(o)?Xs:kn.current;return S=ka(s,S),ja(s,p),o=ph(n,s,o,u,S,p),u=mh(),n!==null&&!ri?(s.updateQueue=n.updateQueue,s.flags&=-2053,n.lanes&=~p,Rr(n,s,p)):(tn&&u&&Qd(s),s.flags|=1,qn(n,s,o,p),s.child)}function A0(n,s,o,u,p){if(ii(o)){var S=!0;bc(s)}else S=!1;if(ja(s,p),s.stateNode===null)Gc(n,s),x0(s,o,u),Sh(s,o,u,p),u=!0;else if(n===null){var R=s.stateNode,B=s.memoizedProps;R.props=B;var X=R.context,pe=o.contextType;typeof pe=="object"&&pe!==null?pe=Ci(pe):(pe=ii(o)?Xs:kn.current,pe=ka(s,pe));var be=o.getDerivedStateFromProps,Te=typeof be=="function"||typeof R.getSnapshotBeforeUpdate=="function";Te||typeof R.UNSAFE_componentWillReceiveProps!="function"&&typeof R.componentWillReceiveProps!="function"||(B!==u||X!==pe)&&v0(s,R,u,pe),os=!1;var we=s.memoizedState;R.state=we,Ic(s,u,R,p),X=s.memoizedState,B!==u||we!==X||ni.current||os?(typeof be=="function"&&(yh(s,o,be,u),X=s.memoizedState),(B=os||g0(s,o,B,u,we,X,pe))?(Te||typeof R.UNSAFE_componentWillMount!="function"&&typeof R.componentWillMount!="function"||(typeof R.componentWillMount=="function"&&R.componentWillMount(),typeof R.UNSAFE_componentWillMount=="function"&&R.UNSAFE_componentWillMount()),typeof R.componentDidMount=="function"&&(s.flags|=4194308)):(typeof R.componentDidMount=="function"&&(s.flags|=4194308),s.memoizedProps=u,s.memoizedState=X),R.props=u,R.state=X,R.context=pe,u=B):(typeof R.componentDidMount=="function"&&(s.flags|=4194308),u=!1)}else{R=s.stateNode,Wg(n,s),B=s.memoizedProps,pe=s.type===s.elementType?B:Bi(s.type,B),R.props=pe,Te=s.pendingProps,we=R.context,X=o.contextType,typeof X=="object"&&X!==null?X=Ci(X):(X=ii(o)?Xs:kn.current,X=ka(s,X));var Ve=o.getDerivedStateFromProps;(be=typeof Ve=="function"||typeof R.getSnapshotBeforeUpdate=="function")||typeof R.UNSAFE_componentWillReceiveProps!="function"&&typeof R.componentWillReceiveProps!="function"||(B!==Te||we!==X)&&v0(s,R,u,X),os=!1,we=s.memoizedState,R.state=we,Ic(s,u,R,p);var qe=s.memoizedState;B!==Te||we!==qe||ni.current||os?(typeof Ve=="function"&&(yh(s,o,Ve,u),qe=s.memoizedState),(pe=os||g0(s,o,pe,u,we,qe,X)||!1)?(be||typeof R.UNSAFE_componentWillUpdate!="function"&&typeof R.componentWillUpdate!="function"||(typeof R.componentWillUpdate=="function"&&R.componentWillUpdate(u,qe,X),typeof R.UNSAFE_componentWillUpdate=="function"&&R.UNSAFE_componentWillUpdate(u,qe,X)),typeof R.componentDidUpdate=="function"&&(s.flags|=4),typeof R.getSnapshotBeforeUpdate=="function"&&(s.flags|=1024)):(typeof R.componentDidUpdate!="function"||B===n.memoizedProps&&we===n.memoizedState||(s.flags|=4),typeof R.getSnapshotBeforeUpdate!="function"||B===n.memoizedProps&&we===n.memoizedState||(s.flags|=1024),s.memoizedProps=u,s.memoizedState=qe),R.props=u,R.state=qe,R.context=X,u=pe):(typeof R.componentDidUpdate!="function"||B===n.memoizedProps&&we===n.memoizedState||(s.flags|=4),typeof R.getSnapshotBeforeUpdate!="function"||B===n.memoizedProps&&we===n.memoizedState||(s.flags|=1024),u=!1)}return bh(n,s,o,u,S,p)}function bh(n,s,o,u,p,S){R0(n,s);var R=(s.flags&128)!==0;if(!u&&!R)return p&&Ig(s,o,!1),Rr(n,s,S);u=s.stateNode,VS.current=s;var B=R&&typeof o.getDerivedStateFromError!="function"?null:u.render();return s.flags|=1,n!==null&&R?(s.child=Va(s,n.child,null,S),s.child=Va(s,null,B,S)):qn(n,s,B,S),s.memoizedState=u.state,p&&Ig(s,o,!0),s.child}function P0(n){var s=n.stateNode;s.pendingContext?Lg(n,s.pendingContext,s.pendingContext!==s.context):s.context&&Lg(n,s.context,!1),lh(n,s.containerInfo)}function N0(n,s,o,u,p){return Ha(),th(p),s.flags|=256,qn(n,s,o,u),s.child}var Th={dehydrated:null,treeContext:null,retryLane:0};function Ch(n){return{baseLanes:n,cachePool:null,transitions:null}}function L0(n,s,o){var u=s.pendingProps,p=ln.current,S=!1,R=(s.flags&128)!==0,B;if((B=R)||(B=n!==null&&n.memoizedState===null?!1:(p&2)!==0),B?(S=!0,s.flags&=-129):(n===null||n.memoizedState!==null)&&(p|=1),Kt(ln,p&1),n===null)return eh(s),n=s.memoizedState,n!==null&&(n=n.dehydrated,n!==null)?((s.mode&1)===0?s.lanes=1:n.data==="$!"?s.lanes=8:s.lanes=1073741824,null):(R=u.children,n=u.fallback,S?(u=s.mode,S=s.child,R={mode:"hidden",children:R},(u&1)===0&&S!==null?(S.childLanes=0,S.pendingProps=R):S=tu(R,u,0,null),n=na(n,u,o,null),S.return=s,n.return=s,S.sibling=n,s.child=S,s.child.memoizedState=Ch(o),s.memoizedState=Th,n):Rh(s,R));if(p=n.memoizedState,p!==null&&(B=p.dehydrated,B!==null))return GS(n,s,R,u,B,p,o);if(S){S=u.fallback,R=s.mode,p=n.child,B=p.sibling;var X={mode:"hidden",children:u.children};return(R&1)===0&&s.child!==p?(u=s.child,u.childLanes=0,u.pendingProps=X,s.deletions=null):(u=ps(p,X),u.subtreeFlags=p.subtreeFlags&14680064),B!==null?S=ps(B,S):(S=na(S,R,o,null),S.flags|=2),S.return=s,u.return=s,u.sibling=S,s.child=u,u=S,S=s.child,R=n.child.memoizedState,R=R===null?Ch(o):{baseLanes:R.baseLanes|o,cachePool:null,transitions:R.transitions},S.memoizedState=R,S.childLanes=n.childLanes&~o,s.memoizedState=Th,u}return S=n.child,n=S.sibling,u=ps(S,{mode:"visible",children:u.children}),(s.mode&1)===0&&(u.lanes=o),u.return=s,u.sibling=null,n!==null&&(o=s.deletions,o===null?(s.deletions=[n],s.flags|=16):o.push(n)),s.child=u,s.memoizedState=null,u}function Rh(n,s){return s=tu({mode:"visible",children:s},n.mode,0,null),s.return=n,n.child=s}function Vc(n,s,o,u){return u!==null&&th(u),Va(s,n.child,null,o),n=Rh(s,s.pendingProps.children),n.flags|=2,s.memoizedState=null,n}function GS(n,s,o,u,p,S,R){if(o)return s.flags&256?(s.flags&=-257,u=Mh(Error(t(422))),Vc(n,s,R,u)):s.memoizedState!==null?(s.child=n.child,s.flags|=128,null):(S=u.fallback,p=s.mode,u=tu({mode:"visible",children:u.children},p,0,null),S=na(S,p,R,null),S.flags|=2,u.return=s,S.return=s,u.sibling=S,s.child=u,(s.mode&1)!==0&&Va(s,n.child,null,R),s.child.memoizedState=Ch(R),s.memoizedState=Th,S);if((s.mode&1)===0)return Vc(n,s,R,null);if(p.data==="$!"){if(u=p.nextSibling&&p.nextSibling.dataset,u)var B=u.dgst;return u=B,S=Error(t(419)),u=Mh(S,u,void 0),Vc(n,s,R,u)}if(B=(R&n.childLanes)!==0,ri||B){if(u=Rn,u!==null){switch(R&-R){case 4:p=2;break;case 16:p=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:p=32;break;case 536870912:p=268435456;break;default:p=0}p=(p&(u.suspendedLanes|R))!==0?0:p,p!==0&&p!==S.retryLane&&(S.retryLane=p,Tr(n,p),Gi(u,n,p,-1))}return jh(),u=Mh(Error(t(421))),Vc(n,s,R,u)}return p.data==="$?"?(s.flags|=128,s.child=n.child,s=nM.bind(null,n),p._reactRetry=s,null):(n=S.treeContext,mi=is(p.nextSibling),pi=s,tn=!0,zi=null,n!==null&&(bi[Ti++]=wr,bi[Ti++]=br,bi[Ti++]=$s,wr=n.id,br=n.overflow,$s=s),s=Rh(s,u.children),s.flags|=4096,s)}function D0(n,s,o){n.lanes|=s;var u=n.alternate;u!==null&&(u.lanes|=s),sh(n.return,s,o)}function Ah(n,s,o,u,p){var S=n.memoizedState;S===null?n.memoizedState={isBackwards:s,rendering:null,renderingStartTime:0,last:u,tail:o,tailMode:p}:(S.isBackwards=s,S.rendering=null,S.renderingStartTime=0,S.last=u,S.tail=o,S.tailMode=p)}function I0(n,s,o){var u=s.pendingProps,p=u.revealOrder,S=u.tail;if(qn(n,s,u.children,o),u=ln.current,(u&2)!==0)u=u&1|2,s.flags|=128;else{if(n!==null&&(n.flags&128)!==0)e:for(n=s.child;n!==null;){if(n.tag===13)n.memoizedState!==null&&D0(n,o,s);else if(n.tag===19)D0(n,o,s);else if(n.child!==null){n.child.return=n,n=n.child;continue}if(n===s)break e;for(;n.sibling===null;){if(n.return===null||n.return===s)break e;n=n.return}n.sibling.return=n.return,n=n.sibling}u&=1}if(Kt(ln,u),(s.mode&1)===0)s.memoizedState=null;else switch(p){case"forwards":for(o=s.child,p=null;o!==null;)n=o.alternate,n!==null&&Uc(n)===null&&(p=o),o=o.sibling;o=p,o===null?(p=s.child,s.child=null):(p=o.sibling,o.sibling=null),Ah(s,!1,p,o,S);break;case"backwards":for(o=null,p=s.child,s.child=null;p!==null;){if(n=p.alternate,n!==null&&Uc(n)===null){s.child=p;break}n=p.sibling,p.sibling=o,o=p,p=n}Ah(s,!0,o,null,S);break;case"together":Ah(s,!1,null,null,void 0);break;default:s.memoizedState=null}return s.child}function Gc(n,s){(s.mode&1)===0&&n!==null&&(n.alternate=null,s.alternate=null,s.flags|=2)}function Rr(n,s,o){if(n!==null&&(s.dependencies=n.dependencies),Zs|=s.lanes,(o&s.childLanes)===0)return null;if(n!==null&&s.child!==n.child)throw Error(t(153));if(s.child!==null){for(n=s.child,o=ps(n,n.pendingProps),s.child=o,o.return=s;n.sibling!==null;)n=n.sibling,o=o.sibling=ps(n,n.pendingProps),o.return=s;o.sibling=null}return s.child}function jS(n,s,o){switch(s.tag){case 3:P0(s),Ha();break;case 5:qg(s);break;case 1:ii(s.type)&&bc(s);break;case 4:lh(s,s.stateNode.containerInfo);break;case 10:var u=s.type._context,p=s.memoizedProps.value;Kt(Nc,u._currentValue),u._currentValue=p;break;case 13:if(u=s.memoizedState,u!==null)return u.dehydrated!==null?(Kt(ln,ln.current&1),s.flags|=128,null):(o&s.child.childLanes)!==0?L0(n,s,o):(Kt(ln,ln.current&1),n=Rr(n,s,o),n!==null?n.sibling:null);Kt(ln,ln.current&1);break;case 19:if(u=(o&s.childLanes)!==0,(n.flags&128)!==0){if(u)return I0(n,s,o);s.flags|=128}if(p=s.memoizedState,p!==null&&(p.rendering=null,p.tail=null,p.lastEffect=null),Kt(ln,ln.current),u)break;return null;case 22:case 23:return s.lanes=0,C0(n,s,o)}return Rr(n,s,o)}var U0,Ph,F0,O0;U0=function(n,s){for(var o=s.child;o!==null;){if(o.tag===5||o.tag===6)n.appendChild(o.stateNode);else if(o.tag!==4&&o.child!==null){o.child.return=o,o=o.child;continue}if(o===s)break;for(;o.sibling===null;){if(o.return===null||o.return===s)return;o=o.return}o.sibling.return=o.return,o=o.sibling}},Ph=function(){},F0=function(n,s,o,u){var p=n.memoizedProps;if(p!==u){n=s.stateNode,Ks(ir.current);var S=null;switch(o){case"input":p=Ct(n,p),u=Ct(n,u),S=[];break;case"select":p=de({},p,{value:void 0}),u=de({},u,{value:void 0}),S=[];break;case"textarea":p=zt(n,p),u=zt(n,u),S=[];break;default:typeof p.onClick!="function"&&typeof u.onClick=="function"&&(n.onclick=Mc)}We(o,u);var R;o=null;for(pe in p)if(!u.hasOwnProperty(pe)&&p.hasOwnProperty(pe)&&p[pe]!=null)if(pe==="style"){var B=p[pe];for(R in B)B.hasOwnProperty(R)&&(o||(o={}),o[R]="")}else pe!=="dangerouslySetInnerHTML"&&pe!=="children"&&pe!=="suppressContentEditableWarning"&&pe!=="suppressHydrationWarning"&&pe!=="autoFocus"&&(a.hasOwnProperty(pe)?S||(S=[]):(S=S||[]).push(pe,null));for(pe in u){var X=u[pe];if(B=p!=null?p[pe]:void 0,u.hasOwnProperty(pe)&&X!==B&&(X!=null||B!=null))if(pe==="style")if(B){for(R in B)!B.hasOwnProperty(R)||X&&X.hasOwnProperty(R)||(o||(o={}),o[R]="");for(R in X)X.hasOwnProperty(R)&&B[R]!==X[R]&&(o||(o={}),o[R]=X[R])}else o||(S||(S=[]),S.push(pe,o)),o=X;else pe==="dangerouslySetInnerHTML"?(X=X?X.__html:void 0,B=B?B.__html:void 0,X!=null&&B!==X&&(S=S||[]).push(pe,X)):pe==="children"?typeof X!="string"&&typeof X!="number"||(S=S||[]).push(pe,""+X):pe!=="suppressContentEditableWarning"&&pe!=="suppressHydrationWarning"&&(a.hasOwnProperty(pe)?(X!=null&&pe==="onScroll"&&Zt("scroll",n),S||B===X||(S=[])):(S=S||[]).push(pe,X))}o&&(S=S||[]).push("style",o);var pe=S;(s.updateQueue=pe)&&(s.flags|=4)}},O0=function(n,s,o,u){o!==u&&(s.flags|=4)};function vl(n,s){if(!tn)switch(n.tailMode){case"hidden":s=n.tail;for(var o=null;s!==null;)s.alternate!==null&&(o=s),s=s.sibling;o===null?n.tail=null:o.sibling=null;break;case"collapsed":o=n.tail;for(var u=null;o!==null;)o.alternate!==null&&(u=o),o=o.sibling;u===null?s||n.tail===null?n.tail=null:n.tail.sibling=null:u.sibling=null}}function Bn(n){var s=n.alternate!==null&&n.alternate.child===n.child,o=0,u=0;if(s)for(var p=n.child;p!==null;)o|=p.lanes|p.childLanes,u|=p.subtreeFlags&14680064,u|=p.flags&14680064,p.return=n,p=p.sibling;else for(p=n.child;p!==null;)o|=p.lanes|p.childLanes,u|=p.subtreeFlags,u|=p.flags,p.return=n,p=p.sibling;return n.subtreeFlags|=u,n.childLanes=o,s}function WS(n,s,o){var u=s.pendingProps;switch(Zd(s),s.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return Bn(s),null;case 1:return ii(s.type)&&wc(),Bn(s),null;case 3:return u=s.stateNode,Wa(),Jt(ni),Jt(kn),dh(),u.pendingContext&&(u.context=u.pendingContext,u.pendingContext=null),(n===null||n.child===null)&&(Ac(s)?s.flags|=4:n===null||n.memoizedState.isDehydrated&&(s.flags&256)===0||(s.flags|=1024,zi!==null&&(Hh(zi),zi=null))),Ph(n,s),Bn(s),null;case 5:ch(s);var p=Ks(fl.current);if(o=s.type,n!==null&&s.stateNode!=null)F0(n,s,o,u,p),n.ref!==s.ref&&(s.flags|=512,s.flags|=2097152);else{if(!u){if(s.stateNode===null)throw Error(t(166));return Bn(s),null}if(n=Ks(ir.current),Ac(s)){u=s.stateNode,o=s.type;var S=s.memoizedProps;switch(u[nr]=s,u[ll]=S,n=(s.mode&1)!==0,o){case"dialog":Zt("cancel",u),Zt("close",u);break;case"iframe":case"object":case"embed":Zt("load",u);break;case"video":case"audio":for(p=0;p<sl.length;p++)Zt(sl[p],u);break;case"source":Zt("error",u);break;case"img":case"image":case"link":Zt("error",u),Zt("load",u);break;case"details":Zt("toggle",u);break;case"input":mt(u,S),Zt("invalid",u);break;case"select":u._wrapperState={wasMultiple:!!S.multiple},Zt("invalid",u);break;case"textarea":Y(u,S),Zt("invalid",u)}We(o,S),p=null;for(var R in S)if(S.hasOwnProperty(R)){var B=S[R];R==="children"?typeof B=="string"?u.textContent!==B&&(S.suppressHydrationWarning!==!0&&Sc(u.textContent,B,n),p=["children",B]):typeof B=="number"&&u.textContent!==""+B&&(S.suppressHydrationWarning!==!0&&Sc(u.textContent,B,n),p=["children",""+B]):a.hasOwnProperty(R)&&B!=null&&R==="onScroll"&&Zt("scroll",u)}switch(o){case"input":tt(u),Xt(u,S,!0);break;case"textarea":tt(u),wt(u);break;case"select":case"option":break;default:typeof S.onClick=="function"&&(u.onclick=Mc)}u=p,s.updateQueue=u,u!==null&&(s.flags|=4)}else{R=p.nodeType===9?p:p.ownerDocument,n==="http://www.w3.org/1999/xhtml"&&(n=F(o)),n==="http://www.w3.org/1999/xhtml"?o==="script"?(n=R.createElement("div"),n.innerHTML="<script><\/script>",n=n.removeChild(n.firstChild)):typeof u.is=="string"?n=R.createElement(o,{is:u.is}):(n=R.createElement(o),o==="select"&&(R=n,u.multiple?R.multiple=!0:u.size&&(R.size=u.size))):n=R.createElementNS(n,o),n[nr]=s,n[ll]=u,U0(n,s,!1,!1),s.stateNode=n;e:{switch(R=ie(o,u),o){case"dialog":Zt("cancel",n),Zt("close",n),p=u;break;case"iframe":case"object":case"embed":Zt("load",n),p=u;break;case"video":case"audio":for(p=0;p<sl.length;p++)Zt(sl[p],n);p=u;break;case"source":Zt("error",n),p=u;break;case"img":case"image":case"link":Zt("error",n),Zt("load",n),p=u;break;case"details":Zt("toggle",n),p=u;break;case"input":mt(n,u),p=Ct(n,u),Zt("invalid",n);break;case"option":p=u;break;case"select":n._wrapperState={wasMultiple:!!u.multiple},p=de({},u,{value:void 0}),Zt("invalid",n);break;case"textarea":Y(n,u),p=zt(n,u),Zt("invalid",n);break;default:p=u}We(o,p),B=p;for(S in B)if(B.hasOwnProperty(S)){var X=B[S];S==="style"?ve(n,X):S==="dangerouslySetInnerHTML"?(X=X?X.__html:void 0,X!=null&&Z(n,X)):S==="children"?typeof X=="string"?(o!=="textarea"||X!=="")&&me(n,X):typeof X=="number"&&me(n,""+X):S!=="suppressContentEditableWarning"&&S!=="suppressHydrationWarning"&&S!=="autoFocus"&&(a.hasOwnProperty(S)?X!=null&&S==="onScroll"&&Zt("scroll",n):X!=null&&P(n,S,X,R))}switch(o){case"input":tt(n),Xt(n,u,!1);break;case"textarea":tt(n),wt(n);break;case"option":u.value!=null&&n.setAttribute("value",""+ge(u.value));break;case"select":n.multiple=!!u.multiple,S=u.value,S!=null?Et(n,!!u.multiple,S,!1):u.defaultValue!=null&&Et(n,!!u.multiple,u.defaultValue,!0);break;default:typeof p.onClick=="function"&&(n.onclick=Mc)}switch(o){case"button":case"input":case"select":case"textarea":u=!!u.autoFocus;break e;case"img":u=!0;break e;default:u=!1}}u&&(s.flags|=4)}s.ref!==null&&(s.flags|=512,s.flags|=2097152)}return Bn(s),null;case 6:if(n&&s.stateNode!=null)O0(n,s,n.memoizedProps,u);else{if(typeof u!="string"&&s.stateNode===null)throw Error(t(166));if(o=Ks(fl.current),Ks(ir.current),Ac(s)){if(u=s.stateNode,o=s.memoizedProps,u[nr]=s,(S=u.nodeValue!==o)&&(n=pi,n!==null))switch(n.tag){case 3:Sc(u.nodeValue,o,(n.mode&1)!==0);break;case 5:n.memoizedProps.suppressHydrationWarning!==!0&&Sc(u.nodeValue,o,(n.mode&1)!==0)}S&&(s.flags|=4)}else u=(o.nodeType===9?o:o.ownerDocument).createTextNode(u),u[nr]=s,s.stateNode=u}return Bn(s),null;case 13:if(Jt(ln),u=s.memoizedState,n===null||n.memoizedState!==null&&n.memoizedState.dehydrated!==null){if(tn&&mi!==null&&(s.mode&1)!==0&&(s.flags&128)===0)Bg(),Ha(),s.flags|=98560,S=!1;else if(S=Ac(s),u!==null&&u.dehydrated!==null){if(n===null){if(!S)throw Error(t(318));if(S=s.memoizedState,S=S!==null?S.dehydrated:null,!S)throw Error(t(317));S[nr]=s}else Ha(),(s.flags&128)===0&&(s.memoizedState=null),s.flags|=4;Bn(s),S=!1}else zi!==null&&(Hh(zi),zi=null),S=!0;if(!S)return s.flags&65536?s:null}return(s.flags&128)!==0?(s.lanes=o,s):(u=u!==null,u!==(n!==null&&n.memoizedState!==null)&&u&&(s.child.flags|=8192,(s.mode&1)!==0&&(n===null||(ln.current&1)!==0?Sn===0&&(Sn=3):jh())),s.updateQueue!==null&&(s.flags|=4),Bn(s),null);case 4:return Wa(),Ph(n,s),n===null&&al(s.stateNode.containerInfo),Bn(s),null;case 10:return rh(s.type._context),Bn(s),null;case 17:return ii(s.type)&&wc(),Bn(s),null;case 19:if(Jt(ln),S=s.memoizedState,S===null)return Bn(s),null;if(u=(s.flags&128)!==0,R=S.rendering,R===null)if(u)vl(S,!1);else{if(Sn!==0||n!==null&&(n.flags&128)!==0)for(n=s.child;n!==null;){if(R=Uc(n),R!==null){for(s.flags|=128,vl(S,!1),u=R.updateQueue,u!==null&&(s.updateQueue=u,s.flags|=4),s.subtreeFlags=0,u=o,o=s.child;o!==null;)S=o,n=u,S.flags&=14680066,R=S.alternate,R===null?(S.childLanes=0,S.lanes=n,S.child=null,S.subtreeFlags=0,S.memoizedProps=null,S.memoizedState=null,S.updateQueue=null,S.dependencies=null,S.stateNode=null):(S.childLanes=R.childLanes,S.lanes=R.lanes,S.child=R.child,S.subtreeFlags=0,S.deletions=null,S.memoizedProps=R.memoizedProps,S.memoizedState=R.memoizedState,S.updateQueue=R.updateQueue,S.type=R.type,n=R.dependencies,S.dependencies=n===null?null:{lanes:n.lanes,firstContext:n.firstContext}),o=o.sibling;return Kt(ln,ln.current&1|2),s.child}n=n.sibling}S.tail!==null&&on()>Ya&&(s.flags|=128,u=!0,vl(S,!1),s.lanes=4194304)}else{if(!u)if(n=Uc(R),n!==null){if(s.flags|=128,u=!0,o=n.updateQueue,o!==null&&(s.updateQueue=o,s.flags|=4),vl(S,!0),S.tail===null&&S.tailMode==="hidden"&&!R.alternate&&!tn)return Bn(s),null}else 2*on()-S.renderingStartTime>Ya&&o!==1073741824&&(s.flags|=128,u=!0,vl(S,!1),s.lanes=4194304);S.isBackwards?(R.sibling=s.child,s.child=R):(o=S.last,o!==null?o.sibling=R:s.child=R,S.last=R)}return S.tail!==null?(s=S.tail,S.rendering=s,S.tail=s.sibling,S.renderingStartTime=on(),s.sibling=null,o=ln.current,Kt(ln,u?o&1|2:o&1),s):(Bn(s),null);case 22:case 23:return Gh(),u=s.memoizedState!==null,n!==null&&n.memoizedState!==null!==u&&(s.flags|=8192),u&&(s.mode&1)!==0?(gi&1073741824)!==0&&(Bn(s),s.subtreeFlags&6&&(s.flags|=8192)):Bn(s),null;case 24:return null;case 25:return null}throw Error(t(156,s.tag))}function XS(n,s){switch(Zd(s),s.tag){case 1:return ii(s.type)&&wc(),n=s.flags,n&65536?(s.flags=n&-65537|128,s):null;case 3:return Wa(),Jt(ni),Jt(kn),dh(),n=s.flags,(n&65536)!==0&&(n&128)===0?(s.flags=n&-65537|128,s):null;case 5:return ch(s),null;case 13:if(Jt(ln),n=s.memoizedState,n!==null&&n.dehydrated!==null){if(s.alternate===null)throw Error(t(340));Ha()}return n=s.flags,n&65536?(s.flags=n&-65537|128,s):null;case 19:return Jt(ln),null;case 4:return Wa(),null;case 10:return rh(s.type._context),null;case 22:case 23:return Gh(),null;case 24:return null;default:return null}}var jc=!1,Hn=!1,$S=typeof WeakSet=="function"?WeakSet:Set,Xe=null;function $a(n,s){var o=n.ref;if(o!==null)if(typeof o=="function")try{o(null)}catch(u){dn(n,s,u)}else o.current=null}function Nh(n,s,o){try{o()}catch(u){dn(n,s,u)}}var k0=!1;function qS(n,s){if(Gd=uc,n=gg(),Ud(n)){if("selectionStart"in n)var o={start:n.selectionStart,end:n.selectionEnd};else e:{o=(o=n.ownerDocument)&&o.defaultView||window;var u=o.getSelection&&o.getSelection();if(u&&u.rangeCount!==0){o=u.anchorNode;var p=u.anchorOffset,S=u.focusNode;u=u.focusOffset;try{o.nodeType,S.nodeType}catch{o=null;break e}var R=0,B=-1,X=-1,pe=0,be=0,Te=n,we=null;t:for(;;){for(var Ve;Te!==o||p!==0&&Te.nodeType!==3||(B=R+p),Te!==S||u!==0&&Te.nodeType!==3||(X=R+u),Te.nodeType===3&&(R+=Te.nodeValue.length),(Ve=Te.firstChild)!==null;)we=Te,Te=Ve;for(;;){if(Te===n)break t;if(we===o&&++pe===p&&(B=R),we===S&&++be===u&&(X=R),(Ve=Te.nextSibling)!==null)break;Te=we,we=Te.parentNode}Te=Ve}o=B===-1||X===-1?null:{start:B,end:X}}else o=null}o=o||{start:0,end:0}}else o=null;for(jd={focusedElem:n,selectionRange:o},uc=!1,Xe=s;Xe!==null;)if(s=Xe,n=s.child,(s.subtreeFlags&1028)!==0&&n!==null)n.return=s,Xe=n;else for(;Xe!==null;){s=Xe;try{var qe=s.alternate;if((s.flags&1024)!==0)switch(s.tag){case 0:case 11:case 15:break;case 1:if(qe!==null){var Qe=qe.memoizedProps,mn=qe.memoizedState,re=s.stateNode,Q=re.getSnapshotBeforeUpdate(s.elementType===s.type?Qe:Bi(s.type,Qe),mn);re.__reactInternalSnapshotBeforeUpdate=Q}break;case 3:var ue=s.stateNode.containerInfo;ue.nodeType===1?ue.textContent="":ue.nodeType===9&&ue.documentElement&&ue.removeChild(ue.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(t(163))}}catch(Ce){dn(s,s.return,Ce)}if(n=s.sibling,n!==null){n.return=s.return,Xe=n;break}Xe=s.return}return qe=k0,k0=!1,qe}function _l(n,s,o){var u=s.updateQueue;if(u=u!==null?u.lastEffect:null,u!==null){var p=u=u.next;do{if((p.tag&n)===n){var S=p.destroy;p.destroy=void 0,S!==void 0&&Nh(s,o,S)}p=p.next}while(p!==u)}}function Wc(n,s){if(s=s.updateQueue,s=s!==null?s.lastEffect:null,s!==null){var o=s=s.next;do{if((o.tag&n)===n){var u=o.create;o.destroy=u()}o=o.next}while(o!==s)}}function Lh(n){var s=n.ref;if(s!==null){var o=n.stateNode;switch(n.tag){case 5:n=o;break;default:n=o}typeof s=="function"?s(n):s.current=n}}function z0(n){var s=n.alternate;s!==null&&(n.alternate=null,z0(s)),n.child=null,n.deletions=null,n.sibling=null,n.tag===5&&(s=n.stateNode,s!==null&&(delete s[nr],delete s[ll],delete s[qd],delete s[PS],delete s[NS])),n.stateNode=null,n.return=null,n.dependencies=null,n.memoizedProps=null,n.memoizedState=null,n.pendingProps=null,n.stateNode=null,n.updateQueue=null}function B0(n){return n.tag===5||n.tag===3||n.tag===4}function H0(n){e:for(;;){for(;n.sibling===null;){if(n.return===null||B0(n.return))return null;n=n.return}for(n.sibling.return=n.return,n=n.sibling;n.tag!==5&&n.tag!==6&&n.tag!==18;){if(n.flags&2||n.child===null||n.tag===4)continue e;n.child.return=n,n=n.child}if(!(n.flags&2))return n.stateNode}}function Dh(n,s,o){var u=n.tag;if(u===5||u===6)n=n.stateNode,s?o.nodeType===8?o.parentNode.insertBefore(n,s):o.insertBefore(n,s):(o.nodeType===8?(s=o.parentNode,s.insertBefore(n,o)):(s=o,s.appendChild(n)),o=o._reactRootContainer,o!=null||s.onclick!==null||(s.onclick=Mc));else if(u!==4&&(n=n.child,n!==null))for(Dh(n,s,o),n=n.sibling;n!==null;)Dh(n,s,o),n=n.sibling}function Ih(n,s,o){var u=n.tag;if(u===5||u===6)n=n.stateNode,s?o.insertBefore(n,s):o.appendChild(n);else if(u!==4&&(n=n.child,n!==null))for(Ih(n,s,o),n=n.sibling;n!==null;)Ih(n,s,o),n=n.sibling}var Dn=null,Hi=!1;function cs(n,s,o){for(o=o.child;o!==null;)V0(n,s,o),o=o.sibling}function V0(n,s,o){if(Ne&&typeof Ne.onCommitFiberUnmount=="function")try{Ne.onCommitFiberUnmount(ae,o)}catch{}switch(o.tag){case 5:Hn||$a(o,s);case 6:var u=Dn,p=Hi;Dn=null,cs(n,s,o),Dn=u,Hi=p,Dn!==null&&(Hi?(n=Dn,o=o.stateNode,n.nodeType===8?n.parentNode.removeChild(o):n.removeChild(o)):Dn.removeChild(o.stateNode));break;case 18:Dn!==null&&(Hi?(n=Dn,o=o.stateNode,n.nodeType===8?$d(n.parentNode,o):n.nodeType===1&&$d(n,o),Qo(n)):$d(Dn,o.stateNode));break;case 4:u=Dn,p=Hi,Dn=o.stateNode.containerInfo,Hi=!0,cs(n,s,o),Dn=u,Hi=p;break;case 0:case 11:case 14:case 15:if(!Hn&&(u=o.updateQueue,u!==null&&(u=u.lastEffect,u!==null))){p=u=u.next;do{var S=p,R=S.destroy;S=S.tag,R!==void 0&&((S&2)!==0||(S&4)!==0)&&Nh(o,s,R),p=p.next}while(p!==u)}cs(n,s,o);break;case 1:if(!Hn&&($a(o,s),u=o.stateNode,typeof u.componentWillUnmount=="function"))try{u.props=o.memoizedProps,u.state=o.memoizedState,u.componentWillUnmount()}catch(B){dn(o,s,B)}cs(n,s,o);break;case 21:cs(n,s,o);break;case 22:o.mode&1?(Hn=(u=Hn)||o.memoizedState!==null,cs(n,s,o),Hn=u):cs(n,s,o);break;default:cs(n,s,o)}}function G0(n){var s=n.updateQueue;if(s!==null){n.updateQueue=null;var o=n.stateNode;o===null&&(o=n.stateNode=new $S),s.forEach(function(u){var p=iM.bind(null,n,u);o.has(u)||(o.add(u),u.then(p,p))})}}function Vi(n,s){var o=s.deletions;if(o!==null)for(var u=0;u<o.length;u++){var p=o[u];try{var S=n,R=s,B=R;e:for(;B!==null;){switch(B.tag){case 5:Dn=B.stateNode,Hi=!1;break e;case 3:Dn=B.stateNode.containerInfo,Hi=!0;break e;case 4:Dn=B.stateNode.containerInfo,Hi=!0;break e}B=B.return}if(Dn===null)throw Error(t(160));V0(S,R,p),Dn=null,Hi=!1;var X=p.alternate;X!==null&&(X.return=null),p.return=null}catch(pe){dn(p,s,pe)}}if(s.subtreeFlags&12854)for(s=s.child;s!==null;)j0(s,n),s=s.sibling}function j0(n,s){var o=n.alternate,u=n.flags;switch(n.tag){case 0:case 11:case 14:case 15:if(Vi(s,n),sr(n),u&4){try{_l(3,n,n.return),Wc(3,n)}catch(Qe){dn(n,n.return,Qe)}try{_l(5,n,n.return)}catch(Qe){dn(n,n.return,Qe)}}break;case 1:Vi(s,n),sr(n),u&512&&o!==null&&$a(o,o.return);break;case 5:if(Vi(s,n),sr(n),u&512&&o!==null&&$a(o,o.return),n.flags&32){var p=n.stateNode;try{me(p,"")}catch(Qe){dn(n,n.return,Qe)}}if(u&4&&(p=n.stateNode,p!=null)){var S=n.memoizedProps,R=o!==null?o.memoizedProps:S,B=n.type,X=n.updateQueue;if(n.updateQueue=null,X!==null)try{B==="input"&&S.type==="radio"&&S.name!=null&&vt(p,S),ie(B,R);var pe=ie(B,S);for(R=0;R<X.length;R+=2){var be=X[R],Te=X[R+1];be==="style"?ve(p,Te):be==="dangerouslySetInnerHTML"?Z(p,Te):be==="children"?me(p,Te):P(p,be,Te,pe)}switch(B){case"input":kt(p,S);break;case"textarea":pn(p,S);break;case"select":var we=p._wrapperState.wasMultiple;p._wrapperState.wasMultiple=!!S.multiple;var Ve=S.value;Ve!=null?Et(p,!!S.multiple,Ve,!1):we!==!!S.multiple&&(S.defaultValue!=null?Et(p,!!S.multiple,S.defaultValue,!0):Et(p,!!S.multiple,S.multiple?[]:"",!1))}p[ll]=S}catch(Qe){dn(n,n.return,Qe)}}break;case 6:if(Vi(s,n),sr(n),u&4){if(n.stateNode===null)throw Error(t(162));p=n.stateNode,S=n.memoizedProps;try{p.nodeValue=S}catch(Qe){dn(n,n.return,Qe)}}break;case 3:if(Vi(s,n),sr(n),u&4&&o!==null&&o.memoizedState.isDehydrated)try{Qo(s.containerInfo)}catch(Qe){dn(n,n.return,Qe)}break;case 4:Vi(s,n),sr(n);break;case 13:Vi(s,n),sr(n),p=n.child,p.flags&8192&&(S=p.memoizedState!==null,p.stateNode.isHidden=S,!S||p.alternate!==null&&p.alternate.memoizedState!==null||(Oh=on())),u&4&&G0(n);break;case 22:if(be=o!==null&&o.memoizedState!==null,n.mode&1?(Hn=(pe=Hn)||be,Vi(s,n),Hn=pe):Vi(s,n),sr(n),u&8192){if(pe=n.memoizedState!==null,(n.stateNode.isHidden=pe)&&!be&&(n.mode&1)!==0)for(Xe=n,be=n.child;be!==null;){for(Te=Xe=be;Xe!==null;){switch(we=Xe,Ve=we.child,we.tag){case 0:case 11:case 14:case 15:_l(4,we,we.return);break;case 1:$a(we,we.return);var qe=we.stateNode;if(typeof qe.componentWillUnmount=="function"){u=we,o=we.return;try{s=u,qe.props=s.memoizedProps,qe.state=s.memoizedState,qe.componentWillUnmount()}catch(Qe){dn(u,o,Qe)}}break;case 5:$a(we,we.return);break;case 22:if(we.memoizedState!==null){$0(Te);continue}}Ve!==null?(Ve.return=we,Xe=Ve):$0(Te)}be=be.sibling}e:for(be=null,Te=n;;){if(Te.tag===5){if(be===null){be=Te;try{p=Te.stateNode,pe?(S=p.style,typeof S.setProperty=="function"?S.setProperty("display","none","important"):S.display="none"):(B=Te.stateNode,X=Te.memoizedProps.style,R=X!=null&&X.hasOwnProperty("display")?X.display:null,B.style.display=xe("display",R))}catch(Qe){dn(n,n.return,Qe)}}}else if(Te.tag===6){if(be===null)try{Te.stateNode.nodeValue=pe?"":Te.memoizedProps}catch(Qe){dn(n,n.return,Qe)}}else if((Te.tag!==22&&Te.tag!==23||Te.memoizedState===null||Te===n)&&Te.child!==null){Te.child.return=Te,Te=Te.child;continue}if(Te===n)break e;for(;Te.sibling===null;){if(Te.return===null||Te.return===n)break e;be===Te&&(be=null),Te=Te.return}be===Te&&(be=null),Te.sibling.return=Te.return,Te=Te.sibling}}break;case 19:Vi(s,n),sr(n),u&4&&G0(n);break;case 21:break;default:Vi(s,n),sr(n)}}function sr(n){var s=n.flags;if(s&2){try{e:{for(var o=n.return;o!==null;){if(B0(o)){var u=o;break e}o=o.return}throw Error(t(160))}switch(u.tag){case 5:var p=u.stateNode;u.flags&32&&(me(p,""),u.flags&=-33);var S=H0(n);Ih(n,S,p);break;case 3:case 4:var R=u.stateNode.containerInfo,B=H0(n);Dh(n,B,R);break;default:throw Error(t(161))}}catch(X){dn(n,n.return,X)}n.flags&=-3}s&4096&&(n.flags&=-4097)}function YS(n,s,o){Xe=n,W0(n)}function W0(n,s,o){for(var u=(n.mode&1)!==0;Xe!==null;){var p=Xe,S=p.child;if(p.tag===22&&u){var R=p.memoizedState!==null||jc;if(!R){var B=p.alternate,X=B!==null&&B.memoizedState!==null||Hn;B=jc;var pe=Hn;if(jc=R,(Hn=X)&&!pe)for(Xe=p;Xe!==null;)R=Xe,X=R.child,R.tag===22&&R.memoizedState!==null?q0(p):X!==null?(X.return=R,Xe=X):q0(p);for(;S!==null;)Xe=S,W0(S),S=S.sibling;Xe=p,jc=B,Hn=pe}X0(n)}else(p.subtreeFlags&8772)!==0&&S!==null?(S.return=p,Xe=S):X0(n)}}function X0(n){for(;Xe!==null;){var s=Xe;if((s.flags&8772)!==0){var o=s.alternate;try{if((s.flags&8772)!==0)switch(s.tag){case 0:case 11:case 15:Hn||Wc(5,s);break;case 1:var u=s.stateNode;if(s.flags&4&&!Hn)if(o===null)u.componentDidMount();else{var p=s.elementType===s.type?o.memoizedProps:Bi(s.type,o.memoizedProps);u.componentDidUpdate(p,o.memoizedState,u.__reactInternalSnapshotBeforeUpdate)}var S=s.updateQueue;S!==null&&$g(s,S,u);break;case 3:var R=s.updateQueue;if(R!==null){if(o=null,s.child!==null)switch(s.child.tag){case 5:o=s.child.stateNode;break;case 1:o=s.child.stateNode}$g(s,R,o)}break;case 5:var B=s.stateNode;if(o===null&&s.flags&4){o=B;var X=s.memoizedProps;switch(s.type){case"button":case"input":case"select":case"textarea":X.autoFocus&&o.focus();break;case"img":X.src&&(o.src=X.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(s.memoizedState===null){var pe=s.alternate;if(pe!==null){var be=pe.memoizedState;if(be!==null){var Te=be.dehydrated;Te!==null&&Qo(Te)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(t(163))}Hn||s.flags&512&&Lh(s)}catch(we){dn(s,s.return,we)}}if(s===n){Xe=null;break}if(o=s.sibling,o!==null){o.return=s.return,Xe=o;break}Xe=s.return}}function $0(n){for(;Xe!==null;){var s=Xe;if(s===n){Xe=null;break}var o=s.sibling;if(o!==null){o.return=s.return,Xe=o;break}Xe=s.return}}function q0(n){for(;Xe!==null;){var s=Xe;try{switch(s.tag){case 0:case 11:case 15:var o=s.return;try{Wc(4,s)}catch(X){dn(s,o,X)}break;case 1:var u=s.stateNode;if(typeof u.componentDidMount=="function"){var p=s.return;try{u.componentDidMount()}catch(X){dn(s,p,X)}}var S=s.return;try{Lh(s)}catch(X){dn(s,S,X)}break;case 5:var R=s.return;try{Lh(s)}catch(X){dn(s,R,X)}}}catch(X){dn(s,s.return,X)}if(s===n){Xe=null;break}var B=s.sibling;if(B!==null){B.return=s.return,Xe=B;break}Xe=s.return}}var KS=Math.ceil,Xc=T.ReactCurrentDispatcher,Uh=T.ReactCurrentOwner,Ai=T.ReactCurrentBatchConfig,Lt=0,Rn=null,xn=null,In=0,gi=0,qa=rs(0),Sn=0,yl=null,Zs=0,$c=0,Fh=0,Sl=null,si=null,Oh=0,Ya=1/0,Ar=null,qc=!1,kh=null,us=null,Yc=!1,ds=null,Kc=0,Ml=0,zh=null,Qc=-1,Zc=0;function Yn(){return(Lt&6)!==0?on():Qc!==-1?Qc:Qc=on()}function hs(n){return(n.mode&1)===0?1:(Lt&2)!==0&&In!==0?In&-In:DS.transition!==null?(Zc===0&&(Zc=He()),Zc):(n=St,n!==0||(n=window.event,n=n===void 0?16:Km(n.type)),n)}function Gi(n,s,o,u){if(50<Ml)throw Ml=0,zh=null,Error(t(185));yt(n,o,u),((Lt&2)===0||n!==Rn)&&(n===Rn&&((Lt&2)===0&&($c|=o),Sn===4&&fs(n,In)),ai(n,u),o===1&&Lt===0&&(s.mode&1)===0&&(Ya=on()+500,Tc&&as()))}function ai(n,s){var o=n.callbackNode;Bt(n,s);var u=Yt(n,n===Rn?In:0);if(u===0)o!==null&&Wo(o),n.callbackNode=null,n.callbackPriority=0;else if(s=u&-u,n.callbackPriority!==s){if(o!=null&&Wo(o),s===1)n.tag===0?LS(K0.bind(null,n)):Ug(K0.bind(null,n)),RS(function(){(Lt&6)===0&&as()}),o=null;else{switch(Sr(u)){case 1:o=Xo;break;case 4:o=A;break;case 16:o=ee;break;case 536870912:o=le;break;default:o=ee}o=rx(o,Y0.bind(null,n))}n.callbackPriority=s,n.callbackNode=o}}function Y0(n,s){if(Qc=-1,Zc=0,(Lt&6)!==0)throw Error(t(327));var o=n.callbackNode;if(Ka()&&n.callbackNode!==o)return null;var u=Yt(n,n===Rn?In:0);if(u===0)return null;if((u&30)!==0||(u&n.expiredLanes)!==0||s)s=Jc(n,u);else{s=u;var p=Lt;Lt|=2;var S=Z0();(Rn!==n||In!==s)&&(Ar=null,Ya=on()+500,ea(n,s));do try{JS();break}catch(B){Q0(n,B)}while(!0);ih(),Xc.current=S,Lt=p,xn!==null?s=0:(Rn=null,In=0,s=Sn)}if(s!==0){if(s===2&&(p=gn(n),p!==0&&(u=p,s=Bh(n,p))),s===1)throw o=yl,ea(n,0),fs(n,u),ai(n,on()),o;if(s===6)fs(n,u);else{if(p=n.current.alternate,(u&30)===0&&!QS(p)&&(s=Jc(n,u),s===2&&(S=gn(n),S!==0&&(u=S,s=Bh(n,S))),s===1))throw o=yl,ea(n,0),fs(n,u),ai(n,on()),o;switch(n.finishedWork=p,n.finishedLanes=u,s){case 0:case 1:throw Error(t(345));case 2:ta(n,si,Ar);break;case 3:if(fs(n,u),(u&130023424)===u&&(s=Oh+500-on(),10<s)){if(Yt(n,0)!==0)break;if(p=n.suspendedLanes,(p&u)!==u){Yn(),n.pingedLanes|=n.suspendedLanes&p;break}n.timeoutHandle=Xd(ta.bind(null,n,si,Ar),s);break}ta(n,si,Ar);break;case 4:if(fs(n,u),(u&4194240)===u)break;for(s=n.eventTimes,p=-1;0<u;){var R=31-Ae(u);S=1<<R,R=s[R],R>p&&(p=R),u&=~S}if(u=p,u=on()-u,u=(120>u?120:480>u?480:1080>u?1080:1920>u?1920:3e3>u?3e3:4320>u?4320:1960*KS(u/1960))-u,10<u){n.timeoutHandle=Xd(ta.bind(null,n,si,Ar),u);break}ta(n,si,Ar);break;case 5:ta(n,si,Ar);break;default:throw Error(t(329))}}}return ai(n,on()),n.callbackNode===o?Y0.bind(null,n):null}function Bh(n,s){var o=Sl;return n.current.memoizedState.isDehydrated&&(ea(n,s).flags|=256),n=Jc(n,s),n!==2&&(s=si,si=o,s!==null&&Hh(s)),n}function Hh(n){si===null?si=n:si.push.apply(si,n)}function QS(n){for(var s=n;;){if(s.flags&16384){var o=s.updateQueue;if(o!==null&&(o=o.stores,o!==null))for(var u=0;u<o.length;u++){var p=o[u],S=p.getSnapshot;p=p.value;try{if(!ki(S(),p))return!1}catch{return!1}}}if(o=s.child,s.subtreeFlags&16384&&o!==null)o.return=s,s=o;else{if(s===n)break;for(;s.sibling===null;){if(s.return===null||s.return===n)return!0;s=s.return}s.sibling.return=s.return,s=s.sibling}}return!0}function fs(n,s){for(s&=~Fh,s&=~$c,n.suspendedLanes|=s,n.pingedLanes&=~s,n=n.expirationTimes;0<s;){var o=31-Ae(s),u=1<<o;n[o]=-1,s&=~u}}function K0(n){if((Lt&6)!==0)throw Error(t(327));Ka();var s=Yt(n,0);if((s&1)===0)return ai(n,on()),null;var o=Jc(n,s);if(n.tag!==0&&o===2){var u=gn(n);u!==0&&(s=u,o=Bh(n,u))}if(o===1)throw o=yl,ea(n,0),fs(n,s),ai(n,on()),o;if(o===6)throw Error(t(345));return n.finishedWork=n.current.alternate,n.finishedLanes=s,ta(n,si,Ar),ai(n,on()),null}function Vh(n,s){var o=Lt;Lt|=1;try{return n(s)}finally{Lt=o,Lt===0&&(Ya=on()+500,Tc&&as())}}function Js(n){ds!==null&&ds.tag===0&&(Lt&6)===0&&Ka();var s=Lt;Lt|=1;var o=Ai.transition,u=St;try{if(Ai.transition=null,St=1,n)return n()}finally{St=u,Ai.transition=o,Lt=s,(Lt&6)===0&&as()}}function Gh(){gi=qa.current,Jt(qa)}function ea(n,s){n.finishedWork=null,n.finishedLanes=0;var o=n.timeoutHandle;if(o!==-1&&(n.timeoutHandle=-1,CS(o)),xn!==null)for(o=xn.return;o!==null;){var u=o;switch(Zd(u),u.tag){case 1:u=u.type.childContextTypes,u!=null&&wc();break;case 3:Wa(),Jt(ni),Jt(kn),dh();break;case 5:ch(u);break;case 4:Wa();break;case 13:Jt(ln);break;case 19:Jt(ln);break;case 10:rh(u.type._context);break;case 22:case 23:Gh()}o=o.return}if(Rn=n,xn=n=ps(n.current,null),In=gi=s,Sn=0,yl=null,Fh=$c=Zs=0,si=Sl=null,Ys!==null){for(s=0;s<Ys.length;s++)if(o=Ys[s],u=o.interleaved,u!==null){o.interleaved=null;var p=u.next,S=o.pending;if(S!==null){var R=S.next;S.next=p,u.next=R}o.pending=u}Ys=null}return n}function Q0(n,s){do{var o=xn;try{if(ih(),Fc.current=Bc,Oc){for(var u=cn.memoizedState;u!==null;){var p=u.queue;p!==null&&(p.pending=null),u=u.next}Oc=!1}if(Qs=0,Cn=yn=cn=null,pl=!1,ml=0,Uh.current=null,o===null||o.return===null){Sn=1,yl=s,xn=null;break}e:{var S=n,R=o.return,B=o,X=s;if(s=In,B.flags|=32768,X!==null&&typeof X=="object"&&typeof X.then=="function"){var pe=X,be=B,Te=be.tag;if((be.mode&1)===0&&(Te===0||Te===11||Te===15)){var we=be.alternate;we?(be.updateQueue=we.updateQueue,be.memoizedState=we.memoizedState,be.lanes=we.lanes):(be.updateQueue=null,be.memoizedState=null)}var Ve=M0(R);if(Ve!==null){Ve.flags&=-257,E0(Ve,R,B,S,s),Ve.mode&1&&S0(S,pe,s),s=Ve,X=pe;var qe=s.updateQueue;if(qe===null){var Qe=new Set;Qe.add(X),s.updateQueue=Qe}else qe.add(X);break e}else{if((s&1)===0){S0(S,pe,s),jh();break e}X=Error(t(426))}}else if(tn&&B.mode&1){var mn=M0(R);if(mn!==null){(mn.flags&65536)===0&&(mn.flags|=256),E0(mn,R,B,S,s),th(Xa(X,B));break e}}S=X=Xa(X,B),Sn!==4&&(Sn=2),Sl===null?Sl=[S]:Sl.push(S),S=R;do{switch(S.tag){case 3:S.flags|=65536,s&=-s,S.lanes|=s;var re=_0(S,X,s);Xg(S,re);break e;case 1:B=X;var Q=S.type,ue=S.stateNode;if((S.flags&128)===0&&(typeof Q.getDerivedStateFromError=="function"||ue!==null&&typeof ue.componentDidCatch=="function"&&(us===null||!us.has(ue)))){S.flags|=65536,s&=-s,S.lanes|=s;var Ce=y0(S,B,s);Xg(S,Ce);break e}}S=S.return}while(S!==null)}ex(o)}catch(et){s=et,xn===o&&o!==null&&(xn=o=o.return);continue}break}while(!0)}function Z0(){var n=Xc.current;return Xc.current=Bc,n===null?Bc:n}function jh(){(Sn===0||Sn===3||Sn===2)&&(Sn=4),Rn===null||(Zs&268435455)===0&&($c&268435455)===0||fs(Rn,In)}function Jc(n,s){var o=Lt;Lt|=2;var u=Z0();(Rn!==n||In!==s)&&(Ar=null,ea(n,s));do try{ZS();break}catch(p){Q0(n,p)}while(!0);if(ih(),Lt=o,Xc.current=u,xn!==null)throw Error(t(261));return Rn=null,In=0,Sn}function ZS(){for(;xn!==null;)J0(xn)}function JS(){for(;xn!==null&&!lc();)J0(xn)}function J0(n){var s=ix(n.alternate,n,gi);n.memoizedProps=n.pendingProps,s===null?ex(n):xn=s,Uh.current=null}function ex(n){var s=n;do{var o=s.alternate;if(n=s.return,(s.flags&32768)===0){if(o=WS(o,s,gi),o!==null){xn=o;return}}else{if(o=XS(o,s),o!==null){o.flags&=32767,xn=o;return}if(n!==null)n.flags|=32768,n.subtreeFlags=0,n.deletions=null;else{Sn=6,xn=null;return}}if(s=s.sibling,s!==null){xn=s;return}xn=s=n}while(s!==null);Sn===0&&(Sn=5)}function ta(n,s,o){var u=St,p=Ai.transition;try{Ai.transition=null,St=1,eM(n,s,o,u)}finally{Ai.transition=p,St=u}return null}function eM(n,s,o,u){do Ka();while(ds!==null);if((Lt&6)!==0)throw Error(t(327));o=n.finishedWork;var p=n.finishedLanes;if(o===null)return null;if(n.finishedWork=null,n.finishedLanes=0,o===n.current)throw Error(t(177));n.callbackNode=null,n.callbackPriority=0;var S=o.lanes|o.childLanes;if(ei(n,S),n===Rn&&(xn=Rn=null,In=0),(o.subtreeFlags&2064)===0&&(o.flags&2064)===0||Yc||(Yc=!0,rx(ee,function(){return Ka(),null})),S=(o.flags&15990)!==0,(o.subtreeFlags&15990)!==0||S){S=Ai.transition,Ai.transition=null;var R=St;St=1;var B=Lt;Lt|=4,Uh.current=null,qS(n,o),j0(o,n),yS(jd),uc=!!Gd,jd=Gd=null,n.current=o,YS(o),Md(),Lt=B,St=R,Ai.transition=S}else n.current=o;if(Yc&&(Yc=!1,ds=n,Kc=p),S=n.pendingLanes,S===0&&(us=null),je(o.stateNode),ai(n,on()),s!==null)for(u=n.onRecoverableError,o=0;o<s.length;o++)p=s[o],u(p.value,{componentStack:p.stack,digest:p.digest});if(qc)throw qc=!1,n=kh,kh=null,n;return(Kc&1)!==0&&n.tag!==0&&Ka(),S=n.pendingLanes,(S&1)!==0?n===zh?Ml++:(Ml=0,zh=n):Ml=0,as(),null}function Ka(){if(ds!==null){var n=Sr(Kc),s=Ai.transition,o=St;try{if(Ai.transition=null,St=16>n?16:n,ds===null)var u=!1;else{if(n=ds,ds=null,Kc=0,(Lt&6)!==0)throw Error(t(331));var p=Lt;for(Lt|=4,Xe=n.current;Xe!==null;){var S=Xe,R=S.child;if((Xe.flags&16)!==0){var B=S.deletions;if(B!==null){for(var X=0;X<B.length;X++){var pe=B[X];for(Xe=pe;Xe!==null;){var be=Xe;switch(be.tag){case 0:case 11:case 15:_l(8,be,S)}var Te=be.child;if(Te!==null)Te.return=be,Xe=Te;else for(;Xe!==null;){be=Xe;var we=be.sibling,Ve=be.return;if(z0(be),be===pe){Xe=null;break}if(we!==null){we.return=Ve,Xe=we;break}Xe=Ve}}}var qe=S.alternate;if(qe!==null){var Qe=qe.child;if(Qe!==null){qe.child=null;do{var mn=Qe.sibling;Qe.sibling=null,Qe=mn}while(Qe!==null)}}Xe=S}}if((S.subtreeFlags&2064)!==0&&R!==null)R.return=S,Xe=R;else e:for(;Xe!==null;){if(S=Xe,(S.flags&2048)!==0)switch(S.tag){case 0:case 11:case 15:_l(9,S,S.return)}var re=S.sibling;if(re!==null){re.return=S.return,Xe=re;break e}Xe=S.return}}var Q=n.current;for(Xe=Q;Xe!==null;){R=Xe;var ue=R.child;if((R.subtreeFlags&2064)!==0&&ue!==null)ue.return=R,Xe=ue;else e:for(R=Q;Xe!==null;){if(B=Xe,(B.flags&2048)!==0)try{switch(B.tag){case 0:case 11:case 15:Wc(9,B)}}catch(et){dn(B,B.return,et)}if(B===R){Xe=null;break e}var Ce=B.sibling;if(Ce!==null){Ce.return=B.return,Xe=Ce;break e}Xe=B.return}}if(Lt=p,as(),Ne&&typeof Ne.onPostCommitFiberRoot=="function")try{Ne.onPostCommitFiberRoot(ae,n)}catch{}u=!0}return u}finally{St=o,Ai.transition=s}}return!1}function tx(n,s,o){s=Xa(o,s),s=_0(n,s,1),n=ls(n,s,1),s=Yn(),n!==null&&(yt(n,1,s),ai(n,s))}function dn(n,s,o){if(n.tag===3)tx(n,n,o);else for(;s!==null;){if(s.tag===3){tx(s,n,o);break}else if(s.tag===1){var u=s.stateNode;if(typeof s.type.getDerivedStateFromError=="function"||typeof u.componentDidCatch=="function"&&(us===null||!us.has(u))){n=Xa(o,n),n=y0(s,n,1),s=ls(s,n,1),n=Yn(),s!==null&&(yt(s,1,n),ai(s,n));break}}s=s.return}}function tM(n,s,o){var u=n.pingCache;u!==null&&u.delete(s),s=Yn(),n.pingedLanes|=n.suspendedLanes&o,Rn===n&&(In&o)===o&&(Sn===4||Sn===3&&(In&130023424)===In&&500>on()-Oh?ea(n,0):Fh|=o),ai(n,s)}function nx(n,s){s===0&&((n.mode&1)===0?s=1:(s=Je,Je<<=1,(Je&130023424)===0&&(Je=4194304)));var o=Yn();n=Tr(n,s),n!==null&&(yt(n,s,o),ai(n,o))}function nM(n){var s=n.memoizedState,o=0;s!==null&&(o=s.retryLane),nx(n,o)}function iM(n,s){var o=0;switch(n.tag){case 13:var u=n.stateNode,p=n.memoizedState;p!==null&&(o=p.retryLane);break;case 19:u=n.stateNode;break;default:throw Error(t(314))}u!==null&&u.delete(s),nx(n,o)}var ix;ix=function(n,s,o){if(n!==null)if(n.memoizedProps!==s.pendingProps||ni.current)ri=!0;else{if((n.lanes&o)===0&&(s.flags&128)===0)return ri=!1,jS(n,s,o);ri=(n.flags&131072)!==0}else ri=!1,tn&&(s.flags&1048576)!==0&&Fg(s,Rc,s.index);switch(s.lanes=0,s.tag){case 2:var u=s.type;Gc(n,s),n=s.pendingProps;var p=ka(s,kn.current);ja(s,o),p=ph(null,s,u,n,p,o);var S=mh();return s.flags|=1,typeof p=="object"&&p!==null&&typeof p.render=="function"&&p.$$typeof===void 0?(s.tag=1,s.memoizedState=null,s.updateQueue=null,ii(u)?(S=!0,bc(s)):S=!1,s.memoizedState=p.state!==null&&p.state!==void 0?p.state:null,oh(s),p.updater=Hc,s.stateNode=p,p._reactInternals=s,Sh(s,u,n,o),s=bh(null,s,u,!0,S,o)):(s.tag=0,tn&&S&&Qd(s),qn(null,s,p,o),s=s.child),s;case 16:u=s.elementType;e:{switch(Gc(n,s),n=s.pendingProps,p=u._init,u=p(u._payload),s.type=u,p=s.tag=sM(u),n=Bi(u,n),p){case 0:s=wh(null,s,u,n,o);break e;case 1:s=A0(null,s,u,n,o);break e;case 11:s=w0(null,s,u,n,o);break e;case 14:s=b0(null,s,u,Bi(u.type,n),o);break e}throw Error(t(306,u,""))}return s;case 0:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:Bi(u,p),wh(n,s,u,p,o);case 1:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:Bi(u,p),A0(n,s,u,p,o);case 3:e:{if(P0(s),n===null)throw Error(t(387));u=s.pendingProps,S=s.memoizedState,p=S.element,Wg(n,s),Ic(s,u,null,o);var R=s.memoizedState;if(u=R.element,S.isDehydrated)if(S={element:u,isDehydrated:!1,cache:R.cache,pendingSuspenseBoundaries:R.pendingSuspenseBoundaries,transitions:R.transitions},s.updateQueue.baseState=S,s.memoizedState=S,s.flags&256){p=Xa(Error(t(423)),s),s=N0(n,s,u,o,p);break e}else if(u!==p){p=Xa(Error(t(424)),s),s=N0(n,s,u,o,p);break e}else for(mi=is(s.stateNode.containerInfo.firstChild),pi=s,tn=!0,zi=null,o=Gg(s,null,u,o),s.child=o;o;)o.flags=o.flags&-3|4096,o=o.sibling;else{if(Ha(),u===p){s=Rr(n,s,o);break e}qn(n,s,u,o)}s=s.child}return s;case 5:return qg(s),n===null&&eh(s),u=s.type,p=s.pendingProps,S=n!==null?n.memoizedProps:null,R=p.children,Wd(u,p)?R=null:S!==null&&Wd(u,S)&&(s.flags|=32),R0(n,s),qn(n,s,R,o),s.child;case 6:return n===null&&eh(s),null;case 13:return L0(n,s,o);case 4:return lh(s,s.stateNode.containerInfo),u=s.pendingProps,n===null?s.child=Va(s,null,u,o):qn(n,s,u,o),s.child;case 11:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:Bi(u,p),w0(n,s,u,p,o);case 7:return qn(n,s,s.pendingProps,o),s.child;case 8:return qn(n,s,s.pendingProps.children,o),s.child;case 12:return qn(n,s,s.pendingProps.children,o),s.child;case 10:e:{if(u=s.type._context,p=s.pendingProps,S=s.memoizedProps,R=p.value,Kt(Nc,u._currentValue),u._currentValue=R,S!==null)if(ki(S.value,R)){if(S.children===p.children&&!ni.current){s=Rr(n,s,o);break e}}else for(S=s.child,S!==null&&(S.return=s);S!==null;){var B=S.dependencies;if(B!==null){R=S.child;for(var X=B.firstContext;X!==null;){if(X.context===u){if(S.tag===1){X=Cr(-1,o&-o),X.tag=2;var pe=S.updateQueue;if(pe!==null){pe=pe.shared;var be=pe.pending;be===null?X.next=X:(X.next=be.next,be.next=X),pe.pending=X}}S.lanes|=o,X=S.alternate,X!==null&&(X.lanes|=o),sh(S.return,o,s),B.lanes|=o;break}X=X.next}}else if(S.tag===10)R=S.type===s.type?null:S.child;else if(S.tag===18){if(R=S.return,R===null)throw Error(t(341));R.lanes|=o,B=R.alternate,B!==null&&(B.lanes|=o),sh(R,o,s),R=S.sibling}else R=S.child;if(R!==null)R.return=S;else for(R=S;R!==null;){if(R===s){R=null;break}if(S=R.sibling,S!==null){S.return=R.return,R=S;break}R=R.return}S=R}qn(n,s,p.children,o),s=s.child}return s;case 9:return p=s.type,u=s.pendingProps.children,ja(s,o),p=Ci(p),u=u(p),s.flags|=1,qn(n,s,u,o),s.child;case 14:return u=s.type,p=Bi(u,s.pendingProps),p=Bi(u.type,p),b0(n,s,u,p,o);case 15:return T0(n,s,s.type,s.pendingProps,o);case 17:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:Bi(u,p),Gc(n,s),s.tag=1,ii(u)?(n=!0,bc(s)):n=!1,ja(s,o),x0(s,u,p),Sh(s,u,p,o),bh(null,s,u,!0,n,o);case 19:return I0(n,s,o);case 22:return C0(n,s,o)}throw Error(t(156,s.tag))};function rx(n,s){return Gs(n,s)}function rM(n,s,o,u){this.tag=n,this.key=o,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=s,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=u,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Pi(n,s,o,u){return new rM(n,s,o,u)}function Wh(n){return n=n.prototype,!(!n||!n.isReactComponent)}function sM(n){if(typeof n=="function")return Wh(n)?1:0;if(n!=null){if(n=n.$$typeof,n===J)return 11;if(n===k)return 14}return 2}function ps(n,s){var o=n.alternate;return o===null?(o=Pi(n.tag,s,n.key,n.mode),o.elementType=n.elementType,o.type=n.type,o.stateNode=n.stateNode,o.alternate=n,n.alternate=o):(o.pendingProps=s,o.type=n.type,o.flags=0,o.subtreeFlags=0,o.deletions=null),o.flags=n.flags&14680064,o.childLanes=n.childLanes,o.lanes=n.lanes,o.child=n.child,o.memoizedProps=n.memoizedProps,o.memoizedState=n.memoizedState,o.updateQueue=n.updateQueue,s=n.dependencies,o.dependencies=s===null?null:{lanes:s.lanes,firstContext:s.firstContext},o.sibling=n.sibling,o.index=n.index,o.ref=n.ref,o}function eu(n,s,o,u,p,S){var R=2;if(u=n,typeof n=="function")Wh(n)&&(R=1);else if(typeof n=="string")R=5;else e:switch(n){case O:return na(o.children,p,S,s);case b:R=8,p|=8;break;case I:return n=Pi(12,o,s,p|2),n.elementType=I,n.lanes=S,n;case se:return n=Pi(13,o,s,p),n.elementType=se,n.lanes=S,n;case j:return n=Pi(19,o,s,p),n.elementType=j,n.lanes=S,n;case te:return tu(o,p,S,s);default:if(typeof n=="object"&&n!==null)switch(n.$$typeof){case W:R=10;break e;case V:R=9;break e;case J:R=11;break e;case k:R=14;break e;case oe:R=16,u=null;break e}throw Error(t(130,n==null?n:typeof n,""))}return s=Pi(R,o,s,p),s.elementType=n,s.type=u,s.lanes=S,s}function na(n,s,o,u){return n=Pi(7,n,u,s),n.lanes=o,n}function tu(n,s,o,u){return n=Pi(22,n,u,s),n.elementType=te,n.lanes=o,n.stateNode={isHidden:!1},n}function Xh(n,s,o){return n=Pi(6,n,null,s),n.lanes=o,n}function $h(n,s,o){return s=Pi(4,n.children!==null?n.children:[],n.key,s),s.lanes=o,s.stateNode={containerInfo:n.containerInfo,pendingChildren:null,implementation:n.implementation},s}function aM(n,s,o,u,p){this.tag=s,this.containerInfo=n,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=Ln(0),this.expirationTimes=Ln(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Ln(0),this.identifierPrefix=u,this.onRecoverableError=p,this.mutableSourceEagerHydrationData=null}function qh(n,s,o,u,p,S,R,B,X){return n=new aM(n,s,o,B,X),s===1?(s=1,S===!0&&(s|=8)):s=0,S=Pi(3,null,null,s),n.current=S,S.stateNode=n,S.memoizedState={element:u,isDehydrated:o,cache:null,transitions:null,pendingSuspenseBoundaries:null},oh(S),n}function oM(n,s,o){var u=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:N,key:u==null?null:""+u,children:n,containerInfo:s,implementation:o}}function sx(n){if(!n)return ss;n=n._reactInternals;e:{if($n(n)!==n||n.tag!==1)throw Error(t(170));var s=n;do{switch(s.tag){case 3:s=s.stateNode.context;break e;case 1:if(ii(s.type)){s=s.stateNode.__reactInternalMemoizedMergedChildContext;break e}}s=s.return}while(s!==null);throw Error(t(171))}if(n.tag===1){var o=n.type;if(ii(o))return Dg(n,o,s)}return s}function ax(n,s,o,u,p,S,R,B,X){return n=qh(o,u,!0,n,p,S,R,B,X),n.context=sx(null),o=n.current,u=Yn(),p=hs(o),S=Cr(u,p),S.callback=s??null,ls(o,S,p),n.current.lanes=p,yt(n,p,u),ai(n,u),n}function nu(n,s,o,u){var p=s.current,S=Yn(),R=hs(p);return o=sx(o),s.context===null?s.context=o:s.pendingContext=o,s=Cr(S,R),s.payload={element:n},u=u===void 0?null:u,u!==null&&(s.callback=u),n=ls(p,s,R),n!==null&&(Gi(n,p,R,S),Dc(n,p,R)),R}function iu(n){if(n=n.current,!n.child)return null;switch(n.child.tag){case 5:return n.child.stateNode;default:return n.child.stateNode}}function ox(n,s){if(n=n.memoizedState,n!==null&&n.dehydrated!==null){var o=n.retryLane;n.retryLane=o!==0&&o<s?o:s}}function Yh(n,s){ox(n,s),(n=n.alternate)&&ox(n,s)}function lM(){return null}var lx=typeof reportError=="function"?reportError:function(n){console.error(n)};function Kh(n){this._internalRoot=n}ru.prototype.render=Kh.prototype.render=function(n){var s=this._internalRoot;if(s===null)throw Error(t(409));nu(n,s,null,null)},ru.prototype.unmount=Kh.prototype.unmount=function(){var n=this._internalRoot;if(n!==null){this._internalRoot=null;var s=n.containerInfo;Js(function(){nu(null,n,null,null)}),s[Mr]=null}};function ru(n){this._internalRoot=n}ru.prototype.unstable_scheduleHydration=function(n){if(n){var s=Ht();n={blockedOn:null,target:n,priority:s};for(var o=0;o<es.length&&s!==0&&s<es[o].priority;o++);es.splice(o,0,n),o===0&&qm(n)}};function Qh(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11)}function su(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11&&(n.nodeType!==8||n.nodeValue!==" react-mount-point-unstable "))}function cx(){}function cM(n,s,o,u,p){if(p){if(typeof u=="function"){var S=u;u=function(){var pe=iu(R);S.call(pe)}}var R=ax(s,u,n,0,null,!1,!1,"",cx);return n._reactRootContainer=R,n[Mr]=R.current,al(n.nodeType===8?n.parentNode:n),Js(),R}for(;p=n.lastChild;)n.removeChild(p);if(typeof u=="function"){var B=u;u=function(){var pe=iu(X);B.call(pe)}}var X=qh(n,0,!1,null,null,!1,!1,"",cx);return n._reactRootContainer=X,n[Mr]=X.current,al(n.nodeType===8?n.parentNode:n),Js(function(){nu(s,X,o,u)}),X}function au(n,s,o,u,p){var S=o._reactRootContainer;if(S){var R=S;if(typeof p=="function"){var B=p;p=function(){var X=iu(R);B.call(X)}}nu(s,R,n,p)}else R=cM(o,s,n,p,u);return iu(R)}Ft=function(n){switch(n.tag){case 3:var s=n.stateNode;if(s.current.memoizedState.isDehydrated){var o=Nt(s.pendingLanes);o!==0&&(ti(s,o|1),ai(s,on()),(Lt&6)===0&&(Ya=on()+500,as()))}break;case 13:Js(function(){var u=Tr(n,1);if(u!==null){var p=Yn();Gi(u,n,1,p)}}),Yh(n,1)}},Qt=function(n){if(n.tag===13){var s=Tr(n,134217728);if(s!==null){var o=Yn();Gi(s,n,134217728,o)}Yh(n,134217728)}},Fi=function(n){if(n.tag===13){var s=hs(n),o=Tr(n,s);if(o!==null){var u=Yn();Gi(o,n,s,u)}Yh(n,s)}},Ht=function(){return St},Oi=function(n,s){var o=St;try{return St=n,s()}finally{St=o}},nt=function(n,s,o){switch(s){case"input":if(kt(n,o),s=o.name,o.type==="radio"&&s!=null){for(o=n;o.parentNode;)o=o.parentNode;for(o=o.querySelectorAll("input[name="+JSON.stringify(""+s)+'][type="radio"]'),s=0;s<o.length;s++){var u=o[s];if(u!==n&&u.form===n.form){var p=Ec(u);if(!p)throw Error(t(90));Gt(u),kt(u,p)}}}break;case"textarea":pn(n,o);break;case"select":s=o.value,s!=null&&Et(n,!!o.multiple,s,!1)}},Fe=Vh,Me=Js;var uM={usingClientEntryPoint:!1,Events:[cl,Fa,Ec,_e,Le,Vh]},El={findFiberByHostInstance:Ws,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},dM={bundleType:El.bundleType,version:El.version,rendererPackageName:El.rendererPackageName,rendererConfig:El.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:T.ReactCurrentDispatcher,findHostInstanceByFiber:function(n){return n=Vs(n),n===null?null:n.stateNode},findFiberByHostInstance:El.findFiberByHostInstance||lM,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var ou=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!ou.isDisabled&&ou.supportsFiber)try{ae=ou.inject(dM),Ne=ou}catch{}}return oi.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=uM,oi.createPortal=function(n,s){var o=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!Qh(s))throw Error(t(200));return oM(n,s,null,o)},oi.createRoot=function(n,s){if(!Qh(n))throw Error(t(299));var o=!1,u="",p=lx;return s!=null&&(s.unstable_strictMode===!0&&(o=!0),s.identifierPrefix!==void 0&&(u=s.identifierPrefix),s.onRecoverableError!==void 0&&(p=s.onRecoverableError)),s=qh(n,1,!1,null,null,o,!1,u,p),n[Mr]=s.current,al(n.nodeType===8?n.parentNode:n),new Kh(s)},oi.findDOMNode=function(n){if(n==null)return null;if(n.nodeType===1)return n;var s=n._reactInternals;if(s===void 0)throw typeof n.render=="function"?Error(t(188)):(n=Object.keys(n).join(","),Error(t(268,n)));return n=Vs(s),n=n===null?null:n.stateNode,n},oi.flushSync=function(n){return Js(n)},oi.hydrate=function(n,s,o){if(!su(s))throw Error(t(200));return au(null,n,s,!0,o)},oi.hydrateRoot=function(n,s,o){if(!Qh(n))throw Error(t(405));var u=o!=null&&o.hydratedSources||null,p=!1,S="",R=lx;if(o!=null&&(o.unstable_strictMode===!0&&(p=!0),o.identifierPrefix!==void 0&&(S=o.identifierPrefix),o.onRecoverableError!==void 0&&(R=o.onRecoverableError)),s=ax(s,null,n,1,o??null,p,!1,S,R),n[Mr]=s.current,al(n),u)for(n=0;n<u.length;n++)o=u[n],p=o._getVersion,p=p(o._source),s.mutableSourceEagerHydrationData==null?s.mutableSourceEagerHydrationData=[o,p]:s.mutableSourceEagerHydrationData.push(o,p);return new ru(s)},oi.render=function(n,s,o){if(!su(s))throw Error(t(200));return au(null,n,s,!1,o)},oi.unmountComponentAtNode=function(n){if(!su(n))throw Error(t(40));return n._reactRootContainer?(Js(function(){au(null,null,n,!1,function(){n._reactRootContainer=null,n[Mr]=null})}),!0):!1},oi.unstable_batchedUpdates=Vh,oi.unstable_renderSubtreeIntoContainer=function(n,s,o,u){if(!su(o))throw Error(t(200));if(n==null||n._reactInternals===void 0)throw Error(t(38));return au(n,s,o,!1,u)},oi.version="18.3.1-next-f1338f8080-20240426",oi}var vx;function SM(){if(vx)return tf.exports;vx=1;function i(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(i)}catch(e){console.error(e)}}return i(),tf.exports=yM(),tf.exports}var _x;function MM(){if(_x)return cu;_x=1;var i=SM();return cu.createRoot=i.createRoot,cu.hydrateRoot=i.hydrateRoot,cu}var EM=MM(),Oo=class{constructor(){this.listeners=new Set,this.subscribe=this.subscribe.bind(this)}subscribe(i){return this.listeners.add(i),this.onSubscribe(),()=>{this.listeners.delete(i),this.onUnsubscribe()}}hasListeners(){return this.listeners.size>0}onSubscribe(){}onUnsubscribe(){}},fa,bs,yo,i_,wM=(i_=class extends Oo{constructor(){super();rt(this,fa);rt(this,bs);rt(this,yo);ze(this,yo,e=>{if(typeof window<"u"&&window.addEventListener){const t=()=>e();return window.addEventListener("visibilitychange",t,!1),()=>{window.removeEventListener("visibilitychange",t)}}})}onSubscribe(){G(this,bs)||this.setEventListener(G(this,yo))}onUnsubscribe(){var e;this.hasListeners()||((e=G(this,bs))==null||e.call(this),ze(this,bs,void 0))}setEventListener(e){var t;ze(this,yo,e),(t=G(this,bs))==null||t.call(this),ze(this,bs,e(r=>{typeof r=="boolean"?this.setFocused(r):this.onFocus()}))}setFocused(e){G(this,fa)!==e&&(ze(this,fa,e),this.onFocus())}onFocus(){const e=this.isFocused();this.listeners.forEach(t=>{t(e)})}isFocused(){var e;return typeof G(this,fa)=="boolean"?G(this,fa):((e=globalThis.document)==null?void 0:e.visibilityState)!=="hidden"}},fa=new WeakMap,bs=new WeakMap,yo=new WeakMap,i_),om=new wM,bM={setTimeout:(i,e)=>setTimeout(i,e),clearTimeout:i=>clearTimeout(i),setInterval:(i,e)=>setInterval(i,e),clearInterval:i=>clearInterval(i)},Ts,sm,r_,TM=(r_=class{constructor(){rt(this,Ts,bM);rt(this,sm,!1)}setTimeoutProvider(i){ze(this,Ts,i)}setTimeout(i,e){return G(this,Ts).setTimeout(i,e)}clearTimeout(i){G(this,Ts).clearTimeout(i)}setInterval(i,e){return G(this,Ts).setInterval(i,e)}clearInterval(i){G(this,Ts).clearInterval(i)}},Ts=new WeakMap,sm=new WeakMap,r_),ua=new TM;function CM(i){setTimeout(i,0)}var RM=typeof window>"u"||"Deno"in globalThis;function Zn(){}function AM(i,e){return typeof i=="function"?i(e):i}function Kf(i){return typeof i=="number"&&i>=0&&i!==1/0}function p_(i,e){return Math.max(i+(e||0)-Date.now(),0)}function Us(i,e){return typeof i=="function"?i(e):i}function yi(i,e){return typeof i=="function"?i(e):i}function yx(i,e){const{type:t="all",exact:r,fetchStatus:a,predicate:l,queryKey:c,stale:d}=i;if(c){if(r){if(e.queryHash!==lm(c,e.options))return!1}else if(!Bl(e.queryKey,c))return!1}if(t!=="all"){const h=e.isActive();if(t==="active"&&!h||t==="inactive"&&h)return!1}return!(typeof d=="boolean"&&e.isStale()!==d||a&&a!==e.state.fetchStatus||l&&!l(e))}function Sx(i,e){const{exact:t,status:r,predicate:a,mutationKey:l}=i;if(l){if(!e.options.mutationKey)return!1;if(t){if(Ma(e.options.mutationKey)!==Ma(l))return!1}else if(!Bl(e.options.mutationKey,l))return!1}return!(r&&e.state.status!==r||a&&!a(e))}function lm(i,e){return((e==null?void 0:e.queryKeyHashFn)||Ma)(i)}function Ma(i){return JSON.stringify(i,(e,t)=>Qf(t)?Object.keys(t).sort().reduce((r,a)=>(r[a]=t[a],r),{}):t)}function Bl(i,e){return i===e?!0:typeof i!=typeof e?!1:i&&e&&typeof i=="object"&&typeof e=="object"?Object.keys(e).every(t=>Bl(i[t],e[t])):!1}var PM=Object.prototype.hasOwnProperty;function m_(i,e,t=0){if(i===e)return i;if(t>500)return e;const r=Mx(i)&&Mx(e);if(!r&&!(Qf(i)&&Qf(e)))return e;const l=(r?i:Object.keys(i)).length,c=r?e:Object.keys(e),d=c.length,h=r?new Array(d):{};let f=0;for(let m=0;m<d;m++){const g=r?m:c[m],x=i[g],M=e[g];if(x===M){h[g]=x,(r?m<l:PM.call(i,g))&&f++;continue}if(x===null||M===null||typeof x!="object"||typeof M!="object"){h[g]=M;continue}const E=m_(x,M,t+1);h[g]=E,E===x&&f++}return l===d&&f===l?i:h}function Ju(i,e){if(!e||Object.keys(i).length!==Object.keys(e).length)return!1;for(const t in i)if(i[t]!==e[t])return!1;return!0}function Mx(i){return Array.isArray(i)&&i.length===Object.keys(i).length}function Qf(i){if(!Ex(i))return!1;const e=i.constructor;if(e===void 0)return!0;const t=e.prototype;return!(!Ex(t)||!t.hasOwnProperty("isPrototypeOf")||Object.getPrototypeOf(i)!==Object.prototype)}function Ex(i){return Object.prototype.toString.call(i)==="[object Object]"}function NM(i){return new Promise(e=>{ua.setTimeout(e,i)})}function Zf(i,e,t){return typeof t.structuralSharing=="function"?t.structuralSharing(i,e):t.structuralSharing!==!1?m_(i,e):e}function LM(i,e,t=0){const r=[...i,e];return t&&r.length>t?r.slice(1):r}function DM(i,e,t=0){const r=[e,...i];return t&&r.length>t?r.slice(0,-1):r}var cm=Symbol();function g_(i,e){return!i.queryFn&&(e!=null&&e.initialPromise)?()=>e.initialPromise:!i.queryFn||i.queryFn===cm?()=>Promise.reject(new Error(`Missing queryFn: '${i.queryHash}'`)):i.queryFn}function um(i,e){return typeof i=="function"?i(...e):!!i}function IM(i,e,t){let r=!1,a;return Object.defineProperty(i,"signal",{enumerable:!0,get:()=>(a??(a=e()),r||(r=!0,a.aborted?t():a.addEventListener("abort",t,{once:!0})),a)}),i}var Hl=(()=>{let i=()=>RM;return{isServer(){return i()},setIsServer(e){i=e}}})();function Jf(){let i,e;const t=new Promise((a,l)=>{i=a,e=l});t.status="pending",t.catch(()=>{});function r(a){Object.assign(t,a),delete t.resolve,delete t.reject}return t.resolve=a=>{r({status:"fulfilled",value:a}),i(a)},t.reject=a=>{r({status:"rejected",reason:a}),e(a)},t}var UM=CM;function FM(){let i=[],e=0,t=d=>{d()},r=d=>{d()},a=UM;const l=d=>{e?i.push(d):a(()=>{t(d)})},c=()=>{const d=i;i=[],d.length&&a(()=>{r(()=>{d.forEach(h=>{t(h)})})})};return{batch:d=>{let h;e++;try{h=d()}finally{e--,e||c()}return h},batchCalls:d=>(...h)=>{l(()=>{d(...h)})},schedule:l,setNotifyFunction:d=>{t=d},setBatchNotifyFunction:d=>{r=d},setScheduler:d=>{a=d}}}var En=FM(),So,Cs,Mo,s_,OM=(s_=class extends Oo{constructor(){super();rt(this,So,!0);rt(this,Cs);rt(this,Mo);ze(this,Mo,e=>{if(typeof window<"u"&&window.addEventListener){const t=()=>e(!0),r=()=>e(!1);return window.addEventListener("online",t,!1),window.addEventListener("offline",r,!1),()=>{window.removeEventListener("online",t),window.removeEventListener("offline",r)}}})}onSubscribe(){G(this,Cs)||this.setEventListener(G(this,Mo))}onUnsubscribe(){var e;this.hasListeners()||((e=G(this,Cs))==null||e.call(this),ze(this,Cs,void 0))}setEventListener(e){var t;ze(this,Mo,e),(t=G(this,Cs))==null||t.call(this),ze(this,Cs,e(this.setOnline.bind(this)))}setOnline(e){G(this,So)!==e&&(ze(this,So,e),this.listeners.forEach(r=>{r(e)}))}isOnline(){return G(this,So)}},So=new WeakMap,Cs=new WeakMap,Mo=new WeakMap,s_),ed=new OM;function kM(i){return Math.min(1e3*2**i,3e4)}function x_(i){return(i??"online")==="online"?ed.isOnline():!0}var ep=class extends Error{constructor(i){super("CancelledError"),this.revert=i==null?void 0:i.revert,this.silent=i==null?void 0:i.silent}};function v_(i){let e=!1,t=0,r;const a=Jf(),l=()=>a.status!=="pending",c=w=>{var _;if(!l()){const y=new ep(w);x(y),(_=i.onCancel)==null||_.call(i,y)}},d=()=>{e=!0},h=()=>{e=!1},f=()=>om.isFocused()&&(i.networkMode==="always"||ed.isOnline())&&i.canRun(),m=()=>x_(i.networkMode)&&i.canRun(),g=w=>{l()||(r==null||r(),a.resolve(w))},x=w=>{l()||(r==null||r(),a.reject(w))},M=()=>new Promise(w=>{var _;r=y=>{(l()||f())&&w(y)},(_=i.onPause)==null||_.call(i)}).then(()=>{var w;r=void 0,l()||(w=i.onContinue)==null||w.call(i)}),E=()=>{if(l())return;let w;const _=t===0?i.initialPromise:void 0;try{w=_??i.fn()}catch(y){w=Promise.reject(y)}Promise.resolve(w).then(g).catch(y=>{var N;if(l())return;const L=i.retry??(Hl.isServer()?0:3),P=i.retryDelay??kM,T=typeof P=="function"?P(t,y):P,U=L===!0||typeof L=="number"&&t<L||typeof L=="function"&&L(t,y);if(e||!U){x(y);return}t++,(N=i.onFail)==null||N.call(i,t,y),NM(T).then(()=>f()?void 0:M()).then(()=>{e?x(y):E()})})};return{promise:a,status:()=>a.status,cancel:c,continue:()=>(r==null||r(),a),cancelRetry:d,continueRetry:h,canStart:m,start:()=>(m()?E():M().then(E),a)}}var pa,a_,__=(a_=class{constructor(){rt(this,pa)}destroy(){this.clearGcTimeout()}scheduleGc(){this.clearGcTimeout(),Kf(this.gcTime)&&ze(this,pa,ua.setTimeout(()=>{this.optionalRemove()},this.gcTime))}updateGcTime(i){this.gcTime=Math.max(this.gcTime||0,i??(Hl.isServer()?1/0:300*1e3))}clearGcTimeout(){G(this,pa)!==void 0&&(ua.clearTimeout(G(this,pa)),ze(this,pa,void 0))}},pa=new WeakMap,a_);function zM(i){return{onFetch:(e,t)=>{var m,g,x,M,E;const r=e.options,a=(x=(g=(m=e.fetchOptions)==null?void 0:m.meta)==null?void 0:g.fetchMore)==null?void 0:x.direction,l=((M=e.state.data)==null?void 0:M.pages)||[],c=((E=e.state.data)==null?void 0:E.pageParams)||[];let d={pages:[],pageParams:[]},h=0;const f=async()=>{let w=!1;const _=P=>{IM(P,()=>e.signal,()=>w=!0)},y=g_(e.options,e.fetchOptions),L=async(P,T,U)=>{if(w)return Promise.reject(e.signal.reason);if(T==null&&P.pages.length)return Promise.resolve(P);const O=(()=>{const V={client:e.client,queryKey:e.queryKey,pageParam:T,direction:U?"backward":"forward",meta:e.options.meta};return _(V),V})(),b=await y(O),{maxPages:I}=e.options,W=U?DM:LM;return{pages:W(P.pages,b,I),pageParams:W(P.pageParams,T,I)}};if(a&&l.length){const P=a==="backward",T=P?BM:wx,U={pages:l,pageParams:c},N=T(r,U);d=await L(U,N,P)}else{const P=i??l.length;do{const T=h===0?c[0]??r.initialPageParam:wx(r,d);if(h>0&&T==null)break;d=await L(d,T),h++}while(h<P)}return d};e.options.persister?e.fetchFn=()=>{var w,_;return(_=(w=e.options).persister)==null?void 0:_.call(w,f,{client:e.client,queryKey:e.queryKey,meta:e.options.meta,signal:e.signal},t)}:e.fetchFn=f}}}function wx(i,{pages:e,pageParams:t}){const r=e.length-1;return e.length>0?i.getNextPageParam(e[r],e,t[r],t):void 0}function BM(i,{pages:e,pageParams:t}){var r;return e.length>0?(r=i.getPreviousPageParam)==null?void 0:r.call(i,e[0],e,t[0],t):void 0}var Eo,ma,wo,Di,ga,Nn,ql,xa,_i,y_,Or,o_,HM=(o_=class extends __{constructor(e){super();rt(this,_i);rt(this,Eo);rt(this,ma);rt(this,wo);rt(this,Di);rt(this,ga);rt(this,Nn);rt(this,ql);rt(this,xa);ze(this,xa,!1),ze(this,ql,e.defaultOptions),this.setOptions(e.options),this.observers=[],ze(this,ga,e.client),ze(this,Di,G(this,ga).getQueryCache()),this.queryKey=e.queryKey,this.queryHash=e.queryHash,ze(this,ma,Tx(this.options)),this.state=e.state??G(this,ma),this.scheduleGc()}get meta(){return this.options.meta}get queryType(){return G(this,Eo)}get promise(){var e;return(e=G(this,Nn))==null?void 0:e.promise}setOptions(e){if(this.options={...G(this,ql),...e},e!=null&&e._type&&ze(this,Eo,e._type),this.updateGcTime(this.options.gcTime),this.state&&this.state.data===void 0){const t=Tx(this.options);t.data!==void 0&&(this.setState(bx(t.data,t.dataUpdatedAt)),ze(this,ma,t))}}optionalRemove(){!this.observers.length&&this.state.fetchStatus==="idle"&&G(this,Di).remove(this)}setData(e,t){const r=Zf(this.state.data,e,this.options);return gt(this,_i,Or).call(this,{data:r,type:"success",dataUpdatedAt:t==null?void 0:t.updatedAt,manual:t==null?void 0:t.manual}),r}setState(e){gt(this,_i,Or).call(this,{type:"setState",state:e})}cancel(e){var r,a;const t=(r=G(this,Nn))==null?void 0:r.promise;return(a=G(this,Nn))==null||a.cancel(e),t?t.then(Zn).catch(Zn):Promise.resolve()}destroy(){super.destroy(),this.cancel({silent:!0})}get resetState(){return G(this,ma)}reset(){this.destroy(),this.setState(this.resetState)}isActive(){return this.observers.some(e=>yi(e.options.enabled,this)!==!1)}isDisabled(){return this.getObserversCount()>0?!this.isActive():this.options.queryFn===cm||!this.isFetched()}isFetched(){return this.state.dataUpdateCount+this.state.errorUpdateCount>0}isStatic(){return this.getObserversCount()>0?this.observers.some(e=>Us(e.options.staleTime,this)==="static"):!1}isStale(){return this.getObserversCount()>0?this.observers.some(e=>e.getCurrentResult().isStale):this.state.data===void 0||this.state.isInvalidated}isStaleByTime(e=0){return this.state.data===void 0?!0:e==="static"?!1:this.state.isInvalidated?!0:!p_(this.state.dataUpdatedAt,e)}onFocus(){var t;const e=this.observers.find(r=>r.shouldFetchOnWindowFocus());e==null||e.refetch({cancelRefetch:!1}),(t=G(this,Nn))==null||t.continue()}onOnline(){var t;const e=this.observers.find(r=>r.shouldFetchOnReconnect());e==null||e.refetch({cancelRefetch:!1}),(t=G(this,Nn))==null||t.continue()}addObserver(e){this.observers.includes(e)||(this.observers.push(e),this.clearGcTimeout(),G(this,Di).notify({type:"observerAdded",query:this,observer:e}))}removeObserver(e){this.observers.includes(e)&&(this.observers=this.observers.filter(t=>t!==e),this.observers.length||(G(this,Nn)&&(G(this,xa)||gt(this,_i,y_).call(this)?G(this,Nn).cancel({revert:!0}):G(this,Nn).cancelRetry()),this.scheduleGc()),G(this,Di).notify({type:"observerRemoved",query:this,observer:e}))}getObserversCount(){return this.observers.length}invalidate(){this.state.isInvalidated||gt(this,_i,Or).call(this,{type:"invalidate"})}async fetch(e,t){var f,m,g,x,M,E,w,_,y,L,P;if(this.state.fetchStatus!=="idle"&&((f=G(this,Nn))==null?void 0:f.status())!=="rejected"){if(this.state.data!==void 0&&(t!=null&&t.cancelRefetch))this.cancel({silent:!0});else if(G(this,Nn))return G(this,Nn).continueRetry(),G(this,Nn).promise}if(e&&this.setOptions(e),!this.options.queryFn){const T=this.observers.find(U=>U.options.queryFn);T&&this.setOptions(T.options)}const r=new AbortController,a=T=>{Object.defineProperty(T,"signal",{enumerable:!0,get:()=>(ze(this,xa,!0),r.signal)})},l=()=>{const T=g_(this.options,t),N=(()=>{const O={client:G(this,ga),queryKey:this.queryKey,meta:this.meta};return a(O),O})();return ze(this,xa,!1),this.options.persister?this.options.persister(T,N,this):T(N)},d=(()=>{const T={fetchOptions:t,options:this.options,queryKey:this.queryKey,client:G(this,ga),state:this.state,fetchFn:l};return a(T),T})(),h=G(this,Eo)==="infinite"?zM(this.options.pages):this.options.behavior;h==null||h.onFetch(d,this),ze(this,wo,this.state),(this.state.fetchStatus==="idle"||this.state.fetchMeta!==((m=d.fetchOptions)==null?void 0:m.meta))&&gt(this,_i,Or).call(this,{type:"fetch",meta:(g=d.fetchOptions)==null?void 0:g.meta}),ze(this,Nn,v_({initialPromise:t==null?void 0:t.initialPromise,fn:d.fetchFn,onCancel:T=>{T instanceof ep&&T.revert&&this.setState({...G(this,wo),fetchStatus:"idle"}),r.abort()},onFail:(T,U)=>{gt(this,_i,Or).call(this,{type:"failed",failureCount:T,error:U})},onPause:()=>{gt(this,_i,Or).call(this,{type:"pause"})},onContinue:()=>{gt(this,_i,Or).call(this,{type:"continue"})},retry:d.options.retry,retryDelay:d.options.retryDelay,networkMode:d.options.networkMode,canRun:()=>!0}));try{const T=await G(this,Nn).start();if(T===void 0)throw new Error(`${this.queryHash} data is undefined`);return this.setData(T),(M=(x=G(this,Di).config).onSuccess)==null||M.call(x,T,this),(w=(E=G(this,Di).config).onSettled)==null||w.call(E,T,this.state.error,this),T}catch(T){if(T instanceof ep){if(T.silent)return G(this,Nn).promise;if(T.revert){if(this.state.data===void 0)throw T;return this.state.data}}throw gt(this,_i,Or).call(this,{type:"error",error:T}),(y=(_=G(this,Di).config).onError)==null||y.call(_,T,this),(P=(L=G(this,Di).config).onSettled)==null||P.call(L,this.state.data,T,this),T}finally{this.scheduleGc()}}},Eo=new WeakMap,ma=new WeakMap,wo=new WeakMap,Di=new WeakMap,ga=new WeakMap,Nn=new WeakMap,ql=new WeakMap,xa=new WeakMap,_i=new WeakSet,y_=function(){return this.state.fetchStatus==="paused"&&this.state.status==="pending"},Or=function(e){const t=r=>{switch(e.type){case"failed":return{...r,fetchFailureCount:e.failureCount,fetchFailureReason:e.error};case"pause":return{...r,fetchStatus:"paused"};case"continue":return{...r,fetchStatus:"fetching"};case"fetch":return{...r,...S_(r.data,this.options),fetchMeta:e.meta??null};case"success":const a={...r,...bx(e.data,e.dataUpdatedAt),dataUpdateCount:r.dataUpdateCount+1,...!e.manual&&{fetchStatus:"idle",fetchFailureCount:0,fetchFailureReason:null}};return ze(this,wo,e.manual?a:void 0),a;case"error":const l=e.error;return{...r,error:l,errorUpdateCount:r.errorUpdateCount+1,errorUpdatedAt:Date.now(),fetchFailureCount:r.fetchFailureCount+1,fetchFailureReason:l,fetchStatus:"idle",status:"error",isInvalidated:!0};case"invalidate":return{...r,isInvalidated:!0};case"setState":return{...r,...e.state}}};this.state=t(this.state),En.batch(()=>{this.observers.forEach(r=>{r.onQueryUpdate()}),G(this,Di).notify({query:this,type:"updated",action:e})})},o_);function S_(i,e){return{fetchFailureCount:0,fetchFailureReason:null,fetchStatus:x_(e.networkMode)?"fetching":"paused",...i===void 0&&{error:null,status:"pending"}}}function bx(i,e){return{data:i,dataUpdatedAt:e??Date.now(),error:null,isInvalidated:!1,status:"success"}}function Tx(i){const e=typeof i.initialData=="function"?i.initialData():i.initialData,t=e!==void 0,r=t?typeof i.initialDataUpdatedAt=="function"?i.initialDataUpdatedAt():i.initialDataUpdatedAt:0;return{data:e,dataUpdateCount:0,dataUpdatedAt:t?r??Date.now():0,error:null,errorUpdateCount:0,errorUpdatedAt:0,fetchFailureCount:0,fetchFailureReason:null,fetchMeta:null,isInvalidated:!1,status:t?"success":"pending",fetchStatus:"idle"}}var ui,Rt,Yl,Qn,va,bo,zr,Rs,Kl,To,Co,_a,ya,As,Ro,Ot,Il,tp,np,ip,rp,sp,ap,op,M_,l_,VM=(l_=class extends Oo{constructor(e,t){super();rt(this,Ot);rt(this,ui);rt(this,Rt);rt(this,Yl);rt(this,Qn);rt(this,va);rt(this,bo);rt(this,zr);rt(this,Rs);rt(this,Kl);rt(this,To);rt(this,Co);rt(this,_a);rt(this,ya);rt(this,As);rt(this,Ro,new Set);this.options=t,ze(this,ui,e),ze(this,Rs,null),ze(this,zr,Jf()),this.bindMethods(),this.setOptions(t)}bindMethods(){this.refetch=this.refetch.bind(this)}onSubscribe(){this.listeners.size===1&&(G(this,Rt).addObserver(this),Cx(G(this,Rt),this.options)?gt(this,Ot,Il).call(this):this.updateResult(),gt(this,Ot,rp).call(this))}onUnsubscribe(){this.hasListeners()||this.destroy()}shouldFetchOnReconnect(){return lp(G(this,Rt),this.options,this.options.refetchOnReconnect)}shouldFetchOnWindowFocus(){return lp(G(this,Rt),this.options,this.options.refetchOnWindowFocus)}destroy(){this.listeners=new Set,gt(this,Ot,sp).call(this),gt(this,Ot,ap).call(this),G(this,Rt).removeObserver(this)}setOptions(e){const t=this.options,r=G(this,Rt);if(this.options=G(this,ui).defaultQueryOptions(e),this.options.enabled!==void 0&&typeof this.options.enabled!="boolean"&&typeof this.options.enabled!="function"&&typeof yi(this.options.enabled,G(this,Rt))!="boolean")throw new Error("Expected enabled to be a boolean or a callback that returns a boolean");gt(this,Ot,op).call(this),G(this,Rt).setOptions(this.options),t._defaulted&&!Ju(this.options,t)&&G(this,ui).getQueryCache().notify({type:"observerOptionsUpdated",query:G(this,Rt),observer:this});const a=this.hasListeners();a&&Rx(G(this,Rt),r,this.options,t)&&gt(this,Ot,Il).call(this),this.updateResult(),a&&(G(this,Rt)!==r||yi(this.options.enabled,G(this,Rt))!==yi(t.enabled,G(this,Rt))||Us(this.options.staleTime,G(this,Rt))!==Us(t.staleTime,G(this,Rt)))&&gt(this,Ot,tp).call(this);const l=gt(this,Ot,np).call(this);a&&(G(this,Rt)!==r||yi(this.options.enabled,G(this,Rt))!==yi(t.enabled,G(this,Rt))||l!==G(this,As))&&gt(this,Ot,ip).call(this,l)}getOptimisticResult(e){const t=G(this,ui).getQueryCache().build(G(this,ui),e),r=this.createResult(t,e);return jM(this,r)&&(ze(this,Qn,r),ze(this,bo,this.options),ze(this,va,G(this,Rt).state)),r}getCurrentResult(){return G(this,Qn)}trackResult(e,t){return new Proxy(e,{get:(r,a)=>(this.trackProp(a),t==null||t(a),a==="promise"&&(this.trackProp("data"),!this.options.experimental_prefetchInRender&&G(this,zr).status==="pending"&&G(this,zr).reject(new Error("experimental_prefetchInRender feature flag is not enabled"))),Reflect.get(r,a))})}trackProp(e){G(this,Ro).add(e)}getCurrentQuery(){return G(this,Rt)}refetch({...e}={}){return this.fetch({...e})}fetchOptimistic(e){const t=G(this,ui).defaultQueryOptions(e),r=G(this,ui).getQueryCache().build(G(this,ui),t);return r.fetch().then(()=>this.createResult(r,t))}fetch(e){return gt(this,Ot,Il).call(this,{...e,cancelRefetch:e.cancelRefetch??!0}).then(()=>(this.updateResult(),G(this,Qn)))}createResult(e,t){var I;const r=G(this,Rt),a=this.options,l=G(this,Qn),c=G(this,va),d=G(this,bo),f=e!==r?e.state:G(this,Yl),{state:m}=e;let g={...m},x=!1,M;if(t._optimisticResults){const W=this.hasListeners(),V=!W&&Cx(e,t),J=W&&Rx(e,r,t,a);(V||J)&&(g={...g,...S_(m.data,e.options)}),t._optimisticResults==="isRestoring"&&(g.fetchStatus="idle")}let{error:E,errorUpdatedAt:w,status:_}=g;M=g.data;let y=!1;if(t.placeholderData!==void 0&&M===void 0&&_==="pending"){let W;l!=null&&l.isPlaceholderData&&t.placeholderData===(d==null?void 0:d.placeholderData)?(W=l.data,y=!0):W=typeof t.placeholderData=="function"?t.placeholderData((I=G(this,Co))==null?void 0:I.state.data,G(this,Co)):t.placeholderData,W!==void 0&&(_="success",M=Zf(l==null?void 0:l.data,W,t),x=!0)}if(t.select&&M!==void 0&&!y)if(l&&M===(c==null?void 0:c.data)&&t.select===G(this,Kl))M=G(this,To);else try{ze(this,Kl,t.select),M=t.select(M),M=Zf(l==null?void 0:l.data,M,t),ze(this,To,M),ze(this,Rs,null)}catch(W){ze(this,Rs,W)}G(this,Rs)&&(E=G(this,Rs),M=G(this,To),w=Date.now(),_="error");const L=g.fetchStatus==="fetching",P=_==="pending",T=_==="error",U=P&&L,N=M!==void 0,b={status:_,fetchStatus:g.fetchStatus,isPending:P,isSuccess:_==="success",isError:T,isInitialLoading:U,isLoading:U,data:M,dataUpdatedAt:g.dataUpdatedAt,error:E,errorUpdatedAt:w,failureCount:g.fetchFailureCount,failureReason:g.fetchFailureReason,errorUpdateCount:g.errorUpdateCount,isFetched:e.isFetched(),isFetchedAfterMount:g.dataUpdateCount>f.dataUpdateCount||g.errorUpdateCount>f.errorUpdateCount,isFetching:L,isRefetching:L&&!P,isLoadingError:T&&!N,isPaused:g.fetchStatus==="paused",isPlaceholderData:x,isRefetchError:T&&N,isStale:dm(e,t),refetch:this.refetch,promise:G(this,zr),isEnabled:yi(t.enabled,e)!==!1};if(this.options.experimental_prefetchInRender){const W=b.data!==void 0,V=b.status==="error"&&!W,J=k=>{V?k.reject(b.error):W&&k.resolve(b.data)},se=()=>{const k=ze(this,zr,b.promise=Jf());J(k)},j=G(this,zr);switch(j.status){case"pending":e.queryHash===r.queryHash&&J(j);break;case"fulfilled":(V||b.data!==j.value)&&se();break;case"rejected":(!V||b.error!==j.reason)&&se();break}}return b}updateResult(){const e=G(this,Qn),t=this.createResult(G(this,Rt),this.options);if(ze(this,va,G(this,Rt).state),ze(this,bo,this.options),G(this,va).data!==void 0&&ze(this,Co,G(this,Rt)),Ju(t,e))return;ze(this,Qn,t);const r=()=>{if(!e)return!0;const{notifyOnChangeProps:a}=this.options,l=typeof a=="function"?a():a;if(l==="all"||!l&&!G(this,Ro).size)return!0;const c=new Set(l??G(this,Ro));return this.options.throwOnError&&c.add("error"),Object.keys(G(this,Qn)).some(d=>{const h=d;return G(this,Qn)[h]!==e[h]&&c.has(h)})};gt(this,Ot,M_).call(this,{listeners:r()})}onQueryUpdate(){this.updateResult(),this.hasListeners()&&gt(this,Ot,rp).call(this)}},ui=new WeakMap,Rt=new WeakMap,Yl=new WeakMap,Qn=new WeakMap,va=new WeakMap,bo=new WeakMap,zr=new WeakMap,Rs=new WeakMap,Kl=new WeakMap,To=new WeakMap,Co=new WeakMap,_a=new WeakMap,ya=new WeakMap,As=new WeakMap,Ro=new WeakMap,Ot=new WeakSet,Il=function(e){gt(this,Ot,op).call(this);let t=G(this,Rt).fetch(this.options,e);return e!=null&&e.throwOnError||(t=t.catch(Zn)),t},tp=function(){gt(this,Ot,sp).call(this);const e=Us(this.options.staleTime,G(this,Rt));if(Hl.isServer()||G(this,Qn).isStale||!Kf(e))return;const r=p_(G(this,Qn).dataUpdatedAt,e)+1;ze(this,_a,ua.setTimeout(()=>{G(this,Qn).isStale||this.updateResult()},r))},np=function(){return(typeof this.options.refetchInterval=="function"?this.options.refetchInterval(G(this,Rt)):this.options.refetchInterval)??!1},ip=function(e){gt(this,Ot,ap).call(this),ze(this,As,e),!(Hl.isServer()||yi(this.options.enabled,G(this,Rt))===!1||!Kf(G(this,As))||G(this,As)===0)&&ze(this,ya,ua.setInterval(()=>{(this.options.refetchIntervalInBackground||om.isFocused())&&gt(this,Ot,Il).call(this)},G(this,As)))},rp=function(){gt(this,Ot,tp).call(this),gt(this,Ot,ip).call(this,gt(this,Ot,np).call(this))},sp=function(){G(this,_a)!==void 0&&(ua.clearTimeout(G(this,_a)),ze(this,_a,void 0))},ap=function(){G(this,ya)!==void 0&&(ua.clearInterval(G(this,ya)),ze(this,ya,void 0))},op=function(){const e=G(this,ui).getQueryCache().build(G(this,ui),this.options);if(e===G(this,Rt))return;const t=G(this,Rt);ze(this,Rt,e),ze(this,Yl,e.state),this.hasListeners()&&(t==null||t.removeObserver(this),e.addObserver(this))},M_=function(e){En.batch(()=>{e.listeners&&this.listeners.forEach(t=>{t(G(this,Qn))}),G(this,ui).getQueryCache().notify({query:G(this,Rt),type:"observerResultsUpdated"})})},l_);function GM(i,e){return yi(e.enabled,i)!==!1&&i.state.data===void 0&&!(i.state.status==="error"&&yi(e.retryOnMount,i)===!1)}function Cx(i,e){return GM(i,e)||i.state.data!==void 0&&lp(i,e,e.refetchOnMount)}function lp(i,e,t){if(yi(e.enabled,i)!==!1&&Us(e.staleTime,i)!=="static"){const r=typeof t=="function"?t(i):t;return r==="always"||r!==!1&&dm(i,e)}return!1}function Rx(i,e,t,r){return(i!==e||yi(r.enabled,i)===!1)&&(!t.suspense||i.state.status!=="error")&&dm(i,t)}function dm(i,e){return yi(e.enabled,i)!==!1&&i.isStaleByTime(Us(e.staleTime,i))}function jM(i,e){return!Ju(i.getCurrentResult(),e)}var Ql,lr,jn,Sa,cr,Ms,c_,WM=(c_=class extends __{constructor(e){super();rt(this,cr);rt(this,Ql);rt(this,lr);rt(this,jn);rt(this,Sa);ze(this,Ql,e.client),this.mutationId=e.mutationId,ze(this,jn,e.mutationCache),ze(this,lr,[]),this.state=e.state||E_(),this.setOptions(e.options),this.scheduleGc()}setOptions(e){this.options=e,this.updateGcTime(this.options.gcTime)}get meta(){return this.options.meta}addObserver(e){G(this,lr).includes(e)||(G(this,lr).push(e),this.clearGcTimeout(),G(this,jn).notify({type:"observerAdded",mutation:this,observer:e}))}removeObserver(e){ze(this,lr,G(this,lr).filter(t=>t!==e)),this.scheduleGc(),G(this,jn).notify({type:"observerRemoved",mutation:this,observer:e})}optionalRemove(){G(this,lr).length||(this.state.status==="pending"?this.scheduleGc():G(this,jn).remove(this))}continue(){var e;return((e=G(this,Sa))==null?void 0:e.continue())??this.execute(this.state.variables)}async execute(e){var c,d,h,f,m,g,x,M,E,w,_,y,L,P,T,U,N,O;const t=()=>{gt(this,cr,Ms).call(this,{type:"continue"})},r={client:G(this,Ql),meta:this.options.meta,mutationKey:this.options.mutationKey};ze(this,Sa,v_({fn:()=>this.options.mutationFn?this.options.mutationFn(e,r):Promise.reject(new Error("No mutationFn found")),onFail:(b,I)=>{gt(this,cr,Ms).call(this,{type:"failed",failureCount:b,error:I})},onPause:()=>{gt(this,cr,Ms).call(this,{type:"pause"})},onContinue:t,retry:this.options.retry??0,retryDelay:this.options.retryDelay,networkMode:this.options.networkMode,canRun:()=>G(this,jn).canRun(this)}));const a=this.state.status==="pending",l=!G(this,Sa).canStart();try{if(a)t();else{gt(this,cr,Ms).call(this,{type:"pending",variables:e,isPaused:l}),G(this,jn).config.onMutate&&await G(this,jn).config.onMutate(e,this,r);const I=await((d=(c=this.options).onMutate)==null?void 0:d.call(c,e,r));I!==this.state.context&&gt(this,cr,Ms).call(this,{type:"pending",context:I,variables:e,isPaused:l})}const b=await G(this,Sa).start();return await((f=(h=G(this,jn).config).onSuccess)==null?void 0:f.call(h,b,e,this.state.context,this,r)),await((g=(m=this.options).onSuccess)==null?void 0:g.call(m,b,e,this.state.context,r)),await((M=(x=G(this,jn).config).onSettled)==null?void 0:M.call(x,b,null,this.state.variables,this.state.context,this,r)),await((w=(E=this.options).onSettled)==null?void 0:w.call(E,b,null,e,this.state.context,r)),gt(this,cr,Ms).call(this,{type:"success",data:b}),b}catch(b){try{await((y=(_=G(this,jn).config).onError)==null?void 0:y.call(_,b,e,this.state.context,this,r))}catch(I){Promise.reject(I)}try{await((P=(L=this.options).onError)==null?void 0:P.call(L,b,e,this.state.context,r))}catch(I){Promise.reject(I)}try{await((U=(T=G(this,jn).config).onSettled)==null?void 0:U.call(T,void 0,b,this.state.variables,this.state.context,this,r))}catch(I){Promise.reject(I)}try{await((O=(N=this.options).onSettled)==null?void 0:O.call(N,void 0,b,e,this.state.context,r))}catch(I){Promise.reject(I)}throw gt(this,cr,Ms).call(this,{type:"error",error:b}),b}finally{G(this,jn).runNext(this)}}},Ql=new WeakMap,lr=new WeakMap,jn=new WeakMap,Sa=new WeakMap,cr=new WeakSet,Ms=function(e){const t=r=>{switch(e.type){case"failed":return{...r,failureCount:e.failureCount,failureReason:e.error};case"pause":return{...r,isPaused:!0};case"continue":return{...r,isPaused:!1};case"pending":return{...r,context:e.context,data:void 0,failureCount:0,failureReason:null,error:null,isPaused:e.isPaused,status:"pending",variables:e.variables,submittedAt:Date.now()};case"success":return{...r,data:e.data,failureCount:0,failureReason:null,error:null,status:"success",isPaused:!1};case"error":return{...r,data:void 0,error:e.error,failureCount:r.failureCount+1,failureReason:e.error,isPaused:!1,status:"error"}}};this.state=t(this.state),En.batch(()=>{G(this,lr).forEach(r=>{r.onMutationUpdate(e)}),G(this,jn).notify({mutation:this,type:"updated",action:e})})},c_);function E_(){return{context:void 0,data:void 0,error:null,failureCount:0,failureReason:null,isPaused:!1,status:"idle",variables:void 0,submittedAt:0}}var Br,qi,Zl,u_,XM=(u_=class extends Oo{constructor(e={}){super();rt(this,Br);rt(this,qi);rt(this,Zl);this.config=e,ze(this,Br,new Set),ze(this,qi,new Map),ze(this,Zl,0)}build(e,t,r){const a=new WM({client:e,mutationCache:this,mutationId:++lu(this,Zl)._,options:e.defaultMutationOptions(t),state:r});return this.add(a),a}add(e){G(this,Br).add(e);const t=uu(e);if(typeof t=="string"){const r=G(this,qi).get(t);r?r.push(e):G(this,qi).set(t,[e])}this.notify({type:"added",mutation:e})}remove(e){if(G(this,Br).delete(e)){const t=uu(e);if(typeof t=="string"){const r=G(this,qi).get(t);if(r)if(r.length>1){const a=r.indexOf(e);a!==-1&&r.splice(a,1)}else r[0]===e&&G(this,qi).delete(t)}}this.notify({type:"removed",mutation:e})}canRun(e){const t=uu(e);if(typeof t=="string"){const r=G(this,qi).get(t),a=r==null?void 0:r.find(l=>l.state.status==="pending");return!a||a===e}else return!0}runNext(e){var r;const t=uu(e);if(typeof t=="string"){const a=(r=G(this,qi).get(t))==null?void 0:r.find(l=>l!==e&&l.state.isPaused);return(a==null?void 0:a.continue())??Promise.resolve()}else return Promise.resolve()}clear(){En.batch(()=>{G(this,Br).forEach(e=>{this.notify({type:"removed",mutation:e})}),G(this,Br).clear(),G(this,qi).clear()})}getAll(){return Array.from(G(this,Br))}find(e){const t={exact:!0,...e};return this.getAll().find(r=>Sx(t,r))}findAll(e={}){return this.getAll().filter(t=>Sx(e,t))}notify(e){En.batch(()=>{this.listeners.forEach(t=>{t(e)})})}resumePausedMutations(){const e=this.getAll().filter(t=>t.state.isPaused);return En.batch(()=>Promise.all(e.map(t=>t.continue().catch(Zn))))}},Br=new WeakMap,qi=new WeakMap,Zl=new WeakMap,u_);function uu(i){var e;return(e=i.options.scope)==null?void 0:e.id}var Hr,Ps,di,Vr,Xr,Hu,cp,d_,$M=(d_=class extends Oo{constructor(t,r){super();rt(this,Xr);rt(this,Hr);rt(this,Ps);rt(this,di);rt(this,Vr);ze(this,Hr,t),this.setOptions(r),this.bindMethods(),gt(this,Xr,Hu).call(this)}bindMethods(){this.mutate=this.mutate.bind(this),this.reset=this.reset.bind(this)}setOptions(t){var a;const r=this.options;this.options=G(this,Hr).defaultMutationOptions(t),Ju(this.options,r)||G(this,Hr).getMutationCache().notify({type:"observerOptionsUpdated",mutation:G(this,di),observer:this}),r!=null&&r.mutationKey&&this.options.mutationKey&&Ma(r.mutationKey)!==Ma(this.options.mutationKey)?this.reset():((a=G(this,di))==null?void 0:a.state.status)==="pending"&&G(this,di).setOptions(this.options)}onUnsubscribe(){var t;this.hasListeners()||(t=G(this,di))==null||t.removeObserver(this)}onMutationUpdate(t){gt(this,Xr,Hu).call(this),gt(this,Xr,cp).call(this,t)}getCurrentResult(){return G(this,Ps)}reset(){var t;(t=G(this,di))==null||t.removeObserver(this),ze(this,di,void 0),gt(this,Xr,Hu).call(this),gt(this,Xr,cp).call(this)}mutate(t,r){var a;return ze(this,Vr,r),(a=G(this,di))==null||a.removeObserver(this),ze(this,di,G(this,Hr).getMutationCache().build(G(this,Hr),this.options)),G(this,di).addObserver(this),G(this,di).execute(t)}},Hr=new WeakMap,Ps=new WeakMap,di=new WeakMap,Vr=new WeakMap,Xr=new WeakSet,Hu=function(){var r;const t=((r=G(this,di))==null?void 0:r.state)??E_();ze(this,Ps,{...t,isPending:t.status==="pending",isSuccess:t.status==="success",isError:t.status==="error",isIdle:t.status==="idle",mutate:this.mutate,reset:this.reset})},cp=function(t){En.batch(()=>{var r,a,l,c,d,h,f,m;if(G(this,Vr)&&this.hasListeners()){const g=G(this,Ps).variables,x=G(this,Ps).context,M={client:G(this,Hr),meta:this.options.meta,mutationKey:this.options.mutationKey};if((t==null?void 0:t.type)==="success"){try{(a=(r=G(this,Vr)).onSuccess)==null||a.call(r,t.data,g,x,M)}catch(E){Promise.reject(E)}try{(c=(l=G(this,Vr)).onSettled)==null||c.call(l,t.data,null,g,x,M)}catch(E){Promise.reject(E)}}else if((t==null?void 0:t.type)==="error"){try{(h=(d=G(this,Vr)).onError)==null||h.call(d,t.error,g,x,M)}catch(E){Promise.reject(E)}try{(m=(f=G(this,Vr)).onSettled)==null||m.call(f,void 0,t.error,g,x,M)}catch(E){Promise.reject(E)}}}this.listeners.forEach(g=>{g(G(this,Ps))})})},d_),ur,h_,qM=(h_=class extends Oo{constructor(e={}){super();rt(this,ur);this.config=e,ze(this,ur,new Map)}build(e,t,r){const a=t.queryKey,l=t.queryHash??lm(a,t);let c=this.get(l);return c||(c=new HM({client:e,queryKey:a,queryHash:l,options:e.defaultQueryOptions(t),state:r,defaultOptions:e.getQueryDefaults(a)}),this.add(c)),c}add(e){G(this,ur).has(e.queryHash)||(G(this,ur).set(e.queryHash,e),this.notify({type:"added",query:e}))}remove(e){const t=G(this,ur).get(e.queryHash);t&&(e.destroy(),t===e&&G(this,ur).delete(e.queryHash),this.notify({type:"removed",query:e}))}clear(){En.batch(()=>{this.getAll().forEach(e=>{this.remove(e)})})}get(e){return G(this,ur).get(e)}getAll(){return[...G(this,ur).values()]}find(e){const t={exact:!0,...e};return this.getAll().find(r=>yx(t,r))}findAll(e={}){const t=this.getAll();return Object.keys(e).length>0?t.filter(r=>yx(e,r)):t}notify(e){En.batch(()=>{this.listeners.forEach(t=>{t(e)})})}onFocus(){En.batch(()=>{this.getAll().forEach(e=>{e.onFocus()})})}onOnline(){En.batch(()=>{this.getAll().forEach(e=>{e.onOnline()})})}},ur=new WeakMap,h_),hn,Ns,Ls,Ao,Po,Ds,No,Lo,f_,YM=(f_=class{constructor(i={}){rt(this,hn);rt(this,Ns);rt(this,Ls);rt(this,Ao);rt(this,Po);rt(this,Ds);rt(this,No);rt(this,Lo);ze(this,hn,i.queryCache||new qM),ze(this,Ns,i.mutationCache||new XM),ze(this,Ls,i.defaultOptions||{}),ze(this,Ao,new Map),ze(this,Po,new Map),ze(this,Ds,0)}mount(){lu(this,Ds)._++,G(this,Ds)===1&&(ze(this,No,om.subscribe(async i=>{i&&(await this.resumePausedMutations(),G(this,hn).onFocus())})),ze(this,Lo,ed.subscribe(async i=>{i&&(await this.resumePausedMutations(),G(this,hn).onOnline())})))}unmount(){var i,e;lu(this,Ds)._--,G(this,Ds)===0&&((i=G(this,No))==null||i.call(this),ze(this,No,void 0),(e=G(this,Lo))==null||e.call(this),ze(this,Lo,void 0))}isFetching(i){return G(this,hn).findAll({...i,fetchStatus:"fetching"}).length}isMutating(i){return G(this,Ns).findAll({...i,status:"pending"}).length}getQueryData(i){var t;const e=this.defaultQueryOptions({queryKey:i});return(t=G(this,hn).get(e.queryHash))==null?void 0:t.state.data}ensureQueryData(i){const e=this.defaultQueryOptions(i),t=G(this,hn).build(this,e),r=t.state.data;return r===void 0?this.fetchQuery(i):(i.revalidateIfStale&&t.isStaleByTime(Us(e.staleTime,t))&&this.prefetchQuery(e),Promise.resolve(r))}getQueriesData(i){return G(this,hn).findAll(i).map(({queryKey:e,state:t})=>{const r=t.data;return[e,r]})}setQueryData(i,e,t){const r=this.defaultQueryOptions({queryKey:i}),a=G(this,hn).get(r.queryHash),l=a==null?void 0:a.state.data,c=AM(e,l);if(c!==void 0)return G(this,hn).build(this,r).setData(c,{...t,manual:!0})}setQueriesData(i,e,t){return En.batch(()=>G(this,hn).findAll(i).map(({queryKey:r})=>[r,this.setQueryData(r,e,t)]))}getQueryState(i){var t;const e=this.defaultQueryOptions({queryKey:i});return(t=G(this,hn).get(e.queryHash))==null?void 0:t.state}removeQueries(i){const e=G(this,hn);En.batch(()=>{e.findAll(i).forEach(t=>{e.remove(t)})})}resetQueries(i,e){const t=G(this,hn);return En.batch(()=>(t.findAll(i).forEach(r=>{r.reset()}),this.refetchQueries({type:"active",...i},e)))}cancelQueries(i,e={}){const t={revert:!0,...e},r=En.batch(()=>G(this,hn).findAll(i).map(a=>a.cancel(t)));return Promise.all(r).then(Zn).catch(Zn)}invalidateQueries(i,e={}){return En.batch(()=>(G(this,hn).findAll(i).forEach(t=>{t.invalidate()}),(i==null?void 0:i.refetchType)==="none"?Promise.resolve():this.refetchQueries({...i,type:(i==null?void 0:i.refetchType)??(i==null?void 0:i.type)??"active"},e)))}refetchQueries(i,e={}){const t={...e,cancelRefetch:e.cancelRefetch??!0},r=En.batch(()=>G(this,hn).findAll(i).filter(a=>!a.isDisabled()&&!a.isStatic()).map(a=>{let l=a.fetch(void 0,t);return t.throwOnError||(l=l.catch(Zn)),a.state.fetchStatus==="paused"?Promise.resolve():l}));return Promise.all(r).then(Zn)}fetchQuery(i){const e=this.defaultQueryOptions(i);e.retry===void 0&&(e.retry=!1);const t=G(this,hn).build(this,e);return t.isStaleByTime(Us(e.staleTime,t))?t.fetch(e):Promise.resolve(t.state.data)}prefetchQuery(i){return this.fetchQuery(i).then(Zn).catch(Zn)}fetchInfiniteQuery(i){return i._type="infinite",this.fetchQuery(i)}prefetchInfiniteQuery(i){return this.fetchInfiniteQuery(i).then(Zn).catch(Zn)}ensureInfiniteQueryData(i){return i._type="infinite",this.ensureQueryData(i)}resumePausedMutations(){return ed.isOnline()?G(this,Ns).resumePausedMutations():Promise.resolve()}getQueryCache(){return G(this,hn)}getMutationCache(){return G(this,Ns)}getDefaultOptions(){return G(this,Ls)}setDefaultOptions(i){ze(this,Ls,i)}setQueryDefaults(i,e){G(this,Ao).set(Ma(i),{queryKey:i,defaultOptions:e})}getQueryDefaults(i){const e=[...G(this,Ao).values()],t={};return e.forEach(r=>{Bl(i,r.queryKey)&&Object.assign(t,r.defaultOptions)}),t}setMutationDefaults(i,e){G(this,Po).set(Ma(i),{mutationKey:i,defaultOptions:e})}getMutationDefaults(i){const e=[...G(this,Po).values()],t={};return e.forEach(r=>{Bl(i,r.mutationKey)&&Object.assign(t,r.defaultOptions)}),t}defaultQueryOptions(i){if(i._defaulted)return i;const e={...G(this,Ls).queries,...this.getQueryDefaults(i.queryKey),...i,_defaulted:!0};return e.queryHash||(e.queryHash=lm(e.queryKey,e)),e.refetchOnReconnect===void 0&&(e.refetchOnReconnect=e.networkMode!=="always"),e.throwOnError===void 0&&(e.throwOnError=!!e.suspense),!e.networkMode&&e.persister&&(e.networkMode="offlineFirst"),e.queryFn===cm&&(e.enabled=!1),e}defaultMutationOptions(i){return i!=null&&i._defaulted?i:{...G(this,Ls).mutations,...(i==null?void 0:i.mutationKey)&&this.getMutationDefaults(i.mutationKey),...i,_defaulted:!0}}clear(){G(this,hn).clear(),G(this,Ns).clear()}},hn=new WeakMap,Ns=new WeakMap,Ls=new WeakMap,Ao=new WeakMap,Po=new WeakMap,Ds=new WeakMap,No=new WeakMap,Lo=new WeakMap,f_),w_=H.createContext(void 0),hm=i=>{const e=H.useContext(w_);if(!e)throw new Error("No QueryClient set, use QueryClientProvider to set one");return e},KM=({client:i,children:e})=>(H.useEffect(()=>(i.mount(),()=>{i.unmount()}),[i]),v.jsx(w_.Provider,{value:i,children:e})),b_=H.createContext(!1),QM=()=>H.useContext(b_);b_.Provider;function ZM(){let i=!1;return{clearReset:()=>{i=!1},reset:()=>{i=!0},isReset:()=>i}}var JM=H.createContext(ZM()),eE=()=>H.useContext(JM),tE=(i,e,t)=>{const r=t!=null&&t.state.error&&typeof i.throwOnError=="function"?um(i.throwOnError,[t.state.error,t]):i.throwOnError;(i.suspense||i.experimental_prefetchInRender||r)&&(e.isReset()||(i.retryOnMount=!1))},nE=i=>{H.useEffect(()=>{i.clearReset()},[i])},iE=({result:i,errorResetBoundary:e,throwOnError:t,query:r,suspense:a})=>i.isError&&!e.isReset()&&!i.isFetching&&r&&(a&&i.data===void 0||um(t,[i.error,r])),rE=i=>{if(i.suspense){const t=a=>a==="static"?a:Math.max(a??1e3,1e3),r=i.staleTime;i.staleTime=typeof r=="function"?(...a)=>t(r(...a)):t(r),typeof i.gcTime=="number"&&(i.gcTime=Math.max(i.gcTime,1e3))}},sE=(i,e)=>i.isLoading&&i.isFetching&&!e,aE=(i,e)=>(i==null?void 0:i.suspense)&&e.isPending,Ax=(i,e,t)=>e.fetchOptimistic(i).catch(()=>{t.clearReset()});function oE(i,e,t){var M,E,w,_;const r=QM(),a=eE(),l=hm(),c=l.defaultQueryOptions(i);(E=(M=l.getDefaultOptions().queries)==null?void 0:M._experimental_beforeQuery)==null||E.call(M,c);const d=l.getQueryCache().get(c.queryHash),h=i.subscribed!==!1;c._optimisticResults=r?"isRestoring":h?"optimistic":void 0,rE(c),tE(c,a,d),nE(a);const f=!l.getQueryCache().get(c.queryHash),[m]=H.useState(()=>new e(l,c)),g=m.getOptimisticResult(c),x=!r&&h;if(H.useSyncExternalStore(H.useCallback(y=>{const L=x?m.subscribe(En.batchCalls(y)):Zn;return m.updateResult(),L},[m,x]),()=>m.getCurrentResult(),()=>m.getCurrentResult()),H.useEffect(()=>{m.setOptions(c)},[c,m]),aE(c,g))throw Ax(c,m,a);if(iE({result:g,errorResetBoundary:a,throwOnError:c.throwOnError,query:d,suspense:c.suspense}))throw g.error;if((_=(w=l.getDefaultOptions().queries)==null?void 0:w._experimental_afterQuery)==null||_.call(w,c,g),c.experimental_prefetchInRender&&!Hl.isServer()&&sE(g,r)){const y=f?Ax(c,m,a):d==null?void 0:d.promise;y==null||y.catch(Zn).finally(()=>{m.updateResult()})}return c.notifyOnChangeProps?g:m.trackResult(g)}function Ea(i,e){return oE(i,VM)}function kr(i,e){const t=hm(),[r]=H.useState(()=>new $M(t,i));H.useEffect(()=>{r.setOptions(i)},[r,i]);const a=H.useSyncExternalStore(H.useCallback(c=>r.subscribe(En.batchCalls(c)),[r]),()=>r.getCurrentResult(),()=>r.getCurrentResult()),l=H.useCallback((c,d)=>{r.mutate(c,d).catch(Zn)},[r]);if(a.error&&um(r.options.throwOnError,[a.error]))throw a.error;return{...a,mutate:l,mutateAsync:a.mutate}}/**
 * react-router v7.18.0
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */var fm=/^(?:[a-z][a-z0-9+.-]*:|[\\/]{2})/i,T_=/^[\\/]{2}/;function lE(i,e){return e+i.replace(/\\/g,"/")}var Px="popstate";function Nx(i){return typeof i=="object"&&i!=null&&"pathname"in i&&"search"in i&&"hash"in i&&"state"in i&&"key"in i}function cE(i={}){function e(r,a){var f;let l=(f=a.state)==null?void 0:f.masked,{pathname:c,search:d,hash:h}=l||r.location;return up("",{pathname:c,search:d,hash:h},a.state&&a.state.usr||null,a.state&&a.state.key||"default",l?{pathname:r.location.pathname,search:r.location.search,hash:r.location.hash}:void 0)}function t(r,a){return typeof a=="string"?a:Vl(a)}return dE(e,t,null,i)}function sn(i,e){if(i===!1||i===null||typeof i>"u")throw new Error(e)}function Ui(i,e){if(!i){typeof console<"u"&&console.warn(e);try{throw new Error(e)}catch{}}}function uE(){return Math.random().toString(36).substring(2,10)}function Lx(i,e){return{usr:i.state,key:i.key,idx:e,masked:i.mask?{pathname:i.pathname,search:i.search,hash:i.hash}:void 0}}function up(i,e,t=null,r,a){return{pathname:typeof i=="string"?i:i.pathname,search:"",hash:"",...typeof e=="string"?ko(e):e,state:t,key:e&&e.key||r||uE(),mask:a}}function Vl({pathname:i="/",search:e="",hash:t=""}){return e&&e!=="?"&&(i+=e.charAt(0)==="?"?e:"?"+e),t&&t!=="#"&&(i+=t.charAt(0)==="#"?t:"#"+t),i}function ko(i){let e={};if(i){let t=i.indexOf("#");t>=0&&(e.hash=i.substring(t),i=i.substring(0,t));let r=i.indexOf("?");r>=0&&(e.search=i.substring(r),i=i.substring(0,r)),i&&(e.pathname=i)}return e}function dE(i,e,t,r={}){let{window:a=document.defaultView,v5Compat:l=!1}=r,c=a.history,d="POP",h=null,f=m();f==null&&(f=0,c.replaceState({...c.state,idx:f},""));function m(){return(c.state||{idx:null}).idx}function g(){d="POP";let _=m(),y=_==null?null:_-f;f=_,h&&h({action:d,location:w.location,delta:y})}function x(_,y){d="PUSH";let L=Nx(_)?_:up(w.location,_,y);f=m()+1;let P=Lx(L,f),T=w.createHref(L.mask||L);try{c.pushState(P,"",T)}catch(U){if(U instanceof DOMException&&U.name==="DataCloneError")throw U;a.location.assign(T)}l&&h&&h({action:d,location:w.location,delta:1})}function M(_,y){d="REPLACE";let L=Nx(_)?_:up(w.location,_,y);f=m();let P=Lx(L,f),T=w.createHref(L.mask||L);c.replaceState(P,"",T),l&&h&&h({action:d,location:w.location,delta:0})}function E(_){return hE(a,_)}let w={get action(){return d},get location(){return i(a,c)},listen(_){if(h)throw new Error("A history only accepts one active listener");return a.addEventListener(Px,g),h=_,()=>{a.removeEventListener(Px,g),h=null}},createHref(_){return e(a,_)},createURL:E,encodeLocation(_){let y=E(_);return{pathname:y.pathname,search:y.search,hash:y.hash}},push:x,replace:M,go(_){return c.go(_)}};return w}function hE(i,e,t=!1){let r="http://localhost";i&&(r=i.location.origin!=="null"?i.location.origin:i.location.href),sn(r,"No window.location.(origin|href) available to create URL");let a=typeof e=="string"?e:Vl(e);return a=a.replace(/ $/,"%20"),!t&&T_.test(a)&&(a=r+a),new URL(a,r)}function C_(i,e,t="/"){return fE(i,e,t,!1)}function fE(i,e,t,r,a){let l=typeof e=="string"?ko(e):e,c=$r(l.pathname||"/",t);if(c==null)return null;let d=pE(i),h=null,f=bE(c);for(let m=0;h==null&&m<d.length;++m)h=wE(d[m],f,r);return h}function pE(i){let e=R_(i);return mE(e),e}function R_(i,e=[],t=[],r="",a=!1){let l=(c,d,h=a,f)=>{let m={relativePath:f===void 0?c.path||"":f,caseSensitive:c.caseSensitive===!0,childrenIndex:d,route:c};if(m.relativePath.startsWith("/")){if(!m.relativePath.startsWith(r)&&h)return;sn(m.relativePath.startsWith(r),`Absolute route path "${m.relativePath}" nested under path "${r}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`),m.relativePath=m.relativePath.slice(r.length)}let g=Qi([r,m.relativePath]),x=t.concat(m);c.children&&c.children.length>0&&(sn(c.index!==!0,`Index routes must not have child routes. Please remove all child routes from route path "${g}".`),R_(c.children,e,x,g,h)),!(c.path==null&&!c.index)&&e.push({path:g,score:ME(g,c.index),routesMeta:x.map((M,E)=>{let[w,_]=N_(M.relativePath,M.caseSensitive,E===x.length-1);return{...M,matcher:w,compiledParams:_}})})};return i.forEach((c,d)=>{var h;if(c.path===""||!((h=c.path)!=null&&h.includes("?")))l(c,d);else for(let f of A_(c.path))l(c,d,!0,f)}),e}function A_(i){let e=i.split("/");if(e.length===0)return[];let[t,...r]=e,a=t.endsWith("?"),l=t.replace(/\?$/,"");if(r.length===0)return a?[l,""]:[l];let c=A_(r.join("/")),d=[];return d.push(...c.map(h=>h===""?l:[l,h].join("/"))),a&&d.push(...c),d.map(h=>i.startsWith("/")&&h===""?"/":h)}function mE(i){i.sort((e,t)=>e.score!==t.score?t.score-e.score:EE(e.routesMeta.map(r=>r.childrenIndex),t.routesMeta.map(r=>r.childrenIndex)))}var gE=/^:[\w-]+$/,xE=3,vE=2,_E=1,yE=10,SE=-2,Dx=i=>i==="*";function ME(i,e){let t=i.split("/"),r=t.length;return t.some(Dx)&&(r+=SE),e&&(r+=vE),t.filter(a=>!Dx(a)).reduce((a,l)=>a+(gE.test(l)?xE:l===""?_E:yE),r)}function EE(i,e){return i.length===e.length&&i.slice(0,-1).every((r,a)=>r===e[a])?i[i.length-1]-e[e.length-1]:0}function wE(i,e,t=!1){let{routesMeta:r}=i,a={},l="/",c=[];for(let d=0;d<r.length;++d){let h=r[d],f=d===r.length-1,m=l==="/"?e:e.slice(l.length)||"/",g={path:h.relativePath,caseSensitive:h.caseSensitive,end:f},x=h.matcher&&h.compiledParams?P_(g,m,h.matcher,h.compiledParams):td(g,m),M=h.route;if(!x&&f&&t&&!r[r.length-1].route.index&&(x=td({path:h.relativePath,caseSensitive:h.caseSensitive,end:!1},m)),!x)return null;Object.assign(a,x.params),c.push({params:a,pathname:Qi([l,x.pathname]),pathnameBase:RE(Qi([l,x.pathnameBase])),route:M}),x.pathnameBase!=="/"&&(l=Qi([l,x.pathnameBase]))}return c}function td(i,e){typeof i=="string"&&(i={path:i,caseSensitive:!1,end:!0});let[t,r]=N_(i.path,i.caseSensitive,i.end);return P_(i,e,t,r)}function P_(i,e,t,r){let a=e.match(t);if(!a)return null;let l=a[0],c=l.replace(/(.)\/+$/,"$1"),d=a.slice(1);return{params:r.reduce((f,{paramName:m,isOptional:g},x)=>{if(m==="*"){let E=d[x]||"";c=l.slice(0,l.length-E.length).replace(/(.)\/+$/,"$1")}const M=d[x];return g&&!M?f[m]=void 0:f[m]=(M||"").replace(/%2F/g,"/"),f},{}),pathname:l,pathnameBase:c,pattern:i}}function N_(i,e=!1,t=!0){Ui(i==="*"||!i.endsWith("*")||i.endsWith("/*"),`Route path "${i}" will be treated as if it were "${i.replace(/\*$/,"/*")}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${i.replace(/\*$/,"/*")}".`);let r=[],a="^"+i.replace(/\/*\*?$/,"").replace(/^\/*/,"/").replace(/[\\.*+^${}|()[\]]/g,"\\$&").replace(/\/:([\w-]+)(\?)?/g,(c,d,h,f,m)=>{if(r.push({paramName:d,isOptional:h!=null}),h){let g=m.charAt(f+c.length);return g&&g!=="/"?"/([^\\/]*)":"(?:/([^\\/]*))?"}return"/([^\\/]+)"}).replace(/\/([\w-]+)\?(\/|$)/g,"(/$1)?$2");return i.endsWith("*")?(r.push({paramName:"*"}),a+=i==="*"||i==="/*"?"(.*)$":"(?:\\/(.+)|\\/*)$"):t?a+="\\/*$":i!==""&&i!=="/"&&(a+="(?:(?=\\/|$))"),[new RegExp(a,e?void 0:"i"),r]}function bE(i){try{return i.split("/").map(e=>decodeURIComponent(e).replace(/\//g,"%2F")).join("/")}catch(e){return Ui(!1,`The URL path "${i}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${e}).`),i}}function $r(i,e){if(e==="/")return i;if(!i.toLowerCase().startsWith(e.toLowerCase()))return null;let t=e.endsWith("/")?e.length-1:e.length,r=i.charAt(t);return r&&r!=="/"?null:i.slice(t)||"/"}function TE(i,e="/"){let{pathname:t,search:r="",hash:a=""}=typeof i=="string"?ko(i):i,l;return t?(t=L_(t),t.startsWith("/")?l=Ix(t.substring(1),"/"):l=Ix(t,e)):l=e,{pathname:l,search:AE(r),hash:PE(a)}}function Ix(i,e){let t=nd(e).split("/");return i.split("/").forEach(a=>{a===".."?t.length>1&&t.pop():a!=="."&&t.push(a)}),t.length>1?t.join("/"):"/"}function sf(i,e,t,r){return`Cannot include a '${i}' character in a manually specified \`to.${e}\` field [${JSON.stringify(r)}].  Please separate it out to the \`to.${t}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`}function CE(i){return i.filter((e,t)=>t===0||e.route.path&&e.route.path.length>0)}function pm(i){let e=CE(i);return e.map((t,r)=>r===e.length-1?t.pathname:t.pathnameBase)}function hd(i,e,t,r=!1){let a;typeof i=="string"?a=ko(i):(a={...i},sn(!a.pathname||!a.pathname.includes("?"),sf("?","pathname","search",a)),sn(!a.pathname||!a.pathname.includes("#"),sf("#","pathname","hash",a)),sn(!a.search||!a.search.includes("#"),sf("#","search","hash",a)));let l=i===""||a.pathname==="",c=l?"/":a.pathname,d;if(c==null)d=t;else{let g=e.length-1;if(!r&&c.startsWith("..")){let x=c.split("/");for(;x[0]==="..";)x.shift(),g-=1;a.pathname=x.join("/")}d=g>=0?e[g]:"/"}let h=TE(a,d),f=c&&c!=="/"&&c.endsWith("/"),m=(l||c===".")&&t.endsWith("/");return!h.pathname.endsWith("/")&&(f||m)&&(h.pathname+="/"),h}var L_=i=>i.replace(/[\\/]{2,}/g,"/"),Qi=i=>L_(i.join("/")),nd=i=>i.replace(/\/+$/,""),RE=i=>nd(i).replace(/^\/*/,"/"),AE=i=>!i||i==="?"?"":i.startsWith("?")?i:"?"+i,PE=i=>!i||i==="#"?"":i.startsWith("#")?i:"#"+i,NE=class{constructor(i,e,t,r=!1){this.status=i,this.statusText=e||"",this.internal=r,t instanceof Error?(this.data=t.toString(),this.error=t):this.data=t}};function LE(i){return i!=null&&typeof i.status=="number"&&typeof i.statusText=="string"&&typeof i.internal=="boolean"&&"data"in i}function DE(i){let e=i.map(t=>t.route.path).filter(Boolean);return Qi(e)||"/"}var D_=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";function I_(i,e){let t=i;if(typeof t!="string"||!fm.test(t))return{absoluteURL:void 0,isExternal:!1,to:t};let r=t,a=!1;if(D_)try{let l=new URL(window.location.href),c=T_.test(t)?new URL(lE(t,l.protocol)):new URL(t),d=$r(c.pathname,e);c.origin===l.origin&&d!=null?t=d+c.search+c.hash:a=!0}catch{Ui(!1,`<Link to="${t}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`)}return{absoluteURL:r,isExternal:a,to:t}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");var U_=["POST","PUT","PATCH","DELETE"];new Set(U_);var IE=["GET",...U_];new Set(IE);var UE=["about:","blob:","chrome:","chrome-untrusted:","content:","data:","devtools:","file:","filesystem:","javascript:"];function FE(i){try{return UE.includes(new URL(i).protocol)}catch{return!1}}var zo=H.createContext(null);zo.displayName="DataRouter";var fd=H.createContext(null);fd.displayName="DataRouterState";var F_=H.createContext(!1);function OE(){return H.useContext(F_)}var O_=H.createContext({isTransitioning:!1});O_.displayName="ViewTransition";var kE=H.createContext(new Map);kE.displayName="Fetchers";var zE=H.createContext(null);zE.displayName="Await";var Ei=H.createContext(null);Ei.displayName="Navigation";var Jl=H.createContext(null);Jl.displayName="Location";var Ji=H.createContext({outlet:null,matches:[],isDataRoute:!1});Ji.displayName="Route";var mm=H.createContext(null);mm.displayName="RouteError";var k_="REACT_ROUTER_ERROR",BE="REDIRECT",HE="ROUTE_ERROR_RESPONSE";function VE(i){if(i.startsWith(`${k_}:${BE}:{`))try{let e=JSON.parse(i.slice(28));if(typeof e=="object"&&e&&typeof e.status=="number"&&typeof e.statusText=="string"&&typeof e.location=="string"&&typeof e.reloadDocument=="boolean"&&typeof e.replace=="boolean")return e}catch{}}function GE(i){if(i.startsWith(`${k_}:${HE}:{`))try{let e=JSON.parse(i.slice(40));if(typeof e=="object"&&e&&typeof e.status=="number"&&typeof e.statusText=="string")return new NE(e.status,e.statusText,e.data)}catch{}}function jE(i,{relative:e}={}){sn(Bo(),"useHref() may be used only in the context of a <Router> component.");let{basename:t,navigator:r}=H.useContext(Ei),{hash:a,pathname:l,search:c}=ec(i,{relative:e}),d=l;return t!=="/"&&(d=l==="/"?t:Qi([t,l])),r.createHref({pathname:d,search:c,hash:a})}function Bo(){return H.useContext(Jl)!=null}function er(){return sn(Bo(),"useLocation() may be used only in the context of a <Router> component."),H.useContext(Jl).location}var z_="You should call navigate() in a React.useEffect(), not when your component is first rendered.";function B_(i){H.useContext(Ei).static||H.useLayoutEffect(i)}function gm(){let{isDataRoute:i}=H.useContext(Ji);return i?s1():WE()}function WE(){sn(Bo(),"useNavigate() may be used only in the context of a <Router> component.");let i=H.useContext(zo),{basename:e,navigator:t}=H.useContext(Ei),{matches:r}=H.useContext(Ji),{pathname:a}=er(),l=JSON.stringify(pm(r)),c=H.useRef(!1);return B_(()=>{c.current=!0}),H.useCallback((h,f={})=>{if(Ui(c.current,z_),!c.current)return;if(typeof h=="number"){t.go(h);return}let m=hd(h,JSON.parse(l),a,f.relative==="path");i==null&&e!=="/"&&(m.pathname=m.pathname==="/"?e:Qi([e,m.pathname])),(f.replace?t.replace:t.push)(m,f.state,f)},[e,t,l,a,i])}var XE=H.createContext(null);function $E(i){let e=H.useContext(Ji).outlet;return H.useMemo(()=>e&&H.createElement(XE.Provider,{value:i},e),[e,i])}function ec(i,{relative:e}={}){let{matches:t}=H.useContext(Ji),{pathname:r}=er(),a=JSON.stringify(pm(t));return H.useMemo(()=>hd(i,JSON.parse(a),r,e==="path"),[i,a,r,e])}function qE(i,e){return H_(i,e)}function H_(i,e,t){var _;sn(Bo(),"useRoutes() may be used only in the context of a <Router> component.");let{navigator:r}=H.useContext(Ei),{matches:a}=H.useContext(Ji),l=a[a.length-1],c=l?l.params:{},d=l?l.pathname:"/",h=l?l.pathnameBase:"/",f=l&&l.route;{let y=f&&f.path||"";G_(d,!f||y.endsWith("*")||y.endsWith("*?"),`You rendered descendant <Routes> (or called \`useRoutes()\`) at "${d}" (under <Route path="${y}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${y}"> to <Route path="${y==="/"?"*":`${y}/*`}">.`)}let m=er(),g;if(e){let y=typeof e=="string"?ko(e):e;sn(h==="/"||((_=y.pathname)==null?void 0:_.startsWith(h)),`When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${h}" but pathname "${y.pathname}" was given in the \`location\` prop.`),g=y}else g=m;let x=g.pathname||"/",M=x;if(h!=="/"){let y=h.replace(/^\//,"").split("/");M="/"+x.replace(/^\//,"").split("/").slice(y.length).join("/")}let E=t&&t.state.matches.length?t.state.matches.map(y=>Object.assign(y,{route:t.manifest[y.route.id]||y.route})):C_(i,{pathname:M});Ui(f||E!=null,`No routes matched location "${g.pathname}${g.search}${g.hash}" `),Ui(E==null||E[E.length-1].route.element!==void 0||E[E.length-1].route.Component!==void 0||E[E.length-1].route.lazy!==void 0,`Matched leaf route at location "${g.pathname}${g.search}${g.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`);let w=JE(E&&E.map(y=>Object.assign({},y,{params:Object.assign({},c,y.params),pathname:Qi([h,r.encodeLocation?r.encodeLocation(y.pathname.replace(/%/g,"%25").replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:y.pathname]),pathnameBase:y.pathnameBase==="/"?h:Qi([h,r.encodeLocation?r.encodeLocation(y.pathnameBase.replace(/%/g,"%25").replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:y.pathnameBase])})),a,t);return e&&w?H.createElement(Jl.Provider,{value:{location:{pathname:"/",search:"",hash:"",state:null,key:"default",mask:void 0,...g},navigationType:"POP"}},w):w}function YE(){let i=r1(),e=LE(i)?`${i.status} ${i.statusText}`:i instanceof Error?i.message:JSON.stringify(i),t=i instanceof Error?i.stack:null,r="rgba(200,200,200, 0.5)",a={padding:"0.5rem",backgroundColor:r},l={padding:"2px 4px",backgroundColor:r},c=null;return console.error("Error handled by React Router default ErrorBoundary:",i),c=H.createElement(H.Fragment,null,H.createElement("p",null,"💿 Hey developer 👋"),H.createElement("p",null,"You can provide a way better UX than this when your app throws errors by providing your own ",H.createElement("code",{style:l},"ErrorBoundary")," or"," ",H.createElement("code",{style:l},"errorElement")," prop on your route.")),H.createElement(H.Fragment,null,H.createElement("h2",null,"Unexpected Application Error!"),H.createElement("h3",{style:{fontStyle:"italic"}},e),t?H.createElement("pre",{style:a},t):null,c)}var KE=H.createElement(YE,null),V_=class extends H.Component{constructor(i){super(i),this.state={location:i.location,revalidation:i.revalidation,error:i.error}}static getDerivedStateFromError(i){return{error:i}}static getDerivedStateFromProps(i,e){return e.location!==i.location||e.revalidation!=="idle"&&i.revalidation==="idle"?{error:i.error,location:i.location,revalidation:i.revalidation}:{error:i.error!==void 0?i.error:e.error,location:e.location,revalidation:i.revalidation||e.revalidation}}componentDidCatch(i,e){this.props.onError?this.props.onError(i,e):console.error("React Router caught the following error during render",i)}render(){let i=this.state.error;if(this.context&&typeof i=="object"&&i&&"digest"in i&&typeof i.digest=="string"){const t=GE(i.digest);t&&(i=t)}let e=i!==void 0?H.createElement(Ji.Provider,{value:this.props.routeContext},H.createElement(mm.Provider,{value:i,children:this.props.component})):this.props.children;return this.context?H.createElement(QE,{error:i},e):e}};V_.contextType=F_;var af=new WeakMap;function QE({children:i,error:e}){let{basename:t}=H.useContext(Ei);if(typeof e=="object"&&e&&"digest"in e&&typeof e.digest=="string"){let r=VE(e.digest);if(r){let a=af.get(e);if(a)throw a;let l=I_(r.location,t),c=l.absoluteURL||l.to;if(FE(c))throw new Error("Invalid redirect location");if(D_&&!af.get(e))if(l.isExternal||r.reloadDocument)window.location.href=c;else{const d=Promise.resolve().then(()=>window.__reactRouterDataRouter.navigate(l.to,{replace:r.replace}));throw af.set(e,d),d}return H.createElement("meta",{httpEquiv:"refresh",content:`0;url=${c}`})}}return i}function ZE({routeContext:i,match:e,children:t}){let r=H.useContext(zo);return r&&r.static&&r.staticContext&&(e.route.errorElement||e.route.ErrorBoundary)&&(r.staticContext._deepestRenderedBoundaryId=e.route.id),H.createElement(Ji.Provider,{value:i},t)}function JE(i,e=[],t){let r=t==null?void 0:t.state;if(i==null){if(!r)return null;if(r.errors)i=r.matches;else if(e.length===0&&!r.initialized&&r.matches.length>0)i=r.matches;else return null}let a=i,l=r==null?void 0:r.errors;if(l!=null){let m=a.findIndex(g=>g.route.id&&(l==null?void 0:l[g.route.id])!==void 0);sn(m>=0,`Could not find a matching route for errors on route IDs: ${Object.keys(l).join(",")}`),a=a.slice(0,Math.min(a.length,m+1))}let c=!1,d=-1;if(t&&r){c=r.renderFallback;for(let m=0;m<a.length;m++){let g=a[m];if((g.route.HydrateFallback||g.route.hydrateFallbackElement)&&(d=m),g.route.id){let{loaderData:x,errors:M}=r,E=g.route.loader&&!x.hasOwnProperty(g.route.id)&&(!M||M[g.route.id]===void 0);if(g.route.lazy||E){t.isStatic&&(c=!0),d>=0?a=a.slice(0,d+1):a=[a[0]];break}}}}let h=t==null?void 0:t.onError,f=r&&h?(m,g)=>{var x,M;h(m,{location:r.location,params:((M=(x=r.matches)==null?void 0:x[0])==null?void 0:M.params)??{},pattern:DE(r.matches),errorInfo:g})}:void 0;return a.reduceRight((m,g,x)=>{let M,E=!1,w=null,_=null;r&&(M=l&&g.route.id?l[g.route.id]:void 0,w=g.route.errorElement||KE,c&&(d<0&&x===0?(G_("route-fallback",!1,"No `HydrateFallback` element provided to render during initial hydration"),E=!0,_=null):d===x&&(E=!0,_=g.route.hydrateFallbackElement||null)));let y=e.concat(a.slice(0,x+1)),L=()=>{let P;return M?P=w:E?P=_:g.route.Component?P=H.createElement(g.route.Component,null):g.route.element?P=g.route.element:P=m,H.createElement(ZE,{match:g,routeContext:{outlet:m,matches:y,isDataRoute:r!=null},children:P})};return r&&(g.route.ErrorBoundary||g.route.errorElement||x===0)?H.createElement(V_,{location:r.location,revalidation:r.revalidation,component:w,error:M,children:L(),routeContext:{outlet:null,matches:y,isDataRoute:!0},onError:f}):L()},null)}function xm(i){return`${i} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function e1(i){let e=H.useContext(zo);return sn(e,xm(i)),e}function t1(i){let e=H.useContext(fd);return sn(e,xm(i)),e}function n1(i){let e=H.useContext(Ji);return sn(e,xm(i)),e}function vm(i){let e=n1(i),t=e.matches[e.matches.length-1];return sn(t.route.id,`${i} can only be used on routes that contain a unique "id"`),t.route.id}function i1(){return vm("useRouteId")}function r1(){var r;let i=H.useContext(mm),e=t1("useRouteError"),t=vm("useRouteError");return i!==void 0?i:(r=e.errors)==null?void 0:r[t]}function s1(){let{router:i}=e1("useNavigate"),e=vm("useNavigate"),t=H.useRef(!1);return B_(()=>{t.current=!0}),H.useCallback(async(a,l={})=>{Ui(t.current,z_),t.current&&(typeof a=="number"?await i.navigate(a):await i.navigate(a,{fromRouteId:e,...l}))},[i,e])}var Ux={};function G_(i,e,t){!e&&!Ux[i]&&(Ux[i]=!0,Ui(!1,t))}H.memo(a1);function a1({routes:i,manifest:e,future:t,state:r,isStatic:a,onError:l}){return H_(i,void 0,{manifest:e,state:r,isStatic:a,onError:l})}function of({to:i,replace:e,state:t,relative:r}){sn(Bo(),"<Navigate> may be used only in the context of a <Router> component.");let{static:a}=H.useContext(Ei);Ui(!a,"<Navigate> must not be used on the initial render in a <StaticRouter>. This is a no-op, but you should modify your code so the <Navigate> is only ever rendered in response to some user interaction or state change.");let{matches:l}=H.useContext(Ji),{pathname:c}=er(),d=gm(),h=hd(i,pm(l),c,r==="path"),f=JSON.stringify(h);return H.useEffect(()=>{d(JSON.parse(f),{replace:e,state:t,relative:r})},[d,f,r,e,t]),null}function o1(i){return $E(i.context)}function $i(i){sn(!1,"A <Route> is only ever to be used as the child of <Routes> element, never rendered directly. Please wrap your <Route> in a <Routes>.")}function l1({basename:i="/",children:e=null,location:t,navigationType:r="POP",navigator:a,static:l=!1,useTransitions:c}){sn(!Bo(),"You cannot render a <Router> inside another <Router>. You should never have more than one in your app.");let d=i.replace(/^\/*/,"/"),h=H.useMemo(()=>({basename:d,navigator:a,static:l,useTransitions:c,future:{}}),[d,a,l,c]);typeof t=="string"&&(t=ko(t));let{pathname:f="/",search:m="",hash:g="",state:x=null,key:M="default",mask:E}=t,w=H.useMemo(()=>{let _=$r(f,d);return _==null?null:{location:{pathname:_,search:m,hash:g,state:x,key:M,mask:E},navigationType:r}},[d,f,m,g,x,M,r,E]);return Ui(w!=null,`<Router basename="${d}"> is not able to match the URL "${f}${m}${g}" because it does not start with the basename, so the <Router> won't render anything.`),w==null?null:H.createElement(Ei.Provider,{value:h},H.createElement(Jl.Provider,{children:e,value:w}))}function c1({children:i,location:e}){return qE(dp(i),e)}function dp(i,e=[]){let t=[];return H.Children.forEach(i,(r,a)=>{if(!H.isValidElement(r))return;let l=[...e,a];if(r.type===H.Fragment){t.push.apply(t,dp(r.props.children,l));return}sn(r.type===$i,`[${typeof r.type=="string"?r.type:r.type.name}] is not a <Route> component. All component children of <Routes> must be a <Route> or <React.Fragment>`),sn(!r.props.index||!r.props.children,"An index route cannot have child routes.");let c={id:r.props.id||l.join("-"),caseSensitive:r.props.caseSensitive,element:r.props.element,Component:r.props.Component,index:r.props.index,path:r.props.path,middleware:r.props.middleware,loader:r.props.loader,action:r.props.action,hydrateFallbackElement:r.props.hydrateFallbackElement,HydrateFallback:r.props.HydrateFallback,errorElement:r.props.errorElement,ErrorBoundary:r.props.ErrorBoundary,hasErrorBoundary:r.props.hasErrorBoundary===!0||r.props.ErrorBoundary!=null||r.props.errorElement!=null,shouldRevalidate:r.props.shouldRevalidate,handle:r.props.handle,lazy:r.props.lazy};r.props.children&&(c.children=dp(r.props.children,l)),t.push(c)}),t}var Vu="get",Gu="application/x-www-form-urlencoded";function pd(i){return typeof HTMLElement<"u"&&i instanceof HTMLElement}function u1(i){return pd(i)&&i.tagName.toLowerCase()==="button"}function d1(i){return pd(i)&&i.tagName.toLowerCase()==="form"}function h1(i){return pd(i)&&i.tagName.toLowerCase()==="input"}function f1(i){return!!(i.metaKey||i.altKey||i.ctrlKey||i.shiftKey)}function p1(i,e){return i.button===0&&(!e||e==="_self")&&!f1(i)}function hp(i=""){return new URLSearchParams(typeof i=="string"||Array.isArray(i)||i instanceof URLSearchParams?i:Object.keys(i).reduce((e,t)=>{let r=i[t];return e.concat(Array.isArray(r)?r.map(a=>[t,a]):[[t,r]])},[]))}function m1(i,e){let t=hp(i);return e&&e.forEach((r,a)=>{t.has(a)||e.getAll(a).forEach(l=>{t.append(a,l)})}),t}var du=null;function g1(){if(du===null)try{new FormData(document.createElement("form"),0),du=!1}catch{du=!0}return du}var x1=new Set(["application/x-www-form-urlencoded","multipart/form-data","text/plain"]);function lf(i){return i!=null&&!x1.has(i)?(Ui(!1,`"${i}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${Gu}"`),null):i}function v1(i,e){let t,r,a,l,c;if(d1(i)){let d=i.getAttribute("action");r=d?$r(d,e):null,t=i.getAttribute("method")||Vu,a=lf(i.getAttribute("enctype"))||Gu,l=new FormData(i)}else if(u1(i)||h1(i)&&(i.type==="submit"||i.type==="image")){let d=i.form;if(d==null)throw new Error('Cannot submit a <button> or <input type="submit"> without a <form>');let h=i.getAttribute("formaction")||d.getAttribute("action");if(r=h?$r(h,e):null,t=i.getAttribute("formmethod")||d.getAttribute("method")||Vu,a=lf(i.getAttribute("formenctype"))||lf(d.getAttribute("enctype"))||Gu,l=new FormData(d,i),!g1()){let{name:f,type:m,value:g}=i;if(m==="image"){let x=f?`${f}.`:"";l.append(`${x}x`,"0"),l.append(`${x}y`,"0")}else f&&l.append(f,g)}}else{if(pd(i))throw new Error('Cannot submit element that is not <form>, <button>, or <input type="submit|image">');t=Vu,r=null,a=Gu,c=i}return l&&a==="text/plain"&&(c=l,l=void 0),{action:r,method:t.toLowerCase(),encType:a,formData:l,body:c}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");function _m(i,e){if(i===!1||i===null||typeof i>"u")throw new Error(e)}function j_(i,e,t,r){let a=typeof i=="string"?new URL(i,typeof window>"u"?"server://singlefetch/":window.location.origin):i;return t?a.pathname.endsWith("/")?a.pathname=`${a.pathname}_.${r}`:a.pathname=`${a.pathname}.${r}`:a.pathname==="/"?a.pathname=`_root.${r}`:e&&$r(a.pathname,e)==="/"?a.pathname=`${nd(e)}/_root.${r}`:a.pathname=`${nd(a.pathname)}.${r}`,a}async function _1(i,e){if(i.id in e)return e[i.id];try{let t=await import(i.module);return e[i.id]=t,t}catch(t){return console.error(`Error loading route module \`${i.module}\`, reloading page...`),console.error(t),window.__reactRouterContext&&window.__reactRouterContext.isSpaMode,window.location.reload(),new Promise(()=>{})}}function y1(i){return i==null?!1:i.href==null?i.rel==="preload"&&typeof i.imageSrcSet=="string"&&typeof i.imageSizes=="string":typeof i.rel=="string"&&typeof i.href=="string"}async function S1(i,e,t){let r=await Promise.all(i.map(async a=>{let l=e.routes[a.route.id];if(l){let c=await _1(l,t);return c.links?c.links():[]}return[]}));return b1(r.flat(1).filter(y1).filter(a=>a.rel==="stylesheet"||a.rel==="preload").map(a=>a.rel==="stylesheet"?{...a,rel:"prefetch",as:"style"}:{...a,rel:"prefetch"}))}function Fx(i,e,t,r,a,l){let c=(h,f)=>t[f]?h.route.id!==t[f].route.id:!0,d=(h,f)=>{var m;return t[f].pathname!==h.pathname||((m=t[f].route.path)==null?void 0:m.endsWith("*"))&&t[f].params["*"]!==h.params["*"]};return l==="assets"?e.filter((h,f)=>c(h,f)||d(h,f)):l==="data"?e.filter((h,f)=>{var g;let m=r.routes[h.route.id];if(!m||!m.hasLoader)return!1;if(c(h,f)||d(h,f))return!0;if(h.route.shouldRevalidate){let x=h.route.shouldRevalidate({currentUrl:new URL(a.pathname+a.search+a.hash,window.origin),currentParams:((g=t[0])==null?void 0:g.params)||{},nextUrl:new URL(i,window.origin),nextParams:h.params,defaultShouldRevalidate:!0});if(typeof x=="boolean")return x}return!0}):[]}function M1(i,e,{includeHydrateFallback:t}={}){return E1(i.map(r=>{let a=e.routes[r.route.id];if(!a)return[];let l=[a.module];return a.clientActionModule&&(l=l.concat(a.clientActionModule)),a.clientLoaderModule&&(l=l.concat(a.clientLoaderModule)),t&&a.hydrateFallbackModule&&(l=l.concat(a.hydrateFallbackModule)),a.imports&&(l=l.concat(a.imports)),l}).flat(1))}function E1(i){return[...new Set(i)]}function w1(i){let e={},t=Object.keys(i).sort();for(let r of t)e[r]=i[r];return e}function b1(i,e){let t=new Set;return new Set(e),i.reduce((r,a)=>{let l=JSON.stringify(w1(a));return t.has(l)||(t.add(l),r.push({key:l,link:a})),r},[])}function ym(){let i=H.useContext(zo);return _m(i,"You must render this element inside a <DataRouterContext.Provider> element"),i}function T1(){let i=H.useContext(fd);return _m(i,"You must render this element inside a <DataRouterStateContext.Provider> element"),i}var Sm=H.createContext(void 0);Sm.displayName="FrameworkContext";function md(){let i=H.useContext(Sm);return _m(i,"You must render this element inside a <HydratedRouter> element"),i}function C1(i,e){let t=H.useContext(Sm),[r,a]=H.useState(!1),[l,c]=H.useState(!1),{onFocus:d,onBlur:h,onMouseEnter:f,onMouseLeave:m,onTouchStart:g}=e,x=H.useRef(null);H.useEffect(()=>{if(i==="render"&&c(!0),i==="viewport"){let w=y=>{y.forEach(L=>{c(L.isIntersecting)})},_=new IntersectionObserver(w,{threshold:.5});return x.current&&_.observe(x.current),()=>{_.disconnect()}}},[i]),H.useEffect(()=>{if(r){let w=setTimeout(()=>{c(!0)},100);return()=>{clearTimeout(w)}}},[r]);let M=()=>{a(!0)},E=()=>{a(!1),c(!1)};return t?i!=="intent"?[l,x,{}]:[l,x,{onFocus:bl(d,M),onBlur:bl(h,E),onMouseEnter:bl(f,M),onMouseLeave:bl(m,E),onTouchStart:bl(g,M)}]:[!1,x,{}]}function bl(i,e){return t=>{i&&i(t),t.defaultPrevented||e(t)}}function R1({page:i,...e}){let t=OE(),{nonce:r}=md(),{router:a}=ym(),l=H.useMemo(()=>C_(a.routes,i,a.basename),[a.routes,i,a.basename]);return l?(e.nonce==null&&r&&(e={...e,nonce:r}),t?H.createElement(P1,{page:i,matches:l,...e}):H.createElement(N1,{page:i,matches:l,...e})):null}function A1(i){let{manifest:e,routeModules:t}=md(),[r,a]=H.useState([]);return H.useEffect(()=>{let l=!1;return S1(i,e,t).then(c=>{l||a(c)}),()=>{l=!0}},[i,e,t]),r}function P1({page:i,matches:e,...t}){let r=er(),{future:a}=md(),{basename:l}=ym(),c=H.useMemo(()=>{if(i===r.pathname+r.search+r.hash)return[];let d=j_(i,l,a.v8_trailingSlashAwareDataRequests,"rsc"),h=!1,f=[];for(let m of e)typeof m.route.shouldRevalidate=="function"?h=!0:f.push(m.route.id);return h&&f.length>0&&d.searchParams.set("_routes",f.join(",")),[d.pathname+d.search]},[l,a.v8_trailingSlashAwareDataRequests,i,r,e]);return H.createElement(H.Fragment,null,c.map(d=>H.createElement("link",{key:d,rel:"prefetch",as:"fetch",href:d,...t})))}function N1({page:i,matches:e,...t}){let r=er(),{future:a,manifest:l,routeModules:c}=md(),{basename:d}=ym(),{loaderData:h,matches:f}=T1(),m=H.useMemo(()=>Fx(i,e,f,l,r,"data"),[i,e,f,l,r]),g=H.useMemo(()=>Fx(i,e,f,l,r,"assets"),[i,e,f,l,r]),x=H.useMemo(()=>{if(i===r.pathname+r.search+r.hash)return[];let w=new Set,_=!1;if(e.forEach(L=>{var T;let P=l.routes[L.route.id];!P||!P.hasLoader||(!m.some(U=>U.route.id===L.route.id)&&L.route.id in h&&((T=c[L.route.id])!=null&&T.shouldRevalidate)||P.hasClientLoader?_=!0:w.add(L.route.id))}),w.size===0)return[];let y=j_(i,d,a.v8_trailingSlashAwareDataRequests,"data");return _&&w.size>0&&y.searchParams.set("_routes",e.filter(L=>w.has(L.route.id)).map(L=>L.route.id).join(",")),[y.pathname+y.search]},[d,a.v8_trailingSlashAwareDataRequests,h,r,l,m,e,i,c]),M=H.useMemo(()=>M1(g,l),[g,l]),E=A1(g);return H.createElement(H.Fragment,null,x.map(w=>H.createElement("link",{key:w,rel:"prefetch",as:"fetch",href:w,...t})),M.map(w=>H.createElement("link",{key:w,rel:"modulepreload",href:w,...t})),E.map(({key:w,link:_})=>H.createElement("link",{key:w,nonce:t.nonce,..._,crossOrigin:_.crossOrigin??t.crossOrigin})))}function L1(...i){return e=>{i.forEach(t=>{typeof t=="function"?t(e):t!=null&&(t.current=e)})}}var D1=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";try{D1&&(window.__reactRouterVersion="7.18.0")}catch{}function I1({basename:i,children:e,useTransitions:t,window:r}){let a=H.useRef();a.current==null&&(a.current=cE({window:r,v5Compat:!0}));let l=a.current,[c,d]=H.useState({action:l.action,location:l.location}),h=H.useCallback(f=>{t===!1?d(f):H.startTransition(()=>d(f))},[t]);return H.useLayoutEffect(()=>l.listen(h),[l,h]),H.createElement(l1,{basename:i,children:e,location:c.location,navigationType:c.action,navigator:l,useTransitions:t})}var W_=H.forwardRef(function({onClick:e,discover:t="render",prefetch:r="none",relative:a,reloadDocument:l,replace:c,mask:d,state:h,target:f,to:m,preventScrollReset:g,viewTransition:x,defaultShouldRevalidate:M,...E},w){let{basename:_,navigator:y,useTransitions:L}=H.useContext(Ei),P=typeof m=="string"&&fm.test(m),T=I_(m,_);m=T.to;let U=jE(m,{relative:a}),N=er(),O=null;if(d){let k=hd(d,[],N.mask?N.mask.pathname:"/",!0);_!=="/"&&(k.pathname=k.pathname==="/"?_:Qi([_,k.pathname])),O=y.createHref(k)}let[b,I,W]=C1(r,E),V=O1(m,{replace:c,mask:d,state:h,target:f,preventScrollReset:g,relative:a,viewTransition:x,defaultShouldRevalidate:M,useTransitions:L});function J(k){e&&e(k),k.defaultPrevented||V(k)}let se=!(T.isExternal||l),j=H.createElement("a",{...E,...W,href:(se?O:void 0)||T.absoluteURL||U,onClick:se?J:e,ref:L1(w,I),target:f,"data-discover":!P&&t==="render"?"true":void 0});return b&&!P?H.createElement(H.Fragment,null,j,H.createElement(R1,{page:U})):j});W_.displayName="Link";var mo=H.forwardRef(function({"aria-current":e="page",caseSensitive:t=!1,className:r="",end:a=!1,style:l,to:c,viewTransition:d,children:h,...f},m){let g=ec(c,{relative:f.relative}),x=er(),M=H.useContext(fd),{navigator:E,basename:w}=H.useContext(Ei),_=M!=null&&G1(g)&&d===!0,y=E.encodeLocation?E.encodeLocation(g).pathname:g.pathname,L=x.pathname,P=M&&M.navigation&&M.navigation.location?M.navigation.location.pathname:null;t||(L=L.toLowerCase(),P=P?P.toLowerCase():null,y=y.toLowerCase()),P&&w&&(P=$r(P,w)||P);const T=y!=="/"&&y.endsWith("/")?y.length-1:y.length;let U=L===y||!a&&L.startsWith(y)&&L.charAt(T)==="/",N=P!=null&&(P===y||!a&&P.startsWith(y)&&P.charAt(y.length)==="/"),O={isActive:U,isPending:N,isTransitioning:_},b=U?e:void 0,I;typeof r=="function"?I=r(O):I=[r,U?"active":null,N?"pending":null,_?"transitioning":null].filter(Boolean).join(" ");let W=typeof l=="function"?l(O):l;return H.createElement(W_,{...f,"aria-current":b,className:I,ref:m,style:W,to:c,viewTransition:d},typeof h=="function"?h(O):h)});mo.displayName="NavLink";var U1=H.forwardRef(({discover:i="render",fetcherKey:e,navigate:t,reloadDocument:r,replace:a,state:l,method:c=Vu,action:d,onSubmit:h,relative:f,preventScrollReset:m,viewTransition:g,defaultShouldRevalidate:x,...M},E)=>{let{useTransitions:w}=H.useContext(Ei),_=H1(),y=V1(d,{relative:f}),L=c.toLowerCase()==="get"?"get":"post",P=typeof d=="string"&&fm.test(d),T=U=>{if(h&&h(U),U.defaultPrevented)return;U.preventDefault();let N=U.nativeEvent.submitter,O=(N==null?void 0:N.getAttribute("formmethod"))||c,b=()=>_(N||U.currentTarget,{fetcherKey:e,method:O,navigate:t,replace:a,state:l,relative:f,preventScrollReset:m,viewTransition:g,defaultShouldRevalidate:x});w&&t!==!1?H.startTransition(()=>b()):b()};return H.createElement("form",{ref:E,method:L,action:y,onSubmit:r?h:T,...M,"data-discover":!P&&i==="render"?"true":void 0})});U1.displayName="Form";function F1(i){return`${i} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function X_(i){let e=H.useContext(zo);return sn(e,F1(i)),e}function O1(i,{target:e,replace:t,mask:r,state:a,preventScrollReset:l,relative:c,viewTransition:d,defaultShouldRevalidate:h,useTransitions:f}={}){let m=gm(),g=er(),x=ec(i,{relative:c});return H.useCallback(M=>{if(p1(M,e)){M.preventDefault();let E=t!==void 0?t:Vl(g)===Vl(x),w=()=>m(i,{replace:E,mask:r,state:a,preventScrollReset:l,relative:c,viewTransition:d,defaultShouldRevalidate:h});f?H.startTransition(()=>w()):w()}},[g,m,x,t,r,a,e,i,l,c,d,h,f])}function k1(i){Ui(typeof URLSearchParams<"u","You cannot use the `useSearchParams` hook in a browser that does not support the URLSearchParams API. If you need to support Internet Explorer 11, we recommend you load a polyfill such as https://github.com/ungap/url-search-params.");let e=H.useRef(hp(i)),t=H.useRef(!1),r=er(),a=H.useMemo(()=>m1(r.search,t.current?null:e.current),[r.search]),l=gm(),c=H.useCallback((d,h)=>{const f=hp(typeof d=="function"?d(new URLSearchParams(a)):d);t.current=!0,l("?"+f,h)},[l,a]);return[a,c]}var z1=0,B1=()=>`__${String(++z1)}__`;function H1(){let{router:i}=X_("useSubmit"),{basename:e}=H.useContext(Ei),t=i1(),r=i.fetch,a=i.navigate;return H.useCallback(async(l,c={})=>{let{action:d,method:h,encType:f,formData:m,body:g}=v1(l,e);if(c.navigate===!1){let x=c.fetcherKey||B1();await r(x,t,c.action||d,{defaultShouldRevalidate:c.defaultShouldRevalidate,preventScrollReset:c.preventScrollReset,formData:m,body:g,formMethod:c.method||h,formEncType:c.encType||f,flushSync:c.flushSync})}else await a(c.action||d,{defaultShouldRevalidate:c.defaultShouldRevalidate,preventScrollReset:c.preventScrollReset,formData:m,body:g,formMethod:c.method||h,formEncType:c.encType||f,replace:c.replace,state:c.state,fromRouteId:t,flushSync:c.flushSync,viewTransition:c.viewTransition})},[r,a,e,t])}function V1(i,{relative:e}={}){let{basename:t}=H.useContext(Ei),r=H.useContext(Ji);sn(r,"useFormAction must be used inside a RouteContext");let[a]=r.matches.slice(-1),l={...ec(i||".",{relative:e})},c=er();if(i==null){l.search=c.search;let d=new URLSearchParams(l.search),h=d.getAll("index");if(h.some(m=>m==="")){d.delete("index"),h.filter(g=>g).forEach(g=>d.append("index",g));let m=d.toString();l.search=m?`?${m}`:""}}return(!i||i===".")&&a.route.index&&(l.search=l.search?l.search.replace(/^\?/,"?index&"):"?index"),t!=="/"&&(l.pathname=l.pathname==="/"?t:Qi([t,l.pathname])),Vl(l)}function G1(i,{relative:e}={}){let t=H.useContext(O_);sn(t!=null,"`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?");let{basename:r}=X_("useViewTransitionState"),a=ec(i,{relative:e});if(!t.isTransitioning)return!1;let l=$r(t.currentLocation.pathname,r)||t.currentLocation.pathname,c=$r(t.nextLocation.pathname,r)||t.nextLocation.pathname;return td(a.pathname,c)!=null||td(a.pathname,l)!=null}/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j1=i=>i.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),$_=(...i)=>i.filter((e,t,r)=>!!e&&e.trim()!==""&&r.indexOf(e)===t).join(" ").trim();/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var W1={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X1=H.forwardRef(({color:i="currentColor",size:e=24,strokeWidth:t=2,absoluteStrokeWidth:r,className:a="",children:l,iconNode:c,...d},h)=>H.createElement("svg",{ref:h,...W1,width:e,height:e,stroke:i,strokeWidth:r?Number(t)*24/Number(e):t,className:$_("lucide",a),...d},[...c.map(([f,m])=>H.createElement(f,m)),...Array.isArray(l)?l:[l]]));/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pt=(i,e)=>{const t=H.forwardRef(({className:r,...a},l)=>H.createElement(X1,{ref:l,iconNode:e,className:$_(`lucide-${j1(i)}`,r),...a}));return t.displayName=`${i}`,t};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $1=Pt("ArchiveRestore",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h2",key:"tvwodi"}],["path",{d:"M20 8v11a2 2 0 0 1-2 2h-2",key:"1gkqxj"}],["path",{d:"m9 15 3-3 3 3",key:"1pd0qc"}],["path",{d:"M12 12v9",key:"192myk"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q1=Pt("Archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y1=Pt("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K1=Pt("Box",[["path",{d:"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",key:"hh9hay"}],["path",{d:"m3.3 7 8.7 5 8.7-5",key:"g66t2b"}],["path",{d:"M12 22V12",key:"d0xqtd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q1=Pt("Boxes",[["path",{d:"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",key:"lc1i9w"}],["path",{d:"m7 16.5-4.74-2.85",key:"1o9zyk"}],["path",{d:"m7 16.5 5-3",key:"va8pkn"}],["path",{d:"M7 16.5v5.17",key:"jnp8gn"}],["path",{d:"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",key:"8zsnat"}],["path",{d:"m17 16.5-5-3",key:"8arw3v"}],["path",{d:"m17 16.5 4.74-2.85",key:"8rfmw"}],["path",{d:"M17 16.5v5.17",key:"k6z78m"}],["path",{d:"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",key:"1xygjf"}],["path",{d:"M12 8 7.26 5.15",key:"1vbdud"}],["path",{d:"m12 8 4.74-2.85",key:"3rx089"}],["path",{d:"M12 13.5V8",key:"1io7kd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mm=Pt("Camera",[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",key:"1tc9qg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z1=Pt("ChartLine",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q_=Pt("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J1=Pt("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ew=Pt("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y_=Pt("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tw=Pt("Crop",[["path",{d:"M6 2v14a2 2 0 0 0 2 2h14",key:"ron5a4"}],["path",{d:"M18 22V8a2 2 0 0 0-2-2H2",key:"7s9ehn"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nw=Pt("Crown",[["path",{d:"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",key:"1vdc57"}],["path",{d:"M5 21h14",key:"11awu3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iw=Pt("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rw=Pt("EyeOff",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ju=Pt("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sw=Pt("FlaskConical",[["path",{d:"M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2",key:"18mbvz"}],["path",{d:"M6.453 15h11.094",key:"3shlmq"}],["path",{d:"M8.5 2h7",key:"csnxdl"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ox=Pt("Hammer",[["path",{d:"m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9",key:"eefl8a"}],["path",{d:"m18 15 4-4",key:"16gjal"}],["path",{d:"m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5",key:"b7pghm"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aw=Pt("Image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ow=Pt("Images",[["path",{d:"M18 22H4a2 2 0 0 1-2-2V6",key:"pblm9e"}],["path",{d:"m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18",key:"nf6bnh"}],["circle",{cx:"12",cy:"8",r:"2",key:"1822b1"}],["rect",{width:"16",height:"16",x:"6",y:"2",rx:"2",key:"12espp"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _n=Pt("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lw=Pt("Maximize2",[["polyline",{points:"15 3 21 3 21 9",key:"mznyad"}],["polyline",{points:"9 21 3 21 3 15",key:"1avn1i"}],["line",{x1:"21",x2:"14",y1:"3",y2:"10",key:"ota7mn"}],["line",{x1:"3",x2:"10",y1:"21",y2:"14",key:"1atl0r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cw=Pt("Package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["path",{d:"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7",key:"yx3hmr"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Em=Pt("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kx=Pt("Plug",[["path",{d:"M12 22v-5",key:"1ega77"}],["path",{d:"M9 8V2",key:"14iosj"}],["path",{d:"M15 8V2",key:"18g5xt"}],["path",{d:"M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z",key:"osxo6l"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uw=Pt("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dw=Pt("RotateCw",[["path",{d:"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",key:"1p45f6"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zx=Pt("Scissors",[["circle",{cx:"6",cy:"6",r:"3",key:"1lh9wr"}],["path",{d:"M8.12 8.12 12 12",key:"1alkpv"}],["path",{d:"M20 4 8.12 15.88",key:"xgtan2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["path",{d:"M14.8 14.8 20 20",key:"ptml3r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K_=Pt("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wa=Pt("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wm=Pt("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hw=Pt("Undo2",[["path",{d:"M9 14 4 9l5-5",key:"102s5s"}],["path",{d:"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11",key:"f3b9sd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q_=Pt("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bx=Pt("WandSparkles",[["path",{d:"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72",key:"ul74o6"}],["path",{d:"m14 7 3 3",key:"1r5n42"}],["path",{d:"M5 6v4",key:"ilb8ba"}],["path",{d:"M19 14v4",key:"blhpug"}],["path",{d:"M10 2v2",key:"7u0qdc"}],["path",{d:"M7 8H3",key:"zfb6yr"}],["path",{d:"M21 16h-4",key:"1cnmox"}],["path",{d:"M11 3H9",key:"1obp7u"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z_=Pt("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);async function nn(i,e){var r;const t=await fetch(i,e);if(!t.ok){let a="";try{a=((r=await t.json())==null?void 0:r.detail)??""}catch{}throw new Error(a||`HTTP ${t.status} (${i})`)}return t.json()}const rn=(i,e)=>nn(i,{method:"POST",headers:{"Content-Type":"application/json"},body:e!==void 0?JSON.stringify(e):void 0}),Gl=i=>nn(i,{method:"DELETE"}),fw={K:"♚",Q:"♛",R:"♜",B:"♝",N:"♞",P:"♟"};function Hx({label:i,className:e=""}){if(i==="empty")return v.jsx("span",{className:`text-zinc-500 ${e}`,children:"·"});if(i==="occluded")return v.jsx("span",{className:`text-amber-300 ${e}`,children:"▦"});const t=fw[i==null?void 0:i[1]]??i,r=(i==null?void 0:i[0])==="w";return v.jsx("span",{className:e,style:{color:r?"#fafafa":"#0a0a0a",textShadow:r?"0 0 1px #000, 0 1px 2px #000":"0 0 1px #fff, 0 1px 2px #fff"},children:t})}function fn({title:i,right:e,children:t,className:r=""}){return v.jsxs("div",{className:`rounded-xl border border-zinc-800 bg-zinc-900 p-4 ${r}`,children:[(i||e)&&v.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[i&&v.jsx("h2",{className:"text-xs font-medium uppercase tracking-wide text-zinc-400",children:i}),e]}),t]})}function Tt({children:i,variant:e="ghost",className:t="",onClick:r,disabled:a,...l}){const[c,d]=H.useState(!1),h=e==="primary"?"bg-sky-500 text-zinc-950 hover:bg-sky-400 font-medium":"bg-zinc-800 text-zinc-200 hover:bg-zinc-700";async function f(m){if(!r)return;const g=r(m);if(g&&typeof g.then=="function"){d(!0);try{await g}finally{d(!1)}}}return v.jsxs("button",{...l,onClick:f,disabled:a||c,className:`relative inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm transition
        disabled:cursor-not-allowed disabled:opacity-40 ${h} ${t}`,children:[v.jsx("span",{className:`inline-flex items-center gap-2 ${c?"invisible":""}`,children:i}),c&&v.jsx(_n,{className:"absolute h-4 w-4 animate-spin"})]})}function oa({label:i,children:e,...t}){return v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:[i,v.jsx("select",{...t,className:"rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",children:e})]})}const pw={err:"bg-red-950/60 text-red-300",busy:"bg-sky-950/60 text-sky-300 animate-pulse",ok:"bg-emerald-950/60 text-emerald-300"},bm=i=>pw[i]??"text-zinc-500",cf="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";function mw({coverage:i,sweep:e,sets:t,setSets:r,count:a,setCount:l,passes:c,setPasses:d,pieces:h,setPieces:f,together:m,setTogether:g,offset:x,setOffset:M,autoOffset:E,setAutoOffset:w,maxPlies:_,setMaxPlies:y,input:L}){return i?v.jsxs(v.Fragment,{children:[v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Number of physical piece sets: with 2 sets, queens/kings come twice as fast.",children:["Sets",v.jsx("input",{type:"number",min:1,value:t,onChange:P=>r(+P.target.value),className:`${L} w-16`})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Number of dense setups generated against your weakest classes.",children:["Setups",v.jsx("input",{type:"number",min:1,value:a,onChange:P=>l(+P.target.value),className:`${L} w-20`})]})]}):e?v.jsxs(v.Fragment,{children:[v.jsxs("div",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Which pieces walk across the board: special = non-pawns (K,Q,R,B,N), pawn = only pawns, all = everything.",children:["Pieces",v.jsxs(oa,{label:"",value:h,onChange:P=>f(P.target.value),children:[v.jsx("option",{value:"special",children:"special (K,Q,R,B,N)"}),v.jsx("option",{value:"pawn",children:"pawn (only pawns)"}),v.jsx("option",{value:"all",children:"all"})]})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Repeats (each pass 8 photos, ranks 1–8) — e.g. with different lighting. No piece rearrangement.",children:["Passes",v.jsx("input",{type:"number",min:1,value:c,onChange:P=>d(+P.target.value),className:`${L} w-16`})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Number of physical piece sets: with 2 sets, twice as many pieces per photo possible.",children:["Sets",v.jsx("input",{type:"number",min:1,value:t,onChange:P=>r(+P.target.value),className:`${L} w-16`})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Both colors on the board at once (white in front, black 4 ranks offset) → half the photos, every square gets both colors.",children:[v.jsx("input",{type:"checkbox",checked:m,onChange:P=>g(P.target.checked)})," both colors at once"]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Auto offset: counts previous sweep sessions and picks the next offset → each piece lands on different files across sessions (prevents position overfitting).",children:[v.jsx("input",{type:"checkbox",checked:E,onChange:P=>w(P.target.checked)})," Offset auto"]}),!E&&v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Shifts the line→piece assignment, fixed for this session. 0: a=King,b=Queen,…  1: a=Queen,b=Rook,…",children:["Offset",v.jsx("input",{type:"number",min:0,max:7,value:x,onChange:P=>M(+P.target.value),className:`${L} w-16`})]})]}):v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Max plies",v.jsx("input",{type:"number",value:_,onChange:P=>y(+P.target.value),className:`${L} w-20`})]})}function gw(){const[i,e]=H.useState("random"),[t,r]=H.useState(40),[a,l]=H.useState(1),[c,d]=H.useState(20),[h,f]=H.useState(1),[m,g]=H.useState("special"),[x,M]=H.useState(!0),[E,w]=H.useState(0),[_,y]=H.useState(!0),[L,P]=H.useState("default"),[T,U]=H.useState(0),N=i==="coverage",O=i==="sweep",[b,I]=H.useState({active:!1}),[W,V]=H.useState(""),[J,se]=H.useState(""),j=H.useRef(null);H.useEffect(()=>(nn("/api/collect/state").then(I).catch(()=>{}),()=>clearInterval(j.current)),[]);const k=()=>nn("/api/collect/state").then(I).catch(()=>{});async function oe(){V(""),se("");try{const q=await rn("/api/collect/start",{strategy:i,max_plies:t,profile:L,camera:T,sets:a,count:c,passes:h,pieces:m,together:x,offset:E,auto_offset:_});I(q),clearInterval(j.current),j.current=setInterval(k,1500)}catch(q){V("Error: "+q.message),se("err")}}async function te(){V("Capturing..."),se("busy");try{I(await rn("/api/collect/shoot")),V("Captured ✓"),se("ok")}catch(q){V("Error: "+q.message),se("err")}}async function K(){V("Skipping..."),se("busy");try{I(await rn("/api/collect/skip")),V(""),se("")}catch(q){V("Error: "+q.message),se("err")}}async function he(){V("Undoing..."),se("busy");try{I(await rn("/api/collect/undo")),V("Undone ✓"),se("ok")}catch(q){V("Error: "+q.message),se("err")}}async function de(){V("Finishing..."),se("busy");try{const q=await rn("/api/collect/finish");clearInterval(j.current),I({active:!1}),V(`Session finished: ${q.captures} captures, ${q.sliced??0} crops sliced → Datasets tab.`),se("ok")}catch(q){V("Error: "+q.message),se("err")}}const z=bm(J);return v.jsxs("div",{className:"space-y-4",children:[v.jsxs(fn,{children:[v.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[v.jsxs(oa,{label:"Engine",value:i,onChange:q=>e(q.target.value),children:[v.jsx("option",{value:"random",children:"random (built-in)"}),v.jsx("option",{value:"stockfish",children:"stockfish (auto-detected)"}),v.jsx("option",{value:"coverage",children:"coverage (target rare classes)"}),v.jsx("option",{value:"sweep",children:"sweep (pieces walk the board)"})]}),v.jsx(mw,{coverage:N,sweep:O,input:cf,sets:a,setSets:l,count:c,setCount:d,passes:h,setPasses:f,pieces:m,setPieces:g,together:x,setTogether:M,offset:E,setOffset:w,autoOffset:_,setAutoOffset:y,maxPlies:t,setMaxPlies:r}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Profile",v.jsx("input",{value:L,onChange:q=>P(q.target.value),className:`${cf} w-28`})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Camera",v.jsx("input",{type:"number",value:T,onChange:q=>U(+q.target.value),className:`${cf} w-16`})]}),b.active?v.jsxs(Tt,{onClick:de,children:[v.jsx(Y_,{className:"h-4 w-4"})," Done"]}):v.jsxs(Tt,{variant:"primary",onClick:oe,children:[v.jsx(Em,{className:"h-4 w-4"})," Start game"]})]}),W&&v.jsx("div",{className:`mt-2 rounded-lg px-3 py-1.5 text-sm ${z}`,children:W})]}),b.active&&v.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_320px]",children:[v.jsx(fn,{title:"Live camera",children:v.jsx("img",{src:"/api/camera/collect.mjpg",alt:"Live capture",className:"w-full rounded-lg border border-zinc-800"})}),v.jsx(fn,{title:"Capture",children:v.jsxs("div",{className:"space-y-3",children:[b.done?v.jsxs("div",{className:"font-medium text-green-500",children:["✓ All ",b.n_positions," positions captured."]}):v.jsxs(v.Fragment,{children:[v.jsx(xw,{st:b}),v.jsxs("div",{className:"flex flex-wrap gap-2",children:[!b.done&&v.jsxs(Tt,{variant:"primary",onClick:te,className:"px-5 py-2.5 text-base",children:[v.jsx(Mm,{className:"h-5 w-5"})," Photo"]}),!b.done&&v.jsxs(Tt,{onClick:K,children:[v.jsx(Y1,{className:"h-4 w-4"})," Skip"]}),v.jsxs(Tt,{onClick:he,children:[v.jsx(hw,{className:"h-4 w-4"})," Undo"]})]})]}),v.jsxs("div",{className:"text-sm",children:["Captures: ",v.jsx("b",{className:"text-sky-400",children:b.captures}),v.jsx("span",{className:"ml-1 text-xs text-green-500",children:"· instantly saved ✓"})]}),v.jsxs("p",{className:"text-xs text-zinc-500",children:["Each capture is ",v.jsx("b",{children:"saved instantly"}),' — you can press "Done" (above) any time or just stop; nothing is lost.']})]})})]}),v.jsxs("p",{className:"text-xs text-zinc-500",children:['After "Done" the session is sliced automatically. Curated datasets (dedup, rotation, split) are built in the ',v.jsx("b",{className:"text-zinc-300",children:"Datasets"})," tab."]})]})}function xw({st:i}){const e=Math.min(i.index+1,i.n_positions),t=i.build_target?"Setup":"Position",r=i.build_target&&i.gains?v.jsxs("span",{className:"ml-1 text-xs text-zinc-500",children:["· ",i.gains," target squares"]}):null;let a;i.build_target?a=v.jsxs(v.Fragment,{children:["Position ",v.jsx("b",{children:"set up fresh"})," — ",v.jsx("b",{className:"text-sky-300",children:"piece names"})," are overlaid on the live image (white = light text, black = dark),"]}):i.index===0?a=v.jsxs(v.Fragment,{children:["Set up the ",v.jsx("b",{children:"starting position"}),","]}):a=v.jsxs(v.Fragment,{children:["Play this move: ",v.jsx("b",{className:"text-base text-sky-300",children:i.move_san})," ",v.jsx("span",{className:"text-zinc-400",children:"(red arrow)"}),","]});const l=i.build_target?v.jsx(v.Fragment,{children:"(feel free to take several with varying light)"}):null;return v.jsxs(v.Fragment,{children:[v.jsxs("div",{className:"text-sm text-zinc-400",children:[t," ",v.jsx("b",{className:"text-zinc-100",children:e})," / ",i.n_positions,r]}),v.jsxs("div",{className:"rounded-lg bg-zinc-800 p-3 text-sm",children:[a,v.jsxs("div",{className:"mt-1 text-xs text-zinc-400",children:["…then ",v.jsx("b",{children:"Photo"}),l,"."]})]})]})}const fo="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-sky-500",uf=({isActive:i})=>`rounded-lg px-3 py-1.5 text-sm transition ${i?"bg-zinc-800 text-zinc-100":"text-zinc-400 hover:text-zinc-100"}`;function vw(){return v.jsxs("div",{className:"space-y-4",children:[v.jsxs("nav",{className:"flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5",children:[v.jsx(mo,{to:"sessions",className:uf,children:"Sessions"}),v.jsx(mo,{to:"curated",className:uf,children:"Curated datasets"}),v.jsx(mo,{to:"stats",className:uf,children:"Statistics"})]}),v.jsx(o1,{})]})}const J_=()=>{const i=hm();return(...e)=>e.forEach(t=>i.invalidateQueries({queryKey:[t]}))};function _w(){var V,J,se;const i=J_(),[e,t]=H.useState(""),[r,a]=H.useState(""),[l,c]=H.useState(""),[d,h]=H.useState(0),f=Ea({queryKey:["sessions-manage"],queryFn:()=>nn("/api/sessions/manage")}),m=Ea({queryKey:["session-review",l,d],queryFn:()=>nn(`/api/sessions/${encodeURIComponent(l)}/review?idx=${d}`),enabled:!!l}),g=f.data??[],x=g.filter(j=>!j.variant),M=g.filter(j=>j.variant),E=j=>{t(j),a("ok"),i("sessions-manage","stats","datasets")},w=j=>{t("Error: "+j.message),a("err")},_=j=>{t(j),a("busy")},y=kr({mutationFn:j=>rn(`/api/sessions/${j}/slice`),onMutate:j=>_(`slicing "${j}" ...`),onSuccess:j=>E(`"${j.session}" sliced: ${j.crops} crops.`),onError:w}),L=j=>{c(j),h(0)},P=()=>{c(""),h(0)},T=m.data,U=(()=>{var j,k;if(T){const oe=(j=T.entry)!=null&&j.move_san?` | ${T.entry.move_san}`:"",te=((k=T.entry)==null?void 0:k.ply)!==void 0?` | ply ${T.entry.ply}`:"";return`Frame ${T.index+1} / ${T.count}${oe}${te}`}return m.isError?"Could not load session details.":"Loading session details..."})(),N=kr({mutationFn:j=>rn(`/api/sessions/${j}/archive`),onSuccess:()=>E("archived."),onError:w}),O=kr({mutationFn:j=>rn(`/api/sessions/${j}/restore`),onSuccess:()=>E("restored — re-slice."),onError:w}),b=kr({mutationFn:j=>Gl(`/api/sessions/${j}`),onSuccess:()=>E("deleted."),onError:w}),I=kr({mutationFn:({sid:j,keep_frames:k})=>rn(`/api/sessions/${j}/trim`,{keep_frames:k}),onSuccess:j=>{E(`trimmed "${j.session_id}": kept ${j.kept_frames}, moved ${j.removed_frames} to rejects.`),h(k=>Math.min(k,Math.max(0,j.kept_frames-1))),i("session-review")},onError:w}),W=kr({mutationFn:({sid:j,idx:k,unusable:oe})=>rn(`/api/sessions/${j}/flag/${k}`,{unusable:oe}),onSuccess:()=>{i("session-review","sessions-manage")},onError:w});return v.jsxs(fn,{title:"Sessions (raw material)",right:v.jsxs("span",{className:"text-xs text-zinc-500",children:[x.length," camera / ",M.length," ingested"]}),children:[e&&v.jsx("div",{className:`mb-2 rounded-lg px-3 py-1.5 text-sm ${bm(r)}`,children:e}),x.length===0?v.jsx("span",{className:"text-sm text-zinc-500",children:"No sessions yet — capture some in the Collect tab."}):v.jsxs("table",{className:"w-full text-sm",children:[v.jsx("thead",{children:v.jsxs("tr",{className:"text-zinc-500",children:[v.jsx("th",{className:"text-left font-normal",children:"Session"}),v.jsx("th",{className:"text-left font-normal",children:"Mode"}),v.jsx("th",{className:"text-right font-normal",children:"Frames"}),v.jsx("th",{className:"text-right font-normal",children:"Crops"}),v.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),v.jsx("tbody",{children:x.map(j=>v.jsxs("tr",{className:"border-t border-zinc-800",children:[v.jsxs("td",{className:"py-1.5 text-zinc-200",children:[j.session_id,j.archived&&v.jsx("span",{className:"ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300",children:"archived"}),!j.archived&&j.n_crops===0&&v.jsx("span",{className:"ml-2 rounded bg-amber-900/60 px-1.5 py-0.5 text-[10px] text-amber-300",children:"not sliced"})]}),v.jsx("td",{className:"text-zinc-400",children:j.mode??"—"}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:j.n_frames}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:j.archived?"—":j.n_crops}),v.jsx("td",{className:"py-1",children:v.jsxs("div",{className:"flex justify-end gap-1.5",children:[v.jsxs(Tt,{onClick:()=>L(j.session_id),disabled:!j.n_frames,className:"px-2 py-1 text-xs disabled:opacity-50",children:[v.jsx(ju,{className:"h-3.5 w-3.5"})," Review"]}),!j.archived&&v.jsxs(Tt,{onClick:()=>y.mutate(j.session_id),disabled:y.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[y.isPending&&y.variables===j.session_id?v.jsx(_n,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(zx,{className:"h-3.5 w-3.5"})," ",j.n_crops?"Re-slice":"Slice"]}),j.archived?v.jsxs(Tt,{onClick:()=>O.mutateAsync(j.session_id),disabled:O.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[O.isPending&&O.variables===j.session_id?v.jsx(_n,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx($1,{className:"h-3.5 w-3.5"})," Restore"]}):v.jsxs(Tt,{onClick:()=>N.mutateAsync(j.session_id),disabled:N.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[N.isPending&&N.variables===j.session_id?v.jsx(_n,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(q1,{className:"h-3.5 w-3.5"})," Archive"]}),v.jsxs(Tt,{onClick:()=>window.confirm(`Delete session "${j.session_id}" permanently?`)&&b.mutateAsync(j.session_id),disabled:b.isPending,className:"px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50",children:[b.isPending&&b.variables===j.session_id?v.jsx(_n,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(wa,{className:"h-3.5 w-3.5"})," Delete"]})]})})]},j.session_id))})]}),l&&v.jsxs("div",{className:"mt-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3",children:[v.jsxs("div",{className:"mb-3 flex flex-wrap items-center justify-between gap-2",children:[v.jsxs("div",{children:[v.jsx("div",{className:"text-sm font-medium text-zinc-200",children:l}),v.jsx("div",{className:"text-xs text-zinc-500",children:U}),T&&v.jsxs("div",{className:"text-[11px] text-zinc-600",children:["Trim keeps this frame included; only frames after it move to the reject bucket and leave training data.",T.index>=T.count-1?" This is already the last frame.":""]})]}),v.jsxs("div",{className:"flex items-center gap-1.5",children:[v.jsxs(Tt,{onClick:()=>h(j=>Math.max(0,j-1)),disabled:!T||T.index<=0,className:"px-2 py-1 text-xs disabled:opacity-50",title:"Previous frame",children:[v.jsx(J1,{className:"h-3.5 w-3.5"})," Prev"]}),v.jsxs(Tt,{onClick:()=>h(j=>Math.min(((T==null?void 0:T.count)??1)-1,j+1)),disabled:!T||T.index>=T.count-1,className:"px-2 py-1 text-xs disabled:opacity-50",title:"Next frame",children:["Next ",v.jsx(ew,{className:"h-3.5 w-3.5"})]}),v.jsxs(Tt,{onClick:P,className:"px-2 py-1 text-xs",children:[v.jsx(Z_,{className:"h-3.5 w-3.5"})," Close"]}),v.jsxs(Tt,{onClick:()=>{var j;return W.mutate({sid:l,idx:T.index,unusable:!((j=T==null?void 0:T.entry)!=null&&j.unusable)})},disabled:!T||W.isPending,className:`px-2 py-1 text-xs disabled:opacity-50 ${(V=T==null?void 0:T.entry)!=null&&V.unusable?"bg-red-900/60 text-red-300 hover:text-red-200":""}`,title:"Mark this frame as unsuitable for training (hand visible, extra piece, etc.). Excluded from slice/dataset build.",children:[W.isPending?v.jsx(_n,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(rw,{className:"h-3.5 w-3.5"}),(J=T==null?void 0:T.entry)!=null&&J.unusable?"Unusable (flagged)":"Unusable?"]}),v.jsxs(Tt,{onClick:()=>{const j=((T==null?void 0:T.index)??0)+1;window.confirm(`Keep frames 1-${j}, including the current frame. Move all later frames to the reject bucket and remove them from training data?`)&&I.mutate({sid:l,keep_frames:j})},disabled:!T||T.index>=T.count-1||I.isPending,className:"px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50",title:"Keeps the current frame; moves only later frames to the reject bucket and removes their crops from training data",children:[I.isPending?v.jsx(_n,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(zx,{className:"h-3.5 w-3.5"}),"Keep through this frame"]})]})]}),m.isError&&v.jsx("div",{className:"rounded-lg bg-red-950/60 px-3 py-1.5 text-sm text-red-300",children:m.error.message}),T&&v.jsxs("div",{className:"grid gap-3 lg:grid-cols-2",children:[v.jsxs("div",{children:[v.jsxs("div",{className:"mb-1 text-xs font-medium text-zinc-500",children:["ArUco-aligned frame",T.overlay_available?"":" (raw fallback)"]}),v.jsx("img",{src:T.overlay_url,alt:`${l} overlay ${T.index+1}`,className:"max-h-[70vh] w-full rounded border border-zinc-800 object-contain"})]}),v.jsxs("div",{children:[v.jsx("div",{className:"mb-1 text-xs font-medium text-zinc-500",children:"Logged board"}),v.jsx("img",{src:T.board_url,alt:`${l} board ${T.index+1}`,className:"max-h-[70vh] w-full rounded border border-zinc-800 bg-zinc-100 object-contain"}),v.jsx("div",{className:"mt-2 break-all rounded bg-zinc-900 px-2 py-1 text-[11px] text-zinc-500",children:(se=T.entry)==null?void 0:se.fen})]})]})]}),M.length>0&&v.jsxs(v.Fragment,{children:[v.jsx("div",{className:"mt-5 mb-1 text-sm font-medium text-zinc-300",children:"Ingested datasets (pretrain variants)"}),v.jsxs("p",{className:"mb-2 text-xs text-zinc-500",children:["Imported via ",v.jsx("code",{children:"chesslab ingest"}),". Their crops live in a separate variant manifest (",v.jsx("code",{children:"squares__<tag>.jsonl"}),") and never mix with your camera dataset — train on them with ",v.jsx("code",{children:"train --dataset <tag>"}),". No slicing here."]}),v.jsxs("table",{className:"w-full text-sm",children:[v.jsx("thead",{children:v.jsxs("tr",{className:"text-zinc-500",children:[v.jsx("th",{className:"text-left font-normal",children:"Session"}),v.jsx("th",{className:"text-left font-normal",children:"Variant"}),v.jsx("th",{className:"text-right font-normal",children:"Frames"}),v.jsx("th",{className:"text-right font-normal",children:"Variant crops"}),v.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),v.jsx("tbody",{children:M.map(j=>v.jsxs("tr",{className:"border-t border-zinc-800",children:[v.jsxs("td",{className:"py-1.5 text-zinc-200",children:[j.session_id,j.archived&&v.jsx("span",{className:"ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300",children:"archived"})]}),v.jsx("td",{children:v.jsx("span",{className:"rounded bg-indigo-950/60 px-1.5 py-0.5 text-[10px] text-indigo-300",children:j.variant})}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:j.n_frames}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:j.n_crops}),v.jsx("td",{className:"py-1",children:v.jsx("div",{className:"flex justify-end gap-1.5",children:v.jsxs(Tt,{onClick:()=>{window.confirm(`Delete ingested session "${j.session_id}"? (variant crops stay; re-ingest to recreate)`)&&b.mutateAsync(j.session_id)},disabled:b.isPending,className:"px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50",children:[b.isPending&&b.variables===j.session_id?v.jsx(_n,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(wa,{className:"h-3.5 w-3.5"})," Delete"]})})})]},j.session_id))})]})]})]})}function yw(){const i=J_(),[e,t]=H.useState(""),[r,a]=H.useState(""),[l,c]=H.useState(!1),[d,h]=H.useState(""),[f,m]=H.useState({}),[g,x]=H.useState(4),[M,E]=H.useState(!0),[w,_]=H.useState(6),[y,L]=H.useState(!0),[P,T]=H.useState(.15),[U,N]=H.useState(.15),O=Ea({queryKey:["sessions-manage"],queryFn:()=>nn("/api/sessions/manage")}),b=Ea({queryKey:["datasets"],queryFn:()=>nn("/api/datasets")}),I=(O.data??[]).filter(k=>!k.archived&&!k.variant),W=b.data??[],V=kr({mutationFn:k=>rn("/api/datasets",k),onSuccess:k=>{t(`"${k.name}" built: raw ${k.counts.raw} → dedup ${k.counts.after_dedup} → final ${k.counts.final}.`),a("ok"),c(!1),h(""),m({}),i("datasets","stats")},onError:k=>{t("Error: "+k.message),a("err")}}),J=kr({mutationFn:k=>Gl(`/api/datasets/${k}`),onSuccess:()=>{t("deleted."),a("ok"),i("datasets")},onError:k=>{t("Error: "+k.message),a("err")}}),se=kr({mutationFn:k=>rn(`/api/datasets/${k}/rebuild`),onSuccess:k=>{var oe;t(`"${k.name}" rebuilt: ${(oe=k.counts)==null?void 0:oe.final} crops.`),a("ok"),i("datasets","stats")},onError:k=>{t("Error: "+k.message),a("err")}});function j(){const k=I.filter(oe=>f[oe.session_id]).map(oe=>oe.session_id);if(!d.trim()||k.length===0){t("Name and at least one session required.");return}V.mutate({name:d.trim(),session_ids:k,per_cell_cap:g,phash_enabled:M,phash_hamming:w,rotate:y,val_frac:P,test_frac:U})}return v.jsxs(fn,{title:"Curated datasets",right:v.jsxs("div",{className:"flex items-center gap-2",children:[e&&v.jsx("span",{className:`rounded-lg px-2 py-0.5 text-xs ${bm(r)}`,children:e}),v.jsxs(Tt,{onClick:()=>c(k=>!k),className:"px-2 py-1 text-xs",children:[v.jsx(Q1,{className:"h-3.5 w-3.5"})," New Dataset"]})]}),children:[l&&v.jsxs("div",{className:"mb-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3",children:[v.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["Name",v.jsx("input",{value:d,onChange:k=>h(k.target.value),className:`${fo} w-40`,placeholder:"e.g. set-a"})]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",title:"max. crops per (session, square, piece)",children:["Cap/cell",v.jsx("input",{type:"number",min:1,value:g,onChange:k=>x(+k.target.value),className:`${fo} w-16`})]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:[v.jsx("input",{type:"checkbox",checked:M,onChange:k=>E(k.target.checked)})," pHash"]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["Hamming",v.jsx("input",{type:"number",min:0,max:32,value:w,disabled:!M,onChange:k=>_(+k.target.value),className:`${fo} w-14`})]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",title:"90/180/270° → 4× crops. WARNING: violates the fixed-camera assumption — A/B test.",children:[v.jsx("input",{type:"checkbox",checked:y,onChange:k=>L(k.target.checked)})," ",v.jsx(dw,{className:"h-3.5 w-3.5"})," Rotation"]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["val",v.jsx("input",{type:"number",step:.05,min:0,max:.5,value:P,onChange:k=>T(+k.target.value),className:`${fo} w-14`})]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["test",v.jsx("input",{type:"number",step:.05,min:0,max:.5,value:U,onChange:k=>N(+k.target.value),className:`${fo} w-14`})]})]}),v.jsxs("div",{children:[v.jsxs("div",{className:"mb-1 text-xs text-zinc-500",children:["Sessions (collected only — datasets may overlap):",v.jsx("button",{className:"ml-2 text-[10px] text-zinc-400 underline",onClick:()=>{const k={};I.forEach(oe=>k[oe.session_id]=!0),m(k)},children:"Select all"}),v.jsx("button",{className:"ml-2 text-[10px] text-zinc-400 underline",onClick:()=>m({}),children:"Clear"})]}),v.jsx("div",{className:"flex flex-wrap gap-2",children:I.length===0?v.jsx("span",{className:"text-xs text-zinc-500",children:"no active sessions"}):I.map(k=>v.jsxs("label",{className:"flex items-center gap-1.5 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300",children:[v.jsx("input",{type:"checkbox",checked:!!f[k.session_id],onChange:oe=>m(te=>({...te,[k.session_id]:oe.target.checked}))}),k.session_id," ",v.jsxs("span",{className:"text-zinc-500",children:["(",k.n_crops,")"]})]},k.session_id))})]}),v.jsxs(Tt,{variant:"primary",onClick:j,disabled:V.isPending,children:[V.isPending?v.jsx(_n,{className:"h-4 w-4 animate-spin"}):v.jsx(Ox,{className:"h-4 w-4"})," ",V.isPending?"Building…":"Build"]})]}),W.length===0?v.jsx("span",{className:"text-sm text-zinc-500",children:"No dataset built yet."}):v.jsxs("table",{className:"w-full text-sm",children:[v.jsx("thead",{children:v.jsxs("tr",{className:"text-zinc-500",children:[v.jsx("th",{className:"text-left font-normal",children:"Dataset"}),v.jsx("th",{className:"text-right font-normal",children:"Sessions"}),v.jsx("th",{className:"text-right font-normal",children:"raw→dedup→final"}),v.jsx("th",{className:"text-right font-normal",children:"train/val/test"}),v.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),v.jsx("tbody",{children:W.map(k=>{var oe,te,K,he,de,z,q;return v.jsxs("tr",{className:"border-t border-zinc-800",children:[v.jsxs("td",{className:"py-1.5 text-zinc-200",children:[k.name,((oe=k.rotations)==null?void 0:oe.some(Ie=>Ie))&&v.jsx("span",{className:"ml-2 text-[10px] text-zinc-500",children:"+rot"})]}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:k.n_sessions}),v.jsxs("td",{className:"text-right tabular-nums text-zinc-400",children:[(te=k.counts)==null?void 0:te.raw,"→",(K=k.counts)==null?void 0:K.after_dedup,"→",(he=k.counts)==null?void 0:he.final]}),v.jsxs("td",{className:"text-right tabular-nums text-zinc-400",children:[((de=k.split_counts)==null?void 0:de.train)??"?","/",((z=k.split_counts)==null?void 0:z.val)??"?","/",((q=k.split_counts)==null?void 0:q.test)??"?"]}),v.jsx("td",{className:"py-1",children:v.jsxs("div",{className:"flex justify-end gap-1.5",children:[v.jsx(mo,{to:`../stats?ds=${encodeURIComponent(k.name)}`,className:"inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700",children:"Stats"}),v.jsxs(Tt,{onClick:()=>se.mutateAsync(k.name),disabled:se.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[se.isPending&&se.variables===k.name?v.jsx(_n,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(Ox,{className:"h-3.5 w-3.5"})," Rebuild"]}),v.jsxs(Tt,{onClick:()=>{window.confirm(`Delete dataset "${k.name}"?`)&&J.mutateAsync(k.name)},disabled:J.isPending,className:"px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50",children:[J.isPending&&J.variables===k.name?v.jsx(_n,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(wa,{className:"h-3.5 w-3.5"})," Delete"]})]})})]},k.name)})})]})]})}function Sw(){const[i,e]=k1(),t=i.get("ds")??"",[r,a]=H.useState(null),l=Ea({queryKey:["datasets"],queryFn:()=>nn("/api/datasets")}),c=Ea({queryKey:["stats",t],queryFn:()=>{const w=t?`?dataset=${encodeURIComponent(t)}`:"";return nn(`/api/stats${w}`)}}),d=l.data??[],h=c.data,[f,m]=H.useState("");if(c.isLoading||!h)return v.jsx(fn,{title:"Stats",children:"Loading…"});const g=t?`Dataset "${t}"`:"global pool",x=Math.max(1,...Object.values(h.counts??{x:1})),M=(w,_)=>w==="empty"||w==="occluded"?"#38bdf8":_<h.min_samples*.5?"#ef4444":_<h.min_samples?"#eab308":"#22c55e",E=w=>{const _=t?`&dataset=${encodeURIComponent(t)}`:"";m(""),nn(`/api/class/${w}?limit=120${_}`).then(y=>a({label:w,crops:y.crops})).catch(y=>m(y.message))};return v.jsxs("div",{className:"space-y-4",children:[v.jsxs("div",{className:"grid gap-4 lg:grid-cols-3",children:[v.jsxs(fn,{title:"Class distribution",className:"lg:col-span-2",right:v.jsxs("select",{value:t,onChange:w=>e(w.target.value?{ds:w.target.value}:{}),className:fo,children:[v.jsx("option",{value:"",children:"global pool"}),d.map(w=>v.jsx("option",{value:w.name,children:w.name},w.name))]}),children:[v.jsxs("div",{className:"mb-2 text-xs text-zinc-500",children:[h.total," crops · ",h.num_sessions," sessions",t?` · Dataset "${t}"`:" · raw"]}),v.jsx("div",{className:"space-y-1.5",children:h.classes.map(w=>{const _=h.counts[w]||0;return v.jsxs("button",{onClick:()=>E(w),className:"grid w-full grid-cols-[2rem_1fr_3rem] items-center gap-3 rounded px-1 py-0.5 text-left hover:bg-zinc-800",children:[v.jsxs("span",{className:"text-zinc-300",children:[v.jsx(Hx,{label:w}),v.jsx("span",{className:"ml-1 text-xs text-zinc-500",children:w})]}),v.jsx("div",{className:"h-2.5 overflow-hidden rounded-full bg-zinc-800",children:v.jsx("div",{className:"h-full rounded-full",style:{width:`${_/x*100}%`,background:M(w,_)}})}),v.jsx("span",{className:"text-right text-sm tabular-nums text-zinc-400",children:_})]},w)})})]}),v.jsx(fn,{title:"Light / Dark",children:v.jsxs("table",{className:"w-full text-sm",children:[v.jsx("thead",{children:v.jsxs("tr",{className:"text-zinc-500",children:[v.jsx("th",{className:"text-left font-normal",children:"Class"}),v.jsx("th",{children:"light"}),v.jsx("th",{children:"dark"})]})}),v.jsx("tbody",{children:h.classes.map(w=>{const _=y=>y>0?v.jsx(q_,{className:"mx-auto h-4 w-4 text-green-500"}):v.jsx(Z_,{className:"mx-auto h-4 w-4 text-red-500"});return v.jsxs("tr",{className:"border-t border-zinc-800",children:[v.jsxs("td",{className:"py-1 text-zinc-300",children:[v.jsx(Hx,{label:w})," ",v.jsx("span",{className:"text-xs text-zinc-500",children:w})]}),v.jsx("td",{children:_(h.light[w]||0)}),v.jsx("td",{children:_(h.dark[w]||0)})]},w)})})]})})]}),v.jsx(fn,{title:"Warnings",children:h.warnings.length?v.jsx("ul",{className:"space-y-1 text-sm",children:h.warnings.map((w,_)=>v.jsxs("li",{className:"flex items-center gap-2 text-amber-400",children:[v.jsx(wm,{className:"h-4 w-4 shrink-0"})," ",w]},_))}):v.jsx("span",{className:"text-sm text-green-500",children:"none"})}),v.jsxs(fn,{title:`Browse crops (${g})`,right:v.jsxs("span",{className:"flex items-center gap-1 text-xs text-zinc-500",children:[v.jsx(ow,{className:"h-3.5 w-3.5"}),r?`${r.label} (${r.crops.length})`:"Click a class"]}),children:[f&&v.jsx("div",{className:"mb-2 rounded-lg bg-red-950/60 px-3 py-1.5 text-sm text-red-300",children:f}),r?v.jsx("div",{className:"grid grid-cols-[repeat(auto-fill,56px)] gap-1.5",children:r.crops.map((w,_)=>v.jsx("img",{src:w.url,title:`${w.session_id} ${w.frame} ${w.square}`,alt:`square ${w.square}`,className:"h-[74px] w-[56px] rounded border border-zinc-800 object-cover"},_))}):v.jsx("span",{className:"text-sm text-zinc-500",children:"Select a class on the left to view crops."})]})]})}function Vx({series:i,yMin:e=0,yMax:t=1}){const c=i.flatMap(g=>g.data.map(x=>x.x)),d=Math.max(1,...c),h=g=>30+540*g/d,f=g=>170-140*(g-e)/Math.max(1e-9,t-e),m=4;return v.jsxs("div",{children:[v.jsxs("svg",{viewBox:"0 0 600 200",className:"w-full",style:{height:200},preserveAspectRatio:"none",children:[Array.from({length:m+1},(g,x)=>{const M=e+(t-e)*x/m;return v.jsxs("g",{children:[v.jsx("line",{x1:30,y1:f(M),x2:570,y2:f(M),stroke:"#27272a",strokeWidth:1}),v.jsx("text",{x:4,y:f(M)+3,fill:"#71717a",fontSize:10,children:M.toFixed(t<=1?2:1)})]},x)}),i.map(g=>g.data.length?v.jsx("polyline",{fill:"none",stroke:g.color,strokeWidth:2,strokeLinejoin:"round",points:g.data.map(x=>`${h(x.x).toFixed(1)},${f(x.y).toFixed(1)}`).join(" ")},g.name):null)]}),v.jsx("div",{className:"mt-1 flex flex-wrap gap-4 text-xs text-zinc-400",children:i.map(g=>v.jsxs("span",{className:"flex items-center gap-1.5",children:[v.jsx("span",{className:"inline-block h-2 w-2 rounded-full",style:{background:g.color}}),g.name]},g.name))})]})}const hu="w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100";function Mw(i){const e={};for(const t of i)e[t.true]||(e[t.true]=[]),e[t.true].push(t);return Object.values(e)}function Ew({groups:i}){return v.jsx("div",{className:"mt-3 space-y-3",children:i.map(e=>v.jsxs("div",{className:"flex items-start gap-3",children:[v.jsx("div",{className:"w-10 shrink-0 pt-6 text-right text-sm font-medium text-zinc-400",children:e[0].true}),v.jsx("div",{className:"flex flex-wrap gap-3",children:e.map((t,r)=>v.jsxs("div",{className:"text-center",children:[v.jsxs("div",{className:"grid grid-cols-2 gap-0.5",children:[v.jsx("img",{src:t.orig,alt:t.true,className:"w-12 rounded border border-zinc-800"}),v.jsx("img",{src:t.overlay,alt:"Grad-CAM",className:"w-12 rounded border border-zinc-800"})]}),v.jsxs("div",{className:"mt-1 text-xs",children:[t.pred!==t.true?v.jsxs("span",{className:"text-amber-500",children:["→",t.pred]}):v.jsx("span",{className:"text-zinc-600",children:"✓"}),v.jsxs("span",{className:"text-zinc-600",children:[" ",(t.prob*100).toFixed(0),"%"]})]})]},r))})]},e[0].true))})}function ww({items:i}){return v.jsx("div",{className:"mt-3 space-y-1",children:i.map(e=>{const t=Math.round(e.piece_frac*100),r=e.cls!=="empty"&&t<45;return v.jsxs("div",{className:"flex items-center gap-2 text-xs",children:[v.jsx("div",{className:`w-10 shrink-0 text-right font-medium ${r?"text-rose-400":"text-zinc-400"}`,children:e.cls}),v.jsxs("div",{className:"flex h-4 flex-1 overflow-hidden rounded bg-zinc-800",children:[v.jsx("div",{className:"h-full bg-emerald-600",style:{width:`${t}%`}}),v.jsx("div",{className:"h-full bg-rose-700",style:{width:`${100-t}%`}})]}),v.jsxs("div",{className:"w-28 shrink-0 text-zinc-500",children:[t,"% piece · conf ",(e.base_prob*100).toFixed(0),"%"]})]},e.cls)})})}function bw(){var wt,F,C;const[i,e]=H.useState([]),[t,r]=H.useState(""),[a,l]=H.useState(""),[c,d]=H.useState([]),[h,f]=H.useState({}),[m,g]=H.useState({running:!1}),[x,M]=H.useState(""),[E,w]=H.useState(null),[_,y]=H.useState("smallcnn"),[L,P]=H.useState("combined"),[T,U]=H.useState(30),[N,O]=H.useState(256),[b,I]=H.useState(3e-4),[W,V]=H.useState(7),[J,se]=H.useState(""),[j,k]=H.useState([]),[oe,te]=H.useState(!1),[K,he]=H.useState(3),[de,z]=H.useState([]),[q,Ie]=H.useState(!1),Be=H.useRef(null),ce=Ea({queryKey:["datasets"],queryFn:()=>nn("/api/datasets")}).data??[],ye=ce.find(D=>D.name===a);H.useEffect(()=>{if(!ce.length||a)return;const D=window.setTimeout(()=>l(ce[0].name),0);return()=>window.clearTimeout(D)},[ce,a]);const ge=H.useCallback(async()=>{const D=await nn("/api/runs");e(D),D.length&&!t&&Ue(D[0].run)},[t]);H.useEffect(()=>{const D=window.setTimeout(()=>{ge()},0);return()=>{window.clearTimeout(D),clearInterval(Be.current)}},[ge]);async function Ue(D){r(D),M(""),k([]),z([]);try{d((await nn(`/api/runs/${D}/metrics`)).metrics),f((await nn(`/api/runs/${D}/eval`)).evals)}catch(Z){M(Z.message)}}async function Ze(){if(t){te(!0),M("");try{k((await nn(`/api/runs/${t}/gradcam?per_class=${K}`)).items)}catch(D){M(D.message)}finally{te(!1)}}}async function tt(){if(t){Ie(!0),M("");try{z((await nn(`/api/runs/${t}/reliance`)).items)}catch(D){M(D.message)}finally{Ie(!1)}}}async function Gt(D){M("");try{const Z=await rn(`/api/runs/${D}/eval`,{});if(!Z.ok){M(Z.output||"eval failed");return}t===D&&Ue(D),ge()}catch(Z){M(Z.message)}}async function ut(D){if(window.confirm(`Delete model "${D}"? (directory + weights will be removed)`)){try{await Gl(`/api/runs/${D}`)}catch(Z){M(Z.message);return}M(""),t===D&&(r(""),d([]),f({}),k([]),z([])),ge()}}async function Ct(D){w(D);try{const Z=await rn(`/api/runs/${D}/export`,{});Z.ok?M(`${D}: ONNX exported ✓ — restart tracker to use`):M(Z.output||"export failed"),ge()}catch(Z){M(Z.message)}finally{w(null)}}const mt=D=>D==null?"—":(D*100).toFixed(1)+" %";async function vt(){if(M(""),!a){M("No dataset — build one in the Datasets tab first.");return}try{await rn("/api/train",{backbone:_,head:L,epochs:T,batch_size:N,lr:b,patience:W,no_amp:!0,dataset:a,resume:J||void 0}),clearInterval(Be.current),Be.current=setInterval(kt,2500),kt()}catch(D){M(D.message)}}async function kt(){var Z;const D=await nn("/api/train/status");g(D),(Z=D.metrics)!=null&&Z.length&&d(D.metrics),D.running||(clearInterval(Be.current),ge())}async function Xt(){var D;try{await rn("/api/train/stop")}catch{}clearInterval(Be.current);try{const Z=await nn("/api/train/status");g({...Z,running:!1}),Z.run&&r(Z.run),(D=Z.metrics)!=null&&D.length&&d(Z.metrics)}catch{g({running:!1,state:"stopped"})}ge()}const qt=[{name:"train_loss",color:"#ef4444",data:c.map(D=>({x:D.epoch,y:D.train_loss}))},{name:"val_loss",color:"#eab308",data:c.map(D=>({x:D.epoch,y:D.val_loss??0}))}],$t=Math.max(.5,...c.map(D=>Math.max(D.train_loss||0,D.val_loss||0))),Et=[{name:"square_acc",color:"#38bdf8",data:c.map(D=>({x:D.epoch,y:D.val_acc??0}))},{name:"macro_recall",color:"#22c55e",data:c.map(D=>({x:D.epoch,y:D.val_macro_recall??0}))},{name:"board_acc",color:"#e4e4e7",data:c.map(D=>({x:D.epoch,y:D.val_board_acc??0}))}],zt=j.length?"Recompute":"Show heatmaps",Y=Mw(j),pn=de.length?"Recompute":"Run test";return v.jsxs("div",{className:"space-y-4",children:[v.jsxs(fn,{children:[v.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[v.jsxs(oa,{label:"Dataset",value:a,onChange:D=>l(D.target.value),children:[ce.length===0&&v.jsx("option",{value:"",children:"— none built —"}),ce.map(D=>{var Z;return v.jsxs("option",{value:D.name,children:[D.name," (",((Z=D.counts)==null?void 0:Z.final)??"?",")"]},D.name)})]}),v.jsxs(oa,{label:"Backbone",value:_,onChange:D=>y(D.target.value),title:"CNN architecture: smallcnn (lightweight custom), mobilenet_v3/v4 (fast mobile), efficientnet/resnet (timm — heavier, more accurate)",children:[v.jsx("option",{value:"smallcnn",children:"smallcnn"}),v.jsx("option",{value:"mobilenet_v3_small",children:"mobilenet_v3_small"}),v.jsx("option",{value:"mobilenetv4_conv_small",children:"mobilenetv4_conv_small (timm)"}),v.jsx("option",{value:"mobilenetv4_conv_medium",children:"mobilenetv4_conv_medium (timm)"}),v.jsx("option",{value:"efficientnet_b0",children:"efficientnet_b0 (timm)"}),v.jsx("option",{value:"resnet18",children:"resnet18 (timm)"})]}),v.jsxs(oa,{label:"Head",value:L,onChange:D=>P(D.target.value),title:"Classification head: combined (single fc), factored (type+color), twostage (occupancy then piece identity)",children:[v.jsx("option",{value:"combined",children:"combined"}),v.jsx("option",{value:"factored",children:"factored"}),v.jsx("option",{value:"twostage",children:"twostage (Occ→Piece)"})]}),v.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Number of full passes over the training data. More epochs = more learning, but risk of overfitting.",children:["Epochs",v.jsx("input",{type:"number",min:1,value:T,onChange:D=>U(+D.target.value),className:hu})]}),v.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Samples processed at once. Larger batch = faster training, more GPU memory. Small batches (32-64) generalize better.",children:["Batch",v.jsx("input",{type:"number",min:1,value:N,onChange:D=>O(+D.target.value),className:hu})]}),v.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Learning rate: step size for gradient descent. Higher = faster learning but may overshoot; 0.0003 is a safe default for AdamW.",children:["LR",v.jsx("input",{type:"number",step:1e-4,min:0,value:b,onChange:D=>I(+D.target.value),className:hu})]}),v.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Early stopping: epochs without macro_recall progress before aborting.",children:["Patience",v.jsx("input",{type:"number",min:1,value:W,onChange:D=>V(+D.target.value),className:hu})]}),v.jsxs(oa,{label:"Resume",value:J,onChange:D=>se(D.target.value),children:[v.jsx("option",{value:"",children:"from scratch"}),i.some(D=>String(D.dataset||"").startsWith("pretrain-"))&&v.jsx("optgroup",{label:"Base models (pretrained)",children:i.filter(D=>String(D.dataset||"").startsWith("pretrain-")).map(D=>v.jsxs("option",{value:D.run,children:["🔹 Base · ",D.run]},D.run))}),v.jsx("optgroup",{label:"Own runs",children:i.filter(D=>!String(D.dataset||"").startsWith("pretrain-")).map(D=>v.jsx("option",{value:D.run,children:D.run},D.run))})]}),v.jsxs(Tt,{variant:"primary",onClick:vt,disabled:m.running||!a,children:[m.running?v.jsx(_n,{className:"h-4 w-4 animate-spin"}):v.jsx(Em,{className:"h-4 w-4"})," Start training"]}),m.running&&v.jsxs(Tt,{onClick:Xt,children:[v.jsx(K_,{className:"h-4 w-4"})," Cancel"]})]}),ye&&v.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:["Split: train ",((wt=ye.split_counts)==null?void 0:wt.train)??"?"," · val ",((F=ye.split_counts)==null?void 0:F.val)??"?"," · test ",((C=ye.split_counts)==null?void 0:C.test)??"?"]}),(m.running||c.length>0)&&v.jsxs("div",{className:"mt-3",children:[v.jsxs("div",{className:"mb-1 flex justify-between text-xs text-zinc-400",children:[v.jsxs("span",{children:[m.running?`running… (${m.run})`:m.state==="stopped"||m.state==="crashed"?"aborted":"Progress"," · epoch ",c.length,"/",T]}),v.jsxs("span",{children:["board_acc ",c.length?((c[c.length-1].val_board_acc??0)*100).toFixed(1)+" %":"—"]})]}),v.jsx("div",{className:"h-2 overflow-hidden rounded-full bg-zinc-800",children:v.jsx("div",{className:`h-full rounded-full transition-all ${m.state==="stopped"||m.state==="crashed"?"bg-amber-500":"bg-sky-500"}`,style:{width:`${Math.min(100,c.length/Math.max(1,T)*100)}%`}})})]}),!m.running&&m.state==="done"&&v.jsx("p",{className:"mt-2 text-xs text-green-500",children:"done ✓"}),!m.running&&(m.state==="stopped"||m.state==="crashed")&&v.jsxs("p",{className:"mt-2 text-xs text-amber-400",children:[m.state==="crashed"?"aborted (crash)":"aborted"," at epoch ",c.length,' — partial progress is preserved; "best.pt" saved, "Resume" picks up here.']}),x&&v.jsx("p",{className:"mt-2 text-sm text-amber-400",children:x})]}),v.jsxs(fn,{title:"Models",right:v.jsxs("span",{className:"text-xs text-zinc-500",children:[i.length," Run(s)"]}),children:[i.length===0?v.jsx("span",{className:"text-sm text-zinc-500",children:"No model trained yet."}):v.jsx("div",{className:"overflow-x-auto",children:v.jsxs("table",{className:"w-full text-sm",children:[v.jsx("thead",{children:v.jsxs("tr",{className:"text-zinc-500",children:[v.jsx("th",{className:"text-left font-normal",children:"Run"}),v.jsx("th",{className:"text-left font-normal",children:"Backbone"}),v.jsx("th",{className:"text-left font-normal",children:"Dataset"}),v.jsx("th",{className:"text-right font-normal",children:"Cls"}),v.jsx("th",{className:"text-right font-normal",children:"Ep."}),"                ",v.jsx("th",{className:"text-right font-normal",title:"best val board_acc (all 64 squares correct)",children:"board_acc"}),v.jsx("th",{className:"text-right font-normal",title:"best val square_acc (fraction of correct squares — drives board_acc ≈ square_acc^64)",children:"square_acc"}),v.jsx("th",{className:"text-right font-normal",title:"best val macro_recall",children:"macro_rec"}),v.jsx("th",{className:"text-right font-normal",title:"test-set board_acc (after eval)",children:"test"}),v.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),v.jsx("tbody",{children:i.map(D=>v.jsxs("tr",{className:`border-t border-zinc-800 ${t===D.run?"bg-zinc-800/50":""}`,children:[v.jsxs("td",{className:"py-1.5 text-zinc-200",children:[D.run,D.resumed_from&&v.jsx("span",{className:"ml-1 text-[10px] text-zinc-500",title:`resumed from ${D.resumed_from}`,children:"↻"}),D.has_occluded&&v.jsx("span",{className:"ml-1 rounded bg-zinc-700 px-1 text-[9px] text-amber-300",children:"+occ"})]}),v.jsx("td",{className:"text-zinc-400",children:D.backbone}),v.jsx("td",{className:"text-zinc-400",children:D.dataset??"—"}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:D.n_classes}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:D.epochs_done}),v.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:mt(D.best_board_acc)}),v.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:mt(D.best_square_acc)}),v.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:mt(D.best_macro_recall)}),v.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:mt(D.test_board_acc)}),v.jsx("td",{className:"py-1",children:v.jsxs("div",{className:"flex justify-end gap-1.5",children:[v.jsxs(Tt,{onClick:()=>Ue(D.run),className:"px-2 py-1 text-xs",children:[v.jsx(ju,{className:"h-3.5 w-3.5"})," View"]}),v.jsxs(Tt,{onClick:()=>Gt(D.run),className:"px-2 py-1 text-xs",title:"Run eval (test split) — generates metrics + confusion matrix",children:[v.jsx(sw,{className:"h-3.5 w-3.5"})," Eval"]}),v.jsxs(Tt,{onClick:()=>Ct(D.run),disabled:E===D.run,className:"px-2 py-1 text-xs",title:D.has_onnx?"model.onnx exists":"Export to ONNX for faster inference",children:[E===D.run?v.jsx(_n,{className:"h-3.5 w-3.5 animate-spin"}):D.has_onnx?v.jsx(q_,{className:"h-3.5 w-3.5 text-green-400"}):v.jsx(cw,{className:"h-3.5 w-3.5"})," Export"]}),v.jsxs(Tt,{onClick:()=>ut(D.run),className:"px-2 py-1 text-xs text-red-300 hover:text-red-200",children:[v.jsx(wa,{className:"h-3.5 w-3.5"})," Delete"]})]})})]},D.run))})]})}),v.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:['"View" loads curves & eval below · "test" appears after ',v.jsx("code",{children:"chesslab eval --run …"}),' · ↻ = continued training · +occ = model knows "occluded" class.']})]}),v.jsxs("div",{className:"grid gap-4 lg:grid-cols-2",children:[v.jsx(fn,{title:"Loss",children:v.jsx(Vx,{series:qt,yMin:0,yMax:$t})}),v.jsx(fn,{title:"Metrics (0-1) — macro_recall is the honest number",children:v.jsx(Vx,{series:Et,yMin:0,yMax:1})})]}),v.jsx(fn,{title:"Evaluation",children:Object.keys(h).length?v.jsx("div",{className:"space-y-4",children:Object.entries(h).map(([D,Z])=>{const me=Object.entries(Z.recall||{}).sort((Ee,Re)=>Ee[1]-Re[1]).slice(0,3);return v.jsxs("div",{children:[v.jsxs("div",{className:"text-sm",children:[v.jsx("span",{className:"font-medium uppercase text-zinc-400",children:D})," · board_acc ",v.jsxs("b",{children:[(Z.board_acc*100).toFixed(1),"%"]})," · square_acc ",(Z.square_acc*100).toFixed(1),"%"]}),v.jsxs("div",{className:"text-xs text-zinc-500",children:["weakest classes: ",me.map(([Ee,Re])=>`${Ee} ${(Re*100).toFixed(0)}%`).join(", ")]}),Z.confusion_png&&v.jsx("img",{src:Z.confusion_png,alt:"Confusion Matrix",className:"mt-2 max-w-md rounded-lg border border-zinc-800"})]},D)})}):v.jsxs("span",{className:"text-sm text-zinc-500",children:["No eval yet — ",v.jsx("code",{children:"chesslab eval --run …"})]})}),v.jsxs(fn,{title:"Grad-CAM — which pixels drove the decision",children:[v.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[v.jsx(oa,{label:"Samples / class",value:String(K),onChange:D=>he(+D.target.value),children:[1,2,3,5,8].map(D=>v.jsx("option",{value:D,children:D},D))}),v.jsxs(Tt,{onClick:Ze,disabled:!t||oe,children:[oe?v.jsx(_n,{className:"h-4 w-4 animate-spin"}):v.jsx(ju,{className:"h-4 w-4"}),oe?"Computing…":zt]}),v.jsx("span",{className:"text-xs text-zinc-500",children:"Test crops per class · each pair = original + heatmap; red = pixels most relevant to the predicted class."})]}),Y.length>0&&v.jsx(Ew,{groups:Y})]}),v.jsxs(fn,{title:"Background reliance — does it read the piece or the board?",children:[v.jsxs("div",{className:"flex items-center gap-3",children:[v.jsxs(Tt,{onClick:tt,disabled:!t||q,children:[q?v.jsx(_n,{className:"h-4 w-4 animate-spin"}):v.jsx(ju,{className:"h-4 w-4"}),q?"Testing…":pn]}),v.jsxs("span",{className:"text-xs text-zinc-500",children:["Occludes piece (center) vs. board (border ring) and measures the confidence drop. ",v.jsx("span",{className:"text-emerald-500",children:"green = piece"})," / ",v.jsx("span",{className:"text-rose-500",children:"red = background"}),". Low green on a piece class = shortcut learning. (",v.jsx("code",{children:"empty"})," is expected to be red.)"]})]}),de.length>0&&v.jsx(ww,{items:de})]}),m.log_tail&&v.jsx(fn,{title:"Log",children:v.jsx("pre",{className:"max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 text-xs text-zinc-400",children:m.log_tail})})]})}/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Tm="185",go={ROTATE:0,DOLLY:1,PAN:2},po={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Tw=0,Gx=1,Cw=2,Wu=1,Rw=2,Ul=3,Fs=0,hi=1,hr=2,jr=0,xo=1,jx=2,Wx=3,Xx=4,Aw=5,la=100,Pw=101,Nw=102,Lw=103,Dw=104,Iw=200,Uw=201,Fw=202,Ow=203,fp=204,pp=205,kw=206,zw=207,Bw=208,Hw=209,Vw=210,Gw=211,jw=212,Ww=213,Xw=214,mp=0,gp=1,xp=2,Do=3,vp=4,_p=5,yp=6,Sp=7,Cm=0,$w=1,qw=2,mr=0,ey=1,ty=2,ny=3,Rm=4,iy=5,ry=6,sy=7,ay=300,ba=301,Io=302,df=303,hf=304,gd=306,Mp=1e3,Gr=1001,Ep=1002,Fn=1003,Yw=1004,fu=1005,Wn=1006,ff=1007,da=1008,Si=1009,oy=1010,ly=1011,jl=1012,Am=1013,vr=1014,fr=1015,qr=1016,Pm=1017,Nm=1018,Wl=1020,cy=35902,uy=35899,dy=1021,hy=1022,Ki=1023,Yr=1026,ha=1027,fy=1028,Lm=1029,Ta=1030,Dm=1031,Im=1033,Xu=33776,$u=33777,qu=33778,Yu=33779,wp=35840,bp=35841,Tp=35842,Cp=35843,Rp=36196,Ap=37492,Pp=37496,Np=37488,Lp=37489,id=37490,Dp=37491,Ip=37808,Up=37809,Fp=37810,Op=37811,kp=37812,zp=37813,Bp=37814,Hp=37815,Vp=37816,Gp=37817,jp=37818,Wp=37819,Xp=37820,$p=37821,qp=36492,Yp=36494,Kp=36495,Qp=36283,Zp=36284,rd=36285,Jp=36286,Kw=3200,sd=0,Qw=1,ws="",Jn="srgb",ad="srgb-linear",od="linear",Vt="srgb",Qa=7680,$x=519,Zw=512,Jw=513,eb=514,Um=515,tb=516,nb=517,Fm=518,ib=519,qx=35044,Yx="300 es",pr=2e3,Xl=2001;function rb(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function $l(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function sb(){const i=$l("canvas");return i.style.display="block",i}const Kx={};function Qx(...i){const e="THREE."+i.shift();console.log(e,...i)}function py(i){const e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function lt(...i){i=py(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function Dt(...i){i=py(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function vo(...i){const e=i.join(" ");e in Kx||(Kx[e]=!0,lt(...i))}function ab(i,e,t){return new Promise(function(r,a){function l(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:a();break;case i.TIMEOUT_EXPIRED:setTimeout(l,t);break;default:r()}}setTimeout(l,t)})}const ob={[mp]:gp,[xp]:yp,[vp]:Sp,[Do]:_p,[gp]:mp,[yp]:xp,[Sp]:vp,[_p]:Do};class ks{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const r=this._listeners;r[e]===void 0&&(r[e]=[]),r[e].indexOf(t)===-1&&r[e].push(t)}hasEventListener(e,t){const r=this._listeners;return r===void 0?!1:r[e]!==void 0&&r[e].indexOf(t)!==-1}removeEventListener(e,t){const r=this._listeners;if(r===void 0)return;const a=r[e];if(a!==void 0){const l=a.indexOf(t);l!==-1&&a.splice(l,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const r=t[e.type];if(r!==void 0){e.target=this;const a=r.slice(0);for(let l=0,c=a.length;l<c;l++)a[l].call(this,e);e.target=null}}}const Vn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Ku=Math.PI/180,em=180/Math.PI;function tc(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(Vn[i&255]+Vn[i>>8&255]+Vn[i>>16&255]+Vn[i>>24&255]+"-"+Vn[e&255]+Vn[e>>8&255]+"-"+Vn[e>>16&15|64]+Vn[e>>24&255]+"-"+Vn[t&63|128]+Vn[t>>8&255]+"-"+Vn[t>>16&255]+Vn[t>>24&255]+Vn[r&255]+Vn[r>>8&255]+Vn[r>>16&255]+Vn[r>>24&255]).toLowerCase()}function bt(i,e,t){return Math.max(e,Math.min(t,i))}function lb(i,e){return(i%e+e)%e}function pf(i,e,t){return(1-t)*i+t*e}function Tl(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function li(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}const cb={DEG2RAD:Ku},Vm=class Vm{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,r=this.y,a=e.elements;return this.x=a[0]*t+a[3]*r+a[6],this.y=a[1]*t+a[4]*r+a[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=bt(this.x,e.x,t.x),this.y=bt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=bt(this.x,e,t),this.y=bt(this.y,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(bt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const r=this.dot(e)/t;return Math.acos(bt(r,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,r=this.y-e.y;return t*t+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const r=Math.cos(t),a=Math.sin(t),l=this.x-e.x,c=this.y-e.y;return this.x=l*r-c*a+e.x,this.y=l*a+c*r+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};Vm.prototype.isVector2=!0;let dt=Vm;class Os{constructor(e=0,t=0,r=0,a=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=r,this._w=a}static slerpFlat(e,t,r,a,l,c,d){let h=r[a+0],f=r[a+1],m=r[a+2],g=r[a+3],x=l[c+0],M=l[c+1],E=l[c+2],w=l[c+3];if(g!==w||h!==x||f!==M||m!==E){let _=h*x+f*M+m*E+g*w;_<0&&(x=-x,M=-M,E=-E,w=-w,_=-_);let y=1-d;if(_<.9995){const L=Math.acos(_),P=Math.sin(L);y=Math.sin(y*L)/P,d=Math.sin(d*L)/P,h=h*y+x*d,f=f*y+M*d,m=m*y+E*d,g=g*y+w*d}else{h=h*y+x*d,f=f*y+M*d,m=m*y+E*d,g=g*y+w*d;const L=1/Math.sqrt(h*h+f*f+m*m+g*g);h*=L,f*=L,m*=L,g*=L}}e[t]=h,e[t+1]=f,e[t+2]=m,e[t+3]=g}static multiplyQuaternionsFlat(e,t,r,a,l,c){const d=r[a],h=r[a+1],f=r[a+2],m=r[a+3],g=l[c],x=l[c+1],M=l[c+2],E=l[c+3];return e[t]=d*E+m*g+h*M-f*x,e[t+1]=h*E+m*x+f*g-d*M,e[t+2]=f*E+m*M+d*x-h*g,e[t+3]=m*E-d*g-h*x-f*M,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,r,a){return this._x=e,this._y=t,this._z=r,this._w=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const r=e._x,a=e._y,l=e._z,c=e._order,d=Math.cos,h=Math.sin,f=d(r/2),m=d(a/2),g=d(l/2),x=h(r/2),M=h(a/2),E=h(l/2);switch(c){case"XYZ":this._x=x*m*g+f*M*E,this._y=f*M*g-x*m*E,this._z=f*m*E+x*M*g,this._w=f*m*g-x*M*E;break;case"YXZ":this._x=x*m*g+f*M*E,this._y=f*M*g-x*m*E,this._z=f*m*E-x*M*g,this._w=f*m*g+x*M*E;break;case"ZXY":this._x=x*m*g-f*M*E,this._y=f*M*g+x*m*E,this._z=f*m*E+x*M*g,this._w=f*m*g-x*M*E;break;case"ZYX":this._x=x*m*g-f*M*E,this._y=f*M*g+x*m*E,this._z=f*m*E-x*M*g,this._w=f*m*g+x*M*E;break;case"YZX":this._x=x*m*g+f*M*E,this._y=f*M*g+x*m*E,this._z=f*m*E-x*M*g,this._w=f*m*g-x*M*E;break;case"XZY":this._x=x*m*g-f*M*E,this._y=f*M*g-x*m*E,this._z=f*m*E+x*M*g,this._w=f*m*g+x*M*E;break;default:lt("Quaternion: .setFromEuler() encountered an unknown order: "+c)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const r=t/2,a=Math.sin(r);return this._x=e.x*a,this._y=e.y*a,this._z=e.z*a,this._w=Math.cos(r),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,r=t[0],a=t[4],l=t[8],c=t[1],d=t[5],h=t[9],f=t[2],m=t[6],g=t[10],x=r+d+g;if(x>0){const M=.5/Math.sqrt(x+1);this._w=.25/M,this._x=(m-h)*M,this._y=(l-f)*M,this._z=(c-a)*M}else if(r>d&&r>g){const M=2*Math.sqrt(1+r-d-g);this._w=(m-h)/M,this._x=.25*M,this._y=(a+c)/M,this._z=(l+f)/M}else if(d>g){const M=2*Math.sqrt(1+d-r-g);this._w=(l-f)/M,this._x=(a+c)/M,this._y=.25*M,this._z=(h+m)/M}else{const M=2*Math.sqrt(1+g-r-d);this._w=(c-a)/M,this._x=(l+f)/M,this._y=(h+m)/M,this._z=.25*M}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let r=e.dot(t)+1;return r<1e-8?(r=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=r):(this._x=0,this._y=-e.z,this._z=e.y,this._w=r)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=r),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(bt(this.dot(e),-1,1)))}rotateTowards(e,t){const r=this.angleTo(e);if(r===0)return this;const a=Math.min(1,t/r);return this.slerp(e,a),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const r=e._x,a=e._y,l=e._z,c=e._w,d=t._x,h=t._y,f=t._z,m=t._w;return this._x=r*m+c*d+a*f-l*h,this._y=a*m+c*h+l*d-r*f,this._z=l*m+c*f+r*h-a*d,this._w=c*m-r*d-a*h-l*f,this._onChangeCallback(),this}slerp(e,t){let r=e._x,a=e._y,l=e._z,c=e._w,d=this.dot(e);d<0&&(r=-r,a=-a,l=-l,c=-c,d=-d);let h=1-t;if(d<.9995){const f=Math.acos(d),m=Math.sin(f);h=Math.sin(h*f)/m,t=Math.sin(t*f)/m,this._x=this._x*h+r*t,this._y=this._y*h+a*t,this._z=this._z*h+l*t,this._w=this._w*h+c*t,this._onChangeCallback()}else this._x=this._x*h+r*t,this._y=this._y*h+a*t,this._z=this._z*h+l*t,this._w=this._w*h+c*t,this.normalize();return this}slerpQuaternions(e,t,r){return this.copy(e).slerp(t,r)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),r=Math.random(),a=Math.sqrt(1-r),l=Math.sqrt(r);return this.set(a*Math.sin(e),a*Math.cos(e),l*Math.sin(t),l*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}const Gm=class Gm{constructor(e=0,t=0,r=0){this.x=e,this.y=t,this.z=r}set(e,t,r){return r===void 0&&(r=this.z),this.x=e,this.y=t,this.z=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Zx.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Zx.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,r=this.y,a=this.z,l=e.elements;return this.x=l[0]*t+l[3]*r+l[6]*a,this.y=l[1]*t+l[4]*r+l[7]*a,this.z=l[2]*t+l[5]*r+l[8]*a,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,r=this.y,a=this.z,l=e.elements,c=1/(l[3]*t+l[7]*r+l[11]*a+l[15]);return this.x=(l[0]*t+l[4]*r+l[8]*a+l[12])*c,this.y=(l[1]*t+l[5]*r+l[9]*a+l[13])*c,this.z=(l[2]*t+l[6]*r+l[10]*a+l[14])*c,this}applyQuaternion(e){const t=this.x,r=this.y,a=this.z,l=e.x,c=e.y,d=e.z,h=e.w,f=2*(c*a-d*r),m=2*(d*t-l*a),g=2*(l*r-c*t);return this.x=t+h*f+c*g-d*m,this.y=r+h*m+d*f-l*g,this.z=a+h*g+l*m-c*f,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,r=this.y,a=this.z,l=e.elements;return this.x=l[0]*t+l[4]*r+l[8]*a,this.y=l[1]*t+l[5]*r+l[9]*a,this.z=l[2]*t+l[6]*r+l[10]*a,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=bt(this.x,e.x,t.x),this.y=bt(this.y,e.y,t.y),this.z=bt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=bt(this.x,e,t),this.y=bt(this.y,e,t),this.z=bt(this.z,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(bt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this.z=e.z+(t.z-e.z)*r,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const r=e.x,a=e.y,l=e.z,c=t.x,d=t.y,h=t.z;return this.x=a*h-l*d,this.y=l*c-r*h,this.z=r*d-a*c,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const r=e.dot(this)/t;return this.copy(e).multiplyScalar(r)}projectOnPlane(e){return mf.copy(this).projectOnVector(e),this.sub(mf)}reflect(e){return this.sub(mf.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const r=this.dot(e)/t;return Math.acos(bt(r,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,r=this.y-e.y,a=this.z-e.z;return t*t+r*r+a*a}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,r){const a=Math.sin(t)*e;return this.x=a*Math.sin(r),this.y=Math.cos(t)*e,this.z=a*Math.cos(r),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,r){return this.x=e*Math.sin(t),this.y=r,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),r=this.setFromMatrixColumn(e,1).length(),a=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=r,this.z=a,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,r=Math.sqrt(1-t*t);return this.x=r*Math.cos(e),this.y=t,this.z=r*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};Gm.prototype.isVector3=!0;let ne=Gm;const mf=new ne,Zx=new Os,jm=class jm{constructor(e,t,r,a,l,c,d,h,f){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,r,a,l,c,d,h,f)}set(e,t,r,a,l,c,d,h,f){const m=this.elements;return m[0]=e,m[1]=a,m[2]=d,m[3]=t,m[4]=l,m[5]=h,m[6]=r,m[7]=c,m[8]=f,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,r=e.elements;return t[0]=r[0],t[1]=r[1],t[2]=r[2],t[3]=r[3],t[4]=r[4],t[5]=r[5],t[6]=r[6],t[7]=r[7],t[8]=r[8],this}extractBasis(e,t,r){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),r.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const r=e.elements,a=t.elements,l=this.elements,c=r[0],d=r[3],h=r[6],f=r[1],m=r[4],g=r[7],x=r[2],M=r[5],E=r[8],w=a[0],_=a[3],y=a[6],L=a[1],P=a[4],T=a[7],U=a[2],N=a[5],O=a[8];return l[0]=c*w+d*L+h*U,l[3]=c*_+d*P+h*N,l[6]=c*y+d*T+h*O,l[1]=f*w+m*L+g*U,l[4]=f*_+m*P+g*N,l[7]=f*y+m*T+g*O,l[2]=x*w+M*L+E*U,l[5]=x*_+M*P+E*N,l[8]=x*y+M*T+E*O,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],m=e[8];return t*c*m-t*d*f-r*l*m+r*d*h+a*l*f-a*c*h}invert(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],m=e[8],g=m*c-d*f,x=d*h-m*l,M=f*l-c*h,E=t*g+r*x+a*M;if(E===0)return this.set(0,0,0,0,0,0,0,0,0);const w=1/E;return e[0]=g*w,e[1]=(a*f-m*r)*w,e[2]=(d*r-a*c)*w,e[3]=x*w,e[4]=(m*t-a*h)*w,e[5]=(a*l-d*t)*w,e[6]=M*w,e[7]=(r*h-f*t)*w,e[8]=(c*t-r*l)*w,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,r,a,l,c,d){const h=Math.cos(l),f=Math.sin(l);return this.set(r*h,r*f,-r*(h*c+f*d)+c+e,-a*f,a*h,-a*(-f*c+h*d)+d+t,0,0,1),this}scale(e,t){return vo("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(gf.makeScale(e,t)),this}rotate(e){return vo("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(gf.makeRotation(-e)),this}translate(e,t){return vo("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(gf.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,-r,0,r,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,r=e.elements;for(let a=0;a<9;a++)if(t[a]!==r[a])return!1;return!0}fromArray(e,t=0){for(let r=0;r<9;r++)this.elements[r]=e[r+t];return this}toArray(e=[],t=0){const r=this.elements;return e[t]=r[0],e[t+1]=r[1],e[t+2]=r[2],e[t+3]=r[3],e[t+4]=r[4],e[t+5]=r[5],e[t+6]=r[6],e[t+7]=r[7],e[t+8]=r[8],e}clone(){return new this.constructor().fromArray(this.elements)}};jm.prototype.isMatrix3=!0;let pt=jm;const gf=new pt,Jx=new pt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),ev=new pt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function ub(){const i={enabled:!0,workingColorSpace:ad,spaces:{},convert:function(a,l,c){return this.enabled===!1||l===c||!l||!c||(this.spaces[l].transfer===Vt&&(a.r=Wr(a.r),a.g=Wr(a.g),a.b=Wr(a.b)),this.spaces[l].primaries!==this.spaces[c].primaries&&(a.applyMatrix3(this.spaces[l].toXYZ),a.applyMatrix3(this.spaces[c].fromXYZ)),this.spaces[c].transfer===Vt&&(a.r=_o(a.r),a.g=_o(a.g),a.b=_o(a.b))),a},workingToColorSpace:function(a,l){return this.convert(a,this.workingColorSpace,l)},colorSpaceToWorking:function(a,l){return this.convert(a,l,this.workingColorSpace)},getPrimaries:function(a){return this.spaces[a].primaries},getTransfer:function(a){return a===ws?od:this.spaces[a].transfer},getToneMappingMode:function(a){return this.spaces[a].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(a,l=this.workingColorSpace){return a.fromArray(this.spaces[l].luminanceCoefficients)},define:function(a){Object.assign(this.spaces,a)},_getMatrix:function(a,l,c){return a.copy(this.spaces[l].toXYZ).multiply(this.spaces[c].fromXYZ)},_getDrawingBufferColorSpace:function(a){return this.spaces[a].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(a=this.workingColorSpace){return this.spaces[a].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(a,l){return vo("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(a,l)},toWorkingColorSpace:function(a,l){return vo("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(a,l)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],r=[.3127,.329];return i.define({[ad]:{primaries:e,whitePoint:r,transfer:od,toXYZ:Jx,fromXYZ:ev,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Jn},outputColorSpaceConfig:{drawingBufferColorSpace:Jn}},[Jn]:{primaries:e,whitePoint:r,transfer:Vt,toXYZ:Jx,fromXYZ:ev,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Jn}}}),i}const At=ub();function Wr(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function _o(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Za;class db{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let r;if(e instanceof HTMLCanvasElement)r=e;else{Za===void 0&&(Za=$l("canvas")),Za.width=e.width,Za.height=e.height;const a=Za.getContext("2d");e instanceof ImageData?a.putImageData(e,0,0):a.drawImage(e,0,0,e.width,e.height),r=Za}return r.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=$l("canvas");t.width=e.width,t.height=e.height;const r=t.getContext("2d");r.drawImage(e,0,0,e.width,e.height);const a=r.getImageData(0,0,e.width,e.height),l=a.data;for(let c=0;c<l.length;c++)l[c]=Wr(l[c]/255)*255;return r.putImageData(a,0,0),t}else if(e.data){const t=e.data.slice(0);for(let r=0;r<t.length;r++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[r]=Math.floor(Wr(t[r]/255)*255):t[r]=Wr(t[r]);return{data:t,width:e.width,height:e.height}}else return lt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let hb=0;class Om{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:hb++}),this.uuid=tc(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const r={uuid:this.uuid,url:""},a=this.data;if(a!==null){let l;if(Array.isArray(a)){l=[];for(let c=0,d=a.length;c<d;c++)a[c].isDataTexture?l.push(xf(a[c].image)):l.push(xf(a[c]))}else l=xf(a);r.url=l}return t||(e.images[this.uuid]=r),r}}function xf(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?db.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(lt("Texture: Unable to serialize Texture."),{})}let fb=0;const vf=new ne;class Xn extends ks{constructor(e=Xn.DEFAULT_IMAGE,t=Xn.DEFAULT_MAPPING,r=Gr,a=Gr,l=Wn,c=da,d=Ki,h=Si,f=Xn.DEFAULT_ANISOTROPY,m=ws){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:fb++}),this.uuid=tc(),this.name="",this.source=new Om(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=r,this.wrapT=a,this.magFilter=l,this.minFilter=c,this.anisotropy=f,this.format=d,this.internalFormat=null,this.type=h,this.offset=new dt(0,0),this.repeat=new dt(1,1),this.center=new dt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new pt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=m,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(vf).x}get height(){return this.source.getSize(vf).y}get depth(){return this.source.getSize(vf).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const r=e[t];if(r===void 0){lt(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){lt(`Texture.setValues(): property '${t}' does not exist.`);continue}a&&r&&a.isVector2&&r.isVector2||a&&r&&a.isVector3&&r.isVector3||a&&r&&a.isMatrix3&&r.isMatrix3?a.copy(r):this[t]=r}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const r={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(r.userData=this.userData),t||(e.textures[this.uuid]=r),r}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==ay)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Mp:e.x=e.x-Math.floor(e.x);break;case Gr:e.x=e.x<0?0:1;break;case Ep:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Mp:e.y=e.y-Math.floor(e.y);break;case Gr:e.y=e.y<0?0:1;break;case Ep:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Xn.DEFAULT_IMAGE=null;Xn.DEFAULT_MAPPING=ay;Xn.DEFAULT_ANISOTROPY=1;const Wm=class Wm{constructor(e=0,t=0,r=0,a=1){this.x=e,this.y=t,this.z=r,this.w=a}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,r,a){return this.x=e,this.y=t,this.z=r,this.w=a,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,r=this.y,a=this.z,l=this.w,c=e.elements;return this.x=c[0]*t+c[4]*r+c[8]*a+c[12]*l,this.y=c[1]*t+c[5]*r+c[9]*a+c[13]*l,this.z=c[2]*t+c[6]*r+c[10]*a+c[14]*l,this.w=c[3]*t+c[7]*r+c[11]*a+c[15]*l,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,r,a,l;const h=e.elements,f=h[0],m=h[4],g=h[8],x=h[1],M=h[5],E=h[9],w=h[2],_=h[6],y=h[10];if(Math.abs(m-x)<.01&&Math.abs(g-w)<.01&&Math.abs(E-_)<.01){if(Math.abs(m+x)<.1&&Math.abs(g+w)<.1&&Math.abs(E+_)<.1&&Math.abs(f+M+y-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const P=(f+1)/2,T=(M+1)/2,U=(y+1)/2,N=(m+x)/4,O=(g+w)/4,b=(E+_)/4;return P>T&&P>U?P<.01?(r=0,a=.707106781,l=.707106781):(r=Math.sqrt(P),a=N/r,l=O/r):T>U?T<.01?(r=.707106781,a=0,l=.707106781):(a=Math.sqrt(T),r=N/a,l=b/a):U<.01?(r=.707106781,a=.707106781,l=0):(l=Math.sqrt(U),r=O/l,a=b/l),this.set(r,a,l,t),this}let L=Math.sqrt((_-E)*(_-E)+(g-w)*(g-w)+(x-m)*(x-m));return Math.abs(L)<.001&&(L=1),this.x=(_-E)/L,this.y=(g-w)/L,this.z=(x-m)/L,this.w=Math.acos((f+M+y-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=bt(this.x,e.x,t.x),this.y=bt(this.y,e.y,t.y),this.z=bt(this.z,e.z,t.z),this.w=bt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=bt(this.x,e,t),this.y=bt(this.y,e,t),this.z=bt(this.z,e,t),this.w=bt(this.w,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(bt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this.z=e.z+(t.z-e.z)*r,this.w=e.w+(t.w-e.w)*r,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};Wm.prototype.isVector4=!0;let un=Wm;class pb extends ks{constructor(e=1,t=1,r={}){super(),r=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Wn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},r),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=r.depth,this.scissor=new un(0,0,e,t),this.scissorTest=!1,this.viewport=new un(0,0,e,t),this.textures=[];const a={width:e,height:t,depth:r.depth},l=new Xn(a),c=r.count;for(let d=0;d<c;d++)this.textures[d]=l.clone(),this.textures[d].isRenderTargetTexture=!0,this.textures[d].renderTarget=this;this._setTextureOptions(r),this.depthBuffer=r.depthBuffer,this.stencilBuffer=r.stencilBuffer,this.resolveDepthBuffer=r.resolveDepthBuffer,this.resolveStencilBuffer=r.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=r.depthTexture,this.samples=r.samples,this.multiview=r.multiview,this.useArrayDepthTexture=r.useArrayDepthTexture}_setTextureOptions(e={}){const t={minFilter:Wn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let r=0;r<this.textures.length;r++)this.textures[r].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,r=1){if(this.width!==e||this.height!==t||this.depth!==r){this.width=e,this.height=t,this.depth=r;for(let a=0,l=this.textures.length;a<l;a++)this.textures[a].image.width=e,this.textures[a].image.height=t,this.textures[a].image.depth=r,this.textures[a].isData3DTexture!==!0&&(this.textures[a].isArrayTexture=this.textures[a].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,r=e.textures.length;t<r;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const a=Object.assign({},e.textures[t].image);this.textures[t].source=new Om(a)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class gr extends pb{constructor(e=1,t=1,r={}){super(e,t,r),this.isWebGLRenderTarget=!0}}class my extends Xn{constructor(e=null,t=1,r=1,a=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:r,depth:a},this.magFilter=Fn,this.minFilter=Fn,this.wrapR=Gr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class mb extends Xn{constructor(e=null,t=1,r=1,a=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:r,depth:a},this.magFilter=Fn,this.minFilter=Fn,this.wrapR=Gr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const dd=class dd{constructor(e,t,r,a,l,c,d,h,f,m,g,x,M,E,w,_){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,r,a,l,c,d,h,f,m,g,x,M,E,w,_)}set(e,t,r,a,l,c,d,h,f,m,g,x,M,E,w,_){const y=this.elements;return y[0]=e,y[4]=t,y[8]=r,y[12]=a,y[1]=l,y[5]=c,y[9]=d,y[13]=h,y[2]=f,y[6]=m,y[10]=g,y[14]=x,y[3]=M,y[7]=E,y[11]=w,y[15]=_,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new dd().fromArray(this.elements)}copy(e){const t=this.elements,r=e.elements;return t[0]=r[0],t[1]=r[1],t[2]=r[2],t[3]=r[3],t[4]=r[4],t[5]=r[5],t[6]=r[6],t[7]=r[7],t[8]=r[8],t[9]=r[9],t[10]=r[10],t[11]=r[11],t[12]=r[12],t[13]=r[13],t[14]=r[14],t[15]=r[15],this}copyPosition(e){const t=this.elements,r=e.elements;return t[12]=r[12],t[13]=r[13],t[14]=r[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,r){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),r.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),r.setFromMatrixColumn(this,2),this)}makeBasis(e,t,r){return this.set(e.x,t.x,r.x,0,e.y,t.y,r.y,0,e.z,t.z,r.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();const t=this.elements,r=e.elements,a=1/Ja.setFromMatrixColumn(e,0).length(),l=1/Ja.setFromMatrixColumn(e,1).length(),c=1/Ja.setFromMatrixColumn(e,2).length();return t[0]=r[0]*a,t[1]=r[1]*a,t[2]=r[2]*a,t[3]=0,t[4]=r[4]*l,t[5]=r[5]*l,t[6]=r[6]*l,t[7]=0,t[8]=r[8]*c,t[9]=r[9]*c,t[10]=r[10]*c,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,r=e.x,a=e.y,l=e.z,c=Math.cos(r),d=Math.sin(r),h=Math.cos(a),f=Math.sin(a),m=Math.cos(l),g=Math.sin(l);if(e.order==="XYZ"){const x=c*m,M=c*g,E=d*m,w=d*g;t[0]=h*m,t[4]=-h*g,t[8]=f,t[1]=M+E*f,t[5]=x-w*f,t[9]=-d*h,t[2]=w-x*f,t[6]=E+M*f,t[10]=c*h}else if(e.order==="YXZ"){const x=h*m,M=h*g,E=f*m,w=f*g;t[0]=x+w*d,t[4]=E*d-M,t[8]=c*f,t[1]=c*g,t[5]=c*m,t[9]=-d,t[2]=M*d-E,t[6]=w+x*d,t[10]=c*h}else if(e.order==="ZXY"){const x=h*m,M=h*g,E=f*m,w=f*g;t[0]=x-w*d,t[4]=-c*g,t[8]=E+M*d,t[1]=M+E*d,t[5]=c*m,t[9]=w-x*d,t[2]=-c*f,t[6]=d,t[10]=c*h}else if(e.order==="ZYX"){const x=c*m,M=c*g,E=d*m,w=d*g;t[0]=h*m,t[4]=E*f-M,t[8]=x*f+w,t[1]=h*g,t[5]=w*f+x,t[9]=M*f-E,t[2]=-f,t[6]=d*h,t[10]=c*h}else if(e.order==="YZX"){const x=c*h,M=c*f,E=d*h,w=d*f;t[0]=h*m,t[4]=w-x*g,t[8]=E*g+M,t[1]=g,t[5]=c*m,t[9]=-d*m,t[2]=-f*m,t[6]=M*g+E,t[10]=x-w*g}else if(e.order==="XZY"){const x=c*h,M=c*f,E=d*h,w=d*f;t[0]=h*m,t[4]=-g,t[8]=f*m,t[1]=x*g+w,t[5]=c*m,t[9]=M*g-E,t[2]=E*g-M,t[6]=d*m,t[10]=w*g+x}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(gb,e,xb)}lookAt(e,t,r){const a=this.elements;return xi.subVectors(e,t),xi.lengthSq()===0&&(xi.z=1),xi.normalize(),gs.crossVectors(r,xi),gs.lengthSq()===0&&(Math.abs(r.z)===1?xi.x+=1e-4:xi.z+=1e-4,xi.normalize(),gs.crossVectors(r,xi)),gs.normalize(),pu.crossVectors(xi,gs),a[0]=gs.x,a[4]=pu.x,a[8]=xi.x,a[1]=gs.y,a[5]=pu.y,a[9]=xi.y,a[2]=gs.z,a[6]=pu.z,a[10]=xi.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const r=e.elements,a=t.elements,l=this.elements,c=r[0],d=r[4],h=r[8],f=r[12],m=r[1],g=r[5],x=r[9],M=r[13],E=r[2],w=r[6],_=r[10],y=r[14],L=r[3],P=r[7],T=r[11],U=r[15],N=a[0],O=a[4],b=a[8],I=a[12],W=a[1],V=a[5],J=a[9],se=a[13],j=a[2],k=a[6],oe=a[10],te=a[14],K=a[3],he=a[7],de=a[11],z=a[15];return l[0]=c*N+d*W+h*j+f*K,l[4]=c*O+d*V+h*k+f*he,l[8]=c*b+d*J+h*oe+f*de,l[12]=c*I+d*se+h*te+f*z,l[1]=m*N+g*W+x*j+M*K,l[5]=m*O+g*V+x*k+M*he,l[9]=m*b+g*J+x*oe+M*de,l[13]=m*I+g*se+x*te+M*z,l[2]=E*N+w*W+_*j+y*K,l[6]=E*O+w*V+_*k+y*he,l[10]=E*b+w*J+_*oe+y*de,l[14]=E*I+w*se+_*te+y*z,l[3]=L*N+P*W+T*j+U*K,l[7]=L*O+P*V+T*k+U*he,l[11]=L*b+P*J+T*oe+U*de,l[15]=L*I+P*se+T*te+U*z,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],r=e[4],a=e[8],l=e[12],c=e[1],d=e[5],h=e[9],f=e[13],m=e[2],g=e[6],x=e[10],M=e[14],E=e[3],w=e[7],_=e[11],y=e[15],L=h*M-f*x,P=d*M-f*g,T=d*x-h*g,U=c*M-f*m,N=c*x-h*m,O=c*g-d*m;return t*(w*L-_*P+y*T)-r*(E*L-_*U+y*N)+a*(E*P-w*U+y*O)-l*(E*T-w*N+_*O)}determinantAffine(){const e=this.elements,t=e[0],r=e[4],a=e[8],l=e[1],c=e[5],d=e[9],h=e[2],f=e[6],m=e[10];return t*(c*m-d*f)-r*(l*m-d*h)+a*(l*f-c*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,r){const a=this.elements;return e.isVector3?(a[12]=e.x,a[13]=e.y,a[14]=e.z):(a[12]=e,a[13]=t,a[14]=r),this}invert(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],m=e[8],g=e[9],x=e[10],M=e[11],E=e[12],w=e[13],_=e[14],y=e[15],L=t*d-r*c,P=t*h-a*c,T=t*f-l*c,U=r*h-a*d,N=r*f-l*d,O=a*f-l*h,b=m*w-g*E,I=m*_-x*E,W=m*y-M*E,V=g*_-x*w,J=g*y-M*w,se=x*y-M*_,j=L*se-P*J+T*V+U*W-N*I+O*b;if(j===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const k=1/j;return e[0]=(d*se-h*J+f*V)*k,e[1]=(a*J-r*se-l*V)*k,e[2]=(w*O-_*N+y*U)*k,e[3]=(x*N-g*O-M*U)*k,e[4]=(h*W-c*se-f*I)*k,e[5]=(t*se-a*W+l*I)*k,e[6]=(_*T-E*O-y*P)*k,e[7]=(m*O-x*T+M*P)*k,e[8]=(c*J-d*W+f*b)*k,e[9]=(r*W-t*J-l*b)*k,e[10]=(E*N-w*T+y*L)*k,e[11]=(g*T-m*N-M*L)*k,e[12]=(d*I-c*V-h*b)*k,e[13]=(t*V-r*I+a*b)*k,e[14]=(w*P-E*U-_*L)*k,e[15]=(m*U-g*P+x*L)*k,this}scale(e){const t=this.elements,r=e.x,a=e.y,l=e.z;return t[0]*=r,t[4]*=a,t[8]*=l,t[1]*=r,t[5]*=a,t[9]*=l,t[2]*=r,t[6]*=a,t[10]*=l,t[3]*=r,t[7]*=a,t[11]*=l,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],r=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],a=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,r,a))}makeTranslation(e,t,r){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,r,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),r=Math.sin(e);return this.set(1,0,0,0,0,t,-r,0,0,r,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,0,r,0,0,1,0,0,-r,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,-r,0,0,r,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const r=Math.cos(t),a=Math.sin(t),l=1-r,c=e.x,d=e.y,h=e.z,f=l*c,m=l*d;return this.set(f*c+r,f*d-a*h,f*h+a*d,0,f*d+a*h,m*d+r,m*h-a*c,0,f*h-a*d,m*h+a*c,l*h*h+r,0,0,0,0,1),this}makeScale(e,t,r){return this.set(e,0,0,0,0,t,0,0,0,0,r,0,0,0,0,1),this}makeShear(e,t,r,a,l,c){return this.set(1,r,l,0,e,1,c,0,t,a,1,0,0,0,0,1),this}compose(e,t,r){const a=this.elements,l=t._x,c=t._y,d=t._z,h=t._w,f=l+l,m=c+c,g=d+d,x=l*f,M=l*m,E=l*g,w=c*m,_=c*g,y=d*g,L=h*f,P=h*m,T=h*g,U=r.x,N=r.y,O=r.z;return a[0]=(1-(w+y))*U,a[1]=(M+T)*U,a[2]=(E-P)*U,a[3]=0,a[4]=(M-T)*N,a[5]=(1-(x+y))*N,a[6]=(_+L)*N,a[7]=0,a[8]=(E+P)*O,a[9]=(_-L)*O,a[10]=(1-(x+w))*O,a[11]=0,a[12]=e.x,a[13]=e.y,a[14]=e.z,a[15]=1,this}decompose(e,t,r){const a=this.elements;e.x=a[12],e.y=a[13],e.z=a[14];const l=this.determinantAffine();if(l===0)return r.set(1,1,1),t.identity(),this;let c=Ja.set(a[0],a[1],a[2]).length();const d=Ja.set(a[4],a[5],a[6]).length(),h=Ja.set(a[8],a[9],a[10]).length();l<0&&(c=-c),ji.copy(this);const f=1/c,m=1/d,g=1/h;return ji.elements[0]*=f,ji.elements[1]*=f,ji.elements[2]*=f,ji.elements[4]*=m,ji.elements[5]*=m,ji.elements[6]*=m,ji.elements[8]*=g,ji.elements[9]*=g,ji.elements[10]*=g,t.setFromRotationMatrix(ji),r.x=c,r.y=d,r.z=h,this}makePerspective(e,t,r,a,l,c,d=pr,h=!1){const f=this.elements,m=2*l/(t-e),g=2*l/(r-a),x=(t+e)/(t-e),M=(r+a)/(r-a);let E,w;if(h)E=l/(c-l),w=c*l/(c-l);else if(d===pr)E=-(c+l)/(c-l),w=-2*c*l/(c-l);else if(d===Xl)E=-c/(c-l),w=-c*l/(c-l);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+d);return f[0]=m,f[4]=0,f[8]=x,f[12]=0,f[1]=0,f[5]=g,f[9]=M,f[13]=0,f[2]=0,f[6]=0,f[10]=E,f[14]=w,f[3]=0,f[7]=0,f[11]=-1,f[15]=0,this}makeOrthographic(e,t,r,a,l,c,d=pr,h=!1){const f=this.elements,m=2/(t-e),g=2/(r-a),x=-(t+e)/(t-e),M=-(r+a)/(r-a);let E,w;if(h)E=1/(c-l),w=c/(c-l);else if(d===pr)E=-2/(c-l),w=-(c+l)/(c-l);else if(d===Xl)E=-1/(c-l),w=-l/(c-l);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+d);return f[0]=m,f[4]=0,f[8]=0,f[12]=x,f[1]=0,f[5]=g,f[9]=0,f[13]=M,f[2]=0,f[6]=0,f[10]=E,f[14]=w,f[3]=0,f[7]=0,f[11]=0,f[15]=1,this}equals(e){const t=this.elements,r=e.elements;for(let a=0;a<16;a++)if(t[a]!==r[a])return!1;return!0}fromArray(e,t=0){for(let r=0;r<16;r++)this.elements[r]=e[r+t];return this}toArray(e=[],t=0){const r=this.elements;return e[t]=r[0],e[t+1]=r[1],e[t+2]=r[2],e[t+3]=r[3],e[t+4]=r[4],e[t+5]=r[5],e[t+6]=r[6],e[t+7]=r[7],e[t+8]=r[8],e[t+9]=r[9],e[t+10]=r[10],e[t+11]=r[11],e[t+12]=r[12],e[t+13]=r[13],e[t+14]=r[14],e[t+15]=r[15],e}};dd.prototype.isMatrix4=!0;let an=dd;const Ja=new ne,ji=new an,gb=new ne(0,0,0),xb=new ne(1,1,1),gs=new ne,pu=new ne,xi=new ne,tv=new an,nv=new Os;class Kr{constructor(e=0,t=0,r=0,a=Kr.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=r,this._order=a}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,r,a=this._order){return this._x=e,this._y=t,this._z=r,this._order=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,r=!0){const a=e.elements,l=a[0],c=a[4],d=a[8],h=a[1],f=a[5],m=a[9],g=a[2],x=a[6],M=a[10];switch(t){case"XYZ":this._y=Math.asin(bt(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(-m,M),this._z=Math.atan2(-c,l)):(this._x=Math.atan2(x,f),this._z=0);break;case"YXZ":this._x=Math.asin(-bt(m,-1,1)),Math.abs(m)<.9999999?(this._y=Math.atan2(d,M),this._z=Math.atan2(h,f)):(this._y=Math.atan2(-g,l),this._z=0);break;case"ZXY":this._x=Math.asin(bt(x,-1,1)),Math.abs(x)<.9999999?(this._y=Math.atan2(-g,M),this._z=Math.atan2(-c,f)):(this._y=0,this._z=Math.atan2(h,l));break;case"ZYX":this._y=Math.asin(-bt(g,-1,1)),Math.abs(g)<.9999999?(this._x=Math.atan2(x,M),this._z=Math.atan2(h,l)):(this._x=0,this._z=Math.atan2(-c,f));break;case"YZX":this._z=Math.asin(bt(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(-m,f),this._y=Math.atan2(-g,l)):(this._x=0,this._y=Math.atan2(d,M));break;case"XZY":this._z=Math.asin(-bt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(x,f),this._y=Math.atan2(d,l)):(this._x=Math.atan2(-m,M),this._y=0);break;default:lt("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,r===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,r){return tv.makeRotationFromQuaternion(e),this.setFromRotationMatrix(tv,t,r)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return nv.setFromEuler(this),this.setFromQuaternion(nv,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Kr.DEFAULT_ORDER="XYZ";class gy{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let vb=0;const iv=new ne,eo=new Os,Pr=new an,mu=new ne,Cl=new ne,_b=new ne,yb=new Os,rv=new ne(1,0,0),sv=new ne(0,1,0),av=new ne(0,0,1),ov={type:"added"},Sb={type:"removed"},to={type:"childadded",child:null},_f={type:"childremoved",child:null};class wn extends ks{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:vb++}),this.uuid=tc(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=wn.DEFAULT_UP.clone();const e=new ne,t=new Kr,r=new Os,a=new ne(1,1,1);function l(){r.setFromEuler(t,!1)}function c(){t.setFromQuaternion(r,void 0,!1)}t._onChange(l),r._onChange(c),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:a},modelViewMatrix:{value:new an},normalMatrix:{value:new pt}}),this.matrix=new an,this.matrixWorld=new an,this.matrixAutoUpdate=wn.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=wn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new gy,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return eo.setFromAxisAngle(e,t),this.quaternion.multiply(eo),this}rotateOnWorldAxis(e,t){return eo.setFromAxisAngle(e,t),this.quaternion.premultiply(eo),this}rotateX(e){return this.rotateOnAxis(rv,e)}rotateY(e){return this.rotateOnAxis(sv,e)}rotateZ(e){return this.rotateOnAxis(av,e)}translateOnAxis(e,t){return iv.copy(e).applyQuaternion(this.quaternion),this.position.add(iv.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(rv,e)}translateY(e){return this.translateOnAxis(sv,e)}translateZ(e){return this.translateOnAxis(av,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Pr.copy(this.matrixWorld).invert())}lookAt(e,t,r){e.isVector3?mu.copy(e):mu.set(e,t,r);const a=this.parent;this.updateWorldMatrix(!0,!1),Cl.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Pr.lookAt(Cl,mu,this.up):Pr.lookAt(mu,Cl,this.up),this.quaternion.setFromRotationMatrix(Pr),a&&(Pr.extractRotation(a.matrixWorld),eo.setFromRotationMatrix(Pr),this.quaternion.premultiply(eo.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Dt("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(ov),to.child=e,this.dispatchEvent(to),to.child=null):Dt("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let r=0;r<arguments.length;r++)this.remove(arguments[r]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Sb),_f.child=e,this.dispatchEvent(_f),_f.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Pr.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Pr.multiply(e.parent.matrixWorld)),e.applyMatrix4(Pr),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(ov),to.child=e,this.dispatchEvent(to),to.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let r=0,a=this.children.length;r<a;r++){const c=this.children[r].getObjectByProperty(e,t);if(c!==void 0)return c}}getObjectsByProperty(e,t,r=[]){this[e]===t&&r.push(this);const a=this.children;for(let l=0,c=a.length;l<c;l++)a[l].getObjectsByProperty(e,t,r);return r}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Cl,e,_b),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Cl,yb,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,r=e.y,a=e.z,l=this.matrix.elements;l[12]+=t-l[0]*t-l[4]*r-l[8]*a,l[13]+=r-l[1]*t-l[5]*r-l[9]*a,l[14]+=a-l[2]*t-l[6]*r-l[10]*a}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].updateMatrixWorld(e)}updateWorldMatrix(e,t,r=!1){const a=this.parent;if(e===!0&&a!==null&&a.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||r)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,r=!0),t===!0){const l=this.children;for(let c=0,d=l.length;c<d;c++)l[c].updateWorldMatrix(!1,!0,r)}}toJSON(e){const t=e===void 0||typeof e=="string",r={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},r.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const a={};a.uuid=this.uuid,a.type=this.type,this.name!==""&&(a.name=this.name),this.castShadow===!0&&(a.castShadow=!0),this.receiveShadow===!0&&(a.receiveShadow=!0),this.visible===!1&&(a.visible=!1),this.frustumCulled===!1&&(a.frustumCulled=!1),this.renderOrder!==0&&(a.renderOrder=this.renderOrder),this.static!==!1&&(a.static=this.static),Object.keys(this.userData).length>0&&(a.userData=this.userData),a.layers=this.layers.mask,a.matrix=this.matrix.toArray(),a.up=this.up.toArray(),this.pivot!==null&&(a.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(a.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(a.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(a.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(a.type="InstancedMesh",a.count=this.count,a.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(a.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(a.type="BatchedMesh",a.perObjectFrustumCulled=this.perObjectFrustumCulled,a.sortObjects=this.sortObjects,a.drawRanges=this._drawRanges,a.reservedRanges=this._reservedRanges,a.geometryInfo=this._geometryInfo.map(d=>({...d,boundingBox:d.boundingBox?d.boundingBox.toJSON():void 0,boundingSphere:d.boundingSphere?d.boundingSphere.toJSON():void 0})),a.instanceInfo=this._instanceInfo.map(d=>({...d})),a.availableInstanceIds=this._availableInstanceIds.slice(),a.availableGeometryIds=this._availableGeometryIds.slice(),a.nextIndexStart=this._nextIndexStart,a.nextVertexStart=this._nextVertexStart,a.geometryCount=this._geometryCount,a.maxInstanceCount=this._maxInstanceCount,a.maxVertexCount=this._maxVertexCount,a.maxIndexCount=this._maxIndexCount,a.geometryInitialized=this._geometryInitialized,a.matricesTexture=this._matricesTexture.toJSON(e),a.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(a.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(a.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(a.boundingBox=this.boundingBox.toJSON()));function l(d,h){return d[h.uuid]===void 0&&(d[h.uuid]=h.toJSON(e)),h.uuid}if(this.isScene)this.background&&(this.background.isColor?a.background=this.background.toJSON():this.background.isTexture&&(a.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(a.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){a.geometry=l(e.geometries,this.geometry);const d=this.geometry.parameters;if(d!==void 0&&d.shapes!==void 0){const h=d.shapes;if(Array.isArray(h))for(let f=0,m=h.length;f<m;f++){const g=h[f];l(e.shapes,g)}else l(e.shapes,h)}}if(this.isSkinnedMesh&&(a.bindMode=this.bindMode,a.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(l(e.skeletons,this.skeleton),a.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const d=[];for(let h=0,f=this.material.length;h<f;h++)d.push(l(e.materials,this.material[h]));a.material=d}else a.material=l(e.materials,this.material);if(this.children.length>0){a.children=[];for(let d=0;d<this.children.length;d++)a.children.push(this.children[d].toJSON(e).object)}if(this.animations.length>0){a.animations=[];for(let d=0;d<this.animations.length;d++){const h=this.animations[d];a.animations.push(l(e.animations,h))}}if(t){const d=c(e.geometries),h=c(e.materials),f=c(e.textures),m=c(e.images),g=c(e.shapes),x=c(e.skeletons),M=c(e.animations),E=c(e.nodes);d.length>0&&(r.geometries=d),h.length>0&&(r.materials=h),f.length>0&&(r.textures=f),m.length>0&&(r.images=m),g.length>0&&(r.shapes=g),x.length>0&&(r.skeletons=x),M.length>0&&(r.animations=M),E.length>0&&(r.nodes=E)}return r.object=a,r;function c(d){const h=[];for(const f in d){const m=d[f];delete m.metadata,h.push(m)}return h}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let r=0;r<e.children.length;r++){const a=e.children[r];this.add(a.clone())}return this}}wn.DEFAULT_UP=new ne(0,1,0);wn.DEFAULT_MATRIX_AUTO_UPDATE=!0;wn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class Fl extends wn{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Mb={type:"move"};class yf{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Fl,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Fl,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new ne,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new ne),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Fl,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new ne,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new ne,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const r of e.hand.values())this._getHandJoint(t,r)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,r){let a=null,l=null,c=null;const d=this._targetRay,h=this._grip,f=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(f&&e.hand){c=!0;for(const w of e.hand.values()){const _=t.getJointPose(w,r),y=this._getHandJoint(f,w);_!==null&&(y.matrix.fromArray(_.transform.matrix),y.matrix.decompose(y.position,y.rotation,y.scale),y.matrixWorldNeedsUpdate=!0,y.jointRadius=_.radius),y.visible=_!==null}const m=f.joints["index-finger-tip"],g=f.joints["thumb-tip"],x=m.position.distanceTo(g.position),M=.02,E=.005;f.inputState.pinching&&x>M+E?(f.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!f.inputState.pinching&&x<=M-E&&(f.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else h!==null&&e.gripSpace&&(l=t.getPose(e.gripSpace,r),l!==null&&(h.matrix.fromArray(l.transform.matrix),h.matrix.decompose(h.position,h.rotation,h.scale),h.matrixWorldNeedsUpdate=!0,l.linearVelocity?(h.hasLinearVelocity=!0,h.linearVelocity.copy(l.linearVelocity)):h.hasLinearVelocity=!1,l.angularVelocity?(h.hasAngularVelocity=!0,h.angularVelocity.copy(l.angularVelocity)):h.hasAngularVelocity=!1,h.eventsEnabled&&h.dispatchEvent({type:"gripUpdated",data:e,target:this})));d!==null&&(a=t.getPose(e.targetRaySpace,r),a===null&&l!==null&&(a=l),a!==null&&(d.matrix.fromArray(a.transform.matrix),d.matrix.decompose(d.position,d.rotation,d.scale),d.matrixWorldNeedsUpdate=!0,a.linearVelocity?(d.hasLinearVelocity=!0,d.linearVelocity.copy(a.linearVelocity)):d.hasLinearVelocity=!1,a.angularVelocity?(d.hasAngularVelocity=!0,d.angularVelocity.copy(a.angularVelocity)):d.hasAngularVelocity=!1,this.dispatchEvent(Mb)))}return d!==null&&(d.visible=a!==null),h!==null&&(h.visible=l!==null),f!==null&&(f.visible=c!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const r=new Fl;r.matrixAutoUpdate=!1,r.visible=!1,e.joints[t.jointName]=r,e.add(r)}return e.joints[t.jointName]}}const xy={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},xs={h:0,s:0,l:0},gu={h:0,s:0,l:0};function Sf(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class xt{constructor(e,t,r){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,r)}set(e,t,r){if(t===void 0&&r===void 0){const a=e;a&&a.isColor?this.copy(a):typeof a=="number"?this.setHex(a):typeof a=="string"&&this.setStyle(a)}else this.setRGB(e,t,r);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Jn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,At.colorSpaceToWorking(this,t),this}setRGB(e,t,r,a=At.workingColorSpace){return this.r=e,this.g=t,this.b=r,At.colorSpaceToWorking(this,a),this}setHSL(e,t,r,a=At.workingColorSpace){if(e=lb(e,1),t=bt(t,0,1),r=bt(r,0,1),t===0)this.r=this.g=this.b=r;else{const l=r<=.5?r*(1+t):r+t-r*t,c=2*r-l;this.r=Sf(c,l,e+1/3),this.g=Sf(c,l,e),this.b=Sf(c,l,e-1/3)}return At.colorSpaceToWorking(this,a),this}setStyle(e,t=Jn){function r(l){l!==void 0&&parseFloat(l)<1&&lt("Color: Alpha component of "+e+" will be ignored.")}let a;if(a=/^(\w+)\(([^\)]*)\)/.exec(e)){let l;const c=a[1],d=a[2];switch(c){case"rgb":case"rgba":if(l=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setRGB(Math.min(255,parseInt(l[1],10))/255,Math.min(255,parseInt(l[2],10))/255,Math.min(255,parseInt(l[3],10))/255,t);if(l=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setRGB(Math.min(100,parseInt(l[1],10))/100,Math.min(100,parseInt(l[2],10))/100,Math.min(100,parseInt(l[3],10))/100,t);break;case"hsl":case"hsla":if(l=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setHSL(parseFloat(l[1])/360,parseFloat(l[2])/100,parseFloat(l[3])/100,t);break;default:lt("Color: Unknown color model "+e)}}else if(a=/^\#([A-Fa-f\d]+)$/.exec(e)){const l=a[1],c=l.length;if(c===3)return this.setRGB(parseInt(l.charAt(0),16)/15,parseInt(l.charAt(1),16)/15,parseInt(l.charAt(2),16)/15,t);if(c===6)return this.setHex(parseInt(l,16),t);lt("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Jn){const r=xy[e.toLowerCase()];return r!==void 0?this.setHex(r,t):lt("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Wr(e.r),this.g=Wr(e.g),this.b=Wr(e.b),this}copyLinearToSRGB(e){return this.r=_o(e.r),this.g=_o(e.g),this.b=_o(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Jn){return At.workingToColorSpace(Gn.copy(this),e),Math.round(bt(Gn.r*255,0,255))*65536+Math.round(bt(Gn.g*255,0,255))*256+Math.round(bt(Gn.b*255,0,255))}getHexString(e=Jn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=At.workingColorSpace){At.workingToColorSpace(Gn.copy(this),t);const r=Gn.r,a=Gn.g,l=Gn.b,c=Math.max(r,a,l),d=Math.min(r,a,l);let h,f;const m=(d+c)/2;if(d===c)h=0,f=0;else{const g=c-d;switch(f=m<=.5?g/(c+d):g/(2-c-d),c){case r:h=(a-l)/g+(a<l?6:0);break;case a:h=(l-r)/g+2;break;case l:h=(r-a)/g+4;break}h/=6}return e.h=h,e.s=f,e.l=m,e}getRGB(e,t=At.workingColorSpace){return At.workingToColorSpace(Gn.copy(this),t),e.r=Gn.r,e.g=Gn.g,e.b=Gn.b,e}getStyle(e=Jn){At.workingToColorSpace(Gn.copy(this),e);const t=Gn.r,r=Gn.g,a=Gn.b;return e!==Jn?`color(${e} ${t.toFixed(3)} ${r.toFixed(3)} ${a.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(r*255)},${Math.round(a*255)})`}offsetHSL(e,t,r){return this.getHSL(xs),this.setHSL(xs.h+e,xs.s+t,xs.l+r)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,r){return this.r=e.r+(t.r-e.r)*r,this.g=e.g+(t.g-e.g)*r,this.b=e.b+(t.b-e.b)*r,this}lerpHSL(e,t){this.getHSL(xs),e.getHSL(gu);const r=pf(xs.h,gu.h,t),a=pf(xs.s,gu.s,t),l=pf(xs.l,gu.l,t);return this.setHSL(r,a,l),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,r=this.g,a=this.b,l=e.elements;return this.r=l[0]*t+l[3]*r+l[6]*a,this.g=l[1]*t+l[4]*r+l[7]*a,this.b=l[2]*t+l[5]*r+l[8]*a,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Gn=new xt;xt.NAMES=xy;class Eb extends wn{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Kr,this.environmentIntensity=1,this.environmentRotation=new Kr,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const Wi=new ne,Nr=new ne,Mf=new ne,Lr=new ne,no=new ne,io=new ne,lv=new ne,Ef=new ne,wf=new ne,bf=new ne,Tf=new un,Cf=new un,Rf=new un;class Yi{constructor(e=new ne,t=new ne,r=new ne){this.a=e,this.b=t,this.c=r}static getNormal(e,t,r,a){a.subVectors(r,t),Wi.subVectors(e,t),a.cross(Wi);const l=a.lengthSq();return l>0?a.multiplyScalar(1/Math.sqrt(l)):a.set(0,0,0)}static getBarycoord(e,t,r,a,l){Wi.subVectors(a,t),Nr.subVectors(r,t),Mf.subVectors(e,t);const c=Wi.dot(Wi),d=Wi.dot(Nr),h=Wi.dot(Mf),f=Nr.dot(Nr),m=Nr.dot(Mf),g=c*f-d*d;if(g===0)return l.set(0,0,0),null;const x=1/g,M=(f*h-d*m)*x,E=(c*m-d*h)*x;return l.set(1-M-E,E,M)}static containsPoint(e,t,r,a){return this.getBarycoord(e,t,r,a,Lr)===null?!1:Lr.x>=0&&Lr.y>=0&&Lr.x+Lr.y<=1}static getInterpolation(e,t,r,a,l,c,d,h){return this.getBarycoord(e,t,r,a,Lr)===null?(h.x=0,h.y=0,"z"in h&&(h.z=0),"w"in h&&(h.w=0),null):(h.setScalar(0),h.addScaledVector(l,Lr.x),h.addScaledVector(c,Lr.y),h.addScaledVector(d,Lr.z),h)}static getInterpolatedAttribute(e,t,r,a,l,c){return Tf.setScalar(0),Cf.setScalar(0),Rf.setScalar(0),Tf.fromBufferAttribute(e,t),Cf.fromBufferAttribute(e,r),Rf.fromBufferAttribute(e,a),c.setScalar(0),c.addScaledVector(Tf,l.x),c.addScaledVector(Cf,l.y),c.addScaledVector(Rf,l.z),c}static isFrontFacing(e,t,r,a){return Wi.subVectors(r,t),Nr.subVectors(e,t),Wi.cross(Nr).dot(a)<0}set(e,t,r){return this.a.copy(e),this.b.copy(t),this.c.copy(r),this}setFromPointsAndIndices(e,t,r,a){return this.a.copy(e[t]),this.b.copy(e[r]),this.c.copy(e[a]),this}setFromAttributeAndIndices(e,t,r,a){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,r),this.c.fromBufferAttribute(e,a),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Wi.subVectors(this.c,this.b),Nr.subVectors(this.a,this.b),Wi.cross(Nr).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Yi.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Yi.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,r,a,l){return Yi.getInterpolation(e,this.a,this.b,this.c,t,r,a,l)}containsPoint(e){return Yi.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Yi.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const r=this.a,a=this.b,l=this.c;let c,d;no.subVectors(a,r),io.subVectors(l,r),Ef.subVectors(e,r);const h=no.dot(Ef),f=io.dot(Ef);if(h<=0&&f<=0)return t.copy(r);wf.subVectors(e,a);const m=no.dot(wf),g=io.dot(wf);if(m>=0&&g<=m)return t.copy(a);const x=h*g-m*f;if(x<=0&&h>=0&&m<=0)return c=h/(h-m),t.copy(r).addScaledVector(no,c);bf.subVectors(e,l);const M=no.dot(bf),E=io.dot(bf);if(E>=0&&M<=E)return t.copy(l);const w=M*f-h*E;if(w<=0&&f>=0&&E<=0)return d=f/(f-E),t.copy(r).addScaledVector(io,d);const _=m*E-M*g;if(_<=0&&g-m>=0&&M-E>=0)return lv.subVectors(l,a),d=(g-m)/(g-m+(M-E)),t.copy(a).addScaledVector(lv,d);const y=1/(_+w+x);return c=w*y,d=x*y,t.copy(r).addScaledVector(no,c).addScaledVector(io,d)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class Ho{constructor(e=new ne(1/0,1/0,1/0),t=new ne(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,r=e.length;t<r;t+=3)this.expandByPoint(Xi.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,r=e.count;t<r;t++)this.expandByPoint(Xi.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,r=e.length;t<r;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const r=Xi.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(r),this.max.copy(e).add(r),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const r=e.geometry;if(r!==void 0){const l=r.getAttribute("position");if(t===!0&&l!==void 0&&e.isInstancedMesh!==!0)for(let c=0,d=l.count;c<d;c++)e.isMesh===!0?e.getVertexPosition(c,Xi):Xi.fromBufferAttribute(l,c),Xi.applyMatrix4(e.matrixWorld),this.expandByPoint(Xi);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),xu.copy(e.boundingBox)):(r.boundingBox===null&&r.computeBoundingBox(),xu.copy(r.boundingBox)),xu.applyMatrix4(e.matrixWorld),this.union(xu)}const a=e.children;for(let l=0,c=a.length;l<c;l++)this.expandByObject(a[l],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Xi),Xi.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,r;return e.normal.x>0?(t=e.normal.x*this.min.x,r=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,r=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,r+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,r+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,r+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,r+=e.normal.z*this.min.z),t<=-e.constant&&r>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Rl),vu.subVectors(this.max,Rl),ro.subVectors(e.a,Rl),so.subVectors(e.b,Rl),ao.subVectors(e.c,Rl),vs.subVectors(so,ro),_s.subVectors(ao,so),ia.subVectors(ro,ao);let t=[0,-vs.z,vs.y,0,-_s.z,_s.y,0,-ia.z,ia.y,vs.z,0,-vs.x,_s.z,0,-_s.x,ia.z,0,-ia.x,-vs.y,vs.x,0,-_s.y,_s.x,0,-ia.y,ia.x,0];return!Af(t,ro,so,ao,vu)||(t=[1,0,0,0,1,0,0,0,1],!Af(t,ro,so,ao,vu))?!1:(_u.crossVectors(vs,_s),t=[_u.x,_u.y,_u.z],Af(t,ro,so,ao,vu))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Xi).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Xi).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Dr[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Dr[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Dr[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Dr[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Dr[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Dr[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Dr[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Dr[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Dr),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Dr=[new ne,new ne,new ne,new ne,new ne,new ne,new ne,new ne],Xi=new ne,xu=new Ho,ro=new ne,so=new ne,ao=new ne,vs=new ne,_s=new ne,ia=new ne,Rl=new ne,vu=new ne,_u=new ne,ra=new ne;function Af(i,e,t,r,a){for(let l=0,c=i.length-3;l<=c;l+=3){ra.fromArray(i,l);const d=a.x*Math.abs(ra.x)+a.y*Math.abs(ra.y)+a.z*Math.abs(ra.z),h=e.dot(ra),f=t.dot(ra),m=r.dot(ra);if(Math.max(-Math.max(h,f,m),Math.min(h,f,m))>d)return!1}return!0}const vn=new ne,yu=new dt;let wb=0;class xr extends ks{constructor(e,t,r=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:wb++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=r,this.usage=qx,this.updateRanges=[],this.gpuType=fr,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,r){e*=this.itemSize,r*=t.itemSize;for(let a=0,l=this.itemSize;a<l;a++)this.array[e+a]=t.array[r+a];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,r=this.count;t<r;t++)yu.fromBufferAttribute(this,t),yu.applyMatrix3(e),this.setXY(t,yu.x,yu.y);else if(this.itemSize===3)for(let t=0,r=this.count;t<r;t++)vn.fromBufferAttribute(this,t),vn.applyMatrix3(e),this.setXYZ(t,vn.x,vn.y,vn.z);return this}applyMatrix4(e){for(let t=0,r=this.count;t<r;t++)vn.fromBufferAttribute(this,t),vn.applyMatrix4(e),this.setXYZ(t,vn.x,vn.y,vn.z);return this}applyNormalMatrix(e){for(let t=0,r=this.count;t<r;t++)vn.fromBufferAttribute(this,t),vn.applyNormalMatrix(e),this.setXYZ(t,vn.x,vn.y,vn.z);return this}transformDirection(e){for(let t=0,r=this.count;t<r;t++)vn.fromBufferAttribute(this,t),vn.transformDirection(e),this.setXYZ(t,vn.x,vn.y,vn.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let r=this.array[e*this.itemSize+t];return this.normalized&&(r=Tl(r,this.array)),r}setComponent(e,t,r){return this.normalized&&(r=li(r,this.array)),this.array[e*this.itemSize+t]=r,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Tl(t,this.array)),t}setX(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Tl(t,this.array)),t}setY(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Tl(t,this.array)),t}setZ(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Tl(t,this.array)),t}setW(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,r){return e*=this.itemSize,this.normalized&&(t=li(t,this.array),r=li(r,this.array)),this.array[e+0]=t,this.array[e+1]=r,this}setXYZ(e,t,r,a){return e*=this.itemSize,this.normalized&&(t=li(t,this.array),r=li(r,this.array),a=li(a,this.array)),this.array[e+0]=t,this.array[e+1]=r,this.array[e+2]=a,this}setXYZW(e,t,r,a,l){return e*=this.itemSize,this.normalized&&(t=li(t,this.array),r=li(r,this.array),a=li(a,this.array),l=li(l,this.array)),this.array[e+0]=t,this.array[e+1]=r,this.array[e+2]=a,this.array[e+3]=l,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==qx&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}}class vy extends xr{constructor(e,t,r){super(new Uint16Array(e),t,r)}}class _y extends xr{constructor(e,t,r){super(new Uint32Array(e),t,r)}}class Un extends xr{constructor(e,t,r){super(new Float32Array(e),t,r)}}const bb=new Ho,Al=new ne,Pf=new ne;class nc{constructor(e=new ne,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const r=this.center;t!==void 0?r.copy(t):bb.setFromPoints(e).getCenter(r);let a=0;for(let l=0,c=e.length;l<c;l++)a=Math.max(a,r.distanceToSquared(e[l]));return this.radius=Math.sqrt(a),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const r=this.center.distanceToSquared(e);return t.copy(e),r>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Al.subVectors(e,this.center);const t=Al.lengthSq();if(t>this.radius*this.radius){const r=Math.sqrt(t),a=(r-this.radius)*.5;this.center.addScaledVector(Al,a/r),this.radius+=a}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Pf.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Al.copy(e.center).add(Pf)),this.expandByPoint(Al.copy(e.center).sub(Pf))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let Tb=0;const Ni=new an,Nf=new wn,oo=new ne,vi=new Ho,Pl=new Ho,Pn=new ne;class Mi extends ks{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Tb++}),this.uuid=tc(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(rb(e)?_y:vy)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,r=0){this.groups.push({start:e,count:t,materialIndex:r})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const r=this.attributes.normal;if(r!==void 0){const l=new pt().getNormalMatrix(e);r.applyNormalMatrix(l),r.needsUpdate=!0}const a=this.attributes.tangent;return a!==void 0&&(a.transformDirection(e),a.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return Ni.makeRotationFromQuaternion(e),this.applyMatrix4(Ni),this}rotateX(e){return Ni.makeRotationX(e),this.applyMatrix4(Ni),this}rotateY(e){return Ni.makeRotationY(e),this.applyMatrix4(Ni),this}rotateZ(e){return Ni.makeRotationZ(e),this.applyMatrix4(Ni),this}translate(e,t,r){return Ni.makeTranslation(e,t,r),this.applyMatrix4(Ni),this}scale(e,t,r){return Ni.makeScale(e,t,r),this.applyMatrix4(Ni),this}lookAt(e){return Nf.lookAt(e),Nf.updateMatrix(),this.applyMatrix4(Nf.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(oo).negate(),this.translate(oo.x,oo.y,oo.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const r=[];for(let a=0,l=e.length;a<l;a++){const c=e[a];r.push(c.x,c.y,c.z||0)}this.setAttribute("position",new Un(r,3))}else{const r=Math.min(e.length,t.count);for(let a=0;a<r;a++){const l=e[a];t.setXYZ(a,l.x,l.y,l.z||0)}e.length>t.count&&lt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Ho);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Dt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new ne(-1/0,-1/0,-1/0),new ne(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){const l=t[r];vi.setFromBufferAttribute(l),this.morphTargetsRelative?(Pn.addVectors(this.boundingBox.min,vi.min),this.boundingBox.expandByPoint(Pn),Pn.addVectors(this.boundingBox.max,vi.max),this.boundingBox.expandByPoint(Pn)):(this.boundingBox.expandByPoint(vi.min),this.boundingBox.expandByPoint(vi.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Dt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new nc);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Dt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new ne,1/0);return}if(e){const r=this.boundingSphere.center;if(vi.setFromBufferAttribute(e),t)for(let l=0,c=t.length;l<c;l++){const d=t[l];Pl.setFromBufferAttribute(d),this.morphTargetsRelative?(Pn.addVectors(vi.min,Pl.min),vi.expandByPoint(Pn),Pn.addVectors(vi.max,Pl.max),vi.expandByPoint(Pn)):(vi.expandByPoint(Pl.min),vi.expandByPoint(Pl.max))}vi.getCenter(r);let a=0;for(let l=0,c=e.count;l<c;l++)Pn.fromBufferAttribute(e,l),a=Math.max(a,r.distanceToSquared(Pn));if(t)for(let l=0,c=t.length;l<c;l++){const d=t[l],h=this.morphTargetsRelative;for(let f=0,m=d.count;f<m;f++)Pn.fromBufferAttribute(d,f),h&&(oo.fromBufferAttribute(e,f),Pn.add(oo)),a=Math.max(a,r.distanceToSquared(Pn))}this.boundingSphere.radius=Math.sqrt(a),isNaN(this.boundingSphere.radius)&&Dt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Dt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const r=t.position,a=t.normal,l=t.uv;let c=this.getAttribute("tangent");(c===void 0||c.count!==r.count)&&(c=new xr(new Float32Array(4*r.count),4),this.setAttribute("tangent",c));const d=[],h=[];for(let b=0;b<r.count;b++)d[b]=new ne,h[b]=new ne;const f=new ne,m=new ne,g=new ne,x=new dt,M=new dt,E=new dt,w=new ne,_=new ne;function y(b,I,W){f.fromBufferAttribute(r,b),m.fromBufferAttribute(r,I),g.fromBufferAttribute(r,W),x.fromBufferAttribute(l,b),M.fromBufferAttribute(l,I),E.fromBufferAttribute(l,W),m.sub(f),g.sub(f),M.sub(x),E.sub(x);const V=1/(M.x*E.y-E.x*M.y);isFinite(V)&&(w.copy(m).multiplyScalar(E.y).addScaledVector(g,-M.y).multiplyScalar(V),_.copy(g).multiplyScalar(M.x).addScaledVector(m,-E.x).multiplyScalar(V),d[b].add(w),d[I].add(w),d[W].add(w),h[b].add(_),h[I].add(_),h[W].add(_))}let L=this.groups;L.length===0&&(L=[{start:0,count:e.count}]);for(let b=0,I=L.length;b<I;++b){const W=L[b],V=W.start,J=W.count;for(let se=V,j=V+J;se<j;se+=3)y(e.getX(se+0),e.getX(se+1),e.getX(se+2))}const P=new ne,T=new ne,U=new ne,N=new ne;function O(b){U.fromBufferAttribute(a,b),N.copy(U);const I=d[b];P.copy(I),P.sub(U.multiplyScalar(U.dot(I))).normalize(),T.crossVectors(N,I);const V=T.dot(h[b])<0?-1:1;c.setXYZW(b,P.x,P.y,P.z,V)}for(let b=0,I=L.length;b<I;++b){const W=L[b],V=W.start,J=W.count;for(let se=V,j=V+J;se<j;se+=3)O(e.getX(se+0)),O(e.getX(se+1)),O(e.getX(se+2))}this._transformed=!0}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let r=this.getAttribute("normal");if(r===void 0||r.count!==t.count)r=new xr(new Float32Array(t.count*3),3),this.setAttribute("normal",r);else for(let x=0,M=r.count;x<M;x++)r.setXYZ(x,0,0,0);const a=new ne,l=new ne,c=new ne,d=new ne,h=new ne,f=new ne,m=new ne,g=new ne;if(e)for(let x=0,M=e.count;x<M;x+=3){const E=e.getX(x+0),w=e.getX(x+1),_=e.getX(x+2);a.fromBufferAttribute(t,E),l.fromBufferAttribute(t,w),c.fromBufferAttribute(t,_),m.subVectors(c,l),g.subVectors(a,l),m.cross(g),d.fromBufferAttribute(r,E),h.fromBufferAttribute(r,w),f.fromBufferAttribute(r,_),d.add(m),h.add(m),f.add(m),r.setXYZ(E,d.x,d.y,d.z),r.setXYZ(w,h.x,h.y,h.z),r.setXYZ(_,f.x,f.y,f.z)}else for(let x=0,M=t.count;x<M;x+=3)a.fromBufferAttribute(t,x+0),l.fromBufferAttribute(t,x+1),c.fromBufferAttribute(t,x+2),m.subVectors(c,l),g.subVectors(a,l),m.cross(g),r.setXYZ(x+0,m.x,m.y,m.z),r.setXYZ(x+1,m.x,m.y,m.z),r.setXYZ(x+2,m.x,m.y,m.z);this.normalizeNormals(),r.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,r=e.count;t<r;t++)Pn.fromBufferAttribute(e,t),Pn.normalize(),e.setXYZ(t,Pn.x,Pn.y,Pn.z)}toNonIndexed(){function e(d,h){const f=d.array,m=d.itemSize,g=d.normalized,x=new f.constructor(h.length*m);let M=0,E=0;for(let w=0,_=h.length;w<_;w++){d.isInterleavedBufferAttribute?M=h[w]*d.data.stride+d.offset:M=h[w]*m;for(let y=0;y<m;y++)x[E++]=f[M++]}return new xr(x,m,g)}if(this.index===null)return lt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Mi,r=this.index.array,a=this.attributes;for(const d in a){const h=a[d],f=e(h,r);t.setAttribute(d,f)}const l=this.morphAttributes;for(const d in l){const h=[],f=l[d];for(let m=0,g=f.length;m<g;m++){const x=f[m],M=e(x,r);h.push(M)}t.morphAttributes[d]=h}t.morphTargetsRelative=this.morphTargetsRelative;const c=this.groups;for(let d=0,h=c.length;d<h;d++){const f=c[d];t.addGroup(f.start,f.count,f.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const h=this.parameters;for(const f in h)h[f]!==void 0&&(e[f]=h[f]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const r=this.attributes;for(const h in r){const f=r[h];e.data.attributes[h]=f.toJSON(e.data)}const a={};let l=!1;for(const h in this.morphAttributes){const f=this.morphAttributes[h],m=[];for(let g=0,x=f.length;g<x;g++){const M=f[g];m.push(M.toJSON(e.data))}m.length>0&&(a[h]=m,l=!0)}l&&(e.data.morphAttributes=a,e.data.morphTargetsRelative=this.morphTargetsRelative);const c=this.groups;c.length>0&&(e.data.groups=JSON.parse(JSON.stringify(c)));const d=this.boundingSphere;return d!==null&&(e.data.boundingSphere=d.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const r=e.index;r!==null&&this.setIndex(r.clone());const a=e.attributes;for(const f in a){const m=a[f];this.setAttribute(f,m.clone(t))}const l=e.morphAttributes;for(const f in l){const m=[],g=l[f];for(let x=0,M=g.length;x<M;x++)m.push(g[x].clone(t));this.morphAttributes[f]=m}this.morphTargetsRelative=e.morphTargetsRelative;const c=e.groups;for(let f=0,m=c.length;f<m;f++){const g=c[f];this.addGroup(g.start,g.count,g.materialIndex)}const d=e.boundingBox;d!==null&&(this.boundingBox=d.clone());const h=e.boundingSphere;return h!==null&&(this.boundingSphere=h.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}let Cb=0;class _r extends ks{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Cb++}),this.uuid=tc(),this.name="",this.type="Material",this.blending=xo,this.side=Fs,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=fp,this.blendDst=pp,this.blendEquation=la,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new xt(0,0,0),this.blendAlpha=0,this.depthFunc=Do,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=$x,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Qa,this.stencilZFail=Qa,this.stencilZPass=Qa,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const r=e[t];if(r===void 0){lt(`Material: parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){lt(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}a&&a.isColor?a.set(r):a&&a.isVector2&&r&&r.isVector2||a&&a.isEuler&&r&&r.isEuler||a&&a.isVector3&&r&&r.isVector3?a.copy(r):this[t]=r}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const r={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.color&&this.color.isColor&&(r.color=this.color.getHex()),this.roughness!==void 0&&(r.roughness=this.roughness),this.metalness!==void 0&&(r.metalness=this.metalness),this.sheen!==void 0&&(r.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(r.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(r.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(r.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(r.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(r.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(r.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(r.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(r.shininess=this.shininess),this.clearcoat!==void 0&&(r.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(r.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(r.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(r.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(r.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,r.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(r.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(r.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(r.dispersion=this.dispersion),this.iridescence!==void 0&&(r.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(r.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(r.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(r.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(r.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(r.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(r.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(r.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(r.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(r.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(r.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(r.lightMap=this.lightMap.toJSON(e).uuid,r.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(r.aoMap=this.aoMap.toJSON(e).uuid,r.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(r.bumpMap=this.bumpMap.toJSON(e).uuid,r.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(r.normalMap=this.normalMap.toJSON(e).uuid,r.normalMapType=this.normalMapType,r.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(r.displacementMap=this.displacementMap.toJSON(e).uuid,r.displacementScale=this.displacementScale,r.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(r.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(r.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(r.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(r.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(r.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(r.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(r.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(r.combine=this.combine)),this.envMapRotation!==void 0&&(r.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(r.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(r.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(r.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(r.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(r.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(r.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(r.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(r.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(r.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(r.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(r.size=this.size),this.shadowSide!==null&&(r.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(r.sizeAttenuation=this.sizeAttenuation),this.blending!==xo&&(r.blending=this.blending),this.side!==Fs&&(r.side=this.side),this.vertexColors===!0&&(r.vertexColors=!0),this.opacity<1&&(r.opacity=this.opacity),this.transparent===!0&&(r.transparent=!0),this.blendSrc!==fp&&(r.blendSrc=this.blendSrc),this.blendDst!==pp&&(r.blendDst=this.blendDst),this.blendEquation!==la&&(r.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(r.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(r.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(r.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(r.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(r.blendAlpha=this.blendAlpha),this.depthFunc!==Do&&(r.depthFunc=this.depthFunc),this.depthTest===!1&&(r.depthTest=this.depthTest),this.depthWrite===!1&&(r.depthWrite=this.depthWrite),this.colorWrite===!1&&(r.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(r.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==$x&&(r.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(r.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(r.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Qa&&(r.stencilFail=this.stencilFail),this.stencilZFail!==Qa&&(r.stencilZFail=this.stencilZFail),this.stencilZPass!==Qa&&(r.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(r.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(r.rotation=this.rotation),this.polygonOffset===!0&&(r.polygonOffset=!0),this.polygonOffsetFactor!==0&&(r.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(r.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(r.linewidth=this.linewidth),this.dashSize!==void 0&&(r.dashSize=this.dashSize),this.gapSize!==void 0&&(r.gapSize=this.gapSize),this.scale!==void 0&&(r.scale=this.scale),this.dithering===!0&&(r.dithering=!0),this.alphaTest>0&&(r.alphaTest=this.alphaTest),this.alphaHash===!0&&(r.alphaHash=!0),this.alphaToCoverage===!0&&(r.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(r.premultipliedAlpha=!0),this.forceSinglePass===!0&&(r.forceSinglePass=!0),this.allowOverride===!1&&(r.allowOverride=!1),this.wireframe===!0&&(r.wireframe=!0),this.wireframeLinewidth>1&&(r.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(r.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(r.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(r.flatShading=!0),this.visible===!1&&(r.visible=!1),this.toneMapped===!1&&(r.toneMapped=!1),this.fog===!1&&(r.fog=!1),Object.keys(this.userData).length>0&&(r.userData=this.userData);function a(l){const c=[];for(const d in l){const h=l[d];delete h.metadata,c.push(h)}return c}if(t){const l=a(e.textures),c=a(e.images);l.length>0&&(r.textures=l),c.length>0&&(r.images=c)}return r}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new xt().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let r=e.normalScale;Array.isArray(r)===!1&&(r=[r,r]),this.normalScale=new dt().fromArray(r)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new dt().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let r=null;if(t!==null){const a=t.length;r=new Array(a);for(let l=0;l!==a;++l)r[l]=t[l].clone()}return this.clippingPlanes=r,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}const Ir=new ne,Lf=new ne,Su=new ne,ys=new ne,Df=new ne,Mu=new ne,If=new ne;class xd{constructor(e=new ne,t=new ne(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Ir)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const r=t.dot(this.direction);return r<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,r)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Ir.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Ir.copy(this.origin).addScaledVector(this.direction,t),Ir.distanceToSquared(e))}distanceSqToSegment(e,t,r,a){Lf.copy(e).add(t).multiplyScalar(.5),Su.copy(t).sub(e).normalize(),ys.copy(this.origin).sub(Lf);const l=e.distanceTo(t)*.5,c=-this.direction.dot(Su),d=ys.dot(this.direction),h=-ys.dot(Su),f=ys.lengthSq(),m=Math.abs(1-c*c);let g,x,M,E;if(m>0)if(g=c*h-d,x=c*d-h,E=l*m,g>=0)if(x>=-E)if(x<=E){const w=1/m;g*=w,x*=w,M=g*(g+c*x+2*d)+x*(c*g+x+2*h)+f}else x=l,g=Math.max(0,-(c*x+d)),M=-g*g+x*(x+2*h)+f;else x=-l,g=Math.max(0,-(c*x+d)),M=-g*g+x*(x+2*h)+f;else x<=-E?(g=Math.max(0,-(-c*l+d)),x=g>0?-l:Math.min(Math.max(-l,-h),l),M=-g*g+x*(x+2*h)+f):x<=E?(g=0,x=Math.min(Math.max(-l,-h),l),M=x*(x+2*h)+f):(g=Math.max(0,-(c*l+d)),x=g>0?l:Math.min(Math.max(-l,-h),l),M=-g*g+x*(x+2*h)+f);else x=c>0?-l:l,g=Math.max(0,-(c*x+d)),M=-g*g+x*(x+2*h)+f;return r&&r.copy(this.origin).addScaledVector(this.direction,g),a&&a.copy(Lf).addScaledVector(Su,x),M}intersectSphere(e,t){Ir.subVectors(e.center,this.origin);const r=Ir.dot(this.direction),a=Ir.dot(Ir)-r*r,l=e.radius*e.radius;if(a>l)return null;const c=Math.sqrt(l-a),d=r-c,h=r+c;return h<0?null:d<0?this.at(h,t):this.at(d,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const r=-(this.origin.dot(e.normal)+e.constant)/t;return r>=0?r:null}intersectPlane(e,t){const r=this.distanceToPlane(e);return r===null?null:this.at(r,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let r,a,l,c,d,h;const f=1/this.direction.x,m=1/this.direction.y,g=1/this.direction.z,x=this.origin;return f>=0?(r=(e.min.x-x.x)*f,a=(e.max.x-x.x)*f):(r=(e.max.x-x.x)*f,a=(e.min.x-x.x)*f),m>=0?(l=(e.min.y-x.y)*m,c=(e.max.y-x.y)*m):(l=(e.max.y-x.y)*m,c=(e.min.y-x.y)*m),r>c||l>a||((l>r||isNaN(r))&&(r=l),(c<a||isNaN(a))&&(a=c),g>=0?(d=(e.min.z-x.z)*g,h=(e.max.z-x.z)*g):(d=(e.max.z-x.z)*g,h=(e.min.z-x.z)*g),r>h||d>a)||((d>r||r!==r)&&(r=d),(h<a||a!==a)&&(a=h),a<0)?null:this.at(r>=0?r:a,t)}intersectsBox(e){return this.intersectBox(e,Ir)!==null}intersectTriangle(e,t,r,a,l){Df.subVectors(t,e),Mu.subVectors(r,e),If.crossVectors(Df,Mu);let c=this.direction.dot(If),d;if(c>0){if(a)return null;d=1}else if(c<0)d=-1,c=-c;else return null;ys.subVectors(this.origin,e);const h=d*this.direction.dot(Mu.crossVectors(ys,Mu));if(h<0)return null;const f=d*this.direction.dot(Df.cross(ys));if(f<0||h+f>c)return null;const m=-d*ys.dot(If);return m<0?null:this.at(m/c,l)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class yy extends _r{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new xt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Kr,this.combine=Cm,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const cv=new an,sa=new xd,Eu=new nc,uv=new ne,wu=new ne,bu=new ne,Tu=new ne,Uf=new ne,Cu=new ne,dv=new ne,Ru=new ne;class Zi extends wn{constructor(e=new Mi,t=new yy){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}getVertexPosition(e,t){const r=this.geometry,a=r.attributes.position,l=r.morphAttributes.position,c=r.morphTargetsRelative;t.fromBufferAttribute(a,e);const d=this.morphTargetInfluences;if(l&&d){Cu.set(0,0,0);for(let h=0,f=l.length;h<f;h++){const m=d[h],g=l[h];m!==0&&(Uf.fromBufferAttribute(g,e),c?Cu.addScaledVector(Uf,m):Cu.addScaledVector(Uf.sub(t),m))}t.add(Cu)}return t}raycast(e,t){const r=this.geometry,a=this.material,l=this.matrixWorld;a!==void 0&&(r.boundingSphere===null&&r.computeBoundingSphere(),Eu.copy(r.boundingSphere),Eu.applyMatrix4(l),sa.copy(e.ray).recast(e.near),!(Eu.containsPoint(sa.origin)===!1&&(sa.intersectSphere(Eu,uv)===null||sa.origin.distanceToSquared(uv)>(e.far-e.near)**2))&&(cv.copy(l).invert(),sa.copy(e.ray).applyMatrix4(cv),!(r.boundingBox!==null&&sa.intersectsBox(r.boundingBox)===!1)&&this._computeIntersections(e,t,sa)))}_computeIntersections(e,t,r){let a;const l=this.geometry,c=this.material,d=l.index,h=l.attributes.position,f=l.attributes.uv,m=l.attributes.uv1,g=l.attributes.normal,x=l.groups,M=l.drawRange;if(d!==null)if(Array.isArray(c))for(let E=0,w=x.length;E<w;E++){const _=x[E],y=c[_.materialIndex],L=Math.max(_.start,M.start),P=Math.min(d.count,Math.min(_.start+_.count,M.start+M.count));for(let T=L,U=P;T<U;T+=3){const N=d.getX(T),O=d.getX(T+1),b=d.getX(T+2);a=Au(this,y,e,r,f,m,g,N,O,b),a&&(a.faceIndex=Math.floor(T/3),a.face.materialIndex=_.materialIndex,t.push(a))}}else{const E=Math.max(0,M.start),w=Math.min(d.count,M.start+M.count);for(let _=E,y=w;_<y;_+=3){const L=d.getX(_),P=d.getX(_+1),T=d.getX(_+2);a=Au(this,c,e,r,f,m,g,L,P,T),a&&(a.faceIndex=Math.floor(_/3),t.push(a))}}else if(h!==void 0)if(Array.isArray(c))for(let E=0,w=x.length;E<w;E++){const _=x[E],y=c[_.materialIndex],L=Math.max(_.start,M.start),P=Math.min(h.count,Math.min(_.start+_.count,M.start+M.count));for(let T=L,U=P;T<U;T+=3){const N=T,O=T+1,b=T+2;a=Au(this,y,e,r,f,m,g,N,O,b),a&&(a.faceIndex=Math.floor(T/3),a.face.materialIndex=_.materialIndex,t.push(a))}}else{const E=Math.max(0,M.start),w=Math.min(h.count,M.start+M.count);for(let _=E,y=w;_<y;_+=3){const L=_,P=_+1,T=_+2;a=Au(this,c,e,r,f,m,g,L,P,T),a&&(a.faceIndex=Math.floor(_/3),t.push(a))}}}}function Rb(i,e,t,r,a,l,c,d){let h;if(e.side===hi?h=r.intersectTriangle(c,l,a,!0,d):h=r.intersectTriangle(a,l,c,e.side===Fs,d),h===null)return null;Ru.copy(d),Ru.applyMatrix4(i.matrixWorld);const f=t.ray.origin.distanceTo(Ru);return f<t.near||f>t.far?null:{distance:f,point:Ru.clone(),object:i}}function Au(i,e,t,r,a,l,c,d,h,f){i.getVertexPosition(d,wu),i.getVertexPosition(h,bu),i.getVertexPosition(f,Tu);const m=Rb(i,e,t,r,wu,bu,Tu,dv);if(m){const g=new ne;Yi.getBarycoord(dv,wu,bu,Tu,g),a&&(m.uv=Yi.getInterpolatedAttribute(a,d,h,f,g,new dt)),l&&(m.uv1=Yi.getInterpolatedAttribute(l,d,h,f,g,new dt)),c&&(m.normal=Yi.getInterpolatedAttribute(c,d,h,f,g,new ne),m.normal.dot(r.direction)>0&&m.normal.multiplyScalar(-1));const x={a:d,b:h,c:f,normal:new ne,materialIndex:0};Yi.getNormal(wu,bu,Tu,x.normal),m.face=x,m.barycoord=g}return m}class Ab extends Xn{constructor(e=null,t=1,r=1,a,l,c,d,h,f=Fn,m=Fn,g,x){super(null,c,d,h,f,m,a,l,g,x),this.isDataTexture=!0,this.image={data:e,width:t,height:r},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Ff=new ne,Pb=new ne,Nb=new pt;class Es{constructor(e=new ne(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,r,a){return this.normal.set(e,t,r),this.constant=a,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,r){const a=Ff.subVectors(r,t).cross(Pb.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(a,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,r=!0){const a=e.delta(Ff),l=this.normal.dot(a);if(l===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const c=-(e.start.dot(this.normal)+this.constant)/l;return r===!0&&(c<0||c>1)?null:t.copy(e.start).addScaledVector(a,c)}intersectsLine(e){const t=this.distanceToPoint(e.start),r=this.distanceToPoint(e.end);return t<0&&r>0||r<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const r=t||Nb.getNormalMatrix(e),a=this.coplanarPoint(Ff).applyMatrix4(e),l=this.normal.applyMatrix3(r).normalize();return this.constant=-a.dot(l),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const aa=new nc,Lb=new dt(.5,.5),Pu=new ne;class km{constructor(e=new Es,t=new Es,r=new Es,a=new Es,l=new Es,c=new Es){this.planes=[e,t,r,a,l,c]}set(e,t,r,a,l,c){const d=this.planes;return d[0].copy(e),d[1].copy(t),d[2].copy(r),d[3].copy(a),d[4].copy(l),d[5].copy(c),this}copy(e){const t=this.planes;for(let r=0;r<6;r++)t[r].copy(e.planes[r]);return this}setFromProjectionMatrix(e,t=pr,r=!1){const a=this.planes,l=e.elements,c=l[0],d=l[1],h=l[2],f=l[3],m=l[4],g=l[5],x=l[6],M=l[7],E=l[8],w=l[9],_=l[10],y=l[11],L=l[12],P=l[13],T=l[14],U=l[15];if(a[0].setComponents(f-c,M-m,y-E,U-L).normalize(),a[1].setComponents(f+c,M+m,y+E,U+L).normalize(),a[2].setComponents(f+d,M+g,y+w,U+P).normalize(),a[3].setComponents(f-d,M-g,y-w,U-P).normalize(),r)a[4].setComponents(h,x,_,T).normalize(),a[5].setComponents(f-h,M-x,y-_,U-T).normalize();else if(a[4].setComponents(f-h,M-x,y-_,U-T).normalize(),t===pr)a[5].setComponents(f+h,M+x,y+_,U+T).normalize();else if(t===Xl)a[5].setComponents(h,x,_,T).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),aa.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),aa.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(aa)}intersectsSprite(e){aa.center.set(0,0,0);const t=Lb.distanceTo(e.center);return aa.radius=.7071067811865476+t,aa.applyMatrix4(e.matrixWorld),this.intersectsSphere(aa)}intersectsSphere(e){const t=this.planes,r=e.center,a=-e.radius;for(let l=0;l<6;l++)if(t[l].distanceToPoint(r)<a)return!1;return!0}intersectsBox(e){const t=this.planes;for(let r=0;r<6;r++){const a=t[r];if(Pu.x=a.normal.x>0?e.max.x:e.min.x,Pu.y=a.normal.y>0?e.max.y:e.min.y,Pu.z=a.normal.z>0?e.max.z:e.min.z,a.distanceToPoint(Pu)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let r=0;r<6;r++)if(t[r].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Qu extends _r{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new xt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const ld=new ne,cd=new ne,hv=new an,Nl=new xd,Nu=new nc,Of=new ne,fv=new ne;class Db extends wn{constructor(e=new Mi,t=new Qu){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,r=[0];for(let a=1,l=t.count;a<l;a++)ld.fromBufferAttribute(t,a-1),cd.fromBufferAttribute(t,a),r[a]=r[a-1],r[a]+=ld.distanceTo(cd);e.setAttribute("lineDistance",new Un(r,1))}else lt("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const r=this.geometry,a=this.matrixWorld,l=e.params.Line.threshold,c=r.drawRange;if(r.boundingSphere===null&&r.computeBoundingSphere(),Nu.copy(r.boundingSphere),Nu.applyMatrix4(a),Nu.radius+=l,e.ray.intersectsSphere(Nu)===!1)return;hv.copy(a).invert(),Nl.copy(e.ray).applyMatrix4(hv);const d=l/((this.scale.x+this.scale.y+this.scale.z)/3),h=d*d,f=this.isLineSegments?2:1,m=r.index,x=r.attributes.position;if(m!==null){const M=Math.max(0,c.start),E=Math.min(m.count,c.start+c.count);for(let w=M,_=E-1;w<_;w+=f){const y=m.getX(w),L=m.getX(w+1),P=Lu(this,e,Nl,h,y,L,w);P&&t.push(P)}if(this.isLineLoop){const w=m.getX(E-1),_=m.getX(M),y=Lu(this,e,Nl,h,w,_,E-1);y&&t.push(y)}}else{const M=Math.max(0,c.start),E=Math.min(x.count,c.start+c.count);for(let w=M,_=E-1;w<_;w+=f){const y=Lu(this,e,Nl,h,w,w+1,w);y&&t.push(y)}if(this.isLineLoop){const w=Lu(this,e,Nl,h,E-1,M,E-1);w&&t.push(w)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}}function Lu(i,e,t,r,a,l,c){const d=i.geometry.attributes.position;if(ld.fromBufferAttribute(d,a),cd.fromBufferAttribute(d,l),t.distanceSqToSegment(ld,cd,Of,fv)>r)return;Of.applyMatrix4(i.matrixWorld);const f=e.ray.origin.distanceTo(Of);if(!(f<e.near||f>e.far))return{distance:f,point:fv.clone().applyMatrix4(i.matrixWorld),index:c,face:null,faceIndex:null,barycoord:null,object:i}}const pv=new ne,mv=new ne;class gv extends Db{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,r=[];for(let a=0,l=t.count;a<l;a+=2)pv.fromBufferAttribute(t,a),mv.fromBufferAttribute(t,a+1),r[a]=a===0?0:r[a-1],r[a+1]=r[a]+pv.distanceTo(mv);e.setAttribute("lineDistance",new Un(r,1))}else lt("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class Ol extends _r{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new xt(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const xv=new an,tm=new xd,Du=new nc,Iu=new ne;class kf extends wn{constructor(e=new Mi,t=new Ol){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const r=this.geometry,a=this.matrixWorld,l=e.params.Points.threshold,c=r.drawRange;if(r.boundingSphere===null&&r.computeBoundingSphere(),Du.copy(r.boundingSphere),Du.applyMatrix4(a),Du.radius+=l,e.ray.intersectsSphere(Du)===!1)return;xv.copy(a).invert(),tm.copy(e.ray).applyMatrix4(xv);const d=l/((this.scale.x+this.scale.y+this.scale.z)/3),h=d*d,f=r.index,g=r.attributes.position;if(f!==null){const x=Math.max(0,c.start),M=Math.min(f.count,c.start+c.count);for(let E=x,w=M;E<w;E++){const _=f.getX(E);Iu.fromBufferAttribute(g,_),vv(Iu,_,h,a,e,t,this)}}else{const x=Math.max(0,c.start),M=Math.min(g.count,c.start+c.count);for(let E=x,w=M;E<w;E++)Iu.fromBufferAttribute(g,E),vv(Iu,E,h,a,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}}function vv(i,e,t,r,a,l,c){const d=tm.distanceSqToPoint(i);if(d<t){const h=new ne;tm.closestPointToPoint(i,h),h.applyMatrix4(r);const f=a.ray.origin.distanceTo(h);if(f<a.near||f>a.far)return;l.push({distance:f,distanceToRay:Math.sqrt(d),point:h,index:e,face:null,faceIndex:null,barycoord:null,object:c})}}class Sy extends Xn{constructor(e=[],t=ba,r,a,l,c,d,h,f,m){super(e,t,r,a,l,c,d,h,f,m),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Uo extends Xn{constructor(e,t,r=vr,a,l,c,d=Fn,h=Fn,f,m=Yr,g=1){if(m!==Yr&&m!==ha)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const x={width:e,height:t,depth:g};super(x,a,l,c,d,h,m,r,f),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Om(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class Ib extends Uo{constructor(e,t=vr,r=ba,a,l,c=Fn,d=Fn,h,f=Yr){const m={width:e,height:e,depth:1},g=[m,m,m,m,m,m];super(e,e,t,r,a,l,c,d,h,f),this.image=g,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class My extends Xn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class ic extends Mi{constructor(e=1,t=1,r=1,a=1,l=1,c=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:r,widthSegments:a,heightSegments:l,depthSegments:c};const d=this;a=Math.floor(a),l=Math.floor(l),c=Math.floor(c);const h=[],f=[],m=[],g=[];let x=0,M=0;E("z","y","x",-1,-1,r,t,e,c,l,0),E("z","y","x",1,-1,r,t,-e,c,l,1),E("x","z","y",1,1,e,r,t,a,c,2),E("x","z","y",1,-1,e,r,-t,a,c,3),E("x","y","z",1,-1,e,t,r,a,l,4),E("x","y","z",-1,-1,e,t,-r,a,l,5),this.setIndex(h),this.setAttribute("position",new Un(f,3)),this.setAttribute("normal",new Un(m,3)),this.setAttribute("uv",new Un(g,2));function E(w,_,y,L,P,T,U,N,O,b,I){const W=T/O,V=U/b,J=T/2,se=U/2,j=N/2,k=O+1,oe=b+1;let te=0,K=0;const he=new ne;for(let de=0;de<oe;de++){const z=de*V-se;for(let q=0;q<k;q++){const Ie=q*W-J;he[w]=Ie*L,he[_]=z*P,he[y]=j,f.push(he.x,he.y,he.z),he[w]=0,he[_]=0,he[y]=N>0?1:-1,m.push(he.x,he.y,he.z),g.push(q/O),g.push(1-de/b),te+=1}}for(let de=0;de<b;de++)for(let z=0;z<O;z++){const q=x+z+k*de,Ie=x+z+k*(de+1),Be=x+(z+1)+k*(de+1),Ge=x+(z+1)+k*de;h.push(q,Ie,Ge),h.push(Ie,Be,Ge),K+=6}d.addGroup(M,K,I),M+=K,x+=te}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ic(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class vd extends Mi{constructor(e=1,t=1,r=1,a=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:r,heightSegments:a};const l=e/2,c=t/2,d=Math.floor(r),h=Math.floor(a),f=d+1,m=h+1,g=e/d,x=t/h,M=[],E=[],w=[],_=[];for(let y=0;y<m;y++){const L=y*x-c;for(let P=0;P<f;P++){const T=P*g-l;E.push(T,-L,0),w.push(0,0,1),_.push(P/d),_.push(1-y/h)}}for(let y=0;y<h;y++)for(let L=0;L<d;L++){const P=L+f*y,T=L+f*(y+1),U=L+1+f*(y+1),N=L+1+f*y;M.push(P,T,N),M.push(T,U,N)}this.setIndex(M),this.setAttribute("position",new Un(E,3)),this.setAttribute("normal",new Un(w,3)),this.setAttribute("uv",new Un(_,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new vd(e.width,e.height,e.widthSegments,e.heightSegments)}}function Fo(i){const e={};for(const t in i){e[t]={};for(const r in i[t]){const a=i[t][r];if(_v(a))a.isRenderTargetTexture?(lt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][r]=null):e[t][r]=a.clone();else if(Array.isArray(a))if(_v(a[0])){const l=[];for(let c=0,d=a.length;c<d;c++)l[c]=a[c].clone();e[t][r]=l}else e[t][r]=a.slice();else e[t][r]=a}}return e}function Kn(i){const e={};for(let t=0;t<i.length;t++){const r=Fo(i[t]);for(const a in r)e[a]=r[a]}return e}function _v(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function Ub(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function Ey(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:At.workingColorSpace}const Fb={clone:Fo,merge:Kn};var Ob=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,kb=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class yr extends _r{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Ob,this.fragmentShader=kb,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Fo(e.uniforms),this.uniformsGroups=Ub(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const a in this.uniforms){const c=this.uniforms[a].value;c&&c.isTexture?t.uniforms[a]={type:"t",value:c.toJSON(e).uuid}:c&&c.isColor?t.uniforms[a]={type:"c",value:c.getHex()}:c&&c.isVector2?t.uniforms[a]={type:"v2",value:c.toArray()}:c&&c.isVector3?t.uniforms[a]={type:"v3",value:c.toArray()}:c&&c.isVector4?t.uniforms[a]={type:"v4",value:c.toArray()}:c&&c.isMatrix3?t.uniforms[a]={type:"m3",value:c.toArray()}:c&&c.isMatrix4?t.uniforms[a]={type:"m4",value:c.toArray()}:t.uniforms[a]={value:c}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const r={};for(const a in this.extensions)this.extensions[a]===!0&&(r[a]=!0);return Object.keys(r).length>0&&(t.extensions=r),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(const r in e.uniforms){const a=e.uniforms[r];switch(this.uniforms[r]={},a.type){case"t":this.uniforms[r].value=t[a.value]||null;break;case"c":this.uniforms[r].value=new xt().setHex(a.value);break;case"v2":this.uniforms[r].value=new dt().fromArray(a.value);break;case"v3":this.uniforms[r].value=new ne().fromArray(a.value);break;case"v4":this.uniforms[r].value=new un().fromArray(a.value);break;case"m3":this.uniforms[r].value=new pt().fromArray(a.value);break;case"m4":this.uniforms[r].value=new an().fromArray(a.value);break;default:this.uniforms[r].value=a.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(const r in e.extensions)this.extensions[r]=e.extensions[r];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}}class zb extends yr{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class zf extends _r{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new xt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new xt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=sd,this.normalScale=new dt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Kr,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Bb extends _r{constructor(e){super(),this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new xt(16777215),this.specular=new xt(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new xt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=sd,this.normalScale=new dt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Kr,this.combine=Cm,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.specular.copy(e.specular),this.shininess=e.shininess,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Hb extends _r{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Kw,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class Vb extends _r{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const zl={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(yv(i)||(this.files[i]=e))},get:function(i){if(this.enabled!==!1&&!yv(i))return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};function yv(i){try{const e=i.slice(i.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}class Gb{constructor(e,t,r){const a=this;let l=!1,c=0,d=0,h;const f=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=r,this._abortController=null,this.itemStart=function(m){d++,l===!1&&a.onStart!==void 0&&a.onStart(m,c,d),l=!0},this.itemEnd=function(m){c++,a.onProgress!==void 0&&a.onProgress(m,c,d),c===d&&(l=!1,a.onLoad!==void 0&&a.onLoad())},this.itemError=function(m){a.onError!==void 0&&a.onError(m)},this.resolveURL=function(m){return m=m.normalize("NFC"),h?h(m):m},this.setURLModifier=function(m){return h=m,this},this.addHandler=function(m,g){return f.push(m,g),this},this.removeHandler=function(m){const g=f.indexOf(m);return g!==-1&&f.splice(g,2),this},this.getHandler=function(m){for(let g=0,x=f.length;g<x;g+=2){const M=f[g],E=f[g+1];if(M.global&&(M.lastIndex=0),M.test(m))return E}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const jb=new Gb;class rc{constructor(e){this.manager=e!==void 0?e:jb,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){const r=this;return new Promise(function(a,l){r.load(e,a,t,l)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}rc.DEFAULT_MATERIAL_NAME="__DEFAULT";const Ur={};class Wb extends Error{constructor(e,t){super(e),this.response=t}}class Xb extends rc{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,r,a){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const l=zl.get(`file:${e}`);if(l!==void 0){this.manager.itemStart(e),setTimeout(()=>{t&&t(l),this.manager.itemEnd(e)},0);return}if(Ur[e]!==void 0){Ur[e].push({onLoad:t,onProgress:r,onError:a});return}Ur[e]=[],Ur[e].push({onLoad:t,onProgress:r,onError:a});const c=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),d=this.mimeType,h=this.responseType;fetch(c).then(f=>{if(f.status===200||f.status===0){if(f.status===0&&lt("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||f.body===void 0||f.body.getReader===void 0)return f;const m=Ur[e],g=f.body.getReader(),x=f.headers.get("X-File-Size")||f.headers.get("Content-Length"),M=x?parseInt(x):0,E=M!==0;let w=0;const _=new ReadableStream({start(y){L();function L(){g.read().then(({done:P,value:T})=>{if(P)y.close();else{w+=T.byteLength;const U=new ProgressEvent("progress",{lengthComputable:E,loaded:w,total:M});for(let N=0,O=m.length;N<O;N++){const b=m[N];b.onProgress&&b.onProgress(U)}y.enqueue(T),L()}},P=>{y.error(P)})}}});return new Response(_)}else throw new Wb(`fetch for "${f.url}" responded with ${f.status}: ${f.statusText}`,f)}).then(f=>{switch(h){case"arraybuffer":return f.arrayBuffer();case"blob":return f.blob();case"document":return f.text().then(m=>new DOMParser().parseFromString(m,d));case"json":return f.json();default:if(d==="")return f.text();{const g=/charset="?([^;"\s]*)"?/i.exec(d),x=g&&g[1]?g[1].toLowerCase():void 0,M=new TextDecoder(x);return f.arrayBuffer().then(E=>M.decode(E))}}}).then(f=>{zl.add(`file:${e}`,f);const m=Ur[e];delete Ur[e];for(let g=0,x=m.length;g<x;g++){const M=m[g];M.onLoad&&M.onLoad(f)}}).catch(f=>{const m=Ur[e];if(m===void 0)throw this.manager.itemError(e),f;delete Ur[e];for(let g=0,x=m.length;g<x;g++){const M=m[g];M.onError&&M.onError(f)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const lo=new WeakMap;class $b extends rc{constructor(e){super(e)}load(e,t,r,a){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const l=this,c=zl.get(`image:${e}`);if(c!==void 0){if(c.complete===!0)l.manager.itemStart(e),setTimeout(function(){t&&t(c),l.manager.itemEnd(e)},0);else{let g=lo.get(c);g===void 0&&(g=[],lo.set(c,g)),g.push({onLoad:t,onError:a})}return c}const d=$l("img");function h(){m(),t&&t(this);const g=lo.get(this)||[];for(let x=0;x<g.length;x++){const M=g[x];M.onLoad&&M.onLoad(this)}lo.delete(this),l.manager.itemEnd(e)}function f(g){m(),a&&a(g),zl.remove(`image:${e}`);const x=lo.get(this)||[];for(let M=0;M<x.length;M++){const E=x[M];E.onError&&E.onError(g)}lo.delete(this),l.manager.itemError(e),l.manager.itemEnd(e)}function m(){d.removeEventListener("load",h,!1),d.removeEventListener("error",f,!1)}return d.addEventListener("load",h,!1),d.addEventListener("error",f,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(d.crossOrigin=this.crossOrigin),zl.add(`image:${e}`,d),l.manager.itemStart(e),d.src=e,d}}class qb extends rc{constructor(e){super(e)}load(e,t,r,a){const l=new Xn,c=new $b(this.manager);return c.setCrossOrigin(this.crossOrigin),c.setPath(this.path),c.load(e,function(d){l.image=d,l.needsUpdate=!0,t!==void 0&&t(l)},r,a),l}}class zm extends wn{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new xt(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}class Yb extends zm{constructor(e,t,r){super(e,r),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(wn.DEFAULT_UP),this.updateMatrix(),this.groundColor=new xt(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){const t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}}const Bf=new an,Sv=new ne,Mv=new ne;class Kb{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new dt(512,512),this.mapType=Si,this.map=null,this.mapPass=null,this.matrix=new an,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new km,this._frameExtents=new dt(1,1),this._viewportCount=1,this._viewports=[new un(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,r=this.matrix;Sv.setFromMatrixPosition(e.matrixWorld),t.position.copy(Sv),Mv.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Mv),t.updateMatrixWorld(),Bf.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Bf,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===Xl||t.reversedDepth?r.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):r.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),r.multiply(Bf)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Uu=new ne,Fu=new Os,ar=new ne;class wy extends wn{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new an,this.projectionMatrix=new an,this.projectionMatrixInverse=new an,this.coordinateSystem=pr,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Uu,Fu,ar),ar.x===1&&ar.y===1&&ar.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Uu,Fu,ar.set(1,1,1)).invert()}updateWorldMatrix(e,t,r=!1){super.updateWorldMatrix(e,t,r),this.matrixWorld.decompose(Uu,Fu,ar),ar.x===1&&ar.y===1&&ar.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Uu,Fu,ar.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const Ss=new ne,Ev=new dt,wv=new dt;class Ii extends wy{constructor(e=50,t=1,r=.1,a=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=r,this.far=a,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=em*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Ku*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return em*2*Math.atan(Math.tan(Ku*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,r){Ss.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Ss.x,Ss.y).multiplyScalar(-e/Ss.z),Ss.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),r.set(Ss.x,Ss.y).multiplyScalar(-e/Ss.z)}getViewSize(e,t){return this.getViewBounds(e,Ev,wv),t.subVectors(wv,Ev)}setViewOffset(e,t,r,a,l,c){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=r,this.view.offsetY=a,this.view.width=l,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Ku*.5*this.fov)/this.zoom,r=2*t,a=this.aspect*r,l=-.5*a;const c=this.view;if(this.view!==null&&this.view.enabled){const h=c.fullWidth,f=c.fullHeight;l+=c.offsetX*a/h,t-=c.offsetY*r/f,a*=c.width/h,r*=c.height/f}const d=this.filmOffset;d!==0&&(l+=e*d/this.getFilmWidth()),this.projectionMatrix.makePerspective(l,l+a,t,t-r,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class Bm extends wy{constructor(e=-1,t=1,r=1,a=-1,l=.1,c=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=r,this.bottom=a,this.near=l,this.far=c,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,r,a,l,c){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=r,this.view.offsetY=a,this.view.width=l,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),r=(this.right+this.left)/2,a=(this.top+this.bottom)/2;let l=r-e,c=r+e,d=a+t,h=a-t;if(this.view!==null&&this.view.enabled){const f=(this.right-this.left)/this.view.fullWidth/this.zoom,m=(this.top-this.bottom)/this.view.fullHeight/this.zoom;l+=f*this.view.offsetX,c=l+f*this.view.width,d-=m*this.view.offsetY,h=d-m*this.view.height}this.projectionMatrix.makeOrthographic(l,c,d,h,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class Qb extends Kb{constructor(){super(new Bm(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Hf extends zm{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(wn.DEFAULT_UP),this.updateMatrix(),this.target=new wn,this.shadow=new Qb}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}class Zb extends zm{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}const co=-90,uo=1;class Jb extends wn{constructor(e,t,r){super(),this.type="CubeCamera",this.renderTarget=r,this.coordinateSystem=null,this.activeMipmapLevel=0;const a=new Ii(co,uo,e,t);a.layers=this.layers,this.add(a);const l=new Ii(co,uo,e,t);l.layers=this.layers,this.add(l);const c=new Ii(co,uo,e,t);c.layers=this.layers,this.add(c);const d=new Ii(co,uo,e,t);d.layers=this.layers,this.add(d);const h=new Ii(co,uo,e,t);h.layers=this.layers,this.add(h);const f=new Ii(co,uo,e,t);f.layers=this.layers,this.add(f)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[r,a,l,c,d,h]=t;for(const f of t)this.remove(f);if(e===pr)r.up.set(0,1,0),r.lookAt(1,0,0),a.up.set(0,1,0),a.lookAt(-1,0,0),l.up.set(0,0,-1),l.lookAt(0,1,0),c.up.set(0,0,1),c.lookAt(0,-1,0),d.up.set(0,1,0),d.lookAt(0,0,1),h.up.set(0,1,0),h.lookAt(0,0,-1);else if(e===Xl)r.up.set(0,-1,0),r.lookAt(-1,0,0),a.up.set(0,-1,0),a.lookAt(1,0,0),l.up.set(0,0,1),l.lookAt(0,1,0),c.up.set(0,0,-1),c.lookAt(0,-1,0),d.up.set(0,-1,0),d.lookAt(0,0,1),h.up.set(0,-1,0),h.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const f of t)this.add(f),f.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:r,activeMipmapLevel:a}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[l,c,d,h,f,m]=this.children,g=e.getRenderTarget(),x=e.getActiveCubeFace(),M=e.getActiveMipmapLevel(),E=e.xr.enabled;e.xr.enabled=!1;const w=r.texture.generateMipmaps;r.texture.generateMipmaps=!1;let _=!1;e.isWebGLRenderer===!0?_=e.state.buffers.depth.getReversed():_=e.reversedDepthBuffer,e.setRenderTarget(r,0,a),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(r,1,a),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(r,2,a),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,d),e.setRenderTarget(r,3,a),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(r,4,a),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,f),r.texture.generateMipmaps=w,e.setRenderTarget(r,5,a),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,m),e.setRenderTarget(g,x,M),e.xr.enabled=E,r.texture.needsPMREMUpdate=!0}}class eT extends Ii{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class bv{constructor(e=1,t=0,r=0){this.radius=e,this.phi=t,this.theta=r}set(e,t,r){return this.radius=e,this.phi=t,this.theta=r,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=bt(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,r){return this.radius=Math.sqrt(e*e+t*t+r*r),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,r),this.phi=Math.acos(bt(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}const Xm=class Xm{constructor(e,t,r,a){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,r,a)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let r=0;r<4;r++)this.elements[r]=e[r+t];return this}set(e,t,r,a){const l=this.elements;return l[0]=e,l[2]=t,l[1]=r,l[3]=a,this}};Xm.prototype.isMatrix2=!0;let Tv=Xm;class tT extends ks{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){if(e===void 0){lt("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}}function Cv(i,e,t,r){const a=nT(r);switch(t){case dy:return i*e;case fy:return i*e/a.components*a.byteLength;case Lm:return i*e/a.components*a.byteLength;case Ta:return i*e*2/a.components*a.byteLength;case Dm:return i*e*2/a.components*a.byteLength;case hy:return i*e*3/a.components*a.byteLength;case Ki:return i*e*4/a.components*a.byteLength;case Im:return i*e*4/a.components*a.byteLength;case Xu:case $u:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case qu:case Yu:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case bp:case Cp:return Math.max(i,16)*Math.max(e,8)/4;case wp:case Tp:return Math.max(i,8)*Math.max(e,8)/2;case Rp:case Ap:case Np:case Lp:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Pp:case id:case Dp:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Ip:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Up:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case Fp:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case Op:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case kp:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case zp:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case Bp:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case Hp:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case Vp:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case Gp:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case jp:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Wp:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case Xp:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case $p:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case qp:case Yp:case Kp:return Math.ceil(i/4)*Math.ceil(e/4)*16;case Qp:case Zp:return Math.ceil(i/4)*Math.ceil(e/4)*8;case rd:case Jp:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function nT(i){switch(i){case Si:case oy:return{byteLength:1,components:1};case jl:case ly:case qr:return{byteLength:2,components:1};case Pm:case Nm:return{byteLength:2,components:4};case vr:case Am:case fr:return{byteLength:4,components:1};case cy:case uy:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Tm}}));typeof window<"u"&&(window.__THREE__?lt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Tm);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function by(){let i=null,e=!1,t=null,r=null;function a(l,c){t(l,c),r=i.requestAnimationFrame(a)}return{start:function(){e!==!0&&t!==null&&i!==null&&(r=i.requestAnimationFrame(a),e=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(r),e=!1},setAnimationLoop:function(l){t=l},setContext:function(l){i=l}}}function iT(i){const e=new WeakMap;function t(d,h){const f=d.array,m=d.usage,g=f.byteLength,x=i.createBuffer();i.bindBuffer(h,x),i.bufferData(h,f,m),d.onUploadCallback();let M;if(f instanceof Float32Array)M=i.FLOAT;else if(typeof Float16Array<"u"&&f instanceof Float16Array)M=i.HALF_FLOAT;else if(f instanceof Uint16Array)d.isFloat16BufferAttribute?M=i.HALF_FLOAT:M=i.UNSIGNED_SHORT;else if(f instanceof Int16Array)M=i.SHORT;else if(f instanceof Uint32Array)M=i.UNSIGNED_INT;else if(f instanceof Int32Array)M=i.INT;else if(f instanceof Int8Array)M=i.BYTE;else if(f instanceof Uint8Array)M=i.UNSIGNED_BYTE;else if(f instanceof Uint8ClampedArray)M=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+f);return{buffer:x,type:M,bytesPerElement:f.BYTES_PER_ELEMENT,version:d.version,size:g}}function r(d,h,f){const m=h.array,g=h.updateRanges;if(i.bindBuffer(f,d),g.length===0)i.bufferSubData(f,0,m);else{g.sort((M,E)=>M.start-E.start);let x=0;for(let M=1;M<g.length;M++){const E=g[x],w=g[M];w.start<=E.start+E.count+1?E.count=Math.max(E.count,w.start+w.count-E.start):(++x,g[x]=w)}g.length=x+1;for(let M=0,E=g.length;M<E;M++){const w=g[M];i.bufferSubData(f,w.start*m.BYTES_PER_ELEMENT,m,w.start,w.count)}h.clearUpdateRanges()}h.onUploadCallback()}function a(d){return d.isInterleavedBufferAttribute&&(d=d.data),e.get(d)}function l(d){d.isInterleavedBufferAttribute&&(d=d.data);const h=e.get(d);h&&(i.deleteBuffer(h.buffer),e.delete(d))}function c(d,h){if(d.isInterleavedBufferAttribute&&(d=d.data),d.isGLBufferAttribute){const m=e.get(d);(!m||m.version<d.version)&&e.set(d,{buffer:d.buffer,type:d.type,bytesPerElement:d.elementSize,version:d.version});return}const f=e.get(d);if(f===void 0)e.set(d,t(d,h));else if(f.version<d.version){if(f.size!==d.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");r(f.buffer,d,h),f.version=d.version}}return{get:a,remove:l,update:c}}var rT=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,sT=`#ifdef USE_ALPHAHASH
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
#endif`,aT=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,oT=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,lT=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,cT=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,uT=`#ifdef USE_AOMAP
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
#endif`,dT=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,hT=`#ifdef USE_BATCHING
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
#endif`,fT=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,pT=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,mT=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,gT=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,xT=`#ifdef USE_IRIDESCENCE
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
#endif`,vT=`#ifdef USE_BUMPMAP
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
#endif`,_T=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,yT=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,ST=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,MT=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,ET=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,wT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,bT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,TT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,CT=`#define PI 3.141592653589793
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
} // validated`,RT=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,AT=`vec3 transformedNormal = objectNormal;
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
#endif`,PT=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,NT=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,LT=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,DT=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,IT="gl_FragColor = linearToOutputTexel( gl_FragColor );",UT=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,FT=`#ifdef USE_ENVMAP
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
#endif`,OT=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,kT=`#ifdef USE_ENVMAP
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
#endif`,zT=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,BT=`#ifdef USE_ENVMAP
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
#endif`,HT=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,VT=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,GT=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,jT=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,WT=`#ifdef USE_GRADIENTMAP
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
}`,XT=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,$T=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,qT=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,YT=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,KT=`#ifdef USE_ENVMAP
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
#endif`,QT=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,ZT=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,JT=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,eC=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,tC=`PhysicalMaterial material;
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
#endif`,nC=`uniform sampler2D dfgLUT;
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
}`,iC=`
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
#endif`,rC=`#if defined( RE_IndirectDiffuse )
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
#endif`,sC=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,aC=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,oC=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,lC=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,cC=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,uC=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,dC=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,hC=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,fC=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,pC=`#if defined( USE_POINTS_UV )
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
#endif`,mC=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,gC=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,xC=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,vC=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,_C=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,yC=`#ifdef USE_MORPHTARGETS
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
#endif`,SC=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,MC=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,EC=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,wC=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,bC=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,TC=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,CC=`#ifdef USE_NORMALMAP
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
#endif`,RC=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,AC=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,PC=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,NC=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,LC=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,DC=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,IC=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,UC=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,FC=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,OC=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,kC=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,zC=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,BC=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,HC=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,VC=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,GC=`float getShadowMask() {
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
}`,jC=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,WC=`#ifdef USE_SKINNING
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
#endif`,XC=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,$C=`#ifdef USE_SKINNING
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
#endif`,qC=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,YC=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,KC=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,QC=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,ZC=`#ifdef USE_TRANSMISSION
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
#endif`,JC=`#ifdef USE_TRANSMISSION
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
#endif`,eR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,tR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,nR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,iR=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const rR=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,sR=`uniform sampler2D t2D;
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
}`,aR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,oR=`#ifdef ENVMAP_TYPE_CUBE
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
}`,lR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cR=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,uR=`#include <common>
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
}`,dR=`#if DEPTH_PACKING == 3200
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
}`,hR=`#define DISTANCE
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
}`,fR=`#define DISTANCE
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
}`,pR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,mR=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,gR=`uniform float scale;
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
}`,xR=`uniform vec3 diffuse;
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
}`,vR=`#include <common>
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
}`,_R=`uniform vec3 diffuse;
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
}`,yR=`#define LAMBERT
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
}`,SR=`#define LAMBERT
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
}`,MR=`#define MATCAP
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
}`,ER=`#define MATCAP
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
}`,wR=`#define NORMAL
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
}`,bR=`#define NORMAL
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
}`,TR=`#define PHONG
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
}`,CR=`#define PHONG
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
}`,RR=`#define STANDARD
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
}`,AR=`#define STANDARD
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
}`,PR=`#define TOON
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
}`,NR=`#define TOON
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
}`,LR=`uniform float size;
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
}`,DR=`uniform vec3 diffuse;
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
}`,IR=`#include <common>
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
}`,UR=`uniform vec3 color;
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
}`,FR=`uniform float rotation;
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
}`,OR=`uniform vec3 diffuse;
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
}`,_t={alphahash_fragment:rT,alphahash_pars_fragment:sT,alphamap_fragment:aT,alphamap_pars_fragment:oT,alphatest_fragment:lT,alphatest_pars_fragment:cT,aomap_fragment:uT,aomap_pars_fragment:dT,batching_pars_vertex:hT,batching_vertex:fT,begin_vertex:pT,beginnormal_vertex:mT,bsdfs:gT,iridescence_fragment:xT,bumpmap_pars_fragment:vT,clipping_planes_fragment:_T,clipping_planes_pars_fragment:yT,clipping_planes_pars_vertex:ST,clipping_planes_vertex:MT,color_fragment:ET,color_pars_fragment:wT,color_pars_vertex:bT,color_vertex:TT,common:CT,cube_uv_reflection_fragment:RT,defaultnormal_vertex:AT,displacementmap_pars_vertex:PT,displacementmap_vertex:NT,emissivemap_fragment:LT,emissivemap_pars_fragment:DT,colorspace_fragment:IT,colorspace_pars_fragment:UT,envmap_fragment:FT,envmap_common_pars_fragment:OT,envmap_pars_fragment:kT,envmap_pars_vertex:zT,envmap_physical_pars_fragment:KT,envmap_vertex:BT,fog_vertex:HT,fog_pars_vertex:VT,fog_fragment:GT,fog_pars_fragment:jT,gradientmap_pars_fragment:WT,lightmap_pars_fragment:XT,lights_lambert_fragment:$T,lights_lambert_pars_fragment:qT,lights_pars_begin:YT,lights_toon_fragment:QT,lights_toon_pars_fragment:ZT,lights_phong_fragment:JT,lights_phong_pars_fragment:eC,lights_physical_fragment:tC,lights_physical_pars_fragment:nC,lights_fragment_begin:iC,lights_fragment_maps:rC,lights_fragment_end:sC,lightprobes_pars_fragment:aC,logdepthbuf_fragment:oC,logdepthbuf_pars_fragment:lC,logdepthbuf_pars_vertex:cC,logdepthbuf_vertex:uC,map_fragment:dC,map_pars_fragment:hC,map_particle_fragment:fC,map_particle_pars_fragment:pC,metalnessmap_fragment:mC,metalnessmap_pars_fragment:gC,morphinstance_vertex:xC,morphcolor_vertex:vC,morphnormal_vertex:_C,morphtarget_pars_vertex:yC,morphtarget_vertex:SC,normal_fragment_begin:MC,normal_fragment_maps:EC,normal_pars_fragment:wC,normal_pars_vertex:bC,normal_vertex:TC,normalmap_pars_fragment:CC,clearcoat_normal_fragment_begin:RC,clearcoat_normal_fragment_maps:AC,clearcoat_pars_fragment:PC,iridescence_pars_fragment:NC,opaque_fragment:LC,packing:DC,premultiplied_alpha_fragment:IC,project_vertex:UC,dithering_fragment:FC,dithering_pars_fragment:OC,roughnessmap_fragment:kC,roughnessmap_pars_fragment:zC,shadowmap_pars_fragment:BC,shadowmap_pars_vertex:HC,shadowmap_vertex:VC,shadowmask_pars_fragment:GC,skinbase_vertex:jC,skinning_pars_vertex:WC,skinning_vertex:XC,skinnormal_vertex:$C,specularmap_fragment:qC,specularmap_pars_fragment:YC,tonemapping_fragment:KC,tonemapping_pars_fragment:QC,transmission_fragment:ZC,transmission_pars_fragment:JC,uv_pars_fragment:eR,uv_pars_vertex:tR,uv_vertex:nR,worldpos_vertex:iR,background_vert:rR,background_frag:sR,backgroundCube_vert:aR,backgroundCube_frag:oR,cube_vert:lR,cube_frag:cR,depth_vert:uR,depth_frag:dR,distance_vert:hR,distance_frag:fR,equirect_vert:pR,equirect_frag:mR,linedashed_vert:gR,linedashed_frag:xR,meshbasic_vert:vR,meshbasic_frag:_R,meshlambert_vert:yR,meshlambert_frag:SR,meshmatcap_vert:MR,meshmatcap_frag:ER,meshnormal_vert:wR,meshnormal_frag:bR,meshphong_vert:TR,meshphong_frag:CR,meshphysical_vert:RR,meshphysical_frag:AR,meshtoon_vert:PR,meshtoon_frag:NR,points_vert:LR,points_frag:DR,shadow_vert:IR,shadow_frag:UR,sprite_vert:FR,sprite_frag:OR},ke={common:{diffuse:{value:new xt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new pt},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new pt}},envmap:{envMap:{value:null},envMapRotation:{value:new pt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new pt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new pt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new pt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new pt},normalScale:{value:new dt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new pt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new pt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new pt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new pt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new xt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new ne},probesMax:{value:new ne},probesResolution:{value:new ne}},points:{diffuse:{value:new xt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0},uvTransform:{value:new pt}},sprite:{diffuse:{value:new xt(16777215)},opacity:{value:1},center:{value:new dt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new pt},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0}}},dr={basic:{uniforms:Kn([ke.common,ke.specularmap,ke.envmap,ke.aomap,ke.lightmap,ke.fog]),vertexShader:_t.meshbasic_vert,fragmentShader:_t.meshbasic_frag},lambert:{uniforms:Kn([ke.common,ke.specularmap,ke.envmap,ke.aomap,ke.lightmap,ke.emissivemap,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.fog,ke.lights,{emissive:{value:new xt(0)},envMapIntensity:{value:1}}]),vertexShader:_t.meshlambert_vert,fragmentShader:_t.meshlambert_frag},phong:{uniforms:Kn([ke.common,ke.specularmap,ke.envmap,ke.aomap,ke.lightmap,ke.emissivemap,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.fog,ke.lights,{emissive:{value:new xt(0)},specular:{value:new xt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:_t.meshphong_vert,fragmentShader:_t.meshphong_frag},standard:{uniforms:Kn([ke.common,ke.envmap,ke.aomap,ke.lightmap,ke.emissivemap,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.roughnessmap,ke.metalnessmap,ke.fog,ke.lights,{emissive:{value:new xt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:_t.meshphysical_vert,fragmentShader:_t.meshphysical_frag},toon:{uniforms:Kn([ke.common,ke.aomap,ke.lightmap,ke.emissivemap,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.gradientmap,ke.fog,ke.lights,{emissive:{value:new xt(0)}}]),vertexShader:_t.meshtoon_vert,fragmentShader:_t.meshtoon_frag},matcap:{uniforms:Kn([ke.common,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.fog,{matcap:{value:null}}]),vertexShader:_t.meshmatcap_vert,fragmentShader:_t.meshmatcap_frag},points:{uniforms:Kn([ke.points,ke.fog]),vertexShader:_t.points_vert,fragmentShader:_t.points_frag},dashed:{uniforms:Kn([ke.common,ke.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:_t.linedashed_vert,fragmentShader:_t.linedashed_frag},depth:{uniforms:Kn([ke.common,ke.displacementmap]),vertexShader:_t.depth_vert,fragmentShader:_t.depth_frag},normal:{uniforms:Kn([ke.common,ke.bumpmap,ke.normalmap,ke.displacementmap,{opacity:{value:1}}]),vertexShader:_t.meshnormal_vert,fragmentShader:_t.meshnormal_frag},sprite:{uniforms:Kn([ke.sprite,ke.fog]),vertexShader:_t.sprite_vert,fragmentShader:_t.sprite_frag},background:{uniforms:{uvTransform:{value:new pt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:_t.background_vert,fragmentShader:_t.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new pt}},vertexShader:_t.backgroundCube_vert,fragmentShader:_t.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:_t.cube_vert,fragmentShader:_t.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:_t.equirect_vert,fragmentShader:_t.equirect_frag},distance:{uniforms:Kn([ke.common,ke.displacementmap,{referencePosition:{value:new ne},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:_t.distance_vert,fragmentShader:_t.distance_frag},shadow:{uniforms:Kn([ke.lights,ke.fog,{color:{value:new xt(0)},opacity:{value:1}}]),vertexShader:_t.shadow_vert,fragmentShader:_t.shadow_frag}};dr.physical={uniforms:Kn([dr.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new pt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new pt},clearcoatNormalScale:{value:new dt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new pt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new pt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new pt},sheen:{value:0},sheenColor:{value:new xt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new pt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new pt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new pt},transmissionSamplerSize:{value:new dt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new pt},attenuationDistance:{value:0},attenuationColor:{value:new xt(0)},specularColor:{value:new xt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new pt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new pt},anisotropyVector:{value:new dt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new pt}}]),vertexShader:_t.meshphysical_vert,fragmentShader:_t.meshphysical_frag};const Ou={r:0,b:0,g:0},kR=new an,Ty=new pt;Ty.set(-1,0,0,0,1,0,0,0,1);function zR(i,e,t,r,a,l){const c=new xt(0);let d=a===!0?0:1,h,f,m=null,g=0,x=null;function M(L){let P=L.isScene===!0?L.background:null;if(P&&P.isTexture){const T=L.backgroundBlurriness>0;P=e.get(P,T)}return P}function E(L){let P=!1;const T=M(L);T===null?_(c,d):T&&T.isColor&&(_(T,1),P=!0);const U=i.xr.getEnvironmentBlendMode();U==="additive"?t.buffers.color.setClear(0,0,0,1,l):U==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,l),(i.autoClear||P)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function w(L,P){const T=M(P);T&&(T.isCubeTexture||T.mapping===gd)?(f===void 0&&(f=new Zi(new ic(1,1,1),new yr({name:"BackgroundCubeMaterial",uniforms:Fo(dr.backgroundCube.uniforms),vertexShader:dr.backgroundCube.vertexShader,fragmentShader:dr.backgroundCube.fragmentShader,side:hi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),f.geometry.deleteAttribute("normal"),f.geometry.deleteAttribute("uv"),f.onBeforeRender=function(U,N,O){this.matrixWorld.copyPosition(O.matrixWorld)},Object.defineProperty(f.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(f)),f.material.uniforms.envMap.value=T,f.material.uniforms.backgroundBlurriness.value=P.backgroundBlurriness,f.material.uniforms.backgroundIntensity.value=P.backgroundIntensity,f.material.uniforms.backgroundRotation.value.setFromMatrix4(kR.makeRotationFromEuler(P.backgroundRotation)).transpose(),T.isCubeTexture&&T.isRenderTargetTexture===!1&&f.material.uniforms.backgroundRotation.value.premultiply(Ty),f.material.toneMapped=At.getTransfer(T.colorSpace)!==Vt,(m!==T||g!==T.version||x!==i.toneMapping)&&(f.material.needsUpdate=!0,m=T,g=T.version,x=i.toneMapping),f.layers.enableAll(),L.unshift(f,f.geometry,f.material,0,0,null)):T&&T.isTexture&&(h===void 0&&(h=new Zi(new vd(2,2),new yr({name:"BackgroundMaterial",uniforms:Fo(dr.background.uniforms),vertexShader:dr.background.vertexShader,fragmentShader:dr.background.fragmentShader,side:Fs,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),Object.defineProperty(h.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(h)),h.material.uniforms.t2D.value=T,h.material.uniforms.backgroundIntensity.value=P.backgroundIntensity,h.material.toneMapped=At.getTransfer(T.colorSpace)!==Vt,T.matrixAutoUpdate===!0&&T.updateMatrix(),h.material.uniforms.uvTransform.value.copy(T.matrix),(m!==T||g!==T.version||x!==i.toneMapping)&&(h.material.needsUpdate=!0,m=T,g=T.version,x=i.toneMapping),h.layers.enableAll(),L.unshift(h,h.geometry,h.material,0,0,null))}function _(L,P){L.getRGB(Ou,Ey(i)),t.buffers.color.setClear(Ou.r,Ou.g,Ou.b,P,l)}function y(){f!==void 0&&(f.geometry.dispose(),f.material.dispose(),f=void 0),h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0)}return{getClearColor:function(){return c},setClearColor:function(L,P=1){c.set(L),d=P,_(c,d)},getClearAlpha:function(){return d},setClearAlpha:function(L){d=L,_(c,d)},render:E,addToRenderList:w,dispose:y}}function BR(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),r={},a=x(null);let l=a,c=!1;function d(V,J,se,j,k){let oe=!1;const te=g(V,j,se,J);l!==te&&(l=te,f(l.object)),oe=M(V,j,se,k),oe&&E(V,j,se,k),k!==null&&e.update(k,i.ELEMENT_ARRAY_BUFFER),(oe||c)&&(c=!1,T(V,J,se,j),k!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(k).buffer))}function h(){return i.createVertexArray()}function f(V){return i.bindVertexArray(V)}function m(V){return i.deleteVertexArray(V)}function g(V,J,se,j){const k=j.wireframe===!0;let oe=r[J.id];oe===void 0&&(oe={},r[J.id]=oe);const te=V.isInstancedMesh===!0?V.id:0;let K=oe[te];K===void 0&&(K={},oe[te]=K);let he=K[se.id];he===void 0&&(he={},K[se.id]=he);let de=he[k];return de===void 0&&(de=x(h()),he[k]=de),de}function x(V){const J=[],se=[],j=[];for(let k=0;k<t;k++)J[k]=0,se[k]=0,j[k]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:J,enabledAttributes:se,attributeDivisors:j,object:V,attributes:{},index:null}}function M(V,J,se,j){const k=l.attributes,oe=J.attributes;let te=0;const K=se.getAttributes();for(const he in K)if(K[he].location>=0){const z=k[he];let q=oe[he];if(q===void 0&&(he==="instanceMatrix"&&V.instanceMatrix&&(q=V.instanceMatrix),he==="instanceColor"&&V.instanceColor&&(q=V.instanceColor)),z===void 0||z.attribute!==q||q&&z.data!==q.data)return!0;te++}return l.attributesNum!==te||l.index!==j}function E(V,J,se,j){const k={},oe=J.attributes;let te=0;const K=se.getAttributes();for(const he in K)if(K[he].location>=0){let z=oe[he];z===void 0&&(he==="instanceMatrix"&&V.instanceMatrix&&(z=V.instanceMatrix),he==="instanceColor"&&V.instanceColor&&(z=V.instanceColor));const q={};q.attribute=z,z&&z.data&&(q.data=z.data),k[he]=q,te++}l.attributes=k,l.attributesNum=te,l.index=j}function w(){const V=l.newAttributes;for(let J=0,se=V.length;J<se;J++)V[J]=0}function _(V){y(V,0)}function y(V,J){const se=l.newAttributes,j=l.enabledAttributes,k=l.attributeDivisors;se[V]=1,j[V]===0&&(i.enableVertexAttribArray(V),j[V]=1),k[V]!==J&&(i.vertexAttribDivisor(V,J),k[V]=J)}function L(){const V=l.newAttributes,J=l.enabledAttributes;for(let se=0,j=J.length;se<j;se++)J[se]!==V[se]&&(i.disableVertexAttribArray(se),J[se]=0)}function P(V,J,se,j,k,oe,te){te===!0?i.vertexAttribIPointer(V,J,se,k,oe):i.vertexAttribPointer(V,J,se,j,k,oe)}function T(V,J,se,j){w();const k=j.attributes,oe=se.getAttributes(),te=J.defaultAttributeValues;for(const K in oe){const he=oe[K];if(he.location>=0){let de=k[K];if(de===void 0&&(K==="instanceMatrix"&&V.instanceMatrix&&(de=V.instanceMatrix),K==="instanceColor"&&V.instanceColor&&(de=V.instanceColor)),de!==void 0){const z=de.normalized,q=de.itemSize,Ie=e.get(de);if(Ie===void 0)continue;const Be=Ie.buffer,Ge=Ie.type,ce=Ie.bytesPerElement,ye=Ge===i.INT||Ge===i.UNSIGNED_INT||de.gpuType===Am;if(de.isInterleavedBufferAttribute){const ge=de.data,Ue=ge.stride,Ze=de.offset;if(ge.isInstancedInterleavedBuffer){for(let tt=0;tt<he.locationSize;tt++)y(he.location+tt,ge.meshPerAttribute);V.isInstancedMesh!==!0&&j._maxInstanceCount===void 0&&(j._maxInstanceCount=ge.meshPerAttribute*ge.count)}else for(let tt=0;tt<he.locationSize;tt++)_(he.location+tt);i.bindBuffer(i.ARRAY_BUFFER,Be);for(let tt=0;tt<he.locationSize;tt++)P(he.location+tt,q/he.locationSize,Ge,z,Ue*ce,(Ze+q/he.locationSize*tt)*ce,ye)}else{if(de.isInstancedBufferAttribute){for(let ge=0;ge<he.locationSize;ge++)y(he.location+ge,de.meshPerAttribute);V.isInstancedMesh!==!0&&j._maxInstanceCount===void 0&&(j._maxInstanceCount=de.meshPerAttribute*de.count)}else for(let ge=0;ge<he.locationSize;ge++)_(he.location+ge);i.bindBuffer(i.ARRAY_BUFFER,Be);for(let ge=0;ge<he.locationSize;ge++)P(he.location+ge,q/he.locationSize,Ge,z,q*ce,q/he.locationSize*ge*ce,ye)}}else if(te!==void 0){const z=te[K];if(z!==void 0)switch(z.length){case 2:i.vertexAttrib2fv(he.location,z);break;case 3:i.vertexAttrib3fv(he.location,z);break;case 4:i.vertexAttrib4fv(he.location,z);break;default:i.vertexAttrib1fv(he.location,z)}}}}L()}function U(){I();for(const V in r){const J=r[V];for(const se in J){const j=J[se];for(const k in j){const oe=j[k];for(const te in oe)m(oe[te].object),delete oe[te];delete j[k]}}delete r[V]}}function N(V){if(r[V.id]===void 0)return;const J=r[V.id];for(const se in J){const j=J[se];for(const k in j){const oe=j[k];for(const te in oe)m(oe[te].object),delete oe[te];delete j[k]}}delete r[V.id]}function O(V){for(const J in r){const se=r[J];for(const j in se){const k=se[j];if(k[V.id]===void 0)continue;const oe=k[V.id];for(const te in oe)m(oe[te].object),delete oe[te];delete k[V.id]}}}function b(V){for(const J in r){const se=r[J],j=V.isInstancedMesh===!0?V.id:0,k=se[j];if(k!==void 0){for(const oe in k){const te=k[oe];for(const K in te)m(te[K].object),delete te[K];delete k[oe]}delete se[j],Object.keys(se).length===0&&delete r[J]}}}function I(){W(),c=!0,l!==a&&(l=a,f(l.object))}function W(){a.geometry=null,a.program=null,a.wireframe=!1}return{setup:d,reset:I,resetDefaultState:W,dispose:U,releaseStatesOfGeometry:N,releaseStatesOfObject:b,releaseStatesOfProgram:O,initAttributes:w,enableAttribute:_,disableUnusedAttributes:L}}function HR(i,e,t){let r;function a(h){r=h}function l(h,f){i.drawArrays(r,h,f),t.update(f,r,1)}function c(h,f,m){m!==0&&(i.drawArraysInstanced(r,h,f,m),t.update(f,r,m))}function d(h,f,m){if(m===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(r,h,0,f,0,m);let x=0;for(let M=0;M<m;M++)x+=f[M];t.update(x,r,1)}this.setMode=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=d}function VR(i,e,t,r){let a;function l(){if(a!==void 0)return a;if(e.has("EXT_texture_filter_anisotropic")===!0){const O=e.get("EXT_texture_filter_anisotropic");a=i.getParameter(O.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else a=0;return a}function c(O){return!(O!==Ki&&r.convert(O)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function d(O){const b=O===qr&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(O!==Si&&r.convert(O)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&O!==fr&&!b)}function h(O){if(O==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";O="mediump"}return O==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let f=t.precision!==void 0?t.precision:"highp";const m=h(f);m!==f&&(lt("WebGLRenderer:",f,"not supported, using",m,"instead."),f=m);const g=t.logarithmicDepthBuffer===!0,x=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&x===!1&&lt("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const M=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),E=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),w=i.getParameter(i.MAX_TEXTURE_SIZE),_=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),y=i.getParameter(i.MAX_VERTEX_ATTRIBS),L=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),P=i.getParameter(i.MAX_VARYING_VECTORS),T=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),U=i.getParameter(i.MAX_SAMPLES),N=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:l,getMaxPrecision:h,textureFormatReadable:c,textureTypeReadable:d,precision:f,logarithmicDepthBuffer:g,reversedDepthBuffer:x,maxTextures:M,maxVertexTextures:E,maxTextureSize:w,maxCubemapSize:_,maxAttributes:y,maxVertexUniforms:L,maxVaryings:P,maxFragmentUniforms:T,maxSamples:U,samples:N}}function GR(i){const e=this;let t=null,r=0,a=!1,l=!1;const c=new Es,d=new pt,h={value:null,needsUpdate:!1};this.uniform=h,this.numPlanes=0,this.numIntersection=0,this.init=function(g,x){const M=g.length!==0||x||r!==0||a;return a=x,r=g.length,M},this.beginShadows=function(){l=!0,m(null)},this.endShadows=function(){l=!1},this.setGlobalState=function(g,x){t=m(g,x,0)},this.setState=function(g,x,M){const E=g.clippingPlanes,w=g.clipIntersection,_=g.clipShadows,y=i.get(g);if(!a||E===null||E.length===0||l&&!_)l?m(null):f();else{const L=l?0:r,P=L*4;let T=y.clippingState||null;h.value=T,T=m(E,x,P,M);for(let U=0;U!==P;++U)T[U]=t[U];y.clippingState=T,this.numIntersection=w?this.numPlanes:0,this.numPlanes+=L}};function f(){h.value!==t&&(h.value=t,h.needsUpdate=r>0),e.numPlanes=r,e.numIntersection=0}function m(g,x,M,E){const w=g!==null?g.length:0;let _=null;if(w!==0){if(_=h.value,E!==!0||_===null){const y=M+w*4,L=x.matrixWorldInverse;d.getNormalMatrix(L),(_===null||_.length<y)&&(_=new Float32Array(y));for(let P=0,T=M;P!==w;++P,T+=4)c.copy(g[P]).applyMatrix4(L,d),c.normal.toArray(_,T),_[T+3]=c.constant}h.value=_,h.needsUpdate=!0}return e.numPlanes=w,e.numIntersection=0,_}}const Is=4,Rv=[.125,.215,.35,.446,.526,.582],ca=20,jR=256,Ll=new Bm,Av=new xt;let Vf=null,Gf=0,jf=0,Wf=!1;const WR=new ne;class Pv{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,r=.1,a=100,l={}){const{size:c=256,position:d=WR}=l;Vf=this._renderer.getRenderTarget(),Gf=this._renderer.getActiveCubeFace(),jf=this._renderer.getActiveMipmapLevel(),Wf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(c);const h=this._allocateTargets();return h.depthBuffer=!0,this._sceneToCubeUV(e,r,a,h,d),t>0&&this._blur(h,0,0,t),this._applyPMREM(h),this._cleanup(h),h}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Dv(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Lv(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Vf,Gf,jf),this._renderer.xr.enabled=Wf,e.scissorTest=!1,ho(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===ba||e.mapping===Io?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Vf=this._renderer.getRenderTarget(),Gf=this._renderer.getActiveCubeFace(),jf=this._renderer.getActiveMipmapLevel(),Wf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const r=t||this._allocateTargets();return this._textureToCubeUV(e,r),this._applyPMREM(r),this._cleanup(r),r}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,r={magFilter:Wn,minFilter:Wn,generateMipmaps:!1,type:qr,format:Ki,colorSpace:ad,depthBuffer:!1},a=Nv(e,t,r);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Nv(e,t,r);const{_lodMax:l}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=XR(l)),this._blurMaterial=qR(l,e,t),this._ggxMaterial=$R(l,e,t)}return a}_compileMaterial(e){const t=new Zi(new Mi,e);this._renderer.compile(t,Ll)}_sceneToCubeUV(e,t,r,a,l){const h=new Ii(90,1,t,r),f=[1,-1,1,1,1,1],m=[1,1,1,-1,-1,-1],g=this._renderer,x=g.autoClear,M=g.toneMapping;g.getClearColor(Av),g.toneMapping=mr,g.autoClear=!1,g.state.buffers.depth.getReversed()&&(g.setRenderTarget(a),g.clearDepth(),g.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Zi(new ic,new yy({name:"PMREM.Background",side:hi,depthWrite:!1,depthTest:!1})));const w=this._backgroundBox,_=w.material;let y=!1;const L=e.background;L?L.isColor&&(_.color.copy(L),e.background=null,y=!0):(_.color.copy(Av),y=!0);for(let P=0;P<6;P++){const T=P%3;T===0?(h.up.set(0,f[P],0),h.position.set(l.x,l.y,l.z),h.lookAt(l.x+m[P],l.y,l.z)):T===1?(h.up.set(0,0,f[P]),h.position.set(l.x,l.y,l.z),h.lookAt(l.x,l.y+m[P],l.z)):(h.up.set(0,f[P],0),h.position.set(l.x,l.y,l.z),h.lookAt(l.x,l.y,l.z+m[P]));const U=this._cubeSize;ho(a,T*U,P>2?U:0,U,U),g.setRenderTarget(a),y&&g.render(w,h),g.render(e,h)}g.toneMapping=M,g.autoClear=x,e.background=L}_textureToCubeUV(e,t){const r=this._renderer,a=e.mapping===ba||e.mapping===Io;a?(this._cubemapMaterial===null&&(this._cubemapMaterial=Dv()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Lv());const l=a?this._cubemapMaterial:this._equirectMaterial,c=this._lodMeshes[0];c.material=l;const d=l.uniforms;d.envMap.value=e;const h=this._cubeSize;ho(t,0,0,3*h,2*h),r.setRenderTarget(t),r.render(c,Ll)}_applyPMREM(e){const t=this._renderer,r=t.autoClear;t.autoClear=!1;const a=this._lodMeshes.length;for(let l=1;l<a;l++)this._applyGGXFilter(e,l-1,l);t.autoClear=r}_applyGGXFilter(e,t,r){const a=this._renderer,l=this._pingPongRenderTarget,c=this._ggxMaterial,d=this._lodMeshes[r];d.material=c;const h=c.uniforms,f=r/(this._lodMeshes.length-1),m=t/(this._lodMeshes.length-1),g=Math.sqrt(f*f-m*m),x=0+f*1.25,M=g*x,{_lodMax:E}=this,w=this._sizeLods[r],_=3*w*(r>E-Is?r-E+Is:0),y=4*(this._cubeSize-w);h.envMap.value=e.texture,h.roughness.value=M,h.mipInt.value=E-t,ho(l,_,y,3*w,2*w),a.setRenderTarget(l),a.render(d,Ll),h.envMap.value=l.texture,h.roughness.value=0,h.mipInt.value=E-r,ho(e,_,y,3*w,2*w),a.setRenderTarget(e),a.render(d,Ll)}_blur(e,t,r,a,l){const c=this._pingPongRenderTarget;this._halfBlur(e,c,t,r,a,"latitudinal",l),this._halfBlur(c,e,r,r,a,"longitudinal",l)}_halfBlur(e,t,r,a,l,c,d){const h=this._renderer,f=this._blurMaterial;c!=="latitudinal"&&c!=="longitudinal"&&Dt("blur direction must be either latitudinal or longitudinal!");const m=3,g=this._lodMeshes[a];g.material=f;const x=f.uniforms,M=this._sizeLods[r]-1,E=isFinite(l)?Math.PI/(2*M):2*Math.PI/(2*ca-1),w=l/E,_=isFinite(l)?1+Math.floor(m*w):ca;_>ca&&lt(`sigmaRadians, ${l}, is too large and will clip, as it requested ${_} samples when the maximum is set to ${ca}`);const y=[];let L=0;for(let O=0;O<ca;++O){const b=O/w,I=Math.exp(-b*b/2);y.push(I),O===0?L+=I:O<_&&(L+=2*I)}for(let O=0;O<y.length;O++)y[O]=y[O]/L;x.envMap.value=e.texture,x.samples.value=_,x.weights.value=y,x.latitudinal.value=c==="latitudinal",d&&(x.poleAxis.value=d);const{_lodMax:P}=this;x.dTheta.value=E,x.mipInt.value=P-r;const T=this._sizeLods[a],U=3*T*(a>P-Is?a-P+Is:0),N=4*(this._cubeSize-T);ho(t,U,N,3*T,2*T),h.setRenderTarget(t),h.render(g,Ll)}}function XR(i){const e=[],t=[],r=[];let a=i;const l=i-Is+1+Rv.length;for(let c=0;c<l;c++){const d=Math.pow(2,a);e.push(d);let h=1/d;c>i-Is?h=Rv[c-i+Is-1]:c===0&&(h=0),t.push(h);const f=1/(d-2),m=-f,g=1+f,x=[m,m,g,m,g,g,m,m,g,g,m,g],M=6,E=6,w=3,_=2,y=1,L=new Float32Array(w*E*M),P=new Float32Array(_*E*M),T=new Float32Array(y*E*M);for(let N=0;N<M;N++){const O=N%3*2/3-1,b=N>2?0:-1,I=[O,b,0,O+2/3,b,0,O+2/3,b+1,0,O,b,0,O+2/3,b+1,0,O,b+1,0];L.set(I,w*E*N),P.set(x,_*E*N);const W=[N,N,N,N,N,N];T.set(W,y*E*N)}const U=new Mi;U.setAttribute("position",new xr(L,w)),U.setAttribute("uv",new xr(P,_)),U.setAttribute("faceIndex",new xr(T,y)),r.push(new Zi(U,null)),a>Is&&a--}return{lodMeshes:r,sizeLods:e,sigmas:t}}function Nv(i,e,t){const r=new gr(i,e,t);return r.texture.mapping=gd,r.texture.name="PMREM.cubeUv",r.scissorTest=!0,r}function ho(i,e,t,r,a){i.viewport.set(e,t,r,a),i.scissor.set(e,t,r,a)}function $R(i,e,t){return new yr({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:jR,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:_d(),fragmentShader:`

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
		`,blending:jr,depthTest:!1,depthWrite:!1})}function qR(i,e,t){const r=new Float32Array(ca),a=new ne(0,1,0);return new yr({name:"SphericalGaussianBlur",defines:{n:ca,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:r},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:a}},vertexShader:_d(),fragmentShader:`

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
		`,blending:jr,depthTest:!1,depthWrite:!1})}function Lv(){return new yr({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:_d(),fragmentShader:`

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
		`,blending:jr,depthTest:!1,depthWrite:!1})}function Dv(){return new yr({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:_d(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:jr,depthTest:!1,depthWrite:!1})}function _d(){return`

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
	`}class Cy extends gr{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const r={width:e,height:e,depth:1},a=[r,r,r,r,r,r];this.texture=new Sy(a),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const r={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},a=new ic(5,5,5),l=new yr({name:"CubemapFromEquirect",uniforms:Fo(r.uniforms),vertexShader:r.vertexShader,fragmentShader:r.fragmentShader,side:hi,blending:jr});l.uniforms.tEquirect.value=t;const c=new Zi(a,l),d=t.minFilter;return t.minFilter===da&&(t.minFilter=Wn),new Jb(1,10,this).update(e,c),t.minFilter=d,c.geometry.dispose(),c.material.dispose(),this}clear(e,t=!0,r=!0,a=!0){const l=e.getRenderTarget();for(let c=0;c<6;c++)e.setRenderTarget(this,c),e.clear(t,r,a);e.setRenderTarget(l)}}function YR(i){let e=new WeakMap,t=new WeakMap,r=null;function a(x,M=!1){return x==null?null:M?c(x):l(x)}function l(x){if(x&&x.isTexture){const M=x.mapping;if(M===df||M===hf)if(e.has(x)){const E=e.get(x).texture;return d(E,x.mapping)}else{const E=x.image;if(E&&E.height>0){const w=new Cy(E.height);return w.fromEquirectangularTexture(i,x),e.set(x,w),x.addEventListener("dispose",f),d(w.texture,x.mapping)}else return null}}return x}function c(x){if(x&&x.isTexture){const M=x.mapping,E=M===df||M===hf,w=M===ba||M===Io;if(E||w){let _=t.get(x);const y=_!==void 0?_.texture.pmremVersion:0;if(x.isRenderTargetTexture&&x.pmremVersion!==y)return r===null&&(r=new Pv(i)),_=E?r.fromEquirectangular(x,_):r.fromCubemap(x,_),_.texture.pmremVersion=x.pmremVersion,t.set(x,_),_.texture;if(_!==void 0)return _.texture;{const L=x.image;return E&&L&&L.height>0||w&&L&&h(L)?(r===null&&(r=new Pv(i)),_=E?r.fromEquirectangular(x):r.fromCubemap(x),_.texture.pmremVersion=x.pmremVersion,t.set(x,_),x.addEventListener("dispose",m),_.texture):null}}}return x}function d(x,M){return M===df?x.mapping=ba:M===hf&&(x.mapping=Io),x}function h(x){let M=0;const E=6;for(let w=0;w<E;w++)x[w]!==void 0&&M++;return M===E}function f(x){const M=x.target;M.removeEventListener("dispose",f);const E=e.get(M);E!==void 0&&(e.delete(M),E.dispose())}function m(x){const M=x.target;M.removeEventListener("dispose",m);const E=t.get(M);E!==void 0&&(t.delete(M),E.dispose())}function g(){e=new WeakMap,t=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:a,dispose:g}}function KR(i){const e={};function t(r){if(e[r]!==void 0)return e[r];const a=i.getExtension(r);return e[r]=a,a}return{has:function(r){return t(r)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(r){const a=t(r);return a===null&&vo("WebGLRenderer: "+r+" extension not supported."),a}}}function QR(i,e,t,r){const a={},l=new WeakMap;function c(g){const x=g.target;x.index!==null&&e.remove(x.index);for(const E in x.attributes)e.remove(x.attributes[E]);x.removeEventListener("dispose",c),delete a[x.id];const M=l.get(x);M&&(e.remove(M),l.delete(x)),r.releaseStatesOfGeometry(x),x.isInstancedBufferGeometry===!0&&delete x._maxInstanceCount,t.memory.geometries--}function d(g,x){return a[x.id]===!0||(x.addEventListener("dispose",c),a[x.id]=!0,t.memory.geometries++),x}function h(g){const x=g.attributes;for(const M in x)e.update(x[M],i.ARRAY_BUFFER)}function f(g){const x=[],M=g.index,E=g.attributes.position;let w=0;if(E===void 0)return;if(M!==null){const L=M.array;w=M.version;for(let P=0,T=L.length;P<T;P+=3){const U=L[P+0],N=L[P+1],O=L[P+2];x.push(U,N,N,O,O,U)}}else{const L=E.array;w=E.version;for(let P=0,T=L.length/3-1;P<T;P+=3){const U=P+0,N=P+1,O=P+2;x.push(U,N,N,O,O,U)}}const _=new(E.count>=65535?_y:vy)(x,1);_.version=w;const y=l.get(g);y&&e.remove(y),l.set(g,_)}function m(g){const x=l.get(g);if(x){const M=g.index;M!==null&&x.version<M.version&&f(g)}else f(g);return l.get(g)}return{get:d,update:h,getWireframeAttribute:m}}function ZR(i,e,t){let r;function a(g){r=g}let l,c;function d(g){l=g.type,c=g.bytesPerElement}function h(g,x){i.drawElements(r,x,l,g*c),t.update(x,r,1)}function f(g,x,M){M!==0&&(i.drawElementsInstanced(r,x,l,g*c,M),t.update(x,r,M))}function m(g,x,M){if(M===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(r,x,0,l,g,0,M);let w=0;for(let _=0;_<M;_++)w+=x[_];t.update(w,r,1)}this.setMode=a,this.setIndex=d,this.render=h,this.renderInstances=f,this.renderMultiDraw=m}function JR(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function r(l,c,d){switch(t.calls++,c){case i.TRIANGLES:t.triangles+=d*(l/3);break;case i.LINES:t.lines+=d*(l/2);break;case i.LINE_STRIP:t.lines+=d*(l-1);break;case i.LINE_LOOP:t.lines+=d*l;break;case i.POINTS:t.points+=d*l;break;default:Dt("WebGLInfo: Unknown draw mode:",c);break}}function a(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:a,update:r}}function eA(i,e,t){const r=new WeakMap,a=new un;function l(c,d,h){const f=c.morphTargetInfluences,m=d.morphAttributes.position||d.morphAttributes.normal||d.morphAttributes.color,g=m!==void 0?m.length:0;let x=r.get(d);if(x===void 0||x.count!==g){let W=function(){b.dispose(),r.delete(d),d.removeEventListener("dispose",W)};var M=W;x!==void 0&&x.texture.dispose();const E=d.morphAttributes.position!==void 0,w=d.morphAttributes.normal!==void 0,_=d.morphAttributes.color!==void 0,y=d.morphAttributes.position||[],L=d.morphAttributes.normal||[],P=d.morphAttributes.color||[];let T=0;E===!0&&(T=1),w===!0&&(T=2),_===!0&&(T=3);let U=d.attributes.position.count*T,N=1;U>e.maxTextureSize&&(N=Math.ceil(U/e.maxTextureSize),U=e.maxTextureSize);const O=new Float32Array(U*N*4*g),b=new my(O,U,N,g);b.type=fr,b.needsUpdate=!0;const I=T*4;for(let V=0;V<g;V++){const J=y[V],se=L[V],j=P[V],k=U*N*4*V;for(let oe=0;oe<J.count;oe++){const te=oe*I;E===!0&&(a.fromBufferAttribute(J,oe),O[k+te+0]=a.x,O[k+te+1]=a.y,O[k+te+2]=a.z,O[k+te+3]=0),w===!0&&(a.fromBufferAttribute(se,oe),O[k+te+4]=a.x,O[k+te+5]=a.y,O[k+te+6]=a.z,O[k+te+7]=0),_===!0&&(a.fromBufferAttribute(j,oe),O[k+te+8]=a.x,O[k+te+9]=a.y,O[k+te+10]=a.z,O[k+te+11]=j.itemSize===4?a.w:1)}}x={count:g,texture:b,size:new dt(U,N)},r.set(d,x),d.addEventListener("dispose",W)}if(c.isInstancedMesh===!0&&c.morphTexture!==null)h.getUniforms().setValue(i,"morphTexture",c.morphTexture,t);else{let E=0;for(let _=0;_<f.length;_++)E+=f[_];const w=d.morphTargetsRelative?1:1-E;h.getUniforms().setValue(i,"morphTargetBaseInfluence",w),h.getUniforms().setValue(i,"morphTargetInfluences",f)}h.getUniforms().setValue(i,"morphTargetsTexture",x.texture,t),h.getUniforms().setValue(i,"morphTargetsTextureSize",x.size)}return{update:l}}function tA(i,e,t,r,a){let l=new WeakMap;function c(f){const m=a.render.frame,g=f.geometry,x=e.get(f,g);if(l.get(x)!==m&&(e.update(x),l.set(x,m)),f.isInstancedMesh&&(f.hasEventListener("dispose",h)===!1&&f.addEventListener("dispose",h),l.get(f)!==m&&(t.update(f.instanceMatrix,i.ARRAY_BUFFER),f.instanceColor!==null&&t.update(f.instanceColor,i.ARRAY_BUFFER),l.set(f,m))),f.isSkinnedMesh){const M=f.skeleton;l.get(M)!==m&&(M.update(),l.set(M,m))}return x}function d(){l=new WeakMap}function h(f){const m=f.target;m.removeEventListener("dispose",h),r.releaseStatesOfObject(m),t.remove(m.instanceMatrix),m.instanceColor!==null&&t.remove(m.instanceColor)}return{update:c,dispose:d}}const nA={[ey]:"LINEAR_TONE_MAPPING",[ty]:"REINHARD_TONE_MAPPING",[ny]:"CINEON_TONE_MAPPING",[Rm]:"ACES_FILMIC_TONE_MAPPING",[ry]:"AGX_TONE_MAPPING",[sy]:"NEUTRAL_TONE_MAPPING",[iy]:"CUSTOM_TONE_MAPPING"};function iA(i,e,t,r,a,l){const c=new gr(e,t,{type:i,depthBuffer:a,stencilBuffer:l,samples:r?4:0,depthTexture:a?new Uo(e,t):void 0}),d=new gr(e,t,{type:qr,depthBuffer:!1,stencilBuffer:!1}),h=new Mi;h.setAttribute("position",new Un([-1,3,0,-1,-1,0,3,-1,0],3)),h.setAttribute("uv",new Un([0,2,0,0,2,0],2));const f=new zb({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),m=new Zi(h,f),g=new Bm(-1,1,1,-1,0,1);let x=null,M=null,E=!1,w,_=null,y=[],L=!1;this.setSize=function(P,T){c.setSize(P,T),d.setSize(P,T);for(let U=0;U<y.length;U++){const N=y[U];N.setSize&&N.setSize(P,T)}},this.setEffects=function(P){y=P,L=y.length>0&&y[0].isRenderPass===!0;const T=c.width,U=c.height;for(let N=0;N<y.length;N++){const O=y[N];O.setSize&&O.setSize(T,U)}},this.begin=function(P,T){if(E||P.toneMapping===mr&&y.length===0)return!1;if(_=T,T!==null){const U=T.width,N=T.height;(c.width!==U||c.height!==N)&&this.setSize(U,N)}return L===!1&&P.setRenderTarget(c),w=P.toneMapping,P.toneMapping=mr,!0},this.hasRenderPass=function(){return L},this.end=function(P,T){P.toneMapping=w,E=!0;let U=c,N=d;for(let O=0;O<y.length;O++){const b=y[O];if(b.enabled!==!1&&(b.render(P,N,U,T),b.needsSwap!==!1)){const I=U;U=N,N=I}}if(x!==P.outputColorSpace||M!==P.toneMapping){x=P.outputColorSpace,M=P.toneMapping,f.defines={},At.getTransfer(x)===Vt&&(f.defines.SRGB_TRANSFER="");const O=nA[M];O&&(f.defines[O]=""),f.needsUpdate=!0}f.uniforms.tDiffuse.value=U.texture,P.setRenderTarget(_),P.render(m,g),_=null,E=!1},this.isCompositing=function(){return E},this.dispose=function(){c.depthTexture&&c.depthTexture.dispose(),c.dispose(),d.dispose(),h.dispose(),f.dispose()}}const Ry=new Xn,nm=new Uo(1,1),Ay=new my,Py=new mb,Ny=new Sy,Iv=[],Uv=[],Fv=new Float32Array(16),Ov=new Float32Array(9),kv=new Float32Array(4);function Vo(i,e,t){const r=i[0];if(r<=0||r>0)return i;const a=e*t;let l=Iv[a];if(l===void 0&&(l=new Float32Array(a),Iv[a]=l),e!==0){r.toArray(l,0);for(let c=1,d=0;c!==e;++c)d+=t,i[c].toArray(l,d)}return l}function bn(i,e){if(i.length!==e.length)return!1;for(let t=0,r=i.length;t<r;t++)if(i[t]!==e[t])return!1;return!0}function Tn(i,e){for(let t=0,r=e.length;t<r;t++)i[t]=e[t]}function yd(i,e){let t=Uv[e];t===void 0&&(t=new Int32Array(e),Uv[e]=t);for(let r=0;r!==e;++r)t[r]=i.allocateTextureUnit();return t}function rA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function sA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(bn(t,e))return;i.uniform2fv(this.addr,e),Tn(t,e)}}function aA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(bn(t,e))return;i.uniform3fv(this.addr,e),Tn(t,e)}}function oA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(bn(t,e))return;i.uniform4fv(this.addr,e),Tn(t,e)}}function lA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(bn(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),Tn(t,e)}else{if(bn(t,r))return;kv.set(r),i.uniformMatrix2fv(this.addr,!1,kv),Tn(t,r)}}function cA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(bn(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),Tn(t,e)}else{if(bn(t,r))return;Ov.set(r),i.uniformMatrix3fv(this.addr,!1,Ov),Tn(t,r)}}function uA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(bn(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),Tn(t,e)}else{if(bn(t,r))return;Fv.set(r),i.uniformMatrix4fv(this.addr,!1,Fv),Tn(t,r)}}function dA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function hA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(bn(t,e))return;i.uniform2iv(this.addr,e),Tn(t,e)}}function fA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(bn(t,e))return;i.uniform3iv(this.addr,e),Tn(t,e)}}function pA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(bn(t,e))return;i.uniform4iv(this.addr,e),Tn(t,e)}}function mA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function gA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(bn(t,e))return;i.uniform2uiv(this.addr,e),Tn(t,e)}}function xA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(bn(t,e))return;i.uniform3uiv(this.addr,e),Tn(t,e)}}function vA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(bn(t,e))return;i.uniform4uiv(this.addr,e),Tn(t,e)}}function _A(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a);let l;this.type===i.SAMPLER_2D_SHADOW?(nm.compareFunction=t.isReversedDepthBuffer()?Fm:Um,l=nm):l=Ry,t.setTexture2D(e||l,a)}function yA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTexture3D(e||Py,a)}function SA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTextureCube(e||Ny,a)}function MA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTexture2DArray(e||Ay,a)}function EA(i){switch(i){case 5126:return rA;case 35664:return sA;case 35665:return aA;case 35666:return oA;case 35674:return lA;case 35675:return cA;case 35676:return uA;case 5124:case 35670:return dA;case 35667:case 35671:return hA;case 35668:case 35672:return fA;case 35669:case 35673:return pA;case 5125:return mA;case 36294:return gA;case 36295:return xA;case 36296:return vA;case 35678:case 36198:case 36298:case 36306:case 35682:return _A;case 35679:case 36299:case 36307:return yA;case 35680:case 36300:case 36308:case 36293:return SA;case 36289:case 36303:case 36311:case 36292:return MA}}function wA(i,e){i.uniform1fv(this.addr,e)}function bA(i,e){const t=Vo(e,this.size,2);i.uniform2fv(this.addr,t)}function TA(i,e){const t=Vo(e,this.size,3);i.uniform3fv(this.addr,t)}function CA(i,e){const t=Vo(e,this.size,4);i.uniform4fv(this.addr,t)}function RA(i,e){const t=Vo(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function AA(i,e){const t=Vo(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function PA(i,e){const t=Vo(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function NA(i,e){i.uniform1iv(this.addr,e)}function LA(i,e){i.uniform2iv(this.addr,e)}function DA(i,e){i.uniform3iv(this.addr,e)}function IA(i,e){i.uniform4iv(this.addr,e)}function UA(i,e){i.uniform1uiv(this.addr,e)}function FA(i,e){i.uniform2uiv(this.addr,e)}function OA(i,e){i.uniform3uiv(this.addr,e)}function kA(i,e){i.uniform4uiv(this.addr,e)}function zA(i,e,t){const r=this.cache,a=e.length,l=yd(t,a);bn(r,l)||(i.uniform1iv(this.addr,l),Tn(r,l));let c;this.type===i.SAMPLER_2D_SHADOW?c=nm:c=Ry;for(let d=0;d!==a;++d)t.setTexture2D(e[d]||c,l[d])}function BA(i,e,t){const r=this.cache,a=e.length,l=yd(t,a);bn(r,l)||(i.uniform1iv(this.addr,l),Tn(r,l));for(let c=0;c!==a;++c)t.setTexture3D(e[c]||Py,l[c])}function HA(i,e,t){const r=this.cache,a=e.length,l=yd(t,a);bn(r,l)||(i.uniform1iv(this.addr,l),Tn(r,l));for(let c=0;c!==a;++c)t.setTextureCube(e[c]||Ny,l[c])}function VA(i,e,t){const r=this.cache,a=e.length,l=yd(t,a);bn(r,l)||(i.uniform1iv(this.addr,l),Tn(r,l));for(let c=0;c!==a;++c)t.setTexture2DArray(e[c]||Ay,l[c])}function GA(i){switch(i){case 5126:return wA;case 35664:return bA;case 35665:return TA;case 35666:return CA;case 35674:return RA;case 35675:return AA;case 35676:return PA;case 5124:case 35670:return NA;case 35667:case 35671:return LA;case 35668:case 35672:return DA;case 35669:case 35673:return IA;case 5125:return UA;case 36294:return FA;case 36295:return OA;case 36296:return kA;case 35678:case 36198:case 36298:case 36306:case 35682:return zA;case 35679:case 36299:case 36307:return BA;case 35680:case 36300:case 36308:case 36293:return HA;case 36289:case 36303:case 36311:case 36292:return VA}}class jA{constructor(e,t,r){this.id=e,this.addr=r,this.cache=[],this.type=t.type,this.setValue=EA(t.type)}}class WA{constructor(e,t,r){this.id=e,this.addr=r,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=GA(t.type)}}class XA{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,r){const a=this.seq;for(let l=0,c=a.length;l!==c;++l){const d=a[l];d.setValue(e,t[d.id],r)}}}const Xf=/(\w+)(\])?(\[|\.)?/g;function zv(i,e){i.seq.push(e),i.map[e.id]=e}function $A(i,e,t){const r=i.name,a=r.length;for(Xf.lastIndex=0;;){const l=Xf.exec(r),c=Xf.lastIndex;let d=l[1];const h=l[2]==="]",f=l[3];if(h&&(d=d|0),f===void 0||f==="["&&c+2===a){zv(t,f===void 0?new jA(d,i,e):new WA(d,i,e));break}else{let g=t.map[d];g===void 0&&(g=new XA(d),zv(t,g)),t=g}}}class Zu{constructor(e,t){this.seq=[],this.map={};const r=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let c=0;c<r;++c){const d=e.getActiveUniform(t,c),h=e.getUniformLocation(t,d.name);$A(d,h,this)}const a=[],l=[];for(const c of this.seq)c.type===e.SAMPLER_2D_SHADOW||c.type===e.SAMPLER_CUBE_SHADOW||c.type===e.SAMPLER_2D_ARRAY_SHADOW?a.push(c):l.push(c);a.length>0&&(this.seq=a.concat(l))}setValue(e,t,r,a){const l=this.map[t];l!==void 0&&l.setValue(e,r,a)}setOptional(e,t,r){const a=t[r];a!==void 0&&this.setValue(e,r,a)}static upload(e,t,r,a){for(let l=0,c=t.length;l!==c;++l){const d=t[l],h=r[d.id];h.needsUpdate!==!1&&d.setValue(e,h.value,a)}}static seqWithValue(e,t){const r=[];for(let a=0,l=e.length;a!==l;++a){const c=e[a];c.id in t&&r.push(c)}return r}}function Bv(i,e,t){const r=i.createShader(e);return i.shaderSource(r,t),i.compileShader(r),r}const qA=37297;let YA=0;function KA(i,e){const t=i.split(`
`),r=[],a=Math.max(e-6,0),l=Math.min(e+6,t.length);for(let c=a;c<l;c++){const d=c+1;r.push(`${d===e?">":" "} ${d}: ${t[c]}`)}return r.join(`
`)}const Hv=new pt;function QA(i){At._getMatrix(Hv,At.workingColorSpace,i);const e=`mat3( ${Hv.elements.map(t=>t.toFixed(4))} )`;switch(At.getTransfer(i)){case od:return[e,"LinearTransferOETF"];case Vt:return[e,"sRGBTransferOETF"];default:return lt("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function Vv(i,e,t){const r=i.getShaderParameter(e,i.COMPILE_STATUS),l=(i.getShaderInfoLog(e)||"").trim();if(r&&l==="")return"";const c=/ERROR: 0:(\d+)/.exec(l);if(c){const d=parseInt(c[1]);return t.toUpperCase()+`

`+l+`

`+KA(i.getShaderSource(e),d)}else return l}function ZA(i,e){const t=QA(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const JA={[ey]:"Linear",[ty]:"Reinhard",[ny]:"Cineon",[Rm]:"ACESFilmic",[ry]:"AgX",[sy]:"Neutral",[iy]:"Custom"};function eP(i,e){const t=JA[e];return t===void 0?(lt("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const ku=new ne;function tP(){At.getLuminanceCoefficients(ku);const i=ku.x.toFixed(4),e=ku.y.toFixed(4),t=ku.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function nP(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(kl).join(`
`)}function iP(i){const e=[];for(const t in i){const r=i[t];r!==!1&&e.push("#define "+t+" "+r)}return e.join(`
`)}function rP(i,e){const t={},r=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let a=0;a<r;a++){const l=i.getActiveAttrib(e,a),c=l.name;let d=1;l.type===i.FLOAT_MAT2&&(d=2),l.type===i.FLOAT_MAT3&&(d=3),l.type===i.FLOAT_MAT4&&(d=4),t[c]={type:l.type,location:i.getAttribLocation(e,c),locationSize:d}}return t}function kl(i){return i!==""}function Gv(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function jv(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const sP=/^[ \t]*#include +<([\w\d./]+)>/gm;function im(i){return i.replace(sP,oP)}const aP=new Map;function oP(i,e){let t=_t[e];if(t===void 0){const r=aP.get(e);if(r!==void 0)t=_t[r],lt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,r);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return im(t)}const lP=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Wv(i){return i.replace(lP,cP)}function cP(i,e,t,r){let a="";for(let l=parseInt(e);l<parseInt(t);l++)a+=r.replace(/\[\s*i\s*\]/g,"[ "+l+" ]").replace(/UNROLLED_LOOP_INDEX/g,l);return a}function Xv(i){let e=`precision ${i.precision} float;
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
#define LOW_PRECISION`),e}const uP={[Wu]:"SHADOWMAP_TYPE_PCF",[Ul]:"SHADOWMAP_TYPE_VSM"};function dP(i){return uP[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const hP={[ba]:"ENVMAP_TYPE_CUBE",[Io]:"ENVMAP_TYPE_CUBE",[gd]:"ENVMAP_TYPE_CUBE_UV"};function fP(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":hP[i.envMapMode]||"ENVMAP_TYPE_CUBE"}const pP={[Io]:"ENVMAP_MODE_REFRACTION"};function mP(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":pP[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}const gP={[Cm]:"ENVMAP_BLENDING_MULTIPLY",[$w]:"ENVMAP_BLENDING_MIX",[qw]:"ENVMAP_BLENDING_ADD"};function xP(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":gP[i.combine]||"ENVMAP_BLENDING_NONE"}function vP(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,r=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:r,maxMip:t}}function _P(i,e,t,r){const a=i.getContext(),l=t.defines;let c=t.vertexShader,d=t.fragmentShader;const h=dP(t),f=fP(t),m=mP(t),g=xP(t),x=vP(t),M=nP(t),E=iP(l),w=a.createProgram();let _,y,L=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(_=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E].filter(kl).join(`
`),_.length>0&&(_+=`
`),y=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E].filter(kl).join(`
`),y.length>0&&(y+=`
`)):(_=[Xv(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+m:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+h:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(kl).join(`
`),y=[Xv(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+f:"",t.envMap?"#define "+m:"",t.envMap?"#define "+g:"",x?"#define CUBEUV_TEXEL_WIDTH "+x.texelWidth:"",x?"#define CUBEUV_TEXEL_HEIGHT "+x.texelHeight:"",x?"#define CUBEUV_MAX_MIP "+x.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+h:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==mr?"#define TONE_MAPPING":"",t.toneMapping!==mr?_t.tonemapping_pars_fragment:"",t.toneMapping!==mr?eP("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",_t.colorspace_pars_fragment,ZA("linearToOutputTexel",t.outputColorSpace),tP(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(kl).join(`
`)),c=im(c),c=Gv(c,t),c=jv(c,t),d=im(d),d=Gv(d,t),d=jv(d,t),c=Wv(c),d=Wv(d),t.isRawShaderMaterial!==!0&&(L=`#version 300 es
`,_=[M,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+_,y=["#define varying in",t.glslVersion===Yx?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Yx?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+y);const P=L+_+c,T=L+y+d,U=Bv(a,a.VERTEX_SHADER,P),N=Bv(a,a.FRAGMENT_SHADER,T);a.attachShader(w,U),a.attachShader(w,N),t.index0AttributeName!==void 0?a.bindAttribLocation(w,0,t.index0AttributeName):t.hasPositionAttribute===!0&&a.bindAttribLocation(w,0,"position"),a.linkProgram(w);function O(V){if(i.debug.checkShaderErrors){const J=a.getProgramInfoLog(w)||"",se=a.getShaderInfoLog(U)||"",j=a.getShaderInfoLog(N)||"",k=J.trim(),oe=se.trim(),te=j.trim();let K=!0,he=!0;if(a.getProgramParameter(w,a.LINK_STATUS)===!1)if(K=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(a,w,U,N);else{const de=Vv(a,U,"vertex"),z=Vv(a,N,"fragment");Dt("WebGLProgram: Shader Error "+a.getError()+" - VALIDATE_STATUS "+a.getProgramParameter(w,a.VALIDATE_STATUS)+`

Material Name: `+V.name+`
Material Type: `+V.type+`

Program Info Log: `+k+`
`+de+`
`+z)}else k!==""?lt("WebGLProgram: Program Info Log:",k):(oe===""||te==="")&&(he=!1);he&&(V.diagnostics={runnable:K,programLog:k,vertexShader:{log:oe,prefix:_},fragmentShader:{log:te,prefix:y}})}a.deleteShader(U),a.deleteShader(N),b=new Zu(a,w),I=rP(a,w)}let b;this.getUniforms=function(){return b===void 0&&O(this),b};let I;this.getAttributes=function(){return I===void 0&&O(this),I};let W=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return W===!1&&(W=a.getProgramParameter(w,qA)),W},this.destroy=function(){r.releaseStatesOfProgram(this),a.deleteProgram(w),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=YA++,this.cacheKey=e,this.usedTimes=1,this.program=w,this.vertexShader=U,this.fragmentShader=N,this}let yP=0;class SP{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,r){const a=this._getShaderCacheForMaterial(e);return a.has(t)===!1&&(a.add(t),t.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const r of t)r.usedTimes--,r.usedTimes===0&&this.shaderCache.delete(r.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let r=t.get(e);return r===void 0&&(r=new Set,t.set(e,r)),r}_getShaderStage(e){const t=this.shaderCache;let r=t.get(e);return r===void 0&&(r=new MP(e),t.set(e,r)),r}}class MP{constructor(e){this.id=yP++,this.code=e,this.usedTimes=0}}function EP(i){return i===Ta||i===id||i===rd}function wP(i,e,t,r,a,l){const c=new gy,d=new SP,h=new Set,f=[],m=new Map,g=r.logarithmicDepthBuffer;let x=r.precision;const M={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function E(b){return h.add(b),b===0?"uv":`uv${b}`}function w(b,I,W,V,J,se){const j=V.fog,k=J.geometry,oe=b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial?V.environment:null,te=b.isMeshStandardMaterial||b.isMeshLambertMaterial&&!b.envMap||b.isMeshPhongMaterial&&!b.envMap,K=e.get(b.envMap||oe,te),he=K&&K.mapping===gd?K.image.height:null,de=M[b.type];b.precision!==null&&(x=r.getMaxPrecision(b.precision),x!==b.precision&&lt("WebGLProgram.getParameters:",b.precision,"not supported, using",x,"instead."));const z=k.morphAttributes.position||k.morphAttributes.normal||k.morphAttributes.color,q=z!==void 0?z.length:0;let Ie=0;k.morphAttributes.position!==void 0&&(Ie=1),k.morphAttributes.normal!==void 0&&(Ie=2),k.morphAttributes.color!==void 0&&(Ie=3);let Be,Ge,ce,ye;if(de){const $e=dr[de];Be=$e.vertexShader,Ge=$e.fragmentShader}else{Be=b.vertexShader,Ge=b.fragmentShader;const $e=d.getVertexShaderStage(b),jt=d.getFragmentShaderStage(b);d.update(b,$e,jt),ce=$e.id,ye=jt.id}const ge=i.getRenderTarget(),Ue=i.state.buffers.depth.getReversed(),Ze=J.isInstancedMesh===!0,tt=J.isBatchedMesh===!0,Gt=!!b.map,ut=!!b.matcap,Ct=!!K,mt=!!b.aoMap,vt=!!b.lightMap,kt=!!b.bumpMap&&b.wireframe===!1,Xt=!!b.normalMap,qt=!!b.displacementMap,$t=!!b.emissiveMap,Et=!!b.metalnessMap,zt=!!b.roughnessMap,Y=b.anisotropy>0,pn=b.clearcoat>0,wt=b.dispersion>0,F=b.iridescence>0,C=b.sheen>0,D=b.transmission>0,Z=Y&&!!b.anisotropyMap,me=pn&&!!b.clearcoatMap,Ee=pn&&!!b.clearcoatNormalMap,Re=pn&&!!b.clearcoatRoughnessMap,xe=F&&!!b.iridescenceMap,ve=F&&!!b.iridescenceThicknessMap,De=C&&!!b.sheenColorMap,We=C&&!!b.sheenRoughnessMap,ie=!!b.specularMap,Se=!!b.specularColorMap,Oe=!!b.specularIntensityMap,nt=D&&!!b.transmissionMap,st=D&&!!b.thicknessMap,$=!!b.gradientMap,Pe=!!b.alphaMap,_e=b.alphaTest>0,Le=!!b.alphaHash,Fe=!!b.extensions;let Me=mr;b.toneMapped&&(ge===null||ge.isXRRenderTarget===!0)&&(Me=i.toneMapping);const Ye={shaderID:de,shaderType:b.type,shaderName:b.name,vertexShader:Be,fragmentShader:Ge,defines:b.defines,customVertexShaderID:ce,customFragmentShaderID:ye,isRawShaderMaterial:b.isRawShaderMaterial===!0,glslVersion:b.glslVersion,precision:x,batching:tt,batchingColor:tt&&J._colorsTexture!==null,instancing:Ze,instancingColor:Ze&&J.instanceColor!==null,instancingMorph:Ze&&J.morphTexture!==null,outputColorSpace:ge===null?i.outputColorSpace:ge.isXRRenderTarget===!0?ge.texture.colorSpace:At.workingColorSpace,alphaToCoverage:!!b.alphaToCoverage,map:Gt,matcap:ut,envMap:Ct,envMapMode:Ct&&K.mapping,envMapCubeUVHeight:he,aoMap:mt,lightMap:vt,bumpMap:kt,normalMap:Xt,displacementMap:qt,emissiveMap:$t,normalMapObjectSpace:Xt&&b.normalMapType===Qw,normalMapTangentSpace:Xt&&b.normalMapType===sd,packedNormalMap:Xt&&b.normalMapType===sd&&EP(b.normalMap.format),metalnessMap:Et,roughnessMap:zt,anisotropy:Y,anisotropyMap:Z,clearcoat:pn,clearcoatMap:me,clearcoatNormalMap:Ee,clearcoatRoughnessMap:Re,dispersion:wt,iridescence:F,iridescenceMap:xe,iridescenceThicknessMap:ve,sheen:C,sheenColorMap:De,sheenRoughnessMap:We,specularMap:ie,specularColorMap:Se,specularIntensityMap:Oe,transmission:D,transmissionMap:nt,thicknessMap:st,gradientMap:$,opaque:b.transparent===!1&&b.blending===xo&&b.alphaToCoverage===!1,alphaMap:Pe,alphaTest:_e,alphaHash:Le,combine:b.combine,mapUv:Gt&&E(b.map.channel),aoMapUv:mt&&E(b.aoMap.channel),lightMapUv:vt&&E(b.lightMap.channel),bumpMapUv:kt&&E(b.bumpMap.channel),normalMapUv:Xt&&E(b.normalMap.channel),displacementMapUv:qt&&E(b.displacementMap.channel),emissiveMapUv:$t&&E(b.emissiveMap.channel),metalnessMapUv:Et&&E(b.metalnessMap.channel),roughnessMapUv:zt&&E(b.roughnessMap.channel),anisotropyMapUv:Z&&E(b.anisotropyMap.channel),clearcoatMapUv:me&&E(b.clearcoatMap.channel),clearcoatNormalMapUv:Ee&&E(b.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Re&&E(b.clearcoatRoughnessMap.channel),iridescenceMapUv:xe&&E(b.iridescenceMap.channel),iridescenceThicknessMapUv:ve&&E(b.iridescenceThicknessMap.channel),sheenColorMapUv:De&&E(b.sheenColorMap.channel),sheenRoughnessMapUv:We&&E(b.sheenRoughnessMap.channel),specularMapUv:ie&&E(b.specularMap.channel),specularColorMapUv:Se&&E(b.specularColorMap.channel),specularIntensityMapUv:Oe&&E(b.specularIntensityMap.channel),transmissionMapUv:nt&&E(b.transmissionMap.channel),thicknessMapUv:st&&E(b.thicknessMap.channel),alphaMapUv:Pe&&E(b.alphaMap.channel),vertexTangents:!!k.attributes.tangent&&(Xt||Y),vertexNormals:!!k.attributes.normal,vertexColors:b.vertexColors,vertexAlphas:b.vertexColors===!0&&!!k.attributes.color&&k.attributes.color.itemSize===4,pointsUvs:J.isPoints===!0&&!!k.attributes.uv&&(Gt||Pe),fog:!!j,useFog:b.fog===!0,fogExp2:!!j&&j.isFogExp2,flatShading:b.wireframe===!1&&(b.flatShading===!0||k.attributes.normal===void 0&&Xt===!1&&(b.isMeshLambertMaterial||b.isMeshPhongMaterial||b.isMeshStandardMaterial||b.isMeshPhysicalMaterial)),sizeAttenuation:b.sizeAttenuation===!0,logarithmicDepthBuffer:g,reversedDepthBuffer:Ue,skinning:J.isSkinnedMesh===!0,hasPositionAttribute:k.attributes.position!==void 0,morphTargets:k.morphAttributes.position!==void 0,morphNormals:k.morphAttributes.normal!==void 0,morphColors:k.morphAttributes.color!==void 0,morphTargetsCount:q,morphTextureStride:Ie,numDirLights:I.directional.length,numPointLights:I.point.length,numSpotLights:I.spot.length,numSpotLightMaps:I.spotLightMap.length,numRectAreaLights:I.rectArea.length,numHemiLights:I.hemi.length,numDirLightShadows:I.directionalShadowMap.length,numPointLightShadows:I.pointShadowMap.length,numSpotLightShadows:I.spotShadowMap.length,numSpotLightShadowsWithMaps:I.numSpotLightShadowsWithMaps,numLightProbes:I.numLightProbes,numLightProbeGrids:se.length,numClippingPlanes:l.numPlanes,numClipIntersection:l.numIntersection,dithering:b.dithering,shadowMapEnabled:i.shadowMap.enabled&&W.length>0,shadowMapType:i.shadowMap.type,toneMapping:Me,decodeVideoTexture:Gt&&b.map.isVideoTexture===!0&&At.getTransfer(b.map.colorSpace)===Vt,decodeVideoTextureEmissive:$t&&b.emissiveMap.isVideoTexture===!0&&At.getTransfer(b.emissiveMap.colorSpace)===Vt,premultipliedAlpha:b.premultipliedAlpha,doubleSided:b.side===hr,flipSided:b.side===hi,useDepthPacking:b.depthPacking>=0,depthPacking:b.depthPacking||0,index0AttributeName:b.index0AttributeName,extensionClipCullDistance:Fe&&b.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Fe&&b.extensions.multiDraw===!0||tt)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:b.customProgramCacheKey()};return Ye.vertexUv1s=h.has(1),Ye.vertexUv2s=h.has(2),Ye.vertexUv3s=h.has(3),h.clear(),Ye}function _(b){const I=[];if(b.shaderID?I.push(b.shaderID):(I.push(b.customVertexShaderID),I.push(b.customFragmentShaderID)),b.defines!==void 0)for(const W in b.defines)I.push(W),I.push(b.defines[W]);return b.isRawShaderMaterial===!1&&(y(I,b),L(I,b),I.push(i.outputColorSpace)),I.push(b.customProgramCacheKey),I.join()}function y(b,I){b.push(I.precision),b.push(I.outputColorSpace),b.push(I.envMapMode),b.push(I.envMapCubeUVHeight),b.push(I.mapUv),b.push(I.alphaMapUv),b.push(I.lightMapUv),b.push(I.aoMapUv),b.push(I.bumpMapUv),b.push(I.normalMapUv),b.push(I.displacementMapUv),b.push(I.emissiveMapUv),b.push(I.metalnessMapUv),b.push(I.roughnessMapUv),b.push(I.anisotropyMapUv),b.push(I.clearcoatMapUv),b.push(I.clearcoatNormalMapUv),b.push(I.clearcoatRoughnessMapUv),b.push(I.iridescenceMapUv),b.push(I.iridescenceThicknessMapUv),b.push(I.sheenColorMapUv),b.push(I.sheenRoughnessMapUv),b.push(I.specularMapUv),b.push(I.specularColorMapUv),b.push(I.specularIntensityMapUv),b.push(I.transmissionMapUv),b.push(I.thicknessMapUv),b.push(I.combine),b.push(I.fogExp2),b.push(I.sizeAttenuation),b.push(I.morphTargetsCount),b.push(I.morphAttributeCount),b.push(I.numDirLights),b.push(I.numPointLights),b.push(I.numSpotLights),b.push(I.numSpotLightMaps),b.push(I.numHemiLights),b.push(I.numRectAreaLights),b.push(I.numDirLightShadows),b.push(I.numPointLightShadows),b.push(I.numSpotLightShadows),b.push(I.numSpotLightShadowsWithMaps),b.push(I.numLightProbes),b.push(I.shadowMapType),b.push(I.toneMapping),b.push(I.numClippingPlanes),b.push(I.numClipIntersection),b.push(I.depthPacking)}function L(b,I){c.disableAll(),I.instancing&&c.enable(0),I.instancingColor&&c.enable(1),I.instancingMorph&&c.enable(2),I.matcap&&c.enable(3),I.envMap&&c.enable(4),I.normalMapObjectSpace&&c.enable(5),I.normalMapTangentSpace&&c.enable(6),I.clearcoat&&c.enable(7),I.iridescence&&c.enable(8),I.alphaTest&&c.enable(9),I.vertexColors&&c.enable(10),I.vertexAlphas&&c.enable(11),I.vertexUv1s&&c.enable(12),I.vertexUv2s&&c.enable(13),I.vertexUv3s&&c.enable(14),I.vertexTangents&&c.enable(15),I.anisotropy&&c.enable(16),I.alphaHash&&c.enable(17),I.batching&&c.enable(18),I.dispersion&&c.enable(19),I.batchingColor&&c.enable(20),I.gradientMap&&c.enable(21),I.packedNormalMap&&c.enable(22),I.vertexNormals&&c.enable(23),b.push(c.mask),c.disableAll(),I.fog&&c.enable(0),I.useFog&&c.enable(1),I.flatShading&&c.enable(2),I.logarithmicDepthBuffer&&c.enable(3),I.reversedDepthBuffer&&c.enable(4),I.skinning&&c.enable(5),I.morphTargets&&c.enable(6),I.morphNormals&&c.enable(7),I.morphColors&&c.enable(8),I.premultipliedAlpha&&c.enable(9),I.shadowMapEnabled&&c.enable(10),I.doubleSided&&c.enable(11),I.flipSided&&c.enable(12),I.useDepthPacking&&c.enable(13),I.dithering&&c.enable(14),I.transmission&&c.enable(15),I.sheen&&c.enable(16),I.opaque&&c.enable(17),I.pointsUvs&&c.enable(18),I.decodeVideoTexture&&c.enable(19),I.decodeVideoTextureEmissive&&c.enable(20),I.alphaToCoverage&&c.enable(21),I.numLightProbeGrids>0&&c.enable(22),I.hasPositionAttribute&&c.enable(23),b.push(c.mask)}function P(b){const I=M[b.type];let W;if(I){const V=dr[I];W=Fb.clone(V.uniforms)}else W=b.uniforms;return W}function T(b,I){let W=m.get(I);return W!==void 0?++W.usedTimes:(W=new _P(i,I,b,a),f.push(W),m.set(I,W)),W}function U(b){if(--b.usedTimes===0){const I=f.indexOf(b);f[I]=f[f.length-1],f.pop(),m.delete(b.cacheKey),b.destroy()}}function N(b){d.remove(b)}function O(){d.dispose()}return{getParameters:w,getProgramCacheKey:_,getUniforms:P,acquireProgram:T,releaseProgram:U,releaseShaderCache:N,programs:f,dispose:O}}function bP(){let i=new WeakMap;function e(c){return i.has(c)}function t(c){let d=i.get(c);return d===void 0&&(d={},i.set(c,d)),d}function r(c){i.delete(c)}function a(c,d,h){i.get(c)[d]=h}function l(){i=new WeakMap}return{has:e,get:t,remove:r,update:a,dispose:l}}function TP(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function $v(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function qv(){const i=[];let e=0;const t=[],r=[],a=[];function l(){e=0,t.length=0,r.length=0,a.length=0}function c(x){let M=0;return x.isInstancedMesh&&(M+=2),x.isSkinnedMesh&&(M+=1),M}function d(x,M,E,w,_,y){let L=i[e];return L===void 0?(L={id:x.id,object:x,geometry:M,material:E,materialVariant:c(x),groupOrder:w,renderOrder:x.renderOrder,z:_,group:y},i[e]=L):(L.id=x.id,L.object=x,L.geometry=M,L.material=E,L.materialVariant=c(x),L.groupOrder=w,L.renderOrder=x.renderOrder,L.z=_,L.group=y),e++,L}function h(x,M,E,w,_,y){const L=d(x,M,E,w,_,y);E.transmission>0?r.push(L):E.transparent===!0?a.push(L):t.push(L)}function f(x,M,E,w,_,y){const L=d(x,M,E,w,_,y);E.transmission>0?r.unshift(L):E.transparent===!0?a.unshift(L):t.unshift(L)}function m(x,M,E){t.length>1&&t.sort(x||TP),r.length>1&&r.sort(M||$v),a.length>1&&a.sort(M||$v),E&&(t.reverse(),r.reverse(),a.reverse())}function g(){for(let x=e,M=i.length;x<M;x++){const E=i[x];if(E.id===null)break;E.id=null,E.object=null,E.geometry=null,E.material=null,E.group=null}}return{opaque:t,transmissive:r,transparent:a,init:l,push:h,unshift:f,finish:g,sort:m}}function CP(){let i=new WeakMap;function e(r,a){const l=i.get(r);let c;return l===void 0?(c=new qv,i.set(r,[c])):a>=l.length?(c=new qv,l.push(c)):c=l[a],c}function t(){i=new WeakMap}return{get:e,dispose:t}}function RP(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new ne,color:new xt};break;case"SpotLight":t={position:new ne,direction:new ne,color:new xt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new ne,color:new xt,distance:0,decay:0};break;case"HemisphereLight":t={direction:new ne,skyColor:new xt,groundColor:new xt};break;case"RectAreaLight":t={color:new xt,position:new ne,halfWidth:new ne,halfHeight:new ne};break}return i[e.id]=t,t}}}function AP(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new dt};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new dt};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new dt,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let PP=0;function NP(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function LP(i){const e=new RP,t=AP(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let f=0;f<9;f++)r.probe.push(new ne);const a=new ne,l=new an,c=new an;function d(f){let m=0,g=0,x=0;for(let I=0;I<9;I++)r.probe[I].set(0,0,0);let M=0,E=0,w=0,_=0,y=0,L=0,P=0,T=0,U=0,N=0,O=0;f.sort(NP);for(let I=0,W=f.length;I<W;I++){const V=f[I],J=V.color,se=V.intensity,j=V.distance;let k=null;if(V.shadow&&V.shadow.map&&(V.shadow.map.texture.format===Ta?k=V.shadow.map.texture:k=V.shadow.map.depthTexture||V.shadow.map.texture),V.isAmbientLight)m+=J.r*se,g+=J.g*se,x+=J.b*se;else if(V.isLightProbe){for(let oe=0;oe<9;oe++)r.probe[oe].addScaledVector(V.sh.coefficients[oe],se);O++}else if(V.isDirectionalLight){const oe=e.get(V);if(oe.color.copy(V.color).multiplyScalar(V.intensity),V.castShadow){const te=V.shadow,K=t.get(V);K.shadowIntensity=te.intensity,K.shadowBias=te.bias,K.shadowNormalBias=te.normalBias,K.shadowRadius=te.radius,K.shadowMapSize=te.mapSize,r.directionalShadow[M]=K,r.directionalShadowMap[M]=k,r.directionalShadowMatrix[M]=V.shadow.matrix,L++}r.directional[M]=oe,M++}else if(V.isSpotLight){const oe=e.get(V);oe.position.setFromMatrixPosition(V.matrixWorld),oe.color.copy(J).multiplyScalar(se),oe.distance=j,oe.coneCos=Math.cos(V.angle),oe.penumbraCos=Math.cos(V.angle*(1-V.penumbra)),oe.decay=V.decay,r.spot[w]=oe;const te=V.shadow;if(V.map&&(r.spotLightMap[U]=V.map,U++,te.updateMatrices(V),V.castShadow&&N++),r.spotLightMatrix[w]=te.matrix,V.castShadow){const K=t.get(V);K.shadowIntensity=te.intensity,K.shadowBias=te.bias,K.shadowNormalBias=te.normalBias,K.shadowRadius=te.radius,K.shadowMapSize=te.mapSize,r.spotShadow[w]=K,r.spotShadowMap[w]=k,T++}w++}else if(V.isRectAreaLight){const oe=e.get(V);oe.color.copy(J).multiplyScalar(se),oe.halfWidth.set(V.width*.5,0,0),oe.halfHeight.set(0,V.height*.5,0),r.rectArea[_]=oe,_++}else if(V.isPointLight){const oe=e.get(V);if(oe.color.copy(V.color).multiplyScalar(V.intensity),oe.distance=V.distance,oe.decay=V.decay,V.castShadow){const te=V.shadow,K=t.get(V);K.shadowIntensity=te.intensity,K.shadowBias=te.bias,K.shadowNormalBias=te.normalBias,K.shadowRadius=te.radius,K.shadowMapSize=te.mapSize,K.shadowCameraNear=te.camera.near,K.shadowCameraFar=te.camera.far,r.pointShadow[E]=K,r.pointShadowMap[E]=k,r.pointShadowMatrix[E]=V.shadow.matrix,P++}r.point[E]=oe,E++}else if(V.isHemisphereLight){const oe=e.get(V);oe.skyColor.copy(V.color).multiplyScalar(se),oe.groundColor.copy(V.groundColor).multiplyScalar(se),r.hemi[y]=oe,y++}}_>0&&(i.has("OES_texture_float_linear")===!0?(r.rectAreaLTC1=ke.LTC_FLOAT_1,r.rectAreaLTC2=ke.LTC_FLOAT_2):(r.rectAreaLTC1=ke.LTC_HALF_1,r.rectAreaLTC2=ke.LTC_HALF_2)),r.ambient[0]=m,r.ambient[1]=g,r.ambient[2]=x;const b=r.hash;(b.directionalLength!==M||b.pointLength!==E||b.spotLength!==w||b.rectAreaLength!==_||b.hemiLength!==y||b.numDirectionalShadows!==L||b.numPointShadows!==P||b.numSpotShadows!==T||b.numSpotMaps!==U||b.numLightProbes!==O)&&(r.directional.length=M,r.spot.length=w,r.rectArea.length=_,r.point.length=E,r.hemi.length=y,r.directionalShadow.length=L,r.directionalShadowMap.length=L,r.pointShadow.length=P,r.pointShadowMap.length=P,r.spotShadow.length=T,r.spotShadowMap.length=T,r.directionalShadowMatrix.length=L,r.pointShadowMatrix.length=P,r.spotLightMatrix.length=T+U-N,r.spotLightMap.length=U,r.numSpotLightShadowsWithMaps=N,r.numLightProbes=O,b.directionalLength=M,b.pointLength=E,b.spotLength=w,b.rectAreaLength=_,b.hemiLength=y,b.numDirectionalShadows=L,b.numPointShadows=P,b.numSpotShadows=T,b.numSpotMaps=U,b.numLightProbes=O,r.version=PP++)}function h(f,m){let g=0,x=0,M=0,E=0,w=0;const _=m.matrixWorldInverse;for(let y=0,L=f.length;y<L;y++){const P=f[y];if(P.isDirectionalLight){const T=r.directional[g];T.direction.setFromMatrixPosition(P.matrixWorld),a.setFromMatrixPosition(P.target.matrixWorld),T.direction.sub(a),T.direction.transformDirection(_),g++}else if(P.isSpotLight){const T=r.spot[M];T.position.setFromMatrixPosition(P.matrixWorld),T.position.applyMatrix4(_),T.direction.setFromMatrixPosition(P.matrixWorld),a.setFromMatrixPosition(P.target.matrixWorld),T.direction.sub(a),T.direction.transformDirection(_),M++}else if(P.isRectAreaLight){const T=r.rectArea[E];T.position.setFromMatrixPosition(P.matrixWorld),T.position.applyMatrix4(_),c.identity(),l.copy(P.matrixWorld),l.premultiply(_),c.extractRotation(l),T.halfWidth.set(P.width*.5,0,0),T.halfHeight.set(0,P.height*.5,0),T.halfWidth.applyMatrix4(c),T.halfHeight.applyMatrix4(c),E++}else if(P.isPointLight){const T=r.point[x];T.position.setFromMatrixPosition(P.matrixWorld),T.position.applyMatrix4(_),x++}else if(P.isHemisphereLight){const T=r.hemi[w];T.direction.setFromMatrixPosition(P.matrixWorld),T.direction.transformDirection(_),w++}}}return{setup:d,setupView:h,state:r}}function Yv(i){const e=new LP(i),t=[],r=[],a=[];function l(x){g.camera=x,t.length=0,r.length=0,a.length=0}function c(x){t.push(x)}function d(x){r.push(x)}function h(x){a.push(x)}function f(){e.setup(t)}function m(x){e.setupView(t,x)}const g={lightsArray:t,shadowsArray:r,lightProbeGridArray:a,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:l,state:g,setupLights:f,setupLightsView:m,pushLight:c,pushShadow:d,pushLightProbeGrid:h}}function DP(i){let e=new WeakMap;function t(a,l=0){const c=e.get(a);let d;return c===void 0?(d=new Yv(i),e.set(a,[d])):l>=c.length?(d=new Yv(i),c.push(d)):d=c[l],d}function r(){e=new WeakMap}return{get:t,dispose:r}}const IP=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,UP=`uniform sampler2D shadow_pass;
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
}`,FP=[new ne(1,0,0),new ne(-1,0,0),new ne(0,1,0),new ne(0,-1,0),new ne(0,0,1),new ne(0,0,-1)],OP=[new ne(0,-1,0),new ne(0,-1,0),new ne(0,0,1),new ne(0,0,-1),new ne(0,-1,0),new ne(0,-1,0)],Kv=new an,Dl=new ne,$f=new ne;function kP(i,e,t){let r=new km;const a=new dt,l=new dt,c=new un,d=new Hb,h=new Vb,f={},m=t.maxTextureSize,g={[Fs]:hi,[hi]:Fs,[hr]:hr},x=new yr({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new dt},radius:{value:4}},vertexShader:IP,fragmentShader:UP}),M=x.clone();M.defines.HORIZONTAL_PASS=1;const E=new Mi;E.setAttribute("position",new xr(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const w=new Zi(E,x),_=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Wu;let y=this.type;this.render=function(N,O,b){if(_.enabled===!1||_.autoUpdate===!1&&_.needsUpdate===!1||N.length===0)return;this.type===Rw&&(lt("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Wu);const I=i.getRenderTarget(),W=i.getActiveCubeFace(),V=i.getActiveMipmapLevel(),J=i.state;J.setBlending(jr),J.buffers.depth.getReversed()===!0?J.buffers.color.setClear(0,0,0,0):J.buffers.color.setClear(1,1,1,1),J.buffers.depth.setTest(!0),J.setScissorTest(!1);const se=y!==this.type;se&&O.traverse(function(j){j.material&&(Array.isArray(j.material)?j.material.forEach(k=>k.needsUpdate=!0):j.material.needsUpdate=!0)});for(let j=0,k=N.length;j<k;j++){const oe=N[j],te=oe.shadow;if(te===void 0){lt("WebGLShadowMap:",oe,"has no shadow.");continue}if(te.autoUpdate===!1&&te.needsUpdate===!1)continue;a.copy(te.mapSize);const K=te.getFrameExtents();a.multiply(K),l.copy(te.mapSize),(a.x>m||a.y>m)&&(a.x>m&&(l.x=Math.floor(m/K.x),a.x=l.x*K.x,te.mapSize.x=l.x),a.y>m&&(l.y=Math.floor(m/K.y),a.y=l.y*K.y,te.mapSize.y=l.y));const he=i.state.buffers.depth.getReversed();if(te.camera._reversedDepth=he,te.map===null||se===!0){if(te.map!==null&&(te.map.depthTexture!==null&&(te.map.depthTexture.dispose(),te.map.depthTexture=null),te.map.dispose()),this.type===Ul){if(oe.isPointLight){lt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}te.map=new gr(a.x,a.y,{format:Ta,type:qr,minFilter:Wn,magFilter:Wn,generateMipmaps:!1}),te.map.texture.name=oe.name+".shadowMap",te.map.depthTexture=new Uo(a.x,a.y,fr),te.map.depthTexture.name=oe.name+".shadowMapDepth",te.map.depthTexture.format=Yr,te.map.depthTexture.compareFunction=null,te.map.depthTexture.minFilter=Fn,te.map.depthTexture.magFilter=Fn}else oe.isPointLight?(te.map=new Cy(a.x),te.map.depthTexture=new Ib(a.x,vr)):(te.map=new gr(a.x,a.y),te.map.depthTexture=new Uo(a.x,a.y,vr)),te.map.depthTexture.name=oe.name+".shadowMap",te.map.depthTexture.format=Yr,this.type===Wu?(te.map.depthTexture.compareFunction=he?Fm:Um,te.map.depthTexture.minFilter=Wn,te.map.depthTexture.magFilter=Wn):(te.map.depthTexture.compareFunction=null,te.map.depthTexture.minFilter=Fn,te.map.depthTexture.magFilter=Fn);te.camera.updateProjectionMatrix()}const de=te.map.isWebGLCubeRenderTarget?6:1;for(let z=0;z<de;z++){if(te.map.isWebGLCubeRenderTarget)i.setRenderTarget(te.map,z),i.clear();else{z===0&&(i.setRenderTarget(te.map),i.clear());const q=te.getViewport(z);c.set(l.x*q.x,l.y*q.y,l.x*q.z,l.y*q.w),J.viewport(c)}if(oe.isPointLight){const q=te.camera,Ie=te.matrix,Be=oe.distance||q.far;Be!==q.far&&(q.far=Be,q.updateProjectionMatrix()),Dl.setFromMatrixPosition(oe.matrixWorld),q.position.copy(Dl),$f.copy(q.position),$f.add(FP[z]),q.up.copy(OP[z]),q.lookAt($f),q.updateMatrixWorld(),Ie.makeTranslation(-Dl.x,-Dl.y,-Dl.z),Kv.multiplyMatrices(q.projectionMatrix,q.matrixWorldInverse),te._frustum.setFromProjectionMatrix(Kv,q.coordinateSystem,q.reversedDepth)}else te.updateMatrices(oe);r=te.getFrustum(),T(O,b,te.camera,oe,this.type)}te.isPointLightShadow!==!0&&this.type===Ul&&L(te,b),te.needsUpdate=!1}y=this.type,_.needsUpdate=!1,i.setRenderTarget(I,W,V)};function L(N,O){const b=e.update(w);x.defines.VSM_SAMPLES!==N.blurSamples&&(x.defines.VSM_SAMPLES=N.blurSamples,M.defines.VSM_SAMPLES=N.blurSamples,x.needsUpdate=!0,M.needsUpdate=!0),N.mapPass===null&&(N.mapPass=new gr(a.x,a.y,{format:Ta,type:qr})),x.uniforms.shadow_pass.value=N.map.depthTexture,x.uniforms.resolution.value=N.mapSize,x.uniforms.radius.value=N.radius,i.setRenderTarget(N.mapPass),i.clear(),i.renderBufferDirect(O,null,b,x,w,null),M.uniforms.shadow_pass.value=N.mapPass.texture,M.uniforms.resolution.value=N.mapSize,M.uniforms.radius.value=N.radius,i.setRenderTarget(N.map),i.clear(),i.renderBufferDirect(O,null,b,M,w,null)}function P(N,O,b,I){let W=null;const V=b.isPointLight===!0?N.customDistanceMaterial:N.customDepthMaterial;if(V!==void 0)W=V;else if(W=b.isPointLight===!0?h:d,i.localClippingEnabled&&O.clipShadows===!0&&Array.isArray(O.clippingPlanes)&&O.clippingPlanes.length!==0||O.displacementMap&&O.displacementScale!==0||O.alphaMap&&O.alphaTest>0||O.map&&O.alphaTest>0||O.alphaToCoverage===!0){const J=W.uuid,se=O.uuid;let j=f[J];j===void 0&&(j={},f[J]=j);let k=j[se];k===void 0&&(k=W.clone(),j[se]=k,O.addEventListener("dispose",U)),W=k}if(W.visible=O.visible,W.wireframe=O.wireframe,I===Ul?W.side=O.shadowSide!==null?O.shadowSide:O.side:W.side=O.shadowSide!==null?O.shadowSide:g[O.side],W.alphaMap=O.alphaMap,W.alphaTest=O.alphaToCoverage===!0?.5:O.alphaTest,W.map=O.map,W.clipShadows=O.clipShadows,W.clippingPlanes=O.clippingPlanes,W.clipIntersection=O.clipIntersection,W.displacementMap=O.displacementMap,W.displacementScale=O.displacementScale,W.displacementBias=O.displacementBias,W.wireframeLinewidth=O.wireframeLinewidth,W.linewidth=O.linewidth,b.isPointLight===!0&&W.isMeshDistanceMaterial===!0){const J=i.properties.get(W);J.light=b}return W}function T(N,O,b,I,W){if(N.visible===!1)return;if(N.layers.test(O.layers)&&(N.isMesh||N.isLine||N.isPoints)&&(N.castShadow||N.receiveShadow&&W===Ul)&&(!N.frustumCulled||r.intersectsObject(N))){N.modelViewMatrix.multiplyMatrices(b.matrixWorldInverse,N.matrixWorld);const se=e.update(N),j=N.material;if(Array.isArray(j)){const k=se.groups;for(let oe=0,te=k.length;oe<te;oe++){const K=k[oe],he=j[K.materialIndex];if(he&&he.visible){const de=P(N,he,I,W);N.onBeforeShadow(i,N,O,b,se,de,K),i.renderBufferDirect(b,null,se,de,N,K),N.onAfterShadow(i,N,O,b,se,de,K)}}}else if(j.visible){const k=P(N,j,I,W);N.onBeforeShadow(i,N,O,b,se,k,null),i.renderBufferDirect(b,null,se,k,N,null),N.onAfterShadow(i,N,O,b,se,k,null)}}const J=N.children;for(let se=0,j=J.length;se<j;se++)T(J[se],O,b,I,W)}function U(N){N.target.removeEventListener("dispose",U);for(const b in f){const I=f[b],W=N.target.uuid;W in I&&(I[W].dispose(),delete I[W])}}}function zP(i,e){function t(){let $=!1;const Pe=new un;let _e=null;const Le=new un(0,0,0,0);return{setMask:function(Fe){_e!==Fe&&!$&&(i.colorMask(Fe,Fe,Fe,Fe),_e=Fe)},setLocked:function(Fe){$=Fe},setClear:function(Fe,Me,Ye,$e,jt){jt===!0&&(Fe*=$e,Me*=$e,Ye*=$e),Pe.set(Fe,Me,Ye,$e),Le.equals(Pe)===!1&&(i.clearColor(Fe,Me,Ye,$e),Le.copy(Pe))},reset:function(){$=!1,_e=null,Le.set(-1,0,0,0)}}}function r(){let $=!1,Pe=!1,_e=null,Le=null,Fe=null;return{setReversed:function(Me){if(Pe!==Me){const Ye=e.get("EXT_clip_control");Me?Ye.clipControlEXT(Ye.LOWER_LEFT_EXT,Ye.ZERO_TO_ONE_EXT):Ye.clipControlEXT(Ye.LOWER_LEFT_EXT,Ye.NEGATIVE_ONE_TO_ONE_EXT),Pe=Me;const $e=Fe;Fe=null,this.setClear($e)}},getReversed:function(){return Pe},setTest:function(Me){Me?ge(i.DEPTH_TEST):Ue(i.DEPTH_TEST)},setMask:function(Me){_e!==Me&&!$&&(i.depthMask(Me),_e=Me)},setFunc:function(Me){if(Pe&&(Me=ob[Me]),Le!==Me){switch(Me){case mp:i.depthFunc(i.NEVER);break;case gp:i.depthFunc(i.ALWAYS);break;case xp:i.depthFunc(i.LESS);break;case Do:i.depthFunc(i.LEQUAL);break;case vp:i.depthFunc(i.EQUAL);break;case _p:i.depthFunc(i.GEQUAL);break;case yp:i.depthFunc(i.GREATER);break;case Sp:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}Le=Me}},setLocked:function(Me){$=Me},setClear:function(Me){Fe!==Me&&(Fe=Me,Pe&&(Me=1-Me),i.clearDepth(Me))},reset:function(){$=!1,_e=null,Le=null,Fe=null,Pe=!1}}}function a(){let $=!1,Pe=null,_e=null,Le=null,Fe=null,Me=null,Ye=null,$e=null,jt=null;return{setTest:function(Ut){$||(Ut?ge(i.STENCIL_TEST):Ue(i.STENCIL_TEST))},setMask:function(Ut){Pe!==Ut&&!$&&(i.stencilMask(Ut),Pe=Ut)},setFunc:function(Ut,On,wi){(_e!==Ut||Le!==On||Fe!==wi)&&(i.stencilFunc(Ut,On,wi),_e=Ut,Le=On,Fe=wi)},setOp:function(Ut,On,wi){(Me!==Ut||Ye!==On||$e!==wi)&&(i.stencilOp(Ut,On,wi),Me=Ut,Ye=On,$e=wi)},setLocked:function(Ut){$=Ut},setClear:function(Ut){jt!==Ut&&(i.clearStencil(Ut),jt=Ut)},reset:function(){$=!1,Pe=null,_e=null,Le=null,Fe=null,Me=null,Ye=null,$e=null,jt=null}}}const l=new t,c=new r,d=new a,h=new WeakMap,f=new WeakMap;let m={},g={},x={},M=new WeakMap,E=[],w=null,_=!1,y=null,L=null,P=null,T=null,U=null,N=null,O=null,b=new xt(0,0,0),I=0,W=!1,V=null,J=null,se=null,j=null,k=null;const oe=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let te=!1,K=0;const he=i.getParameter(i.VERSION);he.indexOf("WebGL")!==-1?(K=parseFloat(/^WebGL (\d)/.exec(he)[1]),te=K>=1):he.indexOf("OpenGL ES")!==-1&&(K=parseFloat(/^OpenGL ES (\d)/.exec(he)[1]),te=K>=2);let de=null,z={};const q=i.getParameter(i.SCISSOR_BOX),Ie=i.getParameter(i.VIEWPORT),Be=new un().fromArray(q),Ge=new un().fromArray(Ie);function ce($,Pe,_e,Le){const Fe=new Uint8Array(4),Me=i.createTexture();i.bindTexture($,Me),i.texParameteri($,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri($,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Ye=0;Ye<_e;Ye++)$===i.TEXTURE_3D||$===i.TEXTURE_2D_ARRAY?i.texImage3D(Pe,0,i.RGBA,1,1,Le,0,i.RGBA,i.UNSIGNED_BYTE,Fe):i.texImage2D(Pe+Ye,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Fe);return Me}const ye={};ye[i.TEXTURE_2D]=ce(i.TEXTURE_2D,i.TEXTURE_2D,1),ye[i.TEXTURE_CUBE_MAP]=ce(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),ye[i.TEXTURE_2D_ARRAY]=ce(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),ye[i.TEXTURE_3D]=ce(i.TEXTURE_3D,i.TEXTURE_3D,1,1),l.setClear(0,0,0,1),c.setClear(1),d.setClear(0),ge(i.DEPTH_TEST),c.setFunc(Do),kt(!1),Xt(Gx),ge(i.CULL_FACE),mt(jr);function ge($){m[$]!==!0&&(i.enable($),m[$]=!0)}function Ue($){m[$]!==!1&&(i.disable($),m[$]=!1)}function Ze($,Pe){return x[$]!==Pe?(i.bindFramebuffer($,Pe),x[$]=Pe,$===i.DRAW_FRAMEBUFFER&&(x[i.FRAMEBUFFER]=Pe),$===i.FRAMEBUFFER&&(x[i.DRAW_FRAMEBUFFER]=Pe),!0):!1}function tt($,Pe){let _e=E,Le=!1;if($){_e=M.get(Pe),_e===void 0&&(_e=[],M.set(Pe,_e));const Fe=$.textures;if(_e.length!==Fe.length||_e[0]!==i.COLOR_ATTACHMENT0){for(let Me=0,Ye=Fe.length;Me<Ye;Me++)_e[Me]=i.COLOR_ATTACHMENT0+Me;_e.length=Fe.length,Le=!0}}else _e[0]!==i.BACK&&(_e[0]=i.BACK,Le=!0);Le&&i.drawBuffers(_e)}function Gt($){return w!==$?(i.useProgram($),w=$,!0):!1}const ut={[la]:i.FUNC_ADD,[Pw]:i.FUNC_SUBTRACT,[Nw]:i.FUNC_REVERSE_SUBTRACT};ut[Lw]=i.MIN,ut[Dw]=i.MAX;const Ct={[Iw]:i.ZERO,[Uw]:i.ONE,[Fw]:i.SRC_COLOR,[fp]:i.SRC_ALPHA,[Vw]:i.SRC_ALPHA_SATURATE,[Bw]:i.DST_COLOR,[kw]:i.DST_ALPHA,[Ow]:i.ONE_MINUS_SRC_COLOR,[pp]:i.ONE_MINUS_SRC_ALPHA,[Hw]:i.ONE_MINUS_DST_COLOR,[zw]:i.ONE_MINUS_DST_ALPHA,[Gw]:i.CONSTANT_COLOR,[jw]:i.ONE_MINUS_CONSTANT_COLOR,[Ww]:i.CONSTANT_ALPHA,[Xw]:i.ONE_MINUS_CONSTANT_ALPHA};function mt($,Pe,_e,Le,Fe,Me,Ye,$e,jt,Ut){if($===jr){_===!0&&(Ue(i.BLEND),_=!1);return}if(_===!1&&(ge(i.BLEND),_=!0),$!==Aw){if($!==y||Ut!==W){if((L!==la||U!==la)&&(i.blendEquation(i.FUNC_ADD),L=la,U=la),Ut)switch($){case xo:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case jx:i.blendFunc(i.ONE,i.ONE);break;case Wx:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Xx:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Dt("WebGLState: Invalid blending: ",$);break}else switch($){case xo:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case jx:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case Wx:Dt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Xx:Dt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Dt("WebGLState: Invalid blending: ",$);break}P=null,T=null,N=null,O=null,b.set(0,0,0),I=0,y=$,W=Ut}return}Fe=Fe||Pe,Me=Me||_e,Ye=Ye||Le,(Pe!==L||Fe!==U)&&(i.blendEquationSeparate(ut[Pe],ut[Fe]),L=Pe,U=Fe),(_e!==P||Le!==T||Me!==N||Ye!==O)&&(i.blendFuncSeparate(Ct[_e],Ct[Le],Ct[Me],Ct[Ye]),P=_e,T=Le,N=Me,O=Ye),($e.equals(b)===!1||jt!==I)&&(i.blendColor($e.r,$e.g,$e.b,jt),b.copy($e),I=jt),y=$,W=!1}function vt($,Pe){$.side===hr?Ue(i.CULL_FACE):ge(i.CULL_FACE);let _e=$.side===hi;Pe&&(_e=!_e),kt(_e),$.blending===xo&&$.transparent===!1?mt(jr):mt($.blending,$.blendEquation,$.blendSrc,$.blendDst,$.blendEquationAlpha,$.blendSrcAlpha,$.blendDstAlpha,$.blendColor,$.blendAlpha,$.premultipliedAlpha),c.setFunc($.depthFunc),c.setTest($.depthTest),c.setMask($.depthWrite),l.setMask($.colorWrite);const Le=$.stencilWrite;d.setTest(Le),Le&&(d.setMask($.stencilWriteMask),d.setFunc($.stencilFunc,$.stencilRef,$.stencilFuncMask),d.setOp($.stencilFail,$.stencilZFail,$.stencilZPass)),$t($.polygonOffset,$.polygonOffsetFactor,$.polygonOffsetUnits),$.alphaToCoverage===!0?ge(i.SAMPLE_ALPHA_TO_COVERAGE):Ue(i.SAMPLE_ALPHA_TO_COVERAGE)}function kt($){V!==$&&($?i.frontFace(i.CW):i.frontFace(i.CCW),V=$)}function Xt($){$!==Tw?(ge(i.CULL_FACE),$!==J&&($===Gx?i.cullFace(i.BACK):$===Cw?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):Ue(i.CULL_FACE),J=$}function qt($){$!==se&&(te&&i.lineWidth($),se=$)}function $t($,Pe,_e){$?(ge(i.POLYGON_OFFSET_FILL),(j!==Pe||k!==_e)&&(j=Pe,k=_e,c.getReversed()&&(Pe=-Pe),i.polygonOffset(Pe,_e))):Ue(i.POLYGON_OFFSET_FILL)}function Et($){$?ge(i.SCISSOR_TEST):Ue(i.SCISSOR_TEST)}function zt($){$===void 0&&($=i.TEXTURE0+oe-1),de!==$&&(i.activeTexture($),de=$)}function Y($,Pe,_e){_e===void 0&&(de===null?_e=i.TEXTURE0+oe-1:_e=de);let Le=z[_e];Le===void 0&&(Le={type:void 0,texture:void 0},z[_e]=Le),(Le.type!==$||Le.texture!==Pe)&&(de!==_e&&(i.activeTexture(_e),de=_e),i.bindTexture($,Pe||ye[$]),Le.type=$,Le.texture=Pe)}function pn(){const $=z[de];$!==void 0&&$.type!==void 0&&(i.bindTexture($.type,null),$.type=void 0,$.texture=void 0)}function wt(){try{i.compressedTexImage2D(...arguments)}catch($){Dt("WebGLState:",$)}}function F(){try{i.compressedTexImage3D(...arguments)}catch($){Dt("WebGLState:",$)}}function C(){try{i.texSubImage2D(...arguments)}catch($){Dt("WebGLState:",$)}}function D(){try{i.texSubImage3D(...arguments)}catch($){Dt("WebGLState:",$)}}function Z(){try{i.compressedTexSubImage2D(...arguments)}catch($){Dt("WebGLState:",$)}}function me(){try{i.compressedTexSubImage3D(...arguments)}catch($){Dt("WebGLState:",$)}}function Ee(){try{i.texStorage2D(...arguments)}catch($){Dt("WebGLState:",$)}}function Re(){try{i.texStorage3D(...arguments)}catch($){Dt("WebGLState:",$)}}function xe(){try{i.texImage2D(...arguments)}catch($){Dt("WebGLState:",$)}}function ve(){try{i.texImage3D(...arguments)}catch($){Dt("WebGLState:",$)}}function De($){return g[$]!==void 0?g[$]:i.getParameter($)}function We($,Pe){g[$]!==Pe&&(i.pixelStorei($,Pe),g[$]=Pe)}function ie($){Be.equals($)===!1&&(i.scissor($.x,$.y,$.z,$.w),Be.copy($))}function Se($){Ge.equals($)===!1&&(i.viewport($.x,$.y,$.z,$.w),Ge.copy($))}function Oe($,Pe){let _e=f.get(Pe);_e===void 0&&(_e=new WeakMap,f.set(Pe,_e));let Le=_e.get($);Le===void 0&&(Le=i.getUniformBlockIndex(Pe,$.name),_e.set($,Le))}function nt($,Pe){const Le=f.get(Pe).get($);h.get(Pe)!==Le&&(i.uniformBlockBinding(Pe,Le,$.__bindingPointIndex),h.set(Pe,Le))}function st(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),c.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),m={},g={},de=null,z={},x={},M=new WeakMap,E=[],w=null,_=!1,y=null,L=null,P=null,T=null,U=null,N=null,O=null,b=new xt(0,0,0),I=0,W=!1,V=null,J=null,se=null,j=null,k=null,Be.set(0,0,i.canvas.width,i.canvas.height),Ge.set(0,0,i.canvas.width,i.canvas.height),l.reset(),c.reset(),d.reset()}return{buffers:{color:l,depth:c,stencil:d},enable:ge,disable:Ue,bindFramebuffer:Ze,drawBuffers:tt,useProgram:Gt,setBlending:mt,setMaterial:vt,setFlipSided:kt,setCullFace:Xt,setLineWidth:qt,setPolygonOffset:$t,setScissorTest:Et,activeTexture:zt,bindTexture:Y,unbindTexture:pn,compressedTexImage2D:wt,compressedTexImage3D:F,texImage2D:xe,texImage3D:ve,pixelStorei:We,getParameter:De,updateUBOMapping:Oe,uniformBlockBinding:nt,texStorage2D:Ee,texStorage3D:Re,texSubImage2D:C,texSubImage3D:D,compressedTexSubImage2D:Z,compressedTexSubImage3D:me,scissor:ie,viewport:Se,reset:st}}function BP(i,e,t,r,a,l,c){const d=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,h=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),f=new dt,m=new WeakMap,g=new Set;let x;const M=new WeakMap;let E=!1;try{E=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function w(F,C){return E?new OffscreenCanvas(F,C):$l("canvas")}function _(F,C,D){let Z=1;const me=wt(F);if((me.width>D||me.height>D)&&(Z=D/Math.max(me.width,me.height)),Z<1)if(typeof HTMLImageElement<"u"&&F instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&F instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&F instanceof ImageBitmap||typeof VideoFrame<"u"&&F instanceof VideoFrame){const Ee=Math.floor(Z*me.width),Re=Math.floor(Z*me.height);x===void 0&&(x=w(Ee,Re));const xe=C?w(Ee,Re):x;return xe.width=Ee,xe.height=Re,xe.getContext("2d").drawImage(F,0,0,Ee,Re),lt("WebGLRenderer: Texture has been resized from ("+me.width+"x"+me.height+") to ("+Ee+"x"+Re+")."),xe}else return"data"in F&&lt("WebGLRenderer: Image in DataTexture is too big ("+me.width+"x"+me.height+")."),F;return F}function y(F){return F.generateMipmaps}function L(F){i.generateMipmap(F)}function P(F){return F.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:F.isWebGL3DRenderTarget?i.TEXTURE_3D:F.isWebGLArrayRenderTarget||F.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function T(F,C,D,Z,me,Ee=!1){if(F!==null){if(i[F]!==void 0)return i[F];lt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+F+"'")}let Re;Z&&(Re=e.get("EXT_texture_norm16"),Re||lt("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let xe=C;if(C===i.RED&&(D===i.FLOAT&&(xe=i.R32F),D===i.HALF_FLOAT&&(xe=i.R16F),D===i.UNSIGNED_BYTE&&(xe=i.R8),D===i.UNSIGNED_SHORT&&Re&&(xe=Re.R16_EXT),D===i.SHORT&&Re&&(xe=Re.R16_SNORM_EXT)),C===i.RED_INTEGER&&(D===i.UNSIGNED_BYTE&&(xe=i.R8UI),D===i.UNSIGNED_SHORT&&(xe=i.R16UI),D===i.UNSIGNED_INT&&(xe=i.R32UI),D===i.BYTE&&(xe=i.R8I),D===i.SHORT&&(xe=i.R16I),D===i.INT&&(xe=i.R32I)),C===i.RG&&(D===i.FLOAT&&(xe=i.RG32F),D===i.HALF_FLOAT&&(xe=i.RG16F),D===i.UNSIGNED_BYTE&&(xe=i.RG8),D===i.UNSIGNED_SHORT&&Re&&(xe=Re.RG16_EXT),D===i.SHORT&&Re&&(xe=Re.RG16_SNORM_EXT)),C===i.RG_INTEGER&&(D===i.UNSIGNED_BYTE&&(xe=i.RG8UI),D===i.UNSIGNED_SHORT&&(xe=i.RG16UI),D===i.UNSIGNED_INT&&(xe=i.RG32UI),D===i.BYTE&&(xe=i.RG8I),D===i.SHORT&&(xe=i.RG16I),D===i.INT&&(xe=i.RG32I)),C===i.RGB_INTEGER&&(D===i.UNSIGNED_BYTE&&(xe=i.RGB8UI),D===i.UNSIGNED_SHORT&&(xe=i.RGB16UI),D===i.UNSIGNED_INT&&(xe=i.RGB32UI),D===i.BYTE&&(xe=i.RGB8I),D===i.SHORT&&(xe=i.RGB16I),D===i.INT&&(xe=i.RGB32I)),C===i.RGBA_INTEGER&&(D===i.UNSIGNED_BYTE&&(xe=i.RGBA8UI),D===i.UNSIGNED_SHORT&&(xe=i.RGBA16UI),D===i.UNSIGNED_INT&&(xe=i.RGBA32UI),D===i.BYTE&&(xe=i.RGBA8I),D===i.SHORT&&(xe=i.RGBA16I),D===i.INT&&(xe=i.RGBA32I)),C===i.RGB&&(D===i.UNSIGNED_SHORT&&Re&&(xe=Re.RGB16_EXT),D===i.SHORT&&Re&&(xe=Re.RGB16_SNORM_EXT),D===i.UNSIGNED_INT_5_9_9_9_REV&&(xe=i.RGB9_E5),D===i.UNSIGNED_INT_10F_11F_11F_REV&&(xe=i.R11F_G11F_B10F)),C===i.RGBA){const ve=Ee?od:At.getTransfer(me);D===i.FLOAT&&(xe=i.RGBA32F),D===i.HALF_FLOAT&&(xe=i.RGBA16F),D===i.UNSIGNED_BYTE&&(xe=ve===Vt?i.SRGB8_ALPHA8:i.RGBA8),D===i.UNSIGNED_SHORT&&Re&&(xe=Re.RGBA16_EXT),D===i.SHORT&&Re&&(xe=Re.RGBA16_SNORM_EXT),D===i.UNSIGNED_SHORT_4_4_4_4&&(xe=i.RGBA4),D===i.UNSIGNED_SHORT_5_5_5_1&&(xe=i.RGB5_A1)}return(xe===i.R16F||xe===i.R32F||xe===i.RG16F||xe===i.RG32F||xe===i.RGBA16F||xe===i.RGBA32F)&&e.get("EXT_color_buffer_float"),xe}function U(F,C){let D;return F?C===null||C===vr||C===Wl?D=i.DEPTH24_STENCIL8:C===fr?D=i.DEPTH32F_STENCIL8:C===jl&&(D=i.DEPTH24_STENCIL8,lt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):C===null||C===vr||C===Wl?D=i.DEPTH_COMPONENT24:C===fr?D=i.DEPTH_COMPONENT32F:C===jl&&(D=i.DEPTH_COMPONENT16),D}function N(F,C){return y(F)===!0||F.isFramebufferTexture&&F.minFilter!==Fn&&F.minFilter!==Wn?Math.log2(Math.max(C.width,C.height))+1:F.mipmaps!==void 0&&F.mipmaps.length>0?F.mipmaps.length:F.isCompressedTexture&&Array.isArray(F.image)?C.mipmaps.length:1}function O(F){const C=F.target;C.removeEventListener("dispose",O),I(C),C.isVideoTexture&&m.delete(C),C.isHTMLTexture&&g.delete(C)}function b(F){const C=F.target;C.removeEventListener("dispose",b),V(C)}function I(F){const C=r.get(F);if(C.__webglInit===void 0)return;const D=F.source,Z=M.get(D);if(Z){const me=Z[C.__cacheKey];me.usedTimes--,me.usedTimes===0&&W(F),Object.keys(Z).length===0&&M.delete(D)}r.remove(F)}function W(F){const C=r.get(F);i.deleteTexture(C.__webglTexture);const D=F.source,Z=M.get(D);delete Z[C.__cacheKey],c.memory.textures--}function V(F){const C=r.get(F);if(F.depthTexture&&(F.depthTexture.dispose(),r.remove(F.depthTexture)),F.isWebGLCubeRenderTarget)for(let Z=0;Z<6;Z++){if(Array.isArray(C.__webglFramebuffer[Z]))for(let me=0;me<C.__webglFramebuffer[Z].length;me++)i.deleteFramebuffer(C.__webglFramebuffer[Z][me]);else i.deleteFramebuffer(C.__webglFramebuffer[Z]);C.__webglDepthbuffer&&i.deleteRenderbuffer(C.__webglDepthbuffer[Z])}else{if(Array.isArray(C.__webglFramebuffer))for(let Z=0;Z<C.__webglFramebuffer.length;Z++)i.deleteFramebuffer(C.__webglFramebuffer[Z]);else i.deleteFramebuffer(C.__webglFramebuffer);if(C.__webglDepthbuffer&&i.deleteRenderbuffer(C.__webglDepthbuffer),C.__webglMultisampledFramebuffer&&i.deleteFramebuffer(C.__webglMultisampledFramebuffer),C.__webglColorRenderbuffer)for(let Z=0;Z<C.__webglColorRenderbuffer.length;Z++)C.__webglColorRenderbuffer[Z]&&i.deleteRenderbuffer(C.__webglColorRenderbuffer[Z]);C.__webglDepthRenderbuffer&&i.deleteRenderbuffer(C.__webglDepthRenderbuffer)}const D=F.textures;for(let Z=0,me=D.length;Z<me;Z++){const Ee=r.get(D[Z]);Ee.__webglTexture&&(i.deleteTexture(Ee.__webglTexture),c.memory.textures--),r.remove(D[Z])}r.remove(F)}let J=0;function se(){J=0}function j(){return J}function k(F){J=F}function oe(){const F=J;return F>=a.maxTextures&&lt("WebGLTextures: Trying to use "+F+" texture units while this GPU supports only "+a.maxTextures),J+=1,F}function te(F){const C=[];return C.push(F.wrapS),C.push(F.wrapT),C.push(F.wrapR||0),C.push(F.magFilter),C.push(F.minFilter),C.push(F.anisotropy),C.push(F.internalFormat),C.push(F.format),C.push(F.type),C.push(F.generateMipmaps),C.push(F.premultiplyAlpha),C.push(F.flipY),C.push(F.unpackAlignment),C.push(F.colorSpace),C.join()}function K(F,C){const D=r.get(F);if(F.isVideoTexture&&Y(F),F.isRenderTargetTexture===!1&&F.isExternalTexture!==!0&&F.version>0&&D.__version!==F.version){const Z=F.image;if(Z===null)lt("WebGLRenderer: Texture marked for update but no image data found.");else if(Z.complete===!1)lt("WebGLRenderer: Texture marked for update but image is incomplete");else{Ue(D,F,C);return}}else F.isExternalTexture&&(D.__webglTexture=F.sourceTexture?F.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,D.__webglTexture,i.TEXTURE0+C)}function he(F,C){const D=r.get(F);if(F.isRenderTargetTexture===!1&&F.version>0&&D.__version!==F.version){Ue(D,F,C);return}else F.isExternalTexture&&(D.__webglTexture=F.sourceTexture?F.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,D.__webglTexture,i.TEXTURE0+C)}function de(F,C){const D=r.get(F);if(F.isRenderTargetTexture===!1&&F.version>0&&D.__version!==F.version){Ue(D,F,C);return}t.bindTexture(i.TEXTURE_3D,D.__webglTexture,i.TEXTURE0+C)}function z(F,C){const D=r.get(F);if(F.isCubeDepthTexture!==!0&&F.version>0&&D.__version!==F.version){Ze(D,F,C);return}t.bindTexture(i.TEXTURE_CUBE_MAP,D.__webglTexture,i.TEXTURE0+C)}const q={[Mp]:i.REPEAT,[Gr]:i.CLAMP_TO_EDGE,[Ep]:i.MIRRORED_REPEAT},Ie={[Fn]:i.NEAREST,[Yw]:i.NEAREST_MIPMAP_NEAREST,[fu]:i.NEAREST_MIPMAP_LINEAR,[Wn]:i.LINEAR,[ff]:i.LINEAR_MIPMAP_NEAREST,[da]:i.LINEAR_MIPMAP_LINEAR},Be={[Zw]:i.NEVER,[ib]:i.ALWAYS,[Jw]:i.LESS,[Um]:i.LEQUAL,[eb]:i.EQUAL,[Fm]:i.GEQUAL,[tb]:i.GREATER,[nb]:i.NOTEQUAL};function Ge(F,C){if(C.type===fr&&e.has("OES_texture_float_linear")===!1&&(C.magFilter===Wn||C.magFilter===ff||C.magFilter===fu||C.magFilter===da||C.minFilter===Wn||C.minFilter===ff||C.minFilter===fu||C.minFilter===da)&&lt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(F,i.TEXTURE_WRAP_S,q[C.wrapS]),i.texParameteri(F,i.TEXTURE_WRAP_T,q[C.wrapT]),(F===i.TEXTURE_3D||F===i.TEXTURE_2D_ARRAY)&&i.texParameteri(F,i.TEXTURE_WRAP_R,q[C.wrapR]),i.texParameteri(F,i.TEXTURE_MAG_FILTER,Ie[C.magFilter]),i.texParameteri(F,i.TEXTURE_MIN_FILTER,Ie[C.minFilter]),C.compareFunction&&(i.texParameteri(F,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(F,i.TEXTURE_COMPARE_FUNC,Be[C.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(C.magFilter===Fn||C.minFilter!==fu&&C.minFilter!==da||C.type===fr&&e.has("OES_texture_float_linear")===!1)return;if(C.anisotropy>1||r.get(C).__currentAnisotropy){const D=e.get("EXT_texture_filter_anisotropic");i.texParameterf(F,D.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(C.anisotropy,a.getMaxAnisotropy())),r.get(C).__currentAnisotropy=C.anisotropy}}}function ce(F,C){let D=!1;F.__webglInit===void 0&&(F.__webglInit=!0,C.addEventListener("dispose",O));const Z=C.source;let me=M.get(Z);me===void 0&&(me={},M.set(Z,me));const Ee=te(C);if(Ee!==F.__cacheKey){me[Ee]===void 0&&(me[Ee]={texture:i.createTexture(),usedTimes:0},c.memory.textures++,D=!0),me[Ee].usedTimes++;const Re=me[F.__cacheKey];Re!==void 0&&(me[F.__cacheKey].usedTimes--,Re.usedTimes===0&&W(C)),F.__cacheKey=Ee,F.__webglTexture=me[Ee].texture}return D}function ye(F,C,D){return Math.floor(Math.floor(F/D)/C)}function ge(F,C,D,Z){const Ee=F.updateRanges;if(Ee.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,C.width,C.height,D,Z,C.data);else{Ee.sort((We,ie)=>We.start-ie.start);let Re=0;for(let We=1;We<Ee.length;We++){const ie=Ee[Re],Se=Ee[We],Oe=ie.start+ie.count,nt=ye(Se.start,C.width,4),st=ye(ie.start,C.width,4);Se.start<=Oe+1&&nt===st&&ye(Se.start+Se.count-1,C.width,4)===nt?ie.count=Math.max(ie.count,Se.start+Se.count-ie.start):(++Re,Ee[Re]=Se)}Ee.length=Re+1;const xe=t.getParameter(i.UNPACK_ROW_LENGTH),ve=t.getParameter(i.UNPACK_SKIP_PIXELS),De=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,C.width);for(let We=0,ie=Ee.length;We<ie;We++){const Se=Ee[We],Oe=Math.floor(Se.start/4),nt=Math.ceil(Se.count/4),st=Oe%C.width,$=Math.floor(Oe/C.width),Pe=nt,_e=1;t.pixelStorei(i.UNPACK_SKIP_PIXELS,st),t.pixelStorei(i.UNPACK_SKIP_ROWS,$),t.texSubImage2D(i.TEXTURE_2D,0,st,$,Pe,_e,D,Z,C.data)}F.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,xe),t.pixelStorei(i.UNPACK_SKIP_PIXELS,ve),t.pixelStorei(i.UNPACK_SKIP_ROWS,De)}}function Ue(F,C,D){let Z=i.TEXTURE_2D;(C.isDataArrayTexture||C.isCompressedArrayTexture)&&(Z=i.TEXTURE_2D_ARRAY),C.isData3DTexture&&(Z=i.TEXTURE_3D);const me=ce(F,C),Ee=C.source;t.bindTexture(Z,F.__webglTexture,i.TEXTURE0+D);const Re=r.get(Ee);if(Ee.version!==Re.__version||me===!0){if(t.activeTexture(i.TEXTURE0+D),(typeof ImageBitmap<"u"&&C.image instanceof ImageBitmap)===!1){const _e=At.getPrimaries(At.workingColorSpace),Le=C.colorSpace===ws?null:At.getPrimaries(C.colorSpace),Fe=C.colorSpace===ws||_e===Le?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,C.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,C.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Fe)}t.pixelStorei(i.UNPACK_ALIGNMENT,C.unpackAlignment);let ve=_(C.image,!1,a.maxTextureSize);ve=pn(C,ve);const De=l.convert(C.format,C.colorSpace),We=l.convert(C.type);let ie=T(C.internalFormat,De,We,C.normalized,C.colorSpace,C.isVideoTexture);Ge(Z,C);let Se;const Oe=C.mipmaps,nt=C.isVideoTexture!==!0,st=Re.__version===void 0||me===!0,$=Ee.dataReady,Pe=N(C,ve);if(C.isDepthTexture)ie=U(C.format===ha,C.type),st&&(nt?t.texStorage2D(i.TEXTURE_2D,1,ie,ve.width,ve.height):t.texImage2D(i.TEXTURE_2D,0,ie,ve.width,ve.height,0,De,We,null));else if(C.isDataTexture)if(Oe.length>0){nt&&st&&t.texStorage2D(i.TEXTURE_2D,Pe,ie,Oe[0].width,Oe[0].height);for(let _e=0,Le=Oe.length;_e<Le;_e++)Se=Oe[_e],nt?$&&t.texSubImage2D(i.TEXTURE_2D,_e,0,0,Se.width,Se.height,De,We,Se.data):t.texImage2D(i.TEXTURE_2D,_e,ie,Se.width,Se.height,0,De,We,Se.data);C.generateMipmaps=!1}else nt?(st&&t.texStorage2D(i.TEXTURE_2D,Pe,ie,ve.width,ve.height),$&&ge(C,ve,De,We)):t.texImage2D(i.TEXTURE_2D,0,ie,ve.width,ve.height,0,De,We,ve.data);else if(C.isCompressedTexture)if(C.isCompressedArrayTexture){nt&&st&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Pe,ie,Oe[0].width,Oe[0].height,ve.depth);for(let _e=0,Le=Oe.length;_e<Le;_e++)if(Se=Oe[_e],C.format!==Ki)if(De!==null)if(nt){if($)if(C.layerUpdates.size>0){const Fe=Cv(Se.width,Se.height,C.format,C.type);for(const Me of C.layerUpdates){const Ye=Se.data.subarray(Me*Fe/Se.data.BYTES_PER_ELEMENT,(Me+1)*Fe/Se.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,_e,0,0,Me,Se.width,Se.height,1,De,Ye)}C.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,_e,0,0,0,Se.width,Se.height,ve.depth,De,Se.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,_e,ie,Se.width,Se.height,ve.depth,0,Se.data,0,0);else lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else nt?$&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,_e,0,0,0,Se.width,Se.height,ve.depth,De,We,Se.data):t.texImage3D(i.TEXTURE_2D_ARRAY,_e,ie,Se.width,Se.height,ve.depth,0,De,We,Se.data)}else{nt&&st&&t.texStorage2D(i.TEXTURE_2D,Pe,ie,Oe[0].width,Oe[0].height);for(let _e=0,Le=Oe.length;_e<Le;_e++)Se=Oe[_e],C.format!==Ki?De!==null?nt?$&&t.compressedTexSubImage2D(i.TEXTURE_2D,_e,0,0,Se.width,Se.height,De,Se.data):t.compressedTexImage2D(i.TEXTURE_2D,_e,ie,Se.width,Se.height,0,Se.data):lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):nt?$&&t.texSubImage2D(i.TEXTURE_2D,_e,0,0,Se.width,Se.height,De,We,Se.data):t.texImage2D(i.TEXTURE_2D,_e,ie,Se.width,Se.height,0,De,We,Se.data)}else if(C.isDataArrayTexture)if(nt){if(st&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Pe,ie,ve.width,ve.height,ve.depth),$)if(C.layerUpdates.size>0){const _e=Cv(ve.width,ve.height,C.format,C.type);for(const Le of C.layerUpdates){const Fe=ve.data.subarray(Le*_e/ve.data.BYTES_PER_ELEMENT,(Le+1)*_e/ve.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,Le,ve.width,ve.height,1,De,We,Fe)}C.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ve.width,ve.height,ve.depth,De,We,ve.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,ie,ve.width,ve.height,ve.depth,0,De,We,ve.data);else if(C.isData3DTexture)nt?(st&&t.texStorage3D(i.TEXTURE_3D,Pe,ie,ve.width,ve.height,ve.depth),$&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ve.width,ve.height,ve.depth,De,We,ve.data)):t.texImage3D(i.TEXTURE_3D,0,ie,ve.width,ve.height,ve.depth,0,De,We,ve.data);else if(C.isFramebufferTexture){if(st)if(nt)t.texStorage2D(i.TEXTURE_2D,Pe,ie,ve.width,ve.height);else{let _e=ve.width,Le=ve.height;for(let Fe=0;Fe<Pe;Fe++)t.texImage2D(i.TEXTURE_2D,Fe,ie,_e,Le,0,De,We,null),_e>>=1,Le>>=1}}else if(C.isHTMLTexture){if("texElementImage2D"in i){const _e=i.canvas;if(_e.hasAttribute("layoutsubtree")||_e.setAttribute("layoutsubtree","true"),ve.parentNode!==_e){_e.appendChild(ve),g.add(C),_e.onpaint=Le=>{const Fe=Le.changedElements;for(const Me of g)Fe.includes(Me.image)&&(Me.needsUpdate=!0)},_e.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,ve);else{const Fe=i.RGBA,Me=i.RGBA,Ye=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,Fe,Me,Ye,ve)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Oe.length>0){if(nt&&st){const _e=wt(Oe[0]);t.texStorage2D(i.TEXTURE_2D,Pe,ie,_e.width,_e.height)}for(let _e=0,Le=Oe.length;_e<Le;_e++)Se=Oe[_e],nt?$&&t.texSubImage2D(i.TEXTURE_2D,_e,0,0,De,We,Se):t.texImage2D(i.TEXTURE_2D,_e,ie,De,We,Se);C.generateMipmaps=!1}else if(nt){if(st){const _e=wt(ve);t.texStorage2D(i.TEXTURE_2D,Pe,ie,_e.width,_e.height)}$&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,De,We,ve)}else t.texImage2D(i.TEXTURE_2D,0,ie,De,We,ve);y(C)&&L(Z),Re.__version=Ee.version,C.onUpdate&&C.onUpdate(C)}F.__version=C.version}function Ze(F,C,D){if(C.image.length!==6)return;const Z=ce(F,C),me=C.source;t.bindTexture(i.TEXTURE_CUBE_MAP,F.__webglTexture,i.TEXTURE0+D);const Ee=r.get(me);if(me.version!==Ee.__version||Z===!0){t.activeTexture(i.TEXTURE0+D);const Re=At.getPrimaries(At.workingColorSpace),xe=C.colorSpace===ws?null:At.getPrimaries(C.colorSpace),ve=C.colorSpace===ws||Re===xe?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,C.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,C.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,C.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ve);const De=C.isCompressedTexture||C.image[0].isCompressedTexture,We=C.image[0]&&C.image[0].isDataTexture,ie=[];for(let Me=0;Me<6;Me++)!De&&!We?ie[Me]=_(C.image[Me],!0,a.maxCubemapSize):ie[Me]=We?C.image[Me].image:C.image[Me],ie[Me]=pn(C,ie[Me]);const Se=ie[0],Oe=l.convert(C.format,C.colorSpace),nt=l.convert(C.type),st=T(C.internalFormat,Oe,nt,C.normalized,C.colorSpace),$=C.isVideoTexture!==!0,Pe=Ee.__version===void 0||Z===!0,_e=me.dataReady;let Le=N(C,Se);Ge(i.TEXTURE_CUBE_MAP,C);let Fe;if(De){$&&Pe&&t.texStorage2D(i.TEXTURE_CUBE_MAP,Le,st,Se.width,Se.height);for(let Me=0;Me<6;Me++){Fe=ie[Me].mipmaps;for(let Ye=0;Ye<Fe.length;Ye++){const $e=Fe[Ye];C.format!==Ki?Oe!==null?$?_e&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye,0,0,$e.width,$e.height,Oe,$e.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye,st,$e.width,$e.height,0,$e.data):lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):$?_e&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye,0,0,$e.width,$e.height,Oe,nt,$e.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye,st,$e.width,$e.height,0,Oe,nt,$e.data)}}}else{if(Fe=C.mipmaps,$&&Pe){Fe.length>0&&Le++;const Me=wt(ie[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,Le,st,Me.width,Me.height)}for(let Me=0;Me<6;Me++)if(We){$?_e&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,0,0,ie[Me].width,ie[Me].height,Oe,nt,ie[Me].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,st,ie[Me].width,ie[Me].height,0,Oe,nt,ie[Me].data);for(let Ye=0;Ye<Fe.length;Ye++){const jt=Fe[Ye].image[Me].image;$?_e&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye+1,0,0,jt.width,jt.height,Oe,nt,jt.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye+1,st,jt.width,jt.height,0,Oe,nt,jt.data)}}else{$?_e&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,0,0,Oe,nt,ie[Me]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,st,Oe,nt,ie[Me]);for(let Ye=0;Ye<Fe.length;Ye++){const $e=Fe[Ye];$?_e&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye+1,0,0,Oe,nt,$e.image[Me]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye+1,st,Oe,nt,$e.image[Me])}}}y(C)&&L(i.TEXTURE_CUBE_MAP),Ee.__version=me.version,C.onUpdate&&C.onUpdate(C)}F.__version=C.version}function tt(F,C,D,Z,me,Ee){const Re=l.convert(D.format,D.colorSpace),xe=l.convert(D.type),ve=T(D.internalFormat,Re,xe,D.normalized,D.colorSpace),De=r.get(C),We=r.get(D);if(We.__renderTarget=C,!De.__hasExternalTextures){const ie=Math.max(1,C.width>>Ee),Se=Math.max(1,C.height>>Ee);me===i.TEXTURE_3D||me===i.TEXTURE_2D_ARRAY?t.texImage3D(me,Ee,ve,ie,Se,C.depth,0,Re,xe,null):t.texImage2D(me,Ee,ve,ie,Se,0,Re,xe,null)}t.bindFramebuffer(i.FRAMEBUFFER,F),zt(C)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Z,me,We.__webglTexture,0,Et(C)):(me===i.TEXTURE_2D||me>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&me<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,Z,me,We.__webglTexture,Ee),t.bindFramebuffer(i.FRAMEBUFFER,null)}function Gt(F,C,D){if(i.bindRenderbuffer(i.RENDERBUFFER,F),C.depthBuffer){const Z=C.depthTexture,me=Z&&Z.isDepthTexture?Z.type:null,Ee=U(C.stencilBuffer,me),Re=C.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;zt(C)?d.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Et(C),Ee,C.width,C.height):D?i.renderbufferStorageMultisample(i.RENDERBUFFER,Et(C),Ee,C.width,C.height):i.renderbufferStorage(i.RENDERBUFFER,Ee,C.width,C.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Re,i.RENDERBUFFER,F)}else{const Z=C.textures;for(let me=0;me<Z.length;me++){const Ee=Z[me],Re=l.convert(Ee.format,Ee.colorSpace),xe=l.convert(Ee.type),ve=T(Ee.internalFormat,Re,xe,Ee.normalized,Ee.colorSpace);zt(C)?d.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Et(C),ve,C.width,C.height):D?i.renderbufferStorageMultisample(i.RENDERBUFFER,Et(C),ve,C.width,C.height):i.renderbufferStorage(i.RENDERBUFFER,ve,C.width,C.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function ut(F,C,D){const Z=C.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,F),!(C.depthTexture&&C.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const me=r.get(C.depthTexture);if(me.__renderTarget=C,(!me.__webglTexture||C.depthTexture.image.width!==C.width||C.depthTexture.image.height!==C.height)&&(C.depthTexture.image.width=C.width,C.depthTexture.image.height=C.height,C.depthTexture.needsUpdate=!0),Z){if(me.__webglInit===void 0&&(me.__webglInit=!0,C.depthTexture.addEventListener("dispose",O)),me.__webglTexture===void 0){me.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,me.__webglTexture),Ge(i.TEXTURE_CUBE_MAP,C.depthTexture);const De=l.convert(C.depthTexture.format),We=l.convert(C.depthTexture.type);let ie;C.depthTexture.format===Yr?ie=i.DEPTH_COMPONENT24:C.depthTexture.format===ha&&(ie=i.DEPTH24_STENCIL8);for(let Se=0;Se<6;Se++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,0,ie,C.width,C.height,0,De,We,null)}}else K(C.depthTexture,0);const Ee=me.__webglTexture,Re=Et(C),xe=Z?i.TEXTURE_CUBE_MAP_POSITIVE_X+D:i.TEXTURE_2D,ve=C.depthTexture.format===ha?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(C.depthTexture.format===Yr)zt(C)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ve,xe,Ee,0,Re):i.framebufferTexture2D(i.FRAMEBUFFER,ve,xe,Ee,0);else if(C.depthTexture.format===ha)zt(C)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ve,xe,Ee,0,Re):i.framebufferTexture2D(i.FRAMEBUFFER,ve,xe,Ee,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function Ct(F){const C=r.get(F),D=F.isWebGLCubeRenderTarget===!0;if(C.__boundDepthTexture!==F.depthTexture){const Z=F.depthTexture;if(C.__depthDisposeCallback&&C.__depthDisposeCallback(),Z){const me=()=>{delete C.__boundDepthTexture,delete C.__depthDisposeCallback,Z.removeEventListener("dispose",me)};Z.addEventListener("dispose",me),C.__depthDisposeCallback=me}C.__boundDepthTexture=Z}if(F.depthTexture&&!C.__autoAllocateDepthBuffer)if(D)for(let Z=0;Z<6;Z++)ut(C.__webglFramebuffer[Z],F,Z);else{const Z=F.texture.mipmaps;Z&&Z.length>0?ut(C.__webglFramebuffer[0],F,0):ut(C.__webglFramebuffer,F,0)}else if(D){C.__webglDepthbuffer=[];for(let Z=0;Z<6;Z++)if(t.bindFramebuffer(i.FRAMEBUFFER,C.__webglFramebuffer[Z]),C.__webglDepthbuffer[Z]===void 0)C.__webglDepthbuffer[Z]=i.createRenderbuffer(),Gt(C.__webglDepthbuffer[Z],F,!1);else{const me=F.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Ee=C.__webglDepthbuffer[Z];i.bindRenderbuffer(i.RENDERBUFFER,Ee),i.framebufferRenderbuffer(i.FRAMEBUFFER,me,i.RENDERBUFFER,Ee)}}else{const Z=F.texture.mipmaps;if(Z&&Z.length>0?t.bindFramebuffer(i.FRAMEBUFFER,C.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,C.__webglFramebuffer),C.__webglDepthbuffer===void 0)C.__webglDepthbuffer=i.createRenderbuffer(),Gt(C.__webglDepthbuffer,F,!1);else{const me=F.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Ee=C.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,Ee),i.framebufferRenderbuffer(i.FRAMEBUFFER,me,i.RENDERBUFFER,Ee)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function mt(F,C,D){const Z=r.get(F);C!==void 0&&tt(Z.__webglFramebuffer,F,F.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),D!==void 0&&Ct(F)}function vt(F){const C=F.texture,D=r.get(F),Z=r.get(C);F.addEventListener("dispose",b);const me=F.textures,Ee=F.isWebGLCubeRenderTarget===!0,Re=me.length>1;if(Re||(Z.__webglTexture===void 0&&(Z.__webglTexture=i.createTexture()),Z.__version=C.version,c.memory.textures++),Ee){D.__webglFramebuffer=[];for(let xe=0;xe<6;xe++)if(C.mipmaps&&C.mipmaps.length>0){D.__webglFramebuffer[xe]=[];for(let ve=0;ve<C.mipmaps.length;ve++)D.__webglFramebuffer[xe][ve]=i.createFramebuffer()}else D.__webglFramebuffer[xe]=i.createFramebuffer()}else{if(C.mipmaps&&C.mipmaps.length>0){D.__webglFramebuffer=[];for(let xe=0;xe<C.mipmaps.length;xe++)D.__webglFramebuffer[xe]=i.createFramebuffer()}else D.__webglFramebuffer=i.createFramebuffer();if(Re)for(let xe=0,ve=me.length;xe<ve;xe++){const De=r.get(me[xe]);De.__webglTexture===void 0&&(De.__webglTexture=i.createTexture(),c.memory.textures++)}if(F.samples>0&&zt(F)===!1){D.__webglMultisampledFramebuffer=i.createFramebuffer(),D.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,D.__webglMultisampledFramebuffer);for(let xe=0;xe<me.length;xe++){const ve=me[xe];D.__webglColorRenderbuffer[xe]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,D.__webglColorRenderbuffer[xe]);const De=l.convert(ve.format,ve.colorSpace),We=l.convert(ve.type),ie=T(ve.internalFormat,De,We,ve.normalized,ve.colorSpace,F.isXRRenderTarget===!0),Se=Et(F);i.renderbufferStorageMultisample(i.RENDERBUFFER,Se,ie,F.width,F.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+xe,i.RENDERBUFFER,D.__webglColorRenderbuffer[xe])}i.bindRenderbuffer(i.RENDERBUFFER,null),F.depthBuffer&&(D.__webglDepthRenderbuffer=i.createRenderbuffer(),Gt(D.__webglDepthRenderbuffer,F,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(Ee){t.bindTexture(i.TEXTURE_CUBE_MAP,Z.__webglTexture),Ge(i.TEXTURE_CUBE_MAP,C);for(let xe=0;xe<6;xe++)if(C.mipmaps&&C.mipmaps.length>0)for(let ve=0;ve<C.mipmaps.length;ve++)tt(D.__webglFramebuffer[xe][ve],F,C,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+xe,ve);else tt(D.__webglFramebuffer[xe],F,C,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+xe,0);y(C)&&L(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Re){for(let xe=0,ve=me.length;xe<ve;xe++){const De=me[xe],We=r.get(De);let ie=i.TEXTURE_2D;(F.isWebGL3DRenderTarget||F.isWebGLArrayRenderTarget)&&(ie=F.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ie,We.__webglTexture),Ge(ie,De),tt(D.__webglFramebuffer,F,De,i.COLOR_ATTACHMENT0+xe,ie,0),y(De)&&L(ie)}t.unbindTexture()}else{let xe=i.TEXTURE_2D;if((F.isWebGL3DRenderTarget||F.isWebGLArrayRenderTarget)&&(xe=F.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(xe,Z.__webglTexture),Ge(xe,C),C.mipmaps&&C.mipmaps.length>0)for(let ve=0;ve<C.mipmaps.length;ve++)tt(D.__webglFramebuffer[ve],F,C,i.COLOR_ATTACHMENT0,xe,ve);else tt(D.__webglFramebuffer,F,C,i.COLOR_ATTACHMENT0,xe,0);y(C)&&L(xe),t.unbindTexture()}F.depthBuffer&&Ct(F)}function kt(F){const C=F.textures;for(let D=0,Z=C.length;D<Z;D++){const me=C[D];if(y(me)){const Ee=P(F),Re=r.get(me).__webglTexture;t.bindTexture(Ee,Re),L(Ee),t.unbindTexture()}}}const Xt=[],qt=[];function $t(F){if(F.samples>0){if(zt(F)===!1){const C=F.textures,D=F.width,Z=F.height;let me=i.COLOR_BUFFER_BIT;const Ee=F.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Re=r.get(F),xe=C.length>1;if(xe)for(let De=0;De<C.length;De++)t.bindFramebuffer(i.FRAMEBUFFER,Re.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+De,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,Re.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+De,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,Re.__webglMultisampledFramebuffer);const ve=F.texture.mipmaps;ve&&ve.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Re.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Re.__webglFramebuffer);for(let De=0;De<C.length;De++){if(F.resolveDepthBuffer&&(F.depthBuffer&&(me|=i.DEPTH_BUFFER_BIT),F.stencilBuffer&&F.resolveStencilBuffer&&(me|=i.STENCIL_BUFFER_BIT)),xe){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Re.__webglColorRenderbuffer[De]);const We=r.get(C[De]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,We,0)}i.blitFramebuffer(0,0,D,Z,0,0,D,Z,me,i.NEAREST),h===!0&&(Xt.length=0,qt.length=0,Xt.push(i.COLOR_ATTACHMENT0+De),F.depthBuffer&&F.resolveDepthBuffer===!1&&(Xt.push(Ee),qt.push(Ee),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,qt)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Xt))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),xe)for(let De=0;De<C.length;De++){t.bindFramebuffer(i.FRAMEBUFFER,Re.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+De,i.RENDERBUFFER,Re.__webglColorRenderbuffer[De]);const We=r.get(C[De]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,Re.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+De,i.TEXTURE_2D,We,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Re.__webglMultisampledFramebuffer)}else if(F.depthBuffer&&F.resolveDepthBuffer===!1&&h){const C=F.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[C])}}}function Et(F){return Math.min(a.maxSamples,F.samples)}function zt(F){const C=r.get(F);return F.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&C.__useRenderToTexture!==!1}function Y(F){const C=c.render.frame;m.get(F)!==C&&(m.set(F,C),F.update())}function pn(F,C){const D=F.colorSpace,Z=F.format,me=F.type;return F.isCompressedTexture===!0||F.isVideoTexture===!0||D!==ad&&D!==ws&&(At.getTransfer(D)===Vt?(Z!==Ki||me!==Si)&&lt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Dt("WebGLTextures: Unsupported texture color space:",D)),C}function wt(F){return typeof HTMLImageElement<"u"&&F instanceof HTMLImageElement?(f.width=F.naturalWidth||F.width,f.height=F.naturalHeight||F.height):typeof VideoFrame<"u"&&F instanceof VideoFrame?(f.width=F.displayWidth,f.height=F.displayHeight):(f.width=F.width,f.height=F.height),f}this.allocateTextureUnit=oe,this.resetTextureUnits=se,this.getTextureUnits=j,this.setTextureUnits=k,this.setTexture2D=K,this.setTexture2DArray=he,this.setTexture3D=de,this.setTextureCube=z,this.rebindTextures=mt,this.setupRenderTarget=vt,this.updateRenderTargetMipmap=kt,this.updateMultisampleRenderTarget=$t,this.setupDepthRenderbuffer=Ct,this.setupFrameBufferTexture=tt,this.useMultisampledRTT=zt,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function HP(i,e){function t(r,a=ws){let l;const c=At.getTransfer(a);if(r===Si)return i.UNSIGNED_BYTE;if(r===Pm)return i.UNSIGNED_SHORT_4_4_4_4;if(r===Nm)return i.UNSIGNED_SHORT_5_5_5_1;if(r===cy)return i.UNSIGNED_INT_5_9_9_9_REV;if(r===uy)return i.UNSIGNED_INT_10F_11F_11F_REV;if(r===oy)return i.BYTE;if(r===ly)return i.SHORT;if(r===jl)return i.UNSIGNED_SHORT;if(r===Am)return i.INT;if(r===vr)return i.UNSIGNED_INT;if(r===fr)return i.FLOAT;if(r===qr)return i.HALF_FLOAT;if(r===dy)return i.ALPHA;if(r===hy)return i.RGB;if(r===Ki)return i.RGBA;if(r===Yr)return i.DEPTH_COMPONENT;if(r===ha)return i.DEPTH_STENCIL;if(r===fy)return i.RED;if(r===Lm)return i.RED_INTEGER;if(r===Ta)return i.RG;if(r===Dm)return i.RG_INTEGER;if(r===Im)return i.RGBA_INTEGER;if(r===Xu||r===$u||r===qu||r===Yu)if(c===Vt)if(l=e.get("WEBGL_compressed_texture_s3tc_srgb"),l!==null){if(r===Xu)return l.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(r===$u)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(r===qu)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(r===Yu)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(l=e.get("WEBGL_compressed_texture_s3tc"),l!==null){if(r===Xu)return l.COMPRESSED_RGB_S3TC_DXT1_EXT;if(r===$u)return l.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(r===qu)return l.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(r===Yu)return l.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(r===wp||r===bp||r===Tp||r===Cp)if(l=e.get("WEBGL_compressed_texture_pvrtc"),l!==null){if(r===wp)return l.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(r===bp)return l.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(r===Tp)return l.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(r===Cp)return l.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(r===Rp||r===Ap||r===Pp||r===Np||r===Lp||r===id||r===Dp)if(l=e.get("WEBGL_compressed_texture_etc"),l!==null){if(r===Rp||r===Ap)return c===Vt?l.COMPRESSED_SRGB8_ETC2:l.COMPRESSED_RGB8_ETC2;if(r===Pp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:l.COMPRESSED_RGBA8_ETC2_EAC;if(r===Np)return l.COMPRESSED_R11_EAC;if(r===Lp)return l.COMPRESSED_SIGNED_R11_EAC;if(r===id)return l.COMPRESSED_RG11_EAC;if(r===Dp)return l.COMPRESSED_SIGNED_RG11_EAC}else return null;if(r===Ip||r===Up||r===Fp||r===Op||r===kp||r===zp||r===Bp||r===Hp||r===Vp||r===Gp||r===jp||r===Wp||r===Xp||r===$p)if(l=e.get("WEBGL_compressed_texture_astc"),l!==null){if(r===Ip)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:l.COMPRESSED_RGBA_ASTC_4x4_KHR;if(r===Up)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:l.COMPRESSED_RGBA_ASTC_5x4_KHR;if(r===Fp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:l.COMPRESSED_RGBA_ASTC_5x5_KHR;if(r===Op)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:l.COMPRESSED_RGBA_ASTC_6x5_KHR;if(r===kp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:l.COMPRESSED_RGBA_ASTC_6x6_KHR;if(r===zp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:l.COMPRESSED_RGBA_ASTC_8x5_KHR;if(r===Bp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:l.COMPRESSED_RGBA_ASTC_8x6_KHR;if(r===Hp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:l.COMPRESSED_RGBA_ASTC_8x8_KHR;if(r===Vp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:l.COMPRESSED_RGBA_ASTC_10x5_KHR;if(r===Gp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:l.COMPRESSED_RGBA_ASTC_10x6_KHR;if(r===jp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:l.COMPRESSED_RGBA_ASTC_10x8_KHR;if(r===Wp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:l.COMPRESSED_RGBA_ASTC_10x10_KHR;if(r===Xp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:l.COMPRESSED_RGBA_ASTC_12x10_KHR;if(r===$p)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:l.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(r===qp||r===Yp||r===Kp)if(l=e.get("EXT_texture_compression_bptc"),l!==null){if(r===qp)return c===Vt?l.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:l.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(r===Yp)return l.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(r===Kp)return l.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(r===Qp||r===Zp||r===rd||r===Jp)if(l=e.get("EXT_texture_compression_rgtc"),l!==null){if(r===Qp)return l.COMPRESSED_RED_RGTC1_EXT;if(r===Zp)return l.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(r===rd)return l.COMPRESSED_RED_GREEN_RGTC2_EXT;if(r===Jp)return l.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return r===Wl?i.UNSIGNED_INT_24_8:i[r]!==void 0?i[r]:null}return{convert:t}}const VP=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,GP=`
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

}`;class jP{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const r=new My(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=r}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,r=new yr({vertexShader:VP,fragmentShader:GP,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Zi(new vd(20,20),r)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class WP extends ks{constructor(e,t){super();const r=this;let a=null,l=1,c=null,d="local-floor",h=1,f=null,m=null,g=null,x=null,M=null,E=null;const w=typeof XRWebGLBinding<"u",_=new jP,y={},L=t.getContextAttributes();let P=null,T=null;const U=[],N=[],O=new dt;let b=null;const I=new Ii;I.viewport=new un;const W=new Ii;W.viewport=new un;const V=[I,W],J=new eT;let se=null,j=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(ce){let ye=U[ce];return ye===void 0&&(ye=new yf,U[ce]=ye),ye.getTargetRaySpace()},this.getControllerGrip=function(ce){let ye=U[ce];return ye===void 0&&(ye=new yf,U[ce]=ye),ye.getGripSpace()},this.getHand=function(ce){let ye=U[ce];return ye===void 0&&(ye=new yf,U[ce]=ye),ye.getHandSpace()};function k(ce){const ye=N.indexOf(ce.inputSource);if(ye===-1)return;const ge=U[ye];ge!==void 0&&(ge.update(ce.inputSource,ce.frame,f||c),ge.dispatchEvent({type:ce.type,data:ce.inputSource}))}function oe(){a.removeEventListener("select",k),a.removeEventListener("selectstart",k),a.removeEventListener("selectend",k),a.removeEventListener("squeeze",k),a.removeEventListener("squeezestart",k),a.removeEventListener("squeezeend",k),a.removeEventListener("end",oe),a.removeEventListener("inputsourceschange",te);for(let ce=0;ce<U.length;ce++){const ye=N[ce];ye!==null&&(N[ce]=null,U[ce].disconnect(ye))}se=null,j=null,_.reset();for(const ce in y)delete y[ce];e.setRenderTarget(P),M=null,x=null,g=null,a=null,T=null,Ge.stop(),r.isPresenting=!1,e.setPixelRatio(b),e.setSize(O.width,O.height,!1),r.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(ce){l=ce,r.isPresenting===!0&&lt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(ce){d=ce,r.isPresenting===!0&&lt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return f||c},this.setReferenceSpace=function(ce){f=ce},this.getBaseLayer=function(){return x!==null?x:M},this.getBinding=function(){return g===null&&w&&(g=new XRWebGLBinding(a,t)),g},this.getFrame=function(){return E},this.getSession=function(){return a},this.setSession=async function(ce){if(a=ce,a!==null){if(P=e.getRenderTarget(),a.addEventListener("select",k),a.addEventListener("selectstart",k),a.addEventListener("selectend",k),a.addEventListener("squeeze",k),a.addEventListener("squeezestart",k),a.addEventListener("squeezeend",k),a.addEventListener("end",oe),a.addEventListener("inputsourceschange",te),L.xrCompatible!==!0&&await t.makeXRCompatible(),b=e.getPixelRatio(),e.getSize(O),w&&"createProjectionLayer"in XRWebGLBinding.prototype){let ge=null,Ue=null,Ze=null;L.depth&&(Ze=L.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ge=L.stencil?ha:Yr,Ue=L.stencil?Wl:vr);const tt={colorFormat:t.RGBA8,depthFormat:Ze,scaleFactor:l};g=this.getBinding(),x=g.createProjectionLayer(tt),a.updateRenderState({layers:[x]}),e.setPixelRatio(1),e.setSize(x.textureWidth,x.textureHeight,!1),T=new gr(x.textureWidth,x.textureHeight,{format:Ki,type:Si,depthTexture:new Uo(x.textureWidth,x.textureHeight,Ue,void 0,void 0,void 0,void 0,void 0,void 0,ge),stencilBuffer:L.stencil,colorSpace:e.outputColorSpace,samples:L.antialias?4:0,resolveDepthBuffer:x.ignoreDepthValues===!1,resolveStencilBuffer:x.ignoreDepthValues===!1})}else{const ge={antialias:L.antialias,alpha:!0,depth:L.depth,stencil:L.stencil,framebufferScaleFactor:l};M=new XRWebGLLayer(a,t,ge),a.updateRenderState({baseLayer:M}),e.setPixelRatio(1),e.setSize(M.framebufferWidth,M.framebufferHeight,!1),T=new gr(M.framebufferWidth,M.framebufferHeight,{format:Ki,type:Si,colorSpace:e.outputColorSpace,stencilBuffer:L.stencil,resolveDepthBuffer:M.ignoreDepthValues===!1,resolveStencilBuffer:M.ignoreDepthValues===!1})}T.isXRRenderTarget=!0,this.setFoveation(h),f=null,c=await a.requestReferenceSpace(d),Ge.setContext(a),Ge.start(),r.isPresenting=!0,r.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(a!==null)return a.environmentBlendMode},this.getDepthTexture=function(){return _.getDepthTexture()};function te(ce){for(let ye=0;ye<ce.removed.length;ye++){const ge=ce.removed[ye],Ue=N.indexOf(ge);Ue>=0&&(N[Ue]=null,U[Ue].disconnect(ge))}for(let ye=0;ye<ce.added.length;ye++){const ge=ce.added[ye];let Ue=N.indexOf(ge);if(Ue===-1){for(let tt=0;tt<U.length;tt++)if(tt>=N.length){N.push(ge),Ue=tt;break}else if(N[tt]===null){N[tt]=ge,Ue=tt;break}if(Ue===-1)break}const Ze=U[Ue];Ze&&Ze.connect(ge)}}const K=new ne,he=new ne;function de(ce,ye,ge){K.setFromMatrixPosition(ye.matrixWorld),he.setFromMatrixPosition(ge.matrixWorld);const Ue=K.distanceTo(he),Ze=ye.projectionMatrix.elements,tt=ge.projectionMatrix.elements,Gt=Ze[14]/(Ze[10]-1),ut=Ze[14]/(Ze[10]+1),Ct=(Ze[9]+1)/Ze[5],mt=(Ze[9]-1)/Ze[5],vt=(Ze[8]-1)/Ze[0],kt=(tt[8]+1)/tt[0],Xt=Gt*vt,qt=Gt*kt,$t=Ue/(-vt+kt),Et=$t*-vt;if(ye.matrixWorld.decompose(ce.position,ce.quaternion,ce.scale),ce.translateX(Et),ce.translateZ($t),ce.matrixWorld.compose(ce.position,ce.quaternion,ce.scale),ce.matrixWorldInverse.copy(ce.matrixWorld).invert(),Ze[10]===-1)ce.projectionMatrix.copy(ye.projectionMatrix),ce.projectionMatrixInverse.copy(ye.projectionMatrixInverse);else{const zt=Gt+$t,Y=ut+$t,pn=Xt-Et,wt=qt+(Ue-Et),F=Ct*ut/Y*zt,C=mt*ut/Y*zt;ce.projectionMatrix.makePerspective(pn,wt,F,C,zt,Y),ce.projectionMatrixInverse.copy(ce.projectionMatrix).invert()}}function z(ce,ye){ye===null?ce.matrixWorld.copy(ce.matrix):ce.matrixWorld.multiplyMatrices(ye.matrixWorld,ce.matrix),ce.matrixWorldInverse.copy(ce.matrixWorld).invert()}this.updateCamera=function(ce){if(a===null)return;let ye=ce.near,ge=ce.far;_.texture!==null&&(_.depthNear>0&&(ye=_.depthNear),_.depthFar>0&&(ge=_.depthFar)),J.near=W.near=I.near=ye,J.far=W.far=I.far=ge,(se!==J.near||j!==J.far)&&(a.updateRenderState({depthNear:J.near,depthFar:J.far}),se=J.near,j=J.far),J.layers.mask=ce.layers.mask|6,I.layers.mask=J.layers.mask&-5,W.layers.mask=J.layers.mask&-3;const Ue=ce.parent,Ze=J.cameras;z(J,Ue);for(let tt=0;tt<Ze.length;tt++)z(Ze[tt],Ue);Ze.length===2?de(J,I,W):J.projectionMatrix.copy(I.projectionMatrix),q(ce,J,Ue)};function q(ce,ye,ge){ge===null?ce.matrix.copy(ye.matrixWorld):(ce.matrix.copy(ge.matrixWorld),ce.matrix.invert(),ce.matrix.multiply(ye.matrixWorld)),ce.matrix.decompose(ce.position,ce.quaternion,ce.scale),ce.updateMatrixWorld(!0),ce.projectionMatrix.copy(ye.projectionMatrix),ce.projectionMatrixInverse.copy(ye.projectionMatrixInverse),ce.isPerspectiveCamera&&(ce.fov=em*2*Math.atan(1/ce.projectionMatrix.elements[5]),ce.zoom=1)}this.getCamera=function(){return J},this.getFoveation=function(){if(!(x===null&&M===null))return h},this.setFoveation=function(ce){h=ce,x!==null&&(x.fixedFoveation=ce),M!==null&&M.fixedFoveation!==void 0&&(M.fixedFoveation=ce)},this.hasDepthSensing=function(){return _.texture!==null},this.getDepthSensingMesh=function(){return _.getMesh(J)},this.getCameraTexture=function(ce){return y[ce]};let Ie=null;function Be(ce,ye){if(m=ye.getViewerPose(f||c),E=ye,m!==null){const ge=m.views;M!==null&&(e.setRenderTargetFramebuffer(T,M.framebuffer),e.setRenderTarget(T));let Ue=!1;ge.length!==J.cameras.length&&(J.cameras.length=0,Ue=!0);for(let ut=0;ut<ge.length;ut++){const Ct=ge[ut];let mt=null;if(M!==null)mt=M.getViewport(Ct);else{const kt=g.getViewSubImage(x,Ct);mt=kt.viewport,ut===0&&(e.setRenderTargetTextures(T,kt.colorTexture,kt.depthStencilTexture),e.setRenderTarget(T))}let vt=V[ut];vt===void 0&&(vt=new Ii,vt.layers.enable(ut),vt.viewport=new un,V[ut]=vt),vt.matrix.fromArray(Ct.transform.matrix),vt.matrix.decompose(vt.position,vt.quaternion,vt.scale),vt.projectionMatrix.fromArray(Ct.projectionMatrix),vt.projectionMatrixInverse.copy(vt.projectionMatrix).invert(),vt.viewport.set(mt.x,mt.y,mt.width,mt.height),ut===0&&(J.matrix.copy(vt.matrix),J.matrix.decompose(J.position,J.quaternion,J.scale)),Ue===!0&&J.cameras.push(vt)}const Ze=a.enabledFeatures;if(Ze&&Ze.includes("depth-sensing")&&a.depthUsage=="gpu-optimized"&&w){g=r.getBinding();const ut=g.getDepthInformation(ge[0]);ut&&ut.isValid&&ut.texture&&_.init(ut,a.renderState)}if(Ze&&Ze.includes("camera-access")&&w){e.state.unbindTexture(),g=r.getBinding();for(let ut=0;ut<ge.length;ut++){const Ct=ge[ut].camera;if(Ct){let mt=y[Ct];mt||(mt=new My,y[Ct]=mt);const vt=g.getCameraImage(Ct);mt.sourceTexture=vt}}}}for(let ge=0;ge<U.length;ge++){const Ue=N[ge],Ze=U[ge];Ue!==null&&Ze!==void 0&&Ze.update(Ue,ye,f||c)}Ie&&Ie(ce,ye),ye.detectedPlanes&&r.dispatchEvent({type:"planesdetected",data:ye}),E=null}const Ge=new by;Ge.setAnimationLoop(Be),this.setAnimationLoop=function(ce){Ie=ce},this.dispose=function(){}}}const XP=new an,Ly=new pt;Ly.set(-1,0,0,0,1,0,0,0,1);function $P(i,e){function t(_,y){_.matrixAutoUpdate===!0&&_.updateMatrix(),y.value.copy(_.matrix)}function r(_,y){y.color.getRGB(_.fogColor.value,Ey(i)),y.isFog?(_.fogNear.value=y.near,_.fogFar.value=y.far):y.isFogExp2&&(_.fogDensity.value=y.density)}function a(_,y,L,P,T){y.isNodeMaterial?y.uniformsNeedUpdate=!1:y.isMeshBasicMaterial?l(_,y):y.isMeshLambertMaterial?(l(_,y),y.envMap&&(_.envMapIntensity.value=y.envMapIntensity)):y.isMeshToonMaterial?(l(_,y),g(_,y)):y.isMeshPhongMaterial?(l(_,y),m(_,y),y.envMap&&(_.envMapIntensity.value=y.envMapIntensity)):y.isMeshStandardMaterial?(l(_,y),x(_,y),y.isMeshPhysicalMaterial&&M(_,y,T)):y.isMeshMatcapMaterial?(l(_,y),E(_,y)):y.isMeshDepthMaterial?l(_,y):y.isMeshDistanceMaterial?(l(_,y),w(_,y)):y.isMeshNormalMaterial?l(_,y):y.isLineBasicMaterial?(c(_,y),y.isLineDashedMaterial&&d(_,y)):y.isPointsMaterial?h(_,y,L,P):y.isSpriteMaterial?f(_,y):y.isShadowMaterial?(_.color.value.copy(y.color),_.opacity.value=y.opacity):y.isShaderMaterial&&(y.uniformsNeedUpdate=!1)}function l(_,y){_.opacity.value=y.opacity,y.color&&_.diffuse.value.copy(y.color),y.emissive&&_.emissive.value.copy(y.emissive).multiplyScalar(y.emissiveIntensity),y.map&&(_.map.value=y.map,t(y.map,_.mapTransform)),y.alphaMap&&(_.alphaMap.value=y.alphaMap,t(y.alphaMap,_.alphaMapTransform)),y.bumpMap&&(_.bumpMap.value=y.bumpMap,t(y.bumpMap,_.bumpMapTransform),_.bumpScale.value=y.bumpScale,y.side===hi&&(_.bumpScale.value*=-1)),y.normalMap&&(_.normalMap.value=y.normalMap,t(y.normalMap,_.normalMapTransform),_.normalScale.value.copy(y.normalScale),y.side===hi&&_.normalScale.value.negate()),y.displacementMap&&(_.displacementMap.value=y.displacementMap,t(y.displacementMap,_.displacementMapTransform),_.displacementScale.value=y.displacementScale,_.displacementBias.value=y.displacementBias),y.emissiveMap&&(_.emissiveMap.value=y.emissiveMap,t(y.emissiveMap,_.emissiveMapTransform)),y.specularMap&&(_.specularMap.value=y.specularMap,t(y.specularMap,_.specularMapTransform)),y.alphaTest>0&&(_.alphaTest.value=y.alphaTest);const L=e.get(y),P=L.envMap,T=L.envMapRotation;P&&(_.envMap.value=P,_.envMapRotation.value.setFromMatrix4(XP.makeRotationFromEuler(T)).transpose(),P.isCubeTexture&&P.isRenderTargetTexture===!1&&_.envMapRotation.value.premultiply(Ly),_.reflectivity.value=y.reflectivity,_.ior.value=y.ior,_.refractionRatio.value=y.refractionRatio),y.lightMap&&(_.lightMap.value=y.lightMap,_.lightMapIntensity.value=y.lightMapIntensity,t(y.lightMap,_.lightMapTransform)),y.aoMap&&(_.aoMap.value=y.aoMap,_.aoMapIntensity.value=y.aoMapIntensity,t(y.aoMap,_.aoMapTransform))}function c(_,y){_.diffuse.value.copy(y.color),_.opacity.value=y.opacity,y.map&&(_.map.value=y.map,t(y.map,_.mapTransform))}function d(_,y){_.dashSize.value=y.dashSize,_.totalSize.value=y.dashSize+y.gapSize,_.scale.value=y.scale}function h(_,y,L,P){_.diffuse.value.copy(y.color),_.opacity.value=y.opacity,_.size.value=y.size*L,_.scale.value=P*.5,y.map&&(_.map.value=y.map,t(y.map,_.uvTransform)),y.alphaMap&&(_.alphaMap.value=y.alphaMap,t(y.alphaMap,_.alphaMapTransform)),y.alphaTest>0&&(_.alphaTest.value=y.alphaTest)}function f(_,y){_.diffuse.value.copy(y.color),_.opacity.value=y.opacity,_.rotation.value=y.rotation,y.map&&(_.map.value=y.map,t(y.map,_.mapTransform)),y.alphaMap&&(_.alphaMap.value=y.alphaMap,t(y.alphaMap,_.alphaMapTransform)),y.alphaTest>0&&(_.alphaTest.value=y.alphaTest)}function m(_,y){_.specular.value.copy(y.specular),_.shininess.value=Math.max(y.shininess,1e-4)}function g(_,y){y.gradientMap&&(_.gradientMap.value=y.gradientMap)}function x(_,y){_.metalness.value=y.metalness,y.metalnessMap&&(_.metalnessMap.value=y.metalnessMap,t(y.metalnessMap,_.metalnessMapTransform)),_.roughness.value=y.roughness,y.roughnessMap&&(_.roughnessMap.value=y.roughnessMap,t(y.roughnessMap,_.roughnessMapTransform)),y.envMap&&(_.envMapIntensity.value=y.envMapIntensity)}function M(_,y,L){_.ior.value=y.ior,y.sheen>0&&(_.sheenColor.value.copy(y.sheenColor).multiplyScalar(y.sheen),_.sheenRoughness.value=y.sheenRoughness,y.sheenColorMap&&(_.sheenColorMap.value=y.sheenColorMap,t(y.sheenColorMap,_.sheenColorMapTransform)),y.sheenRoughnessMap&&(_.sheenRoughnessMap.value=y.sheenRoughnessMap,t(y.sheenRoughnessMap,_.sheenRoughnessMapTransform))),y.clearcoat>0&&(_.clearcoat.value=y.clearcoat,_.clearcoatRoughness.value=y.clearcoatRoughness,y.clearcoatMap&&(_.clearcoatMap.value=y.clearcoatMap,t(y.clearcoatMap,_.clearcoatMapTransform)),y.clearcoatRoughnessMap&&(_.clearcoatRoughnessMap.value=y.clearcoatRoughnessMap,t(y.clearcoatRoughnessMap,_.clearcoatRoughnessMapTransform)),y.clearcoatNormalMap&&(_.clearcoatNormalMap.value=y.clearcoatNormalMap,t(y.clearcoatNormalMap,_.clearcoatNormalMapTransform),_.clearcoatNormalScale.value.copy(y.clearcoatNormalScale),y.side===hi&&_.clearcoatNormalScale.value.negate())),y.dispersion>0&&(_.dispersion.value=y.dispersion),y.iridescence>0&&(_.iridescence.value=y.iridescence,_.iridescenceIOR.value=y.iridescenceIOR,_.iridescenceThicknessMinimum.value=y.iridescenceThicknessRange[0],_.iridescenceThicknessMaximum.value=y.iridescenceThicknessRange[1],y.iridescenceMap&&(_.iridescenceMap.value=y.iridescenceMap,t(y.iridescenceMap,_.iridescenceMapTransform)),y.iridescenceThicknessMap&&(_.iridescenceThicknessMap.value=y.iridescenceThicknessMap,t(y.iridescenceThicknessMap,_.iridescenceThicknessMapTransform))),y.transmission>0&&(_.transmission.value=y.transmission,_.transmissionSamplerMap.value=L.texture,_.transmissionSamplerSize.value.set(L.width,L.height),y.transmissionMap&&(_.transmissionMap.value=y.transmissionMap,t(y.transmissionMap,_.transmissionMapTransform)),_.thickness.value=y.thickness,y.thicknessMap&&(_.thicknessMap.value=y.thicknessMap,t(y.thicknessMap,_.thicknessMapTransform)),_.attenuationDistance.value=y.attenuationDistance,_.attenuationColor.value.copy(y.attenuationColor)),y.anisotropy>0&&(_.anisotropyVector.value.set(y.anisotropy*Math.cos(y.anisotropyRotation),y.anisotropy*Math.sin(y.anisotropyRotation)),y.anisotropyMap&&(_.anisotropyMap.value=y.anisotropyMap,t(y.anisotropyMap,_.anisotropyMapTransform))),_.specularIntensity.value=y.specularIntensity,_.specularColor.value.copy(y.specularColor),y.specularColorMap&&(_.specularColorMap.value=y.specularColorMap,t(y.specularColorMap,_.specularColorMapTransform)),y.specularIntensityMap&&(_.specularIntensityMap.value=y.specularIntensityMap,t(y.specularIntensityMap,_.specularIntensityMapTransform))}function E(_,y){y.matcap&&(_.matcap.value=y.matcap)}function w(_,y){const L=e.get(y).light;_.referencePosition.value.setFromMatrixPosition(L.matrixWorld),_.nearDistance.value=L.shadow.camera.near,_.farDistance.value=L.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:a}}function qP(i,e,t,r){let a={},l={},c=[];const d=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function h(T,U){const N=U.program;r.uniformBlockBinding(T,N)}function f(T,U){let N=a[T.id];N===void 0&&(_(T),N=m(T),a[T.id]=N,T.addEventListener("dispose",L));const O=U.program;r.updateUBOMapping(T,O);const b=e.render.frame;l[T.id]!==b&&(x(T),l[T.id]=b)}function m(T){const U=g();T.__bindingPointIndex=U;const N=i.createBuffer(),O=T.__size,b=T.usage;return i.bindBuffer(i.UNIFORM_BUFFER,N),i.bufferData(i.UNIFORM_BUFFER,O,b),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,U,N),N}function g(){for(let T=0;T<d;T++)if(c.indexOf(T)===-1)return c.push(T),T;return Dt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function x(T){const U=a[T.id],N=T.uniforms,O=T.__cache;i.bindBuffer(i.UNIFORM_BUFFER,U);for(let b=0,I=N.length;b<I;b++){const W=N[b];if(Array.isArray(W))for(let V=0,J=W.length;V<J;V++)M(W[V],b,V,O);else M(W,b,0,O)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function M(T,U,N,O){if(w(T,U,N,O)===!0){const b=T.__offset,I=T.value;if(Array.isArray(I)){let W=0;for(let V=0;V<I.length;V++){const J=I[V],se=y(J);E(J,T.__data,W),typeof J!="number"&&typeof J!="boolean"&&!J.isMatrix3&&!ArrayBuffer.isView(J)&&(W+=se.storage/Float32Array.BYTES_PER_ELEMENT)}}else E(I,T.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,b,T.__data)}}function E(T,U,N){typeof T=="number"||typeof T=="boolean"?U[0]=T:T.isMatrix3?(U[0]=T.elements[0],U[1]=T.elements[1],U[2]=T.elements[2],U[3]=0,U[4]=T.elements[3],U[5]=T.elements[4],U[6]=T.elements[5],U[7]=0,U[8]=T.elements[6],U[9]=T.elements[7],U[10]=T.elements[8],U[11]=0):ArrayBuffer.isView(T)?U.set(new T.constructor(T.buffer,T.byteOffset,U.length)):T.toArray(U,N)}function w(T,U,N,O){const b=T.value,I=U+"_"+N;if(O[I]===void 0)return typeof b=="number"||typeof b=="boolean"?O[I]=b:ArrayBuffer.isView(b)?O[I]=b.slice():O[I]=b.clone(),!0;{const W=O[I];if(typeof b=="number"||typeof b=="boolean"){if(W!==b)return O[I]=b,!0}else{if(ArrayBuffer.isView(b))return!0;if(W.equals(b)===!1)return W.copy(b),!0}}return!1}function _(T){const U=T.uniforms;let N=0;const O=16;for(let I=0,W=U.length;I<W;I++){const V=Array.isArray(U[I])?U[I]:[U[I]];for(let J=0,se=V.length;J<se;J++){const j=V[J],k=Array.isArray(j.value)?j.value:[j.value];for(let oe=0,te=k.length;oe<te;oe++){const K=k[oe],he=y(K),de=N%O,z=de%he.boundary,q=de+z;N+=z,q!==0&&O-q<he.storage&&(N+=O-q),j.__data=new Float32Array(he.storage/Float32Array.BYTES_PER_ELEMENT),j.__offset=N,N+=he.storage}}}const b=N%O;return b>0&&(N+=O-b),T.__size=N,T.__cache={},this}function y(T){const U={boundary:0,storage:0};return typeof T=="number"||typeof T=="boolean"?(U.boundary=4,U.storage=4):T.isVector2?(U.boundary=8,U.storage=8):T.isVector3||T.isColor?(U.boundary=16,U.storage=12):T.isVector4?(U.boundary=16,U.storage=16):T.isMatrix3?(U.boundary=48,U.storage=48):T.isMatrix4?(U.boundary=64,U.storage=64):T.isTexture?lt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(T)?(U.boundary=16,U.storage=T.byteLength):lt("WebGLRenderer: Unsupported uniform value type.",T),U}function L(T){const U=T.target;U.removeEventListener("dispose",L);const N=c.indexOf(U.__bindingPointIndex);c.splice(N,1),i.deleteBuffer(a[U.id]),delete a[U.id],delete l[U.id]}function P(){for(const T in a)i.deleteBuffer(a[T]);c=[],a={},l={}}return{bind:h,update:f,dispose:P}}const YP=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let or=null;function KP(){return or===null&&(or=new Ab(YP,16,16,Ta,qr),or.name="DFG_LUT",or.minFilter=Wn,or.magFilter=Wn,or.wrapS=Gr,or.wrapT=Gr,or.generateMipmaps=!1,or.needsUpdate=!0),or}class QP{constructor(e={}){const{canvas:t=sb(),context:r=null,depth:a=!0,stencil:l=!1,alpha:c=!1,antialias:d=!1,premultipliedAlpha:h=!0,preserveDrawingBuffer:f=!1,powerPreference:m="default",failIfMajorPerformanceCaveat:g=!1,reversedDepthBuffer:x=!1,outputBufferType:M=Si}=e;this.isWebGLRenderer=!0;let E;if(r!==null){if(typeof WebGLRenderingContext<"u"&&r instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");E=r.getContextAttributes().alpha}else E=c;const w=M,_=new Set([Im,Dm,Lm]),y=new Set([Si,vr,jl,Wl,Pm,Nm]),L=new Uint32Array(4),P=new Int32Array(4),T=new ne;let U=null,N=null;const O=[],b=[];let I=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=mr,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const W=this;let V=!1,J=null,se=null,j=null,k=null;this._outputColorSpace=Jn;let oe=0,te=0,K=null,he=-1,de=null;const z=new un,q=new un;let Ie=null;const Be=new xt(0);let Ge=0,ce=t.width,ye=t.height,ge=1,Ue=null,Ze=null;const tt=new un(0,0,ce,ye),Gt=new un(0,0,ce,ye);let ut=!1;const Ct=new km;let mt=!1,vt=!1;const kt=new an,Xt=new ne,qt=new un,$t={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Et=!1;function zt(){return K===null?ge:1}let Y=r;function pn(A,ee){return t.getContext(A,ee)}try{const A={alpha:!0,depth:a,stencil:l,antialias:d,premultipliedAlpha:h,preserveDrawingBuffer:f,powerPreference:m,failIfMajorPerformanceCaveat:g};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Tm}`),t.addEventListener("webglcontextlost",jt,!1),t.addEventListener("webglcontextrestored",Ut,!1),t.addEventListener("webglcontextcreationerror",On,!1),Y===null){const ee="webgl2";if(Y=pn(ee,A),Y===null)throw pn(ee)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(A){throw Dt("WebGLRenderer: "+A.message),A}let wt,F,C,D,Z,me,Ee,Re,xe,ve,De,We,ie,Se,Oe,nt,st,$,Pe,_e,Le,Fe,Me;function Ye(){wt=new KR(Y),wt.init(),Le=new HP(Y,wt),F=new VR(Y,wt,e,Le),C=new zP(Y,wt),F.reversedDepthBuffer&&x&&C.buffers.depth.setReversed(!0),se=Y.createFramebuffer(),j=Y.createFramebuffer(),k=Y.createFramebuffer(),D=new JR(Y),Z=new bP,me=new BP(Y,wt,C,Z,F,Le,D),Ee=new YR(W),Re=new iT(Y),Fe=new BR(Y,Re),xe=new QR(Y,Re,D,Fe),ve=new tA(Y,xe,Re,Fe,D),$=new eA(Y,F,me),Oe=new GR(Z),De=new wP(W,Ee,wt,F,Fe,Oe),We=new $P(W,Z),ie=new CP,Se=new DP(wt),st=new zR(W,Ee,C,ve,E,h),nt=new kP(W,ve,F),Me=new qP(Y,D,F,C),Pe=new HR(Y,wt,D),_e=new ZR(Y,wt,D),D.programs=De.programs,W.capabilities=F,W.extensions=wt,W.properties=Z,W.renderLists=ie,W.shadowMap=nt,W.state=C,W.info=D}Ye(),w!==Si&&(I=new iA(w,t.width,t.height,d,a,l));const $e=new WP(W,Y);this.xr=$e,this.getContext=function(){return Y},this.getContextAttributes=function(){return Y.getContextAttributes()},this.forceContextLoss=function(){const A=wt.get("WEBGL_lose_context");A&&A.loseContext()},this.forceContextRestore=function(){const A=wt.get("WEBGL_lose_context");A&&A.restoreContext()},this.getPixelRatio=function(){return ge},this.setPixelRatio=function(A){A!==void 0&&(ge=A,this.setSize(ce,ye,!1))},this.getSize=function(A){return A.set(ce,ye)},this.setSize=function(A,ee,fe=!0){if($e.isPresenting){lt("WebGLRenderer: Can't change size while VR device is presenting.");return}ce=A,ye=ee,t.width=Math.floor(A*ge),t.height=Math.floor(ee*ge),fe===!0&&(t.style.width=A+"px",t.style.height=ee+"px"),I!==null&&I.setSize(t.width,t.height),this.setViewport(0,0,A,ee)},this.getDrawingBufferSize=function(A){return A.set(ce*ge,ye*ge).floor()},this.setDrawingBufferSize=function(A,ee,fe){ce=A,ye=ee,ge=fe,t.width=Math.floor(A*fe),t.height=Math.floor(ee*fe),this.setViewport(0,0,A,ee)},this.setEffects=function(A){if(w===Si){Dt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(A){for(let ee=0;ee<A.length;ee++)if(A[ee].isOutputPass===!0){lt("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}I.setEffects(A||[])},this.getCurrentViewport=function(A){return A.copy(z)},this.getViewport=function(A){return A.copy(tt)},this.setViewport=function(A,ee,fe,le){A.isVector4?tt.set(A.x,A.y,A.z,A.w):tt.set(A,ee,fe,le),C.viewport(z.copy(tt).multiplyScalar(ge).round())},this.getScissor=function(A){return A.copy(Gt)},this.setScissor=function(A,ee,fe,le){A.isVector4?Gt.set(A.x,A.y,A.z,A.w):Gt.set(A,ee,fe,le),C.scissor(q.copy(Gt).multiplyScalar(ge).round())},this.getScissorTest=function(){return ut},this.setScissorTest=function(A){C.setScissorTest(ut=A)},this.setOpaqueSort=function(A){Ue=A},this.setTransparentSort=function(A){Ze=A},this.getClearColor=function(A){return A.copy(st.getClearColor())},this.setClearColor=function(){st.setClearColor(...arguments)},this.getClearAlpha=function(){return st.getClearAlpha()},this.setClearAlpha=function(){st.setClearAlpha(...arguments)},this.clear=function(A=!0,ee=!0,fe=!0){let le=0;if(A){let ae=!1;if(K!==null){const Ne=K.texture.format;ae=_.has(Ne)}if(ae){const Ne=K.texture.type,je=y.has(Ne),Ae=st.getClearColor(),Ke=st.getClearAlpha(),it=Ae.r,ht=Ae.g,ft=Ae.b;je?(L[0]=it,L[1]=ht,L[2]=ft,L[3]=Ke,Y.clearBufferuiv(Y.COLOR,0,L)):(P[0]=it,P[1]=ht,P[2]=ft,P[3]=Ke,Y.clearBufferiv(Y.COLOR,0,P))}else le|=Y.COLOR_BUFFER_BIT}ee&&(le|=Y.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),fe&&(le|=Y.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),le!==0&&Y.clear(le)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(A){A.setRenderer(this),J=A},this.dispose=function(){t.removeEventListener("webglcontextlost",jt,!1),t.removeEventListener("webglcontextrestored",Ut,!1),t.removeEventListener("webglcontextcreationerror",On,!1),st.dispose(),ie.dispose(),Se.dispose(),Z.dispose(),Ee.dispose(),ve.dispose(),Fe.dispose(),Me.dispose(),De.dispose(),$e.dispose(),$e.removeEventListener("sessionstart",sc),$e.removeEventListener("sessionend",ac),$n.stop()};function jt(A){A.preventDefault(),Qx("WebGLRenderer: Context Lost."),V=!0}function Ut(){Qx("WebGLRenderer: Context Restored."),V=!1;const A=D.autoReset,ee=nt.enabled,fe=nt.autoUpdate,le=nt.needsUpdate,ae=nt.type;Ye(),D.autoReset=A,nt.enabled=ee,nt.autoUpdate=fe,nt.needsUpdate=le,nt.type=ae}function On(A){Dt("WebGLRenderer: A WebGL context could not be created. Reason: ",A.statusMessage)}function wi(A){const ee=A.target;ee.removeEventListener("dispose",wi),zs(ee)}function zs(A){Ca(A),Z.remove(A)}function Ca(A){const ee=Z.get(A).programs;ee!==void 0&&(ee.forEach(function(fe){De.releaseProgram(fe)}),A.isShaderMaterial&&De.releaseShaderCache(A))}this.renderBufferDirect=function(A,ee,fe,le,ae,Ne){ee===null&&(ee=$t);const je=ae.isMesh&&ae.matrixWorld.determinantAffine()<0,Ae=on(A,ee,fe,le,ae);C.setMaterial(le,je);let Ke=fe.index,it=1;if(le.wireframe===!0){if(Ke=xe.getWireframeAttribute(fe),Ke===void 0)return;it=2}const ht=fe.drawRange,ft=fe.attributes.position;let Je=ht.start*it,Nt=(ht.start+ht.count)*it;Ne!==null&&(Je=Math.max(Je,Ne.start*it),Nt=Math.min(Nt,(Ne.start+Ne.count)*it)),Ke!==null?(Je=Math.max(Je,0),Nt=Math.min(Nt,Ke.count)):ft!=null&&(Je=Math.max(Je,0),Nt=Math.min(Nt,ft.count));const Yt=Nt-Je;if(Yt<0||Yt===1/0)return;Fe.setup(ae,le,Ae,fe,Ke);let en,Bt=Pe;if(Ke!==null&&(en=Re.get(Ke),Bt=_e,Bt.setIndex(en)),ae.isMesh)le.wireframe===!0?(C.setLineWidth(le.wireframeLinewidth*zt()),Bt.setMode(Y.LINES)):Bt.setMode(Y.TRIANGLES);else if(ae.isLine){let gn=le.linewidth;gn===void 0&&(gn=1),C.setLineWidth(gn*zt()),ae.isLineSegments?Bt.setMode(Y.LINES):ae.isLineLoop?Bt.setMode(Y.LINE_LOOP):Bt.setMode(Y.LINE_STRIP)}else ae.isPoints?Bt.setMode(Y.POINTS):ae.isSprite&&Bt.setMode(Y.TRIANGLES);if(ae.isBatchedMesh)if(wt.get("WEBGL_multi_draw"))Bt.renderMultiDraw(ae._multiDrawStarts,ae._multiDrawCounts,ae._multiDrawCount);else{const gn=ae._multiDrawStarts,He=ae._multiDrawCounts,Ln=ae._multiDrawCount,yt=Ke?Re.get(Ke).bytesPerElement:1,ei=Z.get(le).currentProgram.getUniforms();for(let ti=0;ti<Ln;ti++)ei.setValue(Y,"_gl_DrawID",ti),Bt.render(gn[ti]/yt,He[ti])}else if(ae.isInstancedMesh)Bt.renderInstances(Je,Yt,ae.count);else if(fe.isInstancedBufferGeometry){const gn=fe._maxInstanceCount!==void 0?fe._maxInstanceCount:1/0,He=Math.min(fe.instanceCount,gn);Bt.renderInstances(Je,Yt,He)}else Bt.render(Je,Yt)};function Bs(A,ee,fe){A.transparent===!0&&A.side===hr&&A.forceSinglePass===!1?(A.side=hi,A.needsUpdate=!0,Gs(A,ee,fe),A.side=Fs,A.needsUpdate=!0,Gs(A,ee,fe),A.side=hr):Gs(A,ee,fe)}this.compile=function(A,ee,fe=null){fe===null&&(fe=A),N=Se.get(fe),N.init(ee),b.push(N),fe.traverseVisible(function(ae){ae.isLight&&ae.layers.test(ee.layers)&&(N.pushLight(ae),ae.castShadow&&N.pushShadow(ae))}),A!==fe&&A.traverseVisible(function(ae){ae.isLight&&ae.layers.test(ee.layers)&&(N.pushLight(ae),ae.castShadow&&N.pushShadow(ae))}),N.setupLights();const le=new Set;return A.traverse(function(ae){if(!(ae.isMesh||ae.isPoints||ae.isLine||ae.isSprite))return;const Ne=ae.material;if(Ne)if(Array.isArray(Ne))for(let je=0;je<Ne.length;je++){const Ae=Ne[je];Bs(Ae,fe,ae),le.add(Ae)}else Bs(Ne,fe,ae),le.add(Ne)}),N=b.pop(),le},this.compileAsync=function(A,ee,fe=null){const le=this.compile(A,ee,fe);return new Promise(ae=>{function Ne(){if(le.forEach(function(je){Z.get(je).currentProgram.isReady()&&le.delete(je)}),le.size===0){ae(A);return}setTimeout(Ne,10)}wt.get("KHR_parallel_shader_compile")!==null?Ne():setTimeout(Ne,10)})};let Hs=null;function Sd(A){Hs&&Hs(A)}function sc(){$n.stop()}function ac(){$n.start()}const $n=new by;$n.setAnimationLoop(Sd),typeof self<"u"&&$n.setContext(self),this.setAnimationLoop=function(A){Hs=A,$e.setAnimationLoop(A),A===null?$n.stop():$n.start()},$e.addEventListener("sessionstart",sc),$e.addEventListener("sessionend",ac),this.render=function(A,ee){if(ee!==void 0&&ee.isCamera!==!0){Dt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(V===!0)return;J!==null&&J.renderStart(A,ee);const fe=$e.enabled===!0&&$e.isPresenting===!0,le=I!==null&&(K===null||fe)&&I.begin(W,K);if(A.matrixWorldAutoUpdate===!0&&A.updateMatrixWorld(),ee.parent===null&&ee.matrixWorldAutoUpdate===!0&&ee.updateMatrixWorld(),$e.enabled===!0&&$e.isPresenting===!0&&(I===null||I.isCompositing()===!1)&&($e.cameraAutoUpdate===!0&&$e.updateCamera(ee),ee=$e.getCamera()),A.isScene===!0&&A.onBeforeRender(W,A,ee,K),N=Se.get(A,b.length),N.init(ee),N.state.textureUnits=me.getTextureUnits(),b.push(N),kt.multiplyMatrices(ee.projectionMatrix,ee.matrixWorldInverse),Ct.setFromProjectionMatrix(kt,pr,ee.reversedDepth),vt=this.localClippingEnabled,mt=Oe.init(this.clippingPlanes,vt),U=ie.get(A,O.length),U.init(),O.push(U),$e.enabled===!0&&$e.isPresenting===!0){const je=W.xr.getDepthSensingMesh();je!==null&&Ra(je,ee,-1/0,W.sortObjects)}Ra(A,ee,0,W.sortObjects),U.finish(),W.sortObjects===!0&&U.sort(Ue,Ze,ee.reversedDepth),Et=$e.enabled===!1||$e.isPresenting===!1||$e.hasDepthSensing()===!1,Et&&st.addToRenderList(U,A),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),mt===!0&&Oe.beginShadows();const ae=N.state.shadowsArray;if(nt.render(ae,A,ee),mt===!0&&Oe.endShadows(),(le&&I.hasRenderPass())===!1){const je=U.opaque,Ae=U.transmissive;if(N.setupLights(),ee.isArrayCamera){const Ke=ee.cameras;if(Ae.length>0)for(let it=0,ht=Ke.length;it<ht;it++){const ft=Ke[it];oc(je,Ae,A,ft)}Et&&st.render(A);for(let it=0,ht=Ke.length;it<ht;it++){const ft=Ke[it];Go(U,A,ft,ft.viewport)}}else Ae.length>0&&oc(je,Ae,A,ee),Et&&st.render(A),Go(U,A,ee)}K!==null&&te===0&&(me.updateMultisampleRenderTarget(K),me.updateRenderTargetMipmap(K)),le&&I.end(W),A.isScene===!0&&A.onAfterRender(W,A,ee),Fe.resetDefaultState(),he=-1,de=null,b.pop(),b.length>0?(N=b[b.length-1],me.setTextureUnits(N.state.textureUnits),mt===!0&&Oe.setGlobalState(W.clippingPlanes,N.state.camera)):N=null,O.pop(),O.length>0?U=O[O.length-1]:U=null,J!==null&&J.renderEnd()};function Ra(A,ee,fe,le){if(A.visible===!1)return;if(A.layers.test(ee.layers)){if(A.isGroup)fe=A.renderOrder;else if(A.isLOD)A.autoUpdate===!0&&A.update(ee);else if(A.isLightProbeGrid)N.pushLightProbeGrid(A);else if(A.isLight)N.pushLight(A),A.castShadow&&N.pushShadow(A);else if(A.isSprite){if(!A.frustumCulled||Ct.intersectsSprite(A)){le&&qt.setFromMatrixPosition(A.matrixWorld).applyMatrix4(kt);const je=ve.update(A),Ae=A.material;Ae.visible&&U.push(A,je,Ae,fe,qt.z,null)}}else if((A.isMesh||A.isLine||A.isPoints)&&(!A.frustumCulled||Ct.intersectsObject(A))){const je=ve.update(A),Ae=A.material;if(le&&(A.boundingSphere!==void 0?(A.boundingSphere===null&&A.computeBoundingSphere(),qt.copy(A.boundingSphere.center)):(je.boundingSphere===null&&je.computeBoundingSphere(),qt.copy(je.boundingSphere.center)),qt.applyMatrix4(A.matrixWorld).applyMatrix4(kt)),Array.isArray(Ae)){const Ke=je.groups;for(let it=0,ht=Ke.length;it<ht;it++){const ft=Ke[it],Je=Ae[ft.materialIndex];Je&&Je.visible&&U.push(A,je,Je,fe,qt.z,ft)}}else Ae.visible&&U.push(A,je,Ae,fe,qt.z,null)}}const Ne=A.children;for(let je=0,Ae=Ne.length;je<Ae;je++)Ra(Ne[je],ee,fe,le)}function Go(A,ee,fe,le){const{opaque:ae,transmissive:Ne,transparent:je}=A;N.setupLightsView(fe),mt===!0&&Oe.setGlobalState(W.clippingPlanes,fe),le&&C.viewport(z.copy(le)),ae.length>0&&Vs(ae,ee,fe),Ne.length>0&&Vs(Ne,ee,fe),je.length>0&&Vs(je,ee,fe),C.buffers.depth.setTest(!0),C.buffers.depth.setMask(!0),C.buffers.color.setMask(!0),C.setPolygonOffset(!1)}function oc(A,ee,fe,le){if((fe.isScene===!0?fe.overrideMaterial:null)!==null)return;if(N.state.transmissionRenderTarget[le.id]===void 0){const Je=wt.has("EXT_color_buffer_half_float")||wt.has("EXT_color_buffer_float");N.state.transmissionRenderTarget[le.id]=new gr(1,1,{generateMipmaps:!0,type:Je?qr:Si,minFilter:da,samples:Math.max(4,F.samples),stencilBuffer:l,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:At.workingColorSpace})}const Ne=N.state.transmissionRenderTarget[le.id],je=le.viewport||z;Ne.setSize(je.z*W.transmissionResolutionScale,je.w*W.transmissionResolutionScale);const Ae=W.getRenderTarget(),Ke=W.getActiveCubeFace(),it=W.getActiveMipmapLevel();W.setRenderTarget(Ne),W.getClearColor(Be),Ge=W.getClearAlpha(),Ge<1&&W.setClearColor(16777215,.5),W.clear(),Et&&st.render(fe);const ht=W.toneMapping;W.toneMapping=mr;const ft=le.viewport;if(le.viewport!==void 0&&(le.viewport=void 0),N.setupLightsView(le),mt===!0&&Oe.setGlobalState(W.clippingPlanes,le),Vs(A,fe,le),me.updateMultisampleRenderTarget(Ne),me.updateRenderTargetMipmap(Ne),wt.has("WEBGL_multisampled_render_to_texture")===!1){let Je=!1;for(let Nt=0,Yt=ee.length;Nt<Yt;Nt++){const en=ee[Nt],{object:Bt,geometry:gn,material:He,group:Ln}=en;if(He.side===hr&&Bt.layers.test(le.layers)){const yt=He.side;He.side=hi,He.needsUpdate=!0,jo(Bt,fe,le,gn,He,Ln),He.side=yt,He.needsUpdate=!0,Je=!0}}Je===!0&&(me.updateMultisampleRenderTarget(Ne),me.updateRenderTargetMipmap(Ne))}W.setRenderTarget(Ae,Ke,it),W.setClearColor(Be,Ge),ft!==void 0&&(le.viewport=ft),W.toneMapping=ht}function Vs(A,ee,fe){const le=ee.isScene===!0?ee.overrideMaterial:null;for(let ae=0,Ne=A.length;ae<Ne;ae++){const je=A[ae],{object:Ae,geometry:Ke,group:it}=je;let ht=je.material;ht.allowOverride===!0&&le!==null&&(ht=le),Ae.layers.test(fe.layers)&&jo(Ae,ee,fe,Ke,ht,it)}}function jo(A,ee,fe,le,ae,Ne){A.onBeforeRender(W,ee,fe,le,ae,Ne),A.modelViewMatrix.multiplyMatrices(fe.matrixWorldInverse,A.matrixWorld),A.normalMatrix.getNormalMatrix(A.modelViewMatrix),ae.onBeforeRender(W,ee,fe,le,A,Ne),ae.transparent===!0&&ae.side===hr&&ae.forceSinglePass===!1?(ae.side=hi,ae.needsUpdate=!0,W.renderBufferDirect(fe,ee,le,ae,A,Ne),ae.side=Fs,ae.needsUpdate=!0,W.renderBufferDirect(fe,ee,le,ae,A,Ne),ae.side=hr):W.renderBufferDirect(fe,ee,le,ae,A,Ne),A.onAfterRender(W,ee,fe,le,ae,Ne)}function Gs(A,ee,fe){ee.isScene!==!0&&(ee=$t);const le=Z.get(A),ae=N.state.lights,Ne=N.state.shadowsArray,je=ae.state.version,Ae=De.getParameters(A,ae.state,Ne,ee,fe,N.state.lightProbeGridArray),Ke=De.getProgramCacheKey(Ae);let it=le.programs;le.environment=A.isMeshStandardMaterial||A.isMeshLambertMaterial||A.isMeshPhongMaterial?ee.environment:null,le.fog=ee.fog;const ht=A.isMeshStandardMaterial||A.isMeshLambertMaterial&&!A.envMap||A.isMeshPhongMaterial&&!A.envMap;le.envMap=Ee.get(A.envMap||le.environment,ht),le.envMapRotation=le.environment!==null&&A.envMap===null?ee.environmentRotation:A.envMapRotation,it===void 0&&(A.addEventListener("dispose",wi),it=new Map,le.programs=it);let ft=it.get(Ke);if(ft!==void 0){if(le.currentProgram===ft&&le.lightsStateVersion===je)return lc(A,Ae),ft}else Ae.uniforms=De.getUniforms(A),J!==null&&A.isNodeMaterial&&J.build(A,fe,Ae),A.onBeforeCompile(Ae,W),ft=De.acquireProgram(Ae,Ke),it.set(Ke,ft),le.uniforms=Ae.uniforms;const Je=le.uniforms;return(!A.isShaderMaterial&&!A.isRawShaderMaterial||A.clipping===!0)&&(Je.clippingPlanes=Oe.uniform),lc(A,Ae),le.needsLights=Xo(A),le.lightsStateVersion=je,le.needsLights&&(Je.ambientLightColor.value=ae.state.ambient,Je.lightProbe.value=ae.state.probe,Je.directionalLights.value=ae.state.directional,Je.directionalLightShadows.value=ae.state.directionalShadow,Je.spotLights.value=ae.state.spot,Je.spotLightShadows.value=ae.state.spotShadow,Je.rectAreaLights.value=ae.state.rectArea,Je.ltc_1.value=ae.state.rectAreaLTC1,Je.ltc_2.value=ae.state.rectAreaLTC2,Je.pointLights.value=ae.state.point,Je.pointLightShadows.value=ae.state.pointShadow,Je.hemisphereLights.value=ae.state.hemi,Je.directionalShadowMatrix.value=ae.state.directionalShadowMatrix,Je.spotLightMatrix.value=ae.state.spotLightMatrix,Je.spotLightMap.value=ae.state.spotLightMap,Je.pointShadowMatrix.value=ae.state.pointShadowMatrix),le.lightProbeGrid=N.state.lightProbeGridArray.length>0,le.currentProgram=ft,le.uniformsList=null,ft}function Wo(A){if(A.uniformsList===null){const ee=A.currentProgram.getUniforms();A.uniformsList=Zu.seqWithValue(ee.seq,A.uniforms)}return A.uniformsList}function lc(A,ee){const fe=Z.get(A);fe.outputColorSpace=ee.outputColorSpace,fe.batching=ee.batching,fe.batchingColor=ee.batchingColor,fe.instancing=ee.instancing,fe.instancingColor=ee.instancingColor,fe.instancingMorph=ee.instancingMorph,fe.skinning=ee.skinning,fe.morphTargets=ee.morphTargets,fe.morphNormals=ee.morphNormals,fe.morphColors=ee.morphColors,fe.morphTargetsCount=ee.morphTargetsCount,fe.numClippingPlanes=ee.numClippingPlanes,fe.numIntersection=ee.numClipIntersection,fe.vertexAlphas=ee.vertexAlphas,fe.vertexTangents=ee.vertexTangents,fe.toneMapping=ee.toneMapping}function Md(A,ee){if(A.length===0)return null;if(A.length===1)return A[0].texture!==null?A[0]:null;T.setFromMatrixPosition(ee.matrixWorld);for(let fe=0,le=A.length;fe<le;fe++){const ae=A[fe];if(ae.texture!==null&&ae.boundingBox.containsPoint(T))return ae}return null}function on(A,ee,fe,le,ae){ee.isScene!==!0&&(ee=$t),me.resetTextureUnits();const Ne=ee.fog,je=le.isMeshStandardMaterial||le.isMeshLambertMaterial||le.isMeshPhongMaterial?ee.environment:null,Ae=K===null?W.outputColorSpace:K.isXRRenderTarget===!0?K.texture.colorSpace:At.workingColorSpace,Ke=le.isMeshStandardMaterial||le.isMeshLambertMaterial&&!le.envMap||le.isMeshPhongMaterial&&!le.envMap,it=Ee.get(le.envMap||je,Ke),ht=le.vertexColors===!0&&!!fe.attributes.color&&fe.attributes.color.itemSize===4,ft=!!fe.attributes.tangent&&(!!le.normalMap||le.anisotropy>0),Je=!!fe.morphAttributes.position,Nt=!!fe.morphAttributes.normal,Yt=!!fe.morphAttributes.color;let en=mr;le.toneMapped&&(K===null||K.isXRRenderTarget===!0)&&(en=W.toneMapping);const Bt=fe.morphAttributes.position||fe.morphAttributes.normal||fe.morphAttributes.color,gn=Bt!==void 0?Bt.length:0,He=Z.get(le),Ln=N.state.lights;if(mt===!0&&(vt===!0||A!==de)){const Ht=A===de&&le.id===he;Oe.setState(le,A,Ht)}let yt=!1;le.version===He.__version?(He.needsLights&&He.lightsStateVersion!==Ln.state.version||He.outputColorSpace!==Ae||ae.isBatchedMesh&&He.batching===!1||!ae.isBatchedMesh&&He.batching===!0||ae.isBatchedMesh&&He.batchingColor===!0&&ae.colorTexture===null||ae.isBatchedMesh&&He.batchingColor===!1&&ae.colorTexture!==null||ae.isInstancedMesh&&He.instancing===!1||!ae.isInstancedMesh&&He.instancing===!0||ae.isSkinnedMesh&&He.skinning===!1||!ae.isSkinnedMesh&&He.skinning===!0||ae.isInstancedMesh&&He.instancingColor===!0&&ae.instanceColor===null||ae.isInstancedMesh&&He.instancingColor===!1&&ae.instanceColor!==null||ae.isInstancedMesh&&He.instancingMorph===!0&&ae.morphTexture===null||ae.isInstancedMesh&&He.instancingMorph===!1&&ae.morphTexture!==null||He.envMap!==it||le.fog===!0&&He.fog!==Ne||He.numClippingPlanes!==void 0&&(He.numClippingPlanes!==Oe.numPlanes||He.numIntersection!==Oe.numIntersection)||He.vertexAlphas!==ht||He.vertexTangents!==ft||He.morphTargets!==Je||He.morphNormals!==Nt||He.morphColors!==Yt||He.toneMapping!==en||He.morphTargetsCount!==gn||!!He.lightProbeGrid!=N.state.lightProbeGridArray.length>0)&&(yt=!0):(yt=!0,He.__version=le.version);let ei=He.currentProgram;yt===!0&&(ei=Gs(le,ee,ae),J&&le.isNodeMaterial&&J.onUpdateProgram(le,ei,He));let ti=!1,St=!1,Sr=!1;const Ft=ei.getUniforms(),Qt=He.uniforms;if(C.useProgram(ei.program)&&(ti=!0,St=!0,Sr=!0),le.id!==he&&(he=le.id,St=!0),He.needsLights){const Ht=Md(N.state.lightProbeGridArray,ae);He.lightProbeGrid!==Ht&&(He.lightProbeGrid=Ht,St=!0)}if(ti||de!==A){C.buffers.depth.getReversed()&&A.reversedDepth!==!0&&(A._reversedDepth=!0,A.updateProjectionMatrix()),Ft.setValue(Y,"projectionMatrix",A.projectionMatrix),Ft.setValue(Y,"viewMatrix",A.matrixWorldInverse);const Oi=Ft.map.cameraPosition;Oi!==void 0&&Oi.setValue(Y,Xt.setFromMatrixPosition(A.matrixWorld)),F.logarithmicDepthBuffer&&Ft.setValue(Y,"logDepthBufFC",2/(Math.log(A.far+1)/Math.LN2)),(le.isMeshPhongMaterial||le.isMeshToonMaterial||le.isMeshLambertMaterial||le.isMeshBasicMaterial||le.isMeshStandardMaterial||le.isShaderMaterial)&&Ft.setValue(Y,"isOrthographic",A.isOrthographicCamera===!0),de!==A&&(de=A,St=!0,Sr=!0)}if(He.needsLights&&(Ln.state.directionalShadowMap.length>0&&Ft.setValue(Y,"directionalShadowMap",Ln.state.directionalShadowMap,me),Ln.state.spotShadowMap.length>0&&Ft.setValue(Y,"spotShadowMap",Ln.state.spotShadowMap,me),Ln.state.pointShadowMap.length>0&&Ft.setValue(Y,"pointShadowMap",Ln.state.pointShadowMap,me)),ae.isSkinnedMesh){Ft.setOptional(Y,ae,"bindMatrix"),Ft.setOptional(Y,ae,"bindMatrixInverse");const Ht=ae.skeleton;Ht&&(Ht.boneTexture===null&&Ht.computeBoneTexture(),Ft.setValue(Y,"boneTexture",Ht.boneTexture,me))}ae.isBatchedMesh&&(Ft.setOptional(Y,ae,"batchingTexture"),Ft.setValue(Y,"batchingTexture",ae._matricesTexture,me),Ft.setOptional(Y,ae,"batchingIdTexture"),Ft.setValue(Y,"batchingIdTexture",ae._indirectTexture,me),Ft.setOptional(Y,ae,"batchingColorTexture"),ae._colorsTexture!==null&&Ft.setValue(Y,"batchingColorTexture",ae._colorsTexture,me));const Fi=fe.morphAttributes;if((Fi.position!==void 0||Fi.normal!==void 0||Fi.color!==void 0)&&$.update(ae,fe,ei),(St||He.receiveShadow!==ae.receiveShadow)&&(He.receiveShadow=ae.receiveShadow,Ft.setValue(Y,"receiveShadow",ae.receiveShadow)),(le.isMeshStandardMaterial||le.isMeshLambertMaterial||le.isMeshPhongMaterial)&&le.envMap===null&&ee.environment!==null&&(Qt.envMapIntensity.value=ee.environmentIntensity),Qt.dfgLUT!==void 0&&(Qt.dfgLUT.value=KP()),St){if(Ft.setValue(Y,"toneMappingExposure",W.toneMappingExposure),He.needsLights&&Ed(Qt,Sr),Ne&&le.fog===!0&&We.refreshFogUniforms(Qt,Ne),We.refreshMaterialUniforms(Qt,le,ge,ye,N.state.transmissionRenderTarget[A.id]),He.needsLights&&He.lightProbeGrid){const Ht=He.lightProbeGrid;Qt.probesSH.value=Ht.texture,Qt.probesMin.value.copy(Ht.boundingBox.min),Qt.probesMax.value.copy(Ht.boundingBox.max),Qt.probesResolution.value.copy(Ht.resolution)}Zu.upload(Y,Wo(He),Qt,me)}if(le.isShaderMaterial&&le.uniformsNeedUpdate===!0&&(Zu.upload(Y,Wo(He),Qt,me),le.uniformsNeedUpdate=!1),le.isSpriteMaterial&&Ft.setValue(Y,"center",ae.center),Ft.setValue(Y,"modelViewMatrix",ae.modelViewMatrix),Ft.setValue(Y,"normalMatrix",ae.normalMatrix),Ft.setValue(Y,"modelMatrix",ae.matrixWorld),le.uniformsGroups!==void 0){const Ht=le.uniformsGroups;for(let Oi=0,tr=Ht.length;Oi<tr;Oi++){const js=Ht[Oi];Me.update(js,ei),Me.bind(js,ei)}}return ei}function Ed(A,ee){A.ambientLightColor.needsUpdate=ee,A.lightProbe.needsUpdate=ee,A.directionalLights.needsUpdate=ee,A.directionalLightShadows.needsUpdate=ee,A.pointLights.needsUpdate=ee,A.pointLightShadows.needsUpdate=ee,A.spotLights.needsUpdate=ee,A.spotLightShadows.needsUpdate=ee,A.rectAreaLights.needsUpdate=ee,A.hemisphereLights.needsUpdate=ee}function Xo(A){return A.isMeshLambertMaterial||A.isMeshToonMaterial||A.isMeshPhongMaterial||A.isMeshStandardMaterial||A.isShadowMaterial||A.isShaderMaterial&&A.lights===!0}this.getActiveCubeFace=function(){return oe},this.getActiveMipmapLevel=function(){return te},this.getRenderTarget=function(){return K},this.setRenderTargetTextures=function(A,ee,fe){const le=Z.get(A);le.__autoAllocateDepthBuffer=A.resolveDepthBuffer===!1,le.__autoAllocateDepthBuffer===!1&&(le.__useRenderToTexture=!1),Z.get(A.texture).__webglTexture=ee,Z.get(A.depthTexture).__webglTexture=le.__autoAllocateDepthBuffer?void 0:fe,le.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(A,ee){const fe=Z.get(A);fe.__webglFramebuffer=ee,fe.__useDefaultFramebuffer=ee===void 0},this.setRenderTarget=function(A,ee=0,fe=0){K=A,oe=ee,te=fe;let le=null,ae=!1,Ne=!1;if(A){const Ae=Z.get(A);if(Ae.__useDefaultFramebuffer!==void 0){C.bindFramebuffer(Y.FRAMEBUFFER,Ae.__webglFramebuffer),z.copy(A.viewport),q.copy(A.scissor),Ie=A.scissorTest,C.viewport(z),C.scissor(q),C.setScissorTest(Ie),he=-1;return}else if(Ae.__webglFramebuffer===void 0)me.setupRenderTarget(A);else if(Ae.__hasExternalTextures)me.rebindTextures(A,Z.get(A.texture).__webglTexture,Z.get(A.depthTexture).__webglTexture);else if(A.depthBuffer){const ht=A.depthTexture;if(Ae.__boundDepthTexture!==ht){if(ht!==null&&Z.has(ht)&&(A.width!==ht.image.width||A.height!==ht.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");me.setupDepthRenderbuffer(A)}}const Ke=A.texture;(Ke.isData3DTexture||Ke.isDataArrayTexture||Ke.isCompressedArrayTexture)&&(Ne=!0);const it=Z.get(A).__webglFramebuffer;A.isWebGLCubeRenderTarget?(Array.isArray(it[ee])?le=it[ee][fe]:le=it[ee],ae=!0):A.samples>0&&me.useMultisampledRTT(A)===!1?le=Z.get(A).__webglMultisampledFramebuffer:Array.isArray(it)?le=it[fe]:le=it,z.copy(A.viewport),q.copy(A.scissor),Ie=A.scissorTest}else z.copy(tt).multiplyScalar(ge).floor(),q.copy(Gt).multiplyScalar(ge).floor(),Ie=ut;if(fe!==0&&(le=se),C.bindFramebuffer(Y.FRAMEBUFFER,le)&&C.drawBuffers(A,le),C.viewport(z),C.scissor(q),C.setScissorTest(Ie),ae){const Ae=Z.get(A.texture);Y.framebufferTexture2D(Y.FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Y.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Ae.__webglTexture,fe)}else if(Ne){const Ae=ee;for(let Ke=0;Ke<A.textures.length;Ke++){const it=Z.get(A.textures[Ke]);Y.framebufferTextureLayer(Y.FRAMEBUFFER,Y.COLOR_ATTACHMENT0+Ke,it.__webglTexture,fe,Ae)}}else if(A!==null&&fe!==0){const Ae=Z.get(A.texture);Y.framebufferTexture2D(Y.FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Y.TEXTURE_2D,Ae.__webglTexture,fe)}he=-1},this.readRenderTargetPixels=function(A,ee,fe,le,ae,Ne,je,Ae=0){if(!(A&&A.isWebGLRenderTarget)){Dt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ke=Z.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&je!==void 0&&(Ke=Ke[je]),Ke){C.bindFramebuffer(Y.FRAMEBUFFER,Ke);try{const it=A.textures[Ae],ht=it.format,ft=it.type;if(A.textures.length>1&&Y.readBuffer(Y.COLOR_ATTACHMENT0+Ae),!F.textureFormatReadable(ht)){Dt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!F.textureTypeReadable(ft)){Dt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}ee>=0&&ee<=A.width-le&&fe>=0&&fe<=A.height-ae&&Y.readPixels(ee,fe,le,ae,Le.convert(ht),Le.convert(ft),Ne)}finally{const it=K!==null?Z.get(K).__webglFramebuffer:null;C.bindFramebuffer(Y.FRAMEBUFFER,it)}}},this.readRenderTargetPixelsAsync=async function(A,ee,fe,le,ae,Ne,je,Ae=0){if(!(A&&A.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ke=Z.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&je!==void 0&&(Ke=Ke[je]),Ke)if(ee>=0&&ee<=A.width-le&&fe>=0&&fe<=A.height-ae){C.bindFramebuffer(Y.FRAMEBUFFER,Ke);const it=A.textures[Ae],ht=it.format,ft=it.type;if(A.textures.length>1&&Y.readBuffer(Y.COLOR_ATTACHMENT0+Ae),!F.textureFormatReadable(ht))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!F.textureTypeReadable(ft))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Je=Y.createBuffer();Y.bindBuffer(Y.PIXEL_PACK_BUFFER,Je),Y.bufferData(Y.PIXEL_PACK_BUFFER,Ne.byteLength,Y.STREAM_READ),Y.readPixels(ee,fe,le,ae,Le.convert(ht),Le.convert(ft),0);const Nt=K!==null?Z.get(K).__webglFramebuffer:null;C.bindFramebuffer(Y.FRAMEBUFFER,Nt);const Yt=Y.fenceSync(Y.SYNC_GPU_COMMANDS_COMPLETE,0);return Y.flush(),await ab(Y,Yt,4),Y.bindBuffer(Y.PIXEL_PACK_BUFFER,Je),Y.getBufferSubData(Y.PIXEL_PACK_BUFFER,0,Ne),Y.deleteBuffer(Je),Y.deleteSync(Yt),Ne}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(A,ee=null,fe=0){const le=Math.pow(2,-fe),ae=Math.floor(A.image.width*le),Ne=Math.floor(A.image.height*le),je=ee!==null?ee.x:0,Ae=ee!==null?ee.y:0;me.setTexture2D(A,0),Y.copyTexSubImage2D(Y.TEXTURE_2D,fe,0,0,je,Ae,ae,Ne),C.unbindTexture()},this.copyTextureToTexture=function(A,ee,fe=null,le=null,ae=0,Ne=0){let je,Ae,Ke,it,ht,ft,Je,Nt,Yt;const en=A.isCompressedTexture?A.mipmaps[Ne]:A.image;if(fe!==null)je=fe.max.x-fe.min.x,Ae=fe.max.y-fe.min.y,Ke=fe.isBox3?fe.max.z-fe.min.z:1,it=fe.min.x,ht=fe.min.y,ft=fe.isBox3?fe.min.z:0;else{const Qt=Math.pow(2,-ae);je=Math.floor(en.width*Qt),Ae=Math.floor(en.height*Qt),A.isDataArrayTexture?Ke=en.depth:A.isData3DTexture?Ke=Math.floor(en.depth*Qt):Ke=1,it=0,ht=0,ft=0}le!==null?(Je=le.x,Nt=le.y,Yt=le.z):(Je=0,Nt=0,Yt=0);const Bt=Le.convert(ee.format),gn=Le.convert(ee.type);let He;ee.isData3DTexture?(me.setTexture3D(ee,0),He=Y.TEXTURE_3D):ee.isDataArrayTexture||ee.isCompressedArrayTexture?(me.setTexture2DArray(ee,0),He=Y.TEXTURE_2D_ARRAY):(me.setTexture2D(ee,0),He=Y.TEXTURE_2D),C.activeTexture(Y.TEXTURE0),C.pixelStorei(Y.UNPACK_FLIP_Y_WEBGL,ee.flipY),C.pixelStorei(Y.UNPACK_PREMULTIPLY_ALPHA_WEBGL,ee.premultiplyAlpha),C.pixelStorei(Y.UNPACK_ALIGNMENT,ee.unpackAlignment);const Ln=C.getParameter(Y.UNPACK_ROW_LENGTH),yt=C.getParameter(Y.UNPACK_IMAGE_HEIGHT),ei=C.getParameter(Y.UNPACK_SKIP_PIXELS),ti=C.getParameter(Y.UNPACK_SKIP_ROWS),St=C.getParameter(Y.UNPACK_SKIP_IMAGES);C.pixelStorei(Y.UNPACK_ROW_LENGTH,en.width),C.pixelStorei(Y.UNPACK_IMAGE_HEIGHT,en.height),C.pixelStorei(Y.UNPACK_SKIP_PIXELS,it),C.pixelStorei(Y.UNPACK_SKIP_ROWS,ht),C.pixelStorei(Y.UNPACK_SKIP_IMAGES,ft);const Sr=A.isDataArrayTexture||A.isData3DTexture,Ft=ee.isDataArrayTexture||ee.isData3DTexture;if(A.isDepthTexture){const Qt=Z.get(A),Fi=Z.get(ee),Ht=Z.get(Qt.__renderTarget),Oi=Z.get(Fi.__renderTarget);C.bindFramebuffer(Y.READ_FRAMEBUFFER,Ht.__webglFramebuffer),C.bindFramebuffer(Y.DRAW_FRAMEBUFFER,Oi.__webglFramebuffer);for(let tr=0;tr<Ke;tr++)Sr&&(Y.framebufferTextureLayer(Y.READ_FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Z.get(A).__webglTexture,ae,ft+tr),Y.framebufferTextureLayer(Y.DRAW_FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Z.get(ee).__webglTexture,Ne,Yt+tr)),Y.blitFramebuffer(it,ht,je,Ae,Je,Nt,je,Ae,Y.DEPTH_BUFFER_BIT,Y.NEAREST);C.bindFramebuffer(Y.READ_FRAMEBUFFER,null),C.bindFramebuffer(Y.DRAW_FRAMEBUFFER,null)}else if(ae!==0||A.isRenderTargetTexture||Z.has(A)){const Qt=Z.get(A),Fi=Z.get(ee);C.bindFramebuffer(Y.READ_FRAMEBUFFER,j),C.bindFramebuffer(Y.DRAW_FRAMEBUFFER,k);for(let Ht=0;Ht<Ke;Ht++)Sr?Y.framebufferTextureLayer(Y.READ_FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Qt.__webglTexture,ae,ft+Ht):Y.framebufferTexture2D(Y.READ_FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Y.TEXTURE_2D,Qt.__webglTexture,ae),Ft?Y.framebufferTextureLayer(Y.DRAW_FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Fi.__webglTexture,Ne,Yt+Ht):Y.framebufferTexture2D(Y.DRAW_FRAMEBUFFER,Y.COLOR_ATTACHMENT0,Y.TEXTURE_2D,Fi.__webglTexture,Ne),ae!==0?Y.blitFramebuffer(it,ht,je,Ae,Je,Nt,je,Ae,Y.COLOR_BUFFER_BIT,Y.NEAREST):Ft?Y.copyTexSubImage3D(He,Ne,Je,Nt,Yt+Ht,it,ht,je,Ae):Y.copyTexSubImage2D(He,Ne,Je,Nt,it,ht,je,Ae);C.bindFramebuffer(Y.READ_FRAMEBUFFER,null),C.bindFramebuffer(Y.DRAW_FRAMEBUFFER,null)}else Ft?A.isDataTexture||A.isData3DTexture?Y.texSubImage3D(He,Ne,Je,Nt,Yt,je,Ae,Ke,Bt,gn,en.data):ee.isCompressedArrayTexture?Y.compressedTexSubImage3D(He,Ne,Je,Nt,Yt,je,Ae,Ke,Bt,en.data):Y.texSubImage3D(He,Ne,Je,Nt,Yt,je,Ae,Ke,Bt,gn,en):A.isDataTexture?Y.texSubImage2D(Y.TEXTURE_2D,Ne,Je,Nt,je,Ae,Bt,gn,en.data):A.isCompressedTexture?Y.compressedTexSubImage2D(Y.TEXTURE_2D,Ne,Je,Nt,en.width,en.height,Bt,en.data):Y.texSubImage2D(Y.TEXTURE_2D,Ne,Je,Nt,je,Ae,Bt,gn,en);C.pixelStorei(Y.UNPACK_ROW_LENGTH,Ln),C.pixelStorei(Y.UNPACK_IMAGE_HEIGHT,yt),C.pixelStorei(Y.UNPACK_SKIP_PIXELS,ei),C.pixelStorei(Y.UNPACK_SKIP_ROWS,ti),C.pixelStorei(Y.UNPACK_SKIP_IMAGES,St),Ne===0&&ee.generateMipmaps&&Y.generateMipmap(He),C.unbindTexture()},this.initRenderTarget=function(A){Z.get(A).__webglFramebuffer===void 0&&me.setupRenderTarget(A)},this.initTexture=function(A){A.isCubeTexture?me.setTextureCube(A,0):A.isData3DTexture?me.setTexture3D(A,0):A.isDataArrayTexture||A.isCompressedArrayTexture?me.setTexture2DArray(A,0):me.setTexture2D(A,0),C.unbindTexture()},this.resetState=function(){oe=0,te=0,K=null,C.reset(),Fe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return pr}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=At._getDrawingBufferColorSpace(e),t.unpackColorSpace=At._getUnpackColorSpace()}}const ZP=/^[og]\s*(.+)?/,JP=/^mtllib /,e2=/^usemtl /,t2=/^usemap /,Qv=/\s+/,Zv=new ne,qf=new ne,Jv=new ne,e_=new ne,Li=new ne,zu=new xt;function n2(){const i={objects:[],object:{},vertices:[],normals:[],colors:[],uvs:[],materials:{},materialLibraries:[],startObject:function(e,t){if(this.object&&this.object.fromDeclaration===!1){this.object.name=e,this.object.fromDeclaration=t!==!1;return}const r=this.object&&typeof this.object.currentMaterial=="function"?this.object.currentMaterial():void 0;if(this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0),this.object={name:e||"",fromDeclaration:t!==!1,geometry:{vertices:[],normals:[],colors:[],uvs:[],hasUVIndices:!1},materials:[],smooth:!0,startMaterial:function(a,l){const c=this._finalize(!1);c&&(c.inherited||c.groupCount<=0)&&this.materials.splice(c.index,1);const d={index:this.materials.length,name:a||"",mtllib:Array.isArray(l)&&l.length>0?l[l.length-1]:"",smooth:c!==void 0?c.smooth:this.smooth,groupStart:c!==void 0?c.groupEnd:0,groupEnd:-1,groupCount:-1,inherited:!1,clone:function(h){const f={index:typeof h=="number"?h:this.index,name:this.name,mtllib:this.mtllib,smooth:this.smooth,groupStart:0,groupEnd:-1,groupCount:-1,inherited:!1};return f.clone=this.clone.bind(f),f}};return this.materials.push(d),d},currentMaterial:function(){if(this.materials.length>0)return this.materials[this.materials.length-1]},_finalize:function(a){const l=this.currentMaterial();if(l&&l.groupEnd===-1&&(l.groupEnd=this.geometry.vertices.length/3,l.groupCount=l.groupEnd-l.groupStart,l.inherited=!1),a&&this.materials.length>1)for(let c=this.materials.length-1;c>=0;c--)this.materials[c].groupCount<=0&&this.materials.splice(c,1);return a&&this.materials.length===0&&this.materials.push({name:"",smooth:this.smooth}),l}},r&&r.name&&typeof r.clone=="function"){const a=r.clone(0);a.inherited=!0,this.object.materials.push(a)}this.objects.push(this.object)},finalize:function(){this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0)},parseVertexIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/3)*3},parseNormalIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/3)*3},parseUVIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/2)*2},addVertex:function(e,t,r){const a=this.vertices,l=this.object.geometry.vertices;l.push(a[e+0],a[e+1],a[e+2]),l.push(a[t+0],a[t+1],a[t+2]),l.push(a[r+0],a[r+1],a[r+2])},addVertexPoint:function(e){const t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addVertexLine:function(e){const t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addNormal:function(e,t,r){const a=this.normals,l=this.object.geometry.normals;l.push(a[e+0],a[e+1],a[e+2]),l.push(a[t+0],a[t+1],a[t+2]),l.push(a[r+0],a[r+1],a[r+2])},addFaceNormal:function(e,t,r){const a=this.vertices,l=this.object.geometry.normals;Zv.fromArray(a,e),qf.fromArray(a,t),Jv.fromArray(a,r),Li.subVectors(Jv,qf),e_.subVectors(Zv,qf),Li.cross(e_),Li.normalize(),l.push(Li.x,Li.y,Li.z),l.push(Li.x,Li.y,Li.z),l.push(Li.x,Li.y,Li.z)},addColor:function(e,t,r){const a=this.colors,l=this.object.geometry.colors;a[e]!==void 0&&l.push(a[e+0],a[e+1],a[e+2]),a[t]!==void 0&&l.push(a[t+0],a[t+1],a[t+2]),a[r]!==void 0&&l.push(a[r+0],a[r+1],a[r+2])},addUV:function(e,t,r){const a=this.uvs,l=this.object.geometry.uvs;l.push(a[e+0],a[e+1]),l.push(a[t+0],a[t+1]),l.push(a[r+0],a[r+1])},addDefaultUV:function(){const e=this.object.geometry.uvs;e.push(0,0),e.push(0,0),e.push(0,0)},addUVLine:function(e){const t=this.uvs;this.object.geometry.uvs.push(t[e+0],t[e+1])},addFace:function(e,t,r,a,l,c,d,h,f){const m=this.vertices.length;let g=this.parseVertexIndex(e,m),x=this.parseVertexIndex(t,m),M=this.parseVertexIndex(r,m);if(this.addVertex(g,x,M),this.addColor(g,x,M),d!==void 0&&d!==""){const E=this.normals.length;g=this.parseNormalIndex(d,E),x=this.parseNormalIndex(h,E),M=this.parseNormalIndex(f,E),this.addNormal(g,x,M)}else this.addFaceNormal(g,x,M);if(a!==void 0&&a!==""){const E=this.uvs.length;g=this.parseUVIndex(a,E),x=this.parseUVIndex(l,E),M=this.parseUVIndex(c,E),this.addUV(g,x,M),this.object.geometry.hasUVIndices=!0}else this.addDefaultUV()},addPointGeometry:function(e){this.object.geometry.type="Points";const t=this.vertices.length;for(let r=0,a=e.length;r<a;r++){const l=this.parseVertexIndex(e[r],t);this.addVertexPoint(l),this.addColor(l)}},addLineGeometry:function(e,t){this.object.geometry.type="Line";const r=this.vertices.length,a=this.uvs.length;for(let l=0,c=e.length;l<c;l++)this.addVertexLine(this.parseVertexIndex(e[l],r));for(let l=0,c=t.length;l<c;l++)this.addUVLine(this.parseUVIndex(t[l],a))}};return i.startObject("",!1),i}class i2 extends rc{constructor(e){super(e),this.materials=null}load(e,t,r,a){const l=this,c=new Xb(this.manager);c.setPath(this.path),c.setRequestHeader(this.requestHeader),c.setWithCredentials(this.withCredentials),c.load(e,function(d){try{t(l.parse(d))}catch(h){a?a(h):console.error(h),l.manager.itemError(e)}},r,a)}setMaterials(e){return this.materials=e,this}parse(e){const t=new n2;e.indexOf(`\r
`)!==-1&&(e=e.replace(/\r\n/g,`
`)),e.indexOf(`\\
`)!==-1&&(e=e.replace(/\\\n/g,""));const r=e.split(`
`);let a=[];for(let d=0,h=r.length;d<h;d++){const f=r[d].trimStart();if(f.length===0)continue;const m=f.charAt(0);if(m!=="#")if(m==="v"){const g=f.split(Qv);switch(g[0]){case"v":t.vertices.push(parseFloat(g[1]),parseFloat(g[2]),parseFloat(g[3])),g.length>=7?(zu.setRGB(parseFloat(g[4]),parseFloat(g[5]),parseFloat(g[6]),Jn),t.colors.push(zu.r,zu.g,zu.b)):t.colors.push(void 0,void 0,void 0);break;case"vn":t.normals.push(parseFloat(g[1]),parseFloat(g[2]),parseFloat(g[3]));break;case"vt":t.uvs.push(parseFloat(g[1]),parseFloat(g[2]));break}}else if(m==="f"){const x=f.slice(1).trim().split(Qv),M=[];for(let w=0,_=x.length;w<_;w++){const y=x[w];if(y.length>0){const L=y.split("/");M.push(L)}}const E=M[0];for(let w=1,_=M.length-1;w<_;w++){const y=M[w],L=M[w+1];t.addFace(E[0],y[0],L[0],E[1],y[1],L[1],E[2],y[2],L[2])}}else if(m==="l"){const g=f.substring(1).trim().split(" ");let x=[];const M=[];if(f.indexOf("/")===-1)x=g;else for(let E=0,w=g.length;E<w;E++){const _=g[E].split("/");_[0]!==""&&x.push(_[0]),_[1]!==""&&M.push(_[1])}t.addLineGeometry(x,M)}else if(m==="p"){const x=f.slice(1).trim().split(" ");t.addPointGeometry(x)}else if((a=ZP.exec(f))!==null){const g=(" "+a[0].slice(1).trim()).slice(1);t.startObject(g)}else if(e2.test(f))t.object.startMaterial(f.substring(7).trim(),t.materialLibraries);else if(JP.test(f))t.materialLibraries.push(f.substring(7).trim());else if(t2.test(f))console.warn('THREE.OBJLoader: Rendering identifier "usemap" not supported. Textures must be defined in MTL files.');else if(m==="s"){if(a=f.split(" "),a.length>1){const x=a[1].trim().toLowerCase();t.object.smooth=x!=="0"&&x!=="off"}else t.object.smooth=!0;const g=t.object.currentMaterial();g&&(g.smooth=t.object.smooth)}else{if(f==="\0")continue;console.warn('THREE.OBJLoader: Unexpected line: "'+f+'"')}}t.finalize();const l=new Fl;if(l.materialLibraries=[].concat(t.materialLibraries),!(t.objects.length===1&&t.objects[0].geometry.vertices.length===0)===!0)for(let d=0,h=t.objects.length;d<h;d++){const f=t.objects[d],m=f.geometry,g=f.materials,x=m.type==="Line",M=m.type==="Points";let E=!1;if(m.vertices.length===0)continue;const w=new Mi;w.setAttribute("position",new Un(m.vertices,3)),m.normals.length>0&&w.setAttribute("normal",new Un(m.normals,3)),m.colors.length>0&&(E=!0,w.setAttribute("color",new Un(m.colors,3))),m.hasUVIndices===!0&&w.setAttribute("uv",new Un(m.uvs,2));const _=[];for(let L=0,P=g.length;L<P;L++){const T=g[L],U=T.name+"_"+T.smooth+"_"+E;let N=t.materials[U];if(this.materials!==null){if(N=this.materials.create(T.name),x&&N&&!(N instanceof Qu)){const O=new Qu;_r.prototype.copy.call(O,N),O.color.copy(N.color),N=O}else if(M&&N&&!(N instanceof Ol)){const O=new Ol({size:10,sizeAttenuation:!1});_r.prototype.copy.call(O,N),O.color.copy(N.color),O.map=N.map,N=O}}N===void 0&&(x?N=new Qu:M?N=new Ol({size:1,sizeAttenuation:!1}):N=new Bb,N.name=T.name,N.flatShading=!T.smooth,N.vertexColors=E,t.materials[U]=N),_.push(N)}let y;if(_.length>1){for(let L=0,P=g.length;L<P;L++){const T=g[L];w.addGroup(T.groupStart,T.groupCount,L)}x?y=new gv(w,_):M?y=new kf(w,_):y=new Zi(w,_)}else x?y=new gv(w,_[0]):M?y=new kf(w,_[0]):y=new Zi(w,_[0]);y.name=f.name,l.add(y)}else if(t.vertices.length>0){const d=new Ol({size:1,sizeAttenuation:!1}),h=new Mi;h.setAttribute("position",new Un(t.vertices,3)),t.colors.length>0&&t.colors[0]!==void 0&&(h.setAttribute("color",new Un(t.colors,3)),d.vertexColors=!0);const f=new kf(h,d);l.add(f)}return l}}const t_={type:"change"},Hm={type:"start"},Dy={type:"end"},Bu=new xd,n_=new Es,r2=Math.cos(70*cb.DEG2RAD),Mn=new ne,ci=2*Math.PI,Wt={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Yf=1e-6;class s2 extends tT{constructor(e,t=null){super(e,t),this.state=Wt.NONE,this.target=new ne,this.cursor=new ne,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:go.ROTATE,MIDDLE:go.DOLLY,RIGHT:go.PAN},this.touches={ONE:po.ROTATE,TWO:po.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new ne,this._lastQuaternion=new Os,this._lastTargetPosition=new ne,this._quat=new Os().setFromUnitVectors(e.up,new ne(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new bv,this._sphericalDelta=new bv,this._scale=1,this._panOffset=new ne,this._rotateStart=new dt,this._rotateEnd=new dt,this._rotateDelta=new dt,this._panStart=new dt,this._panEnd=new dt,this._panDelta=new dt,this._dollyStart=new dt,this._dollyEnd=new dt,this._dollyDelta=new dt,this._dollyDirection=new ne,this._mouse=new dt,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=o2.bind(this),this._onPointerDown=a2.bind(this),this._onPointerUp=l2.bind(this),this._onContextMenu=m2.bind(this),this._onMouseWheel=d2.bind(this),this._onKeyDown=h2.bind(this),this._onTouchStart=f2.bind(this),this._onTouchMove=p2.bind(this),this._onMouseDown=c2.bind(this),this._onMouseMove=u2.bind(this),this._interceptControlDown=g2.bind(this),this._interceptControlUp=x2.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction=""}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(t_),this.update(),this.state=Wt.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){const t=this.object.position;Mn.copy(t).sub(this.target),Mn.applyQuaternion(this._quat),this._spherical.setFromVector3(Mn),this.autoRotate&&this.state===Wt.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let r=this.minAzimuthAngle,a=this.maxAzimuthAngle;isFinite(r)&&isFinite(a)&&(r<-Math.PI?r+=ci:r>Math.PI&&(r-=ci),a<-Math.PI?a+=ci:a>Math.PI&&(a-=ci),r<=a?this._spherical.theta=Math.max(r,Math.min(a,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(r+a)/2?Math.max(r,this._spherical.theta):Math.min(a,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let l=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const c=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),l=c!=this._spherical.radius}if(Mn.setFromSpherical(this._spherical),Mn.applyQuaternion(this._quatInverse),t.copy(this.target).add(Mn),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let c=null;if(this.object.isPerspectiveCamera){const d=Mn.length();c=this._clampDistance(d*this._scale);const h=d-c;this.object.position.addScaledVector(this._dollyDirection,h),this.object.updateMatrixWorld(),l=!!h}else if(this.object.isOrthographicCamera){const d=new ne(this._mouse.x,this._mouse.y,0);d.unproject(this.object);const h=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),l=h!==this.object.zoom;const f=new ne(this._mouse.x,this._mouse.y,0);f.unproject(this.object),this.object.position.sub(f).add(d),this.object.updateMatrixWorld(),c=Mn.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;c!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(c).add(this.object.position):(Bu.origin.copy(this.object.position),Bu.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Bu.direction))<r2?this.object.lookAt(this.target):(n_.setFromNormalAndCoplanarPoint(this.object.up,this.target),Bu.intersectPlane(n_,this.target))))}else if(this.object.isOrthographicCamera){const c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),c!==this.object.zoom&&(this.object.updateProjectionMatrix(),l=!0)}return this._scale=1,this._performCursorZoom=!1,l||this._lastPosition.distanceToSquared(this.object.position)>Yf||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Yf||this._lastTargetPosition.distanceToSquared(this.target)>Yf?(this.dispatchEvent(t_),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?ci/60*this.autoRotateSpeed*e:ci/60/60*this.autoRotateSpeed}_getZoomScale(e){const t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Mn.setFromMatrixColumn(t,0),Mn.multiplyScalar(-e),this._panOffset.add(Mn)}_panUp(e,t){this.screenSpacePanning===!0?Mn.setFromMatrixColumn(t,1):(Mn.setFromMatrixColumn(t,0),Mn.crossVectors(this.object.up,Mn)),Mn.multiplyScalar(e),this._panOffset.add(Mn)}_pan(e,t){const r=this.domElement;if(this.object.isPerspectiveCamera){const a=this.object.position;Mn.copy(a).sub(this.target);let l=Mn.length();l*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*l/r.clientHeight,this.object.matrix),this._panUp(2*t*l/r.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/r.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/r.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const r=this.domElement.getBoundingClientRect(),a=e-r.left,l=t-r.top,c=r.width,d=r.height;this._mouse.x=a/c*2-1,this._mouse.y=-(l/d)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(ci*this._rotateDelta.x/t.clientHeight),this._rotateUp(ci*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._rotateStart.set(r,a)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._panStart.set(r,a)}}_handleTouchStartDolly(e){const t=this._getSecondPointerPosition(e),r=e.pageX-t.x,a=e.pageY-t.y,l=Math.sqrt(r*r+a*a);this._dollyStart.set(0,l)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{const r=this._getSecondPointerPosition(e),a=.5*(e.pageX+r.x),l=.5*(e.pageY+r.y);this._rotateEnd.set(a,l)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(ci*this._rotateDelta.x/t.clientHeight),this._rotateUp(ci*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._panEnd.set(r,a)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){const t=this._getSecondPointerPosition(e),r=e.pageX-t.x,a=e.pageY-t.y,l=Math.sqrt(r*r+a*a);this._dollyEnd.set(0,l),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const c=(e.pageX+t.x)*.5,d=(e.pageY+t.y)*.5;this._updateZoomParameters(c,d)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new dt,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){const t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){const t=e.deltaMode,r={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:r.deltaY*=16;break;case 2:r.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(r.deltaY*=10),r}}function a2(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function o2(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function l2(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Dy),this.state=Wt.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:const e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function c2(i){let e;switch(i.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case go.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=Wt.DOLLY;break;case go.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Wt.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Wt.ROTATE}break;case go.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Wt.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Wt.PAN}break;default:this.state=Wt.NONE}this.state!==Wt.NONE&&this.dispatchEvent(Hm)}function u2(i){switch(this.state){case Wt.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case Wt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case Wt.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function d2(i){this.enabled===!1||this.enableZoom===!1||this.state!==Wt.NONE||(i.preventDefault(),this.dispatchEvent(Hm),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(Dy))}function h2(i){this.enabled!==!1&&this._handleKeyDown(i)}function f2(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case po.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=Wt.TOUCH_ROTATE;break;case po.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=Wt.TOUCH_PAN;break;default:this.state=Wt.NONE}break;case 2:switch(this.touches.TWO){case po.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=Wt.TOUCH_DOLLY_PAN;break;case po.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=Wt.TOUCH_DOLLY_ROTATE;break;default:this.state=Wt.NONE}break;default:this.state=Wt.NONE}this.state!==Wt.NONE&&this.dispatchEvent(Hm)}function p2(i){switch(this._trackPointer(i),this.state){case Wt.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case Wt.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case Wt.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case Wt.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=Wt.NONE}}function m2(i){this.enabled!==!1&&i.preventDefault()}function g2(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function x2(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function v2({piece:i,variant:e,textured:t=!0,size:r=320}){const a=H.useRef(null);return H.useEffect(()=>{const l=a.current;if(!l)return;const c=new Eb;c.background=new xt(1315866);const d=new Ii(35,1,.01,5e3),h=new QP({antialias:!0});h.setSize(r,r),h.setPixelRatio(Math.min(2,window.devicePixelRatio)),h.outputColorSpace=Jn,h.toneMapping=Rm,h.toneMappingExposure=1.15,l.appendChild(h.domElement),c.add(new Yb(16777215,4210768,1.1)),c.add(new Zb(16777215,.35));const f=new Hf(16777215,2.4);f.position.set(3,4,2),c.add(f);const m=new Hf(16777215,1.1);m.position.set(-3,1,-1),c.add(m);const g=new Hf(16777215,.8);g.position.set(0,2,-4),c.add(g);const x=new s2(d,h.domElement);x.enableDamping=!0,x.autoRotate=!0,x.autoRotateSpeed=1.2;let M=0,E=!1;new i2().load(`/api/scan/model/${i}/${e}.obj`,y=>{if(E)return;y.traverse(O=>{const b=O;b.isMesh&&b.geometry.computeVertexNormals()});const L=O=>_2(y,O);t?new qb().load(`/api/scan/model/${i}/${e}.png`,O=>{O.colorSpace=Jn,L(new zf({map:O,roughness:.6}))},void 0,()=>L(new zf({color:11579576,roughness:.6}))):L(new zf({color:12632262,roughness:.65})),y.rotation.x=-Math.PI/2;const P=new Ho().setFromObject(y),T=P.getCenter(new ne),U=P.getSize(new ne);y.position.sub(T),c.add(y);const N=Math.max(U.x,U.y,U.z);d.position.set(N*1.6,N*.6,N*1.6),d.near=N/100,d.far=N*100,d.updateProjectionMatrix(),x.target.set(0,0,0),x.update()});const _=()=>{x.update(),h.render(c,d),M=requestAnimationFrame(_)};return _(),()=>{E=!0,cancelAnimationFrame(M),x.dispose(),h.dispose(),l.removeChild(h.domElement)}},[i,e,t,r]),v.jsx("div",{ref:a,style:{width:r,height:r},className:"rounded-lg border border-zinc-700 bg-zinc-950 [&>canvas]:rounded-lg"})}function _2(i,e){e.side=hr,i.traverse(t=>{t.isMesh&&(t.material=e)})}const Fr="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",y2="https://<PHONE-IP>:4444/video/m.jpeg",S2="https://<PHONE-IP>:4444/video/snapshot",M2={P:"Pawn",N:"Knight",B:"Bishop",R:"Rook",Q:"Queen",K:"King"};function E2(i){const e=i.match(/^([wb]?)([PNBRQK])$/i);if(!e)return null;const t=e[2].toUpperCase();return e[1]?e[1].toLowerCase()+t:t}function ud(i){const e=i.length===2?i[1]:i[0];let t="";return i.length===2&&(t=i[0]==="w"?"white ":"black "),t+(M2[e]??i)}function rm(i,e){const t=E2(i.dir),r=e.find(a=>a.source_dir===i.dir)??(t?e.find(a=>a.piece.toLowerCase()===t.toLowerCase()&&!a.source_dir):void 0);return r?{stage:"done",piece:r.piece,variant:r.variant}:i.mesh?{stage:"mesh",piece:t,variant:null}:{stage:"mesh",piece:t,variant:null}}function w2(){const[i,e]=H.useState(y2),[t,r]=H.useState(S2),[a,l]=H.useState(2880),[c,d]=H.useState(2160),[h,f]=H.useState("pawn"),[m,g]=H.useState(.8),[x,M]=H.useState(80),[E,w]=H.useState(92),[_,y]=H.useState(null),[L,P]=H.useState(""),[T,U]=H.useState(null),N=H.useRef(null),O=H.useRef(null),[b,I]=H.useState(null),[W,V]=H.useState(""),[J,se]=H.useState("P"),[j,k]=H.useState(null),[oe,te]=H.useState("textured"),[K,he]=H.useState(null),[de,z]=H.useState(null),[q,Ie]=H.useState(null),[Be,Ge]=H.useState(""),[ce,ye]=H.useState(!1),ge=H.useRef(null);H.useEffect(()=>(nn("/api/scan/status").then(ie=>{y(ie),ie.default_source&&e(ie.default_source),ie.default_capture&&r(ie.default_capture),ie.out&&f(ie.out)}).catch(()=>{}),()=>clearInterval(O.current)),[]);const Ue=()=>nn("/api/scan/status").then(y).catch(()=>{});function Ze(){clearInterval(O.current),O.current=setInterval(Ue,1e3)}async function tt(){P("");try{const ie=await rn("/api/scan/open",{source:i,width:a,height:c,capture:t});y(ie),Ze()}catch(ie){P("Connect failed: "+ie.message)}}async function Gt(){P("");try{const ie=await rn("/api/scan/close");y(ie),clearInterval(O.current)}catch(ie){P("Disconnect failed: "+ie.message)}}function ut(ie){const Se=N.current.getBoundingClientRect();return{x:ie.clientX-Se.left,y:ie.clientY-Se.top,r:Se}}function Ct(ie){if(!(_!=null&&_.open))return;ie.target.setPointerCapture(ie.pointerId);const{x:Se,y:Oe}=ut(ie);U({x0:Se,y0:Oe,x1:Se,y1:Oe})}function mt(ie){if(!T)return;const{x:Se,y:Oe}=ut(ie);U({...T,x1:Se,y1:Oe})}async function vt(){if(!T||!_)return U(null);const ie=N.current.getBoundingClientRect(),[Se,Oe]=_.frame_size,nt=Se/ie.width,st=Oe/ie.height,$=Math.round(Math.min(T.x0,T.x1)*nt),Pe=Math.round(Math.min(T.y0,T.y1)*st),_e=Math.round(Math.max(T.x0,T.x1)*nt),Le=Math.round(Math.max(T.y0,T.y1)*st);if(U(null),!(_e-$<10||Le-Pe<10))try{y(await rn("/api/scan/config",{crop:[$,Pe,_e,Le]}))}catch(Fe){P("Crop failed: "+Fe.message)}}async function kt(){try{y(await rn("/api/scan/config",{crop:[]}))}catch(ie){P("Crop reset failed: "+ie.message)}}async function Xt(){try{y(await rn("/api/scan/config",{interval:m,count:x,quality:E,out:h}))}catch(ie){P("Config failed: "+ie.message)}}async function qt(){P("");try{await Xt();const ie=await rn("/api/scan/start",{out:h});y(ie),Ze()}catch(ie){P("Capture start failed: "+ie.message)}}async function $t(){P("");try{y(await rn("/api/scan/stop"))}catch(ie){P("Capture stop failed: "+ie.message)}}const Et=()=>nn("/api/scan/models").then(ie=>{I(ie),!W&&ie.scans.length&&zt(ie.scans[0],ie.pieces)}).catch(()=>{});function zt(ie,Se=(b==null?void 0:b.pieces)??[]){V(ie.dir);const{piece:Oe}=rm(ie,Se);se(Oe??"P")}async function Y(ie){if(confirm(`Delete scan "${ie}" (mesh will be removed)?`)){P("");try{await Gl(`/api/scan/scan/${ie}`),W===ie&&V(""),Et()}catch(Se){P("Delete failed: "+Se.message)}}}async function pn(ie,Se){if(confirm(`Delete prepared piece "${ie}/${Se}"? (Scan folder is kept.)`)){P("");try{await Gl(`/api/scan/piece/${ie}/${Se}`),k(null),Et()}catch(Oe){P("Delete failed: "+Oe.message)}}}async function wt(){var ie;if(!(!de||!Be)){ye(!0),P("");try{const Se=new FormData;Se.append("name",Be),Se.append("mesh",de),q&&Se.append("texture",q);const Oe=await fetch("/api/scan/upload",{method:"POST",body:Se});if(!Oe.ok)throw new Error(((ie=await Oe.json())==null?void 0:ie.detail)||`HTTP ${Oe.status}`);await Et(),V(Be),Ge(""),z(null),Ie(null)}catch(Se){P("Upload: "+Se.message)}ye(!1)}}const F=()=>nn("/api/scan/prepare/status").then(ie=>{k(ie),ie.state!=="running"&&(clearInterval(ge.current),Et())}).catch(()=>{});H.useEffect(()=>(Et(),nn("/api/scan/prepare/status").then(ie=>{ie.state==="running"&&(k(ie),ge.current=setInterval(F,2e3))}).catch(()=>{}),()=>{clearInterval(ge.current)}),[]);async function C(){P("");try{const ie=await rn("/api/scan/prepare",{dir:W,piece:J});k({state:"running",piece:J,variant:ie==null?void 0:ie.variant}),clearInterval(ge.current),ge.current=setInterval(F,2e3)}catch(ie){P("Prepare failed: "+ie.message)}}const D=_==null?void 0:_.recording,Z=T&&{left:Math.min(T.x0,T.x1),top:Math.min(T.y0,T.y1),width:Math.abs(T.x1-T.x0),height:Math.abs(T.y1-T.y0)},me=(b==null?void 0:b.scans)??[],Ee=me.find(ie=>ie.dir===W),Re=Ee?rm(Ee,(b==null?void 0:b.pieces)??[]):null,xe=Re==null?void 0:Re.stage,ve=(j==null?void 0:j.state)==="running",De=xe==="done"?2:1;let We;return ve?We="running…":xe==="done"?We="Re-prepare":We="Prepare",v.jsxs("div",{className:"space-y-4",children:[v.jsx(fn,{children:v.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Live preview stream (MJPEG, …/video/m.jpeg) or USB index.",children:["Preview",v.jsx("input",{value:i,onChange:ie=>e(ie.target.value),className:`${Fr} w-96`,placeholder:"Stream URL (…/video/m.jpeg) or USB index (0/1)"})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Photo to save per capture (snapshot URL, …/video/snapshot). Empty = use live frame.",children:["Photo",v.jsx("input",{value:t,onChange:ie=>r(ie.target.value),className:`${Fr} w-96`,placeholder:"Snapshot URL (…/video/snapshot), empty = live frame"})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"For USB cam only: requested resolution (MJPG).",children:["USB Res",v.jsx("input",{type:"number",value:a,onChange:ie=>l(+ie.target.value),className:`${Fr} w-20`}),"×",v.jsx("input",{type:"number",value:c,onChange:ie=>d(+ie.target.value),className:`${Fr} w-20`})]}),_!=null&&_.open?v.jsxs(Tt,{onClick:Gt,children:[v.jsx(kx,{className:"h-4 w-4"})," Disconnect"]}):v.jsxs(Tt,{variant:"primary",onClick:tt,children:[v.jsx(kx,{className:"h-4 w-4"})," Connect"]}),v.jsxs("span",{className:"text-xs text-zinc-500",children:[L,_!=null&&_.error?` · ${_.error}`:""]})]})}),(_==null?void 0:_.open)&&v.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_320px]",children:[v.jsxs(fn,{title:"Live · Drag crop",children:[v.jsxs("div",{className:"relative inline-block select-none leading-none",children:[v.jsx("img",{ref:N,src:"/api/scan/preview.mjpg",alt:"Scan preview",draggable:!1,className:"w-full rounded-lg border border-zinc-800"}),v.jsx("div",{className:"absolute inset-0 cursor-crosshair",onPointerDown:Ct,onPointerMove:mt,onPointerUp:vt,children:Z&&v.jsx("div",{className:"absolute border-2 border-sky-400 bg-sky-400/10",style:{left:Z.left,top:Z.top,width:Z.width,height:Z.height}})})]}),v.jsxs("div",{className:"mt-2 flex items-center gap-3 text-xs text-zinc-500",children:[v.jsxs("span",{children:["Source ",_.frame_size[0],"×",_.frame_size[1]]}),v.jsxs("span",{children:["Crop: ",_.crop?_.crop.join(", "):"—"]}),v.jsxs(Tt,{onClick:kt,className:"px-2 py-1 text-xs",children:[v.jsx(uw,{className:"h-3 w-3"})," Reset crop"]})]})]}),v.jsx(fn,{title:"Capture",children:v.jsxs("div",{className:"space-y-3",children:[v.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",children:["Target folder",v.jsx("input",{value:h,onChange:ie=>f(ie.target.value),className:`${Fr} w-40`})]}),v.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",title:"Seconds between two photos. On phone ~0.8s is the limit (HTTPS fetch).",children:["Interval (s)",v.jsx("input",{type:"number",step:.1,min:0,value:m,onChange:ie=>g(+ie.target.value),className:`${Fr} w-24`})]}),v.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",title:"Photos per capture run. 0 = until stop.",children:["Count (0=∞)",v.jsx("input",{type:"number",min:0,value:x,onChange:ie=>M(+ie.target.value),className:`${Fr} w-24`})]}),v.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",children:["JPEG quality",v.jsx("input",{type:"number",min:50,max:100,value:E,onChange:ie=>w(+ie.target.value),className:`${Fr} w-24`})]}),v.jsxs("div",{className:"flex flex-wrap gap-2 pt-1",children:[D?v.jsxs(Tt,{onClick:$t,children:[v.jsx(K_,{className:"h-4 w-4"})," Stop"]}):v.jsxs(Tt,{variant:"primary",onClick:qt,children:[v.jsx(Em,{className:"h-4 w-4"})," Start capture"]}),v.jsxs(Tt,{onClick:Xt,title:"Apply interval/count/quality without capturing",children:[v.jsx(tw,{className:"h-4 w-4"})," Apply"]})]}),v.jsxs("div",{className:"rounded-lg bg-zinc-800 p-3 text-sm",children:[D?v.jsxs("span",{className:"font-medium text-green-500",children:["● Capture running — ",_.saved_run,_.count?` / ${_.count}`:""," photos"]}):v.jsx("span",{className:"text-zinc-400",children:"Ready"}),v.jsxs("div",{className:"mt-1 text-xs text-zinc-500",children:["In folder ",v.jsx("b",{className:"text-zinc-300",children:_.out||h}),": ",_.total," photos total (next no. ",_.index,")"]})]}),v.jsxs("p",{className:"text-xs text-zinc-500",children:["Motor on, phone/cam ",v.jsx("b",{children:"fixed"}),', hands off. "Start capture" appends to existing photos (for ring 2/3 simply reposition + start again).']})]})})]}),!(_!=null&&_.open)&&v.jsxs("p",{className:"text-xs text-zinc-500",children:["Connect a source (phone IP cam URL or USB index), drag the ",v.jsx("b",{children:"crop"})," around the piece + turntable (static background out), set ",v.jsx("b",{children:"interval"})," and ",v.jsx("b",{children:"count"})," and capture. Photos go to ",v.jsx("b",{children:"scans/<folder>"})," — ready for RealityScan."]}),v.jsxs(fn,{title:"Piece workshop — 3D scan → piece",children:[v.jsx("div",{className:"mb-4 flex items-center gap-1 text-xs",children:[[1,"Upload",Q_],[2,"Prepare",Bx]].map(([ie,Se,Oe],nt)=>v.jsxs("div",{className:"flex items-center gap-1",children:[v.jsxs("div",{className:`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${De>=ie?"bg-sky-500/15 text-sky-300":"bg-zinc-800 text-zinc-500"}`,children:[v.jsx(Oe,{className:"h-3.5 w-3.5"})," ",v.jsx("span",{children:Se})]}),nt<1&&v.jsx("div",{className:`h-px w-4 ${De>ie?"bg-sky-500/40":"bg-zinc-700"}`})]},ie))}),me.length===0&&v.jsx("p",{className:"text-sm text-zinc-500",children:"No scans yet. Upload a 3D model (.obj/.glb) — it appears here as a card."}),v.jsx(b2,{uploadName:Be,setUploadName:Ge,meshFile:de,setMeshFile:z,texFile:q,setTexFile:Ie,uploading:ce,doUpload:wt,input:Fr}),v.jsx(T2,{scans:me,models:b,dir:W,selectScan:zt,deleteScan:Y,prep:j}),Ee&&v.jsxs("div",{className:"mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4",children:[v.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[v.jsxs("div",{className:"flex items-center gap-2",children:[v.jsxs("div",{children:[v.jsx("div",{className:"text-sm font-medium text-zinc-100",children:Ee.dir}),v.jsxs("div",{className:"text-xs text-zinc-500",children:[Ee.mesh?"Mesh present":"no mesh yet",!Ee.texture&&Ee.mesh?" · ⚠ without texture":""]})]}),v.jsx("button",{onClick:()=>Y(Ee.dir),title:"Delete scan",className:"rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400",children:v.jsx(wa,{className:"h-4 w-4"})})]}),v.jsxs(Tt,{variant:"primary",onClick:C,disabled:ve,children:[ve?v.jsx(_n,{className:"h-4 w-4 animate-spin"}):v.jsx(Bx,{className:"h-4 w-4"}),We]})]}),v.jsx(R2,{cur:Ee,busyPrep:ve,prep:j}),L&&v.jsx("p",{className:"mt-2 text-sm text-red-400",children:L})]}),v.jsx(A2,{pieces:b==null?void 0:b.pieces,setView3d:he,deletePiece:pn,prep:j,kind:oe,setKind:te})]}),K&&v.jsx(C2,{piece:K.piece,variant:K.variant,textured:oe==="textured",onClose:()=>he(null)})]})}function b2({uploadName:i,setUploadName:e,meshFile:t,setMeshFile:r,texFile:a,setTexFile:l,uploading:c,doUpload:d,input:h}){return v.jsxs("div",{className:"mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3",children:[v.jsx("div",{className:"mb-2 text-xs font-medium text-zinc-400",children:"Upload 3D model (.obj/.glb)"}),v.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[v.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Name",v.jsx("input",{value:i,onChange:f=>e(f.target.value),placeholder:"e.g. wK",className:`${h} w-32`})]}),v.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Mesh (.obj/.glb)",v.jsx("input",{type:"file",accept:".obj,.glb,.gltf",onChange:f=>{var m;return r(((m=f.target.files)==null?void 0:m[0])??null)},className:"text-xs text-zinc-300 file:mr-1 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-0.5 file:text-xs file:text-zinc-200"})]}),v.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Texture (optional)",v.jsx("input",{type:"file",accept:".png,.jpg,.jpeg",onChange:f=>{var m;return l(((m=f.target.files)==null?void 0:m[0])??null)},className:"text-xs text-zinc-300 file:mr-1 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-0.5 file:text-xs file:text-zinc-200"})]}),v.jsxs(Tt,{variant:"primary",onClick:d,disabled:c||!t||!i,children:[c?v.jsx(_n,{className:"h-4 w-4 animate-spin"}):v.jsx(Q_,{className:"h-4 w-4"}),"Upload"]})]})]})}function T2({scans:i,models:e,dir:t,selectScan:r,deleteScan:a,prep:l}){return v.jsx("div",{className:"grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4",children:i.map(c=>{var M;const d=rm(c,(e==null?void 0:e.pieces)??[]),h=c.dir===t,m=(l==null?void 0:l.state)==="running"&&l.dir===c.dir||((M=e==null?void 0:e.jobs)==null?void 0:M.prepare)===c.dir,g=m?["preparing…","bg-sky-500/20 text-sky-300"]:{mesh:["Mesh ready","bg-sky-500/15 text-sky-300"],done:["Ready","bg-green-500/15 text-green-300"]}[d.stage],x=d.piece&&d.stage==="done";return v.jsxs("div",{onClick:()=>r(c),role:"button",tabIndex:0,onKeyDown:E=>{(E.key==="Enter"||E.key===" ")&&(E.preventDefault(),r(c))},className:`group relative flex cursor-pointer flex-col rounded-xl border p-2 text-left transition ${h?"border-sky-500 bg-sky-500/5":"border-zinc-800 hover:border-zinc-600"}`,children:[v.jsxs("div",{className:"relative mb-1.5 aspect-square overflow-hidden rounded-lg bg-zinc-950",children:[x?v.jsx("img",{src:`/api/scan/prepare/preview/${d.piece}/${d.variant}?kind=textured`,alt:`${ud(d.piece)} preview`,className:"h-full w-full object-contain"}):v.jsx("div",{className:"grid h-full place-items-center text-zinc-700",children:v.jsx(Mm,{className:"h-8 w-8"})}),v.jsxs("span",{className:`absolute left-1 top-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${g[1]}`,children:[m&&v.jsx(_n,{className:"h-3 w-3 animate-spin"}),g[0]]}),v.jsx("button",{onClick:E=>{E.stopPropagation(),a(c.dir)},title:"Delete scan folder",className:"absolute right-1 top-1 hidden rounded bg-zinc-900/80 p-1 text-zinc-400 hover:text-red-400 group-hover:block",children:v.jsx(wa,{className:"h-3.5 w-3.5"})})]}),v.jsx("div",{className:"text-sm font-medium text-zinc-200",children:c.dir}),v.jsx("div",{className:"text-[11px] text-zinc-500",children:d.piece?`${ud(d.piece)}`:""})]},c.dir)})})}function C2({piece:i,variant:e,textured:t,onClose:r}){const[a,l]=H.useState(t);return H.useEffect(()=>{const c=d=>d.key==="Escape"&&r();return window.addEventListener("keydown",c),()=>window.removeEventListener("keydown",c)},[r]),v.jsx("div",{onClick:r,role:"button",tabIndex:0,onKeyDown:c=>{(c.key==="Enter"||c.key===" ")&&(c.preventDefault(),r())},className:"fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-6",children:v.jsxs("div",{onClick:c=>c.stopPropagation(),role:"presentation",onKeyDown:c=>c.stopPropagation(),className:"flex flex-col items-center gap-3",children:[v.jsx(v2,{piece:i,variant:e,textured:a,size:Math.min(720,window.innerHeight-160)}),v.jsxs("div",{className:"flex items-center gap-3 text-sm text-zinc-300",children:[v.jsxs("span",{className:"font-medium",children:[i,"/",e]}),v.jsx(Iy,{value:a?"textured":"clay",onChange:c=>l(c==="textured")}),v.jsx("span",{className:"text-xs text-zinc-500",children:"drag to rotate · scroll to zoom · Esc to close"})]})]})})}function R2({cur:i,busyPrep:e,prep:t}){return v.jsxs(v.Fragment,{children:[e&&v.jsxs("div",{className:"flex items-center gap-2 rounded-lg bg-sky-500/10 p-3 text-sm text-sky-300",children:[v.jsx(_n,{className:"h-4 w-4 animate-spin"})," Piece is being prepared — about 1-3 min…"]}),(t==null?void 0:t.state)==="failed"&&v.jsxs("div",{className:"rounded-lg bg-red-500/10 p-3 text-sm text-red-300",children:[v.jsxs("div",{className:"flex items-center gap-2",children:[v.jsx(wm,{className:"h-4 w-4"})," Preparation failed."]}),t.log_tail&&v.jsx("pre",{className:"mt-1 whitespace-pre-wrap text-xs text-red-400/70",children:t.log_tail})]})]})}function A2({pieces:i,setView3d:e,deletePiece:t,prep:r,kind:a,setKind:l}){return i!=null&&i.length?v.jsxs("div",{className:"mt-4 border-t border-zinc-800 pt-3",children:[v.jsx("div",{className:"mb-2 text-xs font-medium text-zinc-400",children:"Finished pieces (synth_pieces/)"}),v.jsx("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",children:i.map(c=>{var h,f;const d=(r==null?void 0:r.state)==="running"&&r.piece===c.piece&&r.variant===c.variant;return v.jsxs("div",{className:"relative rounded-xl border border-zinc-800 bg-zinc-900/50 p-2",children:[v.jsxs("div",{className:"relative mb-2 aspect-square overflow-hidden rounded-lg bg-zinc-950",children:[c.has_preview?v.jsx("img",{src:`/api/scan/prepare/preview/${c.piece}/${c.variant}?kind=${a}`,alt:`${ud(c.piece)}`,className:"h-full w-full object-contain"}):v.jsx("div",{className:"grid h-full place-items-center text-zinc-700",children:v.jsx(aw,{className:"h-8 w-8"})}),v.jsx("button",{onClick:()=>e({piece:c.piece,variant:c.variant}),title:"Open 3D view",className:"absolute right-1 top-1 rounded bg-zinc-900/80 p-1 text-zinc-400 hover:text-white",children:v.jsx(lw,{className:"h-3.5 w-3.5"})})]}),v.jsxs("div",{className:"flex items-center justify-between",children:[v.jsxs("span",{className:"text-sm font-medium text-zinc-200",children:[ud(c.piece)," · ",c.variant]}),d&&v.jsx(_n,{className:"h-3.5 w-3.5 animate-spin text-sky-400"})]}),v.jsx(Iy,{value:a,onChange:l,clayDisabled:!c.has_clay}),c.report&&v.jsx(P2,{piece:c.piece,variant:c.variant,report:c.report,level:(h=c.report)==null?void 0:h.level,messages:(f=c.report)==null?void 0:f.messages,onDelete:t})]},c.id)})})]}):null}function P2({piece:i,variant:e,report:t,level:r,messages:a,onDelete:l}){return!t||!t.tris?null:v.jsxs("div",{className:"mt-2 rounded-lg bg-zinc-800 p-2 text-[11px] text-zinc-400",children:[r&&v.jsxs("div",{className:`mb-1 flex items-center gap-1 font-medium ${r==="ok"?"text-green-400":"text-amber-400"}`,children:[r==="ok"?v.jsx(Y_,{className:"h-4 w-4"}):v.jsx(wm,{className:"h-4 w-4"}),r==="ok"?"Quality OK":"Please check"]}),(a??[]).map((c,d)=>v.jsxs("div",{className:"text-amber-300/90",children:["• ",c]},d)),v.jsxs("div",{className:"grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pt-1",children:[v.jsx("span",{className:"text-zinc-500",children:"Triangles"}),v.jsx("span",{children:t.tris}),v.jsx("span",{className:"text-zinc-500",children:"open edges"}),v.jsx("span",{children:t.boundary_edges}),v.jsx("span",{className:"text-zinc-500",children:"Height/Base"}),v.jsx("span",{children:t.height_ratio})]}),v.jsxs("div",{className:"pt-1 text-zinc-500",children:["→ synth_pieces/",i,"/",e,".obj"]}),v.jsxs("button",{onClick:()=>l(i,e),className:"mt-1 flex items-center gap-1 text-red-400/80 hover:text-red-400",children:[v.jsx(wa,{className:"h-3.5 w-3.5"})," Delete piece"]})]})}function Iy({value:i,onChange:e,clayDisabled:t}){return v.jsxs("div",{className:"mt-2 flex overflow-hidden rounded-lg border border-zinc-700 text-xs",children:[v.jsx("button",{onClick:()=>e("textured"),className:`px-3 py-1 ${i==="textured"?"bg-sky-600 text-white":"text-zinc-400 hover:bg-zinc-700"}`,children:"Textured"}),v.jsx("button",{onClick:()=>e("clay"),disabled:t,title:t?"no clay image (piece prepared before this update)":"geometry only",className:`px-3 py-1 ${i==="clay"?"bg-sky-600 text-white":"text-zinc-400 hover:bg-zinc-700"} ${t?"cursor-not-allowed opacity-40":""}`,children:"Clay"})]})}const N2=[{to:"/collect",label:"Collect",icon:Mm},{to:"/scan",label:"Scan",icon:K1},{to:"/datasets",label:"Datasets",icon:iw},{to:"/training",label:"Training",icon:Z1}],L2=({isActive:i})=>`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${i?"bg-zinc-800 text-zinc-100":"text-zinc-400 hover:text-zinc-100"}`;function D2(){return v.jsx(I1,{children:v.jsxs("div",{className:"min-h-full",children:[v.jsx("header",{className:"sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur",children:v.jsxs("div",{className:"mx-auto flex max-w-7xl items-center gap-6 px-5 py-3",children:[v.jsxs("div",{className:"flex items-center gap-2 font-semibold tracking-tight",children:[v.jsx(nw,{className:"h-5 w-5 text-sky-400"})," chesslab"]}),v.jsx("nav",{className:"flex flex-wrap gap-1",children:N2.map(i=>{const e=i.icon;return v.jsxs(mo,{to:i.to,className:L2,children:[v.jsx(e,{className:"h-4 w-4"})," ",i.label]},i.to)})})]})}),v.jsx("main",{className:"mx-auto max-w-7xl px-5 py-6",children:v.jsxs(c1,{children:[v.jsx($i,{path:"/",element:v.jsx(of,{to:"/collect",replace:!0})}),v.jsx($i,{path:"/collect",element:v.jsx(gw,{})}),v.jsx($i,{path:"/scan",element:v.jsx(w2,{})}),v.jsxs($i,{path:"/datasets",element:v.jsx(vw,{}),children:[v.jsx($i,{index:!0,element:v.jsx(of,{to:"sessions",replace:!0})}),v.jsx($i,{path:"sessions",element:v.jsx(_w,{})}),v.jsx($i,{path:"curated",element:v.jsx(yw,{})}),v.jsx($i,{path:"stats",element:v.jsx(Sw,{})})]}),v.jsx($i,{path:"/training",element:v.jsx(bw,{})}),v.jsx($i,{path:"*",element:v.jsx(of,{to:"/collect",replace:!0})})]})})]})})}const I2=new YM({defaultOptions:{queries:{staleTime:0,refetchOnWindowFocus:!0,refetchOnMount:"always",retry:1}}});EM.createRoot(document.getElementById("root")).render(v.jsx(xM.StrictMode,{children:v.jsx(KM,{client:I2,children:v.jsx(D2,{})})}));
