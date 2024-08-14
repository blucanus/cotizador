document.getElementById('calcular').addEventListener('click', () => {
    const metros = parseFloat(document.getElementById('metros').value);
    if (metros && metros > 0) {
        fetch('assets/js/productos.json')
            .then(response => response.json())
            .then(productos => {
                let resultadoHTML = '<table><tr><th>Producto</th><th>Cantidad Necesaria</th><th>Total</th></tr>';
                let mensaje = `Cotización para ${metros} metros cuadrados:\n`;

                productos.forEach(producto => {
                    const { producto: nombre, precio, cant_m2, redondeo, unidadesPorPaquete, areaUnidad, metrosLinealesPorUnidad } = producto;
                    const cantidadNecesaria = cant_m2 * metros;
                    const totalCompra = 0;
                    let cantidadFinal = 0;

                    // Aplicar el tipo de redondeo
                    if (redondeo === "ceil") {
                        if (areaUnidad) {
                            // Calcula el número de placas necesario según el área de cada placa
                            //const areaTotal = cantidadNecesaria / cant_m2;
                            cantidadFinal = Math.ceil(cantidadNecesaria / areaUnidad);
                        } else if (unidadesPorPaquete) {
                            // Redondear al número de paquetes
                            cantidadFinal = Math.ceil(cantidadNecesaria / unidadesPorPaquete);
                        } else if (metrosLinealesPorUnidad) {
                            // Redondear al número de unidades necesarias para cubrir metros lineales
                            const totalMetrosLineales = cantidadNecesaria;
                            cantidadFinal = Math.ceil(totalMetrosLineales / metrosLinealesPorUnidad);
                        } else {
                            cantidadFinal = Math.ceil(cantidadNecesaria);
                        }
                    } else {
                        cantidadFinal = Math.round(cantidadNecesaria);
                    }

                    const total = precio * cantidadFinal;
                    

                    resultadoHTML += `<tr>
                        <td>${nombre}</td>
                        <td>${cantidadFinal} ${producto.unidadMedida}</td>
                        <td>$${total.toFixed(2)}</td>
                        
                    </tr>`;
                    
                    mensaje += `${nombre}: ${cantidadFinal} ${producto.unidadMedida}, Total: $ ${total.toFixed(2)}\n`;
                });

                

                resultadoHTML += '</table>';
                document.getElementById('resultado').innerHTML = resultadoHTML;
                document.getElementById('whatsapp').style.display = 'block';

                const whatsappLink = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
                document.getElementById('whatsapp').onclick = () => window.open(whatsappLink, '_blank');
            })
            .catch(error => console.error('Error al obtener los datos:', error));
    } else {
        alert('Por favor, ingrese una cantidad válida de metros cuadrados.');
    }
});
