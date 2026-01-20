using UnityEngine;

public class AutoDeleteDuplicates
{
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void CleanupDuplicates()
    {
        Debug.Log("[AutoDeleteDuplicates] Ejecutando limpieza automática...");

        var scene = UnityEngine.SceneManagement.SceneManager.GetActiveScene();

        // Solo ejecutar en Labyrinth
        if (!scene.name.Contains("Labyrinth"))
        {
            return;
        }

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
                    Debug.Log($"[AutoDeleteDuplicates] DELETE RitualOperator {obj.GetInstanceID()}");
                    shouldDelete = true;
                }
                else
                {
                    Debug.Log($"[AutoDeleteDuplicates] KEEP RitualOperator {obj.GetInstanceID()}");
                    seenRitualOp = true;
                }
            }

            // TerminalConsole - keep first
            if (obj.name == "TerminalConsole")
            {
                if (seenConsole)
                {
                    Debug.Log($"[AutoDeleteDuplicates] DELETE TerminalConsole {obj.GetInstanceID()}");
                    shouldDelete = true;
                }
                else
                {
                    Debug.Log($"[AutoDeleteDuplicates] KEEP TerminalConsole {obj.GetInstanceID()}");
                    seenConsole = true;
                }
            }

            // Floor - delete ALL
            if (obj.name == "Floor")
            {
                Debug.Log($"[AutoDeleteDuplicates] DELETE Floor {obj.GetInstanceID()}");
                shouldDelete = true;
            }

            // Directional Light - keep first, delete (1)
            if (obj.name.StartsWith("Directional Light"))
            {
                if (seenDirLight || obj.name.Contains("(1)"))
                {
                    Debug.Log($"[AutoDeleteDuplicates] DELETE {obj.name} {obj.GetInstanceID()}");
                    shouldDelete = true;
                }
                else
                {
                    Debug.Log($"[AutoDeleteDuplicates] KEEP Directional Light {obj.GetInstanceID()}");
                    seenDirLight = true;
                }
            }

            if (shouldDelete)
            {
                Object.Destroy(obj);
                removed++;
            }
        }

        // Disable Main Camera
        var mainCam = GameObject.Find("Main Camera");
        if (mainCam != null && mainCam.activeSelf)
        {
            Debug.Log("[AutoDeleteDuplicates] Desactivando Main Camera");
            mainCam.SetActive(false);
        }

        Debug.Log($"[AutoDeleteDuplicates] ✓ Eliminados: {removed} objetos");
    }
}
