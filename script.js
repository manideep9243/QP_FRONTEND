const API_BASE_URL = 'https://questionpapergeneratorbackend.onrender.com/api';

document.getElementById('excelFile').addEventListener('change', handleFileUpload);
document.getElementById('generateButton').addEventListener('click', generateQuestionPaper);
document.getElementById('downloadButton').addEventListener('click', downloadQuestionPaper);
document.getElementById('paperType').addEventListener('change', handlePaperTypeChange);

// Function to show notifications below a specific element
function showNotification(message, type = 'info', targetElement, duration = null) {
    const notification = document.createElement('div');
    notification.innerText = message;
    notification.style.position = 'absolute';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '1000';
    notification.style.color = '#fff';
    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#28a745'; // Green
            break;
        case 'error':
            notification.style.backgroundColor = '#dc3545'; // Red
            break;
        case 'info':
        default:
            notification.style.backgroundColor = '#007bff'; // Blue
            break;
    }

    // Position the notification below the target element
    const rect = targetElement.getBoundingClientRect();
    notification.style.top = `${rect.bottom + window.scrollY + 10}px`; // 10px below the element
    notification.style.left = `${rect.left + window.scrollX}px`; // Align with the left edge

    document.body.appendChild(notification);

    // Auto-remove notification if a duration is specified
    if (duration) {
        setTimeout(() => {
            if (notification.parentElement) {
                document.body.removeChild(notification);
            }
        }, duration);
    }

    return notification; // Return the element so it can be removed manually if needed
}

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('excelFile', file);

    const uploadElement = document.getElementById('excelFile');
    const uploadNotification = showNotification('File is uploading...', 'info', uploadElement); // No duration, persists

    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        const responseText = await response.text();
        console.log('Raw response:', responseText);

        const data = JSON.parse(responseText);
        if (!response.ok) throw new Error(data.error || 'Error uploading file');

        document.body.removeChild(uploadNotification); // Remove "uploading" notification
        showNotification('Successfully uploaded!', 'success', uploadElement, 3000); // Auto-disappear after 3 seconds
    } catch (error) {
        console.error('Upload Error:', error);
        document.body.removeChild(uploadNotification); // Remove "uploading" notification
        showNotification('Error uploading file: ' + error.message, 'error', uploadElement, 3000); // Auto-disappear after 3 seconds
    }
}

