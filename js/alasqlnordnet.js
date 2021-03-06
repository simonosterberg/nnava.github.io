define(['./alasqlstockdata'], function(alasqlstockdata) {
    
    function createDataTable() {
        alasql('CREATE TABLE IF NOT EXISTS NordnetData (  \
                [Id] NUMBER, \
                Konto NVARCHAR(100), \
                [Affärsdag] DATE, \
                Antal NVARCHAR(50), \
                Avgifter NVARCHAR(50), \
                Belopp NVARCHAR(50), \
                [Bokföringsdag] DATE, \
                ISIN NVARCHAR(50), \
                Instrumenttyp NVARCHAR(20), \
                Kurs DECIMAL, \
                Likviddag DATE, \
                Makuleringsdatum DATE, \
                Transaktionstyp NVARCHAR(100), \
                Valuta NVARCHAR(10), \
                [Värdepapper] NVARCHAR(100), \
                [Transaktionstext] NVARCHAR(100), \
                [Totalt antal] NVARCHAR(50)); \
                \
                CREATE INDEX AffarsdagIndex ON NordnetData([Affärsdag]); \
                CREATE INDEX TransaktionstextIndex ON NordnetData([Transaktionstext]); \
                CREATE INDEX ISINIndex ON NordnetData(ISIN); \
                CREATE INDEX TransaktionstypIndex ON NordnetData([Transaktionstyp]); \
                CREATE INDEX VardepapperIndex ON NordnetData([Värdepapper]); \
                CREATE INDEX BeloppIndex ON NordnetData([Belopp]); \
        ');        
    }

    function createPortfolioTable() {
        alasql('CREATE TABLE IF NOT EXISTS NordnetPortfolio ( \
                [Id] NUMBER, \
                Konto NVARCHAR(100)); \
                \
                CREATE INDEX KontoIndex ON NordnetPortfolio(Konto); \
        ');
    }

    function getSelectedPortfolios() {
        return alasql('SELECT [Id], Konto FROM NordnetPortfolio ORDER BY Konto');
    }

    function truncatePortfolioData() {
        alasql('TRUNCATE TABLE NordnetPortfolio;');
    }

    function insertPortfolioData(id, konto) {
        alasql('INSERT INTO NordnetPortfolio VALUES (' + id + ',"' + konto + '");');
    }

    function getDividendMaxYear() {
        return alasql('SELECT MAX(YEAR([Likviddag])) AS Year \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE Transaktionstyp = "UTDELNING"');
    }

    function getDividendYears() {
        return alasql('SELECT FIRST(YEAR([Likviddag])) AS Year \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE Transaktionstyp = "UTDELNING" \
                       GROUP BY YEAR([Likviddag]) \
                       ORDER BY 1');
    }

    function getBuyTransactionYears() {
        return alasql('SELECT FIRST(YEAR([Bokföringsdag])) AS Year \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE Transaktionstyp = "KÖPT" \
                       GROUP BY YEAR([Bokföringsdag]) \
                       ORDER BY 1');
    }

    function getSellTransactionYears() {
        return alasql('SELECT FIRST(YEAR([Bokföringsdag])) AS Year \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE Transaktionstyp = "SÅLT" \
                       GROUP BY YEAR([Bokföringsdag]) \
                       ORDER BY 1');
    }

    function getTransactionYears() {
        return alasql('SELECT FIRST(YEAR([Bokföringsdag])) AS Year \
                FROM NordnetData \
                JOIN NordnetPortfolio USING Konto, Konto \
                WHERE (Transaktionstyp = "SÅLT" OR Transaktionstyp = "KÖPT") \
                GROUP BY YEAR([Bokföringsdag]) \
                ORDER BY 1');
    }

    function getDepositYears() {
        return alasql('SELECT FIRST(YEAR([Bokföringsdag])) AS Year \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE (Transaktionstyp = "KORR PREMIEINB." OR Transaktionstyp = "UTTAG" OR Transaktionstyp = "REALTIDSINSÄTTNING" OR Transaktionstyp = "INSÄTTNING" OR Transaktionstyp = "PREMIEINBETALNING") \
                       GROUP BY YEAR([Bokföringsdag]) \
                       ORDER BY 1');
    }

    function getCourtageYears() {
        return alasql('SELECT FIRST(YEAR([Bokföringsdag])) AS Year \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE (Transaktionstyp = "KÖPT" OR Transaktionstyp = "SÅLT") \
                       GROUP BY YEAR([Bokföringsdag]) \
                       ORDER BY 1');
    }

    function getDividendAll(addTaxToSum) {
        var taxSqlWhere = '';
        if(addTaxToSum)
            taxSqlWhere = ' OR Transaktionstyp = "UTL KUPSKATT" OR Transaktionstyp = "TYSK SOL SKATT UTD" OR Transaktionstyp = "MAK UTL KUPSKATT"';

        return alasql('SELECT FIRST(YEAR([Likviddag])) AS Year, SUM(REPLACE(Belopp, " ", "")::NUMBER) AS Belopp \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE (Transaktionstyp = "UTDELNING" OR Transaktionstyp = "MAK UTDELNING"' + taxSqlWhere +') \
                       GROUP BY YEAR([Likviddag]) \
                       ORDER BY 1');
    }

    function getReceivedDividendCurrentYearToDate(year, today) {

        var resultForReturn = [];
        var portfoliosResult = getSelectedPortfolios();

        portfoliosResult.forEach(function(portfolioObject) {

            var result = alasql('SELECT FIRST([Värdepapper]) AS [Värdepapper], FIRST(ISIN) AS ISIN, FIRST([Likviddag]) AS Datum, \
                                FIRST(REPLACE(Antal, " ", "")) AS Antal, LAST(Kurs) AS Kurs, MONTH(FIRST([Likviddag])) AS [Månad], \
                                SUM(REPLACE(Belopp, " ", "")::NUMBER) AS Belopp \
                                FROM NordnetData \
                                WHERE (Transaktionstyp = "UTDELNING" OR Transaktionstyp = "MAK UTDELNING" OR Transaktionstyp = "UTL KUPSKATT" OR Transaktionstyp = "TYSK SOL SKATT UTD" OR Transaktionstyp = "MAK UTL KUPSKATT") \
                                AND YEAR([Likviddag]) = ' + year + ' AND [Likviddag] <= "' + today + '" \
                                AND Konto = "' + portfolioObject.Konto + '" AND ISIN != "" \
                                GROUP BY ISIN, MONTH([Likviddag])');

            result.forEach(function(object) {
                if(object == null) return;
                if(object.Antal == null) return;
                
                var newObject = new Object();

                var värdepapperNamn = object.Värdepapper;
                var värdepapperNamnStockData = alasqlstockdata.getVärdepapperNamn(object.ISIN);
                if(värdepapperNamnStockData.length != 0)
                    värdepapperNamn = värdepapperNamnStockData[0].namn;

                newObject.Värdepapper = värdepapperNamn;
                newObject.ISIN = object.ISIN;
                newObject.Datum = object.Datum;
                newObject.Antal = object.Antal;
                newObject.Kurs = object.Kurs;
                newObject.Månad = object.Månad;
                newObject.Belopp = object.Belopp;

                resultForReturn.push(newObject);
            });

        });

        return resultForReturn;
    }

    function getDividendMonthSumBelopp(year, month) {
        var result = alasql('SELECT SUM(REPLACE(Belopp, " ", "")::NUMBER) AS Belopp \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE YEAR([Likviddag]) = ' + year + ' AND MONTH([Likviddag]) = ' + month + ' \
                       AND (Transaktionstyp = "UTDELNING" OR Transaktionstyp = "MAK UTDELNING")');

        var belopp = JSON.parse(JSON.stringify(result));
        if(belopp["0"].Belopp == null) return 0;

        return Math.round(belopp["0"].Belopp);
    }

    function getTaxMonthSumBelopp(year, month) {
        var result = alasql('SELECT SUM(REPLACE(Belopp, " ", "")::NUMBER) AS Belopp \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE YEAR([Likviddag]) = ' + year + ' AND MONTH([Likviddag]) = ' + month + ' \
                       AND (Transaktionstyp = "UTL KUPSKATT" OR Transaktionstyp = "TYSK SOL SKATT UTD" OR Transaktionstyp = "MAK UTL KUPSKATT")');

        var belopp = JSON.parse(JSON.stringify(result));
        if(belopp["0"].Belopp == null) return 0;

        return Math.round(belopp["0"].Belopp);
    }

    function getDividendYearSumBelopp(year) {
        var result = alasql('SELECT SUM(REPLACE(Belopp, " ", "")::NUMBER) AS Belopp \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE YEAR([Likviddag]) = ' + year + ' \
                       AND (Transaktionstyp = "UTDELNING" OR Transaktionstyp = "MAK UTDELNING")');

        var belopp = JSON.parse(JSON.stringify(result));
        if(belopp["0"].Belopp == null) return 0;

        return belopp["0"].Belopp;
    }

    function getTaxYearSumBelopp(year) {
        var result = alasql('SELECT SUM(REPLACE(Belopp, " ", "")::NUMBER) AS Belopp \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE YEAR([Likviddag]) = ' + year + ' \
                       AND (Transaktionstyp = "UTL KUPSKATT" OR Transaktionstyp = "TYSK SOL SKATT UTD" OR Transaktionstyp = "MAK UTL KUPSKATT")');

        var belopp = JSON.parse(JSON.stringify(result));
        if(belopp["0"].Belopp == null) return 0;

        return belopp["0"].Belopp;
    }

    function getDepositsYearSumBelopp(year) {
        var result = alasql('SELECT SUM(REPLACE(Belopp, " ", "")::NUMBER) AS Belopp \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE YEAR([Bokföringsdag]) = ' + year + ' AND (Transaktionstyp = "KORR PREMIEINB." OR Transaktionstyp = "UTTAG" OR Transaktionstyp = "REALTIDSINSÄTTNING" OR Transaktionstyp = "INSÄTTNING" OR Transaktionstyp = "PREMIEINBETALNING")');
        
        var belopp = JSON.parse(JSON.stringify(result));
        if(belopp["0"].Belopp == null) return 0;

        return belopp["0"].Belopp;
    }

    function getTotalDividend(startPeriod, endPeriod, addTaxToSum) {
        var taxSqlWhere = '';
        if(addTaxToSum)
            taxSqlWhere = ' OR Transaktionstyp = "UTL KUPSKATT" OR Transaktionstyp = "TYSK SOL SKATT UTD" OR Transaktionstyp = "MAK UTL KUPSKATT"';
 
        var result = alasql('SELECT SUM(REPLACE(Belopp, " ", "")::NUMBER) AS Belopp \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE [Likviddag] >= "' + startPeriod.toISOString().slice(0, 10) + '" AND [Likviddag] <= "' + endPeriod.toISOString().slice(0, 10) + '" AND (Transaktionstyp = "UTDELNING" OR Transaktionstyp = "MAK UTDELNING"'  + taxSqlWhere + ")");

        var belopp = JSON.parse(JSON.stringify(result));
        if(belopp["0"].Belopp == null) return 0;

        return belopp["0"].Belopp;              
    }

    function getVardepapperTotalDividend(startPeriod, endPeriod, addTaxToSum) {
        var taxSqlWhere = '';
        if(addTaxToSum)
            taxSqlWhere = ' OR Transaktionstyp = "UTL KUPSKATT" OR Transaktionstyp = "TYSK SOL SKATT UTD" OR Transaktionstyp = "MAK UTL KUPSKATT"';

        var result = alasql('SELECT FIRST([ISIN]) AS [ISIN], FIRST([Värdepapper]) AS [name], SUM(REPLACE(Belopp, " ", "")::NUMBER) AS [belopp] \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE [Likviddag] >= "' + startPeriod.toISOString().slice(0, 10) + '" AND [Likviddag] <= "' + endPeriod.toISOString().slice(0, 10) + '" AND (Transaktionstyp = "UTDELNING" OR Transaktionstyp = "MAK UTDELNING"' + taxSqlWhere + ') \
                       GROUP BY [ISIN]');

        var resultForReturn = [];
        result.forEach(function(object) {
            if(object == null) return;
            if(object.name == null) return;

            var newVardepapperObject = new Object();

            var resultName = alasql('SELECT DISTINCT namn \
                       FROM StockData \
                       WHERE [isin] = "' + object.ISIN + '"');

            var name = object.name;
            if(resultName.length != 0)
                name = resultName["0"].namn;

            newVardepapperObject.name = name;
            newVardepapperObject.value = object.belopp;

            resultForReturn.push(newVardepapperObject);
        });

        return resultForReturn;
    }

    function getBuyTransactionCount(year, month) {

        var result = alasql('SELECT COUNT(*) AS TransactionCount \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE YEAR([Bokföringsdag]) = ' + year + ' AND MONTH([Bokföringsdag]) = ' + month + ' \
                       AND Transaktionstyp = "KÖPT"');

        var count = JSON.parse(JSON.stringify(result));
        if(count["0"].TransactionCount == null) return 0;

        return parseInt(count["0"].TransactionCount);
    }

    function getSellTransactionCount(year, month) {

        var result = alasql('SELECT COUNT(*) AS TransactionCount \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE YEAR([Bokföringsdag]) = ' + year + ' AND MONTH([Bokföringsdag]) = ' + month + ' \
                       AND Transaktionstyp = "SÅLT"');

        var count = JSON.parse(JSON.stringify(result));
        if(count["0"].TransactionCount == null) return 0;

        return parseInt(count["0"].TransactionCount);
    }

    function getVärdepapperForPeriod(startPeriod, endPeriod) {
        return alasql('SELECT DISTINCT [Värdepapper] AS Vardepapper, [ISIN] AS ISIN \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE [Likviddag] >= "' + startPeriod.toISOString().slice(0, 10) + '" AND [Likviddag] <= "' + endPeriod.toISOString().slice(0, 10) + '" AND (Transaktionstyp = "UTDELNING" OR Transaktionstyp = "MAK UTDELNING")');
    }

    function getVärdepapperDividend(year, month, addTaxToSum) {
        var taxSqlWhere = '';
        if(addTaxToSum)
            taxSqlWhere = ' OR Transaktionstyp = "UTL KUPSKATT" OR Transaktionstyp = "TYSK SOL SKATT UTD" OR Transaktionstyp = "MAK UTL KUPSKATT"';

        return alasql('SELECT FIRST([ISIN]) AS [ISIN], SUM(REPLACE(Belopp, " ", "")::NUMBER) AS [Belopp] \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE YEAR([Likviddag]) = ' + year + ' AND MONTH([Likviddag]) = ' + month + ' AND (Transaktionstyp = "UTDELNING" OR Transaktionstyp = "MAK UTDELNING"' + taxSqlWhere + ') \
                       GROUP BY [ISIN]');
    }

    function getCourtageSumSell(year) {
        var result = alasql('SELECT SUM(REPLACE(Avgifter, " ", "")::NUMBER) AS [value] \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE YEAR([Bokföringsdag]) = ' + year + ' AND Transaktionstyp = "SÅLT"');

        var courtage = JSON.parse(JSON.stringify(result));
        if(courtage["0"].value == null) return 0;

        return courtage["0"].value;
    }

    function getCourtageSumBuy(year) {
        var result = alasql('SELECT SUM(REPLACE(Avgifter, " ", "")::NUMBER) AS [value] \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE YEAR([Bokföringsdag]) = ' + year + ' AND Transaktionstyp = "KÖPT"');

        var courtage = JSON.parse(JSON.stringify(result));
        if(courtage["0"].value == null) return 0;

        return courtage["0"].value;
    }

    function getBuyTransactionSumBelopp(year) {
        return alasql('SELECT VALUE SUM(REPLACE(Belopp, " ", "")::NUMBER) AS [value] \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE YEAR([Bokföringsdag]) = ' + year + ' AND Transaktionstyp = "KÖPT"');
    }

    function getSellTransactionSumBelopp(year) {
        return alasql('SELECT VALUE SUM(REPLACE(Belopp, " ", "")::NUMBER) AS [value] \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE YEAR([Bokföringsdag]) = ' + year + ' AND Transaktionstyp = "SÅLT"');
    }

    function getReturnedTaxYearSumBelopp(year) {
        return alasql('SELECT VALUE SUM(REPLACE(Belopp, " ", "")::NUMBER) AS Belopp \
                       FROM NordnetData \
                       JOIN NordnetPortfolio USING Konto, Konto \
                       WHERE YEAR([Likviddag]) = ' + year + ' AND Transaktionstext = "UTL KUPSKATT ÅTER"');    
    }

    function getStocksInPortfolio() {

        var resultForReturn = [];
        var portfoliosResult = getSelectedPortfolios();

        portfoliosResult.forEach(function(portfolioObject) {

            var result = alasql('SELECT FIRST([Id]) AS [Id], FIRST([Värdepapper]) AS [Värdepapper], \
                                FIRST(NordnetData.ISIN) AS ISIN, FIRST(StockData.handlas) AS Handlas, \
                                FIRST(StockData.bransch) AS Bransch, FIRST(StockData.yahoosymbol) AS YahooSymbol, FIRST(REPLACE([Totalt antal], " ", "")) AS Antal \
                                FROM NordnetData \
                                INNER JOIN StockData ON StockData.isin = NordnetData.ISIN \
                                WHERE ([Transaktionstyp] = "OMVANDLING INLÄGG VP" OR [Transaktionstyp] = "UTTAG VP RESULTAT" OR [Transaktionstyp] = "EM INLÄGG VP" OR [Transaktionstyp] = "BYTE INLÄGG VP" \
                                OR [Transaktionstyp] = "SPLIT INLÄGG VP" OR [Transaktionstyp] = "KÖPT" OR [Transaktionstyp] = "INLÄGG VP" OR [Transaktionstyp] = "INLÄGG FISSION" \
                                OR [Transaktionstyp] = "TECKNING INLÄGG VP" OR [Transaktionstyp] = "BYTE UTTAG VP" OR [Transaktionstyp] = "MAK SPLIT INLÄGG VP" \
                                OR [Transaktionstyp] = "MAK SPLIT UTTAG VP" OR [Transaktionstyp] = "SPLIT UTTAG VP" OR [Transaktionstyp] = "SÅLT" OR [Transaktionstyp] = "UTTAG VP") \
                                AND [Värdepapper] NOT LIKE "%TILLDELNING" \
                                AND [Konto] = "' + portfolioObject.Konto + '" \
                                GROUP BY [ISIN] \
                                ORDER BY [Id] DESC');     

            result.forEach(function(object) {
                if(object == null) return;
                var antal = object.Antal;
                if(antal == null) return;
                if(antal <= 0) return;
                antal = parseInt(antal);
                if(antal <= 0) return;
                
                var newObject = new Object();

                var värdepapperNamn = object.Värdepapper;
                var värdepapperNamnStockData = alasqlstockdata.getVärdepapperNamn(object.ISIN);
                if(värdepapperNamnStockData.length != 0)
                    värdepapperNamn = värdepapperNamnStockData[0].namn;

                newObject.Värdepapper = värdepapperNamn;
                newObject.Antal = antal;
                newObject.YahooSymbol = object.YahooSymbol;
                newObject.Bransch = object.Bransch;
                newObject.Valuta = object.Handlas;
                newObject.ISIN = object.ISIN;

                resultForReturn.push(newObject);
            });

        });

        return resultForReturn;
    }

    function getPurchaseBeloppValue(isin) {
        var belopp = Math.abs(alasql('SELECT VALUE SUM(REPLACE(Belopp, " ", "")::NUMBER) \
                             FROM NordnetData \
                             JOIN NordnetPortfolio USING Konto, Konto \
                             WHERE ISIN = "' + isin + '" \
                             AND [Värdepapper] NOT LIKE "%TILLDELNING" \
                             AND ([Transaktionstyp] = "KÖPT" OR [Transaktionstyp] = "OMVANDLING INLÄGG VP" OR [Transaktionstyp] = "BYTE INLÄGG VP")'));
        if(isNaN(belopp))
            return 0;

        return belopp;
    }
    
    function getPurchaseAntalValue(isin) {
        var antal = alasql('SELECT VALUE SUM(REPLACE(Antal, " ", "")::NUMBER) \
                             FROM NordnetData \
                             JOIN NordnetPortfolio USING Konto, Konto \
                             WHERE ISIN = "' + isin + '" \
                             AND [Värdepapper] NOT LIKE "%TILLDELNING" \
                             AND ([Transaktionstyp] = "KÖPT" OR [Transaktionstyp] = "OMVANDLING INLÄGG VP" OR [Transaktionstyp] = "BYTE INLÄGG VP")');

        if(isNaN(antal))
            return 0;

        return antal;
    }

    function hasDataTableRows() {
        var resultCount = alasql('SELECT VALUE COUNT(*) FROM NordnetData');
        return resultCount == 0 ? false : true;
    }

    return {
        createDataTable: createDataTable,
        createPortfolioTable: createPortfolioTable,
        truncatePortfolioData: truncatePortfolioData,
        getStocksInPortfolio: getStocksInPortfolio,
        getSelectedPortfolios: getSelectedPortfolios,
        insertPortfolioData: insertPortfolioData,
        getReturnedTaxYearSumBelopp: getReturnedTaxYearSumBelopp,
        getDividendMaxYear: getDividendMaxYear,
        getDividendYears: getDividendYears,
        getDividendMonthSumBelopp: getDividendMonthSumBelopp,
        getTaxMonthSumBelopp: getTaxMonthSumBelopp,
        getDividendYearSumBelopp: getDividendYearSumBelopp,
        getTotalDividend: getTotalDividend,
        getVardepapperTotalDividend: getVardepapperTotalDividend,
        getTaxYearSumBelopp: getTaxYearSumBelopp,
        getDepositsYearSumBelopp: getDepositsYearSumBelopp,
        getDepositYears: getDepositYears,
        getBuyTransactionYears: getBuyTransactionYears,
        getBuyTransactionCount: getBuyTransactionCount,
        getSellTransactionYears: getSellTransactionYears,
        getSellTransactionCount: getSellTransactionCount,
        getDividendAll: getDividendAll,
        getVärdepapperDividend: getVärdepapperDividend,
        getVärdepapperForPeriod: getVärdepapperForPeriod,
        getCourtageSumBuy: getCourtageSumBuy,
        getCourtageSumSell: getCourtageSumSell,
        getCourtageYears: getCourtageYears,
        getBuyTransactionSumBelopp: getBuyTransactionSumBelopp,
        getSellTransactionSumBelopp: getSellTransactionSumBelopp,
        getTransactionYears: getTransactionYears,
        getReceivedDividendCurrentYearToDate: getReceivedDividendCurrentYearToDate,
        getPurchaseBeloppValue: getPurchaseBeloppValue,
        getPurchaseAntalValue: getPurchaseAntalValue,
        hasDataTableRows: hasDataTableRows
    };
});