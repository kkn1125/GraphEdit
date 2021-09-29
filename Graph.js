'use strict';

const GRAPH = (function(){

    function Controller(){
        let moduleModel = null;
        let uiElements = null;

        this.init = function(model, ui){
            moduleModel = model;
            uiElements = ui;

            uiElements.readOnly.addEventListener("click", moduleModel.readOnlyToggle);
            uiElements.btn.addEventListener("click", this.addNewGraph);
            uiElements.wrap.addEventListener("click", this.deleteGraph);
        };

        this.addNewGraph = function(ev){
            const column = uiElements.column;
            const value = uiElements.value;
            moduleModel.addNewGraph(column, value);
        }

        this.deleteGraph = function(ev){
            const target = ev.target;
            if(target.tagName !== "SPAN" || target.className !== "del-btn") return;
            ev.preventDefault();
            moduleModel.deleteGraph(target.closest(".grp-set").querySelector(".column").innerText);
        }
        
    }

    function ExceptionHandler(){
        let moduleException = null;
        let uiElements = null;
        let exceptionWrap = null;

        this.init = function(exception, ui){
            moduleException = exception;
            uiElements = ui;
            exceptionWrap = document.createElement("div");
            exceptionWrap.classList.add("exceptionWrap");
            uiElements.body.append(exceptionWrap);
        }

        this.popupException = function(name, exception){
            let elem = new DOMParser().parseFromString(`
            <div class="invalid">
                ${name} >> [${exception.name}Exception] ${exception.message}
            </div>
            `, 'text/html').querySelector(".invalid");

            setTimeout(()=>{
                elem.classList.add("hide");
                setTimeout(()=>{
                    elem.remove();
                },1000);
            }, 3000);

            exceptionWrap.prepend(elem);
        }

        this.publicValidation = function(column, value, graphList){
            let c, v, d, n, l;
            c = true;
            v = true;
            d = false;
            n = true;
            l = true;

            for(let element of [column, value]){
                if(element.value.length == 0){
                    this.popupException(element.name, moduleException.zero);
                    c = false;
                } else if(element.value.match(/[\!\@\#\$\%\^\&\*\(\)\[\]\-\_\=\+\|\\\`\~\'\"\;\:\,\<\.\>\/\?]/gi)){
                    this.popupException(element.name, moduleException.spec);
                    v = false;
                } else if(element.name === 'value' && element.value.match(/[\D]/gi)){
                    this.popupException(element.name, moduleException.number);
                    n = false;
                } else if(element.name === 'value' && parseInt(element.value)>100){
                    this.popupException(element.name, moduleException.limit);
                    l = false;
                }
            }

            if(!c || !v || !n || !l){
                return false;
            }

            graphList.forEach(el=>{
                if(el.column == column.value){
                    d = true;
                }
            });

            if(d){
                this.popupException(column.name, moduleException.duplicate);
                return false;
            }

            return true;
        }

    }

    function Model(){
        let moduleView = null;
        let isReadOnly = null;
        let graphList = null;
        let moduleExceptionHandler = null;
        
        this.init = function(view, exception){
            moduleView = view;
            moduleExceptionHandler = exception;

            this.getGraphListFromLocalStorage();
            this.updateGraphList();
        };
        
        this.getGraphListFromLocalStorage = function(){
            graphList = localStorage.graphList ? JSON.parse(localStorage.graphList) : [];
        };

        this.setGraphListToLocalStorage = function(){
            localStorage.graphList = JSON.stringify(graphList);
        };

        this.updateGraphList = function(){
            moduleView.updateGraphList(graphList);
            this.setGraphListToLocalStorage(graphList);
        };

        this.addNewGraph = function(column, value){
            const newGraph = { column: column.value, value: value.value };
            let publicValidate = moduleExceptionHandler.publicValidation(column, value, graphList);
            if(publicValidate){
                graphList.push(newGraph);
                moduleView.clearInput();
            }
            this.updateGraphList();
        }

        this.deleteGraph = function(graph){
            graphList = graphList.filter(e => e.column != graph);
            this.updateGraphList();
        };
        
        this.readOnlyToggle = function(){
            isReadOnly = !isReadOnly;
            moduleView.readOnlyToggle(isReadOnly);
        };
    }

    function View(){
        let uiElements = null;
        this.init = function(ui){
            uiElements = ui;
        };

        this.updateGraphList = function(graphList){
            const graphListToForm = graph => `
            <div class="d-flex flex-wrap grp-set">
                <div class="column">${graph.column}</div>
                <div class="value">
                    <div class="bar-parent">
                    <div class="bar-child" style="width: ${parseInt(graph.value)>100?100:graph.value}%;">${graph.value}%</div>
                    </div>
                </div>
                <div class="d-flex align-items-center">
                    <span class="del-btn">&times;</span>
                </div>
            </div>
            `;
            let graphFormed = "";

            graphList.forEach(graph => {
                graphFormed += graphListToForm(graph);
            });

            uiElements.wrap.innerHTML = graphFormed;
        };

        this.clearInput = function(){
            uiElements.column.value = "";
            uiElements.value.value = "";
        }

        this.readOnlyToggle = function(isReadOnly){
            uiElements.column.disabled = isReadOnly;
            uiElements.value.disabled = isReadOnly;
            uiElements.btn.disabled = isReadOnly;
            uiElements.wrap.classList.toggle("readonly");
        };
    }

    return {
        init:function(){
            const body = document.body;
            const wrap = document.querySelector("#grp-wrap");
            // const graphList = document.querySelector("#grp-list");
            const column = document.querySelector("#column");
            const value = document.querySelector("#value");
            const btn = document.querySelector("#btn");
            const readOnly = document.querySelector("#readonly");

            const exception = {
                zero:{
                    name: "ZeroField",
                    message: "최소 1글자 이상 입력되어야 합니다."
                },
                spec:{
                    name: "SpecialCharacters",
                    message: "특수문자는 입력 불가합니다."
                },
                duplicate:{
                    name: "Duplicate",
                    message: "이미 같은 이름을 가진 그래프가 있습니다."
                },
                number:{
                    name: "Numeric",
                    message: "그래프 값에는 숫자만 올 수 있습니다."
                },
                limit:{
                    name: "NumberOutOfRange",
                    message: "0 ~ 100 까지의 숫자만 가능합니다."
                },
            }

            const ui = {
                body,
                wrap,
                column,
                value,
                btn,
                readOnly,
            }

            const view = new View();
            const model = new Model();
            const controller = new Controller();
            const exceptionHandler = new ExceptionHandler();

            view.init(ui);
            exceptionHandler.init(exception, ui);
            model.init(view, exceptionHandler);
            controller.init(model, ui);
        }
    }
})();