
/**
 * 响应式原理编译阶段要做的事情
 */

const compileUtil = {
    getValue(expr, vm){
        return expr.split('.').reduce((pre,cur) => {
            // console.log('pre',pre)
            // console.log('cur',cur)
            return pre[cur]
        }, vm.$data)
    },
    setValue(expr, vm, inputVal){
        return expr.split('.').reduce((pre,cur) => {
            pre[cur] = inputVal
        }, vm.$data)
    },
    getContentVal(expr, vm){
        return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
            return this.getValue(args[1], vm)
        })
    },
    text(node, expr, vm){
        // expr:msg {{}}
        let value
        if(expr.indexOf('{{') > -1){
            // 如果有{{}}
            value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
                // console.log(args[1])
                new Watcher(vm, args[1], () => {
                    this.updater.textUpdater(node, this.getContentVal(expr, vm))
                })
                return this.getValue(args[1], vm)
            })
        } else {
            new Watcher(vm,expr, (newVal) => {
                this.updater.textUpdater(node, newVal)
            })
            value = this.getValue(expr, vm)
        }
        this.updater.textUpdater(node,value)
    },
    html(node, expr, vm){
        const value = this.getValue(expr, vm)
        new Watcher(vm, expr, (newVal) => {
            this.updater.htmlUpdater(node,newVal)
        })
        this.updater.htmlUpdater(node,value)
    },
    model(node, expr, vm){
        const value = this.getValue(expr, vm)
        new Watcher(vm, expr, (newVal) => {
            this.updater.modelUpdater(node,newVal)
        })

        // 视图=》数据=》视图
        node.addEventListener('input', e => {
            this.setValue(expr, vm, e.target.value)
        })
        this.updater.modelUpdater(node,value)
    },
    on(node, expr, vm, event){
        // console.log(node)
        let fn = vm.$options.methods && vm.$options.methods[expr]
        node.addEventListener(event,fn.bind(vm, arguments), false) // 改变this指向
    },
    bind(node, expr, vm, attr){
        const value = this.getValue(expr, vm)
        this.updater.bindUpdater(node,value,attr)
    },
    updater:{
        textUpdater(node, value){
            node.textContent = value
        },
        htmlUpdater(node, value){
            node.innerHTML = value
        },
        modelUpdater(node, value){
            node.value = value
        },
        bindUpdater(node,value,attr){
            node.setAttribute(attr, value)
        }
    }
}
// 指令解析器
class Compile{
    constructor(el, vm){
        // 判断是否为元素节点
        this.el = this.isElementNode(el) ? el : document.querySelector(el)
        this.vm = vm 
        // 1、获取文档碎片对象范茹内存，减少页面的回流重绘
        var fragment = this.nodeFragment(this.el)
        // 编译
        this.compile(fragment)
        // 追加子元素到根元素
        this.el.appendChild(fragment)
    }
    compile(fragment){
        const childNodes = Array.prototype.slice.call(fragment.childNodes)
        childNodes.forEach(child => {
            if(this.isElementNode(child)){
                // 如果是元素节点
                // 编译元素节点
                // console.log('元素节点',child)
                this.compileNode(child)
            } else {
                // 文本节点
                // 编译文本节点
                // console.log('文本节点',child)
                this.compileText(child)
            }
            // 如果子节点还有子节点，则递归遍历
            if(child && child.childNodes.length){
                this.compile(child)
            }
        })
    }
    compileNode(node){
        //编译元素节点
        const attributes = [...node.attributes]
        // console.log('node',node)
        // console.log('attributes',attributes)
        attributes.forEach(attr => {
            const {name, value} = attr
            // console.log(name, value)
            // 判断name是否为一个指令
            if(this.isDirective(name)){
                // 如果是一个指令
                const [,directive] = name.split('-') //例如text html model on:click
                const [dirName, eventName] = directive.split(':')
                compileUtil[dirName](node, value, this.vm, eventName)

                // 删除标签上的指令属性
                node.removeAttribute('v-' + directive)
            } else if(this.isEventName(name)){
                const [,eventName] = name.split('@') //@click = ''
                compileUtil['on'](node, value, this.vm, eventName)

            }
        })
    }
    isEventName(attrName){
        return attrName.startsWith('@')
    }
    isDirective(attrName){
        //判断是否为指令
        return attrName.startsWith('v-')
    }
    compileText(node){
        //编译文本节点
        // console.log('文本节点', node.textContent)
        if(/\{\{(.+?)\}\}/.test(node.textContent)){
            // console.log('node.textContent',node.textContent)
            compileUtil['text'](node, node.textContent, this.vm)

        }
    }
    nodeFragment(el){
        //创建文档碎片
        const f = document.createDocumentFragment()
        let firstChild
        while(firstChild = el.firstChild){
            f.appendChild(firstChild)
        }
        return f
    }
    isElementNode(node){
        return node.nodeType === 1
    }
}
class FVue{
    constructor(options){
        this.$el = options.el 
        this.$data = options.data
        this.$options = options
        if(this.$el){
            // 1、实现一个数据的观察者
            new Observer(this.$data)
            //2、实现一个指令解析器
            new Compile(this.$el, this)
            this.proxyData(this.$data)
        }
    }
    proxyData(data){
        for(const key in data){
            Object.defineProperty(this, key, {
                get(){
                    return data[key]
                },
                set(newVal){
                    data[key] = newVal
                }
            })
        }
        console.log(this, 'this')
    }
}
