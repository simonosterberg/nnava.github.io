define(['./alasqlportfoliodividenddata', './monthstaticvalues'], function(alasqlportfoliodividenddata, monthstaticvalues) {

    var gridData = [];
    var gridId;
    var months = monthstaticvalues.getMonthWithLettersValues();
    var currentMonth = new Date().getMonth();

    function setId(fieldId) {
        gridId = fieldId;
    }

    function setData() {

        var currentYear = new Date().getFullYear();
        var result = alasqlportfoliodividenddata.getPortfolioDividends(currentYear);
        var data = [];
        var id = 0;

        result.forEach(function(entry) {
            if(entry == null) return;

            var månad = months[entry.Månad -1];

            data.push({ 
                Id: id,
                Name : entry.Värdepapper,
                Antal : entry.Antal,
                Typ: entry.Typ,
                Månad: månad,
                Utdelningsdatum : entry.Utdelningsdag,
                Utdelningsbelopp : entry.UtdelningaktieValuta,
                Utdelningtotal: entry.Belopp,
                Land: entry.Land.toLowerCase()
            });

            id++;
        });

        gridData = data;
    }

    function onDataBound(e) {
        var columns = e.sender.columns;
        var dataItems = e.sender.dataSource.view();
        var today = new Date().toISOString();
        for (var j = 0; j < dataItems.length; j++) {

            if(dataItems[j].items == null) return;
            
            for (var i = 0; i < dataItems[j].items.length; i++) {
                var utdelningsdatum = new Date(dataItems[j].items[i].get("Utdelningsdatum")).toISOString();
                var row = e.sender.tbody.find("[data-uid='" + dataItems[j].items[i].uid + "']");
                if(utdelningsdatum <= today)
                    row.addClass("grid-ok-row");
            }
        }                
    }

    function load() {
        var today = new Date().toISOString().slice(0, 10);

        var grid = $(gridId).kendoGrid({
            toolbar: ["excel", "pdf"],
            excel: {
                fileName: "förväntade_utdelningar" + "_" + today + ".xlsx",
                filterable: true
            },
            pdf: {
                fileName: "förväntade_utdelningar" + "_" + today + ".pdf",
                allPages: true,
                avoidLinks: true,
                paperSize: "A4",
                margin: { top: "2cm", left: "1cm", right: "1cm", bottom: "1cm" },
                landscape: true,
                repeatHeaders: true,
                scale: 0.8
            },
            theme: "bootstrap",
            dataBound: onDataBound,
            dataSource: {
                data: gridData,
                schema: {
                    model: {
                        fields: {
                            Name: { type: "string" },
                            Antal: { type: "number" },
                            Typ: { type: "string" },
                            Utdelningsdatum: { type: "date" },
                            Utdelningsbelopp: { type: "string" },
                            Utdelningtotal: { type: "number"},
                            Land: {type: "string" }
                        }
                    }
                },
                group: {
                    field: "Månad", dir: "asc", aggregates: [
                        { field: "Månad", aggregate: "sum" },
                        { field: "Name", aggregate: "count" },
                        { field: "Utdelningtotal", aggregate: "sum"}
                    ]
                },
                aggregate: [ { field: "Månad", aggregate: "sum" },
                             { field: "Name", aggregate: "count" },
                             { field: "Utdelningtotal", aggregate: "sum" }
                ],
                sort: ({ field: "Utdelningsdatum", dir: "asc" }),                        
                pageSize: gridData.length
            },
            scrollable: true,
            sortable: true,
            filterable: true,
            groupable: true,
            pageable: false,
            columns: [
                { field: "Månad", groupHeaderTemplate: "#= value.substring(2, value.length) #", hidden: true },
                { field: "Name", title: "Värdepapper", template: "<div class='gridportfolio-country-picture' style='background-image: url(/styles/images/#:data.Land#.png);'></div><div class='gridportfolio-country-name'>#: Name #</div>", width: "170px", aggregates: ["count"], footerTemplate: "Totalt antal förväntade utdelningar: #=count# st", groupFooterTemplate: gridNameGroupFooterTemplate },
                { field: "Utdelningsdatum", title: "Utd/Handl. utan utd", format: "{0:yyyy-MM-dd}", width: "75px" },
                { field: "Typ", title: "Typ", width: "70px" },
                { field: "Antal", title: "Antal", format: "{0} st", width: "50px" },
                { field: "Utdelningsbelopp", title: "Utdelning/aktie", width: "60px" }, 
                { field: "Utdelningtotal", title: "Belopp", width: "100px", format: "{0:n2} kr", aggregates: ["sum"], footerTemplate: "Totalt förväntat belopp: #= kendo.toString(sum, 'n2') # kr", groupFooterTemplate: gridUtdelningtotalGroupFooterTemplate },
            ],
            excelExport: function(e) {
                var sheet = e.workbook.sheets[0];
                for (var i = 0; i < sheet.columns.length; i++) {
                    sheet.columns[i].width = getExcelColumnWidth(i);
                }
            }
        }).data("kendoGrid");

        grid.thead.kendoTooltip({
            filter: "th",
            content: function (e) {
                var target = e.target; 
                return $(target).text();
            }
        });
    }

    function getExcelColumnWidth(index) {
        var columnWidth = 150;
        
        switch(index) {
            case 0: // Månad
                columnWidth = 80;
                break;
            case 1: // Värdepapper
                columnWidth = 220;
                break;   
            case 2: // Datum
                columnWidth = 80;
                break;     
            case 3: // Typ
                columnWidth = 130;
                break;     
            case 4: // Antal
                columnWidth = 70;
                break;  
            case 5: // Utdelning/aktie
                columnWidth = 120;
                break;  
            case 6: // Belopp
                columnWidth = 260;
                break;                               
            default:
                columnWidth = 150;
        }

        return columnWidth;
    }

    function gridNameGroupFooterTemplate(e) {
        var groupNameValue = e.Månad.sum;
        if(typeof e.Name.group !== 'undefined')
            groupNameValue = e.Name.group.value;

        var groupMonthValue = months.indexOf(groupNameValue);        
        if(currentMonth <= groupMonthValue) {
            return "Antal förväntade utdelningar: " + e.Name.count + " st";
        }
        else {
            return "Antal erhållna utdelningar: " + e.Name.count + " st";
        }
    }

    function gridUtdelningtotalGroupFooterTemplate(e) {
        var groupNameValue = e.Månad.sum;
        if(typeof e.Name.group !== 'undefined')
            groupNameValue = e.Name.group.value;

        var sum = kendo.toString(e.Utdelningtotal.sum, 'n2') + " kr"; 
        var monthName = groupNameValue.substring(3, groupNameValue.length).toLowerCase();
        if(months.includes(groupNameValue)) {
            var groupMonthValue = months.indexOf(groupNameValue);                   
            if(currentMonth <= groupMonthValue) {
                return "Förväntat belopp för " + monthName + ": " + sum;
            }
            else {
                return "Erhållet belopp för " + monthName + ": " + sum;
            }   
        }
        else {
            return "Förväntat belopp för " + groupNameValue + ": " + sum;
        }     
    }

    return {
        setId: setId,
        setData: setData,
        load: load
    };
});