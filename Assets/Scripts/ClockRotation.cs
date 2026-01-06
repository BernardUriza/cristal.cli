using UnityEngine;

public class ClockRotation : MonoBehaviour
{
    [SerializeField] private float _rotationSpeed = 30f;

    void Update()
    {
        // Rotación en sentido horario (como un reloj) en el eje Z
        transform.Rotate(0f, 0f, -_rotationSpeed * Time.deltaTime);
    }
}
