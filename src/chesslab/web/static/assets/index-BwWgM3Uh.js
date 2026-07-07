var ux=i=>{throw TypeError(i)};var Zh=(i,e,t)=>e.has(i)||ux("Cannot "+t);var V=(i,e,t)=>(Zh(i,e,"read from private field"),t?t.call(i):e.get(i)),st=(i,e,t)=>e.has(i)?ux("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(i):e.set(i,t),Be=(i,e,t,r)=>(Zh(i,e,"write to private field"),r?r.call(i,t):e.set(i,t),t),gt=(i,e,t)=>(Zh(i,e,"access private method"),t);var lu=(i,e,t,r)=>({set _(a){Be(i,e,a,t)},get _(){return V(i,e,r)}});(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))r(a);new MutationObserver(a=>{for(const l of a)if(l.type==="childList")for(const c of l.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&r(c)}).observe(document,{childList:!0,subtree:!0});function t(a){const l={};return a.integrity&&(l.integrity=a.integrity),a.referrerPolicy&&(l.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?l.credentials="include":a.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function r(a){if(a.ep)return;a.ep=!0;const l=t(a);fetch(a.href,l)}})();function hM(i){return i&&i.__esModule&&Object.prototype.hasOwnProperty.call(i,"default")?i.default:i}var Jh={exports:{}},wl={},ef={exports:{}},Et={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var dx;function fM(){if(dx)return Et;dx=1;var i=Symbol.for("react.element"),e=Symbol.for("react.portal"),t=Symbol.for("react.fragment"),r=Symbol.for("react.strict_mode"),a=Symbol.for("react.profiler"),l=Symbol.for("react.provider"),c=Symbol.for("react.context"),d=Symbol.for("react.forward_ref"),h=Symbol.for("react.suspense"),f=Symbol.for("react.memo"),m=Symbol.for("react.lazy"),g=Symbol.iterator;function x(z){return z===null||typeof z!="object"?null:(z=g&&z[g]||z["@@iterator"],typeof z=="function"?z:null)}var M={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},E=Object.assign,w={};function _(z,X,Ue){this.props=z,this.context=X,this.refs=w,this.updater=Ue||M}_.prototype.isReactComponent={},_.prototype.setState=function(z,X){if(typeof z!="object"&&typeof z!="function"&&z!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,z,X,"setState")},_.prototype.forceUpdate=function(z){this.updater.enqueueForceUpdate(this,z,"forceUpdate")};function y(){}y.prototype=_.prototype;function L(z,X,Ue){this.props=z,this.context=X,this.refs=w,this.updater=Ue||M}var P=L.prototype=new y;P.constructor=L,E(P,_.prototype),P.isPureReactComponent=!0;var C=Array.isArray,F=Object.prototype.hasOwnProperty,N={current:null},O={key:!0,ref:!0,__self:!0,__source:!0};function b(z,X,Ue){var He,Ve={},oe=null,Se=null;if(X!=null)for(He in X.ref!==void 0&&(Se=X.ref),X.key!==void 0&&(oe=""+X.key),X)F.call(X,He)&&!O.hasOwnProperty(He)&&(Ve[He]=X[He]);var ve=arguments.length-2;if(ve===1)Ve.children=Ue;else if(1<ve){for(var Oe=Array(ve),Je=0;Je<ve;Je++)Oe[Je]=arguments[Je+2];Ve.children=Oe}if(z&&z.defaultProps)for(He in ve=z.defaultProps,ve)Ve[He]===void 0&&(Ve[He]=ve[He]);return{$$typeof:i,type:z,key:oe,ref:Se,props:Ve,_owner:N.current}}function U(z,X){return{$$typeof:i,type:z.type,key:X,ref:z.ref,props:z.props,_owner:z._owner}}function G(z){return typeof z=="object"&&z!==null&&z.$$typeof===i}function D(z){var X={"=":"=0",":":"=2"};return"$"+z.replace(/[=:]/g,function(Ue){return X[Ue]})}var K=/\/+/g;function ne(z,X){return typeof z=="object"&&z!==null&&z.key!=null?D(""+z.key):X.toString(36)}function me(z,X,Ue,He,Ve){var oe=typeof z;(oe==="undefined"||oe==="boolean")&&(z=null);var Se=!1;if(z===null)Se=!0;else switch(oe){case"string":case"number":Se=!0;break;case"object":switch(z.$$typeof){case i:case e:Se=!0}}if(Se)return Se=z,Ve=Ve(Se),z=He===""?"."+ne(Se,0):He,C(Ve)?(Ue="",z!=null&&(Ue=z.replace(K,"$&/")+"/"),me(Ve,X,Ue,"",function(Je){return Je})):Ve!=null&&(G(Ve)&&(Ve=U(Ve,Ue+(!Ve.key||Se&&Se.key===Ve.key?"":(""+Ve.key).replace(K,"$&/")+"/")+z)),X.push(Ve)),1;if(Se=0,He=He===""?".":He+":",C(z))for(var ve=0;ve<z.length;ve++){oe=z[ve];var Oe=He+ne(oe,ve);Se+=me(oe,X,Ue,Oe,Ve)}else if(Oe=x(z),typeof Oe=="function")for(z=Oe.call(z),ve=0;!(oe=z.next()).done;)oe=oe.value,Oe=He+ne(oe,ve++),Se+=me(oe,X,Ue,Oe,Ve);else if(oe==="object")throw X=String(z),Error("Objects are not valid as a React child (found: "+(X==="[object Object]"?"object with keys {"+Object.keys(z).join(", ")+"}":X)+"). If you meant to render a collection of children, use an array instead.");return Se}function k(z,X,Ue){if(z==null)return z;var He=[],Ve=0;return me(z,He,"","",function(oe){return X.call(Ue,oe,Ve++)}),He}function he(z){if(z._status===-1){var X=z._result;X=X(),X.then(function(Ue){(z._status===0||z._status===-1)&&(z._status=1,z._result=Ue)},function(Ue){(z._status===0||z._status===-1)&&(z._status=2,z._result=Ue)}),z._status===-1&&(z._status=0,z._result=X)}if(z._status===1)return z._result.default;throw z._result}var J={current:null},$={transition:null},ce={ReactCurrentDispatcher:J,ReactCurrentBatchConfig:$,ReactCurrentOwner:N};function ue(){throw Error("act(...) is not supported in production builds of React.")}return Et.Children={map:k,forEach:function(z,X,Ue){k(z,function(){X.apply(this,arguments)},Ue)},count:function(z){var X=0;return k(z,function(){X++}),X},toArray:function(z){return k(z,function(X){return X})||[]},only:function(z){if(!G(z))throw Error("React.Children.only expected to receive a single React element child.");return z}},Et.Component=_,Et.Fragment=t,Et.Profiler=a,Et.PureComponent=L,Et.StrictMode=r,Et.Suspense=h,Et.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=ce,Et.act=ue,Et.cloneElement=function(z,X,Ue){if(z==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+z+".");var He=E({},z.props),Ve=z.key,oe=z.ref,Se=z._owner;if(X!=null){if(X.ref!==void 0&&(oe=X.ref,Se=N.current),X.key!==void 0&&(Ve=""+X.key),z.type&&z.type.defaultProps)var ve=z.type.defaultProps;for(Oe in X)F.call(X,Oe)&&!O.hasOwnProperty(Oe)&&(He[Oe]=X[Oe]===void 0&&ve!==void 0?ve[Oe]:X[Oe])}var Oe=arguments.length-2;if(Oe===1)He.children=Ue;else if(1<Oe){ve=Array(Oe);for(var Je=0;Je<Oe;Je++)ve[Je]=arguments[Je+2];He.children=ve}return{$$typeof:i,type:z.type,key:Ve,ref:oe,props:He,_owner:Se}},Et.createContext=function(z){return z={$$typeof:c,_currentValue:z,_currentValue2:z,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},z.Provider={$$typeof:l,_context:z},z.Consumer=z},Et.createElement=b,Et.createFactory=function(z){var X=b.bind(null,z);return X.type=z,X},Et.createRef=function(){return{current:null}},Et.forwardRef=function(z){return{$$typeof:d,render:z}},Et.isValidElement=G,Et.lazy=function(z){return{$$typeof:m,_payload:{_status:-1,_result:z},_init:he}},Et.memo=function(z,X){return{$$typeof:f,type:z,compare:X===void 0?null:X}},Et.startTransition=function(z){var X=$.transition;$.transition={};try{z()}finally{$.transition=X}},Et.unstable_act=ue,Et.useCallback=function(z,X){return J.current.useCallback(z,X)},Et.useContext=function(z){return J.current.useContext(z)},Et.useDebugValue=function(){},Et.useDeferredValue=function(z){return J.current.useDeferredValue(z)},Et.useEffect=function(z,X){return J.current.useEffect(z,X)},Et.useId=function(){return J.current.useId()},Et.useImperativeHandle=function(z,X,Ue){return J.current.useImperativeHandle(z,X,Ue)},Et.useInsertionEffect=function(z,X){return J.current.useInsertionEffect(z,X)},Et.useLayoutEffect=function(z,X){return J.current.useLayoutEffect(z,X)},Et.useMemo=function(z,X){return J.current.useMemo(z,X)},Et.useReducer=function(z,X,Ue){return J.current.useReducer(z,X,Ue)},Et.useRef=function(z){return J.current.useRef(z)},Et.useState=function(z){return J.current.useState(z)},Et.useSyncExternalStore=function(z,X,Ue){return J.current.useSyncExternalStore(z,X,Ue)},Et.useTransition=function(){return J.current.useTransition()},Et.version="18.3.1",Et}var hx;function am(){return hx||(hx=1,ef.exports=fM()),ef.exports}/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var fx;function pM(){if(fx)return wl;fx=1;var i=am(),e=Symbol.for("react.element"),t=Symbol.for("react.fragment"),r=Object.prototype.hasOwnProperty,a=i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,l={key:!0,ref:!0,__self:!0,__source:!0};function c(d,h,f){var m,g={},x=null,M=null;f!==void 0&&(x=""+f),h.key!==void 0&&(x=""+h.key),h.ref!==void 0&&(M=h.ref);for(m in h)r.call(h,m)&&!l.hasOwnProperty(m)&&(g[m]=h[m]);if(d&&d.defaultProps)for(m in h=d.defaultProps,h)g[m]===void 0&&(g[m]=h[m]);return{$$typeof:e,type:d,key:x,ref:M,props:g,_owner:a.current}}return wl.Fragment=t,wl.jsx=c,wl.jsxs=c,wl}var px;function mM(){return px||(px=1,Jh.exports=pM()),Jh.exports}var v=mM(),H=am();const gM=hM(H);var cu={},tf={exports:{}},oi={},nf={exports:{}},rf={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var mx;function xM(){return mx||(mx=1,(function(i){function e($,ce){var ue=$.length;$.push(ce);e:for(;0<ue;){var z=ue-1>>>1,X=$[z];if(0<a(X,ce))$[z]=ce,$[ue]=X,ue=z;else break e}}function t($){return $.length===0?null:$[0]}function r($){if($.length===0)return null;var ce=$[0],ue=$.pop();if(ue!==ce){$[0]=ue;e:for(var z=0,X=$.length,Ue=X>>>1;z<Ue;){var He=2*(z+1)-1,Ve=$[He],oe=He+1,Se=$[oe];if(0>a(Ve,ue))oe<X&&0>a(Se,Ve)?($[z]=Se,$[oe]=ue,z=oe):($[z]=Ve,$[He]=ue,z=He);else if(oe<X&&0>a(Se,ue))$[z]=Se,$[oe]=ue,z=oe;else break e}}return ce}function a($,ce){var ue=$.sortIndex-ce.sortIndex;return ue!==0?ue:$.id-ce.id}if(typeof performance=="object"&&typeof performance.now=="function"){var l=performance;i.unstable_now=function(){return l.now()}}else{var c=Date,d=c.now();i.unstable_now=function(){return c.now()-d}}var h=[],f=[],m=1,g=null,x=3,M=!1,E=!1,w=!1,_=typeof setTimeout=="function"?setTimeout:null,y=typeof clearTimeout=="function"?clearTimeout:null,L=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function P($){for(var ce=t(f);ce!==null;){if(ce.callback===null)r(f);else if(ce.startTime<=$)r(f),ce.sortIndex=ce.expirationTime,e(h,ce);else break;ce=t(f)}}function C($){if(w=!1,P($),!E)if(t(h)!==null)E=!0,he(F);else{var ce=t(f);ce!==null&&J(C,ce.startTime-$)}}function F($,ce){E=!1,w&&(w=!1,y(b),b=-1),M=!0;var ue=x;try{for(P(ce),g=t(h);g!==null&&(!(g.expirationTime>ce)||$&&!D());){var z=g.callback;if(typeof z=="function"){g.callback=null,x=g.priorityLevel;var X=z(g.expirationTime<=ce);ce=i.unstable_now(),typeof X=="function"?g.callback=X:g===t(h)&&r(h),P(ce)}else r(h);g=t(h)}if(g!==null)var Ue=!0;else{var He=t(f);He!==null&&J(C,He.startTime-ce),Ue=!1}return Ue}finally{g=null,x=ue,M=!1}}var N=!1,O=null,b=-1,U=5,G=-1;function D(){return!(i.unstable_now()-G<U)}function K(){if(O!==null){var $=i.unstable_now();G=$;var ce=!0;try{ce=O(!0,$)}finally{ce?ne():(N=!1,O=null)}}else N=!1}var ne;if(typeof L=="function")ne=function(){L(K)};else if(typeof MessageChannel<"u"){var me=new MessageChannel,k=me.port2;me.port1.onmessage=K,ne=function(){k.postMessage(null)}}else ne=function(){_(K,0)};function he($){O=$,N||(N=!0,ne())}function J($,ce){b=_(function(){$(i.unstable_now())},ce)}i.unstable_IdlePriority=5,i.unstable_ImmediatePriority=1,i.unstable_LowPriority=4,i.unstable_NormalPriority=3,i.unstable_Profiling=null,i.unstable_UserBlockingPriority=2,i.unstable_cancelCallback=function($){$.callback=null},i.unstable_continueExecution=function(){E||M||(E=!0,he(F))},i.unstable_forceFrameRate=function($){0>$||125<$?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):U=0<$?Math.floor(1e3/$):5},i.unstable_getCurrentPriorityLevel=function(){return x},i.unstable_getFirstCallbackNode=function(){return t(h)},i.unstable_next=function($){switch(x){case 1:case 2:case 3:var ce=3;break;default:ce=x}var ue=x;x=ce;try{return $()}finally{x=ue}},i.unstable_pauseExecution=function(){},i.unstable_requestPaint=function(){},i.unstable_runWithPriority=function($,ce){switch($){case 1:case 2:case 3:case 4:case 5:break;default:$=3}var ue=x;x=$;try{return ce()}finally{x=ue}},i.unstable_scheduleCallback=function($,ce,ue){var z=i.unstable_now();switch(typeof ue=="object"&&ue!==null?(ue=ue.delay,ue=typeof ue=="number"&&0<ue?z+ue:z):ue=z,$){case 1:var X=-1;break;case 2:X=250;break;case 5:X=1073741823;break;case 4:X=1e4;break;default:X=5e3}return X=ue+X,$={id:m++,callback:ce,priorityLevel:$,startTime:ue,expirationTime:X,sortIndex:-1},ue>z?($.sortIndex=ue,e(f,$),t(h)===null&&$===t(f)&&(w?(y(b),b=-1):w=!0,J(C,ue-z))):($.sortIndex=X,e(h,$),E||M||(E=!0,he(F))),$},i.unstable_shouldYield=D,i.unstable_wrapCallback=function($){var ce=x;return function(){var ue=x;x=ce;try{return $.apply(this,arguments)}finally{x=ue}}}})(rf)),rf}var gx;function vM(){return gx||(gx=1,nf.exports=xM()),nf.exports}/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var xx;function _M(){if(xx)return oi;xx=1;var i=am(),e=vM();function t(n){for(var s="https://reactjs.org/docs/error-decoder.html?invariant="+n,o=1;o<arguments.length;o++)s+="&args[]="+encodeURIComponent(arguments[o]);return"Minified React error #"+n+"; visit "+s+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var r=new Set,a={};function l(n,s){c(n,s),c(n+"Capture",s)}function c(n,s){for(a[n]=s,n=0;n<s.length;n++)r.add(s[n])}var d=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),h=Object.prototype.hasOwnProperty,f=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,m={},g={};function x(n){return h.call(g,n)?!0:h.call(m,n)?!1:f.test(n)?g[n]=!0:(m[n]=!0,!1)}function M(n,s,o,u){if(o!==null&&o.type===0)return!1;switch(typeof s){case"function":case"symbol":return!0;case"boolean":return u?!1:o!==null?!o.acceptsBooleans:(n=n.toLowerCase().slice(0,5),n!=="data-"&&n!=="aria-");default:return!1}}function E(n,s,o,u){if(s===null||typeof s>"u"||M(n,s,o,u))return!0;if(u)return!1;if(o!==null)switch(o.type){case 3:return!s;case 4:return s===!1;case 5:return isNaN(s);case 6:return isNaN(s)||1>s}return!1}function w(n,s,o,u,p,S,R){this.acceptsBooleans=s===2||s===3||s===4,this.attributeName=u,this.attributeNamespace=p,this.mustUseProperty=o,this.propertyName=n,this.type=s,this.sanitizeURL=S,this.removeEmptyString=R}var _={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(n){_[n]=new w(n,0,!1,n,null,!1,!1)}),[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(n){var s=n[0];_[s]=new w(s,1,!1,n[1],null,!1,!1)}),["contentEditable","draggable","spellCheck","value"].forEach(function(n){_[n]=new w(n,2,!1,n.toLowerCase(),null,!1,!1)}),["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(n){_[n]=new w(n,2,!1,n,null,!1,!1)}),"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(n){_[n]=new w(n,3,!1,n.toLowerCase(),null,!1,!1)}),["checked","multiple","muted","selected"].forEach(function(n){_[n]=new w(n,3,!0,n,null,!1,!1)}),["capture","download"].forEach(function(n){_[n]=new w(n,4,!1,n,null,!1,!1)}),["cols","rows","size","span"].forEach(function(n){_[n]=new w(n,6,!1,n,null,!1,!1)}),["rowSpan","start"].forEach(function(n){_[n]=new w(n,5,!1,n.toLowerCase(),null,!1,!1)});var y=/[\-:]([a-z])/g;function L(n){return n[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(n){var s=n.replace(y,L);_[s]=new w(s,1,!1,n,null,!1,!1)}),"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(n){var s=n.replace(y,L);_[s]=new w(s,1,!1,n,"http://www.w3.org/1999/xlink",!1,!1)}),["xml:base","xml:lang","xml:space"].forEach(function(n){var s=n.replace(y,L);_[s]=new w(s,1,!1,n,"http://www.w3.org/XML/1998/namespace",!1,!1)}),["tabIndex","crossOrigin"].forEach(function(n){_[n]=new w(n,1,!1,n.toLowerCase(),null,!1,!1)}),_.xlinkHref=new w("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1),["src","href","action","formAction"].forEach(function(n){_[n]=new w(n,1,!1,n.toLowerCase(),null,!0,!0)});function P(n,s,o,u){var p=_.hasOwnProperty(s)?_[s]:null;(p!==null?p.type!==0:u||!(2<s.length)||s[0]!=="o"&&s[0]!=="O"||s[1]!=="n"&&s[1]!=="N")&&(E(s,o,p,u)&&(o=null),u||p===null?x(s)&&(o===null?n.removeAttribute(s):n.setAttribute(s,""+o)):p.mustUseProperty?n[p.propertyName]=o===null?p.type===3?!1:"":o:(s=p.attributeName,u=p.attributeNamespace,o===null?n.removeAttribute(s):(p=p.type,o=p===3||p===4&&o===!0?"":""+o,u?n.setAttributeNS(u,s,o):n.setAttribute(s,o))))}var C=i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,F=Symbol.for("react.element"),N=Symbol.for("react.portal"),O=Symbol.for("react.fragment"),b=Symbol.for("react.strict_mode"),U=Symbol.for("react.profiler"),G=Symbol.for("react.provider"),D=Symbol.for("react.context"),K=Symbol.for("react.forward_ref"),ne=Symbol.for("react.suspense"),me=Symbol.for("react.suspense_list"),k=Symbol.for("react.memo"),he=Symbol.for("react.lazy"),J=Symbol.for("react.offscreen"),$=Symbol.iterator;function ce(n){return n===null||typeof n!="object"?null:(n=$&&n[$]||n["@@iterator"],typeof n=="function"?n:null)}var ue=Object.assign,z;function X(n){if(z===void 0)try{throw Error()}catch(o){var s=o.stack.trim().match(/\n( *(at )?)/);z=s&&s[1]||""}return`
`+z+n}var Ue=!1;function He(n,s){if(!n||Ue)return"";Ue=!0;var o=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(s)if(s=function(){throw Error()},Object.defineProperty(s.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(s,[])}catch(pe){var u=pe}Reflect.construct(n,[],s)}else{try{s.call()}catch(pe){u=pe}n.call(s.prototype)}else{try{throw Error()}catch(pe){u=pe}n()}}catch(pe){if(pe&&u&&typeof pe.stack=="string"){for(var p=pe.stack.split(`
`),S=u.stack.split(`
`),R=p.length-1,B=S.length-1;1<=R&&0<=B&&p[R]!==S[B];)B--;for(;1<=R&&0<=B;R--,B--)if(p[R]!==S[B]){if(R!==1||B!==1)do if(R--,B--,0>B||p[R]!==S[B]){var j=`
`+p[R].replace(" at new "," at ");return n.displayName&&j.includes("<anonymous>")&&(j=j.replace("<anonymous>",n.displayName)),j}while(1<=R&&0<=B);break}}}finally{Ue=!1,Error.prepareStackTrace=o}return(n=n?n.displayName||n.name:"")?X(n):""}function Ve(n){switch(n.tag){case 5:return X(n.type);case 16:return X("Lazy");case 13:return X("Suspense");case 19:return X("SuspenseList");case 0:case 2:case 15:return n=He(n.type,!1),n;case 11:return n=He(n.type.render,!1),n;case 1:return n=He(n.type,!0),n;default:return""}}function oe(n){if(n==null)return null;if(typeof n=="function")return n.displayName||n.name||null;if(typeof n=="string")return n;switch(n){case O:return"Fragment";case N:return"Portal";case U:return"Profiler";case b:return"StrictMode";case ne:return"Suspense";case me:return"SuspenseList"}if(typeof n=="object")switch(n.$$typeof){case D:return(n.displayName||"Context")+".Consumer";case G:return(n._context.displayName||"Context")+".Provider";case K:var s=n.render;return n=n.displayName,n||(n=s.displayName||s.name||"",n=n!==""?"ForwardRef("+n+")":"ForwardRef"),n;case k:return s=n.displayName||null,s!==null?s:oe(n.type)||"Memo";case he:s=n._payload,n=n._init;try{return oe(n(s))}catch{}}return null}function Se(n){var s=n.type;switch(n.tag){case 24:return"Cache";case 9:return(s.displayName||"Context")+".Consumer";case 10:return(s._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return n=s.render,n=n.displayName||n.name||"",s.displayName||(n!==""?"ForwardRef("+n+")":"ForwardRef");case 7:return"Fragment";case 5:return s;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return oe(s);case 8:return s===b?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof s=="function")return s.displayName||s.name||null;if(typeof s=="string")return s}return null}function ve(n){switch(typeof n){case"boolean":case"number":case"string":case"undefined":return n;case"object":return n;default:return""}}function Oe(n){var s=n.type;return(n=n.nodeName)&&n.toLowerCase()==="input"&&(s==="checkbox"||s==="radio")}function Je(n){var s=Oe(n)?"checked":"value",o=Object.getOwnPropertyDescriptor(n.constructor.prototype,s),u=""+n[s];if(!n.hasOwnProperty(s)&&typeof o<"u"&&typeof o.get=="function"&&typeof o.set=="function"){var p=o.get,S=o.set;return Object.defineProperty(n,s,{configurable:!0,get:function(){return p.call(this)},set:function(R){u=""+R,S.call(this,R)}}),Object.defineProperty(n,s,{enumerable:o.enumerable}),{getValue:function(){return u},setValue:function(R){u=""+R},stopTracking:function(){n._valueTracker=null,delete n[s]}}}}function nt(n){n._valueTracker||(n._valueTracker=Je(n))}function Ut(n){if(!n)return!1;var s=n._valueTracker;if(!s)return!0;var o=s.getValue(),u="";return n&&(u=Oe(n)?n.checked?"true":"false":n.value),n=u,n!==o?(s.setValue(n),!0):!1}function dt(n){if(n=n||(typeof document<"u"?document:void 0),typeof n>"u")return null;try{return n.activeElement||n.body}catch{return n.body}}function Tt(n,s){var o=s.checked;return ue({},s,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:o??n._wrapperState.initialChecked})}function St(n,s){var o=s.defaultValue==null?"":s.defaultValue,u=s.checked!=null?s.checked:s.defaultChecked;o=ve(s.value!=null?s.value:o),n._wrapperState={initialChecked:u,initialValue:o,controlled:s.type==="checkbox"||s.type==="radio"?s.checked!=null:s.value!=null}}function vt(n,s){s=s.checked,s!=null&&P(n,"checked",s,!1)}function Gt(n,s){vt(n,s);var o=ve(s.value),u=s.type;if(o!=null)u==="number"?(o===0&&n.value===""||n.value!=o)&&(n.value=""+o):n.value!==""+o&&(n.value=""+o);else if(u==="submit"||u==="reset"){n.removeAttribute("value");return}s.hasOwnProperty("value")?qt(n,s.type,o):s.hasOwnProperty("defaultValue")&&qt(n,s.type,ve(s.defaultValue)),s.checked==null&&s.defaultChecked!=null&&(n.defaultChecked=!!s.defaultChecked)}function $t(n,s,o){if(s.hasOwnProperty("value")||s.hasOwnProperty("defaultValue")){var u=s.type;if(!(u!=="submit"&&u!=="reset"||s.value!==void 0&&s.value!==null))return;s=""+n._wrapperState.initialValue,o||s===n.value||(n.value=s),n.defaultValue=s}o=n.name,o!==""&&(n.name=""),n.defaultChecked=!!n._wrapperState.initialChecked,o!==""&&(n.name=o)}function qt(n,s,o){(s!=="number"||dt(n.ownerDocument)!==n)&&(o==null?n.defaultValue=""+n._wrapperState.initialValue:n.defaultValue!==""+o&&(n.defaultValue=""+o))}var jt=Array.isArray;function wt(n,s,o,u){if(n=n.options,s){s={};for(var p=0;p<o.length;p++)s["$"+o[p]]=!0;for(o=0;o<n.length;o++)p=s.hasOwnProperty("$"+n[o].value),n[o].selected!==p&&(n[o].selected=p),p&&u&&(n[o].defaultSelected=!0)}else{for(o=""+ve(o),s=null,p=0;p<n.length;p++){if(n[p].value===o){n[p].selected=!0,u&&(n[p].defaultSelected=!0);return}s!==null||n[p].disabled||(s=n[p])}s!==null&&(s.selected=!0)}}function Ft(n,s){if(s.dangerouslySetInnerHTML!=null)throw Error(t(91));return ue({},s,{value:void 0,defaultValue:void 0,children:""+n._wrapperState.initialValue})}function q(n,s){var o=s.value;if(o==null){if(o=s.children,s=s.defaultValue,o!=null){if(s!=null)throw Error(t(92));if(jt(o)){if(1<o.length)throw Error(t(93));o=o[0]}s=o}s==null&&(s=""),o=s}n._wrapperState={initialValue:ve(o)}}function un(n,s){var o=ve(s.value),u=ve(s.defaultValue);o!=null&&(o=""+o,o!==n.value&&(n.value=o),s.defaultValue==null&&n.defaultValue!==o&&(n.defaultValue=o)),u!=null&&(n.defaultValue=""+u)}function de(n){var s=n.textContent;s===n._wrapperState.initialValue&&s!==""&&s!==null&&(n.value=s)}function I(n){switch(n){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function T(n,s){return n==null||n==="http://www.w3.org/1999/xhtml"?I(s):n==="http://www.w3.org/2000/svg"&&s==="foreignObject"?"http://www.w3.org/1999/xhtml":n}var Z,re=(function(n){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(s,o,u,p){MSApp.execUnsafeLocalFunction(function(){return n(s,o,u,p)})}:n})(function(n,s){if(n.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in n)n.innerHTML=s;else{for(Z=Z||document.createElement("div"),Z.innerHTML="<svg>"+s.valueOf().toString()+"</svg>",s=Z.firstChild;n.firstChild;)n.removeChild(n.firstChild);for(;s.firstChild;)n.appendChild(s.firstChild)}});function ge(n,s){if(s){var o=n.firstChild;if(o&&o===n.lastChild&&o.nodeType===3){o.nodeValue=s;return}}n.textContent=s}var be={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},Ne=["Webkit","ms","Moz","O"];Object.keys(be).forEach(function(n){Ne.forEach(function(s){s=s+n.charAt(0).toUpperCase()+n.substring(1),be[s]=be[n]})});function xe(n,s,o){return s==null||typeof s=="boolean"||s===""?"":o||typeof s!="number"||s===0||be.hasOwnProperty(n)&&be[n]?(""+s).trim():s+"px"}function _e(n,s){n=n.style;for(var o in s)if(s.hasOwnProperty(o)){var u=o.indexOf("--")===0,p=xe(o,s[o],u);o==="float"&&(o="cssFloat"),u?n.setProperty(o,p):n[o]=p}}var Ie=ue({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function Xe(n,s){if(s){if(Ie[n]&&(s.children!=null||s.dangerouslySetInnerHTML!=null))throw Error(t(137,n));if(s.dangerouslySetInnerHTML!=null){if(s.children!=null)throw Error(t(60));if(typeof s.dangerouslySetInnerHTML!="object"||!("__html"in s.dangerouslySetInnerHTML))throw Error(t(61))}if(s.style!=null&&typeof s.style!="object")throw Error(t(62))}}function te(n,s){if(n.indexOf("-")===-1)return typeof s.is=="string";switch(n){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Me=null;function ke(n){return n=n.target||n.srcElement||window,n.correspondingUseElement&&(n=n.correspondingUseElement),n.nodeType===3?n.parentNode:n}var it=null,at=null,W=null;function Pe(n){if(n=cl(n)){if(typeof it!="function")throw Error(t(280));var s=n.stateNode;s&&(s=Ec(s),it(n.stateNode,n.type,s))}}function ye(n){at?W?W.push(n):W=[n]:at=n}function De(){if(at){var n=at,s=W;if(W=at=null,Pe(n),s)for(n=0;n<s.length;n++)Pe(s[n])}}function Fe(n,s){return n(s)}function Ee(){}var Ke=!1;function qe(n,s,o){if(Ke)return n(s,o);Ke=!0;try{return Fe(n,s,o)}finally{Ke=!1,(at!==null||W!==null)&&(Ee(),De())}}function Wt(n,s){var o=n.stateNode;if(o===null)return null;var u=Ec(o);if(u===null)return null;o=u[s];e:switch(s){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(u=!u.disabled)||(n=n.type,u=!(n==="button"||n==="input"||n==="select"||n==="textarea")),n=!u;break e;default:n=!1}if(n)return null;if(o&&typeof o!="function")throw Error(t(231,s,typeof o));return o}var Ot=!1;if(d)try{var On={};Object.defineProperty(On,"passive",{get:function(){Ot=!0}}),window.addEventListener("test",On,On),window.removeEventListener("test",On,On)}catch{Ot=!1}function wi(n,s,o,u,p,S,R,B,j){var pe=Array.prototype.slice.call(arguments,3);try{s.apply(o,pe)}catch(Te){this.onError(Te)}}var zs=!1,Ca=null,Bs=!1,Hs=null,Sd={onError:function(n){zs=!0,Ca=n}};function sc(n,s,o,u,p,S,R,B,j){zs=!1,Ca=null,wi.apply(Sd,arguments)}function ac(n,s,o,u,p,S,R,B,j){if(sc.apply(this,arguments),zs){if(zs){var pe=Ca;zs=!1,Ca=null}else throw Error(t(198));Bs||(Bs=!0,Hs=pe)}}function $n(n){var s=n,o=n;if(n.alternate)for(;s.return;)s=s.return;else{n=s;do s=n,(s.flags&4098)!==0&&(o=s.return),n=s.return;while(n)}return s.tag===3?o:null}function Ra(n){if(n.tag===13){var s=n.memoizedState;if(s===null&&(n=n.alternate,n!==null&&(s=n.memoizedState)),s!==null)return s.dehydrated}return null}function Go(n){if($n(n)!==n)throw Error(t(188))}function oc(n){var s=n.alternate;if(!s){if(s=$n(n),s===null)throw Error(t(188));return s!==n?null:n}for(var o=n,u=s;;){var p=o.return;if(p===null)break;var S=p.alternate;if(S===null){if(u=p.return,u!==null){o=u;continue}break}if(p.child===S.child){for(S=p.child;S;){if(S===o)return Go(p),n;if(S===u)return Go(p),s;S=S.sibling}throw Error(t(188))}if(o.return!==u.return)o=p,u=S;else{for(var R=!1,B=p.child;B;){if(B===o){R=!0,o=p,u=S;break}if(B===u){R=!0,u=p,o=S;break}B=B.sibling}if(!R){for(B=S.child;B;){if(B===o){R=!0,o=S,u=p;break}if(B===u){R=!0,u=S,o=p;break}B=B.sibling}if(!R)throw Error(t(189))}}if(o.alternate!==u)throw Error(t(190))}if(o.tag!==3)throw Error(t(188));return o.stateNode.current===o?n:s}function Vs(n){return n=oc(n),n!==null?jo(n):null}function jo(n){if(n.tag===5||n.tag===6)return n;for(n=n.child;n!==null;){var s=jo(n);if(s!==null)return s;n=n.sibling}return null}var Gs=e.unstable_scheduleCallback,Wo=e.unstable_cancelCallback,lc=e.unstable_shouldYield,Md=e.unstable_requestPaint,an=e.unstable_now,Ed=e.unstable_getCurrentPriorityLevel,Xo=e.unstable_ImmediatePriority,A=e.unstable_UserBlockingPriority,Q=e.unstable_NormalPriority,fe=e.unstable_LowPriority,ae=e.unstable_IdlePriority,se=null,Le=null;function We(n){if(Le&&typeof Le.onCommitFiberRoot=="function")try{Le.onCommitFiberRoot(se,n,void 0,(n.current.flags&128)===128)}catch{}}var Ae=Math.clz32?Math.clz32:ft,Qe=Math.log,rt=Math.LN2;function ft(n){return n>>>=0,n===0?32:31-(Qe(n)/rt|0)|0}var pt=64,et=4194304;function At(n){switch(n&-n){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return n&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return n&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return n}}function Yt(n,s){var o=n.pendingLanes;if(o===0)return 0;var u=0,p=n.suspendedLanes,S=n.pingedLanes,R=o&268435455;if(R!==0){var B=R&~p;B!==0?u=At(B):(S&=R,S!==0&&(u=At(S)))}else R=o&~p,R!==0?u=At(R):S!==0&&(u=At(S));if(u===0)return 0;if(s!==0&&s!==u&&(s&p)===0&&(p=u&-u,S=s&-s,p>=S||p===16&&(S&4194240)!==0))return s;if((u&4)!==0&&(u|=o&16),s=n.entangledLanes,s!==0)for(n=n.entanglements,s&=u;0<s;)o=31-Ae(s),p=1<<o,u|=n[o],s&=~p;return u}function en(n,s){switch(n){case 1:case 2:case 4:return s+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return s+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function Bt(n,s){for(var o=n.suspendedLanes,u=n.pingedLanes,p=n.expirationTimes,S=n.pendingLanes;0<S;){var R=31-Ae(S),B=1<<R,j=p[R];j===-1?((B&o)===0||(B&u)!==0)&&(p[R]=en(B,s)):j<=s&&(n.expiredLanes|=B),S&=~B}}function gn(n){return n=n.pendingLanes&-1073741825,n!==0?n:n&1073741824?1073741824:0}function Ge(){var n=pt;return pt<<=1,(pt&4194240)===0&&(pt=64),n}function Ln(n){for(var s=[],o=0;31>o;o++)s.push(n);return s}function yt(n,s,o){n.pendingLanes|=s,s!==536870912&&(n.suspendedLanes=0,n.pingedLanes=0),n=n.eventTimes,s=31-Ae(s),n[s]=o}function ei(n,s){var o=n.pendingLanes&~s;n.pendingLanes=s,n.suspendedLanes=0,n.pingedLanes=0,n.expiredLanes&=s,n.mutableReadLanes&=s,n.entangledLanes&=s,s=n.entanglements;var u=n.eventTimes;for(n=n.expirationTimes;0<o;){var p=31-Ae(o),S=1<<p;s[p]=0,u[p]=-1,n[p]=-1,o&=~S}}function ti(n,s){var o=n.entangledLanes|=s;for(n=n.entanglements;o;){var u=31-Ae(o),p=1<<u;p&s|n[u]&s&&(n[u]|=s),o&=~p}}var Mt=0;function Sr(n){return n&=-n,1<n?4<n?(n&268435455)!==0?16:536870912:4:1}var kt,Qt,Fi,Ht,Oi,tr=!1,js=[],Kr=null,Qr=null,Zr=null,$o=new Map,qo=new Map,Jr=[],Iy="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function $m(n,s){switch(n){case"focusin":case"focusout":Kr=null;break;case"dragenter":case"dragleave":Qr=null;break;case"mouseover":case"mouseout":Zr=null;break;case"pointerover":case"pointerout":$o.delete(s.pointerId);break;case"gotpointercapture":case"lostpointercapture":qo.delete(s.pointerId)}}function Yo(n,s,o,u,p,S){return n===null||n.nativeEvent!==S?(n={blockedOn:s,domEventName:o,eventSystemFlags:u,nativeEvent:S,targetContainers:[p]},s!==null&&(s=cl(s),s!==null&&Qt(s)),n):(n.eventSystemFlags|=u,s=n.targetContainers,p!==null&&s.indexOf(p)===-1&&s.push(p),n)}function Uy(n,s,o,u,p){switch(s){case"focusin":return Kr=Yo(Kr,n,s,o,u,p),!0;case"dragenter":return Qr=Yo(Qr,n,s,o,u,p),!0;case"mouseover":return Zr=Yo(Zr,n,s,o,u,p),!0;case"pointerover":var S=p.pointerId;return $o.set(S,Yo($o.get(S)||null,n,s,o,u,p)),!0;case"gotpointercapture":return S=p.pointerId,qo.set(S,Yo(qo.get(S)||null,n,s,o,u,p)),!0}return!1}function qm(n){var s=Ws(n.target);if(s!==null){var o=$n(s);if(o!==null){if(s=o.tag,s===13){if(s=Ra(o),s!==null){n.blockedOn=s,Oi(n.priority,function(){Fi(o)});return}}else if(s===3&&o.stateNode.current.memoizedState.isDehydrated){n.blockedOn=o.tag===3?o.stateNode.containerInfo:null;return}}}n.blockedOn=null}function cc(n){if(n.blockedOn!==null)return!1;for(var s=n.targetContainers;0<s.length;){var o=bd(n.domEventName,n.eventSystemFlags,s[0],n.nativeEvent);if(o===null){o=n.nativeEvent;var u=new o.constructor(o.type,o);Me=u,o.target.dispatchEvent(u),Me=null}else return s=cl(o),s!==null&&Qt(s),n.blockedOn=o,!1;s.shift()}return!0}function Ym(n,s,o){cc(n)&&o.delete(s)}function Fy(){tr=!1,Kr!==null&&cc(Kr)&&(Kr=null),Qr!==null&&cc(Qr)&&(Qr=null),Zr!==null&&cc(Zr)&&(Zr=null),$o.forEach(Ym),qo.forEach(Ym)}function Ko(n,s){n.blockedOn===s&&(n.blockedOn=null,tr||(tr=!0,e.unstable_scheduleCallback(e.unstable_NormalPriority,Fy)))}function Qo(n){function s(p){return Ko(p,n)}if(0<js.length){Ko(js[0],n);for(var o=1;o<js.length;o++){var u=js[o];u.blockedOn===n&&(u.blockedOn=null)}}for(Kr!==null&&Ko(Kr,n),Qr!==null&&Ko(Qr,n),Zr!==null&&Ko(Zr,n),$o.forEach(s),qo.forEach(s),o=0;o<Jr.length;o++)u=Jr[o],u.blockedOn===n&&(u.blockedOn=null);for(;0<Jr.length&&(o=Jr[0],o.blockedOn===null);)qm(o),o.blockedOn===null&&Jr.shift()}var Aa=C.ReactCurrentBatchConfig,uc=!0;function Oy(n,s,o,u){var p=Mt,S=Aa.transition;Aa.transition=null;try{Mt=1,wd(n,s,o,u)}finally{Mt=p,Aa.transition=S}}function ky(n,s,o,u){var p=Mt,S=Aa.transition;Aa.transition=null;try{Mt=4,wd(n,s,o,u)}finally{Mt=p,Aa.transition=S}}function wd(n,s,o,u){if(uc){var p=bd(n,s,o,u);if(p===null)Vd(n,s,u,dc,o),$m(n,u);else if(Uy(p,n,s,o,u))u.stopPropagation();else if($m(n,u),s&4&&-1<Iy.indexOf(n)){for(;p!==null;){var S=cl(p);if(S!==null&&kt(S),S=bd(n,s,o,u),S===null&&Vd(n,s,u,dc,o),S===p)break;p=S}p!==null&&u.stopPropagation()}else Vd(n,s,u,null,o)}}var dc=null;function bd(n,s,o,u){if(dc=null,n=ke(u),n=Ws(n),n!==null)if(s=$n(n),s===null)n=null;else if(o=s.tag,o===13){if(n=Ra(s),n!==null)return n;n=null}else if(o===3){if(s.stateNode.current.memoizedState.isDehydrated)return s.tag===3?s.stateNode.containerInfo:null;n=null}else s!==n&&(n=null);return dc=n,null}function Km(n){switch(n){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(Ed()){case Xo:return 1;case A:return 4;case Q:case fe:return 16;case ae:return 536870912;default:return 16}default:return 16}}var es=null,Td=null,hc=null;function Qm(){if(hc)return hc;var n,s=Td,o=s.length,u,p="value"in es?es.value:es.textContent,S=p.length;for(n=0;n<o&&s[n]===p[n];n++);var R=o-n;for(u=1;u<=R&&s[o-u]===p[S-u];u++);return hc=p.slice(n,1<u?1-u:void 0)}function fc(n){var s=n.keyCode;return"charCode"in n?(n=n.charCode,n===0&&s===13&&(n=13)):n=s,n===10&&(n=13),32<=n||n===13?n:0}function pc(){return!0}function Zm(){return!1}function fi(n){function s(o,u,p,S,R){this._reactName=o,this._targetInst=p,this.type=u,this.nativeEvent=S,this.target=R,this.currentTarget=null;for(var B in n)n.hasOwnProperty(B)&&(o=n[B],this[B]=o?o(S):S[B]);return this.isDefaultPrevented=(S.defaultPrevented!=null?S.defaultPrevented:S.returnValue===!1)?pc:Zm,this.isPropagationStopped=Zm,this}return ue(s.prototype,{preventDefault:function(){this.defaultPrevented=!0;var o=this.nativeEvent;o&&(o.preventDefault?o.preventDefault():typeof o.returnValue!="unknown"&&(o.returnValue=!1),this.isDefaultPrevented=pc)},stopPropagation:function(){var o=this.nativeEvent;o&&(o.stopPropagation?o.stopPropagation():typeof o.cancelBubble!="unknown"&&(o.cancelBubble=!0),this.isPropagationStopped=pc)},persist:function(){},isPersistent:pc}),s}var Pa={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(n){return n.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Cd=fi(Pa),Zo=ue({},Pa,{view:0,detail:0}),zy=fi(Zo),Rd,Ad,Jo,mc=ue({},Zo,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Nd,button:0,buttons:0,relatedTarget:function(n){return n.relatedTarget===void 0?n.fromElement===n.srcElement?n.toElement:n.fromElement:n.relatedTarget},movementX:function(n){return"movementX"in n?n.movementX:(n!==Jo&&(Jo&&n.type==="mousemove"?(Rd=n.screenX-Jo.screenX,Ad=n.screenY-Jo.screenY):Ad=Rd=0,Jo=n),Rd)},movementY:function(n){return"movementY"in n?n.movementY:Ad}}),Jm=fi(mc),By=ue({},mc,{dataTransfer:0}),Hy=fi(By),Vy=ue({},Zo,{relatedTarget:0}),Pd=fi(Vy),Gy=ue({},Pa,{animationName:0,elapsedTime:0,pseudoElement:0}),jy=fi(Gy),Wy=ue({},Pa,{clipboardData:function(n){return"clipboardData"in n?n.clipboardData:window.clipboardData}}),Xy=fi(Wy),$y=ue({},Pa,{data:0}),eg=fi($y),qy={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},Yy={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},Ky={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function Qy(n){var s=this.nativeEvent;return s.getModifierState?s.getModifierState(n):(n=Ky[n])?!!s[n]:!1}function Nd(){return Qy}var Zy=ue({},Zo,{key:function(n){if(n.key){var s=qy[n.key]||n.key;if(s!=="Unidentified")return s}return n.type==="keypress"?(n=fc(n),n===13?"Enter":String.fromCharCode(n)):n.type==="keydown"||n.type==="keyup"?Yy[n.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Nd,charCode:function(n){return n.type==="keypress"?fc(n):0},keyCode:function(n){return n.type==="keydown"||n.type==="keyup"?n.keyCode:0},which:function(n){return n.type==="keypress"?fc(n):n.type==="keydown"||n.type==="keyup"?n.keyCode:0}}),Jy=fi(Zy),eS=ue({},mc,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),tg=fi(eS),tS=ue({},Zo,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Nd}),nS=fi(tS),iS=ue({},Pa,{propertyName:0,elapsedTime:0,pseudoElement:0}),rS=fi(iS),sS=ue({},mc,{deltaX:function(n){return"deltaX"in n?n.deltaX:"wheelDeltaX"in n?-n.wheelDeltaX:0},deltaY:function(n){return"deltaY"in n?n.deltaY:"wheelDeltaY"in n?-n.wheelDeltaY:"wheelDelta"in n?-n.wheelDelta:0},deltaZ:0,deltaMode:0}),aS=fi(sS),oS=[9,13,27,32],Ld=d&&"CompositionEvent"in window,el=null;d&&"documentMode"in document&&(el=document.documentMode);var lS=d&&"TextEvent"in window&&!el,ng=d&&(!Ld||el&&8<el&&11>=el),ig=" ",rg=!1;function sg(n,s){switch(n){case"keyup":return oS.indexOf(s.keyCode)!==-1;case"keydown":return s.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function ag(n){return n=n.detail,typeof n=="object"&&"data"in n?n.data:null}var Na=!1;function cS(n,s){switch(n){case"compositionend":return ag(s);case"keypress":return s.which!==32?null:(rg=!0,ig);case"textInput":return n=s.data,n===ig&&rg?null:n;default:return null}}function uS(n,s){if(Na)return n==="compositionend"||!Ld&&sg(n,s)?(n=Qm(),hc=Td=es=null,Na=!1,n):null;switch(n){case"paste":return null;case"keypress":if(!(s.ctrlKey||s.altKey||s.metaKey)||s.ctrlKey&&s.altKey){if(s.char&&1<s.char.length)return s.char;if(s.which)return String.fromCharCode(s.which)}return null;case"compositionend":return ng&&s.locale!=="ko"?null:s.data;default:return null}}var dS={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function og(n){var s=n&&n.nodeName&&n.nodeName.toLowerCase();return s==="input"?!!dS[n.type]:s==="textarea"}function lg(n,s,o,u){ye(u),s=yc(s,"onChange"),0<s.length&&(o=new Cd("onChange","change",null,o,u),n.push({event:o,listeners:s}))}var tl=null,nl=null;function hS(n){Tg(n,0)}function gc(n){var s=Fa(n);if(Ut(s))return n}function fS(n,s){if(n==="change")return s}var cg=!1;if(d){var Dd;if(d){var Id="oninput"in document;if(!Id){var ug=document.createElement("div");ug.setAttribute("oninput","return;"),Id=typeof ug.oninput=="function"}Dd=Id}else Dd=!1;cg=Dd&&(!document.documentMode||9<document.documentMode)}function dg(){tl&&(tl.detachEvent("onpropertychange",hg),nl=tl=null)}function hg(n){if(n.propertyName==="value"&&gc(nl)){var s=[];lg(s,nl,n,ke(n)),qe(hS,s)}}function pS(n,s,o){n==="focusin"?(dg(),tl=s,nl=o,tl.attachEvent("onpropertychange",hg)):n==="focusout"&&dg()}function mS(n){if(n==="selectionchange"||n==="keyup"||n==="keydown")return gc(nl)}function gS(n,s){if(n==="click")return gc(s)}function xS(n,s){if(n==="input"||n==="change")return gc(s)}function vS(n,s){return n===s&&(n!==0||1/n===1/s)||n!==n&&s!==s}var ki=typeof Object.is=="function"?Object.is:vS;function il(n,s){if(ki(n,s))return!0;if(typeof n!="object"||n===null||typeof s!="object"||s===null)return!1;var o=Object.keys(n),u=Object.keys(s);if(o.length!==u.length)return!1;for(u=0;u<o.length;u++){var p=o[u];if(!h.call(s,p)||!ki(n[p],s[p]))return!1}return!0}function fg(n){for(;n&&n.firstChild;)n=n.firstChild;return n}function pg(n,s){var o=fg(n);n=0;for(var u;o;){if(o.nodeType===3){if(u=n+o.textContent.length,n<=s&&u>=s)return{node:o,offset:s-n};n=u}e:{for(;o;){if(o.nextSibling){o=o.nextSibling;break e}o=o.parentNode}o=void 0}o=fg(o)}}function mg(n,s){return n&&s?n===s?!0:n&&n.nodeType===3?!1:s&&s.nodeType===3?mg(n,s.parentNode):"contains"in n?n.contains(s):n.compareDocumentPosition?!!(n.compareDocumentPosition(s)&16):!1:!1}function gg(){for(var n=window,s=dt();s instanceof n.HTMLIFrameElement;){try{var o=typeof s.contentWindow.location.href=="string"}catch{o=!1}if(o)n=s.contentWindow;else break;s=dt(n.document)}return s}function Ud(n){var s=n&&n.nodeName&&n.nodeName.toLowerCase();return s&&(s==="input"&&(n.type==="text"||n.type==="search"||n.type==="tel"||n.type==="url"||n.type==="password")||s==="textarea"||n.contentEditable==="true")}function _S(n){var s=gg(),o=n.focusedElem,u=n.selectionRange;if(s!==o&&o&&o.ownerDocument&&mg(o.ownerDocument.documentElement,o)){if(u!==null&&Ud(o)){if(s=u.start,n=u.end,n===void 0&&(n=s),"selectionStart"in o)o.selectionStart=s,o.selectionEnd=Math.min(n,o.value.length);else if(n=(s=o.ownerDocument||document)&&s.defaultView||window,n.getSelection){n=n.getSelection();var p=o.textContent.length,S=Math.min(u.start,p);u=u.end===void 0?S:Math.min(u.end,p),!n.extend&&S>u&&(p=u,u=S,S=p),p=pg(o,S);var R=pg(o,u);p&&R&&(n.rangeCount!==1||n.anchorNode!==p.node||n.anchorOffset!==p.offset||n.focusNode!==R.node||n.focusOffset!==R.offset)&&(s=s.createRange(),s.setStart(p.node,p.offset),n.removeAllRanges(),S>u?(n.addRange(s),n.extend(R.node,R.offset)):(s.setEnd(R.node,R.offset),n.addRange(s)))}}for(s=[],n=o;n=n.parentNode;)n.nodeType===1&&s.push({element:n,left:n.scrollLeft,top:n.scrollTop});for(typeof o.focus=="function"&&o.focus(),o=0;o<s.length;o++)n=s[o],n.element.scrollLeft=n.left,n.element.scrollTop=n.top}}var yS=d&&"documentMode"in document&&11>=document.documentMode,La=null,Fd=null,rl=null,Od=!1;function xg(n,s,o){var u=o.window===o?o.document:o.nodeType===9?o:o.ownerDocument;Od||La==null||La!==dt(u)||(u=La,"selectionStart"in u&&Ud(u)?u={start:u.selectionStart,end:u.selectionEnd}:(u=(u.ownerDocument&&u.ownerDocument.defaultView||window).getSelection(),u={anchorNode:u.anchorNode,anchorOffset:u.anchorOffset,focusNode:u.focusNode,focusOffset:u.focusOffset}),rl&&il(rl,u)||(rl=u,u=yc(Fd,"onSelect"),0<u.length&&(s=new Cd("onSelect","select",null,s,o),n.push({event:s,listeners:u}),s.target=La)))}function xc(n,s){var o={};return o[n.toLowerCase()]=s.toLowerCase(),o["Webkit"+n]="webkit"+s,o["Moz"+n]="moz"+s,o}var Da={animationend:xc("Animation","AnimationEnd"),animationiteration:xc("Animation","AnimationIteration"),animationstart:xc("Animation","AnimationStart"),transitionend:xc("Transition","TransitionEnd")},kd={},vg={};d&&(vg=document.createElement("div").style,"AnimationEvent"in window||(delete Da.animationend.animation,delete Da.animationiteration.animation,delete Da.animationstart.animation),"TransitionEvent"in window||delete Da.transitionend.transition);function vc(n){if(kd[n])return kd[n];if(!Da[n])return n;var s=Da[n],o;for(o in s)if(s.hasOwnProperty(o)&&o in vg)return kd[n]=s[o];return n}var _g=vc("animationend"),yg=vc("animationiteration"),Sg=vc("animationstart"),Mg=vc("transitionend"),Eg=new Map,wg="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function ts(n,s){Eg.set(n,s),l(s,[n])}for(var zd=0;zd<wg.length;zd++){var Bd=wg[zd],SS=Bd.toLowerCase(),MS=Bd[0].toUpperCase()+Bd.slice(1);ts(SS,"on"+MS)}ts(_g,"onAnimationEnd"),ts(yg,"onAnimationIteration"),ts(Sg,"onAnimationStart"),ts("dblclick","onDoubleClick"),ts("focusin","onFocus"),ts("focusout","onBlur"),ts(Mg,"onTransitionEnd"),c("onMouseEnter",["mouseout","mouseover"]),c("onMouseLeave",["mouseout","mouseover"]),c("onPointerEnter",["pointerout","pointerover"]),c("onPointerLeave",["pointerout","pointerover"]),l("onChange","change click focusin focusout input keydown keyup selectionchange".split(" ")),l("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),l("onBeforeInput",["compositionend","keypress","textInput","paste"]),l("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" ")),l("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" ")),l("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var sl="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),ES=new Set("cancel close invalid load scroll toggle".split(" ").concat(sl));function bg(n,s,o){var u=n.type||"unknown-event";n.currentTarget=o,ac(u,s,void 0,n),n.currentTarget=null}function Tg(n,s){s=(s&4)!==0;for(var o=0;o<n.length;o++){var u=n[o],p=u.event;u=u.listeners;e:{var S=void 0;if(s)for(var R=u.length-1;0<=R;R--){var B=u[R],j=B.instance,pe=B.currentTarget;if(B=B.listener,j!==S&&p.isPropagationStopped())break e;bg(p,B,pe),S=j}else for(R=0;R<u.length;R++){if(B=u[R],j=B.instance,pe=B.currentTarget,B=B.listener,j!==S&&p.isPropagationStopped())break e;bg(p,B,pe),S=j}}}if(Bs)throw n=Hs,Bs=!1,Hs=null,n}function Zt(n,s){var o=s[qd];o===void 0&&(o=s[qd]=new Set);var u=n+"__bubble";o.has(u)||(Cg(s,n,2,!1),o.add(u))}function Hd(n,s,o){var u=0;s&&(u|=4),Cg(o,n,u,s)}var _c="_reactListening"+Math.random().toString(36).slice(2);function al(n){if(!n[_c]){n[_c]=!0,r.forEach(function(o){o!=="selectionchange"&&(ES.has(o)||Hd(o,!1,n),Hd(o,!0,n))});var s=n.nodeType===9?n:n.ownerDocument;s===null||s[_c]||(s[_c]=!0,Hd("selectionchange",!1,s))}}function Cg(n,s,o,u){switch(Km(s)){case 1:var p=Oy;break;case 4:p=ky;break;default:p=wd}o=p.bind(null,s,o,n),p=void 0,!Ot||s!=="touchstart"&&s!=="touchmove"&&s!=="wheel"||(p=!0),u?p!==void 0?n.addEventListener(s,o,{capture:!0,passive:p}):n.addEventListener(s,o,!0):p!==void 0?n.addEventListener(s,o,{passive:p}):n.addEventListener(s,o,!1)}function Vd(n,s,o,u,p){var S=u;if((s&1)===0&&(s&2)===0&&u!==null)e:for(;;){if(u===null)return;var R=u.tag;if(R===3||R===4){var B=u.stateNode.containerInfo;if(B===p||B.nodeType===8&&B.parentNode===p)break;if(R===4)for(R=u.return;R!==null;){var j=R.tag;if((j===3||j===4)&&(j=R.stateNode.containerInfo,j===p||j.nodeType===8&&j.parentNode===p))return;R=R.return}for(;B!==null;){if(R=Ws(B),R===null)return;if(j=R.tag,j===5||j===6){u=S=R;continue e}B=B.parentNode}}u=u.return}qe(function(){var pe=S,Te=ke(o),Ce=[];e:{var we=Eg.get(n);if(we!==void 0){var je=Cd,Ye=n;switch(n){case"keypress":if(fc(o)===0)break e;case"keydown":case"keyup":je=Jy;break;case"focusin":Ye="focus",je=Pd;break;case"focusout":Ye="blur",je=Pd;break;case"beforeblur":case"afterblur":je=Pd;break;case"click":if(o.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":je=Jm;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":je=Hy;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":je=nS;break;case _g:case yg:case Sg:je=jy;break;case Mg:je=rS;break;case"scroll":je=zy;break;case"wheel":je=aS;break;case"copy":case"cut":case"paste":je=Xy;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":je=tg}var Ze=(s&4)!==0,mn=!Ze&&n==="scroll",ie=Ze?we!==null?we+"Capture":null:we;Ze=[];for(var Y=pe,le;Y!==null;){le=Y;var Re=le.stateNode;if(le.tag===5&&Re!==null&&(le=Re,ie!==null&&(Re=Wt(Y,ie),Re!=null&&Ze.push(ol(Y,Re,le)))),mn)break;Y=Y.return}0<Ze.length&&(we=new je(we,Ye,null,o,Te),Ce.push({event:we,listeners:Ze}))}}if((s&7)===0){e:{if(we=n==="mouseover"||n==="pointerover",je=n==="mouseout"||n==="pointerout",we&&o!==Me&&(Ye=o.relatedTarget||o.fromElement)&&(Ws(Ye)||Ye[Mr]))break e;if((je||we)&&(we=Te.window===Te?Te:(we=Te.ownerDocument)?we.defaultView||we.parentWindow:window,je?(Ye=o.relatedTarget||o.toElement,je=pe,Ye=Ye?Ws(Ye):null,Ye!==null&&(mn=$n(Ye),Ye!==mn||Ye.tag!==5&&Ye.tag!==6)&&(Ye=null)):(je=null,Ye=pe),je!==Ye)){if(Ze=Jm,Re="onMouseLeave",ie="onMouseEnter",Y="mouse",(n==="pointerout"||n==="pointerover")&&(Ze=tg,Re="onPointerLeave",ie="onPointerEnter",Y="pointer"),mn=je==null?we:Fa(je),le=Ye==null?we:Fa(Ye),we=new Ze(Re,Y+"leave",je,o,Te),we.target=mn,we.relatedTarget=le,Re=null,Ws(Te)===pe&&(Ze=new Ze(ie,Y+"enter",Ye,o,Te),Ze.target=le,Ze.relatedTarget=mn,Re=Ze),mn=Re,je&&Ye)t:{for(Ze=je,ie=Ye,Y=0,le=Ze;le;le=Ia(le))Y++;for(le=0,Re=ie;Re;Re=Ia(Re))le++;for(;0<Y-le;)Ze=Ia(Ze),Y--;for(;0<le-Y;)ie=Ia(ie),le--;for(;Y--;){if(Ze===ie||ie!==null&&Ze===ie.alternate)break t;Ze=Ia(Ze),ie=Ia(ie)}Ze=null}else Ze=null;je!==null&&Rg(Ce,we,je,Ze,!1),Ye!==null&&mn!==null&&Rg(Ce,mn,Ye,Ze,!0)}}e:{if(we=pe?Fa(pe):window,je=we.nodeName&&we.nodeName.toLowerCase(),je==="select"||je==="input"&&we.type==="file")var tt=fS;else if(og(we))if(cg)tt=xS;else{tt=mS;var ot=pS}else(je=we.nodeName)&&je.toLowerCase()==="input"&&(we.type==="checkbox"||we.type==="radio")&&(tt=gS);if(tt&&(tt=tt(n,pe))){lg(Ce,tt,o,Te);break e}ot&&ot(n,we,pe),n==="focusout"&&(ot=we._wrapperState)&&ot.controlled&&we.type==="number"&&qt(we,"number",we.value)}switch(ot=pe?Fa(pe):window,n){case"focusin":(og(ot)||ot.contentEditable==="true")&&(La=ot,Fd=pe,rl=null);break;case"focusout":rl=Fd=La=null;break;case"mousedown":Od=!0;break;case"contextmenu":case"mouseup":case"dragend":Od=!1,xg(Ce,o,Te);break;case"selectionchange":if(yS)break;case"keydown":case"keyup":xg(Ce,o,Te)}var lt;if(Ld)e:{switch(n){case"compositionstart":var ut="onCompositionStart";break e;case"compositionend":ut="onCompositionEnd";break e;case"compositionupdate":ut="onCompositionUpdate";break e}ut=void 0}else Na?sg(n,o)&&(ut="onCompositionEnd"):n==="keydown"&&o.keyCode===229&&(ut="onCompositionStart");ut&&(ng&&o.locale!=="ko"&&(Na||ut!=="onCompositionStart"?ut==="onCompositionEnd"&&Na&&(lt=Qm()):(es=Te,Td="value"in es?es.value:es.textContent,Na=!0)),ot=yc(pe,ut),0<ot.length&&(ut=new eg(ut,n,null,o,Te),Ce.push({event:ut,listeners:ot}),lt?ut.data=lt:(lt=ag(o),lt!==null&&(ut.data=lt)))),(lt=lS?cS(n,o):uS(n,o))&&(pe=yc(pe,"onBeforeInput"),0<pe.length&&(Te=new eg("onBeforeInput","beforeinput",null,o,Te),Ce.push({event:Te,listeners:pe}),Te.data=lt))}Tg(Ce,s)})}function ol(n,s,o){return{instance:n,listener:s,currentTarget:o}}function yc(n,s){for(var o=s+"Capture",u=[];n!==null;){var p=n,S=p.stateNode;p.tag===5&&S!==null&&(p=S,S=Wt(n,o),S!=null&&u.unshift(ol(n,S,p)),S=Wt(n,s),S!=null&&u.push(ol(n,S,p))),n=n.return}return u}function Ia(n){if(n===null)return null;do n=n.return;while(n&&n.tag!==5);return n||null}function Rg(n,s,o,u,p){for(var S=s._reactName,R=[];o!==null&&o!==u;){var B=o,j=B.alternate,pe=B.stateNode;if(j!==null&&j===u)break;B.tag===5&&pe!==null&&(B=pe,p?(j=Wt(o,S),j!=null&&R.unshift(ol(o,j,B))):p||(j=Wt(o,S),j!=null&&R.push(ol(o,j,B)))),o=o.return}R.length!==0&&n.push({event:s,listeners:R})}var wS=/\r\n?/g,bS=/\u0000|\uFFFD/g;function Ag(n){return(typeof n=="string"?n:""+n).replace(wS,`
`).replace(bS,"")}function Sc(n,s,o){if(s=Ag(s),Ag(n)!==s&&o)throw Error(t(425))}function Mc(){}var Gd=null,jd=null;function Wd(n,s){return n==="textarea"||n==="noscript"||typeof s.children=="string"||typeof s.children=="number"||typeof s.dangerouslySetInnerHTML=="object"&&s.dangerouslySetInnerHTML!==null&&s.dangerouslySetInnerHTML.__html!=null}var Xd=typeof setTimeout=="function"?setTimeout:void 0,TS=typeof clearTimeout=="function"?clearTimeout:void 0,Pg=typeof Promise=="function"?Promise:void 0,CS=typeof queueMicrotask=="function"?queueMicrotask:typeof Pg<"u"?function(n){return Pg.resolve(null).then(n).catch(RS)}:Xd;function RS(n){setTimeout(function(){throw n})}function $d(n,s){var o=s,u=0;do{var p=o.nextSibling;if(n.removeChild(o),p&&p.nodeType===8)if(o=p.data,o==="/$"){if(u===0){n.removeChild(p),Qo(s);return}u--}else o!=="$"&&o!=="$?"&&o!=="$!"||u++;o=p}while(o);Qo(s)}function ns(n){for(;n!=null;n=n.nextSibling){var s=n.nodeType;if(s===1||s===3)break;if(s===8){if(s=n.data,s==="$"||s==="$!"||s==="$?")break;if(s==="/$")return null}}return n}function Ng(n){n=n.previousSibling;for(var s=0;n;){if(n.nodeType===8){var o=n.data;if(o==="$"||o==="$!"||o==="$?"){if(s===0)return n;s--}else o==="/$"&&s++}n=n.previousSibling}return null}var Ua=Math.random().toString(36).slice(2),nr="__reactFiber$"+Ua,ll="__reactProps$"+Ua,Mr="__reactContainer$"+Ua,qd="__reactEvents$"+Ua,AS="__reactListeners$"+Ua,PS="__reactHandles$"+Ua;function Ws(n){var s=n[nr];if(s)return s;for(var o=n.parentNode;o;){if(s=o[Mr]||o[nr]){if(o=s.alternate,s.child!==null||o!==null&&o.child!==null)for(n=Ng(n);n!==null;){if(o=n[nr])return o;n=Ng(n)}return s}n=o,o=n.parentNode}return null}function cl(n){return n=n[nr]||n[Mr],!n||n.tag!==5&&n.tag!==6&&n.tag!==13&&n.tag!==3?null:n}function Fa(n){if(n.tag===5||n.tag===6)return n.stateNode;throw Error(t(33))}function Ec(n){return n[ll]||null}var Yd=[],Oa=-1;function is(n){return{current:n}}function Jt(n){0>Oa||(n.current=Yd[Oa],Yd[Oa]=null,Oa--)}function Kt(n,s){Oa++,Yd[Oa]=n.current,n.current=s}var rs={},kn=is(rs),ni=is(!1),Xs=rs;function ka(n,s){var o=n.type.contextTypes;if(!o)return rs;var u=n.stateNode;if(u&&u.__reactInternalMemoizedUnmaskedChildContext===s)return u.__reactInternalMemoizedMaskedChildContext;var p={},S;for(S in o)p[S]=s[S];return u&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=s,n.__reactInternalMemoizedMaskedChildContext=p),p}function ii(n){return n=n.childContextTypes,n!=null}function wc(){Jt(ni),Jt(kn)}function Lg(n,s,o){if(kn.current!==rs)throw Error(t(168));Kt(kn,s),Kt(ni,o)}function Dg(n,s,o){var u=n.stateNode;if(s=s.childContextTypes,typeof u.getChildContext!="function")return o;u=u.getChildContext();for(var p in u)if(!(p in s))throw Error(t(108,Se(n)||"Unknown",p));return ue({},o,u)}function bc(n){return n=(n=n.stateNode)&&n.__reactInternalMemoizedMergedChildContext||rs,Xs=kn.current,Kt(kn,n),Kt(ni,ni.current),!0}function Ig(n,s,o){var u=n.stateNode;if(!u)throw Error(t(169));o?(n=Dg(n,s,Xs),u.__reactInternalMemoizedMergedChildContext=n,Jt(ni),Jt(kn),Kt(kn,n)):Jt(ni),Kt(ni,o)}var Er=null,Tc=!1,Kd=!1;function Ug(n){Er===null?Er=[n]:Er.push(n)}function NS(n){Tc=!0,Ug(n)}function ss(){if(!Kd&&Er!==null){Kd=!0;var n=0,s=Mt;try{var o=Er;for(Mt=1;n<o.length;n++){var u=o[n];do u=u(!0);while(u!==null)}Er=null,Tc=!1}catch(p){throw Er!==null&&(Er=Er.slice(n+1)),Gs(Xo,ss),p}finally{Mt=s,Kd=!1}}return null}var za=[],Ba=0,Cc=null,Rc=0,bi=[],Ti=0,$s=null,wr=1,br="";function qs(n,s){za[Ba++]=Rc,za[Ba++]=Cc,Cc=n,Rc=s}function Fg(n,s,o){bi[Ti++]=wr,bi[Ti++]=br,bi[Ti++]=$s,$s=n;var u=wr;n=br;var p=32-Ae(u)-1;u&=~(1<<p),o+=1;var S=32-Ae(s)+p;if(30<S){var R=p-p%5;S=(u&(1<<R)-1).toString(32),u>>=R,p-=R,wr=1<<32-Ae(s)+p|o<<p|u,br=S+n}else wr=1<<S|o<<p|u,br=n}function Qd(n){n.return!==null&&(qs(n,1),Fg(n,1,0))}function Zd(n){for(;n===Cc;)Cc=za[--Ba],za[Ba]=null,Rc=za[--Ba],za[Ba]=null;for(;n===$s;)$s=bi[--Ti],bi[Ti]=null,br=bi[--Ti],bi[Ti]=null,wr=bi[--Ti],bi[Ti]=null}var pi=null,mi=null,tn=!1,zi=null;function Og(n,s){var o=Pi(5,null,null,0);o.elementType="DELETED",o.stateNode=s,o.return=n,s=n.deletions,s===null?(n.deletions=[o],n.flags|=16):s.push(o)}function kg(n,s){switch(n.tag){case 5:var o=n.type;return s=s.nodeType!==1||o.toLowerCase()!==s.nodeName.toLowerCase()?null:s,s!==null?(n.stateNode=s,pi=n,mi=ns(s.firstChild),!0):!1;case 6:return s=n.pendingProps===""||s.nodeType!==3?null:s,s!==null?(n.stateNode=s,pi=n,mi=null,!0):!1;case 13:return s=s.nodeType!==8?null:s,s!==null?(o=$s!==null?{id:wr,overflow:br}:null,n.memoizedState={dehydrated:s,treeContext:o,retryLane:1073741824},o=Pi(18,null,null,0),o.stateNode=s,o.return=n,n.child=o,pi=n,mi=null,!0):!1;default:return!1}}function Jd(n){return(n.mode&1)!==0&&(n.flags&128)===0}function eh(n){if(tn){var s=mi;if(s){var o=s;if(!kg(n,s)){if(Jd(n))throw Error(t(418));s=ns(o.nextSibling);var u=pi;s&&kg(n,s)?Og(u,o):(n.flags=n.flags&-4097|2,tn=!1,pi=n)}}else{if(Jd(n))throw Error(t(418));n.flags=n.flags&-4097|2,tn=!1,pi=n}}}function zg(n){for(n=n.return;n!==null&&n.tag!==5&&n.tag!==3&&n.tag!==13;)n=n.return;pi=n}function Ac(n){if(n!==pi)return!1;if(!tn)return zg(n),tn=!0,!1;var s;if((s=n.tag!==3)&&!(s=n.tag!==5)&&(s=n.type,s=s!=="head"&&s!=="body"&&!Wd(n.type,n.memoizedProps)),s&&(s=mi)){if(Jd(n))throw Bg(),Error(t(418));for(;s;)Og(n,s),s=ns(s.nextSibling)}if(zg(n),n.tag===13){if(n=n.memoizedState,n=n!==null?n.dehydrated:null,!n)throw Error(t(317));e:{for(n=n.nextSibling,s=0;n;){if(n.nodeType===8){var o=n.data;if(o==="/$"){if(s===0){mi=ns(n.nextSibling);break e}s--}else o!=="$"&&o!=="$!"&&o!=="$?"||s++}n=n.nextSibling}mi=null}}else mi=pi?ns(n.stateNode.nextSibling):null;return!0}function Bg(){for(var n=mi;n;)n=ns(n.nextSibling)}function Ha(){mi=pi=null,tn=!1}function th(n){zi===null?zi=[n]:zi.push(n)}var LS=C.ReactCurrentBatchConfig;function ul(n,s,o){if(n=o.ref,n!==null&&typeof n!="function"&&typeof n!="object"){if(o._owner){if(o=o._owner,o){if(o.tag!==1)throw Error(t(309));var u=o.stateNode}if(!u)throw Error(t(147,n));var p=u,S=""+n;return s!==null&&s.ref!==null&&typeof s.ref=="function"&&s.ref._stringRef===S?s.ref:(s=function(R){var B=p.refs;R===null?delete B[S]:B[S]=R},s._stringRef=S,s)}if(typeof n!="string")throw Error(t(284));if(!o._owner)throw Error(t(290,n))}return n}function Pc(n,s){throw n=Object.prototype.toString.call(s),Error(t(31,n==="[object Object]"?"object with keys {"+Object.keys(s).join(", ")+"}":n))}function Hg(n){var s=n._init;return s(n._payload)}function Vg(n){function s(ie,Y){if(n){var le=ie.deletions;le===null?(ie.deletions=[Y],ie.flags|=16):le.push(Y)}}function o(ie,Y){if(!n)return null;for(;Y!==null;)s(ie,Y),Y=Y.sibling;return null}function u(ie,Y){for(ie=new Map;Y!==null;)Y.key!==null?ie.set(Y.key,Y):ie.set(Y.index,Y),Y=Y.sibling;return ie}function p(ie,Y){return ie=fs(ie,Y),ie.index=0,ie.sibling=null,ie}function S(ie,Y,le){return ie.index=le,n?(le=ie.alternate,le!==null?(le=le.index,le<Y?(ie.flags|=2,Y):le):(ie.flags|=2,Y)):(ie.flags|=1048576,Y)}function R(ie){return n&&ie.alternate===null&&(ie.flags|=2),ie}function B(ie,Y,le,Re){return Y===null||Y.tag!==6?(Y=Xh(le,ie.mode,Re),Y.return=ie,Y):(Y=p(Y,le),Y.return=ie,Y)}function j(ie,Y,le,Re){var tt=le.type;return tt===O?Te(ie,Y,le.props.children,Re,le.key):Y!==null&&(Y.elementType===tt||typeof tt=="object"&&tt!==null&&tt.$$typeof===he&&Hg(tt)===Y.type)?(Re=p(Y,le.props),Re.ref=ul(ie,Y,le),Re.return=ie,Re):(Re=eu(le.type,le.key,le.props,null,ie.mode,Re),Re.ref=ul(ie,Y,le),Re.return=ie,Re)}function pe(ie,Y,le,Re){return Y===null||Y.tag!==4||Y.stateNode.containerInfo!==le.containerInfo||Y.stateNode.implementation!==le.implementation?(Y=$h(le,ie.mode,Re),Y.return=ie,Y):(Y=p(Y,le.children||[]),Y.return=ie,Y)}function Te(ie,Y,le,Re,tt){return Y===null||Y.tag!==7?(Y=na(le,ie.mode,Re,tt),Y.return=ie,Y):(Y=p(Y,le),Y.return=ie,Y)}function Ce(ie,Y,le){if(typeof Y=="string"&&Y!==""||typeof Y=="number")return Y=Xh(""+Y,ie.mode,le),Y.return=ie,Y;if(typeof Y=="object"&&Y!==null){switch(Y.$$typeof){case F:return le=eu(Y.type,Y.key,Y.props,null,ie.mode,le),le.ref=ul(ie,null,Y),le.return=ie,le;case N:return Y=$h(Y,ie.mode,le),Y.return=ie,Y;case he:var Re=Y._init;return Ce(ie,Re(Y._payload),le)}if(jt(Y)||ce(Y))return Y=na(Y,ie.mode,le,null),Y.return=ie,Y;Pc(ie,Y)}return null}function we(ie,Y,le,Re){var tt=Y!==null?Y.key:null;if(typeof le=="string"&&le!==""||typeof le=="number")return tt!==null?null:B(ie,Y,""+le,Re);if(typeof le=="object"&&le!==null){switch(le.$$typeof){case F:return le.key===tt?j(ie,Y,le,Re):null;case N:return le.key===tt?pe(ie,Y,le,Re):null;case he:return tt=le._init,we(ie,Y,tt(le._payload),Re)}if(jt(le)||ce(le))return tt!==null?null:Te(ie,Y,le,Re,null);Pc(ie,le)}return null}function je(ie,Y,le,Re,tt){if(typeof Re=="string"&&Re!==""||typeof Re=="number")return ie=ie.get(le)||null,B(Y,ie,""+Re,tt);if(typeof Re=="object"&&Re!==null){switch(Re.$$typeof){case F:return ie=ie.get(Re.key===null?le:Re.key)||null,j(Y,ie,Re,tt);case N:return ie=ie.get(Re.key===null?le:Re.key)||null,pe(Y,ie,Re,tt);case he:var ot=Re._init;return je(ie,Y,le,ot(Re._payload),tt)}if(jt(Re)||ce(Re))return ie=ie.get(le)||null,Te(Y,ie,Re,tt,null);Pc(Y,Re)}return null}function Ye(ie,Y,le,Re){for(var tt=null,ot=null,lt=Y,ut=Y=0,Rn=null;lt!==null&&ut<le.length;ut++){lt.index>ut?(Rn=lt,lt=null):Rn=lt.sibling;var It=we(ie,lt,le[ut],Re);if(It===null){lt===null&&(lt=Rn);break}n&&lt&&It.alternate===null&&s(ie,lt),Y=S(It,Y,ut),ot===null?tt=It:ot.sibling=It,ot=It,lt=Rn}if(ut===le.length)return o(ie,lt),tn&&qs(ie,ut),tt;if(lt===null){for(;ut<le.length;ut++)lt=Ce(ie,le[ut],Re),lt!==null&&(Y=S(lt,Y,ut),ot===null?tt=lt:ot.sibling=lt,ot=lt);return tn&&qs(ie,ut),tt}for(lt=u(ie,lt);ut<le.length;ut++)Rn=je(lt,ie,ut,le[ut],Re),Rn!==null&&(n&&Rn.alternate!==null&&lt.delete(Rn.key===null?ut:Rn.key),Y=S(Rn,Y,ut),ot===null?tt=Rn:ot.sibling=Rn,ot=Rn);return n&&lt.forEach(function(ps){return s(ie,ps)}),tn&&qs(ie,ut),tt}function Ze(ie,Y,le,Re){var tt=ce(le);if(typeof tt!="function")throw Error(t(150));if(le=tt.call(le),le==null)throw Error(t(151));for(var ot=tt=null,lt=Y,ut=Y=0,Rn=null,It=le.next();lt!==null&&!It.done;ut++,It=le.next()){lt.index>ut?(Rn=lt,lt=null):Rn=lt.sibling;var ps=we(ie,lt,It.value,Re);if(ps===null){lt===null&&(lt=Rn);break}n&&lt&&ps.alternate===null&&s(ie,lt),Y=S(ps,Y,ut),ot===null?tt=ps:ot.sibling=ps,ot=ps,lt=Rn}if(It.done)return o(ie,lt),tn&&qs(ie,ut),tt;if(lt===null){for(;!It.done;ut++,It=le.next())It=Ce(ie,It.value,Re),It!==null&&(Y=S(It,Y,ut),ot===null?tt=It:ot.sibling=It,ot=It);return tn&&qs(ie,ut),tt}for(lt=u(ie,lt);!It.done;ut++,It=le.next())It=je(lt,ie,ut,It.value,Re),It!==null&&(n&&It.alternate!==null&&lt.delete(It.key===null?ut:It.key),Y=S(It,Y,ut),ot===null?tt=It:ot.sibling=It,ot=It);return n&&lt.forEach(function(dM){return s(ie,dM)}),tn&&qs(ie,ut),tt}function mn(ie,Y,le,Re){if(typeof le=="object"&&le!==null&&le.type===O&&le.key===null&&(le=le.props.children),typeof le=="object"&&le!==null){switch(le.$$typeof){case F:e:{for(var tt=le.key,ot=Y;ot!==null;){if(ot.key===tt){if(tt=le.type,tt===O){if(ot.tag===7){o(ie,ot.sibling),Y=p(ot,le.props.children),Y.return=ie,ie=Y;break e}}else if(ot.elementType===tt||typeof tt=="object"&&tt!==null&&tt.$$typeof===he&&Hg(tt)===ot.type){o(ie,ot.sibling),Y=p(ot,le.props),Y.ref=ul(ie,ot,le),Y.return=ie,ie=Y;break e}o(ie,ot);break}else s(ie,ot);ot=ot.sibling}le.type===O?(Y=na(le.props.children,ie.mode,Re,le.key),Y.return=ie,ie=Y):(Re=eu(le.type,le.key,le.props,null,ie.mode,Re),Re.ref=ul(ie,Y,le),Re.return=ie,ie=Re)}return R(ie);case N:e:{for(ot=le.key;Y!==null;){if(Y.key===ot)if(Y.tag===4&&Y.stateNode.containerInfo===le.containerInfo&&Y.stateNode.implementation===le.implementation){o(ie,Y.sibling),Y=p(Y,le.children||[]),Y.return=ie,ie=Y;break e}else{o(ie,Y);break}else s(ie,Y);Y=Y.sibling}Y=$h(le,ie.mode,Re),Y.return=ie,ie=Y}return R(ie);case he:return ot=le._init,mn(ie,Y,ot(le._payload),Re)}if(jt(le))return Ye(ie,Y,le,Re);if(ce(le))return Ze(ie,Y,le,Re);Pc(ie,le)}return typeof le=="string"&&le!==""||typeof le=="number"?(le=""+le,Y!==null&&Y.tag===6?(o(ie,Y.sibling),Y=p(Y,le),Y.return=ie,ie=Y):(o(ie,Y),Y=Xh(le,ie.mode,Re),Y.return=ie,ie=Y),R(ie)):o(ie,Y)}return mn}var Va=Vg(!0),Gg=Vg(!1),Nc=is(null),Lc=null,Ga=null,nh=null;function ih(){nh=Ga=Lc=null}function rh(n){var s=Nc.current;Jt(Nc),n._currentValue=s}function sh(n,s,o){for(;n!==null;){var u=n.alternate;if((n.childLanes&s)!==s?(n.childLanes|=s,u!==null&&(u.childLanes|=s)):u!==null&&(u.childLanes&s)!==s&&(u.childLanes|=s),n===o)break;n=n.return}}function ja(n,s){Lc=n,nh=Ga=null,n=n.dependencies,n!==null&&n.firstContext!==null&&((n.lanes&s)!==0&&(ri=!0),n.firstContext=null)}function Ci(n){var s=n._currentValue;if(nh!==n)if(n={context:n,memoizedValue:s,next:null},Ga===null){if(Lc===null)throw Error(t(308));Ga=n,Lc.dependencies={lanes:0,firstContext:n}}else Ga=Ga.next=n;return s}var Ys=null;function ah(n){Ys===null?Ys=[n]:Ys.push(n)}function jg(n,s,o,u){var p=s.interleaved;return p===null?(o.next=o,ah(s)):(o.next=p.next,p.next=o),s.interleaved=o,Tr(n,u)}function Tr(n,s){n.lanes|=s;var o=n.alternate;for(o!==null&&(o.lanes|=s),o=n,n=n.return;n!==null;)n.childLanes|=s,o=n.alternate,o!==null&&(o.childLanes|=s),o=n,n=n.return;return o.tag===3?o.stateNode:null}var as=!1;function oh(n){n.updateQueue={baseState:n.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function Wg(n,s){n=n.updateQueue,s.updateQueue===n&&(s.updateQueue={baseState:n.baseState,firstBaseUpdate:n.firstBaseUpdate,lastBaseUpdate:n.lastBaseUpdate,shared:n.shared,effects:n.effects})}function Cr(n,s){return{eventTime:n,lane:s,tag:0,payload:null,callback:null,next:null}}function os(n,s,o){var u=n.updateQueue;if(u===null)return null;if(u=u.shared,(Nt&2)!==0){var p=u.pending;return p===null?s.next=s:(s.next=p.next,p.next=s),u.pending=s,Tr(n,o)}return p=u.interleaved,p===null?(s.next=s,ah(u)):(s.next=p.next,p.next=s),u.interleaved=s,Tr(n,o)}function Dc(n,s,o){if(s=s.updateQueue,s!==null&&(s=s.shared,(o&4194240)!==0)){var u=s.lanes;u&=n.pendingLanes,o|=u,s.lanes=o,ti(n,o)}}function Xg(n,s){var o=n.updateQueue,u=n.alternate;if(u!==null&&(u=u.updateQueue,o===u)){var p=null,S=null;if(o=o.firstBaseUpdate,o!==null){do{var R={eventTime:o.eventTime,lane:o.lane,tag:o.tag,payload:o.payload,callback:o.callback,next:null};S===null?p=S=R:S=S.next=R,o=o.next}while(o!==null);S===null?p=S=s:S=S.next=s}else p=S=s;o={baseState:u.baseState,firstBaseUpdate:p,lastBaseUpdate:S,shared:u.shared,effects:u.effects},n.updateQueue=o;return}n=o.lastBaseUpdate,n===null?o.firstBaseUpdate=s:n.next=s,o.lastBaseUpdate=s}function Ic(n,s,o,u){var p=n.updateQueue;as=!1;var S=p.firstBaseUpdate,R=p.lastBaseUpdate,B=p.shared.pending;if(B!==null){p.shared.pending=null;var j=B,pe=j.next;j.next=null,R===null?S=pe:R.next=pe,R=j;var Te=n.alternate;Te!==null&&(Te=Te.updateQueue,B=Te.lastBaseUpdate,B!==R&&(B===null?Te.firstBaseUpdate=pe:B.next=pe,Te.lastBaseUpdate=j))}if(S!==null){var Ce=p.baseState;R=0,Te=pe=j=null,B=S;do{var we=B.lane,je=B.eventTime;if((u&we)===we){Te!==null&&(Te=Te.next={eventTime:je,lane:0,tag:B.tag,payload:B.payload,callback:B.callback,next:null});e:{var Ye=n,Ze=B;switch(we=s,je=o,Ze.tag){case 1:if(Ye=Ze.payload,typeof Ye=="function"){Ce=Ye.call(je,Ce,we);break e}Ce=Ye;break e;case 3:Ye.flags=Ye.flags&-65537|128;case 0:if(Ye=Ze.payload,we=typeof Ye=="function"?Ye.call(je,Ce,we):Ye,we==null)break e;Ce=ue({},Ce,we);break e;case 2:as=!0}}B.callback!==null&&B.lane!==0&&(n.flags|=64,we=p.effects,we===null?p.effects=[B]:we.push(B))}else je={eventTime:je,lane:we,tag:B.tag,payload:B.payload,callback:B.callback,next:null},Te===null?(pe=Te=je,j=Ce):Te=Te.next=je,R|=we;if(B=B.next,B===null){if(B=p.shared.pending,B===null)break;we=B,B=we.next,we.next=null,p.lastBaseUpdate=we,p.shared.pending=null}}while(!0);if(Te===null&&(j=Ce),p.baseState=j,p.firstBaseUpdate=pe,p.lastBaseUpdate=Te,s=p.shared.interleaved,s!==null){p=s;do R|=p.lane,p=p.next;while(p!==s)}else S===null&&(p.shared.lanes=0);Zs|=R,n.lanes=R,n.memoizedState=Ce}}function $g(n,s,o){if(n=s.effects,s.effects=null,n!==null)for(s=0;s<n.length;s++){var u=n[s],p=u.callback;if(p!==null){if(u.callback=null,u=o,typeof p!="function")throw Error(t(191,p));p.call(u)}}}var dl={},ir=is(dl),hl=is(dl),fl=is(dl);function Ks(n){if(n===dl)throw Error(t(174));return n}function lh(n,s){switch(Kt(fl,s),Kt(hl,n),Kt(ir,dl),n=s.nodeType,n){case 9:case 11:s=(s=s.documentElement)?s.namespaceURI:T(null,"");break;default:n=n===8?s.parentNode:s,s=n.namespaceURI||null,n=n.tagName,s=T(s,n)}Jt(ir),Kt(ir,s)}function Wa(){Jt(ir),Jt(hl),Jt(fl)}function qg(n){Ks(fl.current);var s=Ks(ir.current),o=T(s,n.type);s!==o&&(Kt(hl,n),Kt(ir,o))}function ch(n){hl.current===n&&(Jt(ir),Jt(hl))}var on=is(0);function Uc(n){for(var s=n;s!==null;){if(s.tag===13){var o=s.memoizedState;if(o!==null&&(o=o.dehydrated,o===null||o.data==="$?"||o.data==="$!"))return s}else if(s.tag===19&&s.memoizedProps.revealOrder!==void 0){if((s.flags&128)!==0)return s}else if(s.child!==null){s.child.return=s,s=s.child;continue}if(s===n)break;for(;s.sibling===null;){if(s.return===null||s.return===n)return null;s=s.return}s.sibling.return=s.return,s=s.sibling}return null}var uh=[];function dh(){for(var n=0;n<uh.length;n++)uh[n]._workInProgressVersionPrimary=null;uh.length=0}var Fc=C.ReactCurrentDispatcher,hh=C.ReactCurrentBatchConfig,Qs=0,ln=null,_n=null,Tn=null,Oc=!1,pl=!1,ml=0,DS=0;function zn(){throw Error(t(321))}function fh(n,s){if(s===null)return!1;for(var o=0;o<s.length&&o<n.length;o++)if(!ki(n[o],s[o]))return!1;return!0}function ph(n,s,o,u,p,S){if(Qs=S,ln=s,s.memoizedState=null,s.updateQueue=null,s.lanes=0,Fc.current=n===null||n.memoizedState===null?OS:kS,n=o(u,p),pl){S=0;do{if(pl=!1,ml=0,25<=S)throw Error(t(301));S+=1,Tn=_n=null,s.updateQueue=null,Fc.current=zS,n=o(u,p)}while(pl)}if(Fc.current=Bc,s=_n!==null&&_n.next!==null,Qs=0,Tn=_n=ln=null,Oc=!1,s)throw Error(t(300));return n}function mh(){var n=ml!==0;return ml=0,n}function rr(){var n={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Tn===null?ln.memoizedState=Tn=n:Tn=Tn.next=n,Tn}function Ri(){if(_n===null){var n=ln.alternate;n=n!==null?n.memoizedState:null}else n=_n.next;var s=Tn===null?ln.memoizedState:Tn.next;if(s!==null)Tn=s,_n=n;else{if(n===null)throw Error(t(310));_n=n,n={memoizedState:_n.memoizedState,baseState:_n.baseState,baseQueue:_n.baseQueue,queue:_n.queue,next:null},Tn===null?ln.memoizedState=Tn=n:Tn=Tn.next=n}return Tn}function gl(n,s){return typeof s=="function"?s(n):s}function gh(n){var s=Ri(),o=s.queue;if(o===null)throw Error(t(311));o.lastRenderedReducer=n;var u=_n,p=u.baseQueue,S=o.pending;if(S!==null){if(p!==null){var R=p.next;p.next=S.next,S.next=R}u.baseQueue=p=S,o.pending=null}if(p!==null){S=p.next,u=u.baseState;var B=R=null,j=null,pe=S;do{var Te=pe.lane;if((Qs&Te)===Te)j!==null&&(j=j.next={lane:0,action:pe.action,hasEagerState:pe.hasEagerState,eagerState:pe.eagerState,next:null}),u=pe.hasEagerState?pe.eagerState:n(u,pe.action);else{var Ce={lane:Te,action:pe.action,hasEagerState:pe.hasEagerState,eagerState:pe.eagerState,next:null};j===null?(B=j=Ce,R=u):j=j.next=Ce,ln.lanes|=Te,Zs|=Te}pe=pe.next}while(pe!==null&&pe!==S);j===null?R=u:j.next=B,ki(u,s.memoizedState)||(ri=!0),s.memoizedState=u,s.baseState=R,s.baseQueue=j,o.lastRenderedState=u}if(n=o.interleaved,n!==null){p=n;do S=p.lane,ln.lanes|=S,Zs|=S,p=p.next;while(p!==n)}else p===null&&(o.lanes=0);return[s.memoizedState,o.dispatch]}function xh(n){var s=Ri(),o=s.queue;if(o===null)throw Error(t(311));o.lastRenderedReducer=n;var u=o.dispatch,p=o.pending,S=s.memoizedState;if(p!==null){o.pending=null;var R=p=p.next;do S=n(S,R.action),R=R.next;while(R!==p);ki(S,s.memoizedState)||(ri=!0),s.memoizedState=S,s.baseQueue===null&&(s.baseState=S),o.lastRenderedState=S}return[S,u]}function Yg(){}function Kg(n,s){var o=ln,u=Ri(),p=s(),S=!ki(u.memoizedState,p);if(S&&(u.memoizedState=p,ri=!0),u=u.queue,vh(Jg.bind(null,o,u,n),[n]),u.getSnapshot!==s||S||Tn!==null&&Tn.memoizedState.tag&1){if(o.flags|=2048,xl(9,Zg.bind(null,o,u,p,s),void 0,null),Cn===null)throw Error(t(349));(Qs&30)!==0||Qg(o,s,p)}return p}function Qg(n,s,o){n.flags|=16384,n={getSnapshot:s,value:o},s=ln.updateQueue,s===null?(s={lastEffect:null,stores:null},ln.updateQueue=s,s.stores=[n]):(o=s.stores,o===null?s.stores=[n]:o.push(n))}function Zg(n,s,o,u){s.value=o,s.getSnapshot=u,e0(s)&&t0(n)}function Jg(n,s,o){return o(function(){e0(s)&&t0(n)})}function e0(n){var s=n.getSnapshot;n=n.value;try{var o=s();return!ki(n,o)}catch{return!0}}function t0(n){var s=Tr(n,1);s!==null&&Gi(s,n,1,-1)}function n0(n){var s=rr();return typeof n=="function"&&(n=n()),s.memoizedState=s.baseState=n,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:gl,lastRenderedState:n},s.queue=n,n=n.dispatch=FS.bind(null,ln,n),[s.memoizedState,n]}function xl(n,s,o,u){return n={tag:n,create:s,destroy:o,deps:u,next:null},s=ln.updateQueue,s===null?(s={lastEffect:null,stores:null},ln.updateQueue=s,s.lastEffect=n.next=n):(o=s.lastEffect,o===null?s.lastEffect=n.next=n:(u=o.next,o.next=n,n.next=u,s.lastEffect=n)),n}function i0(){return Ri().memoizedState}function kc(n,s,o,u){var p=rr();ln.flags|=n,p.memoizedState=xl(1|s,o,void 0,u===void 0?null:u)}function zc(n,s,o,u){var p=Ri();u=u===void 0?null:u;var S=void 0;if(_n!==null){var R=_n.memoizedState;if(S=R.destroy,u!==null&&fh(u,R.deps)){p.memoizedState=xl(s,o,S,u);return}}ln.flags|=n,p.memoizedState=xl(1|s,o,S,u)}function r0(n,s){return kc(8390656,8,n,s)}function vh(n,s){return zc(2048,8,n,s)}function s0(n,s){return zc(4,2,n,s)}function a0(n,s){return zc(4,4,n,s)}function o0(n,s){if(typeof s=="function")return n=n(),s(n),function(){s(null)};if(s!=null)return n=n(),s.current=n,function(){s.current=null}}function l0(n,s,o){return o=o!=null?o.concat([n]):null,zc(4,4,o0.bind(null,s,n),o)}function _h(){}function c0(n,s){var o=Ri();s=s===void 0?null:s;var u=o.memoizedState;return u!==null&&s!==null&&fh(s,u[1])?u[0]:(o.memoizedState=[n,s],n)}function u0(n,s){var o=Ri();s=s===void 0?null:s;var u=o.memoizedState;return u!==null&&s!==null&&fh(s,u[1])?u[0]:(n=n(),o.memoizedState=[n,s],n)}function d0(n,s,o){return(Qs&21)===0?(n.baseState&&(n.baseState=!1,ri=!0),n.memoizedState=o):(ki(o,s)||(o=Ge(),ln.lanes|=o,Zs|=o,n.baseState=!0),s)}function IS(n,s){var o=Mt;Mt=o!==0&&4>o?o:4,n(!0);var u=hh.transition;hh.transition={};try{n(!1),s()}finally{Mt=o,hh.transition=u}}function h0(){return Ri().memoizedState}function US(n,s,o){var u=ds(n);if(o={lane:u,action:o,hasEagerState:!1,eagerState:null,next:null},f0(n))p0(s,o);else if(o=jg(n,s,o,u),o!==null){var p=Yn();Gi(o,n,u,p),m0(o,s,u)}}function FS(n,s,o){var u=ds(n),p={lane:u,action:o,hasEagerState:!1,eagerState:null,next:null};if(f0(n))p0(s,p);else{var S=n.alternate;if(n.lanes===0&&(S===null||S.lanes===0)&&(S=s.lastRenderedReducer,S!==null))try{var R=s.lastRenderedState,B=S(R,o);if(p.hasEagerState=!0,p.eagerState=B,ki(B,R)){var j=s.interleaved;j===null?(p.next=p,ah(s)):(p.next=j.next,j.next=p),s.interleaved=p;return}}catch{}finally{}o=jg(n,s,p,u),o!==null&&(p=Yn(),Gi(o,n,u,p),m0(o,s,u))}}function f0(n){var s=n.alternate;return n===ln||s!==null&&s===ln}function p0(n,s){pl=Oc=!0;var o=n.pending;o===null?s.next=s:(s.next=o.next,o.next=s),n.pending=s}function m0(n,s,o){if((o&4194240)!==0){var u=s.lanes;u&=n.pendingLanes,o|=u,s.lanes=o,ti(n,o)}}var Bc={readContext:Ci,useCallback:zn,useContext:zn,useEffect:zn,useImperativeHandle:zn,useInsertionEffect:zn,useLayoutEffect:zn,useMemo:zn,useReducer:zn,useRef:zn,useState:zn,useDebugValue:zn,useDeferredValue:zn,useTransition:zn,useMutableSource:zn,useSyncExternalStore:zn,useId:zn,unstable_isNewReconciler:!1},OS={readContext:Ci,useCallback:function(n,s){return rr().memoizedState=[n,s===void 0?null:s],n},useContext:Ci,useEffect:r0,useImperativeHandle:function(n,s,o){return o=o!=null?o.concat([n]):null,kc(4194308,4,o0.bind(null,s,n),o)},useLayoutEffect:function(n,s){return kc(4194308,4,n,s)},useInsertionEffect:function(n,s){return kc(4,2,n,s)},useMemo:function(n,s){var o=rr();return s=s===void 0?null:s,n=n(),o.memoizedState=[n,s],n},useReducer:function(n,s,o){var u=rr();return s=o!==void 0?o(s):s,u.memoizedState=u.baseState=s,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:n,lastRenderedState:s},u.queue=n,n=n.dispatch=US.bind(null,ln,n),[u.memoizedState,n]},useRef:function(n){var s=rr();return n={current:n},s.memoizedState=n},useState:n0,useDebugValue:_h,useDeferredValue:function(n){return rr().memoizedState=n},useTransition:function(){var n=n0(!1),s=n[0];return n=IS.bind(null,n[1]),rr().memoizedState=n,[s,n]},useMutableSource:function(){},useSyncExternalStore:function(n,s,o){var u=ln,p=rr();if(tn){if(o===void 0)throw Error(t(407));o=o()}else{if(o=s(),Cn===null)throw Error(t(349));(Qs&30)!==0||Qg(u,s,o)}p.memoizedState=o;var S={value:o,getSnapshot:s};return p.queue=S,r0(Jg.bind(null,u,S,n),[n]),u.flags|=2048,xl(9,Zg.bind(null,u,S,o,s),void 0,null),o},useId:function(){var n=rr(),s=Cn.identifierPrefix;if(tn){var o=br,u=wr;o=(u&~(1<<32-Ae(u)-1)).toString(32)+o,s=":"+s+"R"+o,o=ml++,0<o&&(s+="H"+o.toString(32)),s+=":"}else o=DS++,s=":"+s+"r"+o.toString(32)+":";return n.memoizedState=s},unstable_isNewReconciler:!1},kS={readContext:Ci,useCallback:c0,useContext:Ci,useEffect:vh,useImperativeHandle:l0,useInsertionEffect:s0,useLayoutEffect:a0,useMemo:u0,useReducer:gh,useRef:i0,useState:function(){return gh(gl)},useDebugValue:_h,useDeferredValue:function(n){var s=Ri();return d0(s,_n.memoizedState,n)},useTransition:function(){var n=gh(gl)[0],s=Ri().memoizedState;return[n,s]},useMutableSource:Yg,useSyncExternalStore:Kg,useId:h0,unstable_isNewReconciler:!1},zS={readContext:Ci,useCallback:c0,useContext:Ci,useEffect:vh,useImperativeHandle:l0,useInsertionEffect:s0,useLayoutEffect:a0,useMemo:u0,useReducer:xh,useRef:i0,useState:function(){return xh(gl)},useDebugValue:_h,useDeferredValue:function(n){var s=Ri();return _n===null?s.memoizedState=n:d0(s,_n.memoizedState,n)},useTransition:function(){var n=xh(gl)[0],s=Ri().memoizedState;return[n,s]},useMutableSource:Yg,useSyncExternalStore:Kg,useId:h0,unstable_isNewReconciler:!1};function Bi(n,s){if(n&&n.defaultProps){s=ue({},s),n=n.defaultProps;for(var o in n)s[o]===void 0&&(s[o]=n[o]);return s}return s}function yh(n,s,o,u){s=n.memoizedState,o=o(u,s),o=o==null?s:ue({},s,o),n.memoizedState=o,n.lanes===0&&(n.updateQueue.baseState=o)}var Hc={isMounted:function(n){return(n=n._reactInternals)?$n(n)===n:!1},enqueueSetState:function(n,s,o){n=n._reactInternals;var u=Yn(),p=ds(n),S=Cr(u,p);S.payload=s,o!=null&&(S.callback=o),s=os(n,S,p),s!==null&&(Gi(s,n,p,u),Dc(s,n,p))},enqueueReplaceState:function(n,s,o){n=n._reactInternals;var u=Yn(),p=ds(n),S=Cr(u,p);S.tag=1,S.payload=s,o!=null&&(S.callback=o),s=os(n,S,p),s!==null&&(Gi(s,n,p,u),Dc(s,n,p))},enqueueForceUpdate:function(n,s){n=n._reactInternals;var o=Yn(),u=ds(n),p=Cr(o,u);p.tag=2,s!=null&&(p.callback=s),s=os(n,p,u),s!==null&&(Gi(s,n,u,o),Dc(s,n,u))}};function g0(n,s,o,u,p,S,R){return n=n.stateNode,typeof n.shouldComponentUpdate=="function"?n.shouldComponentUpdate(u,S,R):s.prototype&&s.prototype.isPureReactComponent?!il(o,u)||!il(p,S):!0}function x0(n,s,o){var u=!1,p=rs,S=s.contextType;return typeof S=="object"&&S!==null?S=Ci(S):(p=ii(s)?Xs:kn.current,u=s.contextTypes,S=(u=u!=null)?ka(n,p):rs),s=new s(o,S),n.memoizedState=s.state!==null&&s.state!==void 0?s.state:null,s.updater=Hc,n.stateNode=s,s._reactInternals=n,u&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=p,n.__reactInternalMemoizedMaskedChildContext=S),s}function v0(n,s,o,u){n=s.state,typeof s.componentWillReceiveProps=="function"&&s.componentWillReceiveProps(o,u),typeof s.UNSAFE_componentWillReceiveProps=="function"&&s.UNSAFE_componentWillReceiveProps(o,u),s.state!==n&&Hc.enqueueReplaceState(s,s.state,null)}function Sh(n,s,o,u){var p=n.stateNode;p.props=o,p.state=n.memoizedState,p.refs={},oh(n);var S=s.contextType;typeof S=="object"&&S!==null?p.context=Ci(S):(S=ii(s)?Xs:kn.current,p.context=ka(n,S)),p.state=n.memoizedState,S=s.getDerivedStateFromProps,typeof S=="function"&&(yh(n,s,S,o),p.state=n.memoizedState),typeof s.getDerivedStateFromProps=="function"||typeof p.getSnapshotBeforeUpdate=="function"||typeof p.UNSAFE_componentWillMount!="function"&&typeof p.componentWillMount!="function"||(s=p.state,typeof p.componentWillMount=="function"&&p.componentWillMount(),typeof p.UNSAFE_componentWillMount=="function"&&p.UNSAFE_componentWillMount(),s!==p.state&&Hc.enqueueReplaceState(p,p.state,null),Ic(n,o,p,u),p.state=n.memoizedState),typeof p.componentDidMount=="function"&&(n.flags|=4194308)}function Xa(n,s){try{var o="",u=s;do o+=Ve(u),u=u.return;while(u);var p=o}catch(S){p=`
Error generating stack: `+S.message+`
`+S.stack}return{value:n,source:s,stack:p,digest:null}}function Mh(n,s,o){return{value:n,source:null,stack:o??null,digest:s??null}}function Eh(n,s){try{console.error(s.value)}catch(o){setTimeout(function(){throw o})}}var BS=typeof WeakMap=="function"?WeakMap:Map;function _0(n,s,o){o=Cr(-1,o),o.tag=3,o.payload={element:null};var u=s.value;return o.callback=function(){qc||(qc=!0,kh=u),Eh(n,s)},o}function y0(n,s,o){o=Cr(-1,o),o.tag=3;var u=n.type.getDerivedStateFromError;if(typeof u=="function"){var p=s.value;o.payload=function(){return u(p)},o.callback=function(){Eh(n,s)}}var S=n.stateNode;return S!==null&&typeof S.componentDidCatch=="function"&&(o.callback=function(){Eh(n,s),typeof u!="function"&&(cs===null?cs=new Set([this]):cs.add(this));var R=s.stack;this.componentDidCatch(s.value,{componentStack:R!==null?R:""})}),o}function S0(n,s,o){var u=n.pingCache;if(u===null){u=n.pingCache=new BS;var p=new Set;u.set(s,p)}else p=u.get(s),p===void 0&&(p=new Set,u.set(s,p));p.has(o)||(p.add(o),n=eM.bind(null,n,s,o),s.then(n,n))}function M0(n){do{var s;if((s=n.tag===13)&&(s=n.memoizedState,s=s!==null?s.dehydrated!==null:!0),s)return n;n=n.return}while(n!==null);return null}function E0(n,s,o,u,p){return(n.mode&1)===0?(n===s?n.flags|=65536:(n.flags|=128,o.flags|=131072,o.flags&=-52805,o.tag===1&&(o.alternate===null?o.tag=17:(s=Cr(-1,1),s.tag=2,os(o,s,1))),o.lanes|=1),n):(n.flags|=65536,n.lanes=p,n)}var HS=C.ReactCurrentOwner,ri=!1;function qn(n,s,o,u){s.child=n===null?Gg(s,null,o,u):Va(s,n.child,o,u)}function w0(n,s,o,u,p){o=o.render;var S=s.ref;return ja(s,p),u=ph(n,s,o,u,S,p),o=mh(),n!==null&&!ri?(s.updateQueue=n.updateQueue,s.flags&=-2053,n.lanes&=~p,Rr(n,s,p)):(tn&&o&&Qd(s),s.flags|=1,qn(n,s,u,p),s.child)}function b0(n,s,o,u,p){if(n===null){var S=o.type;return typeof S=="function"&&!Wh(S)&&S.defaultProps===void 0&&o.compare===null&&o.defaultProps===void 0?(s.tag=15,s.type=S,T0(n,s,S,u,p)):(n=eu(o.type,null,u,s,s.mode,p),n.ref=s.ref,n.return=s,s.child=n)}if(S=n.child,(n.lanes&p)===0){var R=S.memoizedProps;if(o=o.compare,o=o!==null?o:il,o(R,u)&&n.ref===s.ref)return Rr(n,s,p)}return s.flags|=1,n=fs(S,u),n.ref=s.ref,n.return=s,s.child=n}function T0(n,s,o,u,p){if(n!==null){var S=n.memoizedProps;if(il(S,u)&&n.ref===s.ref)if(ri=!1,s.pendingProps=u=S,(n.lanes&p)!==0)(n.flags&131072)!==0&&(ri=!0);else return s.lanes=n.lanes,Rr(n,s,p)}return wh(n,s,o,u,p)}function C0(n,s,o){var u=s.pendingProps,p=u.children,S=n!==null?n.memoizedState:null;if(u.mode==="hidden")if((s.mode&1)===0)s.memoizedState={baseLanes:0,cachePool:null,transitions:null},Kt(qa,gi),gi|=o;else{if((o&1073741824)===0)return n=S!==null?S.baseLanes|o:o,s.lanes=s.childLanes=1073741824,s.memoizedState={baseLanes:n,cachePool:null,transitions:null},s.updateQueue=null,Kt(qa,gi),gi|=n,null;s.memoizedState={baseLanes:0,cachePool:null,transitions:null},u=S!==null?S.baseLanes:o,Kt(qa,gi),gi|=u}else S!==null?(u=S.baseLanes|o,s.memoizedState=null):u=o,Kt(qa,gi),gi|=u;return qn(n,s,p,o),s.child}function R0(n,s){var o=s.ref;(n===null&&o!==null||n!==null&&n.ref!==o)&&(s.flags|=512,s.flags|=2097152)}function wh(n,s,o,u,p){var S=ii(o)?Xs:kn.current;return S=ka(s,S),ja(s,p),o=ph(n,s,o,u,S,p),u=mh(),n!==null&&!ri?(s.updateQueue=n.updateQueue,s.flags&=-2053,n.lanes&=~p,Rr(n,s,p)):(tn&&u&&Qd(s),s.flags|=1,qn(n,s,o,p),s.child)}function A0(n,s,o,u,p){if(ii(o)){var S=!0;bc(s)}else S=!1;if(ja(s,p),s.stateNode===null)Gc(n,s),x0(s,o,u),Sh(s,o,u,p),u=!0;else if(n===null){var R=s.stateNode,B=s.memoizedProps;R.props=B;var j=R.context,pe=o.contextType;typeof pe=="object"&&pe!==null?pe=Ci(pe):(pe=ii(o)?Xs:kn.current,pe=ka(s,pe));var Te=o.getDerivedStateFromProps,Ce=typeof Te=="function"||typeof R.getSnapshotBeforeUpdate=="function";Ce||typeof R.UNSAFE_componentWillReceiveProps!="function"&&typeof R.componentWillReceiveProps!="function"||(B!==u||j!==pe)&&v0(s,R,u,pe),as=!1;var we=s.memoizedState;R.state=we,Ic(s,u,R,p),j=s.memoizedState,B!==u||we!==j||ni.current||as?(typeof Te=="function"&&(yh(s,o,Te,u),j=s.memoizedState),(B=as||g0(s,o,B,u,we,j,pe))?(Ce||typeof R.UNSAFE_componentWillMount!="function"&&typeof R.componentWillMount!="function"||(typeof R.componentWillMount=="function"&&R.componentWillMount(),typeof R.UNSAFE_componentWillMount=="function"&&R.UNSAFE_componentWillMount()),typeof R.componentDidMount=="function"&&(s.flags|=4194308)):(typeof R.componentDidMount=="function"&&(s.flags|=4194308),s.memoizedProps=u,s.memoizedState=j),R.props=u,R.state=j,R.context=pe,u=B):(typeof R.componentDidMount=="function"&&(s.flags|=4194308),u=!1)}else{R=s.stateNode,Wg(n,s),B=s.memoizedProps,pe=s.type===s.elementType?B:Bi(s.type,B),R.props=pe,Ce=s.pendingProps,we=R.context,j=o.contextType,typeof j=="object"&&j!==null?j=Ci(j):(j=ii(o)?Xs:kn.current,j=ka(s,j));var je=o.getDerivedStateFromProps;(Te=typeof je=="function"||typeof R.getSnapshotBeforeUpdate=="function")||typeof R.UNSAFE_componentWillReceiveProps!="function"&&typeof R.componentWillReceiveProps!="function"||(B!==Ce||we!==j)&&v0(s,R,u,j),as=!1,we=s.memoizedState,R.state=we,Ic(s,u,R,p);var Ye=s.memoizedState;B!==Ce||we!==Ye||ni.current||as?(typeof je=="function"&&(yh(s,o,je,u),Ye=s.memoizedState),(pe=as||g0(s,o,pe,u,we,Ye,j)||!1)?(Te||typeof R.UNSAFE_componentWillUpdate!="function"&&typeof R.componentWillUpdate!="function"||(typeof R.componentWillUpdate=="function"&&R.componentWillUpdate(u,Ye,j),typeof R.UNSAFE_componentWillUpdate=="function"&&R.UNSAFE_componentWillUpdate(u,Ye,j)),typeof R.componentDidUpdate=="function"&&(s.flags|=4),typeof R.getSnapshotBeforeUpdate=="function"&&(s.flags|=1024)):(typeof R.componentDidUpdate!="function"||B===n.memoizedProps&&we===n.memoizedState||(s.flags|=4),typeof R.getSnapshotBeforeUpdate!="function"||B===n.memoizedProps&&we===n.memoizedState||(s.flags|=1024),s.memoizedProps=u,s.memoizedState=Ye),R.props=u,R.state=Ye,R.context=j,u=pe):(typeof R.componentDidUpdate!="function"||B===n.memoizedProps&&we===n.memoizedState||(s.flags|=4),typeof R.getSnapshotBeforeUpdate!="function"||B===n.memoizedProps&&we===n.memoizedState||(s.flags|=1024),u=!1)}return bh(n,s,o,u,S,p)}function bh(n,s,o,u,p,S){R0(n,s);var R=(s.flags&128)!==0;if(!u&&!R)return p&&Ig(s,o,!1),Rr(n,s,S);u=s.stateNode,HS.current=s;var B=R&&typeof o.getDerivedStateFromError!="function"?null:u.render();return s.flags|=1,n!==null&&R?(s.child=Va(s,n.child,null,S),s.child=Va(s,null,B,S)):qn(n,s,B,S),s.memoizedState=u.state,p&&Ig(s,o,!0),s.child}function P0(n){var s=n.stateNode;s.pendingContext?Lg(n,s.pendingContext,s.pendingContext!==s.context):s.context&&Lg(n,s.context,!1),lh(n,s.containerInfo)}function N0(n,s,o,u,p){return Ha(),th(p),s.flags|=256,qn(n,s,o,u),s.child}var Th={dehydrated:null,treeContext:null,retryLane:0};function Ch(n){return{baseLanes:n,cachePool:null,transitions:null}}function L0(n,s,o){var u=s.pendingProps,p=on.current,S=!1,R=(s.flags&128)!==0,B;if((B=R)||(B=n!==null&&n.memoizedState===null?!1:(p&2)!==0),B?(S=!0,s.flags&=-129):(n===null||n.memoizedState!==null)&&(p|=1),Kt(on,p&1),n===null)return eh(s),n=s.memoizedState,n!==null&&(n=n.dehydrated,n!==null)?((s.mode&1)===0?s.lanes=1:n.data==="$!"?s.lanes=8:s.lanes=1073741824,null):(R=u.children,n=u.fallback,S?(u=s.mode,S=s.child,R={mode:"hidden",children:R},(u&1)===0&&S!==null?(S.childLanes=0,S.pendingProps=R):S=tu(R,u,0,null),n=na(n,u,o,null),S.return=s,n.return=s,S.sibling=n,s.child=S,s.child.memoizedState=Ch(o),s.memoizedState=Th,n):Rh(s,R));if(p=n.memoizedState,p!==null&&(B=p.dehydrated,B!==null))return VS(n,s,R,u,B,p,o);if(S){S=u.fallback,R=s.mode,p=n.child,B=p.sibling;var j={mode:"hidden",children:u.children};return(R&1)===0&&s.child!==p?(u=s.child,u.childLanes=0,u.pendingProps=j,s.deletions=null):(u=fs(p,j),u.subtreeFlags=p.subtreeFlags&14680064),B!==null?S=fs(B,S):(S=na(S,R,o,null),S.flags|=2),S.return=s,u.return=s,u.sibling=S,s.child=u,u=S,S=s.child,R=n.child.memoizedState,R=R===null?Ch(o):{baseLanes:R.baseLanes|o,cachePool:null,transitions:R.transitions},S.memoizedState=R,S.childLanes=n.childLanes&~o,s.memoizedState=Th,u}return S=n.child,n=S.sibling,u=fs(S,{mode:"visible",children:u.children}),(s.mode&1)===0&&(u.lanes=o),u.return=s,u.sibling=null,n!==null&&(o=s.deletions,o===null?(s.deletions=[n],s.flags|=16):o.push(n)),s.child=u,s.memoizedState=null,u}function Rh(n,s){return s=tu({mode:"visible",children:s},n.mode,0,null),s.return=n,n.child=s}function Vc(n,s,o,u){return u!==null&&th(u),Va(s,n.child,null,o),n=Rh(s,s.pendingProps.children),n.flags|=2,s.memoizedState=null,n}function VS(n,s,o,u,p,S,R){if(o)return s.flags&256?(s.flags&=-257,u=Mh(Error(t(422))),Vc(n,s,R,u)):s.memoizedState!==null?(s.child=n.child,s.flags|=128,null):(S=u.fallback,p=s.mode,u=tu({mode:"visible",children:u.children},p,0,null),S=na(S,p,R,null),S.flags|=2,u.return=s,S.return=s,u.sibling=S,s.child=u,(s.mode&1)!==0&&Va(s,n.child,null,R),s.child.memoizedState=Ch(R),s.memoizedState=Th,S);if((s.mode&1)===0)return Vc(n,s,R,null);if(p.data==="$!"){if(u=p.nextSibling&&p.nextSibling.dataset,u)var B=u.dgst;return u=B,S=Error(t(419)),u=Mh(S,u,void 0),Vc(n,s,R,u)}if(B=(R&n.childLanes)!==0,ri||B){if(u=Cn,u!==null){switch(R&-R){case 4:p=2;break;case 16:p=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:p=32;break;case 536870912:p=268435456;break;default:p=0}p=(p&(u.suspendedLanes|R))!==0?0:p,p!==0&&p!==S.retryLane&&(S.retryLane=p,Tr(n,p),Gi(u,n,p,-1))}return jh(),u=Mh(Error(t(421))),Vc(n,s,R,u)}return p.data==="$?"?(s.flags|=128,s.child=n.child,s=tM.bind(null,n),p._reactRetry=s,null):(n=S.treeContext,mi=ns(p.nextSibling),pi=s,tn=!0,zi=null,n!==null&&(bi[Ti++]=wr,bi[Ti++]=br,bi[Ti++]=$s,wr=n.id,br=n.overflow,$s=s),s=Rh(s,u.children),s.flags|=4096,s)}function D0(n,s,o){n.lanes|=s;var u=n.alternate;u!==null&&(u.lanes|=s),sh(n.return,s,o)}function Ah(n,s,o,u,p){var S=n.memoizedState;S===null?n.memoizedState={isBackwards:s,rendering:null,renderingStartTime:0,last:u,tail:o,tailMode:p}:(S.isBackwards=s,S.rendering=null,S.renderingStartTime=0,S.last=u,S.tail=o,S.tailMode=p)}function I0(n,s,o){var u=s.pendingProps,p=u.revealOrder,S=u.tail;if(qn(n,s,u.children,o),u=on.current,(u&2)!==0)u=u&1|2,s.flags|=128;else{if(n!==null&&(n.flags&128)!==0)e:for(n=s.child;n!==null;){if(n.tag===13)n.memoizedState!==null&&D0(n,o,s);else if(n.tag===19)D0(n,o,s);else if(n.child!==null){n.child.return=n,n=n.child;continue}if(n===s)break e;for(;n.sibling===null;){if(n.return===null||n.return===s)break e;n=n.return}n.sibling.return=n.return,n=n.sibling}u&=1}if(Kt(on,u),(s.mode&1)===0)s.memoizedState=null;else switch(p){case"forwards":for(o=s.child,p=null;o!==null;)n=o.alternate,n!==null&&Uc(n)===null&&(p=o),o=o.sibling;o=p,o===null?(p=s.child,s.child=null):(p=o.sibling,o.sibling=null),Ah(s,!1,p,o,S);break;case"backwards":for(o=null,p=s.child,s.child=null;p!==null;){if(n=p.alternate,n!==null&&Uc(n)===null){s.child=p;break}n=p.sibling,p.sibling=o,o=p,p=n}Ah(s,!0,o,null,S);break;case"together":Ah(s,!1,null,null,void 0);break;default:s.memoizedState=null}return s.child}function Gc(n,s){(s.mode&1)===0&&n!==null&&(n.alternate=null,s.alternate=null,s.flags|=2)}function Rr(n,s,o){if(n!==null&&(s.dependencies=n.dependencies),Zs|=s.lanes,(o&s.childLanes)===0)return null;if(n!==null&&s.child!==n.child)throw Error(t(153));if(s.child!==null){for(n=s.child,o=fs(n,n.pendingProps),s.child=o,o.return=s;n.sibling!==null;)n=n.sibling,o=o.sibling=fs(n,n.pendingProps),o.return=s;o.sibling=null}return s.child}function GS(n,s,o){switch(s.tag){case 3:P0(s),Ha();break;case 5:qg(s);break;case 1:ii(s.type)&&bc(s);break;case 4:lh(s,s.stateNode.containerInfo);break;case 10:var u=s.type._context,p=s.memoizedProps.value;Kt(Nc,u._currentValue),u._currentValue=p;break;case 13:if(u=s.memoizedState,u!==null)return u.dehydrated!==null?(Kt(on,on.current&1),s.flags|=128,null):(o&s.child.childLanes)!==0?L0(n,s,o):(Kt(on,on.current&1),n=Rr(n,s,o),n!==null?n.sibling:null);Kt(on,on.current&1);break;case 19:if(u=(o&s.childLanes)!==0,(n.flags&128)!==0){if(u)return I0(n,s,o);s.flags|=128}if(p=s.memoizedState,p!==null&&(p.rendering=null,p.tail=null,p.lastEffect=null),Kt(on,on.current),u)break;return null;case 22:case 23:return s.lanes=0,C0(n,s,o)}return Rr(n,s,o)}var U0,Ph,F0,O0;U0=function(n,s){for(var o=s.child;o!==null;){if(o.tag===5||o.tag===6)n.appendChild(o.stateNode);else if(o.tag!==4&&o.child!==null){o.child.return=o,o=o.child;continue}if(o===s)break;for(;o.sibling===null;){if(o.return===null||o.return===s)return;o=o.return}o.sibling.return=o.return,o=o.sibling}},Ph=function(){},F0=function(n,s,o,u){var p=n.memoizedProps;if(p!==u){n=s.stateNode,Ks(ir.current);var S=null;switch(o){case"input":p=Tt(n,p),u=Tt(n,u),S=[];break;case"select":p=ue({},p,{value:void 0}),u=ue({},u,{value:void 0}),S=[];break;case"textarea":p=Ft(n,p),u=Ft(n,u),S=[];break;default:typeof p.onClick!="function"&&typeof u.onClick=="function"&&(n.onclick=Mc)}Xe(o,u);var R;o=null;for(pe in p)if(!u.hasOwnProperty(pe)&&p.hasOwnProperty(pe)&&p[pe]!=null)if(pe==="style"){var B=p[pe];for(R in B)B.hasOwnProperty(R)&&(o||(o={}),o[R]="")}else pe!=="dangerouslySetInnerHTML"&&pe!=="children"&&pe!=="suppressContentEditableWarning"&&pe!=="suppressHydrationWarning"&&pe!=="autoFocus"&&(a.hasOwnProperty(pe)?S||(S=[]):(S=S||[]).push(pe,null));for(pe in u){var j=u[pe];if(B=p!=null?p[pe]:void 0,u.hasOwnProperty(pe)&&j!==B&&(j!=null||B!=null))if(pe==="style")if(B){for(R in B)!B.hasOwnProperty(R)||j&&j.hasOwnProperty(R)||(o||(o={}),o[R]="");for(R in j)j.hasOwnProperty(R)&&B[R]!==j[R]&&(o||(o={}),o[R]=j[R])}else o||(S||(S=[]),S.push(pe,o)),o=j;else pe==="dangerouslySetInnerHTML"?(j=j?j.__html:void 0,B=B?B.__html:void 0,j!=null&&B!==j&&(S=S||[]).push(pe,j)):pe==="children"?typeof j!="string"&&typeof j!="number"||(S=S||[]).push(pe,""+j):pe!=="suppressContentEditableWarning"&&pe!=="suppressHydrationWarning"&&(a.hasOwnProperty(pe)?(j!=null&&pe==="onScroll"&&Zt("scroll",n),S||B===j||(S=[])):(S=S||[]).push(pe,j))}o&&(S=S||[]).push("style",o);var pe=S;(s.updateQueue=pe)&&(s.flags|=4)}},O0=function(n,s,o,u){o!==u&&(s.flags|=4)};function vl(n,s){if(!tn)switch(n.tailMode){case"hidden":s=n.tail;for(var o=null;s!==null;)s.alternate!==null&&(o=s),s=s.sibling;o===null?n.tail=null:o.sibling=null;break;case"collapsed":o=n.tail;for(var u=null;o!==null;)o.alternate!==null&&(u=o),o=o.sibling;u===null?s||n.tail===null?n.tail=null:n.tail.sibling=null:u.sibling=null}}function Bn(n){var s=n.alternate!==null&&n.alternate.child===n.child,o=0,u=0;if(s)for(var p=n.child;p!==null;)o|=p.lanes|p.childLanes,u|=p.subtreeFlags&14680064,u|=p.flags&14680064,p.return=n,p=p.sibling;else for(p=n.child;p!==null;)o|=p.lanes|p.childLanes,u|=p.subtreeFlags,u|=p.flags,p.return=n,p=p.sibling;return n.subtreeFlags|=u,n.childLanes=o,s}function jS(n,s,o){var u=s.pendingProps;switch(Zd(s),s.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return Bn(s),null;case 1:return ii(s.type)&&wc(),Bn(s),null;case 3:return u=s.stateNode,Wa(),Jt(ni),Jt(kn),dh(),u.pendingContext&&(u.context=u.pendingContext,u.pendingContext=null),(n===null||n.child===null)&&(Ac(s)?s.flags|=4:n===null||n.memoizedState.isDehydrated&&(s.flags&256)===0||(s.flags|=1024,zi!==null&&(Hh(zi),zi=null))),Ph(n,s),Bn(s),null;case 5:ch(s);var p=Ks(fl.current);if(o=s.type,n!==null&&s.stateNode!=null)F0(n,s,o,u,p),n.ref!==s.ref&&(s.flags|=512,s.flags|=2097152);else{if(!u){if(s.stateNode===null)throw Error(t(166));return Bn(s),null}if(n=Ks(ir.current),Ac(s)){u=s.stateNode,o=s.type;var S=s.memoizedProps;switch(u[nr]=s,u[ll]=S,n=(s.mode&1)!==0,o){case"dialog":Zt("cancel",u),Zt("close",u);break;case"iframe":case"object":case"embed":Zt("load",u);break;case"video":case"audio":for(p=0;p<sl.length;p++)Zt(sl[p],u);break;case"source":Zt("error",u);break;case"img":case"image":case"link":Zt("error",u),Zt("load",u);break;case"details":Zt("toggle",u);break;case"input":St(u,S),Zt("invalid",u);break;case"select":u._wrapperState={wasMultiple:!!S.multiple},Zt("invalid",u);break;case"textarea":q(u,S),Zt("invalid",u)}Xe(o,S),p=null;for(var R in S)if(S.hasOwnProperty(R)){var B=S[R];R==="children"?typeof B=="string"?u.textContent!==B&&(S.suppressHydrationWarning!==!0&&Sc(u.textContent,B,n),p=["children",B]):typeof B=="number"&&u.textContent!==""+B&&(S.suppressHydrationWarning!==!0&&Sc(u.textContent,B,n),p=["children",""+B]):a.hasOwnProperty(R)&&B!=null&&R==="onScroll"&&Zt("scroll",u)}switch(o){case"input":nt(u),$t(u,S,!0);break;case"textarea":nt(u),de(u);break;case"select":case"option":break;default:typeof S.onClick=="function"&&(u.onclick=Mc)}u=p,s.updateQueue=u,u!==null&&(s.flags|=4)}else{R=p.nodeType===9?p:p.ownerDocument,n==="http://www.w3.org/1999/xhtml"&&(n=I(o)),n==="http://www.w3.org/1999/xhtml"?o==="script"?(n=R.createElement("div"),n.innerHTML="<script><\/script>",n=n.removeChild(n.firstChild)):typeof u.is=="string"?n=R.createElement(o,{is:u.is}):(n=R.createElement(o),o==="select"&&(R=n,u.multiple?R.multiple=!0:u.size&&(R.size=u.size))):n=R.createElementNS(n,o),n[nr]=s,n[ll]=u,U0(n,s,!1,!1),s.stateNode=n;e:{switch(R=te(o,u),o){case"dialog":Zt("cancel",n),Zt("close",n),p=u;break;case"iframe":case"object":case"embed":Zt("load",n),p=u;break;case"video":case"audio":for(p=0;p<sl.length;p++)Zt(sl[p],n);p=u;break;case"source":Zt("error",n),p=u;break;case"img":case"image":case"link":Zt("error",n),Zt("load",n),p=u;break;case"details":Zt("toggle",n),p=u;break;case"input":St(n,u),p=Tt(n,u),Zt("invalid",n);break;case"option":p=u;break;case"select":n._wrapperState={wasMultiple:!!u.multiple},p=ue({},u,{value:void 0}),Zt("invalid",n);break;case"textarea":q(n,u),p=Ft(n,u),Zt("invalid",n);break;default:p=u}Xe(o,p),B=p;for(S in B)if(B.hasOwnProperty(S)){var j=B[S];S==="style"?_e(n,j):S==="dangerouslySetInnerHTML"?(j=j?j.__html:void 0,j!=null&&re(n,j)):S==="children"?typeof j=="string"?(o!=="textarea"||j!=="")&&ge(n,j):typeof j=="number"&&ge(n,""+j):S!=="suppressContentEditableWarning"&&S!=="suppressHydrationWarning"&&S!=="autoFocus"&&(a.hasOwnProperty(S)?j!=null&&S==="onScroll"&&Zt("scroll",n):j!=null&&P(n,S,j,R))}switch(o){case"input":nt(n),$t(n,u,!1);break;case"textarea":nt(n),de(n);break;case"option":u.value!=null&&n.setAttribute("value",""+ve(u.value));break;case"select":n.multiple=!!u.multiple,S=u.value,S!=null?wt(n,!!u.multiple,S,!1):u.defaultValue!=null&&wt(n,!!u.multiple,u.defaultValue,!0);break;default:typeof p.onClick=="function"&&(n.onclick=Mc)}switch(o){case"button":case"input":case"select":case"textarea":u=!!u.autoFocus;break e;case"img":u=!0;break e;default:u=!1}}u&&(s.flags|=4)}s.ref!==null&&(s.flags|=512,s.flags|=2097152)}return Bn(s),null;case 6:if(n&&s.stateNode!=null)O0(n,s,n.memoizedProps,u);else{if(typeof u!="string"&&s.stateNode===null)throw Error(t(166));if(o=Ks(fl.current),Ks(ir.current),Ac(s)){if(u=s.stateNode,o=s.memoizedProps,u[nr]=s,(S=u.nodeValue!==o)&&(n=pi,n!==null))switch(n.tag){case 3:Sc(u.nodeValue,o,(n.mode&1)!==0);break;case 5:n.memoizedProps.suppressHydrationWarning!==!0&&Sc(u.nodeValue,o,(n.mode&1)!==0)}S&&(s.flags|=4)}else u=(o.nodeType===9?o:o.ownerDocument).createTextNode(u),u[nr]=s,s.stateNode=u}return Bn(s),null;case 13:if(Jt(on),u=s.memoizedState,n===null||n.memoizedState!==null&&n.memoizedState.dehydrated!==null){if(tn&&mi!==null&&(s.mode&1)!==0&&(s.flags&128)===0)Bg(),Ha(),s.flags|=98560,S=!1;else if(S=Ac(s),u!==null&&u.dehydrated!==null){if(n===null){if(!S)throw Error(t(318));if(S=s.memoizedState,S=S!==null?S.dehydrated:null,!S)throw Error(t(317));S[nr]=s}else Ha(),(s.flags&128)===0&&(s.memoizedState=null),s.flags|=4;Bn(s),S=!1}else zi!==null&&(Hh(zi),zi=null),S=!0;if(!S)return s.flags&65536?s:null}return(s.flags&128)!==0?(s.lanes=o,s):(u=u!==null,u!==(n!==null&&n.memoizedState!==null)&&u&&(s.child.flags|=8192,(s.mode&1)!==0&&(n===null||(on.current&1)!==0?yn===0&&(yn=3):jh())),s.updateQueue!==null&&(s.flags|=4),Bn(s),null);case 4:return Wa(),Ph(n,s),n===null&&al(s.stateNode.containerInfo),Bn(s),null;case 10:return rh(s.type._context),Bn(s),null;case 17:return ii(s.type)&&wc(),Bn(s),null;case 19:if(Jt(on),S=s.memoizedState,S===null)return Bn(s),null;if(u=(s.flags&128)!==0,R=S.rendering,R===null)if(u)vl(S,!1);else{if(yn!==0||n!==null&&(n.flags&128)!==0)for(n=s.child;n!==null;){if(R=Uc(n),R!==null){for(s.flags|=128,vl(S,!1),u=R.updateQueue,u!==null&&(s.updateQueue=u,s.flags|=4),s.subtreeFlags=0,u=o,o=s.child;o!==null;)S=o,n=u,S.flags&=14680066,R=S.alternate,R===null?(S.childLanes=0,S.lanes=n,S.child=null,S.subtreeFlags=0,S.memoizedProps=null,S.memoizedState=null,S.updateQueue=null,S.dependencies=null,S.stateNode=null):(S.childLanes=R.childLanes,S.lanes=R.lanes,S.child=R.child,S.subtreeFlags=0,S.deletions=null,S.memoizedProps=R.memoizedProps,S.memoizedState=R.memoizedState,S.updateQueue=R.updateQueue,S.type=R.type,n=R.dependencies,S.dependencies=n===null?null:{lanes:n.lanes,firstContext:n.firstContext}),o=o.sibling;return Kt(on,on.current&1|2),s.child}n=n.sibling}S.tail!==null&&an()>Ya&&(s.flags|=128,u=!0,vl(S,!1),s.lanes=4194304)}else{if(!u)if(n=Uc(R),n!==null){if(s.flags|=128,u=!0,o=n.updateQueue,o!==null&&(s.updateQueue=o,s.flags|=4),vl(S,!0),S.tail===null&&S.tailMode==="hidden"&&!R.alternate&&!tn)return Bn(s),null}else 2*an()-S.renderingStartTime>Ya&&o!==1073741824&&(s.flags|=128,u=!0,vl(S,!1),s.lanes=4194304);S.isBackwards?(R.sibling=s.child,s.child=R):(o=S.last,o!==null?o.sibling=R:s.child=R,S.last=R)}return S.tail!==null?(s=S.tail,S.rendering=s,S.tail=s.sibling,S.renderingStartTime=an(),s.sibling=null,o=on.current,Kt(on,u?o&1|2:o&1),s):(Bn(s),null);case 22:case 23:return Gh(),u=s.memoizedState!==null,n!==null&&n.memoizedState!==null!==u&&(s.flags|=8192),u&&(s.mode&1)!==0?(gi&1073741824)!==0&&(Bn(s),s.subtreeFlags&6&&(s.flags|=8192)):Bn(s),null;case 24:return null;case 25:return null}throw Error(t(156,s.tag))}function WS(n,s){switch(Zd(s),s.tag){case 1:return ii(s.type)&&wc(),n=s.flags,n&65536?(s.flags=n&-65537|128,s):null;case 3:return Wa(),Jt(ni),Jt(kn),dh(),n=s.flags,(n&65536)!==0&&(n&128)===0?(s.flags=n&-65537|128,s):null;case 5:return ch(s),null;case 13:if(Jt(on),n=s.memoizedState,n!==null&&n.dehydrated!==null){if(s.alternate===null)throw Error(t(340));Ha()}return n=s.flags,n&65536?(s.flags=n&-65537|128,s):null;case 19:return Jt(on),null;case 4:return Wa(),null;case 10:return rh(s.type._context),null;case 22:case 23:return Gh(),null;case 24:return null;default:return null}}var jc=!1,Hn=!1,XS=typeof WeakSet=="function"?WeakSet:Set,$e=null;function $a(n,s){var o=n.ref;if(o!==null)if(typeof o=="function")try{o(null)}catch(u){dn(n,s,u)}else o.current=null}function Nh(n,s,o){try{o()}catch(u){dn(n,s,u)}}var k0=!1;function $S(n,s){if(Gd=uc,n=gg(),Ud(n)){if("selectionStart"in n)var o={start:n.selectionStart,end:n.selectionEnd};else e:{o=(o=n.ownerDocument)&&o.defaultView||window;var u=o.getSelection&&o.getSelection();if(u&&u.rangeCount!==0){o=u.anchorNode;var p=u.anchorOffset,S=u.focusNode;u=u.focusOffset;try{o.nodeType,S.nodeType}catch{o=null;break e}var R=0,B=-1,j=-1,pe=0,Te=0,Ce=n,we=null;t:for(;;){for(var je;Ce!==o||p!==0&&Ce.nodeType!==3||(B=R+p),Ce!==S||u!==0&&Ce.nodeType!==3||(j=R+u),Ce.nodeType===3&&(R+=Ce.nodeValue.length),(je=Ce.firstChild)!==null;)we=Ce,Ce=je;for(;;){if(Ce===n)break t;if(we===o&&++pe===p&&(B=R),we===S&&++Te===u&&(j=R),(je=Ce.nextSibling)!==null)break;Ce=we,we=Ce.parentNode}Ce=je}o=B===-1||j===-1?null:{start:B,end:j}}else o=null}o=o||{start:0,end:0}}else o=null;for(jd={focusedElem:n,selectionRange:o},uc=!1,$e=s;$e!==null;)if(s=$e,n=s.child,(s.subtreeFlags&1028)!==0&&n!==null)n.return=s,$e=n;else for(;$e!==null;){s=$e;try{var Ye=s.alternate;if((s.flags&1024)!==0)switch(s.tag){case 0:case 11:case 15:break;case 1:if(Ye!==null){var Ze=Ye.memoizedProps,mn=Ye.memoizedState,ie=s.stateNode,Y=ie.getSnapshotBeforeUpdate(s.elementType===s.type?Ze:Bi(s.type,Ze),mn);ie.__reactInternalSnapshotBeforeUpdate=Y}break;case 3:var le=s.stateNode.containerInfo;le.nodeType===1?le.textContent="":le.nodeType===9&&le.documentElement&&le.removeChild(le.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(t(163))}}catch(Re){dn(s,s.return,Re)}if(n=s.sibling,n!==null){n.return=s.return,$e=n;break}$e=s.return}return Ye=k0,k0=!1,Ye}function _l(n,s,o){var u=s.updateQueue;if(u=u!==null?u.lastEffect:null,u!==null){var p=u=u.next;do{if((p.tag&n)===n){var S=p.destroy;p.destroy=void 0,S!==void 0&&Nh(s,o,S)}p=p.next}while(p!==u)}}function Wc(n,s){if(s=s.updateQueue,s=s!==null?s.lastEffect:null,s!==null){var o=s=s.next;do{if((o.tag&n)===n){var u=o.create;o.destroy=u()}o=o.next}while(o!==s)}}function Lh(n){var s=n.ref;if(s!==null){var o=n.stateNode;switch(n.tag){case 5:n=o;break;default:n=o}typeof s=="function"?s(n):s.current=n}}function z0(n){var s=n.alternate;s!==null&&(n.alternate=null,z0(s)),n.child=null,n.deletions=null,n.sibling=null,n.tag===5&&(s=n.stateNode,s!==null&&(delete s[nr],delete s[ll],delete s[qd],delete s[AS],delete s[PS])),n.stateNode=null,n.return=null,n.dependencies=null,n.memoizedProps=null,n.memoizedState=null,n.pendingProps=null,n.stateNode=null,n.updateQueue=null}function B0(n){return n.tag===5||n.tag===3||n.tag===4}function H0(n){e:for(;;){for(;n.sibling===null;){if(n.return===null||B0(n.return))return null;n=n.return}for(n.sibling.return=n.return,n=n.sibling;n.tag!==5&&n.tag!==6&&n.tag!==18;){if(n.flags&2||n.child===null||n.tag===4)continue e;n.child.return=n,n=n.child}if(!(n.flags&2))return n.stateNode}}function Dh(n,s,o){var u=n.tag;if(u===5||u===6)n=n.stateNode,s?o.nodeType===8?o.parentNode.insertBefore(n,s):o.insertBefore(n,s):(o.nodeType===8?(s=o.parentNode,s.insertBefore(n,o)):(s=o,s.appendChild(n)),o=o._reactRootContainer,o!=null||s.onclick!==null||(s.onclick=Mc));else if(u!==4&&(n=n.child,n!==null))for(Dh(n,s,o),n=n.sibling;n!==null;)Dh(n,s,o),n=n.sibling}function Ih(n,s,o){var u=n.tag;if(u===5||u===6)n=n.stateNode,s?o.insertBefore(n,s):o.appendChild(n);else if(u!==4&&(n=n.child,n!==null))for(Ih(n,s,o),n=n.sibling;n!==null;)Ih(n,s,o),n=n.sibling}var Dn=null,Hi=!1;function ls(n,s,o){for(o=o.child;o!==null;)V0(n,s,o),o=o.sibling}function V0(n,s,o){if(Le&&typeof Le.onCommitFiberUnmount=="function")try{Le.onCommitFiberUnmount(se,o)}catch{}switch(o.tag){case 5:Hn||$a(o,s);case 6:var u=Dn,p=Hi;Dn=null,ls(n,s,o),Dn=u,Hi=p,Dn!==null&&(Hi?(n=Dn,o=o.stateNode,n.nodeType===8?n.parentNode.removeChild(o):n.removeChild(o)):Dn.removeChild(o.stateNode));break;case 18:Dn!==null&&(Hi?(n=Dn,o=o.stateNode,n.nodeType===8?$d(n.parentNode,o):n.nodeType===1&&$d(n,o),Qo(n)):$d(Dn,o.stateNode));break;case 4:u=Dn,p=Hi,Dn=o.stateNode.containerInfo,Hi=!0,ls(n,s,o),Dn=u,Hi=p;break;case 0:case 11:case 14:case 15:if(!Hn&&(u=o.updateQueue,u!==null&&(u=u.lastEffect,u!==null))){p=u=u.next;do{var S=p,R=S.destroy;S=S.tag,R!==void 0&&((S&2)!==0||(S&4)!==0)&&Nh(o,s,R),p=p.next}while(p!==u)}ls(n,s,o);break;case 1:if(!Hn&&($a(o,s),u=o.stateNode,typeof u.componentWillUnmount=="function"))try{u.props=o.memoizedProps,u.state=o.memoizedState,u.componentWillUnmount()}catch(B){dn(o,s,B)}ls(n,s,o);break;case 21:ls(n,s,o);break;case 22:o.mode&1?(Hn=(u=Hn)||o.memoizedState!==null,ls(n,s,o),Hn=u):ls(n,s,o);break;default:ls(n,s,o)}}function G0(n){var s=n.updateQueue;if(s!==null){n.updateQueue=null;var o=n.stateNode;o===null&&(o=n.stateNode=new XS),s.forEach(function(u){var p=nM.bind(null,n,u);o.has(u)||(o.add(u),u.then(p,p))})}}function Vi(n,s){var o=s.deletions;if(o!==null)for(var u=0;u<o.length;u++){var p=o[u];try{var S=n,R=s,B=R;e:for(;B!==null;){switch(B.tag){case 5:Dn=B.stateNode,Hi=!1;break e;case 3:Dn=B.stateNode.containerInfo,Hi=!0;break e;case 4:Dn=B.stateNode.containerInfo,Hi=!0;break e}B=B.return}if(Dn===null)throw Error(t(160));V0(S,R,p),Dn=null,Hi=!1;var j=p.alternate;j!==null&&(j.return=null),p.return=null}catch(pe){dn(p,s,pe)}}if(s.subtreeFlags&12854)for(s=s.child;s!==null;)j0(s,n),s=s.sibling}function j0(n,s){var o=n.alternate,u=n.flags;switch(n.tag){case 0:case 11:case 14:case 15:if(Vi(s,n),sr(n),u&4){try{_l(3,n,n.return),Wc(3,n)}catch(Ze){dn(n,n.return,Ze)}try{_l(5,n,n.return)}catch(Ze){dn(n,n.return,Ze)}}break;case 1:Vi(s,n),sr(n),u&512&&o!==null&&$a(o,o.return);break;case 5:if(Vi(s,n),sr(n),u&512&&o!==null&&$a(o,o.return),n.flags&32){var p=n.stateNode;try{ge(p,"")}catch(Ze){dn(n,n.return,Ze)}}if(u&4&&(p=n.stateNode,p!=null)){var S=n.memoizedProps,R=o!==null?o.memoizedProps:S,B=n.type,j=n.updateQueue;if(n.updateQueue=null,j!==null)try{B==="input"&&S.type==="radio"&&S.name!=null&&vt(p,S),te(B,R);var pe=te(B,S);for(R=0;R<j.length;R+=2){var Te=j[R],Ce=j[R+1];Te==="style"?_e(p,Ce):Te==="dangerouslySetInnerHTML"?re(p,Ce):Te==="children"?ge(p,Ce):P(p,Te,Ce,pe)}switch(B){case"input":Gt(p,S);break;case"textarea":un(p,S);break;case"select":var we=p._wrapperState.wasMultiple;p._wrapperState.wasMultiple=!!S.multiple;var je=S.value;je!=null?wt(p,!!S.multiple,je,!1):we!==!!S.multiple&&(S.defaultValue!=null?wt(p,!!S.multiple,S.defaultValue,!0):wt(p,!!S.multiple,S.multiple?[]:"",!1))}p[ll]=S}catch(Ze){dn(n,n.return,Ze)}}break;case 6:if(Vi(s,n),sr(n),u&4){if(n.stateNode===null)throw Error(t(162));p=n.stateNode,S=n.memoizedProps;try{p.nodeValue=S}catch(Ze){dn(n,n.return,Ze)}}break;case 3:if(Vi(s,n),sr(n),u&4&&o!==null&&o.memoizedState.isDehydrated)try{Qo(s.containerInfo)}catch(Ze){dn(n,n.return,Ze)}break;case 4:Vi(s,n),sr(n);break;case 13:Vi(s,n),sr(n),p=n.child,p.flags&8192&&(S=p.memoizedState!==null,p.stateNode.isHidden=S,!S||p.alternate!==null&&p.alternate.memoizedState!==null||(Oh=an())),u&4&&G0(n);break;case 22:if(Te=o!==null&&o.memoizedState!==null,n.mode&1?(Hn=(pe=Hn)||Te,Vi(s,n),Hn=pe):Vi(s,n),sr(n),u&8192){if(pe=n.memoizedState!==null,(n.stateNode.isHidden=pe)&&!Te&&(n.mode&1)!==0)for($e=n,Te=n.child;Te!==null;){for(Ce=$e=Te;$e!==null;){switch(we=$e,je=we.child,we.tag){case 0:case 11:case 14:case 15:_l(4,we,we.return);break;case 1:$a(we,we.return);var Ye=we.stateNode;if(typeof Ye.componentWillUnmount=="function"){u=we,o=we.return;try{s=u,Ye.props=s.memoizedProps,Ye.state=s.memoizedState,Ye.componentWillUnmount()}catch(Ze){dn(u,o,Ze)}}break;case 5:$a(we,we.return);break;case 22:if(we.memoizedState!==null){$0(Ce);continue}}je!==null?(je.return=we,$e=je):$0(Ce)}Te=Te.sibling}e:for(Te=null,Ce=n;;){if(Ce.tag===5){if(Te===null){Te=Ce;try{p=Ce.stateNode,pe?(S=p.style,typeof S.setProperty=="function"?S.setProperty("display","none","important"):S.display="none"):(B=Ce.stateNode,j=Ce.memoizedProps.style,R=j!=null&&j.hasOwnProperty("display")?j.display:null,B.style.display=xe("display",R))}catch(Ze){dn(n,n.return,Ze)}}}else if(Ce.tag===6){if(Te===null)try{Ce.stateNode.nodeValue=pe?"":Ce.memoizedProps}catch(Ze){dn(n,n.return,Ze)}}else if((Ce.tag!==22&&Ce.tag!==23||Ce.memoizedState===null||Ce===n)&&Ce.child!==null){Ce.child.return=Ce,Ce=Ce.child;continue}if(Ce===n)break e;for(;Ce.sibling===null;){if(Ce.return===null||Ce.return===n)break e;Te===Ce&&(Te=null),Ce=Ce.return}Te===Ce&&(Te=null),Ce.sibling.return=Ce.return,Ce=Ce.sibling}}break;case 19:Vi(s,n),sr(n),u&4&&G0(n);break;case 21:break;default:Vi(s,n),sr(n)}}function sr(n){var s=n.flags;if(s&2){try{e:{for(var o=n.return;o!==null;){if(B0(o)){var u=o;break e}o=o.return}throw Error(t(160))}switch(u.tag){case 5:var p=u.stateNode;u.flags&32&&(ge(p,""),u.flags&=-33);var S=H0(n);Ih(n,S,p);break;case 3:case 4:var R=u.stateNode.containerInfo,B=H0(n);Dh(n,B,R);break;default:throw Error(t(161))}}catch(j){dn(n,n.return,j)}n.flags&=-3}s&4096&&(n.flags&=-4097)}function qS(n,s,o){$e=n,W0(n)}function W0(n,s,o){for(var u=(n.mode&1)!==0;$e!==null;){var p=$e,S=p.child;if(p.tag===22&&u){var R=p.memoizedState!==null||jc;if(!R){var B=p.alternate,j=B!==null&&B.memoizedState!==null||Hn;B=jc;var pe=Hn;if(jc=R,(Hn=j)&&!pe)for($e=p;$e!==null;)R=$e,j=R.child,R.tag===22&&R.memoizedState!==null?q0(p):j!==null?(j.return=R,$e=j):q0(p);for(;S!==null;)$e=S,W0(S),S=S.sibling;$e=p,jc=B,Hn=pe}X0(n)}else(p.subtreeFlags&8772)!==0&&S!==null?(S.return=p,$e=S):X0(n)}}function X0(n){for(;$e!==null;){var s=$e;if((s.flags&8772)!==0){var o=s.alternate;try{if((s.flags&8772)!==0)switch(s.tag){case 0:case 11:case 15:Hn||Wc(5,s);break;case 1:var u=s.stateNode;if(s.flags&4&&!Hn)if(o===null)u.componentDidMount();else{var p=s.elementType===s.type?o.memoizedProps:Bi(s.type,o.memoizedProps);u.componentDidUpdate(p,o.memoizedState,u.__reactInternalSnapshotBeforeUpdate)}var S=s.updateQueue;S!==null&&$g(s,S,u);break;case 3:var R=s.updateQueue;if(R!==null){if(o=null,s.child!==null)switch(s.child.tag){case 5:o=s.child.stateNode;break;case 1:o=s.child.stateNode}$g(s,R,o)}break;case 5:var B=s.stateNode;if(o===null&&s.flags&4){o=B;var j=s.memoizedProps;switch(s.type){case"button":case"input":case"select":case"textarea":j.autoFocus&&o.focus();break;case"img":j.src&&(o.src=j.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(s.memoizedState===null){var pe=s.alternate;if(pe!==null){var Te=pe.memoizedState;if(Te!==null){var Ce=Te.dehydrated;Ce!==null&&Qo(Ce)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(t(163))}Hn||s.flags&512&&Lh(s)}catch(we){dn(s,s.return,we)}}if(s===n){$e=null;break}if(o=s.sibling,o!==null){o.return=s.return,$e=o;break}$e=s.return}}function $0(n){for(;$e!==null;){var s=$e;if(s===n){$e=null;break}var o=s.sibling;if(o!==null){o.return=s.return,$e=o;break}$e=s.return}}function q0(n){for(;$e!==null;){var s=$e;try{switch(s.tag){case 0:case 11:case 15:var o=s.return;try{Wc(4,s)}catch(j){dn(s,o,j)}break;case 1:var u=s.stateNode;if(typeof u.componentDidMount=="function"){var p=s.return;try{u.componentDidMount()}catch(j){dn(s,p,j)}}var S=s.return;try{Lh(s)}catch(j){dn(s,S,j)}break;case 5:var R=s.return;try{Lh(s)}catch(j){dn(s,R,j)}}}catch(j){dn(s,s.return,j)}if(s===n){$e=null;break}var B=s.sibling;if(B!==null){B.return=s.return,$e=B;break}$e=s.return}}var YS=Math.ceil,Xc=C.ReactCurrentDispatcher,Uh=C.ReactCurrentOwner,Ai=C.ReactCurrentBatchConfig,Nt=0,Cn=null,xn=null,In=0,gi=0,qa=is(0),yn=0,yl=null,Zs=0,$c=0,Fh=0,Sl=null,si=null,Oh=0,Ya=1/0,Ar=null,qc=!1,kh=null,cs=null,Yc=!1,us=null,Kc=0,Ml=0,zh=null,Qc=-1,Zc=0;function Yn(){return(Nt&6)!==0?an():Qc!==-1?Qc:Qc=an()}function ds(n){return(n.mode&1)===0?1:(Nt&2)!==0&&In!==0?In&-In:LS.transition!==null?(Zc===0&&(Zc=Ge()),Zc):(n=Mt,n!==0||(n=window.event,n=n===void 0?16:Km(n.type)),n)}function Gi(n,s,o,u){if(50<Ml)throw Ml=0,zh=null,Error(t(185));yt(n,o,u),((Nt&2)===0||n!==Cn)&&(n===Cn&&((Nt&2)===0&&($c|=o),yn===4&&hs(n,In)),ai(n,u),o===1&&Nt===0&&(s.mode&1)===0&&(Ya=an()+500,Tc&&ss()))}function ai(n,s){var o=n.callbackNode;Bt(n,s);var u=Yt(n,n===Cn?In:0);if(u===0)o!==null&&Wo(o),n.callbackNode=null,n.callbackPriority=0;else if(s=u&-u,n.callbackPriority!==s){if(o!=null&&Wo(o),s===1)n.tag===0?NS(K0.bind(null,n)):Ug(K0.bind(null,n)),CS(function(){(Nt&6)===0&&ss()}),o=null;else{switch(Sr(u)){case 1:o=Xo;break;case 4:o=A;break;case 16:o=Q;break;case 536870912:o=ae;break;default:o=Q}o=rx(o,Y0.bind(null,n))}n.callbackPriority=s,n.callbackNode=o}}function Y0(n,s){if(Qc=-1,Zc=0,(Nt&6)!==0)throw Error(t(327));var o=n.callbackNode;if(Ka()&&n.callbackNode!==o)return null;var u=Yt(n,n===Cn?In:0);if(u===0)return null;if((u&30)!==0||(u&n.expiredLanes)!==0||s)s=Jc(n,u);else{s=u;var p=Nt;Nt|=2;var S=Z0();(Cn!==n||In!==s)&&(Ar=null,Ya=an()+500,ea(n,s));do try{ZS();break}catch(B){Q0(n,B)}while(!0);ih(),Xc.current=S,Nt=p,xn!==null?s=0:(Cn=null,In=0,s=yn)}if(s!==0){if(s===2&&(p=gn(n),p!==0&&(u=p,s=Bh(n,p))),s===1)throw o=yl,ea(n,0),hs(n,u),ai(n,an()),o;if(s===6)hs(n,u);else{if(p=n.current.alternate,(u&30)===0&&!KS(p)&&(s=Jc(n,u),s===2&&(S=gn(n),S!==0&&(u=S,s=Bh(n,S))),s===1))throw o=yl,ea(n,0),hs(n,u),ai(n,an()),o;switch(n.finishedWork=p,n.finishedLanes=u,s){case 0:case 1:throw Error(t(345));case 2:ta(n,si,Ar);break;case 3:if(hs(n,u),(u&130023424)===u&&(s=Oh+500-an(),10<s)){if(Yt(n,0)!==0)break;if(p=n.suspendedLanes,(p&u)!==u){Yn(),n.pingedLanes|=n.suspendedLanes&p;break}n.timeoutHandle=Xd(ta.bind(null,n,si,Ar),s);break}ta(n,si,Ar);break;case 4:if(hs(n,u),(u&4194240)===u)break;for(s=n.eventTimes,p=-1;0<u;){var R=31-Ae(u);S=1<<R,R=s[R],R>p&&(p=R),u&=~S}if(u=p,u=an()-u,u=(120>u?120:480>u?480:1080>u?1080:1920>u?1920:3e3>u?3e3:4320>u?4320:1960*YS(u/1960))-u,10<u){n.timeoutHandle=Xd(ta.bind(null,n,si,Ar),u);break}ta(n,si,Ar);break;case 5:ta(n,si,Ar);break;default:throw Error(t(329))}}}return ai(n,an()),n.callbackNode===o?Y0.bind(null,n):null}function Bh(n,s){var o=Sl;return n.current.memoizedState.isDehydrated&&(ea(n,s).flags|=256),n=Jc(n,s),n!==2&&(s=si,si=o,s!==null&&Hh(s)),n}function Hh(n){si===null?si=n:si.push.apply(si,n)}function KS(n){for(var s=n;;){if(s.flags&16384){var o=s.updateQueue;if(o!==null&&(o=o.stores,o!==null))for(var u=0;u<o.length;u++){var p=o[u],S=p.getSnapshot;p=p.value;try{if(!ki(S(),p))return!1}catch{return!1}}}if(o=s.child,s.subtreeFlags&16384&&o!==null)o.return=s,s=o;else{if(s===n)break;for(;s.sibling===null;){if(s.return===null||s.return===n)return!0;s=s.return}s.sibling.return=s.return,s=s.sibling}}return!0}function hs(n,s){for(s&=~Fh,s&=~$c,n.suspendedLanes|=s,n.pingedLanes&=~s,n=n.expirationTimes;0<s;){var o=31-Ae(s),u=1<<o;n[o]=-1,s&=~u}}function K0(n){if((Nt&6)!==0)throw Error(t(327));Ka();var s=Yt(n,0);if((s&1)===0)return ai(n,an()),null;var o=Jc(n,s);if(n.tag!==0&&o===2){var u=gn(n);u!==0&&(s=u,o=Bh(n,u))}if(o===1)throw o=yl,ea(n,0),hs(n,s),ai(n,an()),o;if(o===6)throw Error(t(345));return n.finishedWork=n.current.alternate,n.finishedLanes=s,ta(n,si,Ar),ai(n,an()),null}function Vh(n,s){var o=Nt;Nt|=1;try{return n(s)}finally{Nt=o,Nt===0&&(Ya=an()+500,Tc&&ss())}}function Js(n){us!==null&&us.tag===0&&(Nt&6)===0&&Ka();var s=Nt;Nt|=1;var o=Ai.transition,u=Mt;try{if(Ai.transition=null,Mt=1,n)return n()}finally{Mt=u,Ai.transition=o,Nt=s,(Nt&6)===0&&ss()}}function Gh(){gi=qa.current,Jt(qa)}function ea(n,s){n.finishedWork=null,n.finishedLanes=0;var o=n.timeoutHandle;if(o!==-1&&(n.timeoutHandle=-1,TS(o)),xn!==null)for(o=xn.return;o!==null;){var u=o;switch(Zd(u),u.tag){case 1:u=u.type.childContextTypes,u!=null&&wc();break;case 3:Wa(),Jt(ni),Jt(kn),dh();break;case 5:ch(u);break;case 4:Wa();break;case 13:Jt(on);break;case 19:Jt(on);break;case 10:rh(u.type._context);break;case 22:case 23:Gh()}o=o.return}if(Cn=n,xn=n=fs(n.current,null),In=gi=s,yn=0,yl=null,Fh=$c=Zs=0,si=Sl=null,Ys!==null){for(s=0;s<Ys.length;s++)if(o=Ys[s],u=o.interleaved,u!==null){o.interleaved=null;var p=u.next,S=o.pending;if(S!==null){var R=S.next;S.next=p,u.next=R}o.pending=u}Ys=null}return n}function Q0(n,s){do{var o=xn;try{if(ih(),Fc.current=Bc,Oc){for(var u=ln.memoizedState;u!==null;){var p=u.queue;p!==null&&(p.pending=null),u=u.next}Oc=!1}if(Qs=0,Tn=_n=ln=null,pl=!1,ml=0,Uh.current=null,o===null||o.return===null){yn=1,yl=s,xn=null;break}e:{var S=n,R=o.return,B=o,j=s;if(s=In,B.flags|=32768,j!==null&&typeof j=="object"&&typeof j.then=="function"){var pe=j,Te=B,Ce=Te.tag;if((Te.mode&1)===0&&(Ce===0||Ce===11||Ce===15)){var we=Te.alternate;we?(Te.updateQueue=we.updateQueue,Te.memoizedState=we.memoizedState,Te.lanes=we.lanes):(Te.updateQueue=null,Te.memoizedState=null)}var je=M0(R);if(je!==null){je.flags&=-257,E0(je,R,B,S,s),je.mode&1&&S0(S,pe,s),s=je,j=pe;var Ye=s.updateQueue;if(Ye===null){var Ze=new Set;Ze.add(j),s.updateQueue=Ze}else Ye.add(j);break e}else{if((s&1)===0){S0(S,pe,s),jh();break e}j=Error(t(426))}}else if(tn&&B.mode&1){var mn=M0(R);if(mn!==null){(mn.flags&65536)===0&&(mn.flags|=256),E0(mn,R,B,S,s),th(Xa(j,B));break e}}S=j=Xa(j,B),yn!==4&&(yn=2),Sl===null?Sl=[S]:Sl.push(S),S=R;do{switch(S.tag){case 3:S.flags|=65536,s&=-s,S.lanes|=s;var ie=_0(S,j,s);Xg(S,ie);break e;case 1:B=j;var Y=S.type,le=S.stateNode;if((S.flags&128)===0&&(typeof Y.getDerivedStateFromError=="function"||le!==null&&typeof le.componentDidCatch=="function"&&(cs===null||!cs.has(le)))){S.flags|=65536,s&=-s,S.lanes|=s;var Re=y0(S,B,s);Xg(S,Re);break e}}S=S.return}while(S!==null)}ex(o)}catch(tt){s=tt,xn===o&&o!==null&&(xn=o=o.return);continue}break}while(!0)}function Z0(){var n=Xc.current;return Xc.current=Bc,n===null?Bc:n}function jh(){(yn===0||yn===3||yn===2)&&(yn=4),Cn===null||(Zs&268435455)===0&&($c&268435455)===0||hs(Cn,In)}function Jc(n,s){var o=Nt;Nt|=2;var u=Z0();(Cn!==n||In!==s)&&(Ar=null,ea(n,s));do try{QS();break}catch(p){Q0(n,p)}while(!0);if(ih(),Nt=o,Xc.current=u,xn!==null)throw Error(t(261));return Cn=null,In=0,yn}function QS(){for(;xn!==null;)J0(xn)}function ZS(){for(;xn!==null&&!lc();)J0(xn)}function J0(n){var s=ix(n.alternate,n,gi);n.memoizedProps=n.pendingProps,s===null?ex(n):xn=s,Uh.current=null}function ex(n){var s=n;do{var o=s.alternate;if(n=s.return,(s.flags&32768)===0){if(o=jS(o,s,gi),o!==null){xn=o;return}}else{if(o=WS(o,s),o!==null){o.flags&=32767,xn=o;return}if(n!==null)n.flags|=32768,n.subtreeFlags=0,n.deletions=null;else{yn=6,xn=null;return}}if(s=s.sibling,s!==null){xn=s;return}xn=s=n}while(s!==null);yn===0&&(yn=5)}function ta(n,s,o){var u=Mt,p=Ai.transition;try{Ai.transition=null,Mt=1,JS(n,s,o,u)}finally{Ai.transition=p,Mt=u}return null}function JS(n,s,o,u){do Ka();while(us!==null);if((Nt&6)!==0)throw Error(t(327));o=n.finishedWork;var p=n.finishedLanes;if(o===null)return null;if(n.finishedWork=null,n.finishedLanes=0,o===n.current)throw Error(t(177));n.callbackNode=null,n.callbackPriority=0;var S=o.lanes|o.childLanes;if(ei(n,S),n===Cn&&(xn=Cn=null,In=0),(o.subtreeFlags&2064)===0&&(o.flags&2064)===0||Yc||(Yc=!0,rx(Q,function(){return Ka(),null})),S=(o.flags&15990)!==0,(o.subtreeFlags&15990)!==0||S){S=Ai.transition,Ai.transition=null;var R=Mt;Mt=1;var B=Nt;Nt|=4,Uh.current=null,$S(n,o),j0(o,n),_S(jd),uc=!!Gd,jd=Gd=null,n.current=o,qS(o),Md(),Nt=B,Mt=R,Ai.transition=S}else n.current=o;if(Yc&&(Yc=!1,us=n,Kc=p),S=n.pendingLanes,S===0&&(cs=null),We(o.stateNode),ai(n,an()),s!==null)for(u=n.onRecoverableError,o=0;o<s.length;o++)p=s[o],u(p.value,{componentStack:p.stack,digest:p.digest});if(qc)throw qc=!1,n=kh,kh=null,n;return(Kc&1)!==0&&n.tag!==0&&Ka(),S=n.pendingLanes,(S&1)!==0?n===zh?Ml++:(Ml=0,zh=n):Ml=0,ss(),null}function Ka(){if(us!==null){var n=Sr(Kc),s=Ai.transition,o=Mt;try{if(Ai.transition=null,Mt=16>n?16:n,us===null)var u=!1;else{if(n=us,us=null,Kc=0,(Nt&6)!==0)throw Error(t(331));var p=Nt;for(Nt|=4,$e=n.current;$e!==null;){var S=$e,R=S.child;if(($e.flags&16)!==0){var B=S.deletions;if(B!==null){for(var j=0;j<B.length;j++){var pe=B[j];for($e=pe;$e!==null;){var Te=$e;switch(Te.tag){case 0:case 11:case 15:_l(8,Te,S)}var Ce=Te.child;if(Ce!==null)Ce.return=Te,$e=Ce;else for(;$e!==null;){Te=$e;var we=Te.sibling,je=Te.return;if(z0(Te),Te===pe){$e=null;break}if(we!==null){we.return=je,$e=we;break}$e=je}}}var Ye=S.alternate;if(Ye!==null){var Ze=Ye.child;if(Ze!==null){Ye.child=null;do{var mn=Ze.sibling;Ze.sibling=null,Ze=mn}while(Ze!==null)}}$e=S}}if((S.subtreeFlags&2064)!==0&&R!==null)R.return=S,$e=R;else e:for(;$e!==null;){if(S=$e,(S.flags&2048)!==0)switch(S.tag){case 0:case 11:case 15:_l(9,S,S.return)}var ie=S.sibling;if(ie!==null){ie.return=S.return,$e=ie;break e}$e=S.return}}var Y=n.current;for($e=Y;$e!==null;){R=$e;var le=R.child;if((R.subtreeFlags&2064)!==0&&le!==null)le.return=R,$e=le;else e:for(R=Y;$e!==null;){if(B=$e,(B.flags&2048)!==0)try{switch(B.tag){case 0:case 11:case 15:Wc(9,B)}}catch(tt){dn(B,B.return,tt)}if(B===R){$e=null;break e}var Re=B.sibling;if(Re!==null){Re.return=B.return,$e=Re;break e}$e=B.return}}if(Nt=p,ss(),Le&&typeof Le.onPostCommitFiberRoot=="function")try{Le.onPostCommitFiberRoot(se,n)}catch{}u=!0}return u}finally{Mt=o,Ai.transition=s}}return!1}function tx(n,s,o){s=Xa(o,s),s=_0(n,s,1),n=os(n,s,1),s=Yn(),n!==null&&(yt(n,1,s),ai(n,s))}function dn(n,s,o){if(n.tag===3)tx(n,n,o);else for(;s!==null;){if(s.tag===3){tx(s,n,o);break}else if(s.tag===1){var u=s.stateNode;if(typeof s.type.getDerivedStateFromError=="function"||typeof u.componentDidCatch=="function"&&(cs===null||!cs.has(u))){n=Xa(o,n),n=y0(s,n,1),s=os(s,n,1),n=Yn(),s!==null&&(yt(s,1,n),ai(s,n));break}}s=s.return}}function eM(n,s,o){var u=n.pingCache;u!==null&&u.delete(s),s=Yn(),n.pingedLanes|=n.suspendedLanes&o,Cn===n&&(In&o)===o&&(yn===4||yn===3&&(In&130023424)===In&&500>an()-Oh?ea(n,0):Fh|=o),ai(n,s)}function nx(n,s){s===0&&((n.mode&1)===0?s=1:(s=et,et<<=1,(et&130023424)===0&&(et=4194304)));var o=Yn();n=Tr(n,s),n!==null&&(yt(n,s,o),ai(n,o))}function tM(n){var s=n.memoizedState,o=0;s!==null&&(o=s.retryLane),nx(n,o)}function nM(n,s){var o=0;switch(n.tag){case 13:var u=n.stateNode,p=n.memoizedState;p!==null&&(o=p.retryLane);break;case 19:u=n.stateNode;break;default:throw Error(t(314))}u!==null&&u.delete(s),nx(n,o)}var ix;ix=function(n,s,o){if(n!==null)if(n.memoizedProps!==s.pendingProps||ni.current)ri=!0;else{if((n.lanes&o)===0&&(s.flags&128)===0)return ri=!1,GS(n,s,o);ri=(n.flags&131072)!==0}else ri=!1,tn&&(s.flags&1048576)!==0&&Fg(s,Rc,s.index);switch(s.lanes=0,s.tag){case 2:var u=s.type;Gc(n,s),n=s.pendingProps;var p=ka(s,kn.current);ja(s,o),p=ph(null,s,u,n,p,o);var S=mh();return s.flags|=1,typeof p=="object"&&p!==null&&typeof p.render=="function"&&p.$$typeof===void 0?(s.tag=1,s.memoizedState=null,s.updateQueue=null,ii(u)?(S=!0,bc(s)):S=!1,s.memoizedState=p.state!==null&&p.state!==void 0?p.state:null,oh(s),p.updater=Hc,s.stateNode=p,p._reactInternals=s,Sh(s,u,n,o),s=bh(null,s,u,!0,S,o)):(s.tag=0,tn&&S&&Qd(s),qn(null,s,p,o),s=s.child),s;case 16:u=s.elementType;e:{switch(Gc(n,s),n=s.pendingProps,p=u._init,u=p(u._payload),s.type=u,p=s.tag=rM(u),n=Bi(u,n),p){case 0:s=wh(null,s,u,n,o);break e;case 1:s=A0(null,s,u,n,o);break e;case 11:s=w0(null,s,u,n,o);break e;case 14:s=b0(null,s,u,Bi(u.type,n),o);break e}throw Error(t(306,u,""))}return s;case 0:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:Bi(u,p),wh(n,s,u,p,o);case 1:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:Bi(u,p),A0(n,s,u,p,o);case 3:e:{if(P0(s),n===null)throw Error(t(387));u=s.pendingProps,S=s.memoizedState,p=S.element,Wg(n,s),Ic(s,u,null,o);var R=s.memoizedState;if(u=R.element,S.isDehydrated)if(S={element:u,isDehydrated:!1,cache:R.cache,pendingSuspenseBoundaries:R.pendingSuspenseBoundaries,transitions:R.transitions},s.updateQueue.baseState=S,s.memoizedState=S,s.flags&256){p=Xa(Error(t(423)),s),s=N0(n,s,u,o,p);break e}else if(u!==p){p=Xa(Error(t(424)),s),s=N0(n,s,u,o,p);break e}else for(mi=ns(s.stateNode.containerInfo.firstChild),pi=s,tn=!0,zi=null,o=Gg(s,null,u,o),s.child=o;o;)o.flags=o.flags&-3|4096,o=o.sibling;else{if(Ha(),u===p){s=Rr(n,s,o);break e}qn(n,s,u,o)}s=s.child}return s;case 5:return qg(s),n===null&&eh(s),u=s.type,p=s.pendingProps,S=n!==null?n.memoizedProps:null,R=p.children,Wd(u,p)?R=null:S!==null&&Wd(u,S)&&(s.flags|=32),R0(n,s),qn(n,s,R,o),s.child;case 6:return n===null&&eh(s),null;case 13:return L0(n,s,o);case 4:return lh(s,s.stateNode.containerInfo),u=s.pendingProps,n===null?s.child=Va(s,null,u,o):qn(n,s,u,o),s.child;case 11:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:Bi(u,p),w0(n,s,u,p,o);case 7:return qn(n,s,s.pendingProps,o),s.child;case 8:return qn(n,s,s.pendingProps.children,o),s.child;case 12:return qn(n,s,s.pendingProps.children,o),s.child;case 10:e:{if(u=s.type._context,p=s.pendingProps,S=s.memoizedProps,R=p.value,Kt(Nc,u._currentValue),u._currentValue=R,S!==null)if(ki(S.value,R)){if(S.children===p.children&&!ni.current){s=Rr(n,s,o);break e}}else for(S=s.child,S!==null&&(S.return=s);S!==null;){var B=S.dependencies;if(B!==null){R=S.child;for(var j=B.firstContext;j!==null;){if(j.context===u){if(S.tag===1){j=Cr(-1,o&-o),j.tag=2;var pe=S.updateQueue;if(pe!==null){pe=pe.shared;var Te=pe.pending;Te===null?j.next=j:(j.next=Te.next,Te.next=j),pe.pending=j}}S.lanes|=o,j=S.alternate,j!==null&&(j.lanes|=o),sh(S.return,o,s),B.lanes|=o;break}j=j.next}}else if(S.tag===10)R=S.type===s.type?null:S.child;else if(S.tag===18){if(R=S.return,R===null)throw Error(t(341));R.lanes|=o,B=R.alternate,B!==null&&(B.lanes|=o),sh(R,o,s),R=S.sibling}else R=S.child;if(R!==null)R.return=S;else for(R=S;R!==null;){if(R===s){R=null;break}if(S=R.sibling,S!==null){S.return=R.return,R=S;break}R=R.return}S=R}qn(n,s,p.children,o),s=s.child}return s;case 9:return p=s.type,u=s.pendingProps.children,ja(s,o),p=Ci(p),u=u(p),s.flags|=1,qn(n,s,u,o),s.child;case 14:return u=s.type,p=Bi(u,s.pendingProps),p=Bi(u.type,p),b0(n,s,u,p,o);case 15:return T0(n,s,s.type,s.pendingProps,o);case 17:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:Bi(u,p),Gc(n,s),s.tag=1,ii(u)?(n=!0,bc(s)):n=!1,ja(s,o),x0(s,u,p),Sh(s,u,p,o),bh(null,s,u,!0,n,o);case 19:return I0(n,s,o);case 22:return C0(n,s,o)}throw Error(t(156,s.tag))};function rx(n,s){return Gs(n,s)}function iM(n,s,o,u){this.tag=n,this.key=o,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=s,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=u,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Pi(n,s,o,u){return new iM(n,s,o,u)}function Wh(n){return n=n.prototype,!(!n||!n.isReactComponent)}function rM(n){if(typeof n=="function")return Wh(n)?1:0;if(n!=null){if(n=n.$$typeof,n===K)return 11;if(n===k)return 14}return 2}function fs(n,s){var o=n.alternate;return o===null?(o=Pi(n.tag,s,n.key,n.mode),o.elementType=n.elementType,o.type=n.type,o.stateNode=n.stateNode,o.alternate=n,n.alternate=o):(o.pendingProps=s,o.type=n.type,o.flags=0,o.subtreeFlags=0,o.deletions=null),o.flags=n.flags&14680064,o.childLanes=n.childLanes,o.lanes=n.lanes,o.child=n.child,o.memoizedProps=n.memoizedProps,o.memoizedState=n.memoizedState,o.updateQueue=n.updateQueue,s=n.dependencies,o.dependencies=s===null?null:{lanes:s.lanes,firstContext:s.firstContext},o.sibling=n.sibling,o.index=n.index,o.ref=n.ref,o}function eu(n,s,o,u,p,S){var R=2;if(u=n,typeof n=="function")Wh(n)&&(R=1);else if(typeof n=="string")R=5;else e:switch(n){case O:return na(o.children,p,S,s);case b:R=8,p|=8;break;case U:return n=Pi(12,o,s,p|2),n.elementType=U,n.lanes=S,n;case ne:return n=Pi(13,o,s,p),n.elementType=ne,n.lanes=S,n;case me:return n=Pi(19,o,s,p),n.elementType=me,n.lanes=S,n;case J:return tu(o,p,S,s);default:if(typeof n=="object"&&n!==null)switch(n.$$typeof){case G:R=10;break e;case D:R=9;break e;case K:R=11;break e;case k:R=14;break e;case he:R=16,u=null;break e}throw Error(t(130,n==null?n:typeof n,""))}return s=Pi(R,o,s,p),s.elementType=n,s.type=u,s.lanes=S,s}function na(n,s,o,u){return n=Pi(7,n,u,s),n.lanes=o,n}function tu(n,s,o,u){return n=Pi(22,n,u,s),n.elementType=J,n.lanes=o,n.stateNode={isHidden:!1},n}function Xh(n,s,o){return n=Pi(6,n,null,s),n.lanes=o,n}function $h(n,s,o){return s=Pi(4,n.children!==null?n.children:[],n.key,s),s.lanes=o,s.stateNode={containerInfo:n.containerInfo,pendingChildren:null,implementation:n.implementation},s}function sM(n,s,o,u,p){this.tag=s,this.containerInfo=n,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=Ln(0),this.expirationTimes=Ln(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Ln(0),this.identifierPrefix=u,this.onRecoverableError=p,this.mutableSourceEagerHydrationData=null}function qh(n,s,o,u,p,S,R,B,j){return n=new sM(n,s,o,B,j),s===1?(s=1,S===!0&&(s|=8)):s=0,S=Pi(3,null,null,s),n.current=S,S.stateNode=n,S.memoizedState={element:u,isDehydrated:o,cache:null,transitions:null,pendingSuspenseBoundaries:null},oh(S),n}function aM(n,s,o){var u=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:N,key:u==null?null:""+u,children:n,containerInfo:s,implementation:o}}function sx(n){if(!n)return rs;n=n._reactInternals;e:{if($n(n)!==n||n.tag!==1)throw Error(t(170));var s=n;do{switch(s.tag){case 3:s=s.stateNode.context;break e;case 1:if(ii(s.type)){s=s.stateNode.__reactInternalMemoizedMergedChildContext;break e}}s=s.return}while(s!==null);throw Error(t(171))}if(n.tag===1){var o=n.type;if(ii(o))return Dg(n,o,s)}return s}function ax(n,s,o,u,p,S,R,B,j){return n=qh(o,u,!0,n,p,S,R,B,j),n.context=sx(null),o=n.current,u=Yn(),p=ds(o),S=Cr(u,p),S.callback=s??null,os(o,S,p),n.current.lanes=p,yt(n,p,u),ai(n,u),n}function nu(n,s,o,u){var p=s.current,S=Yn(),R=ds(p);return o=sx(o),s.context===null?s.context=o:s.pendingContext=o,s=Cr(S,R),s.payload={element:n},u=u===void 0?null:u,u!==null&&(s.callback=u),n=os(p,s,R),n!==null&&(Gi(n,p,R,S),Dc(n,p,R)),R}function iu(n){if(n=n.current,!n.child)return null;switch(n.child.tag){case 5:return n.child.stateNode;default:return n.child.stateNode}}function ox(n,s){if(n=n.memoizedState,n!==null&&n.dehydrated!==null){var o=n.retryLane;n.retryLane=o!==0&&o<s?o:s}}function Yh(n,s){ox(n,s),(n=n.alternate)&&ox(n,s)}function oM(){return null}var lx=typeof reportError=="function"?reportError:function(n){console.error(n)};function Kh(n){this._internalRoot=n}ru.prototype.render=Kh.prototype.render=function(n){var s=this._internalRoot;if(s===null)throw Error(t(409));nu(n,s,null,null)},ru.prototype.unmount=Kh.prototype.unmount=function(){var n=this._internalRoot;if(n!==null){this._internalRoot=null;var s=n.containerInfo;Js(function(){nu(null,n,null,null)}),s[Mr]=null}};function ru(n){this._internalRoot=n}ru.prototype.unstable_scheduleHydration=function(n){if(n){var s=Ht();n={blockedOn:null,target:n,priority:s};for(var o=0;o<Jr.length&&s!==0&&s<Jr[o].priority;o++);Jr.splice(o,0,n),o===0&&qm(n)}};function Qh(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11)}function su(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11&&(n.nodeType!==8||n.nodeValue!==" react-mount-point-unstable "))}function cx(){}function lM(n,s,o,u,p){if(p){if(typeof u=="function"){var S=u;u=function(){var pe=iu(R);S.call(pe)}}var R=ax(s,u,n,0,null,!1,!1,"",cx);return n._reactRootContainer=R,n[Mr]=R.current,al(n.nodeType===8?n.parentNode:n),Js(),R}for(;p=n.lastChild;)n.removeChild(p);if(typeof u=="function"){var B=u;u=function(){var pe=iu(j);B.call(pe)}}var j=qh(n,0,!1,null,null,!1,!1,"",cx);return n._reactRootContainer=j,n[Mr]=j.current,al(n.nodeType===8?n.parentNode:n),Js(function(){nu(s,j,o,u)}),j}function au(n,s,o,u,p){var S=o._reactRootContainer;if(S){var R=S;if(typeof p=="function"){var B=p;p=function(){var j=iu(R);B.call(j)}}nu(s,R,n,p)}else R=lM(o,s,n,p,u);return iu(R)}kt=function(n){switch(n.tag){case 3:var s=n.stateNode;if(s.current.memoizedState.isDehydrated){var o=At(s.pendingLanes);o!==0&&(ti(s,o|1),ai(s,an()),(Nt&6)===0&&(Ya=an()+500,ss()))}break;case 13:Js(function(){var u=Tr(n,1);if(u!==null){var p=Yn();Gi(u,n,1,p)}}),Yh(n,1)}},Qt=function(n){if(n.tag===13){var s=Tr(n,134217728);if(s!==null){var o=Yn();Gi(s,n,134217728,o)}Yh(n,134217728)}},Fi=function(n){if(n.tag===13){var s=ds(n),o=Tr(n,s);if(o!==null){var u=Yn();Gi(o,n,s,u)}Yh(n,s)}},Ht=function(){return Mt},Oi=function(n,s){var o=Mt;try{return Mt=n,s()}finally{Mt=o}},it=function(n,s,o){switch(s){case"input":if(Gt(n,o),s=o.name,o.type==="radio"&&s!=null){for(o=n;o.parentNode;)o=o.parentNode;for(o=o.querySelectorAll("input[name="+JSON.stringify(""+s)+'][type="radio"]'),s=0;s<o.length;s++){var u=o[s];if(u!==n&&u.form===n.form){var p=Ec(u);if(!p)throw Error(t(90));Ut(u),Gt(u,p)}}}break;case"textarea":un(n,o);break;case"select":s=o.value,s!=null&&wt(n,!!o.multiple,s,!1)}},Fe=Vh,Ee=Js;var cM={usingClientEntryPoint:!1,Events:[cl,Fa,Ec,ye,De,Vh]},El={findFiberByHostInstance:Ws,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},uM={bundleType:El.bundleType,version:El.version,rendererPackageName:El.rendererPackageName,rendererConfig:El.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:C.ReactCurrentDispatcher,findHostInstanceByFiber:function(n){return n=Vs(n),n===null?null:n.stateNode},findFiberByHostInstance:El.findFiberByHostInstance||oM,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var ou=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!ou.isDisabled&&ou.supportsFiber)try{se=ou.inject(uM),Le=ou}catch{}}return oi.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=cM,oi.createPortal=function(n,s){var o=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!Qh(s))throw Error(t(200));return aM(n,s,null,o)},oi.createRoot=function(n,s){if(!Qh(n))throw Error(t(299));var o=!1,u="",p=lx;return s!=null&&(s.unstable_strictMode===!0&&(o=!0),s.identifierPrefix!==void 0&&(u=s.identifierPrefix),s.onRecoverableError!==void 0&&(p=s.onRecoverableError)),s=qh(n,1,!1,null,null,o,!1,u,p),n[Mr]=s.current,al(n.nodeType===8?n.parentNode:n),new Kh(s)},oi.findDOMNode=function(n){if(n==null)return null;if(n.nodeType===1)return n;var s=n._reactInternals;if(s===void 0)throw typeof n.render=="function"?Error(t(188)):(n=Object.keys(n).join(","),Error(t(268,n)));return n=Vs(s),n=n===null?null:n.stateNode,n},oi.flushSync=function(n){return Js(n)},oi.hydrate=function(n,s,o){if(!su(s))throw Error(t(200));return au(null,n,s,!0,o)},oi.hydrateRoot=function(n,s,o){if(!Qh(n))throw Error(t(405));var u=o!=null&&o.hydratedSources||null,p=!1,S="",R=lx;if(o!=null&&(o.unstable_strictMode===!0&&(p=!0),o.identifierPrefix!==void 0&&(S=o.identifierPrefix),o.onRecoverableError!==void 0&&(R=o.onRecoverableError)),s=ax(s,null,n,1,o??null,p,!1,S,R),n[Mr]=s.current,al(n),u)for(n=0;n<u.length;n++)o=u[n],p=o._getVersion,p=p(o._source),s.mutableSourceEagerHydrationData==null?s.mutableSourceEagerHydrationData=[o,p]:s.mutableSourceEagerHydrationData.push(o,p);return new ru(s)},oi.render=function(n,s,o){if(!su(s))throw Error(t(200));return au(null,n,s,!1,o)},oi.unmountComponentAtNode=function(n){if(!su(n))throw Error(t(40));return n._reactRootContainer?(Js(function(){au(null,null,n,!1,function(){n._reactRootContainer=null,n[Mr]=null})}),!0):!1},oi.unstable_batchedUpdates=Vh,oi.unstable_renderSubtreeIntoContainer=function(n,s,o,u){if(!su(o))throw Error(t(200));if(n==null||n._reactInternals===void 0)throw Error(t(38));return au(n,s,o,!1,u)},oi.version="18.3.1-next-f1338f8080-20240426",oi}var vx;function yM(){if(vx)return tf.exports;vx=1;function i(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(i)}catch(e){console.error(e)}}return i(),tf.exports=_M(),tf.exports}var _x;function SM(){if(_x)return cu;_x=1;var i=yM();return cu.createRoot=i.createRoot,cu.hydrateRoot=i.hydrateRoot,cu}var MM=SM(),Oo=class{constructor(){this.listeners=new Set,this.subscribe=this.subscribe.bind(this)}subscribe(i){return this.listeners.add(i),this.onSubscribe(),()=>{this.listeners.delete(i),this.onUnsubscribe()}}hasListeners(){return this.listeners.size>0}onSubscribe(){}onUnsubscribe(){}},fa,bs,yo,i_,EM=(i_=class extends Oo{constructor(){super();st(this,fa);st(this,bs);st(this,yo);Be(this,yo,e=>{if(typeof window<"u"&&window.addEventListener){const t=()=>e();return window.addEventListener("visibilitychange",t,!1),()=>{window.removeEventListener("visibilitychange",t)}}})}onSubscribe(){V(this,bs)||this.setEventListener(V(this,yo))}onUnsubscribe(){var e;this.hasListeners()||((e=V(this,bs))==null||e.call(this),Be(this,bs,void 0))}setEventListener(e){var t;Be(this,yo,e),(t=V(this,bs))==null||t.call(this),Be(this,bs,e(r=>{typeof r=="boolean"?this.setFocused(r):this.onFocus()}))}setFocused(e){V(this,fa)!==e&&(Be(this,fa,e),this.onFocus())}onFocus(){const e=this.isFocused();this.listeners.forEach(t=>{t(e)})}isFocused(){var e;return typeof V(this,fa)=="boolean"?V(this,fa):((e=globalThis.document)==null?void 0:e.visibilityState)!=="hidden"}},fa=new WeakMap,bs=new WeakMap,yo=new WeakMap,i_),om=new EM,wM={setTimeout:(i,e)=>setTimeout(i,e),clearTimeout:i=>clearTimeout(i),setInterval:(i,e)=>setInterval(i,e),clearInterval:i=>clearInterval(i)},Ts,sm,r_,bM=(r_=class{constructor(){st(this,Ts,wM);st(this,sm,!1)}setTimeoutProvider(i){Be(this,Ts,i)}setTimeout(i,e){return V(this,Ts).setTimeout(i,e)}clearTimeout(i){V(this,Ts).clearTimeout(i)}setInterval(i,e){return V(this,Ts).setInterval(i,e)}clearInterval(i){V(this,Ts).clearInterval(i)}},Ts=new WeakMap,sm=new WeakMap,r_),ua=new bM;function TM(i){setTimeout(i,0)}var CM=typeof window>"u"||"Deno"in globalThis;function Zn(){}function RM(i,e){return typeof i=="function"?i(e):i}function Kf(i){return typeof i=="number"&&i>=0&&i!==1/0}function p_(i,e){return Math.max(i+(e||0)-Date.now(),0)}function Us(i,e){return typeof i=="function"?i(e):i}function yi(i,e){return typeof i=="function"?i(e):i}function yx(i,e){const{type:t="all",exact:r,fetchStatus:a,predicate:l,queryKey:c,stale:d}=i;if(c){if(r){if(e.queryHash!==lm(c,e.options))return!1}else if(!Bl(e.queryKey,c))return!1}if(t!=="all"){const h=e.isActive();if(t==="active"&&!h||t==="inactive"&&h)return!1}return!(typeof d=="boolean"&&e.isStale()!==d||a&&a!==e.state.fetchStatus||l&&!l(e))}function Sx(i,e){const{exact:t,status:r,predicate:a,mutationKey:l}=i;if(l){if(!e.options.mutationKey)return!1;if(t){if(Ma(e.options.mutationKey)!==Ma(l))return!1}else if(!Bl(e.options.mutationKey,l))return!1}return!(r&&e.state.status!==r||a&&!a(e))}function lm(i,e){return((e==null?void 0:e.queryKeyHashFn)||Ma)(i)}function Ma(i){return JSON.stringify(i,(e,t)=>Qf(t)?Object.keys(t).sort().reduce((r,a)=>(r[a]=t[a],r),{}):t)}function Bl(i,e){return i===e?!0:typeof i!=typeof e?!1:i&&e&&typeof i=="object"&&typeof e=="object"?Object.keys(e).every(t=>Bl(i[t],e[t])):!1}var AM=Object.prototype.hasOwnProperty;function m_(i,e,t=0){if(i===e)return i;if(t>500)return e;const r=Mx(i)&&Mx(e);if(!r&&!(Qf(i)&&Qf(e)))return e;const l=(r?i:Object.keys(i)).length,c=r?e:Object.keys(e),d=c.length,h=r?new Array(d):{};let f=0;for(let m=0;m<d;m++){const g=r?m:c[m],x=i[g],M=e[g];if(x===M){h[g]=x,(r?m<l:AM.call(i,g))&&f++;continue}if(x===null||M===null||typeof x!="object"||typeof M!="object"){h[g]=M;continue}const E=m_(x,M,t+1);h[g]=E,E===x&&f++}return l===d&&f===l?i:h}function Ju(i,e){if(!e||Object.keys(i).length!==Object.keys(e).length)return!1;for(const t in i)if(i[t]!==e[t])return!1;return!0}function Mx(i){return Array.isArray(i)&&i.length===Object.keys(i).length}function Qf(i){if(!Ex(i))return!1;const e=i.constructor;if(e===void 0)return!0;const t=e.prototype;return!(!Ex(t)||!t.hasOwnProperty("isPrototypeOf")||Object.getPrototypeOf(i)!==Object.prototype)}function Ex(i){return Object.prototype.toString.call(i)==="[object Object]"}function PM(i){return new Promise(e=>{ua.setTimeout(e,i)})}function Zf(i,e,t){return typeof t.structuralSharing=="function"?t.structuralSharing(i,e):t.structuralSharing!==!1?m_(i,e):e}function NM(i,e,t=0){const r=[...i,e];return t&&r.length>t?r.slice(1):r}function LM(i,e,t=0){const r=[e,...i];return t&&r.length>t?r.slice(0,-1):r}var cm=Symbol();function g_(i,e){return!i.queryFn&&(e!=null&&e.initialPromise)?()=>e.initialPromise:!i.queryFn||i.queryFn===cm?()=>Promise.reject(new Error(`Missing queryFn: '${i.queryHash}'`)):i.queryFn}function um(i,e){return typeof i=="function"?i(...e):!!i}function DM(i,e,t){let r=!1,a;return Object.defineProperty(i,"signal",{enumerable:!0,get:()=>(a??(a=e()),r||(r=!0,a.aborted?t():a.addEventListener("abort",t,{once:!0})),a)}),i}var Hl=(()=>{let i=()=>CM;return{isServer(){return i()},setIsServer(e){i=e}}})();function Jf(){let i,e;const t=new Promise((a,l)=>{i=a,e=l});t.status="pending",t.catch(()=>{});function r(a){Object.assign(t,a),delete t.resolve,delete t.reject}return t.resolve=a=>{r({status:"fulfilled",value:a}),i(a)},t.reject=a=>{r({status:"rejected",reason:a}),e(a)},t}var IM=TM;function UM(){let i=[],e=0,t=d=>{d()},r=d=>{d()},a=IM;const l=d=>{e?i.push(d):a(()=>{t(d)})},c=()=>{const d=i;i=[],d.length&&a(()=>{r(()=>{d.forEach(h=>{t(h)})})})};return{batch:d=>{let h;e++;try{h=d()}finally{e--,e||c()}return h},batchCalls:d=>(...h)=>{l(()=>{d(...h)})},schedule:l,setNotifyFunction:d=>{t=d},setBatchNotifyFunction:d=>{r=d},setScheduler:d=>{a=d}}}var Mn=UM(),So,Cs,Mo,s_,FM=(s_=class extends Oo{constructor(){super();st(this,So,!0);st(this,Cs);st(this,Mo);Be(this,Mo,e=>{if(typeof window<"u"&&window.addEventListener){const t=()=>e(!0),r=()=>e(!1);return window.addEventListener("online",t,!1),window.addEventListener("offline",r,!1),()=>{window.removeEventListener("online",t),window.removeEventListener("offline",r)}}})}onSubscribe(){V(this,Cs)||this.setEventListener(V(this,Mo))}onUnsubscribe(){var e;this.hasListeners()||((e=V(this,Cs))==null||e.call(this),Be(this,Cs,void 0))}setEventListener(e){var t;Be(this,Mo,e),(t=V(this,Cs))==null||t.call(this),Be(this,Cs,e(this.setOnline.bind(this)))}setOnline(e){V(this,So)!==e&&(Be(this,So,e),this.listeners.forEach(r=>{r(e)}))}isOnline(){return V(this,So)}},So=new WeakMap,Cs=new WeakMap,Mo=new WeakMap,s_),ed=new FM;function OM(i){return Math.min(1e3*2**i,3e4)}function x_(i){return(i??"online")==="online"?ed.isOnline():!0}var ep=class extends Error{constructor(i){super("CancelledError"),this.revert=i==null?void 0:i.revert,this.silent=i==null?void 0:i.silent}};function v_(i){let e=!1,t=0,r;const a=Jf(),l=()=>a.status!=="pending",c=w=>{var _;if(!l()){const y=new ep(w);x(y),(_=i.onCancel)==null||_.call(i,y)}},d=()=>{e=!0},h=()=>{e=!1},f=()=>om.isFocused()&&(i.networkMode==="always"||ed.isOnline())&&i.canRun(),m=()=>x_(i.networkMode)&&i.canRun(),g=w=>{l()||(r==null||r(),a.resolve(w))},x=w=>{l()||(r==null||r(),a.reject(w))},M=()=>new Promise(w=>{var _;r=y=>{(l()||f())&&w(y)},(_=i.onPause)==null||_.call(i)}).then(()=>{var w;r=void 0,l()||(w=i.onContinue)==null||w.call(i)}),E=()=>{if(l())return;let w;const _=t===0?i.initialPromise:void 0;try{w=_??i.fn()}catch(y){w=Promise.reject(y)}Promise.resolve(w).then(g).catch(y=>{var N;if(l())return;const L=i.retry??(Hl.isServer()?0:3),P=i.retryDelay??OM,C=typeof P=="function"?P(t,y):P,F=L===!0||typeof L=="number"&&t<L||typeof L=="function"&&L(t,y);if(e||!F){x(y);return}t++,(N=i.onFail)==null||N.call(i,t,y),PM(C).then(()=>f()?void 0:M()).then(()=>{e?x(y):E()})})};return{promise:a,status:()=>a.status,cancel:c,continue:()=>(r==null||r(),a),cancelRetry:d,continueRetry:h,canStart:m,start:()=>(m()?E():M().then(E),a)}}var pa,a_,__=(a_=class{constructor(){st(this,pa)}destroy(){this.clearGcTimeout()}scheduleGc(){this.clearGcTimeout(),Kf(this.gcTime)&&Be(this,pa,ua.setTimeout(()=>{this.optionalRemove()},this.gcTime))}updateGcTime(i){this.gcTime=Math.max(this.gcTime||0,i??(Hl.isServer()?1/0:300*1e3))}clearGcTimeout(){V(this,pa)!==void 0&&(ua.clearTimeout(V(this,pa)),Be(this,pa,void 0))}},pa=new WeakMap,a_);function kM(i){return{onFetch:(e,t)=>{var m,g,x,M,E;const r=e.options,a=(x=(g=(m=e.fetchOptions)==null?void 0:m.meta)==null?void 0:g.fetchMore)==null?void 0:x.direction,l=((M=e.state.data)==null?void 0:M.pages)||[],c=((E=e.state.data)==null?void 0:E.pageParams)||[];let d={pages:[],pageParams:[]},h=0;const f=async()=>{let w=!1;const _=P=>{DM(P,()=>e.signal,()=>w=!0)},y=g_(e.options,e.fetchOptions),L=async(P,C,F)=>{if(w)return Promise.reject(e.signal.reason);if(C==null&&P.pages.length)return Promise.resolve(P);const O=(()=>{const D={client:e.client,queryKey:e.queryKey,pageParam:C,direction:F?"backward":"forward",meta:e.options.meta};return _(D),D})(),b=await y(O),{maxPages:U}=e.options,G=F?LM:NM;return{pages:G(P.pages,b,U),pageParams:G(P.pageParams,C,U)}};if(a&&l.length){const P=a==="backward",C=P?zM:wx,F={pages:l,pageParams:c},N=C(r,F);d=await L(F,N,P)}else{const P=i??l.length;do{const C=h===0?c[0]??r.initialPageParam:wx(r,d);if(h>0&&C==null)break;d=await L(d,C),h++}while(h<P)}return d};e.options.persister?e.fetchFn=()=>{var w,_;return(_=(w=e.options).persister)==null?void 0:_.call(w,f,{client:e.client,queryKey:e.queryKey,meta:e.options.meta,signal:e.signal},t)}:e.fetchFn=f}}}function wx(i,{pages:e,pageParams:t}){const r=e.length-1;return e.length>0?i.getNextPageParam(e[r],e,t[r],t):void 0}function zM(i,{pages:e,pageParams:t}){var r;return e.length>0?(r=i.getPreviousPageParam)==null?void 0:r.call(i,e[0],e,t[0],t):void 0}var Eo,ma,wo,Di,ga,Pn,ql,xa,_i,y_,Or,o_,BM=(o_=class extends __{constructor(e){super();st(this,_i);st(this,Eo);st(this,ma);st(this,wo);st(this,Di);st(this,ga);st(this,Pn);st(this,ql);st(this,xa);Be(this,xa,!1),Be(this,ql,e.defaultOptions),this.setOptions(e.options),this.observers=[],Be(this,ga,e.client),Be(this,Di,V(this,ga).getQueryCache()),this.queryKey=e.queryKey,this.queryHash=e.queryHash,Be(this,ma,Tx(this.options)),this.state=e.state??V(this,ma),this.scheduleGc()}get meta(){return this.options.meta}get queryType(){return V(this,Eo)}get promise(){var e;return(e=V(this,Pn))==null?void 0:e.promise}setOptions(e){if(this.options={...V(this,ql),...e},e!=null&&e._type&&Be(this,Eo,e._type),this.updateGcTime(this.options.gcTime),this.state&&this.state.data===void 0){const t=Tx(this.options);t.data!==void 0&&(this.setState(bx(t.data,t.dataUpdatedAt)),Be(this,ma,t))}}optionalRemove(){!this.observers.length&&this.state.fetchStatus==="idle"&&V(this,Di).remove(this)}setData(e,t){const r=Zf(this.state.data,e,this.options);return gt(this,_i,Or).call(this,{data:r,type:"success",dataUpdatedAt:t==null?void 0:t.updatedAt,manual:t==null?void 0:t.manual}),r}setState(e){gt(this,_i,Or).call(this,{type:"setState",state:e})}cancel(e){var r,a;const t=(r=V(this,Pn))==null?void 0:r.promise;return(a=V(this,Pn))==null||a.cancel(e),t?t.then(Zn).catch(Zn):Promise.resolve()}destroy(){super.destroy(),this.cancel({silent:!0})}get resetState(){return V(this,ma)}reset(){this.destroy(),this.setState(this.resetState)}isActive(){return this.observers.some(e=>yi(e.options.enabled,this)!==!1)}isDisabled(){return this.getObserversCount()>0?!this.isActive():this.options.queryFn===cm||!this.isFetched()}isFetched(){return this.state.dataUpdateCount+this.state.errorUpdateCount>0}isStatic(){return this.getObserversCount()>0?this.observers.some(e=>Us(e.options.staleTime,this)==="static"):!1}isStale(){return this.getObserversCount()>0?this.observers.some(e=>e.getCurrentResult().isStale):this.state.data===void 0||this.state.isInvalidated}isStaleByTime(e=0){return this.state.data===void 0?!0:e==="static"?!1:this.state.isInvalidated?!0:!p_(this.state.dataUpdatedAt,e)}onFocus(){var t;const e=this.observers.find(r=>r.shouldFetchOnWindowFocus());e==null||e.refetch({cancelRefetch:!1}),(t=V(this,Pn))==null||t.continue()}onOnline(){var t;const e=this.observers.find(r=>r.shouldFetchOnReconnect());e==null||e.refetch({cancelRefetch:!1}),(t=V(this,Pn))==null||t.continue()}addObserver(e){this.observers.includes(e)||(this.observers.push(e),this.clearGcTimeout(),V(this,Di).notify({type:"observerAdded",query:this,observer:e}))}removeObserver(e){this.observers.includes(e)&&(this.observers=this.observers.filter(t=>t!==e),this.observers.length||(V(this,Pn)&&(V(this,xa)||gt(this,_i,y_).call(this)?V(this,Pn).cancel({revert:!0}):V(this,Pn).cancelRetry()),this.scheduleGc()),V(this,Di).notify({type:"observerRemoved",query:this,observer:e}))}getObserversCount(){return this.observers.length}invalidate(){this.state.isInvalidated||gt(this,_i,Or).call(this,{type:"invalidate"})}async fetch(e,t){var f,m,g,x,M,E,w,_,y,L,P;if(this.state.fetchStatus!=="idle"&&((f=V(this,Pn))==null?void 0:f.status())!=="rejected"){if(this.state.data!==void 0&&(t!=null&&t.cancelRefetch))this.cancel({silent:!0});else if(V(this,Pn))return V(this,Pn).continueRetry(),V(this,Pn).promise}if(e&&this.setOptions(e),!this.options.queryFn){const C=this.observers.find(F=>F.options.queryFn);C&&this.setOptions(C.options)}const r=new AbortController,a=C=>{Object.defineProperty(C,"signal",{enumerable:!0,get:()=>(Be(this,xa,!0),r.signal)})},l=()=>{const C=g_(this.options,t),N=(()=>{const O={client:V(this,ga),queryKey:this.queryKey,meta:this.meta};return a(O),O})();return Be(this,xa,!1),this.options.persister?this.options.persister(C,N,this):C(N)},d=(()=>{const C={fetchOptions:t,options:this.options,queryKey:this.queryKey,client:V(this,ga),state:this.state,fetchFn:l};return a(C),C})(),h=V(this,Eo)==="infinite"?kM(this.options.pages):this.options.behavior;h==null||h.onFetch(d,this),Be(this,wo,this.state),(this.state.fetchStatus==="idle"||this.state.fetchMeta!==((m=d.fetchOptions)==null?void 0:m.meta))&&gt(this,_i,Or).call(this,{type:"fetch",meta:(g=d.fetchOptions)==null?void 0:g.meta}),Be(this,Pn,v_({initialPromise:t==null?void 0:t.initialPromise,fn:d.fetchFn,onCancel:C=>{C instanceof ep&&C.revert&&this.setState({...V(this,wo),fetchStatus:"idle"}),r.abort()},onFail:(C,F)=>{gt(this,_i,Or).call(this,{type:"failed",failureCount:C,error:F})},onPause:()=>{gt(this,_i,Or).call(this,{type:"pause"})},onContinue:()=>{gt(this,_i,Or).call(this,{type:"continue"})},retry:d.options.retry,retryDelay:d.options.retryDelay,networkMode:d.options.networkMode,canRun:()=>!0}));try{const C=await V(this,Pn).start();if(C===void 0)throw new Error(`${this.queryHash} data is undefined`);return this.setData(C),(M=(x=V(this,Di).config).onSuccess)==null||M.call(x,C,this),(w=(E=V(this,Di).config).onSettled)==null||w.call(E,C,this.state.error,this),C}catch(C){if(C instanceof ep){if(C.silent)return V(this,Pn).promise;if(C.revert){if(this.state.data===void 0)throw C;return this.state.data}}throw gt(this,_i,Or).call(this,{type:"error",error:C}),(y=(_=V(this,Di).config).onError)==null||y.call(_,C,this),(P=(L=V(this,Di).config).onSettled)==null||P.call(L,this.state.data,C,this),C}finally{this.scheduleGc()}}},Eo=new WeakMap,ma=new WeakMap,wo=new WeakMap,Di=new WeakMap,ga=new WeakMap,Pn=new WeakMap,ql=new WeakMap,xa=new WeakMap,_i=new WeakSet,y_=function(){return this.state.fetchStatus==="paused"&&this.state.status==="pending"},Or=function(e){const t=r=>{switch(e.type){case"failed":return{...r,fetchFailureCount:e.failureCount,fetchFailureReason:e.error};case"pause":return{...r,fetchStatus:"paused"};case"continue":return{...r,fetchStatus:"fetching"};case"fetch":return{...r,...S_(r.data,this.options),fetchMeta:e.meta??null};case"success":const a={...r,...bx(e.data,e.dataUpdatedAt),dataUpdateCount:r.dataUpdateCount+1,...!e.manual&&{fetchStatus:"idle",fetchFailureCount:0,fetchFailureReason:null}};return Be(this,wo,e.manual?a:void 0),a;case"error":const l=e.error;return{...r,error:l,errorUpdateCount:r.errorUpdateCount+1,errorUpdatedAt:Date.now(),fetchFailureCount:r.fetchFailureCount+1,fetchFailureReason:l,fetchStatus:"idle",status:"error",isInvalidated:!0};case"invalidate":return{...r,isInvalidated:!0};case"setState":return{...r,...e.state}}};this.state=t(this.state),Mn.batch(()=>{this.observers.forEach(r=>{r.onQueryUpdate()}),V(this,Di).notify({query:this,type:"updated",action:e})})},o_);function S_(i,e){return{fetchFailureCount:0,fetchFailureReason:null,fetchStatus:x_(e.networkMode)?"fetching":"paused",...i===void 0&&{error:null,status:"pending"}}}function bx(i,e){return{data:i,dataUpdatedAt:e??Date.now(),error:null,isInvalidated:!1,status:"success"}}function Tx(i){const e=typeof i.initialData=="function"?i.initialData():i.initialData,t=e!==void 0,r=t?typeof i.initialDataUpdatedAt=="function"?i.initialDataUpdatedAt():i.initialDataUpdatedAt:0;return{data:e,dataUpdateCount:0,dataUpdatedAt:t?r??Date.now():0,error:null,errorUpdateCount:0,errorUpdatedAt:0,fetchFailureCount:0,fetchFailureReason:null,fetchMeta:null,isInvalidated:!1,status:t?"success":"pending",fetchStatus:"idle"}}var ui,Ct,Yl,Qn,va,bo,kr,Rs,Kl,To,Co,_a,ya,As,Ro,zt,Il,tp,np,ip,rp,sp,ap,op,M_,l_,HM=(l_=class extends Oo{constructor(e,t){super();st(this,zt);st(this,ui);st(this,Ct);st(this,Yl);st(this,Qn);st(this,va);st(this,bo);st(this,kr);st(this,Rs);st(this,Kl);st(this,To);st(this,Co);st(this,_a);st(this,ya);st(this,As);st(this,Ro,new Set);this.options=t,Be(this,ui,e),Be(this,Rs,null),Be(this,kr,Jf()),this.bindMethods(),this.setOptions(t)}bindMethods(){this.refetch=this.refetch.bind(this)}onSubscribe(){this.listeners.size===1&&(V(this,Ct).addObserver(this),Cx(V(this,Ct),this.options)?gt(this,zt,Il).call(this):this.updateResult(),gt(this,zt,rp).call(this))}onUnsubscribe(){this.hasListeners()||this.destroy()}shouldFetchOnReconnect(){return lp(V(this,Ct),this.options,this.options.refetchOnReconnect)}shouldFetchOnWindowFocus(){return lp(V(this,Ct),this.options,this.options.refetchOnWindowFocus)}destroy(){this.listeners=new Set,gt(this,zt,sp).call(this),gt(this,zt,ap).call(this),V(this,Ct).removeObserver(this)}setOptions(e){const t=this.options,r=V(this,Ct);if(this.options=V(this,ui).defaultQueryOptions(e),this.options.enabled!==void 0&&typeof this.options.enabled!="boolean"&&typeof this.options.enabled!="function"&&typeof yi(this.options.enabled,V(this,Ct))!="boolean")throw new Error("Expected enabled to be a boolean or a callback that returns a boolean");gt(this,zt,op).call(this),V(this,Ct).setOptions(this.options),t._defaulted&&!Ju(this.options,t)&&V(this,ui).getQueryCache().notify({type:"observerOptionsUpdated",query:V(this,Ct),observer:this});const a=this.hasListeners();a&&Rx(V(this,Ct),r,this.options,t)&&gt(this,zt,Il).call(this),this.updateResult(),a&&(V(this,Ct)!==r||yi(this.options.enabled,V(this,Ct))!==yi(t.enabled,V(this,Ct))||Us(this.options.staleTime,V(this,Ct))!==Us(t.staleTime,V(this,Ct)))&&gt(this,zt,tp).call(this);const l=gt(this,zt,np).call(this);a&&(V(this,Ct)!==r||yi(this.options.enabled,V(this,Ct))!==yi(t.enabled,V(this,Ct))||l!==V(this,As))&&gt(this,zt,ip).call(this,l)}getOptimisticResult(e){const t=V(this,ui).getQueryCache().build(V(this,ui),e),r=this.createResult(t,e);return GM(this,r)&&(Be(this,Qn,r),Be(this,bo,this.options),Be(this,va,V(this,Ct).state)),r}getCurrentResult(){return V(this,Qn)}trackResult(e,t){return new Proxy(e,{get:(r,a)=>(this.trackProp(a),t==null||t(a),a==="promise"&&(this.trackProp("data"),!this.options.experimental_prefetchInRender&&V(this,kr).status==="pending"&&V(this,kr).reject(new Error("experimental_prefetchInRender feature flag is not enabled"))),Reflect.get(r,a))})}trackProp(e){V(this,Ro).add(e)}getCurrentQuery(){return V(this,Ct)}refetch({...e}={}){return this.fetch({...e})}fetchOptimistic(e){const t=V(this,ui).defaultQueryOptions(e),r=V(this,ui).getQueryCache().build(V(this,ui),t);return r.fetch().then(()=>this.createResult(r,t))}fetch(e){return gt(this,zt,Il).call(this,{...e,cancelRefetch:e.cancelRefetch??!0}).then(()=>(this.updateResult(),V(this,Qn)))}createResult(e,t){var U;const r=V(this,Ct),a=this.options,l=V(this,Qn),c=V(this,va),d=V(this,bo),f=e!==r?e.state:V(this,Yl),{state:m}=e;let g={...m},x=!1,M;if(t._optimisticResults){const G=this.hasListeners(),D=!G&&Cx(e,t),K=G&&Rx(e,r,t,a);(D||K)&&(g={...g,...S_(m.data,e.options)}),t._optimisticResults==="isRestoring"&&(g.fetchStatus="idle")}let{error:E,errorUpdatedAt:w,status:_}=g;M=g.data;let y=!1;if(t.placeholderData!==void 0&&M===void 0&&_==="pending"){let G;l!=null&&l.isPlaceholderData&&t.placeholderData===(d==null?void 0:d.placeholderData)?(G=l.data,y=!0):G=typeof t.placeholderData=="function"?t.placeholderData((U=V(this,Co))==null?void 0:U.state.data,V(this,Co)):t.placeholderData,G!==void 0&&(_="success",M=Zf(l==null?void 0:l.data,G,t),x=!0)}if(t.select&&M!==void 0&&!y)if(l&&M===(c==null?void 0:c.data)&&t.select===V(this,Kl))M=V(this,To);else try{Be(this,Kl,t.select),M=t.select(M),M=Zf(l==null?void 0:l.data,M,t),Be(this,To,M),Be(this,Rs,null)}catch(G){Be(this,Rs,G)}V(this,Rs)&&(E=V(this,Rs),M=V(this,To),w=Date.now(),_="error");const L=g.fetchStatus==="fetching",P=_==="pending",C=_==="error",F=P&&L,N=M!==void 0,b={status:_,fetchStatus:g.fetchStatus,isPending:P,isSuccess:_==="success",isError:C,isInitialLoading:F,isLoading:F,data:M,dataUpdatedAt:g.dataUpdatedAt,error:E,errorUpdatedAt:w,failureCount:g.fetchFailureCount,failureReason:g.fetchFailureReason,errorUpdateCount:g.errorUpdateCount,isFetched:e.isFetched(),isFetchedAfterMount:g.dataUpdateCount>f.dataUpdateCount||g.errorUpdateCount>f.errorUpdateCount,isFetching:L,isRefetching:L&&!P,isLoadingError:C&&!N,isPaused:g.fetchStatus==="paused",isPlaceholderData:x,isRefetchError:C&&N,isStale:dm(e,t),refetch:this.refetch,promise:V(this,kr),isEnabled:yi(t.enabled,e)!==!1};if(this.options.experimental_prefetchInRender){const G=b.data!==void 0,D=b.status==="error"&&!G,K=k=>{D?k.reject(b.error):G&&k.resolve(b.data)},ne=()=>{const k=Be(this,kr,b.promise=Jf());K(k)},me=V(this,kr);switch(me.status){case"pending":e.queryHash===r.queryHash&&K(me);break;case"fulfilled":(D||b.data!==me.value)&&ne();break;case"rejected":(!D||b.error!==me.reason)&&ne();break}}return b}updateResult(){const e=V(this,Qn),t=this.createResult(V(this,Ct),this.options);if(Be(this,va,V(this,Ct).state),Be(this,bo,this.options),V(this,va).data!==void 0&&Be(this,Co,V(this,Ct)),Ju(t,e))return;Be(this,Qn,t);const r=()=>{if(!e)return!0;const{notifyOnChangeProps:a}=this.options,l=typeof a=="function"?a():a;if(l==="all"||!l&&!V(this,Ro).size)return!0;const c=new Set(l??V(this,Ro));return this.options.throwOnError&&c.add("error"),Object.keys(V(this,Qn)).some(d=>{const h=d;return V(this,Qn)[h]!==e[h]&&c.has(h)})};gt(this,zt,M_).call(this,{listeners:r()})}onQueryUpdate(){this.updateResult(),this.hasListeners()&&gt(this,zt,rp).call(this)}},ui=new WeakMap,Ct=new WeakMap,Yl=new WeakMap,Qn=new WeakMap,va=new WeakMap,bo=new WeakMap,kr=new WeakMap,Rs=new WeakMap,Kl=new WeakMap,To=new WeakMap,Co=new WeakMap,_a=new WeakMap,ya=new WeakMap,As=new WeakMap,Ro=new WeakMap,zt=new WeakSet,Il=function(e){gt(this,zt,op).call(this);let t=V(this,Ct).fetch(this.options,e);return e!=null&&e.throwOnError||(t=t.catch(Zn)),t},tp=function(){gt(this,zt,sp).call(this);const e=Us(this.options.staleTime,V(this,Ct));if(Hl.isServer()||V(this,Qn).isStale||!Kf(e))return;const r=p_(V(this,Qn).dataUpdatedAt,e)+1;Be(this,_a,ua.setTimeout(()=>{V(this,Qn).isStale||this.updateResult()},r))},np=function(){return(typeof this.options.refetchInterval=="function"?this.options.refetchInterval(V(this,Ct)):this.options.refetchInterval)??!1},ip=function(e){gt(this,zt,ap).call(this),Be(this,As,e),!(Hl.isServer()||yi(this.options.enabled,V(this,Ct))===!1||!Kf(V(this,As))||V(this,As)===0)&&Be(this,ya,ua.setInterval(()=>{(this.options.refetchIntervalInBackground||om.isFocused())&&gt(this,zt,Il).call(this)},V(this,As)))},rp=function(){gt(this,zt,tp).call(this),gt(this,zt,ip).call(this,gt(this,zt,np).call(this))},sp=function(){V(this,_a)!==void 0&&(ua.clearTimeout(V(this,_a)),Be(this,_a,void 0))},ap=function(){V(this,ya)!==void 0&&(ua.clearInterval(V(this,ya)),Be(this,ya,void 0))},op=function(){const e=V(this,ui).getQueryCache().build(V(this,ui),this.options);if(e===V(this,Ct))return;const t=V(this,Ct);Be(this,Ct,e),Be(this,Yl,e.state),this.hasListeners()&&(t==null||t.removeObserver(this),e.addObserver(this))},M_=function(e){Mn.batch(()=>{e.listeners&&this.listeners.forEach(t=>{t(V(this,Qn))}),V(this,ui).getQueryCache().notify({query:V(this,Ct),type:"observerResultsUpdated"})})},l_);function VM(i,e){return yi(e.enabled,i)!==!1&&i.state.data===void 0&&!(i.state.status==="error"&&yi(e.retryOnMount,i)===!1)}function Cx(i,e){return VM(i,e)||i.state.data!==void 0&&lp(i,e,e.refetchOnMount)}function lp(i,e,t){if(yi(e.enabled,i)!==!1&&Us(e.staleTime,i)!=="static"){const r=typeof t=="function"?t(i):t;return r==="always"||r!==!1&&dm(i,e)}return!1}function Rx(i,e,t,r){return(i!==e||yi(r.enabled,i)===!1)&&(!t.suspense||i.state.status!=="error")&&dm(i,t)}function dm(i,e){return yi(e.enabled,i)!==!1&&i.isStaleByTime(Us(e.staleTime,i))}function GM(i,e){return!Ju(i.getCurrentResult(),e)}var Ql,lr,jn,Sa,cr,Ss,c_,jM=(c_=class extends __{constructor(e){super();st(this,cr);st(this,Ql);st(this,lr);st(this,jn);st(this,Sa);Be(this,Ql,e.client),this.mutationId=e.mutationId,Be(this,jn,e.mutationCache),Be(this,lr,[]),this.state=e.state||E_(),this.setOptions(e.options),this.scheduleGc()}setOptions(e){this.options=e,this.updateGcTime(this.options.gcTime)}get meta(){return this.options.meta}addObserver(e){V(this,lr).includes(e)||(V(this,lr).push(e),this.clearGcTimeout(),V(this,jn).notify({type:"observerAdded",mutation:this,observer:e}))}removeObserver(e){Be(this,lr,V(this,lr).filter(t=>t!==e)),this.scheduleGc(),V(this,jn).notify({type:"observerRemoved",mutation:this,observer:e})}optionalRemove(){V(this,lr).length||(this.state.status==="pending"?this.scheduleGc():V(this,jn).remove(this))}continue(){var e;return((e=V(this,Sa))==null?void 0:e.continue())??this.execute(this.state.variables)}async execute(e){var c,d,h,f,m,g,x,M,E,w,_,y,L,P,C,F,N,O;const t=()=>{gt(this,cr,Ss).call(this,{type:"continue"})},r={client:V(this,Ql),meta:this.options.meta,mutationKey:this.options.mutationKey};Be(this,Sa,v_({fn:()=>this.options.mutationFn?this.options.mutationFn(e,r):Promise.reject(new Error("No mutationFn found")),onFail:(b,U)=>{gt(this,cr,Ss).call(this,{type:"failed",failureCount:b,error:U})},onPause:()=>{gt(this,cr,Ss).call(this,{type:"pause"})},onContinue:t,retry:this.options.retry??0,retryDelay:this.options.retryDelay,networkMode:this.options.networkMode,canRun:()=>V(this,jn).canRun(this)}));const a=this.state.status==="pending",l=!V(this,Sa).canStart();try{if(a)t();else{gt(this,cr,Ss).call(this,{type:"pending",variables:e,isPaused:l}),V(this,jn).config.onMutate&&await V(this,jn).config.onMutate(e,this,r);const U=await((d=(c=this.options).onMutate)==null?void 0:d.call(c,e,r));U!==this.state.context&&gt(this,cr,Ss).call(this,{type:"pending",context:U,variables:e,isPaused:l})}const b=await V(this,Sa).start();return await((f=(h=V(this,jn).config).onSuccess)==null?void 0:f.call(h,b,e,this.state.context,this,r)),await((g=(m=this.options).onSuccess)==null?void 0:g.call(m,b,e,this.state.context,r)),await((M=(x=V(this,jn).config).onSettled)==null?void 0:M.call(x,b,null,this.state.variables,this.state.context,this,r)),await((w=(E=this.options).onSettled)==null?void 0:w.call(E,b,null,e,this.state.context,r)),gt(this,cr,Ss).call(this,{type:"success",data:b}),b}catch(b){try{await((y=(_=V(this,jn).config).onError)==null?void 0:y.call(_,b,e,this.state.context,this,r))}catch(U){Promise.reject(U)}try{await((P=(L=this.options).onError)==null?void 0:P.call(L,b,e,this.state.context,r))}catch(U){Promise.reject(U)}try{await((F=(C=V(this,jn).config).onSettled)==null?void 0:F.call(C,void 0,b,this.state.variables,this.state.context,this,r))}catch(U){Promise.reject(U)}try{await((O=(N=this.options).onSettled)==null?void 0:O.call(N,void 0,b,e,this.state.context,r))}catch(U){Promise.reject(U)}throw gt(this,cr,Ss).call(this,{type:"error",error:b}),b}finally{V(this,jn).runNext(this)}}},Ql=new WeakMap,lr=new WeakMap,jn=new WeakMap,Sa=new WeakMap,cr=new WeakSet,Ss=function(e){const t=r=>{switch(e.type){case"failed":return{...r,failureCount:e.failureCount,failureReason:e.error};case"pause":return{...r,isPaused:!0};case"continue":return{...r,isPaused:!1};case"pending":return{...r,context:e.context,data:void 0,failureCount:0,failureReason:null,error:null,isPaused:e.isPaused,status:"pending",variables:e.variables,submittedAt:Date.now()};case"success":return{...r,data:e.data,failureCount:0,failureReason:null,error:null,status:"success",isPaused:!1};case"error":return{...r,data:void 0,error:e.error,failureCount:r.failureCount+1,failureReason:e.error,isPaused:!1,status:"error"}}};this.state=t(this.state),Mn.batch(()=>{V(this,lr).forEach(r=>{r.onMutationUpdate(e)}),V(this,jn).notify({mutation:this,type:"updated",action:e})})},c_);function E_(){return{context:void 0,data:void 0,error:null,failureCount:0,failureReason:null,isPaused:!1,status:"idle",variables:void 0,submittedAt:0}}var zr,qi,Zl,u_,WM=(u_=class extends Oo{constructor(e={}){super();st(this,zr);st(this,qi);st(this,Zl);this.config=e,Be(this,zr,new Set),Be(this,qi,new Map),Be(this,Zl,0)}build(e,t,r){const a=new jM({client:e,mutationCache:this,mutationId:++lu(this,Zl)._,options:e.defaultMutationOptions(t),state:r});return this.add(a),a}add(e){V(this,zr).add(e);const t=uu(e);if(typeof t=="string"){const r=V(this,qi).get(t);r?r.push(e):V(this,qi).set(t,[e])}this.notify({type:"added",mutation:e})}remove(e){if(V(this,zr).delete(e)){const t=uu(e);if(typeof t=="string"){const r=V(this,qi).get(t);if(r)if(r.length>1){const a=r.indexOf(e);a!==-1&&r.splice(a,1)}else r[0]===e&&V(this,qi).delete(t)}}this.notify({type:"removed",mutation:e})}canRun(e){const t=uu(e);if(typeof t=="string"){const r=V(this,qi).get(t),a=r==null?void 0:r.find(l=>l.state.status==="pending");return!a||a===e}else return!0}runNext(e){var r;const t=uu(e);if(typeof t=="string"){const a=(r=V(this,qi).get(t))==null?void 0:r.find(l=>l!==e&&l.state.isPaused);return(a==null?void 0:a.continue())??Promise.resolve()}else return Promise.resolve()}clear(){Mn.batch(()=>{V(this,zr).forEach(e=>{this.notify({type:"removed",mutation:e})}),V(this,zr).clear(),V(this,qi).clear()})}getAll(){return Array.from(V(this,zr))}find(e){const t={exact:!0,...e};return this.getAll().find(r=>Sx(t,r))}findAll(e={}){return this.getAll().filter(t=>Sx(e,t))}notify(e){Mn.batch(()=>{this.listeners.forEach(t=>{t(e)})})}resumePausedMutations(){const e=this.getAll().filter(t=>t.state.isPaused);return Mn.batch(()=>Promise.all(e.map(t=>t.continue().catch(Zn))))}},zr=new WeakMap,qi=new WeakMap,Zl=new WeakMap,u_);function uu(i){var e;return(e=i.options.scope)==null?void 0:e.id}var Br,Ps,di,Hr,Wr,Hu,cp,d_,XM=(d_=class extends Oo{constructor(t,r){super();st(this,Wr);st(this,Br);st(this,Ps);st(this,di);st(this,Hr);Be(this,Br,t),this.setOptions(r),this.bindMethods(),gt(this,Wr,Hu).call(this)}bindMethods(){this.mutate=this.mutate.bind(this),this.reset=this.reset.bind(this)}setOptions(t){var a;const r=this.options;this.options=V(this,Br).defaultMutationOptions(t),Ju(this.options,r)||V(this,Br).getMutationCache().notify({type:"observerOptionsUpdated",mutation:V(this,di),observer:this}),r!=null&&r.mutationKey&&this.options.mutationKey&&Ma(r.mutationKey)!==Ma(this.options.mutationKey)?this.reset():((a=V(this,di))==null?void 0:a.state.status)==="pending"&&V(this,di).setOptions(this.options)}onUnsubscribe(){var t;this.hasListeners()||(t=V(this,di))==null||t.removeObserver(this)}onMutationUpdate(t){gt(this,Wr,Hu).call(this),gt(this,Wr,cp).call(this,t)}getCurrentResult(){return V(this,Ps)}reset(){var t;(t=V(this,di))==null||t.removeObserver(this),Be(this,di,void 0),gt(this,Wr,Hu).call(this),gt(this,Wr,cp).call(this)}mutate(t,r){var a;return Be(this,Hr,r),(a=V(this,di))==null||a.removeObserver(this),Be(this,di,V(this,Br).getMutationCache().build(V(this,Br),this.options)),V(this,di).addObserver(this),V(this,di).execute(t)}},Br=new WeakMap,Ps=new WeakMap,di=new WeakMap,Hr=new WeakMap,Wr=new WeakSet,Hu=function(){var r;const t=((r=V(this,di))==null?void 0:r.state)??E_();Be(this,Ps,{...t,isPending:t.status==="pending",isSuccess:t.status==="success",isError:t.status==="error",isIdle:t.status==="idle",mutate:this.mutate,reset:this.reset})},cp=function(t){Mn.batch(()=>{var r,a,l,c,d,h,f,m;if(V(this,Hr)&&this.hasListeners()){const g=V(this,Ps).variables,x=V(this,Ps).context,M={client:V(this,Br),meta:this.options.meta,mutationKey:this.options.mutationKey};if((t==null?void 0:t.type)==="success"){try{(a=(r=V(this,Hr)).onSuccess)==null||a.call(r,t.data,g,x,M)}catch(E){Promise.reject(E)}try{(c=(l=V(this,Hr)).onSettled)==null||c.call(l,t.data,null,g,x,M)}catch(E){Promise.reject(E)}}else if((t==null?void 0:t.type)==="error"){try{(h=(d=V(this,Hr)).onError)==null||h.call(d,t.error,g,x,M)}catch(E){Promise.reject(E)}try{(m=(f=V(this,Hr)).onSettled)==null||m.call(f,void 0,t.error,g,x,M)}catch(E){Promise.reject(E)}}}this.listeners.forEach(g=>{g(V(this,Ps))})})},d_),ur,h_,$M=(h_=class extends Oo{constructor(e={}){super();st(this,ur);this.config=e,Be(this,ur,new Map)}build(e,t,r){const a=t.queryKey,l=t.queryHash??lm(a,t);let c=this.get(l);return c||(c=new BM({client:e,queryKey:a,queryHash:l,options:e.defaultQueryOptions(t),state:r,defaultOptions:e.getQueryDefaults(a)}),this.add(c)),c}add(e){V(this,ur).has(e.queryHash)||(V(this,ur).set(e.queryHash,e),this.notify({type:"added",query:e}))}remove(e){const t=V(this,ur).get(e.queryHash);t&&(e.destroy(),t===e&&V(this,ur).delete(e.queryHash),this.notify({type:"removed",query:e}))}clear(){Mn.batch(()=>{this.getAll().forEach(e=>{this.remove(e)})})}get(e){return V(this,ur).get(e)}getAll(){return[...V(this,ur).values()]}find(e){const t={exact:!0,...e};return this.getAll().find(r=>yx(t,r))}findAll(e={}){const t=this.getAll();return Object.keys(e).length>0?t.filter(r=>yx(e,r)):t}notify(e){Mn.batch(()=>{this.listeners.forEach(t=>{t(e)})})}onFocus(){Mn.batch(()=>{this.getAll().forEach(e=>{e.onFocus()})})}onOnline(){Mn.batch(()=>{this.getAll().forEach(e=>{e.onOnline()})})}},ur=new WeakMap,h_),hn,Ns,Ls,Ao,Po,Ds,No,Lo,f_,qM=(f_=class{constructor(i={}){st(this,hn);st(this,Ns);st(this,Ls);st(this,Ao);st(this,Po);st(this,Ds);st(this,No);st(this,Lo);Be(this,hn,i.queryCache||new $M),Be(this,Ns,i.mutationCache||new WM),Be(this,Ls,i.defaultOptions||{}),Be(this,Ao,new Map),Be(this,Po,new Map),Be(this,Ds,0)}mount(){lu(this,Ds)._++,V(this,Ds)===1&&(Be(this,No,om.subscribe(async i=>{i&&(await this.resumePausedMutations(),V(this,hn).onFocus())})),Be(this,Lo,ed.subscribe(async i=>{i&&(await this.resumePausedMutations(),V(this,hn).onOnline())})))}unmount(){var i,e;lu(this,Ds)._--,V(this,Ds)===0&&((i=V(this,No))==null||i.call(this),Be(this,No,void 0),(e=V(this,Lo))==null||e.call(this),Be(this,Lo,void 0))}isFetching(i){return V(this,hn).findAll({...i,fetchStatus:"fetching"}).length}isMutating(i){return V(this,Ns).findAll({...i,status:"pending"}).length}getQueryData(i){var t;const e=this.defaultQueryOptions({queryKey:i});return(t=V(this,hn).get(e.queryHash))==null?void 0:t.state.data}ensureQueryData(i){const e=this.defaultQueryOptions(i),t=V(this,hn).build(this,e),r=t.state.data;return r===void 0?this.fetchQuery(i):(i.revalidateIfStale&&t.isStaleByTime(Us(e.staleTime,t))&&this.prefetchQuery(e),Promise.resolve(r))}getQueriesData(i){return V(this,hn).findAll(i).map(({queryKey:e,state:t})=>{const r=t.data;return[e,r]})}setQueryData(i,e,t){const r=this.defaultQueryOptions({queryKey:i}),a=V(this,hn).get(r.queryHash),l=a==null?void 0:a.state.data,c=RM(e,l);if(c!==void 0)return V(this,hn).build(this,r).setData(c,{...t,manual:!0})}setQueriesData(i,e,t){return Mn.batch(()=>V(this,hn).findAll(i).map(({queryKey:r})=>[r,this.setQueryData(r,e,t)]))}getQueryState(i){var t;const e=this.defaultQueryOptions({queryKey:i});return(t=V(this,hn).get(e.queryHash))==null?void 0:t.state}removeQueries(i){const e=V(this,hn);Mn.batch(()=>{e.findAll(i).forEach(t=>{e.remove(t)})})}resetQueries(i,e){const t=V(this,hn);return Mn.batch(()=>(t.findAll(i).forEach(r=>{r.reset()}),this.refetchQueries({type:"active",...i},e)))}cancelQueries(i,e={}){const t={revert:!0,...e},r=Mn.batch(()=>V(this,hn).findAll(i).map(a=>a.cancel(t)));return Promise.all(r).then(Zn).catch(Zn)}invalidateQueries(i,e={}){return Mn.batch(()=>(V(this,hn).findAll(i).forEach(t=>{t.invalidate()}),(i==null?void 0:i.refetchType)==="none"?Promise.resolve():this.refetchQueries({...i,type:(i==null?void 0:i.refetchType)??(i==null?void 0:i.type)??"active"},e)))}refetchQueries(i,e={}){const t={...e,cancelRefetch:e.cancelRefetch??!0},r=Mn.batch(()=>V(this,hn).findAll(i).filter(a=>!a.isDisabled()&&!a.isStatic()).map(a=>{let l=a.fetch(void 0,t);return t.throwOnError||(l=l.catch(Zn)),a.state.fetchStatus==="paused"?Promise.resolve():l}));return Promise.all(r).then(Zn)}fetchQuery(i){const e=this.defaultQueryOptions(i);e.retry===void 0&&(e.retry=!1);const t=V(this,hn).build(this,e);return t.isStaleByTime(Us(e.staleTime,t))?t.fetch(e):Promise.resolve(t.state.data)}prefetchQuery(i){return this.fetchQuery(i).then(Zn).catch(Zn)}fetchInfiniteQuery(i){return i._type="infinite",this.fetchQuery(i)}prefetchInfiniteQuery(i){return this.fetchInfiniteQuery(i).then(Zn).catch(Zn)}ensureInfiniteQueryData(i){return i._type="infinite",this.ensureQueryData(i)}resumePausedMutations(){return ed.isOnline()?V(this,Ns).resumePausedMutations():Promise.resolve()}getQueryCache(){return V(this,hn)}getMutationCache(){return V(this,Ns)}getDefaultOptions(){return V(this,Ls)}setDefaultOptions(i){Be(this,Ls,i)}setQueryDefaults(i,e){V(this,Ao).set(Ma(i),{queryKey:i,defaultOptions:e})}getQueryDefaults(i){const e=[...V(this,Ao).values()],t={};return e.forEach(r=>{Bl(i,r.queryKey)&&Object.assign(t,r.defaultOptions)}),t}setMutationDefaults(i,e){V(this,Po).set(Ma(i),{mutationKey:i,defaultOptions:e})}getMutationDefaults(i){const e=[...V(this,Po).values()],t={};return e.forEach(r=>{Bl(i,r.mutationKey)&&Object.assign(t,r.defaultOptions)}),t}defaultQueryOptions(i){if(i._defaulted)return i;const e={...V(this,Ls).queries,...this.getQueryDefaults(i.queryKey),...i,_defaulted:!0};return e.queryHash||(e.queryHash=lm(e.queryKey,e)),e.refetchOnReconnect===void 0&&(e.refetchOnReconnect=e.networkMode!=="always"),e.throwOnError===void 0&&(e.throwOnError=!!e.suspense),!e.networkMode&&e.persister&&(e.networkMode="offlineFirst"),e.queryFn===cm&&(e.enabled=!1),e}defaultMutationOptions(i){return i!=null&&i._defaulted?i:{...V(this,Ls).mutations,...(i==null?void 0:i.mutationKey)&&this.getMutationDefaults(i.mutationKey),...i,_defaulted:!0}}clear(){V(this,hn).clear(),V(this,Ns).clear()}},hn=new WeakMap,Ns=new WeakMap,Ls=new WeakMap,Ao=new WeakMap,Po=new WeakMap,Ds=new WeakMap,No=new WeakMap,Lo=new WeakMap,f_),w_=H.createContext(void 0),hm=i=>{const e=H.useContext(w_);if(!e)throw new Error("No QueryClient set, use QueryClientProvider to set one");return e},YM=({client:i,children:e})=>(H.useEffect(()=>(i.mount(),()=>{i.unmount()}),[i]),v.jsx(w_.Provider,{value:i,children:e})),b_=H.createContext(!1),KM=()=>H.useContext(b_);b_.Provider;function QM(){let i=!1;return{clearReset:()=>{i=!1},reset:()=>{i=!0},isReset:()=>i}}var ZM=H.createContext(QM()),JM=()=>H.useContext(ZM),eE=(i,e,t)=>{const r=t!=null&&t.state.error&&typeof i.throwOnError=="function"?um(i.throwOnError,[t.state.error,t]):i.throwOnError;(i.suspense||i.experimental_prefetchInRender||r)&&(e.isReset()||(i.retryOnMount=!1))},tE=i=>{H.useEffect(()=>{i.clearReset()},[i])},nE=({result:i,errorResetBoundary:e,throwOnError:t,query:r,suspense:a})=>i.isError&&!e.isReset()&&!i.isFetching&&r&&(a&&i.data===void 0||um(t,[i.error,r])),iE=i=>{if(i.suspense){const t=a=>a==="static"?a:Math.max(a??1e3,1e3),r=i.staleTime;i.staleTime=typeof r=="function"?(...a)=>t(r(...a)):t(r),typeof i.gcTime=="number"&&(i.gcTime=Math.max(i.gcTime,1e3))}},rE=(i,e)=>i.isLoading&&i.isFetching&&!e,sE=(i,e)=>(i==null?void 0:i.suspense)&&e.isPending,Ax=(i,e,t)=>e.fetchOptimistic(i).catch(()=>{t.clearReset()});function aE(i,e,t){var M,E,w,_;const r=KM(),a=JM(),l=hm(),c=l.defaultQueryOptions(i);(E=(M=l.getDefaultOptions().queries)==null?void 0:M._experimental_beforeQuery)==null||E.call(M,c);const d=l.getQueryCache().get(c.queryHash),h=i.subscribed!==!1;c._optimisticResults=r?"isRestoring":h?"optimistic":void 0,iE(c),eE(c,a,d),tE(a);const f=!l.getQueryCache().get(c.queryHash),[m]=H.useState(()=>new e(l,c)),g=m.getOptimisticResult(c),x=!r&&h;if(H.useSyncExternalStore(H.useCallback(y=>{const L=x?m.subscribe(Mn.batchCalls(y)):Zn;return m.updateResult(),L},[m,x]),()=>m.getCurrentResult(),()=>m.getCurrentResult()),H.useEffect(()=>{m.setOptions(c)},[c,m]),sE(c,g))throw Ax(c,m,a);if(nE({result:g,errorResetBoundary:a,throwOnError:c.throwOnError,query:d,suspense:c.suspense}))throw g.error;if((_=(w=l.getDefaultOptions().queries)==null?void 0:w._experimental_afterQuery)==null||_.call(w,c,g),c.experimental_prefetchInRender&&!Hl.isServer()&&rE(g,r)){const y=f?Ax(c,m,a):d==null?void 0:d.promise;y==null||y.catch(Zn).finally(()=>{m.updateResult()})}return c.notifyOnChangeProps?g:m.trackResult(g)}function Ea(i,e){return aE(i,HM)}function Es(i,e){const t=hm(),[r]=H.useState(()=>new XM(t,i));H.useEffect(()=>{r.setOptions(i)},[r,i]);const a=H.useSyncExternalStore(H.useCallback(c=>r.subscribe(Mn.batchCalls(c)),[r]),()=>r.getCurrentResult(),()=>r.getCurrentResult()),l=H.useCallback((c,d)=>{r.mutate(c,d).catch(Zn)},[r]);if(a.error&&um(r.options.throwOnError,[a.error]))throw a.error;return{...a,mutate:l,mutateAsync:a.mutate}}/**
 * react-router v7.18.0
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */var fm=/^(?:[a-z][a-z0-9+.-]*:|[\\/]{2})/i,T_=/^[\\/]{2}/;function oE(i,e){return e+i.replace(/\\/g,"/")}var Px="popstate";function Nx(i){return typeof i=="object"&&i!=null&&"pathname"in i&&"search"in i&&"hash"in i&&"state"in i&&"key"in i}function lE(i={}){function e(r,a){var f;let l=(f=a.state)==null?void 0:f.masked,{pathname:c,search:d,hash:h}=l||r.location;return up("",{pathname:c,search:d,hash:h},a.state&&a.state.usr||null,a.state&&a.state.key||"default",l?{pathname:r.location.pathname,search:r.location.search,hash:r.location.hash}:void 0)}function t(r,a){return typeof a=="string"?a:Vl(a)}return uE(e,t,null,i)}function rn(i,e){if(i===!1||i===null||typeof i>"u")throw new Error(e)}function Ui(i,e){if(!i){typeof console<"u"&&console.warn(e);try{throw new Error(e)}catch{}}}function cE(){return Math.random().toString(36).substring(2,10)}function Lx(i,e){return{usr:i.state,key:i.key,idx:e,masked:i.mask?{pathname:i.pathname,search:i.search,hash:i.hash}:void 0}}function up(i,e,t=null,r,a){return{pathname:typeof i=="string"?i:i.pathname,search:"",hash:"",...typeof e=="string"?ko(e):e,state:t,key:e&&e.key||r||cE(),mask:a}}function Vl({pathname:i="/",search:e="",hash:t=""}){return e&&e!=="?"&&(i+=e.charAt(0)==="?"?e:"?"+e),t&&t!=="#"&&(i+=t.charAt(0)==="#"?t:"#"+t),i}function ko(i){let e={};if(i){let t=i.indexOf("#");t>=0&&(e.hash=i.substring(t),i=i.substring(0,t));let r=i.indexOf("?");r>=0&&(e.search=i.substring(r),i=i.substring(0,r)),i&&(e.pathname=i)}return e}function uE(i,e,t,r={}){let{window:a=document.defaultView,v5Compat:l=!1}=r,c=a.history,d="POP",h=null,f=m();f==null&&(f=0,c.replaceState({...c.state,idx:f},""));function m(){return(c.state||{idx:null}).idx}function g(){d="POP";let _=m(),y=_==null?null:_-f;f=_,h&&h({action:d,location:w.location,delta:y})}function x(_,y){d="PUSH";let L=Nx(_)?_:up(w.location,_,y);f=m()+1;let P=Lx(L,f),C=w.createHref(L.mask||L);try{c.pushState(P,"",C)}catch(F){if(F instanceof DOMException&&F.name==="DataCloneError")throw F;a.location.assign(C)}l&&h&&h({action:d,location:w.location,delta:1})}function M(_,y){d="REPLACE";let L=Nx(_)?_:up(w.location,_,y);f=m();let P=Lx(L,f),C=w.createHref(L.mask||L);c.replaceState(P,"",C),l&&h&&h({action:d,location:w.location,delta:0})}function E(_){return dE(a,_)}let w={get action(){return d},get location(){return i(a,c)},listen(_){if(h)throw new Error("A history only accepts one active listener");return a.addEventListener(Px,g),h=_,()=>{a.removeEventListener(Px,g),h=null}},createHref(_){return e(a,_)},createURL:E,encodeLocation(_){let y=E(_);return{pathname:y.pathname,search:y.search,hash:y.hash}},push:x,replace:M,go(_){return c.go(_)}};return w}function dE(i,e,t=!1){let r="http://localhost";i&&(r=i.location.origin!=="null"?i.location.origin:i.location.href),rn(r,"No window.location.(origin|href) available to create URL");let a=typeof e=="string"?e:Vl(e);return a=a.replace(/ $/,"%20"),!t&&T_.test(a)&&(a=r+a),new URL(a,r)}function C_(i,e,t="/"){return hE(i,e,t,!1)}function hE(i,e,t,r,a){let l=typeof e=="string"?ko(e):e,c=Xr(l.pathname||"/",t);if(c==null)return null;let d=fE(i),h=null,f=wE(c);for(let m=0;h==null&&m<d.length;++m)h=EE(d[m],f,r);return h}function fE(i){let e=R_(i);return pE(e),e}function R_(i,e=[],t=[],r="",a=!1){let l=(c,d,h=a,f)=>{let m={relativePath:f===void 0?c.path||"":f,caseSensitive:c.caseSensitive===!0,childrenIndex:d,route:c};if(m.relativePath.startsWith("/")){if(!m.relativePath.startsWith(r)&&h)return;rn(m.relativePath.startsWith(r),`Absolute route path "${m.relativePath}" nested under path "${r}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`),m.relativePath=m.relativePath.slice(r.length)}let g=Qi([r,m.relativePath]),x=t.concat(m);c.children&&c.children.length>0&&(rn(c.index!==!0,`Index routes must not have child routes. Please remove all child routes from route path "${g}".`),R_(c.children,e,x,g,h)),!(c.path==null&&!c.index)&&e.push({path:g,score:SE(g,c.index),routesMeta:x.map((M,E)=>{let[w,_]=N_(M.relativePath,M.caseSensitive,E===x.length-1);return{...M,matcher:w,compiledParams:_}})})};return i.forEach((c,d)=>{var h;if(c.path===""||!((h=c.path)!=null&&h.includes("?")))l(c,d);else for(let f of A_(c.path))l(c,d,!0,f)}),e}function A_(i){let e=i.split("/");if(e.length===0)return[];let[t,...r]=e,a=t.endsWith("?"),l=t.replace(/\?$/,"");if(r.length===0)return a?[l,""]:[l];let c=A_(r.join("/")),d=[];return d.push(...c.map(h=>h===""?l:[l,h].join("/"))),a&&d.push(...c),d.map(h=>i.startsWith("/")&&h===""?"/":h)}function pE(i){i.sort((e,t)=>e.score!==t.score?t.score-e.score:ME(e.routesMeta.map(r=>r.childrenIndex),t.routesMeta.map(r=>r.childrenIndex)))}var mE=/^:[\w-]+$/,gE=3,xE=2,vE=1,_E=10,yE=-2,Dx=i=>i==="*";function SE(i,e){let t=i.split("/"),r=t.length;return t.some(Dx)&&(r+=yE),e&&(r+=xE),t.filter(a=>!Dx(a)).reduce((a,l)=>a+(mE.test(l)?gE:l===""?vE:_E),r)}function ME(i,e){return i.length===e.length&&i.slice(0,-1).every((r,a)=>r===e[a])?i[i.length-1]-e[e.length-1]:0}function EE(i,e,t=!1){let{routesMeta:r}=i,a={},l="/",c=[];for(let d=0;d<r.length;++d){let h=r[d],f=d===r.length-1,m=l==="/"?e:e.slice(l.length)||"/",g={path:h.relativePath,caseSensitive:h.caseSensitive,end:f},x=h.matcher&&h.compiledParams?P_(g,m,h.matcher,h.compiledParams):td(g,m),M=h.route;if(!x&&f&&t&&!r[r.length-1].route.index&&(x=td({path:h.relativePath,caseSensitive:h.caseSensitive,end:!1},m)),!x)return null;Object.assign(a,x.params),c.push({params:a,pathname:Qi([l,x.pathname]),pathnameBase:CE(Qi([l,x.pathnameBase])),route:M}),x.pathnameBase!=="/"&&(l=Qi([l,x.pathnameBase]))}return c}function td(i,e){typeof i=="string"&&(i={path:i,caseSensitive:!1,end:!0});let[t,r]=N_(i.path,i.caseSensitive,i.end);return P_(i,e,t,r)}function P_(i,e,t,r){let a=e.match(t);if(!a)return null;let l=a[0],c=l.replace(/(.)\/+$/,"$1"),d=a.slice(1);return{params:r.reduce((f,{paramName:m,isOptional:g},x)=>{if(m==="*"){let E=d[x]||"";c=l.slice(0,l.length-E.length).replace(/(.)\/+$/,"$1")}const M=d[x];return g&&!M?f[m]=void 0:f[m]=(M||"").replace(/%2F/g,"/"),f},{}),pathname:l,pathnameBase:c,pattern:i}}function N_(i,e=!1,t=!0){Ui(i==="*"||!i.endsWith("*")||i.endsWith("/*"),`Route path "${i}" will be treated as if it were "${i.replace(/\*$/,"/*")}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${i.replace(/\*$/,"/*")}".`);let r=[],a="^"+i.replace(/\/*\*?$/,"").replace(/^\/*/,"/").replace(/[\\.*+^${}|()[\]]/g,"\\$&").replace(/\/:([\w-]+)(\?)?/g,(c,d,h,f,m)=>{if(r.push({paramName:d,isOptional:h!=null}),h){let g=m.charAt(f+c.length);return g&&g!=="/"?"/([^\\/]*)":"(?:/([^\\/]*))?"}return"/([^\\/]+)"}).replace(/\/([\w-]+)\?(\/|$)/g,"(/$1)?$2");return i.endsWith("*")?(r.push({paramName:"*"}),a+=i==="*"||i==="/*"?"(.*)$":"(?:\\/(.+)|\\/*)$"):t?a+="\\/*$":i!==""&&i!=="/"&&(a+="(?:(?=\\/|$))"),[new RegExp(a,e?void 0:"i"),r]}function wE(i){try{return i.split("/").map(e=>decodeURIComponent(e).replace(/\//g,"%2F")).join("/")}catch(e){return Ui(!1,`The URL path "${i}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${e}).`),i}}function Xr(i,e){if(e==="/")return i;if(!i.toLowerCase().startsWith(e.toLowerCase()))return null;let t=e.endsWith("/")?e.length-1:e.length,r=i.charAt(t);return r&&r!=="/"?null:i.slice(t)||"/"}function bE(i,e="/"){let{pathname:t,search:r="",hash:a=""}=typeof i=="string"?ko(i):i,l;return t?(t=L_(t),t.startsWith("/")?l=Ix(t.substring(1),"/"):l=Ix(t,e)):l=e,{pathname:l,search:RE(r),hash:AE(a)}}function Ix(i,e){let t=nd(e).split("/");return i.split("/").forEach(a=>{a===".."?t.length>1&&t.pop():a!=="."&&t.push(a)}),t.length>1?t.join("/"):"/"}function sf(i,e,t,r){return`Cannot include a '${i}' character in a manually specified \`to.${e}\` field [${JSON.stringify(r)}].  Please separate it out to the \`to.${t}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`}function TE(i){return i.filter((e,t)=>t===0||e.route.path&&e.route.path.length>0)}function pm(i){let e=TE(i);return e.map((t,r)=>r===e.length-1?t.pathname:t.pathnameBase)}function hd(i,e,t,r=!1){let a;typeof i=="string"?a=ko(i):(a={...i},rn(!a.pathname||!a.pathname.includes("?"),sf("?","pathname","search",a)),rn(!a.pathname||!a.pathname.includes("#"),sf("#","pathname","hash",a)),rn(!a.search||!a.search.includes("#"),sf("#","search","hash",a)));let l=i===""||a.pathname==="",c=l?"/":a.pathname,d;if(c==null)d=t;else{let g=e.length-1;if(!r&&c.startsWith("..")){let x=c.split("/");for(;x[0]==="..";)x.shift(),g-=1;a.pathname=x.join("/")}d=g>=0?e[g]:"/"}let h=bE(a,d),f=c&&c!=="/"&&c.endsWith("/"),m=(l||c===".")&&t.endsWith("/");return!h.pathname.endsWith("/")&&(f||m)&&(h.pathname+="/"),h}var L_=i=>i.replace(/[\\/]{2,}/g,"/"),Qi=i=>L_(i.join("/")),nd=i=>i.replace(/\/+$/,""),CE=i=>nd(i).replace(/^\/*/,"/"),RE=i=>!i||i==="?"?"":i.startsWith("?")?i:"?"+i,AE=i=>!i||i==="#"?"":i.startsWith("#")?i:"#"+i,PE=class{constructor(i,e,t,r=!1){this.status=i,this.statusText=e||"",this.internal=r,t instanceof Error?(this.data=t.toString(),this.error=t):this.data=t}};function NE(i){return i!=null&&typeof i.status=="number"&&typeof i.statusText=="string"&&typeof i.internal=="boolean"&&"data"in i}function LE(i){let e=i.map(t=>t.route.path).filter(Boolean);return Qi(e)||"/"}var D_=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";function I_(i,e){let t=i;if(typeof t!="string"||!fm.test(t))return{absoluteURL:void 0,isExternal:!1,to:t};let r=t,a=!1;if(D_)try{let l=new URL(window.location.href),c=T_.test(t)?new URL(oE(t,l.protocol)):new URL(t),d=Xr(c.pathname,e);c.origin===l.origin&&d!=null?t=d+c.search+c.hash:a=!0}catch{Ui(!1,`<Link to="${t}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`)}return{absoluteURL:r,isExternal:a,to:t}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");var U_=["POST","PUT","PATCH","DELETE"];new Set(U_);var DE=["GET",...U_];new Set(DE);var IE=["about:","blob:","chrome:","chrome-untrusted:","content:","data:","devtools:","file:","filesystem:","javascript:"];function UE(i){try{return IE.includes(new URL(i).protocol)}catch{return!1}}var zo=H.createContext(null);zo.displayName="DataRouter";var fd=H.createContext(null);fd.displayName="DataRouterState";var F_=H.createContext(!1);function FE(){return H.useContext(F_)}var O_=H.createContext({isTransitioning:!1});O_.displayName="ViewTransition";var OE=H.createContext(new Map);OE.displayName="Fetchers";var kE=H.createContext(null);kE.displayName="Await";var Ei=H.createContext(null);Ei.displayName="Navigation";var Jl=H.createContext(null);Jl.displayName="Location";var Ji=H.createContext({outlet:null,matches:[],isDataRoute:!1});Ji.displayName="Route";var mm=H.createContext(null);mm.displayName="RouteError";var k_="REACT_ROUTER_ERROR",zE="REDIRECT",BE="ROUTE_ERROR_RESPONSE";function HE(i){if(i.startsWith(`${k_}:${zE}:{`))try{let e=JSON.parse(i.slice(28));if(typeof e=="object"&&e&&typeof e.status=="number"&&typeof e.statusText=="string"&&typeof e.location=="string"&&typeof e.reloadDocument=="boolean"&&typeof e.replace=="boolean")return e}catch{}}function VE(i){if(i.startsWith(`${k_}:${BE}:{`))try{let e=JSON.parse(i.slice(40));if(typeof e=="object"&&e&&typeof e.status=="number"&&typeof e.statusText=="string")return new PE(e.status,e.statusText,e.data)}catch{}}function GE(i,{relative:e}={}){rn(Bo(),"useHref() may be used only in the context of a <Router> component.");let{basename:t,navigator:r}=H.useContext(Ei),{hash:a,pathname:l,search:c}=ec(i,{relative:e}),d=l;return t!=="/"&&(d=l==="/"?t:Qi([t,l])),r.createHref({pathname:d,search:c,hash:a})}function Bo(){return H.useContext(Jl)!=null}function er(){return rn(Bo(),"useLocation() may be used only in the context of a <Router> component."),H.useContext(Jl).location}var z_="You should call navigate() in a React.useEffect(), not when your component is first rendered.";function B_(i){H.useContext(Ei).static||H.useLayoutEffect(i)}function gm(){let{isDataRoute:i}=H.useContext(Ji);return i?r1():jE()}function jE(){rn(Bo(),"useNavigate() may be used only in the context of a <Router> component.");let i=H.useContext(zo),{basename:e,navigator:t}=H.useContext(Ei),{matches:r}=H.useContext(Ji),{pathname:a}=er(),l=JSON.stringify(pm(r)),c=H.useRef(!1);return B_(()=>{c.current=!0}),H.useCallback((h,f={})=>{if(Ui(c.current,z_),!c.current)return;if(typeof h=="number"){t.go(h);return}let m=hd(h,JSON.parse(l),a,f.relative==="path");i==null&&e!=="/"&&(m.pathname=m.pathname==="/"?e:Qi([e,m.pathname])),(f.replace?t.replace:t.push)(m,f.state,f)},[e,t,l,a,i])}var WE=H.createContext(null);function XE(i){let e=H.useContext(Ji).outlet;return H.useMemo(()=>e&&H.createElement(WE.Provider,{value:i},e),[e,i])}function ec(i,{relative:e}={}){let{matches:t}=H.useContext(Ji),{pathname:r}=er(),a=JSON.stringify(pm(t));return H.useMemo(()=>hd(i,JSON.parse(a),r,e==="path"),[i,a,r,e])}function $E(i,e){return H_(i,e)}function H_(i,e,t){var _;rn(Bo(),"useRoutes() may be used only in the context of a <Router> component.");let{navigator:r}=H.useContext(Ei),{matches:a}=H.useContext(Ji),l=a[a.length-1],c=l?l.params:{},d=l?l.pathname:"/",h=l?l.pathnameBase:"/",f=l&&l.route;{let y=f&&f.path||"";G_(d,!f||y.endsWith("*")||y.endsWith("*?"),`You rendered descendant <Routes> (or called \`useRoutes()\`) at "${d}" (under <Route path="${y}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${y}"> to <Route path="${y==="/"?"*":`${y}/*`}">.`)}let m=er(),g;if(e){let y=typeof e=="string"?ko(e):e;rn(h==="/"||((_=y.pathname)==null?void 0:_.startsWith(h)),`When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${h}" but pathname "${y.pathname}" was given in the \`location\` prop.`),g=y}else g=m;let x=g.pathname||"/",M=x;if(h!=="/"){let y=h.replace(/^\//,"").split("/");M="/"+x.replace(/^\//,"").split("/").slice(y.length).join("/")}let E=t&&t.state.matches.length?t.state.matches.map(y=>Object.assign(y,{route:t.manifest[y.route.id]||y.route})):C_(i,{pathname:M});Ui(f||E!=null,`No routes matched location "${g.pathname}${g.search}${g.hash}" `),Ui(E==null||E[E.length-1].route.element!==void 0||E[E.length-1].route.Component!==void 0||E[E.length-1].route.lazy!==void 0,`Matched leaf route at location "${g.pathname}${g.search}${g.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`);let w=ZE(E&&E.map(y=>Object.assign({},y,{params:Object.assign({},c,y.params),pathname:Qi([h,r.encodeLocation?r.encodeLocation(y.pathname.replace(/%/g,"%25").replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:y.pathname]),pathnameBase:y.pathnameBase==="/"?h:Qi([h,r.encodeLocation?r.encodeLocation(y.pathnameBase.replace(/%/g,"%25").replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:y.pathnameBase])})),a,t);return e&&w?H.createElement(Jl.Provider,{value:{location:{pathname:"/",search:"",hash:"",state:null,key:"default",mask:void 0,...g},navigationType:"POP"}},w):w}function qE(){let i=i1(),e=NE(i)?`${i.status} ${i.statusText}`:i instanceof Error?i.message:JSON.stringify(i),t=i instanceof Error?i.stack:null,r="rgba(200,200,200, 0.5)",a={padding:"0.5rem",backgroundColor:r},l={padding:"2px 4px",backgroundColor:r},c=null;return console.error("Error handled by React Router default ErrorBoundary:",i),c=H.createElement(H.Fragment,null,H.createElement("p",null,"💿 Hey developer 👋"),H.createElement("p",null,"You can provide a way better UX than this when your app throws errors by providing your own ",H.createElement("code",{style:l},"ErrorBoundary")," or"," ",H.createElement("code",{style:l},"errorElement")," prop on your route.")),H.createElement(H.Fragment,null,H.createElement("h2",null,"Unexpected Application Error!"),H.createElement("h3",{style:{fontStyle:"italic"}},e),t?H.createElement("pre",{style:a},t):null,c)}var YE=H.createElement(qE,null),V_=class extends H.Component{constructor(i){super(i),this.state={location:i.location,revalidation:i.revalidation,error:i.error}}static getDerivedStateFromError(i){return{error:i}}static getDerivedStateFromProps(i,e){return e.location!==i.location||e.revalidation!=="idle"&&i.revalidation==="idle"?{error:i.error,location:i.location,revalidation:i.revalidation}:{error:i.error!==void 0?i.error:e.error,location:e.location,revalidation:i.revalidation||e.revalidation}}componentDidCatch(i,e){this.props.onError?this.props.onError(i,e):console.error("React Router caught the following error during render",i)}render(){let i=this.state.error;if(this.context&&typeof i=="object"&&i&&"digest"in i&&typeof i.digest=="string"){const t=VE(i.digest);t&&(i=t)}let e=i!==void 0?H.createElement(Ji.Provider,{value:this.props.routeContext},H.createElement(mm.Provider,{value:i,children:this.props.component})):this.props.children;return this.context?H.createElement(KE,{error:i},e):e}};V_.contextType=F_;var af=new WeakMap;function KE({children:i,error:e}){let{basename:t}=H.useContext(Ei);if(typeof e=="object"&&e&&"digest"in e&&typeof e.digest=="string"){let r=HE(e.digest);if(r){let a=af.get(e);if(a)throw a;let l=I_(r.location,t),c=l.absoluteURL||l.to;if(UE(c))throw new Error("Invalid redirect location");if(D_&&!af.get(e))if(l.isExternal||r.reloadDocument)window.location.href=c;else{const d=Promise.resolve().then(()=>window.__reactRouterDataRouter.navigate(l.to,{replace:r.replace}));throw af.set(e,d),d}return H.createElement("meta",{httpEquiv:"refresh",content:`0;url=${c}`})}}return i}function QE({routeContext:i,match:e,children:t}){let r=H.useContext(zo);return r&&r.static&&r.staticContext&&(e.route.errorElement||e.route.ErrorBoundary)&&(r.staticContext._deepestRenderedBoundaryId=e.route.id),H.createElement(Ji.Provider,{value:i},t)}function ZE(i,e=[],t){let r=t==null?void 0:t.state;if(i==null){if(!r)return null;if(r.errors)i=r.matches;else if(e.length===0&&!r.initialized&&r.matches.length>0)i=r.matches;else return null}let a=i,l=r==null?void 0:r.errors;if(l!=null){let m=a.findIndex(g=>g.route.id&&(l==null?void 0:l[g.route.id])!==void 0);rn(m>=0,`Could not find a matching route for errors on route IDs: ${Object.keys(l).join(",")}`),a=a.slice(0,Math.min(a.length,m+1))}let c=!1,d=-1;if(t&&r){c=r.renderFallback;for(let m=0;m<a.length;m++){let g=a[m];if((g.route.HydrateFallback||g.route.hydrateFallbackElement)&&(d=m),g.route.id){let{loaderData:x,errors:M}=r,E=g.route.loader&&!x.hasOwnProperty(g.route.id)&&(!M||M[g.route.id]===void 0);if(g.route.lazy||E){t.isStatic&&(c=!0),d>=0?a=a.slice(0,d+1):a=[a[0]];break}}}}let h=t==null?void 0:t.onError,f=r&&h?(m,g)=>{var x,M;h(m,{location:r.location,params:((M=(x=r.matches)==null?void 0:x[0])==null?void 0:M.params)??{},pattern:LE(r.matches),errorInfo:g})}:void 0;return a.reduceRight((m,g,x)=>{let M,E=!1,w=null,_=null;r&&(M=l&&g.route.id?l[g.route.id]:void 0,w=g.route.errorElement||YE,c&&(d<0&&x===0?(G_("route-fallback",!1,"No `HydrateFallback` element provided to render during initial hydration"),E=!0,_=null):d===x&&(E=!0,_=g.route.hydrateFallbackElement||null)));let y=e.concat(a.slice(0,x+1)),L=()=>{let P;return M?P=w:E?P=_:g.route.Component?P=H.createElement(g.route.Component,null):g.route.element?P=g.route.element:P=m,H.createElement(QE,{match:g,routeContext:{outlet:m,matches:y,isDataRoute:r!=null},children:P})};return r&&(g.route.ErrorBoundary||g.route.errorElement||x===0)?H.createElement(V_,{location:r.location,revalidation:r.revalidation,component:w,error:M,children:L(),routeContext:{outlet:null,matches:y,isDataRoute:!0},onError:f}):L()},null)}function xm(i){return`${i} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function JE(i){let e=H.useContext(zo);return rn(e,xm(i)),e}function e1(i){let e=H.useContext(fd);return rn(e,xm(i)),e}function t1(i){let e=H.useContext(Ji);return rn(e,xm(i)),e}function vm(i){let e=t1(i),t=e.matches[e.matches.length-1];return rn(t.route.id,`${i} can only be used on routes that contain a unique "id"`),t.route.id}function n1(){return vm("useRouteId")}function i1(){var r;let i=H.useContext(mm),e=e1("useRouteError"),t=vm("useRouteError");return i!==void 0?i:(r=e.errors)==null?void 0:r[t]}function r1(){let{router:i}=JE("useNavigate"),e=vm("useNavigate"),t=H.useRef(!1);return B_(()=>{t.current=!0}),H.useCallback(async(a,l={})=>{Ui(t.current,z_),t.current&&(typeof a=="number"?await i.navigate(a):await i.navigate(a,{fromRouteId:e,...l}))},[i,e])}var Ux={};function G_(i,e,t){!e&&!Ux[i]&&(Ux[i]=!0,Ui(!1,t))}H.memo(s1);function s1({routes:i,manifest:e,future:t,state:r,isStatic:a,onError:l}){return H_(i,void 0,{manifest:e,state:r,isStatic:a,onError:l})}function of({to:i,replace:e,state:t,relative:r}){rn(Bo(),"<Navigate> may be used only in the context of a <Router> component.");let{static:a}=H.useContext(Ei);Ui(!a,"<Navigate> must not be used on the initial render in a <StaticRouter>. This is a no-op, but you should modify your code so the <Navigate> is only ever rendered in response to some user interaction or state change.");let{matches:l}=H.useContext(Ji),{pathname:c}=er(),d=gm(),h=hd(i,pm(l),c,r==="path"),f=JSON.stringify(h);return H.useEffect(()=>{d(JSON.parse(f),{replace:e,state:t,relative:r})},[d,f,r,e,t]),null}function a1(i){return XE(i.context)}function $i(i){rn(!1,"A <Route> is only ever to be used as the child of <Routes> element, never rendered directly. Please wrap your <Route> in a <Routes>.")}function o1({basename:i="/",children:e=null,location:t,navigationType:r="POP",navigator:a,static:l=!1,useTransitions:c}){rn(!Bo(),"You cannot render a <Router> inside another <Router>. You should never have more than one in your app.");let d=i.replace(/^\/*/,"/"),h=H.useMemo(()=>({basename:d,navigator:a,static:l,useTransitions:c,future:{}}),[d,a,l,c]);typeof t=="string"&&(t=ko(t));let{pathname:f="/",search:m="",hash:g="",state:x=null,key:M="default",mask:E}=t,w=H.useMemo(()=>{let _=Xr(f,d);return _==null?null:{location:{pathname:_,search:m,hash:g,state:x,key:M,mask:E},navigationType:r}},[d,f,m,g,x,M,r,E]);return Ui(w!=null,`<Router basename="${d}"> is not able to match the URL "${f}${m}${g}" because it does not start with the basename, so the <Router> won't render anything.`),w==null?null:H.createElement(Ei.Provider,{value:h},H.createElement(Jl.Provider,{children:e,value:w}))}function l1({children:i,location:e}){return $E(dp(i),e)}function dp(i,e=[]){let t=[];return H.Children.forEach(i,(r,a)=>{if(!H.isValidElement(r))return;let l=[...e,a];if(r.type===H.Fragment){t.push.apply(t,dp(r.props.children,l));return}rn(r.type===$i,`[${typeof r.type=="string"?r.type:r.type.name}] is not a <Route> component. All component children of <Routes> must be a <Route> or <React.Fragment>`),rn(!r.props.index||!r.props.children,"An index route cannot have child routes.");let c={id:r.props.id||l.join("-"),caseSensitive:r.props.caseSensitive,element:r.props.element,Component:r.props.Component,index:r.props.index,path:r.props.path,middleware:r.props.middleware,loader:r.props.loader,action:r.props.action,hydrateFallbackElement:r.props.hydrateFallbackElement,HydrateFallback:r.props.HydrateFallback,errorElement:r.props.errorElement,ErrorBoundary:r.props.ErrorBoundary,hasErrorBoundary:r.props.hasErrorBoundary===!0||r.props.ErrorBoundary!=null||r.props.errorElement!=null,shouldRevalidate:r.props.shouldRevalidate,handle:r.props.handle,lazy:r.props.lazy};r.props.children&&(c.children=dp(r.props.children,l)),t.push(c)}),t}var Vu="get",Gu="application/x-www-form-urlencoded";function pd(i){return typeof HTMLElement<"u"&&i instanceof HTMLElement}function c1(i){return pd(i)&&i.tagName.toLowerCase()==="button"}function u1(i){return pd(i)&&i.tagName.toLowerCase()==="form"}function d1(i){return pd(i)&&i.tagName.toLowerCase()==="input"}function h1(i){return!!(i.metaKey||i.altKey||i.ctrlKey||i.shiftKey)}function f1(i,e){return i.button===0&&(!e||e==="_self")&&!h1(i)}function hp(i=""){return new URLSearchParams(typeof i=="string"||Array.isArray(i)||i instanceof URLSearchParams?i:Object.keys(i).reduce((e,t)=>{let r=i[t];return e.concat(Array.isArray(r)?r.map(a=>[t,a]):[[t,r]])},[]))}function p1(i,e){let t=hp(i);return e&&e.forEach((r,a)=>{t.has(a)||e.getAll(a).forEach(l=>{t.append(a,l)})}),t}var du=null;function m1(){if(du===null)try{new FormData(document.createElement("form"),0),du=!1}catch{du=!0}return du}var g1=new Set(["application/x-www-form-urlencoded","multipart/form-data","text/plain"]);function lf(i){return i!=null&&!g1.has(i)?(Ui(!1,`"${i}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${Gu}"`),null):i}function x1(i,e){let t,r,a,l,c;if(u1(i)){let d=i.getAttribute("action");r=d?Xr(d,e):null,t=i.getAttribute("method")||Vu,a=lf(i.getAttribute("enctype"))||Gu,l=new FormData(i)}else if(c1(i)||d1(i)&&(i.type==="submit"||i.type==="image")){let d=i.form;if(d==null)throw new Error('Cannot submit a <button> or <input type="submit"> without a <form>');let h=i.getAttribute("formaction")||d.getAttribute("action");if(r=h?Xr(h,e):null,t=i.getAttribute("formmethod")||d.getAttribute("method")||Vu,a=lf(i.getAttribute("formenctype"))||lf(d.getAttribute("enctype"))||Gu,l=new FormData(d,i),!m1()){let{name:f,type:m,value:g}=i;if(m==="image"){let x=f?`${f}.`:"";l.append(`${x}x`,"0"),l.append(`${x}y`,"0")}else f&&l.append(f,g)}}else{if(pd(i))throw new Error('Cannot submit element that is not <form>, <button>, or <input type="submit|image">');t=Vu,r=null,a=Gu,c=i}return l&&a==="text/plain"&&(c=l,l=void 0),{action:r,method:t.toLowerCase(),encType:a,formData:l,body:c}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");function _m(i,e){if(i===!1||i===null||typeof i>"u")throw new Error(e)}function j_(i,e,t,r){let a=typeof i=="string"?new URL(i,typeof window>"u"?"server://singlefetch/":window.location.origin):i;return t?a.pathname.endsWith("/")?a.pathname=`${a.pathname}_.${r}`:a.pathname=`${a.pathname}.${r}`:a.pathname==="/"?a.pathname=`_root.${r}`:e&&Xr(a.pathname,e)==="/"?a.pathname=`${nd(e)}/_root.${r}`:a.pathname=`${nd(a.pathname)}.${r}`,a}async function v1(i,e){if(i.id in e)return e[i.id];try{let t=await import(i.module);return e[i.id]=t,t}catch(t){return console.error(`Error loading route module \`${i.module}\`, reloading page...`),console.error(t),window.__reactRouterContext&&window.__reactRouterContext.isSpaMode,window.location.reload(),new Promise(()=>{})}}function _1(i){return i==null?!1:i.href==null?i.rel==="preload"&&typeof i.imageSrcSet=="string"&&typeof i.imageSizes=="string":typeof i.rel=="string"&&typeof i.href=="string"}async function y1(i,e,t){let r=await Promise.all(i.map(async a=>{let l=e.routes[a.route.id];if(l){let c=await v1(l,t);return c.links?c.links():[]}return[]}));return w1(r.flat(1).filter(_1).filter(a=>a.rel==="stylesheet"||a.rel==="preload").map(a=>a.rel==="stylesheet"?{...a,rel:"prefetch",as:"style"}:{...a,rel:"prefetch"}))}function Fx(i,e,t,r,a,l){let c=(h,f)=>t[f]?h.route.id!==t[f].route.id:!0,d=(h,f)=>{var m;return t[f].pathname!==h.pathname||((m=t[f].route.path)==null?void 0:m.endsWith("*"))&&t[f].params["*"]!==h.params["*"]};return l==="assets"?e.filter((h,f)=>c(h,f)||d(h,f)):l==="data"?e.filter((h,f)=>{var g;let m=r.routes[h.route.id];if(!m||!m.hasLoader)return!1;if(c(h,f)||d(h,f))return!0;if(h.route.shouldRevalidate){let x=h.route.shouldRevalidate({currentUrl:new URL(a.pathname+a.search+a.hash,window.origin),currentParams:((g=t[0])==null?void 0:g.params)||{},nextUrl:new URL(i,window.origin),nextParams:h.params,defaultShouldRevalidate:!0});if(typeof x=="boolean")return x}return!0}):[]}function S1(i,e,{includeHydrateFallback:t}={}){return M1(i.map(r=>{let a=e.routes[r.route.id];if(!a)return[];let l=[a.module];return a.clientActionModule&&(l=l.concat(a.clientActionModule)),a.clientLoaderModule&&(l=l.concat(a.clientLoaderModule)),t&&a.hydrateFallbackModule&&(l=l.concat(a.hydrateFallbackModule)),a.imports&&(l=l.concat(a.imports)),l}).flat(1))}function M1(i){return[...new Set(i)]}function E1(i){let e={},t=Object.keys(i).sort();for(let r of t)e[r]=i[r];return e}function w1(i,e){let t=new Set;return new Set(e),i.reduce((r,a)=>{let l=JSON.stringify(E1(a));return t.has(l)||(t.add(l),r.push({key:l,link:a})),r},[])}function ym(){let i=H.useContext(zo);return _m(i,"You must render this element inside a <DataRouterContext.Provider> element"),i}function b1(){let i=H.useContext(fd);return _m(i,"You must render this element inside a <DataRouterStateContext.Provider> element"),i}var Sm=H.createContext(void 0);Sm.displayName="FrameworkContext";function md(){let i=H.useContext(Sm);return _m(i,"You must render this element inside a <HydratedRouter> element"),i}function T1(i,e){let t=H.useContext(Sm),[r,a]=H.useState(!1),[l,c]=H.useState(!1),{onFocus:d,onBlur:h,onMouseEnter:f,onMouseLeave:m,onTouchStart:g}=e,x=H.useRef(null);H.useEffect(()=>{if(i==="render"&&c(!0),i==="viewport"){let w=y=>{y.forEach(L=>{c(L.isIntersecting)})},_=new IntersectionObserver(w,{threshold:.5});return x.current&&_.observe(x.current),()=>{_.disconnect()}}},[i]),H.useEffect(()=>{if(r){let w=setTimeout(()=>{c(!0)},100);return()=>{clearTimeout(w)}}},[r]);let M=()=>{a(!0)},E=()=>{a(!1),c(!1)};return t?i!=="intent"?[l,x,{}]:[l,x,{onFocus:bl(d,M),onBlur:bl(h,E),onMouseEnter:bl(f,M),onMouseLeave:bl(m,E),onTouchStart:bl(g,M)}]:[!1,x,{}]}function bl(i,e){return t=>{i&&i(t),t.defaultPrevented||e(t)}}function C1({page:i,...e}){let t=FE(),{nonce:r}=md(),{router:a}=ym(),l=H.useMemo(()=>C_(a.routes,i,a.basename),[a.routes,i,a.basename]);return l?(e.nonce==null&&r&&(e={...e,nonce:r}),t?H.createElement(A1,{page:i,matches:l,...e}):H.createElement(P1,{page:i,matches:l,...e})):null}function R1(i){let{manifest:e,routeModules:t}=md(),[r,a]=H.useState([]);return H.useEffect(()=>{let l=!1;return y1(i,e,t).then(c=>{l||a(c)}),()=>{l=!0}},[i,e,t]),r}function A1({page:i,matches:e,...t}){let r=er(),{future:a}=md(),{basename:l}=ym(),c=H.useMemo(()=>{if(i===r.pathname+r.search+r.hash)return[];let d=j_(i,l,a.v8_trailingSlashAwareDataRequests,"rsc"),h=!1,f=[];for(let m of e)typeof m.route.shouldRevalidate=="function"?h=!0:f.push(m.route.id);return h&&f.length>0&&d.searchParams.set("_routes",f.join(",")),[d.pathname+d.search]},[l,a.v8_trailingSlashAwareDataRequests,i,r,e]);return H.createElement(H.Fragment,null,c.map(d=>H.createElement("link",{key:d,rel:"prefetch",as:"fetch",href:d,...t})))}function P1({page:i,matches:e,...t}){let r=er(),{future:a,manifest:l,routeModules:c}=md(),{basename:d}=ym(),{loaderData:h,matches:f}=b1(),m=H.useMemo(()=>Fx(i,e,f,l,r,"data"),[i,e,f,l,r]),g=H.useMemo(()=>Fx(i,e,f,l,r,"assets"),[i,e,f,l,r]),x=H.useMemo(()=>{if(i===r.pathname+r.search+r.hash)return[];let w=new Set,_=!1;if(e.forEach(L=>{var C;let P=l.routes[L.route.id];!P||!P.hasLoader||(!m.some(F=>F.route.id===L.route.id)&&L.route.id in h&&((C=c[L.route.id])!=null&&C.shouldRevalidate)||P.hasClientLoader?_=!0:w.add(L.route.id))}),w.size===0)return[];let y=j_(i,d,a.v8_trailingSlashAwareDataRequests,"data");return _&&w.size>0&&y.searchParams.set("_routes",e.filter(L=>w.has(L.route.id)).map(L=>L.route.id).join(",")),[y.pathname+y.search]},[d,a.v8_trailingSlashAwareDataRequests,h,r,l,m,e,i,c]),M=H.useMemo(()=>S1(g,l),[g,l]),E=R1(g);return H.createElement(H.Fragment,null,x.map(w=>H.createElement("link",{key:w,rel:"prefetch",as:"fetch",href:w,...t})),M.map(w=>H.createElement("link",{key:w,rel:"modulepreload",href:w,...t})),E.map(({key:w,link:_})=>H.createElement("link",{key:w,nonce:t.nonce,..._,crossOrigin:_.crossOrigin??t.crossOrigin})))}function N1(...i){return e=>{i.forEach(t=>{typeof t=="function"?t(e):t!=null&&(t.current=e)})}}var L1=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";try{L1&&(window.__reactRouterVersion="7.18.0")}catch{}function D1({basename:i,children:e,useTransitions:t,window:r}){let a=H.useRef();a.current==null&&(a.current=lE({window:r,v5Compat:!0}));let l=a.current,[c,d]=H.useState({action:l.action,location:l.location}),h=H.useCallback(f=>{t===!1?d(f):H.startTransition(()=>d(f))},[t]);return H.useLayoutEffect(()=>l.listen(h),[l,h]),H.createElement(o1,{basename:i,children:e,location:c.location,navigationType:c.action,navigator:l,useTransitions:t})}var W_=H.forwardRef(function({onClick:e,discover:t="render",prefetch:r="none",relative:a,reloadDocument:l,replace:c,mask:d,state:h,target:f,to:m,preventScrollReset:g,viewTransition:x,defaultShouldRevalidate:M,...E},w){let{basename:_,navigator:y,useTransitions:L}=H.useContext(Ei),P=typeof m=="string"&&fm.test(m),C=I_(m,_);m=C.to;let F=GE(m,{relative:a}),N=er(),O=null;if(d){let k=hd(d,[],N.mask?N.mask.pathname:"/",!0);_!=="/"&&(k.pathname=k.pathname==="/"?_:Qi([_,k.pathname])),O=y.createHref(k)}let[b,U,G]=T1(r,E),D=F1(m,{replace:c,mask:d,state:h,target:f,preventScrollReset:g,relative:a,viewTransition:x,defaultShouldRevalidate:M,useTransitions:L});function K(k){e&&e(k),k.defaultPrevented||D(k)}let ne=!(C.isExternal||l),me=H.createElement("a",{...E,...G,href:(ne?O:void 0)||C.absoluteURL||F,onClick:ne?K:e,ref:N1(w,U),target:f,"data-discover":!P&&t==="render"?"true":void 0});return b&&!P?H.createElement(H.Fragment,null,me,H.createElement(C1,{page:F})):me});W_.displayName="Link";var mo=H.forwardRef(function({"aria-current":e="page",caseSensitive:t=!1,className:r="",end:a=!1,style:l,to:c,viewTransition:d,children:h,...f},m){let g=ec(c,{relative:f.relative}),x=er(),M=H.useContext(fd),{navigator:E,basename:w}=H.useContext(Ei),_=M!=null&&V1(g)&&d===!0,y=E.encodeLocation?E.encodeLocation(g).pathname:g.pathname,L=x.pathname,P=M&&M.navigation&&M.navigation.location?M.navigation.location.pathname:null;t||(L=L.toLowerCase(),P=P?P.toLowerCase():null,y=y.toLowerCase()),P&&w&&(P=Xr(P,w)||P);const C=y!=="/"&&y.endsWith("/")?y.length-1:y.length;let F=L===y||!a&&L.startsWith(y)&&L.charAt(C)==="/",N=P!=null&&(P===y||!a&&P.startsWith(y)&&P.charAt(y.length)==="/"),O={isActive:F,isPending:N,isTransitioning:_},b=F?e:void 0,U;typeof r=="function"?U=r(O):U=[r,F?"active":null,N?"pending":null,_?"transitioning":null].filter(Boolean).join(" ");let G=typeof l=="function"?l(O):l;return H.createElement(W_,{...f,"aria-current":b,className:U,ref:m,style:G,to:c,viewTransition:d},typeof h=="function"?h(O):h)});mo.displayName="NavLink";var I1=H.forwardRef(({discover:i="render",fetcherKey:e,navigate:t,reloadDocument:r,replace:a,state:l,method:c=Vu,action:d,onSubmit:h,relative:f,preventScrollReset:m,viewTransition:g,defaultShouldRevalidate:x,...M},E)=>{let{useTransitions:w}=H.useContext(Ei),_=B1(),y=H1(d,{relative:f}),L=c.toLowerCase()==="get"?"get":"post",P=typeof d=="string"&&fm.test(d),C=F=>{if(h&&h(F),F.defaultPrevented)return;F.preventDefault();let N=F.nativeEvent.submitter,O=(N==null?void 0:N.getAttribute("formmethod"))||c,b=()=>_(N||F.currentTarget,{fetcherKey:e,method:O,navigate:t,replace:a,state:l,relative:f,preventScrollReset:m,viewTransition:g,defaultShouldRevalidate:x});w&&t!==!1?H.startTransition(()=>b()):b()};return H.createElement("form",{ref:E,method:L,action:y,onSubmit:r?h:C,...M,"data-discover":!P&&i==="render"?"true":void 0})});I1.displayName="Form";function U1(i){return`${i} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function X_(i){let e=H.useContext(zo);return rn(e,U1(i)),e}function F1(i,{target:e,replace:t,mask:r,state:a,preventScrollReset:l,relative:c,viewTransition:d,defaultShouldRevalidate:h,useTransitions:f}={}){let m=gm(),g=er(),x=ec(i,{relative:c});return H.useCallback(M=>{if(f1(M,e)){M.preventDefault();let E=t!==void 0?t:Vl(g)===Vl(x),w=()=>m(i,{replace:E,mask:r,state:a,preventScrollReset:l,relative:c,viewTransition:d,defaultShouldRevalidate:h});f?H.startTransition(()=>w()):w()}},[g,m,x,t,r,a,e,i,l,c,d,h,f])}function O1(i){Ui(typeof URLSearchParams<"u","You cannot use the `useSearchParams` hook in a browser that does not support the URLSearchParams API. If you need to support Internet Explorer 11, we recommend you load a polyfill such as https://github.com/ungap/url-search-params.");let e=H.useRef(hp(i)),t=H.useRef(!1),r=er(),a=H.useMemo(()=>p1(r.search,t.current?null:e.current),[r.search]),l=gm(),c=H.useCallback((d,h)=>{const f=hp(typeof d=="function"?d(new URLSearchParams(a)):d);t.current=!0,l("?"+f,h)},[l,a]);return[a,c]}var k1=0,z1=()=>`__${String(++k1)}__`;function B1(){let{router:i}=X_("useSubmit"),{basename:e}=H.useContext(Ei),t=n1(),r=i.fetch,a=i.navigate;return H.useCallback(async(l,c={})=>{let{action:d,method:h,encType:f,formData:m,body:g}=x1(l,e);if(c.navigate===!1){let x=c.fetcherKey||z1();await r(x,t,c.action||d,{defaultShouldRevalidate:c.defaultShouldRevalidate,preventScrollReset:c.preventScrollReset,formData:m,body:g,formMethod:c.method||h,formEncType:c.encType||f,flushSync:c.flushSync})}else await a(c.action||d,{defaultShouldRevalidate:c.defaultShouldRevalidate,preventScrollReset:c.preventScrollReset,formData:m,body:g,formMethod:c.method||h,formEncType:c.encType||f,replace:c.replace,state:c.state,fromRouteId:t,flushSync:c.flushSync,viewTransition:c.viewTransition})},[r,a,e,t])}function H1(i,{relative:e}={}){let{basename:t}=H.useContext(Ei),r=H.useContext(Ji);rn(r,"useFormAction must be used inside a RouteContext");let[a]=r.matches.slice(-1),l={...ec(i||".",{relative:e})},c=er();if(i==null){l.search=c.search;let d=new URLSearchParams(l.search),h=d.getAll("index");if(h.some(m=>m==="")){d.delete("index"),h.filter(g=>g).forEach(g=>d.append("index",g));let m=d.toString();l.search=m?`?${m}`:""}}return(!i||i===".")&&a.route.index&&(l.search=l.search?l.search.replace(/^\?/,"?index&"):"?index"),t!=="/"&&(l.pathname=l.pathname==="/"?t:Qi([t,l.pathname])),Vl(l)}function V1(i,{relative:e}={}){let t=H.useContext(O_);rn(t!=null,"`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?");let{basename:r}=X_("useViewTransitionState"),a=ec(i,{relative:e});if(!t.isTransitioning)return!1;let l=Xr(t.currentLocation.pathname,r)||t.currentLocation.pathname,c=Xr(t.nextLocation.pathname,r)||t.nextLocation.pathname;return td(a.pathname,c)!=null||td(a.pathname,l)!=null}/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G1=i=>i.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),$_=(...i)=>i.filter((e,t,r)=>!!e&&e.trim()!==""&&r.indexOf(e)===t).join(" ").trim();/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var j1={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W1=H.forwardRef(({color:i="currentColor",size:e=24,strokeWidth:t=2,absoluteStrokeWidth:r,className:a="",children:l,iconNode:c,...d},h)=>H.createElement("svg",{ref:h,...j1,width:e,height:e,stroke:i,strokeWidth:r?Number(t)*24/Number(e):t,className:$_("lucide",a),...d},[...c.map(([f,m])=>H.createElement(f,m)),...Array.isArray(l)?l:[l]]));/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dt=(i,e)=>{const t=H.forwardRef(({className:r,...a},l)=>H.createElement(W1,{ref:l,iconNode:e,className:$_(`lucide-${G1(i)}`,r),...a}));return t.displayName=`${i}`,t};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X1=Dt("ArchiveRestore",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h2",key:"tvwodi"}],["path",{d:"M20 8v11a2 2 0 0 1-2 2h-2",key:"1gkqxj"}],["path",{d:"m9 15 3-3 3 3",key:"1pd0qc"}],["path",{d:"M12 12v9",key:"192myk"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $1=Dt("Archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q1=Dt("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y1=Dt("Box",[["path",{d:"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",key:"hh9hay"}],["path",{d:"m3.3 7 8.7 5 8.7-5",key:"g66t2b"}],["path",{d:"M12 22V12",key:"d0xqtd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K1=Dt("Boxes",[["path",{d:"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",key:"lc1i9w"}],["path",{d:"m7 16.5-4.74-2.85",key:"1o9zyk"}],["path",{d:"m7 16.5 5-3",key:"va8pkn"}],["path",{d:"M7 16.5v5.17",key:"jnp8gn"}],["path",{d:"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",key:"8zsnat"}],["path",{d:"m17 16.5-5-3",key:"8arw3v"}],["path",{d:"m17 16.5 4.74-2.85",key:"8rfmw"}],["path",{d:"M17 16.5v5.17",key:"k6z78m"}],["path",{d:"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",key:"1xygjf"}],["path",{d:"M12 8 7.26 5.15",key:"1vbdud"}],["path",{d:"m12 8 4.74-2.85",key:"3rx089"}],["path",{d:"M12 13.5V8",key:"1io7kd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mm=Dt("Camera",[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",key:"1tc9qg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q1=Dt("ChartLine",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z1=Dt("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J1=Dt("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ew=Dt("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q_=Dt("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tw=Dt("Crop",[["path",{d:"M6 2v14a2 2 0 0 0 2 2h14",key:"ron5a4"}],["path",{d:"M18 22V8a2 2 0 0 0-2-2H2",key:"7s9ehn"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nw=Dt("Crown",[["path",{d:"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",key:"1vdc57"}],["path",{d:"M5 21h14",key:"11awu3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iw=Dt("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ju=Dt("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rw=Dt("FlaskConical",[["path",{d:"M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2",key:"18mbvz"}],["path",{d:"M6.453 15h11.094",key:"3shlmq"}],["path",{d:"M8.5 2h7",key:"csnxdl"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ox=Dt("Hammer",[["path",{d:"m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9",key:"eefl8a"}],["path",{d:"m18 15 4-4",key:"16gjal"}],["path",{d:"m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5",key:"b7pghm"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sw=Dt("Image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aw=Dt("Images",[["path",{d:"M18 22H4a2 2 0 0 1-2-2V6",key:"pblm9e"}],["path",{d:"m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18",key:"nf6bnh"}],["circle",{cx:"12",cy:"8",r:"2",key:"1822b1"}],["rect",{width:"16",height:"16",x:"6",y:"2",rx:"2",key:"12espp"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nn=Dt("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ow=Dt("Maximize2",[["polyline",{points:"15 3 21 3 21 9",key:"mznyad"}],["polyline",{points:"9 21 3 21 3 15",key:"1avn1i"}],["line",{x1:"21",x2:"14",y1:"3",y2:"10",key:"ota7mn"}],["line",{x1:"3",x2:"10",y1:"21",y2:"14",key:"1atl0r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Em=Dt("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kx=Dt("Plug",[["path",{d:"M12 22v-5",key:"1ega77"}],["path",{d:"M9 8V2",key:"14iosj"}],["path",{d:"M15 8V2",key:"18g5xt"}],["path",{d:"M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z",key:"osxo6l"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lw=Dt("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cw=Dt("RotateCw",[["path",{d:"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",key:"1p45f6"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zx=Dt("Scissors",[["circle",{cx:"6",cy:"6",r:"3",key:"1lh9wr"}],["path",{d:"M8.12 8.12 12 12",key:"1alkpv"}],["path",{d:"M20 4 8.12 15.88",key:"xgtan2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["path",{d:"M14.8 14.8 20 20",key:"ptml3r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y_=Dt("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wa=Dt("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wm=Dt("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uw=Dt("Undo2",[["path",{d:"M9 14 4 9l5-5",key:"102s5s"}],["path",{d:"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11",key:"f3b9sd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K_=Dt("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bx=Dt("WandSparkles",[["path",{d:"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72",key:"ul74o6"}],["path",{d:"m14 7 3 3",key:"1r5n42"}],["path",{d:"M5 6v4",key:"ilb8ba"}],["path",{d:"M19 14v4",key:"blhpug"}],["path",{d:"M10 2v2",key:"7u0qdc"}],["path",{d:"M7 8H3",key:"zfb6yr"}],["path",{d:"M21 16h-4",key:"1cnmox"}],["path",{d:"M11 3H9",key:"1obp7u"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q_=Dt("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);async function nn(i,e){var r;const t=await fetch(i,e);if(!t.ok){let a="";try{a=((r=await t.json())==null?void 0:r.detail)??""}catch{}throw new Error(a||`HTTP ${t.status} (${i})`)}return t.json()}const fn=(i,e)=>nn(i,{method:"POST",headers:{"Content-Type":"application/json"},body:e!==void 0?JSON.stringify(e):void 0}),Gl=i=>nn(i,{method:"DELETE"}),dw={K:"♚",Q:"♛",R:"♜",B:"♝",N:"♞",P:"♟"};function Hx({label:i,className:e=""}){if(i==="empty")return v.jsx("span",{className:`text-zinc-500 ${e}`,children:"·"});if(i==="occluded")return v.jsx("span",{className:`text-amber-300 ${e}`,children:"▦"});const t=dw[i==null?void 0:i[1]]??i,r=(i==null?void 0:i[0])==="w";return v.jsx("span",{className:e,style:{color:r?"#fafafa":"#0a0a0a",textShadow:r?"0 0 1px #000, 0 1px 2px #000":"0 0 1px #fff, 0 1px 2px #fff"},children:t})}function pn({title:i,right:e,children:t,className:r=""}){return v.jsxs("div",{className:`rounded-xl border border-zinc-800 bg-zinc-900 p-4 ${r}`,children:[(i||e)&&v.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[i&&v.jsx("h2",{className:"text-xs font-medium uppercase tracking-wide text-zinc-400",children:i}),e]}),t]})}function Pt({children:i,variant:e="ghost",className:t="",onClick:r,disabled:a,...l}){const[c,d]=H.useState(!1),h=e==="primary"?"bg-sky-500 text-zinc-950 hover:bg-sky-400 font-medium":"bg-zinc-800 text-zinc-200 hover:bg-zinc-700";async function f(m){if(!r)return;const g=r(m);if(g&&typeof g.then=="function"){d(!0);try{await g}finally{d(!1)}}}return v.jsxs("button",{...l,onClick:f,disabled:a||c,className:`relative inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm transition
        disabled:cursor-not-allowed disabled:opacity-40 ${h} ${t}`,children:[v.jsx("span",{className:`inline-flex items-center gap-2 ${c?"invisible":""}`,children:i}),c&&v.jsx(Nn,{className:"absolute h-4 w-4 animate-spin"})]})}function oa({label:i,children:e,...t}){return v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:[i,v.jsx("select",{...t,className:"rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",children:e})]})}const hw={err:"bg-red-950/60 text-red-300",busy:"bg-sky-950/60 text-sky-300 animate-pulse",ok:"bg-emerald-950/60 text-emerald-300"},bm=i=>hw[i]??"text-zinc-500",cf="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";function fw({coverage:i,sweep:e,sets:t,setSets:r,count:a,setCount:l,passes:c,setPasses:d,pieces:h,setPieces:f,together:m,setTogether:g,offset:x,setOffset:M,autoOffset:E,setAutoOffset:w,maxPlies:_,setMaxPlies:y,input:L}){return i?v.jsxs(v.Fragment,{children:[v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Number of physical piece sets: with 2 sets, queens/kings come twice as fast.",children:["Sets",v.jsx("input",{type:"number",min:1,value:t,onChange:P=>r(+P.target.value),className:`${L} w-16`})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Number of dense setups generated against your weakest classes.",children:["Setups",v.jsx("input",{type:"number",min:1,value:a,onChange:P=>l(+P.target.value),className:`${L} w-20`})]})]}):e?v.jsxs(v.Fragment,{children:[v.jsxs("div",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Which pieces walk across the board: special = non-pawns (K,Q,R,B,N), pawn = only pawns, all = everything.",children:["Pieces",v.jsxs(oa,{label:"",value:h,onChange:P=>f(P.target.value),children:[v.jsx("option",{value:"special",children:"special (K,Q,R,B,N)"}),v.jsx("option",{value:"pawn",children:"pawn (only pawns)"}),v.jsx("option",{value:"all",children:"all"})]})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Repeats (each pass 8 photos, ranks 1–8) — e.g. with different lighting. No piece rearrangement.",children:["Passes",v.jsx("input",{type:"number",min:1,value:c,onChange:P=>d(+P.target.value),className:`${L} w-16`})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Number of physical piece sets: with 2 sets, twice as many pieces per photo possible.",children:["Sets",v.jsx("input",{type:"number",min:1,value:t,onChange:P=>r(+P.target.value),className:`${L} w-16`})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Both colors on the board at once (white in front, black 4 ranks offset) → half the photos, every square gets both colors.",children:[v.jsx("input",{type:"checkbox",checked:m,onChange:P=>g(P.target.checked)})," both colors at once"]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Auto offset: counts previous sweep sessions and picks the next offset → each piece lands on different files across sessions (prevents position overfitting).",children:[v.jsx("input",{type:"checkbox",checked:E,onChange:P=>w(P.target.checked)})," Offset auto"]}),!E&&v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Shifts the line→piece assignment, fixed for this session. 0: a=King,b=Queen,…  1: a=Queen,b=Rook,…",children:["Offset",v.jsx("input",{type:"number",min:0,max:7,value:x,onChange:P=>M(+P.target.value),className:`${L} w-16`})]})]}):v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Max plies",v.jsx("input",{type:"number",value:_,onChange:P=>y(+P.target.value),className:`${L} w-20`})]})}function pw(){const[i,e]=H.useState("random"),[t,r]=H.useState(40),[a,l]=H.useState(1),[c,d]=H.useState(20),[h,f]=H.useState(1),[m,g]=H.useState("special"),[x,M]=H.useState(!0),[E,w]=H.useState(0),[_,y]=H.useState(!0),[L,P]=H.useState("default"),[C,F]=H.useState(0),N=i==="coverage",O=i==="sweep",[b,U]=H.useState({active:!1}),[G,D]=H.useState(""),[K,ne]=H.useState(""),me=H.useRef(null);H.useEffect(()=>(nn("/api/collect/state").then(U).catch(()=>{}),()=>clearInterval(me.current)),[]);const k=()=>nn("/api/collect/state").then(U).catch(()=>{});async function he(){D(""),ne("");try{const X=await fn("/api/collect/start",{strategy:i,max_plies:t,profile:L,camera:C,sets:a,count:c,passes:h,pieces:m,together:x,offset:E,auto_offset:_});U(X),clearInterval(me.current),me.current=setInterval(k,1500)}catch(X){D("Error: "+X.message),ne("err")}}async function J(){D("Capturing..."),ne("busy");try{U(await fn("/api/collect/shoot")),D("Captured ✓"),ne("ok")}catch(X){D("Error: "+X.message),ne("err")}}async function $(){D("Skipping..."),ne("busy");try{U(await fn("/api/collect/skip")),D(""),ne("")}catch(X){D("Error: "+X.message),ne("err")}}async function ce(){D("Undoing..."),ne("busy");try{U(await fn("/api/collect/undo")),D("Undone ✓"),ne("ok")}catch(X){D("Error: "+X.message),ne("err")}}async function ue(){D("Finishing..."),ne("busy");try{const X=await fn("/api/collect/finish");clearInterval(me.current),U({active:!1}),D(`Session finished: ${X.captures} captures, ${X.sliced??0} crops sliced → Datasets tab.`),ne("ok")}catch(X){D("Error: "+X.message),ne("err")}}const z=bm(K);return v.jsxs("div",{className:"space-y-4",children:[v.jsxs(pn,{children:[v.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[v.jsxs(oa,{label:"Engine",value:i,onChange:X=>e(X.target.value),children:[v.jsx("option",{value:"random",children:"random (built-in)"}),v.jsx("option",{value:"stockfish",children:"stockfish (auto-detected)"}),v.jsx("option",{value:"coverage",children:"coverage (target rare classes)"}),v.jsx("option",{value:"sweep",children:"sweep (pieces walk the board)"})]}),v.jsx(fw,{coverage:N,sweep:O,input:cf,sets:a,setSets:l,count:c,setCount:d,passes:h,setPasses:f,pieces:m,setPieces:g,together:x,setTogether:M,offset:E,setOffset:w,autoOffset:_,setAutoOffset:y,maxPlies:t,setMaxPlies:r}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Profile",v.jsx("input",{value:L,onChange:X=>P(X.target.value),className:`${cf} w-28`})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Camera",v.jsx("input",{type:"number",value:C,onChange:X=>F(+X.target.value),className:`${cf} w-16`})]}),b.active?v.jsxs(Pt,{onClick:ue,children:[v.jsx(q_,{className:"h-4 w-4"})," Done"]}):v.jsxs(Pt,{variant:"primary",onClick:he,children:[v.jsx(Em,{className:"h-4 w-4"})," Start game"]})]}),G&&v.jsx("div",{className:`mt-2 rounded-lg px-3 py-1.5 text-sm ${z}`,children:G})]}),b.active&&v.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_320px]",children:[v.jsx(pn,{title:"Live camera",children:v.jsx("img",{src:"/api/camera/collect.mjpg",alt:"Live capture",className:"w-full rounded-lg border border-zinc-800"})}),v.jsx(pn,{title:"Capture",children:v.jsxs("div",{className:"space-y-3",children:[b.done?v.jsxs("div",{className:"font-medium text-green-500",children:["✓ All ",b.n_positions," positions captured."]}):v.jsxs(v.Fragment,{children:[v.jsx(mw,{st:b}),v.jsxs("div",{className:"flex flex-wrap gap-2",children:[!b.done&&v.jsxs(Pt,{variant:"primary",onClick:J,className:"px-5 py-2.5 text-base",children:[v.jsx(Mm,{className:"h-5 w-5"})," Photo"]}),!b.done&&v.jsxs(Pt,{onClick:$,children:[v.jsx(q1,{className:"h-4 w-4"})," Skip"]}),v.jsxs(Pt,{onClick:ce,children:[v.jsx(uw,{className:"h-4 w-4"})," Undo"]})]})]}),v.jsxs("div",{className:"text-sm",children:["Captures: ",v.jsx("b",{className:"text-sky-400",children:b.captures}),v.jsx("span",{className:"ml-1 text-xs text-green-500",children:"· instantly saved ✓"})]}),v.jsxs("p",{className:"text-xs text-zinc-500",children:["Each capture is ",v.jsx("b",{children:"saved instantly"}),' — you can press "Done" (above) any time or just stop; nothing is lost.']})]})})]}),v.jsxs("p",{className:"text-xs text-zinc-500",children:['After "Done" the session is sliced automatically. Curated datasets (dedup, rotation, split) are built in the ',v.jsx("b",{className:"text-zinc-300",children:"Datasets"})," tab."]})]})}function mw({st:i}){const e=Math.min(i.index+1,i.n_positions),t=i.build_target?"Setup":"Position",r=i.build_target&&i.gains?v.jsxs("span",{className:"ml-1 text-xs text-zinc-500",children:["· ",i.gains," target squares"]}):null;let a;i.build_target?a=v.jsxs(v.Fragment,{children:["Position ",v.jsx("b",{children:"set up fresh"})," — ",v.jsx("b",{className:"text-sky-300",children:"piece names"})," are overlaid on the live image (white = light text, black = dark),"]}):i.index===0?a=v.jsxs(v.Fragment,{children:["Set up the ",v.jsx("b",{children:"starting position"}),","]}):a=v.jsxs(v.Fragment,{children:["Play this move: ",v.jsx("b",{className:"text-base text-sky-300",children:i.move_san})," ",v.jsx("span",{className:"text-zinc-400",children:"(red arrow)"}),","]});const l=i.build_target?v.jsx(v.Fragment,{children:"(feel free to take several with varying light)"}):null;return v.jsxs(v.Fragment,{children:[v.jsxs("div",{className:"text-sm text-zinc-400",children:[t," ",v.jsx("b",{className:"text-zinc-100",children:e})," / ",i.n_positions,r]}),v.jsxs("div",{className:"rounded-lg bg-zinc-800 p-3 text-sm",children:[a,v.jsxs("div",{className:"mt-1 text-xs text-zinc-400",children:["…then ",v.jsx("b",{children:"Photo"}),l,"."]})]})]})}const fo="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-sky-500",uf=({isActive:i})=>`rounded-lg px-3 py-1.5 text-sm transition ${i?"bg-zinc-800 text-zinc-100":"text-zinc-400 hover:text-zinc-100"}`;function gw(){return v.jsxs("div",{className:"space-y-4",children:[v.jsxs("nav",{className:"flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5",children:[v.jsx(mo,{to:"sessions",className:uf,children:"Sessions"}),v.jsx(mo,{to:"curated",className:uf,children:"Curated datasets"}),v.jsx(mo,{to:"stats",className:uf,children:"Statistics"})]}),v.jsx(a1,{})]})}const Z_=()=>{const i=hm();return(...e)=>e.forEach(t=>i.invalidateQueries({queryKey:[t]}))};function xw(){var G;const i=Z_(),[e,t]=H.useState(""),[r,a]=H.useState(""),[l,c]=H.useState(""),[d,h]=H.useState(0),f=Ea({queryKey:["sessions-manage"],queryFn:()=>nn("/api/sessions/manage")}),m=Ea({queryKey:["session-review",l,d],queryFn:()=>nn(`/api/sessions/${encodeURIComponent(l)}/review?idx=${d}`),enabled:!!l}),g=f.data??[],x=g.filter(D=>!D.variant),M=g.filter(D=>D.variant),E=D=>{t(D),a("ok"),i("sessions-manage","stats","datasets")},w=D=>{t("Error: "+D.message),a("err")},_=D=>{t(D),a("busy")},y=Es({mutationFn:D=>fn(`/api/sessions/${D}/slice`),onMutate:D=>_(`slicing "${D}" ...`),onSuccess:D=>E(`"${D.session}" sliced: ${D.crops} crops.`),onError:w}),L=D=>{c(D),h(0)},P=()=>{c(""),h(0)},C=m.data,F=(()=>{var D,K;if(C){const ne=(D=C.entry)!=null&&D.move_san?` | ${C.entry.move_san}`:"",me=((K=C.entry)==null?void 0:K.ply)!==void 0?` | ply ${C.entry.ply}`:"";return`Frame ${C.index+1} / ${C.count}${ne}${me}`}return m.isError?"Could not load session details.":"Loading session details..."})(),N=Es({mutationFn:D=>fn(`/api/sessions/${D}/archive`),onSuccess:()=>E("archived."),onError:w}),O=Es({mutationFn:D=>fn(`/api/sessions/${D}/restore`),onSuccess:()=>E("restored — re-slice."),onError:w}),b=Es({mutationFn:D=>Gl(`/api/sessions/${D}`),onSuccess:()=>E("deleted."),onError:w}),U=Es({mutationFn:({sid:D,keep_frames:K})=>fn(`/api/sessions/${D}/trim`,{keep_frames:K}),onSuccess:D=>{E(`trimmed "${D.session_id}": kept ${D.kept_frames}, moved ${D.removed_frames} to rejects.`),h(K=>Math.min(K,Math.max(0,D.kept_frames-1))),i("session-review")},onError:w});return v.jsxs(pn,{title:"Sessions (raw material)",right:v.jsxs("span",{className:"text-xs text-zinc-500",children:[x.length," camera / ",M.length," ingested"]}),children:[e&&v.jsx("div",{className:`mb-2 rounded-lg px-3 py-1.5 text-sm ${bm(r)}`,children:e}),x.length===0?v.jsx("span",{className:"text-sm text-zinc-500",children:"No sessions yet — capture some in the Collect tab."}):v.jsxs("table",{className:"w-full text-sm",children:[v.jsx("thead",{children:v.jsxs("tr",{className:"text-zinc-500",children:[v.jsx("th",{className:"text-left font-normal",children:"Session"}),v.jsx("th",{className:"text-left font-normal",children:"Mode"}),v.jsx("th",{className:"text-right font-normal",children:"Frames"}),v.jsx("th",{className:"text-right font-normal",children:"Crops"}),v.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),v.jsx("tbody",{children:x.map(D=>v.jsxs("tr",{className:"border-t border-zinc-800",children:[v.jsxs("td",{className:"py-1.5 text-zinc-200",children:[D.session_id,D.archived&&v.jsx("span",{className:"ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300",children:"archived"}),!D.archived&&D.n_crops===0&&v.jsx("span",{className:"ml-2 rounded bg-amber-900/60 px-1.5 py-0.5 text-[10px] text-amber-300",children:"not sliced"})]}),v.jsx("td",{className:"text-zinc-400",children:D.mode??"—"}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:D.n_frames}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:D.archived?"—":D.n_crops}),v.jsx("td",{className:"py-1",children:v.jsxs("div",{className:"flex justify-end gap-1.5",children:[v.jsxs(Pt,{onClick:()=>L(D.session_id),disabled:!D.n_frames,className:"px-2 py-1 text-xs disabled:opacity-50",children:[v.jsx(ju,{className:"h-3.5 w-3.5"})," Review"]}),!D.archived&&v.jsxs(Pt,{onClick:()=>y.mutate(D.session_id),disabled:y.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[y.isPending&&y.variables===D.session_id?v.jsx(Nn,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(zx,{className:"h-3.5 w-3.5"})," ",D.n_crops?"Re-slice":"Slice"]}),D.archived?v.jsxs(Pt,{onClick:()=>O.mutateAsync(D.session_id),disabled:O.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[O.isPending&&O.variables===D.session_id?v.jsx(Nn,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(X1,{className:"h-3.5 w-3.5"})," Restore"]}):v.jsxs(Pt,{onClick:()=>N.mutateAsync(D.session_id),disabled:N.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[N.isPending&&N.variables===D.session_id?v.jsx(Nn,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx($1,{className:"h-3.5 w-3.5"})," Archive"]}),v.jsxs(Pt,{onClick:()=>window.confirm(`Delete session "${D.session_id}" permanently?`)&&b.mutateAsync(D.session_id),disabled:b.isPending,className:"px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50",children:[b.isPending&&b.variables===D.session_id?v.jsx(Nn,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(wa,{className:"h-3.5 w-3.5"})," Delete"]})]})})]},D.session_id))})]}),l&&v.jsxs("div",{className:"mt-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3",children:[v.jsxs("div",{className:"mb-3 flex flex-wrap items-center justify-between gap-2",children:[v.jsxs("div",{children:[v.jsx("div",{className:"text-sm font-medium text-zinc-200",children:l}),v.jsx("div",{className:"text-xs text-zinc-500",children:F}),C&&v.jsxs("div",{className:"text-[11px] text-zinc-600",children:["Trim keeps this frame included; only frames after it move to the reject bucket and leave training data.",C.index>=C.count-1?" This is already the last frame.":""]})]}),v.jsxs("div",{className:"flex items-center gap-1.5",children:[v.jsxs(Pt,{onClick:()=>h(D=>Math.max(0,D-1)),disabled:!C||C.index<=0,className:"px-2 py-1 text-xs disabled:opacity-50",title:"Previous frame",children:[v.jsx(J1,{className:"h-3.5 w-3.5"})," Prev"]}),v.jsxs(Pt,{onClick:()=>h(D=>Math.min(((C==null?void 0:C.count)??1)-1,D+1)),disabled:!C||C.index>=C.count-1,className:"px-2 py-1 text-xs disabled:opacity-50",title:"Next frame",children:["Next ",v.jsx(ew,{className:"h-3.5 w-3.5"})]}),v.jsxs(Pt,{onClick:P,className:"px-2 py-1 text-xs",children:[v.jsx(Q_,{className:"h-3.5 w-3.5"})," Close"]}),v.jsxs(Pt,{onClick:()=>{const D=((C==null?void 0:C.index)??0)+1;window.confirm(`Keep frames 1-${D}, including the current frame. Move all later frames to the reject bucket and remove them from training data?`)&&U.mutate({sid:l,keep_frames:D})},disabled:!C||C.index>=C.count-1||U.isPending,className:"px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50",title:"Keeps the current frame; moves only later frames to the reject bucket and removes their crops from training data",children:[U.isPending?v.jsx(Nn,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(zx,{className:"h-3.5 w-3.5"}),"Keep through this frame"]})]})]}),m.isError&&v.jsx("div",{className:"rounded-lg bg-red-950/60 px-3 py-1.5 text-sm text-red-300",children:m.error.message}),C&&v.jsxs("div",{className:"grid gap-3 lg:grid-cols-2",children:[v.jsxs("div",{children:[v.jsxs("div",{className:"mb-1 text-xs font-medium text-zinc-500",children:["ArUco-aligned frame",C.overlay_available?"":" (raw fallback)"]}),v.jsx("img",{src:C.overlay_url,alt:`${l} overlay ${C.index+1}`,className:"max-h-[70vh] w-full rounded border border-zinc-800 object-contain"})]}),v.jsxs("div",{children:[v.jsx("div",{className:"mb-1 text-xs font-medium text-zinc-500",children:"Logged board"}),v.jsx("img",{src:C.board_url,alt:`${l} board ${C.index+1}`,className:"max-h-[70vh] w-full rounded border border-zinc-800 bg-zinc-100 object-contain"}),v.jsx("div",{className:"mt-2 break-all rounded bg-zinc-900 px-2 py-1 text-[11px] text-zinc-500",children:(G=C.entry)==null?void 0:G.fen})]})]})]}),M.length>0&&v.jsxs(v.Fragment,{children:[v.jsx("div",{className:"mt-5 mb-1 text-sm font-medium text-zinc-300",children:"Ingested datasets (pretrain variants)"}),v.jsxs("p",{className:"mb-2 text-xs text-zinc-500",children:["Imported via ",v.jsx("code",{children:"chesslab ingest"}),". Their crops live in a separate variant manifest (",v.jsx("code",{children:"squares__<tag>.jsonl"}),") and never mix with your camera dataset — train on them with ",v.jsx("code",{children:"train --dataset <tag>"}),". No slicing here."]}),v.jsxs("table",{className:"w-full text-sm",children:[v.jsx("thead",{children:v.jsxs("tr",{className:"text-zinc-500",children:[v.jsx("th",{className:"text-left font-normal",children:"Session"}),v.jsx("th",{className:"text-left font-normal",children:"Variant"}),v.jsx("th",{className:"text-right font-normal",children:"Frames"}),v.jsx("th",{className:"text-right font-normal",children:"Variant crops"}),v.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),v.jsx("tbody",{children:M.map(D=>v.jsxs("tr",{className:"border-t border-zinc-800",children:[v.jsxs("td",{className:"py-1.5 text-zinc-200",children:[D.session_id,D.archived&&v.jsx("span",{className:"ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300",children:"archived"})]}),v.jsx("td",{children:v.jsx("span",{className:"rounded bg-indigo-950/60 px-1.5 py-0.5 text-[10px] text-indigo-300",children:D.variant})}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:D.n_frames}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:D.n_crops}),v.jsx("td",{className:"py-1",children:v.jsx("div",{className:"flex justify-end gap-1.5",children:v.jsxs(Pt,{onClick:()=>{window.confirm(`Delete ingested session "${D.session_id}"? (variant crops stay; re-ingest to recreate)`)&&b.mutateAsync(D.session_id)},disabled:b.isPending,className:"px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50",children:[b.isPending&&b.variables===D.session_id?v.jsx(Nn,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(wa,{className:"h-3.5 w-3.5"})," Delete"]})})})]},D.session_id))})]})]})]})}function vw(){const i=Z_(),[e,t]=H.useState(""),[r,a]=H.useState(""),[l,c]=H.useState(!1),[d,h]=H.useState(""),[f,m]=H.useState({}),[g,x]=H.useState(4),[M,E]=H.useState(!0),[w,_]=H.useState(6),[y,L]=H.useState(!0),[P,C]=H.useState(.15),[F,N]=H.useState(.15),O=Ea({queryKey:["sessions-manage"],queryFn:()=>nn("/api/sessions/manage")}),b=Ea({queryKey:["datasets"],queryFn:()=>nn("/api/datasets")}),U=(O.data??[]).filter(k=>!k.archived),G=b.data??[],D=Es({mutationFn:k=>fn("/api/datasets",k),onSuccess:k=>{t(`"${k.name}" built: raw ${k.counts.raw} → dedup ${k.counts.after_dedup} → final ${k.counts.final}.`),a("ok"),c(!1),h(""),m({}),i("datasets","stats")},onError:k=>{t("Error: "+k.message),a("err")}}),K=Es({mutationFn:k=>Gl(`/api/datasets/${k}`),onSuccess:()=>{t("deleted."),a("ok"),i("datasets")},onError:k=>{t("Error: "+k.message),a("err")}}),ne=Es({mutationFn:k=>fn(`/api/datasets/${k}/rebuild`),onSuccess:k=>{var he;t(`"${k.name}" rebuilt: ${(he=k.counts)==null?void 0:he.final} crops.`),a("ok"),i("datasets","stats")},onError:k=>{t("Error: "+k.message),a("err")}});function me(){const k=U.filter(he=>f[he.session_id]).map(he=>he.session_id);if(!d.trim()||k.length===0){t("Name and at least one session required.");return}D.mutate({name:d.trim(),session_ids:k,per_cell_cap:g,phash_enabled:M,phash_hamming:w,rotate:y,val_frac:P,test_frac:F})}return v.jsxs(pn,{title:"Curated datasets",right:v.jsxs("div",{className:"flex items-center gap-2",children:[e&&v.jsx("span",{className:`rounded-lg px-2 py-0.5 text-xs ${bm(r)}`,children:e}),v.jsxs(Pt,{onClick:()=>c(k=>!k),className:"px-2 py-1 text-xs",children:[v.jsx(K1,{className:"h-3.5 w-3.5"})," New Dataset"]})]}),children:[l&&v.jsxs("div",{className:"mb-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3",children:[v.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["Name",v.jsx("input",{value:d,onChange:k=>h(k.target.value),className:`${fo} w-40`,placeholder:"e.g. set-a"})]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",title:"max. crops per (session, square, piece)",children:["Cap/cell",v.jsx("input",{type:"number",min:1,value:g,onChange:k=>x(+k.target.value),className:`${fo} w-16`})]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:[v.jsx("input",{type:"checkbox",checked:M,onChange:k=>E(k.target.checked)})," pHash"]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["Hamming",v.jsx("input",{type:"number",min:0,max:32,value:w,disabled:!M,onChange:k=>_(+k.target.value),className:`${fo} w-14`})]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",title:"90/180/270° → 4× crops. WARNING: violates the fixed-camera assumption — A/B test.",children:[v.jsx("input",{type:"checkbox",checked:y,onChange:k=>L(k.target.checked)})," ",v.jsx(cw,{className:"h-3.5 w-3.5"})," Rotation"]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["val",v.jsx("input",{type:"number",step:.05,min:0,max:.5,value:P,onChange:k=>C(+k.target.value),className:`${fo} w-14`})]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["test",v.jsx("input",{type:"number",step:.05,min:0,max:.5,value:F,onChange:k=>N(+k.target.value),className:`${fo} w-14`})]})]}),v.jsxs("div",{children:[v.jsx("div",{className:"mb-1 text-xs text-zinc-500",children:"Sessions (freely selectable subset — datasets may overlap):"}),v.jsx("div",{className:"flex flex-wrap gap-2",children:U.length===0?v.jsx("span",{className:"text-xs text-zinc-500",children:"no active sessions"}):U.map(k=>v.jsxs("label",{className:"flex items-center gap-1.5 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300",children:[v.jsx("input",{type:"checkbox",checked:!!f[k.session_id],onChange:he=>m(J=>({...J,[k.session_id]:he.target.checked}))}),k.session_id," ",v.jsxs("span",{className:"text-zinc-500",children:["(",k.n_crops,")"]})]},k.session_id))})]}),v.jsxs(Pt,{variant:"primary",onClick:me,disabled:D.isPending,children:[D.isPending?v.jsx(Nn,{className:"h-4 w-4 animate-spin"}):v.jsx(Ox,{className:"h-4 w-4"})," ",D.isPending?"Building…":"Build"]})]}),G.length===0?v.jsx("span",{className:"text-sm text-zinc-500",children:"No dataset built yet."}):v.jsxs("table",{className:"w-full text-sm",children:[v.jsx("thead",{children:v.jsxs("tr",{className:"text-zinc-500",children:[v.jsx("th",{className:"text-left font-normal",children:"Dataset"}),v.jsx("th",{className:"text-right font-normal",children:"Sessions"}),v.jsx("th",{className:"text-right font-normal",children:"raw→dedup→final"}),v.jsx("th",{className:"text-right font-normal",children:"train/val/test"}),v.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),v.jsx("tbody",{children:G.map(k=>{var he,J,$,ce,ue,z,X;return v.jsxs("tr",{className:"border-t border-zinc-800",children:[v.jsxs("td",{className:"py-1.5 text-zinc-200",children:[k.name,((he=k.rotations)==null?void 0:he.some(Ue=>Ue))&&v.jsx("span",{className:"ml-2 text-[10px] text-zinc-500",children:"+rot"})]}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:k.n_sessions}),v.jsxs("td",{className:"text-right tabular-nums text-zinc-400",children:[(J=k.counts)==null?void 0:J.raw,"→",($=k.counts)==null?void 0:$.after_dedup,"→",(ce=k.counts)==null?void 0:ce.final]}),v.jsxs("td",{className:"text-right tabular-nums text-zinc-400",children:[((ue=k.split_counts)==null?void 0:ue.train)??"?","/",((z=k.split_counts)==null?void 0:z.val)??"?","/",((X=k.split_counts)==null?void 0:X.test)??"?"]}),v.jsx("td",{className:"py-1",children:v.jsxs("div",{className:"flex justify-end gap-1.5",children:[v.jsx(mo,{to:`../stats?ds=${encodeURIComponent(k.name)}`,className:"inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700",children:"Stats"}),v.jsxs(Pt,{onClick:()=>ne.mutateAsync(k.name),disabled:ne.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[ne.isPending&&ne.variables===k.name?v.jsx(Nn,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(Ox,{className:"h-3.5 w-3.5"})," Rebuild"]}),v.jsxs(Pt,{onClick:()=>{window.confirm(`Delete dataset "${k.name}"?`)&&K.mutateAsync(k.name)},disabled:K.isPending,className:"px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50",children:[K.isPending&&K.variables===k.name?v.jsx(Nn,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(wa,{className:"h-3.5 w-3.5"})," Delete"]})]})})]},k.name)})})]})]})}function _w(){const[i,e]=O1(),t=i.get("ds")??"",[r,a]=H.useState(null),l=Ea({queryKey:["datasets"],queryFn:()=>nn("/api/datasets")}),c=Ea({queryKey:["stats",t],queryFn:()=>{const w=t?`?dataset=${encodeURIComponent(t)}`:"";return nn(`/api/stats${w}`)}}),d=l.data??[],h=c.data,[f,m]=H.useState("");if(c.isLoading||!h)return v.jsx(pn,{title:"Stats",children:"Loading…"});const g=t?`Dataset "${t}"`:"global pool",x=Math.max(1,...Object.values(h.counts??{x:1})),M=(w,_)=>w==="empty"||w==="occluded"?"#38bdf8":_<h.min_samples*.5?"#ef4444":_<h.min_samples?"#eab308":"#22c55e",E=w=>{const _=t?`&dataset=${encodeURIComponent(t)}`:"";m(""),nn(`/api/class/${w}?limit=120${_}`).then(y=>a({label:w,crops:y.crops})).catch(y=>m(y.message))};return v.jsxs("div",{className:"space-y-4",children:[v.jsxs("div",{className:"grid gap-4 lg:grid-cols-3",children:[v.jsxs(pn,{title:"Class distribution",className:"lg:col-span-2",right:v.jsxs("select",{value:t,onChange:w=>e(w.target.value?{ds:w.target.value}:{}),className:fo,children:[v.jsx("option",{value:"",children:"global pool"}),d.map(w=>v.jsx("option",{value:w.name,children:w.name},w.name))]}),children:[v.jsxs("div",{className:"mb-2 text-xs text-zinc-500",children:[h.total," crops · ",h.num_sessions," sessions",t?` · Dataset "${t}"`:" · raw"]}),v.jsx("div",{className:"space-y-1.5",children:h.classes.map(w=>{const _=h.counts[w]||0;return v.jsxs("button",{onClick:()=>E(w),className:"grid w-full grid-cols-[2rem_1fr_3rem] items-center gap-3 rounded px-1 py-0.5 text-left hover:bg-zinc-800",children:[v.jsxs("span",{className:"text-zinc-300",children:[v.jsx(Hx,{label:w}),v.jsx("span",{className:"ml-1 text-xs text-zinc-500",children:w})]}),v.jsx("div",{className:"h-2.5 overflow-hidden rounded-full bg-zinc-800",children:v.jsx("div",{className:"h-full rounded-full",style:{width:`${_/x*100}%`,background:M(w,_)}})}),v.jsx("span",{className:"text-right text-sm tabular-nums text-zinc-400",children:_})]},w)})})]}),v.jsx(pn,{title:"Light / Dark",children:v.jsxs("table",{className:"w-full text-sm",children:[v.jsx("thead",{children:v.jsxs("tr",{className:"text-zinc-500",children:[v.jsx("th",{className:"text-left font-normal",children:"Class"}),v.jsx("th",{children:"light"}),v.jsx("th",{children:"dark"})]})}),v.jsx("tbody",{children:h.classes.map(w=>{const _=y=>y>0?v.jsx(Z1,{className:"mx-auto h-4 w-4 text-green-500"}):v.jsx(Q_,{className:"mx-auto h-4 w-4 text-red-500"});return v.jsxs("tr",{className:"border-t border-zinc-800",children:[v.jsxs("td",{className:"py-1 text-zinc-300",children:[v.jsx(Hx,{label:w})," ",v.jsx("span",{className:"text-xs text-zinc-500",children:w})]}),v.jsx("td",{children:_(h.light[w]||0)}),v.jsx("td",{children:_(h.dark[w]||0)})]},w)})})]})})]}),v.jsx(pn,{title:"Warnings",children:h.warnings.length?v.jsx("ul",{className:"space-y-1 text-sm",children:h.warnings.map((w,_)=>v.jsxs("li",{className:"flex items-center gap-2 text-amber-400",children:[v.jsx(wm,{className:"h-4 w-4 shrink-0"})," ",w]},_))}):v.jsx("span",{className:"text-sm text-green-500",children:"none"})}),v.jsxs(pn,{title:`Browse crops (${g})`,right:v.jsxs("span",{className:"flex items-center gap-1 text-xs text-zinc-500",children:[v.jsx(aw,{className:"h-3.5 w-3.5"}),r?`${r.label} (${r.crops.length})`:"Click a class"]}),children:[f&&v.jsx("div",{className:"mb-2 rounded-lg bg-red-950/60 px-3 py-1.5 text-sm text-red-300",children:f}),r?v.jsx("div",{className:"grid grid-cols-[repeat(auto-fill,56px)] gap-1.5",children:r.crops.map((w,_)=>v.jsx("img",{src:w.url,title:`${w.session_id} ${w.frame} ${w.square}`,alt:`square ${w.square}`,className:"h-[74px] w-[56px] rounded border border-zinc-800 object-cover"},_))}):v.jsx("span",{className:"text-sm text-zinc-500",children:"Select a class on the left to view crops."})]})]})}function Vx({series:i,yMin:e=0,yMax:t=1}){const c=i.flatMap(g=>g.data.map(x=>x.x)),d=Math.max(1,...c),h=g=>30+540*g/d,f=g=>170-140*(g-e)/Math.max(1e-9,t-e),m=4;return v.jsxs("div",{children:[v.jsxs("svg",{viewBox:"0 0 600 200",className:"w-full",style:{height:200},preserveAspectRatio:"none",children:[Array.from({length:m+1},(g,x)=>{const M=e+(t-e)*x/m;return v.jsxs("g",{children:[v.jsx("line",{x1:30,y1:f(M),x2:570,y2:f(M),stroke:"#27272a",strokeWidth:1}),v.jsx("text",{x:4,y:f(M)+3,fill:"#71717a",fontSize:10,children:M.toFixed(t<=1?2:1)})]},x)}),i.map(g=>g.data.length?v.jsx("polyline",{fill:"none",stroke:g.color,strokeWidth:2,strokeLinejoin:"round",points:g.data.map(x=>`${h(x.x).toFixed(1)},${f(x.y).toFixed(1)}`).join(" ")},g.name):null)]}),v.jsx("div",{className:"mt-1 flex flex-wrap gap-4 text-xs text-zinc-400",children:i.map(g=>v.jsxs("span",{className:"flex items-center gap-1.5",children:[v.jsx("span",{className:"inline-block h-2 w-2 rounded-full",style:{background:g.color}}),g.name]},g.name))})]})}const hu="w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100";function yw(i){const e={};for(const t of i)e[t.true]||(e[t.true]=[]),e[t.true].push(t);return Object.values(e)}function Sw({groups:i}){return v.jsx("div",{className:"mt-3 space-y-3",children:i.map(e=>v.jsxs("div",{className:"flex items-start gap-3",children:[v.jsx("div",{className:"w-10 shrink-0 pt-6 text-right text-sm font-medium text-zinc-400",children:e[0].true}),v.jsx("div",{className:"flex flex-wrap gap-3",children:e.map((t,r)=>v.jsxs("div",{className:"text-center",children:[v.jsxs("div",{className:"grid grid-cols-2 gap-0.5",children:[v.jsx("img",{src:t.orig,alt:t.true,className:"w-12 rounded border border-zinc-800"}),v.jsx("img",{src:t.overlay,alt:"Grad-CAM",className:"w-12 rounded border border-zinc-800"})]}),v.jsxs("div",{className:"mt-1 text-xs",children:[t.pred!==t.true?v.jsxs("span",{className:"text-amber-500",children:["→",t.pred]}):v.jsx("span",{className:"text-zinc-600",children:"✓"}),v.jsxs("span",{className:"text-zinc-600",children:[" ",(t.prob*100).toFixed(0),"%"]})]})]},r))})]},e[0].true))})}function Mw({items:i}){return v.jsx("div",{className:"mt-3 space-y-1",children:i.map(e=>{const t=Math.round(e.piece_frac*100),r=e.cls!=="empty"&&t<45;return v.jsxs("div",{className:"flex items-center gap-2 text-xs",children:[v.jsx("div",{className:`w-10 shrink-0 text-right font-medium ${r?"text-rose-400":"text-zinc-400"}`,children:e.cls}),v.jsxs("div",{className:"flex h-4 flex-1 overflow-hidden rounded bg-zinc-800",children:[v.jsx("div",{className:"h-full bg-emerald-600",style:{width:`${t}%`}}),v.jsx("div",{className:"h-full bg-rose-700",style:{width:`${100-t}%`}})]}),v.jsxs("div",{className:"w-28 shrink-0 text-zinc-500",children:[t,"% piece · conf ",(e.base_prob*100).toFixed(0),"%"]})]},e.cls)})})}function Ew(){var Ft,q,un;const[i,e]=H.useState([]),[t,r]=H.useState(""),[a,l]=H.useState(""),[c,d]=H.useState([]),[h,f]=H.useState({}),[m,g]=H.useState({running:!1}),[x,M]=H.useState(""),[E,w]=H.useState("smallcnn"),[_,y]=H.useState("combined"),[L,P]=H.useState(30),[C,F]=H.useState(256),[N,O]=H.useState(3e-4),[b,U]=H.useState(7),[G,D]=H.useState(""),[K,ne]=H.useState([]),[me,k]=H.useState(!1),[he,J]=H.useState(3),[$,ce]=H.useState([]),[ue,z]=H.useState(!1),X=H.useRef(null),He=Ea({queryKey:["datasets"],queryFn:()=>nn("/api/datasets")}).data??[],Ve=He.find(de=>de.name===a);H.useEffect(()=>{if(!He.length||a)return;const de=window.setTimeout(()=>l(He[0].name),0);return()=>window.clearTimeout(de)},[He,a]);const oe=H.useCallback(async()=>{const de=await nn("/api/runs");e(de),de.length&&!t&&Se(de[0].run)},[t]);H.useEffect(()=>{const de=window.setTimeout(()=>{oe()},0);return()=>{window.clearTimeout(de),clearInterval(X.current)}},[oe]);async function Se(de){r(de),M(""),ne([]),ce([]);try{d((await nn(`/api/runs/${de}/metrics`)).metrics),f((await nn(`/api/runs/${de}/eval`)).evals)}catch(I){M(I.message)}}async function ve(){if(t){k(!0),M("");try{ne((await nn(`/api/runs/${t}/gradcam?per_class=${he}`)).items)}catch(de){M(de.message)}finally{k(!1)}}}async function Oe(){if(t){z(!0),M("");try{ce((await nn(`/api/runs/${t}/reliance`)).items)}catch(de){M(de.message)}finally{z(!1)}}}async function Je(de){M("");try{const I=await fn(`/api/runs/${de}/eval`,{});if(!I.ok){M(I.output||"eval failed");return}t===de&&Se(de),oe()}catch(I){M(I.message)}}async function nt(de){if(window.confirm(`Delete model "${de}"? (directory + weights will be removed)`)){try{await Gl(`/api/runs/${de}`)}catch(I){M(I.message);return}M(""),t===de&&(r(""),d([]),f({}),ne([]),ce([])),oe()}}const Ut=de=>de==null?"—":(de*100).toFixed(1)+" %";async function dt(){if(M(""),!a){M("No dataset — build one in the Datasets tab first.");return}try{await fn("/api/train",{backbone:E,head:_,epochs:L,batch_size:C,lr:N,patience:b,no_amp:!0,dataset:a,resume:G||void 0}),clearInterval(X.current),X.current=setInterval(Tt,2500),Tt()}catch(de){M(de.message)}}async function Tt(){var I;const de=await nn("/api/train/status");g(de),(I=de.metrics)!=null&&I.length&&d(de.metrics),de.running||(clearInterval(X.current),oe())}async function St(){var de;try{await fn("/api/train/stop")}catch{}clearInterval(X.current);try{const I=await nn("/api/train/status");g({...I,running:!1}),I.run&&r(I.run),(de=I.metrics)!=null&&de.length&&d(I.metrics)}catch{g({running:!1,state:"stopped"})}oe()}const vt=[{name:"train_loss",color:"#ef4444",data:c.map(de=>({x:de.epoch,y:de.train_loss}))},{name:"val_loss",color:"#eab308",data:c.map(de=>({x:de.epoch,y:de.val_loss??0}))}],Gt=Math.max(.5,...c.map(de=>Math.max(de.train_loss||0,de.val_loss||0))),$t=[{name:"square_acc",color:"#38bdf8",data:c.map(de=>({x:de.epoch,y:de.val_acc??0}))},{name:"macro_recall",color:"#22c55e",data:c.map(de=>({x:de.epoch,y:de.val_macro_recall??0}))},{name:"board_acc",color:"#e4e4e7",data:c.map(de=>({x:de.epoch,y:de.val_board_acc??0}))}],qt=K.length?"Recompute":"Show heatmaps",jt=yw(K),wt=$.length?"Recompute":"Run test";return v.jsxs("div",{className:"space-y-4",children:[v.jsxs(pn,{children:[v.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[v.jsxs(oa,{label:"Dataset",value:a,onChange:de=>l(de.target.value),children:[He.length===0&&v.jsx("option",{value:"",children:"— none built —"}),He.map(de=>{var I;return v.jsxs("option",{value:de.name,children:[de.name," (",((I=de.counts)==null?void 0:I.final)??"?",")"]},de.name)})]}),v.jsxs(oa,{label:"Backbone",value:E,onChange:de=>w(de.target.value),title:"CNN architecture: smallcnn (lightweight custom), mobilenet_v3/v4 (fast mobile), efficientnet/resnet (timm — heavier, more accurate)",children:[v.jsx("option",{value:"smallcnn",children:"smallcnn"}),v.jsx("option",{value:"mobilenet_v3_small",children:"mobilenet_v3_small"}),v.jsx("option",{value:"mobilenetv4_conv_small",children:"mobilenetv4_conv_small (timm)"}),v.jsx("option",{value:"mobilenetv4_conv_medium",children:"mobilenetv4_conv_medium (timm)"}),v.jsx("option",{value:"efficientnet_b0",children:"efficientnet_b0 (timm)"}),v.jsx("option",{value:"resnet18",children:"resnet18 (timm)"})]}),v.jsxs(oa,{label:"Head",value:_,onChange:de=>y(de.target.value),title:"Classification head: combined (single fc), factored (type+color), twostage (occupancy then piece identity)",children:[v.jsx("option",{value:"combined",children:"combined"}),v.jsx("option",{value:"factored",children:"factored"}),v.jsx("option",{value:"twostage",children:"twostage (Occ→Piece)"})]}),v.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Number of full passes over the training data. More epochs = more learning, but risk of overfitting.",children:["Epochs",v.jsx("input",{type:"number",min:1,value:L,onChange:de=>P(+de.target.value),className:hu})]}),v.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Samples processed at once. Larger batch = faster training, more GPU memory. Small batches (32-64) generalize better.",children:["Batch",v.jsx("input",{type:"number",min:1,value:C,onChange:de=>F(+de.target.value),className:hu})]}),v.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Learning rate: step size for gradient descent. Higher = faster learning but may overshoot; 0.0003 is a safe default for AdamW.",children:["LR",v.jsx("input",{type:"number",step:1e-4,min:0,value:N,onChange:de=>O(+de.target.value),className:hu})]}),v.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Early stopping: epochs without macro_recall progress before aborting.",children:["Patience",v.jsx("input",{type:"number",min:1,value:b,onChange:de=>U(+de.target.value),className:hu})]}),v.jsxs(oa,{label:"Resume",value:G,onChange:de=>D(de.target.value),children:[v.jsx("option",{value:"",children:"from scratch"}),i.some(de=>String(de.dataset||"").startsWith("pretrain-"))&&v.jsx("optgroup",{label:"Base models (pretrained)",children:i.filter(de=>String(de.dataset||"").startsWith("pretrain-")).map(de=>v.jsxs("option",{value:de.run,children:["🔹 Base · ",de.run]},de.run))}),v.jsx("optgroup",{label:"Own runs",children:i.filter(de=>!String(de.dataset||"").startsWith("pretrain-")).map(de=>v.jsx("option",{value:de.run,children:de.run},de.run))})]}),v.jsxs(Pt,{variant:"primary",onClick:dt,disabled:m.running||!a,children:[m.running?v.jsx(Nn,{className:"h-4 w-4 animate-spin"}):v.jsx(Em,{className:"h-4 w-4"})," Start training"]}),m.running&&v.jsxs(Pt,{onClick:St,children:[v.jsx(Y_,{className:"h-4 w-4"})," Cancel"]})]}),Ve&&v.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:["Split: train ",((Ft=Ve.split_counts)==null?void 0:Ft.train)??"?"," · val ",((q=Ve.split_counts)==null?void 0:q.val)??"?"," · test ",((un=Ve.split_counts)==null?void 0:un.test)??"?"]}),(m.running||c.length>0)&&v.jsxs("div",{className:"mt-3",children:[v.jsxs("div",{className:"mb-1 flex justify-between text-xs text-zinc-400",children:[v.jsxs("span",{children:[m.running?`running… (${m.run})`:m.state==="stopped"||m.state==="crashed"?"aborted":"Progress"," · epoch ",c.length,"/",L]}),v.jsxs("span",{children:["board_acc ",c.length?((c[c.length-1].val_board_acc??0)*100).toFixed(1)+" %":"—"]})]}),v.jsx("div",{className:"h-2 overflow-hidden rounded-full bg-zinc-800",children:v.jsx("div",{className:`h-full rounded-full transition-all ${m.state==="stopped"||m.state==="crashed"?"bg-amber-500":"bg-sky-500"}`,style:{width:`${Math.min(100,c.length/Math.max(1,L)*100)}%`}})})]}),!m.running&&m.state==="done"&&v.jsx("p",{className:"mt-2 text-xs text-green-500",children:"done ✓"}),!m.running&&(m.state==="stopped"||m.state==="crashed")&&v.jsxs("p",{className:"mt-2 text-xs text-amber-400",children:[m.state==="crashed"?"aborted (crash)":"aborted"," at epoch ",c.length,' — partial progress is preserved; "best.pt" saved, "Resume" picks up here.']}),x&&v.jsx("p",{className:"mt-2 text-sm text-amber-400",children:x})]}),v.jsxs(pn,{title:"Models",right:v.jsxs("span",{className:"text-xs text-zinc-500",children:[i.length," Run(s)"]}),children:[i.length===0?v.jsx("span",{className:"text-sm text-zinc-500",children:"No model trained yet."}):v.jsx("div",{className:"overflow-x-auto",children:v.jsxs("table",{className:"w-full text-sm",children:[v.jsx("thead",{children:v.jsxs("tr",{className:"text-zinc-500",children:[v.jsx("th",{className:"text-left font-normal",children:"Run"}),v.jsx("th",{className:"text-left font-normal",children:"Backbone"}),v.jsx("th",{className:"text-left font-normal",children:"Dataset"}),v.jsx("th",{className:"text-right font-normal",children:"Cls"}),v.jsx("th",{className:"text-right font-normal",children:"Ep."}),"                ",v.jsx("th",{className:"text-right font-normal",title:"best val board_acc (all 64 squares correct)",children:"board_acc"}),v.jsx("th",{className:"text-right font-normal",title:"best val square_acc (fraction of correct squares — drives board_acc ≈ square_acc^64)",children:"square_acc"}),v.jsx("th",{className:"text-right font-normal",title:"best val macro_recall",children:"macro_rec"}),v.jsx("th",{className:"text-right font-normal",title:"test-set board_acc (after eval)",children:"test"}),v.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),v.jsx("tbody",{children:i.map(de=>v.jsxs("tr",{className:`border-t border-zinc-800 ${t===de.run?"bg-zinc-800/50":""}`,children:[v.jsxs("td",{className:"py-1.5 text-zinc-200",children:[de.run,de.resumed_from&&v.jsx("span",{className:"ml-1 text-[10px] text-zinc-500",title:`resumed from ${de.resumed_from}`,children:"↻"}),de.has_occluded&&v.jsx("span",{className:"ml-1 rounded bg-zinc-700 px-1 text-[9px] text-amber-300",children:"+occ"})]}),v.jsx("td",{className:"text-zinc-400",children:de.backbone}),v.jsx("td",{className:"text-zinc-400",children:de.dataset??"—"}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:de.n_classes}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:de.epochs_done}),v.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:Ut(de.best_board_acc)}),v.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:Ut(de.best_square_acc)}),v.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:Ut(de.best_macro_recall)}),v.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:Ut(de.test_board_acc)}),v.jsx("td",{className:"py-1",children:v.jsxs("div",{className:"flex justify-end gap-1.5",children:[v.jsxs(Pt,{onClick:()=>Se(de.run),className:"px-2 py-1 text-xs",children:[v.jsx(ju,{className:"h-3.5 w-3.5"})," View"]}),v.jsxs(Pt,{onClick:()=>Je(de.run),className:"px-2 py-1 text-xs",title:"Run eval (test split) — generates metrics + confusion matrix",children:[v.jsx(rw,{className:"h-3.5 w-3.5"})," Eval"]}),v.jsxs(Pt,{onClick:()=>nt(de.run),className:"px-2 py-1 text-xs text-red-300 hover:text-red-200",children:[v.jsx(wa,{className:"h-3.5 w-3.5"})," Delete"]})]})})]},de.run))})]})}),v.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:['"View" loads curves & eval below · "test" appears after ',v.jsx("code",{children:"chesslab eval --run …"}),' · ↻ = continued training · +occ = model knows "occluded" class.']})]}),v.jsxs("div",{className:"grid gap-4 lg:grid-cols-2",children:[v.jsx(pn,{title:"Loss",children:v.jsx(Vx,{series:vt,yMin:0,yMax:Gt})}),v.jsx(pn,{title:"Metrics (0-1) — macro_recall is the honest number",children:v.jsx(Vx,{series:$t,yMin:0,yMax:1})})]}),v.jsx(pn,{title:"Evaluation",children:Object.keys(h).length?v.jsx("div",{className:"space-y-4",children:Object.entries(h).map(([de,I])=>{const T=Object.entries(I.recall||{}).sort((Z,re)=>Z[1]-re[1]).slice(0,3);return v.jsxs("div",{children:[v.jsxs("div",{className:"text-sm",children:[v.jsx("span",{className:"font-medium uppercase text-zinc-400",children:de})," · board_acc ",v.jsxs("b",{children:[(I.board_acc*100).toFixed(1),"%"]})," · square_acc ",(I.square_acc*100).toFixed(1),"%"]}),v.jsxs("div",{className:"text-xs text-zinc-500",children:["weakest classes: ",T.map(([Z,re])=>`${Z} ${(re*100).toFixed(0)}%`).join(", ")]}),I.confusion_png&&v.jsx("img",{src:I.confusion_png,alt:"Confusion Matrix",className:"mt-2 max-w-md rounded-lg border border-zinc-800"})]},de)})}):v.jsxs("span",{className:"text-sm text-zinc-500",children:["No eval yet — ",v.jsx("code",{children:"chesslab eval --run …"})]})}),v.jsxs(pn,{title:"Grad-CAM — which pixels drove the decision",children:[v.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[v.jsx(oa,{label:"Samples / class",value:String(he),onChange:de=>J(+de.target.value),children:[1,2,3,5,8].map(de=>v.jsx("option",{value:de,children:de},de))}),v.jsxs(Pt,{onClick:ve,disabled:!t||me,children:[me?v.jsx(Nn,{className:"h-4 w-4 animate-spin"}):v.jsx(ju,{className:"h-4 w-4"}),me?"Computing…":qt]}),v.jsx("span",{className:"text-xs text-zinc-500",children:"Test crops per class · each pair = original + heatmap; red = pixels most relevant to the predicted class."})]}),jt.length>0&&v.jsx(Sw,{groups:jt})]}),v.jsxs(pn,{title:"Background reliance — does it read the piece or the board?",children:[v.jsxs("div",{className:"flex items-center gap-3",children:[v.jsxs(Pt,{onClick:Oe,disabled:!t||ue,children:[ue?v.jsx(Nn,{className:"h-4 w-4 animate-spin"}):v.jsx(ju,{className:"h-4 w-4"}),ue?"Testing…":wt]}),v.jsxs("span",{className:"text-xs text-zinc-500",children:["Occludes piece (center) vs. board (border ring) and measures the confidence drop. ",v.jsx("span",{className:"text-emerald-500",children:"green = piece"})," / ",v.jsx("span",{className:"text-rose-500",children:"red = background"}),". Low green on a piece class = shortcut learning. (",v.jsx("code",{children:"empty"})," is expected to be red.)"]})]}),$.length>0&&v.jsx(Mw,{items:$})]}),m.log_tail&&v.jsx(pn,{title:"Log",children:v.jsx("pre",{className:"max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 text-xs text-zinc-400",children:m.log_tail})})]})}/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Tm="185",go={ROTATE:0,DOLLY:1,PAN:2},po={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},ww=0,Gx=1,bw=2,Wu=1,Tw=2,Ul=3,Fs=0,hi=1,hr=2,Gr=0,xo=1,jx=2,Wx=3,Xx=4,Cw=5,la=100,Rw=101,Aw=102,Pw=103,Nw=104,Lw=200,Dw=201,Iw=202,Uw=203,fp=204,pp=205,Fw=206,Ow=207,kw=208,zw=209,Bw=210,Hw=211,Vw=212,Gw=213,jw=214,mp=0,gp=1,xp=2,Do=3,vp=4,_p=5,yp=6,Sp=7,Cm=0,Ww=1,Xw=2,mr=0,J_=1,ey=2,ty=3,Rm=4,ny=5,iy=6,ry=7,sy=300,ba=301,Io=302,df=303,hf=304,gd=306,Mp=1e3,Vr=1001,Ep=1002,Fn=1003,$w=1004,fu=1005,Wn=1006,ff=1007,da=1008,Si=1009,ay=1010,oy=1011,jl=1012,Am=1013,vr=1014,fr=1015,$r=1016,Pm=1017,Nm=1018,Wl=1020,ly=35902,cy=35899,uy=1021,dy=1022,Ki=1023,qr=1026,ha=1027,hy=1028,Lm=1029,Ta=1030,Dm=1031,Im=1033,Xu=33776,$u=33777,qu=33778,Yu=33779,wp=35840,bp=35841,Tp=35842,Cp=35843,Rp=36196,Ap=37492,Pp=37496,Np=37488,Lp=37489,id=37490,Dp=37491,Ip=37808,Up=37809,Fp=37810,Op=37811,kp=37812,zp=37813,Bp=37814,Hp=37815,Vp=37816,Gp=37817,jp=37818,Wp=37819,Xp=37820,$p=37821,qp=36492,Yp=36494,Kp=36495,Qp=36283,Zp=36284,rd=36285,Jp=36286,qw=3200,sd=0,Yw=1,ws="",Jn="srgb",ad="srgb-linear",od="linear",Vt="srgb",Qa=7680,$x=519,Kw=512,Qw=513,Zw=514,Um=515,Jw=516,eb=517,Fm=518,tb=519,qx=35044,Yx="300 es",pr=2e3,Xl=2001;function nb(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function $l(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function ib(){const i=$l("canvas");return i.style.display="block",i}const Kx={};function Qx(...i){const e="THREE."+i.shift();console.log(e,...i)}function fy(i){const e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function ct(...i){i=fy(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function Lt(...i){i=fy(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function vo(...i){const e=i.join(" ");e in Kx||(Kx[e]=!0,ct(...i))}function rb(i,e,t){return new Promise(function(r,a){function l(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:a();break;case i.TIMEOUT_EXPIRED:setTimeout(l,t);break;default:r()}}setTimeout(l,t)})}const sb={[mp]:gp,[xp]:yp,[vp]:Sp,[Do]:_p,[gp]:mp,[yp]:xp,[Sp]:vp,[_p]:Do};class ks{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const r=this._listeners;r[e]===void 0&&(r[e]=[]),r[e].indexOf(t)===-1&&r[e].push(t)}hasEventListener(e,t){const r=this._listeners;return r===void 0?!1:r[e]!==void 0&&r[e].indexOf(t)!==-1}removeEventListener(e,t){const r=this._listeners;if(r===void 0)return;const a=r[e];if(a!==void 0){const l=a.indexOf(t);l!==-1&&a.splice(l,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const r=t[e.type];if(r!==void 0){e.target=this;const a=r.slice(0);for(let l=0,c=a.length;l<c;l++)a[l].call(this,e);e.target=null}}}const Vn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Ku=Math.PI/180,em=180/Math.PI;function tc(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(Vn[i&255]+Vn[i>>8&255]+Vn[i>>16&255]+Vn[i>>24&255]+"-"+Vn[e&255]+Vn[e>>8&255]+"-"+Vn[e>>16&15|64]+Vn[e>>24&255]+"-"+Vn[t&63|128]+Vn[t>>8&255]+"-"+Vn[t>>16&255]+Vn[t>>24&255]+Vn[r&255]+Vn[r>>8&255]+Vn[r>>16&255]+Vn[r>>24&255]).toLowerCase()}function bt(i,e,t){return Math.max(e,Math.min(t,i))}function ab(i,e){return(i%e+e)%e}function pf(i,e,t){return(1-t)*i+t*e}function Tl(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function li(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}const ob={DEG2RAD:Ku},Vm=class Vm{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,r=this.y,a=e.elements;return this.x=a[0]*t+a[3]*r+a[6],this.y=a[1]*t+a[4]*r+a[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=bt(this.x,e.x,t.x),this.y=bt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=bt(this.x,e,t),this.y=bt(this.y,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(bt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const r=this.dot(e)/t;return Math.acos(bt(r,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,r=this.y-e.y;return t*t+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const r=Math.cos(t),a=Math.sin(t),l=this.x-e.x,c=this.y-e.y;return this.x=l*r-c*a+e.x,this.y=l*a+c*r+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};Vm.prototype.isVector2=!0;let ht=Vm;class Os{constructor(e=0,t=0,r=0,a=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=r,this._w=a}static slerpFlat(e,t,r,a,l,c,d){let h=r[a+0],f=r[a+1],m=r[a+2],g=r[a+3],x=l[c+0],M=l[c+1],E=l[c+2],w=l[c+3];if(g!==w||h!==x||f!==M||m!==E){let _=h*x+f*M+m*E+g*w;_<0&&(x=-x,M=-M,E=-E,w=-w,_=-_);let y=1-d;if(_<.9995){const L=Math.acos(_),P=Math.sin(L);y=Math.sin(y*L)/P,d=Math.sin(d*L)/P,h=h*y+x*d,f=f*y+M*d,m=m*y+E*d,g=g*y+w*d}else{h=h*y+x*d,f=f*y+M*d,m=m*y+E*d,g=g*y+w*d;const L=1/Math.sqrt(h*h+f*f+m*m+g*g);h*=L,f*=L,m*=L,g*=L}}e[t]=h,e[t+1]=f,e[t+2]=m,e[t+3]=g}static multiplyQuaternionsFlat(e,t,r,a,l,c){const d=r[a],h=r[a+1],f=r[a+2],m=r[a+3],g=l[c],x=l[c+1],M=l[c+2],E=l[c+3];return e[t]=d*E+m*g+h*M-f*x,e[t+1]=h*E+m*x+f*g-d*M,e[t+2]=f*E+m*M+d*x-h*g,e[t+3]=m*E-d*g-h*x-f*M,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,r,a){return this._x=e,this._y=t,this._z=r,this._w=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const r=e._x,a=e._y,l=e._z,c=e._order,d=Math.cos,h=Math.sin,f=d(r/2),m=d(a/2),g=d(l/2),x=h(r/2),M=h(a/2),E=h(l/2);switch(c){case"XYZ":this._x=x*m*g+f*M*E,this._y=f*M*g-x*m*E,this._z=f*m*E+x*M*g,this._w=f*m*g-x*M*E;break;case"YXZ":this._x=x*m*g+f*M*E,this._y=f*M*g-x*m*E,this._z=f*m*E-x*M*g,this._w=f*m*g+x*M*E;break;case"ZXY":this._x=x*m*g-f*M*E,this._y=f*M*g+x*m*E,this._z=f*m*E+x*M*g,this._w=f*m*g-x*M*E;break;case"ZYX":this._x=x*m*g-f*M*E,this._y=f*M*g+x*m*E,this._z=f*m*E-x*M*g,this._w=f*m*g+x*M*E;break;case"YZX":this._x=x*m*g+f*M*E,this._y=f*M*g+x*m*E,this._z=f*m*E-x*M*g,this._w=f*m*g-x*M*E;break;case"XZY":this._x=x*m*g-f*M*E,this._y=f*M*g-x*m*E,this._z=f*m*E+x*M*g,this._w=f*m*g+x*M*E;break;default:ct("Quaternion: .setFromEuler() encountered an unknown order: "+c)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const r=t/2,a=Math.sin(r);return this._x=e.x*a,this._y=e.y*a,this._z=e.z*a,this._w=Math.cos(r),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,r=t[0],a=t[4],l=t[8],c=t[1],d=t[5],h=t[9],f=t[2],m=t[6],g=t[10],x=r+d+g;if(x>0){const M=.5/Math.sqrt(x+1);this._w=.25/M,this._x=(m-h)*M,this._y=(l-f)*M,this._z=(c-a)*M}else if(r>d&&r>g){const M=2*Math.sqrt(1+r-d-g);this._w=(m-h)/M,this._x=.25*M,this._y=(a+c)/M,this._z=(l+f)/M}else if(d>g){const M=2*Math.sqrt(1+d-r-g);this._w=(l-f)/M,this._x=(a+c)/M,this._y=.25*M,this._z=(h+m)/M}else{const M=2*Math.sqrt(1+g-r-d);this._w=(c-a)/M,this._x=(l+f)/M,this._y=(h+m)/M,this._z=.25*M}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let r=e.dot(t)+1;return r<1e-8?(r=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=r):(this._x=0,this._y=-e.z,this._z=e.y,this._w=r)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=r),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(bt(this.dot(e),-1,1)))}rotateTowards(e,t){const r=this.angleTo(e);if(r===0)return this;const a=Math.min(1,t/r);return this.slerp(e,a),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const r=e._x,a=e._y,l=e._z,c=e._w,d=t._x,h=t._y,f=t._z,m=t._w;return this._x=r*m+c*d+a*f-l*h,this._y=a*m+c*h+l*d-r*f,this._z=l*m+c*f+r*h-a*d,this._w=c*m-r*d-a*h-l*f,this._onChangeCallback(),this}slerp(e,t){let r=e._x,a=e._y,l=e._z,c=e._w,d=this.dot(e);d<0&&(r=-r,a=-a,l=-l,c=-c,d=-d);let h=1-t;if(d<.9995){const f=Math.acos(d),m=Math.sin(f);h=Math.sin(h*f)/m,t=Math.sin(t*f)/m,this._x=this._x*h+r*t,this._y=this._y*h+a*t,this._z=this._z*h+l*t,this._w=this._w*h+c*t,this._onChangeCallback()}else this._x=this._x*h+r*t,this._y=this._y*h+a*t,this._z=this._z*h+l*t,this._w=this._w*h+c*t,this.normalize();return this}slerpQuaternions(e,t,r){return this.copy(e).slerp(t,r)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),r=Math.random(),a=Math.sqrt(1-r),l=Math.sqrt(r);return this.set(a*Math.sin(e),a*Math.cos(e),l*Math.sin(t),l*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}const Gm=class Gm{constructor(e=0,t=0,r=0){this.x=e,this.y=t,this.z=r}set(e,t,r){return r===void 0&&(r=this.z),this.x=e,this.y=t,this.z=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Zx.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Zx.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,r=this.y,a=this.z,l=e.elements;return this.x=l[0]*t+l[3]*r+l[6]*a,this.y=l[1]*t+l[4]*r+l[7]*a,this.z=l[2]*t+l[5]*r+l[8]*a,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,r=this.y,a=this.z,l=e.elements,c=1/(l[3]*t+l[7]*r+l[11]*a+l[15]);return this.x=(l[0]*t+l[4]*r+l[8]*a+l[12])*c,this.y=(l[1]*t+l[5]*r+l[9]*a+l[13])*c,this.z=(l[2]*t+l[6]*r+l[10]*a+l[14])*c,this}applyQuaternion(e){const t=this.x,r=this.y,a=this.z,l=e.x,c=e.y,d=e.z,h=e.w,f=2*(c*a-d*r),m=2*(d*t-l*a),g=2*(l*r-c*t);return this.x=t+h*f+c*g-d*m,this.y=r+h*m+d*f-l*g,this.z=a+h*g+l*m-c*f,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,r=this.y,a=this.z,l=e.elements;return this.x=l[0]*t+l[4]*r+l[8]*a,this.y=l[1]*t+l[5]*r+l[9]*a,this.z=l[2]*t+l[6]*r+l[10]*a,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=bt(this.x,e.x,t.x),this.y=bt(this.y,e.y,t.y),this.z=bt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=bt(this.x,e,t),this.y=bt(this.y,e,t),this.z=bt(this.z,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(bt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this.z=e.z+(t.z-e.z)*r,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const r=e.x,a=e.y,l=e.z,c=t.x,d=t.y,h=t.z;return this.x=a*h-l*d,this.y=l*c-r*h,this.z=r*d-a*c,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const r=e.dot(this)/t;return this.copy(e).multiplyScalar(r)}projectOnPlane(e){return mf.copy(this).projectOnVector(e),this.sub(mf)}reflect(e){return this.sub(mf.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const r=this.dot(e)/t;return Math.acos(bt(r,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,r=this.y-e.y,a=this.z-e.z;return t*t+r*r+a*a}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,r){const a=Math.sin(t)*e;return this.x=a*Math.sin(r),this.y=Math.cos(t)*e,this.z=a*Math.cos(r),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,r){return this.x=e*Math.sin(t),this.y=r,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),r=this.setFromMatrixColumn(e,1).length(),a=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=r,this.z=a,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,r=Math.sqrt(1-t*t);return this.x=r*Math.cos(e),this.y=t,this.z=r*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};Gm.prototype.isVector3=!0;let ee=Gm;const mf=new ee,Zx=new Os,jm=class jm{constructor(e,t,r,a,l,c,d,h,f){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,r,a,l,c,d,h,f)}set(e,t,r,a,l,c,d,h,f){const m=this.elements;return m[0]=e,m[1]=a,m[2]=d,m[3]=t,m[4]=l,m[5]=h,m[6]=r,m[7]=c,m[8]=f,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,r=e.elements;return t[0]=r[0],t[1]=r[1],t[2]=r[2],t[3]=r[3],t[4]=r[4],t[5]=r[5],t[6]=r[6],t[7]=r[7],t[8]=r[8],this}extractBasis(e,t,r){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),r.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const r=e.elements,a=t.elements,l=this.elements,c=r[0],d=r[3],h=r[6],f=r[1],m=r[4],g=r[7],x=r[2],M=r[5],E=r[8],w=a[0],_=a[3],y=a[6],L=a[1],P=a[4],C=a[7],F=a[2],N=a[5],O=a[8];return l[0]=c*w+d*L+h*F,l[3]=c*_+d*P+h*N,l[6]=c*y+d*C+h*O,l[1]=f*w+m*L+g*F,l[4]=f*_+m*P+g*N,l[7]=f*y+m*C+g*O,l[2]=x*w+M*L+E*F,l[5]=x*_+M*P+E*N,l[8]=x*y+M*C+E*O,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],m=e[8];return t*c*m-t*d*f-r*l*m+r*d*h+a*l*f-a*c*h}invert(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],m=e[8],g=m*c-d*f,x=d*h-m*l,M=f*l-c*h,E=t*g+r*x+a*M;if(E===0)return this.set(0,0,0,0,0,0,0,0,0);const w=1/E;return e[0]=g*w,e[1]=(a*f-m*r)*w,e[2]=(d*r-a*c)*w,e[3]=x*w,e[4]=(m*t-a*h)*w,e[5]=(a*l-d*t)*w,e[6]=M*w,e[7]=(r*h-f*t)*w,e[8]=(c*t-r*l)*w,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,r,a,l,c,d){const h=Math.cos(l),f=Math.sin(l);return this.set(r*h,r*f,-r*(h*c+f*d)+c+e,-a*f,a*h,-a*(-f*c+h*d)+d+t,0,0,1),this}scale(e,t){return vo("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(gf.makeScale(e,t)),this}rotate(e){return vo("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(gf.makeRotation(-e)),this}translate(e,t){return vo("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(gf.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,-r,0,r,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,r=e.elements;for(let a=0;a<9;a++)if(t[a]!==r[a])return!1;return!0}fromArray(e,t=0){for(let r=0;r<9;r++)this.elements[r]=e[r+t];return this}toArray(e=[],t=0){const r=this.elements;return e[t]=r[0],e[t+1]=r[1],e[t+2]=r[2],e[t+3]=r[3],e[t+4]=r[4],e[t+5]=r[5],e[t+6]=r[6],e[t+7]=r[7],e[t+8]=r[8],e}clone(){return new this.constructor().fromArray(this.elements)}};jm.prototype.isMatrix3=!0;let mt=jm;const gf=new mt,Jx=new mt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),ev=new mt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function lb(){const i={enabled:!0,workingColorSpace:ad,spaces:{},convert:function(a,l,c){return this.enabled===!1||l===c||!l||!c||(this.spaces[l].transfer===Vt&&(a.r=jr(a.r),a.g=jr(a.g),a.b=jr(a.b)),this.spaces[l].primaries!==this.spaces[c].primaries&&(a.applyMatrix3(this.spaces[l].toXYZ),a.applyMatrix3(this.spaces[c].fromXYZ)),this.spaces[c].transfer===Vt&&(a.r=_o(a.r),a.g=_o(a.g),a.b=_o(a.b))),a},workingToColorSpace:function(a,l){return this.convert(a,this.workingColorSpace,l)},colorSpaceToWorking:function(a,l){return this.convert(a,l,this.workingColorSpace)},getPrimaries:function(a){return this.spaces[a].primaries},getTransfer:function(a){return a===ws?od:this.spaces[a].transfer},getToneMappingMode:function(a){return this.spaces[a].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(a,l=this.workingColorSpace){return a.fromArray(this.spaces[l].luminanceCoefficients)},define:function(a){Object.assign(this.spaces,a)},_getMatrix:function(a,l,c){return a.copy(this.spaces[l].toXYZ).multiply(this.spaces[c].fromXYZ)},_getDrawingBufferColorSpace:function(a){return this.spaces[a].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(a=this.workingColorSpace){return this.spaces[a].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(a,l){return vo("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(a,l)},toWorkingColorSpace:function(a,l){return vo("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(a,l)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],r=[.3127,.329];return i.define({[ad]:{primaries:e,whitePoint:r,transfer:od,toXYZ:Jx,fromXYZ:ev,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Jn},outputColorSpaceConfig:{drawingBufferColorSpace:Jn}},[Jn]:{primaries:e,whitePoint:r,transfer:Vt,toXYZ:Jx,fromXYZ:ev,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Jn}}}),i}const Rt=lb();function jr(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function _o(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Za;class cb{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let r;if(e instanceof HTMLCanvasElement)r=e;else{Za===void 0&&(Za=$l("canvas")),Za.width=e.width,Za.height=e.height;const a=Za.getContext("2d");e instanceof ImageData?a.putImageData(e,0,0):a.drawImage(e,0,0,e.width,e.height),r=Za}return r.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=$l("canvas");t.width=e.width,t.height=e.height;const r=t.getContext("2d");r.drawImage(e,0,0,e.width,e.height);const a=r.getImageData(0,0,e.width,e.height),l=a.data;for(let c=0;c<l.length;c++)l[c]=jr(l[c]/255)*255;return r.putImageData(a,0,0),t}else if(e.data){const t=e.data.slice(0);for(let r=0;r<t.length;r++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[r]=Math.floor(jr(t[r]/255)*255):t[r]=jr(t[r]);return{data:t,width:e.width,height:e.height}}else return ct("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let ub=0;class Om{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:ub++}),this.uuid=tc(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const r={uuid:this.uuid,url:""},a=this.data;if(a!==null){let l;if(Array.isArray(a)){l=[];for(let c=0,d=a.length;c<d;c++)a[c].isDataTexture?l.push(xf(a[c].image)):l.push(xf(a[c]))}else l=xf(a);r.url=l}return t||(e.images[this.uuid]=r),r}}function xf(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?cb.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(ct("Texture: Unable to serialize Texture."),{})}let db=0;const vf=new ee;class Xn extends ks{constructor(e=Xn.DEFAULT_IMAGE,t=Xn.DEFAULT_MAPPING,r=Vr,a=Vr,l=Wn,c=da,d=Ki,h=Si,f=Xn.DEFAULT_ANISOTROPY,m=ws){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:db++}),this.uuid=tc(),this.name="",this.source=new Om(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=r,this.wrapT=a,this.magFilter=l,this.minFilter=c,this.anisotropy=f,this.format=d,this.internalFormat=null,this.type=h,this.offset=new ht(0,0),this.repeat=new ht(1,1),this.center=new ht(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new mt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=m,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(vf).x}get height(){return this.source.getSize(vf).y}get depth(){return this.source.getSize(vf).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const r=e[t];if(r===void 0){ct(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){ct(`Texture.setValues(): property '${t}' does not exist.`);continue}a&&r&&a.isVector2&&r.isVector2||a&&r&&a.isVector3&&r.isVector3||a&&r&&a.isMatrix3&&r.isMatrix3?a.copy(r):this[t]=r}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const r={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(r.userData=this.userData),t||(e.textures[this.uuid]=r),r}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==sy)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Mp:e.x=e.x-Math.floor(e.x);break;case Vr:e.x=e.x<0?0:1;break;case Ep:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Mp:e.y=e.y-Math.floor(e.y);break;case Vr:e.y=e.y<0?0:1;break;case Ep:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Xn.DEFAULT_IMAGE=null;Xn.DEFAULT_MAPPING=sy;Xn.DEFAULT_ANISOTROPY=1;const Wm=class Wm{constructor(e=0,t=0,r=0,a=1){this.x=e,this.y=t,this.z=r,this.w=a}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,r,a){return this.x=e,this.y=t,this.z=r,this.w=a,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,r=this.y,a=this.z,l=this.w,c=e.elements;return this.x=c[0]*t+c[4]*r+c[8]*a+c[12]*l,this.y=c[1]*t+c[5]*r+c[9]*a+c[13]*l,this.z=c[2]*t+c[6]*r+c[10]*a+c[14]*l,this.w=c[3]*t+c[7]*r+c[11]*a+c[15]*l,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,r,a,l;const h=e.elements,f=h[0],m=h[4],g=h[8],x=h[1],M=h[5],E=h[9],w=h[2],_=h[6],y=h[10];if(Math.abs(m-x)<.01&&Math.abs(g-w)<.01&&Math.abs(E-_)<.01){if(Math.abs(m+x)<.1&&Math.abs(g+w)<.1&&Math.abs(E+_)<.1&&Math.abs(f+M+y-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const P=(f+1)/2,C=(M+1)/2,F=(y+1)/2,N=(m+x)/4,O=(g+w)/4,b=(E+_)/4;return P>C&&P>F?P<.01?(r=0,a=.707106781,l=.707106781):(r=Math.sqrt(P),a=N/r,l=O/r):C>F?C<.01?(r=.707106781,a=0,l=.707106781):(a=Math.sqrt(C),r=N/a,l=b/a):F<.01?(r=.707106781,a=.707106781,l=0):(l=Math.sqrt(F),r=O/l,a=b/l),this.set(r,a,l,t),this}let L=Math.sqrt((_-E)*(_-E)+(g-w)*(g-w)+(x-m)*(x-m));return Math.abs(L)<.001&&(L=1),this.x=(_-E)/L,this.y=(g-w)/L,this.z=(x-m)/L,this.w=Math.acos((f+M+y-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=bt(this.x,e.x,t.x),this.y=bt(this.y,e.y,t.y),this.z=bt(this.z,e.z,t.z),this.w=bt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=bt(this.x,e,t),this.y=bt(this.y,e,t),this.z=bt(this.z,e,t),this.w=bt(this.w,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(bt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this.z=e.z+(t.z-e.z)*r,this.w=e.w+(t.w-e.w)*r,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};Wm.prototype.isVector4=!0;let cn=Wm;class hb extends ks{constructor(e=1,t=1,r={}){super(),r=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Wn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},r),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=r.depth,this.scissor=new cn(0,0,e,t),this.scissorTest=!1,this.viewport=new cn(0,0,e,t),this.textures=[];const a={width:e,height:t,depth:r.depth},l=new Xn(a),c=r.count;for(let d=0;d<c;d++)this.textures[d]=l.clone(),this.textures[d].isRenderTargetTexture=!0,this.textures[d].renderTarget=this;this._setTextureOptions(r),this.depthBuffer=r.depthBuffer,this.stencilBuffer=r.stencilBuffer,this.resolveDepthBuffer=r.resolveDepthBuffer,this.resolveStencilBuffer=r.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=r.depthTexture,this.samples=r.samples,this.multiview=r.multiview,this.useArrayDepthTexture=r.useArrayDepthTexture}_setTextureOptions(e={}){const t={minFilter:Wn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let r=0;r<this.textures.length;r++)this.textures[r].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,r=1){if(this.width!==e||this.height!==t||this.depth!==r){this.width=e,this.height=t,this.depth=r;for(let a=0,l=this.textures.length;a<l;a++)this.textures[a].image.width=e,this.textures[a].image.height=t,this.textures[a].image.depth=r,this.textures[a].isData3DTexture!==!0&&(this.textures[a].isArrayTexture=this.textures[a].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,r=e.textures.length;t<r;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const a=Object.assign({},e.textures[t].image);this.textures[t].source=new Om(a)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class gr extends hb{constructor(e=1,t=1,r={}){super(e,t,r),this.isWebGLRenderTarget=!0}}class py extends Xn{constructor(e=null,t=1,r=1,a=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:r,depth:a},this.magFilter=Fn,this.minFilter=Fn,this.wrapR=Vr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class fb extends Xn{constructor(e=null,t=1,r=1,a=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:r,depth:a},this.magFilter=Fn,this.minFilter=Fn,this.wrapR=Vr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const dd=class dd{constructor(e,t,r,a,l,c,d,h,f,m,g,x,M,E,w,_){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,r,a,l,c,d,h,f,m,g,x,M,E,w,_)}set(e,t,r,a,l,c,d,h,f,m,g,x,M,E,w,_){const y=this.elements;return y[0]=e,y[4]=t,y[8]=r,y[12]=a,y[1]=l,y[5]=c,y[9]=d,y[13]=h,y[2]=f,y[6]=m,y[10]=g,y[14]=x,y[3]=M,y[7]=E,y[11]=w,y[15]=_,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new dd().fromArray(this.elements)}copy(e){const t=this.elements,r=e.elements;return t[0]=r[0],t[1]=r[1],t[2]=r[2],t[3]=r[3],t[4]=r[4],t[5]=r[5],t[6]=r[6],t[7]=r[7],t[8]=r[8],t[9]=r[9],t[10]=r[10],t[11]=r[11],t[12]=r[12],t[13]=r[13],t[14]=r[14],t[15]=r[15],this}copyPosition(e){const t=this.elements,r=e.elements;return t[12]=r[12],t[13]=r[13],t[14]=r[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,r){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),r.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),r.setFromMatrixColumn(this,2),this)}makeBasis(e,t,r){return this.set(e.x,t.x,r.x,0,e.y,t.y,r.y,0,e.z,t.z,r.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();const t=this.elements,r=e.elements,a=1/Ja.setFromMatrixColumn(e,0).length(),l=1/Ja.setFromMatrixColumn(e,1).length(),c=1/Ja.setFromMatrixColumn(e,2).length();return t[0]=r[0]*a,t[1]=r[1]*a,t[2]=r[2]*a,t[3]=0,t[4]=r[4]*l,t[5]=r[5]*l,t[6]=r[6]*l,t[7]=0,t[8]=r[8]*c,t[9]=r[9]*c,t[10]=r[10]*c,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,r=e.x,a=e.y,l=e.z,c=Math.cos(r),d=Math.sin(r),h=Math.cos(a),f=Math.sin(a),m=Math.cos(l),g=Math.sin(l);if(e.order==="XYZ"){const x=c*m,M=c*g,E=d*m,w=d*g;t[0]=h*m,t[4]=-h*g,t[8]=f,t[1]=M+E*f,t[5]=x-w*f,t[9]=-d*h,t[2]=w-x*f,t[6]=E+M*f,t[10]=c*h}else if(e.order==="YXZ"){const x=h*m,M=h*g,E=f*m,w=f*g;t[0]=x+w*d,t[4]=E*d-M,t[8]=c*f,t[1]=c*g,t[5]=c*m,t[9]=-d,t[2]=M*d-E,t[6]=w+x*d,t[10]=c*h}else if(e.order==="ZXY"){const x=h*m,M=h*g,E=f*m,w=f*g;t[0]=x-w*d,t[4]=-c*g,t[8]=E+M*d,t[1]=M+E*d,t[5]=c*m,t[9]=w-x*d,t[2]=-c*f,t[6]=d,t[10]=c*h}else if(e.order==="ZYX"){const x=c*m,M=c*g,E=d*m,w=d*g;t[0]=h*m,t[4]=E*f-M,t[8]=x*f+w,t[1]=h*g,t[5]=w*f+x,t[9]=M*f-E,t[2]=-f,t[6]=d*h,t[10]=c*h}else if(e.order==="YZX"){const x=c*h,M=c*f,E=d*h,w=d*f;t[0]=h*m,t[4]=w-x*g,t[8]=E*g+M,t[1]=g,t[5]=c*m,t[9]=-d*m,t[2]=-f*m,t[6]=M*g+E,t[10]=x-w*g}else if(e.order==="XZY"){const x=c*h,M=c*f,E=d*h,w=d*f;t[0]=h*m,t[4]=-g,t[8]=f*m,t[1]=x*g+w,t[5]=c*m,t[9]=M*g-E,t[2]=E*g-M,t[6]=d*m,t[10]=w*g+x}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(pb,e,mb)}lookAt(e,t,r){const a=this.elements;return xi.subVectors(e,t),xi.lengthSq()===0&&(xi.z=1),xi.normalize(),ms.crossVectors(r,xi),ms.lengthSq()===0&&(Math.abs(r.z)===1?xi.x+=1e-4:xi.z+=1e-4,xi.normalize(),ms.crossVectors(r,xi)),ms.normalize(),pu.crossVectors(xi,ms),a[0]=ms.x,a[4]=pu.x,a[8]=xi.x,a[1]=ms.y,a[5]=pu.y,a[9]=xi.y,a[2]=ms.z,a[6]=pu.z,a[10]=xi.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const r=e.elements,a=t.elements,l=this.elements,c=r[0],d=r[4],h=r[8],f=r[12],m=r[1],g=r[5],x=r[9],M=r[13],E=r[2],w=r[6],_=r[10],y=r[14],L=r[3],P=r[7],C=r[11],F=r[15],N=a[0],O=a[4],b=a[8],U=a[12],G=a[1],D=a[5],K=a[9],ne=a[13],me=a[2],k=a[6],he=a[10],J=a[14],$=a[3],ce=a[7],ue=a[11],z=a[15];return l[0]=c*N+d*G+h*me+f*$,l[4]=c*O+d*D+h*k+f*ce,l[8]=c*b+d*K+h*he+f*ue,l[12]=c*U+d*ne+h*J+f*z,l[1]=m*N+g*G+x*me+M*$,l[5]=m*O+g*D+x*k+M*ce,l[9]=m*b+g*K+x*he+M*ue,l[13]=m*U+g*ne+x*J+M*z,l[2]=E*N+w*G+_*me+y*$,l[6]=E*O+w*D+_*k+y*ce,l[10]=E*b+w*K+_*he+y*ue,l[14]=E*U+w*ne+_*J+y*z,l[3]=L*N+P*G+C*me+F*$,l[7]=L*O+P*D+C*k+F*ce,l[11]=L*b+P*K+C*he+F*ue,l[15]=L*U+P*ne+C*J+F*z,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],r=e[4],a=e[8],l=e[12],c=e[1],d=e[5],h=e[9],f=e[13],m=e[2],g=e[6],x=e[10],M=e[14],E=e[3],w=e[7],_=e[11],y=e[15],L=h*M-f*x,P=d*M-f*g,C=d*x-h*g,F=c*M-f*m,N=c*x-h*m,O=c*g-d*m;return t*(w*L-_*P+y*C)-r*(E*L-_*F+y*N)+a*(E*P-w*F+y*O)-l*(E*C-w*N+_*O)}determinantAffine(){const e=this.elements,t=e[0],r=e[4],a=e[8],l=e[1],c=e[5],d=e[9],h=e[2],f=e[6],m=e[10];return t*(c*m-d*f)-r*(l*m-d*h)+a*(l*f-c*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,r){const a=this.elements;return e.isVector3?(a[12]=e.x,a[13]=e.y,a[14]=e.z):(a[12]=e,a[13]=t,a[14]=r),this}invert(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],m=e[8],g=e[9],x=e[10],M=e[11],E=e[12],w=e[13],_=e[14],y=e[15],L=t*d-r*c,P=t*h-a*c,C=t*f-l*c,F=r*h-a*d,N=r*f-l*d,O=a*f-l*h,b=m*w-g*E,U=m*_-x*E,G=m*y-M*E,D=g*_-x*w,K=g*y-M*w,ne=x*y-M*_,me=L*ne-P*K+C*D+F*G-N*U+O*b;if(me===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const k=1/me;return e[0]=(d*ne-h*K+f*D)*k,e[1]=(a*K-r*ne-l*D)*k,e[2]=(w*O-_*N+y*F)*k,e[3]=(x*N-g*O-M*F)*k,e[4]=(h*G-c*ne-f*U)*k,e[5]=(t*ne-a*G+l*U)*k,e[6]=(_*C-E*O-y*P)*k,e[7]=(m*O-x*C+M*P)*k,e[8]=(c*K-d*G+f*b)*k,e[9]=(r*G-t*K-l*b)*k,e[10]=(E*N-w*C+y*L)*k,e[11]=(g*C-m*N-M*L)*k,e[12]=(d*U-c*D-h*b)*k,e[13]=(t*D-r*U+a*b)*k,e[14]=(w*P-E*F-_*L)*k,e[15]=(m*F-g*P+x*L)*k,this}scale(e){const t=this.elements,r=e.x,a=e.y,l=e.z;return t[0]*=r,t[4]*=a,t[8]*=l,t[1]*=r,t[5]*=a,t[9]*=l,t[2]*=r,t[6]*=a,t[10]*=l,t[3]*=r,t[7]*=a,t[11]*=l,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],r=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],a=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,r,a))}makeTranslation(e,t,r){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,r,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),r=Math.sin(e);return this.set(1,0,0,0,0,t,-r,0,0,r,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,0,r,0,0,1,0,0,-r,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,-r,0,0,r,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const r=Math.cos(t),a=Math.sin(t),l=1-r,c=e.x,d=e.y,h=e.z,f=l*c,m=l*d;return this.set(f*c+r,f*d-a*h,f*h+a*d,0,f*d+a*h,m*d+r,m*h-a*c,0,f*h-a*d,m*h+a*c,l*h*h+r,0,0,0,0,1),this}makeScale(e,t,r){return this.set(e,0,0,0,0,t,0,0,0,0,r,0,0,0,0,1),this}makeShear(e,t,r,a,l,c){return this.set(1,r,l,0,e,1,c,0,t,a,1,0,0,0,0,1),this}compose(e,t,r){const a=this.elements,l=t._x,c=t._y,d=t._z,h=t._w,f=l+l,m=c+c,g=d+d,x=l*f,M=l*m,E=l*g,w=c*m,_=c*g,y=d*g,L=h*f,P=h*m,C=h*g,F=r.x,N=r.y,O=r.z;return a[0]=(1-(w+y))*F,a[1]=(M+C)*F,a[2]=(E-P)*F,a[3]=0,a[4]=(M-C)*N,a[5]=(1-(x+y))*N,a[6]=(_+L)*N,a[7]=0,a[8]=(E+P)*O,a[9]=(_-L)*O,a[10]=(1-(x+w))*O,a[11]=0,a[12]=e.x,a[13]=e.y,a[14]=e.z,a[15]=1,this}decompose(e,t,r){const a=this.elements;e.x=a[12],e.y=a[13],e.z=a[14];const l=this.determinantAffine();if(l===0)return r.set(1,1,1),t.identity(),this;let c=Ja.set(a[0],a[1],a[2]).length();const d=Ja.set(a[4],a[5],a[6]).length(),h=Ja.set(a[8],a[9],a[10]).length();l<0&&(c=-c),ji.copy(this);const f=1/c,m=1/d,g=1/h;return ji.elements[0]*=f,ji.elements[1]*=f,ji.elements[2]*=f,ji.elements[4]*=m,ji.elements[5]*=m,ji.elements[6]*=m,ji.elements[8]*=g,ji.elements[9]*=g,ji.elements[10]*=g,t.setFromRotationMatrix(ji),r.x=c,r.y=d,r.z=h,this}makePerspective(e,t,r,a,l,c,d=pr,h=!1){const f=this.elements,m=2*l/(t-e),g=2*l/(r-a),x=(t+e)/(t-e),M=(r+a)/(r-a);let E,w;if(h)E=l/(c-l),w=c*l/(c-l);else if(d===pr)E=-(c+l)/(c-l),w=-2*c*l/(c-l);else if(d===Xl)E=-c/(c-l),w=-c*l/(c-l);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+d);return f[0]=m,f[4]=0,f[8]=x,f[12]=0,f[1]=0,f[5]=g,f[9]=M,f[13]=0,f[2]=0,f[6]=0,f[10]=E,f[14]=w,f[3]=0,f[7]=0,f[11]=-1,f[15]=0,this}makeOrthographic(e,t,r,a,l,c,d=pr,h=!1){const f=this.elements,m=2/(t-e),g=2/(r-a),x=-(t+e)/(t-e),M=-(r+a)/(r-a);let E,w;if(h)E=1/(c-l),w=c/(c-l);else if(d===pr)E=-2/(c-l),w=-(c+l)/(c-l);else if(d===Xl)E=-1/(c-l),w=-l/(c-l);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+d);return f[0]=m,f[4]=0,f[8]=0,f[12]=x,f[1]=0,f[5]=g,f[9]=0,f[13]=M,f[2]=0,f[6]=0,f[10]=E,f[14]=w,f[3]=0,f[7]=0,f[11]=0,f[15]=1,this}equals(e){const t=this.elements,r=e.elements;for(let a=0;a<16;a++)if(t[a]!==r[a])return!1;return!0}fromArray(e,t=0){for(let r=0;r<16;r++)this.elements[r]=e[r+t];return this}toArray(e=[],t=0){const r=this.elements;return e[t]=r[0],e[t+1]=r[1],e[t+2]=r[2],e[t+3]=r[3],e[t+4]=r[4],e[t+5]=r[5],e[t+6]=r[6],e[t+7]=r[7],e[t+8]=r[8],e[t+9]=r[9],e[t+10]=r[10],e[t+11]=r[11],e[t+12]=r[12],e[t+13]=r[13],e[t+14]=r[14],e[t+15]=r[15],e}};dd.prototype.isMatrix4=!0;let sn=dd;const Ja=new ee,ji=new sn,pb=new ee(0,0,0),mb=new ee(1,1,1),ms=new ee,pu=new ee,xi=new ee,tv=new sn,nv=new Os;class Yr{constructor(e=0,t=0,r=0,a=Yr.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=r,this._order=a}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,r,a=this._order){return this._x=e,this._y=t,this._z=r,this._order=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,r=!0){const a=e.elements,l=a[0],c=a[4],d=a[8],h=a[1],f=a[5],m=a[9],g=a[2],x=a[6],M=a[10];switch(t){case"XYZ":this._y=Math.asin(bt(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(-m,M),this._z=Math.atan2(-c,l)):(this._x=Math.atan2(x,f),this._z=0);break;case"YXZ":this._x=Math.asin(-bt(m,-1,1)),Math.abs(m)<.9999999?(this._y=Math.atan2(d,M),this._z=Math.atan2(h,f)):(this._y=Math.atan2(-g,l),this._z=0);break;case"ZXY":this._x=Math.asin(bt(x,-1,1)),Math.abs(x)<.9999999?(this._y=Math.atan2(-g,M),this._z=Math.atan2(-c,f)):(this._y=0,this._z=Math.atan2(h,l));break;case"ZYX":this._y=Math.asin(-bt(g,-1,1)),Math.abs(g)<.9999999?(this._x=Math.atan2(x,M),this._z=Math.atan2(h,l)):(this._x=0,this._z=Math.atan2(-c,f));break;case"YZX":this._z=Math.asin(bt(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(-m,f),this._y=Math.atan2(-g,l)):(this._x=0,this._y=Math.atan2(d,M));break;case"XZY":this._z=Math.asin(-bt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(x,f),this._y=Math.atan2(d,l)):(this._x=Math.atan2(-m,M),this._y=0);break;default:ct("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,r===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,r){return tv.makeRotationFromQuaternion(e),this.setFromRotationMatrix(tv,t,r)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return nv.setFromEuler(this),this.setFromQuaternion(nv,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Yr.DEFAULT_ORDER="XYZ";class my{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let gb=0;const iv=new ee,eo=new Os,Pr=new sn,mu=new ee,Cl=new ee,xb=new ee,vb=new Os,rv=new ee(1,0,0),sv=new ee(0,1,0),av=new ee(0,0,1),ov={type:"added"},_b={type:"removed"},to={type:"childadded",child:null},_f={type:"childremoved",child:null};class En extends ks{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:gb++}),this.uuid=tc(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=En.DEFAULT_UP.clone();const e=new ee,t=new Yr,r=new Os,a=new ee(1,1,1);function l(){r.setFromEuler(t,!1)}function c(){t.setFromQuaternion(r,void 0,!1)}t._onChange(l),r._onChange(c),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:a},modelViewMatrix:{value:new sn},normalMatrix:{value:new mt}}),this.matrix=new sn,this.matrixWorld=new sn,this.matrixAutoUpdate=En.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=En.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new my,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return eo.setFromAxisAngle(e,t),this.quaternion.multiply(eo),this}rotateOnWorldAxis(e,t){return eo.setFromAxisAngle(e,t),this.quaternion.premultiply(eo),this}rotateX(e){return this.rotateOnAxis(rv,e)}rotateY(e){return this.rotateOnAxis(sv,e)}rotateZ(e){return this.rotateOnAxis(av,e)}translateOnAxis(e,t){return iv.copy(e).applyQuaternion(this.quaternion),this.position.add(iv.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(rv,e)}translateY(e){return this.translateOnAxis(sv,e)}translateZ(e){return this.translateOnAxis(av,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Pr.copy(this.matrixWorld).invert())}lookAt(e,t,r){e.isVector3?mu.copy(e):mu.set(e,t,r);const a=this.parent;this.updateWorldMatrix(!0,!1),Cl.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Pr.lookAt(Cl,mu,this.up):Pr.lookAt(mu,Cl,this.up),this.quaternion.setFromRotationMatrix(Pr),a&&(Pr.extractRotation(a.matrixWorld),eo.setFromRotationMatrix(Pr),this.quaternion.premultiply(eo.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Lt("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(ov),to.child=e,this.dispatchEvent(to),to.child=null):Lt("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let r=0;r<arguments.length;r++)this.remove(arguments[r]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(_b),_f.child=e,this.dispatchEvent(_f),_f.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Pr.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Pr.multiply(e.parent.matrixWorld)),e.applyMatrix4(Pr),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(ov),to.child=e,this.dispatchEvent(to),to.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let r=0,a=this.children.length;r<a;r++){const c=this.children[r].getObjectByProperty(e,t);if(c!==void 0)return c}}getObjectsByProperty(e,t,r=[]){this[e]===t&&r.push(this);const a=this.children;for(let l=0,c=a.length;l<c;l++)a[l].getObjectsByProperty(e,t,r);return r}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Cl,e,xb),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Cl,vb,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,r=e.y,a=e.z,l=this.matrix.elements;l[12]+=t-l[0]*t-l[4]*r-l[8]*a,l[13]+=r-l[1]*t-l[5]*r-l[9]*a,l[14]+=a-l[2]*t-l[6]*r-l[10]*a}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].updateMatrixWorld(e)}updateWorldMatrix(e,t,r=!1){const a=this.parent;if(e===!0&&a!==null&&a.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||r)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,r=!0),t===!0){const l=this.children;for(let c=0,d=l.length;c<d;c++)l[c].updateWorldMatrix(!1,!0,r)}}toJSON(e){const t=e===void 0||typeof e=="string",r={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},r.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const a={};a.uuid=this.uuid,a.type=this.type,this.name!==""&&(a.name=this.name),this.castShadow===!0&&(a.castShadow=!0),this.receiveShadow===!0&&(a.receiveShadow=!0),this.visible===!1&&(a.visible=!1),this.frustumCulled===!1&&(a.frustumCulled=!1),this.renderOrder!==0&&(a.renderOrder=this.renderOrder),this.static!==!1&&(a.static=this.static),Object.keys(this.userData).length>0&&(a.userData=this.userData),a.layers=this.layers.mask,a.matrix=this.matrix.toArray(),a.up=this.up.toArray(),this.pivot!==null&&(a.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(a.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(a.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(a.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(a.type="InstancedMesh",a.count=this.count,a.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(a.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(a.type="BatchedMesh",a.perObjectFrustumCulled=this.perObjectFrustumCulled,a.sortObjects=this.sortObjects,a.drawRanges=this._drawRanges,a.reservedRanges=this._reservedRanges,a.geometryInfo=this._geometryInfo.map(d=>({...d,boundingBox:d.boundingBox?d.boundingBox.toJSON():void 0,boundingSphere:d.boundingSphere?d.boundingSphere.toJSON():void 0})),a.instanceInfo=this._instanceInfo.map(d=>({...d})),a.availableInstanceIds=this._availableInstanceIds.slice(),a.availableGeometryIds=this._availableGeometryIds.slice(),a.nextIndexStart=this._nextIndexStart,a.nextVertexStart=this._nextVertexStart,a.geometryCount=this._geometryCount,a.maxInstanceCount=this._maxInstanceCount,a.maxVertexCount=this._maxVertexCount,a.maxIndexCount=this._maxIndexCount,a.geometryInitialized=this._geometryInitialized,a.matricesTexture=this._matricesTexture.toJSON(e),a.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(a.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(a.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(a.boundingBox=this.boundingBox.toJSON()));function l(d,h){return d[h.uuid]===void 0&&(d[h.uuid]=h.toJSON(e)),h.uuid}if(this.isScene)this.background&&(this.background.isColor?a.background=this.background.toJSON():this.background.isTexture&&(a.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(a.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){a.geometry=l(e.geometries,this.geometry);const d=this.geometry.parameters;if(d!==void 0&&d.shapes!==void 0){const h=d.shapes;if(Array.isArray(h))for(let f=0,m=h.length;f<m;f++){const g=h[f];l(e.shapes,g)}else l(e.shapes,h)}}if(this.isSkinnedMesh&&(a.bindMode=this.bindMode,a.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(l(e.skeletons,this.skeleton),a.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const d=[];for(let h=0,f=this.material.length;h<f;h++)d.push(l(e.materials,this.material[h]));a.material=d}else a.material=l(e.materials,this.material);if(this.children.length>0){a.children=[];for(let d=0;d<this.children.length;d++)a.children.push(this.children[d].toJSON(e).object)}if(this.animations.length>0){a.animations=[];for(let d=0;d<this.animations.length;d++){const h=this.animations[d];a.animations.push(l(e.animations,h))}}if(t){const d=c(e.geometries),h=c(e.materials),f=c(e.textures),m=c(e.images),g=c(e.shapes),x=c(e.skeletons),M=c(e.animations),E=c(e.nodes);d.length>0&&(r.geometries=d),h.length>0&&(r.materials=h),f.length>0&&(r.textures=f),m.length>0&&(r.images=m),g.length>0&&(r.shapes=g),x.length>0&&(r.skeletons=x),M.length>0&&(r.animations=M),E.length>0&&(r.nodes=E)}return r.object=a,r;function c(d){const h=[];for(const f in d){const m=d[f];delete m.metadata,h.push(m)}return h}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let r=0;r<e.children.length;r++){const a=e.children[r];this.add(a.clone())}return this}}En.DEFAULT_UP=new ee(0,1,0);En.DEFAULT_MATRIX_AUTO_UPDATE=!0;En.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class Fl extends En{constructor(){super(),this.isGroup=!0,this.type="Group"}}const yb={type:"move"};class yf{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Fl,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Fl,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new ee,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new ee),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Fl,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new ee,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new ee,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const r of e.hand.values())this._getHandJoint(t,r)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,r){let a=null,l=null,c=null;const d=this._targetRay,h=this._grip,f=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(f&&e.hand){c=!0;for(const w of e.hand.values()){const _=t.getJointPose(w,r),y=this._getHandJoint(f,w);_!==null&&(y.matrix.fromArray(_.transform.matrix),y.matrix.decompose(y.position,y.rotation,y.scale),y.matrixWorldNeedsUpdate=!0,y.jointRadius=_.radius),y.visible=_!==null}const m=f.joints["index-finger-tip"],g=f.joints["thumb-tip"],x=m.position.distanceTo(g.position),M=.02,E=.005;f.inputState.pinching&&x>M+E?(f.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!f.inputState.pinching&&x<=M-E&&(f.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else h!==null&&e.gripSpace&&(l=t.getPose(e.gripSpace,r),l!==null&&(h.matrix.fromArray(l.transform.matrix),h.matrix.decompose(h.position,h.rotation,h.scale),h.matrixWorldNeedsUpdate=!0,l.linearVelocity?(h.hasLinearVelocity=!0,h.linearVelocity.copy(l.linearVelocity)):h.hasLinearVelocity=!1,l.angularVelocity?(h.hasAngularVelocity=!0,h.angularVelocity.copy(l.angularVelocity)):h.hasAngularVelocity=!1,h.eventsEnabled&&h.dispatchEvent({type:"gripUpdated",data:e,target:this})));d!==null&&(a=t.getPose(e.targetRaySpace,r),a===null&&l!==null&&(a=l),a!==null&&(d.matrix.fromArray(a.transform.matrix),d.matrix.decompose(d.position,d.rotation,d.scale),d.matrixWorldNeedsUpdate=!0,a.linearVelocity?(d.hasLinearVelocity=!0,d.linearVelocity.copy(a.linearVelocity)):d.hasLinearVelocity=!1,a.angularVelocity?(d.hasAngularVelocity=!0,d.angularVelocity.copy(a.angularVelocity)):d.hasAngularVelocity=!1,this.dispatchEvent(yb)))}return d!==null&&(d.visible=a!==null),h!==null&&(h.visible=l!==null),f!==null&&(f.visible=c!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const r=new Fl;r.matrixAutoUpdate=!1,r.visible=!1,e.joints[t.jointName]=r,e.add(r)}return e.joints[t.jointName]}}const gy={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},gs={h:0,s:0,l:0},gu={h:0,s:0,l:0};function Sf(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class xt{constructor(e,t,r){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,r)}set(e,t,r){if(t===void 0&&r===void 0){const a=e;a&&a.isColor?this.copy(a):typeof a=="number"?this.setHex(a):typeof a=="string"&&this.setStyle(a)}else this.setRGB(e,t,r);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Jn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Rt.colorSpaceToWorking(this,t),this}setRGB(e,t,r,a=Rt.workingColorSpace){return this.r=e,this.g=t,this.b=r,Rt.colorSpaceToWorking(this,a),this}setHSL(e,t,r,a=Rt.workingColorSpace){if(e=ab(e,1),t=bt(t,0,1),r=bt(r,0,1),t===0)this.r=this.g=this.b=r;else{const l=r<=.5?r*(1+t):r+t-r*t,c=2*r-l;this.r=Sf(c,l,e+1/3),this.g=Sf(c,l,e),this.b=Sf(c,l,e-1/3)}return Rt.colorSpaceToWorking(this,a),this}setStyle(e,t=Jn){function r(l){l!==void 0&&parseFloat(l)<1&&ct("Color: Alpha component of "+e+" will be ignored.")}let a;if(a=/^(\w+)\(([^\)]*)\)/.exec(e)){let l;const c=a[1],d=a[2];switch(c){case"rgb":case"rgba":if(l=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setRGB(Math.min(255,parseInt(l[1],10))/255,Math.min(255,parseInt(l[2],10))/255,Math.min(255,parseInt(l[3],10))/255,t);if(l=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setRGB(Math.min(100,parseInt(l[1],10))/100,Math.min(100,parseInt(l[2],10))/100,Math.min(100,parseInt(l[3],10))/100,t);break;case"hsl":case"hsla":if(l=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setHSL(parseFloat(l[1])/360,parseFloat(l[2])/100,parseFloat(l[3])/100,t);break;default:ct("Color: Unknown color model "+e)}}else if(a=/^\#([A-Fa-f\d]+)$/.exec(e)){const l=a[1],c=l.length;if(c===3)return this.setRGB(parseInt(l.charAt(0),16)/15,parseInt(l.charAt(1),16)/15,parseInt(l.charAt(2),16)/15,t);if(c===6)return this.setHex(parseInt(l,16),t);ct("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Jn){const r=gy[e.toLowerCase()];return r!==void 0?this.setHex(r,t):ct("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=jr(e.r),this.g=jr(e.g),this.b=jr(e.b),this}copyLinearToSRGB(e){return this.r=_o(e.r),this.g=_o(e.g),this.b=_o(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Jn){return Rt.workingToColorSpace(Gn.copy(this),e),Math.round(bt(Gn.r*255,0,255))*65536+Math.round(bt(Gn.g*255,0,255))*256+Math.round(bt(Gn.b*255,0,255))}getHexString(e=Jn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Rt.workingColorSpace){Rt.workingToColorSpace(Gn.copy(this),t);const r=Gn.r,a=Gn.g,l=Gn.b,c=Math.max(r,a,l),d=Math.min(r,a,l);let h,f;const m=(d+c)/2;if(d===c)h=0,f=0;else{const g=c-d;switch(f=m<=.5?g/(c+d):g/(2-c-d),c){case r:h=(a-l)/g+(a<l?6:0);break;case a:h=(l-r)/g+2;break;case l:h=(r-a)/g+4;break}h/=6}return e.h=h,e.s=f,e.l=m,e}getRGB(e,t=Rt.workingColorSpace){return Rt.workingToColorSpace(Gn.copy(this),t),e.r=Gn.r,e.g=Gn.g,e.b=Gn.b,e}getStyle(e=Jn){Rt.workingToColorSpace(Gn.copy(this),e);const t=Gn.r,r=Gn.g,a=Gn.b;return e!==Jn?`color(${e} ${t.toFixed(3)} ${r.toFixed(3)} ${a.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(r*255)},${Math.round(a*255)})`}offsetHSL(e,t,r){return this.getHSL(gs),this.setHSL(gs.h+e,gs.s+t,gs.l+r)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,r){return this.r=e.r+(t.r-e.r)*r,this.g=e.g+(t.g-e.g)*r,this.b=e.b+(t.b-e.b)*r,this}lerpHSL(e,t){this.getHSL(gs),e.getHSL(gu);const r=pf(gs.h,gu.h,t),a=pf(gs.s,gu.s,t),l=pf(gs.l,gu.l,t);return this.setHSL(r,a,l),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,r=this.g,a=this.b,l=e.elements;return this.r=l[0]*t+l[3]*r+l[6]*a,this.g=l[1]*t+l[4]*r+l[7]*a,this.b=l[2]*t+l[5]*r+l[8]*a,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Gn=new xt;xt.NAMES=gy;class Sb extends En{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Yr,this.environmentIntensity=1,this.environmentRotation=new Yr,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const Wi=new ee,Nr=new ee,Mf=new ee,Lr=new ee,no=new ee,io=new ee,lv=new ee,Ef=new ee,wf=new ee,bf=new ee,Tf=new cn,Cf=new cn,Rf=new cn;class Yi{constructor(e=new ee,t=new ee,r=new ee){this.a=e,this.b=t,this.c=r}static getNormal(e,t,r,a){a.subVectors(r,t),Wi.subVectors(e,t),a.cross(Wi);const l=a.lengthSq();return l>0?a.multiplyScalar(1/Math.sqrt(l)):a.set(0,0,0)}static getBarycoord(e,t,r,a,l){Wi.subVectors(a,t),Nr.subVectors(r,t),Mf.subVectors(e,t);const c=Wi.dot(Wi),d=Wi.dot(Nr),h=Wi.dot(Mf),f=Nr.dot(Nr),m=Nr.dot(Mf),g=c*f-d*d;if(g===0)return l.set(0,0,0),null;const x=1/g,M=(f*h-d*m)*x,E=(c*m-d*h)*x;return l.set(1-M-E,E,M)}static containsPoint(e,t,r,a){return this.getBarycoord(e,t,r,a,Lr)===null?!1:Lr.x>=0&&Lr.y>=0&&Lr.x+Lr.y<=1}static getInterpolation(e,t,r,a,l,c,d,h){return this.getBarycoord(e,t,r,a,Lr)===null?(h.x=0,h.y=0,"z"in h&&(h.z=0),"w"in h&&(h.w=0),null):(h.setScalar(0),h.addScaledVector(l,Lr.x),h.addScaledVector(c,Lr.y),h.addScaledVector(d,Lr.z),h)}static getInterpolatedAttribute(e,t,r,a,l,c){return Tf.setScalar(0),Cf.setScalar(0),Rf.setScalar(0),Tf.fromBufferAttribute(e,t),Cf.fromBufferAttribute(e,r),Rf.fromBufferAttribute(e,a),c.setScalar(0),c.addScaledVector(Tf,l.x),c.addScaledVector(Cf,l.y),c.addScaledVector(Rf,l.z),c}static isFrontFacing(e,t,r,a){return Wi.subVectors(r,t),Nr.subVectors(e,t),Wi.cross(Nr).dot(a)<0}set(e,t,r){return this.a.copy(e),this.b.copy(t),this.c.copy(r),this}setFromPointsAndIndices(e,t,r,a){return this.a.copy(e[t]),this.b.copy(e[r]),this.c.copy(e[a]),this}setFromAttributeAndIndices(e,t,r,a){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,r),this.c.fromBufferAttribute(e,a),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Wi.subVectors(this.c,this.b),Nr.subVectors(this.a,this.b),Wi.cross(Nr).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Yi.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Yi.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,r,a,l){return Yi.getInterpolation(e,this.a,this.b,this.c,t,r,a,l)}containsPoint(e){return Yi.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Yi.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const r=this.a,a=this.b,l=this.c;let c,d;no.subVectors(a,r),io.subVectors(l,r),Ef.subVectors(e,r);const h=no.dot(Ef),f=io.dot(Ef);if(h<=0&&f<=0)return t.copy(r);wf.subVectors(e,a);const m=no.dot(wf),g=io.dot(wf);if(m>=0&&g<=m)return t.copy(a);const x=h*g-m*f;if(x<=0&&h>=0&&m<=0)return c=h/(h-m),t.copy(r).addScaledVector(no,c);bf.subVectors(e,l);const M=no.dot(bf),E=io.dot(bf);if(E>=0&&M<=E)return t.copy(l);const w=M*f-h*E;if(w<=0&&f>=0&&E<=0)return d=f/(f-E),t.copy(r).addScaledVector(io,d);const _=m*E-M*g;if(_<=0&&g-m>=0&&M-E>=0)return lv.subVectors(l,a),d=(g-m)/(g-m+(M-E)),t.copy(a).addScaledVector(lv,d);const y=1/(_+w+x);return c=w*y,d=x*y,t.copy(r).addScaledVector(no,c).addScaledVector(io,d)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class Ho{constructor(e=new ee(1/0,1/0,1/0),t=new ee(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,r=e.length;t<r;t+=3)this.expandByPoint(Xi.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,r=e.count;t<r;t++)this.expandByPoint(Xi.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,r=e.length;t<r;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const r=Xi.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(r),this.max.copy(e).add(r),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const r=e.geometry;if(r!==void 0){const l=r.getAttribute("position");if(t===!0&&l!==void 0&&e.isInstancedMesh!==!0)for(let c=0,d=l.count;c<d;c++)e.isMesh===!0?e.getVertexPosition(c,Xi):Xi.fromBufferAttribute(l,c),Xi.applyMatrix4(e.matrixWorld),this.expandByPoint(Xi);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),xu.copy(e.boundingBox)):(r.boundingBox===null&&r.computeBoundingBox(),xu.copy(r.boundingBox)),xu.applyMatrix4(e.matrixWorld),this.union(xu)}const a=e.children;for(let l=0,c=a.length;l<c;l++)this.expandByObject(a[l],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Xi),Xi.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,r;return e.normal.x>0?(t=e.normal.x*this.min.x,r=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,r=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,r+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,r+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,r+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,r+=e.normal.z*this.min.z),t<=-e.constant&&r>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Rl),vu.subVectors(this.max,Rl),ro.subVectors(e.a,Rl),so.subVectors(e.b,Rl),ao.subVectors(e.c,Rl),xs.subVectors(so,ro),vs.subVectors(ao,so),ia.subVectors(ro,ao);let t=[0,-xs.z,xs.y,0,-vs.z,vs.y,0,-ia.z,ia.y,xs.z,0,-xs.x,vs.z,0,-vs.x,ia.z,0,-ia.x,-xs.y,xs.x,0,-vs.y,vs.x,0,-ia.y,ia.x,0];return!Af(t,ro,so,ao,vu)||(t=[1,0,0,0,1,0,0,0,1],!Af(t,ro,so,ao,vu))?!1:(_u.crossVectors(xs,vs),t=[_u.x,_u.y,_u.z],Af(t,ro,so,ao,vu))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Xi).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Xi).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Dr[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Dr[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Dr[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Dr[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Dr[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Dr[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Dr[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Dr[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Dr),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Dr=[new ee,new ee,new ee,new ee,new ee,new ee,new ee,new ee],Xi=new ee,xu=new Ho,ro=new ee,so=new ee,ao=new ee,xs=new ee,vs=new ee,ia=new ee,Rl=new ee,vu=new ee,_u=new ee,ra=new ee;function Af(i,e,t,r,a){for(let l=0,c=i.length-3;l<=c;l+=3){ra.fromArray(i,l);const d=a.x*Math.abs(ra.x)+a.y*Math.abs(ra.y)+a.z*Math.abs(ra.z),h=e.dot(ra),f=t.dot(ra),m=r.dot(ra);if(Math.max(-Math.max(h,f,m),Math.min(h,f,m))>d)return!1}return!0}const vn=new ee,yu=new ht;let Mb=0;class xr extends ks{constructor(e,t,r=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Mb++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=r,this.usage=qx,this.updateRanges=[],this.gpuType=fr,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,r){e*=this.itemSize,r*=t.itemSize;for(let a=0,l=this.itemSize;a<l;a++)this.array[e+a]=t.array[r+a];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,r=this.count;t<r;t++)yu.fromBufferAttribute(this,t),yu.applyMatrix3(e),this.setXY(t,yu.x,yu.y);else if(this.itemSize===3)for(let t=0,r=this.count;t<r;t++)vn.fromBufferAttribute(this,t),vn.applyMatrix3(e),this.setXYZ(t,vn.x,vn.y,vn.z);return this}applyMatrix4(e){for(let t=0,r=this.count;t<r;t++)vn.fromBufferAttribute(this,t),vn.applyMatrix4(e),this.setXYZ(t,vn.x,vn.y,vn.z);return this}applyNormalMatrix(e){for(let t=0,r=this.count;t<r;t++)vn.fromBufferAttribute(this,t),vn.applyNormalMatrix(e),this.setXYZ(t,vn.x,vn.y,vn.z);return this}transformDirection(e){for(let t=0,r=this.count;t<r;t++)vn.fromBufferAttribute(this,t),vn.transformDirection(e),this.setXYZ(t,vn.x,vn.y,vn.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let r=this.array[e*this.itemSize+t];return this.normalized&&(r=Tl(r,this.array)),r}setComponent(e,t,r){return this.normalized&&(r=li(r,this.array)),this.array[e*this.itemSize+t]=r,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Tl(t,this.array)),t}setX(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Tl(t,this.array)),t}setY(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Tl(t,this.array)),t}setZ(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Tl(t,this.array)),t}setW(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,r){return e*=this.itemSize,this.normalized&&(t=li(t,this.array),r=li(r,this.array)),this.array[e+0]=t,this.array[e+1]=r,this}setXYZ(e,t,r,a){return e*=this.itemSize,this.normalized&&(t=li(t,this.array),r=li(r,this.array),a=li(a,this.array)),this.array[e+0]=t,this.array[e+1]=r,this.array[e+2]=a,this}setXYZW(e,t,r,a,l){return e*=this.itemSize,this.normalized&&(t=li(t,this.array),r=li(r,this.array),a=li(a,this.array),l=li(l,this.array)),this.array[e+0]=t,this.array[e+1]=r,this.array[e+2]=a,this.array[e+3]=l,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==qx&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}}class xy extends xr{constructor(e,t,r){super(new Uint16Array(e),t,r)}}class vy extends xr{constructor(e,t,r){super(new Uint32Array(e),t,r)}}class Un extends xr{constructor(e,t,r){super(new Float32Array(e),t,r)}}const Eb=new Ho,Al=new ee,Pf=new ee;class nc{constructor(e=new ee,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const r=this.center;t!==void 0?r.copy(t):Eb.setFromPoints(e).getCenter(r);let a=0;for(let l=0,c=e.length;l<c;l++)a=Math.max(a,r.distanceToSquared(e[l]));return this.radius=Math.sqrt(a),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const r=this.center.distanceToSquared(e);return t.copy(e),r>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Al.subVectors(e,this.center);const t=Al.lengthSq();if(t>this.radius*this.radius){const r=Math.sqrt(t),a=(r-this.radius)*.5;this.center.addScaledVector(Al,a/r),this.radius+=a}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Pf.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Al.copy(e.center).add(Pf)),this.expandByPoint(Al.copy(e.center).sub(Pf))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let wb=0;const Ni=new sn,Nf=new En,oo=new ee,vi=new Ho,Pl=new Ho,An=new ee;class Mi extends ks{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:wb++}),this.uuid=tc(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(nb(e)?vy:xy)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,r=0){this.groups.push({start:e,count:t,materialIndex:r})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const r=this.attributes.normal;if(r!==void 0){const l=new mt().getNormalMatrix(e);r.applyNormalMatrix(l),r.needsUpdate=!0}const a=this.attributes.tangent;return a!==void 0&&(a.transformDirection(e),a.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return Ni.makeRotationFromQuaternion(e),this.applyMatrix4(Ni),this}rotateX(e){return Ni.makeRotationX(e),this.applyMatrix4(Ni),this}rotateY(e){return Ni.makeRotationY(e),this.applyMatrix4(Ni),this}rotateZ(e){return Ni.makeRotationZ(e),this.applyMatrix4(Ni),this}translate(e,t,r){return Ni.makeTranslation(e,t,r),this.applyMatrix4(Ni),this}scale(e,t,r){return Ni.makeScale(e,t,r),this.applyMatrix4(Ni),this}lookAt(e){return Nf.lookAt(e),Nf.updateMatrix(),this.applyMatrix4(Nf.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(oo).negate(),this.translate(oo.x,oo.y,oo.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const r=[];for(let a=0,l=e.length;a<l;a++){const c=e[a];r.push(c.x,c.y,c.z||0)}this.setAttribute("position",new Un(r,3))}else{const r=Math.min(e.length,t.count);for(let a=0;a<r;a++){const l=e[a];t.setXYZ(a,l.x,l.y,l.z||0)}e.length>t.count&&ct("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Ho);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Lt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new ee(-1/0,-1/0,-1/0),new ee(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){const l=t[r];vi.setFromBufferAttribute(l),this.morphTargetsRelative?(An.addVectors(this.boundingBox.min,vi.min),this.boundingBox.expandByPoint(An),An.addVectors(this.boundingBox.max,vi.max),this.boundingBox.expandByPoint(An)):(this.boundingBox.expandByPoint(vi.min),this.boundingBox.expandByPoint(vi.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Lt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new nc);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Lt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new ee,1/0);return}if(e){const r=this.boundingSphere.center;if(vi.setFromBufferAttribute(e),t)for(let l=0,c=t.length;l<c;l++){const d=t[l];Pl.setFromBufferAttribute(d),this.morphTargetsRelative?(An.addVectors(vi.min,Pl.min),vi.expandByPoint(An),An.addVectors(vi.max,Pl.max),vi.expandByPoint(An)):(vi.expandByPoint(Pl.min),vi.expandByPoint(Pl.max))}vi.getCenter(r);let a=0;for(let l=0,c=e.count;l<c;l++)An.fromBufferAttribute(e,l),a=Math.max(a,r.distanceToSquared(An));if(t)for(let l=0,c=t.length;l<c;l++){const d=t[l],h=this.morphTargetsRelative;for(let f=0,m=d.count;f<m;f++)An.fromBufferAttribute(d,f),h&&(oo.fromBufferAttribute(e,f),An.add(oo)),a=Math.max(a,r.distanceToSquared(An))}this.boundingSphere.radius=Math.sqrt(a),isNaN(this.boundingSphere.radius)&&Lt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Lt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const r=t.position,a=t.normal,l=t.uv;let c=this.getAttribute("tangent");(c===void 0||c.count!==r.count)&&(c=new xr(new Float32Array(4*r.count),4),this.setAttribute("tangent",c));const d=[],h=[];for(let b=0;b<r.count;b++)d[b]=new ee,h[b]=new ee;const f=new ee,m=new ee,g=new ee,x=new ht,M=new ht,E=new ht,w=new ee,_=new ee;function y(b,U,G){f.fromBufferAttribute(r,b),m.fromBufferAttribute(r,U),g.fromBufferAttribute(r,G),x.fromBufferAttribute(l,b),M.fromBufferAttribute(l,U),E.fromBufferAttribute(l,G),m.sub(f),g.sub(f),M.sub(x),E.sub(x);const D=1/(M.x*E.y-E.x*M.y);isFinite(D)&&(w.copy(m).multiplyScalar(E.y).addScaledVector(g,-M.y).multiplyScalar(D),_.copy(g).multiplyScalar(M.x).addScaledVector(m,-E.x).multiplyScalar(D),d[b].add(w),d[U].add(w),d[G].add(w),h[b].add(_),h[U].add(_),h[G].add(_))}let L=this.groups;L.length===0&&(L=[{start:0,count:e.count}]);for(let b=0,U=L.length;b<U;++b){const G=L[b],D=G.start,K=G.count;for(let ne=D,me=D+K;ne<me;ne+=3)y(e.getX(ne+0),e.getX(ne+1),e.getX(ne+2))}const P=new ee,C=new ee,F=new ee,N=new ee;function O(b){F.fromBufferAttribute(a,b),N.copy(F);const U=d[b];P.copy(U),P.sub(F.multiplyScalar(F.dot(U))).normalize(),C.crossVectors(N,U);const D=C.dot(h[b])<0?-1:1;c.setXYZW(b,P.x,P.y,P.z,D)}for(let b=0,U=L.length;b<U;++b){const G=L[b],D=G.start,K=G.count;for(let ne=D,me=D+K;ne<me;ne+=3)O(e.getX(ne+0)),O(e.getX(ne+1)),O(e.getX(ne+2))}this._transformed=!0}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let r=this.getAttribute("normal");if(r===void 0||r.count!==t.count)r=new xr(new Float32Array(t.count*3),3),this.setAttribute("normal",r);else for(let x=0,M=r.count;x<M;x++)r.setXYZ(x,0,0,0);const a=new ee,l=new ee,c=new ee,d=new ee,h=new ee,f=new ee,m=new ee,g=new ee;if(e)for(let x=0,M=e.count;x<M;x+=3){const E=e.getX(x+0),w=e.getX(x+1),_=e.getX(x+2);a.fromBufferAttribute(t,E),l.fromBufferAttribute(t,w),c.fromBufferAttribute(t,_),m.subVectors(c,l),g.subVectors(a,l),m.cross(g),d.fromBufferAttribute(r,E),h.fromBufferAttribute(r,w),f.fromBufferAttribute(r,_),d.add(m),h.add(m),f.add(m),r.setXYZ(E,d.x,d.y,d.z),r.setXYZ(w,h.x,h.y,h.z),r.setXYZ(_,f.x,f.y,f.z)}else for(let x=0,M=t.count;x<M;x+=3)a.fromBufferAttribute(t,x+0),l.fromBufferAttribute(t,x+1),c.fromBufferAttribute(t,x+2),m.subVectors(c,l),g.subVectors(a,l),m.cross(g),r.setXYZ(x+0,m.x,m.y,m.z),r.setXYZ(x+1,m.x,m.y,m.z),r.setXYZ(x+2,m.x,m.y,m.z);this.normalizeNormals(),r.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,r=e.count;t<r;t++)An.fromBufferAttribute(e,t),An.normalize(),e.setXYZ(t,An.x,An.y,An.z)}toNonIndexed(){function e(d,h){const f=d.array,m=d.itemSize,g=d.normalized,x=new f.constructor(h.length*m);let M=0,E=0;for(let w=0,_=h.length;w<_;w++){d.isInterleavedBufferAttribute?M=h[w]*d.data.stride+d.offset:M=h[w]*m;for(let y=0;y<m;y++)x[E++]=f[M++]}return new xr(x,m,g)}if(this.index===null)return ct("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Mi,r=this.index.array,a=this.attributes;for(const d in a){const h=a[d],f=e(h,r);t.setAttribute(d,f)}const l=this.morphAttributes;for(const d in l){const h=[],f=l[d];for(let m=0,g=f.length;m<g;m++){const x=f[m],M=e(x,r);h.push(M)}t.morphAttributes[d]=h}t.morphTargetsRelative=this.morphTargetsRelative;const c=this.groups;for(let d=0,h=c.length;d<h;d++){const f=c[d];t.addGroup(f.start,f.count,f.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const h=this.parameters;for(const f in h)h[f]!==void 0&&(e[f]=h[f]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const r=this.attributes;for(const h in r){const f=r[h];e.data.attributes[h]=f.toJSON(e.data)}const a={};let l=!1;for(const h in this.morphAttributes){const f=this.morphAttributes[h],m=[];for(let g=0,x=f.length;g<x;g++){const M=f[g];m.push(M.toJSON(e.data))}m.length>0&&(a[h]=m,l=!0)}l&&(e.data.morphAttributes=a,e.data.morphTargetsRelative=this.morphTargetsRelative);const c=this.groups;c.length>0&&(e.data.groups=JSON.parse(JSON.stringify(c)));const d=this.boundingSphere;return d!==null&&(e.data.boundingSphere=d.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const r=e.index;r!==null&&this.setIndex(r.clone());const a=e.attributes;for(const f in a){const m=a[f];this.setAttribute(f,m.clone(t))}const l=e.morphAttributes;for(const f in l){const m=[],g=l[f];for(let x=0,M=g.length;x<M;x++)m.push(g[x].clone(t));this.morphAttributes[f]=m}this.morphTargetsRelative=e.morphTargetsRelative;const c=e.groups;for(let f=0,m=c.length;f<m;f++){const g=c[f];this.addGroup(g.start,g.count,g.materialIndex)}const d=e.boundingBox;d!==null&&(this.boundingBox=d.clone());const h=e.boundingSphere;return h!==null&&(this.boundingSphere=h.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}let bb=0;class _r extends ks{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:bb++}),this.uuid=tc(),this.name="",this.type="Material",this.blending=xo,this.side=Fs,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=fp,this.blendDst=pp,this.blendEquation=la,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new xt(0,0,0),this.blendAlpha=0,this.depthFunc=Do,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=$x,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Qa,this.stencilZFail=Qa,this.stencilZPass=Qa,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const r=e[t];if(r===void 0){ct(`Material: parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){ct(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}a&&a.isColor?a.set(r):a&&a.isVector2&&r&&r.isVector2||a&&a.isEuler&&r&&r.isEuler||a&&a.isVector3&&r&&r.isVector3?a.copy(r):this[t]=r}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const r={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.color&&this.color.isColor&&(r.color=this.color.getHex()),this.roughness!==void 0&&(r.roughness=this.roughness),this.metalness!==void 0&&(r.metalness=this.metalness),this.sheen!==void 0&&(r.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(r.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(r.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(r.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(r.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(r.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(r.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(r.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(r.shininess=this.shininess),this.clearcoat!==void 0&&(r.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(r.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(r.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(r.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(r.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,r.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(r.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(r.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(r.dispersion=this.dispersion),this.iridescence!==void 0&&(r.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(r.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(r.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(r.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(r.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(r.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(r.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(r.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(r.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(r.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(r.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(r.lightMap=this.lightMap.toJSON(e).uuid,r.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(r.aoMap=this.aoMap.toJSON(e).uuid,r.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(r.bumpMap=this.bumpMap.toJSON(e).uuid,r.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(r.normalMap=this.normalMap.toJSON(e).uuid,r.normalMapType=this.normalMapType,r.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(r.displacementMap=this.displacementMap.toJSON(e).uuid,r.displacementScale=this.displacementScale,r.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(r.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(r.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(r.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(r.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(r.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(r.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(r.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(r.combine=this.combine)),this.envMapRotation!==void 0&&(r.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(r.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(r.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(r.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(r.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(r.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(r.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(r.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(r.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(r.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(r.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(r.size=this.size),this.shadowSide!==null&&(r.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(r.sizeAttenuation=this.sizeAttenuation),this.blending!==xo&&(r.blending=this.blending),this.side!==Fs&&(r.side=this.side),this.vertexColors===!0&&(r.vertexColors=!0),this.opacity<1&&(r.opacity=this.opacity),this.transparent===!0&&(r.transparent=!0),this.blendSrc!==fp&&(r.blendSrc=this.blendSrc),this.blendDst!==pp&&(r.blendDst=this.blendDst),this.blendEquation!==la&&(r.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(r.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(r.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(r.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(r.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(r.blendAlpha=this.blendAlpha),this.depthFunc!==Do&&(r.depthFunc=this.depthFunc),this.depthTest===!1&&(r.depthTest=this.depthTest),this.depthWrite===!1&&(r.depthWrite=this.depthWrite),this.colorWrite===!1&&(r.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(r.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==$x&&(r.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(r.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(r.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Qa&&(r.stencilFail=this.stencilFail),this.stencilZFail!==Qa&&(r.stencilZFail=this.stencilZFail),this.stencilZPass!==Qa&&(r.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(r.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(r.rotation=this.rotation),this.polygonOffset===!0&&(r.polygonOffset=!0),this.polygonOffsetFactor!==0&&(r.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(r.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(r.linewidth=this.linewidth),this.dashSize!==void 0&&(r.dashSize=this.dashSize),this.gapSize!==void 0&&(r.gapSize=this.gapSize),this.scale!==void 0&&(r.scale=this.scale),this.dithering===!0&&(r.dithering=!0),this.alphaTest>0&&(r.alphaTest=this.alphaTest),this.alphaHash===!0&&(r.alphaHash=!0),this.alphaToCoverage===!0&&(r.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(r.premultipliedAlpha=!0),this.forceSinglePass===!0&&(r.forceSinglePass=!0),this.allowOverride===!1&&(r.allowOverride=!1),this.wireframe===!0&&(r.wireframe=!0),this.wireframeLinewidth>1&&(r.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(r.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(r.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(r.flatShading=!0),this.visible===!1&&(r.visible=!1),this.toneMapped===!1&&(r.toneMapped=!1),this.fog===!1&&(r.fog=!1),Object.keys(this.userData).length>0&&(r.userData=this.userData);function a(l){const c=[];for(const d in l){const h=l[d];delete h.metadata,c.push(h)}return c}if(t){const l=a(e.textures),c=a(e.images);l.length>0&&(r.textures=l),c.length>0&&(r.images=c)}return r}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new xt().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let r=e.normalScale;Array.isArray(r)===!1&&(r=[r,r]),this.normalScale=new ht().fromArray(r)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new ht().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let r=null;if(t!==null){const a=t.length;r=new Array(a);for(let l=0;l!==a;++l)r[l]=t[l].clone()}return this.clippingPlanes=r,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}const Ir=new ee,Lf=new ee,Su=new ee,_s=new ee,Df=new ee,Mu=new ee,If=new ee;class xd{constructor(e=new ee,t=new ee(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Ir)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const r=t.dot(this.direction);return r<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,r)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Ir.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Ir.copy(this.origin).addScaledVector(this.direction,t),Ir.distanceToSquared(e))}distanceSqToSegment(e,t,r,a){Lf.copy(e).add(t).multiplyScalar(.5),Su.copy(t).sub(e).normalize(),_s.copy(this.origin).sub(Lf);const l=e.distanceTo(t)*.5,c=-this.direction.dot(Su),d=_s.dot(this.direction),h=-_s.dot(Su),f=_s.lengthSq(),m=Math.abs(1-c*c);let g,x,M,E;if(m>0)if(g=c*h-d,x=c*d-h,E=l*m,g>=0)if(x>=-E)if(x<=E){const w=1/m;g*=w,x*=w,M=g*(g+c*x+2*d)+x*(c*g+x+2*h)+f}else x=l,g=Math.max(0,-(c*x+d)),M=-g*g+x*(x+2*h)+f;else x=-l,g=Math.max(0,-(c*x+d)),M=-g*g+x*(x+2*h)+f;else x<=-E?(g=Math.max(0,-(-c*l+d)),x=g>0?-l:Math.min(Math.max(-l,-h),l),M=-g*g+x*(x+2*h)+f):x<=E?(g=0,x=Math.min(Math.max(-l,-h),l),M=x*(x+2*h)+f):(g=Math.max(0,-(c*l+d)),x=g>0?l:Math.min(Math.max(-l,-h),l),M=-g*g+x*(x+2*h)+f);else x=c>0?-l:l,g=Math.max(0,-(c*x+d)),M=-g*g+x*(x+2*h)+f;return r&&r.copy(this.origin).addScaledVector(this.direction,g),a&&a.copy(Lf).addScaledVector(Su,x),M}intersectSphere(e,t){Ir.subVectors(e.center,this.origin);const r=Ir.dot(this.direction),a=Ir.dot(Ir)-r*r,l=e.radius*e.radius;if(a>l)return null;const c=Math.sqrt(l-a),d=r-c,h=r+c;return h<0?null:d<0?this.at(h,t):this.at(d,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const r=-(this.origin.dot(e.normal)+e.constant)/t;return r>=0?r:null}intersectPlane(e,t){const r=this.distanceToPlane(e);return r===null?null:this.at(r,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let r,a,l,c,d,h;const f=1/this.direction.x,m=1/this.direction.y,g=1/this.direction.z,x=this.origin;return f>=0?(r=(e.min.x-x.x)*f,a=(e.max.x-x.x)*f):(r=(e.max.x-x.x)*f,a=(e.min.x-x.x)*f),m>=0?(l=(e.min.y-x.y)*m,c=(e.max.y-x.y)*m):(l=(e.max.y-x.y)*m,c=(e.min.y-x.y)*m),r>c||l>a||((l>r||isNaN(r))&&(r=l),(c<a||isNaN(a))&&(a=c),g>=0?(d=(e.min.z-x.z)*g,h=(e.max.z-x.z)*g):(d=(e.max.z-x.z)*g,h=(e.min.z-x.z)*g),r>h||d>a)||((d>r||r!==r)&&(r=d),(h<a||a!==a)&&(a=h),a<0)?null:this.at(r>=0?r:a,t)}intersectsBox(e){return this.intersectBox(e,Ir)!==null}intersectTriangle(e,t,r,a,l){Df.subVectors(t,e),Mu.subVectors(r,e),If.crossVectors(Df,Mu);let c=this.direction.dot(If),d;if(c>0){if(a)return null;d=1}else if(c<0)d=-1,c=-c;else return null;_s.subVectors(this.origin,e);const h=d*this.direction.dot(Mu.crossVectors(_s,Mu));if(h<0)return null;const f=d*this.direction.dot(Df.cross(_s));if(f<0||h+f>c)return null;const m=-d*_s.dot(If);return m<0?null:this.at(m/c,l)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class _y extends _r{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new xt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Yr,this.combine=Cm,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const cv=new sn,sa=new xd,Eu=new nc,uv=new ee,wu=new ee,bu=new ee,Tu=new ee,Uf=new ee,Cu=new ee,dv=new ee,Ru=new ee;class Zi extends En{constructor(e=new Mi,t=new _y){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}getVertexPosition(e,t){const r=this.geometry,a=r.attributes.position,l=r.morphAttributes.position,c=r.morphTargetsRelative;t.fromBufferAttribute(a,e);const d=this.morphTargetInfluences;if(l&&d){Cu.set(0,0,0);for(let h=0,f=l.length;h<f;h++){const m=d[h],g=l[h];m!==0&&(Uf.fromBufferAttribute(g,e),c?Cu.addScaledVector(Uf,m):Cu.addScaledVector(Uf.sub(t),m))}t.add(Cu)}return t}raycast(e,t){const r=this.geometry,a=this.material,l=this.matrixWorld;a!==void 0&&(r.boundingSphere===null&&r.computeBoundingSphere(),Eu.copy(r.boundingSphere),Eu.applyMatrix4(l),sa.copy(e.ray).recast(e.near),!(Eu.containsPoint(sa.origin)===!1&&(sa.intersectSphere(Eu,uv)===null||sa.origin.distanceToSquared(uv)>(e.far-e.near)**2))&&(cv.copy(l).invert(),sa.copy(e.ray).applyMatrix4(cv),!(r.boundingBox!==null&&sa.intersectsBox(r.boundingBox)===!1)&&this._computeIntersections(e,t,sa)))}_computeIntersections(e,t,r){let a;const l=this.geometry,c=this.material,d=l.index,h=l.attributes.position,f=l.attributes.uv,m=l.attributes.uv1,g=l.attributes.normal,x=l.groups,M=l.drawRange;if(d!==null)if(Array.isArray(c))for(let E=0,w=x.length;E<w;E++){const _=x[E],y=c[_.materialIndex],L=Math.max(_.start,M.start),P=Math.min(d.count,Math.min(_.start+_.count,M.start+M.count));for(let C=L,F=P;C<F;C+=3){const N=d.getX(C),O=d.getX(C+1),b=d.getX(C+2);a=Au(this,y,e,r,f,m,g,N,O,b),a&&(a.faceIndex=Math.floor(C/3),a.face.materialIndex=_.materialIndex,t.push(a))}}else{const E=Math.max(0,M.start),w=Math.min(d.count,M.start+M.count);for(let _=E,y=w;_<y;_+=3){const L=d.getX(_),P=d.getX(_+1),C=d.getX(_+2);a=Au(this,c,e,r,f,m,g,L,P,C),a&&(a.faceIndex=Math.floor(_/3),t.push(a))}}else if(h!==void 0)if(Array.isArray(c))for(let E=0,w=x.length;E<w;E++){const _=x[E],y=c[_.materialIndex],L=Math.max(_.start,M.start),P=Math.min(h.count,Math.min(_.start+_.count,M.start+M.count));for(let C=L,F=P;C<F;C+=3){const N=C,O=C+1,b=C+2;a=Au(this,y,e,r,f,m,g,N,O,b),a&&(a.faceIndex=Math.floor(C/3),a.face.materialIndex=_.materialIndex,t.push(a))}}else{const E=Math.max(0,M.start),w=Math.min(h.count,M.start+M.count);for(let _=E,y=w;_<y;_+=3){const L=_,P=_+1,C=_+2;a=Au(this,c,e,r,f,m,g,L,P,C),a&&(a.faceIndex=Math.floor(_/3),t.push(a))}}}}function Tb(i,e,t,r,a,l,c,d){let h;if(e.side===hi?h=r.intersectTriangle(c,l,a,!0,d):h=r.intersectTriangle(a,l,c,e.side===Fs,d),h===null)return null;Ru.copy(d),Ru.applyMatrix4(i.matrixWorld);const f=t.ray.origin.distanceTo(Ru);return f<t.near||f>t.far?null:{distance:f,point:Ru.clone(),object:i}}function Au(i,e,t,r,a,l,c,d,h,f){i.getVertexPosition(d,wu),i.getVertexPosition(h,bu),i.getVertexPosition(f,Tu);const m=Tb(i,e,t,r,wu,bu,Tu,dv);if(m){const g=new ee;Yi.getBarycoord(dv,wu,bu,Tu,g),a&&(m.uv=Yi.getInterpolatedAttribute(a,d,h,f,g,new ht)),l&&(m.uv1=Yi.getInterpolatedAttribute(l,d,h,f,g,new ht)),c&&(m.normal=Yi.getInterpolatedAttribute(c,d,h,f,g,new ee),m.normal.dot(r.direction)>0&&m.normal.multiplyScalar(-1));const x={a:d,b:h,c:f,normal:new ee,materialIndex:0};Yi.getNormal(wu,bu,Tu,x.normal),m.face=x,m.barycoord=g}return m}class Cb extends Xn{constructor(e=null,t=1,r=1,a,l,c,d,h,f=Fn,m=Fn,g,x){super(null,c,d,h,f,m,a,l,g,x),this.isDataTexture=!0,this.image={data:e,width:t,height:r},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Ff=new ee,Rb=new ee,Ab=new mt;class Ms{constructor(e=new ee(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,r,a){return this.normal.set(e,t,r),this.constant=a,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,r){const a=Ff.subVectors(r,t).cross(Rb.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(a,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,r=!0){const a=e.delta(Ff),l=this.normal.dot(a);if(l===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const c=-(e.start.dot(this.normal)+this.constant)/l;return r===!0&&(c<0||c>1)?null:t.copy(e.start).addScaledVector(a,c)}intersectsLine(e){const t=this.distanceToPoint(e.start),r=this.distanceToPoint(e.end);return t<0&&r>0||r<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const r=t||Ab.getNormalMatrix(e),a=this.coplanarPoint(Ff).applyMatrix4(e),l=this.normal.applyMatrix3(r).normalize();return this.constant=-a.dot(l),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const aa=new nc,Pb=new ht(.5,.5),Pu=new ee;class km{constructor(e=new Ms,t=new Ms,r=new Ms,a=new Ms,l=new Ms,c=new Ms){this.planes=[e,t,r,a,l,c]}set(e,t,r,a,l,c){const d=this.planes;return d[0].copy(e),d[1].copy(t),d[2].copy(r),d[3].copy(a),d[4].copy(l),d[5].copy(c),this}copy(e){const t=this.planes;for(let r=0;r<6;r++)t[r].copy(e.planes[r]);return this}setFromProjectionMatrix(e,t=pr,r=!1){const a=this.planes,l=e.elements,c=l[0],d=l[1],h=l[2],f=l[3],m=l[4],g=l[5],x=l[6],M=l[7],E=l[8],w=l[9],_=l[10],y=l[11],L=l[12],P=l[13],C=l[14],F=l[15];if(a[0].setComponents(f-c,M-m,y-E,F-L).normalize(),a[1].setComponents(f+c,M+m,y+E,F+L).normalize(),a[2].setComponents(f+d,M+g,y+w,F+P).normalize(),a[3].setComponents(f-d,M-g,y-w,F-P).normalize(),r)a[4].setComponents(h,x,_,C).normalize(),a[5].setComponents(f-h,M-x,y-_,F-C).normalize();else if(a[4].setComponents(f-h,M-x,y-_,F-C).normalize(),t===pr)a[5].setComponents(f+h,M+x,y+_,F+C).normalize();else if(t===Xl)a[5].setComponents(h,x,_,C).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),aa.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),aa.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(aa)}intersectsSprite(e){aa.center.set(0,0,0);const t=Pb.distanceTo(e.center);return aa.radius=.7071067811865476+t,aa.applyMatrix4(e.matrixWorld),this.intersectsSphere(aa)}intersectsSphere(e){const t=this.planes,r=e.center,a=-e.radius;for(let l=0;l<6;l++)if(t[l].distanceToPoint(r)<a)return!1;return!0}intersectsBox(e){const t=this.planes;for(let r=0;r<6;r++){const a=t[r];if(Pu.x=a.normal.x>0?e.max.x:e.min.x,Pu.y=a.normal.y>0?e.max.y:e.min.y,Pu.z=a.normal.z>0?e.max.z:e.min.z,a.distanceToPoint(Pu)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let r=0;r<6;r++)if(t[r].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Qu extends _r{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new xt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const ld=new ee,cd=new ee,hv=new sn,Nl=new xd,Nu=new nc,Of=new ee,fv=new ee;class Nb extends En{constructor(e=new Mi,t=new Qu){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,r=[0];for(let a=1,l=t.count;a<l;a++)ld.fromBufferAttribute(t,a-1),cd.fromBufferAttribute(t,a),r[a]=r[a-1],r[a]+=ld.distanceTo(cd);e.setAttribute("lineDistance",new Un(r,1))}else ct("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const r=this.geometry,a=this.matrixWorld,l=e.params.Line.threshold,c=r.drawRange;if(r.boundingSphere===null&&r.computeBoundingSphere(),Nu.copy(r.boundingSphere),Nu.applyMatrix4(a),Nu.radius+=l,e.ray.intersectsSphere(Nu)===!1)return;hv.copy(a).invert(),Nl.copy(e.ray).applyMatrix4(hv);const d=l/((this.scale.x+this.scale.y+this.scale.z)/3),h=d*d,f=this.isLineSegments?2:1,m=r.index,x=r.attributes.position;if(m!==null){const M=Math.max(0,c.start),E=Math.min(m.count,c.start+c.count);for(let w=M,_=E-1;w<_;w+=f){const y=m.getX(w),L=m.getX(w+1),P=Lu(this,e,Nl,h,y,L,w);P&&t.push(P)}if(this.isLineLoop){const w=m.getX(E-1),_=m.getX(M),y=Lu(this,e,Nl,h,w,_,E-1);y&&t.push(y)}}else{const M=Math.max(0,c.start),E=Math.min(x.count,c.start+c.count);for(let w=M,_=E-1;w<_;w+=f){const y=Lu(this,e,Nl,h,w,w+1,w);y&&t.push(y)}if(this.isLineLoop){const w=Lu(this,e,Nl,h,E-1,M,E-1);w&&t.push(w)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}}function Lu(i,e,t,r,a,l,c){const d=i.geometry.attributes.position;if(ld.fromBufferAttribute(d,a),cd.fromBufferAttribute(d,l),t.distanceSqToSegment(ld,cd,Of,fv)>r)return;Of.applyMatrix4(i.matrixWorld);const f=e.ray.origin.distanceTo(Of);if(!(f<e.near||f>e.far))return{distance:f,point:fv.clone().applyMatrix4(i.matrixWorld),index:c,face:null,faceIndex:null,barycoord:null,object:i}}const pv=new ee,mv=new ee;class gv extends Nb{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,r=[];for(let a=0,l=t.count;a<l;a+=2)pv.fromBufferAttribute(t,a),mv.fromBufferAttribute(t,a+1),r[a]=a===0?0:r[a-1],r[a+1]=r[a]+pv.distanceTo(mv);e.setAttribute("lineDistance",new Un(r,1))}else ct("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class Ol extends _r{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new xt(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const xv=new sn,tm=new xd,Du=new nc,Iu=new ee;class kf extends En{constructor(e=new Mi,t=new Ol){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const r=this.geometry,a=this.matrixWorld,l=e.params.Points.threshold,c=r.drawRange;if(r.boundingSphere===null&&r.computeBoundingSphere(),Du.copy(r.boundingSphere),Du.applyMatrix4(a),Du.radius+=l,e.ray.intersectsSphere(Du)===!1)return;xv.copy(a).invert(),tm.copy(e.ray).applyMatrix4(xv);const d=l/((this.scale.x+this.scale.y+this.scale.z)/3),h=d*d,f=r.index,g=r.attributes.position;if(f!==null){const x=Math.max(0,c.start),M=Math.min(f.count,c.start+c.count);for(let E=x,w=M;E<w;E++){const _=f.getX(E);Iu.fromBufferAttribute(g,_),vv(Iu,_,h,a,e,t,this)}}else{const x=Math.max(0,c.start),M=Math.min(g.count,c.start+c.count);for(let E=x,w=M;E<w;E++)Iu.fromBufferAttribute(g,E),vv(Iu,E,h,a,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}}function vv(i,e,t,r,a,l,c){const d=tm.distanceSqToPoint(i);if(d<t){const h=new ee;tm.closestPointToPoint(i,h),h.applyMatrix4(r);const f=a.ray.origin.distanceTo(h);if(f<a.near||f>a.far)return;l.push({distance:f,distanceToRay:Math.sqrt(d),point:h,index:e,face:null,faceIndex:null,barycoord:null,object:c})}}class yy extends Xn{constructor(e=[],t=ba,r,a,l,c,d,h,f,m){super(e,t,r,a,l,c,d,h,f,m),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Uo extends Xn{constructor(e,t,r=vr,a,l,c,d=Fn,h=Fn,f,m=qr,g=1){if(m!==qr&&m!==ha)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const x={width:e,height:t,depth:g};super(x,a,l,c,d,h,m,r,f),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Om(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class Lb extends Uo{constructor(e,t=vr,r=ba,a,l,c=Fn,d=Fn,h,f=qr){const m={width:e,height:e,depth:1},g=[m,m,m,m,m,m];super(e,e,t,r,a,l,c,d,h,f),this.image=g,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class Sy extends Xn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class ic extends Mi{constructor(e=1,t=1,r=1,a=1,l=1,c=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:r,widthSegments:a,heightSegments:l,depthSegments:c};const d=this;a=Math.floor(a),l=Math.floor(l),c=Math.floor(c);const h=[],f=[],m=[],g=[];let x=0,M=0;E("z","y","x",-1,-1,r,t,e,c,l,0),E("z","y","x",1,-1,r,t,-e,c,l,1),E("x","z","y",1,1,e,r,t,a,c,2),E("x","z","y",1,-1,e,r,-t,a,c,3),E("x","y","z",1,-1,e,t,r,a,l,4),E("x","y","z",-1,-1,e,t,-r,a,l,5),this.setIndex(h),this.setAttribute("position",new Un(f,3)),this.setAttribute("normal",new Un(m,3)),this.setAttribute("uv",new Un(g,2));function E(w,_,y,L,P,C,F,N,O,b,U){const G=C/O,D=F/b,K=C/2,ne=F/2,me=N/2,k=O+1,he=b+1;let J=0,$=0;const ce=new ee;for(let ue=0;ue<he;ue++){const z=ue*D-ne;for(let X=0;X<k;X++){const Ue=X*G-K;ce[w]=Ue*L,ce[_]=z*P,ce[y]=me,f.push(ce.x,ce.y,ce.z),ce[w]=0,ce[_]=0,ce[y]=N>0?1:-1,m.push(ce.x,ce.y,ce.z),g.push(X/O),g.push(1-ue/b),J+=1}}for(let ue=0;ue<b;ue++)for(let z=0;z<O;z++){const X=x+z+k*ue,Ue=x+z+k*(ue+1),He=x+(z+1)+k*(ue+1),Ve=x+(z+1)+k*ue;h.push(X,Ue,Ve),h.push(Ue,He,Ve),$+=6}d.addGroup(M,$,U),M+=$,x+=J}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ic(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class vd extends Mi{constructor(e=1,t=1,r=1,a=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:r,heightSegments:a};const l=e/2,c=t/2,d=Math.floor(r),h=Math.floor(a),f=d+1,m=h+1,g=e/d,x=t/h,M=[],E=[],w=[],_=[];for(let y=0;y<m;y++){const L=y*x-c;for(let P=0;P<f;P++){const C=P*g-l;E.push(C,-L,0),w.push(0,0,1),_.push(P/d),_.push(1-y/h)}}for(let y=0;y<h;y++)for(let L=0;L<d;L++){const P=L+f*y,C=L+f*(y+1),F=L+1+f*(y+1),N=L+1+f*y;M.push(P,C,N),M.push(C,F,N)}this.setIndex(M),this.setAttribute("position",new Un(E,3)),this.setAttribute("normal",new Un(w,3)),this.setAttribute("uv",new Un(_,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new vd(e.width,e.height,e.widthSegments,e.heightSegments)}}function Fo(i){const e={};for(const t in i){e[t]={};for(const r in i[t]){const a=i[t][r];if(_v(a))a.isRenderTargetTexture?(ct("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][r]=null):e[t][r]=a.clone();else if(Array.isArray(a))if(_v(a[0])){const l=[];for(let c=0,d=a.length;c<d;c++)l[c]=a[c].clone();e[t][r]=l}else e[t][r]=a.slice();else e[t][r]=a}}return e}function Kn(i){const e={};for(let t=0;t<i.length;t++){const r=Fo(i[t]);for(const a in r)e[a]=r[a]}return e}function _v(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function Db(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function My(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:Rt.workingColorSpace}const Ib={clone:Fo,merge:Kn};var Ub=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Fb=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class yr extends _r{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Ub,this.fragmentShader=Fb,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Fo(e.uniforms),this.uniformsGroups=Db(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const a in this.uniforms){const c=this.uniforms[a].value;c&&c.isTexture?t.uniforms[a]={type:"t",value:c.toJSON(e).uuid}:c&&c.isColor?t.uniforms[a]={type:"c",value:c.getHex()}:c&&c.isVector2?t.uniforms[a]={type:"v2",value:c.toArray()}:c&&c.isVector3?t.uniforms[a]={type:"v3",value:c.toArray()}:c&&c.isVector4?t.uniforms[a]={type:"v4",value:c.toArray()}:c&&c.isMatrix3?t.uniforms[a]={type:"m3",value:c.toArray()}:c&&c.isMatrix4?t.uniforms[a]={type:"m4",value:c.toArray()}:t.uniforms[a]={value:c}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const r={};for(const a in this.extensions)this.extensions[a]===!0&&(r[a]=!0);return Object.keys(r).length>0&&(t.extensions=r),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(const r in e.uniforms){const a=e.uniforms[r];switch(this.uniforms[r]={},a.type){case"t":this.uniforms[r].value=t[a.value]||null;break;case"c":this.uniforms[r].value=new xt().setHex(a.value);break;case"v2":this.uniforms[r].value=new ht().fromArray(a.value);break;case"v3":this.uniforms[r].value=new ee().fromArray(a.value);break;case"v4":this.uniforms[r].value=new cn().fromArray(a.value);break;case"m3":this.uniforms[r].value=new mt().fromArray(a.value);break;case"m4":this.uniforms[r].value=new sn().fromArray(a.value);break;default:this.uniforms[r].value=a.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(const r in e.extensions)this.extensions[r]=e.extensions[r];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}}class Ob extends yr{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class zf extends _r{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new xt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new xt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=sd,this.normalScale=new ht(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Yr,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class kb extends _r{constructor(e){super(),this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new xt(16777215),this.specular=new xt(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new xt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=sd,this.normalScale=new ht(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Yr,this.combine=Cm,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.specular.copy(e.specular),this.shininess=e.shininess,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class zb extends _r{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=qw,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class Bb extends _r{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const zl={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(yv(i)||(this.files[i]=e))},get:function(i){if(this.enabled!==!1&&!yv(i))return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};function yv(i){try{const e=i.slice(i.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}class Hb{constructor(e,t,r){const a=this;let l=!1,c=0,d=0,h;const f=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=r,this._abortController=null,this.itemStart=function(m){d++,l===!1&&a.onStart!==void 0&&a.onStart(m,c,d),l=!0},this.itemEnd=function(m){c++,a.onProgress!==void 0&&a.onProgress(m,c,d),c===d&&(l=!1,a.onLoad!==void 0&&a.onLoad())},this.itemError=function(m){a.onError!==void 0&&a.onError(m)},this.resolveURL=function(m){return m=m.normalize("NFC"),h?h(m):m},this.setURLModifier=function(m){return h=m,this},this.addHandler=function(m,g){return f.push(m,g),this},this.removeHandler=function(m){const g=f.indexOf(m);return g!==-1&&f.splice(g,2),this},this.getHandler=function(m){for(let g=0,x=f.length;g<x;g+=2){const M=f[g],E=f[g+1];if(M.global&&(M.lastIndex=0),M.test(m))return E}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const Vb=new Hb;class rc{constructor(e){this.manager=e!==void 0?e:Vb,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){const r=this;return new Promise(function(a,l){r.load(e,a,t,l)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}rc.DEFAULT_MATERIAL_NAME="__DEFAULT";const Ur={};class Gb extends Error{constructor(e,t){super(e),this.response=t}}class jb extends rc{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,r,a){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const l=zl.get(`file:${e}`);if(l!==void 0){this.manager.itemStart(e),setTimeout(()=>{t&&t(l),this.manager.itemEnd(e)},0);return}if(Ur[e]!==void 0){Ur[e].push({onLoad:t,onProgress:r,onError:a});return}Ur[e]=[],Ur[e].push({onLoad:t,onProgress:r,onError:a});const c=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),d=this.mimeType,h=this.responseType;fetch(c).then(f=>{if(f.status===200||f.status===0){if(f.status===0&&ct("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||f.body===void 0||f.body.getReader===void 0)return f;const m=Ur[e],g=f.body.getReader(),x=f.headers.get("X-File-Size")||f.headers.get("Content-Length"),M=x?parseInt(x):0,E=M!==0;let w=0;const _=new ReadableStream({start(y){L();function L(){g.read().then(({done:P,value:C})=>{if(P)y.close();else{w+=C.byteLength;const F=new ProgressEvent("progress",{lengthComputable:E,loaded:w,total:M});for(let N=0,O=m.length;N<O;N++){const b=m[N];b.onProgress&&b.onProgress(F)}y.enqueue(C),L()}},P=>{y.error(P)})}}});return new Response(_)}else throw new Gb(`fetch for "${f.url}" responded with ${f.status}: ${f.statusText}`,f)}).then(f=>{switch(h){case"arraybuffer":return f.arrayBuffer();case"blob":return f.blob();case"document":return f.text().then(m=>new DOMParser().parseFromString(m,d));case"json":return f.json();default:if(d==="")return f.text();{const g=/charset="?([^;"\s]*)"?/i.exec(d),x=g&&g[1]?g[1].toLowerCase():void 0,M=new TextDecoder(x);return f.arrayBuffer().then(E=>M.decode(E))}}}).then(f=>{zl.add(`file:${e}`,f);const m=Ur[e];delete Ur[e];for(let g=0,x=m.length;g<x;g++){const M=m[g];M.onLoad&&M.onLoad(f)}}).catch(f=>{const m=Ur[e];if(m===void 0)throw this.manager.itemError(e),f;delete Ur[e];for(let g=0,x=m.length;g<x;g++){const M=m[g];M.onError&&M.onError(f)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const lo=new WeakMap;class Wb extends rc{constructor(e){super(e)}load(e,t,r,a){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const l=this,c=zl.get(`image:${e}`);if(c!==void 0){if(c.complete===!0)l.manager.itemStart(e),setTimeout(function(){t&&t(c),l.manager.itemEnd(e)},0);else{let g=lo.get(c);g===void 0&&(g=[],lo.set(c,g)),g.push({onLoad:t,onError:a})}return c}const d=$l("img");function h(){m(),t&&t(this);const g=lo.get(this)||[];for(let x=0;x<g.length;x++){const M=g[x];M.onLoad&&M.onLoad(this)}lo.delete(this),l.manager.itemEnd(e)}function f(g){m(),a&&a(g),zl.remove(`image:${e}`);const x=lo.get(this)||[];for(let M=0;M<x.length;M++){const E=x[M];E.onError&&E.onError(g)}lo.delete(this),l.manager.itemError(e),l.manager.itemEnd(e)}function m(){d.removeEventListener("load",h,!1),d.removeEventListener("error",f,!1)}return d.addEventListener("load",h,!1),d.addEventListener("error",f,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(d.crossOrigin=this.crossOrigin),zl.add(`image:${e}`,d),l.manager.itemStart(e),d.src=e,d}}class Xb extends rc{constructor(e){super(e)}load(e,t,r,a){const l=new Xn,c=new Wb(this.manager);return c.setCrossOrigin(this.crossOrigin),c.setPath(this.path),c.load(e,function(d){l.image=d,l.needsUpdate=!0,t!==void 0&&t(l)},r,a),l}}class zm extends En{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new xt(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}class $b extends zm{constructor(e,t,r){super(e,r),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(En.DEFAULT_UP),this.updateMatrix(),this.groundColor=new xt(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){const t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}}const Bf=new sn,Sv=new ee,Mv=new ee;class qb{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ht(512,512),this.mapType=Si,this.map=null,this.mapPass=null,this.matrix=new sn,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new km,this._frameExtents=new ht(1,1),this._viewportCount=1,this._viewports=[new cn(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,r=this.matrix;Sv.setFromMatrixPosition(e.matrixWorld),t.position.copy(Sv),Mv.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Mv),t.updateMatrixWorld(),Bf.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Bf,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===Xl||t.reversedDepth?r.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):r.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),r.multiply(Bf)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Uu=new ee,Fu=new Os,ar=new ee;class Ey extends En{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new sn,this.projectionMatrix=new sn,this.projectionMatrixInverse=new sn,this.coordinateSystem=pr,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Uu,Fu,ar),ar.x===1&&ar.y===1&&ar.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Uu,Fu,ar.set(1,1,1)).invert()}updateWorldMatrix(e,t,r=!1){super.updateWorldMatrix(e,t,r),this.matrixWorld.decompose(Uu,Fu,ar),ar.x===1&&ar.y===1&&ar.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Uu,Fu,ar.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const ys=new ee,Ev=new ht,wv=new ht;class Ii extends Ey{constructor(e=50,t=1,r=.1,a=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=r,this.far=a,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=em*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Ku*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return em*2*Math.atan(Math.tan(Ku*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,r){ys.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(ys.x,ys.y).multiplyScalar(-e/ys.z),ys.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),r.set(ys.x,ys.y).multiplyScalar(-e/ys.z)}getViewSize(e,t){return this.getViewBounds(e,Ev,wv),t.subVectors(wv,Ev)}setViewOffset(e,t,r,a,l,c){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=r,this.view.offsetY=a,this.view.width=l,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Ku*.5*this.fov)/this.zoom,r=2*t,a=this.aspect*r,l=-.5*a;const c=this.view;if(this.view!==null&&this.view.enabled){const h=c.fullWidth,f=c.fullHeight;l+=c.offsetX*a/h,t-=c.offsetY*r/f,a*=c.width/h,r*=c.height/f}const d=this.filmOffset;d!==0&&(l+=e*d/this.getFilmWidth()),this.projectionMatrix.makePerspective(l,l+a,t,t-r,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class Bm extends Ey{constructor(e=-1,t=1,r=1,a=-1,l=.1,c=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=r,this.bottom=a,this.near=l,this.far=c,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,r,a,l,c){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=r,this.view.offsetY=a,this.view.width=l,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),r=(this.right+this.left)/2,a=(this.top+this.bottom)/2;let l=r-e,c=r+e,d=a+t,h=a-t;if(this.view!==null&&this.view.enabled){const f=(this.right-this.left)/this.view.fullWidth/this.zoom,m=(this.top-this.bottom)/this.view.fullHeight/this.zoom;l+=f*this.view.offsetX,c=l+f*this.view.width,d-=m*this.view.offsetY,h=d-m*this.view.height}this.projectionMatrix.makeOrthographic(l,c,d,h,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class Yb extends qb{constructor(){super(new Bm(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Hf extends zm{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(En.DEFAULT_UP),this.updateMatrix(),this.target=new En,this.shadow=new Yb}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}class Kb extends zm{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}const co=-90,uo=1;class Qb extends En{constructor(e,t,r){super(),this.type="CubeCamera",this.renderTarget=r,this.coordinateSystem=null,this.activeMipmapLevel=0;const a=new Ii(co,uo,e,t);a.layers=this.layers,this.add(a);const l=new Ii(co,uo,e,t);l.layers=this.layers,this.add(l);const c=new Ii(co,uo,e,t);c.layers=this.layers,this.add(c);const d=new Ii(co,uo,e,t);d.layers=this.layers,this.add(d);const h=new Ii(co,uo,e,t);h.layers=this.layers,this.add(h);const f=new Ii(co,uo,e,t);f.layers=this.layers,this.add(f)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[r,a,l,c,d,h]=t;for(const f of t)this.remove(f);if(e===pr)r.up.set(0,1,0),r.lookAt(1,0,0),a.up.set(0,1,0),a.lookAt(-1,0,0),l.up.set(0,0,-1),l.lookAt(0,1,0),c.up.set(0,0,1),c.lookAt(0,-1,0),d.up.set(0,1,0),d.lookAt(0,0,1),h.up.set(0,1,0),h.lookAt(0,0,-1);else if(e===Xl)r.up.set(0,-1,0),r.lookAt(-1,0,0),a.up.set(0,-1,0),a.lookAt(1,0,0),l.up.set(0,0,1),l.lookAt(0,1,0),c.up.set(0,0,-1),c.lookAt(0,-1,0),d.up.set(0,-1,0),d.lookAt(0,0,1),h.up.set(0,-1,0),h.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const f of t)this.add(f),f.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:r,activeMipmapLevel:a}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[l,c,d,h,f,m]=this.children,g=e.getRenderTarget(),x=e.getActiveCubeFace(),M=e.getActiveMipmapLevel(),E=e.xr.enabled;e.xr.enabled=!1;const w=r.texture.generateMipmaps;r.texture.generateMipmaps=!1;let _=!1;e.isWebGLRenderer===!0?_=e.state.buffers.depth.getReversed():_=e.reversedDepthBuffer,e.setRenderTarget(r,0,a),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(r,1,a),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(r,2,a),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,d),e.setRenderTarget(r,3,a),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(r,4,a),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,f),r.texture.generateMipmaps=w,e.setRenderTarget(r,5,a),_&&e.autoClear===!1&&e.clearDepth(),e.render(t,m),e.setRenderTarget(g,x,M),e.xr.enabled=E,r.texture.needsPMREMUpdate=!0}}class Zb extends Ii{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class bv{constructor(e=1,t=0,r=0){this.radius=e,this.phi=t,this.theta=r}set(e,t,r){return this.radius=e,this.phi=t,this.theta=r,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=bt(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,r){return this.radius=Math.sqrt(e*e+t*t+r*r),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,r),this.phi=Math.acos(bt(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}const Xm=class Xm{constructor(e,t,r,a){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,r,a)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let r=0;r<4;r++)this.elements[r]=e[r+t];return this}set(e,t,r,a){const l=this.elements;return l[0]=e,l[2]=t,l[1]=r,l[3]=a,this}};Xm.prototype.isMatrix2=!0;let Tv=Xm;class Jb extends ks{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){if(e===void 0){ct("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}}function Cv(i,e,t,r){const a=eT(r);switch(t){case uy:return i*e;case hy:return i*e/a.components*a.byteLength;case Lm:return i*e/a.components*a.byteLength;case Ta:return i*e*2/a.components*a.byteLength;case Dm:return i*e*2/a.components*a.byteLength;case dy:return i*e*3/a.components*a.byteLength;case Ki:return i*e*4/a.components*a.byteLength;case Im:return i*e*4/a.components*a.byteLength;case Xu:case $u:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case qu:case Yu:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case bp:case Cp:return Math.max(i,16)*Math.max(e,8)/4;case wp:case Tp:return Math.max(i,8)*Math.max(e,8)/2;case Rp:case Ap:case Np:case Lp:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Pp:case id:case Dp:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Ip:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Up:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case Fp:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case Op:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case kp:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case zp:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case Bp:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case Hp:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case Vp:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case Gp:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case jp:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Wp:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case Xp:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case $p:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case qp:case Yp:case Kp:return Math.ceil(i/4)*Math.ceil(e/4)*16;case Qp:case Zp:return Math.ceil(i/4)*Math.ceil(e/4)*8;case rd:case Jp:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function eT(i){switch(i){case Si:case ay:return{byteLength:1,components:1};case jl:case oy:case $r:return{byteLength:2,components:1};case Pm:case Nm:return{byteLength:2,components:4};case vr:case Am:case fr:return{byteLength:4,components:1};case ly:case cy:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Tm}}));typeof window<"u"&&(window.__THREE__?ct("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Tm);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function wy(){let i=null,e=!1,t=null,r=null;function a(l,c){t(l,c),r=i.requestAnimationFrame(a)}return{start:function(){e!==!0&&t!==null&&i!==null&&(r=i.requestAnimationFrame(a),e=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(r),e=!1},setAnimationLoop:function(l){t=l},setContext:function(l){i=l}}}function tT(i){const e=new WeakMap;function t(d,h){const f=d.array,m=d.usage,g=f.byteLength,x=i.createBuffer();i.bindBuffer(h,x),i.bufferData(h,f,m),d.onUploadCallback();let M;if(f instanceof Float32Array)M=i.FLOAT;else if(typeof Float16Array<"u"&&f instanceof Float16Array)M=i.HALF_FLOAT;else if(f instanceof Uint16Array)d.isFloat16BufferAttribute?M=i.HALF_FLOAT:M=i.UNSIGNED_SHORT;else if(f instanceof Int16Array)M=i.SHORT;else if(f instanceof Uint32Array)M=i.UNSIGNED_INT;else if(f instanceof Int32Array)M=i.INT;else if(f instanceof Int8Array)M=i.BYTE;else if(f instanceof Uint8Array)M=i.UNSIGNED_BYTE;else if(f instanceof Uint8ClampedArray)M=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+f);return{buffer:x,type:M,bytesPerElement:f.BYTES_PER_ELEMENT,version:d.version,size:g}}function r(d,h,f){const m=h.array,g=h.updateRanges;if(i.bindBuffer(f,d),g.length===0)i.bufferSubData(f,0,m);else{g.sort((M,E)=>M.start-E.start);let x=0;for(let M=1;M<g.length;M++){const E=g[x],w=g[M];w.start<=E.start+E.count+1?E.count=Math.max(E.count,w.start+w.count-E.start):(++x,g[x]=w)}g.length=x+1;for(let M=0,E=g.length;M<E;M++){const w=g[M];i.bufferSubData(f,w.start*m.BYTES_PER_ELEMENT,m,w.start,w.count)}h.clearUpdateRanges()}h.onUploadCallback()}function a(d){return d.isInterleavedBufferAttribute&&(d=d.data),e.get(d)}function l(d){d.isInterleavedBufferAttribute&&(d=d.data);const h=e.get(d);h&&(i.deleteBuffer(h.buffer),e.delete(d))}function c(d,h){if(d.isInterleavedBufferAttribute&&(d=d.data),d.isGLBufferAttribute){const m=e.get(d);(!m||m.version<d.version)&&e.set(d,{buffer:d.buffer,type:d.type,bytesPerElement:d.elementSize,version:d.version});return}const f=e.get(d);if(f===void 0)e.set(d,t(d,h));else if(f.version<d.version){if(f.size!==d.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");r(f.buffer,d,h),f.version=d.version}}return{get:a,remove:l,update:c}}var nT=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,iT=`#ifdef USE_ALPHAHASH
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
#endif`,rT=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,sT=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,aT=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,oT=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,lT=`#ifdef USE_AOMAP
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
#endif`,cT=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,uT=`#ifdef USE_BATCHING
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
#endif`,dT=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,hT=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,fT=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,pT=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,mT=`#ifdef USE_IRIDESCENCE
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
#endif`,gT=`#ifdef USE_BUMPMAP
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
#endif`,xT=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,vT=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,_T=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,yT=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,ST=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,MT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,ET=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,wT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,bT=`#define PI 3.141592653589793
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
} // validated`,TT=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,CT=`vec3 transformedNormal = objectNormal;
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
#endif`,RT=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,AT=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,PT=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,NT=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,LT="gl_FragColor = linearToOutputTexel( gl_FragColor );",DT=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,IT=`#ifdef USE_ENVMAP
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
#endif`,UT=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,FT=`#ifdef USE_ENVMAP
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
#endif`,OT=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,kT=`#ifdef USE_ENVMAP
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
#endif`,zT=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,BT=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,HT=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,VT=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,GT=`#ifdef USE_GRADIENTMAP
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
}`,jT=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,WT=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,XT=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,$T=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,qT=`#ifdef USE_ENVMAP
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
#endif`,YT=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,KT=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,QT=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,ZT=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,JT=`PhysicalMaterial material;
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
#endif`,eC=`uniform sampler2D dfgLUT;
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
}`,tC=`
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
#endif`,nC=`#if defined( RE_IndirectDiffuse )
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
#endif`,iC=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,rC=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,sC=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,aC=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,oC=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,lC=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,cC=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,uC=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,dC=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,hC=`#if defined( USE_POINTS_UV )
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
#endif`,fC=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,pC=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,mC=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,gC=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,xC=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,vC=`#ifdef USE_MORPHTARGETS
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
#endif`,_C=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,yC=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,SC=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,MC=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,EC=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,wC=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,bC=`#ifdef USE_NORMALMAP
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
#endif`,TC=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,CC=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,RC=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,AC=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,PC=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,NC=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,LC=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,DC=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,IC=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,UC=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,FC=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,OC=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,kC=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,zC=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,BC=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,HC=`float getShadowMask() {
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
}`,VC=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,GC=`#ifdef USE_SKINNING
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
#endif`,jC=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,WC=`#ifdef USE_SKINNING
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
#endif`,XC=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,$C=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,qC=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,YC=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,KC=`#ifdef USE_TRANSMISSION
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
#endif`,QC=`#ifdef USE_TRANSMISSION
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
#endif`,ZC=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,JC=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,eR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,tR=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const nR=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,iR=`uniform sampler2D t2D;
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
}`,rR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,sR=`#ifdef ENVMAP_TYPE_CUBE
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
}`,aR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,oR=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,lR=`#include <common>
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
}`,cR=`#if DEPTH_PACKING == 3200
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
}`,uR=`#define DISTANCE
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
}`,dR=`#define DISTANCE
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
}`,hR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,fR=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,pR=`uniform float scale;
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
}`,mR=`uniform vec3 diffuse;
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
}`,gR=`#include <common>
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
}`,xR=`uniform vec3 diffuse;
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
}`,vR=`#define LAMBERT
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
}`,_R=`#define LAMBERT
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
}`,yR=`#define MATCAP
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
}`,SR=`#define MATCAP
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
}`,MR=`#define NORMAL
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
}`,ER=`#define NORMAL
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
}`,wR=`#define PHONG
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
}`,bR=`#define PHONG
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
}`,TR=`#define STANDARD
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
}`,CR=`#define STANDARD
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
}`,RR=`#define TOON
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
}`,AR=`#define TOON
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
}`,PR=`uniform float size;
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
}`,NR=`uniform vec3 diffuse;
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
}`,LR=`#include <common>
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
}`,DR=`uniform vec3 color;
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
}`,IR=`uniform float rotation;
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
}`,UR=`uniform vec3 diffuse;
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
}`,_t={alphahash_fragment:nT,alphahash_pars_fragment:iT,alphamap_fragment:rT,alphamap_pars_fragment:sT,alphatest_fragment:aT,alphatest_pars_fragment:oT,aomap_fragment:lT,aomap_pars_fragment:cT,batching_pars_vertex:uT,batching_vertex:dT,begin_vertex:hT,beginnormal_vertex:fT,bsdfs:pT,iridescence_fragment:mT,bumpmap_pars_fragment:gT,clipping_planes_fragment:xT,clipping_planes_pars_fragment:vT,clipping_planes_pars_vertex:_T,clipping_planes_vertex:yT,color_fragment:ST,color_pars_fragment:MT,color_pars_vertex:ET,color_vertex:wT,common:bT,cube_uv_reflection_fragment:TT,defaultnormal_vertex:CT,displacementmap_pars_vertex:RT,displacementmap_vertex:AT,emissivemap_fragment:PT,emissivemap_pars_fragment:NT,colorspace_fragment:LT,colorspace_pars_fragment:DT,envmap_fragment:IT,envmap_common_pars_fragment:UT,envmap_pars_fragment:FT,envmap_pars_vertex:OT,envmap_physical_pars_fragment:qT,envmap_vertex:kT,fog_vertex:zT,fog_pars_vertex:BT,fog_fragment:HT,fog_pars_fragment:VT,gradientmap_pars_fragment:GT,lightmap_pars_fragment:jT,lights_lambert_fragment:WT,lights_lambert_pars_fragment:XT,lights_pars_begin:$T,lights_toon_fragment:YT,lights_toon_pars_fragment:KT,lights_phong_fragment:QT,lights_phong_pars_fragment:ZT,lights_physical_fragment:JT,lights_physical_pars_fragment:eC,lights_fragment_begin:tC,lights_fragment_maps:nC,lights_fragment_end:iC,lightprobes_pars_fragment:rC,logdepthbuf_fragment:sC,logdepthbuf_pars_fragment:aC,logdepthbuf_pars_vertex:oC,logdepthbuf_vertex:lC,map_fragment:cC,map_pars_fragment:uC,map_particle_fragment:dC,map_particle_pars_fragment:hC,metalnessmap_fragment:fC,metalnessmap_pars_fragment:pC,morphinstance_vertex:mC,morphcolor_vertex:gC,morphnormal_vertex:xC,morphtarget_pars_vertex:vC,morphtarget_vertex:_C,normal_fragment_begin:yC,normal_fragment_maps:SC,normal_pars_fragment:MC,normal_pars_vertex:EC,normal_vertex:wC,normalmap_pars_fragment:bC,clearcoat_normal_fragment_begin:TC,clearcoat_normal_fragment_maps:CC,clearcoat_pars_fragment:RC,iridescence_pars_fragment:AC,opaque_fragment:PC,packing:NC,premultiplied_alpha_fragment:LC,project_vertex:DC,dithering_fragment:IC,dithering_pars_fragment:UC,roughnessmap_fragment:FC,roughnessmap_pars_fragment:OC,shadowmap_pars_fragment:kC,shadowmap_pars_vertex:zC,shadowmap_vertex:BC,shadowmask_pars_fragment:HC,skinbase_vertex:VC,skinning_pars_vertex:GC,skinning_vertex:jC,skinnormal_vertex:WC,specularmap_fragment:XC,specularmap_pars_fragment:$C,tonemapping_fragment:qC,tonemapping_pars_fragment:YC,transmission_fragment:KC,transmission_pars_fragment:QC,uv_pars_fragment:ZC,uv_pars_vertex:JC,uv_vertex:eR,worldpos_vertex:tR,background_vert:nR,background_frag:iR,backgroundCube_vert:rR,backgroundCube_frag:sR,cube_vert:aR,cube_frag:oR,depth_vert:lR,depth_frag:cR,distance_vert:uR,distance_frag:dR,equirect_vert:hR,equirect_frag:fR,linedashed_vert:pR,linedashed_frag:mR,meshbasic_vert:gR,meshbasic_frag:xR,meshlambert_vert:vR,meshlambert_frag:_R,meshmatcap_vert:yR,meshmatcap_frag:SR,meshnormal_vert:MR,meshnormal_frag:ER,meshphong_vert:wR,meshphong_frag:bR,meshphysical_vert:TR,meshphysical_frag:CR,meshtoon_vert:RR,meshtoon_frag:AR,points_vert:PR,points_frag:NR,shadow_vert:LR,shadow_frag:DR,sprite_vert:IR,sprite_frag:UR},ze={common:{diffuse:{value:new xt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new mt},alphaMap:{value:null},alphaMapTransform:{value:new mt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new mt}},envmap:{envMap:{value:null},envMapRotation:{value:new mt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new mt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new mt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new mt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new mt},normalScale:{value:new ht(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new mt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new mt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new mt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new mt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new xt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new ee},probesMax:{value:new ee},probesResolution:{value:new ee}},points:{diffuse:{value:new xt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new mt},alphaTest:{value:0},uvTransform:{value:new mt}},sprite:{diffuse:{value:new xt(16777215)},opacity:{value:1},center:{value:new ht(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new mt},alphaMap:{value:null},alphaMapTransform:{value:new mt},alphaTest:{value:0}}},dr={basic:{uniforms:Kn([ze.common,ze.specularmap,ze.envmap,ze.aomap,ze.lightmap,ze.fog]),vertexShader:_t.meshbasic_vert,fragmentShader:_t.meshbasic_frag},lambert:{uniforms:Kn([ze.common,ze.specularmap,ze.envmap,ze.aomap,ze.lightmap,ze.emissivemap,ze.bumpmap,ze.normalmap,ze.displacementmap,ze.fog,ze.lights,{emissive:{value:new xt(0)},envMapIntensity:{value:1}}]),vertexShader:_t.meshlambert_vert,fragmentShader:_t.meshlambert_frag},phong:{uniforms:Kn([ze.common,ze.specularmap,ze.envmap,ze.aomap,ze.lightmap,ze.emissivemap,ze.bumpmap,ze.normalmap,ze.displacementmap,ze.fog,ze.lights,{emissive:{value:new xt(0)},specular:{value:new xt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:_t.meshphong_vert,fragmentShader:_t.meshphong_frag},standard:{uniforms:Kn([ze.common,ze.envmap,ze.aomap,ze.lightmap,ze.emissivemap,ze.bumpmap,ze.normalmap,ze.displacementmap,ze.roughnessmap,ze.metalnessmap,ze.fog,ze.lights,{emissive:{value:new xt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:_t.meshphysical_vert,fragmentShader:_t.meshphysical_frag},toon:{uniforms:Kn([ze.common,ze.aomap,ze.lightmap,ze.emissivemap,ze.bumpmap,ze.normalmap,ze.displacementmap,ze.gradientmap,ze.fog,ze.lights,{emissive:{value:new xt(0)}}]),vertexShader:_t.meshtoon_vert,fragmentShader:_t.meshtoon_frag},matcap:{uniforms:Kn([ze.common,ze.bumpmap,ze.normalmap,ze.displacementmap,ze.fog,{matcap:{value:null}}]),vertexShader:_t.meshmatcap_vert,fragmentShader:_t.meshmatcap_frag},points:{uniforms:Kn([ze.points,ze.fog]),vertexShader:_t.points_vert,fragmentShader:_t.points_frag},dashed:{uniforms:Kn([ze.common,ze.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:_t.linedashed_vert,fragmentShader:_t.linedashed_frag},depth:{uniforms:Kn([ze.common,ze.displacementmap]),vertexShader:_t.depth_vert,fragmentShader:_t.depth_frag},normal:{uniforms:Kn([ze.common,ze.bumpmap,ze.normalmap,ze.displacementmap,{opacity:{value:1}}]),vertexShader:_t.meshnormal_vert,fragmentShader:_t.meshnormal_frag},sprite:{uniforms:Kn([ze.sprite,ze.fog]),vertexShader:_t.sprite_vert,fragmentShader:_t.sprite_frag},background:{uniforms:{uvTransform:{value:new mt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:_t.background_vert,fragmentShader:_t.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new mt}},vertexShader:_t.backgroundCube_vert,fragmentShader:_t.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:_t.cube_vert,fragmentShader:_t.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:_t.equirect_vert,fragmentShader:_t.equirect_frag},distance:{uniforms:Kn([ze.common,ze.displacementmap,{referencePosition:{value:new ee},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:_t.distance_vert,fragmentShader:_t.distance_frag},shadow:{uniforms:Kn([ze.lights,ze.fog,{color:{value:new xt(0)},opacity:{value:1}}]),vertexShader:_t.shadow_vert,fragmentShader:_t.shadow_frag}};dr.physical={uniforms:Kn([dr.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new mt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new mt},clearcoatNormalScale:{value:new ht(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new mt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new mt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new mt},sheen:{value:0},sheenColor:{value:new xt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new mt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new mt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new mt},transmissionSamplerSize:{value:new ht},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new mt},attenuationDistance:{value:0},attenuationColor:{value:new xt(0)},specularColor:{value:new xt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new mt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new mt},anisotropyVector:{value:new ht},anisotropyMap:{value:null},anisotropyMapTransform:{value:new mt}}]),vertexShader:_t.meshphysical_vert,fragmentShader:_t.meshphysical_frag};const Ou={r:0,b:0,g:0},FR=new sn,by=new mt;by.set(-1,0,0,0,1,0,0,0,1);function OR(i,e,t,r,a,l){const c=new xt(0);let d=a===!0?0:1,h,f,m=null,g=0,x=null;function M(L){let P=L.isScene===!0?L.background:null;if(P&&P.isTexture){const C=L.backgroundBlurriness>0;P=e.get(P,C)}return P}function E(L){let P=!1;const C=M(L);C===null?_(c,d):C&&C.isColor&&(_(C,1),P=!0);const F=i.xr.getEnvironmentBlendMode();F==="additive"?t.buffers.color.setClear(0,0,0,1,l):F==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,l),(i.autoClear||P)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function w(L,P){const C=M(P);C&&(C.isCubeTexture||C.mapping===gd)?(f===void 0&&(f=new Zi(new ic(1,1,1),new yr({name:"BackgroundCubeMaterial",uniforms:Fo(dr.backgroundCube.uniforms),vertexShader:dr.backgroundCube.vertexShader,fragmentShader:dr.backgroundCube.fragmentShader,side:hi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),f.geometry.deleteAttribute("normal"),f.geometry.deleteAttribute("uv"),f.onBeforeRender=function(F,N,O){this.matrixWorld.copyPosition(O.matrixWorld)},Object.defineProperty(f.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(f)),f.material.uniforms.envMap.value=C,f.material.uniforms.backgroundBlurriness.value=P.backgroundBlurriness,f.material.uniforms.backgroundIntensity.value=P.backgroundIntensity,f.material.uniforms.backgroundRotation.value.setFromMatrix4(FR.makeRotationFromEuler(P.backgroundRotation)).transpose(),C.isCubeTexture&&C.isRenderTargetTexture===!1&&f.material.uniforms.backgroundRotation.value.premultiply(by),f.material.toneMapped=Rt.getTransfer(C.colorSpace)!==Vt,(m!==C||g!==C.version||x!==i.toneMapping)&&(f.material.needsUpdate=!0,m=C,g=C.version,x=i.toneMapping),f.layers.enableAll(),L.unshift(f,f.geometry,f.material,0,0,null)):C&&C.isTexture&&(h===void 0&&(h=new Zi(new vd(2,2),new yr({name:"BackgroundMaterial",uniforms:Fo(dr.background.uniforms),vertexShader:dr.background.vertexShader,fragmentShader:dr.background.fragmentShader,side:Fs,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),Object.defineProperty(h.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(h)),h.material.uniforms.t2D.value=C,h.material.uniforms.backgroundIntensity.value=P.backgroundIntensity,h.material.toneMapped=Rt.getTransfer(C.colorSpace)!==Vt,C.matrixAutoUpdate===!0&&C.updateMatrix(),h.material.uniforms.uvTransform.value.copy(C.matrix),(m!==C||g!==C.version||x!==i.toneMapping)&&(h.material.needsUpdate=!0,m=C,g=C.version,x=i.toneMapping),h.layers.enableAll(),L.unshift(h,h.geometry,h.material,0,0,null))}function _(L,P){L.getRGB(Ou,My(i)),t.buffers.color.setClear(Ou.r,Ou.g,Ou.b,P,l)}function y(){f!==void 0&&(f.geometry.dispose(),f.material.dispose(),f=void 0),h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0)}return{getClearColor:function(){return c},setClearColor:function(L,P=1){c.set(L),d=P,_(c,d)},getClearAlpha:function(){return d},setClearAlpha:function(L){d=L,_(c,d)},render:E,addToRenderList:w,dispose:y}}function kR(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),r={},a=x(null);let l=a,c=!1;function d(D,K,ne,me,k){let he=!1;const J=g(D,me,ne,K);l!==J&&(l=J,f(l.object)),he=M(D,me,ne,k),he&&E(D,me,ne,k),k!==null&&e.update(k,i.ELEMENT_ARRAY_BUFFER),(he||c)&&(c=!1,C(D,K,ne,me),k!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(k).buffer))}function h(){return i.createVertexArray()}function f(D){return i.bindVertexArray(D)}function m(D){return i.deleteVertexArray(D)}function g(D,K,ne,me){const k=me.wireframe===!0;let he=r[K.id];he===void 0&&(he={},r[K.id]=he);const J=D.isInstancedMesh===!0?D.id:0;let $=he[J];$===void 0&&($={},he[J]=$);let ce=$[ne.id];ce===void 0&&(ce={},$[ne.id]=ce);let ue=ce[k];return ue===void 0&&(ue=x(h()),ce[k]=ue),ue}function x(D){const K=[],ne=[],me=[];for(let k=0;k<t;k++)K[k]=0,ne[k]=0,me[k]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:K,enabledAttributes:ne,attributeDivisors:me,object:D,attributes:{},index:null}}function M(D,K,ne,me){const k=l.attributes,he=K.attributes;let J=0;const $=ne.getAttributes();for(const ce in $)if($[ce].location>=0){const z=k[ce];let X=he[ce];if(X===void 0&&(ce==="instanceMatrix"&&D.instanceMatrix&&(X=D.instanceMatrix),ce==="instanceColor"&&D.instanceColor&&(X=D.instanceColor)),z===void 0||z.attribute!==X||X&&z.data!==X.data)return!0;J++}return l.attributesNum!==J||l.index!==me}function E(D,K,ne,me){const k={},he=K.attributes;let J=0;const $=ne.getAttributes();for(const ce in $)if($[ce].location>=0){let z=he[ce];z===void 0&&(ce==="instanceMatrix"&&D.instanceMatrix&&(z=D.instanceMatrix),ce==="instanceColor"&&D.instanceColor&&(z=D.instanceColor));const X={};X.attribute=z,z&&z.data&&(X.data=z.data),k[ce]=X,J++}l.attributes=k,l.attributesNum=J,l.index=me}function w(){const D=l.newAttributes;for(let K=0,ne=D.length;K<ne;K++)D[K]=0}function _(D){y(D,0)}function y(D,K){const ne=l.newAttributes,me=l.enabledAttributes,k=l.attributeDivisors;ne[D]=1,me[D]===0&&(i.enableVertexAttribArray(D),me[D]=1),k[D]!==K&&(i.vertexAttribDivisor(D,K),k[D]=K)}function L(){const D=l.newAttributes,K=l.enabledAttributes;for(let ne=0,me=K.length;ne<me;ne++)K[ne]!==D[ne]&&(i.disableVertexAttribArray(ne),K[ne]=0)}function P(D,K,ne,me,k,he,J){J===!0?i.vertexAttribIPointer(D,K,ne,k,he):i.vertexAttribPointer(D,K,ne,me,k,he)}function C(D,K,ne,me){w();const k=me.attributes,he=ne.getAttributes(),J=K.defaultAttributeValues;for(const $ in he){const ce=he[$];if(ce.location>=0){let ue=k[$];if(ue===void 0&&($==="instanceMatrix"&&D.instanceMatrix&&(ue=D.instanceMatrix),$==="instanceColor"&&D.instanceColor&&(ue=D.instanceColor)),ue!==void 0){const z=ue.normalized,X=ue.itemSize,Ue=e.get(ue);if(Ue===void 0)continue;const He=Ue.buffer,Ve=Ue.type,oe=Ue.bytesPerElement,Se=Ve===i.INT||Ve===i.UNSIGNED_INT||ue.gpuType===Am;if(ue.isInterleavedBufferAttribute){const ve=ue.data,Oe=ve.stride,Je=ue.offset;if(ve.isInstancedInterleavedBuffer){for(let nt=0;nt<ce.locationSize;nt++)y(ce.location+nt,ve.meshPerAttribute);D.isInstancedMesh!==!0&&me._maxInstanceCount===void 0&&(me._maxInstanceCount=ve.meshPerAttribute*ve.count)}else for(let nt=0;nt<ce.locationSize;nt++)_(ce.location+nt);i.bindBuffer(i.ARRAY_BUFFER,He);for(let nt=0;nt<ce.locationSize;nt++)P(ce.location+nt,X/ce.locationSize,Ve,z,Oe*oe,(Je+X/ce.locationSize*nt)*oe,Se)}else{if(ue.isInstancedBufferAttribute){for(let ve=0;ve<ce.locationSize;ve++)y(ce.location+ve,ue.meshPerAttribute);D.isInstancedMesh!==!0&&me._maxInstanceCount===void 0&&(me._maxInstanceCount=ue.meshPerAttribute*ue.count)}else for(let ve=0;ve<ce.locationSize;ve++)_(ce.location+ve);i.bindBuffer(i.ARRAY_BUFFER,He);for(let ve=0;ve<ce.locationSize;ve++)P(ce.location+ve,X/ce.locationSize,Ve,z,X*oe,X/ce.locationSize*ve*oe,Se)}}else if(J!==void 0){const z=J[$];if(z!==void 0)switch(z.length){case 2:i.vertexAttrib2fv(ce.location,z);break;case 3:i.vertexAttrib3fv(ce.location,z);break;case 4:i.vertexAttrib4fv(ce.location,z);break;default:i.vertexAttrib1fv(ce.location,z)}}}}L()}function F(){U();for(const D in r){const K=r[D];for(const ne in K){const me=K[ne];for(const k in me){const he=me[k];for(const J in he)m(he[J].object),delete he[J];delete me[k]}}delete r[D]}}function N(D){if(r[D.id]===void 0)return;const K=r[D.id];for(const ne in K){const me=K[ne];for(const k in me){const he=me[k];for(const J in he)m(he[J].object),delete he[J];delete me[k]}}delete r[D.id]}function O(D){for(const K in r){const ne=r[K];for(const me in ne){const k=ne[me];if(k[D.id]===void 0)continue;const he=k[D.id];for(const J in he)m(he[J].object),delete he[J];delete k[D.id]}}}function b(D){for(const K in r){const ne=r[K],me=D.isInstancedMesh===!0?D.id:0,k=ne[me];if(k!==void 0){for(const he in k){const J=k[he];for(const $ in J)m(J[$].object),delete J[$];delete k[he]}delete ne[me],Object.keys(ne).length===0&&delete r[K]}}}function U(){G(),c=!0,l!==a&&(l=a,f(l.object))}function G(){a.geometry=null,a.program=null,a.wireframe=!1}return{setup:d,reset:U,resetDefaultState:G,dispose:F,releaseStatesOfGeometry:N,releaseStatesOfObject:b,releaseStatesOfProgram:O,initAttributes:w,enableAttribute:_,disableUnusedAttributes:L}}function zR(i,e,t){let r;function a(h){r=h}function l(h,f){i.drawArrays(r,h,f),t.update(f,r,1)}function c(h,f,m){m!==0&&(i.drawArraysInstanced(r,h,f,m),t.update(f,r,m))}function d(h,f,m){if(m===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(r,h,0,f,0,m);let x=0;for(let M=0;M<m;M++)x+=f[M];t.update(x,r,1)}this.setMode=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=d}function BR(i,e,t,r){let a;function l(){if(a!==void 0)return a;if(e.has("EXT_texture_filter_anisotropic")===!0){const O=e.get("EXT_texture_filter_anisotropic");a=i.getParameter(O.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else a=0;return a}function c(O){return!(O!==Ki&&r.convert(O)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function d(O){const b=O===$r&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(O!==Si&&r.convert(O)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&O!==fr&&!b)}function h(O){if(O==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";O="mediump"}return O==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let f=t.precision!==void 0?t.precision:"highp";const m=h(f);m!==f&&(ct("WebGLRenderer:",f,"not supported, using",m,"instead."),f=m);const g=t.logarithmicDepthBuffer===!0,x=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&x===!1&&ct("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const M=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),E=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),w=i.getParameter(i.MAX_TEXTURE_SIZE),_=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),y=i.getParameter(i.MAX_VERTEX_ATTRIBS),L=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),P=i.getParameter(i.MAX_VARYING_VECTORS),C=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),F=i.getParameter(i.MAX_SAMPLES),N=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:l,getMaxPrecision:h,textureFormatReadable:c,textureTypeReadable:d,precision:f,logarithmicDepthBuffer:g,reversedDepthBuffer:x,maxTextures:M,maxVertexTextures:E,maxTextureSize:w,maxCubemapSize:_,maxAttributes:y,maxVertexUniforms:L,maxVaryings:P,maxFragmentUniforms:C,maxSamples:F,samples:N}}function HR(i){const e=this;let t=null,r=0,a=!1,l=!1;const c=new Ms,d=new mt,h={value:null,needsUpdate:!1};this.uniform=h,this.numPlanes=0,this.numIntersection=0,this.init=function(g,x){const M=g.length!==0||x||r!==0||a;return a=x,r=g.length,M},this.beginShadows=function(){l=!0,m(null)},this.endShadows=function(){l=!1},this.setGlobalState=function(g,x){t=m(g,x,0)},this.setState=function(g,x,M){const E=g.clippingPlanes,w=g.clipIntersection,_=g.clipShadows,y=i.get(g);if(!a||E===null||E.length===0||l&&!_)l?m(null):f();else{const L=l?0:r,P=L*4;let C=y.clippingState||null;h.value=C,C=m(E,x,P,M);for(let F=0;F!==P;++F)C[F]=t[F];y.clippingState=C,this.numIntersection=w?this.numPlanes:0,this.numPlanes+=L}};function f(){h.value!==t&&(h.value=t,h.needsUpdate=r>0),e.numPlanes=r,e.numIntersection=0}function m(g,x,M,E){const w=g!==null?g.length:0;let _=null;if(w!==0){if(_=h.value,E!==!0||_===null){const y=M+w*4,L=x.matrixWorldInverse;d.getNormalMatrix(L),(_===null||_.length<y)&&(_=new Float32Array(y));for(let P=0,C=M;P!==w;++P,C+=4)c.copy(g[P]).applyMatrix4(L,d),c.normal.toArray(_,C),_[C+3]=c.constant}h.value=_,h.needsUpdate=!0}return e.numPlanes=w,e.numIntersection=0,_}}const Is=4,Rv=[.125,.215,.35,.446,.526,.582],ca=20,VR=256,Ll=new Bm,Av=new xt;let Vf=null,Gf=0,jf=0,Wf=!1;const GR=new ee;class Pv{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,r=.1,a=100,l={}){const{size:c=256,position:d=GR}=l;Vf=this._renderer.getRenderTarget(),Gf=this._renderer.getActiveCubeFace(),jf=this._renderer.getActiveMipmapLevel(),Wf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(c);const h=this._allocateTargets();return h.depthBuffer=!0,this._sceneToCubeUV(e,r,a,h,d),t>0&&this._blur(h,0,0,t),this._applyPMREM(h),this._cleanup(h),h}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Dv(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Lv(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Vf,Gf,jf),this._renderer.xr.enabled=Wf,e.scissorTest=!1,ho(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===ba||e.mapping===Io?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Vf=this._renderer.getRenderTarget(),Gf=this._renderer.getActiveCubeFace(),jf=this._renderer.getActiveMipmapLevel(),Wf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const r=t||this._allocateTargets();return this._textureToCubeUV(e,r),this._applyPMREM(r),this._cleanup(r),r}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,r={magFilter:Wn,minFilter:Wn,generateMipmaps:!1,type:$r,format:Ki,colorSpace:ad,depthBuffer:!1},a=Nv(e,t,r);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Nv(e,t,r);const{_lodMax:l}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=jR(l)),this._blurMaterial=XR(l,e,t),this._ggxMaterial=WR(l,e,t)}return a}_compileMaterial(e){const t=new Zi(new Mi,e);this._renderer.compile(t,Ll)}_sceneToCubeUV(e,t,r,a,l){const h=new Ii(90,1,t,r),f=[1,-1,1,1,1,1],m=[1,1,1,-1,-1,-1],g=this._renderer,x=g.autoClear,M=g.toneMapping;g.getClearColor(Av),g.toneMapping=mr,g.autoClear=!1,g.state.buffers.depth.getReversed()&&(g.setRenderTarget(a),g.clearDepth(),g.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Zi(new ic,new _y({name:"PMREM.Background",side:hi,depthWrite:!1,depthTest:!1})));const w=this._backgroundBox,_=w.material;let y=!1;const L=e.background;L?L.isColor&&(_.color.copy(L),e.background=null,y=!0):(_.color.copy(Av),y=!0);for(let P=0;P<6;P++){const C=P%3;C===0?(h.up.set(0,f[P],0),h.position.set(l.x,l.y,l.z),h.lookAt(l.x+m[P],l.y,l.z)):C===1?(h.up.set(0,0,f[P]),h.position.set(l.x,l.y,l.z),h.lookAt(l.x,l.y+m[P],l.z)):(h.up.set(0,f[P],0),h.position.set(l.x,l.y,l.z),h.lookAt(l.x,l.y,l.z+m[P]));const F=this._cubeSize;ho(a,C*F,P>2?F:0,F,F),g.setRenderTarget(a),y&&g.render(w,h),g.render(e,h)}g.toneMapping=M,g.autoClear=x,e.background=L}_textureToCubeUV(e,t){const r=this._renderer,a=e.mapping===ba||e.mapping===Io;a?(this._cubemapMaterial===null&&(this._cubemapMaterial=Dv()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Lv());const l=a?this._cubemapMaterial:this._equirectMaterial,c=this._lodMeshes[0];c.material=l;const d=l.uniforms;d.envMap.value=e;const h=this._cubeSize;ho(t,0,0,3*h,2*h),r.setRenderTarget(t),r.render(c,Ll)}_applyPMREM(e){const t=this._renderer,r=t.autoClear;t.autoClear=!1;const a=this._lodMeshes.length;for(let l=1;l<a;l++)this._applyGGXFilter(e,l-1,l);t.autoClear=r}_applyGGXFilter(e,t,r){const a=this._renderer,l=this._pingPongRenderTarget,c=this._ggxMaterial,d=this._lodMeshes[r];d.material=c;const h=c.uniforms,f=r/(this._lodMeshes.length-1),m=t/(this._lodMeshes.length-1),g=Math.sqrt(f*f-m*m),x=0+f*1.25,M=g*x,{_lodMax:E}=this,w=this._sizeLods[r],_=3*w*(r>E-Is?r-E+Is:0),y=4*(this._cubeSize-w);h.envMap.value=e.texture,h.roughness.value=M,h.mipInt.value=E-t,ho(l,_,y,3*w,2*w),a.setRenderTarget(l),a.render(d,Ll),h.envMap.value=l.texture,h.roughness.value=0,h.mipInt.value=E-r,ho(e,_,y,3*w,2*w),a.setRenderTarget(e),a.render(d,Ll)}_blur(e,t,r,a,l){const c=this._pingPongRenderTarget;this._halfBlur(e,c,t,r,a,"latitudinal",l),this._halfBlur(c,e,r,r,a,"longitudinal",l)}_halfBlur(e,t,r,a,l,c,d){const h=this._renderer,f=this._blurMaterial;c!=="latitudinal"&&c!=="longitudinal"&&Lt("blur direction must be either latitudinal or longitudinal!");const m=3,g=this._lodMeshes[a];g.material=f;const x=f.uniforms,M=this._sizeLods[r]-1,E=isFinite(l)?Math.PI/(2*M):2*Math.PI/(2*ca-1),w=l/E,_=isFinite(l)?1+Math.floor(m*w):ca;_>ca&&ct(`sigmaRadians, ${l}, is too large and will clip, as it requested ${_} samples when the maximum is set to ${ca}`);const y=[];let L=0;for(let O=0;O<ca;++O){const b=O/w,U=Math.exp(-b*b/2);y.push(U),O===0?L+=U:O<_&&(L+=2*U)}for(let O=0;O<y.length;O++)y[O]=y[O]/L;x.envMap.value=e.texture,x.samples.value=_,x.weights.value=y,x.latitudinal.value=c==="latitudinal",d&&(x.poleAxis.value=d);const{_lodMax:P}=this;x.dTheta.value=E,x.mipInt.value=P-r;const C=this._sizeLods[a],F=3*C*(a>P-Is?a-P+Is:0),N=4*(this._cubeSize-C);ho(t,F,N,3*C,2*C),h.setRenderTarget(t),h.render(g,Ll)}}function jR(i){const e=[],t=[],r=[];let a=i;const l=i-Is+1+Rv.length;for(let c=0;c<l;c++){const d=Math.pow(2,a);e.push(d);let h=1/d;c>i-Is?h=Rv[c-i+Is-1]:c===0&&(h=0),t.push(h);const f=1/(d-2),m=-f,g=1+f,x=[m,m,g,m,g,g,m,m,g,g,m,g],M=6,E=6,w=3,_=2,y=1,L=new Float32Array(w*E*M),P=new Float32Array(_*E*M),C=new Float32Array(y*E*M);for(let N=0;N<M;N++){const O=N%3*2/3-1,b=N>2?0:-1,U=[O,b,0,O+2/3,b,0,O+2/3,b+1,0,O,b,0,O+2/3,b+1,0,O,b+1,0];L.set(U,w*E*N),P.set(x,_*E*N);const G=[N,N,N,N,N,N];C.set(G,y*E*N)}const F=new Mi;F.setAttribute("position",new xr(L,w)),F.setAttribute("uv",new xr(P,_)),F.setAttribute("faceIndex",new xr(C,y)),r.push(new Zi(F,null)),a>Is&&a--}return{lodMeshes:r,sizeLods:e,sigmas:t}}function Nv(i,e,t){const r=new gr(i,e,t);return r.texture.mapping=gd,r.texture.name="PMREM.cubeUv",r.scissorTest=!0,r}function ho(i,e,t,r,a){i.viewport.set(e,t,r,a),i.scissor.set(e,t,r,a)}function WR(i,e,t){return new yr({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:VR,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:_d(),fragmentShader:`

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
		`,blending:Gr,depthTest:!1,depthWrite:!1})}function XR(i,e,t){const r=new Float32Array(ca),a=new ee(0,1,0);return new yr({name:"SphericalGaussianBlur",defines:{n:ca,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:r},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:a}},vertexShader:_d(),fragmentShader:`

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
		`,blending:Gr,depthTest:!1,depthWrite:!1})}function Lv(){return new yr({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:_d(),fragmentShader:`

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
		`,blending:Gr,depthTest:!1,depthWrite:!1})}function Dv(){return new yr({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:_d(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Gr,depthTest:!1,depthWrite:!1})}function _d(){return`

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
	`}class Ty extends gr{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const r={width:e,height:e,depth:1},a=[r,r,r,r,r,r];this.texture=new yy(a),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const r={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},a=new ic(5,5,5),l=new yr({name:"CubemapFromEquirect",uniforms:Fo(r.uniforms),vertexShader:r.vertexShader,fragmentShader:r.fragmentShader,side:hi,blending:Gr});l.uniforms.tEquirect.value=t;const c=new Zi(a,l),d=t.minFilter;return t.minFilter===da&&(t.minFilter=Wn),new Qb(1,10,this).update(e,c),t.minFilter=d,c.geometry.dispose(),c.material.dispose(),this}clear(e,t=!0,r=!0,a=!0){const l=e.getRenderTarget();for(let c=0;c<6;c++)e.setRenderTarget(this,c),e.clear(t,r,a);e.setRenderTarget(l)}}function $R(i){let e=new WeakMap,t=new WeakMap,r=null;function a(x,M=!1){return x==null?null:M?c(x):l(x)}function l(x){if(x&&x.isTexture){const M=x.mapping;if(M===df||M===hf)if(e.has(x)){const E=e.get(x).texture;return d(E,x.mapping)}else{const E=x.image;if(E&&E.height>0){const w=new Ty(E.height);return w.fromEquirectangularTexture(i,x),e.set(x,w),x.addEventListener("dispose",f),d(w.texture,x.mapping)}else return null}}return x}function c(x){if(x&&x.isTexture){const M=x.mapping,E=M===df||M===hf,w=M===ba||M===Io;if(E||w){let _=t.get(x);const y=_!==void 0?_.texture.pmremVersion:0;if(x.isRenderTargetTexture&&x.pmremVersion!==y)return r===null&&(r=new Pv(i)),_=E?r.fromEquirectangular(x,_):r.fromCubemap(x,_),_.texture.pmremVersion=x.pmremVersion,t.set(x,_),_.texture;if(_!==void 0)return _.texture;{const L=x.image;return E&&L&&L.height>0||w&&L&&h(L)?(r===null&&(r=new Pv(i)),_=E?r.fromEquirectangular(x):r.fromCubemap(x),_.texture.pmremVersion=x.pmremVersion,t.set(x,_),x.addEventListener("dispose",m),_.texture):null}}}return x}function d(x,M){return M===df?x.mapping=ba:M===hf&&(x.mapping=Io),x}function h(x){let M=0;const E=6;for(let w=0;w<E;w++)x[w]!==void 0&&M++;return M===E}function f(x){const M=x.target;M.removeEventListener("dispose",f);const E=e.get(M);E!==void 0&&(e.delete(M),E.dispose())}function m(x){const M=x.target;M.removeEventListener("dispose",m);const E=t.get(M);E!==void 0&&(t.delete(M),E.dispose())}function g(){e=new WeakMap,t=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:a,dispose:g}}function qR(i){const e={};function t(r){if(e[r]!==void 0)return e[r];const a=i.getExtension(r);return e[r]=a,a}return{has:function(r){return t(r)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(r){const a=t(r);return a===null&&vo("WebGLRenderer: "+r+" extension not supported."),a}}}function YR(i,e,t,r){const a={},l=new WeakMap;function c(g){const x=g.target;x.index!==null&&e.remove(x.index);for(const E in x.attributes)e.remove(x.attributes[E]);x.removeEventListener("dispose",c),delete a[x.id];const M=l.get(x);M&&(e.remove(M),l.delete(x)),r.releaseStatesOfGeometry(x),x.isInstancedBufferGeometry===!0&&delete x._maxInstanceCount,t.memory.geometries--}function d(g,x){return a[x.id]===!0||(x.addEventListener("dispose",c),a[x.id]=!0,t.memory.geometries++),x}function h(g){const x=g.attributes;for(const M in x)e.update(x[M],i.ARRAY_BUFFER)}function f(g){const x=[],M=g.index,E=g.attributes.position;let w=0;if(E===void 0)return;if(M!==null){const L=M.array;w=M.version;for(let P=0,C=L.length;P<C;P+=3){const F=L[P+0],N=L[P+1],O=L[P+2];x.push(F,N,N,O,O,F)}}else{const L=E.array;w=E.version;for(let P=0,C=L.length/3-1;P<C;P+=3){const F=P+0,N=P+1,O=P+2;x.push(F,N,N,O,O,F)}}const _=new(E.count>=65535?vy:xy)(x,1);_.version=w;const y=l.get(g);y&&e.remove(y),l.set(g,_)}function m(g){const x=l.get(g);if(x){const M=g.index;M!==null&&x.version<M.version&&f(g)}else f(g);return l.get(g)}return{get:d,update:h,getWireframeAttribute:m}}function KR(i,e,t){let r;function a(g){r=g}let l,c;function d(g){l=g.type,c=g.bytesPerElement}function h(g,x){i.drawElements(r,x,l,g*c),t.update(x,r,1)}function f(g,x,M){M!==0&&(i.drawElementsInstanced(r,x,l,g*c,M),t.update(x,r,M))}function m(g,x,M){if(M===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(r,x,0,l,g,0,M);let w=0;for(let _=0;_<M;_++)w+=x[_];t.update(w,r,1)}this.setMode=a,this.setIndex=d,this.render=h,this.renderInstances=f,this.renderMultiDraw=m}function QR(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function r(l,c,d){switch(t.calls++,c){case i.TRIANGLES:t.triangles+=d*(l/3);break;case i.LINES:t.lines+=d*(l/2);break;case i.LINE_STRIP:t.lines+=d*(l-1);break;case i.LINE_LOOP:t.lines+=d*l;break;case i.POINTS:t.points+=d*l;break;default:Lt("WebGLInfo: Unknown draw mode:",c);break}}function a(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:a,update:r}}function ZR(i,e,t){const r=new WeakMap,a=new cn;function l(c,d,h){const f=c.morphTargetInfluences,m=d.morphAttributes.position||d.morphAttributes.normal||d.morphAttributes.color,g=m!==void 0?m.length:0;let x=r.get(d);if(x===void 0||x.count!==g){let G=function(){b.dispose(),r.delete(d),d.removeEventListener("dispose",G)};var M=G;x!==void 0&&x.texture.dispose();const E=d.morphAttributes.position!==void 0,w=d.morphAttributes.normal!==void 0,_=d.morphAttributes.color!==void 0,y=d.morphAttributes.position||[],L=d.morphAttributes.normal||[],P=d.morphAttributes.color||[];let C=0;E===!0&&(C=1),w===!0&&(C=2),_===!0&&(C=3);let F=d.attributes.position.count*C,N=1;F>e.maxTextureSize&&(N=Math.ceil(F/e.maxTextureSize),F=e.maxTextureSize);const O=new Float32Array(F*N*4*g),b=new py(O,F,N,g);b.type=fr,b.needsUpdate=!0;const U=C*4;for(let D=0;D<g;D++){const K=y[D],ne=L[D],me=P[D],k=F*N*4*D;for(let he=0;he<K.count;he++){const J=he*U;E===!0&&(a.fromBufferAttribute(K,he),O[k+J+0]=a.x,O[k+J+1]=a.y,O[k+J+2]=a.z,O[k+J+3]=0),w===!0&&(a.fromBufferAttribute(ne,he),O[k+J+4]=a.x,O[k+J+5]=a.y,O[k+J+6]=a.z,O[k+J+7]=0),_===!0&&(a.fromBufferAttribute(me,he),O[k+J+8]=a.x,O[k+J+9]=a.y,O[k+J+10]=a.z,O[k+J+11]=me.itemSize===4?a.w:1)}}x={count:g,texture:b,size:new ht(F,N)},r.set(d,x),d.addEventListener("dispose",G)}if(c.isInstancedMesh===!0&&c.morphTexture!==null)h.getUniforms().setValue(i,"morphTexture",c.morphTexture,t);else{let E=0;for(let _=0;_<f.length;_++)E+=f[_];const w=d.morphTargetsRelative?1:1-E;h.getUniforms().setValue(i,"morphTargetBaseInfluence",w),h.getUniforms().setValue(i,"morphTargetInfluences",f)}h.getUniforms().setValue(i,"morphTargetsTexture",x.texture,t),h.getUniforms().setValue(i,"morphTargetsTextureSize",x.size)}return{update:l}}function JR(i,e,t,r,a){let l=new WeakMap;function c(f){const m=a.render.frame,g=f.geometry,x=e.get(f,g);if(l.get(x)!==m&&(e.update(x),l.set(x,m)),f.isInstancedMesh&&(f.hasEventListener("dispose",h)===!1&&f.addEventListener("dispose",h),l.get(f)!==m&&(t.update(f.instanceMatrix,i.ARRAY_BUFFER),f.instanceColor!==null&&t.update(f.instanceColor,i.ARRAY_BUFFER),l.set(f,m))),f.isSkinnedMesh){const M=f.skeleton;l.get(M)!==m&&(M.update(),l.set(M,m))}return x}function d(){l=new WeakMap}function h(f){const m=f.target;m.removeEventListener("dispose",h),r.releaseStatesOfObject(m),t.remove(m.instanceMatrix),m.instanceColor!==null&&t.remove(m.instanceColor)}return{update:c,dispose:d}}const eA={[J_]:"LINEAR_TONE_MAPPING",[ey]:"REINHARD_TONE_MAPPING",[ty]:"CINEON_TONE_MAPPING",[Rm]:"ACES_FILMIC_TONE_MAPPING",[iy]:"AGX_TONE_MAPPING",[ry]:"NEUTRAL_TONE_MAPPING",[ny]:"CUSTOM_TONE_MAPPING"};function tA(i,e,t,r,a,l){const c=new gr(e,t,{type:i,depthBuffer:a,stencilBuffer:l,samples:r?4:0,depthTexture:a?new Uo(e,t):void 0}),d=new gr(e,t,{type:$r,depthBuffer:!1,stencilBuffer:!1}),h=new Mi;h.setAttribute("position",new Un([-1,3,0,-1,-1,0,3,-1,0],3)),h.setAttribute("uv",new Un([0,2,0,0,2,0],2));const f=new Ob({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),m=new Zi(h,f),g=new Bm(-1,1,1,-1,0,1);let x=null,M=null,E=!1,w,_=null,y=[],L=!1;this.setSize=function(P,C){c.setSize(P,C),d.setSize(P,C);for(let F=0;F<y.length;F++){const N=y[F];N.setSize&&N.setSize(P,C)}},this.setEffects=function(P){y=P,L=y.length>0&&y[0].isRenderPass===!0;const C=c.width,F=c.height;for(let N=0;N<y.length;N++){const O=y[N];O.setSize&&O.setSize(C,F)}},this.begin=function(P,C){if(E||P.toneMapping===mr&&y.length===0)return!1;if(_=C,C!==null){const F=C.width,N=C.height;(c.width!==F||c.height!==N)&&this.setSize(F,N)}return L===!1&&P.setRenderTarget(c),w=P.toneMapping,P.toneMapping=mr,!0},this.hasRenderPass=function(){return L},this.end=function(P,C){P.toneMapping=w,E=!0;let F=c,N=d;for(let O=0;O<y.length;O++){const b=y[O];if(b.enabled!==!1&&(b.render(P,N,F,C),b.needsSwap!==!1)){const U=F;F=N,N=U}}if(x!==P.outputColorSpace||M!==P.toneMapping){x=P.outputColorSpace,M=P.toneMapping,f.defines={},Rt.getTransfer(x)===Vt&&(f.defines.SRGB_TRANSFER="");const O=eA[M];O&&(f.defines[O]=""),f.needsUpdate=!0}f.uniforms.tDiffuse.value=F.texture,P.setRenderTarget(_),P.render(m,g),_=null,E=!1},this.isCompositing=function(){return E},this.dispose=function(){c.depthTexture&&c.depthTexture.dispose(),c.dispose(),d.dispose(),h.dispose(),f.dispose()}}const Cy=new Xn,nm=new Uo(1,1),Ry=new py,Ay=new fb,Py=new yy,Iv=[],Uv=[],Fv=new Float32Array(16),Ov=new Float32Array(9),kv=new Float32Array(4);function Vo(i,e,t){const r=i[0];if(r<=0||r>0)return i;const a=e*t;let l=Iv[a];if(l===void 0&&(l=new Float32Array(a),Iv[a]=l),e!==0){r.toArray(l,0);for(let c=1,d=0;c!==e;++c)d+=t,i[c].toArray(l,d)}return l}function wn(i,e){if(i.length!==e.length)return!1;for(let t=0,r=i.length;t<r;t++)if(i[t]!==e[t])return!1;return!0}function bn(i,e){for(let t=0,r=e.length;t<r;t++)i[t]=e[t]}function yd(i,e){let t=Uv[e];t===void 0&&(t=new Int32Array(e),Uv[e]=t);for(let r=0;r!==e;++r)t[r]=i.allocateTextureUnit();return t}function nA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function iA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wn(t,e))return;i.uniform2fv(this.addr,e),bn(t,e)}}function rA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(wn(t,e))return;i.uniform3fv(this.addr,e),bn(t,e)}}function sA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wn(t,e))return;i.uniform4fv(this.addr,e),bn(t,e)}}function aA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(wn(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),bn(t,e)}else{if(wn(t,r))return;kv.set(r),i.uniformMatrix2fv(this.addr,!1,kv),bn(t,r)}}function oA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(wn(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),bn(t,e)}else{if(wn(t,r))return;Ov.set(r),i.uniformMatrix3fv(this.addr,!1,Ov),bn(t,r)}}function lA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(wn(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),bn(t,e)}else{if(wn(t,r))return;Fv.set(r),i.uniformMatrix4fv(this.addr,!1,Fv),bn(t,r)}}function cA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function uA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wn(t,e))return;i.uniform2iv(this.addr,e),bn(t,e)}}function dA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(wn(t,e))return;i.uniform3iv(this.addr,e),bn(t,e)}}function hA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wn(t,e))return;i.uniform4iv(this.addr,e),bn(t,e)}}function fA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function pA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wn(t,e))return;i.uniform2uiv(this.addr,e),bn(t,e)}}function mA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(wn(t,e))return;i.uniform3uiv(this.addr,e),bn(t,e)}}function gA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wn(t,e))return;i.uniform4uiv(this.addr,e),bn(t,e)}}function xA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a);let l;this.type===i.SAMPLER_2D_SHADOW?(nm.compareFunction=t.isReversedDepthBuffer()?Fm:Um,l=nm):l=Cy,t.setTexture2D(e||l,a)}function vA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTexture3D(e||Ay,a)}function _A(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTextureCube(e||Py,a)}function yA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTexture2DArray(e||Ry,a)}function SA(i){switch(i){case 5126:return nA;case 35664:return iA;case 35665:return rA;case 35666:return sA;case 35674:return aA;case 35675:return oA;case 35676:return lA;case 5124:case 35670:return cA;case 35667:case 35671:return uA;case 35668:case 35672:return dA;case 35669:case 35673:return hA;case 5125:return fA;case 36294:return pA;case 36295:return mA;case 36296:return gA;case 35678:case 36198:case 36298:case 36306:case 35682:return xA;case 35679:case 36299:case 36307:return vA;case 35680:case 36300:case 36308:case 36293:return _A;case 36289:case 36303:case 36311:case 36292:return yA}}function MA(i,e){i.uniform1fv(this.addr,e)}function EA(i,e){const t=Vo(e,this.size,2);i.uniform2fv(this.addr,t)}function wA(i,e){const t=Vo(e,this.size,3);i.uniform3fv(this.addr,t)}function bA(i,e){const t=Vo(e,this.size,4);i.uniform4fv(this.addr,t)}function TA(i,e){const t=Vo(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function CA(i,e){const t=Vo(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function RA(i,e){const t=Vo(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function AA(i,e){i.uniform1iv(this.addr,e)}function PA(i,e){i.uniform2iv(this.addr,e)}function NA(i,e){i.uniform3iv(this.addr,e)}function LA(i,e){i.uniform4iv(this.addr,e)}function DA(i,e){i.uniform1uiv(this.addr,e)}function IA(i,e){i.uniform2uiv(this.addr,e)}function UA(i,e){i.uniform3uiv(this.addr,e)}function FA(i,e){i.uniform4uiv(this.addr,e)}function OA(i,e,t){const r=this.cache,a=e.length,l=yd(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),bn(r,l));let c;this.type===i.SAMPLER_2D_SHADOW?c=nm:c=Cy;for(let d=0;d!==a;++d)t.setTexture2D(e[d]||c,l[d])}function kA(i,e,t){const r=this.cache,a=e.length,l=yd(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),bn(r,l));for(let c=0;c!==a;++c)t.setTexture3D(e[c]||Ay,l[c])}function zA(i,e,t){const r=this.cache,a=e.length,l=yd(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),bn(r,l));for(let c=0;c!==a;++c)t.setTextureCube(e[c]||Py,l[c])}function BA(i,e,t){const r=this.cache,a=e.length,l=yd(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),bn(r,l));for(let c=0;c!==a;++c)t.setTexture2DArray(e[c]||Ry,l[c])}function HA(i){switch(i){case 5126:return MA;case 35664:return EA;case 35665:return wA;case 35666:return bA;case 35674:return TA;case 35675:return CA;case 35676:return RA;case 5124:case 35670:return AA;case 35667:case 35671:return PA;case 35668:case 35672:return NA;case 35669:case 35673:return LA;case 5125:return DA;case 36294:return IA;case 36295:return UA;case 36296:return FA;case 35678:case 36198:case 36298:case 36306:case 35682:return OA;case 35679:case 36299:case 36307:return kA;case 35680:case 36300:case 36308:case 36293:return zA;case 36289:case 36303:case 36311:case 36292:return BA}}class VA{constructor(e,t,r){this.id=e,this.addr=r,this.cache=[],this.type=t.type,this.setValue=SA(t.type)}}class GA{constructor(e,t,r){this.id=e,this.addr=r,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=HA(t.type)}}class jA{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,r){const a=this.seq;for(let l=0,c=a.length;l!==c;++l){const d=a[l];d.setValue(e,t[d.id],r)}}}const Xf=/(\w+)(\])?(\[|\.)?/g;function zv(i,e){i.seq.push(e),i.map[e.id]=e}function WA(i,e,t){const r=i.name,a=r.length;for(Xf.lastIndex=0;;){const l=Xf.exec(r),c=Xf.lastIndex;let d=l[1];const h=l[2]==="]",f=l[3];if(h&&(d=d|0),f===void 0||f==="["&&c+2===a){zv(t,f===void 0?new VA(d,i,e):new GA(d,i,e));break}else{let g=t.map[d];g===void 0&&(g=new jA(d),zv(t,g)),t=g}}}class Zu{constructor(e,t){this.seq=[],this.map={};const r=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let c=0;c<r;++c){const d=e.getActiveUniform(t,c),h=e.getUniformLocation(t,d.name);WA(d,h,this)}const a=[],l=[];for(const c of this.seq)c.type===e.SAMPLER_2D_SHADOW||c.type===e.SAMPLER_CUBE_SHADOW||c.type===e.SAMPLER_2D_ARRAY_SHADOW?a.push(c):l.push(c);a.length>0&&(this.seq=a.concat(l))}setValue(e,t,r,a){const l=this.map[t];l!==void 0&&l.setValue(e,r,a)}setOptional(e,t,r){const a=t[r];a!==void 0&&this.setValue(e,r,a)}static upload(e,t,r,a){for(let l=0,c=t.length;l!==c;++l){const d=t[l],h=r[d.id];h.needsUpdate!==!1&&d.setValue(e,h.value,a)}}static seqWithValue(e,t){const r=[];for(let a=0,l=e.length;a!==l;++a){const c=e[a];c.id in t&&r.push(c)}return r}}function Bv(i,e,t){const r=i.createShader(e);return i.shaderSource(r,t),i.compileShader(r),r}const XA=37297;let $A=0;function qA(i,e){const t=i.split(`
`),r=[],a=Math.max(e-6,0),l=Math.min(e+6,t.length);for(let c=a;c<l;c++){const d=c+1;r.push(`${d===e?">":" "} ${d}: ${t[c]}`)}return r.join(`
`)}const Hv=new mt;function YA(i){Rt._getMatrix(Hv,Rt.workingColorSpace,i);const e=`mat3( ${Hv.elements.map(t=>t.toFixed(4))} )`;switch(Rt.getTransfer(i)){case od:return[e,"LinearTransferOETF"];case Vt:return[e,"sRGBTransferOETF"];default:return ct("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function Vv(i,e,t){const r=i.getShaderParameter(e,i.COMPILE_STATUS),l=(i.getShaderInfoLog(e)||"").trim();if(r&&l==="")return"";const c=/ERROR: 0:(\d+)/.exec(l);if(c){const d=parseInt(c[1]);return t.toUpperCase()+`

`+l+`

`+qA(i.getShaderSource(e),d)}else return l}function KA(i,e){const t=YA(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const QA={[J_]:"Linear",[ey]:"Reinhard",[ty]:"Cineon",[Rm]:"ACESFilmic",[iy]:"AgX",[ry]:"Neutral",[ny]:"Custom"};function ZA(i,e){const t=QA[e];return t===void 0?(ct("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const ku=new ee;function JA(){Rt.getLuminanceCoefficients(ku);const i=ku.x.toFixed(4),e=ku.y.toFixed(4),t=ku.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function eP(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(kl).join(`
`)}function tP(i){const e=[];for(const t in i){const r=i[t];r!==!1&&e.push("#define "+t+" "+r)}return e.join(`
`)}function nP(i,e){const t={},r=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let a=0;a<r;a++){const l=i.getActiveAttrib(e,a),c=l.name;let d=1;l.type===i.FLOAT_MAT2&&(d=2),l.type===i.FLOAT_MAT3&&(d=3),l.type===i.FLOAT_MAT4&&(d=4),t[c]={type:l.type,location:i.getAttribLocation(e,c),locationSize:d}}return t}function kl(i){return i!==""}function Gv(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function jv(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const iP=/^[ \t]*#include +<([\w\d./]+)>/gm;function im(i){return i.replace(iP,sP)}const rP=new Map;function sP(i,e){let t=_t[e];if(t===void 0){const r=rP.get(e);if(r!==void 0)t=_t[r],ct('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,r);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return im(t)}const aP=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Wv(i){return i.replace(aP,oP)}function oP(i,e,t,r){let a="";for(let l=parseInt(e);l<parseInt(t);l++)a+=r.replace(/\[\s*i\s*\]/g,"[ "+l+" ]").replace(/UNROLLED_LOOP_INDEX/g,l);return a}function Xv(i){let e=`precision ${i.precision} float;
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
#define LOW_PRECISION`),e}const lP={[Wu]:"SHADOWMAP_TYPE_PCF",[Ul]:"SHADOWMAP_TYPE_VSM"};function cP(i){return lP[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const uP={[ba]:"ENVMAP_TYPE_CUBE",[Io]:"ENVMAP_TYPE_CUBE",[gd]:"ENVMAP_TYPE_CUBE_UV"};function dP(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":uP[i.envMapMode]||"ENVMAP_TYPE_CUBE"}const hP={[Io]:"ENVMAP_MODE_REFRACTION"};function fP(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":hP[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}const pP={[Cm]:"ENVMAP_BLENDING_MULTIPLY",[Ww]:"ENVMAP_BLENDING_MIX",[Xw]:"ENVMAP_BLENDING_ADD"};function mP(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":pP[i.combine]||"ENVMAP_BLENDING_NONE"}function gP(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,r=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:r,maxMip:t}}function xP(i,e,t,r){const a=i.getContext(),l=t.defines;let c=t.vertexShader,d=t.fragmentShader;const h=cP(t),f=dP(t),m=fP(t),g=mP(t),x=gP(t),M=eP(t),E=tP(l),w=a.createProgram();let _,y,L=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(_=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E].filter(kl).join(`
`),_.length>0&&(_+=`
`),y=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E].filter(kl).join(`
`),y.length>0&&(y+=`
`)):(_=[Xv(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+m:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+h:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(kl).join(`
`),y=[Xv(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+f:"",t.envMap?"#define "+m:"",t.envMap?"#define "+g:"",x?"#define CUBEUV_TEXEL_WIDTH "+x.texelWidth:"",x?"#define CUBEUV_TEXEL_HEIGHT "+x.texelHeight:"",x?"#define CUBEUV_MAX_MIP "+x.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+h:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==mr?"#define TONE_MAPPING":"",t.toneMapping!==mr?_t.tonemapping_pars_fragment:"",t.toneMapping!==mr?ZA("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",_t.colorspace_pars_fragment,KA("linearToOutputTexel",t.outputColorSpace),JA(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(kl).join(`
`)),c=im(c),c=Gv(c,t),c=jv(c,t),d=im(d),d=Gv(d,t),d=jv(d,t),c=Wv(c),d=Wv(d),t.isRawShaderMaterial!==!0&&(L=`#version 300 es
`,_=[M,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+_,y=["#define varying in",t.glslVersion===Yx?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Yx?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+y);const P=L+_+c,C=L+y+d,F=Bv(a,a.VERTEX_SHADER,P),N=Bv(a,a.FRAGMENT_SHADER,C);a.attachShader(w,F),a.attachShader(w,N),t.index0AttributeName!==void 0?a.bindAttribLocation(w,0,t.index0AttributeName):t.hasPositionAttribute===!0&&a.bindAttribLocation(w,0,"position"),a.linkProgram(w);function O(D){if(i.debug.checkShaderErrors){const K=a.getProgramInfoLog(w)||"",ne=a.getShaderInfoLog(F)||"",me=a.getShaderInfoLog(N)||"",k=K.trim(),he=ne.trim(),J=me.trim();let $=!0,ce=!0;if(a.getProgramParameter(w,a.LINK_STATUS)===!1)if($=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(a,w,F,N);else{const ue=Vv(a,F,"vertex"),z=Vv(a,N,"fragment");Lt("WebGLProgram: Shader Error "+a.getError()+" - VALIDATE_STATUS "+a.getProgramParameter(w,a.VALIDATE_STATUS)+`

Material Name: `+D.name+`
Material Type: `+D.type+`

Program Info Log: `+k+`
`+ue+`
`+z)}else k!==""?ct("WebGLProgram: Program Info Log:",k):(he===""||J==="")&&(ce=!1);ce&&(D.diagnostics={runnable:$,programLog:k,vertexShader:{log:he,prefix:_},fragmentShader:{log:J,prefix:y}})}a.deleteShader(F),a.deleteShader(N),b=new Zu(a,w),U=nP(a,w)}let b;this.getUniforms=function(){return b===void 0&&O(this),b};let U;this.getAttributes=function(){return U===void 0&&O(this),U};let G=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return G===!1&&(G=a.getProgramParameter(w,XA)),G},this.destroy=function(){r.releaseStatesOfProgram(this),a.deleteProgram(w),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=$A++,this.cacheKey=e,this.usedTimes=1,this.program=w,this.vertexShader=F,this.fragmentShader=N,this}let vP=0;class _P{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,r){const a=this._getShaderCacheForMaterial(e);return a.has(t)===!1&&(a.add(t),t.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const r of t)r.usedTimes--,r.usedTimes===0&&this.shaderCache.delete(r.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let r=t.get(e);return r===void 0&&(r=new Set,t.set(e,r)),r}_getShaderStage(e){const t=this.shaderCache;let r=t.get(e);return r===void 0&&(r=new yP(e),t.set(e,r)),r}}class yP{constructor(e){this.id=vP++,this.code=e,this.usedTimes=0}}function SP(i){return i===Ta||i===id||i===rd}function MP(i,e,t,r,a,l){const c=new my,d=new _P,h=new Set,f=[],m=new Map,g=r.logarithmicDepthBuffer;let x=r.precision;const M={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function E(b){return h.add(b),b===0?"uv":`uv${b}`}function w(b,U,G,D,K,ne){const me=D.fog,k=K.geometry,he=b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial?D.environment:null,J=b.isMeshStandardMaterial||b.isMeshLambertMaterial&&!b.envMap||b.isMeshPhongMaterial&&!b.envMap,$=e.get(b.envMap||he,J),ce=$&&$.mapping===gd?$.image.height:null,ue=M[b.type];b.precision!==null&&(x=r.getMaxPrecision(b.precision),x!==b.precision&&ct("WebGLProgram.getParameters:",b.precision,"not supported, using",x,"instead."));const z=k.morphAttributes.position||k.morphAttributes.normal||k.morphAttributes.color,X=z!==void 0?z.length:0;let Ue=0;k.morphAttributes.position!==void 0&&(Ue=1),k.morphAttributes.normal!==void 0&&(Ue=2),k.morphAttributes.color!==void 0&&(Ue=3);let He,Ve,oe,Se;if(ue){const qe=dr[ue];He=qe.vertexShader,Ve=qe.fragmentShader}else{He=b.vertexShader,Ve=b.fragmentShader;const qe=d.getVertexShaderStage(b),Wt=d.getFragmentShaderStage(b);d.update(b,qe,Wt),oe=qe.id,Se=Wt.id}const ve=i.getRenderTarget(),Oe=i.state.buffers.depth.getReversed(),Je=K.isInstancedMesh===!0,nt=K.isBatchedMesh===!0,Ut=!!b.map,dt=!!b.matcap,Tt=!!$,St=!!b.aoMap,vt=!!b.lightMap,Gt=!!b.bumpMap&&b.wireframe===!1,$t=!!b.normalMap,qt=!!b.displacementMap,jt=!!b.emissiveMap,wt=!!b.metalnessMap,Ft=!!b.roughnessMap,q=b.anisotropy>0,un=b.clearcoat>0,de=b.dispersion>0,I=b.iridescence>0,T=b.sheen>0,Z=b.transmission>0,re=q&&!!b.anisotropyMap,ge=un&&!!b.clearcoatMap,be=un&&!!b.clearcoatNormalMap,Ne=un&&!!b.clearcoatRoughnessMap,xe=I&&!!b.iridescenceMap,_e=I&&!!b.iridescenceThicknessMap,Ie=T&&!!b.sheenColorMap,Xe=T&&!!b.sheenRoughnessMap,te=!!b.specularMap,Me=!!b.specularColorMap,ke=!!b.specularIntensityMap,it=Z&&!!b.transmissionMap,at=Z&&!!b.thicknessMap,W=!!b.gradientMap,Pe=!!b.alphaMap,ye=b.alphaTest>0,De=!!b.alphaHash,Fe=!!b.extensions;let Ee=mr;b.toneMapped&&(ve===null||ve.isXRRenderTarget===!0)&&(Ee=i.toneMapping);const Ke={shaderID:ue,shaderType:b.type,shaderName:b.name,vertexShader:He,fragmentShader:Ve,defines:b.defines,customVertexShaderID:oe,customFragmentShaderID:Se,isRawShaderMaterial:b.isRawShaderMaterial===!0,glslVersion:b.glslVersion,precision:x,batching:nt,batchingColor:nt&&K._colorsTexture!==null,instancing:Je,instancingColor:Je&&K.instanceColor!==null,instancingMorph:Je&&K.morphTexture!==null,outputColorSpace:ve===null?i.outputColorSpace:ve.isXRRenderTarget===!0?ve.texture.colorSpace:Rt.workingColorSpace,alphaToCoverage:!!b.alphaToCoverage,map:Ut,matcap:dt,envMap:Tt,envMapMode:Tt&&$.mapping,envMapCubeUVHeight:ce,aoMap:St,lightMap:vt,bumpMap:Gt,normalMap:$t,displacementMap:qt,emissiveMap:jt,normalMapObjectSpace:$t&&b.normalMapType===Yw,normalMapTangentSpace:$t&&b.normalMapType===sd,packedNormalMap:$t&&b.normalMapType===sd&&SP(b.normalMap.format),metalnessMap:wt,roughnessMap:Ft,anisotropy:q,anisotropyMap:re,clearcoat:un,clearcoatMap:ge,clearcoatNormalMap:be,clearcoatRoughnessMap:Ne,dispersion:de,iridescence:I,iridescenceMap:xe,iridescenceThicknessMap:_e,sheen:T,sheenColorMap:Ie,sheenRoughnessMap:Xe,specularMap:te,specularColorMap:Me,specularIntensityMap:ke,transmission:Z,transmissionMap:it,thicknessMap:at,gradientMap:W,opaque:b.transparent===!1&&b.blending===xo&&b.alphaToCoverage===!1,alphaMap:Pe,alphaTest:ye,alphaHash:De,combine:b.combine,mapUv:Ut&&E(b.map.channel),aoMapUv:St&&E(b.aoMap.channel),lightMapUv:vt&&E(b.lightMap.channel),bumpMapUv:Gt&&E(b.bumpMap.channel),normalMapUv:$t&&E(b.normalMap.channel),displacementMapUv:qt&&E(b.displacementMap.channel),emissiveMapUv:jt&&E(b.emissiveMap.channel),metalnessMapUv:wt&&E(b.metalnessMap.channel),roughnessMapUv:Ft&&E(b.roughnessMap.channel),anisotropyMapUv:re&&E(b.anisotropyMap.channel),clearcoatMapUv:ge&&E(b.clearcoatMap.channel),clearcoatNormalMapUv:be&&E(b.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Ne&&E(b.clearcoatRoughnessMap.channel),iridescenceMapUv:xe&&E(b.iridescenceMap.channel),iridescenceThicknessMapUv:_e&&E(b.iridescenceThicknessMap.channel),sheenColorMapUv:Ie&&E(b.sheenColorMap.channel),sheenRoughnessMapUv:Xe&&E(b.sheenRoughnessMap.channel),specularMapUv:te&&E(b.specularMap.channel),specularColorMapUv:Me&&E(b.specularColorMap.channel),specularIntensityMapUv:ke&&E(b.specularIntensityMap.channel),transmissionMapUv:it&&E(b.transmissionMap.channel),thicknessMapUv:at&&E(b.thicknessMap.channel),alphaMapUv:Pe&&E(b.alphaMap.channel),vertexTangents:!!k.attributes.tangent&&($t||q),vertexNormals:!!k.attributes.normal,vertexColors:b.vertexColors,vertexAlphas:b.vertexColors===!0&&!!k.attributes.color&&k.attributes.color.itemSize===4,pointsUvs:K.isPoints===!0&&!!k.attributes.uv&&(Ut||Pe),fog:!!me,useFog:b.fog===!0,fogExp2:!!me&&me.isFogExp2,flatShading:b.wireframe===!1&&(b.flatShading===!0||k.attributes.normal===void 0&&$t===!1&&(b.isMeshLambertMaterial||b.isMeshPhongMaterial||b.isMeshStandardMaterial||b.isMeshPhysicalMaterial)),sizeAttenuation:b.sizeAttenuation===!0,logarithmicDepthBuffer:g,reversedDepthBuffer:Oe,skinning:K.isSkinnedMesh===!0,hasPositionAttribute:k.attributes.position!==void 0,morphTargets:k.morphAttributes.position!==void 0,morphNormals:k.morphAttributes.normal!==void 0,morphColors:k.morphAttributes.color!==void 0,morphTargetsCount:X,morphTextureStride:Ue,numDirLights:U.directional.length,numPointLights:U.point.length,numSpotLights:U.spot.length,numSpotLightMaps:U.spotLightMap.length,numRectAreaLights:U.rectArea.length,numHemiLights:U.hemi.length,numDirLightShadows:U.directionalShadowMap.length,numPointLightShadows:U.pointShadowMap.length,numSpotLightShadows:U.spotShadowMap.length,numSpotLightShadowsWithMaps:U.numSpotLightShadowsWithMaps,numLightProbes:U.numLightProbes,numLightProbeGrids:ne.length,numClippingPlanes:l.numPlanes,numClipIntersection:l.numIntersection,dithering:b.dithering,shadowMapEnabled:i.shadowMap.enabled&&G.length>0,shadowMapType:i.shadowMap.type,toneMapping:Ee,decodeVideoTexture:Ut&&b.map.isVideoTexture===!0&&Rt.getTransfer(b.map.colorSpace)===Vt,decodeVideoTextureEmissive:jt&&b.emissiveMap.isVideoTexture===!0&&Rt.getTransfer(b.emissiveMap.colorSpace)===Vt,premultipliedAlpha:b.premultipliedAlpha,doubleSided:b.side===hr,flipSided:b.side===hi,useDepthPacking:b.depthPacking>=0,depthPacking:b.depthPacking||0,index0AttributeName:b.index0AttributeName,extensionClipCullDistance:Fe&&b.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Fe&&b.extensions.multiDraw===!0||nt)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:b.customProgramCacheKey()};return Ke.vertexUv1s=h.has(1),Ke.vertexUv2s=h.has(2),Ke.vertexUv3s=h.has(3),h.clear(),Ke}function _(b){const U=[];if(b.shaderID?U.push(b.shaderID):(U.push(b.customVertexShaderID),U.push(b.customFragmentShaderID)),b.defines!==void 0)for(const G in b.defines)U.push(G),U.push(b.defines[G]);return b.isRawShaderMaterial===!1&&(y(U,b),L(U,b),U.push(i.outputColorSpace)),U.push(b.customProgramCacheKey),U.join()}function y(b,U){b.push(U.precision),b.push(U.outputColorSpace),b.push(U.envMapMode),b.push(U.envMapCubeUVHeight),b.push(U.mapUv),b.push(U.alphaMapUv),b.push(U.lightMapUv),b.push(U.aoMapUv),b.push(U.bumpMapUv),b.push(U.normalMapUv),b.push(U.displacementMapUv),b.push(U.emissiveMapUv),b.push(U.metalnessMapUv),b.push(U.roughnessMapUv),b.push(U.anisotropyMapUv),b.push(U.clearcoatMapUv),b.push(U.clearcoatNormalMapUv),b.push(U.clearcoatRoughnessMapUv),b.push(U.iridescenceMapUv),b.push(U.iridescenceThicknessMapUv),b.push(U.sheenColorMapUv),b.push(U.sheenRoughnessMapUv),b.push(U.specularMapUv),b.push(U.specularColorMapUv),b.push(U.specularIntensityMapUv),b.push(U.transmissionMapUv),b.push(U.thicknessMapUv),b.push(U.combine),b.push(U.fogExp2),b.push(U.sizeAttenuation),b.push(U.morphTargetsCount),b.push(U.morphAttributeCount),b.push(U.numDirLights),b.push(U.numPointLights),b.push(U.numSpotLights),b.push(U.numSpotLightMaps),b.push(U.numHemiLights),b.push(U.numRectAreaLights),b.push(U.numDirLightShadows),b.push(U.numPointLightShadows),b.push(U.numSpotLightShadows),b.push(U.numSpotLightShadowsWithMaps),b.push(U.numLightProbes),b.push(U.shadowMapType),b.push(U.toneMapping),b.push(U.numClippingPlanes),b.push(U.numClipIntersection),b.push(U.depthPacking)}function L(b,U){c.disableAll(),U.instancing&&c.enable(0),U.instancingColor&&c.enable(1),U.instancingMorph&&c.enable(2),U.matcap&&c.enable(3),U.envMap&&c.enable(4),U.normalMapObjectSpace&&c.enable(5),U.normalMapTangentSpace&&c.enable(6),U.clearcoat&&c.enable(7),U.iridescence&&c.enable(8),U.alphaTest&&c.enable(9),U.vertexColors&&c.enable(10),U.vertexAlphas&&c.enable(11),U.vertexUv1s&&c.enable(12),U.vertexUv2s&&c.enable(13),U.vertexUv3s&&c.enable(14),U.vertexTangents&&c.enable(15),U.anisotropy&&c.enable(16),U.alphaHash&&c.enable(17),U.batching&&c.enable(18),U.dispersion&&c.enable(19),U.batchingColor&&c.enable(20),U.gradientMap&&c.enable(21),U.packedNormalMap&&c.enable(22),U.vertexNormals&&c.enable(23),b.push(c.mask),c.disableAll(),U.fog&&c.enable(0),U.useFog&&c.enable(1),U.flatShading&&c.enable(2),U.logarithmicDepthBuffer&&c.enable(3),U.reversedDepthBuffer&&c.enable(4),U.skinning&&c.enable(5),U.morphTargets&&c.enable(6),U.morphNormals&&c.enable(7),U.morphColors&&c.enable(8),U.premultipliedAlpha&&c.enable(9),U.shadowMapEnabled&&c.enable(10),U.doubleSided&&c.enable(11),U.flipSided&&c.enable(12),U.useDepthPacking&&c.enable(13),U.dithering&&c.enable(14),U.transmission&&c.enable(15),U.sheen&&c.enable(16),U.opaque&&c.enable(17),U.pointsUvs&&c.enable(18),U.decodeVideoTexture&&c.enable(19),U.decodeVideoTextureEmissive&&c.enable(20),U.alphaToCoverage&&c.enable(21),U.numLightProbeGrids>0&&c.enable(22),U.hasPositionAttribute&&c.enable(23),b.push(c.mask)}function P(b){const U=M[b.type];let G;if(U){const D=dr[U];G=Ib.clone(D.uniforms)}else G=b.uniforms;return G}function C(b,U){let G=m.get(U);return G!==void 0?++G.usedTimes:(G=new xP(i,U,b,a),f.push(G),m.set(U,G)),G}function F(b){if(--b.usedTimes===0){const U=f.indexOf(b);f[U]=f[f.length-1],f.pop(),m.delete(b.cacheKey),b.destroy()}}function N(b){d.remove(b)}function O(){d.dispose()}return{getParameters:w,getProgramCacheKey:_,getUniforms:P,acquireProgram:C,releaseProgram:F,releaseShaderCache:N,programs:f,dispose:O}}function EP(){let i=new WeakMap;function e(c){return i.has(c)}function t(c){let d=i.get(c);return d===void 0&&(d={},i.set(c,d)),d}function r(c){i.delete(c)}function a(c,d,h){i.get(c)[d]=h}function l(){i=new WeakMap}return{has:e,get:t,remove:r,update:a,dispose:l}}function wP(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function $v(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function qv(){const i=[];let e=0;const t=[],r=[],a=[];function l(){e=0,t.length=0,r.length=0,a.length=0}function c(x){let M=0;return x.isInstancedMesh&&(M+=2),x.isSkinnedMesh&&(M+=1),M}function d(x,M,E,w,_,y){let L=i[e];return L===void 0?(L={id:x.id,object:x,geometry:M,material:E,materialVariant:c(x),groupOrder:w,renderOrder:x.renderOrder,z:_,group:y},i[e]=L):(L.id=x.id,L.object=x,L.geometry=M,L.material=E,L.materialVariant=c(x),L.groupOrder=w,L.renderOrder=x.renderOrder,L.z=_,L.group=y),e++,L}function h(x,M,E,w,_,y){const L=d(x,M,E,w,_,y);E.transmission>0?r.push(L):E.transparent===!0?a.push(L):t.push(L)}function f(x,M,E,w,_,y){const L=d(x,M,E,w,_,y);E.transmission>0?r.unshift(L):E.transparent===!0?a.unshift(L):t.unshift(L)}function m(x,M,E){t.length>1&&t.sort(x||wP),r.length>1&&r.sort(M||$v),a.length>1&&a.sort(M||$v),E&&(t.reverse(),r.reverse(),a.reverse())}function g(){for(let x=e,M=i.length;x<M;x++){const E=i[x];if(E.id===null)break;E.id=null,E.object=null,E.geometry=null,E.material=null,E.group=null}}return{opaque:t,transmissive:r,transparent:a,init:l,push:h,unshift:f,finish:g,sort:m}}function bP(){let i=new WeakMap;function e(r,a){const l=i.get(r);let c;return l===void 0?(c=new qv,i.set(r,[c])):a>=l.length?(c=new qv,l.push(c)):c=l[a],c}function t(){i=new WeakMap}return{get:e,dispose:t}}function TP(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new ee,color:new xt};break;case"SpotLight":t={position:new ee,direction:new ee,color:new xt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new ee,color:new xt,distance:0,decay:0};break;case"HemisphereLight":t={direction:new ee,skyColor:new xt,groundColor:new xt};break;case"RectAreaLight":t={color:new xt,position:new ee,halfWidth:new ee,halfHeight:new ee};break}return i[e.id]=t,t}}}function CP(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ht};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ht};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ht,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let RP=0;function AP(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function PP(i){const e=new TP,t=CP(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let f=0;f<9;f++)r.probe.push(new ee);const a=new ee,l=new sn,c=new sn;function d(f){let m=0,g=0,x=0;for(let U=0;U<9;U++)r.probe[U].set(0,0,0);let M=0,E=0,w=0,_=0,y=0,L=0,P=0,C=0,F=0,N=0,O=0;f.sort(AP);for(let U=0,G=f.length;U<G;U++){const D=f[U],K=D.color,ne=D.intensity,me=D.distance;let k=null;if(D.shadow&&D.shadow.map&&(D.shadow.map.texture.format===Ta?k=D.shadow.map.texture:k=D.shadow.map.depthTexture||D.shadow.map.texture),D.isAmbientLight)m+=K.r*ne,g+=K.g*ne,x+=K.b*ne;else if(D.isLightProbe){for(let he=0;he<9;he++)r.probe[he].addScaledVector(D.sh.coefficients[he],ne);O++}else if(D.isDirectionalLight){const he=e.get(D);if(he.color.copy(D.color).multiplyScalar(D.intensity),D.castShadow){const J=D.shadow,$=t.get(D);$.shadowIntensity=J.intensity,$.shadowBias=J.bias,$.shadowNormalBias=J.normalBias,$.shadowRadius=J.radius,$.shadowMapSize=J.mapSize,r.directionalShadow[M]=$,r.directionalShadowMap[M]=k,r.directionalShadowMatrix[M]=D.shadow.matrix,L++}r.directional[M]=he,M++}else if(D.isSpotLight){const he=e.get(D);he.position.setFromMatrixPosition(D.matrixWorld),he.color.copy(K).multiplyScalar(ne),he.distance=me,he.coneCos=Math.cos(D.angle),he.penumbraCos=Math.cos(D.angle*(1-D.penumbra)),he.decay=D.decay,r.spot[w]=he;const J=D.shadow;if(D.map&&(r.spotLightMap[F]=D.map,F++,J.updateMatrices(D),D.castShadow&&N++),r.spotLightMatrix[w]=J.matrix,D.castShadow){const $=t.get(D);$.shadowIntensity=J.intensity,$.shadowBias=J.bias,$.shadowNormalBias=J.normalBias,$.shadowRadius=J.radius,$.shadowMapSize=J.mapSize,r.spotShadow[w]=$,r.spotShadowMap[w]=k,C++}w++}else if(D.isRectAreaLight){const he=e.get(D);he.color.copy(K).multiplyScalar(ne),he.halfWidth.set(D.width*.5,0,0),he.halfHeight.set(0,D.height*.5,0),r.rectArea[_]=he,_++}else if(D.isPointLight){const he=e.get(D);if(he.color.copy(D.color).multiplyScalar(D.intensity),he.distance=D.distance,he.decay=D.decay,D.castShadow){const J=D.shadow,$=t.get(D);$.shadowIntensity=J.intensity,$.shadowBias=J.bias,$.shadowNormalBias=J.normalBias,$.shadowRadius=J.radius,$.shadowMapSize=J.mapSize,$.shadowCameraNear=J.camera.near,$.shadowCameraFar=J.camera.far,r.pointShadow[E]=$,r.pointShadowMap[E]=k,r.pointShadowMatrix[E]=D.shadow.matrix,P++}r.point[E]=he,E++}else if(D.isHemisphereLight){const he=e.get(D);he.skyColor.copy(D.color).multiplyScalar(ne),he.groundColor.copy(D.groundColor).multiplyScalar(ne),r.hemi[y]=he,y++}}_>0&&(i.has("OES_texture_float_linear")===!0?(r.rectAreaLTC1=ze.LTC_FLOAT_1,r.rectAreaLTC2=ze.LTC_FLOAT_2):(r.rectAreaLTC1=ze.LTC_HALF_1,r.rectAreaLTC2=ze.LTC_HALF_2)),r.ambient[0]=m,r.ambient[1]=g,r.ambient[2]=x;const b=r.hash;(b.directionalLength!==M||b.pointLength!==E||b.spotLength!==w||b.rectAreaLength!==_||b.hemiLength!==y||b.numDirectionalShadows!==L||b.numPointShadows!==P||b.numSpotShadows!==C||b.numSpotMaps!==F||b.numLightProbes!==O)&&(r.directional.length=M,r.spot.length=w,r.rectArea.length=_,r.point.length=E,r.hemi.length=y,r.directionalShadow.length=L,r.directionalShadowMap.length=L,r.pointShadow.length=P,r.pointShadowMap.length=P,r.spotShadow.length=C,r.spotShadowMap.length=C,r.directionalShadowMatrix.length=L,r.pointShadowMatrix.length=P,r.spotLightMatrix.length=C+F-N,r.spotLightMap.length=F,r.numSpotLightShadowsWithMaps=N,r.numLightProbes=O,b.directionalLength=M,b.pointLength=E,b.spotLength=w,b.rectAreaLength=_,b.hemiLength=y,b.numDirectionalShadows=L,b.numPointShadows=P,b.numSpotShadows=C,b.numSpotMaps=F,b.numLightProbes=O,r.version=RP++)}function h(f,m){let g=0,x=0,M=0,E=0,w=0;const _=m.matrixWorldInverse;for(let y=0,L=f.length;y<L;y++){const P=f[y];if(P.isDirectionalLight){const C=r.directional[g];C.direction.setFromMatrixPosition(P.matrixWorld),a.setFromMatrixPosition(P.target.matrixWorld),C.direction.sub(a),C.direction.transformDirection(_),g++}else if(P.isSpotLight){const C=r.spot[M];C.position.setFromMatrixPosition(P.matrixWorld),C.position.applyMatrix4(_),C.direction.setFromMatrixPosition(P.matrixWorld),a.setFromMatrixPosition(P.target.matrixWorld),C.direction.sub(a),C.direction.transformDirection(_),M++}else if(P.isRectAreaLight){const C=r.rectArea[E];C.position.setFromMatrixPosition(P.matrixWorld),C.position.applyMatrix4(_),c.identity(),l.copy(P.matrixWorld),l.premultiply(_),c.extractRotation(l),C.halfWidth.set(P.width*.5,0,0),C.halfHeight.set(0,P.height*.5,0),C.halfWidth.applyMatrix4(c),C.halfHeight.applyMatrix4(c),E++}else if(P.isPointLight){const C=r.point[x];C.position.setFromMatrixPosition(P.matrixWorld),C.position.applyMatrix4(_),x++}else if(P.isHemisphereLight){const C=r.hemi[w];C.direction.setFromMatrixPosition(P.matrixWorld),C.direction.transformDirection(_),w++}}}return{setup:d,setupView:h,state:r}}function Yv(i){const e=new PP(i),t=[],r=[],a=[];function l(x){g.camera=x,t.length=0,r.length=0,a.length=0}function c(x){t.push(x)}function d(x){r.push(x)}function h(x){a.push(x)}function f(){e.setup(t)}function m(x){e.setupView(t,x)}const g={lightsArray:t,shadowsArray:r,lightProbeGridArray:a,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:l,state:g,setupLights:f,setupLightsView:m,pushLight:c,pushShadow:d,pushLightProbeGrid:h}}function NP(i){let e=new WeakMap;function t(a,l=0){const c=e.get(a);let d;return c===void 0?(d=new Yv(i),e.set(a,[d])):l>=c.length?(d=new Yv(i),c.push(d)):d=c[l],d}function r(){e=new WeakMap}return{get:t,dispose:r}}const LP=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,DP=`uniform sampler2D shadow_pass;
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
}`,IP=[new ee(1,0,0),new ee(-1,0,0),new ee(0,1,0),new ee(0,-1,0),new ee(0,0,1),new ee(0,0,-1)],UP=[new ee(0,-1,0),new ee(0,-1,0),new ee(0,0,1),new ee(0,0,-1),new ee(0,-1,0),new ee(0,-1,0)],Kv=new sn,Dl=new ee,$f=new ee;function FP(i,e,t){let r=new km;const a=new ht,l=new ht,c=new cn,d=new zb,h=new Bb,f={},m=t.maxTextureSize,g={[Fs]:hi,[hi]:Fs,[hr]:hr},x=new yr({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ht},radius:{value:4}},vertexShader:LP,fragmentShader:DP}),M=x.clone();M.defines.HORIZONTAL_PASS=1;const E=new Mi;E.setAttribute("position",new xr(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const w=new Zi(E,x),_=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Wu;let y=this.type;this.render=function(N,O,b){if(_.enabled===!1||_.autoUpdate===!1&&_.needsUpdate===!1||N.length===0)return;this.type===Tw&&(ct("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Wu);const U=i.getRenderTarget(),G=i.getActiveCubeFace(),D=i.getActiveMipmapLevel(),K=i.state;K.setBlending(Gr),K.buffers.depth.getReversed()===!0?K.buffers.color.setClear(0,0,0,0):K.buffers.color.setClear(1,1,1,1),K.buffers.depth.setTest(!0),K.setScissorTest(!1);const ne=y!==this.type;ne&&O.traverse(function(me){me.material&&(Array.isArray(me.material)?me.material.forEach(k=>k.needsUpdate=!0):me.material.needsUpdate=!0)});for(let me=0,k=N.length;me<k;me++){const he=N[me],J=he.shadow;if(J===void 0){ct("WebGLShadowMap:",he,"has no shadow.");continue}if(J.autoUpdate===!1&&J.needsUpdate===!1)continue;a.copy(J.mapSize);const $=J.getFrameExtents();a.multiply($),l.copy(J.mapSize),(a.x>m||a.y>m)&&(a.x>m&&(l.x=Math.floor(m/$.x),a.x=l.x*$.x,J.mapSize.x=l.x),a.y>m&&(l.y=Math.floor(m/$.y),a.y=l.y*$.y,J.mapSize.y=l.y));const ce=i.state.buffers.depth.getReversed();if(J.camera._reversedDepth=ce,J.map===null||ne===!0){if(J.map!==null&&(J.map.depthTexture!==null&&(J.map.depthTexture.dispose(),J.map.depthTexture=null),J.map.dispose()),this.type===Ul){if(he.isPointLight){ct("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}J.map=new gr(a.x,a.y,{format:Ta,type:$r,minFilter:Wn,magFilter:Wn,generateMipmaps:!1}),J.map.texture.name=he.name+".shadowMap",J.map.depthTexture=new Uo(a.x,a.y,fr),J.map.depthTexture.name=he.name+".shadowMapDepth",J.map.depthTexture.format=qr,J.map.depthTexture.compareFunction=null,J.map.depthTexture.minFilter=Fn,J.map.depthTexture.magFilter=Fn}else he.isPointLight?(J.map=new Ty(a.x),J.map.depthTexture=new Lb(a.x,vr)):(J.map=new gr(a.x,a.y),J.map.depthTexture=new Uo(a.x,a.y,vr)),J.map.depthTexture.name=he.name+".shadowMap",J.map.depthTexture.format=qr,this.type===Wu?(J.map.depthTexture.compareFunction=ce?Fm:Um,J.map.depthTexture.minFilter=Wn,J.map.depthTexture.magFilter=Wn):(J.map.depthTexture.compareFunction=null,J.map.depthTexture.minFilter=Fn,J.map.depthTexture.magFilter=Fn);J.camera.updateProjectionMatrix()}const ue=J.map.isWebGLCubeRenderTarget?6:1;for(let z=0;z<ue;z++){if(J.map.isWebGLCubeRenderTarget)i.setRenderTarget(J.map,z),i.clear();else{z===0&&(i.setRenderTarget(J.map),i.clear());const X=J.getViewport(z);c.set(l.x*X.x,l.y*X.y,l.x*X.z,l.y*X.w),K.viewport(c)}if(he.isPointLight){const X=J.camera,Ue=J.matrix,He=he.distance||X.far;He!==X.far&&(X.far=He,X.updateProjectionMatrix()),Dl.setFromMatrixPosition(he.matrixWorld),X.position.copy(Dl),$f.copy(X.position),$f.add(IP[z]),X.up.copy(UP[z]),X.lookAt($f),X.updateMatrixWorld(),Ue.makeTranslation(-Dl.x,-Dl.y,-Dl.z),Kv.multiplyMatrices(X.projectionMatrix,X.matrixWorldInverse),J._frustum.setFromProjectionMatrix(Kv,X.coordinateSystem,X.reversedDepth)}else J.updateMatrices(he);r=J.getFrustum(),C(O,b,J.camera,he,this.type)}J.isPointLightShadow!==!0&&this.type===Ul&&L(J,b),J.needsUpdate=!1}y=this.type,_.needsUpdate=!1,i.setRenderTarget(U,G,D)};function L(N,O){const b=e.update(w);x.defines.VSM_SAMPLES!==N.blurSamples&&(x.defines.VSM_SAMPLES=N.blurSamples,M.defines.VSM_SAMPLES=N.blurSamples,x.needsUpdate=!0,M.needsUpdate=!0),N.mapPass===null&&(N.mapPass=new gr(a.x,a.y,{format:Ta,type:$r})),x.uniforms.shadow_pass.value=N.map.depthTexture,x.uniforms.resolution.value=N.mapSize,x.uniforms.radius.value=N.radius,i.setRenderTarget(N.mapPass),i.clear(),i.renderBufferDirect(O,null,b,x,w,null),M.uniforms.shadow_pass.value=N.mapPass.texture,M.uniforms.resolution.value=N.mapSize,M.uniforms.radius.value=N.radius,i.setRenderTarget(N.map),i.clear(),i.renderBufferDirect(O,null,b,M,w,null)}function P(N,O,b,U){let G=null;const D=b.isPointLight===!0?N.customDistanceMaterial:N.customDepthMaterial;if(D!==void 0)G=D;else if(G=b.isPointLight===!0?h:d,i.localClippingEnabled&&O.clipShadows===!0&&Array.isArray(O.clippingPlanes)&&O.clippingPlanes.length!==0||O.displacementMap&&O.displacementScale!==0||O.alphaMap&&O.alphaTest>0||O.map&&O.alphaTest>0||O.alphaToCoverage===!0){const K=G.uuid,ne=O.uuid;let me=f[K];me===void 0&&(me={},f[K]=me);let k=me[ne];k===void 0&&(k=G.clone(),me[ne]=k,O.addEventListener("dispose",F)),G=k}if(G.visible=O.visible,G.wireframe=O.wireframe,U===Ul?G.side=O.shadowSide!==null?O.shadowSide:O.side:G.side=O.shadowSide!==null?O.shadowSide:g[O.side],G.alphaMap=O.alphaMap,G.alphaTest=O.alphaToCoverage===!0?.5:O.alphaTest,G.map=O.map,G.clipShadows=O.clipShadows,G.clippingPlanes=O.clippingPlanes,G.clipIntersection=O.clipIntersection,G.displacementMap=O.displacementMap,G.displacementScale=O.displacementScale,G.displacementBias=O.displacementBias,G.wireframeLinewidth=O.wireframeLinewidth,G.linewidth=O.linewidth,b.isPointLight===!0&&G.isMeshDistanceMaterial===!0){const K=i.properties.get(G);K.light=b}return G}function C(N,O,b,U,G){if(N.visible===!1)return;if(N.layers.test(O.layers)&&(N.isMesh||N.isLine||N.isPoints)&&(N.castShadow||N.receiveShadow&&G===Ul)&&(!N.frustumCulled||r.intersectsObject(N))){N.modelViewMatrix.multiplyMatrices(b.matrixWorldInverse,N.matrixWorld);const ne=e.update(N),me=N.material;if(Array.isArray(me)){const k=ne.groups;for(let he=0,J=k.length;he<J;he++){const $=k[he],ce=me[$.materialIndex];if(ce&&ce.visible){const ue=P(N,ce,U,G);N.onBeforeShadow(i,N,O,b,ne,ue,$),i.renderBufferDirect(b,null,ne,ue,N,$),N.onAfterShadow(i,N,O,b,ne,ue,$)}}}else if(me.visible){const k=P(N,me,U,G);N.onBeforeShadow(i,N,O,b,ne,k,null),i.renderBufferDirect(b,null,ne,k,N,null),N.onAfterShadow(i,N,O,b,ne,k,null)}}const K=N.children;for(let ne=0,me=K.length;ne<me;ne++)C(K[ne],O,b,U,G)}function F(N){N.target.removeEventListener("dispose",F);for(const b in f){const U=f[b],G=N.target.uuid;G in U&&(U[G].dispose(),delete U[G])}}}function OP(i,e){function t(){let W=!1;const Pe=new cn;let ye=null;const De=new cn(0,0,0,0);return{setMask:function(Fe){ye!==Fe&&!W&&(i.colorMask(Fe,Fe,Fe,Fe),ye=Fe)},setLocked:function(Fe){W=Fe},setClear:function(Fe,Ee,Ke,qe,Wt){Wt===!0&&(Fe*=qe,Ee*=qe,Ke*=qe),Pe.set(Fe,Ee,Ke,qe),De.equals(Pe)===!1&&(i.clearColor(Fe,Ee,Ke,qe),De.copy(Pe))},reset:function(){W=!1,ye=null,De.set(-1,0,0,0)}}}function r(){let W=!1,Pe=!1,ye=null,De=null,Fe=null;return{setReversed:function(Ee){if(Pe!==Ee){const Ke=e.get("EXT_clip_control");Ee?Ke.clipControlEXT(Ke.LOWER_LEFT_EXT,Ke.ZERO_TO_ONE_EXT):Ke.clipControlEXT(Ke.LOWER_LEFT_EXT,Ke.NEGATIVE_ONE_TO_ONE_EXT),Pe=Ee;const qe=Fe;Fe=null,this.setClear(qe)}},getReversed:function(){return Pe},setTest:function(Ee){Ee?ve(i.DEPTH_TEST):Oe(i.DEPTH_TEST)},setMask:function(Ee){ye!==Ee&&!W&&(i.depthMask(Ee),ye=Ee)},setFunc:function(Ee){if(Pe&&(Ee=sb[Ee]),De!==Ee){switch(Ee){case mp:i.depthFunc(i.NEVER);break;case gp:i.depthFunc(i.ALWAYS);break;case xp:i.depthFunc(i.LESS);break;case Do:i.depthFunc(i.LEQUAL);break;case vp:i.depthFunc(i.EQUAL);break;case _p:i.depthFunc(i.GEQUAL);break;case yp:i.depthFunc(i.GREATER);break;case Sp:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}De=Ee}},setLocked:function(Ee){W=Ee},setClear:function(Ee){Fe!==Ee&&(Fe=Ee,Pe&&(Ee=1-Ee),i.clearDepth(Ee))},reset:function(){W=!1,ye=null,De=null,Fe=null,Pe=!1}}}function a(){let W=!1,Pe=null,ye=null,De=null,Fe=null,Ee=null,Ke=null,qe=null,Wt=null;return{setTest:function(Ot){W||(Ot?ve(i.STENCIL_TEST):Oe(i.STENCIL_TEST))},setMask:function(Ot){Pe!==Ot&&!W&&(i.stencilMask(Ot),Pe=Ot)},setFunc:function(Ot,On,wi){(ye!==Ot||De!==On||Fe!==wi)&&(i.stencilFunc(Ot,On,wi),ye=Ot,De=On,Fe=wi)},setOp:function(Ot,On,wi){(Ee!==Ot||Ke!==On||qe!==wi)&&(i.stencilOp(Ot,On,wi),Ee=Ot,Ke=On,qe=wi)},setLocked:function(Ot){W=Ot},setClear:function(Ot){Wt!==Ot&&(i.clearStencil(Ot),Wt=Ot)},reset:function(){W=!1,Pe=null,ye=null,De=null,Fe=null,Ee=null,Ke=null,qe=null,Wt=null}}}const l=new t,c=new r,d=new a,h=new WeakMap,f=new WeakMap;let m={},g={},x={},M=new WeakMap,E=[],w=null,_=!1,y=null,L=null,P=null,C=null,F=null,N=null,O=null,b=new xt(0,0,0),U=0,G=!1,D=null,K=null,ne=null,me=null,k=null;const he=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let J=!1,$=0;const ce=i.getParameter(i.VERSION);ce.indexOf("WebGL")!==-1?($=parseFloat(/^WebGL (\d)/.exec(ce)[1]),J=$>=1):ce.indexOf("OpenGL ES")!==-1&&($=parseFloat(/^OpenGL ES (\d)/.exec(ce)[1]),J=$>=2);let ue=null,z={};const X=i.getParameter(i.SCISSOR_BOX),Ue=i.getParameter(i.VIEWPORT),He=new cn().fromArray(X),Ve=new cn().fromArray(Ue);function oe(W,Pe,ye,De){const Fe=new Uint8Array(4),Ee=i.createTexture();i.bindTexture(W,Ee),i.texParameteri(W,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(W,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Ke=0;Ke<ye;Ke++)W===i.TEXTURE_3D||W===i.TEXTURE_2D_ARRAY?i.texImage3D(Pe,0,i.RGBA,1,1,De,0,i.RGBA,i.UNSIGNED_BYTE,Fe):i.texImage2D(Pe+Ke,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Fe);return Ee}const Se={};Se[i.TEXTURE_2D]=oe(i.TEXTURE_2D,i.TEXTURE_2D,1),Se[i.TEXTURE_CUBE_MAP]=oe(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),Se[i.TEXTURE_2D_ARRAY]=oe(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),Se[i.TEXTURE_3D]=oe(i.TEXTURE_3D,i.TEXTURE_3D,1,1),l.setClear(0,0,0,1),c.setClear(1),d.setClear(0),ve(i.DEPTH_TEST),c.setFunc(Do),Gt(!1),$t(Gx),ve(i.CULL_FACE),St(Gr);function ve(W){m[W]!==!0&&(i.enable(W),m[W]=!0)}function Oe(W){m[W]!==!1&&(i.disable(W),m[W]=!1)}function Je(W,Pe){return x[W]!==Pe?(i.bindFramebuffer(W,Pe),x[W]=Pe,W===i.DRAW_FRAMEBUFFER&&(x[i.FRAMEBUFFER]=Pe),W===i.FRAMEBUFFER&&(x[i.DRAW_FRAMEBUFFER]=Pe),!0):!1}function nt(W,Pe){let ye=E,De=!1;if(W){ye=M.get(Pe),ye===void 0&&(ye=[],M.set(Pe,ye));const Fe=W.textures;if(ye.length!==Fe.length||ye[0]!==i.COLOR_ATTACHMENT0){for(let Ee=0,Ke=Fe.length;Ee<Ke;Ee++)ye[Ee]=i.COLOR_ATTACHMENT0+Ee;ye.length=Fe.length,De=!0}}else ye[0]!==i.BACK&&(ye[0]=i.BACK,De=!0);De&&i.drawBuffers(ye)}function Ut(W){return w!==W?(i.useProgram(W),w=W,!0):!1}const dt={[la]:i.FUNC_ADD,[Rw]:i.FUNC_SUBTRACT,[Aw]:i.FUNC_REVERSE_SUBTRACT};dt[Pw]=i.MIN,dt[Nw]=i.MAX;const Tt={[Lw]:i.ZERO,[Dw]:i.ONE,[Iw]:i.SRC_COLOR,[fp]:i.SRC_ALPHA,[Bw]:i.SRC_ALPHA_SATURATE,[kw]:i.DST_COLOR,[Fw]:i.DST_ALPHA,[Uw]:i.ONE_MINUS_SRC_COLOR,[pp]:i.ONE_MINUS_SRC_ALPHA,[zw]:i.ONE_MINUS_DST_COLOR,[Ow]:i.ONE_MINUS_DST_ALPHA,[Hw]:i.CONSTANT_COLOR,[Vw]:i.ONE_MINUS_CONSTANT_COLOR,[Gw]:i.CONSTANT_ALPHA,[jw]:i.ONE_MINUS_CONSTANT_ALPHA};function St(W,Pe,ye,De,Fe,Ee,Ke,qe,Wt,Ot){if(W===Gr){_===!0&&(Oe(i.BLEND),_=!1);return}if(_===!1&&(ve(i.BLEND),_=!0),W!==Cw){if(W!==y||Ot!==G){if((L!==la||F!==la)&&(i.blendEquation(i.FUNC_ADD),L=la,F=la),Ot)switch(W){case xo:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case jx:i.blendFunc(i.ONE,i.ONE);break;case Wx:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Xx:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Lt("WebGLState: Invalid blending: ",W);break}else switch(W){case xo:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case jx:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case Wx:Lt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Xx:Lt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Lt("WebGLState: Invalid blending: ",W);break}P=null,C=null,N=null,O=null,b.set(0,0,0),U=0,y=W,G=Ot}return}Fe=Fe||Pe,Ee=Ee||ye,Ke=Ke||De,(Pe!==L||Fe!==F)&&(i.blendEquationSeparate(dt[Pe],dt[Fe]),L=Pe,F=Fe),(ye!==P||De!==C||Ee!==N||Ke!==O)&&(i.blendFuncSeparate(Tt[ye],Tt[De],Tt[Ee],Tt[Ke]),P=ye,C=De,N=Ee,O=Ke),(qe.equals(b)===!1||Wt!==U)&&(i.blendColor(qe.r,qe.g,qe.b,Wt),b.copy(qe),U=Wt),y=W,G=!1}function vt(W,Pe){W.side===hr?Oe(i.CULL_FACE):ve(i.CULL_FACE);let ye=W.side===hi;Pe&&(ye=!ye),Gt(ye),W.blending===xo&&W.transparent===!1?St(Gr):St(W.blending,W.blendEquation,W.blendSrc,W.blendDst,W.blendEquationAlpha,W.blendSrcAlpha,W.blendDstAlpha,W.blendColor,W.blendAlpha,W.premultipliedAlpha),c.setFunc(W.depthFunc),c.setTest(W.depthTest),c.setMask(W.depthWrite),l.setMask(W.colorWrite);const De=W.stencilWrite;d.setTest(De),De&&(d.setMask(W.stencilWriteMask),d.setFunc(W.stencilFunc,W.stencilRef,W.stencilFuncMask),d.setOp(W.stencilFail,W.stencilZFail,W.stencilZPass)),jt(W.polygonOffset,W.polygonOffsetFactor,W.polygonOffsetUnits),W.alphaToCoverage===!0?ve(i.SAMPLE_ALPHA_TO_COVERAGE):Oe(i.SAMPLE_ALPHA_TO_COVERAGE)}function Gt(W){D!==W&&(W?i.frontFace(i.CW):i.frontFace(i.CCW),D=W)}function $t(W){W!==ww?(ve(i.CULL_FACE),W!==K&&(W===Gx?i.cullFace(i.BACK):W===bw?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):Oe(i.CULL_FACE),K=W}function qt(W){W!==ne&&(J&&i.lineWidth(W),ne=W)}function jt(W,Pe,ye){W?(ve(i.POLYGON_OFFSET_FILL),(me!==Pe||k!==ye)&&(me=Pe,k=ye,c.getReversed()&&(Pe=-Pe),i.polygonOffset(Pe,ye))):Oe(i.POLYGON_OFFSET_FILL)}function wt(W){W?ve(i.SCISSOR_TEST):Oe(i.SCISSOR_TEST)}function Ft(W){W===void 0&&(W=i.TEXTURE0+he-1),ue!==W&&(i.activeTexture(W),ue=W)}function q(W,Pe,ye){ye===void 0&&(ue===null?ye=i.TEXTURE0+he-1:ye=ue);let De=z[ye];De===void 0&&(De={type:void 0,texture:void 0},z[ye]=De),(De.type!==W||De.texture!==Pe)&&(ue!==ye&&(i.activeTexture(ye),ue=ye),i.bindTexture(W,Pe||Se[W]),De.type=W,De.texture=Pe)}function un(){const W=z[ue];W!==void 0&&W.type!==void 0&&(i.bindTexture(W.type,null),W.type=void 0,W.texture=void 0)}function de(){try{i.compressedTexImage2D(...arguments)}catch(W){Lt("WebGLState:",W)}}function I(){try{i.compressedTexImage3D(...arguments)}catch(W){Lt("WebGLState:",W)}}function T(){try{i.texSubImage2D(...arguments)}catch(W){Lt("WebGLState:",W)}}function Z(){try{i.texSubImage3D(...arguments)}catch(W){Lt("WebGLState:",W)}}function re(){try{i.compressedTexSubImage2D(...arguments)}catch(W){Lt("WebGLState:",W)}}function ge(){try{i.compressedTexSubImage3D(...arguments)}catch(W){Lt("WebGLState:",W)}}function be(){try{i.texStorage2D(...arguments)}catch(W){Lt("WebGLState:",W)}}function Ne(){try{i.texStorage3D(...arguments)}catch(W){Lt("WebGLState:",W)}}function xe(){try{i.texImage2D(...arguments)}catch(W){Lt("WebGLState:",W)}}function _e(){try{i.texImage3D(...arguments)}catch(W){Lt("WebGLState:",W)}}function Ie(W){return g[W]!==void 0?g[W]:i.getParameter(W)}function Xe(W,Pe){g[W]!==Pe&&(i.pixelStorei(W,Pe),g[W]=Pe)}function te(W){He.equals(W)===!1&&(i.scissor(W.x,W.y,W.z,W.w),He.copy(W))}function Me(W){Ve.equals(W)===!1&&(i.viewport(W.x,W.y,W.z,W.w),Ve.copy(W))}function ke(W,Pe){let ye=f.get(Pe);ye===void 0&&(ye=new WeakMap,f.set(Pe,ye));let De=ye.get(W);De===void 0&&(De=i.getUniformBlockIndex(Pe,W.name),ye.set(W,De))}function it(W,Pe){const De=f.get(Pe).get(W);h.get(Pe)!==De&&(i.uniformBlockBinding(Pe,De,W.__bindingPointIndex),h.set(Pe,De))}function at(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),c.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),m={},g={},ue=null,z={},x={},M=new WeakMap,E=[],w=null,_=!1,y=null,L=null,P=null,C=null,F=null,N=null,O=null,b=new xt(0,0,0),U=0,G=!1,D=null,K=null,ne=null,me=null,k=null,He.set(0,0,i.canvas.width,i.canvas.height),Ve.set(0,0,i.canvas.width,i.canvas.height),l.reset(),c.reset(),d.reset()}return{buffers:{color:l,depth:c,stencil:d},enable:ve,disable:Oe,bindFramebuffer:Je,drawBuffers:nt,useProgram:Ut,setBlending:St,setMaterial:vt,setFlipSided:Gt,setCullFace:$t,setLineWidth:qt,setPolygonOffset:jt,setScissorTest:wt,activeTexture:Ft,bindTexture:q,unbindTexture:un,compressedTexImage2D:de,compressedTexImage3D:I,texImage2D:xe,texImage3D:_e,pixelStorei:Xe,getParameter:Ie,updateUBOMapping:ke,uniformBlockBinding:it,texStorage2D:be,texStorage3D:Ne,texSubImage2D:T,texSubImage3D:Z,compressedTexSubImage2D:re,compressedTexSubImage3D:ge,scissor:te,viewport:Me,reset:at}}function kP(i,e,t,r,a,l,c){const d=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,h=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),f=new ht,m=new WeakMap,g=new Set;let x;const M=new WeakMap;let E=!1;try{E=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function w(I,T){return E?new OffscreenCanvas(I,T):$l("canvas")}function _(I,T,Z){let re=1;const ge=de(I);if((ge.width>Z||ge.height>Z)&&(re=Z/Math.max(ge.width,ge.height)),re<1)if(typeof HTMLImageElement<"u"&&I instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&I instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&I instanceof ImageBitmap||typeof VideoFrame<"u"&&I instanceof VideoFrame){const be=Math.floor(re*ge.width),Ne=Math.floor(re*ge.height);x===void 0&&(x=w(be,Ne));const xe=T?w(be,Ne):x;return xe.width=be,xe.height=Ne,xe.getContext("2d").drawImage(I,0,0,be,Ne),ct("WebGLRenderer: Texture has been resized from ("+ge.width+"x"+ge.height+") to ("+be+"x"+Ne+")."),xe}else return"data"in I&&ct("WebGLRenderer: Image in DataTexture is too big ("+ge.width+"x"+ge.height+")."),I;return I}function y(I){return I.generateMipmaps}function L(I){i.generateMipmap(I)}function P(I){return I.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:I.isWebGL3DRenderTarget?i.TEXTURE_3D:I.isWebGLArrayRenderTarget||I.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function C(I,T,Z,re,ge,be=!1){if(I!==null){if(i[I]!==void 0)return i[I];ct("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+I+"'")}let Ne;re&&(Ne=e.get("EXT_texture_norm16"),Ne||ct("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let xe=T;if(T===i.RED&&(Z===i.FLOAT&&(xe=i.R32F),Z===i.HALF_FLOAT&&(xe=i.R16F),Z===i.UNSIGNED_BYTE&&(xe=i.R8),Z===i.UNSIGNED_SHORT&&Ne&&(xe=Ne.R16_EXT),Z===i.SHORT&&Ne&&(xe=Ne.R16_SNORM_EXT)),T===i.RED_INTEGER&&(Z===i.UNSIGNED_BYTE&&(xe=i.R8UI),Z===i.UNSIGNED_SHORT&&(xe=i.R16UI),Z===i.UNSIGNED_INT&&(xe=i.R32UI),Z===i.BYTE&&(xe=i.R8I),Z===i.SHORT&&(xe=i.R16I),Z===i.INT&&(xe=i.R32I)),T===i.RG&&(Z===i.FLOAT&&(xe=i.RG32F),Z===i.HALF_FLOAT&&(xe=i.RG16F),Z===i.UNSIGNED_BYTE&&(xe=i.RG8),Z===i.UNSIGNED_SHORT&&Ne&&(xe=Ne.RG16_EXT),Z===i.SHORT&&Ne&&(xe=Ne.RG16_SNORM_EXT)),T===i.RG_INTEGER&&(Z===i.UNSIGNED_BYTE&&(xe=i.RG8UI),Z===i.UNSIGNED_SHORT&&(xe=i.RG16UI),Z===i.UNSIGNED_INT&&(xe=i.RG32UI),Z===i.BYTE&&(xe=i.RG8I),Z===i.SHORT&&(xe=i.RG16I),Z===i.INT&&(xe=i.RG32I)),T===i.RGB_INTEGER&&(Z===i.UNSIGNED_BYTE&&(xe=i.RGB8UI),Z===i.UNSIGNED_SHORT&&(xe=i.RGB16UI),Z===i.UNSIGNED_INT&&(xe=i.RGB32UI),Z===i.BYTE&&(xe=i.RGB8I),Z===i.SHORT&&(xe=i.RGB16I),Z===i.INT&&(xe=i.RGB32I)),T===i.RGBA_INTEGER&&(Z===i.UNSIGNED_BYTE&&(xe=i.RGBA8UI),Z===i.UNSIGNED_SHORT&&(xe=i.RGBA16UI),Z===i.UNSIGNED_INT&&(xe=i.RGBA32UI),Z===i.BYTE&&(xe=i.RGBA8I),Z===i.SHORT&&(xe=i.RGBA16I),Z===i.INT&&(xe=i.RGBA32I)),T===i.RGB&&(Z===i.UNSIGNED_SHORT&&Ne&&(xe=Ne.RGB16_EXT),Z===i.SHORT&&Ne&&(xe=Ne.RGB16_SNORM_EXT),Z===i.UNSIGNED_INT_5_9_9_9_REV&&(xe=i.RGB9_E5),Z===i.UNSIGNED_INT_10F_11F_11F_REV&&(xe=i.R11F_G11F_B10F)),T===i.RGBA){const _e=be?od:Rt.getTransfer(ge);Z===i.FLOAT&&(xe=i.RGBA32F),Z===i.HALF_FLOAT&&(xe=i.RGBA16F),Z===i.UNSIGNED_BYTE&&(xe=_e===Vt?i.SRGB8_ALPHA8:i.RGBA8),Z===i.UNSIGNED_SHORT&&Ne&&(xe=Ne.RGBA16_EXT),Z===i.SHORT&&Ne&&(xe=Ne.RGBA16_SNORM_EXT),Z===i.UNSIGNED_SHORT_4_4_4_4&&(xe=i.RGBA4),Z===i.UNSIGNED_SHORT_5_5_5_1&&(xe=i.RGB5_A1)}return(xe===i.R16F||xe===i.R32F||xe===i.RG16F||xe===i.RG32F||xe===i.RGBA16F||xe===i.RGBA32F)&&e.get("EXT_color_buffer_float"),xe}function F(I,T){let Z;return I?T===null||T===vr||T===Wl?Z=i.DEPTH24_STENCIL8:T===fr?Z=i.DEPTH32F_STENCIL8:T===jl&&(Z=i.DEPTH24_STENCIL8,ct("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):T===null||T===vr||T===Wl?Z=i.DEPTH_COMPONENT24:T===fr?Z=i.DEPTH_COMPONENT32F:T===jl&&(Z=i.DEPTH_COMPONENT16),Z}function N(I,T){return y(I)===!0||I.isFramebufferTexture&&I.minFilter!==Fn&&I.minFilter!==Wn?Math.log2(Math.max(T.width,T.height))+1:I.mipmaps!==void 0&&I.mipmaps.length>0?I.mipmaps.length:I.isCompressedTexture&&Array.isArray(I.image)?T.mipmaps.length:1}function O(I){const T=I.target;T.removeEventListener("dispose",O),U(T),T.isVideoTexture&&m.delete(T),T.isHTMLTexture&&g.delete(T)}function b(I){const T=I.target;T.removeEventListener("dispose",b),D(T)}function U(I){const T=r.get(I);if(T.__webglInit===void 0)return;const Z=I.source,re=M.get(Z);if(re){const ge=re[T.__cacheKey];ge.usedTimes--,ge.usedTimes===0&&G(I),Object.keys(re).length===0&&M.delete(Z)}r.remove(I)}function G(I){const T=r.get(I);i.deleteTexture(T.__webglTexture);const Z=I.source,re=M.get(Z);delete re[T.__cacheKey],c.memory.textures--}function D(I){const T=r.get(I);if(I.depthTexture&&(I.depthTexture.dispose(),r.remove(I.depthTexture)),I.isWebGLCubeRenderTarget)for(let re=0;re<6;re++){if(Array.isArray(T.__webglFramebuffer[re]))for(let ge=0;ge<T.__webglFramebuffer[re].length;ge++)i.deleteFramebuffer(T.__webglFramebuffer[re][ge]);else i.deleteFramebuffer(T.__webglFramebuffer[re]);T.__webglDepthbuffer&&i.deleteRenderbuffer(T.__webglDepthbuffer[re])}else{if(Array.isArray(T.__webglFramebuffer))for(let re=0;re<T.__webglFramebuffer.length;re++)i.deleteFramebuffer(T.__webglFramebuffer[re]);else i.deleteFramebuffer(T.__webglFramebuffer);if(T.__webglDepthbuffer&&i.deleteRenderbuffer(T.__webglDepthbuffer),T.__webglMultisampledFramebuffer&&i.deleteFramebuffer(T.__webglMultisampledFramebuffer),T.__webglColorRenderbuffer)for(let re=0;re<T.__webglColorRenderbuffer.length;re++)T.__webglColorRenderbuffer[re]&&i.deleteRenderbuffer(T.__webglColorRenderbuffer[re]);T.__webglDepthRenderbuffer&&i.deleteRenderbuffer(T.__webglDepthRenderbuffer)}const Z=I.textures;for(let re=0,ge=Z.length;re<ge;re++){const be=r.get(Z[re]);be.__webglTexture&&(i.deleteTexture(be.__webglTexture),c.memory.textures--),r.remove(Z[re])}r.remove(I)}let K=0;function ne(){K=0}function me(){return K}function k(I){K=I}function he(){const I=K;return I>=a.maxTextures&&ct("WebGLTextures: Trying to use "+I+" texture units while this GPU supports only "+a.maxTextures),K+=1,I}function J(I){const T=[];return T.push(I.wrapS),T.push(I.wrapT),T.push(I.wrapR||0),T.push(I.magFilter),T.push(I.minFilter),T.push(I.anisotropy),T.push(I.internalFormat),T.push(I.format),T.push(I.type),T.push(I.generateMipmaps),T.push(I.premultiplyAlpha),T.push(I.flipY),T.push(I.unpackAlignment),T.push(I.colorSpace),T.join()}function $(I,T){const Z=r.get(I);if(I.isVideoTexture&&q(I),I.isRenderTargetTexture===!1&&I.isExternalTexture!==!0&&I.version>0&&Z.__version!==I.version){const re=I.image;if(re===null)ct("WebGLRenderer: Texture marked for update but no image data found.");else if(re.complete===!1)ct("WebGLRenderer: Texture marked for update but image is incomplete");else{Oe(Z,I,T);return}}else I.isExternalTexture&&(Z.__webglTexture=I.sourceTexture?I.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,Z.__webglTexture,i.TEXTURE0+T)}function ce(I,T){const Z=r.get(I);if(I.isRenderTargetTexture===!1&&I.version>0&&Z.__version!==I.version){Oe(Z,I,T);return}else I.isExternalTexture&&(Z.__webglTexture=I.sourceTexture?I.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,Z.__webglTexture,i.TEXTURE0+T)}function ue(I,T){const Z=r.get(I);if(I.isRenderTargetTexture===!1&&I.version>0&&Z.__version!==I.version){Oe(Z,I,T);return}t.bindTexture(i.TEXTURE_3D,Z.__webglTexture,i.TEXTURE0+T)}function z(I,T){const Z=r.get(I);if(I.isCubeDepthTexture!==!0&&I.version>0&&Z.__version!==I.version){Je(Z,I,T);return}t.bindTexture(i.TEXTURE_CUBE_MAP,Z.__webglTexture,i.TEXTURE0+T)}const X={[Mp]:i.REPEAT,[Vr]:i.CLAMP_TO_EDGE,[Ep]:i.MIRRORED_REPEAT},Ue={[Fn]:i.NEAREST,[$w]:i.NEAREST_MIPMAP_NEAREST,[fu]:i.NEAREST_MIPMAP_LINEAR,[Wn]:i.LINEAR,[ff]:i.LINEAR_MIPMAP_NEAREST,[da]:i.LINEAR_MIPMAP_LINEAR},He={[Kw]:i.NEVER,[tb]:i.ALWAYS,[Qw]:i.LESS,[Um]:i.LEQUAL,[Zw]:i.EQUAL,[Fm]:i.GEQUAL,[Jw]:i.GREATER,[eb]:i.NOTEQUAL};function Ve(I,T){if(T.type===fr&&e.has("OES_texture_float_linear")===!1&&(T.magFilter===Wn||T.magFilter===ff||T.magFilter===fu||T.magFilter===da||T.minFilter===Wn||T.minFilter===ff||T.minFilter===fu||T.minFilter===da)&&ct("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(I,i.TEXTURE_WRAP_S,X[T.wrapS]),i.texParameteri(I,i.TEXTURE_WRAP_T,X[T.wrapT]),(I===i.TEXTURE_3D||I===i.TEXTURE_2D_ARRAY)&&i.texParameteri(I,i.TEXTURE_WRAP_R,X[T.wrapR]),i.texParameteri(I,i.TEXTURE_MAG_FILTER,Ue[T.magFilter]),i.texParameteri(I,i.TEXTURE_MIN_FILTER,Ue[T.minFilter]),T.compareFunction&&(i.texParameteri(I,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(I,i.TEXTURE_COMPARE_FUNC,He[T.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(T.magFilter===Fn||T.minFilter!==fu&&T.minFilter!==da||T.type===fr&&e.has("OES_texture_float_linear")===!1)return;if(T.anisotropy>1||r.get(T).__currentAnisotropy){const Z=e.get("EXT_texture_filter_anisotropic");i.texParameterf(I,Z.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(T.anisotropy,a.getMaxAnisotropy())),r.get(T).__currentAnisotropy=T.anisotropy}}}function oe(I,T){let Z=!1;I.__webglInit===void 0&&(I.__webglInit=!0,T.addEventListener("dispose",O));const re=T.source;let ge=M.get(re);ge===void 0&&(ge={},M.set(re,ge));const be=J(T);if(be!==I.__cacheKey){ge[be]===void 0&&(ge[be]={texture:i.createTexture(),usedTimes:0},c.memory.textures++,Z=!0),ge[be].usedTimes++;const Ne=ge[I.__cacheKey];Ne!==void 0&&(ge[I.__cacheKey].usedTimes--,Ne.usedTimes===0&&G(T)),I.__cacheKey=be,I.__webglTexture=ge[be].texture}return Z}function Se(I,T,Z){return Math.floor(Math.floor(I/Z)/T)}function ve(I,T,Z,re){const be=I.updateRanges;if(be.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,T.width,T.height,Z,re,T.data);else{be.sort((Xe,te)=>Xe.start-te.start);let Ne=0;for(let Xe=1;Xe<be.length;Xe++){const te=be[Ne],Me=be[Xe],ke=te.start+te.count,it=Se(Me.start,T.width,4),at=Se(te.start,T.width,4);Me.start<=ke+1&&it===at&&Se(Me.start+Me.count-1,T.width,4)===it?te.count=Math.max(te.count,Me.start+Me.count-te.start):(++Ne,be[Ne]=Me)}be.length=Ne+1;const xe=t.getParameter(i.UNPACK_ROW_LENGTH),_e=t.getParameter(i.UNPACK_SKIP_PIXELS),Ie=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,T.width);for(let Xe=0,te=be.length;Xe<te;Xe++){const Me=be[Xe],ke=Math.floor(Me.start/4),it=Math.ceil(Me.count/4),at=ke%T.width,W=Math.floor(ke/T.width),Pe=it,ye=1;t.pixelStorei(i.UNPACK_SKIP_PIXELS,at),t.pixelStorei(i.UNPACK_SKIP_ROWS,W),t.texSubImage2D(i.TEXTURE_2D,0,at,W,Pe,ye,Z,re,T.data)}I.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,xe),t.pixelStorei(i.UNPACK_SKIP_PIXELS,_e),t.pixelStorei(i.UNPACK_SKIP_ROWS,Ie)}}function Oe(I,T,Z){let re=i.TEXTURE_2D;(T.isDataArrayTexture||T.isCompressedArrayTexture)&&(re=i.TEXTURE_2D_ARRAY),T.isData3DTexture&&(re=i.TEXTURE_3D);const ge=oe(I,T),be=T.source;t.bindTexture(re,I.__webglTexture,i.TEXTURE0+Z);const Ne=r.get(be);if(be.version!==Ne.__version||ge===!0){if(t.activeTexture(i.TEXTURE0+Z),(typeof ImageBitmap<"u"&&T.image instanceof ImageBitmap)===!1){const ye=Rt.getPrimaries(Rt.workingColorSpace),De=T.colorSpace===ws?null:Rt.getPrimaries(T.colorSpace),Fe=T.colorSpace===ws||ye===De?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Fe)}t.pixelStorei(i.UNPACK_ALIGNMENT,T.unpackAlignment);let _e=_(T.image,!1,a.maxTextureSize);_e=un(T,_e);const Ie=l.convert(T.format,T.colorSpace),Xe=l.convert(T.type);let te=C(T.internalFormat,Ie,Xe,T.normalized,T.colorSpace,T.isVideoTexture);Ve(re,T);let Me;const ke=T.mipmaps,it=T.isVideoTexture!==!0,at=Ne.__version===void 0||ge===!0,W=be.dataReady,Pe=N(T,_e);if(T.isDepthTexture)te=F(T.format===ha,T.type),at&&(it?t.texStorage2D(i.TEXTURE_2D,1,te,_e.width,_e.height):t.texImage2D(i.TEXTURE_2D,0,te,_e.width,_e.height,0,Ie,Xe,null));else if(T.isDataTexture)if(ke.length>0){it&&at&&t.texStorage2D(i.TEXTURE_2D,Pe,te,ke[0].width,ke[0].height);for(let ye=0,De=ke.length;ye<De;ye++)Me=ke[ye],it?W&&t.texSubImage2D(i.TEXTURE_2D,ye,0,0,Me.width,Me.height,Ie,Xe,Me.data):t.texImage2D(i.TEXTURE_2D,ye,te,Me.width,Me.height,0,Ie,Xe,Me.data);T.generateMipmaps=!1}else it?(at&&t.texStorage2D(i.TEXTURE_2D,Pe,te,_e.width,_e.height),W&&ve(T,_e,Ie,Xe)):t.texImage2D(i.TEXTURE_2D,0,te,_e.width,_e.height,0,Ie,Xe,_e.data);else if(T.isCompressedTexture)if(T.isCompressedArrayTexture){it&&at&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Pe,te,ke[0].width,ke[0].height,_e.depth);for(let ye=0,De=ke.length;ye<De;ye++)if(Me=ke[ye],T.format!==Ki)if(Ie!==null)if(it){if(W)if(T.layerUpdates.size>0){const Fe=Cv(Me.width,Me.height,T.format,T.type);for(const Ee of T.layerUpdates){const Ke=Me.data.subarray(Ee*Fe/Me.data.BYTES_PER_ELEMENT,(Ee+1)*Fe/Me.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ye,0,0,Ee,Me.width,Me.height,1,Ie,Ke)}T.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ye,0,0,0,Me.width,Me.height,_e.depth,Ie,Me.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,ye,te,Me.width,Me.height,_e.depth,0,Me.data,0,0);else ct("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else it?W&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,ye,0,0,0,Me.width,Me.height,_e.depth,Ie,Xe,Me.data):t.texImage3D(i.TEXTURE_2D_ARRAY,ye,te,Me.width,Me.height,_e.depth,0,Ie,Xe,Me.data)}else{it&&at&&t.texStorage2D(i.TEXTURE_2D,Pe,te,ke[0].width,ke[0].height);for(let ye=0,De=ke.length;ye<De;ye++)Me=ke[ye],T.format!==Ki?Ie!==null?it?W&&t.compressedTexSubImage2D(i.TEXTURE_2D,ye,0,0,Me.width,Me.height,Ie,Me.data):t.compressedTexImage2D(i.TEXTURE_2D,ye,te,Me.width,Me.height,0,Me.data):ct("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):it?W&&t.texSubImage2D(i.TEXTURE_2D,ye,0,0,Me.width,Me.height,Ie,Xe,Me.data):t.texImage2D(i.TEXTURE_2D,ye,te,Me.width,Me.height,0,Ie,Xe,Me.data)}else if(T.isDataArrayTexture)if(it){if(at&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Pe,te,_e.width,_e.height,_e.depth),W)if(T.layerUpdates.size>0){const ye=Cv(_e.width,_e.height,T.format,T.type);for(const De of T.layerUpdates){const Fe=_e.data.subarray(De*ye/_e.data.BYTES_PER_ELEMENT,(De+1)*ye/_e.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,De,_e.width,_e.height,1,Ie,Xe,Fe)}T.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,_e.width,_e.height,_e.depth,Ie,Xe,_e.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,te,_e.width,_e.height,_e.depth,0,Ie,Xe,_e.data);else if(T.isData3DTexture)it?(at&&t.texStorage3D(i.TEXTURE_3D,Pe,te,_e.width,_e.height,_e.depth),W&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,_e.width,_e.height,_e.depth,Ie,Xe,_e.data)):t.texImage3D(i.TEXTURE_3D,0,te,_e.width,_e.height,_e.depth,0,Ie,Xe,_e.data);else if(T.isFramebufferTexture){if(at)if(it)t.texStorage2D(i.TEXTURE_2D,Pe,te,_e.width,_e.height);else{let ye=_e.width,De=_e.height;for(let Fe=0;Fe<Pe;Fe++)t.texImage2D(i.TEXTURE_2D,Fe,te,ye,De,0,Ie,Xe,null),ye>>=1,De>>=1}}else if(T.isHTMLTexture){if("texElementImage2D"in i){const ye=i.canvas;if(ye.hasAttribute("layoutsubtree")||ye.setAttribute("layoutsubtree","true"),_e.parentNode!==ye){ye.appendChild(_e),g.add(T),ye.onpaint=De=>{const Fe=De.changedElements;for(const Ee of g)Fe.includes(Ee.image)&&(Ee.needsUpdate=!0)},ye.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,_e);else{const Fe=i.RGBA,Ee=i.RGBA,Ke=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,Fe,Ee,Ke,_e)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(ke.length>0){if(it&&at){const ye=de(ke[0]);t.texStorage2D(i.TEXTURE_2D,Pe,te,ye.width,ye.height)}for(let ye=0,De=ke.length;ye<De;ye++)Me=ke[ye],it?W&&t.texSubImage2D(i.TEXTURE_2D,ye,0,0,Ie,Xe,Me):t.texImage2D(i.TEXTURE_2D,ye,te,Ie,Xe,Me);T.generateMipmaps=!1}else if(it){if(at){const ye=de(_e);t.texStorage2D(i.TEXTURE_2D,Pe,te,ye.width,ye.height)}W&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,Ie,Xe,_e)}else t.texImage2D(i.TEXTURE_2D,0,te,Ie,Xe,_e);y(T)&&L(re),Ne.__version=be.version,T.onUpdate&&T.onUpdate(T)}I.__version=T.version}function Je(I,T,Z){if(T.image.length!==6)return;const re=oe(I,T),ge=T.source;t.bindTexture(i.TEXTURE_CUBE_MAP,I.__webglTexture,i.TEXTURE0+Z);const be=r.get(ge);if(ge.version!==be.__version||re===!0){t.activeTexture(i.TEXTURE0+Z);const Ne=Rt.getPrimaries(Rt.workingColorSpace),xe=T.colorSpace===ws?null:Rt.getPrimaries(T.colorSpace),_e=T.colorSpace===ws||Ne===xe?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,T.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,_e);const Ie=T.isCompressedTexture||T.image[0].isCompressedTexture,Xe=T.image[0]&&T.image[0].isDataTexture,te=[];for(let Ee=0;Ee<6;Ee++)!Ie&&!Xe?te[Ee]=_(T.image[Ee],!0,a.maxCubemapSize):te[Ee]=Xe?T.image[Ee].image:T.image[Ee],te[Ee]=un(T,te[Ee]);const Me=te[0],ke=l.convert(T.format,T.colorSpace),it=l.convert(T.type),at=C(T.internalFormat,ke,it,T.normalized,T.colorSpace),W=T.isVideoTexture!==!0,Pe=be.__version===void 0||re===!0,ye=ge.dataReady;let De=N(T,Me);Ve(i.TEXTURE_CUBE_MAP,T);let Fe;if(Ie){W&&Pe&&t.texStorage2D(i.TEXTURE_CUBE_MAP,De,at,Me.width,Me.height);for(let Ee=0;Ee<6;Ee++){Fe=te[Ee].mipmaps;for(let Ke=0;Ke<Fe.length;Ke++){const qe=Fe[Ke];T.format!==Ki?ke!==null?W?ye&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,Ke,0,0,qe.width,qe.height,ke,qe.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,Ke,at,qe.width,qe.height,0,qe.data):ct("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):W?ye&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,Ke,0,0,qe.width,qe.height,ke,it,qe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,Ke,at,qe.width,qe.height,0,ke,it,qe.data)}}}else{if(Fe=T.mipmaps,W&&Pe){Fe.length>0&&De++;const Ee=de(te[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,De,at,Ee.width,Ee.height)}for(let Ee=0;Ee<6;Ee++)if(Xe){W?ye&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,0,0,0,te[Ee].width,te[Ee].height,ke,it,te[Ee].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,0,at,te[Ee].width,te[Ee].height,0,ke,it,te[Ee].data);for(let Ke=0;Ke<Fe.length;Ke++){const Wt=Fe[Ke].image[Ee].image;W?ye&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,Ke+1,0,0,Wt.width,Wt.height,ke,it,Wt.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,Ke+1,at,Wt.width,Wt.height,0,ke,it,Wt.data)}}else{W?ye&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,0,0,0,ke,it,te[Ee]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,0,at,ke,it,te[Ee]);for(let Ke=0;Ke<Fe.length;Ke++){const qe=Fe[Ke];W?ye&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,Ke+1,0,0,ke,it,qe.image[Ee]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,Ke+1,at,ke,it,qe.image[Ee])}}}y(T)&&L(i.TEXTURE_CUBE_MAP),be.__version=ge.version,T.onUpdate&&T.onUpdate(T)}I.__version=T.version}function nt(I,T,Z,re,ge,be){const Ne=l.convert(Z.format,Z.colorSpace),xe=l.convert(Z.type),_e=C(Z.internalFormat,Ne,xe,Z.normalized,Z.colorSpace),Ie=r.get(T),Xe=r.get(Z);if(Xe.__renderTarget=T,!Ie.__hasExternalTextures){const te=Math.max(1,T.width>>be),Me=Math.max(1,T.height>>be);ge===i.TEXTURE_3D||ge===i.TEXTURE_2D_ARRAY?t.texImage3D(ge,be,_e,te,Me,T.depth,0,Ne,xe,null):t.texImage2D(ge,be,_e,te,Me,0,Ne,xe,null)}t.bindFramebuffer(i.FRAMEBUFFER,I),Ft(T)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,re,ge,Xe.__webglTexture,0,wt(T)):(ge===i.TEXTURE_2D||ge>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&ge<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,re,ge,Xe.__webglTexture,be),t.bindFramebuffer(i.FRAMEBUFFER,null)}function Ut(I,T,Z){if(i.bindRenderbuffer(i.RENDERBUFFER,I),T.depthBuffer){const re=T.depthTexture,ge=re&&re.isDepthTexture?re.type:null,be=F(T.stencilBuffer,ge),Ne=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;Ft(T)?d.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,wt(T),be,T.width,T.height):Z?i.renderbufferStorageMultisample(i.RENDERBUFFER,wt(T),be,T.width,T.height):i.renderbufferStorage(i.RENDERBUFFER,be,T.width,T.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Ne,i.RENDERBUFFER,I)}else{const re=T.textures;for(let ge=0;ge<re.length;ge++){const be=re[ge],Ne=l.convert(be.format,be.colorSpace),xe=l.convert(be.type),_e=C(be.internalFormat,Ne,xe,be.normalized,be.colorSpace);Ft(T)?d.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,wt(T),_e,T.width,T.height):Z?i.renderbufferStorageMultisample(i.RENDERBUFFER,wt(T),_e,T.width,T.height):i.renderbufferStorage(i.RENDERBUFFER,_e,T.width,T.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function dt(I,T,Z){const re=T.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,I),!(T.depthTexture&&T.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const ge=r.get(T.depthTexture);if(ge.__renderTarget=T,(!ge.__webglTexture||T.depthTexture.image.width!==T.width||T.depthTexture.image.height!==T.height)&&(T.depthTexture.image.width=T.width,T.depthTexture.image.height=T.height,T.depthTexture.needsUpdate=!0),re){if(ge.__webglInit===void 0&&(ge.__webglInit=!0,T.depthTexture.addEventListener("dispose",O)),ge.__webglTexture===void 0){ge.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,ge.__webglTexture),Ve(i.TEXTURE_CUBE_MAP,T.depthTexture);const Ie=l.convert(T.depthTexture.format),Xe=l.convert(T.depthTexture.type);let te;T.depthTexture.format===qr?te=i.DEPTH_COMPONENT24:T.depthTexture.format===ha&&(te=i.DEPTH24_STENCIL8);for(let Me=0;Me<6;Me++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,te,T.width,T.height,0,Ie,Xe,null)}}else $(T.depthTexture,0);const be=ge.__webglTexture,Ne=wt(T),xe=re?i.TEXTURE_CUBE_MAP_POSITIVE_X+Z:i.TEXTURE_2D,_e=T.depthTexture.format===ha?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(T.depthTexture.format===qr)Ft(T)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,_e,xe,be,0,Ne):i.framebufferTexture2D(i.FRAMEBUFFER,_e,xe,be,0);else if(T.depthTexture.format===ha)Ft(T)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,_e,xe,be,0,Ne):i.framebufferTexture2D(i.FRAMEBUFFER,_e,xe,be,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function Tt(I){const T=r.get(I),Z=I.isWebGLCubeRenderTarget===!0;if(T.__boundDepthTexture!==I.depthTexture){const re=I.depthTexture;if(T.__depthDisposeCallback&&T.__depthDisposeCallback(),re){const ge=()=>{delete T.__boundDepthTexture,delete T.__depthDisposeCallback,re.removeEventListener("dispose",ge)};re.addEventListener("dispose",ge),T.__depthDisposeCallback=ge}T.__boundDepthTexture=re}if(I.depthTexture&&!T.__autoAllocateDepthBuffer)if(Z)for(let re=0;re<6;re++)dt(T.__webglFramebuffer[re],I,re);else{const re=I.texture.mipmaps;re&&re.length>0?dt(T.__webglFramebuffer[0],I,0):dt(T.__webglFramebuffer,I,0)}else if(Z){T.__webglDepthbuffer=[];for(let re=0;re<6;re++)if(t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer[re]),T.__webglDepthbuffer[re]===void 0)T.__webglDepthbuffer[re]=i.createRenderbuffer(),Ut(T.__webglDepthbuffer[re],I,!1);else{const ge=I.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,be=T.__webglDepthbuffer[re];i.bindRenderbuffer(i.RENDERBUFFER,be),i.framebufferRenderbuffer(i.FRAMEBUFFER,ge,i.RENDERBUFFER,be)}}else{const re=I.texture.mipmaps;if(re&&re.length>0?t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer),T.__webglDepthbuffer===void 0)T.__webglDepthbuffer=i.createRenderbuffer(),Ut(T.__webglDepthbuffer,I,!1);else{const ge=I.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,be=T.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,be),i.framebufferRenderbuffer(i.FRAMEBUFFER,ge,i.RENDERBUFFER,be)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function St(I,T,Z){const re=r.get(I);T!==void 0&&nt(re.__webglFramebuffer,I,I.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),Z!==void 0&&Tt(I)}function vt(I){const T=I.texture,Z=r.get(I),re=r.get(T);I.addEventListener("dispose",b);const ge=I.textures,be=I.isWebGLCubeRenderTarget===!0,Ne=ge.length>1;if(Ne||(re.__webglTexture===void 0&&(re.__webglTexture=i.createTexture()),re.__version=T.version,c.memory.textures++),be){Z.__webglFramebuffer=[];for(let xe=0;xe<6;xe++)if(T.mipmaps&&T.mipmaps.length>0){Z.__webglFramebuffer[xe]=[];for(let _e=0;_e<T.mipmaps.length;_e++)Z.__webglFramebuffer[xe][_e]=i.createFramebuffer()}else Z.__webglFramebuffer[xe]=i.createFramebuffer()}else{if(T.mipmaps&&T.mipmaps.length>0){Z.__webglFramebuffer=[];for(let xe=0;xe<T.mipmaps.length;xe++)Z.__webglFramebuffer[xe]=i.createFramebuffer()}else Z.__webglFramebuffer=i.createFramebuffer();if(Ne)for(let xe=0,_e=ge.length;xe<_e;xe++){const Ie=r.get(ge[xe]);Ie.__webglTexture===void 0&&(Ie.__webglTexture=i.createTexture(),c.memory.textures++)}if(I.samples>0&&Ft(I)===!1){Z.__webglMultisampledFramebuffer=i.createFramebuffer(),Z.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,Z.__webglMultisampledFramebuffer);for(let xe=0;xe<ge.length;xe++){const _e=ge[xe];Z.__webglColorRenderbuffer[xe]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,Z.__webglColorRenderbuffer[xe]);const Ie=l.convert(_e.format,_e.colorSpace),Xe=l.convert(_e.type),te=C(_e.internalFormat,Ie,Xe,_e.normalized,_e.colorSpace,I.isXRRenderTarget===!0),Me=wt(I);i.renderbufferStorageMultisample(i.RENDERBUFFER,Me,te,I.width,I.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+xe,i.RENDERBUFFER,Z.__webglColorRenderbuffer[xe])}i.bindRenderbuffer(i.RENDERBUFFER,null),I.depthBuffer&&(Z.__webglDepthRenderbuffer=i.createRenderbuffer(),Ut(Z.__webglDepthRenderbuffer,I,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(be){t.bindTexture(i.TEXTURE_CUBE_MAP,re.__webglTexture),Ve(i.TEXTURE_CUBE_MAP,T);for(let xe=0;xe<6;xe++)if(T.mipmaps&&T.mipmaps.length>0)for(let _e=0;_e<T.mipmaps.length;_e++)nt(Z.__webglFramebuffer[xe][_e],I,T,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+xe,_e);else nt(Z.__webglFramebuffer[xe],I,T,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+xe,0);y(T)&&L(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Ne){for(let xe=0,_e=ge.length;xe<_e;xe++){const Ie=ge[xe],Xe=r.get(Ie);let te=i.TEXTURE_2D;(I.isWebGL3DRenderTarget||I.isWebGLArrayRenderTarget)&&(te=I.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(te,Xe.__webglTexture),Ve(te,Ie),nt(Z.__webglFramebuffer,I,Ie,i.COLOR_ATTACHMENT0+xe,te,0),y(Ie)&&L(te)}t.unbindTexture()}else{let xe=i.TEXTURE_2D;if((I.isWebGL3DRenderTarget||I.isWebGLArrayRenderTarget)&&(xe=I.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(xe,re.__webglTexture),Ve(xe,T),T.mipmaps&&T.mipmaps.length>0)for(let _e=0;_e<T.mipmaps.length;_e++)nt(Z.__webglFramebuffer[_e],I,T,i.COLOR_ATTACHMENT0,xe,_e);else nt(Z.__webglFramebuffer,I,T,i.COLOR_ATTACHMENT0,xe,0);y(T)&&L(xe),t.unbindTexture()}I.depthBuffer&&Tt(I)}function Gt(I){const T=I.textures;for(let Z=0,re=T.length;Z<re;Z++){const ge=T[Z];if(y(ge)){const be=P(I),Ne=r.get(ge).__webglTexture;t.bindTexture(be,Ne),L(be),t.unbindTexture()}}}const $t=[],qt=[];function jt(I){if(I.samples>0){if(Ft(I)===!1){const T=I.textures,Z=I.width,re=I.height;let ge=i.COLOR_BUFFER_BIT;const be=I.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Ne=r.get(I),xe=T.length>1;if(xe)for(let Ie=0;Ie<T.length;Ie++)t.bindFramebuffer(i.FRAMEBUFFER,Ne.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ie,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,Ne.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ie,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,Ne.__webglMultisampledFramebuffer);const _e=I.texture.mipmaps;_e&&_e.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ne.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ne.__webglFramebuffer);for(let Ie=0;Ie<T.length;Ie++){if(I.resolveDepthBuffer&&(I.depthBuffer&&(ge|=i.DEPTH_BUFFER_BIT),I.stencilBuffer&&I.resolveStencilBuffer&&(ge|=i.STENCIL_BUFFER_BIT)),xe){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Ne.__webglColorRenderbuffer[Ie]);const Xe=r.get(T[Ie]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Xe,0)}i.blitFramebuffer(0,0,Z,re,0,0,Z,re,ge,i.NEAREST),h===!0&&($t.length=0,qt.length=0,$t.push(i.COLOR_ATTACHMENT0+Ie),I.depthBuffer&&I.resolveDepthBuffer===!1&&($t.push(be),qt.push(be),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,qt)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,$t))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),xe)for(let Ie=0;Ie<T.length;Ie++){t.bindFramebuffer(i.FRAMEBUFFER,Ne.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ie,i.RENDERBUFFER,Ne.__webglColorRenderbuffer[Ie]);const Xe=r.get(T[Ie]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,Ne.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ie,i.TEXTURE_2D,Xe,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ne.__webglMultisampledFramebuffer)}else if(I.depthBuffer&&I.resolveDepthBuffer===!1&&h){const T=I.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[T])}}}function wt(I){return Math.min(a.maxSamples,I.samples)}function Ft(I){const T=r.get(I);return I.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&T.__useRenderToTexture!==!1}function q(I){const T=c.render.frame;m.get(I)!==T&&(m.set(I,T),I.update())}function un(I,T){const Z=I.colorSpace,re=I.format,ge=I.type;return I.isCompressedTexture===!0||I.isVideoTexture===!0||Z!==ad&&Z!==ws&&(Rt.getTransfer(Z)===Vt?(re!==Ki||ge!==Si)&&ct("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Lt("WebGLTextures: Unsupported texture color space:",Z)),T}function de(I){return typeof HTMLImageElement<"u"&&I instanceof HTMLImageElement?(f.width=I.naturalWidth||I.width,f.height=I.naturalHeight||I.height):typeof VideoFrame<"u"&&I instanceof VideoFrame?(f.width=I.displayWidth,f.height=I.displayHeight):(f.width=I.width,f.height=I.height),f}this.allocateTextureUnit=he,this.resetTextureUnits=ne,this.getTextureUnits=me,this.setTextureUnits=k,this.setTexture2D=$,this.setTexture2DArray=ce,this.setTexture3D=ue,this.setTextureCube=z,this.rebindTextures=St,this.setupRenderTarget=vt,this.updateRenderTargetMipmap=Gt,this.updateMultisampleRenderTarget=jt,this.setupDepthRenderbuffer=Tt,this.setupFrameBufferTexture=nt,this.useMultisampledRTT=Ft,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function zP(i,e){function t(r,a=ws){let l;const c=Rt.getTransfer(a);if(r===Si)return i.UNSIGNED_BYTE;if(r===Pm)return i.UNSIGNED_SHORT_4_4_4_4;if(r===Nm)return i.UNSIGNED_SHORT_5_5_5_1;if(r===ly)return i.UNSIGNED_INT_5_9_9_9_REV;if(r===cy)return i.UNSIGNED_INT_10F_11F_11F_REV;if(r===ay)return i.BYTE;if(r===oy)return i.SHORT;if(r===jl)return i.UNSIGNED_SHORT;if(r===Am)return i.INT;if(r===vr)return i.UNSIGNED_INT;if(r===fr)return i.FLOAT;if(r===$r)return i.HALF_FLOAT;if(r===uy)return i.ALPHA;if(r===dy)return i.RGB;if(r===Ki)return i.RGBA;if(r===qr)return i.DEPTH_COMPONENT;if(r===ha)return i.DEPTH_STENCIL;if(r===hy)return i.RED;if(r===Lm)return i.RED_INTEGER;if(r===Ta)return i.RG;if(r===Dm)return i.RG_INTEGER;if(r===Im)return i.RGBA_INTEGER;if(r===Xu||r===$u||r===qu||r===Yu)if(c===Vt)if(l=e.get("WEBGL_compressed_texture_s3tc_srgb"),l!==null){if(r===Xu)return l.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(r===$u)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(r===qu)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(r===Yu)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(l=e.get("WEBGL_compressed_texture_s3tc"),l!==null){if(r===Xu)return l.COMPRESSED_RGB_S3TC_DXT1_EXT;if(r===$u)return l.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(r===qu)return l.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(r===Yu)return l.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(r===wp||r===bp||r===Tp||r===Cp)if(l=e.get("WEBGL_compressed_texture_pvrtc"),l!==null){if(r===wp)return l.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(r===bp)return l.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(r===Tp)return l.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(r===Cp)return l.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(r===Rp||r===Ap||r===Pp||r===Np||r===Lp||r===id||r===Dp)if(l=e.get("WEBGL_compressed_texture_etc"),l!==null){if(r===Rp||r===Ap)return c===Vt?l.COMPRESSED_SRGB8_ETC2:l.COMPRESSED_RGB8_ETC2;if(r===Pp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:l.COMPRESSED_RGBA8_ETC2_EAC;if(r===Np)return l.COMPRESSED_R11_EAC;if(r===Lp)return l.COMPRESSED_SIGNED_R11_EAC;if(r===id)return l.COMPRESSED_RG11_EAC;if(r===Dp)return l.COMPRESSED_SIGNED_RG11_EAC}else return null;if(r===Ip||r===Up||r===Fp||r===Op||r===kp||r===zp||r===Bp||r===Hp||r===Vp||r===Gp||r===jp||r===Wp||r===Xp||r===$p)if(l=e.get("WEBGL_compressed_texture_astc"),l!==null){if(r===Ip)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:l.COMPRESSED_RGBA_ASTC_4x4_KHR;if(r===Up)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:l.COMPRESSED_RGBA_ASTC_5x4_KHR;if(r===Fp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:l.COMPRESSED_RGBA_ASTC_5x5_KHR;if(r===Op)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:l.COMPRESSED_RGBA_ASTC_6x5_KHR;if(r===kp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:l.COMPRESSED_RGBA_ASTC_6x6_KHR;if(r===zp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:l.COMPRESSED_RGBA_ASTC_8x5_KHR;if(r===Bp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:l.COMPRESSED_RGBA_ASTC_8x6_KHR;if(r===Hp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:l.COMPRESSED_RGBA_ASTC_8x8_KHR;if(r===Vp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:l.COMPRESSED_RGBA_ASTC_10x5_KHR;if(r===Gp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:l.COMPRESSED_RGBA_ASTC_10x6_KHR;if(r===jp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:l.COMPRESSED_RGBA_ASTC_10x8_KHR;if(r===Wp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:l.COMPRESSED_RGBA_ASTC_10x10_KHR;if(r===Xp)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:l.COMPRESSED_RGBA_ASTC_12x10_KHR;if(r===$p)return c===Vt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:l.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(r===qp||r===Yp||r===Kp)if(l=e.get("EXT_texture_compression_bptc"),l!==null){if(r===qp)return c===Vt?l.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:l.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(r===Yp)return l.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(r===Kp)return l.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(r===Qp||r===Zp||r===rd||r===Jp)if(l=e.get("EXT_texture_compression_rgtc"),l!==null){if(r===Qp)return l.COMPRESSED_RED_RGTC1_EXT;if(r===Zp)return l.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(r===rd)return l.COMPRESSED_RED_GREEN_RGTC2_EXT;if(r===Jp)return l.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return r===Wl?i.UNSIGNED_INT_24_8:i[r]!==void 0?i[r]:null}return{convert:t}}const BP=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,HP=`
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

}`;class VP{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const r=new Sy(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=r}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,r=new yr({vertexShader:BP,fragmentShader:HP,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Zi(new vd(20,20),r)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class GP extends ks{constructor(e,t){super();const r=this;let a=null,l=1,c=null,d="local-floor",h=1,f=null,m=null,g=null,x=null,M=null,E=null;const w=typeof XRWebGLBinding<"u",_=new VP,y={},L=t.getContextAttributes();let P=null,C=null;const F=[],N=[],O=new ht;let b=null;const U=new Ii;U.viewport=new cn;const G=new Ii;G.viewport=new cn;const D=[U,G],K=new Zb;let ne=null,me=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(oe){let Se=F[oe];return Se===void 0&&(Se=new yf,F[oe]=Se),Se.getTargetRaySpace()},this.getControllerGrip=function(oe){let Se=F[oe];return Se===void 0&&(Se=new yf,F[oe]=Se),Se.getGripSpace()},this.getHand=function(oe){let Se=F[oe];return Se===void 0&&(Se=new yf,F[oe]=Se),Se.getHandSpace()};function k(oe){const Se=N.indexOf(oe.inputSource);if(Se===-1)return;const ve=F[Se];ve!==void 0&&(ve.update(oe.inputSource,oe.frame,f||c),ve.dispatchEvent({type:oe.type,data:oe.inputSource}))}function he(){a.removeEventListener("select",k),a.removeEventListener("selectstart",k),a.removeEventListener("selectend",k),a.removeEventListener("squeeze",k),a.removeEventListener("squeezestart",k),a.removeEventListener("squeezeend",k),a.removeEventListener("end",he),a.removeEventListener("inputsourceschange",J);for(let oe=0;oe<F.length;oe++){const Se=N[oe];Se!==null&&(N[oe]=null,F[oe].disconnect(Se))}ne=null,me=null,_.reset();for(const oe in y)delete y[oe];e.setRenderTarget(P),M=null,x=null,g=null,a=null,C=null,Ve.stop(),r.isPresenting=!1,e.setPixelRatio(b),e.setSize(O.width,O.height,!1),r.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(oe){l=oe,r.isPresenting===!0&&ct("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(oe){d=oe,r.isPresenting===!0&&ct("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return f||c},this.setReferenceSpace=function(oe){f=oe},this.getBaseLayer=function(){return x!==null?x:M},this.getBinding=function(){return g===null&&w&&(g=new XRWebGLBinding(a,t)),g},this.getFrame=function(){return E},this.getSession=function(){return a},this.setSession=async function(oe){if(a=oe,a!==null){if(P=e.getRenderTarget(),a.addEventListener("select",k),a.addEventListener("selectstart",k),a.addEventListener("selectend",k),a.addEventListener("squeeze",k),a.addEventListener("squeezestart",k),a.addEventListener("squeezeend",k),a.addEventListener("end",he),a.addEventListener("inputsourceschange",J),L.xrCompatible!==!0&&await t.makeXRCompatible(),b=e.getPixelRatio(),e.getSize(O),w&&"createProjectionLayer"in XRWebGLBinding.prototype){let ve=null,Oe=null,Je=null;L.depth&&(Je=L.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ve=L.stencil?ha:qr,Oe=L.stencil?Wl:vr);const nt={colorFormat:t.RGBA8,depthFormat:Je,scaleFactor:l};g=this.getBinding(),x=g.createProjectionLayer(nt),a.updateRenderState({layers:[x]}),e.setPixelRatio(1),e.setSize(x.textureWidth,x.textureHeight,!1),C=new gr(x.textureWidth,x.textureHeight,{format:Ki,type:Si,depthTexture:new Uo(x.textureWidth,x.textureHeight,Oe,void 0,void 0,void 0,void 0,void 0,void 0,ve),stencilBuffer:L.stencil,colorSpace:e.outputColorSpace,samples:L.antialias?4:0,resolveDepthBuffer:x.ignoreDepthValues===!1,resolveStencilBuffer:x.ignoreDepthValues===!1})}else{const ve={antialias:L.antialias,alpha:!0,depth:L.depth,stencil:L.stencil,framebufferScaleFactor:l};M=new XRWebGLLayer(a,t,ve),a.updateRenderState({baseLayer:M}),e.setPixelRatio(1),e.setSize(M.framebufferWidth,M.framebufferHeight,!1),C=new gr(M.framebufferWidth,M.framebufferHeight,{format:Ki,type:Si,colorSpace:e.outputColorSpace,stencilBuffer:L.stencil,resolveDepthBuffer:M.ignoreDepthValues===!1,resolveStencilBuffer:M.ignoreDepthValues===!1})}C.isXRRenderTarget=!0,this.setFoveation(h),f=null,c=await a.requestReferenceSpace(d),Ve.setContext(a),Ve.start(),r.isPresenting=!0,r.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(a!==null)return a.environmentBlendMode},this.getDepthTexture=function(){return _.getDepthTexture()};function J(oe){for(let Se=0;Se<oe.removed.length;Se++){const ve=oe.removed[Se],Oe=N.indexOf(ve);Oe>=0&&(N[Oe]=null,F[Oe].disconnect(ve))}for(let Se=0;Se<oe.added.length;Se++){const ve=oe.added[Se];let Oe=N.indexOf(ve);if(Oe===-1){for(let nt=0;nt<F.length;nt++)if(nt>=N.length){N.push(ve),Oe=nt;break}else if(N[nt]===null){N[nt]=ve,Oe=nt;break}if(Oe===-1)break}const Je=F[Oe];Je&&Je.connect(ve)}}const $=new ee,ce=new ee;function ue(oe,Se,ve){$.setFromMatrixPosition(Se.matrixWorld),ce.setFromMatrixPosition(ve.matrixWorld);const Oe=$.distanceTo(ce),Je=Se.projectionMatrix.elements,nt=ve.projectionMatrix.elements,Ut=Je[14]/(Je[10]-1),dt=Je[14]/(Je[10]+1),Tt=(Je[9]+1)/Je[5],St=(Je[9]-1)/Je[5],vt=(Je[8]-1)/Je[0],Gt=(nt[8]+1)/nt[0],$t=Ut*vt,qt=Ut*Gt,jt=Oe/(-vt+Gt),wt=jt*-vt;if(Se.matrixWorld.decompose(oe.position,oe.quaternion,oe.scale),oe.translateX(wt),oe.translateZ(jt),oe.matrixWorld.compose(oe.position,oe.quaternion,oe.scale),oe.matrixWorldInverse.copy(oe.matrixWorld).invert(),Je[10]===-1)oe.projectionMatrix.copy(Se.projectionMatrix),oe.projectionMatrixInverse.copy(Se.projectionMatrixInverse);else{const Ft=Ut+jt,q=dt+jt,un=$t-wt,de=qt+(Oe-wt),I=Tt*dt/q*Ft,T=St*dt/q*Ft;oe.projectionMatrix.makePerspective(un,de,I,T,Ft,q),oe.projectionMatrixInverse.copy(oe.projectionMatrix).invert()}}function z(oe,Se){Se===null?oe.matrixWorld.copy(oe.matrix):oe.matrixWorld.multiplyMatrices(Se.matrixWorld,oe.matrix),oe.matrixWorldInverse.copy(oe.matrixWorld).invert()}this.updateCamera=function(oe){if(a===null)return;let Se=oe.near,ve=oe.far;_.texture!==null&&(_.depthNear>0&&(Se=_.depthNear),_.depthFar>0&&(ve=_.depthFar)),K.near=G.near=U.near=Se,K.far=G.far=U.far=ve,(ne!==K.near||me!==K.far)&&(a.updateRenderState({depthNear:K.near,depthFar:K.far}),ne=K.near,me=K.far),K.layers.mask=oe.layers.mask|6,U.layers.mask=K.layers.mask&-5,G.layers.mask=K.layers.mask&-3;const Oe=oe.parent,Je=K.cameras;z(K,Oe);for(let nt=0;nt<Je.length;nt++)z(Je[nt],Oe);Je.length===2?ue(K,U,G):K.projectionMatrix.copy(U.projectionMatrix),X(oe,K,Oe)};function X(oe,Se,ve){ve===null?oe.matrix.copy(Se.matrixWorld):(oe.matrix.copy(ve.matrixWorld),oe.matrix.invert(),oe.matrix.multiply(Se.matrixWorld)),oe.matrix.decompose(oe.position,oe.quaternion,oe.scale),oe.updateMatrixWorld(!0),oe.projectionMatrix.copy(Se.projectionMatrix),oe.projectionMatrixInverse.copy(Se.projectionMatrixInverse),oe.isPerspectiveCamera&&(oe.fov=em*2*Math.atan(1/oe.projectionMatrix.elements[5]),oe.zoom=1)}this.getCamera=function(){return K},this.getFoveation=function(){if(!(x===null&&M===null))return h},this.setFoveation=function(oe){h=oe,x!==null&&(x.fixedFoveation=oe),M!==null&&M.fixedFoveation!==void 0&&(M.fixedFoveation=oe)},this.hasDepthSensing=function(){return _.texture!==null},this.getDepthSensingMesh=function(){return _.getMesh(K)},this.getCameraTexture=function(oe){return y[oe]};let Ue=null;function He(oe,Se){if(m=Se.getViewerPose(f||c),E=Se,m!==null){const ve=m.views;M!==null&&(e.setRenderTargetFramebuffer(C,M.framebuffer),e.setRenderTarget(C));let Oe=!1;ve.length!==K.cameras.length&&(K.cameras.length=0,Oe=!0);for(let dt=0;dt<ve.length;dt++){const Tt=ve[dt];let St=null;if(M!==null)St=M.getViewport(Tt);else{const Gt=g.getViewSubImage(x,Tt);St=Gt.viewport,dt===0&&(e.setRenderTargetTextures(C,Gt.colorTexture,Gt.depthStencilTexture),e.setRenderTarget(C))}let vt=D[dt];vt===void 0&&(vt=new Ii,vt.layers.enable(dt),vt.viewport=new cn,D[dt]=vt),vt.matrix.fromArray(Tt.transform.matrix),vt.matrix.decompose(vt.position,vt.quaternion,vt.scale),vt.projectionMatrix.fromArray(Tt.projectionMatrix),vt.projectionMatrixInverse.copy(vt.projectionMatrix).invert(),vt.viewport.set(St.x,St.y,St.width,St.height),dt===0&&(K.matrix.copy(vt.matrix),K.matrix.decompose(K.position,K.quaternion,K.scale)),Oe===!0&&K.cameras.push(vt)}const Je=a.enabledFeatures;if(Je&&Je.includes("depth-sensing")&&a.depthUsage=="gpu-optimized"&&w){g=r.getBinding();const dt=g.getDepthInformation(ve[0]);dt&&dt.isValid&&dt.texture&&_.init(dt,a.renderState)}if(Je&&Je.includes("camera-access")&&w){e.state.unbindTexture(),g=r.getBinding();for(let dt=0;dt<ve.length;dt++){const Tt=ve[dt].camera;if(Tt){let St=y[Tt];St||(St=new Sy,y[Tt]=St);const vt=g.getCameraImage(Tt);St.sourceTexture=vt}}}}for(let ve=0;ve<F.length;ve++){const Oe=N[ve],Je=F[ve];Oe!==null&&Je!==void 0&&Je.update(Oe,Se,f||c)}Ue&&Ue(oe,Se),Se.detectedPlanes&&r.dispatchEvent({type:"planesdetected",data:Se}),E=null}const Ve=new wy;Ve.setAnimationLoop(He),this.setAnimationLoop=function(oe){Ue=oe},this.dispose=function(){}}}const jP=new sn,Ny=new mt;Ny.set(-1,0,0,0,1,0,0,0,1);function WP(i,e){function t(_,y){_.matrixAutoUpdate===!0&&_.updateMatrix(),y.value.copy(_.matrix)}function r(_,y){y.color.getRGB(_.fogColor.value,My(i)),y.isFog?(_.fogNear.value=y.near,_.fogFar.value=y.far):y.isFogExp2&&(_.fogDensity.value=y.density)}function a(_,y,L,P,C){y.isNodeMaterial?y.uniformsNeedUpdate=!1:y.isMeshBasicMaterial?l(_,y):y.isMeshLambertMaterial?(l(_,y),y.envMap&&(_.envMapIntensity.value=y.envMapIntensity)):y.isMeshToonMaterial?(l(_,y),g(_,y)):y.isMeshPhongMaterial?(l(_,y),m(_,y),y.envMap&&(_.envMapIntensity.value=y.envMapIntensity)):y.isMeshStandardMaterial?(l(_,y),x(_,y),y.isMeshPhysicalMaterial&&M(_,y,C)):y.isMeshMatcapMaterial?(l(_,y),E(_,y)):y.isMeshDepthMaterial?l(_,y):y.isMeshDistanceMaterial?(l(_,y),w(_,y)):y.isMeshNormalMaterial?l(_,y):y.isLineBasicMaterial?(c(_,y),y.isLineDashedMaterial&&d(_,y)):y.isPointsMaterial?h(_,y,L,P):y.isSpriteMaterial?f(_,y):y.isShadowMaterial?(_.color.value.copy(y.color),_.opacity.value=y.opacity):y.isShaderMaterial&&(y.uniformsNeedUpdate=!1)}function l(_,y){_.opacity.value=y.opacity,y.color&&_.diffuse.value.copy(y.color),y.emissive&&_.emissive.value.copy(y.emissive).multiplyScalar(y.emissiveIntensity),y.map&&(_.map.value=y.map,t(y.map,_.mapTransform)),y.alphaMap&&(_.alphaMap.value=y.alphaMap,t(y.alphaMap,_.alphaMapTransform)),y.bumpMap&&(_.bumpMap.value=y.bumpMap,t(y.bumpMap,_.bumpMapTransform),_.bumpScale.value=y.bumpScale,y.side===hi&&(_.bumpScale.value*=-1)),y.normalMap&&(_.normalMap.value=y.normalMap,t(y.normalMap,_.normalMapTransform),_.normalScale.value.copy(y.normalScale),y.side===hi&&_.normalScale.value.negate()),y.displacementMap&&(_.displacementMap.value=y.displacementMap,t(y.displacementMap,_.displacementMapTransform),_.displacementScale.value=y.displacementScale,_.displacementBias.value=y.displacementBias),y.emissiveMap&&(_.emissiveMap.value=y.emissiveMap,t(y.emissiveMap,_.emissiveMapTransform)),y.specularMap&&(_.specularMap.value=y.specularMap,t(y.specularMap,_.specularMapTransform)),y.alphaTest>0&&(_.alphaTest.value=y.alphaTest);const L=e.get(y),P=L.envMap,C=L.envMapRotation;P&&(_.envMap.value=P,_.envMapRotation.value.setFromMatrix4(jP.makeRotationFromEuler(C)).transpose(),P.isCubeTexture&&P.isRenderTargetTexture===!1&&_.envMapRotation.value.premultiply(Ny),_.reflectivity.value=y.reflectivity,_.ior.value=y.ior,_.refractionRatio.value=y.refractionRatio),y.lightMap&&(_.lightMap.value=y.lightMap,_.lightMapIntensity.value=y.lightMapIntensity,t(y.lightMap,_.lightMapTransform)),y.aoMap&&(_.aoMap.value=y.aoMap,_.aoMapIntensity.value=y.aoMapIntensity,t(y.aoMap,_.aoMapTransform))}function c(_,y){_.diffuse.value.copy(y.color),_.opacity.value=y.opacity,y.map&&(_.map.value=y.map,t(y.map,_.mapTransform))}function d(_,y){_.dashSize.value=y.dashSize,_.totalSize.value=y.dashSize+y.gapSize,_.scale.value=y.scale}function h(_,y,L,P){_.diffuse.value.copy(y.color),_.opacity.value=y.opacity,_.size.value=y.size*L,_.scale.value=P*.5,y.map&&(_.map.value=y.map,t(y.map,_.uvTransform)),y.alphaMap&&(_.alphaMap.value=y.alphaMap,t(y.alphaMap,_.alphaMapTransform)),y.alphaTest>0&&(_.alphaTest.value=y.alphaTest)}function f(_,y){_.diffuse.value.copy(y.color),_.opacity.value=y.opacity,_.rotation.value=y.rotation,y.map&&(_.map.value=y.map,t(y.map,_.mapTransform)),y.alphaMap&&(_.alphaMap.value=y.alphaMap,t(y.alphaMap,_.alphaMapTransform)),y.alphaTest>0&&(_.alphaTest.value=y.alphaTest)}function m(_,y){_.specular.value.copy(y.specular),_.shininess.value=Math.max(y.shininess,1e-4)}function g(_,y){y.gradientMap&&(_.gradientMap.value=y.gradientMap)}function x(_,y){_.metalness.value=y.metalness,y.metalnessMap&&(_.metalnessMap.value=y.metalnessMap,t(y.metalnessMap,_.metalnessMapTransform)),_.roughness.value=y.roughness,y.roughnessMap&&(_.roughnessMap.value=y.roughnessMap,t(y.roughnessMap,_.roughnessMapTransform)),y.envMap&&(_.envMapIntensity.value=y.envMapIntensity)}function M(_,y,L){_.ior.value=y.ior,y.sheen>0&&(_.sheenColor.value.copy(y.sheenColor).multiplyScalar(y.sheen),_.sheenRoughness.value=y.sheenRoughness,y.sheenColorMap&&(_.sheenColorMap.value=y.sheenColorMap,t(y.sheenColorMap,_.sheenColorMapTransform)),y.sheenRoughnessMap&&(_.sheenRoughnessMap.value=y.sheenRoughnessMap,t(y.sheenRoughnessMap,_.sheenRoughnessMapTransform))),y.clearcoat>0&&(_.clearcoat.value=y.clearcoat,_.clearcoatRoughness.value=y.clearcoatRoughness,y.clearcoatMap&&(_.clearcoatMap.value=y.clearcoatMap,t(y.clearcoatMap,_.clearcoatMapTransform)),y.clearcoatRoughnessMap&&(_.clearcoatRoughnessMap.value=y.clearcoatRoughnessMap,t(y.clearcoatRoughnessMap,_.clearcoatRoughnessMapTransform)),y.clearcoatNormalMap&&(_.clearcoatNormalMap.value=y.clearcoatNormalMap,t(y.clearcoatNormalMap,_.clearcoatNormalMapTransform),_.clearcoatNormalScale.value.copy(y.clearcoatNormalScale),y.side===hi&&_.clearcoatNormalScale.value.negate())),y.dispersion>0&&(_.dispersion.value=y.dispersion),y.iridescence>0&&(_.iridescence.value=y.iridescence,_.iridescenceIOR.value=y.iridescenceIOR,_.iridescenceThicknessMinimum.value=y.iridescenceThicknessRange[0],_.iridescenceThicknessMaximum.value=y.iridescenceThicknessRange[1],y.iridescenceMap&&(_.iridescenceMap.value=y.iridescenceMap,t(y.iridescenceMap,_.iridescenceMapTransform)),y.iridescenceThicknessMap&&(_.iridescenceThicknessMap.value=y.iridescenceThicknessMap,t(y.iridescenceThicknessMap,_.iridescenceThicknessMapTransform))),y.transmission>0&&(_.transmission.value=y.transmission,_.transmissionSamplerMap.value=L.texture,_.transmissionSamplerSize.value.set(L.width,L.height),y.transmissionMap&&(_.transmissionMap.value=y.transmissionMap,t(y.transmissionMap,_.transmissionMapTransform)),_.thickness.value=y.thickness,y.thicknessMap&&(_.thicknessMap.value=y.thicknessMap,t(y.thicknessMap,_.thicknessMapTransform)),_.attenuationDistance.value=y.attenuationDistance,_.attenuationColor.value.copy(y.attenuationColor)),y.anisotropy>0&&(_.anisotropyVector.value.set(y.anisotropy*Math.cos(y.anisotropyRotation),y.anisotropy*Math.sin(y.anisotropyRotation)),y.anisotropyMap&&(_.anisotropyMap.value=y.anisotropyMap,t(y.anisotropyMap,_.anisotropyMapTransform))),_.specularIntensity.value=y.specularIntensity,_.specularColor.value.copy(y.specularColor),y.specularColorMap&&(_.specularColorMap.value=y.specularColorMap,t(y.specularColorMap,_.specularColorMapTransform)),y.specularIntensityMap&&(_.specularIntensityMap.value=y.specularIntensityMap,t(y.specularIntensityMap,_.specularIntensityMapTransform))}function E(_,y){y.matcap&&(_.matcap.value=y.matcap)}function w(_,y){const L=e.get(y).light;_.referencePosition.value.setFromMatrixPosition(L.matrixWorld),_.nearDistance.value=L.shadow.camera.near,_.farDistance.value=L.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:a}}function XP(i,e,t,r){let a={},l={},c=[];const d=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function h(C,F){const N=F.program;r.uniformBlockBinding(C,N)}function f(C,F){let N=a[C.id];N===void 0&&(_(C),N=m(C),a[C.id]=N,C.addEventListener("dispose",L));const O=F.program;r.updateUBOMapping(C,O);const b=e.render.frame;l[C.id]!==b&&(x(C),l[C.id]=b)}function m(C){const F=g();C.__bindingPointIndex=F;const N=i.createBuffer(),O=C.__size,b=C.usage;return i.bindBuffer(i.UNIFORM_BUFFER,N),i.bufferData(i.UNIFORM_BUFFER,O,b),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,F,N),N}function g(){for(let C=0;C<d;C++)if(c.indexOf(C)===-1)return c.push(C),C;return Lt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function x(C){const F=a[C.id],N=C.uniforms,O=C.__cache;i.bindBuffer(i.UNIFORM_BUFFER,F);for(let b=0,U=N.length;b<U;b++){const G=N[b];if(Array.isArray(G))for(let D=0,K=G.length;D<K;D++)M(G[D],b,D,O);else M(G,b,0,O)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function M(C,F,N,O){if(w(C,F,N,O)===!0){const b=C.__offset,U=C.value;if(Array.isArray(U)){let G=0;for(let D=0;D<U.length;D++){const K=U[D],ne=y(K);E(K,C.__data,G),typeof K!="number"&&typeof K!="boolean"&&!K.isMatrix3&&!ArrayBuffer.isView(K)&&(G+=ne.storage/Float32Array.BYTES_PER_ELEMENT)}}else E(U,C.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,b,C.__data)}}function E(C,F,N){typeof C=="number"||typeof C=="boolean"?F[0]=C:C.isMatrix3?(F[0]=C.elements[0],F[1]=C.elements[1],F[2]=C.elements[2],F[3]=0,F[4]=C.elements[3],F[5]=C.elements[4],F[6]=C.elements[5],F[7]=0,F[8]=C.elements[6],F[9]=C.elements[7],F[10]=C.elements[8],F[11]=0):ArrayBuffer.isView(C)?F.set(new C.constructor(C.buffer,C.byteOffset,F.length)):C.toArray(F,N)}function w(C,F,N,O){const b=C.value,U=F+"_"+N;if(O[U]===void 0)return typeof b=="number"||typeof b=="boolean"?O[U]=b:ArrayBuffer.isView(b)?O[U]=b.slice():O[U]=b.clone(),!0;{const G=O[U];if(typeof b=="number"||typeof b=="boolean"){if(G!==b)return O[U]=b,!0}else{if(ArrayBuffer.isView(b))return!0;if(G.equals(b)===!1)return G.copy(b),!0}}return!1}function _(C){const F=C.uniforms;let N=0;const O=16;for(let U=0,G=F.length;U<G;U++){const D=Array.isArray(F[U])?F[U]:[F[U]];for(let K=0,ne=D.length;K<ne;K++){const me=D[K],k=Array.isArray(me.value)?me.value:[me.value];for(let he=0,J=k.length;he<J;he++){const $=k[he],ce=y($),ue=N%O,z=ue%ce.boundary,X=ue+z;N+=z,X!==0&&O-X<ce.storage&&(N+=O-X),me.__data=new Float32Array(ce.storage/Float32Array.BYTES_PER_ELEMENT),me.__offset=N,N+=ce.storage}}}const b=N%O;return b>0&&(N+=O-b),C.__size=N,C.__cache={},this}function y(C){const F={boundary:0,storage:0};return typeof C=="number"||typeof C=="boolean"?(F.boundary=4,F.storage=4):C.isVector2?(F.boundary=8,F.storage=8):C.isVector3||C.isColor?(F.boundary=16,F.storage=12):C.isVector4?(F.boundary=16,F.storage=16):C.isMatrix3?(F.boundary=48,F.storage=48):C.isMatrix4?(F.boundary=64,F.storage=64):C.isTexture?ct("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(C)?(F.boundary=16,F.storage=C.byteLength):ct("WebGLRenderer: Unsupported uniform value type.",C),F}function L(C){const F=C.target;F.removeEventListener("dispose",L);const N=c.indexOf(F.__bindingPointIndex);c.splice(N,1),i.deleteBuffer(a[F.id]),delete a[F.id],delete l[F.id]}function P(){for(const C in a)i.deleteBuffer(a[C]);c=[],a={},l={}}return{bind:h,update:f,dispose:P}}const $P=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let or=null;function qP(){return or===null&&(or=new Cb($P,16,16,Ta,$r),or.name="DFG_LUT",or.minFilter=Wn,or.magFilter=Wn,or.wrapS=Vr,or.wrapT=Vr,or.generateMipmaps=!1,or.needsUpdate=!0),or}class YP{constructor(e={}){const{canvas:t=ib(),context:r=null,depth:a=!0,stencil:l=!1,alpha:c=!1,antialias:d=!1,premultipliedAlpha:h=!0,preserveDrawingBuffer:f=!1,powerPreference:m="default",failIfMajorPerformanceCaveat:g=!1,reversedDepthBuffer:x=!1,outputBufferType:M=Si}=e;this.isWebGLRenderer=!0;let E;if(r!==null){if(typeof WebGLRenderingContext<"u"&&r instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");E=r.getContextAttributes().alpha}else E=c;const w=M,_=new Set([Im,Dm,Lm]),y=new Set([Si,vr,jl,Wl,Pm,Nm]),L=new Uint32Array(4),P=new Int32Array(4),C=new ee;let F=null,N=null;const O=[],b=[];let U=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=mr,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const G=this;let D=!1,K=null,ne=null,me=null,k=null;this._outputColorSpace=Jn;let he=0,J=0,$=null,ce=-1,ue=null;const z=new cn,X=new cn;let Ue=null;const He=new xt(0);let Ve=0,oe=t.width,Se=t.height,ve=1,Oe=null,Je=null;const nt=new cn(0,0,oe,Se),Ut=new cn(0,0,oe,Se);let dt=!1;const Tt=new km;let St=!1,vt=!1;const Gt=new sn,$t=new ee,qt=new cn,jt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let wt=!1;function Ft(){return $===null?ve:1}let q=r;function un(A,Q){return t.getContext(A,Q)}try{const A={alpha:!0,depth:a,stencil:l,antialias:d,premultipliedAlpha:h,preserveDrawingBuffer:f,powerPreference:m,failIfMajorPerformanceCaveat:g};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Tm}`),t.addEventListener("webglcontextlost",Wt,!1),t.addEventListener("webglcontextrestored",Ot,!1),t.addEventListener("webglcontextcreationerror",On,!1),q===null){const Q="webgl2";if(q=un(Q,A),q===null)throw un(Q)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(A){throw Lt("WebGLRenderer: "+A.message),A}let de,I,T,Z,re,ge,be,Ne,xe,_e,Ie,Xe,te,Me,ke,it,at,W,Pe,ye,De,Fe,Ee;function Ke(){de=new qR(q),de.init(),De=new zP(q,de),I=new BR(q,de,e,De),T=new OP(q,de),I.reversedDepthBuffer&&x&&T.buffers.depth.setReversed(!0),ne=q.createFramebuffer(),me=q.createFramebuffer(),k=q.createFramebuffer(),Z=new QR(q),re=new EP,ge=new kP(q,de,T,re,I,De,Z),be=new $R(G),Ne=new tT(q),Fe=new kR(q,Ne),xe=new YR(q,Ne,Z,Fe),_e=new JR(q,xe,Ne,Fe,Z),W=new ZR(q,I,ge),ke=new HR(re),Ie=new MP(G,be,de,I,Fe,ke),Xe=new WP(G,re),te=new bP,Me=new NP(de),at=new OR(G,be,T,_e,E,h),it=new FP(G,_e,I),Ee=new XP(q,Z,I,T),Pe=new zR(q,de,Z),ye=new KR(q,de,Z),Z.programs=Ie.programs,G.capabilities=I,G.extensions=de,G.properties=re,G.renderLists=te,G.shadowMap=it,G.state=T,G.info=Z}Ke(),w!==Si&&(U=new tA(w,t.width,t.height,d,a,l));const qe=new GP(G,q);this.xr=qe,this.getContext=function(){return q},this.getContextAttributes=function(){return q.getContextAttributes()},this.forceContextLoss=function(){const A=de.get("WEBGL_lose_context");A&&A.loseContext()},this.forceContextRestore=function(){const A=de.get("WEBGL_lose_context");A&&A.restoreContext()},this.getPixelRatio=function(){return ve},this.setPixelRatio=function(A){A!==void 0&&(ve=A,this.setSize(oe,Se,!1))},this.getSize=function(A){return A.set(oe,Se)},this.setSize=function(A,Q,fe=!0){if(qe.isPresenting){ct("WebGLRenderer: Can't change size while VR device is presenting.");return}oe=A,Se=Q,t.width=Math.floor(A*ve),t.height=Math.floor(Q*ve),fe===!0&&(t.style.width=A+"px",t.style.height=Q+"px"),U!==null&&U.setSize(t.width,t.height),this.setViewport(0,0,A,Q)},this.getDrawingBufferSize=function(A){return A.set(oe*ve,Se*ve).floor()},this.setDrawingBufferSize=function(A,Q,fe){oe=A,Se=Q,ve=fe,t.width=Math.floor(A*fe),t.height=Math.floor(Q*fe),this.setViewport(0,0,A,Q)},this.setEffects=function(A){if(w===Si){Lt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(A){for(let Q=0;Q<A.length;Q++)if(A[Q].isOutputPass===!0){ct("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}U.setEffects(A||[])},this.getCurrentViewport=function(A){return A.copy(z)},this.getViewport=function(A){return A.copy(nt)},this.setViewport=function(A,Q,fe,ae){A.isVector4?nt.set(A.x,A.y,A.z,A.w):nt.set(A,Q,fe,ae),T.viewport(z.copy(nt).multiplyScalar(ve).round())},this.getScissor=function(A){return A.copy(Ut)},this.setScissor=function(A,Q,fe,ae){A.isVector4?Ut.set(A.x,A.y,A.z,A.w):Ut.set(A,Q,fe,ae),T.scissor(X.copy(Ut).multiplyScalar(ve).round())},this.getScissorTest=function(){return dt},this.setScissorTest=function(A){T.setScissorTest(dt=A)},this.setOpaqueSort=function(A){Oe=A},this.setTransparentSort=function(A){Je=A},this.getClearColor=function(A){return A.copy(at.getClearColor())},this.setClearColor=function(){at.setClearColor(...arguments)},this.getClearAlpha=function(){return at.getClearAlpha()},this.setClearAlpha=function(){at.setClearAlpha(...arguments)},this.clear=function(A=!0,Q=!0,fe=!0){let ae=0;if(A){let se=!1;if($!==null){const Le=$.texture.format;se=_.has(Le)}if(se){const Le=$.texture.type,We=y.has(Le),Ae=at.getClearColor(),Qe=at.getClearAlpha(),rt=Ae.r,ft=Ae.g,pt=Ae.b;We?(L[0]=rt,L[1]=ft,L[2]=pt,L[3]=Qe,q.clearBufferuiv(q.COLOR,0,L)):(P[0]=rt,P[1]=ft,P[2]=pt,P[3]=Qe,q.clearBufferiv(q.COLOR,0,P))}else ae|=q.COLOR_BUFFER_BIT}Q&&(ae|=q.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),fe&&(ae|=q.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),ae!==0&&q.clear(ae)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(A){A.setRenderer(this),K=A},this.dispose=function(){t.removeEventListener("webglcontextlost",Wt,!1),t.removeEventListener("webglcontextrestored",Ot,!1),t.removeEventListener("webglcontextcreationerror",On,!1),at.dispose(),te.dispose(),Me.dispose(),re.dispose(),be.dispose(),_e.dispose(),Fe.dispose(),Ee.dispose(),Ie.dispose(),qe.dispose(),qe.removeEventListener("sessionstart",sc),qe.removeEventListener("sessionend",ac),$n.stop()};function Wt(A){A.preventDefault(),Qx("WebGLRenderer: Context Lost."),D=!0}function Ot(){Qx("WebGLRenderer: Context Restored."),D=!1;const A=Z.autoReset,Q=it.enabled,fe=it.autoUpdate,ae=it.needsUpdate,se=it.type;Ke(),Z.autoReset=A,it.enabled=Q,it.autoUpdate=fe,it.needsUpdate=ae,it.type=se}function On(A){Lt("WebGLRenderer: A WebGL context could not be created. Reason: ",A.statusMessage)}function wi(A){const Q=A.target;Q.removeEventListener("dispose",wi),zs(Q)}function zs(A){Ca(A),re.remove(A)}function Ca(A){const Q=re.get(A).programs;Q!==void 0&&(Q.forEach(function(fe){Ie.releaseProgram(fe)}),A.isShaderMaterial&&Ie.releaseShaderCache(A))}this.renderBufferDirect=function(A,Q,fe,ae,se,Le){Q===null&&(Q=jt);const We=se.isMesh&&se.matrixWorld.determinantAffine()<0,Ae=an(A,Q,fe,ae,se);T.setMaterial(ae,We);let Qe=fe.index,rt=1;if(ae.wireframe===!0){if(Qe=xe.getWireframeAttribute(fe),Qe===void 0)return;rt=2}const ft=fe.drawRange,pt=fe.attributes.position;let et=ft.start*rt,At=(ft.start+ft.count)*rt;Le!==null&&(et=Math.max(et,Le.start*rt),At=Math.min(At,(Le.start+Le.count)*rt)),Qe!==null?(et=Math.max(et,0),At=Math.min(At,Qe.count)):pt!=null&&(et=Math.max(et,0),At=Math.min(At,pt.count));const Yt=At-et;if(Yt<0||Yt===1/0)return;Fe.setup(se,ae,Ae,fe,Qe);let en,Bt=Pe;if(Qe!==null&&(en=Ne.get(Qe),Bt=ye,Bt.setIndex(en)),se.isMesh)ae.wireframe===!0?(T.setLineWidth(ae.wireframeLinewidth*Ft()),Bt.setMode(q.LINES)):Bt.setMode(q.TRIANGLES);else if(se.isLine){let gn=ae.linewidth;gn===void 0&&(gn=1),T.setLineWidth(gn*Ft()),se.isLineSegments?Bt.setMode(q.LINES):se.isLineLoop?Bt.setMode(q.LINE_LOOP):Bt.setMode(q.LINE_STRIP)}else se.isPoints?Bt.setMode(q.POINTS):se.isSprite&&Bt.setMode(q.TRIANGLES);if(se.isBatchedMesh)if(de.get("WEBGL_multi_draw"))Bt.renderMultiDraw(se._multiDrawStarts,se._multiDrawCounts,se._multiDrawCount);else{const gn=se._multiDrawStarts,Ge=se._multiDrawCounts,Ln=se._multiDrawCount,yt=Qe?Ne.get(Qe).bytesPerElement:1,ei=re.get(ae).currentProgram.getUniforms();for(let ti=0;ti<Ln;ti++)ei.setValue(q,"_gl_DrawID",ti),Bt.render(gn[ti]/yt,Ge[ti])}else if(se.isInstancedMesh)Bt.renderInstances(et,Yt,se.count);else if(fe.isInstancedBufferGeometry){const gn=fe._maxInstanceCount!==void 0?fe._maxInstanceCount:1/0,Ge=Math.min(fe.instanceCount,gn);Bt.renderInstances(et,Yt,Ge)}else Bt.render(et,Yt)};function Bs(A,Q,fe){A.transparent===!0&&A.side===hr&&A.forceSinglePass===!1?(A.side=hi,A.needsUpdate=!0,Gs(A,Q,fe),A.side=Fs,A.needsUpdate=!0,Gs(A,Q,fe),A.side=hr):Gs(A,Q,fe)}this.compile=function(A,Q,fe=null){fe===null&&(fe=A),N=Me.get(fe),N.init(Q),b.push(N),fe.traverseVisible(function(se){se.isLight&&se.layers.test(Q.layers)&&(N.pushLight(se),se.castShadow&&N.pushShadow(se))}),A!==fe&&A.traverseVisible(function(se){se.isLight&&se.layers.test(Q.layers)&&(N.pushLight(se),se.castShadow&&N.pushShadow(se))}),N.setupLights();const ae=new Set;return A.traverse(function(se){if(!(se.isMesh||se.isPoints||se.isLine||se.isSprite))return;const Le=se.material;if(Le)if(Array.isArray(Le))for(let We=0;We<Le.length;We++){const Ae=Le[We];Bs(Ae,fe,se),ae.add(Ae)}else Bs(Le,fe,se),ae.add(Le)}),N=b.pop(),ae},this.compileAsync=function(A,Q,fe=null){const ae=this.compile(A,Q,fe);return new Promise(se=>{function Le(){if(ae.forEach(function(We){re.get(We).currentProgram.isReady()&&ae.delete(We)}),ae.size===0){se(A);return}setTimeout(Le,10)}de.get("KHR_parallel_shader_compile")!==null?Le():setTimeout(Le,10)})};let Hs=null;function Sd(A){Hs&&Hs(A)}function sc(){$n.stop()}function ac(){$n.start()}const $n=new wy;$n.setAnimationLoop(Sd),typeof self<"u"&&$n.setContext(self),this.setAnimationLoop=function(A){Hs=A,qe.setAnimationLoop(A),A===null?$n.stop():$n.start()},qe.addEventListener("sessionstart",sc),qe.addEventListener("sessionend",ac),this.render=function(A,Q){if(Q!==void 0&&Q.isCamera!==!0){Lt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(D===!0)return;K!==null&&K.renderStart(A,Q);const fe=qe.enabled===!0&&qe.isPresenting===!0,ae=U!==null&&($===null||fe)&&U.begin(G,$);if(A.matrixWorldAutoUpdate===!0&&A.updateMatrixWorld(),Q.parent===null&&Q.matrixWorldAutoUpdate===!0&&Q.updateMatrixWorld(),qe.enabled===!0&&qe.isPresenting===!0&&(U===null||U.isCompositing()===!1)&&(qe.cameraAutoUpdate===!0&&qe.updateCamera(Q),Q=qe.getCamera()),A.isScene===!0&&A.onBeforeRender(G,A,Q,$),N=Me.get(A,b.length),N.init(Q),N.state.textureUnits=ge.getTextureUnits(),b.push(N),Gt.multiplyMatrices(Q.projectionMatrix,Q.matrixWorldInverse),Tt.setFromProjectionMatrix(Gt,pr,Q.reversedDepth),vt=this.localClippingEnabled,St=ke.init(this.clippingPlanes,vt),F=te.get(A,O.length),F.init(),O.push(F),qe.enabled===!0&&qe.isPresenting===!0){const We=G.xr.getDepthSensingMesh();We!==null&&Ra(We,Q,-1/0,G.sortObjects)}Ra(A,Q,0,G.sortObjects),F.finish(),G.sortObjects===!0&&F.sort(Oe,Je,Q.reversedDepth),wt=qe.enabled===!1||qe.isPresenting===!1||qe.hasDepthSensing()===!1,wt&&at.addToRenderList(F,A),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),St===!0&&ke.beginShadows();const se=N.state.shadowsArray;if(it.render(se,A,Q),St===!0&&ke.endShadows(),(ae&&U.hasRenderPass())===!1){const We=F.opaque,Ae=F.transmissive;if(N.setupLights(),Q.isArrayCamera){const Qe=Q.cameras;if(Ae.length>0)for(let rt=0,ft=Qe.length;rt<ft;rt++){const pt=Qe[rt];oc(We,Ae,A,pt)}wt&&at.render(A);for(let rt=0,ft=Qe.length;rt<ft;rt++){const pt=Qe[rt];Go(F,A,pt,pt.viewport)}}else Ae.length>0&&oc(We,Ae,A,Q),wt&&at.render(A),Go(F,A,Q)}$!==null&&J===0&&(ge.updateMultisampleRenderTarget($),ge.updateRenderTargetMipmap($)),ae&&U.end(G),A.isScene===!0&&A.onAfterRender(G,A,Q),Fe.resetDefaultState(),ce=-1,ue=null,b.pop(),b.length>0?(N=b[b.length-1],ge.setTextureUnits(N.state.textureUnits),St===!0&&ke.setGlobalState(G.clippingPlanes,N.state.camera)):N=null,O.pop(),O.length>0?F=O[O.length-1]:F=null,K!==null&&K.renderEnd()};function Ra(A,Q,fe,ae){if(A.visible===!1)return;if(A.layers.test(Q.layers)){if(A.isGroup)fe=A.renderOrder;else if(A.isLOD)A.autoUpdate===!0&&A.update(Q);else if(A.isLightProbeGrid)N.pushLightProbeGrid(A);else if(A.isLight)N.pushLight(A),A.castShadow&&N.pushShadow(A);else if(A.isSprite){if(!A.frustumCulled||Tt.intersectsSprite(A)){ae&&qt.setFromMatrixPosition(A.matrixWorld).applyMatrix4(Gt);const We=_e.update(A),Ae=A.material;Ae.visible&&F.push(A,We,Ae,fe,qt.z,null)}}else if((A.isMesh||A.isLine||A.isPoints)&&(!A.frustumCulled||Tt.intersectsObject(A))){const We=_e.update(A),Ae=A.material;if(ae&&(A.boundingSphere!==void 0?(A.boundingSphere===null&&A.computeBoundingSphere(),qt.copy(A.boundingSphere.center)):(We.boundingSphere===null&&We.computeBoundingSphere(),qt.copy(We.boundingSphere.center)),qt.applyMatrix4(A.matrixWorld).applyMatrix4(Gt)),Array.isArray(Ae)){const Qe=We.groups;for(let rt=0,ft=Qe.length;rt<ft;rt++){const pt=Qe[rt],et=Ae[pt.materialIndex];et&&et.visible&&F.push(A,We,et,fe,qt.z,pt)}}else Ae.visible&&F.push(A,We,Ae,fe,qt.z,null)}}const Le=A.children;for(let We=0,Ae=Le.length;We<Ae;We++)Ra(Le[We],Q,fe,ae)}function Go(A,Q,fe,ae){const{opaque:se,transmissive:Le,transparent:We}=A;N.setupLightsView(fe),St===!0&&ke.setGlobalState(G.clippingPlanes,fe),ae&&T.viewport(z.copy(ae)),se.length>0&&Vs(se,Q,fe),Le.length>0&&Vs(Le,Q,fe),We.length>0&&Vs(We,Q,fe),T.buffers.depth.setTest(!0),T.buffers.depth.setMask(!0),T.buffers.color.setMask(!0),T.setPolygonOffset(!1)}function oc(A,Q,fe,ae){if((fe.isScene===!0?fe.overrideMaterial:null)!==null)return;if(N.state.transmissionRenderTarget[ae.id]===void 0){const et=de.has("EXT_color_buffer_half_float")||de.has("EXT_color_buffer_float");N.state.transmissionRenderTarget[ae.id]=new gr(1,1,{generateMipmaps:!0,type:et?$r:Si,minFilter:da,samples:Math.max(4,I.samples),stencilBuffer:l,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Rt.workingColorSpace})}const Le=N.state.transmissionRenderTarget[ae.id],We=ae.viewport||z;Le.setSize(We.z*G.transmissionResolutionScale,We.w*G.transmissionResolutionScale);const Ae=G.getRenderTarget(),Qe=G.getActiveCubeFace(),rt=G.getActiveMipmapLevel();G.setRenderTarget(Le),G.getClearColor(He),Ve=G.getClearAlpha(),Ve<1&&G.setClearColor(16777215,.5),G.clear(),wt&&at.render(fe);const ft=G.toneMapping;G.toneMapping=mr;const pt=ae.viewport;if(ae.viewport!==void 0&&(ae.viewport=void 0),N.setupLightsView(ae),St===!0&&ke.setGlobalState(G.clippingPlanes,ae),Vs(A,fe,ae),ge.updateMultisampleRenderTarget(Le),ge.updateRenderTargetMipmap(Le),de.has("WEBGL_multisampled_render_to_texture")===!1){let et=!1;for(let At=0,Yt=Q.length;At<Yt;At++){const en=Q[At],{object:Bt,geometry:gn,material:Ge,group:Ln}=en;if(Ge.side===hr&&Bt.layers.test(ae.layers)){const yt=Ge.side;Ge.side=hi,Ge.needsUpdate=!0,jo(Bt,fe,ae,gn,Ge,Ln),Ge.side=yt,Ge.needsUpdate=!0,et=!0}}et===!0&&(ge.updateMultisampleRenderTarget(Le),ge.updateRenderTargetMipmap(Le))}G.setRenderTarget(Ae,Qe,rt),G.setClearColor(He,Ve),pt!==void 0&&(ae.viewport=pt),G.toneMapping=ft}function Vs(A,Q,fe){const ae=Q.isScene===!0?Q.overrideMaterial:null;for(let se=0,Le=A.length;se<Le;se++){const We=A[se],{object:Ae,geometry:Qe,group:rt}=We;let ft=We.material;ft.allowOverride===!0&&ae!==null&&(ft=ae),Ae.layers.test(fe.layers)&&jo(Ae,Q,fe,Qe,ft,rt)}}function jo(A,Q,fe,ae,se,Le){A.onBeforeRender(G,Q,fe,ae,se,Le),A.modelViewMatrix.multiplyMatrices(fe.matrixWorldInverse,A.matrixWorld),A.normalMatrix.getNormalMatrix(A.modelViewMatrix),se.onBeforeRender(G,Q,fe,ae,A,Le),se.transparent===!0&&se.side===hr&&se.forceSinglePass===!1?(se.side=hi,se.needsUpdate=!0,G.renderBufferDirect(fe,Q,ae,se,A,Le),se.side=Fs,se.needsUpdate=!0,G.renderBufferDirect(fe,Q,ae,se,A,Le),se.side=hr):G.renderBufferDirect(fe,Q,ae,se,A,Le),A.onAfterRender(G,Q,fe,ae,se,Le)}function Gs(A,Q,fe){Q.isScene!==!0&&(Q=jt);const ae=re.get(A),se=N.state.lights,Le=N.state.shadowsArray,We=se.state.version,Ae=Ie.getParameters(A,se.state,Le,Q,fe,N.state.lightProbeGridArray),Qe=Ie.getProgramCacheKey(Ae);let rt=ae.programs;ae.environment=A.isMeshStandardMaterial||A.isMeshLambertMaterial||A.isMeshPhongMaterial?Q.environment:null,ae.fog=Q.fog;const ft=A.isMeshStandardMaterial||A.isMeshLambertMaterial&&!A.envMap||A.isMeshPhongMaterial&&!A.envMap;ae.envMap=be.get(A.envMap||ae.environment,ft),ae.envMapRotation=ae.environment!==null&&A.envMap===null?Q.environmentRotation:A.envMapRotation,rt===void 0&&(A.addEventListener("dispose",wi),rt=new Map,ae.programs=rt);let pt=rt.get(Qe);if(pt!==void 0){if(ae.currentProgram===pt&&ae.lightsStateVersion===We)return lc(A,Ae),pt}else Ae.uniforms=Ie.getUniforms(A),K!==null&&A.isNodeMaterial&&K.build(A,fe,Ae),A.onBeforeCompile(Ae,G),pt=Ie.acquireProgram(Ae,Qe),rt.set(Qe,pt),ae.uniforms=Ae.uniforms;const et=ae.uniforms;return(!A.isShaderMaterial&&!A.isRawShaderMaterial||A.clipping===!0)&&(et.clippingPlanes=ke.uniform),lc(A,Ae),ae.needsLights=Xo(A),ae.lightsStateVersion=We,ae.needsLights&&(et.ambientLightColor.value=se.state.ambient,et.lightProbe.value=se.state.probe,et.directionalLights.value=se.state.directional,et.directionalLightShadows.value=se.state.directionalShadow,et.spotLights.value=se.state.spot,et.spotLightShadows.value=se.state.spotShadow,et.rectAreaLights.value=se.state.rectArea,et.ltc_1.value=se.state.rectAreaLTC1,et.ltc_2.value=se.state.rectAreaLTC2,et.pointLights.value=se.state.point,et.pointLightShadows.value=se.state.pointShadow,et.hemisphereLights.value=se.state.hemi,et.directionalShadowMatrix.value=se.state.directionalShadowMatrix,et.spotLightMatrix.value=se.state.spotLightMatrix,et.spotLightMap.value=se.state.spotLightMap,et.pointShadowMatrix.value=se.state.pointShadowMatrix),ae.lightProbeGrid=N.state.lightProbeGridArray.length>0,ae.currentProgram=pt,ae.uniformsList=null,pt}function Wo(A){if(A.uniformsList===null){const Q=A.currentProgram.getUniforms();A.uniformsList=Zu.seqWithValue(Q.seq,A.uniforms)}return A.uniformsList}function lc(A,Q){const fe=re.get(A);fe.outputColorSpace=Q.outputColorSpace,fe.batching=Q.batching,fe.batchingColor=Q.batchingColor,fe.instancing=Q.instancing,fe.instancingColor=Q.instancingColor,fe.instancingMorph=Q.instancingMorph,fe.skinning=Q.skinning,fe.morphTargets=Q.morphTargets,fe.morphNormals=Q.morphNormals,fe.morphColors=Q.morphColors,fe.morphTargetsCount=Q.morphTargetsCount,fe.numClippingPlanes=Q.numClippingPlanes,fe.numIntersection=Q.numClipIntersection,fe.vertexAlphas=Q.vertexAlphas,fe.vertexTangents=Q.vertexTangents,fe.toneMapping=Q.toneMapping}function Md(A,Q){if(A.length===0)return null;if(A.length===1)return A[0].texture!==null?A[0]:null;C.setFromMatrixPosition(Q.matrixWorld);for(let fe=0,ae=A.length;fe<ae;fe++){const se=A[fe];if(se.texture!==null&&se.boundingBox.containsPoint(C))return se}return null}function an(A,Q,fe,ae,se){Q.isScene!==!0&&(Q=jt),ge.resetTextureUnits();const Le=Q.fog,We=ae.isMeshStandardMaterial||ae.isMeshLambertMaterial||ae.isMeshPhongMaterial?Q.environment:null,Ae=$===null?G.outputColorSpace:$.isXRRenderTarget===!0?$.texture.colorSpace:Rt.workingColorSpace,Qe=ae.isMeshStandardMaterial||ae.isMeshLambertMaterial&&!ae.envMap||ae.isMeshPhongMaterial&&!ae.envMap,rt=be.get(ae.envMap||We,Qe),ft=ae.vertexColors===!0&&!!fe.attributes.color&&fe.attributes.color.itemSize===4,pt=!!fe.attributes.tangent&&(!!ae.normalMap||ae.anisotropy>0),et=!!fe.morphAttributes.position,At=!!fe.morphAttributes.normal,Yt=!!fe.morphAttributes.color;let en=mr;ae.toneMapped&&($===null||$.isXRRenderTarget===!0)&&(en=G.toneMapping);const Bt=fe.morphAttributes.position||fe.morphAttributes.normal||fe.morphAttributes.color,gn=Bt!==void 0?Bt.length:0,Ge=re.get(ae),Ln=N.state.lights;if(St===!0&&(vt===!0||A!==ue)){const Ht=A===ue&&ae.id===ce;ke.setState(ae,A,Ht)}let yt=!1;ae.version===Ge.__version?(Ge.needsLights&&Ge.lightsStateVersion!==Ln.state.version||Ge.outputColorSpace!==Ae||se.isBatchedMesh&&Ge.batching===!1||!se.isBatchedMesh&&Ge.batching===!0||se.isBatchedMesh&&Ge.batchingColor===!0&&se.colorTexture===null||se.isBatchedMesh&&Ge.batchingColor===!1&&se.colorTexture!==null||se.isInstancedMesh&&Ge.instancing===!1||!se.isInstancedMesh&&Ge.instancing===!0||se.isSkinnedMesh&&Ge.skinning===!1||!se.isSkinnedMesh&&Ge.skinning===!0||se.isInstancedMesh&&Ge.instancingColor===!0&&se.instanceColor===null||se.isInstancedMesh&&Ge.instancingColor===!1&&se.instanceColor!==null||se.isInstancedMesh&&Ge.instancingMorph===!0&&se.morphTexture===null||se.isInstancedMesh&&Ge.instancingMorph===!1&&se.morphTexture!==null||Ge.envMap!==rt||ae.fog===!0&&Ge.fog!==Le||Ge.numClippingPlanes!==void 0&&(Ge.numClippingPlanes!==ke.numPlanes||Ge.numIntersection!==ke.numIntersection)||Ge.vertexAlphas!==ft||Ge.vertexTangents!==pt||Ge.morphTargets!==et||Ge.morphNormals!==At||Ge.morphColors!==Yt||Ge.toneMapping!==en||Ge.morphTargetsCount!==gn||!!Ge.lightProbeGrid!=N.state.lightProbeGridArray.length>0)&&(yt=!0):(yt=!0,Ge.__version=ae.version);let ei=Ge.currentProgram;yt===!0&&(ei=Gs(ae,Q,se),K&&ae.isNodeMaterial&&K.onUpdateProgram(ae,ei,Ge));let ti=!1,Mt=!1,Sr=!1;const kt=ei.getUniforms(),Qt=Ge.uniforms;if(T.useProgram(ei.program)&&(ti=!0,Mt=!0,Sr=!0),ae.id!==ce&&(ce=ae.id,Mt=!0),Ge.needsLights){const Ht=Md(N.state.lightProbeGridArray,se);Ge.lightProbeGrid!==Ht&&(Ge.lightProbeGrid=Ht,Mt=!0)}if(ti||ue!==A){T.buffers.depth.getReversed()&&A.reversedDepth!==!0&&(A._reversedDepth=!0,A.updateProjectionMatrix()),kt.setValue(q,"projectionMatrix",A.projectionMatrix),kt.setValue(q,"viewMatrix",A.matrixWorldInverse);const Oi=kt.map.cameraPosition;Oi!==void 0&&Oi.setValue(q,$t.setFromMatrixPosition(A.matrixWorld)),I.logarithmicDepthBuffer&&kt.setValue(q,"logDepthBufFC",2/(Math.log(A.far+1)/Math.LN2)),(ae.isMeshPhongMaterial||ae.isMeshToonMaterial||ae.isMeshLambertMaterial||ae.isMeshBasicMaterial||ae.isMeshStandardMaterial||ae.isShaderMaterial)&&kt.setValue(q,"isOrthographic",A.isOrthographicCamera===!0),ue!==A&&(ue=A,Mt=!0,Sr=!0)}if(Ge.needsLights&&(Ln.state.directionalShadowMap.length>0&&kt.setValue(q,"directionalShadowMap",Ln.state.directionalShadowMap,ge),Ln.state.spotShadowMap.length>0&&kt.setValue(q,"spotShadowMap",Ln.state.spotShadowMap,ge),Ln.state.pointShadowMap.length>0&&kt.setValue(q,"pointShadowMap",Ln.state.pointShadowMap,ge)),se.isSkinnedMesh){kt.setOptional(q,se,"bindMatrix"),kt.setOptional(q,se,"bindMatrixInverse");const Ht=se.skeleton;Ht&&(Ht.boneTexture===null&&Ht.computeBoneTexture(),kt.setValue(q,"boneTexture",Ht.boneTexture,ge))}se.isBatchedMesh&&(kt.setOptional(q,se,"batchingTexture"),kt.setValue(q,"batchingTexture",se._matricesTexture,ge),kt.setOptional(q,se,"batchingIdTexture"),kt.setValue(q,"batchingIdTexture",se._indirectTexture,ge),kt.setOptional(q,se,"batchingColorTexture"),se._colorsTexture!==null&&kt.setValue(q,"batchingColorTexture",se._colorsTexture,ge));const Fi=fe.morphAttributes;if((Fi.position!==void 0||Fi.normal!==void 0||Fi.color!==void 0)&&W.update(se,fe,ei),(Mt||Ge.receiveShadow!==se.receiveShadow)&&(Ge.receiveShadow=se.receiveShadow,kt.setValue(q,"receiveShadow",se.receiveShadow)),(ae.isMeshStandardMaterial||ae.isMeshLambertMaterial||ae.isMeshPhongMaterial)&&ae.envMap===null&&Q.environment!==null&&(Qt.envMapIntensity.value=Q.environmentIntensity),Qt.dfgLUT!==void 0&&(Qt.dfgLUT.value=qP()),Mt){if(kt.setValue(q,"toneMappingExposure",G.toneMappingExposure),Ge.needsLights&&Ed(Qt,Sr),Le&&ae.fog===!0&&Xe.refreshFogUniforms(Qt,Le),Xe.refreshMaterialUniforms(Qt,ae,ve,Se,N.state.transmissionRenderTarget[A.id]),Ge.needsLights&&Ge.lightProbeGrid){const Ht=Ge.lightProbeGrid;Qt.probesSH.value=Ht.texture,Qt.probesMin.value.copy(Ht.boundingBox.min),Qt.probesMax.value.copy(Ht.boundingBox.max),Qt.probesResolution.value.copy(Ht.resolution)}Zu.upload(q,Wo(Ge),Qt,ge)}if(ae.isShaderMaterial&&ae.uniformsNeedUpdate===!0&&(Zu.upload(q,Wo(Ge),Qt,ge),ae.uniformsNeedUpdate=!1),ae.isSpriteMaterial&&kt.setValue(q,"center",se.center),kt.setValue(q,"modelViewMatrix",se.modelViewMatrix),kt.setValue(q,"normalMatrix",se.normalMatrix),kt.setValue(q,"modelMatrix",se.matrixWorld),ae.uniformsGroups!==void 0){const Ht=ae.uniformsGroups;for(let Oi=0,tr=Ht.length;Oi<tr;Oi++){const js=Ht[Oi];Ee.update(js,ei),Ee.bind(js,ei)}}return ei}function Ed(A,Q){A.ambientLightColor.needsUpdate=Q,A.lightProbe.needsUpdate=Q,A.directionalLights.needsUpdate=Q,A.directionalLightShadows.needsUpdate=Q,A.pointLights.needsUpdate=Q,A.pointLightShadows.needsUpdate=Q,A.spotLights.needsUpdate=Q,A.spotLightShadows.needsUpdate=Q,A.rectAreaLights.needsUpdate=Q,A.hemisphereLights.needsUpdate=Q}function Xo(A){return A.isMeshLambertMaterial||A.isMeshToonMaterial||A.isMeshPhongMaterial||A.isMeshStandardMaterial||A.isShadowMaterial||A.isShaderMaterial&&A.lights===!0}this.getActiveCubeFace=function(){return he},this.getActiveMipmapLevel=function(){return J},this.getRenderTarget=function(){return $},this.setRenderTargetTextures=function(A,Q,fe){const ae=re.get(A);ae.__autoAllocateDepthBuffer=A.resolveDepthBuffer===!1,ae.__autoAllocateDepthBuffer===!1&&(ae.__useRenderToTexture=!1),re.get(A.texture).__webglTexture=Q,re.get(A.depthTexture).__webglTexture=ae.__autoAllocateDepthBuffer?void 0:fe,ae.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(A,Q){const fe=re.get(A);fe.__webglFramebuffer=Q,fe.__useDefaultFramebuffer=Q===void 0},this.setRenderTarget=function(A,Q=0,fe=0){$=A,he=Q,J=fe;let ae=null,se=!1,Le=!1;if(A){const Ae=re.get(A);if(Ae.__useDefaultFramebuffer!==void 0){T.bindFramebuffer(q.FRAMEBUFFER,Ae.__webglFramebuffer),z.copy(A.viewport),X.copy(A.scissor),Ue=A.scissorTest,T.viewport(z),T.scissor(X),T.setScissorTest(Ue),ce=-1;return}else if(Ae.__webglFramebuffer===void 0)ge.setupRenderTarget(A);else if(Ae.__hasExternalTextures)ge.rebindTextures(A,re.get(A.texture).__webglTexture,re.get(A.depthTexture).__webglTexture);else if(A.depthBuffer){const ft=A.depthTexture;if(Ae.__boundDepthTexture!==ft){if(ft!==null&&re.has(ft)&&(A.width!==ft.image.width||A.height!==ft.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");ge.setupDepthRenderbuffer(A)}}const Qe=A.texture;(Qe.isData3DTexture||Qe.isDataArrayTexture||Qe.isCompressedArrayTexture)&&(Le=!0);const rt=re.get(A).__webglFramebuffer;A.isWebGLCubeRenderTarget?(Array.isArray(rt[Q])?ae=rt[Q][fe]:ae=rt[Q],se=!0):A.samples>0&&ge.useMultisampledRTT(A)===!1?ae=re.get(A).__webglMultisampledFramebuffer:Array.isArray(rt)?ae=rt[fe]:ae=rt,z.copy(A.viewport),X.copy(A.scissor),Ue=A.scissorTest}else z.copy(nt).multiplyScalar(ve).floor(),X.copy(Ut).multiplyScalar(ve).floor(),Ue=dt;if(fe!==0&&(ae=ne),T.bindFramebuffer(q.FRAMEBUFFER,ae)&&T.drawBuffers(A,ae),T.viewport(z),T.scissor(X),T.setScissorTest(Ue),se){const Ae=re.get(A.texture);q.framebufferTexture2D(q.FRAMEBUFFER,q.COLOR_ATTACHMENT0,q.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Ae.__webglTexture,fe)}else if(Le){const Ae=Q;for(let Qe=0;Qe<A.textures.length;Qe++){const rt=re.get(A.textures[Qe]);q.framebufferTextureLayer(q.FRAMEBUFFER,q.COLOR_ATTACHMENT0+Qe,rt.__webglTexture,fe,Ae)}}else if(A!==null&&fe!==0){const Ae=re.get(A.texture);q.framebufferTexture2D(q.FRAMEBUFFER,q.COLOR_ATTACHMENT0,q.TEXTURE_2D,Ae.__webglTexture,fe)}ce=-1},this.readRenderTargetPixels=function(A,Q,fe,ae,se,Le,We,Ae=0){if(!(A&&A.isWebGLRenderTarget)){Lt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Qe=re.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&We!==void 0&&(Qe=Qe[We]),Qe){T.bindFramebuffer(q.FRAMEBUFFER,Qe);try{const rt=A.textures[Ae],ft=rt.format,pt=rt.type;if(A.textures.length>1&&q.readBuffer(q.COLOR_ATTACHMENT0+Ae),!I.textureFormatReadable(ft)){Lt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!I.textureTypeReadable(pt)){Lt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}Q>=0&&Q<=A.width-ae&&fe>=0&&fe<=A.height-se&&q.readPixels(Q,fe,ae,se,De.convert(ft),De.convert(pt),Le)}finally{const rt=$!==null?re.get($).__webglFramebuffer:null;T.bindFramebuffer(q.FRAMEBUFFER,rt)}}},this.readRenderTargetPixelsAsync=async function(A,Q,fe,ae,se,Le,We,Ae=0){if(!(A&&A.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Qe=re.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&We!==void 0&&(Qe=Qe[We]),Qe)if(Q>=0&&Q<=A.width-ae&&fe>=0&&fe<=A.height-se){T.bindFramebuffer(q.FRAMEBUFFER,Qe);const rt=A.textures[Ae],ft=rt.format,pt=rt.type;if(A.textures.length>1&&q.readBuffer(q.COLOR_ATTACHMENT0+Ae),!I.textureFormatReadable(ft))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!I.textureTypeReadable(pt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const et=q.createBuffer();q.bindBuffer(q.PIXEL_PACK_BUFFER,et),q.bufferData(q.PIXEL_PACK_BUFFER,Le.byteLength,q.STREAM_READ),q.readPixels(Q,fe,ae,se,De.convert(ft),De.convert(pt),0);const At=$!==null?re.get($).__webglFramebuffer:null;T.bindFramebuffer(q.FRAMEBUFFER,At);const Yt=q.fenceSync(q.SYNC_GPU_COMMANDS_COMPLETE,0);return q.flush(),await rb(q,Yt,4),q.bindBuffer(q.PIXEL_PACK_BUFFER,et),q.getBufferSubData(q.PIXEL_PACK_BUFFER,0,Le),q.deleteBuffer(et),q.deleteSync(Yt),Le}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(A,Q=null,fe=0){const ae=Math.pow(2,-fe),se=Math.floor(A.image.width*ae),Le=Math.floor(A.image.height*ae),We=Q!==null?Q.x:0,Ae=Q!==null?Q.y:0;ge.setTexture2D(A,0),q.copyTexSubImage2D(q.TEXTURE_2D,fe,0,0,We,Ae,se,Le),T.unbindTexture()},this.copyTextureToTexture=function(A,Q,fe=null,ae=null,se=0,Le=0){let We,Ae,Qe,rt,ft,pt,et,At,Yt;const en=A.isCompressedTexture?A.mipmaps[Le]:A.image;if(fe!==null)We=fe.max.x-fe.min.x,Ae=fe.max.y-fe.min.y,Qe=fe.isBox3?fe.max.z-fe.min.z:1,rt=fe.min.x,ft=fe.min.y,pt=fe.isBox3?fe.min.z:0;else{const Qt=Math.pow(2,-se);We=Math.floor(en.width*Qt),Ae=Math.floor(en.height*Qt),A.isDataArrayTexture?Qe=en.depth:A.isData3DTexture?Qe=Math.floor(en.depth*Qt):Qe=1,rt=0,ft=0,pt=0}ae!==null?(et=ae.x,At=ae.y,Yt=ae.z):(et=0,At=0,Yt=0);const Bt=De.convert(Q.format),gn=De.convert(Q.type);let Ge;Q.isData3DTexture?(ge.setTexture3D(Q,0),Ge=q.TEXTURE_3D):Q.isDataArrayTexture||Q.isCompressedArrayTexture?(ge.setTexture2DArray(Q,0),Ge=q.TEXTURE_2D_ARRAY):(ge.setTexture2D(Q,0),Ge=q.TEXTURE_2D),T.activeTexture(q.TEXTURE0),T.pixelStorei(q.UNPACK_FLIP_Y_WEBGL,Q.flipY),T.pixelStorei(q.UNPACK_PREMULTIPLY_ALPHA_WEBGL,Q.premultiplyAlpha),T.pixelStorei(q.UNPACK_ALIGNMENT,Q.unpackAlignment);const Ln=T.getParameter(q.UNPACK_ROW_LENGTH),yt=T.getParameter(q.UNPACK_IMAGE_HEIGHT),ei=T.getParameter(q.UNPACK_SKIP_PIXELS),ti=T.getParameter(q.UNPACK_SKIP_ROWS),Mt=T.getParameter(q.UNPACK_SKIP_IMAGES);T.pixelStorei(q.UNPACK_ROW_LENGTH,en.width),T.pixelStorei(q.UNPACK_IMAGE_HEIGHT,en.height),T.pixelStorei(q.UNPACK_SKIP_PIXELS,rt),T.pixelStorei(q.UNPACK_SKIP_ROWS,ft),T.pixelStorei(q.UNPACK_SKIP_IMAGES,pt);const Sr=A.isDataArrayTexture||A.isData3DTexture,kt=Q.isDataArrayTexture||Q.isData3DTexture;if(A.isDepthTexture){const Qt=re.get(A),Fi=re.get(Q),Ht=re.get(Qt.__renderTarget),Oi=re.get(Fi.__renderTarget);T.bindFramebuffer(q.READ_FRAMEBUFFER,Ht.__webglFramebuffer),T.bindFramebuffer(q.DRAW_FRAMEBUFFER,Oi.__webglFramebuffer);for(let tr=0;tr<Qe;tr++)Sr&&(q.framebufferTextureLayer(q.READ_FRAMEBUFFER,q.COLOR_ATTACHMENT0,re.get(A).__webglTexture,se,pt+tr),q.framebufferTextureLayer(q.DRAW_FRAMEBUFFER,q.COLOR_ATTACHMENT0,re.get(Q).__webglTexture,Le,Yt+tr)),q.blitFramebuffer(rt,ft,We,Ae,et,At,We,Ae,q.DEPTH_BUFFER_BIT,q.NEAREST);T.bindFramebuffer(q.READ_FRAMEBUFFER,null),T.bindFramebuffer(q.DRAW_FRAMEBUFFER,null)}else if(se!==0||A.isRenderTargetTexture||re.has(A)){const Qt=re.get(A),Fi=re.get(Q);T.bindFramebuffer(q.READ_FRAMEBUFFER,me),T.bindFramebuffer(q.DRAW_FRAMEBUFFER,k);for(let Ht=0;Ht<Qe;Ht++)Sr?q.framebufferTextureLayer(q.READ_FRAMEBUFFER,q.COLOR_ATTACHMENT0,Qt.__webglTexture,se,pt+Ht):q.framebufferTexture2D(q.READ_FRAMEBUFFER,q.COLOR_ATTACHMENT0,q.TEXTURE_2D,Qt.__webglTexture,se),kt?q.framebufferTextureLayer(q.DRAW_FRAMEBUFFER,q.COLOR_ATTACHMENT0,Fi.__webglTexture,Le,Yt+Ht):q.framebufferTexture2D(q.DRAW_FRAMEBUFFER,q.COLOR_ATTACHMENT0,q.TEXTURE_2D,Fi.__webglTexture,Le),se!==0?q.blitFramebuffer(rt,ft,We,Ae,et,At,We,Ae,q.COLOR_BUFFER_BIT,q.NEAREST):kt?q.copyTexSubImage3D(Ge,Le,et,At,Yt+Ht,rt,ft,We,Ae):q.copyTexSubImage2D(Ge,Le,et,At,rt,ft,We,Ae);T.bindFramebuffer(q.READ_FRAMEBUFFER,null),T.bindFramebuffer(q.DRAW_FRAMEBUFFER,null)}else kt?A.isDataTexture||A.isData3DTexture?q.texSubImage3D(Ge,Le,et,At,Yt,We,Ae,Qe,Bt,gn,en.data):Q.isCompressedArrayTexture?q.compressedTexSubImage3D(Ge,Le,et,At,Yt,We,Ae,Qe,Bt,en.data):q.texSubImage3D(Ge,Le,et,At,Yt,We,Ae,Qe,Bt,gn,en):A.isDataTexture?q.texSubImage2D(q.TEXTURE_2D,Le,et,At,We,Ae,Bt,gn,en.data):A.isCompressedTexture?q.compressedTexSubImage2D(q.TEXTURE_2D,Le,et,At,en.width,en.height,Bt,en.data):q.texSubImage2D(q.TEXTURE_2D,Le,et,At,We,Ae,Bt,gn,en);T.pixelStorei(q.UNPACK_ROW_LENGTH,Ln),T.pixelStorei(q.UNPACK_IMAGE_HEIGHT,yt),T.pixelStorei(q.UNPACK_SKIP_PIXELS,ei),T.pixelStorei(q.UNPACK_SKIP_ROWS,ti),T.pixelStorei(q.UNPACK_SKIP_IMAGES,Mt),Le===0&&Q.generateMipmaps&&q.generateMipmap(Ge),T.unbindTexture()},this.initRenderTarget=function(A){re.get(A).__webglFramebuffer===void 0&&ge.setupRenderTarget(A)},this.initTexture=function(A){A.isCubeTexture?ge.setTextureCube(A,0):A.isData3DTexture?ge.setTexture3D(A,0):A.isDataArrayTexture||A.isCompressedArrayTexture?ge.setTexture2DArray(A,0):ge.setTexture2D(A,0),T.unbindTexture()},this.resetState=function(){he=0,J=0,$=null,T.reset(),Fe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return pr}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=Rt._getDrawingBufferColorSpace(e),t.unpackColorSpace=Rt._getUnpackColorSpace()}}const KP=/^[og]\s*(.+)?/,QP=/^mtllib /,ZP=/^usemtl /,JP=/^usemap /,Qv=/\s+/,Zv=new ee,qf=new ee,Jv=new ee,e_=new ee,Li=new ee,zu=new xt;function e2(){const i={objects:[],object:{},vertices:[],normals:[],colors:[],uvs:[],materials:{},materialLibraries:[],startObject:function(e,t){if(this.object&&this.object.fromDeclaration===!1){this.object.name=e,this.object.fromDeclaration=t!==!1;return}const r=this.object&&typeof this.object.currentMaterial=="function"?this.object.currentMaterial():void 0;if(this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0),this.object={name:e||"",fromDeclaration:t!==!1,geometry:{vertices:[],normals:[],colors:[],uvs:[],hasUVIndices:!1},materials:[],smooth:!0,startMaterial:function(a,l){const c=this._finalize(!1);c&&(c.inherited||c.groupCount<=0)&&this.materials.splice(c.index,1);const d={index:this.materials.length,name:a||"",mtllib:Array.isArray(l)&&l.length>0?l[l.length-1]:"",smooth:c!==void 0?c.smooth:this.smooth,groupStart:c!==void 0?c.groupEnd:0,groupEnd:-1,groupCount:-1,inherited:!1,clone:function(h){const f={index:typeof h=="number"?h:this.index,name:this.name,mtllib:this.mtllib,smooth:this.smooth,groupStart:0,groupEnd:-1,groupCount:-1,inherited:!1};return f.clone=this.clone.bind(f),f}};return this.materials.push(d),d},currentMaterial:function(){if(this.materials.length>0)return this.materials[this.materials.length-1]},_finalize:function(a){const l=this.currentMaterial();if(l&&l.groupEnd===-1&&(l.groupEnd=this.geometry.vertices.length/3,l.groupCount=l.groupEnd-l.groupStart,l.inherited=!1),a&&this.materials.length>1)for(let c=this.materials.length-1;c>=0;c--)this.materials[c].groupCount<=0&&this.materials.splice(c,1);return a&&this.materials.length===0&&this.materials.push({name:"",smooth:this.smooth}),l}},r&&r.name&&typeof r.clone=="function"){const a=r.clone(0);a.inherited=!0,this.object.materials.push(a)}this.objects.push(this.object)},finalize:function(){this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0)},parseVertexIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/3)*3},parseNormalIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/3)*3},parseUVIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/2)*2},addVertex:function(e,t,r){const a=this.vertices,l=this.object.geometry.vertices;l.push(a[e+0],a[e+1],a[e+2]),l.push(a[t+0],a[t+1],a[t+2]),l.push(a[r+0],a[r+1],a[r+2])},addVertexPoint:function(e){const t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addVertexLine:function(e){const t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addNormal:function(e,t,r){const a=this.normals,l=this.object.geometry.normals;l.push(a[e+0],a[e+1],a[e+2]),l.push(a[t+0],a[t+1],a[t+2]),l.push(a[r+0],a[r+1],a[r+2])},addFaceNormal:function(e,t,r){const a=this.vertices,l=this.object.geometry.normals;Zv.fromArray(a,e),qf.fromArray(a,t),Jv.fromArray(a,r),Li.subVectors(Jv,qf),e_.subVectors(Zv,qf),Li.cross(e_),Li.normalize(),l.push(Li.x,Li.y,Li.z),l.push(Li.x,Li.y,Li.z),l.push(Li.x,Li.y,Li.z)},addColor:function(e,t,r){const a=this.colors,l=this.object.geometry.colors;a[e]!==void 0&&l.push(a[e+0],a[e+1],a[e+2]),a[t]!==void 0&&l.push(a[t+0],a[t+1],a[t+2]),a[r]!==void 0&&l.push(a[r+0],a[r+1],a[r+2])},addUV:function(e,t,r){const a=this.uvs,l=this.object.geometry.uvs;l.push(a[e+0],a[e+1]),l.push(a[t+0],a[t+1]),l.push(a[r+0],a[r+1])},addDefaultUV:function(){const e=this.object.geometry.uvs;e.push(0,0),e.push(0,0),e.push(0,0)},addUVLine:function(e){const t=this.uvs;this.object.geometry.uvs.push(t[e+0],t[e+1])},addFace:function(e,t,r,a,l,c,d,h,f){const m=this.vertices.length;let g=this.parseVertexIndex(e,m),x=this.parseVertexIndex(t,m),M=this.parseVertexIndex(r,m);if(this.addVertex(g,x,M),this.addColor(g,x,M),d!==void 0&&d!==""){const E=this.normals.length;g=this.parseNormalIndex(d,E),x=this.parseNormalIndex(h,E),M=this.parseNormalIndex(f,E),this.addNormal(g,x,M)}else this.addFaceNormal(g,x,M);if(a!==void 0&&a!==""){const E=this.uvs.length;g=this.parseUVIndex(a,E),x=this.parseUVIndex(l,E),M=this.parseUVIndex(c,E),this.addUV(g,x,M),this.object.geometry.hasUVIndices=!0}else this.addDefaultUV()},addPointGeometry:function(e){this.object.geometry.type="Points";const t=this.vertices.length;for(let r=0,a=e.length;r<a;r++){const l=this.parseVertexIndex(e[r],t);this.addVertexPoint(l),this.addColor(l)}},addLineGeometry:function(e,t){this.object.geometry.type="Line";const r=this.vertices.length,a=this.uvs.length;for(let l=0,c=e.length;l<c;l++)this.addVertexLine(this.parseVertexIndex(e[l],r));for(let l=0,c=t.length;l<c;l++)this.addUVLine(this.parseUVIndex(t[l],a))}};return i.startObject("",!1),i}class t2 extends rc{constructor(e){super(e),this.materials=null}load(e,t,r,a){const l=this,c=new jb(this.manager);c.setPath(this.path),c.setRequestHeader(this.requestHeader),c.setWithCredentials(this.withCredentials),c.load(e,function(d){try{t(l.parse(d))}catch(h){a?a(h):console.error(h),l.manager.itemError(e)}},r,a)}setMaterials(e){return this.materials=e,this}parse(e){const t=new e2;e.indexOf(`\r
`)!==-1&&(e=e.replace(/\r\n/g,`
`)),e.indexOf(`\\
`)!==-1&&(e=e.replace(/\\\n/g,""));const r=e.split(`
`);let a=[];for(let d=0,h=r.length;d<h;d++){const f=r[d].trimStart();if(f.length===0)continue;const m=f.charAt(0);if(m!=="#")if(m==="v"){const g=f.split(Qv);switch(g[0]){case"v":t.vertices.push(parseFloat(g[1]),parseFloat(g[2]),parseFloat(g[3])),g.length>=7?(zu.setRGB(parseFloat(g[4]),parseFloat(g[5]),parseFloat(g[6]),Jn),t.colors.push(zu.r,zu.g,zu.b)):t.colors.push(void 0,void 0,void 0);break;case"vn":t.normals.push(parseFloat(g[1]),parseFloat(g[2]),parseFloat(g[3]));break;case"vt":t.uvs.push(parseFloat(g[1]),parseFloat(g[2]));break}}else if(m==="f"){const x=f.slice(1).trim().split(Qv),M=[];for(let w=0,_=x.length;w<_;w++){const y=x[w];if(y.length>0){const L=y.split("/");M.push(L)}}const E=M[0];for(let w=1,_=M.length-1;w<_;w++){const y=M[w],L=M[w+1];t.addFace(E[0],y[0],L[0],E[1],y[1],L[1],E[2],y[2],L[2])}}else if(m==="l"){const g=f.substring(1).trim().split(" ");let x=[];const M=[];if(f.indexOf("/")===-1)x=g;else for(let E=0,w=g.length;E<w;E++){const _=g[E].split("/");_[0]!==""&&x.push(_[0]),_[1]!==""&&M.push(_[1])}t.addLineGeometry(x,M)}else if(m==="p"){const x=f.slice(1).trim().split(" ");t.addPointGeometry(x)}else if((a=KP.exec(f))!==null){const g=(" "+a[0].slice(1).trim()).slice(1);t.startObject(g)}else if(ZP.test(f))t.object.startMaterial(f.substring(7).trim(),t.materialLibraries);else if(QP.test(f))t.materialLibraries.push(f.substring(7).trim());else if(JP.test(f))console.warn('THREE.OBJLoader: Rendering identifier "usemap" not supported. Textures must be defined in MTL files.');else if(m==="s"){if(a=f.split(" "),a.length>1){const x=a[1].trim().toLowerCase();t.object.smooth=x!=="0"&&x!=="off"}else t.object.smooth=!0;const g=t.object.currentMaterial();g&&(g.smooth=t.object.smooth)}else{if(f==="\0")continue;console.warn('THREE.OBJLoader: Unexpected line: "'+f+'"')}}t.finalize();const l=new Fl;if(l.materialLibraries=[].concat(t.materialLibraries),!(t.objects.length===1&&t.objects[0].geometry.vertices.length===0)===!0)for(let d=0,h=t.objects.length;d<h;d++){const f=t.objects[d],m=f.geometry,g=f.materials,x=m.type==="Line",M=m.type==="Points";let E=!1;if(m.vertices.length===0)continue;const w=new Mi;w.setAttribute("position",new Un(m.vertices,3)),m.normals.length>0&&w.setAttribute("normal",new Un(m.normals,3)),m.colors.length>0&&(E=!0,w.setAttribute("color",new Un(m.colors,3))),m.hasUVIndices===!0&&w.setAttribute("uv",new Un(m.uvs,2));const _=[];for(let L=0,P=g.length;L<P;L++){const C=g[L],F=C.name+"_"+C.smooth+"_"+E;let N=t.materials[F];if(this.materials!==null){if(N=this.materials.create(C.name),x&&N&&!(N instanceof Qu)){const O=new Qu;_r.prototype.copy.call(O,N),O.color.copy(N.color),N=O}else if(M&&N&&!(N instanceof Ol)){const O=new Ol({size:10,sizeAttenuation:!1});_r.prototype.copy.call(O,N),O.color.copy(N.color),O.map=N.map,N=O}}N===void 0&&(x?N=new Qu:M?N=new Ol({size:1,sizeAttenuation:!1}):N=new kb,N.name=C.name,N.flatShading=!C.smooth,N.vertexColors=E,t.materials[F]=N),_.push(N)}let y;if(_.length>1){for(let L=0,P=g.length;L<P;L++){const C=g[L];w.addGroup(C.groupStart,C.groupCount,L)}x?y=new gv(w,_):M?y=new kf(w,_):y=new Zi(w,_)}else x?y=new gv(w,_[0]):M?y=new kf(w,_[0]):y=new Zi(w,_[0]);y.name=f.name,l.add(y)}else if(t.vertices.length>0){const d=new Ol({size:1,sizeAttenuation:!1}),h=new Mi;h.setAttribute("position",new Un(t.vertices,3)),t.colors.length>0&&t.colors[0]!==void 0&&(h.setAttribute("color",new Un(t.colors,3)),d.vertexColors=!0);const f=new kf(h,d);l.add(f)}return l}}const t_={type:"change"},Hm={type:"start"},Ly={type:"end"},Bu=new xd,n_=new Ms,n2=Math.cos(70*ob.DEG2RAD),Sn=new ee,ci=2*Math.PI,Xt={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Yf=1e-6;class i2 extends Jb{constructor(e,t=null){super(e,t),this.state=Xt.NONE,this.target=new ee,this.cursor=new ee,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:go.ROTATE,MIDDLE:go.DOLLY,RIGHT:go.PAN},this.touches={ONE:po.ROTATE,TWO:po.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new ee,this._lastQuaternion=new Os,this._lastTargetPosition=new ee,this._quat=new Os().setFromUnitVectors(e.up,new ee(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new bv,this._sphericalDelta=new bv,this._scale=1,this._panOffset=new ee,this._rotateStart=new ht,this._rotateEnd=new ht,this._rotateDelta=new ht,this._panStart=new ht,this._panEnd=new ht,this._panDelta=new ht,this._dollyStart=new ht,this._dollyEnd=new ht,this._dollyDelta=new ht,this._dollyDirection=new ee,this._mouse=new ht,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=s2.bind(this),this._onPointerDown=r2.bind(this),this._onPointerUp=a2.bind(this),this._onContextMenu=f2.bind(this),this._onMouseWheel=c2.bind(this),this._onKeyDown=u2.bind(this),this._onTouchStart=d2.bind(this),this._onTouchMove=h2.bind(this),this._onMouseDown=o2.bind(this),this._onMouseMove=l2.bind(this),this._interceptControlDown=p2.bind(this),this._interceptControlUp=m2.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction=""}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(t_),this.update(),this.state=Xt.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){const t=this.object.position;Sn.copy(t).sub(this.target),Sn.applyQuaternion(this._quat),this._spherical.setFromVector3(Sn),this.autoRotate&&this.state===Xt.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let r=this.minAzimuthAngle,a=this.maxAzimuthAngle;isFinite(r)&&isFinite(a)&&(r<-Math.PI?r+=ci:r>Math.PI&&(r-=ci),a<-Math.PI?a+=ci:a>Math.PI&&(a-=ci),r<=a?this._spherical.theta=Math.max(r,Math.min(a,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(r+a)/2?Math.max(r,this._spherical.theta):Math.min(a,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let l=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const c=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),l=c!=this._spherical.radius}if(Sn.setFromSpherical(this._spherical),Sn.applyQuaternion(this._quatInverse),t.copy(this.target).add(Sn),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let c=null;if(this.object.isPerspectiveCamera){const d=Sn.length();c=this._clampDistance(d*this._scale);const h=d-c;this.object.position.addScaledVector(this._dollyDirection,h),this.object.updateMatrixWorld(),l=!!h}else if(this.object.isOrthographicCamera){const d=new ee(this._mouse.x,this._mouse.y,0);d.unproject(this.object);const h=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),l=h!==this.object.zoom;const f=new ee(this._mouse.x,this._mouse.y,0);f.unproject(this.object),this.object.position.sub(f).add(d),this.object.updateMatrixWorld(),c=Sn.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;c!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(c).add(this.object.position):(Bu.origin.copy(this.object.position),Bu.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Bu.direction))<n2?this.object.lookAt(this.target):(n_.setFromNormalAndCoplanarPoint(this.object.up,this.target),Bu.intersectPlane(n_,this.target))))}else if(this.object.isOrthographicCamera){const c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),c!==this.object.zoom&&(this.object.updateProjectionMatrix(),l=!0)}return this._scale=1,this._performCursorZoom=!1,l||this._lastPosition.distanceToSquared(this.object.position)>Yf||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Yf||this._lastTargetPosition.distanceToSquared(this.target)>Yf?(this.dispatchEvent(t_),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?ci/60*this.autoRotateSpeed*e:ci/60/60*this.autoRotateSpeed}_getZoomScale(e){const t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Sn.setFromMatrixColumn(t,0),Sn.multiplyScalar(-e),this._panOffset.add(Sn)}_panUp(e,t){this.screenSpacePanning===!0?Sn.setFromMatrixColumn(t,1):(Sn.setFromMatrixColumn(t,0),Sn.crossVectors(this.object.up,Sn)),Sn.multiplyScalar(e),this._panOffset.add(Sn)}_pan(e,t){const r=this.domElement;if(this.object.isPerspectiveCamera){const a=this.object.position;Sn.copy(a).sub(this.target);let l=Sn.length();l*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*l/r.clientHeight,this.object.matrix),this._panUp(2*t*l/r.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/r.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/r.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const r=this.domElement.getBoundingClientRect(),a=e-r.left,l=t-r.top,c=r.width,d=r.height;this._mouse.x=a/c*2-1,this._mouse.y=-(l/d)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(ci*this._rotateDelta.x/t.clientHeight),this._rotateUp(ci*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._rotateStart.set(r,a)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._panStart.set(r,a)}}_handleTouchStartDolly(e){const t=this._getSecondPointerPosition(e),r=e.pageX-t.x,a=e.pageY-t.y,l=Math.sqrt(r*r+a*a);this._dollyStart.set(0,l)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{const r=this._getSecondPointerPosition(e),a=.5*(e.pageX+r.x),l=.5*(e.pageY+r.y);this._rotateEnd.set(a,l)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(ci*this._rotateDelta.x/t.clientHeight),this._rotateUp(ci*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._panEnd.set(r,a)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){const t=this._getSecondPointerPosition(e),r=e.pageX-t.x,a=e.pageY-t.y,l=Math.sqrt(r*r+a*a);this._dollyEnd.set(0,l),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const c=(e.pageX+t.x)*.5,d=(e.pageY+t.y)*.5;this._updateZoomParameters(c,d)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new ht,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){const t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){const t=e.deltaMode,r={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:r.deltaY*=16;break;case 2:r.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(r.deltaY*=10),r}}function r2(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function s2(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function a2(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Ly),this.state=Xt.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:const e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function o2(i){let e;switch(i.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case go.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=Xt.DOLLY;break;case go.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Xt.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Xt.ROTATE}break;case go.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Xt.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Xt.PAN}break;default:this.state=Xt.NONE}this.state!==Xt.NONE&&this.dispatchEvent(Hm)}function l2(i){switch(this.state){case Xt.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case Xt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case Xt.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function c2(i){this.enabled===!1||this.enableZoom===!1||this.state!==Xt.NONE||(i.preventDefault(),this.dispatchEvent(Hm),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(Ly))}function u2(i){this.enabled!==!1&&this._handleKeyDown(i)}function d2(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case po.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=Xt.TOUCH_ROTATE;break;case po.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=Xt.TOUCH_PAN;break;default:this.state=Xt.NONE}break;case 2:switch(this.touches.TWO){case po.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=Xt.TOUCH_DOLLY_PAN;break;case po.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=Xt.TOUCH_DOLLY_ROTATE;break;default:this.state=Xt.NONE}break;default:this.state=Xt.NONE}this.state!==Xt.NONE&&this.dispatchEvent(Hm)}function h2(i){switch(this._trackPointer(i),this.state){case Xt.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case Xt.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case Xt.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case Xt.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=Xt.NONE}}function f2(i){this.enabled!==!1&&i.preventDefault()}function p2(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function m2(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function g2({piece:i,variant:e,textured:t=!0,size:r=320}){const a=H.useRef(null);return H.useEffect(()=>{const l=a.current;if(!l)return;const c=new Sb;c.background=new xt(1315866);const d=new Ii(35,1,.01,5e3),h=new YP({antialias:!0});h.setSize(r,r),h.setPixelRatio(Math.min(2,window.devicePixelRatio)),h.outputColorSpace=Jn,h.toneMapping=Rm,h.toneMappingExposure=1.15,l.appendChild(h.domElement),c.add(new $b(16777215,4210768,1.1)),c.add(new Kb(16777215,.35));const f=new Hf(16777215,2.4);f.position.set(3,4,2),c.add(f);const m=new Hf(16777215,1.1);m.position.set(-3,1,-1),c.add(m);const g=new Hf(16777215,.8);g.position.set(0,2,-4),c.add(g);const x=new i2(d,h.domElement);x.enableDamping=!0,x.autoRotate=!0,x.autoRotateSpeed=1.2;let M=0,E=!1;new t2().load(`/api/scan/model/${i}/${e}.obj`,y=>{if(E)return;y.traverse(O=>{const b=O;b.isMesh&&b.geometry.computeVertexNormals()});const L=O=>x2(y,O);t?new Xb().load(`/api/scan/model/${i}/${e}.png`,O=>{O.colorSpace=Jn,L(new zf({map:O,roughness:.6}))},void 0,()=>L(new zf({color:11579576,roughness:.6}))):L(new zf({color:12632262,roughness:.65})),y.rotation.x=-Math.PI/2;const P=new Ho().setFromObject(y),C=P.getCenter(new ee),F=P.getSize(new ee);y.position.sub(C),c.add(y);const N=Math.max(F.x,F.y,F.z);d.position.set(N*1.6,N*.6,N*1.6),d.near=N/100,d.far=N*100,d.updateProjectionMatrix(),x.target.set(0,0,0),x.update()});const _=()=>{x.update(),h.render(c,d),M=requestAnimationFrame(_)};return _(),()=>{E=!0,cancelAnimationFrame(M),x.dispose(),h.dispose(),l.removeChild(h.domElement)}},[i,e,t,r]),v.jsx("div",{ref:a,style:{width:r,height:r},className:"rounded-lg border border-zinc-700 bg-zinc-950 [&>canvas]:rounded-lg"})}function x2(i,e){e.side=hr,i.traverse(t=>{t.isMesh&&(t.material=e)})}const Fr="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",v2="https://<PHONE-IP>:4444/video/m.jpeg",_2="https://<PHONE-IP>:4444/video/snapshot",y2={P:"Pawn",N:"Knight",B:"Bishop",R:"Rook",Q:"Queen",K:"King"};function S2(i){const e=i.match(/^([wb]?)([PNBRQK])$/i);if(!e)return null;const t=e[2].toUpperCase();return e[1]?e[1].toLowerCase()+t:t}function ud(i){const e=i.length===2?i[1]:i[0];let t="";return i.length===2&&(t=i[0]==="w"?"white ":"black "),t+(y2[e]??i)}function rm(i,e){const t=S2(i.dir),r=e.find(a=>a.source_dir===i.dir)??(t?e.find(a=>a.piece.toLowerCase()===t.toLowerCase()&&!a.source_dir):void 0);return r?{stage:"done",piece:r.piece,variant:r.variant}:i.mesh?{stage:"mesh",piece:t,variant:null}:{stage:"mesh",piece:t,variant:null}}function M2(){const[i,e]=H.useState(v2),[t,r]=H.useState(_2),[a,l]=H.useState(2880),[c,d]=H.useState(2160),[h,f]=H.useState("pawn"),[m,g]=H.useState(.8),[x,M]=H.useState(80),[E,w]=H.useState(92),[_,y]=H.useState(null),[L,P]=H.useState(""),[C,F]=H.useState(null),N=H.useRef(null),O=H.useRef(null),[b,U]=H.useState(null),[G,D]=H.useState(""),[K,ne]=H.useState("P"),[me,k]=H.useState(null),[he,J]=H.useState("textured"),[$,ce]=H.useState(null),[ue,z]=H.useState(null),[X,Ue]=H.useState(null),[He,Ve]=H.useState(""),[oe,Se]=H.useState(!1),ve=H.useRef(null);H.useEffect(()=>(nn("/api/scan/status").then(te=>{y(te),te.default_source&&e(te.default_source),te.default_capture&&r(te.default_capture),te.out&&f(te.out)}).catch(()=>{}),()=>clearInterval(O.current)),[]);const Oe=()=>nn("/api/scan/status").then(y).catch(()=>{});function Je(){clearInterval(O.current),O.current=setInterval(Oe,1e3)}async function nt(){P("");try{const te=await fn("/api/scan/open",{source:i,width:a,height:c,capture:t});y(te),Je()}catch(te){P("Connect failed: "+te.message)}}async function Ut(){P("");try{const te=await fn("/api/scan/close");y(te),clearInterval(O.current)}catch(te){P("Disconnect failed: "+te.message)}}function dt(te){const Me=N.current.getBoundingClientRect();return{x:te.clientX-Me.left,y:te.clientY-Me.top,r:Me}}function Tt(te){if(!(_!=null&&_.open))return;te.target.setPointerCapture(te.pointerId);const{x:Me,y:ke}=dt(te);F({x0:Me,y0:ke,x1:Me,y1:ke})}function St(te){if(!C)return;const{x:Me,y:ke}=dt(te);F({...C,x1:Me,y1:ke})}async function vt(){if(!C||!_)return F(null);const te=N.current.getBoundingClientRect(),[Me,ke]=_.frame_size,it=Me/te.width,at=ke/te.height,W=Math.round(Math.min(C.x0,C.x1)*it),Pe=Math.round(Math.min(C.y0,C.y1)*at),ye=Math.round(Math.max(C.x0,C.x1)*it),De=Math.round(Math.max(C.y0,C.y1)*at);if(F(null),!(ye-W<10||De-Pe<10))try{y(await fn("/api/scan/config",{crop:[W,Pe,ye,De]}))}catch(Fe){P("Crop failed: "+Fe.message)}}async function Gt(){try{y(await fn("/api/scan/config",{crop:[]}))}catch(te){P("Crop reset failed: "+te.message)}}async function $t(){try{y(await fn("/api/scan/config",{interval:m,count:x,quality:E,out:h}))}catch(te){P("Config failed: "+te.message)}}async function qt(){P("");try{await $t();const te=await fn("/api/scan/start",{out:h});y(te),Je()}catch(te){P("Capture start failed: "+te.message)}}async function jt(){P("");try{y(await fn("/api/scan/stop"))}catch(te){P("Capture stop failed: "+te.message)}}const wt=()=>nn("/api/scan/models").then(te=>{U(te),!G&&te.scans.length&&Ft(te.scans[0],te.pieces)}).catch(()=>{});function Ft(te,Me=(b==null?void 0:b.pieces)??[]){D(te.dir);const{piece:ke}=rm(te,Me);ne(ke??"P")}async function q(te){if(confirm(`Delete scan "${te}" (mesh will be removed)?`)){P("");try{await Gl(`/api/scan/scan/${te}`),G===te&&D(""),wt()}catch(Me){P("Delete failed: "+Me.message)}}}async function un(te,Me){if(confirm(`Delete prepared piece "${te}/${Me}"? (Scan folder is kept.)`)){P("");try{await Gl(`/api/scan/piece/${te}/${Me}`),k(null),wt()}catch(ke){P("Delete failed: "+ke.message)}}}async function de(){var te;if(!(!ue||!He)){Se(!0),P("");try{const Me=new FormData;Me.append("name",He),Me.append("mesh",ue),X&&Me.append("texture",X);const ke=await fetch("/api/scan/upload",{method:"POST",body:Me});if(!ke.ok)throw new Error(((te=await ke.json())==null?void 0:te.detail)||`HTTP ${ke.status}`);await wt(),D(He),Ve(""),z(null),Ue(null)}catch(Me){P("Upload: "+Me.message)}Se(!1)}}const I=()=>nn("/api/scan/prepare/status").then(te=>{k(te),te.state!=="running"&&(clearInterval(ve.current),wt())}).catch(()=>{});H.useEffect(()=>(wt(),nn("/api/scan/prepare/status").then(te=>{te.state==="running"&&(k(te),ve.current=setInterval(I,2e3))}).catch(()=>{}),()=>{clearInterval(ve.current)}),[]);async function T(){P("");try{const te=await fn("/api/scan/prepare",{dir:G,piece:K});k({state:"running",piece:K,variant:te==null?void 0:te.variant}),clearInterval(ve.current),ve.current=setInterval(I,2e3)}catch(te){P("Prepare failed: "+te.message)}}const Z=_==null?void 0:_.recording,re=C&&{left:Math.min(C.x0,C.x1),top:Math.min(C.y0,C.y1),width:Math.abs(C.x1-C.x0),height:Math.abs(C.y1-C.y0)},ge=(b==null?void 0:b.scans)??[],be=ge.find(te=>te.dir===G),Ne=be?rm(be,(b==null?void 0:b.pieces)??[]):null,xe=Ne==null?void 0:Ne.stage,_e=(me==null?void 0:me.state)==="running",Ie=xe==="done"?2:1;let Xe;return _e?Xe="running…":xe==="done"?Xe="Re-prepare":Xe="Prepare",v.jsxs("div",{className:"space-y-4",children:[v.jsx(pn,{children:v.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Live preview stream (MJPEG, …/video/m.jpeg) or USB index.",children:["Preview",v.jsx("input",{value:i,onChange:te=>e(te.target.value),className:`${Fr} w-96`,placeholder:"Stream URL (…/video/m.jpeg) or USB index (0/1)"})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Photo to save per capture (snapshot URL, …/video/snapshot). Empty = use live frame.",children:["Photo",v.jsx("input",{value:t,onChange:te=>r(te.target.value),className:`${Fr} w-96`,placeholder:"Snapshot URL (…/video/snapshot), empty = live frame"})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"For USB cam only: requested resolution (MJPG).",children:["USB Res",v.jsx("input",{type:"number",value:a,onChange:te=>l(+te.target.value),className:`${Fr} w-20`}),"×",v.jsx("input",{type:"number",value:c,onChange:te=>d(+te.target.value),className:`${Fr} w-20`})]}),_!=null&&_.open?v.jsxs(Pt,{onClick:Ut,children:[v.jsx(kx,{className:"h-4 w-4"})," Disconnect"]}):v.jsxs(Pt,{variant:"primary",onClick:nt,children:[v.jsx(kx,{className:"h-4 w-4"})," Connect"]}),v.jsxs("span",{className:"text-xs text-zinc-500",children:[L,_!=null&&_.error?` · ${_.error}`:""]})]})}),(_==null?void 0:_.open)&&v.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_320px]",children:[v.jsxs(pn,{title:"Live · Drag crop",children:[v.jsxs("div",{className:"relative inline-block select-none leading-none",children:[v.jsx("img",{ref:N,src:"/api/scan/preview.mjpg",alt:"Scan preview",draggable:!1,className:"w-full rounded-lg border border-zinc-800"}),v.jsx("div",{className:"absolute inset-0 cursor-crosshair",onPointerDown:Tt,onPointerMove:St,onPointerUp:vt,children:re&&v.jsx("div",{className:"absolute border-2 border-sky-400 bg-sky-400/10",style:{left:re.left,top:re.top,width:re.width,height:re.height}})})]}),v.jsxs("div",{className:"mt-2 flex items-center gap-3 text-xs text-zinc-500",children:[v.jsxs("span",{children:["Source ",_.frame_size[0],"×",_.frame_size[1]]}),v.jsxs("span",{children:["Crop: ",_.crop?_.crop.join(", "):"—"]}),v.jsxs(Pt,{onClick:Gt,className:"px-2 py-1 text-xs",children:[v.jsx(lw,{className:"h-3 w-3"})," Reset crop"]})]})]}),v.jsx(pn,{title:"Capture",children:v.jsxs("div",{className:"space-y-3",children:[v.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",children:["Target folder",v.jsx("input",{value:h,onChange:te=>f(te.target.value),className:`${Fr} w-40`})]}),v.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",title:"Seconds between two photos. On phone ~0.8s is the limit (HTTPS fetch).",children:["Interval (s)",v.jsx("input",{type:"number",step:.1,min:0,value:m,onChange:te=>g(+te.target.value),className:`${Fr} w-24`})]}),v.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",title:"Photos per capture run. 0 = until stop.",children:["Count (0=∞)",v.jsx("input",{type:"number",min:0,value:x,onChange:te=>M(+te.target.value),className:`${Fr} w-24`})]}),v.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",children:["JPEG quality",v.jsx("input",{type:"number",min:50,max:100,value:E,onChange:te=>w(+te.target.value),className:`${Fr} w-24`})]}),v.jsxs("div",{className:"flex flex-wrap gap-2 pt-1",children:[Z?v.jsxs(Pt,{onClick:jt,children:[v.jsx(Y_,{className:"h-4 w-4"})," Stop"]}):v.jsxs(Pt,{variant:"primary",onClick:qt,children:[v.jsx(Em,{className:"h-4 w-4"})," Start capture"]}),v.jsxs(Pt,{onClick:$t,title:"Apply interval/count/quality without capturing",children:[v.jsx(tw,{className:"h-4 w-4"})," Apply"]})]}),v.jsxs("div",{className:"rounded-lg bg-zinc-800 p-3 text-sm",children:[Z?v.jsxs("span",{className:"font-medium text-green-500",children:["● Capture running — ",_.saved_run,_.count?` / ${_.count}`:""," photos"]}):v.jsx("span",{className:"text-zinc-400",children:"Ready"}),v.jsxs("div",{className:"mt-1 text-xs text-zinc-500",children:["In folder ",v.jsx("b",{className:"text-zinc-300",children:_.out||h}),": ",_.total," photos total (next no. ",_.index,")"]})]}),v.jsxs("p",{className:"text-xs text-zinc-500",children:["Motor on, phone/cam ",v.jsx("b",{children:"fixed"}),', hands off. "Start capture" appends to existing photos (for ring 2/3 simply reposition + start again).']})]})})]}),!(_!=null&&_.open)&&v.jsxs("p",{className:"text-xs text-zinc-500",children:["Connect a source (phone IP cam URL or USB index), drag the ",v.jsx("b",{children:"crop"})," around the piece + turntable (static background out), set ",v.jsx("b",{children:"interval"})," and ",v.jsx("b",{children:"count"})," and capture. Photos go to ",v.jsx("b",{children:"scans/<folder>"})," — ready for RealityScan."]}),v.jsxs(pn,{title:"Piece workshop — 3D scan → piece",children:[v.jsx("div",{className:"mb-4 flex items-center gap-1 text-xs",children:[[1,"Upload",K_],[2,"Prepare",Bx]].map(([te,Me,ke],it)=>v.jsxs("div",{className:"flex items-center gap-1",children:[v.jsxs("div",{className:`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${Ie>=te?"bg-sky-500/15 text-sky-300":"bg-zinc-800 text-zinc-500"}`,children:[v.jsx(ke,{className:"h-3.5 w-3.5"})," ",v.jsx("span",{children:Me})]}),it<1&&v.jsx("div",{className:`h-px w-4 ${Ie>te?"bg-sky-500/40":"bg-zinc-700"}`})]},te))}),ge.length===0&&v.jsx("p",{className:"text-sm text-zinc-500",children:"No scans yet. Upload a 3D model (.obj/.glb) — it appears here as a card."}),v.jsx(E2,{uploadName:He,setUploadName:Ve,meshFile:ue,setMeshFile:z,texFile:X,setTexFile:Ue,uploading:oe,doUpload:de,input:Fr}),v.jsx(w2,{scans:ge,models:b,dir:G,selectScan:Ft,deleteScan:q,prep:me}),be&&v.jsxs("div",{className:"mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4",children:[v.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[v.jsxs("div",{className:"flex items-center gap-2",children:[v.jsxs("div",{children:[v.jsx("div",{className:"text-sm font-medium text-zinc-100",children:be.dir}),v.jsxs("div",{className:"text-xs text-zinc-500",children:[be.mesh?"Mesh present":"no mesh yet",!be.texture&&be.mesh?" · ⚠ without texture":""]})]}),v.jsx("button",{onClick:()=>q(be.dir),title:"Delete scan",className:"rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400",children:v.jsx(wa,{className:"h-4 w-4"})})]}),v.jsxs(Pt,{variant:"primary",onClick:T,disabled:_e,children:[_e?v.jsx(Nn,{className:"h-4 w-4 animate-spin"}):v.jsx(Bx,{className:"h-4 w-4"}),Xe]})]}),v.jsx(T2,{cur:be,busyPrep:_e,prep:me}),L&&v.jsx("p",{className:"mt-2 text-sm text-red-400",children:L})]}),v.jsx(C2,{pieces:b==null?void 0:b.pieces,setView3d:ce,deletePiece:un,prep:me,kind:he,setKind:J})]}),$&&v.jsx(b2,{piece:$.piece,variant:$.variant,textured:he==="textured",onClose:()=>ce(null)})]})}function E2({uploadName:i,setUploadName:e,meshFile:t,setMeshFile:r,texFile:a,setTexFile:l,uploading:c,doUpload:d,input:h}){return v.jsxs("div",{className:"mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3",children:[v.jsx("div",{className:"mb-2 text-xs font-medium text-zinc-400",children:"Upload 3D model (.obj/.glb)"}),v.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[v.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Name",v.jsx("input",{value:i,onChange:f=>e(f.target.value),placeholder:"e.g. wK",className:`${h} w-32`})]}),v.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Mesh (.obj/.glb)",v.jsx("input",{type:"file",accept:".obj,.glb,.gltf",onChange:f=>{var m;return r(((m=f.target.files)==null?void 0:m[0])??null)},className:"text-xs text-zinc-300 file:mr-1 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-0.5 file:text-xs file:text-zinc-200"})]}),v.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Texture (optional)",v.jsx("input",{type:"file",accept:".png,.jpg,.jpeg",onChange:f=>{var m;return l(((m=f.target.files)==null?void 0:m[0])??null)},className:"text-xs text-zinc-300 file:mr-1 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-0.5 file:text-xs file:text-zinc-200"})]}),v.jsxs(Pt,{variant:"primary",onClick:d,disabled:c||!t||!i,children:[c?v.jsx(Nn,{className:"h-4 w-4 animate-spin"}):v.jsx(K_,{className:"h-4 w-4"}),"Upload"]})]})]})}function w2({scans:i,models:e,dir:t,selectScan:r,deleteScan:a,prep:l}){return v.jsx("div",{className:"grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4",children:i.map(c=>{var M;const d=rm(c,(e==null?void 0:e.pieces)??[]),h=c.dir===t,m=(l==null?void 0:l.state)==="running"&&l.dir===c.dir||((M=e==null?void 0:e.jobs)==null?void 0:M.prepare)===c.dir,g=m?["preparing…","bg-sky-500/20 text-sky-300"]:{mesh:["Mesh ready","bg-sky-500/15 text-sky-300"],done:["Ready","bg-green-500/15 text-green-300"]}[d.stage],x=d.piece&&d.stage==="done";return v.jsxs("div",{onClick:()=>r(c),role:"button",tabIndex:0,onKeyDown:E=>{(E.key==="Enter"||E.key===" ")&&(E.preventDefault(),r(c))},className:`group relative flex cursor-pointer flex-col rounded-xl border p-2 text-left transition ${h?"border-sky-500 bg-sky-500/5":"border-zinc-800 hover:border-zinc-600"}`,children:[v.jsxs("div",{className:"relative mb-1.5 aspect-square overflow-hidden rounded-lg bg-zinc-950",children:[x?v.jsx("img",{src:`/api/scan/prepare/preview/${d.piece}/${d.variant}?kind=textured`,alt:`${ud(d.piece)} preview`,className:"h-full w-full object-contain"}):v.jsx("div",{className:"grid h-full place-items-center text-zinc-700",children:v.jsx(Mm,{className:"h-8 w-8"})}),v.jsxs("span",{className:`absolute left-1 top-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${g[1]}`,children:[m&&v.jsx(Nn,{className:"h-3 w-3 animate-spin"}),g[0]]}),v.jsx("button",{onClick:E=>{E.stopPropagation(),a(c.dir)},title:"Delete scan folder",className:"absolute right-1 top-1 hidden rounded bg-zinc-900/80 p-1 text-zinc-400 hover:text-red-400 group-hover:block",children:v.jsx(wa,{className:"h-3.5 w-3.5"})})]}),v.jsx("div",{className:"text-sm font-medium text-zinc-200",children:c.dir}),v.jsx("div",{className:"text-[11px] text-zinc-500",children:d.piece?`${ud(d.piece)}`:""})]},c.dir)})})}function b2({piece:i,variant:e,textured:t,onClose:r}){const[a,l]=H.useState(t);return H.useEffect(()=>{const c=d=>d.key==="Escape"&&r();return window.addEventListener("keydown",c),()=>window.removeEventListener("keydown",c)},[r]),v.jsx("div",{onClick:r,role:"button",tabIndex:0,onKeyDown:c=>{(c.key==="Enter"||c.key===" ")&&(c.preventDefault(),r())},className:"fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-6",children:v.jsxs("div",{onClick:c=>c.stopPropagation(),role:"presentation",onKeyDown:c=>c.stopPropagation(),className:"flex flex-col items-center gap-3",children:[v.jsx(g2,{piece:i,variant:e,textured:a,size:Math.min(720,window.innerHeight-160)}),v.jsxs("div",{className:"flex items-center gap-3 text-sm text-zinc-300",children:[v.jsxs("span",{className:"font-medium",children:[i,"/",e]}),v.jsx(Dy,{value:a?"textured":"clay",onChange:c=>l(c==="textured")}),v.jsx("span",{className:"text-xs text-zinc-500",children:"drag to rotate · scroll to zoom · Esc to close"})]})]})})}function T2({cur:i,busyPrep:e,prep:t}){return v.jsxs(v.Fragment,{children:[e&&v.jsxs("div",{className:"flex items-center gap-2 rounded-lg bg-sky-500/10 p-3 text-sm text-sky-300",children:[v.jsx(Nn,{className:"h-4 w-4 animate-spin"})," Piece is being prepared — about 1-3 min…"]}),(t==null?void 0:t.state)==="failed"&&v.jsxs("div",{className:"rounded-lg bg-red-500/10 p-3 text-sm text-red-300",children:[v.jsxs("div",{className:"flex items-center gap-2",children:[v.jsx(wm,{className:"h-4 w-4"})," Preparation failed."]}),t.log_tail&&v.jsx("pre",{className:"mt-1 whitespace-pre-wrap text-xs text-red-400/70",children:t.log_tail})]})]})}function C2({pieces:i,setView3d:e,deletePiece:t,prep:r,kind:a,setKind:l}){return i!=null&&i.length?v.jsxs("div",{className:"mt-4 border-t border-zinc-800 pt-3",children:[v.jsx("div",{className:"mb-2 text-xs font-medium text-zinc-400",children:"Finished pieces (synth_pieces/)"}),v.jsx("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",children:i.map(c=>{var h,f;const d=(r==null?void 0:r.state)==="running"&&r.piece===c.piece&&r.variant===c.variant;return v.jsxs("div",{className:"relative rounded-xl border border-zinc-800 bg-zinc-900/50 p-2",children:[v.jsxs("div",{className:"relative mb-2 aspect-square overflow-hidden rounded-lg bg-zinc-950",children:[c.has_preview?v.jsx("img",{src:`/api/scan/prepare/preview/${c.piece}/${c.variant}?kind=${a}`,alt:`${ud(c.piece)}`,className:"h-full w-full object-contain"}):v.jsx("div",{className:"grid h-full place-items-center text-zinc-700",children:v.jsx(sw,{className:"h-8 w-8"})}),v.jsx("button",{onClick:()=>e({piece:c.piece,variant:c.variant}),title:"Open 3D view",className:"absolute right-1 top-1 rounded bg-zinc-900/80 p-1 text-zinc-400 hover:text-white",children:v.jsx(ow,{className:"h-3.5 w-3.5"})})]}),v.jsxs("div",{className:"flex items-center justify-between",children:[v.jsxs("span",{className:"text-sm font-medium text-zinc-200",children:[ud(c.piece)," · ",c.variant]}),d&&v.jsx(Nn,{className:"h-3.5 w-3.5 animate-spin text-sky-400"})]}),v.jsx(Dy,{value:a,onChange:l,clayDisabled:!c.has_clay}),c.report&&v.jsx(R2,{piece:c.piece,variant:c.variant,report:c.report,level:(h=c.report)==null?void 0:h.level,messages:(f=c.report)==null?void 0:f.messages,onDelete:t})]},c.id)})})]}):null}function R2({piece:i,variant:e,report:t,level:r,messages:a,onDelete:l}){return!t||!t.tris?null:v.jsxs("div",{className:"mt-2 rounded-lg bg-zinc-800 p-2 text-[11px] text-zinc-400",children:[r&&v.jsxs("div",{className:`mb-1 flex items-center gap-1 font-medium ${r==="ok"?"text-green-400":"text-amber-400"}`,children:[r==="ok"?v.jsx(q_,{className:"h-4 w-4"}):v.jsx(wm,{className:"h-4 w-4"}),r==="ok"?"Quality OK":"Please check"]}),(a??[]).map((c,d)=>v.jsxs("div",{className:"text-amber-300/90",children:["• ",c]},d)),v.jsxs("div",{className:"grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pt-1",children:[v.jsx("span",{className:"text-zinc-500",children:"Triangles"}),v.jsx("span",{children:t.tris}),v.jsx("span",{className:"text-zinc-500",children:"open edges"}),v.jsx("span",{children:t.boundary_edges}),v.jsx("span",{className:"text-zinc-500",children:"Height/Base"}),v.jsx("span",{children:t.height_ratio})]}),v.jsxs("div",{className:"pt-1 text-zinc-500",children:["→ synth_pieces/",i,"/",e,".obj"]}),v.jsxs("button",{onClick:()=>l(i,e),className:"mt-1 flex items-center gap-1 text-red-400/80 hover:text-red-400",children:[v.jsx(wa,{className:"h-3.5 w-3.5"})," Delete piece"]})]})}function Dy({value:i,onChange:e,clayDisabled:t}){return v.jsxs("div",{className:"mt-2 flex overflow-hidden rounded-lg border border-zinc-700 text-xs",children:[v.jsx("button",{onClick:()=>e("textured"),className:`px-3 py-1 ${i==="textured"?"bg-sky-600 text-white":"text-zinc-400 hover:bg-zinc-700"}`,children:"Textured"}),v.jsx("button",{onClick:()=>e("clay"),disabled:t,title:t?"no clay image (piece prepared before this update)":"geometry only",className:`px-3 py-1 ${i==="clay"?"bg-sky-600 text-white":"text-zinc-400 hover:bg-zinc-700"} ${t?"cursor-not-allowed opacity-40":""}`,children:"Clay"})]})}const A2=[{to:"/collect",label:"Collect",icon:Mm},{to:"/scan",label:"Scan",icon:Y1},{to:"/datasets",label:"Datasets",icon:iw},{to:"/training",label:"Training",icon:Q1}],P2=({isActive:i})=>`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${i?"bg-zinc-800 text-zinc-100":"text-zinc-400 hover:text-zinc-100"}`;function N2(){return v.jsx(D1,{children:v.jsxs("div",{className:"min-h-full",children:[v.jsx("header",{className:"sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur",children:v.jsxs("div",{className:"mx-auto flex max-w-7xl items-center gap-6 px-5 py-3",children:[v.jsxs("div",{className:"flex items-center gap-2 font-semibold tracking-tight",children:[v.jsx(nw,{className:"h-5 w-5 text-sky-400"})," chesslab"]}),v.jsx("nav",{className:"flex flex-wrap gap-1",children:A2.map(i=>{const e=i.icon;return v.jsxs(mo,{to:i.to,className:P2,children:[v.jsx(e,{className:"h-4 w-4"})," ",i.label]},i.to)})})]})}),v.jsx("main",{className:"mx-auto max-w-7xl px-5 py-6",children:v.jsxs(l1,{children:[v.jsx($i,{path:"/",element:v.jsx(of,{to:"/collect",replace:!0})}),v.jsx($i,{path:"/collect",element:v.jsx(pw,{})}),v.jsx($i,{path:"/scan",element:v.jsx(M2,{})}),v.jsxs($i,{path:"/datasets",element:v.jsx(gw,{}),children:[v.jsx($i,{index:!0,element:v.jsx(of,{to:"sessions",replace:!0})}),v.jsx($i,{path:"sessions",element:v.jsx(xw,{})}),v.jsx($i,{path:"curated",element:v.jsx(vw,{})}),v.jsx($i,{path:"stats",element:v.jsx(_w,{})})]}),v.jsx($i,{path:"/training",element:v.jsx(Ew,{})}),v.jsx($i,{path:"*",element:v.jsx(of,{to:"/collect",replace:!0})})]})})]})})}const L2=new qM({defaultOptions:{queries:{staleTime:0,refetchOnWindowFocus:!0,refetchOnMount:"always",retry:1}}});MM.createRoot(document.getElementById("root")).render(v.jsx(gM.StrictMode,{children:v.jsx(YM,{client:L2,children:v.jsx(N2,{})})}));
