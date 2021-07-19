class Watcher{
    constructor(vm, expr, cb) {
        console.log('expr', expr)
        this.vm = vm
        this.expr = expr
        this.cb = cb
        this.oldVal = this.getOldVal() // 保存旧值
    }
    getOldVal(){
        Dep.target = this
        let oldVal = compileUtil.getValue(this.expr, this.vm)
        Dep.target = null
        return oldVal
    }
    update(){
        const newVal = compileUtil.getValue(this.expr, this.vm)
        if(newVal !== this.oldVal){
            this.cb(newVal)
        }
    }
}
class Dep {
    constructor(){
        this.subs = []
    }
    // 收集观察者
    addSub(watcher){
        this.subs.push(watcher)
    }
    // 通知观察者更新
    notify(){
        console.log(this.subs)
        this.subs.forEach(w => {
            w.update()
        })
    }
}
class Observer {
    constructor(data){
        this.observe(data)
    }
    observe(data){
        if(data && typeof data === 'object'){
            Object.keys(data).forEach(key => {
                // 劫持各个属性值
                this.hijack(data, key, data[key])
            })
        }
    }
    hijack(obj, key, value){
        this.observe(value)
        const dep = new Dep()
        Object.defineProperty(obj, key, {
            get(){
                // 订阅数据变化时，往dep中添加观察者
                Dep.target && dep.addSub(Dep.target)
                return value
            },
            set: (newVal) => {
                if(newVal !== value){
                    this.observe(newVal)
                    value = newVal
                    dep.notify() // 通知变化
                }
            }
        })
    }
}