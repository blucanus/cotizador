const sheetID = '1EnLlEJWdfbTU7vyjbDpxdbCkX8YRN6ysrLZcSM-PjI8';
const apiKey = 'AIzaSyAovf1xTWVTPQbuxZFge9GctwpF_czQWQQ';
const range = 'Hoja1!A2:B3';

document.getElementById('calcular').addEventListener('click', () => {
    const metros = document.getElementById('metros').value;
    if (metros) {
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetID}/values/${range}?key=${apiKey}`)
            .then(response => response.json())
            .then(data => {
                const productos = data.values;
                let resultadoHTML = '<ul>';
                productos.forEach(producto => {
                    const [nombre, precio] = producto;
                    const total = precio * metros;
                    resultadoHTML += `<li>${nombre}: $${total.toFixed(2)}</li>`;
                });
                resultadoHTML += '</ul>';
                document.getElementById('resultado').innerHTML = resultadoHTML;
                document.getElementById('whatsapp').style.display = 'block';

                // Set up WhatsApp button
                let mensaje = `Cotización para ${metros} metros cuadrados:\n`;
                productos.forEach(producto => {
                    const [nombre, precio] = producto;
                    const total = precio * metros;
                    mensaje += `${nombre}: $${total.toFixed(2)}\n`;
                });
                const whatsappLink = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
                document.getElementById('whatsapp').onclick = () => window.open(whatsappLink, '_blank');
            })
            .catch(error => console.error('Error al obtener los datos:', error));
    } else {
        alert('Por favor, ingrese la cantidad de metros cuadrados.');
    }
});
