'use strict'

const currentDate = new Date();
let currentYear = currentDate.getFullYear();
let currentMonth = currentDate.getMonth() + 1;

//データ日付/収入/収支
const budgetData = {
    "2026-8-10": { income: 5000, expense: 0 },
    "2026-8-25": { income: 150000, expense: 3000 },
    "2026-8-29": { income: 0, expense: 1200 },
};

function renderCalendar(year, month) {
    const firstDate = new Date(year,month -1, 1);
    const firstDay = firstDate.getDay();
    const lastDate = new Date(year, month,0);
    const lastDayCount = lastDate.getDate();


    let dayCount = 1;
    let createHtml = '';

    createHtml += '<div class="calendar-nav">';
    createHtml += '  <button id="prev">◀</button>';
    createHtml += '  <span id="calender-title">' + year + '/' + month + '</span>';
    createHtml += '  <button id="next">▶</button>';
    createHtml +='</div>';

    createHtml +='<table>';
    createHtml +='<tr>';

    const weeks = ['日','月','火','水','木','金','土'];
    for (let i = 0; i < weeks.length; i++){
        createHtml += '<td>' + weeks[i] + '</td>';
    }
    createHtml += '</tr>';

    for (let n = 0; n < 6; n++){
        createHtml += '<tr>'
        for (let d = 0; d < 7; d++){
            if (n == 0 && d < firstDay){
                createHtml += '<td></td>'
            } else  if (dayCount > lastDayCount){
                createHtml += '<td></td>'
            } else {
                const dateKey = year + '-' + month + '-' + dayCount;
                
                let budgetHtml = '';

                if (budgetData[dateKey]) {
                    const data = budgetData[dateKey];
                    let innerHtml = ''; 

                    if (data.income > 0) {
                        innerHtml += '<span class="income">+' + data.income + '</span>';
                    }
                    if (data.expense > 0) {
                        innerHtml += '<span class="expense">-' + data.expense + '</span>';
                    }
                    if (innerHtml !== '') {
                        budgetHtml = '<div class="budget-box">' + innerHtml + '</div>';
                    }
                }
                createHtml += '<td>' + dayCount + budgetHtml + '</td>';
                dayCount++;
            }
        }
        createHtml += '</tr>';
    }
    createHtml += '</table>'

    document.querySelector("#calendar").innerHTML = createHtml;
}
renderCalendar(currentYear, currentMonth);

document.querySelector("#calendar").addEventListener("click", function(event) {
    
    if(event.target.id === 'prev') {
        currentMonth --;
        if(currentMonth < 1) {
            currentMonth = 12;
            currentYear--;
        }

        renderCalendar(currentYear, currentMonth);

    }else if (event.target.id === 'next') {
        currentMonth ++;
        if(currentMonth > 12) {
            currentMonth = 1;
            currentYear++;
        }

        renderCalendar(currentYear, currentMonth);

    }
})