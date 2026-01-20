using UnityEngine;

public class DeleteDuplicates : MonoBehaviour
{
    void Start()
    {
        Debug.Log("[DeleteDuplicates] Ejecutando limpieza...");

        var scene = UnityEngine.SceneManagement.SceneManager.GetActiveScene();
        var roots = scene.GetRootGameObjects();
        int removed = 0;

        bool seenRitualOp = false;
        bool seenConsole = false;
        bool seenDirLight = false;

        foreach (var obj in roots)
        {
            bool shouldDelete = false;

            // RitualOperator - keep first
            if (obj.name == "RitualOperator")
            {
                if (seenRitualOp)
                {
                    Debug.Log($"[DeleteDuplicates] DELETE RitualOperator {obj.GetInstanceID()}");
                    shouldDelete = true;
                }
                else
                {
                    Debug.Log($"[DeleteDuplicates] KEEP RitualOperator {obj.GetInstanceID()}");
                    seenRitualOp = true;
                }
            }

            // TerminalConsole - keep first
            if (obj.name == "TerminalConsole")
            {
                if (seenConsole)
                {
                    Debug.Log($"[DeleteDuplicates] DELETE TerminalConsole {obj.GetInstanceID()}");
                    shouldDelete = true;
                }
                else
                {
                    Debug.Log($"[DeleteDuplicates] KEEP TerminalConsole {obj.GetInstanceID()}");
                    seenConsole = true;
                }
            }

            // Floor - delete ALL
            if (obj.name == "Floor")
            {
                Debug.Log($"[DeleteDuplicates] DELETE Floor {obj.GetInstanceID()}");
                shouldDelete = true;
            }

            // Directional Light - keep first, delete (1)
            if (obj.name.StartsWith("Directional Light"))
            {
                if (seenDirLight || obj.name.Contains("(1)"))
                {
                    Debug.Log($"[DeleteDuplicates] DELETE {obj.name} {obj.GetInstanceID()}");
                    shouldDelete = true;
                }
                else
                {
                    Debug.Log($"[DeleteDuplicates] KEEP Directional Light {obj.GetInstanceID()}");
                    seenDirLight = true;
                }
            }

            if (shouldDelete)
            {
                Destroy(obj);
                removed++;
            }
        }

        // Disable Main Camera
        var mainCam = GameObject.Find("Main Camera");
        if (mainCam != null && mainCam.activeSelf)
        {
            Debug.Log("[DeleteDuplicates] Desactivando Main Camera");
            mainCam.SetActive(false);
        }

        Debug.Log($"[DeleteDuplicates] ✓ Eliminados: {removed} objetos");

        // Auto-destruir este script
        Destroy(this);
    }
}