async function generateQuestionPaper() {
    const paperType = document.getElementById('paperType').value;
    let requestBody = { paperType };
    if (paperType === 'special') {
        const mainUnit = parseInt(document.getElementById('mainUnit').value);
        requestBody.mainUnit = mainUnit;
    }

    const generateButton = document.getElementById('generateButton');
    const generatingNotification = showNotification('Generating question paper...', 'info', generateButton); // No duration, persists

    try {
        const response = await fetch(`${API_BASE_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error generating question paper');

        const questionsWithImages = await Promise.all(data.questions.map(async q => {
            if (q.imageUrl) {
                q.imageDataUrl = await fetchImageDataUrl(q.imageUrl);
            }
            return q;
        }));

        data.paperDetails.paperType = paperType;

        sessionStorage.setItem('questions', JSON.stringify(questionsWithImages));
        sessionStorage.setItem('paperDetails', JSON.stringify(data.paperDetails));
        displayQuestionPaper(questionsWithImages, data.paperDetails, true);
        document.getElementById('downloadButton').style.display = 'block';

        document.body.removeChild(generatingNotification); // Remove "generating" notification
        showNotification('Question paper generated successfully!', 'success', generateButton, 3000); // Auto-disappear after 3 seconds
    } catch (error) {
        console.error('Generation Error:', error);
        document.body.removeChild(generatingNotification); // Remove "generating" notification
        showNotification('Error generating question paper: ' + error.message, 'error', generateButton, 3000); // Auto-disappear after 3 seconds
    }
}

function displayQuestionPaper(questions, paperDetails, allowEdit = true) {
    const examDate = sessionStorage.getItem('examDate') || '';
    const branch = sessionStorage.getItem('branch') || paperDetails.branch;
    const subjectCode = sessionStorage.getItem('subjectCode') || paperDetails.subjectCode;
    const monthyear = sessionStorage.getItem('monthyear') || '';

    const midTermMap = { 'mid1': 'Mid I', 'mid2': 'Mid II', 'special': 'Special Mid' };
    const midTermText = midTermMap[paperDetails.paperType] || 'Mid';

    const getCOValue = (unit) => {
        switch (unit) {
            case 1: return 'CO1';
            case 2: return 'CO2';
            case 3: return 'CO3';
            case 4: return 'CO4';
            case 5: return 'CO5';
            default: return '';
        }
    };

    const html = `
        <div id="questionPaperContainer" style="padding: 20px; margin: 20px auto; text-align: center; max-width: 800px;">
            <div style="display: flex; flex-direction: column; align-items: center; border-bottom: 1px solid black; padding-bottom: 5px;">
                <div style="text-align: left; width: 100%; font-weight: semi-bold;">
                    <p><strong>Subject Code:</strong> <span contenteditable="true" style="border-bottom: 1px solid black; min-width: 100px; display: inline-block;" oninput="sessionStorage.setItem('subjectCode', this.innerText)">${subjectCode}</span></p>
                </div>
                <div style="flex-grow: 1; text-align: center;">
                    <img src="image.png" alt="Institution Logo" style="max-width: 100%; height: auto;">
                </div>
            </div>
            <h3>B.Tech ${paperDetails.year} Year ${paperDetails.semester} Semester ${midTermText} Examinations
                <span contenteditable="true" style="border-bottom: 1px solid black; min-width: 150px; display: inline-block;" 
                      oninput="sessionStorage.setItem('monthyear', this.innerText)">${monthyear}</span></h3>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0;">
                <p><span style="float: left;"><strong>Time:</strong> 90 Min.</span></p>
                <p><span style="float: right;"><strong>Max Marks:</strong> 20</span></p>
            </div>          
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0;">
                <p><span style="float: left;"><strong>Subject:</strong> ${paperDetails.subject}</span></p>
                <p><span style="float: left;"><strong>Branch:</strong> <span contenteditable="true" style="border-bottom: 1px solid black; min-width: 100px; display: inline-block;" oninput="sessionStorage.setItem('branch', this.innerText)">${branch}</span></span></p>
                <p><span style="float: right;"><strong>Date:</strong> <span contenteditable="true" style="border-bottom: 1px solid black; min-width: 100px; display: inline-block; text-align: center;" oninput="sessionStorage.setItem('examDate', this.innerText)">${examDate}</span></span></p>
            </div>
            <hr style="border-top: 1px solid black; margin: 10px 0;">
            <p style="text-align: left; margin-top: 10px;"><strong>Note:</strong> Question paper consists of 2 ½ Units, Answer any 4 full questions out of 6 questions.</p>
            <p style="text-align: left;">Each question carries 5 marks and may have sub-questions.</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th>S. No</th>
                        <th>Question</th>
                        <th>Unit</th>
                        <th>B.T Level</th>
                        <th>CO/PO</th>
                        ${allowEdit ? '<th>Edit</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                ${questions.map((q, index) => `
                    <tr id="row-${index}">
                        <td>${index + 1}</td>
                        <td contenteditable="true" oninput="updateQuestion(${index}, this.innerText)">
                            ${q.question}
                            ${q.imageDataUrl ? `
                                <br>
                                <div id="image-container-${index}" style="max-width: 200px; max-height: 200px; margin-top: 5px;">
                                    <img src="${q.imageDataUrl}" style="max-width: 100%; max-height: 100%; display: block;" onload="console.log('Image displayed for question ${index + 1}')" onerror="console.error('Image failed to display for question ${index + 1}')">
                                </div>
                            ` : ''}
                        </td>
                        <td>${q.unit}</td>
                        <td contenteditable="true" oninput="updateBTLevel(${index}, this.innerText)">${q.btLevel}</td>
                        <td>${getCOValue(q.unit)}</td>
                        ${allowEdit ? `<td><button onclick="editQuestion(${index})">Edit</button></td>` : ''}
                    </tr>
                `).join('')}
                </tbody>
            </table>
            <br>
            <br>
            <br>
            <p style="text-align: center;"><strong>****ALL THE BEST****</strong></p>
        </div>
    `;
    document.getElementById('questionPaper').innerHTML = html;
}

function updateQuestion(index, text) {
    let questions = JSON.parse(sessionStorage.getItem('questions'));
    questions[index].question = text;
    sessionStorage.setItem('questions', JSON.stringify(questions));
}

function updateBTLevel(index, text) {
    let questions = JSON.parse(sessionStorage.getItem('questions'));
    questions[index].btLevel = text;
    sessionStorage.setItem('questions', JSON.stringify(questions));
}

function editQuestion(index) {
    const questions = JSON.parse(sessionStorage.getItem('questions'));
    const question = questions[index];
    
    const modalHtml = `
        <div id="editModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 20px; border-radius: 5px; width: 80%; max-width: 600px;">
                <h3>Edit Question #${index + 1}</h3>
                
                <div style="margin-bottom: 15px;">
                    <label for="questionText" style="display: block; margin-bottom: 5px;">Question Text:</label>
                    <textarea id="questionText" style="width: 100%; height: 100px;">${question.question}</textarea>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label for="btLevel" style="display: block; margin-bottom: 5px;">B.T. Level:</label>
                    <input type="text" id="btLevel" style="width: 100%;" value="${question.btLevel || ''}">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label for="imageUrl" style="display: block; margin-bottom: 5px;">Image URL (leave empty to remove):</label>
                    <input type="text" id="imageUrl" style="width: 100%;" value="${question.imageUrl || ''}">
                    ${question.imageDataUrl ? `
                        <div style="margin-top: 10px;">
                            <img src="${question.imageDataUrl}" style="max-width: 100%; max-height: 200px;" onload="console.log('Edit image loaded')" onerror="console.error('Edit image failed')">
                        </div>
                    ` : ''}
                </div>
                
                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button onclick="closeEditModal()">Cancel</button>
                    <button onclick="saveQuestion(${index})">Save</button>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.id = 'modalContainer';
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
}

function closeEditModal() {
    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) {
        document.body.removeChild(modalContainer);
    }
}

async function saveQuestion(index) {
    const questions = JSON.parse(sessionStorage.getItem('questions'));
    const questionText = document.getElementById('questionText').value;
    const btLevel = document.getElementById('btLevel').value.trim();
    const imageUrl = document.getElementById('imageUrl').value.trim();
    
    questions[index].question = questionText;
    questions[index].btLevel = btLevel;
    questions[index].imageUrl = imageUrl || null;
    if (imageUrl) {
        questions[index].imageDataUrl = await fetchImageDataUrl(imageUrl);
    } else {
        questions[index].imageDataUrl = null;
    }
    
    sessionStorage.setItem('questions', JSON.stringify(questions));
    closeEditModal();
    
    displayQuestionPaper(questions, JSON.parse(sessionStorage.getItem('paperDetails')), true);
}

async function fetchImageDataUrl(imageUrl) {
    try {
        const response = await fetch(`${API_BASE_URL}/image-proxy-base64?url=${encodeURIComponent(imageUrl)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch image');
        console.log(`Fetched data URL for ${imageUrl}, length: ${data.dataUrl.length}`);
        return data.dataUrl;
    } catch (error) {
        console.error(`Error fetching image data URL for ${imageUrl}:`, error);
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAvElEQVR4nO3YQQqDMBAF0L/KnW+/Q6+xu1oSLeI4DAgAAAAAAAAA7rZpm7Zt2/9eNpvNZrPZdrsdANxut9vt9nq9PgAwGo1Go9FoNBr9MabX6/U2m01mM5vNZnO5XC6X+wDAXC6Xy+VyuVwul8sFAKPRaDQajUaj0Wg0Go1Goz8A8Hg8Ho/H4/F4PB6Px+MBgMFoNBqNRqPRaDQajUaj0Wg0Go1Goz8AAAAAAAAA7rYBAK3eVREcAAAAAElFTkSuQmCC';
    }
}

async function downloadQuestionPaper() {
    const questions = JSON.parse(sessionStorage.getItem('questions'));
    const paperDetails = JSON.parse(sessionStorage.getItem('paperDetails'));
    const monthyear = sessionStorage.getItem('monthyear') || '';

    const midTermMap = { 'mid1': 'Mid I', 'mid2': 'Mid II', 'special': 'Special Mid' };
    const midTermText = midTermMap[paperDetails.paperType] || 'Mid';

    const hiddenContainer = document.createElement('div');
    hiddenContainer.style.position = 'absolute';
    hiddenContainer.style.left = '-9999px';
    hiddenContainer.style.top = '-9999px';
    document.body.appendChild(hiddenContainer);

    const html = `
        <div style="padding: 20px; margin: 20px auto; text-align: center; max-width: 800px;">
            <div style="display: flex; flex-direction: column; align-items: center; border-bottom: 1px solid black; padding-bottom: 5px;">
                <div style="text-align: left; width: 100%; font-weight: semi-bold;">
                    <p><strong>Subject Code:</strong> ${sessionStorage.getItem('subjectCode') || paperDetails.subjectCode}</p>
                </div>
                <div style="flex-grow: 1; text-align: center;">
                    <img src="image.png" alt="Institution Logo" style="max-width: 100%; height: auto;">
                </div>
            </div>
            <h3>B.Tech ${paperDetails.year} Year ${paperDetails.semester} Semester ${midTermText} Examinations
                ${monthyear}</h3>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0;">
                <p><span style="float: left;"><strong>Time:</strong> 90 Min.</span></p>
                <p><span style="float: right;"><strong>Max Marks:</strong> 20</span></p>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0;">
                <p><strong>Subject:</strong> ${paperDetails.subject}</p>
                <p><span style="float: left;"><strong>Branch:</strong> ${sessionStorage.getItem('branch') || paperDetails.branch}</span></p>
                <p><span style="float: right; margin-left: 20px;"><strong>Date:</strong> ${sessionStorage.getItem('examDate') || ''}</span></p>
            </div>
            <hr style="border-top: 1px solid black; margin: 10px 0;">
            <p style="text-align: left; margin-top: 10px;"><strong>Note:</strong> Question paper consists of 2 ½ Units, Answer any 4 full questions out of 6 questions.</p>
            <p style="text-align: left;">Each question carries 5 marks and may have sub-questions.</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th>S. No</th>
                        <th>Question</th>
                        <th>Unit</th>
                        <th>B.T Level</th>
                        <th>CO/PO</th>
                    </tr>
                </thead>
                <tbody>
                 <br>
            <br>
            <br>
            <p style="text-align: center;"><strong>****ALL THE BEST****</strong></p>
                ${questions.map((q, index) => `
                    <tr id="pdf-row-${index}">
                        <td>${index + 1}</td>
                        <td>
                            ${q.question}
                            ${q.imageDataUrl ? `
                                <br>
                                <div id="pdf-image-container-${index}" style="max-width: 200px; max-height: 200px; margin-top: 5px;"></div>
                            ` : ''}
                        </td>
                        <td>${q.unit}</td>
                        <td>${q.btLevel}</td>
                        <td>${getCOValue(q.unit)}</td>
                    </tr>
                `).join('')}
                </tbody>
            </table>
        </div>
    `;
    hiddenContainer.innerHTML = html;

    const imagePromises = questions.map((q, index) => {
        if (q.imageDataUrl) {
            return new Promise(resolve => {
                const container = hiddenContainer.querySelector(`#pdf-image-container-${index}`);
                const img = document.createElement('img');
                img.src = q.imageDataUrl;
                img.style.cssText = 'max-width: 200px; max-height: 200px; display: block;';
                img.onload = () => {
                    console.log(`PDF image loaded for ${q.imageUrl}`);
                    container.appendChild(img);
                    resolve();
                };
                img.onerror = () => {
                    console.error(`PDF image failed to load for ${q.imageUrl}`);
                    container.appendChild(img);
                    resolve();
                };
            });
        }
        return Promise.resolve();
    });

    try {
        await Promise.all(imagePromises);

        await new Promise(resolve => setTimeout(resolve, 1000));

        const loadingIndicator = document.createElement('div');
        loadingIndicator.style = "position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;";
        loadingIndicator.innerHTML = '<div style="background: white; padding: 20px; border-radius: 5px;">Generating PDF...</div>';
        document.body.appendChild(loadingIndicator);

        await new Promise(resolve => setTimeout(resolve, 100));

        const { jsPDF } = window.jspdf;
        html2canvas(hiddenContainer, { 
            scale: 2, 
            useCORS: true,
            allowTaint: true,
            logging: true,
            imageTimeout: 15000 
        }).then(canvas => {
            document.body.removeChild(loadingIndicator);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ 
                orientation: 'p', 
                unit: 'mm', 
                format: 'a4',
                compress: true
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth - 20;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 10;

            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= pageHeight - 20;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight + 10;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                heightLeft -= pageHeight - 20;
            }

            pdf.save('question_paper.pdf');
        }).catch(error => {
            console.error('PDF generation error:', error);
            alert('Error generating PDF: ' + error.message);
            document.body.removeChild(loadingIndicator);
        });
    } catch (error) {
        console.error('Error in download process:', error);
        alert('Error preparing document for download: ' + error.message);
        document.body.removeChild(loadingIndicator);
    } finally {
        document.body.removeChild(hiddenContainer);
        displayQuestionPaper(questions, paperDetails, true);
    }
}

function handlePaperTypeChange() {
    const paperType = document.getElementById('paperType').value;
    const specialMidOptions = document.getElementById('specialMidOptions');
    
    if (paperType === 'special') {
        if (specialMidOptions) {
            specialMidOptions.style.display = 'block';
        }
    } else {
        if (specialMidOptions) {
            specialMidOptions.style.display = 'none';
        }
    }
}

function getCOValue(unit) {
    switch (unit) {
        case 1: return 'CO1';
        case 2: return 'CO2';
        case 3: return 'CO3';
        case 4: return 'CO4';
        case 5: return 'CO5';
        default: return '';
    }
}
