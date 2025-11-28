const XLSX = require('xlsx');
const path = require('path');

class ExcelReader {
    constructor(filePath) {
        this.filePath = filePath;
        this.data = [];
        this.columns = [];
        this.loadData();
    }

    loadData() {
        try {
            const workbook = XLSX.readFile(this.filePath);
            const sheetName = 'Feuil1';
            const worksheet = workbook.Sheets[sheetName];

            if (!worksheet) {
                console.error(`ERREUR: La feuille "${sheetName}" n'a pas été trouvée dans le fichier.`);
                console.log(`Feuilles disponibles dans le fichier: ${workbook.SheetNames.join(', ')}`);
                return;
            }

            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            this.columns = jsonData[0].map(col => col.trim()); this.data = jsonData.slice(1).map(row => {
                const obj = {};
                this.columns.forEach((col, index) => {
                    obj[col] = row[index];
                });
                return obj;
            });

            console.log(`Chargé ${this.data.length} enregistrements avec ${this.columns.length} colonnes depuis la feuille "${sheetName}".`);
        } catch (error) {
            console.error('Erreur lors du chargement du fichier Excel:', error);
        }
    }
    reloadData() {
        this.data = [];
        this.columns = [];
        this.loadData();
    }

    getAllData() {
        return this.data;
    }

    getColumns() {
        return this.columns;
    }

    search(query) {
        query = query.toLowerCase();
        return this.data.filter(row => {
            return Object.values(row).some(value =>
                value && value.toString().toLowerCase().includes(query)
            );
        });
    }

    searchByColumn(column, query) {
        column = column.toLowerCase();
        query = query.toLowerCase();

        const columnIndex = this.columns.findIndex(col =>
            col.toLowerCase() === column
        );

        if (columnIndex === -1) {
            return [];
        }

        const columnName = this.columns[columnIndex];
        return this.data.filter(row => {
            return row[columnName] &&
                row[columnName].toString().toLowerCase().includes(query);
        });
    }

    filter(conditions) {
        return this.data.filter(row => {
            return conditions.every(condition => {
                const [column, value] = condition.split('=');
                const columnName = this.columns.find(col =>
                    col.toLowerCase() === column.toLowerCase()
                );

                if (!columnName) return false;

                return row[columnName] &&
                    row[columnName].toString().toLowerCase() === value.toLowerCase();
            });
        });
    }

    getStats() {
        const stats = {
            totalRecords: this.data.length,
            columns: this.columns.length
        };

        this.columns.forEach(column => {
            const uniqueValues = new Set(this.data.map(row => row[column]).filter(val => val));
            stats[column] = uniqueValues.size;
        });

        return stats;
    }
}

module.exports = ExcelReader;