# Partículas Cosmos


## Autores:
**Juan Manuel Cristancho Alvarez**
**José David Múñoz Dueñas**




<div align="center">
  <img src="assets/logo.png" alt="Logo" width="200" />
 
</div>

**Partículas & Cosmos** es un simulador físico interactivo en 2D que permite explorar la dinámica de sistemas de partículas a dos escalas extremas: la escala cósmica (cuerpos celestes, gravedad) y la escala atómica (partículas subatómicas, fuerzas nucleares y electromagnéticas).

## ¿Cómo funciona el programa?

El programa utiliza un motor de físicas propio desarrollado en JavaScript que calcula continuamente las fuerzas de atracción y repulsión entre todos los objetos en pantalla (un problema de N-cuerpos). Para garantizar que la simulación sea fluida pero físicamente precisa, se emplean técnicas numéricas de integración y renderizado optimizado a través de un canvas en HTML5.

### Métodos Numéricos y Matemáticas Base

Para calcular cómo se mueven las partículas a lo largo del tiempo, en lugar de usar ecuaciones cinemáticas estáticas simples, el simulador resuelve iterativamente las ecuaciones diferenciales de movimiento.

1. **Integración Velocity Verlet**:
   Para actualizar la posición y la velocidad de cada cuerpo en el espacio, el simulador usa el algoritmo numérico de *Velocity Verlet*. Este método es computacionalmente eficiente, muy estable a largo plazo y conserva mucho mejor la energía del sistema en comparación con el método de Euler tradicional.
   Sus fórmulas son:
   - Posición: $\vec{r}(t + \Delta t) = \vec{r}(t) + \vec{v}(t)\Delta t + \frac{1}{2}\vec{a}(t)\Delta t^2$
   - Velocidad: $\vec{v}(t + \Delta t) = \vec{v}(t) + \frac{1}{2}\left[\vec{a}(t) + \vec{a}(t + \Delta t)\right]\Delta t$

2. **Termostato de Langevin (Transformada de Box-Muller)**:
   En la escala atómica, para simular la agitación térmica y mantener una temperatura constante, se utiliza la Dinámica de Langevin. A las partículas se les aplica fricción (amortiguamiento) y una fuerza aleatoria gaussiana. Para generar el ruido blanco requerido con la distribución normal correcta, el programa utiliza la **Transformada de Box-Muller**.

---

## Físicas: Escala Cósmica

En el modo Cósmico interactuamos con estrellas, planetas, asteroides y agujeros negros, donde la gravedad domina.

- **Ley de la Gravitación Universal (Modificada)**:
  La atracción entre masas usa la base newtoniana, pero implementa un factor de suavizado gravitacional (Softening $\epsilon$). Esto evita el problema numérico matemático de la singularidad (división por cero y aceleraciones infinitas) cuando dos astros están a punto de chocar:
  $$\vec{F} = G \frac{m_1 m_2}{(r^2 + \epsilon^2)^{3/2}} \vec{r}$$
  
- **Colisiones Inelásticas y Conservación del Momento**:
  Cuando las distancias se reducen lo suficiente, los astros colisionan y se fusionan (formando uno de mayor masa). La nueva velocidad $\vec{v}_f$ del cuerpo resultante se calcula respetando estrictamente la Ley de Conservación del Momento Lineal ($\vec{P}_i = \vec{P}_f$):
  $$\vec{v}_{f} = \frac{m_1 \vec{v}_1 + m_2 \vec{v}_2}{m_1 + m_2}$$

---

## Físicas: Escala Atómica

En el modo Atómico, observamos protones, neutrones, electrones y quarks. Aquí la masa es ínfima, por lo que la gravedad es matemáticamente despreciable. El motor cambia las reglas para usar las fuerzas fundamentales a escala cuántica (de manera clásica/semiclásica):

- **Fuerza Electromagnética (Ley de Coulomb)**:
  Las partículas cargadas interactúan atrayéndose o repeliéndose con suavizado para evitar singularidades:
  $$\vec{F}_c = k_e \frac{q_1 q_2}{(r^2 + \epsilon^2)^{3/2}} \vec{r}$$

- **Fuerza Nuclear Fuerte (Potencial Semiclásico)**:
  Para mantener unidos a los protones y neutrones en el núcleo superando su repulsión electromagnética natural (ambos positivos), se simula una curva de potencial específica inspirada en el **Potencial de Yukawa**:
  $$\vec{F}_s \propto -k_s \left( \frac{e^{-r/R}}{(r^2 + c)^{1.5}} - \frac{A}{(r^2 + c)^4} \right) \vec{r}$$
  Esta fórmula genera una fuerza con tres fases realistas:
  1. **Repulsión de Núcleo Duro**: A distancias extremadamente cortas se repelen violentamente (emulando el Principio de Exclusión de Pauli).
  2. **Atracción Fuerte**: A la distancia exacta de un núcleo atómico, la atracción es máxima y supera ampliamente la repulsión de Coulomb.
  3. **Decaimiento Exponencial**: A medida que la distancia aumenta, la fuerza cae a casi cero drásticamente (el factor $e^{-r/R}$), lo cual es propio de la Fuerza Fuerte real, que tiene un rango de acción muy limitado.

---

## Instalación y Uso

1. Descarga el repositorio o clónalo localmente.
2. Abre el archivo `index.html` en cualquier navegador web moderno. ¡No requiere instalación de servidores ni dependencias extras!
3. Usa los paneles de control para cambiar de escenario, ajustar parámetros de físicas, ralentizar el tiempo o añadir cuerpos celestes/subatómicos manualmente con un click.

