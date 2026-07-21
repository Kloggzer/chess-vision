var fx=i=>{throw TypeError(i)};var tf=(i,e,t)=>e.has(i)||fx("Cannot "+t);var W=(i,e,t)=>(tf(i,e,"read from private field"),t?t.call(i):e.get(i)),st=(i,e,t)=>e.has(i)?fx("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(i):e.set(i,t),He=(i,e,t,r)=>(tf(i,e,"write to private field"),r?r.call(i,t):e.set(i,t),t),gt=(i,e,t)=>(tf(i,e,"access private method"),t);var uu=(i,e,t,r)=>({set _(a){He(i,e,a,t)},get _(){return W(i,e,r)}});(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))r(a);new MutationObserver(a=>{for(const l of a)if(l.type==="childList")for(const c of l.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&r(c)}).observe(document,{childList:!0,subtree:!0});function t(a){const l={};return a.integrity&&(l.integrity=a.integrity),a.referrerPolicy&&(l.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?l.credentials="include":a.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function r(a){if(a.ep)return;a.ep=!0;const l=t(a);fetch(a.href,l)}})();function gM(i){return i&&i.__esModule&&Object.prototype.hasOwnProperty.call(i,"default")?i.default:i}var nf={exports:{}},wl={},rf={exports:{}},Et={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var px;function xM(){if(px)return Et;px=1;var i=Symbol.for("react.element"),e=Symbol.for("react.portal"),t=Symbol.for("react.fragment"),r=Symbol.for("react.strict_mode"),a=Symbol.for("react.profiler"),l=Symbol.for("react.provider"),c=Symbol.for("react.context"),d=Symbol.for("react.forward_ref"),h=Symbol.for("react.suspense"),f=Symbol.for("react.memo"),m=Symbol.for("react.lazy"),x=Symbol.iterator;function g(H){return H===null||typeof H!="object"?null:(H=x&&H[x]||H["@@iterator"],typeof H=="function"?H:null)}var M={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},E=Object.assign,w={};function S(H,F,Te){this.props=H,this.context=F,this.refs=w,this.updater=Te||M}S.prototype.isReactComponent={},S.prototype.setState=function(H,F){if(typeof H!="object"&&typeof H!="function"&&H!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,H,F,"setState")},S.prototype.forceUpdate=function(H){this.updater.enqueueForceUpdate(this,H,"forceUpdate")};function y(){}y.prototype=S.prototype;function N(H,F,Te){this.props=H,this.context=F,this.refs=w,this.updater=Te||M}var L=N.prototype=new y;L.constructor=N,E(L,S.prototype),L.isPureReactComponent=!0;var C=Array.isArray,D=Object.prototype.hasOwnProperty,P={current:null},U={key:!0,ref:!0,__self:!0,__source:!0};function b(H,F,Te){var Oe,ze={},ie=null,Me=null;if(F!=null)for(Oe in F.ref!==void 0&&(Me=F.ref),F.key!==void 0&&(ie=""+F.key),F)D.call(F,Oe)&&!U.hasOwnProperty(Oe)&&(ze[Oe]=F[Oe]);var xe=arguments.length-2;if(xe===1)ze.children=Te;else if(1<xe){for(var Fe=Array(xe),Xe=0;Xe<xe;Xe++)Fe[Xe]=arguments[Xe+2];ze.children=Fe}if(H&&H.defaultProps)for(Oe in xe=H.defaultProps,xe)ze[Oe]===void 0&&(ze[Oe]=xe[Oe]);return{$$typeof:i,type:H,key:ie,ref:Me,props:ze,_owner:P.current}}function I(H,F){return{$$typeof:i,type:H.type,key:F,ref:H.ref,props:H.props,_owner:H._owner}}function X(H){return typeof H=="object"&&H!==null&&H.$$typeof===i}function O(H){var F={"=":"=0",":":"=2"};return"$"+H.replace(/[=:]/g,function(Te){return F[Te]})}var K=/\/+/g;function se(H,F){return typeof H=="object"&&H!==null&&H.key!=null?O(""+H.key):F.toString(36)}function fe(H,F,Te,Oe,ze){var ie=typeof H;(ie==="undefined"||ie==="boolean")&&(H=null);var Me=!1;if(H===null)Me=!0;else switch(ie){case"string":case"number":Me=!0;break;case"object":switch(H.$$typeof){case i:case e:Me=!0}}if(Me)return Me=H,ze=ze(Me),H=Oe===""?"."+se(Me,0):Oe,C(ze)?(Te="",H!=null&&(Te=H.replace(K,"$&/")+"/"),fe(ze,F,Te,"",function(Xe){return Xe})):ze!=null&&(X(ze)&&(ze=I(ze,Te+(!ze.key||Me&&Me.key===ze.key?"":(""+ze.key).replace(K,"$&/")+"/")+H)),F.push(ze)),1;if(Me=0,Oe=Oe===""?".":Oe+":",C(H))for(var xe=0;xe<H.length;xe++){ie=H[xe];var Fe=Oe+se(ie,xe);Me+=fe(ie,F,Te,Fe,ze)}else if(Fe=g(H),typeof Fe=="function")for(H=Fe.call(H),xe=0;!(ie=H.next()).done;)ie=ie.value,Fe=Oe+se(ie,xe++),Me+=fe(ie,F,Te,Fe,ze);else if(ie==="object")throw F=String(H),Error("Objects are not valid as a React child (found: "+(F==="[object Object]"?"object with keys {"+Object.keys(H).join(", ")+"}":F)+"). If you meant to render a collection of children, use an array instead.");return Me}function Y(H,F,Te){if(H==null)return H;var Oe=[],ze=0;return fe(H,Oe,"","",function(ie){return F.call(Te,ie,ze++)}),Oe}function me(H){if(H._status===-1){var F=H._result;F=F(),F.then(function(Te){(H._status===0||H._status===-1)&&(H._status=1,H._result=Te)},function(Te){(H._status===0||H._status===-1)&&(H._status=2,H._result=Te)}),H._status===-1&&(H._status=0,H._result=F)}if(H._status===1)return H._result.default;throw H._result}var B={current:null},$={transition:null},ne={ReactCurrentDispatcher:B,ReactCurrentBatchConfig:$,ReactCurrentOwner:P};function ce(){throw Error("act(...) is not supported in production builds of React.")}return Et.Children={map:Y,forEach:function(H,F,Te){Y(H,function(){F.apply(this,arguments)},Te)},count:function(H){var F=0;return Y(H,function(){F++}),F},toArray:function(H){return Y(H,function(F){return F})||[]},only:function(H){if(!X(H))throw Error("React.Children.only expected to receive a single React element child.");return H}},Et.Component=S,Et.Fragment=t,Et.Profiler=a,Et.PureComponent=N,Et.StrictMode=r,Et.Suspense=h,Et.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=ne,Et.act=ce,Et.cloneElement=function(H,F,Te){if(H==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+H+".");var Oe=E({},H.props),ze=H.key,ie=H.ref,Me=H._owner;if(F!=null){if(F.ref!==void 0&&(ie=F.ref,Me=P.current),F.key!==void 0&&(ze=""+F.key),H.type&&H.type.defaultProps)var xe=H.type.defaultProps;for(Fe in F)D.call(F,Fe)&&!U.hasOwnProperty(Fe)&&(Oe[Fe]=F[Fe]===void 0&&xe!==void 0?xe[Fe]:F[Fe])}var Fe=arguments.length-2;if(Fe===1)Oe.children=Te;else if(1<Fe){xe=Array(Fe);for(var Xe=0;Xe<Fe;Xe++)xe[Xe]=arguments[Xe+2];Oe.children=xe}return{$$typeof:i,type:H.type,key:ze,ref:ie,props:Oe,_owner:Me}},Et.createContext=function(H){return H={$$typeof:c,_currentValue:H,_currentValue2:H,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},H.Provider={$$typeof:l,_context:H},H.Consumer=H},Et.createElement=b,Et.createFactory=function(H){var F=b.bind(null,H);return F.type=H,F},Et.createRef=function(){return{current:null}},Et.forwardRef=function(H){return{$$typeof:d,render:H}},Et.isValidElement=X,Et.lazy=function(H){return{$$typeof:m,_payload:{_status:-1,_result:H},_init:me}},Et.memo=function(H,F){return{$$typeof:f,type:H,compare:F===void 0?null:F}},Et.startTransition=function(H){var F=$.transition;$.transition={};try{H()}finally{$.transition=F}},Et.unstable_act=ce,Et.useCallback=function(H,F){return B.current.useCallback(H,F)},Et.useContext=function(H){return B.current.useContext(H)},Et.useDebugValue=function(){},Et.useDeferredValue=function(H){return B.current.useDeferredValue(H)},Et.useEffect=function(H,F){return B.current.useEffect(H,F)},Et.useId=function(){return B.current.useId()},Et.useImperativeHandle=function(H,F,Te){return B.current.useImperativeHandle(H,F,Te)},Et.useInsertionEffect=function(H,F){return B.current.useInsertionEffect(H,F)},Et.useLayoutEffect=function(H,F){return B.current.useLayoutEffect(H,F)},Et.useMemo=function(H,F){return B.current.useMemo(H,F)},Et.useReducer=function(H,F,Te){return B.current.useReducer(H,F,Te)},Et.useRef=function(H){return B.current.useRef(H)},Et.useState=function(H){return B.current.useState(H)},Et.useSyncExternalStore=function(H,F,Te){return B.current.useSyncExternalStore(H,F,Te)},Et.useTransition=function(){return B.current.useTransition()},Et.version="18.3.1",Et}var mx;function cm(){return mx||(mx=1,rf.exports=xM()),rf.exports}/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var gx;function vM(){if(gx)return wl;gx=1;var i=cm(),e=Symbol.for("react.element"),t=Symbol.for("react.fragment"),r=Object.prototype.hasOwnProperty,a=i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,l={key:!0,ref:!0,__self:!0,__source:!0};function c(d,h,f){var m,x={},g=null,M=null;f!==void 0&&(g=""+f),h.key!==void 0&&(g=""+h.key),h.ref!==void 0&&(M=h.ref);for(m in h)r.call(h,m)&&!l.hasOwnProperty(m)&&(x[m]=h[m]);if(d&&d.defaultProps)for(m in h=d.defaultProps,h)x[m]===void 0&&(x[m]=h[m]);return{$$typeof:e,type:d,key:g,ref:M,props:x,_owner:a.current}}return wl.Fragment=t,wl.jsx=c,wl.jsxs=c,wl}var xx;function _M(){return xx||(xx=1,nf.exports=vM()),nf.exports}var v=_M(),G=cm();const yM=gM(G);var du={},sf={exports:{}},oi={},af={exports:{}},of={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var vx;function SM(){return vx||(vx=1,(function(i){function e($,ne){var ce=$.length;$.push(ne);e:for(;0<ce;){var H=ce-1>>>1,F=$[H];if(0<a(F,ne))$[H]=ne,$[ce]=F,ce=H;else break e}}function t($){return $.length===0?null:$[0]}function r($){if($.length===0)return null;var ne=$[0],ce=$.pop();if(ce!==ne){$[0]=ce;e:for(var H=0,F=$.length,Te=F>>>1;H<Te;){var Oe=2*(H+1)-1,ze=$[Oe],ie=Oe+1,Me=$[ie];if(0>a(ze,ce))ie<F&&0>a(Me,ze)?($[H]=Me,$[ie]=ce,H=ie):($[H]=ze,$[Oe]=ce,H=Oe);else if(ie<F&&0>a(Me,ce))$[H]=Me,$[ie]=ce,H=ie;else break e}}return ne}function a($,ne){var ce=$.sortIndex-ne.sortIndex;return ce!==0?ce:$.id-ne.id}if(typeof performance=="object"&&typeof performance.now=="function"){var l=performance;i.unstable_now=function(){return l.now()}}else{var c=Date,d=c.now();i.unstable_now=function(){return c.now()-d}}var h=[],f=[],m=1,x=null,g=3,M=!1,E=!1,w=!1,S=typeof setTimeout=="function"?setTimeout:null,y=typeof clearTimeout=="function"?clearTimeout:null,N=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function L($){for(var ne=t(f);ne!==null;){if(ne.callback===null)r(f);else if(ne.startTime<=$)r(f),ne.sortIndex=ne.expirationTime,e(h,ne);else break;ne=t(f)}}function C($){if(w=!1,L($),!E)if(t(h)!==null)E=!0,me(D);else{var ne=t(f);ne!==null&&B(C,ne.startTime-$)}}function D($,ne){E=!1,w&&(w=!1,y(b),b=-1),M=!0;var ce=g;try{for(L(ne),x=t(h);x!==null&&(!(x.expirationTime>ne)||$&&!O());){var H=x.callback;if(typeof H=="function"){x.callback=null,g=x.priorityLevel;var F=H(x.expirationTime<=ne);ne=i.unstable_now(),typeof F=="function"?x.callback=F:x===t(h)&&r(h),L(ne)}else r(h);x=t(h)}if(x!==null)var Te=!0;else{var Oe=t(f);Oe!==null&&B(C,Oe.startTime-ne),Te=!1}return Te}finally{x=null,g=ce,M=!1}}var P=!1,U=null,b=-1,I=5,X=-1;function O(){return!(i.unstable_now()-X<I)}function K(){if(U!==null){var $=i.unstable_now();X=$;var ne=!0;try{ne=U(!0,$)}finally{ne?se():(P=!1,U=null)}}else P=!1}var se;if(typeof N=="function")se=function(){N(K)};else if(typeof MessageChannel<"u"){var fe=new MessageChannel,Y=fe.port2;fe.port1.onmessage=K,se=function(){Y.postMessage(null)}}else se=function(){S(K,0)};function me($){U=$,P||(P=!0,se())}function B($,ne){b=S(function(){$(i.unstable_now())},ne)}i.unstable_IdlePriority=5,i.unstable_ImmediatePriority=1,i.unstable_LowPriority=4,i.unstable_NormalPriority=3,i.unstable_Profiling=null,i.unstable_UserBlockingPriority=2,i.unstable_cancelCallback=function($){$.callback=null},i.unstable_continueExecution=function(){E||M||(E=!0,me(D))},i.unstable_forceFrameRate=function($){0>$||125<$?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):I=0<$?Math.floor(1e3/$):5},i.unstable_getCurrentPriorityLevel=function(){return g},i.unstable_getFirstCallbackNode=function(){return t(h)},i.unstable_next=function($){switch(g){case 1:case 2:case 3:var ne=3;break;default:ne=g}var ce=g;g=ne;try{return $()}finally{g=ce}},i.unstable_pauseExecution=function(){},i.unstable_requestPaint=function(){},i.unstable_runWithPriority=function($,ne){switch($){case 1:case 2:case 3:case 4:case 5:break;default:$=3}var ce=g;g=$;try{return ne()}finally{g=ce}},i.unstable_scheduleCallback=function($,ne,ce){var H=i.unstable_now();switch(typeof ce=="object"&&ce!==null?(ce=ce.delay,ce=typeof ce=="number"&&0<ce?H+ce:H):ce=H,$){case 1:var F=-1;break;case 2:F=250;break;case 5:F=1073741823;break;case 4:F=1e4;break;default:F=5e3}return F=ce+F,$={id:m++,callback:ne,priorityLevel:$,startTime:ce,expirationTime:F,sortIndex:-1},ce>H?($.sortIndex=ce,e(f,$),t(h)===null&&$===t(f)&&(w?(y(b),b=-1):w=!0,B(C,ce-H))):($.sortIndex=F,e(h,$),E||M||(E=!0,me(D))),$},i.unstable_shouldYield=O,i.unstable_wrapCallback=function($){var ne=g;return function(){var ce=g;g=ne;try{return $.apply(this,arguments)}finally{g=ce}}}})(of)),of}var _x;function MM(){return _x||(_x=1,af.exports=SM()),af.exports}/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var yx;function EM(){if(yx)return oi;yx=1;var i=cm(),e=MM();function t(n){for(var s="https://reactjs.org/docs/error-decoder.html?invariant="+n,o=1;o<arguments.length;o++)s+="&args[]="+encodeURIComponent(arguments[o]);return"Minified React error #"+n+"; visit "+s+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var r=new Set,a={};function l(n,s){c(n,s),c(n+"Capture",s)}function c(n,s){for(a[n]=s,n=0;n<s.length;n++)r.add(s[n])}var d=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),h=Object.prototype.hasOwnProperty,f=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,m={},x={};function g(n){return h.call(x,n)?!0:h.call(m,n)?!1:f.test(n)?x[n]=!0:(m[n]=!0,!1)}function M(n,s,o,u){if(o!==null&&o.type===0)return!1;switch(typeof s){case"function":case"symbol":return!0;case"boolean":return u?!1:o!==null?!o.acceptsBooleans:(n=n.toLowerCase().slice(0,5),n!=="data-"&&n!=="aria-");default:return!1}}function E(n,s,o,u){if(s===null||typeof s>"u"||M(n,s,o,u))return!0;if(u)return!1;if(o!==null)switch(o.type){case 3:return!s;case 4:return s===!1;case 5:return isNaN(s);case 6:return isNaN(s)||1>s}return!1}function w(n,s,o,u,p,_,R){this.acceptsBooleans=s===2||s===3||s===4,this.attributeName=u,this.attributeNamespace=p,this.mustUseProperty=o,this.propertyName=n,this.type=s,this.sanitizeURL=_,this.removeEmptyString=R}var S={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(n){S[n]=new w(n,0,!1,n,null,!1,!1)}),[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(n){var s=n[0];S[s]=new w(s,1,!1,n[1],null,!1,!1)}),["contentEditable","draggable","spellCheck","value"].forEach(function(n){S[n]=new w(n,2,!1,n.toLowerCase(),null,!1,!1)}),["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(n){S[n]=new w(n,2,!1,n,null,!1,!1)}),"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(n){S[n]=new w(n,3,!1,n.toLowerCase(),null,!1,!1)}),["checked","multiple","muted","selected"].forEach(function(n){S[n]=new w(n,3,!0,n,null,!1,!1)}),["capture","download"].forEach(function(n){S[n]=new w(n,4,!1,n,null,!1,!1)}),["cols","rows","size","span"].forEach(function(n){S[n]=new w(n,6,!1,n,null,!1,!1)}),["rowSpan","start"].forEach(function(n){S[n]=new w(n,5,!1,n.toLowerCase(),null,!1,!1)});var y=/[\-:]([a-z])/g;function N(n){return n[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(n){var s=n.replace(y,N);S[s]=new w(s,1,!1,n,null,!1,!1)}),"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(n){var s=n.replace(y,N);S[s]=new w(s,1,!1,n,"http://www.w3.org/1999/xlink",!1,!1)}),["xml:base","xml:lang","xml:space"].forEach(function(n){var s=n.replace(y,N);S[s]=new w(s,1,!1,n,"http://www.w3.org/XML/1998/namespace",!1,!1)}),["tabIndex","crossOrigin"].forEach(function(n){S[n]=new w(n,1,!1,n.toLowerCase(),null,!1,!1)}),S.xlinkHref=new w("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1),["src","href","action","formAction"].forEach(function(n){S[n]=new w(n,1,!1,n.toLowerCase(),null,!0,!0)});function L(n,s,o,u){var p=S.hasOwnProperty(s)?S[s]:null;(p!==null?p.type!==0:u||!(2<s.length)||s[0]!=="o"&&s[0]!=="O"||s[1]!=="n"&&s[1]!=="N")&&(E(s,o,p,u)&&(o=null),u||p===null?g(s)&&(o===null?n.removeAttribute(s):n.setAttribute(s,""+o)):p.mustUseProperty?n[p.propertyName]=o===null?p.type===3?!1:"":o:(s=p.attributeName,u=p.attributeNamespace,o===null?n.removeAttribute(s):(p=p.type,o=p===3||p===4&&o===!0?"":""+o,u?n.setAttributeNS(u,s,o):n.setAttribute(s,o))))}var C=i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,D=Symbol.for("react.element"),P=Symbol.for("react.portal"),U=Symbol.for("react.fragment"),b=Symbol.for("react.strict_mode"),I=Symbol.for("react.profiler"),X=Symbol.for("react.provider"),O=Symbol.for("react.context"),K=Symbol.for("react.forward_ref"),se=Symbol.for("react.suspense"),fe=Symbol.for("react.suspense_list"),Y=Symbol.for("react.memo"),me=Symbol.for("react.lazy"),B=Symbol.for("react.offscreen"),$=Symbol.iterator;function ne(n){return n===null||typeof n!="object"?null:(n=$&&n[$]||n["@@iterator"],typeof n=="function"?n:null)}var ce=Object.assign,H;function F(n){if(H===void 0)try{throw Error()}catch(o){var s=o.stack.trim().match(/\n( *(at )?)/);H=s&&s[1]||""}return`
`+H+n}var Te=!1;function Oe(n,s){if(!n||Te)return"";Te=!0;var o=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(s)if(s=function(){throw Error()},Object.defineProperty(s.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(s,[])}catch(pe){var u=pe}Reflect.construct(n,[],s)}else{try{s.call()}catch(pe){u=pe}n.call(s.prototype)}else{try{throw Error()}catch(pe){u=pe}n()}}catch(pe){if(pe&&u&&typeof pe.stack=="string"){for(var p=pe.stack.split(`
`),_=u.stack.split(`
`),R=p.length-1,V=_.length-1;1<=R&&0<=V&&p[R]!==_[V];)V--;for(;1<=R&&0<=V;R--,V--)if(p[R]!==_[V]){if(R!==1||V!==1)do if(R--,V--,0>V||p[R]!==_[V]){var q=`
`+p[R].replace(" at new "," at ");return n.displayName&&q.includes("<anonymous>")&&(q=q.replace("<anonymous>",n.displayName)),q}while(1<=R&&0<=V);break}}}finally{Te=!1,Error.prepareStackTrace=o}return(n=n?n.displayName||n.name:"")?F(n):""}function ze(n){switch(n.tag){case 5:return F(n.type);case 16:return F("Lazy");case 13:return F("Suspense");case 19:return F("SuspenseList");case 0:case 2:case 15:return n=Oe(n.type,!1),n;case 11:return n=Oe(n.type.render,!1),n;case 1:return n=Oe(n.type,!0),n;default:return""}}function ie(n){if(n==null)return null;if(typeof n=="function")return n.displayName||n.name||null;if(typeof n=="string")return n;switch(n){case U:return"Fragment";case P:return"Portal";case I:return"Profiler";case b:return"StrictMode";case se:return"Suspense";case fe:return"SuspenseList"}if(typeof n=="object")switch(n.$$typeof){case O:return(n.displayName||"Context")+".Consumer";case X:return(n._context.displayName||"Context")+".Provider";case K:var s=n.render;return n=n.displayName,n||(n=s.displayName||s.name||"",n=n!==""?"ForwardRef("+n+")":"ForwardRef"),n;case Y:return s=n.displayName||null,s!==null?s:ie(n.type)||"Memo";case me:s=n._payload,n=n._init;try{return ie(n(s))}catch{}}return null}function Me(n){var s=n.type;switch(n.tag){case 24:return"Cache";case 9:return(s.displayName||"Context")+".Consumer";case 10:return(s._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return n=s.render,n=n.displayName||n.name||"",s.displayName||(n!==""?"ForwardRef("+n+")":"ForwardRef");case 7:return"Fragment";case 5:return s;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return ie(s);case 8:return s===b?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof s=="function")return s.displayName||s.name||null;if(typeof s=="string")return s}return null}function xe(n){switch(typeof n){case"boolean":case"number":case"string":case"undefined":return n;case"object":return n;default:return""}}function Fe(n){var s=n.type;return(n=n.nodeName)&&n.toLowerCase()==="input"&&(s==="checkbox"||s==="radio")}function Xe(n){var s=Fe(n)?"checked":"value",o=Object.getOwnPropertyDescriptor(n.constructor.prototype,s),u=""+n[s];if(!n.hasOwnProperty(s)&&typeof o<"u"&&typeof o.get=="function"&&typeof o.set=="function"){var p=o.get,_=o.set;return Object.defineProperty(n,s,{configurable:!0,get:function(){return p.call(this)},set:function(R){u=""+R,_.call(this,R)}}),Object.defineProperty(n,s,{enumerable:o.enumerable}),{getValue:function(){return u},setValue:function(R){u=""+R},stopTracking:function(){n._valueTracker=null,delete n[s]}}}}function Qe(n){n._valueTracker||(n._valueTracker=Xe(n))}function It(n){if(!n)return!1;var s=n._valueTracker;if(!s)return!0;var o=s.getValue(),u="";return n&&(u=Fe(n)?n.checked?"true":"false":n.value),n=u,n!==o?(s.setValue(n),!0):!1}function dt(n){if(n=n||(typeof document<"u"?document:void 0),typeof n>"u")return null;try{return n.activeElement||n.body}catch{return n.body}}function wt(n,s){var o=s.checked;return ce({},s,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:o??n._wrapperState.initialChecked})}function St(n,s){var o=s.defaultValue==null?"":s.defaultValue,u=s.checked!=null?s.checked:s.defaultChecked;o=xe(s.value!=null?s.value:o),n._wrapperState={initialChecked:u,initialValue:o,controlled:s.type==="checkbox"||s.type==="radio"?s.checked!=null:s.value!=null}}function vt(n,s){s=s.checked,s!=null&&L(n,"checked",s,!1)}function Ut(n,s){vt(n,s);var o=xe(s.value),u=s.type;if(o!=null)u==="number"?(o===0&&n.value===""||n.value!=o)&&(n.value=""+o):n.value!==""+o&&(n.value=""+o);else if(u==="submit"||u==="reset"){n.removeAttribute("value");return}s.hasOwnProperty("value")?Xt(n,s.type,o):s.hasOwnProperty("defaultValue")&&Xt(n,s.type,xe(s.defaultValue)),s.checked==null&&s.defaultChecked!=null&&(n.defaultChecked=!!s.defaultChecked)}function qt(n,s,o){if(s.hasOwnProperty("value")||s.hasOwnProperty("defaultValue")){var u=s.type;if(!(u!=="submit"&&u!=="reset"||s.value!==void 0&&s.value!==null))return;s=""+n._wrapperState.initialValue,o||s===n.value||(n.value=s),n.defaultValue=s}o=n.name,o!==""&&(n.name=""),n.defaultChecked=!!n._wrapperState.initialChecked,o!==""&&(n.name=o)}function Xt(n,s,o){(s!=="number"||dt(n.ownerDocument)!==n)&&(o==null?n.defaultValue=""+n._wrapperState.initialValue:n.defaultValue!==""+o&&(n.defaultValue=""+o))}var $t=Array.isArray;function Nt(n,s,o,u){if(n=n.options,s){s={};for(var p=0;p<o.length;p++)s["$"+o[p]]=!0;for(o=0;o<n.length;o++)p=s.hasOwnProperty("$"+n[o].value),n[o].selected!==p&&(n[o].selected=p),p&&u&&(n[o].defaultSelected=!0)}else{for(o=""+xe(o),s=null,p=0;p<n.length;p++){if(n[p].value===o){n[p].selected=!0,u&&(n[p].defaultSelected=!0);return}s!==null||n[p].disabled||(s=n[p])}s!==null&&(s.selected=!0)}}function Ht(n,s){if(s.dangerouslySetInnerHTML!=null)throw Error(t(91));return ce({},s,{value:void 0,defaultValue:void 0,children:""+n._wrapperState.initialValue})}function Z(n,s){var o=s.value;if(o==null){if(o=s.children,s=s.defaultValue,o!=null){if(s!=null)throw Error(t(92));if($t(o)){if(1<o.length)throw Error(t(93));o=o[0]}s=o}s==null&&(s=""),o=s}n._wrapperState={initialValue:xe(o)}}function pn(n,s){var o=xe(s.value),u=xe(s.defaultValue);o!=null&&(o=""+o,o!==n.value&&(n.value=o),s.defaultValue==null&&n.defaultValue!==o&&(n.defaultValue=o)),u!=null&&(n.defaultValue=""+u)}function mt(n){var s=n.textContent;s===n._wrapperState.initialValue&&s!==""&&s!==null&&(n.value=s)}function k(n){switch(n){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function T(n,s){return n==null||n==="http://www.w3.org/1999/xhtml"?k(s):n==="http://www.w3.org/2000/svg"&&s==="foreignObject"?"http://www.w3.org/1999/xhtml":n}var ee,oe=(function(n){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(s,o,u,p){MSApp.execUnsafeLocalFunction(function(){return n(s,o,u,p)})}:n})(function(n,s){if(n.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in n)n.innerHTML=s;else{for(ee=ee||document.createElement("div"),ee.innerHTML="<svg>"+s.valueOf().toString()+"</svg>",s=ee.firstChild;n.firstChild;)n.removeChild(n.firstChild);for(;s.firstChild;)n.appendChild(s.firstChild)}});function z(n,s){if(s){var o=n.firstChild;if(o&&o===n.lastChild&&o.nodeType===3){o.nodeValue=s;return}}n.textContent=s}var ye={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},Le=["Webkit","ms","Moz","O"];Object.keys(ye).forEach(function(n){Le.forEach(function(s){s=s+n.charAt(0).toUpperCase()+n.substring(1),ye[s]=ye[n]})});function ge(n,s,o){return s==null||typeof s=="boolean"||s===""?"":o||typeof s!="number"||s===0||ye.hasOwnProperty(n)&&ye[n]?(""+s).trim():s+"px"}function ve(n,s){n=n.style;for(var o in s)if(s.hasOwnProperty(o)){var u=o.indexOf("--")===0,p=ge(o,s[o],u);o==="float"&&(o="cssFloat"),u?n.setProperty(o,p):n[o]=p}}var Re=ce({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function qe(n,s){if(s){if(Re[n]&&(s.children!=null||s.dangerouslySetInnerHTML!=null))throw Error(t(137,n));if(s.dangerouslySetInnerHTML!=null){if(s.children!=null)throw Error(t(60));if(typeof s.dangerouslySetInnerHTML!="object"||!("__html"in s.dangerouslySetInnerHTML))throw Error(t(61))}if(s.style!=null&&typeof s.style!="object")throw Error(t(62))}}function Ue(n,s){if(n.indexOf("-")===-1)return typeof s.is=="string";switch(n){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Pe=null;function et(n){return n=n.target||n.srcElement||window,n.correspondingUseElement&&(n=n.correspondingUseElement),n.nodeType===3?n.parentNode:n}var it=null,de=null,j=null;function be(n){if(n=cl(n)){if(typeof it!="function")throw Error(t(280));var s=n.stateNode;s&&(s=bc(s),it(n.stateNode,n.type,s))}}function _e(n){de?j?j.push(n):j=[n]:de=n}function Ie(){if(de){var n=de,s=j;if(j=de=null,be(n),s)for(n=0;n<s.length;n++)be(s[n])}}function ke(n,s){return n(s)}function Se(){}var Ye=!1;function We(n,s,o){if(Ye)return n(s,o);Ye=!0;try{return ke(n,s,o)}finally{Ye=!1,(de!==null||j!==null)&&(Se(),Ie())}}function Ot(n,s){var o=n.stateNode;if(o===null)return null;var u=bc(o);if(u===null)return null;o=u[s];e:switch(s){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(u=!u.disabled)||(n=n.type,u=!(n==="button"||n==="input"||n==="select"||n==="textarea")),n=!u;break e;default:n=!1}if(n)return null;if(o&&typeof o!="function")throw Error(t(231,s,typeof o));return o}var kt=!1;if(d)try{var On={};Object.defineProperty(On,"passive",{get:function(){kt=!0}}),window.addEventListener("test",On,On),window.removeEventListener("test",On,On)}catch{kt=!1}function wi(n,s,o,u,p,_,R,V,q){var pe=Array.prototype.slice.call(arguments,3);try{s.apply(o,pe)}catch(we){this.onError(we)}}var zs=!1,Ca=null,Bs=!1,Hs=null,wd={onError:function(n){zs=!0,Ca=n}};function oc(n,s,o,u,p,_,R,V,q){zs=!1,Ca=null,wi.apply(wd,arguments)}function lc(n,s,o,u,p,_,R,V,q){if(oc.apply(this,arguments),zs){if(zs){var pe=Ca;zs=!1,Ca=null}else throw Error(t(198));Bs||(Bs=!0,Hs=pe)}}function $n(n){var s=n,o=n;if(n.alternate)for(;s.return;)s=s.return;else{n=s;do s=n,(s.flags&4098)!==0&&(o=s.return),n=s.return;while(n)}return s.tag===3?o:null}function Ra(n){if(n.tag===13){var s=n.memoizedState;if(s===null&&(n=n.alternate,n!==null&&(s=n.memoizedState)),s!==null)return s.dehydrated}return null}function Go(n){if($n(n)!==n)throw Error(t(188))}function cc(n){var s=n.alternate;if(!s){if(s=$n(n),s===null)throw Error(t(188));return s!==n?null:n}for(var o=n,u=s;;){var p=o.return;if(p===null)break;var _=p.alternate;if(_===null){if(u=p.return,u!==null){o=u;continue}break}if(p.child===_.child){for(_=p.child;_;){if(_===o)return Go(p),n;if(_===u)return Go(p),s;_=_.sibling}throw Error(t(188))}if(o.return!==u.return)o=p,u=_;else{for(var R=!1,V=p.child;V;){if(V===o){R=!0,o=p,u=_;break}if(V===u){R=!0,u=p,o=_;break}V=V.sibling}if(!R){for(V=_.child;V;){if(V===o){R=!0,o=_,u=p;break}if(V===u){R=!0,u=_,o=p;break}V=V.sibling}if(!R)throw Error(t(189))}}if(o.alternate!==u)throw Error(t(190))}if(o.tag!==3)throw Error(t(188));return o.stateNode.current===o?n:s}function Vs(n){return n=cc(n),n!==null?jo(n):null}function jo(n){if(n.tag===5||n.tag===6)return n;for(n=n.child;n!==null;){var s=jo(n);if(s!==null)return s;n=n.sibling}return null}var Gs=e.unstable_scheduleCallback,Wo=e.unstable_cancelCallback,uc=e.unstable_shouldYield,bd=e.unstable_requestPaint,on=e.unstable_now,Td=e.unstable_getCurrentPriorityLevel,Xo=e.unstable_ImmediatePriority,A=e.unstable_UserBlockingPriority,J=e.unstable_NormalPriority,he=e.unstable_LowPriority,le=e.unstable_IdlePriority,ae=null,De=null;function je(n){if(De&&typeof De.onCommitFiberRoot=="function")try{De.onCommitFiberRoot(ae,n,void 0,(n.current.flags&128)===128)}catch{}}var Ne=Math.clz32?Math.clz32:ht,Ze=Math.log,rt=Math.LN2;function ht(n){return n>>>=0,n===0?32:31-(Ze(n)/rt|0)|0}var ft=64,tt=4194304;function Pt(n){switch(n&-n){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return n&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return n&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return n}}function Yt(n,s){var o=n.pendingLanes;if(o===0)return 0;var u=0,p=n.suspendedLanes,_=n.pingedLanes,R=o&268435455;if(R!==0){var V=R&~p;V!==0?u=Pt(V):(_&=R,_!==0&&(u=Pt(_)))}else R=o&~p,R!==0?u=Pt(R):_!==0&&(u=Pt(_));if(u===0)return 0;if(s!==0&&s!==u&&(s&p)===0&&(p=u&-u,_=s&-s,p>=_||p===16&&(_&4194240)!==0))return s;if((u&4)!==0&&(u|=o&16),s=n.entangledLanes,s!==0)for(n=n.entanglements,s&=u;0<s;)o=31-Ne(s),p=1<<o,u|=n[o],s&=~p;return u}function nn(n,s){switch(n){case 1:case 2:case 4:return s+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return s+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function Vt(n,s){for(var o=n.suspendedLanes,u=n.pingedLanes,p=n.expirationTimes,_=n.pendingLanes;0<_;){var R=31-Ne(_),V=1<<R,q=p[R];q===-1?((V&o)===0||(V&u)!==0)&&(p[R]=nn(V,s)):q<=s&&(n.expiredLanes|=V),_&=~V}}function gn(n){return n=n.pendingLanes&-1073741825,n!==0?n:n&1073741824?1073741824:0}function Ve(){var n=ft;return ft<<=1,(ft&4194240)===0&&(ft=64),n}function Ln(n){for(var s=[],o=0;31>o;o++)s.push(n);return s}function yt(n,s,o){n.pendingLanes|=s,s!==536870912&&(n.suspendedLanes=0,n.pingedLanes=0),n=n.eventTimes,s=31-Ne(s),n[s]=o}function ei(n,s){var o=n.pendingLanes&~s;n.pendingLanes=s,n.suspendedLanes=0,n.pingedLanes=0,n.expiredLanes&=s,n.mutableReadLanes&=s,n.entangledLanes&=s,s=n.entanglements;var u=n.eventTimes;for(n=n.expirationTimes;0<o;){var p=31-Ne(o),_=1<<p;s[p]=0,u[p]=-1,n[p]=-1,o&=~_}}function ti(n,s){var o=n.entangledLanes|=s;for(n=n.entanglements;o;){var u=31-Ne(o),p=1<<u;p&s|n[u]&s&&(n[u]|=s),o&=~p}}var Mt=0;function Er(n){return n&=-n,1<n?4<n?(n&268435455)!==0?16:536870912:4:1}var zt,Zt,Fi,Gt,Oi,tr=!1,js=[],Qr=null,Zr=null,Jr=null,$o=new Map,qo=new Map,es=[],ky="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function Km(n,s){switch(n){case"focusin":case"focusout":Qr=null;break;case"dragenter":case"dragleave":Zr=null;break;case"mouseover":case"mouseout":Jr=null;break;case"pointerover":case"pointerout":$o.delete(s.pointerId);break;case"gotpointercapture":case"lostpointercapture":qo.delete(s.pointerId)}}function Yo(n,s,o,u,p,_){return n===null||n.nativeEvent!==_?(n={blockedOn:s,domEventName:o,eventSystemFlags:u,nativeEvent:_,targetContainers:[p]},s!==null&&(s=cl(s),s!==null&&Zt(s)),n):(n.eventSystemFlags|=u,s=n.targetContainers,p!==null&&s.indexOf(p)===-1&&s.push(p),n)}function zy(n,s,o,u,p){switch(s){case"focusin":return Qr=Yo(Qr,n,s,o,u,p),!0;case"dragenter":return Zr=Yo(Zr,n,s,o,u,p),!0;case"mouseover":return Jr=Yo(Jr,n,s,o,u,p),!0;case"pointerover":var _=p.pointerId;return $o.set(_,Yo($o.get(_)||null,n,s,o,u,p)),!0;case"gotpointercapture":return _=p.pointerId,qo.set(_,Yo(qo.get(_)||null,n,s,o,u,p)),!0}return!1}function Qm(n){var s=Ws(n.target);if(s!==null){var o=$n(s);if(o!==null){if(s=o.tag,s===13){if(s=Ra(o),s!==null){n.blockedOn=s,Oi(n.priority,function(){Fi(o)});return}}else if(s===3&&o.stateNode.current.memoizedState.isDehydrated){n.blockedOn=o.tag===3?o.stateNode.containerInfo:null;return}}}n.blockedOn=null}function dc(n){if(n.blockedOn!==null)return!1;for(var s=n.targetContainers;0<s.length;){var o=Rd(n.domEventName,n.eventSystemFlags,s[0],n.nativeEvent);if(o===null){o=n.nativeEvent;var u=new o.constructor(o.type,o);Pe=u,o.target.dispatchEvent(u),Pe=null}else return s=cl(o),s!==null&&Zt(s),n.blockedOn=o,!1;s.shift()}return!0}function Zm(n,s,o){dc(n)&&o.delete(s)}function By(){tr=!1,Qr!==null&&dc(Qr)&&(Qr=null),Zr!==null&&dc(Zr)&&(Zr=null),Jr!==null&&dc(Jr)&&(Jr=null),$o.forEach(Zm),qo.forEach(Zm)}function Ko(n,s){n.blockedOn===s&&(n.blockedOn=null,tr||(tr=!0,e.unstable_scheduleCallback(e.unstable_NormalPriority,By)))}function Qo(n){function s(p){return Ko(p,n)}if(0<js.length){Ko(js[0],n);for(var o=1;o<js.length;o++){var u=js[o];u.blockedOn===n&&(u.blockedOn=null)}}for(Qr!==null&&Ko(Qr,n),Zr!==null&&Ko(Zr,n),Jr!==null&&Ko(Jr,n),$o.forEach(s),qo.forEach(s),o=0;o<es.length;o++)u=es[o],u.blockedOn===n&&(u.blockedOn=null);for(;0<es.length&&(o=es[0],o.blockedOn===null);)Qm(o),o.blockedOn===null&&es.shift()}var Aa=C.ReactCurrentBatchConfig,hc=!0;function Hy(n,s,o,u){var p=Mt,_=Aa.transition;Aa.transition=null;try{Mt=1,Cd(n,s,o,u)}finally{Mt=p,Aa.transition=_}}function Vy(n,s,o,u){var p=Mt,_=Aa.transition;Aa.transition=null;try{Mt=4,Cd(n,s,o,u)}finally{Mt=p,Aa.transition=_}}function Cd(n,s,o,u){if(hc){var p=Rd(n,s,o,u);if(p===null)Wd(n,s,u,fc,o),Km(n,u);else if(zy(p,n,s,o,u))u.stopPropagation();else if(Km(n,u),s&4&&-1<ky.indexOf(n)){for(;p!==null;){var _=cl(p);if(_!==null&&zt(_),_=Rd(n,s,o,u),_===null&&Wd(n,s,u,fc,o),_===p)break;p=_}p!==null&&u.stopPropagation()}else Wd(n,s,u,null,o)}}var fc=null;function Rd(n,s,o,u){if(fc=null,n=et(u),n=Ws(n),n!==null)if(s=$n(n),s===null)n=null;else if(o=s.tag,o===13){if(n=Ra(s),n!==null)return n;n=null}else if(o===3){if(s.stateNode.current.memoizedState.isDehydrated)return s.tag===3?s.stateNode.containerInfo:null;n=null}else s!==n&&(n=null);return fc=n,null}function Jm(n){switch(n){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(Td()){case Xo:return 1;case A:return 4;case J:case he:return 16;case le:return 536870912;default:return 16}default:return 16}}var ts=null,Ad=null,pc=null;function eg(){if(pc)return pc;var n,s=Ad,o=s.length,u,p="value"in ts?ts.value:ts.textContent,_=p.length;for(n=0;n<o&&s[n]===p[n];n++);var R=o-n;for(u=1;u<=R&&s[o-u]===p[_-u];u++);return pc=p.slice(n,1<u?1-u:void 0)}function mc(n){var s=n.keyCode;return"charCode"in n?(n=n.charCode,n===0&&s===13&&(n=13)):n=s,n===10&&(n=13),32<=n||n===13?n:0}function gc(){return!0}function tg(){return!1}function fi(n){function s(o,u,p,_,R){this._reactName=o,this._targetInst=p,this.type=u,this.nativeEvent=_,this.target=R,this.currentTarget=null;for(var V in n)n.hasOwnProperty(V)&&(o=n[V],this[V]=o?o(_):_[V]);return this.isDefaultPrevented=(_.defaultPrevented!=null?_.defaultPrevented:_.returnValue===!1)?gc:tg,this.isPropagationStopped=tg,this}return ce(s.prototype,{preventDefault:function(){this.defaultPrevented=!0;var o=this.nativeEvent;o&&(o.preventDefault?o.preventDefault():typeof o.returnValue!="unknown"&&(o.returnValue=!1),this.isDefaultPrevented=gc)},stopPropagation:function(){var o=this.nativeEvent;o&&(o.stopPropagation?o.stopPropagation():typeof o.cancelBubble!="unknown"&&(o.cancelBubble=!0),this.isPropagationStopped=gc)},persist:function(){},isPersistent:gc}),s}var Pa={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(n){return n.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Pd=fi(Pa),Zo=ce({},Pa,{view:0,detail:0}),Gy=fi(Zo),Nd,Ld,Jo,xc=ce({},Zo,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Id,button:0,buttons:0,relatedTarget:function(n){return n.relatedTarget===void 0?n.fromElement===n.srcElement?n.toElement:n.fromElement:n.relatedTarget},movementX:function(n){return"movementX"in n?n.movementX:(n!==Jo&&(Jo&&n.type==="mousemove"?(Nd=n.screenX-Jo.screenX,Ld=n.screenY-Jo.screenY):Ld=Nd=0,Jo=n),Nd)},movementY:function(n){return"movementY"in n?n.movementY:Ld}}),ng=fi(xc),jy=ce({},xc,{dataTransfer:0}),Wy=fi(jy),Xy=ce({},Zo,{relatedTarget:0}),Dd=fi(Xy),$y=ce({},Pa,{animationName:0,elapsedTime:0,pseudoElement:0}),qy=fi($y),Yy=ce({},Pa,{clipboardData:function(n){return"clipboardData"in n?n.clipboardData:window.clipboardData}}),Ky=fi(Yy),Qy=ce({},Pa,{data:0}),ig=fi(Qy),Zy={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},Jy={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},eS={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function tS(n){var s=this.nativeEvent;return s.getModifierState?s.getModifierState(n):(n=eS[n])?!!s[n]:!1}function Id(){return tS}var nS=ce({},Zo,{key:function(n){if(n.key){var s=Zy[n.key]||n.key;if(s!=="Unidentified")return s}return n.type==="keypress"?(n=mc(n),n===13?"Enter":String.fromCharCode(n)):n.type==="keydown"||n.type==="keyup"?Jy[n.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Id,charCode:function(n){return n.type==="keypress"?mc(n):0},keyCode:function(n){return n.type==="keydown"||n.type==="keyup"?n.keyCode:0},which:function(n){return n.type==="keypress"?mc(n):n.type==="keydown"||n.type==="keyup"?n.keyCode:0}}),iS=fi(nS),rS=ce({},xc,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),rg=fi(rS),sS=ce({},Zo,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Id}),aS=fi(sS),oS=ce({},Pa,{propertyName:0,elapsedTime:0,pseudoElement:0}),lS=fi(oS),cS=ce({},xc,{deltaX:function(n){return"deltaX"in n?n.deltaX:"wheelDeltaX"in n?-n.wheelDeltaX:0},deltaY:function(n){return"deltaY"in n?n.deltaY:"wheelDeltaY"in n?-n.wheelDeltaY:"wheelDelta"in n?-n.wheelDelta:0},deltaZ:0,deltaMode:0}),uS=fi(cS),dS=[9,13,27,32],Ud=d&&"CompositionEvent"in window,el=null;d&&"documentMode"in document&&(el=document.documentMode);var hS=d&&"TextEvent"in window&&!el,sg=d&&(!Ud||el&&8<el&&11>=el),ag=" ",og=!1;function lg(n,s){switch(n){case"keyup":return dS.indexOf(s.keyCode)!==-1;case"keydown":return s.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function cg(n){return n=n.detail,typeof n=="object"&&"data"in n?n.data:null}var Na=!1;function fS(n,s){switch(n){case"compositionend":return cg(s);case"keypress":return s.which!==32?null:(og=!0,ag);case"textInput":return n=s.data,n===ag&&og?null:n;default:return null}}function pS(n,s){if(Na)return n==="compositionend"||!Ud&&lg(n,s)?(n=eg(),pc=Ad=ts=null,Na=!1,n):null;switch(n){case"paste":return null;case"keypress":if(!(s.ctrlKey||s.altKey||s.metaKey)||s.ctrlKey&&s.altKey){if(s.char&&1<s.char.length)return s.char;if(s.which)return String.fromCharCode(s.which)}return null;case"compositionend":return sg&&s.locale!=="ko"?null:s.data;default:return null}}var mS={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function ug(n){var s=n&&n.nodeName&&n.nodeName.toLowerCase();return s==="input"?!!mS[n.type]:s==="textarea"}function dg(n,s,o,u){_e(u),s=Mc(s,"onChange"),0<s.length&&(o=new Pd("onChange","change",null,o,u),n.push({event:o,listeners:s}))}var tl=null,nl=null;function gS(n){Ag(n,0)}function vc(n){var s=Fa(n);if(It(s))return n}function xS(n,s){if(n==="change")return s}var hg=!1;if(d){var Fd;if(d){var Od="oninput"in document;if(!Od){var fg=document.createElement("div");fg.setAttribute("oninput","return;"),Od=typeof fg.oninput=="function"}Fd=Od}else Fd=!1;hg=Fd&&(!document.documentMode||9<document.documentMode)}function pg(){tl&&(tl.detachEvent("onpropertychange",mg),nl=tl=null)}function mg(n){if(n.propertyName==="value"&&vc(nl)){var s=[];dg(s,nl,n,et(n)),We(gS,s)}}function vS(n,s,o){n==="focusin"?(pg(),tl=s,nl=o,tl.attachEvent("onpropertychange",mg)):n==="focusout"&&pg()}function _S(n){if(n==="selectionchange"||n==="keyup"||n==="keydown")return vc(nl)}function yS(n,s){if(n==="click")return vc(s)}function SS(n,s){if(n==="input"||n==="change")return vc(s)}function MS(n,s){return n===s&&(n!==0||1/n===1/s)||n!==n&&s!==s}var ki=typeof Object.is=="function"?Object.is:MS;function il(n,s){if(ki(n,s))return!0;if(typeof n!="object"||n===null||typeof s!="object"||s===null)return!1;var o=Object.keys(n),u=Object.keys(s);if(o.length!==u.length)return!1;for(u=0;u<o.length;u++){var p=o[u];if(!h.call(s,p)||!ki(n[p],s[p]))return!1}return!0}function gg(n){for(;n&&n.firstChild;)n=n.firstChild;return n}function xg(n,s){var o=gg(n);n=0;for(var u;o;){if(o.nodeType===3){if(u=n+o.textContent.length,n<=s&&u>=s)return{node:o,offset:s-n};n=u}e:{for(;o;){if(o.nextSibling){o=o.nextSibling;break e}o=o.parentNode}o=void 0}o=gg(o)}}function vg(n,s){return n&&s?n===s?!0:n&&n.nodeType===3?!1:s&&s.nodeType===3?vg(n,s.parentNode):"contains"in n?n.contains(s):n.compareDocumentPosition?!!(n.compareDocumentPosition(s)&16):!1:!1}function _g(){for(var n=window,s=dt();s instanceof n.HTMLIFrameElement;){try{var o=typeof s.contentWindow.location.href=="string"}catch{o=!1}if(o)n=s.contentWindow;else break;s=dt(n.document)}return s}function kd(n){var s=n&&n.nodeName&&n.nodeName.toLowerCase();return s&&(s==="input"&&(n.type==="text"||n.type==="search"||n.type==="tel"||n.type==="url"||n.type==="password")||s==="textarea"||n.contentEditable==="true")}function ES(n){var s=_g(),o=n.focusedElem,u=n.selectionRange;if(s!==o&&o&&o.ownerDocument&&vg(o.ownerDocument.documentElement,o)){if(u!==null&&kd(o)){if(s=u.start,n=u.end,n===void 0&&(n=s),"selectionStart"in o)o.selectionStart=s,o.selectionEnd=Math.min(n,o.value.length);else if(n=(s=o.ownerDocument||document)&&s.defaultView||window,n.getSelection){n=n.getSelection();var p=o.textContent.length,_=Math.min(u.start,p);u=u.end===void 0?_:Math.min(u.end,p),!n.extend&&_>u&&(p=u,u=_,_=p),p=xg(o,_);var R=xg(o,u);p&&R&&(n.rangeCount!==1||n.anchorNode!==p.node||n.anchorOffset!==p.offset||n.focusNode!==R.node||n.focusOffset!==R.offset)&&(s=s.createRange(),s.setStart(p.node,p.offset),n.removeAllRanges(),_>u?(n.addRange(s),n.extend(R.node,R.offset)):(s.setEnd(R.node,R.offset),n.addRange(s)))}}for(s=[],n=o;n=n.parentNode;)n.nodeType===1&&s.push({element:n,left:n.scrollLeft,top:n.scrollTop});for(typeof o.focus=="function"&&o.focus(),o=0;o<s.length;o++)n=s[o],n.element.scrollLeft=n.left,n.element.scrollTop=n.top}}var wS=d&&"documentMode"in document&&11>=document.documentMode,La=null,zd=null,rl=null,Bd=!1;function yg(n,s,o){var u=o.window===o?o.document:o.nodeType===9?o:o.ownerDocument;Bd||La==null||La!==dt(u)||(u=La,"selectionStart"in u&&kd(u)?u={start:u.selectionStart,end:u.selectionEnd}:(u=(u.ownerDocument&&u.ownerDocument.defaultView||window).getSelection(),u={anchorNode:u.anchorNode,anchorOffset:u.anchorOffset,focusNode:u.focusNode,focusOffset:u.focusOffset}),rl&&il(rl,u)||(rl=u,u=Mc(zd,"onSelect"),0<u.length&&(s=new Pd("onSelect","select",null,s,o),n.push({event:s,listeners:u}),s.target=La)))}function _c(n,s){var o={};return o[n.toLowerCase()]=s.toLowerCase(),o["Webkit"+n]="webkit"+s,o["Moz"+n]="moz"+s,o}var Da={animationend:_c("Animation","AnimationEnd"),animationiteration:_c("Animation","AnimationIteration"),animationstart:_c("Animation","AnimationStart"),transitionend:_c("Transition","TransitionEnd")},Hd={},Sg={};d&&(Sg=document.createElement("div").style,"AnimationEvent"in window||(delete Da.animationend.animation,delete Da.animationiteration.animation,delete Da.animationstart.animation),"TransitionEvent"in window||delete Da.transitionend.transition);function yc(n){if(Hd[n])return Hd[n];if(!Da[n])return n;var s=Da[n],o;for(o in s)if(s.hasOwnProperty(o)&&o in Sg)return Hd[n]=s[o];return n}var Mg=yc("animationend"),Eg=yc("animationiteration"),wg=yc("animationstart"),bg=yc("transitionend"),Tg=new Map,Cg="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function ns(n,s){Tg.set(n,s),l(s,[n])}for(var Vd=0;Vd<Cg.length;Vd++){var Gd=Cg[Vd],bS=Gd.toLowerCase(),TS=Gd[0].toUpperCase()+Gd.slice(1);ns(bS,"on"+TS)}ns(Mg,"onAnimationEnd"),ns(Eg,"onAnimationIteration"),ns(wg,"onAnimationStart"),ns("dblclick","onDoubleClick"),ns("focusin","onFocus"),ns("focusout","onBlur"),ns(bg,"onTransitionEnd"),c("onMouseEnter",["mouseout","mouseover"]),c("onMouseLeave",["mouseout","mouseover"]),c("onPointerEnter",["pointerout","pointerover"]),c("onPointerLeave",["pointerout","pointerover"]),l("onChange","change click focusin focusout input keydown keyup selectionchange".split(" ")),l("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),l("onBeforeInput",["compositionend","keypress","textInput","paste"]),l("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" ")),l("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" ")),l("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var sl="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),CS=new Set("cancel close invalid load scroll toggle".split(" ").concat(sl));function Rg(n,s,o){var u=n.type||"unknown-event";n.currentTarget=o,lc(u,s,void 0,n),n.currentTarget=null}function Ag(n,s){s=(s&4)!==0;for(var o=0;o<n.length;o++){var u=n[o],p=u.event;u=u.listeners;e:{var _=void 0;if(s)for(var R=u.length-1;0<=R;R--){var V=u[R],q=V.instance,pe=V.currentTarget;if(V=V.listener,q!==_&&p.isPropagationStopped())break e;Rg(p,V,pe),_=q}else for(R=0;R<u.length;R++){if(V=u[R],q=V.instance,pe=V.currentTarget,V=V.listener,q!==_&&p.isPropagationStopped())break e;Rg(p,V,pe),_=q}}}if(Bs)throw n=Hs,Bs=!1,Hs=null,n}function Jt(n,s){var o=s[Qd];o===void 0&&(o=s[Qd]=new Set);var u=n+"__bubble";o.has(u)||(Pg(s,n,2,!1),o.add(u))}function jd(n,s,o){var u=0;s&&(u|=4),Pg(o,n,u,s)}var Sc="_reactListening"+Math.random().toString(36).slice(2);function al(n){if(!n[Sc]){n[Sc]=!0,r.forEach(function(o){o!=="selectionchange"&&(CS.has(o)||jd(o,!1,n),jd(o,!0,n))});var s=n.nodeType===9?n:n.ownerDocument;s===null||s[Sc]||(s[Sc]=!0,jd("selectionchange",!1,s))}}function Pg(n,s,o,u){switch(Jm(s)){case 1:var p=Hy;break;case 4:p=Vy;break;default:p=Cd}o=p.bind(null,s,o,n),p=void 0,!kt||s!=="touchstart"&&s!=="touchmove"&&s!=="wheel"||(p=!0),u?p!==void 0?n.addEventListener(s,o,{capture:!0,passive:p}):n.addEventListener(s,o,!0):p!==void 0?n.addEventListener(s,o,{passive:p}):n.addEventListener(s,o,!1)}function Wd(n,s,o,u,p){var _=u;if((s&1)===0&&(s&2)===0&&u!==null)e:for(;;){if(u===null)return;var R=u.tag;if(R===3||R===4){var V=u.stateNode.containerInfo;if(V===p||V.nodeType===8&&V.parentNode===p)break;if(R===4)for(R=u.return;R!==null;){var q=R.tag;if((q===3||q===4)&&(q=R.stateNode.containerInfo,q===p||q.nodeType===8&&q.parentNode===p))return;R=R.return}for(;V!==null;){if(R=Ws(V),R===null)return;if(q=R.tag,q===5||q===6){u=_=R;continue e}V=V.parentNode}}u=u.return}We(function(){var pe=_,we=et(o),Ce=[];e:{var Ee=Tg.get(n);if(Ee!==void 0){var Ge=Pd,Ke=n;switch(n){case"keypress":if(mc(o)===0)break e;case"keydown":case"keyup":Ge=iS;break;case"focusin":Ke="focus",Ge=Dd;break;case"focusout":Ke="blur",Ge=Dd;break;case"beforeblur":case"afterblur":Ge=Dd;break;case"click":if(o.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":Ge=ng;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":Ge=Wy;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":Ge=aS;break;case Mg:case Eg:case wg:Ge=qy;break;case bg:Ge=lS;break;case"scroll":Ge=Gy;break;case"wheel":Ge=uS;break;case"copy":case"cut":case"paste":Ge=Ky;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":Ge=rg}var Je=(s&4)!==0,mn=!Je&&n==="scroll",re=Je?Ee!==null?Ee+"Capture":null:Ee;Je=[];for(var Q=pe,ue;Q!==null;){ue=Q;var Ae=ue.stateNode;if(ue.tag===5&&Ae!==null&&(ue=Ae,re!==null&&(Ae=Ot(Q,re),Ae!=null&&Je.push(ol(Q,Ae,ue)))),mn)break;Q=Q.return}0<Je.length&&(Ee=new Ge(Ee,Ke,null,o,we),Ce.push({event:Ee,listeners:Je}))}}if((s&7)===0){e:{if(Ee=n==="mouseover"||n==="pointerover",Ge=n==="mouseout"||n==="pointerout",Ee&&o!==Pe&&(Ke=o.relatedTarget||o.fromElement)&&(Ws(Ke)||Ke[wr]))break e;if((Ge||Ee)&&(Ee=we.window===we?we:(Ee=we.ownerDocument)?Ee.defaultView||Ee.parentWindow:window,Ge?(Ke=o.relatedTarget||o.toElement,Ge=pe,Ke=Ke?Ws(Ke):null,Ke!==null&&(mn=$n(Ke),Ke!==mn||Ke.tag!==5&&Ke.tag!==6)&&(Ke=null)):(Ge=null,Ke=pe),Ge!==Ke)){if(Je=ng,Ae="onMouseLeave",re="onMouseEnter",Q="mouse",(n==="pointerout"||n==="pointerover")&&(Je=rg,Ae="onPointerLeave",re="onPointerEnter",Q="pointer"),mn=Ge==null?Ee:Fa(Ge),ue=Ke==null?Ee:Fa(Ke),Ee=new Je(Ae,Q+"leave",Ge,o,we),Ee.target=mn,Ee.relatedTarget=ue,Ae=null,Ws(we)===pe&&(Je=new Je(re,Q+"enter",Ke,o,we),Je.target=ue,Je.relatedTarget=mn,Ae=Je),mn=Ae,Ge&&Ke)t:{for(Je=Ge,re=Ke,Q=0,ue=Je;ue;ue=Ia(ue))Q++;for(ue=0,Ae=re;Ae;Ae=Ia(Ae))ue++;for(;0<Q-ue;)Je=Ia(Je),Q--;for(;0<ue-Q;)re=Ia(re),ue--;for(;Q--;){if(Je===re||re!==null&&Je===re.alternate)break t;Je=Ia(Je),re=Ia(re)}Je=null}else Je=null;Ge!==null&&Ng(Ce,Ee,Ge,Je,!1),Ke!==null&&mn!==null&&Ng(Ce,mn,Ke,Je,!0)}}e:{if(Ee=pe?Fa(pe):window,Ge=Ee.nodeName&&Ee.nodeName.toLowerCase(),Ge==="select"||Ge==="input"&&Ee.type==="file")var nt=xS;else if(ug(Ee))if(hg)nt=SS;else{nt=_S;var at=vS}else(Ge=Ee.nodeName)&&Ge.toLowerCase()==="input"&&(Ee.type==="checkbox"||Ee.type==="radio")&&(nt=yS);if(nt&&(nt=nt(n,pe))){dg(Ce,nt,o,we);break e}at&&at(n,Ee,pe),n==="focusout"&&(at=Ee._wrapperState)&&at.controlled&&Ee.type==="number"&&Xt(Ee,"number",Ee.value)}switch(at=pe?Fa(pe):window,n){case"focusin":(ug(at)||at.contentEditable==="true")&&(La=at,zd=pe,rl=null);break;case"focusout":rl=zd=La=null;break;case"mousedown":Bd=!0;break;case"contextmenu":case"mouseup":case"dragend":Bd=!1,yg(Ce,o,we);break;case"selectionchange":if(wS)break;case"keydown":case"keyup":yg(Ce,o,we)}var ot;if(Ud)e:{switch(n){case"compositionstart":var ct="onCompositionStart";break e;case"compositionend":ct="onCompositionEnd";break e;case"compositionupdate":ct="onCompositionUpdate";break e}ct=void 0}else Na?lg(n,o)&&(ct="onCompositionEnd"):n==="keydown"&&o.keyCode===229&&(ct="onCompositionStart");ct&&(sg&&o.locale!=="ko"&&(Na||ct!=="onCompositionStart"?ct==="onCompositionEnd"&&Na&&(ot=eg()):(ts=we,Ad="value"in ts?ts.value:ts.textContent,Na=!0)),at=Mc(pe,ct),0<at.length&&(ct=new ig(ct,n,null,o,we),Ce.push({event:ct,listeners:at}),ot?ct.data=ot:(ot=cg(o),ot!==null&&(ct.data=ot)))),(ot=hS?fS(n,o):pS(n,o))&&(pe=Mc(pe,"onBeforeInput"),0<pe.length&&(we=new ig("onBeforeInput","beforeinput",null,o,we),Ce.push({event:we,listeners:pe}),we.data=ot))}Ag(Ce,s)})}function ol(n,s,o){return{instance:n,listener:s,currentTarget:o}}function Mc(n,s){for(var o=s+"Capture",u=[];n!==null;){var p=n,_=p.stateNode;p.tag===5&&_!==null&&(p=_,_=Ot(n,o),_!=null&&u.unshift(ol(n,_,p)),_=Ot(n,s),_!=null&&u.push(ol(n,_,p))),n=n.return}return u}function Ia(n){if(n===null)return null;do n=n.return;while(n&&n.tag!==5);return n||null}function Ng(n,s,o,u,p){for(var _=s._reactName,R=[];o!==null&&o!==u;){var V=o,q=V.alternate,pe=V.stateNode;if(q!==null&&q===u)break;V.tag===5&&pe!==null&&(V=pe,p?(q=Ot(o,_),q!=null&&R.unshift(ol(o,q,V))):p||(q=Ot(o,_),q!=null&&R.push(ol(o,q,V)))),o=o.return}R.length!==0&&n.push({event:s,listeners:R})}var RS=/\r\n?/g,AS=/\u0000|\uFFFD/g;function Lg(n){return(typeof n=="string"?n:""+n).replace(RS,`
`).replace(AS,"")}function Ec(n,s,o){if(s=Lg(s),Lg(n)!==s&&o)throw Error(t(425))}function wc(){}var Xd=null,$d=null;function qd(n,s){return n==="textarea"||n==="noscript"||typeof s.children=="string"||typeof s.children=="number"||typeof s.dangerouslySetInnerHTML=="object"&&s.dangerouslySetInnerHTML!==null&&s.dangerouslySetInnerHTML.__html!=null}var Yd=typeof setTimeout=="function"?setTimeout:void 0,PS=typeof clearTimeout=="function"?clearTimeout:void 0,Dg=typeof Promise=="function"?Promise:void 0,NS=typeof queueMicrotask=="function"?queueMicrotask:typeof Dg<"u"?function(n){return Dg.resolve(null).then(n).catch(LS)}:Yd;function LS(n){setTimeout(function(){throw n})}function Kd(n,s){var o=s,u=0;do{var p=o.nextSibling;if(n.removeChild(o),p&&p.nodeType===8)if(o=p.data,o==="/$"){if(u===0){n.removeChild(p),Qo(s);return}u--}else o!=="$"&&o!=="$?"&&o!=="$!"||u++;o=p}while(o);Qo(s)}function is(n){for(;n!=null;n=n.nextSibling){var s=n.nodeType;if(s===1||s===3)break;if(s===8){if(s=n.data,s==="$"||s==="$!"||s==="$?")break;if(s==="/$")return null}}return n}function Ig(n){n=n.previousSibling;for(var s=0;n;){if(n.nodeType===8){var o=n.data;if(o==="$"||o==="$!"||o==="$?"){if(s===0)return n;s--}else o==="/$"&&s++}n=n.previousSibling}return null}var Ua=Math.random().toString(36).slice(2),nr="__reactFiber$"+Ua,ll="__reactProps$"+Ua,wr="__reactContainer$"+Ua,Qd="__reactEvents$"+Ua,DS="__reactListeners$"+Ua,IS="__reactHandles$"+Ua;function Ws(n){var s=n[nr];if(s)return s;for(var o=n.parentNode;o;){if(s=o[wr]||o[nr]){if(o=s.alternate,s.child!==null||o!==null&&o.child!==null)for(n=Ig(n);n!==null;){if(o=n[nr])return o;n=Ig(n)}return s}n=o,o=n.parentNode}return null}function cl(n){return n=n[nr]||n[wr],!n||n.tag!==5&&n.tag!==6&&n.tag!==13&&n.tag!==3?null:n}function Fa(n){if(n.tag===5||n.tag===6)return n.stateNode;throw Error(t(33))}function bc(n){return n[ll]||null}var Zd=[],Oa=-1;function rs(n){return{current:n}}function en(n){0>Oa||(n.current=Zd[Oa],Zd[Oa]=null,Oa--)}function Kt(n,s){Oa++,Zd[Oa]=n.current,n.current=s}var ss={},kn=rs(ss),ni=rs(!1),Xs=ss;function ka(n,s){var o=n.type.contextTypes;if(!o)return ss;var u=n.stateNode;if(u&&u.__reactInternalMemoizedUnmaskedChildContext===s)return u.__reactInternalMemoizedMaskedChildContext;var p={},_;for(_ in o)p[_]=s[_];return u&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=s,n.__reactInternalMemoizedMaskedChildContext=p),p}function ii(n){return n=n.childContextTypes,n!=null}function Tc(){en(ni),en(kn)}function Ug(n,s,o){if(kn.current!==ss)throw Error(t(168));Kt(kn,s),Kt(ni,o)}function Fg(n,s,o){var u=n.stateNode;if(s=s.childContextTypes,typeof u.getChildContext!="function")return o;u=u.getChildContext();for(var p in u)if(!(p in s))throw Error(t(108,Me(n)||"Unknown",p));return ce({},o,u)}function Cc(n){return n=(n=n.stateNode)&&n.__reactInternalMemoizedMergedChildContext||ss,Xs=kn.current,Kt(kn,n),Kt(ni,ni.current),!0}function Og(n,s,o){var u=n.stateNode;if(!u)throw Error(t(169));o?(n=Fg(n,s,Xs),u.__reactInternalMemoizedMergedChildContext=n,en(ni),en(kn),Kt(kn,n)):en(ni),Kt(ni,o)}var br=null,Rc=!1,Jd=!1;function kg(n){br===null?br=[n]:br.push(n)}function US(n){Rc=!0,kg(n)}function as(){if(!Jd&&br!==null){Jd=!0;var n=0,s=Mt;try{var o=br;for(Mt=1;n<o.length;n++){var u=o[n];do u=u(!0);while(u!==null)}br=null,Rc=!1}catch(p){throw br!==null&&(br=br.slice(n+1)),Gs(Xo,as),p}finally{Mt=s,Jd=!1}}return null}var za=[],Ba=0,Ac=null,Pc=0,bi=[],Ti=0,$s=null,Tr=1,Cr="";function qs(n,s){za[Ba++]=Pc,za[Ba++]=Ac,Ac=n,Pc=s}function zg(n,s,o){bi[Ti++]=Tr,bi[Ti++]=Cr,bi[Ti++]=$s,$s=n;var u=Tr;n=Cr;var p=32-Ne(u)-1;u&=~(1<<p),o+=1;var _=32-Ne(s)+p;if(30<_){var R=p-p%5;_=(u&(1<<R)-1).toString(32),u>>=R,p-=R,Tr=1<<32-Ne(s)+p|o<<p|u,Cr=_+n}else Tr=1<<_|o<<p|u,Cr=n}function eh(n){n.return!==null&&(qs(n,1),zg(n,1,0))}function th(n){for(;n===Ac;)Ac=za[--Ba],za[Ba]=null,Pc=za[--Ba],za[Ba]=null;for(;n===$s;)$s=bi[--Ti],bi[Ti]=null,Cr=bi[--Ti],bi[Ti]=null,Tr=bi[--Ti],bi[Ti]=null}var pi=null,mi=null,rn=!1,zi=null;function Bg(n,s){var o=Pi(5,null,null,0);o.elementType="DELETED",o.stateNode=s,o.return=n,s=n.deletions,s===null?(n.deletions=[o],n.flags|=16):s.push(o)}function Hg(n,s){switch(n.tag){case 5:var o=n.type;return s=s.nodeType!==1||o.toLowerCase()!==s.nodeName.toLowerCase()?null:s,s!==null?(n.stateNode=s,pi=n,mi=is(s.firstChild),!0):!1;case 6:return s=n.pendingProps===""||s.nodeType!==3?null:s,s!==null?(n.stateNode=s,pi=n,mi=null,!0):!1;case 13:return s=s.nodeType!==8?null:s,s!==null?(o=$s!==null?{id:Tr,overflow:Cr}:null,n.memoizedState={dehydrated:s,treeContext:o,retryLane:1073741824},o=Pi(18,null,null,0),o.stateNode=s,o.return=n,n.child=o,pi=n,mi=null,!0):!1;default:return!1}}function nh(n){return(n.mode&1)!==0&&(n.flags&128)===0}function ih(n){if(rn){var s=mi;if(s){var o=s;if(!Hg(n,s)){if(nh(n))throw Error(t(418));s=is(o.nextSibling);var u=pi;s&&Hg(n,s)?Bg(u,o):(n.flags=n.flags&-4097|2,rn=!1,pi=n)}}else{if(nh(n))throw Error(t(418));n.flags=n.flags&-4097|2,rn=!1,pi=n}}}function Vg(n){for(n=n.return;n!==null&&n.tag!==5&&n.tag!==3&&n.tag!==13;)n=n.return;pi=n}function Nc(n){if(n!==pi)return!1;if(!rn)return Vg(n),rn=!0,!1;var s;if((s=n.tag!==3)&&!(s=n.tag!==5)&&(s=n.type,s=s!=="head"&&s!=="body"&&!qd(n.type,n.memoizedProps)),s&&(s=mi)){if(nh(n))throw Gg(),Error(t(418));for(;s;)Bg(n,s),s=is(s.nextSibling)}if(Vg(n),n.tag===13){if(n=n.memoizedState,n=n!==null?n.dehydrated:null,!n)throw Error(t(317));e:{for(n=n.nextSibling,s=0;n;){if(n.nodeType===8){var o=n.data;if(o==="/$"){if(s===0){mi=is(n.nextSibling);break e}s--}else o!=="$"&&o!=="$!"&&o!=="$?"||s++}n=n.nextSibling}mi=null}}else mi=pi?is(n.stateNode.nextSibling):null;return!0}function Gg(){for(var n=mi;n;)n=is(n.nextSibling)}function Ha(){mi=pi=null,rn=!1}function rh(n){zi===null?zi=[n]:zi.push(n)}var FS=C.ReactCurrentBatchConfig;function ul(n,s,o){if(n=o.ref,n!==null&&typeof n!="function"&&typeof n!="object"){if(o._owner){if(o=o._owner,o){if(o.tag!==1)throw Error(t(309));var u=o.stateNode}if(!u)throw Error(t(147,n));var p=u,_=""+n;return s!==null&&s.ref!==null&&typeof s.ref=="function"&&s.ref._stringRef===_?s.ref:(s=function(R){var V=p.refs;R===null?delete V[_]:V[_]=R},s._stringRef=_,s)}if(typeof n!="string")throw Error(t(284));if(!o._owner)throw Error(t(290,n))}return n}function Lc(n,s){throw n=Object.prototype.toString.call(s),Error(t(31,n==="[object Object]"?"object with keys {"+Object.keys(s).join(", ")+"}":n))}function jg(n){var s=n._init;return s(n._payload)}function Wg(n){function s(re,Q){if(n){var ue=re.deletions;ue===null?(re.deletions=[Q],re.flags|=16):ue.push(Q)}}function o(re,Q){if(!n)return null;for(;Q!==null;)s(re,Q),Q=Q.sibling;return null}function u(re,Q){for(re=new Map;Q!==null;)Q.key!==null?re.set(Q.key,Q):re.set(Q.index,Q),Q=Q.sibling;return re}function p(re,Q){return re=ps(re,Q),re.index=0,re.sibling=null,re}function _(re,Q,ue){return re.index=ue,n?(ue=re.alternate,ue!==null?(ue=ue.index,ue<Q?(re.flags|=2,Q):ue):(re.flags|=2,Q)):(re.flags|=1048576,Q)}function R(re){return n&&re.alternate===null&&(re.flags|=2),re}function V(re,Q,ue,Ae){return Q===null||Q.tag!==6?(Q=Yh(ue,re.mode,Ae),Q.return=re,Q):(Q=p(Q,ue),Q.return=re,Q)}function q(re,Q,ue,Ae){var nt=ue.type;return nt===U?we(re,Q,ue.props.children,Ae,ue.key):Q!==null&&(Q.elementType===nt||typeof nt=="object"&&nt!==null&&nt.$$typeof===me&&jg(nt)===Q.type)?(Ae=p(Q,ue.props),Ae.ref=ul(re,Q,ue),Ae.return=re,Ae):(Ae=nu(ue.type,ue.key,ue.props,null,re.mode,Ae),Ae.ref=ul(re,Q,ue),Ae.return=re,Ae)}function pe(re,Q,ue,Ae){return Q===null||Q.tag!==4||Q.stateNode.containerInfo!==ue.containerInfo||Q.stateNode.implementation!==ue.implementation?(Q=Kh(ue,re.mode,Ae),Q.return=re,Q):(Q=p(Q,ue.children||[]),Q.return=re,Q)}function we(re,Q,ue,Ae,nt){return Q===null||Q.tag!==7?(Q=na(ue,re.mode,Ae,nt),Q.return=re,Q):(Q=p(Q,ue),Q.return=re,Q)}function Ce(re,Q,ue){if(typeof Q=="string"&&Q!==""||typeof Q=="number")return Q=Yh(""+Q,re.mode,ue),Q.return=re,Q;if(typeof Q=="object"&&Q!==null){switch(Q.$$typeof){case D:return ue=nu(Q.type,Q.key,Q.props,null,re.mode,ue),ue.ref=ul(re,null,Q),ue.return=re,ue;case P:return Q=Kh(Q,re.mode,ue),Q.return=re,Q;case me:var Ae=Q._init;return Ce(re,Ae(Q._payload),ue)}if($t(Q)||ne(Q))return Q=na(Q,re.mode,ue,null),Q.return=re,Q;Lc(re,Q)}return null}function Ee(re,Q,ue,Ae){var nt=Q!==null?Q.key:null;if(typeof ue=="string"&&ue!==""||typeof ue=="number")return nt!==null?null:V(re,Q,""+ue,Ae);if(typeof ue=="object"&&ue!==null){switch(ue.$$typeof){case D:return ue.key===nt?q(re,Q,ue,Ae):null;case P:return ue.key===nt?pe(re,Q,ue,Ae):null;case me:return nt=ue._init,Ee(re,Q,nt(ue._payload),Ae)}if($t(ue)||ne(ue))return nt!==null?null:we(re,Q,ue,Ae,null);Lc(re,ue)}return null}function Ge(re,Q,ue,Ae,nt){if(typeof Ae=="string"&&Ae!==""||typeof Ae=="number")return re=re.get(ue)||null,V(Q,re,""+Ae,nt);if(typeof Ae=="object"&&Ae!==null){switch(Ae.$$typeof){case D:return re=re.get(Ae.key===null?ue:Ae.key)||null,q(Q,re,Ae,nt);case P:return re=re.get(Ae.key===null?ue:Ae.key)||null,pe(Q,re,Ae,nt);case me:var at=Ae._init;return Ge(re,Q,ue,at(Ae._payload),nt)}if($t(Ae)||ne(Ae))return re=re.get(ue)||null,we(Q,re,Ae,nt,null);Lc(Q,Ae)}return null}function Ke(re,Q,ue,Ae){for(var nt=null,at=null,ot=Q,ct=Q=0,Rn=null;ot!==null&&ct<ue.length;ct++){ot.index>ct?(Rn=ot,ot=null):Rn=ot.sibling;var Ft=Ee(re,ot,ue[ct],Ae);if(Ft===null){ot===null&&(ot=Rn);break}n&&ot&&Ft.alternate===null&&s(re,ot),Q=_(Ft,Q,ct),at===null?nt=Ft:at.sibling=Ft,at=Ft,ot=Rn}if(ct===ue.length)return o(re,ot),rn&&qs(re,ct),nt;if(ot===null){for(;ct<ue.length;ct++)ot=Ce(re,ue[ct],Ae),ot!==null&&(Q=_(ot,Q,ct),at===null?nt=ot:at.sibling=ot,at=ot);return rn&&qs(re,ct),nt}for(ot=u(re,ot);ct<ue.length;ct++)Rn=Ge(ot,re,ct,ue[ct],Ae),Rn!==null&&(n&&Rn.alternate!==null&&ot.delete(Rn.key===null?ct:Rn.key),Q=_(Rn,Q,ct),at===null?nt=Rn:at.sibling=Rn,at=Rn);return n&&ot.forEach(function(ms){return s(re,ms)}),rn&&qs(re,ct),nt}function Je(re,Q,ue,Ae){var nt=ne(ue);if(typeof nt!="function")throw Error(t(150));if(ue=nt.call(ue),ue==null)throw Error(t(151));for(var at=nt=null,ot=Q,ct=Q=0,Rn=null,Ft=ue.next();ot!==null&&!Ft.done;ct++,Ft=ue.next()){ot.index>ct?(Rn=ot,ot=null):Rn=ot.sibling;var ms=Ee(re,ot,Ft.value,Ae);if(ms===null){ot===null&&(ot=Rn);break}n&&ot&&ms.alternate===null&&s(re,ot),Q=_(ms,Q,ct),at===null?nt=ms:at.sibling=ms,at=ms,ot=Rn}if(Ft.done)return o(re,ot),rn&&qs(re,ct),nt;if(ot===null){for(;!Ft.done;ct++,Ft=ue.next())Ft=Ce(re,Ft.value,Ae),Ft!==null&&(Q=_(Ft,Q,ct),at===null?nt=Ft:at.sibling=Ft,at=Ft);return rn&&qs(re,ct),nt}for(ot=u(re,ot);!Ft.done;ct++,Ft=ue.next())Ft=Ge(ot,re,ct,Ft.value,Ae),Ft!==null&&(n&&Ft.alternate!==null&&ot.delete(Ft.key===null?ct:Ft.key),Q=_(Ft,Q,ct),at===null?nt=Ft:at.sibling=Ft,at=Ft);return n&&ot.forEach(function(mM){return s(re,mM)}),rn&&qs(re,ct),nt}function mn(re,Q,ue,Ae){if(typeof ue=="object"&&ue!==null&&ue.type===U&&ue.key===null&&(ue=ue.props.children),typeof ue=="object"&&ue!==null){switch(ue.$$typeof){case D:e:{for(var nt=ue.key,at=Q;at!==null;){if(at.key===nt){if(nt=ue.type,nt===U){if(at.tag===7){o(re,at.sibling),Q=p(at,ue.props.children),Q.return=re,re=Q;break e}}else if(at.elementType===nt||typeof nt=="object"&&nt!==null&&nt.$$typeof===me&&jg(nt)===at.type){o(re,at.sibling),Q=p(at,ue.props),Q.ref=ul(re,at,ue),Q.return=re,re=Q;break e}o(re,at);break}else s(re,at);at=at.sibling}ue.type===U?(Q=na(ue.props.children,re.mode,Ae,ue.key),Q.return=re,re=Q):(Ae=nu(ue.type,ue.key,ue.props,null,re.mode,Ae),Ae.ref=ul(re,Q,ue),Ae.return=re,re=Ae)}return R(re);case P:e:{for(at=ue.key;Q!==null;){if(Q.key===at)if(Q.tag===4&&Q.stateNode.containerInfo===ue.containerInfo&&Q.stateNode.implementation===ue.implementation){o(re,Q.sibling),Q=p(Q,ue.children||[]),Q.return=re,re=Q;break e}else{o(re,Q);break}else s(re,Q);Q=Q.sibling}Q=Kh(ue,re.mode,Ae),Q.return=re,re=Q}return R(re);case me:return at=ue._init,mn(re,Q,at(ue._payload),Ae)}if($t(ue))return Ke(re,Q,ue,Ae);if(ne(ue))return Je(re,Q,ue,Ae);Lc(re,ue)}return typeof ue=="string"&&ue!==""||typeof ue=="number"?(ue=""+ue,Q!==null&&Q.tag===6?(o(re,Q.sibling),Q=p(Q,ue),Q.return=re,re=Q):(o(re,Q),Q=Yh(ue,re.mode,Ae),Q.return=re,re=Q),R(re)):o(re,Q)}return mn}var Va=Wg(!0),Xg=Wg(!1),Dc=rs(null),Ic=null,Ga=null,sh=null;function ah(){sh=Ga=Ic=null}function oh(n){var s=Dc.current;en(Dc),n._currentValue=s}function lh(n,s,o){for(;n!==null;){var u=n.alternate;if((n.childLanes&s)!==s?(n.childLanes|=s,u!==null&&(u.childLanes|=s)):u!==null&&(u.childLanes&s)!==s&&(u.childLanes|=s),n===o)break;n=n.return}}function ja(n,s){Ic=n,sh=Ga=null,n=n.dependencies,n!==null&&n.firstContext!==null&&((n.lanes&s)!==0&&(ri=!0),n.firstContext=null)}function Ci(n){var s=n._currentValue;if(sh!==n)if(n={context:n,memoizedValue:s,next:null},Ga===null){if(Ic===null)throw Error(t(308));Ga=n,Ic.dependencies={lanes:0,firstContext:n}}else Ga=Ga.next=n;return s}var Ys=null;function ch(n){Ys===null?Ys=[n]:Ys.push(n)}function $g(n,s,o,u){var p=s.interleaved;return p===null?(o.next=o,ch(s)):(o.next=p.next,p.next=o),s.interleaved=o,Rr(n,u)}function Rr(n,s){n.lanes|=s;var o=n.alternate;for(o!==null&&(o.lanes|=s),o=n,n=n.return;n!==null;)n.childLanes|=s,o=n.alternate,o!==null&&(o.childLanes|=s),o=n,n=n.return;return o.tag===3?o.stateNode:null}var os=!1;function uh(n){n.updateQueue={baseState:n.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function qg(n,s){n=n.updateQueue,s.updateQueue===n&&(s.updateQueue={baseState:n.baseState,firstBaseUpdate:n.firstBaseUpdate,lastBaseUpdate:n.lastBaseUpdate,shared:n.shared,effects:n.effects})}function Ar(n,s){return{eventTime:n,lane:s,tag:0,payload:null,callback:null,next:null}}function ls(n,s,o){var u=n.updateQueue;if(u===null)return null;if(u=u.shared,(Lt&2)!==0){var p=u.pending;return p===null?s.next=s:(s.next=p.next,p.next=s),u.pending=s,Rr(n,o)}return p=u.interleaved,p===null?(s.next=s,ch(u)):(s.next=p.next,p.next=s),u.interleaved=s,Rr(n,o)}function Uc(n,s,o){if(s=s.updateQueue,s!==null&&(s=s.shared,(o&4194240)!==0)){var u=s.lanes;u&=n.pendingLanes,o|=u,s.lanes=o,ti(n,o)}}function Yg(n,s){var o=n.updateQueue,u=n.alternate;if(u!==null&&(u=u.updateQueue,o===u)){var p=null,_=null;if(o=o.firstBaseUpdate,o!==null){do{var R={eventTime:o.eventTime,lane:o.lane,tag:o.tag,payload:o.payload,callback:o.callback,next:null};_===null?p=_=R:_=_.next=R,o=o.next}while(o!==null);_===null?p=_=s:_=_.next=s}else p=_=s;o={baseState:u.baseState,firstBaseUpdate:p,lastBaseUpdate:_,shared:u.shared,effects:u.effects},n.updateQueue=o;return}n=o.lastBaseUpdate,n===null?o.firstBaseUpdate=s:n.next=s,o.lastBaseUpdate=s}function Fc(n,s,o,u){var p=n.updateQueue;os=!1;var _=p.firstBaseUpdate,R=p.lastBaseUpdate,V=p.shared.pending;if(V!==null){p.shared.pending=null;var q=V,pe=q.next;q.next=null,R===null?_=pe:R.next=pe,R=q;var we=n.alternate;we!==null&&(we=we.updateQueue,V=we.lastBaseUpdate,V!==R&&(V===null?we.firstBaseUpdate=pe:V.next=pe,we.lastBaseUpdate=q))}if(_!==null){var Ce=p.baseState;R=0,we=pe=q=null,V=_;do{var Ee=V.lane,Ge=V.eventTime;if((u&Ee)===Ee){we!==null&&(we=we.next={eventTime:Ge,lane:0,tag:V.tag,payload:V.payload,callback:V.callback,next:null});e:{var Ke=n,Je=V;switch(Ee=s,Ge=o,Je.tag){case 1:if(Ke=Je.payload,typeof Ke=="function"){Ce=Ke.call(Ge,Ce,Ee);break e}Ce=Ke;break e;case 3:Ke.flags=Ke.flags&-65537|128;case 0:if(Ke=Je.payload,Ee=typeof Ke=="function"?Ke.call(Ge,Ce,Ee):Ke,Ee==null)break e;Ce=ce({},Ce,Ee);break e;case 2:os=!0}}V.callback!==null&&V.lane!==0&&(n.flags|=64,Ee=p.effects,Ee===null?p.effects=[V]:Ee.push(V))}else Ge={eventTime:Ge,lane:Ee,tag:V.tag,payload:V.payload,callback:V.callback,next:null},we===null?(pe=we=Ge,q=Ce):we=we.next=Ge,R|=Ee;if(V=V.next,V===null){if(V=p.shared.pending,V===null)break;Ee=V,V=Ee.next,Ee.next=null,p.lastBaseUpdate=Ee,p.shared.pending=null}}while(!0);if(we===null&&(q=Ce),p.baseState=q,p.firstBaseUpdate=pe,p.lastBaseUpdate=we,s=p.shared.interleaved,s!==null){p=s;do R|=p.lane,p=p.next;while(p!==s)}else _===null&&(p.shared.lanes=0);Zs|=R,n.lanes=R,n.memoizedState=Ce}}function Kg(n,s,o){if(n=s.effects,s.effects=null,n!==null)for(s=0;s<n.length;s++){var u=n[s],p=u.callback;if(p!==null){if(u.callback=null,u=o,typeof p!="function")throw Error(t(191,p));p.call(u)}}}var dl={},ir=rs(dl),hl=rs(dl),fl=rs(dl);function Ks(n){if(n===dl)throw Error(t(174));return n}function dh(n,s){switch(Kt(fl,s),Kt(hl,n),Kt(ir,dl),n=s.nodeType,n){case 9:case 11:s=(s=s.documentElement)?s.namespaceURI:T(null,"");break;default:n=n===8?s.parentNode:s,s=n.namespaceURI||null,n=n.tagName,s=T(s,n)}en(ir),Kt(ir,s)}function Wa(){en(ir),en(hl),en(fl)}function Qg(n){Ks(fl.current);var s=Ks(ir.current),o=T(s,n.type);s!==o&&(Kt(hl,n),Kt(ir,o))}function hh(n){hl.current===n&&(en(ir),en(hl))}var ln=rs(0);function Oc(n){for(var s=n;s!==null;){if(s.tag===13){var o=s.memoizedState;if(o!==null&&(o=o.dehydrated,o===null||o.data==="$?"||o.data==="$!"))return s}else if(s.tag===19&&s.memoizedProps.revealOrder!==void 0){if((s.flags&128)!==0)return s}else if(s.child!==null){s.child.return=s,s=s.child;continue}if(s===n)break;for(;s.sibling===null;){if(s.return===null||s.return===n)return null;s=s.return}s.sibling.return=s.return,s=s.sibling}return null}var fh=[];function ph(){for(var n=0;n<fh.length;n++)fh[n]._workInProgressVersionPrimary=null;fh.length=0}var kc=C.ReactCurrentDispatcher,mh=C.ReactCurrentBatchConfig,Qs=0,cn=null,_n=null,Tn=null,zc=!1,pl=!1,ml=0,OS=0;function zn(){throw Error(t(321))}function gh(n,s){if(s===null)return!1;for(var o=0;o<s.length&&o<n.length;o++)if(!ki(n[o],s[o]))return!1;return!0}function xh(n,s,o,u,p,_){if(Qs=_,cn=s,s.memoizedState=null,s.updateQueue=null,s.lanes=0,kc.current=n===null||n.memoizedState===null?HS:VS,n=o(u,p),pl){_=0;do{if(pl=!1,ml=0,25<=_)throw Error(t(301));_+=1,Tn=_n=null,s.updateQueue=null,kc.current=GS,n=o(u,p)}while(pl)}if(kc.current=Vc,s=_n!==null&&_n.next!==null,Qs=0,Tn=_n=cn=null,zc=!1,s)throw Error(t(300));return n}function vh(){var n=ml!==0;return ml=0,n}function rr(){var n={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Tn===null?cn.memoizedState=Tn=n:Tn=Tn.next=n,Tn}function Ri(){if(_n===null){var n=cn.alternate;n=n!==null?n.memoizedState:null}else n=_n.next;var s=Tn===null?cn.memoizedState:Tn.next;if(s!==null)Tn=s,_n=n;else{if(n===null)throw Error(t(310));_n=n,n={memoizedState:_n.memoizedState,baseState:_n.baseState,baseQueue:_n.baseQueue,queue:_n.queue,next:null},Tn===null?cn.memoizedState=Tn=n:Tn=Tn.next=n}return Tn}function gl(n,s){return typeof s=="function"?s(n):s}function _h(n){var s=Ri(),o=s.queue;if(o===null)throw Error(t(311));o.lastRenderedReducer=n;var u=_n,p=u.baseQueue,_=o.pending;if(_!==null){if(p!==null){var R=p.next;p.next=_.next,_.next=R}u.baseQueue=p=_,o.pending=null}if(p!==null){_=p.next,u=u.baseState;var V=R=null,q=null,pe=_;do{var we=pe.lane;if((Qs&we)===we)q!==null&&(q=q.next={lane:0,action:pe.action,hasEagerState:pe.hasEagerState,eagerState:pe.eagerState,next:null}),u=pe.hasEagerState?pe.eagerState:n(u,pe.action);else{var Ce={lane:we,action:pe.action,hasEagerState:pe.hasEagerState,eagerState:pe.eagerState,next:null};q===null?(V=q=Ce,R=u):q=q.next=Ce,cn.lanes|=we,Zs|=we}pe=pe.next}while(pe!==null&&pe!==_);q===null?R=u:q.next=V,ki(u,s.memoizedState)||(ri=!0),s.memoizedState=u,s.baseState=R,s.baseQueue=q,o.lastRenderedState=u}if(n=o.interleaved,n!==null){p=n;do _=p.lane,cn.lanes|=_,Zs|=_,p=p.next;while(p!==n)}else p===null&&(o.lanes=0);return[s.memoizedState,o.dispatch]}function yh(n){var s=Ri(),o=s.queue;if(o===null)throw Error(t(311));o.lastRenderedReducer=n;var u=o.dispatch,p=o.pending,_=s.memoizedState;if(p!==null){o.pending=null;var R=p=p.next;do _=n(_,R.action),R=R.next;while(R!==p);ki(_,s.memoizedState)||(ri=!0),s.memoizedState=_,s.baseQueue===null&&(s.baseState=_),o.lastRenderedState=_}return[_,u]}function Zg(){}function Jg(n,s){var o=cn,u=Ri(),p=s(),_=!ki(u.memoizedState,p);if(_&&(u.memoizedState=p,ri=!0),u=u.queue,Sh(n0.bind(null,o,u,n),[n]),u.getSnapshot!==s||_||Tn!==null&&Tn.memoizedState.tag&1){if(o.flags|=2048,xl(9,t0.bind(null,o,u,p,s),void 0,null),Cn===null)throw Error(t(349));(Qs&30)!==0||e0(o,s,p)}return p}function e0(n,s,o){n.flags|=16384,n={getSnapshot:s,value:o},s=cn.updateQueue,s===null?(s={lastEffect:null,stores:null},cn.updateQueue=s,s.stores=[n]):(o=s.stores,o===null?s.stores=[n]:o.push(n))}function t0(n,s,o,u){s.value=o,s.getSnapshot=u,i0(s)&&r0(n)}function n0(n,s,o){return o(function(){i0(s)&&r0(n)})}function i0(n){var s=n.getSnapshot;n=n.value;try{var o=s();return!ki(n,o)}catch{return!0}}function r0(n){var s=Rr(n,1);s!==null&&Gi(s,n,1,-1)}function s0(n){var s=rr();return typeof n=="function"&&(n=n()),s.memoizedState=s.baseState=n,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:gl,lastRenderedState:n},s.queue=n,n=n.dispatch=BS.bind(null,cn,n),[s.memoizedState,n]}function xl(n,s,o,u){return n={tag:n,create:s,destroy:o,deps:u,next:null},s=cn.updateQueue,s===null?(s={lastEffect:null,stores:null},cn.updateQueue=s,s.lastEffect=n.next=n):(o=s.lastEffect,o===null?s.lastEffect=n.next=n:(u=o.next,o.next=n,n.next=u,s.lastEffect=n)),n}function a0(){return Ri().memoizedState}function Bc(n,s,o,u){var p=rr();cn.flags|=n,p.memoizedState=xl(1|s,o,void 0,u===void 0?null:u)}function Hc(n,s,o,u){var p=Ri();u=u===void 0?null:u;var _=void 0;if(_n!==null){var R=_n.memoizedState;if(_=R.destroy,u!==null&&gh(u,R.deps)){p.memoizedState=xl(s,o,_,u);return}}cn.flags|=n,p.memoizedState=xl(1|s,o,_,u)}function o0(n,s){return Bc(8390656,8,n,s)}function Sh(n,s){return Hc(2048,8,n,s)}function l0(n,s){return Hc(4,2,n,s)}function c0(n,s){return Hc(4,4,n,s)}function u0(n,s){if(typeof s=="function")return n=n(),s(n),function(){s(null)};if(s!=null)return n=n(),s.current=n,function(){s.current=null}}function d0(n,s,o){return o=o!=null?o.concat([n]):null,Hc(4,4,u0.bind(null,s,n),o)}function Mh(){}function h0(n,s){var o=Ri();s=s===void 0?null:s;var u=o.memoizedState;return u!==null&&s!==null&&gh(s,u[1])?u[0]:(o.memoizedState=[n,s],n)}function f0(n,s){var o=Ri();s=s===void 0?null:s;var u=o.memoizedState;return u!==null&&s!==null&&gh(s,u[1])?u[0]:(n=n(),o.memoizedState=[n,s],n)}function p0(n,s,o){return(Qs&21)===0?(n.baseState&&(n.baseState=!1,ri=!0),n.memoizedState=o):(ki(o,s)||(o=Ve(),cn.lanes|=o,Zs|=o,n.baseState=!0),s)}function kS(n,s){var o=Mt;Mt=o!==0&&4>o?o:4,n(!0);var u=mh.transition;mh.transition={};try{n(!1),s()}finally{Mt=o,mh.transition=u}}function m0(){return Ri().memoizedState}function zS(n,s,o){var u=hs(n);if(o={lane:u,action:o,hasEagerState:!1,eagerState:null,next:null},g0(n))x0(s,o);else if(o=$g(n,s,o,u),o!==null){var p=Yn();Gi(o,n,u,p),v0(o,s,u)}}function BS(n,s,o){var u=hs(n),p={lane:u,action:o,hasEagerState:!1,eagerState:null,next:null};if(g0(n))x0(s,p);else{var _=n.alternate;if(n.lanes===0&&(_===null||_.lanes===0)&&(_=s.lastRenderedReducer,_!==null))try{var R=s.lastRenderedState,V=_(R,o);if(p.hasEagerState=!0,p.eagerState=V,ki(V,R)){var q=s.interleaved;q===null?(p.next=p,ch(s)):(p.next=q.next,q.next=p),s.interleaved=p;return}}catch{}finally{}o=$g(n,s,p,u),o!==null&&(p=Yn(),Gi(o,n,u,p),v0(o,s,u))}}function g0(n){var s=n.alternate;return n===cn||s!==null&&s===cn}function x0(n,s){pl=zc=!0;var o=n.pending;o===null?s.next=s:(s.next=o.next,o.next=s),n.pending=s}function v0(n,s,o){if((o&4194240)!==0){var u=s.lanes;u&=n.pendingLanes,o|=u,s.lanes=o,ti(n,o)}}var Vc={readContext:Ci,useCallback:zn,useContext:zn,useEffect:zn,useImperativeHandle:zn,useInsertionEffect:zn,useLayoutEffect:zn,useMemo:zn,useReducer:zn,useRef:zn,useState:zn,useDebugValue:zn,useDeferredValue:zn,useTransition:zn,useMutableSource:zn,useSyncExternalStore:zn,useId:zn,unstable_isNewReconciler:!1},HS={readContext:Ci,useCallback:function(n,s){return rr().memoizedState=[n,s===void 0?null:s],n},useContext:Ci,useEffect:o0,useImperativeHandle:function(n,s,o){return o=o!=null?o.concat([n]):null,Bc(4194308,4,u0.bind(null,s,n),o)},useLayoutEffect:function(n,s){return Bc(4194308,4,n,s)},useInsertionEffect:function(n,s){return Bc(4,2,n,s)},useMemo:function(n,s){var o=rr();return s=s===void 0?null:s,n=n(),o.memoizedState=[n,s],n},useReducer:function(n,s,o){var u=rr();return s=o!==void 0?o(s):s,u.memoizedState=u.baseState=s,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:n,lastRenderedState:s},u.queue=n,n=n.dispatch=zS.bind(null,cn,n),[u.memoizedState,n]},useRef:function(n){var s=rr();return n={current:n},s.memoizedState=n},useState:s0,useDebugValue:Mh,useDeferredValue:function(n){return rr().memoizedState=n},useTransition:function(){var n=s0(!1),s=n[0];return n=kS.bind(null,n[1]),rr().memoizedState=n,[s,n]},useMutableSource:function(){},useSyncExternalStore:function(n,s,o){var u=cn,p=rr();if(rn){if(o===void 0)throw Error(t(407));o=o()}else{if(o=s(),Cn===null)throw Error(t(349));(Qs&30)!==0||e0(u,s,o)}p.memoizedState=o;var _={value:o,getSnapshot:s};return p.queue=_,o0(n0.bind(null,u,_,n),[n]),u.flags|=2048,xl(9,t0.bind(null,u,_,o,s),void 0,null),o},useId:function(){var n=rr(),s=Cn.identifierPrefix;if(rn){var o=Cr,u=Tr;o=(u&~(1<<32-Ne(u)-1)).toString(32)+o,s=":"+s+"R"+o,o=ml++,0<o&&(s+="H"+o.toString(32)),s+=":"}else o=OS++,s=":"+s+"r"+o.toString(32)+":";return n.memoizedState=s},unstable_isNewReconciler:!1},VS={readContext:Ci,useCallback:h0,useContext:Ci,useEffect:Sh,useImperativeHandle:d0,useInsertionEffect:l0,useLayoutEffect:c0,useMemo:f0,useReducer:_h,useRef:a0,useState:function(){return _h(gl)},useDebugValue:Mh,useDeferredValue:function(n){var s=Ri();return p0(s,_n.memoizedState,n)},useTransition:function(){var n=_h(gl)[0],s=Ri().memoizedState;return[n,s]},useMutableSource:Zg,useSyncExternalStore:Jg,useId:m0,unstable_isNewReconciler:!1},GS={readContext:Ci,useCallback:h0,useContext:Ci,useEffect:Sh,useImperativeHandle:d0,useInsertionEffect:l0,useLayoutEffect:c0,useMemo:f0,useReducer:yh,useRef:a0,useState:function(){return yh(gl)},useDebugValue:Mh,useDeferredValue:function(n){var s=Ri();return _n===null?s.memoizedState=n:p0(s,_n.memoizedState,n)},useTransition:function(){var n=yh(gl)[0],s=Ri().memoizedState;return[n,s]},useMutableSource:Zg,useSyncExternalStore:Jg,useId:m0,unstable_isNewReconciler:!1};function Bi(n,s){if(n&&n.defaultProps){s=ce({},s),n=n.defaultProps;for(var o in n)s[o]===void 0&&(s[o]=n[o]);return s}return s}function Eh(n,s,o,u){s=n.memoizedState,o=o(u,s),o=o==null?s:ce({},s,o),n.memoizedState=o,n.lanes===0&&(n.updateQueue.baseState=o)}var Gc={isMounted:function(n){return(n=n._reactInternals)?$n(n)===n:!1},enqueueSetState:function(n,s,o){n=n._reactInternals;var u=Yn(),p=hs(n),_=Ar(u,p);_.payload=s,o!=null&&(_.callback=o),s=ls(n,_,p),s!==null&&(Gi(s,n,p,u),Uc(s,n,p))},enqueueReplaceState:function(n,s,o){n=n._reactInternals;var u=Yn(),p=hs(n),_=Ar(u,p);_.tag=1,_.payload=s,o!=null&&(_.callback=o),s=ls(n,_,p),s!==null&&(Gi(s,n,p,u),Uc(s,n,p))},enqueueForceUpdate:function(n,s){n=n._reactInternals;var o=Yn(),u=hs(n),p=Ar(o,u);p.tag=2,s!=null&&(p.callback=s),s=ls(n,p,u),s!==null&&(Gi(s,n,u,o),Uc(s,n,u))}};function _0(n,s,o,u,p,_,R){return n=n.stateNode,typeof n.shouldComponentUpdate=="function"?n.shouldComponentUpdate(u,_,R):s.prototype&&s.prototype.isPureReactComponent?!il(o,u)||!il(p,_):!0}function y0(n,s,o){var u=!1,p=ss,_=s.contextType;return typeof _=="object"&&_!==null?_=Ci(_):(p=ii(s)?Xs:kn.current,u=s.contextTypes,_=(u=u!=null)?ka(n,p):ss),s=new s(o,_),n.memoizedState=s.state!==null&&s.state!==void 0?s.state:null,s.updater=Gc,n.stateNode=s,s._reactInternals=n,u&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=p,n.__reactInternalMemoizedMaskedChildContext=_),s}function S0(n,s,o,u){n=s.state,typeof s.componentWillReceiveProps=="function"&&s.componentWillReceiveProps(o,u),typeof s.UNSAFE_componentWillReceiveProps=="function"&&s.UNSAFE_componentWillReceiveProps(o,u),s.state!==n&&Gc.enqueueReplaceState(s,s.state,null)}function wh(n,s,o,u){var p=n.stateNode;p.props=o,p.state=n.memoizedState,p.refs={},uh(n);var _=s.contextType;typeof _=="object"&&_!==null?p.context=Ci(_):(_=ii(s)?Xs:kn.current,p.context=ka(n,_)),p.state=n.memoizedState,_=s.getDerivedStateFromProps,typeof _=="function"&&(Eh(n,s,_,o),p.state=n.memoizedState),typeof s.getDerivedStateFromProps=="function"||typeof p.getSnapshotBeforeUpdate=="function"||typeof p.UNSAFE_componentWillMount!="function"&&typeof p.componentWillMount!="function"||(s=p.state,typeof p.componentWillMount=="function"&&p.componentWillMount(),typeof p.UNSAFE_componentWillMount=="function"&&p.UNSAFE_componentWillMount(),s!==p.state&&Gc.enqueueReplaceState(p,p.state,null),Fc(n,o,p,u),p.state=n.memoizedState),typeof p.componentDidMount=="function"&&(n.flags|=4194308)}function Xa(n,s){try{var o="",u=s;do o+=ze(u),u=u.return;while(u);var p=o}catch(_){p=`
Error generating stack: `+_.message+`
`+_.stack}return{value:n,source:s,stack:p,digest:null}}function bh(n,s,o){return{value:n,source:null,stack:o??null,digest:s??null}}function Th(n,s){try{console.error(s.value)}catch(o){setTimeout(function(){throw o})}}var jS=typeof WeakMap=="function"?WeakMap:Map;function M0(n,s,o){o=Ar(-1,o),o.tag=3,o.payload={element:null};var u=s.value;return o.callback=function(){Kc||(Kc=!0,Hh=u),Th(n,s)},o}function E0(n,s,o){o=Ar(-1,o),o.tag=3;var u=n.type.getDerivedStateFromError;if(typeof u=="function"){var p=s.value;o.payload=function(){return u(p)},o.callback=function(){Th(n,s)}}var _=n.stateNode;return _!==null&&typeof _.componentDidCatch=="function"&&(o.callback=function(){Th(n,s),typeof u!="function"&&(us===null?us=new Set([this]):us.add(this));var R=s.stack;this.componentDidCatch(s.value,{componentStack:R!==null?R:""})}),o}function w0(n,s,o){var u=n.pingCache;if(u===null){u=n.pingCache=new jS;var p=new Set;u.set(s,p)}else p=u.get(s),p===void 0&&(p=new Set,u.set(s,p));p.has(o)||(p.add(o),n=rM.bind(null,n,s,o),s.then(n,n))}function b0(n){do{var s;if((s=n.tag===13)&&(s=n.memoizedState,s=s!==null?s.dehydrated!==null:!0),s)return n;n=n.return}while(n!==null);return null}function T0(n,s,o,u,p){return(n.mode&1)===0?(n===s?n.flags|=65536:(n.flags|=128,o.flags|=131072,o.flags&=-52805,o.tag===1&&(o.alternate===null?o.tag=17:(s=Ar(-1,1),s.tag=2,ls(o,s,1))),o.lanes|=1),n):(n.flags|=65536,n.lanes=p,n)}var WS=C.ReactCurrentOwner,ri=!1;function qn(n,s,o,u){s.child=n===null?Xg(s,null,o,u):Va(s,n.child,o,u)}function C0(n,s,o,u,p){o=o.render;var _=s.ref;return ja(s,p),u=xh(n,s,o,u,_,p),o=vh(),n!==null&&!ri?(s.updateQueue=n.updateQueue,s.flags&=-2053,n.lanes&=~p,Pr(n,s,p)):(rn&&o&&eh(s),s.flags|=1,qn(n,s,u,p),s.child)}function R0(n,s,o,u,p){if(n===null){var _=o.type;return typeof _=="function"&&!qh(_)&&_.defaultProps===void 0&&o.compare===null&&o.defaultProps===void 0?(s.tag=15,s.type=_,A0(n,s,_,u,p)):(n=nu(o.type,null,u,s,s.mode,p),n.ref=s.ref,n.return=s,s.child=n)}if(_=n.child,(n.lanes&p)===0){var R=_.memoizedProps;if(o=o.compare,o=o!==null?o:il,o(R,u)&&n.ref===s.ref)return Pr(n,s,p)}return s.flags|=1,n=ps(_,u),n.ref=s.ref,n.return=s,s.child=n}function A0(n,s,o,u,p){if(n!==null){var _=n.memoizedProps;if(il(_,u)&&n.ref===s.ref)if(ri=!1,s.pendingProps=u=_,(n.lanes&p)!==0)(n.flags&131072)!==0&&(ri=!0);else return s.lanes=n.lanes,Pr(n,s,p)}return Ch(n,s,o,u,p)}function P0(n,s,o){var u=s.pendingProps,p=u.children,_=n!==null?n.memoizedState:null;if(u.mode==="hidden")if((s.mode&1)===0)s.memoizedState={baseLanes:0,cachePool:null,transitions:null},Kt(qa,gi),gi|=o;else{if((o&1073741824)===0)return n=_!==null?_.baseLanes|o:o,s.lanes=s.childLanes=1073741824,s.memoizedState={baseLanes:n,cachePool:null,transitions:null},s.updateQueue=null,Kt(qa,gi),gi|=n,null;s.memoizedState={baseLanes:0,cachePool:null,transitions:null},u=_!==null?_.baseLanes:o,Kt(qa,gi),gi|=u}else _!==null?(u=_.baseLanes|o,s.memoizedState=null):u=o,Kt(qa,gi),gi|=u;return qn(n,s,p,o),s.child}function N0(n,s){var o=s.ref;(n===null&&o!==null||n!==null&&n.ref!==o)&&(s.flags|=512,s.flags|=2097152)}function Ch(n,s,o,u,p){var _=ii(o)?Xs:kn.current;return _=ka(s,_),ja(s,p),o=xh(n,s,o,u,_,p),u=vh(),n!==null&&!ri?(s.updateQueue=n.updateQueue,s.flags&=-2053,n.lanes&=~p,Pr(n,s,p)):(rn&&u&&eh(s),s.flags|=1,qn(n,s,o,p),s.child)}function L0(n,s,o,u,p){if(ii(o)){var _=!0;Cc(s)}else _=!1;if(ja(s,p),s.stateNode===null)Wc(n,s),y0(s,o,u),wh(s,o,u,p),u=!0;else if(n===null){var R=s.stateNode,V=s.memoizedProps;R.props=V;var q=R.context,pe=o.contextType;typeof pe=="object"&&pe!==null?pe=Ci(pe):(pe=ii(o)?Xs:kn.current,pe=ka(s,pe));var we=o.getDerivedStateFromProps,Ce=typeof we=="function"||typeof R.getSnapshotBeforeUpdate=="function";Ce||typeof R.UNSAFE_componentWillReceiveProps!="function"&&typeof R.componentWillReceiveProps!="function"||(V!==u||q!==pe)&&S0(s,R,u,pe),os=!1;var Ee=s.memoizedState;R.state=Ee,Fc(s,u,R,p),q=s.memoizedState,V!==u||Ee!==q||ni.current||os?(typeof we=="function"&&(Eh(s,o,we,u),q=s.memoizedState),(V=os||_0(s,o,V,u,Ee,q,pe))?(Ce||typeof R.UNSAFE_componentWillMount!="function"&&typeof R.componentWillMount!="function"||(typeof R.componentWillMount=="function"&&R.componentWillMount(),typeof R.UNSAFE_componentWillMount=="function"&&R.UNSAFE_componentWillMount()),typeof R.componentDidMount=="function"&&(s.flags|=4194308)):(typeof R.componentDidMount=="function"&&(s.flags|=4194308),s.memoizedProps=u,s.memoizedState=q),R.props=u,R.state=q,R.context=pe,u=V):(typeof R.componentDidMount=="function"&&(s.flags|=4194308),u=!1)}else{R=s.stateNode,qg(n,s),V=s.memoizedProps,pe=s.type===s.elementType?V:Bi(s.type,V),R.props=pe,Ce=s.pendingProps,Ee=R.context,q=o.contextType,typeof q=="object"&&q!==null?q=Ci(q):(q=ii(o)?Xs:kn.current,q=ka(s,q));var Ge=o.getDerivedStateFromProps;(we=typeof Ge=="function"||typeof R.getSnapshotBeforeUpdate=="function")||typeof R.UNSAFE_componentWillReceiveProps!="function"&&typeof R.componentWillReceiveProps!="function"||(V!==Ce||Ee!==q)&&S0(s,R,u,q),os=!1,Ee=s.memoizedState,R.state=Ee,Fc(s,u,R,p);var Ke=s.memoizedState;V!==Ce||Ee!==Ke||ni.current||os?(typeof Ge=="function"&&(Eh(s,o,Ge,u),Ke=s.memoizedState),(pe=os||_0(s,o,pe,u,Ee,Ke,q)||!1)?(we||typeof R.UNSAFE_componentWillUpdate!="function"&&typeof R.componentWillUpdate!="function"||(typeof R.componentWillUpdate=="function"&&R.componentWillUpdate(u,Ke,q),typeof R.UNSAFE_componentWillUpdate=="function"&&R.UNSAFE_componentWillUpdate(u,Ke,q)),typeof R.componentDidUpdate=="function"&&(s.flags|=4),typeof R.getSnapshotBeforeUpdate=="function"&&(s.flags|=1024)):(typeof R.componentDidUpdate!="function"||V===n.memoizedProps&&Ee===n.memoizedState||(s.flags|=4),typeof R.getSnapshotBeforeUpdate!="function"||V===n.memoizedProps&&Ee===n.memoizedState||(s.flags|=1024),s.memoizedProps=u,s.memoizedState=Ke),R.props=u,R.state=Ke,R.context=q,u=pe):(typeof R.componentDidUpdate!="function"||V===n.memoizedProps&&Ee===n.memoizedState||(s.flags|=4),typeof R.getSnapshotBeforeUpdate!="function"||V===n.memoizedProps&&Ee===n.memoizedState||(s.flags|=1024),u=!1)}return Rh(n,s,o,u,_,p)}function Rh(n,s,o,u,p,_){N0(n,s);var R=(s.flags&128)!==0;if(!u&&!R)return p&&Og(s,o,!1),Pr(n,s,_);u=s.stateNode,WS.current=s;var V=R&&typeof o.getDerivedStateFromError!="function"?null:u.render();return s.flags|=1,n!==null&&R?(s.child=Va(s,n.child,null,_),s.child=Va(s,null,V,_)):qn(n,s,V,_),s.memoizedState=u.state,p&&Og(s,o,!0),s.child}function D0(n){var s=n.stateNode;s.pendingContext?Ug(n,s.pendingContext,s.pendingContext!==s.context):s.context&&Ug(n,s.context,!1),dh(n,s.containerInfo)}function I0(n,s,o,u,p){return Ha(),rh(p),s.flags|=256,qn(n,s,o,u),s.child}var Ah={dehydrated:null,treeContext:null,retryLane:0};function Ph(n){return{baseLanes:n,cachePool:null,transitions:null}}function U0(n,s,o){var u=s.pendingProps,p=ln.current,_=!1,R=(s.flags&128)!==0,V;if((V=R)||(V=n!==null&&n.memoizedState===null?!1:(p&2)!==0),V?(_=!0,s.flags&=-129):(n===null||n.memoizedState!==null)&&(p|=1),Kt(ln,p&1),n===null)return ih(s),n=s.memoizedState,n!==null&&(n=n.dehydrated,n!==null)?((s.mode&1)===0?s.lanes=1:n.data==="$!"?s.lanes=8:s.lanes=1073741824,null):(R=u.children,n=u.fallback,_?(u=s.mode,_=s.child,R={mode:"hidden",children:R},(u&1)===0&&_!==null?(_.childLanes=0,_.pendingProps=R):_=iu(R,u,0,null),n=na(n,u,o,null),_.return=s,n.return=s,_.sibling=n,s.child=_,s.child.memoizedState=Ph(o),s.memoizedState=Ah,n):Nh(s,R));if(p=n.memoizedState,p!==null&&(V=p.dehydrated,V!==null))return XS(n,s,R,u,V,p,o);if(_){_=u.fallback,R=s.mode,p=n.child,V=p.sibling;var q={mode:"hidden",children:u.children};return(R&1)===0&&s.child!==p?(u=s.child,u.childLanes=0,u.pendingProps=q,s.deletions=null):(u=ps(p,q),u.subtreeFlags=p.subtreeFlags&14680064),V!==null?_=ps(V,_):(_=na(_,R,o,null),_.flags|=2),_.return=s,u.return=s,u.sibling=_,s.child=u,u=_,_=s.child,R=n.child.memoizedState,R=R===null?Ph(o):{baseLanes:R.baseLanes|o,cachePool:null,transitions:R.transitions},_.memoizedState=R,_.childLanes=n.childLanes&~o,s.memoizedState=Ah,u}return _=n.child,n=_.sibling,u=ps(_,{mode:"visible",children:u.children}),(s.mode&1)===0&&(u.lanes=o),u.return=s,u.sibling=null,n!==null&&(o=s.deletions,o===null?(s.deletions=[n],s.flags|=16):o.push(n)),s.child=u,s.memoizedState=null,u}function Nh(n,s){return s=iu({mode:"visible",children:s},n.mode,0,null),s.return=n,n.child=s}function jc(n,s,o,u){return u!==null&&rh(u),Va(s,n.child,null,o),n=Nh(s,s.pendingProps.children),n.flags|=2,s.memoizedState=null,n}function XS(n,s,o,u,p,_,R){if(o)return s.flags&256?(s.flags&=-257,u=bh(Error(t(422))),jc(n,s,R,u)):s.memoizedState!==null?(s.child=n.child,s.flags|=128,null):(_=u.fallback,p=s.mode,u=iu({mode:"visible",children:u.children},p,0,null),_=na(_,p,R,null),_.flags|=2,u.return=s,_.return=s,u.sibling=_,s.child=u,(s.mode&1)!==0&&Va(s,n.child,null,R),s.child.memoizedState=Ph(R),s.memoizedState=Ah,_);if((s.mode&1)===0)return jc(n,s,R,null);if(p.data==="$!"){if(u=p.nextSibling&&p.nextSibling.dataset,u)var V=u.dgst;return u=V,_=Error(t(419)),u=bh(_,u,void 0),jc(n,s,R,u)}if(V=(R&n.childLanes)!==0,ri||V){if(u=Cn,u!==null){switch(R&-R){case 4:p=2;break;case 16:p=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:p=32;break;case 536870912:p=268435456;break;default:p=0}p=(p&(u.suspendedLanes|R))!==0?0:p,p!==0&&p!==_.retryLane&&(_.retryLane=p,Rr(n,p),Gi(u,n,p,-1))}return $h(),u=bh(Error(t(421))),jc(n,s,R,u)}return p.data==="$?"?(s.flags|=128,s.child=n.child,s=sM.bind(null,n),p._reactRetry=s,null):(n=_.treeContext,mi=is(p.nextSibling),pi=s,rn=!0,zi=null,n!==null&&(bi[Ti++]=Tr,bi[Ti++]=Cr,bi[Ti++]=$s,Tr=n.id,Cr=n.overflow,$s=s),s=Nh(s,u.children),s.flags|=4096,s)}function F0(n,s,o){n.lanes|=s;var u=n.alternate;u!==null&&(u.lanes|=s),lh(n.return,s,o)}function Lh(n,s,o,u,p){var _=n.memoizedState;_===null?n.memoizedState={isBackwards:s,rendering:null,renderingStartTime:0,last:u,tail:o,tailMode:p}:(_.isBackwards=s,_.rendering=null,_.renderingStartTime=0,_.last=u,_.tail=o,_.tailMode=p)}function O0(n,s,o){var u=s.pendingProps,p=u.revealOrder,_=u.tail;if(qn(n,s,u.children,o),u=ln.current,(u&2)!==0)u=u&1|2,s.flags|=128;else{if(n!==null&&(n.flags&128)!==0)e:for(n=s.child;n!==null;){if(n.tag===13)n.memoizedState!==null&&F0(n,o,s);else if(n.tag===19)F0(n,o,s);else if(n.child!==null){n.child.return=n,n=n.child;continue}if(n===s)break e;for(;n.sibling===null;){if(n.return===null||n.return===s)break e;n=n.return}n.sibling.return=n.return,n=n.sibling}u&=1}if(Kt(ln,u),(s.mode&1)===0)s.memoizedState=null;else switch(p){case"forwards":for(o=s.child,p=null;o!==null;)n=o.alternate,n!==null&&Oc(n)===null&&(p=o),o=o.sibling;o=p,o===null?(p=s.child,s.child=null):(p=o.sibling,o.sibling=null),Lh(s,!1,p,o,_);break;case"backwards":for(o=null,p=s.child,s.child=null;p!==null;){if(n=p.alternate,n!==null&&Oc(n)===null){s.child=p;break}n=p.sibling,p.sibling=o,o=p,p=n}Lh(s,!0,o,null,_);break;case"together":Lh(s,!1,null,null,void 0);break;default:s.memoizedState=null}return s.child}function Wc(n,s){(s.mode&1)===0&&n!==null&&(n.alternate=null,s.alternate=null,s.flags|=2)}function Pr(n,s,o){if(n!==null&&(s.dependencies=n.dependencies),Zs|=s.lanes,(o&s.childLanes)===0)return null;if(n!==null&&s.child!==n.child)throw Error(t(153));if(s.child!==null){for(n=s.child,o=ps(n,n.pendingProps),s.child=o,o.return=s;n.sibling!==null;)n=n.sibling,o=o.sibling=ps(n,n.pendingProps),o.return=s;o.sibling=null}return s.child}function $S(n,s,o){switch(s.tag){case 3:D0(s),Ha();break;case 5:Qg(s);break;case 1:ii(s.type)&&Cc(s);break;case 4:dh(s,s.stateNode.containerInfo);break;case 10:var u=s.type._context,p=s.memoizedProps.value;Kt(Dc,u._currentValue),u._currentValue=p;break;case 13:if(u=s.memoizedState,u!==null)return u.dehydrated!==null?(Kt(ln,ln.current&1),s.flags|=128,null):(o&s.child.childLanes)!==0?U0(n,s,o):(Kt(ln,ln.current&1),n=Pr(n,s,o),n!==null?n.sibling:null);Kt(ln,ln.current&1);break;case 19:if(u=(o&s.childLanes)!==0,(n.flags&128)!==0){if(u)return O0(n,s,o);s.flags|=128}if(p=s.memoizedState,p!==null&&(p.rendering=null,p.tail=null,p.lastEffect=null),Kt(ln,ln.current),u)break;return null;case 22:case 23:return s.lanes=0,P0(n,s,o)}return Pr(n,s,o)}var k0,Dh,z0,B0;k0=function(n,s){for(var o=s.child;o!==null;){if(o.tag===5||o.tag===6)n.appendChild(o.stateNode);else if(o.tag!==4&&o.child!==null){o.child.return=o,o=o.child;continue}if(o===s)break;for(;o.sibling===null;){if(o.return===null||o.return===s)return;o=o.return}o.sibling.return=o.return,o=o.sibling}},Dh=function(){},z0=function(n,s,o,u){var p=n.memoizedProps;if(p!==u){n=s.stateNode,Ks(ir.current);var _=null;switch(o){case"input":p=wt(n,p),u=wt(n,u),_=[];break;case"select":p=ce({},p,{value:void 0}),u=ce({},u,{value:void 0}),_=[];break;case"textarea":p=Ht(n,p),u=Ht(n,u),_=[];break;default:typeof p.onClick!="function"&&typeof u.onClick=="function"&&(n.onclick=wc)}qe(o,u);var R;o=null;for(pe in p)if(!u.hasOwnProperty(pe)&&p.hasOwnProperty(pe)&&p[pe]!=null)if(pe==="style"){var V=p[pe];for(R in V)V.hasOwnProperty(R)&&(o||(o={}),o[R]="")}else pe!=="dangerouslySetInnerHTML"&&pe!=="children"&&pe!=="suppressContentEditableWarning"&&pe!=="suppressHydrationWarning"&&pe!=="autoFocus"&&(a.hasOwnProperty(pe)?_||(_=[]):(_=_||[]).push(pe,null));for(pe in u){var q=u[pe];if(V=p!=null?p[pe]:void 0,u.hasOwnProperty(pe)&&q!==V&&(q!=null||V!=null))if(pe==="style")if(V){for(R in V)!V.hasOwnProperty(R)||q&&q.hasOwnProperty(R)||(o||(o={}),o[R]="");for(R in q)q.hasOwnProperty(R)&&V[R]!==q[R]&&(o||(o={}),o[R]=q[R])}else o||(_||(_=[]),_.push(pe,o)),o=q;else pe==="dangerouslySetInnerHTML"?(q=q?q.__html:void 0,V=V?V.__html:void 0,q!=null&&V!==q&&(_=_||[]).push(pe,q)):pe==="children"?typeof q!="string"&&typeof q!="number"||(_=_||[]).push(pe,""+q):pe!=="suppressContentEditableWarning"&&pe!=="suppressHydrationWarning"&&(a.hasOwnProperty(pe)?(q!=null&&pe==="onScroll"&&Jt("scroll",n),_||V===q||(_=[])):(_=_||[]).push(pe,q))}o&&(_=_||[]).push("style",o);var pe=_;(s.updateQueue=pe)&&(s.flags|=4)}},B0=function(n,s,o,u){o!==u&&(s.flags|=4)};function vl(n,s){if(!rn)switch(n.tailMode){case"hidden":s=n.tail;for(var o=null;s!==null;)s.alternate!==null&&(o=s),s=s.sibling;o===null?n.tail=null:o.sibling=null;break;case"collapsed":o=n.tail;for(var u=null;o!==null;)o.alternate!==null&&(u=o),o=o.sibling;u===null?s||n.tail===null?n.tail=null:n.tail.sibling=null:u.sibling=null}}function Bn(n){var s=n.alternate!==null&&n.alternate.child===n.child,o=0,u=0;if(s)for(var p=n.child;p!==null;)o|=p.lanes|p.childLanes,u|=p.subtreeFlags&14680064,u|=p.flags&14680064,p.return=n,p=p.sibling;else for(p=n.child;p!==null;)o|=p.lanes|p.childLanes,u|=p.subtreeFlags,u|=p.flags,p.return=n,p=p.sibling;return n.subtreeFlags|=u,n.childLanes=o,s}function qS(n,s,o){var u=s.pendingProps;switch(th(s),s.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return Bn(s),null;case 1:return ii(s.type)&&Tc(),Bn(s),null;case 3:return u=s.stateNode,Wa(),en(ni),en(kn),ph(),u.pendingContext&&(u.context=u.pendingContext,u.pendingContext=null),(n===null||n.child===null)&&(Nc(s)?s.flags|=4:n===null||n.memoizedState.isDehydrated&&(s.flags&256)===0||(s.flags|=1024,zi!==null&&(jh(zi),zi=null))),Dh(n,s),Bn(s),null;case 5:hh(s);var p=Ks(fl.current);if(o=s.type,n!==null&&s.stateNode!=null)z0(n,s,o,u,p),n.ref!==s.ref&&(s.flags|=512,s.flags|=2097152);else{if(!u){if(s.stateNode===null)throw Error(t(166));return Bn(s),null}if(n=Ks(ir.current),Nc(s)){u=s.stateNode,o=s.type;var _=s.memoizedProps;switch(u[nr]=s,u[ll]=_,n=(s.mode&1)!==0,o){case"dialog":Jt("cancel",u),Jt("close",u);break;case"iframe":case"object":case"embed":Jt("load",u);break;case"video":case"audio":for(p=0;p<sl.length;p++)Jt(sl[p],u);break;case"source":Jt("error",u);break;case"img":case"image":case"link":Jt("error",u),Jt("load",u);break;case"details":Jt("toggle",u);break;case"input":St(u,_),Jt("invalid",u);break;case"select":u._wrapperState={wasMultiple:!!_.multiple},Jt("invalid",u);break;case"textarea":Z(u,_),Jt("invalid",u)}qe(o,_),p=null;for(var R in _)if(_.hasOwnProperty(R)){var V=_[R];R==="children"?typeof V=="string"?u.textContent!==V&&(_.suppressHydrationWarning!==!0&&Ec(u.textContent,V,n),p=["children",V]):typeof V=="number"&&u.textContent!==""+V&&(_.suppressHydrationWarning!==!0&&Ec(u.textContent,V,n),p=["children",""+V]):a.hasOwnProperty(R)&&V!=null&&R==="onScroll"&&Jt("scroll",u)}switch(o){case"input":Qe(u),qt(u,_,!0);break;case"textarea":Qe(u),mt(u);break;case"select":case"option":break;default:typeof _.onClick=="function"&&(u.onclick=wc)}u=p,s.updateQueue=u,u!==null&&(s.flags|=4)}else{R=p.nodeType===9?p:p.ownerDocument,n==="http://www.w3.org/1999/xhtml"&&(n=k(o)),n==="http://www.w3.org/1999/xhtml"?o==="script"?(n=R.createElement("div"),n.innerHTML="<script><\/script>",n=n.removeChild(n.firstChild)):typeof u.is=="string"?n=R.createElement(o,{is:u.is}):(n=R.createElement(o),o==="select"&&(R=n,u.multiple?R.multiple=!0:u.size&&(R.size=u.size))):n=R.createElementNS(n,o),n[nr]=s,n[ll]=u,k0(n,s,!1,!1),s.stateNode=n;e:{switch(R=Ue(o,u),o){case"dialog":Jt("cancel",n),Jt("close",n),p=u;break;case"iframe":case"object":case"embed":Jt("load",n),p=u;break;case"video":case"audio":for(p=0;p<sl.length;p++)Jt(sl[p],n);p=u;break;case"source":Jt("error",n),p=u;break;case"img":case"image":case"link":Jt("error",n),Jt("load",n),p=u;break;case"details":Jt("toggle",n),p=u;break;case"input":St(n,u),p=wt(n,u),Jt("invalid",n);break;case"option":p=u;break;case"select":n._wrapperState={wasMultiple:!!u.multiple},p=ce({},u,{value:void 0}),Jt("invalid",n);break;case"textarea":Z(n,u),p=Ht(n,u),Jt("invalid",n);break;default:p=u}qe(o,p),V=p;for(_ in V)if(V.hasOwnProperty(_)){var q=V[_];_==="style"?ve(n,q):_==="dangerouslySetInnerHTML"?(q=q?q.__html:void 0,q!=null&&oe(n,q)):_==="children"?typeof q=="string"?(o!=="textarea"||q!=="")&&z(n,q):typeof q=="number"&&z(n,""+q):_!=="suppressContentEditableWarning"&&_!=="suppressHydrationWarning"&&_!=="autoFocus"&&(a.hasOwnProperty(_)?q!=null&&_==="onScroll"&&Jt("scroll",n):q!=null&&L(n,_,q,R))}switch(o){case"input":Qe(n),qt(n,u,!1);break;case"textarea":Qe(n),mt(n);break;case"option":u.value!=null&&n.setAttribute("value",""+xe(u.value));break;case"select":n.multiple=!!u.multiple,_=u.value,_!=null?Nt(n,!!u.multiple,_,!1):u.defaultValue!=null&&Nt(n,!!u.multiple,u.defaultValue,!0);break;default:typeof p.onClick=="function"&&(n.onclick=wc)}switch(o){case"button":case"input":case"select":case"textarea":u=!!u.autoFocus;break e;case"img":u=!0;break e;default:u=!1}}u&&(s.flags|=4)}s.ref!==null&&(s.flags|=512,s.flags|=2097152)}return Bn(s),null;case 6:if(n&&s.stateNode!=null)B0(n,s,n.memoizedProps,u);else{if(typeof u!="string"&&s.stateNode===null)throw Error(t(166));if(o=Ks(fl.current),Ks(ir.current),Nc(s)){if(u=s.stateNode,o=s.memoizedProps,u[nr]=s,(_=u.nodeValue!==o)&&(n=pi,n!==null))switch(n.tag){case 3:Ec(u.nodeValue,o,(n.mode&1)!==0);break;case 5:n.memoizedProps.suppressHydrationWarning!==!0&&Ec(u.nodeValue,o,(n.mode&1)!==0)}_&&(s.flags|=4)}else u=(o.nodeType===9?o:o.ownerDocument).createTextNode(u),u[nr]=s,s.stateNode=u}return Bn(s),null;case 13:if(en(ln),u=s.memoizedState,n===null||n.memoizedState!==null&&n.memoizedState.dehydrated!==null){if(rn&&mi!==null&&(s.mode&1)!==0&&(s.flags&128)===0)Gg(),Ha(),s.flags|=98560,_=!1;else if(_=Nc(s),u!==null&&u.dehydrated!==null){if(n===null){if(!_)throw Error(t(318));if(_=s.memoizedState,_=_!==null?_.dehydrated:null,!_)throw Error(t(317));_[nr]=s}else Ha(),(s.flags&128)===0&&(s.memoizedState=null),s.flags|=4;Bn(s),_=!1}else zi!==null&&(jh(zi),zi=null),_=!0;if(!_)return s.flags&65536?s:null}return(s.flags&128)!==0?(s.lanes=o,s):(u=u!==null,u!==(n!==null&&n.memoizedState!==null)&&u&&(s.child.flags|=8192,(s.mode&1)!==0&&(n===null||(ln.current&1)!==0?yn===0&&(yn=3):$h())),s.updateQueue!==null&&(s.flags|=4),Bn(s),null);case 4:return Wa(),Dh(n,s),n===null&&al(s.stateNode.containerInfo),Bn(s),null;case 10:return oh(s.type._context),Bn(s),null;case 17:return ii(s.type)&&Tc(),Bn(s),null;case 19:if(en(ln),_=s.memoizedState,_===null)return Bn(s),null;if(u=(s.flags&128)!==0,R=_.rendering,R===null)if(u)vl(_,!1);else{if(yn!==0||n!==null&&(n.flags&128)!==0)for(n=s.child;n!==null;){if(R=Oc(n),R!==null){for(s.flags|=128,vl(_,!1),u=R.updateQueue,u!==null&&(s.updateQueue=u,s.flags|=4),s.subtreeFlags=0,u=o,o=s.child;o!==null;)_=o,n=u,_.flags&=14680066,R=_.alternate,R===null?(_.childLanes=0,_.lanes=n,_.child=null,_.subtreeFlags=0,_.memoizedProps=null,_.memoizedState=null,_.updateQueue=null,_.dependencies=null,_.stateNode=null):(_.childLanes=R.childLanes,_.lanes=R.lanes,_.child=R.child,_.subtreeFlags=0,_.deletions=null,_.memoizedProps=R.memoizedProps,_.memoizedState=R.memoizedState,_.updateQueue=R.updateQueue,_.type=R.type,n=R.dependencies,_.dependencies=n===null?null:{lanes:n.lanes,firstContext:n.firstContext}),o=o.sibling;return Kt(ln,ln.current&1|2),s.child}n=n.sibling}_.tail!==null&&on()>Ya&&(s.flags|=128,u=!0,vl(_,!1),s.lanes=4194304)}else{if(!u)if(n=Oc(R),n!==null){if(s.flags|=128,u=!0,o=n.updateQueue,o!==null&&(s.updateQueue=o,s.flags|=4),vl(_,!0),_.tail===null&&_.tailMode==="hidden"&&!R.alternate&&!rn)return Bn(s),null}else 2*on()-_.renderingStartTime>Ya&&o!==1073741824&&(s.flags|=128,u=!0,vl(_,!1),s.lanes=4194304);_.isBackwards?(R.sibling=s.child,s.child=R):(o=_.last,o!==null?o.sibling=R:s.child=R,_.last=R)}return _.tail!==null?(s=_.tail,_.rendering=s,_.tail=s.sibling,_.renderingStartTime=on(),s.sibling=null,o=ln.current,Kt(ln,u?o&1|2:o&1),s):(Bn(s),null);case 22:case 23:return Xh(),u=s.memoizedState!==null,n!==null&&n.memoizedState!==null!==u&&(s.flags|=8192),u&&(s.mode&1)!==0?(gi&1073741824)!==0&&(Bn(s),s.subtreeFlags&6&&(s.flags|=8192)):Bn(s),null;case 24:return null;case 25:return null}throw Error(t(156,s.tag))}function YS(n,s){switch(th(s),s.tag){case 1:return ii(s.type)&&Tc(),n=s.flags,n&65536?(s.flags=n&-65537|128,s):null;case 3:return Wa(),en(ni),en(kn),ph(),n=s.flags,(n&65536)!==0&&(n&128)===0?(s.flags=n&-65537|128,s):null;case 5:return hh(s),null;case 13:if(en(ln),n=s.memoizedState,n!==null&&n.dehydrated!==null){if(s.alternate===null)throw Error(t(340));Ha()}return n=s.flags,n&65536?(s.flags=n&-65537|128,s):null;case 19:return en(ln),null;case 4:return Wa(),null;case 10:return oh(s.type._context),null;case 22:case 23:return Xh(),null;case 24:return null;default:return null}}var Xc=!1,Hn=!1,KS=typeof WeakSet=="function"?WeakSet:Set,$e=null;function $a(n,s){var o=n.ref;if(o!==null)if(typeof o=="function")try{o(null)}catch(u){dn(n,s,u)}else o.current=null}function Ih(n,s,o){try{o()}catch(u){dn(n,s,u)}}var H0=!1;function QS(n,s){if(Xd=hc,n=_g(),kd(n)){if("selectionStart"in n)var o={start:n.selectionStart,end:n.selectionEnd};else e:{o=(o=n.ownerDocument)&&o.defaultView||window;var u=o.getSelection&&o.getSelection();if(u&&u.rangeCount!==0){o=u.anchorNode;var p=u.anchorOffset,_=u.focusNode;u=u.focusOffset;try{o.nodeType,_.nodeType}catch{o=null;break e}var R=0,V=-1,q=-1,pe=0,we=0,Ce=n,Ee=null;t:for(;;){for(var Ge;Ce!==o||p!==0&&Ce.nodeType!==3||(V=R+p),Ce!==_||u!==0&&Ce.nodeType!==3||(q=R+u),Ce.nodeType===3&&(R+=Ce.nodeValue.length),(Ge=Ce.firstChild)!==null;)Ee=Ce,Ce=Ge;for(;;){if(Ce===n)break t;if(Ee===o&&++pe===p&&(V=R),Ee===_&&++we===u&&(q=R),(Ge=Ce.nextSibling)!==null)break;Ce=Ee,Ee=Ce.parentNode}Ce=Ge}o=V===-1||q===-1?null:{start:V,end:q}}else o=null}o=o||{start:0,end:0}}else o=null;for($d={focusedElem:n,selectionRange:o},hc=!1,$e=s;$e!==null;)if(s=$e,n=s.child,(s.subtreeFlags&1028)!==0&&n!==null)n.return=s,$e=n;else for(;$e!==null;){s=$e;try{var Ke=s.alternate;if((s.flags&1024)!==0)switch(s.tag){case 0:case 11:case 15:break;case 1:if(Ke!==null){var Je=Ke.memoizedProps,mn=Ke.memoizedState,re=s.stateNode,Q=re.getSnapshotBeforeUpdate(s.elementType===s.type?Je:Bi(s.type,Je),mn);re.__reactInternalSnapshotBeforeUpdate=Q}break;case 3:var ue=s.stateNode.containerInfo;ue.nodeType===1?ue.textContent="":ue.nodeType===9&&ue.documentElement&&ue.removeChild(ue.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(t(163))}}catch(Ae){dn(s,s.return,Ae)}if(n=s.sibling,n!==null){n.return=s.return,$e=n;break}$e=s.return}return Ke=H0,H0=!1,Ke}function _l(n,s,o){var u=s.updateQueue;if(u=u!==null?u.lastEffect:null,u!==null){var p=u=u.next;do{if((p.tag&n)===n){var _=p.destroy;p.destroy=void 0,_!==void 0&&Ih(s,o,_)}p=p.next}while(p!==u)}}function $c(n,s){if(s=s.updateQueue,s=s!==null?s.lastEffect:null,s!==null){var o=s=s.next;do{if((o.tag&n)===n){var u=o.create;o.destroy=u()}o=o.next}while(o!==s)}}function Uh(n){var s=n.ref;if(s!==null){var o=n.stateNode;switch(n.tag){case 5:n=o;break;default:n=o}typeof s=="function"?s(n):s.current=n}}function V0(n){var s=n.alternate;s!==null&&(n.alternate=null,V0(s)),n.child=null,n.deletions=null,n.sibling=null,n.tag===5&&(s=n.stateNode,s!==null&&(delete s[nr],delete s[ll],delete s[Qd],delete s[DS],delete s[IS])),n.stateNode=null,n.return=null,n.dependencies=null,n.memoizedProps=null,n.memoizedState=null,n.pendingProps=null,n.stateNode=null,n.updateQueue=null}function G0(n){return n.tag===5||n.tag===3||n.tag===4}function j0(n){e:for(;;){for(;n.sibling===null;){if(n.return===null||G0(n.return))return null;n=n.return}for(n.sibling.return=n.return,n=n.sibling;n.tag!==5&&n.tag!==6&&n.tag!==18;){if(n.flags&2||n.child===null||n.tag===4)continue e;n.child.return=n,n=n.child}if(!(n.flags&2))return n.stateNode}}function Fh(n,s,o){var u=n.tag;if(u===5||u===6)n=n.stateNode,s?o.nodeType===8?o.parentNode.insertBefore(n,s):o.insertBefore(n,s):(o.nodeType===8?(s=o.parentNode,s.insertBefore(n,o)):(s=o,s.appendChild(n)),o=o._reactRootContainer,o!=null||s.onclick!==null||(s.onclick=wc));else if(u!==4&&(n=n.child,n!==null))for(Fh(n,s,o),n=n.sibling;n!==null;)Fh(n,s,o),n=n.sibling}function Oh(n,s,o){var u=n.tag;if(u===5||u===6)n=n.stateNode,s?o.insertBefore(n,s):o.appendChild(n);else if(u!==4&&(n=n.child,n!==null))for(Oh(n,s,o),n=n.sibling;n!==null;)Oh(n,s,o),n=n.sibling}var Dn=null,Hi=!1;function cs(n,s,o){for(o=o.child;o!==null;)W0(n,s,o),o=o.sibling}function W0(n,s,o){if(De&&typeof De.onCommitFiberUnmount=="function")try{De.onCommitFiberUnmount(ae,o)}catch{}switch(o.tag){case 5:Hn||$a(o,s);case 6:var u=Dn,p=Hi;Dn=null,cs(n,s,o),Dn=u,Hi=p,Dn!==null&&(Hi?(n=Dn,o=o.stateNode,n.nodeType===8?n.parentNode.removeChild(o):n.removeChild(o)):Dn.removeChild(o.stateNode));break;case 18:Dn!==null&&(Hi?(n=Dn,o=o.stateNode,n.nodeType===8?Kd(n.parentNode,o):n.nodeType===1&&Kd(n,o),Qo(n)):Kd(Dn,o.stateNode));break;case 4:u=Dn,p=Hi,Dn=o.stateNode.containerInfo,Hi=!0,cs(n,s,o),Dn=u,Hi=p;break;case 0:case 11:case 14:case 15:if(!Hn&&(u=o.updateQueue,u!==null&&(u=u.lastEffect,u!==null))){p=u=u.next;do{var _=p,R=_.destroy;_=_.tag,R!==void 0&&((_&2)!==0||(_&4)!==0)&&Ih(o,s,R),p=p.next}while(p!==u)}cs(n,s,o);break;case 1:if(!Hn&&($a(o,s),u=o.stateNode,typeof u.componentWillUnmount=="function"))try{u.props=o.memoizedProps,u.state=o.memoizedState,u.componentWillUnmount()}catch(V){dn(o,s,V)}cs(n,s,o);break;case 21:cs(n,s,o);break;case 22:o.mode&1?(Hn=(u=Hn)||o.memoizedState!==null,cs(n,s,o),Hn=u):cs(n,s,o);break;default:cs(n,s,o)}}function X0(n){var s=n.updateQueue;if(s!==null){n.updateQueue=null;var o=n.stateNode;o===null&&(o=n.stateNode=new KS),s.forEach(function(u){var p=aM.bind(null,n,u);o.has(u)||(o.add(u),u.then(p,p))})}}function Vi(n,s){var o=s.deletions;if(o!==null)for(var u=0;u<o.length;u++){var p=o[u];try{var _=n,R=s,V=R;e:for(;V!==null;){switch(V.tag){case 5:Dn=V.stateNode,Hi=!1;break e;case 3:Dn=V.stateNode.containerInfo,Hi=!0;break e;case 4:Dn=V.stateNode.containerInfo,Hi=!0;break e}V=V.return}if(Dn===null)throw Error(t(160));W0(_,R,p),Dn=null,Hi=!1;var q=p.alternate;q!==null&&(q.return=null),p.return=null}catch(pe){dn(p,s,pe)}}if(s.subtreeFlags&12854)for(s=s.child;s!==null;)$0(s,n),s=s.sibling}function $0(n,s){var o=n.alternate,u=n.flags;switch(n.tag){case 0:case 11:case 14:case 15:if(Vi(s,n),sr(n),u&4){try{_l(3,n,n.return),$c(3,n)}catch(Je){dn(n,n.return,Je)}try{_l(5,n,n.return)}catch(Je){dn(n,n.return,Je)}}break;case 1:Vi(s,n),sr(n),u&512&&o!==null&&$a(o,o.return);break;case 5:if(Vi(s,n),sr(n),u&512&&o!==null&&$a(o,o.return),n.flags&32){var p=n.stateNode;try{z(p,"")}catch(Je){dn(n,n.return,Je)}}if(u&4&&(p=n.stateNode,p!=null)){var _=n.memoizedProps,R=o!==null?o.memoizedProps:_,V=n.type,q=n.updateQueue;if(n.updateQueue=null,q!==null)try{V==="input"&&_.type==="radio"&&_.name!=null&&vt(p,_),Ue(V,R);var pe=Ue(V,_);for(R=0;R<q.length;R+=2){var we=q[R],Ce=q[R+1];we==="style"?ve(p,Ce):we==="dangerouslySetInnerHTML"?oe(p,Ce):we==="children"?z(p,Ce):L(p,we,Ce,pe)}switch(V){case"input":Ut(p,_);break;case"textarea":pn(p,_);break;case"select":var Ee=p._wrapperState.wasMultiple;p._wrapperState.wasMultiple=!!_.multiple;var Ge=_.value;Ge!=null?Nt(p,!!_.multiple,Ge,!1):Ee!==!!_.multiple&&(_.defaultValue!=null?Nt(p,!!_.multiple,_.defaultValue,!0):Nt(p,!!_.multiple,_.multiple?[]:"",!1))}p[ll]=_}catch(Je){dn(n,n.return,Je)}}break;case 6:if(Vi(s,n),sr(n),u&4){if(n.stateNode===null)throw Error(t(162));p=n.stateNode,_=n.memoizedProps;try{p.nodeValue=_}catch(Je){dn(n,n.return,Je)}}break;case 3:if(Vi(s,n),sr(n),u&4&&o!==null&&o.memoizedState.isDehydrated)try{Qo(s.containerInfo)}catch(Je){dn(n,n.return,Je)}break;case 4:Vi(s,n),sr(n);break;case 13:Vi(s,n),sr(n),p=n.child,p.flags&8192&&(_=p.memoizedState!==null,p.stateNode.isHidden=_,!_||p.alternate!==null&&p.alternate.memoizedState!==null||(Bh=on())),u&4&&X0(n);break;case 22:if(we=o!==null&&o.memoizedState!==null,n.mode&1?(Hn=(pe=Hn)||we,Vi(s,n),Hn=pe):Vi(s,n),sr(n),u&8192){if(pe=n.memoizedState!==null,(n.stateNode.isHidden=pe)&&!we&&(n.mode&1)!==0)for($e=n,we=n.child;we!==null;){for(Ce=$e=we;$e!==null;){switch(Ee=$e,Ge=Ee.child,Ee.tag){case 0:case 11:case 14:case 15:_l(4,Ee,Ee.return);break;case 1:$a(Ee,Ee.return);var Ke=Ee.stateNode;if(typeof Ke.componentWillUnmount=="function"){u=Ee,o=Ee.return;try{s=u,Ke.props=s.memoizedProps,Ke.state=s.memoizedState,Ke.componentWillUnmount()}catch(Je){dn(u,o,Je)}}break;case 5:$a(Ee,Ee.return);break;case 22:if(Ee.memoizedState!==null){K0(Ce);continue}}Ge!==null?(Ge.return=Ee,$e=Ge):K0(Ce)}we=we.sibling}e:for(we=null,Ce=n;;){if(Ce.tag===5){if(we===null){we=Ce;try{p=Ce.stateNode,pe?(_=p.style,typeof _.setProperty=="function"?_.setProperty("display","none","important"):_.display="none"):(V=Ce.stateNode,q=Ce.memoizedProps.style,R=q!=null&&q.hasOwnProperty("display")?q.display:null,V.style.display=ge("display",R))}catch(Je){dn(n,n.return,Je)}}}else if(Ce.tag===6){if(we===null)try{Ce.stateNode.nodeValue=pe?"":Ce.memoizedProps}catch(Je){dn(n,n.return,Je)}}else if((Ce.tag!==22&&Ce.tag!==23||Ce.memoizedState===null||Ce===n)&&Ce.child!==null){Ce.child.return=Ce,Ce=Ce.child;continue}if(Ce===n)break e;for(;Ce.sibling===null;){if(Ce.return===null||Ce.return===n)break e;we===Ce&&(we=null),Ce=Ce.return}we===Ce&&(we=null),Ce.sibling.return=Ce.return,Ce=Ce.sibling}}break;case 19:Vi(s,n),sr(n),u&4&&X0(n);break;case 21:break;default:Vi(s,n),sr(n)}}function sr(n){var s=n.flags;if(s&2){try{e:{for(var o=n.return;o!==null;){if(G0(o)){var u=o;break e}o=o.return}throw Error(t(160))}switch(u.tag){case 5:var p=u.stateNode;u.flags&32&&(z(p,""),u.flags&=-33);var _=j0(n);Oh(n,_,p);break;case 3:case 4:var R=u.stateNode.containerInfo,V=j0(n);Fh(n,V,R);break;default:throw Error(t(161))}}catch(q){dn(n,n.return,q)}n.flags&=-3}s&4096&&(n.flags&=-4097)}function ZS(n,s,o){$e=n,q0(n)}function q0(n,s,o){for(var u=(n.mode&1)!==0;$e!==null;){var p=$e,_=p.child;if(p.tag===22&&u){var R=p.memoizedState!==null||Xc;if(!R){var V=p.alternate,q=V!==null&&V.memoizedState!==null||Hn;V=Xc;var pe=Hn;if(Xc=R,(Hn=q)&&!pe)for($e=p;$e!==null;)R=$e,q=R.child,R.tag===22&&R.memoizedState!==null?Q0(p):q!==null?(q.return=R,$e=q):Q0(p);for(;_!==null;)$e=_,q0(_),_=_.sibling;$e=p,Xc=V,Hn=pe}Y0(n)}else(p.subtreeFlags&8772)!==0&&_!==null?(_.return=p,$e=_):Y0(n)}}function Y0(n){for(;$e!==null;){var s=$e;if((s.flags&8772)!==0){var o=s.alternate;try{if((s.flags&8772)!==0)switch(s.tag){case 0:case 11:case 15:Hn||$c(5,s);break;case 1:var u=s.stateNode;if(s.flags&4&&!Hn)if(o===null)u.componentDidMount();else{var p=s.elementType===s.type?o.memoizedProps:Bi(s.type,o.memoizedProps);u.componentDidUpdate(p,o.memoizedState,u.__reactInternalSnapshotBeforeUpdate)}var _=s.updateQueue;_!==null&&Kg(s,_,u);break;case 3:var R=s.updateQueue;if(R!==null){if(o=null,s.child!==null)switch(s.child.tag){case 5:o=s.child.stateNode;break;case 1:o=s.child.stateNode}Kg(s,R,o)}break;case 5:var V=s.stateNode;if(o===null&&s.flags&4){o=V;var q=s.memoizedProps;switch(s.type){case"button":case"input":case"select":case"textarea":q.autoFocus&&o.focus();break;case"img":q.src&&(o.src=q.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(s.memoizedState===null){var pe=s.alternate;if(pe!==null){var we=pe.memoizedState;if(we!==null){var Ce=we.dehydrated;Ce!==null&&Qo(Ce)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(t(163))}Hn||s.flags&512&&Uh(s)}catch(Ee){dn(s,s.return,Ee)}}if(s===n){$e=null;break}if(o=s.sibling,o!==null){o.return=s.return,$e=o;break}$e=s.return}}function K0(n){for(;$e!==null;){var s=$e;if(s===n){$e=null;break}var o=s.sibling;if(o!==null){o.return=s.return,$e=o;break}$e=s.return}}function Q0(n){for(;$e!==null;){var s=$e;try{switch(s.tag){case 0:case 11:case 15:var o=s.return;try{$c(4,s)}catch(q){dn(s,o,q)}break;case 1:var u=s.stateNode;if(typeof u.componentDidMount=="function"){var p=s.return;try{u.componentDidMount()}catch(q){dn(s,p,q)}}var _=s.return;try{Uh(s)}catch(q){dn(s,_,q)}break;case 5:var R=s.return;try{Uh(s)}catch(q){dn(s,R,q)}}}catch(q){dn(s,s.return,q)}if(s===n){$e=null;break}var V=s.sibling;if(V!==null){V.return=s.return,$e=V;break}$e=s.return}}var JS=Math.ceil,qc=C.ReactCurrentDispatcher,kh=C.ReactCurrentOwner,Ai=C.ReactCurrentBatchConfig,Lt=0,Cn=null,xn=null,In=0,gi=0,qa=rs(0),yn=0,yl=null,Zs=0,Yc=0,zh=0,Sl=null,si=null,Bh=0,Ya=1/0,Nr=null,Kc=!1,Hh=null,us=null,Qc=!1,ds=null,Zc=0,Ml=0,Vh=null,Jc=-1,eu=0;function Yn(){return(Lt&6)!==0?on():Jc!==-1?Jc:Jc=on()}function hs(n){return(n.mode&1)===0?1:(Lt&2)!==0&&In!==0?In&-In:FS.transition!==null?(eu===0&&(eu=Ve()),eu):(n=Mt,n!==0||(n=window.event,n=n===void 0?16:Jm(n.type)),n)}function Gi(n,s,o,u){if(50<Ml)throw Ml=0,Vh=null,Error(t(185));yt(n,o,u),((Lt&2)===0||n!==Cn)&&(n===Cn&&((Lt&2)===0&&(Yc|=o),yn===4&&fs(n,In)),ai(n,u),o===1&&Lt===0&&(s.mode&1)===0&&(Ya=on()+500,Rc&&as()))}function ai(n,s){var o=n.callbackNode;Vt(n,s);var u=Yt(n,n===Cn?In:0);if(u===0)o!==null&&Wo(o),n.callbackNode=null,n.callbackPriority=0;else if(s=u&-u,n.callbackPriority!==s){if(o!=null&&Wo(o),s===1)n.tag===0?US(J0.bind(null,n)):kg(J0.bind(null,n)),NS(function(){(Lt&6)===0&&as()}),o=null;else{switch(Er(u)){case 1:o=Xo;break;case 4:o=A;break;case 16:o=J;break;case 536870912:o=le;break;default:o=J}o=ox(o,Z0.bind(null,n))}n.callbackPriority=s,n.callbackNode=o}}function Z0(n,s){if(Jc=-1,eu=0,(Lt&6)!==0)throw Error(t(327));var o=n.callbackNode;if(Ka()&&n.callbackNode!==o)return null;var u=Yt(n,n===Cn?In:0);if(u===0)return null;if((u&30)!==0||(u&n.expiredLanes)!==0||s)s=tu(n,u);else{s=u;var p=Lt;Lt|=2;var _=tx();(Cn!==n||In!==s)&&(Nr=null,Ya=on()+500,ea(n,s));do try{nM();break}catch(V){ex(n,V)}while(!0);ah(),qc.current=_,Lt=p,xn!==null?s=0:(Cn=null,In=0,s=yn)}if(s!==0){if(s===2&&(p=gn(n),p!==0&&(u=p,s=Gh(n,p))),s===1)throw o=yl,ea(n,0),fs(n,u),ai(n,on()),o;if(s===6)fs(n,u);else{if(p=n.current.alternate,(u&30)===0&&!eM(p)&&(s=tu(n,u),s===2&&(_=gn(n),_!==0&&(u=_,s=Gh(n,_))),s===1))throw o=yl,ea(n,0),fs(n,u),ai(n,on()),o;switch(n.finishedWork=p,n.finishedLanes=u,s){case 0:case 1:throw Error(t(345));case 2:ta(n,si,Nr);break;case 3:if(fs(n,u),(u&130023424)===u&&(s=Bh+500-on(),10<s)){if(Yt(n,0)!==0)break;if(p=n.suspendedLanes,(p&u)!==u){Yn(),n.pingedLanes|=n.suspendedLanes&p;break}n.timeoutHandle=Yd(ta.bind(null,n,si,Nr),s);break}ta(n,si,Nr);break;case 4:if(fs(n,u),(u&4194240)===u)break;for(s=n.eventTimes,p=-1;0<u;){var R=31-Ne(u);_=1<<R,R=s[R],R>p&&(p=R),u&=~_}if(u=p,u=on()-u,u=(120>u?120:480>u?480:1080>u?1080:1920>u?1920:3e3>u?3e3:4320>u?4320:1960*JS(u/1960))-u,10<u){n.timeoutHandle=Yd(ta.bind(null,n,si,Nr),u);break}ta(n,si,Nr);break;case 5:ta(n,si,Nr);break;default:throw Error(t(329))}}}return ai(n,on()),n.callbackNode===o?Z0.bind(null,n):null}function Gh(n,s){var o=Sl;return n.current.memoizedState.isDehydrated&&(ea(n,s).flags|=256),n=tu(n,s),n!==2&&(s=si,si=o,s!==null&&jh(s)),n}function jh(n){si===null?si=n:si.push.apply(si,n)}function eM(n){for(var s=n;;){if(s.flags&16384){var o=s.updateQueue;if(o!==null&&(o=o.stores,o!==null))for(var u=0;u<o.length;u++){var p=o[u],_=p.getSnapshot;p=p.value;try{if(!ki(_(),p))return!1}catch{return!1}}}if(o=s.child,s.subtreeFlags&16384&&o!==null)o.return=s,s=o;else{if(s===n)break;for(;s.sibling===null;){if(s.return===null||s.return===n)return!0;s=s.return}s.sibling.return=s.return,s=s.sibling}}return!0}function fs(n,s){for(s&=~zh,s&=~Yc,n.suspendedLanes|=s,n.pingedLanes&=~s,n=n.expirationTimes;0<s;){var o=31-Ne(s),u=1<<o;n[o]=-1,s&=~u}}function J0(n){if((Lt&6)!==0)throw Error(t(327));Ka();var s=Yt(n,0);if((s&1)===0)return ai(n,on()),null;var o=tu(n,s);if(n.tag!==0&&o===2){var u=gn(n);u!==0&&(s=u,o=Gh(n,u))}if(o===1)throw o=yl,ea(n,0),fs(n,s),ai(n,on()),o;if(o===6)throw Error(t(345));return n.finishedWork=n.current.alternate,n.finishedLanes=s,ta(n,si,Nr),ai(n,on()),null}function Wh(n,s){var o=Lt;Lt|=1;try{return n(s)}finally{Lt=o,Lt===0&&(Ya=on()+500,Rc&&as())}}function Js(n){ds!==null&&ds.tag===0&&(Lt&6)===0&&Ka();var s=Lt;Lt|=1;var o=Ai.transition,u=Mt;try{if(Ai.transition=null,Mt=1,n)return n()}finally{Mt=u,Ai.transition=o,Lt=s,(Lt&6)===0&&as()}}function Xh(){gi=qa.current,en(qa)}function ea(n,s){n.finishedWork=null,n.finishedLanes=0;var o=n.timeoutHandle;if(o!==-1&&(n.timeoutHandle=-1,PS(o)),xn!==null)for(o=xn.return;o!==null;){var u=o;switch(th(u),u.tag){case 1:u=u.type.childContextTypes,u!=null&&Tc();break;case 3:Wa(),en(ni),en(kn),ph();break;case 5:hh(u);break;case 4:Wa();break;case 13:en(ln);break;case 19:en(ln);break;case 10:oh(u.type._context);break;case 22:case 23:Xh()}o=o.return}if(Cn=n,xn=n=ps(n.current,null),In=gi=s,yn=0,yl=null,zh=Yc=Zs=0,si=Sl=null,Ys!==null){for(s=0;s<Ys.length;s++)if(o=Ys[s],u=o.interleaved,u!==null){o.interleaved=null;var p=u.next,_=o.pending;if(_!==null){var R=_.next;_.next=p,u.next=R}o.pending=u}Ys=null}return n}function ex(n,s){do{var o=xn;try{if(ah(),kc.current=Vc,zc){for(var u=cn.memoizedState;u!==null;){var p=u.queue;p!==null&&(p.pending=null),u=u.next}zc=!1}if(Qs=0,Tn=_n=cn=null,pl=!1,ml=0,kh.current=null,o===null||o.return===null){yn=1,yl=s,xn=null;break}e:{var _=n,R=o.return,V=o,q=s;if(s=In,V.flags|=32768,q!==null&&typeof q=="object"&&typeof q.then=="function"){var pe=q,we=V,Ce=we.tag;if((we.mode&1)===0&&(Ce===0||Ce===11||Ce===15)){var Ee=we.alternate;Ee?(we.updateQueue=Ee.updateQueue,we.memoizedState=Ee.memoizedState,we.lanes=Ee.lanes):(we.updateQueue=null,we.memoizedState=null)}var Ge=b0(R);if(Ge!==null){Ge.flags&=-257,T0(Ge,R,V,_,s),Ge.mode&1&&w0(_,pe,s),s=Ge,q=pe;var Ke=s.updateQueue;if(Ke===null){var Je=new Set;Je.add(q),s.updateQueue=Je}else Ke.add(q);break e}else{if((s&1)===0){w0(_,pe,s),$h();break e}q=Error(t(426))}}else if(rn&&V.mode&1){var mn=b0(R);if(mn!==null){(mn.flags&65536)===0&&(mn.flags|=256),T0(mn,R,V,_,s),rh(Xa(q,V));break e}}_=q=Xa(q,V),yn!==4&&(yn=2),Sl===null?Sl=[_]:Sl.push(_),_=R;do{switch(_.tag){case 3:_.flags|=65536,s&=-s,_.lanes|=s;var re=M0(_,q,s);Yg(_,re);break e;case 1:V=q;var Q=_.type,ue=_.stateNode;if((_.flags&128)===0&&(typeof Q.getDerivedStateFromError=="function"||ue!==null&&typeof ue.componentDidCatch=="function"&&(us===null||!us.has(ue)))){_.flags|=65536,s&=-s,_.lanes|=s;var Ae=E0(_,V,s);Yg(_,Ae);break e}}_=_.return}while(_!==null)}ix(o)}catch(nt){s=nt,xn===o&&o!==null&&(xn=o=o.return);continue}break}while(!0)}function tx(){var n=qc.current;return qc.current=Vc,n===null?Vc:n}function $h(){(yn===0||yn===3||yn===2)&&(yn=4),Cn===null||(Zs&268435455)===0&&(Yc&268435455)===0||fs(Cn,In)}function tu(n,s){var o=Lt;Lt|=2;var u=tx();(Cn!==n||In!==s)&&(Nr=null,ea(n,s));do try{tM();break}catch(p){ex(n,p)}while(!0);if(ah(),Lt=o,qc.current=u,xn!==null)throw Error(t(261));return Cn=null,In=0,yn}function tM(){for(;xn!==null;)nx(xn)}function nM(){for(;xn!==null&&!uc();)nx(xn)}function nx(n){var s=ax(n.alternate,n,gi);n.memoizedProps=n.pendingProps,s===null?ix(n):xn=s,kh.current=null}function ix(n){var s=n;do{var o=s.alternate;if(n=s.return,(s.flags&32768)===0){if(o=qS(o,s,gi),o!==null){xn=o;return}}else{if(o=YS(o,s),o!==null){o.flags&=32767,xn=o;return}if(n!==null)n.flags|=32768,n.subtreeFlags=0,n.deletions=null;else{yn=6,xn=null;return}}if(s=s.sibling,s!==null){xn=s;return}xn=s=n}while(s!==null);yn===0&&(yn=5)}function ta(n,s,o){var u=Mt,p=Ai.transition;try{Ai.transition=null,Mt=1,iM(n,s,o,u)}finally{Ai.transition=p,Mt=u}return null}function iM(n,s,o,u){do Ka();while(ds!==null);if((Lt&6)!==0)throw Error(t(327));o=n.finishedWork;var p=n.finishedLanes;if(o===null)return null;if(n.finishedWork=null,n.finishedLanes=0,o===n.current)throw Error(t(177));n.callbackNode=null,n.callbackPriority=0;var _=o.lanes|o.childLanes;if(ei(n,_),n===Cn&&(xn=Cn=null,In=0),(o.subtreeFlags&2064)===0&&(o.flags&2064)===0||Qc||(Qc=!0,ox(J,function(){return Ka(),null})),_=(o.flags&15990)!==0,(o.subtreeFlags&15990)!==0||_){_=Ai.transition,Ai.transition=null;var R=Mt;Mt=1;var V=Lt;Lt|=4,kh.current=null,QS(n,o),$0(o,n),ES($d),hc=!!Xd,$d=Xd=null,n.current=o,ZS(o),bd(),Lt=V,Mt=R,Ai.transition=_}else n.current=o;if(Qc&&(Qc=!1,ds=n,Zc=p),_=n.pendingLanes,_===0&&(us=null),je(o.stateNode),ai(n,on()),s!==null)for(u=n.onRecoverableError,o=0;o<s.length;o++)p=s[o],u(p.value,{componentStack:p.stack,digest:p.digest});if(Kc)throw Kc=!1,n=Hh,Hh=null,n;return(Zc&1)!==0&&n.tag!==0&&Ka(),_=n.pendingLanes,(_&1)!==0?n===Vh?Ml++:(Ml=0,Vh=n):Ml=0,as(),null}function Ka(){if(ds!==null){var n=Er(Zc),s=Ai.transition,o=Mt;try{if(Ai.transition=null,Mt=16>n?16:n,ds===null)var u=!1;else{if(n=ds,ds=null,Zc=0,(Lt&6)!==0)throw Error(t(331));var p=Lt;for(Lt|=4,$e=n.current;$e!==null;){var _=$e,R=_.child;if(($e.flags&16)!==0){var V=_.deletions;if(V!==null){for(var q=0;q<V.length;q++){var pe=V[q];for($e=pe;$e!==null;){var we=$e;switch(we.tag){case 0:case 11:case 15:_l(8,we,_)}var Ce=we.child;if(Ce!==null)Ce.return=we,$e=Ce;else for(;$e!==null;){we=$e;var Ee=we.sibling,Ge=we.return;if(V0(we),we===pe){$e=null;break}if(Ee!==null){Ee.return=Ge,$e=Ee;break}$e=Ge}}}var Ke=_.alternate;if(Ke!==null){var Je=Ke.child;if(Je!==null){Ke.child=null;do{var mn=Je.sibling;Je.sibling=null,Je=mn}while(Je!==null)}}$e=_}}if((_.subtreeFlags&2064)!==0&&R!==null)R.return=_,$e=R;else e:for(;$e!==null;){if(_=$e,(_.flags&2048)!==0)switch(_.tag){case 0:case 11:case 15:_l(9,_,_.return)}var re=_.sibling;if(re!==null){re.return=_.return,$e=re;break e}$e=_.return}}var Q=n.current;for($e=Q;$e!==null;){R=$e;var ue=R.child;if((R.subtreeFlags&2064)!==0&&ue!==null)ue.return=R,$e=ue;else e:for(R=Q;$e!==null;){if(V=$e,(V.flags&2048)!==0)try{switch(V.tag){case 0:case 11:case 15:$c(9,V)}}catch(nt){dn(V,V.return,nt)}if(V===R){$e=null;break e}var Ae=V.sibling;if(Ae!==null){Ae.return=V.return,$e=Ae;break e}$e=V.return}}if(Lt=p,as(),De&&typeof De.onPostCommitFiberRoot=="function")try{De.onPostCommitFiberRoot(ae,n)}catch{}u=!0}return u}finally{Mt=o,Ai.transition=s}}return!1}function rx(n,s,o){s=Xa(o,s),s=M0(n,s,1),n=ls(n,s,1),s=Yn(),n!==null&&(yt(n,1,s),ai(n,s))}function dn(n,s,o){if(n.tag===3)rx(n,n,o);else for(;s!==null;){if(s.tag===3){rx(s,n,o);break}else if(s.tag===1){var u=s.stateNode;if(typeof s.type.getDerivedStateFromError=="function"||typeof u.componentDidCatch=="function"&&(us===null||!us.has(u))){n=Xa(o,n),n=E0(s,n,1),s=ls(s,n,1),n=Yn(),s!==null&&(yt(s,1,n),ai(s,n));break}}s=s.return}}function rM(n,s,o){var u=n.pingCache;u!==null&&u.delete(s),s=Yn(),n.pingedLanes|=n.suspendedLanes&o,Cn===n&&(In&o)===o&&(yn===4||yn===3&&(In&130023424)===In&&500>on()-Bh?ea(n,0):zh|=o),ai(n,s)}function sx(n,s){s===0&&((n.mode&1)===0?s=1:(s=tt,tt<<=1,(tt&130023424)===0&&(tt=4194304)));var o=Yn();n=Rr(n,s),n!==null&&(yt(n,s,o),ai(n,o))}function sM(n){var s=n.memoizedState,o=0;s!==null&&(o=s.retryLane),sx(n,o)}function aM(n,s){var o=0;switch(n.tag){case 13:var u=n.stateNode,p=n.memoizedState;p!==null&&(o=p.retryLane);break;case 19:u=n.stateNode;break;default:throw Error(t(314))}u!==null&&u.delete(s),sx(n,o)}var ax;ax=function(n,s,o){if(n!==null)if(n.memoizedProps!==s.pendingProps||ni.current)ri=!0;else{if((n.lanes&o)===0&&(s.flags&128)===0)return ri=!1,$S(n,s,o);ri=(n.flags&131072)!==0}else ri=!1,rn&&(s.flags&1048576)!==0&&zg(s,Pc,s.index);switch(s.lanes=0,s.tag){case 2:var u=s.type;Wc(n,s),n=s.pendingProps;var p=ka(s,kn.current);ja(s,o),p=xh(null,s,u,n,p,o);var _=vh();return s.flags|=1,typeof p=="object"&&p!==null&&typeof p.render=="function"&&p.$$typeof===void 0?(s.tag=1,s.memoizedState=null,s.updateQueue=null,ii(u)?(_=!0,Cc(s)):_=!1,s.memoizedState=p.state!==null&&p.state!==void 0?p.state:null,uh(s),p.updater=Gc,s.stateNode=p,p._reactInternals=s,wh(s,u,n,o),s=Rh(null,s,u,!0,_,o)):(s.tag=0,rn&&_&&eh(s),qn(null,s,p,o),s=s.child),s;case 16:u=s.elementType;e:{switch(Wc(n,s),n=s.pendingProps,p=u._init,u=p(u._payload),s.type=u,p=s.tag=lM(u),n=Bi(u,n),p){case 0:s=Ch(null,s,u,n,o);break e;case 1:s=L0(null,s,u,n,o);break e;case 11:s=C0(null,s,u,n,o);break e;case 14:s=R0(null,s,u,Bi(u.type,n),o);break e}throw Error(t(306,u,""))}return s;case 0:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:Bi(u,p),Ch(n,s,u,p,o);case 1:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:Bi(u,p),L0(n,s,u,p,o);case 3:e:{if(D0(s),n===null)throw Error(t(387));u=s.pendingProps,_=s.memoizedState,p=_.element,qg(n,s),Fc(s,u,null,o);var R=s.memoizedState;if(u=R.element,_.isDehydrated)if(_={element:u,isDehydrated:!1,cache:R.cache,pendingSuspenseBoundaries:R.pendingSuspenseBoundaries,transitions:R.transitions},s.updateQueue.baseState=_,s.memoizedState=_,s.flags&256){p=Xa(Error(t(423)),s),s=I0(n,s,u,o,p);break e}else if(u!==p){p=Xa(Error(t(424)),s),s=I0(n,s,u,o,p);break e}else for(mi=is(s.stateNode.containerInfo.firstChild),pi=s,rn=!0,zi=null,o=Xg(s,null,u,o),s.child=o;o;)o.flags=o.flags&-3|4096,o=o.sibling;else{if(Ha(),u===p){s=Pr(n,s,o);break e}qn(n,s,u,o)}s=s.child}return s;case 5:return Qg(s),n===null&&ih(s),u=s.type,p=s.pendingProps,_=n!==null?n.memoizedProps:null,R=p.children,qd(u,p)?R=null:_!==null&&qd(u,_)&&(s.flags|=32),N0(n,s),qn(n,s,R,o),s.child;case 6:return n===null&&ih(s),null;case 13:return U0(n,s,o);case 4:return dh(s,s.stateNode.containerInfo),u=s.pendingProps,n===null?s.child=Va(s,null,u,o):qn(n,s,u,o),s.child;case 11:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:Bi(u,p),C0(n,s,u,p,o);case 7:return qn(n,s,s.pendingProps,o),s.child;case 8:return qn(n,s,s.pendingProps.children,o),s.child;case 12:return qn(n,s,s.pendingProps.children,o),s.child;case 10:e:{if(u=s.type._context,p=s.pendingProps,_=s.memoizedProps,R=p.value,Kt(Dc,u._currentValue),u._currentValue=R,_!==null)if(ki(_.value,R)){if(_.children===p.children&&!ni.current){s=Pr(n,s,o);break e}}else for(_=s.child,_!==null&&(_.return=s);_!==null;){var V=_.dependencies;if(V!==null){R=_.child;for(var q=V.firstContext;q!==null;){if(q.context===u){if(_.tag===1){q=Ar(-1,o&-o),q.tag=2;var pe=_.updateQueue;if(pe!==null){pe=pe.shared;var we=pe.pending;we===null?q.next=q:(q.next=we.next,we.next=q),pe.pending=q}}_.lanes|=o,q=_.alternate,q!==null&&(q.lanes|=o),lh(_.return,o,s),V.lanes|=o;break}q=q.next}}else if(_.tag===10)R=_.type===s.type?null:_.child;else if(_.tag===18){if(R=_.return,R===null)throw Error(t(341));R.lanes|=o,V=R.alternate,V!==null&&(V.lanes|=o),lh(R,o,s),R=_.sibling}else R=_.child;if(R!==null)R.return=_;else for(R=_;R!==null;){if(R===s){R=null;break}if(_=R.sibling,_!==null){_.return=R.return,R=_;break}R=R.return}_=R}qn(n,s,p.children,o),s=s.child}return s;case 9:return p=s.type,u=s.pendingProps.children,ja(s,o),p=Ci(p),u=u(p),s.flags|=1,qn(n,s,u,o),s.child;case 14:return u=s.type,p=Bi(u,s.pendingProps),p=Bi(u.type,p),R0(n,s,u,p,o);case 15:return A0(n,s,s.type,s.pendingProps,o);case 17:return u=s.type,p=s.pendingProps,p=s.elementType===u?p:Bi(u,p),Wc(n,s),s.tag=1,ii(u)?(n=!0,Cc(s)):n=!1,ja(s,o),y0(s,u,p),wh(s,u,p,o),Rh(null,s,u,!0,n,o);case 19:return O0(n,s,o);case 22:return P0(n,s,o)}throw Error(t(156,s.tag))};function ox(n,s){return Gs(n,s)}function oM(n,s,o,u){this.tag=n,this.key=o,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=s,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=u,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Pi(n,s,o,u){return new oM(n,s,o,u)}function qh(n){return n=n.prototype,!(!n||!n.isReactComponent)}function lM(n){if(typeof n=="function")return qh(n)?1:0;if(n!=null){if(n=n.$$typeof,n===K)return 11;if(n===Y)return 14}return 2}function ps(n,s){var o=n.alternate;return o===null?(o=Pi(n.tag,s,n.key,n.mode),o.elementType=n.elementType,o.type=n.type,o.stateNode=n.stateNode,o.alternate=n,n.alternate=o):(o.pendingProps=s,o.type=n.type,o.flags=0,o.subtreeFlags=0,o.deletions=null),o.flags=n.flags&14680064,o.childLanes=n.childLanes,o.lanes=n.lanes,o.child=n.child,o.memoizedProps=n.memoizedProps,o.memoizedState=n.memoizedState,o.updateQueue=n.updateQueue,s=n.dependencies,o.dependencies=s===null?null:{lanes:s.lanes,firstContext:s.firstContext},o.sibling=n.sibling,o.index=n.index,o.ref=n.ref,o}function nu(n,s,o,u,p,_){var R=2;if(u=n,typeof n=="function")qh(n)&&(R=1);else if(typeof n=="string")R=5;else e:switch(n){case U:return na(o.children,p,_,s);case b:R=8,p|=8;break;case I:return n=Pi(12,o,s,p|2),n.elementType=I,n.lanes=_,n;case se:return n=Pi(13,o,s,p),n.elementType=se,n.lanes=_,n;case fe:return n=Pi(19,o,s,p),n.elementType=fe,n.lanes=_,n;case B:return iu(o,p,_,s);default:if(typeof n=="object"&&n!==null)switch(n.$$typeof){case X:R=10;break e;case O:R=9;break e;case K:R=11;break e;case Y:R=14;break e;case me:R=16,u=null;break e}throw Error(t(130,n==null?n:typeof n,""))}return s=Pi(R,o,s,p),s.elementType=n,s.type=u,s.lanes=_,s}function na(n,s,o,u){return n=Pi(7,n,u,s),n.lanes=o,n}function iu(n,s,o,u){return n=Pi(22,n,u,s),n.elementType=B,n.lanes=o,n.stateNode={isHidden:!1},n}function Yh(n,s,o){return n=Pi(6,n,null,s),n.lanes=o,n}function Kh(n,s,o){return s=Pi(4,n.children!==null?n.children:[],n.key,s),s.lanes=o,s.stateNode={containerInfo:n.containerInfo,pendingChildren:null,implementation:n.implementation},s}function cM(n,s,o,u,p){this.tag=s,this.containerInfo=n,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=Ln(0),this.expirationTimes=Ln(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Ln(0),this.identifierPrefix=u,this.onRecoverableError=p,this.mutableSourceEagerHydrationData=null}function Qh(n,s,o,u,p,_,R,V,q){return n=new cM(n,s,o,V,q),s===1?(s=1,_===!0&&(s|=8)):s=0,_=Pi(3,null,null,s),n.current=_,_.stateNode=n,_.memoizedState={element:u,isDehydrated:o,cache:null,transitions:null,pendingSuspenseBoundaries:null},uh(_),n}function uM(n,s,o){var u=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:P,key:u==null?null:""+u,children:n,containerInfo:s,implementation:o}}function lx(n){if(!n)return ss;n=n._reactInternals;e:{if($n(n)!==n||n.tag!==1)throw Error(t(170));var s=n;do{switch(s.tag){case 3:s=s.stateNode.context;break e;case 1:if(ii(s.type)){s=s.stateNode.__reactInternalMemoizedMergedChildContext;break e}}s=s.return}while(s!==null);throw Error(t(171))}if(n.tag===1){var o=n.type;if(ii(o))return Fg(n,o,s)}return s}function cx(n,s,o,u,p,_,R,V,q){return n=Qh(o,u,!0,n,p,_,R,V,q),n.context=lx(null),o=n.current,u=Yn(),p=hs(o),_=Ar(u,p),_.callback=s??null,ls(o,_,p),n.current.lanes=p,yt(n,p,u),ai(n,u),n}function ru(n,s,o,u){var p=s.current,_=Yn(),R=hs(p);return o=lx(o),s.context===null?s.context=o:s.pendingContext=o,s=Ar(_,R),s.payload={element:n},u=u===void 0?null:u,u!==null&&(s.callback=u),n=ls(p,s,R),n!==null&&(Gi(n,p,R,_),Uc(n,p,R)),R}function su(n){if(n=n.current,!n.child)return null;switch(n.child.tag){case 5:return n.child.stateNode;default:return n.child.stateNode}}function ux(n,s){if(n=n.memoizedState,n!==null&&n.dehydrated!==null){var o=n.retryLane;n.retryLane=o!==0&&o<s?o:s}}function Zh(n,s){ux(n,s),(n=n.alternate)&&ux(n,s)}function dM(){return null}var dx=typeof reportError=="function"?reportError:function(n){console.error(n)};function Jh(n){this._internalRoot=n}au.prototype.render=Jh.prototype.render=function(n){var s=this._internalRoot;if(s===null)throw Error(t(409));ru(n,s,null,null)},au.prototype.unmount=Jh.prototype.unmount=function(){var n=this._internalRoot;if(n!==null){this._internalRoot=null;var s=n.containerInfo;Js(function(){ru(null,n,null,null)}),s[wr]=null}};function au(n){this._internalRoot=n}au.prototype.unstable_scheduleHydration=function(n){if(n){var s=Gt();n={blockedOn:null,target:n,priority:s};for(var o=0;o<es.length&&s!==0&&s<es[o].priority;o++);es.splice(o,0,n),o===0&&Qm(n)}};function ef(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11)}function ou(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11&&(n.nodeType!==8||n.nodeValue!==" react-mount-point-unstable "))}function hx(){}function hM(n,s,o,u,p){if(p){if(typeof u=="function"){var _=u;u=function(){var pe=su(R);_.call(pe)}}var R=cx(s,u,n,0,null,!1,!1,"",hx);return n._reactRootContainer=R,n[wr]=R.current,al(n.nodeType===8?n.parentNode:n),Js(),R}for(;p=n.lastChild;)n.removeChild(p);if(typeof u=="function"){var V=u;u=function(){var pe=su(q);V.call(pe)}}var q=Qh(n,0,!1,null,null,!1,!1,"",hx);return n._reactRootContainer=q,n[wr]=q.current,al(n.nodeType===8?n.parentNode:n),Js(function(){ru(s,q,o,u)}),q}function lu(n,s,o,u,p){var _=o._reactRootContainer;if(_){var R=_;if(typeof p=="function"){var V=p;p=function(){var q=su(R);V.call(q)}}ru(s,R,n,p)}else R=hM(o,s,n,p,u);return su(R)}zt=function(n){switch(n.tag){case 3:var s=n.stateNode;if(s.current.memoizedState.isDehydrated){var o=Pt(s.pendingLanes);o!==0&&(ti(s,o|1),ai(s,on()),(Lt&6)===0&&(Ya=on()+500,as()))}break;case 13:Js(function(){var u=Rr(n,1);if(u!==null){var p=Yn();Gi(u,n,1,p)}}),Zh(n,1)}},Zt=function(n){if(n.tag===13){var s=Rr(n,134217728);if(s!==null){var o=Yn();Gi(s,n,134217728,o)}Zh(n,134217728)}},Fi=function(n){if(n.tag===13){var s=hs(n),o=Rr(n,s);if(o!==null){var u=Yn();Gi(o,n,s,u)}Zh(n,s)}},Gt=function(){return Mt},Oi=function(n,s){var o=Mt;try{return Mt=n,s()}finally{Mt=o}},it=function(n,s,o){switch(s){case"input":if(Ut(n,o),s=o.name,o.type==="radio"&&s!=null){for(o=n;o.parentNode;)o=o.parentNode;for(o=o.querySelectorAll("input[name="+JSON.stringify(""+s)+'][type="radio"]'),s=0;s<o.length;s++){var u=o[s];if(u!==n&&u.form===n.form){var p=bc(u);if(!p)throw Error(t(90));It(u),Ut(u,p)}}}break;case"textarea":pn(n,o);break;case"select":s=o.value,s!=null&&Nt(n,!!o.multiple,s,!1)}},ke=Wh,Se=Js;var fM={usingClientEntryPoint:!1,Events:[cl,Fa,bc,_e,Ie,Wh]},El={findFiberByHostInstance:Ws,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},pM={bundleType:El.bundleType,version:El.version,rendererPackageName:El.rendererPackageName,rendererConfig:El.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:C.ReactCurrentDispatcher,findHostInstanceByFiber:function(n){return n=Vs(n),n===null?null:n.stateNode},findFiberByHostInstance:El.findFiberByHostInstance||dM,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var cu=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!cu.isDisabled&&cu.supportsFiber)try{ae=cu.inject(pM),De=cu}catch{}}return oi.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=fM,oi.createPortal=function(n,s){var o=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!ef(s))throw Error(t(200));return uM(n,s,null,o)},oi.createRoot=function(n,s){if(!ef(n))throw Error(t(299));var o=!1,u="",p=dx;return s!=null&&(s.unstable_strictMode===!0&&(o=!0),s.identifierPrefix!==void 0&&(u=s.identifierPrefix),s.onRecoverableError!==void 0&&(p=s.onRecoverableError)),s=Qh(n,1,!1,null,null,o,!1,u,p),n[wr]=s.current,al(n.nodeType===8?n.parentNode:n),new Jh(s)},oi.findDOMNode=function(n){if(n==null)return null;if(n.nodeType===1)return n;var s=n._reactInternals;if(s===void 0)throw typeof n.render=="function"?Error(t(188)):(n=Object.keys(n).join(","),Error(t(268,n)));return n=Vs(s),n=n===null?null:n.stateNode,n},oi.flushSync=function(n){return Js(n)},oi.hydrate=function(n,s,o){if(!ou(s))throw Error(t(200));return lu(null,n,s,!0,o)},oi.hydrateRoot=function(n,s,o){if(!ef(n))throw Error(t(405));var u=o!=null&&o.hydratedSources||null,p=!1,_="",R=dx;if(o!=null&&(o.unstable_strictMode===!0&&(p=!0),o.identifierPrefix!==void 0&&(_=o.identifierPrefix),o.onRecoverableError!==void 0&&(R=o.onRecoverableError)),s=cx(s,null,n,1,o??null,p,!1,_,R),n[wr]=s.current,al(n),u)for(n=0;n<u.length;n++)o=u[n],p=o._getVersion,p=p(o._source),s.mutableSourceEagerHydrationData==null?s.mutableSourceEagerHydrationData=[o,p]:s.mutableSourceEagerHydrationData.push(o,p);return new au(s)},oi.render=function(n,s,o){if(!ou(s))throw Error(t(200));return lu(null,n,s,!1,o)},oi.unmountComponentAtNode=function(n){if(!ou(n))throw Error(t(40));return n._reactRootContainer?(Js(function(){lu(null,null,n,!1,function(){n._reactRootContainer=null,n[wr]=null})}),!0):!1},oi.unstable_batchedUpdates=Wh,oi.unstable_renderSubtreeIntoContainer=function(n,s,o,u){if(!ou(o))throw Error(t(200));if(n==null||n._reactInternals===void 0)throw Error(t(38));return lu(n,s,o,!1,u)},oi.version="18.3.1-next-f1338f8080-20240426",oi}var Sx;function wM(){if(Sx)return sf.exports;Sx=1;function i(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(i)}catch(e){console.error(e)}}return i(),sf.exports=EM(),sf.exports}var Mx;function bM(){if(Mx)return du;Mx=1;var i=wM();return du.createRoot=i.createRoot,du.hydrateRoot=i.hydrateRoot,du}var TM=bM(),Oo=class{constructor(){this.listeners=new Set,this.subscribe=this.subscribe.bind(this)}subscribe(i){return this.listeners.add(i),this.onSubscribe(),()=>{this.listeners.delete(i),this.onUnsubscribe()}}hasListeners(){return this.listeners.size>0}onSubscribe(){}onUnsubscribe(){}},fa,bs,yo,s_,CM=(s_=class extends Oo{constructor(){super();st(this,fa);st(this,bs);st(this,yo);He(this,yo,e=>{if(typeof window<"u"&&window.addEventListener){const t=()=>e();return window.addEventListener("visibilitychange",t,!1),()=>{window.removeEventListener("visibilitychange",t)}}})}onSubscribe(){W(this,bs)||this.setEventListener(W(this,yo))}onUnsubscribe(){var e;this.hasListeners()||((e=W(this,bs))==null||e.call(this),He(this,bs,void 0))}setEventListener(e){var t;He(this,yo,e),(t=W(this,bs))==null||t.call(this),He(this,bs,e(r=>{typeof r=="boolean"?this.setFocused(r):this.onFocus()}))}setFocused(e){W(this,fa)!==e&&(He(this,fa,e),this.onFocus())}onFocus(){const e=this.isFocused();this.listeners.forEach(t=>{t(e)})}isFocused(){var e;return typeof W(this,fa)=="boolean"?W(this,fa):((e=globalThis.document)==null?void 0:e.visibilityState)!=="hidden"}},fa=new WeakMap,bs=new WeakMap,yo=new WeakMap,s_),um=new CM,RM={setTimeout:(i,e)=>setTimeout(i,e),clearTimeout:i=>clearTimeout(i),setInterval:(i,e)=>setInterval(i,e),clearInterval:i=>clearInterval(i)},Ts,lm,a_,AM=(a_=class{constructor(){st(this,Ts,RM);st(this,lm,!1)}setTimeoutProvider(i){He(this,Ts,i)}setTimeout(i,e){return W(this,Ts).setTimeout(i,e)}clearTimeout(i){W(this,Ts).clearTimeout(i)}setInterval(i,e){return W(this,Ts).setInterval(i,e)}clearInterval(i){W(this,Ts).clearInterval(i)}},Ts=new WeakMap,lm=new WeakMap,a_),ua=new AM;function PM(i){setTimeout(i,0)}var NM=typeof window>"u"||"Deno"in globalThis;function Zn(){}function LM(i,e){return typeof i=="function"?i(e):i}function Jf(i){return typeof i=="number"&&i>=0&&i!==1/0}function g_(i,e){return Math.max(i+(e||0)-Date.now(),0)}function Us(i,e){return typeof i=="function"?i(e):i}function yi(i,e){return typeof i=="function"?i(e):i}function Ex(i,e){const{type:t="all",exact:r,fetchStatus:a,predicate:l,queryKey:c,stale:d}=i;if(c){if(r){if(e.queryHash!==dm(c,e.options))return!1}else if(!Vl(e.queryKey,c))return!1}if(t!=="all"){const h=e.isActive();if(t==="active"&&!h||t==="inactive"&&h)return!1}return!(typeof d=="boolean"&&e.isStale()!==d||a&&a!==e.state.fetchStatus||l&&!l(e))}function wx(i,e){const{exact:t,status:r,predicate:a,mutationKey:l}=i;if(l){if(!e.options.mutationKey)return!1;if(t){if(Ma(e.options.mutationKey)!==Ma(l))return!1}else if(!Vl(e.options.mutationKey,l))return!1}return!(r&&e.state.status!==r||a&&!a(e))}function dm(i,e){return((e==null?void 0:e.queryKeyHashFn)||Ma)(i)}function Ma(i){return JSON.stringify(i,(e,t)=>ep(t)?Object.keys(t).sort().reduce((r,a)=>(r[a]=t[a],r),{}):t)}function Vl(i,e){return i===e?!0:typeof i!=typeof e?!1:i&&e&&typeof i=="object"&&typeof e=="object"?Object.keys(e).every(t=>Vl(i[t],e[t])):!1}var DM=Object.prototype.hasOwnProperty;function x_(i,e,t=0){if(i===e)return i;if(t>500)return e;const r=bx(i)&&bx(e);if(!r&&!(ep(i)&&ep(e)))return e;const l=(r?i:Object.keys(i)).length,c=r?e:Object.keys(e),d=c.length,h=r?new Array(d):{};let f=0;for(let m=0;m<d;m++){const x=r?m:c[m],g=i[x],M=e[x];if(g===M){h[x]=g,(r?m<l:DM.call(i,x))&&f++;continue}if(g===null||M===null||typeof g!="object"||typeof M!="object"){h[x]=M;continue}const E=x_(g,M,t+1);h[x]=E,E===g&&f++}return l===d&&f===l?i:h}function td(i,e){if(!e||Object.keys(i).length!==Object.keys(e).length)return!1;for(const t in i)if(i[t]!==e[t])return!1;return!0}function bx(i){return Array.isArray(i)&&i.length===Object.keys(i).length}function ep(i){if(!Tx(i))return!1;const e=i.constructor;if(e===void 0)return!0;const t=e.prototype;return!(!Tx(t)||!t.hasOwnProperty("isPrototypeOf")||Object.getPrototypeOf(i)!==Object.prototype)}function Tx(i){return Object.prototype.toString.call(i)==="[object Object]"}function IM(i){return new Promise(e=>{ua.setTimeout(e,i)})}function tp(i,e,t){return typeof t.structuralSharing=="function"?t.structuralSharing(i,e):t.structuralSharing!==!1?x_(i,e):e}function UM(i,e,t=0){const r=[...i,e];return t&&r.length>t?r.slice(1):r}function FM(i,e,t=0){const r=[e,...i];return t&&r.length>t?r.slice(0,-1):r}var hm=Symbol();function v_(i,e){return!i.queryFn&&(e!=null&&e.initialPromise)?()=>e.initialPromise:!i.queryFn||i.queryFn===hm?()=>Promise.reject(new Error(`Missing queryFn: '${i.queryHash}'`)):i.queryFn}function fm(i,e){return typeof i=="function"?i(...e):!!i}function OM(i,e,t){let r=!1,a;return Object.defineProperty(i,"signal",{enumerable:!0,get:()=>(a??(a=e()),r||(r=!0,a.aborted?t():a.addEventListener("abort",t,{once:!0})),a)}),i}var Gl=(()=>{let i=()=>NM;return{isServer(){return i()},setIsServer(e){i=e}}})();function np(){let i,e;const t=new Promise((a,l)=>{i=a,e=l});t.status="pending",t.catch(()=>{});function r(a){Object.assign(t,a),delete t.resolve,delete t.reject}return t.resolve=a=>{r({status:"fulfilled",value:a}),i(a)},t.reject=a=>{r({status:"rejected",reason:a}),e(a)},t}var kM=PM;function zM(){let i=[],e=0,t=d=>{d()},r=d=>{d()},a=kM;const l=d=>{e?i.push(d):a(()=>{t(d)})},c=()=>{const d=i;i=[],d.length&&a(()=>{r(()=>{d.forEach(h=>{t(h)})})})};return{batch:d=>{let h;e++;try{h=d()}finally{e--,e||c()}return h},batchCalls:d=>(...h)=>{l(()=>{d(...h)})},schedule:l,setNotifyFunction:d=>{t=d},setBatchNotifyFunction:d=>{r=d},setScheduler:d=>{a=d}}}var Mn=zM(),So,Cs,Mo,o_,BM=(o_=class extends Oo{constructor(){super();st(this,So,!0);st(this,Cs);st(this,Mo);He(this,Mo,e=>{if(typeof window<"u"&&window.addEventListener){const t=()=>e(!0),r=()=>e(!1);return window.addEventListener("online",t,!1),window.addEventListener("offline",r,!1),()=>{window.removeEventListener("online",t),window.removeEventListener("offline",r)}}})}onSubscribe(){W(this,Cs)||this.setEventListener(W(this,Mo))}onUnsubscribe(){var e;this.hasListeners()||((e=W(this,Cs))==null||e.call(this),He(this,Cs,void 0))}setEventListener(e){var t;He(this,Mo,e),(t=W(this,Cs))==null||t.call(this),He(this,Cs,e(this.setOnline.bind(this)))}setOnline(e){W(this,So)!==e&&(He(this,So,e),this.listeners.forEach(r=>{r(e)}))}isOnline(){return W(this,So)}},So=new WeakMap,Cs=new WeakMap,Mo=new WeakMap,o_),nd=new BM;function HM(i){return Math.min(1e3*2**i,3e4)}function __(i){return(i??"online")==="online"?nd.isOnline():!0}var ip=class extends Error{constructor(i){super("CancelledError"),this.revert=i==null?void 0:i.revert,this.silent=i==null?void 0:i.silent}};function y_(i){let e=!1,t=0,r;const a=np(),l=()=>a.status!=="pending",c=w=>{var S;if(!l()){const y=new ip(w);g(y),(S=i.onCancel)==null||S.call(i,y)}},d=()=>{e=!0},h=()=>{e=!1},f=()=>um.isFocused()&&(i.networkMode==="always"||nd.isOnline())&&i.canRun(),m=()=>__(i.networkMode)&&i.canRun(),x=w=>{l()||(r==null||r(),a.resolve(w))},g=w=>{l()||(r==null||r(),a.reject(w))},M=()=>new Promise(w=>{var S;r=y=>{(l()||f())&&w(y)},(S=i.onPause)==null||S.call(i)}).then(()=>{var w;r=void 0,l()||(w=i.onContinue)==null||w.call(i)}),E=()=>{if(l())return;let w;const S=t===0?i.initialPromise:void 0;try{w=S??i.fn()}catch(y){w=Promise.reject(y)}Promise.resolve(w).then(x).catch(y=>{var P;if(l())return;const N=i.retry??(Gl.isServer()?0:3),L=i.retryDelay??HM,C=typeof L=="function"?L(t,y):L,D=N===!0||typeof N=="number"&&t<N||typeof N=="function"&&N(t,y);if(e||!D){g(y);return}t++,(P=i.onFail)==null||P.call(i,t,y),IM(C).then(()=>f()?void 0:M()).then(()=>{e?g(y):E()})})};return{promise:a,status:()=>a.status,cancel:c,continue:()=>(r==null||r(),a),cancelRetry:d,continueRetry:h,canStart:m,start:()=>(m()?E():M().then(E),a)}}var pa,l_,S_=(l_=class{constructor(){st(this,pa)}destroy(){this.clearGcTimeout()}scheduleGc(){this.clearGcTimeout(),Jf(this.gcTime)&&He(this,pa,ua.setTimeout(()=>{this.optionalRemove()},this.gcTime))}updateGcTime(i){this.gcTime=Math.max(this.gcTime||0,i??(Gl.isServer()?1/0:300*1e3))}clearGcTimeout(){W(this,pa)!==void 0&&(ua.clearTimeout(W(this,pa)),He(this,pa,void 0))}},pa=new WeakMap,l_);function VM(i){return{onFetch:(e,t)=>{var m,x,g,M,E;const r=e.options,a=(g=(x=(m=e.fetchOptions)==null?void 0:m.meta)==null?void 0:x.fetchMore)==null?void 0:g.direction,l=((M=e.state.data)==null?void 0:M.pages)||[],c=((E=e.state.data)==null?void 0:E.pageParams)||[];let d={pages:[],pageParams:[]},h=0;const f=async()=>{let w=!1;const S=L=>{OM(L,()=>e.signal,()=>w=!0)},y=v_(e.options,e.fetchOptions),N=async(L,C,D)=>{if(w)return Promise.reject(e.signal.reason);if(C==null&&L.pages.length)return Promise.resolve(L);const U=(()=>{const O={client:e.client,queryKey:e.queryKey,pageParam:C,direction:D?"backward":"forward",meta:e.options.meta};return S(O),O})(),b=await y(U),{maxPages:I}=e.options,X=D?FM:UM;return{pages:X(L.pages,b,I),pageParams:X(L.pageParams,C,I)}};if(a&&l.length){const L=a==="backward",C=L?GM:Cx,D={pages:l,pageParams:c},P=C(r,D);d=await N(D,P,L)}else{const L=i??l.length;do{const C=h===0?c[0]??r.initialPageParam:Cx(r,d);if(h>0&&C==null)break;d=await N(d,C),h++}while(h<L)}return d};e.options.persister?e.fetchFn=()=>{var w,S;return(S=(w=e.options).persister)==null?void 0:S.call(w,f,{client:e.client,queryKey:e.queryKey,meta:e.options.meta,signal:e.signal},t)}:e.fetchFn=f}}}function Cx(i,{pages:e,pageParams:t}){const r=e.length-1;return e.length>0?i.getNextPageParam(e[r],e,t[r],t):void 0}function GM(i,{pages:e,pageParams:t}){var r;return e.length>0?(r=i.getPreviousPageParam)==null?void 0:r.call(i,e[0],e,t[0],t):void 0}var Eo,ma,wo,Di,ga,Pn,Kl,xa,_i,M_,kr,c_,jM=(c_=class extends S_{constructor(e){super();st(this,_i);st(this,Eo);st(this,ma);st(this,wo);st(this,Di);st(this,ga);st(this,Pn);st(this,Kl);st(this,xa);He(this,xa,!1),He(this,Kl,e.defaultOptions),this.setOptions(e.options),this.observers=[],He(this,ga,e.client),He(this,Di,W(this,ga).getQueryCache()),this.queryKey=e.queryKey,this.queryHash=e.queryHash,He(this,ma,Ax(this.options)),this.state=e.state??W(this,ma),this.scheduleGc()}get meta(){return this.options.meta}get queryType(){return W(this,Eo)}get promise(){var e;return(e=W(this,Pn))==null?void 0:e.promise}setOptions(e){if(this.options={...W(this,Kl),...e},e!=null&&e._type&&He(this,Eo,e._type),this.updateGcTime(this.options.gcTime),this.state&&this.state.data===void 0){const t=Ax(this.options);t.data!==void 0&&(this.setState(Rx(t.data,t.dataUpdatedAt)),He(this,ma,t))}}optionalRemove(){!this.observers.length&&this.state.fetchStatus==="idle"&&W(this,Di).remove(this)}setData(e,t){const r=tp(this.state.data,e,this.options);return gt(this,_i,kr).call(this,{data:r,type:"success",dataUpdatedAt:t==null?void 0:t.updatedAt,manual:t==null?void 0:t.manual}),r}setState(e){gt(this,_i,kr).call(this,{type:"setState",state:e})}cancel(e){var r,a;const t=(r=W(this,Pn))==null?void 0:r.promise;return(a=W(this,Pn))==null||a.cancel(e),t?t.then(Zn).catch(Zn):Promise.resolve()}destroy(){super.destroy(),this.cancel({silent:!0})}get resetState(){return W(this,ma)}reset(){this.destroy(),this.setState(this.resetState)}isActive(){return this.observers.some(e=>yi(e.options.enabled,this)!==!1)}isDisabled(){return this.getObserversCount()>0?!this.isActive():this.options.queryFn===hm||!this.isFetched()}isFetched(){return this.state.dataUpdateCount+this.state.errorUpdateCount>0}isStatic(){return this.getObserversCount()>0?this.observers.some(e=>Us(e.options.staleTime,this)==="static"):!1}isStale(){return this.getObserversCount()>0?this.observers.some(e=>e.getCurrentResult().isStale):this.state.data===void 0||this.state.isInvalidated}isStaleByTime(e=0){return this.state.data===void 0?!0:e==="static"?!1:this.state.isInvalidated?!0:!g_(this.state.dataUpdatedAt,e)}onFocus(){var t;const e=this.observers.find(r=>r.shouldFetchOnWindowFocus());e==null||e.refetch({cancelRefetch:!1}),(t=W(this,Pn))==null||t.continue()}onOnline(){var t;const e=this.observers.find(r=>r.shouldFetchOnReconnect());e==null||e.refetch({cancelRefetch:!1}),(t=W(this,Pn))==null||t.continue()}addObserver(e){this.observers.includes(e)||(this.observers.push(e),this.clearGcTimeout(),W(this,Di).notify({type:"observerAdded",query:this,observer:e}))}removeObserver(e){this.observers.includes(e)&&(this.observers=this.observers.filter(t=>t!==e),this.observers.length||(W(this,Pn)&&(W(this,xa)||gt(this,_i,M_).call(this)?W(this,Pn).cancel({revert:!0}):W(this,Pn).cancelRetry()),this.scheduleGc()),W(this,Di).notify({type:"observerRemoved",query:this,observer:e}))}getObserversCount(){return this.observers.length}invalidate(){this.state.isInvalidated||gt(this,_i,kr).call(this,{type:"invalidate"})}async fetch(e,t){var f,m,x,g,M,E,w,S,y,N,L;if(this.state.fetchStatus!=="idle"&&((f=W(this,Pn))==null?void 0:f.status())!=="rejected"){if(this.state.data!==void 0&&(t!=null&&t.cancelRefetch))this.cancel({silent:!0});else if(W(this,Pn))return W(this,Pn).continueRetry(),W(this,Pn).promise}if(e&&this.setOptions(e),!this.options.queryFn){const C=this.observers.find(D=>D.options.queryFn);C&&this.setOptions(C.options)}const r=new AbortController,a=C=>{Object.defineProperty(C,"signal",{enumerable:!0,get:()=>(He(this,xa,!0),r.signal)})},l=()=>{const C=v_(this.options,t),P=(()=>{const U={client:W(this,ga),queryKey:this.queryKey,meta:this.meta};return a(U),U})();return He(this,xa,!1),this.options.persister?this.options.persister(C,P,this):C(P)},d=(()=>{const C={fetchOptions:t,options:this.options,queryKey:this.queryKey,client:W(this,ga),state:this.state,fetchFn:l};return a(C),C})(),h=W(this,Eo)==="infinite"?VM(this.options.pages):this.options.behavior;h==null||h.onFetch(d,this),He(this,wo,this.state),(this.state.fetchStatus==="idle"||this.state.fetchMeta!==((m=d.fetchOptions)==null?void 0:m.meta))&&gt(this,_i,kr).call(this,{type:"fetch",meta:(x=d.fetchOptions)==null?void 0:x.meta}),He(this,Pn,y_({initialPromise:t==null?void 0:t.initialPromise,fn:d.fetchFn,onCancel:C=>{C instanceof ip&&C.revert&&this.setState({...W(this,wo),fetchStatus:"idle"}),r.abort()},onFail:(C,D)=>{gt(this,_i,kr).call(this,{type:"failed",failureCount:C,error:D})},onPause:()=>{gt(this,_i,kr).call(this,{type:"pause"})},onContinue:()=>{gt(this,_i,kr).call(this,{type:"continue"})},retry:d.options.retry,retryDelay:d.options.retryDelay,networkMode:d.options.networkMode,canRun:()=>!0}));try{const C=await W(this,Pn).start();if(C===void 0)throw new Error(`${this.queryHash} data is undefined`);return this.setData(C),(M=(g=W(this,Di).config).onSuccess)==null||M.call(g,C,this),(w=(E=W(this,Di).config).onSettled)==null||w.call(E,C,this.state.error,this),C}catch(C){if(C instanceof ip){if(C.silent)return W(this,Pn).promise;if(C.revert){if(this.state.data===void 0)throw C;return this.state.data}}throw gt(this,_i,kr).call(this,{type:"error",error:C}),(y=(S=W(this,Di).config).onError)==null||y.call(S,C,this),(L=(N=W(this,Di).config).onSettled)==null||L.call(N,this.state.data,C,this),C}finally{this.scheduleGc()}}},Eo=new WeakMap,ma=new WeakMap,wo=new WeakMap,Di=new WeakMap,ga=new WeakMap,Pn=new WeakMap,Kl=new WeakMap,xa=new WeakMap,_i=new WeakSet,M_=function(){return this.state.fetchStatus==="paused"&&this.state.status==="pending"},kr=function(e){const t=r=>{switch(e.type){case"failed":return{...r,fetchFailureCount:e.failureCount,fetchFailureReason:e.error};case"pause":return{...r,fetchStatus:"paused"};case"continue":return{...r,fetchStatus:"fetching"};case"fetch":return{...r,...E_(r.data,this.options),fetchMeta:e.meta??null};case"success":const a={...r,...Rx(e.data,e.dataUpdatedAt),dataUpdateCount:r.dataUpdateCount+1,...!e.manual&&{fetchStatus:"idle",fetchFailureCount:0,fetchFailureReason:null}};return He(this,wo,e.manual?a:void 0),a;case"error":const l=e.error;return{...r,error:l,errorUpdateCount:r.errorUpdateCount+1,errorUpdatedAt:Date.now(),fetchFailureCount:r.fetchFailureCount+1,fetchFailureReason:l,fetchStatus:"idle",status:"error",isInvalidated:!0};case"invalidate":return{...r,isInvalidated:!0};case"setState":return{...r,...e.state}}};this.state=t(this.state),Mn.batch(()=>{this.observers.forEach(r=>{r.onQueryUpdate()}),W(this,Di).notify({query:this,type:"updated",action:e})})},c_);function E_(i,e){return{fetchFailureCount:0,fetchFailureReason:null,fetchStatus:__(e.networkMode)?"fetching":"paused",...i===void 0&&{error:null,status:"pending"}}}function Rx(i,e){return{data:i,dataUpdatedAt:e??Date.now(),error:null,isInvalidated:!1,status:"success"}}function Ax(i){const e=typeof i.initialData=="function"?i.initialData():i.initialData,t=e!==void 0,r=t?typeof i.initialDataUpdatedAt=="function"?i.initialDataUpdatedAt():i.initialDataUpdatedAt:0;return{data:e,dataUpdateCount:0,dataUpdatedAt:t?r??Date.now():0,error:null,errorUpdateCount:0,errorUpdatedAt:0,fetchFailureCount:0,fetchFailureReason:null,fetchMeta:null,isInvalidated:!1,status:t?"success":"pending",fetchStatus:"idle"}}var ui,Rt,Ql,Qn,va,bo,zr,Rs,Zl,To,Co,_a,ya,As,Ro,Bt,Ul,rp,sp,ap,op,lp,cp,up,w_,u_,WM=(u_=class extends Oo{constructor(e,t){super();st(this,Bt);st(this,ui);st(this,Rt);st(this,Ql);st(this,Qn);st(this,va);st(this,bo);st(this,zr);st(this,Rs);st(this,Zl);st(this,To);st(this,Co);st(this,_a);st(this,ya);st(this,As);st(this,Ro,new Set);this.options=t,He(this,ui,e),He(this,Rs,null),He(this,zr,np()),this.bindMethods(),this.setOptions(t)}bindMethods(){this.refetch=this.refetch.bind(this)}onSubscribe(){this.listeners.size===1&&(W(this,Rt).addObserver(this),Px(W(this,Rt),this.options)?gt(this,Bt,Ul).call(this):this.updateResult(),gt(this,Bt,op).call(this))}onUnsubscribe(){this.hasListeners()||this.destroy()}shouldFetchOnReconnect(){return dp(W(this,Rt),this.options,this.options.refetchOnReconnect)}shouldFetchOnWindowFocus(){return dp(W(this,Rt),this.options,this.options.refetchOnWindowFocus)}destroy(){this.listeners=new Set,gt(this,Bt,lp).call(this),gt(this,Bt,cp).call(this),W(this,Rt).removeObserver(this)}setOptions(e){const t=this.options,r=W(this,Rt);if(this.options=W(this,ui).defaultQueryOptions(e),this.options.enabled!==void 0&&typeof this.options.enabled!="boolean"&&typeof this.options.enabled!="function"&&typeof yi(this.options.enabled,W(this,Rt))!="boolean")throw new Error("Expected enabled to be a boolean or a callback that returns a boolean");gt(this,Bt,up).call(this),W(this,Rt).setOptions(this.options),t._defaulted&&!td(this.options,t)&&W(this,ui).getQueryCache().notify({type:"observerOptionsUpdated",query:W(this,Rt),observer:this});const a=this.hasListeners();a&&Nx(W(this,Rt),r,this.options,t)&&gt(this,Bt,Ul).call(this),this.updateResult(),a&&(W(this,Rt)!==r||yi(this.options.enabled,W(this,Rt))!==yi(t.enabled,W(this,Rt))||Us(this.options.staleTime,W(this,Rt))!==Us(t.staleTime,W(this,Rt)))&&gt(this,Bt,rp).call(this);const l=gt(this,Bt,sp).call(this);a&&(W(this,Rt)!==r||yi(this.options.enabled,W(this,Rt))!==yi(t.enabled,W(this,Rt))||l!==W(this,As))&&gt(this,Bt,ap).call(this,l)}getOptimisticResult(e){const t=W(this,ui).getQueryCache().build(W(this,ui),e),r=this.createResult(t,e);return $M(this,r)&&(He(this,Qn,r),He(this,bo,this.options),He(this,va,W(this,Rt).state)),r}getCurrentResult(){return W(this,Qn)}trackResult(e,t){return new Proxy(e,{get:(r,a)=>(this.trackProp(a),t==null||t(a),a==="promise"&&(this.trackProp("data"),!this.options.experimental_prefetchInRender&&W(this,zr).status==="pending"&&W(this,zr).reject(new Error("experimental_prefetchInRender feature flag is not enabled"))),Reflect.get(r,a))})}trackProp(e){W(this,Ro).add(e)}getCurrentQuery(){return W(this,Rt)}refetch({...e}={}){return this.fetch({...e})}fetchOptimistic(e){const t=W(this,ui).defaultQueryOptions(e),r=W(this,ui).getQueryCache().build(W(this,ui),t);return r.fetch().then(()=>this.createResult(r,t))}fetch(e){return gt(this,Bt,Ul).call(this,{...e,cancelRefetch:e.cancelRefetch??!0}).then(()=>(this.updateResult(),W(this,Qn)))}createResult(e,t){var I;const r=W(this,Rt),a=this.options,l=W(this,Qn),c=W(this,va),d=W(this,bo),f=e!==r?e.state:W(this,Ql),{state:m}=e;let x={...m},g=!1,M;if(t._optimisticResults){const X=this.hasListeners(),O=!X&&Px(e,t),K=X&&Nx(e,r,t,a);(O||K)&&(x={...x,...E_(m.data,e.options)}),t._optimisticResults==="isRestoring"&&(x.fetchStatus="idle")}let{error:E,errorUpdatedAt:w,status:S}=x;M=x.data;let y=!1;if(t.placeholderData!==void 0&&M===void 0&&S==="pending"){let X;l!=null&&l.isPlaceholderData&&t.placeholderData===(d==null?void 0:d.placeholderData)?(X=l.data,y=!0):X=typeof t.placeholderData=="function"?t.placeholderData((I=W(this,Co))==null?void 0:I.state.data,W(this,Co)):t.placeholderData,X!==void 0&&(S="success",M=tp(l==null?void 0:l.data,X,t),g=!0)}if(t.select&&M!==void 0&&!y)if(l&&M===(c==null?void 0:c.data)&&t.select===W(this,Zl))M=W(this,To);else try{He(this,Zl,t.select),M=t.select(M),M=tp(l==null?void 0:l.data,M,t),He(this,To,M),He(this,Rs,null)}catch(X){He(this,Rs,X)}W(this,Rs)&&(E=W(this,Rs),M=W(this,To),w=Date.now(),S="error");const N=x.fetchStatus==="fetching",L=S==="pending",C=S==="error",D=L&&N,P=M!==void 0,b={status:S,fetchStatus:x.fetchStatus,isPending:L,isSuccess:S==="success",isError:C,isInitialLoading:D,isLoading:D,data:M,dataUpdatedAt:x.dataUpdatedAt,error:E,errorUpdatedAt:w,failureCount:x.fetchFailureCount,failureReason:x.fetchFailureReason,errorUpdateCount:x.errorUpdateCount,isFetched:e.isFetched(),isFetchedAfterMount:x.dataUpdateCount>f.dataUpdateCount||x.errorUpdateCount>f.errorUpdateCount,isFetching:N,isRefetching:N&&!L,isLoadingError:C&&!P,isPaused:x.fetchStatus==="paused",isPlaceholderData:g,isRefetchError:C&&P,isStale:pm(e,t),refetch:this.refetch,promise:W(this,zr),isEnabled:yi(t.enabled,e)!==!1};if(this.options.experimental_prefetchInRender){const X=b.data!==void 0,O=b.status==="error"&&!X,K=Y=>{O?Y.reject(b.error):X&&Y.resolve(b.data)},se=()=>{const Y=He(this,zr,b.promise=np());K(Y)},fe=W(this,zr);switch(fe.status){case"pending":e.queryHash===r.queryHash&&K(fe);break;case"fulfilled":(O||b.data!==fe.value)&&se();break;case"rejected":(!O||b.error!==fe.reason)&&se();break}}return b}updateResult(){const e=W(this,Qn),t=this.createResult(W(this,Rt),this.options);if(He(this,va,W(this,Rt).state),He(this,bo,this.options),W(this,va).data!==void 0&&He(this,Co,W(this,Rt)),td(t,e))return;He(this,Qn,t);const r=()=>{if(!e)return!0;const{notifyOnChangeProps:a}=this.options,l=typeof a=="function"?a():a;if(l==="all"||!l&&!W(this,Ro).size)return!0;const c=new Set(l??W(this,Ro));return this.options.throwOnError&&c.add("error"),Object.keys(W(this,Qn)).some(d=>{const h=d;return W(this,Qn)[h]!==e[h]&&c.has(h)})};gt(this,Bt,w_).call(this,{listeners:r()})}onQueryUpdate(){this.updateResult(),this.hasListeners()&&gt(this,Bt,op).call(this)}},ui=new WeakMap,Rt=new WeakMap,Ql=new WeakMap,Qn=new WeakMap,va=new WeakMap,bo=new WeakMap,zr=new WeakMap,Rs=new WeakMap,Zl=new WeakMap,To=new WeakMap,Co=new WeakMap,_a=new WeakMap,ya=new WeakMap,As=new WeakMap,Ro=new WeakMap,Bt=new WeakSet,Ul=function(e){gt(this,Bt,up).call(this);let t=W(this,Rt).fetch(this.options,e);return e!=null&&e.throwOnError||(t=t.catch(Zn)),t},rp=function(){gt(this,Bt,lp).call(this);const e=Us(this.options.staleTime,W(this,Rt));if(Gl.isServer()||W(this,Qn).isStale||!Jf(e))return;const r=g_(W(this,Qn).dataUpdatedAt,e)+1;He(this,_a,ua.setTimeout(()=>{W(this,Qn).isStale||this.updateResult()},r))},sp=function(){return(typeof this.options.refetchInterval=="function"?this.options.refetchInterval(W(this,Rt)):this.options.refetchInterval)??!1},ap=function(e){gt(this,Bt,cp).call(this),He(this,As,e),!(Gl.isServer()||yi(this.options.enabled,W(this,Rt))===!1||!Jf(W(this,As))||W(this,As)===0)&&He(this,ya,ua.setInterval(()=>{(this.options.refetchIntervalInBackground||um.isFocused())&&gt(this,Bt,Ul).call(this)},W(this,As)))},op=function(){gt(this,Bt,rp).call(this),gt(this,Bt,ap).call(this,gt(this,Bt,sp).call(this))},lp=function(){W(this,_a)!==void 0&&(ua.clearTimeout(W(this,_a)),He(this,_a,void 0))},cp=function(){W(this,ya)!==void 0&&(ua.clearInterval(W(this,ya)),He(this,ya,void 0))},up=function(){const e=W(this,ui).getQueryCache().build(W(this,ui),this.options);if(e===W(this,Rt))return;const t=W(this,Rt);He(this,Rt,e),He(this,Ql,e.state),this.hasListeners()&&(t==null||t.removeObserver(this),e.addObserver(this))},w_=function(e){Mn.batch(()=>{e.listeners&&this.listeners.forEach(t=>{t(W(this,Qn))}),W(this,ui).getQueryCache().notify({query:W(this,Rt),type:"observerResultsUpdated"})})},u_);function XM(i,e){return yi(e.enabled,i)!==!1&&i.state.data===void 0&&!(i.state.status==="error"&&yi(e.retryOnMount,i)===!1)}function Px(i,e){return XM(i,e)||i.state.data!==void 0&&dp(i,e,e.refetchOnMount)}function dp(i,e,t){if(yi(e.enabled,i)!==!1&&Us(e.staleTime,i)!=="static"){const r=typeof t=="function"?t(i):t;return r==="always"||r!==!1&&pm(i,e)}return!1}function Nx(i,e,t,r){return(i!==e||yi(r.enabled,i)===!1)&&(!t.suspense||i.state.status!=="error")&&pm(i,t)}function pm(i,e){return yi(e.enabled,i)!==!1&&i.isStaleByTime(Us(e.staleTime,i))}function $M(i,e){return!td(i.getCurrentResult(),e)}var Jl,ur,jn,Sa,dr,Ms,d_,qM=(d_=class extends S_{constructor(e){super();st(this,dr);st(this,Jl);st(this,ur);st(this,jn);st(this,Sa);He(this,Jl,e.client),this.mutationId=e.mutationId,He(this,jn,e.mutationCache),He(this,ur,[]),this.state=e.state||b_(),this.setOptions(e.options),this.scheduleGc()}setOptions(e){this.options=e,this.updateGcTime(this.options.gcTime)}get meta(){return this.options.meta}addObserver(e){W(this,ur).includes(e)||(W(this,ur).push(e),this.clearGcTimeout(),W(this,jn).notify({type:"observerAdded",mutation:this,observer:e}))}removeObserver(e){He(this,ur,W(this,ur).filter(t=>t!==e)),this.scheduleGc(),W(this,jn).notify({type:"observerRemoved",mutation:this,observer:e})}optionalRemove(){W(this,ur).length||(this.state.status==="pending"?this.scheduleGc():W(this,jn).remove(this))}continue(){var e;return((e=W(this,Sa))==null?void 0:e.continue())??this.execute(this.state.variables)}async execute(e){var c,d,h,f,m,x,g,M,E,w,S,y,N,L,C,D,P,U;const t=()=>{gt(this,dr,Ms).call(this,{type:"continue"})},r={client:W(this,Jl),meta:this.options.meta,mutationKey:this.options.mutationKey};He(this,Sa,y_({fn:()=>this.options.mutationFn?this.options.mutationFn(e,r):Promise.reject(new Error("No mutationFn found")),onFail:(b,I)=>{gt(this,dr,Ms).call(this,{type:"failed",failureCount:b,error:I})},onPause:()=>{gt(this,dr,Ms).call(this,{type:"pause"})},onContinue:t,retry:this.options.retry??0,retryDelay:this.options.retryDelay,networkMode:this.options.networkMode,canRun:()=>W(this,jn).canRun(this)}));const a=this.state.status==="pending",l=!W(this,Sa).canStart();try{if(a)t();else{gt(this,dr,Ms).call(this,{type:"pending",variables:e,isPaused:l}),W(this,jn).config.onMutate&&await W(this,jn).config.onMutate(e,this,r);const I=await((d=(c=this.options).onMutate)==null?void 0:d.call(c,e,r));I!==this.state.context&&gt(this,dr,Ms).call(this,{type:"pending",context:I,variables:e,isPaused:l})}const b=await W(this,Sa).start();return await((f=(h=W(this,jn).config).onSuccess)==null?void 0:f.call(h,b,e,this.state.context,this,r)),await((x=(m=this.options).onSuccess)==null?void 0:x.call(m,b,e,this.state.context,r)),await((M=(g=W(this,jn).config).onSettled)==null?void 0:M.call(g,b,null,this.state.variables,this.state.context,this,r)),await((w=(E=this.options).onSettled)==null?void 0:w.call(E,b,null,e,this.state.context,r)),gt(this,dr,Ms).call(this,{type:"success",data:b}),b}catch(b){try{await((y=(S=W(this,jn).config).onError)==null?void 0:y.call(S,b,e,this.state.context,this,r))}catch(I){Promise.reject(I)}try{await((L=(N=this.options).onError)==null?void 0:L.call(N,b,e,this.state.context,r))}catch(I){Promise.reject(I)}try{await((D=(C=W(this,jn).config).onSettled)==null?void 0:D.call(C,void 0,b,this.state.variables,this.state.context,this,r))}catch(I){Promise.reject(I)}try{await((U=(P=this.options).onSettled)==null?void 0:U.call(P,void 0,b,e,this.state.context,r))}catch(I){Promise.reject(I)}throw gt(this,dr,Ms).call(this,{type:"error",error:b}),b}finally{W(this,jn).runNext(this)}}},Jl=new WeakMap,ur=new WeakMap,jn=new WeakMap,Sa=new WeakMap,dr=new WeakSet,Ms=function(e){const t=r=>{switch(e.type){case"failed":return{...r,failureCount:e.failureCount,failureReason:e.error};case"pause":return{...r,isPaused:!0};case"continue":return{...r,isPaused:!1};case"pending":return{...r,context:e.context,data:void 0,failureCount:0,failureReason:null,error:null,isPaused:e.isPaused,status:"pending",variables:e.variables,submittedAt:Date.now()};case"success":return{...r,data:e.data,failureCount:0,failureReason:null,error:null,status:"success",isPaused:!1};case"error":return{...r,data:void 0,error:e.error,failureCount:r.failureCount+1,failureReason:e.error,isPaused:!1,status:"error"}}};this.state=t(this.state),Mn.batch(()=>{W(this,ur).forEach(r=>{r.onMutationUpdate(e)}),W(this,jn).notify({mutation:this,type:"updated",action:e})})},d_);function b_(){return{context:void 0,data:void 0,error:null,failureCount:0,failureReason:null,isPaused:!1,status:"idle",variables:void 0,submittedAt:0}}var Br,qi,ec,h_,YM=(h_=class extends Oo{constructor(e={}){super();st(this,Br);st(this,qi);st(this,ec);this.config=e,He(this,Br,new Set),He(this,qi,new Map),He(this,ec,0)}build(e,t,r){const a=new qM({client:e,mutationCache:this,mutationId:++uu(this,ec)._,options:e.defaultMutationOptions(t),state:r});return this.add(a),a}add(e){W(this,Br).add(e);const t=hu(e);if(typeof t=="string"){const r=W(this,qi).get(t);r?r.push(e):W(this,qi).set(t,[e])}this.notify({type:"added",mutation:e})}remove(e){if(W(this,Br).delete(e)){const t=hu(e);if(typeof t=="string"){const r=W(this,qi).get(t);if(r)if(r.length>1){const a=r.indexOf(e);a!==-1&&r.splice(a,1)}else r[0]===e&&W(this,qi).delete(t)}}this.notify({type:"removed",mutation:e})}canRun(e){const t=hu(e);if(typeof t=="string"){const r=W(this,qi).get(t),a=r==null?void 0:r.find(l=>l.state.status==="pending");return!a||a===e}else return!0}runNext(e){var r;const t=hu(e);if(typeof t=="string"){const a=(r=W(this,qi).get(t))==null?void 0:r.find(l=>l!==e&&l.state.isPaused);return(a==null?void 0:a.continue())??Promise.resolve()}else return Promise.resolve()}clear(){Mn.batch(()=>{W(this,Br).forEach(e=>{this.notify({type:"removed",mutation:e})}),W(this,Br).clear(),W(this,qi).clear()})}getAll(){return Array.from(W(this,Br))}find(e){const t={exact:!0,...e};return this.getAll().find(r=>wx(t,r))}findAll(e={}){return this.getAll().filter(t=>wx(e,t))}notify(e){Mn.batch(()=>{this.listeners.forEach(t=>{t(e)})})}resumePausedMutations(){const e=this.getAll().filter(t=>t.state.isPaused);return Mn.batch(()=>Promise.all(e.map(t=>t.continue().catch(Zn))))}},Br=new WeakMap,qi=new WeakMap,ec=new WeakMap,h_);function hu(i){var e;return(e=i.options.scope)==null?void 0:e.id}var Hr,Ps,di,Vr,Xr,Gu,hp,f_,KM=(f_=class extends Oo{constructor(t,r){super();st(this,Xr);st(this,Hr);st(this,Ps);st(this,di);st(this,Vr);He(this,Hr,t),this.setOptions(r),this.bindMethods(),gt(this,Xr,Gu).call(this)}bindMethods(){this.mutate=this.mutate.bind(this),this.reset=this.reset.bind(this)}setOptions(t){var a;const r=this.options;this.options=W(this,Hr).defaultMutationOptions(t),td(this.options,r)||W(this,Hr).getMutationCache().notify({type:"observerOptionsUpdated",mutation:W(this,di),observer:this}),r!=null&&r.mutationKey&&this.options.mutationKey&&Ma(r.mutationKey)!==Ma(this.options.mutationKey)?this.reset():((a=W(this,di))==null?void 0:a.state.status)==="pending"&&W(this,di).setOptions(this.options)}onUnsubscribe(){var t;this.hasListeners()||(t=W(this,di))==null||t.removeObserver(this)}onMutationUpdate(t){gt(this,Xr,Gu).call(this),gt(this,Xr,hp).call(this,t)}getCurrentResult(){return W(this,Ps)}reset(){var t;(t=W(this,di))==null||t.removeObserver(this),He(this,di,void 0),gt(this,Xr,Gu).call(this),gt(this,Xr,hp).call(this)}mutate(t,r){var a;return He(this,Vr,r),(a=W(this,di))==null||a.removeObserver(this),He(this,di,W(this,Hr).getMutationCache().build(W(this,Hr),this.options)),W(this,di).addObserver(this),W(this,di).execute(t)}},Hr=new WeakMap,Ps=new WeakMap,di=new WeakMap,Vr=new WeakMap,Xr=new WeakSet,Gu=function(){var r;const t=((r=W(this,di))==null?void 0:r.state)??b_();He(this,Ps,{...t,isPending:t.status==="pending",isSuccess:t.status==="success",isError:t.status==="error",isIdle:t.status==="idle",mutate:this.mutate,reset:this.reset})},hp=function(t){Mn.batch(()=>{var r,a,l,c,d,h,f,m;if(W(this,Vr)&&this.hasListeners()){const x=W(this,Ps).variables,g=W(this,Ps).context,M={client:W(this,Hr),meta:this.options.meta,mutationKey:this.options.mutationKey};if((t==null?void 0:t.type)==="success"){try{(a=(r=W(this,Vr)).onSuccess)==null||a.call(r,t.data,x,g,M)}catch(E){Promise.reject(E)}try{(c=(l=W(this,Vr)).onSettled)==null||c.call(l,t.data,null,x,g,M)}catch(E){Promise.reject(E)}}else if((t==null?void 0:t.type)==="error"){try{(h=(d=W(this,Vr)).onError)==null||h.call(d,t.error,x,g,M)}catch(E){Promise.reject(E)}try{(m=(f=W(this,Vr)).onSettled)==null||m.call(f,void 0,t.error,x,g,M)}catch(E){Promise.reject(E)}}}this.listeners.forEach(x=>{x(W(this,Ps))})})},f_),hr,p_,QM=(p_=class extends Oo{constructor(e={}){super();st(this,hr);this.config=e,He(this,hr,new Map)}build(e,t,r){const a=t.queryKey,l=t.queryHash??dm(a,t);let c=this.get(l);return c||(c=new jM({client:e,queryKey:a,queryHash:l,options:e.defaultQueryOptions(t),state:r,defaultOptions:e.getQueryDefaults(a)}),this.add(c)),c}add(e){W(this,hr).has(e.queryHash)||(W(this,hr).set(e.queryHash,e),this.notify({type:"added",query:e}))}remove(e){const t=W(this,hr).get(e.queryHash);t&&(e.destroy(),t===e&&W(this,hr).delete(e.queryHash),this.notify({type:"removed",query:e}))}clear(){Mn.batch(()=>{this.getAll().forEach(e=>{this.remove(e)})})}get(e){return W(this,hr).get(e)}getAll(){return[...W(this,hr).values()]}find(e){const t={exact:!0,...e};return this.getAll().find(r=>Ex(t,r))}findAll(e={}){const t=this.getAll();return Object.keys(e).length>0?t.filter(r=>Ex(e,r)):t}notify(e){Mn.batch(()=>{this.listeners.forEach(t=>{t(e)})})}onFocus(){Mn.batch(()=>{this.getAll().forEach(e=>{e.onFocus()})})}onOnline(){Mn.batch(()=>{this.getAll().forEach(e=>{e.onOnline()})})}},hr=new WeakMap,p_),hn,Ns,Ls,Ao,Po,Ds,No,Lo,m_,ZM=(m_=class{constructor(i={}){st(this,hn);st(this,Ns);st(this,Ls);st(this,Ao);st(this,Po);st(this,Ds);st(this,No);st(this,Lo);He(this,hn,i.queryCache||new QM),He(this,Ns,i.mutationCache||new YM),He(this,Ls,i.defaultOptions||{}),He(this,Ao,new Map),He(this,Po,new Map),He(this,Ds,0)}mount(){uu(this,Ds)._++,W(this,Ds)===1&&(He(this,No,um.subscribe(async i=>{i&&(await this.resumePausedMutations(),W(this,hn).onFocus())})),He(this,Lo,nd.subscribe(async i=>{i&&(await this.resumePausedMutations(),W(this,hn).onOnline())})))}unmount(){var i,e;uu(this,Ds)._--,W(this,Ds)===0&&((i=W(this,No))==null||i.call(this),He(this,No,void 0),(e=W(this,Lo))==null||e.call(this),He(this,Lo,void 0))}isFetching(i){return W(this,hn).findAll({...i,fetchStatus:"fetching"}).length}isMutating(i){return W(this,Ns).findAll({...i,status:"pending"}).length}getQueryData(i){var t;const e=this.defaultQueryOptions({queryKey:i});return(t=W(this,hn).get(e.queryHash))==null?void 0:t.state.data}ensureQueryData(i){const e=this.defaultQueryOptions(i),t=W(this,hn).build(this,e),r=t.state.data;return r===void 0?this.fetchQuery(i):(i.revalidateIfStale&&t.isStaleByTime(Us(e.staleTime,t))&&this.prefetchQuery(e),Promise.resolve(r))}getQueriesData(i){return W(this,hn).findAll(i).map(({queryKey:e,state:t})=>{const r=t.data;return[e,r]})}setQueryData(i,e,t){const r=this.defaultQueryOptions({queryKey:i}),a=W(this,hn).get(r.queryHash),l=a==null?void 0:a.state.data,c=LM(e,l);if(c!==void 0)return W(this,hn).build(this,r).setData(c,{...t,manual:!0})}setQueriesData(i,e,t){return Mn.batch(()=>W(this,hn).findAll(i).map(({queryKey:r})=>[r,this.setQueryData(r,e,t)]))}getQueryState(i){var t;const e=this.defaultQueryOptions({queryKey:i});return(t=W(this,hn).get(e.queryHash))==null?void 0:t.state}removeQueries(i){const e=W(this,hn);Mn.batch(()=>{e.findAll(i).forEach(t=>{e.remove(t)})})}resetQueries(i,e){const t=W(this,hn);return Mn.batch(()=>(t.findAll(i).forEach(r=>{r.reset()}),this.refetchQueries({type:"active",...i},e)))}cancelQueries(i,e={}){const t={revert:!0,...e},r=Mn.batch(()=>W(this,hn).findAll(i).map(a=>a.cancel(t)));return Promise.all(r).then(Zn).catch(Zn)}invalidateQueries(i,e={}){return Mn.batch(()=>(W(this,hn).findAll(i).forEach(t=>{t.invalidate()}),(i==null?void 0:i.refetchType)==="none"?Promise.resolve():this.refetchQueries({...i,type:(i==null?void 0:i.refetchType)??(i==null?void 0:i.type)??"active"},e)))}refetchQueries(i,e={}){const t={...e,cancelRefetch:e.cancelRefetch??!0},r=Mn.batch(()=>W(this,hn).findAll(i).filter(a=>!a.isDisabled()&&!a.isStatic()).map(a=>{let l=a.fetch(void 0,t);return t.throwOnError||(l=l.catch(Zn)),a.state.fetchStatus==="paused"?Promise.resolve():l}));return Promise.all(r).then(Zn)}fetchQuery(i){const e=this.defaultQueryOptions(i);e.retry===void 0&&(e.retry=!1);const t=W(this,hn).build(this,e);return t.isStaleByTime(Us(e.staleTime,t))?t.fetch(e):Promise.resolve(t.state.data)}prefetchQuery(i){return this.fetchQuery(i).then(Zn).catch(Zn)}fetchInfiniteQuery(i){return i._type="infinite",this.fetchQuery(i)}prefetchInfiniteQuery(i){return this.fetchInfiniteQuery(i).then(Zn).catch(Zn)}ensureInfiniteQueryData(i){return i._type="infinite",this.ensureQueryData(i)}resumePausedMutations(){return nd.isOnline()?W(this,Ns).resumePausedMutations():Promise.resolve()}getQueryCache(){return W(this,hn)}getMutationCache(){return W(this,Ns)}getDefaultOptions(){return W(this,Ls)}setDefaultOptions(i){He(this,Ls,i)}setQueryDefaults(i,e){W(this,Ao).set(Ma(i),{queryKey:i,defaultOptions:e})}getQueryDefaults(i){const e=[...W(this,Ao).values()],t={};return e.forEach(r=>{Vl(i,r.queryKey)&&Object.assign(t,r.defaultOptions)}),t}setMutationDefaults(i,e){W(this,Po).set(Ma(i),{mutationKey:i,defaultOptions:e})}getMutationDefaults(i){const e=[...W(this,Po).values()],t={};return e.forEach(r=>{Vl(i,r.mutationKey)&&Object.assign(t,r.defaultOptions)}),t}defaultQueryOptions(i){if(i._defaulted)return i;const e={...W(this,Ls).queries,...this.getQueryDefaults(i.queryKey),...i,_defaulted:!0};return e.queryHash||(e.queryHash=dm(e.queryKey,e)),e.refetchOnReconnect===void 0&&(e.refetchOnReconnect=e.networkMode!=="always"),e.throwOnError===void 0&&(e.throwOnError=!!e.suspense),!e.networkMode&&e.persister&&(e.networkMode="offlineFirst"),e.queryFn===hm&&(e.enabled=!1),e}defaultMutationOptions(i){return i!=null&&i._defaulted?i:{...W(this,Ls).mutations,...(i==null?void 0:i.mutationKey)&&this.getMutationDefaults(i.mutationKey),...i,_defaulted:!0}}clear(){W(this,hn).clear(),W(this,Ns).clear()}},hn=new WeakMap,Ns=new WeakMap,Ls=new WeakMap,Ao=new WeakMap,Po=new WeakMap,Ds=new WeakMap,No=new WeakMap,Lo=new WeakMap,m_),T_=G.createContext(void 0),pd=i=>{const e=G.useContext(T_);if(!e)throw new Error("No QueryClient set, use QueryClientProvider to set one");return e},JM=({client:i,children:e})=>(G.useEffect(()=>(i.mount(),()=>{i.unmount()}),[i]),v.jsx(T_.Provider,{value:i,children:e})),C_=G.createContext(!1),eE=()=>G.useContext(C_);C_.Provider;function tE(){let i=!1;return{clearReset:()=>{i=!1},reset:()=>{i=!0},isReset:()=>i}}var nE=G.createContext(tE()),iE=()=>G.useContext(nE),rE=(i,e,t)=>{const r=t!=null&&t.state.error&&typeof i.throwOnError=="function"?fm(i.throwOnError,[t.state.error,t]):i.throwOnError;(i.suspense||i.experimental_prefetchInRender||r)&&(e.isReset()||(i.retryOnMount=!1))},sE=i=>{G.useEffect(()=>{i.clearReset()},[i])},aE=({result:i,errorResetBoundary:e,throwOnError:t,query:r,suspense:a})=>i.isError&&!e.isReset()&&!i.isFetching&&r&&(a&&i.data===void 0||fm(t,[i.error,r])),oE=i=>{if(i.suspense){const t=a=>a==="static"?a:Math.max(a??1e3,1e3),r=i.staleTime;i.staleTime=typeof r=="function"?(...a)=>t(r(...a)):t(r),typeof i.gcTime=="number"&&(i.gcTime=Math.max(i.gcTime,1e3))}},lE=(i,e)=>i.isLoading&&i.isFetching&&!e,cE=(i,e)=>(i==null?void 0:i.suspense)&&e.isPending,Lx=(i,e,t)=>e.fetchOptimistic(i).catch(()=>{t.clearReset()});function uE(i,e,t){var M,E,w,S;const r=eE(),a=iE(),l=pd(),c=l.defaultQueryOptions(i);(E=(M=l.getDefaultOptions().queries)==null?void 0:M._experimental_beforeQuery)==null||E.call(M,c);const d=l.getQueryCache().get(c.queryHash),h=i.subscribed!==!1;c._optimisticResults=r?"isRestoring":h?"optimistic":void 0,oE(c),rE(c,a,d),sE(a);const f=!l.getQueryCache().get(c.queryHash),[m]=G.useState(()=>new e(l,c)),x=m.getOptimisticResult(c),g=!r&&h;if(G.useSyncExternalStore(G.useCallback(y=>{const N=g?m.subscribe(Mn.batchCalls(y)):Zn;return m.updateResult(),N},[m,g]),()=>m.getCurrentResult(),()=>m.getCurrentResult()),G.useEffect(()=>{m.setOptions(c)},[c,m]),cE(c,x))throw Lx(c,m,a);if(aE({result:x,errorResetBoundary:a,throwOnError:c.throwOnError,query:d,suspense:c.suspense}))throw x.error;if((S=(w=l.getDefaultOptions().queries)==null?void 0:w._experimental_afterQuery)==null||S.call(w,c,x),c.experimental_prefetchInRender&&!Gl.isServer()&&lE(x,r)){const y=f?Lx(c,m,a):d==null?void 0:d.promise;y==null||y.catch(Zn).finally(()=>{m.updateResult()})}return c.notifyOnChangeProps?x:m.trackResult(x)}function Ea(i,e){return uE(i,WM)}function cr(i,e){const t=pd(),[r]=G.useState(()=>new KM(t,i));G.useEffect(()=>{r.setOptions(i)},[r,i]);const a=G.useSyncExternalStore(G.useCallback(c=>r.subscribe(Mn.batchCalls(c)),[r]),()=>r.getCurrentResult(),()=>r.getCurrentResult()),l=G.useCallback((c,d)=>{r.mutate(c,d).catch(Zn)},[r]);if(a.error&&fm(r.options.throwOnError,[a.error]))throw a.error;return{...a,mutate:l,mutateAsync:a.mutate}}/**
 * react-router v7.18.0
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */var mm=/^(?:[a-z][a-z0-9+.-]*:|[\\/]{2})/i,R_=/^[\\/]{2}/;function dE(i,e){return e+i.replace(/\\/g,"/")}var Dx="popstate";function Ix(i){return typeof i=="object"&&i!=null&&"pathname"in i&&"search"in i&&"hash"in i&&"state"in i&&"key"in i}function hE(i={}){function e(r,a){var f;let l=(f=a.state)==null?void 0:f.masked,{pathname:c,search:d,hash:h}=l||r.location;return fp("",{pathname:c,search:d,hash:h},a.state&&a.state.usr||null,a.state&&a.state.key||"default",l?{pathname:r.location.pathname,search:r.location.search,hash:r.location.hash}:void 0)}function t(r,a){return typeof a=="string"?a:jl(a)}return pE(e,t,null,i)}function sn(i,e){if(i===!1||i===null||typeof i>"u")throw new Error(e)}function Ui(i,e){if(!i){typeof console<"u"&&console.warn(e);try{throw new Error(e)}catch{}}}function fE(){return Math.random().toString(36).substring(2,10)}function Ux(i,e){return{usr:i.state,key:i.key,idx:e,masked:i.mask?{pathname:i.pathname,search:i.search,hash:i.hash}:void 0}}function fp(i,e,t=null,r,a){return{pathname:typeof i=="string"?i:i.pathname,search:"",hash:"",...typeof e=="string"?ko(e):e,state:t,key:e&&e.key||r||fE(),mask:a}}function jl({pathname:i="/",search:e="",hash:t=""}){return e&&e!=="?"&&(i+=e.charAt(0)==="?"?e:"?"+e),t&&t!=="#"&&(i+=t.charAt(0)==="#"?t:"#"+t),i}function ko(i){let e={};if(i){let t=i.indexOf("#");t>=0&&(e.hash=i.substring(t),i=i.substring(0,t));let r=i.indexOf("?");r>=0&&(e.search=i.substring(r),i=i.substring(0,r)),i&&(e.pathname=i)}return e}function pE(i,e,t,r={}){let{window:a=document.defaultView,v5Compat:l=!1}=r,c=a.history,d="POP",h=null,f=m();f==null&&(f=0,c.replaceState({...c.state,idx:f},""));function m(){return(c.state||{idx:null}).idx}function x(){d="POP";let S=m(),y=S==null?null:S-f;f=S,h&&h({action:d,location:w.location,delta:y})}function g(S,y){d="PUSH";let N=Ix(S)?S:fp(w.location,S,y);f=m()+1;let L=Ux(N,f),C=w.createHref(N.mask||N);try{c.pushState(L,"",C)}catch(D){if(D instanceof DOMException&&D.name==="DataCloneError")throw D;a.location.assign(C)}l&&h&&h({action:d,location:w.location,delta:1})}function M(S,y){d="REPLACE";let N=Ix(S)?S:fp(w.location,S,y);f=m();let L=Ux(N,f),C=w.createHref(N.mask||N);c.replaceState(L,"",C),l&&h&&h({action:d,location:w.location,delta:0})}function E(S){return mE(a,S)}let w={get action(){return d},get location(){return i(a,c)},listen(S){if(h)throw new Error("A history only accepts one active listener");return a.addEventListener(Dx,x),h=S,()=>{a.removeEventListener(Dx,x),h=null}},createHref(S){return e(a,S)},createURL:E,encodeLocation(S){let y=E(S);return{pathname:y.pathname,search:y.search,hash:y.hash}},push:g,replace:M,go(S){return c.go(S)}};return w}function mE(i,e,t=!1){let r="http://localhost";i&&(r=i.location.origin!=="null"?i.location.origin:i.location.href),sn(r,"No window.location.(origin|href) available to create URL");let a=typeof e=="string"?e:jl(e);return a=a.replace(/ $/,"%20"),!t&&R_.test(a)&&(a=r+a),new URL(a,r)}function A_(i,e,t="/"){return gE(i,e,t,!1)}function gE(i,e,t,r,a){let l=typeof e=="string"?ko(e):e,c=$r(l.pathname||"/",t);if(c==null)return null;let d=xE(i),h=null,f=RE(c);for(let m=0;h==null&&m<d.length;++m)h=CE(d[m],f,r);return h}function xE(i){let e=P_(i);return vE(e),e}function P_(i,e=[],t=[],r="",a=!1){let l=(c,d,h=a,f)=>{let m={relativePath:f===void 0?c.path||"":f,caseSensitive:c.caseSensitive===!0,childrenIndex:d,route:c};if(m.relativePath.startsWith("/")){if(!m.relativePath.startsWith(r)&&h)return;sn(m.relativePath.startsWith(r),`Absolute route path "${m.relativePath}" nested under path "${r}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`),m.relativePath=m.relativePath.slice(r.length)}let x=Qi([r,m.relativePath]),g=t.concat(m);c.children&&c.children.length>0&&(sn(c.index!==!0,`Index routes must not have child routes. Please remove all child routes from route path "${x}".`),P_(c.children,e,g,x,h)),!(c.path==null&&!c.index)&&e.push({path:x,score:bE(x,c.index),routesMeta:g.map((M,E)=>{let[w,S]=D_(M.relativePath,M.caseSensitive,E===g.length-1);return{...M,matcher:w,compiledParams:S}})})};return i.forEach((c,d)=>{var h;if(c.path===""||!((h=c.path)!=null&&h.includes("?")))l(c,d);else for(let f of N_(c.path))l(c,d,!0,f)}),e}function N_(i){let e=i.split("/");if(e.length===0)return[];let[t,...r]=e,a=t.endsWith("?"),l=t.replace(/\?$/,"");if(r.length===0)return a?[l,""]:[l];let c=N_(r.join("/")),d=[];return d.push(...c.map(h=>h===""?l:[l,h].join("/"))),a&&d.push(...c),d.map(h=>i.startsWith("/")&&h===""?"/":h)}function vE(i){i.sort((e,t)=>e.score!==t.score?t.score-e.score:TE(e.routesMeta.map(r=>r.childrenIndex),t.routesMeta.map(r=>r.childrenIndex)))}var _E=/^:[\w-]+$/,yE=3,SE=2,ME=1,EE=10,wE=-2,Fx=i=>i==="*";function bE(i,e){let t=i.split("/"),r=t.length;return t.some(Fx)&&(r+=wE),e&&(r+=SE),t.filter(a=>!Fx(a)).reduce((a,l)=>a+(_E.test(l)?yE:l===""?ME:EE),r)}function TE(i,e){return i.length===e.length&&i.slice(0,-1).every((r,a)=>r===e[a])?i[i.length-1]-e[e.length-1]:0}function CE(i,e,t=!1){let{routesMeta:r}=i,a={},l="/",c=[];for(let d=0;d<r.length;++d){let h=r[d],f=d===r.length-1,m=l==="/"?e:e.slice(l.length)||"/",x={path:h.relativePath,caseSensitive:h.caseSensitive,end:f},g=h.matcher&&h.compiledParams?L_(x,m,h.matcher,h.compiledParams):id(x,m),M=h.route;if(!g&&f&&t&&!r[r.length-1].route.index&&(g=id({path:h.relativePath,caseSensitive:h.caseSensitive,end:!1},m)),!g)return null;Object.assign(a,g.params),c.push({params:a,pathname:Qi([l,g.pathname]),pathnameBase:NE(Qi([l,g.pathnameBase])),route:M}),g.pathnameBase!=="/"&&(l=Qi([l,g.pathnameBase]))}return c}function id(i,e){typeof i=="string"&&(i={path:i,caseSensitive:!1,end:!0});let[t,r]=D_(i.path,i.caseSensitive,i.end);return L_(i,e,t,r)}function L_(i,e,t,r){let a=e.match(t);if(!a)return null;let l=a[0],c=l.replace(/(.)\/+$/,"$1"),d=a.slice(1);return{params:r.reduce((f,{paramName:m,isOptional:x},g)=>{if(m==="*"){let E=d[g]||"";c=l.slice(0,l.length-E.length).replace(/(.)\/+$/,"$1")}const M=d[g];return x&&!M?f[m]=void 0:f[m]=(M||"").replace(/%2F/g,"/"),f},{}),pathname:l,pathnameBase:c,pattern:i}}function D_(i,e=!1,t=!0){Ui(i==="*"||!i.endsWith("*")||i.endsWith("/*"),`Route path "${i}" will be treated as if it were "${i.replace(/\*$/,"/*")}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${i.replace(/\*$/,"/*")}".`);let r=[],a="^"+i.replace(/\/*\*?$/,"").replace(/^\/*/,"/").replace(/[\\.*+^${}|()[\]]/g,"\\$&").replace(/\/:([\w-]+)(\?)?/g,(c,d,h,f,m)=>{if(r.push({paramName:d,isOptional:h!=null}),h){let x=m.charAt(f+c.length);return x&&x!=="/"?"/([^\\/]*)":"(?:/([^\\/]*))?"}return"/([^\\/]+)"}).replace(/\/([\w-]+)\?(\/|$)/g,"(/$1)?$2");return i.endsWith("*")?(r.push({paramName:"*"}),a+=i==="*"||i==="/*"?"(.*)$":"(?:\\/(.+)|\\/*)$"):t?a+="\\/*$":i!==""&&i!=="/"&&(a+="(?:(?=\\/|$))"),[new RegExp(a,e?void 0:"i"),r]}function RE(i){try{return i.split("/").map(e=>decodeURIComponent(e).replace(/\//g,"%2F")).join("/")}catch(e){return Ui(!1,`The URL path "${i}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${e}).`),i}}function $r(i,e){if(e==="/")return i;if(!i.toLowerCase().startsWith(e.toLowerCase()))return null;let t=e.endsWith("/")?e.length-1:e.length,r=i.charAt(t);return r&&r!=="/"?null:i.slice(t)||"/"}function AE(i,e="/"){let{pathname:t,search:r="",hash:a=""}=typeof i=="string"?ko(i):i,l;return t?(t=I_(t),t.startsWith("/")?l=Ox(t.substring(1),"/"):l=Ox(t,e)):l=e,{pathname:l,search:LE(r),hash:DE(a)}}function Ox(i,e){let t=rd(e).split("/");return i.split("/").forEach(a=>{a===".."?t.length>1&&t.pop():a!=="."&&t.push(a)}),t.length>1?t.join("/"):"/"}function lf(i,e,t,r){return`Cannot include a '${i}' character in a manually specified \`to.${e}\` field [${JSON.stringify(r)}].  Please separate it out to the \`to.${t}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`}function PE(i){return i.filter((e,t)=>t===0||e.route.path&&e.route.path.length>0)}function gm(i){let e=PE(i);return e.map((t,r)=>r===e.length-1?t.pathname:t.pathnameBase)}function md(i,e,t,r=!1){let a;typeof i=="string"?a=ko(i):(a={...i},sn(!a.pathname||!a.pathname.includes("?"),lf("?","pathname","search",a)),sn(!a.pathname||!a.pathname.includes("#"),lf("#","pathname","hash",a)),sn(!a.search||!a.search.includes("#"),lf("#","search","hash",a)));let l=i===""||a.pathname==="",c=l?"/":a.pathname,d;if(c==null)d=t;else{let x=e.length-1;if(!r&&c.startsWith("..")){let g=c.split("/");for(;g[0]==="..";)g.shift(),x-=1;a.pathname=g.join("/")}d=x>=0?e[x]:"/"}let h=AE(a,d),f=c&&c!=="/"&&c.endsWith("/"),m=(l||c===".")&&t.endsWith("/");return!h.pathname.endsWith("/")&&(f||m)&&(h.pathname+="/"),h}var I_=i=>i.replace(/[\\/]{2,}/g,"/"),Qi=i=>I_(i.join("/")),rd=i=>i.replace(/\/+$/,""),NE=i=>rd(i).replace(/^\/*/,"/"),LE=i=>!i||i==="?"?"":i.startsWith("?")?i:"?"+i,DE=i=>!i||i==="#"?"":i.startsWith("#")?i:"#"+i,IE=class{constructor(i,e,t,r=!1){this.status=i,this.statusText=e||"",this.internal=r,t instanceof Error?(this.data=t.toString(),this.error=t):this.data=t}};function UE(i){return i!=null&&typeof i.status=="number"&&typeof i.statusText=="string"&&typeof i.internal=="boolean"&&"data"in i}function FE(i){let e=i.map(t=>t.route.path).filter(Boolean);return Qi(e)||"/"}var U_=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";function F_(i,e){let t=i;if(typeof t!="string"||!mm.test(t))return{absoluteURL:void 0,isExternal:!1,to:t};let r=t,a=!1;if(U_)try{let l=new URL(window.location.href),c=R_.test(t)?new URL(dE(t,l.protocol)):new URL(t),d=$r(c.pathname,e);c.origin===l.origin&&d!=null?t=d+c.search+c.hash:a=!0}catch{Ui(!1,`<Link to="${t}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`)}return{absoluteURL:r,isExternal:a,to:t}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");var O_=["POST","PUT","PATCH","DELETE"];new Set(O_);var OE=["GET",...O_];new Set(OE);var kE=["about:","blob:","chrome:","chrome-untrusted:","content:","data:","devtools:","file:","filesystem:","javascript:"];function zE(i){try{return kE.includes(new URL(i).protocol)}catch{return!1}}var zo=G.createContext(null);zo.displayName="DataRouter";var gd=G.createContext(null);gd.displayName="DataRouterState";var k_=G.createContext(!1);function BE(){return G.useContext(k_)}var z_=G.createContext({isTransitioning:!1});z_.displayName="ViewTransition";var HE=G.createContext(new Map);HE.displayName="Fetchers";var VE=G.createContext(null);VE.displayName="Await";var Ei=G.createContext(null);Ei.displayName="Navigation";var tc=G.createContext(null);tc.displayName="Location";var Ji=G.createContext({outlet:null,matches:[],isDataRoute:!1});Ji.displayName="Route";var xm=G.createContext(null);xm.displayName="RouteError";var B_="REACT_ROUTER_ERROR",GE="REDIRECT",jE="ROUTE_ERROR_RESPONSE";function WE(i){if(i.startsWith(`${B_}:${GE}:{`))try{let e=JSON.parse(i.slice(28));if(typeof e=="object"&&e&&typeof e.status=="number"&&typeof e.statusText=="string"&&typeof e.location=="string"&&typeof e.reloadDocument=="boolean"&&typeof e.replace=="boolean")return e}catch{}}function XE(i){if(i.startsWith(`${B_}:${jE}:{`))try{let e=JSON.parse(i.slice(40));if(typeof e=="object"&&e&&typeof e.status=="number"&&typeof e.statusText=="string")return new IE(e.status,e.statusText,e.data)}catch{}}function $E(i,{relative:e}={}){sn(Bo(),"useHref() may be used only in the context of a <Router> component.");let{basename:t,navigator:r}=G.useContext(Ei),{hash:a,pathname:l,search:c}=nc(i,{relative:e}),d=l;return t!=="/"&&(d=l==="/"?t:Qi([t,l])),r.createHref({pathname:d,search:c,hash:a})}function Bo(){return G.useContext(tc)!=null}function er(){return sn(Bo(),"useLocation() may be used only in the context of a <Router> component."),G.useContext(tc).location}var H_="You should call navigate() in a React.useEffect(), not when your component is first rendered.";function V_(i){G.useContext(Ei).static||G.useLayoutEffect(i)}function vm(){let{isDataRoute:i}=G.useContext(Ji);return i?l1():qE()}function qE(){sn(Bo(),"useNavigate() may be used only in the context of a <Router> component.");let i=G.useContext(zo),{basename:e,navigator:t}=G.useContext(Ei),{matches:r}=G.useContext(Ji),{pathname:a}=er(),l=JSON.stringify(gm(r)),c=G.useRef(!1);return V_(()=>{c.current=!0}),G.useCallback((h,f={})=>{if(Ui(c.current,H_),!c.current)return;if(typeof h=="number"){t.go(h);return}let m=md(h,JSON.parse(l),a,f.relative==="path");i==null&&e!=="/"&&(m.pathname=m.pathname==="/"?e:Qi([e,m.pathname])),(f.replace?t.replace:t.push)(m,f.state,f)},[e,t,l,a,i])}var YE=G.createContext(null);function KE(i){let e=G.useContext(Ji).outlet;return G.useMemo(()=>e&&G.createElement(YE.Provider,{value:i},e),[e,i])}function nc(i,{relative:e}={}){let{matches:t}=G.useContext(Ji),{pathname:r}=er(),a=JSON.stringify(gm(t));return G.useMemo(()=>md(i,JSON.parse(a),r,e==="path"),[i,a,r,e])}function QE(i,e){return G_(i,e)}function G_(i,e,t){var S;sn(Bo(),"useRoutes() may be used only in the context of a <Router> component.");let{navigator:r}=G.useContext(Ei),{matches:a}=G.useContext(Ji),l=a[a.length-1],c=l?l.params:{},d=l?l.pathname:"/",h=l?l.pathnameBase:"/",f=l&&l.route;{let y=f&&f.path||"";W_(d,!f||y.endsWith("*")||y.endsWith("*?"),`You rendered descendant <Routes> (or called \`useRoutes()\`) at "${d}" (under <Route path="${y}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${y}"> to <Route path="${y==="/"?"*":`${y}/*`}">.`)}let m=er(),x;if(e){let y=typeof e=="string"?ko(e):e;sn(h==="/"||((S=y.pathname)==null?void 0:S.startsWith(h)),`When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${h}" but pathname "${y.pathname}" was given in the \`location\` prop.`),x=y}else x=m;let g=x.pathname||"/",M=g;if(h!=="/"){let y=h.replace(/^\//,"").split("/");M="/"+g.replace(/^\//,"").split("/").slice(y.length).join("/")}let E=t&&t.state.matches.length?t.state.matches.map(y=>Object.assign(y,{route:t.manifest[y.route.id]||y.route})):A_(i,{pathname:M});Ui(f||E!=null,`No routes matched location "${x.pathname}${x.search}${x.hash}" `),Ui(E==null||E[E.length-1].route.element!==void 0||E[E.length-1].route.Component!==void 0||E[E.length-1].route.lazy!==void 0,`Matched leaf route at location "${x.pathname}${x.search}${x.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`);let w=n1(E&&E.map(y=>Object.assign({},y,{params:Object.assign({},c,y.params),pathname:Qi([h,r.encodeLocation?r.encodeLocation(y.pathname.replace(/%/g,"%25").replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:y.pathname]),pathnameBase:y.pathnameBase==="/"?h:Qi([h,r.encodeLocation?r.encodeLocation(y.pathnameBase.replace(/%/g,"%25").replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:y.pathnameBase])})),a,t);return e&&w?G.createElement(tc.Provider,{value:{location:{pathname:"/",search:"",hash:"",state:null,key:"default",mask:void 0,...x},navigationType:"POP"}},w):w}function ZE(){let i=o1(),e=UE(i)?`${i.status} ${i.statusText}`:i instanceof Error?i.message:JSON.stringify(i),t=i instanceof Error?i.stack:null,r="rgba(200,200,200, 0.5)",a={padding:"0.5rem",backgroundColor:r},l={padding:"2px 4px",backgroundColor:r},c=null;return console.error("Error handled by React Router default ErrorBoundary:",i),c=G.createElement(G.Fragment,null,G.createElement("p",null,"💿 Hey developer 👋"),G.createElement("p",null,"You can provide a way better UX than this when your app throws errors by providing your own ",G.createElement("code",{style:l},"ErrorBoundary")," or"," ",G.createElement("code",{style:l},"errorElement")," prop on your route.")),G.createElement(G.Fragment,null,G.createElement("h2",null,"Unexpected Application Error!"),G.createElement("h3",{style:{fontStyle:"italic"}},e),t?G.createElement("pre",{style:a},t):null,c)}var JE=G.createElement(ZE,null),j_=class extends G.Component{constructor(i){super(i),this.state={location:i.location,revalidation:i.revalidation,error:i.error}}static getDerivedStateFromError(i){return{error:i}}static getDerivedStateFromProps(i,e){return e.location!==i.location||e.revalidation!=="idle"&&i.revalidation==="idle"?{error:i.error,location:i.location,revalidation:i.revalidation}:{error:i.error!==void 0?i.error:e.error,location:e.location,revalidation:i.revalidation||e.revalidation}}componentDidCatch(i,e){this.props.onError?this.props.onError(i,e):console.error("React Router caught the following error during render",i)}render(){let i=this.state.error;if(this.context&&typeof i=="object"&&i&&"digest"in i&&typeof i.digest=="string"){const t=XE(i.digest);t&&(i=t)}let e=i!==void 0?G.createElement(Ji.Provider,{value:this.props.routeContext},G.createElement(xm.Provider,{value:i,children:this.props.component})):this.props.children;return this.context?G.createElement(e1,{error:i},e):e}};j_.contextType=k_;var cf=new WeakMap;function e1({children:i,error:e}){let{basename:t}=G.useContext(Ei);if(typeof e=="object"&&e&&"digest"in e&&typeof e.digest=="string"){let r=WE(e.digest);if(r){let a=cf.get(e);if(a)throw a;let l=F_(r.location,t),c=l.absoluteURL||l.to;if(zE(c))throw new Error("Invalid redirect location");if(U_&&!cf.get(e))if(l.isExternal||r.reloadDocument)window.location.href=c;else{const d=Promise.resolve().then(()=>window.__reactRouterDataRouter.navigate(l.to,{replace:r.replace}));throw cf.set(e,d),d}return G.createElement("meta",{httpEquiv:"refresh",content:`0;url=${c}`})}}return i}function t1({routeContext:i,match:e,children:t}){let r=G.useContext(zo);return r&&r.static&&r.staticContext&&(e.route.errorElement||e.route.ErrorBoundary)&&(r.staticContext._deepestRenderedBoundaryId=e.route.id),G.createElement(Ji.Provider,{value:i},t)}function n1(i,e=[],t){let r=t==null?void 0:t.state;if(i==null){if(!r)return null;if(r.errors)i=r.matches;else if(e.length===0&&!r.initialized&&r.matches.length>0)i=r.matches;else return null}let a=i,l=r==null?void 0:r.errors;if(l!=null){let m=a.findIndex(x=>x.route.id&&(l==null?void 0:l[x.route.id])!==void 0);sn(m>=0,`Could not find a matching route for errors on route IDs: ${Object.keys(l).join(",")}`),a=a.slice(0,Math.min(a.length,m+1))}let c=!1,d=-1;if(t&&r){c=r.renderFallback;for(let m=0;m<a.length;m++){let x=a[m];if((x.route.HydrateFallback||x.route.hydrateFallbackElement)&&(d=m),x.route.id){let{loaderData:g,errors:M}=r,E=x.route.loader&&!g.hasOwnProperty(x.route.id)&&(!M||M[x.route.id]===void 0);if(x.route.lazy||E){t.isStatic&&(c=!0),d>=0?a=a.slice(0,d+1):a=[a[0]];break}}}}let h=t==null?void 0:t.onError,f=r&&h?(m,x)=>{var g,M;h(m,{location:r.location,params:((M=(g=r.matches)==null?void 0:g[0])==null?void 0:M.params)??{},pattern:FE(r.matches),errorInfo:x})}:void 0;return a.reduceRight((m,x,g)=>{let M,E=!1,w=null,S=null;r&&(M=l&&x.route.id?l[x.route.id]:void 0,w=x.route.errorElement||JE,c&&(d<0&&g===0?(W_("route-fallback",!1,"No `HydrateFallback` element provided to render during initial hydration"),E=!0,S=null):d===g&&(E=!0,S=x.route.hydrateFallbackElement||null)));let y=e.concat(a.slice(0,g+1)),N=()=>{let L;return M?L=w:E?L=S:x.route.Component?L=G.createElement(x.route.Component,null):x.route.element?L=x.route.element:L=m,G.createElement(t1,{match:x,routeContext:{outlet:m,matches:y,isDataRoute:r!=null},children:L})};return r&&(x.route.ErrorBoundary||x.route.errorElement||g===0)?G.createElement(j_,{location:r.location,revalidation:r.revalidation,component:w,error:M,children:N(),routeContext:{outlet:null,matches:y,isDataRoute:!0},onError:f}):N()},null)}function _m(i){return`${i} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function i1(i){let e=G.useContext(zo);return sn(e,_m(i)),e}function r1(i){let e=G.useContext(gd);return sn(e,_m(i)),e}function s1(i){let e=G.useContext(Ji);return sn(e,_m(i)),e}function ym(i){let e=s1(i),t=e.matches[e.matches.length-1];return sn(t.route.id,`${i} can only be used on routes that contain a unique "id"`),t.route.id}function a1(){return ym("useRouteId")}function o1(){var r;let i=G.useContext(xm),e=r1("useRouteError"),t=ym("useRouteError");return i!==void 0?i:(r=e.errors)==null?void 0:r[t]}function l1(){let{router:i}=i1("useNavigate"),e=ym("useNavigate"),t=G.useRef(!1);return V_(()=>{t.current=!0}),G.useCallback(async(a,l={})=>{Ui(t.current,H_),t.current&&(typeof a=="number"?await i.navigate(a):await i.navigate(a,{fromRouteId:e,...l}))},[i,e])}var kx={};function W_(i,e,t){!e&&!kx[i]&&(kx[i]=!0,Ui(!1,t))}G.memo(c1);function c1({routes:i,manifest:e,future:t,state:r,isStatic:a,onError:l}){return G_(i,void 0,{manifest:e,state:r,isStatic:a,onError:l})}function uf({to:i,replace:e,state:t,relative:r}){sn(Bo(),"<Navigate> may be used only in the context of a <Router> component.");let{static:a}=G.useContext(Ei);Ui(!a,"<Navigate> must not be used on the initial render in a <StaticRouter>. This is a no-op, but you should modify your code so the <Navigate> is only ever rendered in response to some user interaction or state change.");let{matches:l}=G.useContext(Ji),{pathname:c}=er(),d=vm(),h=md(i,gm(l),c,r==="path"),f=JSON.stringify(h);return G.useEffect(()=>{d(JSON.parse(f),{replace:e,state:t,relative:r})},[d,f,r,e,t]),null}function u1(i){return KE(i.context)}function $i(i){sn(!1,"A <Route> is only ever to be used as the child of <Routes> element, never rendered directly. Please wrap your <Route> in a <Routes>.")}function d1({basename:i="/",children:e=null,location:t,navigationType:r="POP",navigator:a,static:l=!1,useTransitions:c}){sn(!Bo(),"You cannot render a <Router> inside another <Router>. You should never have more than one in your app.");let d=i.replace(/^\/*/,"/"),h=G.useMemo(()=>({basename:d,navigator:a,static:l,useTransitions:c,future:{}}),[d,a,l,c]);typeof t=="string"&&(t=ko(t));let{pathname:f="/",search:m="",hash:x="",state:g=null,key:M="default",mask:E}=t,w=G.useMemo(()=>{let S=$r(f,d);return S==null?null:{location:{pathname:S,search:m,hash:x,state:g,key:M,mask:E},navigationType:r}},[d,f,m,x,g,M,r,E]);return Ui(w!=null,`<Router basename="${d}"> is not able to match the URL "${f}${m}${x}" because it does not start with the basename, so the <Router> won't render anything.`),w==null?null:G.createElement(Ei.Provider,{value:h},G.createElement(tc.Provider,{children:e,value:w}))}function h1({children:i,location:e}){return QE(pp(i),e)}function pp(i,e=[]){let t=[];return G.Children.forEach(i,(r,a)=>{if(!G.isValidElement(r))return;let l=[...e,a];if(r.type===G.Fragment){t.push.apply(t,pp(r.props.children,l));return}sn(r.type===$i,`[${typeof r.type=="string"?r.type:r.type.name}] is not a <Route> component. All component children of <Routes> must be a <Route> or <React.Fragment>`),sn(!r.props.index||!r.props.children,"An index route cannot have child routes.");let c={id:r.props.id||l.join("-"),caseSensitive:r.props.caseSensitive,element:r.props.element,Component:r.props.Component,index:r.props.index,path:r.props.path,middleware:r.props.middleware,loader:r.props.loader,action:r.props.action,hydrateFallbackElement:r.props.hydrateFallbackElement,HydrateFallback:r.props.HydrateFallback,errorElement:r.props.errorElement,ErrorBoundary:r.props.ErrorBoundary,hasErrorBoundary:r.props.hasErrorBoundary===!0||r.props.ErrorBoundary!=null||r.props.errorElement!=null,shouldRevalidate:r.props.shouldRevalidate,handle:r.props.handle,lazy:r.props.lazy};r.props.children&&(c.children=pp(r.props.children,l)),t.push(c)}),t}var ju="get",Wu="application/x-www-form-urlencoded";function xd(i){return typeof HTMLElement<"u"&&i instanceof HTMLElement}function f1(i){return xd(i)&&i.tagName.toLowerCase()==="button"}function p1(i){return xd(i)&&i.tagName.toLowerCase()==="form"}function m1(i){return xd(i)&&i.tagName.toLowerCase()==="input"}function g1(i){return!!(i.metaKey||i.altKey||i.ctrlKey||i.shiftKey)}function x1(i,e){return i.button===0&&(!e||e==="_self")&&!g1(i)}function mp(i=""){return new URLSearchParams(typeof i=="string"||Array.isArray(i)||i instanceof URLSearchParams?i:Object.keys(i).reduce((e,t)=>{let r=i[t];return e.concat(Array.isArray(r)?r.map(a=>[t,a]):[[t,r]])},[]))}function v1(i,e){let t=mp(i);return e&&e.forEach((r,a)=>{t.has(a)||e.getAll(a).forEach(l=>{t.append(a,l)})}),t}var fu=null;function _1(){if(fu===null)try{new FormData(document.createElement("form"),0),fu=!1}catch{fu=!0}return fu}var y1=new Set(["application/x-www-form-urlencoded","multipart/form-data","text/plain"]);function df(i){return i!=null&&!y1.has(i)?(Ui(!1,`"${i}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${Wu}"`),null):i}function S1(i,e){let t,r,a,l,c;if(p1(i)){let d=i.getAttribute("action");r=d?$r(d,e):null,t=i.getAttribute("method")||ju,a=df(i.getAttribute("enctype"))||Wu,l=new FormData(i)}else if(f1(i)||m1(i)&&(i.type==="submit"||i.type==="image")){let d=i.form;if(d==null)throw new Error('Cannot submit a <button> or <input type="submit"> without a <form>');let h=i.getAttribute("formaction")||d.getAttribute("action");if(r=h?$r(h,e):null,t=i.getAttribute("formmethod")||d.getAttribute("method")||ju,a=df(i.getAttribute("formenctype"))||df(d.getAttribute("enctype"))||Wu,l=new FormData(d,i),!_1()){let{name:f,type:m,value:x}=i;if(m==="image"){let g=f?`${f}.`:"";l.append(`${g}x`,"0"),l.append(`${g}y`,"0")}else f&&l.append(f,x)}}else{if(xd(i))throw new Error('Cannot submit element that is not <form>, <button>, or <input type="submit|image">');t=ju,r=null,a=Wu,c=i}return l&&a==="text/plain"&&(c=l,l=void 0),{action:r,method:t.toLowerCase(),encType:a,formData:l,body:c}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");function Sm(i,e){if(i===!1||i===null||typeof i>"u")throw new Error(e)}function X_(i,e,t,r){let a=typeof i=="string"?new URL(i,typeof window>"u"?"server://singlefetch/":window.location.origin):i;return t?a.pathname.endsWith("/")?a.pathname=`${a.pathname}_.${r}`:a.pathname=`${a.pathname}.${r}`:a.pathname==="/"?a.pathname=`_root.${r}`:e&&$r(a.pathname,e)==="/"?a.pathname=`${rd(e)}/_root.${r}`:a.pathname=`${rd(a.pathname)}.${r}`,a}async function M1(i,e){if(i.id in e)return e[i.id];try{let t=await import(i.module);return e[i.id]=t,t}catch(t){return console.error(`Error loading route module \`${i.module}\`, reloading page...`),console.error(t),window.__reactRouterContext&&window.__reactRouterContext.isSpaMode,window.location.reload(),new Promise(()=>{})}}function E1(i){return i==null?!1:i.href==null?i.rel==="preload"&&typeof i.imageSrcSet=="string"&&typeof i.imageSizes=="string":typeof i.rel=="string"&&typeof i.href=="string"}async function w1(i,e,t){let r=await Promise.all(i.map(async a=>{let l=e.routes[a.route.id];if(l){let c=await M1(l,t);return c.links?c.links():[]}return[]}));return R1(r.flat(1).filter(E1).filter(a=>a.rel==="stylesheet"||a.rel==="preload").map(a=>a.rel==="stylesheet"?{...a,rel:"prefetch",as:"style"}:{...a,rel:"prefetch"}))}function zx(i,e,t,r,a,l){let c=(h,f)=>t[f]?h.route.id!==t[f].route.id:!0,d=(h,f)=>{var m;return t[f].pathname!==h.pathname||((m=t[f].route.path)==null?void 0:m.endsWith("*"))&&t[f].params["*"]!==h.params["*"]};return l==="assets"?e.filter((h,f)=>c(h,f)||d(h,f)):l==="data"?e.filter((h,f)=>{var x;let m=r.routes[h.route.id];if(!m||!m.hasLoader)return!1;if(c(h,f)||d(h,f))return!0;if(h.route.shouldRevalidate){let g=h.route.shouldRevalidate({currentUrl:new URL(a.pathname+a.search+a.hash,window.origin),currentParams:((x=t[0])==null?void 0:x.params)||{},nextUrl:new URL(i,window.origin),nextParams:h.params,defaultShouldRevalidate:!0});if(typeof g=="boolean")return g}return!0}):[]}function b1(i,e,{includeHydrateFallback:t}={}){return T1(i.map(r=>{let a=e.routes[r.route.id];if(!a)return[];let l=[a.module];return a.clientActionModule&&(l=l.concat(a.clientActionModule)),a.clientLoaderModule&&(l=l.concat(a.clientLoaderModule)),t&&a.hydrateFallbackModule&&(l=l.concat(a.hydrateFallbackModule)),a.imports&&(l=l.concat(a.imports)),l}).flat(1))}function T1(i){return[...new Set(i)]}function C1(i){let e={},t=Object.keys(i).sort();for(let r of t)e[r]=i[r];return e}function R1(i,e){let t=new Set;return new Set(e),i.reduce((r,a)=>{let l=JSON.stringify(C1(a));return t.has(l)||(t.add(l),r.push({key:l,link:a})),r},[])}function Mm(){let i=G.useContext(zo);return Sm(i,"You must render this element inside a <DataRouterContext.Provider> element"),i}function A1(){let i=G.useContext(gd);return Sm(i,"You must render this element inside a <DataRouterStateContext.Provider> element"),i}var Em=G.createContext(void 0);Em.displayName="FrameworkContext";function vd(){let i=G.useContext(Em);return Sm(i,"You must render this element inside a <HydratedRouter> element"),i}function P1(i,e){let t=G.useContext(Em),[r,a]=G.useState(!1),[l,c]=G.useState(!1),{onFocus:d,onBlur:h,onMouseEnter:f,onMouseLeave:m,onTouchStart:x}=e,g=G.useRef(null);G.useEffect(()=>{if(i==="render"&&c(!0),i==="viewport"){let w=y=>{y.forEach(N=>{c(N.isIntersecting)})},S=new IntersectionObserver(w,{threshold:.5});return g.current&&S.observe(g.current),()=>{S.disconnect()}}},[i]),G.useEffect(()=>{if(r){let w=setTimeout(()=>{c(!0)},100);return()=>{clearTimeout(w)}}},[r]);let M=()=>{a(!0)},E=()=>{a(!1),c(!1)};return t?i!=="intent"?[l,g,{}]:[l,g,{onFocus:bl(d,M),onBlur:bl(h,E),onMouseEnter:bl(f,M),onMouseLeave:bl(m,E),onTouchStart:bl(x,M)}]:[!1,g,{}]}function bl(i,e){return t=>{i&&i(t),t.defaultPrevented||e(t)}}function N1({page:i,...e}){let t=BE(),{nonce:r}=vd(),{router:a}=Mm(),l=G.useMemo(()=>A_(a.routes,i,a.basename),[a.routes,i,a.basename]);return l?(e.nonce==null&&r&&(e={...e,nonce:r}),t?G.createElement(D1,{page:i,matches:l,...e}):G.createElement(I1,{page:i,matches:l,...e})):null}function L1(i){let{manifest:e,routeModules:t}=vd(),[r,a]=G.useState([]);return G.useEffect(()=>{let l=!1;return w1(i,e,t).then(c=>{l||a(c)}),()=>{l=!0}},[i,e,t]),r}function D1({page:i,matches:e,...t}){let r=er(),{future:a}=vd(),{basename:l}=Mm(),c=G.useMemo(()=>{if(i===r.pathname+r.search+r.hash)return[];let d=X_(i,l,a.v8_trailingSlashAwareDataRequests,"rsc"),h=!1,f=[];for(let m of e)typeof m.route.shouldRevalidate=="function"?h=!0:f.push(m.route.id);return h&&f.length>0&&d.searchParams.set("_routes",f.join(",")),[d.pathname+d.search]},[l,a.v8_trailingSlashAwareDataRequests,i,r,e]);return G.createElement(G.Fragment,null,c.map(d=>G.createElement("link",{key:d,rel:"prefetch",as:"fetch",href:d,...t})))}function I1({page:i,matches:e,...t}){let r=er(),{future:a,manifest:l,routeModules:c}=vd(),{basename:d}=Mm(),{loaderData:h,matches:f}=A1(),m=G.useMemo(()=>zx(i,e,f,l,r,"data"),[i,e,f,l,r]),x=G.useMemo(()=>zx(i,e,f,l,r,"assets"),[i,e,f,l,r]),g=G.useMemo(()=>{if(i===r.pathname+r.search+r.hash)return[];let w=new Set,S=!1;if(e.forEach(N=>{var C;let L=l.routes[N.route.id];!L||!L.hasLoader||(!m.some(D=>D.route.id===N.route.id)&&N.route.id in h&&((C=c[N.route.id])!=null&&C.shouldRevalidate)||L.hasClientLoader?S=!0:w.add(N.route.id))}),w.size===0)return[];let y=X_(i,d,a.v8_trailingSlashAwareDataRequests,"data");return S&&w.size>0&&y.searchParams.set("_routes",e.filter(N=>w.has(N.route.id)).map(N=>N.route.id).join(",")),[y.pathname+y.search]},[d,a.v8_trailingSlashAwareDataRequests,h,r,l,m,e,i,c]),M=G.useMemo(()=>b1(x,l),[x,l]),E=L1(x);return G.createElement(G.Fragment,null,g.map(w=>G.createElement("link",{key:w,rel:"prefetch",as:"fetch",href:w,...t})),M.map(w=>G.createElement("link",{key:w,rel:"modulepreload",href:w,...t})),E.map(({key:w,link:S})=>G.createElement("link",{key:w,nonce:t.nonce,...S,crossOrigin:S.crossOrigin??t.crossOrigin})))}function U1(...i){return e=>{i.forEach(t=>{typeof t=="function"?t(e):t!=null&&(t.current=e)})}}var F1=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";try{F1&&(window.__reactRouterVersion="7.18.0")}catch{}function O1({basename:i,children:e,useTransitions:t,window:r}){let a=G.useRef();a.current==null&&(a.current=hE({window:r,v5Compat:!0}));let l=a.current,[c,d]=G.useState({action:l.action,location:l.location}),h=G.useCallback(f=>{t===!1?d(f):G.startTransition(()=>d(f))},[t]);return G.useLayoutEffect(()=>l.listen(h),[l,h]),G.createElement(d1,{basename:i,children:e,location:c.location,navigationType:c.action,navigator:l,useTransitions:t})}var $_=G.forwardRef(function({onClick:e,discover:t="render",prefetch:r="none",relative:a,reloadDocument:l,replace:c,mask:d,state:h,target:f,to:m,preventScrollReset:x,viewTransition:g,defaultShouldRevalidate:M,...E},w){let{basename:S,navigator:y,useTransitions:N}=G.useContext(Ei),L=typeof m=="string"&&mm.test(m),C=F_(m,S);m=C.to;let D=$E(m,{relative:a}),P=er(),U=null;if(d){let Y=md(d,[],P.mask?P.mask.pathname:"/",!0);S!=="/"&&(Y.pathname=Y.pathname==="/"?S:Qi([S,Y.pathname])),U=y.createHref(Y)}let[b,I,X]=P1(r,E),O=B1(m,{replace:c,mask:d,state:h,target:f,preventScrollReset:x,relative:a,viewTransition:g,defaultShouldRevalidate:M,useTransitions:N});function K(Y){e&&e(Y),Y.defaultPrevented||O(Y)}let se=!(C.isExternal||l),fe=G.createElement("a",{...E,...X,href:(se?U:void 0)||C.absoluteURL||D,onClick:se?K:e,ref:U1(w,I),target:f,"data-discover":!L&&t==="render"?"true":void 0});return b&&!L?G.createElement(G.Fragment,null,fe,G.createElement(N1,{page:D})):fe});$_.displayName="Link";var mo=G.forwardRef(function({"aria-current":e="page",caseSensitive:t=!1,className:r="",end:a=!1,style:l,to:c,viewTransition:d,children:h,...f},m){let x=nc(c,{relative:f.relative}),g=er(),M=G.useContext(gd),{navigator:E,basename:w}=G.useContext(Ei),S=M!=null&&X1(x)&&d===!0,y=E.encodeLocation?E.encodeLocation(x).pathname:x.pathname,N=g.pathname,L=M&&M.navigation&&M.navigation.location?M.navigation.location.pathname:null;t||(N=N.toLowerCase(),L=L?L.toLowerCase():null,y=y.toLowerCase()),L&&w&&(L=$r(L,w)||L);const C=y!=="/"&&y.endsWith("/")?y.length-1:y.length;let D=N===y||!a&&N.startsWith(y)&&N.charAt(C)==="/",P=L!=null&&(L===y||!a&&L.startsWith(y)&&L.charAt(y.length)==="/"),U={isActive:D,isPending:P,isTransitioning:S},b=D?e:void 0,I;typeof r=="function"?I=r(U):I=[r,D?"active":null,P?"pending":null,S?"transitioning":null].filter(Boolean).join(" ");let X=typeof l=="function"?l(U):l;return G.createElement($_,{...f,"aria-current":b,className:I,ref:m,style:X,to:c,viewTransition:d},typeof h=="function"?h(U):h)});mo.displayName="NavLink";var k1=G.forwardRef(({discover:i="render",fetcherKey:e,navigate:t,reloadDocument:r,replace:a,state:l,method:c=ju,action:d,onSubmit:h,relative:f,preventScrollReset:m,viewTransition:x,defaultShouldRevalidate:g,...M},E)=>{let{useTransitions:w}=G.useContext(Ei),S=j1(),y=W1(d,{relative:f}),N=c.toLowerCase()==="get"?"get":"post",L=typeof d=="string"&&mm.test(d),C=D=>{if(h&&h(D),D.defaultPrevented)return;D.preventDefault();let P=D.nativeEvent.submitter,U=(P==null?void 0:P.getAttribute("formmethod"))||c,b=()=>S(P||D.currentTarget,{fetcherKey:e,method:U,navigate:t,replace:a,state:l,relative:f,preventScrollReset:m,viewTransition:x,defaultShouldRevalidate:g});w&&t!==!1?G.startTransition(()=>b()):b()};return G.createElement("form",{ref:E,method:N,action:y,onSubmit:r?h:C,...M,"data-discover":!L&&i==="render"?"true":void 0})});k1.displayName="Form";function z1(i){return`${i} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function q_(i){let e=G.useContext(zo);return sn(e,z1(i)),e}function B1(i,{target:e,replace:t,mask:r,state:a,preventScrollReset:l,relative:c,viewTransition:d,defaultShouldRevalidate:h,useTransitions:f}={}){let m=vm(),x=er(),g=nc(i,{relative:c});return G.useCallback(M=>{if(x1(M,e)){M.preventDefault();let E=t!==void 0?t:jl(x)===jl(g),w=()=>m(i,{replace:E,mask:r,state:a,preventScrollReset:l,relative:c,viewTransition:d,defaultShouldRevalidate:h});f?G.startTransition(()=>w()):w()}},[x,m,g,t,r,a,e,i,l,c,d,h,f])}function H1(i){Ui(typeof URLSearchParams<"u","You cannot use the `useSearchParams` hook in a browser that does not support the URLSearchParams API. If you need to support Internet Explorer 11, we recommend you load a polyfill such as https://github.com/ungap/url-search-params.");let e=G.useRef(mp(i)),t=G.useRef(!1),r=er(),a=G.useMemo(()=>v1(r.search,t.current?null:e.current),[r.search]),l=vm(),c=G.useCallback((d,h)=>{const f=mp(typeof d=="function"?d(new URLSearchParams(a)):d);t.current=!0,l("?"+f,h)},[l,a]);return[a,c]}var V1=0,G1=()=>`__${String(++V1)}__`;function j1(){let{router:i}=q_("useSubmit"),{basename:e}=G.useContext(Ei),t=a1(),r=i.fetch,a=i.navigate;return G.useCallback(async(l,c={})=>{let{action:d,method:h,encType:f,formData:m,body:x}=S1(l,e);if(c.navigate===!1){let g=c.fetcherKey||G1();await r(g,t,c.action||d,{defaultShouldRevalidate:c.defaultShouldRevalidate,preventScrollReset:c.preventScrollReset,formData:m,body:x,formMethod:c.method||h,formEncType:c.encType||f,flushSync:c.flushSync})}else await a(c.action||d,{defaultShouldRevalidate:c.defaultShouldRevalidate,preventScrollReset:c.preventScrollReset,formData:m,body:x,formMethod:c.method||h,formEncType:c.encType||f,replace:c.replace,state:c.state,fromRouteId:t,flushSync:c.flushSync,viewTransition:c.viewTransition})},[r,a,e,t])}function W1(i,{relative:e}={}){let{basename:t}=G.useContext(Ei),r=G.useContext(Ji);sn(r,"useFormAction must be used inside a RouteContext");let[a]=r.matches.slice(-1),l={...nc(i||".",{relative:e})},c=er();if(i==null){l.search=c.search;let d=new URLSearchParams(l.search),h=d.getAll("index");if(h.some(m=>m==="")){d.delete("index"),h.filter(x=>x).forEach(x=>d.append("index",x));let m=d.toString();l.search=m?`?${m}`:""}}return(!i||i===".")&&a.route.index&&(l.search=l.search?l.search.replace(/^\?/,"?index&"):"?index"),t!=="/"&&(l.pathname=l.pathname==="/"?t:Qi([t,l.pathname])),jl(l)}function X1(i,{relative:e}={}){let t=G.useContext(z_);sn(t!=null,"`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?");let{basename:r}=q_("useViewTransitionState"),a=nc(i,{relative:e});if(!t.isTransitioning)return!1;let l=$r(t.currentLocation.pathname,r)||t.currentLocation.pathname,c=$r(t.nextLocation.pathname,r)||t.nextLocation.pathname;return id(a.pathname,c)!=null||id(a.pathname,l)!=null}/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $1=i=>i.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),Y_=(...i)=>i.filter((e,t,r)=>!!e&&e.trim()!==""&&r.indexOf(e)===t).join(" ").trim();/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var q1={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y1=G.forwardRef(({color:i="currentColor",size:e=24,strokeWidth:t=2,absoluteStrokeWidth:r,className:a="",children:l,iconNode:c,...d},h)=>G.createElement("svg",{ref:h,...q1,width:e,height:e,stroke:i,strokeWidth:r?Number(t)*24/Number(e):t,className:Y_("lucide",a),...d},[...c.map(([f,m])=>G.createElement(f,m)),...Array.isArray(l)?l:[l]]));/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ct=(i,e)=>{const t=G.forwardRef(({className:r,...a},l)=>G.createElement(Y1,{ref:l,iconNode:e,className:Y_(`lucide-${$1(i)}`,r),...a}));return t.displayName=`${i}`,t};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K1=Ct("ArchiveRestore",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h2",key:"tvwodi"}],["path",{d:"M20 8v11a2 2 0 0 1-2 2h-2",key:"1gkqxj"}],["path",{d:"m9 15 3-3 3 3",key:"1pd0qc"}],["path",{d:"M12 12v9",key:"192myk"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q1=Ct("Archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z1=Ct("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J1=Ct("Box",[["path",{d:"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",key:"hh9hay"}],["path",{d:"m3.3 7 8.7 5 8.7-5",key:"g66t2b"}],["path",{d:"M12 22V12",key:"d0xqtd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ew=Ct("Boxes",[["path",{d:"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",key:"lc1i9w"}],["path",{d:"m7 16.5-4.74-2.85",key:"1o9zyk"}],["path",{d:"m7 16.5 5-3",key:"va8pkn"}],["path",{d:"M7 16.5v5.17",key:"jnp8gn"}],["path",{d:"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",key:"8zsnat"}],["path",{d:"m17 16.5-5-3",key:"8arw3v"}],["path",{d:"m17 16.5 4.74-2.85",key:"8rfmw"}],["path",{d:"M17 16.5v5.17",key:"k6z78m"}],["path",{d:"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",key:"1xygjf"}],["path",{d:"M12 8 7.26 5.15",key:"1vbdud"}],["path",{d:"m12 8 4.74-2.85",key:"3rx089"}],["path",{d:"M12 13.5V8",key:"1io7kd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wm=Ct("Camera",[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",key:"1tc9qg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tw=Ct("ChartLine",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K_=Ct("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nw=Ct("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iw=Ct("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bm=Ct("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rw=Ct("Circle",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sw=Ct("Crop",[["path",{d:"M6 2v14a2 2 0 0 0 2 2h14",key:"ron5a4"}],["path",{d:"M18 22V8a2 2 0 0 0-2-2H2",key:"7s9ehn"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aw=Ct("Crown",[["path",{d:"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",key:"1vdc57"}],["path",{d:"M5 21h14",key:"11awu3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ow=Ct("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lw=Ct("EyeOff",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xu=Ct("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cw=Ct("FlaskConical",[["path",{d:"M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2",key:"18mbvz"}],["path",{d:"M6.453 15h11.094",key:"3shlmq"}],["path",{d:"M8.5 2h7",key:"csnxdl"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bx=Ct("Hammer",[["path",{d:"m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9",key:"eefl8a"}],["path",{d:"m18 15 4-4",key:"16gjal"}],["path",{d:"m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5",key:"b7pghm"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uw=Ct("Image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dw=Ct("Images",[["path",{d:"M18 22H4a2 2 0 0 1-2-2V6",key:"pblm9e"}],["path",{d:"m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18",key:"nf6bnh"}],["circle",{cx:"12",cy:"8",r:"2",key:"1822b1"}],["rect",{width:"16",height:"16",x:"6",y:"2",rx:"2",key:"12espp"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nn=Ct("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hw=Ct("Maximize2",[["polyline",{points:"15 3 21 3 21 9",key:"mznyad"}],["polyline",{points:"9 21 3 21 3 15",key:"1avn1i"}],["line",{x1:"21",x2:"14",y1:"3",y2:"10",key:"ota7mn"}],["line",{x1:"3",x2:"10",y1:"21",y2:"14",key:"1atl0r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fw=Ct("Package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["path",{d:"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7",key:"yx3hmr"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
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
 */const pw=Ct("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mw=Ct("RotateCw",[["path",{d:"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",key:"1p45f6"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}]]);/**
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
 */const gw=Ct("Undo2",[["path",{d:"M9 14 4 9l5-5",key:"102s5s"}],["path",{d:"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11",key:"f3b9sd"}]]);/**
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
 */const ey=Ct("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);async function Qt(i,e){var r;const t=await fetch(i,e);if(!t.ok){let a="";try{a=((r=await t.json())==null?void 0:r.detail)??""}catch{}throw new Error(a||`HTTP ${t.status} (${i})`)}return t.json()}const tn=(i,e)=>Qt(i,{method:"POST",headers:{"Content-Type":"application/json"},body:e!==void 0?JSON.stringify(e):void 0}),Wl=i=>Qt(i,{method:"DELETE"}),xw={K:"♚",Q:"♛",R:"♜",B:"♝",N:"♞",P:"♟"};function Gx({label:i,className:e=""}){if(i==="empty")return v.jsx("span",{className:`text-zinc-500 ${e}`,children:"·"});if(i==="occluded")return v.jsx("span",{className:`text-amber-300 ${e}`,children:"▦"});const t=xw[i==null?void 0:i[1]]??i,r=(i==null?void 0:i[0])==="w";return v.jsx("span",{className:e,style:{color:r?"#fafafa":"#0a0a0a",textShadow:r?"0 0 1px #000, 0 1px 2px #000":"0 0 1px #fff, 0 1px 2px #fff"},children:t})}function fn({title:i,right:e,children:t,className:r=""}){return v.jsxs("div",{className:`rounded-xl border border-zinc-800 bg-zinc-900 p-4 ${r}`,children:[(i||e)&&v.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[i&&v.jsx("h2",{className:"text-xs font-medium uppercase tracking-wide text-zinc-400",children:i}),e]}),t]})}function Tt({children:i,variant:e="ghost",className:t="",onClick:r,disabled:a,...l}){const[c,d]=G.useState(!1),h=e==="primary"?"bg-sky-500 text-zinc-950 hover:bg-sky-400 font-medium":"bg-zinc-800 text-zinc-200 hover:bg-zinc-700";async function f(m){if(!r)return;const x=r(m);if(x&&typeof x.then=="function"){d(!0);try{await x}finally{d(!1)}}}return v.jsxs("button",{...l,onClick:f,disabled:a||c,className:`relative inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm transition
        disabled:cursor-not-allowed disabled:opacity-40 ${h} ${t}`,children:[v.jsx("span",{className:`inline-flex items-center gap-2 ${c?"invisible":""}`,children:i}),c&&v.jsx(Nn,{className:"absolute h-4 w-4 animate-spin"})]})}function oa({label:i,children:e,...t}){return v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:[i,v.jsx("select",{...t,className:"rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",children:e})]})}const vw={err:"bg-red-950/60 text-red-300",busy:"bg-sky-950/60 text-sky-300 animate-pulse",ok:"bg-emerald-950/60 text-emerald-300"},Rm=i=>vw[i]??"text-zinc-500",hf="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";function _w({coverage:i,sweep:e,sets:t,setSets:r,count:a,setCount:l,passes:c,setPasses:d,pieces:h,setPieces:f,together:m,setTogether:x,offset:g,setOffset:M,autoOffset:E,setAutoOffset:w,maxPlies:S,setMaxPlies:y,input:N}){return i?v.jsxs(v.Fragment,{children:[v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Number of physical piece sets: with 2 sets, queens/kings come twice as fast.",children:["Sets",v.jsx("input",{type:"number",min:1,value:t,onChange:L=>r(+L.target.value),className:`${N} w-16`})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Number of dense setups generated against your weakest classes.",children:["Setups",v.jsx("input",{type:"number",min:1,value:a,onChange:L=>l(+L.target.value),className:`${N} w-20`})]})]}):e?v.jsxs(v.Fragment,{children:[v.jsxs("div",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Which pieces walk across the board: special = non-pawns (K,Q,R,B,N), pawn = only pawns, all = everything.",children:["Pieces",v.jsxs(oa,{label:"",value:h,onChange:L=>f(L.target.value),children:[v.jsx("option",{value:"special",children:"special (K,Q,R,B,N)"}),v.jsx("option",{value:"pawn",children:"pawn (only pawns)"}),v.jsx("option",{value:"all",children:"all"})]})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Repeats (each pass 8 photos, ranks 1–8) — e.g. with different lighting. No piece rearrangement.",children:["Passes",v.jsx("input",{type:"number",min:1,value:c,onChange:L=>d(+L.target.value),className:`${N} w-16`})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Number of physical piece sets: with 2 sets, twice as many pieces per photo possible.",children:["Sets",v.jsx("input",{type:"number",min:1,value:t,onChange:L=>r(+L.target.value),className:`${N} w-16`})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Both colors on the board at once (white in front, black 4 ranks offset) → half the photos, every square gets both colors.",children:[v.jsx("input",{type:"checkbox",checked:m,onChange:L=>x(L.target.checked)})," both colors at once"]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Auto offset: counts previous sweep sessions and picks the next offset → each piece lands on different files across sessions (prevents position overfitting).",children:[v.jsx("input",{type:"checkbox",checked:E,onChange:L=>w(L.target.checked)})," Offset auto"]}),!E&&v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Shifts the line→piece assignment, fixed for this session. 0: a=King,b=Queen,…  1: a=Queen,b=Rook,…",children:["Offset",v.jsx("input",{type:"number",min:0,max:7,value:g,onChange:L=>M(+L.target.value),className:`${N} w-16`})]})]}):v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Max plies",v.jsx("input",{type:"number",value:S,onChange:L=>y(+L.target.value),className:`${N} w-20`})]})}function yw(){const[i,e]=G.useState("random"),[t,r]=G.useState(40),[a,l]=G.useState(1),[c,d]=G.useState(20),[h,f]=G.useState(1),[m,x]=G.useState("special"),[g,M]=G.useState(!0),[E,w]=G.useState(0),[S,y]=G.useState(!0),[N,L]=G.useState("default"),[C,D]=G.useState(0),P=i==="coverage",U=i==="sweep",[b,I]=G.useState({active:!1}),[X,O]=G.useState(""),[K,se]=G.useState(""),fe=G.useRef(null);G.useEffect(()=>(Qt("/api/collect/state").then(I).catch(()=>{}),()=>clearInterval(fe.current)),[]);const Y=()=>Qt("/api/collect/state").then(I).catch(()=>{});async function me(){O(""),se("");try{const F=await tn("/api/collect/start",{strategy:i,max_plies:t,profile:N,camera:C,sets:a,count:c,passes:h,pieces:m,together:g,offset:E,auto_offset:S});I(F),clearInterval(fe.current),fe.current=setInterval(Y,1500)}catch(F){O("Error: "+F.message),se("err")}}async function B(){O("Capturing..."),se("busy");try{I(await tn("/api/collect/shoot")),O("Captured ✓"),se("ok")}catch(F){O("Error: "+F.message),se("err")}}async function $(){O("Skipping..."),se("busy");try{I(await tn("/api/collect/skip")),O(""),se("")}catch(F){O("Error: "+F.message),se("err")}}async function ne(){O("Undoing..."),se("busy");try{I(await tn("/api/collect/undo")),O("Undone ✓"),se("ok")}catch(F){O("Error: "+F.message),se("err")}}async function ce(){O("Finishing..."),se("busy");try{const F=await tn("/api/collect/finish");clearInterval(fe.current),I({active:!1}),O(`Session finished: ${F.captures} captures, ${F.sliced??0} crops sliced → Datasets tab.`),se("ok")}catch(F){O("Error: "+F.message),se("err")}}const H=Rm(K);return v.jsxs("div",{className:"space-y-4",children:[v.jsxs(fn,{children:[v.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[v.jsxs(oa,{label:"Engine",value:i,onChange:F=>e(F.target.value),children:[v.jsx("option",{value:"random",children:"random (built-in)"}),v.jsx("option",{value:"stockfish",children:"stockfish (auto-detected)"}),v.jsx("option",{value:"coverage",children:"coverage (target rare classes)"}),v.jsx("option",{value:"sweep",children:"sweep (pieces walk the board)"})]}),v.jsx(_w,{coverage:P,sweep:U,input:hf,sets:a,setSets:l,count:c,setCount:d,passes:h,setPasses:f,pieces:m,setPieces:x,together:g,setTogether:M,offset:E,setOffset:w,autoOffset:S,setAutoOffset:y,maxPlies:t,setMaxPlies:r}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Profile",v.jsx("input",{value:N,onChange:F=>L(F.target.value),className:`${hf} w-28`})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Camera",v.jsx("input",{type:"number",value:C,onChange:F=>D(+F.target.value),className:`${hf} w-16`})]}),b.active?v.jsxs(Tt,{onClick:ce,children:[v.jsx(bm,{className:"h-4 w-4"})," Done"]}):v.jsxs(Tt,{variant:"primary",onClick:me,children:[v.jsx(Tm,{className:"h-4 w-4"})," Start game"]})]}),X&&v.jsx("div",{className:`mt-2 rounded-lg px-3 py-1.5 text-sm ${H}`,children:X})]}),b.active&&v.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_320px]",children:[v.jsx(fn,{title:"Live camera",children:v.jsx("img",{src:"/api/camera/collect.mjpg",alt:"Live capture",className:"w-full rounded-lg border border-zinc-800"})}),v.jsx(fn,{title:"Capture",children:v.jsxs("div",{className:"space-y-3",children:[b.done?v.jsxs("div",{className:"font-medium text-green-500",children:["✓ All ",b.n_positions," positions captured."]}):v.jsxs(v.Fragment,{children:[v.jsx(Sw,{st:b}),v.jsxs("div",{className:"flex flex-wrap gap-2",children:[!b.done&&v.jsxs(Tt,{variant:"primary",onClick:B,className:"px-5 py-2.5 text-base",children:[v.jsx(wm,{className:"h-5 w-5"})," Photo"]}),!b.done&&v.jsxs(Tt,{onClick:$,children:[v.jsx(Z1,{className:"h-4 w-4"})," Skip"]}),v.jsxs(Tt,{onClick:ne,children:[v.jsx(gw,{className:"h-4 w-4"})," Undo"]})]})]}),v.jsxs("div",{className:"text-sm",children:["Captures: ",v.jsx("b",{className:"text-sky-400",children:b.captures}),v.jsx("span",{className:"ml-1 text-xs text-green-500",children:"· instantly saved ✓"})]}),v.jsxs("p",{className:"text-xs text-zinc-500",children:["Each capture is ",v.jsx("b",{children:"saved instantly"}),' — you can press "Done" (above) any time or just stop; nothing is lost.']})]})})]}),v.jsxs("p",{className:"text-xs text-zinc-500",children:['After "Done" the session is sliced automatically. Curated datasets (dedup, rotation, split) are built in the ',v.jsx("b",{className:"text-zinc-300",children:"Datasets"})," tab."]})]})}function Sw({st:i}){const e=Math.min(i.index+1,i.n_positions),t=i.build_target?"Setup":"Position",r=i.build_target&&i.gains?v.jsxs("span",{className:"ml-1 text-xs text-zinc-500",children:["· ",i.gains," target squares"]}):null;let a;i.build_target?a=v.jsxs(v.Fragment,{children:["Position ",v.jsx("b",{children:"set up fresh"})," — ",v.jsx("b",{className:"text-sky-300",children:"piece names"})," are overlaid on the live image (white = light text, black = dark),"]}):i.index===0?a=v.jsxs(v.Fragment,{children:["Set up the ",v.jsx("b",{children:"starting position"}),","]}):a=v.jsxs(v.Fragment,{children:["Play this move: ",v.jsx("b",{className:"text-base text-sky-300",children:i.move_san})," ",v.jsx("span",{className:"text-zinc-400",children:"(red arrow)"}),","]});const l=i.build_target?v.jsx(v.Fragment,{children:"(feel free to take several with varying light)"}):null;return v.jsxs(v.Fragment,{children:[v.jsxs("div",{className:"text-sm text-zinc-400",children:[t," ",v.jsx("b",{className:"text-zinc-100",children:e})," / ",i.n_positions,r]}),v.jsxs("div",{className:"rounded-lg bg-zinc-800 p-3 text-sm",children:[a,v.jsxs("div",{className:"mt-1 text-xs text-zinc-400",children:["…then ",v.jsx("b",{children:"Photo"}),l,"."]})]})]})}const fo="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-sky-500",ff=({isActive:i})=>`rounded-lg px-3 py-1.5 text-sm transition ${i?"bg-zinc-800 text-zinc-100":"text-zinc-400 hover:text-zinc-100"}`;function Mw(){return v.jsxs("div",{className:"space-y-4",children:[v.jsxs("nav",{className:"flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5",children:[v.jsx(mo,{to:"sessions",className:ff,children:"Sessions"}),v.jsx(mo,{to:"curated",className:ff,children:"Curated datasets"}),v.jsx(mo,{to:"stats",className:ff,children:"Statistics"})]}),v.jsx(u1,{})]})}const ty=()=>{const i=pd();return(...e)=>e.forEach(t=>i.invalidateQueries({queryKey:[t]}))},Fl=v.jsx(Nn,{className:"h-3.5 w-3.5 animate-spin"}),Tl=(i,e)=>{var t;return i.isPending&&(i.variables===e||((t=i.variables)==null?void 0:t.sid)===e)},Ew=(i,e)=>i?Fl:e?v.jsx(rw,{className:"h-3.5 w-3.5"}):v.jsx(bm,{className:"h-3.5 w-3.5"});function ww({m:i,openReview:e,reviewedM:t,sliceM:r,archiveM:a,restoreM:l,deleteM:c}){return v.jsxs("div",{className:"flex justify-end gap-1.5",children:[v.jsxs(Tt,{onClick:()=>e(i.session_id),disabled:!i.n_frames,className:"px-2 py-1 text-xs disabled:opacity-50",children:[v.jsx(Xu,{className:"h-3.5 w-3.5"})," Review"]}),v.jsxs(Tt,{onClick:()=>t.mutate({sid:i.session_id,reviewed:!i.reviewed}),disabled:t.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[Ew(Tl(t,i.session_id),i.reviewed)," ",i.reviewed?"Mark new":"Mark reviewed"]}),!i.archived&&v.jsxs(Tt,{onClick:()=>r.mutate(i.session_id),disabled:r.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[Tl(r,i.session_id)?Fl:v.jsx(Q_,{className:"h-3.5 w-3.5"})," ",i.n_crops?"Re-slice":"Slice"]}),i.archived?v.jsxs(Tt,{onClick:()=>l.mutateAsync(i.session_id),disabled:l.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[Tl(l,i.session_id)?Fl:v.jsx(K1,{className:"h-3.5 w-3.5"})," Restore"]}):v.jsxs(Tt,{onClick:()=>a.mutateAsync(i.session_id),disabled:a.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[Tl(a,i.session_id)?Fl:v.jsx(Q1,{className:"h-3.5 w-3.5"})," Archive"]}),v.jsxs(Tt,{onClick:()=>window.confirm(`Delete session "${i.session_id}" permanently?`)&&c.mutateAsync(i.session_id),disabled:c.isPending,className:"px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50",children:[Tl(c,i.session_id)?Fl:v.jsx(Ta,{className:"h-3.5 w-3.5"})," Delete"]})]})}function bw(){var ne,ce,H;const i=ty(),[e,t]=G.useState(""),[r,a]=G.useState(""),[l,c]=G.useState(""),[d,h]=G.useState(0),[f,m]=G.useState(!1),x=Ea({queryKey:["sessions-manage"],queryFn:()=>Qt("/api/sessions/manage")}),g=Ea({queryKey:["session-review",l,d],queryFn:()=>Qt(`/api/sessions/${encodeURIComponent(l)}/review?idx=${d}`),enabled:!!l,staleTime:6e4}),M=pd();G.useEffect(()=>{var Oe;const F=((Oe=g.data)==null?void 0:Oe.count)??0;if(!l||!F)return;const Te=encodeURIComponent(l);for(const ze of[1,2,3,-1]){const ie=d+ze;ie<0||ie>=F||(M.prefetchQuery({queryKey:["session-review",l,ie],queryFn:()=>Qt(`/api/sessions/${Te}/review?idx=${ie}`),staleTime:6e4}),new Image().src=`/api/sessions/${Te}/overlay/${ie}`,new Image().src=`/api/sessions/${Te}/board/${ie}`)}},[l,d,g.data,M]);const E=x.data??[],w=E.filter(F=>!F.variant),S=w.filter(F=>f||!F.reviewed),y=w.filter(F=>!F.reviewed).length,N=w.length-y,L=E.filter(F=>F.variant),C=w.length===0?"No sessions yet — capture some in the Collect tab.":"No new sessions — all reviewed. Tick “Show reviewed” to see them.",D=F=>{t(F),a("ok"),i("sessions-manage","stats","datasets")},P=F=>{t("Error: "+F.message),a("err")},U=F=>{t(F),a("busy")},b=cr({mutationFn:F=>tn(`/api/sessions/${F}/slice`),onMutate:F=>U(`slicing "${F}" ...`),onSuccess:F=>D(`"${F.session}" sliced: ${F.crops} crops.`),onError:P}),I=F=>{c(F),h(0)},X=()=>{c(""),h(0)},O=g.data,K=(()=>{var F,Te;if(O){const Oe=(F=O.entry)!=null&&F.move_san?` | ${O.entry.move_san}`:"",ze=((Te=O.entry)==null?void 0:Te.ply)!==void 0?` | ply ${O.entry.ply}`:"";return`Frame ${O.index+1} / ${O.count}${Oe}${ze}`}return g.isError?"Could not load session details.":"Loading session details..."})(),se=cr({mutationFn:F=>tn(`/api/sessions/${F}/archive`),onSuccess:()=>D("archived."),onError:P}),fe=cr({mutationFn:F=>tn(`/api/sessions/${F}/restore`),onSuccess:()=>D("restored — re-slice."),onError:P}),Y=cr({mutationFn:F=>Wl(`/api/sessions/${F}`),onSuccess:()=>D("deleted."),onError:P}),me=cr({mutationFn:({sid:F,keep_frames:Te})=>tn(`/api/sessions/${F}/trim`,{keep_frames:Te}),onSuccess:F=>{D(`trimmed "${F.session_id}": kept ${F.kept_frames}, moved ${F.removed_frames} to rejects.`),h(Te=>Math.min(Te,Math.max(0,F.kept_frames-1))),i("session-review")},onError:P}),B=cr({mutationFn:({sid:F,idx:Te,unusable:Oe})=>tn(`/api/sessions/${F}/flag/${Te}`,{unusable:Oe}),onSuccess:()=>{i("session-review","sessions-manage")},onError:P}),$=cr({mutationFn:({sid:F,reviewed:Te})=>tn(`/api/sessions/${F}/reviewed`,{reviewed:Te}),onSuccess:F=>D(F.reviewed?"marked reviewed.":"marked new."),onError:P});return v.jsxs(fn,{title:"Sessions (raw material)",right:v.jsxs("div",{className:"flex items-center gap-3 text-xs text-zinc-500",children:[v.jsxs("label",{className:"flex cursor-pointer items-center gap-1.5 text-zinc-400",children:[v.jsx("input",{type:"checkbox",checked:f,onChange:F=>m(F.target.checked),className:"accent-sky-500"}),"Show reviewed (",N,")"]}),v.jsxs("span",{children:[y," new / ",L.length," ingested"]})]}),children:[e&&v.jsx("div",{className:`mb-2 rounded-lg px-3 py-1.5 text-sm ${Rm(r)}`,children:e}),S.length===0?v.jsx("span",{className:"text-sm text-zinc-500",children:C}):v.jsxs("table",{className:"w-full text-sm",children:[v.jsx("thead",{children:v.jsxs("tr",{className:"text-zinc-500",children:[v.jsx("th",{className:"text-left font-normal",children:"Session"}),v.jsx("th",{className:"text-left font-normal",children:"Mode"}),v.jsx("th",{className:"text-right font-normal",children:"Frames"}),v.jsx("th",{className:"text-right font-normal",children:"Crops"}),v.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),v.jsx("tbody",{children:S.map(F=>v.jsxs("tr",{className:"border-t border-zinc-800",children:[v.jsxs("td",{className:"py-1.5 text-zinc-200",children:[F.session_id,F.reviewed&&v.jsx("span",{className:"ml-2 rounded bg-emerald-900/60 px-1.5 py-0.5 text-[10px] text-emerald-300",children:"reviewed"}),!F.reviewed&&v.jsx("span",{className:"ml-2 rounded bg-sky-900/60 px-1.5 py-0.5 text-[10px] text-sky-300",children:"new"}),F.archived&&v.jsx("span",{className:"ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300",children:"archived"}),!F.archived&&F.n_crops===0&&v.jsx("span",{className:"ml-2 rounded bg-amber-900/60 px-1.5 py-0.5 text-[10px] text-amber-300",children:"not sliced"})]}),v.jsx("td",{className:"text-zinc-400",children:F.mode??"—"}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:F.n_frames}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:F.archived?"—":F.n_crops}),v.jsx("td",{className:"py-1",children:v.jsx(ww,{m:F,openReview:I,reviewedM:$,sliceM:b,archiveM:se,restoreM:fe,deleteM:Y})})]},F.session_id))})]}),l&&v.jsxs("div",{className:"mt-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3",children:[v.jsxs("div",{className:"mb-3 flex flex-wrap items-center justify-between gap-2",children:[v.jsxs("div",{children:[v.jsx("div",{className:"text-sm font-medium text-zinc-200",children:l}),v.jsx("div",{className:"text-xs text-zinc-500",children:K}),O&&v.jsxs("div",{className:"text-[11px] text-zinc-600",children:["Trim keeps this frame included; only frames after it move to the reject bucket and leave training data.",O.index>=O.count-1?" This is already the last frame.":""]})]}),v.jsxs("div",{className:"flex items-center gap-1.5",children:[v.jsxs(Tt,{onClick:()=>h(F=>Math.max(0,F-1)),disabled:!O||O.index<=0,className:"px-2 py-1 text-xs disabled:opacity-50",title:"Previous frame",children:[v.jsx(nw,{className:"h-3.5 w-3.5"})," Prev"]}),v.jsxs(Tt,{onClick:()=>h(F=>Math.min(((O==null?void 0:O.count)??1)-1,F+1)),disabled:!O||O.index>=O.count-1,className:"px-2 py-1 text-xs disabled:opacity-50",title:"Next frame",children:["Next ",v.jsx(iw,{className:"h-3.5 w-3.5"})]}),v.jsxs(Tt,{onClick:X,className:"px-2 py-1 text-xs",children:[v.jsx(ey,{className:"h-3.5 w-3.5"})," Close"]}),v.jsxs(Tt,{onClick:()=>{var F;return B.mutate({sid:l,idx:O.index,unusable:!((F=O==null?void 0:O.entry)!=null&&F.unusable)})},disabled:!O||B.isPending,className:`px-2 py-1 text-xs disabled:opacity-50 ${(ne=O==null?void 0:O.entry)!=null&&ne.unusable?"bg-red-900/60 text-red-300 hover:text-red-200":""}`,title:"Mark this frame as unsuitable for training (hand visible, extra piece, etc.). Excluded from slice/dataset build.",children:[B.isPending?v.jsx(Nn,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(lw,{className:"h-3.5 w-3.5"}),(ce=O==null?void 0:O.entry)!=null&&ce.unusable?"Unusable (flagged)":"Unusable?"]}),v.jsxs(Tt,{onClick:()=>{const F=((O==null?void 0:O.index)??0)+1;window.confirm(`Keep frames 1-${F}, including the current frame. Move all later frames to the reject bucket and remove them from training data?`)&&me.mutate({sid:l,keep_frames:F})},disabled:!O||O.index>=O.count-1||me.isPending,className:"px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50",title:"Keeps the current frame; moves only later frames to the reject bucket and removes their crops from training data",children:[me.isPending?v.jsx(Nn,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(Q_,{className:"h-3.5 w-3.5"}),"Keep through this frame"]})]})]}),g.isError&&v.jsx("div",{className:"rounded-lg bg-red-950/60 px-3 py-1.5 text-sm text-red-300",children:g.error.message}),O&&v.jsxs("div",{className:"grid gap-3 lg:grid-cols-2",children:[v.jsxs("div",{children:[v.jsxs("div",{className:"mb-1 text-xs font-medium text-zinc-500",children:["ArUco-aligned frame",O.overlay_available?"":" (raw fallback)"]}),v.jsx("img",{src:O.overlay_url,alt:`${l} overlay ${O.index+1}`,className:"max-h-[70vh] w-full rounded border border-zinc-800 object-contain"})]}),v.jsxs("div",{children:[v.jsx("div",{className:"mb-1 text-xs font-medium text-zinc-500",children:"Logged board"}),v.jsx("img",{src:O.board_url,alt:`${l} board ${O.index+1}`,className:"max-h-[70vh] w-full rounded border border-zinc-800 bg-zinc-100 object-contain"}),v.jsx("div",{className:"mt-2 break-all rounded bg-zinc-900 px-2 py-1 text-[11px] text-zinc-500",children:(H=O.entry)==null?void 0:H.fen})]})]})]}),L.length>0&&v.jsxs(v.Fragment,{children:[v.jsx("div",{className:"mt-5 mb-1 text-sm font-medium text-zinc-300",children:"Ingested datasets (pretrain variants)"}),v.jsxs("p",{className:"mb-2 text-xs text-zinc-500",children:["Imported via ",v.jsx("code",{children:"chesslab ingest"}),". Their crops live in a separate variant manifest (",v.jsx("code",{children:"squares__<tag>.jsonl"}),") and never mix with your camera dataset — train on them with ",v.jsx("code",{children:"train --dataset <tag>"}),". No slicing here."]}),v.jsxs("table",{className:"w-full text-sm",children:[v.jsx("thead",{children:v.jsxs("tr",{className:"text-zinc-500",children:[v.jsx("th",{className:"text-left font-normal",children:"Session"}),v.jsx("th",{className:"text-left font-normal",children:"Variant"}),v.jsx("th",{className:"text-right font-normal",children:"Frames"}),v.jsx("th",{className:"text-right font-normal",children:"Variant crops"}),v.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),v.jsx("tbody",{children:L.map(F=>v.jsxs("tr",{className:"border-t border-zinc-800",children:[v.jsxs("td",{className:"py-1.5 text-zinc-200",children:[F.session_id,F.archived&&v.jsx("span",{className:"ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300",children:"archived"})]}),v.jsx("td",{children:v.jsx("span",{className:"rounded bg-indigo-950/60 px-1.5 py-0.5 text-[10px] text-indigo-300",children:F.variant})}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:F.n_frames}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:F.n_crops}),v.jsx("td",{className:"py-1",children:v.jsx("div",{className:"flex justify-end gap-1.5",children:v.jsxs(Tt,{onClick:()=>{window.confirm(`Delete ingested session "${F.session_id}"? (variant crops stay; re-ingest to recreate)`)&&Y.mutateAsync(F.session_id)},disabled:Y.isPending,className:"px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50",children:[Y.isPending&&Y.variables===F.session_id?v.jsx(Nn,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(Ta,{className:"h-3.5 w-3.5"})," Delete"]})})})]},F.session_id))})]})]})]})}function Tw(){const i=ty(),[e,t]=G.useState(""),[r,a]=G.useState(""),[l,c]=G.useState(!1),[d,h]=G.useState(""),[f,m]=G.useState({}),[x,g]=G.useState(4),[M,E]=G.useState(!0),[w,S]=G.useState(6),[y,N]=G.useState(!0),[L,C]=G.useState(.15),[D,P]=G.useState(.15),[U,b]=G.useState({}),I=Ea({queryKey:["sessions-manage"],queryFn:()=>Qt("/api/sessions/manage")}),X=Ea({queryKey:["datasets"],queryFn:()=>Qt("/api/datasets")}),O=(I.data??[]).filter(B=>!B.archived&&!B.variant),K=X.data??[],se=cr({mutationFn:B=>tn("/api/datasets",B),onSuccess:B=>{var ne;const $=[B.hard_empty_protected?`${B.hard_empty_protected} hard empties protected`:"",(ne=B.force_train)!=null&&ne.length?`${B.force_train.length} session(s) pinned to train`:""].filter(Boolean).map(ce=>` · ${ce}`).join("");t(`"${B.name}" built: raw ${B.counts.raw} → dedup ${B.counts.after_dedup} → final ${B.counts.final}${$}.`),a("ok"),c(!1),h(""),m({}),b({}),i("datasets","stats")},onError:B=>{t("Error: "+B.message),a("err")}}),fe=cr({mutationFn:B=>Wl(`/api/datasets/${B}`),onSuccess:()=>{t("deleted."),a("ok"),i("datasets")},onError:B=>{t("Error: "+B.message),a("err")}}),Y=cr({mutationFn:B=>tn(`/api/datasets/${B}/rebuild`),onSuccess:B=>{var $;t(`"${B.name}" rebuilt: ${($=B.counts)==null?void 0:$.final} crops.`),a("ok"),i("datasets","stats")},onError:B=>{t("Error: "+B.message),a("err")}});function me(){const B=O.filter(ne=>f[ne.session_id]).map(ne=>ne.session_id);if(!d.trim()||B.length===0){t("Name and at least one session required.");return}const $=B.filter(ne=>U[ne]);se.mutate({name:d.trim(),session_ids:B,per_cell_cap:x,phash_enabled:M,phash_hamming:w,rotate:y,val_frac:L,test_frac:D,force_train:$})}return v.jsxs(fn,{title:"Curated datasets",right:v.jsxs("div",{className:"flex items-center gap-2",children:[e&&v.jsx("span",{className:`rounded-lg px-2 py-0.5 text-xs ${Rm(r)}`,children:e}),v.jsxs(Tt,{onClick:()=>c(B=>!B),className:"px-2 py-1 text-xs",children:[v.jsx(ew,{className:"h-3.5 w-3.5"})," New Dataset"]})]}),children:[l&&v.jsxs("div",{className:"mb-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3",children:[v.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["Name",v.jsx("input",{value:d,onChange:B=>h(B.target.value),className:`${fo} w-40`,placeholder:"e.g. set-a"})]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",title:"max. crops per (session, square, piece)",children:["Cap/cell",v.jsx("input",{type:"number",min:1,value:x,onChange:B=>g(+B.target.value),className:`${fo} w-16`})]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:[v.jsx("input",{type:"checkbox",checked:M,onChange:B=>E(B.target.checked)})," pHash"]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["Hamming",v.jsx("input",{type:"number",min:0,max:32,value:w,disabled:!M,onChange:B=>S(+B.target.value),className:`${fo} w-14`})]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",title:"On by default: 90/180/270° augmentation (4× train crops on disk, val/test stay unrotated). Proven to rescue rare classes (bK) and feed small-model finetunes — turn off only for a minimal A/B build.",children:[v.jsx("input",{type:"checkbox",checked:y,onChange:B=>N(B.target.checked)})," ",v.jsx(mw,{className:"h-3.5 w-3.5"})," Rotation"]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["val",v.jsx("input",{type:"number",step:.05,min:0,max:.5,value:L,onChange:B=>C(+B.target.value),className:`${fo} w-14`})]}),v.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["test",v.jsx("input",{type:"number",step:.05,min:0,max:.5,value:D,onChange:B=>P(+B.target.value),className:`${fo} w-14`})]})]}),v.jsxs("div",{children:[v.jsxs("div",{className:"mb-1 text-xs text-zinc-500",children:["Sessions (collected only — datasets may overlap):",v.jsx("button",{className:"ml-2 text-[10px] text-zinc-400 underline",onClick:()=>{const B={};O.forEach($=>B[$.session_id]=!0),m(B)},children:"Select all"}),v.jsx("button",{className:"ml-2 text-[10px] text-zinc-400 underline",onClick:()=>m({}),children:"Clear"})]}),v.jsx("div",{className:"flex flex-wrap gap-2",children:O.length===0?v.jsx("span",{className:"text-xs text-zinc-500",children:"no active sessions"}):O.map(B=>v.jsxs("label",{className:"flex items-center gap-1.5 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300",children:[v.jsx("input",{type:"checkbox",checked:!!f[B.session_id],onChange:$=>m(ne=>({...ne,[B.session_id]:$.target.checked}))}),B.session_id," ",v.jsxs("span",{className:"text-zinc-500",children:["(",B.n_crops,")"]}),f[B.session_id]&&v.jsx("button",{type:"button",title:"Pin to TRAIN split — for fixed-position captures (e.g. all-empty lighting sessions): in val/test they would distort board metrics.",onClick:$=>{$.preventDefault(),b(ne=>({...ne,[B.session_id]:!ne[B.session_id]}))},className:`rounded px-1 text-[10px] ${U[B.session_id]?"bg-amber-900/70 text-amber-300":"bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`,children:U[B.session_id]?"train ✓":"pin→train"})]},B.session_id))}),v.jsx("div",{className:"mt-1 text-[11px] text-zinc-500",children:"The mined hard-empty keep list (data/manifests/hard_empty.jsonl) is applied automatically — protected crops survive the empty cap."})]}),v.jsxs(Tt,{variant:"primary",onClick:me,disabled:se.isPending,children:[se.isPending?v.jsx(Nn,{className:"h-4 w-4 animate-spin"}):v.jsx(Bx,{className:"h-4 w-4"})," ",se.isPending?"Building…":"Build"]})]}),K.length===0?v.jsx("span",{className:"text-sm text-zinc-500",children:"No dataset built yet."}):v.jsxs("table",{className:"w-full text-sm",children:[v.jsx("thead",{children:v.jsxs("tr",{className:"text-zinc-500",children:[v.jsx("th",{className:"text-left font-normal",children:"Dataset"}),v.jsx("th",{className:"text-right font-normal",children:"Sessions"}),v.jsx("th",{className:"text-right font-normal",children:"raw→dedup→final"}),v.jsx("th",{className:"text-right font-normal",children:"train/val/test"}),v.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),v.jsx("tbody",{children:K.map(B=>{var $,ne,ce,H,F,Te,Oe;return v.jsxs("tr",{className:"border-t border-zinc-800",children:[v.jsxs("td",{className:"py-1.5 text-zinc-200",children:[B.name,(($=B.rotations)==null?void 0:$.some(ze=>ze))&&v.jsx("span",{className:"ml-2 text-[10px] text-zinc-500",children:"+rot"})]}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:B.n_sessions}),v.jsxs("td",{className:"text-right tabular-nums text-zinc-400",children:[(ne=B.counts)==null?void 0:ne.raw,"→",(ce=B.counts)==null?void 0:ce.after_dedup,"→",(H=B.counts)==null?void 0:H.final]}),v.jsxs("td",{className:"text-right tabular-nums text-zinc-400",children:[((F=B.split_counts)==null?void 0:F.train)??"?","/",((Te=B.split_counts)==null?void 0:Te.val)??"?","/",((Oe=B.split_counts)==null?void 0:Oe.test)??"?"]}),v.jsx("td",{className:"py-1",children:v.jsxs("div",{className:"flex justify-end gap-1.5",children:[v.jsx(mo,{to:`../stats?ds=${encodeURIComponent(B.name)}`,className:"inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700",children:"Stats"}),v.jsxs(Tt,{onClick:()=>Y.mutateAsync(B.name),disabled:Y.isPending,className:"px-2 py-1 text-xs disabled:opacity-50",children:[Y.isPending&&Y.variables===B.name?v.jsx(Nn,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(Bx,{className:"h-3.5 w-3.5"})," Rebuild"]}),v.jsxs(Tt,{onClick:()=>{window.confirm(`Delete dataset "${B.name}"?`)&&fe.mutateAsync(B.name)},disabled:fe.isPending,className:"px-2 py-1 text-xs text-red-300 hover:text-red-200 disabled:opacity-50",children:[fe.isPending&&fe.variables===B.name?v.jsx(Nn,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(Ta,{className:"h-3.5 w-3.5"})," Delete"]})]})})]},B.name)})})]})]})}function Cw(){const[i,e]=H1(),t=i.get("ds")??"",[r,a]=G.useState(null),l=Ea({queryKey:["datasets"],queryFn:()=>Qt("/api/datasets")}),c=Ea({queryKey:["stats",t],queryFn:()=>{const w=t?`?dataset=${encodeURIComponent(t)}`:"";return Qt(`/api/stats${w}`)}}),d=l.data??[],h=c.data,[f,m]=G.useState("");if(c.isLoading||!h)return v.jsx(fn,{title:"Stats",children:"Loading…"});const x=t?`Dataset "${t}"`:"global pool",g=Math.max(1,...Object.values(h.counts??{x:1})),M=(w,S)=>w==="empty"||w==="occluded"?"#38bdf8":S<h.min_samples*.5?"#ef4444":S<h.min_samples?"#eab308":"#22c55e",E=w=>{const S=t?`&dataset=${encodeURIComponent(t)}`:"";m(""),Qt(`/api/class/${w}?limit=120${S}`).then(y=>a({label:w,crops:y.crops})).catch(y=>m(y.message))};return v.jsxs("div",{className:"space-y-4",children:[v.jsxs("div",{className:"grid gap-4 lg:grid-cols-3",children:[v.jsxs(fn,{title:"Class distribution",className:"lg:col-span-2",right:v.jsxs("select",{value:t,onChange:w=>e(w.target.value?{ds:w.target.value}:{}),className:fo,children:[v.jsx("option",{value:"",children:"global pool"}),d.map(w=>v.jsx("option",{value:w.name,children:w.name},w.name))]}),children:[v.jsxs("div",{className:"mb-2 text-xs text-zinc-500",children:[h.total," crops · ",h.num_sessions," sessions",t?` · Dataset "${t}"`:" · raw"]}),v.jsx("div",{className:"space-y-1.5",children:h.classes.map(w=>{const S=h.counts[w]||0;return v.jsxs("button",{onClick:()=>E(w),className:"grid w-full grid-cols-[2rem_1fr_3rem] items-center gap-3 rounded px-1 py-0.5 text-left hover:bg-zinc-800",children:[v.jsxs("span",{className:"text-zinc-300",children:[v.jsx(Gx,{label:w}),v.jsx("span",{className:"ml-1 text-xs text-zinc-500",children:w})]}),v.jsx("div",{className:"h-2.5 overflow-hidden rounded-full bg-zinc-800",children:v.jsx("div",{className:"h-full rounded-full",style:{width:`${S/g*100}%`,background:M(w,S)}})}),v.jsx("span",{className:"text-right text-sm tabular-nums text-zinc-400",children:S})]},w)})})]}),v.jsx(fn,{title:"Light / Dark",children:v.jsxs("table",{className:"w-full text-sm",children:[v.jsx("thead",{children:v.jsxs("tr",{className:"text-zinc-500",children:[v.jsx("th",{className:"text-left font-normal",children:"Class"}),v.jsx("th",{children:"light"}),v.jsx("th",{children:"dark"})]})}),v.jsx("tbody",{children:h.classes.map(w=>{const S=y=>y>0?v.jsx(K_,{className:"mx-auto h-4 w-4 text-green-500"}):v.jsx(ey,{className:"mx-auto h-4 w-4 text-red-500"});return v.jsxs("tr",{className:"border-t border-zinc-800",children:[v.jsxs("td",{className:"py-1 text-zinc-300",children:[v.jsx(Gx,{label:w})," ",v.jsx("span",{className:"text-xs text-zinc-500",children:w})]}),v.jsx("td",{children:S(h.light[w]||0)}),v.jsx("td",{children:S(h.dark[w]||0)})]},w)})})]})})]}),v.jsx(fn,{title:"Warnings",children:h.warnings.length?v.jsx("ul",{className:"space-y-1 text-sm",children:h.warnings.map((w,S)=>v.jsxs("li",{className:"flex items-center gap-2 text-amber-400",children:[v.jsx(Cm,{className:"h-4 w-4 shrink-0"})," ",w]},S))}):v.jsx("span",{className:"text-sm text-green-500",children:"none"})}),v.jsxs(fn,{title:`Browse crops (${x})`,right:v.jsxs("span",{className:"flex items-center gap-1 text-xs text-zinc-500",children:[v.jsx(dw,{className:"h-3.5 w-3.5"}),r?`${r.label} (${r.crops.length})`:"Click a class"]}),children:[f&&v.jsx("div",{className:"mb-2 rounded-lg bg-red-950/60 px-3 py-1.5 text-sm text-red-300",children:f}),r&&t&&v.jsx("img",{src:`/api/datasets/${t}/montage/${r.label}?n=64`,alt:`${r.label} montage`,title:`64 sample ${r.label} crops (from the packed memmap)`,className:"mb-3 max-w-xl rounded-lg border border-zinc-800"},`${t}-${r.label}`),r?v.jsx("div",{className:"grid grid-cols-[repeat(auto-fill,56px)] gap-1.5",children:r.crops.map((w,S)=>w.url?v.jsx("img",{src:w.url,title:`${w.session_id} ${w.frame} ${w.square}`,alt:`square ${w.square}`,className:"h-[74px] w-[56px] rounded border border-zinc-800 object-cover"},S):v.jsx("div",{title:`${w.session_id} ${w.frame} ${w.square} — packed (no file)`,className:"flex h-[74px] w-[56px] items-center justify-center rounded border border-dashed border-zinc-700 text-[9px] text-zinc-600",children:"packed"},S))}):v.jsx("span",{className:"text-sm text-zinc-500",children:"Select a class on the left to view crops."})]})]})}function jx({series:i,yMin:e=0,yMax:t=1}){const c=i.flatMap(x=>x.data.map(g=>g.x)),d=Math.max(1,...c),h=x=>30+540*x/d,f=x=>170-140*(x-e)/Math.max(1e-9,t-e),m=4;return v.jsxs("div",{children:[v.jsxs("svg",{viewBox:"0 0 600 200",className:"w-full",style:{height:200},preserveAspectRatio:"none",children:[Array.from({length:m+1},(x,g)=>{const M=e+(t-e)*g/m;return v.jsxs("g",{children:[v.jsx("line",{x1:30,y1:f(M),x2:570,y2:f(M),stroke:"#27272a",strokeWidth:1}),v.jsx("text",{x:4,y:f(M)+3,fill:"#71717a",fontSize:10,children:M.toFixed(t<=1?2:1)})]},g)}),i.map(x=>x.data.length?v.jsx("polyline",{fill:"none",stroke:x.color,strokeWidth:2,strokeLinejoin:"round",points:x.data.map(g=>`${h(g.x).toFixed(1)},${f(g.y).toFixed(1)}`).join(" ")},x.name):null)]}),v.jsx("div",{className:"mt-1 flex flex-wrap gap-4 text-xs text-zinc-400",children:i.map(x=>v.jsxs("span",{className:"flex items-center gap-1.5",children:[v.jsx("span",{className:"inline-block h-2 w-2 rounded-full",style:{background:x.color}}),x.name]},x.name))})]})}const pu="w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100";function Rw(i){const e={};for(const t of i)e[t.true]||(e[t.true]=[]),e[t.true].push(t);return Object.values(e)}function Aw({groups:i}){return v.jsx("div",{className:"mt-3 space-y-3",children:i.map(e=>v.jsxs("div",{className:"flex items-start gap-3",children:[v.jsx("div",{className:"w-10 shrink-0 pt-6 text-right text-sm font-medium text-zinc-400",children:e[0].true}),v.jsx("div",{className:"flex flex-wrap gap-3",children:e.map((t,r)=>v.jsxs("div",{className:"text-center",children:[v.jsxs("div",{className:"grid grid-cols-2 gap-0.5",children:[v.jsx("img",{src:t.orig,alt:t.true,className:"w-12 rounded border border-zinc-800"}),v.jsx("img",{src:t.overlay,alt:"Grad-CAM",className:"w-12 rounded border border-zinc-800"})]}),v.jsxs("div",{className:"mt-1 text-xs",children:[t.pred!==t.true?v.jsxs("span",{className:"text-amber-500",children:["→",t.pred]}):v.jsx("span",{className:"text-zinc-600",children:"✓"}),v.jsxs("span",{className:"text-zinc-600",children:[" ",(t.prob*100).toFixed(0),"%"]})]})]},r))})]},e[0].true))})}function Pw({items:i}){return v.jsx("div",{className:"mt-3 space-y-1",children:i.map(e=>{const t=Math.round(e.piece_frac*100),r=e.cls!=="empty"&&t<45;return v.jsxs("div",{className:"flex items-center gap-2 text-xs",children:[v.jsx("div",{className:`w-10 shrink-0 text-right font-medium ${r?"text-rose-400":"text-zinc-400"}`,children:e.cls}),v.jsxs("div",{className:"flex h-4 flex-1 overflow-hidden rounded bg-zinc-800",children:[v.jsx("div",{className:"h-full bg-emerald-600",style:{width:`${t}%`}}),v.jsx("div",{className:"h-full bg-rose-700",style:{width:`${100-t}%`}})]}),v.jsxs("div",{className:"w-28 shrink-0 text-zinc-500",children:[t,"% piece · conf ",(e.base_prob*100).toFixed(0),"%"]})]},e.cls)})})}function ny({r:i,evaling:e,onEval:t,wide:r}){const a=e===i;let l=" Eval";return r&&(l=a?" Evaluating…":" Run eval (test split)"),v.jsxs(Tt,{onClick:()=>t(i),disabled:a,className:r?"px-3 py-1.5 text-sm":"px-2 py-1 text-xs",title:"Run eval (test split) — generates metrics + confusion matrix",children:[a?v.jsx(Nn,{className:"h-3.5 w-3.5 animate-spin"}):v.jsx(cw,{className:"h-3.5 w-3.5"}),l]})}function Nw({run:i,evaling:e,onEval:t}){return i?v.jsxs("div",{className:"flex items-center gap-3",children:[v.jsx(ny,{r:i,evaling:e,onEval:t,wide:!0}),v.jsx("span",{className:"text-xs text-zinc-500",children:"generates metrics + confusion matrix for this run"})]}):v.jsx("span",{className:"text-sm text-zinc-500",children:"No eval yet — select a run above."})}function Lw(){var T,ee,oe;const[i,e]=G.useState([]),[t,r]=G.useState(""),[a,l]=G.useState(""),[c,d]=G.useState([]),[h,f]=G.useState({}),[m,x]=G.useState({running:!1}),[g,M]=G.useState(""),[E,w]=G.useState(null),[S,y]=G.useState(null),[N,L]=G.useState("smallcnn"),[C,D]=G.useState("combined"),[P,U]=G.useState(30),[b,I]=G.useState(256),[X,O]=G.useState(3e-4),[K,se]=G.useState(7),[fe,Y]=G.useState(""),[me,B]=G.useState([]),[$,ne]=G.useState(!1),[ce,H]=G.useState(3),[F,Te]=G.useState([]),[Oe,ze]=G.useState(!1),ie=G.useRef(null),xe=Ea({queryKey:["datasets"],queryFn:()=>Qt("/api/datasets")}).data??[],Fe=xe.find(z=>z.name===a);G.useEffect(()=>{if(!xe.length||a)return;const z=window.setTimeout(()=>l(xe[0].name),0);return()=>window.clearTimeout(z)},[xe,a]);const Xe=G.useCallback(async()=>{const z=await Qt("/api/runs");e(z),z.length&&!t&&Qe(z[0].run)},[t]);G.useEffect(()=>{const z=window.setTimeout(()=>{Xe()},0);return()=>{window.clearTimeout(z),clearInterval(ie.current)}},[Xe]);async function Qe(z){r(z),M(""),B([]),Te([]);try{d((await Qt(`/api/runs/${z}/metrics`)).metrics),f((await Qt(`/api/runs/${z}/eval`)).evals)}catch(ye){M(ye.message)}}async function It(){if(t){ne(!0),M("");try{B((await Qt(`/api/runs/${t}/gradcam?per_class=${ce}`)).items)}catch(z){M(z.message)}finally{ne(!1)}}}async function dt(){if(t){ze(!0),M("");try{Te((await Qt(`/api/runs/${t}/reliance`)).items)}catch(z){M(z.message)}finally{ze(!1)}}}async function wt(z){M(""),y(z);try{const ye=await tn(`/api/runs/${z}/eval`,{});if(!ye.ok){M(ye.output||"eval failed");return}t===z&&Qe(z),Xe()}catch(ye){M(ye.message)}finally{y(null)}}async function St(z){if(window.confirm(`Delete model "${z}"? (directory + weights will be removed)`)){try{await Wl(`/api/runs/${z}`)}catch(ye){M(ye.message);return}M(""),t===z&&(r(""),d([]),f({}),B([]),Te([])),Xe()}}async function vt(z){w(z);try{const ye=await tn(`/api/runs/${z}/export`,{});ye.ok?M(`${z}: ONNX exported ✓ — restart tracker to use`):M(ye.output||"export failed"),Xe()}catch(ye){M(ye.message)}finally{w(null)}}const Ut=z=>z==null?"—":(z*100).toFixed(1)+" %";async function qt(){if(M(""),!a){M("No dataset — build one in the Datasets tab first.");return}try{await tn("/api/train",{backbone:N,head:C,epochs:P,batch_size:b,lr:X,patience:K,no_amp:!0,dataset:a,resume:fe||void 0}),clearInterval(ie.current),ie.current=setInterval(Xt,2500),Xt()}catch(z){M(z.message)}}async function Xt(){var ye;const z=await Qt("/api/train/status");x(z),(ye=z.metrics)!=null&&ye.length&&d(z.metrics),z.running||(clearInterval(ie.current),Xe())}async function $t(){var z;try{await tn("/api/train/stop")}catch{}clearInterval(ie.current);try{const ye=await Qt("/api/train/status");x({...ye,running:!1}),ye.run&&r(ye.run),(z=ye.metrics)!=null&&z.length&&d(ye.metrics)}catch{x({running:!1,state:"stopped"})}Xe()}const Nt=[{name:"train_loss",color:"#ef4444",data:c.map(z=>({x:z.epoch,y:z.train_loss}))},{name:"val_loss",color:"#eab308",data:c.map(z=>({x:z.epoch,y:z.val_loss??0}))}],Ht=Math.max(.5,...c.map(z=>Math.max(z.train_loss||0,z.val_loss||0))),Z=[{name:"square_acc",color:"#38bdf8",data:c.map(z=>({x:z.epoch,y:z.val_acc??0}))},{name:"macro_recall",color:"#22c55e",data:c.map(z=>({x:z.epoch,y:z.val_macro_recall??0}))},{name:"board_acc",color:"#e4e4e7",data:c.map(z=>({x:z.epoch,y:z.val_board_acc??0}))}],pn=me.length?"Recompute":"Show heatmaps",mt=Rw(me),k=F.length?"Recompute":"Run test";return v.jsxs("div",{className:"space-y-4",children:[v.jsxs(fn,{children:[v.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[v.jsxs(oa,{label:"Dataset",value:a,onChange:z=>l(z.target.value),children:[xe.length===0&&v.jsx("option",{value:"",children:"— none built —"}),xe.map(z=>{var ye;return v.jsxs("option",{value:z.name,children:[z.name," (",((ye=z.counts)==null?void 0:ye.final)??"?",")"]},z.name)})]}),v.jsxs(oa,{label:"Backbone",value:N,onChange:z=>L(z.target.value),title:"CNN architecture: smallcnn (lightweight custom), mobilenet_v3/v4 (fast mobile), efficientnet/resnet (timm — heavier, more accurate)",children:[v.jsx("option",{value:"smallcnn",children:"smallcnn"}),v.jsx("option",{value:"mobilenet_v3_small",children:"mobilenet_v3_small"}),v.jsx("option",{value:"mobilenetv4_conv_small",children:"mobilenetv4_conv_small (timm)"}),v.jsx("option",{value:"mobilenetv4_conv_medium",children:"mobilenetv4_conv_medium (timm)"}),v.jsx("option",{value:"efficientnet_b0",children:"efficientnet_b0 (timm)"}),v.jsx("option",{value:"resnet18",children:"resnet18 (timm)"})]}),v.jsxs(oa,{label:"Head",value:C,onChange:z=>D(z.target.value),title:"Classification head: combined (single fc), factored (type+color), twostage (occupancy then piece identity)",children:[v.jsx("option",{value:"combined",children:"combined"}),v.jsx("option",{value:"factored",children:"factored"}),v.jsx("option",{value:"twostage",children:"twostage (Occ→Piece)"})]}),v.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Number of full passes over the training data. More epochs = more learning, but risk of overfitting.",children:["Epochs",v.jsx("input",{type:"number",min:1,value:P,onChange:z=>U(+z.target.value),className:pu})]}),v.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Samples processed at once. Larger batch = faster training, more GPU memory. Small batches (32-64) generalize better.",children:["Batch",v.jsx("input",{type:"number",min:1,value:b,onChange:z=>I(+z.target.value),className:pu})]}),v.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Learning rate: step size for gradient descent. Higher = faster learning but may overshoot; 0.0003 is a safe default for AdamW.",children:["LR",v.jsx("input",{type:"number",step:1e-4,min:0,value:X,onChange:z=>O(+z.target.value),className:pu})]}),v.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Early stopping: epochs without macro_recall progress before aborting.",children:["Patience",v.jsx("input",{type:"number",min:1,value:K,onChange:z=>se(+z.target.value),className:pu})]}),v.jsxs(oa,{label:"Resume",value:fe,onChange:z=>Y(z.target.value),children:[v.jsx("option",{value:"",children:"from scratch"}),i.some(z=>String(z.dataset||"").startsWith("pretrain-"))&&v.jsx("optgroup",{label:"Base models (pretrained)",children:i.filter(z=>String(z.dataset||"").startsWith("pretrain-")).map(z=>v.jsxs("option",{value:z.run,children:["🔹 Base · ",z.run]},z.run))}),v.jsx("optgroup",{label:"Own runs",children:i.filter(z=>!String(z.dataset||"").startsWith("pretrain-")).map(z=>v.jsx("option",{value:z.run,children:z.run},z.run))})]}),v.jsxs(Tt,{variant:"primary",onClick:qt,disabled:m.running||!a,children:[m.running?v.jsx(Nn,{className:"h-4 w-4 animate-spin"}):v.jsx(Tm,{className:"h-4 w-4"})," Start training"]}),m.running&&v.jsxs(Tt,{onClick:$t,children:[v.jsx(Z_,{className:"h-4 w-4"})," Cancel"]})]}),Fe&&v.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:["Split: train ",((T=Fe.split_counts)==null?void 0:T.train)??"?"," · val ",((ee=Fe.split_counts)==null?void 0:ee.val)??"?"," · test ",((oe=Fe.split_counts)==null?void 0:oe.test)??"?"]}),(m.running||c.length>0)&&v.jsxs("div",{className:"mt-3",children:[v.jsxs("div",{className:"mb-1 flex justify-between text-xs text-zinc-400",children:[v.jsxs("span",{children:[m.running?`running… (${m.run})`:m.state==="stopped"||m.state==="crashed"?"aborted":"Progress"," · epoch ",c.length,"/",P]}),v.jsxs("span",{children:["board_acc ",c.length?((c[c.length-1].val_board_acc??0)*100).toFixed(1)+" %":"—"]})]}),v.jsx("div",{className:"h-2 overflow-hidden rounded-full bg-zinc-800",children:v.jsx("div",{className:`h-full rounded-full transition-all ${m.state==="stopped"||m.state==="crashed"?"bg-amber-500":"bg-sky-500"}`,style:{width:`${Math.min(100,c.length/Math.max(1,P)*100)}%`}})})]}),!m.running&&m.state==="done"&&v.jsx("p",{className:"mt-2 text-xs text-green-500",children:"done ✓"}),!m.running&&(m.state==="stopped"||m.state==="crashed")&&v.jsxs("p",{className:"mt-2 text-xs text-amber-400",children:[m.state==="crashed"?"aborted (crash)":"aborted"," at epoch ",c.length,' — partial progress is preserved; "best.pt" saved, "Resume" picks up here.']}),g&&v.jsx("p",{className:"mt-2 text-sm text-amber-400",children:g})]}),v.jsxs(fn,{title:"Models",right:v.jsxs("span",{className:"text-xs text-zinc-500",children:[i.length," Run(s)"]}),children:[i.length===0?v.jsx("span",{className:"text-sm text-zinc-500",children:"No model trained yet."}):v.jsx("div",{className:"overflow-x-auto",children:v.jsxs("table",{className:"w-full text-sm",children:[v.jsx("thead",{children:v.jsxs("tr",{className:"text-zinc-500",children:[v.jsx("th",{className:"text-left font-normal",children:"Run"}),v.jsx("th",{className:"text-left font-normal",children:"Backbone"}),v.jsx("th",{className:"text-left font-normal",children:"Dataset"}),v.jsx("th",{className:"text-right font-normal",children:"Cls"}),v.jsx("th",{className:"text-right font-normal",children:"Ep."}),"                ",v.jsx("th",{className:"text-right font-normal",title:"best val board_acc (all 64 squares correct)",children:"board_acc"}),v.jsx("th",{className:"text-right font-normal",title:"best val square_acc (fraction of correct squares — drives board_acc ≈ square_acc^64)",children:"square_acc"}),v.jsx("th",{className:"text-right font-normal",title:"best val macro_recall",children:"macro_rec"}),v.jsx("th",{className:"text-right font-normal",title:"test-set board_acc (after eval)",children:"test"}),v.jsx("th",{className:"text-right font-normal",children:"Action"})]})}),v.jsx("tbody",{children:i.map(z=>v.jsxs("tr",{className:`border-t border-zinc-800 ${t===z.run?"bg-zinc-800/50":""}`,children:[v.jsxs("td",{className:"py-1.5 text-zinc-200",children:[z.run,z.resumed_from&&v.jsx("span",{className:"ml-1 text-[10px] text-zinc-500",title:`resumed from ${z.resumed_from}`,children:"↻"}),z.has_occluded&&v.jsx("span",{className:"ml-1 rounded bg-zinc-700 px-1 text-[9px] text-amber-300",children:"+occ"})]}),v.jsx("td",{className:"text-zinc-400",children:z.backbone}),v.jsx("td",{className:"text-zinc-400",children:z.dataset??"—"}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:z.n_classes}),v.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:z.epochs_done}),v.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:Ut(z.best_board_acc)}),v.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:Ut(z.best_square_acc)}),v.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:Ut(z.best_macro_recall)}),v.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:Ut(z.test_board_acc)}),v.jsx("td",{className:"py-1",children:v.jsxs("div",{className:"flex justify-end gap-1.5",children:[v.jsxs(Tt,{onClick:()=>Qe(z.run),className:"px-2 py-1 text-xs",children:[v.jsx(Xu,{className:"h-3.5 w-3.5"})," View"]}),v.jsx(ny,{r:z.run,evaling:S,onEval:wt}),v.jsxs(Tt,{onClick:()=>vt(z.run),disabled:E===z.run,className:"px-2 py-1 text-xs",title:z.has_onnx?"model.onnx exists":"Export to ONNX for faster inference",children:[E===z.run?v.jsx(Nn,{className:"h-3.5 w-3.5 animate-spin"}):z.has_onnx?v.jsx(K_,{className:"h-3.5 w-3.5 text-green-400"}):v.jsx(fw,{className:"h-3.5 w-3.5"})," Export"]}),v.jsxs(Tt,{onClick:()=>St(z.run),className:"px-2 py-1 text-xs text-red-300 hover:text-red-200",children:[v.jsx(Ta,{className:"h-3.5 w-3.5"})," Delete"]})]})})]},z.run))})]})}),v.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:['"View" loads curves & eval below · "test" appears after ',v.jsx("code",{children:"chesslab eval --run …"}),' · ↻ = continued training · +occ = model knows "occluded" class.']})]}),v.jsxs("div",{className:"grid gap-4 lg:grid-cols-2",children:[v.jsx(fn,{title:"Loss",children:v.jsx(jx,{series:Nt,yMin:0,yMax:Ht})}),v.jsx(fn,{title:"Metrics (0-1) — macro_recall is the honest number",children:v.jsx(jx,{series:Z,yMin:0,yMax:1})})]}),v.jsx(fn,{title:"Evaluation",children:Object.keys(h).length?v.jsx("div",{className:"space-y-4",children:Object.entries(h).map(([z,ye])=>{const Le=Object.entries(ye.recall||{}).sort((ge,ve)=>ge[1]-ve[1]).slice(0,3);return v.jsxs("div",{children:[v.jsxs("div",{className:"text-sm",children:[v.jsx("span",{className:"font-medium uppercase text-zinc-400",children:z})," · board_acc ",v.jsxs("b",{children:[(ye.board_acc*100).toFixed(1),"%"]})," · square_acc ",(ye.square_acc*100).toFixed(1),"%"]}),v.jsxs("div",{className:"text-xs text-zinc-500",children:["weakest classes: ",Le.map(([ge,ve])=>`${ge} ${(ve*100).toFixed(0)}%`).join(", ")]}),ye.confusion_png&&v.jsx("img",{src:ye.confusion_png,alt:"Confusion Matrix",className:"mt-2 max-w-md rounded-lg border border-zinc-800"})]},z)})}):v.jsx(Nw,{run:t,evaling:S,onEval:wt})}),v.jsxs(fn,{title:"Grad-CAM — which pixels drove the decision",children:[v.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[v.jsx(oa,{label:"Samples / class",value:String(ce),onChange:z=>H(+z.target.value),children:[1,2,3,5,8].map(z=>v.jsx("option",{value:z,children:z},z))}),v.jsxs(Tt,{onClick:It,disabled:!t||$,children:[$?v.jsx(Nn,{className:"h-4 w-4 animate-spin"}):v.jsx(Xu,{className:"h-4 w-4"}),$?"Computing…":pn]}),v.jsx("span",{className:"text-xs text-zinc-500",children:"Test crops per class · each pair = original + heatmap; red = pixels most relevant to the predicted class."})]}),mt.length>0&&v.jsx(Aw,{groups:mt})]}),v.jsxs(fn,{title:"Background reliance — does it read the piece or the board?",children:[v.jsxs("div",{className:"flex items-center gap-3",children:[v.jsxs(Tt,{onClick:dt,disabled:!t||Oe,children:[Oe?v.jsx(Nn,{className:"h-4 w-4 animate-spin"}):v.jsx(Xu,{className:"h-4 w-4"}),Oe?"Testing…":k]}),v.jsxs("span",{className:"text-xs text-zinc-500",children:["Occludes piece (center) vs. board (border ring) and measures the confidence drop. ",v.jsx("span",{className:"text-emerald-500",children:"green = piece"})," / ",v.jsx("span",{className:"text-rose-500",children:"red = background"}),". Low green on a piece class = shortcut learning. (",v.jsx("code",{children:"empty"})," is expected to be red.)"]})]}),F.length>0&&v.jsx(Pw,{items:F})]}),m.log_tail&&v.jsx(fn,{title:"Log",children:v.jsx("pre",{className:"max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 text-xs text-zinc-400",children:m.log_tail})})]})}/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Am="185",go={ROTATE:0,DOLLY:1,PAN:2},po={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Dw=0,Wx=1,Iw=2,$u=1,Uw=2,Ol=3,Fs=0,hi=1,pr=2,jr=0,xo=1,Xx=2,$x=3,qx=4,Fw=5,la=100,Ow=101,kw=102,zw=103,Bw=104,Hw=200,Vw=201,Gw=202,jw=203,gp=204,xp=205,Ww=206,Xw=207,$w=208,qw=209,Yw=210,Kw=211,Qw=212,Zw=213,Jw=214,vp=0,_p=1,yp=2,Do=3,Sp=4,Mp=5,Ep=6,wp=7,Pm=0,eb=1,tb=2,xr=0,iy=1,ry=2,sy=3,Nm=4,ay=5,oy=6,ly=7,cy=300,wa=301,Io=302,pf=303,mf=304,_d=306,bp=1e3,Gr=1001,Tp=1002,Fn=1003,nb=1004,mu=1005,Wn=1006,gf=1007,da=1008,Si=1009,uy=1010,dy=1011,Xl=1012,Lm=1013,yr=1014,mr=1015,qr=1016,Dm=1017,Im=1018,$l=1020,hy=35902,fy=35899,py=1021,my=1022,Ki=1023,Yr=1026,ha=1027,gy=1028,Um=1029,ba=1030,Fm=1031,Om=1033,qu=33776,Yu=33777,Ku=33778,Qu=33779,Cp=35840,Rp=35841,Ap=35842,Pp=35843,Np=36196,Lp=37492,Dp=37496,Ip=37488,Up=37489,sd=37490,Fp=37491,Op=37808,kp=37809,zp=37810,Bp=37811,Hp=37812,Vp=37813,Gp=37814,jp=37815,Wp=37816,Xp=37817,$p=37818,qp=37819,Yp=37820,Kp=37821,Qp=36492,Zp=36494,Jp=36495,em=36283,tm=36284,ad=36285,nm=36286,ib=3200,od=0,rb=1,ws="",Jn="srgb",ld="srgb-linear",cd="linear",jt="srgb",Qa=7680,Yx=519,sb=512,ab=513,ob=514,km=515,lb=516,cb=517,zm=518,ub=519,Kx=35044,Qx="300 es",gr=2e3,ql=2001;function db(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function Yl(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function hb(){const i=Yl("canvas");return i.style.display="block",i}const Zx={};function Jx(...i){const e="THREE."+i.shift();console.log(e,...i)}function xy(i){const e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function lt(...i){i=xy(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function Dt(...i){i=xy(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function vo(...i){const e=i.join(" ");e in Zx||(Zx[e]=!0,lt(...i))}function fb(i,e,t){return new Promise(function(r,a){function l(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:a();break;case i.TIMEOUT_EXPIRED:setTimeout(l,t);break;default:r()}}setTimeout(l,t)})}const pb={[vp]:_p,[yp]:Ep,[Sp]:wp,[Do]:Mp,[_p]:vp,[Ep]:yp,[wp]:Sp,[Mp]:Do};class ks{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const r=this._listeners;r[e]===void 0&&(r[e]=[]),r[e].indexOf(t)===-1&&r[e].push(t)}hasEventListener(e,t){const r=this._listeners;return r===void 0?!1:r[e]!==void 0&&r[e].indexOf(t)!==-1}removeEventListener(e,t){const r=this._listeners;if(r===void 0)return;const a=r[e];if(a!==void 0){const l=a.indexOf(t);l!==-1&&a.splice(l,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const r=t[e.type];if(r!==void 0){e.target=this;const a=r.slice(0);for(let l=0,c=a.length;l<c;l++)a[l].call(this,e);e.target=null}}}const Vn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Zu=Math.PI/180,im=180/Math.PI;function ic(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(Vn[i&255]+Vn[i>>8&255]+Vn[i>>16&255]+Vn[i>>24&255]+"-"+Vn[e&255]+Vn[e>>8&255]+"-"+Vn[e>>16&15|64]+Vn[e>>24&255]+"-"+Vn[t&63|128]+Vn[t>>8&255]+"-"+Vn[t>>16&255]+Vn[t>>24&255]+Vn[r&255]+Vn[r>>8&255]+Vn[r>>16&255]+Vn[r>>24&255]).toLowerCase()}function bt(i,e,t){return Math.max(e,Math.min(t,i))}function mb(i,e){return(i%e+e)%e}function xf(i,e,t){return(1-t)*i+t*e}function Cl(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function li(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}const gb={DEG2RAD:Zu},Wm=class Wm{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,r=this.y,a=e.elements;return this.x=a[0]*t+a[3]*r+a[6],this.y=a[1]*t+a[4]*r+a[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=bt(this.x,e.x,t.x),this.y=bt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=bt(this.x,e,t),this.y=bt(this.y,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(bt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const r=this.dot(e)/t;return Math.acos(bt(r,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,r=this.y-e.y;return t*t+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const r=Math.cos(t),a=Math.sin(t),l=this.x-e.x,c=this.y-e.y;return this.x=l*r-c*a+e.x,this.y=l*a+c*r+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};Wm.prototype.isVector2=!0;let ut=Wm;class Os{constructor(e=0,t=0,r=0,a=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=r,this._w=a}static slerpFlat(e,t,r,a,l,c,d){let h=r[a+0],f=r[a+1],m=r[a+2],x=r[a+3],g=l[c+0],M=l[c+1],E=l[c+2],w=l[c+3];if(x!==w||h!==g||f!==M||m!==E){let S=h*g+f*M+m*E+x*w;S<0&&(g=-g,M=-M,E=-E,w=-w,S=-S);let y=1-d;if(S<.9995){const N=Math.acos(S),L=Math.sin(N);y=Math.sin(y*N)/L,d=Math.sin(d*N)/L,h=h*y+g*d,f=f*y+M*d,m=m*y+E*d,x=x*y+w*d}else{h=h*y+g*d,f=f*y+M*d,m=m*y+E*d,x=x*y+w*d;const N=1/Math.sqrt(h*h+f*f+m*m+x*x);h*=N,f*=N,m*=N,x*=N}}e[t]=h,e[t+1]=f,e[t+2]=m,e[t+3]=x}static multiplyQuaternionsFlat(e,t,r,a,l,c){const d=r[a],h=r[a+1],f=r[a+2],m=r[a+3],x=l[c],g=l[c+1],M=l[c+2],E=l[c+3];return e[t]=d*E+m*x+h*M-f*g,e[t+1]=h*E+m*g+f*x-d*M,e[t+2]=f*E+m*M+d*g-h*x,e[t+3]=m*E-d*x-h*g-f*M,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,r,a){return this._x=e,this._y=t,this._z=r,this._w=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const r=e._x,a=e._y,l=e._z,c=e._order,d=Math.cos,h=Math.sin,f=d(r/2),m=d(a/2),x=d(l/2),g=h(r/2),M=h(a/2),E=h(l/2);switch(c){case"XYZ":this._x=g*m*x+f*M*E,this._y=f*M*x-g*m*E,this._z=f*m*E+g*M*x,this._w=f*m*x-g*M*E;break;case"YXZ":this._x=g*m*x+f*M*E,this._y=f*M*x-g*m*E,this._z=f*m*E-g*M*x,this._w=f*m*x+g*M*E;break;case"ZXY":this._x=g*m*x-f*M*E,this._y=f*M*x+g*m*E,this._z=f*m*E+g*M*x,this._w=f*m*x-g*M*E;break;case"ZYX":this._x=g*m*x-f*M*E,this._y=f*M*x+g*m*E,this._z=f*m*E-g*M*x,this._w=f*m*x+g*M*E;break;case"YZX":this._x=g*m*x+f*M*E,this._y=f*M*x+g*m*E,this._z=f*m*E-g*M*x,this._w=f*m*x-g*M*E;break;case"XZY":this._x=g*m*x-f*M*E,this._y=f*M*x-g*m*E,this._z=f*m*E+g*M*x,this._w=f*m*x+g*M*E;break;default:lt("Quaternion: .setFromEuler() encountered an unknown order: "+c)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const r=t/2,a=Math.sin(r);return this._x=e.x*a,this._y=e.y*a,this._z=e.z*a,this._w=Math.cos(r),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,r=t[0],a=t[4],l=t[8],c=t[1],d=t[5],h=t[9],f=t[2],m=t[6],x=t[10],g=r+d+x;if(g>0){const M=.5/Math.sqrt(g+1);this._w=.25/M,this._x=(m-h)*M,this._y=(l-f)*M,this._z=(c-a)*M}else if(r>d&&r>x){const M=2*Math.sqrt(1+r-d-x);this._w=(m-h)/M,this._x=.25*M,this._y=(a+c)/M,this._z=(l+f)/M}else if(d>x){const M=2*Math.sqrt(1+d-r-x);this._w=(l-f)/M,this._x=(a+c)/M,this._y=.25*M,this._z=(h+m)/M}else{const M=2*Math.sqrt(1+x-r-d);this._w=(c-a)/M,this._x=(l+f)/M,this._y=(h+m)/M,this._z=.25*M}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let r=e.dot(t)+1;return r<1e-8?(r=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=r):(this._x=0,this._y=-e.z,this._z=e.y,this._w=r)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=r),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(bt(this.dot(e),-1,1)))}rotateTowards(e,t){const r=this.angleTo(e);if(r===0)return this;const a=Math.min(1,t/r);return this.slerp(e,a),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const r=e._x,a=e._y,l=e._z,c=e._w,d=t._x,h=t._y,f=t._z,m=t._w;return this._x=r*m+c*d+a*f-l*h,this._y=a*m+c*h+l*d-r*f,this._z=l*m+c*f+r*h-a*d,this._w=c*m-r*d-a*h-l*f,this._onChangeCallback(),this}slerp(e,t){let r=e._x,a=e._y,l=e._z,c=e._w,d=this.dot(e);d<0&&(r=-r,a=-a,l=-l,c=-c,d=-d);let h=1-t;if(d<.9995){const f=Math.acos(d),m=Math.sin(f);h=Math.sin(h*f)/m,t=Math.sin(t*f)/m,this._x=this._x*h+r*t,this._y=this._y*h+a*t,this._z=this._z*h+l*t,this._w=this._w*h+c*t,this._onChangeCallback()}else this._x=this._x*h+r*t,this._y=this._y*h+a*t,this._z=this._z*h+l*t,this._w=this._w*h+c*t,this.normalize();return this}slerpQuaternions(e,t,r){return this.copy(e).slerp(t,r)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),r=Math.random(),a=Math.sqrt(1-r),l=Math.sqrt(r);return this.set(a*Math.sin(e),a*Math.cos(e),l*Math.sin(t),l*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}const Xm=class Xm{constructor(e=0,t=0,r=0){this.x=e,this.y=t,this.z=r}set(e,t,r){return r===void 0&&(r=this.z),this.x=e,this.y=t,this.z=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(ev.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(ev.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,r=this.y,a=this.z,l=e.elements;return this.x=l[0]*t+l[3]*r+l[6]*a,this.y=l[1]*t+l[4]*r+l[7]*a,this.z=l[2]*t+l[5]*r+l[8]*a,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,r=this.y,a=this.z,l=e.elements,c=1/(l[3]*t+l[7]*r+l[11]*a+l[15]);return this.x=(l[0]*t+l[4]*r+l[8]*a+l[12])*c,this.y=(l[1]*t+l[5]*r+l[9]*a+l[13])*c,this.z=(l[2]*t+l[6]*r+l[10]*a+l[14])*c,this}applyQuaternion(e){const t=this.x,r=this.y,a=this.z,l=e.x,c=e.y,d=e.z,h=e.w,f=2*(c*a-d*r),m=2*(d*t-l*a),x=2*(l*r-c*t);return this.x=t+h*f+c*x-d*m,this.y=r+h*m+d*f-l*x,this.z=a+h*x+l*m-c*f,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,r=this.y,a=this.z,l=e.elements;return this.x=l[0]*t+l[4]*r+l[8]*a,this.y=l[1]*t+l[5]*r+l[9]*a,this.z=l[2]*t+l[6]*r+l[10]*a,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=bt(this.x,e.x,t.x),this.y=bt(this.y,e.y,t.y),this.z=bt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=bt(this.x,e,t),this.y=bt(this.y,e,t),this.z=bt(this.z,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(bt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this.z=e.z+(t.z-e.z)*r,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const r=e.x,a=e.y,l=e.z,c=t.x,d=t.y,h=t.z;return this.x=a*h-l*d,this.y=l*c-r*h,this.z=r*d-a*c,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const r=e.dot(this)/t;return this.copy(e).multiplyScalar(r)}projectOnPlane(e){return vf.copy(this).projectOnVector(e),this.sub(vf)}reflect(e){return this.sub(vf.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const r=this.dot(e)/t;return Math.acos(bt(r,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,r=this.y-e.y,a=this.z-e.z;return t*t+r*r+a*a}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,r){const a=Math.sin(t)*e;return this.x=a*Math.sin(r),this.y=Math.cos(t)*e,this.z=a*Math.cos(r),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,r){return this.x=e*Math.sin(t),this.y=r,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),r=this.setFromMatrixColumn(e,1).length(),a=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=r,this.z=a,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,r=Math.sqrt(1-t*t);return this.x=r*Math.cos(e),this.y=t,this.z=r*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};Xm.prototype.isVector3=!0;let te=Xm;const vf=new te,ev=new Os,$m=class $m{constructor(e,t,r,a,l,c,d,h,f){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,r,a,l,c,d,h,f)}set(e,t,r,a,l,c,d,h,f){const m=this.elements;return m[0]=e,m[1]=a,m[2]=d,m[3]=t,m[4]=l,m[5]=h,m[6]=r,m[7]=c,m[8]=f,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,r=e.elements;return t[0]=r[0],t[1]=r[1],t[2]=r[2],t[3]=r[3],t[4]=r[4],t[5]=r[5],t[6]=r[6],t[7]=r[7],t[8]=r[8],this}extractBasis(e,t,r){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),r.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const r=e.elements,a=t.elements,l=this.elements,c=r[0],d=r[3],h=r[6],f=r[1],m=r[4],x=r[7],g=r[2],M=r[5],E=r[8],w=a[0],S=a[3],y=a[6],N=a[1],L=a[4],C=a[7],D=a[2],P=a[5],U=a[8];return l[0]=c*w+d*N+h*D,l[3]=c*S+d*L+h*P,l[6]=c*y+d*C+h*U,l[1]=f*w+m*N+x*D,l[4]=f*S+m*L+x*P,l[7]=f*y+m*C+x*U,l[2]=g*w+M*N+E*D,l[5]=g*S+M*L+E*P,l[8]=g*y+M*C+E*U,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],m=e[8];return t*c*m-t*d*f-r*l*m+r*d*h+a*l*f-a*c*h}invert(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],m=e[8],x=m*c-d*f,g=d*h-m*l,M=f*l-c*h,E=t*x+r*g+a*M;if(E===0)return this.set(0,0,0,0,0,0,0,0,0);const w=1/E;return e[0]=x*w,e[1]=(a*f-m*r)*w,e[2]=(d*r-a*c)*w,e[3]=g*w,e[4]=(m*t-a*h)*w,e[5]=(a*l-d*t)*w,e[6]=M*w,e[7]=(r*h-f*t)*w,e[8]=(c*t-r*l)*w,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,r,a,l,c,d){const h=Math.cos(l),f=Math.sin(l);return this.set(r*h,r*f,-r*(h*c+f*d)+c+e,-a*f,a*h,-a*(-f*c+h*d)+d+t,0,0,1),this}scale(e,t){return vo("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(_f.makeScale(e,t)),this}rotate(e){return vo("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(_f.makeRotation(-e)),this}translate(e,t){return vo("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(_f.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,-r,0,r,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,r=e.elements;for(let a=0;a<9;a++)if(t[a]!==r[a])return!1;return!0}fromArray(e,t=0){for(let r=0;r<9;r++)this.elements[r]=e[r+t];return this}toArray(e=[],t=0){const r=this.elements;return e[t]=r[0],e[t+1]=r[1],e[t+2]=r[2],e[t+3]=r[3],e[t+4]=r[4],e[t+5]=r[5],e[t+6]=r[6],e[t+7]=r[7],e[t+8]=r[8],e}clone(){return new this.constructor().fromArray(this.elements)}};$m.prototype.isMatrix3=!0;let pt=$m;const _f=new pt,tv=new pt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),nv=new pt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function xb(){const i={enabled:!0,workingColorSpace:ld,spaces:{},convert:function(a,l,c){return this.enabled===!1||l===c||!l||!c||(this.spaces[l].transfer===jt&&(a.r=Wr(a.r),a.g=Wr(a.g),a.b=Wr(a.b)),this.spaces[l].primaries!==this.spaces[c].primaries&&(a.applyMatrix3(this.spaces[l].toXYZ),a.applyMatrix3(this.spaces[c].fromXYZ)),this.spaces[c].transfer===jt&&(a.r=_o(a.r),a.g=_o(a.g),a.b=_o(a.b))),a},workingToColorSpace:function(a,l){return this.convert(a,this.workingColorSpace,l)},colorSpaceToWorking:function(a,l){return this.convert(a,l,this.workingColorSpace)},getPrimaries:function(a){return this.spaces[a].primaries},getTransfer:function(a){return a===ws?cd:this.spaces[a].transfer},getToneMappingMode:function(a){return this.spaces[a].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(a,l=this.workingColorSpace){return a.fromArray(this.spaces[l].luminanceCoefficients)},define:function(a){Object.assign(this.spaces,a)},_getMatrix:function(a,l,c){return a.copy(this.spaces[l].toXYZ).multiply(this.spaces[c].fromXYZ)},_getDrawingBufferColorSpace:function(a){return this.spaces[a].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(a=this.workingColorSpace){return this.spaces[a].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(a,l){return vo("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(a,l)},toWorkingColorSpace:function(a,l){return vo("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(a,l)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],r=[.3127,.329];return i.define({[ld]:{primaries:e,whitePoint:r,transfer:cd,toXYZ:tv,fromXYZ:nv,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Jn},outputColorSpaceConfig:{drawingBufferColorSpace:Jn}},[Jn]:{primaries:e,whitePoint:r,transfer:jt,toXYZ:tv,fromXYZ:nv,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Jn}}}),i}const At=xb();function Wr(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function _o(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Za;class vb{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let r;if(e instanceof HTMLCanvasElement)r=e;else{Za===void 0&&(Za=Yl("canvas")),Za.width=e.width,Za.height=e.height;const a=Za.getContext("2d");e instanceof ImageData?a.putImageData(e,0,0):a.drawImage(e,0,0,e.width,e.height),r=Za}return r.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Yl("canvas");t.width=e.width,t.height=e.height;const r=t.getContext("2d");r.drawImage(e,0,0,e.width,e.height);const a=r.getImageData(0,0,e.width,e.height),l=a.data;for(let c=0;c<l.length;c++)l[c]=Wr(l[c]/255)*255;return r.putImageData(a,0,0),t}else if(e.data){const t=e.data.slice(0);for(let r=0;r<t.length;r++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[r]=Math.floor(Wr(t[r]/255)*255):t[r]=Wr(t[r]);return{data:t,width:e.width,height:e.height}}else return lt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let _b=0;class Bm{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:_b++}),this.uuid=ic(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const r={uuid:this.uuid,url:""},a=this.data;if(a!==null){let l;if(Array.isArray(a)){l=[];for(let c=0,d=a.length;c<d;c++)a[c].isDataTexture?l.push(yf(a[c].image)):l.push(yf(a[c]))}else l=yf(a);r.url=l}return t||(e.images[this.uuid]=r),r}}function yf(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?vb.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(lt("Texture: Unable to serialize Texture."),{})}let yb=0;const Sf=new te;class Xn extends ks{constructor(e=Xn.DEFAULT_IMAGE,t=Xn.DEFAULT_MAPPING,r=Gr,a=Gr,l=Wn,c=da,d=Ki,h=Si,f=Xn.DEFAULT_ANISOTROPY,m=ws){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:yb++}),this.uuid=ic(),this.name="",this.source=new Bm(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=r,this.wrapT=a,this.magFilter=l,this.minFilter=c,this.anisotropy=f,this.format=d,this.internalFormat=null,this.type=h,this.offset=new ut(0,0),this.repeat=new ut(1,1),this.center=new ut(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new pt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=m,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Sf).x}get height(){return this.source.getSize(Sf).y}get depth(){return this.source.getSize(Sf).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const r=e[t];if(r===void 0){lt(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){lt(`Texture.setValues(): property '${t}' does not exist.`);continue}a&&r&&a.isVector2&&r.isVector2||a&&r&&a.isVector3&&r.isVector3||a&&r&&a.isMatrix3&&r.isMatrix3?a.copy(r):this[t]=r}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const r={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(r.userData=this.userData),t||(e.textures[this.uuid]=r),r}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==cy)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case bp:e.x=e.x-Math.floor(e.x);break;case Gr:e.x=e.x<0?0:1;break;case Tp:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case bp:e.y=e.y-Math.floor(e.y);break;case Gr:e.y=e.y<0?0:1;break;case Tp:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Xn.DEFAULT_IMAGE=null;Xn.DEFAULT_MAPPING=cy;Xn.DEFAULT_ANISOTROPY=1;const qm=class qm{constructor(e=0,t=0,r=0,a=1){this.x=e,this.y=t,this.z=r,this.w=a}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,r,a){return this.x=e,this.y=t,this.z=r,this.w=a,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,r=this.y,a=this.z,l=this.w,c=e.elements;return this.x=c[0]*t+c[4]*r+c[8]*a+c[12]*l,this.y=c[1]*t+c[5]*r+c[9]*a+c[13]*l,this.z=c[2]*t+c[6]*r+c[10]*a+c[14]*l,this.w=c[3]*t+c[7]*r+c[11]*a+c[15]*l,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,r,a,l;const h=e.elements,f=h[0],m=h[4],x=h[8],g=h[1],M=h[5],E=h[9],w=h[2],S=h[6],y=h[10];if(Math.abs(m-g)<.01&&Math.abs(x-w)<.01&&Math.abs(E-S)<.01){if(Math.abs(m+g)<.1&&Math.abs(x+w)<.1&&Math.abs(E+S)<.1&&Math.abs(f+M+y-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const L=(f+1)/2,C=(M+1)/2,D=(y+1)/2,P=(m+g)/4,U=(x+w)/4,b=(E+S)/4;return L>C&&L>D?L<.01?(r=0,a=.707106781,l=.707106781):(r=Math.sqrt(L),a=P/r,l=U/r):C>D?C<.01?(r=.707106781,a=0,l=.707106781):(a=Math.sqrt(C),r=P/a,l=b/a):D<.01?(r=.707106781,a=.707106781,l=0):(l=Math.sqrt(D),r=U/l,a=b/l),this.set(r,a,l,t),this}let N=Math.sqrt((S-E)*(S-E)+(x-w)*(x-w)+(g-m)*(g-m));return Math.abs(N)<.001&&(N=1),this.x=(S-E)/N,this.y=(x-w)/N,this.z=(g-m)/N,this.w=Math.acos((f+M+y-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=bt(this.x,e.x,t.x),this.y=bt(this.y,e.y,t.y),this.z=bt(this.z,e.z,t.z),this.w=bt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=bt(this.x,e,t),this.y=bt(this.y,e,t),this.z=bt(this.z,e,t),this.w=bt(this.w,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(bt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this.z=e.z+(t.z-e.z)*r,this.w=e.w+(t.w-e.w)*r,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};qm.prototype.isVector4=!0;let un=qm;class Sb extends ks{constructor(e=1,t=1,r={}){super(),r=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Wn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},r),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=r.depth,this.scissor=new un(0,0,e,t),this.scissorTest=!1,this.viewport=new un(0,0,e,t),this.textures=[];const a={width:e,height:t,depth:r.depth},l=new Xn(a),c=r.count;for(let d=0;d<c;d++)this.textures[d]=l.clone(),this.textures[d].isRenderTargetTexture=!0,this.textures[d].renderTarget=this;this._setTextureOptions(r),this.depthBuffer=r.depthBuffer,this.stencilBuffer=r.stencilBuffer,this.resolveDepthBuffer=r.resolveDepthBuffer,this.resolveStencilBuffer=r.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=r.depthTexture,this.samples=r.samples,this.multiview=r.multiview,this.useArrayDepthTexture=r.useArrayDepthTexture}_setTextureOptions(e={}){const t={minFilter:Wn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let r=0;r<this.textures.length;r++)this.textures[r].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,r=1){if(this.width!==e||this.height!==t||this.depth!==r){this.width=e,this.height=t,this.depth=r;for(let a=0,l=this.textures.length;a<l;a++)this.textures[a].image.width=e,this.textures[a].image.height=t,this.textures[a].image.depth=r,this.textures[a].isData3DTexture!==!0&&(this.textures[a].isArrayTexture=this.textures[a].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,r=e.textures.length;t<r;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const a=Object.assign({},e.textures[t].image);this.textures[t].source=new Bm(a)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class vr extends Sb{constructor(e=1,t=1,r={}){super(e,t,r),this.isWebGLRenderTarget=!0}}class vy extends Xn{constructor(e=null,t=1,r=1,a=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:r,depth:a},this.magFilter=Fn,this.minFilter=Fn,this.wrapR=Gr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Mb extends Xn{constructor(e=null,t=1,r=1,a=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:r,depth:a},this.magFilter=Fn,this.minFilter=Fn,this.wrapR=Gr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const fd=class fd{constructor(e,t,r,a,l,c,d,h,f,m,x,g,M,E,w,S){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,r,a,l,c,d,h,f,m,x,g,M,E,w,S)}set(e,t,r,a,l,c,d,h,f,m,x,g,M,E,w,S){const y=this.elements;return y[0]=e,y[4]=t,y[8]=r,y[12]=a,y[1]=l,y[5]=c,y[9]=d,y[13]=h,y[2]=f,y[6]=m,y[10]=x,y[14]=g,y[3]=M,y[7]=E,y[11]=w,y[15]=S,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new fd().fromArray(this.elements)}copy(e){const t=this.elements,r=e.elements;return t[0]=r[0],t[1]=r[1],t[2]=r[2],t[3]=r[3],t[4]=r[4],t[5]=r[5],t[6]=r[6],t[7]=r[7],t[8]=r[8],t[9]=r[9],t[10]=r[10],t[11]=r[11],t[12]=r[12],t[13]=r[13],t[14]=r[14],t[15]=r[15],this}copyPosition(e){const t=this.elements,r=e.elements;return t[12]=r[12],t[13]=r[13],t[14]=r[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,r){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),r.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),r.setFromMatrixColumn(this,2),this)}makeBasis(e,t,r){return this.set(e.x,t.x,r.x,0,e.y,t.y,r.y,0,e.z,t.z,r.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();const t=this.elements,r=e.elements,a=1/Ja.setFromMatrixColumn(e,0).length(),l=1/Ja.setFromMatrixColumn(e,1).length(),c=1/Ja.setFromMatrixColumn(e,2).length();return t[0]=r[0]*a,t[1]=r[1]*a,t[2]=r[2]*a,t[3]=0,t[4]=r[4]*l,t[5]=r[5]*l,t[6]=r[6]*l,t[7]=0,t[8]=r[8]*c,t[9]=r[9]*c,t[10]=r[10]*c,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,r=e.x,a=e.y,l=e.z,c=Math.cos(r),d=Math.sin(r),h=Math.cos(a),f=Math.sin(a),m=Math.cos(l),x=Math.sin(l);if(e.order==="XYZ"){const g=c*m,M=c*x,E=d*m,w=d*x;t[0]=h*m,t[4]=-h*x,t[8]=f,t[1]=M+E*f,t[5]=g-w*f,t[9]=-d*h,t[2]=w-g*f,t[6]=E+M*f,t[10]=c*h}else if(e.order==="YXZ"){const g=h*m,M=h*x,E=f*m,w=f*x;t[0]=g+w*d,t[4]=E*d-M,t[8]=c*f,t[1]=c*x,t[5]=c*m,t[9]=-d,t[2]=M*d-E,t[6]=w+g*d,t[10]=c*h}else if(e.order==="ZXY"){const g=h*m,M=h*x,E=f*m,w=f*x;t[0]=g-w*d,t[4]=-c*x,t[8]=E+M*d,t[1]=M+E*d,t[5]=c*m,t[9]=w-g*d,t[2]=-c*f,t[6]=d,t[10]=c*h}else if(e.order==="ZYX"){const g=c*m,M=c*x,E=d*m,w=d*x;t[0]=h*m,t[4]=E*f-M,t[8]=g*f+w,t[1]=h*x,t[5]=w*f+g,t[9]=M*f-E,t[2]=-f,t[6]=d*h,t[10]=c*h}else if(e.order==="YZX"){const g=c*h,M=c*f,E=d*h,w=d*f;t[0]=h*m,t[4]=w-g*x,t[8]=E*x+M,t[1]=x,t[5]=c*m,t[9]=-d*m,t[2]=-f*m,t[6]=M*x+E,t[10]=g-w*x}else if(e.order==="XZY"){const g=c*h,M=c*f,E=d*h,w=d*f;t[0]=h*m,t[4]=-x,t[8]=f*m,t[1]=g*x+w,t[5]=c*m,t[9]=M*x-E,t[2]=E*x-M,t[6]=d*m,t[10]=w*x+g}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Eb,e,wb)}lookAt(e,t,r){const a=this.elements;return xi.subVectors(e,t),xi.lengthSq()===0&&(xi.z=1),xi.normalize(),gs.crossVectors(r,xi),gs.lengthSq()===0&&(Math.abs(r.z)===1?xi.x+=1e-4:xi.z+=1e-4,xi.normalize(),gs.crossVectors(r,xi)),gs.normalize(),gu.crossVectors(xi,gs),a[0]=gs.x,a[4]=gu.x,a[8]=xi.x,a[1]=gs.y,a[5]=gu.y,a[9]=xi.y,a[2]=gs.z,a[6]=gu.z,a[10]=xi.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const r=e.elements,a=t.elements,l=this.elements,c=r[0],d=r[4],h=r[8],f=r[12],m=r[1],x=r[5],g=r[9],M=r[13],E=r[2],w=r[6],S=r[10],y=r[14],N=r[3],L=r[7],C=r[11],D=r[15],P=a[0],U=a[4],b=a[8],I=a[12],X=a[1],O=a[5],K=a[9],se=a[13],fe=a[2],Y=a[6],me=a[10],B=a[14],$=a[3],ne=a[7],ce=a[11],H=a[15];return l[0]=c*P+d*X+h*fe+f*$,l[4]=c*U+d*O+h*Y+f*ne,l[8]=c*b+d*K+h*me+f*ce,l[12]=c*I+d*se+h*B+f*H,l[1]=m*P+x*X+g*fe+M*$,l[5]=m*U+x*O+g*Y+M*ne,l[9]=m*b+x*K+g*me+M*ce,l[13]=m*I+x*se+g*B+M*H,l[2]=E*P+w*X+S*fe+y*$,l[6]=E*U+w*O+S*Y+y*ne,l[10]=E*b+w*K+S*me+y*ce,l[14]=E*I+w*se+S*B+y*H,l[3]=N*P+L*X+C*fe+D*$,l[7]=N*U+L*O+C*Y+D*ne,l[11]=N*b+L*K+C*me+D*ce,l[15]=N*I+L*se+C*B+D*H,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],r=e[4],a=e[8],l=e[12],c=e[1],d=e[5],h=e[9],f=e[13],m=e[2],x=e[6],g=e[10],M=e[14],E=e[3],w=e[7],S=e[11],y=e[15],N=h*M-f*g,L=d*M-f*x,C=d*g-h*x,D=c*M-f*m,P=c*g-h*m,U=c*x-d*m;return t*(w*N-S*L+y*C)-r*(E*N-S*D+y*P)+a*(E*L-w*D+y*U)-l*(E*C-w*P+S*U)}determinantAffine(){const e=this.elements,t=e[0],r=e[4],a=e[8],l=e[1],c=e[5],d=e[9],h=e[2],f=e[6],m=e[10];return t*(c*m-d*f)-r*(l*m-d*h)+a*(l*f-c*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,r){const a=this.elements;return e.isVector3?(a[12]=e.x,a[13]=e.y,a[14]=e.z):(a[12]=e,a[13]=t,a[14]=r),this}invert(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],m=e[8],x=e[9],g=e[10],M=e[11],E=e[12],w=e[13],S=e[14],y=e[15],N=t*d-r*c,L=t*h-a*c,C=t*f-l*c,D=r*h-a*d,P=r*f-l*d,U=a*f-l*h,b=m*w-x*E,I=m*S-g*E,X=m*y-M*E,O=x*S-g*w,K=x*y-M*w,se=g*y-M*S,fe=N*se-L*K+C*O+D*X-P*I+U*b;if(fe===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const Y=1/fe;return e[0]=(d*se-h*K+f*O)*Y,e[1]=(a*K-r*se-l*O)*Y,e[2]=(w*U-S*P+y*D)*Y,e[3]=(g*P-x*U-M*D)*Y,e[4]=(h*X-c*se-f*I)*Y,e[5]=(t*se-a*X+l*I)*Y,e[6]=(S*C-E*U-y*L)*Y,e[7]=(m*U-g*C+M*L)*Y,e[8]=(c*K-d*X+f*b)*Y,e[9]=(r*X-t*K-l*b)*Y,e[10]=(E*P-w*C+y*N)*Y,e[11]=(x*C-m*P-M*N)*Y,e[12]=(d*I-c*O-h*b)*Y,e[13]=(t*O-r*I+a*b)*Y,e[14]=(w*L-E*D-S*N)*Y,e[15]=(m*D-x*L+g*N)*Y,this}scale(e){const t=this.elements,r=e.x,a=e.y,l=e.z;return t[0]*=r,t[4]*=a,t[8]*=l,t[1]*=r,t[5]*=a,t[9]*=l,t[2]*=r,t[6]*=a,t[10]*=l,t[3]*=r,t[7]*=a,t[11]*=l,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],r=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],a=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,r,a))}makeTranslation(e,t,r){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,r,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),r=Math.sin(e);return this.set(1,0,0,0,0,t,-r,0,0,r,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,0,r,0,0,1,0,0,-r,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,-r,0,0,r,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const r=Math.cos(t),a=Math.sin(t),l=1-r,c=e.x,d=e.y,h=e.z,f=l*c,m=l*d;return this.set(f*c+r,f*d-a*h,f*h+a*d,0,f*d+a*h,m*d+r,m*h-a*c,0,f*h-a*d,m*h+a*c,l*h*h+r,0,0,0,0,1),this}makeScale(e,t,r){return this.set(e,0,0,0,0,t,0,0,0,0,r,0,0,0,0,1),this}makeShear(e,t,r,a,l,c){return this.set(1,r,l,0,e,1,c,0,t,a,1,0,0,0,0,1),this}compose(e,t,r){const a=this.elements,l=t._x,c=t._y,d=t._z,h=t._w,f=l+l,m=c+c,x=d+d,g=l*f,M=l*m,E=l*x,w=c*m,S=c*x,y=d*x,N=h*f,L=h*m,C=h*x,D=r.x,P=r.y,U=r.z;return a[0]=(1-(w+y))*D,a[1]=(M+C)*D,a[2]=(E-L)*D,a[3]=0,a[4]=(M-C)*P,a[5]=(1-(g+y))*P,a[6]=(S+N)*P,a[7]=0,a[8]=(E+L)*U,a[9]=(S-N)*U,a[10]=(1-(g+w))*U,a[11]=0,a[12]=e.x,a[13]=e.y,a[14]=e.z,a[15]=1,this}decompose(e,t,r){const a=this.elements;e.x=a[12],e.y=a[13],e.z=a[14];const l=this.determinantAffine();if(l===0)return r.set(1,1,1),t.identity(),this;let c=Ja.set(a[0],a[1],a[2]).length();const d=Ja.set(a[4],a[5],a[6]).length(),h=Ja.set(a[8],a[9],a[10]).length();l<0&&(c=-c),ji.copy(this);const f=1/c,m=1/d,x=1/h;return ji.elements[0]*=f,ji.elements[1]*=f,ji.elements[2]*=f,ji.elements[4]*=m,ji.elements[5]*=m,ji.elements[6]*=m,ji.elements[8]*=x,ji.elements[9]*=x,ji.elements[10]*=x,t.setFromRotationMatrix(ji),r.x=c,r.y=d,r.z=h,this}makePerspective(e,t,r,a,l,c,d=gr,h=!1){const f=this.elements,m=2*l/(t-e),x=2*l/(r-a),g=(t+e)/(t-e),M=(r+a)/(r-a);let E,w;if(h)E=l/(c-l),w=c*l/(c-l);else if(d===gr)E=-(c+l)/(c-l),w=-2*c*l/(c-l);else if(d===ql)E=-c/(c-l),w=-c*l/(c-l);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+d);return f[0]=m,f[4]=0,f[8]=g,f[12]=0,f[1]=0,f[5]=x,f[9]=M,f[13]=0,f[2]=0,f[6]=0,f[10]=E,f[14]=w,f[3]=0,f[7]=0,f[11]=-1,f[15]=0,this}makeOrthographic(e,t,r,a,l,c,d=gr,h=!1){const f=this.elements,m=2/(t-e),x=2/(r-a),g=-(t+e)/(t-e),M=-(r+a)/(r-a);let E,w;if(h)E=1/(c-l),w=c/(c-l);else if(d===gr)E=-2/(c-l),w=-(c+l)/(c-l);else if(d===ql)E=-1/(c-l),w=-l/(c-l);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+d);return f[0]=m,f[4]=0,f[8]=0,f[12]=g,f[1]=0,f[5]=x,f[9]=0,f[13]=M,f[2]=0,f[6]=0,f[10]=E,f[14]=w,f[3]=0,f[7]=0,f[11]=0,f[15]=1,this}equals(e){const t=this.elements,r=e.elements;for(let a=0;a<16;a++)if(t[a]!==r[a])return!1;return!0}fromArray(e,t=0){for(let r=0;r<16;r++)this.elements[r]=e[r+t];return this}toArray(e=[],t=0){const r=this.elements;return e[t]=r[0],e[t+1]=r[1],e[t+2]=r[2],e[t+3]=r[3],e[t+4]=r[4],e[t+5]=r[5],e[t+6]=r[6],e[t+7]=r[7],e[t+8]=r[8],e[t+9]=r[9],e[t+10]=r[10],e[t+11]=r[11],e[t+12]=r[12],e[t+13]=r[13],e[t+14]=r[14],e[t+15]=r[15],e}};fd.prototype.isMatrix4=!0;let an=fd;const Ja=new te,ji=new an,Eb=new te(0,0,0),wb=new te(1,1,1),gs=new te,gu=new te,xi=new te,iv=new an,rv=new Os;class Kr{constructor(e=0,t=0,r=0,a=Kr.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=r,this._order=a}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,r,a=this._order){return this._x=e,this._y=t,this._z=r,this._order=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,r=!0){const a=e.elements,l=a[0],c=a[4],d=a[8],h=a[1],f=a[5],m=a[9],x=a[2],g=a[6],M=a[10];switch(t){case"XYZ":this._y=Math.asin(bt(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(-m,M),this._z=Math.atan2(-c,l)):(this._x=Math.atan2(g,f),this._z=0);break;case"YXZ":this._x=Math.asin(-bt(m,-1,1)),Math.abs(m)<.9999999?(this._y=Math.atan2(d,M),this._z=Math.atan2(h,f)):(this._y=Math.atan2(-x,l),this._z=0);break;case"ZXY":this._x=Math.asin(bt(g,-1,1)),Math.abs(g)<.9999999?(this._y=Math.atan2(-x,M),this._z=Math.atan2(-c,f)):(this._y=0,this._z=Math.atan2(h,l));break;case"ZYX":this._y=Math.asin(-bt(x,-1,1)),Math.abs(x)<.9999999?(this._x=Math.atan2(g,M),this._z=Math.atan2(h,l)):(this._x=0,this._z=Math.atan2(-c,f));break;case"YZX":this._z=Math.asin(bt(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(-m,f),this._y=Math.atan2(-x,l)):(this._x=0,this._y=Math.atan2(d,M));break;case"XZY":this._z=Math.asin(-bt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(g,f),this._y=Math.atan2(d,l)):(this._x=Math.atan2(-m,M),this._y=0);break;default:lt("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,r===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,r){return iv.makeRotationFromQuaternion(e),this.setFromRotationMatrix(iv,t,r)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return rv.setFromEuler(this),this.setFromQuaternion(rv,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Kr.DEFAULT_ORDER="XYZ";class _y{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let bb=0;const sv=new te,eo=new Os,Lr=new an,xu=new te,Rl=new te,Tb=new te,Cb=new Os,av=new te(1,0,0),ov=new te(0,1,0),lv=new te(0,0,1),cv={type:"added"},Rb={type:"removed"},to={type:"childadded",child:null},Mf={type:"childremoved",child:null};class En extends ks{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:bb++}),this.uuid=ic(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=En.DEFAULT_UP.clone();const e=new te,t=new Kr,r=new Os,a=new te(1,1,1);function l(){r.setFromEuler(t,!1)}function c(){t.setFromQuaternion(r,void 0,!1)}t._onChange(l),r._onChange(c),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:a},modelViewMatrix:{value:new an},normalMatrix:{value:new pt}}),this.matrix=new an,this.matrixWorld=new an,this.matrixAutoUpdate=En.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=En.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new _y,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return eo.setFromAxisAngle(e,t),this.quaternion.multiply(eo),this}rotateOnWorldAxis(e,t){return eo.setFromAxisAngle(e,t),this.quaternion.premultiply(eo),this}rotateX(e){return this.rotateOnAxis(av,e)}rotateY(e){return this.rotateOnAxis(ov,e)}rotateZ(e){return this.rotateOnAxis(lv,e)}translateOnAxis(e,t){return sv.copy(e).applyQuaternion(this.quaternion),this.position.add(sv.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(av,e)}translateY(e){return this.translateOnAxis(ov,e)}translateZ(e){return this.translateOnAxis(lv,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Lr.copy(this.matrixWorld).invert())}lookAt(e,t,r){e.isVector3?xu.copy(e):xu.set(e,t,r);const a=this.parent;this.updateWorldMatrix(!0,!1),Rl.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Lr.lookAt(Rl,xu,this.up):Lr.lookAt(xu,Rl,this.up),this.quaternion.setFromRotationMatrix(Lr),a&&(Lr.extractRotation(a.matrixWorld),eo.setFromRotationMatrix(Lr),this.quaternion.premultiply(eo.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Dt("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(cv),to.child=e,this.dispatchEvent(to),to.child=null):Dt("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let r=0;r<arguments.length;r++)this.remove(arguments[r]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Rb),Mf.child=e,this.dispatchEvent(Mf),Mf.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Lr.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Lr.multiply(e.parent.matrixWorld)),e.applyMatrix4(Lr),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(cv),to.child=e,this.dispatchEvent(to),to.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let r=0,a=this.children.length;r<a;r++){const c=this.children[r].getObjectByProperty(e,t);if(c!==void 0)return c}}getObjectsByProperty(e,t,r=[]){this[e]===t&&r.push(this);const a=this.children;for(let l=0,c=a.length;l<c;l++)a[l].getObjectsByProperty(e,t,r);return r}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Rl,e,Tb),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Rl,Cb,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,r=e.y,a=e.z,l=this.matrix.elements;l[12]+=t-l[0]*t-l[4]*r-l[8]*a,l[13]+=r-l[1]*t-l[5]*r-l[9]*a,l[14]+=a-l[2]*t-l[6]*r-l[10]*a}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].updateMatrixWorld(e)}updateWorldMatrix(e,t,r=!1){const a=this.parent;if(e===!0&&a!==null&&a.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||r)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,r=!0),t===!0){const l=this.children;for(let c=0,d=l.length;c<d;c++)l[c].updateWorldMatrix(!1,!0,r)}}toJSON(e){const t=e===void 0||typeof e=="string",r={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},r.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const a={};a.uuid=this.uuid,a.type=this.type,this.name!==""&&(a.name=this.name),this.castShadow===!0&&(a.castShadow=!0),this.receiveShadow===!0&&(a.receiveShadow=!0),this.visible===!1&&(a.visible=!1),this.frustumCulled===!1&&(a.frustumCulled=!1),this.renderOrder!==0&&(a.renderOrder=this.renderOrder),this.static!==!1&&(a.static=this.static),Object.keys(this.userData).length>0&&(a.userData=this.userData),a.layers=this.layers.mask,a.matrix=this.matrix.toArray(),a.up=this.up.toArray(),this.pivot!==null&&(a.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(a.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(a.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(a.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(a.type="InstancedMesh",a.count=this.count,a.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(a.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(a.type="BatchedMesh",a.perObjectFrustumCulled=this.perObjectFrustumCulled,a.sortObjects=this.sortObjects,a.drawRanges=this._drawRanges,a.reservedRanges=this._reservedRanges,a.geometryInfo=this._geometryInfo.map(d=>({...d,boundingBox:d.boundingBox?d.boundingBox.toJSON():void 0,boundingSphere:d.boundingSphere?d.boundingSphere.toJSON():void 0})),a.instanceInfo=this._instanceInfo.map(d=>({...d})),a.availableInstanceIds=this._availableInstanceIds.slice(),a.availableGeometryIds=this._availableGeometryIds.slice(),a.nextIndexStart=this._nextIndexStart,a.nextVertexStart=this._nextVertexStart,a.geometryCount=this._geometryCount,a.maxInstanceCount=this._maxInstanceCount,a.maxVertexCount=this._maxVertexCount,a.maxIndexCount=this._maxIndexCount,a.geometryInitialized=this._geometryInitialized,a.matricesTexture=this._matricesTexture.toJSON(e),a.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(a.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(a.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(a.boundingBox=this.boundingBox.toJSON()));function l(d,h){return d[h.uuid]===void 0&&(d[h.uuid]=h.toJSON(e)),h.uuid}if(this.isScene)this.background&&(this.background.isColor?a.background=this.background.toJSON():this.background.isTexture&&(a.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(a.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){a.geometry=l(e.geometries,this.geometry);const d=this.geometry.parameters;if(d!==void 0&&d.shapes!==void 0){const h=d.shapes;if(Array.isArray(h))for(let f=0,m=h.length;f<m;f++){const x=h[f];l(e.shapes,x)}else l(e.shapes,h)}}if(this.isSkinnedMesh&&(a.bindMode=this.bindMode,a.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(l(e.skeletons,this.skeleton),a.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const d=[];for(let h=0,f=this.material.length;h<f;h++)d.push(l(e.materials,this.material[h]));a.material=d}else a.material=l(e.materials,this.material);if(this.children.length>0){a.children=[];for(let d=0;d<this.children.length;d++)a.children.push(this.children[d].toJSON(e).object)}if(this.animations.length>0){a.animations=[];for(let d=0;d<this.animations.length;d++){const h=this.animations[d];a.animations.push(l(e.animations,h))}}if(t){const d=c(e.geometries),h=c(e.materials),f=c(e.textures),m=c(e.images),x=c(e.shapes),g=c(e.skeletons),M=c(e.animations),E=c(e.nodes);d.length>0&&(r.geometries=d),h.length>0&&(r.materials=h),f.length>0&&(r.textures=f),m.length>0&&(r.images=m),x.length>0&&(r.shapes=x),g.length>0&&(r.skeletons=g),M.length>0&&(r.animations=M),E.length>0&&(r.nodes=E)}return r.object=a,r;function c(d){const h=[];for(const f in d){const m=d[f];delete m.metadata,h.push(m)}return h}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let r=0;r<e.children.length;r++){const a=e.children[r];this.add(a.clone())}return this}}En.DEFAULT_UP=new te(0,1,0);En.DEFAULT_MATRIX_AUTO_UPDATE=!0;En.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class kl extends En{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Ab={type:"move"};class Ef{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new kl,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new kl,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new te,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new te),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new kl,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new te,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new te,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const r of e.hand.values())this._getHandJoint(t,r)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,r){let a=null,l=null,c=null;const d=this._targetRay,h=this._grip,f=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(f&&e.hand){c=!0;for(const w of e.hand.values()){const S=t.getJointPose(w,r),y=this._getHandJoint(f,w);S!==null&&(y.matrix.fromArray(S.transform.matrix),y.matrix.decompose(y.position,y.rotation,y.scale),y.matrixWorldNeedsUpdate=!0,y.jointRadius=S.radius),y.visible=S!==null}const m=f.joints["index-finger-tip"],x=f.joints["thumb-tip"],g=m.position.distanceTo(x.position),M=.02,E=.005;f.inputState.pinching&&g>M+E?(f.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!f.inputState.pinching&&g<=M-E&&(f.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else h!==null&&e.gripSpace&&(l=t.getPose(e.gripSpace,r),l!==null&&(h.matrix.fromArray(l.transform.matrix),h.matrix.decompose(h.position,h.rotation,h.scale),h.matrixWorldNeedsUpdate=!0,l.linearVelocity?(h.hasLinearVelocity=!0,h.linearVelocity.copy(l.linearVelocity)):h.hasLinearVelocity=!1,l.angularVelocity?(h.hasAngularVelocity=!0,h.angularVelocity.copy(l.angularVelocity)):h.hasAngularVelocity=!1,h.eventsEnabled&&h.dispatchEvent({type:"gripUpdated",data:e,target:this})));d!==null&&(a=t.getPose(e.targetRaySpace,r),a===null&&l!==null&&(a=l),a!==null&&(d.matrix.fromArray(a.transform.matrix),d.matrix.decompose(d.position,d.rotation,d.scale),d.matrixWorldNeedsUpdate=!0,a.linearVelocity?(d.hasLinearVelocity=!0,d.linearVelocity.copy(a.linearVelocity)):d.hasLinearVelocity=!1,a.angularVelocity?(d.hasAngularVelocity=!0,d.angularVelocity.copy(a.angularVelocity)):d.hasAngularVelocity=!1,this.dispatchEvent(Ab)))}return d!==null&&(d.visible=a!==null),h!==null&&(h.visible=l!==null),f!==null&&(f.visible=c!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const r=new kl;r.matrixAutoUpdate=!1,r.visible=!1,e.joints[t.jointName]=r,e.add(r)}return e.joints[t.jointName]}}const yy={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},xs={h:0,s:0,l:0},vu={h:0,s:0,l:0};function wf(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class xt{constructor(e,t,r){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,r)}set(e,t,r){if(t===void 0&&r===void 0){const a=e;a&&a.isColor?this.copy(a):typeof a=="number"?this.setHex(a):typeof a=="string"&&this.setStyle(a)}else this.setRGB(e,t,r);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Jn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,At.colorSpaceToWorking(this,t),this}setRGB(e,t,r,a=At.workingColorSpace){return this.r=e,this.g=t,this.b=r,At.colorSpaceToWorking(this,a),this}setHSL(e,t,r,a=At.workingColorSpace){if(e=mb(e,1),t=bt(t,0,1),r=bt(r,0,1),t===0)this.r=this.g=this.b=r;else{const l=r<=.5?r*(1+t):r+t-r*t,c=2*r-l;this.r=wf(c,l,e+1/3),this.g=wf(c,l,e),this.b=wf(c,l,e-1/3)}return At.colorSpaceToWorking(this,a),this}setStyle(e,t=Jn){function r(l){l!==void 0&&parseFloat(l)<1&&lt("Color: Alpha component of "+e+" will be ignored.")}let a;if(a=/^(\w+)\(([^\)]*)\)/.exec(e)){let l;const c=a[1],d=a[2];switch(c){case"rgb":case"rgba":if(l=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setRGB(Math.min(255,parseInt(l[1],10))/255,Math.min(255,parseInt(l[2],10))/255,Math.min(255,parseInt(l[3],10))/255,t);if(l=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setRGB(Math.min(100,parseInt(l[1],10))/100,Math.min(100,parseInt(l[2],10))/100,Math.min(100,parseInt(l[3],10))/100,t);break;case"hsl":case"hsla":if(l=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setHSL(parseFloat(l[1])/360,parseFloat(l[2])/100,parseFloat(l[3])/100,t);break;default:lt("Color: Unknown color model "+e)}}else if(a=/^\#([A-Fa-f\d]+)$/.exec(e)){const l=a[1],c=l.length;if(c===3)return this.setRGB(parseInt(l.charAt(0),16)/15,parseInt(l.charAt(1),16)/15,parseInt(l.charAt(2),16)/15,t);if(c===6)return this.setHex(parseInt(l,16),t);lt("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Jn){const r=yy[e.toLowerCase()];return r!==void 0?this.setHex(r,t):lt("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Wr(e.r),this.g=Wr(e.g),this.b=Wr(e.b),this}copyLinearToSRGB(e){return this.r=_o(e.r),this.g=_o(e.g),this.b=_o(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Jn){return At.workingToColorSpace(Gn.copy(this),e),Math.round(bt(Gn.r*255,0,255))*65536+Math.round(bt(Gn.g*255,0,255))*256+Math.round(bt(Gn.b*255,0,255))}getHexString(e=Jn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=At.workingColorSpace){At.workingToColorSpace(Gn.copy(this),t);const r=Gn.r,a=Gn.g,l=Gn.b,c=Math.max(r,a,l),d=Math.min(r,a,l);let h,f;const m=(d+c)/2;if(d===c)h=0,f=0;else{const x=c-d;switch(f=m<=.5?x/(c+d):x/(2-c-d),c){case r:h=(a-l)/x+(a<l?6:0);break;case a:h=(l-r)/x+2;break;case l:h=(r-a)/x+4;break}h/=6}return e.h=h,e.s=f,e.l=m,e}getRGB(e,t=At.workingColorSpace){return At.workingToColorSpace(Gn.copy(this),t),e.r=Gn.r,e.g=Gn.g,e.b=Gn.b,e}getStyle(e=Jn){At.workingToColorSpace(Gn.copy(this),e);const t=Gn.r,r=Gn.g,a=Gn.b;return e!==Jn?`color(${e} ${t.toFixed(3)} ${r.toFixed(3)} ${a.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(r*255)},${Math.round(a*255)})`}offsetHSL(e,t,r){return this.getHSL(xs),this.setHSL(xs.h+e,xs.s+t,xs.l+r)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,r){return this.r=e.r+(t.r-e.r)*r,this.g=e.g+(t.g-e.g)*r,this.b=e.b+(t.b-e.b)*r,this}lerpHSL(e,t){this.getHSL(xs),e.getHSL(vu);const r=xf(xs.h,vu.h,t),a=xf(xs.s,vu.s,t),l=xf(xs.l,vu.l,t);return this.setHSL(r,a,l),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,r=this.g,a=this.b,l=e.elements;return this.r=l[0]*t+l[3]*r+l[6]*a,this.g=l[1]*t+l[4]*r+l[7]*a,this.b=l[2]*t+l[5]*r+l[8]*a,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Gn=new xt;xt.NAMES=yy;class Pb extends En{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Kr,this.environmentIntensity=1,this.environmentRotation=new Kr,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const Wi=new te,Dr=new te,bf=new te,Ir=new te,no=new te,io=new te,uv=new te,Tf=new te,Cf=new te,Rf=new te,Af=new un,Pf=new un,Nf=new un;class Yi{constructor(e=new te,t=new te,r=new te){this.a=e,this.b=t,this.c=r}static getNormal(e,t,r,a){a.subVectors(r,t),Wi.subVectors(e,t),a.cross(Wi);const l=a.lengthSq();return l>0?a.multiplyScalar(1/Math.sqrt(l)):a.set(0,0,0)}static getBarycoord(e,t,r,a,l){Wi.subVectors(a,t),Dr.subVectors(r,t),bf.subVectors(e,t);const c=Wi.dot(Wi),d=Wi.dot(Dr),h=Wi.dot(bf),f=Dr.dot(Dr),m=Dr.dot(bf),x=c*f-d*d;if(x===0)return l.set(0,0,0),null;const g=1/x,M=(f*h-d*m)*g,E=(c*m-d*h)*g;return l.set(1-M-E,E,M)}static containsPoint(e,t,r,a){return this.getBarycoord(e,t,r,a,Ir)===null?!1:Ir.x>=0&&Ir.y>=0&&Ir.x+Ir.y<=1}static getInterpolation(e,t,r,a,l,c,d,h){return this.getBarycoord(e,t,r,a,Ir)===null?(h.x=0,h.y=0,"z"in h&&(h.z=0),"w"in h&&(h.w=0),null):(h.setScalar(0),h.addScaledVector(l,Ir.x),h.addScaledVector(c,Ir.y),h.addScaledVector(d,Ir.z),h)}static getInterpolatedAttribute(e,t,r,a,l,c){return Af.setScalar(0),Pf.setScalar(0),Nf.setScalar(0),Af.fromBufferAttribute(e,t),Pf.fromBufferAttribute(e,r),Nf.fromBufferAttribute(e,a),c.setScalar(0),c.addScaledVector(Af,l.x),c.addScaledVector(Pf,l.y),c.addScaledVector(Nf,l.z),c}static isFrontFacing(e,t,r,a){return Wi.subVectors(r,t),Dr.subVectors(e,t),Wi.cross(Dr).dot(a)<0}set(e,t,r){return this.a.copy(e),this.b.copy(t),this.c.copy(r),this}setFromPointsAndIndices(e,t,r,a){return this.a.copy(e[t]),this.b.copy(e[r]),this.c.copy(e[a]),this}setFromAttributeAndIndices(e,t,r,a){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,r),this.c.fromBufferAttribute(e,a),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Wi.subVectors(this.c,this.b),Dr.subVectors(this.a,this.b),Wi.cross(Dr).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Yi.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Yi.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,r,a,l){return Yi.getInterpolation(e,this.a,this.b,this.c,t,r,a,l)}containsPoint(e){return Yi.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Yi.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const r=this.a,a=this.b,l=this.c;let c,d;no.subVectors(a,r),io.subVectors(l,r),Tf.subVectors(e,r);const h=no.dot(Tf),f=io.dot(Tf);if(h<=0&&f<=0)return t.copy(r);Cf.subVectors(e,a);const m=no.dot(Cf),x=io.dot(Cf);if(m>=0&&x<=m)return t.copy(a);const g=h*x-m*f;if(g<=0&&h>=0&&m<=0)return c=h/(h-m),t.copy(r).addScaledVector(no,c);Rf.subVectors(e,l);const M=no.dot(Rf),E=io.dot(Rf);if(E>=0&&M<=E)return t.copy(l);const w=M*f-h*E;if(w<=0&&f>=0&&E<=0)return d=f/(f-E),t.copy(r).addScaledVector(io,d);const S=m*E-M*x;if(S<=0&&x-m>=0&&M-E>=0)return uv.subVectors(l,a),d=(x-m)/(x-m+(M-E)),t.copy(a).addScaledVector(uv,d);const y=1/(S+w+g);return c=w*y,d=g*y,t.copy(r).addScaledVector(no,c).addScaledVector(io,d)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class Ho{constructor(e=new te(1/0,1/0,1/0),t=new te(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,r=e.length;t<r;t+=3)this.expandByPoint(Xi.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,r=e.count;t<r;t++)this.expandByPoint(Xi.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,r=e.length;t<r;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const r=Xi.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(r),this.max.copy(e).add(r),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const r=e.geometry;if(r!==void 0){const l=r.getAttribute("position");if(t===!0&&l!==void 0&&e.isInstancedMesh!==!0)for(let c=0,d=l.count;c<d;c++)e.isMesh===!0?e.getVertexPosition(c,Xi):Xi.fromBufferAttribute(l,c),Xi.applyMatrix4(e.matrixWorld),this.expandByPoint(Xi);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),_u.copy(e.boundingBox)):(r.boundingBox===null&&r.computeBoundingBox(),_u.copy(r.boundingBox)),_u.applyMatrix4(e.matrixWorld),this.union(_u)}const a=e.children;for(let l=0,c=a.length;l<c;l++)this.expandByObject(a[l],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Xi),Xi.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,r;return e.normal.x>0?(t=e.normal.x*this.min.x,r=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,r=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,r+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,r+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,r+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,r+=e.normal.z*this.min.z),t<=-e.constant&&r>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Al),yu.subVectors(this.max,Al),ro.subVectors(e.a,Al),so.subVectors(e.b,Al),ao.subVectors(e.c,Al),vs.subVectors(so,ro),_s.subVectors(ao,so),ia.subVectors(ro,ao);let t=[0,-vs.z,vs.y,0,-_s.z,_s.y,0,-ia.z,ia.y,vs.z,0,-vs.x,_s.z,0,-_s.x,ia.z,0,-ia.x,-vs.y,vs.x,0,-_s.y,_s.x,0,-ia.y,ia.x,0];return!Lf(t,ro,so,ao,yu)||(t=[1,0,0,0,1,0,0,0,1],!Lf(t,ro,so,ao,yu))?!1:(Su.crossVectors(vs,_s),t=[Su.x,Su.y,Su.z],Lf(t,ro,so,ao,yu))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Xi).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Xi).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Ur[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Ur[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Ur[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Ur[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Ur[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Ur[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Ur[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Ur[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Ur),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Ur=[new te,new te,new te,new te,new te,new te,new te,new te],Xi=new te,_u=new Ho,ro=new te,so=new te,ao=new te,vs=new te,_s=new te,ia=new te,Al=new te,yu=new te,Su=new te,ra=new te;function Lf(i,e,t,r,a){for(let l=0,c=i.length-3;l<=c;l+=3){ra.fromArray(i,l);const d=a.x*Math.abs(ra.x)+a.y*Math.abs(ra.y)+a.z*Math.abs(ra.z),h=e.dot(ra),f=t.dot(ra),m=r.dot(ra);if(Math.max(-Math.max(h,f,m),Math.min(h,f,m))>d)return!1}return!0}const vn=new te,Mu=new ut;let Nb=0;class _r extends ks{constructor(e,t,r=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Nb++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=r,this.usage=Kx,this.updateRanges=[],this.gpuType=mr,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,r){e*=this.itemSize,r*=t.itemSize;for(let a=0,l=this.itemSize;a<l;a++)this.array[e+a]=t.array[r+a];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,r=this.count;t<r;t++)Mu.fromBufferAttribute(this,t),Mu.applyMatrix3(e),this.setXY(t,Mu.x,Mu.y);else if(this.itemSize===3)for(let t=0,r=this.count;t<r;t++)vn.fromBufferAttribute(this,t),vn.applyMatrix3(e),this.setXYZ(t,vn.x,vn.y,vn.z);return this}applyMatrix4(e){for(let t=0,r=this.count;t<r;t++)vn.fromBufferAttribute(this,t),vn.applyMatrix4(e),this.setXYZ(t,vn.x,vn.y,vn.z);return this}applyNormalMatrix(e){for(let t=0,r=this.count;t<r;t++)vn.fromBufferAttribute(this,t),vn.applyNormalMatrix(e),this.setXYZ(t,vn.x,vn.y,vn.z);return this}transformDirection(e){for(let t=0,r=this.count;t<r;t++)vn.fromBufferAttribute(this,t),vn.transformDirection(e),this.setXYZ(t,vn.x,vn.y,vn.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let r=this.array[e*this.itemSize+t];return this.normalized&&(r=Cl(r,this.array)),r}setComponent(e,t,r){return this.normalized&&(r=li(r,this.array)),this.array[e*this.itemSize+t]=r,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Cl(t,this.array)),t}setX(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Cl(t,this.array)),t}setY(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Cl(t,this.array)),t}setZ(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Cl(t,this.array)),t}setW(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,r){return e*=this.itemSize,this.normalized&&(t=li(t,this.array),r=li(r,this.array)),this.array[e+0]=t,this.array[e+1]=r,this}setXYZ(e,t,r,a){return e*=this.itemSize,this.normalized&&(t=li(t,this.array),r=li(r,this.array),a=li(a,this.array)),this.array[e+0]=t,this.array[e+1]=r,this.array[e+2]=a,this}setXYZW(e,t,r,a,l){return e*=this.itemSize,this.normalized&&(t=li(t,this.array),r=li(r,this.array),a=li(a,this.array),l=li(l,this.array)),this.array[e+0]=t,this.array[e+1]=r,this.array[e+2]=a,this.array[e+3]=l,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Kx&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}}class Sy extends _r{constructor(e,t,r){super(new Uint16Array(e),t,r)}}class My extends _r{constructor(e,t,r){super(new Uint32Array(e),t,r)}}class Un extends _r{constructor(e,t,r){super(new Float32Array(e),t,r)}}const Lb=new Ho,Pl=new te,Df=new te;class rc{constructor(e=new te,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const r=this.center;t!==void 0?r.copy(t):Lb.setFromPoints(e).getCenter(r);let a=0;for(let l=0,c=e.length;l<c;l++)a=Math.max(a,r.distanceToSquared(e[l]));return this.radius=Math.sqrt(a),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const r=this.center.distanceToSquared(e);return t.copy(e),r>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Pl.subVectors(e,this.center);const t=Pl.lengthSq();if(t>this.radius*this.radius){const r=Math.sqrt(t),a=(r-this.radius)*.5;this.center.addScaledVector(Pl,a/r),this.radius+=a}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Df.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Pl.copy(e.center).add(Df)),this.expandByPoint(Pl.copy(e.center).sub(Df))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let Db=0;const Ni=new an,If=new En,oo=new te,vi=new Ho,Nl=new Ho,An=new te;class Mi extends ks{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Db++}),this.uuid=ic(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(db(e)?My:Sy)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,r=0){this.groups.push({start:e,count:t,materialIndex:r})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const r=this.attributes.normal;if(r!==void 0){const l=new pt().getNormalMatrix(e);r.applyNormalMatrix(l),r.needsUpdate=!0}const a=this.attributes.tangent;return a!==void 0&&(a.transformDirection(e),a.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return Ni.makeRotationFromQuaternion(e),this.applyMatrix4(Ni),this}rotateX(e){return Ni.makeRotationX(e),this.applyMatrix4(Ni),this}rotateY(e){return Ni.makeRotationY(e),this.applyMatrix4(Ni),this}rotateZ(e){return Ni.makeRotationZ(e),this.applyMatrix4(Ni),this}translate(e,t,r){return Ni.makeTranslation(e,t,r),this.applyMatrix4(Ni),this}scale(e,t,r){return Ni.makeScale(e,t,r),this.applyMatrix4(Ni),this}lookAt(e){return If.lookAt(e),If.updateMatrix(),this.applyMatrix4(If.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(oo).negate(),this.translate(oo.x,oo.y,oo.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const r=[];for(let a=0,l=e.length;a<l;a++){const c=e[a];r.push(c.x,c.y,c.z||0)}this.setAttribute("position",new Un(r,3))}else{const r=Math.min(e.length,t.count);for(let a=0;a<r;a++){const l=e[a];t.setXYZ(a,l.x,l.y,l.z||0)}e.length>t.count&&lt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Ho);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Dt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new te(-1/0,-1/0,-1/0),new te(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){const l=t[r];vi.setFromBufferAttribute(l),this.morphTargetsRelative?(An.addVectors(this.boundingBox.min,vi.min),this.boundingBox.expandByPoint(An),An.addVectors(this.boundingBox.max,vi.max),this.boundingBox.expandByPoint(An)):(this.boundingBox.expandByPoint(vi.min),this.boundingBox.expandByPoint(vi.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Dt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new rc);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Dt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new te,1/0);return}if(e){const r=this.boundingSphere.center;if(vi.setFromBufferAttribute(e),t)for(let l=0,c=t.length;l<c;l++){const d=t[l];Nl.setFromBufferAttribute(d),this.morphTargetsRelative?(An.addVectors(vi.min,Nl.min),vi.expandByPoint(An),An.addVectors(vi.max,Nl.max),vi.expandByPoint(An)):(vi.expandByPoint(Nl.min),vi.expandByPoint(Nl.max))}vi.getCenter(r);let a=0;for(let l=0,c=e.count;l<c;l++)An.fromBufferAttribute(e,l),a=Math.max(a,r.distanceToSquared(An));if(t)for(let l=0,c=t.length;l<c;l++){const d=t[l],h=this.morphTargetsRelative;for(let f=0,m=d.count;f<m;f++)An.fromBufferAttribute(d,f),h&&(oo.fromBufferAttribute(e,f),An.add(oo)),a=Math.max(a,r.distanceToSquared(An))}this.boundingSphere.radius=Math.sqrt(a),isNaN(this.boundingSphere.radius)&&Dt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Dt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const r=t.position,a=t.normal,l=t.uv;let c=this.getAttribute("tangent");(c===void 0||c.count!==r.count)&&(c=new _r(new Float32Array(4*r.count),4),this.setAttribute("tangent",c));const d=[],h=[];for(let b=0;b<r.count;b++)d[b]=new te,h[b]=new te;const f=new te,m=new te,x=new te,g=new ut,M=new ut,E=new ut,w=new te,S=new te;function y(b,I,X){f.fromBufferAttribute(r,b),m.fromBufferAttribute(r,I),x.fromBufferAttribute(r,X),g.fromBufferAttribute(l,b),M.fromBufferAttribute(l,I),E.fromBufferAttribute(l,X),m.sub(f),x.sub(f),M.sub(g),E.sub(g);const O=1/(M.x*E.y-E.x*M.y);isFinite(O)&&(w.copy(m).multiplyScalar(E.y).addScaledVector(x,-M.y).multiplyScalar(O),S.copy(x).multiplyScalar(M.x).addScaledVector(m,-E.x).multiplyScalar(O),d[b].add(w),d[I].add(w),d[X].add(w),h[b].add(S),h[I].add(S),h[X].add(S))}let N=this.groups;N.length===0&&(N=[{start:0,count:e.count}]);for(let b=0,I=N.length;b<I;++b){const X=N[b],O=X.start,K=X.count;for(let se=O,fe=O+K;se<fe;se+=3)y(e.getX(se+0),e.getX(se+1),e.getX(se+2))}const L=new te,C=new te,D=new te,P=new te;function U(b){D.fromBufferAttribute(a,b),P.copy(D);const I=d[b];L.copy(I),L.sub(D.multiplyScalar(D.dot(I))).normalize(),C.crossVectors(P,I);const O=C.dot(h[b])<0?-1:1;c.setXYZW(b,L.x,L.y,L.z,O)}for(let b=0,I=N.length;b<I;++b){const X=N[b],O=X.start,K=X.count;for(let se=O,fe=O+K;se<fe;se+=3)U(e.getX(se+0)),U(e.getX(se+1)),U(e.getX(se+2))}this._transformed=!0}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let r=this.getAttribute("normal");if(r===void 0||r.count!==t.count)r=new _r(new Float32Array(t.count*3),3),this.setAttribute("normal",r);else for(let g=0,M=r.count;g<M;g++)r.setXYZ(g,0,0,0);const a=new te,l=new te,c=new te,d=new te,h=new te,f=new te,m=new te,x=new te;if(e)for(let g=0,M=e.count;g<M;g+=3){const E=e.getX(g+0),w=e.getX(g+1),S=e.getX(g+2);a.fromBufferAttribute(t,E),l.fromBufferAttribute(t,w),c.fromBufferAttribute(t,S),m.subVectors(c,l),x.subVectors(a,l),m.cross(x),d.fromBufferAttribute(r,E),h.fromBufferAttribute(r,w),f.fromBufferAttribute(r,S),d.add(m),h.add(m),f.add(m),r.setXYZ(E,d.x,d.y,d.z),r.setXYZ(w,h.x,h.y,h.z),r.setXYZ(S,f.x,f.y,f.z)}else for(let g=0,M=t.count;g<M;g+=3)a.fromBufferAttribute(t,g+0),l.fromBufferAttribute(t,g+1),c.fromBufferAttribute(t,g+2),m.subVectors(c,l),x.subVectors(a,l),m.cross(x),r.setXYZ(g+0,m.x,m.y,m.z),r.setXYZ(g+1,m.x,m.y,m.z),r.setXYZ(g+2,m.x,m.y,m.z);this.normalizeNormals(),r.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,r=e.count;t<r;t++)An.fromBufferAttribute(e,t),An.normalize(),e.setXYZ(t,An.x,An.y,An.z)}toNonIndexed(){function e(d,h){const f=d.array,m=d.itemSize,x=d.normalized,g=new f.constructor(h.length*m);let M=0,E=0;for(let w=0,S=h.length;w<S;w++){d.isInterleavedBufferAttribute?M=h[w]*d.data.stride+d.offset:M=h[w]*m;for(let y=0;y<m;y++)g[E++]=f[M++]}return new _r(g,m,x)}if(this.index===null)return lt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Mi,r=this.index.array,a=this.attributes;for(const d in a){const h=a[d],f=e(h,r);t.setAttribute(d,f)}const l=this.morphAttributes;for(const d in l){const h=[],f=l[d];for(let m=0,x=f.length;m<x;m++){const g=f[m],M=e(g,r);h.push(M)}t.morphAttributes[d]=h}t.morphTargetsRelative=this.morphTargetsRelative;const c=this.groups;for(let d=0,h=c.length;d<h;d++){const f=c[d];t.addGroup(f.start,f.count,f.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const h=this.parameters;for(const f in h)h[f]!==void 0&&(e[f]=h[f]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const r=this.attributes;for(const h in r){const f=r[h];e.data.attributes[h]=f.toJSON(e.data)}const a={};let l=!1;for(const h in this.morphAttributes){const f=this.morphAttributes[h],m=[];for(let x=0,g=f.length;x<g;x++){const M=f[x];m.push(M.toJSON(e.data))}m.length>0&&(a[h]=m,l=!0)}l&&(e.data.morphAttributes=a,e.data.morphTargetsRelative=this.morphTargetsRelative);const c=this.groups;c.length>0&&(e.data.groups=JSON.parse(JSON.stringify(c)));const d=this.boundingSphere;return d!==null&&(e.data.boundingSphere=d.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const r=e.index;r!==null&&this.setIndex(r.clone());const a=e.attributes;for(const f in a){const m=a[f];this.setAttribute(f,m.clone(t))}const l=e.morphAttributes;for(const f in l){const m=[],x=l[f];for(let g=0,M=x.length;g<M;g++)m.push(x[g].clone(t));this.morphAttributes[f]=m}this.morphTargetsRelative=e.morphTargetsRelative;const c=e.groups;for(let f=0,m=c.length;f<m;f++){const x=c[f];this.addGroup(x.start,x.count,x.materialIndex)}const d=e.boundingBox;d!==null&&(this.boundingBox=d.clone());const h=e.boundingSphere;return h!==null&&(this.boundingSphere=h.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}let Ib=0;class Sr extends ks{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Ib++}),this.uuid=ic(),this.name="",this.type="Material",this.blending=xo,this.side=Fs,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=gp,this.blendDst=xp,this.blendEquation=la,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new xt(0,0,0),this.blendAlpha=0,this.depthFunc=Do,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Yx,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Qa,this.stencilZFail=Qa,this.stencilZPass=Qa,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const r=e[t];if(r===void 0){lt(`Material: parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){lt(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}a&&a.isColor?a.set(r):a&&a.isVector2&&r&&r.isVector2||a&&a.isEuler&&r&&r.isEuler||a&&a.isVector3&&r&&r.isVector3?a.copy(r):this[t]=r}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const r={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.color&&this.color.isColor&&(r.color=this.color.getHex()),this.roughness!==void 0&&(r.roughness=this.roughness),this.metalness!==void 0&&(r.metalness=this.metalness),this.sheen!==void 0&&(r.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(r.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(r.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(r.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(r.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(r.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(r.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(r.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(r.shininess=this.shininess),this.clearcoat!==void 0&&(r.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(r.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(r.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(r.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(r.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,r.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(r.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(r.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(r.dispersion=this.dispersion),this.iridescence!==void 0&&(r.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(r.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(r.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(r.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(r.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(r.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(r.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(r.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(r.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(r.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(r.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(r.lightMap=this.lightMap.toJSON(e).uuid,r.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(r.aoMap=this.aoMap.toJSON(e).uuid,r.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(r.bumpMap=this.bumpMap.toJSON(e).uuid,r.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(r.normalMap=this.normalMap.toJSON(e).uuid,r.normalMapType=this.normalMapType,r.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(r.displacementMap=this.displacementMap.toJSON(e).uuid,r.displacementScale=this.displacementScale,r.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(r.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(r.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(r.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(r.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(r.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(r.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(r.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(r.combine=this.combine)),this.envMapRotation!==void 0&&(r.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(r.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(r.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(r.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(r.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(r.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(r.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(r.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(r.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(r.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(r.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(r.size=this.size),this.shadowSide!==null&&(r.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(r.sizeAttenuation=this.sizeAttenuation),this.blending!==xo&&(r.blending=this.blending),this.side!==Fs&&(r.side=this.side),this.vertexColors===!0&&(r.vertexColors=!0),this.opacity<1&&(r.opacity=this.opacity),this.transparent===!0&&(r.transparent=!0),this.blendSrc!==gp&&(r.blendSrc=this.blendSrc),this.blendDst!==xp&&(r.blendDst=this.blendDst),this.blendEquation!==la&&(r.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(r.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(r.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(r.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(r.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(r.blendAlpha=this.blendAlpha),this.depthFunc!==Do&&(r.depthFunc=this.depthFunc),this.depthTest===!1&&(r.depthTest=this.depthTest),this.depthWrite===!1&&(r.depthWrite=this.depthWrite),this.colorWrite===!1&&(r.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(r.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Yx&&(r.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(r.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(r.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Qa&&(r.stencilFail=this.stencilFail),this.stencilZFail!==Qa&&(r.stencilZFail=this.stencilZFail),this.stencilZPass!==Qa&&(r.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(r.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(r.rotation=this.rotation),this.polygonOffset===!0&&(r.polygonOffset=!0),this.polygonOffsetFactor!==0&&(r.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(r.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(r.linewidth=this.linewidth),this.dashSize!==void 0&&(r.dashSize=this.dashSize),this.gapSize!==void 0&&(r.gapSize=this.gapSize),this.scale!==void 0&&(r.scale=this.scale),this.dithering===!0&&(r.dithering=!0),this.alphaTest>0&&(r.alphaTest=this.alphaTest),this.alphaHash===!0&&(r.alphaHash=!0),this.alphaToCoverage===!0&&(r.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(r.premultipliedAlpha=!0),this.forceSinglePass===!0&&(r.forceSinglePass=!0),this.allowOverride===!1&&(r.allowOverride=!1),this.wireframe===!0&&(r.wireframe=!0),this.wireframeLinewidth>1&&(r.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(r.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(r.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(r.flatShading=!0),this.visible===!1&&(r.visible=!1),this.toneMapped===!1&&(r.toneMapped=!1),this.fog===!1&&(r.fog=!1),Object.keys(this.userData).length>0&&(r.userData=this.userData);function a(l){const c=[];for(const d in l){const h=l[d];delete h.metadata,c.push(h)}return c}if(t){const l=a(e.textures),c=a(e.images);l.length>0&&(r.textures=l),c.length>0&&(r.images=c)}return r}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new xt().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let r=e.normalScale;Array.isArray(r)===!1&&(r=[r,r]),this.normalScale=new ut().fromArray(r)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new ut().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let r=null;if(t!==null){const a=t.length;r=new Array(a);for(let l=0;l!==a;++l)r[l]=t[l].clone()}return this.clippingPlanes=r,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}const Fr=new te,Uf=new te,Eu=new te,ys=new te,Ff=new te,wu=new te,Of=new te;class yd{constructor(e=new te,t=new te(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Fr)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const r=t.dot(this.direction);return r<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,r)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Fr.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Fr.copy(this.origin).addScaledVector(this.direction,t),Fr.distanceToSquared(e))}distanceSqToSegment(e,t,r,a){Uf.copy(e).add(t).multiplyScalar(.5),Eu.copy(t).sub(e).normalize(),ys.copy(this.origin).sub(Uf);const l=e.distanceTo(t)*.5,c=-this.direction.dot(Eu),d=ys.dot(this.direction),h=-ys.dot(Eu),f=ys.lengthSq(),m=Math.abs(1-c*c);let x,g,M,E;if(m>0)if(x=c*h-d,g=c*d-h,E=l*m,x>=0)if(g>=-E)if(g<=E){const w=1/m;x*=w,g*=w,M=x*(x+c*g+2*d)+g*(c*x+g+2*h)+f}else g=l,x=Math.max(0,-(c*g+d)),M=-x*x+g*(g+2*h)+f;else g=-l,x=Math.max(0,-(c*g+d)),M=-x*x+g*(g+2*h)+f;else g<=-E?(x=Math.max(0,-(-c*l+d)),g=x>0?-l:Math.min(Math.max(-l,-h),l),M=-x*x+g*(g+2*h)+f):g<=E?(x=0,g=Math.min(Math.max(-l,-h),l),M=g*(g+2*h)+f):(x=Math.max(0,-(c*l+d)),g=x>0?l:Math.min(Math.max(-l,-h),l),M=-x*x+g*(g+2*h)+f);else g=c>0?-l:l,x=Math.max(0,-(c*g+d)),M=-x*x+g*(g+2*h)+f;return r&&r.copy(this.origin).addScaledVector(this.direction,x),a&&a.copy(Uf).addScaledVector(Eu,g),M}intersectSphere(e,t){Fr.subVectors(e.center,this.origin);const r=Fr.dot(this.direction),a=Fr.dot(Fr)-r*r,l=e.radius*e.radius;if(a>l)return null;const c=Math.sqrt(l-a),d=r-c,h=r+c;return h<0?null:d<0?this.at(h,t):this.at(d,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const r=-(this.origin.dot(e.normal)+e.constant)/t;return r>=0?r:null}intersectPlane(e,t){const r=this.distanceToPlane(e);return r===null?null:this.at(r,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let r,a,l,c,d,h;const f=1/this.direction.x,m=1/this.direction.y,x=1/this.direction.z,g=this.origin;return f>=0?(r=(e.min.x-g.x)*f,a=(e.max.x-g.x)*f):(r=(e.max.x-g.x)*f,a=(e.min.x-g.x)*f),m>=0?(l=(e.min.y-g.y)*m,c=(e.max.y-g.y)*m):(l=(e.max.y-g.y)*m,c=(e.min.y-g.y)*m),r>c||l>a||((l>r||isNaN(r))&&(r=l),(c<a||isNaN(a))&&(a=c),x>=0?(d=(e.min.z-g.z)*x,h=(e.max.z-g.z)*x):(d=(e.max.z-g.z)*x,h=(e.min.z-g.z)*x),r>h||d>a)||((d>r||r!==r)&&(r=d),(h<a||a!==a)&&(a=h),a<0)?null:this.at(r>=0?r:a,t)}intersectsBox(e){return this.intersectBox(e,Fr)!==null}intersectTriangle(e,t,r,a,l){Ff.subVectors(t,e),wu.subVectors(r,e),Of.crossVectors(Ff,wu);let c=this.direction.dot(Of),d;if(c>0){if(a)return null;d=1}else if(c<0)d=-1,c=-c;else return null;ys.subVectors(this.origin,e);const h=d*this.direction.dot(wu.crossVectors(ys,wu));if(h<0)return null;const f=d*this.direction.dot(Ff.cross(ys));if(f<0||h+f>c)return null;const m=-d*ys.dot(Of);return m<0?null:this.at(m/c,l)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Ey extends Sr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new xt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Kr,this.combine=Pm,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const dv=new an,sa=new yd,bu=new rc,hv=new te,Tu=new te,Cu=new te,Ru=new te,kf=new te,Au=new te,fv=new te,Pu=new te;class Zi extends En{constructor(e=new Mi,t=new Ey){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}getVertexPosition(e,t){const r=this.geometry,a=r.attributes.position,l=r.morphAttributes.position,c=r.morphTargetsRelative;t.fromBufferAttribute(a,e);const d=this.morphTargetInfluences;if(l&&d){Au.set(0,0,0);for(let h=0,f=l.length;h<f;h++){const m=d[h],x=l[h];m!==0&&(kf.fromBufferAttribute(x,e),c?Au.addScaledVector(kf,m):Au.addScaledVector(kf.sub(t),m))}t.add(Au)}return t}raycast(e,t){const r=this.geometry,a=this.material,l=this.matrixWorld;a!==void 0&&(r.boundingSphere===null&&r.computeBoundingSphere(),bu.copy(r.boundingSphere),bu.applyMatrix4(l),sa.copy(e.ray).recast(e.near),!(bu.containsPoint(sa.origin)===!1&&(sa.intersectSphere(bu,hv)===null||sa.origin.distanceToSquared(hv)>(e.far-e.near)**2))&&(dv.copy(l).invert(),sa.copy(e.ray).applyMatrix4(dv),!(r.boundingBox!==null&&sa.intersectsBox(r.boundingBox)===!1)&&this._computeIntersections(e,t,sa)))}_computeIntersections(e,t,r){let a;const l=this.geometry,c=this.material,d=l.index,h=l.attributes.position,f=l.attributes.uv,m=l.attributes.uv1,x=l.attributes.normal,g=l.groups,M=l.drawRange;if(d!==null)if(Array.isArray(c))for(let E=0,w=g.length;E<w;E++){const S=g[E],y=c[S.materialIndex],N=Math.max(S.start,M.start),L=Math.min(d.count,Math.min(S.start+S.count,M.start+M.count));for(let C=N,D=L;C<D;C+=3){const P=d.getX(C),U=d.getX(C+1),b=d.getX(C+2);a=Nu(this,y,e,r,f,m,x,P,U,b),a&&(a.faceIndex=Math.floor(C/3),a.face.materialIndex=S.materialIndex,t.push(a))}}else{const E=Math.max(0,M.start),w=Math.min(d.count,M.start+M.count);for(let S=E,y=w;S<y;S+=3){const N=d.getX(S),L=d.getX(S+1),C=d.getX(S+2);a=Nu(this,c,e,r,f,m,x,N,L,C),a&&(a.faceIndex=Math.floor(S/3),t.push(a))}}else if(h!==void 0)if(Array.isArray(c))for(let E=0,w=g.length;E<w;E++){const S=g[E],y=c[S.materialIndex],N=Math.max(S.start,M.start),L=Math.min(h.count,Math.min(S.start+S.count,M.start+M.count));for(let C=N,D=L;C<D;C+=3){const P=C,U=C+1,b=C+2;a=Nu(this,y,e,r,f,m,x,P,U,b),a&&(a.faceIndex=Math.floor(C/3),a.face.materialIndex=S.materialIndex,t.push(a))}}else{const E=Math.max(0,M.start),w=Math.min(h.count,M.start+M.count);for(let S=E,y=w;S<y;S+=3){const N=S,L=S+1,C=S+2;a=Nu(this,c,e,r,f,m,x,N,L,C),a&&(a.faceIndex=Math.floor(S/3),t.push(a))}}}}function Ub(i,e,t,r,a,l,c,d){let h;if(e.side===hi?h=r.intersectTriangle(c,l,a,!0,d):h=r.intersectTriangle(a,l,c,e.side===Fs,d),h===null)return null;Pu.copy(d),Pu.applyMatrix4(i.matrixWorld);const f=t.ray.origin.distanceTo(Pu);return f<t.near||f>t.far?null:{distance:f,point:Pu.clone(),object:i}}function Nu(i,e,t,r,a,l,c,d,h,f){i.getVertexPosition(d,Tu),i.getVertexPosition(h,Cu),i.getVertexPosition(f,Ru);const m=Ub(i,e,t,r,Tu,Cu,Ru,fv);if(m){const x=new te;Yi.getBarycoord(fv,Tu,Cu,Ru,x),a&&(m.uv=Yi.getInterpolatedAttribute(a,d,h,f,x,new ut)),l&&(m.uv1=Yi.getInterpolatedAttribute(l,d,h,f,x,new ut)),c&&(m.normal=Yi.getInterpolatedAttribute(c,d,h,f,x,new te),m.normal.dot(r.direction)>0&&m.normal.multiplyScalar(-1));const g={a:d,b:h,c:f,normal:new te,materialIndex:0};Yi.getNormal(Tu,Cu,Ru,g.normal),m.face=g,m.barycoord=x}return m}class Fb extends Xn{constructor(e=null,t=1,r=1,a,l,c,d,h,f=Fn,m=Fn,x,g){super(null,c,d,h,f,m,a,l,x,g),this.isDataTexture=!0,this.image={data:e,width:t,height:r},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const zf=new te,Ob=new te,kb=new pt;class Es{constructor(e=new te(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,r,a){return this.normal.set(e,t,r),this.constant=a,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,r){const a=zf.subVectors(r,t).cross(Ob.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(a,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,r=!0){const a=e.delta(zf),l=this.normal.dot(a);if(l===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const c=-(e.start.dot(this.normal)+this.constant)/l;return r===!0&&(c<0||c>1)?null:t.copy(e.start).addScaledVector(a,c)}intersectsLine(e){const t=this.distanceToPoint(e.start),r=this.distanceToPoint(e.end);return t<0&&r>0||r<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const r=t||kb.getNormalMatrix(e),a=this.coplanarPoint(zf).applyMatrix4(e),l=this.normal.applyMatrix3(r).normalize();return this.constant=-a.dot(l),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const aa=new rc,zb=new ut(.5,.5),Lu=new te;class Hm{constructor(e=new Es,t=new Es,r=new Es,a=new Es,l=new Es,c=new Es){this.planes=[e,t,r,a,l,c]}set(e,t,r,a,l,c){const d=this.planes;return d[0].copy(e),d[1].copy(t),d[2].copy(r),d[3].copy(a),d[4].copy(l),d[5].copy(c),this}copy(e){const t=this.planes;for(let r=0;r<6;r++)t[r].copy(e.planes[r]);return this}setFromProjectionMatrix(e,t=gr,r=!1){const a=this.planes,l=e.elements,c=l[0],d=l[1],h=l[2],f=l[3],m=l[4],x=l[5],g=l[6],M=l[7],E=l[8],w=l[9],S=l[10],y=l[11],N=l[12],L=l[13],C=l[14],D=l[15];if(a[0].setComponents(f-c,M-m,y-E,D-N).normalize(),a[1].setComponents(f+c,M+m,y+E,D+N).normalize(),a[2].setComponents(f+d,M+x,y+w,D+L).normalize(),a[3].setComponents(f-d,M-x,y-w,D-L).normalize(),r)a[4].setComponents(h,g,S,C).normalize(),a[5].setComponents(f-h,M-g,y-S,D-C).normalize();else if(a[4].setComponents(f-h,M-g,y-S,D-C).normalize(),t===gr)a[5].setComponents(f+h,M+g,y+S,D+C).normalize();else if(t===ql)a[5].setComponents(h,g,S,C).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),aa.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),aa.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(aa)}intersectsSprite(e){aa.center.set(0,0,0);const t=zb.distanceTo(e.center);return aa.radius=.7071067811865476+t,aa.applyMatrix4(e.matrixWorld),this.intersectsSphere(aa)}intersectsSphere(e){const t=this.planes,r=e.center,a=-e.radius;for(let l=0;l<6;l++)if(t[l].distanceToPoint(r)<a)return!1;return!0}intersectsBox(e){const t=this.planes;for(let r=0;r<6;r++){const a=t[r];if(Lu.x=a.normal.x>0?e.max.x:e.min.x,Lu.y=a.normal.y>0?e.max.y:e.min.y,Lu.z=a.normal.z>0?e.max.z:e.min.z,a.distanceToPoint(Lu)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let r=0;r<6;r++)if(t[r].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Ju extends Sr{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new xt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const ud=new te,dd=new te,pv=new an,Ll=new yd,Du=new rc,Bf=new te,mv=new te;class Bb extends En{constructor(e=new Mi,t=new Ju){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,r=[0];for(let a=1,l=t.count;a<l;a++)ud.fromBufferAttribute(t,a-1),dd.fromBufferAttribute(t,a),r[a]=r[a-1],r[a]+=ud.distanceTo(dd);e.setAttribute("lineDistance",new Un(r,1))}else lt("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const r=this.geometry,a=this.matrixWorld,l=e.params.Line.threshold,c=r.drawRange;if(r.boundingSphere===null&&r.computeBoundingSphere(),Du.copy(r.boundingSphere),Du.applyMatrix4(a),Du.radius+=l,e.ray.intersectsSphere(Du)===!1)return;pv.copy(a).invert(),Ll.copy(e.ray).applyMatrix4(pv);const d=l/((this.scale.x+this.scale.y+this.scale.z)/3),h=d*d,f=this.isLineSegments?2:1,m=r.index,g=r.attributes.position;if(m!==null){const M=Math.max(0,c.start),E=Math.min(m.count,c.start+c.count);for(let w=M,S=E-1;w<S;w+=f){const y=m.getX(w),N=m.getX(w+1),L=Iu(this,e,Ll,h,y,N,w);L&&t.push(L)}if(this.isLineLoop){const w=m.getX(E-1),S=m.getX(M),y=Iu(this,e,Ll,h,w,S,E-1);y&&t.push(y)}}else{const M=Math.max(0,c.start),E=Math.min(g.count,c.start+c.count);for(let w=M,S=E-1;w<S;w+=f){const y=Iu(this,e,Ll,h,w,w+1,w);y&&t.push(y)}if(this.isLineLoop){const w=Iu(this,e,Ll,h,E-1,M,E-1);w&&t.push(w)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}}function Iu(i,e,t,r,a,l,c){const d=i.geometry.attributes.position;if(ud.fromBufferAttribute(d,a),dd.fromBufferAttribute(d,l),t.distanceSqToSegment(ud,dd,Bf,mv)>r)return;Bf.applyMatrix4(i.matrixWorld);const f=e.ray.origin.distanceTo(Bf);if(!(f<e.near||f>e.far))return{distance:f,point:mv.clone().applyMatrix4(i.matrixWorld),index:c,face:null,faceIndex:null,barycoord:null,object:i}}const gv=new te,xv=new te;class vv extends Bb{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,r=[];for(let a=0,l=t.count;a<l;a+=2)gv.fromBufferAttribute(t,a),xv.fromBufferAttribute(t,a+1),r[a]=a===0?0:r[a-1],r[a+1]=r[a]+gv.distanceTo(xv);e.setAttribute("lineDistance",new Un(r,1))}else lt("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class zl extends Sr{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new xt(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const _v=new an,rm=new yd,Uu=new rc,Fu=new te;class Hf extends En{constructor(e=new Mi,t=new zl){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const r=this.geometry,a=this.matrixWorld,l=e.params.Points.threshold,c=r.drawRange;if(r.boundingSphere===null&&r.computeBoundingSphere(),Uu.copy(r.boundingSphere),Uu.applyMatrix4(a),Uu.radius+=l,e.ray.intersectsSphere(Uu)===!1)return;_v.copy(a).invert(),rm.copy(e.ray).applyMatrix4(_v);const d=l/((this.scale.x+this.scale.y+this.scale.z)/3),h=d*d,f=r.index,x=r.attributes.position;if(f!==null){const g=Math.max(0,c.start),M=Math.min(f.count,c.start+c.count);for(let E=g,w=M;E<w;E++){const S=f.getX(E);Fu.fromBufferAttribute(x,S),yv(Fu,S,h,a,e,t,this)}}else{const g=Math.max(0,c.start),M=Math.min(x.count,c.start+c.count);for(let E=g,w=M;E<w;E++)Fu.fromBufferAttribute(x,E),yv(Fu,E,h,a,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}}function yv(i,e,t,r,a,l,c){const d=rm.distanceSqToPoint(i);if(d<t){const h=new te;rm.closestPointToPoint(i,h),h.applyMatrix4(r);const f=a.ray.origin.distanceTo(h);if(f<a.near||f>a.far)return;l.push({distance:f,distanceToRay:Math.sqrt(d),point:h,index:e,face:null,faceIndex:null,barycoord:null,object:c})}}class wy extends Xn{constructor(e=[],t=wa,r,a,l,c,d,h,f,m){super(e,t,r,a,l,c,d,h,f,m),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Uo extends Xn{constructor(e,t,r=yr,a,l,c,d=Fn,h=Fn,f,m=Yr,x=1){if(m!==Yr&&m!==ha)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const g={width:e,height:t,depth:x};super(g,a,l,c,d,h,m,r,f),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Bm(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class Hb extends Uo{constructor(e,t=yr,r=wa,a,l,c=Fn,d=Fn,h,f=Yr){const m={width:e,height:e,depth:1},x=[m,m,m,m,m,m];super(e,e,t,r,a,l,c,d,h,f),this.image=x,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class by extends Xn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class sc extends Mi{constructor(e=1,t=1,r=1,a=1,l=1,c=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:r,widthSegments:a,heightSegments:l,depthSegments:c};const d=this;a=Math.floor(a),l=Math.floor(l),c=Math.floor(c);const h=[],f=[],m=[],x=[];let g=0,M=0;E("z","y","x",-1,-1,r,t,e,c,l,0),E("z","y","x",1,-1,r,t,-e,c,l,1),E("x","z","y",1,1,e,r,t,a,c,2),E("x","z","y",1,-1,e,r,-t,a,c,3),E("x","y","z",1,-1,e,t,r,a,l,4),E("x","y","z",-1,-1,e,t,-r,a,l,5),this.setIndex(h),this.setAttribute("position",new Un(f,3)),this.setAttribute("normal",new Un(m,3)),this.setAttribute("uv",new Un(x,2));function E(w,S,y,N,L,C,D,P,U,b,I){const X=C/U,O=D/b,K=C/2,se=D/2,fe=P/2,Y=U+1,me=b+1;let B=0,$=0;const ne=new te;for(let ce=0;ce<me;ce++){const H=ce*O-se;for(let F=0;F<Y;F++){const Te=F*X-K;ne[w]=Te*N,ne[S]=H*L,ne[y]=fe,f.push(ne.x,ne.y,ne.z),ne[w]=0,ne[S]=0,ne[y]=P>0?1:-1,m.push(ne.x,ne.y,ne.z),x.push(F/U),x.push(1-ce/b),B+=1}}for(let ce=0;ce<b;ce++)for(let H=0;H<U;H++){const F=g+H+Y*ce,Te=g+H+Y*(ce+1),Oe=g+(H+1)+Y*(ce+1),ze=g+(H+1)+Y*ce;h.push(F,Te,ze),h.push(Te,Oe,ze),$+=6}d.addGroup(M,$,I),M+=$,g+=B}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new sc(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class Sd extends Mi{constructor(e=1,t=1,r=1,a=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:r,heightSegments:a};const l=e/2,c=t/2,d=Math.floor(r),h=Math.floor(a),f=d+1,m=h+1,x=e/d,g=t/h,M=[],E=[],w=[],S=[];for(let y=0;y<m;y++){const N=y*g-c;for(let L=0;L<f;L++){const C=L*x-l;E.push(C,-N,0),w.push(0,0,1),S.push(L/d),S.push(1-y/h)}}for(let y=0;y<h;y++)for(let N=0;N<d;N++){const L=N+f*y,C=N+f*(y+1),D=N+1+f*(y+1),P=N+1+f*y;M.push(L,C,P),M.push(C,D,P)}this.setIndex(M),this.setAttribute("position",new Un(E,3)),this.setAttribute("normal",new Un(w,3)),this.setAttribute("uv",new Un(S,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Sd(e.width,e.height,e.widthSegments,e.heightSegments)}}function Fo(i){const e={};for(const t in i){e[t]={};for(const r in i[t]){const a=i[t][r];if(Sv(a))a.isRenderTargetTexture?(lt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][r]=null):e[t][r]=a.clone();else if(Array.isArray(a))if(Sv(a[0])){const l=[];for(let c=0,d=a.length;c<d;c++)l[c]=a[c].clone();e[t][r]=l}else e[t][r]=a.slice();else e[t][r]=a}}return e}function Kn(i){const e={};for(let t=0;t<i.length;t++){const r=Fo(i[t]);for(const a in r)e[a]=r[a]}return e}function Sv(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function Vb(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function Ty(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:At.workingColorSpace}const Gb={clone:Fo,merge:Kn};var jb=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Wb=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Mr extends Sr{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=jb,this.fragmentShader=Wb,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Fo(e.uniforms),this.uniformsGroups=Vb(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const a in this.uniforms){const c=this.uniforms[a].value;c&&c.isTexture?t.uniforms[a]={type:"t",value:c.toJSON(e).uuid}:c&&c.isColor?t.uniforms[a]={type:"c",value:c.getHex()}:c&&c.isVector2?t.uniforms[a]={type:"v2",value:c.toArray()}:c&&c.isVector3?t.uniforms[a]={type:"v3",value:c.toArray()}:c&&c.isVector4?t.uniforms[a]={type:"v4",value:c.toArray()}:c&&c.isMatrix3?t.uniforms[a]={type:"m3",value:c.toArray()}:c&&c.isMatrix4?t.uniforms[a]={type:"m4",value:c.toArray()}:t.uniforms[a]={value:c}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const r={};for(const a in this.extensions)this.extensions[a]===!0&&(r[a]=!0);return Object.keys(r).length>0&&(t.extensions=r),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(const r in e.uniforms){const a=e.uniforms[r];switch(this.uniforms[r]={},a.type){case"t":this.uniforms[r].value=t[a.value]||null;break;case"c":this.uniforms[r].value=new xt().setHex(a.value);break;case"v2":this.uniforms[r].value=new ut().fromArray(a.value);break;case"v3":this.uniforms[r].value=new te().fromArray(a.value);break;case"v4":this.uniforms[r].value=new un().fromArray(a.value);break;case"m3":this.uniforms[r].value=new pt().fromArray(a.value);break;case"m4":this.uniforms[r].value=new an().fromArray(a.value);break;default:this.uniforms[r].value=a.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(const r in e.extensions)this.extensions[r]=e.extensions[r];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}}class Xb extends Mr{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class Vf extends Sr{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new xt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new xt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=od,this.normalScale=new ut(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Kr,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class $b extends Sr{constructor(e){super(),this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new xt(16777215),this.specular=new xt(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new xt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=od,this.normalScale=new ut(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Kr,this.combine=Pm,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.specular.copy(e.specular),this.shininess=e.shininess,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class qb extends Sr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=ib,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class Yb extends Sr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const Hl={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(Mv(i)||(this.files[i]=e))},get:function(i){if(this.enabled!==!1&&!Mv(i))return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};function Mv(i){try{const e=i.slice(i.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}class Kb{constructor(e,t,r){const a=this;let l=!1,c=0,d=0,h;const f=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=r,this._abortController=null,this.itemStart=function(m){d++,l===!1&&a.onStart!==void 0&&a.onStart(m,c,d),l=!0},this.itemEnd=function(m){c++,a.onProgress!==void 0&&a.onProgress(m,c,d),c===d&&(l=!1,a.onLoad!==void 0&&a.onLoad())},this.itemError=function(m){a.onError!==void 0&&a.onError(m)},this.resolveURL=function(m){return m=m.normalize("NFC"),h?h(m):m},this.setURLModifier=function(m){return h=m,this},this.addHandler=function(m,x){return f.push(m,x),this},this.removeHandler=function(m){const x=f.indexOf(m);return x!==-1&&f.splice(x,2),this},this.getHandler=function(m){for(let x=0,g=f.length;x<g;x+=2){const M=f[x],E=f[x+1];if(M.global&&(M.lastIndex=0),M.test(m))return E}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const Qb=new Kb;class ac{constructor(e){this.manager=e!==void 0?e:Qb,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){const r=this;return new Promise(function(a,l){r.load(e,a,t,l)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}ac.DEFAULT_MATERIAL_NAME="__DEFAULT";const Or={};class Zb extends Error{constructor(e,t){super(e),this.response=t}}class Jb extends ac{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,r,a){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const l=Hl.get(`file:${e}`);if(l!==void 0){this.manager.itemStart(e),setTimeout(()=>{t&&t(l),this.manager.itemEnd(e)},0);return}if(Or[e]!==void 0){Or[e].push({onLoad:t,onProgress:r,onError:a});return}Or[e]=[],Or[e].push({onLoad:t,onProgress:r,onError:a});const c=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),d=this.mimeType,h=this.responseType;fetch(c).then(f=>{if(f.status===200||f.status===0){if(f.status===0&&lt("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||f.body===void 0||f.body.getReader===void 0)return f;const m=Or[e],x=f.body.getReader(),g=f.headers.get("X-File-Size")||f.headers.get("Content-Length"),M=g?parseInt(g):0,E=M!==0;let w=0;const S=new ReadableStream({start(y){N();function N(){x.read().then(({done:L,value:C})=>{if(L)y.close();else{w+=C.byteLength;const D=new ProgressEvent("progress",{lengthComputable:E,loaded:w,total:M});for(let P=0,U=m.length;P<U;P++){const b=m[P];b.onProgress&&b.onProgress(D)}y.enqueue(C),N()}},L=>{y.error(L)})}}});return new Response(S)}else throw new Zb(`fetch for "${f.url}" responded with ${f.status}: ${f.statusText}`,f)}).then(f=>{switch(h){case"arraybuffer":return f.arrayBuffer();case"blob":return f.blob();case"document":return f.text().then(m=>new DOMParser().parseFromString(m,d));case"json":return f.json();default:if(d==="")return f.text();{const x=/charset="?([^;"\s]*)"?/i.exec(d),g=x&&x[1]?x[1].toLowerCase():void 0,M=new TextDecoder(g);return f.arrayBuffer().then(E=>M.decode(E))}}}).then(f=>{Hl.add(`file:${e}`,f);const m=Or[e];delete Or[e];for(let x=0,g=m.length;x<g;x++){const M=m[x];M.onLoad&&M.onLoad(f)}}).catch(f=>{const m=Or[e];if(m===void 0)throw this.manager.itemError(e),f;delete Or[e];for(let x=0,g=m.length;x<g;x++){const M=m[x];M.onError&&M.onError(f)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const lo=new WeakMap;class eT extends ac{constructor(e){super(e)}load(e,t,r,a){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const l=this,c=Hl.get(`image:${e}`);if(c!==void 0){if(c.complete===!0)l.manager.itemStart(e),setTimeout(function(){t&&t(c),l.manager.itemEnd(e)},0);else{let x=lo.get(c);x===void 0&&(x=[],lo.set(c,x)),x.push({onLoad:t,onError:a})}return c}const d=Yl("img");function h(){m(),t&&t(this);const x=lo.get(this)||[];for(let g=0;g<x.length;g++){const M=x[g];M.onLoad&&M.onLoad(this)}lo.delete(this),l.manager.itemEnd(e)}function f(x){m(),a&&a(x),Hl.remove(`image:${e}`);const g=lo.get(this)||[];for(let M=0;M<g.length;M++){const E=g[M];E.onError&&E.onError(x)}lo.delete(this),l.manager.itemError(e),l.manager.itemEnd(e)}function m(){d.removeEventListener("load",h,!1),d.removeEventListener("error",f,!1)}return d.addEventListener("load",h,!1),d.addEventListener("error",f,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(d.crossOrigin=this.crossOrigin),Hl.add(`image:${e}`,d),l.manager.itemStart(e),d.src=e,d}}class tT extends ac{constructor(e){super(e)}load(e,t,r,a){const l=new Xn,c=new eT(this.manager);return c.setCrossOrigin(this.crossOrigin),c.setPath(this.path),c.load(e,function(d){l.image=d,l.needsUpdate=!0,t!==void 0&&t(l)},r,a),l}}class Vm extends En{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new xt(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}class nT extends Vm{constructor(e,t,r){super(e,r),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(En.DEFAULT_UP),this.updateMatrix(),this.groundColor=new xt(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){const t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}}const Gf=new an,Ev=new te,wv=new te;class iT{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ut(512,512),this.mapType=Si,this.map=null,this.mapPass=null,this.matrix=new an,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Hm,this._frameExtents=new ut(1,1),this._viewportCount=1,this._viewports=[new un(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,r=this.matrix;Ev.setFromMatrixPosition(e.matrixWorld),t.position.copy(Ev),wv.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(wv),t.updateMatrixWorld(),Gf.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Gf,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===ql||t.reversedDepth?r.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):r.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),r.multiply(Gf)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Ou=new te,ku=new Os,ar=new te;class Cy extends En{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new an,this.projectionMatrix=new an,this.projectionMatrixInverse=new an,this.coordinateSystem=gr,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Ou,ku,ar),ar.x===1&&ar.y===1&&ar.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ou,ku,ar.set(1,1,1)).invert()}updateWorldMatrix(e,t,r=!1){super.updateWorldMatrix(e,t,r),this.matrixWorld.decompose(Ou,ku,ar),ar.x===1&&ar.y===1&&ar.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ou,ku,ar.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const Ss=new te,bv=new ut,Tv=new ut;class Ii extends Cy{constructor(e=50,t=1,r=.1,a=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=r,this.far=a,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=im*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Zu*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return im*2*Math.atan(Math.tan(Zu*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,r){Ss.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Ss.x,Ss.y).multiplyScalar(-e/Ss.z),Ss.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),r.set(Ss.x,Ss.y).multiplyScalar(-e/Ss.z)}getViewSize(e,t){return this.getViewBounds(e,bv,Tv),t.subVectors(Tv,bv)}setViewOffset(e,t,r,a,l,c){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=r,this.view.offsetY=a,this.view.width=l,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Zu*.5*this.fov)/this.zoom,r=2*t,a=this.aspect*r,l=-.5*a;const c=this.view;if(this.view!==null&&this.view.enabled){const h=c.fullWidth,f=c.fullHeight;l+=c.offsetX*a/h,t-=c.offsetY*r/f,a*=c.width/h,r*=c.height/f}const d=this.filmOffset;d!==0&&(l+=e*d/this.getFilmWidth()),this.projectionMatrix.makePerspective(l,l+a,t,t-r,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class Gm extends Cy{constructor(e=-1,t=1,r=1,a=-1,l=.1,c=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=r,this.bottom=a,this.near=l,this.far=c,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,r,a,l,c){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=r,this.view.offsetY=a,this.view.width=l,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),r=(this.right+this.left)/2,a=(this.top+this.bottom)/2;let l=r-e,c=r+e,d=a+t,h=a-t;if(this.view!==null&&this.view.enabled){const f=(this.right-this.left)/this.view.fullWidth/this.zoom,m=(this.top-this.bottom)/this.view.fullHeight/this.zoom;l+=f*this.view.offsetX,c=l+f*this.view.width,d-=m*this.view.offsetY,h=d-m*this.view.height}this.projectionMatrix.makeOrthographic(l,c,d,h,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class rT extends iT{constructor(){super(new Gm(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class jf extends Vm{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(En.DEFAULT_UP),this.updateMatrix(),this.target=new En,this.shadow=new rT}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}class sT extends Vm{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}const co=-90,uo=1;class aT extends En{constructor(e,t,r){super(),this.type="CubeCamera",this.renderTarget=r,this.coordinateSystem=null,this.activeMipmapLevel=0;const a=new Ii(co,uo,e,t);a.layers=this.layers,this.add(a);const l=new Ii(co,uo,e,t);l.layers=this.layers,this.add(l);const c=new Ii(co,uo,e,t);c.layers=this.layers,this.add(c);const d=new Ii(co,uo,e,t);d.layers=this.layers,this.add(d);const h=new Ii(co,uo,e,t);h.layers=this.layers,this.add(h);const f=new Ii(co,uo,e,t);f.layers=this.layers,this.add(f)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[r,a,l,c,d,h]=t;for(const f of t)this.remove(f);if(e===gr)r.up.set(0,1,0),r.lookAt(1,0,0),a.up.set(0,1,0),a.lookAt(-1,0,0),l.up.set(0,0,-1),l.lookAt(0,1,0),c.up.set(0,0,1),c.lookAt(0,-1,0),d.up.set(0,1,0),d.lookAt(0,0,1),h.up.set(0,1,0),h.lookAt(0,0,-1);else if(e===ql)r.up.set(0,-1,0),r.lookAt(-1,0,0),a.up.set(0,-1,0),a.lookAt(1,0,0),l.up.set(0,0,1),l.lookAt(0,1,0),c.up.set(0,0,-1),c.lookAt(0,-1,0),d.up.set(0,-1,0),d.lookAt(0,0,1),h.up.set(0,-1,0),h.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const f of t)this.add(f),f.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:r,activeMipmapLevel:a}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[l,c,d,h,f,m]=this.children,x=e.getRenderTarget(),g=e.getActiveCubeFace(),M=e.getActiveMipmapLevel(),E=e.xr.enabled;e.xr.enabled=!1;const w=r.texture.generateMipmaps;r.texture.generateMipmaps=!1;let S=!1;e.isWebGLRenderer===!0?S=e.state.buffers.depth.getReversed():S=e.reversedDepthBuffer,e.setRenderTarget(r,0,a),S&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(r,1,a),S&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(r,2,a),S&&e.autoClear===!1&&e.clearDepth(),e.render(t,d),e.setRenderTarget(r,3,a),S&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(r,4,a),S&&e.autoClear===!1&&e.clearDepth(),e.render(t,f),r.texture.generateMipmaps=w,e.setRenderTarget(r,5,a),S&&e.autoClear===!1&&e.clearDepth(),e.render(t,m),e.setRenderTarget(x,g,M),e.xr.enabled=E,r.texture.needsPMREMUpdate=!0}}class oT extends Ii{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class Cv{constructor(e=1,t=0,r=0){this.radius=e,this.phi=t,this.theta=r}set(e,t,r){return this.radius=e,this.phi=t,this.theta=r,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=bt(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,r){return this.radius=Math.sqrt(e*e+t*t+r*r),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,r),this.phi=Math.acos(bt(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}const Ym=class Ym{constructor(e,t,r,a){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,r,a)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let r=0;r<4;r++)this.elements[r]=e[r+t];return this}set(e,t,r,a){const l=this.elements;return l[0]=e,l[2]=t,l[1]=r,l[3]=a,this}};Ym.prototype.isMatrix2=!0;let Rv=Ym;class lT extends ks{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){if(e===void 0){lt("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}}function Av(i,e,t,r){const a=cT(r);switch(t){case py:return i*e;case gy:return i*e/a.components*a.byteLength;case Um:return i*e/a.components*a.byteLength;case ba:return i*e*2/a.components*a.byteLength;case Fm:return i*e*2/a.components*a.byteLength;case my:return i*e*3/a.components*a.byteLength;case Ki:return i*e*4/a.components*a.byteLength;case Om:return i*e*4/a.components*a.byteLength;case qu:case Yu:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Ku:case Qu:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Rp:case Pp:return Math.max(i,16)*Math.max(e,8)/4;case Cp:case Ap:return Math.max(i,8)*Math.max(e,8)/2;case Np:case Lp:case Ip:case Up:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Dp:case sd:case Fp:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Op:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case kp:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case zp:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case Bp:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case Hp:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case Vp:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case Gp:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case jp:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case Wp:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case Xp:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case $p:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case qp:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case Yp:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case Kp:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case Qp:case Zp:case Jp:return Math.ceil(i/4)*Math.ceil(e/4)*16;case em:case tm:return Math.ceil(i/4)*Math.ceil(e/4)*8;case ad:case nm:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function cT(i){switch(i){case Si:case uy:return{byteLength:1,components:1};case Xl:case dy:case qr:return{byteLength:2,components:1};case Dm:case Im:return{byteLength:2,components:4};case yr:case Lm:case mr:return{byteLength:4,components:1};case hy:case fy:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Am}}));typeof window<"u"&&(window.__THREE__?lt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Am);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Ry(){let i=null,e=!1,t=null,r=null;function a(l,c){t(l,c),r=i.requestAnimationFrame(a)}return{start:function(){e!==!0&&t!==null&&i!==null&&(r=i.requestAnimationFrame(a),e=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(r),e=!1},setAnimationLoop:function(l){t=l},setContext:function(l){i=l}}}function uT(i){const e=new WeakMap;function t(d,h){const f=d.array,m=d.usage,x=f.byteLength,g=i.createBuffer();i.bindBuffer(h,g),i.bufferData(h,f,m),d.onUploadCallback();let M;if(f instanceof Float32Array)M=i.FLOAT;else if(typeof Float16Array<"u"&&f instanceof Float16Array)M=i.HALF_FLOAT;else if(f instanceof Uint16Array)d.isFloat16BufferAttribute?M=i.HALF_FLOAT:M=i.UNSIGNED_SHORT;else if(f instanceof Int16Array)M=i.SHORT;else if(f instanceof Uint32Array)M=i.UNSIGNED_INT;else if(f instanceof Int32Array)M=i.INT;else if(f instanceof Int8Array)M=i.BYTE;else if(f instanceof Uint8Array)M=i.UNSIGNED_BYTE;else if(f instanceof Uint8ClampedArray)M=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+f);return{buffer:g,type:M,bytesPerElement:f.BYTES_PER_ELEMENT,version:d.version,size:x}}function r(d,h,f){const m=h.array,x=h.updateRanges;if(i.bindBuffer(f,d),x.length===0)i.bufferSubData(f,0,m);else{x.sort((M,E)=>M.start-E.start);let g=0;for(let M=1;M<x.length;M++){const E=x[g],w=x[M];w.start<=E.start+E.count+1?E.count=Math.max(E.count,w.start+w.count-E.start):(++g,x[g]=w)}x.length=g+1;for(let M=0,E=x.length;M<E;M++){const w=x[M];i.bufferSubData(f,w.start*m.BYTES_PER_ELEMENT,m,w.start,w.count)}h.clearUpdateRanges()}h.onUploadCallback()}function a(d){return d.isInterleavedBufferAttribute&&(d=d.data),e.get(d)}function l(d){d.isInterleavedBufferAttribute&&(d=d.data);const h=e.get(d);h&&(i.deleteBuffer(h.buffer),e.delete(d))}function c(d,h){if(d.isInterleavedBufferAttribute&&(d=d.data),d.isGLBufferAttribute){const m=e.get(d);(!m||m.version<d.version)&&e.set(d,{buffer:d.buffer,type:d.type,bytesPerElement:d.elementSize,version:d.version});return}const f=e.get(d);if(f===void 0)e.set(d,t(d,h));else if(f.version<d.version){if(f.size!==d.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");r(f.buffer,d,h),f.version=d.version}}return{get:a,remove:l,update:c}}var dT=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,hT=`#ifdef USE_ALPHAHASH
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
#endif`,fT=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,pT=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,mT=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,gT=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,xT=`#ifdef USE_AOMAP
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
#endif`,vT=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,_T=`#ifdef USE_BATCHING
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
#endif`,yT=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,ST=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,MT=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,ET=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,wT=`#ifdef USE_IRIDESCENCE
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
#endif`,bT=`#ifdef USE_BUMPMAP
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
#endif`,TT=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,CT=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,RT=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,AT=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,PT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,NT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,LT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,DT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,IT=`#define PI 3.141592653589793
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
} // validated`,UT=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,FT=`vec3 transformedNormal = objectNormal;
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
#endif`,OT=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,kT=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,zT=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,BT=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,HT="gl_FragColor = linearToOutputTexel( gl_FragColor );",VT=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,GT=`#ifdef USE_ENVMAP
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
#endif`,jT=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,WT=`#ifdef USE_ENVMAP
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
#endif`,XT=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,$T=`#ifdef USE_ENVMAP
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
#endif`,qT=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,YT=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,KT=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,QT=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,ZT=`#ifdef USE_GRADIENTMAP
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
}`,JT=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,eC=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,tC=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,nC=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,iC=`#ifdef USE_ENVMAP
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
#endif`,rC=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,sC=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,aC=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,oC=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lC=`PhysicalMaterial material;
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
#endif`,cC=`uniform sampler2D dfgLUT;
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
}`,uC=`
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
#endif`,dC=`#if defined( RE_IndirectDiffuse )
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
#endif`,hC=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,fC=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,pC=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,mC=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,gC=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,xC=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,vC=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,_C=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,yC=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,SC=`#if defined( USE_POINTS_UV )
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
#endif`,MC=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,EC=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,wC=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,bC=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,TC=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,CC=`#ifdef USE_MORPHTARGETS
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
#endif`,RC=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,AC=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,PC=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,NC=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,LC=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,DC=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,IC=`#ifdef USE_NORMALMAP
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
#endif`,UC=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,FC=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,OC=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,kC=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,zC=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,BC=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,HC=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,VC=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,GC=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,jC=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,WC=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,XC=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,$C=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,qC=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,YC=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,KC=`float getShadowMask() {
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
}`,QC=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,ZC=`#ifdef USE_SKINNING
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
#endif`,JC=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,eR=`#ifdef USE_SKINNING
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
#endif`,tR=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,nR=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,iR=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,rR=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,sR=`#ifdef USE_TRANSMISSION
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
#endif`,aR=`#ifdef USE_TRANSMISSION
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
#endif`,oR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,lR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,cR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,uR=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const dR=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,hR=`uniform sampler2D t2D;
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
}`,fR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,pR=`#ifdef ENVMAP_TYPE_CUBE
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
}`,mR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,gR=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,xR=`#include <common>
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
}`,vR=`#if DEPTH_PACKING == 3200
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
}`,_R=`#define DISTANCE
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
}`,yR=`#define DISTANCE
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
}`,SR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,MR=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,ER=`uniform float scale;
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
}`,wR=`uniform vec3 diffuse;
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
}`,bR=`#include <common>
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
}`,TR=`uniform vec3 diffuse;
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
}`,CR=`#define LAMBERT
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
}`,RR=`#define LAMBERT
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
}`,AR=`#define MATCAP
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
}`,PR=`#define MATCAP
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
}`,NR=`#define NORMAL
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
}`,LR=`#define NORMAL
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
}`,DR=`#define PHONG
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
}`,IR=`#define PHONG
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
}`,UR=`#define STANDARD
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
}`,FR=`#define STANDARD
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
}`,OR=`#define TOON
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
}`,kR=`#define TOON
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
}`,zR=`uniform float size;
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
}`,BR=`uniform vec3 diffuse;
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
}`,HR=`#include <common>
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
}`,VR=`uniform vec3 color;
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
}`,GR=`uniform float rotation;
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
}`,jR=`uniform vec3 diffuse;
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
}`,_t={alphahash_fragment:dT,alphahash_pars_fragment:hT,alphamap_fragment:fT,alphamap_pars_fragment:pT,alphatest_fragment:mT,alphatest_pars_fragment:gT,aomap_fragment:xT,aomap_pars_fragment:vT,batching_pars_vertex:_T,batching_vertex:yT,begin_vertex:ST,beginnormal_vertex:MT,bsdfs:ET,iridescence_fragment:wT,bumpmap_pars_fragment:bT,clipping_planes_fragment:TT,clipping_planes_pars_fragment:CT,clipping_planes_pars_vertex:RT,clipping_planes_vertex:AT,color_fragment:PT,color_pars_fragment:NT,color_pars_vertex:LT,color_vertex:DT,common:IT,cube_uv_reflection_fragment:UT,defaultnormal_vertex:FT,displacementmap_pars_vertex:OT,displacementmap_vertex:kT,emissivemap_fragment:zT,emissivemap_pars_fragment:BT,colorspace_fragment:HT,colorspace_pars_fragment:VT,envmap_fragment:GT,envmap_common_pars_fragment:jT,envmap_pars_fragment:WT,envmap_pars_vertex:XT,envmap_physical_pars_fragment:iC,envmap_vertex:$T,fog_vertex:qT,fog_pars_vertex:YT,fog_fragment:KT,fog_pars_fragment:QT,gradientmap_pars_fragment:ZT,lightmap_pars_fragment:JT,lights_lambert_fragment:eC,lights_lambert_pars_fragment:tC,lights_pars_begin:nC,lights_toon_fragment:rC,lights_toon_pars_fragment:sC,lights_phong_fragment:aC,lights_phong_pars_fragment:oC,lights_physical_fragment:lC,lights_physical_pars_fragment:cC,lights_fragment_begin:uC,lights_fragment_maps:dC,lights_fragment_end:hC,lightprobes_pars_fragment:fC,logdepthbuf_fragment:pC,logdepthbuf_pars_fragment:mC,logdepthbuf_pars_vertex:gC,logdepthbuf_vertex:xC,map_fragment:vC,map_pars_fragment:_C,map_particle_fragment:yC,map_particle_pars_fragment:SC,metalnessmap_fragment:MC,metalnessmap_pars_fragment:EC,morphinstance_vertex:wC,morphcolor_vertex:bC,morphnormal_vertex:TC,morphtarget_pars_vertex:CC,morphtarget_vertex:RC,normal_fragment_begin:AC,normal_fragment_maps:PC,normal_pars_fragment:NC,normal_pars_vertex:LC,normal_vertex:DC,normalmap_pars_fragment:IC,clearcoat_normal_fragment_begin:UC,clearcoat_normal_fragment_maps:FC,clearcoat_pars_fragment:OC,iridescence_pars_fragment:kC,opaque_fragment:zC,packing:BC,premultiplied_alpha_fragment:HC,project_vertex:VC,dithering_fragment:GC,dithering_pars_fragment:jC,roughnessmap_fragment:WC,roughnessmap_pars_fragment:XC,shadowmap_pars_fragment:$C,shadowmap_pars_vertex:qC,shadowmap_vertex:YC,shadowmask_pars_fragment:KC,skinbase_vertex:QC,skinning_pars_vertex:ZC,skinning_vertex:JC,skinnormal_vertex:eR,specularmap_fragment:tR,specularmap_pars_fragment:nR,tonemapping_fragment:iR,tonemapping_pars_fragment:rR,transmission_fragment:sR,transmission_pars_fragment:aR,uv_pars_fragment:oR,uv_pars_vertex:lR,uv_vertex:cR,worldpos_vertex:uR,background_vert:dR,background_frag:hR,backgroundCube_vert:fR,backgroundCube_frag:pR,cube_vert:mR,cube_frag:gR,depth_vert:xR,depth_frag:vR,distance_vert:_R,distance_frag:yR,equirect_vert:SR,equirect_frag:MR,linedashed_vert:ER,linedashed_frag:wR,meshbasic_vert:bR,meshbasic_frag:TR,meshlambert_vert:CR,meshlambert_frag:RR,meshmatcap_vert:AR,meshmatcap_frag:PR,meshnormal_vert:NR,meshnormal_frag:LR,meshphong_vert:DR,meshphong_frag:IR,meshphysical_vert:UR,meshphysical_frag:FR,meshtoon_vert:OR,meshtoon_frag:kR,points_vert:zR,points_frag:BR,shadow_vert:HR,shadow_frag:VR,sprite_vert:GR,sprite_frag:jR},Be={common:{diffuse:{value:new xt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new pt},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new pt}},envmap:{envMap:{value:null},envMapRotation:{value:new pt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new pt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new pt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new pt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new pt},normalScale:{value:new ut(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new pt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new pt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new pt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new pt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new xt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new te},probesMax:{value:new te},probesResolution:{value:new te}},points:{diffuse:{value:new xt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0},uvTransform:{value:new pt}},sprite:{diffuse:{value:new xt(16777215)},opacity:{value:1},center:{value:new ut(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new pt},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0}}},fr={basic:{uniforms:Kn([Be.common,Be.specularmap,Be.envmap,Be.aomap,Be.lightmap,Be.fog]),vertexShader:_t.meshbasic_vert,fragmentShader:_t.meshbasic_frag},lambert:{uniforms:Kn([Be.common,Be.specularmap,Be.envmap,Be.aomap,Be.lightmap,Be.emissivemap,Be.bumpmap,Be.normalmap,Be.displacementmap,Be.fog,Be.lights,{emissive:{value:new xt(0)},envMapIntensity:{value:1}}]),vertexShader:_t.meshlambert_vert,fragmentShader:_t.meshlambert_frag},phong:{uniforms:Kn([Be.common,Be.specularmap,Be.envmap,Be.aomap,Be.lightmap,Be.emissivemap,Be.bumpmap,Be.normalmap,Be.displacementmap,Be.fog,Be.lights,{emissive:{value:new xt(0)},specular:{value:new xt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:_t.meshphong_vert,fragmentShader:_t.meshphong_frag},standard:{uniforms:Kn([Be.common,Be.envmap,Be.aomap,Be.lightmap,Be.emissivemap,Be.bumpmap,Be.normalmap,Be.displacementmap,Be.roughnessmap,Be.metalnessmap,Be.fog,Be.lights,{emissive:{value:new xt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:_t.meshphysical_vert,fragmentShader:_t.meshphysical_frag},toon:{uniforms:Kn([Be.common,Be.aomap,Be.lightmap,Be.emissivemap,Be.bumpmap,Be.normalmap,Be.displacementmap,Be.gradientmap,Be.fog,Be.lights,{emissive:{value:new xt(0)}}]),vertexShader:_t.meshtoon_vert,fragmentShader:_t.meshtoon_frag},matcap:{uniforms:Kn([Be.common,Be.bumpmap,Be.normalmap,Be.displacementmap,Be.fog,{matcap:{value:null}}]),vertexShader:_t.meshmatcap_vert,fragmentShader:_t.meshmatcap_frag},points:{uniforms:Kn([Be.points,Be.fog]),vertexShader:_t.points_vert,fragmentShader:_t.points_frag},dashed:{uniforms:Kn([Be.common,Be.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:_t.linedashed_vert,fragmentShader:_t.linedashed_frag},depth:{uniforms:Kn([Be.common,Be.displacementmap]),vertexShader:_t.depth_vert,fragmentShader:_t.depth_frag},normal:{uniforms:Kn([Be.common,Be.bumpmap,Be.normalmap,Be.displacementmap,{opacity:{value:1}}]),vertexShader:_t.meshnormal_vert,fragmentShader:_t.meshnormal_frag},sprite:{uniforms:Kn([Be.sprite,Be.fog]),vertexShader:_t.sprite_vert,fragmentShader:_t.sprite_frag},background:{uniforms:{uvTransform:{value:new pt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:_t.background_vert,fragmentShader:_t.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new pt}},vertexShader:_t.backgroundCube_vert,fragmentShader:_t.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:_t.cube_vert,fragmentShader:_t.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:_t.equirect_vert,fragmentShader:_t.equirect_frag},distance:{uniforms:Kn([Be.common,Be.displacementmap,{referencePosition:{value:new te},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:_t.distance_vert,fragmentShader:_t.distance_frag},shadow:{uniforms:Kn([Be.lights,Be.fog,{color:{value:new xt(0)},opacity:{value:1}}]),vertexShader:_t.shadow_vert,fragmentShader:_t.shadow_frag}};fr.physical={uniforms:Kn([fr.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new pt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new pt},clearcoatNormalScale:{value:new ut(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new pt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new pt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new pt},sheen:{value:0},sheenColor:{value:new xt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new pt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new pt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new pt},transmissionSamplerSize:{value:new ut},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new pt},attenuationDistance:{value:0},attenuationColor:{value:new xt(0)},specularColor:{value:new xt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new pt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new pt},anisotropyVector:{value:new ut},anisotropyMap:{value:null},anisotropyMapTransform:{value:new pt}}]),vertexShader:_t.meshphysical_vert,fragmentShader:_t.meshphysical_frag};const zu={r:0,b:0,g:0},WR=new an,Ay=new pt;Ay.set(-1,0,0,0,1,0,0,0,1);function XR(i,e,t,r,a,l){const c=new xt(0);let d=a===!0?0:1,h,f,m=null,x=0,g=null;function M(N){let L=N.isScene===!0?N.background:null;if(L&&L.isTexture){const C=N.backgroundBlurriness>0;L=e.get(L,C)}return L}function E(N){let L=!1;const C=M(N);C===null?S(c,d):C&&C.isColor&&(S(C,1),L=!0);const D=i.xr.getEnvironmentBlendMode();D==="additive"?t.buffers.color.setClear(0,0,0,1,l):D==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,l),(i.autoClear||L)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function w(N,L){const C=M(L);C&&(C.isCubeTexture||C.mapping===_d)?(f===void 0&&(f=new Zi(new sc(1,1,1),new Mr({name:"BackgroundCubeMaterial",uniforms:Fo(fr.backgroundCube.uniforms),vertexShader:fr.backgroundCube.vertexShader,fragmentShader:fr.backgroundCube.fragmentShader,side:hi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),f.geometry.deleteAttribute("normal"),f.geometry.deleteAttribute("uv"),f.onBeforeRender=function(D,P,U){this.matrixWorld.copyPosition(U.matrixWorld)},Object.defineProperty(f.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(f)),f.material.uniforms.envMap.value=C,f.material.uniforms.backgroundBlurriness.value=L.backgroundBlurriness,f.material.uniforms.backgroundIntensity.value=L.backgroundIntensity,f.material.uniforms.backgroundRotation.value.setFromMatrix4(WR.makeRotationFromEuler(L.backgroundRotation)).transpose(),C.isCubeTexture&&C.isRenderTargetTexture===!1&&f.material.uniforms.backgroundRotation.value.premultiply(Ay),f.material.toneMapped=At.getTransfer(C.colorSpace)!==jt,(m!==C||x!==C.version||g!==i.toneMapping)&&(f.material.needsUpdate=!0,m=C,x=C.version,g=i.toneMapping),f.layers.enableAll(),N.unshift(f,f.geometry,f.material,0,0,null)):C&&C.isTexture&&(h===void 0&&(h=new Zi(new Sd(2,2),new Mr({name:"BackgroundMaterial",uniforms:Fo(fr.background.uniforms),vertexShader:fr.background.vertexShader,fragmentShader:fr.background.fragmentShader,side:Fs,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),Object.defineProperty(h.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(h)),h.material.uniforms.t2D.value=C,h.material.uniforms.backgroundIntensity.value=L.backgroundIntensity,h.material.toneMapped=At.getTransfer(C.colorSpace)!==jt,C.matrixAutoUpdate===!0&&C.updateMatrix(),h.material.uniforms.uvTransform.value.copy(C.matrix),(m!==C||x!==C.version||g!==i.toneMapping)&&(h.material.needsUpdate=!0,m=C,x=C.version,g=i.toneMapping),h.layers.enableAll(),N.unshift(h,h.geometry,h.material,0,0,null))}function S(N,L){N.getRGB(zu,Ty(i)),t.buffers.color.setClear(zu.r,zu.g,zu.b,L,l)}function y(){f!==void 0&&(f.geometry.dispose(),f.material.dispose(),f=void 0),h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0)}return{getClearColor:function(){return c},setClearColor:function(N,L=1){c.set(N),d=L,S(c,d)},getClearAlpha:function(){return d},setClearAlpha:function(N){d=N,S(c,d)},render:E,addToRenderList:w,dispose:y}}function $R(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),r={},a=g(null);let l=a,c=!1;function d(O,K,se,fe,Y){let me=!1;const B=x(O,fe,se,K);l!==B&&(l=B,f(l.object)),me=M(O,fe,se,Y),me&&E(O,fe,se,Y),Y!==null&&e.update(Y,i.ELEMENT_ARRAY_BUFFER),(me||c)&&(c=!1,C(O,K,se,fe),Y!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(Y).buffer))}function h(){return i.createVertexArray()}function f(O){return i.bindVertexArray(O)}function m(O){return i.deleteVertexArray(O)}function x(O,K,se,fe){const Y=fe.wireframe===!0;let me=r[K.id];me===void 0&&(me={},r[K.id]=me);const B=O.isInstancedMesh===!0?O.id:0;let $=me[B];$===void 0&&($={},me[B]=$);let ne=$[se.id];ne===void 0&&(ne={},$[se.id]=ne);let ce=ne[Y];return ce===void 0&&(ce=g(h()),ne[Y]=ce),ce}function g(O){const K=[],se=[],fe=[];for(let Y=0;Y<t;Y++)K[Y]=0,se[Y]=0,fe[Y]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:K,enabledAttributes:se,attributeDivisors:fe,object:O,attributes:{},index:null}}function M(O,K,se,fe){const Y=l.attributes,me=K.attributes;let B=0;const $=se.getAttributes();for(const ne in $)if($[ne].location>=0){const H=Y[ne];let F=me[ne];if(F===void 0&&(ne==="instanceMatrix"&&O.instanceMatrix&&(F=O.instanceMatrix),ne==="instanceColor"&&O.instanceColor&&(F=O.instanceColor)),H===void 0||H.attribute!==F||F&&H.data!==F.data)return!0;B++}return l.attributesNum!==B||l.index!==fe}function E(O,K,se,fe){const Y={},me=K.attributes;let B=0;const $=se.getAttributes();for(const ne in $)if($[ne].location>=0){let H=me[ne];H===void 0&&(ne==="instanceMatrix"&&O.instanceMatrix&&(H=O.instanceMatrix),ne==="instanceColor"&&O.instanceColor&&(H=O.instanceColor));const F={};F.attribute=H,H&&H.data&&(F.data=H.data),Y[ne]=F,B++}l.attributes=Y,l.attributesNum=B,l.index=fe}function w(){const O=l.newAttributes;for(let K=0,se=O.length;K<se;K++)O[K]=0}function S(O){y(O,0)}function y(O,K){const se=l.newAttributes,fe=l.enabledAttributes,Y=l.attributeDivisors;se[O]=1,fe[O]===0&&(i.enableVertexAttribArray(O),fe[O]=1),Y[O]!==K&&(i.vertexAttribDivisor(O,K),Y[O]=K)}function N(){const O=l.newAttributes,K=l.enabledAttributes;for(let se=0,fe=K.length;se<fe;se++)K[se]!==O[se]&&(i.disableVertexAttribArray(se),K[se]=0)}function L(O,K,se,fe,Y,me,B){B===!0?i.vertexAttribIPointer(O,K,se,Y,me):i.vertexAttribPointer(O,K,se,fe,Y,me)}function C(O,K,se,fe){w();const Y=fe.attributes,me=se.getAttributes(),B=K.defaultAttributeValues;for(const $ in me){const ne=me[$];if(ne.location>=0){let ce=Y[$];if(ce===void 0&&($==="instanceMatrix"&&O.instanceMatrix&&(ce=O.instanceMatrix),$==="instanceColor"&&O.instanceColor&&(ce=O.instanceColor)),ce!==void 0){const H=ce.normalized,F=ce.itemSize,Te=e.get(ce);if(Te===void 0)continue;const Oe=Te.buffer,ze=Te.type,ie=Te.bytesPerElement,Me=ze===i.INT||ze===i.UNSIGNED_INT||ce.gpuType===Lm;if(ce.isInterleavedBufferAttribute){const xe=ce.data,Fe=xe.stride,Xe=ce.offset;if(xe.isInstancedInterleavedBuffer){for(let Qe=0;Qe<ne.locationSize;Qe++)y(ne.location+Qe,xe.meshPerAttribute);O.isInstancedMesh!==!0&&fe._maxInstanceCount===void 0&&(fe._maxInstanceCount=xe.meshPerAttribute*xe.count)}else for(let Qe=0;Qe<ne.locationSize;Qe++)S(ne.location+Qe);i.bindBuffer(i.ARRAY_BUFFER,Oe);for(let Qe=0;Qe<ne.locationSize;Qe++)L(ne.location+Qe,F/ne.locationSize,ze,H,Fe*ie,(Xe+F/ne.locationSize*Qe)*ie,Me)}else{if(ce.isInstancedBufferAttribute){for(let xe=0;xe<ne.locationSize;xe++)y(ne.location+xe,ce.meshPerAttribute);O.isInstancedMesh!==!0&&fe._maxInstanceCount===void 0&&(fe._maxInstanceCount=ce.meshPerAttribute*ce.count)}else for(let xe=0;xe<ne.locationSize;xe++)S(ne.location+xe);i.bindBuffer(i.ARRAY_BUFFER,Oe);for(let xe=0;xe<ne.locationSize;xe++)L(ne.location+xe,F/ne.locationSize,ze,H,F*ie,F/ne.locationSize*xe*ie,Me)}}else if(B!==void 0){const H=B[$];if(H!==void 0)switch(H.length){case 2:i.vertexAttrib2fv(ne.location,H);break;case 3:i.vertexAttrib3fv(ne.location,H);break;case 4:i.vertexAttrib4fv(ne.location,H);break;default:i.vertexAttrib1fv(ne.location,H)}}}}N()}function D(){I();for(const O in r){const K=r[O];for(const se in K){const fe=K[se];for(const Y in fe){const me=fe[Y];for(const B in me)m(me[B].object),delete me[B];delete fe[Y]}}delete r[O]}}function P(O){if(r[O.id]===void 0)return;const K=r[O.id];for(const se in K){const fe=K[se];for(const Y in fe){const me=fe[Y];for(const B in me)m(me[B].object),delete me[B];delete fe[Y]}}delete r[O.id]}function U(O){for(const K in r){const se=r[K];for(const fe in se){const Y=se[fe];if(Y[O.id]===void 0)continue;const me=Y[O.id];for(const B in me)m(me[B].object),delete me[B];delete Y[O.id]}}}function b(O){for(const K in r){const se=r[K],fe=O.isInstancedMesh===!0?O.id:0,Y=se[fe];if(Y!==void 0){for(const me in Y){const B=Y[me];for(const $ in B)m(B[$].object),delete B[$];delete Y[me]}delete se[fe],Object.keys(se).length===0&&delete r[K]}}}function I(){X(),c=!0,l!==a&&(l=a,f(l.object))}function X(){a.geometry=null,a.program=null,a.wireframe=!1}return{setup:d,reset:I,resetDefaultState:X,dispose:D,releaseStatesOfGeometry:P,releaseStatesOfObject:b,releaseStatesOfProgram:U,initAttributes:w,enableAttribute:S,disableUnusedAttributes:N}}function qR(i,e,t){let r;function a(h){r=h}function l(h,f){i.drawArrays(r,h,f),t.update(f,r,1)}function c(h,f,m){m!==0&&(i.drawArraysInstanced(r,h,f,m),t.update(f,r,m))}function d(h,f,m){if(m===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(r,h,0,f,0,m);let g=0;for(let M=0;M<m;M++)g+=f[M];t.update(g,r,1)}this.setMode=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=d}function YR(i,e,t,r){let a;function l(){if(a!==void 0)return a;if(e.has("EXT_texture_filter_anisotropic")===!0){const U=e.get("EXT_texture_filter_anisotropic");a=i.getParameter(U.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else a=0;return a}function c(U){return!(U!==Ki&&r.convert(U)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function d(U){const b=U===qr&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(U!==Si&&r.convert(U)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&U!==mr&&!b)}function h(U){if(U==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";U="mediump"}return U==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let f=t.precision!==void 0?t.precision:"highp";const m=h(f);m!==f&&(lt("WebGLRenderer:",f,"not supported, using",m,"instead."),f=m);const x=t.logarithmicDepthBuffer===!0,g=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&g===!1&&lt("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const M=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),E=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),w=i.getParameter(i.MAX_TEXTURE_SIZE),S=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),y=i.getParameter(i.MAX_VERTEX_ATTRIBS),N=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),L=i.getParameter(i.MAX_VARYING_VECTORS),C=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),D=i.getParameter(i.MAX_SAMPLES),P=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:l,getMaxPrecision:h,textureFormatReadable:c,textureTypeReadable:d,precision:f,logarithmicDepthBuffer:x,reversedDepthBuffer:g,maxTextures:M,maxVertexTextures:E,maxTextureSize:w,maxCubemapSize:S,maxAttributes:y,maxVertexUniforms:N,maxVaryings:L,maxFragmentUniforms:C,maxSamples:D,samples:P}}function KR(i){const e=this;let t=null,r=0,a=!1,l=!1;const c=new Es,d=new pt,h={value:null,needsUpdate:!1};this.uniform=h,this.numPlanes=0,this.numIntersection=0,this.init=function(x,g){const M=x.length!==0||g||r!==0||a;return a=g,r=x.length,M},this.beginShadows=function(){l=!0,m(null)},this.endShadows=function(){l=!1},this.setGlobalState=function(x,g){t=m(x,g,0)},this.setState=function(x,g,M){const E=x.clippingPlanes,w=x.clipIntersection,S=x.clipShadows,y=i.get(x);if(!a||E===null||E.length===0||l&&!S)l?m(null):f();else{const N=l?0:r,L=N*4;let C=y.clippingState||null;h.value=C,C=m(E,g,L,M);for(let D=0;D!==L;++D)C[D]=t[D];y.clippingState=C,this.numIntersection=w?this.numPlanes:0,this.numPlanes+=N}};function f(){h.value!==t&&(h.value=t,h.needsUpdate=r>0),e.numPlanes=r,e.numIntersection=0}function m(x,g,M,E){const w=x!==null?x.length:0;let S=null;if(w!==0){if(S=h.value,E!==!0||S===null){const y=M+w*4,N=g.matrixWorldInverse;d.getNormalMatrix(N),(S===null||S.length<y)&&(S=new Float32Array(y));for(let L=0,C=M;L!==w;++L,C+=4)c.copy(x[L]).applyMatrix4(N,d),c.normal.toArray(S,C),S[C+3]=c.constant}h.value=S,h.needsUpdate=!0}return e.numPlanes=w,e.numIntersection=0,S}}const Is=4,Pv=[.125,.215,.35,.446,.526,.582],ca=20,QR=256,Dl=new Gm,Nv=new xt;let Wf=null,Xf=0,$f=0,qf=!1;const ZR=new te;class Lv{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,r=.1,a=100,l={}){const{size:c=256,position:d=ZR}=l;Wf=this._renderer.getRenderTarget(),Xf=this._renderer.getActiveCubeFace(),$f=this._renderer.getActiveMipmapLevel(),qf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(c);const h=this._allocateTargets();return h.depthBuffer=!0,this._sceneToCubeUV(e,r,a,h,d),t>0&&this._blur(h,0,0,t),this._applyPMREM(h),this._cleanup(h),h}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Uv(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Iv(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Wf,Xf,$f),this._renderer.xr.enabled=qf,e.scissorTest=!1,ho(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===wa||e.mapping===Io?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Wf=this._renderer.getRenderTarget(),Xf=this._renderer.getActiveCubeFace(),$f=this._renderer.getActiveMipmapLevel(),qf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const r=t||this._allocateTargets();return this._textureToCubeUV(e,r),this._applyPMREM(r),this._cleanup(r),r}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,r={magFilter:Wn,minFilter:Wn,generateMipmaps:!1,type:qr,format:Ki,colorSpace:ld,depthBuffer:!1},a=Dv(e,t,r);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Dv(e,t,r);const{_lodMax:l}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=JR(l)),this._blurMaterial=tA(l,e,t),this._ggxMaterial=eA(l,e,t)}return a}_compileMaterial(e){const t=new Zi(new Mi,e);this._renderer.compile(t,Dl)}_sceneToCubeUV(e,t,r,a,l){const h=new Ii(90,1,t,r),f=[1,-1,1,1,1,1],m=[1,1,1,-1,-1,-1],x=this._renderer,g=x.autoClear,M=x.toneMapping;x.getClearColor(Nv),x.toneMapping=xr,x.autoClear=!1,x.state.buffers.depth.getReversed()&&(x.setRenderTarget(a),x.clearDepth(),x.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Zi(new sc,new Ey({name:"PMREM.Background",side:hi,depthWrite:!1,depthTest:!1})));const w=this._backgroundBox,S=w.material;let y=!1;const N=e.background;N?N.isColor&&(S.color.copy(N),e.background=null,y=!0):(S.color.copy(Nv),y=!0);for(let L=0;L<6;L++){const C=L%3;C===0?(h.up.set(0,f[L],0),h.position.set(l.x,l.y,l.z),h.lookAt(l.x+m[L],l.y,l.z)):C===1?(h.up.set(0,0,f[L]),h.position.set(l.x,l.y,l.z),h.lookAt(l.x,l.y+m[L],l.z)):(h.up.set(0,f[L],0),h.position.set(l.x,l.y,l.z),h.lookAt(l.x,l.y,l.z+m[L]));const D=this._cubeSize;ho(a,C*D,L>2?D:0,D,D),x.setRenderTarget(a),y&&x.render(w,h),x.render(e,h)}x.toneMapping=M,x.autoClear=g,e.background=N}_textureToCubeUV(e,t){const r=this._renderer,a=e.mapping===wa||e.mapping===Io;a?(this._cubemapMaterial===null&&(this._cubemapMaterial=Uv()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Iv());const l=a?this._cubemapMaterial:this._equirectMaterial,c=this._lodMeshes[0];c.material=l;const d=l.uniforms;d.envMap.value=e;const h=this._cubeSize;ho(t,0,0,3*h,2*h),r.setRenderTarget(t),r.render(c,Dl)}_applyPMREM(e){const t=this._renderer,r=t.autoClear;t.autoClear=!1;const a=this._lodMeshes.length;for(let l=1;l<a;l++)this._applyGGXFilter(e,l-1,l);t.autoClear=r}_applyGGXFilter(e,t,r){const a=this._renderer,l=this._pingPongRenderTarget,c=this._ggxMaterial,d=this._lodMeshes[r];d.material=c;const h=c.uniforms,f=r/(this._lodMeshes.length-1),m=t/(this._lodMeshes.length-1),x=Math.sqrt(f*f-m*m),g=0+f*1.25,M=x*g,{_lodMax:E}=this,w=this._sizeLods[r],S=3*w*(r>E-Is?r-E+Is:0),y=4*(this._cubeSize-w);h.envMap.value=e.texture,h.roughness.value=M,h.mipInt.value=E-t,ho(l,S,y,3*w,2*w),a.setRenderTarget(l),a.render(d,Dl),h.envMap.value=l.texture,h.roughness.value=0,h.mipInt.value=E-r,ho(e,S,y,3*w,2*w),a.setRenderTarget(e),a.render(d,Dl)}_blur(e,t,r,a,l){const c=this._pingPongRenderTarget;this._halfBlur(e,c,t,r,a,"latitudinal",l),this._halfBlur(c,e,r,r,a,"longitudinal",l)}_halfBlur(e,t,r,a,l,c,d){const h=this._renderer,f=this._blurMaterial;c!=="latitudinal"&&c!=="longitudinal"&&Dt("blur direction must be either latitudinal or longitudinal!");const m=3,x=this._lodMeshes[a];x.material=f;const g=f.uniforms,M=this._sizeLods[r]-1,E=isFinite(l)?Math.PI/(2*M):2*Math.PI/(2*ca-1),w=l/E,S=isFinite(l)?1+Math.floor(m*w):ca;S>ca&&lt(`sigmaRadians, ${l}, is too large and will clip, as it requested ${S} samples when the maximum is set to ${ca}`);const y=[];let N=0;for(let U=0;U<ca;++U){const b=U/w,I=Math.exp(-b*b/2);y.push(I),U===0?N+=I:U<S&&(N+=2*I)}for(let U=0;U<y.length;U++)y[U]=y[U]/N;g.envMap.value=e.texture,g.samples.value=S,g.weights.value=y,g.latitudinal.value=c==="latitudinal",d&&(g.poleAxis.value=d);const{_lodMax:L}=this;g.dTheta.value=E,g.mipInt.value=L-r;const C=this._sizeLods[a],D=3*C*(a>L-Is?a-L+Is:0),P=4*(this._cubeSize-C);ho(t,D,P,3*C,2*C),h.setRenderTarget(t),h.render(x,Dl)}}function JR(i){const e=[],t=[],r=[];let a=i;const l=i-Is+1+Pv.length;for(let c=0;c<l;c++){const d=Math.pow(2,a);e.push(d);let h=1/d;c>i-Is?h=Pv[c-i+Is-1]:c===0&&(h=0),t.push(h);const f=1/(d-2),m=-f,x=1+f,g=[m,m,x,m,x,x,m,m,x,x,m,x],M=6,E=6,w=3,S=2,y=1,N=new Float32Array(w*E*M),L=new Float32Array(S*E*M),C=new Float32Array(y*E*M);for(let P=0;P<M;P++){const U=P%3*2/3-1,b=P>2?0:-1,I=[U,b,0,U+2/3,b,0,U+2/3,b+1,0,U,b,0,U+2/3,b+1,0,U,b+1,0];N.set(I,w*E*P),L.set(g,S*E*P);const X=[P,P,P,P,P,P];C.set(X,y*E*P)}const D=new Mi;D.setAttribute("position",new _r(N,w)),D.setAttribute("uv",new _r(L,S)),D.setAttribute("faceIndex",new _r(C,y)),r.push(new Zi(D,null)),a>Is&&a--}return{lodMeshes:r,sizeLods:e,sigmas:t}}function Dv(i,e,t){const r=new vr(i,e,t);return r.texture.mapping=_d,r.texture.name="PMREM.cubeUv",r.scissorTest=!0,r}function ho(i,e,t,r,a){i.viewport.set(e,t,r,a),i.scissor.set(e,t,r,a)}function eA(i,e,t){return new Mr({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:QR,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Md(),fragmentShader:`

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
		`,blending:jr,depthTest:!1,depthWrite:!1})}function tA(i,e,t){const r=new Float32Array(ca),a=new te(0,1,0);return new Mr({name:"SphericalGaussianBlur",defines:{n:ca,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:r},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:a}},vertexShader:Md(),fragmentShader:`

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
		`,blending:jr,depthTest:!1,depthWrite:!1})}function Iv(){return new Mr({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Md(),fragmentShader:`

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
		`,blending:jr,depthTest:!1,depthWrite:!1})}function Uv(){return new Mr({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Md(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:jr,depthTest:!1,depthWrite:!1})}function Md(){return`

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
	`}class Py extends vr{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const r={width:e,height:e,depth:1},a=[r,r,r,r,r,r];this.texture=new wy(a),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const r={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},a=new sc(5,5,5),l=new Mr({name:"CubemapFromEquirect",uniforms:Fo(r.uniforms),vertexShader:r.vertexShader,fragmentShader:r.fragmentShader,side:hi,blending:jr});l.uniforms.tEquirect.value=t;const c=new Zi(a,l),d=t.minFilter;return t.minFilter===da&&(t.minFilter=Wn),new aT(1,10,this).update(e,c),t.minFilter=d,c.geometry.dispose(),c.material.dispose(),this}clear(e,t=!0,r=!0,a=!0){const l=e.getRenderTarget();for(let c=0;c<6;c++)e.setRenderTarget(this,c),e.clear(t,r,a);e.setRenderTarget(l)}}function nA(i){let e=new WeakMap,t=new WeakMap,r=null;function a(g,M=!1){return g==null?null:M?c(g):l(g)}function l(g){if(g&&g.isTexture){const M=g.mapping;if(M===pf||M===mf)if(e.has(g)){const E=e.get(g).texture;return d(E,g.mapping)}else{const E=g.image;if(E&&E.height>0){const w=new Py(E.height);return w.fromEquirectangularTexture(i,g),e.set(g,w),g.addEventListener("dispose",f),d(w.texture,g.mapping)}else return null}}return g}function c(g){if(g&&g.isTexture){const M=g.mapping,E=M===pf||M===mf,w=M===wa||M===Io;if(E||w){let S=t.get(g);const y=S!==void 0?S.texture.pmremVersion:0;if(g.isRenderTargetTexture&&g.pmremVersion!==y)return r===null&&(r=new Lv(i)),S=E?r.fromEquirectangular(g,S):r.fromCubemap(g,S),S.texture.pmremVersion=g.pmremVersion,t.set(g,S),S.texture;if(S!==void 0)return S.texture;{const N=g.image;return E&&N&&N.height>0||w&&N&&h(N)?(r===null&&(r=new Lv(i)),S=E?r.fromEquirectangular(g):r.fromCubemap(g),S.texture.pmremVersion=g.pmremVersion,t.set(g,S),g.addEventListener("dispose",m),S.texture):null}}}return g}function d(g,M){return M===pf?g.mapping=wa:M===mf&&(g.mapping=Io),g}function h(g){let M=0;const E=6;for(let w=0;w<E;w++)g[w]!==void 0&&M++;return M===E}function f(g){const M=g.target;M.removeEventListener("dispose",f);const E=e.get(M);E!==void 0&&(e.delete(M),E.dispose())}function m(g){const M=g.target;M.removeEventListener("dispose",m);const E=t.get(M);E!==void 0&&(t.delete(M),E.dispose())}function x(){e=new WeakMap,t=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:a,dispose:x}}function iA(i){const e={};function t(r){if(e[r]!==void 0)return e[r];const a=i.getExtension(r);return e[r]=a,a}return{has:function(r){return t(r)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(r){const a=t(r);return a===null&&vo("WebGLRenderer: "+r+" extension not supported."),a}}}function rA(i,e,t,r){const a={},l=new WeakMap;function c(x){const g=x.target;g.index!==null&&e.remove(g.index);for(const E in g.attributes)e.remove(g.attributes[E]);g.removeEventListener("dispose",c),delete a[g.id];const M=l.get(g);M&&(e.remove(M),l.delete(g)),r.releaseStatesOfGeometry(g),g.isInstancedBufferGeometry===!0&&delete g._maxInstanceCount,t.memory.geometries--}function d(x,g){return a[g.id]===!0||(g.addEventListener("dispose",c),a[g.id]=!0,t.memory.geometries++),g}function h(x){const g=x.attributes;for(const M in g)e.update(g[M],i.ARRAY_BUFFER)}function f(x){const g=[],M=x.index,E=x.attributes.position;let w=0;if(E===void 0)return;if(M!==null){const N=M.array;w=M.version;for(let L=0,C=N.length;L<C;L+=3){const D=N[L+0],P=N[L+1],U=N[L+2];g.push(D,P,P,U,U,D)}}else{const N=E.array;w=E.version;for(let L=0,C=N.length/3-1;L<C;L+=3){const D=L+0,P=L+1,U=L+2;g.push(D,P,P,U,U,D)}}const S=new(E.count>=65535?My:Sy)(g,1);S.version=w;const y=l.get(x);y&&e.remove(y),l.set(x,S)}function m(x){const g=l.get(x);if(g){const M=x.index;M!==null&&g.version<M.version&&f(x)}else f(x);return l.get(x)}return{get:d,update:h,getWireframeAttribute:m}}function sA(i,e,t){let r;function a(x){r=x}let l,c;function d(x){l=x.type,c=x.bytesPerElement}function h(x,g){i.drawElements(r,g,l,x*c),t.update(g,r,1)}function f(x,g,M){M!==0&&(i.drawElementsInstanced(r,g,l,x*c,M),t.update(g,r,M))}function m(x,g,M){if(M===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(r,g,0,l,x,0,M);let w=0;for(let S=0;S<M;S++)w+=g[S];t.update(w,r,1)}this.setMode=a,this.setIndex=d,this.render=h,this.renderInstances=f,this.renderMultiDraw=m}function aA(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function r(l,c,d){switch(t.calls++,c){case i.TRIANGLES:t.triangles+=d*(l/3);break;case i.LINES:t.lines+=d*(l/2);break;case i.LINE_STRIP:t.lines+=d*(l-1);break;case i.LINE_LOOP:t.lines+=d*l;break;case i.POINTS:t.points+=d*l;break;default:Dt("WebGLInfo: Unknown draw mode:",c);break}}function a(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:a,update:r}}function oA(i,e,t){const r=new WeakMap,a=new un;function l(c,d,h){const f=c.morphTargetInfluences,m=d.morphAttributes.position||d.morphAttributes.normal||d.morphAttributes.color,x=m!==void 0?m.length:0;let g=r.get(d);if(g===void 0||g.count!==x){let X=function(){b.dispose(),r.delete(d),d.removeEventListener("dispose",X)};var M=X;g!==void 0&&g.texture.dispose();const E=d.morphAttributes.position!==void 0,w=d.morphAttributes.normal!==void 0,S=d.morphAttributes.color!==void 0,y=d.morphAttributes.position||[],N=d.morphAttributes.normal||[],L=d.morphAttributes.color||[];let C=0;E===!0&&(C=1),w===!0&&(C=2),S===!0&&(C=3);let D=d.attributes.position.count*C,P=1;D>e.maxTextureSize&&(P=Math.ceil(D/e.maxTextureSize),D=e.maxTextureSize);const U=new Float32Array(D*P*4*x),b=new vy(U,D,P,x);b.type=mr,b.needsUpdate=!0;const I=C*4;for(let O=0;O<x;O++){const K=y[O],se=N[O],fe=L[O],Y=D*P*4*O;for(let me=0;me<K.count;me++){const B=me*I;E===!0&&(a.fromBufferAttribute(K,me),U[Y+B+0]=a.x,U[Y+B+1]=a.y,U[Y+B+2]=a.z,U[Y+B+3]=0),w===!0&&(a.fromBufferAttribute(se,me),U[Y+B+4]=a.x,U[Y+B+5]=a.y,U[Y+B+6]=a.z,U[Y+B+7]=0),S===!0&&(a.fromBufferAttribute(fe,me),U[Y+B+8]=a.x,U[Y+B+9]=a.y,U[Y+B+10]=a.z,U[Y+B+11]=fe.itemSize===4?a.w:1)}}g={count:x,texture:b,size:new ut(D,P)},r.set(d,g),d.addEventListener("dispose",X)}if(c.isInstancedMesh===!0&&c.morphTexture!==null)h.getUniforms().setValue(i,"morphTexture",c.morphTexture,t);else{let E=0;for(let S=0;S<f.length;S++)E+=f[S];const w=d.morphTargetsRelative?1:1-E;h.getUniforms().setValue(i,"morphTargetBaseInfluence",w),h.getUniforms().setValue(i,"morphTargetInfluences",f)}h.getUniforms().setValue(i,"morphTargetsTexture",g.texture,t),h.getUniforms().setValue(i,"morphTargetsTextureSize",g.size)}return{update:l}}function lA(i,e,t,r,a){let l=new WeakMap;function c(f){const m=a.render.frame,x=f.geometry,g=e.get(f,x);if(l.get(g)!==m&&(e.update(g),l.set(g,m)),f.isInstancedMesh&&(f.hasEventListener("dispose",h)===!1&&f.addEventListener("dispose",h),l.get(f)!==m&&(t.update(f.instanceMatrix,i.ARRAY_BUFFER),f.instanceColor!==null&&t.update(f.instanceColor,i.ARRAY_BUFFER),l.set(f,m))),f.isSkinnedMesh){const M=f.skeleton;l.get(M)!==m&&(M.update(),l.set(M,m))}return g}function d(){l=new WeakMap}function h(f){const m=f.target;m.removeEventListener("dispose",h),r.releaseStatesOfObject(m),t.remove(m.instanceMatrix),m.instanceColor!==null&&t.remove(m.instanceColor)}return{update:c,dispose:d}}const cA={[iy]:"LINEAR_TONE_MAPPING",[ry]:"REINHARD_TONE_MAPPING",[sy]:"CINEON_TONE_MAPPING",[Nm]:"ACES_FILMIC_TONE_MAPPING",[oy]:"AGX_TONE_MAPPING",[ly]:"NEUTRAL_TONE_MAPPING",[ay]:"CUSTOM_TONE_MAPPING"};function uA(i,e,t,r,a,l){const c=new vr(e,t,{type:i,depthBuffer:a,stencilBuffer:l,samples:r?4:0,depthTexture:a?new Uo(e,t):void 0}),d=new vr(e,t,{type:qr,depthBuffer:!1,stencilBuffer:!1}),h=new Mi;h.setAttribute("position",new Un([-1,3,0,-1,-1,0,3,-1,0],3)),h.setAttribute("uv",new Un([0,2,0,0,2,0],2));const f=new Xb({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),m=new Zi(h,f),x=new Gm(-1,1,1,-1,0,1);let g=null,M=null,E=!1,w,S=null,y=[],N=!1;this.setSize=function(L,C){c.setSize(L,C),d.setSize(L,C);for(let D=0;D<y.length;D++){const P=y[D];P.setSize&&P.setSize(L,C)}},this.setEffects=function(L){y=L,N=y.length>0&&y[0].isRenderPass===!0;const C=c.width,D=c.height;for(let P=0;P<y.length;P++){const U=y[P];U.setSize&&U.setSize(C,D)}},this.begin=function(L,C){if(E||L.toneMapping===xr&&y.length===0)return!1;if(S=C,C!==null){const D=C.width,P=C.height;(c.width!==D||c.height!==P)&&this.setSize(D,P)}return N===!1&&L.setRenderTarget(c),w=L.toneMapping,L.toneMapping=xr,!0},this.hasRenderPass=function(){return N},this.end=function(L,C){L.toneMapping=w,E=!0;let D=c,P=d;for(let U=0;U<y.length;U++){const b=y[U];if(b.enabled!==!1&&(b.render(L,P,D,C),b.needsSwap!==!1)){const I=D;D=P,P=I}}if(g!==L.outputColorSpace||M!==L.toneMapping){g=L.outputColorSpace,M=L.toneMapping,f.defines={},At.getTransfer(g)===jt&&(f.defines.SRGB_TRANSFER="");const U=cA[M];U&&(f.defines[U]=""),f.needsUpdate=!0}f.uniforms.tDiffuse.value=D.texture,L.setRenderTarget(S),L.render(m,x),S=null,E=!1},this.isCompositing=function(){return E},this.dispose=function(){c.depthTexture&&c.depthTexture.dispose(),c.dispose(),d.dispose(),h.dispose(),f.dispose()}}const Ny=new Xn,sm=new Uo(1,1),Ly=new vy,Dy=new Mb,Iy=new wy,Fv=[],Ov=[],kv=new Float32Array(16),zv=new Float32Array(9),Bv=new Float32Array(4);function Vo(i,e,t){const r=i[0];if(r<=0||r>0)return i;const a=e*t;let l=Fv[a];if(l===void 0&&(l=new Float32Array(a),Fv[a]=l),e!==0){r.toArray(l,0);for(let c=1,d=0;c!==e;++c)d+=t,i[c].toArray(l,d)}return l}function wn(i,e){if(i.length!==e.length)return!1;for(let t=0,r=i.length;t<r;t++)if(i[t]!==e[t])return!1;return!0}function bn(i,e){for(let t=0,r=e.length;t<r;t++)i[t]=e[t]}function Ed(i,e){let t=Ov[e];t===void 0&&(t=new Int32Array(e),Ov[e]=t);for(let r=0;r!==e;++r)t[r]=i.allocateTextureUnit();return t}function dA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function hA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wn(t,e))return;i.uniform2fv(this.addr,e),bn(t,e)}}function fA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(wn(t,e))return;i.uniform3fv(this.addr,e),bn(t,e)}}function pA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wn(t,e))return;i.uniform4fv(this.addr,e),bn(t,e)}}function mA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(wn(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),bn(t,e)}else{if(wn(t,r))return;Bv.set(r),i.uniformMatrix2fv(this.addr,!1,Bv),bn(t,r)}}function gA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(wn(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),bn(t,e)}else{if(wn(t,r))return;zv.set(r),i.uniformMatrix3fv(this.addr,!1,zv),bn(t,r)}}function xA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(wn(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),bn(t,e)}else{if(wn(t,r))return;kv.set(r),i.uniformMatrix4fv(this.addr,!1,kv),bn(t,r)}}function vA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function _A(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wn(t,e))return;i.uniform2iv(this.addr,e),bn(t,e)}}function yA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(wn(t,e))return;i.uniform3iv(this.addr,e),bn(t,e)}}function SA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wn(t,e))return;i.uniform4iv(this.addr,e),bn(t,e)}}function MA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function EA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wn(t,e))return;i.uniform2uiv(this.addr,e),bn(t,e)}}function wA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(wn(t,e))return;i.uniform3uiv(this.addr,e),bn(t,e)}}function bA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wn(t,e))return;i.uniform4uiv(this.addr,e),bn(t,e)}}function TA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a);let l;this.type===i.SAMPLER_2D_SHADOW?(sm.compareFunction=t.isReversedDepthBuffer()?zm:km,l=sm):l=Ny,t.setTexture2D(e||l,a)}function CA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTexture3D(e||Dy,a)}function RA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTextureCube(e||Iy,a)}function AA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTexture2DArray(e||Ly,a)}function PA(i){switch(i){case 5126:return dA;case 35664:return hA;case 35665:return fA;case 35666:return pA;case 35674:return mA;case 35675:return gA;case 35676:return xA;case 5124:case 35670:return vA;case 35667:case 35671:return _A;case 35668:case 35672:return yA;case 35669:case 35673:return SA;case 5125:return MA;case 36294:return EA;case 36295:return wA;case 36296:return bA;case 35678:case 36198:case 36298:case 36306:case 35682:return TA;case 35679:case 36299:case 36307:return CA;case 35680:case 36300:case 36308:case 36293:return RA;case 36289:case 36303:case 36311:case 36292:return AA}}function NA(i,e){i.uniform1fv(this.addr,e)}function LA(i,e){const t=Vo(e,this.size,2);i.uniform2fv(this.addr,t)}function DA(i,e){const t=Vo(e,this.size,3);i.uniform3fv(this.addr,t)}function IA(i,e){const t=Vo(e,this.size,4);i.uniform4fv(this.addr,t)}function UA(i,e){const t=Vo(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function FA(i,e){const t=Vo(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function OA(i,e){const t=Vo(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function kA(i,e){i.uniform1iv(this.addr,e)}function zA(i,e){i.uniform2iv(this.addr,e)}function BA(i,e){i.uniform3iv(this.addr,e)}function HA(i,e){i.uniform4iv(this.addr,e)}function VA(i,e){i.uniform1uiv(this.addr,e)}function GA(i,e){i.uniform2uiv(this.addr,e)}function jA(i,e){i.uniform3uiv(this.addr,e)}function WA(i,e){i.uniform4uiv(this.addr,e)}function XA(i,e,t){const r=this.cache,a=e.length,l=Ed(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),bn(r,l));let c;this.type===i.SAMPLER_2D_SHADOW?c=sm:c=Ny;for(let d=0;d!==a;++d)t.setTexture2D(e[d]||c,l[d])}function $A(i,e,t){const r=this.cache,a=e.length,l=Ed(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),bn(r,l));for(let c=0;c!==a;++c)t.setTexture3D(e[c]||Dy,l[c])}function qA(i,e,t){const r=this.cache,a=e.length,l=Ed(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),bn(r,l));for(let c=0;c!==a;++c)t.setTextureCube(e[c]||Iy,l[c])}function YA(i,e,t){const r=this.cache,a=e.length,l=Ed(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),bn(r,l));for(let c=0;c!==a;++c)t.setTexture2DArray(e[c]||Ly,l[c])}function KA(i){switch(i){case 5126:return NA;case 35664:return LA;case 35665:return DA;case 35666:return IA;case 35674:return UA;case 35675:return FA;case 35676:return OA;case 5124:case 35670:return kA;case 35667:case 35671:return zA;case 35668:case 35672:return BA;case 35669:case 35673:return HA;case 5125:return VA;case 36294:return GA;case 36295:return jA;case 36296:return WA;case 35678:case 36198:case 36298:case 36306:case 35682:return XA;case 35679:case 36299:case 36307:return $A;case 35680:case 36300:case 36308:case 36293:return qA;case 36289:case 36303:case 36311:case 36292:return YA}}class QA{constructor(e,t,r){this.id=e,this.addr=r,this.cache=[],this.type=t.type,this.setValue=PA(t.type)}}class ZA{constructor(e,t,r){this.id=e,this.addr=r,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=KA(t.type)}}class JA{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,r){const a=this.seq;for(let l=0,c=a.length;l!==c;++l){const d=a[l];d.setValue(e,t[d.id],r)}}}const Yf=/(\w+)(\])?(\[|\.)?/g;function Hv(i,e){i.seq.push(e),i.map[e.id]=e}function eP(i,e,t){const r=i.name,a=r.length;for(Yf.lastIndex=0;;){const l=Yf.exec(r),c=Yf.lastIndex;let d=l[1];const h=l[2]==="]",f=l[3];if(h&&(d=d|0),f===void 0||f==="["&&c+2===a){Hv(t,f===void 0?new QA(d,i,e):new ZA(d,i,e));break}else{let x=t.map[d];x===void 0&&(x=new JA(d),Hv(t,x)),t=x}}}class ed{constructor(e,t){this.seq=[],this.map={};const r=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let c=0;c<r;++c){const d=e.getActiveUniform(t,c),h=e.getUniformLocation(t,d.name);eP(d,h,this)}const a=[],l=[];for(const c of this.seq)c.type===e.SAMPLER_2D_SHADOW||c.type===e.SAMPLER_CUBE_SHADOW||c.type===e.SAMPLER_2D_ARRAY_SHADOW?a.push(c):l.push(c);a.length>0&&(this.seq=a.concat(l))}setValue(e,t,r,a){const l=this.map[t];l!==void 0&&l.setValue(e,r,a)}setOptional(e,t,r){const a=t[r];a!==void 0&&this.setValue(e,r,a)}static upload(e,t,r,a){for(let l=0,c=t.length;l!==c;++l){const d=t[l],h=r[d.id];h.needsUpdate!==!1&&d.setValue(e,h.value,a)}}static seqWithValue(e,t){const r=[];for(let a=0,l=e.length;a!==l;++a){const c=e[a];c.id in t&&r.push(c)}return r}}function Vv(i,e,t){const r=i.createShader(e);return i.shaderSource(r,t),i.compileShader(r),r}const tP=37297;let nP=0;function iP(i,e){const t=i.split(`
`),r=[],a=Math.max(e-6,0),l=Math.min(e+6,t.length);for(let c=a;c<l;c++){const d=c+1;r.push(`${d===e?">":" "} ${d}: ${t[c]}`)}return r.join(`
`)}const Gv=new pt;function rP(i){At._getMatrix(Gv,At.workingColorSpace,i);const e=`mat3( ${Gv.elements.map(t=>t.toFixed(4))} )`;switch(At.getTransfer(i)){case cd:return[e,"LinearTransferOETF"];case jt:return[e,"sRGBTransferOETF"];default:return lt("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function jv(i,e,t){const r=i.getShaderParameter(e,i.COMPILE_STATUS),l=(i.getShaderInfoLog(e)||"").trim();if(r&&l==="")return"";const c=/ERROR: 0:(\d+)/.exec(l);if(c){const d=parseInt(c[1]);return t.toUpperCase()+`

`+l+`

`+iP(i.getShaderSource(e),d)}else return l}function sP(i,e){const t=rP(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const aP={[iy]:"Linear",[ry]:"Reinhard",[sy]:"Cineon",[Nm]:"ACESFilmic",[oy]:"AgX",[ly]:"Neutral",[ay]:"Custom"};function oP(i,e){const t=aP[e];return t===void 0?(lt("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Bu=new te;function lP(){At.getLuminanceCoefficients(Bu);const i=Bu.x.toFixed(4),e=Bu.y.toFixed(4),t=Bu.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function cP(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Bl).join(`
`)}function uP(i){const e=[];for(const t in i){const r=i[t];r!==!1&&e.push("#define "+t+" "+r)}return e.join(`
`)}function dP(i,e){const t={},r=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let a=0;a<r;a++){const l=i.getActiveAttrib(e,a),c=l.name;let d=1;l.type===i.FLOAT_MAT2&&(d=2),l.type===i.FLOAT_MAT3&&(d=3),l.type===i.FLOAT_MAT4&&(d=4),t[c]={type:l.type,location:i.getAttribLocation(e,c),locationSize:d}}return t}function Bl(i){return i!==""}function Wv(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Xv(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const hP=/^[ \t]*#include +<([\w\d./]+)>/gm;function am(i){return i.replace(hP,pP)}const fP=new Map;function pP(i,e){let t=_t[e];if(t===void 0){const r=fP.get(e);if(r!==void 0)t=_t[r],lt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,r);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return am(t)}const mP=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function $v(i){return i.replace(mP,gP)}function gP(i,e,t,r){let a="";for(let l=parseInt(e);l<parseInt(t);l++)a+=r.replace(/\[\s*i\s*\]/g,"[ "+l+" ]").replace(/UNROLLED_LOOP_INDEX/g,l);return a}function qv(i){let e=`precision ${i.precision} float;
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
#define LOW_PRECISION`),e}const xP={[$u]:"SHADOWMAP_TYPE_PCF",[Ol]:"SHADOWMAP_TYPE_VSM"};function vP(i){return xP[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const _P={[wa]:"ENVMAP_TYPE_CUBE",[Io]:"ENVMAP_TYPE_CUBE",[_d]:"ENVMAP_TYPE_CUBE_UV"};function yP(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":_P[i.envMapMode]||"ENVMAP_TYPE_CUBE"}const SP={[Io]:"ENVMAP_MODE_REFRACTION"};function MP(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":SP[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}const EP={[Pm]:"ENVMAP_BLENDING_MULTIPLY",[eb]:"ENVMAP_BLENDING_MIX",[tb]:"ENVMAP_BLENDING_ADD"};function wP(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":EP[i.combine]||"ENVMAP_BLENDING_NONE"}function bP(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,r=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:r,maxMip:t}}function TP(i,e,t,r){const a=i.getContext(),l=t.defines;let c=t.vertexShader,d=t.fragmentShader;const h=vP(t),f=yP(t),m=MP(t),x=wP(t),g=bP(t),M=cP(t),E=uP(l),w=a.createProgram();let S,y,N=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(S=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E].filter(Bl).join(`
`),S.length>0&&(S+=`
`),y=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E].filter(Bl).join(`
`),y.length>0&&(y+=`
`)):(S=[qv(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+m:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+h:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Bl).join(`
`),y=[qv(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+f:"",t.envMap?"#define "+m:"",t.envMap?"#define "+x:"",g?"#define CUBEUV_TEXEL_WIDTH "+g.texelWidth:"",g?"#define CUBEUV_TEXEL_HEIGHT "+g.texelHeight:"",g?"#define CUBEUV_MAX_MIP "+g.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+h:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==xr?"#define TONE_MAPPING":"",t.toneMapping!==xr?_t.tonemapping_pars_fragment:"",t.toneMapping!==xr?oP("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",_t.colorspace_pars_fragment,sP("linearToOutputTexel",t.outputColorSpace),lP(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Bl).join(`
`)),c=am(c),c=Wv(c,t),c=Xv(c,t),d=am(d),d=Wv(d,t),d=Xv(d,t),c=$v(c),d=$v(d),t.isRawShaderMaterial!==!0&&(N=`#version 300 es
`,S=[M,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+S,y=["#define varying in",t.glslVersion===Qx?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Qx?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+y);const L=N+S+c,C=N+y+d,D=Vv(a,a.VERTEX_SHADER,L),P=Vv(a,a.FRAGMENT_SHADER,C);a.attachShader(w,D),a.attachShader(w,P),t.index0AttributeName!==void 0?a.bindAttribLocation(w,0,t.index0AttributeName):t.hasPositionAttribute===!0&&a.bindAttribLocation(w,0,"position"),a.linkProgram(w);function U(O){if(i.debug.checkShaderErrors){const K=a.getProgramInfoLog(w)||"",se=a.getShaderInfoLog(D)||"",fe=a.getShaderInfoLog(P)||"",Y=K.trim(),me=se.trim(),B=fe.trim();let $=!0,ne=!0;if(a.getProgramParameter(w,a.LINK_STATUS)===!1)if($=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(a,w,D,P);else{const ce=jv(a,D,"vertex"),H=jv(a,P,"fragment");Dt("WebGLProgram: Shader Error "+a.getError()+" - VALIDATE_STATUS "+a.getProgramParameter(w,a.VALIDATE_STATUS)+`

Material Name: `+O.name+`
Material Type: `+O.type+`

Program Info Log: `+Y+`
`+ce+`
`+H)}else Y!==""?lt("WebGLProgram: Program Info Log:",Y):(me===""||B==="")&&(ne=!1);ne&&(O.diagnostics={runnable:$,programLog:Y,vertexShader:{log:me,prefix:S},fragmentShader:{log:B,prefix:y}})}a.deleteShader(D),a.deleteShader(P),b=new ed(a,w),I=dP(a,w)}let b;this.getUniforms=function(){return b===void 0&&U(this),b};let I;this.getAttributes=function(){return I===void 0&&U(this),I};let X=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return X===!1&&(X=a.getProgramParameter(w,tP)),X},this.destroy=function(){r.releaseStatesOfProgram(this),a.deleteProgram(w),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=nP++,this.cacheKey=e,this.usedTimes=1,this.program=w,this.vertexShader=D,this.fragmentShader=P,this}let CP=0;class RP{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,r){const a=this._getShaderCacheForMaterial(e);return a.has(t)===!1&&(a.add(t),t.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const r of t)r.usedTimes--,r.usedTimes===0&&this.shaderCache.delete(r.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let r=t.get(e);return r===void 0&&(r=new Set,t.set(e,r)),r}_getShaderStage(e){const t=this.shaderCache;let r=t.get(e);return r===void 0&&(r=new AP(e),t.set(e,r)),r}}class AP{constructor(e){this.id=CP++,this.code=e,this.usedTimes=0}}function PP(i){return i===ba||i===sd||i===ad}function NP(i,e,t,r,a,l){const c=new _y,d=new RP,h=new Set,f=[],m=new Map,x=r.logarithmicDepthBuffer;let g=r.precision;const M={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function E(b){return h.add(b),b===0?"uv":`uv${b}`}function w(b,I,X,O,K,se){const fe=O.fog,Y=K.geometry,me=b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial?O.environment:null,B=b.isMeshStandardMaterial||b.isMeshLambertMaterial&&!b.envMap||b.isMeshPhongMaterial&&!b.envMap,$=e.get(b.envMap||me,B),ne=$&&$.mapping===_d?$.image.height:null,ce=M[b.type];b.precision!==null&&(g=r.getMaxPrecision(b.precision),g!==b.precision&&lt("WebGLProgram.getParameters:",b.precision,"not supported, using",g,"instead."));const H=Y.morphAttributes.position||Y.morphAttributes.normal||Y.morphAttributes.color,F=H!==void 0?H.length:0;let Te=0;Y.morphAttributes.position!==void 0&&(Te=1),Y.morphAttributes.normal!==void 0&&(Te=2),Y.morphAttributes.color!==void 0&&(Te=3);let Oe,ze,ie,Me;if(ce){const We=fr[ce];Oe=We.vertexShader,ze=We.fragmentShader}else{Oe=b.vertexShader,ze=b.fragmentShader;const We=d.getVertexShaderStage(b),Ot=d.getFragmentShaderStage(b);d.update(b,We,Ot),ie=We.id,Me=Ot.id}const xe=i.getRenderTarget(),Fe=i.state.buffers.depth.getReversed(),Xe=K.isInstancedMesh===!0,Qe=K.isBatchedMesh===!0,It=!!b.map,dt=!!b.matcap,wt=!!$,St=!!b.aoMap,vt=!!b.lightMap,Ut=!!b.bumpMap&&b.wireframe===!1,qt=!!b.normalMap,Xt=!!b.displacementMap,$t=!!b.emissiveMap,Nt=!!b.metalnessMap,Ht=!!b.roughnessMap,Z=b.anisotropy>0,pn=b.clearcoat>0,mt=b.dispersion>0,k=b.iridescence>0,T=b.sheen>0,ee=b.transmission>0,oe=Z&&!!b.anisotropyMap,z=pn&&!!b.clearcoatMap,ye=pn&&!!b.clearcoatNormalMap,Le=pn&&!!b.clearcoatRoughnessMap,ge=k&&!!b.iridescenceMap,ve=k&&!!b.iridescenceThicknessMap,Re=T&&!!b.sheenColorMap,qe=T&&!!b.sheenRoughnessMap,Ue=!!b.specularMap,Pe=!!b.specularColorMap,et=!!b.specularIntensityMap,it=ee&&!!b.transmissionMap,de=ee&&!!b.thicknessMap,j=!!b.gradientMap,be=!!b.alphaMap,_e=b.alphaTest>0,Ie=!!b.alphaHash,ke=!!b.extensions;let Se=xr;b.toneMapped&&(xe===null||xe.isXRRenderTarget===!0)&&(Se=i.toneMapping);const Ye={shaderID:ce,shaderType:b.type,shaderName:b.name,vertexShader:Oe,fragmentShader:ze,defines:b.defines,customVertexShaderID:ie,customFragmentShaderID:Me,isRawShaderMaterial:b.isRawShaderMaterial===!0,glslVersion:b.glslVersion,precision:g,batching:Qe,batchingColor:Qe&&K._colorsTexture!==null,instancing:Xe,instancingColor:Xe&&K.instanceColor!==null,instancingMorph:Xe&&K.morphTexture!==null,outputColorSpace:xe===null?i.outputColorSpace:xe.isXRRenderTarget===!0?xe.texture.colorSpace:At.workingColorSpace,alphaToCoverage:!!b.alphaToCoverage,map:It,matcap:dt,envMap:wt,envMapMode:wt&&$.mapping,envMapCubeUVHeight:ne,aoMap:St,lightMap:vt,bumpMap:Ut,normalMap:qt,displacementMap:Xt,emissiveMap:$t,normalMapObjectSpace:qt&&b.normalMapType===rb,normalMapTangentSpace:qt&&b.normalMapType===od,packedNormalMap:qt&&b.normalMapType===od&&PP(b.normalMap.format),metalnessMap:Nt,roughnessMap:Ht,anisotropy:Z,anisotropyMap:oe,clearcoat:pn,clearcoatMap:z,clearcoatNormalMap:ye,clearcoatRoughnessMap:Le,dispersion:mt,iridescence:k,iridescenceMap:ge,iridescenceThicknessMap:ve,sheen:T,sheenColorMap:Re,sheenRoughnessMap:qe,specularMap:Ue,specularColorMap:Pe,specularIntensityMap:et,transmission:ee,transmissionMap:it,thicknessMap:de,gradientMap:j,opaque:b.transparent===!1&&b.blending===xo&&b.alphaToCoverage===!1,alphaMap:be,alphaTest:_e,alphaHash:Ie,combine:b.combine,mapUv:It&&E(b.map.channel),aoMapUv:St&&E(b.aoMap.channel),lightMapUv:vt&&E(b.lightMap.channel),bumpMapUv:Ut&&E(b.bumpMap.channel),normalMapUv:qt&&E(b.normalMap.channel),displacementMapUv:Xt&&E(b.displacementMap.channel),emissiveMapUv:$t&&E(b.emissiveMap.channel),metalnessMapUv:Nt&&E(b.metalnessMap.channel),roughnessMapUv:Ht&&E(b.roughnessMap.channel),anisotropyMapUv:oe&&E(b.anisotropyMap.channel),clearcoatMapUv:z&&E(b.clearcoatMap.channel),clearcoatNormalMapUv:ye&&E(b.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Le&&E(b.clearcoatRoughnessMap.channel),iridescenceMapUv:ge&&E(b.iridescenceMap.channel),iridescenceThicknessMapUv:ve&&E(b.iridescenceThicknessMap.channel),sheenColorMapUv:Re&&E(b.sheenColorMap.channel),sheenRoughnessMapUv:qe&&E(b.sheenRoughnessMap.channel),specularMapUv:Ue&&E(b.specularMap.channel),specularColorMapUv:Pe&&E(b.specularColorMap.channel),specularIntensityMapUv:et&&E(b.specularIntensityMap.channel),transmissionMapUv:it&&E(b.transmissionMap.channel),thicknessMapUv:de&&E(b.thicknessMap.channel),alphaMapUv:be&&E(b.alphaMap.channel),vertexTangents:!!Y.attributes.tangent&&(qt||Z),vertexNormals:!!Y.attributes.normal,vertexColors:b.vertexColors,vertexAlphas:b.vertexColors===!0&&!!Y.attributes.color&&Y.attributes.color.itemSize===4,pointsUvs:K.isPoints===!0&&!!Y.attributes.uv&&(It||be),fog:!!fe,useFog:b.fog===!0,fogExp2:!!fe&&fe.isFogExp2,flatShading:b.wireframe===!1&&(b.flatShading===!0||Y.attributes.normal===void 0&&qt===!1&&(b.isMeshLambertMaterial||b.isMeshPhongMaterial||b.isMeshStandardMaterial||b.isMeshPhysicalMaterial)),sizeAttenuation:b.sizeAttenuation===!0,logarithmicDepthBuffer:x,reversedDepthBuffer:Fe,skinning:K.isSkinnedMesh===!0,hasPositionAttribute:Y.attributes.position!==void 0,morphTargets:Y.morphAttributes.position!==void 0,morphNormals:Y.morphAttributes.normal!==void 0,morphColors:Y.morphAttributes.color!==void 0,morphTargetsCount:F,morphTextureStride:Te,numDirLights:I.directional.length,numPointLights:I.point.length,numSpotLights:I.spot.length,numSpotLightMaps:I.spotLightMap.length,numRectAreaLights:I.rectArea.length,numHemiLights:I.hemi.length,numDirLightShadows:I.directionalShadowMap.length,numPointLightShadows:I.pointShadowMap.length,numSpotLightShadows:I.spotShadowMap.length,numSpotLightShadowsWithMaps:I.numSpotLightShadowsWithMaps,numLightProbes:I.numLightProbes,numLightProbeGrids:se.length,numClippingPlanes:l.numPlanes,numClipIntersection:l.numIntersection,dithering:b.dithering,shadowMapEnabled:i.shadowMap.enabled&&X.length>0,shadowMapType:i.shadowMap.type,toneMapping:Se,decodeVideoTexture:It&&b.map.isVideoTexture===!0&&At.getTransfer(b.map.colorSpace)===jt,decodeVideoTextureEmissive:$t&&b.emissiveMap.isVideoTexture===!0&&At.getTransfer(b.emissiveMap.colorSpace)===jt,premultipliedAlpha:b.premultipliedAlpha,doubleSided:b.side===pr,flipSided:b.side===hi,useDepthPacking:b.depthPacking>=0,depthPacking:b.depthPacking||0,index0AttributeName:b.index0AttributeName,extensionClipCullDistance:ke&&b.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ke&&b.extensions.multiDraw===!0||Qe)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:b.customProgramCacheKey()};return Ye.vertexUv1s=h.has(1),Ye.vertexUv2s=h.has(2),Ye.vertexUv3s=h.has(3),h.clear(),Ye}function S(b){const I=[];if(b.shaderID?I.push(b.shaderID):(I.push(b.customVertexShaderID),I.push(b.customFragmentShaderID)),b.defines!==void 0)for(const X in b.defines)I.push(X),I.push(b.defines[X]);return b.isRawShaderMaterial===!1&&(y(I,b),N(I,b),I.push(i.outputColorSpace)),I.push(b.customProgramCacheKey),I.join()}function y(b,I){b.push(I.precision),b.push(I.outputColorSpace),b.push(I.envMapMode),b.push(I.envMapCubeUVHeight),b.push(I.mapUv),b.push(I.alphaMapUv),b.push(I.lightMapUv),b.push(I.aoMapUv),b.push(I.bumpMapUv),b.push(I.normalMapUv),b.push(I.displacementMapUv),b.push(I.emissiveMapUv),b.push(I.metalnessMapUv),b.push(I.roughnessMapUv),b.push(I.anisotropyMapUv),b.push(I.clearcoatMapUv),b.push(I.clearcoatNormalMapUv),b.push(I.clearcoatRoughnessMapUv),b.push(I.iridescenceMapUv),b.push(I.iridescenceThicknessMapUv),b.push(I.sheenColorMapUv),b.push(I.sheenRoughnessMapUv),b.push(I.specularMapUv),b.push(I.specularColorMapUv),b.push(I.specularIntensityMapUv),b.push(I.transmissionMapUv),b.push(I.thicknessMapUv),b.push(I.combine),b.push(I.fogExp2),b.push(I.sizeAttenuation),b.push(I.morphTargetsCount),b.push(I.morphAttributeCount),b.push(I.numDirLights),b.push(I.numPointLights),b.push(I.numSpotLights),b.push(I.numSpotLightMaps),b.push(I.numHemiLights),b.push(I.numRectAreaLights),b.push(I.numDirLightShadows),b.push(I.numPointLightShadows),b.push(I.numSpotLightShadows),b.push(I.numSpotLightShadowsWithMaps),b.push(I.numLightProbes),b.push(I.shadowMapType),b.push(I.toneMapping),b.push(I.numClippingPlanes),b.push(I.numClipIntersection),b.push(I.depthPacking)}function N(b,I){c.disableAll(),I.instancing&&c.enable(0),I.instancingColor&&c.enable(1),I.instancingMorph&&c.enable(2),I.matcap&&c.enable(3),I.envMap&&c.enable(4),I.normalMapObjectSpace&&c.enable(5),I.normalMapTangentSpace&&c.enable(6),I.clearcoat&&c.enable(7),I.iridescence&&c.enable(8),I.alphaTest&&c.enable(9),I.vertexColors&&c.enable(10),I.vertexAlphas&&c.enable(11),I.vertexUv1s&&c.enable(12),I.vertexUv2s&&c.enable(13),I.vertexUv3s&&c.enable(14),I.vertexTangents&&c.enable(15),I.anisotropy&&c.enable(16),I.alphaHash&&c.enable(17),I.batching&&c.enable(18),I.dispersion&&c.enable(19),I.batchingColor&&c.enable(20),I.gradientMap&&c.enable(21),I.packedNormalMap&&c.enable(22),I.vertexNormals&&c.enable(23),b.push(c.mask),c.disableAll(),I.fog&&c.enable(0),I.useFog&&c.enable(1),I.flatShading&&c.enable(2),I.logarithmicDepthBuffer&&c.enable(3),I.reversedDepthBuffer&&c.enable(4),I.skinning&&c.enable(5),I.morphTargets&&c.enable(6),I.morphNormals&&c.enable(7),I.morphColors&&c.enable(8),I.premultipliedAlpha&&c.enable(9),I.shadowMapEnabled&&c.enable(10),I.doubleSided&&c.enable(11),I.flipSided&&c.enable(12),I.useDepthPacking&&c.enable(13),I.dithering&&c.enable(14),I.transmission&&c.enable(15),I.sheen&&c.enable(16),I.opaque&&c.enable(17),I.pointsUvs&&c.enable(18),I.decodeVideoTexture&&c.enable(19),I.decodeVideoTextureEmissive&&c.enable(20),I.alphaToCoverage&&c.enable(21),I.numLightProbeGrids>0&&c.enable(22),I.hasPositionAttribute&&c.enable(23),b.push(c.mask)}function L(b){const I=M[b.type];let X;if(I){const O=fr[I];X=Gb.clone(O.uniforms)}else X=b.uniforms;return X}function C(b,I){let X=m.get(I);return X!==void 0?++X.usedTimes:(X=new TP(i,I,b,a),f.push(X),m.set(I,X)),X}function D(b){if(--b.usedTimes===0){const I=f.indexOf(b);f[I]=f[f.length-1],f.pop(),m.delete(b.cacheKey),b.destroy()}}function P(b){d.remove(b)}function U(){d.dispose()}return{getParameters:w,getProgramCacheKey:S,getUniforms:L,acquireProgram:C,releaseProgram:D,releaseShaderCache:P,programs:f,dispose:U}}function LP(){let i=new WeakMap;function e(c){return i.has(c)}function t(c){let d=i.get(c);return d===void 0&&(d={},i.set(c,d)),d}function r(c){i.delete(c)}function a(c,d,h){i.get(c)[d]=h}function l(){i=new WeakMap}return{has:e,get:t,remove:r,update:a,dispose:l}}function DP(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function Yv(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function Kv(){const i=[];let e=0;const t=[],r=[],a=[];function l(){e=0,t.length=0,r.length=0,a.length=0}function c(g){let M=0;return g.isInstancedMesh&&(M+=2),g.isSkinnedMesh&&(M+=1),M}function d(g,M,E,w,S,y){let N=i[e];return N===void 0?(N={id:g.id,object:g,geometry:M,material:E,materialVariant:c(g),groupOrder:w,renderOrder:g.renderOrder,z:S,group:y},i[e]=N):(N.id=g.id,N.object=g,N.geometry=M,N.material=E,N.materialVariant=c(g),N.groupOrder=w,N.renderOrder=g.renderOrder,N.z=S,N.group=y),e++,N}function h(g,M,E,w,S,y){const N=d(g,M,E,w,S,y);E.transmission>0?r.push(N):E.transparent===!0?a.push(N):t.push(N)}function f(g,M,E,w,S,y){const N=d(g,M,E,w,S,y);E.transmission>0?r.unshift(N):E.transparent===!0?a.unshift(N):t.unshift(N)}function m(g,M,E){t.length>1&&t.sort(g||DP),r.length>1&&r.sort(M||Yv),a.length>1&&a.sort(M||Yv),E&&(t.reverse(),r.reverse(),a.reverse())}function x(){for(let g=e,M=i.length;g<M;g++){const E=i[g];if(E.id===null)break;E.id=null,E.object=null,E.geometry=null,E.material=null,E.group=null}}return{opaque:t,transmissive:r,transparent:a,init:l,push:h,unshift:f,finish:x,sort:m}}function IP(){let i=new WeakMap;function e(r,a){const l=i.get(r);let c;return l===void 0?(c=new Kv,i.set(r,[c])):a>=l.length?(c=new Kv,l.push(c)):c=l[a],c}function t(){i=new WeakMap}return{get:e,dispose:t}}function UP(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new te,color:new xt};break;case"SpotLight":t={position:new te,direction:new te,color:new xt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new te,color:new xt,distance:0,decay:0};break;case"HemisphereLight":t={direction:new te,skyColor:new xt,groundColor:new xt};break;case"RectAreaLight":t={color:new xt,position:new te,halfWidth:new te,halfHeight:new te};break}return i[e.id]=t,t}}}function FP(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ut};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ut};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ut,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let OP=0;function kP(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function zP(i){const e=new UP,t=FP(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let f=0;f<9;f++)r.probe.push(new te);const a=new te,l=new an,c=new an;function d(f){let m=0,x=0,g=0;for(let I=0;I<9;I++)r.probe[I].set(0,0,0);let M=0,E=0,w=0,S=0,y=0,N=0,L=0,C=0,D=0,P=0,U=0;f.sort(kP);for(let I=0,X=f.length;I<X;I++){const O=f[I],K=O.color,se=O.intensity,fe=O.distance;let Y=null;if(O.shadow&&O.shadow.map&&(O.shadow.map.texture.format===ba?Y=O.shadow.map.texture:Y=O.shadow.map.depthTexture||O.shadow.map.texture),O.isAmbientLight)m+=K.r*se,x+=K.g*se,g+=K.b*se;else if(O.isLightProbe){for(let me=0;me<9;me++)r.probe[me].addScaledVector(O.sh.coefficients[me],se);U++}else if(O.isDirectionalLight){const me=e.get(O);if(me.color.copy(O.color).multiplyScalar(O.intensity),O.castShadow){const B=O.shadow,$=t.get(O);$.shadowIntensity=B.intensity,$.shadowBias=B.bias,$.shadowNormalBias=B.normalBias,$.shadowRadius=B.radius,$.shadowMapSize=B.mapSize,r.directionalShadow[M]=$,r.directionalShadowMap[M]=Y,r.directionalShadowMatrix[M]=O.shadow.matrix,N++}r.directional[M]=me,M++}else if(O.isSpotLight){const me=e.get(O);me.position.setFromMatrixPosition(O.matrixWorld),me.color.copy(K).multiplyScalar(se),me.distance=fe,me.coneCos=Math.cos(O.angle),me.penumbraCos=Math.cos(O.angle*(1-O.penumbra)),me.decay=O.decay,r.spot[w]=me;const B=O.shadow;if(O.map&&(r.spotLightMap[D]=O.map,D++,B.updateMatrices(O),O.castShadow&&P++),r.spotLightMatrix[w]=B.matrix,O.castShadow){const $=t.get(O);$.shadowIntensity=B.intensity,$.shadowBias=B.bias,$.shadowNormalBias=B.normalBias,$.shadowRadius=B.radius,$.shadowMapSize=B.mapSize,r.spotShadow[w]=$,r.spotShadowMap[w]=Y,C++}w++}else if(O.isRectAreaLight){const me=e.get(O);me.color.copy(K).multiplyScalar(se),me.halfWidth.set(O.width*.5,0,0),me.halfHeight.set(0,O.height*.5,0),r.rectArea[S]=me,S++}else if(O.isPointLight){const me=e.get(O);if(me.color.copy(O.color).multiplyScalar(O.intensity),me.distance=O.distance,me.decay=O.decay,O.castShadow){const B=O.shadow,$=t.get(O);$.shadowIntensity=B.intensity,$.shadowBias=B.bias,$.shadowNormalBias=B.normalBias,$.shadowRadius=B.radius,$.shadowMapSize=B.mapSize,$.shadowCameraNear=B.camera.near,$.shadowCameraFar=B.camera.far,r.pointShadow[E]=$,r.pointShadowMap[E]=Y,r.pointShadowMatrix[E]=O.shadow.matrix,L++}r.point[E]=me,E++}else if(O.isHemisphereLight){const me=e.get(O);me.skyColor.copy(O.color).multiplyScalar(se),me.groundColor.copy(O.groundColor).multiplyScalar(se),r.hemi[y]=me,y++}}S>0&&(i.has("OES_texture_float_linear")===!0?(r.rectAreaLTC1=Be.LTC_FLOAT_1,r.rectAreaLTC2=Be.LTC_FLOAT_2):(r.rectAreaLTC1=Be.LTC_HALF_1,r.rectAreaLTC2=Be.LTC_HALF_2)),r.ambient[0]=m,r.ambient[1]=x,r.ambient[2]=g;const b=r.hash;(b.directionalLength!==M||b.pointLength!==E||b.spotLength!==w||b.rectAreaLength!==S||b.hemiLength!==y||b.numDirectionalShadows!==N||b.numPointShadows!==L||b.numSpotShadows!==C||b.numSpotMaps!==D||b.numLightProbes!==U)&&(r.directional.length=M,r.spot.length=w,r.rectArea.length=S,r.point.length=E,r.hemi.length=y,r.directionalShadow.length=N,r.directionalShadowMap.length=N,r.pointShadow.length=L,r.pointShadowMap.length=L,r.spotShadow.length=C,r.spotShadowMap.length=C,r.directionalShadowMatrix.length=N,r.pointShadowMatrix.length=L,r.spotLightMatrix.length=C+D-P,r.spotLightMap.length=D,r.numSpotLightShadowsWithMaps=P,r.numLightProbes=U,b.directionalLength=M,b.pointLength=E,b.spotLength=w,b.rectAreaLength=S,b.hemiLength=y,b.numDirectionalShadows=N,b.numPointShadows=L,b.numSpotShadows=C,b.numSpotMaps=D,b.numLightProbes=U,r.version=OP++)}function h(f,m){let x=0,g=0,M=0,E=0,w=0;const S=m.matrixWorldInverse;for(let y=0,N=f.length;y<N;y++){const L=f[y];if(L.isDirectionalLight){const C=r.directional[x];C.direction.setFromMatrixPosition(L.matrixWorld),a.setFromMatrixPosition(L.target.matrixWorld),C.direction.sub(a),C.direction.transformDirection(S),x++}else if(L.isSpotLight){const C=r.spot[M];C.position.setFromMatrixPosition(L.matrixWorld),C.position.applyMatrix4(S),C.direction.setFromMatrixPosition(L.matrixWorld),a.setFromMatrixPosition(L.target.matrixWorld),C.direction.sub(a),C.direction.transformDirection(S),M++}else if(L.isRectAreaLight){const C=r.rectArea[E];C.position.setFromMatrixPosition(L.matrixWorld),C.position.applyMatrix4(S),c.identity(),l.copy(L.matrixWorld),l.premultiply(S),c.extractRotation(l),C.halfWidth.set(L.width*.5,0,0),C.halfHeight.set(0,L.height*.5,0),C.halfWidth.applyMatrix4(c),C.halfHeight.applyMatrix4(c),E++}else if(L.isPointLight){const C=r.point[g];C.position.setFromMatrixPosition(L.matrixWorld),C.position.applyMatrix4(S),g++}else if(L.isHemisphereLight){const C=r.hemi[w];C.direction.setFromMatrixPosition(L.matrixWorld),C.direction.transformDirection(S),w++}}}return{setup:d,setupView:h,state:r}}function Qv(i){const e=new zP(i),t=[],r=[],a=[];function l(g){x.camera=g,t.length=0,r.length=0,a.length=0}function c(g){t.push(g)}function d(g){r.push(g)}function h(g){a.push(g)}function f(){e.setup(t)}function m(g){e.setupView(t,g)}const x={lightsArray:t,shadowsArray:r,lightProbeGridArray:a,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:l,state:x,setupLights:f,setupLightsView:m,pushLight:c,pushShadow:d,pushLightProbeGrid:h}}function BP(i){let e=new WeakMap;function t(a,l=0){const c=e.get(a);let d;return c===void 0?(d=new Qv(i),e.set(a,[d])):l>=c.length?(d=new Qv(i),c.push(d)):d=c[l],d}function r(){e=new WeakMap}return{get:t,dispose:r}}const HP=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,VP=`uniform sampler2D shadow_pass;
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
}`,GP=[new te(1,0,0),new te(-1,0,0),new te(0,1,0),new te(0,-1,0),new te(0,0,1),new te(0,0,-1)],jP=[new te(0,-1,0),new te(0,-1,0),new te(0,0,1),new te(0,0,-1),new te(0,-1,0),new te(0,-1,0)],Zv=new an,Il=new te,Kf=new te;function WP(i,e,t){let r=new Hm;const a=new ut,l=new ut,c=new un,d=new qb,h=new Yb,f={},m=t.maxTextureSize,x={[Fs]:hi,[hi]:Fs,[pr]:pr},g=new Mr({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ut},radius:{value:4}},vertexShader:HP,fragmentShader:VP}),M=g.clone();M.defines.HORIZONTAL_PASS=1;const E=new Mi;E.setAttribute("position",new _r(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const w=new Zi(E,g),S=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=$u;let y=this.type;this.render=function(P,U,b){if(S.enabled===!1||S.autoUpdate===!1&&S.needsUpdate===!1||P.length===0)return;this.type===Uw&&(lt("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=$u);const I=i.getRenderTarget(),X=i.getActiveCubeFace(),O=i.getActiveMipmapLevel(),K=i.state;K.setBlending(jr),K.buffers.depth.getReversed()===!0?K.buffers.color.setClear(0,0,0,0):K.buffers.color.setClear(1,1,1,1),K.buffers.depth.setTest(!0),K.setScissorTest(!1);const se=y!==this.type;se&&U.traverse(function(fe){fe.material&&(Array.isArray(fe.material)?fe.material.forEach(Y=>Y.needsUpdate=!0):fe.material.needsUpdate=!0)});for(let fe=0,Y=P.length;fe<Y;fe++){const me=P[fe],B=me.shadow;if(B===void 0){lt("WebGLShadowMap:",me,"has no shadow.");continue}if(B.autoUpdate===!1&&B.needsUpdate===!1)continue;a.copy(B.mapSize);const $=B.getFrameExtents();a.multiply($),l.copy(B.mapSize),(a.x>m||a.y>m)&&(a.x>m&&(l.x=Math.floor(m/$.x),a.x=l.x*$.x,B.mapSize.x=l.x),a.y>m&&(l.y=Math.floor(m/$.y),a.y=l.y*$.y,B.mapSize.y=l.y));const ne=i.state.buffers.depth.getReversed();if(B.camera._reversedDepth=ne,B.map===null||se===!0){if(B.map!==null&&(B.map.depthTexture!==null&&(B.map.depthTexture.dispose(),B.map.depthTexture=null),B.map.dispose()),this.type===Ol){if(me.isPointLight){lt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}B.map=new vr(a.x,a.y,{format:ba,type:qr,minFilter:Wn,magFilter:Wn,generateMipmaps:!1}),B.map.texture.name=me.name+".shadowMap",B.map.depthTexture=new Uo(a.x,a.y,mr),B.map.depthTexture.name=me.name+".shadowMapDepth",B.map.depthTexture.format=Yr,B.map.depthTexture.compareFunction=null,B.map.depthTexture.minFilter=Fn,B.map.depthTexture.magFilter=Fn}else me.isPointLight?(B.map=new Py(a.x),B.map.depthTexture=new Hb(a.x,yr)):(B.map=new vr(a.x,a.y),B.map.depthTexture=new Uo(a.x,a.y,yr)),B.map.depthTexture.name=me.name+".shadowMap",B.map.depthTexture.format=Yr,this.type===$u?(B.map.depthTexture.compareFunction=ne?zm:km,B.map.depthTexture.minFilter=Wn,B.map.depthTexture.magFilter=Wn):(B.map.depthTexture.compareFunction=null,B.map.depthTexture.minFilter=Fn,B.map.depthTexture.magFilter=Fn);B.camera.updateProjectionMatrix()}const ce=B.map.isWebGLCubeRenderTarget?6:1;for(let H=0;H<ce;H++){if(B.map.isWebGLCubeRenderTarget)i.setRenderTarget(B.map,H),i.clear();else{H===0&&(i.setRenderTarget(B.map),i.clear());const F=B.getViewport(H);c.set(l.x*F.x,l.y*F.y,l.x*F.z,l.y*F.w),K.viewport(c)}if(me.isPointLight){const F=B.camera,Te=B.matrix,Oe=me.distance||F.far;Oe!==F.far&&(F.far=Oe,F.updateProjectionMatrix()),Il.setFromMatrixPosition(me.matrixWorld),F.position.copy(Il),Kf.copy(F.position),Kf.add(GP[H]),F.up.copy(jP[H]),F.lookAt(Kf),F.updateMatrixWorld(),Te.makeTranslation(-Il.x,-Il.y,-Il.z),Zv.multiplyMatrices(F.projectionMatrix,F.matrixWorldInverse),B._frustum.setFromProjectionMatrix(Zv,F.coordinateSystem,F.reversedDepth)}else B.updateMatrices(me);r=B.getFrustum(),C(U,b,B.camera,me,this.type)}B.isPointLightShadow!==!0&&this.type===Ol&&N(B,b),B.needsUpdate=!1}y=this.type,S.needsUpdate=!1,i.setRenderTarget(I,X,O)};function N(P,U){const b=e.update(w);g.defines.VSM_SAMPLES!==P.blurSamples&&(g.defines.VSM_SAMPLES=P.blurSamples,M.defines.VSM_SAMPLES=P.blurSamples,g.needsUpdate=!0,M.needsUpdate=!0),P.mapPass===null&&(P.mapPass=new vr(a.x,a.y,{format:ba,type:qr})),g.uniforms.shadow_pass.value=P.map.depthTexture,g.uniforms.resolution.value=P.mapSize,g.uniforms.radius.value=P.radius,i.setRenderTarget(P.mapPass),i.clear(),i.renderBufferDirect(U,null,b,g,w,null),M.uniforms.shadow_pass.value=P.mapPass.texture,M.uniforms.resolution.value=P.mapSize,M.uniforms.radius.value=P.radius,i.setRenderTarget(P.map),i.clear(),i.renderBufferDirect(U,null,b,M,w,null)}function L(P,U,b,I){let X=null;const O=b.isPointLight===!0?P.customDistanceMaterial:P.customDepthMaterial;if(O!==void 0)X=O;else if(X=b.isPointLight===!0?h:d,i.localClippingEnabled&&U.clipShadows===!0&&Array.isArray(U.clippingPlanes)&&U.clippingPlanes.length!==0||U.displacementMap&&U.displacementScale!==0||U.alphaMap&&U.alphaTest>0||U.map&&U.alphaTest>0||U.alphaToCoverage===!0){const K=X.uuid,se=U.uuid;let fe=f[K];fe===void 0&&(fe={},f[K]=fe);let Y=fe[se];Y===void 0&&(Y=X.clone(),fe[se]=Y,U.addEventListener("dispose",D)),X=Y}if(X.visible=U.visible,X.wireframe=U.wireframe,I===Ol?X.side=U.shadowSide!==null?U.shadowSide:U.side:X.side=U.shadowSide!==null?U.shadowSide:x[U.side],X.alphaMap=U.alphaMap,X.alphaTest=U.alphaToCoverage===!0?.5:U.alphaTest,X.map=U.map,X.clipShadows=U.clipShadows,X.clippingPlanes=U.clippingPlanes,X.clipIntersection=U.clipIntersection,X.displacementMap=U.displacementMap,X.displacementScale=U.displacementScale,X.displacementBias=U.displacementBias,X.wireframeLinewidth=U.wireframeLinewidth,X.linewidth=U.linewidth,b.isPointLight===!0&&X.isMeshDistanceMaterial===!0){const K=i.properties.get(X);K.light=b}return X}function C(P,U,b,I,X){if(P.visible===!1)return;if(P.layers.test(U.layers)&&(P.isMesh||P.isLine||P.isPoints)&&(P.castShadow||P.receiveShadow&&X===Ol)&&(!P.frustumCulled||r.intersectsObject(P))){P.modelViewMatrix.multiplyMatrices(b.matrixWorldInverse,P.matrixWorld);const se=e.update(P),fe=P.material;if(Array.isArray(fe)){const Y=se.groups;for(let me=0,B=Y.length;me<B;me++){const $=Y[me],ne=fe[$.materialIndex];if(ne&&ne.visible){const ce=L(P,ne,I,X);P.onBeforeShadow(i,P,U,b,se,ce,$),i.renderBufferDirect(b,null,se,ce,P,$),P.onAfterShadow(i,P,U,b,se,ce,$)}}}else if(fe.visible){const Y=L(P,fe,I,X);P.onBeforeShadow(i,P,U,b,se,Y,null),i.renderBufferDirect(b,null,se,Y,P,null),P.onAfterShadow(i,P,U,b,se,Y,null)}}const K=P.children;for(let se=0,fe=K.length;se<fe;se++)C(K[se],U,b,I,X)}function D(P){P.target.removeEventListener("dispose",D);for(const b in f){const I=f[b],X=P.target.uuid;X in I&&(I[X].dispose(),delete I[X])}}}function XP(i,e){function t(){let j=!1;const be=new un;let _e=null;const Ie=new un(0,0,0,0);return{setMask:function(ke){_e!==ke&&!j&&(i.colorMask(ke,ke,ke,ke),_e=ke)},setLocked:function(ke){j=ke},setClear:function(ke,Se,Ye,We,Ot){Ot===!0&&(ke*=We,Se*=We,Ye*=We),be.set(ke,Se,Ye,We),Ie.equals(be)===!1&&(i.clearColor(ke,Se,Ye,We),Ie.copy(be))},reset:function(){j=!1,_e=null,Ie.set(-1,0,0,0)}}}function r(){let j=!1,be=!1,_e=null,Ie=null,ke=null;return{setReversed:function(Se){if(be!==Se){const Ye=e.get("EXT_clip_control");Se?Ye.clipControlEXT(Ye.LOWER_LEFT_EXT,Ye.ZERO_TO_ONE_EXT):Ye.clipControlEXT(Ye.LOWER_LEFT_EXT,Ye.NEGATIVE_ONE_TO_ONE_EXT),be=Se;const We=ke;ke=null,this.setClear(We)}},getReversed:function(){return be},setTest:function(Se){Se?xe(i.DEPTH_TEST):Fe(i.DEPTH_TEST)},setMask:function(Se){_e!==Se&&!j&&(i.depthMask(Se),_e=Se)},setFunc:function(Se){if(be&&(Se=pb[Se]),Ie!==Se){switch(Se){case vp:i.depthFunc(i.NEVER);break;case _p:i.depthFunc(i.ALWAYS);break;case yp:i.depthFunc(i.LESS);break;case Do:i.depthFunc(i.LEQUAL);break;case Sp:i.depthFunc(i.EQUAL);break;case Mp:i.depthFunc(i.GEQUAL);break;case Ep:i.depthFunc(i.GREATER);break;case wp:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}Ie=Se}},setLocked:function(Se){j=Se},setClear:function(Se){ke!==Se&&(ke=Se,be&&(Se=1-Se),i.clearDepth(Se))},reset:function(){j=!1,_e=null,Ie=null,ke=null,be=!1}}}function a(){let j=!1,be=null,_e=null,Ie=null,ke=null,Se=null,Ye=null,We=null,Ot=null;return{setTest:function(kt){j||(kt?xe(i.STENCIL_TEST):Fe(i.STENCIL_TEST))},setMask:function(kt){be!==kt&&!j&&(i.stencilMask(kt),be=kt)},setFunc:function(kt,On,wi){(_e!==kt||Ie!==On||ke!==wi)&&(i.stencilFunc(kt,On,wi),_e=kt,Ie=On,ke=wi)},setOp:function(kt,On,wi){(Se!==kt||Ye!==On||We!==wi)&&(i.stencilOp(kt,On,wi),Se=kt,Ye=On,We=wi)},setLocked:function(kt){j=kt},setClear:function(kt){Ot!==kt&&(i.clearStencil(kt),Ot=kt)},reset:function(){j=!1,be=null,_e=null,Ie=null,ke=null,Se=null,Ye=null,We=null,Ot=null}}}const l=new t,c=new r,d=new a,h=new WeakMap,f=new WeakMap;let m={},x={},g={},M=new WeakMap,E=[],w=null,S=!1,y=null,N=null,L=null,C=null,D=null,P=null,U=null,b=new xt(0,0,0),I=0,X=!1,O=null,K=null,se=null,fe=null,Y=null;const me=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let B=!1,$=0;const ne=i.getParameter(i.VERSION);ne.indexOf("WebGL")!==-1?($=parseFloat(/^WebGL (\d)/.exec(ne)[1]),B=$>=1):ne.indexOf("OpenGL ES")!==-1&&($=parseFloat(/^OpenGL ES (\d)/.exec(ne)[1]),B=$>=2);let ce=null,H={};const F=i.getParameter(i.SCISSOR_BOX),Te=i.getParameter(i.VIEWPORT),Oe=new un().fromArray(F),ze=new un().fromArray(Te);function ie(j,be,_e,Ie){const ke=new Uint8Array(4),Se=i.createTexture();i.bindTexture(j,Se),i.texParameteri(j,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(j,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Ye=0;Ye<_e;Ye++)j===i.TEXTURE_3D||j===i.TEXTURE_2D_ARRAY?i.texImage3D(be,0,i.RGBA,1,1,Ie,0,i.RGBA,i.UNSIGNED_BYTE,ke):i.texImage2D(be+Ye,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,ke);return Se}const Me={};Me[i.TEXTURE_2D]=ie(i.TEXTURE_2D,i.TEXTURE_2D,1),Me[i.TEXTURE_CUBE_MAP]=ie(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),Me[i.TEXTURE_2D_ARRAY]=ie(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),Me[i.TEXTURE_3D]=ie(i.TEXTURE_3D,i.TEXTURE_3D,1,1),l.setClear(0,0,0,1),c.setClear(1),d.setClear(0),xe(i.DEPTH_TEST),c.setFunc(Do),Ut(!1),qt(Wx),xe(i.CULL_FACE),St(jr);function xe(j){m[j]!==!0&&(i.enable(j),m[j]=!0)}function Fe(j){m[j]!==!1&&(i.disable(j),m[j]=!1)}function Xe(j,be){return g[j]!==be?(i.bindFramebuffer(j,be),g[j]=be,j===i.DRAW_FRAMEBUFFER&&(g[i.FRAMEBUFFER]=be),j===i.FRAMEBUFFER&&(g[i.DRAW_FRAMEBUFFER]=be),!0):!1}function Qe(j,be){let _e=E,Ie=!1;if(j){_e=M.get(be),_e===void 0&&(_e=[],M.set(be,_e));const ke=j.textures;if(_e.length!==ke.length||_e[0]!==i.COLOR_ATTACHMENT0){for(let Se=0,Ye=ke.length;Se<Ye;Se++)_e[Se]=i.COLOR_ATTACHMENT0+Se;_e.length=ke.length,Ie=!0}}else _e[0]!==i.BACK&&(_e[0]=i.BACK,Ie=!0);Ie&&i.drawBuffers(_e)}function It(j){return w!==j?(i.useProgram(j),w=j,!0):!1}const dt={[la]:i.FUNC_ADD,[Ow]:i.FUNC_SUBTRACT,[kw]:i.FUNC_REVERSE_SUBTRACT};dt[zw]=i.MIN,dt[Bw]=i.MAX;const wt={[Hw]:i.ZERO,[Vw]:i.ONE,[Gw]:i.SRC_COLOR,[gp]:i.SRC_ALPHA,[Yw]:i.SRC_ALPHA_SATURATE,[$w]:i.DST_COLOR,[Ww]:i.DST_ALPHA,[jw]:i.ONE_MINUS_SRC_COLOR,[xp]:i.ONE_MINUS_SRC_ALPHA,[qw]:i.ONE_MINUS_DST_COLOR,[Xw]:i.ONE_MINUS_DST_ALPHA,[Kw]:i.CONSTANT_COLOR,[Qw]:i.ONE_MINUS_CONSTANT_COLOR,[Zw]:i.CONSTANT_ALPHA,[Jw]:i.ONE_MINUS_CONSTANT_ALPHA};function St(j,be,_e,Ie,ke,Se,Ye,We,Ot,kt){if(j===jr){S===!0&&(Fe(i.BLEND),S=!1);return}if(S===!1&&(xe(i.BLEND),S=!0),j!==Fw){if(j!==y||kt!==X){if((N!==la||D!==la)&&(i.blendEquation(i.FUNC_ADD),N=la,D=la),kt)switch(j){case xo:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Xx:i.blendFunc(i.ONE,i.ONE);break;case $x:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case qx:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Dt("WebGLState: Invalid blending: ",j);break}else switch(j){case xo:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Xx:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case $x:Dt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case qx:Dt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Dt("WebGLState: Invalid blending: ",j);break}L=null,C=null,P=null,U=null,b.set(0,0,0),I=0,y=j,X=kt}return}ke=ke||be,Se=Se||_e,Ye=Ye||Ie,(be!==N||ke!==D)&&(i.blendEquationSeparate(dt[be],dt[ke]),N=be,D=ke),(_e!==L||Ie!==C||Se!==P||Ye!==U)&&(i.blendFuncSeparate(wt[_e],wt[Ie],wt[Se],wt[Ye]),L=_e,C=Ie,P=Se,U=Ye),(We.equals(b)===!1||Ot!==I)&&(i.blendColor(We.r,We.g,We.b,Ot),b.copy(We),I=Ot),y=j,X=!1}function vt(j,be){j.side===pr?Fe(i.CULL_FACE):xe(i.CULL_FACE);let _e=j.side===hi;be&&(_e=!_e),Ut(_e),j.blending===xo&&j.transparent===!1?St(jr):St(j.blending,j.blendEquation,j.blendSrc,j.blendDst,j.blendEquationAlpha,j.blendSrcAlpha,j.blendDstAlpha,j.blendColor,j.blendAlpha,j.premultipliedAlpha),c.setFunc(j.depthFunc),c.setTest(j.depthTest),c.setMask(j.depthWrite),l.setMask(j.colorWrite);const Ie=j.stencilWrite;d.setTest(Ie),Ie&&(d.setMask(j.stencilWriteMask),d.setFunc(j.stencilFunc,j.stencilRef,j.stencilFuncMask),d.setOp(j.stencilFail,j.stencilZFail,j.stencilZPass)),$t(j.polygonOffset,j.polygonOffsetFactor,j.polygonOffsetUnits),j.alphaToCoverage===!0?xe(i.SAMPLE_ALPHA_TO_COVERAGE):Fe(i.SAMPLE_ALPHA_TO_COVERAGE)}function Ut(j){O!==j&&(j?i.frontFace(i.CW):i.frontFace(i.CCW),O=j)}function qt(j){j!==Dw?(xe(i.CULL_FACE),j!==K&&(j===Wx?i.cullFace(i.BACK):j===Iw?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):Fe(i.CULL_FACE),K=j}function Xt(j){j!==se&&(B&&i.lineWidth(j),se=j)}function $t(j,be,_e){j?(xe(i.POLYGON_OFFSET_FILL),(fe!==be||Y!==_e)&&(fe=be,Y=_e,c.getReversed()&&(be=-be),i.polygonOffset(be,_e))):Fe(i.POLYGON_OFFSET_FILL)}function Nt(j){j?xe(i.SCISSOR_TEST):Fe(i.SCISSOR_TEST)}function Ht(j){j===void 0&&(j=i.TEXTURE0+me-1),ce!==j&&(i.activeTexture(j),ce=j)}function Z(j,be,_e){_e===void 0&&(ce===null?_e=i.TEXTURE0+me-1:_e=ce);let Ie=H[_e];Ie===void 0&&(Ie={type:void 0,texture:void 0},H[_e]=Ie),(Ie.type!==j||Ie.texture!==be)&&(ce!==_e&&(i.activeTexture(_e),ce=_e),i.bindTexture(j,be||Me[j]),Ie.type=j,Ie.texture=be)}function pn(){const j=H[ce];j!==void 0&&j.type!==void 0&&(i.bindTexture(j.type,null),j.type=void 0,j.texture=void 0)}function mt(){try{i.compressedTexImage2D(...arguments)}catch(j){Dt("WebGLState:",j)}}function k(){try{i.compressedTexImage3D(...arguments)}catch(j){Dt("WebGLState:",j)}}function T(){try{i.texSubImage2D(...arguments)}catch(j){Dt("WebGLState:",j)}}function ee(){try{i.texSubImage3D(...arguments)}catch(j){Dt("WebGLState:",j)}}function oe(){try{i.compressedTexSubImage2D(...arguments)}catch(j){Dt("WebGLState:",j)}}function z(){try{i.compressedTexSubImage3D(...arguments)}catch(j){Dt("WebGLState:",j)}}function ye(){try{i.texStorage2D(...arguments)}catch(j){Dt("WebGLState:",j)}}function Le(){try{i.texStorage3D(...arguments)}catch(j){Dt("WebGLState:",j)}}function ge(){try{i.texImage2D(...arguments)}catch(j){Dt("WebGLState:",j)}}function ve(){try{i.texImage3D(...arguments)}catch(j){Dt("WebGLState:",j)}}function Re(j){return x[j]!==void 0?x[j]:i.getParameter(j)}function qe(j,be){x[j]!==be&&(i.pixelStorei(j,be),x[j]=be)}function Ue(j){Oe.equals(j)===!1&&(i.scissor(j.x,j.y,j.z,j.w),Oe.copy(j))}function Pe(j){ze.equals(j)===!1&&(i.viewport(j.x,j.y,j.z,j.w),ze.copy(j))}function et(j,be){let _e=f.get(be);_e===void 0&&(_e=new WeakMap,f.set(be,_e));let Ie=_e.get(j);Ie===void 0&&(Ie=i.getUniformBlockIndex(be,j.name),_e.set(j,Ie))}function it(j,be){const Ie=f.get(be).get(j);h.get(be)!==Ie&&(i.uniformBlockBinding(be,Ie,j.__bindingPointIndex),h.set(be,Ie))}function de(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),c.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),m={},x={},ce=null,H={},g={},M=new WeakMap,E=[],w=null,S=!1,y=null,N=null,L=null,C=null,D=null,P=null,U=null,b=new xt(0,0,0),I=0,X=!1,O=null,K=null,se=null,fe=null,Y=null,Oe.set(0,0,i.canvas.width,i.canvas.height),ze.set(0,0,i.canvas.width,i.canvas.height),l.reset(),c.reset(),d.reset()}return{buffers:{color:l,depth:c,stencil:d},enable:xe,disable:Fe,bindFramebuffer:Xe,drawBuffers:Qe,useProgram:It,setBlending:St,setMaterial:vt,setFlipSided:Ut,setCullFace:qt,setLineWidth:Xt,setPolygonOffset:$t,setScissorTest:Nt,activeTexture:Ht,bindTexture:Z,unbindTexture:pn,compressedTexImage2D:mt,compressedTexImage3D:k,texImage2D:ge,texImage3D:ve,pixelStorei:qe,getParameter:Re,updateUBOMapping:et,uniformBlockBinding:it,texStorage2D:ye,texStorage3D:Le,texSubImage2D:T,texSubImage3D:ee,compressedTexSubImage2D:oe,compressedTexSubImage3D:z,scissor:Ue,viewport:Pe,reset:de}}function $P(i,e,t,r,a,l,c){const d=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,h=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),f=new ut,m=new WeakMap,x=new Set;let g;const M=new WeakMap;let E=!1;try{E=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function w(k,T){return E?new OffscreenCanvas(k,T):Yl("canvas")}function S(k,T,ee){let oe=1;const z=mt(k);if((z.width>ee||z.height>ee)&&(oe=ee/Math.max(z.width,z.height)),oe<1)if(typeof HTMLImageElement<"u"&&k instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&k instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&k instanceof ImageBitmap||typeof VideoFrame<"u"&&k instanceof VideoFrame){const ye=Math.floor(oe*z.width),Le=Math.floor(oe*z.height);g===void 0&&(g=w(ye,Le));const ge=T?w(ye,Le):g;return ge.width=ye,ge.height=Le,ge.getContext("2d").drawImage(k,0,0,ye,Le),lt("WebGLRenderer: Texture has been resized from ("+z.width+"x"+z.height+") to ("+ye+"x"+Le+")."),ge}else return"data"in k&&lt("WebGLRenderer: Image in DataTexture is too big ("+z.width+"x"+z.height+")."),k;return k}function y(k){return k.generateMipmaps}function N(k){i.generateMipmap(k)}function L(k){return k.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:k.isWebGL3DRenderTarget?i.TEXTURE_3D:k.isWebGLArrayRenderTarget||k.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function C(k,T,ee,oe,z,ye=!1){if(k!==null){if(i[k]!==void 0)return i[k];lt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+k+"'")}let Le;oe&&(Le=e.get("EXT_texture_norm16"),Le||lt("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let ge=T;if(T===i.RED&&(ee===i.FLOAT&&(ge=i.R32F),ee===i.HALF_FLOAT&&(ge=i.R16F),ee===i.UNSIGNED_BYTE&&(ge=i.R8),ee===i.UNSIGNED_SHORT&&Le&&(ge=Le.R16_EXT),ee===i.SHORT&&Le&&(ge=Le.R16_SNORM_EXT)),T===i.RED_INTEGER&&(ee===i.UNSIGNED_BYTE&&(ge=i.R8UI),ee===i.UNSIGNED_SHORT&&(ge=i.R16UI),ee===i.UNSIGNED_INT&&(ge=i.R32UI),ee===i.BYTE&&(ge=i.R8I),ee===i.SHORT&&(ge=i.R16I),ee===i.INT&&(ge=i.R32I)),T===i.RG&&(ee===i.FLOAT&&(ge=i.RG32F),ee===i.HALF_FLOAT&&(ge=i.RG16F),ee===i.UNSIGNED_BYTE&&(ge=i.RG8),ee===i.UNSIGNED_SHORT&&Le&&(ge=Le.RG16_EXT),ee===i.SHORT&&Le&&(ge=Le.RG16_SNORM_EXT)),T===i.RG_INTEGER&&(ee===i.UNSIGNED_BYTE&&(ge=i.RG8UI),ee===i.UNSIGNED_SHORT&&(ge=i.RG16UI),ee===i.UNSIGNED_INT&&(ge=i.RG32UI),ee===i.BYTE&&(ge=i.RG8I),ee===i.SHORT&&(ge=i.RG16I),ee===i.INT&&(ge=i.RG32I)),T===i.RGB_INTEGER&&(ee===i.UNSIGNED_BYTE&&(ge=i.RGB8UI),ee===i.UNSIGNED_SHORT&&(ge=i.RGB16UI),ee===i.UNSIGNED_INT&&(ge=i.RGB32UI),ee===i.BYTE&&(ge=i.RGB8I),ee===i.SHORT&&(ge=i.RGB16I),ee===i.INT&&(ge=i.RGB32I)),T===i.RGBA_INTEGER&&(ee===i.UNSIGNED_BYTE&&(ge=i.RGBA8UI),ee===i.UNSIGNED_SHORT&&(ge=i.RGBA16UI),ee===i.UNSIGNED_INT&&(ge=i.RGBA32UI),ee===i.BYTE&&(ge=i.RGBA8I),ee===i.SHORT&&(ge=i.RGBA16I),ee===i.INT&&(ge=i.RGBA32I)),T===i.RGB&&(ee===i.UNSIGNED_SHORT&&Le&&(ge=Le.RGB16_EXT),ee===i.SHORT&&Le&&(ge=Le.RGB16_SNORM_EXT),ee===i.UNSIGNED_INT_5_9_9_9_REV&&(ge=i.RGB9_E5),ee===i.UNSIGNED_INT_10F_11F_11F_REV&&(ge=i.R11F_G11F_B10F)),T===i.RGBA){const ve=ye?cd:At.getTransfer(z);ee===i.FLOAT&&(ge=i.RGBA32F),ee===i.HALF_FLOAT&&(ge=i.RGBA16F),ee===i.UNSIGNED_BYTE&&(ge=ve===jt?i.SRGB8_ALPHA8:i.RGBA8),ee===i.UNSIGNED_SHORT&&Le&&(ge=Le.RGBA16_EXT),ee===i.SHORT&&Le&&(ge=Le.RGBA16_SNORM_EXT),ee===i.UNSIGNED_SHORT_4_4_4_4&&(ge=i.RGBA4),ee===i.UNSIGNED_SHORT_5_5_5_1&&(ge=i.RGB5_A1)}return(ge===i.R16F||ge===i.R32F||ge===i.RG16F||ge===i.RG32F||ge===i.RGBA16F||ge===i.RGBA32F)&&e.get("EXT_color_buffer_float"),ge}function D(k,T){let ee;return k?T===null||T===yr||T===$l?ee=i.DEPTH24_STENCIL8:T===mr?ee=i.DEPTH32F_STENCIL8:T===Xl&&(ee=i.DEPTH24_STENCIL8,lt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):T===null||T===yr||T===$l?ee=i.DEPTH_COMPONENT24:T===mr?ee=i.DEPTH_COMPONENT32F:T===Xl&&(ee=i.DEPTH_COMPONENT16),ee}function P(k,T){return y(k)===!0||k.isFramebufferTexture&&k.minFilter!==Fn&&k.minFilter!==Wn?Math.log2(Math.max(T.width,T.height))+1:k.mipmaps!==void 0&&k.mipmaps.length>0?k.mipmaps.length:k.isCompressedTexture&&Array.isArray(k.image)?T.mipmaps.length:1}function U(k){const T=k.target;T.removeEventListener("dispose",U),I(T),T.isVideoTexture&&m.delete(T),T.isHTMLTexture&&x.delete(T)}function b(k){const T=k.target;T.removeEventListener("dispose",b),O(T)}function I(k){const T=r.get(k);if(T.__webglInit===void 0)return;const ee=k.source,oe=M.get(ee);if(oe){const z=oe[T.__cacheKey];z.usedTimes--,z.usedTimes===0&&X(k),Object.keys(oe).length===0&&M.delete(ee)}r.remove(k)}function X(k){const T=r.get(k);i.deleteTexture(T.__webglTexture);const ee=k.source,oe=M.get(ee);delete oe[T.__cacheKey],c.memory.textures--}function O(k){const T=r.get(k);if(k.depthTexture&&(k.depthTexture.dispose(),r.remove(k.depthTexture)),k.isWebGLCubeRenderTarget)for(let oe=0;oe<6;oe++){if(Array.isArray(T.__webglFramebuffer[oe]))for(let z=0;z<T.__webglFramebuffer[oe].length;z++)i.deleteFramebuffer(T.__webglFramebuffer[oe][z]);else i.deleteFramebuffer(T.__webglFramebuffer[oe]);T.__webglDepthbuffer&&i.deleteRenderbuffer(T.__webglDepthbuffer[oe])}else{if(Array.isArray(T.__webglFramebuffer))for(let oe=0;oe<T.__webglFramebuffer.length;oe++)i.deleteFramebuffer(T.__webglFramebuffer[oe]);else i.deleteFramebuffer(T.__webglFramebuffer);if(T.__webglDepthbuffer&&i.deleteRenderbuffer(T.__webglDepthbuffer),T.__webglMultisampledFramebuffer&&i.deleteFramebuffer(T.__webglMultisampledFramebuffer),T.__webglColorRenderbuffer)for(let oe=0;oe<T.__webglColorRenderbuffer.length;oe++)T.__webglColorRenderbuffer[oe]&&i.deleteRenderbuffer(T.__webglColorRenderbuffer[oe]);T.__webglDepthRenderbuffer&&i.deleteRenderbuffer(T.__webglDepthRenderbuffer)}const ee=k.textures;for(let oe=0,z=ee.length;oe<z;oe++){const ye=r.get(ee[oe]);ye.__webglTexture&&(i.deleteTexture(ye.__webglTexture),c.memory.textures--),r.remove(ee[oe])}r.remove(k)}let K=0;function se(){K=0}function fe(){return K}function Y(k){K=k}function me(){const k=K;return k>=a.maxTextures&&lt("WebGLTextures: Trying to use "+k+" texture units while this GPU supports only "+a.maxTextures),K+=1,k}function B(k){const T=[];return T.push(k.wrapS),T.push(k.wrapT),T.push(k.wrapR||0),T.push(k.magFilter),T.push(k.minFilter),T.push(k.anisotropy),T.push(k.internalFormat),T.push(k.format),T.push(k.type),T.push(k.generateMipmaps),T.push(k.premultiplyAlpha),T.push(k.flipY),T.push(k.unpackAlignment),T.push(k.colorSpace),T.join()}function $(k,T){const ee=r.get(k);if(k.isVideoTexture&&Z(k),k.isRenderTargetTexture===!1&&k.isExternalTexture!==!0&&k.version>0&&ee.__version!==k.version){const oe=k.image;if(oe===null)lt("WebGLRenderer: Texture marked for update but no image data found.");else if(oe.complete===!1)lt("WebGLRenderer: Texture marked for update but image is incomplete");else{Fe(ee,k,T);return}}else k.isExternalTexture&&(ee.__webglTexture=k.sourceTexture?k.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,ee.__webglTexture,i.TEXTURE0+T)}function ne(k,T){const ee=r.get(k);if(k.isRenderTargetTexture===!1&&k.version>0&&ee.__version!==k.version){Fe(ee,k,T);return}else k.isExternalTexture&&(ee.__webglTexture=k.sourceTexture?k.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,ee.__webglTexture,i.TEXTURE0+T)}function ce(k,T){const ee=r.get(k);if(k.isRenderTargetTexture===!1&&k.version>0&&ee.__version!==k.version){Fe(ee,k,T);return}t.bindTexture(i.TEXTURE_3D,ee.__webglTexture,i.TEXTURE0+T)}function H(k,T){const ee=r.get(k);if(k.isCubeDepthTexture!==!0&&k.version>0&&ee.__version!==k.version){Xe(ee,k,T);return}t.bindTexture(i.TEXTURE_CUBE_MAP,ee.__webglTexture,i.TEXTURE0+T)}const F={[bp]:i.REPEAT,[Gr]:i.CLAMP_TO_EDGE,[Tp]:i.MIRRORED_REPEAT},Te={[Fn]:i.NEAREST,[nb]:i.NEAREST_MIPMAP_NEAREST,[mu]:i.NEAREST_MIPMAP_LINEAR,[Wn]:i.LINEAR,[gf]:i.LINEAR_MIPMAP_NEAREST,[da]:i.LINEAR_MIPMAP_LINEAR},Oe={[sb]:i.NEVER,[ub]:i.ALWAYS,[ab]:i.LESS,[km]:i.LEQUAL,[ob]:i.EQUAL,[zm]:i.GEQUAL,[lb]:i.GREATER,[cb]:i.NOTEQUAL};function ze(k,T){if(T.type===mr&&e.has("OES_texture_float_linear")===!1&&(T.magFilter===Wn||T.magFilter===gf||T.magFilter===mu||T.magFilter===da||T.minFilter===Wn||T.minFilter===gf||T.minFilter===mu||T.minFilter===da)&&lt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(k,i.TEXTURE_WRAP_S,F[T.wrapS]),i.texParameteri(k,i.TEXTURE_WRAP_T,F[T.wrapT]),(k===i.TEXTURE_3D||k===i.TEXTURE_2D_ARRAY)&&i.texParameteri(k,i.TEXTURE_WRAP_R,F[T.wrapR]),i.texParameteri(k,i.TEXTURE_MAG_FILTER,Te[T.magFilter]),i.texParameteri(k,i.TEXTURE_MIN_FILTER,Te[T.minFilter]),T.compareFunction&&(i.texParameteri(k,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(k,i.TEXTURE_COMPARE_FUNC,Oe[T.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(T.magFilter===Fn||T.minFilter!==mu&&T.minFilter!==da||T.type===mr&&e.has("OES_texture_float_linear")===!1)return;if(T.anisotropy>1||r.get(T).__currentAnisotropy){const ee=e.get("EXT_texture_filter_anisotropic");i.texParameterf(k,ee.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(T.anisotropy,a.getMaxAnisotropy())),r.get(T).__currentAnisotropy=T.anisotropy}}}function ie(k,T){let ee=!1;k.__webglInit===void 0&&(k.__webglInit=!0,T.addEventListener("dispose",U));const oe=T.source;let z=M.get(oe);z===void 0&&(z={},M.set(oe,z));const ye=B(T);if(ye!==k.__cacheKey){z[ye]===void 0&&(z[ye]={texture:i.createTexture(),usedTimes:0},c.memory.textures++,ee=!0),z[ye].usedTimes++;const Le=z[k.__cacheKey];Le!==void 0&&(z[k.__cacheKey].usedTimes--,Le.usedTimes===0&&X(T)),k.__cacheKey=ye,k.__webglTexture=z[ye].texture}return ee}function Me(k,T,ee){return Math.floor(Math.floor(k/ee)/T)}function xe(k,T,ee,oe){const ye=k.updateRanges;if(ye.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,T.width,T.height,ee,oe,T.data);else{ye.sort((qe,Ue)=>qe.start-Ue.start);let Le=0;for(let qe=1;qe<ye.length;qe++){const Ue=ye[Le],Pe=ye[qe],et=Ue.start+Ue.count,it=Me(Pe.start,T.width,4),de=Me(Ue.start,T.width,4);Pe.start<=et+1&&it===de&&Me(Pe.start+Pe.count-1,T.width,4)===it?Ue.count=Math.max(Ue.count,Pe.start+Pe.count-Ue.start):(++Le,ye[Le]=Pe)}ye.length=Le+1;const ge=t.getParameter(i.UNPACK_ROW_LENGTH),ve=t.getParameter(i.UNPACK_SKIP_PIXELS),Re=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,T.width);for(let qe=0,Ue=ye.length;qe<Ue;qe++){const Pe=ye[qe],et=Math.floor(Pe.start/4),it=Math.ceil(Pe.count/4),de=et%T.width,j=Math.floor(et/T.width),be=it,_e=1;t.pixelStorei(i.UNPACK_SKIP_PIXELS,de),t.pixelStorei(i.UNPACK_SKIP_ROWS,j),t.texSubImage2D(i.TEXTURE_2D,0,de,j,be,_e,ee,oe,T.data)}k.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,ge),t.pixelStorei(i.UNPACK_SKIP_PIXELS,ve),t.pixelStorei(i.UNPACK_SKIP_ROWS,Re)}}function Fe(k,T,ee){let oe=i.TEXTURE_2D;(T.isDataArrayTexture||T.isCompressedArrayTexture)&&(oe=i.TEXTURE_2D_ARRAY),T.isData3DTexture&&(oe=i.TEXTURE_3D);const z=ie(k,T),ye=T.source;t.bindTexture(oe,k.__webglTexture,i.TEXTURE0+ee);const Le=r.get(ye);if(ye.version!==Le.__version||z===!0){if(t.activeTexture(i.TEXTURE0+ee),(typeof ImageBitmap<"u"&&T.image instanceof ImageBitmap)===!1){const _e=At.getPrimaries(At.workingColorSpace),Ie=T.colorSpace===ws?null:At.getPrimaries(T.colorSpace),ke=T.colorSpace===ws||_e===Ie?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ke)}t.pixelStorei(i.UNPACK_ALIGNMENT,T.unpackAlignment);let ve=S(T.image,!1,a.maxTextureSize);ve=pn(T,ve);const Re=l.convert(T.format,T.colorSpace),qe=l.convert(T.type);let Ue=C(T.internalFormat,Re,qe,T.normalized,T.colorSpace,T.isVideoTexture);ze(oe,T);let Pe;const et=T.mipmaps,it=T.isVideoTexture!==!0,de=Le.__version===void 0||z===!0,j=ye.dataReady,be=P(T,ve);if(T.isDepthTexture)Ue=D(T.format===ha,T.type),de&&(it?t.texStorage2D(i.TEXTURE_2D,1,Ue,ve.width,ve.height):t.texImage2D(i.TEXTURE_2D,0,Ue,ve.width,ve.height,0,Re,qe,null));else if(T.isDataTexture)if(et.length>0){it&&de&&t.texStorage2D(i.TEXTURE_2D,be,Ue,et[0].width,et[0].height);for(let _e=0,Ie=et.length;_e<Ie;_e++)Pe=et[_e],it?j&&t.texSubImage2D(i.TEXTURE_2D,_e,0,0,Pe.width,Pe.height,Re,qe,Pe.data):t.texImage2D(i.TEXTURE_2D,_e,Ue,Pe.width,Pe.height,0,Re,qe,Pe.data);T.generateMipmaps=!1}else it?(de&&t.texStorage2D(i.TEXTURE_2D,be,Ue,ve.width,ve.height),j&&xe(T,ve,Re,qe)):t.texImage2D(i.TEXTURE_2D,0,Ue,ve.width,ve.height,0,Re,qe,ve.data);else if(T.isCompressedTexture)if(T.isCompressedArrayTexture){it&&de&&t.texStorage3D(i.TEXTURE_2D_ARRAY,be,Ue,et[0].width,et[0].height,ve.depth);for(let _e=0,Ie=et.length;_e<Ie;_e++)if(Pe=et[_e],T.format!==Ki)if(Re!==null)if(it){if(j)if(T.layerUpdates.size>0){const ke=Av(Pe.width,Pe.height,T.format,T.type);for(const Se of T.layerUpdates){const Ye=Pe.data.subarray(Se*ke/Pe.data.BYTES_PER_ELEMENT,(Se+1)*ke/Pe.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,_e,0,0,Se,Pe.width,Pe.height,1,Re,Ye)}T.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,_e,0,0,0,Pe.width,Pe.height,ve.depth,Re,Pe.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,_e,Ue,Pe.width,Pe.height,ve.depth,0,Pe.data,0,0);else lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else it?j&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,_e,0,0,0,Pe.width,Pe.height,ve.depth,Re,qe,Pe.data):t.texImage3D(i.TEXTURE_2D_ARRAY,_e,Ue,Pe.width,Pe.height,ve.depth,0,Re,qe,Pe.data)}else{it&&de&&t.texStorage2D(i.TEXTURE_2D,be,Ue,et[0].width,et[0].height);for(let _e=0,Ie=et.length;_e<Ie;_e++)Pe=et[_e],T.format!==Ki?Re!==null?it?j&&t.compressedTexSubImage2D(i.TEXTURE_2D,_e,0,0,Pe.width,Pe.height,Re,Pe.data):t.compressedTexImage2D(i.TEXTURE_2D,_e,Ue,Pe.width,Pe.height,0,Pe.data):lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):it?j&&t.texSubImage2D(i.TEXTURE_2D,_e,0,0,Pe.width,Pe.height,Re,qe,Pe.data):t.texImage2D(i.TEXTURE_2D,_e,Ue,Pe.width,Pe.height,0,Re,qe,Pe.data)}else if(T.isDataArrayTexture)if(it){if(de&&t.texStorage3D(i.TEXTURE_2D_ARRAY,be,Ue,ve.width,ve.height,ve.depth),j)if(T.layerUpdates.size>0){const _e=Av(ve.width,ve.height,T.format,T.type);for(const Ie of T.layerUpdates){const ke=ve.data.subarray(Ie*_e/ve.data.BYTES_PER_ELEMENT,(Ie+1)*_e/ve.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,Ie,ve.width,ve.height,1,Re,qe,ke)}T.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ve.width,ve.height,ve.depth,Re,qe,ve.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,Ue,ve.width,ve.height,ve.depth,0,Re,qe,ve.data);else if(T.isData3DTexture)it?(de&&t.texStorage3D(i.TEXTURE_3D,be,Ue,ve.width,ve.height,ve.depth),j&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ve.width,ve.height,ve.depth,Re,qe,ve.data)):t.texImage3D(i.TEXTURE_3D,0,Ue,ve.width,ve.height,ve.depth,0,Re,qe,ve.data);else if(T.isFramebufferTexture){if(de)if(it)t.texStorage2D(i.TEXTURE_2D,be,Ue,ve.width,ve.height);else{let _e=ve.width,Ie=ve.height;for(let ke=0;ke<be;ke++)t.texImage2D(i.TEXTURE_2D,ke,Ue,_e,Ie,0,Re,qe,null),_e>>=1,Ie>>=1}}else if(T.isHTMLTexture){if("texElementImage2D"in i){const _e=i.canvas;if(_e.hasAttribute("layoutsubtree")||_e.setAttribute("layoutsubtree","true"),ve.parentNode!==_e){_e.appendChild(ve),x.add(T),_e.onpaint=Ie=>{const ke=Ie.changedElements;for(const Se of x)ke.includes(Se.image)&&(Se.needsUpdate=!0)},_e.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,ve);else{const ke=i.RGBA,Se=i.RGBA,Ye=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,ke,Se,Ye,ve)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(et.length>0){if(it&&de){const _e=mt(et[0]);t.texStorage2D(i.TEXTURE_2D,be,Ue,_e.width,_e.height)}for(let _e=0,Ie=et.length;_e<Ie;_e++)Pe=et[_e],it?j&&t.texSubImage2D(i.TEXTURE_2D,_e,0,0,Re,qe,Pe):t.texImage2D(i.TEXTURE_2D,_e,Ue,Re,qe,Pe);T.generateMipmaps=!1}else if(it){if(de){const _e=mt(ve);t.texStorage2D(i.TEXTURE_2D,be,Ue,_e.width,_e.height)}j&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,Re,qe,ve)}else t.texImage2D(i.TEXTURE_2D,0,Ue,Re,qe,ve);y(T)&&N(oe),Le.__version=ye.version,T.onUpdate&&T.onUpdate(T)}k.__version=T.version}function Xe(k,T,ee){if(T.image.length!==6)return;const oe=ie(k,T),z=T.source;t.bindTexture(i.TEXTURE_CUBE_MAP,k.__webglTexture,i.TEXTURE0+ee);const ye=r.get(z);if(z.version!==ye.__version||oe===!0){t.activeTexture(i.TEXTURE0+ee);const Le=At.getPrimaries(At.workingColorSpace),ge=T.colorSpace===ws?null:At.getPrimaries(T.colorSpace),ve=T.colorSpace===ws||Le===ge?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,T.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ve);const Re=T.isCompressedTexture||T.image[0].isCompressedTexture,qe=T.image[0]&&T.image[0].isDataTexture,Ue=[];for(let Se=0;Se<6;Se++)!Re&&!qe?Ue[Se]=S(T.image[Se],!0,a.maxCubemapSize):Ue[Se]=qe?T.image[Se].image:T.image[Se],Ue[Se]=pn(T,Ue[Se]);const Pe=Ue[0],et=l.convert(T.format,T.colorSpace),it=l.convert(T.type),de=C(T.internalFormat,et,it,T.normalized,T.colorSpace),j=T.isVideoTexture!==!0,be=ye.__version===void 0||oe===!0,_e=z.dataReady;let Ie=P(T,Pe);ze(i.TEXTURE_CUBE_MAP,T);let ke;if(Re){j&&be&&t.texStorage2D(i.TEXTURE_CUBE_MAP,Ie,de,Pe.width,Pe.height);for(let Se=0;Se<6;Se++){ke=Ue[Se].mipmaps;for(let Ye=0;Ye<ke.length;Ye++){const We=ke[Ye];T.format!==Ki?et!==null?j?_e&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ye,0,0,We.width,We.height,et,We.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ye,de,We.width,We.height,0,We.data):lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):j?_e&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ye,0,0,We.width,We.height,et,it,We.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ye,de,We.width,We.height,0,et,it,We.data)}}}else{if(ke=T.mipmaps,j&&be){ke.length>0&&Ie++;const Se=mt(Ue[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,Ie,de,Se.width,Se.height)}for(let Se=0;Se<6;Se++)if(qe){j?_e&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,0,0,0,Ue[Se].width,Ue[Se].height,et,it,Ue[Se].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,0,de,Ue[Se].width,Ue[Se].height,0,et,it,Ue[Se].data);for(let Ye=0;Ye<ke.length;Ye++){const Ot=ke[Ye].image[Se].image;j?_e&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ye+1,0,0,Ot.width,Ot.height,et,it,Ot.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ye+1,de,Ot.width,Ot.height,0,et,it,Ot.data)}}else{j?_e&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,0,0,0,et,it,Ue[Se]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,0,de,et,it,Ue[Se]);for(let Ye=0;Ye<ke.length;Ye++){const We=ke[Ye];j?_e&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ye+1,0,0,et,it,We.image[Se]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ye+1,de,et,it,We.image[Se])}}}y(T)&&N(i.TEXTURE_CUBE_MAP),ye.__version=z.version,T.onUpdate&&T.onUpdate(T)}k.__version=T.version}function Qe(k,T,ee,oe,z,ye){const Le=l.convert(ee.format,ee.colorSpace),ge=l.convert(ee.type),ve=C(ee.internalFormat,Le,ge,ee.normalized,ee.colorSpace),Re=r.get(T),qe=r.get(ee);if(qe.__renderTarget=T,!Re.__hasExternalTextures){const Ue=Math.max(1,T.width>>ye),Pe=Math.max(1,T.height>>ye);z===i.TEXTURE_3D||z===i.TEXTURE_2D_ARRAY?t.texImage3D(z,ye,ve,Ue,Pe,T.depth,0,Le,ge,null):t.texImage2D(z,ye,ve,Ue,Pe,0,Le,ge,null)}t.bindFramebuffer(i.FRAMEBUFFER,k),Ht(T)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,oe,z,qe.__webglTexture,0,Nt(T)):(z===i.TEXTURE_2D||z>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&z<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,oe,z,qe.__webglTexture,ye),t.bindFramebuffer(i.FRAMEBUFFER,null)}function It(k,T,ee){if(i.bindRenderbuffer(i.RENDERBUFFER,k),T.depthBuffer){const oe=T.depthTexture,z=oe&&oe.isDepthTexture?oe.type:null,ye=D(T.stencilBuffer,z),Le=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;Ht(T)?d.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Nt(T),ye,T.width,T.height):ee?i.renderbufferStorageMultisample(i.RENDERBUFFER,Nt(T),ye,T.width,T.height):i.renderbufferStorage(i.RENDERBUFFER,ye,T.width,T.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Le,i.RENDERBUFFER,k)}else{const oe=T.textures;for(let z=0;z<oe.length;z++){const ye=oe[z],Le=l.convert(ye.format,ye.colorSpace),ge=l.convert(ye.type),ve=C(ye.internalFormat,Le,ge,ye.normalized,ye.colorSpace);Ht(T)?d.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Nt(T),ve,T.width,T.height):ee?i.renderbufferStorageMultisample(i.RENDERBUFFER,Nt(T),ve,T.width,T.height):i.renderbufferStorage(i.RENDERBUFFER,ve,T.width,T.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function dt(k,T,ee){const oe=T.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,k),!(T.depthTexture&&T.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const z=r.get(T.depthTexture);if(z.__renderTarget=T,(!z.__webglTexture||T.depthTexture.image.width!==T.width||T.depthTexture.image.height!==T.height)&&(T.depthTexture.image.width=T.width,T.depthTexture.image.height=T.height,T.depthTexture.needsUpdate=!0),oe){if(z.__webglInit===void 0&&(z.__webglInit=!0,T.depthTexture.addEventListener("dispose",U)),z.__webglTexture===void 0){z.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,z.__webglTexture),ze(i.TEXTURE_CUBE_MAP,T.depthTexture);const Re=l.convert(T.depthTexture.format),qe=l.convert(T.depthTexture.type);let Ue;T.depthTexture.format===Yr?Ue=i.DEPTH_COMPONENT24:T.depthTexture.format===ha&&(Ue=i.DEPTH24_STENCIL8);for(let Pe=0;Pe<6;Pe++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Pe,0,Ue,T.width,T.height,0,Re,qe,null)}}else $(T.depthTexture,0);const ye=z.__webglTexture,Le=Nt(T),ge=oe?i.TEXTURE_CUBE_MAP_POSITIVE_X+ee:i.TEXTURE_2D,ve=T.depthTexture.format===ha?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(T.depthTexture.format===Yr)Ht(T)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ve,ge,ye,0,Le):i.framebufferTexture2D(i.FRAMEBUFFER,ve,ge,ye,0);else if(T.depthTexture.format===ha)Ht(T)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ve,ge,ye,0,Le):i.framebufferTexture2D(i.FRAMEBUFFER,ve,ge,ye,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function wt(k){const T=r.get(k),ee=k.isWebGLCubeRenderTarget===!0;if(T.__boundDepthTexture!==k.depthTexture){const oe=k.depthTexture;if(T.__depthDisposeCallback&&T.__depthDisposeCallback(),oe){const z=()=>{delete T.__boundDepthTexture,delete T.__depthDisposeCallback,oe.removeEventListener("dispose",z)};oe.addEventListener("dispose",z),T.__depthDisposeCallback=z}T.__boundDepthTexture=oe}if(k.depthTexture&&!T.__autoAllocateDepthBuffer)if(ee)for(let oe=0;oe<6;oe++)dt(T.__webglFramebuffer[oe],k,oe);else{const oe=k.texture.mipmaps;oe&&oe.length>0?dt(T.__webglFramebuffer[0],k,0):dt(T.__webglFramebuffer,k,0)}else if(ee){T.__webglDepthbuffer=[];for(let oe=0;oe<6;oe++)if(t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer[oe]),T.__webglDepthbuffer[oe]===void 0)T.__webglDepthbuffer[oe]=i.createRenderbuffer(),It(T.__webglDepthbuffer[oe],k,!1);else{const z=k.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ye=T.__webglDepthbuffer[oe];i.bindRenderbuffer(i.RENDERBUFFER,ye),i.framebufferRenderbuffer(i.FRAMEBUFFER,z,i.RENDERBUFFER,ye)}}else{const oe=k.texture.mipmaps;if(oe&&oe.length>0?t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer),T.__webglDepthbuffer===void 0)T.__webglDepthbuffer=i.createRenderbuffer(),It(T.__webglDepthbuffer,k,!1);else{const z=k.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ye=T.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,ye),i.framebufferRenderbuffer(i.FRAMEBUFFER,z,i.RENDERBUFFER,ye)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function St(k,T,ee){const oe=r.get(k);T!==void 0&&Qe(oe.__webglFramebuffer,k,k.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),ee!==void 0&&wt(k)}function vt(k){const T=k.texture,ee=r.get(k),oe=r.get(T);k.addEventListener("dispose",b);const z=k.textures,ye=k.isWebGLCubeRenderTarget===!0,Le=z.length>1;if(Le||(oe.__webglTexture===void 0&&(oe.__webglTexture=i.createTexture()),oe.__version=T.version,c.memory.textures++),ye){ee.__webglFramebuffer=[];for(let ge=0;ge<6;ge++)if(T.mipmaps&&T.mipmaps.length>0){ee.__webglFramebuffer[ge]=[];for(let ve=0;ve<T.mipmaps.length;ve++)ee.__webglFramebuffer[ge][ve]=i.createFramebuffer()}else ee.__webglFramebuffer[ge]=i.createFramebuffer()}else{if(T.mipmaps&&T.mipmaps.length>0){ee.__webglFramebuffer=[];for(let ge=0;ge<T.mipmaps.length;ge++)ee.__webglFramebuffer[ge]=i.createFramebuffer()}else ee.__webglFramebuffer=i.createFramebuffer();if(Le)for(let ge=0,ve=z.length;ge<ve;ge++){const Re=r.get(z[ge]);Re.__webglTexture===void 0&&(Re.__webglTexture=i.createTexture(),c.memory.textures++)}if(k.samples>0&&Ht(k)===!1){ee.__webglMultisampledFramebuffer=i.createFramebuffer(),ee.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,ee.__webglMultisampledFramebuffer);for(let ge=0;ge<z.length;ge++){const ve=z[ge];ee.__webglColorRenderbuffer[ge]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,ee.__webglColorRenderbuffer[ge]);const Re=l.convert(ve.format,ve.colorSpace),qe=l.convert(ve.type),Ue=C(ve.internalFormat,Re,qe,ve.normalized,ve.colorSpace,k.isXRRenderTarget===!0),Pe=Nt(k);i.renderbufferStorageMultisample(i.RENDERBUFFER,Pe,Ue,k.width,k.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ge,i.RENDERBUFFER,ee.__webglColorRenderbuffer[ge])}i.bindRenderbuffer(i.RENDERBUFFER,null),k.depthBuffer&&(ee.__webglDepthRenderbuffer=i.createRenderbuffer(),It(ee.__webglDepthRenderbuffer,k,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(ye){t.bindTexture(i.TEXTURE_CUBE_MAP,oe.__webglTexture),ze(i.TEXTURE_CUBE_MAP,T);for(let ge=0;ge<6;ge++)if(T.mipmaps&&T.mipmaps.length>0)for(let ve=0;ve<T.mipmaps.length;ve++)Qe(ee.__webglFramebuffer[ge][ve],k,T,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ge,ve);else Qe(ee.__webglFramebuffer[ge],k,T,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ge,0);y(T)&&N(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Le){for(let ge=0,ve=z.length;ge<ve;ge++){const Re=z[ge],qe=r.get(Re);let Ue=i.TEXTURE_2D;(k.isWebGL3DRenderTarget||k.isWebGLArrayRenderTarget)&&(Ue=k.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(Ue,qe.__webglTexture),ze(Ue,Re),Qe(ee.__webglFramebuffer,k,Re,i.COLOR_ATTACHMENT0+ge,Ue,0),y(Re)&&N(Ue)}t.unbindTexture()}else{let ge=i.TEXTURE_2D;if((k.isWebGL3DRenderTarget||k.isWebGLArrayRenderTarget)&&(ge=k.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ge,oe.__webglTexture),ze(ge,T),T.mipmaps&&T.mipmaps.length>0)for(let ve=0;ve<T.mipmaps.length;ve++)Qe(ee.__webglFramebuffer[ve],k,T,i.COLOR_ATTACHMENT0,ge,ve);else Qe(ee.__webglFramebuffer,k,T,i.COLOR_ATTACHMENT0,ge,0);y(T)&&N(ge),t.unbindTexture()}k.depthBuffer&&wt(k)}function Ut(k){const T=k.textures;for(let ee=0,oe=T.length;ee<oe;ee++){const z=T[ee];if(y(z)){const ye=L(k),Le=r.get(z).__webglTexture;t.bindTexture(ye,Le),N(ye),t.unbindTexture()}}}const qt=[],Xt=[];function $t(k){if(k.samples>0){if(Ht(k)===!1){const T=k.textures,ee=k.width,oe=k.height;let z=i.COLOR_BUFFER_BIT;const ye=k.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Le=r.get(k),ge=T.length>1;if(ge)for(let Re=0;Re<T.length;Re++)t.bindFramebuffer(i.FRAMEBUFFER,Le.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Re,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,Le.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Re,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,Le.__webglMultisampledFramebuffer);const ve=k.texture.mipmaps;ve&&ve.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Le.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Le.__webglFramebuffer);for(let Re=0;Re<T.length;Re++){if(k.resolveDepthBuffer&&(k.depthBuffer&&(z|=i.DEPTH_BUFFER_BIT),k.stencilBuffer&&k.resolveStencilBuffer&&(z|=i.STENCIL_BUFFER_BIT)),ge){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Le.__webglColorRenderbuffer[Re]);const qe=r.get(T[Re]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,qe,0)}i.blitFramebuffer(0,0,ee,oe,0,0,ee,oe,z,i.NEAREST),h===!0&&(qt.length=0,Xt.length=0,qt.push(i.COLOR_ATTACHMENT0+Re),k.depthBuffer&&k.resolveDepthBuffer===!1&&(qt.push(ye),Xt.push(ye),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Xt)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,qt))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),ge)for(let Re=0;Re<T.length;Re++){t.bindFramebuffer(i.FRAMEBUFFER,Le.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Re,i.RENDERBUFFER,Le.__webglColorRenderbuffer[Re]);const qe=r.get(T[Re]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,Le.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Re,i.TEXTURE_2D,qe,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Le.__webglMultisampledFramebuffer)}else if(k.depthBuffer&&k.resolveDepthBuffer===!1&&h){const T=k.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[T])}}}function Nt(k){return Math.min(a.maxSamples,k.samples)}function Ht(k){const T=r.get(k);return k.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&T.__useRenderToTexture!==!1}function Z(k){const T=c.render.frame;m.get(k)!==T&&(m.set(k,T),k.update())}function pn(k,T){const ee=k.colorSpace,oe=k.format,z=k.type;return k.isCompressedTexture===!0||k.isVideoTexture===!0||ee!==ld&&ee!==ws&&(At.getTransfer(ee)===jt?(oe!==Ki||z!==Si)&&lt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Dt("WebGLTextures: Unsupported texture color space:",ee)),T}function mt(k){return typeof HTMLImageElement<"u"&&k instanceof HTMLImageElement?(f.width=k.naturalWidth||k.width,f.height=k.naturalHeight||k.height):typeof VideoFrame<"u"&&k instanceof VideoFrame?(f.width=k.displayWidth,f.height=k.displayHeight):(f.width=k.width,f.height=k.height),f}this.allocateTextureUnit=me,this.resetTextureUnits=se,this.getTextureUnits=fe,this.setTextureUnits=Y,this.setTexture2D=$,this.setTexture2DArray=ne,this.setTexture3D=ce,this.setTextureCube=H,this.rebindTextures=St,this.setupRenderTarget=vt,this.updateRenderTargetMipmap=Ut,this.updateMultisampleRenderTarget=$t,this.setupDepthRenderbuffer=wt,this.setupFrameBufferTexture=Qe,this.useMultisampledRTT=Ht,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function qP(i,e){function t(r,a=ws){let l;const c=At.getTransfer(a);if(r===Si)return i.UNSIGNED_BYTE;if(r===Dm)return i.UNSIGNED_SHORT_4_4_4_4;if(r===Im)return i.UNSIGNED_SHORT_5_5_5_1;if(r===hy)return i.UNSIGNED_INT_5_9_9_9_REV;if(r===fy)return i.UNSIGNED_INT_10F_11F_11F_REV;if(r===uy)return i.BYTE;if(r===dy)return i.SHORT;if(r===Xl)return i.UNSIGNED_SHORT;if(r===Lm)return i.INT;if(r===yr)return i.UNSIGNED_INT;if(r===mr)return i.FLOAT;if(r===qr)return i.HALF_FLOAT;if(r===py)return i.ALPHA;if(r===my)return i.RGB;if(r===Ki)return i.RGBA;if(r===Yr)return i.DEPTH_COMPONENT;if(r===ha)return i.DEPTH_STENCIL;if(r===gy)return i.RED;if(r===Um)return i.RED_INTEGER;if(r===ba)return i.RG;if(r===Fm)return i.RG_INTEGER;if(r===Om)return i.RGBA_INTEGER;if(r===qu||r===Yu||r===Ku||r===Qu)if(c===jt)if(l=e.get("WEBGL_compressed_texture_s3tc_srgb"),l!==null){if(r===qu)return l.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(r===Yu)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(r===Ku)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(r===Qu)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(l=e.get("WEBGL_compressed_texture_s3tc"),l!==null){if(r===qu)return l.COMPRESSED_RGB_S3TC_DXT1_EXT;if(r===Yu)return l.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(r===Ku)return l.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(r===Qu)return l.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(r===Cp||r===Rp||r===Ap||r===Pp)if(l=e.get("WEBGL_compressed_texture_pvrtc"),l!==null){if(r===Cp)return l.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(r===Rp)return l.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(r===Ap)return l.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(r===Pp)return l.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(r===Np||r===Lp||r===Dp||r===Ip||r===Up||r===sd||r===Fp)if(l=e.get("WEBGL_compressed_texture_etc"),l!==null){if(r===Np||r===Lp)return c===jt?l.COMPRESSED_SRGB8_ETC2:l.COMPRESSED_RGB8_ETC2;if(r===Dp)return c===jt?l.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:l.COMPRESSED_RGBA8_ETC2_EAC;if(r===Ip)return l.COMPRESSED_R11_EAC;if(r===Up)return l.COMPRESSED_SIGNED_R11_EAC;if(r===sd)return l.COMPRESSED_RG11_EAC;if(r===Fp)return l.COMPRESSED_SIGNED_RG11_EAC}else return null;if(r===Op||r===kp||r===zp||r===Bp||r===Hp||r===Vp||r===Gp||r===jp||r===Wp||r===Xp||r===$p||r===qp||r===Yp||r===Kp)if(l=e.get("WEBGL_compressed_texture_astc"),l!==null){if(r===Op)return c===jt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:l.COMPRESSED_RGBA_ASTC_4x4_KHR;if(r===kp)return c===jt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:l.COMPRESSED_RGBA_ASTC_5x4_KHR;if(r===zp)return c===jt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:l.COMPRESSED_RGBA_ASTC_5x5_KHR;if(r===Bp)return c===jt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:l.COMPRESSED_RGBA_ASTC_6x5_KHR;if(r===Hp)return c===jt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:l.COMPRESSED_RGBA_ASTC_6x6_KHR;if(r===Vp)return c===jt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:l.COMPRESSED_RGBA_ASTC_8x5_KHR;if(r===Gp)return c===jt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:l.COMPRESSED_RGBA_ASTC_8x6_KHR;if(r===jp)return c===jt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:l.COMPRESSED_RGBA_ASTC_8x8_KHR;if(r===Wp)return c===jt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:l.COMPRESSED_RGBA_ASTC_10x5_KHR;if(r===Xp)return c===jt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:l.COMPRESSED_RGBA_ASTC_10x6_KHR;if(r===$p)return c===jt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:l.COMPRESSED_RGBA_ASTC_10x8_KHR;if(r===qp)return c===jt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:l.COMPRESSED_RGBA_ASTC_10x10_KHR;if(r===Yp)return c===jt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:l.COMPRESSED_RGBA_ASTC_12x10_KHR;if(r===Kp)return c===jt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:l.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(r===Qp||r===Zp||r===Jp)if(l=e.get("EXT_texture_compression_bptc"),l!==null){if(r===Qp)return c===jt?l.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:l.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(r===Zp)return l.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(r===Jp)return l.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(r===em||r===tm||r===ad||r===nm)if(l=e.get("EXT_texture_compression_rgtc"),l!==null){if(r===em)return l.COMPRESSED_RED_RGTC1_EXT;if(r===tm)return l.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(r===ad)return l.COMPRESSED_RED_GREEN_RGTC2_EXT;if(r===nm)return l.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return r===$l?i.UNSIGNED_INT_24_8:i[r]!==void 0?i[r]:null}return{convert:t}}const YP=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,KP=`
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

}`;class QP{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const r=new by(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=r}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,r=new Mr({vertexShader:YP,fragmentShader:KP,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Zi(new Sd(20,20),r)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class ZP extends ks{constructor(e,t){super();const r=this;let a=null,l=1,c=null,d="local-floor",h=1,f=null,m=null,x=null,g=null,M=null,E=null;const w=typeof XRWebGLBinding<"u",S=new QP,y={},N=t.getContextAttributes();let L=null,C=null;const D=[],P=[],U=new ut;let b=null;const I=new Ii;I.viewport=new un;const X=new Ii;X.viewport=new un;const O=[I,X],K=new oT;let se=null,fe=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(ie){let Me=D[ie];return Me===void 0&&(Me=new Ef,D[ie]=Me),Me.getTargetRaySpace()},this.getControllerGrip=function(ie){let Me=D[ie];return Me===void 0&&(Me=new Ef,D[ie]=Me),Me.getGripSpace()},this.getHand=function(ie){let Me=D[ie];return Me===void 0&&(Me=new Ef,D[ie]=Me),Me.getHandSpace()};function Y(ie){const Me=P.indexOf(ie.inputSource);if(Me===-1)return;const xe=D[Me];xe!==void 0&&(xe.update(ie.inputSource,ie.frame,f||c),xe.dispatchEvent({type:ie.type,data:ie.inputSource}))}function me(){a.removeEventListener("select",Y),a.removeEventListener("selectstart",Y),a.removeEventListener("selectend",Y),a.removeEventListener("squeeze",Y),a.removeEventListener("squeezestart",Y),a.removeEventListener("squeezeend",Y),a.removeEventListener("end",me),a.removeEventListener("inputsourceschange",B);for(let ie=0;ie<D.length;ie++){const Me=P[ie];Me!==null&&(P[ie]=null,D[ie].disconnect(Me))}se=null,fe=null,S.reset();for(const ie in y)delete y[ie];e.setRenderTarget(L),M=null,g=null,x=null,a=null,C=null,ze.stop(),r.isPresenting=!1,e.setPixelRatio(b),e.setSize(U.width,U.height,!1),r.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(ie){l=ie,r.isPresenting===!0&&lt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(ie){d=ie,r.isPresenting===!0&&lt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return f||c},this.setReferenceSpace=function(ie){f=ie},this.getBaseLayer=function(){return g!==null?g:M},this.getBinding=function(){return x===null&&w&&(x=new XRWebGLBinding(a,t)),x},this.getFrame=function(){return E},this.getSession=function(){return a},this.setSession=async function(ie){if(a=ie,a!==null){if(L=e.getRenderTarget(),a.addEventListener("select",Y),a.addEventListener("selectstart",Y),a.addEventListener("selectend",Y),a.addEventListener("squeeze",Y),a.addEventListener("squeezestart",Y),a.addEventListener("squeezeend",Y),a.addEventListener("end",me),a.addEventListener("inputsourceschange",B),N.xrCompatible!==!0&&await t.makeXRCompatible(),b=e.getPixelRatio(),e.getSize(U),w&&"createProjectionLayer"in XRWebGLBinding.prototype){let xe=null,Fe=null,Xe=null;N.depth&&(Xe=N.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,xe=N.stencil?ha:Yr,Fe=N.stencil?$l:yr);const Qe={colorFormat:t.RGBA8,depthFormat:Xe,scaleFactor:l};x=this.getBinding(),g=x.createProjectionLayer(Qe),a.updateRenderState({layers:[g]}),e.setPixelRatio(1),e.setSize(g.textureWidth,g.textureHeight,!1),C=new vr(g.textureWidth,g.textureHeight,{format:Ki,type:Si,depthTexture:new Uo(g.textureWidth,g.textureHeight,Fe,void 0,void 0,void 0,void 0,void 0,void 0,xe),stencilBuffer:N.stencil,colorSpace:e.outputColorSpace,samples:N.antialias?4:0,resolveDepthBuffer:g.ignoreDepthValues===!1,resolveStencilBuffer:g.ignoreDepthValues===!1})}else{const xe={antialias:N.antialias,alpha:!0,depth:N.depth,stencil:N.stencil,framebufferScaleFactor:l};M=new XRWebGLLayer(a,t,xe),a.updateRenderState({baseLayer:M}),e.setPixelRatio(1),e.setSize(M.framebufferWidth,M.framebufferHeight,!1),C=new vr(M.framebufferWidth,M.framebufferHeight,{format:Ki,type:Si,colorSpace:e.outputColorSpace,stencilBuffer:N.stencil,resolveDepthBuffer:M.ignoreDepthValues===!1,resolveStencilBuffer:M.ignoreDepthValues===!1})}C.isXRRenderTarget=!0,this.setFoveation(h),f=null,c=await a.requestReferenceSpace(d),ze.setContext(a),ze.start(),r.isPresenting=!0,r.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(a!==null)return a.environmentBlendMode},this.getDepthTexture=function(){return S.getDepthTexture()};function B(ie){for(let Me=0;Me<ie.removed.length;Me++){const xe=ie.removed[Me],Fe=P.indexOf(xe);Fe>=0&&(P[Fe]=null,D[Fe].disconnect(xe))}for(let Me=0;Me<ie.added.length;Me++){const xe=ie.added[Me];let Fe=P.indexOf(xe);if(Fe===-1){for(let Qe=0;Qe<D.length;Qe++)if(Qe>=P.length){P.push(xe),Fe=Qe;break}else if(P[Qe]===null){P[Qe]=xe,Fe=Qe;break}if(Fe===-1)break}const Xe=D[Fe];Xe&&Xe.connect(xe)}}const $=new te,ne=new te;function ce(ie,Me,xe){$.setFromMatrixPosition(Me.matrixWorld),ne.setFromMatrixPosition(xe.matrixWorld);const Fe=$.distanceTo(ne),Xe=Me.projectionMatrix.elements,Qe=xe.projectionMatrix.elements,It=Xe[14]/(Xe[10]-1),dt=Xe[14]/(Xe[10]+1),wt=(Xe[9]+1)/Xe[5],St=(Xe[9]-1)/Xe[5],vt=(Xe[8]-1)/Xe[0],Ut=(Qe[8]+1)/Qe[0],qt=It*vt,Xt=It*Ut,$t=Fe/(-vt+Ut),Nt=$t*-vt;if(Me.matrixWorld.decompose(ie.position,ie.quaternion,ie.scale),ie.translateX(Nt),ie.translateZ($t),ie.matrixWorld.compose(ie.position,ie.quaternion,ie.scale),ie.matrixWorldInverse.copy(ie.matrixWorld).invert(),Xe[10]===-1)ie.projectionMatrix.copy(Me.projectionMatrix),ie.projectionMatrixInverse.copy(Me.projectionMatrixInverse);else{const Ht=It+$t,Z=dt+$t,pn=qt-Nt,mt=Xt+(Fe-Nt),k=wt*dt/Z*Ht,T=St*dt/Z*Ht;ie.projectionMatrix.makePerspective(pn,mt,k,T,Ht,Z),ie.projectionMatrixInverse.copy(ie.projectionMatrix).invert()}}function H(ie,Me){Me===null?ie.matrixWorld.copy(ie.matrix):ie.matrixWorld.multiplyMatrices(Me.matrixWorld,ie.matrix),ie.matrixWorldInverse.copy(ie.matrixWorld).invert()}this.updateCamera=function(ie){if(a===null)return;let Me=ie.near,xe=ie.far;S.texture!==null&&(S.depthNear>0&&(Me=S.depthNear),S.depthFar>0&&(xe=S.depthFar)),K.near=X.near=I.near=Me,K.far=X.far=I.far=xe,(se!==K.near||fe!==K.far)&&(a.updateRenderState({depthNear:K.near,depthFar:K.far}),se=K.near,fe=K.far),K.layers.mask=ie.layers.mask|6,I.layers.mask=K.layers.mask&-5,X.layers.mask=K.layers.mask&-3;const Fe=ie.parent,Xe=K.cameras;H(K,Fe);for(let Qe=0;Qe<Xe.length;Qe++)H(Xe[Qe],Fe);Xe.length===2?ce(K,I,X):K.projectionMatrix.copy(I.projectionMatrix),F(ie,K,Fe)};function F(ie,Me,xe){xe===null?ie.matrix.copy(Me.matrixWorld):(ie.matrix.copy(xe.matrixWorld),ie.matrix.invert(),ie.matrix.multiply(Me.matrixWorld)),ie.matrix.decompose(ie.position,ie.quaternion,ie.scale),ie.updateMatrixWorld(!0),ie.projectionMatrix.copy(Me.projectionMatrix),ie.projectionMatrixInverse.copy(Me.projectionMatrixInverse),ie.isPerspectiveCamera&&(ie.fov=im*2*Math.atan(1/ie.projectionMatrix.elements[5]),ie.zoom=1)}this.getCamera=function(){return K},this.getFoveation=function(){if(!(g===null&&M===null))return h},this.setFoveation=function(ie){h=ie,g!==null&&(g.fixedFoveation=ie),M!==null&&M.fixedFoveation!==void 0&&(M.fixedFoveation=ie)},this.hasDepthSensing=function(){return S.texture!==null},this.getDepthSensingMesh=function(){return S.getMesh(K)},this.getCameraTexture=function(ie){return y[ie]};let Te=null;function Oe(ie,Me){if(m=Me.getViewerPose(f||c),E=Me,m!==null){const xe=m.views;M!==null&&(e.setRenderTargetFramebuffer(C,M.framebuffer),e.setRenderTarget(C));let Fe=!1;xe.length!==K.cameras.length&&(K.cameras.length=0,Fe=!0);for(let dt=0;dt<xe.length;dt++){const wt=xe[dt];let St=null;if(M!==null)St=M.getViewport(wt);else{const Ut=x.getViewSubImage(g,wt);St=Ut.viewport,dt===0&&(e.setRenderTargetTextures(C,Ut.colorTexture,Ut.depthStencilTexture),e.setRenderTarget(C))}let vt=O[dt];vt===void 0&&(vt=new Ii,vt.layers.enable(dt),vt.viewport=new un,O[dt]=vt),vt.matrix.fromArray(wt.transform.matrix),vt.matrix.decompose(vt.position,vt.quaternion,vt.scale),vt.projectionMatrix.fromArray(wt.projectionMatrix),vt.projectionMatrixInverse.copy(vt.projectionMatrix).invert(),vt.viewport.set(St.x,St.y,St.width,St.height),dt===0&&(K.matrix.copy(vt.matrix),K.matrix.decompose(K.position,K.quaternion,K.scale)),Fe===!0&&K.cameras.push(vt)}const Xe=a.enabledFeatures;if(Xe&&Xe.includes("depth-sensing")&&a.depthUsage=="gpu-optimized"&&w){x=r.getBinding();const dt=x.getDepthInformation(xe[0]);dt&&dt.isValid&&dt.texture&&S.init(dt,a.renderState)}if(Xe&&Xe.includes("camera-access")&&w){e.state.unbindTexture(),x=r.getBinding();for(let dt=0;dt<xe.length;dt++){const wt=xe[dt].camera;if(wt){let St=y[wt];St||(St=new by,y[wt]=St);const vt=x.getCameraImage(wt);St.sourceTexture=vt}}}}for(let xe=0;xe<D.length;xe++){const Fe=P[xe],Xe=D[xe];Fe!==null&&Xe!==void 0&&Xe.update(Fe,Me,f||c)}Te&&Te(ie,Me),Me.detectedPlanes&&r.dispatchEvent({type:"planesdetected",data:Me}),E=null}const ze=new Ry;ze.setAnimationLoop(Oe),this.setAnimationLoop=function(ie){Te=ie},this.dispose=function(){}}}const JP=new an,Uy=new pt;Uy.set(-1,0,0,0,1,0,0,0,1);function e2(i,e){function t(S,y){S.matrixAutoUpdate===!0&&S.updateMatrix(),y.value.copy(S.matrix)}function r(S,y){y.color.getRGB(S.fogColor.value,Ty(i)),y.isFog?(S.fogNear.value=y.near,S.fogFar.value=y.far):y.isFogExp2&&(S.fogDensity.value=y.density)}function a(S,y,N,L,C){y.isNodeMaterial?y.uniformsNeedUpdate=!1:y.isMeshBasicMaterial?l(S,y):y.isMeshLambertMaterial?(l(S,y),y.envMap&&(S.envMapIntensity.value=y.envMapIntensity)):y.isMeshToonMaterial?(l(S,y),x(S,y)):y.isMeshPhongMaterial?(l(S,y),m(S,y),y.envMap&&(S.envMapIntensity.value=y.envMapIntensity)):y.isMeshStandardMaterial?(l(S,y),g(S,y),y.isMeshPhysicalMaterial&&M(S,y,C)):y.isMeshMatcapMaterial?(l(S,y),E(S,y)):y.isMeshDepthMaterial?l(S,y):y.isMeshDistanceMaterial?(l(S,y),w(S,y)):y.isMeshNormalMaterial?l(S,y):y.isLineBasicMaterial?(c(S,y),y.isLineDashedMaterial&&d(S,y)):y.isPointsMaterial?h(S,y,N,L):y.isSpriteMaterial?f(S,y):y.isShadowMaterial?(S.color.value.copy(y.color),S.opacity.value=y.opacity):y.isShaderMaterial&&(y.uniformsNeedUpdate=!1)}function l(S,y){S.opacity.value=y.opacity,y.color&&S.diffuse.value.copy(y.color),y.emissive&&S.emissive.value.copy(y.emissive).multiplyScalar(y.emissiveIntensity),y.map&&(S.map.value=y.map,t(y.map,S.mapTransform)),y.alphaMap&&(S.alphaMap.value=y.alphaMap,t(y.alphaMap,S.alphaMapTransform)),y.bumpMap&&(S.bumpMap.value=y.bumpMap,t(y.bumpMap,S.bumpMapTransform),S.bumpScale.value=y.bumpScale,y.side===hi&&(S.bumpScale.value*=-1)),y.normalMap&&(S.normalMap.value=y.normalMap,t(y.normalMap,S.normalMapTransform),S.normalScale.value.copy(y.normalScale),y.side===hi&&S.normalScale.value.negate()),y.displacementMap&&(S.displacementMap.value=y.displacementMap,t(y.displacementMap,S.displacementMapTransform),S.displacementScale.value=y.displacementScale,S.displacementBias.value=y.displacementBias),y.emissiveMap&&(S.emissiveMap.value=y.emissiveMap,t(y.emissiveMap,S.emissiveMapTransform)),y.specularMap&&(S.specularMap.value=y.specularMap,t(y.specularMap,S.specularMapTransform)),y.alphaTest>0&&(S.alphaTest.value=y.alphaTest);const N=e.get(y),L=N.envMap,C=N.envMapRotation;L&&(S.envMap.value=L,S.envMapRotation.value.setFromMatrix4(JP.makeRotationFromEuler(C)).transpose(),L.isCubeTexture&&L.isRenderTargetTexture===!1&&S.envMapRotation.value.premultiply(Uy),S.reflectivity.value=y.reflectivity,S.ior.value=y.ior,S.refractionRatio.value=y.refractionRatio),y.lightMap&&(S.lightMap.value=y.lightMap,S.lightMapIntensity.value=y.lightMapIntensity,t(y.lightMap,S.lightMapTransform)),y.aoMap&&(S.aoMap.value=y.aoMap,S.aoMapIntensity.value=y.aoMapIntensity,t(y.aoMap,S.aoMapTransform))}function c(S,y){S.diffuse.value.copy(y.color),S.opacity.value=y.opacity,y.map&&(S.map.value=y.map,t(y.map,S.mapTransform))}function d(S,y){S.dashSize.value=y.dashSize,S.totalSize.value=y.dashSize+y.gapSize,S.scale.value=y.scale}function h(S,y,N,L){S.diffuse.value.copy(y.color),S.opacity.value=y.opacity,S.size.value=y.size*N,S.scale.value=L*.5,y.map&&(S.map.value=y.map,t(y.map,S.uvTransform)),y.alphaMap&&(S.alphaMap.value=y.alphaMap,t(y.alphaMap,S.alphaMapTransform)),y.alphaTest>0&&(S.alphaTest.value=y.alphaTest)}function f(S,y){S.diffuse.value.copy(y.color),S.opacity.value=y.opacity,S.rotation.value=y.rotation,y.map&&(S.map.value=y.map,t(y.map,S.mapTransform)),y.alphaMap&&(S.alphaMap.value=y.alphaMap,t(y.alphaMap,S.alphaMapTransform)),y.alphaTest>0&&(S.alphaTest.value=y.alphaTest)}function m(S,y){S.specular.value.copy(y.specular),S.shininess.value=Math.max(y.shininess,1e-4)}function x(S,y){y.gradientMap&&(S.gradientMap.value=y.gradientMap)}function g(S,y){S.metalness.value=y.metalness,y.metalnessMap&&(S.metalnessMap.value=y.metalnessMap,t(y.metalnessMap,S.metalnessMapTransform)),S.roughness.value=y.roughness,y.roughnessMap&&(S.roughnessMap.value=y.roughnessMap,t(y.roughnessMap,S.roughnessMapTransform)),y.envMap&&(S.envMapIntensity.value=y.envMapIntensity)}function M(S,y,N){S.ior.value=y.ior,y.sheen>0&&(S.sheenColor.value.copy(y.sheenColor).multiplyScalar(y.sheen),S.sheenRoughness.value=y.sheenRoughness,y.sheenColorMap&&(S.sheenColorMap.value=y.sheenColorMap,t(y.sheenColorMap,S.sheenColorMapTransform)),y.sheenRoughnessMap&&(S.sheenRoughnessMap.value=y.sheenRoughnessMap,t(y.sheenRoughnessMap,S.sheenRoughnessMapTransform))),y.clearcoat>0&&(S.clearcoat.value=y.clearcoat,S.clearcoatRoughness.value=y.clearcoatRoughness,y.clearcoatMap&&(S.clearcoatMap.value=y.clearcoatMap,t(y.clearcoatMap,S.clearcoatMapTransform)),y.clearcoatRoughnessMap&&(S.clearcoatRoughnessMap.value=y.clearcoatRoughnessMap,t(y.clearcoatRoughnessMap,S.clearcoatRoughnessMapTransform)),y.clearcoatNormalMap&&(S.clearcoatNormalMap.value=y.clearcoatNormalMap,t(y.clearcoatNormalMap,S.clearcoatNormalMapTransform),S.clearcoatNormalScale.value.copy(y.clearcoatNormalScale),y.side===hi&&S.clearcoatNormalScale.value.negate())),y.dispersion>0&&(S.dispersion.value=y.dispersion),y.iridescence>0&&(S.iridescence.value=y.iridescence,S.iridescenceIOR.value=y.iridescenceIOR,S.iridescenceThicknessMinimum.value=y.iridescenceThicknessRange[0],S.iridescenceThicknessMaximum.value=y.iridescenceThicknessRange[1],y.iridescenceMap&&(S.iridescenceMap.value=y.iridescenceMap,t(y.iridescenceMap,S.iridescenceMapTransform)),y.iridescenceThicknessMap&&(S.iridescenceThicknessMap.value=y.iridescenceThicknessMap,t(y.iridescenceThicknessMap,S.iridescenceThicknessMapTransform))),y.transmission>0&&(S.transmission.value=y.transmission,S.transmissionSamplerMap.value=N.texture,S.transmissionSamplerSize.value.set(N.width,N.height),y.transmissionMap&&(S.transmissionMap.value=y.transmissionMap,t(y.transmissionMap,S.transmissionMapTransform)),S.thickness.value=y.thickness,y.thicknessMap&&(S.thicknessMap.value=y.thicknessMap,t(y.thicknessMap,S.thicknessMapTransform)),S.attenuationDistance.value=y.attenuationDistance,S.attenuationColor.value.copy(y.attenuationColor)),y.anisotropy>0&&(S.anisotropyVector.value.set(y.anisotropy*Math.cos(y.anisotropyRotation),y.anisotropy*Math.sin(y.anisotropyRotation)),y.anisotropyMap&&(S.anisotropyMap.value=y.anisotropyMap,t(y.anisotropyMap,S.anisotropyMapTransform))),S.specularIntensity.value=y.specularIntensity,S.specularColor.value.copy(y.specularColor),y.specularColorMap&&(S.specularColorMap.value=y.specularColorMap,t(y.specularColorMap,S.specularColorMapTransform)),y.specularIntensityMap&&(S.specularIntensityMap.value=y.specularIntensityMap,t(y.specularIntensityMap,S.specularIntensityMapTransform))}function E(S,y){y.matcap&&(S.matcap.value=y.matcap)}function w(S,y){const N=e.get(y).light;S.referencePosition.value.setFromMatrixPosition(N.matrixWorld),S.nearDistance.value=N.shadow.camera.near,S.farDistance.value=N.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:a}}function t2(i,e,t,r){let a={},l={},c=[];const d=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function h(C,D){const P=D.program;r.uniformBlockBinding(C,P)}function f(C,D){let P=a[C.id];P===void 0&&(S(C),P=m(C),a[C.id]=P,C.addEventListener("dispose",N));const U=D.program;r.updateUBOMapping(C,U);const b=e.render.frame;l[C.id]!==b&&(g(C),l[C.id]=b)}function m(C){const D=x();C.__bindingPointIndex=D;const P=i.createBuffer(),U=C.__size,b=C.usage;return i.bindBuffer(i.UNIFORM_BUFFER,P),i.bufferData(i.UNIFORM_BUFFER,U,b),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,D,P),P}function x(){for(let C=0;C<d;C++)if(c.indexOf(C)===-1)return c.push(C),C;return Dt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function g(C){const D=a[C.id],P=C.uniforms,U=C.__cache;i.bindBuffer(i.UNIFORM_BUFFER,D);for(let b=0,I=P.length;b<I;b++){const X=P[b];if(Array.isArray(X))for(let O=0,K=X.length;O<K;O++)M(X[O],b,O,U);else M(X,b,0,U)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function M(C,D,P,U){if(w(C,D,P,U)===!0){const b=C.__offset,I=C.value;if(Array.isArray(I)){let X=0;for(let O=0;O<I.length;O++){const K=I[O],se=y(K);E(K,C.__data,X),typeof K!="number"&&typeof K!="boolean"&&!K.isMatrix3&&!ArrayBuffer.isView(K)&&(X+=se.storage/Float32Array.BYTES_PER_ELEMENT)}}else E(I,C.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,b,C.__data)}}function E(C,D,P){typeof C=="number"||typeof C=="boolean"?D[0]=C:C.isMatrix3?(D[0]=C.elements[0],D[1]=C.elements[1],D[2]=C.elements[2],D[3]=0,D[4]=C.elements[3],D[5]=C.elements[4],D[6]=C.elements[5],D[7]=0,D[8]=C.elements[6],D[9]=C.elements[7],D[10]=C.elements[8],D[11]=0):ArrayBuffer.isView(C)?D.set(new C.constructor(C.buffer,C.byteOffset,D.length)):C.toArray(D,P)}function w(C,D,P,U){const b=C.value,I=D+"_"+P;if(U[I]===void 0)return typeof b=="number"||typeof b=="boolean"?U[I]=b:ArrayBuffer.isView(b)?U[I]=b.slice():U[I]=b.clone(),!0;{const X=U[I];if(typeof b=="number"||typeof b=="boolean"){if(X!==b)return U[I]=b,!0}else{if(ArrayBuffer.isView(b))return!0;if(X.equals(b)===!1)return X.copy(b),!0}}return!1}function S(C){const D=C.uniforms;let P=0;const U=16;for(let I=0,X=D.length;I<X;I++){const O=Array.isArray(D[I])?D[I]:[D[I]];for(let K=0,se=O.length;K<se;K++){const fe=O[K],Y=Array.isArray(fe.value)?fe.value:[fe.value];for(let me=0,B=Y.length;me<B;me++){const $=Y[me],ne=y($),ce=P%U,H=ce%ne.boundary,F=ce+H;P+=H,F!==0&&U-F<ne.storage&&(P+=U-F),fe.__data=new Float32Array(ne.storage/Float32Array.BYTES_PER_ELEMENT),fe.__offset=P,P+=ne.storage}}}const b=P%U;return b>0&&(P+=U-b),C.__size=P,C.__cache={},this}function y(C){const D={boundary:0,storage:0};return typeof C=="number"||typeof C=="boolean"?(D.boundary=4,D.storage=4):C.isVector2?(D.boundary=8,D.storage=8):C.isVector3||C.isColor?(D.boundary=16,D.storage=12):C.isVector4?(D.boundary=16,D.storage=16):C.isMatrix3?(D.boundary=48,D.storage=48):C.isMatrix4?(D.boundary=64,D.storage=64):C.isTexture?lt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(C)?(D.boundary=16,D.storage=C.byteLength):lt("WebGLRenderer: Unsupported uniform value type.",C),D}function N(C){const D=C.target;D.removeEventListener("dispose",N);const P=c.indexOf(D.__bindingPointIndex);c.splice(P,1),i.deleteBuffer(a[D.id]),delete a[D.id],delete l[D.id]}function L(){for(const C in a)i.deleteBuffer(a[C]);c=[],a={},l={}}return{bind:h,update:f,dispose:L}}const n2=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let or=null;function i2(){return or===null&&(or=new Fb(n2,16,16,ba,qr),or.name="DFG_LUT",or.minFilter=Wn,or.magFilter=Wn,or.wrapS=Gr,or.wrapT=Gr,or.generateMipmaps=!1,or.needsUpdate=!0),or}class r2{constructor(e={}){const{canvas:t=hb(),context:r=null,depth:a=!0,stencil:l=!1,alpha:c=!1,antialias:d=!1,premultipliedAlpha:h=!0,preserveDrawingBuffer:f=!1,powerPreference:m="default",failIfMajorPerformanceCaveat:x=!1,reversedDepthBuffer:g=!1,outputBufferType:M=Si}=e;this.isWebGLRenderer=!0;let E;if(r!==null){if(typeof WebGLRenderingContext<"u"&&r instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");E=r.getContextAttributes().alpha}else E=c;const w=M,S=new Set([Om,Fm,Um]),y=new Set([Si,yr,Xl,$l,Dm,Im]),N=new Uint32Array(4),L=new Int32Array(4),C=new te;let D=null,P=null;const U=[],b=[];let I=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=xr,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const X=this;let O=!1,K=null,se=null,fe=null,Y=null;this._outputColorSpace=Jn;let me=0,B=0,$=null,ne=-1,ce=null;const H=new un,F=new un;let Te=null;const Oe=new xt(0);let ze=0,ie=t.width,Me=t.height,xe=1,Fe=null,Xe=null;const Qe=new un(0,0,ie,Me),It=new un(0,0,ie,Me);let dt=!1;const wt=new Hm;let St=!1,vt=!1;const Ut=new an,qt=new te,Xt=new un,$t={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Nt=!1;function Ht(){return $===null?xe:1}let Z=r;function pn(A,J){return t.getContext(A,J)}try{const A={alpha:!0,depth:a,stencil:l,antialias:d,premultipliedAlpha:h,preserveDrawingBuffer:f,powerPreference:m,failIfMajorPerformanceCaveat:x};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Am}`),t.addEventListener("webglcontextlost",Ot,!1),t.addEventListener("webglcontextrestored",kt,!1),t.addEventListener("webglcontextcreationerror",On,!1),Z===null){const J="webgl2";if(Z=pn(J,A),Z===null)throw pn(J)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(A){throw Dt("WebGLRenderer: "+A.message),A}let mt,k,T,ee,oe,z,ye,Le,ge,ve,Re,qe,Ue,Pe,et,it,de,j,be,_e,Ie,ke,Se;function Ye(){mt=new iA(Z),mt.init(),Ie=new qP(Z,mt),k=new YR(Z,mt,e,Ie),T=new XP(Z,mt),k.reversedDepthBuffer&&g&&T.buffers.depth.setReversed(!0),se=Z.createFramebuffer(),fe=Z.createFramebuffer(),Y=Z.createFramebuffer(),ee=new aA(Z),oe=new LP,z=new $P(Z,mt,T,oe,k,Ie,ee),ye=new nA(X),Le=new uT(Z),ke=new $R(Z,Le),ge=new rA(Z,Le,ee,ke),ve=new lA(Z,ge,Le,ke,ee),j=new oA(Z,k,z),et=new KR(oe),Re=new NP(X,ye,mt,k,ke,et),qe=new e2(X,oe),Ue=new IP,Pe=new BP(mt),de=new XR(X,ye,T,ve,E,h),it=new WP(X,ve,k),Se=new t2(Z,ee,k,T),be=new qR(Z,mt,ee),_e=new sA(Z,mt,ee),ee.programs=Re.programs,X.capabilities=k,X.extensions=mt,X.properties=oe,X.renderLists=Ue,X.shadowMap=it,X.state=T,X.info=ee}Ye(),w!==Si&&(I=new uA(w,t.width,t.height,d,a,l));const We=new ZP(X,Z);this.xr=We,this.getContext=function(){return Z},this.getContextAttributes=function(){return Z.getContextAttributes()},this.forceContextLoss=function(){const A=mt.get("WEBGL_lose_context");A&&A.loseContext()},this.forceContextRestore=function(){const A=mt.get("WEBGL_lose_context");A&&A.restoreContext()},this.getPixelRatio=function(){return xe},this.setPixelRatio=function(A){A!==void 0&&(xe=A,this.setSize(ie,Me,!1))},this.getSize=function(A){return A.set(ie,Me)},this.setSize=function(A,J,he=!0){if(We.isPresenting){lt("WebGLRenderer: Can't change size while VR device is presenting.");return}ie=A,Me=J,t.width=Math.floor(A*xe),t.height=Math.floor(J*xe),he===!0&&(t.style.width=A+"px",t.style.height=J+"px"),I!==null&&I.setSize(t.width,t.height),this.setViewport(0,0,A,J)},this.getDrawingBufferSize=function(A){return A.set(ie*xe,Me*xe).floor()},this.setDrawingBufferSize=function(A,J,he){ie=A,Me=J,xe=he,t.width=Math.floor(A*he),t.height=Math.floor(J*he),this.setViewport(0,0,A,J)},this.setEffects=function(A){if(w===Si){Dt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(A){for(let J=0;J<A.length;J++)if(A[J].isOutputPass===!0){lt("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}I.setEffects(A||[])},this.getCurrentViewport=function(A){return A.copy(H)},this.getViewport=function(A){return A.copy(Qe)},this.setViewport=function(A,J,he,le){A.isVector4?Qe.set(A.x,A.y,A.z,A.w):Qe.set(A,J,he,le),T.viewport(H.copy(Qe).multiplyScalar(xe).round())},this.getScissor=function(A){return A.copy(It)},this.setScissor=function(A,J,he,le){A.isVector4?It.set(A.x,A.y,A.z,A.w):It.set(A,J,he,le),T.scissor(F.copy(It).multiplyScalar(xe).round())},this.getScissorTest=function(){return dt},this.setScissorTest=function(A){T.setScissorTest(dt=A)},this.setOpaqueSort=function(A){Fe=A},this.setTransparentSort=function(A){Xe=A},this.getClearColor=function(A){return A.copy(de.getClearColor())},this.setClearColor=function(){de.setClearColor(...arguments)},this.getClearAlpha=function(){return de.getClearAlpha()},this.setClearAlpha=function(){de.setClearAlpha(...arguments)},this.clear=function(A=!0,J=!0,he=!0){let le=0;if(A){let ae=!1;if($!==null){const De=$.texture.format;ae=S.has(De)}if(ae){const De=$.texture.type,je=y.has(De),Ne=de.getClearColor(),Ze=de.getClearAlpha(),rt=Ne.r,ht=Ne.g,ft=Ne.b;je?(N[0]=rt,N[1]=ht,N[2]=ft,N[3]=Ze,Z.clearBufferuiv(Z.COLOR,0,N)):(L[0]=rt,L[1]=ht,L[2]=ft,L[3]=Ze,Z.clearBufferiv(Z.COLOR,0,L))}else le|=Z.COLOR_BUFFER_BIT}J&&(le|=Z.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),he&&(le|=Z.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),le!==0&&Z.clear(le)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(A){A.setRenderer(this),K=A},this.dispose=function(){t.removeEventListener("webglcontextlost",Ot,!1),t.removeEventListener("webglcontextrestored",kt,!1),t.removeEventListener("webglcontextcreationerror",On,!1),de.dispose(),Ue.dispose(),Pe.dispose(),oe.dispose(),ye.dispose(),ve.dispose(),ke.dispose(),Se.dispose(),Re.dispose(),We.dispose(),We.removeEventListener("sessionstart",oc),We.removeEventListener("sessionend",lc),$n.stop()};function Ot(A){A.preventDefault(),Jx("WebGLRenderer: Context Lost."),O=!0}function kt(){Jx("WebGLRenderer: Context Restored."),O=!1;const A=ee.autoReset,J=it.enabled,he=it.autoUpdate,le=it.needsUpdate,ae=it.type;Ye(),ee.autoReset=A,it.enabled=J,it.autoUpdate=he,it.needsUpdate=le,it.type=ae}function On(A){Dt("WebGLRenderer: A WebGL context could not be created. Reason: ",A.statusMessage)}function wi(A){const J=A.target;J.removeEventListener("dispose",wi),zs(J)}function zs(A){Ca(A),oe.remove(A)}function Ca(A){const J=oe.get(A).programs;J!==void 0&&(J.forEach(function(he){Re.releaseProgram(he)}),A.isShaderMaterial&&Re.releaseShaderCache(A))}this.renderBufferDirect=function(A,J,he,le,ae,De){J===null&&(J=$t);const je=ae.isMesh&&ae.matrixWorld.determinantAffine()<0,Ne=on(A,J,he,le,ae);T.setMaterial(le,je);let Ze=he.index,rt=1;if(le.wireframe===!0){if(Ze=ge.getWireframeAttribute(he),Ze===void 0)return;rt=2}const ht=he.drawRange,ft=he.attributes.position;let tt=ht.start*rt,Pt=(ht.start+ht.count)*rt;De!==null&&(tt=Math.max(tt,De.start*rt),Pt=Math.min(Pt,(De.start+De.count)*rt)),Ze!==null?(tt=Math.max(tt,0),Pt=Math.min(Pt,Ze.count)):ft!=null&&(tt=Math.max(tt,0),Pt=Math.min(Pt,ft.count));const Yt=Pt-tt;if(Yt<0||Yt===1/0)return;ke.setup(ae,le,Ne,he,Ze);let nn,Vt=be;if(Ze!==null&&(nn=Le.get(Ze),Vt=_e,Vt.setIndex(nn)),ae.isMesh)le.wireframe===!0?(T.setLineWidth(le.wireframeLinewidth*Ht()),Vt.setMode(Z.LINES)):Vt.setMode(Z.TRIANGLES);else if(ae.isLine){let gn=le.linewidth;gn===void 0&&(gn=1),T.setLineWidth(gn*Ht()),ae.isLineSegments?Vt.setMode(Z.LINES):ae.isLineLoop?Vt.setMode(Z.LINE_LOOP):Vt.setMode(Z.LINE_STRIP)}else ae.isPoints?Vt.setMode(Z.POINTS):ae.isSprite&&Vt.setMode(Z.TRIANGLES);if(ae.isBatchedMesh)if(mt.get("WEBGL_multi_draw"))Vt.renderMultiDraw(ae._multiDrawStarts,ae._multiDrawCounts,ae._multiDrawCount);else{const gn=ae._multiDrawStarts,Ve=ae._multiDrawCounts,Ln=ae._multiDrawCount,yt=Ze?Le.get(Ze).bytesPerElement:1,ei=oe.get(le).currentProgram.getUniforms();for(let ti=0;ti<Ln;ti++)ei.setValue(Z,"_gl_DrawID",ti),Vt.render(gn[ti]/yt,Ve[ti])}else if(ae.isInstancedMesh)Vt.renderInstances(tt,Yt,ae.count);else if(he.isInstancedBufferGeometry){const gn=he._maxInstanceCount!==void 0?he._maxInstanceCount:1/0,Ve=Math.min(he.instanceCount,gn);Vt.renderInstances(tt,Yt,Ve)}else Vt.render(tt,Yt)};function Bs(A,J,he){A.transparent===!0&&A.side===pr&&A.forceSinglePass===!1?(A.side=hi,A.needsUpdate=!0,Gs(A,J,he),A.side=Fs,A.needsUpdate=!0,Gs(A,J,he),A.side=pr):Gs(A,J,he)}this.compile=function(A,J,he=null){he===null&&(he=A),P=Pe.get(he),P.init(J),b.push(P),he.traverseVisible(function(ae){ae.isLight&&ae.layers.test(J.layers)&&(P.pushLight(ae),ae.castShadow&&P.pushShadow(ae))}),A!==he&&A.traverseVisible(function(ae){ae.isLight&&ae.layers.test(J.layers)&&(P.pushLight(ae),ae.castShadow&&P.pushShadow(ae))}),P.setupLights();const le=new Set;return A.traverse(function(ae){if(!(ae.isMesh||ae.isPoints||ae.isLine||ae.isSprite))return;const De=ae.material;if(De)if(Array.isArray(De))for(let je=0;je<De.length;je++){const Ne=De[je];Bs(Ne,he,ae),le.add(Ne)}else Bs(De,he,ae),le.add(De)}),P=b.pop(),le},this.compileAsync=function(A,J,he=null){const le=this.compile(A,J,he);return new Promise(ae=>{function De(){if(le.forEach(function(je){oe.get(je).currentProgram.isReady()&&le.delete(je)}),le.size===0){ae(A);return}setTimeout(De,10)}mt.get("KHR_parallel_shader_compile")!==null?De():setTimeout(De,10)})};let Hs=null;function wd(A){Hs&&Hs(A)}function oc(){$n.stop()}function lc(){$n.start()}const $n=new Ry;$n.setAnimationLoop(wd),typeof self<"u"&&$n.setContext(self),this.setAnimationLoop=function(A){Hs=A,We.setAnimationLoop(A),A===null?$n.stop():$n.start()},We.addEventListener("sessionstart",oc),We.addEventListener("sessionend",lc),this.render=function(A,J){if(J!==void 0&&J.isCamera!==!0){Dt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(O===!0)return;K!==null&&K.renderStart(A,J);const he=We.enabled===!0&&We.isPresenting===!0,le=I!==null&&($===null||he)&&I.begin(X,$);if(A.matrixWorldAutoUpdate===!0&&A.updateMatrixWorld(),J.parent===null&&J.matrixWorldAutoUpdate===!0&&J.updateMatrixWorld(),We.enabled===!0&&We.isPresenting===!0&&(I===null||I.isCompositing()===!1)&&(We.cameraAutoUpdate===!0&&We.updateCamera(J),J=We.getCamera()),A.isScene===!0&&A.onBeforeRender(X,A,J,$),P=Pe.get(A,b.length),P.init(J),P.state.textureUnits=z.getTextureUnits(),b.push(P),Ut.multiplyMatrices(J.projectionMatrix,J.matrixWorldInverse),wt.setFromProjectionMatrix(Ut,gr,J.reversedDepth),vt=this.localClippingEnabled,St=et.init(this.clippingPlanes,vt),D=Ue.get(A,U.length),D.init(),U.push(D),We.enabled===!0&&We.isPresenting===!0){const je=X.xr.getDepthSensingMesh();je!==null&&Ra(je,J,-1/0,X.sortObjects)}Ra(A,J,0,X.sortObjects),D.finish(),X.sortObjects===!0&&D.sort(Fe,Xe,J.reversedDepth),Nt=We.enabled===!1||We.isPresenting===!1||We.hasDepthSensing()===!1,Nt&&de.addToRenderList(D,A),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),St===!0&&et.beginShadows();const ae=P.state.shadowsArray;if(it.render(ae,A,J),St===!0&&et.endShadows(),(le&&I.hasRenderPass())===!1){const je=D.opaque,Ne=D.transmissive;if(P.setupLights(),J.isArrayCamera){const Ze=J.cameras;if(Ne.length>0)for(let rt=0,ht=Ze.length;rt<ht;rt++){const ft=Ze[rt];cc(je,Ne,A,ft)}Nt&&de.render(A);for(let rt=0,ht=Ze.length;rt<ht;rt++){const ft=Ze[rt];Go(D,A,ft,ft.viewport)}}else Ne.length>0&&cc(je,Ne,A,J),Nt&&de.render(A),Go(D,A,J)}$!==null&&B===0&&(z.updateMultisampleRenderTarget($),z.updateRenderTargetMipmap($)),le&&I.end(X),A.isScene===!0&&A.onAfterRender(X,A,J),ke.resetDefaultState(),ne=-1,ce=null,b.pop(),b.length>0?(P=b[b.length-1],z.setTextureUnits(P.state.textureUnits),St===!0&&et.setGlobalState(X.clippingPlanes,P.state.camera)):P=null,U.pop(),U.length>0?D=U[U.length-1]:D=null,K!==null&&K.renderEnd()};function Ra(A,J,he,le){if(A.visible===!1)return;if(A.layers.test(J.layers)){if(A.isGroup)he=A.renderOrder;else if(A.isLOD)A.autoUpdate===!0&&A.update(J);else if(A.isLightProbeGrid)P.pushLightProbeGrid(A);else if(A.isLight)P.pushLight(A),A.castShadow&&P.pushShadow(A);else if(A.isSprite){if(!A.frustumCulled||wt.intersectsSprite(A)){le&&Xt.setFromMatrixPosition(A.matrixWorld).applyMatrix4(Ut);const je=ve.update(A),Ne=A.material;Ne.visible&&D.push(A,je,Ne,he,Xt.z,null)}}else if((A.isMesh||A.isLine||A.isPoints)&&(!A.frustumCulled||wt.intersectsObject(A))){const je=ve.update(A),Ne=A.material;if(le&&(A.boundingSphere!==void 0?(A.boundingSphere===null&&A.computeBoundingSphere(),Xt.copy(A.boundingSphere.center)):(je.boundingSphere===null&&je.computeBoundingSphere(),Xt.copy(je.boundingSphere.center)),Xt.applyMatrix4(A.matrixWorld).applyMatrix4(Ut)),Array.isArray(Ne)){const Ze=je.groups;for(let rt=0,ht=Ze.length;rt<ht;rt++){const ft=Ze[rt],tt=Ne[ft.materialIndex];tt&&tt.visible&&D.push(A,je,tt,he,Xt.z,ft)}}else Ne.visible&&D.push(A,je,Ne,he,Xt.z,null)}}const De=A.children;for(let je=0,Ne=De.length;je<Ne;je++)Ra(De[je],J,he,le)}function Go(A,J,he,le){const{opaque:ae,transmissive:De,transparent:je}=A;P.setupLightsView(he),St===!0&&et.setGlobalState(X.clippingPlanes,he),le&&T.viewport(H.copy(le)),ae.length>0&&Vs(ae,J,he),De.length>0&&Vs(De,J,he),je.length>0&&Vs(je,J,he),T.buffers.depth.setTest(!0),T.buffers.depth.setMask(!0),T.buffers.color.setMask(!0),T.setPolygonOffset(!1)}function cc(A,J,he,le){if((he.isScene===!0?he.overrideMaterial:null)!==null)return;if(P.state.transmissionRenderTarget[le.id]===void 0){const tt=mt.has("EXT_color_buffer_half_float")||mt.has("EXT_color_buffer_float");P.state.transmissionRenderTarget[le.id]=new vr(1,1,{generateMipmaps:!0,type:tt?qr:Si,minFilter:da,samples:Math.max(4,k.samples),stencilBuffer:l,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:At.workingColorSpace})}const De=P.state.transmissionRenderTarget[le.id],je=le.viewport||H;De.setSize(je.z*X.transmissionResolutionScale,je.w*X.transmissionResolutionScale);const Ne=X.getRenderTarget(),Ze=X.getActiveCubeFace(),rt=X.getActiveMipmapLevel();X.setRenderTarget(De),X.getClearColor(Oe),ze=X.getClearAlpha(),ze<1&&X.setClearColor(16777215,.5),X.clear(),Nt&&de.render(he);const ht=X.toneMapping;X.toneMapping=xr;const ft=le.viewport;if(le.viewport!==void 0&&(le.viewport=void 0),P.setupLightsView(le),St===!0&&et.setGlobalState(X.clippingPlanes,le),Vs(A,he,le),z.updateMultisampleRenderTarget(De),z.updateRenderTargetMipmap(De),mt.has("WEBGL_multisampled_render_to_texture")===!1){let tt=!1;for(let Pt=0,Yt=J.length;Pt<Yt;Pt++){const nn=J[Pt],{object:Vt,geometry:gn,material:Ve,group:Ln}=nn;if(Ve.side===pr&&Vt.layers.test(le.layers)){const yt=Ve.side;Ve.side=hi,Ve.needsUpdate=!0,jo(Vt,he,le,gn,Ve,Ln),Ve.side=yt,Ve.needsUpdate=!0,tt=!0}}tt===!0&&(z.updateMultisampleRenderTarget(De),z.updateRenderTargetMipmap(De))}X.setRenderTarget(Ne,Ze,rt),X.setClearColor(Oe,ze),ft!==void 0&&(le.viewport=ft),X.toneMapping=ht}function Vs(A,J,he){const le=J.isScene===!0?J.overrideMaterial:null;for(let ae=0,De=A.length;ae<De;ae++){const je=A[ae],{object:Ne,geometry:Ze,group:rt}=je;let ht=je.material;ht.allowOverride===!0&&le!==null&&(ht=le),Ne.layers.test(he.layers)&&jo(Ne,J,he,Ze,ht,rt)}}function jo(A,J,he,le,ae,De){A.onBeforeRender(X,J,he,le,ae,De),A.modelViewMatrix.multiplyMatrices(he.matrixWorldInverse,A.matrixWorld),A.normalMatrix.getNormalMatrix(A.modelViewMatrix),ae.onBeforeRender(X,J,he,le,A,De),ae.transparent===!0&&ae.side===pr&&ae.forceSinglePass===!1?(ae.side=hi,ae.needsUpdate=!0,X.renderBufferDirect(he,J,le,ae,A,De),ae.side=Fs,ae.needsUpdate=!0,X.renderBufferDirect(he,J,le,ae,A,De),ae.side=pr):X.renderBufferDirect(he,J,le,ae,A,De),A.onAfterRender(X,J,he,le,ae,De)}function Gs(A,J,he){J.isScene!==!0&&(J=$t);const le=oe.get(A),ae=P.state.lights,De=P.state.shadowsArray,je=ae.state.version,Ne=Re.getParameters(A,ae.state,De,J,he,P.state.lightProbeGridArray),Ze=Re.getProgramCacheKey(Ne);let rt=le.programs;le.environment=A.isMeshStandardMaterial||A.isMeshLambertMaterial||A.isMeshPhongMaterial?J.environment:null,le.fog=J.fog;const ht=A.isMeshStandardMaterial||A.isMeshLambertMaterial&&!A.envMap||A.isMeshPhongMaterial&&!A.envMap;le.envMap=ye.get(A.envMap||le.environment,ht),le.envMapRotation=le.environment!==null&&A.envMap===null?J.environmentRotation:A.envMapRotation,rt===void 0&&(A.addEventListener("dispose",wi),rt=new Map,le.programs=rt);let ft=rt.get(Ze);if(ft!==void 0){if(le.currentProgram===ft&&le.lightsStateVersion===je)return uc(A,Ne),ft}else Ne.uniforms=Re.getUniforms(A),K!==null&&A.isNodeMaterial&&K.build(A,he,Ne),A.onBeforeCompile(Ne,X),ft=Re.acquireProgram(Ne,Ze),rt.set(Ze,ft),le.uniforms=Ne.uniforms;const tt=le.uniforms;return(!A.isShaderMaterial&&!A.isRawShaderMaterial||A.clipping===!0)&&(tt.clippingPlanes=et.uniform),uc(A,Ne),le.needsLights=Xo(A),le.lightsStateVersion=je,le.needsLights&&(tt.ambientLightColor.value=ae.state.ambient,tt.lightProbe.value=ae.state.probe,tt.directionalLights.value=ae.state.directional,tt.directionalLightShadows.value=ae.state.directionalShadow,tt.spotLights.value=ae.state.spot,tt.spotLightShadows.value=ae.state.spotShadow,tt.rectAreaLights.value=ae.state.rectArea,tt.ltc_1.value=ae.state.rectAreaLTC1,tt.ltc_2.value=ae.state.rectAreaLTC2,tt.pointLights.value=ae.state.point,tt.pointLightShadows.value=ae.state.pointShadow,tt.hemisphereLights.value=ae.state.hemi,tt.directionalShadowMatrix.value=ae.state.directionalShadowMatrix,tt.spotLightMatrix.value=ae.state.spotLightMatrix,tt.spotLightMap.value=ae.state.spotLightMap,tt.pointShadowMatrix.value=ae.state.pointShadowMatrix),le.lightProbeGrid=P.state.lightProbeGridArray.length>0,le.currentProgram=ft,le.uniformsList=null,ft}function Wo(A){if(A.uniformsList===null){const J=A.currentProgram.getUniforms();A.uniformsList=ed.seqWithValue(J.seq,A.uniforms)}return A.uniformsList}function uc(A,J){const he=oe.get(A);he.outputColorSpace=J.outputColorSpace,he.batching=J.batching,he.batchingColor=J.batchingColor,he.instancing=J.instancing,he.instancingColor=J.instancingColor,he.instancingMorph=J.instancingMorph,he.skinning=J.skinning,he.morphTargets=J.morphTargets,he.morphNormals=J.morphNormals,he.morphColors=J.morphColors,he.morphTargetsCount=J.morphTargetsCount,he.numClippingPlanes=J.numClippingPlanes,he.numIntersection=J.numClipIntersection,he.vertexAlphas=J.vertexAlphas,he.vertexTangents=J.vertexTangents,he.toneMapping=J.toneMapping}function bd(A,J){if(A.length===0)return null;if(A.length===1)return A[0].texture!==null?A[0]:null;C.setFromMatrixPosition(J.matrixWorld);for(let he=0,le=A.length;he<le;he++){const ae=A[he];if(ae.texture!==null&&ae.boundingBox.containsPoint(C))return ae}return null}function on(A,J,he,le,ae){J.isScene!==!0&&(J=$t),z.resetTextureUnits();const De=J.fog,je=le.isMeshStandardMaterial||le.isMeshLambertMaterial||le.isMeshPhongMaterial?J.environment:null,Ne=$===null?X.outputColorSpace:$.isXRRenderTarget===!0?$.texture.colorSpace:At.workingColorSpace,Ze=le.isMeshStandardMaterial||le.isMeshLambertMaterial&&!le.envMap||le.isMeshPhongMaterial&&!le.envMap,rt=ye.get(le.envMap||je,Ze),ht=le.vertexColors===!0&&!!he.attributes.color&&he.attributes.color.itemSize===4,ft=!!he.attributes.tangent&&(!!le.normalMap||le.anisotropy>0),tt=!!he.morphAttributes.position,Pt=!!he.morphAttributes.normal,Yt=!!he.morphAttributes.color;let nn=xr;le.toneMapped&&($===null||$.isXRRenderTarget===!0)&&(nn=X.toneMapping);const Vt=he.morphAttributes.position||he.morphAttributes.normal||he.morphAttributes.color,gn=Vt!==void 0?Vt.length:0,Ve=oe.get(le),Ln=P.state.lights;if(St===!0&&(vt===!0||A!==ce)){const Gt=A===ce&&le.id===ne;et.setState(le,A,Gt)}let yt=!1;le.version===Ve.__version?(Ve.needsLights&&Ve.lightsStateVersion!==Ln.state.version||Ve.outputColorSpace!==Ne||ae.isBatchedMesh&&Ve.batching===!1||!ae.isBatchedMesh&&Ve.batching===!0||ae.isBatchedMesh&&Ve.batchingColor===!0&&ae.colorTexture===null||ae.isBatchedMesh&&Ve.batchingColor===!1&&ae.colorTexture!==null||ae.isInstancedMesh&&Ve.instancing===!1||!ae.isInstancedMesh&&Ve.instancing===!0||ae.isSkinnedMesh&&Ve.skinning===!1||!ae.isSkinnedMesh&&Ve.skinning===!0||ae.isInstancedMesh&&Ve.instancingColor===!0&&ae.instanceColor===null||ae.isInstancedMesh&&Ve.instancingColor===!1&&ae.instanceColor!==null||ae.isInstancedMesh&&Ve.instancingMorph===!0&&ae.morphTexture===null||ae.isInstancedMesh&&Ve.instancingMorph===!1&&ae.morphTexture!==null||Ve.envMap!==rt||le.fog===!0&&Ve.fog!==De||Ve.numClippingPlanes!==void 0&&(Ve.numClippingPlanes!==et.numPlanes||Ve.numIntersection!==et.numIntersection)||Ve.vertexAlphas!==ht||Ve.vertexTangents!==ft||Ve.morphTargets!==tt||Ve.morphNormals!==Pt||Ve.morphColors!==Yt||Ve.toneMapping!==nn||Ve.morphTargetsCount!==gn||!!Ve.lightProbeGrid!=P.state.lightProbeGridArray.length>0)&&(yt=!0):(yt=!0,Ve.__version=le.version);let ei=Ve.currentProgram;yt===!0&&(ei=Gs(le,J,ae),K&&le.isNodeMaterial&&K.onUpdateProgram(le,ei,Ve));let ti=!1,Mt=!1,Er=!1;const zt=ei.getUniforms(),Zt=Ve.uniforms;if(T.useProgram(ei.program)&&(ti=!0,Mt=!0,Er=!0),le.id!==ne&&(ne=le.id,Mt=!0),Ve.needsLights){const Gt=bd(P.state.lightProbeGridArray,ae);Ve.lightProbeGrid!==Gt&&(Ve.lightProbeGrid=Gt,Mt=!0)}if(ti||ce!==A){T.buffers.depth.getReversed()&&A.reversedDepth!==!0&&(A._reversedDepth=!0,A.updateProjectionMatrix()),zt.setValue(Z,"projectionMatrix",A.projectionMatrix),zt.setValue(Z,"viewMatrix",A.matrixWorldInverse);const Oi=zt.map.cameraPosition;Oi!==void 0&&Oi.setValue(Z,qt.setFromMatrixPosition(A.matrixWorld)),k.logarithmicDepthBuffer&&zt.setValue(Z,"logDepthBufFC",2/(Math.log(A.far+1)/Math.LN2)),(le.isMeshPhongMaterial||le.isMeshToonMaterial||le.isMeshLambertMaterial||le.isMeshBasicMaterial||le.isMeshStandardMaterial||le.isShaderMaterial)&&zt.setValue(Z,"isOrthographic",A.isOrthographicCamera===!0),ce!==A&&(ce=A,Mt=!0,Er=!0)}if(Ve.needsLights&&(Ln.state.directionalShadowMap.length>0&&zt.setValue(Z,"directionalShadowMap",Ln.state.directionalShadowMap,z),Ln.state.spotShadowMap.length>0&&zt.setValue(Z,"spotShadowMap",Ln.state.spotShadowMap,z),Ln.state.pointShadowMap.length>0&&zt.setValue(Z,"pointShadowMap",Ln.state.pointShadowMap,z)),ae.isSkinnedMesh){zt.setOptional(Z,ae,"bindMatrix"),zt.setOptional(Z,ae,"bindMatrixInverse");const Gt=ae.skeleton;Gt&&(Gt.boneTexture===null&&Gt.computeBoneTexture(),zt.setValue(Z,"boneTexture",Gt.boneTexture,z))}ae.isBatchedMesh&&(zt.setOptional(Z,ae,"batchingTexture"),zt.setValue(Z,"batchingTexture",ae._matricesTexture,z),zt.setOptional(Z,ae,"batchingIdTexture"),zt.setValue(Z,"batchingIdTexture",ae._indirectTexture,z),zt.setOptional(Z,ae,"batchingColorTexture"),ae._colorsTexture!==null&&zt.setValue(Z,"batchingColorTexture",ae._colorsTexture,z));const Fi=he.morphAttributes;if((Fi.position!==void 0||Fi.normal!==void 0||Fi.color!==void 0)&&j.update(ae,he,ei),(Mt||Ve.receiveShadow!==ae.receiveShadow)&&(Ve.receiveShadow=ae.receiveShadow,zt.setValue(Z,"receiveShadow",ae.receiveShadow)),(le.isMeshStandardMaterial||le.isMeshLambertMaterial||le.isMeshPhongMaterial)&&le.envMap===null&&J.environment!==null&&(Zt.envMapIntensity.value=J.environmentIntensity),Zt.dfgLUT!==void 0&&(Zt.dfgLUT.value=i2()),Mt){if(zt.setValue(Z,"toneMappingExposure",X.toneMappingExposure),Ve.needsLights&&Td(Zt,Er),De&&le.fog===!0&&qe.refreshFogUniforms(Zt,De),qe.refreshMaterialUniforms(Zt,le,xe,Me,P.state.transmissionRenderTarget[A.id]),Ve.needsLights&&Ve.lightProbeGrid){const Gt=Ve.lightProbeGrid;Zt.probesSH.value=Gt.texture,Zt.probesMin.value.copy(Gt.boundingBox.min),Zt.probesMax.value.copy(Gt.boundingBox.max),Zt.probesResolution.value.copy(Gt.resolution)}ed.upload(Z,Wo(Ve),Zt,z)}if(le.isShaderMaterial&&le.uniformsNeedUpdate===!0&&(ed.upload(Z,Wo(Ve),Zt,z),le.uniformsNeedUpdate=!1),le.isSpriteMaterial&&zt.setValue(Z,"center",ae.center),zt.setValue(Z,"modelViewMatrix",ae.modelViewMatrix),zt.setValue(Z,"normalMatrix",ae.normalMatrix),zt.setValue(Z,"modelMatrix",ae.matrixWorld),le.uniformsGroups!==void 0){const Gt=le.uniformsGroups;for(let Oi=0,tr=Gt.length;Oi<tr;Oi++){const js=Gt[Oi];Se.update(js,ei),Se.bind(js,ei)}}return ei}function Td(A,J){A.ambientLightColor.needsUpdate=J,A.lightProbe.needsUpdate=J,A.directionalLights.needsUpdate=J,A.directionalLightShadows.needsUpdate=J,A.pointLights.needsUpdate=J,A.pointLightShadows.needsUpdate=J,A.spotLights.needsUpdate=J,A.spotLightShadows.needsUpdate=J,A.rectAreaLights.needsUpdate=J,A.hemisphereLights.needsUpdate=J}function Xo(A){return A.isMeshLambertMaterial||A.isMeshToonMaterial||A.isMeshPhongMaterial||A.isMeshStandardMaterial||A.isShadowMaterial||A.isShaderMaterial&&A.lights===!0}this.getActiveCubeFace=function(){return me},this.getActiveMipmapLevel=function(){return B},this.getRenderTarget=function(){return $},this.setRenderTargetTextures=function(A,J,he){const le=oe.get(A);le.__autoAllocateDepthBuffer=A.resolveDepthBuffer===!1,le.__autoAllocateDepthBuffer===!1&&(le.__useRenderToTexture=!1),oe.get(A.texture).__webglTexture=J,oe.get(A.depthTexture).__webglTexture=le.__autoAllocateDepthBuffer?void 0:he,le.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(A,J){const he=oe.get(A);he.__webglFramebuffer=J,he.__useDefaultFramebuffer=J===void 0},this.setRenderTarget=function(A,J=0,he=0){$=A,me=J,B=he;let le=null,ae=!1,De=!1;if(A){const Ne=oe.get(A);if(Ne.__useDefaultFramebuffer!==void 0){T.bindFramebuffer(Z.FRAMEBUFFER,Ne.__webglFramebuffer),H.copy(A.viewport),F.copy(A.scissor),Te=A.scissorTest,T.viewport(H),T.scissor(F),T.setScissorTest(Te),ne=-1;return}else if(Ne.__webglFramebuffer===void 0)z.setupRenderTarget(A);else if(Ne.__hasExternalTextures)z.rebindTextures(A,oe.get(A.texture).__webglTexture,oe.get(A.depthTexture).__webglTexture);else if(A.depthBuffer){const ht=A.depthTexture;if(Ne.__boundDepthTexture!==ht){if(ht!==null&&oe.has(ht)&&(A.width!==ht.image.width||A.height!==ht.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");z.setupDepthRenderbuffer(A)}}const Ze=A.texture;(Ze.isData3DTexture||Ze.isDataArrayTexture||Ze.isCompressedArrayTexture)&&(De=!0);const rt=oe.get(A).__webglFramebuffer;A.isWebGLCubeRenderTarget?(Array.isArray(rt[J])?le=rt[J][he]:le=rt[J],ae=!0):A.samples>0&&z.useMultisampledRTT(A)===!1?le=oe.get(A).__webglMultisampledFramebuffer:Array.isArray(rt)?le=rt[he]:le=rt,H.copy(A.viewport),F.copy(A.scissor),Te=A.scissorTest}else H.copy(Qe).multiplyScalar(xe).floor(),F.copy(It).multiplyScalar(xe).floor(),Te=dt;if(he!==0&&(le=se),T.bindFramebuffer(Z.FRAMEBUFFER,le)&&T.drawBuffers(A,le),T.viewport(H),T.scissor(F),T.setScissorTest(Te),ae){const Ne=oe.get(A.texture);Z.framebufferTexture2D(Z.FRAMEBUFFER,Z.COLOR_ATTACHMENT0,Z.TEXTURE_CUBE_MAP_POSITIVE_X+J,Ne.__webglTexture,he)}else if(De){const Ne=J;for(let Ze=0;Ze<A.textures.length;Ze++){const rt=oe.get(A.textures[Ze]);Z.framebufferTextureLayer(Z.FRAMEBUFFER,Z.COLOR_ATTACHMENT0+Ze,rt.__webglTexture,he,Ne)}}else if(A!==null&&he!==0){const Ne=oe.get(A.texture);Z.framebufferTexture2D(Z.FRAMEBUFFER,Z.COLOR_ATTACHMENT0,Z.TEXTURE_2D,Ne.__webglTexture,he)}ne=-1},this.readRenderTargetPixels=function(A,J,he,le,ae,De,je,Ne=0){if(!(A&&A.isWebGLRenderTarget)){Dt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ze=oe.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&je!==void 0&&(Ze=Ze[je]),Ze){T.bindFramebuffer(Z.FRAMEBUFFER,Ze);try{const rt=A.textures[Ne],ht=rt.format,ft=rt.type;if(A.textures.length>1&&Z.readBuffer(Z.COLOR_ATTACHMENT0+Ne),!k.textureFormatReadable(ht)){Dt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!k.textureTypeReadable(ft)){Dt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}J>=0&&J<=A.width-le&&he>=0&&he<=A.height-ae&&Z.readPixels(J,he,le,ae,Ie.convert(ht),Ie.convert(ft),De)}finally{const rt=$!==null?oe.get($).__webglFramebuffer:null;T.bindFramebuffer(Z.FRAMEBUFFER,rt)}}},this.readRenderTargetPixelsAsync=async function(A,J,he,le,ae,De,je,Ne=0){if(!(A&&A.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ze=oe.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&je!==void 0&&(Ze=Ze[je]),Ze)if(J>=0&&J<=A.width-le&&he>=0&&he<=A.height-ae){T.bindFramebuffer(Z.FRAMEBUFFER,Ze);const rt=A.textures[Ne],ht=rt.format,ft=rt.type;if(A.textures.length>1&&Z.readBuffer(Z.COLOR_ATTACHMENT0+Ne),!k.textureFormatReadable(ht))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!k.textureTypeReadable(ft))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const tt=Z.createBuffer();Z.bindBuffer(Z.PIXEL_PACK_BUFFER,tt),Z.bufferData(Z.PIXEL_PACK_BUFFER,De.byteLength,Z.STREAM_READ),Z.readPixels(J,he,le,ae,Ie.convert(ht),Ie.convert(ft),0);const Pt=$!==null?oe.get($).__webglFramebuffer:null;T.bindFramebuffer(Z.FRAMEBUFFER,Pt);const Yt=Z.fenceSync(Z.SYNC_GPU_COMMANDS_COMPLETE,0);return Z.flush(),await fb(Z,Yt,4),Z.bindBuffer(Z.PIXEL_PACK_BUFFER,tt),Z.getBufferSubData(Z.PIXEL_PACK_BUFFER,0,De),Z.deleteBuffer(tt),Z.deleteSync(Yt),De}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(A,J=null,he=0){const le=Math.pow(2,-he),ae=Math.floor(A.image.width*le),De=Math.floor(A.image.height*le),je=J!==null?J.x:0,Ne=J!==null?J.y:0;z.setTexture2D(A,0),Z.copyTexSubImage2D(Z.TEXTURE_2D,he,0,0,je,Ne,ae,De),T.unbindTexture()},this.copyTextureToTexture=function(A,J,he=null,le=null,ae=0,De=0){let je,Ne,Ze,rt,ht,ft,tt,Pt,Yt;const nn=A.isCompressedTexture?A.mipmaps[De]:A.image;if(he!==null)je=he.max.x-he.min.x,Ne=he.max.y-he.min.y,Ze=he.isBox3?he.max.z-he.min.z:1,rt=he.min.x,ht=he.min.y,ft=he.isBox3?he.min.z:0;else{const Zt=Math.pow(2,-ae);je=Math.floor(nn.width*Zt),Ne=Math.floor(nn.height*Zt),A.isDataArrayTexture?Ze=nn.depth:A.isData3DTexture?Ze=Math.floor(nn.depth*Zt):Ze=1,rt=0,ht=0,ft=0}le!==null?(tt=le.x,Pt=le.y,Yt=le.z):(tt=0,Pt=0,Yt=0);const Vt=Ie.convert(J.format),gn=Ie.convert(J.type);let Ve;J.isData3DTexture?(z.setTexture3D(J,0),Ve=Z.TEXTURE_3D):J.isDataArrayTexture||J.isCompressedArrayTexture?(z.setTexture2DArray(J,0),Ve=Z.TEXTURE_2D_ARRAY):(z.setTexture2D(J,0),Ve=Z.TEXTURE_2D),T.activeTexture(Z.TEXTURE0),T.pixelStorei(Z.UNPACK_FLIP_Y_WEBGL,J.flipY),T.pixelStorei(Z.UNPACK_PREMULTIPLY_ALPHA_WEBGL,J.premultiplyAlpha),T.pixelStorei(Z.UNPACK_ALIGNMENT,J.unpackAlignment);const Ln=T.getParameter(Z.UNPACK_ROW_LENGTH),yt=T.getParameter(Z.UNPACK_IMAGE_HEIGHT),ei=T.getParameter(Z.UNPACK_SKIP_PIXELS),ti=T.getParameter(Z.UNPACK_SKIP_ROWS),Mt=T.getParameter(Z.UNPACK_SKIP_IMAGES);T.pixelStorei(Z.UNPACK_ROW_LENGTH,nn.width),T.pixelStorei(Z.UNPACK_IMAGE_HEIGHT,nn.height),T.pixelStorei(Z.UNPACK_SKIP_PIXELS,rt),T.pixelStorei(Z.UNPACK_SKIP_ROWS,ht),T.pixelStorei(Z.UNPACK_SKIP_IMAGES,ft);const Er=A.isDataArrayTexture||A.isData3DTexture,zt=J.isDataArrayTexture||J.isData3DTexture;if(A.isDepthTexture){const Zt=oe.get(A),Fi=oe.get(J),Gt=oe.get(Zt.__renderTarget),Oi=oe.get(Fi.__renderTarget);T.bindFramebuffer(Z.READ_FRAMEBUFFER,Gt.__webglFramebuffer),T.bindFramebuffer(Z.DRAW_FRAMEBUFFER,Oi.__webglFramebuffer);for(let tr=0;tr<Ze;tr++)Er&&(Z.framebufferTextureLayer(Z.READ_FRAMEBUFFER,Z.COLOR_ATTACHMENT0,oe.get(A).__webglTexture,ae,ft+tr),Z.framebufferTextureLayer(Z.DRAW_FRAMEBUFFER,Z.COLOR_ATTACHMENT0,oe.get(J).__webglTexture,De,Yt+tr)),Z.blitFramebuffer(rt,ht,je,Ne,tt,Pt,je,Ne,Z.DEPTH_BUFFER_BIT,Z.NEAREST);T.bindFramebuffer(Z.READ_FRAMEBUFFER,null),T.bindFramebuffer(Z.DRAW_FRAMEBUFFER,null)}else if(ae!==0||A.isRenderTargetTexture||oe.has(A)){const Zt=oe.get(A),Fi=oe.get(J);T.bindFramebuffer(Z.READ_FRAMEBUFFER,fe),T.bindFramebuffer(Z.DRAW_FRAMEBUFFER,Y);for(let Gt=0;Gt<Ze;Gt++)Er?Z.framebufferTextureLayer(Z.READ_FRAMEBUFFER,Z.COLOR_ATTACHMENT0,Zt.__webglTexture,ae,ft+Gt):Z.framebufferTexture2D(Z.READ_FRAMEBUFFER,Z.COLOR_ATTACHMENT0,Z.TEXTURE_2D,Zt.__webglTexture,ae),zt?Z.framebufferTextureLayer(Z.DRAW_FRAMEBUFFER,Z.COLOR_ATTACHMENT0,Fi.__webglTexture,De,Yt+Gt):Z.framebufferTexture2D(Z.DRAW_FRAMEBUFFER,Z.COLOR_ATTACHMENT0,Z.TEXTURE_2D,Fi.__webglTexture,De),ae!==0?Z.blitFramebuffer(rt,ht,je,Ne,tt,Pt,je,Ne,Z.COLOR_BUFFER_BIT,Z.NEAREST):zt?Z.copyTexSubImage3D(Ve,De,tt,Pt,Yt+Gt,rt,ht,je,Ne):Z.copyTexSubImage2D(Ve,De,tt,Pt,rt,ht,je,Ne);T.bindFramebuffer(Z.READ_FRAMEBUFFER,null),T.bindFramebuffer(Z.DRAW_FRAMEBUFFER,null)}else zt?A.isDataTexture||A.isData3DTexture?Z.texSubImage3D(Ve,De,tt,Pt,Yt,je,Ne,Ze,Vt,gn,nn.data):J.isCompressedArrayTexture?Z.compressedTexSubImage3D(Ve,De,tt,Pt,Yt,je,Ne,Ze,Vt,nn.data):Z.texSubImage3D(Ve,De,tt,Pt,Yt,je,Ne,Ze,Vt,gn,nn):A.isDataTexture?Z.texSubImage2D(Z.TEXTURE_2D,De,tt,Pt,je,Ne,Vt,gn,nn.data):A.isCompressedTexture?Z.compressedTexSubImage2D(Z.TEXTURE_2D,De,tt,Pt,nn.width,nn.height,Vt,nn.data):Z.texSubImage2D(Z.TEXTURE_2D,De,tt,Pt,je,Ne,Vt,gn,nn);T.pixelStorei(Z.UNPACK_ROW_LENGTH,Ln),T.pixelStorei(Z.UNPACK_IMAGE_HEIGHT,yt),T.pixelStorei(Z.UNPACK_SKIP_PIXELS,ei),T.pixelStorei(Z.UNPACK_SKIP_ROWS,ti),T.pixelStorei(Z.UNPACK_SKIP_IMAGES,Mt),De===0&&J.generateMipmaps&&Z.generateMipmap(Ve),T.unbindTexture()},this.initRenderTarget=function(A){oe.get(A).__webglFramebuffer===void 0&&z.setupRenderTarget(A)},this.initTexture=function(A){A.isCubeTexture?z.setTextureCube(A,0):A.isData3DTexture?z.setTexture3D(A,0):A.isDataArrayTexture||A.isCompressedArrayTexture?z.setTexture2DArray(A,0):z.setTexture2D(A,0),T.unbindTexture()},this.resetState=function(){me=0,B=0,$=null,T.reset(),ke.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return gr}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=At._getDrawingBufferColorSpace(e),t.unpackColorSpace=At._getUnpackColorSpace()}}const s2=/^[og]\s*(.+)?/,a2=/^mtllib /,o2=/^usemtl /,l2=/^usemap /,Jv=/\s+/,e_=new te,Qf=new te,t_=new te,n_=new te,Li=new te,Hu=new xt;function c2(){const i={objects:[],object:{},vertices:[],normals:[],colors:[],uvs:[],materials:{},materialLibraries:[],startObject:function(e,t){if(this.object&&this.object.fromDeclaration===!1){this.object.name=e,this.object.fromDeclaration=t!==!1;return}const r=this.object&&typeof this.object.currentMaterial=="function"?this.object.currentMaterial():void 0;if(this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0),this.object={name:e||"",fromDeclaration:t!==!1,geometry:{vertices:[],normals:[],colors:[],uvs:[],hasUVIndices:!1},materials:[],smooth:!0,startMaterial:function(a,l){const c=this._finalize(!1);c&&(c.inherited||c.groupCount<=0)&&this.materials.splice(c.index,1);const d={index:this.materials.length,name:a||"",mtllib:Array.isArray(l)&&l.length>0?l[l.length-1]:"",smooth:c!==void 0?c.smooth:this.smooth,groupStart:c!==void 0?c.groupEnd:0,groupEnd:-1,groupCount:-1,inherited:!1,clone:function(h){const f={index:typeof h=="number"?h:this.index,name:this.name,mtllib:this.mtllib,smooth:this.smooth,groupStart:0,groupEnd:-1,groupCount:-1,inherited:!1};return f.clone=this.clone.bind(f),f}};return this.materials.push(d),d},currentMaterial:function(){if(this.materials.length>0)return this.materials[this.materials.length-1]},_finalize:function(a){const l=this.currentMaterial();if(l&&l.groupEnd===-1&&(l.groupEnd=this.geometry.vertices.length/3,l.groupCount=l.groupEnd-l.groupStart,l.inherited=!1),a&&this.materials.length>1)for(let c=this.materials.length-1;c>=0;c--)this.materials[c].groupCount<=0&&this.materials.splice(c,1);return a&&this.materials.length===0&&this.materials.push({name:"",smooth:this.smooth}),l}},r&&r.name&&typeof r.clone=="function"){const a=r.clone(0);a.inherited=!0,this.object.materials.push(a)}this.objects.push(this.object)},finalize:function(){this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0)},parseVertexIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/3)*3},parseNormalIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/3)*3},parseUVIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/2)*2},addVertex:function(e,t,r){const a=this.vertices,l=this.object.geometry.vertices;l.push(a[e+0],a[e+1],a[e+2]),l.push(a[t+0],a[t+1],a[t+2]),l.push(a[r+0],a[r+1],a[r+2])},addVertexPoint:function(e){const t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addVertexLine:function(e){const t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addNormal:function(e,t,r){const a=this.normals,l=this.object.geometry.normals;l.push(a[e+0],a[e+1],a[e+2]),l.push(a[t+0],a[t+1],a[t+2]),l.push(a[r+0],a[r+1],a[r+2])},addFaceNormal:function(e,t,r){const a=this.vertices,l=this.object.geometry.normals;e_.fromArray(a,e),Qf.fromArray(a,t),t_.fromArray(a,r),Li.subVectors(t_,Qf),n_.subVectors(e_,Qf),Li.cross(n_),Li.normalize(),l.push(Li.x,Li.y,Li.z),l.push(Li.x,Li.y,Li.z),l.push(Li.x,Li.y,Li.z)},addColor:function(e,t,r){const a=this.colors,l=this.object.geometry.colors;a[e]!==void 0&&l.push(a[e+0],a[e+1],a[e+2]),a[t]!==void 0&&l.push(a[t+0],a[t+1],a[t+2]),a[r]!==void 0&&l.push(a[r+0],a[r+1],a[r+2])},addUV:function(e,t,r){const a=this.uvs,l=this.object.geometry.uvs;l.push(a[e+0],a[e+1]),l.push(a[t+0],a[t+1]),l.push(a[r+0],a[r+1])},addDefaultUV:function(){const e=this.object.geometry.uvs;e.push(0,0),e.push(0,0),e.push(0,0)},addUVLine:function(e){const t=this.uvs;this.object.geometry.uvs.push(t[e+0],t[e+1])},addFace:function(e,t,r,a,l,c,d,h,f){const m=this.vertices.length;let x=this.parseVertexIndex(e,m),g=this.parseVertexIndex(t,m),M=this.parseVertexIndex(r,m);if(this.addVertex(x,g,M),this.addColor(x,g,M),d!==void 0&&d!==""){const E=this.normals.length;x=this.parseNormalIndex(d,E),g=this.parseNormalIndex(h,E),M=this.parseNormalIndex(f,E),this.addNormal(x,g,M)}else this.addFaceNormal(x,g,M);if(a!==void 0&&a!==""){const E=this.uvs.length;x=this.parseUVIndex(a,E),g=this.parseUVIndex(l,E),M=this.parseUVIndex(c,E),this.addUV(x,g,M),this.object.geometry.hasUVIndices=!0}else this.addDefaultUV()},addPointGeometry:function(e){this.object.geometry.type="Points";const t=this.vertices.length;for(let r=0,a=e.length;r<a;r++){const l=this.parseVertexIndex(e[r],t);this.addVertexPoint(l),this.addColor(l)}},addLineGeometry:function(e,t){this.object.geometry.type="Line";const r=this.vertices.length,a=this.uvs.length;for(let l=0,c=e.length;l<c;l++)this.addVertexLine(this.parseVertexIndex(e[l],r));for(let l=0,c=t.length;l<c;l++)this.addUVLine(this.parseUVIndex(t[l],a))}};return i.startObject("",!1),i}class u2 extends ac{constructor(e){super(e),this.materials=null}load(e,t,r,a){const l=this,c=new Jb(this.manager);c.setPath(this.path),c.setRequestHeader(this.requestHeader),c.setWithCredentials(this.withCredentials),c.load(e,function(d){try{t(l.parse(d))}catch(h){a?a(h):console.error(h),l.manager.itemError(e)}},r,a)}setMaterials(e){return this.materials=e,this}parse(e){const t=new c2;e.indexOf(`\r
`)!==-1&&(e=e.replace(/\r\n/g,`
`)),e.indexOf(`\\
`)!==-1&&(e=e.replace(/\\\n/g,""));const r=e.split(`
`);let a=[];for(let d=0,h=r.length;d<h;d++){const f=r[d].trimStart();if(f.length===0)continue;const m=f.charAt(0);if(m!=="#")if(m==="v"){const x=f.split(Jv);switch(x[0]){case"v":t.vertices.push(parseFloat(x[1]),parseFloat(x[2]),parseFloat(x[3])),x.length>=7?(Hu.setRGB(parseFloat(x[4]),parseFloat(x[5]),parseFloat(x[6]),Jn),t.colors.push(Hu.r,Hu.g,Hu.b)):t.colors.push(void 0,void 0,void 0);break;case"vn":t.normals.push(parseFloat(x[1]),parseFloat(x[2]),parseFloat(x[3]));break;case"vt":t.uvs.push(parseFloat(x[1]),parseFloat(x[2]));break}}else if(m==="f"){const g=f.slice(1).trim().split(Jv),M=[];for(let w=0,S=g.length;w<S;w++){const y=g[w];if(y.length>0){const N=y.split("/");M.push(N)}}const E=M[0];for(let w=1,S=M.length-1;w<S;w++){const y=M[w],N=M[w+1];t.addFace(E[0],y[0],N[0],E[1],y[1],N[1],E[2],y[2],N[2])}}else if(m==="l"){const x=f.substring(1).trim().split(" ");let g=[];const M=[];if(f.indexOf("/")===-1)g=x;else for(let E=0,w=x.length;E<w;E++){const S=x[E].split("/");S[0]!==""&&g.push(S[0]),S[1]!==""&&M.push(S[1])}t.addLineGeometry(g,M)}else if(m==="p"){const g=f.slice(1).trim().split(" ");t.addPointGeometry(g)}else if((a=s2.exec(f))!==null){const x=(" "+a[0].slice(1).trim()).slice(1);t.startObject(x)}else if(o2.test(f))t.object.startMaterial(f.substring(7).trim(),t.materialLibraries);else if(a2.test(f))t.materialLibraries.push(f.substring(7).trim());else if(l2.test(f))console.warn('THREE.OBJLoader: Rendering identifier "usemap" not supported. Textures must be defined in MTL files.');else if(m==="s"){if(a=f.split(" "),a.length>1){const g=a[1].trim().toLowerCase();t.object.smooth=g!=="0"&&g!=="off"}else t.object.smooth=!0;const x=t.object.currentMaterial();x&&(x.smooth=t.object.smooth)}else{if(f==="\0")continue;console.warn('THREE.OBJLoader: Unexpected line: "'+f+'"')}}t.finalize();const l=new kl;if(l.materialLibraries=[].concat(t.materialLibraries),!(t.objects.length===1&&t.objects[0].geometry.vertices.length===0)===!0)for(let d=0,h=t.objects.length;d<h;d++){const f=t.objects[d],m=f.geometry,x=f.materials,g=m.type==="Line",M=m.type==="Points";let E=!1;if(m.vertices.length===0)continue;const w=new Mi;w.setAttribute("position",new Un(m.vertices,3)),m.normals.length>0&&w.setAttribute("normal",new Un(m.normals,3)),m.colors.length>0&&(E=!0,w.setAttribute("color",new Un(m.colors,3))),m.hasUVIndices===!0&&w.setAttribute("uv",new Un(m.uvs,2));const S=[];for(let N=0,L=x.length;N<L;N++){const C=x[N],D=C.name+"_"+C.smooth+"_"+E;let P=t.materials[D];if(this.materials!==null){if(P=this.materials.create(C.name),g&&P&&!(P instanceof Ju)){const U=new Ju;Sr.prototype.copy.call(U,P),U.color.copy(P.color),P=U}else if(M&&P&&!(P instanceof zl)){const U=new zl({size:10,sizeAttenuation:!1});Sr.prototype.copy.call(U,P),U.color.copy(P.color),U.map=P.map,P=U}}P===void 0&&(g?P=new Ju:M?P=new zl({size:1,sizeAttenuation:!1}):P=new $b,P.name=C.name,P.flatShading=!C.smooth,P.vertexColors=E,t.materials[D]=P),S.push(P)}let y;if(S.length>1){for(let N=0,L=x.length;N<L;N++){const C=x[N];w.addGroup(C.groupStart,C.groupCount,N)}g?y=new vv(w,S):M?y=new Hf(w,S):y=new Zi(w,S)}else g?y=new vv(w,S[0]):M?y=new Hf(w,S[0]):y=new Zi(w,S[0]);y.name=f.name,l.add(y)}else if(t.vertices.length>0){const d=new zl({size:1,sizeAttenuation:!1}),h=new Mi;h.setAttribute("position",new Un(t.vertices,3)),t.colors.length>0&&t.colors[0]!==void 0&&(h.setAttribute("color",new Un(t.colors,3)),d.vertexColors=!0);const f=new Hf(h,d);l.add(f)}return l}}const i_={type:"change"},jm={type:"start"},Fy={type:"end"},Vu=new yd,r_=new Es,d2=Math.cos(70*gb.DEG2RAD),Sn=new te,ci=2*Math.PI,Wt={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Zf=1e-6;class h2 extends lT{constructor(e,t=null){super(e,t),this.state=Wt.NONE,this.target=new te,this.cursor=new te,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:go.ROTATE,MIDDLE:go.DOLLY,RIGHT:go.PAN},this.touches={ONE:po.ROTATE,TWO:po.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new te,this._lastQuaternion=new Os,this._lastTargetPosition=new te,this._quat=new Os().setFromUnitVectors(e.up,new te(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Cv,this._sphericalDelta=new Cv,this._scale=1,this._panOffset=new te,this._rotateStart=new ut,this._rotateEnd=new ut,this._rotateDelta=new ut,this._panStart=new ut,this._panEnd=new ut,this._panDelta=new ut,this._dollyStart=new ut,this._dollyEnd=new ut,this._dollyDelta=new ut,this._dollyDirection=new te,this._mouse=new ut,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=p2.bind(this),this._onPointerDown=f2.bind(this),this._onPointerUp=m2.bind(this),this._onContextMenu=M2.bind(this),this._onMouseWheel=v2.bind(this),this._onKeyDown=_2.bind(this),this._onTouchStart=y2.bind(this),this._onTouchMove=S2.bind(this),this._onMouseDown=g2.bind(this),this._onMouseMove=x2.bind(this),this._interceptControlDown=E2.bind(this),this._interceptControlUp=w2.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction=""}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(i_),this.update(),this.state=Wt.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){const t=this.object.position;Sn.copy(t).sub(this.target),Sn.applyQuaternion(this._quat),this._spherical.setFromVector3(Sn),this.autoRotate&&this.state===Wt.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let r=this.minAzimuthAngle,a=this.maxAzimuthAngle;isFinite(r)&&isFinite(a)&&(r<-Math.PI?r+=ci:r>Math.PI&&(r-=ci),a<-Math.PI?a+=ci:a>Math.PI&&(a-=ci),r<=a?this._spherical.theta=Math.max(r,Math.min(a,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(r+a)/2?Math.max(r,this._spherical.theta):Math.min(a,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let l=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const c=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),l=c!=this._spherical.radius}if(Sn.setFromSpherical(this._spherical),Sn.applyQuaternion(this._quatInverse),t.copy(this.target).add(Sn),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let c=null;if(this.object.isPerspectiveCamera){const d=Sn.length();c=this._clampDistance(d*this._scale);const h=d-c;this.object.position.addScaledVector(this._dollyDirection,h),this.object.updateMatrixWorld(),l=!!h}else if(this.object.isOrthographicCamera){const d=new te(this._mouse.x,this._mouse.y,0);d.unproject(this.object);const h=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),l=h!==this.object.zoom;const f=new te(this._mouse.x,this._mouse.y,0);f.unproject(this.object),this.object.position.sub(f).add(d),this.object.updateMatrixWorld(),c=Sn.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;c!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(c).add(this.object.position):(Vu.origin.copy(this.object.position),Vu.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Vu.direction))<d2?this.object.lookAt(this.target):(r_.setFromNormalAndCoplanarPoint(this.object.up,this.target),Vu.intersectPlane(r_,this.target))))}else if(this.object.isOrthographicCamera){const c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),c!==this.object.zoom&&(this.object.updateProjectionMatrix(),l=!0)}return this._scale=1,this._performCursorZoom=!1,l||this._lastPosition.distanceToSquared(this.object.position)>Zf||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Zf||this._lastTargetPosition.distanceToSquared(this.target)>Zf?(this.dispatchEvent(i_),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?ci/60*this.autoRotateSpeed*e:ci/60/60*this.autoRotateSpeed}_getZoomScale(e){const t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Sn.setFromMatrixColumn(t,0),Sn.multiplyScalar(-e),this._panOffset.add(Sn)}_panUp(e,t){this.screenSpacePanning===!0?Sn.setFromMatrixColumn(t,1):(Sn.setFromMatrixColumn(t,0),Sn.crossVectors(this.object.up,Sn)),Sn.multiplyScalar(e),this._panOffset.add(Sn)}_pan(e,t){const r=this.domElement;if(this.object.isPerspectiveCamera){const a=this.object.position;Sn.copy(a).sub(this.target);let l=Sn.length();l*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*l/r.clientHeight,this.object.matrix),this._panUp(2*t*l/r.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/r.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/r.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const r=this.domElement.getBoundingClientRect(),a=e-r.left,l=t-r.top,c=r.width,d=r.height;this._mouse.x=a/c*2-1,this._mouse.y=-(l/d)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(ci*this._rotateDelta.x/t.clientHeight),this._rotateUp(ci*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._rotateStart.set(r,a)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._panStart.set(r,a)}}_handleTouchStartDolly(e){const t=this._getSecondPointerPosition(e),r=e.pageX-t.x,a=e.pageY-t.y,l=Math.sqrt(r*r+a*a);this._dollyStart.set(0,l)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{const r=this._getSecondPointerPosition(e),a=.5*(e.pageX+r.x),l=.5*(e.pageY+r.y);this._rotateEnd.set(a,l)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(ci*this._rotateDelta.x/t.clientHeight),this._rotateUp(ci*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._panEnd.set(r,a)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){const t=this._getSecondPointerPosition(e),r=e.pageX-t.x,a=e.pageY-t.y,l=Math.sqrt(r*r+a*a);this._dollyEnd.set(0,l),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const c=(e.pageX+t.x)*.5,d=(e.pageY+t.y)*.5;this._updateZoomParameters(c,d)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new ut,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){const t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){const t=e.deltaMode,r={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:r.deltaY*=16;break;case 2:r.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(r.deltaY*=10),r}}function f2(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function p2(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function m2(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Fy),this.state=Wt.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:const e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function g2(i){let e;switch(i.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case go.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=Wt.DOLLY;break;case go.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Wt.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Wt.ROTATE}break;case go.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Wt.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Wt.PAN}break;default:this.state=Wt.NONE}this.state!==Wt.NONE&&this.dispatchEvent(jm)}function x2(i){switch(this.state){case Wt.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case Wt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case Wt.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function v2(i){this.enabled===!1||this.enableZoom===!1||this.state!==Wt.NONE||(i.preventDefault(),this.dispatchEvent(jm),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(Fy))}function _2(i){this.enabled!==!1&&this._handleKeyDown(i)}function y2(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case po.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=Wt.TOUCH_ROTATE;break;case po.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=Wt.TOUCH_PAN;break;default:this.state=Wt.NONE}break;case 2:switch(this.touches.TWO){case po.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=Wt.TOUCH_DOLLY_PAN;break;case po.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=Wt.TOUCH_DOLLY_ROTATE;break;default:this.state=Wt.NONE}break;default:this.state=Wt.NONE}this.state!==Wt.NONE&&this.dispatchEvent(jm)}function S2(i){switch(this._trackPointer(i),this.state){case Wt.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case Wt.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case Wt.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case Wt.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=Wt.NONE}}function M2(i){this.enabled!==!1&&i.preventDefault()}function E2(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function w2(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function b2({piece:i,variant:e,textured:t=!0,size:r=320}){const a=G.useRef(null);return G.useEffect(()=>{const l=a.current;if(!l)return;const c=new Pb;c.background=new xt(1315866);const d=new Ii(35,1,.01,5e3),h=new r2({antialias:!0});h.setSize(r,r),h.setPixelRatio(Math.min(2,window.devicePixelRatio)),h.outputColorSpace=Jn,h.toneMapping=Nm,h.toneMappingExposure=1.15,l.appendChild(h.domElement),c.add(new nT(16777215,4210768,1.1)),c.add(new sT(16777215,.35));const f=new jf(16777215,2.4);f.position.set(3,4,2),c.add(f);const m=new jf(16777215,1.1);m.position.set(-3,1,-1),c.add(m);const x=new jf(16777215,.8);x.position.set(0,2,-4),c.add(x);const g=new h2(d,h.domElement);g.enableDamping=!0,g.autoRotate=!0,g.autoRotateSpeed=1.2;let M=0,E=!1;new u2().load(`/api/scan/model/${i}/${e}.obj`,y=>{if(E)return;y.traverse(U=>{const b=U;b.isMesh&&b.geometry.computeVertexNormals()});const N=U=>T2(y,U);t?new tT().load(`/api/scan/model/${i}/${e}.png`,U=>{U.colorSpace=Jn,N(new Vf({map:U,roughness:.6}))},void 0,()=>N(new Vf({color:11579576,roughness:.6}))):N(new Vf({color:12632262,roughness:.65})),y.rotation.x=-Math.PI/2;const L=new Ho().setFromObject(y),C=L.getCenter(new te),D=L.getSize(new te);y.position.sub(C),c.add(y);const P=Math.max(D.x,D.y,D.z);d.position.set(P*1.6,P*.6,P*1.6),d.near=P/100,d.far=P*100,d.updateProjectionMatrix(),g.target.set(0,0,0),g.update()});const S=()=>{g.update(),h.render(c,d),M=requestAnimationFrame(S)};return S(),()=>{E=!0,cancelAnimationFrame(M),g.dispose(),h.dispose(),l.removeChild(h.domElement)}},[i,e,t,r]),v.jsx("div",{ref:a,style:{width:r,height:r},className:"rounded-lg border border-zinc-700 bg-zinc-950 [&>canvas]:rounded-lg"})}function T2(i,e){e.side=pr,i.traverse(t=>{t.isMesh&&(t.material=e)})}const lr="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",C2="https://<PHONE-IP>:4444/video/m.jpeg",R2="https://<PHONE-IP>:4444/video/snapshot",A2={P:"Pawn",N:"Knight",B:"Bishop",R:"Rook",Q:"Queen",K:"King"};function P2(i){const e=i.match(/^([wb]?)([PNBRQK])$/i);if(!e)return null;const t=e[2].toUpperCase();return e[1]?e[1].toLowerCase()+t:t}function hd(i){const e=i.length===2?i[1]:i[0];let t="";return i.length===2&&(t=i[0]==="w"?"white ":"black "),t+(A2[e]??i)}function om(i,e){const t=P2(i.dir),r=e.find(a=>a.source_dir===i.dir)??(t?e.find(a=>a.piece.toLowerCase()===t.toLowerCase()&&!a.source_dir):void 0);return r?{stage:"done",piece:r.piece,variant:r.variant}:i.mesh?{stage:"mesh",piece:t,variant:null}:{stage:"mesh",piece:t,variant:null}}function N2(){const[i,e]=G.useState(C2),[t,r]=G.useState(R2),[a,l]=G.useState(2880),[c,d]=G.useState(2160),[h,f]=G.useState(""),[m,x]=G.useState([]),[g,M]=G.useState("pawn"),[E,w]=G.useState(.8),[S,y]=G.useState(80),[N,L]=G.useState(92),[C,D]=G.useState(null),[P,U]=G.useState(""),[b,I]=G.useState(null),X=G.useRef(null),O=G.useRef(null),[K,se]=G.useState(null),[fe,Y]=G.useState(""),[me,B]=G.useState("P"),[$,ne]=G.useState(null),[ce,H]=G.useState("textured"),[F,Te]=G.useState(null),[Oe,ze]=G.useState(null),[ie,Me]=G.useState(null),[xe,Fe]=G.useState(""),[Xe,Qe]=G.useState(!1),It=G.useRef(null);G.useEffect(()=>(Qt("/api/scan/status").then(de=>{D(de),de.default_source&&e(de.default_source),de.default_capture&&r(de.default_capture),de.out&&M(de.out),de.mode&&f(de.mode)}).catch(()=>{}),Qt("/api/scan/modes").then(de=>x(de.modes.filter(j=>j.width!=null))).catch(()=>{}),()=>clearInterval(O.current)),[]);const dt=()=>Qt("/api/scan/status").then(D).catch(()=>{});function wt(){clearInterval(O.current),O.current=setInterval(dt,1e3)}async function St(){U("");try{const de=await tn("/api/scan/open",{source:i,width:a,height:c,capture:t,mode:h});D(de),wt()}catch(de){U("Connect failed: "+de.message)}}async function vt(){U("");try{const de=await tn("/api/scan/close");D(de),clearInterval(O.current)}catch(de){U("Disconnect failed: "+de.message)}}function Ut(de){const j=X.current.getBoundingClientRect();return{x:de.clientX-j.left,y:de.clientY-j.top,r:j}}function qt(de){if(!(C!=null&&C.open))return;de.target.setPointerCapture(de.pointerId);const{x:j,y:be}=Ut(de);I({x0:j,y0:be,x1:j,y1:be})}function Xt(de){if(!b)return;const{x:j,y:be}=Ut(de);I({...b,x1:j,y1:be})}async function $t(){if(!b||!C)return I(null);const de=X.current.getBoundingClientRect(),[j,be]=C.frame_size,_e=j/de.width,Ie=be/de.height,ke=Math.round(Math.min(b.x0,b.x1)*_e),Se=Math.round(Math.min(b.y0,b.y1)*Ie),Ye=Math.round(Math.max(b.x0,b.x1)*_e),We=Math.round(Math.max(b.y0,b.y1)*Ie);if(I(null),!(Ye-ke<10||We-Se<10))try{D(await tn("/api/scan/config",{crop:[ke,Se,Ye,We]}))}catch(Ot){U("Crop failed: "+Ot.message)}}async function Nt(){try{D(await tn("/api/scan/config",{crop:[]}))}catch(de){U("Crop reset failed: "+de.message)}}async function Ht(){try{D(await tn("/api/scan/config",{interval:E,count:S,quality:N,out:g}))}catch(de){U("Config failed: "+de.message)}}async function Z(){U("");try{await Ht();const de=await tn("/api/scan/start",{out:g});D(de),wt()}catch(de){U("Capture start failed: "+de.message)}}async function pn(){U("");try{D(await tn("/api/scan/stop"))}catch(de){U("Capture stop failed: "+de.message)}}const mt=()=>Qt("/api/scan/models").then(de=>{se(de),!fe&&de.scans.length&&k(de.scans[0],de.pieces)}).catch(()=>{});function k(de,j=(K==null?void 0:K.pieces)??[]){Y(de.dir);const{piece:be}=om(de,j);B(be??"P")}async function T(de){if(confirm(`Delete scan "${de}" (mesh will be removed)?`)){U("");try{await Wl(`/api/scan/scan/${de}`),fe===de&&Y(""),mt()}catch(j){U("Delete failed: "+j.message)}}}async function ee(de,j){if(confirm(`Delete prepared piece "${de}/${j}"? (Scan folder is kept.)`)){U("");try{await Wl(`/api/scan/piece/${de}/${j}`),ne(null),mt()}catch(be){U("Delete failed: "+be.message)}}}async function oe(){var de;if(!(!Oe||!xe)){Qe(!0),U("");try{const j=new FormData;j.append("name",xe),j.append("mesh",Oe),ie&&j.append("texture",ie);const be=await fetch("/api/scan/upload",{method:"POST",body:j});if(!be.ok)throw new Error(((de=await be.json())==null?void 0:de.detail)||`HTTP ${be.status}`);await mt(),Y(xe),Fe(""),ze(null),Me(null)}catch(j){U("Upload: "+j.message)}Qe(!1)}}const z=()=>Qt("/api/scan/prepare/status").then(de=>{ne(de),de.state!=="running"&&(clearInterval(It.current),mt())}).catch(()=>{});G.useEffect(()=>(mt(),Qt("/api/scan/prepare/status").then(de=>{de.state==="running"&&(ne(de),It.current=setInterval(z,2e3))}).catch(()=>{}),()=>{clearInterval(It.current)}),[]);async function ye(){U("");try{const de=await tn("/api/scan/prepare",{dir:fe,piece:me});ne({state:"running",piece:me,variant:de==null?void 0:de.variant}),clearInterval(It.current),It.current=setInterval(z,2e3)}catch(de){U("Prepare failed: "+de.message)}}const Le=C==null?void 0:C.recording,ge=b&&{left:Math.min(b.x0,b.x1),top:Math.min(b.y0,b.y1),width:Math.abs(b.x1-b.x0),height:Math.abs(b.y1-b.y0)},ve=(K==null?void 0:K.scans)??[],Re=ve.find(de=>de.dir===fe),qe=Re?om(Re,(K==null?void 0:K.pieces)??[]):null,Ue=qe==null?void 0:qe.stage,Pe=($==null?void 0:$.state)==="running",et=Ue==="done"?2:1;let it;return Pe?it="running…":Ue==="done"?it="Re-prepare":it="Prepare",v.jsxs("div",{className:"space-y-4",children:[v.jsx(fn,{children:v.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Live preview stream (MJPEG, …/video/m.jpeg) or USB index.",children:["Preview",v.jsx("input",{value:i,onChange:de=>e(de.target.value),className:`${lr} w-96`,placeholder:"Stream URL (…/video/m.jpeg) or USB index (0/1)"})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Photo to save per capture (snapshot URL, …/video/snapshot). Empty = use live frame.",children:["Photo",v.jsx("input",{value:t,onChange:de=>r(de.target.value),className:`${lr} w-96`,placeholder:"Snapshot URL (…/video/snapshot), empty = live frame"})]}),v.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"For USB cam only: named camera mode, or 'custom' with an explicit resolution.",children:["USB Res",v.jsxs("select",{value:h,onChange:de=>f(de.target.value),className:lr,children:[v.jsx("option",{value:"",children:"custom"}),m.map(de=>v.jsx("option",{value:de.name,children:de.label},de.name))]}),v.jsx("input",{type:"number",value:a,onChange:de=>l(+de.target.value),disabled:!!h,className:`${lr} w-20 disabled:opacity-40`}),"×",v.jsx("input",{type:"number",value:c,onChange:de=>d(+de.target.value),disabled:!!h,className:`${lr} w-20 disabled:opacity-40`})]}),C!=null&&C.open?v.jsxs(Tt,{onClick:vt,children:[v.jsx(Hx,{className:"h-4 w-4"})," Disconnect"]}):v.jsxs(Tt,{variant:"primary",onClick:St,children:[v.jsx(Hx,{className:"h-4 w-4"})," Connect"]}),v.jsxs("span",{className:"text-xs text-zinc-500",children:[P,C!=null&&C.error?` · ${C.error}`:""]})]})}),(C==null?void 0:C.open)&&v.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_320px]",children:[v.jsxs(fn,{title:"Live · Drag crop",children:[v.jsxs("div",{className:"relative inline-block select-none leading-none",children:[v.jsx("img",{ref:X,src:"/api/scan/preview.mjpg",alt:"Scan preview",draggable:!1,className:"w-full rounded-lg border border-zinc-800"}),v.jsx("div",{className:"absolute inset-0 cursor-crosshair",onPointerDown:qt,onPointerMove:Xt,onPointerUp:$t,children:ge&&v.jsx("div",{className:"absolute border-2 border-sky-400 bg-sky-400/10",style:{left:ge.left,top:ge.top,width:ge.width,height:ge.height}})})]}),v.jsxs("div",{className:"mt-2 flex items-center gap-3 text-xs text-zinc-500",children:[v.jsxs("span",{children:["Source ",C.frame_size[0],"×",C.frame_size[1]]}),v.jsxs("span",{children:["Crop: ",C.crop?C.crop.join(", "):"—"]}),v.jsxs(Tt,{onClick:Nt,className:"px-2 py-1 text-xs",children:[v.jsx(pw,{className:"h-3 w-3"})," Reset crop"]})]})]}),v.jsx(fn,{title:"Capture",children:v.jsxs("div",{className:"space-y-3",children:[v.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",children:["Target folder",v.jsx("input",{value:g,onChange:de=>M(de.target.value),className:`${lr} w-40`})]}),v.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",title:"Seconds between two photos. On phone ~0.8s is the limit (HTTPS fetch).",children:["Interval (s)",v.jsx("input",{type:"number",step:.1,min:0,value:E,onChange:de=>w(+de.target.value),className:`${lr} w-24`})]}),v.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",title:"Photos per capture run. 0 = until stop.",children:["Count (0=∞)",v.jsx("input",{type:"number",min:0,value:S,onChange:de=>y(+de.target.value),className:`${lr} w-24`})]}),v.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",children:["JPEG quality",v.jsx("input",{type:"number",min:50,max:100,value:N,onChange:de=>L(+de.target.value),className:`${lr} w-24`})]}),v.jsxs("div",{className:"flex flex-wrap gap-2 pt-1",children:[Le?v.jsxs(Tt,{onClick:pn,children:[v.jsx(Z_,{className:"h-4 w-4"})," Stop"]}):v.jsxs(Tt,{variant:"primary",onClick:Z,children:[v.jsx(Tm,{className:"h-4 w-4"})," Start capture"]}),v.jsxs(Tt,{onClick:Ht,title:"Apply interval/count/quality without capturing",children:[v.jsx(sw,{className:"h-4 w-4"})," Apply"]})]}),v.jsxs("div",{className:"rounded-lg bg-zinc-800 p-3 text-sm",children:[Le?v.jsxs("span",{className:"font-medium text-green-500",children:["● Capture running — ",C.saved_run,C.count?` / ${C.count}`:""," photos"]}):v.jsx("span",{className:"text-zinc-400",children:"Ready"}),v.jsxs("div",{className:"mt-1 text-xs text-zinc-500",children:["In folder ",v.jsx("b",{className:"text-zinc-300",children:C.out||g}),": ",C.total," photos total (next no. ",C.index,")"]})]}),v.jsxs("p",{className:"text-xs text-zinc-500",children:["Motor on, phone/cam ",v.jsx("b",{children:"fixed"}),', hands off. "Start capture" appends to existing photos (for ring 2/3 simply reposition + start again).']})]})})]}),!(C!=null&&C.open)&&v.jsxs("p",{className:"text-xs text-zinc-500",children:["Connect a source (phone IP cam URL or USB index), drag the ",v.jsx("b",{children:"crop"})," around the piece + turntable (static background out), set ",v.jsx("b",{children:"interval"})," and ",v.jsx("b",{children:"count"})," and capture. Photos go to ",v.jsx("b",{children:"scans/<folder>"})," — ready for RealityScan."]}),v.jsxs(fn,{title:"Piece workshop — 3D scan → piece",children:[v.jsx("div",{className:"mb-4 flex items-center gap-1 text-xs",children:[[1,"Upload",J_],[2,"Prepare",Vx]].map(([de,j,be],_e)=>v.jsxs("div",{className:"flex items-center gap-1",children:[v.jsxs("div",{className:`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${et>=de?"bg-sky-500/15 text-sky-300":"bg-zinc-800 text-zinc-500"}`,children:[v.jsx(be,{className:"h-3.5 w-3.5"})," ",v.jsx("span",{children:j})]}),_e<1&&v.jsx("div",{className:`h-px w-4 ${et>de?"bg-sky-500/40":"bg-zinc-700"}`})]},de))}),ve.length===0&&v.jsx("p",{className:"text-sm text-zinc-500",children:"No scans yet. Upload a 3D model (.obj/.glb) — it appears here as a card."}),v.jsx(L2,{uploadName:xe,setUploadName:Fe,meshFile:Oe,setMeshFile:ze,texFile:ie,setTexFile:Me,uploading:Xe,doUpload:oe,input:lr}),v.jsx(D2,{scans:ve,models:K,dir:fe,selectScan:k,deleteScan:T,prep:$}),Re&&v.jsxs("div",{className:"mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4",children:[v.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[v.jsxs("div",{className:"flex items-center gap-2",children:[v.jsxs("div",{children:[v.jsx("div",{className:"text-sm font-medium text-zinc-100",children:Re.dir}),v.jsxs("div",{className:"text-xs text-zinc-500",children:[Re.mesh?"Mesh present":"no mesh yet",!Re.texture&&Re.mesh?" · ⚠ without texture":""]})]}),v.jsx("button",{onClick:()=>T(Re.dir),title:"Delete scan",className:"rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400",children:v.jsx(Ta,{className:"h-4 w-4"})})]}),v.jsxs(Tt,{variant:"primary",onClick:ye,disabled:Pe,children:[Pe?v.jsx(Nn,{className:"h-4 w-4 animate-spin"}):v.jsx(Vx,{className:"h-4 w-4"}),it]})]}),v.jsx(U2,{cur:Re,busyPrep:Pe,prep:$}),P&&v.jsx("p",{className:"mt-2 text-sm text-red-400",children:P})]}),v.jsx(F2,{pieces:K==null?void 0:K.pieces,setView3d:Te,deletePiece:ee,prep:$,kind:ce,setKind:H})]}),F&&v.jsx(I2,{piece:F.piece,variant:F.variant,textured:ce==="textured",onClose:()=>Te(null)})]})}function L2({uploadName:i,setUploadName:e,meshFile:t,setMeshFile:r,texFile:a,setTexFile:l,uploading:c,doUpload:d,input:h}){return v.jsxs("div",{className:"mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3",children:[v.jsx("div",{className:"mb-2 text-xs font-medium text-zinc-400",children:"Upload 3D model (.obj/.glb)"}),v.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[v.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Name",v.jsx("input",{value:i,onChange:f=>e(f.target.value),placeholder:"e.g. wK",className:`${h} w-32`})]}),v.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Mesh (.obj/.glb)",v.jsx("input",{type:"file",accept:".obj,.glb,.gltf",onChange:f=>{var m;return r(((m=f.target.files)==null?void 0:m[0])??null)},className:"text-xs text-zinc-300 file:mr-1 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-0.5 file:text-xs file:text-zinc-200"})]}),v.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Texture (optional)",v.jsx("input",{type:"file",accept:".png,.jpg,.jpeg",onChange:f=>{var m;return l(((m=f.target.files)==null?void 0:m[0])??null)},className:"text-xs text-zinc-300 file:mr-1 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-0.5 file:text-xs file:text-zinc-200"})]}),v.jsxs(Tt,{variant:"primary",onClick:d,disabled:c||!t||!i,children:[c?v.jsx(Nn,{className:"h-4 w-4 animate-spin"}):v.jsx(J_,{className:"h-4 w-4"}),"Upload"]})]})]})}function D2({scans:i,models:e,dir:t,selectScan:r,deleteScan:a,prep:l}){return v.jsx("div",{className:"grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4",children:i.map(c=>{var M;const d=om(c,(e==null?void 0:e.pieces)??[]),h=c.dir===t,m=(l==null?void 0:l.state)==="running"&&l.dir===c.dir||((M=e==null?void 0:e.jobs)==null?void 0:M.prepare)===c.dir,x=m?["preparing…","bg-sky-500/20 text-sky-300"]:{mesh:["Mesh ready","bg-sky-500/15 text-sky-300"],done:["Ready","bg-green-500/15 text-green-300"]}[d.stage],g=d.piece&&d.stage==="done";return v.jsxs("div",{onClick:()=>r(c),role:"button",tabIndex:0,onKeyDown:E=>{(E.key==="Enter"||E.key===" ")&&(E.preventDefault(),r(c))},className:`group relative flex cursor-pointer flex-col rounded-xl border p-2 text-left transition ${h?"border-sky-500 bg-sky-500/5":"border-zinc-800 hover:border-zinc-600"}`,children:[v.jsxs("div",{className:"relative mb-1.5 aspect-square overflow-hidden rounded-lg bg-zinc-950",children:[g?v.jsx("img",{src:`/api/scan/prepare/preview/${d.piece}/${d.variant}?kind=textured`,alt:`${hd(d.piece)} preview`,className:"h-full w-full object-contain"}):v.jsx("div",{className:"grid h-full place-items-center text-zinc-700",children:v.jsx(wm,{className:"h-8 w-8"})}),v.jsxs("span",{className:`absolute left-1 top-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${x[1]}`,children:[m&&v.jsx(Nn,{className:"h-3 w-3 animate-spin"}),x[0]]}),v.jsx("button",{onClick:E=>{E.stopPropagation(),a(c.dir)},title:"Delete scan folder",className:"absolute right-1 top-1 hidden rounded bg-zinc-900/80 p-1 text-zinc-400 hover:text-red-400 group-hover:block",children:v.jsx(Ta,{className:"h-3.5 w-3.5"})})]}),v.jsx("div",{className:"text-sm font-medium text-zinc-200",children:c.dir}),v.jsx("div",{className:"text-[11px] text-zinc-500",children:d.piece?`${hd(d.piece)}`:""})]},c.dir)})})}function I2({piece:i,variant:e,textured:t,onClose:r}){const[a,l]=G.useState(t);return G.useEffect(()=>{const c=d=>d.key==="Escape"&&r();return window.addEventListener("keydown",c),()=>window.removeEventListener("keydown",c)},[r]),v.jsx("div",{onClick:r,role:"button",tabIndex:0,onKeyDown:c=>{(c.key==="Enter"||c.key===" ")&&(c.preventDefault(),r())},className:"fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-6",children:v.jsxs("div",{onClick:c=>c.stopPropagation(),role:"presentation",onKeyDown:c=>c.stopPropagation(),className:"flex flex-col items-center gap-3",children:[v.jsx(b2,{piece:i,variant:e,textured:a,size:Math.min(720,window.innerHeight-160)}),v.jsxs("div",{className:"flex items-center gap-3 text-sm text-zinc-300",children:[v.jsxs("span",{className:"font-medium",children:[i,"/",e]}),v.jsx(Oy,{value:a?"textured":"clay",onChange:c=>l(c==="textured")}),v.jsx("span",{className:"text-xs text-zinc-500",children:"drag to rotate · scroll to zoom · Esc to close"})]})]})})}function U2({cur:i,busyPrep:e,prep:t}){return v.jsxs(v.Fragment,{children:[e&&v.jsxs("div",{className:"flex items-center gap-2 rounded-lg bg-sky-500/10 p-3 text-sm text-sky-300",children:[v.jsx(Nn,{className:"h-4 w-4 animate-spin"})," Piece is being prepared — about 1-3 min…"]}),(t==null?void 0:t.state)==="failed"&&v.jsxs("div",{className:"rounded-lg bg-red-500/10 p-3 text-sm text-red-300",children:[v.jsxs("div",{className:"flex items-center gap-2",children:[v.jsx(Cm,{className:"h-4 w-4"})," Preparation failed."]}),t.log_tail&&v.jsx("pre",{className:"mt-1 whitespace-pre-wrap text-xs text-red-400/70",children:t.log_tail})]})]})}function F2({pieces:i,setView3d:e,deletePiece:t,prep:r,kind:a,setKind:l}){return i!=null&&i.length?v.jsxs("div",{className:"mt-4 border-t border-zinc-800 pt-3",children:[v.jsx("div",{className:"mb-2 text-xs font-medium text-zinc-400",children:"Finished pieces (synth_pieces/)"}),v.jsx("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",children:i.map(c=>{var h,f;const d=(r==null?void 0:r.state)==="running"&&r.piece===c.piece&&r.variant===c.variant;return v.jsxs("div",{className:"relative rounded-xl border border-zinc-800 bg-zinc-900/50 p-2",children:[v.jsxs("div",{className:"relative mb-2 aspect-square overflow-hidden rounded-lg bg-zinc-950",children:[c.has_preview?v.jsx("img",{src:`/api/scan/prepare/preview/${c.piece}/${c.variant}?kind=${a}`,alt:`${hd(c.piece)}`,className:"h-full w-full object-contain"}):v.jsx("div",{className:"grid h-full place-items-center text-zinc-700",children:v.jsx(uw,{className:"h-8 w-8"})}),v.jsx("button",{onClick:()=>e({piece:c.piece,variant:c.variant}),title:"Open 3D view",className:"absolute right-1 top-1 rounded bg-zinc-900/80 p-1 text-zinc-400 hover:text-white",children:v.jsx(hw,{className:"h-3.5 w-3.5"})})]}),v.jsxs("div",{className:"flex items-center justify-between",children:[v.jsxs("span",{className:"text-sm font-medium text-zinc-200",children:[hd(c.piece)," · ",c.variant]}),d&&v.jsx(Nn,{className:"h-3.5 w-3.5 animate-spin text-sky-400"})]}),v.jsx(Oy,{value:a,onChange:l,clayDisabled:!c.has_clay}),c.report&&v.jsx(O2,{piece:c.piece,variant:c.variant,report:c.report,level:(h=c.report)==null?void 0:h.level,messages:(f=c.report)==null?void 0:f.messages,onDelete:t})]},c.id)})})]}):null}function O2({piece:i,variant:e,report:t,level:r,messages:a,onDelete:l}){return!t||!t.tris?null:v.jsxs("div",{className:"mt-2 rounded-lg bg-zinc-800 p-2 text-[11px] text-zinc-400",children:[r&&v.jsxs("div",{className:`mb-1 flex items-center gap-1 font-medium ${r==="ok"?"text-green-400":"text-amber-400"}`,children:[r==="ok"?v.jsx(bm,{className:"h-4 w-4"}):v.jsx(Cm,{className:"h-4 w-4"}),r==="ok"?"Quality OK":"Please check"]}),(a??[]).map((c,d)=>v.jsxs("div",{className:"text-amber-300/90",children:["• ",c]},d)),v.jsxs("div",{className:"grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pt-1",children:[v.jsx("span",{className:"text-zinc-500",children:"Triangles"}),v.jsx("span",{children:t.tris}),v.jsx("span",{className:"text-zinc-500",children:"open edges"}),v.jsx("span",{children:t.boundary_edges}),v.jsx("span",{className:"text-zinc-500",children:"Height/Base"}),v.jsx("span",{children:t.height_ratio})]}),v.jsxs("div",{className:"pt-1 text-zinc-500",children:["→ synth_pieces/",i,"/",e,".obj"]}),v.jsxs("button",{onClick:()=>l(i,e),className:"mt-1 flex items-center gap-1 text-red-400/80 hover:text-red-400",children:[v.jsx(Ta,{className:"h-3.5 w-3.5"})," Delete piece"]})]})}function Oy({value:i,onChange:e,clayDisabled:t}){return v.jsxs("div",{className:"mt-2 flex overflow-hidden rounded-lg border border-zinc-700 text-xs",children:[v.jsx("button",{onClick:()=>e("textured"),className:`px-3 py-1 ${i==="textured"?"bg-sky-600 text-white":"text-zinc-400 hover:bg-zinc-700"}`,children:"Textured"}),v.jsx("button",{onClick:()=>e("clay"),disabled:t,title:t?"no clay image (piece prepared before this update)":"geometry only",className:`px-3 py-1 ${i==="clay"?"bg-sky-600 text-white":"text-zinc-400 hover:bg-zinc-700"} ${t?"cursor-not-allowed opacity-40":""}`,children:"Clay"})]})}const k2=[{to:"/collect",label:"Collect",icon:wm},{to:"/scan",label:"Scan",icon:J1},{to:"/datasets",label:"Datasets",icon:ow},{to:"/training",label:"Training",icon:tw}],z2=({isActive:i})=>`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${i?"bg-zinc-800 text-zinc-100":"text-zinc-400 hover:text-zinc-100"}`;function B2(){return v.jsx(O1,{children:v.jsxs("div",{className:"min-h-full",children:[v.jsx("header",{className:"sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur",children:v.jsxs("div",{className:"mx-auto flex max-w-7xl items-center gap-6 px-5 py-3",children:[v.jsxs("div",{className:"flex items-center gap-2 font-semibold tracking-tight",children:[v.jsx(aw,{className:"h-5 w-5 text-sky-400"})," chesslab"]}),v.jsx("nav",{className:"flex flex-wrap gap-1",children:k2.map(i=>{const e=i.icon;return v.jsxs(mo,{to:i.to,className:z2,children:[v.jsx(e,{className:"h-4 w-4"})," ",i.label]},i.to)})})]})}),v.jsx("main",{className:"mx-auto max-w-7xl px-5 py-6",children:v.jsxs(h1,{children:[v.jsx($i,{path:"/",element:v.jsx(uf,{to:"/collect",replace:!0})}),v.jsx($i,{path:"/collect",element:v.jsx(yw,{})}),v.jsx($i,{path:"/scan",element:v.jsx(N2,{})}),v.jsxs($i,{path:"/datasets",element:v.jsx(Mw,{}),children:[v.jsx($i,{index:!0,element:v.jsx(uf,{to:"sessions",replace:!0})}),v.jsx($i,{path:"sessions",element:v.jsx(bw,{})}),v.jsx($i,{path:"curated",element:v.jsx(Tw,{})}),v.jsx($i,{path:"stats",element:v.jsx(Cw,{})})]}),v.jsx($i,{path:"/training",element:v.jsx(Lw,{})}),v.jsx($i,{path:"*",element:v.jsx(uf,{to:"/collect",replace:!0})})]})})]})})}const H2=new ZM({defaultOptions:{queries:{staleTime:0,refetchOnWindowFocus:!0,refetchOnMount:"always",retry:1}}});TM.createRoot(document.getElementById("root")).render(v.jsx(yM.StrictMode,{children:v.jsx(JM,{client:H2,children:v.jsx(B2,{})})}));
