// EditableTable.js
class EditableTable {
    constructor(config) {
        this.tableSelector = config.tableSelector;
        this.td = config.td || [];
        this.addButtonSelector = config.addButtonSelector || '.add-line';
        this.buttonRow = config.buttonRow || '.add-line';
        this.isEditable = true;
        this.isAddingRow = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeButtonRow();
    }
    setEditable(isEditable) {
        this.isEditable = (typeof isEditable === 'boolean') ? isEditable : true;
    }
    initializeButtonRow() {
        const table = $(this.tableSelector);
        const tbody = table.find('tbody');
        const existingButtonRow = tbody.find(this.buttonRow);
    
        // Check if the button row already exists
        if (existingButtonRow.length === 0) {
            // Add the button row at index 0
            const buttonRowHTML = `<tr><td colspan="${this.td.length}" class="${this.buttonRow.substring(1)}"><button type="button" class="${this.addButtonSelector.substring(1)} btn btn-sm text-primary">Add Row</button></td></tr>`;
            tbody.prepend(buttonRowHTML);  // Adds at the beginning of tbody (index 0)
    
            // Add 4 empty rows below the button row
            for (let i = 0; i < 4; i++) {
                const emptyRowHTML = `<tr><td colspan="${this.td.length}">&nbsp;</td></tr>`;
                tbody.append(emptyRowHTML);
            }
        }
    }
    
    
    
    
    
    
    
    
    bindEvents() {
        const table = $(this.tableSelector);

        // Add new row
        table.on('click', this.addButtonSelector, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!this.isEditable) return;
            this.addRow(e.currentTarget);
        });

        // Handle row click
        table.on('click', '.c_data_row', (e) => {
            const clickedRow = $(e.currentTarget);
            if (!this.isEditable) return;
            this.selectRow(clickedRow);
            e.stopPropagation();
        });

        // Handle click outside the table
        $('body').off('click').on('click', (e) => {
            if (!this.isEditable) return;
            if ($(e.target).hasClass('select2-search__field') || $(e.target).closest('.select2-container').length) {
                return;
            }
            if (!$(e.target).closest(this.tableSelector).length) {
                this.deselectAllRows();
            }
        });

        // Delete row
        table.on('click', '.delete-line', (e) => {
            if (!this.isEditable) return;
            e.preventDefault();
            
            this.deleteRow(e.currentTarget);
        });

        // Handle input changes
        table.on('input change', '.form-control', (e) => {
            if (!this.isEditable) return;
            this.validateCell($(e.currentTarget).closest('td'));
        });
    }

    addRow(button, data = {}) {
        const buttonRow = $(button).closest('tr');
        const selectedOldPrevRow = buttonRow.closest('tr').prev('tr');
        const requiredCells = selectedOldPrevRow.find('td.c_required_modifier');
        let isValid = true;
        requiredCells.each((index, cell) => {
            const textValue = this.cellFieldValue($(cell));
            if (!textValue) {
                $(cell).addClass('c_invalid_cell');
                isValid = false;
            }
        });

        if (!isValid) return false;

        $('.c_selected_row').each((index, element) => {
            this.renderRowToText($(element));
            $(element).removeClass('c_selected_row');
        });

        buttonRow.next('tr').remove();
        this.isAddingRow = true;
        this.renderRow(data, true).then((newRowHTML) => {
            buttonRow.before(newRowHTML);
            const newRow = buttonRow.prev('tr').addClass('c_selected_row');
            this.td.forEach((td_cell) => {
                if (td_cell.function && typeof td_cell.function === 'function') {
                    td_cell.function(newRow);
                }
            });

            initializeDateInputMask();
            this.isAddingRow = false;
        });
    }


    async renderRow(data = {}, isEditable = false) {
        const rowData = this.td.map((td_cell) => {
            if (isEditable) {
                return `<td class="c_data_cell c_field_cell ${td_cell.class}" name="${td_cell.name}">${this.renderField(td_cell, data[td_cell.name])}</td>`;
            }
            return `<td class="c_data_cell ${td_cell.class}" name="${td_cell.name}">${data[td_cell.name] || ''}</td>`;
        }).join('');

        let rowHTML = `<tr class="c_data_row">${rowData}</tr>`;
        return Promise.resolve($(rowHTML));
    }

    renderField(td_cell, value = '') {
        if (!td_cell) return '';
        const fieldProp = td_cell.field || [];
        const html = fieldProp[0]?.html || '';
        const options = fieldProp[0]?.options || [];
        const attributes = fieldProp[0]?.attributes || {};

        let dynamicAttributes = '';
        for (const [key, value] of Object.entries(attributes)) {
            dynamicAttributes += ` ${key}="${value}"`;
        }

        switch (td_cell.type) {
            case 'select':
                let optionsHtml = '';
                options.forEach(option => {
                    const selected = (option.value === value) ? 'selected' : '';
                    optionsHtml += `<option value="${option.value}" ${selected}>${option.text}</option>`;
                });
                if(value){
                    optionsHtml += `<option>${value}</option>`;
                }
                return `<select ${dynamicAttributes}>${optionsHtml}</select>`;
            case 'input':
                return `<input value="${value}"${dynamicAttributes}>`;
            case 'text':
                return `${value}`;
            default:
                return html;
        }
    }

    renderRowToText(row) {
        row.find('td').each((index, cell) => {
            var textValue = this.cellFieldValue($(cell));
            $(cell).html(textValue);
        });
    }

    cellFieldValue(cell) {
        var textValue = '';
        if (cell.find('input').length || cell.find('select').length) {
            textValue = cell.find('input').val() || cell.find('select').val() || cell.find('textarea').text();
            return textValue.trim();
        } else {
            textValue = cell.text() || '';
            return textValue.trim();
        }
    }

    validateCell(cell) {
        const value = cell.find('input, select').val();
        if (value.trim()) {
            cell.removeClass('c_invalid_cell');
        } else {
            cell.addClass('c_invalid_cell');
        }
    }
    selectRow(row) {
        const self = this;   
        let isValid = true;
        if (!row.hasClass('c_selected_row')) {
            $('.c_selected_row').each(function () {
                const selectedRow = $(this);
                selectedRow.find('td.c_required_modifier').each(function () {
                    const cell = $(this);
                    const textValue = self.cellFieldValue(cell);
                    if (!textValue) {
                        cell.addClass('c_invalid_cell');
                        isValid = false;
                    } else {
                        cell.removeClass('c_invalid_cell');
                    }
                });
    
                if (!isValid) { return false; }
                self.renderRowToText(selectedRow); 
                selectedRow.removeClass('c_selected_row');
            });
            if (!isValid) {
                const userConfirmed = confirm('The record has been modified, your changes will be discarded. Do you want to proceed?');
                if (!userConfirmed) {
                    $('.c_selected_row').remove();
                }
                return false;
            }
            row.addClass('c_selected_row');
            self.toggleEditableFields(row, true).then(function () {
                self.td.forEach((td_cell) => {
                    if (td_cell.function && typeof td_cell.function === 'function') {
                        td_cell.function(row);
                    }
                });
                initializeDateInputMask();
            });
        }
    }  
    
    

    toggleEditableFields(row, isEditable) {
        const self = this;
        row.find('td').each(function (index) {
            const cell = $(this);
            const td_cell = self.td[index];
            if (!td_cell) return;

            if (isEditable) {
                if (cell.find('input').length || cell.find('select').length) return;
                const cellValue = cell.text().trim();
                const renderedField = self.renderField(td_cell, cellValue);
                cell.html(renderedField);
            }
        });
        return Promise.resolve(row);
    }

    deselectAllRows() {
        if (this.isAddingRow) return;
        const self = this;
        let isValid = true;
        $('.c_selected_row').find('td.c_required_modifier').each(function () {
            const cell = $(this);
            const textValue = self.cellFieldValue(cell);
            if (!textValue) {
                cell.addClass('c_invalid_cell');
                isValid = false;
                return false;
            } else {
                cell.removeClass('c_invalid_cell');
            }
        });
        if (!isValid) {
            const userConfirmed = confirm('The record has been modified, your changes will be discarded. Do you want to proceed?');
            if (!userConfirmed) {
                $('.c_selected_row').remove();
            }else{
                return false;
            }
        }
        $('.c_selected_row').each(function () {
            const selectedRow = $(this);
            self.renderRowToText(selectedRow); 
            selectedRow.removeClass('c_selected_row');
        });
    }

    
    deleteAllRows() {
        const table = $(this.tableSelector);
        table.find('tbody tr').each(function () {
                const row = $(this);
                row.remove();
            });
            this.initializeButtonRow();
    }
    
    deleteRow(button) {
        const row = $(button).closest('tr');
        const tbody = row.closest('tbody');
        const table = $(this.tableSelector);
        const headerColumns = table.find('thead th').length;
        const rowCount = table.find('tbody tr').length;
    
        // Remove the clicked row
        row.remove();
    
        // If the row count exceeds 5, remove the oldest row (first row after the button row)
        if (rowCount > 5) {
            const buttonRow = tbody.find(this.buttonRow).closest('tr');
            const rowsAfterButtonRow = buttonRow.nextAll('tr'); // Get all rows after the button row
    
            if (rowsAfterButtonRow.length > 5) {
                rowsAfterButtonRow.first().remove(); // Remove the oldest row (first row after the button row)
            }
        } else {
            // If the row count is less than or equal to 5, add an empty row
            tbody.append(`<tr><td colspan="${headerColumns}">&nbsp;</td></tr>`);
        }
    }
    destroy() {
        const table = $(this.tableSelector);
    
        // Unbind all events from the table
        table.off();
       
        // Optionally, clean up DOM if needed
        table.find('.c_selected_row').removeClass('c_selected_row');
        table.find('.c_invalid_cell').removeClass('c_invalid_cell');
    
        // Reset table content if needed
        // (Optional: Reset table rows or any other DOM changes if applicable)
        table.find(this.addButtonSelector).closest('tr').remove();


        // Ensure state variables are reset
        this.isEditable = true;
    }
    reinitialize() {
        this.destroy();
        this.init();
    }

}

export default EditableTable;
